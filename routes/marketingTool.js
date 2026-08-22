const express = require("express");
const MarketingTool = require("../models/MarketingTool");
const MarketingCategory = require("../models/MarketingCategory");
const { protect, authorize } = require("../middleware/auth");
const User = require("../models/User");
const mongoose = require("mongoose");
const slugify = require("slugify");
const discoverToolsRoutes = require("./discoverTools");
const router = express.Router();
const fetchAllToolsData = discoverToolsRoutes.fetchAllToolsData;

// ==========================
// GET /api/marketing-tools
// Full list with search + category + popular + favorite filter
// ==========================
router.get("/", protect, async (req, res) => {
  try {
    const { search = "", category_id, is_popular, is_favorite } = req.query;

    const query = {};

    // -----------------------------------------
    // 🔍 BASIC SEARCH FILTER
    // -----------------------------------------
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
      ];
    }

    // -----------------------------------------
    // 🧭 CATEGORY FILTER FOR MARKETING TABLE
    // -----------------------------------------
    if (category_id) {
      query.category_id = category_id;
    }

    // -----------------------------------------
    // ⭐ POPULAR FILTER
    // -----------------------------------------
    if (typeof is_popular !== "undefined") {
      query.is_popular = is_popular === "true";
    }

    // -----------------------------------------
    // ❤️ FAVORITE FILTER FOR USER
    // -----------------------------------------
    let favoriteToolIds = [];
    let userBookmarks = [];

    if (req.user?.id) {
      const user = await User.findById(req.user.id).select(
        "favorite_marketing_tools bookmarks",
      );

      if (user?.favorite_marketing_tools?.length) {
        favoriteToolIds = user.favorite_marketing_tools.map((id) =>
          id.toString(),
        );
      }

      // Get user bookmarks
      if (user?.bookmarks) {
        userBookmarks = user.bookmarks;
      }
    }

    // 🆕 FAVORITE FILTER NOW USES BOOKMARKS INSTEAD OF favorite_marketing_tools
    if (is_favorite === "true") {
      // Get all bookmarked marketing tools
      const bookmarkedMarketingTools = userBookmarks.filter(
        (b) => b.modelName === "MarketingTool",
      );

      if (!bookmarkedMarketingTools.length) {
        return res.json({
          success: true,
          data: [],
        });
      }

      const bookmarkedToolIds = bookmarkedMarketingTools.map((b) =>
        b.itemId.toString(),
      );

      query._id = {
        $in: bookmarkedToolIds.map((id) => new mongoose.Types.ObjectId(id)),
      };
    }

    // ======================================================
    // 🚀 FETCH MARKETING TOOLS
    // ======================================================
    const marketingTools = await MarketingTool.find(query)
      .populate("category_id", "name")
      .populate("created_by", "name")
      .populate("tags", "name")
      .sort({ sticky: -1, createdAt: -1 })
      .lean();

    // Add is_favorite flag
    // const marketingToolsWithFlags = marketingTools.map((tool) => {
    //   const isBookmarked = userBookmarks.some(
    //     (b) =>
    //       b.itemId.toString() === tool._id.toString() &&
    //       b.modelName === "MarketingTool"
    //   );

    //   return {
    //     ...tool,
    //     is_favorite: favoriteToolIds.includes(tool._id.toString()),
    //     bookmarked: isBookmarked,
    //     from_model: "MarketingTool",
    //   };
    // });
    // console.log("🚀 ~ marketingToolsWithFlags:", marketingToolsWithFlags.leng)

    // Add is_favorite and bookmarked flags
    // 🆕 is_favorite NOW REFLECTS BOOKMARK STATUS
    const marketingToolsWithFlags = marketingTools.map((tool) => {
      const isBookmarked = userBookmarks.some(
        (b) =>
          b.itemId.toString() === tool._id.toString() &&
          b.modelName === "MarketingTool",
      );

      return {
        ...tool,
        is_favorite: favoriteToolIds.includes(tool._id.toString()), // 🆕 Now using bookmarked status for is_favorite
        bookmarked: isBookmarked,
        modelName: "MarketingTool",
      };
    });
    // ======================================================
    // 🚀 FETCH MATCHING TOOLS FROM ALL OTHER MODELS
    // ======================================================
    const allTools = await fetchAllToolsData(search.toLowerCase());

    // const otherTools = allTools
    //   .filter((t) => t.model_name !== "MarketingTool") // exclude MarketingTool
    //   .filter(
    //     (t) =>
    //       Array.isArray(t.categories) &&
    //       t.categories.map(String).includes(String("691d880a797bf2d2a875c7ef"))
    //   )
    //   .map((t) => {
    //     const isBookmarked = userBookmarks.some(
    //       (b) =>
    //         b.itemId.toString() === t._id.toString() &&
    //         b.modelName === t.model_name
    //     );

    //     return {
    //       ...t,
    //       is_favorite: favoriteToolIds.includes(t._id.toString()),
    //       bookmarked: isBookmarked,
    //       from_model: t.model_name,
    //     };
    //   });

    const otherTools = allTools
      .filter((t) => t.model_name !== "MarketingTool") // exclude MarketingTool
      .filter(
        (t) =>
          Array.isArray(t.categories) &&
          t.categories.map(String).includes(String("691d880a797bf2d2a875c7ef")),
      )
      .map((t) => {
        const isBookmarked = userBookmarks.some(
          (b) =>
            b.itemId.toString() === t._id.toString() &&
            b.modelName === t.model_name,
        );

        return {
          ...t,
          is_favorite: favoriteToolIds.includes(t._id.toString()),
          bookmarked: isBookmarked,
          from_model: t.model_name,
        };
      });

    // ======================================================
    // 🔄 MERGE BOTH AND DEDUPLICATE BY SLUG
    // ======================================================
    let finalList = [...marketingToolsWithFlags, ...otherTools];

    // 🆕 APPLY POPULAR FILTER FOR OTHER TOOLS
    if (is_popular === "true") {
      // For MarketingTools, popular filter is already applied in the query
      // For other tools, we need to filter by is_popular field
      finalList = finalList.filter((tool) => {
        if (tool.from_model === "MarketingTool") {
          return true; // Already filtered by query
        } else {
          return tool.is_popular === true;
        }
      });
    }

    // 🆕 APPLY FAVORITE FILTER AFTER MERGING BOTH LISTS
    if (is_favorite === "true") {
      // Filter to show only bookmarked items from both MarketingTools AND other tools
      finalList = finalList.filter((tool) => tool.bookmarked === true);

      // If no bookmarked items found
      if (finalList.length === 0) {
        return res.json({
          success: true,
          data: [],
        });
      }
    }

    const deduplicatedList = Object.values(
      finalList.reduce((acc, tool) => {
        // If slug already exists, prefer MarketingTool over others
        if (!acc[tool.slug] || tool.from_model === "MarketingTool") {
          acc[tool.slug] = tool;
        }
        return acc;
      }, {}),
    ).sort((a, b) => {
      // 👈 ADDED SORTING HERE TO ENSURE STICKY TOOLS REMAIN FIRST IN MERGED LIST
      const aSticky = a.sticky ? 1 : 0;
      const bSticky = b.sticky ? 1 : 0;
      if (bSticky !== aSticky) {
        return bSticky - aSticky; // True (1) comes before False (0)
      }
      return new Date(b.createdAt || 0) - new Date(a.createdAt || 0); // Fallback to date
    });
    res.json({
      success: true,
      data: deduplicatedList,
    });
  } catch (error) {
    console.error("❌ Error fetching marketing tools:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// ==========================
// GET /api/marketing-tools
// Paginated list with search + category + popular + favorite filter + is_favorite flag
// ==========================
router.get("/admin", protect, async (req, res) => {
  try {
    const {
      search = "",
      page = 1,
      limit = 10,
      category_id,
      is_popular,
      is_favorite,
    } = req.query;

    const skip = (Number(page) - 1) * Number(limit);
    const query = {};

    // 🔍 Search filter
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
      ];
    }

    // 🧭 Category filter
    if (category_id) {
      query.category_id = category_id;
    }

    // ⭐ Popular filter
    if (typeof is_popular !== "undefined") {
      query.is_popular = is_popular === "true";
    }

    // ❤️ Favorite filter (for filtering only, not flag)
    let favoriteToolIds = [];
    if (req.user && req.user.id) {
      const user = await User.findById(req.user.id).select(
        "favorite_marketing_tools",
      );
      if (user && Array.isArray(user.favorite_marketing_tools)) {
        favoriteToolIds = user.favorite_marketing_tools.map((id) =>
          id.toString(),
        );
      }
    }

    if (is_favorite === "true") {
      if (favoriteToolIds.length === 0) {
        return res.json({
          success: true,
          data: [],
          pagination: {
            current: Number(page),
            pages: 0,
            total: 0,
          },
        });
      }

      query._id = {
        $in: favoriteToolIds.map((id) => new mongoose.Types.ObjectId(id)),
      };
    }

    // 📝 Fetch filtered + paginated tools
    const [tools, total] = await Promise.all([
      MarketingTool.find(query)
        .populate("category_id", "name")
        .populate("created_by", "name")
        .populate("tags", "name")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      MarketingTool.countDocuments(query),
    ]);

    // 🏷️ Add is_favorite flag to each tool
    const toolsWithFavoriteFlag = tools.map((tool) => ({
      ...tool,
      is_favorite: favoriteToolIds.includes(tool._id.toString()),
    }));

    res.json({
      success: true,
      data: toolsWithFavoriteFlag,
      pagination: {
        current: Number(page),
        pages: Math.ceil(total / limit),
        total,
      },
    });
  } catch (error) {
    console.error("❌ Error fetching marketing tools:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// ==========================
// GET /api/marketing-tools/by-category
// Get tools by single or multiple category IDs
// ==========================
router.get("/by-category", async (req, res) => {
  try {
    let { category_ids } = req.query;

    // If category_ids is not provided
    if (!category_ids) {
      return res.status(400).json({
        success: false,
        message: "category_ids query param is required",
      });
    }

    // Convert single string or CSV into array
    if (typeof category_ids === "string") {
      category_ids = category_ids.split(",").map((id) => id.trim());
    }

    // Validate
    if (!Array.isArray(category_ids) || category_ids.length === 0) {
      return res.status(400).json({
        success: false,
        message:
          "category_ids must be a non-empty array or comma-separated string",
      });
    }

    // 🔍 Find marketing tools matching any of these categories
    const tools = await MarketingTool.find({
      category_id: { $in: category_ids },
      is_active: true, // optional filter
    })
      .populate("category_id", "name")
      .populate("created_by", "name")
      .populate("tags", "name")
      .sort({ sticky: -1, createdAt: -1 })
      .lean();

    res.json({
      success: true,
      data: tools,
    });
  } catch (error) {
    console.error("Error fetching tools by category:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
});

// ==========================
// GET /api/marketing-tools/:id
// ==========================
router.get("/:id", async (req, res) => {
  try {
    const tool = await MarketingTool.findById(req.params.id)
      .populate("category_id", "name")
      .populate("created_by", "name")
      .populate("tags", "name");

    if (!tool) {
      return res
        .status(404)
        .json({ success: false, message: "Marketing tool not found" });
    }

    res.json({ success: true, data: tool });
  } catch (error) {
    console.error("Error fetching marketing tool:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// ==========================
// GET /api/marketing-tools/slug/:slug
// ==========================
// 🚨 ADDED `protect` middleware so req.user is available!
router.get("/slug/:slug", protect, async (req, res) => {
  try {
    const tool = await MarketingTool.findOne({ slug: req.params.slug })
      .populate("category_id", "name")
      .populate("created_by", "name")
      .populate("tags", "name")
      .lean(); // .lean() is required to add properties to the object

    if (!tool) {
      return res
        .status(404)
        .json({ success: false, message: "Marketing tool not found" });
    }

    // -----------------------------------------
    // ❤️ FAVORITE & BOOKMARK LOGIC (Copied from GET /)
    // -----------------------------------------
    let favoriteToolIds = [];
    let userBookmarks = [];

    if (req.user?.id) {
      const user = await User.findById(req.user.id).select(
        "favorite_marketing_tools bookmarks",
      );

      if (user?.favorite_marketing_tools?.length) {
        favoriteToolIds = user.favorite_marketing_tools.map((id) =>
          id.toString(),
        );
      }

      // Get user bookmarks
      if (user?.bookmarks) {
        userBookmarks = user.bookmarks;
      }
    }

    // -----------------------------------------
    // 🔍 CHECK FLAGS
    // -----------------------------------------
    const isBookmarked = userBookmarks.some(
      (b) =>
        b.itemId.toString() === tool._id.toString() &&
        b.modelName === "MarketingTool",
    );

    const isFavorite = favoriteToolIds.includes(tool._id.toString());

    // -----------------------------------------
    // 🚀 RETURN DATA
    // -----------------------------------------
    res.json({
      success: true,
      data: {
        ...tool,
        is_favorite: isFavorite,
        bookmarked: isBookmarked,
        modelName: "MarketingTool",
      },
    });
  } catch (error) {
    console.error("Error fetching marketing tool:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// ==========================
// POST /api/marketing-tools
// ==========================
router.post("/", protect, authorize("Admin"), async (req, res) => {
  try {
    console.log("Incoming request body:", req.body); // log incoming data

    const toolData = { ...req.body, created_by: req.user.id };

    // Validate category_id
    if (
      !toolData.category_id ||
      !Array.isArray(toolData.category_id) ||
      toolData.category_id.length === 0
    ) {
      console.log("Validation failed: category_id missing or empty");
      return res.status(400).json({
        success: false,
        message: "At least one category_id is required",
      });
    }

    // Check if all categories exist
    const validCategories = await MarketingCategory.find({
      _id: { $in: toolData.category_id },
    });
    if (validCategories.length !== toolData.category_id.length) {
      console.log("Validation failed: some category_id are invalid");
      return res.status(400).json({
        success: false,
        message: "One or more categories are invalid",
      });
    }

    // Create tool
    const tool = new MarketingTool(toolData);
    await tool.save();

    // Correct population
    await tool.populate([
      { path: "category_id", select: "name category" },
      { path: "created_by", select: "name" },
      { path: "tags", select: "name" },
    ]);

    console.log("Marketing tool created successfully:", tool);

    res.status(201).json({
      success: true,
      message: "Marketing tool created successfully",
      data: tool,
    });
  } catch (error) {
    console.error("Error creating marketing tool:", error);

    if (error.name === "ValidationError") {
      const messages = Object.values(error.errors).map((val) => val.message);
      console.log("Validation errors:", messages);
      return res.status(400).json({
        success: false,
        message: "Validation error",
        errors: messages,
      });
    }

    res.status(500).json({ success: false, message: "Server error" });
  }
});

// ==========================
// PUT /api/marketing-tools/:id
// ==========================
router.put("/:id", protect, authorize("Admin"), async (req, res) => {
  try {
    const updateData = { ...req.body };

    // ✅ If name is being updated, regenerate slug
    if (updateData.name) {
      const slugified = slugify(updateData.name, {
        lower: true,
        strict: true,
        trim: true,
        remove: /[*+~.()'"!:@]/g,
      });

      // ✅ Ensure slug is unique
      let slug = slugified;
      let counter = 1;
      while (
        await MarketingTool.findOne({ slug, _id: { $ne: req.params.id } })
      ) {
        slug = `${slugified}-${counter++}`;
      }

      updateData.slug = slug;
    }

    // ✅ Validate categories if provided
    if (updateData.category_id && Array.isArray(updateData.category_id)) {
      const validCategories = await MarketingCategory.find({
        _id: { $in: updateData.category_id },
      });
      if (validCategories.length !== updateData.category_id.length) {
        return res.status(400).json({
          success: false,
          message: "One or more categories are invalid",
        });
      }
    }

    const updatedTool = await MarketingTool.findByIdAndUpdate(
      req.params.id,
      updateData,
      {
        new: true,
        runValidators: true,
      },
    )
      .populate("category_id", "name")
      .populate("created_by", "name")
      .populate("tags", "name");

    if (!updatedTool) {
      return res.status(404).json({
        success: false,
        message: "Marketing tool not found",
      });
    }

    res.json({
      success: true,
      message: "Marketing tool updated successfully",
      data: updatedTool,
    });
  } catch (error) {
    console.error("Error updating marketing tool:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// @desc    Delete tool
// @route   DELETE /api/tools/:id
// @access  Private (Admin only)
router.delete("/:id", protect, async (req, res) => {
  try {
    const tool = await MarketingTool.findById(req.params.id);

    if (!tool) {
      return res.status(404).json({
        success: false,
        message: "Tool not found",
      });
    }

    await MarketingTool.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: "Tool deleted successfully",
    });
  } catch (error) {
    console.error("Delete tool error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
});

// ==========================
// DELETE multiple tools
// ==========================
router.delete("/", protect, authorize("Admin"), async (req, res) => {
  const tools = req.body;

  if (!Array.isArray(tools) || tools.length === 0) {
    return res.status(400).json({
      success: false,
      message: "Please provide data of marketing tools to delete",
    });
  }

  const deleteIds = tools.map((t) => t.id);

  try {
    const existing = await MarketingTool.find({ _id: { $in: deleteIds } })
      .select("_id name")
      .lean();
    const existingIds = existing.map((t) => t._id.toString());

    const missing = tools.filter((t) => !existingIds.includes(t.id));
    if (missing.length > 0) {
      const missingNames = missing.map((t) => t.name || t.id);
      return res.status(404).json({
        success: false,
        message: `Marketing tools not found: ${missingNames.join(", ")}`,
      });
    }

    const result = await MarketingTool.deleteMany({ _id: { $in: deleteIds } });

    res.json({
      success: true,
      message: `${result.deletedCount} Marketing tools deleted successfully`,
    });
  } catch (error) {
    console.error("Error bulk deleting marketing tools:", error);
    return res.status(500).json({
      success: false,
      message: "Server error during bulk delete",
    });
  }
});

// ==========================
// PATCH /api/marketing-tools/:id/toggle
// ==========================
router.patch("/:id/toggle", protect, authorize("Admin"), async (req, res) => {
  try {
    const tool = await MarketingTool.findById(req.params.id);
    if (!tool)
      return res
        .status(404)
        .json({ success: false, message: "Marketing tool not found" });

    tool.is_active = !tool.is_active;
    await tool.save();

    res.json({
      success: true,
      message: `Marketing tool ${tool.is_active ? "activated" : "deactivated"
        } successfully`,
      data: { is_active: tool.is_active },
    });
  } catch (error) {
    console.error("Toggle marketing tool error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// ==========================
// PATCH /api/marketing-tools/:id/toggle-popular
// ==========================
router.patch(
  "/:id/toggle-popular",
  protect,
  authorize("Admin"),
  async (req, res) => {
    try {
      const tool = await MarketingTool.findById(req.params.id);
      if (!tool) {
        return res
          .status(404)
          .json({ success: false, message: "Marketing tool not found" });
      }

      tool.is_popular = !tool.is_popular;
      await tool.save();

      res.json({
        success: true,
        message: `Marketing tool ${tool.is_popular ? "marked as popular" : "unmarked as popular"
          } successfully`,
        data: { is_popular: tool.is_popular },
      });
    } catch (error) {
      console.error("Toggle popular marketing tool error:", error);
      res.status(500).json({ success: false, message: "Server error" });
    }
  },
);

// ==========================
// POST /api/users/favorite-marketing-tools
// ==========================
router.post("/favorite-marketing-tools", protect, async (req, res) => {
  try {
    const { toolIds } = req.body; // array of marketing tool IDs

    if (!toolIds || !Array.isArray(toolIds) || toolIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: "toolIds must be a non-empty array of marketing tool IDs",
      });
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    // make sure it's an array
    if (!Array.isArray(user.favorite_marketing_tools)) {
      user.favorite_marketing_tools = [];
    }

    let added = [];
    let removed = [];

    toolIds.forEach((toolId) => {
      const index = user.favorite_marketing_tools.indexOf(toolId);
      if (index === -1) {
        user.favorite_marketing_tools.push(toolId);
        added.push(toolId);
      } else {
        user.favorite_marketing_tools.splice(index, 1);
        removed.push(toolId);
      }
    });

    await user.save();

    res.json({
      success: true,
      message: "Favorite marketing tools updated",
      added,
      removed,
      totalFavorites: user.favorite_marketing_tools.length,
    });
  } catch (err) {
    console.error("❌ Error updating favorite marketing tools:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

module.exports = router;
