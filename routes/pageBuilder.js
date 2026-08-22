const express = require("express");
const router = express.Router();

const { protect, authorize } = require("../middleware/auth");
const { upsertSeoRecord } = require("../utils/seoHelper");
const {
  validatePageBuilder,
  handleValidationErrors,
} = require("../middleware/validation");
const PageBuilder = require("../models/PageBuilder");

// 1. POST - Create (Admin)
router.post(
  "/",
  protect,
  authorize("admin"),
  validatePageBuilder,
  handleValidationErrors,
  async (req, res) => {
    try {
      const newPage = await PageBuilder.create(req.body);
      if (upsertSeoRecord) {
        await upsertSeoRecord({
          refId: newPage._id,
          modelName: "page-builder",
          seo: {
            seo_title: newPage.seo_title,
            meta_description: newPage.meta_description,
            cover_image: newPage.cover_image,
          },
        });
      }
      res.status(201).json({ success: true, data: newPage });
    } catch (error) {
      console.error("Create PageBuilder error:", error);
      res.status(500).json({ success: false, message: "Server error" });
    }
  },
);

// 2. GET (Admin)
router.get("/admin", protect, authorize("admin"), async (req, res) => {
  try {
    const data = await PageBuilder.find().sort({ createdAt: -1 });
    res.json({ success: true, data: data });
  } catch (error) {
    console.error("Get Admin PageBuilder error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// 3. GET (Public) - Get Active Config with Filtering
router.get("/", async (req, res) => {
  try {
    let page = await PageBuilder.findOne().sort({ createdAt: -1 }).lean();

    if (!page) {
      return res
        .status(404)
        .json({ success: false, message: "Page Builder data not found" });
    }

    const tabFilter = req.query.tab;

    if (tabFilter && tabFilter !== "all") {
      // 1. Filter Cards (Use Cases)
      if (page.cards) {
        page.cards = page.cards.filter((card) => card.category === tabFilter);
      }

      // 2. Filter Grid Features
      if (page.grid_features) {
        page.grid_features = page.grid_features.filter(
          (f) => f.category === tabFilter,
        );
      }

      // 3. Find Specific Hero Section
      if (page.hero_sections) {
        // Attach a single hero object to 'hero_data' for the frontend
        page.hero_data = page.hero_sections.find(
          (h) => h.category === tabFilter,
        );
      }
    }

    // Cleanup arrays to reduce payload size if desired, or keep them.
    // Here we remove the raw full lists so frontend isn't confused
    if (page.hero_data) delete page.hero_sections;

    res.json({ success: true, data: page });
  } catch (error) {
    console.error("Get PageBuilder error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

router.get("/tabs", async (req, res) => {
  try {
    const page = await PageBuilder.findOne()
      .select("tabs")
      .sort({ createdAt: -1 });

    if (!page) {
      return res.status(404).json({ success: false, data: [] });
    }

    res.json({ success: true, data: page.tabs });
  } catch (error) {
    console.error("Get PageBuilder Tabs error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// 4. PUT - Update (Admin)
router.put(
  "/:id",
  protect,
  authorize("admin"),
  validatePageBuilder,
  handleValidationErrors,
  async (req, res) => {
    try {
      const updatedPage = await PageBuilder.findByIdAndUpdate(
        req.params.id,
        req.body,
        { new: true, runValidators: true },
      );

      if (!updatedPage) {
        return res
          .status(404)
          .json({ success: false, message: "Record not found" });
      }
      if (upsertSeoRecord) {
        await upsertSeoRecord({
          refId: updatedPage._id,
          modelName: "page-builder",
          seo: {
            seo_title: updatedPage.seo_title,
            meta_description: updatedPage.meta_description,
            cover_image: updatedPage.cover_image,
          },
        });
      }
      res.json({ success: true, data: updatedPage });
    } catch (error) {
      console.error("Update PageBuilder error:", error);
      res.status(500).json({ success: false, message: "Server error" });
    }
  },
);

// 5. DELETE
router.delete("/:id", protect, authorize("admin"), async (req, res) => {
  try {
    const deletedPage = await PageBuilder.findByIdAndDelete(req.params.id);
    if (!deletedPage) {
      return res
        .status(404)
        .json({ success: false, message: "Record not found" });
    }
    res.json({ success: true, message: "Deleted successfully" });
  } catch (error) {
    console.error("Delete PageBuilder error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

module.exports = router;
