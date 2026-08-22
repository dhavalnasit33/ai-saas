const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const UserAsset = require("../models/UserAsset");
const { protect } = require("../middleware/auth");

// --- 1. Configure Storage ---
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const folder = file.mimetype.startsWith("video") ? "videos" : "images";
    const dir = path.join(process.cwd(), "uploads", "assets", folder);

    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${req.user.id}_${Date.now()}${path.extname(
      file.originalname
    )}`;
    cb(null, uniqueName);
  },
});

// 👇 UPDATED LIMIT HERE 👇
const upload = multer({
  storage,
  limits: {
    fileSize: 500 * 1024 * 1024, // Increased to 500MB
  },
});

// --- 2. Routes ---

// @route   POST /api/upload
// @desc    Upload an Image or Video
// Added error handling middleware specifically for Multer limits
router.post(
  "/",
  protect,
  (req, res, next) => {
    upload.single("file")(req, res, (err) => {
      if (err instanceof multer.MulterError) {
        // A Multer error occurred when uploading.
        if (err.code === "LIMIT_FILE_SIZE") {
          return res
            .status(400)
            .json({ message: "File is too large. Max limit is 500MB." });
        }
        return res.status(400).json({ message: err.message });
      } else if (err) {
        // An unknown error occurred when uploading.
        return res.status(500).json({ message: "Unknown upload error" });
      }
      // Everything went fine, proceed to next middleware
      next();
    });
  },
  async (req, res) => {
    try {
      if (!req.file)
        return res.status(400).json({ message: "No file uploaded" });

      const folder = req.file.mimetype.startsWith("video")
        ? "videos"
        : "images";
      const publicUrl = `/uploads/assets/${folder}/${req.file.filename}`;

      const asset = await UserAsset.create({
        userId: req.user.id,
        url: publicUrl,
        type: req.file.mimetype.startsWith("video") ? "video" : "image",
        filename: req.file.originalname,
        size: req.file.size,
      });

      res.json({ success: true, url: publicUrl, asset });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Upload failed" });
    }
  }
);

// @route   GET /api/upload/list
router.get("/list", protect, async (req, res) => {
  try {
    const assets = await UserAsset.find({ userId: req.user.id }).sort({
      createdAt: -1,
    });
    res.json(assets);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
