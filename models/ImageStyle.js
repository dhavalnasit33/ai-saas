const mongoose = require("mongoose");

const imageStyleSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      maxlength: 100,
      trim: true,
    },
    image: { // <--- Added this field
      type: String,
      required: [true, "Style image is required"],
    },
    type: {
      type: String,
      enum: ["image", "video"],
      default: "image",
    },
    is_active: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("ImageStyle", imageStyleSchema);