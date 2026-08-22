const mongoose = require("mongoose");

// Subdocument schema for suggested topics
const suggestedTopicSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
    },
    has_input: {
      type: Boolean,
      default: true,
    },
    image: {
      type: String,
      default: "",
    },
    sticky: {
      type: Boolean,
      default: false,
    },
  },
  { _id: false },
);

// Generic schema that can be reused for multiple models
const genericContentSchema = new mongoose.Schema(
  {
    suggested_topics: {
      type: [suggestedTopicSchema],
      validate: {
        validator: (v) => Array.isArray(v) && v.length > 0,
        message: "At least one suggested topic is required",
      },
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
    short_description: {
      type: String,
      maxlength: [200, "Short category cannot exceed 200 characters"],
    },
    mini_description: {
      type: String,
      maxlength: [200, "Mini description cannot exceed 200 characters"],
    },
    description: {
      type: String,
      maxlength: [50000, "Description cannot exceed 50000 characters"],
    },
    seo_keyphrase: { type: String, default: "" },
    seo_title: { type: String, default: "" },
    meta_description: { type: String, default: "" },
    cover_image: { type: String, default: "" },
    tab_normal_icon_image: { type: String, default: "" },
    tab_active_icon_image: { type: String, default: "" },
    tab_image: { type: String, default: "" },
    allternativeTools: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "AlternativeTools",
      },
    ],
    whatCanDO: [{ type: String }],
    display_name: { type: String, default: "" },
    image: { type: String, default: "" },
    sticky: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
    system_prompt: {
      type: String,
    },
    max_tokens: {
      type: Number,
      default: 4000,
    },
  },
  { timestamps: true },
);

// Create multiple models using the same schema
const Wellness = mongoose.model("Wellness", genericContentSchema);
const Therapy = mongoose.model("Therapy", genericContentSchema);
const Solutions = mongoose.model("Solutions", genericContentSchema);
const Marketing = mongoose.model("Marketing", genericContentSchema);
const FinancialAdvisor = mongoose.model(
  "FinancialAdvisor",
  genericContentSchema,
);
const Investing = mongoose.model("Investing", genericContentSchema);
const InterviewPrep = mongoose.model("InterviewPrep", genericContentSchema);
const Research = mongoose.model("Research", genericContentSchema);
module.exports = {
  Wellness,
  Therapy,
  Solutions,
  Marketing,
  FinancialAdvisor,
  Investing,
  InterviewPrep,
  Research,
};
