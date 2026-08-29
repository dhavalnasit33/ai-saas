console.time("SERVER_STARTUP");
const express = require("express");
const mongoose = require("mongoose");
const axios = require("axios");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
require("dotenv").config();
const cookieParser = require("cookie-parser");

const authRoutes = require("./routes/auth");
const userRoutes = require("./routes/users");
const planRoutes = require("./routes/plans");
const paymentRoutes = require("./routes/payments");
const toolRoutes = require("./routes/tools");
// const historyRoutes = require('./routes/history');
const adminRoutes = require("./routes/admin");
const aiProviderRoutes = require("./routes/aiProviders");
const aiModelRoutes = require("./routes/aiModel");
const toolCategoryRoutes = require("./routes/toolCategories");
const chatHistory = require("./routes/chatHistory");
const contactUserRouter = require("./routes/contactUser");
const yeostSEORouter = require("./routes/yoastSEO");
const braveRoutes = require("./routes/brave");
const pagesRoute = require("./routes/page");
const sitemapRoute = require("./routes/sitemap");
const trendingNewsRoute = require("./routes/trendingNews");
const roleAndPermission = require("./routes/roleAndPermission");
const newsCategoryRoutes = require("./routes/newsCategories");
const AIProviderComparisonRoutes = require("./routes/aiProviderComparison");
const DiscoverRecipesRoutes = require("./routes/discoverRecipes");
const RecipeCollectionsRoutes = require("./routes/discoverRecipeCollections");
const savedRecipesRoutes = require("./routes/savedRecipe");
const tabRoutes = require("./routes/tab");
const destinationRoutes = require("./routes/discoverDestinations");
const destinationCollectionsRoutes = require("./routes/discoverDestinationCollections");
const savedDestinationsRoutes = require("./routes/savedDestination");
const destinationToolRoutes = require("./routes/destinationTool");
const homeToolRoutes = require("./routes/homeToolCategories");
const homeToolTagsRoutes = require("./routes/homeToolTags");
const resumeGeneratorRoutes = require("./routes/resumeGenerator");
const JobProtectionRoutes = require("./models/JobProtection");
const AIJobAutomationCheckerRoutes = require("./models/AIJobAutomationChecker");
const errorHandler = require("./middleware/errorHandler");
const Email = require("./models/Email");
const createCrudRoutes = require("./routes/commonRoutes");
const OnlineIncome = require("./models/OnlineIncome");
const CoverLetterGenerator = require("./models/CoverLetterGenerator");
const FindCompanies = require("./models/FindCompanies");
const {
  validateCommonMiddleware,
  handleValidationErrors,
  validatesuggestedTopicMiddleware,
  validateDocumentsMiddleware,
} = require("./middleware/validation");
const Paraphrase = require("./models/Paraphrase");
const Message = require("./models/Message");
const CheckGrammar = require("./models/CheckGrammar");
const BlogPost = require("./models/BlogPost");
const SocialMedia = require("./models/SocialMedia");
const {
  Wellness,
  Therapy,
  Solutions,
  Marketing,
  FinancialAdvisor,
  Investing,
  InterviewPrep,
  Research,
} = require("./models/BaseTopicSchema");
const WeightLoss = require("./models/WeightLoss");
const NutritionPlanner = require("./models/NutritionPlanner");
const SymptomChecker = require("./models/SymptomChecker");
// const Research = require('./models/Research');
const Funding = require("./models/Funding");
const Documents = require("./models/Documents");
const path = require("path");
const SaveMoney = require("./models/SaveMoney");
const BudgetCalculator = require("./models/BudgetCalculator");
const RetirementCalculator = require("./models/RetirementCalculator");
const LifeGoalsGenerator = require("./models/LifeGoalsGenerator");
const VisionBoardGenerator = require("./models/VisionBoardGenerator");
const KeywordSearch = require("./models/KeywordSearch");
const WebsiteSearch = require("./models/WebsiteSearch");
const NewYearsResolutionGenerator = require("./models/NewYearsResolutionGenerator");
const DebtRelief = require("./models/DebtRelief");
const jobsRoutes = require("./routes/jobs");
const locationRoutes = require("./routes/location");
const dashboardRoutes = require("./routes/dashboard");
const uploadRoutes = require("./routes/upload");
const videoUploadRoutes = require("./routes/videoUpload");
const discoverRoutes = require("./routes/discoverTools");
const converterRoutes = require("./routes/fileConverter");
const stabilityRoutes = require("./routes/stability");
// const downloadAllImages = require("./cron/downloadimage");
const brandedVoiceRoutes = require("./routes/brandedVoice");
// const startSubscriptionCron = require("./cron/subscriptionCron");
const settingRoutes = require("./routes/setting");
const marketingCategoryRoutes = require("./routes/marketingCategory");
const marketingToolRoutes = require("./routes/marketingTool");
const Tool = require("./models/Tool");
const Page = require("./models/Page");
const SeoRecord = require("./models/SeoRecord");
const AIProviderComparison = require("./models/AiComparison");
const MarketingTool = require("./models/MarketingTool");
const CalorieCalculator = require("./models/CalorieCalculator");
const YoastSEO = require("./models/YoastSEO");
const fs = require("fs");
const ContentTranslator = require("./models/TranslateContent ");
const BusinessNameGenerator = require("./models/BusinessNameGenerator");
const SmallBusinessIdeaGenerator = require("./models/SmallBusinessIdeaGenerator");
const createOtherToolRouter = require("./routes/otherTools");
const savedContentManagerRoutes = require("./routes/savedContent");
const savedImagesRoutes = require("./routes/savedImage");
const seoRoutes = require("./routes/seo");
const logoRoutes = require("./routes/logo");
const designRoutes = require("./routes/design");
const userAssetRoutes = require("./routes/userAsset");
const fontsRoutes = require("./routes/font");
const pageBuilderRoutes = require("./routes/pageBuilder");
const editorPagesRoutes = require("./routes/editorPages");
const promptCategoryRoutes = require("./routes/promptCategories");
const promptDataRoutes = require("./routes/promptData");
const tipTapTokenRoutes = require("./routes/tiptapToken");
const storageRoutes = require("./routes/storage");
const inviteRoutes = require("./routes/invite");
const notificationsRoutes = require("./routes/notifications");
const businessProfileRoutes = require("./routes/businessProfile");
const codingPromptTopicRoutes = require("./routes/codingPromptTopics");
const eventRoutes = require("./routes/events");
const imageStyleRoutes = require("./routes/imageStyles");
const aiFilterRoutes = require("./routes/aiFilters");
const imagePromptRoutes = require("./routes/imagePrompts");
const videoPromptRoutes = require("./routes/videoPrompts");
const emailVerifyRoute = require("./routes/emailVerify");
const alternativeToolsRoutes = require("./routes/alternativeTools");
const leadMagnetRoutes = require("./routes/leadMagnet");
const leadMagnetCategoriesRoutes = require("./routes/leadMegnetCategories");
const publishingRoutes = require("./routes/publishing");

