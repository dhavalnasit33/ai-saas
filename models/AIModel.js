const mongoose = require("mongoose")

const aiModelSchema = new mongoose.Schema(
  {
    ai_provider_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "AIProvider",
      required: [true, "AI Provider ID is required"],
    },
    model: {
      type: String,
      required: [true, "Model name is required"],
    },
    requests_per_minute: {
      type: Number,
      default: 60,
      min: [1, "Requests per minute must be at least 1"],
    },
    tokens_per_minute: {
      type: Number,
      default: 90000,
    },
    cost_per_token: {
      type: Number,
      default: 0.00003,
    },
    is_active: {
      type: Boolean,
      default: true,
    },
    capabilities: {
      text_generation: {
        type: Boolean,
        default: true,
      },
      image_input: {
        type: Boolean,
        default: false,
      },
      function_calling: {
        type: Boolean,
        default: false,
      },
      streaming: {
        type: Boolean,
        default: true,
      },
    },
    usage_stats: {
      total_requests: {
        type: Number,
        default: 0,
      },
      total_tokens: {
        type: Number,
        default: 0,
      },
      last_used: Date,
    },
     is_default: { type: Boolean, default: false }
  },
  {
    timestamps: true,
  },
)

// Compound index for provider and model
aiModelSchema.index({ ai_provider_id: 1, model: 1,is_active: 1 }, { unique: true })

module.exports = mongoose.model("AIModel", aiModelSchema)
