const express = require("express");
const mongoose = require("mongoose");
const LeadMagnet = require("../models/LeadMagnet");
const HomeToolTag = require("../models/HomeToolTag");
const { protect, authorize } = require("../middleware/auth");
const {
  modelNameToSlugMap,
  modelNameToTitleMap,
  formatTitle,
} = require("../utils/seoHelper");
const slugify = require("slugify");
const {
  validateLeadMagnet,
  handleValidationErrors,
} = require("../middleware/validation");

const router = express.Router();

/**
 * Helper to populate assigned tools from various models
 */
async function populateAssignedTools(tools) {
  if (!tools || tools.length === 0) return [];

  const populatedTools = await Promise.all(
    tools.map(async (tool) => {
      try {
        const Model = mongoose.model(tool.modelName);
        const item = await Model.findById(tool.itemId).lean();
        if (item) {
          // Enrich tags with names if they exist
          if (item.tags && Array.isArray(item.tags) && item.tags.length > 0) {
            try {
              const tagDocs = await HomeToolTag.find({
                _id: { $in: item.tags },
              })
                .select("name")
                .lean();

              const tagMap = tagDocs.reduce((acc, t) => {
                acc[t._id.toString()] = t.name;
                return acc;
              }, {});

              item.tags = item.tags.map((tid) => ({
                _id: tid,
                name: tagMap[tid.toString()] || "Unknown Tag",
              }));
            } catch (tagErr) {
              console.error("Error populating tags for tool:", tagErr);
            }
          }

          // Generate title if missing
          const finalTitle =
            item.title ||
            item.name ||
            item.display_name ||
            modelNameToTitleMap[tool.modelName] ||
            formatTitle(tool.modelName);

          // Ensure slug is present and consistent
          // Priority: modelNameToSlugMap -> item.slug -> slugified title
          const finalSlug =
            modelNameToSlugMap[tool.modelName] ||
            item.slug ||
            slugify(finalTitle, {
              lower: true,
              strict: true,
            });

          return {
            ...item,
            title: finalTitle,
            slug: finalSlug,
            itemId: tool.itemId,
            modelName: tool.modelName,
          };
        }
        return null;
      } catch (err) {
        console.error(
          `Error populating tool ${tool.itemId} from ${tool.modelName}:`,
          err,
        );
        return null;
      }
    }),
  );

  return populatedTools.filter(Boolean);
}

