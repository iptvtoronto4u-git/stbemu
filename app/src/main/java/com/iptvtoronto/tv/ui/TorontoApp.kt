@file:androidx.annotation.OptIn(androidx.media3.common.util.UnstableApi::class)
@file:OptIn(androidx.compose.foundation.ExperimentalFoundationApi::class)
package com.iptvtoronto.tv.ui

import android.app.Activity
import android.view.KeyEvent as AndroidKey
import android.view.WindowManager
import androidx.activity.compose.BackHandler
import androidx.compose.foundation.*
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.ui.*
import androidx.compose.ui.focus.*
import androidx.compose.ui.graphics.*
import androidx.compose.ui.input.key.*
import androidx.compose.ui.platform.*
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.unit.*
import androidx.compose.ui.viewinterop.AndroidView
import androidx.lifecycle.*
import androidx.navigation.compose.*
import androidx.media3.common.*
import androidx.media3.ui.PlayerView
import coil.compose.AsyncImage
import com.iptvtoronto.tv.R
import com.iptvtoronto.tv.domain.*
import com.iptvtoronto.tv.player.Media3Engine
import com.iptvtoronto.tv.ui.components.*
import com.iptvtoronto.tv.ui.theme.*
import kotlinx.coroutines.*
import java.text.SimpleDateFormat
import java.util.*

