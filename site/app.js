const $ = selector => document.querySelector(selector);
const activityTrack = $("#activity-track");
const activityDots = $("#activity-dots");
const activityCarousel = $("#activity-carousel");
const activityStatus = $("#activity-status");
const activityTemplate = $("#activity-template");
const caseTemplate = $("#case-template");
const caseGrid = $("#case-grid");
const categoryTabs = $("#category-tabs");
const searchInput = $("#case-search");
const platformButtons = $("#platform-buttons");
const emptyState = $("#empty-state");
const accessDialog = $("#access-dialog");
const accessTitle = $("#access-title");
const accessSummary = $("#access-summary");
const accessMedia = $("#access-media");
const accessItems = $("#access-items");
const copyToast = $("#copy-toast");
const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)");

const state = {
  activities: [],
  activityIndex: 0,
  cases: [],
  category: "全部",
  platform: "全部平台",
  query: "",
  timer: null,
  paused: false,
  dialogTrigger: null
};

const PLATFORM_LABELS = { Apple: "苹果", Android: "安卓", HarmonyOS: "鸿蒙" };
const PLATFORM_ICONS = {
  "全部平台": '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="4" width="6" height="6" rx="2"/><rect x="14" y="4" width="6" height="6" rx="2"/><rect x="4" y="14" width="6" height="6" rx="2"/><rect x="14" y="14" width="6" height="6" rx="2"/></svg>',
  Apple: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M16.9 12.9c0-2.2 1.8-3.3 1.9-3.4-1.1-1.5-2.7-1.7-3.3-1.7-1.4-.1-2.7.8-3.4.8-.7 0-1.8-.8-3-.8-1.5 0-3 .9-3.8 2.3-1.6 2.8-.4 6.9 1.1 9.1.8 1.1 1.7 2.4 2.9 2.3 1.2 0 1.6-.7 3.1-.7 1.4 0 1.9.7 3.1.7 1.3 0 2.1-1.1 2.8-2.2.9-1.3 1.3-2.6 1.3-2.7-.1 0-2.7-1-2.7-3.7zM14.6 6.3c.6-.8 1.1-2 1-3.1-1 .1-2.2.7-2.9 1.5-.6.7-1.1 1.9-1 3 1.1.1 2.2-.5 2.9-1.4z"/></svg>',
  Android: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7.1 8.2h9.8c1.1 0 2 .9 2 2v7.1c0 .6-.5 1.1-1.1 1.1h-1v2.1a1.2 1.2 0 0 1-2.4 0v-2.1H9.6v2.1a1.2 1.2 0 0 1-2.4 0v-2.1h-1c-.6 0-1.1-.5-1.1-1.1v-7.1c0-1.1.9-2 2-2z"/><path d="M7.7 8.1a4.5 4.5 0 0 1 8.6 0M8.1 3.2l1.2 2M15.9 3.2l-1.2 2" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/><circle cx="9.2" cy="6.9" r=".7" fill="var(--icon-cutout, #fff)"/><circle cx="14.8" cy="6.9" r=".7" fill="var(--icon-cutout, #fff)"/></svg>',
  HarmonyOS: '<span class="harmony-logo" aria-hidden="true"></span>'
};
const ACCESS_META = {
  youtube: ["YouTube", "youtube.svg"],
  bilibili: ["哔哩哔哩", "bilibili.svg"],
  xiaohongshu: ["小红书", "xiaohongshu.svg"],
  douyin: ["抖音", "douyin.svg"],
  kdocs: ["金山文档", "kdocs.svg"],
  qq: ["QQ", "qq.svg"],
  github: ["GitHub", "github.svg"]
};

function platformLabel(platform) {
  return platform === "全部平台" ? platform : PLATFORM_LABELS[platform] || platform;
}

function platformIcon(platform, className = "") {
  const icon = document.createElement("span");
  icon.className = ("platform-icon " + className).trim();
  icon.innerHTML = PLATFORM_ICONS[platform] || "";
  icon.title = platformLabel(platform);
  return icon;
}

function webUrl(value) {
  try {
    const url = new URL(value);
    return ["https:", "http:"].includes(url.protocol) && !url.username && !url.password ? url.href : null;
  } catch {
    return null;
  }
}

function videoSource(video) {
  if (!video || typeof video.id !== "string") return null;
  let embed;
  let href;
  if (video.platform === "youtube" && /^[A-Za-z0-9_-]{11}$/.test(video.id)) {
    embed = "https://www.youtube.com/embed/" + video.id + "?autoplay=0&playsinline=1";
    href = "https://www.youtube.com/watch?v=" + video.id;
  } else if (video.platform === "bilibili" && /^BV[A-Za-z0-9]{10}$/.test(video.id)) {
    embed = "https://player.bilibili.com/player.html?bvid=" + video.id + "&autoplay=0&danmaku=0";
    href = "https://www.bilibili.com/video/" + video.id + "/";
  } else if (video.platform === "douyin" && /^\d{10,25}$/.test(video.id)) {
    embed = "https://open.douyin.com/player/video?vid=" + video.id + "&autoplay=0";
    href = "https://www.douyin.com/video/" + video.id;
  } else {
    return null;
  }
  const ratio = Number.isFinite(video.aspectRatio) && video.aspectRatio >= .4 && video.aspectRatio <= 2.4
    ? video.aspectRatio : 16 / 9;
  return { embed, href, ratio, platform: video.platform };
}

function accessAction(item) {
  const value = item.url || item.value;
  if (item.copyable === false || typeof value !== "string" || !value.trim() || /待发布|待替换|展示样例/.test(value)) {
    return { type: "unavailable" };
  }
  const href = webUrl(value);
  if (item.action === "copy" || item.platform === "qq") return { type: "copy", value };
  if (href) return { type: "link", href };
  if (item.action === "link" || /^[a-z][a-z\d+.-]*:/i.test(value)) return { type: "unavailable" };
  return { type: "copy", value };
}

function getAccess(item) {
  return item.access && Array.isArray(item.access.items) ? item.access : { items: [] };
}

function fallbackCopy(value) {
  const input = document.createElement("textarea");
  input.value = value;
  input.readOnly = true;
  input.style.position = "fixed";
  input.style.opacity = "0";
  document.body.append(input);
  input.select();
  const copied = document.execCommand("copy");
  input.remove();
  if (!copied) throw new Error("copy failed");
}

async function copyValue(value, label, button) {
  try {
    if (navigator.clipboard?.writeText && isSecureContext) await navigator.clipboard.writeText(value);
    else fallbackCopy(value);
    button.dataset.copied = "true";
    copyToast.textContent = "已复制" + label;
  } catch {
    copyToast.textContent = "复制失败，请重试";
  }
  copyToast.dataset.visible = "true";
  setTimeout(() => {
    delete button.dataset.copied;
    delete copyToast.dataset.visible;
  }, 1800);
}

function renderMedia(item) {
  accessMedia.replaceChildren();
  const video = videoSource(item.video);
  const cover = item.cover;
  accessMedia.hidden = !video && !cover;
  accessMedia.classList.toggle("access-media--portrait", Boolean(video && video.ratio < 1));
  accessMedia.style.aspectRatio = String(video?.ratio || 16 / 9);
  if (video) {
    const frame = document.createElement("iframe");
    frame.src = video.embed;
    frame.title = (item.name || item.title) + "视频";
    frame.allow = "fullscreen; encrypted-media; picture-in-picture";
    frame.allowFullscreen = true;
    frame.referrerPolicy = "strict-origin-when-cross-origin";
    accessMedia.append(frame);
  } else if (cover) {
    const image = new Image();
    image.src = cover;
    image.alt = item.coverAlt || (item.name || item.title) + "封面";
    accessMedia.append(image);
  }
}

function renderAccess(item) {
  accessItems.replaceChildren();
  const video = videoSource(item.video);
  const entries = getAccess(item).items.filter(entry => entry.platform !== video?.platform);
  if (video) entries.unshift({ platform: video.platform, value: video.href });

  for (const entry of entries) {
    const meta = ACCESS_META[entry.platform];
    if (!meta) continue;
    const action = accessAction(entry);
    const option = document.createElement(action.type === "link" ? "a" : "button");
    const icon = document.createElement("img");
    const label = document.createElement("strong");
    const name = entry.label || meta[0];

    option.className = "access-option";
    option.dataset.platform = entry.platform;
    icon.src = "./assets/platforms/" + meta[1];
    icon.alt = "";
    label.textContent = name;
    option.append(icon, label);

    if (action.type === "link") {
      option.href = action.href;
      option.target = "_blank";
      option.rel = "noopener noreferrer";
      option.setAttribute("aria-label", "前往" + name + "（新窗口）");
    } else {
      option.type = "button";
      option.disabled = action.type === "unavailable";
      if (action.type === "copy") {
        option.setAttribute("aria-label", "复制" + name);
        option.addEventListener("click", () => copyValue(action.value, name, option));
      } else {
        const status = document.createElement("small");
        status.textContent = "待发布";
        option.append(status);
      }
    }
    accessItems.append(option);
  }

  if (!accessItems.children.length) {
    const unavailable = document.createElement("p");
    unavailable.className = "access-unavailable";
    unavailable.textContent = "相关信息还在整理中。";
    accessItems.append(unavailable);
  }
}

function openDialog(item, trigger) {
  state.dialogTrigger = trigger;
  const access = getAccess(item);
  accessTitle.textContent = access.title || item.name || item.title;
  accessSummary.textContent = item.details || item.description || access.description || access.summary || item.summary || "";
  accessSummary.hidden = !accessSummary.textContent;
  renderMedia(item);
  renderAccess(item);
  document.body.classList.add("dialog-open");
  accessDialog.showModal();
  accessDialog.scrollTop = 0;
}

function closeDialog() {
  if (accessDialog.open) accessDialog.close();
}

function scheduleActivity() {
  clearTimeout(state.timer);
  if (!state.paused && state.activities.length > 1 && !document.hidden) {
    state.timer = setTimeout(() => setActivity(state.activityIndex + 1), 7000);
  }
}

function setActivity(index, announce = false) {
  if (!state.activities.length) return;
  state.activityIndex = (index + state.activities.length) % state.activities.length;
  activityTrack.style.transform = "translateX(-" + state.activityIndex * 100 + "%)";
  activityTrack.querySelectorAll(".activity-slide").forEach((slide, slideIndex) => {
    const active = slideIndex === state.activityIndex;
    slide.ariaHidden = String(!active);
    slide.inert = !active;
  });
  activityDots.querySelectorAll("button").forEach((dot, dotIndex) => {
    dot.setAttribute("aria-current", String(dotIndex === state.activityIndex));
  });
  if (announce) activityStatus.textContent = "当前活动：" + state.activities[state.activityIndex].title;
  scheduleActivity();
}

function showCases(category = "全部") {
  state.category = category;
  state.platform = "全部平台";
  state.query = "";
  searchInput.value = "";
  renderFilters();
  renderCases();
  $("#showcase").scrollIntoView({ behavior: reduceMotion.matches ? "auto" : "smooth" });
}

function renderActivities() {
  activityTrack.replaceChildren();
  activityDots.replaceChildren();
  state.activities.forEach((item, index) => {
    const slide = activityTemplate.content.cloneNode(true);
    const article = slide.querySelector(".activity-slide");
    const cover = slide.querySelector(".activity-cover");
    const action = slide.querySelector(".banner-action");
    article.setAttribute("aria-label", (index + 1) + " / " + state.activities.length + "：" + item.title);
    article.querySelector("h2").textContent = item.title;
    article.querySelector("p").textContent = item.summary;
    if (item.cover) {
      cover.src = item.cover;
      cover.alt = item.coverAlt || item.title + "活动视觉";
    } else {
      cover.hidden = true;
    }
    if (item.action === "showcase") {
      action.textContent = item.linkLabel;
      action.addEventListener("click", () => showCases(item.category));
    } else if (getAccess(item).items.length) {
      action.textContent = item.linkLabel || "获取信息";
      action.addEventListener("click", () => openDialog(item, action));
    } else {
      action.hidden = true;
    }
    activityTrack.append(slide);

    const dot = document.createElement("button");
    dot.type = "button";
    dot.className = "activity-dot";
    dot.textContent = item.label;
    dot.setAttribute("aria-label", "显示活动：" + item.title);
    dot.addEventListener("click", () => setActivity(index, true));
    activityDots.append(dot);
  });
  setActivity(0);
}

function renderFilters() {
  const categories = ["全部", ...new Set(state.cases.map(item => item.category).filter(Boolean))];
  categoryTabs.replaceChildren();
  for (const category of categories) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "category-button";
    button.textContent = category;
    button.setAttribute("aria-pressed", String(category === state.category));
    button.addEventListener("click", () => {
      state.category = category;
      renderFilters();
      renderCases();
    });
    categoryTabs.append(button);
  }

  platformButtons.replaceChildren();
  for (const platform of ["全部平台", "Apple", "Android", "HarmonyOS"]) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "platform-button";
    button.title = platformLabel(platform);
    button.setAttribute("aria-label", platformLabel(platform));
    button.setAttribute("aria-pressed", String(platform === state.platform));
    button.append(platformIcon(platform));
    button.addEventListener("click", () => {
      state.platform = platform;
      renderFilters();
      renderCases();
    });
    platformButtons.append(button);
  }
}

