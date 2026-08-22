const express = require("express");
const EditorPage = require("../models/EditorPage");
const Notification = require("../models/Notification");
const { protect } = require("../middleware/auth");
const User = require("../models/User");
const { DUMMY_TEMPLATES } = require("../Templates/welcome");
const { sendTemplateEmail } = require("../utils/sendgridService");
const crypto = require("crypto");
const Invite = require("../models/Invite");

const router = express.Router();

async function checkAccess(pageId, userId, required = "view") {
  let currentPageId = pageId;

  // Walk UP the page tree (child → parent)
  for (let i = 0; i < 20; i++) {
    if (!currentPageId) break; // End of chain

    const page = await EditorPage.findById(currentPageId);
    if (!page || page.isInTrash) break; // Stop if page missing or in trash

    // 1️⃣ OWNER or SHARED USER (If logged in)
    if (userId) {
      if (page.user.toString() === userId.toString()) {
        return { canView: true, canEdit: true };
      }
      const shared = page.sharedWith?.find(
        (s) => s.user.toString() === userId.toString(),
      );
      if (shared) {
        // If I need 'edit' but only have 'view', this specific page denies me.
        // However, we usually return what we found.
        // If we found specific shared access, we usually honor it immediately.
        return {
          canView: true,
          canEdit: shared.access === "edit",
        };
      }
    }

    // 2️⃣ PUBLIC LINK (Inheritance)
    // If we find explicit public access, we honor it.
    if (page.publicAccess === "edit") {
      return { canView: true, canEdit: true };
    }

    if (page.publicAccess === "view") {
      // If we only need view, this is sufficient.
      if (required === "view") {
        return { canView: true, canEdit: false };
      }
      // If we need 'edit' but found 'view', we technically found a permission,
      // but it's not enough. However, a parent might be 'edit'.
      // If we are at the ROOT of the public chain, we stop.
      // But typically, we continue looking up in case a parent grants 'edit'.
    }

    // 3️⃣ MOVE UP
    currentPageId = page.parentId;
  }

  return { canView: false, canEdit: false };
}

function extractMentionedUserIds(doc) {
  const ids = []; // Changed from new Set()

  function walk(node, depth = 0) {
    if (!node) return;

    if (node.type === "mention") {
      const userId = node.attrs?.id || node.attrs?.["data-id"];

      if (userId) {
        // Push every occurrence
        ids.push(String(userId));
      }
    }

    if (Array.isArray(node.content)) {
      node.content.forEach((child) => walk(child, depth + 1));
    }
  }

  const contentToWalk = typeof doc === "string" ? JSON.parse(doc) : doc;
  walk(contentToWalk);

  return ids;
}

function parseLineContent(line) {
  // Split the line by **...** to isolate bold parts
  const parts = line.split(/(\*\*.*?\*\*)/g);
  const contentArray = [];

  parts.forEach((part) => {
    if (!part) return; // Skip empty strings

    if (part.startsWith("**") && part.endsWith("**")) {
      // This part is bold
      contentArray.push({
        type: "text",
        marks: [{ type: "bold" }], // This is TipTap's bold tag!
        text: part.slice(2, -2), // Remove the ** from the actual text
      });
    } else {
      // Normal plain text
      contentArray.push({
        type: "text",
        text: part,
      });
    }
  });

  return contentArray;
}

