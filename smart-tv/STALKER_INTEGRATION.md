# Stalker integration and Samsung update

This app implements a limited, configurable Stalker API client: `stb/handshake`,
`itv/get_genres`, paginated `itv/get_ordered_list`, and `itv/create_link`.
It sends the registered MAC as a cookie and the session token as a Bearer header.
It does not claim MAG firmware identity, generate device IDs/signatures, perform
DRM operations, or implement device-bound `get_profile` authentication.
A successful STBEmu subscription does not establish Samsung client compatibility.

## Profile setup

Users enter only a profile name, portal URL and registered MAC. The API path is
automatic: host-only URLs use stalker_portal/server/load.php; portal base paths
(including a trailing /c/) use server/load.php beneath that base. Existing New4K
profiles with the old portal.php default are corrected automatically at connection
time. Developer-supplied custom endpoint values remain supported internally for
other providers. No endpoint probing is performed.
Select Connect, choose a category, and choose a channel. Next page loads more
channels. Stop returns to the browser; Return stops video first, then disconnects.
Disconnect and app backgrounding clear the in-memory session.

Tokens and resolved stream URLs are never saved in localStorage or logged.
Profile name, portal, API path and MAC remain local, as in the existing manager.
HTTP transmits session data without encryption; prefer provider-supported HTTPS.
Failures show fixed messages, not raw portal payloads or signed stream URLs.
Reconnect after authorization expires; there are no hidden retry loops.

## Compatibility limits

The web runtime must allow MAC cookies, credentialed CORS and Authorization
headers for the provider origin. Standard Chromium may silently discard the
forbidden Cookie header; this implementation cannot override browser policy.
If the Q60D does this too, a provider-supported cookie/session transport or a
separately secured, authorized relay is required. No relay is included here.
Network, cookie and CORS failures may be indistinguishable to JavaScript.
A token alone does not prove that a MAC cookie was delivered or access granted.
No device fingerprint, firmware impersonation, CORS bypass or DRM workaround
will be attempted. Unsupported portal authentication must be resolved with the
provider. AVPlay accepts only direct HTTP(S) URLs returned by create_link;
commands, localhost placeholders and unsupported schemes are rejected.
Streams needing extra headers, codecs or DRM are not guaranteed to play.

## Build and update the Q60D

Run from the repository root in Windows PowerShell with the existing Samsung
certificate installed locally (never copy certificates/passwords to GitHub):

```powershell
& C:\tizen-studio\tools\sdb.exe connect 192.168.68.56:26101
& C:\tizen-studio\tools\sdb.exe devices
.\smart-tv\samsung\build-and-install.ps1 -CertificateProfile IPTV_TORONTO_TV -DeviceSerial 192.168.68.56:26101 -Launch
```

Use the exact serial reported by `sdb devices` if it differs. The helper stages
fresh assets, signs a WGT and installs with the existing application ID, retaining
local profiles. It does not uninstall first. Keep the prior signed WGT for rollback;
reinstall it if needed. Certificate/DUID permission and TV Developer Mode must
already be valid. CI provides source ZIPs, not signed installable WGTs.

On TV verify: saved profiles survive; the API path is automatic; Connect shows either
categories or an actionable error; pagination changes channels; channel playback
is visible; switching during preparation does not start the previous stream;
Stop/Return work; reconnect succeeds; backgrounding clears the session. Record
only error codes/messages, never tokens, cookies or complete signed URLs.

## Validation

Run the commands in `.github/workflows/smart-tv-staging.yml`. CI validates syntax,
unit tests and manifests, runs a 1920x1080 Chromium smoke test, then stages ZIPs.
Mock tests verify protocol handling, not New4K or Samsung compatibility. Hardware
playback and real provider authentication are separate acceptance checks.

Protocol reference: https://github.com/iptvhakr/stalker_portal/blob/master/server/load.php
(the server dispatcher routes type/action; provider variants can differ).
