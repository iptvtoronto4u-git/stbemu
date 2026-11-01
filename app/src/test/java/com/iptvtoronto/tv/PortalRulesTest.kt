package com.iptvtoronto.tv

import com.iptvtoronto.tv.domain.*
import org.junit.Assert.*
import org.junit.Test

class PortalRulesTest {
    @Test fun portalPathsPreserveCustomPrefix() {
        assertEquals("https://example.org/stalker_portal/server/load.php",
            PortalRules.endpoints("https://example.org/stalker_portal/c/").first())
        assertEquals(listOf("http://example.org/custom/portal.php"),
            PortalRules.endpoints("http://example.org/custom/portal.php?ignored=true"))
    }
    @Test fun streamCommandsAreParsed() {
        assertEquals("https://example.org/live.ts?token=x", PortalRules.streamUrl("ffmpeg https://example.org/live.ts?token=x"))
        assertEquals("http://example.org/a.m3u8", PortalRules.streamUrl("auto http://example.org/a.m3u8"))
    }
    @Test(expected = IllegalArgumentException::class) fun fileCommandsAreRejected() { PortalRules.streamUrl("ffmpeg file:///etc/passwd") }
    @Test fun validatesRegisteredMacAndRedactsProfile() {
        val p = Profile(name = "Room", portal = "http://example.org/c/", mac = "aa:bb:cc:dd:ee:ff").validated()
        assertEquals("AA:BB:CC:DD:EE:FF", p.mac)
        assertFalse(p.toString().contains(p.mac))
        assertEquals(64, PortalRules.deviceId(p.mac).length)
        assertEquals(13, PortalRules.serial(p.mac).length)
        assertEquals(PortalRules.deviceId(p.mac), PortalRules.deviceId(p.mac.lowercase()))
    }
    @Test fun epgClipsAndHandlesBadRanges() {
        assertEquals(0.5f, EpgMath.fraction(50, 0, 100))
        assertEquals(0f, EpgMath.fraction(50, 100, 100))
        assertEquals(1f, EpgMath.fraction(200, 0, 100))
        assertEquals(15f, EpgMath.spanMinutes(0, 1800000, 900000, 2700000))
        assertEquals(0f, EpgMath.spanMinutes(0, 100, 200, 300))
    }
}
