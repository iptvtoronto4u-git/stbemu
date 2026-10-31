# IPTV TORONTO — Smart STB / Smart STB+ Feature Parity

Reference: https://www.smart-stb.net/ and official Smart STB documentation, reviewed 2026-10-31.

This is an original implementation target, **not** a claim of current parity. Never copy proprietary code, UI assets or identity-emulation mechanisms. Use only provider-authorized APIs and content.

| Capability | Priority | Current implementation | Acceptance gate |
|---|---|---|---|
| Multiple saved portal profiles | P0 | Basic local profile CRUD | Remote-editable, validated, secure storage |
| M3U playlists / category and logo import | P0 | Not implemented | Authorized M3U/M3U8 import; channel parsing; categories |
| Live TV channel browser | P0 | Not implemented | Channel grid, categories, search, favorites, channel switching |
| Samsung AVPlay | P0 | Guarded adapter and mock unit tests | Actual Samsung Tizen emulator and device playback |
| MAG/Stalker portal | P0 | Explicit unsupported adapter | Provider-approved API, authenticated channel/stream flow |
| EPG / now-next / extended guide | P0 | Not implemented | Program mapping, timezone handling, navigation |
| Movies, series, episodes (VOD) | P1 | Not implemented | Catalog, search, playback, resume |
| Catch-up / TV archive | P1 | Not implemented | Provider-supported archive lookup and seek |
| Live pause and timeshift | P1 | Not implemented | Supported provider stream/AVPlay capabilities |
| Provider nPVR | P2 | Not implemented | Server recording where authorized and supported |
| Remote D-pad/OK/Return | P0 | Basic spatial navigation | Full remote test matrix and media keys |
| Favorites / recent / last channel | P1 | Not implemented | Persistent per-profile state |
| Parental PIN / category lock | P1 | Not implemented | Lock, unlock and session reset |
| Subtitle/audio/aspect ratio | P1 | Not implemented | Supported AVPlay track and display controls |
| Error recovery / network diagnostics | P0 | Minimal unsupported notice | Offline, timeout, expired token, buffering, retry |
| Pairing and settings via phone | P2 | Not implemented | Secure, opt-in companion configuration |
| Samsung signed WGT | P0 | Source ZIP only | Tizen Studio packaging and Samsung certificate |
| LG / Android / Fire TV | P2 | LG source prototype; Android profile manager | Native playback tested on each platform |

## Build sequence
1. Complete mock-data TV shell with Live TV / Guide / Movies / Series / Settings screens, keyboard/remote focus and deterministic browser tests.
2. Add an authorized M3U playlist importer and EPG XMLTV parser (size limits, no secrets in logs).
3. Wire Samsung AVPlay to authorized stream URLs; verify lifecycle and media controls in emulator/device.
4. Integrate documented provider portal APIs with authentication, channel, guide, VOD and archive endpoints.
5. Add security, performance, network recovery, parental PIN, favorites and regression suites.
6. Package signed WGT using developer-owned Samsung TV certificate profile; test on hardware.

## Provider inputs needed
Official API documentation, permission to use a third-party client, sandbox credentials, stream URL formats, EPG and VOD schemas, DRM and CORS rules. A reseller panel hostname or MAC alone is not sufficient.

## Platform limitations
Smart STB+ documentation describes Samsung 2020+ support; older Samsung models may require a different implementation. IPTV TORONTO compatibility must be established with real testing, not assumed from Smart STB compatibility.
