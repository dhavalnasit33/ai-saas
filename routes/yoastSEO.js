// routes/yoastSEO.js
const express = require("express");
const YoastSEO = require("../models/YoastSEO");
const { validateYoastSEO, handleValidationErrors } = require('../middleware/validation');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// @desc    Get all Yoast SEO entries (paginated)
// @route   GET /api/yoast-seo
// @access  Public 
router.get("/", protect,async (req, res) => {
  try {
    const { search, page = 1, limit = 10 } = req.query;
    const query = {};

    if (search) {
      query.$or = [
        { seo_keyphrase: { $regex: search, $options: "i" } },
        { seo_title: { $regex: search, $options: "i" } },
        { meta_description: { $regex: search, $options: "i" } },
      ];
    }

   
    const seoList = await YoastSEO.find(query)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));

    const total = await YoastSEO.countDocuments(query);

    res.json({
      success: true,
      data: seoList,
      pagination: {
        current: Number(page),
        pages: Math.ceil(total / limit),
        total,
      },
    });
  } catch (error) {
    console.error("Get Yoast SEO error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});


// @desc    Create new YoastSEO
// @route   POST /api/yoast-seo
// @access  Public
router.post("/", protect, validateYoastSEO, handleValidationErrors, async (req, res) => {
  try {
    const seo = await YoastSEO.create(req.body);
    res.status(201).json({ success: true, data: seo });
  } catch (err) {
    console.error("Create SEO error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// @desc    Update YoastSEO
// @route   PUT /api/yoast-seo/:id
// @access  Public
router.put("/:id", protect, validateYoastSEO, handleValidationErrors, async (req, res) => {
  try {
    const updated = await YoastSEO.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!updated) return res.status(404).json({ success: false, message: "SEO entry not found" });
    res.json({ success: true, data: updated });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// @desc    Delete YoastSEO
// @route   DELETE /api/yoast-seo/:id
// @access  Private
router.delete("/:id", protect, authorize("admin"),handleValidationErrors, async (req, res) => {
  try {
    const deleted = await YoastSEO.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ success: false, message: "SEO entry not found" });
    res.json({ success: true, message: "Deleted successfully" });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// @desc    Bulk Delete YoastSEO
// @route   POST /api/yoast-seo/bulk-delete
// @access  Private
router.post(
  "/bulk-delete",
  protect,
  authorize("admin"),
  handleValidationErrors,
  async (req, res) => {
    try {
      const { ids } = req.body;

      if (!Array.isArray(ids) || !ids.length) {
        return res
          .status(400)
          .json({ success: false, message: "IDs array is required" });
      }

      const result = await YoastSEO.deleteMany({ _id: { $in: ids } });
      res.json({ success: true, deletedCount: result.deletedCount });
    } catch (err) {
      res.status(500).json({ success: false, message: "Server error" });
    }
  }
);



module.exports = router;
