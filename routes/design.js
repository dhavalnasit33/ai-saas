const express = require("express");
const router = express.Router();
const fs = require("fs");
const path = require("path");
const axios = require("axios");
const Design = require("../models/Design");
const { protect } = require("../middleware/auth");

// --- Configuration ---
const BASE_DIR = path.join(process.cwd(), "uploads", "designs");

// --- Helper Functions ---
function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

async function saveDesignPreview(buffer, userId) {
  const dir = path.join(BASE_DIR, "previews");
  ensureDir(dir);
  const filename = `${userId}_${Date.now()}.png`;
  const filepath = path.join(dir, filename);
  fs.writeFileSync(filepath, buffer);
  return {
    filename: filename,
    imageUrl: `/uploads/designs/previews/${filename}`,
    absolutePath: filepath,
  };
}

function deleteDesignPreview(previewUrl) {
  if (!previewUrl) return;
  try {
    const filename = previewUrl.split("/").pop();
    const filepath = path.join(BASE_DIR, "previews", filename);
    if (fs.existsSync(filepath)) fs.unlinkSync(filepath);
  } catch (err) {
    console.error("Failed to delete local preview:", err);
  }
}

// --- Routes ---

// @route   POST /api/design/create
router.post("/create", protect, async (req, res) => {
  const { title, designJson, previewBase64 } = req.body;
  if (!title || !designJson || !previewBase64) {
    return res.status(400).json({ success: false, message: "Missing fields" });
  }

  try {
    const base64Data = previewBase64.replace(/^data:image\/\w+;base64,/, "");
    const buffer = Buffer.from(base64Data, "base64");
    const savedImage = await saveDesignPreview(buffer, req.user.id);

    const design = await Design.create({
      userId: req.user.id,
      title,
      designJson,
      previewUrl: savedImage.imageUrl,
    });

    res.status(201).json({
      success: true,
      message: "Design created",
      designId: design._id,
      previewUrl: design.previewUrl,
    });
  } catch (err) {
    console.error("Create failed:", err);
    res.status(500).json({ success: false, message: "Server Error" });
  }
});

// @route   PUT /api/design/update/:id
router.put("/update/:id", protect, async (req, res) => {
  const { title, designJson, previewBase64 } = req.body;

  try {
    const design = await Design.findOne({
      _id: req.params.id,
      userId: req.user.id,
    });
    if (!design) return res.status(404).json({ message: "Design not found" });

    // Handle Image Update
    if (previewBase64) {
      if (design.previewUrl) deleteDesignPreview(design.previewUrl);

      const base64Data = previewBase64.replace(/^data:image\/\w+;base64,/, "");
      const buffer = Buffer.from(base64Data, "base64");
      const savedImage = await saveDesignPreview(buffer, req.user.id);
      design.previewUrl = savedImage.imageUrl;
    }

    if (title) design.title = title;
    if (designJson) design.designJson = designJson;

    await design.save();

    res.json({
      success: true,
      message: "Design updated",
      designId: design._id,
      previewUrl: design.previewUrl,
    });
  } catch (err) {
    console.error("Update failed:", err);
    res.status(500).json({ success: false, message: "Server Error" });
  }
});

// @route   GET /api/design/list
router.get("/list", protect, async (req, res) => {
  try {
    const designs = await Design.find({ userId: req.user.id })
      .select("_id title previewUrl updatedAt")
      .sort({ updatedAt: -1 });
    res.json(designs);
  } catch (err) {
    res.status(500).json({ success: false, message: "Server Error" });
  }
});

// @route   GET /api/design/:id
router.get("/:id", protect, async (req, res) => {
  try {
    const design = await Design.findOne({
      _id: req.params.id,
      userId: req.user.id,
    });
    if (!design) return res.status(404).json({ message: "Not found" });
    res.json(design.designJson);
  } catch (err) {
    res.status(500).json({ success: false, message: "Server Error" });
  }
});

