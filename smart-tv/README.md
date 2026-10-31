# IPTV TORONTO Smart TV workspace

## Platforms
- Android / Fire TV: existing Kotlin Android project at repository root; GitHub Actions produces a debug APK.
- Samsung Tizen: `smart-tv/samsung/config.xml` plus shared web files, packaged as a Tizen TV widget (.wgt) using Samsung Tizen Studio with a valid certificate.
- LG webOS: `smart-tv/lg/appinfo.json` plus shared web files, packaged as .ipk using LG webOS TV CLI (ares-package).

## Current scope
This is a TV-remote-friendly **profile manager prototype** only. It stores portal name, HTTP(S) URL and registered MAC locally. It does **not** authenticate to a Stalker/MAG portal, fetch channels, or play video. It does not impersonate a hardware device. Never distribute it as a working IPTV player.

## Build locally
For Samsung, run from the repository root in PowerShell:

```powershell
.\smart-tv\samsung\build-and-install.ps1 -CertificateProfile IPTV_TORONTO_TV -DeviceSerial 192.168.68.56:26101 -Launch
```

The script stages all shared runtime files, builds and signs locally using the existing Tizen certificate profile, then installs and optionally launches. It also supports the extracted Samsung source ZIP, where assets sit beside the script. No certificate passwords should be added to this script or shared in chat. If Tizen needs credentials, unlock/configure the profile locally in Samsung Certificate Manager. The distributor certificate must authorize your own TV DUID. If installation permission is missing, run `C:\tizen-studio\tools\ide\bin\tizen.bat install-permit -s 192.168.68.56:26101` locally. Substitute your own profile and TV serial when needed.

Builds are retained in `smart-tv/samsung/build/<unique-id>/output/IPTV-TORONTO.wgt`. Keep the WGT basename free of spaces for the Samsung remote installer. The package ID is the 10-character `IToronto01`; the application ID is `IToronto01.IPTVToronto`. Preserve these IDs for subsequent updates of this prototype. GitHub staging ZIPs are unsigned source packages, not installable WGT files.

For LG: copy the same three shared files into `smart-tv/lg/`, then run `ares-package smart-tv/lg` with the LG webOS TV CLI. Developer-mode installation requires an LG developer account/device setup.

For Android/Fire TV: run the existing GitHub Actions Android workflow. Fire OS device compatibility and remote navigation still require device testing.

## Security and next steps
- Profiles are stored in localStorage on webOS/Tizen and SharedPreferences on Android; do not store passwords or session tokens in these plaintext stores.
- Confirm supported portal API, authentication and rights with upstream New4K provider. No protocol endpoint has been verified.
- Implement authorization-aware Stalker portal client only from documented/approved interfaces, add secure credential storage and a licensed streaming engine per platform.
- Add platform-specific remote key handling, playback lifecycle, offline states and real-device tests.
- Samsung .wgt requires a signing certificate; LG .ipk requires the webOS packaging tool. CI below produces **unsigned staging ZIPs**, not installable store packages.

See [Stalker integration and Samsung update](STALKER_INTEGRATION.md) for the configurable adapter, runtime limitations and Q60D update steps.
