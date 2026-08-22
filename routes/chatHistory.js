const express = require("express");
const ChatHistory = require("../models/ChatHistory");
const ChatService = require("../utils/chatService");
const { protect } = require("../middleware/auth");
const { body, validationResult } = require("express-validator");
const AIProvider = require("../models/AIProvider");
const AIModel = require("../models/AIModel");
const AdminUser = require("../models/AdminUser");
const roleAndPermission = require("../models/roleAndPermission");

const router = express.Router();

// Handle validation errors
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: "Validation failed",
      errors: errors.array(),
    });
  }
  next();
};

// Validation middleware
const validateChatCreation = [
  body("tags").optional().isArray().withMessage("Tags must be an array"),
  body("tags.*")
    .optional()
    .isLength({ max: 50 })
    .withMessage("Each tag cannot exceed 50 characters")
    .trim(),
];

const validateMessageAdd = [
  body("type")
    .isIn(["user", "assistant"])
    .withMessage("Message type must be user or assistant"),
  body("content")
    .isLength({ min: 1, max: 10000 })
    .withMessage("Message content must be between 1 and 10000 characters")
    .trim(),
  body("metadata")
    .optional()
    .isObject()
    .withMessage("Metadata must be an object"),
];

// @desc    Test endpoint to check if routes are working
// @route   GET /api/chat-history/test
// @access  Public
router.get("/test", (req, res) => {
  res.json({
    success: true,
    message: "Chat history routes are working",
    timestamp: new Date().toISOString(),
  });
});

