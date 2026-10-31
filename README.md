# Personal STB Multi-Profile Android

Initial Android project: locally saved editable profiles (name, HTTPS portal URL, MAC address), add/edit/delete. **This is a profile manager, not yet an STB emulator or IPTV player.** No credentials or provider endpoints are embedded.

## Build
GitHub Actions builds on pushes to main and on manual workflow dispatch. Download the **Personal-STB-debug-APK** artifact from the completed workflow run and unzip it to obtain app-debug.apk.

## Next milestones
Portal connectivity, device-specific MAC identity, remote/D-pad navigation, and authorized streaming compatibility require separate implementation and testing.