// const startTrashCleanupJob = require("./cron/emptyTrash");
const app = express();
app.set("trust proxy", 1);
app.use("/api/webhook-receiver", require("./routes/stripeWebhook"));

// startTrashCleanupJob();
// startSubscriptionCron();
// Security middleware
app.use(helmet());
app.use(
  cors({
    origin: [
      "http://localhost:3000",
      "https://onechatai.ai",
      "http://localhost:59821",
      "http://localhost:5173",
    ],
    credentials: true,
  }),
);

// Body parsing middleware
app.use(express.json({ limit: "200mb" }));
app.use(express.urlencoded({ extended: true, limit: "200mb" }));
app.use(cookieParser());

// Database connection
mongoose
  .connect(process.env.MONGODB_URI || "mongodb://localhost:27017/ai-saas", {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("✅ Connected to MongoDB"))
  .catch((err) => console.error("❌ MongoDB connection error:", err));

app.use(
  "/uploads",
  (req, res, next) => {
    // If the file extension is dangerous, force it to be downloaded, not executed
    if (req.path.match(/\.(html|htm|js|php|sh|svg|exe|pl|cgi)$/i)) {
      res.setHeader("Content-Disposition", "attachment");
      res.setHeader("Content-Type", "application/octet-stream");
    }
    next();
  },
  express.static(path.join(process.cwd(), "uploads"), {
    setHeaders: (res) => {
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
    },
  }),
);

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/plans", planRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/tools", toolRoutes);
app.use("/api/stability", stabilityRoutes);
// app.use('/api/history', historyRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/ai-providers", aiProviderRoutes);
app.use("/api/tool-categories", toolCategoryRoutes);
app.use("/api/ai-models", aiModelRoutes);
app.use("/api/chat-history", chatHistory);
app.use("/api/contact-user", contactUserRouter);
app.use("/api/yoast-seo", yeostSEORouter);
app.use("/api/pages", pagesRoute);
app.use("/api/trending-news", trendingNewsRoute);
app.use("/api", braveRoutes);
app.use("/api", publishingRoutes);
app.use("/", sitemapRoute);
app.use("/api/roleAndPermission", roleAndPermission);
app.use("/api/news-categories", newsCategoryRoutes);
app.use("/api/ai-comparison", AIProviderComparisonRoutes);
app.use("/api/discover-recipes", DiscoverRecipesRoutes);
app.use("/api/discover-recipe-collections", RecipeCollectionsRoutes);
app.use("/api/saved-recipes", savedRecipesRoutes);
app.use("/api/tabs", tabRoutes);
app.use("/api/discover-destinations", destinationRoutes);
app.use("/api/discover-destination-collections", destinationCollectionsRoutes);
app.use("/api/saved-destinations", savedDestinationsRoutes);
app.use("/api/destination-tools", destinationToolRoutes);
app.use(
  "/api/find-companies",
  createCrudRoutes(FindCompanies, "FindCompanies", validateCommonMiddleware),
);
app.use(
  "/api/cover-letter-generator",
  createCrudRoutes(
    CoverLetterGenerator,
    "CoverLetterGenerator",
    validateCommonMiddleware,
  ),
);
app.use(
  "/api/online-income",
  createCrudRoutes(OnlineIncome, "OnlineIncome", validateCommonMiddleware),
);
app.use("/api/resume-generators", resumeGeneratorRoutes);
app.use(
  "/api/ai-job-protection-plan",
  createCrudRoutes(JobProtectionRoutes, "AiJobProtectionPlan", [
    ...validateCommonMiddleware,
    handleValidationErrors,
  ]),
);
app.use(
  "/api/ai-job-automation-checker",
  createCrudRoutes(AIJobAutomationCheckerRoutes, "AiJobAutomationChecker", [
    ...validateCommonMiddleware,
    handleValidationErrors,
  ]),
);
app.use(
  "/api/email",
  createCrudRoutes(Email, "Email", [
    ...validateCommonMiddleware,
    handleValidationErrors,
  ]),
);
app.use(
  "/api/paraphrase",
  createCrudRoutes(Paraphrase, "Paraphrase", [
    ...validateCommonMiddleware,
    handleValidationErrors,
  ]),
);
app.use(
  "/api/message",
  createCrudRoutes(Message, "Message", [
    ...validateCommonMiddleware,
    handleValidationErrors,
  ]),
);
app.use(
  "/api/check-grammar",
  createCrudRoutes(CheckGrammar, "CheckGrammar", [
    ...validateCommonMiddleware,
    handleValidationErrors,
  ]),
);
app.use(
  "/api/blog-post",
  createCrudRoutes(BlogPost, "BlogPost", [
    ...validateCommonMiddleware,
    handleValidationErrors,
  ]),
);
app.use(
  "/api/social-media",
  createCrudRoutes(SocialMedia, "SocialMedia", [
    ...validateCommonMiddleware,
    handleValidationErrors,
  ]),
);
app.use(
  "/api/content-translator",
  createCrudRoutes(ContentTranslator, "ContentTranslator", [
    ...validateCommonMiddleware,
    handleValidationErrors,
  ]),
);
app.use(
  "/api/wellness",
  createCrudRoutes(Wellness, "Wellness", [
    ...validatesuggestedTopicMiddleware,
    handleValidationErrors,
  ]),
);
app.use(
  "/api/therapy",
  createCrudRoutes(Therapy, "Therapy", [
    ...validatesuggestedTopicMiddleware,
    handleValidationErrors,
  ]),
);
app.use(
  "/api/weight-loss",
  createCrudRoutes(WeightLoss, "WeightLoss", [
    ...validateCommonMiddleware,
    handleValidationErrors,
  ]),
);
app.use(
  "/api/nutrition-planner",
  createCrudRoutes(NutritionPlanner, "NutritionPlanner", [
    ...validateCommonMiddleware,
    handleValidationErrors,
  ]),
);
app.use(
  "/api/calorie-calculator",
  createCrudRoutes(CalorieCalculator, "CalorieCalculator", [
    ...validateCommonMiddleware,
    handleValidationErrors,
  ]),
);
app.use(
  "/api/symptom-checker",
  createCrudRoutes(SymptomChecker, "SymptomChecker", [
    ...validateCommonMiddleware,
    handleValidationErrors,
  ]),
);
app.use(
  "/api/solutions",
  createCrudRoutes(Solutions, "Solutions", [
    ...validatesuggestedTopicMiddleware,
    handleValidationErrors,
  ]),
);
app.use(
  "/api/interview-prep",
  createCrudRoutes(InterviewPrep, "InterviewPrep", [
    ...validatesuggestedTopicMiddleware,
    handleValidationErrors,
  ]),
);
app.use(
  "/api/research",
  createCrudRoutes(Research, "Research", [
    ...validatesuggestedTopicMiddleware,
    handleValidationErrors,
  ]),
);
app.use(
  "/api/marketing",
  createCrudRoutes(Marketing, "Marketing", [
    ...validatesuggestedTopicMiddleware,
    handleValidationErrors,
  ]),
);
app.use(
  "/api/funding",
  createCrudRoutes(Funding, "Funding", [
    ...validateCommonMiddleware,
    handleValidationErrors,
  ]),
);
app.use(
  "/api/business-name-generator",
  createCrudRoutes(BusinessNameGenerator, "BusinessNameGenerator", [
    ...validateCommonMiddleware,
    handleValidationErrors,
  ]),
);
app.use(
  "/api/small-business-idea-generator",
  createCrudRoutes(SmallBusinessIdeaGenerator, "SmallBusinessIdeaGenerator", [
    ...validateCommonMiddleware,
    handleValidationErrors,
  ]),
);
app.use(
  "/api/documents",
  createCrudRoutes(Documents, "Documents", [
    ...validateDocumentsMiddleware,
    handleValidationErrors,
  ]),
);
app.use(
  "/api/financial-advisor",
  createCrudRoutes(FinancialAdvisor, "FinancialAdvisor", [
    ...validatesuggestedTopicMiddleware,
    handleValidationErrors,
  ]),
);
app.use(
  "/api/investing",
  createCrudRoutes(Investing, "Investing", [
    ...validatesuggestedTopicMiddleware,
    handleValidationErrors,
  ]),
);
app.use(
  "/api/save-money",
  createCrudRoutes(SaveMoney, "SaveMoney", [
    ...validateCommonMiddleware,
    handleValidationErrors,
  ]),
);
app.use(
  "/api/budget-calculator",
  createCrudRoutes(BudgetCalculator, "BudgetCalculator", [
    ...validateCommonMiddleware,
    handleValidationErrors,
  ]),
);
app.use(
  "/api/retirement-calculator",
  createCrudRoutes(RetirementCalculator, "RetirementCalculator", [
    ...validateCommonMiddleware,
    handleValidationErrors,
  ]),
);

