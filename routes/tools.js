const express = require("express");
const Tool = require("../models/Tool");
const ToolCategory = require("../models/ToolCategory");
const AIFilter = require("../models/AIFilter");
const AIModel = require("../models/AIModel");
const ChatHistory = require("../models/ChatHistory");
const User = require("../models/User");
const ChatService = require("../utils/chatService");
const { protect, authorize } = require("../middleware/auth");
const { aiGenerationLimiter } = require("../middleware/rateLimiter");
const {
  validateTool,
  handleValidationErrors,
} = require("../middleware/validation");
const multer = require("multer");
const upload = multer();
const {
  generateAIResponse,
  generateStreamingAIResponse,
  aiService,
} = require("../utils/aiService");
const PromptHistory = require("../models/PromptHistory");
const {
  checkSafety,
  checkSacredFiguresPolicy,
  SACRED_FIGURES_ERROR_MESSAGE,
} = require("../utils/safetyGate");
const {
  saveViolation,
  getBlockMessage,
  checkUserViolationStatus,
} = require("../utils/violations");
const AIProvider = require("../models/AIProvider");


function extractLatestUserMessage(prompt) {
  if (!prompt || typeof prompt !== "string") return "";

  // If prompt has {{historyData}}, the actual new request is always the part before it
  if (prompt.includes("{{historyData}}")) {
    return prompt.split("{{historyData}}")[0].trim();
  }

  // 1. If it's a Multi-Chat history aware prompt:
  if (prompt.includes("CURRENT REQUEST:")) {
    const parts = prompt.split(/CURRENT REQUEST:/i);
    return parts[parts.length - 1].trim();
  }

  // 2. Generic chat history format (e.g. "User: prompt \n AI: response")
  if (prompt.includes("User:") || prompt.includes("AI:")) {
    const turns = prompt.split(/(?:User:|AI:)/i);
    for (let i = turns.length - 1; i >= 0; i--) {
      const turn = turns[i].trim();
      if (turn.length > 0) {
        const lower = turn.toLowerCase();
        if (
          !lower.includes("content policy") &&
          !lower.includes("for your own safety") &&
          !lower.includes("safety systems") &&
          !lower.includes("findahelpline")
        ) {
          return turn;
        }
      }
    }
  }

  return prompt.trim();
}

async function runSafetyCheck(
  req,
  res,
  prompt,
  imageUrl = null,
  toolName = "unknown",
) {
  // Pre-flight Account Suspension Check
  if (req.user && req.user.status === "suspended") {
    res.status(403).json({
      blocked: true,
      type: "account_suspended",
      message:
        "Your account has been suspended due to violations of our Content Safety Policy. Please contact support for assistance.",
    });
    return false;
  }

  // Pre-flight 30-day repeat offender check (auto-suspends at 5+ violations)
  if (req.user && req.user.id) {
    const vStatus = await checkUserViolationStatus(req.user.id);
    if (vStatus.banned) {
      res.status(403).json({
        blocked: true,
        type: "account_suspended",
        message:
          "Your account has been suspended due to violations of our Content Safety Policy. Please contact support for assistance.",
      });
      return false;
    }
  }

  const sanitizedPrompt = extractLatestUserMessage(prompt);
  const check = await checkSafety(sanitizedPrompt, imageUrl);
  if (!check.allow) {
    await saveViolation({
      userId: req.user ? req.user.id : "anonymous",
      categories: check.categories,
      scores: check.scores,
      tool: toolName,
      source: "input_check",
      promptText: sanitizedPrompt || "",
    });
    const blockInfo = getBlockMessage(check.categories);
    res.status(400).json({
      blocked: true,
      type: blockInfo.type,
      message: blockInfo.message,
      resourceText: blockInfo.resourceText || null,
      resourceUrl: blockInfo.resourceUrl || null,
    });
    return false;
  }
  return true;
}

async function runOutputSafetyCheck(req, res, imageUrl, toolName = "unknown") {
  if (!imageUrl) return true;
  const check = await checkSafety("", imageUrl);
  if (!check.allow) {
    await saveViolation({
      userId: req.user ? req.user.id : "anonymous",
      categories: check.categories,
      scores: check.scores,
      tool: toolName,
      source: "output_check",
      promptText: "[AI Generated Output Image]",
    });
    const blockInfo = getBlockMessage(check.categories);
    res.status(400).json({
      blocked: true,
      type: blockInfo.type,
      message:
        "The AI-generated content was flagged by our safety system: " +
        blockInfo.message,
      resourceText: blockInfo.resourceText || null,
      resourceUrl: blockInfo.resourceUrl || null,
    });
    return false;
  }
  return true;
}

const fs = require("fs");
const path = require("path");
const { PDFDocument, rgb } = require("pdf-lib");
const fontkit = require("@pdf-lib/fontkit");
const {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  ImageRun,
  AlignmentType,
} = require("docx");
const marked = require("marked");
const he = require("he");

async function createPdfFile(content) {
  const pdfDoc = await PDFDocument.create();

  // ✅ Register fontkit
  pdfDoc.registerFontkit(fontkit);

  let page = pdfDoc.addPage([600, 800]);
  const { width, height } = page.getSize();

  // Load your font file
  const fontPath = path.join(
    process.cwd(),
    "fonts",
    "dejavu-fonts-ttf-2.37",
    "ttf",
    "DejaVuSans.ttf",
  );

  const fontBytes = fs.readFileSync(fontPath);

  // ✅ Embed with custom font
  const font = await pdfDoc.embedFont(fontBytes, { subset: true });

  const contentFontSize = 12;
  const margin = 50;
  let y = height - margin;
  const maxWidth = width - 2 * margin;

  // Split content into paragraphs
  const paragraphs = content.split(/\n/);

  for (let paragraph of paragraphs) {
    const words = paragraph.split(/\s+/);
    let line = "";

    for (let word of words) {
      const testLine = line ? line + " " + word : word;
      const testWidth = font.widthOfTextAtSize(testLine, contentFontSize);

      if (testWidth > maxWidth) {
        page.drawText(line, {
          x: margin,
          y,
          size: contentFontSize,
          font,
          color: rgb(0, 0, 0),
        });
        line = word;
        y -= contentFontSize + 5;

        if (y < margin) {
          page = pdfDoc.addPage([600, 800]);
          y = height - margin;
        }
      } else {
        line = testLine;
      }
    }

    if (line) {
      page.drawText(line, {
        x: margin,
        y,
        size: contentFontSize,
        font,
        color: rgb(0, 0, 0),
      });
      y -= contentFontSize + 5;
    }

    y -= contentFontSize;
    if (y < margin) {
      page = pdfDoc.addPage([600, 800]);
      y = height - margin;
    }
  }

  const pdfBytes = await pdfDoc.save();

  const uploadDir = path.join(process.cwd(), "uploads");
  if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

  const fileName = `${Date.now()}-document.pdf`;
  const filePath = path.join(uploadDir, fileName);

  fs.writeFileSync(filePath, Buffer.from(pdfBytes));

  return fileName;
}

const checkSingleChatLimit = async (req, res, next) => {
  const { source, promptId } = req.body;

  if (source !== "single-chat-text" && source !== "single-chat-image")
    return next();

  const userId = req.user
    ? req.user.id
    : req.guestUser
      ? req.guestUser._id
      : null;
  if (!userId) return next();

  try {
    const user = await User.findById(userId);
    if (!user) return next();

    let limit;
    let usageField;

    if (source === "single-chat-text") {
      // Updated Text Limits
      if (user.plan === "pro_max") limit = 125;
      else if (user.plan === "pro") limit = 50;
      else if (user.plan === "lite" || user.plan === "standard") limit = 25;
      else limit = 10; // Free plan
      usageField = "single_chat_text_usage";
    } else if (source === "single-chat-image") {
      // Image Limits
      if (user.plan === "pro_max") limit = 20;
      else if (user.plan === "pro") limit = 10;
      else if (user.plan === "lite" || user.plan === "standard") limit = 5;
      else limit = 0;
      usageField = "single_chat_image_usage";
    }

    // Initialize if null (24-hour window)
    if (!user[usageField] || !user[usageField].reset_at) {
      user[usageField] = {
        count: 0,
        reset_at: new Date(Date.now() + 24 * 60 * 60 * 1000),
      };
    }

    // Reset 24-hour window
    if (new Date() > user[usageField].reset_at) {
      user[usageField].count = 0;
      user[usageField].reset_at = new Date(Date.now() + 24 * 60 * 60 * 1000);
    }

    // Process limit
    if (user[usageField].last_prompt_id !== promptId) {
      if (user[usageField].count >= limit) {
        return res.status(429).json({
          success: false,
          message: `You have exceeded your daily rate limit. Please upgrade your plan or try again in 24 hours.`,
        });
      }
      user[usageField].count += 1;
      user[usageField].last_prompt_id = promptId;
      await user.save();
    } else {
      if (user[usageField].count > limit) {
        return res.status(429).json({
          success: false,
          message: `You have exceeded your daily rate limit. Please upgrade your plan or try again in 24 hours.`,
        });
      }
    }

    next();
  } catch (error) {
    next();
  }
};

const checkDualChatLimit = async (req, res, next) => {
  const { source, promptId } = req.body;

  if (source !== "dual-chat-text" && source !== "dual-chat-image")
    return next();

  const userId = req.user
    ? req.user.id
    : req.guestUser
      ? req.guestUser._id
      : null;
  if (!userId) return next();

  try {
    const user = await User.findById(userId);
    if (!user) return next();

    let limit;
    let usageField;

    if (source === "dual-chat-text") {
      // Updated Text Limits
      if (user.plan === "pro_max") limit = 125;
      else if (user.plan === "pro") limit = 50;
      else if (user.plan === "lite" || user.plan === "standard") limit = 25;
      else limit = 10;
      usageField = "dual_chat_text_usage";
    } else {
      // Image Limits
      if (user.plan === "pro_max") limit = 20;
      else if (user.plan === "pro") limit = 10;
      else if (user.plan === "lite" || user.plan === "standard") limit = 5;
      else limit = 0;
      usageField = "dual_chat_image_usage";
    }

    // Initialize if null (24-hour window)
    if (!user[usageField] || !user[usageField].reset_at) {
      user[usageField] = {
        count: 0,
        reset_at: new Date(Date.now() + 24 * 60 * 60 * 1000),
      };
    }

    // Reset 24-hour window
    if (new Date() > user[usageField].reset_at) {
      user[usageField].count = 0;
      user[usageField].reset_at = new Date(Date.now() + 24 * 60 * 60 * 1000);
    }

    // Process limit
    if (user[usageField].last_prompt_id !== promptId) {
      if (user[usageField].count >= limit) {
        return res.status(429).json({
          success: false,
          message: `You have exceeded your daily rate limit. Please upgrade your plan or try again in 24 hours.`,
        });
      }
      user[usageField].count += 1;
      user[usageField].last_prompt_id = promptId;
      await user.save();
    } else {
      if (user[usageField].count > limit) {
        return res.status(429).json({
          success: false,
          message: `You have exceeded your daily rate limit. Please upgrade your plan or try again in 24 hours.`,
        });
      }
    }

    next();
  } catch (error) {
    next();
  }
};

const checkMultiChatLimit = async (req, res, next) => {
  const { source, promptId } = req.body;

  if (source !== "multi-chat-text" && source !== "multi-chat-image")
    return next();

  const userId = req.user
    ? req.user.id
    : req.guestUser
      ? req.guestUser._id
      : null;
  if (!userId) return next();

  try {
    const user = await User.findById(userId);
    if (!user) return next();

    let limit;
    let usageField;

    if (source === "multi-chat-text") {
      // Updated Text Limits
      if (user.plan === "pro_max") limit = 125;
      else if (user.plan === "pro") limit = 50;
      else if (user.plan === "lite" || user.plan === "standard") limit = 25;
      else limit = 10;
      usageField = "multi_chat_text_usage";
    } else {
      // Image Limits
      if (user.plan === "pro_max") limit = 10;
      else if (user.plan === "pro") limit = 5;
      else if (user.plan === "lite" || user.plan === "standard") limit = 2;
      else limit = 0;
      usageField = "multi_chat_image_usage";
    }

    // Initialize if null (24-hour window)
    if (!user[usageField] || !user[usageField].reset_at) {
      user[usageField] = {
        count: 0,
        reset_at: new Date(Date.now() + 24 * 60 * 60 * 1000),
      };
    }

    // Reset 24-hour window
    if (new Date() > user[usageField].reset_at) {
      user[usageField].count = 0;
      user[usageField].reset_at = new Date(Date.now() + 24 * 60 * 60 * 1000);
    }

    // Process limit
    if (user[usageField].last_prompt_id !== promptId) {
      if (user[usageField].count >= limit) {
        return res.status(429).json({
          success: false,
          message: `You have exceeded your daily rate limit. Please upgrade your plan or try again in 24 hours.`,
        });
      }
      user[usageField].count += 1;
      user[usageField].last_prompt_id = promptId;
      await user.save();
    } else {
      if (user[usageField].count > limit) {
        return res.status(429).json({
          success: false,
          message: `You have exceeded your daily rate limit. Please upgrade your plan or try again in 24 hours.`,
        });
      }
    }

    next();
  } catch (error) {
    next();
  }
};

const checkCombinedChatLimit = async (req, res, next) => {
  const { source, promptId } = req.body;

  // Identify if the request is for text. If it's an image or something else, skip limiting.
  const isText = source && source.includes("-text");
  if (!isText) return next();

  const userId = req.user
    ? req.user.id
    : req.guestUser
      ? req.guestUser._id
      : null;

  if (!userId) return next();

  try {
    const user = await User.findById(userId);
    if (!user) return next();

    let limit;
    const usageField = "combined_chat_text_usage";

    // COMBINED TEXT LIMITS (All Chat Types)
    if (user.plan === "pro_max") limit = 100;
    else if (user.plan === "pro") limit = 50;
    else if (
      user.plan === "standard" ||
      user.plan === "lite" ||
      user.subscription_status === "trialing"
    ) {
      limit = 30;
    } else limit = 5; // Free plan

    // Initialize if null (24-hour window)
    if (!user[usageField] || !user[usageField].reset_at) {
      user[usageField] = {
        count: 0,
        reset_at: new Date(Date.now() + 24 * 60 * 60 * 1000),
      };
    }

    // Reset 24-hour window if time has passed
    if (new Date() > user[usageField].reset_at) {
      user[usageField].count = 0;
      user[usageField].reset_at = new Date(Date.now() + 24 * 60 * 60 * 1000);
    }

    // Check the limit against the unified count without incrementing (increment happens only on successful AI response)
    if (user[usageField].count >= limit) {
      return res.status(429).json({
        success: false,
        message: `You have exceeded your daily limit. Please upgrade your plan or try again in 24 hours.`,
      });
    }

    next();
  } catch (error) {
    console.error("Rate limit check error:", error);
    next();
  }
};

const router = express.Router();

// Helper function to build suggested topic prompt
const buildSuggestedTopicPrompt = (topicData, userInput = "") => {
  let prompt = topicData.title;

  if (topicData.has_input && userInput) {
    prompt = prompt.replace(/{{user_input}}/gi, userInput);
    prompt = prompt.replace(/{{type_anything}}/gi, userInput);
  }

  return prompt;
};

// Helper function to build tab prompt
const buildTabPrompt = (tabData, formData) => {
  let prompt = tabData.prompt_template;

  tabData.fields.forEach((field) => {
    const placeholder = `{{${field.key}}}`;
    const value = formData[field.key] || field.default_value || "";
    prompt = prompt.replace(new RegExp(placeholder, "g"), value);
  });

  return prompt;
};

// Helper function to process and store search results
const processSearchResults = (searchResults) => {
  if (!Array.isArray(searchResults)) return null;

  return searchResults.map((result) => ({
    title: result.title || "",
    url: result.url || "",
    date: result.date || null,
    last_updated: result.last_updated || null,
    snippet: result.snippet || result.description || "",
  }));
};

