const mongoose = require("mongoose");

const PublishedHostnameSchema = new mongoose.Schema(
  {
    hostname: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "UserProject",
      required: true,
    },
    activeVersionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ProjectVersion",
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    deletedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

// Ensure fast hostname searches
PublishedHostnameSchema.index({ hostname: 1 });

module.exports = mongoose.model("PublishedHostname", PublishedHostnameSchema);
