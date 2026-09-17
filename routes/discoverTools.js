const express = require("express");
const mongoose = require("mongoose");
const {
  modelNameToTitleMap,
  modelNameToSlugMap,
} = require("../utils/seoHelper");
const { default: slugify } = require("slugify");
const { protect } = require("../middleware/auth");
const User = require("../models/User");
const AIProviderComparison = require("../models/AiComparison");
const router = express.Router();
const HomeToolCategory = require("../models/HomeToolCategory");

// Format model name to readable title
function formatTitle(name) {
  if (!name) return "";
  const spaced = name.replace(/([a-z])([A-Z])/g, "$1 $2");
  return spaced.replace(/\b\w/g, (char) => char.toUpperCase());
}

// Generate slug
function generateSlug(title) {
  return slugify(title || "", { lower: true, strict: true });
}

// ✅ Static slug overrides for specific known records
const staticSlugMap = {
  "Recipe Generator": "recipe-generator",
  "Weight Loss Diet": "weight-loss-diet",
  "Travel Budget Planner": "travel-budget-planner",
  "Travel Chat": "travel-chat",
  "Travel Itinerary Generator": "travel-itinerary-generator",
};

// Category Mapping (same as before)
const categoryMapping = {
  writing: [
    "Email",
    "Paraphrase",
    "CheckGrammar",
    "SocialMedia",
    "ContentTranslator ",
    "BlogPost",
  ],
  career: [
    "CoverLetterGenerator",
    "ResumeGenerator",
    "InterviewPrep",
    // "FindCompanies",
    // "AiJobProtectionPlan",
    "AiJobAutomationChecker",
  ],
  business: [
    // "Solutions",
    "Marketing",
    "Research",
    "BusinessNameGenerator",
    "SmallBusinessIdeaGenerator",
  ],
  // food: ["Tab"],
  // travel: ["DestinationTool"],
  // health: [
  //   "Wellness",
  //   "Therapy",
  //   "WeightLoss",
  //   "NutritionPlanner",
  //   "SymptomChecker",
  //   "CalorieCalculator",
  // ],
  finance: [
    "Investing",
    "FinancialAdvisor",
    // "BudgetCalculator",
    "RetirementCalculator",
    // "DebtRelief",
    // "SaveMoney",
  ],
  pages: ["Page"],
  // extra: [
  //   "LifeGoalsGenerator",
  //   "VisionBoardGenerator",
  //   "NewYearsResolutionGenerator",
  // ],
  marketing: ["MarketingTool"],
  otherTool: ["OtherTool"],
  ai_providers: ["AIProviderComparison"],
};

// Find category by model name
function getCategoryByModel(modelName) {
  for (const [cat, models] of Object.entries(categoryMapping)) {
    if (models.includes(modelName)) return cat;
  }
  return "other";
}

// ✅ Fetch model data
async function fetchModelData(modelName, category, searchQuery = "") {
  try {
    const model = mongoose.model(modelName);

    let selectFields = {};
    if (modelName === "OtherTool") {
      selectFields = {
        name: 1,
        tool_type: 1, // Important: We need this to determine the category dynamically
        description: 1,
        short_description: 1,
        mini_description: 1,
        slug: 1,
        icon: 1,
        is_popular: 1,
        custom_url: 1,
        categories: 1,
        tags: 1,
        sticky: 1,
        allternativeTools: 1,
        whatCanDO: 1,
        display_name: 1,
      };
    } else if (modelName === "MarketingTool") {
      selectFields = {
        name: 1,
        icon: 1,
        short_description: 1,
        mini_description: 1,
        description: 1,
        custom_url: 1,
        slug: 1,
        is_popular: 1,
        categories: 1,
        tags: 1,
        sticky: 1,
        allternativeTools: 1,
        whatCanDO: 1,
        display_name: 1,
      };
    } else if (modelName === "AIProviderComparison") {
      selectFields = {
        firstModel: 1,
        secondModel: 1,
        slug: 1,
        description: 1,
        sticky: 1,
      };
    } else if (modelName === "Page") {
      selectFields = {
        page_title: 1,
        tab_image: 1,
        short_description: 1,
        mini_description: 1,
        page_description: 1,
        slug: 1,
        categories: 1,
        tags: 1,
        sticky: 1,
        allternativeTools: 1,
        whatCanDO: 1,
        display_name: 1,
      };
    } else {
      selectFields = {
        tab_image: 1,
        short_description: 1,
        mini_description: 1,
        description: 1,
        long_description: 1,
        title: 1,
        slug: 1,
        categories: 1,
        tags: 1,
        sticky: 1,
        allternativeTools: 1,
        whatCanDO: 1,
        display_name: 1,
      };
    }

    let docs;
    if (modelName === "AIProviderComparison") {
      docs = await model
        .find({}, selectFields)
        .populate("firstModel", "name title description image modelName")
        .populate("secondModel", "name title description image modelName")
        .lean();
    } else {
      docs = await model
        .find({}, selectFields)
        .populate("allternativeTools")
        .populate("tags", "name")
        .lean();
    }

    if (!docs.length) return [];

    return (
      docs
        .map((doc) => {
          let finalTitle;

          if (modelName === "Tab" || modelName === "DestinationTool") {
            finalTitle =
              doc.title ||
              doc.short_description ||
              doc.description?.split(".")[0] ||
              modelName;
          } else if (modelName === "Page") {
            finalTitle = doc.page_title || formatTitle(modelName);
          } else if (modelName === "MarketingTool") {
            finalTitle =
              modelNameToTitleMap[doc.name] ||
              doc.name ||
              formatTitle(modelName);
          } else if (modelName === "AIProviderComparison") {
            finalTitle = doc.title || doc.keyPhrase || formatTitle(modelName);
          } else if (modelName === "OtherTool") {
            // 👇 Handle OtherTool Title
            finalTitle = doc.name;
          } else {
            finalTitle =
              modelNameToTitleMap[modelName] || formatTitle(modelName);
          }

          const staticTitleMap = {
            "Doc Editor": "WorkSpace",
            "Generate Image Chatgpt": "ChatGPT",
            "Generate Image Gemini": "Gemini (Nano Banana)",
            "Generate Image Stable": "Stable Diffusion",
            "Generate Image Flux": "Flux",
            "Generate Image Seedream": "Seedream",
            "Generate Image Recraft": "Recraft",
            "Generate Image Ideogram": "Ideogram",
            "Generate Image krea": "Krea",
            "Generate Video Sora": "Sora",
            "Generate Video Veo": "Gemini (Veo)",
            "Generate Video Runway": "Runway",
            "Generate Video Kling": "Kling",
            "Generate Video Pika": "Pika",
            "Generate Video SeeDance": "Seedance",
            "Generate Video MiniMax": "MiniMax",
            "Generate Video Wan": "Wan",
            "Generate Video Pixverse": "Pixverse",
            Storage: "Cloud Storage",
            "Chat PDF Converter": "Chat with PDF",
            "WebP to PNG converter": "WebP to PNG",
            "WebP to JPG converter": "WebP to JPG",
            "JPG to WebP converter": "JPG to WebP",
            "PNG to WebP converter": "PNG to WebP",
            "PNG to JPG converter": "PNG to JPG",
            "JPG to PNG converter": "JPG to PNG",
            "Convert JPG to PNG": "JPG to PNG",
            "Convert PNG to JPG": "PNG to JPG",
            "Convert PNG to WebP": "PNG to WebP",
            "Convert JPG to WebP": "JPG to WebP",
            "Convert WebP to JPG": "WebP to JPG",
            "Convert WebP to PNG": "WebP to PNG",
            Coding: "AI Coding Assistant",
            "Email Builder": "Email Template Builder",
            "Page Builder": "Landing Page Builder",
            "Visual Editor": "Design Editor",
            "Generate Image": "Compare AI Image Models",
            "Remove Background": "Background Remover",
            "Remove Object": "Object Remover",
            "Replace Background": "Background Replacer",
            "Upscale Image": "Image Upscaler",
            "Logo Generator": "Logo Maker",
            "Multi-Chat": "Compare AI Chat Models",
            "Generate AI Videos": "Compare AI Video Models",
          };

          // This ensures the rename happens regardless of the model type!
          finalTitle = staticTitleMap[finalTitle?.trim()] || finalTitle;
          // ✅ Apply static slug override if exists
          const staticSlug = staticSlugMap[finalTitle?.trim()] || null;
          const Slug = generateSlug(finalTitle);
          const finalSlug =
            staticSlug ||
            doc.slug ||
            modelNameToSlugMap[modelName] ||
            Slug ||
            doc.title?.toLowerCase().replace(/\s+/g, "-") ||
            null;

          if (modelName === "OtherTool") {
            return {
              _id: doc._id,
              model_name: modelName,
              title: finalTitle,
              tab_image: doc.icon || null, // Map 'icon' to 'tab_image'
              short_description: doc.short_description || null,
              mini_description: doc.mini_description || null,
              description: doc.description || null,
              slug: finalSlug,
              sticky: doc.sticky || false,
              category: "otherTools",
              tool_type: doc.tool_type || "other",
              is_popular: doc.is_popular || false,
              custom_url: doc.custom_url || null,
              categories: doc.categories || [],
              tags: doc.tags || [],
              allternativeTools: doc.allternativeTools || [], // ✅ Added
              whatCanDO: doc.whatCanDO || [], // ✅ Added
              display_name: doc.display_name || "",
            };
          }

          if (modelName === "MarketingTool") {
            return {
              _id: doc._id,
              model_name: modelName,
              title: finalTitle,
              is_popular: doc.is_popular || null,
              sticky: doc.sticky || false,
              tab_image: doc.icon || null,
              custom_url: doc.custom_url || null,
              short_description: doc.short_description || null,
              mini_description: doc.mini_description || null,
              description: doc.description || null,
              slug: finalSlug,
              category,
              categories: doc.categories || [],
              tags: doc.tags || [],
              allternativeTools: doc.allternativeTools || [], // ✅ Added
              whatCanDO: doc.whatCanDO || [], // ✅ Added
              display_name: doc.display_name || "",
            };
          }

          if (modelName === "AIProviderComparison") {
            return {
              _id: doc._id,
              model_name: modelName,
              firstModel: doc.firstModel || null,
              secondModel: doc.secondModel || null,
              slug: finalSlug,
              description: doc.description || null,
              category,
              sticky: doc.sticky || false,
            };
          }

          if (modelName === "Page") {
            return {
              _id: doc._id,
              model_name: modelName,
              title: finalTitle,
              tab_image: doc.tab_image || null,
              short_description: doc.short_description || null,
              mini_description: doc.mini_description || null,
              description: doc.page_description || null,
              slug: finalSlug,
              category,
              categories: doc.categories || [],
              tags: doc.tags || [],
              sticky: doc.sticky || false,
              allternativeTools: doc.allternativeTools || [], // ✅ Added
              whatCanDO: doc.whatCanDO || [], // ✅ Added
              display_name: doc.display_name || "",
            };
          }

          return {
            _id: doc._id,
            model_name: modelName,
            tab_image: doc.tab_image || null,
            short_description: doc.short_description || null,
            mini_description: doc.mini_description || null,
            description: doc.description || doc.long_description || null,
            title: finalTitle,
            slug: finalSlug,
            category,
            categories: doc.categories || [],
            tags: doc.tags || [],
            sticky: doc.sticky || false,
            allternativeTools: doc.allternativeTools || [], // ✅ Added
            whatCanDO: doc.whatCanDO || [], // ✅ Added
            display_name: doc.display_name || "",
          };
        })
        // ✅ Only filter by tab_image for Page model
        .filter((item) => {
          if (modelName === "Page") {
            return item.tab_image && item.tab_image.trim() !== "";
          }
          return true; // keep all others even if tab_image empty
        })
        // ✅ Filter by search term (case-insensitive)
        .filter((item) => {
          if (!searchQuery) return true;

          if (modelName === "AIProviderComparison") {
            return (
              item.firstModel?.name?.toLowerCase().includes(searchQuery) ||
              item.firstModel?.title?.toLowerCase().includes(searchQuery) ||
              item.secondModel?.name?.toLowerCase().includes(searchQuery) ||
              item.secondModel?.title?.toLowerCase().includes(searchQuery)
            );
          }

          return (
            item.title?.toLowerCase().includes(searchQuery) ||
            item.short_description?.toLowerCase().includes(searchQuery) ||
            item.mini_description?.toLowerCase().includes(searchQuery) ||
            item.description?.toLowerCase().includes(searchQuery)
          );
        })
    );
  } catch (error) {
    console.error(`Error fetching ${modelName}:`, error);
    return [];
  }
}