app.use(
  "/api/vision-board-generator",
  createCrudRoutes(VisionBoardGenerator, "VisionBoardGenerator", [
    ...validateCommonMiddleware,
    handleValidationErrors,
  ]),
);

app.use(
  "/api/life-goals-generator",
  createCrudRoutes(LifeGoalsGenerator, "LifeGoalsGenerator", [
    ...validateCommonMiddleware,
    handleValidationErrors,
  ]),
);

app.use(
  "/api/new-years-resolution-generator",
  createCrudRoutes(NewYearsResolutionGenerator, "NewYearsResolutionGenerator", [
    ...validateCommonMiddleware,
    handleValidationErrors,
  ]),
);
app.use(
  "/api/vision-board-generator",
  createCrudRoutes(VisionBoardGenerator, "VisionBoardGenerator", [
    ...validateCommonMiddleware,
    handleValidationErrors,
  ]),
);

app.use(
  "/api/keyword-search",
  createCrudRoutes(KeywordSearch, "keyword-search", [
    ...validateCommonMiddleware,
    handleValidationErrors,
  ]),
);

app.use(
  "/api/website-search",
  createCrudRoutes(WebsiteSearch, "website-search", [
    ...validateCommonMiddleware,
    handleValidationErrors,
  ]),
);

app.use(
  "/api/debt-relief",
  createCrudRoutes(DebtRelief, "DebtRelief", [
    ...validateCommonMiddleware,
    handleValidationErrors,
  ]),
);
app.use("/api/jobs", jobsRoutes);
app.use("/api/locations", locationRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/upload", uploadRoutes);
app.use("/api/video-upload", videoUploadRoutes);
app.use("/api/discover-tool", discoverRoutes);
app.use("/api/converter", converterRoutes);
app.use("/api/settings", settingRoutes);
app.use("/api/marketing-categories", marketingCategoryRoutes);
app.use("/api/marketing-tools", marketingToolRoutes);
app.use("/api/home-tool-categories", homeToolRoutes);
app.use("/api/home-tool-tags", homeToolTagsRoutes);
app.use("/api/brand-voice", brandedVoiceRoutes);
app.use("/api/writing-tools", createOtherToolRouter("writing"));
app.use("/api/career-tools", createOtherToolRouter("career"));
app.use("/api/travel-tools", createOtherToolRouter("travel"));
app.use("/api/food-tools", createOtherToolRouter("food"));
app.use("/api/health-tools", createOtherToolRouter("health"));
app.use("/api/business-tools", createOtherToolRouter("business"));
app.use("/api/finance-tools", createOtherToolRouter("finance"));
app.use("/api/extra-tools", createOtherToolRouter("extra"));
app.use("/api/saved-content", savedContentManagerRoutes);
app.use("/api/saved-images", savedImagesRoutes);
app.use("/api/seo", seoRoutes);
app.use("/api/logo", logoRoutes);
app.use("/api/design", designRoutes);
app.use("/api/user-asset", userAssetRoutes);
app.use("/api/fonts", fontsRoutes);
app.use("/api/page-builder", pageBuilderRoutes);
app.use("/api/editor-pages", editorPagesRoutes);
app.use("/api/prompt-categories", promptCategoryRoutes);
app.use("/api/prompt-data", promptDataRoutes);
app.use("/api/tiptap-token", tipTapTokenRoutes);
app.use("/api/storage", storageRoutes);
app.use("/api/invites", inviteRoutes);
app.use("/api/notifications", notificationsRoutes);
app.use("/api/business-profile", businessProfileRoutes);
app.use("/api/coding-prompt-topics", codingPromptTopicRoutes);
app.use("/api/events", eventRoutes);
app.use("/api/image-styles", imageStyleRoutes);
app.use("/api/ai-filters", aiFilterRoutes);
app.use("/api/image-prompts", imagePromptRoutes);
app.use("/api/video-prompts", videoPromptRoutes);
app.use("/api/email-verify", emailVerifyRoute);
app.use("/api/alternative-tools", alternativeToolsRoutes);
app.use("/api/lead-magnets", leadMagnetRoutes);
app.use("/api/lead-magnet-categories", leadMagnetCategoriesRoutes);

// app.get("/api/download-images", async (req, res) => {
//   try {
//     await downloadAllImages();
//     res.status(200).json({ message: "Images download started!" });
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ error: "Failed to download images." });
//   }
// });

