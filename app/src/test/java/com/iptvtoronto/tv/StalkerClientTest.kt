package com.iptvtoronto.tv

import com.iptvtoronto.tv.data.api.*
import com.iptvtoronto.tv.domain.*
import kotlinx.coroutines.runBlocking
import okhttp3.mockwebserver.*
import org.junit.Assert.*
import org.junit.After
import org.junit.Test

class StalkerClientTest {
    private val server = MockWebServer()
    private fun json(body: String) { server.enqueue(MockResponse().setHeader("Content-Type", "application/json").setBody(body)) }
    private fun client(): StalkerClient {
        server.start()
        return StalkerClient(Profile(name = "Test", portal = server.url("/c/").toString(), mac = "AA:BB:CC:11:22:33"))
    }
    private fun auth(token: String = "test-token") {
        json("""{"js":{"token":"$token"}}""")
        json("""{"js":{"id":1}}""")
        json("""{"js":{"tariff_name":"Authorized test","end_date":"2030-01-01"}}""")
    }
    @After fun close() { server.shutdown() }
    @Test fun authenticationHeadersAndNumericIds() = runBlocking {
        val client = client(); auth()
        json("""{"js":{"data":[{"id":7,"name":"Local channel","cmd":"ffmpeg http://example.org/live","number":1}]}}""")
        client.authenticate()
        assertEquals("7", client.channels().single().id)
        val handshake = server.takeRequest()
        assertEquals("handshake", handshake.requestUrl!!.queryParameter("action"))
        assertTrue(handshake.getHeader("Cookie")!!.contains("mac=AA%3ABB"))
        val profile = server.takeRequest()
        assertEquals("Bearer test-token", profile.getHeader("Authorization"))
        assertEquals("Model: MAG250; Link: WiFi", profile.getHeader("X-User-Agent"))
    }
    @Test fun tokenExpiryReauthenticatesOnce() = runBlocking {
        val client = client(); auth(); client.authenticate()
        server.enqueue(MockResponse().setResponseCode(401))
        auth("new-token")
        json("""{"js":[{"id":"news","title":"News"}]}""")
        assertEquals("News", client.categories("itv").single().name)
        assertEquals(8, server.requestCount)
    }
    @Test fun streamDoesNotLeakPortalCredentialsToCdn() = runBlocking {
        val client = client(); auth(); client.authenticate()
        json("""{"js":{"cmd":"ffmpeg https://cdn.example.org/live.m3u8?ticket=1"}}""")
        val stream = client.resolve(Media("1","Channel","portal-command"))
        assertEquals("https://cdn.example.org/live.m3u8?ticket=1", stream.url)
        assertFalse(stream.headers.containsKey("Cookie"))
        assertFalse(stream.headers.containsKey("Authorization"))
    }
    @Test fun malformedJsonIsReportedWithoutResponseBody() = runBlocking {
        val client = client(); auth(); client.authenticate()
        json("private-invalid-response")
        try { client.categories("itv"); fail("Expected error") }
        catch (e: PortalException) { assertFalse(e.message!!.contains("private-invalid-response")) }
    }
}
