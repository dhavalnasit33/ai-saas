const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const axios = require('axios');
const multer = require('multer');
const pdfParse = require('pdf-parse');
const pdfjs = require('pdfjs-dist/legacy/build/pdf.js');
const { createCanvas } = require('canvas');
const sharp = require('sharp');

const ChatPDF = require('../models/ChatPDF');
const { protect } = require('../middleware/auth');

// Multer in-memory storage (Max 50MB)
const upload = multer({
  limits: { fileSize: 50 * 1024 * 1024 },
  storage: multer.memoryStorage(),
});

// Model & Token Budget Limits
const CHAT_PDF_MODEL = process.env.NOTEBOOK_LLM_MODEL || 'deepseek-v4-flash-vision-exp';
const MAX_PAGES_ALLOWED = 500;
const MAX_CONTEXT_TOKENS = 128000;
const RESERVED_OUTPUT_TOKENS = 4096;

// Helper: Fast Token Estimator (~4 chars per token)
function estimateTokens(text) {
  if (!text) return 0;
  return Math.ceil(text.length / 4);
}

// Helper: Rasterize PDF pages to JPEG Data URLs for DeepSeek Vision fallback (scanned PDFs)
async function rasterizePdfToImages(buffer, maxPages = 5) {
  try {
    const loadingTask = pdfjs.getDocument({
      data: new Uint8Array(buffer),
      disableFontFace: true,
      verbosity: 0,
    });
    const doc = await loadingTask.promise;
    const numPages = Math.min(doc.numPages, maxPages);
    const images = [];
    for (let i = 1; i <= numPages; i++) {
      const page = await doc.getPage(i);
      const viewport = page.getViewport({ scale: 1.5 });
      const canvas = createCanvas(viewport.width, viewport.height);
      const ctx = canvas.getContext('2d');
      await page.render({ canvasContext: ctx, viewport: viewport }).promise;
      const rawBuf = canvas.toBuffer('image/jpeg', { quality: 0.80 });
      const compressed = await sharp(rawBuf)
        .resize({ width: 1200, height: 1200, fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: 80 })
        .toBuffer();
      images.push('data:image/jpeg;base64,' + compressed.toString('base64'));
    }
    return images;
  } catch (err) {
    console.warn('PDF rasterization error:', err.message);
    return [];
  }
}

