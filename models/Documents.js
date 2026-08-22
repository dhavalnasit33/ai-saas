const mongoose = require("mongoose");

// Subdocument schema for documents list (title + icon)
const documentItemSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    icon: { type: String, required: true }, 
  },
  { _id: false }
);

// Main Documents schema
const documentsSchema = new mongoose.Schema(
  {
    documents: {
      type: [documentItemSchema], 
      validate: {
        validator: (v) => Array.isArray(v) && v.length > 0,
        message: "At least one document entry is required",
      },
    },
    seo_keyphrase: { type: String, default: "" },
    seo_title: { type: String, default: "" },
    meta_description: { type: String, default: "" },
    cover_image: { type: String, default: "" },
     system_prompt: {
      type: String,
    },
    max_tokens: {
      type: Number,
      default: 4000,
    },
  },
  { timestamps: true }
);

const Documents = mongoose.model("Documents", documentsSchema);

module.exports = Documents;
