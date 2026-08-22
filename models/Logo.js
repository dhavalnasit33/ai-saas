const mongoose = require("mongoose");

const LogoSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    generationId: {
      type: String,
      required: true,
    },

    parentImageId: {
      type: String,
      default: null, // only for refine
    },

    imageId: {
      type: String,
      required: true,
    },

    imageUrl: {
      type: String,
      required: true,
    },

    type: {
      type: String,
      enum: ["generated", "refined"],
      required: true,
    },

    inputs: {
      businessName: String,
      tagline: String,
      industry: String,
      style: String,
      colors: [String],
      refineInstruction: String,
       description: String, 
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Logo", LogoSchema);
