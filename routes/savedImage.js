const express = require("express");
const SavedImage = require("../models/SavedImage");
const StorageFile = require("../models/StorageFile");
const { protect } = require("../middleware/auth");
const ChatHistory = require("../models/ChatHistory");
const router = express.Router();
const path = require("path");

// --------------------------------------------------------------------------
// @route   POST /api/images/toggle
// @desc    Toggle Save/Unsave (If saved, remove it. If not, save it).
//          Also creates/removes a record in the Storage module.
// @access  Private
// --------------------------------------------------------------------------
router.post("/toggle", protect, async (req, res) => {
  try {
    // 1. Destructure 'title' from req.body
    const { imageUrl, chatId, title } = req.body;
    const userId = req.user.id;

    if (!imageUrl) {
      return res
        .status(400)
        .json({ success: false, message: "Image URL is required" });
    }

    // Check if this image is already saved by this user
    const existingSave = await SavedImage.findOne({
      user: userId,
      image_url: imageUrl,
    });

    if (existingSave) {
      // 1. UNSAVE
      await SavedImage.findByIdAndDelete(existingSave._id);

      // 2. Remove from Storage module
      await StorageFile.findOneAndDelete({
        user: userId,
        storageKey: imageUrl,
      });

      // 3. Update ChatHistory messages metadata
      await ChatHistory.updateMany(
        { "messages.content": imageUrl },
        { $set: { "messages.$.metadata.is_saved_image": false } },
      );

      return res.json({
        success: true,
        is_saved: false,
        message: "Image removed from saved collection and storage",
      });
    } else {
      // 1. SAVE
      const newSave = await SavedImage.create({
        user: userId,
        image_url: imageUrl,
        original_chat_id: chatId || null,
      });

      // 2. Add to Storage module so it appears in the "Storage" tab

      // Extract the base filename and extension from the URL
      const urlFilename = path.basename(imageUrl).split("?")[0] || "saved_file";
      const extension = (
        path.extname(urlFilename).replace(".", "") || "png"
      ).toLowerCase();

      // Determine the final filename based on whether 'title' was passed
      let finalFilename = urlFilename;
      if (title) {
        // Ensure the title includes the correct extension so it saves properly
        finalFilename = title.endsWith(`.${extension}`)
          ? title
          : `${title}.${extension}`;
      }

      let mimeType = "image/png";
      if (["mp4", "webm", "mov", "mkv"].includes(extension)) {
        mimeType = "video/mp4";
        if (extension === "webm") mimeType = "video/webm";
      } else if (["jpg", "jpeg"].includes(extension)) {
        mimeType = "image/jpeg";
      } else if (extension === "webp") {
        mimeType = "image/webp";
      }

      const newStorageFile = await StorageFile.create({
  user: userId,
  folder: null,
  filename: finalFilename,
  storageKey: imageUrl,
  size: 2 * 1024 * 1024,
  mimeType: mimeType,
  extension: extension,
  scanStatus: "clean",
  // linkAccess: "anyone", // 👈 બાય-ડિફોલ્ટ પબ્લિક એક્સેસ મળે
});


      // 3. Update ChatHistory messages metadata
      await ChatHistory.updateMany(
        { "messages.content": imageUrl },
        { $set: { "messages.$.metadata.is_saved_image": true } },
      );

     return res.json({
  success: true,
  data: newSave,
  storageId: newStorageFile._id, // 👈 આ સાચું Storage ID Flutter ને મળશે!
  storageFile: newStorageFile,
  message: "Image saved successfully to collection and storage",
});
    }
  } catch (err) {
    console.error("💥 Toggle Save Error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// --------------------------------------------------------------------------
// @route   GET /api/images/saved
// @desc    Get all saved images for the current user (Gallery View)
// @access  Private
// --------------------------------------------------------------------------
router.get("/", protect, async (req, res) => {
  try {
    const userId = req.user.id;

    const savedImages = await SavedImage.find({ user: userId }).sort({
      createdAt: -1,
    });

    res.json({
      success: true,
      total: savedImages.length,
      savedImages,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
