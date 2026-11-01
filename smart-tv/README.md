# IPTV TORONTO Smart TV

Samsung Tizen IPTV client with a unified multi-profile form, saved-profile startup
connection and progress, live channel browsing, AVPlay playback, favourites,
programme guide, and provider-dependent movie/series screens.

See [the 0.2 update notes](UPDATE-0.2.md) for installation, verified behaviour and
remaining physical-TV checks, and [Stalker integration](STALKER_INTEGRATION.md)
for authentication details. The app includes no subscription, channels or streams.

Samsung builds use the existing local Tizen certificate. Run:

```powershell
.\smart-tv\samsung\build-and-install.ps1 -CertificateProfile IPTV_TORONTO_TV -DeviceSerial 192.168.68.56:26101 -Launch
```

The direct native transport was tested on the Q60D. Browser/XHR fallback depends
on the provider's cookie/CORS policies. Other TVs, portal variants, codecs and DRM
services require their own compatibility testing. The LG packaging manifest is
retained, but the Samsung native transport does not establish webOS compatibility.

No PC helper or additional server is required on the tested Samsung native path.
The old `relay/` folder is a retired diagnostic experiment, excluded from the app.
Do not package its private configuration or commit account details/certificates.