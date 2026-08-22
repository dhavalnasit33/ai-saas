// routes/sitemap.js
const express = require("express");
const router = express.Router();
const Tool = require("../models/Tool");
const Page = require("../models/Page");
const AIProviderComparison = require("../models/AiComparison");
const MarketingTool = require("../models/MarketingTool");
const SeoRecord = require("../models/SeoRecord");
const OtherTools = require("../models/OtherTools");
const LeadMagnet = require("../models/LeadMagnet");
const LeadMagnetCategories = require("../models/LeadMegnetCategories");

router.get("/sitemap.xml", (req, res) => {
  const today = new Date().toISOString().split("T")[0];

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <sitemap>
    <loc>https://onechatai.ai/sitemap-main.xml</loc>
    <lastmod>${today}</lastmod>
  </sitemap>
  <sitemap>
    <loc>https://onechatai.ai/ai-behavior-index/sitemap.xml</loc>
    <lastmod>${today}</lastmod>
  </sitemap>
</sitemapindex>`;

  res.header("Content-Type", "application/xml");
  res.status(200).send(xml);
});
router.get("/sitemap-main.xml", async (req, res) => {
  try {
    const baseUrl = "https://onechatai.ai";
    // 1. Static URLs
    const staticUrls = [
      { loc: "/", changefreq: "daily", priority: 1.0 },
      { loc: "/recipe-generator", changefreq: "weekly", priority: 0.7 },
      { loc: "/weight-loss-diet", changefreq: "weekly", priority: 0.7 },
      { loc: "/daily-calorie-calculator", changefreq: "weekly", priority: 0.7 },
      { loc: "/travel-budget-planner", changefreq: "weekly", priority: 0.7 },
      { loc: "/travel-guide", changefreq: "weekly", priority: 0.7 },
      { loc: "/food-chat", changefreq: "weekly", priority: 0.7 },
      // { loc: "/search-tools", changefreq: "weekly", priority: 0.7 },
      {
        loc: "/travel-itinerary-generator",
        changefreq: "weekly",
        priority: 0.7,
      },
    ];

    // Helper to format dates
    const formatDate = (date) => new Date(date).toISOString().split("T")[0];

    // Escape XML special chars to avoid parse errors
    const escapeXml = (unsafe) =>
      unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&apos;");

    // 2. Tool URLs
    const tools = await Tool.find({});
    const toolUrls = tools.map((tool) => ({
      loc: `/tools/${escapeXml(tool.slug)}`,
      lastmod: formatDate(tool.updatedAt || tool.createdAt),
      changefreq: "weekly",
      priority: 0.7,
    }));

    // 3. Marketing Tools
    const marketingTools = await MarketingTool.find({ is_active: true });
    const marketingToolUrls = marketingTools.map((tool) => ({
      loc: `/marketing/${escapeXml(tool.slug)}`,
      lastmod: formatDate(tool.updatedAt || tool.createdAt),
      changefreq: "weekly",
      priority: 0.7,
    }));

    const otherTools = await OtherTools.find({ is_active: true });
    const otherToolUrls = otherTools.map((tool) => {
      const safeType = tool.tool_type.trim().toLowerCase().replace(/\s+/g, "-");

      return {
        loc: `/${escapeXml(safeType)}/${escapeXml(tool.slug)}`,
        lastmod: formatDate(tool.updatedAt || tool.createdAt),
        changefreq: "weekly",
        priority: 0.7,
      };
    });

    // 4. Pages
    const pages = await Page.find({});
    const pageUrls = pages.map((page) => ({
      loc: `/${escapeXml(page.slug)}`,
      lastmod: formatDate(page.updatedAt || page.createdAt),
      changefreq: "monthly",
      priority: 0.6,
    }));

    // 5. Comparisons
    const comparisons = await AIProviderComparison.find({});
    const comparisonUrls = comparisons.map((c) => ({
      loc: `/${escapeXml(c.slug)}`,
      lastmod: formatDate(c.updatedAt || c.createdAt),
      changefreq: "weekly",
      priority: 0.7,
    }));

    const seoRecords = await SeoRecord.find({});
    const excludedSlugs = ["keyword-generator", "keyword-search"];

    const filteredSeoRecords = seoRecords.filter((record) => {
      const hyphenatedSlug = record.model_name
        .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
        .toLowerCase();

      return (
        !["Tab", "DestinationTool"].includes(record.model_name) &&
        !excludedSlugs.includes(hyphenatedSlug)
      );
    });

    const seoUrls = filteredSeoRecords.map((record) => {
      const hyphenatedSlug = record.model_name
        .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
        .toLowerCase();

      return {
        loc: `/${escapeXml(hyphenatedSlug)}`,
        lastmod: formatDate(record.updatedAt || record.createdAt),
        changefreq: "weekly",
        priority: 0.7,
      };
    });

    const leadMagnets = await LeadMagnet.find({
      status: "published",
      is_indexed: true,
    });
    const leadMagnetUrls = leadMagnets.map((lm) => {
      const type = lm.type || "standard";
      let urlPath = "";

      let cleanSlug = lm.slug.replace(/^free-/, "");
      cleanSlug = cleanSlug.replace(/-alternatives$/, "");

      if (type === "alternative") {
        urlPath = `/${cleanSlug}-alternatives`;
      } else {
        urlPath = `/free-${cleanSlug}`;
      }

      return {
        loc: escapeXml(urlPath),
        lastmod: formatDate(lm.updatedAt || lm.createdAt),
        changefreq: "weekly",
        priority: 0.8,
      };
    });

    const leadMagnetCategories = await LeadMagnetCategories.find({
      is_active: true,
    });
    const leadMagnetCategoryUrls = leadMagnetCategories.map((category) => {
      const type = category.type || "standard";
      let urlPath = "";

      let cleanSlug = category.slug.replace(/^free-ai-|^free-/, "");
      cleanSlug = cleanSlug.replace(
        /-ai-tools-alternatives$|-ai-tools$|-alternatives$/,
        "",
      );

      if (type === "alternative") {
        urlPath = `/${cleanSlug}-ai-tools-alternatives`;
      } else {
        urlPath = `/free-${cleanSlug}-ai-tools`;
      }

      return {
        loc: escapeXml(urlPath),
        lastmod: formatDate(category.updatedAt || category.createdAt),
        changefreq: "weekly",
        priority: 0.7,
      };
    });

    const excludedPaths = [
      "/keyword-generator",
      "/keyword-search",
      "/search-tools", // 👈 Added leading slash
      "/brand-voice",
      "/business-profile",
      "/saved-content",
      "/profile",
    ];

    // 7. Merge all URLs
    let allUrls = [
      ...staticUrls,
      ...toolUrls,
      ...marketingToolUrls,
      ...pageUrls,
      ...comparisonUrls,
      ...seoUrls,
      ...otherToolUrls,
      // ...leadMagnetUrls,
      // ...leadMagnetCategoryUrls,
    ];

    // ✅ Filter out the excluded paths
    allUrls = allUrls.filter((url) => !excludedPaths.includes(url.loc));

    // ✅ Map to add the baseUrl
    allUrls = allUrls.map((url) => ({
      ...url,
      loc: `${baseUrl}${url.loc}`,
      lastmod: url.lastmod || formatDate(new Date()),
    }));

    const uniqueUrlsMap = new Map();
    for (const url of allUrls) {
      if (!uniqueUrlsMap.has(url.loc)) {
        uniqueUrlsMap.set(url.loc, url);
      } else {
        // Optional: keep the most recently updated one
        const existing = uniqueUrlsMap.get(url.loc);
        if (new Date(url.lastmod) > new Date(existing.lastmod)) {
          uniqueUrlsMap.set(url.loc, url);
        }
      }
    }
    const uniqueUrls = Array.from(uniqueUrlsMap.values());

    // 8. Build XML
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${uniqueUrls
  .map(
    (url) => `
  <url>
    <loc>${url.loc}</loc>
    <lastmod>${url.lastmod}</lastmod>
    <changefreq>${url.changefreq}</changefreq>
    <priority>${url.priority.toFixed(1)}</priority>
  </url>`,
  )
  .join("")}
</urlset>`;

    res.header("Content-Type", "application/xml");
    res.status(200).send(xml);
  } catch (error) {
    console.error("❌ Sitemap generation failed:", error);
    res.status(500).send("Sitemap generation failed");
  }
});

