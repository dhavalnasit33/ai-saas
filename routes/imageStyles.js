const express = require("express");
const router = express.Router();
const ImageStyle = require("../models/ImageStyle");
const ImagePrompt = require("../models/ImagePrompt");
const VideoPrompt = require("../models/VideoPrompt");
const mongoose = require("mongoose");
const { protect, authorize } = require("../middleware/auth");
const { deleteLocalFile } = require("../utils/fileHelper");
const {
    validateImageStyle,
    handleValidationErrors,
} = require("../middleware/validation");

// @desc    Get paginated list of styles (Admin only)
// @route   GET /api/image-styles
// @query   page, limit, search, type (optional: "image" | "video")
router.get("/", protect, authorize("Admin"), async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 100;
        const search = req.query.search || "";
        const type = req.query.type; // optional filter

        const query = {};
        if (search) query.name = { $regex: search, $options: "i" };
        if (type && ["image", "video"].includes(type)) query.type = type;

        const total = await ImageStyle.countDocuments(query);
        const styles = await ImageStyle.find(query)
            .skip((page - 1) * limit)
            .limit(limit)
            .sort({ createdAt: -1 });

        res.json({
            success: true,
            data: styles,
            pagination: { current: page, pages: Math.ceil(total / limit), total },
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// @desc    Get all active image-type styles for public list (Guest + Logged-in)
// @route   GET /api/image-styles/all
router.get("/all", async (req, res) => {
    try {
        const styles = await ImageStyle.find({ is_active: true, type: "image" }).sort({ createdAt: 1 });
        res.json({ success: true, data: styles });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// @desc    Get all image-type styles including inactive (Admin only)
// @route   GET /api/image-styles/all/admin
router.get("/all/admin", protect, authorize("Admin"), async (req, res) => {
    try {
        const styles = await ImageStyle.find({ type: "image" }).sort({ createdAt: 1 });
        res.json({ success: true, data: styles });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// @desc    Get all active video-type styles for public list (Guest + Logged-in)
// @route   GET /api/image-styles/all/video
router.get("/all/video", async (req, res) => {
    try {
        const styles = await ImageStyle.find({ is_active: true, type: "video" }).sort({ createdAt: 1 });
        res.json({ success: true, data: styles });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// @desc    Get all video-type styles including inactive (Admin only)
// @route   GET /api/image-styles/all/video/admin
router.get("/all/video/admin", protect, authorize("Admin"), async (req, res) => {
    try {
        const styles = await ImageStyle.find({ type: "video" }).sort({ createdAt: 1 });
        res.json({ success: true, data: styles });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// @desc    Get single style by ID
// @route   GET /api/image-styles/:id
router.get("/:id", protect, authorize("Admin"), async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ success: false, message: "Invalid style ID" });
        }
        const style = await ImageStyle.findById(req.params.id);
        if (!style) {
            return res.status(404).json({ success: false, message: "Style not found" });
        }
        res.json({ success: true, data: style });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// @desc    Create new style
// @route   POST /api/image-styles
router.post(
    "/",
    protect,
    authorize("Admin"),
    validateImageStyle,
    handleValidationErrors,
    async (req, res) => {
        try {
            const style = new ImageStyle(req.body);
            await style.save();
            res.json({ success: true, data: style });
        } catch (err) {
            res.status(400).json({ success: false, message: err.message });
        }
    }
);

// @desc    Update style
// @route   PUT /api/image-styles/:id
router.put(
    "/:id",
    protect,
    authorize("Admin"),
    validateImageStyle,
    handleValidationErrors,
    async (req, res) => {
        try {
            if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
                return res.status(400).json({ success: false, message: "Invalid style ID" });
            }
            const style = await ImageStyle.findByIdAndUpdate(
                req.params.id,
                { $set: req.body },
                { new: true, runValidators: true }
            );

            if (!style) {
                return res.status(404).json({ success: false, message: "Style not found" });
            }

            res.json({ success: true, data: style });
        } catch (err) {
            res.status(400).json({ success: false, message: err.message });
        }
    }
);

// @desc    Toggle Active Status
// @route   PATCH /api/image-styles/:id/toggle
router.patch("/:id/toggle", protect, authorize("Admin"), async (req, res) => {
    try {
        const style = await ImageStyle.findById(req.params.id);
        if (!style) return res.status(404).json({ success: false, message: "Not found" });

        style.is_active = !style.is_active;
        await style.save();
        res.json({ success: true, data: { is_active: style.is_active } });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// @desc    Delete single style
// @route   DELETE /api/image-styles/:id
router.delete("/:id", protect, authorize("Admin"), async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ success: false, message: "Invalid style ID" });
    }

    // 1. Find the style first to get its name
    const style = await ImageStyle.findById(req.params.id);
    if (!style) {
      return res.status(404).json({ success: false, message: "Style not found" });
    }

    // 2. Check usage count in both ImagePrompt and VideoPrompt
    const imageUsageCount = await ImagePrompt.countDocuments({ style: req.params.id });
    const videoUsageCount = await VideoPrompt.countDocuments({ style: req.params.id });
    const totalUsage = imageUsageCount + videoUsageCount;

    if (totalUsage > 0) {
      const parts = [];
      if (imageUsageCount > 0) parts.push(`${imageUsageCount} image prompt(s)`);
      if (videoUsageCount > 0) parts.push(`${videoUsageCount} video prompt(s)`);
      return res.status(400).json({
        success: false,
        message: `Cannot delete. ${style.name}: used in ${parts.join(" and ")}. Please remove them first.`
      });
    }

    // 3. Delete if safe
    deleteLocalFile(style.image);
    await style.deleteOne();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// @desc    Bulk delete styles
// @route   POST /api/image-styles/bulk-delete
router.post("/bulk-delete", protect, authorize("Admin"), async (req, res) => {
  try {
    const { ids } = req.body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ success: false, message: "No IDs provided" });
    }

    // 1. Validate all IDs before casting
    const invalidIds = ids.filter(id => !mongoose.Types.ObjectId.isValid(id));
    if (invalidIds.length > 0) {
      return res.status(400).json({ success: false, message: `Invalid ID(s): ${invalidIds.join(", ")}` });
    }

    // 2. Cast string IDs to ObjectId for aggregation
    const objectIds = ids.map(id => new mongoose.Types.ObjectId(id));

    // 2. Check usage in both ImagePrompt and VideoPrompt
    const [imageUsageData, videoUsageData] = await Promise.all([
      ImagePrompt.aggregate([
        { $match: { style: { $in: objectIds } } },
        { $group: { _id: "$style", count: { $sum: 1 } } }
      ]),
      VideoPrompt.aggregate([
        { $match: { style: { $in: objectIds } } },
        { $group: { _id: "$style", count: { $sum: 1 } } }
      ])
    ]);

    // Merge counts by style ID
    const usageMap = {};
    for (const u of imageUsageData) {
      const key = u._id.toString();
      usageMap[key] = usageMap[key] || { image: 0, video: 0 };
      usageMap[key].image = u.count;
    }
    for (const u of videoUsageData) {
      const key = u._id.toString();
      usageMap[key] = usageMap[key] || { image: 0, video: 0 };
      usageMap[key].video = u.count;
    }

    const usedStyleIds = Object.keys(usageMap);

    // 3. If any usage is found, stop and report details
    if (usedStyleIds.length > 0) {
      const usedStyles = await ImageStyle.find({ _id: { $in: usedStyleIds } }).select("name");

      const details = usedStyles.map(styleDoc => {
        const counts = usageMap[styleDoc._id.toString()];
        const parts = [];
        if (counts.image > 0) parts.push(`${counts.image} image prompt(s)`);
        if (counts.video > 0) parts.push(`${counts.video} video prompt(s)`);
        return `${styleDoc.name}: ${parts.join(" and ")}`;
      }).join(", ");

      return res.status(400).json({
        success: false,
        message: `Cannot delete. The following styles are in use: ${details}. Please remove the prompts first.`
      });
    }

    // 4. If no usage, proceed with delete
    const stylesToDelete = await ImageStyle.find({ _id: { $in: ids } });
    for (const styleDoc of stylesToDelete) {
      deleteLocalFile(styleDoc.image);
    }

    await ImageStyle.deleteMany({ _id: { $in: ids } });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;