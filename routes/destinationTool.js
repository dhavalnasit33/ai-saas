// routes/destinationToolRoutes.js
const express = require("express");
const DestinationTool = require("../models/DestinationTool");
const { protect, authorize } = require("../middleware/auth");
const {
  validateDestinationTool,
  handleValidationErrors,
} = require("../middleware/validation");
const { upsertSeoRecord } = require("../utils/seoHelper");
const User = require("../models/User");

const router = express.Router();

/**
 * @route   GET /api/destination-tools
 * @desc    Get paginated & filtered destination tools
 */
router.get("/", protect, authorize("Admin"), async (req, res) => {
  try {
    const { search = "", page = 1, limit = 10 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const query = search
      ? {
        $or: [
          { title: { $regex: search, $options: "i" } },
          { description: { $regex: search, $options: "i" } },
        ],
      }
      : {};

    const total = await DestinationTool.countDocuments(query);

    const tools = await DestinationTool.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .lean();

    res.json({
      success: true,
      data: tools,
      pagination: {
        current: Number(page),
        pages: Math.ceil(total / limit),
        total,
      },
    });
  } catch (error) {
    console.error("❌ Error fetching destination tools:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

/**
 * @route   GET /api/destination-tools/seo-config/all
 * @desc    Get all SEO and image configuration data for all destination tools
 */
router.get("/seo-config/all", protect, async (req, res) => {
  try {
    const records = await DestinationTool.find().lean();

    if (!records || records.length === 0) {
      return res.status(404).json({
        success: false,
        message: `No destination tool records found`,
      });
    }

    // Transform the data to include only SEO config
    const seoConfigs = records.map((record) => ({
      _id: record._id,
      seo_keyphrase: record.seo_keyphrase,
      seo_title: record.seo_title,
      meta_description: record.meta_description,
      cover_image: record.cover_image,
      tool_cover_image: record.tool_cover_image,
      tab_normal_icon_image: record.tab_normal_icon_image,
      tab_active_icon_image: record.tab_active_icon_image,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    }));

    res.json({
      success: true,
      data: seoConfigs,
      count: seoConfigs.length,
      message: `All destination tool SEO configurations fetched successfully`,
    });
  } catch (error) {
    console.error(`❌ Error fetching all destination tool SEO configs:`, error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

/**
 * @route   GET /api/destination-tools/:id
 * @desc    Get destination tool by ID
 */
router.get("/:id", protect, authorize("Admin"), async (req, res) => {
  try {
    const tool = await DestinationTool.findById(req.params.id);
    if (!tool) {
      return res
        .status(404)
        .json({ success: false, message: "Destination tool not found" });
    }
    res.json({ success: true, data: tool });
  } catch (error) {
    console.error("❌ Error fetching destination tool:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// /**
//  * @route   GET /api/destination-tools/get/:slug
//  * @desc    Get destination tool by slug
//  */
// router.get("/get/:slug", protect, async (req, res) => {
//   try {
//     const tool = await DestinationTool.findOne({ slug: req.params.slug });

//     if (!tool) {
//       return res
//         .status(404)
//         .json({ success: false, message: "Destination tool not found" });
//     }

//     res.json({ success: true, data: tool });
//   } catch (error) {
//     console.error("❌ Error fetching destination tool:", error);
//     res.status(500).json({ success: false, message: "Server error" });
//   }
// });
/**
 * @route   GET /api/destination-tools/get/:slug
 * @desc    Get destination tool by slug (includes bookmarked flag)
 */
router.get("/get/:slug", protect, async (req, res) => {
  try {
    const tool = await DestinationTool.findOne({
      slug: req.params.slug,
    }).lean();

    if (!tool) {
      return res
        .status(404)
        .json({ success: false, message: "Destination tool not found" });
    }

    // ✅ Default bookmark flag
    let isBookmarked = false;

    // ✅ Check if user is logged in and has this tool bookmarked
    if (req.user && req.user.id) {
      try {
        const user = await User.findById(req.user.id).lean();
        const bookmarks = user?.bookmarks || [];

        isBookmarked = bookmarks.some(
          (b) =>
            b.itemId.toString() === tool._id.toString() &&
            b.modelName === "DestinationTool"
        );
      } catch (err) {
        console.warn("User lookup failed — defaulting to no bookmarks");
      }
    }

    // ✅ Include bookmarked flag in response
    const toolWithBookmark = { ...tool, bookmarked: isBookmarked };

    res.json({
      success: true,
      data: toolWithBookmark,
    });
  } catch (error) {
    console.error("❌ Error fetching destination tool by slug:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
});

/**
 * @route   POST /api/destination-tools
 * @desc    Create new destination tool + SEO record
 */
router.post(
  "/",
  protect,
  authorize("Admin"),
  validateDestinationTool,
  handleValidationErrors,
  async (req, res) => {
    try {
      // 1️⃣ Create destination tool
      const tool = await DestinationTool.create(req.body);

      // 2️⃣ Upsert SEO record linked to this tool
      if (
        req.body.seo_keyphrase ||
        req.body.seo_title ||
        req.body.meta_description ||
        req.body.cover_image
      ) {
        await upsertSeoRecord({
          refId: tool._id,
          modelName: "DestinationTool",
          seo: {
            seo_keyphrase: req.body.seo_keyphrase,
            seo_title: req.body.seo_title,
            meta_description: req.body.meta_description,
            cover_image: req.body.cover_image,
            slug: req.body.title,
          },
        });
      }

      res.status(201).json({
        success: true,
        message: "Destination tool created",
        data: tool,
      });
    } catch (error) {
      console.error("❌ Create destination tool error:", error);
      res.status(500).json({ success: false, message: "Server error" });
    }
  }
);

/**
 * @route   PUT /api/destination-tools/:id
 * @desc    Update destination tool + SEO record
 */
router.put(
  "/:id",
  protect,
  authorize("Admin"),
  validateDestinationTool,
  handleValidationErrors,
  async (req, res) => {
    try {
      // 1️⃣ Update destination tool
      const updated = await DestinationTool.findByIdAndUpdate(
        req.params.id,
        req.body,
        { new: true, runValidators: true }
      );

      if (!updated) {
        return res
          .status(404)
          .json({ success: false, message: "Destination tool not found" });
      }

      // 2️⃣ Upsert SEO record if SEO data provided
      if (
        req.body.seo_keyphrase ||
        req.body.seo_title ||
        req.body.meta_description ||
        req.body.cover_image
      ) {
        await upsertSeoRecord({
          refId: updated._id,
          modelName: "DestinationTool",
          seo: {
            seo_keyphrase: req.body.seo_keyphrase,
            seo_title: req.body.seo_title,
            meta_description: req.body.meta_description,
            cover_image: req.body.cover_image,
            slug: req.body.title,
          },
        });
      }

      res.json({
        success: true,
        message: "Destination tool updated",
        data: updated,
      });
    } catch (error) {
      console.error("❌ Update destination tool error:", error);
      res.status(500).json({ success: false, message: "Server error" });
    }
  }
);

/**
 * @route   POST /api/destination-tools/bulk-delete
 * @desc    Bulk delete destination tools
 */
router.post("/bulk-delete", protect, authorize("Admin"), async (req, res) => {
  const { ids } = req.body;

  if (!Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ success: false, message: "No IDs provided" });
  }

  try {
    const result = await DestinationTool.deleteMany({ _id: { $in: ids } });
    res.json({
      success: true,
      message: `${result.deletedCount} destination tools deleted.`,
    });
  } catch (error) {
    console.error("❌ Bulk delete error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

/**
 * @route   DELETE /api/destination-tools/:id
 * @desc    Delete destination tool by ID
 */
router.delete("/:id", protect, authorize("Admin"), async (req, res) => {
  try {
    const tool = await DestinationTool.findByIdAndDelete(req.params.id);
    if (!tool) {
      return res
        .status(404)
        .json({ success: false, message: "Destination tool not found" });
    }
    res.json({ success: true, message: "Destination tool deleted" });
  } catch (error) {
    console.error("❌ Delete destination tool error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

module.exports = router;
