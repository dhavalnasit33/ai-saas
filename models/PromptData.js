const mongoose = require("mongoose");
const slugify = require("slugify");

const promptDataSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
      maxlength: 200,
    },
    slug: {
      type: String,
      unique: true,
      lowercase: true,
      trim: true,
    },
    // Updated: Array of categories, not required
    category: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "PromptCategory",
      },
    ],
    image: {
      type: String,
      default: ""
    //   required: [true, "Image is required"],
    },
    short_description: {
      type: String,
      required: [true, "Short description is required"],
      maxlength: 500,
    },
    description: {
      type: String, // Long description
      required: [true, "Long description is required"],
    },
    is_active: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

// Auto-generate slug from name
promptDataSchema.pre("validate", function (next) {
  if (this.name) {
    this.slug = slugify(this.name, {
      lower: true,
      strict: true,
      trim: true,
    });
  }
  next();
});

module.exports = mongoose.model("PromptData", promptDataSchema);