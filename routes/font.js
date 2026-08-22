const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const Font = require("../models/Font");
const { protect } = require("../middleware/auth");

const BASE_DIR = path.join(process.cwd(), "uploads", "fonts");

// Ensure directory exists
if (!fs.existsSync(BASE_DIR)) {
  fs.mkdirSync(BASE_DIR, { recursive: true });
}

/* ===============================
   MULTER CONFIG
================================ */
const storage = multer.diskStorage({
  destination: (_, __, cb) => cb(null, BASE_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const name = file.originalname.replace(ext, "");
    cb(null, `${req.user.id}_${Date.now()}_${name}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (_, file, cb) => {
    const allowed = [".ttf", ".otf", ".woff", ".woff2"];
    const ext = path.extname(file.originalname).toLowerCase();
    allowed.includes(ext)
      ? cb(null, true)
      : cb(new Error("Invalid font format"));
  },
});

// GET /api/fonts/list
router.get("/list", protect, async (req, res) => {
  try {
    const fonts = await Font.find({ userId: req.user.id })
      .select("_id fontFamily fontUrl originalName")
      .sort({ createdAt: -1 });

    res.json(fonts);
  } catch (err) {
    res.status(500).json({ success: false });
  }
});

/* ===============================
   POST /api/fonts/upload
================================ */
router.post("/upload", protect, upload.single("file"), async (req, res) => {
  try {
    const fontFamily = path
      .basename(req.file.originalname, path.extname(req.file.originalname))
      .replace(/\s+/g, "-");

    const fontUrl = `/uploads/fonts/${req.file.filename}`;

    const font = await Font.create({
      userId: req.user.id,
      fontFamily,
      fontUrl,
      originalName: req.file.originalname,
    });

    res.json({
      success: true,
      font: {
        fontFamily: font.fontFamily,
        url: font.fontUrl,
      },
    });
  } catch (err) {
    console.error("Font upload error:", err);
    res.status(500).json({ success: false, message: "Upload failed" });
  }
});

router.delete("/:id", protect, async (req, res) => {
  try {
    const font = await Font.findOneAndDelete({
      _id: req.params.id,
      userId: req.user.id,
    });


    if (!font) {
      return res.status(404).json({ message: "Font not found" });
    }

    const filePath = path.join(
      process.cwd(),
      font.fontUrl.replace(/^\//, "")
    );

    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    res.json({ success: true });
  } catch (err) {
    console.error("Delete font error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router; // ✅ REQUIRED
