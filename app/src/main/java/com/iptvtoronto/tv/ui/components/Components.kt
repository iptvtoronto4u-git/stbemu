package com.iptvtoronto.tv.ui.components

import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.foundation.*
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.scale
import androidx.compose.ui.focus.onFocusChanged
import androidx.compose.ui.graphics.*
import androidx.compose.ui.unit.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.*
import androidx.tv.material3.Button
import androidx.tv.material3.ButtonDefaults
import androidx.tv.material3.Border
import com.iptvtoronto.tv.ui.theme.*
val LocalReduceMotion = staticCompositionLocalOf { false }

@Composable
fun TvButton(label: String, modifier: Modifier = Modifier, selected: Boolean = false,
    onFocus: () -> Unit = {}, onBlur: () -> Unit = {}, onLongClick: (() -> Unit)? = null,
    artwork: String? = null, compact: Boolean = false, onClick: () -> Unit) {
    Button(onClick = onClick, onLongClick = onLongClick,
        modifier = modifier.onFocusChanged { if (it.isFocused) onFocus() else onBlur() },
        shape = ButtonDefaults.shape(RoundedCornerShape(Tokens.Radius)),
        colors = ButtonDefaults.colors(containerColor = if (selected) Brand.Blue else Brand.Panel,
            contentColor = Color.White, focusedContainerColor = Brand.Blue, focusedContentColor = Color.White),
        border = ButtonDefaults.border(border = Border(BorderStroke(1.dp, Brand.Border)),
            focusedBorder = Border(BorderStroke(Tokens.FocusRing, Brand.Cyan))),
        scale = ButtonDefaults.scale(focusedScale = if (LocalReduceMotion.current) 1f else 1.03f),
        contentPadding = if (artwork != null) PaddingValues(0.dp) else PaddingValues(horizontal = if (compact) 10.dp else 16.dp, vertical = 10.dp)) {
        if (artwork != null) {
            Box(Modifier.fillMaxSize()) {
                if (artwork.isNotBlank()) coil.compose.AsyncImage(artwork, null, Modifier.fillMaxSize(), contentScale = androidx.compose.ui.layout.ContentScale.Crop)
                Box(Modifier.fillMaxSize().background(Brush.verticalGradient(listOf(Color.Transparent, Brand.Navy))))
                Text(label, Modifier.align(androidx.compose.ui.Alignment.BottomStart).padding(12.dp), color = Color.White,
                    fontWeight = androidx.compose.ui.text.font.FontWeight.Bold, fontSize = 16.sp, maxLines = 2)
            }
        } else {
        val clean = label.removePrefix("▶  ").removePrefix("▶ ").removePrefix("☷  ")
        val icon = when(clean) {
            "Home" -> Icons.Rounded.Home
            "Live TV" -> Icons.Rounded.LiveTv
            "Movies" -> Icons.Rounded.Movie
            "Series" -> Icons.Rounded.VideoLibrary
            "Settings" -> Icons.Rounded.Settings
            "Watch live", "Play", "Test connection" -> Icons.Rounded.PlayArrow
            "Pause" -> Icons.Rounded.Pause
            "Search" -> Icons.Rounded.Search
            "Save profile" -> Icons.Rounded.Save
            else -> null
        }
        if (icon != null) { Icon(icon, null, Modifier.size(19.dp), tint = Color.White); Spacer(Modifier.width(6.dp)) }
        Text(clean, color = Color.White, fontSize = 16.sp, maxLines = 2, fontFamily = BrandFonts.Button)
        }
    }
}
@Composable
fun Panel(modifier: Modifier = Modifier, content: @Composable ColumnScope.() -> Unit) {
    Column(modifier.background(Brand.Panel, RoundedCornerShape(Tokens.Radius))
        .border(1.dp, Brand.Border, RoundedCornerShape(Tokens.Radius)).padding(20.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp), content = content)
}
@Composable fun Heading(text: String, large: Boolean = false) {
    Text(text, fontSize = if (large) 40.sp else 25.sp, fontWeight = androidx.compose.ui.text.font.FontWeight.ExtraBold, color = Color.White,
        fontFamily = BrandFonts.Heading)
}
@Composable fun Muted(text: String, modifier: Modifier = Modifier) { Text(text, modifier, color = Brand.Muted, fontSize = 16.sp) }
@Composable fun EmptyState(text: String, action: String? = null, onAction: () -> Unit = {}) {
    Panel(Modifier.fillMaxWidth()) { Heading(text); if (action != null) TvButton(action, onClick = onAction) }
}
