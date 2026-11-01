# Authorized Stalker integration

Users enter Profile name, Portal URL and registered MAC on one shared profile
screen. Selecting a saved profile fills that form. Saving persists it and opens
Live TV after connecting. Startup tries the active saved profile behind progress;
missing profiles and failed connections return to the same form.

The provider initializes `stb/handshake` followed by basic `stb/get_profile`, then
loads categories/channels and resolves playback links. Optional portal APIs supply
EPG, favourites, account information, movies and series. Support depends on each
portal. Defaults do not claim MAG firmware. Advanced identity/header overrides
require provider-approved values; the client does not bypass authorization or DRM.

Host-only portal URLs default to `stalker_portal/server/load.php`; portal base paths
use `server/load.php` beneath that base. A bounded handshake fallback handles
missing/unsupported endpoint responses. The successful endpoint is cached locally.
The token stays in memory, is cleared on logout, and is never put in profile storage.
Resolved playback URLs are not persisted. Error messages omit raw portal payloads.

Samsung browser JavaScript cannot set the registered MAC Cookie header. On supported
Tizen TVs the bundled worker uses Samsung Tizen Sockets with native cURL instead.
Direct authentication, categories, channel retrieval and stream-link resolution were
verified on a Q60D with the PC helper stopped. Browser transport remains a fallback
for compatible services. No helper endpoint or pairing key is packaged.

HTTPS verifies certificates and hostnames using the embedded CA store. HTTP portals
send details unencrypted. Redirects are disabled in the native client. Requests have
bounded timeouts and response size. Review pinned SDK dependencies before release.

See [UPDATE-0.2.md](UPDATE-0.2.md) for build and test status. Compatibility with other
portal implementations, device-bound authentication and protected streams is not
assumed. The full 0.2 interface still needs a fresh physical-TV installation check.