@Composable
fun TorontoApp(vm: TorontoViewModel) {
    val state by vm.state.collectAsState()
    val nav = rememberNavController()
    val backStack by nav.currentBackStackEntryAsState()
    val route = backStack?.destination?.route ?: "home"
    val context = LocalContext.current
    val owner = LocalLifecycleOwner.current
    val scope = rememberCoroutineScope()
    var engine by remember { mutableStateOf<Media3Engine?>(null) }
    var current by remember { mutableStateOf<Media?>(null) }
    var preview by remember { mutableStateOf<Media?>(null) }
    var playJob by remember { mutableStateOf<Job?>(null) }
    var retryCount by remember { mutableIntStateOf(0) }
    var picker by remember { mutableStateOf(false) }
    var resumedProfile by rememberSaveable { mutableStateOf<String?>(null) }
    var initialRouteHandled by rememberSaveable { mutableStateOf(false) }
    var exit by remember { mutableStateOf(false) }
    var pinAction by remember { mutableStateOf<(() -> Unit)?>(null) }
    var pin by remember { mutableStateOf("") }
    var pinError by remember { mutableStateOf(false) }
    fun go(target: String) {
        nav.navigate(target) { launchSingleTop = true; if (target in listOf("home", "live", "movies", "series", "settings", "portal")) popUpTo("home") }
    }
    fun protected(action: () -> Unit) {
        if (vm.hasPin()) { pin = ""; pinAction = action } else action()
    }
    var resumePosition by remember { mutableLongStateOf(0) }
    fun ensureEngine(): Media3Engine {
        return engine ?: Media3Engine(context, vm.state.value.settings["buffer"] ?: "Default").also { engine = it }
    }
    fun play(item: Media, full: Boolean, resume: Long = 0) {
        if (item.adult && state.settings["lockAdult"] == "On") return
        playJob?.cancel()
        playJob = scope.launch {
            try {
                val stream = vm.resolve(item)
                ensureEngine().play(stream, resume, !full)
                current = item
                if (full) { preview = null; go("player") }
            } catch (e: CancellationException) { throw e }
            catch (_: Exception) { vm.report("Stream failed. Check your subscription and connection, then choose Retry.") }
        }
    }
    DisposableEffect(owner) {
        val observer = LifecycleEventObserver { _, event ->
            if (event == Lifecycle.Event.ON_STOP) {
                current?.let { item -> engine?.player?.let { resumePosition = it.currentPosition; vm.progress(item, it.currentPosition, it.duration) } }
                playJob?.cancel(); engine?.release(); engine = null
            }
            if (event == Lifecycle.Event.ON_START && nav.currentDestination?.route == "player") {
                current?.let { item -> play(item, true, if (item.kind == "itv") 0 else resumePosition) }
            }
        }
        owner.lifecycle.addObserver(observer)
        onDispose { owner.lifecycle.removeObserver(observer); playJob?.cancel(); engine?.release(); engine = null }
    }
    DisposableEffect(engine, current) {
        val player = engine?.player
        val listener = object : Player.Listener {
            override fun onPlayerError(error: PlaybackException) {
                val item = current ?: return
                val limit = state.settings["retry"]?.toIntOrNull() ?: 2
                if (retryCount++ < limit) {
                    scope.launch { delay(1000L * retryCount); play(item, route == "player") }
                } else vm.report("Stream failed after $limit retries. Return to the guide or Retry.")
            }
            override fun onPlaybackStateChanged(playbackState: Int) {
                if (playbackState == Player.STATE_READY) retryCount = 0
                if (playbackState == Player.STATE_ENDED && current?.kind == "series") {
                    val episodes = vm.state.value.episodes
                    val index = episodes.indexOfFirst { it.id == current?.id }
                    if (index >= 0 && index + 1 < episodes.size) play(episodes[index + 1], true)
                }
            }
        }
        player?.addListener(listener)
        onDispose { player?.removeListener(listener) }
    }
    LaunchedEffect(state.profile?.id) { playJob?.cancel(); engine?.player?.stop(); current = null; preview = null }
    LaunchedEffect(state.ready, backStack) {
        if (state.ready && backStack != null && !initialRouteHandled) {
            initialRouteHandled = true
            if (state.profiles.isEmpty()) go("portal")
        }
    }
    LaunchedEffect(state.channels, state.library, state.settings["resume"]) {
        if (state.settings["resume"] == "On" && state.profile != null && state.channels.isNotEmpty() &&
            state.library.isNotEmpty() && resumedProfile != state.profile?.id) {
            resumedProfile = state.profile?.id
            val last = state.library.firstOrNull { it.kind == "itv" }
            state.channels.find { it.id == last?.mediaId }?.let { play(it, true) }
        }
    }
    LaunchedEffect(route, preview?.id) {
        if (route == "live" && preview != null) { delay(600); play(requireNotNull(preview), false) }
        else if (route != "player") { playJob?.cancel(); engine?.player?.stop() }
    }
    LaunchedEffect(current?.id, route) {
        while (current != null && route == "player") {
            delay(10000)
            engine?.player?.let { player -> current?.let { vm.progress(it, player.currentPosition, player.duration) } }
        }
    }
    BackHandler(route != "player") {
        if (route == "home") exit = true else go("home")
    }
    CompositionLocalProvider(LocalReduceMotion provides (state.settings["reduceMotion"] == "On")) {
    MaterialTheme(colorScheme = darkColorScheme(primary = Brand.Cyan, background = Brand.Navy, surface = Brand.Panel)) {
        androidx.tv.material3.MaterialTheme {
            Box(Modifier.fillMaxSize().background(Brush.linearGradient(listOf(Color(0xFF062C67), Brand.Navy, Brand.Navy)))) {
                if (!state.ready) {
                    Column(Modifier.align(Alignment.Center)) { Heading("IPTV Toronto", true); CircularProgressIndicator(color = Brand.Cyan) }
                } else Column(Modifier.fillMaxSize().then(if (route == "player") Modifier else Modifier.padding(horizontal = Tokens.SafeHorizontal, vertical = Tokens.SafeVertical))) {
                    if (route != "player") TopBar(route, state, { target ->
                        if (target == "settings" && state.settings["lockSettings"] == "On") protected { go(target) } else go(target)
                    }, { picker = true })
                    if (state.busy) LinearProgressIndicator(Modifier.fillMaxWidth(), color = Brand.Cyan)
                    NetworkStatus()
                    Box(Modifier.weight(1f).fillMaxWidth().padding(top = if (route == "player") 0.dp else 16.dp)) {
                        NavHost(nav, startDestination = "home") {
                            composable("home") { HomeScreen(state, { go(it) }, {
                                val last = state.library.firstOrNull { it.kind == "itv" }
                                val channel = state.channels.find { it.id == last?.mediaId } ?: state.channels.firstOrNull()
                                if (channel != null) play(channel, true) else go(if (state.profile == null) "portal" else "live")
                            }, { media, position -> play(media, true, position) }) }
                            composable("portal") { PortalScreen(state, vm) }
                            composable("live") { LiveScreen(state, engine, current, {
                                preview = it; vm.loadEpg(it)
                            }, { play(it, true) }, vm::loadEpg, vm::favourite, { go("portal") }) }
                            composable("movies") { CatalogScreen("vod", state, vm, { media -> vm.setting("detail", media.id); go("details") }) }
                            composable("series") { CatalogScreen("series", state, vm, { media -> vm.setting("detail", media.id); go("details") }) }
                            composable("details") {
                                val media = state.catalog.find { it.id == state.settings["detail"] }
                                if (media != null) DetailsScreen(media, state, vm, { item, position -> play(item, true, position) })
                                else EmptyState("Choose a title from your portal.")
                            }
                            composable("settings") { SettingsScreen(state, vm, { go("portal") }) }
                            composable("player") {
                                val item = current
                                if (item == null) EmptyState("Choose a channel or title.", "Open guide", { go("live") })
                                else PlayerScreen(item, engine, state, { go("live") }, { step ->
                                    val index = state.channels.indexOfFirst { it.id == item.id }
                                    val allowed = state.channels.filterNot { it.adult && state.settings["lockAdult"] == "On" }
                                    val allowedIndex = allowed.indexOfFirst { it.id == item.id }
                                    if (allowed.isNotEmpty()) play(allowed[((allowedIndex + step) % allowed.size + allowed.size) % allowed.size], true)
                                }, { selected -> play(selected, true) }, vm::favourite, {
                                    play(item, true, engine?.player?.currentPosition ?: 0)
                                })
                            }
                        }
                    }
                    if (route != "player") HintBar(route)
                }
                if (state.error != null) AlertDialog(onDismissRequest = vm::clearError,
                    title = { Text("Unable to continue") }, text = { Text(state.error.orEmpty()) },
                    confirmButton = { TvButton("Retry") { vm.clearError(); current?.let { play(it, route == "player") } ?: state.profile?.let { vm.select(it.id) } } },
                    dismissButton = { TvButton("Close", onClick = vm::clearError) })
                if (state.ready && state.settings["legalAccepted"] != "yes") AlertDialog(
                    onDismissRequest = {}, title = { Text("Welcome to IPTV Toronto") },
                    text = { Text(androidx.compose.ui.res.stringResource(R.string.player_notice)) },
                    confirmButton = { TvButton("I understand") { vm.setting("legalAccepted", "yes") } })
                if (picker) AlertDialog(onDismissRequest = { picker = false }, title = { Text("Choose profile") },
                    text = { LazyColumn { items(state.profiles, key = { it.id }) { p -> TvButton(p.name, Modifier.fillMaxWidth()) { vm.select(p.id); picker = false; go("home") } } } },
                    confirmButton = { TvButton("Manage profiles") { picker = false; go("portal") } })
                if (exit) AlertDialog(onDismissRequest = { exit = false }, title = { Text("Exit IPTV Toronto?") },
                    confirmButton = { TvButton("Exit") { (context as? Activity)?.finish() } },
                    dismissButton = { TvButton("Stay") { exit = false } })
                if (pinAction != null) AlertDialog(onDismissRequest = { pinAction = null },
                    title = { Text("Enter parental PIN") }, text = { Column {
                        OutlinedTextField(pin, { pin = it.filter(Char::isDigit).take(8) }, visualTransformation = androidx.compose.ui.text.input.PasswordVisualTransformation())
                        if (pinError) Text("Incorrect PIN", color = Color.Red)
                    } }, confirmButton = { TvButton("Unlock") {
                        if (vm.checkPin(pin)) { val action = pinAction; pinAction = null; pinError = false; action?.invoke() } else pinError = true
                    } })
            }
        }
    }
    }
}

