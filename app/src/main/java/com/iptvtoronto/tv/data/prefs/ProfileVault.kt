package com.iptvtoronto.tv.data.prefs

import android.content.Context
import android.os.Build
import android.security.KeyPairGeneratorSpec
import android.util.Base64
import androidx.security.crypto.EncryptedSharedPreferences
import androidx.security.crypto.MasterKey
import com.iptvtoronto.tv.domain.Profile
import org.json.JSONObject
import java.math.BigInteger
import java.security.KeyPairGenerator
import java.security.KeyStore
import java.security.SecureRandom
import java.util.Calendar
import javax.crypto.Cipher
import javax.crypto.spec.GCMParameterSpec
import javax.crypto.spec.SecretKeySpec
import javax.security.auth.x500.X500Principal

@Suppress("DEPRECATION")
class ProfileVault(context: Context) {
    private val legacy = Build.VERSION.SDK_INT < 23
    private val prefs = if (!legacy) EncryptedSharedPreferences.create(context, "portal-vault",
        MasterKey.Builder(context).setKeyScheme(MasterKey.KeyScheme.AES256_GCM).build(),
        EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
        EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM)
        else context.getSharedPreferences("portal-vault-22", Context.MODE_PRIVATE)
    private val key: SecretKeySpec? = if (!legacy) null else {
        val store = KeyStore.getInstance("AndroidKeyStore").apply { load(null) }
        val alias = "iptv-profile-wrap"
        if (!store.containsAlias(alias)) {
            val start = Calendar.getInstance(); val end = Calendar.getInstance().apply { add(Calendar.YEAR, 30) }
            KeyPairGenerator.getInstance("RSA", "AndroidKeyStore").apply {
                initialize(KeyPairGeneratorSpec.Builder(context).setAlias(alias)
                    .setSubject(X500Principal("CN=IPTV Toronto")).setSerialNumber(BigInteger.ONE)
                    .setStartDate(start.time).setEndDate(end.time).setKeySize(2048).build())
            }.generateKeyPair()
        }
        val wrapped = prefs.getString("wrapped-key", null)
        val bytes = if (wrapped == null) {
            val fresh = ByteArray(32).apply { SecureRandom().nextBytes(this) }
            val cipher = Cipher.getInstance("RSA/ECB/PKCS1Padding").apply { init(Cipher.ENCRYPT_MODE, store.getCertificate(alias).publicKey) }
            check(prefs.edit().putString("wrapped-key", encode(cipher.doFinal(fresh))).commit())
            fresh
        } else Cipher.getInstance("RSA/ECB/PKCS1Padding").run {
            init(Cipher.DECRYPT_MODE, store.getKey(alias, null)); doFinal(decode(wrapped))
        }
        SecretKeySpec(bytes, "AES")
    }
    private fun encode(bytes: ByteArray) = Base64.encodeToString(bytes, Base64.NO_WRAP)
    private fun decode(text: String) = Base64.decode(text, Base64.NO_WRAP)
    private fun seal(text: String): String {
        if (!legacy) return text
        val iv = ByteArray(12).apply { SecureRandom().nextBytes(this) }
        val cipher = Cipher.getInstance("AES/GCM/NoPadding").apply { init(Cipher.ENCRYPT_MODE, key, GCMParameterSpec(128, iv)) }
        return encode(iv + cipher.doFinal(text.toByteArray(Charsets.UTF_8)))
    }
    private fun open(text: String): String {
        if (!legacy) return text
        val bytes = decode(text)
        return Cipher.getInstance("AES/GCM/NoPadding").run {
            init(Cipher.DECRYPT_MODE, key, GCMParameterSpec(128, bytes.copyOfRange(0, 12)))
            String(doFinal(bytes.copyOfRange(12, bytes.size)), Charsets.UTF_8)
        }
    }
    fun save(p: Profile) {
        val json = JSONObject()
        mapOf("id" to p.id, "name" to p.name, "portal" to p.portal, "mac" to p.mac, "model" to p.model,
            "serial" to p.serial, "deviceId" to p.deviceId, "deviceId2" to p.deviceId2, "signature" to p.signature,
            "language" to p.language, "timezone" to p.timezone, "username" to p.username, "password" to p.password,
            "userAgent" to p.userAgent, "xUserAgent" to p.xUserAgent, "timeout" to p.timeout.toString()).forEach { (k,v) -> json.put(k,v) }
        check(prefs.edit().putString(p.id, seal(json.toString())).commit()) { "Could not save the secure profile." }
    }
    fun load(id: String): Profile? {
        val text = prefs.getString(id, null) ?: return null
        val j = JSONObject(open(text))
        return Profile(id, j.optString("name"), j.optString("portal"), j.optString("mac"), j.optString("model", "MAG250"),
            j.optString("serial"), j.optString("deviceId"), j.optString("deviceId2"), j.optString("signature"),
            j.optString("language", "en"), j.optString("timezone", "America/Toronto"), j.optString("username"),
            j.optString("password"), j.optString("userAgent"), j.optString("xUserAgent"), j.optString("timeout", "20").toInt())
    }
    fun delete(id: String) { prefs.edit().remove(id).apply() }
    fun putSecret(name: String, value: String) { check(prefs.edit().putString("secret-$name", seal(value)).commit()) }
    fun secret(name: String): String? = prefs.getString("secret-$name", null)?.let(::open)
}
