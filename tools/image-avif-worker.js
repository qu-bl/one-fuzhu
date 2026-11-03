import { defaultOptions } from './vendor/avif/meta.js';

// One worker per upload keeps encoding off the UI thread and releases WASM memory afterwards.
self.onmessage = async ({ data: { task = 'encode', pixels, width, height, buffer: input } }) => {
  try {
    if (task === 'decode') {
      const { default: createDecoder } = await import('./vendor/avif/avif_dec.js');
      const decoder = await createDecoder();
      const decoded = decoder.decode(input, 8);
      if (!decoded?.width || !decoded?.height || decoded.width * decoded.height > 40000000) throw new Error('AVIF 图片尺寸无效或超过 4000 万像素');
      const pixels = decoded.data.slice().buffer;
      self.postMessage({ pixels, width: decoded.width, height: decoded.height }, [pixels]);
      return;
    }
    const { default: createEncoder } = await import('./vendor/avif/avif_enc.js');
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
