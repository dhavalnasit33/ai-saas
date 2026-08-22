// routes/newsCategories.js
const express = require("express");
const NewsCategory = require("../models/NewsCategory");
const News = require("../models/TrendingNews");

const { protect, authorize } = require("../middleware/auth");
const User = require("../models/User");

const router = express.Router();

// @route   GET /api/news-categories
router.get("/",protect, async (req, res) => {
  try {
    const { search = "", page = 1, limit = 10 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    let userSelectedCategoryIds = [];

    // If user is logged in, fetch their selected categories
    if (req.user?.id) {
      const user = await User.findById(req.user.id)
        .select("selected_categories")
        .lean();
      userSelectedCategoryIds = user?.selected_categories?.map((id) => id.toString()) || [];
    }

    const markSelection = (category, level = 0) => ({
      ...category,
      level,
      is_child: level > 0,
      is_selected: userSelectedCategoryIds.includes(category._id.toString()),
      children: category.children?.map((child) =>
        markSelection(child, level + 1)
      ) || [],
    });

    // Parent query
    const parentQuery = {
      parent: null,
      ...(search
        ? {
            $or: [
              { name: { $regex: search, $options: "i" } },
              { description: { $regex: search, $options: "i" } },
            ],
          }
        : {}),
      ...(typeof req.query.is_active !== "undefined"
        ? { is_active: req.query.is_active === "true" }
        : {}),
      ...(typeof req.query.is_popular !== "undefined"
        ? { is_popular: req.query.is_popular === "true" }
        : {}),
    };

    const totalParents = await NewsCategory.countDocuments(parentQuery);

    const parentCategories = await NewsCategory.find(parentQuery)
      .select("+is_popular")
      .populate("created_by", "name")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .lean();

    const parentIds = parentCategories.map((cat) => cat._id);

    const allChildren = await NewsCategory.find({ parent: { $in: parentIds } })
      .populate("created_by", "name")
      .populate("parent", "name")
      .lean();

    const allCategoryIds = [
      ...parentCategories.map((c) => c._id),
      ...allChildren.map((c) => c._id),
    ];

    const counts = await News.aggregate([
      { $unwind: "$category_id" },
      { $match: { category_id: { $in: allCategoryIds } } },
      {
        $group: {
          _id: "$category_id",
          count: { $sum: 1 },
        },
      },
    ]);
    const countMap = new Map(counts.map((item) => [item._id.toString(), item.count]));

    const childrenMap = new Map();
    allChildren.forEach((child) => {
      const parentId = child.parent._id.toString();
      if (!childrenMap.has(parentId)) childrenMap.set(parentId, []);
      childrenMap.get(parentId).push({
        ...child,
        newsCount: countMap.get(child._id.toString()) || 0,
        children: [],
      });
    });

    const finalData = parentCategories.map((parent) => {
      return markSelection({
        ...parent,
        newsCount: countMap.get(parent._id.toString()) || 0,
        children: childrenMap.get(parent._id.toString()) || [],
      });
    });

    return res.json({
      success: true,
      data: finalData,
      pagination: {
        current: Number(page),
        pages: Math.ceil(totalParents / limit),
        total: totalParents,
      },
    });
  } catch (error) {
    console.error("❌ Error fetching news categories:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});




// @route   POST /api/user/categories
// @desc    Save selected categories for logged-in user
// @access  Private
router.post("/save-categories", protect, async (req, res) => {
  try {
    const { selectedCategoryIds } = req.body; // Array of category ObjectIds

    if (!Array.isArray(selectedCategoryIds)) {
      return res
        .status(400)
        .json({
          success: false,
          message: "selectedCategoryIds must be an array",
        });
    }

    // Update user's selected_categories
    const user = await User.findByIdAndUpdate(
      req.user.id,
      { selected_categories: selectedCategoryIds },
      { new: true }
    ).populate("selected_categories");
    res.json({
      success: true,
      message: "Selected categories saved successfully",
      data: user.selected_categories,
    });
  } catch (err) {
    console.error("❌ Error saving selected categories:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// @route   GET /api/news-categories/all
router.get("/all", protect, async (req, res) => {
  try {
    const categories = await NewsCategory.find({ is_active: true })
      .populate("created_by", "name")
      .populate("parent", "name")
      .sort({ createdAt: -1 })
      .lean();

    const categoryMap = new Map();
    categories.forEach((cat) => {
      categoryMap.set(cat._id.toString(), { ...cat, children: [] });
    });

    categories.forEach((cat) => {
      const parentId = cat.parent?._id?.toString();
      if (parentId && categoryMap.has(parentId)) {
        categoryMap
          .get(parentId)
          .children.push(categoryMap.get(cat._id.toString()));
      }
    });

    const roots = Array.from(categoryMap.values()).filter((cat) => !cat.parent);
    const cleaned = roots.map((cat) => cleanAndMark(cat));

    res.json({ success: true, data: cleaned, total: cleaned.length });
  } catch (error) {
    console.error("Get all news categories error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

router.get("/tree", async (req, res) => {
  try {
    const categories = await NewsCategory.find({ is_active: true }).lean();
    const categoryTree = buildCategoryTree(categories);
    res.json({ success: true, data: categoryTree });
  } catch (error) {
    console.error("Get category tree error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

router.get("/:id", protect, async (req, res) => {
  try {
    const category = await NewsCategory.findById(req.params.id).populate(
      "created_by",
      "name"
    );
    if (!category || !category.is_active) {
      return res
        .status(404)
        .json({ success: false, message: "News category not found" });
    }
    res.json({ success: true, data: category });
  } catch (error) {
    console.error("Get news category error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

router.post("/", protect, authorize("Admin"), async (req, res) => {
  try {
    const category = await NewsCategory.create({
      ...req.body,
      created_by: req.user.id,
    });
    await category.populate("created_by", "name");
    res
      .status(201)
      .json({
        success: true,
        message: "News category created",
        data: category,
      });
  } catch (error) {
    console.error("Create news category error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

router.put("/:id", protect, authorize("Admin"), async (req, res) => {
  try {
    const updateData = { ...req.body };
    if (updateData.parent === null || updateData.parent === "none") {
      updateData.$unset = { parent: "" };
      delete updateData.parent;
    }
    const updatedCategory = await NewsCategory.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    ).populate("created_by", "name");
    res.json({
      success: true,
      message: "News category updated",
      data: updatedCategory,
    });
  } catch (error) {
    console.error("Update news category error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

router.post("/bulk-delete", protect, authorize("Admin"), async (req, res) => {
  const { ids } = req.body;

  if (!Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ success: false, message: "No IDs provided" });
  }

  try {
    // ✅ Only block if child is NOT in delete list
    const categoriesWithChildren = await NewsCategory.find({
      parent: { $in: ids },
      _id: { $nin: ids },
    });

    if (categoriesWithChildren.length > 0) {
      const blockingParents = categoriesWithChildren.map((cat) =>
        cat.parent.toString()
      );
      const uniqueBlockingParents = [...new Set(blockingParents)];
      return res.status(400).json({
        success: false,
        message:
          "Some categories have child categories not selected for deletion. Please delete/reassign children first.",
        blocking_ids: uniqueBlockingParents,
      });
    }

    // ✅ Unset category_id in News where category_id is in the list
    await News.updateMany(
      { category_id: { $in: ids } },
      { $unset: { category_id: "" } }
    );

    // ✅ Delete categories
    const result = await NewsCategory.deleteMany({ _id: { $in: ids } });

    res.json({
      success: true,
      message: `${result.deletedCount} news categories deleted.`,
    });
  } catch (error) {
    console.error("Bulk delete error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

router.delete("/:id", protect, authorize("Admin"), async (req, res) => {
  const { id } = req.params;

  try {
    const category = await NewsCategory.findById(id);
    if (!category) {
      return res
        .status(404)
        .json({ success: false, message: "Category not found" });
    }

    // ✅ Check if this category has child categories
    const hasChildren = await NewsCategory.exists({ parent: id });
    if (hasChildren) {
      return res.status(400).json({
        success: false,
        message:
          "This category has child categories. Please delete or reassign them first.",
      });
    }

    // ✅ Unset category_id in News documents
    await News.updateMany({ category_id: id }, { $unset: { category_id: "" } });

    // ✅ Delete the category
    await NewsCategory.findByIdAndDelete(id);

    res.json({ success: true, message: "News category deleted" });
  } catch (error) {
    console.error("Delete news category error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

router.patch("/:id/toggle", protect, authorize("Admin"), async (req, res) => {
  try {
    const category = await NewsCategory.findById(req.params.id);
    if (!category)
      return res
        .status(404)
        .json({ success: false, message: "Category not found" });

    category.is_active = !category.is_active;
    await category.save();

    res.json({
      success: true,
      message: `Category ${category.is_active ? "activated" : "deactivated"}`,
      data: { is_active: category.is_active },
    });
  } catch (error) {
    console.error("Toggle category error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

function buildCategoryTree(categories, parentId = null) {
  const tree = [];
  for (const category of categories) {
    const catParent = category.parent ? category.parent.toString() : null;
    if (
      (parentId && catParent === parentId.toString()) ||
      (!parentId && !category.parent)
    ) {
      const children = buildCategoryTree(categories, category._id);
      tree.push({ ...category, children });
    }
  }
  return tree;
}

function cleanAndMark(category, hasParent = false) {
  const cleanedChildren = (category.children || []).map((child) =>
    cleanAndMark(child, true)
  );
  return {
    ...category,
    parent: undefined,
    is_child: hasParent,
    children: cleanedChildren,
  };
}

module.exports = router;