@Composable private fun TopBar(route: String, state: TorontoState, go: (String) -> Unit, profiles: () -> Unit) {
    var now by remember { mutableLongStateOf(System.currentTimeMillis()) }
    LaunchedEffect(Unit) { while (true) { now = System.currentTimeMillis(); delay(1000) } }
    Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
        Image(painterResource(R.drawable.brand_icon), "IPTV Toronto", Modifier.size(44.dp))
        Text("IPTV\nTORONTO", color = Color.White, fontSize = 14.sp, fontWeight = androidx.compose.ui.text.font.FontWeight.ExtraBold)
        Spacer(Modifier.width(12.dp))
        listOf("Home" to "home", "Live TV" to "live", "Movies" to "movies", "Series" to "series", "Settings" to "settings").forEach { (label, target) ->
            Column {
                TvButton(label, selected = route == target, compact = true) { go(target) }
                if (route == target) Box(Modifier.align(Alignment.CenterHorizontally).width(24.dp).height(2.dp).background(Brand.Cyan))
            }
        }
        Spacer(Modifier.weight(1f))
        TvButton((state.profile?.name ?: "Profiles").take(18), compact = true, onClick = profiles)
        Text(SimpleDateFormat(if (state.settings["clock"] == "24h") "HH:mm" else "h:mm a", Locale.getDefault()).format(Date(now)), fontSize = 14.sp, color = Color.White, maxLines = 1)
    }
}
@Composable private fun HintBar(route: String) {
    val hint = when (route) {
        "live" -> "D-pad Navigate     OK Watch     Hold OK Favourite     Back Return"
        "portal" -> "D-pad Navigate     OK Edit field     Back Return"
        else -> "D-pad Navigate     OK Select     Back Return"
    }
    Text(hint, Modifier.fillMaxWidth().padding(top = 10.dp), textAlign = androidx.compose.ui.text.style.TextAlign.End, color = Brand.Muted, fontSize = 12.sp)
}

