const mongoose = require("mongoose");

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

const baseSchema = new mongoose.Schema(
  {
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
    seo_keyphrase: { type: String, default: "" },
    seo_title: { type: String, default: "" },
    meta_description: { type: String, default: "" },
    cover_image: { type: String, default: "" },
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
    system_prompt: {
      type: String,
    },
    display_wordcount: { type: Boolean, default: true },
    improvement_system_prompt: { type: String, default: null },
    custom_url: { type: String, default: null },
    max_tokens: {
      type: Number,
      default: 4000,
    },
    sticky: { type: Boolean, default: false },
  },
  { timestamps: true },
);

module.exports = baseSchema;
