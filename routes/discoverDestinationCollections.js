// routes/destinationCollections.js
const express = require("express");
const DestinationCollection = require("../models/DiscoverDestinationCollection");
const { protect, authorize } = require("../middleware/auth");
const slugify = require("slugify");
const { validateDiscoverDestinationCollection, handleValidationErrors } = require("../middleware/validation");
const SavedDestination = require("../models/SavedDestination");

const router = express.Router();

// @route   GET /api/destination-collections
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
              { slug: { $regex: search, $options: "i" } },
            ],
          }
        : {}),
      ...(typeof is_active !== "undefined"
        ? { is_active: is_active === "true" }
        : {}),
    };

    const total = await DestinationCollection.countDocuments(query);

    const collections = await DestinationCollection.find(query)
      .populate("discover_destinations") // get full destination data
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .lean();

    res.json({
      success: true,
      data: collections,
      pagination: {
        current: Number(page),
        pages: Math.ceil(total / limit),
        total,
      },
    });
  } catch (error) {
    console.error("❌ Error fetching destination collections:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// @route   GET /api/destination-collections/:id
router.get("/:id", protect, async (req, res) => {
  try {
    const collection = await DestinationCollection.findById(req.params.id)
      .populate("discover_destinations");
    if (!collection) {
      return res.status(404).json({ success: false, message: "Collection not found" });
    }
    res.json({ success: true, data: collection });
  } catch (error) {
    console.error("❌ Error fetching collection:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// @route   GET /api/destination-collections/by-discover/:discoverId
// @desc    Get collections containing a specific discover destination ID 
//          OR search across all collections if search term provided
router.get("/by-discover/:discoverId", protect, async (req, res) => {
  try {
    const { discoverId } = req.params;
    const { search } = req.query;
     const userId = req.user ? req.user.id : null;

    let filter = { is_active: true };

    if (search && search.trim() !== "") {
      // 🔎 if search provided → search ALL collections
      const regex = new RegExp(search, "i");
      filter.$or = [
        { title: regex },
        { description: regex },
      ];
    } else {
      // ✅ no search → restrict to this discoverId
      filter.discover_destinations = discoverId;
    }

    const collections = await DestinationCollection.find(filter)
      .populate("discover_destinations")
      .sort({ createdAt: -1 })
      .lean();

    const collectionsWithSavedStatus = await Promise.all(
      collections.map(async (collection) => {
        const saved = await SavedDestination.findOne({
          user: userId,
          destination: collection._id,
          is_saved: true,
        }).lean();

        return {
          ...collection,
          is_saved: !!saved,
        };
      })
    );

    res.json({
      success: true,
      data: collectionsWithSavedStatus,
    });
  } catch (error) {
    console.error("❌ Error fetching collections by discover ID:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// @route   POST /api/destination-collections
router.post(
  "/",
  protect,
  authorize("Admin"),
  validateDiscoverDestinationCollection,
  handleValidationErrors,
  async (req, res) => {
    try {
      const { title } = req.body;
      const slug = slugify(title, { lower: true, strict: true });

      const collection = await DestinationCollection.create({
        ...req.body,
        slug,
      });
      res.status(201).json({
        success: true,
        message: "Collection created",
        data: collection,
      });
    } catch (error) {
      console.error("❌ Create collection error:", error);
      res.status(500).json({ success: false, message: "Server error" });
    }
  }
);

// @route   PUT /api/destination-collections/:id
router.put(
  "/:id",
  protect,
  authorize("Admin"),
  validateDiscoverDestinationCollection,
  handleValidationErrors,
  async (req, res) => {
    try {
      const { title } = req.body;
      if (title) {
        req.body.slug = slugify(title, { lower: true, strict: true });
      }

      const updated = await DestinationCollection.findByIdAndUpdate(
        req.params.id,
        req.body,
        { new: true, runValidators: true }
      ).populate("discover_destinations");

      if (!updated) {
        return res.status(404).json({ success: false, message: "Collection not found" });
      }
      res.json({ success: true, message: "Collection updated", data: updated });
    } catch (error) {
      console.error("❌ Update collection error:", error);
      res.status(500).json({ success: false, message: "Server error" });
    }
  }
);

// @route   POST /api/destination-collections/bulk-delete
router.post("/bulk-delete", protect, authorize("Admin"), async (req, res) => {
  const { ids } = req.body;

  if (!Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ success: false, message: "No IDs provided" });
  }

  try {
    const result = await DestinationCollection.deleteMany({ _id: { $in: ids } });

    // Cascade delete saved destinations linked to these collections
    await SavedDestination.deleteMany({ destination: { $in: ids } });

    res.json({
      success: true,
      message: `${result.deletedCount} collections and related saved destinations deleted.`,
    });
  } catch (error) {
    console.error("❌ Bulk delete error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// @route   DELETE /api/destination-collections/:id
router.delete("/:id", protect, authorize("Admin"), async (req, res) => {
  try {
    const collection = await DestinationCollection.findByIdAndDelete(
      req.params.id
    );

    if (!collection) {
      return res
        .status(404)
        .json({ success: false, message: "Collection not found" });
    }

    // Cascade delete saved destinations linked to this collection
    await SavedDestination.deleteMany({ destination: req.params.id });

    res.json({
      success: true,
      message: "Collection and related saved destinations deleted",
    });
  } catch (error) {
    console.error("❌ Delete collection error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// @route   PATCH /api/destination-collections/:id/status
router.patch("/:id/status", protect, authorize("Admin"), async (req, res) => {
  try {
    const { is_active } = req.body;

    if (typeof is_active !== "boolean") {
      return res
        .status(400)
        .json({ success: false, message: "`is_active` must be true or false" });
    }

    const updated = await DestinationCollection.findByIdAndUpdate(
      req.params.id,
      { is_active },
      { new: true, runValidators: true }
    );

    if (!updated) {
      return res.status(404).json({ success: false, message: "Collection not found" });
    }

    res.json({
      success: true,
      message: `Collection status updated to ${is_active ? "active" : "inactive"}`,
      data: updated,
    });
  } catch (error) {
    console.error("❌ Update status error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

module.exports = router;
