const express = require("express");
const Page = require("../models/Page");
const {
  validatePage,
  handleValidationErrors,
} = require("../middleware/validation");
const { protect, authorize } = require("../middleware/auth");
const { default: slugify } = require("slugify");
const mongoose = require("mongoose");
const SeoModel = require("../models/SeoRecord");
const { modelNameToSlugMap } = require("../utils/seoHelper");
const User = require("../models/User");


async function generateUniqueSlug(base, currentId = null) {
  let slug = slugify(base, { lower: true, strict: true });
  let exists = null;
  let counter = 1;

  do {
    exists = await Page.findOne({
      slug,
      ...(currentId ? { _id: { $ne: currentId } } : {}),
    });

    if (exists) {
      slug = `${slugify(base, { lower: true, strict: true })}-${counter++}`;
    }
  } while (exists);

  return slug;
}

const router = express.Router();

// @desc    Get all pages (paginated)
// @route   GET /api/pages
// @access  Public
router.get("/", protect, async (req, res) => {
  try {
    const { search, page = 1, limit = 10 } = req.query;
    const query = {};

    if (search) {
      query.$or = [
        { page_title: { $regex: search, $options: "i" } },
        { seo_keyphrase: { $regex: search, $options: "i" } },
        { seo_title: { $regex: search, $options: "i" } },
      ];
    }

    const pages = await Page.find(query)
      .populate("tags", "name")
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));

    const total = await Page.countDocuments(query);

    res.json({
      success: true,
      data: pages,
      pagination: {
        current: Number(page),
        pages: Math.ceil(total / limit),
        total,
      },
    });
  } catch (error) {
    console.error("Get pages error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// router.get("/all-icons", async (req, res) => {
//   try {
//     const excludedModels = ["Message", "MarketingCategory", "Funding","Page"];

//     // Section → Model mapping
//     const sectionMapping = {
//       writing: ["Email", "Paraphrase", "CheckGrammar", "SocialMedia", "ContentTranslator ", "BlogPost"],
//       career: ["CoverLetterGenerator", "ResumeGenerator", "InterviewPrep", "FindCompanies"],
//       business: ["Solutions", "Marketing", "Research", "BusinessNameGenerator", "SmallBusinessIdeaGenerator"],
//       food: ["Tab"],
//       travel: ["DestinationTool"],
//       health: ["Wellness", "Therapy", "WeightLoss", "NutritionPlanner", "SymptomChecker", "CalorieCalculator"],
//       finance: ["Investing", "FinancialAdvisor", "BudgetCalculator", "RetirementCalculator", "DebtRelief", "SaveMoney", "OnlineIncome"],
//     };

//     const modelNames = mongoose
//       .modelNames()
//       .filter((name) => !excludedModels.includes(name));

//     console.log("Registered model names (excluding some):", modelNames);

//     // Fetch SEO records once
//     const seoRecords = await SeoModel.find({}, {
//       model_name: 1,
//       slug: 1,
//       seo_title: 1,
//       meta_description: 1,
//       cover_image: 1,
//     }).lean();

//     console.log("Total SEO records fetched:", seoRecords.length);

//     // Parallel queries for all models
//     const modelQueries = modelNames.map(async (name) => {
//       const model = mongoose.model(name);
//       const schemaPaths = Object.keys(model.schema.paths);

//       if (schemaPaths.includes("tab_active_icon_image") && schemaPaths.includes("tab_normal_icon_image")) {
//         const docs = await model.find({}, { tab_active_icon_image: 1, tab_normal_icon_image: 1 }).lean();
//         console.log(`Fetched ${docs.length} icons for model: ${name}`);

//         if (docs.length > 0) {
//           const seoData = seoRecords.find(
//             (seo) => seo.model_name?.toLowerCase() === name.toLowerCase()
//           );

//           const slug = modelNameToSlugMap[name] || seoData?.slug || name.toLowerCase();
//           console.log(`Using slug for ${name}:`, slug);

//           return docs.map((doc) => ({
//             _id: doc._id,
//             model_name: name,
//             tab_active_icon_image: doc.tab_active_icon_image,
//             tab_normal_icon_image: doc.tab_normal_icon_image,
//             slug,
//             seo_title: seoData?.seo_title || null,
//             meta_description: seoData?.meta_description || null,
//             cover_image: seoData?.cover_image || null,
//           }));
//         }
//       }
//       return [];
//     });

//     const results = await Promise.all(modelQueries);
//     const allTools = results.flat();
//     console.log("Total tools fetched after flattening:", allTools.length);

//     // Group by section
//     const sectionedData = {};
//     for (const [section, modelList] of Object.entries(sectionMapping)) {
//       sectionedData[section] = allTools.filter((tool) => modelList.includes(tool.model_name));
//       console.log(`Section "${section}" has ${sectionedData[section].length} tools`);
//     }

//     // Add "other" section if needed
//     const listedModels = Object.values(sectionMapping).flat();
//     const others = allTools.filter((tool) => !listedModels.includes(tool.model_name));
//     if (others.length > 0) {
//       sectionedData["other"] = others;
//       console.log(`Section "other" has ${others.length} tools`);
//     }

//     res.json(sectionedData);
//   } catch (error) {
//     console.error("❌ Error fetching icons and SEO data:", error);
//     res.status(500).json({ message: "Error fetching icons and SEO data" });
//   }
// });

// router.get("/all-icons/:category", async (req, res) => {
//   try {
//     const { category } = req.params;
//     const excludedModels = ["Message", "MarketingCategory", "Funding", "page"];

//     // Section → Model mapping
//     const sectionMapping = {
//       writing: [
//         "Email",
//         "Paraphrase",
//         "CheckGrammar",
//         "SocialMedia",
//         "ContentTranslator ",
//         "BlogPost",
//       ],
//       career: [
//         "CoverLetterGenerator",
//         "ResumeGenerator",
//         "InterviewPrep",
//         "FindCompanies",
//       ],
//       business: [
//         "Solutions",
//         "Marketing",
//         "Research",
//         "BusinessNameGenerator",
//         "SmallBusinessIdeaGenerator",
//       ],
//       food: ["Tab"],
//       travel: ["DestinationTool"], // include Pages if needed
//       health: [
//         "Wellness",
//         "Therapy",
//         "WeightLoss",
//         "NutritionPlanner",
//         "SymptomChecker",
//         "CalorieCalculator",
//       ],
//       finance: [
//         "Investing",
//         "FinancialAdvisor",
//         "BudgetCalculator",
//         "RetirementCalculator",
//         "DebtRelief",
//         "SaveMoney",
//         "OnlineIncome",
//       ],
//     };

//     if (!sectionMapping[category]) {
//       return res
//         .status(400)
//         .json({ success: false, message: "Invalid category" });
//     }

//     // Filter models for this category
//     const modelNames = sectionMapping[category].filter(
//       (name) => !excludedModels.includes(name)
//     );
//     console.log(`Fetching models for category "${category}":`, modelNames);

//     // Fetch SEO records once
//     const seoRecords = await SeoModel.find(
//       {},
//       {
//         model_name: 1,
//         slug: 1,
//         seo_title: 1,
//         meta_description: 1,
//         cover_image: 1,
//       }
//     ).lean();

//     // Fetch all docs for these models
//     const modelQueries = modelNames.map(async (name) => {
//       const model = mongoose.model(name);
//       const docs = await model.find().lean();
//       if (!docs.length) return [];

//       return docs.map((doc) => {
//         const seoData = seoRecords.find(
//           (seo) => seo.model_name?.toLowerCase() === name.toLowerCase()
//         );

//         return {
//           _id: doc._id,
//           model_name: name,
//           tab_active_icon_image: doc.tab_active_icon_image || null,
//           tab_normal_icon_image: doc.tab_normal_icon_image || null,
//           slug: modelNameToSlugMap[name] || seoData?.slug || name.toLowerCase(),
//           seo_title: seoData?.seo_title || null,
//           meta_description: seoData?.meta_description || null,
//           cover_image: seoData?.cover_image || null,
//         };
//       });
//     });

//     const results = await Promise.all(modelQueries);
//     const categoryTools = results.flat();
//     console.log(
//       `Total tools fetched for category "${category}":`,
//       categoryTools.length
//     );

//     res.json({ success: true, data: categoryTools });
//   } catch (error) {
//     console.error("❌ Error fetching icons for category:", error);
//     res.status(500).json({ message: "Error fetching icons for category" });
//   }
// });

router.get("/all-icons/:category", async (req, res) => {
  try {
    const { category } = req.params;

    // Category → Model mapping with specific models
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
        "FindCompanies",
        "AiJobProtectionPlan",
        "AiJobAutomationChecker"
      ],
      business: [
        "Solutions",
        "Marketing",
        "Research",
        "BusinessNameGenerator",
        "SmallBusinessIdeaGenerator",
      ],
      food: ["Tab"], // Food model
      travel: ["DestinationTool"], // Travel model
      health: [
        "Wellness",
        "Therapy",
        "WeightLoss",
        "NutritionPlanner",
        "SymptomChecker",
        "CalorieCalculator",
      ],
      finance: [
        "Investing",
        "FinancialAdvisor",
        "BudgetCalculator",
        "RetirementCalculator",
        "DebtRelief",
        "SaveMoney",
      ],
      pages: ["Page"],
      extra: ["LifeGoalsGenerator", "VisionBoardGenerator", 'NewYearsResolutionGenerator']
    };

    if (!categoryMapping[category]) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid category" });
    }

    // Get the model for this category
    const modelNames = categoryMapping[category];
    console.log(`Fetching data for category "${category}":`, modelNames);

    // Fetch SEO records
    const seoRecords = await SeoModel.find(
      {},
      {
        model_name: 1,
        slug: 1,
        seo_title: 1,
        meta_description: 1,
        cover_image: 1,
      }
    ).lean();

    // Fetch data for all models in this category
    const modelQueries = modelNames.map(async (modelName) => {
      try {
        const model = mongoose.model(modelName);

        // Define fields to select based on model type
        const selectFields = {
          tab_active_icon_image: 1,
          tab_normal_icon_image: 1,
          title: 1,
          slug: 1,
          description: 1,
          cover_image: 1,
          tool_cover_image: 1,
          seo_title: 1,
          meta_description: 1,
          seo_keyphrase: 1,
          // Include other common fields that might exist
          prompt_template: 1,
          fields: 1,
          createdAt: 1,
          updatedAt: 1,
        };

        // Add Page-specific fields
        if (modelName === "Page") {
          selectFields.page_title = 1;
          // selectFields.page_description = 1;
        }

        const docs = await model.find({}, selectFields).lean();

        if (!docs.length) {
          console.log(`No documents found for model: ${modelName}`);
          return [];
        }

        // Filter out incomplete/empty documents
        const validDocs = docs.filter((doc) => {
          // Filter criteria: should have at least one icon image and proper data
          const hasIcons =
            doc.tab_active_icon_image || doc.tab_normal_icon_image;
          const hasContent = doc.seo_title || doc.title || doc.description;

          return hasIcons && hasContent;
        });

        console.log(
          `Valid documents after filtering for ${modelName}:`,
          validDocs.length
        );

        return validDocs.map((doc) => {
          const seoData = seoRecords.find(
            (seo) => seo.model_name?.toLowerCase() === modelName.toLowerCase()
          );

          // Base structure for all items
          const baseItem = {
            _id: doc._id,
            model_name: modelName,
            tab_active_icon_image: doc.tab_active_icon_image || null,
            tab_normal_icon_image: doc.tab_normal_icon_image || null,
            slug: doc.slug || seoData?.slug || modelName.toLowerCase(),
            seo_title: doc.seo_title || seoData?.seo_title || null,
            meta_description:
              doc.meta_description || seoData?.meta_description || null,
            cover_image: doc.cover_image || seoData?.cover_image || null,
            tool_cover_image: doc.tool_cover_image || null,
            type: modelName === "Page" ? "page" : "tool",
            category: category,
            createdAt: doc.createdAt,
            updatedAt: doc.updatedAt,
          };

          // Add model-specific fields
          if (modelName === "Page") {
            // Page specific fields
            return {
              ...baseItem,
              page_title: doc.page_title || null,
              // page_description: doc.page_description || null,
              seo_keyphrase: doc.seo_keyphrase || null,
            };
          } else {
            // Other tool models
            return {
              ...baseItem,
              title: doc.title || null,
              seo_keyphrase: doc.seo_keyphrase || null,
              // Add other common tool fields as needed
            };
          }
        });
      } catch (error) {
        console.error(`Error fetching data for model ${modelName}:`, error);
        return [];
      }
    });

    const results = await Promise.all(modelQueries);
    const categoryData = results.flat();

    console.log(
      `Total items fetched for category "${category}":`,
      categoryData.length
    );

    res.json({
      success: true,
      data: categoryData,
    });
  } catch (error) {
    console.error("❌ Error fetching data for category:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching data for category",
    });
  }
});

