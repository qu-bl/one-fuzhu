const activityTrack = document.querySelector("#activity-track");
const activityDots = document.querySelector("#activity-dots");
const activityCarousel = document.querySelector("#activity-carousel");
const activityStatus = document.querySelector("#activity-status");
const activityTemplate = document.querySelector("#activity-template");
const activityRiveCanvas = document.querySelector("#activity-rive-canvas");
const activityRiveFallback = document.querySelector("#activity-rive-fallback");
const caseTemplate = document.querySelector("#case-template");
const caseGrid = document.querySelector("#case-grid");
const categoryTabs = document.querySelector("#category-tabs");
const searchInput = document.querySelector("#case-search");
const platformButtons = document.querySelector("#platform-buttons");
const emptyState = document.querySelector("#empty-state");
const accessDialog = document.querySelector("#access-dialog");
const accessTitle = document.querySelector("#access-title");
const accessSummary = document.querySelector("#access-summary");
const accessMedia = document.querySelector("#access-media");
const accessItems = document.querySelector("#access-items");
const copyToast = document.querySelector("#copy-toast");
const contactSection = document.querySelector("#contact");
const contactLabel = document.querySelector("#contact-label");
const contactTitle = document.querySelector("#contact-title");
const contactSummary = document.querySelector("#contact-summary");
const contactMethods = document.querySelector("#contact-methods");
const noticeDialog = document.querySelector("#notice-dialog");
const noticeTitle = document.querySelector("#notice-title");
const noticeMedia = document.querySelector("#notice-media");
const noticeBody = document.querySelector("#notice-body");
const noticeActions = document.querySelector("#notice-actions");
const requestedPlatform = new URLSearchParams(window.location.search).get("appPlatform");
const appPlatform = ["Apple", "Android", "HarmonyOS"].includes(requestedPlatform)
  ? requestedPlatform
  : null;

// 站点在 content.json 缺少某些分区时（旧版 schemaVersion 1）回退到这些默认值，
// 保证只更新站点文件、不更新内容文件时页面仍然可用。
const HERO_DEFAULTS = {
  rive: {
    src: "./assets/hero-cat.riv",
    artboard: "Artboard 2",
    stateMachine: "State Machine 1",
    autoplay: true,
  },
  fallback: { src: "./assets/hero-cat.webp", alt: "猫咪触摸跟随动画预览" },
  ariaLabel: "猫咪触摸跟随互动动画",
};

const state = {
  activities: [],
  activityIndex: 0,
  cases: [],
  hero: null,
  contact: null,
  notice: null,
  category: "全部",
  platform: appPlatform || "全部平台",
  query: "",
  timer: null,
  paused: false,
  dialogTrigger: null,
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
  accessMedia.replaceChildren();
  if (accessDialog.open) accessDialog.close();
  document.body.classList.remove("dialog-open");
}

function fallbackCopy(value) {
  const input = document.createElement("textarea");
  input.value = value;
  input.setAttribute("readonly", "");
  input.style.position = "fixed";
  input.style.opacity = "0";
  document.body.append(input);
  input.select();
  const copied = document.execCommand("copy");
  input.remove();
  if (!copied) throw new Error("copy failed");
}

