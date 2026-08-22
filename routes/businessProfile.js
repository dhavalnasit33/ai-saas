const express = require("express");
const router = express.Router();
const BusinessProfile = require("../models/BusinessProfile");
const { protect } = require("../middleware/auth");
const { validateBusinessProfile, handleValidationErrors } = require("../middleware/validation");

// @route   GET /api/business-profile
// @desc    Get current user's business profile
// @access  Private
router.get("/", protect, async (req, res) => {
    try {
        let profile = await BusinessProfile.findOne({ user: req.user.id });

        // If no profile, return empty data object so frontend doesn't crash
        if (!profile) {
            return res.json({ success: true, data: {} });
        }

        res.json({ success: true, data: profile });
    } catch (err) {
        console.error("Get Business Profile Error:", err);
        res.status(500).json({ success: false, message: "Server Error" });
    }
});

// @route   POST /api/business-profile
// @desc    Create or Update business profile
// @access  Private
router.post(
    "/",
    protect,
    validateBusinessProfile,
    handleValidationErrors,
    async (req, res) => {
        try {
            // Force user ID to be the logged-in user
            const profileFields = { ...req.body, user: req.user.id };

            // findOneAndUpdate with upsert: true handles both Create and Update
            const profile = await BusinessProfile.findOneAndUpdate(
                { user: req.user.id },
                { $set: profileFields },
                { new: true, upsert: true, setDefaultsOnInsert: true }
            );

            res.json({ success: true, data: profile, message: "Profile saved successfully" });
        } catch (err) {
            console.error("Save Business Profile Error:", err);
            res.status(500).json({ success: false, message: "Server Error" });
        }
    }
);

module.exports = router;
