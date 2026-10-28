const mongoose = require('mongoose');

const AnalyzeFileMessageSchema = new mongoose.Schema({
  role: {
    type: String,
    enum: ['user', 'assistant', 'system'],
    required: true,
  },
  content: {
    type: String,
    default: '',
  },
  imageUrl: {
    type: String,
    default: null,
  },
  charts: [
    {
      chartType: {
        type: String,
        default: 'bar',
      },
      title: { type: String, default: '' },
      labels: [{ type: String }],
      values: [{ type: Number }],
      unit: { type: String, default: '' },
      source: { type: String, default: '' },
      isVerified: { type: Boolean, default: true },
      thesysMetadata: { type: mongoose.Schema.Types.Mixed, default: null },
    },
  ],
  tables: [
    {
      title: { type: String, default: '' },
      headers: [{ type: String }],
      rows: [[mongoose.Schema.Types.Mixed]],
      isVerified: { type: Boolean, default: true },
    },
  ],
  verifiedOperations: [
    {
      operation: { type: String },
      source: { type: String },
      scannedRows: { type: Number },
      result: { type: mongoose.Schema.Types.Mixed },
      warnings: [{ type: String }],
      complete: { type: Boolean, default: true },
    },
  ],
  thesysMetadata: {
    type: mongoose.Schema.Types.Mixed,
    default: null,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const AnalyzeFileTelemetrySchema = new mongoose.Schema(
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

const AnalyzeSingleFileItemSchema = new mongoose.Schema({
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
  fileType: {
    type: String,
    default: 'pdf',
  },
  pageCount: {
    type: Number,
    default: 1,
  },
  rowCount: {
    type: Number,
    default: 0,
  },
  columnCount: {
    type: Number,
    default: 0,
  },
  sheetNames: [{
    type: String,
  }],
  columns: [{
    type: String,
  }],
  tabularPreview: [mongoose.Schema.Types.Mixed],
  datasetCoverage: {
    totalRows: { type: Number, default: 0 },
    analyzedRows: { type: Number, default: 0 },
    isComplete: { type: Boolean, default: true },
    limitReason: { type: String, default: null },
  },
  formulaWarnings: [{
    type: String,
  }],
  wordCount: {
    type: Number,
    default: 0,
  },
  tokenCount: {
    type: Number,
    default: 0,
  },
  extractedText: {
    type: String,
    default: '',
  },
  canonicalContent: {
    type: String,
    default: '',
  },
  rawTableData: {
    type: mongoose.Schema.Types.Mixed,
    default: null,
  },
  visualImageUrls: [{
    type: String,
  }],
});

const AnalyzeFileSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    title: {
      type: String,
      default: 'New File Analysis',
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
    initialPrompt: {
      type: String,
      default: '',
    },
    fileSize: {
      type: Number,
      default: 0,
    },
    fileType: {
      type: String,
      enum: ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'csv', 'txt', 'json', 'image', 'text_input'],
      default: 'pdf',
    },
    pageCount: {
      type: Number,
      default: 1,
    },
    rowCount: {
      type: Number,
      default: 0,
    },
    columnCount: {
      type: Number,
      default: 0,
    },
    sheetNames: [{
      type: String,
    }],
    columns: [{
      type: String,
    }],
    tabularPreview: [mongoose.Schema.Types.Mixed],
    datasetCoverage: {
      totalRows: { type: Number, default: 0 },
      analyzedRows: { type: Number, default: 0 },
      isComplete: { type: Boolean, default: true },
      limitReason: { type: String, default: null },
    },
    formulaWarnings: [{
      type: String,
    }],
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
    rawTableData: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
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
    // Multi-file support: stores up to 5 uploaded files in this session
    files: [AnalyzeSingleFileItemSchema],
    messages: [AnalyzeFileMessageSchema],
    telemetry: [AnalyzeFileTelemetrySchema],
  },
  {
    timestamps: true,
  }
);

AnalyzeFileSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model('AnalyzeFile', AnalyzeFileSchema);
