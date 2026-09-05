const mongoose = require('mongoose');

const ChatPDFMessageSchema = new mongoose.Schema({
  role: {
    type: String,
    enum: ['user', 'assistant', 'system'],
    required: true,
  },
  content: {
    type: String,
    required: true,
  },
  imageUrl: {
    type: String,
    default: null,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const ChatPDFTelemetrySchema = new mongoose.Schema(
  {
    model: {
      type: String,
      default: 'deepseek-v4-flash-vision-exp',
    },
    cacheHitTokens: {
      type: Number,
      default: 0,
    },
    cacheMissTokens: {
      type: Number,
      default: 0,
    },
    outputTokens: {
      type: Number,
      default: 0,
    },
    totalTokens: {
      type: Number,
      default: 0,
    },
    latency: {
      type: Number,
      default: 0,
    },
    estimatedCost: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

const ChatPDFSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    title: {
      type: String,
      default: 'New Chat',
      trim: true,
    },
    originalFileName: {
      type: String,
      required: true,
      trim: true,
    },
    fileUrl: {
      type: String,
      default: '',
    },
    fileSize: {
      type: Number,
      default: 0,
    },
    pageCount: {
      type: Number,
      default: 1,
    },
    wordCount: {
      type: Number,
      default: 0,
    },
    tokenCount: {
      type: Number,
      default: 0,
    },
    contentHash: {
      type: String,
      default: '',
    },
    extractedText: {
      type: String,
      default: '',
    },
    canonicalContent: {
      type: String,
      default: '',
    },
    visualImageUrls: [{
      type: String,
    }],
    status: {
      type: String,
      enum: ['UPLOADING', 'PROCESSING', 'READY', 'FAILED'],
      default: 'READY',
    },
    errorMessage: {
      type: String,
      default: null,
    },
    messages: [ChatPDFMessageSchema],
    telemetry: [ChatPDFTelemetrySchema],
  },
  {
    timestamps: true,
  }
);

ChatPDFSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model('ChatPDF', ChatPDFSchema);