// 1. GET ALL PAGES (Non-Trash)
router.get("/", protect, async (req, res) => {
  try {
    const pages = await EditorPage.find({
      user: req.user.id,
      isInTrash: false,
    })
      // ✅ FIX: You MUST include "isFavorite" in the select string
      .select("title parentId order isFavorite isPublic sharedWith")
      .sort({ parentId: 1, order: 1 });

    res.json({ success: true, data: pages });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get("/:id/mention-users", protect, async (req, res) => {
  try {
    const pageId = req.params.id;
    const { search = "" } = req.query;
    const requesterId = req.user.id; // The ID of the person currently typing

    // 1. Check Access (Existing logic)
    const access = await checkAccess(pageId, requesterId, "view");
    if (!access.canView) {
      return res.status(403).json({
        success: false,
        message: "Access denied",
      });
    }

    // 2. Fetch the Page to get the 'sharedWith' list and 'owner'
    const page = await EditorPage.findById(pageId);

    if (!page) {
      return res
        .status(404)
        .json({ success: false, message: "Page not found" });
    }

    // 3. Build the Allowed List
    // Start with the users explicitly shared on this page
    const allowedIds = page.sharedWith.map((share) => share.user.toString());

    // Add the page owner to the list (so you can mention the owner if you are a guest)
    allowedIds.push(page.user.toString());

    // 4. EXCLUDE YOURSELF (The Fix)
    // Filter out the ID of the person making the request
    const finalAllowedIds = allowedIds.filter((id) => id !== requesterId);

    // 5. Search Database only for users in 'finalAllowedIds'
    const users = await User.find({
      _id: { $in: finalAllowedIds }, // <--- Only show specific allowed users
      $or: [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
      ],
      status: "active",
    })
      .select("_id name email avatar")
      .limit(10);

    res.json({
      success: true,
      data: users.map((u) => ({
        id: u._id,
        name: u.name,
        email: u.email,
        avatar: u.avatar,
      })),
    });
  } catch (err) {
    console.error("Mention users error:", err);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
});

// 2. GET TRASHED PAGES
router.get("/trash", protect, async (req, res) => {
  try {
    const pages = await EditorPage.find({
      user: req.user.id,
      isInTrash: true,
    })
      .select("title parentId deletedAt")
      .sort({ updatedAt: -1 });

    res.json({ success: true, data: pages });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 3. CREATE PAGE
router.post("/", protect, async (req, res) => {
  try {
    // 1. Extract 'title' along with 'parentId' from the request body
    const { parentId, title } = req.body;

    // Find last order under same parent
    const lastSibling = await EditorPage.findOne({
      user: req.user.id,
      parentId: parentId || null,
      isInTrash: false,
    }).sort({ order: -1 });

    const newOrder = lastSibling ? lastSibling.order + 1 : 1;

    // 2. Determine the final title.
    // If a valid title is passed, use it. Otherwise, fallback to "Untitled".
    const finalTitle = title && title.trim() !== "" ? title.trim() : "Untitled";

    const newPage = await EditorPage.create({
      user: req.user.id,
      title: finalTitle, // 3. Use the dynamic title here
      parentId: parentId || null,
      order: newOrder,
      content: {},
      isFavorite: false,
    });

    res.status(201).json({ success: true, data: newPage });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 4. RENAME PAGE
router.put("/:id/rename", protect, async (req, res) => {
  try {
    const { title } = req.body;
    const page = await EditorPage.findOneAndUpdate(
      { _id: req.params.id, user: req.user.id },
      { title },
      { new: true },
    );
    res.json({ success: true, data: page });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get("/shared-with-me", protect, async (req, res) => {
  try {
    const myId = req.user.id;

    // 1. Find "Root" pages explicitly shared with me
    const sharedRoots = await EditorPage.find({
      "sharedWith.user": myId,
      isInTrash: false,
    })
      .populate({
        path: "user",
        select: "name email",
      })
      // We explicitly need sharedWith to identify roots in frontend
      .select("title parentId createdAt sharedWith user content publicAccess");

    // 2. Find descendants (children) of these shared pages
    // We use a simple loop to fetch children layer by layer
    let allSharedPages = [...sharedRoots];
    let queue = [...sharedRoots];
    let iterations = 0;

    while (queue.length > 0 && iterations < 50) {
      const parentIds = queue.map((p) => p._id);
      queue = []; // Clear for next batch

      if (parentIds.length === 0) break;

      // Find children where parent is in the current batch
      // AND the child belongs to the same owner (safety check)
      const children = await EditorPage.find({
        parentId: { $in: parentIds },
        isInTrash: false,
      })
        .populate({ path: "user", select: "name email" })
        .select(
          "title parentId createdAt sharedWith user content publicAccess",
        );

      if (children.length > 0) {
        allSharedPages = [...allSharedPages, ...children];
        queue = [...children]; // Add children to queue to find THEIR children
      }
      iterations++;
    }

    // 3. Remove duplicates (in case of cyclic or overlapping queries)
    const uniquePages = Array.from(
      new Map(allSharedPages.map((p) => [p._id.toString(), p])).values(),
    );

    res.json({ success: true, data: uniquePages });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// editorPages.js
router.get("/:id/content", protect, async (req, res) => {
  const userId = req.user?.id || null;
  const access = await checkAccess(req.params.id, userId, "view");

  if (!access.canView) {
    return res.status(403).json({ message: "Access denied" });
  }

  // ✅ POPULATE sharedWith.user to get emails and names
  const page = await EditorPage.findById(req.params.id).populate(
    "sharedWith.user",
    "name email",
  );

  res.json({
    success: true,
    data: page.content,
    canEdit: access.canEdit,
    title: page.title,
    sharedWith: page.sharedWith, // ✅ This now contains user objects with emails
    publicAccess: page.publicAccess,
  });
});

router.post("/:id/notify-mention", protect, async (req, res) => {
  try {
    const { mentionedUserId } = req.body;
    const pageId = req.params.id;
    const actorId = req.user.id;

    if (!mentionedUserId)
      return res.status(400).json({ message: "Missing user ID" });
    if (mentionedUserId === actorId) return res.json({ success: true }); // Don't notify self

    // Create the notification immediately
    await Notification.create({
      user: mentionedUserId,
      actor: actorId,
      page: pageId,
      type: "mention",
      message: "You were mentioned in a page",
      isRead: false,
    });

    res.json({ success: true });
  } catch (err) {
    console.error("Notify error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

router.put("/:id/content", protect, async (req, res) => {
  try {
    const userId = req.user.id;
    const pageId = req.params.id;
    const content = req.body.content;

    const access = await checkAccess(pageId, userId, "edit");
    if (!access.canEdit) {
      return res.status(403).json({ message: "Read only access" });
    }

    // ✅ FIX: Just save content. DO NOT trigger notifications here.
    // This prevents the "14 notifications" bug caused by auto-save.
    await EditorPage.findByIdAndUpdate(pageId, { content });

    res.json({ success: true });
  } catch (err) {
    console.error("Save error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// 7. SOFT DELETE (Trash)
router.delete("/:id", protect, async (req, res) => {
  try {
    const pageId = req.params.id;

    // Recursive helper to find all children
    const getDescendants = async (parentId) => {
      const children = await EditorPage.find({ parentId, user: req.user.id });
      let ids = children.map((c) => c._id);
      for (const child of children) {
        const grandChildren = await getDescendants(child._id);
        ids = [...ids, ...grandChildren];
      }
      return ids;
    };

    const descendants = await getDescendants(pageId);
    const idsToTrash = [pageId, ...descendants];

    // Mark all as in trash
    await EditorPage.updateMany(
      { _id: { $in: idsToTrash }, user: req.user.id },
      { $set: { isInTrash: true } },
    );

    res.json({ success: true, deletedIds: idsToTrash });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 8. RESTORE PAGE
router.put("/:id/restore", protect, async (req, res) => {
  try {
    const pageId = req.params.id;
    const page = await EditorPage.findOne({ _id: pageId, user: req.user.id });
    if (!page) return res.status(404).json({ message: "Page not found" });

    // Check if parent is in trash. If so, move this page to root (null)
    if (page.parentId) {
      const parent = await EditorPage.findOne({
        _id: page.parentId,
        isInTrash: true,
      });
      if (parent) {
        page.parentId = null;
      }
    }

    page.isInTrash = false;
    await page.save();

    res.json({ success: true, data: page });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get("/public/:id", async (req, res) => {
  try {
    // Check view access (Recursive)
    const access = await checkAccess(req.params.id, null, "view");

    if (!access.canView) {
      return res.status(404).json({
        success: false,
        message: "Page is private or does not exist",
      });
    }

    const page = await EditorPage.findById(req.params.id);
    res.json({
      success: true,
      data: {
        title: page.title,
        content: page.content,
        canEdit: access.canEdit,
      },
      // Explicitly return these so frontend logic works easily
      canEdit: access.canEdit,
      title: page.title,
      content: page.content,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error" });
  }
});

router.get("/public-edit/:id", async (req, res) => {
  try {
    // Check edit access (Recursive)
    const access = await checkAccess(req.params.id, null, "edit");

    if (!access.canEdit) {
      return res.status(403).json({ message: "Edit not allowed" });
    }

    const page = await EditorPage.findById(req.params.id);
    res.json({
      title: page.title,
      content: page.content,
      canEdit: true,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// ✅ NEW: Public Save Route (No 'protect' middleware)
// Allows guests to save if they have inherited edit permissions
router.put("/public/:id/content", async (req, res) => {
  try {
    const pageId = req.params.id;

    // Check for "edit" permission recursively
    const access = await checkAccess(pageId, null, "edit");

    if (!access.canEdit) {
      return res.status(403).json({ message: "Edit permission denied" });
    }

    await EditorPage.findByIdAndUpdate(pageId, {
      content: req.body.content,
    });

    res.json({ success: true });
  } catch (err) {
    console.error("Public save error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// 9. PERMANENT DELETE
router.delete("/:id/permanent", protect, async (req, res) => {
  try {
    await EditorPage.deleteOne({ _id: req.params.id, user: req.user.id });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.put("/:id/move", protect, async (req, res) => {
  try {
    const { parentId } = req.body;
    const pageId = req.params.id;

    // 1. Prevent self-parenting (You already had this)
    if (pageId === parentId) {
      return res.status(400).json({ message: "Cannot move page into itself" });
    }

    // 2. SAFETY CHECK: If moving to a parent, ensure that parent actually exists
    if (parentId) {
      const parentExists = await EditorPage.findById(parentId);
      if (!parentExists) {
        return res
          .status(404)
          .json({ message: "Target parent page not found" });
      }

      // 3. ADVANCED SAFETY: Prevent moving a parent inside its own child
      // (This loop prevents the page tree from breaking)
      let current = parentExists;
      while (current.parentId) {
        if (current.parentId.toString() === pageId) {
          return res.status(400).json({
            message: "Cannot move a parent page inside its own child",
          });
        }
        // Move up the tree to check the next parent
        current = await EditorPage.findById(current.parentId);
      }
    }

    // 4. Perform the update
    const page = await EditorPage.findOneAndUpdate(
      { _id: pageId, user: req.user.id },
      { parentId: parentId || null },
      { new: true },
    );

    if (!page) {
      return res
        .status(404)
        .json({ message: "Page not found or unauthorized" });
    }

    res.json({ success: true, data: page });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post("/normalize-orders", protect, async (req, res) => {
  const pages = await EditorPage.find({
    user: req.user.id,
    isInTrash: false,
  }).sort({ parentId: 1, order: 1 });

  let lastParent = null;
  let index = 1;

  for (const page of pages) {
    if (!page.parentId || !page.parentId.equals(lastParent)) {
      index = 1;
      lastParent = page.parentId;
    }

    page.order = index++;
    await page.save();
  }

  res.json({ success: true });
});

// 11. TOGGLE FAVORITE
router.put("/:id/favorite", protect, async (req, res) => {
  try {
    const { isFavorite } = req.body;
    const page = await EditorPage.findOneAndUpdate(
      { _id: req.params.id, user: req.user.id },
      { isFavorite },
      { new: true },
    );
    res.json({ success: true, data: page });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 12. DUPLICATE PAGE
router.post("/:id/duplicate", protect, async (req, res) => {
  try {
    const originalPage = await EditorPage.findOne({
      _id: req.params.id,
      user: req.user.id,
    });
    if (!originalPage)
      return res.status(404).json({ message: "Page not found" });

    const newPage = await EditorPage.create({
      user: req.user.id,
      title: `${originalPage.title} (Copy)`,
      parentId: originalPage.parentId, // Keep in same folder
      content: originalPage.content, // Deep copy content
      isFavorite: false,
      isInTrash: false,
    });

    res.status(201).json({ success: true, data: newPage });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 13. BULK REORDER PAGES (SAME PARENT)
router.put("/reorder", protect, async (req, res) => {
  try {
    const { parentId, orders } = req.body;

    if (!Array.isArray(orders) || orders.length === 0) {
      return res.status(400).json({ message: "Orders array is required" });
    }

    const bulkOps = orders.map((item) => ({
      updateOne: {
        filter: {
          _id: item.id,
          user: req.user.id,
          parentId: parentId ?? null,
        },
        update: {
          $set: { order: item.order },
        },
      },
    }));

    await EditorPage.bulkWrite(bulkOps);

    res.json({ success: true });
  } catch (err) {
    console.error("Bulk reorder error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

router.put("/:id/share", protect, async (req, res) => {
  const { publicAccess } = req.body; // "view" | "edit" | "none"

  const page = await EditorPage.findOne({
    _id: req.params.id,
    user: req.user.id,
  });

  page.publicAccess = publicAccess;
  await page.save();

  res.json({ success: true });
});

router.post("/:id/invite", protect, async (req, res) => {
  try {
    const { email, access } = req.body;
    const inviter = req.user;

    // 🧹 Clean the email to prevent " user@test.com " mismatches
    const cleanEmail = email ? email.trim().toLowerCase() : "";

    if (!cleanEmail) {
      return res.status(400).json({ message: "Valid email is required" });
    }

    // 🔍 Find invited user
    const invitedUser = await User.findOne({ email: cleanEmail });
    if (!invitedUser) {
      return res.status(404).json({ message: "User not found" });
    }

    // 📄 Find page (Ensure the requester actually owns it)
    const page = await EditorPage.findOne({
      _id: req.params.id,
      user: inviter.id,
    });

    if (!page) {
      return res
        .status(404)
        .json({ message: "Page not found or unauthorized" });
    }

    // 🔁 Share access logic
    const existingIndex = page.sharedWith.findIndex(
      (s) => s.user.toString() === invitedUser._id.toString(),
    );

    if (existingIndex >= 0) {
      // Update existing permission
      page.sharedWith[existingIndex].access = access;
    } else {
      // Add new permission
      page.sharedWith.push({
        user: invitedUser._id,
        access,
      });
    }

    await page.save();

    // ========================
    // 🔗 GENERATE DYNAMIC LINK
    // ========================
    // Logic: If they have edit access, send to editor. If view, send to preview.
    const action = access === "edit" ? "edit" : "preview";

    // NOTE: Ensure your Frontend handles /preview/:id by calling the Authenticated API
    const documentLink = `${process.env.FRONTEND_URL}/doc-editor`;

    // ========================
    // ✉️ SEND EMAIL
    // ========================
    await sendTemplateEmail({
      to: cleanEmail,
      subject: `${inviter.name} shared a page with you: ${page.title}`,
      templateName: "fileShared",
      fromName: `${inviter.name} (via OneChat AI)`,
      variables: {
        senderName: inviter.name,
        itemName: page.title || "Untitled Page",
        type: "Page",
        accessUrl: documentLink,
        isGuest: false,
        signupUrl: `${process.env.FRONTEND_URL}`,
      },
    });

    res.json({ success: true, message: "Page invited successfully" });
  } catch (error) {
    console.error("❌ Page invite error:", error.message);
    res.status(500).json({ success: false, message: "Invite failed" });
  }
});

// [NEW] Get Public Page Branch (The root page + all descendants)
router.get("/public/:id/branch", async (req, res) => {
  try {
    const rootId = req.params.id;

    // 1. Verify access (Recursive check ensures the root or its parent is public)
    const access = await checkAccess(rootId, null, "view");
    if (!access.canView) {
      return res.status(403).json({ message: "Access denied" });
    }

    const rootPage = await EditorPage.findById(rootId);
    if (!rootPage) return res.status(404).json({ message: "Root not found" });

    // 2. Fetch all nested pages
    let branch = [rootPage];
    let queue = [rootId];
    let iterations = 0;

    // Safety loop to prevent infinite recursion
    while (queue.length > 0 && iterations < 20) {
      const parentIds = queue;
      queue = [];

      const children = await EditorPage.find({
        parentId: { $in: parentIds },
        isInTrash: false,
      }).select(
        "title parentId order isFavorite isPublic sharedWith publicAccess",
      );

      if (children.length > 0) {
        branch = [...branch, ...children];
        queue = children.map((c) => c._id);
      }
      iterations++;
    }

    res.json({ success: true, data: branch });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.delete("/:id/invite/:userId", protect, async (req, res) => {
  try {
    const pageId = req.params.id;
    const userToRemove = req.params.userId;

    // 1. Recursive helper to find all sub-page IDs
    const getDescendants = async (parentId) => {
      const children = await EditorPage.find({ parentId, user: req.user.id });
      let ids = children.map((c) => c._id);
      for (const child of children) {
        const grandChildren = await getDescendants(child._id);
        ids = [...ids, ...grandChildren];
      }
      return ids;
    };

    const descendants = await getDescendants(pageId);
    const allPageIds = [pageId, ...descendants];

    // 2. Remove the specific user from the 'sharedWith' array across all identified pages
    await EditorPage.updateMany(
      { _id: { $in: allPageIds }, user: req.user.id },
      { $pull: { sharedWith: { user: userToRemove } } },
    );

    res.json({
      success: true,
      message: "Access removed from page and all sub-pages",
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.put("/:id/append-content", protect, async (req, res) => {
  try {
    const pageId = req.params.id;
    const { newContent } = req.body;

    // 1. Check if user has edit access
    const access = await checkAccess(pageId, req.user.id, "edit");
    if (!access || !access.canEdit) {
      return res
        .status(403)
        .json({ success: false, message: "Not authorized" });
    }

    // 2. Fetch the page using .lean()
    // .lean() strips Mongoose tracking and gives us a pure JavaScript object
    const page = await EditorPage.findById(pageId).lean();
    if (!page) {
      return res
        .status(404)
        .json({ success: false, message: "Page not found" });
    }

    // 3. Ensure the page content has a valid TipTap structure
    let docContent = page.content;
    if (!docContent || docContent.type !== "doc") {
      docContent = { type: "doc", content: [] };
    }
    if (!Array.isArray(docContent.content)) {
      docContent.content = [];
    }

    // 4. Convert the new AI text into TipTap paragraph blocks
    const lines = newContent.split("\n");
    const newBlocks = lines
      .filter((line) => line.trim() !== "") // remove empty lines
      .map((line, index) => ({
        type: "paragraph",
        attrs: {
          id: Date.now().toString() + "-" + index.toString(),
          textAlign: null,
          backgroundColor: null,
          nodeTextAlign: null,
          nodeVerticalAlign: null,
        },
        // REPLACE your old code: content: [{ type: "text", text: line }],
        // WITH THIS:
        content: parseLineContent(line),
      }));

    // 5. Append the new blocks to the bottom of the existing content
    docContent.content = [...docContent.content, ...newBlocks];

    // 6. FORCE SAVE using findByIdAndUpdate
    // This explicitly tells MongoDB to overwrite the content object, bypassing Mongoose tracking bugs
    await EditorPage.findByIdAndUpdate(pageId, {
      $set: { content: docContent },
    });

    res.json({ success: true });
  } catch (err) {
    console.error("Append content error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});
module.exports = router;
