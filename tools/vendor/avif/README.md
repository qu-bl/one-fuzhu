# AVIF upload codecs

Vendored from `@jsquash/avif` 2.1.1, Apache-2.0 (see LICENSE).
Source: https://github.com/jamsinclair/jSquash/tree/main/packages/avif
Package: https://registry.npmjs.org/@jsquash/avif/-/avif-2.1.1.tgz

The unmodified single-thread encoder, decoder, WASM binaries and default options
are loaded only by the admin upload worker as needed. The decoder is used when
the admin's browser cannot decode an AVIF upload natively. They are not loaded
by the public website.
No CDN or third-party image upload service is required.
