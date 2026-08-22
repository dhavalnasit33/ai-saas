const express = require("express")
const ToolCategory = require("../models/ToolCategory")
const { protect, authorize } = require("../middleware/auth")
const { validateToolCategory, handleValidationErrors } = require("../middleware/validation")
const Tool = require("../models/Tool")

const router = express.Router()

// @route   GET /api/tool-categories
router.get("/", async (req, res) => {
  try {
    const { search = "", page = 1, limit = 10, category_id  } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    // 1. If ID is passed, fetch parent and all children
    if (category_id ) {
      const parentCategory = await ToolCategory.findById(category_id )
        .populate("created_by", "name")
        .populate("parent", "name")
        .lean();

      if (!parentCategory) {
        return res.status(404).json({ success: false, message: "Category not found" });
      }

      const allChildren = await ToolCategory.find({ parent: category_id})
        .populate("created_by", "name")
        .populate("parent", "name")
        .lean();

      // Attach empty children arrays for 2nd-level children
      for (let child of allChildren) {
        child.children = [];
      }

      // Add children + level info to parent
      parentCategory.children = allChildren.map((child) => ({
        ...child,
        level: 1,
        is_child: true,
      }));

      const fullResponse = {
        ...parentCategory,
        level: 0,
        is_child: false,
      };

      return res.json({
        success: true,
        data: fullResponse,
      });
    }

    // 2. Build general search query (when no ID)
    const searchQuery = search
      ? {
          $or: [
            { name: { $regex: search, $options: "i" } },
            { description: { $regex: search, $options: "i" } },
          ],
        }
      : {};

    // 3. Fetch all matching categories
    const allCategories = await ToolCategory.find(searchQuery)
      .populate("created_by", "name")
      .populate("parent", "name")
      .sort({ usage_count: -1, createdAt: -1 })
      .lean();

    // 4. Build a map of all categories
    const categoryMap = new Map();
    allCategories.forEach((cat) => {
      categoryMap.set(cat._id.toString(), { ...cat, children: [] });
    });

    // 5. Link children to parents
    const roots = [];
    categoryMap.forEach((cat) => {
      if (cat.parent && cat.parent._id && categoryMap.has(cat.parent._id.toString())) {
        const parent = categoryMap.get(cat.parent._id.toString());
        parent.children.push(cat);
      } else {
        roots.push(cat);
      }
    });

    // 6. Total number of top-level categories
    const totalTopLevel = roots.length;

    // 7. Paginate roots only
    const paginatedRoots = roots.slice(skip, skip + Number(limit));

    // 8. Flatten paginated roots with children
    const flatList = [];
    const traverse = (node, level = 0) => {
      flatList.push({ ...node, level });
      node.children.forEach((child) => traverse(child, level + 1));
    };
    paginatedRoots.forEach((root) => traverse(root));
     const toolCounts = await Tool.aggregate([
      { $unwind: "$category_id" },
      {
        $group: {
          _id: "$category_id",
          count: { $sum: 1 },
        },
      },
    ]);

    const toolCountMap = new Map();
    toolCounts.forEach((item) => {
      toolCountMap.set(item._id.toString(), item.count);
    });

    // 10. Add tool_count and is_child to each
    flatList.forEach((cat) => {
      cat.tool_count = toolCountMap.get(cat._id.toString()) || 0;
      cat.is_child = cat.level > 0;
    });


    // 9. Return paginated list
    res.json({
      success: true,
      data: flatList.map((cat) => ({
        ...cat,
        is_child: cat.level > 0,
      })),
      pagination: {
        current: Number(page),
        pages: Math.ceil(totalTopLevel / limit),
        total: totalTopLevel,
      },
    });
  } catch (error) {
    console.error("❌ Error fetching tool categories:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
});

// @desc    Get all tool categories (no pagination)
// @route   GET /api/tool-categories/all
// @access  Public
router.get("/all", async (req, res) => {
  try {
    // Fetch all active categories with parent and creator populated
    const categories = await ToolCategory.find({ is_active: true })
      .populate("created_by", "name")
      .populate("parent", "name")
      .sort({ usage_count: -1, createdAt: -1 })
      .lean();

    // Create map for quick access and initialize children
    const categoryMap = new Map();
    categories.forEach(cat => {
      categoryMap.set(cat._id.toString(), {
        ...cat,
        children: [],
      });
    });

    // Attach children to their respective parents
    categories.forEach(cat => {
      const parentId = cat.parent?._id?.toString();
      if (parentId && categoryMap.has(parentId)) {
        const child = categoryMap.get(cat._id.toString());
        categoryMap.get(parentId).children.push(child);
      }
    });

    // Filter for root-level categories (no parent)
    const roots = Array.from(categoryMap.values()).filter(cat => !cat.parent);

    // Recursively clean and flag each category
    const cleaned = roots.map(cat => cleanAndMark(cat));

    res.json({
      success: true,
      data: cleaned,
      total: cleaned.length,
    });
  } catch (error) {
    console.error("Get all tool categories error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
});

// ✅ Helper: Recursively clean object and set flags
function cleanAndMark(category, hasParent = false) {
  const cleanedChildren = (category.children || []).map(child =>
    cleanAndMark(child, true)
  );

  return {
    ...category,
    parent: undefined,        // remove parent reference
    is_child: hasParent,      // flag if it has parent
    children: cleanedChildren,
  };
}

// @desc    Get all tool categories
// @route   GET /api/tool-categories
// @access  Public
// ✅ GET Tree of Categories with Parent/Child Structure
router.get("/tree", async (req, res) => {
  try {
    const categories = await ToolCategory.find({ is_active: true }).lean()
    const categoryTree = buildCategoryTree(categories)
    res.json({
      success: true,
      data: categoryTree,
    })
  } catch (error) {
    console.error("Get category tree error:", error)
    res.status(500).json({
      success: false,
      message: "Server error",
    })
  }
})


// @desc    Get tool category by ID
// @route   GET /api/tool-categories/:id
// @access  Public
router.get("/:id", async (req, res) => {
  try {
    const category = await ToolCategory.findById(req.params.id).populate("created_by", "name")

    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Tool category not found",
      })
    }

    if (!category.is_active) {
      return res.status(404).json({
        success: false,
        message: "Tool category is not available",
      })
    }

    res.json({
      success: true,
      data: category,
    })
  } catch (error) {
    console.error("Get tool category error:", error)
    res.status(500).json({
      success: false,
      message: "Server error",
    })
  }
})

// @desc    Create new tool category
// @route   POST /api/tool-categories
// @access  Private (Admin/UI-UX Designer)
router.post(
  "/",
  protect,
  authorize("Admin", "UI/UX Designer"),
  validateToolCategory,
  handleValidationErrors,
  async (req, res) => {
    try {
      const categoryData = {
        ...req.body,
        created_by: req.user.id,
      }

      const category = await ToolCategory.create(categoryData)

      await category.populate("created_by", "name")

      res.status(201).json({
        success: true,
        message: "Tool category created successfully",
        data: category,
      })
    } catch (error) {
      console.error("Create tool category error:", error)
      res.status(500).json({
        success: false,
        message: "Server error",
      })
    }
  },
)

// @desc    Update tool category
// @route   PUT /api/tool-categories/:id
// @access  Private (Admin/UI-UX Designer)
router.put("/:id", protect, authorize("Admin", "UI/UX Designer"), async (req, res) => {
  try {
    const category = await ToolCategory.findById(req.params.id);

    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Tool category not found",
      });
    }

    const updateData = { ...req.body };

    // ✅ Handle removing parent
    if (updateData.parent === null || updateData.parent === "none") {
      updateData.$unset = { parent: "" };
      delete updateData.parent; // remove it so it doesn't override the unset
    }

    const updatedCategory = await ToolCategory.findByIdAndUpdate(
      req.params.id,
      updateData,
      {
        new: true,
        runValidators: true,
      }
    ).populate("created_by", "name");

    res.json({
      success: true,
      message: "Tool category updated successfully",
      data: updatedCategory,
    });
  } catch (error) {
    console.error("Update tool category error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
});