// 1. Upload & Create New Single-PDF Chat Session (Up to 500 pages)
router.post('/upload-and-create', protect, upload.single('file'), async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    let originalFileName = 'Document.pdf';
    let fileBuffer = null;
    let fileSize = 0;
    let pageCount = 1;
    let extractedText = '';
    let visualImageUrls = [];

    if (req.file) {
      originalFileName = req.file.originalname || 'Document.pdf';
      fileBuffer = req.file.buffer;
      fileSize = req.file.size;
    }

    if (req.body && req.body.extractedText) {
      extractedText = req.body.extractedText.trim();
    }
    if (req.body && req.body.originalFileName && !req.file) {
      originalFileName = req.body.originalFileName;
    }
    if (req.body && req.body.pageCount) {
      pageCount = parseInt(req.body.pageCount) || 1;
    }

    if (fileBuffer) {
      try {
        const parsed = await pdfParse(fileBuffer);
        pageCount = parsed.numpages || pageCount || 1;
        if (!extractedText && parsed.text && parsed.text.trim()) {
          extractedText = parsed.text.trim();
        }
      } catch (parseErr) {
        if (parseErr.message && parseErr.message.includes('Password')) {
          return res.status(400).json({
            success: false,
            message: 'This PDF is password-protected. Please unlock it before uploading.',
          });
        }
        console.warn('pdfParse error, falling back:', parseErr.message);
      }

      if (pageCount > MAX_PAGES_ALLOWED) {
        return res.status(400).json({
          success: false,
          message: `PDF exceeds maximum limit of ${MAX_PAGES_ALLOWED} pages (Uploaded PDF has ${pageCount} pages).`,
        });
      }

      // Visual rasterization fallback if text could not be extracted directly (scanned PDF)
      if (!extractedText) {
        try {
          const renderedImages = await rasterizePdfToImages(fileBuffer, 3);
          if (renderedImages && renderedImages.length > 0) {
            visualImageUrls = renderedImages;
          }
        } catch (rErr) {
          console.warn('Rasterize fallback error:', rErr.message);
        }
        extractedText = `[PDF Document: ${originalFileName} (${pageCount} pages) attached for analysis]`;
      }
    }

    if (!extractedText) {
      if (req.body && req.body.extractedText) {
        extractedText = req.body.extractedText.trim();
      } else {
        extractedText = `[Document: ${originalFileName}]`;
      }
    }

    if (!fileSize) {
      fileSize = Buffer.byteLength(extractedText, 'utf8');
    }

    const wordCount = extractedText.split(/\s+/).filter(Boolean).length;
    const tokenCount = estimateTokens(extractedText);
    const contentHash = crypto.createHash('sha256').update(extractedText).digest('hex');
    const title = originalFileName.replace(/\.pdf$/i, '');

    const chatPdf = new ChatPDF({
      userId,
      title,
      originalFileName,
      fileSize,
      pageCount,
      wordCount,
      tokenCount,
      contentHash,
      extractedText,
      canonicalContent: extractedText,
      visualImageUrls,
      status: 'READY',
      messages: [],
      telemetry: [],
    });

    await chatPdf.save();

    res.status(201).json({
      success: true,
      chatPdf: {
        _id: chatPdf._id,
        id: chatPdf._id,
        title: chatPdf.title,
        originalFileName: chatPdf.originalFileName,
        pageCount: chatPdf.pageCount,
        tokenCount: chatPdf.tokenCount,
        createdAt: chatPdf.createdAt,
      },
    });
  } catch (error) {
    console.error('Error creating ChatPDF:', error);
    res.status(500).json({ success: false, message: 'Server error creating ChatPDF: ' + error.message });
  }
});

// 2. Get Past ChatPDF Chats for Cover Screen (Paginated)
router.get('/chats', protect, async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const totalChats = await ChatPDF.countDocuments({ userId, status: 'READY' });
    const chats = await ChatPDF.find({ userId, status: 'READY' })
      .select('_id title originalFileName pageCount tokenCount wordCount messages createdAt updatedAt')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const formattedChats = chats.map(c => ({
      _id: c._id,
      id: c._id,
      title: c.title,
      originalFileName: c.originalFileName,
      pageCount: c.pageCount,
      tokenCount: c.tokenCount,
      messageCount: c.messages ? c.messages.length : 0,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
    }));

    res.json({
      success: true,
      chats: formattedChats,
      totalChats,
      page,
      hasMore: skip + chats.length < totalChats,
    });
  } catch (error) {
    console.error('Error fetching ChatPDF chats:', error);
    res.status(500).json({ success: false, message: 'Server error fetching chats' });
  }
});

// 3. Get Single Chat Session & Messages (For resuming chat with optional windowing)
router.get('/chats/:id', protect, async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const chatPdf = await ChatPDF.findOne({ _id: req.params.id, userId });

    if (!chatPdf) {
      return res.status(404).json({ success: false, message: 'ChatPDF session not found' });
    }

    const allMessages = chatPdf.messages || [];
    const totalMessages = allMessages.length;
    const limit = parseInt(req.query.limit);
    const beforeIndex = parseInt(req.query.before);

    let slicedMessages = allMessages;
    let hasMoreMessages = false;

    if (limit && !isNaN(limit)) {
      if (!isNaN(beforeIndex) && beforeIndex > 0) {
        const start = Math.max(0, beforeIndex - limit);
        slicedMessages = allMessages.slice(start, beforeIndex);
        hasMoreMessages = start > 0;
      } else {
        const start = Math.max(0, totalMessages - limit);
        slicedMessages = allMessages.slice(start);
        hasMoreMessages = start > 0;
      }
    }

    res.json({
      success: true,
      chatPdf: {
        _id: chatPdf._id,
        id: chatPdf._id,
        title: chatPdf.title,
        originalFileName: chatPdf.originalFileName,
        fileSize: chatPdf.fileSize,
        pageCount: chatPdf.pageCount,
        wordCount: chatPdf.wordCount,
        tokenCount: chatPdf.tokenCount,
        extractedText: chatPdf.extractedText,
        canonicalContent: chatPdf.canonicalContent,
        visualImageUrls: chatPdf.visualImageUrls || [],
        messages: slicedMessages,
        totalMessages,
        hasMoreMessages,
        createdAt: chatPdf.createdAt,
        updatedAt: chatPdf.updatedAt,
      },
    });
  } catch (error) {
    console.error('Error fetching ChatPDF session:', error);
    res.status(500).json({ success: false, message: 'Server error fetching session' });
  }
});

