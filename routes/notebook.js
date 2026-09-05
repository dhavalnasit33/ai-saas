const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const axios = require('axios');
const multer = require('multer');
const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');
const xlsx = require('xlsx');
const pdfjs = require('pdfjs-dist/legacy/build/pdf.js');
const { createCanvas } = require('canvas');
const sharp = require('sharp');

// Helper: Rasterize PDF pages to JPEG Data URLs for DeepSeek Vision
async function rasterizePdfToImages(buffer, maxPages = 3) {
  try {
    const loadingTask = pdfjs.getDocument({ data: new Uint8Array(buffer) });
    const doc = await loadingTask.promise;
    const numPages = Math.min(doc.numPages, maxPages);
    const images = [];
    for (let i = 1; i <= numPages; i++) {
      const page = await doc.getPage(i);
      const viewport = page.getViewport({ scale: 1.0 }); // Standard scale
      const canvas = createCanvas(viewport.width, viewport.height);
      const ctx = canvas.getContext('2d');
      await page.render({ canvasContext: ctx, viewport: viewport }).promise;
      const rawBuf = canvas.toBuffer('image/jpeg', { quality: 0.65 });
      // Compress with sharp to max 1024px width/height and quality 60
      const compressed = await sharp(rawBuf)
        .resize({ width: 1024, height: 1024, fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: 65 })
        .toBuffer();
      images.push('data:image/jpeg;base64,' + compressed.toString('base64'));
    }
    return images;
  } catch (err) {
    console.error('PDF rasterization error:', err.message);
    return [];
  }
}

const Notebook = require('../models/Notebook');
const NotebookChat = require('../models/NotebookChat');
const NotebookTelemetry = require('../models/NotebookTelemetry');
const { protect } = require('../middleware/auth');

// Multer in-memory storage for document text extraction
const upload = multer({
  limits: { fileSize: 25 * 1024 * 1024 }, // 25MB max
  storage: multer.memoryStorage(),
});

// Model and Limit Configuration
const NOTEBOOK_LLM_MODEL = process.env.NOTEBOOK_LLM_MODEL || 'deepseek-v4-flash-vision-exp';
const MAX_DOCS_PER_NOTEBOOK = 40;  
const MAX_PAGES_PER_DOC = 12;     
const MAX_IMAGES_PER_NOTEBOOK = 50;
const MAX_PASTED_TEXT_SOURCES = 15;
const MAX_WORDS_PER_PASTED_TEXT = 1000;
const MAX_CONTEXT_TOKENS = 128000;
const RESERVED_OUTPUT_TOKENS = 4096;

// Helper: Fast Token Estimator (~4 chars per token)
function estimateTokens(text) {
  if (!text) return 0;
  return Math.ceil(text.length / 4);
}

// Convert XLSX Buffer into a clean markdown table
function parseXlsxBufferToMarkdown(buffer) {
  try {
    const workbook = xlsx.read(buffer, { type: 'buffer' });
    let fullText = '';
    workbook.SheetNames.forEach(sheetName => {
      const sheet = workbook.Sheets[sheetName];
      const jsonData = xlsx.utils.sheet_to_json(sheet, { header: 1 });
      if (jsonData && jsonData.length > 0) {
        fullText += '### Sheet: ' + sheetName + '\n';
        const headers = jsonData[0] || [];
        if (headers.length > 0) {
          fullText += '| ' + headers.map(h => String(h || '').trim()).join(' | ') + ' |\n';
          fullText += '| ' + headers.map(() => '---').join(' | ') + ' |\n';
        }
        for (let r = 1; r < Math.min(jsonData.length, 200); r++) {
          const row = jsonData[r] || [];
          if (row.some(cell => cell !== undefined && cell !== '')) {
            fullText += '| ' + headers.map((_, colIdx) => String(row[colIdx] || '').trim()).join(' | ') + ' |\n';
          }
        }
        fullText += '\n';
      }
    });
    return fullText.trim();
  } catch (err) {
    console.error('Error parsing xlsx buffer:', err);
    return '';
  }
}

