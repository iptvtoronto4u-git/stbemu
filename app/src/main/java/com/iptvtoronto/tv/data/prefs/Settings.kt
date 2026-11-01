package com.iptvtoronto.tv.data.prefs

import android.content.Context
import androidx.datastore.preferences.core.*
import androidx.datastore.preferences.preferencesDataStore
import kotlinx.coroutines.flow.map

private val Context.store by preferencesDataStore("settings")
class Settings(private val context: Context) {
    val values = context.store.data.map { prefs -> prefs.asMap().mapKeys { it.key.name }.mapValues { it.value.toString() } }
    suspend fun put(key: String, value: String) { context.store.edit { it[stringPreferencesKey(key)] = value } }
}
