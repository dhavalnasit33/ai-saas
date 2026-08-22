// // // const ChatHistory = require("../models/ChatHistory")

// // // class ChatService {
// // //   // Create a new chat session
// // //   static async createChat(userId, title = "New Chat", tags = []) {
// // //     try {
// // //       console.log("ChatService: Creating chat for user:", userId)

// // //       const chat = await ChatHistory.create({
// // //         user_id: userId,
// // //         title: title.trim(),
// // //         tags: tags.map((tag) => tag.trim()),
// // //       })

// // //       console.log("ChatService: Chat created successfully:", chat._id)
// // //       return chat
// // //     } catch (error) {
// // //       console.error("ChatService: Failed to create chat:", error)
// // //       throw new Error(`Failed to create chat: ${error.message}`)
// // //     }
// // //   }

// // //   // Add user message to chat
// // //   static async addUserMessage(chatId, userId, content) {
// // //     try {
// // //       console.log("ChatService: Adding user message to chat:", chatId)

// // //       const chat = await ChatHistory.findOne({
// // //         _id: chatId,
// // //         user_id: userId,
// // //       })

// // //       if (!chat) {
// // //         throw new Error("Chat not found")
// // //       }

// // //       const messageData = {
// // //         type: "user",
// // //         content: content.trim(),
// // //         timestamp: new Date(),
// // //       }

// // //       await chat.addMessage(messageData)
// // //       console.log("ChatService: User message added successfully")
// // //       return chat
// // //     } catch (error) {
// // //       console.error("ChatService: Failed to add user message:", error)
// // //       throw new Error(`Failed to add user message: ${error.message}`)
// // //     }
// // //   }

// // //   // Add assistant message to chat
// // //   static async addAssistantMessage(chatId, userId, content, metadata = {}) {
// // //     try {
// // //       console.log("ChatService: Adding assistant message to chat:", chatId)

// // //       const chat = await ChatHistory.findOne({
// // //         _id: chatId,
// // //         user_id: userId,
// // //       })

// // //       if (!chat) {
// // //         throw new Error("Chat not found")
// // //       }

// // //       const messageData = {
// // //         type: "assistant",
// // //         content: content.trim(),
// // //         timestamp: new Date(),
// // //         metadata,
// // //       }

// // //       await chat.addMessage(messageData)
// // //       console.log("ChatService: Assistant message added successfully")
// // //       return chat
// // //     } catch (error) {
// // //       console.error("ChatService: Failed to add assistant message:", error)
// // //       throw new Error(`Failed to add assistant message: ${error.message}`)
// // //     }
// // //   }

// // //   // Get or create chat for user
// // //   static async getOrCreateChat(userId, chatId = null) {
// // //     try {
// // //       console.log("ChatService: Getting or creating chat for user:", userId, "chatId:", chatId)

// // //       if (chatId) {
// // //         const existingChat = await ChatHistory.findOne({
// // //           _id: chatId,
// // //           user_id: userId,
// // //         })

// // //         if (existingChat) {
// // //           console.log("ChatService: Found existing chat:", existingChat._id)
// // //           return existingChat
// // //         }
// // //       }

// // //       // Create new chat if not found or no chatId provided
// // //       console.log("ChatService: Creating new chat")
// // //       return await this.createChat(userId)
// // //     } catch (error) {
// // //       console.error("ChatService: Failed to get or create chat:", error)
// // //       throw new Error(`Failed to get or create chat: ${error.message}`)
// // //     }
// // //   }

// // //   // Get recent chats for user
// // //   static async getRecentChats(userId, limit = 10) {
// // //     try {
// // //       console.log("ChatService: Getting recent chats for user:", userId)

// // //       const chats = await ChatHistory.find({ user_id: userId })
// // //         .select("title total_messages last_activity")
// // //         .sort({ last_activity: -1 })
// // //         .limit(limit)
// // //         .lean()

// // //       console.log("ChatService: Found", chats.length, "recent chats")
// // //       return chats
// // //     } catch (error) {
// // //       console.error("ChatService: Failed to get recent chats:", error)
// // //       throw new Error(`Failed to get recent chats: ${error.message}`)
// // //     }
// // //   }

