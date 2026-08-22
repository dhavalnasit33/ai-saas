// routes/tabRoutes.js
const express = require("express");
const Tab = require("../models/Tab");
const { protect, authorize } = require("../middleware/auth");
const {
  validateTab,
  handleValidationErrors,
} = require("../middleware/validation");
const { upsertSeoRecord } = require("../utils/seoHelper");
const User = require("../models/User");

const router = express.Router();

/**
 * @route   GET /api/tabs
 * @desc    Get paginated & filtered tabs
 */
router.get("/", protect, async (req, res) => {
  try {
    const { search = "", page = 1, limit = 10 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const query = search
      ? {
          $or: [
            { title: { $regex: search, $options: "i" } },
            { description: { $regex: search, $options: "i" } },
          ],
        }
      : {};

    const total = await Tab.countDocuments(query);

    const tabs = await Tab.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .lean();

    res.json({
      success: true,
      data: tabs,
      pagination: {
        current: Number(page),
        pages: Math.ceil(total / limit),
        total,
      },
    });
  } catch (error) {
    console.error("❌ Error fetching tabs:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

/**
 * @route   GET /api/tabs/:id
 * @desc    Get tab by ID
 */
router.get("/:id", protect, authorize("Admin"), async (req, res) => {
  try {
    const tab = await Tab.findById(req.params.id);
    if (!tab) {
      return res.status(404).json({ success: false, message: "Tab not found" });
    }
    res.json({ success: true, data: tab });
  } catch (error) {
    console.error("❌ Error fetching tab:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

/**
 * @route   GET /api/tabs/:slug
 * @desc    Get tab by slug
 */
/**
 * @route   GET /api/tabs/get/:slug
 * @desc    Get tab by slug (includes bookmarked flag)
 */
router.get("/get/:slug", protect, async (req, res) => {
  try {
    const tab = await Tab.findOne({ slug: req.params.slug }).lean();
    console.log("🚀 ~ tab:", tab)

    if (!tab) {
      return res.status(404).json({ success: false, message: "Tab not found" });
    }

    // ✅ Default bookmarked flag
    let isBookmarked = false;
    
    // ✅ If user logged in, check bookmarks
    if (req.user && req.user.id) {
      try {
        const user = await User.findById(req.user.id).lean(); 
        const userBookmarks = user?.bookmarks || [];

        isBookmarked = userBookmarks.some(
          (b) =>
            b.itemId.toString() === tab._id.toString() && b.modelName === "Tab"
        ); 
      } catch (err) {
        console.warn("User lookup failed, defaulting to no bookmarks");
      }
    } 
    
    // ✅ Include bookmark flag in response
    const tabWithBookmark = { ...tab, bookmarked: isBookmarked }; 

    res.json({ success: true, data: tabWithBookmark });
  } catch (error) {
    console.error("❌ Error fetching tab by slug:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

/**
 * @route   POST /api/tabs
 * @desc    Create new tab + SEO record
 */
router.post(
  "/",
  protect,
  authorize("Admin"),
  validateTab,
  handleValidationErrors,
  async (req, res) => {
    try {
      // 1️⃣ Create tab
      const tab = await Tab.create(req.body);

      // 2️⃣ Upsert SEO record if SEO data provided
      if (
        req.body.seo_keyphrase ||
        req.body.seo_title ||
        req.body.meta_description ||
        req.body.cover_image ||
        req.body.slug
      ) {
        await upsertSeoRecord({
          refId: tab._id,
          modelName: "Tab",
          seo: {
            seo_keyphrase: req.body.seo_keyphrase,
            seo_title: req.body.seo_title,
            meta_description: req.body.meta_description,
            cover_image: req.body.cover_image,
            slug: req.body.title,
          },
        });
      }

      res.status(201).json({
        success: true,
        message: "Tab created",
        data: tab,
      });
    } catch (error) {
      console.error("❌ Create tab error:", error);
      res.status(500).json({ success: false, message: "Server error" });
    }
  }
);

/**
 * @route   PUT /api/tabs/:id
 * @desc    Update tab + SEO record
 */
router.put(
  "/:id",
  protect,
  authorize("Admin"),
  validateTab,
  handleValidationErrors,
  async (req, res) => {
    try {
      // 1️⃣ Update tab
      const updated = await Tab.findByIdAndUpdate(req.params.id, req.body, {
        new: true,
        runValidators: true,
      });

      if (!updated) {
        return res
          .status(404)
          .json({ success: false, message: "Tab not found" });
      }

      // 2️⃣ Upsert SEO record if SEO data provided
      if (
        req.body.seo_keyphrase ||
        req.body.seo_title ||
        req.body.meta_description ||
        req.body.cover_image ||
        req.body.slug
      ) {
        await upsertSeoRecord({
          refId: updated._id,
          modelName: "Tab",
          seo: {
            seo_keyphrase: req.body.seo_keyphrase,
            seo_title: req.body.seo_title,
            meta_description: req.body.meta_description,
            cover_image: req.body.cover_image,
            slug: req.body.title,
          },
        });
      }

      res.json({
        success: true,
        message: "Tab updated",
        data: updated,
      });
    } catch (error) {
      console.error("❌ Update tab error:", error);
      res.status(500).json({ success: false, message: "Server error" });
    }
  }
);

/**
 * @route   POST /api/tabs/bulk-delete
 * @desc    Bulk delete tabs
 */
router.post("/bulk-delete", protect, authorize("Admin"), async (req, res) => {
  const { ids } = req.body;

  if (!Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ success: false, message: "No IDs provided" });
  }

  try {
    const result = await Tab.deleteMany({ _id: { $in: ids } });
    res.json({
      success: true,
      message: `${result.deletedCount} tabs deleted.`,
    });
  } catch (error) {
    console.error("❌ Bulk delete error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

/**
 * @route   DELETE /api/tabs/:id
 * @desc    Delete tab by ID
 */
router.delete("/:id", protect, authorize("Admin"), async (req, res) => {
  try {
    const tab = await Tab.findByIdAndDelete(req.params.id);
    if (!tab) {
      return res.status(404).json({ success: false, message: "Tab not found" });
    }
    res.json({ success: true, message: "Tab deleted" });
  } catch (error) {
    console.error("❌ Delete tab error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

module.exports = router;