// 4. Update Chat Title / Rename Chat
router.put('/chats/:id', protect, async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const { title } = req.body;
    const chatPdf = await ChatPDF.findOne({ _id: req.params.id, userId });
    if (!chatPdf) {
      return res.status(404).json({ success: false, message: 'ChatPDF session not found' });
    }
    if (title !== undefined && title.trim()) {
      chatPdf.title = title.trim();
    }
    chatPdf.updatedAt = new Date();
    await chatPdf.save();
    res.json({ success: true, chatPdf });
  } catch (error) {
    console.error('Error updating ChatPDF title:', error);
    res.status(500).json({ success: false, message: 'Server error updating title' });
  }
});

// 5. Send Message to ChatPDF (SSE Streaming + DeepSeek Cache Optimization + Token Safeguard)
router.post('/chats/:id/message', protect, async (req, res) => {
  const startTime = Date.now();
  try {
    const userId = req.user._id || req.user.id;
    const { prompt, imageUrl } = req.body;
    const isStream = req.query.stream === 'true' || req.headers.accept?.includes('text/event-stream');

    if (!prompt || !prompt.trim()) {
      return res.status(400).json({ success: false, message: 'Prompt cannot be empty.' });
    }

    const chatPdf = await ChatPDF.findOne({ _id: req.params.id, userId });
    if (!chatPdf) {
      return res.status(404).json({ success: false, message: 'ChatPDF session not found' });
    }

    // 1. Stable System Instruction (Full Source-First, Not Source-Only Pattern matching Notebook LLM)
    const stableSystemInstruction = `You are a specialized AI assistant in OneChat ChatPDF.
You are chatting with the user about their uploaded PDF: "${chatPdf.originalFileName}" (${chatPdf.pageCount} pages).

CORE PRINCIPLE: Source-First, Not Source-Only.

SOURCE USAGE RULES:
- The uploaded PDF is the primary source context and should be used whenever it is relevant to the user's question.
- You are NOT limited only to information contained in the PDF.
- You may use your broader general LLM knowledge, reasoning, and understanding when needed to answer the user's question helpfully and completely.
- When the PDF directly supports an answer, prioritize and ground the answer in the PDF.
- When the PDF contains only part of the information needed, use the relevant PDF information first and supplement it with your general knowledge and reasoning.
- When the PDF is not relevant to the user's question, answer using your general knowledge and reasoning.
- Do not refuse or unnecessarily limit an answer simply because the requested information is not present in the PDF.

SOURCE VS GENERAL KNOWLEDGE:
- Never claim that information from general knowledge, reasoning, or inference came from the uploaded PDF.
- Never invent or attribute facts to the PDF unless the document actually supports them.
- When the distinction is useful or important for accuracy, clearly indicate which information comes from the PDF and which comes from general knowledge or reasoning.
- If the PDF provides specific facts, numbers, names, dates, or other document details, preserve and prioritize those facts.

SOURCE-ONLY OVERRIDE:
- If the user explicitly asks you to use ONLY the PDF (e.g. "only use this PDF", "answer only from PDF", "do not use external data"), temporarily restrict your answer strictly to the PDF.
- When the user explicitly requests source-only analysis, do NOT supplement the answer with general knowledge or outside assumptions.
- If the PDF does not contain enough information to answer a source-only request, clearly state that the PDF does not contain sufficient details.

ANSWERING BEHAVIOR:
- Be helpful, concise, and accurate about the source of information.
- Provide direct and clear answers formatted with clean markdown.
- Do not fabricate content, page references, or citations.`;

    const stableSourceBlock = `--- DOCUMENT CONTENT: ${chatPdf.originalFileName} ---
${chatPdf.canonicalContent || chatPdf.extractedText}
--- END DOCUMENT CONTENT ---`;

    // 2. Deterministic Request Construction (System -> Source -> Visual Scans -> History -> User)
    const messagesPayload = [
      { role: 'system', content: stableSystemInstruction },
      { role: 'system', content: stableSourceBlock },
    ];

    // Visual Grounding Prefix for scanned/rasterized PDFs
    const visualUrls = chatPdf.visualImageUrls || [];
    if (visualUrls.length > 0) {
      const visualGroundingParts = [
        { type: 'text', text: '--- DOCUMENT VISUAL PAGES GROUNDING ---' },
      ];
      visualUrls.forEach(vUrl => {
        if (vUrl && (vUrl.startsWith('data:image/') || vUrl.startsWith('http'))) {
          visualGroundingParts.push({
            type: 'image_url',
            image_url: { url: vUrl },
          });
        }
      });
      messagesPayload.push({ role: 'user', content: visualGroundingParts });
      messagesPayload.push({
        role: 'assistant',
        content: 'I have analyzed and indexed the visual pages of this document. I will prioritize them when relevant to answer your questions.',
      });
    }

    // Append Conversation History (Preserving multi-modal image parts)
    const conversationHistory = chatPdf.messages || [];
    conversationHistory.forEach(m => {
      if (m.imageUrl) {
        messagesPayload.push({
          role: m.role,
          content: [
            { type: 'text', text: m.content },
            { type: 'image_url', image_url: { url: m.imageUrl } },
          ],
        });
      } else {
        messagesPayload.push({ role: m.role, content: m.content });
      }
    });

    // Append Current User Question Turn
    if (imageUrl && imageUrl.startsWith('data:image/')) {
      messagesPayload.push({
        role: 'user',
        content: [
          { type: 'image_url', image_url: { url: imageUrl } },
          { type: 'text', text: prompt.trim() },
        ],
      });
    } else {
      messagesPayload.push({ role: 'user', content: prompt.trim() });
    }

    // 3. Pre-flight Token Budget Safeguards Check
    let allTextForEstimation = stableSystemInstruction + ' ' + (chatPdf.canonicalContent || chatPdf.extractedText) + ' ' + prompt;
    conversationHistory.forEach(m => {
      allTextForEstimation += ' ' + (typeof m.content === 'string' ? m.content : JSON.stringify(m.content));
    });
    const imageTokenEstimate = (visualUrls.length + (imageUrl ? 1 : 0)) * 1200;
    const estimatedTotalPromptTokens = estimateTokens(allTextForEstimation) + imageTokenEstimate;
    const maxAllowedInputTokens = MAX_CONTEXT_TOKENS - RESERVED_OUTPUT_TOKENS;

        // Window document content if oversized to safely fit model context window
    if (estimatedTotalPromptTokens > maxAllowedInputTokens) {
      const maxDocTokensAllowed = Math.max(1000, maxAllowedInputTokens - imageTokenEstimate - 4000);
      const maxChars = maxDocTokensAllowed * 4;
      const originalDoc = chatPdf.canonicalContent || chatPdf.extractedText || '';
      const windowedDoc = originalDoc.slice(0, maxChars) + '\n\n[... Note: Document contains 500 pages. Content is safely windowed to fit within the DeepSeek 128,000 token context window ...]';
      messagesPayload[1] = { role: 'system', content: '--- DOCUMENT CONTENT: ' + chatPdf.originalFileName + ' ---\n' + windowedDoc + '\n--- END DOCUMENT CONTENT ---' };
    }

    // Auto-update Chat Title on first message if default
    if (chatPdf.messages.length === 0 || chatPdf.title === 'New Chat' || chatPdf.title === chatPdf.originalFileName.replace(/\.pdf$/i, '')) {
      const words = prompt.trim().split(/\s+/);
      chatPdf.title = words.slice(0, 6).join(' ') + (words.length > 6 ? '...' : '');
    }

    const apiKey = process.env.DEEPSEEK_API_KEY || process.env.OPENAI_API_KEY;
    const baseUrl = process.env.DEEPSEEK_BASE_URL || process.env.DEEPSEEK_API_BASE_URL || 'https://api.deepseek.com/v1';

    if (!apiKey || apiKey === 'your-deepseek-api-key') {
      return res.status(503).json({
        success: false,
        message: 'DeepSeek API key is not configured on the server. Please set DEEPSEEK_API_KEY in environment variables.',
      });
    }

    // 4. Provider Request Execution (SSE Streaming vs JSON)
    if (isStream) {
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      let deepseekResponse;
      try {
        deepseekResponse = await axios.post(
          `${baseUrl}/chat/completions`,
          {
            model: CHAT_PDF_MODEL,
            messages: messagesPayload,
            stream: true,
            stream_options: { include_usage: true },
            temperature: 0.3,
            max_tokens: RESERVED_OUTPUT_TOKENS,
          },
          {
            headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
            responseType: 'stream',
            timeout: 60000,
          }
        );
      } catch (apiErr) {
        const errorMsg = apiErr.response?.data?.error?.message || apiErr.response?.data?.message || apiErr.message || 'AI Provider Error';
        res.write(`data: ${JSON.stringify({ type: 'error', message: errorMsg })}\n\n`);
        return res.end();
      }

      let fullAssistantText = '';
      let cacheHitTokens = 0;
      let cacheMissTokens = 0;
      let outputTokens = 0;
      let buffer = '';

      deepseekResponse.data.on('data', chunk => {
        buffer += chunk.toString();
        const lines = buffer.split('\n');
        buffer = lines.pop(); // keep partial line

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith('data:')) continue;
          if (trimmed === 'data: [DONE]') {
            res.write('data: [DONE]\n\n');
            continue;
          }

          try {
            const parsed = JSON.parse(trimmed.slice(5).trim());
            const delta = parsed.choices?.[0]?.delta?.content || '';
            if (delta) {
              fullAssistantText += delta;
              res.write(`data: ${JSON.stringify({ type: 'delta', content: delta, chatTitle: chatPdf.title })}\n\n`);
            }
            if (parsed.usage) {
              cacheHitTokens = parsed.usage.prompt_cache_hit_tokens || 0;
              cacheMissTokens = parsed.usage.prompt_cache_miss_tokens || parsed.usage.prompt_tokens || 0;
              outputTokens = parsed.usage.completion_tokens || 0;
            }
          } catch (_) {}
        }
      });

      deepseekResponse.data.on('end', async () => {
        const totalTokens = cacheHitTokens + cacheMissTokens + outputTokens;
        const latency = Date.now() - startTime;
        const estimatedCost =
          cacheHitTokens * 0.00000014 +
          cacheMissTokens * 0.00000056 +
          outputTokens * 0.00000219;

        if (fullAssistantText.trim()) {
          chatPdf.messages.push({ role: 'user', content: prompt.trim(), imageUrl: imageUrl || null, createdAt: new Date() });
          chatPdf.messages.push({ role: 'assistant', content: fullAssistantText, createdAt: new Date() });

          // Persist Telemetry
          chatPdf.telemetry.push({
            model: CHAT_PDF_MODEL,
            cacheHitTokens,
            cacheMissTokens,
            outputTokens,
            totalTokens,
            latency,
            estimatedCost,
          });

          await chatPdf.save();
        }

        res.write(`data: ${JSON.stringify({
          type: 'done',
          chatTitle: chatPdf.title,
          telemetry: {
            cacheHitTokens,
            cacheMissTokens,
            outputTokens,
            totalTokens,
            latency,
            estimatedCost,
            cacheHitRate: (cacheHitTokens + cacheMissTokens > 0)
              ? ((cacheHitTokens / (cacheHitTokens + cacheMissTokens)) * 100).toFixed(1) + '%'
              : '0%',
          },
        })}\n\n`);
        res.end();
      });

      deepseekResponse.data.on('error', err => {
        res.write(`data: ${JSON.stringify({ type: 'error', message: err.message })}\n\n`);
        res.end();
      });
    } else {
      let cacheHitTokens = 0;
      let cacheMissTokens = 0;
      let outputTokens = 0;
      let totalTokens = 0;

      const resp = await axios.post(
        `${baseUrl}/chat/completions`,
        {
          model: CHAT_PDF_MODEL,
          messages: messagesPayload,
          stream: false,
          temperature: 0.3,
          max_tokens: RESERVED_OUTPUT_TOKENS,
        },
        {
          headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
          timeout: 60000,
        }
      );

      const assistantMsg = resp.data?.choices?.[0]?.message?.content || '';

      if (resp.data.usage) {
        const u = resp.data.usage;
        cacheHitTokens = u.prompt_cache_hit_tokens || 0;
        cacheMissTokens = u.prompt_cache_miss_tokens || u.prompt_tokens || 0;
        outputTokens = u.completion_tokens || 0;
        totalTokens = u.total_tokens || (cacheHitTokens + cacheMissTokens + outputTokens);
      }

      const latency = Date.now() - startTime;
      const estimatedCost =
        cacheHitTokens * 0.00000014 +
        cacheMissTokens * 0.00000056 +
        outputTokens * 0.00000219;

      chatPdf.messages.push({ role: 'user', content: prompt.trim(), imageUrl: imageUrl || null, createdAt: new Date() });
      chatPdf.messages.push({ role: 'assistant', content: assistantMsg, createdAt: new Date() });

      chatPdf.telemetry.push({
        model: CHAT_PDF_MODEL,
        cacheHitTokens,
        cacheMissTokens,
        outputTokens,
        totalTokens,
        latency,
        estimatedCost,
      });

      await chatPdf.save();

      res.json({
        success: true,
        chatTitle: chatPdf.title,
        message: {
          role: 'assistant',
          content: assistantMsg,
        },
        telemetry: {
          cacheHitTokens,
          cacheMissTokens,
          outputTokens,
          totalTokens,
          latency,
          estimatedCost,
          cacheHitRate: (cacheHitTokens + cacheMissTokens > 0)
            ? ((cacheHitTokens / (cacheHitTokens + cacheMissTokens)) * 100).toFixed(1) + '%'
            : '0%',
        },
      });
    }
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({ success: false, message: error.message || 'Server error' });
  }
});

