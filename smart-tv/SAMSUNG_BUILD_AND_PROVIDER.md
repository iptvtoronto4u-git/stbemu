# IPTV TORONTO — Samsung installation and authorized playback

## Current milestone
- Shared TV profile UI with 1080p Chromium smoke test.
- Samsung Tizen AVPlay adapter (open, prepareAsync, play, pause, stop) with mock tests.
- This is **not yet a signed or installable .wgt**, nor a functioning MAG/Stalker streaming client.
- Chromium cannot exercise Samsung's proprietary AVPlay API. Test AVPlay on Samsung Tizen emulator or physical TV.

## Build a signed .wgt
1. Install Samsung Tizen Studio with TV Extension and TV certificate tools on a trusted computer.
2. Sign in with the Samsung developer account and create an **author** and **Samsung TV distributor** certificate profile.
3. Register the physical TV's DUID in the distributor certificate for device-side testing.
4. Stage `smart-tv/shared/*` plus `smart-tv/samsung/config.xml` into one Tizen web app project.
5. Use Tizen Studio's package command (or Tizen CLI with configured certificate profile) to generate a signed WGT. Do not commit private keys or certificate passwords to GitHub.
6. Enable Developer Mode on the Samsung TV, connect it via Tizen Device Manager, install the WGT, and verify remote navigation, app lifecycle, playback and network permissions.

## Provider integration prerequisite
The reseller panel and a server hostname are **not** sufficient to authenticate a MAG/Stalker portal. Obtain from the service operator:
- Exact authorized portal/API endpoint and written permission for third-party Tizen clients.
- Documented authentication scheme and test account (never commit credentials).
- Documented endpoints and response schemas for categories, channels, EPG, VOD and catch-up.
- Authorized stream URLs/formats (HLS/DASH), CORS requirements, DRM license handling, token expiry and error semantics.

Do not use undocumented MAC impersonation, firmware identity spoofing, or DRM circumvention. Until the approved provider API is supplied, `portal-provider.js` intentionally returns `PROVIDER_INTEGRATION_REQUIRED`.

## Device test plan
- Remote: arrows, OK, Return (10009), Back, media play/pause, long press, focus recovery.
- Playback: valid HLS/DASH, expired token, unsupported codec, disconnect/reconnect, buffering, stream switch, app suspend/resume, memory usage.
- EPG: timezone, empty guide, stale data, daylight-saving changes, channel mapping.
- VOD: paging, search, subtitles, audio tracks, resume position, parental access.
- Compatibility: multiple Tizen TV versions; legacy pre-Tizen Samsung TVs require separate technology.

## Security
Use HTTPS and short-lived tokens where supported; store no credentials in source control. Avoid shipping test accounts, stream URLs or distributor private keys in artifacts.
