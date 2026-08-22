const mongoose = require("mongoose");
const { getPublishConfig } = require("../utils/publishingConfig");
const { contentStudioConnection } = require("../utils/dbConnections");

const MasterTemplateSchema = new mongoose.Schema(
  {
    _id: {
      type: String,
      required: true,
    },
    generationJobId: {
      type: String,
      default: "",
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      default: "",
    },
    version: {
      type: Number,
      default: 1,
    },
    contentTypeId: {
      type: String,
      default: "",
    },
    contentType: {
      type: String,
      required: true,
      trim: true,
    },
    category: {
      type: String,
      default: "",
      trim: true,
    },
    subcategory: {
      type: String,
      default: "",
      trim: true,
    },
    tags: [
      {
        type: String,
        trim: true,
      },
    ],
    builderType: {
      type: String,
      default: "page_builder",
    },
    editorProject: {
      type: String,
      default: "",
    },
    unlayerProjectId: {
      type: String,
      default: "",
    },
    unlayerTemplateId: {
      type: String,
      default: null,
    },
    originalDesignJsonUrl: {
      type: String,
      default: "",
    },
    assets: {
      type: Array,
      default: [],
    },
    status: {
      type: String,
      default: "awaiting_unlayer_import",
    },
    thumbnailUrl: {
      type: String,
      default: "",
    },
    linkedAt: {
      type: Date,
      default: null,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    industry: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

// Derived virtual fields
MasterTemplateSchema.virtual("canPublish").get(function () {
  return getPublishConfig(this.contentType).canPublish;
});

MasterTemplateSchema.virtual("downloadFormats").get(function () {
  return getPublishConfig(this.contentType).downloadFormats;
});


// Configure Indexes
MasterTemplateSchema.index({ status: 1 });
MasterTemplateSchema.index({ category: 1 });
MasterTemplateSchema.index({ builderType: 1 });
MasterTemplateSchema.index({ tags: 1 });

// Compile against the secondary connection to isolate queries to the Replit DB
module.exports = contentStudioConnection.model(
  "MasterTemplate",
  MasterTemplateSchema,
  "templates",
);
