package com.iptvtoronto.tv.ui.components

import android.content.Context
import android.net.*
import androidx.compose.runtime.*
import androidx.compose.ui.platform.LocalContext
import androidx.compose.material3.Text
import androidx.compose.ui.graphics.Color

@Composable fun NetworkStatus() {
    val context = LocalContext.current
    var online by remember { mutableStateOf(true) }
    DisposableEffect(context) {
        val manager = context.getSystemService(Context.CONNECTIVITY_SERVICE) as ConnectivityManager
        @Suppress("DEPRECATION")
        fun update() { online = manager.activeNetworkInfo?.isConnected == true }
        val callback = object : ConnectivityManager.NetworkCallback() {
            override fun onAvailable(network: Network) { update() }
            override fun onLost(network: Network) { update() }
        }
        update()
        manager.registerNetworkCallback(NetworkRequest.Builder().addCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET).build(), callback)
        onDispose { manager.unregisterNetworkCallback(callback) }
    }
    if (!online) Text("Offline · Check your network connection.", color = Color(0xFFFFB455))
}
