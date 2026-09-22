const $ = selector => document.querySelector(selector);
const caseTemplate = $("#case-template");
const caseGrid = $("#case-grid");
const emptyState = $("#empty-state");
const accessDialog = $("#access-dialog");
const accessTitle = $("#access-title");
const accessSummary = $("#access-summary");
const accessMedia = $("#access-media");
const accessItems = $("#access-items");
const copyToast = $("#copy-toast");

const PLATFORM_LABELS = { Apple: "Apple", Android: "Android", HarmonyOS: "鸿蒙" };
const PLATFORM_ICONS = {
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
const CONTACT = {
  title: "加入创作者群",
  details: "交流 Rive、资源包、应用脚本、互动设计与三端适配。",
  access: { items: [{ platform: "qq", label: "QQ 创作者交流群", value: "862835994" }] }
};
let dialogTrigger = null;

function platformIcon(platform) {
  const icon = document.createElement("span");
  icon.className = "platform-icon";
  icon.innerHTML = PLATFORM_ICONS[platform] || "";
  icon.title = PLATFORM_LABELS[platform] || platform;
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
  return { type: "unavailable" };
}

function fallbackCopy(value) {
  const input = document.createElement("textarea");
  input.value = value;
  input.readOnly = true;
  input.style.cssText = "position:fixed;opacity:0";
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
  accessMedia.hidden = !video && !item.cover;
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
  } else if (item.cover) {
    const image = new Image();
    image.src = item.cover;
    image.alt = item.coverAlt || (item.name || item.title) + "封面";
    accessMedia.append(image);
  }
}

function renderAccess(item) {
  accessItems.replaceChildren();
  const video = videoSource(item.video);
  const entries = (item.access?.items || []).filter(entry => entry.platform !== video?.platform);
  if (video) entries.unshift({ platform: video.platform, value: video.href });

  for (const entry of entries) {
    const meta = ACCESS_META[entry.platform];
    if (!meta) continue;
    const action = accessAction(entry);
    const option = document.createElement(action.type === "link" ? "a" : "button");
    const icon = document.createElement("img");
    const text = document.createElement("span");
    const strong = document.createElement("strong");
    const label = entry.label || meta[0];

    option.className = "access-option";
    option.dataset.platform = entry.platform;
    icon.src = "./assets/platforms/" + meta[1];
    icon.alt = "";
    strong.textContent = label;
    text.append(strong);
    option.append(icon, text);

    if (action.type === "link") {
      option.href = action.href;
      option.target = "_blank";
      option.rel = "noopener noreferrer";
    } else {
      option.type = "button";
      option.disabled = action.type === "unavailable";
      if (action.type === "copy") option.addEventListener("click", () => copyValue(action.value, label, option));
      else {
        const status = document.createElement("small");
        status.textContent = "待发布";
        text.append(status);
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
  dialogTrigger = trigger;
  accessTitle.textContent = item.access?.title || item.name || item.title;
  accessSummary.textContent = item.details || item.description || item.access?.summary || item.summary || "";
  accessSummary.hidden = !accessSummary.textContent;
  renderMedia(item);
  renderAccess(item);
  document.body.classList.add("dialog-open");
  if (accessDialog.showModal) accessDialog.showModal();
  else accessDialog.setAttribute("open", "");
  accessDialog.scrollTop = 0;
}

function closeDialog() {
  if (accessDialog.open && accessDialog.close) accessDialog.close();
  else accessDialog.removeAttribute("open");
}

function createCard(item) {
  const fragment = caseTemplate.content.cloneNode(true);
  const card = fragment.querySelector(".case-card");
  const trigger = fragment.querySelector(".case-card-trigger");
  const platforms = fragment.querySelector(".case-platforms");
  const tags = fragment.querySelector(".case-tags");

  card.classList.toggle("case-card--featured", item.featured === true);
  trigger.setAttribute("aria-label", "查看" + item.name + "详情");
  trigger.addEventListener("click", () => openDialog(item, trigger));
  fragment.querySelector(".case-category").textContent = item.category || "创意作品";
  fragment.querySelector(".case-title").textContent = item.name;
  fragment.querySelector(".case-summary").textContent = item.summary || "";
  for (const platform of item.platforms || []) platforms.append(platformIcon(platform));
  for (const tag of [...new Set(item.tags || [])].slice(0, 3)) {
    const chip = document.createElement("span");
    chip.textContent = tag;
    tags.append(chip);
  }
  tags.hidden = !tags.children.length;
  return card;
}

function bindEvents() {
  document.querySelectorAll("[data-contact]").forEach(button => {
    button.addEventListener("click", event => openDialog(CONTACT, event.currentTarget));
  });
  if (!accessDialog) return;
  $(".dialog-close")?.addEventListener("click", closeDialog);
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
    dialogTrigger?.focus();
  });
}

async function initialize() {
  bindEvents();
  if (!caseTemplate || !caseGrid || !emptyState) return;
  try {
    const response = await fetch("./data/content.json", { cache: "no-cache" });
    if (!response.ok) throw new Error("内容请求失败：" + response.status);
    const content = await response.json();
    const cards = (content.cards || [])
      .filter(item => item.visible !== false)
      .sort((a, b) => Number(Boolean(b.featured)) - Number(Boolean(a.featured)));
    caseGrid.replaceChildren(...cards.map(createCard));
    emptyState.hidden = cards.length > 0;
  } catch (error) {
    console.error(error);
    emptyState.hidden = false;
  }
}

initialize();
