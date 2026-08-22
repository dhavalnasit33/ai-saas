const mongoose = require("mongoose");
const slugify = require("slugify");

const trendingNewsSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
    },
    slug: {
      type: String,
      unique: true,
      index: true,
    },
    image: {
      type: String,
      required: false,
    },
    description: {
      type: String,
       required: true,
    },
    displayOnHomePage: {
      type: Boolean,
      default: true,
    },
    category_id: [
      {
     type: mongoose.Schema.Types.ObjectId,
        ref: "NewsCategory", 
        required: true,
      },
    ],
  },
  { timestamps: true }
);

// Auto-generate unique slug before saving
trendingNewsSchema.pre("save", async function (next) {
  if (this.isModified("title")) {
    const baseSlug = slugify(this.title, { lower: true, strict: true });
    let slug = baseSlug;
    let counter = 1;

    while (
      await this.constructor.findOne({
        slug,
        _id: { $ne: this._id },
      })
    ) {
      slug = `${baseSlug}-${counter++}`;
    }

    this.slug = slug;
  }
  next();
});

module.exports = mongoose.model("TrendingNews", trendingNewsSchema);
