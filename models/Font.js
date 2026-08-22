const mongoose = require("mongoose");

const FontSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    fontFamily: {
      type: String,
      required: true,
      trim: true,
    },
    fontUrl: {
      type: String,
      required: true,
    },
    originalName: {
      type: String,
      required: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Font", FontSchema);
