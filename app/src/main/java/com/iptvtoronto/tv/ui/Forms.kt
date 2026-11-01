package com.iptvtoronto.tv.ui

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.lazy.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.unit.dp
import com.iptvtoronto.tv.domain.*
import com.iptvtoronto.tv.ui.components.*
import com.iptvtoronto.tv.ui.theme.Brand

@Composable
fun PortalScreen(state: TorontoState, vm: TorontoViewModel) {
    var profile by remember(state.profile?.id) { mutableStateOf(state.profile ?: Profile()) }
    var showMac by remember { mutableStateOf(false) }
    var advanced by remember { mutableStateOf(false) }
    var edit by remember { mutableStateOf<Pair<String, String>?>(null) }
    var saveField by remember { mutableStateOf<((String) -> Unit)?>(null) }
    fun field(label: String, value: String, setter: (String) -> Unit) {
        edit = label to value; saveField = setter
    }
    Column(verticalArrangement = Arrangement.spacedBy(14.dp)) {
        Heading(androidx.compose.ui.res.stringResource(com.iptvtoronto.tv.R.string.connect_portal), true)
        Muted("Add the details supplied by your IPTV provider.")
        Row(horizontalArrangement = Arrangement.spacedBy(18.dp)) {
            LazyColumn(Modifier.width(220.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                items(state.profiles, key = { it.id }) { p ->
                    TvButton(p.name, Modifier.fillMaxWidth(), selected = profile.id == p.id) {
                        try { profile = vm.repo.vault.load(p.id) ?: Profile() } catch (_: Exception) { vm.report("Unable to unlock this profile. Re-enter its details.") }
                    }
                }
                item { TvButton("+ Add profile", Modifier.fillMaxWidth()) { profile = Profile() } }
                item { Muted("Use only services you are authorized to access.") }
            }
            LazyColumn(Modifier.weight(1f).background(Brand.Panel, RoundedCornerShape(12.dp))
                .border(1.dp, Brand.Border, RoundedCornerShape(12.dp)).padding(18.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                item { Heading("Stalker / MAG profile") }
                item { FormRow("Profile name", profile.name.ifBlank { "Enter name" }) { field("Profile name", profile.name) { profile = profile.copy(name = it) } } }
                item { FormRow("Portal URL", profile.portal.ifBlank { "Enter provider URL" }) { field("Portal URL", profile.portal) { profile = profile.copy(portal = it) } } }
                item { Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                    FormRow("MAC address", if (showMac) profile.mac else profile.maskedMac(), Modifier.weight(1f)) {
                        field("MAC address", profile.mac) { profile = profile.copy(mac = it) }
                    }
                    TvButton(if (showMac) "Hide" else "Show") { showMac = !showMac }
                }; Muted("Use the MAC registered with your provider. The device MAC is never read.") }
                item { Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                    TvButton("Test connection", selected = true) {
                        try { vm.test(profile.validated()) } catch (e: IllegalArgumentException) { vm.report(e.message.orEmpty()) }
                    }
                    TvButton("Save profile") {
                        try { vm.save(profile.validated()) } catch (e: IllegalArgumentException) { vm.report(e.message.orEmpty()) }
                    }
                    if (state.profiles.any { it.id == profile.id }) TvButton("Delete") { vm.delete(profile.id); profile = Profile() }
                } }
                item { Muted(if (state.busy) "Testing / loading…" else state.message.ifBlank { "Ready to test" }) }
                item { TvButton(if (advanced) "Advanced  −" else "Advanced  +") { advanced = !advanced } }
                if (advanced) {
                    item { FormRow("STB model", profile.model) { field("STB model", profile.model) { profile = profile.copy(model = it) } } }
                    item { FormRow("Serial number", profile.serial.ifBlank { "Derived from registered MAC" }) { field("Serial number", profile.serial) { profile = profile.copy(serial = it) } } }
                    item { FormRow("Device ID", profile.deviceId.ifBlank { "Derived from registered MAC" }) { field("Device ID", profile.deviceId) { profile = profile.copy(deviceId = it) } } }
                    item { FormRow("Device ID2", profile.deviceId2.ifBlank { "Derived from registered MAC" }) { field("Device ID2", profile.deviceId2) { profile = profile.copy(deviceId2 = it) } } }
                    item { FormRow("Signature", if (profile.signature.isBlank()) "Provider supplied" else "••••••") { field("Signature", profile.signature) { profile = profile.copy(signature = it) } } }
                    item { FormRow("Language", profile.language) { field("Language", profile.language) { profile = profile.copy(language = it) } } }
                    item { FormRow("Timezone", profile.timezone) { field("Timezone", profile.timezone) { profile = profile.copy(timezone = it) } } }
                    item { FormRow("Username", profile.username.ifBlank { "Optional" }) { field("Username", profile.username) { profile = profile.copy(username = it) } } }
                    item { FormRow("Password", if (profile.password.isBlank()) "Optional" else "••••••") { field("Password", profile.password) { profile = profile.copy(password = it) } } }
                    item { FormRow("User-Agent", profile.userAgent.ifBlank { "IPTV Toronto client" }) { field("User-Agent", profile.userAgent) { profile = profile.copy(userAgent = it) } } }
                    item { FormRow("X-User-Agent", profile.xUserAgent.ifBlank { "Model: ${profile.model}; Link: WiFi" }) { field("X-User-Agent", profile.xUserAgent) { profile = profile.copy(xUserAgent = it) } } }
                    item { FormRow("HTTP timeout (seconds)", profile.timeout.toString()) { field("HTTP timeout", profile.timeout.toString()) { profile = profile.copy(timeout = it.toIntOrNull() ?: 20) } } }
                    item { Muted("TLS certificates are validated. Invalid-certificate mode is not included in this build.") }
                }
                item { Muted("No portal or channel list is included. Get connection details from your authorized provider.") }
            }
        }
    }
    if (edit != null) KeyboardDialog(edit!!.first, edit!!.second, { edit = null }, {
        saveField?.invoke(it); edit = null; saveField = null
    })
}