// @desc    Get all chat histories for user
// @route   GET /api/chat-history
// @access  Private
router.get("/", protect, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      archived = false,
      favorite,
      search,
      tags,
      startDate,
      endDate,
      ischatehistry,
      provider,
    } = req.query;
    const userId = req.user?.id || req.guestUser?._id;
    const query = {
      user_id: userId,
      is_archived: archived === "true",
    };

    if (favorite !== undefined) {
      query.is_favorite = favorite === "true";
    }
    if (provider) {
      query["messages.metadata.api_used"] = provider;
    }
    if (ischatehistry !== undefined) {
      query.ischatehistry = ischatehistry === "true";
    }

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: "i" } },
        { "messages.content": { $regex: search, $options: "i" } },
      ];
    }

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) {
        query.createdAt.$gte = new Date(startDate);
      }
      if (endDate) {
        query.createdAt.$lte = new Date(endDate);
      }
      if (Object.keys(query.createdAt).length === 0) {
        delete query.createdAt;
      }
    }

    if (tags) {
      const tagArray = Array.isArray(tags) ? tags : [tags];
      query.tags = { $in: tagArray };
    }

    const chats = await ChatHistory.find(query)
      .select(
        "title total_messages total_tokens_used last_activity is_favorite tags createdAt messages ischatehistry job_id subtab",
      )
      .populate("user_id", "name email")
      .sort({ last_activity: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .lean();

    const apiModelSet = new Set();
    chats.forEach((chat) => {
      const assistantMessages = (chat.messages || []).filter(
        (msg) => msg.type === "assistant",
      );
      const lastAssistant = assistantMessages[assistantMessages.length - 1];
      if (
        lastAssistant?.metadata?.api_used &&
        lastAssistant?.metadata?.model_used
      ) {
        apiModelSet.add(
          `${lastAssistant.metadata.api_used}|||${lastAssistant.metadata.model_used}`,
        );
      }
    });

    const apiModelMap = {};

    for (const combo of apiModelSet) {
      const [api_used, model_used] = combo.split("|||");

      const provider = await AIProvider.findOne({ name: api_used }).lean();
      if (!provider) continue;

      const model = await AIModel.findOne({
        ai_provider_id: provider._id,
        model: model_used,
      }).lean();

      if (model) {
        apiModelMap[combo] = model._id;
      }
    }

    // Final formatting
    const processedChats = chats.map((chat) => {
      const assistantMessages = (chat.messages || []).filter(
        (msg) => msg.type === "assistant",
      );

      // Group answers by model
      const modelResponses = {};

      assistantMessages.forEach((msg) => {
        const api = msg.metadata?.api_used || "unknown";
        const model = msg.metadata?.model_used || "unknown";
        const key = `${api}|||${model}`;

        if (!modelResponses[key]) {
          modelResponses[key] = {
            api_used: api,
            model_used: model,
            answers: [],
          };
        }

        modelResponses[key].answers = [];
      });

      const modelEntries = Object.values(modelResponses);
      // const is_double = modelEntries.length > 1;
      const is_double = (() => {
        const msgs = chat.messages || [];
        for (let i = 0; i < msgs.length - 1; i++) {
          if (
            msgs[i].type === "assistant" &&
            msgs[i + 1].type === "assistant" &&
            (msgs[i].metadata?.api_used !== msgs[i + 1].metadata?.api_used ||
              msgs[i].metadata?.model_used !== msgs[i + 1].metadata?.model_used)
          ) {
            return true;
          }
        }
        return false;
      })();

      // For consistency, try to extract model_id for the **last assistant message**
      const lastAssistant = assistantMessages[assistantMessages.length - 1];
      const last_api_used = lastAssistant?.metadata?.api_used || null;
      const last_model_used = lastAssistant?.metadata?.model_used || null;
      const last_key =
        last_api_used && last_model_used
          ? `${last_api_used}|||${last_model_used}`
          : null;
      const model_id =
        last_key && apiModelMap[last_key] ? apiModelMap[last_key] : null;

      return {
        _id: chat._id,
        title: chat.title,
        total_messages: chat.total_messages,
        total_tokens_used: chat.total_tokens_used,
        last_activity: chat.last_activity,
        is_favorite: chat.is_favorite,
        tags: chat.tags,
        ischatehistry: chat.ischatehistry,
        createdAt: chat.createdAt,
        user_id: chat.user_id,
        api_used: last_api_used,
        model_used: last_model_used,
        model_id,
        is_double,
        model_answers: modelEntries,
        job: chat.job_id,
        subtab: chat.subtab,
      };
    });

    const total = await ChatHistory.countDocuments(query);

    const stats = await ChatHistory.aggregate([
      { $match: { user_id: userId } },
      {
        $group: {
          _id: null,
          total_chats: { $sum: 1 },
          total_messages: { $sum: "$total_messages" },
          total_tokens: { $sum: "$total_tokens_used" },
          archived_chats: { $sum: { $cond: ["$is_archived", 1, 0] } },
          favorite_chats: { $sum: { $cond: ["$is_favorite", 1, 0] } },
        },
      },
    ]);

    res.json({
      success: true,
      data: processedChats,
      pagination: {
        current: Number(page),
        pages: Math.ceil(total / limit),
        total,
      },
      stats: stats[0] || {
        total_chats: 0,
        total_messages: 0,
        total_tokens: 0,
        archived_chats: 0,
        favorite_chats: 0,
      },
    });
  } catch (error) {
    console.error("GET /api/chat-history error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
});

router.get("/admin-or-user", protect, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      archived = false,
      favorite,
      search,
      tags,
      startDate,
      endDate,
      ischatehistry,
    } = req.query;

    // STEP 1: Get logged-in user ID
    const userId = req.user?.id || req.guestUser?._id;

    // STEP 2: Check AdminUsers collection
    const adminUser = await AdminUser.findOne({ user_id: userId }).lean();

    let isAdmin = false;

    if (adminUser && adminUser.role) {
      // STEP 3: Fetch the role
      const roleDoc = await roleAndPermission.findById(adminUser.role).lean();

      if ((roleDoc && roleDoc.roleName === "Admin") || "Admin_user") {
        isAdmin = true;
      }
    }

    // STEP 4: Build query
    const query = {};

    if (!isAdmin) {
      // Non-admin → only own chats
      query.user_id = userId;
    }

    // Apply filters (same as your main API)
    query.is_archived = archived === "true";

    if (favorite !== undefined) {
      query.is_favorite = favorite === "true";
    }

    if (ischatehistry !== undefined) {
      query.ischatehistry = ischatehistry === "true";
    }

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: "i" } },
        { "messages.content": { $regex: search, $options: "i" } },
      ];
    }

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
      if (Object.keys(query.createdAt).length === 0) delete query.createdAt;
    }

    if (tags) {
      const tagArray = Array.isArray(tags) ? tags : [tags];
      query.tags = { $in: tagArray };
    }

    // STEP 5: Fetch chat records
    const chats = await ChatHistory.find(query)
      .select(
        "title total_messages total_tokens_used last_activity is_favorite tags createdAt messages ischatehistry job_id subtab user_id",
      )
      .populate("user_id", "name email")
      .sort({ last_activity: -1 })
      .skip((page - 1) * Number(limit))
      .limit(Number(limit))
      .lean();

    const total = await ChatHistory.countDocuments(query);

    res.json({
      success: true,
      isAdmin,
      data: chats,
      pagination: {
        current: Number(page),
        pages: Math.ceil(total / limit),
        total,
      },
    });
  } catch (error) {
    console.error("GET /api/chat-history/admin-or-user error:", error);
    res
      .status(500)
      .json({ success: false, message: "Server error", error: error.message });
  }
});

