/* Shared data contract for external links and official video embeds. */
(function (root) {
  // Uploaded AVIF assets always have a same-name WebP companion. Do not guess
  // companion URLs for externally hosted or manually embedded images.
  function imageSources(value) {
    const primary = String(value || '');
    let fallback = '';
    if (/\.avif(?:[?#]|$)/i.test(primary)) {
      try {
        const base = globalThis.location?.href || 'https://qu-bl.github.io/one-fuzhu/site/';
        const url = new URL(primary, base);
        if ((url.origin === new URL(base).origin || url.origin === 'https://qu-bl.github.io')
          && /\/site\/assets\/[^/]+\.avif$/i.test(url.pathname)) {
          fallback = primary.replace(/\.avif(?=[?#]|$)/i, '.webp');
        }
      } catch {}
    }
    return { primary, fallback };
  }
  function imagePicture(image, value) {
    const { primary, fallback } = imageSources(value);
    if (!fallback) { image.src = primary; return image; }
    const picture = document.createElement('picture');
    picture.className = 'image-picture';
    const source = document.createElement('source');
    source.type = 'image/avif'; source.srcset = primary;
    // Also recover if a browser advertises AVIF but fails to decode this image.
    image.addEventListener('error', event => {
      if (!source.parentNode || image.currentSrc === new URL(fallback, document.baseURI).href) return;
      event.stopImmediatePropagation();
      source.remove(); image.src = fallback;
    }, true);
    image.parentNode?.replaceChild(picture, image);
    picture.append(source, image);
    image.src = fallback;
    return picture;
  }
  function webUrl(value) {
    try {
      const url = new URL(value);
      return ['https:', 'http:'].includes(url.protocol) && !url.username && !url.password ? url.href : null;
    } catch { return null; }
  }
  function videoSource(video, { inApp = false } = {}) {
    if (!video || typeof video.id !== 'string') return null;
    const id = video.id;
    let embed, href;
    if (video.platform === 'youtube' && /^[A-Za-z0-9_-]{11}$/.test(id)) {
      embed = `https://www.youtube.com/embed/${id}?autoplay=0&playsinline=1`;
      href = `https://www.youtube.com/watch?v=${id}`;
    } else if (video.platform === 'bilibili' && /^BV[A-Za-z0-9]{10}$/.test(id)) {
      embed = `https://player.bilibili.com/player.html?isOutside=true&bvid=${id}&p=1&autoplay=0&danmaku=0`;
      href = `https://www.bilibili.com/video/${id}/`;
    } else if (video.platform === 'douyin' && /^\d{10,25}$/.test(id)) {
      embed = `https://open.douyin.com/player/video?vid=${id}&autoplay=0`;
      href = `https://www.douyin.com/video/${id}`;
    } else return null;
    const ratio = typeof video.aspectRatio === 'number' && video.aspectRatio >= .4 && video.aspectRatio <= 2.4 ? video.aspectRatio : 16 / 9;
    return {embed: inApp && video.platform !== "bilibili" ? null : embed, href, ratio, platform: video.platform};
  }
  function accessAction(item, { copyLinks = false } = {}) {
    const value = item.url || item.value;
    // 是否开放只看显式的 copyable:false，不再靠「值里含待发布/待替换」这类魔法词——
    // 那种写法在管理台里完全看不出来，改了字却不知道按钮为什么是灰的。
    if (item.copyable === false || typeof value !== 'string' || !value.trim()) return {type:'unavailable'};
    const href = webUrl(value);
    // 平台是 QQ 一定是复制（群号）。其余按值的形态推断，不再需要单独的 action 字段。
    if (item.platform === 'qq') return {type:'copy', value};
    if (href) return copyLinks ? {type:'copy', value:href} : {type:'link', href};
    if (/^[a-z][a-z\d+.-]*:/i.test(value)) return {type:'unavailable'};
    return {type:'copy', value};
  }
  root.SiteMedia = {webUrl, videoSource, accessAction, imageSources, imagePicture};
})(globalThis);
