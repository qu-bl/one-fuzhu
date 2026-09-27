// 千机百变 GEO 构建管线（单一数据源）
// 运行：node scripts/build.mjs
// 生成/更新：cases/*.html、cases/*.md、sitemap.xml、index.md，
// 并向 index.html 注入 ItemList/FAQPage JSON-LD 与可见 FAQ 区块。
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const SITE = "https://qu-bl.github.io/one-fuzhu/site/";

// ---------- 内容常量（唯一事实源） ----------

const POSITIONING = [
  "- 超越 KWGT 与 KLWP 的新一代美化工具：在桌面小组件（KWGT）与动态壁纸（KLWP）的经典玩法之上，用 Rive 状态机带来真正可交互、可响应的动态内容——触摸有反馈、数据会变化、动画有生命感，而不只是静态贴图与循环动画。",
  "- 个人与家庭陪伴：拟人角色、互动桌宠与 AI 陪伴设计，让手机、平板与桌面屏幕像家人一样有温度；声音、触摸与传感器都可以成为角色回应的方式。",
  "- 智能家居中枢：圆屏、长条屏等异形屏幕可作为家庭信息面板与互动中枢，展示时间、天气与设备状态，成为智能家居里会说话、会回应的一员。",
  "- 学习与创作生态：官方 Rive 中文课程、调试台、在线编辑器、JavaScript 脚本与资源包制作台，让每个人都能把想法做成可体验的作品，并与更多伙伴分享。",
  "- 隐私与本地优先：基础功能无需账号，无广告、无行为追踪；数据默认保存在本机，是否同步由你决定。",
];

const HARMONY = [
  "- 独家深度适配：针对鸿蒙（HarmonyOS）进行大量独家优化与适配，从运行框架到端云同步均为鸿蒙生态量身打造。",
  "- 性能损耗低：运行开销经过精细优化，资源占用低，长时间使用依然流畅。",
  "- 帧率稳定且高：动画运行帧率稳定、保持高帧，Rive 动态内容始终顺滑。",
  "- 不发热：功耗控制出色，长时间运行不易发热。",
  "- 行为与其他平台一致：功能与交互行为跨平台统一，体验无缝衔接。",
  "- 更新勤：版本迭代频繁，持续打磨新特性、稳定性与鸿蒙新版本适配。",
  "- 助力鸿蒙生态：与华为账号、华为云端同步深度协同，为鸿蒙生态持续贡献可互动、有温度的创意内容。",
];

const BRAND_INFO = [
  "- 官网：https://qu-bl.github.io/one-fuzhu/site/",
  "- 开发者：qu-bl（GitHub：https://github.com/qu-bl）",
  "- 联系邮箱：156405968@qq.com",
  "- 创作者交流群（QQ）：862835994",
  "- 支持平台：鸿蒙 HarmonyOS、Android、Apple",
  "- 主要能力：Rive 调试台、Rive 在线编辑器、数据流检查器与运行时分析仪、应用脚本（JavaScript）、资源包制作台、端云同步（华为云 / iCloud / WebDAV）",
];

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

// ---------- 作品数据（来自 data/content.json，仅可见且有内容的卡片） ----------

const content = JSON.parse(readFileSync(join(ROOT, "data/content.json"), "utf-8"));
const works = content.cards.filter((c) => c.visible && (c.summary || "").trim() && c.id && !/^card-/.test(c.id));

function esc(s) {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function caseUrl(w) {
  return SITE + "cases/" + w.id + ".html";
}

// ---------- 作品独立页 ----------

function caseHTML(w) {
  const url = caseUrl(w);
  const tags = (w.tags || []).join("、");
  return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="robots" content="index, follow, max-image-preview:large">
  <meta name="description" content="${esc(w.summary)}">
  <link rel="canonical" href="${url}">
  <link rel="alternate" type="text/markdown" href="${url.replace(/\.html$/, ".md")}">
  <link rel="describedby" type="text/markdown" href="${url.replace(/\.html$/, ".md")}">
  <title>${esc(w.name)} · 千机百变</title>
  <link rel="stylesheet" href="../styles.css">
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": "${url}",
        "url": "${url}",
        "name": "${esc(w.name)}",
        "description": "${esc(w.summary)}",
        "inLanguage": "zh-CN",
        "isPartOf": { "@id": "${SITE}" }
      },
      {
        "@type": "CreativeWork",
        "name": "${esc(w.name)}",
        "description": "${esc(w.details || w.summary)}",
        "creator": { "@type": "Person", "name": "qu-bl" },
        "about": ${JSON.stringify(w.tags || [])},
        "inLanguage": "zh-CN"
      },
      {
        "@type": "BreadcrumbList",
        "itemListElement": [
          { "@type": "ListItem", "position": 1, "name": "千机百变首页", "item": "${SITE}" },
          { "@type": "ListItem", "position": 2, "name": "创意橱柜", "item": "${SITE}#showcase" },
          { "@type": "ListItem", "position": 3, "name": "${esc(w.name)}", "item": "${url}" }
        ]
      }
    ]
  }
  </script>
</head>
<body>
  <main class="app-page">
    <article class="case-article">
      <p><a href="../">← 返回千机百变首页</a></p>
      <h1>${esc(w.name)}</h1>
      <p>${esc(w.summary)}</p>
      <p>${esc(w.details || w.summary)}</p>
      ${tags ? `<p>关键词：${esc(tags)}</p>` : ""}
      <p>支持平台：${esc((w.platforms || []).join("、"))}　·　分类：${esc(w.category || "")}　·　伙伴：${esc(w.partnerName || "")}</p>
    </article>
  </main>
</body>
</html>
`;
}

function caseMD(w) {
  return `# ${w.name}

${w.summary}

