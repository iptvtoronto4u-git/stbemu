# IPTV Toronto — native Android TV / Fire TV

This is an original Kotlin/Compose implementation. The Android application is separate from the Samsung Tizen app in `smart-tv/`. It contains no portal, registered MAC, channels, playlists, demo streams or third-party programming. Enter only provider-issued details you are authorized to use. No provider was contacted during development.

## Architecture and assumptions

- Package: `com.iptvtoronto.tv` (still subject to owner confirmation before release).
- Compose Navigation and TV Material controls; ordinary Compose lazy lists supply virtualization. TV Foundation is included, but its deprecated TV lazy-list APIs are not used.
- MVVM with unidirectional StateFlow, Koin dependencies, repository, OkHttp/Moshi portal transport.
- Room stores profile labels, local favourites and progress. The secure vault stores portal details, MAC, credentials and advanced identity fields. API 23+ uses Keystore-backed EncryptedSharedPreferences; API 22 uses a Keystore RSA-wrapped AES-GCM key. Backups are disabled. Secure-storage failures are surfaced rather than silently saving plaintext.
- One Media3 ExoPlayer instance serves preview and full-screen playback; it is released on stop. HLS, DASH and progressive streams use Media3. Device codecs determine supported formats. No GMS/Firebase or analytics SDK is used.
- Explicitly pinned dependencies retain API 22 support. Compile/target API 36, AGP 8.13.2, Gradle 8.13, Java 17 bytecode. No claim of testing every Fire OS version is made.
- Portal paths are detected from the supplied URL. Requests carry the user-entered MAC cookie, bearer token, language/timezone and model header. The default User-Agent identifies this app; a provider-supplied custom value is editable. Identity values are editable deterministic derivations, not an assertion that every provider accepts one universal MAG identity formula.
- Cross-origin portal redirects are rejected to avoid leaking authentication. CDN streams receive the resolved URL and client User-Agent/language, without portal bearer tokens or cookies. A provider requiring additional playback headers will need an explicit supported integration.

## Implemented source

Home, Live TV, Movies, Series, title details, portal setup, settings, profile switching, first-run notice and exit confirmation are present. The app starts without a profile and never substitutes sample programming. Catalogs and artwork come from the configured portal.

Live TV includes categories, local favourites, focus dwell preview, a time-scaled two-hour guide window and a current-time line. The channel list is lazy; EPG requests are bounded to three concurrent loads with a 200-channel in-memory cap. Provider data must contain usable epoch times for correct guide geometry.

The player includes channel zapping, media keys, Menu, an on-screen number pad, channel list, audio/subtitle/quality track selection, aspect-ratio modes, favourites and bounded create-link retry. VOD progress is stored locally. Series supports the ordered-list season/episode forms handled by the client and autoplay within the loaded season. Portal implementations differ; these flows have not been validated against a live service.

Portal setup supports multiple profiles, connection testing, registered MAC masking, editable advanced identity/headers/language/timezone/timeout and a remote keyboard fallback. No MAC is read from the device, generated to claim a subscription, brute-forced or bundled.

Settings currently implement clock format, reduced motion, buffer preset, retry count, resume last live channel, parental PIN, adult-flag filtering, Settings PIN gate, device/about/privacy information and cache clearing. Track and fit choices are available in the player.

## Incomplete requirements — release blockers

This is a development build, not a completed production/store release. These specification items remain:

- Exact visual fidelity to all seven references, final skyline hero/background art, final white horizontal lockup, production 320×180 raster TV banner, adaptive icon refinement. The supplied full-screen mockups contain placeholder programming and are never bundled as UI backgrounds.
- Full focus restoration per screen/row, exhaustive remote repeat/gamepad behaviour, debounced hero backdrop crossfades, focus glow, loading skeletons and complete touch/phone layout QA.
- Guide time-window paging, selected-program-specific description, fully synchronized horizontal navigation and preview teardown on every individual control blur; current preview stops when leaving the guide.
- Persistent channel/EPG cache and LRU eviction. Room has a cache schema but transport does not yet populate it. EPG cache expiry/refresh is not complete.
- `get_modules`, server favourites (`set_fav/get_fav_ids`), simple-data-table EPG, configurable heartbeat events, expanded configurable profile parameters and provider-specific module negotiation.
- Some providers' alternate episode structures, pagination beyond the first season/episode page, autoplay across seasons, cast/director metadata, full title/episode search and richer series hero layout.
- Persisted player fit/quality and language preferences, subtitle size/color/background, passthrough controls, frame-rate matching, explicit software-decoder selection, quality/buffer UI parity and DRM entitlement integration. Optional libVLC/RTSP are not included.
- Per-profile invalid-certificate mode is intentionally unimplemented; system TLS validation always remains enabled.
- Full French-Canada localization (only first-run/setup/empty resources are translated), UI language picker, font-size/grid-density settings.
- Genre/channel locks, PIN rate limiting and hardened parental-control recovery.
- Profile import/export, full reset workflow, hosted privacy-policy URL and complete dependency license display.
- Custom measured startup baseline profile, cold-start <3-second measurement, 1 GB Fire Stick profiling, codec/stream-format matrix, physical 32/64-bit Fire TV and Android TV testing, phone/tablet/mouse checks.
- Production signing and store submission. Release artifacts are unsigned unless owner signing environment variables are supplied.

## Build and run

Install Android Studio with SDK Platform 36, Build Tools 35.0.0 and platform-tools. Use JDK 17 or a supported newer JDK. Open the repository root, not `smart-tv/`. Set `ANDROID_HOME` or a local `sdk.dir` in ignored `local.properties`.

```powershell
.\gradlew.bat testDebugUnitTest lintDebug assembleDebug
.\gradlew.bat assembleRelease bundleRelease
.\gradlew.bat connectedDebugAndroidTest
```

On macOS/Linux use `./gradlew`. The universal debug APK is `app/build/outputs/apk/debug/app-debug.apk`. Release APK and AAB are under `app/build/outputs/apk/release/` and `app/build/outputs/bundle/release/`. The application supports ARMv7/ARM64 and emulator x86/x86_64; it has no ABI split, so the APK is universal.

Create a private release key using interactive password prompts:

```text
keytool -genkeypair -v -keystore iptv-toronto-release.jks -alias iptv-toronto -keyalg RSA -keysize 3072 -validity 10000
```

Set `IPTV_KEYSTORE` to that keystore's absolute path and securely provide `IPTV_STORE_PASSWORD`, `IPTV_KEY_ALIAS`, `IPTV_KEY_PASSWORD` in your build environment. Rebuild release. Do not commit the key, passwords or local SDK files. Back up the keystore privately. A debug signing key is for testing; switching signing keys generally requires uninstalling the prior test app.

```text
adb install -r app/build/outputs/apk/debug/app-debug.apk
adb shell am start -n com.iptvtoronto.tv/.MainActivity
adb connect TV_IP:5555
adb install -r app/build/outputs/apk/debug/app-debug.apk
```

For Fire TV, enable Developer Options/ADB debugging and authorize the computer on the TV. Enable Install unknown apps for the installer/Downloader when available. For Downloader, host the APK at a private URL you control, enter that URL and follow the installer. No public download URL is created by this project. Fire TV menus vary by OS/device.

For an emulator, create an Android TV AVD (API 30 is used for development verification), boot it, then install the APK or run `connectedDebugAndroidTest`. Emulator success does not establish Fire OS 5 compatibility.

## Test plan

Automated unit tests cover portal URL candidates, command normalization, invalid stream schemes, MAC validation/redaction, deterministic IDs and EPG clipping. MockWebServer covers auth headers/cookies, numeric JSON fields, token renewal, CDN credential isolation and malformed JSON errors. Compose instrumentation checks D-pad focus moving between TV buttons and real-activity startup, notice dismissal, portal navigation and Home navigation.