@Composable private fun HomeScreen(state: TorontoState, go: (String) -> Unit, watch: () -> Unit, resume: (Media, Long) -> Unit) {
    LazyColumn(verticalArrangement = Arrangement.spacedBy(18.dp)) {
        item { Text("TONIGHT’S PICK", color = Brand.Cyan, letterSpacing = 3.sp, fontSize = 14.sp) }
        item { Heading("Your city. Your channels.", true); Muted("Discover something great tonight.") }
        item { Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
            TvButton("▶  Watch live", selected = true, onClick = watch)
            TvButton("☷  Open guide") { go("live") }
        } }
        if (state.profile == null) item { EmptyState("Your entertainment starts here.", "Connect your portal") { go("portal") } }
        val progress = state.library.filter { it.kind != "itv" && it.position > 0 && it.duration > it.position }
        if (progress.isNotEmpty()) {
            item { Heading("Continue watching") }
            item { LazyRow(horizontalArrangement = Arrangement.spacedBy(12.dp)) { items(progress, key = { it.kind + it.mediaId }) { row ->
                MediaCard(Media(row.mediaId, row.title, row.command, row.kind, image = row.image), false,
                    EpgMath.fraction(row.position, 0, row.duration), onClick = { resume(Media(row.mediaId, row.title, row.command, row.kind, image = row.image), row.position) })
            } } }
        }
        item { Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
            listOf(Triple("Live TV", "News, Sports, Entertainment", "live"), Triple("Movies", "Blockbusters & Favourites", "movies"), Triple("Series", "Binge-Worthy Stories", "series")).forEach { (title, subtitle, route) ->
                Panel(Modifier.weight(1f)) { TvButton(title) { go(route) }; Muted(subtitle) }
            }
        } }
        item { Muted(androidx.compose.ui.res.stringResource(R.string.player_notice)) }
    }
}

@Composable private fun MediaCard(media: Media, portrait: Boolean, progress: Float = 0f, onFocus: () -> Unit = {}, onClick: () -> Unit) {
    Column(Modifier.width(if (portrait) 138.dp else 238.dp)) {
        TvButton(media.name, Modifier.fillMaxWidth().height(if (portrait) 190.dp else 106.dp),
            onFocus = onFocus, artwork = media.image, onClick = onClick)
        if (progress > 0) LinearProgressIndicator(progress = { progress }, color = Brand.Cyan, modifier = Modifier.fillMaxWidth())
    }
}

