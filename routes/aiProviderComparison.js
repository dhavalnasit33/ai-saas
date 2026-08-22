const express = require("express");
const AIProviderComparison = require("../models/AiComparison");
const { protect, authorize } = require("../middleware/auth");
const {
  validateAiComparison,
  handleValidationErrors,
} = require("../middleware/validation");
const mongoose = require("mongoose");
const AIProvider = require("../models/AIProvider");
const AIModel = require("../models/AIModel");
const router = express.Router();

// :white_check_mark: FIRST: exact route for all models
router.get("/:id/comparisons", async (req, res) => {
  try {
    const modelId = req.params.id;
    // Get type from query (e.g., ?type=image or ?type=chat)
    const { type } = req.query;

    // 1️⃣ Get main model (provider)
    const model = await AIProvider.findById(modelId).select("_id name title");
    if (!model) {
      return res.status(404).json({ message: "Model not found" });
    }

    // 2️⃣ Build Query
    // Base condition: match modelId or firstModel
    let queryConditions = {
      $or: [{ modelId: modelId }, { firstModel: modelId }],
    };

    // Filter by type if provided
    if (type) {
      if (type === "text") {
        // If searching for 'chat', find docs where type is 'chat' OR type does not exist
        queryConditions = {
          ...queryConditions,
          $and: [
            {
              $or: [
                { type: "text" },
                { type: { $exists: false } },
                { type: null },
              ],
            },
          ],
        };
      } else {
        // For 'image' or others, look for exact match
        queryConditions.type = type;
      }
    }

    // 3️⃣ Get comparisons
    const comparisons = await AIProviderComparison.find(queryConditions)
      .populate({
        path: "modelId",
        select: "name title",
      })
      .populate({
        path: "firstModel",
        select: "name title description image",
        populate: {
          path: "_id",
        },
      })
      .populate({
        path: "secondModel",
        select: "name title description image",
      })
      .lean();

    // 4️⃣ Attach AIModel.model to each firstModel / secondModel
    for (const cmp of comparisons) {
      // Get AIModel for firstModel
      if (cmp.firstModel?._id) {
        const aiModelDoc = await AIModel.findOne({
          ai_provider_id: cmp.firstModel._id,
          is_default: true,
        })
          .sort({ createdAt: 1 })
          .select("model");
        if (aiModelDoc) {
          cmp.firstModel.modelName = aiModelDoc.model;
        }
      }
      // Get AIModel for secondModel
      if (cmp.secondModel?._id) {
        const aiModelDoc = await AIModel.findOne({
          ai_provider_id: cmp.secondModel._id,
          is_default: true,
        })
          .sort({ createdAt: 1 })
          .select("model");

        if (aiModelDoc) {
          cmp.secondModel.modelName = aiModelDoc.model;
        }
      }
    }

    res.status(200).json({ success: true, model, comparisons });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// :white_check_mark: Route for slug-based fetch
router.get("/slug/:slug", async (req, res) => {
  try {
    const { slug } = req.params;

    // 1️⃣ Get comparison by slug
    const comparison = await AIProviderComparison.findOne({ slug })
      .populate({
        path: "modelId",
        select: "_id name title description image",
      })
      .populate({
        path: "firstModel",
        select: "_id name title description image",
      })
      .populate({
        path: "secondModel",
        select: "_id name title description image",
      })
      .lean();

    if (!comparison) {
      return res
        .status(404)
        .json({ success: false, message: "Comparison not found" });
    }

    // 2️⃣ Attach AIModel for firstModel
    if (comparison.firstModel?._id) {
      const aiModelDoc = await AIModel.findOne({
        ai_provider_id: comparison.firstModel._id,
        is_default: true,
      })
        .sort({ createdAt: 1 })
        .select("_id model");

      if (aiModelDoc) {
        // Replace _id with AIModel's id and keep providerId separately if needed
        comparison.firstModel.modelId = aiModelDoc._id;
        comparison.firstModel.modelName = aiModelDoc.model;
      }
    }

    // 3️⃣ Attach AIModel for secondModel
    if (comparison.secondModel?._id) {
      const aiModelDoc = await AIModel.findOne({
        ai_provider_id: comparison.secondModel._id,
        is_default: true,
      })
        .sort({ createdAt: 1 })
        .select("_id model");

      if (aiModelDoc) {
        comparison.secondModel.modelId = aiModelDoc._id;
        comparison.secondModel.modelName = aiModelDoc.model;
      }
    }

    res.status(200).json({ success: true, comparison });
  } catch (error) {
    console.error("Error fetching comparison by slug:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// @desc    Get AI comparisons (admin: all, others: own)
// @route   GET /api/ai-comparison
// @access  Private
router.get("/", protect, authorize("admin"), async (req, res) => {
  try {
    const { page = 1, limit = 10, filterModelTitle } = req.query;
    const isAdmin = req.user?.roles?.includes("Admin");

    let query = {};

    if (!isAdmin) {
      query.created_by_user_id = req.user.id;
    }

    if (filterModelTitle && mongoose.Types.ObjectId.isValid(filterModelTitle)) {
      query.firstModel = new mongoose.Types.ObjectId(filterModelTitle);
    }

    const skip = (page - 1) * limit;

    const [comparisons, total] = await Promise.all([
      AIProviderComparison.find(query)
        .populate("modelId", "display_name title name")
        .populate("firstModel", "display_name title name")
        .populate("secondModel", "display_name title name")
        .populate("created_by_user_id", "name")
        .sort({ createdAt: -1 })
        .skip(Number(skip))
        .limit(Number(limit))
        .lean(),
      AIProviderComparison.countDocuments(query),
    ]);

    res.status(200).json({
      success: true,
      message: "Comparisons fetched successfully",
      data: comparisons,
      pagination: {
        current: Number(page),
        pages: Math.ceil(total / limit),
        total,
      },
    });
  } catch (error) {
    console.error("Error fetching comparisons:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
});

// @desc    get groped ai provider comarison
// @route   GET /api/ai-comparison/grouped
// @access  Private

router.get("/grouped", protect, authorize("admin"), async (req, res) => {
  try {
    const comparisons = await AIProviderComparison.find()
      .populate("firstModel", "name title display_name ")
      .populate("secondModel", "name title display_name ");

    const grouped = {};

    comparisons.forEach(({ firstModel, secondModel }) => {
      const firstName = firstModel.title.toLowerCase();
      const secondName = secondModel.title.toLowerCase();

      if (!grouped[firstName]) {
        grouped[firstName] = new Set();
      }

      grouped[firstName].add(secondName);
    });

    const result = Object.entries(grouped).map(([firstModel, secondSet]) => ({
      firstModel,
      secondModels: Array.from(secondSet),
    }));

    res.json({ success: true, data: result });
  } catch (error) {
    console.error("Error grouping comparisons:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
});

// @desc    get ai provider comparison by id
// @route   GET /api/ai-comparison/:id
// @access  Private

router.get("/:id", protect, authorize("admin"), async (req, res) => {
  const id = req.params.id;
  try {
    const checkAIProviderComparisonCheck = await AIProviderComparison.findById(
      id,
    )
      .populate("modelId", "display_name title name")
      .populate("firstModel", "display_name title name")
      .populate("secondModel", "display_name title name");
    if (!checkAIProviderComparisonCheck) {
      return res.status(404).json({
        success: false,
        message: "Comparison not found",
      });
    }
    res.status(200).json({
      success: true,
      data: checkAIProviderComparisonCheck,
    });
  } catch (error) {
    console.error("Error to get comparison by id:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
});

// @desc    Create AI provider comparison
// @route   POST /api/ai-comparison
// @access  Private (Admin)
router.post(
  "/",
  protect,
  authorize("admin"),
  validateAiComparison,
  handleValidationErrors,
  async (req, res) => {
    try {
      const {
        modelId,
        firstModel,
        secondModel,
        keyPhrase,
        title,
        description,
        short_description,
        metaDescription,
        coverImage,
        slug,
        type,
        categories, // ✅ ADD THIS
        tags, // ✅ ADD THIS
      } = req.body;

      // Check if same comparison already exists
      const duplicate = await AIProviderComparison.findOne({
        firstModel,
        secondModel,
      });

      if (!slug) {
        return res.status(400).json({
          success: false,
          message: "Slug is required.",
        });
      }

      const exists = await AIProviderComparison.findOne({ slug });
      if (exists) {
        return res.status(400).json({
          success: false,
          message: "Slug already exists.",
        });
      }

      if (duplicate) {
        return res.status(400).json({
          success: false,
          message: "This Ai comparison between the same models already exists.",
        });
      }

      // Create new AIProviderComparison document
      const comparison = await AIProviderComparison.create({
        modelId,
        firstModel,
        secondModel,
        keyPhrase,
        title,
        short_description,
        description,
        metaDescription,
        slug,
        coverImage,
        type: type || "text",
        categories: categories || [], // ✅ ADD THIS
        tags: tags || [], // 2. Save type (default to 'text' if missing)
        created_by_user_id: req.user.id,
      });

      res.status(201).json({
        success: true,
        message: "Comparison created successfully.",
        data: comparison,
      });
    } catch (error) {
      console.error("Error creating comparison:", error);
      res.status(500).json({
        success: false,
        message: "Server error",
      });
    }
  },
);

// @desc    Update AI provider comparison
// @route   PUT /api/ai-comparison/:id
// @access  Private (Admin)
router.put(
  "/:id",
  protect,
  authorize("admin"),
  validateAiComparison,
  handleValidationErrors,
  async (req, res) => {
    try {
      const id = req.params.id;
      const {
        modelId,
        firstModel,
        secondModel,
        keyPhrase,
        title,
        short_description,
        description,
        metaDescription,
        slug,
        coverImage,
        is_active,
        type, // 1. Add type here
        categories, // ✅ ADD THIS
        tags, // ✅ ADD THIS
      } = req.body;

      const comparison = await AIProviderComparison.findById(id);
      if (!comparison) {
        return res.status(404).json({
          success: false,
          message: "Comparison not found.",
        });
      }

      // Prevent slug duplication (if changed)
      if (slug && slug !== comparison.slug) {
        const existingSlug = await AIProviderComparison.findOne({ slug });
        if (existingSlug && existingSlug._id.toString() !== id) {
          return res.status(400).json({
            success: false,
            message: "Slug already exists.",
          });
        }
      }

      // Prevent exact same comparison if it's not the same doc
      const existingDuplicate = await AIProviderComparison.findOne({
        _id: { $ne: id },
        firstModel,
        secondModel,
      });

      if (existingDuplicate) {
        return res.status(400).json({
          success: false,
          message: "This comparison already exists between these models.",
        });
      }

      // Update fields
      comparison.modelId = modelId;
      comparison.firstModel = firstModel;
      comparison.secondModel = secondModel;
      comparison.keyPhrase = keyPhrase;
      comparison.title = title;
      comparison.short_description = short_description;
      comparison.description = description;
      comparison.metaDescription = metaDescription;
      comparison.slug = slug;
      comparison.coverImage = coverImage;
      comparison.is_active = is_active;
      comparison.type = type || "text"; // 2. Add type update here (default to text if missing)
      comparison.categories = categories || [];
      comparison.tags = tags || [];
      await comparison.save();

      res.json({
        success: true,
        message: "Comparison updated successfully.",
        data: comparison,
      });
    } catch (error) {
      console.error("Error updating comparison:", error);
      res.status(500).json({
        success: false,
        message: "Server error",
      });
    }
  },
);

// @desc    Toggle AI provider comparison
// @route   PATCH /api/ai-comparison/:id/toggle
// @access  Private (Admin)

router.patch("/:id/toggle", protect, authorize("admin"), async (req, res) => {
  try {
    const id = req.params.id;
    const aiProviderComparisonCheck = await AIProviderComparison.findById(id)
      .populate("firstModel", "display_name title name")
      .populate("secondModel", "display_name title name");
    if (!aiProviderComparisonCheck) {
      return res.status(404).json({
        success: false,
        message: "AI provider comparison not found.",
      });
    }

    aiProviderComparisonCheck.is_active = !aiProviderComparisonCheck.is_active;
    await aiProviderComparisonCheck.save();

    res.json({
      success: true,
      message: `AI provider comparison ${aiProviderComparisonCheck.firstModel.display_name} vs ${aiProviderComparisonCheck.secondModel.display_name} status updated successfully.`,
    });
  } catch (error) {
    console.error("Error toggling AI provider comparison:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
});

// @desc    Delete AI provider comparison
// @route   DELETE /api/ai-comparison/:id
// @access  Private (Admin)

router.delete("/:id", protect, authorize("admin"), async (req, res) => {
  const id = req.params.id;
  try {
    const checkAIProviderComparison = await AIProviderComparison.findById(id);

    if (!checkAIProviderComparison) {
      return res.status(404).json({
        success: false,
        message: "Comparison not found.",
      });
    }

    await AIProviderComparison.findByIdAndDelete(id);

    res.json({
      success: true,
      message: "AI provider Comparison model deleted successfully.",
    });
  } catch (error) {
    console.error("Delete AI provider comparison error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
});

module.exports = router;
