const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { s3Client, s3ClientCms } = require("../utils/s3Client");
const { PutObjectCommand, DeleteObjectCommand } = require("@aws-sdk/client-s3");

const router = express.Router();

// ==========================================
// 1. ORIGINAL LOCAL STORAGE (Preserved)
// ==========================================
const getLocalUploadFolder = (req, file, cb) => {
  const folder = req.body.folder || req.query.folder || "default";
  const uploadDir = path.join(__dirname, "../uploads", folder);

  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  cb(null, uploadDir);
};

const localStorage = multer.diskStorage({
  destination: getLocalUploadFolder,
  filename: function (req, file, cb) {
    const filename = `${Date.now()}-${file.originalname.replace(/\s+/g, "-")}`;
    cb(null, filename);
  },
});

const fileFilter = (req, file, cb) => {
  const allowedMimeTypes = [
    "image/png", "image/jpeg", "image/jpg", "image/svg+xml", "image/webp",
    "application/pdf", "text/plain", "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ];

  if (allowedMimeTypes.includes(file.mimetype)) {
    return cb(null, true);
  }

  if (file.mimetype === "application/octet-stream") {
    const ext = path.extname(file.originalname).toLowerCase();
    const allowedExtensions = [".png", ".jpg", ".jpeg", ".svg", ".webp", ".pdf", ".txt", ".doc", ".docx"];
    if (allowedExtensions.includes(ext)) {
      return cb(null, true);
    }
  }

  cb(new Error("Invalid file type."));
};

const localUpload = multer({
  storage: localStorage,
  fileFilter,
  limits: { fileSize: 200 * 1024 * 1024 },
});

// ==========================================
// 2. NEW DIGITALOCEAN STORAGE
// ==========================================
const doMemoryStorage = multer.memoryStorage();
const doUpload = multer({
  storage: doMemoryStorage,
  fileFilter,
  limits: { fileSize: 200 * 1024 * 1024 },
});

// ---------------------------------------------------------
// 🚀 ROUTE 1: Original Local Upload (Keep existing behavior)
// ---------------------------------------------------------
router.post("/", localUpload.single("file"), (req, res) => {
  try {
    const file = req.file;
    if (!file) return res.status(400).json({ success: false, error: "No file uploaded" });

    const folder = req.body.folder || req.query.folder || "default";
    const fileUrl = `/uploads/${folder}/${file.filename}`;
    const fullUrl = `${process.env.SERVER_URL || "http://localhost:5000"}${fileUrl}`;

    res.status(200).json({
      success: true,
      url: fullUrl,
      filename: file.filename,
      mimetype: file.mimetype,
    });
  } catch (err) {
    console.error("💥 Local upload failed:", err);
    res.status(500).json({ success: false, error: "Upload failed" });
  }
});

// ---------------------------------------------------------
// 🚀 ROUTE 2: DigitalOcean Upload (For AI images → onechatai.storage)
// ---------------------------------------------------------
router.post("/do", doUpload.single("file"), async (req, res) => {
  try {
    const file = req.file;
    if (!file) return res.status(400).json({ success: false, error: "No file uploaded" });

    const folder = req.body.folder || req.query.folder || "default";
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
    console.error("💥 DO upload failed:", err);
    res.status(500).json({ success: false, error: "DO Upload failed" });
  }
});

// ---------------------------------------------------------
// 🚀 ROUTE 3: CMS DigitalOcean Upload (For Unlayer project assets → onechatai-cms)
// ---------------------------------------------------------
router.post("/do/cms", doUpload.single("file"), async (req, res) => {
  try {
    const file = req.file;
    if (!file) return res.status(400).json({ success: false, error: "No file uploaded" });

    const projectId = req.body.projectId || "general";
    const filename = `${Date.now()}-${file.originalname.replace(/\s+/g, "-")}`;
    const fileKey = `assets/${projectId}/${filename}`;

    const bucketName = process.env.DO_BUCKET_NAME_CMS || "onechatai-cms";

    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: fileKey,
      Body: file.buffer,
      ContentType: file.mimetype,
      ACL: "public-read",
    });

    await s3ClientCms.send(command);

    const endpoint = (process.env.DO_SPACES_ENDPOINT || "https://nyc3.digitaloceanspaces.com").replace("https://", "");
    const fullUrl = `https://${endpoint}/${bucketName}/${fileKey}`;

    res.status(200).json({
      success: true,
      url: fullUrl,
      filename: filename,
      mimetype: file.mimetype,
    });
  } catch (err) {
    console.error("💥 CMS DO upload failed:", err);
    res.status(500).json({ success: false, error: "CMS Upload failed" });
  }
});

// DELETE remains local-only for now, we can add delete/do if needed
router.delete("/", async (req, res) => {
    // ... existing local delete ...
    try {
        const { url, folder } = req.body;
        if (!url) return res.status(400).json({ success: false, error: "File URL is required" });

        const fileName = url.split("/").pop();
        const uploadFolder = folder || url.split("/")[url.split("/").length - 2];
        const filePath = path.join(__dirname, "../uploads", uploadFolder, fileName);

        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
            return res.status(200).json({ success: true, message: "Local file deleted" });
        }
        res.status(404).json({ success: false, error: "File not found locally" });
    } catch (err) {
        res.status(500).json({ success: false, error: "Delete failed" });
    }
});

module.exports = router;