// Reusable Middleware: Source Limit Validation
const validateNotebookSourceLimits = async (req, res, next) => {
  try {
    const userId = req.user._id || req.user.id;
    const notebook = await Notebook.findOne({ _id: req.params.id, userId });
    if (!notebook) {
      return res.status(404).json({ success: false, message: 'Notebook not found' });
    }

    const { fileType = 'other', extractedText = '', pageCount = 1 } = req.body;
    const type = fileType;
    const text = extractedText;
    const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0;

    const activeSources = (notebook.sources || []).filter(s => s.status !== 'REMOVED');
    const currentDocs = activeSources.filter(s => ['pdf', 'doc', 'docx', 'txt', 'xlsx', 'other'].includes(s.fileType)).length;
    const currentImages = activeSources.filter(s => s.fileType === 'image').length;
    const currentPasted = activeSources.filter(s => s.fileType === 'pasted_text').length;

    if (type === 'image' && currentImages >= MAX_IMAGES_PER_NOTEBOOK) {
      return res.status(400).json({
        success: false,
        message: 'Maximum ' + MAX_IMAGES_PER_NOTEBOOK + ' images per notebook allowed.',
      });
    }

    if (type === 'pasted_text') {
      if (currentPasted >= MAX_PASTED_TEXT_SOURCES) {
        return res.status(400).json({
          success: false,
          message: 'Maximum ' + MAX_PASTED_TEXT_SOURCES + ' pasted-text sources allowed.',
        });
      }
      if (wordCount > MAX_WORDS_PER_PASTED_TEXT) {
        return res.status(400).json({
          success: false,
          message: 'Pasted text exceeds maximum limit of ' + MAX_WORDS_PER_PASTED_TEXT + ' words.',
        });
      }
    } else if (type !== 'image') {
      if (currentDocs >= MAX_DOCS_PER_NOTEBOOK) {
        return res.status(400).json({
          success: false,
          message: 'Maximum ' + MAX_DOCS_PER_NOTEBOOK + ' document files per notebook allowed.',
        });
      }
      if (pageCount > MAX_PAGES_PER_DOC) {
        return res.status(400).json({
          success: false,
          message: 'Document exceeds maximum limit of ' + MAX_PAGES_PER_DOC + ' pages per document.',
        });
      }
    }

    req.notebook = notebook;
    next();
  } catch (error) {
    console.error('Validation error:', error);
    res.status(500).json({ success: false, message: 'Server validation error' });
  }
};

