const express = require("express");
const routes = express.Router();
const AlternativeTools = require("../models/AlternativeTools");
const { protect, authorize } = require("../middleware/auth");
const { handleValidationErrors, validateAlternativeTools } = require("../middleware/validation");
const mongoose = require("mongoose");

// @desc    Get paginated list of  alternative tools (admin only)
// @route   GET /api/alternative-tools/all
// @access  Private (Admin)
// @query   page, limit, search,

routes.get("/", protect, authorize("Admin"), async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 100;
        const search = req.query.search || "";

        const query = {};
        if (search) query.name = { $regex: search, $options: "i" };

        const total = await AlternativeTools.countDocuments(query);
        const tools = await AlternativeTools.find(query)
            .skip((page - 1) * limit)
            .limit(limit)
            .sort({ createdAt: -1 });

        res.json({ success: true, data: tools, pagination: { current: page, pages: Math.ceil(total / limit), total } });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
})


// @desc    Get all alternative tools for public
// @route   GET /api/alternative-tools/all
// @access  Public

routes.get("/all", async (req, res) => {
    try {
        const tools = await AlternativeTools.find({ is_active: true }).sort({ createdAt: 1 });
        res.json({ success: true, data: tools });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
})

// @desc    Get all active alternative tools for admin only name and price 
// @route   GET /api/alternative-tools/all-price
// @access  Public

routes.get("/all-price", async (req, res) => {
    try {
        const tools = await AlternativeTools.find({ is_active: true }).select("name price").sort({ createdAt: 1 });
        res.json({ success: true, data: tools });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
})


// @desc    Get single alternative tool by ID
// @route   GET /api/alternative-tools/:id
// @access  Public

routes.get("/:id", async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ success: false, message: "Invalid tool ID" });
        }
        const tool = await AlternativeTools.findById(req.params.id);
        if (!tool) {
            return res.status(404).json({ success: false, message: "Tool not found" });
        }
        res.json({ success: true, data: tool });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
})

// @desc    Create new alternative tool
// @route   POST /api/alternative-tools
// @access  Private (Admin)

routes.post("/", protect, authorize("Admin"), validateAlternativeTools, handleValidationErrors, async (req, res) => {
    try {
        const tool = new AlternativeTools(req.body);
        await tool.save();
        res.json({ success: true, data: tool });
    } catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
})

// @desc    Update alternative tool
// @route   PUT /api/alternative-tools/:id
// @access  Private (Admin)

routes.put("/:id", protect, authorize("Admin"), validateAlternativeTools, handleValidationErrors, async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ success: false, message: "Invalid tool ID" });
        }
        const tool = await AlternativeTools.findByIdAndUpdate(req.params.id, { $set: req.body }, { new: true, runValidators: true });
        if (!tool) {
            return res.status(404).json({ success: false, message: "Tool not found" });
        }
        res.json({ success: true, data: tool });
    } catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
})


// @desc    Toggle Active Status
// @route   PUT /api/alternative-tools/:id/toggle
// @access  Private (Admin)

routes.put("/:id/toggle", protect, authorize("Admin"), async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ success: false, message: "Invalid tool ID" });
        }
        const tool = await AlternativeTools.findById(req.params.id);
        if (!tool) {
            return res.status(404).json({ success: false, message: "Tool not found" });
        }
        tool.is_active = !tool.is_active;
        await tool.save();
        res.json({ success: true, data: { is_active: tool.is_active } });
    } catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
})

// @desc Bulk delete alternative tools
// @route DELETE /api/alternative-tools/bulk-delete
// @access Private (Admin)

routes.delete("/bulk-delete", protect, authorize("Admin"), async (req, res) => {
    try {
        const { ids } = req.body;
        console.log(ids);
        if (!ids || !Array.isArray(ids) || ids.length === 0) {
            return res.status(400).json({ success: false, message: "IDs must be an array" });
        }

        // validate ids are mongoose object ids 
        const invalidIds = ids.filter(id => !mongoose.Types.ObjectId.isValid(id));
        if (invalidIds.length > 0) {
            return res.status(400).json({ success: false, message: `Invalid ID(s): ${invalidIds.join(", ")}` });
        }

        const deletedTools = await AlternativeTools.deleteMany({ _id: { $in: ids } });
        res.json({ success: true, data: deletedTools });
    } catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
})


// @desc    Delete alternative tool
// @route   DELETE /api/alternative-tools/:id
// @access  Private (Admin)

routes.delete("/:id", protect, authorize("Admin"), async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ success: false, message: "Invalid tool ID" });
        }
        const tool = await AlternativeTools.findByIdAndDelete(req.params.id);
        if (!tool) {
            return res.status(404).json({ success: false, message: "Tool not found" });
        }
        res.json({ success: true, data: {} });
    } catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
});


module.exports = routes;