Manual acceptance still required:

- D-pad only: first-run notice, all five tabs, profile switch/edit/test/save/delete, keyboard fallback, all dialogs and Back/exit.
- Fire remote without number/color keys: Menu, long OK favourites, number pad, channel list and track menus.
- Authorized portal: handshake/re-auth, expired subscription, unauthorized MAC, VOD search/pages, season/episode variants, EPG timestamps/timezone.
- Playback: TS, HLS, DASH, MP4/MKV as permitted; failed link refresh, seeking only when supported, audio focus, background/resume, connection loss/recovery, track switches.
- Real ARMv7/API22 and ARM64 devices: install, encrypted storage, startup, RAM use, decoder pressure, 720p/1080p/4K and TV safe areas.
- PIN changes and Settings gate, adult flags, process death, profile isolation, touch/mouse and phone/tablet stability.

## Known limitations and policy

No DRM circumvention, geographic bypass, firmware extraction or proprietary implementation is included. Hardware codecs, DRM support and stream quirks vary by device. Unsupported DRM streams will fail. HTTP portals are allowed by the network security configuration and transmit details without TLS; use HTTPS when the provider supports it. Invalid certificates are never globally trusted.

Provider tokens/MAC/passwords are not logged by application code. A provider may reject the default client identification or require custom fields; obtain those from the provider instead of guessing credentials. This app does not validate a service's content rights.

## Visual QA against supplied references

This table is a source/layout review. Screenshots and measured device results are recorded separately in the delivery verification report. No exact visual match is claimed.

| Reference | Implemented layout/color/focus | Deviations requiring polish |
|---|---|---|
| 01 Home | Navy/blue fallback, cyan overline, hero heading, Watch live/Open guide, progress and category cards; cyan focus ring | No standalone skyline asset; simplified hero/category art; row focus restoration pending |
| 02 Live guide | Categories, left description/right preview, lazy channel rows, proportional program cells, cyan now line | Two-hour fixed window; selected-cell metadata, horizontal paging and 5-row sizing need device QA |
| 03 Player | Full video, fading bottom controls, five actions, track menus, cyan progress | No Up Next thumbnail panel; live timeshift UI is simplified; fit modes need stream QA |
| 04 Movies | Heading, categories, search, featured title, lazy poster row | No debounced backdrop crossfade; poster sizing and metadata need provider/device QA |
| 05 Series | Series catalog, details, seasons, episode cards, progress, per-season autoplay | Hero fidelity, resume-button copy and alternate portal episode schemas not verified |
| 06 Setup | Profile list, editable form, Show/Hide MAC, test/save/status, advanced fields | Gradient replaces abstract wave artwork; TLS bypass absent; exact two-column geometry requires screenshot QA |
| 07 Settings | Left section menu/profile, right settings rows, blue selection/cyan focus | Only implemented options are shown; many advanced options remain incomplete; skyline/header and final typography need polish |

All primary buttons expose a visible cyan border and scale focus; Reduce motion disables the scale. Text and icons accompany selected states. No color-key-only action is required.

## Store checklists — not submitted

Google Play Android TV: confirm package, production signing/upload key, TV-compatible manifest and device catalog, final 320×180 banner, launcher/adaptive icons, 1920×1080 TV screenshots, privacy URL/Data safety declaration, content rating and TV quality review. Provide reviewer access using an authorized test service if required. Recheck current target-API/store policy before submission.

Amazon Appstore Fire TV: complete Fire OS 5–8 device testing, final Fire TV assets/screenshots, app description and legal/privacy disclosures, remote-only navigation and no GMS calls. Verify the currently accepted submission format with Amazon (the universal APK is the sideload target).

Both stores may scrutinize IPTV players. Explain clearly that no content is provided and that users supply authorized service details. Store approval is not guaranteed.
