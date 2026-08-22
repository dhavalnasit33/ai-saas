const express = require("express");
const router = express.Router();
const PromptCategory = require("../models/PromptCategory");
const { protect, authorize } = require("../middleware/auth");
const {
  validatePromptCategory,
  handleValidationErrors,
} = require("../middleware/validation");

// GET paginated list
router.get("/", protect, authorize("Admin"), async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 100;
    const search = req.query.search || "";

    const query = search ? { name: { $regex: search, $options: "i" } } : {};
    const total = await PromptCategory.countDocuments(query);
    const categories = await PromptCategory.find(query)
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

// GET all categories including inactive ones (Admin only)
router.get("/all", async (req, res) => {
  try {
    const categories = await PromptCategory.find({}).sort({ createdAt: 1 });
    res.json({ success: true, data: categories });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET single category by ID
router.get("/:id", protect, authorize("Admin"), async (req, res) => {
  try {
    const category = await PromptCategory.findById(req.params.id);
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

// GET all categories including inactive ones (Admin only)
router.get("/all/admin", protect, authorize("Admin"), async (req, res) => {
  try {
    const categories = await PromptCategory.find({}).sort({ createdAt: -1 });
    res.json({ success: true, data: categories });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST create
router.post(
  "/",
  protect,
  authorize("Admin"),
  validatePromptCategory,
  handleValidationErrors,
  async (req, res) => {
    try {
      const category = new PromptCategory(req.body);
      await category.save();
      res.json({ success: true, data: category });
    } catch (err) {
      res.status(400).json({ success: false, message: err.message });
    }
  }
);

// PUT update category
router.put(
  "/:id",
  protect,
  authorize("Admin"),
  validatePromptCategory,
  handleValidationErrors,
  async (req, res) => {
    try {
      const category = await PromptCategory.findByIdAndUpdate(
        req.params.id,
        req.body,
        { new: true, runValidators: true }
      );

      if (!category) {
        return res
          .status(404)
          .json({ success: false, message: "Category not found" });
      }

      res.json({ success: true, data: category });
    } catch (err) {
      res.status(400).json({ success: false, message: err.message });
    }
  }
);

// PATCH toggle active
router.patch("/:id/toggle", protect, authorize("Admin"), async (req, res) => {
  try {
    const category = await PromptCategory.findById(req.params.id);
    if (!category)
      return res.status(404).json({ success: false, message: "Not found" });
    category.is_active = !category.is_active;
    await category.save();
    res.json({ success: true, data: { is_active: category.is_active } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE single
router.delete("/:id", protect, authorize("Admin"), async (req, res) => {
  try {
    await PromptCategory.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST bulk-delete
router.post("/bulk-delete", protect, authorize("Admin"), async (req, res) => {
  try {
    const { ids } = req.body;
    await PromptCategory.deleteMany({ _id: { $in: ids } });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
