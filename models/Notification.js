const mongoose = require("mongoose");

const NotificationSchema = new mongoose.Schema(
  {
    // Who receives this notification
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // Who triggered it (mention author)
    actor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // Page where mention happened
    page: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "EditorPage",
      required: true,
    },

    // Type of notification
    type: {
      type: String,
      enum: ["mention", "comment"],
      required: true,
    },

    // Optional content preview
    message: {
      type: String,
    },

    // Read / unread
    isRead: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Notification", NotificationSchema);
