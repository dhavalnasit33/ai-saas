const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const path = require("path");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const upload = require("../middleware/upload");
// Middleware & Models
const { protect } = require("../middleware/auth");
const StorageFile = require("../models/StorageFile");
const StorageFolder = require("../models/StorageFolder");
const User = require("../models/User");
const ActivityLog = require("../models/ActivityLog");
const { sendTemplateEmail } = require("../utils/sendgridService");
const rateLimit = require("express-rate-limit");
const archiver = require("archiver");

// Cloud Storage Imports (DigitalOcean Spaces)
const { s3Client } = require("../utils/s3Client");
const {
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");

// Configuration
const BUCKET_NAME = process.env.DO_BUCKET_NAME || "onechatai.storage"; // ⚠️ Check your .env
const PLAN_LIMITS = {
  // "Free/Trial" -> database key: 'basic'
  basic: {
    limit: 0, // 0 GB
    allowVideo: false,
    canAccessStorage: false, // Blocked from uploading
  },

  // "Lite" -> database key: 'lite'
  lite: {
    limit: 25 * 1024 * 1024 * 1024, // 25 GB
    allowVideo: false,
    canAccessStorage: true,
  },

  // "Standard" -> database key: 'standard'
  standard: {
    limit: 50 * 1024 * 1024 * 1024, // 50 GB
    allowVideo: false, // (Change to true if you want Standard users to upload videos)
    canAccessStorage: true, // ✅ Granted upload access
  },

  // "Basic User" -> database key: 'pro'
  pro: {
    limit: 100 * 1024 * 1024 * 1024, // 100 GB
    allowVideo: true,
    canAccessStorage: true,
  },

  // "Premium User" -> database key: 'pro_max'
  pro_max: {
    limit: 300 * 1024 * 1024 * 1024, // 300 GB
    allowVideo: true,
    canAccessStorage: true,
  },

  // Fallback default (safe mode)
  default: {
    limit: 0,
    allowVideo: false,
    canAccessStorage: false,
  },
};
const MAX_STORAGE_LIMIT = 100 * 1024 * 1024 * 1024; // 100GB
const MAX_FILE_SIZE = 100 * 1024 * 1024;

const VIDEO_MIME_TYPES = [
  "video/mp4",
  "video/quicktime",
  "video/webm",
  "video/x-msvideo",
  "video/mpeg",
];
const ALLOWED_MIME_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // doc, docx
  "image/jpeg",
  "image/png", // jpg, png
  "image/webp", // ✅ Added WebP
  "text/plain", // ✅ Added TXT
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation", // ppt, pptx
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", // xls, xlsx
  ...VIDEO_MIME_TYPES,
];

const getUserRules = (user) => {
  if (!user) return PLAN_LIMITS.default;
  const plan = user.plan ? user.plan.toLowerCase() : "basic";
  return PLAN_LIMITS[plan] || PLAN_LIMITS.default;
};

const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // Limit each IP to 50 upload requests per window
  message: {
    success: false,
    message: "Too many upload requests. Please try again later.",
  },
});

// --- MIDDLEWARE: Centralized Storage Access Check ---
const checkStorageAccess = (req, res, next) => {
  const rules = getUserRules(req.user);
  if (!rules.canAccessStorage) {
    return res.status(403).json({
      success: false,
      message:
        "Storage access is not available on your current plan. Please upgrade to Pro or Pro Max.",
    });
  }
  next();
};

// --- HELPER: Get MimeType from Extension ---
const getMimeTypeFromFilename = (filename) => {
  if (!filename) return null;
  const ext = filename.split(".").pop().toLowerCase();
  const mimeMap = {
    mp4: "video/mp4",
    mov: "video/quicktime",
    webm: "video/webm",
    mkv: "video/x-matroska",
    avi: "video/x-msvideo",
    mpeg: "video/mpeg",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    webp: "image/webp",
    gif: "image/gif",
    pdf: "application/pdf",
    txt: "text/plain",
    json: "application/json",
  };
  return mimeMap[ext] || null;
};

// --- HELPER: Generate Presigned View URL (Valid for 1 Hour) ---
const generatePresignedViewUrl = async (
  key,
  originalName = null,
  isDownload = false,
  mimeType = null,
) => {
  try {
    if (!key) return null;
    if (key.startsWith("http")) return key;

    const params = {
      Bucket: BUCKET_NAME,
      Key: key,
    };

    // Force download if requested
    if (isDownload && originalName) {
      params.ResponseContentDisposition = `attachment; filename="${originalName}"`;
    }

    // Set ResponseContentType for media streaming (especially videos/images/pdfs)
    const detectedMime =
      mimeType || getMimeTypeFromFilename(originalName || key);
    if (detectedMime) {
      params.ResponseContentType = detectedMime;
    }

    const command = new GetObjectCommand(params);
    return await getSignedUrl(s3Client, command, { expiresIn: 3600 });
  } catch (e) {
    console.error("Error signing view URL", e);
    return null;
  }
};

const logActivity = async (userId, action, meta = {}, req) => {
  try {
    await ActivityLog.create({
      user: userId,
      action,
      fileId: meta.fileId || null,
      folderId: meta.folderId || null,
      details: meta.details || "",
      ipAddress: req?.ip || "unknown",
    });
  } catch (e) {
    console.error("Audit Log Failed:", e);
  }
};

