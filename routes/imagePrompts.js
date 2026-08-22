const express = require("express");
const router = express.Router();
const ImagePrompt = require("../models/ImagePrompt");
const { protect, authorize } = require("../middleware/auth");
const { deleteLocalFile } = require("../utils/fileHelper");
const {
    validateImagePrompt,
    handleValidationErrors,
} = require("../middleware/validation");

// @desc    Get all image prompt data (Admin Paginated)
// @route   GET /api/image-prompts
router.get("/", protect, authorize("Admin"), async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const search = req.query.search || "";
        const styleId = req.query.style;

        let query = {};

        // Search in image_prompt text
        if (search) {
            query.image_prompt = { $regex: search, $options: "i" };
        }

        if (styleId) {
            query.style = styleId;
        }

        const total = await ImagePrompt.countDocuments(query);
        const prompts = await ImagePrompt.find(query)
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

// // @desc    Get all active image prompts (Guest + Logged-in List)
// // @route   GET /api/image-prompts/list
// router.get("/list", async (req, res) => {
//     try {
//         const { style, search } = req.query;

//         // 1️⃣ Base query: only active prompts
//         let query = { is_active: true };

//         if (style && style !== "") {
//             query.style = style;
//         }

//         // 2️⃣ Search in prompt text
//         if (search && search.trim() !== "") {
//             query.image_prompt = { $regex: search, $options: "i" };
//         }

//         // 3️⃣ Fetch prompts
//         const prompts = await ImagePrompt.find(query)
//             .populate("style", "name")
//             .sort({ createdAt: -1 })
//             .lean();

//         res.json({
//             success: true,
//             count: prompts.length,
//             data: prompts
//         });
//     } catch (err) {
//         console.error("Image Prompt List API Error:", err);
//         res.status(500).json({
//             success: false,
//             message: "Server Error",
//         });
//     }
// });


// @desc    Get all active image prompts with populated style
// @route   GET /api/image-prompts/list
router.get("/list", async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const style = req.query.style;

    // 1️⃣ Base query: only active prompts
    let query = { is_active: true };

    // 2️⃣ Optional style filter
    if (style && style !== "") {
      query.style = style;
    }

    // 3️⃣ Total count (for pagination)
    const total = await ImagePrompt.countDocuments(query);

    // 4️⃣ Fetch paginated data
    const prompts = await ImagePrompt.find(query)
      .populate("style", "name")
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
    console.error("Image Prompt List API Error:", err);
    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
});


// @desc    Get single image prompt data
router.get("/:id", async (req, res) => {
    try {
        const prompt = await ImagePrompt.findById(req.params.id).populate("style");
        if (!prompt) {
            return res
                .status(404)
                .json({ success: false, message: "Image prompt not found" });
        }
        res.json({ success: true, data: prompt });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// @desc    Create new image prompt
router.post(
    "/",
    protect,
    authorize("Admin"),
    validateImagePrompt,
    handleValidationErrors,
    async (req, res) => {
        try {
            const prompt = await ImagePrompt.create(req.body);
            res.status(201).json({ success: true, data: prompt });
        } catch (err) {
            res.status(400).json({ success: false, message: err.message });
        }
    }
);

// @desc    Update image prompt
router.put(
    "/:id",
    protect,
    authorize("Admin"),
    validateImagePrompt,
    handleValidationErrors,
    async (req, res) => {
        try {
            const prompt = await ImagePrompt.findByIdAndUpdate(
                req.params.id,
                req.body,
                {
                    new: true,
                    runValidators: true,
                }
            );

            if (!prompt) {
                return res
                    .status(404)
                    .json({ success: false, message: "Image prompt not found" });
            }

            res.json({ success: true, data: prompt });
        } catch (err) {
            res.status(400).json({ success: false, message: err.message });
        }
    }
);

// @desc    Delete single image prompt
router.delete("/:id", protect, authorize("Admin"), async (req, res) => {
    try {
        const prompt = await ImagePrompt.findById(req.params.id);
        if (!prompt) {
            return res
                .status(404)
                .json({ success: false, message: "Image prompt not found" });
        }

        // Delete local file
        deleteLocalFile(prompt.image);

        await prompt.deleteOne();
        res.json({ success: true, message: "Image prompt deleted successfully" });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// @desc    Bulk Delete image prompts
router.post("/bulk-delete", protect, authorize("Admin"), async (req, res) => {
    try {
        const { ids } = req.body;
        if (!ids || !Array.isArray(ids) || ids.length === 0) {
            return res.status(400).json({ success: false, message: "No IDs provided" });
        }

        // Find prompts to delete files
        const prompts = await ImagePrompt.find({ _id: { $in: ids } });
        for (const prompt of prompts) {
            deleteLocalFile(prompt.image);
        }

        await ImagePrompt.deleteMany({ _id: { $in: ids } });
        res.json({ success: true, message: "Image prompts deleted successfully" });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// @desc    Toggle Active Status
router.patch("/:id/toggle", protect, authorize("Admin"), async (req, res) => {
    try {
        const prompt = await ImagePrompt.findById(req.params.id);
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