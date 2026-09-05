const mongoose = require("mongoose");
const slugify = require("slugify");

// 1. Main Category Schema (e.g. Popular, Create & Transform, etc.)
const mainCategorySchema = new mongoose.Schema(
  {
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    name: {
      type: String,
      required: [true, "Main category name is required"],
      trim: true,
    },
    description: {
      type: String,
      default: "",
    },
    display_order: {
      type: Number,
      default: 0,
    },
    is_active: {
      type: Boolean,
      default: true,
    },
    subcategories: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "VideoSubcategory",
      },
    ],
  },
  { timestamps: true }
);

// 2. Subcategory Schema (e.g. Photo Experiences, YouTube & Creators, etc.)
const videoSubcategorySchema = new mongoose.Schema(
  {
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    name: {
      type: String,
      required: [true, "Subcategory name is required"],
      trim: true,
    },
    description: {
      type: String,
      default: "",
    },
    display_order: {
      type: Number,
      default: 0,
    },
    is_active: {
      type: Boolean,
      default: true,
    },
    tools: [
      {
        type: mongoose.Schema.Types.Mixed,
      },
    ],
  },
  { timestamps: true }
);

// Auto-generate slugs if missing
mainCategorySchema.pre("validate", function (next) {
  if (this.name && !this.slug) {
    this.slug = slugify(this.name, { lower: true, strict: true, trim: true });
  }
  next();
});

videoSubcategorySchema.pre("validate", function (next) {
  if (this.name && !this.slug) {
    this.slug = slugify(this.name, { lower: true, strict: true, trim: true });
  }
  next();
});

const VideoMainCategory = mongoose.model("VideoMainCategory", mainCategorySchema);
const VideoSubcategory = mongoose.model("VideoSubcategory", videoSubcategorySchema);

module.exports = {
  VideoMainCategory,
  VideoSubcategory,
};
