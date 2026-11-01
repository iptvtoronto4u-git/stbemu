@file:OptIn(androidx.compose.ui.test.ExperimentalTestApi::class)
package com.iptvtoronto.tv

import androidx.compose.ui.test.*
import androidx.compose.ui.test.junit4.createAndroidComposeRule
import androidx.compose.ui.input.key.Key
import androidx.compose.ui.semantics.SemanticsActions
import org.junit.Rule
import org.junit.Test

class StartupTest {
    @get:Rule val compose = createAndroidComposeRule<MainActivity>()
    @Test fun firstRunReachesPortalAfterNavigationIsReady() {
        compose.waitUntil(30000) {
            compose.onAllNodesWithText("I understand").fetchSemanticsNodes().isNotEmpty() ||
                compose.onAllNodesWithText("Connect your portal").fetchSemanticsNodes().isNotEmpty()
        }
        if (compose.onAllNodesWithText("I understand").fetchSemanticsNodes().isNotEmpty())
            compose.onNodeWithText("I understand").performClick()
        compose.waitUntil(30000) { compose.onAllNodesWithText("Connect your portal").fetchSemanticsNodes().isNotEmpty() }
        compose.onNodeWithText("Connect your portal").assertIsDisplayed()
        compose.onNodeWithText("Home").performSemanticsAction(SemanticsActions.RequestFocus) { it() }
        compose.onNodeWithText("Home").performKeyInput { pressKey(Key.DirectionCenter) }
        compose.waitUntil(10000) {
            runCatching { compose.onNodeWithText("Your city. Your channels.").assertIsDisplayed(); true }.getOrDefault(false)
        }
        compose.onNodeWithText("Your city. Your channels.").assertIsDisplayed()
    }
}
