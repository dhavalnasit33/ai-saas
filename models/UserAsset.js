const mongoose = require("mongoose");

const UserAssetSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    url: { type: String, required: true }, // Path to file on server (e.g., /uploads/assets/video1.mp4)
    type: { type: String, enum: ["image", "video"], required: true },
    filename: String,
    size: Number, // File size in bytes (good for limits)
  },
  { timestamps: true }
);

module.exports = mongoose.model("UserAsset", UserAssetSchema);