package com.iptvtoronto.tv.data.db

import androidx.room.*
import kotlinx.coroutines.flow.Flow

@Entity(tableName = "profiles")
data class ProfileRow(@PrimaryKey val id: String, val name: String)
@Entity(tableName = "library", primaryKeys = ["profile", "kind", "mediaId"])
data class LibraryRow(val profile: String, val kind: String, val mediaId: String, val title: String,
    val command: String, val image: String, val favourite: Boolean = false, val position: Long = 0,
    val duration: Long = 0, val updated: Long = System.currentTimeMillis())
@Entity(tableName = "cache", primaryKeys = ["profile", "key"])
data class CacheRow(val profile: String, val key: String, val payload: String, val updated: Long)
@Dao
interface LibraryDao {
    @Query("SELECT * FROM profiles ORDER BY name") fun profiles(): Flow<List<ProfileRow>>
    @Upsert suspend fun profile(row: ProfileRow)
    @Query("DELETE FROM profiles WHERE id=:id") suspend fun deleteProfile(id: String)
    @Query("SELECT * FROM library WHERE profile=:profile ORDER BY updated DESC LIMIT 500") fun library(profile: String): Flow<List<LibraryRow>>
    @Query("SELECT * FROM library WHERE profile=:profile AND kind=:kind AND mediaId=:id") suspend fun item(profile: String, kind: String, id: String): LibraryRow?
    @Upsert suspend fun library(row: LibraryRow)
    @Query("DELETE FROM library WHERE profile=:id") suspend fun deleteLibrary(id: String)
    @Upsert suspend fun cache(row: CacheRow)
    @Query("SELECT * FROM cache WHERE profile=:profile AND key=:key") suspend fun cached(profile: String, key: String): CacheRow?
    @Query("DELETE FROM cache WHERE updated < :before") suspend fun trimCache(before: Long)
    @Query("DELETE FROM cache") suspend fun clearCache()
}
@Database(entities = [ProfileRow::class, LibraryRow::class, CacheRow::class], version = 1, exportSchema = false)
abstract class TorontoDatabase : RoomDatabase() { abstract fun library(): LibraryDao }
