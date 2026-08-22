const mongoose = require("mongoose");
const slugify = require("slugify");

const newsCategorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "News category name is required"],
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
      maxlength: [1000, "Description cannot exceed 1000 characters"],
    },
    is_active: {
      type: Boolean,
      default: true,
    },
    is_popular: {
      type: Boolean,
      default: false, 
    },
    icon: {
      type: String,
      default: null,
    },
    parent: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "NewsCategory",
      default: null,
    },
    created_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true }
);

// Slug generation
newsCategorySchema.pre("validate", function (next) {
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

newsCategorySchema.pre("save", async function (next) {
  try {
    if (this.isModified("name") || this.isModified("slug")) {
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

newsCategorySchema.index({ is_active: 1 });
newsCategorySchema.index({ name: "text", description: "text" });
newsCategorySchema.index({ slug: 1 }, { unique: true });

module.exports = mongoose.model("NewsCategory", newsCategorySchema);