// @desc    Get all SEO and image configuration data for all pages
// @route   GET /api/pages/seo-config/all
// @access  Private

router.get("/seo-config/all", protect, async (req, res) => {
  try {
    const records = await Page.find().lean();

    if (!records || records.length === 0) {
      return res.status(404).json({
        success: false,
        message: `No page records found`,
      });
    }

    // Transform the data to include only SEO config
    const seoConfigs = records.map((record) => ({
      _id: record._id,
      seo_keyphrase: record.seo_keyphrase,
      seo_title: record.seo_title,
      meta_description: record.meta_description,
      cover_image: record.cover_image,
      tool_cover_image: record.tool_cover_image,
      tab_normal_icon_image: record.tab_normal_icon_image,
      tab_active_icon_image: record.tab_active_icon_image,
      slug: record.slug,
      page_title: record.page_title,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    }));

    res.json({
      success: true,
      data: seoConfigs,
      count: seoConfigs.length,
      message: `All page SEO configurations fetched successfully`,
    });
  } catch (error) {
    console.error(`❌ Error fetching all page SEO configs:`, error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// // ✅ @desc    Get single page by slug
// // ✅ @route   GET /api/pages/slug/:slug
// // ✅ @access  Public
// router.get("/slug/:slug", async (req, res) => {
//   try {
//     const page = await Page.findOne({ slug: req.params.slug });

//     if (!page) {
//       return res
//         .status(404)
//         .json({ success: false, message: "Page not found" });
//     }

//     res.json({ success: true, data: page });
//   } catch (err) {
//     console.error("Get page by slug error:", err);
//     res.status(500).json({ success: false, message: "Server error" });
//   }
// });

/**
 * @route   GET /api/pages/slug/:slug
 * @desc    Get page by slug (includes bookmarked flag)
 * @access  Private (requires login to check bookmarks) 
 */
router.get("/slug/:slug", protect, async (req, res) => {
  try {
    const page = await Page.findOne({ slug: req.params.slug })
      .populate("tags", "name")
      .lean();

    if (!page) {
      return res
        .status(404)
        .json({ success: false, message: "Page not found" });
    }

    // ✅ Default bookmark flag
    let isBookmarked = false;

    // ✅ Check if user is logged in and has this page bookmarked
    if (req.user && req.user.id) {
      try {
        const user = await User.findById(req.user.id).lean();
        const bookmarks = user?.bookmarks || [];

        isBookmarked = bookmarks.some(
          (b) =>
            b.itemId.toString() === page._id.toString() &&
            b.modelName === "Page"
        );
      } catch (err) {
        console.warn("⚠️ User lookup failed — defaulting to no bookmarks");
      }
    }

    // ✅ Include bookmarked flag in response
    const pageWithBookmark = { ...page, bookmarked: isBookmarked, model_name: "Page", };

    res.json({
      success: true,
      data: pageWithBookmark,
    });
  } catch (error) {
    console.error("❌ Error fetching page by slug:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
});


// ✅ @desc    Get single page
// ✅ @route   GET /api/pages/:id
// ✅ @access  Public
router.get("/:id", protect, async (req, res) => {
  try {
    const page = await Page.findById(req.params.id).populate("tags", "name");
    if (!page) {
      return res
        .status(404)
        .json({ success: false, message: "Page not found" });
    }
    res.json({ success: true, data: page });
  } catch (err) {
    console.error("Get single page error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// @desc    Create a new page
// @route   POST /api/pages
// @access  Private
router.post(
  "/",
  protect,
  validatePage,
  handleValidationErrors,
  async (req, res) => {
    try {
      const { page_title } = req.body;
      const slug = await generateUniqueSlug(req.body.slug || page_title);

      const newPage = await Page.create({ ...req.body, slug });
      res.status(201).json({ success: true, data: newPage });
    } catch (err) {
      console.error("Create page error:", err);
      res.status(500).json({ success: false, message: "Server error" });
    }
  }
);

// @desc    Update a page
// @route   PUT /api/pages/:id
// @access  Private
router.put(
  "/:id",
  protect,
  validatePage,
  handleValidationErrors,
  async (req, res) => {
    try {
      const { page_title } = req.body;
      const slug = await generateUniqueSlug(
        req.body.slug || page_title,
        req.params.id
      );

      const updated = await Page.findByIdAndUpdate(
        req.params.id,
        { ...req.body, slug },
        { new: true }
      ).populate("tags", "name");

      if (!updated)
        return res
          .status(404)
          .json({ success: false, message: "Page not found" });

      res.json({ success: true, data: updated });
    } catch (err) {
      console.error("Update page error:", err);
      res.status(500).json({ success: false, message: "Server error" });
    }
  }
);

// @desc    Delete a page
// @route   DELETE /api/pages/:id
// @access  Private
router.delete("/:id", protect, authorize("admin"), async (req, res) => {
  try {
    const deleted = await Page.findByIdAndDelete(req.params.id);
    if (!deleted)
      return res
        .status(404)
        .json({ success: false, message: "Page not found" });
    res.json({ success: true, message: "Deleted successfully" });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// ✅ @desc    Bulk delete pages
// ✅ @route   POST /api/pages/bulk-delete
// ✅ @access  Private
router.post("/bulk-delete", protect, authorize("admin"), async (req, res) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res
        .status(400)
        .json({ success: false, message: "IDs array is required" });
    }

    const result = await Page.deleteMany({ _id: { $in: ids } });

    res.json({
      success: true,
      message: `Deleted ${result.deletedCount} page(s) successfully.`,
      deletedCount: result.deletedCount,
    });
  } catch (err) {
    console.error("Bulk delete error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

module.exports = router;
