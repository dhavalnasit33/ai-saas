const mongoose = require('mongoose');

const SharedAnalyzeItemSchema = new mongoose.Schema(
  {
    shareId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    chatId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'AnalyzeFile',
      default: null,
    },
    itemType: {
      type: String,
      enum: ['chart', 'graph', 'report', 'table', 'summary', 'general'],
      default: 'chart',
    },
    title: {
      type: String,
      default: 'AI Analysis Report',
    },
    description: {
      type: String,
      default: '',
    },
    c1Content: {
      type: String,
      default: '',
    },
    chartData: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    imageUrl: {
      type: String,
      default: null,
    },
    isPublic: {
      type: Boolean,
      default: true,
    },
    viewsCount: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('SharedAnalyzeItem', SharedAnalyzeItemSchema);
