const mongoose = require('mongoose');

const SourceSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  fileUrl: {
    type: String,
    default: '',
  },
  fileType: {
    type: String,
    enum: ['pdf', 'doc', 'docx', 'txt', 'image', 'pasted_text', 'xlsx', 'other'],
    default: 'other',
  },
  canonicalContent: {
    type: String,
    default: '',
  },
  extractedText: {
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
  processingVersion: {
    type: String,
    default: 'v1.0.0',
  },
  status: {
    type: String,
    enum: ['UPLOADING', 'PROCESSING', 'READY', 'FAILED', 'REMOVED'],
    default: 'READY',
  },
  errorMessage: {
    type: String,
    default: null,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const NotebookSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    title: {
      type: String,
      default: 'Untitled Notebook',
      trim: true,
    },
    description: {
      type: String,
      default: '',
    },
    sourceRevision: {
      type: String,
      default: 'v1',
    },
    sources: [SourceSchema],
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Notebook', NotebookSchema);
