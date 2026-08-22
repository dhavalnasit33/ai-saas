const mongoose = require("mongoose");

const savedDestinationSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User", // reference to User model
      required: true,
    },
    destination: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "DiscoverDestinationCollection", // reference to destination collections
      required: true,
    },
    // Optional: keep any AI-generated response if needed
    ai_response: {
      type: String,
    },
    is_saved: {
      type: Boolean,
      default: true, // false = unsaved
    },
  },
  { timestamps: true }
);

// Prevent duplicate saves for the same user + destination
savedDestinationSchema.index({ user: 1, destination: 1 }, { unique: true });

module.exports = mongoose.model("SavedDestination", savedDestinationSchema);
