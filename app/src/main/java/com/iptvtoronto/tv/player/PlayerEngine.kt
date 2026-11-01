package com.iptvtoronto.tv.player

import android.content.Context
import androidx.media3.common.*
import androidx.media3.datasource.okhttp.OkHttpDataSource
import androidx.media3.exoplayer.*
import androidx.media3.exoplayer.mediacodec.DefaultMediaCodecAdapterFactory
import androidx.media3.exoplayer.source.DefaultMediaSourceFactory
import androidx.media3.extractor.DefaultExtractorsFactory
import androidx.media3.extractor.ts.DefaultTsPayloadReaderFactory
import com.iptvtoronto.tv.domain.Stream
import okhttp3.OkHttpClient

interface PlayerEngine {
    val player: ExoPlayer
    fun play(stream: Stream, position: Long = 0, muted: Boolean = false)
    fun release()
}
@androidx.annotation.OptIn(androidx.media3.common.util.UnstableApi::class)
class Media3Engine(context: Context, buffer: String) : PlayerEngine {
    private val data = OkHttpDataSource.Factory(OkHttpClient()).setUserAgent("IPTVToronto/0.2")
    private val extractors = DefaultExtractorsFactory().setTsExtractorFlags(
        DefaultTsPayloadReaderFactory.FLAG_DETECT_ACCESS_UNITS or DefaultTsPayloadReaderFactory.FLAG_ALLOW_NON_IDR_KEYFRAMES)
    private val bufferMs = when(buffer) { "Small" -> 10000; "Large" -> 50000; else -> 25000 }
    override val player = ExoPlayer.Builder(context, DefaultRenderersFactory(context).setEnableDecoderFallback(true))
        .setMediaSourceFactory(DefaultMediaSourceFactory(data, extractors))
        .setLoadControl(DefaultLoadControl.Builder().setBufferDurationsMs(bufferMs, bufferMs * 2, 1500, 3000).build())
        .build().apply {
            setAudioAttributes(AudioAttributes.Builder().setUsage(C.USAGE_MEDIA).setContentType(C.AUDIO_CONTENT_TYPE_MOVIE).build(), true)
            setHandleAudioBecomingNoisy(true)
        }
    override fun play(stream: Stream, position: Long, muted: Boolean) {
        data.setDefaultRequestProperties(stream.headers)
        player.volume = if (muted) 0f else 1f
        player.setMediaItem(MediaItem.Builder().setUri(stream.url)
            .setLiveConfiguration(MediaItem.LiveConfiguration.Builder().setTargetOffsetMs(5000).build()).build(), position)
        player.prepare(); player.playWhenReady = true
    }
    override fun release() { player.release() }
}
