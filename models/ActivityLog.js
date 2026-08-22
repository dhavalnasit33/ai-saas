const mongoose = require("mongoose");

const ActivityLogSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    action: { 
      type: String, 
      required: true,
      enum: ['UPLOAD', 'DELETE', 'RESTORE', 'PERMANENT_DELETE', 'VIEW', 'RENAME', 'MOVE'] 
    },
    fileId: { type: mongoose.Schema.Types.ObjectId, ref: "StorageFile" },
    folderId: { type: mongoose.Schema.Types.ObjectId, ref: "StorageFolder" },
    details: { type: String }, // Extra info like "Renamed from A to B"
    ipAddress: { type: String },
  },
  { timestamps: true }
);

module.exports = mongoose.model("ActivityLog", ActivityLogSchema);