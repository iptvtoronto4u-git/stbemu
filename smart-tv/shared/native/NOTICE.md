# Native HTTP worker notices

This folder contains generated Emscripten JavaScript and WebAssembly built from
`smart-tv/native/portal-http.c` with Samsung Emscripten SDK 1.39.4.7.
It includes cURL 7.68.0 and OpenSSL 1.1.1d. Their license texts are in `licenses/`.
Emscripten runtime licensing is included there as well.
The embedded CA trust store comes from https://curl.se/ca/cacert.pem (Mozilla
CA certificates, collected by the cURL project). Refresh and review the trust
store and the pinned native dependencies before public distribution.

Tizen Sockets runs in a dedicated worker. No PC relay is selected by the app.
TLS certificate and hostname verification remain enabled for HTTPS portals.
HTTP portals do not encrypt account or stream traffic.
