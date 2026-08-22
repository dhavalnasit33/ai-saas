const express = require("express");
const { protect, authorize } = require("../middleware/auth");
  const { upsertSeoRecord, modelNameToSlugMap } = require("../utils/seoHelper");
const User = require("../models/User");


function createCrudRoutes(Model, modelName, validateMiddleware = null) {
  const router = express.Router();

 // ✅ GET all (with optional pagination and bookmarked flag)
router.get("/", protect, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || null;
    const limit = parseInt(req.query.limit) || null;

    let records;
    const totalCount = await Model.countDocuments();

    // ✅ Pagination logic
    if (page && limit) {
      const skip = (page - 1) * limit;
      records = await Model.find().skip(skip).limit(limit).lean();
      console.log(
        `Fetched ${records.length} records (page ${page}, limit ${limit}) for model: ${modelName}`
      );
    } else {
      records = await Model.find().lean();
      console.log(`Fetched all ${records.length} records for model: ${modelName}`);
    }

    if (!records || records.length === 0) {
      return res.status(404).json({
        success: false,
        message: `No ${modelName} records found`,
      });
    }

    // ✅ Get user bookmarks (if logged in)
    let userBookmarks = [];
    if (req.user && req.user.id) {
      try {
        const user = await User.findById(req.user.id).lean();
        userBookmarks = user?.bookmarks || [];
      } catch (err) {
        console.warn("User lookup failed, defaulting to no bookmarks");
      }
    }

    // ✅ Add bookmarked flag
    records = records.map((item) => {
      const isBookmarked = userBookmarks.some(
        (b) =>
          b.itemId.toString() === item._id.toString() &&
          b.modelName === modelName
      );
      return { ...item, bookmarked: isBookmarked };
    });

    // ✅ Shuffle and sort suggested_topics for specific models
    if (
      [
        "Solutions",
        "Wellness",
        "Therapy",
        "Marketing",
        "FinancialAdvisor",
        "Investing",
        "SaveMoney",
        "DebtRelief",
        "InterviewPrep",
        "Research",
      ].includes(modelName)
    ) {
      records.forEach((r) => {
        if (r.suggested_topics?.length) {
          const stickyTopics = r.suggested_topics.filter((t) => t.sticky);
          const nonStickyTopics = r.suggested_topics.filter((t) => !t.sticky);
          nonStickyTopics.sort(() => Math.random() - 0.5);
          r.suggested_topics = [...stickyTopics, ...nonStickyTopics];
        }
      });

      console.log(
        `Sorted suggested_topics (sticky first, random others) for ${modelName}`
      );
    }

    // ✅ Send final response
    res.json({
      success: true,
      data: records,
      pagination:
        page && limit
          ? {
              total: totalCount,
              page,
              limit,
              totalPages: Math.ceil(totalCount / limit),
            }
          : null,
    });
  } catch (error) {
    console.error(`❌ Error fetching ${modelName}:`, error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

  // GET by ID
  router.get("/:id", protect, authorize("Admin"), async (req, res) => {
    try {
      const record = await Model.findById(req.params.id);
      if (!record)
        return res
          .status(404)
          .json({ success: false, message: `${modelName} not found` });

      res.json({ success: true, data: record });
    } catch (error) {
      console.error(`❌ Error fetching ${modelName}:`, error);
      res.status(500).json({ success: false, message: "Server error" });
    }
  });


  // POST create
  router.post(
    "/",
    protect,
    authorize("Admin"),
    validateMiddleware || ((req, res, next) => next()),
    async (req, res) => {
      try {
        const record = await Model.create(req.body);

        // ✅ Create SEO record
      
        const seoSlug = modelNameToSlugMap[modelName] || modelName;
        await upsertSeoRecord({
          refId: record._id,
          modelName: seoSlug,
          seo: {
            seo_keyphrase: record.seo_keyphrase,
            seo_title: record.seo_title,
            meta_description: record.meta_description,
            cover_image: record.cover_image,
          },
        });

        res.status(201).json({
          success: true,
          message: `${modelName} created`,
          data: record,
        });
      } catch (error) {
        console.error(`❌ Create ${modelName} error:`, error);
        res.status(500).json({ success: false, message: "Server error" });
      }
    }
  );

  // PUT update
  router.put(
    "/:id",
    protect,
    authorize("Admin"),
    validateMiddleware || ((req, res, next) => next()),
    async (req, res) => {
      try {
        const updated = await Model.findByIdAndUpdate(req.params.id, req.body, {
          new: true,
          runValidators: true,
        });
        if (!updated)
          return res
            .status(404)
            .json({ success: false, message: `${modelName} not found` });
        const seoSlug = modelNameToSlugMap[modelName] || modelName;
        // ✅ Update SEO record
        const { upsertSeoRecord } = require("../utils/seoHelper");
        await upsertSeoRecord({
          refId: updated._id,
          modelName: seoSlug,
          seo: {
            seo_keyphrase: updated.seo_keyphrase,
            seo_title: updated.seo_title,
            meta_description: updated.meta_description,
            cover_image: updated.cover_image,
          },
        });

        res.json({
          success: true,
          message: `${modelName} updated`,
          data: updated,
        });
      } catch (error) {
        console.error(`❌ Update ${modelName} error:`, error);
        res.status(500).json({ success: false, message: "Server error" });
      }
    }
  );

  // DELETE
  router.delete("/:id", protect, authorize("Admin"), async (req, res) => {
    try {
      const deleted = await Model.findByIdAndDelete(req.params.id);
      if (!deleted)
        return res
          .status(404)
          .json({ success: false, message: `${modelName} not found` });

      res.json({ success: true, message: `${modelName} deleted` });
    } catch (error) {
      console.error(`❌ Delete ${modelName} error:`, error);
      res.status(500).json({ success: false, message: "Server error" });
    }
  });

  return router;
}

module.exports = createCrudRoutes;

