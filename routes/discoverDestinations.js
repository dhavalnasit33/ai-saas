// routes/discoverDestinations.js
const express = require("express");
const DiscoverDestination = require("../models/DiscoverDestination");
const { protect, authorize } = require("../middleware/auth");
const { validateDiscoverDestination, handleValidationErrors } = require("../middleware/validation");

const router = express.Router();

// @route   GET /api/discover-destinations
// @route   GET /api/discover-destinations
router.get("/", protect, async (req, res) => {
  try {
    const { search = "", page = 1, limit = 10, is_active } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const query = {
      ...(search
        ? {
            $or: [
              { title: { $regex: search, $options: "i" } },
              { description: { $regex: search, $options: "i" } },
            ],
          }
        : {}),
      ...(typeof is_active !== "undefined"
        ? { is_active: is_active === "true" }
        : {}),
    };

    const total = await DiscoverDestination.countDocuments(query);

    const destinations = await DiscoverDestination.aggregate([
      { $match: query },
      { $sort: { createdAt: -1 } },
      { $skip: skip },
      { $limit: Number(limit) },
      {
        $lookup: {
          from: "discoverdestinationcollections", // 👈 Mongo will pluralize model name
          localField: "_id",
          foreignField: "discover_destinations",
          as: "collections",
        },
      },
      {
        $addFields: {
          collection_count: { $size: "$collections" },
        },
      },
      {
        $project: {
          collections: 0, // don’t return full collection list
        },
      },
    ]);

    res.json({
      success: true,
      data: destinations,
      pagination: {
        current: Number(page),
        pages: Math.ceil(total / limit),
        total,
      },
    });
  } catch (error) {
    console.error("❌ Error fetching destinations:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// @route   GET /api/discover-destinations/all
router.get("/all", protect, async (req, res) => {
  try {
    const destinations = await DiscoverDestination.find()
      .sort({ createdAt: -1 })
      .lean();
    res.json({ success: true, data: destinations, total: destinations.length });
  } catch (error) {
    console.error("❌ Error fetching all destinations:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// @route   GET /api/discover-destinations/:id
router.get("/:id", protect, async (req, res) => {
  try {
    const destination = await DiscoverDestination.findById(req.params.id);
    if (!destination) {
      return res
        .status(404)
        .json({ success: false, message: "Destination not found" });
    }
    res.json({ success: true, data: destination });
  } catch (error) {
    console.error("❌ Error fetching destination:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// @route   POST /api/discover-destinations
router.post(
  "/",
  protect,
  authorize("Admin"),
  validateDiscoverDestination,
  handleValidationErrors,
  async (req, res) => {
    try {
      const destination = await DiscoverDestination.create({
        ...req.body,
      });
      res
        .status(201)
        .json({
          success: true,
          message: "Destination created",
          data: destination,
        });
    } catch (error) {
      console.error("❌ Create destination error:", error);
      res.status(500).json({ success: false, message: "Server error" });
    }
  }
);

// @route   PUT /api/discover-destinations/:id/status
router.put("/:id/status", protect, authorize("Admin"), async (req, res) => {
  try {
    const { is_active } = req.body;

    if (typeof is_active !== "boolean") {
      return res.status(400).json({
        success: false,
        message: "is_active must be a boolean",
      });
    }

    const updated = await DiscoverDestination.findByIdAndUpdate(
      req.params.id,
      { is_active },
      { new: true, runValidators: true }
    );

    if (!updated) {
      return res.status(404).json({
        success: false,
        message: "Destination not found",
      });
    }

    res.json({
      success: true,
      message: "Destination status updated",
      data: updated,
    });
  } catch (error) {
    console.error("❌ Update destination status error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});


// @route   PUT /api/discover-destinations/:id
router.put(
  "/:id",
  protect,
  authorize("Admin"),
  validateDiscoverDestination,
  handleValidationErrors,
  async (req, res) => {
    try {
      const updated = await DiscoverDestination.findByIdAndUpdate(
        req.params.id,
        req.body,
        { new: true, runValidators: true }
      );
      if (!updated) {
        return res
          .status(404)
          .json({ success: false, message: "Destination not found" });
      }
      res.json({
        success: true,
        message: "Destination updated",
        data: updated,
      });
    } catch (error) {
      console.error("❌ Update destination error:", error);
      res.status(500).json({ success: false, message: "Server error" });
    }
  }
);

// @route   POST /api/discover-destinations/bulk-delete
router.post("/bulk-delete", protect, authorize("Admin"), async (req, res) => {
  const { ids } = req.body;

  if (!Array.isArray(ids) || ids.length === 0) {
    return res
      .status(400)
      .json({ success: false, message: "No IDs provided" });
  }

  try {
    const result = await DiscoverDestination.deleteMany({ _id: { $in: ids } });
    res.json({
      success: true,
      message: `${result.deletedCount} destinations deleted.`,
    });
  } catch (error) {
    console.error("❌ Bulk delete error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// @route   DELETE /api/discover-destinations/:id
router.delete("/:id", protect, authorize("Admin"), async (req, res) => {
  try {
    const destination = await DiscoverDestination.findByIdAndDelete(
      req.params.id
    );
    if (!destination) {
      return res
        .status(404)
        .json({ success: false, message: "Destination not found" });
    }
    res.json({ success: true, message: "Destination deleted" });
  } catch (error) {
    console.error("❌ Delete destination error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

module.exports = router;
