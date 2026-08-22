const mongoose = require("mongoose");
const slugify = require("slugify");

const discoverRecipeSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Recipe title is required"],
      trim: true,
    },
    slug: {
      type: String,
      unique: true,
      lowercase: true,
    },
    description: {
      type: String,
    },
    is_active: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

// Slug generation
discoverRecipeSchema.pre("validate", function (next) {
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

// Ensure slug is unique
discoverRecipeSchema.pre("save", async function (next) {
  try {
    if (this.isModified("title") || this.isModified("slug")) {
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

discoverRecipeSchema.index({ is_active: 1 });
discoverRecipeSchema.index({ title: "text", description: "text" });
discoverRecipeSchema.index({ slug: 1 }, { unique: true });

module.exports = mongoose.model("DiscoverRecipe", discoverRecipeSchema);
