package com.iptvtoronto.tv.data.repo

import com.iptvtoronto.tv.data.api.StalkerClient
import com.iptvtoronto.tv.data.db.*
import com.iptvtoronto.tv.data.prefs.ProfileVault
import com.iptvtoronto.tv.domain.*

class PortalRepository(val dao: LibraryDao, val vault: ProfileVault) {
    var client: StalkerClient? = null; private set
    var profile: Profile? = null; private set
    suspend fun save(p: Profile) {
        val valid = p.validated()
        vault.save(valid)
        dao.profile(ProfileRow(valid.id, valid.name))
    }
    fun select(id: String) {
        val p = requireNotNull(vault.load(id)) { "Profile could not be unlocked. Re-enter its details." }
        profile = p; client = StalkerClient(p)
    }
    suspend fun delete(id: String) {
        dao.deleteProfile(id); dao.deleteLibrary(id); vault.delete(id)
        if (profile?.id == id) { profile = null; client = null }
    }
    suspend fun favourite(item: Media) {
        val id = requireNotNull(profile).id
        val old = dao.item(id, item.kind, item.id)
        dao.library(LibraryRow(id, item.kind, item.id, item.name, item.cmd, item.image, !(old?.favourite ?: false), old?.position ?: 0, old?.duration ?: 0))
    }
    suspend fun progress(item: Media, position: Long, duration: Long) {
        val id = profile?.id ?: return
        val old = dao.item(id, item.kind, item.id)
        dao.library(LibraryRow(id, item.kind, item.id, item.name, item.cmd, item.image, old?.favourite ?: false, position.coerceAtLeast(0), duration.coerceAtLeast(0)))
    }
}
