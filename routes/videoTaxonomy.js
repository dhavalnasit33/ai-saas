const express = require("express");
const router = express.Router();
const { VideoMainCategory, VideoSubcategory } = require("../models/VideoTaxonomy");
const { protect, authorize } = require("../middleware/auth");

// -------------------------------------------------------------
// GET /api/video-taxonomy (Public / App UI Endpoint)
// Returns all active Main Categories with populated Subcategories
// -------------------------------------------------------------
router.get("/", async (req, res) => {
  try {
    const mainCategories = await VideoMainCategory.find({ is_active: true })
      .sort({ display_order: 1 })
      .populate({
        path: "subcategories",
        match: { is_active: true },
        options: { sort: { display_order: 1 } },
      })
      .lean();

    return res.status(200).json({
      success: true,
      data: mainCategories,
    });
  } catch (error) {
    console.error("Error fetching video taxonomy:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch video taxonomy",
      error: error.message,
    });
  }
});

// -------------------------------------------------------------
// GET /api/video-taxonomy/subcategories
// -------------------------------------------------------------
router.get("/subcategories", async (req, res) => {
  try {
    const subcategories = await VideoSubcategory.find({ is_active: true })
      .sort({ display_order: 1 })
      .lean();

    return res.status(200).json({
      success: true,
      data: subcategories,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch subcategories",
      error: error.message,
    });
  }
});

// -------------------------------------------------------------
// ADMIN CRUD APIs (For Admin Panel / Manual Config)
// -------------------------------------------------------------

// Create Main Category
router.post("/main-categories",protect, authorize('Admin'), async (req, res) => {
  try {
    const category = new VideoMainCategory(req.body);
    await category.save();
    res.status(201).json({ success: true, data: category });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// Update Main Category
router.put("/main-categories/:id",protect, authorize('Admin'), async (req, res) => {
  try {
    const category = await VideoMainCategory.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    if (!category) return res.status(404).json({ success: false, message: "Not found" });
    res.json({ success: true, data: category });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// Delete Main Category
router.delete("/main-categories/:id", protect, authorize('Admin'),async (req, res) => {
  try {
    const category = await VideoMainCategory.findByIdAndDelete(req.params.id);
    if (!category) return res.status(404).json({ success: false, message: "Not found" });
    res.json({ success: true, message: "Main Category deleted" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Create Subcategory
router.post("/subcategories",protect, authorize('Admin'), async (req, res) => {
  try {
    const subcategory = new VideoSubcategory(req.body);
    await subcategory.save();
    res.status(201).json({ success: true, data: subcategory });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// Update Subcategory
router.put("/subcategories/:id", protect, authorize('Admin'),async (req, res) => {
  try {
    const subcategory = await VideoSubcategory.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    if (!subcategory) return res.status(404).json({ success: false, message: "Not found" });
    res.json({ success: true, data: subcategory });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// Delete Subcategory
router.delete("/subcategories/:id",protect, authorize('Admin'), async (req, res) => {
  try {
    const subcategory = await VideoSubcategory.findByIdAndDelete(req.params.id);
    if (!subcategory) return res.status(404).json({ success: false, message: "Not found" });
    res.json({ success: true, message: "Subcategory deleted" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
