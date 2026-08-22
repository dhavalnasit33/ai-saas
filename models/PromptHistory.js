const mongoose = require('mongoose');

const promptHistorySchema = new mongoose.Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  prompt: {
    type: String,
    required: [true, 'Prompt is required'],
    maxlength: [5000, 'Prompt cannot exceed 5000 characters']
  },
  response: {
    type: String,
    required: [true, 'Response is required']
  },
  tool_category_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ToolCategory',
    required: true
  },
  api_used: {
    type: String,
    enum: ['openai', 'deepseek'],
    required: true
  },
  tokens_used: {
    type: Number,
    required: true,
    min: [1, 'Tokens used must be at least 1']
  },
  model_used: {
    type: String,
    required: true
  },
  response_time: {
    type: Number, // in milliseconds
    default: 0
  },
  success: {
    type: Boolean,
    default: true
  },
  error_message: {
    type: String,
    default: null
  }
}, {
  timestamps: true
});

// Index for efficient queries
promptHistorySchema.index({ user_id: 1, createdAt: -1 });
promptHistorySchema.index({ tool_category_id: 1 });
promptHistorySchema.index({ api_used: 1 });

module.exports = mongoose.model('PromptHistory', promptHistorySchema);
