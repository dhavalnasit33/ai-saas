const express = require("express");
const router = express.Router();
const CodingPromptTopic = require("../models/CodingPromptTopic");
const { protect, authorize } = require("../middleware/auth");
const {
  validateCodingTopic,
  handleValidationErrors,
} = require("../middleware/validation");

// @desc    Get all coding topics (Paginated & Searchable)
// @route   GET /api/coding-prompt-topics
router.get("/", async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search || "";

    let query = {};

    // Search by title or description
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
      ];
    }

    // Hide inactive items unless Admin
    if (!req.user || req.user.role !== "Admin") {
      query.is_active = true;
    }

    const total = await CodingPromptTopic.countDocuments(query);
    const topics = await CodingPromptTopic.find(query)
      .skip((page - 1) * limit)
      .limit(limit)
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: topics,
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

// @desc    Get all active coding topics list (Guest + Logged-in)
// @route   GET /api/coding-prompt-topics/list
router.get("/list", protect, async (req, res) => {
  try {
    // 1️⃣ Base query: only active prompts
    // Removed search logic as requested
    const query = { is_active: true };

    const topics = await CodingPromptTopic.find(query)
      .sort({ createdAt: 1 })
      .lean();

    res.json({
      success: true,
      count: topics.length,
      data: topics,
    });
  } catch (err) {
    console.error("Coding Topic List API Error:", err);
    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
});

// @desc    Get single coding topic
// @route   GET /api/coding-prompt-topics/:id
router.get("/:id", async (req, res) => {
  try {
    const topic = await CodingPromptTopic.findById(req.params.id);
    if (!topic) {
      return res
        .status(404)
        .json({ success: false, message: "Topic not found" });
    }
    res.json({ success: true, data: topic });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// @desc    Create new coding topic
// @route   POST /api/coding-prompt-topics
router.post(
  "/",
  protect,
  authorize("Admin"),
  validateCodingTopic,
  handleValidationErrors,
  async (req, res) => {
    try {
      const topic = await CodingPromptTopic.create(req.body);
      res.status(201).json({ success: true, data: topic });
    } catch (err) {
      res.status(400).json({ success: false, message: err.message });
    }
  }
);

// @desc    Update coding topic
// @route   PUT /api/coding-prompt-topics/:id
router.put(
  "/:id",
  protect,
  authorize("Admin"),
  validateCodingTopic,
  handleValidationErrors,
  async (req, res) => {
    try {
      const topic = await CodingPromptTopic.findByIdAndUpdate(
        req.params.id,
        req.body,
        {
          new: true,
          runValidators: true,
        }
      );

      if (!topic) {
        return res
          .status(404)
          .json({ success: false, message: "Topic not found" });
      }

      res.json({ success: true, data: topic });
    } catch (err) {
      res.status(400).json({ success: false, message: err.message });
    }
  }
);

// @desc    Delete coding topic
// @route   DELETE /api/coding-prompt-topics/:id
router.delete("/:id", protect, authorize("Admin"), async (req, res) => {
  try {
    const topic = await CodingPromptTopic.findByIdAndDelete(req.params.id);
    if (!topic) {
      return res
        .status(404)
        .json({ success: false, message: "Topic not found" });
    }

    res.json({
      success: true,
      message: "Topic deleted successfully",
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// @desc    Bulk Delete coding topics
// @route   POST /api/coding-prompt-topics/bulk-delete
router.post(
  "/bulk-delete",
  protect,
  authorize("Admin"),
  async (req, res) => {
    try {
      const { ids } = req.body;

      if (!ids || !Array.isArray(ids) || ids.length === 0) {
        return res
          .status(400)
          .json({ success: false, message: "No IDs provided" });
      }

      await CodingPromptTopic.deleteMany({ _id: { $in: ids } });

      res.json({
        success: true,
        message: "Topics deleted successfully",
      });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  }
);

// @desc    Toggle Active Status
// @route   PATCH /api/coding-prompt-topics/:id/toggle
router.patch(
  "/:id/toggle",
  protect,
  authorize("Admin"),
  async (req, res) => {
    try {
      const topic = await CodingPromptTopic.findById(req.params.id);
      if (!topic) {
        return res.status(404).json({
          success: false,
          message: "Topic not found",
        });
      }

      topic.is_active = !topic.is_active;
      await topic.save();

      res.json({
        success: true,
        data: { is_active: topic.is_active },
      });
    } catch (err) {
      res.status(500).json({
        success: false,
        message: err.message,
      });
    }
  }
);

module.exports = router;