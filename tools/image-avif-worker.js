import createEncoder from './vendor/avif/avif_enc.js';
import { defaultOptions } from './vendor/avif/meta.js';

// One worker per upload keeps encoding off the UI thread and releases WASM memory afterwards.
self.onmessage = async ({ data: { pixels, width, height } }) => {
  try {
    const encoder = await createEncoder();
    const encoded = encoder.encode(new Uint8Array(pixels.buffer, pixels.byteOffset, pixels.byteLength), width, height, {
      ...defaultOptions,
      quality: 82,
      qualityAlpha: 100,
      subsample: 3,
      speed: 6
    });
    if (!encoded?.length) throw new Error('AVIF 转换失败，请重新导出图片');
    const buffer = encoded.slice().buffer;
    self.postMessage({ buffer }, [buffer]);
  } catch (error) {
    self.postMessage({ error: error.message || 'AVIF 转换失败，请重试' });
  }
};