// // //   // Update chat title based on first message
// // //   static async updateChatTitle(chatId, userId) {
// // //     try {
// // //       console.log("ChatService: Updating chat title for:", chatId)

// // //       const chat = await ChatHistory.findOne({
// // //         _id: chatId,
// // //         user_id: userId,
// // //       })

// // //       if (!chat || chat.messages.length === 0) {
// // //         return chat
// // //       }

// // //       const firstUserMessage = chat.messages.find((msg) => msg.type === "user")
// // //       if (firstUserMessage && chat.title === "New Chat") {
// // //         chat.title = firstUserMessage.content.substring(0, 50) + (firstUserMessage.content.length > 50 ? "..." : "")
// // //         await chat.save()
// // //         console.log("ChatService: Chat title updated to:", chat.title)
// // //       }

// // //       return chat
// // //     } catch (error) {
// // //       console.error("ChatService: Failed to update chat title:", error)
// // //       throw new Error(`Failed to update chat title: ${error.message}`)
// // //     }
// // //   }
// // // }

// // // module.exports = ChatService
// // const ChatHistory = require("../models/ChatHistory")

// // class ChatService {
// //   // Create a new chat session
// //   static async createChat(userId, title = "New Chat", tags = []) {
// //     try {
// //       console.log("ChatService: Creating chat for user:", userId)

// //       const chat = await ChatHistory.create({
// //         user_id: userId,
// //         title: title.trim(),
// //         tags: tags.map((tag) => tag.trim()),
// //       })

// //       console.log("ChatService: Chat created successfully:", chat._id)
// //       return chat
// //     } catch (error) {
// //       console.error("ChatService: Failed to create chat:", error)
// //       throw new Error(`Failed to create chat: ${error.message}`)
// //     }
// //   }

// //   // Add user message to chat
// //   static async addUserMessage(chatId, userId, content) {
// //     try {
// //       console.log("ChatService: Adding user message to chat:", chatId)

// //       const chat = await ChatHistory.findOne({
// //         _id: chatId,
// //         user_id: userId,
// //       })

// //       if (!chat) {
// //         throw new Error("Chat not found")
// //       }

// //       const messageData = {
// //         type: "user",
// //         content: content.trim(),
// //         timestamp: new Date(),
// //       }

// //       await chat.addMessage(messageData)
// //       console.log("ChatService: User message added successfully")
// //       return chat
// //     } catch (error) {
// //       console.error("ChatService: Failed to add user message:", error)
// //       throw new Error(`Failed to add user message: ${error.message}`)
// //     }
// //   }

// //   // Add assistant message to chat - WITH DUPLICATE PREVENTION
// //   static async addAssistantMessage(chatId, userId, content, metadata = {}) {
// //     try {
// //       console.log("ChatService: Adding assistant message to chat:", chatId)

// //       const chat = await ChatHistory.findOne({
// //         _id: chatId,
// //         user_id: userId,
// //       })

// //       if (!chat) {
// //         throw new Error("Chat not found")
// //       }

// //       // Check for duplicate messages (same content within last 5 seconds)
// //       const now = new Date()
// //       const fiveSecondsAgo = new Date(now.getTime() - 5000)

// //       const recentDuplicate = chat.messages.find(
// //         (msg) => msg.type === "assistant" && msg.content === content.trim() && msg.timestamp >= fiveSecondsAgo,
// //       )

// //       if (recentDuplicate) {
// //         console.log("ChatService: Duplicate assistant message detected, skipping...")
// //         return chat
// //       }

// //       const messageData = {
// //         type: "assistant",
// //         content: content.trim(),
// //         timestamp: now,
// //         metadata,
// //       }

// //       await chat.addMessage(messageData)
// //       console.log("ChatService: Assistant message added successfully")
// //       return chat
// //     } catch (error) {
// //       console.error("ChatService: Failed to add assistant message:", error)
// //       throw new Error(`Failed to add assistant message: ${error.message}`)
// //     }
// //   }

