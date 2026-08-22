const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/auth");
const Notification = require("../models/Notification");

// 🔔 GET MY INBOX
// GET /api/notifications
router.get("/", protect, async (req, res) => {
  try {
    const notifications = await Notification.find({
      user: req.user.id,
    })
      .populate("actor", "name email")
      .populate("page", "title")
      .sort({ createdAt: -1 })
      .limit(50);

    res.json({
      success: true,
      data: notifications,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// 🔔 MARK AS READ
// PUT /api/notifications/:id/read
router.put("/:id/read", protect, async (req, res) => {
  await Notification.findOneAndUpdate(
    { _id: req.params.id, user: req.user.id },
    { isRead: true }
  );

  res.json({ success: true });
});

module.exports = router;