// Helper: Categorize extensions
const getCategoryFromExtension = (ext) => {
  const map = {
    image: ["jpg", "jpeg", "png", "gif", "webp", "svg", "bmp"],
    video: ["mp4", "mov", "webm", "avi", "mkv"],
    document: [
      "doc",
      "docx",
      "pdf",
      "ppt",
      "pptx",
      "xls",
      "xlsx",
      "txt",
      "csv",
    ],
  };
  if (map.image.includes(ext)) return "image";
  if (map.video.includes(ext)) return "video";
  if (map.document.includes(ext)) return "document";
  return "other";
};

// ==========================================
// 🚀 Generate Presigned URL (With Plan Restrictions)
// ==========================================
router.post(
  "/upload/sign",
  protect,
  checkStorageAccess,
  uploadLimiter,
  async (req, res) => {
    try {
      const { fileName, fileType, fileSize, folderId } = req.body;
      const userId = req.user.id;

      // 1. Get User & Rules
      const user = await User.findById(userId);
      const rules = getUserRules(user);

      // 2. Strict File Type Validation
      if (!ALLOWED_MIME_TYPES.includes(fileType)) {
        return res.status(400).json({
          success: false,
          message: "File type not allowed.",
        });
      }

      // 3. Plan-Based Video Restriction
      // If user is 'basic', rules.allowVideo is false -> Blocks video
      const isVideo = VIDEO_MIME_TYPES.includes(fileType);
      if (isVideo && !rules.allowVideo) {
        return res.status(403).json({
          success: false,
          message: `Video uploads are not available on your current plan. Please upgrade to Pro or Pro Max.`,
        });
      }

      // 4. Plan-Based Storage Quota
      const currentUsed = user.storageUsed || 0;
      if (currentUsed + fileSize > rules.limit) {
        const limitInGB = rules.limit / (1024 * 1024 * 1024);
        return res.status(400).json({
          success: false,
          message: `Storage quota exceeded. Your limit is ${limitInGB}GB.`,
        });
      }

      // 5. File Size Limit (Per individual file)
      if (fileSize > MAX_FILE_SIZE) {
        return res.status(400).json({
          success: false,
          message: "File too large. Maximum limit is 100MB.",
        });
      }

      // Generate Key
      const fileKey = `users/${userId}/${Date.now()}-${Math.round(Math.random() * 1e9)}-${fileName.replace(/\s+/g, "_")}`;

      const command = new PutObjectCommand({
        Bucket: process.env.DO_BUCKET_NAME,
        Key: fileKey,
        ContentType: fileType,
      });

      const uploadUrl = await getSignedUrl(s3Client, command, {
        expiresIn: 300,
      });

      res.json({ success: true, uploadUrl, fileKey });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, message: "Server Error" });
    }
  },
);
// ==========================================
// 🚀 STEP 2: Save Metadata (DB) + Inheritance
// ==========================================
router.post(
  "/upload/complete",
  protect,
  checkStorageAccess,
  async (req, res) => {
    try {
      const { fileName, fileKey, fileSize, mimeType, folderId } = req.body;
      const userId = req.user.id;

      // 1. Permission Inheritance (Your logic preserved)
      let inheritedSharedWith = [];
      let inheritedLinkAccess = "restricted";

      if (folderId) {
        const parentFolder = await StorageFolder.findById(folderId);
        if (parentFolder) {
          inheritedSharedWith = parentFolder.sharedWith || [];
          inheritedLinkAccess = parentFolder.linkAccess || "restricted";
        }
      }

      // 2. Create DB Record
      const newFile = new StorageFile({
        user: userId,
        folder: folderId || null,
        filename: fileName,
        storageKey: fileKey, // Path in DigitalOcean
        size: fileSize,
        mimeType: mimeType,
        extension: fileName.split(".").pop().toLowerCase(),
        scanStatus: "pending",
        linkAccess: inheritedLinkAccess,
        sharedWith: inheritedSharedWith,
      });

      await newFile.save();

      // 4. Log Activity
      logActivity(
        userId,
        "UPLOAD",
        { fileId: newFile._id, details: fileName },
        req,
      );

      // 5. Generate a View URL immediately for the frontend
      const viewUrl = await generatePresignedViewUrl(fileKey);

      res.json({ success: true, file: { ...newFile._doc, url: viewUrl } });
    } catch (err) {
      console.error("Complete Error:", err);
      res.status(500).json({ success: false, message: err.message });
    }
  },
);

router.get("/download/:id", protect, checkStorageAccess, async (req, res) => {
  try {
    const file = await StorageFile.findOne({
      _id: req.params.id,
      user: req.user.id,
    });

    if (!file) {
      return res
        .status(404)
        .json({ success: false, message: "File not found" });
    }

    // 🔥 THE MAGIC FIX: response-content-disposition
    // This tells S3 to serve the file with headers that force a download
    const command = new GetObjectCommand({
      Bucket: process.env.DO_BUCKET_NAME || "onechatai.storage",
      Key: file.storageKey,
      ResponseContentDisposition: `attachment; filename="${file.filename}"`,
    });

    // Generate signed URL (valid for 1 hour)
    const downloadUrl = await getSignedUrl(s3Client, command, {
      expiresIn: 3600,
    });

    res.json({ success: true, downloadUrl });
  } catch (err) {
    console.error("Download Error:", err);
    res
      .status(500)
      .json({ success: false, message: "Could not generate download link" });
  }
});