// //   // Get or create chat for user
// //   static async getOrCreateChat(userId, chatId = null) {
// //     try {
// //       console.log("ChatService: Getting or creating chat for user:", userId, "chatId:", chatId)

// //       if (chatId) {
// //         const existingChat = await ChatHistory.findOne({
// //           _id: chatId,
// //           user_id: userId,
// //         })

// //         if (existingChat) {
// //           console.log("ChatService: Found existing chat:", existingChat._id)
// //           return existingChat
// //         }
// //       }

// //       // Create new chat if not found or no chatId provided
// //       console.log("ChatService: Creating new chat")
// //       return await this.createChat(userId)
// //     } catch (error) {
// //       console.error("ChatService: Failed to get or create chat:", error)
// //       throw new Error(`Failed to get or create chat: ${error.message}`)
// //     }
// //   }

// //   // Get recent chats for user
// //   static async getRecentChats(userId, limit = 10) {
// //     try {
// //       console.log("ChatService: Getting recent chats for user:", userId)

// //       const chats = await ChatHistory.find({ user_id: userId })
// //         .select("title total_messages last_activity")
// //         .sort({ last_activity: -1 })
// //         .limit(limit)
// //         .lean()

// //       console.log("ChatService: Found", chats.length, "recent chats")
// //       return chats
// //     } catch (error) {
// //       console.error("ChatService: Failed to get recent chats:", error)
// //       throw new Error(`Failed to get recent chats: ${error.message}`)
// //     }
// //   }

// //   // Update chat title based on first message
// //   static async updateChatTitle(chatId, userId) {
// //     try {
// //       console.log("ChatService: Updating chat title for:", chatId)

// //       const chat = await ChatHistory.findOne({
// //         _id: chatId,
// //         user_id: userId,
// //       })

// //       if (!chat || chat.messages.length === 0) {
// //         return chat
// //       }

// //       const firstUserMessage = chat.messages.find((msg) => msg.type === "user")
// //       if (firstUserMessage && chat.title === "New Chat") {
// //         chat.title = firstUserMessage.content.substring(0, 50) + (firstUserMessage.content.length > 50 ? "..." : "")
// //         await chat.save()
// //         console.log("ChatService: Chat title updated to:", chat.title)
// //       }

// //       return chat
// //     } catch (error) {
// //       console.error("ChatService: Failed to update chat title:", error)
// //       throw new Error(`Failed to update chat title: ${error.message}`)
// //     }
// //   }

// //   // Remove duplicate messages from a chat
// //   static async removeDuplicateMessages(chatId, userId) {
// //     try {
// //       console.log("ChatService: Removing duplicate messages from chat:", chatId)

// //       const chat = await ChatHistory.findOne({
// //         _id: chatId,
// //         user_id: userId,
// //       })

// //       if (!chat) {
// //         throw new Error("Chat not found")
// //       }

// //       const uniqueMessages = []
// //       const seenMessages = new Set()

// //       for (const message of chat.messages) {
// //         const messageKey = `${message.type}-${message.content}-${Math.floor(message.timestamp.getTime() / 1000)}`

// //         if (!seenMessages.has(messageKey)) {
// //           seenMessages.add(messageKey)
// //           uniqueMessages.push(message)
// //         } else {
// //           console.log("ChatService: Found duplicate message, removing...")
// //         }
// //       }

// //       if (uniqueMessages.length !== chat.messages.length) {
// //         chat.messages = uniqueMessages
// //         await chat.save()
// //         console.log(`ChatService: Removed ${chat.messages.length - uniqueMessages.length} duplicate messages`)
// //       }

// //       return chat
// //     } catch (error) {
// //       console.error("ChatService: Failed to remove duplicates:", error)
// //       throw new Error(`Failed to remove duplicate messages: ${error.message}`)
// //     }
// //   }
// // }

// // module.exports = ChatService
// const ChatHistory = require("../models/ChatHistory")

// class ChatService {
//   // Track active message additions to prevent duplicates
//   static activeMessageAdditions = new Map()

//   // Create a new chat session
//   static async createChat(userId, title = "New Chat", tags = []) {
//     try {
//       console.log("ChatService: Creating chat for user:", userId)