router.get("/robots.txt", (req, res) => {
  const lines = [
    "User-agent: *",
    "",
    "# Allow everything except what we explicitly block",
    "Allow: /",
    "",
    "# Block OneChat AI internal chat page",
    "Disallow: /chat",
    "",
    "# Block Next.js internal and API routes (ABI App)",
    "Disallow: /api/",
    "Disallow: /_next/",
    "",
    "# Block UTM and tracking URLs",
    "Disallow: /*?utm_*",
    "Disallow: /*?sessionid=*",
    "",
    "# Sitemaps (Points to the new Parent Index Sitemap)",
    "Sitemap: https://onechatai.ai/sitemap.xml",
  ];

  res.type("text/plain");
  res.send(lines.join("\n"));
});
// router.get("/robots.txt", (req, res) => {
//   const lines = [
//     "User-agent: *",
//     "",
//     "# Allow everything except what we explicitly block",
//     "Allow: /",
//     "",
//     "# Block OneChat AI internal chat page",
//     "Disallow: /chat",
//     "",
//     "# Block UTM and tracking URLs",
//     "Disallow: /*?utm_*",
//     "Disallow: /*?sessionid=*",
//     "",
//     "# Sitemaps",
//     "Sitemap: https://onechatai.ai/sitemap.xml",
//   ];

//   res.type("text/plain");
//   res.send(lines.join("\n"));
// });

module.exports = router;
