const multer = require("multer");
const path = require("path");
const fs = require("fs");

// 1. Ensure upload directory exists
const uploadDir = path.join("uploads", "storage");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// 2. Configure Storage (File Naming)
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir); // Saves to /uploads/storage/
  },
  filename: function (req, file, cb) {
    // Generate a unique filename: timestamp-random-originalName
    // Example: 1704928392-847392-document.pdf
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

// 3. Security Filter (Strict Allowlist)
const fileFilter = (req, file, cb) => {
  // 🔥 SECURITY: Only allow these specific extensions.
  // This prevents hackers from uploading malicious scripts (html, js, php, py, sh, exe).
  const allowedExtensions = [
    // Images
    ".jpg",
    ".jpeg",
    ".png",
    ".webp", // ✅ Added .webp
    // Documents & Text
    ".doc",
    ".docx",
    ".pdf",
    ".txt", // ✅ Added .txt
    // Presentations & Sheets
    ".ppt",
    ".pptx",
    ".xls",
    ".xlsx",
    // Videos
    ".mp4",
    ".mov",
    ".webm",
  ];

  // Get extension from the filename (e.g., ".pdf")
  const ext = path.extname(file.originalname).toLowerCase();

  // Check if extension is in the allowlist
  if (allowedExtensions.includes(ext)) {
    cb(null, true); // Accept file
  } else {
    // Reject file
    cb(new Error(`Security Risk: File type '${ext}' is not allowed.`), false);
  }
};

// 4. Initialize Multer
const upload = multer({
  storage: storage,
  limits: { fileSize: 100 * 1024 * 1024 }, // Limit size to 100MB
  fileFilter: fileFilter,
});

module.exports = upload;
