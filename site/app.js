const activityTrack = document.querySelector("#activity-track");
const activityDots = document.querySelector("#activity-dots");
const activityCarousel = document.querySelector("#activity-carousel");
const activityStatus = document.querySelector("#activity-status");
const activityTemplate = document.querySelector("#activity-template");
const activityRiveCanvas = document.querySelector("#activity-rive-canvas");
const caseTemplate = document.querySelector("#case-template");
const caseGrid = document.querySelector("#case-grid");
const featuredBanners = document.querySelector("#featured-banners");
const categoryTabs = document.querySelector("#category-tabs");
const searchInput = document.querySelector("#case-search");
const platformButtons = document.querySelector("#platform-buttons");
const emptyState = document.querySelector("#empty-state");
const accessDialog = document.querySelector("#access-dialog");
const accessTitle = document.querySelector("#access-title");
const accessSummary = document.querySelector("#access-summary");
const accessMedia = document.querySelector("#access-media");
const accessItems = document.querySelector("#access-items");
const contactSection = document.querySelector("#contact");
const contactLabel = document.querySelector("#contact-label");
const contactTitle = document.querySelector("#contact-title");
const contactSummary = document.querySelector("#contact-summary");
const contactMethods = document.querySelector("#contact-methods");
const noticeDialog = document.querySelector("#notice-dialog");
const noticeMedia = document.querySelector("#notice-media");
const noticeActions = document.querySelector("#notice-actions");
const requestedPlatform = new URLSearchParams(window.location.search).get("appPlatform");
const appPlatform = ["Apple", "Android", "HarmonyOS"].includes(requestedPlatform)
  ? requestedPlatform
  : null;

// 站点在 content.json 缺少某些分区时（旧版 schemaVersion 1）回退到这些默认值，
// 保证只更新站点文件、不更新内容文件时页面仍然可用。
const HERO_DEFAULTS = {
  rive: {
    src: "./assets/hero-logo.riv",
    artboard: "Artboard",
    stateMachine: "主动画",
    autoplay: true,
    cycle: {
      input: "state",
      from: 0,
      to: 3,
      intervalMs: 8000,
    },
  },
  ariaLabel: "千机百变品牌互动动画",
};

const state = {
  activities: [],
  activityIndex: 0,
  cases: [],
  hero: null,
  contact: null,
  notice: null,
  category: new URLSearchParams(window.location.search).get("category") || "全部",
  platform: appPlatform || "全部平台",
  query: "",
  timer: null,
  paused: false,
  dialogTrigger: null,
  // 当前面板展示的是哪一张卡。重绘后要靠它把面板原样刷回来。
  dialogCardId: null,
  // 上一份内容，用来判断哪一块真的变了；以及上次的弹窗显示要求。
  source: null,
  noticeShown: undefined,
};

const featured = {
  index: 0,
  timer: null,
  paused: false,
  slides: [],
  dots: [],
  status: null,
  lastSwipe: 0,
};

const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
const cardObserver = !reduceMotion.matches && "IntersectionObserver" in window
  ? new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.dataset.visible = "true";
        cardObserver.unobserve(entry.target);
      });
    }, { threshold: 0.12, rootMargin: "72px 0px" })
  : null;

const PLATFORM_LABELS = {
  Apple: "苹果",
  Android: "安卓",
  HarmonyOS: "鸿蒙",
};

