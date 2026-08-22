const express = require("express");
const router = express.Router();
const multer = require("multer");
const rateLimit = require("express-rate-limit");

const logoService = require("../utils/logoService");
const Logo = require("../models/Logo");
const { saveImage, getImage } = require("../utils/logoStorageService");
const { protect } = require("../middleware/auth");
const { aiGenerationLimiter } = require("../middleware/rateLimiter");

// ---------- Multer (memory, AI friendly) ----------
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
});

// ---------- Rate limit ----------
const refineLimiter = rateLimit({ windowMs: 60000, max: 10 });

router.post("/generate", protect, aiGenerationLimiter, async (req, res) => {
  const {
    businessName,
    tagline = "",
    industry = "general business",
    style = "modern minimal",
    colors = [],
    description = "",
    count = 1,
  } = req.body;
  const userId = req.user.id;
  if (!req.user || !req.user.id) {
    return res.status(401).json({
      success: false,
      message: "User must be logged in",
    });
  }

  if (!businessName) {
    return res
      .status(400)
      .json({ success: false, message: "Business name required" });
  }

  try {
    const { generationId, imageBuffers } =
      await logoService.generateLogoConcepts({
        businessName,
        tagline,
        industry,
        style,
        colors,
        description,
        count,
        userId, // Pass userId for tracking
      });

    const images = [];

    for (const buffer of imageBuffers) {
      const saved = await saveImage(buffer, userId, "generated");

      await Logo.create({
        userId,
        generationId,
        imageId: saved.imageId,
        imageUrl: saved.imageUrl,
        type: "generated",
        inputs: req.body,
      });

      images.push({
        imageId: saved.imageId,
        url: saved.imageUrl,
      });
    }

    res.status(201).json({
      success: true,
      generationId,
      images,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Generation failed" });
  }
});

router.post(
  "/refine",
  protect,
  refineLimiter,
  upload.single("sourceImageFile"),
  async (req, res) => {
    const {
      generationId,
      sourceImageId,
      refineInstruction,
      controlStrength = 0.7,
      count = 3,
    } = req.body;

    const userId = req.user.id;
    console.log("userId",userId)

    if (!generationId || !refineInstruction) {
      return res.status(400).json({
        success: false,
        message: "generationId and refineInstruction are required",
      });
    }

    try {
      let sourceBuffer;

      if (req.file) {
        sourceBuffer = req.file.buffer;
      } else if (sourceImageId) {
        sourceBuffer = await getImage(sourceImageId, "generated");
      } else {
        return res.status(400).json({
          success: false,
          message: "sourceImageId or sourceImageFile required",
        });
      }

      const images = [];

      for (let i = 0; i < count; i++) {
        const refinedBuffer = await logoService.refineLogo(
          { refineInstruction, controlStrength, userId }, // Pass userId for tracking
          sourceBuffer
        );

        const saved = await saveImage(refinedBuffer, userId, "refined");

        await Logo.create({
          userId,
          generationId,
          parentImageId: sourceImageId,
          imageId: saved.imageId,
          imageUrl: saved.imageUrl,
          type: "refined",
          inputs: { refineInstruction },
        });

        images.push({
          imageId: saved.imageId,
          url: saved.imageUrl,
        });
      }

      res.status(201).json({
        success: true,
        images,
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, message: "Refine failed" });
    }
  }
);

module.exports = router;
