#!/usr/bin/env node
/**
 * 千机百变 GEO 构建脚本
 * 单一数据源：data/content.json。
 * 每次更新作品后运行 `node scripts/build.mjs`，会重新生成：
 *   - cases/<id>.html  每个作品的独立页面（含结构化数据）
 *   - cases/<id>.md    每个作品的 Markdown 版本（供 LLM/Agent 读取）
 *   - index.md         首页的 Markdown 版本（品牌信息 + 作品列表 + 常见问题）
 *   - sitemap.xml      站点地图
 *   - index.html 中的 ItemList JSON-LD（GEO:ITEMLIST 标记之间）
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const BASE = "https://qu-bl.github.io/one-fuzhu/site";
const TODAY = new Date().toISOString().slice(0, 10);

const data = JSON.parse(readFileSync(join(root, "data/content.json"), "utf8"));
const cards = (data.cards || []).filter((c) => c.visible !== false);

/* ---------- 工具函数 ---------- */

const esc = (s = "") =>
  String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const slugOf = (id) =>
  String(id).replace(/[^a-z0-9]+/gi, "-").replace(/^-+|-+$/g, "").toLowerCase() || "case";

const PLATFORM_ZH = { Apple: "Apple", Android: "Android", HarmonyOS: "鸿蒙 HarmonyOS" };
const platformZh = (p) => PLATFORM_ZH[p] || p;

const descriptionOf = (c) => c.description || c.details || c.summary || "";

function videoHref(video) {
  if (!video || typeof video.id !== "string") return null;
  if (video.platform === "youtube" && /^[A-Za-z0-9_-]{11}$/.test(video.id)) return `https://www.youtube.com/watch?v=${video.id}`;
  if (video.platform === "bilibili" && /^BV[A-Za-z0-9]{10}$/.test(video.id)) return `https://www.bilibili.com/video/${video.id}/`;
  if (video.platform === "douyin" && /^\d{10,25}$/.test(video.id)) return `https://www.douyin.com/video/${video.id}`;
  return null;
}

/** 作品的可访问外部链接（跳过待发布/占位内容） */
function externalLinks(c) {
  const links = [];
  const href = videoHref(c.video);
  if (href) links.push({ label: c.video.platform === "youtube" ? "YouTube" : c.video.platform === "bilibili" ? "哔哩哔哩" : "抖音", url: href });
  for (const item of (c.access?.items || [])) {
    if (!item || typeof item.url !== "string") continue;
    if (/待发布|待替换|展示样例/.test(item.url)) continue;
    try {
      const u = new URL(item.url);
      if (["https:", "http:"].includes(u.protocol)) links.push({ label: item.label || u.hostname, url: u.href });
    } catch { /* 忽略非 URL 值 */ }
  }
  return links;
}

const pageName = (c) => `${c.name || "未命名作品"} · 千机百变`;

/* ---------- 作品独立页面 ---------- */

