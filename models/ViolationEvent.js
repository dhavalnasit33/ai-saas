const mongoose = require("mongoose");

const violationEventSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    categories: {
      type: [String],
      required: true,
    },
    scores: {
      type: Map,
      of: Number,
      required: true,
    },
    tool: {
      type: String,
      required: true,
    },
    source: {
      type: String,
      enum: ["input_check", "output_check", "provider_reject"],
      required: true,
    },
    action: {
      type: String,
      default: "blocked",
    },
    promptHash: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    collection: "violation_events",
  }
);

module.exports = mongoose.model("ViolationEvent", violationEventSchema);
