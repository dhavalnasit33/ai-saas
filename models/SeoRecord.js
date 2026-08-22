// models/SeoRecord.js
const mongoose = require("mongoose");
const slugify = require("slugify");

const seoRecordSchema = new mongoose.Schema(
  {
    ref_id: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
    model_name: { type: String, required: true }, // e.g. "Email"
    slug: { type: String, required: true, unique: true },
    seo_keyphrase: { type: String, default: "" },
    seo_title: { type: String, default: "" },
    meta_description: { type: String, default: "" },
    cover_image: { type: String, default: "" },
  },
  { timestamps: true }
);

// Generate slug from seo_title if not provided
seoRecordSchema.pre("validate", function (next) {
  if (!this.slug && this.model_name) {
    this.slug = slugify(this.model_name, { lower: true, strict: true });
  }
  next();
});

module.exports = mongoose.model("SeoRecord", seoRecordSchema);