@Composable fun FormRow(label: String, value: String, modifier: Modifier = Modifier, action: () -> Unit) {
    Row(modifier, verticalAlignment = androidx.compose.ui.Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(10.dp)) {
        Muted(label, Modifier.width(100.dp))
        TvButton(value.take(100), Modifier.weight(1f), onClick = action)
    }
}

@Composable fun KeyboardDialog(title: String, initial: String, dismiss: () -> Unit, save: (String) -> Unit) {
    var value by remember { mutableStateOf(initial) }
    var fallback by remember { mutableStateOf(false) }
    var uppercase by remember { mutableStateOf(false) }
    val secret = title in listOf("Password", "PIN", "Signature", "MAC address")
    var shown by remember { mutableStateOf(!secret) }
    AlertDialog(onDismissRequest = dismiss, title = { Text(title) }, text = {
        Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
            OutlinedTextField(value, { value = it }, Modifier.fillMaxWidth(), singleLine = true,
                visualTransformation = if (shown) VisualTransformation.None else PasswordVisualTransformation())
            Row { TvButton(if (fallback) "System keyboard" else "Remote keyboard") { fallback = !fallback }
                if (secret) TvButton(if (shown) "Hide" else "Show") { shown = !shown } }
            if (fallback) {
                val keys = listOf("1234567890", "qwertyuiop", "asdfghjkl", "zxcvbnm", ":/._-@?=&%+")
                keys.forEach { row -> LazyRow { items(row.toList()) { char ->
                    TvButton(if (uppercase) char.uppercase() else char.toString()) { value += if (uppercase) char.uppercase() else char }
                } } }
                Row {
                    TvButton("Shift") { uppercase = !uppercase }
                    TvButton("Space") { value += " " }
                    TvButton("⌫") { value = value.dropLast(1) }
                    TvButton("Clear") { value = "" }
                }
            }
        }
    }, confirmButton = { TvButton("Save") { save(value) } }, dismissButton = { TvButton("Cancel", onClick = dismiss) })
}

