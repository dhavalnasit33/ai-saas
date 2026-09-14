// const mongoose = require("mongoose")

// // Individual message within a chat
// const messageSchema = new mongoose.Schema(
//   {
//     type: {
//       type: String,
//       enum: ["user", "assistant"],
//       required: true,
//     },
//     content: {
//       type: String,
//       required: true,
//     },
//     timestamp: {
//       type: Date,
//       default: Date.now,
//     },
//     // Optional metadata for assistant messages
//     metadata: {
//       tool_id: {
//         type: mongoose.Schema.Types.ObjectId,
//         ref: "Tool",
//       },
//       tool_category_id: {
//         type: mongoose.Schema.Types.ObjectId,
//         ref: "ToolCategory",
//       },
//       api_used: {
//         type: String,
//         enum: ["openai", "deepseek", "anthropic", "perplexity", "xai", "groq", "google","meta"],
//       },
//       model_used: String,
//       tokens_used: {
//         type: Number,
//         default: 0,
//       },
//       response_time: {
//         type: Number,
//         default: 0,
//       },
//       success: {
//         type: Boolean,
//         default: true,
//       },
//       error_message: String,
//     },
//   },
//   { _id: true },
// )

// // Main chat history schema
// const chatHistorySchema = new mongoose.Schema(
//   {
//     user_id: {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: "User",
//       required: true,
//     },
//     title: {
//       type: String,
//       required: true,
//       // maxlength: [200, "Chat title cannot exceed 200 characters"],
//       default: "New Chat",
//     },
//     messages: [messageSchema],

//     // Chat metadata
//     total_messages: {
//       type: Number,
//       default: 0,
//     },
//     total_tokens_used: {
//       type: Number,
//       default: 0,
//     },
//     last_activity: {
//       type: Date,
//       default: Date.now,
//     },

//     // Chat settings
//     is_archived: {
//       type: Boolean,
//       default: false,
//     },
//     is_favorite: {
//       type: Boolean,
//       default: false,
//     },

//     // Tags for organization
//     tags: [
//       {
//         type: String,
//         maxlength: 50,
//       },
//     ],
//   },
//   {
//     timestamps: true,
//   },
// )

// // Indexes for efficient queries
// chatHistorySchema.index({ user_id: 1, createdAt: -1 })
// chatHistorySchema.index({ user_id: 1, last_activity: -1 })
// chatHistorySchema.index({ user_id: 1, is_archived: 1 })

// // Pre-save middleware to update metadata
// chatHistorySchema.pre("save", function (next) {
//   if (this.isModified("messages")) {
//     this.total_messages = this.messages.length
//     this.total_tokens_used = this.messages.reduce((total, msg) => {
//       return total + (msg.metadata?.tokens_used || 0)
//     }, 0)
//     this.last_activity = new Date()

//     // Auto-generate title from first user message if title is default
//     if (this.title === "New Chat" && this.messages.length > 0) {
//       const firstUserMessage = this.messages.find((msg) => msg.type === "user")
//       if (firstUserMessage) {
//         this.title = firstUserMessage.content.substring(0, 50) + (firstUserMessage.content.length > 50 ? "..." : "")
//       }
//     }
//   }
//   next()
// })

// // Instance methods
// chatHistorySchema.methods.addMessage = function (messageData) {
//   this.messages.push(messageData)
//   return this.save()
// }

// module.exports = mongoose.model("ChatHistory", chatHistorySchema)
const mongoose = require("mongoose");

// Individual message within a chat
const messageSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ["user", "assistant"],
      required: true,
    },
    content: {
      type: String,
      required: true,
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
    // Optional metadata for assistant messages
    metadata: {
      tool_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Tool",
      },
      tool_category_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "ToolCategory",
      },
      api_used: {
        type: String,
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
          "kimi",
          "muse",
          "c1",
        ],
      },
      model_used: String,
      tokens_used: {
        type: Number,
        default: 0,
      },
      response_time: {
        type: Number,
        default: 0,
      },
      success: {
        type: Boolean,
        default: true,
      },
      error_message: String,
      // Search results from AI responses
      search_results: [
        {
          title: String,
          url: String,
          date: String,
          last_updated: String,
          snippet: String,
        },
      ],
      is_saved_image: {
        type: Boolean,
        default: false,
      },
    },
  },
  { _id: true },
);

// Main chat history schema
const chatHistorySchema = new mongoose.Schema(
  {
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false,
    },
    title: {
      type: String,
      required: true,
      default: "New Chat",
    },
    job_id: {
      type: String,
      default: null,
      index: true,
    },
    subtab: {
      type: String,
      maxlength: 100,
      default: null,
    },
    messages: [messageSchema],

    // Chat metadata
    total_messages: {
      type: Number,
      default: 0,
    },
    total_tokens_used: {
      type: Number,
      default: 0,
    },
    last_activity: {
      type: Date,
      default: Date.now,
    },

    // Chat settings
    is_archived: {
      type: Boolean,
      default: false,
    },
    is_favorite: {
      type: Boolean,
      default: false,
    },
    ischatehistry: {
      type: Boolean,
      default: true,
    },
    // is_model_chat: {
    //   type: Boolean,
    //   default: false,
    // },
    // Tags for organization
    tags: [
      {
        type: String,
        maxlength: 50,
      },
    ],
  },
  {
    timestamps: true,
  },
);

// Indexes for efficient queries
chatHistorySchema.index({ user_id: 1, createdAt: -1 });
chatHistorySchema.index({ user_id: 1, last_activity: -1 });
chatHistorySchema.index({ user_id: 1, is_archived: 1 });
chatHistorySchema.index({ "messages.metadata.search_results.url": 1 });

// Pre-save middleware to update metadata
chatHistorySchema.pre("save", function (next) {
  if (this.isModified("messages")) {
    this.total_messages = this.messages.length;
    this.total_tokens_used = this.messages.reduce((total, msg) => {
      return total + (msg.metadata?.tokens_used || 0);
    }, 0);
    this.last_activity = new Date();

    // Auto-generate title from first user message if title is default
    if (this.title === "New Chat" && this.messages.length > 0) {
      const firstUserMessage = this.messages.find((msg) => msg.type === "user");
      if (firstUserMessage) {
        this.title =
          firstUserMessage.content.substring(0, 50) +
          (firstUserMessage.content.length > 50 ? "..." : "");
      }
    }
  }
  next();
});

// Instance methods
chatHistorySchema.methods.addMessage = function (messageData) {
  this.messages.push(messageData);
  return this.save();
};

// Static method to get search results analytics
chatHistorySchema.statics.getSearchAnalytics = async function (
  userId,
  days = 30,
) {
  const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  return this.aggregate([
    {
      $match: {
        user_id: userId,
        last_activity: { $gte: startDate },
      },
    },
    {
      $unwind: "$messages",
    },
    {
      $match: {
        "messages.metadata.search_results": { $exists: true, $ne: [] },
      },
    },
    {
      $unwind: "$messages.metadata.search_results",
    },
    {
      $group: {
        _id: {
          domain: {
            $regexFind: {
              input: "$messages.metadata.search_results.url",
              regex: "https?://([^/]+)",
            },
          },
        },
        count: { $sum: 1 },
        recent_searches: {
          $push: {
            title: "$messages.metadata.search_results.title",
            url: "$messages.metadata.search_results.url",
            timestamp: "$messages.timestamp",
          },
        },
      },
    },
    {
      $sort: { count: -1 },
    },
    {
      $limit: 20,
    },
  ]);
};

module.exports = mongoose.model("ChatHistory", chatHistorySchema);
