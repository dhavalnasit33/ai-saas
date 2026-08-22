const express = require("express");
const router = express.Router();
const VideoPrompt = require("../models/VideoPrompt");
const mongoose = require("mongoose");
const { protect, authorize } = require("../middleware/auth");
const { deleteLocalFile } = require("../utils/fileHelper");
const {
    validateVideoPrompt,
    handleValidationErrors,
} = require("../middleware/validation");

// @desc    Get all video prompt data (Admin Paginated)
// @route   GET /api/video-prompts
router.get("/", protect, authorize("Admin"), async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const search = req.query.search || "";
        const styleId = req.query.style;

        let query = {};

        // Search in video_prompt or short_video_prompt text
        if (search) {
            query.$or = [
                { video_prompt: { $regex: search, $options: "i" } },
                { short_video_prompt: { $regex: search, $options: "i" } },
            ];
        }

        if (styleId) {
            query.style = styleId;
        }

        const total = await VideoPrompt.countDocuments(query);
        const prompts = await VideoPrompt.find(query)
            .populate("style", "name")
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

// @desc    Get all active video prompts with populated style
// @route   GET /api/video-prompts/list
router.get("/list", async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const style = req.query.style;

        // Base query: only active prompts
        let query = { is_active: true };

        // Optional style filter
        if (style && style !== "") {
            query.style = style;
        }

        // Total count (for pagination)
        const total = await VideoPrompt.countDocuments(query);

        // Fetch paginated data
        const prompts = await VideoPrompt.find(query)
            .populate("style", "name image")
            .sort({ createdAt: 1 })
            .skip((page - 1) * limit)
            .limit(limit)
            .lean();

        res.json({
            success: true,
            data: prompts,
            pagination: {
                currentPage: page,
                totalPages: Math.ceil(total / limit),
                totalItems: total,
                limit,
            },
        });
    } catch (err) {
        console.error("Video Prompt List API Error:", err);
        res.status(500).json({
            success: false,
            message: "Server Error",
        });
    }
});

// @desc    Get single video prompt data
// @route   GET /api/video-prompts/:id
router.get("/:id", async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ success: false, message: "Invalid video prompt ID" });
        }
        const prompt = await VideoPrompt.findById(req.params.id).populate("style");
        if (!prompt) {
            return res
                .status(404)
                .json({ success: false, message: "Video prompt not found" });
        }
        res.json({ success: true, data: prompt });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// @desc    Create new video prompt
// @route   POST /api/video-prompts
router.post(
    "/",
    protect,
    authorize("Admin"),
    validateVideoPrompt,
    handleValidationErrors,
    async (req, res) => {
        try {
            const prompt = await VideoPrompt.create(req.body);
            res.status(201).json({ success: true, data: prompt });
        } catch (err) {
            res.status(400).json({ success: false, message: err.message });
        }
    }
);

// @desc    Update video prompt
// @route   PUT /api/video-prompts/:id
router.put(
    "/:id",
    protect,
    authorize("Admin"),
    validateVideoPrompt,
    handleValidationErrors,
    async (req, res) => {
        try {
            if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
                return res.status(400).json({ success: false, message: "Invalid video prompt ID" });
            }
            const prompt = await VideoPrompt.findByIdAndUpdate(
                req.params.id,
                { $set: req.body },
                {
                    new: true,
                    runValidators: true,
                }
            );

            if (!prompt) {
                return res
                    .status(404)
                    .json({ success: false, message: "Video prompt not found" });
            }

            res.json({ success: true, data: prompt });
        } catch (err) {
            res.status(400).json({ success: false, message: err.message });
        }
    }
);

// @desc    Delete single video prompt
// @route   DELETE /api/video-prompts/:id
router.delete("/:id", protect, authorize("Admin"), async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ success: false, message: "Invalid video prompt ID" });
        }
        const prompt = await VideoPrompt.findById(req.params.id);
        if (!prompt) {
            return res
                .status(404)
                .json({ success: false, message: "Video prompt not found" });
        }
        
        // Delete local files
        deleteLocalFile(prompt.image);
        deleteLocalFile(prompt.video);

        await prompt.deleteOne();
        res.json({ success: true, message: "Video prompt deleted successfully" });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// @desc    Bulk Delete video prompts
// @route   POST /api/video-prompts/bulk-delete
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

        // Find prompts to delete files
        const prompts = await VideoPrompt.find({ _id: { $in: ids } });
        for (const prompt of prompts) {
            deleteLocalFile(prompt.image);
            deleteLocalFile(prompt.video);
        }

        await VideoPrompt.deleteMany({ _id: { $in: ids } });
        res.json({ success: true, message: "Video prompts deleted successfully" });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// @desc    Toggle Active Status
// @route   PATCH /api/video-prompts/:id/toggle
router.patch("/:id/toggle", protect, authorize("Admin"), async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ success: false, message: "Invalid video prompt ID" });
        }
        const prompt = await VideoPrompt.findById(req.params.id);
        if (!prompt) {
            return res.status(404).json({ success: false, message: "Not found" });
        }

        prompt.is_active = !prompt.is_active;
        await prompt.save();

        res.json({ success: true, data: { is_active: prompt.is_active } });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

module.exports = router;