router.get("/folder/download/:id", async (req, res) => {
  try {
    // 1. Manual Auth Check (Supports ?token= query param for browser downloads)
    let token = req.query.token;
    if (
      !token &&
      req.headers.authorization &&
      req.headers.authorization.startsWith("Bearer")
    ) {
      token = req.headers.authorization.split(" ")[1];
    }

    if (!token)
      return res
        .status(401)
        .json({ success: false, message: "Not authorized" });

    const decoded = jwt.verify(token, process.env.JWT_SECRET); // Ensure JWT_SECRET matches your env
    const userId = decoded.id; // Adjust based on your JWT payload structure

    // 2. Plan Check
    const user = await User.findById(userId);
    const rules = getUserRules(user);
    if (!rules.canAccessStorage) {
      return res.status(403).json({
        success: false,
        message:
          "Storage access is not available on your current plan. Please upgrade to Pro or Pro Max.",
      });
    }

    // 3. Fetch Folder Info
    const folderId = req.params.id;
    const folder = await StorageFolder.findOne({ _id: folderId, user: userId });

    if (!folder) return res.status(404).send("Folder not found");

    // 3. Fetch All Files inside this folder
    // Note: This example grabs files in the *immediate* folder.
    // Recursive sub-folder downloading requires complex recursion.
    const files = await StorageFile.find({
      folder: folderId,
      user: userId,
      isDeleted: false,
    });

    if (files.length === 0) {
      return res.status(400).send("Folder is empty");
    }

    // 4. Set Headers for Download
    res.attachment(`${folder.name}.zip`);

    // 5. Create Zip Stream
    const archive = archiver("zip", { zlib: { level: 9 } });

    archive.on("error", (err) => {
      console.error("Archiver Error:", err);
      res.status(500).send({ error: err.message });
    });

    // Pipe archive data to the response
    archive.pipe(res);

    // 6. Append files from S3 to the zip
    for (const file of files) {
      const getObjectParams = {
        Bucket: process.env.DO_BUCKET_NAME || "onechatai.storage",
        Key: file.storageKey,
      };

      try {
        // Get the S3 stream
        const s3Object = await s3Client.send(
          new GetObjectCommand(getObjectParams),
        );

        // Append stream to zip with the filename
        archive.append(s3Object.Body, { name: file.filename });
      } catch (e) {
        console.error(`Error adding file ${file.filename} to zip:`, e);
        // Continue adding other files even if one fails
      }
    }

    // Finalize the zip (sends the EOF to client)
    await archive.finalize();
  } catch (err) {
    console.error("Folder Download Error:", err);
    if (!res.headersSent)
      res.status(500).json({ success: false, message: "Server Error" });
  }
});

