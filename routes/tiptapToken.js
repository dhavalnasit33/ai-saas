const jwt = require("jsonwebtoken");
const { protect } = require("../middleware/auth");
const express = require("express");
const FormData = require("form-data");
const multer = require("multer");
const axios = require("axios");
const upload = multer({ storage: multer.memoryStorage() }); // Store file in memory
const router = express.Router();
// ✅ NEW: Public Save Route (No 'protect' middleware)
// Allows guests to save if they have inherited edit permissions
router.get("/", async (req, res) => {
  let user = null;

  // 1. Try to authenticate manually if a token is present
  if (req.headers.authorization && req.headers.authorization.startsWith("Bearer")) {
    try {
        const token = req.headers.authorization.split(" ")[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET); // Use your actual JWT Secret
        user = { id: decoded.id, name: decoded.name }; // Adjust based on your JWT payload
    } catch (e) {
        console.log("Invalid token, treating as guest");
    }
  }

  // 2. Define User or Guest details
  const userId = user ? user.id : `guest-${Math.random().toString(36).slice(2, 10)}`;
  const userName = user ? user.name : "Anonymous";

  const payload = {
    aud: process.env.TIPTAP_APP_ID,
    iss: "https://cloud.tiptap.dev",
    sub: userId,
    name: userName,
    allowedDocumentNames: ["*"], // Grant access
    exp: Math.floor(Date.now() / 1000) + 60 * 60, 
  };

  const token = jwt.sign(payload, process.env.TIPTAP_JWT_SECRET, {
    algorithm: "HS256",
  });

  res.json({ token });
});

router.post("/convert-docx", upload.single("file"), async (req, res) => {
  console.log("📥 /convert-docx HIT");

  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const now = Math.floor(Date.now() / 1000);

    // 🔐 JWT for Convert API
    const token = jwt.sign(
      {
        iss: "https://cloud.tiptap.dev",
        aud: process.env.TIPTAP_CONVERT_APP_ID,
        iat: now,
        exp: now + 60 * 60,
      },
      process.env.TIPTAP_CONVERT_SECRET,
      { algorithm: "HS256" }
    );

    // 📦 Build multipart body
    const form = new FormData();
    form.append("file", req.file.buffer, req.file.originalname);

    // ✅ IMPORTANT: map DOCX output to YOUR editor schema
    form.append(
      "prosemirrorNodes",
      JSON.stringify({
        paragraph: "paragraph",
        heading: "heading",
        bulletlist: "bulletList",
        orderedlist: "orderedList",
        listitem: "listItem",
        blockquote: "blockquote",
        table: "table",
        tablecell: "tableCell",
        tablerow: "tableRow",
        tableheader: "tableHeader",
        image: "image",
      })
    );

    form.append(
      "prosemirrorMarks",
      JSON.stringify({
        bold: "bold",
        italic: "italic",
        underline: "underline",
        strikethrough: "strike",
        code: "code",
        link: "link",
      })
    );

    // 🔍 Enable full diagnostics
    form.append("verbose", "7"); // log + warn + error

    const response = await axios.post(
      "https://api.tiptap.dev/v2/convert/import",
      form,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "X-App-Id": process.env.TIPTAP_CONVERT_APP_ID,
          ...form.getHeaders(),
        },
      }
    );

    console.log("✅ DOCX converted");
    console.log("⚠️ WARNINGS:", response.data.logs?.warn?.length || 0);

    res.json(response.data);
  } catch (err) {
    console.error("🔥 DOCX CONVERSION FAILED");

    if (err.response) {
      console.error(err.response.data);
    }

    res.status(500).json({ error: "DOCX conversion failed" });
  }
});

router.post("/ai", protect, async (req, res) => {
  try {
    const userId = req.user ? req.user.id : `guest-${Math.random().toString(36).slice(2, 10)}`;
    
    // Tiptap AI requires a JWT signed with your AI Secret
    // Docs: https://tiptap.dev/docs/content-ai/installation
    const token = jwt.sign(
      {
        iss: "https://cloud.tiptap.dev", // Issuer
        sub: userId,                     // Subject (User ID)
        aud: process.env.TIPTAP_AI_APP_ID, // Audience (Your App ID)
      },
      process.env.TIPTAP_AI_SECRET,      // ⚠️ IMPORTANT: Use your AI Secret here
      {
        algorithm: "HS256",
        expiresIn: "1h", // Token expiry
      }
    );

    res.json({ token });
  } catch (error) {
    console.error("🔥 AI Token Generation Failed:", error);
    res.status(500).json({ error: "Failed to generate AI token" });
  }
});

module.exports = router;
