const mongoose = require("mongoose");

const imagePromptSchema = new mongoose.Schema(
  {
    image: {
      type: String,
      required: [true, "Image URL is required"],
    },
    style: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ImageStyle",
      required: [true, "Style reference is required"],
    },
    image_prompt: {
      type: String,
      required: [true, "Image prompt text is required"],
      trim: true,
    },
    is_active: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("ImagePrompt", imagePromptSchema);