@Composable private fun LiveScreen(state: TorontoState, engine: Media3Engine?, current: Media?, focus: (Media) -> Unit,
    watch: (Media) -> Unit, loadEpg: (Media) -> Unit, favourite: (Media) -> Unit, setup: () -> Unit) {
    var genre by rememberSaveable { mutableStateOf("*") }
    var focused by remember { mutableStateOf<Media?>(null) }
    val favourites = state.library.filter { it.favourite && it.kind == "itv" }.map { it.mediaId }.toSet()
    val channels = remember(state.channels, genre, favourites, state.settings["lockAdult"]) { state.channels.filter {
        (genre == "*" || (genre == "favourites" && it.id in favourites) || it.category == genre) &&
            !(it.adult && state.settings["lockAdult"] == "On")
    } }
    val firstChip = remember { FocusRequester() }
    var time by remember { mutableLongStateOf(System.currentTimeMillis()) }
    LaunchedEffect(Unit) { while (true) { time = System.currentTimeMillis(); delay(30_000) } }
    val windowStart = time / 1800000 * 1800000
    val windowEnd = windowStart + 7200000
    val timeFormat = remember { SimpleDateFormat("h:mm a", Locale.getDefault()) }
    BackHandler { firstChip.requestFocus() }
    Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
        Heading("Live TV", true)
        LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            item { TvButton("All channels", Modifier.focusRequester(firstChip), genre == "*") { genre = "*" } }
            item { TvButton("Favourites", selected = genre == "favourites") { genre = "favourites" } }
            items(state.categories["itv"].orEmpty(), key = { it.id }) { c -> TvButton(c.name, selected = genre == c.id) { genre = c.id } }
        }
        Row(Modifier.height(140.dp), horizontalArrangement = Arrangement.spacedBy(20.dp)) {
            Column(Modifier.weight(1f)) {
                Text("CH ${focused?.number.orEmpty()}  ${focused?.name.orEmpty().uppercase()}", color = Brand.Cyan)
                val program = state.epg[focused?.id]?.firstOrNull { it.start <= System.currentTimeMillis() && it.end > System.currentTimeMillis() }
                Heading(program?.name ?: focused?.name ?: "Choose a channel")
                Muted(program?.description?.take(180) ?: "Programme information is supplied by your portal.")
            }
            Box(Modifier.width(248.dp).fillMaxHeight().border(1.dp, Brand.Cyan, RoundedCornerShape(12.dp))) {
                if (engine != null && current?.id == focused?.id) VideoSurface(engine)
                else Text("Live preview", Modifier.align(Alignment.Center), color = Brand.Muted)
            }
        }
        if (channels.isEmpty()) EmptyState(if (state.profile == null) "Connect your authorized service." else "No channels in this category.", if (state.profile == null) "Connect portal" else null, setup)
        else BoxWithConstraints {
            val gridWidth = (maxWidth - 226.dp).coerceAtLeast(200.dp)
            Column {
                Row(Modifier.fillMaxWidth().height(24.dp)) {
                    Text("Channel", Modifier.width(226.dp), color = Brand.Muted)
                    repeat(4) { offset -> Text(timeFormat.format(Date(windowStart + offset * 1800000L)), Modifier.width(gridWidth / 4), color = Brand.Muted) }
                }
                Box {
                    LazyColumn(verticalArrangement = Arrangement.spacedBy(4.dp)) {
            items(channels, key = { it.id }) { channel ->
                LaunchedEffect(channel.id) { loadEpg(channel) }
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                    TvButton("${channel.number}  ${if (channel.id in favourites) "★ " else ""}${channel.name}", Modifier.width(220.dp),
                        onFocus = { focused = channel; focus(channel) }, onLongClick = { favourite(channel) }) { watch(channel) }
                    val programs = state.epg[channel.id].orEmpty().filter { it.end > windowStart && it.start < windowEnd }.sortedBy { it.start }
                    if (programs.isEmpty()) TvButton("Programme information unavailable", Modifier.weight(1f), onFocus = { focused = channel; focus(channel) }, onLongClick = { favourite(channel) }) { watch(channel) }
                    else Row {
                        var cursor = windowStart
                        programs.forEach { program ->
                            if (program.start > cursor) Spacer(Modifier.width(gridWidth * (EpgMath.spanMinutes(cursor, program.start, windowStart, windowEnd) / 120f)))
                            val width = gridWidth * (EpgMath.spanMinutes(maxOf(cursor, program.start), program.end, windowStart, windowEnd) / 120f)
                            if (width > 0.dp) TvButton(program.name + "\n" + timeFormat.format(Date(program.start)),
                                Modifier.width(width), onFocus = { focused = channel; focus(channel) }, onLongClick = { favourite(channel) }) { watch(channel) }
                            cursor = maxOf(cursor, program.end)
                        }
                    }
                }
            }
        }
                    Box(Modifier.offset(x = 226.dp + gridWidth * EpgMath.fraction(time, windowStart, windowEnd))
                        .width(1.dp).height(280.dp).background(Brand.Cyan.copy(alpha = 0.6f)))
                }
            }
        }
    }
}

