# Samsung Smart TV compatibility strategy

Goal: maximize support for Samsung **Tizen** TVs, not promise every Samsung TV ever sold.

## Target
- Baseline Tizen TV web app with declared required_version 2.3 for broad legacy testing. This declaration is **not** proof of compatibility on every firmware or year.
- Avoid framework dependencies, optional modern JavaScript syntax, heavy assets, autoplay assumptions and mandatory advanced APIs.
- Remote: arrow key spatial focus, Enter via native button click, Tizen Return key (10009), Escape/Back.
- Screen sizes: responsive layout and high contrast for 720p/1080p/4K displays.
- Media: choose native Tizen AVPlay or HTML5 player based on capability testing. Neither is implemented yet.
- Network: explicit opt-in for HTTP endpoints; secure token handling and approved portal APIs remain future work.

## Exclusions / caveats
- Pre-Tizen Samsung Orsay TVs cannot use a Tizen WGT and need a separate legacy implementation, where deployment is possible.
- A valid Samsung certificate and Tizen tooling are required for signing and installing WGT.
- Device/firmware, codec, DRM and portal compatibility require real-device tests.
- MAG device identity cannot simply be spoofed by setting a form field; use provider-approved authentication.
- No channel retrieval, portal login or playback currently implemented.

## Test matrix (not yet executed)
- Early Tizen TV (2015–2017): startup, keyboard handling, storage, rendering
- Mid-generation (2018–2021): D-pad, focus, lifecycle, network loss
- Recent (2022+): D-pad, profile storage, performance, display scaling
- Model-specific tests: TV app install, remote Return, resume, low memory, HTTPS/HTTP warnings

GitHub Actions currently validates source and creates staging ZIPs, not signed WGT binaries.
