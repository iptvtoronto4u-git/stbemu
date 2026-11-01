@file:OptIn(androidx.compose.ui.text.ExperimentalTextApi::class)
package com.iptvtoronto.tv.ui.theme

import androidx.compose.ui.text.font.*
import com.iptvtoronto.tv.R

object BrandFonts {
    val Button = FontFamily(Font(R.font.manrope, weight = FontWeight.Normal,
        variationSettings = FontVariation.Settings(FontVariation.weight(600))))
    val Heading = FontFamily(Font(R.font.manrope, weight = FontWeight.ExtraBold,
        variationSettings = FontVariation.Settings(FontVariation.weight(800))))
}
