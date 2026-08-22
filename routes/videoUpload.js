const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { s3Client } = require("../utils/s3Client");
const { PutObjectCommand } = require("@aws-sdk/client-s3");

const router = express.Router();

// Middleware to get folder name from query or body
const getUploadFolder = (req, file, cb) => {
  const folder = req.body.folder || req.query.folder || "videos";
  const uploadDir = path.join(__dirname, "../uploads", folder);

  // Ensure folder exists
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  cb(null, uploadDir);
};

const storage = multer.diskStorage({
  destination: getUploadFolder,
  filename: function (req, file, cb) {
    const filename = `${Date.now()}-${file.originalname.replace(/\s+/g, "-")}`;
    cb(null, filename);
  },
});

const fileFilter = (req, file, cb) => {
  console.log("Incoming video file type:", file.mimetype);

  const allowedMimeTypes = [
    "video/mp4",
    "video/x-matroska",
    "video/quicktime",
    "video/webm",
  ];

  if (allowedMimeTypes.includes(file.mimetype)) {
    return cb(null, true);
  }

  // Failsafe for generic octet-stream
  if (file.mimetype === "application/octet-stream") {
    const ext = path.extname(file.originalname).toLowerCase();
    const allowedExtensions = [".mp4", ".mkv", ".mov", ".webm"];
    if (allowedExtensions.includes(ext)) {
      return cb(null, true);
    }
  }

  cb(new Error("Invalid file type. Only MP4, MKV, MOV and WEBM videos are allowed."));
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 500 * 1024 * 1024 }, // 500MB for videos
});

// DigitalOcean Storage setup
const doMemoryStorage = multer.memoryStorage();
const doUpload = multer({
  storage: doMemoryStorage,
  fileFilter,
  limits: { fileSize: 500 * 1024 * 1024 },
});

// POST /api/video-upload
router.post("/", upload.single("file"), (req, res) => {
  try {
    const file = req.file;
    if (!file) {
      return res.status(400).json({
        success: false,
        error: "No video file uploaded",
      });
    }

    const folder = req.body.folder || req.query.folder || "videos";
    const fileUrl = `/uploads/${folder}/${file.filename}`;
    const fullUrl = `${process.env.SERVER_URL || "http://localhost:5000"}${fileUrl}`;

    res.status(200).json({
      success: true,
      url: fullUrl,
      filename: file.filename,
      mimetype: file.mimetype,
    });
  } catch (err) {
    console.error("💥 Video Upload failed:", err);
    res.status(500).json({ success: false, error: "Video upload failed" });
  }
});

// ---------------------------------------------------------
// 🚀 ROUTE 2: New DigitalOcean Upload (For AI videos)
// ---------------------------------------------------------
router.post("/do", doUpload.single("file"), async (req, res) => {
  try {
    const file = req.file;
    if (!file) return res.status(400).json({ success: false, error: "No video file uploaded" });

    const folder = req.body.folder || req.query.folder || "videos";
    const filename = `${Date.now()}-${file.originalname.replace(/\s+/g, "-")}`;
    const fileKey = `uploads/${folder}/${filename}`;

    const bucketName = process.env.DO_BUCKET_NAME || "onechatai.storage";
    
    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: fileKey,
      Body: file.buffer,
      ContentType: file.mimetype,
      ACL: "public-read",
    });

    await s3Client.send(command);

    const endpoint = (process.env.DO_SPACES_ENDPOINT || "https://nyc3.digitaloceanspaces.com").replace("https://", "");
    // 🔥 FIX: Use path-style URL (https://endpoint/bucket/key) which is required for buckets with dots (.)
    const fullUrl = `https://${endpoint}/${bucketName}/${fileKey}`;

    res.status(200).json({
      success: true,
      url: fullUrl,
      filename: filename,
      mimetype: file.mimetype,
    });
  } catch (err) {
    console.error("💥 DO video upload failed:", err);
    res.status(500).json({ success: false, error: "DO Upload failed" });
  }
});

// DELETE /api/video-upload
router.delete("/", async (req, res) => {
  try {
    const { url, folder } = req.body;

    if (!url) {
      return res.status(400).json({
        success: false,
        error: "Video URL is required",
      });
    }

    const fileName = url.split("/").pop();
    const uploadFolder = folder || url.split("/")[url.split("/").length - 2];
    const filePath = path.join(__dirname, "../uploads", uploadFolder, fileName);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        error: "Video file not found",
      });
    }

    fs.unlinkSync(filePath);

    res.status(200).json({
      success: true,
      message: "Video deleted successfully",
    });
  } catch (err) {
    console.error("💥 Video Delete failed:", err);
    res.status(500).json({
      success: false,
      error: "Failed to delete video file",
    });
  }
});

module.exports = router;
