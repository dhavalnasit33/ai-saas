const mongoose = require("mongoose");
const slugify = require("slugify");

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

    // 👇 NEW field
    prompt: { type: String, default: "" },
  },
  { _id: false },
);

const tabSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, unique: true },
    slug: { type: String, unique: true, lowercase: true },
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
    fields: {
      type: [fieldSchema],
      default: [],
    },
    prompt_template: {
      type: String,
      required: true,
    },
    // description: {
    //   type: String,
    //   default: "",
    // },
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
    suggested_topics: {
      type: [suggestedTopicSchema],
      default: [],
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
    improvement_system_prompt: { type: String, default: null },
    custom_url: { type: String, default: null },
    max_tokens: {
      type: Number,
      default: 4000,
    },
  },
  { timestamps: true },
);

// Slug generation before validation
tabSchema.pre("validate", function (next) {
  if (this.title && (!this.slug || this.isModified("title"))) {
    this.slug = slugify(this.title, {
      lower: true,
      strict: true,
      trim: true,
      remove: /[*+~.()'"!:@]/g,
    });
  }
  next();
});

tabSchema.pre("save", async function (next) {
  try {
    // Check title uniqueness manually
    if (this.isModified("title")) {
      const existingTitle = await this.constructor.findOne({
        title: this.title,
        _id: { $ne: this._id },
      });
      if (existingTitle) {
        throw new Error("Title must be unique");
      }
    }

    // Ensure slug uniqueness
    if (this.isModified("slug")) {
      let baseSlug = this.slug;
      let slug = baseSlug;
      let counter = 1;

      while (await this.constructor.findOne({ slug, _id: { $ne: this._id } })) {
        slug = `${baseSlug}-${counter++}`;
      }

      this.slug = slug;
    }

    next();
  } catch (err) {
    next(err);
  }
});

// Index for faster lookup
tabSchema.index({ title: 1 }, { unique: true });
tabSchema.index({ slug: 1 }, { unique: true });

module.exports = mongoose.model("Tab", tabSchema);
