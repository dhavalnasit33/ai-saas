const mongoose = require("mongoose");

const videoPromptSchema = new mongoose.Schema(
  {
    image: {
      type: String,
      required: [true, "Thumbnail image URL is required"],
    },
    video: {
      type: String,
      required: [true, "Video URL is required"],
    },
    style: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ImageStyle",
      required: [true, "Style reference is required"],
    },
    short_video_prompt: {
      type: String,
      required: [true, "Short video prompt text is required"],
      trim: true,
    },
    video_prompt: {
      type: String,
      required: [true, "Video prompt text is required"],
      trim: true,
    },
    is_active: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("VideoPrompt", videoPromptSchema);
