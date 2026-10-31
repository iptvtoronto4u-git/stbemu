# IPTV TORONTO — STBEmu / MAG-Stalker feature parity target

Status: **requirements and acceptance criteria, not completed implementation**.
Samsung Tizen first; LG webOS and Android/Fire TV share the product behavior where APIs allow.
Build original code; do not copy proprietary STBEmu binaries or bypass authentication/DRM.

## Capability matrix
| Capability | Acceptance criterion | Status |
|---|---|---|
| Multiple portal profiles | Add/edit/delete/switch saved portal + registered MAC | Basic UI only |
| Portal handshake/auth | Use provider-approved Stalker/MAG API, show error and retry | Not implemented |
| Device identity | Supported authorized serial/device ID/model fields per profile | Not implemented |
| Live channels | Categories, search, favorites, channel switching | Not implemented |
| EPG | Now/next, guide timeline, timezone | Not implemented |
| TV archive / catch-up | Browse and play if subscription supports | Not implemented |
| VOD | Movies, series, seasons, episode lists, metadata | Not implemented |
| Video player | Compatible HLS/TS/other authorized formats, track selection | Not implemented |
| Remote | D-pad, OK, Back, media, channel and number keys when available | Basic D-pad/Back only |
| Settings | Language, display, timezone, aspect ratio, buffer | Not implemented |
| Parental PIN | Restrict content and protect PIN securely | Not implemented |
| Reliability | Timeout, retry, network-loss recovery, expired account errors | Not implemented |
| Performance | TV memory constraints, long-running stability | Not tested |
| Samsung packaging | Signed WGT + physical TV installation | Not implemented |
| LG packaging | IPK + device installation | Not implemented |

## Provider integration boundary
New4K reseller panel access does **not** establish a supported Stalker API, Xtream API, or M3U feed. Request portal URL, authentication method, API documentation, sample authorized test account, supported playback formats, and permission to integrate third-party TV clients. Do not assume `/stalker_portal/c/` exists. A MAC field is not a substitute for authorization.

## Tizen-specific strategy
- Use Samsung AVPlay for formats requiring native playback, with capability detection and HTML5 fallback where appropriate.
- Feature-detect remote key registration and support Return (10009), D-pad, OK, playback and channel keys where available.
- Avoid unsupported device spoofing: Tizen app cannot arbitrarily change hardware MAC or emulate MAG firmware.
- Test older/newer Tizen generations separately; pre-Tizen Samsung Orsay is a separate unsupported platform.
- Use secure session handling and never embed customer credentials in repository or CI logs.

## Milestone acceptance gates
1. **Foundation**: TV navigation, validated profiles, source tests, build staging.
2. **Connectivity**: authorized handshake, account status, channel categories, errors.
3. **Playback**: live TV, channel switching, buffer management, audio/subtitle selection.
4. **Library**: EPG, archive, VOD, search/favorites.
5. **Polish**: PIN, diagnostics, performance and network fault tests.
6. **Distribution**: signed Samsung WGT, LG IPK, Android APK, hardware smoke tests.

A feature is only marked complete after integration tests against an authorized provider account and relevant real-device verification.
