# Native Android verification — November 1, 2026

This report describes the local development build, not a production certification. The full specification is not complete; see ANDROID_TV.md for the detailed outstanding requirements and screen-by-screen deviations.

## Completed checks

- Gradle: `testDebugUnitTest lintDebug assembleDebug assembleRelease bundleRelease connectedDebugAndroidTest` completed successfully.
- Unit tests: 9 passed, 0 failures (5 domain/rules tests, 4 MockWebServer integration tests).
- Android TV API 30 x86 emulator: 2 instrumentation tests passed, 0 failures. These cover D-pad focus movement and actual activity startup, first-run notice, portal setup and D-pad OK activation of Home.
- Android lint: 0 errors, 48 warnings. Warnings include deliberately pinned older dependencies for API 22, cleartext HTTP support, resource/style recommendations and build-tool modernization suggestions. This is not a warning-free release.
- Debug APK installed in the emulator. Cold launches and screen review were performed. A startup navigation race found during review was fixed and covered by the regression test.
- APK metadata reports package `com.iptvtoronto.tv`, minSdk 22, target/compile SDK 36, both standard and Leanback launcher entries, and ARMv7/ARM64/x86/x86_64 native code.
- Debug APK signature verification passed. The release APK and AAB are unsigned. Production signing credentials were not created or requested.
- The complete native Android text source and file tree are delivered separately, with binary font and wrapper in the source ZIP.

## Not verified

No provider endpoint or real MAC was used. Actual portal compatibility, live preview/playback, VOD/series integration, subscription expiry behaviour and real stream/codec support remain unverified. MockWebServer fixtures are synthetic tests, never bundled programming.

No physical Fire TV, ARMv7/API22 device, 4K TV or phone/tablet was tested. API 22 manifest compatibility does not prove Fire OS 5 runtime compatibility. The Keystore API22 branch and variable font rendering on older devices require physical/emulator testing.

The three-second startup target is not achieved or certified: observed debug emulator launches ranged from roughly 4–11 seconds under concurrent build/emulator load. A controlled release benchmark and a custom baseline profile remain required.

The reference images were inspected, but the UI uses the permitted vector/gradient brand fallbacks. Empty-state screenshots demonstrate the implemented screens; they do not demonstrate populated portal content or exact visual parity. A full-screen player image cannot be truthfully captured without an authorized playable stream.

## Artifact roles

- `IPTV-Toronto-debug.apk`: universal, debug signed, installable for testing.
- `IPTV-Toronto-release-unsigned.apk`: R8-minified unsigned release APK; sign before installation.
- `IPTV-Toronto-release-unsigned.aab`: unsigned store bundle; sign and complete release work before store upload.
- `IPTV-Toronto-Android-source.zip`: runnable native source, wrapper, font/license, tests, workflow and documentation.
- `FULL-SOURCE.md`: complete text source, each file in its own labeled code block.
- `PROJECT-TREE.txt`: complete native project file list.

Build logs, lint results, unit/instrumentation XML and SHA-256 hashes accompany the delivery. Do not infer a successful GitHub Actions build from the local build result; inspect the actual linked run.
