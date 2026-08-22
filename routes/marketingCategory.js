const express = require("express");
const MarketingCategory = require("../models/MarketingCategory");
const { protect, authorize } = require("../middleware/auth");
const { validateMarketingCategory, handleValidationErrors } = require("../middleware/validation");
const MarketingTool = require("../models/MarketingTool")


const router = express.Router();

// ==========================
// GET /api/marketing-categories
// ==========================
router.get("/", async (req, res) => {
  try {
    const { search = "", page = 1, limit = 10, category_id } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    if (category_id) {
      const parentCategory = await MarketingCategory.findById(category_id)
        .populate("created_by", "name")
        .populate("parent", "name")
        .lean();

      if (!parentCategory) {
        return res.status(404).json({ success: false, message: "Category not found" });
      }

      const allChildren = await MarketingCategory.find({ parent: category_id })
        .populate("created_by", "name")
        .populate("parent", "name")
        .lean();

      allChildren.forEach(child => (child.children = []));

      parentCategory.children = allChildren.map(child => ({
        ...child,
        level: 1,
        is_child: true,
      }));

      const fullResponse = { ...parentCategory, level: 0, is_child: false };

      return res.json({ success: true, data: fullResponse });
    }

    const searchQuery = search
      ? { $or: [{ name: { $regex: search, $options: "i" } }, { description: { $regex: search, $options: "i" } }] }
      : {};

    const allCategories = await MarketingCategory.find(searchQuery)
      .populate("created_by", "name")
      .populate("parent", "name")
      .sort({ usage_count: -1, createdAt: -1 })
      .lean();

    const categoryMap = new Map();
    allCategories.forEach(cat => categoryMap.set(cat._id.toString(), { ...cat, children: [] }));

    const roots = [];
    categoryMap.forEach(cat => {
      if (cat.parent && cat.parent._id && categoryMap.has(cat.parent._id.toString())) {
        const parent = categoryMap.get(cat.parent._id.toString());
        parent.children.push(cat);
      } else {
        roots.push(cat);
      }
    });

    const totalTopLevel = roots.length;
    const paginatedRoots = roots.slice(skip, skip + Number(limit));

    const flatList = [];
    const traverse = (node, level = 0) => {
      flatList.push({ ...node, level });
      node.children.forEach(child => traverse(child, level + 1));
    };
    paginatedRoots.forEach(root => traverse(root));

    // Optional: Count tools per category if you track marketing tools
    const toolCounts = await MarketingTool.aggregate([
      { $unwind: "$category_id" },
      { $group: { _id: "$category_id", count: { $sum: 1 } } },
    ]);

    const toolCountMap = new Map();
    toolCounts.forEach(item => toolCountMap.set(item._id.toString(), item.count));

    flatList.forEach(cat => {
      cat.tool_count = toolCountMap.get(cat._id.toString()) || 0;
      cat.is_child = cat.level > 0;
    });

    res.json({
      success: true,
      data: flatList.map(cat => ({ ...cat, is_child: cat.level > 0 })),
      pagination: {
        current: Number(page),
        pages: Math.ceil(totalTopLevel / limit),
        total: totalTopLevel,
      },
    });
  } catch (error) {
    console.error("Error fetching marketing categories:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// ==========================
// GET /api/marketing-categories/all
// ==========================
router.get("/all", async (req, res) => {
  try {
    const categories = await MarketingCategory.find({ is_active: true })
      .populate("created_by", "name")
      .populate("parent", "name")
      .sort({ usage_count: -1, createdAt: -1 })
      .lean();

    const categoryMap = new Map();
    categories.forEach(cat => categoryMap.set(cat._id.toString(), { ...cat, children: [] }));
    categories.forEach(cat => {
      const parentId = cat.parent?._id?.toString();
      if (parentId && categoryMap.has(parentId)) {
        const child = categoryMap.get(cat._id.toString());
        categoryMap.get(parentId).children.push(child);
      }
    });

    const roots = Array.from(categoryMap.values()).filter(cat => !cat.parent);
    const cleaned = roots.map(cat => cleanAndMark(cat));

    res.json({ success: true, data: cleaned, total: cleaned.length });
  } catch (error) {
    console.error("Get all marketing categories error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

function cleanAndMark(category, hasParent = false) {
  const cleanedChildren = (category.children || []).map(child => cleanAndMark(child, true));
  return { ...category, parent: undefined, is_child: hasParent, children: cleanedChildren };
}

// ==========================
// GET /api/marketing-categories/tree
// ==========================
router.get("/tree", async (req, res) => {
  try {
    const categories = await MarketingCategory.find({ is_active: true }).lean();
    const categoryTree = buildCategoryTree(categories);
    res.json({ success: true, data: categoryTree });
  } catch (error) {
    console.error("Get marketing category tree error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

function buildCategoryTree(categories, parentId = null) {
  const tree = [];
  for (const category of categories) {
    const catParent = category.parent ? category.parent.toString() : null;
    if ((parentId && catParent === parentId.toString()) || (!parentId && !category.parent)) {
      const children = buildCategoryTree(categories, category._id);
      tree.push({ ...category, children });
    }
  }
  return tree;
}

// ==========================
// GET /api/marketing-categories/:id
// ==========================
router.get("/:id", async (req, res) => {
  try {
    const category = await MarketingCategory.findById(req.params.id).populate("created_by", "name");
    if (!category) return res.status(404).json({ success: false, message: "Marketing category not found" });
    if (!category.is_active) return res.status(404).json({ success: false, message: "Marketing category is not available" });
    res.json({ success: true, data: category });
  } catch (error) {
    console.error("Get marketing category error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});


// ==========================
// POST /api/marketing-categories
// ==========================
router.post("/", protect,authorize("Admin"),validateMarketingCategory,handleValidationErrors, async (req, res) => {
  try {
    const categoryData = { ...req.body, created_by: req.user.id };
    const category = await MarketingCategory.create(categoryData);
    await category.populate("created_by", "name");
    res.status(201).json({ success: true, message: "Marketing category created successfully", data: category });
  } catch (error) {
    console.error("Create marketing category error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// ==========================
// PUT /api/marketing-categories/:id
// ==========================
router.put("/:id", protect, authorize("Admin"), async (req, res) => {
  try {
    const category = await MarketingCategory.findById(req.params.id);
    if (!category) return res.status(404).json({ success: false, message: "Marketing category not found" });

    const updateData = { ...req.body };
    if (updateData.parent === null || updateData.parent === "none") {
      updateData.$unset = { parent: "" };
      delete updateData.parent;
    }

    const updatedCategory = await MarketingCategory.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
      runValidators: true,
    }).populate("created_by", "name");

    res.json({ success: true, message: "Marketing category updated successfully", data: updatedCategory });
  } catch (error) {
    console.error("Update marketing category error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

router.delete("/:id", protect, authorize("Admin"), async (req, res) => {
  try {
   

    const category = await MarketingCategory.findById(req.params.id);
    if (!category) {
    
      return res.status(404).json({ success: false, message: "Marketing category not found" });
    }

    const MarketingTool = require("../models/MarketingTool");
    const toolsCount = await MarketingTool.countDocuments({ category_id: req.params.id });
   

    if (toolsCount > 0) {
   
      return res.status(400).json({
        success: false,
        message: "Cannot delete category with existing tools",
      });
    }

    await MarketingCategory.findByIdAndDelete(req.params.id);
  

    res.json({ success: true, message: "Marketing category deleted successfully" });
  } catch (error) {
    console.error("Delete marketing category error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// ==========================
// DELETE multiple categories
// ==========================
router.delete("/", protect, authorize("Admin"), async (req, res) => {
  const categories = req.body;

  if (!Array.isArray(categories) || categories.length === 0) {
    return res.status(400).json({
      success: false,
      message: "Please provide data of marketing categories to delete",
    });
  }

  const deleteCategoryIds = categories.map(c => c.id);

  try {
    const existingCategories = await MarketingCategory.find({ _id: { $in: deleteCategoryIds } }).select('_id name').lean();
    const existingCategoryIds = existingCategories.map(c => c._id.toString());

    const missingCategories = categories.filter(c => !existingCategoryIds.includes(c.id));
    if (missingCategories.length > 0) {
      const missingNames = missingCategories.map(c => c.name || c.id);
      return res.status(404).json({
        success: false,
        message: `Marketing categories not found: ${missingNames.join(', ')}`,
      });
    }

    // Check if any tools are using these categories
    const toolsUsingCategories = await MarketingTool.find({
      $or: [
        { category_id: { $in: deleteCategoryIds } },
        { category_id: { $elemMatch: { $in: deleteCategoryIds } } }
      ]
    });

    for (const tool of toolsUsingCategories) {
      if (Array.isArray(tool.category_id)) {
        const updatedCategories = tool.category_id.filter(catId => !deleteCategoryIds.includes(catId.toString()));
        await MarketingTool.updateOne({ _id: tool._id }, { $set: { category_id: updatedCategories } });
      } else if (tool.category_id && deleteCategoryIds.includes(tool.category_id.toString())) {
        await MarketingTool.updateOne({ _id: tool._id }, { $unset: { category_id: "" } });
      }
    }

    const result = await MarketingCategory.deleteMany({ _id: { $in: deleteCategoryIds } });

    res.json({
      success: true,
      message: `${result.deletedCount} Marketing categories deleted successfully`,
    });
  } catch (error) {
    console.error("Bulk delete marketing categories error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error during bulk delete",
    });
  }
});

// ==========================
// PATCH /api/marketing-categories/:id/toggle
// ==========================
router.patch("/:id/toggle", protect, authorize("Admin"), async (req, res) => {
  try {
    const category = await MarketingCategory.findById(req.params.id);
    if (!category) return res.status(404).json({ success: false, message: "Marketing category not found" });

    category.is_active = !category.is_active;
    await category.save();

    res.json({
      success: true,
      message: `Marketing category ${category.is_active ? "activated" : "deactivated"} successfully`,
      data: { is_active: category.is_active },
    });
  } catch (error) {
    console.error("Toggle marketing category error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

module.exports = router;  