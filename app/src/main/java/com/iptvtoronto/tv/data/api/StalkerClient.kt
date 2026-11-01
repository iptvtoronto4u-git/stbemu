package com.iptvtoronto.tv.data.api

import com.iptvtoronto.tv.domain.*
import com.squareup.moshi.Moshi
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.*
import okhttp3.HttpUrl.Companion.toHttpUrl
import java.io.IOException
import java.net.URLEncoder
import java.util.concurrent.TimeUnit

class PortalException(message: String) : IOException(message)
private class Expired : IOException()

class StalkerClient(val profile: Profile, client: OkHttpClient = OkHttpClient()) {
    private val http = client.newBuilder().connectTimeout(profile.timeout.toLong(), TimeUnit.SECONDS)
        .readTimeout(profile.timeout.toLong(), TimeUnit.SECONDS).followRedirects(true)
        // Never forward provider credentials to another origin during a redirect.
        .followSslRedirects(false).addNetworkInterceptor { chain ->
            val request = chain.request()
            val original = profile.portal.toHttpUrl()
            if (request.url.host != original.host || request.url.port != original.port ||
                request.url.scheme != original.scheme) throw PortalException("Portal redirected to a different server. Update the portal URL.")
            chain.proceed(request)
        }.build()
    private val adapter = Moshi.Builder().build().adapter(Any::class.java)
    private var endpoint: String? = null
    private var token = ""
    private val gate = kotlinx.coroutines.sync.Mutex()

    fun headers(): Map<String, String> = mapOf(
        "User-Agent" to profile.userAgent.ifBlank { "IPTVToronto/0.2 (Android TV; authorized portal client)" },
        "X-User-Agent" to profile.xUserAgent.ifBlank { "Model: ${profile.model}; Link: WiFi" },
        "Accept-Language" to profile.language,
        "Cookie" to "mac=${URLEncoder.encode(profile.mac, "UTF-8")}; stb_lang=${URLEncoder.encode(profile.language, "UTF-8")}; timezone=${URLEncoder.encode(profile.timezone, "UTF-8")}"
    ) + if (token.isNotBlank()) mapOf("Authorization" to "Bearer $token") else emptyMap()

    private suspend fun raw(type: String, action: String, params: Map<String, String>, url: String = requireNotNull(endpoint)): Any? =
        withContext(Dispatchers.IO) {
            val address = url.toHttpUrl().newBuilder().addQueryParameter("type", type)
                .addQueryParameter("action", action).addQueryParameter("JsHttpRequest", "1-xml")
            params.forEach { (key, value) -> address.addQueryParameter(key, value) }
            val request = Request.Builder().url(address.build()).headers(Headers.headersOf(*headers().flatMap { listOf(it.key, it.value) }.toTypedArray())).build()
            http.newCall(request).execute().use { response ->
                if (response.code == 401 || response.code == 403) throw Expired()
                if (!response.isSuccessful) throw PortalException("Portal returned HTTP ${response.code}.")
                val source = response.body?.source() ?: throw PortalException("Portal response was empty.")
                // Avoid unbounded reads from a misconfigured portal.
                if (source.request(8L * 1024 * 1024 + 1)) throw PortalException("Portal response exceeded the safety limit.")
                val text = source.readUtf8()
                val parsed = try { adapter.fromJson(text) } catch (_: Exception) { throw PortalException("Portal returned invalid JSON. Check the portal path.") }
                val body = (parsed as? Map<*, *>)?.get("js") ?: parsed
                val map = body as? Map<*, *>
                if (map?.get("error") != null && map["error"].toString() !in listOf("", "0", "false"))
                    throw PortalException("Portal rejected the request. Check authorization and subscription.")
                body
            }
        }

