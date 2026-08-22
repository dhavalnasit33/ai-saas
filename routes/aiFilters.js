const express = require("express");
const router = express.Router();
const AIFilter = require("../models/AIFilter");
const mongoose = require("mongoose");
const { protect, authorize } = require("../middleware/auth");
const { deleteLocalFile } = require("../utils/fileHelper");

// @desc    Get paginated list of filters (Admin only)
// @route   GET /api/ai-filters
// @query   page, limit, search
router.get("/", protect, authorize("Admin"), async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 100;
        const search = req.query.search || "";

        const query = {};
        if (search) query.name = { $regex: search, $options: "i" };

        const total = await AIFilter.countDocuments(query);
        const filters = await AIFilter.find(query)
            .skip((page - 1) * limit)
            .limit(limit)
            .sort({ createdAt: -1 });

        res.json({
            success: true,
            data: filters,
            pagination: { current: page, pages: Math.ceil(total / limit), total },
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// @desc    Get all active filters for public list (Guest + Logged-in)
// @route   GET /api/ai-filters/all
router.get("/all", async (req, res) => {
    try {
        const filters = await AIFilter.find({ is_active: true }).sort({ createdAt: 1 });
        res.json({ success: true, data: filters });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// @desc    Get single filter by ID
// @route   GET /api/ai-filters/:id
router.get("/:id", protect, authorize("Admin"), async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ success: false, message: "Invalid filter ID" });
        }
        const filter = await AIFilter.findById(req.params.id);
        if (!filter) {
            return res.status(404).json({ success: false, message: "Filter not found" });
        }
        res.json({ success: true, data: filter });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// @desc    Create new filter
// @route   POST /api/ai-filters
router.post(
    "/",
    protect,
    authorize("Admin"),
    async (req, res) => {
        try {
            if (!req.body.name || !req.body.image) {
                return res.status(400).json({ success: false, message: "Name and image are required" });
            }
            const filter = new AIFilter(req.body);
            await filter.save();
            res.json({ success: true, data: filter });
        } catch (err) {
            res.status(400).json({ success: false, message: err.message });
        }
    }
);

// @desc    Update filter
// @route   PUT /api/ai-filters/:id
router.put(
    "/:id",
    protect,
    authorize("Admin"),
    async (req, res) => {
        try {
            if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
                return res.status(400).json({ success: false, message: "Invalid filter ID" });
            }
            const filter = await AIFilter.findByIdAndUpdate(
                req.params.id,
                { $set: req.body },
                { new: true, runValidators: true }
            );

            if (!filter) {
                return res.status(404).json({ success: false, message: "Filter not found" });
            }

            res.json({ success: true, data: filter });
        } catch (err) {
            res.status(400).json({ success: false, message: err.message });
        }
    }
);

// @desc    Toggle Active Status
// @route   PATCH /api/ai-filters/:id/toggle
router.patch("/:id/toggle", protect, authorize("Admin"), async (req, res) => {
    try {
        const filter = await AIFilter.findById(req.params.id);
        if (!filter) return res.status(404).json({ success: false, message: "Not found" });

        filter.is_active = !filter.is_active;
        await filter.save();
        res.json({ success: true, data: { is_active: filter.is_active } });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// @desc    Delete single filter
// @route   DELETE /api/ai-filters/:id
router.delete("/:id", protect, authorize("Admin"), async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ success: false, message: "Invalid filter ID" });
    }

    const filter = await AIFilter.findById(req.params.id);
    if (!filter) {
      return res.status(404).json({ success: false, message: "Filter not found" });
    }

    // Delete local files
    deleteLocalFile(filter.image);
    deleteLocalFile(filter.original_image);

    await filter.deleteOne();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// @desc    Bulk delete filters
// @route   POST /api/ai-filters/bulk-delete
router.post("/bulk-delete", protect, authorize("Admin"), async (req, res) => {
  try {
    const { ids } = req.body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ success: false, message: "No IDs provided" });
    }

    const invalidIds = ids.filter(id => !mongoose.Types.ObjectId.isValid(id));
    if (invalidIds.length > 0) {
      return res.status(400).json({ success: false, message: `Invalid ID(s): ${invalidIds.join(", ")}` });
    }

    // Find filters to delete files
    const filters = await AIFilter.find({ _id: { $in: ids } });
    for (const filter of filters) {
      deleteLocalFile(filter.image);
      deleteLocalFile(filter.original_image);
    }

    await AIFilter.deleteMany({ _id: { $in: ids } });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
