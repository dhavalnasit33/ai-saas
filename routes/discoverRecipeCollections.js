// routes/recipeCollections.js
const express = require("express");
const RecipeCollection = require("../models/DiscoverRecipeCollection");
const { protect, authorize } = require("../middleware/auth");
const slugify = require("slugify");
const { validateDiscoverRecipeCollection, handleValidationErrors } = require("../middleware/validation");
const SavedRecipe = require("../models/SavedRecipe");

const router = express.Router();

// @route   GET /api/recipe-collections
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
              { slug: { $regex: search, $options: "i" } },
            ],
          }
        : {}),
      ...(typeof is_active !== "undefined"
        ? { is_active: is_active === "true" }
        : {}),
    };

    const total = await RecipeCollection.countDocuments(query);

    const collections = await RecipeCollection.find(query)
      .populate("discover_recipes") 
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .lean();

    res.json({
      success: true,
      data: collections,
      pagination: {
        current: Number(page),
        pages: Math.ceil(total / limit),
        total,
      },
    });
  } catch (error) {
    console.error("❌ Error fetching recipe collections:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});


// @route   GET /api/recipe-collections/:id
router.get("/:id", protect, async (req, res) => {
  try {
    const collection = await RecipeCollection.findById(req.params.id)
      .populate("discover_recipes");
    if (!collection) {
      return res.status(404).json({ success: false, message: "Collection not found" });
    }
    res.json({ success: true, data: collection });
  } catch (error) {
    console.error("❌ Error fetching collection:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// @route   GET /api/recipe-collections/by-discover/:discoverId
// @desc    Get all collections containing a specific discover recipe ID + search
router.get("/by-discover/:discoverId", protect, async (req, res) => {
  try {
    const { discoverId } = req.params;
    const { search } = req.query; 
    const userId = req.user ? req.user.id : null;

    let filter = { is_active: true };

    if (search && search.trim() !== "") {
      // 🔎 if search provided → search across ALL collections (ignore discoverId)
      const regex = new RegExp(search, "i");
      filter.$or = [
        { title: regex },
        { description: regex },
      ];
    } else {
      // ✅ no search → restrict to given discoverId
      filter.discover_recipes = discoverId;
    }

    const collections = await RecipeCollection.find(filter)
      .populate("discover_recipes")
      .sort({ createdAt: -1 })
      .lean();

    // check saved status for each
    const collectionsWithSavedStatus = await Promise.all(
      collections.map(async (collection) => {
        const saved = await SavedRecipe.findOne({
          user: userId,
          recipe: collection._id,
          is_saved: true,
        }).lean();

        return {
          ...collection,
          is_saved: !!saved,
        };
      })
    );

    res.json({
      success: true,
      data: collectionsWithSavedStatus,
    });
  } catch (error) {
    console.error("❌ Error fetching collections by discover ID:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// @route   POST /api/recipe-collections
router.post("/", protect, authorize("Admin"),validateDiscoverRecipeCollection,handleValidationErrors, async (req, res) => {
  try {
    const { title } = req.body;
    const slug = slugify(title, { lower: true, strict: true });

    const collection = await RecipeCollection.create({
      ...req.body,
      slug,
    });
    res.status(201).json({ success: true, message: "Collection created", data: collection });
  } catch (error) {
    console.error("❌ Create collection error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// @route   PUT /api/recipe-collections/:id
router.put("/:id", protect, authorize("Admin"),validateDiscoverRecipeCollection,handleValidationErrors, async (req, res) => {
  try {
    const { title } = req.body;
    if (title) {
      req.body.slug = slugify(title, { lower: true, strict: true });
    }

    const updated = await RecipeCollection.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).populate("discover_recipes");

    if (!updated) {
      return res.status(404).json({ success: false, message: "Collection not found" });
    }
    res.json({ success: true, message: "Collection updated", data: updated });
  } catch (error) {
    console.error("❌ Update collection error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// @route   POST /api/recipe-collections/bulk-delete
router.post("/bulk-delete", protect, authorize("Admin"), async (req, res) => {
  const { ids } = req.body;

  if (!Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ success: false, message: "No IDs provided" });
  }

  try {
    const result = await RecipeCollection.deleteMany({ _id: { $in: ids } });

    // Cascade delete saved recipes linked to these collections
    await SavedRecipe.deleteMany({ recipe: { $in: ids } });

    res.json({
      success: true,
      message: `${result.deletedCount} collections deleted (and related saved recipes).`,
    });
  } catch (error) {
    console.error("❌ Bulk delete error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// @route   DELETE /api/recipe-collections/:id
router.delete("/:id", protect, authorize("Admin"), async (req, res) => {
  try {
    const collection = await RecipeCollection.findByIdAndDelete(req.params.id);

    if (!collection) {
      return res
        .status(404)
        .json({ success: false, message: "Collection not found" });
    }

    // Cascade delete saved recipes linked to this collection
    await SavedRecipe.deleteMany({ recipe: req.params.id });

    res.json({
      success: true,
      message: "Collection and related saved recipes deleted",
    });
  } catch (error) {
    console.error("❌ Delete collection error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// @route   PATCH /api/recipe-collections/:id/status
// @desc    Update collection active status
router.patch("/:id/status", protect, authorize("Admin"), async (req, res) => {
  try {
    const { is_active } = req.body;

    if (typeof is_active !== "boolean") {
      return res.status(400).json({ success: false, message: "`is_active` must be true or false" });
    }

    const updated = await RecipeCollection.findByIdAndUpdate(
      req.params.id,
      { is_active },
      { new: true, runValidators: true }
    );

    if (!updated) {
      return res.status(404).json({ success: false, message: "Collection not found" });
    }

    res.json({
      success: true,
      message: `Collection status updated to ${is_active ? "active" : "inactive"}`,
      data: updated,
    });
  } catch (error) {
    console.error("❌ Update status error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});
module.exports = router;
