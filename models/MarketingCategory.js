const mongoose = require("mongoose");
const slugify = require("slugify");

const marketingCategorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Marketing category name is required"],
      trim: true,
      maxlength: [100, "Name cannot exceed 100 characters"],
    },
    slug: {
      type: String,
      unique: true,
      lowercase: true,
    },
    description: {
      type: String,
      maxlength: [50000, "Description cannot exceed 50000 characters"],
    },
    system_prompt: {
      type: String,
      required: [true, "System prompt is required"],
      maxlength: [2000, "System prompt cannot exceed 2000 characters"],
    },
    is_active: {
      type: Boolean,
      default: true,
    },
    icon: {
      type: String,
      default: null,
    },
    tab_normal_icon_image: { type: String, default: "" },
    tab_active_icon_image: { type: String, default: "" },
    category: {
      type: String,
      enum: ["content", "code", "business", "creative", "analysis"],
      required: true,
    },
    parent: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "MarketingCategory",
      default: null,
    },
    usage_count: {
      type: Number,
      default: 0,
    },
    created_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Generate slug before validation
marketingCategorySchema.pre("validate", function (next) {
  if (this.name && (!this.slug || this.isModified("name"))) {
    this.slug = slugify(this.name, {
      lower: true,
      strict: true,
      trim: true,
      remove: /[*+~.()'"!:@]/g,
    });
  }
  next();
});

// Ensure slug uniqueness in pre-save
marketingCategorySchema.pre("save", async function (next) {
  try {
    if (this.isModified("name") || this.isModified("slug")) {
      let baseSlug = this.slug;
      let slug = baseSlug;
      let counter = 1;

      while (
        await this.constructor.findOne({
          slug,
          _id: { $ne: this._id },
        })
      ) {
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
marketingCategorySchema.index({ is_active: 1, category: 1 });
marketingCategorySchema.index({ name: "text", description: "text" });
marketingCategorySchema.index({ slug: 1 }, { unique: true });

module.exports = mongoose.model("MarketingCategory", marketingCategorySchema);