function casePage(c, slug) {
  const links = externalLinks(c);
  const platforms = (c.platforms || []).map(platformZh).join("、");
  const tags = (c.tags || []).map(esc);
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": ["WebPage", "CreativeWork"],
        "@id": `${BASE}/cases/${slug}.html#work`,
        url: `${BASE}/cases/${slug}.html`,
        name: c.name || "",
        description: descriptionOf(c),
        inLanguage: "zh-CN",
        isPartOf: { "@id": `${BASE}/#website` },
        creator: c.partnerName ? { "@type": "Organization", name: c.partnerName } : undefined,
        keywords: tags.join(", ") || undefined,
      },
      {
        "@type": "BreadcrumbList",
        "@id": `${BASE}/cases/${slug}.html#breadcrumb`,
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "千机百变", item: `${BASE}/` },
          { "@type": "ListItem", position: 2, name: c.name || "作品", item: `${BASE}/cases/${slug}.html` },
        ],
      },
    ],
  };
  // 去掉 undefined 字段
  jsonLd["@graph"].forEach((node) => Object.keys(node).forEach((k) => node[k] === undefined && delete node[k]));

  const linkHtml = links.length
    ? `<section><h2>访问与视频</h2><div class="case-links">${links
        .map((l) => `<a href="${esc(l.url)}" target="_blank" rel="noopener noreferrer">${esc(l.label)}</a>`)
        .join("")}</div></section>`
    : "";

  return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
  <meta name="theme-color" content="#faf9fd">
  <meta name="robots" content="index, follow, max-image-preview:large">
  <title>${esc(pageName(c))}</title>
  <meta name="description" content="${esc(descriptionOf(c) || c.summary || "")}">
  <link rel="canonical" href="${BASE}/cases/${slug}.html">
  <link rel="alternate" type="text/markdown" href="${BASE}/cases/${slug}.md">
  <link rel="describedby" href="${BASE}/llms.txt">
  <link rel="icon" href="../assets/favicon.svg" type="image/svg+xml">
  <meta property="og:type" content="article">
  <meta property="og:site_name" content="千机百变">
  <meta property="og:title" content="${esc(pageName(c))}">
  <meta property="og:description" content="${esc(descriptionOf(c) || c.summary || "")}">
  <meta property="og:url" content="${BASE}/cases/${slug}.html">
  <meta property="og:locale" content="zh_CN">
  <meta name="twitter:card" content="summary">
  <link rel="stylesheet" href="../styles.css">
  <script type="application/ld+json">${JSON.stringify(jsonLd)}</script>
</head>
<body>
  <main class="case-page">
    <a class="case-back" href="../index.html">← 返回千机百变</a>
    <article class="case-article">
      <p class="case-kicker">${esc(c.category || "千机百变作品")}</p>
      <h1>${esc(c.name || "")}</h1>
      <p class="case-meta">${c.partnerName ? `创作者：${esc(c.partnerName)} · ` : ""}支持平台：${esc(platforms)}</p>
      <p class="case-lead">${esc(c.summary || "")}</p>
      <section><h2>详情</h2><p>${esc(descriptionOf(c) || c.summary || "信息整理中。")}</p></section>
      ${tags.length ? `<section><h2>关键词</h2><ul class="case-tag-list">${tags.map((t) => `<li>${t}</li>`).join("")}</ul></section>` : ""}
      ${linkHtml}
    </article>
  </main>
  <footer class="site-footer">
    <span>© ${new Date().getFullYear()} 千机百变</span>
    <a href="../index.html">返回首页</a>
    <a href="../terms.html">用户协议</a>
    <a href="../privacy.html">隐私政策</a>
  </footer>
</body>
</html>
`;
}

function caseMarkdown(c) {
  const links = externalLinks(c);
  const lines = [
    `# ${c.name || "未命名作品"}`,
    "",
    `> ${c.summary || ""}`,
    "",
    c.partnerName ? `- 创作者：${c.partnerName}` : "",
    `- 分类：${c.category || "千机百变作品"}`,
    `- 支持平台：${(c.platforms || []).map(platformZh).join("、")}`,
    ...((c.tags || []).length ? [`- 关键词：${c.tags.join("、")}`] : []),
    "",
    "## 详情",
    "",
    descriptionOf(c) || c.summary || "信息整理中。",
    "",
  ];
  if (links.length) {
    lines.push("## 访问与视频", "");
    for (const l of links) lines.push(`- [${l.label}](${l.url})`);
    lines.push("");
  }
  return lines.filter((l, i) => !(l === "" && lines[i - 1] === "")).join("\n") + "\n";
}

/* ---------- 首页 Markdown 版本 ---------- */

