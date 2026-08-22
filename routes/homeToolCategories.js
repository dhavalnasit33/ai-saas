// routes/homeToolCategories.ts
const express = require("express");
const router = express.Router();
const HomeToolCategory = require("../models/HomeToolCategory");
const { protect, authorize } = require("../middleware/auth");

// GET paginated
router.get("/",protect, authorize('Admin'), async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 100;
    const search = req.query.search || "";

    const query = search ? { name: { $regex: search, $options: "i" } } : {};
    const total = await HomeToolCategory.countDocuments(query);
    const categories = await HomeToolCategory.find(query)
      .skip((page - 1) * limit)
      .limit(limit)
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: categories,
      pagination: { current: page, pages: Math.ceil(total / limit), total },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET single category by ID
router.get("/:id", protect, authorize('Admin'),async (req, res) => {
  try {
    const category = await HomeToolCategory.findById(req.params.id);
    if (!category) {
      return res
        .status(404)
        .json({ success: false, message: "Category not found" });
    }
    res.json({ success: true, data: category });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST create
router.post("/", protect, authorize('Admin'),async (req, res) => {
  try {
    const category = new HomeToolCategory(req.body);
    await category.save();
    res.json({ success: true, data: category });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// PUT update category
router.put("/:id", protect, authorize('Admin'), async (req, res) => {
  try {
    const category = await HomeToolCategory.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!category) {
      return res.status(404).json({ success: false, message: "Category not found" });
    }

    res.json({ success: true, data: category });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});


// PATCH toggle active
router.patch("/:id/toggle", protect, authorize('Admin'),async (req, res) => {
  try {
    const category = await HomeToolCategory.findById(req.params.id);
    if (!category)
      return res.status(404).json({ success: false, message: "Not found" });
    category.is_active = !category.is_active;
    await category.save();
    res.json({ success: true, data: { is_active: category.is_active } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE
router.delete("/:id", protect, authorize('Admin'),async (req, res) => {
  try {
    await HomeToolCategory.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST bulk-delete
router.post("/bulk-delete",protect, authorize('Admin'), async (req, res) => {
  try {
    const { ids } = req.body;
    await HomeToolCategory.deleteMany({ _id: { $in: ids } });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