private data class SettingSpec(val key: String, val label: String, val options: List<String>, val default: String)
@Composable fun SettingsScreen(state: TorontoState, vm: TorontoViewModel, profiles: () -> Unit) {
    var section by rememberSaveable { mutableStateOf("Playback") }
    var picker by remember { mutableStateOf<SettingSpec?>(null) }
    var pinEditor by remember { mutableStateOf(false) }
    var oldPin by remember { mutableStateOf("") }
    var newPin by remember { mutableStateOf("") }
    var pinError by remember { mutableStateOf("") }
    Row(horizontalArrangement = Arrangement.spacedBy(18.dp)) {
        Panel(Modifier.width(240.dp)) {
            listOf("Profiles", "Playback", "Audio & subtitles", "Appearance", "Parental controls", "About").forEach { label ->
                TvButton(label, Modifier.fillMaxWidth(), selected = section == label) { if (label == "Profiles") profiles() else section = label }
            }
            Muted(state.profile?.name ?: "No profile")
            Muted(state.profile?.maskedMac().orEmpty())
        }
        Panel(Modifier.weight(1f).fillMaxHeight()) {
            Heading(section, true)
            val specs = when(section) {
                "Playback" -> listOf(
                    SettingSpec("resume", "Resume last channel on launch", listOf("Off","On"), "Off"),
                    SettingSpec("buffer", "Buffer size", listOf("Default","Small","Large"), "Default"),
                    SettingSpec("retry", "Auto-retry count", listOf("0","1","2","3"), "2")
                )
                "Appearance" -> listOf(SettingSpec("clock", "Clock format", listOf("12h","24h"), "12h"),
                    SettingSpec("reduceMotion", "Reduce motion", listOf("Off","On"), "Off"))
                "Parental controls" -> listOf(
                    SettingSpec("lockAdult", "Hide portal-flagged adult content", listOf("Off","On"), "Off"),
                    SettingSpec("lockSettings", "Require PIN for Settings", listOf("Off","On"), "Off")
                )
                else -> emptyList()
            }
            LazyColumn(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                if (section == "Playback") item { Muted("Playback engine: Media3 ExoPlayer\nVideo fit, quality, audio and subtitles are available in the player’s More and track menus. Buffer changes apply when the player is recreated.") }
                items(specs, key = { it.key }) { spec ->
                    TvButton(spec.label + "     " + (state.settings[spec.key] ?: spec.default), Modifier.fillMaxWidth()) {
                        if (spec.key == "lockSettings" && !vm.hasPin()) pinEditor = true else picker = spec
                    }
                }
                if (section == "Parental controls") {
                    item { TvButton(if (vm.hasPin()) "Change PIN" else "Set PIN") { pinEditor = true } }
                    item { Muted("Filtering depends on the portal’s adult-content flag. Check your provider’s classification before allowing children to use the app.") }
                }
                if (section == "Audio & subtitles") item { Muted("Use Audio and Subtitles in the player to select available tracks.") }
                if (section == "About") {
                    item { Muted("IPTV Toronto ${com.iptvtoronto.tv.BuildConfig.VERSION_NAME}\n${android.os.Build.MANUFACTURER} ${android.os.Build.MODEL}\nAndroid ${android.os.Build.VERSION.RELEASE} / API ${android.os.Build.VERSION.SDK_INT}") }
                    item { Muted(androidx.compose.ui.res.stringResource(com.iptvtoronto.tv.R.string.player_notice)) }
                    item { Muted("Privacy: profiles, MAC and credentials stay encrypted on this device. Requests go directly to the user’s portal and stream servers. No analytics or crash-reporting SDK. No DRM bypass.") }
                    item { Muted("Open-source components: AndroidX / Media3 / Compose (Apache 2.0), OkHttp and Moshi (Apache 2.0), Coil (Apache 2.0), Koin (Apache 2.0). See the source distribution for dependency details.") }
                    item { TvButton("Clear database cache", onClick = { vm.clearCache() }) }
                }
            }
        }
    }
    if (picker != null) {
        val spec = picker!!
        AlertDialog(onDismissRequest = { picker = null }, title = { Text(spec.label) },
            text = { Column { spec.options.forEach { value -> TvButton(value, Modifier.fillMaxWidth()) { vm.setting(spec.key, value); picker = null } } } },
            confirmButton = { TvButton("Cancel") { picker = null } })
    }
    if (pinEditor) AlertDialog(onDismissRequest = { pinEditor = false }, title = { Text("Set parental PIN") },
        text = { Column {
            if (vm.hasPin()) OutlinedTextField(oldPin, { oldPin = it.filter(Char::isDigit).take(8) }, label = { Text("Current PIN") }, visualTransformation = PasswordVisualTransformation())
            OutlinedTextField(newPin, { newPin = it.filter(Char::isDigit).take(8) }, label = { Text("New PIN (4–8 digits)") }, visualTransformation = PasswordVisualTransformation())
            Text(pinError)
        } }, confirmButton = { TvButton("Save PIN") {
            if (!vm.checkPin(oldPin)) pinError = "Current PIN is incorrect."
            else if (!Regex("[0-9]{4,8}").matches(newPin)) pinError = "Use 4–8 digits."
            else { vm.setPin(newPin); pinEditor = false; oldPin = ""; newPin = ""; pinError = "" }
        } })
}