//       const chat = await ChatHistory.create({
//         user_id: userId,
//         title: title.trim(),
//         tags: tags.map((tag) => tag.trim()),
//       })

//       console.log("ChatService: Chat created successfully:", chat._id)
//       return chat
//     } catch (error) {
//       console.error("ChatService: Failed to create chat:", error)
//       throw new Error(`Failed to create chat: ${error.message}`)
//     }
//   }

//   // Add user message to chat
//   static async addUserMessage(chatId, userId, content) {
//     try {
//       console.log("ChatService: Adding user message to chat:", chatId)

//       const chat = await ChatHistory.findOne({
//         _id: chatId,
//         user_id: userId,
//       })

//       if (!chat) {
//         throw new Error("Chat not found")
//       }

//       const messageData = {
//         type: "user",
//         content: content.trim(),
//         timestamp: new Date(),
//       }

//       await chat.addMessage(messageData)
//       console.log("ChatService: User message added successfully")
//       return chat
//     } catch (error) {
//       console.error("ChatService: Failed to add user message:", error)
//       throw new Error(`Failed to add user message: ${error.message}`)
//     }
//   }

//   // Add assistant message to chat - WITH STRICT DUPLICATE PREVENTION
//   static async addAssistantMessage(chatId, userId, content, metadata = {}) {
//     const messageKey = `${chatId}-${userId}-${content.trim()}`

//     try {
//       console.log("ChatService: Adding assistant message to chat:", chatId)

//       // Check if this exact message is currently being processed
//       if (this.activeMessageAdditions.has(messageKey)) {
//         console.log("ChatService: Message already being processed, skipping duplicate...")
//         return this.activeMessageAdditions.get(messageKey)
//       }

//       // Mark this message as being processed
//       const processingPromise = this._processAssistantMessage(chatId, userId, content, metadata)
//       this.activeMessageAdditions.set(messageKey, processingPromise)

//       try {
//         const result = await processingPromise
//         return result
//       } finally {
//         // Clean up the tracking after processing
//         this.activeMessageAdditions.delete(messageKey)
//       }
//     } catch (error) {
//       // Clean up on error
//       this.activeMessageAdditions.delete(messageKey)
//       console.error("ChatService: Failed to add assistant message:", error)
//       throw new Error(`Failed to add assistant message: ${error.message}`)
//     }
//   }

//   // Internal method to actually process the assistant message
//   static async _processAssistantMessage(chatId, userId, content, metadata = {}) {
//     const chat = await ChatHistory.findOne({
//       _id: chatId,
//       user_id: userId,
//     })

//     if (!chat) {
//       throw new Error("Chat not found")
//     }

//     // Check for recent duplicate messages (same content within last 10 seconds)
//     const now = new Date()
//     const tenSecondsAgo = new Date(now.getTime() - 10000)
//     const trimmedContent = content.trim()

//     const recentDuplicate = chat.messages.find(
//       (msg) => msg.type === "assistant" && msg.content === trimmedContent && msg.timestamp >= tenSecondsAgo,
//     )

//     if (recentDuplicate) {
//       console.log("ChatService: Recent duplicate assistant message found, skipping...")
//       return chat
//     }

//     const messageData = {
//       type: "assistant",
//       content: trimmedContent,
//       timestamp: now,
//       metadata,
//     }

//     await chat.addMessage(messageData)
//     console.log("ChatService: Assistant message added successfully")
//     return chat
//   }

//   // Get or create chat for user
//   static async getOrCreateChat(userId, chatId = null) {
//     try {
//       console.log("ChatService: Getting or creating chat for user:", userId, "chatId:", chatId)

//       if (chatId) {
//         const existingChat = await ChatHistory.findOne({
//           _id: chatId,
//           user_id: userId,
//         })

//         if (existingChat) {
//           console.log("ChatService: Found existing chat:", existingChat._id)
//           return existingChat
//         }
//       }

//       // Create new chat if not found or no chatId provided
//       console.log("ChatService: Creating new chat")
//       return await this.createChat(userId)
//     } catch (error) {
//       console.error("ChatService: Failed to get or create chat:", error)
//       throw new Error(`Failed to get or create chat: ${error.message}`)
//     }
//   }