// 6. Get Chat Telemetry & Cost Summary
router.get('/chats/:id/telemetry', protect, async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const chatPdf = await ChatPDF.findOne({ _id: req.params.id, userId });

    if (!chatPdf) {
      return res.status(404).json({ success: false, message: 'ChatPDF session not found' });
    }

    const records = (chatPdf.telemetry || []).slice(-50).reverse();
    let totalHit = 0;
    let totalMiss = 0;
    let totalOutput = 0;
    let totalCost = 0;

    records.forEach(r => {
      totalHit += r.cacheHitTokens || 0;
      totalMiss += r.cacheMissTokens || 0;
      totalOutput += r.outputTokens || 0;
      totalCost += r.estimatedCost || 0;
    });

    res.json({
      success: true,
      summary: {
        totalHitTokens: totalHit,
        totalMissTokens: totalMiss,
        totalOutputTokens: totalOutput,
        totalEstimatedCost: totalCost.toFixed(5),
        overallCacheHitRate:
          totalHit + totalMiss > 0
            ? ((totalHit / (totalHit + totalMiss)) * 100).toFixed(1) + '%'
            : '0%',
        requestsCount: records.length,
      },
      records,
    });
  } catch (error) {
    console.error('Error fetching ChatPDF telemetry:', error);
    res.status(500).json({ success: false, message: 'Server error fetching telemetry' });
  }
});

// 7. Delete Chat
router.delete('/chats/:id', protect, async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    await ChatPDF.findOneAndDelete({ _id: req.params.id, userId });
    res.json({ success: true, message: 'Chat deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error deleting chat' });
  }
});

module.exports = router;
