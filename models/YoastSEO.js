const mongoose = require("mongoose");

const yoastSEOSchema = new mongoose.Schema(
  {
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
    page_description: {
      type: String,
      maxlength: 1000,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("YoastSEO", yoastSEOSchema);