// 1. Get all notebooks for the authenticated user with optional pagination (Filter out REMOVED sources)
router.get('/', protect, async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const page = parseInt(req.query.page);
    const limit = parseInt(req.query.limit);

    const totalNotebooks = await Notebook.countDocuments({ userId });

    let query = Notebook.find({ userId }).sort({ updatedAt: -1 });
    if (!isNaN(page) && !isNaN(limit) && limit > 0) {
      const skip = (page - 1) * limit;
      query = query.skip(skip).limit(limit);
    }

    const rawNotebooks = await query.lean();
    const notebooks = rawNotebooks.map(nb => ({
      ...nb,
      sources: (nb.sources || []).filter(s => s.status !== 'REMOVED'),
    }));

    const hasMore = (!isNaN(page) && !isNaN(limit)) ? (page * limit < totalNotebooks) : false;

    res.json({
      success: true,
      notebooks,
      totalNotebooks,
      page: page || 1,
      limit: limit || notebooks.length,
      hasMore,
    });
  } catch (error) {
    console.error('Error fetching notebooks:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// 2. Create a new notebook
router.post('/', protect, async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const { title, description } = req.body;
    const notebook = new Notebook({
      userId,
      title: title || 'Untitled Notebook',
      description: description || '',
      sources: [],
      sourceRevision: 'v1',
    });
    await notebook.save();
    res.status(201).json({ success: true, notebook });
  } catch (error) {
    console.error('Error creating notebook:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// 3. Get single notebook with its sources (Filter out REMOVED sources)
router.get('/:id', protect, async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const rawNotebook = await Notebook.findOne({ _id: req.params.id, userId }).lean();
    if (!rawNotebook) {
      return res.status(404).json({ success: false, message: 'Notebook not found' });
    }
    const notebook = {
      ...rawNotebook,
      sources: (rawNotebook.sources || []).filter(s => s.status !== 'REMOVED'),
    };
    res.json({ success: true, notebook });
  } catch (error) {
    console.error('Error fetching notebook:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// 4. Delete notebook & cleanup chats + telemetry
router.delete('/:id', protect, async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    await Notebook.findOneAndDelete({ _id: req.params.id, userId });
    await NotebookChat.deleteMany({ notebookId: req.params.id, userId });
    await NotebookTelemetry.deleteMany({ notebookId: req.params.id, userId });
    res.json({ success: true, message: 'Notebook and associated data deleted' });
  } catch (error) {
    console.error('Error deleting notebook:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// 5. Add source to notebook (Single-pass file extraction, canonicalization & hashing)
router.post('/:id/sources', protect, upload.single('file'), validateNotebookSourceLimits, async (req, res) => {
  try {
    let { name, fileUrl, fileType, extractedText, fileSize, pageCount = 1 } = req.body;
    const notebook = req.notebook;

    // Check if a multipart file was provided for server-side parsing
    if (req.file) {
      name = name || req.file.originalname;
      fileSize = req.file.size;
      const ext = (name.split('.').pop() || '').toLowerCase();

      if (ext === 'pdf') {
        fileType = 'pdf';
        try {
          const pdfData = await pdfParse(req.file.buffer);
          extractedText = (pdfData.text || '').trim();
          pageCount = pdfData.numpages || 1;

          if (pageCount > MAX_PAGES_PER_DOC) {
            return res.status(400).json({
              success: false,
              message: 'Document exceeds maximum limit of ' + MAX_PAGES_PER_DOC + ' pages per document (Uploaded PDF has ' + pageCount + ' pages).',
            });
          }
        } catch (e) {
          console.warn('Standard pdf-parse failed (corrupted or bad XRef table in ' + name + '), falling back to modern pdfjs rasterizer:', e.message);
        }

        // Scanned or non-extractable / corrupted XRef PDF Fallback: Rasterize pages visually
        if (!extractedText) {
          fileType = 'pdf';
          try {
            const renderedImages = await rasterizePdfToImages(req.file.buffer, 3);
            if (renderedImages && renderedImages.length > 0) {
              fileUrl = renderedImages[0];
            } else {
              fileUrl = 'data:image/jpeg;base64,' + req.file.buffer.toString('base64');
            }
          } catch (rErr) {
            fileUrl = 'data:image/jpeg;base64,' + req.file.buffer.toString('base64');
          }
          extractedText = '[PDF Document: ' + name + ' (' + pageCount + ' pages) prepared as visual grounding input]';
        }
      } else if (ext === 'docx' || ext === 'doc') {
        fileType = ext === 'doc' ? 'doc' : 'docx';
        try {
          const docxResult = await mammoth.extractRawText({ buffer: req.file.buffer });
          extractedText = (docxResult.value || '').trim();
        } catch (e) {
          console.warn('DOCX/Mammoth zip parsing failed, attempting fallback text extraction for (' + name + '):', e.message);
          try {
            // Fallback for older .doc (OLE2/Binary) or renamed text documents
            const rawStr = req.file.buffer.toString('utf8');
            // Extract readable ASCII and Unicode characters
            const cleaned = rawStr.replace(/[^\x20-\x7E\t\n\r]/g, ' ')
              .replace(/\s+/g, ' ')
              .trim();
            if (cleaned.length > 20) {
              extractedText = cleaned;
            } else {
              extractedText = '[Document: ' + name + ' uploaded without extractable text]';
            }
          } catch (fbErr) {
            extractedText = '[Document: ' + name + ' uploaded]';
          }
        }
      } else if (ext === 'xlsx' || ext === 'xls') {
        fileType = 'xlsx';
        extractedText = parseXlsxBufferToMarkdown(req.file.buffer);
      } else if (['png', 'jpg', 'jpeg', 'webp', 'gif'].includes(ext)) {
        fileType = 'image';
        try {
          // Downscale and compress image to keep Mongo document well under 16MB limit
          const compressed = await sharp(req.file.buffer)
            .resize({ width: 1024, height: 1024, fit: 'inside', withoutEnlargement: true })
            .jpeg({ quality: 70 })
            .toBuffer();
          fileUrl = 'data:image/jpeg;base64,' + compressed.toString('base64');
        } catch (sErr) {
          console.warn('Sharp compression failed, using original buffer:', sErr.message);
          const mime = (req.file.mimetype && req.file.mimetype.startsWith('image/')) 
            ? req.file.mimetype 
            : (ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' : (ext === 'webp' ? 'image/webp' : 'image/png'));
          fileUrl = 'data:' + mime + ';base64,' + req.file.buffer.toString('base64');
        }
      } else if (ext === 'txt') {
        fileType = 'txt';
        extractedText = req.file.buffer.toString('utf8');
      }
    }

    const type = fileType || 'other';
    const rawContent = (extractedText || '').trim();
    // Normalize content into stable canonical string
    const canonicalContent = rawContent.replace(/\r\n/g, '\n');
    const wordCount = canonicalContent ? canonicalContent.split(/\s+/).length : 0;
    // For images DeepSeek Vision uses ~1,200 vision input tokens per image, for text compute character-based tokens
    const tokenCount = type === 'image' ? 1200 : estimateTokens(canonicalContent);
    const contentHash = crypto.createHash('sha256').update(canonicalContent || fileUrl || name).digest('hex');

    const newSource = {
      name: name || 'Untitled Source',
      fileUrl: fileUrl || '',
      fileType: type,
      canonicalContent: canonicalContent,
      extractedText: canonicalContent,
      fileSize: fileSize || 0,
      pageCount: pageCount || 1,
      wordCount: wordCount,
      tokenCount: tokenCount,
      contentHash: contentHash,
      processingVersion: 'v1.0.0',
      status: 'READY',
    };

    notebook.sources.push(newSource);
    notebook.sourceRevision = 'rev_' + Date.now();
    notebook.updatedAt = new Date();
    await notebook.save();

    const createdSource = notebook.sources[notebook.sources.length - 1];
    res.status(201).json({ success: true, source: createdSource });
  } catch (error) {
    console.error('Error adding source:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// 6. Soft-delete / Remove source from notebook
router.delete('/:id/sources/:sourceId', protect, async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const notebook = await Notebook.findOne({ _id: req.params.id, userId });
    if (!notebook) {
      return res.status(404).json({ success: false, message: 'Notebook not found' });
    }

    const source = notebook.sources.id(req.params.sourceId);
    if (!source) {
      return res.status(404).json({ success: false, message: 'Source not found' });
    }

    // Hard delete: completely pull source from array to prevent heavy MongoDB document growth
    notebook.sources.pull({ _id: req.params.sourceId });
    notebook.sourceRevision = 'rev_' + Date.now();
    notebook.updatedAt = new Date();
    await notebook.save();

    res.json({ success: true, message: 'Source removed successfully' });
  } catch (error) {
    console.error('Error removing source:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// 7. Get all chats for notebook with Pagination & auto-cleanup
router.get('/:id/chats', protect, async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Clean up empty orphaned chats with 0 messages
    await NotebookChat.deleteMany({
      notebookId: req.params.id,
      userId,
      messages: { $size: 0 },
    });

    const totalChats = await NotebookChat.countDocuments({
      notebookId: req.params.id,
      userId,
      'messages.0': { $exists: true },
    });

    const chats = await NotebookChat.find({
      notebookId: req.params.id,
      userId,
      'messages.0': { $exists: true },
    })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const hasMore = skip + chats.length < totalChats;

    res.json({
      success: true,
      chats,
      page,
      limit,
      totalChats,
      hasMore,
    });
  } catch (error) {
    console.error('Error fetching notebook chats:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// 8. Create a new chat session in notebook
router.post('/:id/chats', protect, async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const { title } = req.body;
    const chat = new NotebookChat({
      notebookId: req.params.id,
      userId,
      title: title || 'New Chat',
      messages: [],
    });
    await chat.save();
    res.status(201).json({ success: true, chat });
  } catch (error) {
    console.error('Error creating chat:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// 9. Resume Chat Session Endpoint with Message Windowing & Pagination
router.get('/:id/chats/:chatId', protect, async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const notebook = await Notebook.findOne({ _id: req.params.id, userId });
    const chat = await NotebookChat.findOne({ _id: req.params.chatId, notebookId: req.params.id, userId });

    if (!notebook || !chat) {
      return res.status(404).json({ success: false, message: 'Notebook or Chat not found' });
    }

    const readySources = (notebook.sources || []).filter(s => s.status === 'READY');
    const allMessages = chat.messages || [];
    const totalMessages = allMessages.length;

    // Optional query param: limit (defaults to all if not specified, but supports recent window)
    const limit = parseInt(req.query.limit);
    const beforeIndex = parseInt(req.query.before); // for older message pagination on scroll-up

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

    const chatData = chat.toObject();
    chatData.messages = slicedMessages;

    res.json({
      success: true,
      chat: chatData,
      totalMessages,
      hasMoreMessages,
      notebookSources: readySources,
      sourceRevision: notebook.sourceRevision,
    });
  } catch (error) {
    console.error('Error resuming chat:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// 10. Send message to AI with DeepSeek Deterministic Prefix & Pre-Flight Token Budgeting
router.post('/:id/chats/:chatId/message', protect, async (req, res) => {
  const startTime = Date.now();
  try {
    const userId = req.user._id || req.user.id;
    const { prompt, imageUrl } = req.body;

    if (!prompt || !prompt.trim()) {
      return res.status(400).json({ success: false, message: 'Prompt cannot be empty.' });
    }

    const notebook = await Notebook.findOne({ _id: req.params.id, userId });
    const chat = await NotebookChat.findOne({ _id: req.params.chatId, notebookId: req.params.id, userId });

    if (!notebook || !chat) {
      return res.status(404).json({ success: false, message: 'Notebook or Chat not found' });
    }

    // 1. Strictly filter only READY sources and sort deterministically by source _id
    const readySources = (notebook.sources || [])
      .filter(s => s.status === 'READY')
      .sort((a, b) => a._id.toString().localeCompare(b._id.toString()));

    // Visual sources include genuine images and scanned PDFs whose visual pages are stored in fileUrl
    const imageSources = readySources.filter(s => s.fileType === 'image' || (s.fileUrl && (s.fileUrl.startsWith('data:image/') || s.fileUrl.startsWith('data:application/pdf'))));
    const textSources = readySources.filter(s => s.fileType !== 'image' && !(s.fileUrl && (s.fileUrl.startsWith('data:image/') || s.fileUrl.startsWith('data:application/pdf')) && (!s.canonicalContent || s.canonicalContent.startsWith('[Scanned / Image-only PDF:'))));

    // 2. Build Deterministic Text Sources Block
    let textSourcesBlock = 'No text sources attached.';
    if (textSources.length > 0) {
      textSourcesBlock = textSources
        .map((s, idx) => '[Source ' + (idx + 1) + ': ' + s.name + ' (' + s.fileType + ') | ID: ' + s._id + ']\n' + (s.canonicalContent || s.extractedText))
        .join('\n\n');
    }

    // 3. Stable System Instructions (Source-First + General Knowledge Behavior)
  const stableSystemInstruction = `
You are a specialized project-aware AI assistant operating inside OneChat Notebook LLM.

CORE PRINCIPLE: Source-First, Not Source-Only.

SOURCE USAGE RULES:
- Notebook sources are important context and should be used whenever they are relevant to the user's question.
- You are NOT limited only to information contained in the Notebook sources.
- You may use your broader general LLM knowledge, reasoning, and understanding when needed to answer the user's question helpfully and completely.
- When Notebook sources directly support an answer, prioritize and ground the answer in those sources.
- When Notebook sources contain only part of the information needed, use the relevant source information first and supplement it with your general knowledge and reasoning.
- When Notebook sources are not relevant to the user's question, answer using your general knowledge and reasoning.
- Do not refuse or unnecessarily limit an answer simply because the requested information is not present in the Notebook sources.

SOURCE VS GENERAL KNOWLEDGE:
- Never claim that information from general knowledge, reasoning, or inference came from the user's Notebook sources.
- Never invent or attribute facts to a Notebook source unless that source actually supports them.
- When the distinction is useful or important for accuracy, clearly indicate which information comes from the Notebook sources and which information comes from general knowledge or reasoning.
- Do not add unnecessary source/general-knowledge disclaimers when they do not materially affect the answer.
- If the sources provide specific facts, numbers, names, dates, or other project information, preserve and prioritize those facts rather than replacing them with assumptions.

SOURCE-ONLY OVERRIDE:
- If the user explicitly asks you to use ONLY the Notebook sources, temporarily restrict your answer strictly to the Notebook sources.
- Examples of source-only requests include:
  - "only use my sources"
  - "answer only based on my notebook data"
  - "do not use external data"
  - "answer only using my uploaded files"
  - "based only on these documents"
  - or similar wording.
- When the user explicitly requests source-only analysis, do NOT supplement the answer with general knowledge, outside information, or unsupported assumptions.
- If the sources do not contain enough information to answer a source-only request, clearly state that the available Notebook sources do not contain enough information.

ANSWERING BEHAVIOR:
- Be helpful, accurate, and honest about the source of information.
- Use Notebook sources as the primary project context whenever they are relevant.
- Combine Notebook information with general knowledge and reasoning when that produces a more complete and useful answer, unless the user explicitly requests source-only analysis.
- If the user asks for an explanation, comparison, recommendation, analysis, brainstorming, or other reasoning task, use the available Notebook context together with your general knowledge when appropriate.
- If the user asks a question completely outside the Notebook content, answer normally using your general LLM knowledge rather than saying that the Notebook does not contain the answer.
- Do not pretend that general knowledge is contained in the Notebook.
- Do not fabricate source content, citations, facts, statistics, or conclusions.
- When information is uncertain or cannot reasonably be determined, say so rather than presenting speculation as fact.

RESPONSE PRIORITY:
1. Follow the user's explicit instructions.
2. Use relevant Notebook sources as the primary project context.
3. When necessary, supplement with general LLM knowledge and reasoning.
4. Provide the most helpful, accurate, and complete answer possible.

The Notebook should behave as a project-aware AI assistant, not simply as a document search interface. Notebook sources should guide the answer, but they should not unnecessarily limit the assistant's ability to explain, reason, analyze, create, or help the user.

--- NOTEBOOK TEXT SOURCES ---
${textSourcesBlock}
--- END NOTEBOOK TEXT SOURCES ---
`;

    // 4. Build Multi-modal Messages following exact Phase 10 sequence:
    // 1. Stable Instructions + Text Sources
    // 2. Stable Visual Sources (Grounding Images)
    // 3. Current Chat History (Preserves cache prefix)
    // 4. Latest User Question
    const payloadMessages = [
      { role: 'system', content: stableSystemInstruction },
    ];

    // If there are Notebook Image Sources, attach them deterministically as a grounding prefix before chat history
    if (imageSources.length > 0) {
      const visualGroundingParts = [
        { type: 'text', text: '--- NOTEBOOK VISUAL SOURCES GROUNDING ---' },
      ];
      imageSources.forEach(img => {
        if (img.fileUrl && (img.fileUrl.startsWith('data:image/') || img.fileUrl.startsWith('data:application/pdf') || img.fileUrl.startsWith('http'))) {
          visualGroundingParts.push({
            type: 'image_url',
            image_url: { url: img.fileUrl },
          });
        }
      });
      payloadMessages.push({ role: 'user', content: visualGroundingParts });
      payloadMessages.push({
        role: 'assistant',
        content: 'I have analyzed and indexed the visual source materials attached to this notebook. I will prioritize them when relevant and combine them with my general knowledge to provide comprehensive answers.',
      });
    }

    // Append full Chat History within token budget (maintains exact cacheable prefix from turn 1)
    const allChatHistory = chat.messages || [];
    allChatHistory.forEach(msg => {
      if (msg.imageUrl) {
        payloadMessages.push({
          role: msg.role,
          content: [
            { type: 'text', text: msg.content },
            { type: 'image_url', image_url: { url: msg.imageUrl } },
          ],
        });
      } else {
        payloadMessages.push({ role: msg.role, content: msg.content });
      }
    });

    // Append Current User Question Turn
    if (imageUrl && imageUrl.startsWith('data:image/')) {
      payloadMessages.push({
        role: 'user',
        content: [
          { type: 'image_url', image_url: { url: imageUrl } },
          { type: 'text', text: prompt },
        ],
      });
    } else {
      payloadMessages.push({ role: 'user', content: prompt });
    }

    // 5. Pre-flight Token Budget Validation across full conversation
    let textOnlyContent = stableSystemInstruction + ' ' + prompt;
    allChatHistory.forEach(msg => {
      textOnlyContent += ' ' + (typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content));
    });
    // DeepSeek Vision calculates ~1,200 tokens per image
    const imageTokenEstimate = (imageSources.length + (imageUrl ? 1 : 0)) * 1200;
    const estimatedTotalPromptTokens = estimateTokens(textOnlyContent) + imageTokenEstimate;

    const maxAllowedInputTokens = MAX_CONTEXT_TOKENS - RESERVED_OUTPUT_TOKENS;
    if (estimatedTotalPromptTokens > maxAllowedInputTokens) {
      return res.status(400).json({
        success: false,
        message: 'Context limit exceeded: Prompt tokens (~' + estimatedTotalPromptTokens + ' + ' + RESERVED_OUTPUT_TOKENS + ' reserved output) exceed maximum allowed context window (' + MAX_CONTEXT_TOKENS + '). Please remove some source files or start a new chat.',
      });
    }

    // Auto-update Chat Title on first message if titled 'New Chat'
    if (chat.messages.length === 0 || chat.title === 'New Chat') {
      const words = prompt.trim().split(/\s+/);
      const generatedTitle = words.slice(0, 5).join(' ') + (words.length > 5 ? '...' : '');
      chat.title = generatedTitle;
    }

    // 6. Invoke DeepSeek API using NOTEBOOK_LLM_MODEL (Supports both SSE Streaming & JSON)
    const isStream = req.query.stream === 'true' || req.body.stream === true;
    const apiKey = process.env.DEEPSEEK_API_KEY || process.env.OPENAI_API_KEY;
    const baseUrl = process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com/v1";

    if (!apiKey || apiKey === "your-deepseek-api-key") {
      return res.status(503).json({
        success: false,
        message: "DeepSeek API key is not configured on the server. Please set DEEPSEEK_API_KEY in environment variables.",
      });
    }

    if (isStream) {
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      let streamedText = '';
      let cacheHitTokens = 0;
      let cacheMissTokens = 0;
      let outputTokens = 0;

      try {
        const aiStreamResponse = await axios.post(
          baseUrl + "/chat/completions",
          {
            model: NOTEBOOK_LLM_MODEL,
            messages: payloadMessages,
            temperature: 0.6,
            stream: true,
            stream_options: { include_usage: true },
          },
          {
            headers: {
              Authorization: "Bearer " + apiKey,
              "Content-Type": "application/json",
            },
            responseType: 'stream',
            timeout: 60000,
          }
        );

        let buffer = '';
        aiStreamResponse.data.on('data', chunk => {
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
                streamedText += delta;
                res.write('data: ' + JSON.stringify({ type: 'delta', text: delta, chatTitle: chat.title }) + '\n\n');
              }
              if (parsed.usage) {
                cacheHitTokens = parsed.usage.prompt_cache_hit_tokens || 0;
                cacheMissTokens = parsed.usage.prompt_cache_miss_tokens || parsed.usage.prompt_tokens || 0;
                outputTokens = parsed.usage.completion_tokens || 0;
              }
            } catch (e) {}
          }
        });

        aiStreamResponse.data.on('end', async () => {
          const totalTokens = cacheHitTokens + cacheMissTokens + outputTokens;
          const latency = Date.now() - startTime;
          const estimatedCost =
            cacheHitTokens * 0.00000014 +
            cacheMissTokens * 0.00000056 +
            outputTokens * 0.00000219;

          if (streamedText.trim()) {
            chat.messages.push({ role: 'user', content: prompt, imageUrl: imageUrl || null, createdAt: new Date() });
            chat.messages.push({ role: 'assistant', content: streamedText, createdAt: new Date() });
            await chat.save();

            const telemetry = new NotebookTelemetry({
              notebookId: notebook._id,
              chatId: chat._id,
              userId,
              model: NOTEBOOK_LLM_MODEL,
              cacheHitTokens,
              cacheMissTokens,
              outputTokens,
              totalTokens,
              latency,
              estimatedCost,
              sourceRevision: notebook.sourceRevision,
            });
            await telemetry.save();
          }

          res.write('data: ' + JSON.stringify({
            type: 'done',
            chatTitle: chat.title,
            telemetry: {
              cacheHitTokens,
              cacheMissTokens,
              outputTokens,
              totalTokens,
              latency,
              estimatedCost,
              cacheHitRate: totalTokens > 0 ? ((cacheHitTokens / (cacheHitTokens + cacheMissTokens || 1)) * 100).toFixed(1) + '%' : '0%',
            },
          }) + '\n\n');
          res.end();
        });

        aiStreamResponse.data.on('error', err => {
          console.error('DeepSeek Stream Error:', err.message);
          res.write('data: ' + JSON.stringify({ type: 'error', message: 'Stream interrupted: ' + err.message }) + '\n\n');
          res.end();
        });
        return;
      } catch (streamErr) {
        console.error('DeepSeek Stream connection error:', streamErr.response?.data || streamErr.message);
        const status = streamErr.response?.status || 502;
        return res.status(status).json({
          success: false,
          message: 'AI Provider Stream Error: ' + (streamErr.message || 'Service error'),
        });
      }
    }

    // Standard Non-Streaming JSON Fallback
    let assistantReply = "";
    let cacheHitTokens = 0;
    let cacheMissTokens = 0;
    let outputTokens = 0;
    let totalTokens = 0;

    try {
      const aiResponse = await axios.post(
        baseUrl + "/chat/completions",
        {
          model: NOTEBOOK_LLM_MODEL,
          messages: payloadMessages,
          temperature: 0.6,
        },
        {
          headers: {
            Authorization: "Bearer " + apiKey,
            "Content-Type": "application/json",
          },
          timeout: 60000,
        }
      );

      assistantReply = aiResponse.data.choices?.[0]?.message?.content || "";

      if (aiResponse.data.usage) {
        const u = aiResponse.data.usage;
        cacheHitTokens = u.prompt_cache_hit_tokens || 0;
        cacheMissTokens = u.prompt_cache_miss_tokens || u.prompt_tokens || 0;
        outputTokens = u.completion_tokens || 0;
        totalTokens = u.total_tokens || (cacheHitTokens + cacheMissTokens + outputTokens);
      }
    } catch (aiErr) {
      console.error("DeepSeek call error:", aiErr.response?.data || aiErr.message);
      const status = aiErr.response?.status || 502;
      const errorDetail = aiErr.response?.data?.error?.message || aiErr.response?.data?.message || aiErr.message || "DeepSeek provider service error";
      return res.status(status).json({
        success: false,
        message: "AI Provider Error: " + errorDetail,
      });
    }

    // 7. Persist user message and assistant reply ONLY on successful provider call
    chat.messages.push({
      role: "user",
      content: prompt,
      imageUrl: imageUrl || null,
      createdAt: new Date(),
    });

    chat.messages.push({
      role: "assistant",
      content: assistantReply,
      createdAt: new Date(),
    });
    await chat.save();

    // 9. Persist Usage & Telemetry
    const latency = Date.now() - startTime;
    const estimatedCost =
      cacheHitTokens * 0.00000014 +
      cacheMissTokens * 0.00000056 +
      outputTokens * 0.00000219;

    const telemetry = new NotebookTelemetry({
      notebookId: notebook._id,
      chatId: chat._id,
      userId,
      model: NOTEBOOK_LLM_MODEL,
      cacheHitTokens,
      cacheMissTokens,
      outputTokens,
      totalTokens,
      latency,
      estimatedCost,
      sourceRevision: notebook.sourceRevision,
    });
    await telemetry.save();

    res.json({
      success: true,
      chatTitle: chat.title,
      message: chat.messages[chat.messages.length - 1],
      telemetry: {
        cacheHitTokens,
        cacheMissTokens,
        outputTokens,
        totalTokens,
        latency,
        estimatedCost,
        cacheHitRate:
          totalTokens > 0
            ? ((cacheHitTokens / (cacheHitTokens + cacheMissTokens || 1)) * 100).toFixed(1) + '%'
            : '0%',
      },
    });
  } catch (error) {
    console.error('Error in chat message endpoint:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// 11. Get Telemetry & Cache Hit Rate Summary
router.get('/:id/telemetry', protect, async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const records = await NotebookTelemetry.find({ notebookId: req.params.id, userId })
      .sort({ createdAt: -1 })
      .limit(50);

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
    console.error('Error fetching telemetry:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// 3b. Update / Rename notebook
router.put('/:id', protect, async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const { title, description } = req.body;
    const notebook = await Notebook.findOne({ _id: req.params.id, userId });
    if (!notebook) {
      return res.status(404).json({ success: false, message: 'Notebook not found' });
    }
    if (title !== undefined) notebook.title = title;
    if (description !== undefined) notebook.description = description;
    notebook.updatedAt = new Date();
    await notebook.save();
    res.json({ success: true, notebook });
  } catch (error) {
    console.error('Error updating notebook:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
