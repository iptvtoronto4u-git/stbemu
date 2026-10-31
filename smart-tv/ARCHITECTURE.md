# IPTV TORONTO cross-platform architecture

```
Shared product spec / profile schema
  |-- Android TV + Fire TV: Kotlin Activity, Android Gradle APK
  |-- Samsung TV: Tizen web runtime, signed WGT
  |-- LG TV: webOS web runtime, IPK
  '-- Shared web UI: index.html + CSS + vanilla JS
```

## Profile schema v1
`{ "name": "Living room", "portal": "https://provider.example/portal", "mac": "00:1A:79:00:00:01" }`

## Current milestone: scaffolding
- Android debug APK builds successfully on GitHub Actions; profile editing works, playback not included.
- Samsung and LG shared web UI is committed; GitHub Actions validates syntax and produces **source staging ZIPs**, not signed installable packages.
- Remote keyboard focus and Escape/Back handling is basic. Real device testing is outstanding.

## Portal integration contract (not yet implemented)
A `PortalProvider` adapter will expose `checkConnectivity()`, `authenticate()`, `listCategories()`, `listChannels()`, `getPlaybackUrl()`, and `logout()`. Only implement documented and explicitly authorized New4K interfaces. Portal URL and MAC are not proof of authorization. No portal calls or media requests are made by the current app.

## Security
- Store only nonsecret profile metadata in local storage.
- Store session credentials in platform-protected secure storage; never log secrets or ship them in source.
- Require user consent before connecting to an unencrypted HTTP endpoint.
- Avoid cloning closed-source STBEmu code, bypassing access controls, or reusing customer MAC/device identities.
- Use authorized media streams and verify rights to redistribute content.

## Planned CI
1. JavaScript syntax, JSON/XML validation, staging source artifacts (implemented).
2. Unit tests for profile CRUD and validation.
3. Tizen signing and WGT packaging with user-provided certificates (not configured).
4. LG webOS IPK packaging using CLI (not configured).
5. Android TV launcher and D-pad integration, media player and device tests (not implemented).