@Composable private fun CatalogScreen(kind: String, state: TorontoState, vm: TorontoViewModel, details: (Media) -> Unit) {
    var category by rememberSaveable(kind) { mutableStateOf("*") }
    var query by rememberSaveable(kind) { mutableStateOf("") }
    var search by remember { mutableStateOf(false) }
    var focused by remember { mutableStateOf<Media?>(null) }
    LaunchedEffect(kind, category, query, state.profile?.id) { vm.catalog(kind, category, query) }
    LazyColumn(verticalArrangement = Arrangement.spacedBy(16.dp)) {
        item { Row(verticalAlignment = Alignment.CenterVertically) {
            Column(Modifier.weight(1f)) { Heading(if (kind == "vod") "Movie night, sorted." else "Your next great story.", true); Muted("From your portal. Ready when you are.") }
            TvButton("Search") { search = true }
        } }
        item { LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            item { TvButton("All titles", selected = category == "*") { category = "*" } }
            items(state.categories[kind].orEmpty(), key = { it.id }) { c -> TvButton(c.name, selected = category == c.id) { category = c.id } }
        } }
        if (focused != null) item { Panel {
            Heading(focused!!.name); Muted(listOf(focused!!.year, focused!!.duration).filter { it.isNotBlank() }.joinToString(" · "))
            Muted(focused!!.description.take(200)); TvButton("View details") { details(focused!!) }
        } }
        item { Heading(if (kind == "vod") "Featured movies" else "Series") }
        if (state.catalog.isEmpty() && !state.busy) item { EmptyState("No titles available. Connect a portal with this subscription module.") }
        item { LazyRow(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
            items(state.catalog.filterNot { it.adult && state.settings["lockAdult"] == "On" }, key = { it.id }) { media ->
                MediaCard(media, true, onFocus = { focused = media }) { details(media) }
            }
            if (state.catalog.size < state.total) item { TvButton("Load more") { vm.catalog(kind, category, query, true) } }
        } }
    }
    if (search) AlertDialog(onDismissRequest = { search = false }, title = { Text("Search your portal") },
        text = { OutlinedTextField(query, { query = it }, label = { Text("Title") }) },
        confirmButton = { TvButton("Search") { search = false } })
}

@Composable private fun DetailsScreen(media: Media, state: TorontoState, vm: TorontoViewModel, play: (Media, Long) -> Unit) {
    val saved = state.library.find { it.mediaId == media.id && it.kind == media.kind }
    LaunchedEffect(media.id) { if (media.kind == "series") vm.seasons(media) }
    LazyColumn(verticalArrangement = Arrangement.spacedBy(16.dp)) {
        item { Heading(media.name, true); Muted(listOf(media.year, media.duration).filter { it.isNotBlank() }.joinToString(" · ")) }
        item { Muted(media.description.ifBlank { "No synopsis supplied by the portal." }) }
        item { Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
            if (media.kind != "series") TvButton("▶ Play", selected = true) { play(media, 0) }
            if (media.kind != "series" && (saved?.position ?: 0) > 0) TvButton("Resume") { play(media, saved!!.position) }
            TvButton(if (saved?.favourite == true) "✓ My list" else "+ My list") { vm.favourite(media) }
        } }
        if (media.kind == "series") {
            item { LazyRow(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                items(state.seasons, key = { it.id }) { season -> TvButton(season.name) { vm.episodes(media, season) } }
            } }
            item { LazyRow(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                items(state.episodes, key = { it.id }) { episode ->
                    val progress = state.library.find { it.mediaId == episode.id && it.kind == "series" }
                    MediaCard(episode, false, EpgMath.fraction(progress?.position ?: 0, 0, progress?.duration ?: 0)) {
                        play(episode, progress?.position ?: 0)
                    }
                }
            } }
            if (state.seasons.isEmpty() && !state.busy) item { EmptyState("No seasons returned by this portal.") }
        }
    }
}

@Composable private fun VideoSurface(engine: Media3Engine, modifier: Modifier = Modifier, fit: Int = androidx.media3.ui.AspectRatioFrameLayout.RESIZE_MODE_FIT) {
    AndroidView(factory = { context -> PlayerView(context).apply {
        useController = false; player = engine.player; keepScreenOn = true; isFocusable = false
    } }, modifier = modifier.fillMaxSize(), update = { it.player = engine.player; it.resizeMode = fit },
        onRelease = { it.player = null; it.keepScreenOn = false })
}