const FAQ = [
  {
    q: "千机百变是什么？",
    a: "千机百变（应用包名 com.bolin.one）是一款以 Rive 驱动的下一代屏幕美化与互动创作工具，由 qu-bl 开发并运营，面向鸿蒙（HarmonyOS）、Android 与 Apple 平台。它把传统小组件与动态壁纸带入会思考、会回应、有温度的新时代：拟人角色、AI 陪伴、异形屏互动与家庭信息面板都能成为现实，同时支持 Rive 动画调试、脚本运行、资源包制作与可选同步。",
  },
  {
    q: "千机百变和 KWGT、KLWP 有什么区别？",
    a: "KWGT 以桌面小组件、KLWP 以动态壁纸著称。千机百变在此基础上更进一步：以 Rive 动画与状态机驱动，内容真正可交互、可响应——触摸、传感器与数据变化都会触发动画反馈；支持鸿蒙、Android 与 Apple 跨平台运行；可适配圆屏、长条屏等异形屏幕，用于拟人角色、家庭陪伴与智能家居信息面板等场景。",
  },
  {
    q: "千机百变在鸿蒙上有哪些优化？",
    a: "千机百变针对鸿蒙（HarmonyOS）进行了大量独家优化与适配：性能损耗低，帧率稳定且高，长时间运行不易发热；功能与交互行为与其他平台保持一致，跨设备体验统一；版本更新勤，持续适配鸿蒙新特性，助力鸿蒙生态的互动内容体验。",
  },
  {
    q: "千机百变支持哪些平台？",
    a: "千机百变支持鸿蒙 HarmonyOS、Android 与 Apple 平台。Apple 版使用 iCloud 同步，Android 版支持用户自行配置的 WebDAV 服务器同步，鸿蒙版使用华为账号与华为云端同步。",
  },
  {
    q: "千机百变提供哪些创作能力？",
    a: "千机百变提供 Rive 调试台、Rive 在线编辑器、数据流检查器与运行时分析仪、应用脚本（JavaScript）、资源包制作台与端云同步能力，配合官方 Rive 中文课程，适合从入门到进阶的创作者。",
  },
  {
    q: "千机百变如何处理数据与隐私？",
    a: "千机百变的基础功能不需要账号与密码，数据以明文形式保存在本机；同步功能由华为云、iCloud 或用户自行配置的 WebDAV 服务器提供；应用不使用第三方广告或行为追踪服务。",
  },
  {
    q: "如何联系千机百变团队？",
    a: "可通过邮箱 156405968@qq.com 联系千机百变团队；创作者交流 QQ 群号为 862835994。",
  },
];

function indexMarkdown() {
  const lines = [
    "# 千机百变（Qianji Baibian）",
    "",
    "> 千机百变（应用包名 com.bolin.one）是一款以 Rive 驱动的下一代屏幕美化与互动创作工具，面向鸿蒙（HarmonyOS）、Android 与 Apple 平台。它把小组件与动态壁纸带入会思考、会回应、有温度的新时代——每一块屏幕，都可以拥有自己的表情、性格与陪伴感。",
    "",
    "## 产品定位",
    "",
    "- 超越 KWGT 与 KLWP 的新一代美化工具：在桌面小组件（KWGT）与动态壁纸（KLWP）的经典玩法之上，用 Rive 状态机带来真正可交互、可响应的动态内容——触摸有反馈、数据会变化、动画有生命感，而不只是静态贴图与循环动画。",
    "- 个人与家庭陪伴：拟人角色、互动桌宠与 AI 陪伴设计，让手机、平板与桌面屏幕像家人一样有温度；声音、触摸与传感器都可以成为角色回应的方式。",
    "- 智能家居中枢：圆屏、长条屏等异形屏幕可作为家庭信息面板与互动中枢，展示时间、天气与设备状态，成为智能家居里会说话、会回应的一员。",
    "- 学习与创作生态：官方 Rive 中文课程、调试台、在线编辑器、JavaScript 脚本与资源包制作台，让每个人都能把想法做成可体验的作品，并与更多伙伴分享。",
    "- 隐私与本地优先：基础功能无需账号，无广告、无行为追踪；数据默认保存在本机，是否同步由你决定。",
    "",
    "## 鸿蒙专属优化",
    "",
    "- 独家深度适配：针对鸿蒙（HarmonyOS）进行大量独家优化与适配，从运行框架到端云同步均为鸿蒙生态量身打造。",
    "- 性能损耗低：运行开销经过精细优化，资源占用低，长时间使用依然流畅。",
    "- 帧率稳定且高：动画运行帧率稳定、保持高帧，Rive 动态内容始终顺滑。",
    "- 不发热：功耗控制出色，长时间运行不易发热。",
    "- 行为与其他平台一致：功能与交互行为跨平台统一，体验无缝衔接。",
    "- 更新勤：版本迭代频繁，持续打磨新特性、稳定性与鸿蒙新版本适配。",
    "- 助力鸿蒙生态：与华为账号、华为云端同步深度协同，为鸿蒙生态持续贡献可互动、有温度的创意内容。",
    "",
    "## 品牌信息",
    "",
    "- 官网：https://qu-bl.github.io/one-fuzhu/site/",
    "- 开发者：qu-bl（GitHub：https://github.com/qu-bl）",
    "- 联系邮箱：156405968@qq.com",
    "- 创作者交流群（QQ）：862835994",
    "- 支持平台：鸿蒙 HarmonyOS、Android、Apple",
    "- 主要能力：Rive 调试台、Rive 在线编辑器、数据流检查器与运行时分析仪、应用脚本（JavaScript）、资源包制作台、端云同步（华为云 / iCloud / WebDAV）",
    "",
    "## 作品与项目",
    "",
  ];
  for (const c of cards) {
    lines.push(`- [${c.name}](${BASE}/cases/${slugOf(c.id)}.html)：${c.summary || ""}`);
  }
  lines.push("", "## 常见问题", "");
  for (const f of FAQ) {
    lines.push(`### ${f.q}`, "", f.a, "");
  }
  lines.push("## 页面", "", `- [首页](${BASE}/)`, `- [用户服务协议](${BASE}/terms.html)`, `- [隐私政策](${BASE}/privacy.html)`, "");
  return lines.join("\n");
}