function filteredCases() {
  const query = state.query.trim().toLocaleLowerCase("zh-CN");
  return state.cases.filter(item => {
    const category = state.category === "全部" || item.category === state.category;
    const platform = state.platform === "全部平台" || (item.platforms || []).includes(state.platform);
    const text = [item.name, item.summary, item.details, item.partnerName, item.category, ...(item.platforms || []), ...(item.tags || [])]
      .join(" ").toLocaleLowerCase("zh-CN");
    return category && platform && (!query || text.includes(query));
  });
}

function caseCard(item) {
  const fragment = caseTemplate.content.cloneNode(true);
  const card = fragment.querySelector(".case-card");
  const trigger = fragment.querySelector(".case-card-trigger");
  const media = fragment.querySelector(".case-media");
  const image = media.querySelector("img");
  const platforms = fragment.querySelector(".case-platforms");
  const tags = fragment.querySelector(".case-tags");

  card.classList.toggle("case-card--featured", item.featured === true);
  trigger.setAttribute("aria-label", "查看" + item.name + "详情");
  trigger.addEventListener("click", () => openDialog(item, trigger));
  fragment.querySelector(".case-title").textContent = item.name;
  const summary = fragment.querySelector(".case-summary");
  summary.textContent = item.summary || "";
  summary.hidden = !summary.textContent;

  if (item.cover) {
    image.src = item.cover;
    image.alt = item.coverAlt || item.name + "案例封面";
  } else {
    media.hidden = true;
  }

  for (const platform of item.platforms || []) platforms.append(platformIcon(platform, "platform-icon--case"));
  for (const tag of [...new Set(item.tags || [])].slice(0, 3)) {
    const chip = document.createElement("span");
    chip.className = "case-tag";
    chip.textContent = tag;
    tags.append(chip);
  }
  tags.hidden = !tags.children.length;
  return card;
}

