const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/auth");
const Event = require("../models/Event");

// @route   GET /api/events
router.get("/", protect, async (req, res) => {
  try {
    const currentUserId = req.user.id;
    // Removed $or condition for 'people'
    const events = await Event.find({ user: currentUserId });
    // Removed .populate("people")
    res.json({ success: true, data: events });
  } catch (err) {
    console.error("Get Events Error:", err);
    res.status(500).json({ success: false, message: "Server Error" });
  }
});

// @route   POST /api/events
router.post("/", protect, async (req, res) => {
  try {
    // Removed 'people' from destructuring
    const { title, start, end, calendarId, description, rrule, location } = req.body;

    const newEvent = new Event({
      user: req.user.id,
      title,
      start,
      end,
      calendarId,
      description,
      rrule,
      location,
      // Removed people
    });

    const savedEvent = await newEvent.save();
    // Removed .populate("people")
    res.json({ success: true, data: savedEvent });
  } catch (err) {
    console.error("Create Event Error:", err);
    res.status(500).json({ success: false, message: "Server Error" });
  }
});

// @route   PUT /api/events/:id
router.put("/:id", protect, async (req, res) => {
  try {
    let event = await Event.findById(req.params.id);

    if (!event)
      return res.status(404).json({ success: false, message: "Event not found" });

    if (event.user.toString() !== req.user.id) {
      return res.status(401).json({ success: false, message: "Not authorized" });
    }

    event = await Event.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true },
    ); // Removed .populate("people")

    res.json({ success: true, data: event });
  } catch (err) {
    console.error("Update Event Error:", err);
    res.status(500).json({ success: false, message: "Server Error" });
  }
});

// DELETE route remains the same (it just deletes by ID)
router.delete("/:id", protect, async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event)
      return res.status(404).json({ success: false, message: "Event not found" });

    if (event.user.toString() !== req.user.id) {
      return res.status(401).json({ success: false, message: "Not authorized" });
    }

    await event.deleteOne();
    res.json({ success: true, message: "Event removed" });
  } catch (err) {
    console.error("Delete Event Error:", err);
    res.status(500).json({ success: false, message: "Server Error" });
  }
});

module.exports = router;