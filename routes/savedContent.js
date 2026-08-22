const express = require("express");
const SavedContentManager = require("../models/SavedContent");
// Assuming you have similar validation or you can remove/replace this with generic validation
// const { validateSavedContent, handleValidationErrors } = require("../middleware/validation"); 
const { protect } = require("../middleware/auth");
const { validateSavedContent, handleValidationErrors } = require("../middleware/validation");

const router = express.Router();

// GET all saved content for the logged-in user
router.get("/", protect, async (req, res) => {
  try {
    const userId = req.user.id; 

    // Plan check - mirroring BrandedVoice logic
    // if (req.user.plan === "basic") {
    //   return res.status(403).json({ success: false, message: "Upgrade plan to access saved content" });
    // }

    const list = await SavedContentManager.find({ user: userId }).sort({ createdAt: -1 }); 
 
    res.json({
      success: true,
      data: list,
    });
  } catch (err) {
    console.error("Get SavedContent for logged-in user error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// CREATE saved content
// Note: If you have a validation middleware for this, add it here (e.g., validateSavedContent)
router.post("/", protect, validateSavedContent, handleValidationErrors,  async (req, res) => {
  try {
    // if (req.user.plan === "basic") {
    //   return res.status(403).json({ success: false, message: "Upgrade plan to save content" });
    // }

    // Basic validation if not using middleware
    if (!req.body.content_name || !req.body.content_text) {
      return res.status(400).json({ success: false, message: "Please provide content name and text" });
    }

    // Override user ID from logged-in user
    const data = { ...req.body, user: req.user.id };

    const content = await SavedContentManager.create(data); 

    
    res.status(201).json({ success: true, data: content });
  } catch (err) {
    console.error("Create SavedContent error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// UPDATE saved content (own or admin)
router.put("/:id", protect,validateSavedContent, handleValidationErrors, async (req, res) => {
  try {
    const content = await SavedContentManager.findById(req.params.id);
    if (!content) {
      return res.status(404).json({ success: false, message: "Content not found" });
    }
    
    // Check if user is owner or admin
    if (content.user.toString() !== req.user.id.toString()) {
      return res.status(403).json({ success: false, message: "Not authorized to update this record" });
    }

    // Prevent user from changing the owner
    const data = { ...req.body, user: content.user };

    const updated = await SavedContentManager.findByIdAndUpdate(req.params.id, data, { new: true });
    res.json({ success: true, data: updated });
  } catch (err) {
    console.error("Update SavedContent error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// DELETE saved content (own or admin)
router.delete("/:id", protect, async (req, res) => {
  try {
    const content = await SavedContentManager.findById(req.params.id);
    if (!content) {
      return res.status(404).json({ success: false, message: "Content not found" });
    }

    // Check if user is owner or admin
    if (content.user.toString() !== req.user.id.toString()) {
      return res.status(403).json({ success: false, message: "Not authorized to delete this record" });
    }

    await content.deleteOne();

    res.json({ success: true, message: "Saved Content Deleted successfully" });
  } catch (err) {
    console.error("Delete SavedContent error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

module.exports = router;