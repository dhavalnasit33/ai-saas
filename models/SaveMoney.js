// const mongoose = require("mongoose");
// const baseSchema = require("./commonSchema");

// // Use the same reusable base schema
// const SaveMoney = mongoose.model("SaveMoney", baseSchema);

// module.exports = SaveMoney;

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
    input_placeholder: {
      type: String,
      default: "Type your answer...",
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

// Subdocument schema for form fields
const fieldSchema = new mongoose.Schema(
  {
    key: { type: String, required: true },
    label: { type: String, required: true },
    description: { type: String, default: "" },
    type: {
      type: String,
      enum: [
        "textbox",
        "textarea",
        "dropdown",
        "radio",
        "checkbox",
        "imageupload",
        "fileupload",
        "number",
        "date",
      ],
      required: true,
    },
    required: { type: Boolean, default: false },
    placeholder: { type: String, default: "" },
    default_value: { type: mongoose.Schema.Types.Mixed, default: "" },
    options: [{ type: String }],
    prompt: { type: String, default: "" },
  },
  { _id: false },
);

// Main Interview Preparation Schema
const saveMoneySchema = new mongoose.Schema(
  {
    // Form fields & templates
    fields: [fieldSchema],
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
    prompt_template: {
      type: String,
      required: true,
    },
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
    // Suggested topics
    suggested_topics: {
      type: [suggestedTopicSchema],
      validate: {
        validator: (v) => Array.isArray(v) && v.length > 0,
        message: "At least one suggested topic is required",
      },
    },

    // SEO & metadata
    seo_keyphrase: { type: String, default: "" },
    seo_title: { type: String, default: "" },
    meta_description: { type: String, default: "" },
    cover_image: { type: String, default: "" },

    // System & AI prompts
    system_prompt: { type: String, default: "" },
    improvement_system_prompt: { type: String, default: null },

    // Display options
    display_wordcount: { type: Boolean, default: true },
    custom_url: { type: String, default: null },
    max_tokens: { type: Number, default: 4000 },

    // Active status
    isActive: { type: Boolean, default: true },

    //new feild
    tool_cover_image: { type: String, default: "" },
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
    sticky: { type: Boolean, default: false },
  },
  { timestamps: true },
);

module.exports = mongoose.model("SaveMoney", saveMoneySchema);
