const express = require("express");
const router = express.Router();
const HomeToolTag = require("../models/HomeToolTag");
const { protect, authorize } = require("../middleware/auth");
const discoverToolsRoutes = require("./discoverTools");
const Page = require("../models/Page");
const User = require("../models/User");
const HomeToolCategory = require("../models/HomeToolCategory");
const { default: mongoose } = require("mongoose");
const fetchAllToolsData = discoverToolsRoutes.fetchAllToolsData;
const fetchModelData = discoverToolsRoutes.fetchModelData;
const deduplicateTools = discoverToolsRoutes.deduplicateTools;

// GET paginated + search
router.get("/", protect, authorize("Admin"), async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const search = req.query.search || "";

    const query = search ? { name: { $regex: search, $options: "i" } } : {};

    const total = await HomeToolTag.countDocuments(query);

    const tags = await HomeToolTag.find(query)
      .skip((page - 1) * limit)
      .limit(limit)
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: tags,
      pagination: { current: page, pages: Math.ceil(total / limit), total },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get("/list", protect, async (req, res) => {
  try {
    const searchQuery = req.query.search?.toLowerCase() || "";
    const filterCategory = req.query.category?.toLowerCase();
    const filterTagId = req.query.tagId;

    // 1️⃣ Fetch all active tags
    const tags = await HomeToolTag.find({ is_active: true })
      .sort({ name: 1 })
      .lean();

    const dbTagMap = {};
    const dbTagById = {};
    tags.forEach((tag) => {
      dbTagMap[tag.slug] = tag;
      dbTagById[tag._id.toString()] = tag;
    });

    // 2️⃣ Fetch all tools
    let allData = await fetchAllToolsData(searchQuery);

    // ⭐ Remove cross-model duplicates
    allData = deduplicateTools(allData);

    // ✅ Define the list of slugs you want to hide
    const excludedRecord = [
      "convert-jpg-to-png",
      "convert-png-to-jpg",
      "convert-jpg-to-webp",
      "convert-webp-to-jpg",
      "convert-png-to-webp",
      "convert-webp-to-png",
      "grammar-checker",
      "budget-calculator",
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

    // ✅ Apply Filter to hide excluded records
    allData = allData.filter((item) => {
      if (item.model_name === "AIProviderComparison") return false;

      if (item.model_name === "Page" || item.model_name === "MarketingTool") {
        return !excludedRecord.includes(item.slug?.toString());
      }
      return true;
    });

    // ⭐ CATEGORY FILTER USING HomeToolCategory MODEL
    // ⭐ CATEGORY FILTER USING HomeToolCategory MODEL
    let filterCategoryId = null;
    let popularCategoryId = null;

    // 🆕 Fetch the "Popular" category to get its ID
    const popularCategoryDoc = await HomeToolCategory.findOne({
      slug: "popular", // You can also use { name: /popular/i } if slug isn't guaranteed
    }).lean();

    if (popularCategoryDoc) {
      popularCategoryId = popularCategoryDoc._id.toString();
    }

    if (filterCategory && filterCategory !== "popular") {
      const cat = await HomeToolCategory.findOne({
        slug: filterCategory,
        is_active: true,
      }).lean();

      if (cat) {
        filterCategoryId = cat._id.toString();
      }
    }

    if (filterTagId) {
      if (filterTagId.toLowerCase() === "popular") {
        // ✅ Intercept "popular" as a tagId to filter popular tools
        allData = allData.filter(
          (item) =>
            item.is_popular === true ||
            (popularCategoryId &&
              (item.categories || []).some((c) => (c._id ? c._id.toString() : c.toString()) === popularCategoryId)),
        );
      } else {
        // Standard tag filtering by ID
        allData = allData.filter((item) => {
          const catIds = (item.categories || []).map((c) => (c._id ? c._id.toString() : c.toString()));
          const tagIds = (item.tags || []).map((t) => (t._id ? t._id.toString() : t.toString()));
          return catIds.includes(filterTagId) || tagIds.includes(filterTagId);
        });
      }
    }
    // ⭐ APPLY HomeToolCategory FILTER
    if (filterCategoryId) {
      allData = allData.filter((item) =>
        (item.categories || []).some((c) => (c._id ? c._id.toString() : c.toString()) === filterCategoryId),
      );
    }

    // 4️⃣ Category remap
    const categoryRemap = { career: "job-search" };

    // 5️⃣ Page slug → tag mapping
    const pageTagMap = {
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
    };

    // 6️⃣ Assign final tags
    const categorizedData = allData.flatMap((item) => {
      let tagsArr = [];

      if (item.categories?.length) {
        tagsArr = item.categories
          .map((cid) => dbTagById[cid.toString()]?.slug)
          .filter(Boolean);
      }

      let primaryTag =
        item.category || item.model_name?.toLowerCase() || "other";
      if (categoryRemap[primaryTag]) primaryTag = categoryRemap[primaryTag];

      if (item.model_name === "Page") {
        const foundTag = Object.entries(pageTagMap).find(([t, slugs]) =>
          slugs.includes(item.slug?.toLowerCase()),
        );
        if (foundTag) primaryTag = foundTag[0];
      }

      if (!tagsArr.includes(primaryTag)) tagsArr.push(primaryTag);
      tagsArr = [...new Set(tagsArr)];

      return tagsArr.map((tag) => ({ ...item, category: tag }));
    });

    // 7️⃣ Fetch user bookmarks
    let userBookmarks = [];
    if (req.user?.id) {
      try {
        const user = await User.findById(req.user.id).lean();
        userBookmarks = user?.bookmarks || [];
      } catch {}
    }

    // 8️⃣ Add bookmark flag and enrich tags
    let mergedData = categorizedData.map((item) => {
      const isBookmarked = userBookmarks.some(
        (b) =>
          b.itemId.toString() === item._id.toString() &&
          b.modelName === item.model_name,
      );

      // Map tag IDs to objects with name
      const enrichedTags = (item.tags || []).map((tagIdOrObj) => {
        const id = tagIdOrObj._id ? tagIdOrObj._id.toString() : tagIdOrObj.toString();
        const tag = dbTagById[id];
        return tag ? { _id: tag._id, name: tag.name } : { _id: id };
      });

      return { ...item, bookmarked: isBookmarked, tags: enrichedTags };
    });

    // 9️⃣ Popular tools
    const popularItems = mergedData.filter(
      (item) =>
        popularCategoryId &&
        (item.categories || []).some((c) => (c._id ? c._id.toString() : c.toString()) === popularCategoryId),
    );
    popularItems.forEach((i) => (i.category = "popular"));

    if (filterCategory === "popular") {
      return res.json({
        success: true,
        total: popularItems.length,
        data: [
          {
            category: "popular",
            display_name: "Popular Tools",
            icon: "",
            description: "",
            items: popularItems,
          },
        ],
      });
    }

    // 🔟 Group by category
    const groupedDataMap = mergedData.reduce((acc, item) => {
      const cat = item.category || "other";
      const dbTag = dbTagMap[cat] || {};
      const displayName = dbTag.name || cat;

      if (!acc[cat]) {
        acc[cat] = {
          category: cat,
          display_name: displayName,
          icon: dbTag.icon || "",
          description: dbTag.description || "",
          items: [],
        };
      }
      acc[cat].items.push(item);
      return acc;
    }, {});

    // Convert the map to an array and sort categories alphabetically
    let groupedByCategory = Object.values(groupedDataMap)
      .filter((g) => g.items.length > 0)
      .sort((a, b) => a.display_name.localeCompare(b.display_name));

    // ⭐ EXTRACT STICKY ITEMS INTO A SINGLE "FEATURED" ROW ⭐
    const stickyItems = [];

    groupedByCategory.forEach((group) => {
      // Find all sticky items in this specific category
      const groupStickies = group.items.filter((item) => item.sticky === true);

      // Add them to our master sticky list
      stickyItems.push(...groupStickies);

      // Remove them from their original category so they don't show up twice
      group.items = group.items.filter((item) => item.sticky !== true);
    });

    // Clean up any categories that might be empty now that we moved their items
    groupedByCategory = groupedByCategory.filter((g) => g.items.length > 0);

    // Optional: Sort the sticky items (fallback to newest first)
    stickyItems.sort((a, b) => {
      const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return (isNaN(timeB) ? 0 : timeB) - (isNaN(timeA) ? 0 : timeA);
    });

    // If we found any sticky items, create a "Featured" category at the VERY TOP (Index 0)
    if (stickyItems.length > 0) {
      groupedByCategory.unshift({
        category: "featured",
        display_name: "Featured Tools", // Feel free to rename this to "Top Tools", "Trending", etc.
        icon: "",
        description: "Our top recommended tools.",
        items: stickyItems,
      });
    }

    res.json({
      success: true,
      total: mergedData.length,
      categories: groupedByCategory.length,
      data: groupedByCategory,
    });
  } catch (err) {
    console.error("❌ Error fetching home page tools:", err);
    res
      .status(500)
      .json({ success: false, message: "Error fetching home page tools" });
  }
});

router.get("/tags-by-model", protect, async (req, res) => {
  try {
    const { category, model, modelSlug } = req.query;

    // 1️⃣ Load all active tags
    const allTags = await HomeToolTag.find({ is_active: true }).lean();
    const tagById = {};
    allTags.forEach((t) => (tagById[t._id.toString()] = t));

    // 2️⃣ Validate model
    if (!model) {
      return res.status(400).json({
        success: false,
        message: "Model not found. Provide ?model=",
      });
    }

    let modelData = [];

    // 3️⃣ If both model and slug provided, fetch only that single record
    if (model && modelSlug) {
      const Model = mongoose.model(model);
      modelData = await Model.findOne({ slug: modelSlug }).lean();

      if (!modelData) {
        return res.status(404).json({
          success: false,
          message: "No record found with the provided slug in this model",
        });
      }

      // Wrap in array to keep downstream logic consistent
      modelData = [modelData];
    } else {
      // 4️⃣ Otherwise, fetch all records for this model
      modelData = await fetchModelData(model, category || null);
    }

    // 5️⃣ Optionally filter by category (if fetching multiple records)
    const filteredData = category
      ? modelData.filter(
          (item) =>
            item.category?.toLowerCase() === category.toLowerCase() ||
            item.categories?.includes(category),
        )
      : modelData;

    // 6️⃣ Collect unique tag IDs
    const usedTagIds = new Set();
    filteredData.forEach((item) => {
      if (item.tags?.length) {
        item.tags.forEach((tag) => {
          const id = tag._id ? tag._id.toString() : tag.toString();
          usedTagIds.add(id);
        });
      }
    });

    // 7️⃣ Map tag IDs to tag objects
    const usedTags = [...usedTagIds].map((id) => tagById[id]).filter(Boolean);

    return res.json({
      success: true,
      category: category || null,
      model: model,
      totalTags: usedTags.length,
      tags: usedTags,
    });
  } catch (err) {
    console.error("❌ Error fetching tags by model:", err);
    res.status(500).json({
      success: false,
      message: "Error fetching tags by model",
    });
  }
});

router.get("/tags-by-category", protect, async (req, res) => {
  try {
    const categorySlug = req.query.category;

    // 1️⃣ Fetch all active tags
    const allTags = await HomeToolTag.find({ is_active: true }).lean();

    const dbTagById = {};
    allTags.forEach((tag) => {
      dbTagById[tag._id.toString()] = tag;
    });

    // If no category → return all tags
    if (!categorySlug) {
      return res.json({
        success: true,
        totalTags: allTags.length,
        tags: allTags,
      });
    }

    // 2️⃣ Mapping to identify Page-based categories
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
      design: ["logo-generator"],
      sales: ["email-verifier"],
    };

    let usedTagIds = new Set();

    // 3️⃣ SPECIAL: If category is images or pdf → find Page model by slug list
    if (pageCategoryMap[categorySlug]) {
      const slugs = pageCategoryMap[categorySlug];

      // Fetch Page docs by slug list
      const pages = await Page.find({ slug: { $in: slugs } }).lean();

      // Collect tag IDs from pages
      pages.forEach((p) => {
        if (p.tags?.length) {
          p.tags.forEach((t) => usedTagIds.add(t.toString()));
        }
      });
    } else {
      // 4️⃣ DEFAULT: Normal tools category filtering
      let allTools = await fetchAllToolsData();

      allTools = allTools.filter(
        (tool) => tool.category?.toLowerCase() === categorySlug.toLowerCase(),
      );

      allTools.forEach((tool) => {
        if (tool.tags?.length) {
          tool.tags.forEach((tag) => {
            const id = tag._id ? tag._id.toString() : tag.toString();
            usedTagIds.add(id);
          });
        }
      });
    }

    // 5️⃣ Filter only tags that exist in DB
    const usedTags = Array.from(usedTagIds)
      .map((tid) => dbTagById[tid])
      .filter(Boolean);

    return res.json({
      success: true,
      category: categorySlug,
      totalTags: usedTags.length,
      tags: usedTags,
    });
  } catch (err) {
    console.error("❌ Error fetching tags by category:", err);
    res
      .status(500)
      .json({ success: false, message: "Error fetching tags by category" });
  }
});

// GET single by ID
router.get("/:id", protect, authorize("Admin"), async (req, res) => {
  try {
    const tag = await HomeToolTag.findById(req.params.id);

    if (!tag) {
      return res.status(404).json({ success: false, message: "Tag not found" });
    }

    res.json({ success: true, data: tag });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST create
router.post("/", protect, authorize("Admin"), async (req, res) => {
  try {
    const tag = new HomeToolTag(req.body);
    await tag.save();
    res.json({ success: true, data: tag });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// PUT update tag
router.put("/:id", protect, authorize("Admin"), async (req, res) => {
  try {
    const tag = await HomeToolTag.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    if (!tag) {
      return res.status(404).json({ success: false, message: "Tag not found" });
    }

    res.json({ success: true, data: tag });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// PATCH toggle active
router.patch("/:id/toggle", protect, authorize("Admin"), async (req, res) => {
  try {
    const tag = await HomeToolTag.findById(req.params.id);

    if (!tag) {
      return res.status(404).json({ success: false, message: "Tag not found" });
    }

    tag.is_active = !tag.is_active;
    await tag.save();

    res.json({ success: true, data: { is_active: tag.is_active } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE single
router.delete("/:id", protect, authorize("Admin"), async (req, res) => {
  try {
    await HomeToolTag.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST bulk-delete
router.post("/bulk-delete", protect, authorize("Admin"), async (req, res) => {
  try {
    const { ids } = req.body;

    await HomeToolTag.deleteMany({ _id: { $in: ids } });

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