// ==========================================
// DYNAMIC IMAGE PRICING CALCULATOR
// ==========================================
const calculateImageCreditCost = (model, plan) => {
  // Map user plan to the pricing matrix keys
  let userTier = "pro"; // Default to pro
  if (plan === "pro_max") userTier = "pro_max";
  else if (plan === "standard" || plan === "lite") userTier = "standard";

  const pricingMatrix = {
    // OpenAI / ChatGPT
    "gpt-image-1-mini": { standard: 2, pro: 2, pro_max: 2 },
    "gpt-image-1": { standard: 8, pro: 8, pro_max: 8 },
    "gpt-image-1.5": { standard: 8, pro: 8, pro_max: 8 },

    // Gemini
    nanobanana: { standard: 2, pro: 2, pro_max: 2 },
    "nano-pro": { standard: 8, pro: 8, pro_max: 8 },
    "gemini-3.1-flash-image-preview": { standard: 3, pro: 3, pro_max: 3 },

    // Flux
    "flux-2-flex": { standard: 5, pro: 5, pro_max: 5 },
    "flux-2-pro": { standard: 2, pro: 2, pro_max: 2 },
    "flux-2-max": { standard: 5, pro: 5, pro_max: 5 },

    "krea-2": { standard: 4, pro: 4, pro_max: 4 },

    // Stability / Stable Diffusion (Mapping core/ultra to SD 3.5)
    core: { standard: 3, pro: 3, pro_max: 3 },
    ultra: { standard: 3, pro: 3, pro_max: 3 },
    "stable-fast-3d": { standard: 5, pro: 5, pro_max: 5 },
    "sketch-to-image": { standard: 4, pro: 4, pro_max: 4 },
    "kling-image-o1": { standard: 3, pro: 3, pro_max: 3 },

    // SeeDream
    seedream: { standard: 3, pro: 3, pro_max: 3 },

    // Recraft
    recraftv3: { standard: 3, pro: 3, pro_max: 3 },
    recraftv4: { standard: 3, pro: 3, pro_max: 3 },
    recraftv4_pro: { standard: 19, pro: 19, pro_max: 19 },

    // Ideogram
    V_2_TURBO: { standard: 4, pro: 4, pro_max: 4 },
    V_2: { standard: 6, pro: 6, pro_max: 6 }, // 2 Default
    V_3: { standard: 5, pro: 5, pro_max: 5 }, // 3 Default
    V_3_TURBO: { standard: 2, pro: 2, pro_max: 2 },
    V_3_QUALITY: { standard: 7, pro: 7, pro_max: 7 },

    // Fallback if model is not listed
    default: { standard: 3, pro: 3, pro_max: 3 },
  };

  const modelPricing = pricingMatrix[model] || pricingMatrix["default"];
  return modelPricing[userTier];
};
// ==========================================
// GENERATE IMAGE ROUTE
// ==========================================
router.post(
  "/generate-image",
  upload.single("image"),
  protect,
  aiGenerationLimiter,
  async (req, res) => {
    let { prompt, model = "core" } = req.body;
    const imageFile = req.file;

    let safetyImageUrl = null;
    if (imageFile) {
      let mimeType = imageFile.mimetype || "image/jpeg";
      if (mimeType === "application/octet-stream") {
        const ext = imageFile.originalname
          ? imageFile.originalname.split(".").pop().toLowerCase()
          : "";
        mimeType = ext === "png" ? "image/png" : "image/jpeg";
      }
      safetyImageUrl = `data:${mimeType};base64,${imageFile.buffer.toString("base64")}`;
    }
    const isSafe = await runSafetyCheck(
      req,
      res,
      prompt,
      safetyImageUrl,
      "generate-image",
    );
    if (!isSafe) return;

    // Content Moderation: Protected Sacred Figures Policy Check
    const sacredCheck = checkSacredFiguresPolicy([prompt]);
    if (sacredCheck.blocked) {
      return res.status(400).json({
        success: false,
        error: sacredCheck.message,
      });
    }

    try {
      // 1. Fetch user
      const user = await User.findById(req.user.id);

      if (!user) {
        return res
          .status(404)
          .json({ success: false, error: "User not found" });
      }

      // 2. Free user block
      if (user.plan === "basic") {
        return res.status(403).json({
          success: false,
          error:
            "Free users cannot generate images. Please upgrade to a Standard, Pro, or Pro Max plan.",
        });
      }

      if (user.subscription_status === "trialing") {
        return res.status(403).json({
          success: false,
          error:
            "Image generation is not available during the free trial. Please wait for your trial to end and your subscription to become active.",
        });
      }

      // 3. CALCULATE DYNAMIC COST
      const creditCost = calculateImageCreditCost(model, user.plan);

      // 4. CHECK BALANCE
      if ((user.image_credits || 0) < creditCost) {
        return res.status(402).json({
          success: false,
          error: `Insufficient image credits. This image requires ${creditCost} credits, but you only have ${user.image_credits || 0}.`,
        });
      }

      const ratioMatch = prompt.match(/Aspect Ratio\s*[:=]\s*(\d+:\d+|auto)/i);
      const ratio = ratioMatch ? ratioMatch[1] : "1:1";

      // Remove Aspect Ratio text from prompt
      prompt = prompt
        .replace(/,?\s*Aspect Ratio\s*[:=]\s*(\d+:\d+|auto)/i, "")
        .trim();

      let imageData;
      let contentType = "image/png";

      // 5. GENERATE IMAGE
      switch (model) {
        case "core":
          imageData = await aiService.generateCoreImage(
            prompt,
            imageFile,
            ratio,
            user._id,
          );
          break;
        case "ultra":
          imageData = await aiService.generateUltraImage(
            prompt,
            imageFile,
            ratio,
            user._id,
          );
          break;
        case "stable-fast-3d":
          imageData = await aiService.generateStableFast3D(
            prompt,
            imageFile,
            user._id,
          );
          contentType = "model/gltf-binary";
          break;
        case "sketch-to-image":
          imageData = await aiService.generateSketchToImage(
            prompt,
            imageFile,
            user._id,
          );
          contentType = "image/png";
          break;
        case "gpt-image-1":
        case "gpt-image-1.5":
        case "gpt-image-1-mini":
          imageData = await aiService.generateOpenAIImage(
            model,
            prompt,
            imageFile,
            ratio,
          );
          break;
        case "nanobanana":
        case "nano-pro":
        case "gemini-3.1-flash-image-preview":
          imageData = await aiService.generateNanoBananaImage(
            model,
            prompt,
            imageFile,
            ratio,
          );
          break;
        case "flux-2-pro":
        case "flux-2-flex":
        case "flux-2-max":
          imageData = await aiService.generateFluxImage(
            model,
            prompt,
            imageFile,
            ratio,
          );
          contentType = "image/jpeg";
          break;
        case "krea-2":
          imageData = await aiService.generateKreaImage(
            model,
            prompt,
            imageFile,
            ratio,
          );
          contentType = "image/jpeg"; // Krea typically returns JPEGs or WebP
          break;
        case "seedream":
          imageData = await aiService.generateSeedreamImage(
            model,
            prompt,
            imageFile,
            ratio,
          );
          contentType = "image/png";
          break;
        case "kling-image-o1":
          imageData = await aiService.generateKlingO1Image(
            prompt,
            imageFile,
            ratio,
          );
          contentType = "image/png";
          break;
        case "V_2":
        case "V_2_TURBO":
        case "V_3":
        case "V_3_TURBO":
        case "V_3_QUALITY":
          imageData = await aiService.generateIdeogramImage(
            model,
            prompt,
            imageFile,
            ratio,
          );
          contentType = "image/jpeg";
          break;
        case "recraftv3":
        case "recraftv4":
        case "recraftv4_pro":
          const recraftRes = await aiService.generateRecraftImage(
            model,
            prompt,
            imageFile,
            ratio,
          );
          imageData = recraftRes.buffer;
          contentType = recraftRes.contentType || "image/png";
          break;
        default:
          return res.status(400).json({ error: "Invalid model provided" });
      }

      // 6. DEDUCT DYNAMIC CREDITS UPON SUCCESS
      await User.findByIdAndUpdate(req.user.id, {
        $inc: { image_credits: -creditCost },
      });
      await user.save();

      res.set("Content-Type", contentType);
      res.send(imageData);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },
);

// ==========================================
// AI FILTER ROUTE
// ==========================================
// router.post("/ai-filter", upload.single("image"), protect, async (req, res) => {
//   const { style } = req.body;
//   const imageFile = req.file;

//   if (!style) {
//     return res.status(400).json({ error: "Style is required" });
//   }
//   if (!imageFile) {
//     return res.status(400).json({ error: "Image is required" });
//   }

//   try {
//     const user = await User.findById(req.user.id);
//     if (!user) {
//       return res.status(404).json({ success: false, error: "User not found" });
//     }

//     if (user.plan === "basic") {
//       return res.status(403).json({
//         success: false,
//         error: "Free users cannot use AI filters. Please upgrade.",
//       });
//     }

//     if (user.subscription_status === "trialing") {
//       return res.status(403).json({
//         success: false,
//         error:
//           "AI filters are not available during the free trial. Please wait for your trial to end and your subscription to become active.",
//       });
//     }
// --- NEW PROMPT ENHANCER ---
// This forces the AI to heavily apply the requested style
//     const enhancedPrompt = `Transform this person into ${style} style. Highly detailed, perfect face, masterpiece, character design, vivid colors, matching the exact aesthetic of ${style}.`;

// Pass the enhancedPrompt instead of just 'style'
//     const imageData = await aiService.generateAiFilter(
//       enhancedPrompt,
//       imageFile,
//     );

//     res.set("Content-Type", "image/png");
//     res.send(imageData);
//   } catch (error) {
//     res
//       .status(500)
//       .json({ error: error.message || "Failed to generate AI filter" });
//   }
// });

// ==========================================
// AI FILTER ROUTE
// ==========================================
router.post(
  "/ai-filter",
  upload.single("image"),
  protect,
  aiGenerationLimiter,
  async (req, res) => {
    const { style, prompt, strength } = req.body;
    const imageFile = req.file;

    if (!style) {
      return res.status(400).json({ error: "Style is required" });
    }
    let safetyImageUrl = null;
    if (imageFile) {
      let mimeType = imageFile.mimetype || "image/jpeg";
      if (mimeType === "application/octet-stream") {
        const ext = imageFile.originalname
          ? imageFile.originalname.split(".").pop().toLowerCase()
          : "";
        mimeType = ext === "png" ? "image/png" : "image/jpeg";
      }
      safetyImageUrl = `data:${mimeType};base64,${imageFile.buffer.toString("base64")}`;
    }
    // Normalize / sanitize sensitive prompt keywords for age filters (e.g., Girl/Boy) to prevent false safety triggers
    let sanitizedPrompt = prompt || "";
    if (sanitizedPrompt) {
      sanitizedPrompt = sanitizedPrompt
        .replace(/\bchildlike\b/gi, "youthful-looking adult")
        .replace(/\bchild\b/gi, "adult")
        .replace(/\bchildren\b/gi, "adults");
    }

    const isSafe = await runSafetyCheck(
      req,
      res,
      sanitizedPrompt || `Apply ${style} style transformation`,
      safetyImageUrl,
      "ai-filter",
    );
    if (!isSafe) return;

    // Content Moderation: Protected Sacred Figures Policy Check
    const sacredCheck = checkSacredFiguresPolicy([sanitizedPrompt, style]);
    if (sacredCheck.blocked) {
      return res.status(400).json({
        success: false,
        error: sacredCheck.message,
      });
    }

    try {
      const user = await User.findById(req.user.id);
      if (!user) {
        return res
          .status(404)
          .json({ success: false, error: "User not found" });
      }

      if (user.plan === "basic") {
        return res.status(403).json({
          success: false,
          error: "Free users cannot use AI filters. Please upgrade.",
        });
      }

      if (user.subscription_status === "trialing") {
        return res.status(403).json({
          success: false,
          error:
            "AI filters are not available during the free trial. Please wait for your trial to end and your subscription to become active.",
        });
      }

      // --- PROMPT OPTIMIZER FOR FACIAL IDENTITY & STYLE FIDELITY ---
      const identityInstructions =
        "CRITICAL INSTRUCTIONS: Maintain the exact same person, facial identity, facial structure, ethnic features, eyes, nose, mouth shape, head shape, hair color, eye color, original expression, pose, and background framing from the input image. Do NOT change the person into a different person or change their race/ethnicity. Apply the requested filter transformation directly onto this exact individual while keeping their face unmistakably recognizable as the original person.";

      let cleanStyle = style.trim();
      let enhancedPrompt = "";
      if (sanitizedPrompt && sanitizedPrompt.trim()) {
        enhancedPrompt = `Apply ${cleanStyle} style transformation to the person in the image. Description/Instructions: ${sanitizedPrompt.trim()}. ${identityInstructions}`;
      } else {
        enhancedPrompt = `Apply ${cleanStyle} style transformation to the person in the image. Highly detailed, high quality, authentic rendering of the person in ${cleanStyle} aesthetic. ${identityInstructions}`;
      }
      let appliedStrength = strength;

      // Fetch the style's default strength configured in the database if not explicitly passed
      if (!appliedStrength) {
        try {
          const filterRecord = await AIFilter.findOne({
            name: { $regex: new RegExp(`^${style}$`, "i") },
          });
          if (filterRecord && filterRecord.strength !== undefined) {
            appliedStrength = filterRecord.strength;
          }
        } catch (dbErr) {
          console.error("Error fetching AIFilter default strength:", dbErr);
        }
      }

      // Pass the enhancedPrompt and strength to generateAiFilter
      const imageData = await aiService.generateAiFilter(
        enhancedPrompt,
        imageFile,
        appliedStrength,
      );

      res.set("Content-Type", "image/png");
      res.send(imageData);
    } catch (error) {
      res
        .status(500)
        .json({ error: error.message || "Failed to generate AI filter" });
    }
  },
);
// ==========================================
// GENERATE ULTRA IMAGE ROUTE
// ==========================================
router.post(
  "/generate-ultra-image",
  upload.single("image"),
  protect,
  aiGenerationLimiter,
  async (req, res) => {
    let { prompt, model = "ultra" } = req.body;
    const imageFile = req.file;

    let safetyImageUrl = null;
    if (imageFile) {
      let mimeType = imageFile.mimetype || "image/jpeg";
      if (mimeType === "application/octet-stream") {
        const ext = imageFile.originalname
          ? imageFile.originalname.split(".").pop().toLowerCase()
          : "";
        mimeType = ext === "png" ? "image/png" : "image/jpeg";
      }
      safetyImageUrl = `data:${mimeType};base64,${imageFile.buffer.toString("base64")}`;
    }
    const isSafe = await runSafetyCheck(
      req,
      res,
      prompt,
      safetyImageUrl,
      "generate-ultra-image",
    );
    if (!isSafe) return;

    try {
      // 1. Fetch user
      const user = await User.findById(req.user.id);

      if (!user) {
        return res
          .status(404)
          .json({ success: false, error: "User not found" });
      }

      // 2. Free user block
      if (user.plan === "basic") {
        return res.status(403).json({
          success: false,
          error:
            "Free users cannot generate images. Please upgrade to a Standard, Pro, or Pro Max plan.",
        });
      }

      if (user.subscription_status === "trialing") {
        return res.status(403).json({
          success: false,
          error:
            "Image generation is not available during the free trial. Please wait for your trial to end and your subscription to become active.",
        });
      }

      // 3. CALCULATE DYNAMIC COST
      const creditCost = calculateImageCreditCost(model, user.plan);

      // 4. CHECK BALANCE
      if ((user.image_credits || 0) < creditCost) {
        return res.status(402).json({
          success: false,
          error: `Insufficient image credits. This image requires ${creditCost} credits, but you only have ${user.image_credits || 0}.`,
        });
      }

      // Extract aspect ratio from prompt
      const ratioMatch = prompt.match(/Aspect Ratio\s*[:=]\s*(\d+:\d+|auto)/i);
      const ratio = ratioMatch ? ratioMatch[1] : "1:1";
      prompt = prompt
        .replace(/,?\s*Aspect Ratio\s*[:=]\s*(\d+:\d+|auto)/i, "")
        .trim();

      let imageData;
      let contentType = "image/png";

      // 5. GENERATE IMAGE
      switch (model) {
        case "core":
          imageData = await aiService.generateCoreImage(
            prompt,
            imageFile,
            ratio,
            user._id,
          );
          break;
        case "ultra":
          imageData = await aiService.generateUltraImage(
            prompt,
            imageFile,
            ratio,
            user._id,
          );
          break;
        case "stable-fast-3d":
          imageData = await aiService.generateStableFast3D(
            prompt,
            imageFile,
            user._id,
          );
          contentType = "model/gltf-binary";
          break;
        case "sketch-to-image":
          imageData = await aiService.generateSketchToImage(
            prompt,
            imageFile,
            user._id,
          );
          contentType = "image/png";
          break;
        case "gpt-image-1":
        case "gpt-image-1-mini":
        case "gpt-image-1.5":
          imageData = await aiService.generateOpenAIImage(
            model,
            prompt,
            imageFile,
            ratio,
          );
          break;
        case "nanobanana":
        case "nano-pro":
        case "gemini-3.1-flash-image-preview":
          imageData = await aiService.generateNanoBananaImage(
            model,
            prompt,
            imageFile,
            ratio,
          );
          break;
        case "flux-2-pro":
        case "flux-2-flex":
        case "flux-2-max":
          imageData = await aiService.generateFluxImage(
            model,
            prompt,
            imageFile,
            ratio,
          );
          contentType = "image/jpeg";
          break;
        case "krea-2":
          imageData = await aiService.generateKreaImage(
            model,
            prompt,
            imageFile,
            ratio,
          );
          contentType = "image/jpeg"; // Krea typically returns JPEGs or WebP
          break;
        case "seedream":
          imageData = await aiService.generateSeedreamImage(
            model,
            prompt,
            imageFile,
            ratio,
          );
          contentType = "image/png";
          break;
        case "kling-image-o1":
          imageData = await aiService.generateKlingO1Image(
            prompt,
            imageFile,
            ratio,
          );
          contentType = "image/png";
          break;
        case "V_2":
        case "V_2_TURBO":
        case "V_3":
        case "V_3_TURBO":
        case "V_3_QUALITY":
          imageData = await aiService.generateIdeogramImage(
            model,
            prompt,
            imageFile,
            ratio,
          );
          contentType = "image/jpeg";
          break;
        case "recraftv3":
        case "recraftv4":
        case "recraftv4_pro":
          const recraftRes = await aiService.generateRecraftImage(
            model,
            prompt,
            imageFile,
            ratio,
          );
          imageData = recraftRes.buffer;
          contentType = recraftRes.contentType || "image/png";
          break;
        default:
          return res.status(400).json({ error: "Invalid model provided" });
      }

      // 6. Output Safety Moderation Check
      if (Buffer.isBuffer(imageData) && contentType.startsWith("image/")) {
        const outputDataUri = `data:${contentType};base64,${imageData.toString("base64")}`;
        const isOutputSafe = await runOutputSafetyCheck(
          req,
          res,
          outputDataUri,
          "generate-ultra-image",
        );
        if (!isOutputSafe) return;
      }

      // 7. DEDUCT DYNAMIC CREDITS UPON SUCCESS
      await User.findByIdAndUpdate(req.user.id, {
        $inc: { image_credits: -creditCost },
      });
      await user.save();

      res.set("Content-Type", contentType);
      res.send(imageData);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },
);

// ==========================================
// DYNAMIC PRICING CALCULATOR
// ==========================================
const calculateVideoCreditCost = (model, plan, durationStr, resolution) => {
  const duration = parseInt(durationStr?.replace("s", "") || "8");

  const pricingMatrix = {
    "sora-2": { pro: 7, pro_max: 7 },
    "sora-2-pro": {
      "720p": { pro: 20, pro_max: 21 },
      "1080p": { pro: 33, pro_max: 35 },
    },
    // Veo 2.0 is 720p only
    "veo-2.0-generate-001": { pro: 23, pro_max: 25 },

    // Veo 3 Models
    "veo-3.0-generate-001": {
      "720p": { pro: 26, pro_max: 28 },
      "1080p": { pro: 26, pro_max: 28 },
    },
    "veo-3.0-fast-generate-001": {
      "720p": { pro: 10, pro_max: 11 },
      "1080p": { pro: 10, pro_max: 11 },
    },
    "veo-3.1-generate-preview": {
      "720p": { pro: 26, pro_max: 28 },
      "1080p": { pro: 26, pro_max: 28 },
      "4k": { pro: 39, pro_max: 42 },
    },
    "veo-3.1-fast-generate-preview": {
      "720p": { pro: 10, pro_max: 11 },
      "1080p": { pro: 10, pro_max: 11 },
      "4k": { pro: 23, pro_max: 25 },
    },

    // Kling Models
    "kling-v2-5-turbo": {
      "720p": { pro: 5, pro_max: 5 },
      "1080p": { pro: 5, pro_max: 5 },
    },
    "kling-v3": {
      "720p": { pro: 11, pro_max: 12 },
      "1080p": { pro: 11, pro_max: 12 },
    },

    // ✅ PIKA MODELS UPDATED FOR 720p / 1080p SUPPORT
    "Pika v2.1": {
      "720p": { pro: 5, pro_max: 6 },
      "1080p": { pro: 5, pro_max: 6 }, // Adjust 1080p pricing later if desired
    },
    "Pika v2.2": {
      "720p": { pro: 3, pro_max: 3 },
      "1080p": { pro: 6, pro_max: 6 }, // Adjust 1080p pricing later if desired
    },

    // ✅ CHANGED: Seedance (Now dynamic based on resolution)
    "seedance-2.0": {
      "480p": { pro: 10, pro_max: 10 },
      "720p": { pro: 15, pro_max: 15 },
      "1080p": { pro: 20, pro_max: 20 },
      "4k": { pro: 35, pro_max: 35 },
    },
    "seedance-2.0-fast": {
      "480p": { pro: 8, pro_max: 8 },
      "720p": { pro: 12, pro_max: 12 },
      "1080p": { pro: 16, pro_max: 16 },
      "4k": { pro: 25, pro_max: 25 },
    },

    // MiniMax (Resolution is fixed per model: Pro = 1080p, Standard = 768p)
    "minimax-hailuo-02-standard": { pro: 10, pro_max: 10 },
    "minimax-hailuo-02-pro": { pro: 18, pro_max: 18 },
    "minimax-hailuo-2.3-standard": { pro: 12, pro_max: 12 },
    "minimax-hailuo-2.3-pro": { pro: 20, pro_max: 20 },

    // Wan
    "wan-2.7": {
      "720p": { pro: 15, pro_max: 15 },
      "1080p": { pro: 20, pro_max: 20 },
    },
    "wan-2.6": {
      "720p": { pro: 12, pro_max: 12 },
      "1080p": { pro: 16, pro_max: 16 },
    },
    "wan-2.5-preview": {
      "720p": { pro: 8, pro_max: 8 },
      "1080p": { pro: 12, pro_max: 12 },
    },
    "bernini-r": { standard: 8, pro: 8, pro_max: 8 },
    // PixVerse
    "pixverse-c1": {
      "360p": { pro: 3, pro_max: 3 },
      "540p": { pro: 5, pro_max: 5 },
      "720p": { pro: 8, pro_max: 8 },
      "1080p": { pro: 12, pro_max: 12 },
    },
    "pixverse-v4.5": {
      "360p": { pro: 4, pro_max: 4 },
      "540p": { pro: 6, pro_max: 6 },
      "720p": { pro: 9, pro_max: 9 },
      "1080p": { pro: 14, pro_max: 14 },
    },
    "pixverse-v5": {
      "360p": { pro: 5, pro_max: 5 },
      "540p": { pro: 7, pro_max: 7 },
      "720p": { pro: 10, pro_max: 10 },
      "1080p": { pro: 15, pro_max: 15 },
    },
    "pixverse-v5.5": {
      "360p": { pro: 6, pro_max: 6 },
      "540p": { pro: 8, pro_max: 8 },
      "720p": { pro: 12, pro_max: 12 },
      "1080p": { pro: 18, pro_max: 18 },
    },
    "pixverse-v5.6": {
      "360p": { pro: 7, pro_max: 7 },
      "540p": { pro: 9, pro_max: 9 },
      "720p": { pro: 13, pro_max: 13 },
      "1080p": { pro: 19, pro_max: 19 },
    },
    "pixverse-v6": {
      "360p": { pro: 8, pro_max: 8 },
      "540p": { pro: 10, pro_max: 10 },
      "720p": { pro: 15, pro_max: 15 },
      "1080p": { pro: 22, pro_max: 22 },
    },

    // Runway pricing
    "gen4.5": { pro: 8, pro_max: 8 },

    default: { pro: 10, pro_max: 10 },
  };

  const modelPricing = pricingMatrix[model] || pricingMatrix["default"];
  let costPerSecond;

  // Check if the model uses the nested resolution pricing structure
  if (
    modelPricing["720p"] ||
    modelPricing["1080p"] ||
    modelPricing["4k"] ||
    modelPricing["480p"] ||
    modelPricing["540p"] ||
    modelPricing["360p"]
  ) {
    // Determine the correct resolution key safely
    let resKey = "720p"; // Default

    const resStr = resolution?.toLowerCase() || "";
    if (resStr.includes("4k")) resKey = "4k";
    else if (resStr.includes("1080")) resKey = "1080p";
    else if (resStr.includes("720")) resKey = "720p";
    else if (resStr.includes("540")) resKey = "540p";
    else if (resStr.includes("480")) resKey = "480p";
    else if (resStr.includes("360")) resKey = "360p";

    costPerSecond =
      modelPricing[resKey]?.[plan] ||
      modelPricing[resKey]?.["pro"] ||
      modelPricing["720p"]?.["pro"];
  } else {
    // Standard flat-rate pricing
    costPerSecond = modelPricing[plan] || modelPricing["pro"];
  }

  return costPerSecond * duration;
};

// ==========================================
// VIDEO GENERATION ROUTE
// ==========================================
router.post(
  "/generate-video",
  upload.single("image"),
  protect,
  aiGenerationLimiter,
  async (req, res) => {
    let {
      prompt,
      model = "sora-2",
      duration = "5s",
      aspectRatio,
      resolution = "720p",
      audio = "no", // Extract audio parameter
      audioUrl,
    } = req.body;

    const imageFile = req.file;
    const wantsAudio = audio === "yes" || audio === true;

    let safetyImageUrl = null;
    if (imageFile) {
      let mimeType = imageFile.mimetype || "";
      if (!mimeType || mimeType === "application/octet-stream") {
        const ext = imageFile.originalname
          ? imageFile.originalname.split(".").pop().toLowerCase()
          : "";
        if (["png", "jpg", "jpeg", "webp", "gif"].includes(ext)) {
          mimeType = ext === "png" ? "image/png" : "image/jpeg";
        }
      }
      // OpenAI Moderation API only supports image data URLs (not video/mp4, video/quicktime, etc.)
      if (mimeType.startsWith("image/")) {
        safetyImageUrl = `data:${mimeType};base64,${imageFile.buffer.toString("base64")}`;
      }
    }
    const isSafe = await runSafetyCheck(
      req,
      res,
      prompt,
      safetyImageUrl,
      "generate-video",
    );
    if (!isSafe) return;

    // Content Moderation: Protected Sacred Figures Policy Check
    const sacredCheck = checkSacredFiguresPolicy([prompt]);
    if (sacredCheck.blocked) {
      return res.status(400).json({
        success: false,
        error: sacredCheck.message,
      });
    }

    prompt = `${prompt.trim()}, depicted in a peaceful, calm, and highly serene environment. Completely safe for all audiences, National Geographic documentary style, no violence, no aggression.`;

    try {
      const user = await User.findById(req.user.id);

      if (!user) {
        return res
          .status(404)
          .json({ success: false, error: "User not found" });
      }

      // 1. FREE/STANDARD USER BLOCK
      if (user.plan === "basic" || user.plan === "standard") {
        return res.status(403).json({
          success: false,
          error: `${user.plan === "standard" ? "Basic" : "Free"} users cannot generate videos. Please upgrade to a Pro or Pro Max plan.`,
        });
      }

      if (user.subscription_status === "trialing") {
        return res.status(403).json({
          success: false,
          error:
            "Video generation is not available during the free trial. Please wait for your trial to end and your subscription to become active.",
        });
      }

      const superAdminEmails = [
        "kamarahabib@gmail.com",
        "dhavalnasit3@gmail.com",
      ];
      const isSuperAdmin =
        user.email && superAdminEmails.includes(user.email.toLowerCase());

      // 2. CALCULATE DYNAMIC COST
      const totalCost = calculateVideoCreditCost(
        model,
        user.plan,
        duration,
        resolution,
      );

      // 3. CHECK BALANCE (bypassed for super admin testing)
      if (!isSuperAdmin && (user.video_credits || 0) < totalCost) {
        return res.status(402).json({
          success: false,
          error: `Insufficient video credits. This video requires ${totalCost} credits, but you only have ${user.video_credits || 0}.`,
        });
      }

      req.setTimeout(600000); // 10 minute timeout
      let videoData;
      let contentType = "video/mp4";

      // 4. GENERATE VIDEO
      switch (model) {
        case "sora-2":
        case "sora-2-pro":
          videoData = await aiService.generateSoraVideo(
            model,
            prompt,
            imageFile,
            duration,
            aspectRatio,
            resolution,
            wantsAudio,
          );
          break;
        case "gen4.5":
          videoData = await aiService.generateRunwayVideo(
            model,
            prompt,
            imageFile,
            duration,
            aspectRatio,
            resolution,
            wantsAudio,
          );
          break;
        case "veo-2.0-generate-001":
        case "veo-3.0-generate-001":
        case "veo-3.0-fast-generate-001":
        case "veo-3.1-generate-preview":
        case "veo-3.1-fast-generate-preview":
          videoData = await aiService.generateVeoVideo(
            model,
            prompt,
            imageFile,
            duration,
            aspectRatio,
            resolution,
            wantsAudio,
          );
          break;
        case "kling-v2-5-turbo":
        case "kling-v3":
          videoData = await aiService.generateKlingVideo(
            model,
            prompt,
            imageFile,
            duration,
            aspectRatio,
            resolution,
            wantsAudio,
          );
          break;
        case "Pika v2.1":
        case "Pika v2.2":
          // ✅ Passing wantsAudio securely
          videoData = await aiService.generatePikaVideo(
            model,
            prompt,
            imageFile,
            duration,
            aspectRatio,
            resolution,
            wantsAudio,
          );
          break;
        case "seedance-2.0":
        case "seedance-2.0-fast":
          videoData = await aiService.generateSeedanceVideo(
            model,
            prompt,
            imageFile,
            duration,
            aspectRatio,
            resolution,
            wantsAudio,
          );
          break;
        // 👉 WHEN IT IS USED: If the user selects a MiniMax model
        case "minimax-hailuo-02-standard":
        case "minimax-hailuo-02-pro":
        case "minimax-hailuo-2.3-standard":
        case "minimax-hailuo-2.3-pro":
          videoData = await aiService.generateMiniMaxVideo(
            model,
            prompt,
            imageFile,
            duration,
            aspectRatio,
          );
          break;
        // 👉 WHEN IT IS USED: If the user selects a Wan model
        case "wan-2.7":
        case "wan-2.6":
        case "wan-2.5-preview":
          videoData = await aiService.generateWanVideo(
            model,
            prompt,
            imageFile,
            duration,
            aspectRatio,
            resolution,
            audioUrl,
          );
          break;

        case "pixverse-c1":
        case "pixverse-v4.5":
        case "pixverse-v5":
        case "pixverse-v5.5":
        case "pixverse-v5.6":
        case "pixverse-v6":
          videoData = await aiService.generatePixVerseVideo(
            model,
            prompt,
            imageFile,
            duration,
            aspectRatio,
            resolution,
            wantsAudio, // Safely filtered inside aiService.js based on model capabilities
          );
          break;
        case "bernini-r":
          videoData = await aiService.generateBerniniVideo(prompt, req.file);
          contentType = "video/mp4";
          break;
        default:
          return res
            .status(400)
            .json({ error: "Invalid video model provided" });
      }

      // 5. DEDUCT CREDITS UPON SUCCESS (bypassed for super admin testing)
      if (!isSuperAdmin) {
        user.video_credits -= totalCost;
        await user.save();
      }

      res.set("Content-Type", contentType);
      res.send(videoData);
    } catch (error) {
      console.error("Video Generation Error:", error);
      console.error("Video Generation Error:", error);
      const statusCode = error.statusCode || 500;
      res.status(statusCode).json({
        success: false,
        message: error.message || "Video generation failed",
        code: error.code || "video_generation_error",
      });
    }
  },
);
// @desc    Get all tools
// @route   GET /api/tools
// @access  Public
router.get("/", async (req, res) => {
  try {
    const { category_id, search, page = 1, limit = 10 } = req.query;

    const query = { is_active: true };

    if (category_id) {
      query.category_id = category_id;
    }

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
      ];
    }

    const tools = await Tool.find(query)
      .populate("category_id", "name category slug")
      .populate({
        path: "ai_model_id",
        populate: {
          path: "ai_provider_id",
          select: "name display_name",
        },
      })
      .populate("created_by", "name")
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Tool.countDocuments(query);

    // Fetch all active categories and AI models
    const categories = await ToolCategory.find({ is_active: true }).select(
      "name category slug",
    );
    const aiModels = await AIModel.find({ is_active: true })
      .populate("ai_provider_id", "name display_name")
      .select("model ai_provider_id");

    res.json({
      success: true,
      data: tools,
      categories,
      ai_models: aiModels,
      pagination: {
        current: page,
        pages: Math.ceil(total / limit),
        total,
      },
    });
  } catch (error) {
    console.error("Get tools error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
});

// @desc    Get all tools (no pagination)
// @route   GET /api/tools/all
// @access  Public
router.get("/all", async (req, res) => {
  try {
    const tools = await Tool.find({ is_active: true })
      .populate("category_id", "name category slug")
      .populate({
        path: "ai_model_id",
        populate: {
          path: "ai_provider_id",
          select: "name display_name",
        },
      })
      .populate("created_by", "name")
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: tools,
      total: tools.length,
    });
  } catch (error) {
    console.error("Get all tools error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
});

// @desc    Get tool by ID or slug
// @route   GET /api/tools/:identifier
// @access  Public
router.get("/:identifier", async (req, res) => {
  try {
    const identifier = req.params.identifier;
    const query = { is_active: true };

    if (identifier.match(/^[0-9a-fA-F]{24}$/)) {
      query._id = identifier;
    } else {
      query.slug = identifier;
    }

    const tool = await Tool.findOne(query)
      .populate("category_id", "name category slug")
      .populate({
        path: "ai_model_id",
        populate: {
          path: "ai_provider_id",
          select: "name display_name",
        },
      })
      .populate("created_by", "name");

    if (!tool) {
      return res.status(404).json({
        success: false,
        message: "Tool not found",
      });
    }

    res.json({
      success: true,
      data: tool,
    });
  } catch (error) {
    console.error("Get tool error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
});

// @desc    Use a tool with suggested topic - STREAMING (Updated for Chat History with Search Results)
// @route   POST /api/tools/:id/use-topic-stream
// @access  Private
router.post(
  "/:id/use-topic-stream",
  protect,
  aiGenerationLimiter,
  async (req, res) => {
    try {
      const { topicIndex, userInput, chatId, imageUrl } = req.body;
      const toolId = req.params.id;

      if (typeof topicIndex !== "number" || topicIndex < 0) {
        return res.status(400).json({
          success: false,
          message: "Valid topic index is required",
        });
      }

      // Get tool with AI model and provider
      const tool = await Tool.findById(toolId)
        .populate("category_id")
        .populate({
          path: "ai_model_id",
          populate: {
            path: "ai_provider_id",
            select: "+api_key",
          },
        });

      if (!tool || !tool.is_active) {
        return res.status(404).json({
          success: false,
          message: "Tool not found or inactive",
        });
      }

      if (!tool.suggested_topics || !tool.suggested_topics[topicIndex]) {
        return res.status(400).json({
          success: false,
          message: "Invalid topic index",
        });
      }

      const selectedTopic = tool.suggested_topics[topicIndex];

      // Validate user input if required
      if (selectedTopic.has_input && !userInput) {
        return res.status(400).json({
          success: false,
          message: "User input is required for this topic",
        });
      }

      const userPrompt = buildSuggestedTopicPrompt(selectedTopic, userInput);
      const isSafe = await runSafetyCheck(
        req,
        res,
        userPrompt,
        imageUrl,
        tool.name,
      );
      if (!isSafe) return;

      // Get or create chat
      const chat = await ChatService.getOrCreateChat(req.user.id, chatId);

      const messageParts = userPrompt.split("{{historyData}}");
      const messageToSend = messageParts[0].trim();

      // Add user message to chat
      await ChatService.addUserMessage(chat._id, req.user.id, messageToSend);

      // Set headers for streaming
      res.writeHead(200, {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      });

      const startTime = Date.now();
      let fullResponse = "";
      let provider = "";
      let model = "";
      let searchResults = null;

      // Send initial metadata including chat ID
      res.write(
        `data: ${JSON.stringify({
          type: "start",
          chat_id: chat._id,
          tool: tool.name,
          topic: selectedTopic.title,
          timestamp: new Date().toISOString(),
        })}\n\n`,
      );

      try {
        await generateStreamingAIResponse(
          userPrompt,
          tool.system_prompt_template,
          tool.ai_model_id._id,
          // onChunk callback
          (chunk) => {
            if (chunk.type === "search_results") {
              searchResults = processSearchResults(chunk.search_results);
              res.write(
                `data: ${JSON.stringify({
                  type: "search_results",
                  search_results: searchResults,
                })}\n\n`,
              );
              return;
            }
            fullResponse = chunk.fullResponse;
            provider = chunk.provider;
            model = chunk.model;

            res.write(
              `data: ${JSON.stringify({
                type: "chunk",
                content: chunk.content,
                fullResponse: chunk.fullResponse,
              })}\n\n`,
            );
          },
          // onComplete callback
          async (result) => {
            const responseTime = Date.now() - startTime;
            const tokensUsed = result.tokens_used || 1;

            try {
              // Add assistant message to chat with metadata including search results
              const metadata = {
                tool_id: toolId,
                tool_category_id: tool.category_id._id,
                api_used: result.provider,
                model_used: result.model,
                tokens_used: tokensUsed,
                response_time: responseTime,
                success: true,
                search_results: searchResults || result.search_results || null,
              };

              await ChatService.addAssistantMessage(
                chat._id,
                req.user.id,
                result.fullResponse,
                metadata,
              );

              // Update tool usage count
              await Tool.findByIdAndUpdate(toolId, {
                $inc: { usage_count: 1 },
              });

              // Update category usage count
              await ToolCategory.findByIdAndUpdate(tool.category_id._id, {
                $inc: { usage_count: 1 },
              });

              // Update chat title if it's a new chat
              await ChatService.updateChatTitle(chat._id, req.user.id);

              // Send completion data
              res.write(
                `data: ${JSON.stringify({
                  type: "complete",
                  chat_id: chat._id,
                  fullResponse: result.fullResponse,
                  response_time: responseTime,
                  provider: result.provider,
                  model: result.model,
                  topic_used: selectedTopic.title,
                  search_results:
                    searchResults || result.search_results || null,
                })}\n\n`,
              );

              res.write("data: [DONE]\n\n");
              res.end();
            } catch (dbError) {
              console.error("Database error during completion:", dbError);
              res.write(
                `data: ${JSON.stringify({
                  type: "error",
                  message: "Failed to save response data",
                })}\n\n`,
              );
              res.end();
            }
          },
          // onError callback
          async (error) => {
            console.error("AI streaming error:", error);

            // Add failed assistant message to chat
            const metadata = {
              tool_id: toolId,
              tool_category_id: tool.category_id._id,
              api_used: provider || "unknown",
              model_used: model || "unknown",
              tokens_used: 1,
              response_time: Date.now() - startTime,
              success: false,
              error_message: error.message,
              search_results: searchResults,
            };

            await ChatService.addAssistantMessage(
              chat._id,
              req.user.id,
              "Sorry, I encountered an error while processing your request.",
              metadata,
            );

            res.write(
              `data: ${JSON.stringify({
                type: "error",
                message: "Failed to generate AI response",
                error: error.message,
              })}\n\n`,
            );
            res.end();
          },
          imageUrl,
        );
      } catch (aiError) {
        console.error("AI generation error:", aiError);
        res.write(
          `data: ${JSON.stringify({
            type: "error",
            message: "Failed to generate AI response",
            error: aiError.message,
          })}\n\n`,
        );
        res.end();
      }
    } catch (error) {
      console.error("Tool use topic streaming error:", error);
      res.status(500).json({
        success: false,
        message: "Server error",
      });
    }
  },
);

// @desc    Use a tool with tab-based prompt - STREAMING with ChatService and Search Results
// @route   POST /api/tools/:id/use-tab-stream
// @access  Private
router.post(
  "/:id/use-tab-stream",
  protect,
  aiGenerationLimiter,
  async (req, res) => {
    try {
      const { tabIndex, formData, chatId, imageUrl } = req.body;
      const toolId = req.params.id;

      if (typeof tabIndex !== "number" || tabIndex < 0) {
        return res.status(400).json({
          success: false,
          message: "Valid tab index is required",
        });
      }

      const tool = await Tool.findById(toolId)
        .populate("category_id")
        .populate({
          path: "ai_model_id",
          populate: {
            path: "ai_provider_id",
            select: "+api_key",
          },
        });

      if (!tool || !tool.is_active) {
        return res.status(404).json({
          success: false,
          message: "Tool not found or inactive",
        });
      }

      if (!tool.tabs || !tool.tabs[tabIndex]) {
        return res.status(400).json({
          success: false,
          message: "Invalid tab index",
        });
      }

      if (
        !tool.ai_model_id ||
        !tool.ai_model_id.is_active ||
        !tool.ai_model_id.ai_provider_id.is_active
      ) {
        return res.status(400).json({
          success: false,
          message: "AI model not available",
        });
      }

      const selectedTab = tool.tabs[tabIndex];
      const userPrompt = buildTabPrompt(selectedTab, formData || {});

      const isSafe = await runSafetyCheck(
        req,
        res,
        userPrompt,
        imageUrl,
        tool.name,
      );
      if (!isSafe) return;

      // Get or create chat
      const chat = await ChatService.getOrCreateChat(req.user.id, chatId);

      const messageParts = userPrompt.split("{{historyData}}");
      const messageToSend = messageParts[0].trim();
      // Add user message to chat
      await ChatService.addUserMessage(chat._id, req.user.id, messageToSend);

      res.writeHead(200, {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      });

      const startTime = Date.now();
      let fullResponse = "";
      let provider = "";
      let model = "";
      let searchResults = null;

      // Initial message
      res.write(
        `data: ${JSON.stringify({
          type: "start",
          chat_id: chat._id,
          tool: tool.name,
          tab: selectedTab.title,
          timestamp: new Date().toISOString(),
        })}\n\n`,
      );

      await generateStreamingAIResponse(
        userPrompt,
        tool.system_prompt_template,
        tool.ai_model_id._id,

        // onChunk
        (chunk) => {
          if (chunk.type === "search_results") {
            searchResults = processSearchResults(chunk.search_results);
            res.write(
              `data: ${JSON.stringify({
                type: "search_results",
                search_results: searchResults,
              })}\n\n`,
            );
            return;
          }
          fullResponse = chunk.fullResponse;
          provider = chunk.provider;
          model = chunk.model;

          res.write(
            `data: ${JSON.stringify({
              type: "chunk",
              content: chunk.content,
              fullResponse: chunk.fullResponse,
            })}\n\n`,
          );
        },

        // onComplete
        async (result) => {
          const responseTime = Date.now() - startTime;
          const tokensUsed = result.tokens_used || 1;

          try {
            const metadata = {
              tool_id: toolId,
              tool_category_id: tool.category_id._id,
              api_used: result.provider,
              model_used: result.model,
              tokens_used: tokensUsed,
              response_time: responseTime,
              success: true,
              search_results: searchResults || result.search_results || null,
            };

            await ChatService.addAssistantMessage(
              chat._id,
              req.user.id,
              result.fullResponse,
              metadata,
            );

            await Tool.findByIdAndUpdate(toolId, { $inc: { usage_count: 1 } });
            await ToolCategory.findByIdAndUpdate(tool.category_id._id, {
              $inc: { usage_count: 1 },
            });

            await ChatService.updateChatTitle(chat._id, req.user.id);

            res.write(
              `data: ${JSON.stringify({
                type: "complete",
                chat_id: chat._id,
                fullResponse: result.fullResponse,
                response_time: responseTime,
                provider: result.provider,
                model: result.model,
                tab_used: selectedTab.title,
                search_results: searchResults || result.search_results || null,
              })}\n\n`,
            );

            res.write("data: [DONE]\n\n");
            res.end();
          } catch (dbError) {
            console.error("DB error:", dbError);
            res.write(
              `data: ${JSON.stringify({
                type: "error",
                message: "Failed to save chat data",
              })}\n\n`,
            );
            res.end();
          }
        },

        // onError
        async (error) => {
          console.error("Streaming error:", error);

          const metadata = {
            tool_id: toolId,
            tool_category_id: tool.category_id._id,
            api_used: provider || "unknown",
            model_used: model || "unknown",
            tokens_used: 1,
            response_time: Date.now() - startTime,
            success: false,
            error_message: error.message,
            search_results: searchResults,
          };

          await ChatService.addAssistantMessage(
            chat._id,
            req.user.id,
            "Sorry, I encountered an error while processing your request.",
            metadata,
          );

          res.write(
            `data: ${JSON.stringify({
              type: "error",
              message: "Failed to generate AI response",
              error: error.message,
            })}\n\n`,
          );
          res.end();
        },
        imageUrl,
      );
    } catch (error) {
      console.error("use-tab-stream error:", error);
      res.status(500).json({
        success: false,
        message: "Server error",
      });
    }
  },
);

marked.setOptions({ gfm: true, breaks: true, headerIds: false });

// Split long text into chunks
function splitTextRun(text, chunkSize = 500) {
  const runs = [];
  for (let i = 0; i < text.length; i += chunkSize) {
    runs.push(text.slice(i, i + chunkSize));
  }
  return runs;
}

// Get image buffer from blob/base64/http/path
async function getImageBuffer(href, images) {
  if (!href) throw new Error("No href provided");
  if (href.startsWith("data:image/"))
    return Buffer.from(href.split(",")[1], "base64");
  if (images[href]) return Buffer.from(images[href], "base64");
  if (href.startsWith("http")) {
    const resp = await fetch(href);
    const arrayBuffer = await resp.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }
  if (fs.existsSync(path.resolve(href)))
    return fs.readFileSync(path.resolve(href));
  throw new Error("Image not found: " + href);
}

// -----------------------------
// Recursive underline converter
// -----------------------------
function convertUnderlineTokens(tokens) {
  function process(arr) {
    const out = [];
    for (const t of arr) {
      if (t && typeof t === "object" && t.tokens && Array.isArray(t.tokens)) {
        out.push({ ...t, tokens: process(t.tokens) });
        continue;
      }

      if (
        t &&
        t.type === "text" &&
        typeof t.text === "string" &&
        t.text.includes("__")
      ) {
        let lastIndex = 0;
        const regex = /__(.*?)__/g;
        let match;
        while ((match = regex.exec(t.text)) !== null) {
          const idx = match.index;
          if (idx > lastIndex)
            out.push({ type: "text", text: t.text.slice(lastIndex, idx) });
          out.push({ type: "u", text: match[1] });
          lastIndex = idx + match[0].length;
        }
        if (lastIndex < t.text.length)
          out.push({ type: "text", text: t.text.slice(lastIndex) });
        continue;
      }

      out.push(t);
    }
    return out;
  }

  return process(tokens || []);
}

// ----------------------------------------------------
// parseInline: recursive parsing + style propagation
// ----------------------------------------------------
async function parseInline(tokens, images = {}, style = {}) {
  const children = [];
  if (!tokens || !tokens.length) return children;

  for (const tok of tokens) {
    if (typeof tok === "string") {
      const textParts = splitTextRun(he.decode(tok));
      for (const part of textParts) {
        const opts = { text: part };
        if (style.bold) opts.bold = true;
        if (style.italics) opts.italics = true;
        if (style.underline) opts.underline = {};
        if (style.font) opts.font = style.font;
        if (style.linkStyle) opts.style = style.linkStyle;
        children.push(new TextRun(opts));
      }
      continue;
    }

    const textContent = he.decode(tok.text || "");

    switch (tok.type) {
      case "text":
      case "codespan": {
        splitTextRun(textContent).forEach((chunk) => {
          const opts = { text: chunk };
          if (tok.type === "codespan") opts.font = "Courier New";
          if (style.bold) opts.bold = true;
          if (style.italics) opts.italics = true;
          if (style.underline) opts.underline = {};
          if (style.font) opts.font = opts.font || style.font;
          if (style.linkStyle) opts.style = style.linkStyle;
          children.push(new TextRun(opts));
        });
        break;
      }

      case "strong": {
        const inner = await parseInline(
          tok.tokens || [{ type: "text", text: textContent }],
          images,
          { ...style, bold: true },
        );
        children.push(...inner);
        break;
      }

      case "em": {
        const inner = await parseInline(
          tok.tokens || [{ type: "text", text: textContent }],
          images,
          { ...style, italics: true },
        );
        children.push(...inner);
        break;
      }

      case "u": {
        const inner = await parseInline(
          tok.tokens || [{ type: "text", text: textContent }],
          images,
          { ...style, underline: true },
        );
        children.push(...inner);
        break;
      }

      case "link": {
        const linkStyle = "Hyperlink";
        const inner = await parseInline(
          tok.tokens || [{ type: "text", text: textContent }],
          images,
          { ...style, linkStyle },
        );
        children.push(...inner);
        break;
      }

      case "image": {
        try {
          const imgBuffer = await getImageBuffer(tok.href, images);
          children.push(
            new ImageRun({
              data: imgBuffer,
              transformation: { width: 350, height: 300 },
            }),
          );
        } catch {
          children.push(new TextRun("[Image could not be added]"));
        }
        break;
      }

      default: {
        const inner = await parseInline(
          [{ type: "text", text: textContent }],
          images,
          style,
        );
        children.push(...inner);
        break;
      }
    }
  }

  return children;
}

// -----------------------------
// Main route
// -----------------------------
router.post("/ai/save-text", protect, async (req, res) => {
  try {
    let { text, images = {} } = req.body;
    if (!text)
      return res
        .status(400)
        .json({ success: false, error: "No text provided" });

    // Replace blob URLs with base64
    const processedText = text.replace(
      /!\[.*?\]\((blob:[^)]+)\)/g,
      (match, blobUrl) => (images[blobUrl] ? `![](${images[blobUrl]})` : match),
    );

    let tokens = marked.lexer(processedText);
    tokens = convertUnderlineTokens(tokens);

    const children = [];

    for (const token of tokens) {
      switch (token.type) {
        case "heading": {
          const inlineTokens = convertUnderlineTokens([
            { type: "text", text: token.text || "" },
          ]);
          const inlineChildren = await parseInline(inlineTokens, images);
          children.push(
            new Paragraph({
              children: inlineChildren,
              heading:
                token.depth === 1
                  ? HeadingLevel.HEADING_1
                  : token.depth === 2
                    ? HeadingLevel.HEADING_2
                    : HeadingLevel.HEADING_3,
              spacing: { after: 200 },
            }),
          );
          break;
        }

        case "paragraph": {
          const inlineTokens = convertUnderlineTokens(
            token.tokens && token.tokens.length
              ? token.tokens
              : [{ type: "text", text: token.text || "" }],
          );
          const inlineChildren = await parseInline(inlineTokens, images);
          if (inlineChildren.length)
            children.push(
              new Paragraph({
                children: inlineChildren,
                spacing: { after: 150 },
              }),
            );
          break;
        }

        case "list": {
          for (const item of token.items) {
            const itemTokens = marked.lexer(item.text || "", { gfm: true });
            let inlineTokens = itemTokens.flatMap((t) =>
              t.type === "paragraph" && t.tokens
                ? t.tokens
                : [{ type: "text", text: t.text || "" }],
            );
            inlineTokens = convertUnderlineTokens([{ tokens: inlineTokens }])[0]
              .tokens;
            const listChildren = await parseInline(inlineTokens, images);
            children.push(
              new Paragraph({
                children: listChildren,
                numbering: token.ordered
                  ? { reference: "ordered-list", level: 0 }
                  : undefined,
                bullet: token.ordered ? undefined : { level: 0 },
                spacing: { before: 100, after: 100 },
                indent: token.ordered ? { left: 360 } : undefined,
              }),
            );
          }
          break;
        }

        case "blockquote": {
          const inlineTokens = convertUnderlineTokens(
            token.tokens && token.tokens.length
              ? token.tokens
              : [{ type: "text", text: token.text || "" }],
          );
          const inlineChildren = await parseInline(inlineTokens, images, {
            italics: true,
          });
          children.push(
            new Paragraph({
              children: inlineChildren,
              indent: { left: 720 },
              spacing: { after: 150 },
            }),
          );
          break;
        }

        case "image": {
          try {
            const imgBuffer = await getImageBuffer(token.href, images);
            children.push(
              new Paragraph({
                children: [
                  new ImageRun({
                    data: imgBuffer,
                    transformation: { width: 350, height: 300 },
                  }),
                ],
                alignment: AlignmentType.CENTER,
                spacing: { before: 150, after: 150 },
              }),
            );
          } catch {
            children.push(
              new Paragraph({
                text: "[Image could not be added]",
                alignment: AlignmentType.CENTER,
                spacing: { after: 150 },
              }),
            );
          }
          break;
        }

        default: {
          if (token.text)
            children.push(
              new Paragraph({
                text: he.decode(token.text),
                spacing: { after: 150 },
              }),
            );
          break;
        }
      }
    }

    const doc = new Document({
      numbering: {
        config: [
          {
            reference: "ordered-list",
            levels: [
              {
                level: 0,
                format: "decimal",
                text: "%1.",
                alignment: "left",
                start: 1,
                position: 360,
                textPosition: 360,
              },
            ],
          },
        ],
      },
      sections: [{ children }],
    });

    const uploadDir = path.join(process.cwd(), "uploads");
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

    const fileName = `text_${Date.now()}.docx`;
    const filePath = path.join(uploadDir, fileName);

    const buffer = await Packer.toBuffer(doc);
    await fs.promises.writeFile(filePath, buffer);

    res.json({ success: true, fileUrl: `/uploads/${fileName}` });
  } catch (err) {
    console.error(err);
    res
      .status(500)
      .json({ success: false, error: "Failed to create Word file" });
  }
});

// // @desc    General AI usage - STREAMING (Updated for Chat History with Search Results)
// // @route   POST /api/tools/ai/general-stream
// // @access  Private
// router.post("/ai/general-stream", protect, async (req, res) => {
//   try {
//     const {
//       prompt,
//       modelId,
//       chatId,
//       imageUrl,
//       ischatehistry,
//       max_tokens = 4000,
//       subtab,
//       job_id,
//       wordcount,
//       // system_prompt = "You are a helpful AI assistant. Don't think too long, send 1 to 2 sentence very quick responses. You can send response up to 150 words only if necessary. You can send response above 150 words only if absolutely necessary. Always try to respond within 1 to 3 seconds if possible. Never think for more than 10 seconds, always think and respond within 10 seconds or less. The faster you respond, the better.",
//       system_prompt = "You are a helpful AI assistant, your objective is to help the user write better content and improve their grammar.  Don't think too long, always respond as quickly as possible, in less than 5 to 10 seconds if possible.",
//     } = req.body;

//     if (!prompt || typeof prompt !== "string" || prompt.trim() === "") {
//       return res.status(400).json({
//         success: false,
//         message: "Prompt is required and must be a non-empty string",
//       });
//     }
//   req.setTimeout(0);
//     res.setTimeout(0);
//     let finalSystemPrompt = system_prompt;
//     if (wordcount) {
//       finalSystemPrompt = `${system_prompt}

// IMPORTANT: Your response must be about ${wordcount} words.
// Do not write less than ${wordcount - 5} words or more than ${
//         wordcount + 5
//       } words.
// Strictly follow this word count. Respond fully according to the word count.`;
//     }

//     const keyMatch = /3344KiranBhaiIts/i.test(prompt);
//     if (keyMatch) {
//       try {
//         // Extract Title and Content from prompt
//         const titleMatch = prompt.match(/title:\s*(.+)/i);
//         const contentMatch = prompt.match(/content:\s*([\s\S]+)/i);

//         const title = titleMatch ? titleMatch[1].trim() : "Generated PDF";
//         const content = contentMatch
//           ? contentMatch[1].trim()
//           : "No content provided.";

//         const fileName = await createPdfFile(content);
//         const pdfUrl = `/uploads/${fileName}`;

//         return res.json({
//           success: true,
//           pdf_url: pdfUrl,
//         });
//       } catch (pdfError) {
//         console.error("❌ PDF generation error:", pdfError);
//         return res.status(500).json({
//           success: false,
//           message: "Failed to generate PDF",
//         });
//       }
//     }
//     const userId = req.user ? req.user.id : req.guestUser?._id;
//     // Get or create chat
//     const chat = await ChatService.getOrCreateChat(
//       userId,
//       chatId,
//       ischatehistry !== undefined ? ischatehistry : true,
//       subtab || null,
//       job_id || null
//     );

//     const messageParts = prompt.split("{{historyData}}");
//     const messageToSend = messageParts[0].trim();

//     // Add user message to chat
//     await ChatService.addUserMessage(chat._id, userId, messageToSend);

//     // Set headers for Server-Sent Events (SSE) streaming
//     res.writeHead(200, {
//       "Content-Type": "text/event-stream",
//       "Cache-Control": "no-cache",
//       Connection: "keep-alive",
//     });

//     const startTime = Date.now();
//     let fullResponse = "";
//     let provider = "";
//     let model = "";
//     let searchResults = null;

//     // Send initial metadata event including chat ID
//     res.write(
//       `data: ${JSON.stringify({
//         type: "start",
//         chat_id: chat._id,
//         timestamp: new Date().toISOString(),
//       })}\n\n`
//     );

//     try {
//       await generateStreamingAIResponse(
//         prompt,
//         finalSystemPrompt,
//         modelId,
//         // onChunk callback
//         (chunk) => {
//           if (chunk.type === "search_results") {
//             searchResults = processSearchResults(chunk.search_results);
//             res.write(
//               `data: ${JSON.stringify({
//                 type: "search_results",
//                 search_results: searchResults,
//               })}\n\n`
//             );
//             return;
//           }
//           fullResponse = chunk.fullResponse;
//           provider = chunk.provider;
//           model = chunk.model;

//           res.write(
//             `data: ${JSON.stringify({
//               type: "chunk",
//               content: chunk.content,
//               fullResponse: chunk.fullResponse,
//             })}\n\n`
//           );
//         },
//         // onComplete callback
//         async (result) => {
//           const responseTime = Date.now() - startTime;
//           const tokensUsed = result.tokens_used || 1;

//           try {
//             const user = await User.findById(req.user.id);
//             if (user) {
//               user.remaining_tokens = Math.max(
//                 0,
//                 user.remaining_tokens - tokensUsed
//               );
//               await user.save();
//             }
//             // Add assistant message to chat with metadata including search results
//             const metadata = {
//               api_used: result.provider || "openai",
//               model_used: result.model || "unknown",
//               tokens_used: tokensUsed,
//               response_time: responseTime,
//               success: true,
//               search_results: searchResults || result.search_results || null,
//             };

//             await ChatService.addAssistantMessage(
//               chat._id,
//               userId,
//               result.fullResponse,
//               metadata
//             );

//             // Update chat title if it's a new chat
//             await ChatService.updateChatTitle(chat._id, userId);

//             // Send completion event
//             res.write(
//               `data: ${JSON.stringify({
//                 type: "complete",
//                 chat_id: chat._id,
//                 fullResponse: result.fullResponse,
//                 response_time: responseTime,
//                 provider: result.provider,
//                 model: result.model,
//                 search_results: searchResults || result.search_results || null,
//               })}\n\n`
//             );

//             res.write("data: [DONE]\n\n");
//             res.end();
//           } catch (dbError) {
//             console.error("Database error during completion:", dbError);
//             res.write(
//               `data: ${JSON.stringify({
//                 type: "error",
//                 message: "Failed to save response data",
//               })}\n\n`
//             );
//             res.end();
//           }
//         },
//         // onError callback
//         async (error) => {
//           // Add failed assistant message to chat
//           const metadata = {
//             api_used: "openai",
//             model_used: "unknown",
//             tokens_used: 1,
//             response_time: Date.now() - startTime,
//             success: false,
//             error_message: error.message,
//             search_results: searchResults,
//           };

//           await ChatService.addAssistantMessage(
//             chat._id,
//             userId,
//             "Sorry, I encountered an error while processing your request.",
//             metadata
//           );

//           res.write(
//             `data: ${JSON.stringify({
//               type: "error",
//               message: "Failed to generate AI response",
//               error: error.message,
//             })}\n\n`
//           );
//           res.end();
//         },
//         imageUrl,
//         max_tokens
//       );
//     } catch (aiError) {
//       console.error("AI generation error:", aiError);
//       res.write(
//         `data: ${JSON.stringify({
//           type: "error",
//           message: "Failed to generate AI response",
//           error: aiError.message,
//         })}\n\n`
//       );
//       res.end();
//     }
//   } catch (error) {
//     console.error("General AI streaming usage error:", error);
//     res.status(500).json({
//       success: false,
//       message: "Server error",
//     });
//   }
// });

// Helper: generate Word resume
async function createResumeWordFile(data, fileNamePrefix = "resume") {
  const doc = new Document({
    sections: [
      {
        children: [
          new Paragraph({
            text: data.name,
            heading: HeadingLevel.TITLE,
            alignment: AlignmentType.CENTER,
          }),
          new Paragraph({
            children: [
              new TextRun(`${data.address} | ${data.phone} | ${data.email}`),
            ],
            alignment: AlignmentType.CENTER,
          }),
          new Paragraph({ text: "", spacing: { after: 200 } }),

          new Paragraph({ text: "Profile", heading: HeadingLevel.HEADING_1 }),
          new Paragraph({ text: data.profile }),
          new Paragraph({ text: "", spacing: { after: 100 } }),

          new Paragraph({
            text: "Experience",
            heading: HeadingLevel.HEADING_1,
          }),
          ...data.experience.map(
            (exp) =>
              new Paragraph({
                children: [
                  new TextRun({
                    text: `${exp.date} ${exp.position} – ${exp.company}`,
                    bold: true,
                  }),
                ],
              }),
          ),
          ...data.experience.flatMap((exp) =>
            exp.details.map((d) => new Paragraph({ text: `• ${d}` })),
          ),

          new Paragraph({ text: "", spacing: { after: 100 } }),

          new Paragraph({ text: "Education", heading: HeadingLevel.HEADING_1 }),
          ...data.education.map(
            (ed) =>
              new Paragraph({ text: `${ed.year} ${ed.degree}, ${ed.school}` }),
          ),

          new Paragraph({ text: "", spacing: { after: 100 } }),

          new Paragraph({ text: "Interests", heading: HeadingLevel.HEADING_1 }),
          new Paragraph({ text: data.interests.join(", ") }),
        ],
      },
    ],
  });

  const buffer = await Packer.toBuffer(doc);
  const fileName = `${fileNamePrefix}-${Date.now()}.docx`;
  fs.writeFileSync(path.join(__dirname, "../uploads", fileName), buffer);
  return fileName;
}

// Helper: generate Word cover letter
async function createCoverLetterWordFile(data, fileNamePrefix = "coverletter") {
  const doc = new Document({
    sections: [
      {
        children: [
          new Paragraph({ text: data.name, heading: HeadingLevel.TITLE }),
          new Paragraph({ text: data.address }),
          new Paragraph({ text: data.email }),
          new Paragraph({ text: data.phone }),
          new Paragraph({ text: "", spacing: { after: 200 } }),
          new Paragraph({
            text: `Dear ${data.hiringManager || "Hiring Manager"},`,
          }),
          new Paragraph({ text: data.coverLetterBody }),
          new Paragraph({ text: "", spacing: { after: 200 } }),
          new Paragraph({ text: "Sincerely," }),
          new Paragraph({ text: data.name }),
        ],
      },
    ],
  });

  const buffer = await Packer.toBuffer(doc);
  const fileName = `${fileNamePrefix}-${Date.now()}.docx`;
  fs.writeFileSync(path.join(__dirname, "../uploads", fileName), buffer);
  return fileName;
}

function parseResumePrompt(prompt) {
  const contentMatch = prompt.match(/content:\s*([\s\S]+)/i);
  const content = contentMatch ? contentMatch[1].trim() : "";

  const getSection = (section) => {
    const regex = new RegExp(`${section}\\s*([\\s\\S]*?)(?=\\n[A-Z]|$)`, "i");
    const match = content.match(regex);
    if (!match) return "";
    return match[1].trim();
  };

  // Extract basic info (assume first line = name, next few = address, phone, email)
  const infoRegex =
    /^([^\d\n]+)?\s*(\d{1,3}[^\n]*)?\s*([\d\-]{7,15})?\s*([\w.@]+)/;
  const infoMatch = content.match(infoRegex);
  const name = infoMatch?.[1]?.trim() || "First Last";
  const address = infoMatch?.[2]?.trim() || "";
  const phone = infoMatch?.[3]?.trim() || "";
  const email = infoMatch?.[4]?.trim() || "";

  // Profile
  const profile = getSection("Profile");

  // Experience
  const expText = getSection("Experience") || "";
  const expLines = expText
    .split(/[\n•]/)
    .map((l) => l.trim())
    .filter(Boolean);
  const experience = [];
  let currentExp = null;
  expLines.forEach((line) => {
    if (/^\d{2}\/\d{4}-\d{2}\/\d{4}/.test(line)) {
      if (currentExp) experience.push(currentExp);
      const [date, ...rest] = line.split(" ");
      const positionCompany = rest.join(" ").replace(/–/g, "-");
      const [position, company] = positionCompany
        .split(/[-,]/)
        .map((s) => s.trim());
      currentExp = { date, position, company, details: [] };
    } else if (currentExp) {
      currentExp.details.push(line);
    }
  });
  if (currentExp) experience.push(currentExp);

  // Education
  const eduText = getSection("Education") || "";
  const eduLines = eduText
    .split(/[\n•]/)
    .map((l) => l.trim())
    .filter(Boolean);
  const education = eduLines.map((line) => {
    const parts = line.split(",");
    const degree = parts[0]?.trim() || "";
    const school = parts.slice(1).join(",").trim() || "";
    return { degree, school };
  });

  // Interests
  const interestsText = getSection("Interest") || getSection("Interests") || "";
  const interests = interestsText
    .split(/[\n•]/)
    .map((l) => l.trim())
    .filter(Boolean);

  // Cover letter body (combine job description + skills + qualifications)
  const jobDesc =
    (getSection("Job Description") || "") +
    "\n" +
    (getSection("Minimum Skills") || "") +
    "\n" +
    (getSection("Desired Qualifications") || "");
  const coverLetterBody = `I am excited to apply for this position. Based on my experience and skills:\n${jobDesc}`;

  return {
    resumeData: {
      name,
      address,
      phone,
      email,
      profile,
      experience,
      education,
      interests,
    },
    coverLetterData: {
      name,
      address,
      phone,
      email,
      hiringManager: null,
      coverLetterBody,
    },
  };
}

// @desc    General AI usage - STREAMING (Updated for Chat History with Search Results)
// @route   POST /api/tools/ai/general-stream
// @access  Private
router.post(
  "/ai/general-stream",
  protect,
  aiGenerationLimiter,
  checkCombinedChatLimit,
  async (req, res) => {
    let heartbeat = null; // Define outside
    let cleanupHeartbeat = null;
    try {
      const {
        prompt,
        modelId,
        chatId,
        imageUrl,
        ischatehistry,
        max_tokens = 4000,
        subtab,
        job_id,
        wordcount,
        system_prompt = "You are a helpful AI assistant, your objective is to help the user write better content and improve their grammar. Don't think too long, always respond as quickly as possible, in less than 5 to 10 seconds if possible.",
      } = req.body;

      if (!prompt || typeof prompt !== "string" || prompt.trim() === "") {
        return res.status(400).json({
          success: false,
          message: "Prompt is required and must be a non-empty string",
        });
      }
      const isSafe = await runSafetyCheck(
        req,
        res,
        prompt,
        imageUrl,
        "general-stream",
      );
      if (!isSafe) return;

      // ======= NEW: Disable timeout for long responses =======
      req.setTimeout(0); // No request timeout
      res.setTimeout(0); // No response timeout

      // Optional: send heartbeat every 2 seconds to keep SSE alive
      // const heartbeat = setInterval(() => res.write(":\n\n"), 2000);
      // const cleanupHeartbeat = () => clearInterval(heartbeat);
      // 1. Define Heartbeat safely
      heartbeat = setInterval(() => {
        // Only write if connection is still writable
        if (!res.writableEnded && !res.finished) {
          res.write(":\n\n");
        }
      }, 2000);

      cleanupHeartbeat = () => {
        if (heartbeat) clearInterval(heartbeat);
      };

      let finalSystemPrompt = system_prompt;
      if (wordcount) {
        finalSystemPrompt = `${system_prompt}

IMPORTANT: Your response must be about ${wordcount} words. 
Do not write less than ${wordcount - 5} words or more than ${
          wordcount + 5
        } words.
Strictly follow this word count. Respond fully according to the word count.`;
      }

      const keyMatch = /3344KiranBhaiIts/i.test(prompt);
      if (keyMatch) {
        try {
          // Parse the structured content from the prompt
          const { resumeData, coverLetterData } = parseResumePrompt(prompt);

          // Generate Word documents using the formatted helpers
          const resumeFileName = await createResumeWordFile(resumeData);
          const coverFileName =
            await createCoverLetterWordFile(coverLetterData);

          // Prepare URLs to return
          const resumeUrl = `/uploads/${resumeFileName}`;
          const coverUrl = `/uploads/${coverFileName}`;

          // Stop heartbeat
          cleanupHeartbeat();

          return res.json({
            success: true,
            resume_docx_url: resumeUrl,
            cover_docx_url: coverUrl,
          });
        } catch (error) {
          cleanupHeartbeat();
          console.error("❌ Word generation error:", error);
          return res.status(500).json({
            success: false,
            message: "Failed to generate Word documents",
          });
        }
      }

      const userId = req.user ? req.user.id : req.guestUser?._id;
      const chat = await ChatService.getOrCreateChat(
        userId,
        chatId,
        ischatehistry !== undefined ? ischatehistry : true,
        subtab || null,
        job_id || null,
      );

      const messageParts = prompt.split("{{historyData}}");
      const messageToSend = messageParts[0].trim();

      await ChatService.addUserMessage(chat._id, userId, messageToSend);

      res.writeHead(200, {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        // Connection: "keep-alive",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no",
      });

      const startTime = Date.now();
      let fullResponse = "";
      let provider = "";
      let model = "";
      let searchResults = null;

      res.write(
        `data: ${JSON.stringify({
          type: "start",
          chat_id: chat._id,
          timestamp: new Date().toISOString(),
        })}\n\n`,
      );

      await generateStreamingAIResponse(
        prompt,
        finalSystemPrompt,
        modelId,
        (chunk) => {
          if (chunk.type === "search_results") {
            searchResults = processSearchResults(chunk.search_results);
            res.write(
              `data: ${JSON.stringify({
                type: "search_results",
                search_results: searchResults,
              })}\n\n`,
            );
            return;
          }
          fullResponse = chunk.fullResponse;
          provider = chunk.provider;
          model = chunk.model;

          // Split large chunks to avoid SSE timeout
          const chunkSize = 500;
          for (let i = 0; i < chunk.content.length; i += chunkSize) {
            const piece = chunk.content.slice(i, i + chunkSize);
            res.write(
              `data: ${JSON.stringify({ type: "chunk", content: piece })}\n\n`,
            );
          }
        },
        async (result) => {
          cleanupHeartbeat();

          const responseTime = Date.now() - startTime;
          const tokensUsed = result.tokens_used || 1;

          try {
            const user = await User.findById(userId);
            if (user) {
              user.remaining_tokens = Math.max(
                0,
                user.remaining_tokens - tokensUsed,
              );

              // Increment request count ONLY on successful AI response
              const isText = req.body?.source && req.body.source.includes("-text");
              if (isText) {
                const usageField = "combined_chat_text_usage";
                if (!user[usageField] || !user[usageField].reset_at) {
                  user[usageField] = {
                    count: 0,
                    reset_at: new Date(Date.now() + 24 * 60 * 60 * 1000),
                  };
                }
                if (new Date() > user[usageField].reset_at) {
                  user[usageField].count = 0;
                  user[usageField].reset_at = new Date(Date.now() + 24 * 60 * 60 * 1000);
                }
                let userLimit = 100;
                if (user.plan === "pro") userLimit = 50;
                else if (user.plan === "standard" || user.plan === "lite" || user.subscription_status === "trialing") userLimit = 50;
                else if (user.plan === "basic") userLimit = 50;

                user[usageField].count = Math.min(userLimit, user[usageField].count + 1);
                if (req.body.promptId) {
                  user[usageField].last_prompt_id = req.body.promptId;
                }
              }

              await user.save();
            }

            const metadata = {
              api_used: result.provider || "openai",
              model_used: result.model || "unknown",
              tokens_used: tokensUsed,
              response_time: responseTime,
              success: true,
              search_results: searchResults || result.search_results || null,
            };

            await ChatService.addAssistantMessage(
              chat._id,
              userId,
              result.fullResponse,
              metadata,
            );
            await ChatService.updateChatTitle(chat._id, userId);

            res.write(
              `data: ${JSON.stringify({
                type: "complete",
                chat_id: chat._id,
                fullResponse: result.fullResponse,
              })}\n\n`,
            );
            res.write("data: [DONE]\n\n");
            res.end();
          } catch (dbError) {
            console.error("Database error:", dbError);
            res.write(
              `data: ${JSON.stringify({
                type: "error",
                message: "Failed to save response data",
              })}\n\n`,
            );
            res.end();
          }
        },
        async (error) => {
          cleanupHeartbeat();

          // const metadata = {
          //   api_used: "openai",
          //   model_used: "unknown",
          //   tokens_used: 1,
          //   response_time: Date.now() - startTime,
          //   success: false,
          //   error_message: error.message,
          //   search_results: searchResults,
          // };

          // Use the actual provider/model that was streaming (set from chunk data).
          // Fallback: look up from modelId so we never save "openai"/"unknown"
          // when the real provider was e.g. perplexity.
          let errorProvider = provider || "unknown";
          let errorModel = model || "unknown";
          if (
            (errorProvider === "" || errorProvider === "unknown") &&
            modelId
          ) {
            try {
              const aiModel =
                await AIModel.findById(modelId).populate("ai_provider_id");
              if (aiModel) {
                errorProvider = aiModel.ai_provider_id?.name || errorProvider;
                errorModel = aiModel.model || errorModel;
              }
            } catch (_) {}
          }

          const metadata = {
            api_used: errorProvider,
            model_used: errorModel,
            tokens_used: 1,
            response_time: Date.now() - startTime,
            success: false,
            error_message: error.message,
            search_results: searchResults,
          };

          await ChatService.addAssistantMessage(
            chat._id,
            userId,
            "Error generating response.",
            metadata,
          );

          res.write(
            `data: ${JSON.stringify({
              type: "error",
              message: error.message,
            })}\n\n`,
          );
          res.end();
        },
        imageUrl,
        max_tokens,
      );
    } catch (error) {
      // console.error("General AI streaming usage error:", error);
      // res
      //   .status(500)
      //   .json({ success: false, message: "Server error", error: error.message });

      if (cleanupHeartbeat) cleanupHeartbeat();
      if (heartbeat) clearInterval(heartbeat);
      console.error("General AI streaming usage error:", error);

      // Only send error response if headers haven't been sent
      if (!res.headersSent) {
        res.status(500).json({
          success: false,
          message: "Server error",
          error: error.message,
        });
      } else {
        // If streaming started, try to close it cleanly
        res.write(
          `data: ${JSON.stringify({ type: "error", message: error.message })}\n\n`,
        );
        res.end();
      }
    }
  },
);

// @desc    General AI usage - STREAMING (Updated for Chat History with Search Results)
// @route   POST /api/tools/ai/title-generate-stream
// @access  Private
router.post(
  "/ai/title-generate-stream",
  protect,
  aiGenerationLimiter,
  async (req, res) => {
    try {
      const { prompt, modelId, imageUrl } = req.body;

      if (!prompt || typeof prompt !== "string" || prompt.trim() === "") {
        return res.status(400).json({
          success: false,
          message: "Prompt is required and must be a non-empty string",
        });
      }

      // Set headers for Server-Sent Events (SSE) streaming
      res.writeHead(200, {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      });

      const startTime = Date.now();
      let fullResponse = "";
      let provider = "";
      let model = "";
      let searchResults = null;

      // Send initial metadata event
      res.write(
        `data: ${JSON.stringify({
          type: "start",
          timestamp: new Date().toISOString(),
        })}\n\n`,
      );

      try {
        await generateStreamingAIResponse(
          prompt,
          "You are a helpful AI assistant. Don't think too long, send 1 to 2 sentence very quick responses. You can send response up to 150 words only if necessary. You can send response above 150 words only if absolutely necessary. Always try to respond within 1 to 3 seconds if possible. Never think for more than 10 seconds, always think and respond within 10 seconds or less. The faster you respond, the better.",
          modelId,
          // onChunk callback
          (chunk) => {
            if (chunk.type === "search_results") {
              searchResults = processSearchResults(chunk.search_results);
              res.write(
                `data: ${JSON.stringify({
                  type: "search_results",
                  search_results: searchResults,
                })}\n\n`,
              );
              return;
            }
            fullResponse = chunk.fullResponse;
            provider = chunk.provider;
            model = chunk.model;

            res.write(
              `data: ${JSON.stringify({
                type: "chunk",
                content: chunk.content,
                fullResponse: chunk.fullResponse,
              })}\n\n`,
            );
          },
          // onComplete callback
          async (result) => {
            const responseTime = Date.now() - startTime;

            // No history logic here!
            res.write(
              `data: ${JSON.stringify({
                type: "complete",
                fullResponse: result.fullResponse,
                response_time: responseTime,
                provider: result.provider,
                model: result.model,
                search_results: searchResults || result.search_results || null,
              })}\n\n`,
            );

            res.write("data: [DONE]\n\n");
            res.end();
          },
          // onError callback
          async (error) => {
            console.error("AI streaming error:", error);
            res.write(
              `data: ${JSON.stringify({
                type: "error",
                message: "Failed to generate AI response",
                error: error.message,
              })}\n\n`,
            );
            res.end();
          },
          imageUrl,
        );
      } catch (aiError) {
        console.error("AI generation error:", aiError);
        res.write(
          `data: ${JSON.stringify({
            type: "error",
            message: "Failed to generate AI response",
            error: aiError.message,
          })}\n\n`,
        );
        res.end();
      }
    } catch (error) {
      console.error("General AI streaming usage error:", error);
      res.status(500).json({
        success: false,
        message: "Server error",
      });
    }
  },
);

// @desc    General AI usage - NON-STREAMING (with Search Results)
// @route   POST /api/tools/ai/general
// @access  Private
router.post("/ai/general", protect, aiGenerationLimiter, async (req, res) => {
  try {
    const { prompt, modelId, imageUrl } = req.body;

    if (!prompt || typeof prompt !== "string" || prompt.trim() === "") {
      return res.status(400).json({
        success: false,
        message: "Prompt is required and must be a non-empty string",
      });
    }

    const isSafe = await runSafetyCheck(req, res, prompt, imageUrl, "general");
    if (!isSafe) return;

    const startTime = Date.now();

    try {
      // Generate AI response using the specified model with optional image
      const aiResponse = await generateAIResponse(
        prompt,
        "You are a helpful AI assistant. Don't think too long, send 1 to 2 sentence very quick responses. You can send response up to 150 words only if necessary. You can send response above 150 words only if absolutely necessary. Always try to respond within 1 to 3 seconds if possible. Never think for more than 10 seconds, always think and respond within 10 seconds or less. The faster you respond, the better.",
        modelId,
        imageUrl,
      );

      const responseTime = Date.now() - startTime;

      const defaultCategoryId = "000000000000000000000000";

      // Process search results if they exist
      const processedSearchResults = aiResponse.search_results
        ? processSearchResults(aiResponse.search_results)
        : null;

      const historyEntry = await PromptHistory.create({
        user_id: req.user.id,
        prompt,
        response: aiResponse.response || "N/A",
        tool_id: null,
        tool_category_id: defaultCategoryId,
        api_used: aiResponse.provider || "default_api",
        tokens_used: aiResponse.tokens_used || 1,
        model_used: aiResponse.model || "unknown",
        response_time: responseTime,
        success: true,
        search_results: processedSearchResults,
      });

      await User.findByIdAndUpdate(req.user.id, {
        $push: { history: historyEntry._id },
      });

      res.json({
        success: true,
        data: {
          response: aiResponse.response,
          response_time: responseTime,
          provider: aiResponse.provider,
          model: aiResponse.model,
          search_results: processedSearchResults,
        },
      });
    } catch (aiError) {
      console.error("AI generation error:", aiError);

      const defaultCategoryId = "000000000000000000000000";

      // Save failed attempt to history
      await PromptHistory.create({
        user_id: req.user.id,
        prompt,
        response: "N/A",
        tool_id: null,
        tool_category_id: defaultCategoryId,
        api_used: "default_api",
        tokens_used: 1,
        model_used: "unknown",
        response_time: Date.now() - startTime,
        success: false,
        error_message: aiError.message,
      });

      res.status(500).json({
        success: false,
        message: "Failed to generate AI response",
        error: aiError.message,
      });
    }
  } catch (error) {
    console.error("General AI usage error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
});

// @desc    Create new tool
// @route   POST /api/tools
// @access  Private (Admin/UI-UX Designer)
router.post(
  "/",
  protect,
  validateTool,
  handleValidationErrors,
  async (req, res) => {
    try {
      // Verify category exists
      const category = await ToolCategory.findById(req.body.category_id);
      if (!category) {
        return res.status(404).json({
          success: false,
          message: "Tool category not found",
        });
      }

      // Verify AI model exists
      const aiModel = await AIModel.findById(req.body.ai_model_id).populate(
        "ai_provider_id",
      );
      if (!aiModel) {
        return res.status(404).json({
          success: false,
          message: "AI model not found",
        });
      }

      const toolData = {
        ...req.body,
        created_by: req.user.id,
      };

      const tool = await Tool.create(toolData);

      await tool.populate([
        { path: "category_id", select: "name category slug" },
        {
          path: "ai_model_id",
          populate: {
            path: "ai_provider_id",
            select: "name display_name",
          },
        },
        { path: "created_by", select: "name" },
      ]);

      res.status(201).json({
        success: true,
        message: "Tool created successfully",
        data: tool,
      });
    } catch (error) {
      console.error("Create tool error:", error);
      res.status(500).json({
        success: false,
        message: "Server error",
      });
    }
  },
);

// @desc    Update tool
// @route   PUT /api/tools/:id
// @access  Private (Admin/UI-UX Designer)
router.put("/:id", protect, async (req, res) => {
  try {
    const tool = await Tool.findById(req.params.id);

    if (!tool) {
      return res.status(404).json({
        success: false,
        message: "Tool not found",
      });
    }

    // Verify category exists if being updated
    if (req.body.category_id) {
      const category = await ToolCategory.findById(req.body.category_id);
      if (!category) {
        return res.status(404).json({
          success: false,
          message: "Tool category not found",
        });
      }
    }

    // Verify AI model exists if being updated
    if (req.body.ai_model_id) {
      const aiModel = await AIModel.findById(req.body.ai_model_id);
      if (!aiModel) {
        return res.status(404).json({
          success: false,
          message: "AI model not found",
        });
      }
    }

    const updatedTool = await Tool.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    }).populate([
      { path: "category_id", select: "name category slug" },
      {
        path: "ai_model_id",
        populate: {
          path: "ai_provider_id",
          select: "name display_name",
        },
      },
      { path: "created_by", select: "name" },
    ]);

    res.json({
      success: true,
      message: "Tool updated successfully",
      data: updatedTool,
    });
  } catch (error) {
    console.error("Update tool error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
});

// @desc    Delete tool
// @route   DELETE /api/tools/:id
// @access  Private (Admin only)
router.delete("/:id", protect, async (req, res) => {
  try {
    const tool = await Tool.findById(req.params.id);

    if (!tool) {
      return res.status(404).json({
        success: false,
        message: "Tool not found",
      });
    }

    await Tool.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: "Tool deleted successfully",
    });
  } catch (error) {
    console.error("Delete tool error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
});

// @desc    Delete tool
// @route   DELETE /api/tools
// @access  Private (Admin only)
router.delete("/", protect, async (req, res) => {
  let tools = req.body;

  if (!Array.isArray(tools) || tools.length === 0) {
    return res.status(400).json({
      success: false,
      message: "Please provide data of tools to delete",
    });
  }

  const deleteToolsIds = tools.map((tool) => tool.id);

  try {
    // fetch existing tool Ids from db
    const existingTool = await Tool.find({ _id: { $in: deleteToolsIds } })
      .select("_id")
      .lean();
    const existingToolIds = existingTool.map((tool) => tool._id.toString());

    // Identify which tools to id and their name
    const missingTools = tools.filter(
      (tool) => !existingToolIds.includes(tool.id),
    );

    if (missingTools.length > 0) {
      const missingToolsNames = missingTools.map((tool) => tool.name);
      return res.status(404).json({
        success: false,
        message: `Tools not found: ${missingToolsNames.join(", ")}`,
        missingTools,
      });
    }

    //proceed with deletion
    const result = await Tool.deleteMany({ _id: { $in: deleteToolsIds } });
    return res.json({
      success: true,
      message: `${result.deletedCount} tools are deleted successfully`,
    });
  } catch (error) {
    console.error("Bulk delete tool error: ", error);
    return res.status(500).json({
      success: false,
      message: "Server error during bulk delete",
    });
  }
});

// @desc    Toggle tool status
// @route   PATCH /api/tools/:id/toggle
// @access  Private (Admin/UI-UX Designer)
router.patch("/:id/toggle", protect, async (req, res) => {
  try {
    const tool = await Tool.findById(req.params.id);

    if (!tool) {
      return res.status(404).json({
        success: false,
        message: "Tool not found",
      });
    }

    tool.is_active = !tool.is_active;
    await tool.save();

    res.json({
      success: true,
      message: `Tool ${
        tool.is_active ? "activated" : "deactivated"
      } successfully`,
      data: { is_active: tool.is_active },
    });
  } catch (error) {
    console.error("Toggle tool error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
});

// @desc    Get tools by category
// @route   GET /api/tools/category/:categoryId
// @access  Public
router.get("/category/:categoryId", async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;

    const tools = await Tool.find({
      category_id: req.params.categoryId,
      is_active: true,
    })
      .populate("created_by", "name")
      .populate({
        path: "ai_model_id",
        populate: {
          path: "ai_provider_id",
          select: "name display_name",
        },
      })
      .sort({ usage_count: -1, createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Tool.countDocuments({
      category_id: req.params.categoryId,
      is_active: true,
    });

    res.json({
      success: true,
      data: tools,
      pagination: {
        current: page,
        pages: Math.ceil(total / limit),
        total,
      },
    });
  } catch (error) {
    console.error("Get tools by category error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
});

// ==========================================
// FAL AI NANO BANANA 2 EDIT ROUTE
// ==========================================
router.post(
  "/nano-banana-edit",
  upload.fields([
    { name: "image", maxCount: 1 },
    { name: "image2", maxCount: 1 },
  ]),
  protect,
  aiGenerationLimiter,
  async (req, res) => {
    const axios = require("axios");
    let { prompt, toolId = "general" } = req.body;
    const imageFile =
      req.files && req.files["image"] ? req.files["image"][0] : null;
    const imageFile2 =
      req.files && req.files["image2"] ? req.files["image2"][0] : null;

    if (!imageFile) {
      return res.status(400).json({
        success: false,
        error: "An input image is required for this tool.",
      });
    }

    if (!prompt || typeof prompt !== "string" || prompt.trim() === "") {
      return res.status(400).json({
        success: false,
        error: "A prompt/instruction is required for editing.",
      });
    }

    let safetyImageUrl = null;
    let safetyImageUrl2 = null;

    let mimeType = imageFile.mimetype || "image/jpeg";
    if (mimeType === "application/octet-stream") {
      const ext = imageFile.originalname
        ? imageFile.originalname.split(".").pop().toLowerCase()
        : "";
      mimeType = ext === "png" ? "image/png" : "image/jpeg";
    }
    safetyImageUrl = `data:${mimeType};base64,${imageFile.buffer.toString("base64")}`;

    if (imageFile2) {
      let mimeType2 = imageFile2.mimetype || "image/jpeg";
      if (mimeType2 === "application/octet-stream") {
        const ext2 = imageFile2.originalname
          ? imageFile2.originalname.split(".").pop().toLowerCase()
          : "";
        mimeType2 = ext2 === "png" ? "image/png" : "image/jpeg";
      }
      safetyImageUrl2 = `data:${mimeType2};base64,${imageFile2.buffer.toString("base64")}`;
    }

    const isSafe = await runSafetyCheck(
      req,
      res,
      prompt,
      safetyImageUrl,
      "nano-banana-edit",
    );
    if (!isSafe) return;

    if (safetyImageUrl2) {
      const isSafe2 = await runSafetyCheck(
        req,
        res,
        prompt,
        safetyImageUrl2,
        "nano-banana-edit",
      );
      if (!isSafe2) return;
    }

    // Content Moderation: Protected Sacred Figures Policy Check
    const sacredCheck = checkSacredFiguresPolicy([prompt]);
    if (sacredCheck.blocked) {
      return res.status(400).json({
        success: false,
        error: sacredCheck.message,
      });
    }

    try {
      // 1. Fetch user
      const user = await User.findById(req.user.id);

      if (!user) {
        return res
          .status(404)
          .json({ success: false, error: "User not found" });
      }

      // 2. Free user block
      if (user.plan === "basic") {
        return res.status(403).json({
          success: false,
          error:
            "Free users cannot use these tools. Please upgrade to a Standard, Pro, or Pro Max plan.",
        });
      }

      if (user.subscription_status === "trialing") {
        return res.status(403).json({
          success: false,
          error:
            "This tool is not available during the free trial. Please wait for your trial to end and your subscription to become active.",
        });
      }

      // 3. Credit Cost check (10 credits)
      const creditCost = 10;
      if ((user.image_credits || 0) < creditCost) {
        return res.status(402).json({
          success: false,
          error: `Insufficient image credits. This edit requires ${creditCost} credits, but you only have ${user.image_credits || 0}.`,
        });
      }

      // 4. Construct Fal AI call payload
      const falApiKey = process.env.FAL_API_KEY;
      const falUrl = process.env.FAL_NANO_BANANA_URL;

      if (!falApiKey || !falUrl) {
        throw new Error(
          "Missing Fal AI API credentials in environment variables.",
        );
      }

      const imageUrls = [safetyImageUrl];
      if (safetyImageUrl2) {
        imageUrls.push(safetyImageUrl2);
      }

      const payload = {
        prompt: prompt.trim(),
        image_urls: imageUrls,
        safety_tolerance: "6",
      };

      // Call Fal AI nano-banana-2/edit model (Synchronous execution endpoint)
      const falResponse = await axios.post(falUrl, payload, {
        headers: {
          Authorization: `Key ${falApiKey}`,
          "Content-Type": "application/json",
        },
        timeout: 90000, // 90 seconds timeout for generation
      });

      if (
        !falResponse.data ||
        !falResponse.data.images ||
        falResponse.data.images.length === 0
      ) {
        throw new Error("No image was generated by Fal AI.");
      }

      const generatedImageUrl = falResponse.data.images[0].url;

      // 5. Download generated image binary
      const imageDownloadResponse = await axios.get(generatedImageUrl, {
        responseType: "arraybuffer",
      });

      const imageBuffer = imageDownloadResponse.data;
      const responseContentType =
        imageDownloadResponse.headers["content-type"] || "image/png";

      // 6. Deduct 10 credits upon success
      await User.findByIdAndUpdate(req.user.id, {
        $inc: { image_credits: -creditCost },
      });

      // 7. Send binary image back
      res.set("Content-Type", responseContentType);
      res.send(imageBuffer);
    } catch (error) {
      let statusCode = 500;
      let rawErrorData = null;
      if (error.response) {
        statusCode = error.response.status || 500;
        rawErrorData = error.response.data;
        console.error("Status Code:", statusCode);
        console.error(
          "Response Headers:",
          JSON.stringify(error.response.headers, null, 2),
        );
        console.error(
          "Full Fal AI Response Data:",
          JSON.stringify(rawErrorData, null, 2),
        );
      } else {
        console.error("Error Message:", error.message);
        console.error("Error Stack:", error.stack);
      }
      // =========================================================
      // 2. FOR END USERS: Clean, polite, user-friendly messages
      // =========================================================
      let userMessage = "Failed to edit image. Please try again.";
      const isContentPolicy =
        statusCode === 422 ||
        (rawErrorData &&
          JSON.stringify(rawErrorData).includes("content_policy_violation"));
      if (isContentPolicy) {
        userMessage =
          "Your image edit could not be processed due to content safety guidelines. Please try a different image or prompt.";
      } else if (statusCode === 400) {
        userMessage =
          "Invalid request. Please check your uploaded image and prompt, then try again.";
      } else if (statusCode === 429) {
        userMessage =
          "Server is busy with high traffic. Please wait a moment and try again.";
      } else if (statusCode === 503 || statusCode === 504) {
        userMessage =
          "The AI service is temporarily unavailable. Please try again in a few seconds.";
      }
      // Send friendly message to user (raw Fal AI logs remain safely on server)
      return res.status(statusCode).json({
        success: false,
        error: userMessage,
      });
      // res.status(500).json({ error: error.message || "Failed to process image editing." });
    }
  },
);

// ==========================================
// FAL AI GEMINI OMNI VIDEO GENERATION ROUTE
// (WITH GOOGLE VEO 3.1 NATIVE INTEGRATION)
// ==========================================
router.post(
  "/gemini-omni-video",
  upload.any(),
  protect,
  aiGenerationLimiter,
  async (req, res) => {
    const axios = require("axios");
    req.setTimeout(600000); // 10 minute timeout to prevent node request timeout

    let {
      prompt,
      model = "gemini-omni-flash",
      modelType = "text-to-video",
      duration = "3",
      aspectRatio = "16:9",
      includeAudio = "no",
      image_urls: preUploadedImageUrls,
      image_url: preUploadedImageUrl,
      video_url: preUploadedVideoUrl,
    } = req.body;

    const files = req.files || [];

    if (!prompt || typeof prompt !== "string" || prompt.trim() === "") {
      return res.status(400).json({
        success: false,
        error: "A prompt is required for video generation.",
      });
    }

    // Content Moderation: Protected Sacred Figures Policy Check
    const sacredCheck = checkSacredFiguresPolicy([prompt]);
    if (sacredCheck.blocked) {
      return res.status(400).json({
        success: false,
        error: sacredCheck.message,
      });
    }

    try {
      // 1. Fetch user
      const user = await User.findById(req.user.id);
      if (!user) {
        return res
          .status(404)
          .json({ success: false, error: "User not found" });
      }

      const superAdminEmails = [
        "kamarahabib@gmail.com",
        "dhavalnasit3@gmail.com",
      ];
      const isSuperAdmin =
        user.email && superAdminEmails.includes(user.email.toLowerCase());

      // Block basic/standard/lite users from generating videos
      if (
        !isSuperAdmin &&
        (user.plan === "basic" ||
          user.plan === "standard" ||
          user.plan === "lite")
      ) {
        return res.status(403).json({
          success: false,
          error:
            "Basic and Free users cannot generate videos. Please upgrade to a Pro or Pro Max plan.",
        });
      }

      if (!isSuperAdmin && user.subscription_status === "trialing") {
        return res.status(403).json({
          success: false,
          error:
            "Video generation is not available during the free trial. Please wait for your trial to end and your subscription to become active.",
        });
      }

      // 2. Billing rate (9 credits/sec)
      const durationSeconds = parseInt(duration) || 8;
      const creditCost = durationSeconds * 9;

      if (!isSuperAdmin && (user.video_credits || 0) < creditCost) {
        return res.status(402).json({
          success: false,
          error: `Insufficient video credits. This video requires ${creditCost} credits, but you only have ${user.video_credits || 0}.`,
        });
      }

      // 3. Process uploaded files (using base64 data URIs in-memory)
      let uploadedImageUrls = [];
      let uploadedVideoUrl = null;

      // Handle pre-uploaded strings from frontend if present
      if (preUploadedImageUrls) {
        if (Array.isArray(preUploadedImageUrls)) {
          uploadedImageUrls = [...preUploadedImageUrls];
        } else if (typeof preUploadedImageUrls === "string") {
          try {
            uploadedImageUrls = JSON.parse(preUploadedImageUrls);
          } catch (_) {
            uploadedImageUrls = [preUploadedImageUrls];
          }
        }
      }
      if (preUploadedImageUrl && uploadedImageUrls.length === 0) {
        uploadedImageUrls.push(preUploadedImageUrl);
      }
      if (preUploadedVideoUrl) {
        uploadedVideoUrl = preUploadedVideoUrl;
      }

      // Convert multipart file buffers directly to Base64 data URIs
      for (const file of files) {
        const mimeType = file.mimetype || "application/octet-stream";
        const base64Data = file.buffer.toString("base64");
        const dataUrl = `data:${mimeType};base64,${base64Data}`;

        if (file.fieldname.startsWith("image") || file.fieldname === "file") {
          uploadedImageUrls.push(dataUrl);
        } else if (
          file.fieldname.startsWith("video") ||
          file.fieldname === "background"
        ) {
          uploadedVideoUrl = dataUrl;
        }
      }

      // 4. Select API key, endpoint, and payload structure based on model & modelType
      let falApiKey = "";
      let falUrl = "";
      let payload = {};

      const isVeoReference =
        model === "veo-3.1-fast" ||
        model === "veo" ||
        model === "fal-ai/veo3.1/fast/reference-to-video" ||
        modelType === "veo-reference-to-video";

      if (isVeoReference) {
        const requestedSec = parseInt(duration) || 8;
        const totalDurationSec =
          parseInt(req.body.totalDuration) || requestedSec;

        // If total video length is > 8s (e.g. 15s, 30s, 60s), the initial chunk also uses EXTEND key
        // so that Google permissions match across subsequent extension chunks.
        // If total length <= 8s, strictly use BASE key.
        const googleVeoKey =
          totalDurationSec > 8
            ? process.env.GOOGLE_VEO_EXTEND_API_KEY
            : process.env.GOOGLE_VEO_BASE_API_KEY;

        // 👇 Google Veo Fast supports duration strictly between 4s and 8s per call
        let durationSec = requestedSec;
        if (durationSec < 4) durationSec = 4;
        if (durationSec > 8) durationSec = 8;

        const shouldGenerateAudio =
          includeAudio === "yes" ||
          includeAudio === "true" ||
          includeAudio === true;

        // Try Google Native Veo 3.1 Fast REST API
        try {
          const googleEndpoint = `https://generativelanguage.googleapis.com/v1beta/models/veo-3.1-fast-generate-preview:predictLongRunning?key=${googleVeoKey}`;

          let formattedAspect = "16:9";
          if (aspectRatio === "9:16" || aspectRatio === "portrait") {
            formattedAspect = "9:16";
          } else if (aspectRatio === "1:1") {
            formattedAspect = "1:1";
          }

          const instances = [];
          const instanceObj = {
            prompt: prompt.trim(),
          };

          if (uploadedImageUrls.length > 0) {
            const firstImg = uploadedImageUrls[0];
            if (firstImg.startsWith("data:")) {
              const base64Data = firstImg.split(",")[1];
              const mime = firstImg.substring(
                firstImg.indexOf(":") + 1,
                firstImg.indexOf(";"),
              );
              instanceObj.image = {
                bytesBase64Encoded: base64Data,
                mimeType: mime || "image/png",
              };
            }
          }

          if (uploadedVideoUrl) {
            if (uploadedVideoUrl.startsWith("data:")) {
              const base64Data = uploadedVideoUrl.split(",")[1];
              instanceObj.video = {
                bytesBase64Encoded: base64Data,
                mimeType: "video/mp4",
              };
            }
          }

          instances.push(instanceObj);

          // 👇 Veo 3.1 Fast parameters: 1080p resolution for <= 8s, aspect ratio & duration
          const parameters = {
            aspectRatio: formattedAspect,
            durationSeconds: durationSec,
            // resolution: "1080p",
          };

          console.log(
            `[Google Veo Native] Initiating generation. Duration: ${durationSec}s, Audio: ${shouldGenerateAudio}`,
          );

          const initialGoogleRes = await axios.post(
            googleEndpoint,
            { instances, parameters },
            {
              headers: {
                "Content-Type": "application/json",
                "x-goog-api-key": googleVeoKey,
              },
              timeout: 60000,
            },
          );

          const operationName = initialGoogleRes.data?.name;
          if (operationName) {
            for (let attempt = 0; attempt < 60; attempt++) {
              await new Promise((resolve) => setTimeout(resolve, 5000));
              const pollUrl = `https://generativelanguage.googleapis.com/v1beta/${operationName}?key=${googleVeoKey}`;
              const opCheck = await axios.get(pollUrl, {
                headers: { "x-goog-api-key": googleVeoKey },
                timeout: 30000,
              });

              if (opCheck.data?.done) {
                if (opCheck.data?.error) {
                  throw new Error(
                    `Google Veo Error: ${opCheck.data.error.message || JSON.stringify(opCheck.data.error)}`,
                  );
                }

                const resp = opCheck.data?.response;

                const generatedSamples =
                  resp?.generateVideoResponse?.generatedSamples || [];

                const targetVideo = generatedSamples[0]?.video;

                if (targetVideo?.uri) {
                  const dlRes = await axios.get(targetVideo.uri, {
                    headers: { "x-goog-api-key": googleVeoKey },
                    responseType: "arraybuffer",
                    timeout: 60000,
                  });

                  if (!isSuperAdmin) {
                    await User.findByIdAndUpdate(req.user.id, {
                      $inc: { video_credits: -creditCost },
                    });
                  }

                  // Google Veo Extension API specifically requires the full download URI:
                  // "https://generativelanguage.googleapis.com/v1beta/files/...:download?alt=media"
                  const fullGoogleUri = targetVideo.uri;

                  res.set(
                    "Content-Type",
                    dlRes.headers["content-type"] || "video/mp4",
                  );
                  // Send full Google URI to frontend
                  res.set("x-google-video-uri", fullGoogleUri);
                  res.set(
                    "Access-Control-Expose-Headers",
                    "x-google-video-uri",
                  );

                  return res.send(Buffer.from(dlRes.data));
                } else if (targetVideo?.bytesBase64Encoded) {
                  if (!isSuperAdmin) {
                    await User.findByIdAndUpdate(req.user.id, {
                      $inc: { video_credits: -creditCost },
                    });
                  }

                  res.set("Content-Type", "video/mp4");
                  return res.send(
                    Buffer.from(targetVideo.bytesBase64Encoded, "base64"),
                  );
                }
                break;
              }
            }
          }
        } catch (googleErr) {
          console.warn(
            "[Google Veo 3.1 Fast Native] Direct call warning, using resilient fallback:",
            googleErr?.response?.data || googleErr.message,
          );
          throw googleErr;
        }

        // Fal.ai fallback for Veo 3.1 Fast Reference-to-Video
        falApiKey =
          process.env.FAL_KEY_VEO_REFERENCE_TO_VIDEO ||
          "7cb56588-9c70-4d47-af8d-c1cd96ebf289:303c23f2330766f9e58ad863aadd5533";
        falUrl = "https://queue.fal.run/fal-ai/veo3.1/fast/reference-to-video";

        payload = {
          prompt: prompt.trim(),
          aspect_ratio: aspectRatio || "16:9",
          duration: "8s",
          generate_audio: shouldGenerateAudio,
        };

        if (uploadedImageUrls.length > 0) {
          payload.image_urls = uploadedImageUrls;
        }
        if (uploadedVideoUrl) {
          payload.video_url = uploadedVideoUrl;
        }
      } else {
        switch (modelType) {
          case "text-to-video":
            falApiKey = process.env.FAL_KEY_GEMINI_TEXT_TO_VIDEO;
            falUrl =
              "https://queue.fal.run/google/gemini-omni-flash/text-to-video";
            break;
          case "image-to-video":
            falApiKey = process.env.FAL_KEY_GEMINI_IMAGE_TO_VIDEO;
            falUrl =
              "https://queue.fal.run/google/gemini-omni-flash/image-to-video";
            break;
          case "reference-to-video":
            falApiKey = process.env.FAL_KEY_GEMINI_REFERENCE_TO_VIDEO;
            falUrl =
              "https://queue.fal.run/google/gemini-omni-flash/reference-to-video";
            break;
          case "edit":
            falApiKey = process.env.FAL_KEY_GEMINI_EDIT;
            falUrl = "https://queue.fal.run/google/gemini-omni-flash/edit";
            break;
          default:
            return res
              .status(400)
              .json({ success: false, error: "Invalid model type specified." });
        }

        payload = {
          prompt: prompt.trim(),
          aspect_ratio: aspectRatio || "16:9",
          duration: durationSeconds,
          include_audio: includeAudio === "yes",
        };

        if (modelType === "image-to-video") {
          if (uploadedImageUrls.length === 0) {
            return res.status(400).json({
              success: false,
              error: "An input image is required for image-to-video.",
            });
          }
          payload.image_url = uploadedImageUrls[0];
        } else if (modelType === "reference-to-video") {
          if (uploadedImageUrls.length > 0) {
            payload.image_urls = uploadedImageUrls;
          }
          if (uploadedVideoUrl) {
            payload.video_url = uploadedVideoUrl;
          }
        } else if (modelType === "edit") {
          if (!uploadedVideoUrl) {
            return res.status(400).json({
              success: false,
              error: "An input video is required for video editing.",
            });
          }
          payload.video_url = uploadedVideoUrl;
        }
      }

      if (!falApiKey) {
        throw new Error(
          `Missing Fal AI API credentials for model: ${model || modelType}`,
        );
      }

      const queueResponse = await axios.post(falUrl, payload, {
        headers: {
          Authorization: `Key ${falApiKey}`,
          "Content-Type": "application/json",
        },
      });

      const statusUrl = queueResponse.data?.status_url;
      const responseUrl = queueResponse.data?.response_url;
      if (!statusUrl) {
        throw new Error("No status URL returned from Fal AI queue service.");
      }

      let generationFinished = false;
      let falResult = null;

      // Poll status url (up to 60 attempts, checking every 5 seconds = 5 minutes total timeout)
      for (let attempt = 0; attempt < 60; attempt++) {
        await new Promise((resolve) => setTimeout(resolve, 5000));

        const statusCheck = await axios.get(statusUrl, {
          headers: {
            Authorization: `Key ${falApiKey}`,
          },
        });

        if (statusCheck.data?.status === "COMPLETED") {
          // Fetch final generation result from the response URL
          const resultCheck = await axios.get(responseUrl, {
            headers: {
              Authorization: `Key ${falApiKey}`,
            },
          });
          falResult = resultCheck.data;
          generationFinished = true;
          break;
        } else if (statusCheck.data?.status === "FAILED") {
          throw new Error(
            `Fal AI generation failed: ${statusCheck.data?.error || "Unknown error"}`,
          );
        }
        console.log(`Polling Gemini Omni status: ${statusCheck.data?.status}`);
      }

      if (
        !generationFinished ||
        !falResult ||
        !falResult.video ||
        !falResult.video.url
      ) {
        throw new Error(
          "Gemini Omni video generation timed out or returned invalid output.",
        );
      }

      const generatedVideoUrl = falResult.video.url;
      console.log("Success! Generated video URL:", generatedVideoUrl);

      // 6. Download generated video file
      const videoDownloadResponse = await axios.get(generatedVideoUrl, {
        responseType: "arraybuffer",
      });

      const videoBuffer = videoDownloadResponse.data;
      const responseContentType =
        videoDownloadResponse.headers["content-type"] || "video/mp4";

      // 7. Deduct credits (bypassed for super admin testing)
      if (!isSuperAdmin) {
        await User.findByIdAndUpdate(req.user.id, {
          $inc: { video_credits: -creditCost },
        });
      }

      // 8. Stream video binary back
      res.set("Content-Type", responseContentType);
      res.send(videoBuffer);
    } catch (error) {
      console.error("Gemini Omni Video Route Error:", error);
      let statusCode = 500;
      let userMessage = "Failed to process video tool. Please try again.";

      if (error.response) {
        statusCode = error.response.status || 500;
        const rawData = error.response.data;
        // Log the full fal.ai validation detail for debugging
        console.error(
          "Fal.ai error response data:",
          JSON.stringify(rawData, null, 2),
        );
        if (rawData && rawData.detail) {
          const details = Array.isArray(rawData.detail)
            ? rawData.detail
            : [rawData.detail];
          const detailMsg = details
            .map((d) => d.msg || d.message || JSON.stringify(d))
            .join("; ");
          userMessage = `Video generation failed: ${detailMsg}`;
        } else if (
          rawData &&
          JSON.stringify(rawData).includes("content_policy_violation")
        ) {
          userMessage =
            "Your video request could not be processed due to content safety guidelines. Please modify your prompt or references.";
        }
      } else if (error.message) {
        userMessage = error.message;
      }

      return res.status(statusCode).json({
        success: false,
        error: userMessage,
      });
    }
  },
);

// =========================================================================
// GOOGLE VEO 3.1 FAST EXTENDED VIDEO ROUTE
// =========================================================================
router.post(
  "/extend-video-reference-veo",
  upload.any(),
  protect,
  aiGenerationLimiter,
  async (req, res) => {
    const axios = require("axios");
    req.setTimeout(600000); // 10 minute timeout

    let {
      prompt,
      extensionSeconds = "8",
      aspectRatio = "16:9",
      includeAudio = "no",
      googleVideoUri,
    } = req.body;

    // Content Moderation: Protected Sacred Figures Policy Check
    const sacredCheck = checkSacredFiguresPolicy([prompt]);
    if (sacredCheck.blocked) {
      return res.status(400).json({
        success: false,
        error: sacredCheck.message,
      });
    }

    try {
      const user = await User.findById(req.user.id);
      if (!user)
        return res
          .status(404)
          .json({ success: false, error: "User not found" });

      // Google strict limits: between 4 and 8 inclusive.
      let extendSec = parseInt(extensionSeconds) || 8;
      if (extendSec > 8) extendSec = 8;
      if (extendSec < 4) extendSec = 4;

      const superAdminEmails = [
        "kamarahabib@gmail.com",
        "dhavalnasit3@gmail.com",
      ];
      const isSuperAdmin =
        user.email && superAdminEmails.includes(user.email.toLowerCase());

      const creditCost = extendSec * 9;

      if (!isSuperAdmin && (user.video_credits || 0) < creditCost) {
        return res.status(402).json({
          success: false,
          error: `Insufficient video credits. You need ${creditCost} credits.`,
        });
      }

      // Extract uploaded video file or raw base64 if present
      let uploadedVideoBase64 = null;
      let uploadedVideoMime = "video/mp4";

      if (req.files && req.files.length > 0) {
        const videoFile = req.files.find(
          (f) =>
            f.fieldname === "video" ||
            f.fieldname === "videoInput" ||
            f.mimetype?.startsWith("video/"),
        );
        if (videoFile && videoFile.buffer) {
          uploadedVideoBase64 = videoFile.buffer.toString("base64");
          uploadedVideoMime = videoFile.mimetype || "video/mp4";
        }
      }

      if (req.body.videoBase64) {
        let b64 = req.body.videoBase64.trim();
        if (b64.startsWith("data:")) {
          uploadedVideoMime = b64.substring(b64.indexOf(":") + 1, b64.indexOf(";")) || "video/mp4";
          b64 = b64.split(",")[1];
        }
        uploadedVideoBase64 = b64;
      }

      let targetGoogleUri = (googleVideoUri && typeof googleVideoUri === "string") ? googleVideoUri.trim() : null;
      if (targetGoogleUri && !targetGoogleUri.includes(":download")) {
        // Ensure proper Google download URI format expected by Google Veo
        targetGoogleUri = `${targetGoogleUri}:download?alt=media`;
      }

      if (!targetGoogleUri && !uploadedVideoBase64) {
        return res.status(400).json({
          success: false,
          error: "Missing video input. Provide either a valid googleVideoUri or an initial video file/base64 buffer.",
        });
      }

      // Google Veo Extension Key (Key B - Strictly separate from Base Key A)
      const googleExtendKey = process.env.GOOGLE_VEO_EXTEND_API_KEY;
      if (!googleExtendKey) {
        return res.status(500).json({
          success: false,
          error: "GOOGLE_VEO_EXTEND_API_KEY is not configured.",
        });
      }

      let formattedAspect = "16:9";
      if (aspectRatio === "9:16" || aspectRatio === "portrait") {
        formattedAspect = "9:16";
      } else if (aspectRatio === "1:1") {
        formattedAspect = "1:1";
      }

      // 👇 Check Audio
      const shouldGenerateAudio =
        includeAudio === "yes" ||
        includeAudio === "true" ||
        includeAudio === true;

      // 🔥 Enrich prompt with strict camera lock, front-facing framing, absolute facial geometry and zero drift
      let extensionPrompt = "Seamless continuous continuation of the exact preceding video scene. Maintain the exact same camera angle, subject framing, face identity, clothing, and background without any camera shift or facial morphing.";
      
      if (prompt && prompt.trim()) {
        const cleanContext = prompt
          .replace(/CRITICAL MANDATORY INSTRUCTIONS[\s\S]*/gi, "")
          .replace(/Use the supplied reference images[\s\S]*/gi, "")
          .trim();
        if (cleanContext) {
          extensionPrompt = `${extensionPrompt} Context: ${cleanContext}`;
        }
      }

      // Google Gemini Veo REST API schema uses:
      // "video": {"uri": "https://generativelanguage.googleapis.com/v1beta/files/...:download?alt=media"}
      let videoObj = null;
      if (targetGoogleUri) {
        videoObj = { uri: targetGoogleUri };
      } else if (uploadedVideoBase64) {
        videoObj = {
          bytesBase64Encoded: uploadedVideoBase64,
          mimeType: uploadedVideoMime || "video/mp4",
        };
      }

      const instances = [
        {
          prompt: extensionPrompt,
          video: videoObj,
        },
      ];

      // Google Veo parameters for extension:
      const parameters = {
        aspectRatio: formattedAspect,
        durationSeconds: extendSec,
      };

      const googleEndpoint = `https://generativelanguage.googleapis.com/v1beta/models/veo-3.1-fast-generate-preview:predictLongRunning?key=${googleExtendKey}`;

      let operationName = null;
      try {
        const initialGoogleRes = await axios.post(
          googleEndpoint,
          { instances, parameters },
          {
            headers: {
              "Content-Type": "application/json",
              "x-goog-api-key": googleExtendKey,
            },
            timeout: 60000,
          },
        );
        operationName = initialGoogleRes.data?.name;
      } catch (initErr) {
        if (
          targetGoogleUri &&
          uploadedVideoBase64 &&
          initErr?.response?.data?.error?.message?.includes("Input video must be a video that was generated by VEO")
        ) {
          console.warn("[Google Veo Extend] Google URI not yet ready/indexed on Google server. Retrying with direct Base64 buffer...");
          const fallbackInstances = [
            {
              prompt: extensionPrompt,
              video: {
                bytesBase64Encoded: uploadedVideoBase64,
                mimeType: uploadedVideoMime || "video/mp4",
              },
            },
          ];
          const fallbackRes = await axios.post(
            googleEndpoint,
            { instances: fallbackInstances, parameters },
            {
              headers: {
                "Content-Type": "application/json",
                "x-goog-api-key": googleExtendKey,
              },
              timeout: 60000,
            },
          );
          operationName = fallbackRes.data?.name;
        } else {
          throw initErr;
        }
      }

      if (!operationName)
        throw new Error("Google Veo did not return a valid operation name.");

      for (let attempt = 0; attempt < 120; attempt++) {
        await new Promise((resolve) => setTimeout(resolve, 5000));
        const pollUrl = `https://generativelanguage.googleapis.com/v1beta/${operationName}?key=${googleExtendKey}`;
        let opCheck = null;
        try {
          opCheck = await axios.get(pollUrl, {
            headers: { "x-goog-api-key": googleExtendKey },
            timeout: 30000,
          });
        } catch (pollErr) {
          console.warn(`[Google Veo Extend] Polling attempt ${attempt + 1} transient error:`, pollErr.message);
          continue;
        }

        if (opCheck.data?.done) {
          if (opCheck.data?.error)
            throw new Error(
              opCheck.data.error.message || JSON.stringify(opCheck.data.error),
            );

          const targetVideo =
            opCheck.data?.response?.generateVideoResponse?.generatedSamples?.[0]
              ?.video;

          if (targetVideo?.uri) {
            const dlRes = await axios.get(targetVideo.uri, {
              headers: { "x-goog-api-key": googleExtendKey },
              responseType: "arraybuffer",
              timeout: 60000,
            });

            // Deduct credits (bypassed for super admin testing)
            if (!isSuperAdmin) {
              await User.findByIdAndUpdate(req.user.id, {
                $inc: { video_credits: -creditCost },
              });
            }

            // Return the full Google URI so subsequent extensions in 30s/45s/60s chain succeed
            const nextGoogleUri = targetVideo.uri;

            res.set(
              "Content-Type",
              dlRes.headers["content-type"] || "video/mp4",
            );
            res.set("x-google-video-uri", nextGoogleUri);
            res.set("Access-Control-Expose-Headers", "x-google-video-uri");
            return res.send(Buffer.from(dlRes.data));
          }
        }
      }
      throw new Error("Google Veo extension timed out after 5 minutes.");
    } catch (error) {
      console.error(
        "[Google Veo Extend Error]:",
        error?.response?.data || error?.message,
      );
      const rawData = error?.response?.data;
      let userMessage = error?.message || "Failed to extend video.";
      if (rawData?.error)
        userMessage =
          typeof rawData.error === "string"
            ? rawData.error
            : rawData.error.message;
      return res
        .status(error?.response?.status || 500)
        .json({ success: false, provider: "google-veo", error: userMessage });
    }
  },
);

// =========================================================================
// FAL AI VEO 3.1 FAST REFERENCE TO VIDEO ROUTE
// =========================================================================
router.post(
  "/generate-video-reference-veo",
  upload.any(),
  protect,
  aiGenerationLimiter,
  async (req, res) => {
    const axios = require("axios");
    req.setTimeout(600000); // 10 minute timeout

    let {
      prompt,
      duration = "5s",
      aspectRatio = "16:9",
      resolution = "720p",
      audio = "no",
      image_urls: preUploadedImageUrls,
      image_url: preUploadedImageUrl,
      video_url: preUploadedVideoUrl,
    } = req.body;

    const files = req.files || [];

    if (!prompt || typeof prompt !== "string" || prompt.trim() === "") {
      return res.status(400).json({
        success: false,
        error: "A prompt is required for video generation.",
      });
    }

    try {
      // 1. Fetch user
      const user = await User.findById(req.user.id);
      if (!user) {
        return res
          .status(404)
          .json({ success: false, error: "User not found" });
      }

      const superAdminEmails = [
        "kamarahabib@gmail.com",
        "dhavalnasit3@gmail.com",
      ];
      const isSuperAdmin =
        user.email && superAdminEmails.includes(user.email.toLowerCase());

      if (
        !isSuperAdmin &&
        (user.plan === "basic" ||
          user.plan === "standard" ||
          user.plan === "lite")
      ) {
        return res.status(403).json({
          success: false,
          error:
            "Basic and Free users cannot generate videos. Please upgrade to a Pro or Pro Max plan.",
        });
      }

      if (!isSuperAdmin && user.subscription_status === "trialing") {
        return res.status(403).json({
          success: false,
          error:
            "Video generation is not available during the free trial. Please wait for your trial to end and your subscription to become active.",
        });
      }

      // 2. Billing rate (9 credits/sec or standard model cost)
      const durationSeconds = parseInt(duration) || 5;
      const creditCost = durationSeconds * 9;

      if (!isSuperAdmin && (user.video_credits || 0) < creditCost) {
        return res.status(402).json({
          success: false,
          error: `Insufficient video credits. This video requires ${creditCost} credits, but you only have ${user.video_credits || 0}.`,
        });
      }

      // 3. Process uploaded reference files (base64 data URIs)
      let uploadedImageUrls = [];
      let uploadedVideoUrl = null;

      if (preUploadedImageUrls) {
        if (Array.isArray(preUploadedImageUrls)) {
          uploadedImageUrls = [...preUploadedImageUrls];
        } else if (typeof preUploadedImageUrls === "string") {
          try {
            uploadedImageUrls = JSON.parse(preUploadedImageUrls);
          } catch (_) {
            uploadedImageUrls = [preUploadedImageUrls];
          }
        }
      }
      if (preUploadedImageUrl && uploadedImageUrls.length === 0) {
        uploadedImageUrls.push(preUploadedImageUrl);
      }
      if (preUploadedVideoUrl) {
        uploadedVideoUrl = preUploadedVideoUrl;
      }

      for (const file of files) {
        const mimeType = file.mimetype || "application/octet-stream";
        const base64Data = file.buffer.toString("base64");
        const dataUrl = `data:${mimeType};base64,${base64Data}`;

        if (file.fieldname.startsWith("image") || file.fieldname === "file") {
          uploadedImageUrls.push(dataUrl);
        } else if (
          file.fieldname.startsWith("video") ||
          file.fieldname === "background"
        ) {
          uploadedVideoUrl = dataUrl;
        }
      }

      // 4. API Key & Endpoint for Veo 3.1 Fast Reference to Video
      const falApiKey =
        process.env.FAL_KEY_VEO_REFERENCE_TO_VIDEO ||
        "7cb56588-9c70-4d47-af8d-c1cd96ebf289:303c23f2330766f9e58ad863aadd5533";
      const falUrl =
        "https://queue.fal.run/fal-ai/veo3.1/fast/reference-to-video";

      // 5. Construct Payload (Veo 3.1 requires duration to be '8s')
      let formattedDuration = "8s";
      if (typeof duration === "string" && duration.trim() !== "") {
        let cleanDuration = duration.trim();
        if (!cleanDuration.endsWith("s")) {
          cleanDuration = `${cleanDuration}s`;
        }
        // Veo 3.1 fast reference-to-video specifically supports '8s' or '5s'
        formattedDuration = cleanDuration === "8s" ? "8s" : "8s";
      }

      const payload = {
        prompt: prompt.trim(),
        aspect_ratio: aspectRatio || "16:9",
        duration: formattedDuration,
      };

      if (uploadedImageUrls.length > 0) {
        payload.image_urls = uploadedImageUrls;
        payload.image_url = uploadedImageUrls[0];
      }
      if (uploadedVideoUrl) {
        payload.video_url = uploadedVideoUrl;
      }

      const queueResponse = await axios.post(falUrl, payload, {
        headers: {
          Authorization: `Key ${falApiKey}`,
          "Content-Type": "application/json",
        },
      });

      const statusUrl = queueResponse.data?.status_url;
      const responseUrl = queueResponse.data?.response_url;
      if (!statusUrl) {
        throw new Error("No status URL returned from Fal AI queue service.");
      }

      let generationFinished = false;
      let falResult = null;

      // Poll status url (up to 60 attempts, checking every 5 seconds = 5 minutes timeout)
      for (let attempt = 0; attempt < 60; attempt++) {
        await new Promise((resolve) => setTimeout(resolve, 5000));

        const statusCheck = await axios.get(statusUrl, {
          headers: {
            Authorization: `Key ${falApiKey}`,
          },
        });

        if (statusCheck.data?.status === "COMPLETED") {
          const resultCheck = await axios.get(responseUrl, {
            headers: {
              Authorization: `Key ${falApiKey}`,
            },
          });
          falResult = resultCheck.data;
          generationFinished = true;
          break;
        } else if (statusCheck.data?.status === "FAILED") {
          throw new Error(
            `Fal AI generation failed: ${statusCheck.data?.error || "Unknown error"}`,
          );
        }
        console.log(
          `Polling Veo 3.1 Fast Reference-to-Video status: ${statusCheck.data?.status}`,
        );
      }

      if (
        !generationFinished ||
        !falResult ||
        !falResult.video ||
        !falResult.video.url
      ) {
        throw new Error(
          "Veo 3.1 Fast video generation timed out or returned invalid output.",
        );
      }

      const generatedVideoUrl = falResult.video.url;
      console.log("Success! Generated Veo 3.1 video URL:", generatedVideoUrl);

      // 6. Download generated video binary
      const videoDownloadResponse = await axios.get(generatedVideoUrl, {
        responseType: "arraybuffer",
      });

      const videoBuffer = videoDownloadResponse.data;
      const responseContentType =
        videoDownloadResponse.headers["content-type"] || "video/mp4";

      // 7. Deduct credits upon success (bypassed for super admin testing)
      if (!isSuperAdmin) {
        await User.findByIdAndUpdate(req.user.id, {
          $inc: { video_credits: -creditCost },
        });
      }

      // 8. Send binary video response
      res.set("Content-Type", responseContentType);
      res.send(videoBuffer);
    } catch (error) {
      console.error("Veo 3.1 Fast Reference-to-Video Error:", error);
      let statusCode = 500;
      let userMessage = "Failed to process reference video. Please try again.";

      if (error.response) {
        statusCode = error.response.status || 500;
        const rawData = error.response.data;
        if (rawData && rawData.detail) {
          const details = Array.isArray(rawData.detail)
            ? rawData.detail
            : [rawData.detail];
          const detailMsg = details
            .map((d) => d.msg || d.message || JSON.stringify(d))
            .join("; ");
          userMessage = `Video generation failed: ${detailMsg}`;
        } else if (
          rawData &&
          JSON.stringify(rawData).includes("content_policy_violation")
        ) {
          userMessage =
            "Your video request could not be processed due to content safety guidelines. Please modify your prompt or references.";
        }
      } else if (error.message) {
        userMessage = error.message;
      }

      return res.status(statusCode).json({
        success: false,
        error: userMessage,
      });
    }
  },
);

// =========================================================================
// STEP INTO HISTORY 4-STAGE PIPELINE ROUTE

// Stage 1: Collect user input
// Stage 2: Get Image Prompt from Claude Sonnet 5
// Stage 3: Generate 3 Reference Images in Parallel (GPT Image 2, Meta Muse, Seedream 5 Pro)
// Stage 4: Generate Video via Veo 3.1 Fast using the 3 references + short fixed VIDEO REQUEST prompt
// =========================================================================
router.post(
  "/step-into-history-video",
  upload.any(),
  protect,
  aiGenerationLimiter,
  async (req, res) => {
    const axios = require("axios");
    req.setTimeout(600000); // 10 minute timeout

    const {
      historicalContext,
      experience,
      role,
      style,
      sceneDescription,
      aspectRatio = "16:9",
      duration = "8",
      totalDuration,
      includeAudio = "no",
      imageUrl: directImageUrl,
    } = req.body;

    const files = req.files || [];

    // Content Moderation: Protected Sacred Figures Policy Check across all user inputs
    const sacredCheck = checkSacredFiguresPolicy([
      historicalContext,
      experience,
      role,
      style,
      sceneDescription,
    ]);
    if (sacredCheck.blocked) {
      return res.status(400).json({
        success: false,
        error: sacredCheck.message,
      });
    }

    try {
      // 1. Fetch user & validate subscription/credits
      const user = await User.findById(req.user.id);
      if (!user) {
        return res.status(404).json({ success: false, error: "User not found" });
      }

      const superAdminEmails = [
        "kamarahabib@gmail.com",
        "dhavalnasit3@gmail.com",
      ];
      const isSuperAdmin =
        user.email && superAdminEmails.includes(user.email.toLowerCase());

      if (
        !isSuperAdmin &&
        (user.plan === "basic" ||
          user.plan === "standard" ||
          user.plan === "lite")
      ) {
        return res.status(403).json({
          success: false,
          error:
            "Basic and Free users cannot generate videos. Please upgrade to a Pro or Pro Max plan.",
        });
      }

      if (!isSuperAdmin && user.subscription_status === "trialing") {
        return res.status(403).json({
          success: false,
          error:
            "Video generation is not available during the free trial. Please wait for your trial to end and your subscription to become active.",
        });
      }

      const requestedSec = parseInt(duration) || 8;
      const creditCost = requestedSec * 9;

      if (!isSuperAdmin && (user.video_credits || 0) < creditCost) {
        return res.status(402).json({
          success: false,
          error: `Insufficient video credits. This video requires ${creditCost} credits, but you only have ${user.video_credits || 0}.`,
        });
      }

      // -------------------------------------------------------------
      // STAGE 1: Collect & Normalize Input (Resolve User Image URL / Data URI)
      // -------------------------------------------------------------
      let userImageUrl = directImageUrl;

      if (!userImageUrl && files.length > 0) {
        const primaryFile = files[0];
        const mimetype = primaryFile.mimetype || "image/png";
        userImageUrl = `data:${mimetype};base64,${primaryFile.buffer.toString("base64")}`;
        console.log(`[StepIntoHistory] User image converted to Base64 data URI in RAM (${primaryFile.buffer.length} bytes, type: ${mimetype})`);
      }

      if (!userImageUrl) {
        return res.status(400).json({
          success: false,
          error: "Please upload a clear photo of yourself for Step Into History.",
        });
      }

      console.log("[StepIntoHistory] User image ready (starts with):", userImageUrl.substring(0, 50) + "...");

      // Normalize Aspect Ratio (One Source of Truth)
      let formattedAspect = "16:9";
      if (aspectRatio === "9:16" || aspectRatio === "portrait") {
        formattedAspect = "9:16";
      } else if (aspectRatio === "1:1") {
        formattedAspect = "1:1";
      }
      const isVertical = formattedAspect === "9:16";
      const aspectDescription = isVertical
        ? "Vertical (9:16 portrait orientation). The composition should work naturally in a tall frame, with the protagonist clearly visible and enough historical environment around the person."
        : "Horizontal (16:9 landscape orientation). The composition should use the wider frame to show more of the rich historical environment while keeping the protagonist clear and recognizable.";

      // -------------------------------------------------------------
      // STAGE 2: Get Image Prompt from Claude Sonnet 5
      // -------------------------------------------------------------
      console.log(`[StepIntoHistory - Stage 2] Requesting image prompt from Claude Sonnet 5 with Aspect Ratio: ${formattedAspect}...`);
      const claudeProvider = await AIProvider.findOne({
        name: "anthropic",
        is_active: true,
      }).select("+api_key");

      if (!claudeProvider || !claudeProvider.api_key) {
        throw new Error("Anthropic AI provider is not configured or active.");
      }

      const systemPrompt = `You are the image-prompt writer for OneChat AI's Step Into History video tools.

Write ONE detailed image-edit prompt using the request below.

REQUIREMENTS
1. Identity preservation is the highest priority. Keep the exact same recognizable person: sharp clear face, facial structure, skin tone, hairstyle, facial expressions, approximate age, body type, and overall likeness.
2. Frame the subject in a cinematic MEDIUM SHOT (waist-up / chest-up portrait) with the protagonist prominently featured and in razor-sharp focus in the foreground, showing the rich, populated historical background behind them. Avoid tiny distant full-body framing. Compose the scene specifically for the target aspect ratio and orientation.
3. Transform modern clothing and accessories into historically accurate and detailed clothing for the selected role and period.
4. Remove modern clothing, technology, logos, watches, and modern objects unless specifically required.
5. Create a complete, populated, believable living historical environment behind and around the protagonist.
6. Use Experience and Role to decide what the person is doing in the still image.
7. Use Style for lighting, mood, composition, and visual treatment.
8. Make the result photorealistic, cinematic, and sharply focused.
9. If Scene Description is blank, create an appropriate scene automatically.
10. Do NOT include video duration, camera movement over time, audio, temporal consistency, or detailed motion instructions.
11. Do NOT create a character sheet, collage, prop sheet, location sheet, or multiple versions of the person.
12. Output ONLY the final image-generation prompt.`;

      const userClaudePrompt = `HISTORICAL REQUEST
- Target Aspect Ratio = ${formattedAspect} (${aspectDescription})
- Historical Context = ${historicalContext || "Historical Era"}
- Experience = ${experience || "Explore the City"}
- Role = ${role || "Traveler / Visitor"}
- Style = ${style || "Historically Realistic"}
- Scene Description = ${sceneDescription || "blank"}

The image model will also receive ONE uploaded photo as the identity reference. Compose the scene specifically for a ${formattedAspect} frame.`;

      const claudeRes = await axios.post(
        `${claudeProvider.base_url || "https://api.anthropic.com"}/v1/messages`,
        {
          model: "claude-sonnet-5",
          max_tokens: 1500,
          system: systemPrompt,
          messages: [{ role: "user", content: userClaudePrompt }],
        },
        {
          headers: {
            "x-api-key": claudeProvider.api_key,
            "Content-Type": "application/json",
            "anthropic-version": "2023-06-01",
          },
          timeout: 60000,
        }
      );

      const stage2ImagePrompt = (claudeRes.data?.content?.[0]?.text || "").trim();
      if (!stage2ImagePrompt) {
        throw new Error("Claude Sonnet 5 failed to generate the historical image prompt.");
      }

      // Layer D: Post-Prompt Defense - Check the Claude-generated prompt before calling paid image models
      const postPromptSacredCheck = checkSacredFiguresPolicy([stage2ImagePrompt]);
      if (postPromptSacredCheck.blocked) {
        return res.status(400).json({
          success: false,
          error: postPromptSacredCheck.message,
        });
      }
      console.log("[StepIntoHistory - Stage 2] Claude image prompt:\n", stage2ImagePrompt);

      // -------------------------------------------------------------
      // STAGE 3: Generate 3 Reference Images in Parallel (Fal.ai)
      // -------------------------------------------------------------
      console.log(`[StepIntoHistory - Stage 3] Generating 3 reference images in parallel via Fal.ai with Aspect Ratio: ${formattedAspect}...`);

      const gptKey = (process.env.FAL_KEY_GPT_IMAGE_2 || "").replace(/['"]/g, "").trim();
      const museKey = (process.env.FAL_KEY_META_MUSE || "").replace(/['"]/g, "").trim();
      const seedreamKey = (process.env.FAL_KEY_SEEDREAM_5_PRO || "").replace(/['"]/g, "").trim();

      const pollFalQueue = async (statusUrl, responseUrl, apiKey, label) => {
        let consecutive500Count = 0;
        for (let attempt = 0; attempt < 60; attempt++) {
          await new Promise((resolve) => setTimeout(resolve, 4000));
          try {
            const check = await axios.get(statusUrl, {
              headers: { Authorization: `Key ${apiKey}` },
              timeout: 25000,
            });
            consecutive500Count = 0;
            if (check.data?.status === "COMPLETED") {
              const resCheck = await axios.get(responseUrl, {
                headers: { Authorization: `Key ${apiKey}` },
                timeout: 25000,
              });
              return resCheck.data;
            } else if (check.data?.status === "FAILED") {
              console.error(`[StepIntoHistory - Stage 3] ${label} Failed:`, check.data?.error);
              return null;
            }
          } catch (e) {
            console.warn(`[StepIntoHistory - Stage 3] ${label} polling check warning:`, e.message);
            if (e.response?.status === 500) {
              consecutive500Count++;
              if (consecutive500Count >= 3) {
                console.error(`[StepIntoHistory - Stage 3] ${label} received 3 consecutive 500 errors from Fal.ai. Aborting early to avoid delay.`);
                return null;
              }
            }
          }
        }
        return null;
      };

      // Model size configurations for Fal.ai models
      const falImageSize = isVertical ? "portrait_16_9" : "landscape_16_9";

      // 1. GPT Image 2 (Medium Quality)
      const gptUrl = process.env.FAL_URL_GPT_IMAGE_2 || "https://queue.fal.run/openai/gpt-image-2/edit";
      const gptPromise = (async () => {
        try {
          const res = await axios.post(
            gptUrl,
            {
              prompt: stage2ImagePrompt,
              image_urls: [userImageUrl],
              quality: "medium",
              aspect_ratio: formattedAspect,
              image_size: falImageSize,
            },
            { headers: { Authorization: `Key ${gptKey}`, "Content-Type": "application/json" }, timeout: 45000 }
          );
          if (!res.data?.status_url) {
            return res.data?.images?.[0]?.url || res.data?.image?.url || null;
          }
          const result = await pollFalQueue(res.data.status_url, res.data.response_url, gptKey, "GPT Image 2");
          return result?.images?.[0]?.url || result?.image?.url || null;
        } catch (err) {
          console.error("[StepIntoHistory - Stage 3] GPT Image 2 error:", err?.response?.data || err.message);
          return null;
        }
      })();

      // 2. Meta Muse
      const museUrl = process.env.FAL_URL_META_MUSE || "https://queue.fal.run/fal-ai/muse-image/edit";
      const musePromise = (async () => {
        try {
          const res = await axios.post(
            museUrl,
            {
              prompt: stage2ImagePrompt,
              image_urls: [userImageUrl],
              aspect_ratio: formattedAspect,
              image_size: falImageSize,
            },
            { headers: { Authorization: `Key ${museKey}`, "Content-Type": "application/json" }, timeout: 45000 }
          );
          if (!res.data?.status_url) {
            return res.data?.images?.[0]?.url || res.data?.image?.url || null;
          }
          const result = await pollFalQueue(res.data.status_url, res.data.response_url, museKey, "Meta Muse");
          return result?.images?.[0]?.url || result?.image?.url || null;
        } catch (err) {
          console.error("[StepIntoHistory - Stage 3] Meta Muse error:", err?.response?.data || err.message);
          return null;
        }
      })();

      // 3. Seedream 5 Pro Edit
      const seedreamUrl = process.env.FAL_URL_SEEDREAM_5_PRO || "https://queue.fal.run/bytedance/seedream/v5/pro/edit";
      const seedreamPromise = (async () => {
        try {
          const res = await axios.post(
            seedreamUrl,
            {
              prompt: stage2ImagePrompt,
              image_urls: [userImageUrl],
              aspect_ratio: formattedAspect,
              image_size: falImageSize,
            },
            { headers: { Authorization: `Key ${seedreamKey}`, "Content-Type": "application/json" }, timeout: 45000 }
          );
          if (!res.data?.status_url) {
            return res.data?.images?.[0]?.url || res.data?.image?.url || null;
          }
          const result = await pollFalQueue(res.data.status_url, res.data.response_url, seedreamKey, "Seedream 5 Pro");
          return result?.images?.[0]?.url || result?.image?.url || null;
        } catch (err) {
          console.error("[StepIntoHistory - Stage 3] Seedream 5 Pro error:", err?.response?.data || err.message);
          return null;
        }
      })();

      const stage3Results = await Promise.allSettled([gptPromise, musePromise, seedreamPromise]);
      const successfulReferenceImages = [];
      const modelLabels = ["GPT Image 2", "Meta Muse", "Seedream 5 Pro"];

      stage3Results.forEach((r, idx) => {
        if (r.status === "fulfilled" && r.value) {
          console.log(`[StepIntoHistory - Stage 3] ${modelLabels[idx]} returned: ${r.value}`);
          successfulReferenceImages.push(r.value);
        }
      });

      if (successfulReferenceImages.length === 0) {
        throw new Error("Failed to generate historical reference images. Please try with a different photo.");
      }

      console.log(`[StepIntoHistory - Stage 3] Total reference images obtained: ${successfulReferenceImages.length}`);

      const shouldGenerateAudio =
        includeAudio === "yes" ||
        includeAudio === "true" ||
        includeAudio === true;

      const audioInstruction = shouldGenerateAudio
        ? "Immersive authentic historical ambient environmental soundscapes."
        : "";

      const sceneDesc = sceneDescription && sceneDescription.trim().length > 0 ? sceneDescription.trim() : "None";
      const stage4VideoPrompt = `VIDEO REQUEST

- Experience = ${experience || "Explore an Ancient Historical City"}
- Role = ${role || "Traveler / Visitor"}
- Style = ${style || "Historically Realistic"}
- Scene Description = ${sceneDesc}

VIDEO INSTRUCTION

Use the supplied reference images to bring the requested historical experience to life.

The same person shown in the reference images is experiencing the selected Experience as the selected Role. Follow the selected Style for the overall feeling and presentation. If a Scene Description is provided, incorporate it naturally into the video.

Preserve the person's recognizable identity, sharp facial details, historical clothing, and overall appearance from the supplied reference images. Preserve the historical environment established in the references and make it feel like a real, populated, living historical world.

Create smooth, natural, realistic movement and expressions appropriate to the Experience and Role. Maintain steady cinematic camera framing focused on the protagonist without jitter or facial warping. Keep the person's face consistent, sharp, and recognizable throughout.
${audioInstruction ? `\n${audioInstruction}\n` : ""}
Photorealistic, cinematic, sharp facial detail, natural human motion, realistic environmental movement, one coherent scene, one protagonist, no modern elements.`;

      // Google Veo 3.1 API Reference Images Specification:
      // When referenceImages is used, Google Veo strictly requires durationSeconds: 8.
      // (4s and 6s with referenceImages trigger 'Your use case is currently not supported').
      let durationSec = 8;
      const requestedDurationNumber = requestedSec;

      const totalDurationSec = parseInt(totalDuration) || durationSec;
      const googleVeoKey =
        totalDurationSec > 8
          ? process.env.GOOGLE_VEO_EXTEND_API_KEY
          : process.env.GOOGLE_VEO_BASE_API_KEY;

      let videoBuffer = null;
      let responseContentType = "video/mp4";
      let googleVideoCleanUri = null;

      // -------------------------------------------------------------
      // STAGE 4: Generate Video via Google Native Veo 3.1 Fast (Strictly Native Google API)
      // -------------------------------------------------------------
      if (!googleVeoKey) {
        throw new Error("Google Veo API Key is not configured on the server.");
      }

      console.log(`[StepIntoHistory - Stage 4] Calling Google Native Veo 3.1 Fast with ${durationSec}s and ${successfulReferenceImages.length} reference images (Total requested: ${totalDurationSec}s)`);
      
      // Download all reference images generated in Stage 3 (up to 3 images)
      const downloadedImages = await Promise.all(
        successfulReferenceImages.slice(0, 3).map(async (imgUrl, i) => {
          try {
            const dl = await axios.get(imgUrl, { responseType: "arraybuffer", timeout: 30000 });
            return {
              bytesBase64Encoded: Buffer.from(dl.data).toString("base64"),
              mimeType: dl.headers["content-type"] || "image/png",
            };
          } catch (e) {
            console.error(`[StepIntoHistory - Stage 4] Failed to download reference image ${i}:`, e.message);
            return null;
          }
        })
      );

      const validDownloadedImages = downloadedImages.filter((img) => img !== null);
      if (validDownloadedImages.length === 0) {
        throw new Error("Failed to process reference images for Veo video generation.");
      }

      const googleBaseEndpoint = process.env.GOOGLE_VEO_BASE_ENDPOINT || "https://generativelanguage.googleapis.com/v1beta/models/veo-3.1-fast-generate-preview:predictLongRunning";
      const googleEndpoint = `${googleBaseEndpoint}?key=${googleVeoKey}`;

      const referenceImagesPayload = validDownloadedImages.map((img) => ({
  image: {
    bytesBase64Encoded: img.bytesBase64Encoded,
    mimeType: img.mimeType,
  },
  referenceType: "asset",
}));

      const instanceObj = {
        prompt: stage4VideoPrompt,
        referenceImages: referenceImagesPayload,
      };

      const instances = [instanceObj];

      const parameters = {
        aspectRatio: formattedAspect,
        durationSeconds: durationSec,
      };

      console.log(`[StepIntoHistory - Stage 4] Sending payload with ${referenceImagesPayload.length} reference images, aspectRatio: ${formattedAspect}, duration: ${durationSec}s`);

      const initRes = await axios.post(
        googleEndpoint,
        { instances, parameters },
        {
          headers: {
            "Content-Type": "application/json",
            "x-goog-api-key": googleVeoKey,
          },
          timeout: 60000,
        }
      );

      const opName = initRes.data?.name;
      if (!opName) {
        throw new Error("Google Veo did not return a valid operation name.");
      }

      console.log(`[StepIntoHistory - Stage 4] Google Veo operation created: ${opName}. Polling for completion...`);

      for (let attempt = 0; attempt < 120; attempt++) {
        await new Promise((resolve) => setTimeout(resolve, 5000));
        const pollUrl = `https://generativelanguage.googleapis.com/v1beta/${opName}?key=${googleVeoKey}`;
        let opCheck = null;
        try {
          opCheck = await axios.get(pollUrl, {
            headers: { "x-goog-api-key": googleVeoKey },
            timeout: 30000,
          });
        } catch (pollErr) {
          console.warn(`[StepIntoHistory - Stage 4] Polling attempt ${attempt + 1} transient error:`, pollErr.message);
          continue;
        }

        if (opCheck && opCheck.data?.done) {
          if (opCheck.data?.error) {
            throw new Error(`Google Veo Error: ${opCheck.data.error.message || JSON.stringify(opCheck.data.error)}`);
          }

          const resp = opCheck.data?.response;
          if (resp?.generateVideoResponse?.raiMediaFilteredReasons?.length > 0) {
            const reasons = resp.generateVideoResponse.raiMediaFilteredReasons.join(" ");
            throw new Error(reasons);
          }

          const generatedSamples = resp?.generateVideoResponse?.generatedSamples || resp?.generatedSamples || [];
          const targetVideo = generatedSamples[0]?.video || resp?.video || resp?.generatedSamples?.[0]?.video;

          if (targetVideo?.uri) {
            const dlRes = await axios.get(targetVideo.uri, {
              headers: { "x-goog-api-key": googleVeoKey },
              responseType: "arraybuffer",
              timeout: 60000,
            });
            videoBuffer = Buffer.from(dlRes.data);
            // Google Veo Extension API requires the full download URI:
            googleVideoCleanUri = targetVideo.uri;
            console.log(`[StepIntoHistory - Stage 4] Google Veo video downloaded successfully (${videoBuffer.length} bytes)`);
            break;
          } else if (targetVideo?.bytesBase64Encoded) {
            videoBuffer = Buffer.from(targetVideo.bytesBase64Encoded, "base64");
            responseContentType = "video/mp4";
            console.log(`[StepIntoHistory - Stage 4] Google Veo video base64 extracted (${videoBuffer.length} bytes)`);
            break;
          } else {
            console.warn("[StepIntoHistory - Stage 4] Operation done but unexpected response shape:", JSON.stringify(opCheck.data));
          }
        }
      }

      if (!videoBuffer) {
        throw new Error("Google Veo video generation timed out or returned empty video.");
      }

      // Deduct credits (bypassed for super admin testing)
      let updatedUser = null;
      if (!isSuperAdmin) {
        updatedUser = await User.findByIdAndUpdate(
          req.user.id,
          { $inc: { video_credits: -creditCost } },
          { new: true }
        );
      } else {
        updatedUser = await User.findById(req.user.id);
      }

      res.set("Content-Type", responseContentType);
      if (updatedUser) {
        res.set("x-remaining-credits", String(updatedUser.video_credits ?? 0));
      }
      if (googleVideoCleanUri) {
        res.set("x-google-video-uri", googleVideoCleanUri);
      }
      res.set(
        "Access-Control-Expose-Headers",
        "x-google-video-uri, x-remaining-credits"
      );

      console.log(`[StepIntoHistory] Success! Video generated (${videoBuffer.length} bytes), Remaining credits: ${updatedUser?.video_credits}, Google URI: ${googleVideoCleanUri}`);
      return res.send(videoBuffer);
    } catch (err) {
      console.error("[StepIntoHistory Error]:", err?.response?.data || err.message);
      const statusCode = err?.response?.status || 500;
      let userMessage = err?.message || "Failed to process Step Into History video.";
      if (err?.response?.data?.error?.message) {
        userMessage = err.response.data.error.message;
      }
      return res.status(statusCode).json({ success: false, error: userMessage });
    }
  }
);

module.exports = router;

