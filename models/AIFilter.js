const mongoose = require("mongoose");

const aiFilterSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      maxlength: 100,
      trim: true,
    },
    image: {
      type: String,
      required: [true, "Filter image is required"],
    },
    original_image: {
      type: String,
    },
    description: {
      type: String,
    },
    strength: {
      type: Number,
      default: 0.85,
    },
    is_active: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("AIFilter", aiFilterSchema);
