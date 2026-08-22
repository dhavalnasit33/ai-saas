
const express = require("express");
const SavedRecipe = require("../models/SavedRecipe");
const { protect } = require("../middleware/auth");
const { validateSavedRecipe, handleValidationErrors } = require("../middleware/validation");

const router = express.Router();

// @access  Private
router.get("/saved", protect, async (req, res) => {
  try {
    const userId = req.user.id;

    // query params
    const { page = 1, limit = 10, search = "" } = req.query;

    const query = { user: userId, is_saved: true };

    // If search keyword present → match against recipe title (or other fields)
    if (search) {
      query.$or = [
        { "recipe.title": { $regex: search, $options: "i" } },
        { "recipe.description": { $regex: search, $options: "i" } }
      ];
    }

    // Count total for pagination
    const total = await SavedRecipe.countDocuments(query);

    // Fetch paginated results
    const savedRecipes = await SavedRecipe.find(query)
      .populate("recipe")
      .skip((page - 1) * limit)
      .limit(Number(limit))
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      page: Number(page),
      limit: Number(limit),
      total,
      totalPages: Math.ceil(total / limit),
      savedRecipes
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// @route   POST /api/recipes/save
// @access  Private
router.post("/save", protect,validateSavedRecipe,handleValidationErrors, async (req, res) => {
  try {
    const { recipeId, aiResponse } = req.body;
    const userId = req.user.id;

    if (!recipeId) {
      return res.status(400).json({ success: false, message: "Recipe ID is required" });
    }

    const saved = await SavedRecipe.findOneAndUpdate(
      { user: userId, recipe: recipeId },
      { is_saved: true, ai_response: aiResponse },
      { new: true, upsert: true }
    ).populate("recipe");

    res.json({ success: true, saved });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// @route   DELETE /api/recipes/:id/save
// @access  Private
router.delete("/unsave/:id", protect, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const deleted = await SavedRecipe.findOneAndDelete({
      user: userId,
      recipe: id
    });

    if (!deleted) {
      return res.status(404).json({ success: false, message: "Saved recipe not found" });
    }

    res.json({ success: true, message: "Recipe unsaved" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;