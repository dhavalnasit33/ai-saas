const express = require("express");
const ResumeGenerator = require("../models/ResumeGenerator");
const { protect, authorize } = require("../middleware/auth");
const { validateResumeGenerator, handleValidationErrors } = require("../middleware/validation");

const router = express.Router();

/**
 * @route   GET /api/resume-generators
 * @desc    Get all resume generator records
 */
router.get("/", protect, async (req, res) => {
  try {
    const records = await ResumeGenerator.find().lean();

    if (!records || records.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: "No records found" });
    }

    res.json({
      success: true,
      data: records,
    });
  } catch (error) {
    console.error("❌ Error fetching resume generator records:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

/**
 * @route   GET /api/resume-generators/:id
 * @desc    Get resume generator record by ID
 */
router.get("/:id", protect, authorize("Admin"), async (req, res) => {
  try {
    const record = await ResumeGenerator.findById(req.params.id);
    if (!record)
      return res
        .status(404)
        .json({ success: false, message: "Record not found" });

    res.json({ success: true, data: record });
  } catch (error) {
    console.error("❌ Error fetching resume generator record:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

/**
 * @route   POST /api/resume-generators
 * @desc    Create a new resume generator record
 */
router.post(
  "/",
  protect,
  authorize("Admin"),
  validateResumeGenerator,
  handleValidationErrors,
  async (req, res) => {
    try {
      // Create resume generator
      const record = await ResumeGenerator.create(req.body);

      // ✅ Upsert SEO record
      const { upsertSeoRecord } = require("../utils/seoHelper");
      await upsertSeoRecord({
        refId: record._id,
        modelName: "resume-generator", // or dynamic slug if you want
        seo: {
          seo_keyphrase: record.seo_keyphrase,
          seo_title: record.seo_title,
          meta_description: record.meta_description,
          cover_image: record.cover_image,
        },
      });

      res.status(201).json({
        success: true,
        message: "Resume generator created",
        data: record,
      });
    } catch (error) {
      console.error("❌ Create resume generator error:", error);
      res.status(500).json({ success: false, message: "Server error" });
    }
  }
);

/**
 * @route   PUT /api/resume-generators/:id
 * @desc    Update resume generator by ID
 */
router.put(
  "/:id",
  protect,
  authorize("Admin"),
  validateResumeGenerator,
  handleValidationErrors,
  async (req, res) => {
    try {
      // Update resume generator
      const updated = await ResumeGenerator.findByIdAndUpdate(
        req.params.id,
        req.body,
        { new: true, runValidators: true }
      );

      if (!updated)
        return res.status(404).json({ success: false, message: "Record not found" });

      // ✅ Upsert SEO record
      const { upsertSeoRecord } = require("../utils/seoHelper");
      await upsertSeoRecord({
        refId: updated._id,
        modelName: "resume-generator", // or dynamic slug
        seo: {
          seo_keyphrase: updated.seo_keyphrase,
          seo_title: updated.seo_title,
          meta_description: updated.meta_description,
          cover_image: updated.cover_image,
        },
      });

      res.json({
        success: true,
        message: "Resume generator updated",
        data: updated,
      });
    } catch (error) {
      console.error("❌ Update resume generator error:", error);
      res.status(500).json({ success: false, message: "Server error" });
    }
  }
);
module.exports = router;