async function fetchAllToolsData(searchQuery = "") {
  const allModelPromises = Object.entries(categoryMapping).map(
    async ([category, modelNames]) => {
      const modelResults = await Promise.all(
        modelNames.map((m) => fetchModelData(m, category, searchQuery)),
      );
      return modelResults.flat();
    },
  );

  const allResults = await Promise.all(allModelPromises);
  return allResults.flat();
}

// ✅ Helper function to remove duplicate tools by slug
function deduplicateTools(tools) {
  const uniqueToolsMap = new Map();

  tools.forEach((item) => {
    // Fallback to ID if slug is somehow missing
    const uniqueKey = item.slug || item._id.toString();

    if (!uniqueToolsMap.has(uniqueKey)) {
      uniqueToolsMap.set(uniqueKey, item);
    } else {
      const existingItem = uniqueToolsMap.get(uniqueKey);
      const genericModels = ["MarketingTool", "Page", "OtherTool"];

      // If the currently saved item is generic, but the new one is specific, swap it out
      if (
        genericModels.includes(existingItem.model_name) &&
        !genericModels.includes(item.model_name)
      ) {
        uniqueToolsMap.set(uniqueKey, item);
      }
    }
  });

  return Array.from(uniqueToolsMap.values());
}

// ✅ GET all tools
router.get("/", protect, async (req, res) => {
  try {
    const searchQuery = req.query.search?.toLowerCase() || "";

    // Fetch all tools
    let allData = await fetchAllToolsData(searchQuery);

    // ✅ Deduplicate the tools right here!
    allData = deduplicateTools(allData);

    let userBookmarks = [];

    // ✅ Check if user is logged in (optional token)
    if (req.user && req.user.id) {
      try {
        const user = await User.findById(req.user.id).lean();
        userBookmarks = user?.bookmarks || [];
      } catch (err) {
        console.warn("User lookup failed, defaulting to no bookmarks");
      }
    }

    // ✅ Exclude only for Page model
    const excludedRecord = [
      // "generate-image",
      // "remove-background",
      // "replace-background",
      // "upscale-image",
      // "remove-object",
      "convert-jpg-to-png",
      "jpg-to-png-converter",
      "convert-png-to-jpg",
      "png-to-jpg-converter",
      "jpg-to-webp-converter",
      "convert-jpg-to-webp",
      "convert-webp-to-jpg",
      "webp-to-jpg-converter",
      "convert-png-to-webp",
      "png-to-webp-converter",
      "convert-webp-to-png",
      "WebP to PNG converter",
      "grammar-checker",
      "budget-calculator",
      "webp-to-png-converter",
      "convert-webp-to-png",
      "daily-calorie-calculator",
      "health",
      "food",
      "check-meal-calories",
      "travel-vacation-destinations",
      "travel",
      "dinner-lunch-recipes",
      "job-search",
      "ai-job-protection-plan",
      "search-tools",
      "brainstorm-business-ideas",
      "instagram-caption-generator",
      "life-goals-generator",
      "vision-board-generator",
      "new-years-resolution-generator",
      "chat-with-pdf",
      "finance",
      "jobs",
      "business",
      "pdf-converter",
      "images",
      "copywriting",
      "brand-voice",
    ];

    const filteredData = allData.filter((item) => {
      // Only exclude if this is a Page model
      if (item.model_name === "Page" || item.model_name === "MarketingTool") {
        return !excludedRecord.includes(item.slug?.toString());
      }
      return true; // keep all other models untouched
    });

    // ✅ Add bookmarked flag to filtered data
    let dataWithBookmarks = filteredData.map((item) => {
      const isBookmarked = userBookmarks.some(
        (b) =>
          b.itemId.toString() === item._id.toString() &&
          b.modelName === item.model_name,
      );
      return { ...item, bookmarked: isBookmarked };
    });

    // ⭐ NEW: SORT FLAT LIST BY STICKY FIRST, THEN BY DATE ⭐
    dataWithBookmarks.sort((a, b) => {
      const aSticky = a.sticky ? 1 : 0;
      const bSticky = b.sticky ? 1 : 0;
      if (bSticky !== aSticky) {
        return bSticky - aSticky;
      }
      return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
    });

    res.json({
      success: true,
      total: dataWithBookmarks.length,
      data: dataWithBookmarks,
    });
  } catch (error) {
    console.error("Error fetching all tools:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching all tools",
    });
  }
});
// ✅ Add or remove a bookmark (toggle)
router.post("/bookmarks", protect, async (req, res) => {
  try {
    const { itemId, modelName } = req.body;

    if (!itemId || !modelName) {
      return res.status(400).json({
        success: false,
        message: "itemId and modelName are required",
      });
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    // ensure array exists
    if (!Array.isArray(user.bookmarks)) {
      user.bookmarks = [];
    }

    const existingIndex = user.bookmarks.findIndex(
      (b) => b.itemId.toString() === itemId && b.modelName === modelName,
    );

    let action = "";
    if (existingIndex === -1) {
      // ✅ Add bookmark
      user.bookmarks.push({ itemId, modelName });
      action = "added";
    } else {
      user.bookmarks.splice(existingIndex, 1);
      action = "removed";
    }

    await user.save();

    res.json({
      success: true,
      message: `Bookmark ${action} successfully`,
      action,
      totalBookmarks: user.bookmarks.length,
    });
  } catch (err) {
    console.error("❌ Error toggling bookmark:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

router.get("/bookmarks", protect, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).lean();
    if (!user)
      return res
        .status(404)
        .json({ success: false, message: "User not found" });

    const bookmarks = user.bookmarks || [];
    if (!bookmarks.length)
      return res.json({
        success: true,
        message: "No bookmarks found",
        total: 0,
        data: [],
      });

    const staticModelDefinitions = {
      "gpt-image-1.5": {
        title: "GPT Image 1.5",
        slug: "gpt-image-1.5",
        tab_image: "assets/landing-page/section-2-chatgpt.png",
        short_description: "Generate images with OpenAI's GPT Image 1.5",
        description: "Generate images with OpenAI's GPT Image 1.5",
        category: "image",
      },
      "gpt-image-1-mini": {
        title: "GPT Image 1 Mini",
        slug: "gpt-image-1-mini",
        tab_image: "assets/landing-page/section-2-chatgpt.png",
        short_description: "Fast image generation with GPT Image 1 Mini",
        description: "Fast image generation with GPT Image 1 Mini",
        category: "image",
      },
      "nanobanana": {
        title: "Nano Banana",
        slug: "nanobanana",
        tab_image: "assets/landing-page/section-2-gemini.png",
        short_description: "Google's Nano Banana high quality image generation model",
        description: "Google's Nano Banana high quality image generation model",
        category: "image",
      },
      "nano-pro": {
        title: "Nano Banana Pro",
        slug: "nano-pro",
        tab_image: "assets/landing-page/section-2-gemini.png",
        short_description: "Professional grade image generation with Nano Banana Pro",
        description: "Professional grade image generation with Nano Banana Pro",
        category: "image",
      },
      "gemini-3.1-flash-image-preview": {
        title: "Nano Banana 2",
        slug: "gemini-3.1-flash-image-preview",
        tab_image: "assets/landing-page/section-2-gemini.png",
        short_description: "Next-gen Nano Banana 2 image synthesis model",
        description: "Next-gen Nano Banana 2 image synthesis model",
        category: "image",
      },
      "flux-2-pro": {
        title: "Flux 2 Pro",
        slug: "flux-2-pro",
        tab_image: "assets/landing-page/section-2-flux.png",
        short_description: "State-of-the-art visual generation with Flux 2 Pro",
        description: "State-of-the-art visual generation with Flux 2 Pro",
        category: "image",
      },
      "flux-2-flex": {
        title: "Flux 2 Flex",
        slug: "flux-2-flex",
        tab_image: "assets/landing-page/section-2-flux.png",
        short_description: "Flexible and fast visual generation with Flux 2 Flex",
        description: "Flexible and fast visual generation with Flux 2 Flex",
        category: "image",
      },
      "core": {
        title: "Stable Diffusion 3.5",
        slug: "core",
        tab_image: "assets/landing-page/section-2-stable-diffusion.png",
        short_description: "Stability AI's Stable Diffusion 3.5 core model",
        description: "Stability AI's Stable Diffusion 3.5 core model",
        category: "image",
      },
      "krea-2": {
        title: "Krea",
        slug: "krea-2",
        tab_image: "assets/images/krea.png",
        short_description: "High quality real-time AI image generation with Krea",
        description: "High quality real-time AI image generation with Krea",
        category: "image",
      },
      "V_2": {
        title: "Ideogram V2",
        slug: "V_2",
        tab_image: "assets/landing-page/section-2-ideogram.png",
        short_description: "Ideogram V2 graphic design and text-in-image rendering",
        description: "Ideogram V2 graphic design and text-in-image rendering",
        category: "image",
      },
      "V_2_TURBO": {
        title: "Ideogram V2 Turbo",
        slug: "V_2_TURBO",
        tab_image: "assets/landing-page/section-2-ideogram.png",
        short_description: "Ultra-fast Ideogram V2 Turbo image generation",
        description: "Ultra-fast Ideogram V2 Turbo image generation",
        category: "image",
      },
      "V_3": {
        title: "Ideogram V3",
        slug: "V_3",
        tab_image: "assets/landing-page/section-2-ideogram.png",
        short_description: "Ideogram V3 next-generation typography & composition",
        description: "Ideogram V3 next-generation typography & composition",
        category: "image",
      },
      "V_3_TURBO": {
        title: "Ideogram V3 Turbo",
        slug: "V_3_TURBO",
        tab_image: "assets/landing-page/section-2-ideogram.png",
        short_description: "Lightning-fast Ideogram V3 Turbo generation",
        description: "Lightning-fast Ideogram V3 Turbo generation",
        category: "image",
      },
      "V_3_QUALITY": {
        title: "Ideogram V3 Quality",
        slug: "V_3_QUALITY",
        tab_image: "assets/landing-page/section-2-ideogram.png",
        short_description: "Maximum quality Ideogram V3 image generation",
        description: "Maximum quality Ideogram V3 image generation",
        category: "image",
      },
      "recraftv3": {
        title: "Recraft V3",
        slug: "recraftv3",
        tab_image: "assets/landing-page/section-2-recraft.png",
        short_description: "Vector & photorealistic design creation with Recraft V3",
        description: "Vector & photorealistic design creation with Recraft V3",
        category: "image",
      },
      "recraftv4": {
        title: "Recraft V4",
        slug: "recraftv4",
        tab_image: "assets/landing-page/section-2-recraft.png",
        short_description: "Next-gen graphic design & illustrations with Recraft V4",
        description: "Next-gen graphic design & illustrations with Recraft V4",
        category: "image",
      },
      "recraftv4_pro": {
        title: "Recraft V4 Pro",
        slug: "recraftv4_pro",
        tab_image: "assets/landing-page/section-2-recraft.png",
        short_description: "Pro-tier design rendering with Recraft V4 Pro",
        description: "Pro-tier design rendering with Recraft V4 Pro",
        category: "image",
      },
      "seedream": {
        title: "Seedream",
        slug: "seedream",
        tab_image: "assets/landing-page/section-2-seedream.png",
        short_description: "Creative image rendering with Seedream",
        description: "Creative image rendering with Seedream",
        category: "image",
      },
      "sora-2": {
        title: "Sora 2",
        slug: "sora-2",
        tab_image: "assets/images/Sora.png",
        short_description: "Generate cinematic videos with OpenAI's Sora 2",
        description: "Generate cinematic videos with OpenAI's Sora 2",
        category: "video",
        custom_url: "/generate-ai-videos",
      },
      "sora-2-pro": {
        title: "Sora 2 Pro",
        slug: "sora-2-pro",
        tab_image: "assets/images/Sora.png",
        short_description: "Pro-tier cinematic video generation with Sora 2 Pro",
        description: "Pro-tier cinematic video generation with Sora 2 Pro",
        category: "video",
        custom_url: "/generate-ai-videos",
      },
      "veo-3.1-generate-preview": {
        title: "Veo 3.1",
        slug: "veo-3.1-generate-preview",
        tab_image: "assets/images/Veo.png",
        short_description: "Google DeepMind's Veo 3.1 ultra-realistic video synthesis",
        description: "Google DeepMind's Veo 3.1 ultra-realistic video synthesis",
        category: "video",
        custom_url: "/generate-ai-videos",
      },
      "veo-3.1-fast-generate-preview": {
        title: "Veo 3.1 Fast",
        slug: "veo-3.1-fast-generate-preview",
        tab_image: "assets/images/Veo.png",
        short_description: "Fast high-fidelity video generation with Veo 3.1 Fast",
        description: "Fast high-fidelity video generation with Veo 3.1 Fast",
        category: "video",
        custom_url: "/generate-ai-videos",
      },
      "gen4.5": {
        title: "Runway Gen 4.5",
        slug: "gen4.5",
        tab_image: "assets/images/Runway.png",
        short_description: "Cinematic camera control and motion with Runway Gen 4.5",
        description: "Cinematic camera control and motion with Runway Gen 4.5",
        category: "video",
        custom_url: "/generate-ai-videos",
      },
      "kling-v2-5-turbo": {
        title: "Kling 2.5 Turbo",
        slug: "kling-v2-5-turbo",
        tab_image: "assets/images/kling.png",
        short_description: "High speed cinematic motion and audio with Kling 2.5 Turbo",
        description: "High speed cinematic motion and audio with Kling 2.5 Turbo",
        category: "video",
        custom_url: "/generate-ai-videos",
      },
      "kling-v3": {
        title: "Kling 3",
        slug: "kling-v3",
        tab_image: "assets/images/kling.png",
        short_description: "Advanced physics and motion with Kling 3",
        description: "Advanced physics and motion with Kling 3",
        category: "video",
        custom_url: "/generate-ai-videos",
      },
      "Pika v2.2": {
        title: "Pika 2.2",
        slug: "Pika-v2.2",
        tab_image: "assets/images/pika.png",
        short_description: "Creative camera moves and dynamic video effects with Pika 2.2",
        description: "Creative camera moves and dynamic video effects with Pika 2.2",
        category: "video",
        custom_url: "/generate-ai-videos",
      },
      "seedance-2.0": {
        title: "Seedance 2.0",
        slug: "seedance-2.0",
        tab_image: "assets/icon/seedance_logo.png",
        short_description: "Audio-synced dance and realistic video generation with Seedance 2.0",
        description: "Audio-synced dance and realistic video generation with Seedance 2.0",
        category: "video",
        custom_url: "/generate-ai-videos",
      },
      "seedance-2.0-fast": {
        title: "Seedance 2.0 Fast",
        slug: "seedance-2.0-fast",
        tab_image: "assets/icon/seedance_logo.png",
        short_description: "Lightning-fast audio-reactive video rendering with Seedance 2.0 Fast",
        description: "Lightning-fast audio-reactive video rendering with Seedance 2.0 Fast",
        category: "video",
        custom_url: "/generate-ai-videos",
      },
      "minimax-hailuo-02-standard": {
        title: "MiniMax Hailuo 02 Std",
        slug: "minimax-hailuo-02-standard",
        tab_image: "assets/images/minimax-short.png",
        short_description: "Expressive characters and fluid movement with MiniMax Hailuo 02",
        description: "Expressive characters and fluid movement with MiniMax Hailuo 02",
        category: "video",
        custom_url: "/generate-ai-videos",
      },
      "minimax-hailuo-02-pro": {
        title: "MiniMax Hailuo 02 Pro",
        slug: "minimax-hailuo-02-pro",
        tab_image: "assets/images/minimax-short.png",
        short_description: "High quality cinematic motion with MiniMax Hailuo 02 Pro",
        description: "High quality cinematic motion with MiniMax Hailuo 02 Pro",
        category: "video",
        custom_url: "/generate-ai-videos",
      },
      "minimax-hailuo-2.3-standard": {
        title: "MiniMax Hailuo 2.3 Std",
        slug: "minimax-hailuo-2.3-standard",
        tab_image: "assets/images/minimax-short.png",
        short_description: "Realistic action shots with MiniMax Hailuo 2.3",
        description: "Realistic action shots with MiniMax Hailuo 2.3",
        category: "video",
        custom_url: "/generate-ai-videos",
      },
      "minimax-hailuo-2.3-pro": {
        title: "MiniMax Hailuo 2.3 Pro",
        slug: "minimax-hailuo-2.3-pro",
        tab_image: "assets/images/minimax-short.png",
        short_description: "Pro-tier character dynamics with MiniMax Hailuo 2.3 Pro",
        description: "Pro-tier character dynamics with MiniMax Hailuo 2.3 Pro",
        category: "video",
        custom_url: "/generate-ai-videos",
      },
      "wan-2.7": {
        title: "Wan 2.7",
        slug: "wan-2.7",
        tab_image: "assets/icon/wan_logo.png",
        short_description: "State-of-the-art open video synthesis with Wan 2.7",
        description: "State-of-the-art open video synthesis with Wan 2.7",
        category: "video",
        custom_url: "/generate-ai-videos",
      },
      "wan-2.6": {
        title: "Wan 2.6",
        slug: "wan-2.6",
        tab_image: "assets/icon/wan_logo.png",
        short_description: "Smooth motion generation with Wan 2.6",
        description: "Smooth motion generation with Wan 2.6",
        category: "video",
        custom_url: "/generate-ai-videos",
      },
      "wan-2.5-preview": {
        title: "Wan 2.5 Preview",
        slug: "wan-2.5-preview",
        tab_image: "assets/icon/wan_logo.png",
        short_description: "Next generation visual dynamics with Wan 2.5",
        description: "Next generation visual dynamics with Wan 2.5",
        category: "video",
        custom_url: "/generate-ai-videos",
      },
      "pixverse-c1": {
        title: "PixVerse C1",
        slug: "pixverse-c1",
        tab_image: "assets/icon/pixverse_logo.png",
        short_description: "Audio-enabled dynamic camera movement with PixVerse C1",
        description: "Audio-enabled dynamic camera movement with PixVerse C1",
        category: "video",
        custom_url: "/generate-ai-videos",
      },
    };

    const results = await Promise.all(
      bookmarks.map(async (b) => {
        try {
          // If this is an AI Model bookmark (from Explore AI Image / Video Models)
          if (b.modelName === "AIModel" || staticModelDefinitions[b.itemId]) {
            const def = staticModelDefinitions[b.itemId];
            if (def) {
              return {
                _id: b.itemId,
                model_name: "AIModel",
                title: def.title,
                tab_image: def.tab_image,
                short_description: def.short_description,
                mini_description: def.short_description,
                description: def.description,
                slug: def.slug,
                category: def.category || "image",
                custom_url: def.custom_url || "/generate-image",
                bookmarked: true,
              };
            }
          }

          if (!mongoose.models[b.modelName]) {
            return null;
          }
          const Model = mongoose.model(b.modelName);
          let item = null;
          if (mongoose.Types.ObjectId.isValid(b.itemId)) {
            item = await Model.findById(b.itemId).lean();
          } else {
            item = await Model.findOne({ $or: [{ slug: b.itemId }, { id: b.itemId }, { model: b.itemId }] }).lean();
          }
          if (!item) return null;

          const category = getCategoryByModel(b.modelName);
          const formatted = await fetchModelData(b.modelName, category);
          // find the same record by ID in formatted data
          const record = formatted.find(
            (x) => x._id?.toString() === b.itemId?.toString() || x.slug === b.itemId || x.id === b.itemId,
          );
          if (!record) return null;

          return { ...record, bookmarked: true }; // bookmarked
        } catch (err) {
          console.error(`Error fetching ${b.modelName} (${b.itemId}):`, err);
          return null;
        }
      }),
    );

    const filtered = results.filter(Boolean);
    res.json({
      success: true,
      message: "Bookmarks fetched successfully",
      total: filtered.length,
      data: filtered,
    });
  } catch (error) {
    console.error("Error fetching bookmarks:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// GET bookmarks for a specific model
router.get("/bookmarks/:modelName", protect, async (req, res) => {
  try {
    const { modelName } = req.params;

    if (!modelName) {
      return res.status(400).json({
        success: false,
        message: "modelName parameter is required",
      });
    }

    // Get the logged-in user
    const user = await User.findById(req.user.id).lean();
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    // Filter bookmarks for this model only
    const bookmarks = (user.bookmarks || []).filter(
      (b) => b.modelName === modelName,
    );

    if (!bookmarks.length) {
      return res.json({
        success: true,
        message: `No bookmarks found for model ${modelName}`,
        total: 0,
        data: [],
      });
    }

    // Fetch the bookmarked items
    const results = await Promise.all(
      bookmarks.map(async (b) => {
        try {
          const Model = mongoose.model(b.modelName);
          const item = await Model.findById(b.itemId).lean();
          if (!item) return null;

          const category = getCategoryByModel(b.modelName);
          const formatted = await fetchModelData(b.modelName, category);
          // find the same record by ID in formatted data
          const record = formatted.find(
            (x) => x._id.toString() === b.itemId.toString(),
          );
          if (!record) return null;

          return { ...record, bookmarked: true };
        } catch (err) {
          console.error(`Error fetching ${b.modelName} (${b.itemId}):`, err);
          return null;
        }
      }),
    );

    const filtered = results.filter(Boolean);

    res.json({
      success: true,
      message: `Bookmarks fetched successfully for model ${modelName}`,
      total: filtered.length,
      data: filtered,
    });
  } catch (error) {
    console.error("Error fetching bookmarks by model:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

router.get("/tools-by-category", protect, async (req, res) => {
  try {
    const { category: categorySlug, slug, page = 1, limit = 10 } = req.query;

    if (!categorySlug || !slug) {
      return res.status(400).json({
        success: false,
        message: "Category and slug are required",
      });
    }

    // 1️⃣ Validate category
    const category = await HomeToolCategory.findOne({
      slug: categorySlug.toLowerCase(),
      is_active: true,
    }).lean();

    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category not found or inactive",
      });
    }

    const categoryId = category._id.toString();

    // 2️⃣ Fetch all tools
    let allTools = await fetchAllToolsData(); // fetch all tools (without search)

    // ✅ Define the excluded records here
    const excludedRecord = [
      "generate-image",
      "remove-background",
      "background-remover",
      "replace-background",
      "upscale-image",
      "remove-object",
      "convert-jpg-to-png",
      "jpg-to-png-converter",
      "convert-png-to-jpg",
      "png-to-jpg-converter",
      "jpg-to-webp-converter",
      "convert-jpg-to-webp",
      "convert-webp-to-jpg",
      "webp-to-jpg-converter",
      "convert-png-to-webp",
      "png-to-webp-converter",
      "convert-webp-to-png",
      "WebP to PNG converter",
      "grammar-checker",
      "budget-calculator",
      "webp-to-png-converter",
      "convert-webp-to-png",
      "daily-calorie-calculator",
      "health",
      "food",
      "check-meal-calories",
      "travel-vacation-destinations",
      "travel",
      "dinner-lunch-recipes",
      "job-search",
      "ai-job-protection-plan",
      "search-tools",
      "brainstorm-business-ideas",
      "instagram-caption-generator",
      "life-goals-generator",
      "vision-board-generator",
      "new-years-resolution-generator",
      "chat-with-pdf",
      "finance",
      "jobs",
      "business",
      "pdf-converter",
      "images",
      "copywriting",
      "brand-voice",
    ];

    // 3️⃣ Filter tools by this category or slug/model_name AND exclude hidden records
    allTools = allTools.filter((tool) => {
      // Ignore OtherTool
      if (tool.model_name === "OtherTool") return false;

      // ✅ EXCLUSION LOGIC
      if (tool.model_name === "Page" || tool.model_name === "MarketingTool") {
        if (excludedRecord.includes(tool.slug?.toString())) {
          return false;
        }
      }

      const toolCategoryIds = (tool.categories || []).map((id) =>
        id.toString(),
      );
      return (
        toolCategoryIds.includes(categoryId) ||
        tool.slug.toLowerCase() === slug.toLowerCase() ||
        tool.model_name.toLowerCase() === slug.toLowerCase()
      );
    });

    // 4️⃣ Fetch user bookmarks
    let userBookmarks = [];
    if (req.user?.id) {
      try {
        const user = await User.findById(req.user.id).lean();
        userBookmarks = user?.bookmarks || [];
      } catch (err) {
        console.warn("⚠️ User lookup failed, defaulting to no bookmarks");
      }
    }

    // 5️⃣ Add bookmarked flag
    let toolsWithBookmarks = allTools.map((tool) => {
      const isBookmarked = userBookmarks.some(
        (b) =>
          b.itemId.toString() === tool._id.toString() &&
          b.modelName === tool.model_name,
      );
      return { ...tool, bookmarked: isBookmarked };
    });

    // 6️⃣ EXCLUDE CURRENT TOOL
    toolsWithBookmarks = toolsWithBookmarks.filter(
      (tool) => tool.slug.toLowerCase() !== slug.toLowerCase(),
    );

    // ⭐ NEW: SORT FILTERED LIST BY STICKY FIRST, THEN BY DATE BEFORE PAGINATION ⭐
    toolsWithBookmarks.sort((a, b) => {
      const aSticky = a.sticky ? 1 : 0;
      const bSticky = b.sticky ? 1 : 0;
      if (bSticky !== aSticky) {
        return bSticky - aSticky;
      }
      return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
    });

    // 7️⃣ Pagination (Happens AFTER sorting so page 1 gets all the sticky items)
    const startIndex = (parseInt(page) - 1) * parseInt(limit);
    const endIndex = startIndex + parseInt(limit);
    const paginatedTools = toolsWithBookmarks.slice(startIndex, endIndex);

    // 8️⃣ Return response
    res.json({
      success: true,
      total: toolsWithBookmarks.length,
      page: parseInt(page),
      limit: parseInt(limit),
      data: paginatedTools,
    });
  } catch (err) {
    console.error("❌ Error fetching tools by category:", err);
    res.status(500).json({
      success: false,
      message: "Error fetching tools by category",
    });
  }
});

router.get("/home-page-tools", protect, async (req, res) => {
  try {
    const searchQuery = req.query.search?.toLowerCase() || "";
    const filterCategory = req.query.category?.toLowerCase();

    console.log(
      "🚀 Fetching home page tools with search:",
      searchQuery,
      "filter:",
      filterCategory,
    );

    // 1️⃣ Fetch all active categories from DB
    const categories = await HomeToolCategory.find({ is_active: true })
      .sort({ name: 1 })
      .lean();

    // Map DB categories by slug for quick lookup
    const dbCategoryMap = {};
    const dbCategoryById = {};
    categories.forEach((cat) => {
      dbCategoryMap[cat.slug] = cat;
      dbCategoryById[cat._id.toString()] = cat;
    });

    // 2️⃣ Fetch all tools using the shared function
    let allData = await fetchAllToolsData(searchQuery);

    // 3️⃣ Exclude AIProviderComparison (we will fetch it manually below)
    allData = allData.filter(
      (item) =>
        item.model_name !== "AIProviderComparison" &&
        item.model_name !== "OtherTool",
    );

    // 4️⃣ Remap old categories
    const categoryRemap = { career: "job-search" };

    // 5️⃣ Page slug → category mapping
    const pageCategoryMap = {
      images: [
        "generate-image",
        "remove-background",
        "replace-background",
        "upscale-image",
        "remove-object",
        "convert-webp-to-png",
        "convert-webp-to-jpg",
        "convert-png-to-webp",
        "convert-jpg-to-webp",
        "convert-png-to-jpg",
        "convert-jpg-to-png",
      ],
      pdf: [
        "chat-pdf-converter",
        "word-to-pdf-converter",
        "pdf-to-word-converter",
        "jpg-to-pdf-converter",
        "pdf-to-jpg-converter",
        "png-to-pdf-converter",
        "pdf-to-png-converter",
        "webp-to-png-converter",
        "webp-to-jpg-converter",
        "jpg-to-webp-converter",
        "png-to-webp-converter",
        "png-to-jpg-converter",
        "jpg-to-png-converter",
      ],
      "job-search": ["job-search"],
      // food: ["dinner-lunch-recipes"],
      // travel: ["travel-vacation-destinations"],
    };

    // 6️⃣ Assign final categories to each item (support multiple)
    const categorizedData = allData.flatMap((item) => {
      let categoriesArr = [];

      // 6a️⃣ Use assigned DB category ids if exist
      if (item.categories && item.categories.length) {
        categoriesArr = item.categories
          .map((cid) => dbCategoryById[cid.toString()]?.slug || null)
          .filter(Boolean);
      }

      // 6b️⃣ Apply category remap for primary category
      let primaryCategory =
        item.category || item.model_name?.toLowerCase() || "other";
      if (categoryRemap[primaryCategory])
        primaryCategory = categoryRemap[primaryCategory];

      // 6c️⃣ Page slug mapping
      if (item.model_name === "Page") {
        const foundCategory = Object.entries(pageCategoryMap).find(
          ([cat, slugs]) => slugs.includes(item.slug?.toLowerCase()),
        );

        if (foundCategory) {
          primaryCategory = foundCategory[0];
        }
      }

      // 6d️⃣ Add primary category if not already included
      if (!categoriesArr.includes(primaryCategory))
        categoriesArr.push(primaryCategory);

      // 6e️⃣ Ensure unique categories
      categoriesArr = [...new Set(categoriesArr)];

      // Return one item per category
      return categoriesArr.map((cat) => ({ ...item, category: cat }));
    });

    // 7️⃣ Fetch user bookmarks
    let userBookmarks = [];
    if (req.user && req.user.id) {
      try {
        const user = await User.findById(req.user.id).lean();
        userBookmarks = user?.bookmarks || [];
      } catch (err) {
        console.warn("⚠️ User lookup failed, defaulting to no bookmarks");
      }
    }

    // 8️⃣ Add bookmarked flag
    const mergedData = categorizedData.map((item) => {
      const isBookmarked = userBookmarks.some(
        (b) =>
          b.itemId.toString() === item._id.toString() &&
          b.modelName === item.model_name,
      );
      return { ...item, bookmarked: isBookmarked };
    });

    // ⭐ 8.5️⃣ NEW: MANUALLY FETCH AND FORMAT AIProviderComparison ⭐
    let rawComparisons = await AIProviderComparison.find({ is_active: true })
      .populate("firstModel", "name title description image modelName")
      .populate("secondModel", "name title description image modelName")
      .lean();

    // Apply search filter if needed
    if (searchQuery) {
      rawComparisons = rawComparisons.filter(
        (doc) =>
          doc.title?.toLowerCase().includes(searchQuery) ||
          doc.keyPhrase?.toLowerCase().includes(searchQuery) ||
          doc.firstModel?.title?.toLowerCase().includes(searchQuery) ||
          doc.secondModel?.title?.toLowerCase().includes(searchQuery),
      );
    }

    const formattedComparisons = rawComparisons.flatMap((doc) => {
      let categoriesArr = [];

      // Map ObjectIds to slugs
      if (doc.categories && doc.categories.length) {
        categoriesArr = doc.categories
          .map((cid) => dbCategoryById[cid.toString()]?.slug || null)
          .filter(Boolean);
      }

      // Fallbacks
      if (!categoriesArr.includes("ai_providers"))
        categoriesArr.push("ai_providers");
      if (doc.is_popular && !categoriesArr.includes("popular"))
        categoriesArr.push("popular");

      // Duplicate object for every assigned category
      return categoriesArr.map((cat) => ({
        _id: doc._id,
        model_name: "AIProviderComparison",
        title:
          doc.title ||
          (doc.firstModel && doc.secondModel
            ? `${doc.firstModel.title} vs ${doc.secondModel.title}`
            : "Comparison"),
        tab_image: doc.coverImage || null, // Map coverImage to tab_image
        short_description: doc.short_description || null,
        mini_description: doc.mini_description || null,
        description: doc.description || null,
        slug: doc.slug,
        firstModel: doc.firstModel || null,
        secondModel: doc.secondModel || null,
        category: cat,
        categories: doc.categories || [],
        tags: doc.tags || [],
        sticky: doc.sticky || false, // Ensure sticky property exists
        bookmarked: userBookmarks.some(
          (b) =>
            b.itemId.toString() === doc._id.toString() &&
            b.modelName === "AIProviderComparison",
        ),
      }));
    });

    // Append our custom-fetched comparisons into the main data array
    mergedData.push(...formattedComparisons);

    // 9️⃣ Get popular items by checking the assigned category slug
    const popularItems = mergedData.filter(
      (item) => item.category === "popular",
    );

    // ⭐ 9.5️⃣ SORT POPULAR ITEMS BY STICKY FIRST
    popularItems.sort((a, b) => {
      const aSticky = a.sticky ? 1 : 0;
      const bSticky = b.sticky ? 1 : 0;
      if (bSticky !== aSticky) {
        return bSticky - aSticky; // Sticky (1) comes before Non-Sticky (0)
      }
      return new Date(b.createdAt || 0) - new Date(a.createdAt || 0); // Fallback to date
    });

    // 🔟 Filter by 'popular' if requested
    if (filterCategory === "popular") {
      console.log("🔥 Returning only popular items:", popularItems.length);

      const popularCatInfo = dbCategoryMap["popular"] || {};

      return res.json({
        success: true,
        total: popularItems.length,
        data: [
          {
            category: "popular",
            display_name: popularCatInfo.name || "Popular Tools",
            icon: popularCatInfo.icon || "",
            description: popularCatInfo.description || "",
            items: popularItems,
          },
        ],
      });
    }

    // 1️⃣1️⃣ Group tools by category
    const groupedDataMap = mergedData.reduce((acc, item) => {
      const cat = item.category || "other";
      const dbCat = dbCategoryMap[cat] || {};
      const displayName = dbCat.name || cat;

      if (!acc[cat])
        acc[cat] = {
          category: cat,
          display_name: displayName,
          icon: dbCat.icon || "",
          description: dbCat.description || "",
          items: [],
        };
      acc[cat].items.push(item);
      return acc;
    }, {});

    // ⭐ 1️⃣1.5️⃣ SORT ITEMS IN EACH CATEGORY BY STICKY FIRST
    Object.keys(groupedDataMap).forEach((key) => {
      groupedDataMap[key].items.sort((a, b) => {
        const aSticky = a.sticky ? 1 : 0;
        const bSticky = b.sticky ? 1 : 0;

        if (bSticky !== aSticky) {
          return bSticky - aSticky; // Sticky (1) comes before Non-Sticky (0)
        }
        return new Date(b.createdAt || 0) - new Date(a.createdAt || 0); // Fallback to date
      });
    });

    // 1️⃣2️⃣ Sort categories alphabetically
    const groupedByCategory = Object.values(groupedDataMap)
      .filter((group) => group.items.length > 0)
      .sort((a, b) => (a.display_name > b.display_name ? 1 : -1));

    // 1️⃣3️⃣ Apply single category filter if requested
    const finalData = filterCategory
      ? groupedByCategory.filter((g) => g.category === filterCategory)
      : groupedByCategory;

    // ✅ Final response
    res.json({
      success: true,
      total: mergedData.length,
      categories: finalData.length,
      data: finalData,
    });
  } catch (err) {
    console.error("❌ Error fetching home page tools:", err);
    res
      .status(500)
      .json({ success: false, message: "Error fetching home page tools" });
  }
});

router.get(
  "/bookmarks/ai-provider-comparison/:modelId",
  protect,
  async (req, res) => {
    try {
      const { modelId } = req.params;

      if (!modelId) {
        return res.status(400).json({
          success: false,
          message: "modelId parameter is required",
        });
      }

      // 🧠 Fetch comparisons for this specific modelId
      const comparisons = await AIProviderComparison.find({
        $or: [{ modelId: modelId }, { firstModel: modelId }],
      })
        .populate({
          path: "modelId",
          select: "name title",
        })
        .populate({
          path: "firstModel",
          select: "name title description image",
          populate: {
            path: "_id", // won't work directly, so we do AIModel join later
          },
        })
        .populate({
          path: "secondModel",
          select: "name title description image",
        })
        // 3️⃣ Extra populate for AIModel (join on ai_provider_id)
        .lean(); // so we can manually merge extra fields

      if (!comparisons.length) {
        return res.json({
          success: true,
          message: "No AIProviderComparison records found for this modelId",
          total: 0,
          data: [],
        });
      }

      // ✅ Fetch user bookmarks
      // ✅ Check if user is logged in
      let userBookmarks = [];

      // ✅ Check if user is logged in
      if (req.user && req.user.id) {
        try {
          const user = await User.findById(req.user.id).lean();
          userBookmarks = user?.bookmarks || [];
        } catch (err) {
          console.warn("User lookup failed, defaulting to no bookmarks");
        }
      }

      // 🧩 Mark bookmarked items
      const formatted = comparisons.map((item) => {
        const isBookmarked = userBookmarks.some(
          (b) =>
            b.itemId.toString() === item._id.toString() &&
            b.modelName === "AIProviderComparison",
        );
        return { ...item, type: item.type || "text", bookmarked: isBookmarked };
      });

      // ✅ Return result
      res.json({
        success: true,
        message: "AIProviderComparison records fetched successfully",
        total: formatted.length,
        data: formatted,
      });
    } catch (error) {
      console.error("Error fetching AIProviderComparison:", error);
      res.status(500).json({
        success: false,
        message: "Error fetching AIProviderComparison",
      });
    }
  },
);

// ======================================================================
// 🆕 CUSTOM COLLECTIONS API (Mapped from SharedToolConstants)
// ======================================================================

const customToolMappings = {
  popular: {
    "Content Writer": "/ai-writer",
    "Email Generator": "/email-generator",
    "Resume Generator": "/resume-generator",
    "Cover Letter Generator": "/cover-letter-generator",
    "Logo Generator": "/logo-generator",
    "AI Coding Assistant": "/coding",
    "Deep Research": "/deep-research",
    "Retirement Calculator": "/retirement-calculator",
  },
  alternative: {
    Quillbot: "/ai-writer",
    "Remove.bg": "/remove-background",
    "Monday.com": "/projects",
    Canva: "/visual-editor",
    "Google Drive": "/storage",
    Dropbox: "/storage",
    Asana: "/projects",
    Jasper: "/pdf-to-word",
    "I Love PDF": "/pdf-to-word",
    Trello: "/projects",
    HubSpot: "/projects",
    ChatPDF: "/chat-pdf-converter",
    Notion: "/doc-editor",
    "Copy.ai": "/copywriting",
  },
  // 👇 New Productivity Category Added Here
  productivity: {
    "Web Search": "/web-search",
    "AI Coding Assistant": "/coding",
    Calendar: "/calendar",
    Project: "/projects",
    "Background Remover": "/remove-background",
    "Job Automation Checker": "/ai-job-automation-checker",
    "Interview Prep": "/job-interview-prep",
    "Business Name Generator": "/business-name-generator",
    "Market Research Tool": "/market-research",
    "Business Development Assistant": "/business-development",
    "Deep Research": "/deep-research",
    " AI Financial Advisor": "financial-advisor",
    "Retirement Calculator": "/retirement-calculator",
    "Stock Market Tracker": "/stock-market-tracker",
    "Business Ideas Generator": "/small-business-idea-generator",
  },
  career: {
    Marketers: {
      "Generate Social Media Content": "/social-media-generator",
      "Generate Facebook Post": "/marketing/facebook-post-generator",
      "Generate SEO Meta Title": "/marketing/meta-title-generator",
      "Compare AI Models": "/multi-chat",
      "Deep Research": "/deep-research",
      "Write Content": "/ai-writer",
      "Write Email": "/email-generator",
      Paraphrase: "/content-paraphraser",
      "Check Grammar": "/ai-grammar-checker",
      Summarize: "/marketing/content-summarizer",
      "Generate Image": "/generate-image",
      "Convert JPG & PNG": "/images",
      ChatPDF: "/chat-pdf-converter",
      "PDF to Word": "/pdf-to-word",
      "Word to PDF": "/word-to-pdf",
      "Merge PDF": "/merge-pdf",
      "Split PDF": "/split-pdf",
      "Compress PDF": "/compress-pdf",
      "Generate Facebook Post": "/marketing/facebook-post-generator",
      "Generate SEO Meta Title": "/marketing/meta-title-generator",
      "Generate Alt Text": "/marketing/alt-text-generator",
      "Generate Social Media Content": "/social-media-generator",
      "Content Workspace": "/doc-editor",
      "Content Calendar": "/calendar",
      "Project Management": "/projects",
      "Cloud Storage": "/storage",
    },
    "Students & Professors": {
      "Compare AI Models": "/multi-chat",
      "Deep Research": "/deep-research",
      "Write Content": "/ai-writer",
      ChatPDF: "/chat-pdf-converter",
    },
    "Writers & Journalists": {
      "Compare AI Models": "/multi-chat",
      "Deep Research": "/deep-research",
      "Write Content": "/ai-writer",
      "Write Email": "/email-generator",
      Paraphrase: "/content-paraphraser",
      "Check Grammar": "/ai-grammar-checker",
      Summarize: "/marketing/content-summarizer",
      "Generate Image": "/generate-image",
      "Convert JPG & PNG": "/images",
      ChatPDF: "/chat-pdf-converter",
      "PDF to Word": "/pdf-to-word",
      "Word to PDF": "/word-to-pdf",
      "Merge PDF": "/merge-pdf",
      "Split PDF": "/split-pdf",
      "Compress PDF": "/compress-pdf",
      "Generate Facebook Post": "/marketing/facebook-post-generator",
      "Generate SEO Meta Title": "/marketing/meta-title-generator",
      "Generate Alt Text": "/marketing/alt-text-generator",
      "Generate Social Media Content": "/social-media-generator",
      "Content Workspace": "/doc-editor",
      "Content Calendar": "/calendar",
      "Project Management": "/projects",
      "Cloud Storage": "/storage",
    },
    "Content Creators": {
      "Compare AI Models": "/multi-chat",
      "Generate Image": "/generate-image",
      "Write Content": "/ai-writer",
      "Design Canvas": "/visual-editor",
      "Remove Background": "/remove-background",
      "Convert JPG & PNG": "/images",
      "Remove Object": "/remove-object",
      "Replace Background": "/replace-background",
      "Upscale Image": "/upscale-image",
      "Content Workspace": "/doc-editor",
      "Content Calendar": "/calendar",
      "Project Management": "/projects",
      "Cloud Storage": "/storage",
      "Generate Social Media Content": "/social-media-generator",
      "Generate Facebook Post": "/marketing/facebook-post-generator",
      "Generate SEO Meta Title": "/marketing/meta-title-generator",
      "Generate Alt Text": "/marketing/alt-text-generator",
    },
    Developers: {
      "Write Email": "/email-generator",
    },
    "Business Professionals": {
      "Compare AI Models": "/multi-chat",
      "Write Email": "/email-generator",
      "Project Management": "/projects",
      "Content Workspace": "/doc-editor",
    },
    Researchers: {
      "Deep Research": "/deep-research",
      ChatPDF: "/chat-pdf-converter",
      "Compare AI Models": "/multi-chat",
    },
    Entrepreneurs: {
      "Compare AI Models": "/multi-chat",
      "Generate Logo": "/logo-generator",
      "Project Management": "/projects",
    },
  },
  "ai-chat-models": {
    "Compare AI Chat Models": "/multi-chat",
    ChatGPT: "/chatgpt",
    Gemini: "/gemini",
    Claude: "/claude",
    DeepSeek: "/deepseek",
    Perplexity: "/perplexity",
    Llama: "/llama",
    Grok: "/grok",
    Kimi: "/kimi",
    Mistral: "/mistral",
    Qwen: "/qwen",
    MiniMax: "/minimax",
    MiMo: "/mimo",
    GLM: "/glm",
    Nemotron: "/nemotron",
  },
  "image-generation": {
    "Compare Image Generation Models": "/generate-image",
    "ChatGPT Image": "/generate-image-chatgpt",
    "Gemini (Nano Banana)": "/generate-image-gemini",
    "Stable Diffusion": "/generate-image-stable",
    Flux: "/generate-image-flux",
    Seedream: "/generate-image-seedream",
    Recraft: "/generate-image-recraft",
    Ideogram: "/generate-image-ideogram",
    Krea: "/generate-image-krea",
  },
  "video-generation": {
    "Compare AI Video Models": "/generate-ai-videos",
    Sora: "/generate-video-sora",
    "Gemini (Veo)": "/generate-video-veo",
    Runway: "/generate-video-runway",
    Kling: "/generate-video-kling",
    Pika: "/generate-video-pika",
    Seedance: "/generate-video-seedance",
    MiniMax: "/generate-video-minimax",
    Wan: "/generate-video-wan",
    PixVerse: "/generate-video-pixverse",
  },
  "writing-grammar": {
    "Content Writer": "/ai-writer",
    "Email Writer": "/email-generator",
    "Blog Post Writer": "/marketing/blog-post-generator",
    Paraphraser: "/content-paraphraser",
    "Grammar Checker": "/ai-grammar-checker",
    "Content Summarizer": "/content-summarizer",
    Translator: "/content-translator",
  },
  "content-creation": {
    "Email Writer": "/email-generator",
    "Social Media Post Writer": "/marketing/social-media-post-writer",
    "Blog Post Writer": "/marketing/blog-post-generator",
    "Cold Email Writer": "/marketing/cold-email-writer",
    "Headline Generator": "/marketing/headline-generator",
    "Product Description Writer": "/marketing/product-description-generator",
    "Ad Copy Writer": "/marketing/ad-copy-generator",
    "Newsletter Writer": "/marketing/email-newsletter-writer",
    "LinkedIn Post Writer": "/marketing/linkedin-post-generator",
    "Sales Page Writer": "/marketing/sales-copy-writer",
    "Essay Writer": "/marketing/essay-writer",
    "Video Script Writer": "/marketing/video-script-writer",
    "Video Title Generator": "/marketing/video-title-generator",
    "Video Description Writer": "/marketing/video-description-writer",
    "Research Paper Writer": "/marketing/research-paper-writer",
    "Literature Review Writer": "/marketing/literature-review-writer",
    "Pitch Deck Writer": "/marketing/pitch-deck-writer",
    "Sales Proposal Writer": "/marketing/sales-proposal-writer",
    "Press Release Writer": "/marketing/press-release-writer",
    "Case Study Writer": "/marketing/case-study-writer",
    "Cover Letter Writer": "/cover-letter-generator",
    "Resume Builder": "/resume-generator",
    "SEO Meta Description Writer": "/marketing/seo-meta-description-writer",
    "SEO Title Writer": "/marketing/meta-title-generator",
    "Project Proposal Writer": "/marketing/project-proposal-writer",
    "Twitter/X Thread Writer": "/marketing/twitterx-thread-writer",
    "Instagram Caption Writer": "/marketing/instagram-caption-writer",
    "TikTok Caption Writer": "/marketing/tiktok-caption-writer",
    "Facebook Post Writer": "/marketing/facebook-post-generator",
    "Pinterest Description Writer": "/marketing/pinterest-caption-generator",
    "Hashtag Generator": "/marketing/hashtag-generator",
  },
  sales: {
    "Sales Ideas Generator": "/sales-ideas-generator",
    "Sales Plan Builder": "/marketing/sales-plan-builder",
    "Cold Email Writer": "/marketing/cold-email-writer",
    "Sales Proposal Writer": "/marketing/sales-proposal-writer",
    "Sales Script Generator": "/marketing/sales-script-generator",
    "Cold Email Sequence Writer": "/marketing/cold-email-sequence-writer",
    "Follow-up Email Writer": "/marketing/follow-up-email-writer",
    "Sales Objection Handler": "/marketing/sales-objection-handler",
    "Elevator Pitch Generator": "/marketing/elevator-pitch-generator",
  },
  marketing: {
    "Social Media Post Writer": "/marketing/social-media-post-writer",
    "Marketing Ideas Generator": "/marketing-ideas-generator",
    "Marketing Plan Builder": "/marketing-plan-builder",
    "Content Marketing Ideas Generator": "/marketing/content-marketing-ideas",
    "Email Marketing Ideas Generator":
      "/marketing/email-marketing-ideas-generator",
    "Social Media Idea Generator": "/marketing/social-media-ideas-generator",
    "Competitor Research": "/marketing/competitor-research",
    "Market & Industry Research": "/marketing/market-and-industry-research",
    "Press Release Writer": "/marketing/press-release-writer",
    "Logo Generator": "/logo-generator",
    "SEO Meta Description Writer": "/marketing/seo-meta-description-writer",
    "SEO Title Writer": "/marketing/meta-title-generator",
    "SEO Keyword Generator": "/marketing/seo-keywords-generator",
    "Twitter/X Thread Writer": "/marketing/twitterx-thread-writer",
    "Instagram Caption Writer": "/marketing/instagram-caption-writer",
    "TikTok Caption Writer": "/marketing/tiktok-caption-writer",
    "Facebook Post Writer": "/marketing/facebook-post-generator",
    "Pinterest Description Writer": "/marketing/pinterest-caption-generator",
    "Hashtag Generator": "/marketing/hashtag-generator",
    "Email Template Builder": "/email-builder",
    "Landing Page Builder": "/page-builder",
    "Document Builder": "/document-builder",
    "Product Description Writer": "/marketing/product-description-generator",
    "Buyer Persona Generator": "/marketing/buyer-persona-generator",
    "Value Proposition Writer": "/marketing/value-proposition-writer",
    "Email Subject Line Generator": "/marketing/email-subject-line-generator",
    "Call-to-Action (CTA) Generator": "/marketing/call-to-action-cta-generator",
    "Lead Magnet Generator": "/marketing/lead-magnet-generator",
    "Brand Story Writer": "/marketing/brand-story-writer",
    "Welcome Email Sequence Writer": "/marketing/welcome-email-sequence-writer",
    "Abandoned Cart Email Writer": "/marketing/abandoned-cart-email-writer",
    "Customer Review Response Generator":
      "/marketing/customer-review-response-generator",
    "Unique Selling Proposition (USP) Generator":
      "/marketing/unique-selling-proposition-usp-generator",
    "Facebook Ad Copy Writer": "/marketing/facebook-ad-copy-writer",
    "Google Ads Writer": "/marketing/google-ads-writer",
    "LinkedIn Ad Writer": "/marketing/linkedin-ad-generator",
    "Content Calendar Generator": "/marketing/content-calendar-generator",
    "Brand Positioning Statement Writer":
      "/marketing/brand-positioning-statement-writer",
    "Re-engagement Email Writer": "/marketing/re-engagement-email-writer",
    "Marketing Campaign Brief Writer":
      "/marketing/marketing-campaign-brief-writer",
    "Customer Avatar Builder": "/marketing/customer-avatar-builder",
    "Target Audience Analyzer": "/marketing/target-audience-analyzer",
  },
  "ecommerce-shopify": {
    "Product Title Writer": "/marketing/product-title-writer",
    "Product Description Writer": "/marketing/product-description-generator",
    "Email Subject Line Generator": "/marketing/email-subject-line-generator",
    "Welcome Email Sequence Writer": "/marketing/welcome-email-sequence-writer",
    "Abandoned Cart Email Writer": "/marketing/abandoned-cart-email-writer",
    "Customer Review Response Generator":
      "/marketing/customer-review-response-generator",
    "Negative Review Response Writer":
      "/marketing/negative-review-response-writer",
    "Post-Purchase Email Writer": "/marketing/post-purchase-email-writer",
    "Review Request Email Writer": "/marketing/review-request-email-writer",
    "Customer Inquiry Response Writer":
      "/marketing/customer-inquiry-response-writer",
    "FAQ Writer": "/marketing/faq-generator",
    "About Us Page Writer": "/marketing/about-us-page-writer",
    "Brand Story Writer": "/marketing/brand-story-writer",
    "Niche Research Generator": "/marketing/niche-research-generator",
    "Content Calendar Generator": "/marketing/content-calendar-generator",
    "Trend Research Generator": "/marketing/trend-research-generator",
    "Competitor Listing Analyzer": "/marketing/competitor-listing-analyzer",
    "Amazon Listing Writer": "/marketing/amazon-product-listing-generator",
    "Amazon Bullet Points Writer": "/marketing/amazon-bullet-points-writer",
    "Amazon Backend Keywords Generator":
      "/marketing/amazon-backend-keywords-generator",
    "Amazon A+ Content Writer": "/marketing/amazon-a-content-writer",
    "Shopify Product Description Writer":
      "/marketing/shopify-product-description-writer",
    "Collection/Category Description Writer":
      "/marketing/collectioncategory-description-writer",
    "Shopify Theme Copy Writer": "/marketing/shopify-theme-copy-writer",
  },
  "business-growth": {
    "Business Idea Generator": "/small-business-idea-generator",
    "Side Hustle Idea Generator": "/marketing/side-hustle-idea-generator",
    "Business Topic Finder": "/marketing/business-topic-finder",
    "Business Idea Checker": "/marketing/business-idea-checker",
    "Customer Problem Finder": "/marketing/customer-problem-finder",
    "Ideal Customer Finder": "/marketing/ideal-customer-finder",
    "Market Size Estimator": "/marketing/market-size-estimator",
    "Competition Checker": "/marketing/competitor-research",
    "Trending Business Idea Finder": "/marketing/trending-business-idea-finder",
    "Business Revenue Idea Generator":
      "/marketing/business-revenue-idea-generator",
    "Business Plan Generator": "/marketing/business-plan-generator",
    "Sales Funnel Mapper": "/marketing/sales-funnel-mapper",
    "Business Name Generator": "/business-name-generator",
    "Domain Name Suggester": "/marketing/domain-name-suggester",
    "Business Tagline Generator": "/marketing/business-tagline-generator",
    "Business Slogan Generator": "/marketing/business-slogan-generator",
    "Brand Personality Generator": "/marketing/brand-personality-generator",
    "Brand Values Generator": "/marketing/brand-values-generator",
    "Mission Statement Writer": "/marketing/mission-statement-writer",
    "Vision Statement Writer": "/marketing/vision-statement-writer",
    "First 10 Customers Finder": "/marketing/first-10-customers-finder",
    "Customer Source Finder": "/marketing/customer-source-finder",
    "Growth Hack Generator": "/marketing/growth-hack-generator",
    "Partnership Opportunity Finder":
      "/marketing/partnership-opportunity-finder",
    "Content Marketing Growth Generator":
      "/marketing/content-marketing-growth-generator",
  },
  "graphic-design-media": {
    "Visual Graphic Design Editor": "/visual-editor",
    "Logo Generator": "/logo-generator",
    "Email Template Builder": "/email-builder",
    "Landing Page Builder": "/page-builder",
    "Document Builder": "/document-builder",
    "Popup Builder": "/popup-builder",
    "Profile Animator": "/marketing/profile-animator",
    "Background Remover": "/remove-background",
    "Background Replace": "/replace-background",
    "Object Remover": "/remove-object",
    "Image Upscaler": "/upscale-image",
  },
  "career-job-hunting": {
    "Resume Builder": "/resume-generator",
    // "Resume Optimizer": "/resume-optimizer",
    "Resume Bullet Point Writer": "/marketing/resume-bullet-point-writer",
    "Cover Letter Writer": "/cover-letter-generator",
    "Cover Letter Customizer": "/marketing/cover-letter-customizer",
    "LinkedIn Profile Optimizer": "/marketing/linkedin-profile-optimizer",
    "LinkedIn Headline Writer": "/marketing/linkedin-headline-writer",
    "LinkedIn About Section Writer": "/marketing/linkedin-about-section-writer",
    "Personal Bio Writer": "/marketing/personal-bio-writer",
    "Job Finder": "/marketing/job-finder",
    "Job Description Analyzer": "/marketing/job-description-analyzer",
    "Application Email Writer": "/marketing/application-email-writer",
    "Job Application Follow-up Email":
      "/marketing/job-application-follow-up-email",
    "Cold Outreach for Jobs": "/marketing/cold-outreach-for-jobs",
    "LinkedIn Connection Request Writer":
      "/marketing/linkedin-connection-request-writer",
    "LinkedIn Message Writer": "/marketing/linkedin-message-writer",
    "Networking Email Writer": "/marketing/networking-email-writer",
    "Recruiter Outreach Writer": "/marketing/recruiter-outreach-writer",
    "Referral Request Writer": "/marketing/referral-request-writer",
    "Interview Question Generator": "/marketing/interview-question-generator",
    "Common Interview Questions Practice":
      "/marketing/common-interview-questions-practice",
    "Tough Interview Question Prep": "/marketing/tough-interview-question-prep",
    "Interview Story Builder": "/marketing/interview-story-builder",
    "Interview Answer Generator": "/marketing/interview-answer-generator",
    "Company Research Generator": "/marketing/company-research-generator",
    "Questions to Ask Interviewer Generator":
      "/marketing/questions-to-ask-interviewer-generator",
    "Thank You Email Writer": "/marketing/thank-you-email-writer",
    "Salary Negotiation Helper": "/marketing/salary-negotiation-helper",
    "Salary Negotiation Email Writer":
      "/marketing/salary-negotiation-email-writer",
  },
  "online-income": {
    "YouTube Channel Topic Finder": "/marketing/youtube-channel-topic-finder",
    "YouTube Niche Research": "/marketing/youtube-niche-research",
    "YouTube Monetization Strategy Generator":
      "/marketing/youtube-monetization-strategy-generator",
    "Blog Niche Finder": "/marketing/blog-niche-finder",
    "Blog Monetization Plan": "/marketing/blog-monetization-plan",
    "Affiliate Blog Post Writer": "/marketing/affiliate-blog-post-writer",
    "Sponsored Post Writer": "/marketing/sponsored-post-writer",
    "Newsletter Niche Finder": "/marketing/newsletter-niche-finder",
    "Newsletter Sponsor Pitch Writer":
      "/marketing/newsletter-sponsor-pitch-writer",
    "Substack Topic Generator": "/marketing/substack-topic-generator",
    "Podcast Niche Finder": "/marketing/podcast-niche-finder",
    "Podcast Sponsor Read Writer": "/marketing/podcast-sponsor-read-writer",
    "Podcast Monetization Strategy": "/marketing/podcast-monetization-strategy",
    "Podcast Topic Idea Generator": "/marketing/podcast-topic-idea-generator",
    "TikTok Monetization Strategy": "/marketing/tiktok-monetization-strategy",
    "Instagram Brand Deal Pitch Writer":
      "/marketing/instagram-brand-deal-pitch-writer",
    "Twitter/X Monetization Strategy":
      "/marketing/twitterx-monetization-strategy",
    "Affiliate Product Finder": "/marketing/affiliate-product-finder",
    "Affiliate Niche Finder": "/marketing/affiliate-niche-finder",
    "Affiliate Review Writer": "/marketing/affiliate-review-writer",
    "Affiliate Comparison Post Writer":
      "/marketing/affiliate-comparison-post-writer",
    "Affiliate Disclosure Writer": "/marketing/affiliate-disclosure-writer",
    "Affiliate Roundup Post Writer": "/marketing/affiliate-roundup-post-writer",
    "Amazon Affiliate Strategy Generator":
      "/marketing/amazon-affiliate-strategy-generator",
    "High-Commission Affiliate Finder":
      "/marketing/high-commission-affiliate-finder",
    "Ebook Idea Generator": "/marketing/ebook-idea-generator",
    "Ebook Outline Generator": "/marketing/ebook-outline-generator",
    "Ebook Title Generator": "/marketing/ebook-title-generator",
    "Ebook Description Writer": "/marketing/ebook-description-writer",
    "Digital Template Idea Generator":
      "/marketing/digital-template-idea-generator",
    "Notion Template Idea Generator":
      "/marketing/notion-template-idea-generator",
    "Digital Product Idea Generator":
      "/marketing/digital-product-idea-generator",
    "Printable Idea Generator": "/marketing/printable-idea-generator",
    "Stock Photo Niche Finder": "/marketing/stock-photo-niche-finder",
    "Stock Video Idea Generator": "/marketing/stock-video-idea-generator",
    "Freelance Service Idea Generator":
      "/marketing/freelance-service-idea-generator",
    "Freelance Niche Finder": "/marketing/freelance-niche-finder",
    "Freelance Profile Writer": "/marketing/freelance-profile-writer",
    "Upwork Profile Writer": "/marketing/upwork-profile-writer",
    "Fiverr Gig Description Writer": "/marketing/fiverr-gig-description-writer",
    "Freelancer.com Profile Writer": "/marketing/freelancercom-profile-writer",
    "Service Business Idea Generator":
      "/marketing/service-business-idea-generator",
    "Consulting Niche Finder": "/marketing/consulting-niche-finder",
    "Coaching Business Idea Generator":
      "/marketing/coaching-business-idea-generator",
    "Service Package Description Writer":
      "/marketing/service-package-description-writer",
    "Online Income Idea Generator": "/marketing/online-income-idea-generator",
    "Side Hustle Idea Generator": "/marketing/side-hustle-idea-generator",
    "Passive Income Idea Generator": "/marketing/passive-income-idea-generator",
    "Skill-Based Income Finder": "/marketing/skill-based-income-finder",
  },
  "social-media": {
    "Social Media Content Idea Generator":
      "/social-media-content-idea-generator",
    "Social Media Trending Topic Finder": "/social-media-trending-topic-finder",
    "Content Calendar Generator": "/marketing/content-calendar-generator",
    "Weekly Content Plan Generator": "/weekly-content-plan-generator",
    "Monthly Content Plan Generator": "/monthly-content-plan-generator",
    "Viral Content Idea Generator": "/viral-content-idea-generator",
    "Twitter/X Thread Writer": "/marketing/twitterx-thread-writer",
    "Instagram Caption Writer": "/marketing/instagram-caption-writer",
    "TikTok Caption Writer": "/marketing/tiktok-caption-writer",
    "Facebook Post Writer": "/marketing/facebook-post-generator",
    "Pinterest Description Writer": "/marketing/pinterest-caption-generator",
    "LinkedIn Post Writer": "/marketing/linkedin-post-generator",
    "YouTube Description Writer": "/marketing/youtube-description-writer",
    "YouTube Viral Title Generator": "/marketing/youtube-viral-title-generator",
    "YouTube Tag Generator": "/marketing/youtube-tag-generator",
    "Hashtag Generator": "/marketing/hashtag-generator",
    "Instagram Hashtag Generator": "/marketing/instagram-hashtag-generator",
    "TikTok Hashtag Generator": "/marketing/tiktok-hashtag-generator",
    "Social Media Strategy Generator":
      "/marketing/social-media-strategy-generator",
    "Posting Schedule Optimizer": "/marketing/posting-schedule-optimizer",
    "Audience Growth Strategy Generator":
      "/marketing/audience-growth-strategy-generator",
    "Follower Engagement Tactics Generator":
      "/marketing/follower-engagement-tactics-generator",
    "Content Series Ideator": "/marketing/content-series-ideator",
    "LinkedIn Article Writer": "/marketing/linkedin-article-generator",
    "LinkedIn Carousel Writer": "/marketing/linkedin-carousel-writer",
    "LinkedIn Newsletter Title Generator":
      "/marketing/linkedin-newsletter-title-generator",
    "LinkedIn Poll Question Generator":
      "/marketing/linkedin-poll-question-generator",
  },
  "personal-finance": {
    "Stock Market Tracker": "/stock-market-tracker",
    "Budget Plan Generator": "/marketing/budget-plan-generator",
    "Monthly Budget Calculator": "/marketing/monthly-budget-calculator",
    "Emergency Fund Calculator": "/marketing/emergency-fund-calculator",
    "Savings Goal Calculator": "/marketing/savings-goal-calculator",
    "Debt Payoff Calculator": "/marketing/debt-payoff-calculator",
    "Credit Card Payoff Calculator": "/marketing/credit-card-payoff-calculator",
    "Student Loan Repayment Planner":
      "/marketing/student-loan-repayment-planner",
    "Debt-to-Income Ratio Calculator":
      "/marketing/debt-to-income-ratio-calculator",
    "Minimum Payment Trap Calculator":
      "/marketing/minimum-payment-trap-calculator",
    "Retirement Savings Calculator": "/retirement-calculator",
    "Retirement Age Calculator": "/marketing/retirement-age-calculator",
    "Home Affordability Calculator": "/marketing/home-affordability-calculator",
    "Credit Score Improvement Plan": "/marketing/credit-score-improvement-plan",
    "Credit Utilization Calculator": "/marketing/credit-utilization-calculator",
    "Credit Building Strategy for Beginners":
      "/marketing/credit-building-strategy-for-beginners",
    "Freelancer Income Calculator": "/marketing/freelancer-income-calculator",
    "Side Hustle Profit Calculator": "/marketing/side-hustle-profit-calculator",
    "Cost of Living Calculator": "/marketing/cost-of-living-calculator",
    "Financial Goal Setter": "/marketing/financial-goal-setter",
    "Financial Independence Calculator":
      "/marketing/financial-independence-calculator",
  },
  "documents-pdf": {
    "Chat with PDF": "/chat-pdf-converter",
    "Word to PDF": "/word-to-pdf",
    "PDF to Word": "/pdf-to-word",
    "Edit PDF": "/edit-pdf",
    "Sign PDF": "/sign-pdf",
    "Compress PDF": "/compress-pdf",
    "Split PDF": "/split-pdf",
    "Merge PDF": "/merge-pdf",
    "Rotate PDF": "/rotate-pdf",
    "PowerPoint to PDF": "/powerpoint-to-pdf",
    "PDF to PowerPoint": "/pdf-to-powerpoint",
    "Excel to PDF": "/excel-to-pdf",
    "PDF to Excel": "/pdf-to-excel",
    "JPG to PDF": "/jpg-to-pdf",
    "PDF to JPG": "/pdf-to-jpg",
    "PNG to PDF": "/png-to-pdf",
    "PDF to PNG": "/pdf-to-png",
  },
  "students-education": {
    "Deep Research": "/deep-research",
    "Essay Writer": "/marketing/essay-writer",
    "Research Paper Writer": "/marketing/research-paper-writer",
    "Literature Review Writer": "/marketing/literature-review-writer",
    Paraphraser: "/content-paraphraser",
    "Grammar Checker": "/ai-grammar-checker",
    "Cover Letter Writer": "/cover-letter-generator",
    "Resume Builder": "/resume-generator",
    "Study Guide Generator": "/marketing/study-guide-generator",
    "Flashcard Generator": "/marketing/flashcard-generator",
    "Complicated Concept Explainer": "/marketing/complicated-concept-explainer",
    "Practice Question Generator": "/marketing/practice-question-generator",
    "Citation Generator": "/marketing/citation-generator",
    "Thesis Statement Generator": "/marketing/thesis-statement-generator",
  },
  images: {
    "Visual Graphic Design Editor": "/visual-editor",
    "Logo Generator": "/logo-generator",
    "Profile Animator": "/marketing/profile-animator",
    "Background Remover": "/remove-background",
    "Background Replace": "/replace-background",
    "Object Remover": "/remove-object",
    "Image Upscaler": "/upscale-image",
    "WebP to JPG": "/webp-to-jpg-converter",
    "WebP to PNG": "/webp-to-png-converter",
    "PNG to WebP": "/png-to-webp-converter",
    "PNG to JPG": "/png-to-jpg",
    "JPG to WebP": "/jpg-to-webp-converter",
    "JPG to PNG": "/jpg-to-png-converter",
    "HEIC to JPG": "/heic-to-jpg-converter",
    "HEIC to PNG": "/heic-to-png-converter",
    "HEIC to WebP": "/heic-to-webp-converter",
  },
  "design-editing": {
    "AI Image Editor": "/ai-image-editor",
    "AI Video Editor": "/ai-video-editor",
    "Email Template Builder": "/email-builder",
    "Design Editor": "/visual-editor",
    "Remove Background": "/remove-background",
    "Replace Background": "/replace-background",
    "Remove Object": "/remove-object",
    "Upscale Image": "/upscale-image",
    "Chat with PDF": "/chat-pdf-converter",
    "Edit & Convert PDF": "/pdf-converter",
    "Image to 3D": "/image-to-3d",
    "Sketch to Image": "/sketch-to-image",
  },
};

router.get("/custom-collections", protect, async (req, res) => {
  try {
    const { category } = req.query;

    if (!category || !customToolMappings[category.toLowerCase()]) {
      return res.status(400).json({
        success: false,
        message:
          "A valid category query parameter is required (writing, popular, career, productivity, alternative, online-income, personal-finance, image-generation, video-generation, etc)",
      });
    }

    const requestedCategory = category.toLowerCase();
    const mappingData = customToolMappings[requestedCategory];

    // 1️⃣ Fetch all tools to cross-reference their full details
    let allTools = await fetchAllToolsData();
    allTools = deduplicateTools(allTools);

    // 2️⃣ Fetch user bookmarks for state handling
    let userBookmarks = [];
    if (req.user && req.user.id) {
      try {
        const user = await User.findById(req.user.id).lean();
        userBookmarks = user?.bookmarks || [];
      } catch (err) {
        console.warn("⚠️ User lookup failed, defaulting to no bookmarks");
      }
    }

    // Generate a fake 24-character hex ID for static tools so frontend keys/links don't break
    const generateFakeMongoId = () =>
      [...Array(24)]
        .map(() => Math.floor(Math.random() * 16).toString(16))
        .join("");

    // 3️⃣ Helper function to find a tool by slug and format its details
    const populateToolDetails = (toolName, toolUrl) => {
      // Clean up the URL to extract the exact DB slug (e.g. "/marketing/summarizer" -> "summarizer")
      const targetSlug = toolUrl.split("/").pop().toLowerCase();

      // Find the corresponding record in the database tools
      const foundTool = allTools.find(
        (t) =>
          t.slug?.toLowerCase() === targetSlug ||
          t.custom_url?.toLowerCase().includes(targetSlug),
      );

      // ✅ IF TOOL EXISTS IN DB: Return dynamic data
      if (foundTool) {
        // Check bookmark status
        const isBookmarked = userBookmarks.some(
          (b) =>
            b.itemId.toString() === foundTool._id.toString() &&
            b.modelName === foundTool.model_name,
        );

        return {
          ...foundTool,
          display_title_override: toolName, // Passes the frontend mapped name (e.g. "Write Content")
          bookmarked: isBookmarked,
        };
      }

      // 🚨 IF TOOL IS NOT IN DB: Return Static Fallback Data
      return {
        _id: generateFakeMongoId(),
        model_name: "StaticModel",
        // Replace this URL with a generic icon from your server you want missing tools to use
        tab_image: "",
        short_description: `Use AI to instantly power up your workflow with our ${toolName} tool.`,
        mini_description: `AI-powered ${toolName}`,
        description: `<p>Boost your productivity with the powerful <b>${toolName}</b>. Generate high-quality results instantly using advanced AI.</p>`,
        title: toolName,
        slug: targetSlug,
        category: requestedCategory,
        categories: [],
        tags: [],
        sticky: false,
        allternativeTools: [],
        whatCanDO: [
          `Streamline your tasks with ${toolName}`,
          "Generate instant, high-quality AI outputs",
          "Save time and boost productivity",
        ],
        display_name: "",
        display_title_override: toolName,
        bookmarked: false,
        is_static_placeholder: true, // Flag to help you identify static tools if needed later
      };
    };

    let responseData = [];

    // 4️⃣ Format the Data Array based on Structure
    if (requestedCategory === "career") {
      // Career is grouped by specific user roles
      responseData = Object.entries(mappingData).map(
        ([roleGroup, toolsMap]) => {
          const mappedItems = Object.entries(toolsMap)
            .map(([name, url]) => populateToolDetails(name, url))
            .filter(Boolean); // Clean out nulls if tool wasn't found

          return {
            category: roleGroup.toLowerCase().replace(/\s+/g, "-"),
            display_name: roleGroup,
            items: mappedItems,
          };
        },
      );
    } else {
      // Writing, Popular, Alternative, and Productivity are simple flat maps
      const mappedItems = Object.entries(mappingData)
        .map(([name, url]) => populateToolDetails(name, url))
        .filter(Boolean);

      responseData = [
        {
          category: requestedCategory,
          display_name:
            requestedCategory.charAt(0).toUpperCase() +
            requestedCategory.slice(1).replace(/-/g, " ") +
            " Tools",
          items: mappedItems,
        },
      ];
    }

    // ✅ Return the final JSON payload
    res.json({
      success: true,
      total_groups: responseData.length,
      data: responseData,
    });
  } catch (err) {
    console.error(
      `❌ Error fetching ${req.query.category} custom collection:`,
      err,
    );
    res.status(500).json({
      success: false,
      message: "Error fetching custom tool collection",
    });
  }
});
router.fetchAllToolsData = fetchAllToolsData;
router.fetchModelData = fetchModelData;
router.categoryMapping = categoryMapping;
router.generateSlug = generateSlug;
router.getCategoryByModel = getCategoryByModel;
router.deduplicateTools = deduplicateTools;

module.exports = router;