//   // Get recent chats for user
//   static async getRecentChats(userId, limit = 10) {
//     try {
//       console.log("ChatService: Getting recent chats for user:", userId)

//       const chats = await ChatHistory.find({ user_id: userId })
//         .select("title total_messages last_activity")
//         .sort({ last_activity: -1 })
//         .limit(limit)
//         .lean()

//       console.log("ChatService: Found", chats.length, "recent chats")
//       return chats
//     } catch (error) {
//       console.error("ChatService: Failed to get recent chats:", error)
//       throw new Error(`Failed to get recent chats: ${error.message}`)
//     }
//   }

//   // Update chat title based on first message
//   static async updateChatTitle(chatId, userId) {
//     try {
//       console.log("ChatService: Updating chat title for:", chatId)

//       const chat = await ChatHistory.findOne({
//         _id: chatId,
//         user_id: userId,
//       })

//       if (!chat || chat.messages.length === 0) {
//         return chat
//       }

//       const firstUserMessage = chat.messages.find((msg) => msg.type === "user")
//       if (firstUserMessage && chat.title === "New Chat") {
//         chat.title = firstUserMessage.content.substring(0, 50) + (firstUserMessage.content.length > 50 ? "..." : "")
//         await chat.save()
//         console.log("ChatService: Chat title updated to:", chat.title)
//       }

//       return chat
//     } catch (error) {
//       console.error("ChatService: Failed to update chat title:", error)
//       throw new Error(`Failed to update chat title: ${error.message}`)
//     }
//   }

//   // Remove duplicate messages from a chat
//   static async removeDuplicateMessages(chatId, userId) {
//     try {
//       console.log("ChatService: Removing duplicate messages from chat:", chatId)

//       const chat = await ChatHistory.findOne({
//         _id: chatId,
//         user_id: userId,
//       })

//       if (!chat) {
//         throw new Error("Chat not found")
//       }

//       const uniqueMessages = []
//       const seenMessages = new Map()

//       for (const message of chat.messages) {
//         // Create a more specific key for duplicate detection
//         const messageKey = `${message.type}-${message.content}-${Math.floor(message.timestamp.getTime() / 5000)}`

//         if (!seenMessages.has(messageKey)) {
//           seenMessages.set(messageKey, true)
//           uniqueMessages.push(message)
//         } else {
//           console.log("ChatService: Found duplicate message, removing...")
//         }
//       }

//       if (uniqueMessages.length !== chat.messages.length) {
//         chat.messages = uniqueMessages
//         await chat.save()
//         console.log(`ChatService: Removed ${chat.messages.length - uniqueMessages.length} duplicate messages`)
//       }

//       return chat
//     } catch (error) {
//       console.error("ChatService: Failed to remove duplicates:", error)
//       throw new Error(`Failed to remove duplicate messages: ${error.message}`)
//     }
//   }
// }

// module.exports = ChatService
const ChatHistory = require("../models/ChatHistory");
const { OpenAI } = require("openai");

const client = new OpenAI({
  apiKey: process.env.C1_API_KEY,
  baseURL: process.env.C1_BASE_URL,
});

const DEFAULT_SYSTEM_PROMPT = `
You are a helpful and friendly AI assistant. Here are some rules you must follow:

Rules:
- Be clear, concise, and professional.
- Answer in simple language.
- If you do not know the answer, say so honestly.
- Do not expose internal system details.
- Be helpful with coding, writing, and explanations.
`;
class ChatService {
  // Track active message additions to prevent duplicates
  static activeMessageAdditions = new Map();

  // Create a new chat session
  static async createChat(
    userId,
    title = "New Chat",
    tags = [],
    ischatehistry = true,
    subtab = null,
    job_id = null
  ) {
        console.log("job_id>>>>",job_id)
console.log("subtab>>>>",subtab)
    try {
      const chat = await ChatHistory.create({
        user_id: userId,
        // title: title.trim(),
        title: title,
        tags: tags.map((tag) => tag.trim()),
        ischatehistry: ischatehistry,
        subtab,
        job_id
      });

      return chat;
    } catch (error) {
      console.error("ChatService: Failed to create chat:", error);
      throw new Error(`Failed to create chat: ${error.message}`);
    }
  }