async function copyAccessValue(value, label, button) {
  try {
    if (navigator.clipboard?.writeText && window.isSecureContext) {
      await navigator.clipboard.writeText(value);
    } else {
      fallbackCopy(value);
    }
    button.dataset.copied = "true";
    if (copyToast) {
      copyToast.textContent = `已复制${label}`;
      copyToast.dataset.visible = "true";
    }
    window.setTimeout(() => {
      delete button.dataset.copied;
      if (copyToast) delete copyToast.dataset.visible;
    }, 1600);
  } catch (error) {
    console.error(error);
    if (copyToast) {
      copyToast.textContent = "复制失败，请重试";
      copyToast.dataset.visible = "true";
      window.setTimeout(() => delete copyToast.dataset.visible, 2200);
    }
  }
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

function renderAccessMedia(item, accessMedia = document.querySelector("#access-media")) {
  accessMedia.replaceChildren();
  const video = SiteMedia.videoSource(item.video);
  accessMedia.hidden = !video && !item.cover;
  accessMedia.style.aspectRatio = String(video?.ratio || 16 / 9);
  accessMedia.classList.toggle("access-media--portrait", Boolean(video && video.ratio < 1));
  // 第三方播放器只在用户明确操作后加载，避免外部页面在 WebView 中接管顶层导航。
  if (video) {
    // 有封面时先把封面当作视频海报铺上，播放按钮再叠加在其上（两者都是绝对/相对定位）。
    // 否则封面会在这一步被 replaceChildren 清掉，表现为「填了封面却不显示」。
    if (item.cover) {
      const poster = document.createElement("img");
      poster.src = item.cover;
      poster.alt = item.coverAlt || `${item.name || item.title}封面`;
      accessMedia.append(poster);
    }
    const loadButton = document.createElement("button");
    loadButton.type = "button";
    loadButton.className = "video-load";
    loadButton.textContent = "播放视频";
    loadButton.setAttribute("aria-label", `播放${item.name || item.title}视频`);
    loadButton.addEventListener("click", event => {
      event.stopPropagation();
      if (loadButton.closest(".featured-carousel")) pauseFeatured();
      accessMedia.replaceChildren(createPlayerFrame(item, video));
    });
    accessMedia.append(loadButton);
    return;
  }
  if (item.cover) {
    const poster = document.createElement("img");
    poster.src = item.cover;
    poster.alt = item.coverAlt || `${item.name || item.title}封面`;
    accessMedia.append(poster);
  }
}

function mountAccessDialog(item, trigger) {
  if (!accessDialog || !accessItems) return;
  const access = getAccess(item);
  state.dialogTrigger = trigger;
  const sourceBounds = trigger?.getBoundingClientRect();
  renderAccessMedia(item);

  accessTitle.textContent = access.title || item.name || item.title;
  accessSummary.textContent = item.description || access.description || access.summary || item.summary || "";
  accessSummary.hidden = !accessSummary.textContent;
  accessItems.replaceChildren();

  renderAccessItems(item, accessItems);

  document.body.classList.add("dialog-open");
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
  const entries = [...access.items];
  const video = SiteMedia.videoSource(item.video);
  if (video && !entries.some(entry => SiteMedia.accessAction(entry).href === video.href)) {
    entries.unshift({platform: video.platform, value: video.href});
  }
  entries.forEach((accessItem) => {
    const meta = ACCESS_META[accessItem.platform];
    if (!meta) return;
    const action = SiteMedia.accessAction(accessItem);
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
    label.textContent = accessItem.label || meta.label;
    option.append(icon, label);
    if (action.type === "unavailable") {
      const status = document.createElement("small");
      status.textContent = "待发布";
      option.append(status);
    }
    if (action.type === "copy") {
      option.setAttribute("aria-label", `复制${accessItem.label || meta.label}`);
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
      action.addEventListener("click", () => {
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

function initHeroRive() {
  const hero = state.hero || HERO_DEFAULTS;
  const rive = hero.rive || HERO_DEFAULTS.rive;
  const fallback = hero.fallback || HERO_DEFAULTS.fallback;

  // 兜底图先按数据设置，这样即使 Rive 运行时不可用（例如外部 CDN 被拦截），
  // 首屏依然是内容里指定的那张图。
  if (activityRiveFallback) {
    if (fallback.src) activityRiveFallback.src = fallback.src;
    if (fallback.alt) activityRiveFallback.alt = fallback.alt;
  }
  if (hero.ariaLabel) {
    activityRiveCanvas?.closest(".activity-rive")?.setAttribute("aria-label", hero.ariaLabel);
  }

  if (!activityRiveCanvas || !window.rive?.Rive || !rive.src) return;

  let instance;
  const resize = () => instance?.resizeDrawingSurfaceToCanvas();
  const options = {
    src: rive.src,
    canvas: activityRiveCanvas,
    autoplay: rive.autoplay !== false && !reduceMotion.matches,
    isTouchScrollEnabled: true,
    onLoad: () => {
      resize();
      activityRiveCanvas.removeAttribute("aria-hidden");
      activityRiveFallback?.setAttribute("hidden", "");
    },
  };
  // 留空表示使用 .riv 文件里的默认画板与状态机，交给 Rive 自行选择。
  if (rive.artboard) options.artboard = rive.artboard;
  if (rive.stateMachine) options.stateMachine = rive.stateMachine;
  instance = new window.rive.Rive(options);

  const observer = "ResizeObserver" in window ? new ResizeObserver(resize) : null;
  observer?.observe(activityRiveCanvas);
  window.addEventListener("pagehide", () => {
    observer?.disconnect();
    instance.cleanup();
  }, { once: true });
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
  if (state.paused || state.activities.length < 2 || document.hidden) return;
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
  const categories = ["全部", ...new Set(state.cases.map((item) => item.category))];

  categoryTabs.replaceChildren();
  categories.forEach((category) => {
    const button = document.createElement("button");
    button.className = "category-button";
    button.type = "button";
    button.textContent = category;
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
  const platformPicker = document.querySelector("#platform-picker");
  if (appPlatform) {
    platformPicker.hidden = true;
    return;
  }
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
      const expanded = document.querySelector("#platform-picker").dataset.expanded === "true";
      if (!expanded) {
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
    const searchable = [item.name, item.summary, item.details, item.description, item.partnerName, item.category, ...item.platforms, ...item.tags]
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
  const margin = innerWidth < 720 ? 12 : 32;
  const width = Math.min(760, innerWidth - margin * 2);
  return { left: (innerWidth - width) / 2, top: margin, width, height: innerHeight - margin * 2 };
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
    if (isFeatured && Date.now() - featured.lastSwipe < 400) return;
    expandCard(trigger);
  });
  trigger.addEventListener("keydown", event => {
    if (event.target === trigger && !expandedCard && ["Enter", " "].includes(event.key)) {
      event.preventDefault(); expandCard(trigger);
    }
  });
  renderAccessItems(item, trigger.querySelector(".card-access"));
  const summary = item.summary || "";
  const summaryElement = fragment.querySelector(".case-summary");
  summaryElement.textContent = summary;
  summaryElement.hidden = !summary;
  const details = appPlatform ? (item.description || item.summary || "") : (item.details || "");
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
    image.src = item.cover;
    image.alt = item.coverAlt || `${item.name}案例封面`;
  }
  if (SiteMedia.videoSource(item.video)) renderAccessMedia(item, media);
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
  if (featured.paused || featured.slides.length < 2 || document.hidden || expandedCard) return;
  featured.timer = window.setTimeout(() => setFeatured(featured.index + 1), 6000);
}

function pauseFeatured() {
  featured.paused = true;
  window.clearTimeout(featured.timer);
}

function resumeFeatured() {
  featured.paused = false;
  scheduleFeatured();
}

function destroyFeatured() {
  window.clearTimeout(featured.timer);
  featured.index = 0;
  featured.paused = false;
  featured.slides = [];
  featured.dots = [];
  featured.status = null;
}

// The featured banner is the first tile of the waterfall: it spans every column
// and cycles through all cards marked "featured" in data/content.json.
function createFeaturedCarousel(items) {
  const wrapper = document.createElement("div");
  wrapper.className = "featured-carousel";
  wrapper.setAttribute("role", "listitem");
  wrapper.setAttribute("aria-label", "卡片精选");

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
  featured.status = status;

  items.forEach((item, index) => {
    const card = createCaseCard(item, index, { featured: true });
    card.classList.add("featured-slide");
    card.removeAttribute("role");
    viewport.append(card);
    featured.slides.push(card);

    const dot = document.createElement("button");
    dot.type = "button";
    dot.className = "featured-dot";
    dot.setAttribute("aria-label", `显示精选：${item.name}`);
    dot.addEventListener("click", () => setFeatured(index, true));
    dots.append(dot);
    featured.dots.push(dot);
  });

  wrapper.append(viewport, dots, status);
  setFeatured(0, false);
  return wrapper;
}

function bindFeaturedControls() {
  if (!caseGrid) return;
  let startX = null;
  caseGrid.addEventListener("pointerdown", event => {
    if (!event.isPrimary || expandedCard || !event.target.closest(".featured-carousel")) return;
    startX = event.clientX;
    pauseFeatured();
  });
  window.addEventListener("pointerup", event => {
    if (startX === null) return;
    const delta = event.clientX - startX;
    startX = null;
    if (Math.abs(delta) > 48) {
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
}

function renderCases() {
  if (!caseGrid || !caseTemplate || expandedCard) return;
  const items = getFilteredCases();
  cardObserver?.disconnect();
  destroyFeatured();
  caseGrid.replaceChildren();

  const featuredItems = items.filter((item) => item.featured);
  const regularItems = items.filter((item) => !item.featured);

  if (featuredItems.length) caseGrid.append(createFeaturedCarousel(featuredItems));

  regularItems.forEach((item, index) => {
    const card = createCaseCard(item, index);
    caseGrid.append(card);
    if (cardObserver) cardObserver.observe(card);
    else card.dataset.visible = "true";
  });

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
    // 有合法协议就渲染成可点的原生链接；只有号码之类的纯值则退化成可复制按钮。
    const node = document.createElement(href ? "a" : "button");
    if (href) {
      node.href = href;
      if (!href.startsWith("mailto:") && !href.startsWith("tel:") && !href.startsWith("sms:")) {
        node.target = "_blank";
        node.rel = "noopener noreferrer";
      }
    } else {
      node.type = "button";
      const value = String(method.value ?? "");
      node.addEventListener("click", () => copyAccessValue(value, method.label || "联系方式", node));
    }
    node.className = "contact-method";
    const small = document.createElement("small");
    small.textContent = method.label || "";
    const strong = document.createElement("strong");
    strong.textContent = method.value || "";
    node.append(small, strong);
    contactMethods.append(node);
  });

  contactSection.hidden = false;
}

function initNotice() {
  const notice = state.notice;
  if (!noticeDialog || !notice || notice.enabled !== true) return;

  if (notice.title) {
    noticeTitle.textContent = notice.title;
    noticeTitle.hidden = false;
  } else {
    noticeTitle.hidden = true;
  }

  if (notice.image) {
    const image = document.createElement("img");
    image.src = notice.image;
    image.alt = "";
    image.loading = "lazy";
    image.decoding = "async";
    noticeMedia.replaceChildren(image);
    noticeMedia.hidden = false;
  } else {
    noticeMedia.replaceChildren();
    noticeMedia.hidden = true;
  }

  noticeBody.textContent = notice.body || "";
  noticeActions.replaceChildren();
  const href = contactHref(notice.linkHref);
  if (href) {
    const link = document.createElement("a");
    link.className = "banner-action";
    link.href = href;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.textContent = notice.linkLabel || "了解详情";
    noticeActions.append(link);
  }

  const close = () => {
    if (noticeDialog.open) noticeDialog.close();
  };
  const unlock = () => {
    if (!accessDialog?.open) document.body.classList.remove("dialog-open");
  };
  noticeDialog.querySelector(".notice-close")?.addEventListener("click", close);
  noticeDialog.addEventListener("cancel", (event) => {
    event.preventDefault();
    close();
  });
  noticeDialog.addEventListener("click", (event) => {
    if (event.target === noticeDialog) close();
  });
  noticeDialog.addEventListener("close", unlock);

  // 与卡片弹窗一致：先确认浏览器支持 <dialog> 的模态方法，老 WebView 下静默跳过。
  if (!noticeDialog.open && typeof noticeDialog.showModal === "function") {
    document.body.classList.add("dialog-open");
    noticeDialog.showModal();
  }
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
    if (!["ArrowRight", "ArrowLeft", "Home", "End"].includes(event.key) || !buttons.length) return;
    event.preventDefault();
    const wasOpen = (picker.dataset.expanded === "true");
    setExpanded(true);
    const index = buttons.indexOf(document.activeElement);
    const selected = buttons.findIndex(button => button.getAttribute("aria-pressed") === "true");
    const next = event.key === "Home" ? 0 : event.key === "End" ? buttons.length - 1
      : !wasOpen || index < 0 ? Math.max(0, selected)
      : (index + (event.key === "ArrowRight" ? 1 : -1) + buttons.length) % buttons.length;
    buttons[next].focus({ preventScroll: true });
    buttons[next].scrollIntoView({ block: "nearest", inline: "nearest" });
  });
}

async function initialize() {
  if (!appPlatform) {
    bindCollapsibleFilter(document.querySelector("#platform-picker"), platformButtons, setPlatformExpanded);
  }
  bindCollapsibleFilter(categoryTabs, categoryTabs, setCategoryExpanded);
  // 只绑定卡片详情弹窗的关闭键；公告弹窗有自己的 .notice-close。
  accessDialog?.querySelector(".dialog-close")?.addEventListener("click", closeAccessDialog);
  bindCarouselControls();
  bindFeaturedControls();
  bindCaseControls();

  bindAccessDialog();
  try {
    // 单一数据源：顶部 Rive、公告、联系方式、横幅、卡片都来自同一个 JSON，
    // 因此发布内容只需要编辑 data/content.json，不必改动页面代码。
    const content = await loadJson("./data/content.json");
    state.hero = content.hero || null;
    state.notice = content.notice || null;
    state.contact = content.contact || null;
    state.activities = (content.banners || []).filter((item) => item.visible !== false);
    state.cases = (content.cards || []).filter((item) => item.visible !== false);
    initHeroRive();
    renderContact();
    renderActivities();
    renderFilters();
    renderCases();
    initNotice();
  } catch (error) {
    // 内容读取失败时仍然初始化顶部：hero 会回退到 HERO_DEFAULTS。
    initHeroRive();
    renderLoadError(error);
  }
}

initialize();
