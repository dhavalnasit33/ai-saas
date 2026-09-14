// // const mongoose = require('mongoose');

// // const aiProviderSchema = new mongoose.Schema({
// //   name: {
// //     type: String,
// //     required: [true, 'Provider name is required'],
// //     unique: true,
// //     enum: ['openai', 'deepseek']
// //   },
// //   display_name: {
// //     type: String,
// //     required: true
// //   },
// //   api_key: {
// //     type: String,
// //     required: [true, 'API key is required'],
// //     select: false
// //   },
// //   is_active: {
// //     type: Boolean,
// //     default: true
// //   },
// //   max_tokens: {
// //     type: Number,
// //     default: 4000,
// //     min: [1, 'Max tokens must be at least 1']
// //   },
// //   model: {
// //     type: String,
// //     required: [true, 'Model is required']
// //   },
// //   base_url: {
// //     type: String,
// //     required: true
// //   },
// //   rate_limit: {
// //     requests_per_minute: {
// //       type: Number,
// //       default: 60
// //     },
// //     tokens_per_minute: {
// //       type: Number,
// //       default: 90000
// //     }
// //   },
// //   cost_per_token: {
// //     type: Number,
// //     default: 0.00001
// //   },
// //   usage_stats: {
// //     total_requests: {
// //       type: Number,
// //       default: 0
// //     },
// //     total_tokens: {
// //       type: Number,
// //       default: 0
// //     },
// //     last_used: Date
// //   }
// // }, {
// //   timestamps: true
// // });

// // module.exports = mongoose.model('AIProvider', aiProviderSchema);
// const mongoose = require('mongoose');

// const aiProviderSchema = new mongoose.Schema({
//   name: {
//     type: String,
//     required: [true, 'Provider name is required'],
//   },
//   display_name: {
//     type: String,
//     required: true
//   },
//   api_key: {
//     type: String,
//     required: [true, 'API key is required'],
//     select: false
//   },
//   is_active: {
//     type: Boolean,
//     default: true
//   },
//   max_tokens: {
//     type: Number,
//     default: 4000,
//     min: [1, 'Max tokens must be at least 1']
//   },
//   model: {
//     type: String,
//     required: [true, 'Model is required']
//   },
//   base_url: {
//     type: String,
//     required: true
//   },
//   rate_limit: {
//     requests_per_minute: {
//       type: Number,
//       default: 60
//     },
//     tokens_per_minute: {
//       type: Number,
//       default: 90000
//     }
//   },
//   cost_per_token: {
//     type: Number,
//     default: 0.00001
//   },
//   usage_stats: {
//     total_requests: {
//       type: Number,
//       default: 0
//     },
//     total_tokens: {
//       type: Number,
//       default: 0
//     },
//     last_used: Date
//   }
// }, {
//   timestamps: true
// });

// module.exports = mongoose.model('AIProvider', aiProviderSchema);
const mongoose = require("mongoose");

const aiProviderSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Provider name is required"],
      enum: [
        "openai",
        "deepseek",
        "anthropic",
        "perplexity",
        "xai",
        "groq",
        "google",
        "meta",
        "kimi",
        "mistral",
        "qwen",
        "minimax",
        "mimo",
        "glm",
        "nemotron",
        "stability",
        "gpt",
        "nanobanana",
        "nanobananapro",
        "gpt_mini",
        "flux",
        "krea",
        "seedream",
        "runway",
        "veo",
        "kling",
        "pika",
        "seedance",
        "minimax_image",
        "wan",
        "pixverse",
        "ideogram",
        "recraft",
        "bernini",
       "muse"
      ],
    },
    title: {
      type: String,
      required: [true, "Title is required"],
    },
    display_name: {
      type: String,
    },
    api_key: {
      type: String,
      required: [true, "API key is required"],
      select: false,
    },
    is_active: {
      type: Boolean,
      default: true,
    },
    max_tokens: {
      type: Number,
      default: 4000,
      min: [1, "Max tokens must be at least 1"],
    },
    base_url: {
      type: String,
      required: true,
    },
    image: {
      type: String,
      required: [true, "Image is required"],
    },
    description: {
      type: String,
      required: [true, "Description is required"],
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
  },
  {
    timestamps: true,
  },
);

module.exports = mongoose.model("AIProvider", aiProviderSchema);
