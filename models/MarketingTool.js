const mongoose = require("mongoose");
const slugify = require("slugify");

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
  },
  { _id: false },
);

const tabSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    fields: [fieldSchema],
    prompt_template: {
      type: String,
      required: true,
      maxlength: [2000, "Tab prompt template cannot exceed 2000 characters"],
    },
    description: {
      type: String,
      default: "",
      maxlength: [500, "Description cannot exceed 500 characters"],
    },
  },
  { _id: false },
);

const suggestedTopicSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      maxlength: [500, "Title cannot exceed 500 characters"],
    },
    has_input: { type: Boolean, default: true },
    input_placeholder: { type: String, default: "Type anything..." },
  },
  { _id: false },
);

const marketingToolSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: [100, "Name cannot exceed 100 characters"],
    },
    icon: {
      type: String,
      default: null,
      maxlength: [1000, "Icon URL/path cannot exceed 1000 characters"],
    },
    allternativeTools: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "AlternativeTools",
      },
    ],
    whatCanDO: [
      {
        type: String,
      },
    ],
    display_name: {
      type: String,
      default: "",
    },
    slug: { type: String, required: true, lowercase: true },
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
    category_id: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "MarketingCategory",
        required: true,
      },
    ],

    system_prompt_template: {
      type: String,
      required: true,
      maxlength: [3000, "System prompt template cannot exceed 3000 characters"],
    },
    max_tokens: {
      type: Number,
      default: 4000,
    },
    is_popular: { type: Boolean, default: false },
    sticky: { type: Boolean, default: false },
    user_plan: {
      type: String,
      enum: ["free", "basic", "lite", "standard", "pro", "pro_max", "guest"],
      default: "free",
    },
    tabs: [tabSchema],
    suggested_topics: [suggestedTopicSchema],
    display_wordcount: { type: Boolean, default: true },
    improvement_system_prompt: { type: String, default: null },
    custom_url: { type: String, default: null },
    is_active: { type: Boolean, default: true },
    user_plan: { type: String, default: "basic" },

    seo_keyphrase: {
      type: String,
      maxlength: [200, "Focus keyphrase cannot exceed 200 characters"],
    },
    seo_title: {
      type: String,
      maxlength: [200, "SEO title cannot exceed 200 characters"],
    },
    meta_description: {
      type: String,
      maxlength: [300, "Meta description cannot exceed 300 characters"],
    },
    cover_image: {
      type: String,
      default: null,
      maxlength: [1000, "Cover image URL/path cannot exceed 1000 characters"],
    },
    tooltips: {
      type: String,
      default: "",
      maxlength: [1000, "Tooltips cannot exceed 1000 characters"],
    },
    created_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true },
);

// Generate slug from name before validating
marketingToolSchema.pre("validate", function (next) {
  if (this.name) {
    this.slug = slugify(this.name, {
      lower: true,
      strict: true,
      trim: true,
      remove: /[*+~.()'"!:@]/g,
    });
  }
  next();
});

// Ensure slug uniqueness
marketingToolSchema.pre("save", async function (next) {
  try {
    if (this.isModified("name") || this.isModified("slug")) {
      let baseSlug = this.slug;
      let slug = baseSlug;
      let counter = 1;

      while (await this.constructor.findOne({ slug, _id: { $ne: this._id } })) {
        slug = `${baseSlug}-${counter}`;
        counter++;
      }

      this.slug = slug;
    }
    next();
  } catch (error) {
    next(error);
  }
});

// Indexes
marketingToolSchema.index({ is_active: 1, category_id: 1 });
marketingToolSchema.index({ name: "text", description: "text" });
marketingToolSchema.index({ slug: 1 }, { unique: true });
marketingToolSchema.index({ name: 1 }, { unique: true });

module.exports = mongoose.model("MarketingTool", marketingToolSchema);
