# IPTV TORONTO Smart TV workspace

## Platforms
- Android / Fire TV: existing Kotlin Android project at repository root; GitHub Actions produces a debug APK.
- Samsung Tizen: `smart-tv/samsung/config.xml` plus shared web files, packaged as a Tizen TV widget (.wgt) using Samsung Tizen Studio with a valid certificate.
- LG webOS: `smart-tv/lg/appinfo.json` plus shared web files, packaged as .ipk using LG webOS TV CLI (ares-package).

## Current scope
This is a TV-remote-friendly **profile manager prototype** only. It stores portal name, HTTP(S) URL and registered MAC locally. It does **not** authenticate to a Stalker/MAG portal, fetch channels, or play video. It does not impersonate a hardware device. Never distribute it as a working IPTV player.

## Build locally
For Samsung: copy `smart-tv/shared/index.html`, `style.css`, `app.js` into `smart-tv/samsung/`; add a legally usable PNG icon and replace placeholder app IDs; sign/package using Tizen Studio's TV certificate and CLI.

For LG: copy the same three shared files into `smart-tv/lg/`, then run `ares-package smart-tv/lg` with the LG webOS TV CLI. Developer-mode installation requires an LG developer account/device setup.

For Android/Fire TV: run the existing GitHub Actions Android workflow. Fire OS device compatibility and remote navigation still require device testing.

## Security and next steps
- Profiles are stored in localStorage on webOS/Tizen and SharedPreferences on Android; do not store passwords or session tokens in these plaintext stores.
- Confirm supported portal API, authentication and rights with upstream New4K provider. No protocol endpoint has been verified.
- Implement authorization-aware Stalker portal client only from documented/approved interfaces, add secure credential storage and a licensed streaming engine per platform.
- Add platform-specific remote key handling, playback lifecycle, offline states and real-device tests.
- Samsung .wgt requires a signing certificate; LG .ipk requires the webOS packaging tool. CI below produces **unsigned staging ZIPs**, not installable store packages.