function renderCases() {
  const items = filteredCases().sort((a, b) => Number(Boolean(b.featured)) - Number(Boolean(a.featured)));
  caseGrid.replaceChildren(...items.map(caseCard));
  emptyState.hidden = items.length > 0;
}

function bindEvents() {
  let startX = null;
  activityCarousel.addEventListener("pointerdown", event => {
    startX = event.clientX;
    state.paused = true;
    clearTimeout(state.timer);
  });
  activityCarousel.addEventListener("pointerup", event => {
    if (startX !== null && Math.abs(event.clientX - startX) > 48) {
      setActivity(state.activityIndex + (event.clientX < startX ? 1 : -1), true);
    }
    startX = null;
    state.paused = false;
    scheduleActivity();
  });
  activityCarousel.addEventListener("pointercancel", () => {
    startX = null;
    state.paused = false;
    scheduleActivity();
  });
  searchInput.addEventListener("input", event => {
    state.query = event.target.value;
    renderCases();
  });
  $(".dialog-close").addEventListener("click", closeDialog);
  accessDialog.addEventListener("cancel", event => {
    event.preventDefault();
    closeDialog();
  });
  accessDialog.addEventListener("click", event => {
    if (event.target === accessDialog) closeDialog();
  });
  accessDialog.addEventListener("close", () => {
    accessMedia.replaceChildren();
    document.body.classList.remove("dialog-open");
    state.dialogTrigger?.focus();
  });
  document.addEventListener("visibilitychange", scheduleActivity);
}

async function initialize() {
  bindEvents();
  try {
    const response = await fetch("./data/content.json", { cache: "no-cache" });
    if (!response.ok) throw new Error("内容请求失败：" + response.status);
    const content = await response.json();
    state.activities = (content.banners || []).filter(item => item.visible !== false);
    state.cases = (content.cards || []).filter(item => item.visible !== false);
    renderActivities();
    renderFilters();
    renderCases();
  } catch (error) {
    console.error(error);
    emptyState.hidden = false;
    emptyState.querySelector("strong").textContent = "内容载入失败";
    emptyState.querySelector("p").textContent = "请稍后重试或联系官方。";
  }
}

initialize();