    private suspend fun authenticateUnlocked(): Account {
        token = ""
        var connected = false
        for (candidate in PortalRules.endpoints(profile.portal)) {
            try {
                val js = raw("stb", "handshake", mapOf("token" to ""), candidate).obj()
                val next = js.str("token")
                if (next.isBlank()) continue
                endpoint = candidate; token = next; connected = true; break
            } catch (e: kotlinx.coroutines.CancellationException) { throw e }
            catch (_: IOException) { /* Try another supported public portal path. */ }
        }
        if (!connected) throw PortalException("Could not authenticate. Check the portal URL, registered MAC, network and subscription.")
        val identity = mapOf(
            "stb_type" to profile.model, "client_type" to "STB", "hd" to "1",
            "sn" to profile.serial.ifBlank { PortalRules.serial(profile.mac) },
            "device_id" to profile.deviceId.ifBlank { PortalRules.deviceId(profile.mac) },
            "device_id2" to profile.deviceId2.ifBlank { PortalRules.deviceId(profile.mac) },
            "signature" to profile.signature, "timestamp" to (System.currentTimeMillis() / 1000).toString()
        )
        val details = raw("stb", "get_profile", identity).obj()
        if (details.str("blocked") == "1") throw PortalException("MAC is not authorized or subscription is expired.")
        if (profile.username.isNotBlank()) {
            val auth = raw("stb", "do_auth", mapOf("login" to profile.username, "password" to profile.password))
            if (auth == false || auth.toString() == "0") throw PortalException("Portal username or password was rejected.")
        }
        val account = raw("account_info", "get_main_info", emptyMap()).obj()
        return Account(account.str("tariff_plan").ifBlank { account.str("tariff_name") }, account.str("end_date").ifBlank { account.str("expire_billing_date") })
    }
    suspend fun authenticate(): Account {
        gate.lock()
        try { return authenticateUnlocked() } finally { gate.unlock() }
    }
    suspend fun call(type: String, action: String, params: Map<String, String> = emptyMap()): Any? {
        gate.lock()
        try {
            if (token.isBlank()) authenticateUnlocked()
            return try { raw(type, action, params) } catch (_: Expired) {
                authenticateUnlocked()
                try { raw(type, action, params) } catch (_: Expired) { throw PortalException("Authorization expired. Reconnect the profile.") }
            }
        } finally { gate.unlock() }
    }
    suspend fun categories(kind: String): List<Category> =
        call(kind, if (kind == "itv") "get_genres" else "get_categories").rows().map { Category(it.str("id"), it.str("title").ifBlank { it.str("name") }) }
    suspend fun channels(): List<Media> {
        val all = call("itv", "get_all_channels").rows()
        if (all.isNotEmpty()) return all.map { media(it, "itv") }
        val result = mutableListOf<Media>()
        var page = 1
        do {
            val next = catalog("itv", "*", page)
            result += next.items
            page++
        } while (next.items.isNotEmpty() && result.size < next.total && page <= 200)
        return result.distinctBy { it.id }
    }
    suspend fun catalog(kind: String, category: String, page: Int, search: String = "", extra: Map<String, String> = emptyMap()): Page {
        val body = call(kind, "get_ordered_list", mapOf("category" to category, "p" to page.toString(), "sortby" to "name", "search" to search) + extra)
        val rows = body.rows().map { media(it, kind) }
        return Page(rows, body.obj().str("total_items").toIntOrNull() ?: rows.size)
    }
    suspend fun epg(channel: String): List<Programme> = call("itv", "get_short_epg", mapOf("ch_id" to channel, "size" to "8")).rows().map {
        fun time(key: String): Long = (it.str(key).toDoubleOrNull()?.toLong() ?: 0L).let { value -> if (value < 10_000_000_000L) value * 1000 else value }
        Programme(it.str("id"), channel, it.str("name"), it.str("descr"), time("start_timestamp"), time("stop_timestamp"))
    }
    suspend fun resolve(item: Media): Stream {
        val body = call(item.kind, "create_link", mapOf("cmd" to item.cmd, "series" to item.episode, "forced_storage" to "0", "disable_ad" to "1")).obj()
        val url = PortalRules.streamUrl(body.str("cmd").ifBlank { body.str("url") })
        // Stream CDNs get no portal Cookie or Bearer token. The signed URL authorizes playback.
        return Stream(url, headers().filterKeys { it == "User-Agent" || it == "Accept-Language" })
    }
    suspend fun heartbeat() { call("stb", "watchdog") }
    suspend fun seasons(series: Media): List<Season> {
        val rows = call("series", "get_ordered_list", mapOf("movie_id" to series.id, "p" to "1")).rows()
        return rows.map { row ->
            val numbers = (row["series"] as? List<*>)?.map { value ->
                if (value is Number) value.toInt().toString() else value.toString()
            }.orEmpty()
            Season(row.str("id"), row.str("name").ifBlank { "Season ${row.str("season_number")}" },
                row.str("cmd").ifBlank { series.cmd }, numbers)
        }
    }
    suspend fun episodes(series: Media, season: Season): List<Media> {
        if (season.episodes.isNotEmpty()) return season.episodes.map { number ->
            series.copy(id = "${series.id}:${season.id}:$number", name = "${series.name} · ${season.name} E$number",
                cmd = season.command, season = season.id, episode = number)
        }
        return call("series", "get_ordered_list", mapOf("movie_id" to series.id, "season_id" to season.id, "p" to "1"))
            .rows().map { row -> media(row, "series").copy(season = season.id, episode = row.str("series_number").ifBlank { row.str("id") }) }
    }
    private fun media(row: Map<*, *>, kind: String) = Media(
        row.str("id"), row.str("name").ifBlank { row.str("title") }, row.str("cmd"), kind,
        row.str("number"), row.str("tv_genre_id").ifBlank { row.str("category_id") },
        row.str("screenshot_uri").ifBlank { row.str("logo") }.ifBlank { row.str("cover") },
        row.str("description").ifBlank { row.str("descr") }, row.str("year"), row.str("time"),
        row.str("season_id"), row.str("series_number"), row.str("censored") == "1"
    )
}
internal fun Any?.obj(): Map<*, *> = this as? Map<*, *> ?: emptyMap<Any, Any>()
internal fun Map<*, *>.str(key: String): String = this[key]?.let { if (it is Double && it % 1 == 0.0) it.toLong().toString() else it.toString() } ?: ""
internal fun Any?.rows(): List<Map<*, *>> {
    val value = if (this is Map<*, *>) this["data"] ?: this["channels"] ?: this else this
    return when (value) { is List<*> -> value.mapNotNull { it as? Map<*, *> }; is Map<*, *> -> value.values.mapNotNull { it as? Map<*, *> }; else -> emptyList() }
}
