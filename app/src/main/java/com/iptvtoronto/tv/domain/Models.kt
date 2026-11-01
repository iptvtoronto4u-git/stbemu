package com.iptvtoronto.tv.domain

import java.security.MessageDigest
import java.util.UUID
import okhttp3.HttpUrl.Companion.toHttpUrlOrNull

data class Profile(
    val id: String = UUID.randomUUID().toString(), val name: String = "",
    val portal: String = "", val mac: String = "", val model: String = "MAG250",
    val serial: String = "", val deviceId: String = "", val deviceId2: String = "",
    val signature: String = "", val language: String = "en", val timezone: String = "America/Toronto",
    val username: String = "", val password: String = "", val userAgent: String = "",
    val xUserAgent: String = "", val timeout: Int = 20
) {
    fun validated(): Profile {
        require(name.isNotBlank()) { "Enter a profile name." }
        require(portal.toHttpUrlOrNull() != null) { "Enter a valid HTTP or HTTPS portal URL." }
        val normalized = mac.trim().uppercase()
        require(Regex("([0-9A-F]{2}:){5}[0-9A-F]{2}").matches(normalized)) { "Enter the MAC registered with your provider." }
        require(timeout in 5..120) { "Timeout must be 5–120 seconds." }
        return copy(name = name.trim(), portal = portal.trim(), mac = normalized)
    }
    fun maskedMac() = mac.take(8) + ":••:••:••"
    override fun toString() = "Profile(id=$id, credentials=REDACTED)"
}

data class Category(val id: String, val name: String)
data class Media(
    val id: String, val name: String, val cmd: String, val kind: String = "itv",
    val number: String = "", val category: String = "", val image: String = "",
    val description: String = "", val year: String = "", val duration: String = "",
    val season: String = "", val episode: String = "", val adult: Boolean = false
)
data class Programme(val id: String, val channel: String, val name: String, val description: String, val start: Long, val end: Long)
data class Page(val items: List<Media>, val total: Int)
data class Season(val id: String, val name: String, val command: String, val episodes: List<String>)
data class Account(val tariff: String, val expiry: String)
data class Stream(val url: String, val headers: Map<String, String>)
data class SavedProgress(val media: Media, val position: Long, val duration: Long)

object PortalRules {
    fun endpoints(input: String): List<String> {
        val url = requireNotNull(input.toHttpUrlOrNull()) { "Invalid portal URL." }
        val path = url.encodedPath
        if (path.endsWith(".php")) return listOf(url.newBuilder().query(null).fragment(null).build().toString())
        val base = path.trimEnd('/').removeSuffix("/c")
        return listOf("$base/server/load.php", "$base/portal.php", "/stalker_portal/server/load.php", "/portal.php")
            .distinct().map { url.newBuilder().encodedPath(it).query(null).fragment(null).build().toString() }
    }
    fun streamUrl(command: String): String {
        val clean = command.trim().removePrefix("ffmpeg ").removePrefix("auto ").trim().trim('"', '\'')
        require(clean.toHttpUrlOrNull() != null) { "Portal returned an unsupported stream URL." }
        return clean
    }
    // Deterministic editable identifiers; provider-specific registration may require different values.
    fun digest(value: String, algorithm: String): String = MessageDigest.getInstance(algorithm)
        .digest(value.toByteArray(Charsets.UTF_8)).joinToString("") { "%02X".format(it) }
    fun serial(mac: String) = digest(mac.uppercase(), "MD5").take(13)
    fun deviceId(mac: String) = digest(mac.uppercase(), "SHA-256")
}
object EpgMath {
    fun fraction(now: Long, start: Long, end: Long): Float =
        if (end <= start) 0f else ((now - start).toDouble() / (end - start)).toFloat().coerceIn(0f, 1f)
    fun spanMinutes(start: Long, end: Long, windowStart: Long, windowEnd: Long): Float =
        ((minOf(end, windowEnd) - maxOf(start, windowStart)).coerceAtLeast(0) / 60000f)
}
