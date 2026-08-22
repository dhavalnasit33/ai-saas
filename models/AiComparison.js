const mongoose = require("mongoose");

const aiProviderComparisonSchema = new mongoose.Schema(
  {
    modelId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "AIProvider",
      required: true,
    },
    firstModel: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "AIProvider",
      required: [true, "First model is required"],
    },
    secondModel: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "AIProvider",
      required: [true, "Second model is required"],
    },
    type: {
      type: String,
      enum: ["text", "image"], // You can add 'video' or others later
      default: "text", // Defaults to chat if not provided
      index: true, // Indexed for faster filtering
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    keyPhrase: {
      type: String,
      maxlength: 200,
    },
    title: {
      type: String,
      maxlength: 200,
    },
    short_description: {
      type: String,
      maxlength: 200,
    },
    description: {
      type: String,
      maxlength: 1000,
    },
    metaDescription: {
      type: String,
      maxlength: 300,
    },
    categories: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "HomeToolCategory",
      },
    ],
    tags: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "HomeToolTag",
      },
    ],
    coverImage: {
      type: String,
      maxlength: 1000,
    },
    is_active: {
      type: Boolean,
      default: true,
    },
    created_by_user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  {
    timestamps: true,
  },
);

module.exports = mongoose.model(
  "AIProviderComparison",
  aiProviderComparisonSchema,
);
