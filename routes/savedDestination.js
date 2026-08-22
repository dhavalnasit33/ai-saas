const express = require("express");
const SavedDestination = require("../models/SavedDestination");
const { protect } = require("../middleware/auth");
const {
  validateSavedDestination,
  handleValidationErrors,
} = require("../middleware/validation");

const router = express.Router();

// @route   GET /api/destinations/saved
// @desc    Get all saved destinations for logged-in user (with pagination + search)
// @access  Private
router.get("/saved", protect, async (req, res) => {
  try {
    const userId = req.user.id;

    // query params
    const { page = 1, limit = 10, search = "" } = req.query;

    const query = { user: userId, is_saved: true };

    // If search keyword present → match against destination title or description
    if (search) {
      query.$or = [
        { "destination.title": { $regex: search, $options: "i" } },
        { "destination.description": { $regex: search, $options: "i" } },
      ];
    }

    // Count total for pagination
    const total = await SavedDestination.countDocuments(query);

    // Fetch paginated results
    const savedDestinations = await SavedDestination.find(query)
      .populate({
        path: "destination",
        populate: { path: "discover_destinations" },
      })
      .skip((page - 1) * limit)
      .limit(Number(limit))
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      page: Number(page),
      limit: Number(limit),
      total,
      totalPages: Math.ceil(total / limit),
      savedDestinations,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// @route   POST /api/destinations/save
// @desc    Save destination
// @access  Private
router.post(
  "/save",
  protect,
  validateSavedDestination,
  handleValidationErrors,
  async (req, res) => {
    try {
      const { destinationId, aiResponse } = req.body;
      const userId = req.user.id;

      if (!destinationId) {
        return res
          .status(400)
          .json({ success: false, message: "Destination ID is required" });
      }

      const saved = await SavedDestination.findOneAndUpdate(
        { user: userId, destination: destinationId },
        { is_saved: true, ai_response: aiResponse },
        { new: true, upsert: true }
      ).populate("destination");

      res.json({ success: true, saved });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  }
);

// @route   DELETE /api/destinations/unsave/:id
// @desc    Unsave destination
// @access  Private
router.delete("/unsave/:id", protect, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const deleted = await SavedDestination.findOneAndDelete({
      user: userId,
      destination: id,
    });

    if (!deleted) {
      return res
        .status(404)
        .json({ success: false, message: "Saved destination not found" });
    }

    res.json({ success: true, message: "Destination unsaved" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
