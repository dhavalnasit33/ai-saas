const express = require("express");
const BrandedVoice = require("../models/BrandedVoice");
const {
  validateBrandedVoice,
  handleValidationErrors,
} = require("../middleware/validation");
const { protect } = require("../middleware/auth");

const router = express.Router();

// @route   GET /api/brand-voice
// @desc    Get current user's branded voice (Single Object)
// @access  Private
router.get("/", protect, async (req, res) => {
  try {
    const userId = req.user.id;

    // if (req.user.plan === "basic") {
    //   return res.status(403).json({ success: false, message: "Upgrade plan to access Brand Voice" });
    // }

    // Find the single profile for this user
    const voice = await BrandedVoice.findOne({ user: userId });

    // If no voice exists, return empty data object (like Business Profile)
    if (!voice) {
      return res.json({ success: true, data: {} });
    }

    res.json({
      success: true,
      data: voice,
    });
  } catch (err) {
    console.error("Get BrandedVoice error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// @route   POST /api/brand-voice
// @desc    Create or Update Branded Voice (Upsert)
// @access  Private
router.post(
  "/",
  protect,
  validateBrandedVoice,
  handleValidationErrors,
  async (req, res) => {
    try {
      // if (req.user.plan === "basic") {
      //   return res.status(403).json({ success: false, message: "Upgrade plan to create a brand voice" });
      // }

      // Force user ID to be the logged-in user
      const voiceFields = { ...req.body, user: req.user.id };

      // Find and Update OR Insert (Upsert)
      // This replaces both the old POST (create) and PUT (update) logic
      const brand = await BrandedVoice.findOneAndUpdate(
        { user: req.user.id },
        { $set: voiceFields },
        { new: true, upsert: true, setDefaultsOnInsert: true },
      );

      res
        .status(200)
        .json({
          success: true,
          data: brand,
          message: "Brand Voice saved successfully",
        });
    } catch (err) {
      console.error("Save BrandedVoice error:", err);
      res.status(500).json({ success: false, message: "Server error" });
    }
  },
);

// Deprecated: DELETE route (Optional: keep if you want users to be able to reset)
router.delete("/:id", protect, async (req, res) => {
  try {
    // We strictly delete by User ID now to ensure they delete their own
    const brand = await BrandedVoice.findOneAndDelete({ user: req.user.id });

    if (!brand) {
      return res
        .status(404)
        .json({ success: false, message: "Brand Voice not found" });
    }

    res.json({ success: true, message: "Deleted successfully" });
  } catch (err) {
    console.error("Delete BrandedVoice error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

module.exports = router;

// const express = require("express");
// const BrandedVoice = require("../models/BrandedVoice");
// const { validateBrandedVoice, handleValidationErrors } = require("../middleware/validation");
// const { protect } = require("../middleware/auth");

// const router = express.Router();

// router.get("/", protect, async (req, res) => {
//   try {
//     const userId = req.user.id;

//     if (req.user.plan === "basic") {
//       return res.status(403).json({ success: false, message: "No Brand Voice Founded" });
//     }

//     const list = await BrandedVoice.find({ user: userId }).sort({ createdAt: -1 });

//     res.json({
//       success: true,
//       data: list,
//     });
//   } catch (err) {
//     console.error("Get BrandedVoice for logged-in user error:", err);
//     res.status(500).json({ success: false, message: "Server error" });
//   }
// });

// // CREATE branded voice
// router.post("/", protect, validateBrandedVoice, handleValidationErrors, async (req, res) => {
//   try {
//     console.log("Request body:", req.user);
//     if (req.user.plan === "basic") {
//       return res.status(403).json({ success: false, message: "Upgrade plan to create a brand voice" });
//     }
//     // Override user ID from logged-in user
//     const data = { ...req.body, user: req.user.id };

//     const brand = await BrandedVoice.create(data);
//     res.status(201).json({ success: true, data: brand });
//   } catch (err) {
//     console.error("Create BrandedVoice error:", err);
//     res.status(500).json({ success: false, message: "Server error" });
//   }
// });

// // UPDATE branded voice (own or admin)
// router.put("/:id", protect, validateBrandedVoice, handleValidationErrors, async (req, res) => {
//   try {
//     const brand = await BrandedVoice.findById(req.params.id);
//     if (!brand) {
//       return res.status(404).json({ success: false, message: "Brand Voice not found" });
//     }
//     // Check if user is owner or admin
//     if (brand.user.toString() !== req.user.id.toString()) {
//       return res.status(403).json({ success: false, message: "Not authorized to update this record" });
//     }

//     // Prevent user from changing the owner
//     const data = { ...req.body, user: brand.user };

//     const updated = await BrandedVoice.findByIdAndUpdate(req.params.id, data, { new: true });
//     res.json({ success: true, data: updated });
//   } catch (err) {
//     console.error("Update BrandedVoice error:", err);
//     res.status(500).json({ success: false, message: "Server error" });
//   }
// });

// // DELETE branded voice (own or admin)
// router.delete("/:id", protect, async (req, res) => {
//   try {
//     const brand = await BrandedVoice.findById(req.params.id);
//     if (!brand) {
//       return res.status(404).json({ success: false, message: "Entry not found" });
//     }

//     // Check if user is owner or admin
//     if (brand.user.toString() !== req.user.id.toString()) {
//       return res.status(403).json({ success: false, message: "Not authorized to delete this record" });
//     }

//     await brand.deleteOne();

//     res.json({ success: true, message: "Deleted successfully" });
//   } catch (err) {
//     console.error("Delete BrandedVoice error:", err);
//     res.status(500).json({ success: false, message: "Server error" });
//   }
// });

// module.exports = router;
