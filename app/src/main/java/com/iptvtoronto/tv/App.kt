package com.iptvtoronto.tv

import android.app.Application
import androidx.room.Room
import coil.ImageLoader
import coil.ImageLoaderFactory
import coil.memory.MemoryCache
import com.iptvtoronto.tv.data.db.TorontoDatabase
import com.iptvtoronto.tv.data.prefs.*
import com.iptvtoronto.tv.data.repo.PortalRepository
import org.koin.android.ext.koin.androidContext
import org.koin.core.context.startKoin
import org.koin.dsl.module

class App : Application(), ImageLoaderFactory {
    override fun onCreate() {
        super.onCreate()
        startKoin {
            androidContext(this@App)
            modules(module {
                single { Room.databaseBuilder(get(), TorontoDatabase::class.java, "toronto.db").build() }
                single { get<TorontoDatabase>().library() }
                single { ProfileVault(get()) }
                single { Settings(get()) }
                single { PortalRepository(get(), get()) }
            })
        }
    }
    override fun newImageLoader() = ImageLoader.Builder(this)
        .memoryCache { MemoryCache.Builder(this).maxSizeBytes(24 * 1024 * 1024).build() }
        .diskCache { coil.disk.DiskCache.Builder().directory(cacheDir.resolve("art")).maxSizeBytes(64L * 1024 * 1024).build() }
        .crossfade(false).build()
}
