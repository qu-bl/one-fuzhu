/* Shared data contract for external links and official video embeds. */
(function (root) {
  function webUrl(value) {
    try {
      const url = new URL(value);
      return ['https:', 'http:'].includes(url.protocol) && !url.username && !url.password ? url.href : null;
    } catch { return null; }
  }
  function videoSource(video) {
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
    return {embed, href, ratio, platform: video.platform};
  }
  function accessAction(item) {
    const value = item.url || item.value;
    // 是否开放只看显式的 copyable:false，不再靠「值里含待发布/待替换」这类魔法词——
    // 那种写法在管理台里完全看不出来，改了字却不知道按钮为什么是灰的。
    if (item.copyable === false || typeof value !== 'string' || !value.trim()) return {type:'unavailable'};
    const href = webUrl(value);
    // 平台是 QQ 一定是复制（群号）。其余按值的形态推断，不再需要单独的 action 字段。
    if (item.platform === 'qq') return {type:'copy', value};
    if (href) return {type:'link', href};
    if (/^[a-z][a-z\d+.-]*:/i.test(value)) return {type:'unavailable'};
    return {type:'copy', value};
  }
  root.SiteMedia = {webUrl, videoSource, accessAction};
})(globalThis);
