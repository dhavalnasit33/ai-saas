const express = require("express");
const router = express.Router();
const LeadMagnetCategories = require("../models/LeadMegnetCategories");
const { protect, authorize } = require("../middleware/auth");
const mongoose = require("mongoose");
const { validateLeadMagnetCategories, handleValidationErrors } = require("../middleware/validation");
const slugify = require("slugify");

// @desc Get paginated list of lead magnet categories (Admin only)
// @route GET /api/lead-magnet-categories
// @query page, limit, search
router.get("/", protect, authorize("Admin"), async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 100;
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
                { name: { $regex: search, $options: "i" } },
                { description: { $regex: search, $options: "i" } },
                { slug: { $regex: search, $options: "i" } },
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
        const total = await LeadMagnetCategories.countDocuments(query);
        const categories = await LeadMagnetCategories.find(query)
            .skip((page - 1) * limit)
            .limit(limit)
            .sort({ createdAt: -1 });

        res.json({
            success: true,
            data: categories,
            pagination: { current: page, pages: Math.ceil(total / limit), total },
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// @desc Get all active lead magnet categories (Public)
// @route GET /api/lead-magnet-categories/all/active
router.get("/all/active", async (req, res) => {
    try {
        const type = req.query.type || "standard";
        const query = { is_active: true };
        if (type === "standard") {
            query.$or = [{ type: "standard" }, { type: { $exists: false } }];
        } else {
            query.type = type;
        }
        const categories = await LeadMagnetCategories.find(query).sort({ createdAt: 1 });
        res.json({ success: true, data: categories });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// @desc Get all lead magnet categories without status check (Admin)
// @route GET /api/lead-magnet-categories/all/admin
router.get("/all/admin", protect, authorize("Admin"), async (req, res) => {
    try {
        const type = req.query.type || "standard";
        const query = {};
        if (type === "standard") {
            query.$or = [{ type: "standard" }, { type: { $exists: false } }];
        } else {
            query.type = type;
        }
        const categories = await LeadMagnetCategories.find(query).sort({ createdAt: 1 });
        res.json({ success: true, data: categories });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// @desc Get single lead magnet category by Slug
// @route GET /api/lead-magnet-categories/slug/:slug
router.get("/slug/:slug", async (req, res) => {
    try {
        const category = await LeadMagnetCategories.findOne({ slug: req.params.slug });
        if (!category) {
            return res.status(404).json({ success: false, message: "Category not found" });
        }
        res.json({ success: true, data: category });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

//@desc get single lead magnet category by ID
//@route GET /api/lead-magnet-categories/:id
router.get("/:id", async (req, res) => {
    try {
        const category = await LeadMagnetCategories.findById(req.params.id);
        if (!category) {
            return res.status(404).json({ success: false, message: "Category not found" });
        }
        res.json({ success: true, data: category });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// @desc create lead magnet category (Admin only)
// @route POST /api/lead-magnet-categories
router.post("/", protect, authorize("Admin"), validateLeadMagnetCategories, handleValidationErrors, async (req, res) => {
    try {

        req.body.slug = req.body.slug ? slugify(req.body.slug, {
            lower: true,
            strict: true,
            trim: true,
            remove: /[*+~.()"!:@]/g,
        }) : slugify(req.body.name, {
            lower: true,
            strict: true,
            trim: true,
            remove: /[*+~.()"!:@]/g,
        });

        const existingCategory = await LeadMagnetCategories.findOne({
            slug: req.body.slug,
        });

        if (existingCategory) {
            return res.status(400).json({
                success: false,
                message: "Slug already exists",
            });
        }

        const category = await LeadMagnetCategories.create(req.body);
        res.status(201).json({ success: true, data: category });
    } catch (err) {
        console.error("Error creating category:", err);
        res.status(500).json({ success: false, message: err.message || "Server Error" });
    }
});

// @desc update lead magnet category (Admin only)
// @route PUT /api/lead-magnet-categories/:id
router.put("/:id", protect, authorize("Admin"), validateLeadMagnetCategories, handleValidationErrors, async (req, res) => {
    try {
        if (req.body.name || req.body.slug) {
            req.body.slug = req.body.slug ? slugify(req.body.slug, {
                lower: true,
                strict: true,
                trim: true,
                remove: /[*+~.()"!:@]/g,
            }) : slugify(req.body.name, {
                lower: true,
                strict: true,
                trim: true,
                remove: /[*+~.()"!:@]/g,
            });

            const existingCategory = await LeadMagnetCategories.findOne({
                slug: req.body.slug,
                _id: { $ne: req.params.id },
            });

            if (existingCategory) {
                return res.status(400).json({
                    success: false,
                    message: "Slug already exists",
                });
            }
        }
        let category = await LeadMagnetCategories.findById(req.params.id);
        if (!category) {
            return res.status(404).json({ success: false, message: "Category not found" });
        }

        category = await LeadMagnetCategories.findByIdAndUpdate(req.params.id, req.body, {
            new: true,
            runValidators: true,
        });

        res.json({ success: true, data: category });
    } catch (err) {
        console.error("Error updating category:", err);
        res.status(500).json({ success: false, message: err.message || "Server Error" });
    }
});



// @desc delete lead magnet category (Admin only)
// @route DELETE /api/lead-magnet-categories/:id
router.delete("/:id", protect, authorize("Admin"), async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ success: false, message: "Invalid category ID" });
        }
        const category = await LeadMagnetCategories.findByIdAndDelete(req.params.id);
        if (!category) {
            return res.status(404).json({ success: false, message: "Category not found" });
        }
        res.json({ success: true, message: "Category deleted successfully" });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message || "Server Error" });
    }
});

// @desc Bulk delete lead magnet categories (Admin only)
// @route POST /api/lead-magnet-categories/bulk-delete
router.post("/bulk-delete", protect, authorize("Admin"), async (req, res) => {
    try {
        const { ids } = req.body;
        if (!ids || !Array.isArray(ids)) {
            return res.status(400).json({ success: false, message: "Please provide an array of IDs" });
        }
        // await LeadMagnetCategories.deleteMany({ _id: { $in: ids } });
        const deletedCategories = await LeadMagnetCategories.deleteMany({ _id: { $in: ids } });
        if (deletedCategories.deletedCount === 0) {
            return res.status(404).json({ success: false, message: "Categories not found" });
        }
        res.status(200).json({
            success: true,
            message: `${deletedCategories.deletedCount} categories deleted successfully`,
            ddeletedCount: deletedCategories.deletedCount,
        })
    } catch (err) {
        res.status(500).json({ success: false, message: err.message || "Server Error" });
    }
});

//@desc toggle active status of a lead magnet category (Admin only)
//@route PATCH /api/lead-magnet-categories/:id/toggle
router.patch("/:id/toggle", protect, authorize("Admin"), async (req, res) => {
    try {
        const category = await LeadMagnetCategories.findById(req.params.id);
        if (!category) {
            return res.status(404).json({ success: false, message: "Category not found" });
        }
        category.is_active = !category.is_active;
        await category.save();
        res.json({ success: true, data: { is_active: category.is_active } });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message || "Server Error" });
    }
});

module.exports = router;
