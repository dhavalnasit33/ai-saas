const mongoose = require("mongoose");

const savedRecipeSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User", // assuming you already have a User model
      required: true,
    },
    recipe: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "DiscoverRecipeCollection",
      required: true,
    },
    // Optional: keep the AI-generated response content if needed
    ai_response: {
      type: String,
    },
    is_saved: {
      type: Boolean,
      default: true, // if false = unsaved
    },
  },
  { timestamps: true }
);

// Prevent duplicate saves for the same user + recipe
savedRecipeSchema.index({ user: 1, recipe: 1 }, { unique: true });

module.exports = mongoose.model("SavedRecipe", savedRecipeSchema);
