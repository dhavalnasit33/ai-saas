const mongoose = require("mongoose");

const DesignSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    designJson: {
      type: mongoose.Schema.Types.Mixed, // Flexible for JSON data
      required: true,
    },
    previewUrl: {
      type: String, // Cloudinary secure_url
      required: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Design", DesignSchema);