// Health check
app.get("/api/health", (req, res) => {
  res.json({
    status: "OK",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// Error handling middleware
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
// Path to Flutter build on live server
const flutterBuildPath = "/var/www/onechatai/main";

// ---------------------
// Dynamic SEO Middleware
// ---------------------
app.get("*", async (req, res) => {
  try {
    const slug = req.path.slice(1);
    let page = null;
    let seoRecord = null;
    let tool = null;
    let comparison = null;
    let marketingTool = null;

    // Fetch dynamic content
    if (slug) {
      const slugParts = slug.split("/");

      if (slugParts[0] === "tools" && slugParts[1]) {
        tool = await Tool.findOne({ slug: slugParts[1], is_active: true });
      }
      if (slugParts[0] === "marketing" && slugParts[1]) {
        marketingTool = await MarketingTool.findOne({
          slug: slugParts[1],
          is_active: true,
        });
      }

      if (!tool && slugParts.length === 1) {
        page = await Page.findOne({ slug: slug });
      }

      if (!page && !tool && slug.includes("-vs-")) {
        comparison = await AIProviderComparison.findOne({ slug });
      }

      if (!page && !tool && !comparison) {
        const normalizedSlug = slug.replace(/-/g, "").toLowerCase();
        seoRecord = await SeoRecord.findOne({
          $or: [{ slug }, { slug: normalizedSlug }],
        });
      }
    }

    // Fallback Yoast
    let yoastFallback = null;
    if (!page && !seoRecord && !tool && !comparison) {
      yoastFallback = await YoastSEO.findOne().sort({ createdAt: -1 });
    }

    // Load Flutter index.html
    const indexPath = path.join(flutterBuildPath, "index.html");
    let indexHtml = fs.readFileSync(indexPath, "utf8");

    // Pick the best source for SEO
    const source =
      marketingTool || comparison || tool || page || seoRecord || yoastFallback;

    const title =
      source?.title ||
      source?.seo_title ||
      source?.page_title ||
      source?.name ||
      "OneChat AI - AI Tools for Productivity & Automation";

    const description =
      source?.metaDescription ||
      source?.meta_description ||
      source?.page_description?.replace(/<[^>]+>/g, "") ||
      source?.short_description ||
      "50+ AI-powered tools to boost your productivity, automate tasks, and get instant results.";

    const keywords =
      source?.keyPhrase ||
      source?.seo_keyphrase ||
      "AI tools, automation, productivity";

    const ogImage =
      source?.coverImage ||
      source?.cover_image ||
      "https://api.onechatai.ai/uploads/favicon-4.png";

    const pageUrl = `https://onechatai.ai${req.originalUrl}`;

    const pageContent =
      source?.description ||
      (tool ? `<h1>${tool.name}</h1><p>${tool.description || ""}</p>` : "");

    // -------------------------
    // Replace meta tags robustly
    // -------------------------
    indexHtml = indexHtml.replace(
      /<title>[\s\S]*?<\/title>/i,
      `<title>${title}</title>`,
    );

    const metaReplacements = [
      {
        regex: /<meta\s+name=["']description["'][^>]*>/i,
        content: `<meta name="description" content="${description}">`,
      },
      {
        regex: /<meta\s+name=["']keywords["'][^>]*>/i,
        content: `<meta name="keywords" content="${keywords}">`,
      },
      {
        regex: /<meta\s+property=["']og:title["'][^>]*>/i,
        content: `<meta property="og:title" content="${title}">`,
      },
      {
        regex: /<meta\s+property=["']og:description["'][^>]*>/i,
        content: `<meta property="og:description" content="${description}">`,
      },
      {
        regex: /<meta\s+property=["']og:image["'][^>]*>/i,
        content: `<meta property="og:image" content="${ogImage}">`,
      },
      {
        regex: /<meta\s+name=["']twitter:image["'][^>]*>/i,
        content: `<meta name="twitter:image" content="${ogImage}">`,
      },
      {
        regex: /<meta\s+property=["']og:url["'][^>]*>/i,
        content: `<meta property="og:url" content="${pageUrl}">`,
      },
      {
        regex: /<meta\s+property=["']og:type["'][^>]*>/i,
        content: `<meta property="og:type" content="website">`,
      },
      {
        regex: /<meta\s+name=["']twitter:card["'][^>]*>/i,
        content: `<meta name="twitter:card" content="summary_large_image">`,
      },
      {
        regex: /<meta\s+name=["']twitter:title["'][^>]*>/i,
        content: `<meta name="twitter:title" content="${title}">`,
      },
      {
        regex: /<meta\s+name=["']twitter:description["'][^>]*>/i,
        content: `<meta name="twitter:description" content="${description}">`,
      },
      {
        regex: /<meta\s+name=["']twitter:url["'][^>]*>/i,
        content: `<meta name="twitter:url" content="${pageUrl}">`,
      },
    ];

    metaReplacements.forEach((m) => {
      if (indexHtml.match(m.regex)) {
        indexHtml = indexHtml.replace(m.regex, m.content);
      } else {
        // If meta tag does not exist, inject before </head>
        indexHtml = indexHtml.replace(/<\/head>/i, `  ${m.content}\n</head>`);
      }
    });

    // Inject MS tiles
    indexHtml = indexHtml.replace(
      /<\/head>/i,
      `  <meta name="msapplication-TileImage" content="${ogImage}">
         <meta name="msapplication-TileColor" content="#ffffff">
      </head>`,
    );

    // Inject page content into <body> (not <head>)
    indexHtml = indexHtml.replace(
      /<div id="page-content"><\/div>/i,
      `<div id="page-content">${pageContent}</div>`,
    );

    // CSP headers
    const csp = [
      "default-src * data: blob: 'unsafe-inline' 'unsafe-eval';",
      "script-src https://accounts.google.com https://*.google.com * data: blob: 'unsafe-inline' 'unsafe-eval';",
      "style-src * data: blob: 'unsafe-inline';",
      "img-src * data: blob:;",
      "font-src * data: blob:;",
      "connect-src * blob: data: ws: wss:;",
      "frame-src https://accounts.google.com https://*.google.com *;",
      "worker-src * blob:;",
      "prefetch-src *;",
      "object-src *;",
    ].join(" ");

    res.setHeader("Content-Security-Policy", csp);

    // Send modified HTML
    res.send(indexHtml);
  } catch (err) {
    console.error("Error serving dynamic index:", err);
    res.status(500).send("Server error");
  }
});

// Serve static files from Flutter build
app.use(express.static(flutterBuildPath));
console.timeEnd("SERVER_STARTUP");
app.listen(PORT, () => {
  console.log(`Brave proxy running on http://localhost:${PORT}`);
});

// app.listen(PORT, () => {
//   console.log(`🚀 Server running on port ${PORT}`);
// });

module.exports = app;
