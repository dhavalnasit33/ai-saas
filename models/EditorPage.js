const mongoose = require("mongoose");

const EditorPageSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    title: { type: String, default: "Untitled" },
    parentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "EditorPage",
      default: null,
    },
    content: { type: Object, default: {} },
    isPublic: { type: Boolean, default: false },
    // NEW: Flag for trash
    isInTrash: { type: Boolean, default: false },
    isFavorite: { type: Boolean, default: false },
    order: { type: Number, default: 0 },
    sharedWith: [
      {
        user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        access: { type: String, enum: ["view", "edit"], default: "view" },
      },
    ],
     publicAccess: {
      type: String,
      enum: ["none", "view", "edit"],
      default: "none",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("EditorPage", EditorPageSchema);
