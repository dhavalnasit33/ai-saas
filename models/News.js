// models/News.js
const mongoose = require("mongoose");
const slugify = require("slugify");

const newsSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    slug: { type: String, index: true },
    image: { type: String },
    description: { type: String, required: true },
    displayOnHomePage: { type: Boolean, default: true },
    category: { type: String, index: true },
    publishedAt: { type: Date },
    companyName: { type: String, default: null },
  },
  { timestamps: true }
);

// Auto-generate unique slug
newsSchema.pre("save", async function (next) {
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

module.exports = mongoose.model("News", newsSchema);
