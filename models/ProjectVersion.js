const mongoose = require("mongoose");

const ProjectVersionSchema = new mongoose.Schema(
  {
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "UserProject",
      required: true,
    },
    versionNumber: {
      type: Number,
      required: true,
    },
    htmlPath: {
      type: String,
      required: true,
    },
    assetsPath: {
      type: String,
      default: "",
    },
    publishedAt: {
      type: Date,
      default: Date.now,
    },
    publishedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true }
);

// Compound index to quickly fetch project's versions by version number
ProjectVersionSchema.index({ projectId: 1, versionNumber: -1 });

module.exports = mongoose.model("ProjectVersion", ProjectVersionSchema);