const PLATFORM_ICONS = {
  "全部平台": `<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="4" width="6" height="6" rx="2"></rect><rect x="14" y="4" width="6" height="6" rx="2"></rect><rect x="4" y="14" width="6" height="6" rx="2"></rect><rect x="14" y="14" width="6" height="6" rx="2"></rect></svg>`,
  Apple: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M16.9 12.9c0-2.2 1.8-3.3 1.9-3.4-1.1-1.5-2.7-1.7-3.3-1.7-1.4-.1-2.7.8-3.4.8-.7 0-1.8-.8-3-.8-1.5 0-3 .9-3.8 2.3-1.6 2.8-.4 6.9 1.1 9.1.8 1.1 1.7 2.4 2.9 2.3 1.2 0 1.6-.7 3.1-.7 1.4 0 1.9.7 3.1.7 1.3 0 2.1-1.1 2.8-2.2.9-1.3 1.3-2.6 1.3-2.7-.1 0-2.7-1-2.7-3.7zM14.6 6.3c.6-.8 1.1-2 1-3.1-1 .1-2.2.7-2.9 1.5-.6.7-1.1 1.9-1 3 1.1.1 2.2-.5 2.9-1.4z"></path></svg>`,
  Android: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7.1 8.2h9.8c1.1 0 2 .9 2 2v7.1c0 .6-.5 1.1-1.1 1.1h-1v2.1a1.2 1.2 0 0 1-2.4 0v-2.1H9.6v2.1a1.2 1.2 0 0 1-2.4 0v-2.1h-1c-.6 0-1.1-.5-1.1-1.1v-7.1c0-1.1.9-2 2-2z"></path><path d="M7.7 8.1a4.5 4.5 0 0 1 8.6 0M8.1 3.2l1.2 2M15.9 3.2l-1.2 2" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"></path><circle cx="9.2" cy="6.9" r=".7" fill="var(--icon-cutout, #fff)"></circle><circle cx="14.8" cy="6.9" r=".7" fill="var(--icon-cutout, #fff)"></circle></svg>`,
  HarmonyOS: `<span class="harmony-logo" aria-hidden="true"></span>`,
};

const ACCESS_META = {
  youtube: { label: "YouTube", icon: "./assets/platforms/youtube.svg" },
  bilibili: {
    label: "哔哩哔哩",
    icon: "./assets/platforms/bilibili.svg",
  },
  xiaohongshu: {
    label: "小红书",
    icon: "./assets/platforms/xiaohongshu.svg",
  },
  douyin: {
    label: "抖音",
    icon: "./assets/platforms/douyin.svg",
  },
  kdocs: {
    label: "金山文档",
    icon: "./assets/platforms/kdocs.svg",
  },
  qq: {
    label: "QQ",
    icon: "./assets/platforms/qq.svg",
  },
  github: {
    label: "GitHub",
    icon: "./assets/platforms/github.svg",
  },
};

function platformLabel(platform) {
  return platform === "全部平台" ? "全部平台" : PLATFORM_LABELS[platform] || platform;
}

function createPlatformIcon(platform, className = "") {
  const icon = document.createElement("span");
  icon.className = `platform-icon ${className}`.trim();
  icon.innerHTML = PLATFORM_ICONS[platform] || "";
  icon.title = platformLabel(platform);
  return icon;
}

function getAccess(item) {
  if (item.access && Array.isArray(item.access.items)) return item.access;
  return { items: [] };
}

function openAccessDialog(item, trigger) {
  if (!accessDialog.open) mountAccessDialog(item, trigger);
}

function closeAccessDialog() {
  if (!accessDialog.open || accessDialog.dataset.closing === "true") return;
  // 结束退场后真正关闭；close 事件里统一做内容清理、解锁滚动与焦点归还。
  const finish = () => {
    accessDialog.classList.remove("closing");
    delete accessDialog.dataset.closing;
    accessDialog.close();
  };
  if (reduceMotion.matches || !accessDialog.animate) { finish(); return; }
  accessDialog.dataset.closing = "true";
  // 反向缩回触发点，与打开动画镜像。
  const sourceBounds = state.dialogTrigger?.getBoundingClientRect();
  const target = accessDialog.getBoundingClientRect();
  const dx = sourceBounds ? sourceBounds.left + sourceBounds.width / 2 - (target.left + target.width / 2) : 0;
  const dy = sourceBounds ? sourceBounds.top + sourceBounds.height / 2 - (target.top + target.height / 2) : 24;
  const scale = sourceBounds ? Math.max(.25, Math.min(.8, sourceBounds.width / target.width)) : .88;
  accessDialog.classList.add("closing");
  const exit = accessDialog.animate([
    { opacity: 1, transform: "translate(0, 0) scale(1)" },
    { opacity: 0, transform: `translate(${dx}px, ${dy}px) scale(${scale})` }
  ], { duration: 240, easing: "cubic-bezier(.3, 0, .8, .15)" });
  exit.onfinish = finish;
  // 动画被主动取消（例如退场途中重开另一张卡）：只清理状态，不关闭弹窗。
  exit.oncancel = () => {
    accessDialog.classList.remove("closing");
    delete accessDialog.dataset.closing;
  };
}

async function copyAccessValue(value, label, button) {
  if (!await SiteLinks.copy(value, label)) return false;
  button.dataset.copied = "true";
  window.setTimeout(() => { delete button.dataset.copied; }, 2600);
  return true;
}

function createPlayerFrame(item, video) {
  const frame = document.createElement("iframe");
  frame.src = video.embed;
  frame.title = `${item.name || item.title}视频`;
  frame.allow = "fullscreen; encrypted-media; picture-in-picture";
  frame.allowFullscreen = true;
  frame.loading = "lazy";
  frame.referrerPolicy = "strict-origin-when-cross-origin";
  frame.setAttribute("sandbox", "allow-scripts allow-same-origin allow-presentation");
  return frame;
}

// 卡片媒体区。mode 决定这个位置上该出现什么：
//   "poster" —— 折叠状态：只铺封面。点整张卡是展开，不是在卡片里就地播放。
//   "player" —— 展开状态与弹窗：有视频就直接嵌播放器，没有就退回封面。
// 播放/暂停这些交给播放器自带的控件，网页不再自己叠一个播放按钮。
// 代价是第三方播放器会在展开或打开弹窗时立即加载（原来要等用户点一下），
// 在 WebView 里这意味着外部页面更早拿到一个 iframe。
function renderAccessMedia(item, accessMedia = document.querySelector("#access-media"), mode = "player") {
  accessMedia.replaceChildren();
  const video = SiteMedia.videoSource(item.video, { inApp: Boolean(appPlatform) });
  accessMedia.hidden = !video && !item.cover;
  accessMedia.style.aspectRatio = String(video?.ratio || 16 / 9);
  accessMedia.classList.toggle("access-media--portrait", Boolean(video && video.ratio < 1));

  accessMedia.classList.toggle("external-video", Boolean(video && !video.embed && mode !== "poster"));
  if (video && !video.embed && mode !== "poster") {
    accessMedia.style.aspectRatio = "auto";
    const button = document.createElement("button");
    button.type = "button";
    button.className = "banner-action";
    button.textContent = "复制视频网址，到浏览器打开";
    button.addEventListener("click", () => copyAccessValue(video.href, "视频网址", button));
    accessMedia.append(button);
    return;
  }
  if (video?.embed && mode !== "poster") {
    accessMedia.append(createPlayerFrame(item, video));
    return;
  }
  if (item.cover) {
    accessMedia.style.aspectRatio = "auto";
    const poster = document.createElement("img");
    poster.alt = item.coverAlt || `${item.name || item.title}封面`;
    accessMedia.append(SiteMedia.imagePicture(poster, item.cover));
    return;
  }
  // 走到这里说明是折叠状态且没有封面：这里没有可显示的东西，整块收起，
  // 别留一个空白框（有视频也不该在折叠时就嵌进去）。
  accessMedia.hidden = true;
}


function mountAccessDialog(item, trigger, options = {}) {
  if (!accessDialog || !accessItems) return;
  const access = getAccess(item);
  state.dialogTrigger = trigger;
  state.dialogCardId = item.id || null;
  const sourceBounds = trigger?.getBoundingClientRect();
  renderAccessMedia(item);

  // 弹窗不再有单独的面板标题/说明字段，直接用条目自身的名称与简介。
  accessTitle.textContent = item.name || item.title;
  accessSummary.textContent = item.summary || "";
  accessSummary.hidden = !accessSummary.textContent;
  accessItems.replaceChildren();

  renderAccessItems(item, accessItems);

  if (options.refresh) return;

  document.body.classList.add("dialog-open");
  if (accessDialog.open) {
    // 正在退场时用户又点了别的卡：取消退场动画，直接停在已换好的新内容上。
    if (accessDialog.dataset.closing === "true") {
      accessDialog.getAnimations?.().forEach((animation) => animation.cancel());
      accessDialog.classList.remove("closing");
      delete accessDialog.dataset.closing;
    }
    // 已经开着：内容已经在上面换好了，不用再 showModal 一次。
    return;
  }
  if (typeof accessDialog.showModal === "function") {
    accessDialog.showModal();
  } else {
    accessDialog.setAttribute("open", "");
  }
  accessDialog.scrollTop = 0;
  accessDialog.getAnimations?.().forEach(animation => animation.cancel());
  if (!reduceMotion.matches && accessDialog.animate) {
    const target = accessDialog.getBoundingClientRect();
    const dx = sourceBounds ? sourceBounds.left + sourceBounds.width / 2 - (target.left + target.width / 2) : 0;
    const dy = sourceBounds ? sourceBounds.top + sourceBounds.height / 2 - (target.top + target.height / 2) : 40;
    const scale = sourceBounds ? Math.max(.25, Math.min(.8, sourceBounds.width / target.width)) : .85;
    accessDialog.animate([
      { opacity: 0, transform: `translate(${dx}px, ${dy}px) scale(${scale})` },
      { opacity: 1, transform: 'translate(0, 0) scale(1)' }
    ], { duration: 480, easing: 'cubic-bezier(.16, 1, .3, 1)' });
  }
}

function renderAccessItems(item, accessItems) {
  const access = getAccess(item);
  // 外链小卡片完全来自条目自己的 access.items。以前只要填了视频就会在这里
  // 自动插一个对应平台的按钮，导致「没加过入口却多出一个」，视频和入口
  // 是两件事，不该互相牵动。
  const entries = [...access.items];
  entries.forEach((accessItem) => {
    const meta = ACCESS_META[accessItem.platform];
    if (!meta) return;
    const action = SiteMedia.accessAction(accessItem, { copyLinks: Boolean(appPlatform) });
    const copiesUrl = action.type === "copy" && Boolean(SiteMedia.webUrl(action.value));
    const option = document.createElement(action.type === "link" ? "a" : "button");
    const icon = document.createElement("span");
    const logo = document.createElement("img");
    const label = document.createElement("strong");

    option.className = "access-option";
    if (action.type === "link") {
      option.href = action.href;
      option.target = "_blank";
      option.rel = "noopener noreferrer";
    } else {
      option.type = "button";
      option.disabled = action.type === "unavailable";
    }
    option.dataset.platform = accessItem.platform;
    icon.className = "access-option-icon";
    logo.src = meta.icon;
    logo.alt = "";
    logo.decoding = "async";
    logo.setAttribute("aria-hidden", "true");
    icon.append(logo);
    label.textContent = `${accessItem.label || meta.label}${copiesUrl ? " · 复制网址" : ""}`;
    option.append(icon, label);
    if (action.type === "unavailable") {
      const status = document.createElement("small");
      status.textContent = "待发布";
      option.append(status);
    }
    if (action.type === "copy") {
      option.setAttribute("aria-label", `复制${accessItem.label || meta.label}${copiesUrl ? "网址" : ""}`);
      if (copiesUrl) option.title = "复制网址，到浏览器打开";
      option.addEventListener("click", () => copyAccessValue(action.value, accessItem.label || meta.label, option));
    } else if (action.type === "link") {
      option.setAttribute("aria-label", `前往${accessItem.label || meta.label}（新窗口）`);
    }
    accessItems.append(option);
  });

  accessItems.hidden = false;
  if (!entries.length) {
    const unavailable = document.createElement("p");
    unavailable.className = "access-unavailable";
    unavailable.textContent = "相关信息还在整理中。";
    accessItems.append(unavailable);
  }

}

async function loadJson(url) {
  const response = await fetch(url, { cache: "no-cache" });
  if (!response.ok) throw new Error(`无法读取 ${url}`);
  return response.json();
}

function renderActivities() {
  if (!activityTrack || !activityTemplate) return;
  activityTrack.replaceChildren();
  activityDots?.replaceChildren();

  state.activities.forEach((activity, index) => {
    const fragment = activityTemplate.content.cloneNode(true);
    const slide = fragment.querySelector(".activity-slide");
    const title = fragment.querySelector("h2");
    const summary = fragment.querySelector("p");
    const action = fragment.querySelector(".banner-action");

    slide.setAttribute("aria-label", `${index + 1} / ${state.activities.length}：${activity.title}`);
    slide.setAttribute("aria-roledescription", "幻灯片");
    title.textContent = activity.title;
    summary.textContent = activity.summary;
    // 按钮行为由数据自身推导，不再需要单独的 action 字段：
    // 有访问入口 → 打开信息面板；否则有按钮文字 → 跳转橱柜（按 category 筛选）；
    // 两者都没有 → 不显示按钮。
    if (getAccess(activity).items.length) {
      action.querySelector("span").textContent = activity.linkLabel || "获取信息";
      action.addEventListener("click", () => openAccessDialog(activity, action));
    } else if (activity.linkLabel) {
      action.querySelector("span").textContent = activity.linkLabel;
      action.addEventListener("click", async () => {
        await closeInformation();
        state.category = activity.category || "全部";
        state.platform = "全部平台";
        state.query = "";
        searchInput.value = "";
        renderFilters();
        renderCases();
        const showcase = document.querySelector("#showcase");
        showcase.scrollIntoView({ behavior: reduceMotion.matches ? "auto" : "smooth" });
        document.querySelector("#case-search").focus({ preventScroll: true });
      });
    } else {
      action.hidden = true;
    }
    activityTrack.append(fragment);

    if (activityDots) {
      const dot = document.createElement("button");
      dot.className = "activity-dot";
      dot.type = "button";
      const label = document.createElement("span");
      label.textContent = activity.label;
      dot.append(label);
      dot.setAttribute("aria-label", `显示活动：${activity.title}`);
      dot.addEventListener("click", () => setActivity(index, true));
      activityDots.append(dot);
    }
  });

  setActivity(0, false);
  scheduleCarousel();
}

// 顶部 Rive。管理台的实时预览会随每次输入重绘整页，而 Rive 实例很贵：
// 以前每重绘一次就新建一个实例、一个 ResizeObserver、一个 pagehide 监听，
// 旧的全都不回收，敲几下之后画布就卡到看不出响应。所以这里做了两件事：
// 配置没变就直接复用，配置变了先把旧的收干净再建。
let heroRiveInstance = null;
let heroRiveObserver = null;
let heroRiveKey = "";
let heroCycleTimer = null;

// 数据绑定输入轮换：每隔 intervalMs 把 input 的值在 from..to 之间循环一次。
// 只依赖 Rive 官方 ViewModel 实例 API（vmi.number(name).value）。
function startHeroCycle(rive, riveInstance) {
  stopHeroCycle();
  const cycle = rive.cycle;
  if (!cycle || !riveInstance?.viewModelInstance) return;
  const prop = riveInstance.viewModelInstance.number(cycle.input);
  if (!prop) return;
  const from = Number.isFinite(cycle.from) ? cycle.from : 0;
  const to = Number.isFinite(cycle.to) ? cycle.to : from;
  const intervalMs = Number.isFinite(cycle.intervalMs) && cycle.intervalMs > 0 ? cycle.intervalMs : 8000;
  let current = from;
  try { current = prop.value; } catch { /* 用 from 起步 */ }
  heroCycleTimer = window.setInterval(() => {
    current = current >= to ? from : current + 1;
    try { prop.value = current; } catch { /* 输入被外部清理时静默跳过 */ }
  }, intervalMs);
}

function stopHeroCycle() {
  if (heroCycleTimer !== null) {
    window.clearInterval(heroCycleTimer);
    heroCycleTimer = null;
  }
}

window.addEventListener("pagehide", () => {
  stopHeroCycle();
  heroRiveObserver?.disconnect();
  heroRiveInstance?.cleanup?.();
  heroRiveInstance = null;
  heroRiveKey = "";
});
window.addEventListener("pageshow", event => {
  if (event.persisted) initHeroRive();
});

function initHeroRive() {
  const hero = state.hero || HERO_DEFAULTS;
  const rive = hero.rive || HERO_DEFAULTS.rive;

  if (hero.ariaLabel) {
    document.querySelector('.information-rive-target')?.setAttribute('aria-label', `${hero.ariaLabel}，点击返回创意橱柜`);
  }

  if (!activityRiveCanvas || !window.rive?.Rive || !rive.src) return;

  // 决定实例长相的就是这几个值。它们没变，就没必要重建。
  const autoplay = rive.autoplay !== false && !reduceMotion.matches;
  const key = [rive.src, rive.artboard || "", rive.stateMachine || "", autoplay, JSON.stringify(rive.cycle || null)].join("|");
  if (heroRiveInstance && heroRiveKey === key) return;
  heroRiveKey = key;

  stopHeroCycle();
  heroRiveObserver?.disconnect();
  heroRiveObserver = null;
  heroRiveInstance?.cleanup?.();
  heroRiveInstance = null;

  const resize = () => {
    if (!activityRiveCanvas.closest('#rive-flight')) heroRiveInstance?.resizeDrawingSurfaceToCanvas();
  };
  const options = {
    src: rive.src,
    canvas: activityRiveCanvas,
    layout: new window.rive.Layout({ fit: window.rive.Fit.Contain, alignment: window.rive.Alignment.Center }),
    autoplay: autoplay,
    isTouchScrollEnabled: true,
    autoBind: true, // 官方推荐：自动绑定画板默认 ViewModel，之后可用 viewModelInstance 读写数据绑定输入。
    onLoad: () => {
      resize();
      if (!activityRiveCanvas.closest('.profile-entry')) activityRiveCanvas.removeAttribute("aria-hidden");
      startHeroCycle(rive, heroRiveInstance);
    },
  };
  // 留空表示使用 .riv 文件里的默认画板与状态机，交给 Rive 自行选择。
  if (rive.artboard) options.artboard = rive.artboard;
  if (rive.stateMachine) options.stateMachine = rive.stateMachine;
  heroRiveInstance = new window.rive.Rive(options);

  heroRiveObserver = "ResizeObserver" in window ? new ResizeObserver(resize) : null;
  heroRiveObserver?.observe(activityRiveCanvas);
}

function setActivity(index, announce = false) {
  if (!state.activities.length || !activityTrack) return;
  const total = state.activities.length;
  state.activityIndex = (index + total) % total;
  activityTrack.style.transform = `translateX(-${state.activityIndex * 100}%)`;

  activityDots?.querySelectorAll(".activity-dot").forEach((dot, dotIndex) => {
    dot.setAttribute("aria-current", dotIndex === state.activityIndex ? "true" : "false");
  });
  activityTrack.querySelectorAll(".activity-slide").forEach((slide, slideIndex) => {
    const active = slideIndex === state.activityIndex;
    slide.setAttribute("aria-hidden", active ? "false" : "true");
    slide.inert = !active;
    slide.querySelector(".banner-action")?.setAttribute("tabindex", active ? "0" : "-1");
  });

  if (announce && activityStatus) {
    const item = state.activities[state.activityIndex];
    activityStatus.textContent = `当前活动：${item.title}，第 ${state.activityIndex + 1} 项，共 ${total} 项`;
  }
  scheduleCarousel();
}

function scheduleCarousel() {
  window.clearTimeout(state.timer);
  if (state.paused || state.previewActivityId || state.activities.length < 2 || document.hidden) return;
  state.timer = window.setTimeout(() => setActivity(state.activityIndex + 1), 7000);
}

function bindCarouselControls() {
  if (!activityCarousel) return;
  const pause = () => {
    state.paused = true;
    window.clearTimeout(state.timer);
  };
  const resume = () => {
    state.paused = false;
    scheduleCarousel();
  };

  let pointerStart = null;
  activityCarousel.addEventListener("pointerdown", (event) => {
    pointerStart = event.clientX;
    pause();
  });
  activityCarousel.addEventListener("pointerup", (event) => {
    if (pointerStart === null) return;
    const delta = event.clientX - pointerStart;
    pointerStart = null;
    if (Math.abs(delta) > 48) setActivity(state.activityIndex + (delta < 0 ? 1 : -1), true);
    resume();
  });
  activityCarousel.addEventListener("pointercancel", () => {
    pointerStart = null;
    resume();
  });

  document.addEventListener("visibilitychange", () => {
    scheduleCarousel();
    scheduleFeatured();
  });
  reduceMotion.addEventListener?.("change", scheduleCarousel);
}

// Keywords expand inline on the left; system selection lives in the search field.
function setPlatformExpanded(expanded) {
  const picker = document.querySelector("#platform-picker");
  picker.dataset.expanded = String(expanded);
  platformButtons.querySelectorAll("button").forEach(button => {
    const selected = button.dataset.platform === state.platform;
    button.setAttribute("aria-pressed", String(selected));
    button.inert = !expanded && !selected;
    if (selected) button.setAttribute("aria-expanded", String(expanded));
    else button.removeAttribute("aria-expanded");
  });
  platformButtons.scrollLeft = 0;
}

function setCategoryExpanded(expanded) {
  categoryTabs.dataset.expanded = String(expanded);
  categoryTabs.querySelectorAll("button").forEach(button => {
    const selected = button.dataset.category === state.category;
    button.setAttribute("aria-pressed", String(selected));
    button.inert = !expanded && !selected;
    if (selected) button.setAttribute("aria-expanded", String(expanded));
    else button.removeAttribute("aria-expanded");
  });
  categoryTabs.scrollLeft = 0;
}

function renderFilters() {
  if (!categoryTabs || !platformButtons) return;
  const categories = ["全部", ...new Set(state.cases.map((item) => item.category).filter(Boolean))];
  if (!categories.includes(state.category)) state.category = "全部";

  categoryTabs.replaceChildren();
  categories.forEach((category) => {
    const button = document.createElement("button");
    button.className = "category-button";
    button.type = "button";
    button.textContent = category === "全部" ? "创意橱柜" : category;
    button.dataset.category = category;
    button.setAttribute("aria-pressed", category === state.category ? "true" : "false");
    button.addEventListener("click", () => {
      if (categoryTabs.dataset.expanded !== "true") {
        setCategoryExpanded(true);
        return;
      }
      state.category = category;
      setCategoryExpanded(false);
      button.focus({ preventScroll: true });
      renderCases();
    });
    categoryTabs.append(button);
  });
  setCategoryExpanded(false);

  platformButtons.replaceChildren();
  ["全部平台", "Apple", "Android", "HarmonyOS"].forEach((platform) => {
    const button = document.createElement("button");
    const label = platformLabel(platform);
    button.className = "platform-button";
    button.type = "button";
    button.dataset.platform = platform;
    button.setAttribute("aria-label", label);
    button.setAttribute("aria-pressed", platform === state.platform ? "true" : "false");
    button.title = label;
    button.append(createPlatformIcon(platform));
    button.addEventListener("click", () => {
      if (document.querySelector("#platform-picker").dataset.expanded !== "true") {
        setPlatformExpanded(true);
        return;
      }
      state.platform = platform;
      setPlatformExpanded(false);
      button.focus({ preventScroll: true });
      renderCases();
    });
    platformButtons.append(button);
  });
  setPlatformExpanded(false);
}

function getFilteredCases() {
  const query = state.query.trim().toLocaleLowerCase("zh-CN");
  return state.cases.filter((item) => {
    const categoryMatches = state.category === "全部" || item.category === state.category;
    const platformMatches = state.platform === "全部平台" || item.platforms.includes(state.platform);
    const searchable = [item.name, item.summary, item.details, item.partnerName, item.category, ...item.platforms, ...item.tags]
      .join(" ")
      .toLocaleLowerCase("zh-CN");
    return categoryMatches && platformMatches && (!query || searchable.includes(query));
  });
}

let expandedCard = null;
const cardBackdrop = document.createElement("div");
cardBackdrop.className = "card-backdrop";
cardBackdrop.hidden = true;
document.body.append(cardBackdrop);
cardBackdrop.addEventListener("click", () => collapseCard());

function cardBounds() {
  // 移动端留出更明显的四周留白，让展开卡像“浮层”而不是贴满全屏；
  // 桌面端维持既有尺寸。
  const narrow = innerWidth < 720;
  const margin = narrow ? 24 : 32;
  const width = Math.min(narrow ? 640 : 760, innerWidth - margin * 2);
  const height = Math.min(innerHeight - margin * 2, narrow ? innerHeight * 0.88 : innerHeight - margin * 2);
  return { left: (innerWidth - width) / 2, top: margin, width, height };
}

function geometry(rect) {
  return Object.fromEntries(["left", "top", "width", "height"].map(key => [key, `${rect[key]}px`]));
}

async function expandCard(card) {
  if (expandedCard) return;
  pauseFeatured();
  const host = card.closest(".case-card");
  const from = card.getBoundingClientRect();
  const hiddenSiblings = [];
  host.style.height = `${host.getBoundingClientRect().height}px`;
  host.classList.add("has-expanded-card");
  host.classList.add("card-entered");
  expandedCard = { card, host, hiddenSiblings };
  for (let node = card; node.parentElement && node !== document.body; node = node.parentElement) {
    for (const sibling of node.parentElement.children) {
      if (sibling !== node && sibling !== cardBackdrop && !sibling.inert) {
        sibling.inert = true;
        hiddenSiblings.push(sibling);
      }
    }
  }
  document.body.classList.add("dialog-open");
  cardBackdrop.hidden = false;
  if (!reduceMotion.matches) {
    cardBackdrop.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 240, easing: "ease-out" });
  }
  card.classList.add("is-expanded");
  // 展开后如果有视频就直接加载，没有视频则维持封面。
  const item = host.__item;
  const media = card.querySelector(".case-media") || host.querySelector(".case-media");
  if (item && media && SiteMedia.videoSource(item.video)) renderAccessMedia(item, media, "player");
  card.setAttribute("role", "dialog");
  card.setAttribute("aria-modal", "true");
  card.removeAttribute("aria-expanded");
  // Top layer changes presentation only: the card and its iframe stay in place in the DOM.
  if (card.showPopover) {
    card.setAttribute("popover", "manual");
    card.showPopover();
  }
  Object.assign(card.style, geometry(cardBounds()));
  card.focus({ preventScroll: true });
  // 展开态侧滑保护：压入一条占位历史。用户侧滑返回时先收起展开视图，
  // 避免在展开态直接触发 WebView 返回、跳出页面。占位只保留一条，
  // 重复展开不会把历史栈越压越深。
  if (history.pushState && !(history.state && history.state.qianjiCard)) {
    history.pushState({ qianjiCard: true }, "");
  }
  if (!reduceMotion.matches) {
    await card.animate([geometry(from), geometry(cardBounds())], {
      duration: 480, easing: "cubic-bezier(.16,1,.3,1)"
    }).finished.catch(() => {});
  }
}

async function collapseCard() {
  const current = expandedCard;
  if (!current || current.closing) return;
  current.closing = true;
  const { card, host, hiddenSiblings } = current;
  const from = card.getBoundingClientRect();
  card.getAnimations().forEach(animation => animation.cancel());
  const target = host.getBoundingClientRect();
  card.scrollTop = 0;
  if (!reduceMotion.matches) {
    cardBackdrop.getAnimations().forEach(animation => animation.cancel());
    await Promise.all([
      card.animate([geometry(from), geometry(target)], {
        duration: 400, easing: "cubic-bezier(.16,1,.3,1)", fill: "forwards"
      }).finished.catch(() => {}),
      cardBackdrop.animate([{ opacity: 1 }, { opacity: 0 }], {
        duration: 400, easing: "ease-out", fill: "forwards"
      }).finished.catch(() => {})
    ]);
  }
  if (card.hasAttribute("popover")) {
    card.hidePopover();
    card.removeAttribute("popover");
  }
  card.getAnimations().forEach(animation => animation.cancel());
  card.classList.remove("is-expanded");
  // 收起后回到封面（展开时可能已经换成播放器了）。
  const hostItem = host.__item;
  const hostMedia = host.querySelector(".case-media");
  if (hostItem && hostMedia) renderAccessMedia(hostItem, hostMedia, "poster");
  card.removeAttribute("style");
  card.setAttribute("role", "button");
  card.setAttribute("aria-expanded", "false");
  card.removeAttribute("aria-modal");
  host.style.height = "";
  host.classList.remove("has-expanded-card");
  hiddenSiblings.forEach(node => node.inert = false);
  cardBackdrop.hidden = true;
  cardBackdrop.getAnimations().forEach(animation => animation.cancel());
  document.body.classList.remove("dialog-open");
  expandedCard = null;
  card.focus({ preventScroll: true });
  resumeFeatured();
}

window.addEventListener("resize", () => {
  if (expandedCard && !expandedCard.closing) Object.assign(expandedCard.card.style, geometry(cardBounds()));
});
// 侧滑/浏览器返回：展开卡片开着时先收起浮层并压回占位历史，
// 把这次返回"吞掉"——第一次返回只收起浮层，不会直接退到主页。
// 收起后再返回才真正放行（expandedCard 为 null，直接 return）。
window.addEventListener("popstate", () => {
  if (!expandedCard) return;
  collapseCard();
  if (history.pushState) history.pushState({ qianjiCard: true }, "");
});
document.addEventListener("keydown", event => {
  if (!expandedCard) return;
  if (event.key === "Escape") { event.preventDefault(); collapseCard(); }
  if (event.key === "Tab") {
    const controls = [...expandedCard.card.querySelectorAll('button:not(:disabled), a[href], iframe, [tabindex="0"]')];
    const first = controls[0] || expandedCard.card, last = controls.at(-1) || expandedCard.card;
    if (event.shiftKey && (document.activeElement === first || document.activeElement === expandedCard.card)) {
      event.preventDefault(); last?.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault(); first?.focus();
    }
  }
});

// Builds one compact/expandable case card. Featured slides reuse the exact same
// card so the expand/collapse animation is identical to the rest of the grid.
function createCaseCard(item, index, options = {}) {
  const isFeatured = Boolean(options.featured);
  const fragment = caseTemplate.content.cloneNode(true);
  const card = fragment.querySelector(".case-card");
  const trigger = fragment.querySelector(".case-card-trigger");
  const image = fragment.querySelector(".case-media img");
  const title = fragment.querySelector(".case-title");
  const platforms = fragment.querySelector(".case-platforms");

  trigger.setAttribute("aria-label", `${item.name}，由 ${item.partnerName} 创作，查看视频、简介和平台入口`);
  trigger.setAttribute("aria-expanded", "false");
  trigger.addEventListener("click", event => {
    if (expandedCard || event.target.closest("button, a, iframe")) return;
    // A horizontal swipe that changed slides should not also open the card.
    if (isFeatured && featured.slides.length > 1 && Date.now() - featured.lastSwipe < 400) return;
    expandCard(trigger);
  });
  trigger.addEventListener("keydown", event => {
    if (event.target === trigger && !expandedCard && ["Enter", " "].includes(event.key)) {
      event.preventDefault(); expandCard(trigger);
    }
  });
  // 管理台的画布靠这个 id 找到要打开的那张卡。
  card.dataset.id = item.id || "";
  renderAccessItems(item, trigger.querySelector(".card-access"));
  const summary = item.summary || "";
  const summaryElement = fragment.querySelector(".case-summary");
  summaryElement.textContent = summary;
  summaryElement.hidden = !summary;
  // description 与 details 已合并为一个字段，App 内嵌和浏览器用同一段正文。
  const details = item.details || item.summary || "";
  const detailSection = fragment.querySelector(".case-details");
  detailSection.querySelector(".case-details-text").textContent = details;
  detailSection.hidden = !details;
  const tags = fragment.querySelector(".case-tags");
  [...new Set(item.tags || [])].forEach(tag => {
    const capsule = document.createElement("span");
    capsule.className = "case-tag";
    capsule.textContent = tag;
    tags.append(capsule);
  });
  tags.hidden = !tags.children.length;
  card.style.setProperty("--card-index", Math.min(index, 7));
  // Cover images are optional; cards are video-first. Hide the media area
  // entirely when there is neither a cover nor a video link.
  const media = fragment.querySelector(".case-media");
  if (item.cover) {
    SiteMedia.imagePicture(image, item.cover);
    image.alt = item.coverAlt || `${item.name}案例封面`;
  }
  if (isFeatured) {
    const poster = document.createElement("img");
    poster.className = "featured-poster";
    poster.alt = item.bannerAlt || item.coverAlt || `${item.name}精选海报`;
    poster.decoding = "async";
    poster.draggable = false;
    trigger.prepend(SiteMedia.imagePicture(poster, item.bannerCover || item.cover));
  }
  card.__item = item;
  if (SiteMedia.videoSource(item.video)) renderAccessMedia(item, media, "poster");
  else if (!item.cover) media.hidden = true;
  title.textContent = item.name;
  const visiblePlatforms = appPlatform ? [appPlatform] : item.platforms;
  platforms.setAttribute("aria-label", `支持平台：${visiblePlatforms.map(platformLabel).join("、")}`);
  visiblePlatforms.forEach((platform) => platforms.append(createPlatformIcon(platform, "platform-icon--case")));
  return card;
}

function setFeatured(index, announce = false) {
  const slides = featured.slides;
  if (!slides.length) return;
  const total = slides.length;
  featured.index = ((index % total) + total) % total;
  slides.forEach((card, slideIndex) => {
    const active = slideIndex === featured.index;
    card.classList.toggle("is-active", active);
    card.setAttribute("aria-hidden", active ? "false" : "true");
    card.inert = !active;
    card.querySelector(".case-card-trigger")?.setAttribute("tabindex", active ? "0" : "-1");
  });
  featured.dots.forEach((dot, dotIndex) => {
    dot.setAttribute("aria-current", dotIndex === featured.index ? "true" : "false");
  });
  if (announce && featured.status) {
    featured.status.textContent = `当前精选：第 ${featured.index + 1} 项，共 ${total} 项`;
  }
  scheduleFeatured();
}

function scheduleFeatured() {
  window.clearTimeout(featured.timer);
  featured.timer = null;
  if (featured.paused || featured.previewId || featured.slides.length < 2 || document.hidden || expandedCard) return;
  featured.timer = window.setTimeout(() => setFeatured(featured.index + 1), 6000);
}

function pauseFeatured() {
  featured.paused = true;
  window.clearTimeout(featured.timer);
  featured.timer = null;
}

function resumeFeatured() {
  featured.paused = false;
  scheduleFeatured();
}

function destroyFeatured() {
  window.clearTimeout(featured.timer);
  featured.timer = null;
  featured.index = 0;
  featured.paused = false;
  featured.slides = [];
  featured.dots = [];
  featured.status = null;
  featured.lastSwipe = 0;
  featured.previewId = null;
}

// The featured banner is the first tile of the waterfall: it spans every column
// and cycles through all cards marked "featured" in data/content.json.
function createFeaturedCarousel(items) {
  const rotating = items.length > 1;
  const wrapper = document.createElement("div");
  wrapper.className = "featured-carousel";
  wrapper.dataset.rotating = String(rotating);
  wrapper.setAttribute("role", "group");
  wrapper.setAttribute("aria-label", "卡片精选");
  if (rotating) wrapper.setAttribute("aria-roledescription", "轮播");

  const viewport = document.createElement("div");
  viewport.className = "featured-viewport";
  const dots = document.createElement("div");
  dots.className = "featured-dots";
  dots.setAttribute("role", "group");
  dots.setAttribute("aria-label", "选择精选卡片");
  const status = document.createElement("p");
  status.className = "sr-only";
  status.setAttribute("aria-live", "polite");

  featured.slides = [];
  featured.dots = [];
  featured.status = rotating ? status : null;

  items.forEach((item, index) => {
    const card = createCaseCard(item, index, { featured: true });
    card.classList.add("featured-slide");
    card.removeAttribute("role");
    viewport.append(card);
    featured.slides.push(card);

    if (rotating) {
      const dot = document.createElement("button");
      dot.type = "button";
      dot.className = "featured-dot";
      dot.setAttribute("aria-label", `显示精选：${item.name}`);
      dot.addEventListener("click", () => setFeatured(index, true));
      dots.append(dot);
      featured.dots.push(dot);
    }
  });

  wrapper.append(viewport);
  if (rotating) wrapper.append(dots, status);
  setFeatured(0, false);
  return wrapper;
}

function bindFeaturedControls() {
  if (!featuredBanners) return;
  let startX = null;
  featuredBanners.addEventListener("pointerdown", event => {
    if (!event.isPrimary || featured.slides.length < 2 || expandedCard || !event.target.closest(".featured-carousel")) return;
    startX = event.clientX;
    pauseFeatured();
  });
  window.addEventListener("pointerup", event => {
    if (startX === null) return;
    const delta = event.clientX - startX;
    startX = null;
    if (featured.slides.length > 1 && Math.abs(delta) > 48) {
      featured.lastSwipe = Date.now();
      setFeatured(featured.index + (delta < 0 ? 1 : -1), true);
    }
    resumeFeatured();
  });
  window.addEventListener("pointercancel", () => {
    if (startX === null) return;
    startX = null;
    resumeFeatured();
  });
  document.addEventListener("visibilitychange", () => {
    if (document.hidden && startX !== null) {
      startX = null;
      featured.paused = false;
    }
    scheduleFeatured();
  });
}

// 区块滚动入场：.reveal 元素进入视口后由 .reveal-init 过渡到 .is-visible。
// 管理台预览与 reduce-motion 下直接可见，不做隐藏。
function initReveal() {
  const targets = document.querySelectorAll(".reveal");
  if (!targets.length) return;
  if (reduceMotion.matches || document.documentElement.dataset.preview === "true" || !("IntersectionObserver" in window)) {
    targets.forEach((el) => el.classList.add("is-visible"));
    return;
  }
  targets.forEach((el) => el.classList.add("reveal-init"));
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add("is-visible");
      observer.unobserve(entry.target);
    });
  }, { threshold: 0.12, rootMargin: "0px 0px -6% 0px" });
  targets.forEach((el) => observer.observe(el));
}

// M3 涟漪：pointerdown 时在按钮内生成一个扩散圆，动画结束后移除。
function initRipples() {
  if (reduceMotion.matches || !window.PointerEvent) return;
  const RIPPLE_TARGETS = ".banner-action, .category-button, .activity-dot, .platform-button, .access-option, .dialog-close, .contact-method";
  document.addEventListener("pointerdown", (event) => {
    const host = event.target.closest(RIPPLE_TARGETS);
    if (!host) return;
    const rect = host.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    const ripple = document.createElement("span");
    ripple.className = "ripple";
    ripple.style.width = ripple.style.height = `${size}px`;
    ripple.style.left = `${event.clientX - rect.left - size / 2}px`;
    ripple.style.top = `${event.clientY - rect.top - size / 2}px`;
    host.append(ripple);
    ripple.addEventListener("animationend", () => ripple.remove());
  });
}

// Place each tile into the shortest column; columns stay close to 280px.
function waterfallGeometry(width, viewportWidth, heights) {
  const gap = viewportWidth < 720 ? 12 : 24;
  const columns = viewportWidth < 320 ? 1 : viewportWidth < 720 ? 2
    : Math.max(1, Math.round((width + gap) / (280 + gap)));
  const cardWidth = (width - gap * (columns - 1)) / columns;
  const bottoms = Array(columns).fill(0);
  const positions = heights.map(height => {
    const column = bottoms.indexOf(Math.min(...bottoms));
    const position = { left: column * (cardWidth + gap), top: bottoms[column] };
    bottoms[column] += height + gap;
    return position;
  });
  return { cardWidth, columns, positions, height: Math.max(0, ...bottoms) - (heights.length ? gap : 0) };
}
let waterfallFrame = 0;
function scheduleWaterfall() {
  if (waterfallFrame) return;
  waterfallFrame = requestAnimationFrame(() => {
    waterfallFrame = 0;
    if (!caseGrid || !caseGrid.clientWidth) return;
    const cards = [...caseGrid.children];
    const width = waterfallGeometry(caseGrid.clientWidth, window.innerWidth, []).cardWidth;
    cards.forEach(card => { card.style.width = `${width}px`; });
    const layout = waterfallGeometry(caseGrid.clientWidth, window.innerWidth,
      cards.map(card => card.getBoundingClientRect().height));
    cards.forEach((card, index) => {
      card.style.left = `${layout.positions[index].left}px`;
      card.style.top = `${layout.positions[index].top}px`;
    });
    caseGrid.style.height = `${layout.height}px`;
  });
}
const waterfallObserver = new ResizeObserver(scheduleWaterfall);
if (caseGrid) waterfallObserver.observe(caseGrid);
window.addEventListener("resize", scheduleWaterfall);
document.fonts?.ready.then(scheduleWaterfall);

function renderCases() {
  if (!caseGrid || !caseTemplate || expandedCard) return;
  const items = getFilteredCases();
  cardObserver?.disconnect();
  destroyFeatured();
  waterfallObserver.disconnect();
  waterfallObserver.observe(caseGrid);
  caseGrid.replaceChildren();
  if (featuredBanners) {
    featuredBanners.replaceChildren();
    const selected = items.filter(item => item.featured && (item.bannerCover || item.cover));
    featuredBanners.hidden = selected.length === 0;
    if (selected.length) featuredBanners.append(createFeaturedCarousel(selected));
  }

  // Every content item is its own waterfall tile, including featured items.
  items.forEach((item, index) => {
    const card = createCaseCard(item, index);
    caseGrid.append(card);
    waterfallObserver.observe(card);
    if (cardObserver) cardObserver.observe(card);
    else card.dataset.visible = "true";
  });

  scheduleWaterfall();
  if (emptyState) emptyState.hidden = items.length !== 0;
}

function bindCaseControls() {
  searchInput?.addEventListener("input", (event) => {
    state.query = event.target.value;
    renderCases();
  });
}

function bindAccessDialog() {
  accessDialog?.addEventListener("cancel", event => {
    event.preventDefault();
    closeAccessDialog();
  });
  accessDialog?.addEventListener("click", (event) => {
    if (event.target === accessDialog) closeAccessDialog();
  });
  accessDialog?.addEventListener("close", () => {
    accessMedia.replaceChildren();
    document.body.classList.remove("dialog-open");
    state.dialogTrigger?.focus();
  });
}

// 联系方式允许的协议白名单（http/https 之外还包含邮件与 QQ 等系统 scheme）。
// 用白名单而非黑名单，避免资料里出现 javascript: 之类可执行协议。
const CONTACT_SCHEMES = ["http:", "https:", "mailto:", "tel:", "sms:", "mqqwpa:", "mqq:", "weixin:", "alipays:"];

function contactHref(value) {
  if (typeof value !== "string") return "";
  const raw = value.trim();
  if (!raw) return "";
  try {
    const url = new URL(raw);
    return CONTACT_SCHEMES.includes(url.protocol) ? raw : "";
  } catch {
    return "";
  }
}

function renderContact() {
  const contact = state.contact;
  if (!contactSection) return;
  const methods = Array.isArray(contact?.methods)
    ? contact.methods.filter((method) => method && (method.href || method.value))
    : [];
  if (!contact || contact.visible === false || !methods.length) {
    contactSection.hidden = true;
    return;
  }

  contactLabel.textContent = contact.label || "";
  contactTitle.textContent = contact.title || "";
  contactSummary.textContent = contact.summary || "";
  contactMethods.replaceChildren();

  methods.forEach((method) => {
    const href = contactHref(method.href);
    const webHref = SiteMedia.webUrl(href);
    const copiesValue = Boolean(appPlatform) || !href;
    const node = document.createElement(copiesValue ? "button" : "a");
    if (!copiesValue) {
      node.href = href;
      if (!href.startsWith("mailto:") && !href.startsWith("tel:") && !href.startsWith("sms:")) {
        node.target = "_blank";
        node.rel = "noopener noreferrer";
      }
    } else {
      node.type = "button";
      const value = webHref || String(method.value || href || "");
      node.setAttribute("aria-label", `${webHref ? "复制网址" : "复制联系方式"}：${method.label || "联系方式"}`);
      node.addEventListener("click", () => copyAccessValue(value, method.label || "联系方式", node));
    }
    node.className = "contact-method";
    const small = document.createElement("small");
    small.textContent = `${copiesValue ? (webHref ? "复制网址 · " : "复制 · ") : ""}${method.label || ""}`;
    const strong = document.createElement("strong");
    strong.textContent = method.value || "";
    node.append(small, strong);
    contactMethods.append(node);
  });

  contactSection.hidden = false;
}

// 弹窗的关闭方式是固定的，只绑一次。重绘时不再重复添加监听，
// 否则实时预览每敲一个字都会堆一批监听上去。
function bindNoticeDialog() {
  if (!noticeDialog) return;
  // Once exit begins, all dismissal/repeated link clicks wait for its completion.
  for (const type of ['click', 'auxclick']) noticeDialog.addEventListener(type, event => {
    if (noticeDialog.dataset.closing !== 'true') return;
    event.preventDefault();
    event.stopImmediatePropagation();
  }, { capture: true });
  document.addEventListener('keydown', event => {
    if (event.key !== 'Escape' || !noticeDialog.matches(':modal')) return;
    event.preventDefault();
    event.stopImmediatePropagation();
  }, { capture: true });
  // Only configured button/image actions dismiss the poster.
  noticeDialog.addEventListener("cancel", (event) => {
    event.preventDefault();
  });
  noticeDialog.addEventListener("close", () => {
    // Releasing modal input below does not end the visual exit.
    if (noticeReleasedCloses > 0) { noticeReleasedCloses--; return; }
    resetNoticeMotion();
    if (!accessDialog?.open) document.body.classList.remove("dialog-open");
    flushNoticeUpdate();
  });
}

// Damped motion keeps the poster buoyant without repeatedly bouncing.
let noticeMotionEpoch = 0;
let noticeEntryAnimations = [];
let noticeExitAnimation = null;
let noticeReleasedCloses = 0;
let noticeExitBackdrop = null;
function releaseNoticeModal(backdropDuration = 480) {
  if (noticeDialog.classList.contains('notice-free-exit')) return;
  // Keep the same decoded image/button in place, but release native modal input.
  const transform = noticeDialog.style.transform;
  noticeDialog.style.transform = 'none';
  const rect = noticeDialog.getBoundingClientRect();
  noticeDialog.style.transform = transform;
  noticeExitBackdrop = document.createElement('div');
  noticeExitBackdrop.className = 'notice-exit-backdrop';
  noticeExitBackdrop.style.animationDuration = `${backdropDuration}ms`;
  noticeExitBackdrop.setAttribute('aria-hidden', 'true');
  document.body.append(noticeExitBackdrop);
  noticeDialog.classList.add('notice-free-exit');
  Object.assign(noticeDialog.style, { left: `${rect.left}px`, top: `${rect.top}px`, width: `${rect.width}px`, height: `${rect.height}px` });
  noticeDialog.inert = true;
  noticeDialog.setAttribute('aria-hidden', 'true');
  noticeReleasedCloses++;
  noticeDialog.close();
  noticeDialog.show();
  if (!accessDialog?.open) document.body.classList.remove('dialog-open');
}
function noticeSpringFrames() {
  return Array.from({ length: 46 }, (_, index) => {
    const t = index / 45;
    const progress = index === 45 ? 1 : 1 - Math.exp(-8 * t) * (Math.cos(12 * t) + 2 / 3 * Math.sin(12 * t));
    const remaining = 1 - progress;
    return {
      offset: t,
      opacity: Math.min(1, t / .16),
      transform: `perspective(1000px) translate3d(0, ${64 * remaining}px, 0) scale(${1 - .16 * remaining}) rotateX(${9 * remaining}deg) rotateZ(${-1 * remaining}deg)`,
    };
  });
}
function stopNoticeEntry(freeze = false) {
  const targets = [noticeDialog, noticeMedia, noticeActions];
  const snapshots = freeze ? targets.map(element => {
    const style = getComputedStyle(element);
    return { element, opacity: style.opacity, transform: style.transform };
  }) : [];
  noticeMotionEpoch++;
  noticeEntryAnimations.forEach(animation => animation.cancel());
  noticeEntryAnimations = [];
  snapshots.forEach(({ element, opacity, transform }) => Object.assign(element.style, { opacity, transform }));
}
function resetNoticeMotion() {
  if (noticeActivation) finishNoticeActivation(noticeActivation);
  stopNoticeEntry();
  noticeExitAnimation?.cancel();
  noticeExitAnimation = null;
  const released = noticeDialog.classList.contains('notice-free-exit');
  const retry = released && noticeDialog.open;
  if (retry) { noticeReleasedCloses++; noticeDialog.close(); }
  noticeExitBackdrop?.remove();
  noticeExitBackdrop = null;
  noticeDialog.classList.remove('notice-free-exit');
  if (released) {
    for (const name of ['left', 'top', 'width', 'height']) noticeDialog.style.removeProperty(name);
    noticeDialog.inert = false;
    noticeDialog.removeAttribute('aria-hidden');
  }
  [noticeDialog, noticeMedia, noticeActions].forEach(element => {
    element.style.removeProperty('opacity');
    element.style.removeProperty('transform');
  });
  noticeDialog.classList.remove('closing');
  noticeDialog.setAttribute('closedby', 'none');
  delete noticeDialog.dataset.closing;
  delete noticeDialog.dataset.motion;
  if (retry && !accessDialog?.open && !document.body.classList.contains('information-open')) {
    document.body.classList.add('dialog-open');
    noticeDialog.showModal();
  }
}
function playNoticeEnter() {
  resetNoticeMotion();
  if (reduceMotion.matches || !noticeDialog.animate) return;
  const epoch = noticeMotionEpoch;
  noticeDialog.dataset.motion = 'entering';
  noticeEntryAnimations = [
    noticeDialog.animate(noticeSpringFrames(), { duration: 780, easing: 'linear', fill: 'both' }),
    noticeMedia.animate([
      { transform: 'translateY(6px) scale(1.055)' },
      { transform: 'translateY(0) scale(1)' },
    ], { duration: 1040, easing: 'cubic-bezier(.16,1,.3,1)', fill: 'both' }),
    noticeActions.animate([
      { opacity: 0, transform: 'translateY(14px) scale(.92)', offset: 0 },
      { opacity: 1, transform: 'translateY(-2px) scale(1.025)', offset: .7 },
      { opacity: 1, transform: 'translateY(0) scale(1)', offset: 1 },
    ], { duration: 470, delay: 200, easing: 'cubic-bezier(.22,1,.36,1)', fill: 'both' }),
  ];
  Promise.allSettled(noticeEntryAnimations.map(animation => animation.finished)).then(() => {
    if (noticeMotionEpoch !== epoch || !noticeDialog.open || noticeDialog.dataset.closing === 'true') return;
    stopNoticeEntry();
    noticeDialog.dataset.motion = 'settled';
  });
}
function closeNoticeDialog() {
  if (noticeActivation || !noticeDialog.open || noticeDialog.dataset.closing === 'true') return;
  const finish = () => { noticeDialog.close(); resetNoticeMotion(); };
  if (reduceMotion.matches || !noticeDialog.animate) { finish(); return; }
  // Freeze all layers at their actual pose so closing mid-entry never jumps.
  stopNoticeEntry(true);
  const from = { opacity: noticeDialog.style.opacity, transform: noticeDialog.style.transform };
  noticeDialog.dataset.closing = 'true';
  noticeDialog.setAttribute('closedby', 'none');
  noticeDialog.dataset.motion = 'closing';
  noticeDialog.classList.add('closing');
  releaseNoticeModal(240);
  const exit = noticeDialog.animate([
    from,
    { opacity: 0, transform: 'perspective(1000px) translate3d(0, 28px, 0) scale(.93) rotateX(-3deg)' },
  ], { duration: 240, easing: 'cubic-bezier(.4,0,.8,.2)', fill: 'both' });
  noticeExitAnimation = exit;
  exit.finished.then(() => {
    if (noticeExitAnimation === exit) { noticeExitAnimation = null; finish(); }
  }, () => {});
}

let noticeActivation = null;
function finishNoticeActivation(effect, completed = false) {
  if (noticeActivation !== effect) return;
  noticeActivation = null;
  effect.cancelled = true;
  cancelAnimationFrame(effect.frame);
  effect.bounce?.cancel();
  if (effect.stage) {
    try { effect.stage.hidePopover?.(); } catch {}
    effect.stage.remove();
  }
  effect.action.style.removeProperty('visibility');
  effect.action.removeAttribute('aria-disabled');
  noticeActions.style.removeProperty('visibility');
  noticeMedia.style.removeProperty('visibility');
  noticeDialog.style.removeProperty('overflow');
  effect.resolve?.(completed);
}
function roundedNoticePath(ctx, width, height, radius) {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath(); ctx.moveTo(r, 0); ctx.lineTo(width - r, 0);
  ctx.quadraticCurveTo(width, 0, width, r); ctx.lineTo(width, height - r);
  ctx.quadraticCurveTo(width, height, width - r, height); ctx.lineTo(r, height);
  ctx.quadraticCurveTo(0, height, 0, height - r); ctx.lineTo(0, r);
  ctx.quadraticCurveTo(0, 0, r, 0); ctx.closePath();
}
function noticeRaster(element, image = null) {
  const rect = element.getBoundingClientRect();
  const ratio = Math.min(devicePixelRatio || 1, 1.5);
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.ceil(rect.width * ratio));
  canvas.height = Math.max(1, Math.ceil(rect.height * ratio));
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas unavailable');
  ctx.scale(ratio, ratio);
  const style = getComputedStyle(element);
  roundedNoticePath(ctx, rect.width, rect.height, image ? 24 : parseFloat(style.borderRadius) || 24);
  ctx.clip();
  if (image) ctx.drawImage(image, 0, 0, rect.width, rect.height);
  else {
    ctx.fillStyle = style.backgroundColor; ctx.fillRect(0, 0, rect.width, rect.height);
    const label = element.querySelector('.notice-button-label');
    const labelRect = label.getBoundingClientRect(), textStyle = getComputedStyle(label);
    ctx.font = `${textStyle.fontWeight} ${textStyle.fontSize} ${textStyle.fontFamily}`;
    ctx.fillStyle = textStyle.color; ctx.textBaseline = 'middle'; ctx.textAlign = 'center';
    const lineHeight = parseFloat(textStyle.lineHeight) || parseFloat(textStyle.fontSize) * 1.5;
    const maxWidth = Math.max(16, labelRect.width);
    const lines = [''];
    for (const char of label.textContent) {
      const line = lines.length - 1;
      if (char === '\n') lines.push('');
      else if (lines[line] && ctx.measureText(lines[line] + char).width > maxWidth) lines.push(char);
      else lines[line] += char;
    }
    lines.forEach((line, index) => ctx.fillText(line,
      labelRect.left - rect.left + labelRect.width / 2,
      labelRect.top - rect.top + labelRect.height / 2 + (index - (lines.length - 1) / 2) * lineHeight));
  }
  return { canvas, rect, ratio };
}
function noticeSand(raster, count, start, duration) {
  const { rect, canvas, ratio } = raster;
  const remaining = document.createElement('canvas');
  remaining.width = canvas.width; remaining.height = canvas.height;
  const mask = remaining.getContext('2d');
  if (!mask) throw new Error('Canvas unavailable');
  mask.drawImage(canvas, 0, 0);
  mask.globalCompositeOperation = 'destination-out';
  // Erase tiny cells from an intact image; never break it into large moving tiles.
  const cell = Math.max(2, Math.ceil(Math.sqrt(canvas.width * canvas.height / 110000))) / ratio;
  const density = Math.min(1, count * cell * cell / (rect.width * rect.height));
  let pixels;
  try { pixels = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data; }
  catch { /* Remote posters can still supply grain-sized image samples without pixel access. */ }
  const cuts = [], active = [];
  for (let y = 0; y < rect.height; y += cell) for (let x = 0; x < rect.width; x += cell) {
    const width = Math.min(cell, rect.width - x), height = Math.min(cell, rect.height - y);
    const u = x / rect.width, v = y / rect.height;
    const ripple = Math.sin(u * 15) * .035 + Math.sin(u * 31 + v * 9) * .02;
    const progress = Math.max(0, Math.min(1, (1 - v + ripple + (Math.random() - .5) * .1 + .11) / 1.22));
    const cut = { x, y, width, height, at: start + progress * duration };
    if (Math.random() < density) {
      const sx = Math.min(canvas.width - 1, Math.floor((x + width / 2) * ratio));
      const sy = Math.min(canvas.height - 1, Math.floor((y + height / 2) * ratio));
      const offset = (sy * canvas.width + sx) * 4;
      const alpha = pixels ? pixels[offset + 3] / 255 : 1;
      if (alpha > .05) cut.grain = {
        x: rect.left + x + width / 2, y: rect.top + y + height / 2, sx, sy,
        at: cut.at, life: 740 + Math.random() * 420,
        size: .55 + Math.random() * 1.05, alpha,
        color: pixels ? `rgb(${pixels[offset]} ${pixels[offset + 1]} ${pixels[offset + 2]})` : null,
        dx: (Math.random() - .4) * 45, dy: -40 - Math.random() * 90,
        phase: Math.random() * Math.PI * 2, flutter: 3 + Math.random() * 9,
      };
    }
    cuts.push(cut);
  }
  cuts.sort((a, b) => a.at - b.at);
  return { raster, remaining, mask, cuts, active, next: 0, end: start + duration + 1160 };
}
function drawNoticeSand(ctx, sand, elapsed) {
  const { mask, cuts, active, raster } = sand;
  mask.beginPath();
  while (sand.next < cuts.length && cuts[sand.next].at <= elapsed) {
    const cut = cuts[sand.next++];
    const x = Math.round(cut.x * raster.ratio), y = Math.round(cut.y * raster.ratio);
    // Whole backing pixels prevent antialiased cell edges from leaving a mesh behind.
    mask.rect(x, y, Math.round((cut.x + cut.width) * raster.ratio) - x,
      Math.round((cut.y + cut.height) * raster.ratio) - y);
    if (cut.grain) active.push(cut.grain);
  }
  mask.fill();
  ctx.globalAlpha = 1;
  ctx.drawImage(sand.remaining, raster.rect.left, raster.rect.top, raster.rect.width, raster.rect.height);
  let retained = 0;
  for (const grain of active) {
    const t = (elapsed - grain.at) / grain.life;
    if (t >= 1) continue;
    active[retained++] = grain;
    // Accelerating breeze and a little turbulence give the sand a soft trailing plume.
    const travel = t * (.35 + .65 * t);
    const flutter = (Math.sin(grain.phase + t * 5) - Math.sin(grain.phase)) * grain.flutter * t;
    const x = grain.x + grain.dx * travel + flutter;
    const y = grain.y + grain.dy * travel + Math.sin(t * 4 + grain.phase) * 5 * t;
    const size = grain.size * (1 - .55 * t);
    ctx.globalAlpha = grain.alpha * Math.pow(1 - t, .75);
    if (grain.color) { ctx.fillStyle = grain.color; ctx.fillRect(x, y, size, size); }
    else ctx.drawImage(raster.canvas, grain.sx, grain.sy, 1, 1, x, y, size, size);
  }
  active.length = retained;
  ctx.globalAlpha = 1;
}
function dissolveNotice(effect) {
  return new Promise((resolve, reject) => {
    effect.resolve = resolve;
    try {
      const image = noticeMedia.querySelector('img');
      const poster = noticeRaster(noticeMedia, image);
      const mobile = innerWidth < 720;
      const buttonDuration = 1400;
      const buttonSands = [...noticeActions.querySelectorAll('.banner-action')]
        .map(button => noticeSand(noticeRaster(button), 1400, 0, buttonDuration));
      const posterStart = buttonDuration / 2;
      const posterSand = noticeSand(poster, mobile ? 11000 : 15000, posterStart, 2050);
      const end = Math.max(posterSand.end, ...buttonSands.map(sand => sand.end));
      const stage = document.createElement('canvas');
      stage.className = 'notice-particle-stage'; stage.setAttribute('aria-hidden', 'true');
      const ratio = Math.min(devicePixelRatio || 1, 1.5);
      stage.width = Math.ceil(innerWidth * ratio); stage.height = Math.ceil(innerHeight * ratio);
      stage.style.width = `${innerWidth}px`; stage.style.height = `${innerHeight}px`;
      noticeDialog.append(stage); effect.stage = stage;
      if (stage.showPopover) { stage.setAttribute('popover', 'manual'); stage.showPopover(); }
      else noticeDialog.style.overflow = 'visible';
      const ctx = stage.getContext('2d');
      if (!ctx) throw new Error('Canvas unavailable');
      ctx.scale(ratio, ratio);
      noticeActions.style.visibility = 'hidden';
      noticeDialog.dataset.motion = 'button-particles';
      const began = performance.now();
      let posterStarted = false;
      const render = now => {
        if (noticeActivation !== effect || effect.cancelled) return;
        const elapsed = now - began;
        ctx.clearRect(0, 0, innerWidth, innerHeight);
        if (elapsed >= posterStart) {
          if (!posterStarted) {
            posterStarted = true;
            noticeMedia.style.visibility = 'hidden';
            noticeDialog.dataset.motion = 'poster-particles';
          }
          if (elapsed >= posterStart + 800) noticeDialog.dataset.motion = 'sand-settling';
          drawNoticeSand(ctx, posterSand, elapsed);
        }
        buttonSands.forEach(sand => drawNoticeSand(ctx, sand, elapsed));
        if (elapsed >= end) finishNoticeActivation(effect, true);
        else effect.frame = requestAnimationFrame(render);
      };
      effect.frame = requestAnimationFrame(render);
    } catch (error) { reject(error); }
  });
}
const noticeBusyActions = new WeakSet();
function noticeInteraction(config = {}) {
  config ||= {};
  return {
    ...config,
    actions: [...new Set(Array.isArray(config.actions) ? config.actions.filter(action => ['link', 'copy', 'close'].includes(action)) : [])],
  };
}
function noticeConfiguration(notice) {
  if (Array.isArray(notice.buttons)) return {
    buttons: notice.buttons.map(noticeInteraction),
    imageAction: noticeInteraction(notice.imageAction),
  };
  const behavior = ['link', 'copy', 'close'].includes(notice.buttonAction)
    ? notice.buttonAction : (contactHref(notice.linkHref) ? 'link' : 'close');
  return {
    buttons: [noticeInteraction({ ...notice, label: notice.linkLabel || '', actions: behavior === 'close' ? ['close'] : [behavior, 'close'] })],
    imageAction: noticeInteraction(notice.imageAction),
  };
}
async function activateNoticeButton(event, action, config) {
  event.preventDefault();
  event.stopPropagation();
  if (noticeActivation || noticeBusyActions.has(action) || noticeDialog.dataset.closing === 'true') {
    return;
  }
  const actions = config.actions;
  const href = contactHref(config.linkHref);
  if (!actions.length || (actions.includes('link') && !href) || (actions.includes('copy') && !config.copyValue?.trim())) return;
  const closing = actions.includes('close');
  noticeBusyActions.add(action);
  action.setAttribute('aria-disabled', 'true');
  const effect = { action, cancelled: false, frame: 0 };
  try {
    // Start external actions synchronously while this click still grants user activation.
    if (actions.includes('link') && !appPlatform) window.open(href, '_blank', 'noopener,noreferrer');
    const copies = [];
    if (actions.includes('copy')) copies.push(copyAccessValue(config.copyValue.trim(), '内容', action));
    if (actions.includes('link') && appPlatform) copies.push(copyAccessValue(href, '链接', action));
    const operation = Promise.all(copies).then(results => results.every(Boolean));
    noticeDialog.scrollTop = 0;
    noticeDialog.querySelector('.notice-sheet').scrollTop = 0;
    if (closing) {
      noticeActions.querySelectorAll('.banner-action').forEach(button => button.getAnimations?.().forEach(animation => animation.cancel()));
      noticeActivation = effect;
      stopNoticeEntry(true);
      noticeDialog.dataset.closing = 'true';
      noticeDialog.dataset.motion = 'button-bounce';
      releaseNoticeModal();
    }
    const base = getComputedStyle(action).transform;
    const pose = base === 'none' ? '' : base;
    const isImage = action.classList.contains('notice-image-action');
    effect.bounce = action.animate?.(reduceMotion.matches ? [{ opacity: 1 }, { opacity: .65 }, { opacity: 1 }] : [
      { transform: `${pose} scale(1)`, offset: 0 },
      { transform: `${pose} scale(${isImage ? .985 : .88})`, offset: .22 },
      { transform: `${pose} scale(${isImage ? 1.01 : 1.1})`, offset: .58 },
      { transform: `${pose} scale(1)`, offset: 1 },
    ], { duration: reduceMotion.matches ? 140 : 300, easing: 'cubic-bezier(.2,.8,.2,1)', fill: 'both' }) || { finished: Promise.resolve(), cancel() {} };
    const [success] = await Promise.all([operation, effect.bounce.finished.catch(() => false)]);
    effect.bounce.cancel(); effect.bounce = null;
    if (!closing) return;
    if (noticeActivation !== effect || effect.cancelled) return;
    if (!success) { finishNoticeActivation(effect); resetNoticeMotion(); flushNoticeUpdate(); return; }
    const completed = reduceMotion.matches ? (finishNoticeActivation(effect, true), true) : await dissolveNotice(effect);
    if (!completed) return;
    noticeDialog.close(); resetNoticeMotion(); flushNoticeUpdate();
  } catch {
    if (closing && noticeActivation === effect) {
      finishNoticeActivation(effect); resetNoticeMotion(); closeNoticeDialog();
    }
  } finally {
    effect.bounce?.cancel();
    noticeBusyActions.delete(action);
    action.removeAttribute('aria-disabled');
  }
}


function renderNoticeActions(notice, image) {
  const config = noticeConfiguration(notice);
  const artwork = image.closest?.('picture') || image;
  noticeActions.replaceChildren();
  if (config.imageAction.actions.length) {
    const poster = document.createElement('button');
    poster.type = 'button'; poster.className = 'notice-image-action';
    poster.setAttribute('aria-label', `海报：${config.imageAction.actions.map(action => ({ link: '打开链接', copy: '复制内容', close: '关闭弹窗' })[action]).join('并')}`);
    poster.append(artwork);
    poster.addEventListener('click', event => activateNoticeButton(event, poster, config.imageAction));
    noticeMedia.replaceChildren(poster);
  } else noticeMedia.replaceChildren(artwork);
  const positions = ['top-left', 'top-center', 'top-right', 'middle-left', 'center', 'middle-right', 'bottom-left', 'bottom-center', 'bottom-right'];
  const groups = new Map();
  config.buttons.forEach(button => {
    const action = document.createElement('button');
    action.type = 'button'; action.className = 'banner-action';
    const label = document.createElement('span'); label.className = 'notice-button-label';
    label.textContent = button.label?.trim() || (button.actions.includes('link') ? '了解详情' : button.actions.includes('copy') ? '复制内容' : '知道了');
    action.append(label);
    const snap = (value, fallback) => Number.isFinite(value) ? Math.min(2, Math.max(0, Math.round(value / 50))) : fallback;
    const index = positions.includes(button.buttonPosition) ? positions.indexOf(button.buttonPosition)
      : snap(button.buttonY, 2) * 3 + snap(button.buttonX, 1);
    const position = positions[index];
    let group = groups.get(position);
    if (!group) {
      group = document.createElement('div'); group.className = 'notice-button-group';
      group.dataset.position = position;
      group.style.setProperty('--notice-button-x', `${index % 3 * 50}%`);
      group.style.setProperty('--notice-button-y', `${Math.floor(index / 3) * 50}%`);
      group.style.alignItems = ['flex-start', 'center', 'flex-end'][index % 3];
      groups.set(position, group); noticeActions.append(group);
    }
    const validColor = value => typeof value === 'string' && /^(?:#[0-9a-f]{3,4}|#[0-9a-f]{6}|#[0-9a-f]{8}|transparent)$/i.test(value);
    if (validColor(button.buttonColor)) action.style.backgroundColor = button.buttonColor;
    if (validColor(button.textColor)) action.style.color = button.textColor;
    action.disabled = !button.actions.length || (button.actions.includes('link') && !contactHref(button.linkHref)) || (button.actions.includes('copy') && !button.copyValue?.trim());
    action.addEventListener('click', event => activateNoticeButton(event, action, button));
    group.append(action);
  });
}

let noticeGeneration = 0;
let noticePreparation = null;
let noticePendingOptions = null;
function flushNoticeUpdate() {
  if (!noticePendingOptions) return;
  const options = noticePendingOptions;
  noticePendingOptions = null;
  initNotice(options);
}
function cancelNoticePreparation() {
  noticePreparation?.cancel();
  noticePreparation = null;
}
function waitForNoticeFrames(generation) {
  return new Promise(resolve => {
    let frame = 0, idle = 0, previous = 0, stable = 0;
    const finish = ready => {
      cancelAnimationFrame(frame);
      if (idle) window.cancelIdleCallback?.(idle);
      if (noticePreparation?.cancel === cancel) noticePreparation = null;
      resolve(ready);
    };
    const cancel = () => finish(false);
    const sample = now => {
      if (generation !== noticeGeneration) { finish(false); return; }
      // The poster belongs to the cabinet; never interrupt another panel or a background tab.
      if (document.hidden || document.body.classList.contains('information-open') || accessDialog?.open
        || noticeDialog?.dataset.closing === 'true') {
        previous = 0; stable = 0;
      } else {
        const interval = previous ? now - previous : 0;
        stable = interval > 0 && interval <= 34 ? stable + 1 : 0;
        previous = now;
        // A stalled frame restarts the check instead of forcing the modal onto a busy page.
        if (stable >= 5) { finish(true); return; }
      }
      frame = requestAnimationFrame(sample);
    };
    noticePreparation = { cancel };
    if (window.requestIdleCallback) {
      idle = window.requestIdleCallback(() => {
        idle = 0;
        frame = requestAnimationFrame(sample);
      }, { timeout: 1000 });
    } else frame = requestAnimationFrame(sample);
  });
}
function initNotice(options = {}) {
  // Admin/live content updates also wait until the current exit has finished.
  if (noticeDialog?.dataset.closing === 'true') {
    noticePendingOptions = { ...options };
    return;
  }
  cancelNoticePreparation();
  const generation = ++noticeGeneration;
  const notice = state.notice;
  if (!noticeDialog) return;
  const shouldShow = options.showNotice !== false && notice?.enabled === true
    && typeof notice.image === 'string' && notice.image.trim();
  if (!shouldShow) {
    if (noticeDialog.open) noticeDialog.close();
    return;
  }

  const image = document.createElement('img');
  image.alt = '';
  image.decoding = 'async';
  const fail = () => {
    if (generation !== noticeGeneration) return;
    cancelNoticePreparation();
    if (noticeDialog.open && noticeDialog.dataset.closing !== 'true') noticeDialog.close();
  };
  image.onload = async () => {
    if (generation !== noticeGeneration) return;
    try {
      if (typeof image.decode === 'function') await image.decode();
      if (!image.complete || !image.naturalWidth || !image.naturalHeight) { fail(); return; }
      await document.fonts?.ready;
    } catch { fail(); return; }
    if (generation !== noticeGeneration) return;
    const ready = await waitForNoticeFrames(generation);
    if (!ready || generation !== noticeGeneration) return;
    noticeDialog.style.setProperty('--notice-ratio', String(image.naturalWidth / image.naturalHeight));
    renderNoticeActions(notice, image);
    if (!noticeDialog.open && typeof noticeDialog.showModal === 'function') {
      document.body.classList.add('dialog-open');
      noticeDialog.showModal();
      noticeDialog.focus();
      playNoticeEnter();
    } else if (noticeDialog.dataset.closing === 'true') {
      playNoticeEnter();
    }
  };
  image.onerror = fail;
  SiteMedia.imagePicture(image, notice.image);
}

function renderLoadError(error) {
  console.error(error);
  if (!emptyState) return;
  // 直接双击 index.html 时协议是 file:，浏览器会拒绝 fetch 本地文件，
  // 此时给出可操作的指引，而不是笼统的「请稍后重试」。
  const isLocalFile = window.location.protocol === "file:";
  const title = emptyState.querySelector("strong");
  const detail = emptyState.querySelector("p");
  emptyState.hidden = false;
  if (isLocalFile) {
    if (title) title.textContent = "本地预览需要启动服务器";
    if (detail) detail.textContent = "不要直接双击打开 index.html。请在仓库根目录运行 python3 -m http.server 8000，然后访问 http://127.0.0.1:8000/site/";
    return;
  }
  if (title) title.textContent = "内容载入失败";
  if (detail) detail.textContent = "无法读取内容文件，请检查网络后重试；持续失败可联系官方。";
}

function bindCollapsibleFilter(picker, options, setExpanded) {
  if (!picker || !options) return;
  document.addEventListener("click", event => {
    if ((picker.dataset.expanded === "true") && !picker.contains(event.target)) setExpanded(false);
  });
  document.addEventListener("keydown", event => {
    if (event.key === "Escape" && (picker.dataset.expanded === "true")) {
      setExpanded(false);
      options.querySelector('[aria-pressed="true"]')?.focus({ preventScroll: true });
      event.preventDefault();
    }
  });
  picker.addEventListener("focusout", event => {
    // A null relatedTarget also occurs during pointer interaction in some browsers.
    if (event.relatedTarget && !picker.contains(event.relatedTarget)) setExpanded(false);
  });
  picker.addEventListener("keydown", event => {
    const buttons = [...options.querySelectorAll("button")];
    if (!["ArrowRight", "ArrowLeft", "ArrowDown", "ArrowUp", "Home", "End"].includes(event.key) || !buttons.length) return;
    event.preventDefault();
    const wasOpen = (picker.dataset.expanded === "true");
    setExpanded(true);
    const index = buttons.indexOf(document.activeElement);
    const selected = buttons.findIndex(button => button.getAttribute("aria-pressed") === "true");
    const next = event.key === "Home" ? 0 : event.key === "End" ? buttons.length - 1
      : !wasOpen || index < 0 ? Math.max(0, selected)
      : (index + (["ArrowRight", "ArrowDown"].includes(event.key) ? 1 : -1) + buttons.length) % buttons.length;
    buttons[next].focus({ preventScroll: true });
    buttons[next].scrollIntoView({ block: "nearest", inline: "nearest" });
  });
}

// 用一份内容重绘整页。管理台的实时预览走的就是这个函数——预览和线上
// 共用同一套渲染代码，所以看到的必然就是发布后的样子，不会有两套实现漂移。
let previewScrollVersion = 0;
function applyContent(content, options = {}) {
  const scrollVersion = ++previewScrollVersion;
  const previewScroll = options.preserveScroll && !options.focusPreview
    ? { x: window.scrollX, y: window.scrollY, information: informationScroll?.scrollTop || 0 } : null;
  const wasPreviewingActivity = state.previewActivityId;
  state.previewActivityId = options.previewActivity || null;
  if (wasPreviewingActivity && !state.previewActivityId) scheduleCarousel();
  // 管理台每敲一个字都会推一次内容。如果重绘把打开的面板关掉或留在旧内容上，
  // 改一个字段就得重新点开一次，等于没有反馈。这里先记下开着的是哪张卡。
  const reopenedCardId = accessDialog?.open ? state.dialogCardId : null;
  // 上一份内容。管理台每敲一个字都会推一份完整内容，这里靠它判断哪一块真的变了。
  const previous = state.source || null;
  const changed = (key) => JSON.stringify(previous?.[key]) !== JSON.stringify(content?.[key]);
  state.source = content;
  state.hero = content.hero || null;
  state.notice = content.notice || null;
  state.contact = content.contact || null;
  state.activities = (content.banners || []).filter((item) => item.visible !== false);
  state.cases = (content.cards || []).filter((item) => item.visible !== false);
  // 只重画真正变了的那一块。以前这里每次都把整页重画一遍——顶部 Rive、轮播、
  // 筛选、联系区、所有卡片全部重建——改一个字段也这样，代价全花在没变的地方。
  if (!previous || changed("hero")) initHeroRive();
  if (!previous || changed("contact")) renderContact();
  if (!previous || changed("banners")) renderActivities();
  if (!previous || changed("cards")) {
    // 分类筛选是从卡片里推出来的，卡片变了它也要跟着重建。
    renderFilters();
    renderCases();
  }
  if (!previous || changed("notice") || options.showNotice !== state.noticeShown) {
    state.noticeShown = options.showNotice;
    initNotice({ showNotice: new URLSearchParams(location.search).get('view') !== 'about' && options.showNotice });
  }
  // 管理台在编辑某张卡的入口时，让这张卡把入口行露出来。这一行平时是
  // display:none，只有展开卡片才出现，不这样做画布上就没有它的位置。
  // 卡片每次都会重建，所以不用清理上一张的标记。
  document.querySelectorAll(".is-access-preview").forEach(element => element.classList.remove("is-access-preview"));
  if (options.previewAccess) {
    const trigger = document.querySelector(`.case-card[data-id="${CSS.escape(options.previewAccess)}"] .case-card-trigger`);
    if (trigger) {
      trigger.classList.add("is-access-preview");
      if (options.focusPreview) trigger.scrollIntoView({ block: "center", behavior: "instant" });
    }
  }

  if (options.previewActivity) {
    const index = state.activities.findIndex(activity => activity.id === options.previewActivity);
    if (index >= 0) setActivity(index, false);
  }

  // Keep the selected featured work visible while editing its artwork.
  const previewFeaturedIndex = featured.slides.findIndex(card => card.dataset.id === options.previewAccess);
  featured.previewId = previewFeaturedIndex >= 0 ? options.previewAccess : null;
  if (previewFeaturedIndex >= 0) setFeatured(previewFeaturedIndex, false);
  else scheduleFeatured();

  const targetCardId = reopenedCardId;
  const target = targetCardId ? state.cases.find((entry) => entry.id === targetCardId) : null;
  if (target) {
    const trigger = document.querySelector(`.case-card[data-id="${CSS.escape(targetCardId)}"] .case-card-trigger`);
    // 重绘前就开着的话只刷新内容，不重播动画。
    mountAccessDialog(target, trigger || undefined, { refresh: true });
  } else if (accessDialog?.open) {
    // 面板开着但那张卡没了（被删掉或被隐藏）：收起来，别留一个空壳。
    accessDialog.close();
  }
  if (typeof options.showInformation === 'boolean') {
    if (options.showInformation) openInformation({ instant: true });
    else closeInformation({ instant: true });
  }
  if (options.scrollTo) {
    // 页面本身设了 scroll-behavior:smooth，用 auto 会走平滑滚动，
    // 预览跳转要的是立刻到位，所以显式 instant。
    document.querySelector(options.scrollTo)?.scrollIntoView({ block: "start", behavior: "instant" });
  }
  if (previewScroll) {
    // Restore after masonry layout and cached image sizing have settled.
    const restore = () => {
      if (scrollVersion !== previewScrollVersion) return;
      window.scrollTo({ left: previewScroll.x, top: previewScroll.y, behavior: 'instant' });
      if (informationScroll) informationScroll.scrollTop = previewScroll.information;
    };
    requestAnimationFrame(() => { restore(); requestAnimationFrame(restore); });
  }
}

// 宿主（管理台）把未发布的 content 推过来。同源校验，避免别的页面往里塞东西。
window.addEventListener("message", (event) => {
  const data = event.data;
  if (!data || data.type !== "qianji:preview") return;
  if (event.origin !== window.location.origin) return;
  document.documentElement.dataset.preview = "true";
  try {
    applyContent(data.content, data.options || {});
  } catch (error) {
    console.error("预览渲染失败", error);
  }
});

// A single live Rive canvas moves between its two homes; the cabinet stays mounted.
const informationPanel = document.querySelector('#information-panel');
const informationScroll = document.querySelector('.information-scroll');
const informationMask = document.querySelector('.information-mask');
const informationTarget = document.querySelector('.information-rive-target');
const profileEntry = document.querySelector('.profile-entry');
const riveFlight = document.querySelector('#rive-flight');
const cabinetContent = document.querySelector('main.app-page');
let informationState = 'closed';
let informationTransition = Promise.resolve();

function brandRect(element) {
  const { left, top, width, height } = element.getBoundingClientRect();
  return { left: `${left}px`, top: `${top}px`, width: `${width}px`, height: `${height}px` };
}
function morphBrand(from, to, opening, instant) {
  if (!activityRiveCanvas || !riveFlight) return Promise.resolve();
  // Keep the drawing surface fixed while flying. Resizing it every frame clears
  // the canvas repeatedly and can make the live Rive disappear during the move.
  const base = opening ? to : from;
  const small = opening ? from : to;
  const width = parseFloat(base.width), height = parseFloat(base.height);
  const dx = parseFloat(small.left) + parseFloat(small.width) / 2 - parseFloat(base.left) - width / 2;
  const dy = parseFloat(small.top) + parseFloat(small.height) / 2 - parseFloat(base.top) - height / 2;
  const scale = Math.min(parseFloat(small.width), parseFloat(small.height)) / Math.min(width, height);
  const compact = `translate(${dx}px, ${dy}px) scale(${scale})`;
  riveFlight.hidden = false;
  Object.assign(riveFlight.style, base);
  riveFlight.style.transform = 'none';
  riveFlight.append(activityRiveCanvas);
  heroRiveInstance?.resizeDrawingSurfaceToCanvas();
  riveFlight.style.transform = opening ? compact : 'none';
  if (instant) return Promise.resolve();
  const animation = riveFlight.animate(opening ? [
    { transform: compact, borderRadius: '50%' },
    { transform: 'none', borderRadius: '0px' },
  ] : [
    { transform: 'none', borderRadius: '0px' },
    { transform: compact, borderRadius: '50%' },
  ], { duration: 850, easing: 'cubic-bezier(.22,1,.36,1)', fill: 'forwards' });
  return animation.finished.catch(() => {});
}
function settleBrand(home) {
  home.append(activityRiveCanvas);
  riveFlight.hidden = true;
  riveFlight.getAnimations().forEach(animation => animation.cancel());
  riveFlight.removeAttribute('style');
  heroRiveInstance?.resizeDrawingSurfaceToCanvas();
}
function maskCircle(rect) {
  const x = rect.left + rect.width / 2, y = rect.top + rect.height / 2;
  const radius = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
  return [`circle(${rect.width / 2}px at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`];
}
function revealInformation(opening, instant) {
  const elements = [...informationPanel.querySelectorAll('.info-reveal')];
  return elements.map((element, index) => {
    if (instant) return null;
    return element.animate(opening ? [
      { opacity: 0, transform: 'translateY(24px)' },
      { opacity: 1, transform: 'translateY(0)' },
    ] : [{ opacity: 1 }, { opacity: 0 }], {
      duration: opening ? 520 : 220,
      delay: opening ? 200 + Math.min(index, 3) * 80 : 0,
      easing: 'cubic-bezier(.22,1,.36,1)', fill: 'both',
    });
  }).filter(Boolean);
}
function openInformation({ instant = false } = {}) {
  if (!informationPanel || informationState !== 'closed') return informationTransition;
  instant ||= reduceMotion.matches;
  informationState = 'opening';
  const circle = profileEntry.getBoundingClientRect();
  const from = brandRect(profileEntry);
  document.body.classList.add('information-open');
  informationPanel.hidden = false;
  informationPanel.inert = false;
  informationScroll.scrollTop = 0;
  const to = brandRect(informationTarget);
  const circles = maskCircle(circle);
  const maskAnimation = instant ? null : informationMask.animate(
    [{ clipPath: circles[0] }, { clipPath: circles[1] }],
    { duration: 780, easing: 'cubic-bezier(.22,1,.36,1)', fill: 'both' });
  const reveals = revealInformation(true, instant);
  cabinetContent.inert = true;
  profileEntry.setAttribute('aria-expanded', 'true');
  informationPanel.focus({ preventScroll: true });
  informationTransition = Promise.all([
    morphBrand(from, to, true, instant),
    maskAnimation?.finished.catch(() => {}),
    ...reveals.map(animation => animation.finished.catch(() => {})),
  ]).then(() => {
    settleBrand(informationTarget);
    maskAnimation?.cancel();
    reveals.forEach(animation => animation.cancel());
    informationState = 'open';
  });
  return informationTransition;
}
function closeInformation({ instant = false } = {}) {
  if (!informationPanel || informationState === 'closed') return Promise.resolve();
  if (informationState === 'opening') return informationTransition.then(() => closeInformation({ instant }));
  if (informationState === 'closing') return informationTransition;
  instant ||= reduceMotion.matches;
  informationState = 'closing';
  const from = brandRect(informationTarget);
  const to = brandRect(profileEntry);
  const circles = maskCircle(profileEntry.getBoundingClientRect());
  const maskAnimation = instant ? null : informationMask.animate(
    [{ clipPath: circles[1] }, { clipPath: circles[0] }],
    { duration: 780, easing: 'cubic-bezier(.65,0,.35,1)', fill: 'both' });
  const reveals = revealInformation(false, instant);
  informationTransition = Promise.all([
    morphBrand(from, to, false, instant),
    maskAnimation?.finished.catch(() => {}),
    ...reveals.map(animation => animation.finished.catch(() => {})),
  ]).then(() => {
    settleBrand(profileEntry);
    informationPanel.hidden = true;
    informationPanel.inert = true;
    maskAnimation?.cancel();
    reveals.forEach(animation => animation.cancel());
    cabinetContent.inert = false;
    document.body.classList.remove('information-open');
    profileEntry.setAttribute('aria-expanded', 'false');
    informationState = 'closed';
    profileEntry.focus({ preventScroll: true });
  });
  return informationTransition;
}
function bindInformation() {
  profileEntry?.addEventListener('click', () => openInformation());
  informationTarget?.addEventListener('click', () => closeInformation(), { capture: true });
  document.addEventListener('keydown', event => {
    if (informationState === 'closed' || accessDialog?.open || noticeDialog?.matches(':modal')) return;
    if (event.key === 'Escape') { event.preventDefault(); closeInformation(); }
    if (event.key === 'Tab') {
      const controls = [...informationPanel.querySelectorAll('button:not(:disabled), a[href], [tabindex="0"]')]
        .filter(element => element.getClientRects().length && !element.closest('[inert]'));
      const first = controls[0], last = controls.at(-1);
      if (event.shiftKey && (document.activeElement === first || document.activeElement === informationPanel)) {
        event.preventDefault(); last?.focus();
      } else if (!event.shiftKey && (document.activeElement === last || document.activeElement === informationPanel)) {
        event.preventDefault(); first?.focus();
      }
    }
  });
}

async function initialize() {
  bindInformation();
  document.querySelectorAll('[data-site-page]').forEach(link => {
    if (!appPlatform) return;
    const url = new URL(link.href);
    url.searchParams.set('appPlatform', appPlatform);
    link.href = url.href;
  });
  bindCollapsibleFilter(document.querySelector("#platform-picker"), platformButtons, setPlatformExpanded);
  bindCollapsibleFilter(categoryTabs, categoryTabs, setCategoryExpanded);
  // 卡片详情保留关闭键；公告弹窗仅由配置的关闭动作退出。
  accessDialog?.querySelector(".dialog-close")?.addEventListener("click", closeAccessDialog);
  bindCarouselControls();
  bindFeaturedControls();
  bindCaseControls();

  bindAccessDialog();
  bindNoticeDialog();
  initRipples();
  try {
    // 单一数据源：顶部 Rive、公告、联系方式、横幅、卡片都来自同一个 JSON，
    // 因此发布内容只需要编辑 data/content.json，不必改动页面代码。
    const content = await loadJson("./data/content.json");
    const adminPreview = window.parent !== window && new URLSearchParams(location.search).has('adminPreview');
    applyContent(content, adminPreview ? { showNotice: false } : {});
    if (new URLSearchParams(location.search).get('view') === 'about') openInformation({ instant: true });
  } catch (error) {
    // 内容读取失败时仍然初始化顶部：hero 会回退到 HERO_DEFAULTS。
    initHeroRive();
    renderLoadError(error);
  }
  // 内容渲染后再观察滚动入场，避免 content 加载前区块就已“进入视口”。
  initReveal();
}

initialize();