// @route   GET /api/storage/files
// @desc    List files with View Type, Search, Sort, Category AND Pagination
router.get("/files", protect, checkStorageAccess, async (req, res) => {
  try {
    const userId = req.user.id;
    const { folderId, search, viewType, sort, order, category, page, limit } =
      req.query;

    // --- NEW: Pagination Setup (For Files Only) ---
    const pageNum = parseInt(page) || 1;
    const limitNum = parseInt(limit) || 50;
    const skip = (pageNum - 1) * limitNum;

    // 1. Initialize Base Query
    let baseQuery = { user: userId, isDeleted: false };

    // 🟢 UPDATE 1: Home View now includes Shared Documents
    if (!viewType || viewType === "home") {
      baseQuery = {
        isDeleted: false,
        $or: [
          { user: userId }, // My files
          { "sharedWith.user": userId }, // Files shared with me
        ],
      };
    }

    // 2. Logic Switcher for View Types
    if (viewType === "trash") {
      baseQuery = { user: userId, isDeleted: true };
    } else if (viewType === "starred") {
      baseQuery.isStarred = true;
    } else if (viewType === "recent") {
      // keep baseQuery
    } else if (viewType === "shared") {
      baseQuery = {
        "sharedWith.user": userId,
        isDeleted: false,
      };
    } else if (viewType === "shared_with_others") {
      // NEW: Files I own that are shared via Email OR Link
      baseQuery = {
        user: userId,
        isDeleted: false,
        $or: [
          { linkAccess: "anyone" }, // Case A: Public Link
          { "sharedWith.0": { $exists: true } }, // Case B: Shared with at least one person
        ],
      };
    } else if (viewType === "storage") {
      // 🟢 STORAGE = only MY files (flat list)
      baseQuery = { user: userId, isDeleted: false };
    } else if (viewType === "mydrive") {
      // 🟢 MY DRIVE = only MY files + folder hierarchy
      baseQuery = { user: userId, isDeleted: false };
    } else if (viewType === "folder") {
      baseQuery = { user: userId, isDeleted: false };
    }

    // 3. Category Filter
    if (category && viewType !== "shared") {
      const map = {
        image: ["jpg", "jpeg", "png", "gif", "webp", "svg", "bmp"],
        video: ["mp4", "mov", "webm", "avi", "mkv"],
        document: [
          "doc",
          "docx",
          "pdf",
          "ppt",
          "pptx",
          "xls",
          "xlsx",
          "txt",
          "csv",
        ],
      };
      const extensions = map[category];
      if (extensions) baseQuery.extension = { $in: extensions };
    }

    let folderQuery = { ...baseQuery };
    let fileQuery = { ...baseQuery };

    // 4. Search vs Browse vs Storage View
    if (search) {
      const searchRegex = { $regex: search, $options: "i" };
      folderQuery.name = searchRegex;
      fileQuery.filename = searchRegex;
    } else if (category || viewType === "storage") {
      // 🟢 UPDATE 2: If 'storage' view or 'category' filter, HIDE FOLDERS
      folderQuery = { _id: null };
      // We do NOT filter files by folder here, so it returns a flat list of ALL files
    } else if (viewType === "folder") {
      fileQuery = { _id: null }; // Ensure NO files are returned
    } else {
      // Folder hierarchy
      if (viewType === "home" || viewType === "mydrive" || !viewType) {
        const parent = folderId && folderId !== "null" ? folderId : null;
        folderQuery.parentFolder = parent;
        fileQuery.folder = parent;
      }
    }

    // 5. Sorting Logic
    const sortOrder = order === "desc" ? -1 : 1;
    let folderSort = { name: sortOrder };
    let fileSort = { filename: sortOrder };

    if (sort === "date") {
      folderSort = { updatedAt: sortOrder };
      fileSort = { updatedAt: sortOrder };
    } else if (sort === "size") {
      fileSort = { size: sortOrder };
    }

    // 🟢 UPDATE 3: Force Sort by Size for Storage View
    if (viewType === "storage") {
      const direction = order === "asc" ? 1 : -1;
      fileSort = { size: direction };
    }

    // 6. Execute Queries
    let fileLimit = limitNum;
    if (viewType === "recent") {
      fileLimit = 20; // Maintain the 20 limit for recent view
    }

    // 🔥 Apply pagination skip and limit strictly to files
    let fileQueryPromise = StorageFile.find(fileQuery)
      .sort(fileSort)
      .skip(skip)
      .limit(fileLimit)
      .populate("folder", "name")
      .populate("user", "name email profile_picture");

    // Execute all 3 promises concurrently
    const [folders, files, totalFiles] = await Promise.all([
      StorageFolder.find(folderQuery)
        .sort(folderSort)
        .populate("user", "name email profile_picture"), // Folders load fully every time
      fileQueryPromise, // Files load per page
      StorageFile.countDocuments(fileQuery), // Total files count
    ]);

    // 7. Format Response
    const filesWithUrls = await Promise.all(
      files.map(async (f) => {
        // Generate a signed URL for the specific file key
        const viewUrl = await generatePresignedViewUrl(
          f.storageKey,
          f.filename,
          false,
          f.mimeType,
        );

        return {
          ...f._doc,
          url: viewUrl,
          isSafe: f.scanStatus === "clean",
          folderName: f.folder ? f.folder.name : "My Drive",
          ownerName: f.user?.name || "Unknown",
        };
      }),
    );

    const foldersWithMeta = folders.map((f) => ({
      ...f._doc,
      ownerName: f.user?.name || "Unknown",
    }));

    // Check if there are more pages
    const hasMore =
      viewType === "recent" ? false : skip + files.length < totalFiles;

    res.json({
      success: true,
      folders: foldersWithMeta,
      files: filesWithUrls,
      pagination: {
        currentPage: pageNum,
        totalPages: Math.ceil(totalFiles / fileLimit),
        totalItems: totalFiles,
        hasMore: hasMore,
      },
    });
  } catch (err) {
    console.error("Get Files Error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ==========================================
// 📂 Create Folder (With Inheritance + Quota Check)
// ==========================================
router.post("/folder", protect, checkStorageAccess, async (req, res) => {
  try {
    const { name, parentFolderId } = req.body;
    const userId = req.user.id;

    if (!name)
      return res.status(400).json({ success: false, message: "Name required" });

    // 1. Fetch User & Rules
    const user = await User.findById(userId);
    const rules = getUserRules(user); // Uses the helper we created earlier

    // 2. 🟢 Check Quota: Prevent folder creation if storage is full
    if ((user.storageUsed || 0) >= rules.limit) {
      return res.status(400).json({
        success: false,
        message: "Storage limit reached. You cannot create new folders.",
      });
    }

    // 3. Permission Inheritance (Preserved)
    let inheritedSharedWith = [];
    let inheritedLinkAccess = "restricted";

    if (parentFolderId) {
      const parent = await StorageFolder.findById(parentFolderId);
      if (parent) {
        inheritedSharedWith = parent.sharedWith || [];
        inheritedLinkAccess = parent.linkAccess || "restricted";
      }
    }

    const newFolder = new StorageFolder({
      user: userId,
      name,
      parentFolder: parentFolderId || null,
      sharedWith: inheritedSharedWith,
      linkAccess: inheritedLinkAccess,
    });

    await newFolder.save();
    res.json({ success: true, folder: newFolder });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});
// ==========================================
// 📦 Move Item (With Circular Check)
// ==========================================
router.post("/move", protect, checkStorageAccess, async (req, res) => {
  const { id, type, targetFolderId } = req.body;
  const userId = req.user.id;
  const newParent = targetFolderId === "root" ? null : targetFolderId;

  try {
    if (type === "folder") {
      const folder = await StorageFolder.findOne({ _id: id, user: userId });
      if (!folder) return res.status(404).json({ success: false });

      // 1. Prevent moving into itself
      if (String(folder._id) === String(newParent)) {
        return res
          .status(400)
          .json({ success: false, message: "Cannot move folder into itself" });
      }

      // 2. Prevent moving into its current parent
      if (String(folder.parentFolder) === String(newParent)) {
        return res.json({ success: true, message: "No change" });
      }

      // 3. Circular Dependency Check (Preserved)
      if (newParent) {
        let currentChecker = await StorageFolder.findById(newParent);
        while (currentChecker) {
          if (String(currentChecker._id) === String(id)) {
            return res.status(400).json({
              success: false,
              message: "Cannot move folder into its own subfolder.",
            });
          }
          if (!currentChecker.parentFolder) break;
          currentChecker = await StorageFolder.findById(
            currentChecker.parentFolder,
          );
        }
      }

      folder.parentFolder = newParent;
      await folder.save();
    } else {
      const file = await StorageFile.findOne({ _id: id, user: userId });
      if (!file) return res.status(404).json({ success: false });

      if (String(file.folder) === String(newParent)) {
        return res.json({ success: true, message: "No change" });
      }

      file.folder = newParent;
      await file.save();
    }

    logActivity(
      userId,
      "MOVE",
      { details: `Moved ${type} to new folder` },
      req,
    );
    res.json({ success: true, message: "Moved successfully" });
  } catch (err) {
    console.error("Move Error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ==========================================
// 🗑️ Delete Permanently (Recursive for Folders)
// ==========================================
router.delete(
  "/delete-permanent",
  protect,
  checkStorageAccess,
  async (req, res) => {
    try {
      const { id, type } = req.body;
      const userId = req.user.id;

      if (type === "folder") {
        // 1. Recursive Helper function to collect all nested IDs and S3 Keys
        const getFolderContentsRecursive = async (folderId) => {
          let files = await StorageFile.find({ folder: folderId });
          let subfolders = await StorageFolder.find({ parentFolder: folderId });

          let fileData = files.map((f) => ({
            id: f._id,
            key: f.storageKey,
            size: f.size,
          }));
          let folderIds = [folderId];

          for (const sub of subfolders) {
            const nested = await getFolderContentsRecursive(sub._id);
            fileData = fileData.concat(nested.fileData);
            folderIds = folderIds.concat(nested.folderIds);
          }

          return { fileData, folderIds };
        };

        // 2. Gather everything inside
        const { fileData, folderIds } = await getFolderContentsRecursive(id);

        // 3. Delete files from S3 and calculate total size to reclaim
        let totalSizeFreed = 0;
        for (const file of fileData) {
          if (file.key && !file.key.startsWith("http")) {
            try {
              await s3Client.send(
                new DeleteObjectCommand({
                  Bucket: BUCKET_NAME,
                  Key: file.key,
                }),
              );
            } catch (e) {
              console.error(`S3 Delete failed for ${file.key}:`, e);
            }
          }
          totalSizeFreed += file.size;
        }

        // 4. Batch Delete from DB
        await StorageFile.deleteMany({
          _id: { $in: fileData.map((f) => f.id) },
        });
        await StorageFolder.deleteMany({ _id: { $in: folderIds } });
      } else {
        // Logic for single file deletion (already in your code)
        const file = await StorageFile.findOne({ _id: id, user: userId });
        if (file) {
          if (!file.storageKey.startsWith("http")) {
            try {
              await s3Client.send(
                new DeleteObjectCommand({
                  Bucket: BUCKET_NAME,
                  Key: file.storageKey,
                }),
              );
            } catch (e) {
              console.error(e);
            }
          }
          await StorageFile.deleteOne({ _id: id });
        }
      }

      res.json({
        success: true,
        message: "Folder and all contents deleted permanently",
      });
    } catch (err) {
      console.error("Recursive Delete Error:", err);
      res.status(500).json({ success: false, message: err.message });
    }
  },
);

// ==========================================
// 🗑️ Empty Trash (S3 + DB)
// ==========================================
router.delete("/empty-trash", protect, async (req, res) => {
  try {
    const userId = req.user.id;

    // 1. Find all files in trash
    const filesToDelete = await StorageFile.find({
      user: userId,
      isDeleted: true,
    });

    let totalSizeFreed = 0;

    // 2. Loop and Delete from S3
    for (const file of filesToDelete) {
      if (!file.storageKey.startsWith("http")) {
        try {
          await s3Client.send(
            new DeleteObjectCommand({
              Bucket: BUCKET_NAME,
              Key: file.storageKey,
            }),
          );
        } catch (e) {
          console.error(`Failed to delete S3 key ${file.storageKey}`, e);
        }
      }
      totalSizeFreed += file.size;
    }

    // 3. Delete DB Records
    await StorageFile.deleteMany({ user: userId, isDeleted: true });
    await StorageFolder.deleteMany({ user: userId, isDeleted: true });

    res.json({ success: true, message: "Trash cleared and storage reclaimed" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ==========================================
// 📋 Public Access / Guest (With Presigned URLs)
// ==========================================
router.get("/public/:type/:id", async (req, res) => {
  try {
    const { type, id } = req.params;
    const { token } = req.query;
    let userId = null;

    // 1. Auth Check (Soft)
    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith("Bearer")
    ) {
      try {
        const authToken = req.headers.authorization.split(" ")[1];
        const decoded = jwt.verify(authToken, process.env.JWT_SECRET);
        userId = decoded.id;
      } catch (e) {}
    }

    // 2. Access Logic (Preserved)
    const hasAccess = (doc) => {
      if (userId && doc.user && doc.user.toString() === userId) return true;
      if (doc.linkAccess === "anyone") return true;
      if (userId && Array.isArray(doc.sharedWith)) {
        if (
          doc.sharedWith.some(
            (share) => share.user && share.user.toString() === userId,
          )
        )
          return true;
      }
      if (token && Array.isArray(doc.sharedWith)) {
        if (doc.sharedWith.find((u) => u.token === token)) return true;
      }
      return false;
    };

    let item;
    const Model = type === "folder" ? StorageFolder : StorageFile;
    item = await Model.findById(id).lean();

    if (!item)
      return res.status(404).json({ success: false, message: "Not Found" });

    if (hasAccess(item)) {
      if (type === "folder") {
        const children = await StorageFile.find({
          folder: id,
          isDeleted: false,
        });
        const subfolders = await StorageFolder.find({
          parentFolder: id,
          isDeleted: false,
        });

        // 🔥 Sign URLs for children
        const childrenWithUrls = await Promise.all(
          children.map(async (file) => {
            const signedUrl = await generatePresignedViewUrl(
              file.storageKey,
              file.filename,
              false,
              file.mimeType,
            );
            return { ...file._doc, url: signedUrl };
          }),
        );

        return res.json({
          success: true,
          item,
          contents: { files: childrenWithUrls, folders: subfolders },
        });
      } else {
        // 🔥 Sign URL for single file
        const signedUrl = await generatePresignedViewUrl(
          item.storageKey,
          item.filename,
          false,
          item.mimeType,
        );
        return res.json({ success: true, item: { ...item, url: signedUrl } });
      }
    }

    return res.status(403).json({ success: false, message: "Access Denied" });
  } catch (err) {
    console.error("Public Access Error:", err);
    res.status(500).json({ success: false, message: "Server Error" });
  }
});

// ==========================================
// 📊 Stats / Quota / Rename / Soft Delete (Standard)
// ==========================================

// ✅ 2. REMOVED 'checkStorageAccess' from the parameters here:
router.get("/quota", protect, async (req, res) => {
  try {
    // Self-heal/recalculate storage usage dynamically
    await StorageFile.recalculateStorageUsed(req.user.id);

    const user = await User.findById(req.user.id);

    // ✅ 3. Extra safety: If user was deleted from DB, return 404 instead of crashing
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    const rules = getUserRules(user);

    res.json({
      success: true,
      totalUsed: user.storageUsed || 0,
      limit: rules.limit,
      // Prevents division by zero for Free users
      percentage:
        rules.limit > 0 ? ((user.storageUsed || 0) / rules.limit) * 100 : 0,
      plan: user.plan,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post(
  "/track-access/:id",
  protect,
  checkStorageAccess,
  async (req, res) => {
    try {
      const file = await StorageFile.findOneAndUpdate(
        { _id: req.params.id, user: req.user.id },
        { lastAccessedAt: new Date() },
      );
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ success: false });
    }
  },
);

router.get("/stats", protect, checkStorageAccess, async (req, res) => {
  try {
    const userId = req.user.id;
    const objectId = new mongoose.Types.ObjectId(userId);

    const stats = await StorageFile.aggregate([
      { $match: { user: objectId, isDeleted: false } },
      {
        $group: {
          _id: "$extension",
          totalSize: { $sum: "$size" },
          count: { $sum: 1 },
        },
      },
    ]);

    const result = {
      image: { count: 0, size: 0 },
      video: { count: 0, size: 0 },
      document: { count: 0, size: 0 },
      other: { count: 0, size: 0 },
    };

    stats.forEach((item) => {
      const ext = (item._id || "").toLowerCase();
      const category = getCategoryFromExtension(ext);
      if (result[category]) {
        result[category].count += item.count;
        result[category].size += item.totalSize;
      }
    });

    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post("/rename", protect, checkStorageAccess, async (req, res) => {
  try {
    const { id, name, type } = req.body;
    const userId = req.user.id;

    if (type === "folder") {
      await StorageFolder.findOneAndUpdate({ _id: id, user: userId }, { name });
    } else {
      // 1. Find the existing file first to get its original extension
      const file = await StorageFile.findOne({ _id: id, user: userId });

      if (!file) {
        return res
          .status(404)
          .json({ success: false, message: "File not found" });
      }

      let newFilename = name;

      // 2. Check if the file has an extension stored in DB
      if (file.extension) {
        const ext = file.extension.toLowerCase();

        // 3. If the new name doesn't end with the extension, append it
        if (!newFilename.toLowerCase().endsWith(`.${ext}`)) {
          newFilename = `${newFilename}.${ext}`;
        }
      }

      // 4. Update with the corrected filename
      file.filename = newFilename;
      await file.save();
    }

    res.json({ success: true, message: "Renamed successfully" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post("/toggle-star", protect, checkStorageAccess, async (req, res) => {
  try {
    const { id, type } = req.body;
    const userId = req.user.id;
    const Model = type === "folder" ? StorageFolder : StorageFile;
    const item = await Model.findOne({ _id: id, user: userId });
    if (!item) return res.status(404).json({ success: false });
    item.isStarred = !item.isStarred;
    await item.save();
    res.json({ success: true, isStarred: item.isStarred });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post("/soft-delete", protect, checkStorageAccess, async (req, res) => {
  try {
    const { id, type } = req.body;
    const userId = req.user.id;
    const update = { isDeleted: true, deletedAt: new Date() };

    if (type === "folder") {
      // 1. Check if folder exists and belongs to user
      const folder = await StorageFolder.findOne({ _id: id, user: userId });
      if (!folder)
        return res
          .status(404)
          .json({ success: false, message: "Folder not found" });

      // 2. Recursive Helper to gather all sub-folder IDs
      const getAllChildFolderIds = async (folderId) => {
        let ids = [folderId];
        const subfolders = await StorageFolder.find({
          parentFolder: folderId,
          user: userId,
        });
        for (const sub of subfolders) {
          const nestedIds = await getAllChildFolderIds(sub._id);
          ids = ids.concat(nestedIds);
        }
        return ids;
      };

      const allFolderIds = await getAllChildFolderIds(id);

      // 3. Update all found folders to isDeleted: true
      await StorageFolder.updateMany(
        { _id: { $in: allFolderIds }, user: userId },
        { $set: update },
      );

      // 4. Update all files within any of those folders to isDeleted: true
      await StorageFile.updateMany(
        { folder: { $in: allFolderIds }, user: userId },
        { $set: update },
      );
    } else {
      // Single file soft delete
      await StorageFile.findOneAndUpdate({ _id: id, user: userId }, update);
    }

    res.json({
      success: true,
      message: "Folder and all contents moved to trash",
    });
  } catch (err) {
    console.error("Soft Delete Error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post("/restore", protect, checkStorageAccess, async (req, res) => {
  try {
    const { id, type } = req.body;
    const userId = req.user.id;
    const update = { isDeleted: false, deletedAt: null };
    if (type === "folder")
      await StorageFolder.findOneAndUpdate({ _id: id, user: userId }, update);
    else await StorageFile.findOneAndUpdate({ _id: id, user: userId }, update);
    res.json({ success: true, message: "Restored" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// @route   POST /api/storage/share (Recursive preserved)
router.post("/share", protect, checkStorageAccess, async (req, res) => {
  try {
    const { id, type, emails, linkAccess, action, removeEmail } = req.body;
    const userId = req.user.id;
    const userName = req.user.name || "A user";
    const Model = type === "folder" ? StorageFolder : StorageFile;

    const item = await Model.findOne({ _id: id, user: userId });
    if (!item)
      return res.status(404).json({ success: false, message: "Not found" });

    // Update Link Access
    if (action === "update_link") {
      item.linkAccess = linkAccess;
      await item.save();

      const updateLinkRecursively = async (folderId) => {
        await StorageFile.updateMany({ folder: folderId }, { linkAccess });
        await StorageFolder.updateMany(
          { parentFolder: folderId },
          { linkAccess },
        );
        const subFolders = await StorageFolder.find({ parentFolder: folderId });
        for (const sub of subFolders) await updateLinkRecursively(sub._id);
      };
      if (type === "folder") await updateLinkRecursively(item._id);

      return res.json({ success: true, message: "Link updated" });
    }

    // Remove Person
    if (action === "remove_person") {
      item.sharedWith = item.sharedWith.filter((p) => p.email !== removeEmail);
      await item.save();

      const removeUserRecursively = async (folderId) => {
        await StorageFile.updateMany(
          { folder: folderId },
          { $pull: { sharedWith: { email: removeEmail } } },
        );
        await StorageFolder.updateMany(
          { parentFolder: folderId },
          { $pull: { sharedWith: { email: removeEmail } } },
        );
        const subFolders = await StorageFolder.find({ parentFolder: folderId });
        for (const sub of subFolders) await removeUserRecursively(sub._id);
      };
      if (type === "folder") await removeUserRecursively(item._id);

      return res.json({ success: true, message: "User removed" });
    }

    // Add People
    if (action === "add_people" && Array.isArray(emails)) {
      const validUsers = [];
      const usersToNotify = [];

      for (const email of emails) {
        const emailLower = email.toLowerCase();
        if (item.sharedWith.find((p) => p.email === emailLower)) continue;

        const userObj = await User.findOne({ email: emailLower });
        const guestToken = crypto.randomBytes(32).toString("hex");

        validUsers.push({
          user: userObj ? userObj._id : null,
          email: emailLower,
          access: "view",
          token: guestToken,
        });

        usersToNotify.push({
          email: emailLower,
          isRegistered: !!userObj,
          itemName: item.filename || item.name,
          itemId: item._id,
          type: type,
          token: guestToken,
        });
      }

      if (validUsers.length > 0) {
        item.sharedWith.push(...validUsers);
        await item.save();

        if (type === "folder") {
          const addPermissionsRecursively = async (folderId, usersToAdd) => {
            const files = await StorageFile.find({ folder: folderId });
            for (const file of files) {
              let changed = false;
              usersToAdd.forEach((u) => {
                if (!file.sharedWith.some((p) => p.email === u.email)) {
                  file.sharedWith.push(u);
                  changed = true;
                }
              });
              if (changed) await file.save();
            }
            const subFolders = await StorageFolder.find({
              parentFolder: folderId,
            });
            for (const sub of subFolders) {
              let changed = false;
              usersToAdd.forEach((u) => {
                if (!sub.sharedWith.some((p) => p.email === u.email)) {
                  sub.sharedWith.push(u);
                  changed = true;
                }
              });
              if (changed) await sub.save();
              await addPermissionsRecursively(sub._id, usersToAdd);
            }
          };
          await addPermissionsRecursively(item._id, validUsers);
        }

        // Send Emails (Background)
        sendShareEmails(usersToNotify, userName).catch((err) =>
          console.error(err),
        );
      }
      return res.json({ success: true, message: "Invitations sent" });
    }
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get("/permissions", protect, checkStorageAccess, async (req, res) => {
  try {
    const { id, type } = req.query;
    const Model = type === "folder" ? StorageFolder : StorageFile;
    const item = await Model.findById(id).populate(
      "sharedWith.user",
      "name email avatar",
    );
    if (!item) return res.status(404).json({ success: false });
    res.json({
      success: true,
      linkAccess: item.linkAccess || "restricted",
      sharedWith: item.sharedWith,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Reorder logic
router.post("/reorder", protect, checkStorageAccess, async (req, res) => {
  try {
    const { items } = req.body;
    const userId = req.user.id;
    const operations = items.map((item) => {
      const Model = item.type === "folder" ? StorageFolder : StorageFile;
      return Model.updateOne(
        { _id: item.id, user: userId },
        { orderIndex: item.orderIndex },
      );
    });
    await Promise.all(operations);
    res.json({ success: true, message: "Order updated" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post(
  "/upload/local",
  protect,
  uploadLimiter,
  upload.single("file"),
  checkStorageAccess,
  async (req, res) => {
    // Helper to clean up file if error occurs
    const cleanup = () => {
      if (!res.headersSent && req.file && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
    };
    req.on("close", cleanup);

    try {
      if (!req.file) {
        return res
          .status(400)
          .json({ success: false, message: "No file uploaded." });
      }

      const { folderId } = req.body;
      const file = req.file;
      const userId = req.user.id;

      // 1. Fetch User & Rules
      const user = await User.findById(userId);
      const rules = getUserRules(user); // 🟢 Uses your new helper

      // 2. 🟢 CHECK: Plan-Based Video Restriction
      const isVideo = VIDEO_MIME_TYPES.includes(file.mimetype);
      if (isVideo && !rules.allowVideo) {
        cleanup();
        return res.status(403).json({
          success: false,
          message: `Video uploads are not available on the ${user.plan || "Free"} plan.`,
        });
      }

      // 3. 🟢 CHECK: Plan-Based Quota
      const currentUsed = user.storageUsed || 0;
      if (currentUsed + file.size > rules.limit) {
        cleanup();
        return res
          .status(400)
          .json({ success: false, message: "Storage Full" });
      }

      // 4. Permission Inheritance
      let inheritedSharedWith = [];
      let inheritedLinkAccess = "restricted";
      if (folderId) {
        const parentFolder = await StorageFolder.findById(folderId);
        if (parentFolder) {
          inheritedSharedWith = parentFolder.sharedWith || [];
          inheritedLinkAccess = parentFolder.linkAccess || "restricted";
        }
      }

      // 5. Generate Thumbnail
      let thumbUrl = null;
      try {
        // Ensure generateThumbnail function is imported or available in this scope
        const thumbName = await generateThumbnail(file.path, file.originalname);
        if (thumbName) {
          const relativeFolder = path.dirname(file.path).split(path.sep).pop();
          thumbUrl = `${process.env.SERVER_URL}/uploads/${relativeFolder}/${thumbName}`;
        }
      } catch (thumbErr) {
        console.error("Thumbnail generation failed:", thumbErr);
      }

      const normalizedPath = file.path.replace(/\\/g, "/");
      const publicUrl = `${process.env.SERVER_URL}/${normalizedPath}`;

      // 6. Save to DB
      const newFile = new StorageFile({
        user: userId,
        folder: folderId || null,
        filename: file.originalname,
        storageKey: publicUrl,
        publicUrl: publicUrl,
        thumbnailUrl: thumbUrl,
        size: file.size,
        mimeType: file.mimetype,
        extension: path.extname(file.originalname).replace(".", ""),
        scanStatus: "pending",
        sharedWith: inheritedSharedWith,
        linkAccess: inheritedLinkAccess,
      });

      await newFile.save();

      logActivity(
        userId,
        "UPLOAD",
        { fileId: newFile._id, details: file.originalname },
        req,
      );

      res.json({ success: true, file: newFile });
    } catch (err) {
      console.error(err);
      cleanup();
      res
        .status(500)
        .json({ success: false, message: "Server Error during upload" });
    }
  },
);

// Helper Function: Send Emails
async function sendShareEmails(usersToNotify, senderName) {
  const frontendUrl = process.env.FRONTEND_URL || "https://onechatai.ai";
  const emailPromises = usersToNotify.map((user) => {
    let accessUrl;
    if (user.isRegistered) {
      accessUrl = `${frontendUrl}/storage/${user.type}/${user.itemId}`;
    } else {
      accessUrl = `${frontendUrl}/public/${user.type}/${user.itemId}?token=${user.token}`;
    }
    return sendTemplateEmail({
      to: user.email,
      fromName: `${senderName} (via OneChat AI)`,
      subject: `${senderName} shared a document with you`,
      templateName: "fileShared",
      variables: {
        senderName: senderName,
        itemName: user.itemName,
        type: user.type,
        accessUrl: accessUrl,
        isGuest: !user.isRegistered,
        signupUrl: `${frontendUrl}/auth?email=${user.email}`,
      },
    });
  });
  await Promise.allSettled(emailPromises);
}

module.exports = router;
