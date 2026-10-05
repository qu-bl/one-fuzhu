// 千机百变 GEO 构建管线（单一数据源）
// 运行：node scripts/build.mjs
// 生成/更新：cases/*.html、cases/*.md、sitemap.xml、index.md、llms.txt，
// 并向 index.html 注入供搜索引擎读取的 ItemList/FAQPage JSON-LD。
import { readFileSync, writeFileSync, mkdirSync, readdirSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const REPO_ROOT = join(ROOT, "..");
const SITE = "https://qu-bl.github.io/one-fuzhu/site/";

const FAQ = [
  {
    q: "千机百变是什么？",
    a: "千机百变（应用包名 com.bolin.one）是一款以 Rive 驱动的屏幕美化与互动创作工具，由 qu-bl 开发并运营。它支持 Rive 动画调试、脚本运行、资源包制作与可选同步，也可用于拟人角色、AI 陪伴、异形屏互动和家庭信息面板。",
  },
  {
    q: "千机百变提供哪些创作能力？",
    a: "千机百变提供 Rive 调试台、Rive 在线编辑器、数据流检查器与运行时分析仪、应用脚本（JavaScript）、资源包制作台与端云同步能力，配合官方 Rive 中文课程，适合从入门到进阶的创作者。",
  },
  {
    q: "千机百变如何处理数据与隐私？",
    a: "千机百变的基础功能不需要账号与密码，数据以明文形式保存在本机；启用同步时，数据由当前版本提供或用户配置的同步服务处理；应用不使用第三方广告或行为追踪服务。",
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
      <p>分类：${esc(w.category || "")}　·　伙伴：${esc(w.partnerName || "")}</p>
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

// 移除已不在卡片列表里的旧案例页。生成步骤只写不删，卡片一旦从 content.json
// 移除，它的案例页就成了没有入口的孤儿页，而 sitemap 还会继续把它提交给搜索引擎。
const wanted = new Set(works.flatMap((w) => [w.id + ".html", w.id + ".md"]));
for (const name of readdirSync(join(ROOT, "cases"))) {
  if (wanted.has(name)) continue;
  rmSync(join(ROOT, "cases", name));
  console.log("✓ 移除失效案例页 cases/" + name);
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

// ---------- AI 专用产品资料 ----------

const aiProfile = readFileSync(join(ROOT, "data/ai-profile.md"), "utf-8").trim();
const md = `${aiProfile}

## 作品与项目

${works.map((w) => `- [${w.name}](${caseUrl(w)})：${w.summary}（${(w.platforms || []).join("、")}）`).join("\n")}

## 页面

- [首页](${SITE})
- [用户服务协议](${SITE}terms.html)
- [隐私政策](${SITE}privacy.html)
`;
writeFileSync(join(ROOT, "index.md"), md);
writeFileSync(join(ROOT, "llms.txt"), md);
writeFileSync(join(REPO_ROOT, "llms.txt"), md);
console.log("✓ index.md  site/llms.txt  /llms.txt");

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
    description:
      "以 Rive 驱动的屏幕美化与互动创作工具，支持异形屏幕、拟人角色与家庭信息面板。",
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

// 资源版本号按文件内容生成并写回 index.html。手工维护 ?v= 时，
// 改了 styles.css / app.js 却忘记改版本号，浏览器会继续用旧文件
// （GitHub Pages 对这些资源设了 max-age=600）。
const stampedAssets = ["styles.css", "theme.js", "media.js", "app.js"];
let stamped = 0;
for (const name of stampedAssets) {
  let digest;
  try {
    digest = createHash("sha256").update(readFileSync(join(ROOT, name))).digest("hex").slice(0, 8);
  } catch {
    console.error(`✗ 读不到 ${name}`);
    continue;
  }
  const pattern = `(\\./${name.replace(/\\./g, "\\.")})\\?v=[^"']*`;
  // 先确认引用存在：否则「值本来就对」和「压根没找到」会走同一个分支，
  // 每次无变化的重跑都会误报找不到。
  if (!new RegExp(pattern).test(html)) {
    console.error(`✗ index.html 里未找到 ${name} 的 ?v= 引用`);
    continue;
  }
  const next = html.replace(new RegExp(pattern, "g"), `$1?v=${digest}`);
  if (next !== html) { html = next; stamped += 1; }
}
console.log(`✓ index.html 资源版本号 ${stamped}/${stampedAssets.length} 个已按内容刷新`);

writeFileSync(indexPath, html);
console.log("done");
