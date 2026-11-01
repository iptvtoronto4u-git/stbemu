# IPTV Toronto

Native Android TV / Fire TV development project in `app/`: Kotlin, Compose for TV, Stalker portal transport, secure profiles, local favourites/progress and Media3 playback. No provider, MAC, channel list or sample programming is bundled.

See [Android architecture, build instructions, test plan, visual QA and incomplete requirements](docs/ANDROID_TV.md). This is a development build with outstanding production requirements, not a completed store release.

```text
./gradlew testDebugUnitTest lintDebug assembleDebug assembleRelease bundleRelease
```

The universal debug APK is installable for testing. Release APK/AAB require owner signing configuration before distribution. The Android workflow uploads build artifacts and reports; check its actual run result before using them.

The separate Samsung Tizen/webOS work remains in `smart-tv/`.