// @desc    Clean duplicate messages from a chat
// @route   POST /api/chat-history/:id/clean-duplicates
// @access  Private
router.post("/:id/clean-duplicates", protect, async (req, res) => {
  console.log("POST /api/chat-history/:id/clean-duplicates called");

  const userId = req.user?.id || req.guestUser?._id;
  try {
    const chat = await ChatService.removeDuplicateMessages(
      req.params.id,
      userId,
    );

    if (!chat) {
      return res.status(404).json({
        success: false,
        message: "Chat history not found",
      });
    }

    res.json({
      success: true,
      message: "Duplicate messages removed successfully",
      data: {
        chat_id: chat._id,
        total_messages: chat.total_messages,
      },
    });
  } catch (error) {
    console.error("Clean duplicates error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
});

// @desc    Get search analytics for a chat
// @route   GET /api/chat-history/:id/search-analytics
// @access  Private
router.get("/:id/search-analytics", protect, async (req, res) => {
  const userId = req.user?.id || req.guestUser?._id;

  try {
    const chatWithAnalytics = await ChatService.getChatWithSearchAnalytics(
      req.params.id,
      userId,
    );

    res.json({
      success: true,
      data: chatWithAnalytics,
    });
  } catch (error) {
    console.error("Get search analytics error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
});

// @desc    Get user's search analytics
// @route   GET /api/chat-history/analytics/search
// @access  Private
router.get("/analytics/search", protect, async (req, res) => {
  console.log("GET /api/chat-history/analytics/search called");
  const userId = req.user?.id || req.guestUser?._id;
  try {
    const { days = 30 } = req.query;
    const analytics = await ChatHistory.getSearchAnalytics(
      userId,
      Number.parseInt(days),
    );

    res.json({
      success: true,
      data: {
        analytics,
        period_days: Number.parseInt(days),
      },
    });
  } catch (error) {
    console.error("Get search analytics error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
});

// // @desc    Get all chat histories for user
// // @route   GET /api/chat-history
// // @access  Private
// router.get("/", protect, async (req, res) => {
//   try {
//     const {
//       page = 1,
//       limit = 20,
//       archived = false,
//       favorite,
//       search,
//       tags,
//       startDate,
//       endDate,
//     } = req.query;

//     const query = {
//       user_id: req.user.id,
//       is_archived: archived === "true",
//     };

//     if (favorite !== undefined) {
//       query.is_favorite = favorite === "true";
//     }

//     if (search) {
//       query.$or = [
//         { title: { $regex: search, $options: "i" } },
//         { "messages.content": { $regex: search, $options: "i" } },
//       ];
//     }

//     if (startDate || endDate) {
//       query.createdAt = {};
//       if (startDate) query.createdAt.$gte = new Date(startDate);
//       if (endDate) query.createdAt.$lte = new Date(endDate);
//       if (Object.keys(query.createdAt).length === 0) {
//         delete query.createdAt;
//       }
//     }

//     if (tags) {
//       const tagArray = Array.isArray(tags) ? tags : [tags];
//       query.tags = { $in: tagArray };
//     }

//     // Helper to remove consecutive duplicate messages
//     function filterConsecutiveDuplicates(messages) {
//       const filtered = [];
//       for (let i = 0; i < messages.length; i++) {
//         const current = messages[i];
//         const previous = filtered[filtered.length - 1];

//         if (
//           !previous ||
//           current.type !== previous.type ||
//           current.content !== previous.content
//         ) {
//           filtered.push(current);
//         }
//       }
//       return filtered;
//     }

//     // Detect if chat has double assistant response
//     function hasDoubleAssistantResponse(messages = []) {
//       for (let i = 0; i < messages.length - 1; i++) {
//         const current = messages[i];
//         const next = messages[i + 1];

//         if (
//           current.type === "assistant" &&
//           next.type === "assistant"
//         ) {
//           return true;
//         }
//       }
//       return false;
//     }

//     const chats = await ChatHistory.find(query)
//       .select("title total_messages total_tokens_used last_activity is_favorite tags createdAt user_id messages")
//       .populate("user_id", "name email")
//       .populate("messages.metadata.tool_id", "name slug")
//       .populate("messages.metadata.tool_category_id", "name category")
//       .sort({ last_activity: -1 })
//       .limit(limit * 1)
//       .skip((page - 1) * limit)
//       .lean();

//     // Collect unique API + Model combinations
//     const apiModelSet = new Set();
//     chats.forEach((chat) => {
//       const filteredMessages = filterConsecutiveDuplicates(chat.messages || []);
//       const assistantMessages = filteredMessages.filter(msg => msg.type === "assistant");
//       const lastAssistant = assistantMessages[assistantMessages.length - 1];
//       if (lastAssistant?.metadata?.api_used && lastAssistant?.metadata?.model_used) {
//         apiModelSet.add(`${lastAssistant.metadata.api_used}|||${lastAssistant.metadata.model_used}`);
//       }
//     });

//     // Resolve model_id from provider + model
//     const apiModelMap = {};
//     for (const combo of apiModelSet) {
//       const [api_used, model_used] = combo.split("|||");
//       const provider = await AIProvider.findOne({ name: api_used }).lean();
//       if (!provider) continue;
//       const model = await AIModel.findOne({
//         ai_provider_id: provider._id,
//         model: model_used,
//       }).lean();
//       if (model) {
//         apiModelMap[combo] = model._id;
//       }
//     }

//     // Final chat formatting
//     const processedChats = chats.map((chat) => {
//       const originalMessages = chat.messages || [];

//       const is_double = hasDoubleAssistantResponse(originalMessages); // ✅ New flag

//       const filteredMessages = filterConsecutiveDuplicates(originalMessages);
//       const assistantMessages = filteredMessages.filter(msg => msg.type === "assistant");
//       const lastAssistant = assistantMessages[assistantMessages.length - 1] || null;

//       const api_used = lastAssistant?.metadata?.api_used || null;
//       const model_used = lastAssistant?.metadata?.model_used || null;
//       const key = api_used && model_used ? `${api_used}|||${model_used}` : null;
//       const model_id = key && apiModelMap[key] ? apiModelMap[key] : null;

//       return {
//         _id: chat._id,
//         title: chat.title,
//         total_messages: chat.total_messages,
//         total_tokens_used: chat.total_tokens_used,
//         last_activity: chat.last_activity,
//         is_favorite: chat.is_favorite,
//         tags: chat.tags,
//         createdAt: chat.createdAt,
//         user_id: chat.user_id,
//         api_used,
//         model_used,
//         model_id,
//         last_assistant_message: lastAssistant,
//         is_double, // ✅ Include in response
//         messages: filteredMessages, // Optional for frontend
//       };
//     });

//     const total = await ChatHistory.countDocuments(query);

//     const stats = await ChatHistory.aggregate([
//       { $match: { user_id: req.user._id } },
//       {
//         $group: {
//           _id: null,
//           total_chats: { $sum: 1 },
//           total_messages: { $sum: "$total_messages" },
//           total_tokens: { $sum: "$total_tokens_used" },
//           archived_chats: { $sum: { $cond: ["$is_archived", 1, 0] } },
//           favorite_chats: { $sum: { $cond: ["$is_favorite", 1, 0] } },
//         },
//       },
//     ]);

//     res.json({
//       success: true,
//       data: processedChats,
//       pagination: {
//         current: Number(page),
//         pages: Math.ceil(total / limit),
//         total,
//       },
//       stats: stats[0] || {
//         total_chats: 0,
//         total_messages: 0,
//         total_tokens: 0,
//         archived_chats: 0,
//         favorite_chats: 0,
//       },
//     });
//   } catch (error) {
//     console.error("GET /api/chat-history error:", error);
//     res.status(500).json({
//       success: false,
//       message: "Server error",
//       error: error.message,
//     });
//   }
// });

// // @desc    Get specific chat history with messages
// // @route   GET /api/chat-history/:id
// // @access  Private
// router.get("/:id", protect, async (req, res) => {
//   console.log("GET /api/chat-history/:id called with ID:", req.params.id);

//   try {
//     const chat = await ChatHistory.findOne({
//       _id: req.params.id,
//       user_id: req.user.id,
//     })
//     .populate("user_id", "name email")
//       .populate("messages.metadata.tool_id", "name slug")
//       .populate("messages.metadata.tool_category_id", "name category")
//       .lean();

//     if (!chat) {
//       console.log("Chat not found for ID:", req.params.id);
//       return res.status(404).json({
//         success: false,
//         message: "Chat history not found",
//       });
//     }

//     console.log(
//       "Found chat:",
//       chat.title,
//       "with",
//       chat.messages.length,
//       "messages"
//     );
//     res.json({
//       success: true,
//       data: chat,
//     });
//   } catch (error) {
//     console.error("Get chat history error:", error);
//     res.status(500).json({
//       success: false,
//       message: "Server error",
//       error: error.message,
//     });
//   }
// });

router.get("/admin-or-user/:id", protect, async (req, res) => {
  try {
    const userId = req.user?.id || req.guestUser?._id;
    console.log("userId", userId);

    // -----------------------------
    // 1️⃣ CHECK ADMIN USER ROLE
    // -----------------------------
    const adminUser = await AdminUser.findOne({ user_id: userId }).lean();

    let isAdmin = false;

    if (adminUser && adminUser.role) {
      const roleDoc = await roleAndPermission.findById(adminUser.role).lean();

      if ((roleDoc && roleDoc.roleName === "Admin") || "Admin_user") {
        isAdmin = true;
      }
    }

    // -----------------------------
    // 2️⃣ QUERY BUILDING
    // -----------------------------
    const query = { _id: req.params.id };

    // Non-admin → restrict to own data
    if (!isAdmin) {
      query.user_id = userId;
    }

    // -----------------------------
    // 3️⃣ FIND CHAT
    // -----------------------------
    let chat = await ChatHistory.findOne(query)
      .populate("user_id", "name email")
      .populate("messages.metadata.tool_id", "name slug")
      .populate("messages.metadata.tool_category_id", "name category")
      .lean();

    if (!chat) {
      return res.status(404).json({
        success: false,
        message: "Chat history not found OR access denied",
      });
    }

    // -------------------------------------
    // 4️⃣ REMOVE duplicate consecutive messages
    // -------------------------------------
    const filteredMessages = [];
    for (let i = 0; i < chat.messages.length; i++) {
      const current = chat.messages[i];
      const previous = filteredMessages[filteredMessages.length - 1];

      if (
        !previous ||
        current.type !== previous.type ||
        current.content !== previous.content
      ) {
        filteredMessages.push(current);
      }
    }

    chat.messages = filteredMessages;

    // -----------------------------
    // 5️⃣ SEND RESPONSE
    // -----------------------------
    res.json({
      success: true,
      isAdmin,
      data: chat,
    });
  } catch (error) {
    console.error("Get chat history by id error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
});

router.get("/:id", protect, async (req, res) => {
  try {
    const userId = req.user?.id || req.guestUser?._id;
    let chat = await ChatHistory.findOne({
      _id: req.params.id,
      user_id: userId,
    })
      .populate("user_id", "name email")
      .populate("messages.metadata.tool_id", "name slug")
      .populate("messages.metadata.tool_category_id", "name category")
      .lean();

    if (!chat) {
      console.log("Chat not found for ID:", req.params.id);
      return res.status(404).json({
        success: false,
        message: "Chat history not found",
      });
    }

    // ✅ Filter out consecutive duplicate messages (same type + content)
    const filteredMessages = [];
    for (let i = 0; i < chat.messages.length; i++) {
      const current = chat.messages[i];
      const previous = filteredMessages[filteredMessages.length - 1];

      // Add first message, or non-duplicate message
      if (
        !previous ||
        current.type !== previous.type ||
        current.content !== previous.content
      ) {
        filteredMessages.push(current);
      }
    }

    // Replace original messages with filtered ones
    chat.messages = filteredMessages;

    res.json({
      success: true,
      data: chat,
    });
  } catch (error) {
    console.error("Get chat history error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
});

// @desc    Create new chat
// @route   POST /api/chat-history
// @access  Private
router.post(
  "/",
  protect,
  validateChatCreation,
  handleValidationErrors,
  async (req, res) => {
    try {
      const {
        title = "New Chat",
        tags = [],
        subtab = null,
        job_id = null,
        ischatehistry,
      } = req.body;

      const userId = req.user?.id || req.guestUser?._id;
      let parsedIsChatHistory;
      if (typeof ischatehistry !== "undefined") {
        parsedIsChatHistory =
          ischatehistry === true ||
          ischatehistry === "true" ||
          ischatehistry === 1 ||
          ischatehistry === "1";
      }
      const chatData = {
        user_id: userId,
        title: title.trim(),
        tags: tags.map((tag) => tag.trim()),
        subtab,
        job_id,
      };
      if (typeof parsedIsChatHistory !== "undefined") {
        chatData.ischatehistry = parsedIsChatHistory;
      }
      const chat = await ChatHistory.create(chatData);
      res.status(201).json({
        success: true,
        message: "Chat created successfully",
        data: chat,
      });
    } catch (error) {
      console.error("Create chat error:", error);
      res.status(500).json({
        success: false,
        message: "Server error",
        error: error.message,
        stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
      });
    }
  },
);

// @desc    Add message to chat
// @route   POST /api/chat-history/:id/messages
// @access  Private
router.post(
  "/:id/messages",
  protect,
  validateMessageAdd,
  handleValidationErrors,
  async (req, res) => {
    try {
      let { type, content, metadata = {} } = req.body;
      const userId = req.user?.id || req.guestUser?._id;
      const chat = await ChatHistory.findOne({
        _id: req.params.id,
        user_id: userId,
      });

      if (!chat) {
        return res.status(404).json({
          success: false,
          message: "Chat history not found",
        });
      }

      // For user messages, only send content before '{{historyData}}'
      if (type === "user") {
        const marker = "{{historyData}}";
        const index = content.indexOf(marker);
        if (index !== -1) {
          content = content.substring(0, index);
        }
        await ChatService.addUserMessage(req.params.id, userId, content);
      } else {
        await ChatService.addAssistantMessage(
          req.params.id,
          userId,
          content,
          metadata,
        );
      }

      // Refresh chat data
      const updatedChat = await ChatHistory.findById(req.params.id);

      res.json({
        success: true,
        message: "Message added successfully",
        data: {
          chat_id: updatedChat._id,
          total_messages: updatedChat.total_messages,
        },
      });
    } catch (error) {
      console.error("Add message error:", error);
      res.status(500).json({
        success: false,
        message: "Server error",
        error: error.message,
      });
    }
  },
);

// @desc    Update chat (title, tags, favorite, archive)
// @route   PUT /api/chat-history/:id
// @access  Private
router.put("/:id", protect, async (req, res) => {
  try {
    const { title, tags, is_favorite, is_archived, ischatehistry } = req.body;

    const updateData = {};

    if (title !== undefined) updateData.title = title.trim();
    if (tags !== undefined) updateData.tags = tags.map((tag) => tag.trim());
    if (is_favorite !== undefined) updateData.is_favorite = is_favorite;
    if (is_archived !== undefined) updateData.is_archived = is_archived;
    // handle ischatehistry flag if it is passed in body (regardless of other fields)
    if (ischatehistry !== undefined) updateData.ischatehistry = ischatehistry;

    // If updateData is empty, return 400 or update anyway?
    // (You can decide, here I'll allow empty update - no changes)
    const userId = req.user?.id || req.guestUser?._id;

    const chat = await ChatHistory.findOneAndUpdate(
      { _id: req.params.id, user_id: userId },
      updateData,
      {
        new: true,
        runValidators: true,
      },
    );

    if (!chat) {
      return res.status(404).json({
        success: false,
        message: "Chat history not found",
      });
    }

    res.json({
      success: true,
      message: "Chat updated successfully",
      data: chat,
    });
  } catch (error) {
    console.error("Update chat error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
});

// @desc    Delete chat history
// @route   DELETE /api/chat-history/:id
// @access  Private
router.delete("/:id", protect, async (req, res) => {
  const userId = req.user?.id || req.guestUser?._id;
  try {
    const chat = await ChatHistory.findOneAndDelete({
      _id: req.params.id,
      user_id: userId,
    });

    if (!chat) {
      return res.status(404).json({
        success: false,
        message: "Chat history not found",
      });
    }
    res.json({
      success: true,
      message: "Chat deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
});

// @desc    Bulk delete chat histories
// @route   DELETE /api/chat-history
// @access  Private
router.delete("/", protect, async (req, res) => {
  try {
    const chatIds = req.body;

    if (!Array.isArray(chatIds) || chatIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No chat IDs provided for deletion",
      });
    }

    const ids = chatIds.map((item) => item.id);

    const result = await ChatHistory.deleteMany({
      _id: { $in: ids },
    });

    if (result.deletedCount === 0) {
      return res.status(404).json({
        success: false,
        message: "No matching chats found to delete",
      });
    }

    res.json({
      success: true,
      message: `${result.deletedCount} chat(s) deleted successfully`,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
});

// @desc    Delete specific message from chat
// @route   DELETE /api/chat-history/:id/messages/:messageId
// @access  Private
router.delete("/:id/messages/:messageId", protect, async (req, res) => {
  const userId = req.user?.id || req.guestUser?._id;
  try {
    const chat = await ChatHistory.findOne({
      _id: req.params.id,
      user_id: userId,
    });

    if (!chat) {
      return res.status(404).json({
        success: false,
        message: "Chat history not found",
      });
    }

    const messageIndex = chat.messages.findIndex(
      (msg) => msg._id.toString() === req.params.messageId,
    );

    if (messageIndex === -1) {
      return res.status(404).json({
        success: false,
        message: "Message not found",
      });
    }

    chat.messages.splice(messageIndex, 1);
    await chat.save();

    res.json({
      success: true,
      message: "Message deleted successfully",
    });
  } catch (error) {
    console.error("Delete message error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
});

module.exports = router;