// @desc    Delete tool category
// @route   DELETE /api/tool-categories/:id
// @access  Private (Admin only)
router.delete("/:id", protect, authorize("Admin"), async (req, res) => {
  try {
    const category = await ToolCategory.findById(req.params.id)

    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Tool category not found",
      })
    }

    // Check if category has tools
    const Tool = require("../models/Tool")
    const toolsCount = await Tool.countDocuments({ category_id: req.params.id })

    if (toolsCount > 0) {
      return res.status(400).json({
        success: false,
        message: "Cannot delete category with existing tools",
      })
    }

    await ToolCategory.findByIdAndDelete(req.params.id)

    res.json({
      success: true,
      message: "Tool category deleted successfully",
    })
  } catch (error) {
    console.error("Delete tool category error:", error)
    res.status(500).json({
      success: false,
      message: "Server error",
    })
  }
})

// @desc    Delete Categories
// @route   DELETE /api/tool-categories
// @access  Private (Admin only)
router.delete('/', protect, authorize("Admin"), async (req, res) => {
  const categories = req.body;

  if (!Array.isArray(categories) || categories.length === 0) {
    return res.status(400).json({
      success: false,
      message: "Please provide data of tool categories to delete",
    });
  }

  const deleteToolCategoryIds = categories.map(c => c.id);

  try {
    const Tool = require("../models/Tool");

    // Fetch categories from DB to validate existence
    const existingCategories = await ToolCategory.find({ _id: { $in: deleteToolCategoryIds } }).select('_id name').lean();
    const existingCategoryIds = existingCategories.map(c => c._id.toString());
    const existingCategoryMap = Object.fromEntries(existingCategories.map(c => [c._id.toString(), c.name]));

    // Identify missing categories
    const missingCategories = categories.filter(c => !existingCategoryIds.includes(c.id));
    if (missingCategories.length > 0) {
      const missingNames = missingCategories.map(c => c.name || c.id);
      return res.status(404).json({
        success: false,
        message: `Tool categories not found: ${missingNames.join(', ')}`,
      });
    }

    // Check if any tools are using these categories
    const toolsUsingCategories = await Tool.find({
      $or: [
        { category_id: { $in: deleteToolCategoryIds } },
        { category_id: { $elemMatch: { $in: deleteToolCategoryIds } } }
      ]
    });

    // Update tools to remove the deleted category reference using updateOne
    for (const tool of toolsUsingCategories) {
      if (Array.isArray(tool.category_id)) {
        const updatedCategories = tool.category_id.filter(catId => !deleteToolCategoryIds.includes(catId.toString()));
        await Tool.updateOne(
          { _id: tool._id },
          { $set: { category_id: updatedCategories } }
        );
      } else if (tool.category_id && deleteToolCategoryIds.includes(tool.category_id.toString())) {
        await Tool.updateOne(
          { _id: tool._id },
          { $unset: { category_id: "" } }
        );
      }
    }

    // Delete the categories
    const result = await ToolCategory.deleteMany({ _id: { $in: deleteToolCategoryIds } });

    res.json({
      success: true,
      message: `${result.deletedCount} Tool categories deleted successfully`,
    });
  } catch (error) {
    console.error("Bulk delete tool categories error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error during bulk delete",
    });
  }
});

// @desc    Toggle tool category status
// @route   PATCH /api/tool-categories/:id/toggle
// @access  Private (Admin/UI-UX Designer)
router.patch("/:id/toggle", protect, authorize("Admin", "UI/UX Designer"), async (req, res) => {
  try {
    const category = await ToolCategory.findById(req.params.id)

    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Tool category not found",
      })
    }

    category.is_active = !category.is_active
    await category.save()

    res.json({
      success: true,
      message: `Tool category ${category.is_active ? "activated" : "deactivated"} successfully`,
      data: { is_active: category.is_active },
    })
  } catch (error) {
    console.error("Toggle tool category error:", error)
    res.status(500).json({
      success: false,
      message: "Server error",
    })
  }
})

function buildCategoryTree(categories, parentId = null) {
  const tree = []
  for (const category of categories) {
    const catParent = category.parent ? category.parent.toString() : null
    if ((parentId && catParent === parentId.toString()) || (!parentId && !category.parent)) {
      const children = buildCategoryTree(categories, category._id)
      tree.push({
        ...category,
        children,
      })
    }
  }
  return tree
}




module.exports = router