@Composable private fun PlayerScreen(media: Media, engine: Media3Engine?, state: TorontoState, guide: () -> Unit,
    zap: (Int) -> Unit, choose: (Media) -> Unit, favourite: (Media) -> Unit, retry: () -> Unit) {
    var overlay by remember { mutableStateOf(true) }
    var touchTime by remember { mutableLongStateOf(System.currentTimeMillis()) }
    var more by remember { mutableStateOf(false) }
    var channels by remember { mutableStateOf(false) }
    var track by remember { mutableStateOf<Int?>(null) }
    var number by remember { mutableStateOf<String?>(null) }
    var fit by remember { mutableIntStateOf(androidx.media3.ui.AspectRatioFrameLayout.RESIZE_MODE_FIT) }
    val focus = remember { FocusRequester() }
    var position by remember { mutableLongStateOf(0) }
    var duration by remember { mutableLongStateOf(0) }
    val context = LocalContext.current
    BackHandler(onBack = guide)
    DisposableEffect(Unit) {
        (context as? Activity)?.window?.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
        onDispose { (context as? Activity)?.window?.clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON) }
    }
    LaunchedEffect(overlay, touchTime) { if (overlay) { delay(5000); overlay = false } }
    LaunchedEffect(overlay) { if (overlay) { delay(100); focus.requestFocus() } }
    LaunchedEffect(engine) { while (true) { position = engine?.player?.currentPosition ?: 0; duration = engine?.player?.duration ?: 0; delay(1000) } }
    Box(Modifier.fillMaxSize().onPreviewKeyEvent { key ->
        if (key.type != KeyEventType.KeyDown) return@onPreviewKeyEvent false
        touchTime = System.currentTimeMillis()
        when(val code = key.nativeKeyEvent.keyCode) {
            AndroidKey.KEYCODE_CHANNEL_UP -> { zap(1); true }
            AndroidKey.KEYCODE_CHANNEL_DOWN -> { zap(-1); true }
            AndroidKey.KEYCODE_DPAD_LEFT -> if (!overlay && media.kind == "itv") { zap(-1); true } else false
            AndroidKey.KEYCODE_DPAD_RIGHT -> if (!overlay && media.kind == "itv") { zap(1); true } else false
            AndroidKey.KEYCODE_DPAD_UP, AndroidKey.KEYCODE_DPAD_DOWN -> if (!overlay) { channels = true; true } else false
            AndroidKey.KEYCODE_MENU -> { more = true; overlay = true; true }
            AndroidKey.KEYCODE_MEDIA_PLAY_PAUSE -> { engine?.player?.let { if(it.isPlaying) it.pause() else it.play() }; overlay = true; true }
            AndroidKey.KEYCODE_MEDIA_PLAY -> { engine?.player?.play(); true }
            AndroidKey.KEYCODE_MEDIA_PAUSE -> { engine?.player?.pause(); true }
            AndroidKey.KEYCODE_MEDIA_STOP -> { engine?.player?.stop(); guide(); true }
            AndroidKey.KEYCODE_MEDIA_REWIND, AndroidKey.KEYCODE_MEDIA_FAST_FORWARD -> {
                engine?.player?.let { if (it.isCurrentMediaItemSeekable) it.seekTo((it.currentPosition + if(code == AndroidKey.KEYCODE_MEDIA_REWIND) -10000 else 10000).coerceAtLeast(0)) }; true
            }
            in AndroidKey.KEYCODE_0..AndroidKey.KEYCODE_9 -> { number = (number.orEmpty() + (code - AndroidKey.KEYCODE_0)).take(6); true }
            AndroidKey.KEYCODE_DPAD_CENTER, AndroidKey.KEYCODE_ENTER, AndroidKey.KEYCODE_BUTTON_A -> if (!overlay) { overlay = true; true } else false
            else -> { if (!overlay) overlay = true; false }
        }
    }.clickable { overlay = true; touchTime = System.currentTimeMillis() }) {
        if (engine != null) VideoSurface(engine, fit = fit)
        if (overlay) Column(Modifier.align(Alignment.BottomCenter).fillMaxWidth()
            .background(Brush.verticalGradient(listOf(Color.Transparent, Brand.Navy))).padding(20.dp),
            verticalArrangement = Arrangement.spacedBy(14.dp)) {
            Text(if (media.kind == "itv") "● LIVE   ${media.number}  ${media.name}" else media.name, color = Brand.Cyan)
            Heading(state.epg[media.id]?.firstOrNull()?.name ?: media.name, true)
            if (duration > 0) {
                LinearProgressIndicator(progress = { EpgMath.fraction(position, 0, duration) }, Modifier.fillMaxWidth(), color = Brand.Cyan)
                Muted("${position / 60000} / ${duration / 60000} min")
            }
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                TvButton("Guide", Modifier.weight(1f), onClick = guide)
                TvButton(if (engine?.player?.isPlaying == true) "Pause" else "Play", Modifier.weight(1f).focusRequester(focus)) { engine?.player?.let { if (it.isPlaying) it.pause() else it.play() } }
                TvButton("Audio", Modifier.weight(1f)) { track = C.TRACK_TYPE_AUDIO }
                TvButton("Subtitles", Modifier.weight(1f)) { track = C.TRACK_TYPE_TEXT }
                TvButton("More", Modifier.weight(1f)) { more = true }
            }
            Muted("Left / Right Channels     OK Controls     Menu More     Back Guide")
        }
    }
    if (more) AlertDialog(onDismissRequest = { more = false }, title = { Text("More") },
        text = { Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
            TvButton("Video fit") { fit = (fit + 1) % 5 }
            TvButton("Quality") { track = C.TRACK_TYPE_VIDEO; more = false }
            TvButton("Favourite") { favourite(media); more = false }
            TvButton("Channel number") { number = ""; more = false }
            TvButton("Channel list") { channels = true; more = false }
            Muted("Player: Media3 · ${engine?.player?.videoFormat?.codecs.orEmpty()}")
        } }, confirmButton = { TvButton("Close") { more = false } })
    if (channels) AlertDialog(onDismissRequest = { channels = false }, title = { Text("Channels") },
        text = { LazyColumn { items(state.channels.filterNot { it.adult && state.settings["lockAdult"] == "On" }, key = { it.id }) { ch ->
            TvButton("${ch.number}  ${ch.name}", Modifier.fillMaxWidth()) { channels = false; choose(ch) }
        } } }, confirmButton = { TvButton("Close") { channels = false } })
    if (number != null) AlertDialog(onDismissRequest = { number = null }, title = { Text("Channel ${number.orEmpty()}") },
        text = { Column {
            listOf(listOf("1","2","3"), listOf("4","5","6"), listOf("7","8","9"), listOf("Clear","0","⌫")).forEach { row ->
                Row { row.forEach { key -> TvButton(key) { number = when(key) { "Clear" -> ""; "⌫" -> number.orEmpty().dropLast(1); else -> (number.orEmpty() + key).take(6) } } } }
            }
        } }, confirmButton = { TvButton("Watch") {
            state.channels.find { it.number == number && !(it.adult && state.settings["lockAdult"] == "On") }?.let(choose); number = null
        } })
    if (track != null) {
        val type = track!!
        val groups = engine?.player?.currentTracks?.groups.orEmpty().filter { it.type == type }
        AlertDialog(onDismissRequest = { track = null }, title = { Text(when(type) { C.TRACK_TYPE_AUDIO -> "Audio"; C.TRACK_TYPE_TEXT -> "Subtitles"; else -> "Quality" }) },
            text = { LazyColumn {
                item { TvButton(if (type == C.TRACK_TYPE_TEXT) "Off" else "Auto") {
                    engine?.player?.let { it.trackSelectionParameters = it.trackSelectionParameters.buildUpon().clearOverridesOfType(type).setTrackTypeDisabled(type, type == C.TRACK_TYPE_TEXT).build() }; track = null
                } }
                groups.forEachIndexed { gi, group -> items(group.length) { index ->
                    val format = group.getTrackFormat(index)
                    TvButton(format.label ?: format.language ?: "${format.height}p · ${format.bitrate / 1000} kbps · ${gi + 1}.${index + 1}") {
                        engine?.player?.let { it.trackSelectionParameters = it.trackSelectionParameters.buildUpon().setTrackTypeDisabled(type, false)
                            .setOverrideForType(TrackSelectionOverride(group.mediaTrackGroup, index)).build() }; track = null
                    }
                } }
            } }, confirmButton = { TvButton("Close") { track = null } })
    }
}
