const mongoose = require("mongoose");

const savedImageSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    // We store the actual URL string because you don't have a separate Image Model
    image_url: {
      type: String,
      required: true,
    },
    // Optional: Reference the chat history where this image was created
    original_chat_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ChatHistory",
    },
    is_saved: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

// Prevent the same user from saving the EXACT same image URL twice
savedImageSchema.index({ user: 1, image_url: 1 }, { unique: true });

module.exports = mongoose.model("SavedImage", savedImageSchema);
