const mongoose = require("mongoose");
const { getPublishConfig } = require("../utils/publishingConfig");

const UserProjectSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    projectName: {
      type: String,
      required: true,
      trim: true,
    },
    builderType: {
      type: String,
      enum: ["email", "page", "popup", "document"],
      required: true,
    },
    contentType: {
      type: String,
      required: true,
      trim: true,
    },
    templateId: {
      type: String,
      ref: "MasterTemplate",
      default: null,
    },
    draftJson: {
      type: Object,
      default: {},
    },
    activeVersionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ProjectVersion",
      default: null,
    },
    status: {
      type: String,
      enum: ["draft", "published", "archived", "deleted"],
      default: "draft",
    },
    deletedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

// Derived virtual fields
UserProjectSchema.virtual("canPublish").get(function () {
  return getPublishConfig(this.contentType).canPublish;
});

UserProjectSchema.virtual("downloadFormats").get(function () {
  return getPublishConfig(this.contentType).downloadFormats;
});

module.exports = mongoose.model("UserProject", UserProjectSchema);
