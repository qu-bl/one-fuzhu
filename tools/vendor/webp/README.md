# WebP upload fallback encoder

Vendored unmodified from `@jsquash/webp` 1.5.0. See LICENSE (Apache-2.0)
and LICENSE.codec.md (libwebp's BSD license).

Source: https://github.com/jamsinclair/jSquash/tree/main/packages/webp
Package: https://registry.npmjs.org/@jsquash/webp/-/webp-1.5.0.tgz

The baseline, non-SIMD WASM encoder is loaded only by the admin upload worker
when native canvas WebP encoding is unavailable. It needs no external image
service and is never loaded by the public website.
