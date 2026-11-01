# Paired Windows test helper

The Q60D ignores a JavaScript-set Cookie header. Device diagnostics confirmed the
saved MAC matched, the Authorization header was sent, the Cookie header was
absent, and the runtime warned that Cookie is unsafe. Browser restriction:
https://developer.mozilla.org/en-US/docs/Glossary/Forbidden_request_header

This temporary LAN helper sends the authorized Stalker MAC cookie from Node.js.
It does not emulate firmware, generate identity signatures, bypass portal
authorization, proxy media, or change subscriptions. The TV still has three
profile fields and automatically opens the channel list after saving.

## This PC

The private pairing file is `.local/connection-helper.json` at repository root.
It contains a random 256-bit key, this PC's LAN address, the TV address, port and
one permitted portal API URL. It contains no subscription MAC or portal token.
Never publish this file, logs, or a locally paired WGT. The installed TV receives
the key only in the private staged `relay-config.js`; checked-in config is null.
Use `-RelayConfigPath .local/connection-helper.json` when signing this test build.

From the repository root in PowerShell:

```powershell
.\smart-tv\relay\start-helper.ps1
.\smart-tv\relay\stop-helper.ps1
```

Start is hidden and manual; there is no scheduled task or Windows service.
The PC must remain awake, the helper running, and both devices on this network.
An address change requires updating the private pairing file and TV build.
The default Node path uses the already installed Salesforce Node runtime; pass
`-NodePath` to start-helper.ps1 to select another Node.js 18+ installation.

## Boundaries

Only the configured TV and the PC itself can access the listener. A paired random
key is required for every request. Only POST JSON requests to one upstream origin
and exact API path are allowed, and only the five supported Stalker actions and
their parameters. Cookies are constructed from a validated MAC; arbitrary client
headers are not forwarded. Redirects are not followed. Requests and responses
have size/time limits. Errors are fixed text. Responses use no-store. Sessions,
account responses, MACs and playback links are not written to logs or disk.

This is an HTTP LAN test setup, not production hosting. Traffic is unencrypted
on the local network, as is the configured HTTP upstream. Production needs HTTPS,
separate per-device pairing/authorization, operational controls, and provider
approval for the deployment. Never expose this listener to the internet or open
a general firewall rule for it. No firewall changes were needed for this test.

Tests: `node smart-tv/tests/relay.test.cjs`, provider unit tests, browser smoke test.
Actual Q60D diagnostics confirmed authentication, category and channel retrieval,
and playback-link resolution through this helper. Video playback is a separate
hardware check.
