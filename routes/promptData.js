const express = require("express");
const router = express.Router();
const PromptData = require("../models/PromptData");
const User = require("../models/User");
const { protect, authorize } = require("../middleware/auth");
// Import the validation middleware
const {
  validatePromptData,
  handleValidationErrors,
} = require("../middleware/validation");

// @desc    Get all prompt data (Paginated)
router.get("/", async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search || "";
    const categoryId = req.query.category;

    let query = {};

    if (search) {
      query.name = { $regex: search, $options: "i" };
    }

    if (categoryId) {
      query.category = categoryId;
    }

    if (!req.user || req.user.role !== "Admin") {
      query.is_active = true;
    }

    const total = await PromptData.countDocuments(query);
    const prompts = await PromptData.find(query)
      .populate("category", "name slug")
      .skip((page - 1) * limit)
      .limit(limit)
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: prompts,
      pagination: {
        current: page,
        pages: Math.ceil(total / limit),
        total,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// @desc    Get all active prompt data (Guest + Logged-in)
// @route   GET /api/prompt-data/list
// @query   category (optional)
// @query   search (optional) → searches in name & short_description
router.get("/list", protect, async (req, res) => {
  try {
    const { category, search } = req.query;

    // --------------------------------------------------
    // 1️⃣ Base query: only active prompts
    // --------------------------------------------------
    let query = { is_active: true };

    // Filter by category if provided
    if (category && category !== "") {
      query.category = category;
    }

    // --------------------------------------------------
    // 2️⃣ Search by name OR short_description
    // --------------------------------------------------
    if (search && search.trim() !== "") {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { short_description: { $regex: search, $options: "i" } },
      ];
    }

    // --------------------------------------------------
    // 3️⃣ Fetch prompts
    // --------------------------------------------------
    const prompts = await PromptData.find(query)
      .populate("category")
      .sort({ createdAt: -1 })
      .lean();

    // --------------------------------------------------
    // 4️⃣ Guest user → no favourites
    // --------------------------------------------------
    if (!req.user) {
      return res.json({
        success: true,
        guest: true,
        count: prompts.length,
        data: prompts.map((p) => ({
          ...p,
          is_favourite: false,
        })),
      });
    }

    // --------------------------------------------------
    // 5️⃣ Logged-in user → calculate favourites
    // --------------------------------------------------
    const user = await User.findById(req.user._id)
      .select("favourite_prompts")
      .lean();

    const bookmarkedIds = new Set(
      (user.favourite_prompts || []).map((id) => id.toString())
    );

    const dataWithFavorites = prompts.map((prompt) => ({
      ...prompt,
      is_favourite: bookmarkedIds.has(prompt._id.toString()),
    }));

    res.json({
      success: true,
      guest: false,
      count: dataWithFavorites.length,
      data: dataWithFavorites,
    });
  } catch (err) {
    console.error("Prompt List API Error:", err);
    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
});

// @desc    Get current user's favorite prompts with Search
// @route   GET /api/prompt-data/favorites
// @query   search (optional)
router.get("/favorites", protect, async (req, res) => {
  try {
    const userId = req.user._id;
    const { search } = req.query;

    // 1. Fetch user to get their list of favorite IDs
    const user = await User.findById(userId).select("favourite_prompts");

    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    // 2. Build Query
    let query = {
      _id: { $in: user.favourite_prompts },
      is_active: true,
    };

    // 3. Add Search Logic (Name or Short Description)
    if (search && search.trim() !== "") {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { short_description: { $regex: search, $options: "i" } },
      ];
    }

    // 4. Find Prompts
    const favoritePrompts = await PromptData.find(query)
      .populate("category", "name slug")
      .sort({ createdAt: -1 })
      .lean();

    // 5. Add is_favourite: true flag
    const dataWithFlag = favoritePrompts.map((prompt) => ({
      ...prompt,
      is_favourite: true,
    }));

    res.json({
      success: true,
      count: dataWithFlag.length,
      data: dataWithFlag,
    });
  } catch (err) {
    console.error("Favorites API Error:", err);
    res.status(500).json({ success: false, message: "Server Error" });
  }
});
// @desc    Get single prompt data
router.get("/:id", async (req, res) => {
  try {
    const prompt = await PromptData.findById(req.params.id).populate(
      "category"
    );
    if (!prompt) {
      return res
        .status(404)
        .json({ success: false, message: "Prompt not found" });
    }
    res.json({ success: true, data: prompt });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// @desc    Create new prompt data
router.post(
  "/",
  protect,
  authorize("Admin"),
  validatePromptData,
  handleValidationErrors,
  async (req, res) => {
    try {
      const prompt = await PromptData.create(req.body);
      res.status(201).json({ success: true, data: prompt });
    } catch (err) {
      res.status(400).json({ success: false, message: err.message });
    }
  }
);

// @desc    Update prompt data
router.put(
  "/:id",
  protect,
  authorize("Admin"),
  validatePromptData,
  handleValidationErrors,
  async (req, res) => {
    try {
      const prompt = await PromptData.findByIdAndUpdate(
        req.params.id,
        req.body,
        {
          new: true,
          runValidators: true,
        }
      );

      if (!prompt) {
        return res
          .status(404)
          .json({ success: false, message: "Prompt not found" });
      }

      res.json({ success: true, data: prompt });
    } catch (err) {
      res.status(400).json({ success: false, message: err.message });
    }
  }
);

// @desc    Delete prompt data (Single) & Remove from User Bookmarks
router.delete("/:id", protect, authorize("Admin"), async (req, res) => {
  try {
    const promptId = req.params.id;

    const prompt = await PromptData.findById(promptId);
    if (!prompt) {
      return res
        .status(404)
        .json({ success: false, message: "Prompt not found" });
    }

    // 1. Remove this prompt ID from all users' favourite_prompts arrays
    await User.updateMany(
      { favourite_prompts: promptId },
      { $pull: { favourite_prompts: promptId } }
    );

    // 2. Delete the prompt itself
    await PromptData.findByIdAndDelete(promptId);

    res.json({
      success: true,
      message: "Prompt deleted and removed from user bookmarks successfully",
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// @desc    Bulk Delete prompt data & Remove from User Bookmarks
// @route   POST /api/prompt-data/bulk-delete
router.post("/bulk-delete", protect, authorize("Admin"), async (req, res) => {
  try {
    const { ids } = req.body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res
        .status(400)
        .json({ success: false, message: "No IDs provided" });
    }

    // 1. Remove these IDs from all users' favourite_prompts arrays
    await User.updateMany(
      { favourite_prompts: { $in: ids } },
      { $pull: { favourite_prompts: { $in: ids } } }
    );

    // 2. Delete the prompts
    await PromptData.deleteMany({ _id: { $in: ids } });

    res.json({
      success: true,
      message: "Prompts deleted and removed from user bookmarks successfully",
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// @desc    Toggle Bookmark (Favorite)
router.post("/:id/bookmark", protect, async (req, res) => {
  try {
    const promptId = req.params.id;
    const userId = req.user._id;

    const prompt = await PromptData.findById(promptId);
    if (!prompt) {
      return res
        .status(404)
        .json({ success: false, message: "Prompt not found" });
    }

    const user = await User.findById(userId);

    const isBookmarked = user.favourite_prompts.includes(promptId);

    if (isBookmarked) {
      user.favourite_prompts = user.favourite_prompts.filter(
        (id) => id.toString() !== promptId
      );
      await user.save();
      return res.json({
        success: true,
        message: "Removed from favorites",
        is_bookmarked: false,
      });
    } else {
      user.favourite_prompts.push(promptId);
      await user.save();
      return res.json({
        success: true,
        message: "Added to favorites",
        is_bookmarked: true,
      });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server Error" });
  }
});

// @desc    Toggle Active Status
// @route   PATCH /api/prompt-data/:id/toggle
router.patch("/:id/toggle", protect, authorize("Admin"), async (req, res) => {
  try {
    const prompt = await PromptData.findById(req.params.id);
    if (!prompt) {
      return res.status(404).json({
        success: false,
        message: "Prompt not found",
      });
    }

    prompt.is_active = !prompt.is_active;
    await prompt.save();

    res.json({
      success: true,
      data: { is_active: prompt.is_active },
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
});

module.exports = router;