/* ---------- sitemap ---------- */

function sitemap() {
  const urls = [
    { loc: `${BASE}/`, priority: "1.0", freq: "weekly" },
    { loc: `${BASE}/terms.html`, priority: "0.4", freq: "yearly" },
    { loc: `${BASE}/privacy.html`, priority: "0.4", freq: "yearly" },
    ...cards.map((c) => ({ loc: `${BASE}/cases/${slugOf(c.id)}.html`, priority: "0.7", freq: "monthly" })),
  ];
  const xml = urls
    .map(
      (u) =>
        `  <url>\n    <loc>${u.loc}</loc>\n    <lastmod>${TODAY}</lastmod>\n    <changefreq>${u.freq}</changefreq>\n    <priority>${u.priority}</priority>\n  </url>`
    )
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${xml}\n</urlset>\n`;
}

/* ---------- 首页 ItemList JSON-LD ---------- */

function itemListJson() {
  const list = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    "@id": `${BASE}/#showcase`,
    name: "千机百变创意橱柜作品",
    itemListElement: cards.map((c, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: c.name || "",
      url: `${BASE}/cases/${slugOf(c.id)}.html`,
      description: descriptionOf(c) || c.summary || "",
    })),
  };
  return `<script type="application/ld+json">${JSON.stringify(list)}</script>`;
}

/* ---------- 执行 ---------- */

const casesDir = join(root, "cases");
mkdirSync(casesDir, { recursive: true });

for (const c of cards) {
  const slug = slugOf(c.id);
  writeFileSync(join(casesDir, `${slug}.html`), casePage(c, slug));
  writeFileSync(join(casesDir, `${slug}.md`), caseMarkdown(c));
  console.log(`✓ cases/${slug}.html  cases/${slug}.md`);
}

writeFileSync(join(root, "sitemap.xml"), sitemap());
console.log("✓ sitemap.xml");

writeFileSync(join(root, "index.md"), indexMarkdown());
console.log("✓ index.md");

// 更新 index.html 中的 ItemList JSON-LD
const indexPath = join(root, "index.html");
const html = readFileSync(indexPath, "utf8");
const startMark = "<!-- GEO:ITEMLIST:START -->";
const endMark = "<!-- GEO:ITEMLIST:END -->";
const start = html.indexOf(startMark);
const end = html.indexOf(endMark);
if (start === -1 || end === -1) {
  console.warn("⚠ 未在 index.html 中找到 GEO:ITEMLIST 标记，跳过 ItemList 注入");
} else {
  const patched = html.slice(0, start + startMark.length) + "\n" + itemListJson() + "\n" + html.slice(end);
  writeFileSync(indexPath, patched);
  console.log("✓ index.html ItemList JSON-LD 已更新");
}
