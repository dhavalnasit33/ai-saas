const mongoose = require("mongoose");

const StorageFolderSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    name: { type: String, required: true },
    parentFolder: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "StorageFolder",
      default: null,
    },
    isStarred: { type: Boolean, default: false },
    path: { type: String, default: "/" },
    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date, default: null },
     orderIndex: { type: Number, default: 0 }, 
     linkAccess: { 
        type: String, 
        enum: ['restricted', 'anyone'], 
        default: 'restricted' 
    },
    sharedWith: [{
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        email: { type: String, required: true },
        access: { type: String, enum: ['view'], default: 'view' },
        addedAt: { type: Date, default: Date.now },
        token: { type: String }
    }]
  },
  { timestamps: true }
);

module.exports = mongoose.model("StorageFolder", StorageFolderSchema);
