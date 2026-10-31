# StbEmu Reference Audit (2026-10-31)

Upstream organization: https://github.com/stbemu

Verified upstream repositories:
- https://github.com/stbemu/docs — official StbEmu documentation website (Docusaurus/TypeScript), not Android emulator source.
- https://github.com/stbemu/stalker — demo Stalker portal for StbEmu, not Android app source.
- https://github.com/stbemu/stbemu.github.io — informational website assets, not Android app source.

No upstream Android Gradle project, AndroidManifest.xml, or emulator/player implementation was found in the inspected repository roots. Do not assume these repositories contain a cloneable app.

Relevant upstream specification:
https://github.com/stbemu/docs/blob/main/docs/settings/profiles.md

Features to implement independently in Personal STB:
1. Preserve multi-profile add/edit/remove capability and last-selected profile.
2. Add configurable portal URL schemes with explicit user confirmation for insecure HTTP.
3. Add profile-specific STB identity and device parameters: MAC, model, serial, device ID, user agent, and resolution.
4. Implement portal connectivity through documented/authenticated interfaces against authorized services only; avoid copying closed-source code or defeating provider access controls.
5. Add playback using an independently licensed Android media library for authorized streams.
6. Add Android TV/Fire TV remote key mapping and focus/navigation.
7. Add automated tests: profile validation, persistence, slow/unavailable portals, invalid credentials, connectivity recovery, background/foreground lifecycle, and build checks.
8. Audit upstream licenses prior to copying any code or assets. No upstream code has been imported in this audit.

Current Personal STB APK is a profile manager and does not yet implement portal authentication or playback.