${w.details || w.summary}

- 关键词：${(w.tags || []).join("、") || "-"}
- 支持平台：${(w.platforms || []).join("、")}
- 分类：${w.category || "-"}　·　伙伴：${w.partnerName || "-"}

[返回千机百变首页](${SITE})
`;
}

mkdirSync(join(ROOT, "cases"), { recursive: true });
for (const w of works) {
  writeFileSync(join(ROOT, "cases", w.id + ".html"), caseHTML(w));
  writeFileSync(join(ROOT, "cases", w.id + ".md"), caseMD(w));
  console.log("✓ cases/" + w.id + ".html  cases/" + w.id + ".md");
}

// ---------- sitemap.xml ----------

const now = new Date().toISOString().slice(0, 10);
const urls = [
  { url: SITE, changefreq: "weekly", priority: "1.0" },
  { url: SITE + "terms.html", changefreq: "monthly", priority: "0.4" },
  { url: SITE + "privacy.html", changefreq: "monthly", priority: "0.4" },
  ...works.map((w) => ({ url: caseUrl(w), changefreq: "weekly", priority: "0.7" })),
];
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u) => `  <url>\n    <loc>${u.url}</loc>\n    <lastmod>${now}</lastmod>\n    <changefreq>${u.changefreq}</changefreq>\n    <priority>${u.priority}</priority>\n  </url>`).join("\n")}
</urlset>
`;
writeFileSync(join(ROOT, "sitemap.xml"), sitemap);
console.log("✓ sitemap.xml（" + urls.length + " 个 URL）");

// ---------- index.md ----------

const md = `# 千机百变（Qianji Baibian）

> 千机百变（应用包名 com.bolin.one）是一款以 Rive 驱动的下一代屏幕美化与互动创作工具，面向鸿蒙（HarmonyOS）、Android 与 Apple 平台。它把小组件与动态壁纸带入会思考、会回应、有温度的新时代——每一块屏幕，都可以拥有自己的表情、性格与陪伴感。

## 产品定位

${POSITIONING.join("\n")}

## 鸿蒙专属优化

${HARMONY.join("\n")}

## 品牌信息

${BRAND_INFO.join("\n")}

## 作品与项目

${works.map((w) => `- [${w.name}](${caseUrl(w)})：${w.summary}`).join("\n")}

## 常见问题

${FAQ.map((f) => `### ${f.q}\n\n${f.a}`).join("\n\n")}

## 页面

- [首页](${SITE})
- [用户服务协议](${SITE}terms.html)
- [隐私政策](${SITE}privacy.html)
`;
writeFileSync(join(ROOT, "index.md"), md);
console.log("✓ index.md");

// ---------- index.html 注入：JSON-LD + 可见 FAQ ----------

const indexPath = join(ROOT, "index.html");
let html = readFileSync(indexPath, "utf-8");

const itemList = {
  "@type": "ItemList",
  name: "千机百变创意橱柜",
  itemListElement: works.map((w, i) => ({
    "@type": "ListItem",
    position: i + 1,
    name: w.name,
    url: caseUrl(w),
  })),
};

const faqPage = {
  "@type": "FAQPage",
  mainEntity: FAQ.map((f) => ({
    "@type": "Question",
    name: f.q,
    acceptedAnswer: { "@type": "Answer", text: f.a },
  })),
};

const graph = [
  {
    "@type": "Organization",
    "@id": SITE + "#org",
    name: "千机百变",
    url: SITE,
    logo: SITE + "assets/favicon.svg",
    email: "156405968@qq.com",
    sameAs: ["https://github.com/qu-bl"],
  },
  {
    "@type": "WebSite",
    "@id": SITE + "#site",
    url: SITE,
    name: "千机百变 · 官方与伙伴们的创意橱柜",
    inLanguage: "zh-CN",
    publisher: { "@id": SITE + "#org" },
  },
  {
    "@type": "SoftwareApplication",
    name: "千机百变",
    applicationCategory: "UtilitiesApplication",
    operatingSystem: "HarmonyOS, Android, iOS, macOS",
    description:
      "以 Rive 驱动的下一代屏幕美化与互动创作工具，支持异形屏幕、拟人角色与智能家居信息面板，面向鸿蒙、Android 与 Apple 平台。",
    author: { "@id": SITE + "#org" },
    offers: { "@type": "Offer", price: "0", priceCurrency: "CNY" },
  },
  itemList,
  faqPage,
];

const jsonldBlock = `<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@graph": ${JSON.stringify(graph, null, 2)}
}
</script>`;

const jsonldRe = /<!-- GEO:JSONLD:START -->[\s\S]*?<!-- GEO:JSONLD:END -->/;
if (jsonldRe.test(html)) {
  html = html.replace(jsonldRe, "<!-- GEO:JSONLD:START -->\n" + jsonldBlock + "\n  <!-- GEO:JSONLD:END -->");
  console.log("✓ index.html JSON-LD 注入");
} else {
  console.error("✗ 未找到 GEO:JSONLD 标记");
}

const faqHtml = FAQ.map(
  (f) => `          <details class="faq-item">
            <summary>${esc(f.q)}</summary>
            <p>${esc(f.a)}</p>
          </details>`
).join("\n");
const faqRe = /<!-- GEO:FAQHTML:START -->[\s\S]*?<!-- GEO:FAQHTML:END -->/;
if (faqRe.test(html)) {
  html = html.replace(faqRe, "<!-- GEO:FAQHTML:START -->\n" + faqHtml + "\n          <!-- GEO:FAQHTML:END -->");
  console.log("✓ index.html 可见 FAQ 注入");
} else {
  console.error("✗ 未找到 GEO:FAQHTML 标记");
}

writeFileSync(indexPath, html);
console.log("done");