// @route   DELETE /api/design/:id
router.delete("/:id", protect, async (req, res) => {
  try {
    const design = await Design.findOneAndDelete({
      _id: req.params.id,
      userId: req.user.id,
    });
    if (!design) return res.status(404).json({ message: "Not found" });
    if (design.previewUrl) deleteDesignPreview(design.previewUrl);
    res.json({ success: true, message: "Deleted" });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server Error" });
  }
});

// Create a simple in-memory cache dictionary
const templatesCache = new Map();
// Set Cache Time-To-Live (TTL) to 24 hours (in milliseconds)
const CACHE_TTL = 1000 * 60 * 60 * 24;

// @route   GET /api/design/templates/polotno
router.get("/templates/polotno", async (req, res) => {
  try {
    const { query = "", page = "0" } = req.query;

    // 1. Create a unique cache key based on the search query and page number
    const cacheKey = `polotno_${query.toLowerCase()}_${page}`;

    // 2. Check if we already have this data saved in memory
    if (templatesCache.has(cacheKey)) {
      const cachedData = templatesCache.get(cacheKey);

      // If the cache hasn't expired yet, return it immediately without calling Polotno
      if (Date.now() - cachedData.timestamp < CACHE_TTL) {
        console.log(`[CACHE HIT] Returning templates for: ${cacheKey}`);
        return res.json({ success: true, ...cachedData.data });
      } else {
        // Clear expired cache
        templatesCache.delete(cacheKey);
      }
    }

    console.log(
      `[CACHE MISS] Fetching fresh templates from Polotno for: ${cacheKey}`,
    );

    // 3. If no cache exists, fetch from Polotno
    const key = process.env.POLOTNO_API_KEY || "oHIPlZ8foVfwrX3IocJm";
    let url = `https://api.polotno.com/api/get-templates?key=${key}`;
    if (query) url += `&query=${encodeURIComponent(query)}`;
    if (page) url += `&page=${page}`;

    const response = await axios.get(url);
    
    let items = response.data.items || [];

    // 4. Run the deduplication logic (Commented out as requested)
    /*
    const seenBaseTemplates = new Set();
    const uniqueItems = items.filter((item) => {
      if (!item.json) return true;
      const baseName = item.json.replace(/-(story|square|banner|portrait|landscape)\.json$/i, "");
      if (seenBaseTemplates.has(baseName)) return false;
      seenBaseTemplates.add(baseName);
      return true;
    });
    */

    // Bypass the filter and use all items directly
    const uniqueItems = items;

    // 5. Format the final response payload
    const finalPayload = {
      ...response.data,
      items: uniqueItems,
    };

    // 6. Save the fresh data to our in-memory cache
    templatesCache.set(cacheKey, {
      timestamp: Date.now(),
      data: finalPayload,
    });

    // 7. Send the response
    res.json({ success: true, ...finalPayload });
  } catch (err) {
    console.error("Polotno templates proxy error:", err.message);
    res
      .status(500)
      .json({ success: false, error: "Failed to fetch templates" });
  }
});

// @route   POST /api/design/templates/clone
router.post("/templates/clone", protect, async (req, res) => {
  const { projectName, jsonUrl, previewUrl } = req.body;
  if (!projectName || !jsonUrl) {
    return res.status(400).json({ success: false, message: "Missing fields" });
  }

  try {
    const response = await axios.get(jsonUrl, { timeout: 10000 });
    const designJson = response.data || {};

    const design = await Design.create({
      userId: req.user.id,
      title: projectName,
      designJson,
      previewUrl: previewUrl || "/uploads/designs/previews/placeholder.png",
    });

    res.status(201).json({
      success: true,
      data: design,
    });
  } catch (err) {
    console.error("Polotno clone error:", err.message);
    res
      .status(500)
      .json({ success: false, message: "Failed to clone template" });
  }
});

module.exports = router;
