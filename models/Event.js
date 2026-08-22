const mongoose = require("mongoose");

const EventSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    title: { type: String, required: true },
    // Storing as String to match frontend format "YYYY-MM-DD HH:mm"
    start: { type: String, required: true },
    end: { type: String, required: true },
    calendarId: {
      type: String,
      // Updated categories
      enum: [
        "personal",
        "project",
        "meeting",
        "reminder",
        "focus_mode",
        "other",
      ],
      default: "personal",
    },
    description: { type: String, default: "" },
    location: { type: String, default: "" },
    // people: [{
    //   type: mongoose.Schema.Types.ObjectId,
    //   ref: "User"
    // }],

    // ✅ Added explicitly for Frequency (Daily, Weekly, etc.)
    rrule: { type: String, default: null },
  },
  { timestamps: true },
);

// Map _id to id for frontend compatibility
EventSchema.set("toJSON", {
  virtuals: true,
  versionKey: false,
  transform: function (doc, ret) {
    ret.id = ret._id;
    delete ret._id;
  },
});

module.exports = mongoose.model("Event", EventSchema);
