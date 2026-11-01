package com.iptvtoronto.tv.ui

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.iptvtoronto.tv.data.api.StalkerClient
import com.iptvtoronto.tv.data.db.*
import com.iptvtoronto.tv.data.prefs.Settings
import com.iptvtoronto.tv.data.repo.PortalRepository
import com.iptvtoronto.tv.domain.*
import kotlinx.coroutines.*
import kotlinx.coroutines.flow.*

data class TorontoState(
    val profiles: List<ProfileRow> = emptyList(), val profile: Profile? = null,
    val channels: List<Media> = emptyList(), val categories: Map<String, List<Category>> = emptyMap(),
    val catalog: List<Media> = emptyList(), val total: Int = 0, val page: Int = 0,
    val epg: Map<String, List<Programme>> = emptyMap(), val library: List<LibraryRow> = emptyList(),
    val settings: Map<String, String> = emptyMap(), val busy: Boolean = false,
    val message: String = "", val error: String? = null, val account: Account? = null,
    val ready: Boolean = false, val seasons: List<Season> = emptyList(), val episodes: List<Media> = emptyList()
)
class TorontoViewModel(val repo: PortalRepository, val preferences: Settings) : ViewModel() {
    private val mutable = MutableStateFlow(TorontoState())
    val state = mutable.asStateFlow()
    private var libraryJob: Job? = null
    private var heartbeat: Job? = null
    private var catalogJob: Job? = null
    private var sessionJob: Job? = null
    private val epgJobs = mutableMapOf<String, Job>()
    private val epgGate = kotlinx.coroutines.sync.Semaphore(3)
    init {
        viewModelScope.launch {
            combine(repo.dao.profiles(), preferences.values) { profiles, settings -> profiles to settings }
                .collect { (profiles, settings) ->
                    mutable.update { it.copy(profiles = profiles, settings = settings, ready = true) }
                    if (state.value.profile == null && profiles.isNotEmpty()) select(settings["active"]?.takeIf { id -> profiles.any { it.id == id } } ?: profiles.first().id)
                }
        }
    }
    fun clearError() { mutable.update { it.copy(error = null) } }
    fun report(error: String) { mutable.update { it.copy(error = error) } }
    private fun launchWork(block: suspend () -> Unit) = viewModelScope.launch {
        mutable.update { it.copy(busy = true, error = null) }
        try { block() }
        catch (e: CancellationException) { throw e }
        catch (_: Exception) { mutable.update { it.copy(error = "Unable to complete the request. Check the portal, authorization and network connection.") } }
        finally { mutable.update { it.copy(busy = false) } }
    }
    fun test(profile: Profile) = launchWork {
        val valid = profile.validated()
        val result = StalkerClient(valid).authenticate()
        mutable.update { it.copy(message = "Connected · ${result.tariff} · ${result.expiry}") }
    }
    fun save(profile: Profile) = launchWork {
        val valid = profile.validated(); repo.save(valid)
        mutable.update { it.copy(message = "Profile saved securely.") }
        select(valid.id)
    }
    fun select(id: String) {
        sessionJob?.cancel(); catalogJob?.cancel(); epgJobs.values.forEach { it.cancel() }; epgJobs.clear(); heartbeat?.cancel(); libraryJob?.cancel()
        sessionJob = launchWork {
            repo.select(id)
            val client = requireNotNull(repo.client)
            preferences.put("active", id)
            mutable.update { it.copy(profile = repo.profile, channels = emptyList(), catalog = emptyList(),
                epg = emptyMap(), categories = emptyMap(), library = emptyList(), account = null) }
            libraryJob = viewModelScope.launch { repo.dao.library(id).collect { rows -> mutable.update { it.copy(library = rows) } } }
            val account = client.authenticate()
            mutable.update { it.copy(account = account, message = "Connected") }
            val channels = client.channels()
            mutable.update { it.copy(channels = channels) }
            for (kind in listOf("itv", "vod", "series")) {
                try {
                    val categories = client.categories(kind)
                    mutable.update { it.copy(categories = it.categories + (kind to categories)) }
                } catch (e: CancellationException) { throw e } catch (_: Exception) { /* Some subscriptions omit VOD/series modules. */ }
            }
            heartbeat = viewModelScope.launch {
                while (isActive) {
                    delay(120_000)
                    try { client.heartbeat() } catch (e: CancellationException) { throw e } catch (_: Exception) { }
                }
            }
        }
    }
    fun catalog(kind: String, category: String, search: String = "", append: Boolean = false) {
        catalogJob?.cancel()
        catalogJob = launchWork {
            val client = repo.client ?: return@launchWork
            val page = if (append) state.value.page + 1 else 1
            if (!append) mutable.update { it.copy(catalog = emptyList(), page = 0, total = 0) }
            val result = client.catalog(kind, category, page, search)
            mutable.update { it.copy(catalog = (if (append) it.catalog + result.items else result.items).distinctBy(Media::id), total = result.total, page = page) }
        }
    }
    fun loadEpg(channel: Media) {
        if (channel.id in state.value.epg || epgJobs[channel.id]?.isActive == true) return
        epgJobs[channel.id] = viewModelScope.launch {
            epgGate.acquire()
            try {
                val programs = repo.client?.epg(channel.id) ?: return@launch
                mutable.update { it.copy(epg = (it.epg.entries.toList().takeLast(199).associate { row -> row.toPair() }) + (channel.id to programs)) }
            } catch (e: CancellationException) { throw e } catch (_: Exception) { }
            finally { epgGate.release(); epgJobs.remove(channel.id) }
        }
    }
    fun favourite(item: Media) = launchWork { repo.favourite(item) }
    fun setting(key: String, value: String) = viewModelScope.launch { preferences.put(key, value) }
    fun delete(id: String) = launchWork { repo.delete(id); mutable.update { it.copy(profile = null, channels = emptyList(), catalog = emptyList(), library = emptyList()) } }
    fun clearCache() = launchWork { repo.dao.clearCache() }
    fun seasons(series: Media) = launchWork {
        mutable.update { it.copy(seasons = emptyList(), episodes = emptyList()) }
        val result = repo.client?.seasons(series).orEmpty()
        mutable.update { it.copy(seasons = result) }
        if (result.isNotEmpty()) {
            val episodes = repo.client?.episodes(series, result.first()).orEmpty()
            mutable.update { it.copy(episodes = episodes) }
        }
    }
    fun episodes(series: Media, season: Season) = launchWork {
        val episodes = repo.client?.episodes(series, season).orEmpty()
        mutable.update { it.copy(episodes = episodes) }
    }
    fun setPin(pin: String) {
        require(Regex("[0-9]{4,8}").matches(pin))
        val salt = java.util.UUID.randomUUID().toString()
        repo.vault.putSecret("pin-salt", salt)
        repo.vault.putSecret("pin", PortalRules.digest(salt + pin, "SHA-256"))
    }
    fun checkPin(pin: String): Boolean {
        val expected = repo.vault.secret("pin") ?: return true
        return java.security.MessageDigest.isEqual(expected.toByteArray(),
            PortalRules.digest(repo.vault.secret("pin-salt").orEmpty() + pin, "SHA-256").toByteArray())
    }
    fun hasPin() = repo.vault.secret("pin") != null
    suspend fun resolve(item: Media) = requireNotNull(repo.client) { "Connect a profile first." }.resolve(item)
    fun progress(item: Media, position: Long, duration: Long) = viewModelScope.launch { repo.progress(item, position, duration) }
    override fun onCleared() { heartbeat?.cancel() }
}
