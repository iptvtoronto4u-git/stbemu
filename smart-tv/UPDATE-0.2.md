# TV update 0.2

The profile list and form share one screen. Selecting a profile fills the form;
Save and open Live TV persists the changes and connects immediately. Duplicate
and delete act on the selected profile. There is no separate editing route.

At launch, the active saved profile connects behind a progress indicator. A
successful connection opens Live TV. Missing profiles or connection failures
show the same profile form, retaining saved details. Cancelling startup also
opens that form. Returning from TV suspension reconnects the previous profile.

## Build and install

Run `smart-tv/samsung/build-and-install.ps1 -CertificateProfile IPTV_TORONTO_TV
-DeviceSerial 192.168.68.56:26101 -Launch` from PowerShell. Keep the command on
one line. The script stages all interface assets and the direct native worker,
signs locally, and prints the WGT location. It does not package a helper key.
The TV must be awake, on the same network, with Developer Mode enabled and
the PC allowed. Exit the currently running app before launching the update.

## Verification and remaining checks

Local browser coverage includes profile creation/editing/duplication/deletion,
saved-profile startup and failure recovery, progress, preview/fullscreen,
favorites, sorting, movie playback, series next episode, Home, and account
settings. Provider, profile validation, AVPlay lifecycle and diagnostic unit
checks also pass. Browser tests simulate the portal and player; they do not
prove provider compatibility or real stream playback.

Direct native authentication, categories, channels and stream-link resolution
were previously verified on the Q60D with the PC helper stopped. The complete
0.2 interface still needs a fresh installation and remote-control/playback
check on the physical TV. Other portal implementations and older TVs have
not been certified. Some optional settings and visual details remain less
complete than the supplied mockups. English/French coverage is partial.

The native worker uses Samsung's Emscripten SDK 1.39.4.7 and its pinned cURL
and OpenSSL ports. Review those dependencies before public distribution.
The original C source and a configurable rebuild script are in `smart-tv/native`.
Pass the extracted Samsung SDK directory and a trusted PEM CA bundle to
`build.ps1`. SDK downloads and account credentials are excluded from source.

The skyline is generated brand scenery; it is not a bundled programme or
stream. The header lockup is a locally drawn approximation of the supplied
logo. Replace it with approved final brand artwork before release.