  // Add user message to chat
  static async addUserMessage(chatId, userId, content) {
    try {
      if (!content || content.trim() === "") {
        console.warn("Skipped saving empty user message to ChatHistory.");
        return;
      }

      const chat = await ChatHistory.findOne({
        _id: chatId,
        user_id: userId,
      });

      if (!chat) {
        throw new Error("Chat not found");
      }

      const messageData = {
        type: "user",
        content: content.trim(),
        timestamp: new Date(),
      };

      await chat.addMessage(messageData);
      return chat;
    } catch (error) {
      console.error("ChatService: Failed to add user message:", error);
      throw new Error(`Failed to add user message: ${error.message}`);
    }
  }

  // Add assistant message to chat - WITH STRICT DUPLICATE PREVENTION AND SEARCH RESULTS
  static async addAssistantMessage(chatId, userId, content, metadata = {}) {
    const messageKey = `${chatId}-${userId}-${content.trim()}`;

    try {
      // Check if this exact message is currently being processed
      if (this.activeMessageAdditions.has(messageKey)) {
        return this.activeMessageAdditions.get(messageKey);
      }

      // Mark this message as being processed
      const processingPromise = this._processAssistantMessage(
        chatId,
        userId,
        content,
        metadata
      );
      this.activeMessageAdditions.set(messageKey, processingPromise);

      try {
        const result = await processingPromise;
        return result;
      } finally {
        // Clean up the tracking after processing
        this.activeMessageAdditions.delete(messageKey);
      }
    } catch (error) {
      // Clean up on error
      this.activeMessageAdditions.delete(messageKey);
      console.error("ChatService: Failed to add assistant message:", error);
      throw new Error(`Failed to add assistant message: ${error.message}`);
    }
  }

  // Internal method to actually process the assistant message with search results support
  static async _processAssistantMessage(
    chatId,
    userId,
    content,
    metadata = {}
  ) {
    const chat = await ChatHistory.findOne({
      _id: chatId,
      user_id: userId,
    });

    if (!chat) {
      throw new Error("Chat not found");
    }

    // Check for recent duplicate messages (same content within last 10 seconds)
    const now = new Date();
    const tenSecondsAgo = new Date(now.getTime() - 10000);
    const trimmedContent = content.trim();

    const recentDuplicate = chat.messages.find(
      (msg) =>
        msg.type === "assistant" &&
        msg.content === trimmedContent &&
        msg.timestamp >= tenSecondsAgo
    );

    if (recentDuplicate) {
      return chat;
    }

    // Process search results if they exist
    let processedSearchResults = null;
    if (metadata.search_results && Array.isArray(metadata.search_results)) {
      processedSearchResults = metadata.search_results.map((result) => ({
        title: result.title || "",
        url: result.url || "",
        date: result.date || null,
        last_updated: result.last_updated || null,
        snippet: result.snippet || result.description || "",
      }));
    }

    const messageData = {
      type: "assistant",
      content: trimmedContent,
      timestamp: now,
      metadata: {
        ...metadata,
        search_results: processedSearchResults,
      },
    };

    await chat.addMessage(messageData);
    return chat;
  }

  // Get or create chat for user
  static async getOrCreateChat(userId, chatId = null, ischatehistry = true,subtab = null, job_id = null) {

    try {
      if (chatId) {
        const existingChat = await ChatHistory.findOne({
          _id: chatId,
          user_id: userId,
        });
        

        if (existingChat) {
          return existingChat;
        }
      }
      return await this.createChat(userId, "New Chat", [], ischatehistry,subtab,job_id);
    } catch (error) {
      console.error("ChatService: Failed to get or create chat:", error);
      throw new Error(`Failed to get or create chat: ${error.message}`);
    }
  }

