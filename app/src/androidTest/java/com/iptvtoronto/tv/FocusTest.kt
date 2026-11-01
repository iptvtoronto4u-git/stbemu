@file:OptIn(androidx.compose.ui.test.ExperimentalTestApi::class)
package com.iptvtoronto.tv

import androidx.compose.foundation.layout.Row
import androidx.compose.ui.Modifier
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.focus.focusRequester
import androidx.compose.ui.input.key.Key
import androidx.compose.ui.test.*
import androidx.compose.ui.test.junit4.createComposeRule
import com.iptvtoronto.tv.ui.components.TvButton
import org.junit.Rule
import org.junit.Test

class FocusTest {
    @get:Rule val compose = createComposeRule()
    @Test fun remoteMovesFocusBetweenActions() {
        val requester = FocusRequester()
        compose.setContent {
            androidx.tv.material3.MaterialTheme { Row {
                TvButton("First", Modifier.focusRequester(requester)) {}
                TvButton("Second") {}
            } }
        }
        compose.runOnIdle { requester.requestFocus() }
        compose.onNodeWithText("First").assertIsFocused().performKeyInput { pressKey(Key.DirectionRight) }
        compose.onNodeWithText("Second").assertIsFocused()
    }
}
