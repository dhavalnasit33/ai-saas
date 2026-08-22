const express = require("express");
const TrendingNews = require("../models/TrendingNews");
const { protect, authorize } = require("../middleware/auth");
const {
  validateTrendingNews,
  handleValidationErrors,
} = require("../middleware/validation");
const { default: axios } = require("axios");
const slugify = require("slugify");
const News = require("../models/News");
const FormData = require("form-data");
const User = require("../models/User");
const NewsCategory = require("../models/NewsCategory");

const router = express.Router();

// GET all (paginated with category name)
router.get("/", protect, async (req, res) => {
  try {
    const { search, page = 1, limit = 10, category_id } = req.query;

    // Build query object
    const query = {};

    if (search) {
      query.title = { $regex: search, $options: "i" };
    }

    if (category_id) {
      query.category_id = category_id;
    }

    const items = await TrendingNews.find(query)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit))
      .populate("category_id", "name"); // only get `name` from category

    const total = await TrendingNews.countDocuments(query);

    res.json({
      success: true,
      data: items,
      pagination: {
        current: Number(page),
        pages: Math.ceil(total / limit),
        total,
      },
    });
  } catch (err) {
    console.error("List error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

router.get("/latest", protect, async (req, res) => {
  let { category = "world", page = 1, pageSize = 5 } = req.query;

  page = Number(page) || 1;
  pageSize = Number(pageSize) || 5;

  try {
    let categories = [];

    const categoryLower = category.toLowerCase();
    // Determine categories
    if (categoryLower === "home") {
  if (!req.user) {
    // Guest → Use all categories
    const allCategories = await NewsCategory.find().select("name").lean();
    categories = allCategories.map((c) => c.name.toLowerCase());
  } else {
    // Authenticated user → Use selected categories
    const user = await User.findById(req.user.id)
      .select("selected_categories")
      .lean();
    const selectedCategoryIds = user?.selected_categories || [];

    if (selectedCategoryIds.length === 0) {
      const allCategories = await NewsCategory.find().select("name").lean();
      categories = allCategories.map((c) => c.name.toLowerCase());
    } else {
      const selectedCategories = await NewsCategory.find({
        _id: { $in: selectedCategoryIds },
      })
        .select("name")
        .lean();
      categories = selectedCategories.map((cat) => cat.name.toLowerCase());
    }
  }
} else {
  // Categories from query params
  categories = category.split(",").map((c) => c.trim().toLowerCase());
}

    // Fetch all matching news from DB
    let allNews = await News.find({
      category: { $in: categories },
      image: { $ne: null },
    }).lean();

    // Shuffle array for randomization
    allNews = allNews.sort(() => 0.5 - Math.random());

    // Paginate
    const startIndex = (page - 1) * pageSize;
    const pagedNews = allNews.slice(startIndex, startIndex + pageSize);

    res.json({
      success: true,
      categories,
      count: allNews.length,
      data: pagedNews,
    });
  } catch (error) {
    console.error("❌ Error fetching latest news:", error.message);
    res.status(500).json({
      success: false,
      error: "Failed to fetch news from database",
    });
  }
});

// GET single
router.get("/:id", protect, async (req, res) => {
  try {
    const item = await TrendingNews.findById(req.params.id);
    if (!item)
      return res.status(404).json({ success: false, message: "Not found" });

    res.json({ success: true, data: item });
  } catch (err) {
    console.error("Get single error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// CREATE
router.post(
  "/",
  protect,
  validateTrendingNews,
  handleValidationErrors,
  authorize("admin"),
  async (req, res) => {
    try {
      const { title, image, description, category_id } = req.body;
      const created = await TrendingNews.create({
        title,
        image,
        description,
        category_id,
      });

      res.status(201).json({ success: true, data: created });
    } catch (err) {
      console.error("Create error:", err);
      res.status(500).json({ success: false, message: "Server error" });
    }
  }
);

// UPDATE
router.put(
  "/:id",
  protect,
  validateTrendingNews,
  handleValidationErrors,
  authorize("admin"),
  async (req, res) => {
    try {
      const { title, image, description, category_id } = req.body;

      if (!title || !category_id) {
        return res.status(400).json({
          success: false,
          message: "Title and category_id are required",
        });
      }

      const updated = await TrendingNews.findByIdAndUpdate(
        req.params.id,
        { title, image, description, category_id },
        { new: true }
      );

      if (!updated)
        return res.status(404).json({ success: false, message: "Not found" });

      res.json({ success: true, data: updated });
    } catch (err) {
      console.error("Update error:", err);
      res.status(500).json({ success: false, message: "Server error" });
    }
  }
);

// DELETE
router.delete("/:id", protect, authorize("admin"), async (req, res) => {
  try {
    const deleted = await TrendingNews.findByIdAndDelete(req.params.id);
    if (!deleted)
      return res.status(404).json({ success: false, message: "Not found" });

    res.json({ success: true, message: "Deleted successfully" });
  } catch (err) {
    console.error("Delete error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// BULK DELETE
router.post("/bulk-delete", protect, authorize("admin"), async (req, res) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ success: false, message: "IDs required" });
    }

    const result = await TrendingNews.deleteMany({ _id: { $in: ids } });

    res.json({
      success: true,
      message: `Deleted ${result.deletedCount} item(s)`,
      deletedCount: result.deletedCount,
    });
  } catch (err) {
    console.error("Bulk delete error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

router.patch("/:id/display", protect, authorize("admin"), async (req, res) => {
  try {
    const { displayOnHomePage } = req.body;

    if (typeof displayOnHomePage !== "boolean") {
      return res.status(400).json({
        success: false,
        message: "displayOnHomePage must be a boolean",
      });
    }

    const updated = await TrendingNews.findByIdAndUpdate(
      req.params.id,
      { displayOnHomePage },
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({ success: false, message: "Not found" });
    }

    res.json({ success: true, data: updated });
  } catch (err) {
    console.error("Toggle displayOnHomePage error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

module.exports = router;
