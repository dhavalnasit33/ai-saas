// routes/discoverRecipes.js
const express = require("express");
const DiscoverRecipe = require("../models/DiscoverRecipe");
const { protect, authorize } = require("../middleware/auth");
const { validateDiscoverRecipe, handleValidationErrors } = require("../middleware/validation");

const router = express.Router();

// @route   GET /api/discover-recipes
router.get("/", protect, async (req, res) => {
  try {
    const { search = "", page = 1, limit = 10, is_active } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const query = {
      ...(search
        ? {
            $or: [
              { title: { $regex: search, $options: "i" } },
              { description: { $regex: search, $options: "i" } },
            ],
          }
        : {}),
      ...(typeof is_active !== "undefined"
        ? { is_active: is_active === "true" }
        : {}),
    };

    const total = await DiscoverRecipe.countDocuments(query);

    const recipes = await DiscoverRecipe.aggregate([
      { $match: query },
      { $sort: { createdAt: -1 } },
      { $skip: skip },
      { $limit: Number(limit) },
      {
        $lookup: {
          from: "discoverrecipecollections", // 👈 Mongo collection name (auto lowercased + pluralized)
          localField: "_id",
          foreignField: "discover_recipes",
          as: "collections",
        },
      },
      {
        $addFields: {
          collection_count: { $size: "$collections" },
        },
      },
      {
        $project: {
          collections: 0, // don’t return full collections array
        },
      },
    ]);

    res.json({
      success: true,
      data: recipes,
      pagination: {
        current: Number(page),
        pages: Math.ceil(total / limit),
        total,
      },
    });
  } catch (error) {
    console.error("❌ Error fetching recipes:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});


// @route   GET /api/discover-recipes/all
router.get("/all", protect, async (req, res) => {
  try {
    const recipes = await DiscoverRecipe.find()
      .sort({ createdAt: -1 })
      .lean();
    res.json({ success: true, data: recipes, total: recipes.length });
  } catch (error) {
    console.error("❌ Error fetching all recipes:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// @route   GET /api/discover-recipes/:id
router.get("/:id", protect, async (req, res) => {
  try {
    const recipe = await DiscoverRecipe.findById(req.params.id);
    if (!recipe) {
      return res.status(404).json({ success: false, message: "Recipe not found" });
    }
    res.json({ success: true, data: recipe });
  } catch (error) {
    console.error("❌ Error fetching recipe:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// @route   POST /api/discover-recipes
router.post("/", protect, authorize("Admin"),validateDiscoverRecipe,handleValidationErrors, async (req, res) => {
  try {
    const recipe = await DiscoverRecipe.create({
      ...req.body,
    });
    res.status(201).json({ success: true, message: "Recipe created", data: recipe });
  } catch (error) {
    console.error("❌ Create recipe error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});


// @route   PUT /api/discover-recipes/:id/status
router.put("/:id/status", protect, authorize("Admin"), async (req, res) => {
  try {
    const { is_active } = req.body;

    if (typeof is_active !== "boolean") {
      return res.status(400).json({
        success: false,
        message: "is_active must be a boolean",
      });
    }

    const updated = await DiscoverRecipe.findByIdAndUpdate(
      req.params.id,
      { is_active },
      { new: true, runValidators: true }
    );

    if (!updated) {
      return res.status(404).json({
        success: false,
        message: "Recipe not found",
      });
    }

    res.json({
      success: true,
      message: "Recipe status updated",
      data: updated,
    });
  } catch (error) {
    console.error("❌ Update recipe status error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
});

// @route   PUT /api/discover-recipes/:id
router.put("/:id", protect, authorize("Admin"),validateDiscoverRecipe,handleValidationErrors, async (req, res) => {
  try {
    const updated = await DiscoverRecipe.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    if (!updated) {
      return res.status(404).json({ success: false, message: "Recipe not found" });
    }
    res.json({ success: true, message: "Recipe updated", data: updated });
  } catch (error) {
    console.error("❌ Update recipe error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// @route   POST /api/discover-recipes/bulk-delete
router.post("/bulk-delete", protect, authorize("Admin"), async (req, res) => {
  const { ids } = req.body;

  if (!Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ success: false, message: "No IDs provided" });
  }

  try {
    const result = await DiscoverRecipe.deleteMany({ _id: { $in: ids } });
    res.json({
      success: true,
      message: `${result.deletedCount} recipes deleted.`,
    });
  } catch (error) {
    console.error("❌ Bulk delete error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// @route   DELETE /api/discover-recipes/:id
router.delete("/:id", protect, authorize("Admin"), async (req, res) => {
  try {
    const recipe = await DiscoverRecipe.findByIdAndDelete(req.params.id);
    if (!recipe) {
      return res.status(404).json({ success: false, message: "Recipe not found" });
    }
    res.json({ success: true, message: "Recipe deleted" });
  } catch (error) {
    console.error("❌ Delete recipe error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

module.exports = router;
