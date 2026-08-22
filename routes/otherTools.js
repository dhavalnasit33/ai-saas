const express = require("express");
const mongoose = require("mongoose");
const slugify = require("slugify");
const OtherTool = require("../models/OtherTools"); // Unified Model
const User = require("../models/User");
const { protect, authorize } = require("../middleware/auth");
const jwt = require("jsonwebtoken");
/**
 * 🏭 FACTORY FUNCTION
 * Call this function with a 'type' (e.g., 'writing', 'career')
 * to generate a complete router for that tool type.
 */
const createOtherToolRouter = (TOOL_TYPE) => {
  const router = express.Router();

  // Helper for messages (e.g. "Health tool created")
  const typeLabel = () =>
    TOOL_TYPE.charAt(0).toUpperCase() + TOOL_TYPE.slice(1);

  // ==========================
  // GET /
  // List with search + popular + favorite filter
  // ==========================
  router.get("/", protect, async (req, res) => {
    try {
      const { search = "", is_popular, is_favorite } = req.query;

      // 🔒 LOCK TO TOOL_TYPE
      const query = { tool_type: TOOL_TYPE, is_active: true };

      // 🔍 Basic Search
      if (search) {
        query.$or = [
          { name: { $regex: search, $options: "i" } },
          { description: { $regex: search, $options: "i" } },
        ];
      }

      // ⭐ Popular Filter
      if (typeof is_popular !== "undefined") {
        query.is_popular = is_popular === "true";
      }

      // ❤️ Favorite Filter (using Bookmarks logic)
      let userBookmarks = [];
      if (req.user?.id) {
        const user = await User.findById(req.user.id).select("bookmarks");
        if (user?.bookmarks) userBookmarks = user.bookmarks;
      }

      if (is_favorite === "true") {
        const bookmarkedTools = userBookmarks.filter(
          (b) => b.modelName === "OtherTool"
        );

        if (!bookmarkedTools.length)
          return res.json({ success: true, data: [] });

        const ids = bookmarkedTools.map((b) => b.itemId.toString());
        query._id = { $in: ids.map((id) => new mongoose.Types.ObjectId(id)) };
      }

      const tools = await OtherTool.find(query)
        .populate("created_by", "name")
        .populate("tags", "name")
        .sort({ createdAt: -1 })
        .lean();

      // 🏷️ Add flags
      const toolsWithFlags = tools.map((tool) => {
        const isBookmarked = userBookmarks.some(
          (b) => b.itemId.toString() === tool._id.toString()
        );

        return {
          ...tool,

          // ✅ New fields you want
          title: tool.name,
          tab_image: tool.icon,

          // ❌ Remove original fields
          name: undefined,
          icon: undefined,

          is_favorite: isBookmarked,
          bookmarked: isBookmarked,
          model_name: "OtherTool",
          tool_type: TOOL_TYPE,
        };
      });

      res.json({ success: true, data: toolsWithFlags });

      // 🚀 STEP 1: Fetch ONLY necessary fields & Populate Category info
      // const tools = await OtherTool.find(query)
      //   .select("name icon short_description description slug categories tags custom_url") // 👈 Only getting these fields
      //   .populate("categories", "name display_name icon description") // 👈 Need details for the Group Header
      //   .sort({ createdAt: -1 })
      //   .lean();

      // // 🔄 STEP 2: Group by Category
      // const groupedData = {};

      // tools.forEach((tool) => {
      //   // Logic: Take the first category as the "Main" category for grouping
      //   const primaryCategory =
      //     tool.categories && tool.categories[0]
      //       ? tool.categories[0]
      //       : { name: "uncategorized", display_name: "Uncategorized", icon: "" };

      //   const groupKey = primaryCategory.name;

      //   // Initialize the category group if it doesn't exist yet
      //   if (!groupedData[groupKey]) {
      //     groupedData[groupKey] = {
      //       category: primaryCategory.name,
      //       display_name: primaryCategory.display_name || primaryCategory.name,
      //       icon: primaryCategory.icon || "",
      //       description: primaryCategory.description || "",
      //       items: [],
      //     };
      //   }

      //   const isBookmarked = userBookmarks.some(
      //     (b) => b.itemId.toString() === tool._id.toString()
      //   );

      //   // Add the cleaned-up item to the category
      //   groupedData[groupKey].items.push({
      //     _id: tool._id,
      //     model_name: "OtherTool", // Matches your desired structure
      //     tab_image: tool.icon, // Remapped from icon
      //     short_description: tool.short_description,
      //     description: tool.description,
      //     title: tool.name, // Remapped from name
      //     slug: tool.slug,
      //     custom_url: tool.custom_url,
      //     category: groupKey,
      //     categories: tool.categories.map((c) => c._id), // Return IDs here as per your request
      //     tags: tool.tags,
      //     bookmarked: isBookmarked,
      //   });
      // });

      // // Convert object to array
      // const responseData = Object.values(groupedData);

      // res.json({ success: true, data: responseData });
    } catch (error) {
      console.error(`❌ Error fetching ${TOOL_TYPE} tools:`, error);
      res.status(500).json({ success: false, message: "Server error" });
    }
  });

  // ==========================
  // GET /admin
  // Paginated list for Admin Dashboard
  // ==========================
  router.get("/admin", protect, async (req, res) => {
    try {
      const { search = "", page = 1, limit = 10, is_popular } = req.query;

      const skip = (Number(page) - 1) * Number(limit);
      const query = { tool_type: TOOL_TYPE }; // 🔒 Lock type

      if (search) {
        query.$or = [
          { name: { $regex: search, $options: "i" } },
          { description: { $regex: search, $options: "i" } },
        ];
      }

      if (typeof is_popular !== "undefined")
        query.is_popular = is_popular === "true";

      const [tools, total] = await Promise.all([
        OtherTool.find(query)
          .populate("created_by", "name")
          .populate("tags", "name")
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(Number(limit))
          .lean(),
        OtherTool.countDocuments(query),
      ]);

      res.json({
        success: true,
        data: tools,
        pagination: {
          current: Number(page),
          pages: Math.ceil(total / limit),
          total,
        },
      });
    } catch (error) {
      console.error(`Error fetching admin ${TOOL_TYPE} tools:`, error);
      res.status(500).json({ success: false, message: "Server error" });
    }
  });

  // ==========================
  // GET /slug/:slug
  // ==========================
  // router.get("/slug/:slug", async (req, res) => {
  //   try {
  //     const tool = await OtherTool.findOne({
  //       slug: req.params.slug,
  //       tool_type: TOOL_TYPE,
  //     }).populate("created_by", "name");


  //     if (!tool)
  //       return res
  //         .status(404)
  //         .json({ success: false, message: "Tool not found" });

  //     res.json({ success: true, data: tool });
  //   } catch (error) {
  //     res.status(500).json({ success: false, message: "Server error" });
  //   }
  // });

  router.get("/slug/:slug", async (req, res) => {
    try {
      // 1. Fetch the tool (Use .lean() to make the result a plain JS object we can modify)
      const tool = await OtherTool.findOne({
        slug: req.params.slug,
        tool_type: TOOL_TYPE,
      })
        .populate("created_by", "name")
        .populate("tags", "name")
        .lean();

      if (!tool)
        return res
          .status(404)
          .json({ success: false, message: "Tool not found" });

      // 2. Optional Auth Check: Check if user is logged in to determine 'bookmarked' status
      let isBookmarked = false;
      let token;

      if (
        req.headers.authorization &&
        req.headers.authorization.startsWith("Bearer")
      ) {
        try {
          // Extract token
          token = req.headers.authorization.split(" ")[1];

          // Verify token (Ensure JWT_SECRET matches your .env file)
          const decoded = jwt.verify(token, process.env.JWT_SECRET);

          // Find user's bookmarks
          const user = await User.findById(decoded.id).select("bookmarks");

          if (user && user.bookmarks) {
            isBookmarked = user.bookmarks.some(
              (b) =>
                b.itemId.toString() === tool._id.toString() &&
                b.modelName === "OtherTool"
            );
          }
        } catch (authError) {
          // If token is invalid/expired, we just ignore it and treat them as a guest
          console.log("Optional auth check failed:", authError.message);
        }
      }

      // 3. Merge data and send response
      res.json({
        success: true,
        data: {
          ...tool,
          model_name: "OtherTool",
          // is_favorite: isBookmarked, // Common flag for frontend
          bookmarked: isBookmarked,  // Explicit flag
        },
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ success: false, message: "Server error" });
    }
  });

  // ==========================
  // GET /:id
  // ==========================
  router.get("/:id", async (req, res) => {
    try {
      const tool = await OtherTool.findOne({
        _id: req.params.id,
        tool_type: TOOL_TYPE,
      })
        .populate("created_by", "name")
        .populate("tags", "name");

      if (!tool)
        return res
          .status(404)
          .json({ success: false, message: "Tool not found" });

      res.json({ success: true, data: tool });
    } catch (error) {
      res.status(500).json({ success: false, message: "Server error" });
    }
  });

  // ==========================
  // POST / (Create)
  // ==========================
  router.post("/", protect, authorize("Admin"), async (req, res) => {
    try {
      const toolData = {
        ...req.body,
        created_by: req.user.id,
        tool_type: TOOL_TYPE, // 🔒 Auto-assign type
      };

      // Removed Category Validation Logic

      const tool = new OtherTool(toolData);
      await tool.save();

      res.status(201).json({
        success: true,
        message: `${typeLabel()} tool created successfully`,
        data: tool,
      });
    } catch (error) {
      console.error("Error creating tool:", error);
      if (error.name === "ValidationError") {
        const messages = Object.values(error.errors).map((val) => val.message);
        return res.status(400).json({
          success: false,
          message: "Validation error",
          errors: messages,
        });
      }
      res.status(500).json({ success: false, message: "Server error" });
    }
  });

  // ==========================
  // PUT /:id (Update)
  // ==========================
  router.put("/:id", protect, authorize("Admin"), async (req, res) => {
    try {
      delete req.body.tool_type; // Prevent type switching
      const updateData = { ...req.body };

      // Slug Regen Logic
      if (updateData.name) {
        const slugified = slugify(updateData.name, {
          lower: true,
          strict: true,
          trim: true,
          remove: /[*+~.()'"!:@]/g,
        });
        let slug = slugified;
        let counter = 1;
        while (await OtherTool.findOne({ slug, _id: { $ne: req.params.id } })) {
          slug = `${slugified}-${counter++}`;
        }
        updateData.slug = slug;
      }

      const updatedTool = await OtherTool.findOneAndUpdate(
        { _id: req.params.id, tool_type: TOOL_TYPE },
        updateData,
        { new: true, runValidators: true }
      );

      if (!updatedTool)
        return res
          .status(404)
          .json({ success: false, message: "Tool not found" });

      res.json({ success: true, message: "Tool updated", data: updatedTool });
    } catch (error) {
      res.status(500).json({ success: false, message: "Server error" });
    }
  });

  // ==========================
  // PATCH /:id/toggle
  // ==========================
  router.patch("/:id/toggle", protect, authorize("Admin"), async (req, res) => {
    try {
      const tool = await OtherTool.findOne({
        _id: req.params.id,
        tool_type: TOOL_TYPE,
      });
      if (!tool)
        return res
          .status(404)
          .json({ success: false, message: "Tool not found" });

      tool.is_active = !tool.is_active;
      await tool.save();

      res.json({
        success: true,
        message: `Tool ${tool.is_active ? "activated" : "deactivated"}`,
        data: { is_active: tool.is_active },
      });
    } catch (error) {
      res.status(500).json({ success: false, message: "Server error" });
    }
  });

  // ==========================
  // PATCH /:id/toggle-popular
  // ==========================
  router.patch(
    "/:id/toggle-popular",
    protect,
    authorize("Admin"),
    async (req, res) => {
      try {
        const tool = await OtherTool.findOne({
          _id: req.params.id,
          tool_type: TOOL_TYPE,
        });
        if (!tool)
          return res
            .status(404)
            .json({ success: false, message: "Tool not found" });

        tool.is_popular = !tool.is_popular;
        await tool.save();

        res.json({
          success: true,
          message: `Tool popular status updated`,
          data: { is_popular: tool.is_popular },
        });
      } catch (error) {
        res.status(500).json({ success: false, message: "Server error" });
      }
    }
  );

  // ==========================
  // DELETE /:id
  // ==========================
  router.delete("/:id", protect, authorize("Admin"), async (req, res) => {
    try {
      const tool = await OtherTool.findOneAndDelete({
        _id: req.params.id,
        tool_type: TOOL_TYPE,
      });
      if (!tool)
        return res
          .status(404)
          .json({ success: false, message: "Tool not found" });

      res.json({ success: true, message: "Tool deleted successfully" });
    } catch (error) {
      res.status(500).json({ success: false, message: "Server error" });
    }
  });

  // ==========================
  // DELETE / (Bulk)
  // ==========================
  router.delete("/", protect, authorize("Admin"), async (req, res) => {
    const tools = req.body;
    if (!Array.isArray(tools) || tools.length === 0)
      return res
        .status(400)
        .json({ success: false, message: "Provide tools to delete" });

    const deleteIds = tools.map((t) => t.id);

    try {
      const result = await OtherTool.deleteMany({
        _id: { $in: deleteIds },
        tool_type: TOOL_TYPE, // Safety check
      });
      res.json({
        success: true,
        message: `${result.deletedCount} tools deleted successfully`,
      });
    } catch (error) {
      res.status(500).json({ success: false, message: "Server error" });
    }
  });

  return router;
};

module.exports = createOtherToolRouter;