  // Get recent chats for user
  static async getRecentChats(userId, limit = 10) {
    try {
      const chats = await ChatHistory.find({ user_id: userId })
        .select("title total_messages last_activity")
        .sort({ last_activity: -1 })
        .limit(limit)
        .lean();

      return chats;
    } catch (error) {
      console.error("ChatService: Failed to get recent chats:", error);
      throw new Error(`Failed to get recent chats: ${error.message}`);
    }
  }

  // Update chat title based on first message
  static async updateChatTitle(chatId, userId) {
    try {
      const chat = await ChatHistory.findOne({
        _id: chatId,
        user_id: userId,
      });

      if (!chat || chat.messages.length === 0) {
        return chat;
      }

      const firstUserMessage = chat.messages.find((msg) => msg.type === "user");
      if (firstUserMessage && chat.title === "New Chat") {
        chat.title =
          firstUserMessage.content.substring(0, 50) +
          (firstUserMessage.content.length > 50 ? "..." : "");
        await chat.save();
      }

      return chat;
    } catch (error) {
      console.error("ChatService: Failed to update chat title:", error);
      throw new Error(`Failed to update chat title: ${error.message}`);
    }
  }

  // Remove duplicate messages from a chat
  static async removeDuplicateMessages(chatId, userId) {
    try {
      const chat = await ChatHistory.findOne({
        _id: chatId,
        user_id: userId,
      });

      if (!chat) {
        throw new Error("Chat not found");
      }

      const uniqueMessages = [];
      const seenMessages = new Map();

      for (const message of chat.messages) {
        // Create a more specific key for duplicate detection
        const messageKey = `${message.type}-${message.content}-${Math.floor(
          message.timestamp.getTime() / 5000
        )}`;

        if (!seenMessages.has(messageKey)) {
          seenMessages.set(messageKey, true);
          uniqueMessages.push(message);
        } else {
          console.log("ChatService: Found duplicate message, removing...");
        }
      }

      if (uniqueMessages.length !== chat.messages.length) {
        chat.messages = uniqueMessages;
        await chat.save();
      }

      return chat;
    } catch (error) {
      console.error("ChatService: Failed to remove duplicates:", error);
      throw new Error(`Failed to remove duplicate messages: ${error.message}`);
    }
  }

  // Get chat with search results analytics
  static async getChatWithSearchAnalytics(chatId, userId) {
    try {
      const chat = await ChatHistory.findOne({
        _id: chatId,
        user_id: userId,
      }).lean();

      if (!chat) {
        throw new Error("Chat not found");
      }

      // Extract search results from messages
      const searchResults = [];
      chat.messages.forEach((message, index) => {
        if (
          message.metadata?.search_results &&
          Array.isArray(message.metadata.search_results)
        ) {
          message.metadata.search_results.forEach((result) => {
            searchResults.push({
              ...result,
              message_index: index,
              timestamp: message.timestamp,
            });
          });
        }
      });

      return {
        ...chat,
        search_analytics: {
          total_searches: searchResults.length,
          unique_domains: [
            ...new Set(
              searchResults.map((r) => {
                try {
                  return new URL(r.url).hostname;
                } catch {
                  return "unknown";
                }
              })
            ),
          ],
          search_results: searchResults,
        },
      };
    } catch (error) {
      console.error(
        "ChatService: Failed to get chat with search analytics:",
        error
      );
      throw new Error(
        `Failed to get chat with search analytics: ${error.message}`
      );
    }
  }

  
  
 static async sendChatMessage({
    message,
    userId,
    history = [],
    systemPrompt,
  }) {
    try {
      const finalSystemPrompt =
        systemPrompt && systemPrompt.trim().length > 0
          ? systemPrompt
          : DEFAULT_SYSTEM_PROMPT;

      const response = await client.chat.completions.create({
        model: "c1/openai/gpt-5/v-20250930",
        messages: [
          {
            role: "system",
            content: finalSystemPrompt,
          },
          ...history,
          {
            role: "user",
            content: message,
          },
        ],
        user: userId,
      });

      return {
        success: true,
        reply: response.choices[0].message.content,
      };
    } catch (error) {
      console.error("Thesys Chat Error:", error);
      return {
        success: false,
        error: error.message,
      };
    }
  }
}

module.exports = ChatService;