// ==========================
// GET /api/lead-magnets
// Get all Lead Magnets
// ==========================
// ==========================
// GET /api/lead-magnets
// Get all Lead Magnets
// ==========================
router.get("/", protect, authorize("Admin"), async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search || "";
    const type = req.query.type || "standard";

    let query = {};
    if (type === "standard") {
      query.$or = [{ type: "standard" }, { type: { $exists: false } }];
    } else {
      query.type = type;
    }

    if (search) {
      const searchOr = [
        { title: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
      ];
      if (query.$or) {
        query = {
          $and: [
            { $or: query.$or },
            { $or: searchOr }
          ]
        };
      } else {
        query.$or = searchOr;
      }
    }

    const total = await LeadMagnet.countDocuments(query);
    // const leadMagnets = await LeadMagnet.find().sort({ createdAt: -1 });
    const leadMagnets = await LeadMagnet.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    res.status(200).json({
      success: true,
      data: leadMagnets,
      pagination: {
        current: page,
        page: Math.ceil(total / limit),
        total,
      },
    });
  } catch (error) {
    console.error("Error fetching Lead Magnets:", error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
});

// ==========================
// GET /api/lead-magnets/all/active
// Get all active Lead Magnets (Public)
// ==========================
router.get("/all/active", async (req, res) => {
  try {
    const { category, search, type } = req.query;
    let query = { status: "published" };

    if (category) {
      query.category_id = category;
    }

    const filterType = type || (!category ? "standard" : null);
    const conditions = [];

    if (filterType) {
      if (filterType === "standard") {
        conditions.push({
          $or: [{ type: "standard" }, { type: { $exists: false } }]
        });
      } else {
        conditions.push({ type: filterType });
      }
    }

    if (search) {
      conditions.push({
        $or: [
          { title: { $regex: search, $options: "i" } },
          { description: { $regex: search, $options: "i" } },
          { mini_description: { $regex: search, $options: "i" } },
        ]
      });
    }

    if (conditions.length > 0) {
      query.$and = conditions;
    }

    const leadMagnets = await LeadMagnet.find(query)
      .sort({ createdAt: -1 })
      .populate("category_id", "name slug icon");

    res.status(200).json({
      success: true,
      data: leadMagnets,
    });
  } catch (error) {
    console.error("Error fetching active Lead Magnets:", error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
});

// ==========================
// GET /api/lead-magnets/slug/:slug
// Get Lead Magnet by Slug
// ==========================
router.get("/slug/:slug", async (req, res) => {
  try {
    const leadMagnet = await LeadMagnet.findOne({
      slug: req.params.slug,
    }).populate("category_id", "name slug").lean();

    if (!leadMagnet) {
      return res
        .status(404)
        .json({ success: false, message: "Lead Magnet not found" });
    }

    // Populate assigned tools
    leadMagnet.assigned_tools = await populateAssignedTools(
      leadMagnet.assigned_tools,
    );

    res.status(200).json({
      success: true,
      data: leadMagnet,
    });
  } catch (error) {
    console.error("Error fetching Lead Magnet by slug:", error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
});

// ==========================
// GET /api/lead-magnets/:id
// Get Lead Magnet by ID
// ==========================
router.get("/:id", protect, authorize("Admin"), async (req, res) => {
  try {
    const leadMagnet = await LeadMagnet.findById(req.params.id).lean();

    if (!leadMagnet) {
      return res
        .status(404)
        .json({ success: false, message: "Lead Magnet not found" });
    }

    // Populate assigned tools
    leadMagnet.assigned_tools = await populateAssignedTools(
      leadMagnet.assigned_tools,
    );

    res.status(200).json({
      success: true,
      data: leadMagnet,
    });
  } catch (error) {
    console.error("Error fetching Lead Magnet by ID:", error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
});

// ==========================
// POST /api/lead-magnets
// Create new Lead Magnet
// ==========================
router.post(
  "/",
  protect,
  authorize("Admin"),
  validateLeadMagnet,
  handleValidationErrors,
  async (req, res) => {
    try {
      req.body.slug = req.body.slug ? slugify(req.body.slug, {
        lower: true,
        strict: true,
      }) : slugify(req.body.title, {
        lower: true,
        strict: true,
      });

      // Check duplicate slug
      const existingLeadMagnet = await LeadMagnet.findOne({
        slug: req.body.slug,
      });

      if (existingLeadMagnet) {
        return res.status(400).json({
          success: false,
          message: "Slug already exists",
        });
      }

      // const leadMagnet = await LeadMagnet.create(req.body);
      // req.body.slug = slug;

      const leadMagnet = await LeadMagnet.create(req.body);

      res.status(201).json({
        success: true,
        data: leadMagnet,
      });
    } catch (error) {
      console.error("Error creating Lead Magnet:", error);
      if (error.name === "ValidationError") {
        const messages = Object.values(error.errors).map((val) => val.message);
        return res
          .status(400)
          .json({ success: false, message: messages.join(", ") });
      }
      if (error.code === 11000) {
        return res
          .status(400)
          .json({ success: false, message: "Slug must be unique" });
      }
      res.status(500).json({ success: false, message: "Server Error" });
    }
  },
);

// ==========================
// PUT /api/lead-magnets/:id
// Update Lead Magnet
// ==========================
router.put(
  "/:id",
  protect,
  authorize("Admin"),
  validateLeadMagnet,
  handleValidationErrors,
  async (req, res) => {
    try {
      // if (req.body.title) {
      //   req.body.slug = slugify(req.body.title, {
      //     lower: true,
      //     strict: true,
      //   });

      //   const existingLeadMagnet = await LeadMagnet.findOne({
      //     slug: req.body.slug,
      //     _id: { $ne: req.params.id },
      //   });

      //   if (existingLeadMagnet) {
      //     return res.status(400).json({
      //       success: false,
      //       message: "Lead Magnet title already exists",
      //     });
      //   }
      // }

      // Update slug only if title or slug is provided
      if (req.body.title || req.body.slug) {
        req.body.slug = req.body.slug
          ? slugify(req.body.slug, {
            lower: true,
            strict: true,
          })
          : slugify(req.body.title, {
            lower: true,
            strict: true,
          });

        // Check duplicate slug excluding current document
        const existingLeadMagnet = await LeadMagnet.findOne({
          slug: req.body.slug,
          _id: { $ne: req.params.id },
        });

        if (existingLeadMagnet) {
          return res.status(400).json({
            success: false,
            message: "Slug already exists",
          });
        }
      }


      const leadMagnet = await LeadMagnet.findByIdAndUpdate(
        req.params.id,
        req.body,
        {
          new: true,
          runValidators: true,
        },
      );

      if (!leadMagnet) {
        return res
          .status(404)
          .json({ success: false, message: "Lead Magnet not found" });
      }

      res.status(200).json({
        success: true,
        data: leadMagnet,
      });
    } catch (error) {
      console.error("Error updating Lead Magnet:", error);
      if (error.name === "ValidationError") {
        const messages = Object.values(error.errors).map((val) => val.message);
        return res
          .status(400)
          .json({ success: false, message: messages.join(", ") });
      }
      res.status(500).json({ success: false, message: "Server Error" });
    }
  },
);
// ==========================
// DELETE /api/lead-magnets/:id
// Delete Lead Magnet
// ==========================
router.delete("/:id", protect, authorize("Admin"), async (req, res) => {
  try {
    const leadMagnet = await LeadMagnet.findByIdAndDelete(req.params.id);

    if (!leadMagnet) {
      return res
        .status(404)
        .json({ success: false, message: "Lead Magnet not found" });
    }

    res.status(200).json({
      success: true,
      message: "Lead Magnet deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting Lead Magnet:", error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
});

// ==========================
// POST /api/lead-magnets/bulk-delete
// Bulk Delete Lead Magnets
// ==========================
router.post("/bulk-delete", protect, authorize("Admin"), async (req, res) => {
  try {
    const { ids } = req.body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid or empty IDs array" });
    }

    // Delete lead magnets
    const deleteResult = await LeadMagnet.deleteMany({ _id: { $in: ids } });

    if (deleteResult.deletedCount === 0) {
      return res.status(404).json({
        success: false,
        message: "No Lead Magnets found with the provided IDs",
      });
    }

    res.status(200).json({
      success: true,
      message: `Deleted ${deleteResult.deletedCount} Lead Magnet(s)`,
      deletedCount: deleteResult.deletedCount,
    });
  } catch (error) {
    console.error("Error deleting Lead Magnets:", error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
});

// toggle status  ["draft", "published"]

router.patch("/:id/toggle", protect, authorize("Admin"), async (req, res) => {
  try {
    const leadMagnet = await LeadMagnet.findById(req.params.id);
    if (!leadMagnet) {
      return res
        .status(404)
        .json({ success: false, message: "Lead Magnet not found" });
    }

    leadMagnet.status = leadMagnet.status === "draft" ? "published" : "draft";
    await leadMagnet.save();

    res.status(200).json({
      success: true,
      data: leadMagnet,
    });
  } catch (error) {
    console.error("Error toggling Lead Magnet status:", error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
});
module.exports = router;
