# Samsung build and provider testing

See [UPDATE-0.2.md](UPDATE-0.2.md) for the current build/install command, test
coverage and known limitations. See [STALKER_INTEGRATION.md](STALKER_INTEGRATION.md)
for the direct on-TV authentication transport.

Use Tizen Studio TV Extension and a local Samsung author/distributor certificate
that authorizes the TV's DUID. Keep certificates and passwords outside the repo.
Enable Developer Mode, allow the PC and connect the TV through SDB. The build
script prints the signed WGT path and optionally installs and launches it.

Before a public release, verify remote navigation and IME entry, saved-profile
startup, failure recovery, wake-from-sleep, live playback and channel changes,
programme data, provider-dependent movies/series, and unsupported-stream errors
on each target TV. Browser mocks cannot exercise Samsung AVPlay or Tizen Sockets.
Obtain provider-supported account/device details where a portal requires them.