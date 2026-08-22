const express = require("express");
const multer = require("multer");
const axios = require("axios");
const FormData = require("form-data");
const { protect } = require("../middleware/auth");
const { getSafeUserId } = require("../utils/aiService");

const router = express.Router();
const upload = multer({ limits: { fileSize: 50 * 1024 * 1024 } }); // 50MB limit

// Generic helper function to proxy multipart requests to Stability AI
async function proxyToStability(path, req, res) {
  try {
    const formData = new FormData();

    // 1. Forward all non-file text fields
    if (req.body) {
      for (const [key, value] of Object.entries(req.body)) {
        formData.append(key, value);
      }
    }

    // 2. Forward all uploaded files
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        formData.append(file.fieldname, file.buffer, {
          filename: file.originalname || "upload.png",
          contentType: file.mimetype,
        });
      }
    }

    // 3. Send request to Stability AI
    const url = `https://api.stability.ai/${path}`;
    const headers = {
      Authorization: `Bearer ${process.env.STABILITY_API_KEY}`,
      Accept: req.headers.accept || "image/*, application/json",
      ...formData.getHeaders(),
    };

    const userId = req.user?._id || req.user?.id || req.guestUser?._id || req.guestUser?.id;
    if (userId) {
      const safeId = getSafeUserId(userId);
      if (safeId) {
        headers["stability-client-user-id"] = safeId;
      }
    }

    const response = await axios.post(url, formData, {
      headers,
      responseType: "arraybuffer", // Handle binary images or JSON response
    });

    // 4. Forward success response headers and body
    res.setHeader("Content-Type", response.headers["content-type"] || "image/webp");
    return res.status(response.status).send(response.data);
  } catch (error) {
    console.error(`💥 Stability API proxy error for ${path}:`, error.message);

    // If Stability AI returned a response with an error
    if (error.response && error.response.data) {
      try {
        // Try parsing response buffer as string/json
        const errString = Buffer.from(error.response.data).toString("utf-8");
        const contentType = error.response.headers["content-type"] || "";
        res.setHeader("Content-Type", contentType.includes("application/json") ? "application/json" : "text/plain");
        return res.status(error.response.status).send(errString);
      } catch (e) {
        return res.status(error.response.status).send(error.response.data);
      }
    }

    return res.status(500).json({
      success: false,
      message: error.message || "Stability API Proxy error",
    });
  }
}

// Route for remove-background
router.post("/edit/remove-background", protect, upload.any(), async (req, res) => {
  await proxyToStability("v2beta/stable-image/edit/remove-background", req, res);
});

// Route for replace-background-and-relight
router.post("/edit/replace-background-and-relight", protect, upload.any(), async (req, res) => {
  await proxyToStability("v2beta/stable-image/edit/replace-background-and-relight", req, res);
});

// Route for upscale/fast
router.post("/upscale/fast", protect, upload.any(), async (req, res) => {
  await proxyToStability("v2beta/stable-image/upscale/fast", req, res);
});

// Route for erase
router.post("/edit/erase", protect, upload.any(), async (req, res) => {
  await proxyToStability("v2beta/stable-image/edit/erase", req, res);
});

// Route for control/structure
router.post("/control/structure", protect, upload.any(), async (req, res) => {
  await proxyToStability("v2beta/stable-image/control/structure", req, res);
});

// Route for poll results (GET)
router.get("/results/:jobId", protect, async (req, res) => {
  try {
    const url = `https://api.stability.ai/v2beta/results/${req.params.jobId}`;
    const headers = {
      Authorization: `Bearer ${process.env.STABILITY_API_KEY}`,
      Accept: req.headers.accept || "image/*, application/json",
    };

    const userId = req.user?._id || req.user?.id || req.guestUser?._id || req.guestUser?.id;
    if (userId) {
      const safeId = getSafeUserId(userId);
      if (safeId) {
        headers["stability-client-user-id"] = safeId;
      }
    }

    const response = await axios.get(url, {
      headers,
      responseType: "arraybuffer",
    });

    res.setHeader("Content-Type", response.headers["content-type"] || "image/webp");
    return res.status(response.status).send(response.data);
  } catch (error) {
    console.error(`💥 Stability API poll error for ${req.params.jobId}:`, error.message);

    if (error.response && error.response.data) {
      try {
        const errString = Buffer.from(error.response.data).toString("utf-8");
        const contentType = error.response.headers["content-type"] || "";
        res.setHeader("Content-Type", contentType.includes("application/json") ? "application/json" : "text/plain");
        return res.status(error.response.status).send(errString);
      } catch (e) {
        return res.status(error.response.status).send(error.response.data);
      }
    }

    return res.status(500).json({
      success: false,
      message: error.message || "Stability API Poll error",
    });
  }
});

module.exports = router;
