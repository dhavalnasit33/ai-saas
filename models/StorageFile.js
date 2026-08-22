const mongoose = require('mongoose');

const StorageFileSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  folder: { type: mongoose.Schema.Types.ObjectId, ref: 'StorageFolder', default: null },
  filename: { type: String, required: true },
  
  // This stores:
  // LOCAL: "uploads/storage/123-file.jpg"
  // CLOUD: "users/user_id/123-file.jpg"
  storageKey: { type: String, required: true }, 
  thumbnailUrl: { type: String, default: null },
  
  size: { type: Number, required: true }, // Bytes
  mimeType: { type: String, required: true },
  extension: { type: String, required: true },
  isStarred: { type: Boolean, default: false },
  isDeleted: { type: Boolean, default: false },
  deletedAt: { type: Date, default: null },
    orderIndex: { type: Number, default: 0 }, 
    lastAccessedAt: { type: Date, default: Date.now },
    scanStatus: { 
    type: String, 
    enum: ['pending', 'clean', 'infected'], 
    default: 'pending' 
  },
  linkAccess: { 
    type: String, 
    enum: ['restricted', 'anyone'], 
    default: 'restricted' 
  },
  sharedWith: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // If user exists in DB
    email: { type: String, required: true }, // Store email for UI display
    access: { type: String, enum: ['view'], default: 'view' }, // Enforced View Only
    addedAt: { type: Date, default: Date.now },
    token: { type: String }
  }]
}, { timestamps: true });

// --- STORAGE SYNC UTILITIES ---
const decrementUserStorage = async (userId, size) => {
  if (!userId || !size) return;
  try {
    const User = mongoose.model("User");
    const user = await User.findById(userId);
    if (user) {
      const newUsed = Math.max(0, (user.storageUsed || 0) - size);
      await User.findByIdAndUpdate(userId, { storageUsed: newUsed });
    }
  } catch (err) {
    console.error("Error decrementing user storage:", err);
  }
};

const incrementUserStorage = async (userId, size) => {
  if (!userId || !size) return;
  try {
    const User = mongoose.model("User");
    await User.findByIdAndUpdate(userId, { $inc: { storageUsed: size } });
  } catch (err) {
    console.error("Error incrementing user storage:", err);
  }
};

// --- STATIC METHOD FOR RECALCULATION & SELF-HEALING ---
StorageFileSchema.statics.recalculateStorageUsed = async function(userId) {
  try {
    const result = await this.aggregate([
      { $match: { user: new mongoose.Types.ObjectId(userId) } },
      { $group: { _id: null, totalSize: { $sum: "$size" } } }
    ]);
    const totalSize = result.length > 0 ? result[0].totalSize : 0;
    await mongoose.model("User").findByIdAndUpdate(userId, { storageUsed: totalSize });
    return totalSize;
  } catch (err) {
    console.error("Error recalculating storage:", err);
    return 0;
  }
};

// --- SCHEMA HOOKS ---

// 1. Hook on creation/save
StorageFileSchema.post("save", async function(doc) {
  if (doc.size) {
    await incrementUserStorage(doc.user, doc.size);
  }
});

// Helper to pre-fetch documents before they are deleted to retrieve their size
const preDeleteHook = async function() {
  try {
    const query = this.getQuery();
    const docs = await this.model.find(query);
    this._deletedDocs = docs;
  } catch (err) {
    console.error("Error in pre-delete storage hook:", err);
  }
};

// Helper to decrement storage for all deleted documents
const postDeleteHook = async function() {
  try {
    if (this._deletedDocs && this._deletedDocs.length > 0) {
      for (const doc of this._deletedDocs) {
        await decrementUserStorage(doc.user, doc.size);
      }
    }
  } catch (err) {
    console.error("Error in post-delete storage hook:", err);
  }
};

// Register query deletion hooks
StorageFileSchema.pre("deleteOne", { document: false, query: true }, preDeleteHook);
StorageFileSchema.post("deleteOne", { document: false, query: true }, postDeleteHook);

StorageFileSchema.pre("deleteMany", { document: false, query: true }, preDeleteHook);
StorageFileSchema.post("deleteMany", { document: false, query: true }, postDeleteHook);

StorageFileSchema.pre("findOneAndDelete", { document: false, query: true }, preDeleteHook);
StorageFileSchema.post("findOneAndDelete", { document: false, query: true }, postDeleteHook);

StorageFileSchema.pre("findByIdAndDelete", { document: false, query: true }, preDeleteHook);
StorageFileSchema.post("findByIdAndDelete", { document: false, query: true }, postDeleteHook);

module.exports = mongoose.model('StorageFile', StorageFileSchema);