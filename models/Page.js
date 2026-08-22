const mongoose = require("mongoose");

const pageSchema = new mongoose.Schema(
  {
    page_title: {
      type: String,
      required: true,
      maxlength: 200,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      maxlength: 200,
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
    page_description: {
      type: String,
    },
    seo_keyphrase: {
      type: String,
      maxlength: 200,
    },
    seo_title: {
      type: String,
      maxlength: 200,
    },
    meta_description: {
      type: String,
      maxlength: 300,
    },
    cover_image: {
      type: String,
      maxlength: 1000,
    },
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

module.exports = mongoose.model("Page", pageSchema);
