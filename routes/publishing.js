const express = require("express");
const router = express.Router();
const sanitizeHtml = require("sanitize-html");
const { protect, authorize } = require("../middleware/auth");
const { s3ClientCms } = require("../utils/s3Client");
const { PutObjectCommand, DeleteObjectCommand } = require("@aws-sdk/client-s3");
const axios = require("axios");
const {
  publishLimiter,
  autosaveLimiter,
  publishingApiLimiter,
} = require("../middleware/rateLimiter");

// Models
const MasterTemplate = require("../models/MasterTemplate");
const UserProject = require("../models/UserProject");
const ProjectVersion = require("../models/ProjectVersion");
const PublishedHostname = require("../models/PublishedHostname");

// Constants
const DO_BUCKET_NAME = process.env.DO_BUCKET_NAME_CMS || "onechatai-cms";
const COOLDOWN_DAYS = 7;
const RESERVED_SLUGS = [
  "www",
  "app",
  "api",
  "admin",
  "mail",
  "login",
  "account",
  "billing",
  "support",
  "help",
  "status",
  "docs",
  "blog",
  "dashboard",
  "onechat",
  "onechatai",
  "secure",
  "verify",
  "payment",
];

// @desc    Check if a subdomain slug is available, and return suggestions if taken
// @route   GET /api/publishing/check-subdomain
// @access  Private
router.get("/publishing/check-subdomain", protect, async (req, res) => {
  try {
    const { slug, projectId } = req.query;
    if (!slug) {
      return res.status(400).json({ success: false, message: "Slug is required" });
    }

    const cleanedSlug = slug.toLowerCase().trim();
    const slugRegex = /^[a-z0-9]+(-[a-z0-9]+)*$/;

    // 1. Format validation
    if (!slugRegex.test(cleanedSlug) || cleanedSlug.length < 3 || cleanedSlug.length > 63) {
      return res.json({
        success: true,
        available: false,
        message: "Invalid format. Must be 3-63 lowercase alphanumeric characters, optionally separated by hyphens.",
        suggestions: []
      });
    }

    // 2. Reserved slugs check
    if (RESERVED_SLUGS.includes(cleanedSlug)) {
      return res.json({
        success: true,
        available: false,
        message: "Subdomain is reserved.",
        suggestions: [
          `${cleanedSlug}-site`,
          `${cleanedSlug}-app`,
          `${cleanedSlug}1`
        ]
      });
    }

    // 3. Database check
    const targetHostname = `${cleanedSlug}.onechatai.site`;
    const existing = await PublishedHostname.findOne({ hostname: targetHostname });

    if (!existing || (projectId && existing.projectId.toString() === projectId.toString())) {
      return res.json({ success: true, available: true });
    }

    // 4. Generate suggestions if taken
    const suggestions = [];
    const candidates = [
      `${cleanedSlug}-site`,
      `${cleanedSlug}-app`,
      `${cleanedSlug}1`,
      `${cleanedSlug}2`,
      `${cleanedSlug}-page`
    ];

    for (const cand of candidates) {
      const candHostname = `${cand}.onechatai.site`;
      const taken = await PublishedHostname.findOne({ hostname: candHostname });
      if (!taken && !RESERVED_SLUGS.includes(cand)) {
        suggestions.push(cand);
      }
      if (suggestions.length >= 3) break;
    }

    return res.json({
      success: true,
      available: false,
      suggestions: suggestions
    });
  } catch (error) {
    console.error("Error checking subdomain availability:", error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
});

// Helper: Strict HTML Sanitizer for User Pages
function sanitizeProjectHtml(rawHtml) {
  return sanitizeHtml(rawHtml, {
    allowedTags: [
      "html",
      "head",
      "body",
      "meta",
      "title",
      "link",
      "style",
      "div",
      "span",
      "p",
      "a",
      "h1",
      "h2",
      "h3",
      "h4",
      "h5",
      "h6",
      "img",
      "table",
      "thead",
      "tbody",
      "tr",
      "th",
      "td",
      "ul",
      "ol",
      "li",
      "br",
      "hr",
      "section",
      "header",
      "footer",
      "main",
      "aside",
      "nav",
      "b",
      "i",
      "strong",
      "em",
      "u",
      "s",
      "blockquote",
      "code",
      "pre",
    ],
    allowedAttributes: {
      "*": ["class", "id", "style", "role", "dir", "lang"],
      a: ["href", "name", "target", "rel"],
      img: ["src", "alt", "title", "width", "height", "loading"],
      link: ["rel", "href", "type", "media"],
      meta: ["charset", "name", "content", "http-equiv"],
      table: [
        "width",
        "height",
        "cellpadding",
        "cellspacing",
        "border",
        "align",
      ],
      td: ["valign", "align", "colspan", "rowspan", "width"],
      th: ["valign", "align", "colspan", "rowspan", "width"],
    },
    allowedSchemes: ["http", "https", "mailto", "tel"],
    allowedSchemesAppliedToAttributes: ["href", "src"],
    allowElementTransitions: true,
    allowVulnerableTags: true,
  });
}

// Helper: Prune old versions to respect 10-version limit
async function pruneProjectVersions(projectId, activeVersionId) {
  try {
    // Get all versions sorted newest to oldest
    const versions = await ProjectVersion.find({ projectId }).sort({
      versionNumber: -1,
    });
    if (versions.length <= 10) return;

    const keepIds = new Set();
    const activeStr = activeVersionId ? activeVersionId.toString() : null;

    // Check if active version is within the top 10 newest versions
    const activeInTop10 = versions
      .slice(0, 10)
      .some((v) => v._id.toString() === activeStr);

    if (activeInTop10 || !activeStr) {
      // If active version is in the top 10 (or no active version), keep the top 10 newest
      versions.slice(0, 10).forEach((v) => keepIds.add(v._id.toString()));
    } else {
      // If active version is older, keep the top 9 newest + the active version (retaining 10 versions total)
      versions.slice(0, 9).forEach((v) => keepIds.add(v._id.toString()));
      keepIds.add(activeStr);
    }

    const versionsToDelete = versions.filter(
      (v) => !keepIds.has(v._id.toString()),
    );

    for (const ver of versionsToDelete) {
      // 1. Delete from DO Spaces
      try {
        const deleteCommand = new DeleteObjectCommand({
          Bucket: DO_BUCKET_NAME,
          Key: ver.htmlPath,
        });
        await s3ClientCms.send(deleteCommand);
      } catch (err) {
        console.error(
          `Failed to delete version file ${ver.htmlPath} from DO Spaces:`,
          err,
        );
      }

      // 2. Delete version record from DB
      await ProjectVersion.findByIdAndDelete(ver._id);
    }
  } catch (error) {
    console.error("Pruning versions failed:", error);
  }
}
// Helper: Trigger cache invalidation webhooks on Next.js publishing service
async function triggerCacheInvalidation(hostname) {
  const purgeUrls = [];
  if (process.env.PUBLISHING_SERVICE_URL) {
    purgeUrls.push(`${process.env.PUBLISHING_SERVICE_URL}/api/internal/cache-invalidate`);
  } 
  const purgeToken = process.env.CACHE_PURGE_TOKEN || "9057keyagainfdgjdf488517kghdfrfhsjadghj";

  for (const url of purgeUrls) {
    try {
      axios
        .post(
          url,
          { hostname },
          {
            headers: { Authorization: `Bearer ${purgeToken}` },
            timeout: 2000, // 2s timeout
          }
        )
        .then(() => {
          console.log(`🧹 Cache cleared successfully on ${url} for ${hostname}`);
        })
        .catch((err) => {
          console.log(`⚠️ Cache clear skipped/failed on ${url} for ${hostname}: ${err.message}`);
        });
    } catch (e) {
      console.error(`❌ Cache clear request setup failed for ${url}:`, e.message);
    }
  }
}


// ==========================================
// 1. TEMPLATE METADATA ENDPOINTS (READ-ONLY)
// ==========================================

// @desc    Get all active templates
// @route   GET /api/templates
// @access  Public
router.get("/templates", publishingApiLimiter, async (req, res) => {
  try {
    const query = { status: { $nin: ["archived", "Archived"] } };

    if (req.query.builderType) {
      query.builderType = req.query.builderType;
    }
    if (req.query.category) {
      query.category = req.query.category;
    }
    if (req.query.search) {
      const searchRegex = new RegExp(req.query.search, "i");
      query.$or = [
        { name: { $regex: searchRegex } },
        { tags: { $regex: searchRegex } },
      ];
    }

    const templates = await MasterTemplate.find(query).sort({ createdAt: -1 });
    res
      .status(200)
      .json({ success: true, count: templates.length, data: templates });
  } catch (error) {
    console.error("Get templates error:", error);
    res
      .status(500)
      .json({ success: false, message: "Server error fetching templates" });
  }
});

// @desc    Get template by ID
// @route   GET /api/templates/:id
// @access  Public
router.get("/templates/:id", publishingApiLimiter, async (req, res) => {
  try {
    const template = await MasterTemplate.findById(req.params.id);
    if (!template) {
      return res
        .status(404)
        .json({ success: false, message: "Template not found" });
    }
    res.status(200).json({ success: true, data: template });
  } catch (error) {
    console.error("Get template by ID error:", error);
    res
      .status(500)
      .json({ success: false, message: "Server error fetching template" });
  }
});

// ==========================================
// 2. PROJECT ENDPOINTS (Strictly Authorized)
// ==========================================

// @desc    Create a project (clones template)
// @route   POST /api/projects
// @access  Private
router.post("/projects", protect, publishingApiLimiter, async (req, res) => {
  try {
    const { projectName, templateId, builderType } = req.body;
    if (!projectName || !templateId) {
      return res.status(400).json({
        success: false,
        message: "Project name and templateId are required",
      });
    }

    let draftJson = {};
    let projectBuilderType = "page";
    let contentType = "web";
    let dbTemplateId = null;

    if (templateId === "blank" || templateId.startsWith("blank_")) {
      const type = builderType || "page_builder";
      if (type === "email_builder") {
        projectBuilderType = "email";
        contentType = "email";
      } else if (type === "document_builder") {
        projectBuilderType = "document";
        contentType = "document";
      } else {
        projectBuilderType = "page";
        contentType = "web";
      }
    } else {
      // templateId is a UUID string referencing the secondary DB MasterTemplate record's _id
      const template = await MasterTemplate.findById(templateId);
      if (!template) {
        return res
          .status(404)
          .json({ success: false, message: "Source template not found" });
      }

      if (["archived", "Archived"].includes(template.status)) {
        return res.status(400).json({
          success: false,
          message: "Archived templates cannot be used to create projects",
        });
      }

      if (!template.originalDesignJsonUrl) {
        return res.status(400).json({
          success: false,
          message: "Template design URL is missing from metadata",
        });
      }

      try {
        const response = await axios.get(template.originalDesignJsonUrl, {
          timeout: 10000,
        }); // 10s timeout
        if (response.data) {
          draftJson = response.data;
        } else {
          console.error(
            "Empty design payload downloaded from",
            template.originalDesignJsonUrl,
          );
          return res
            .status(502)
            .json({ success: false, message: "Template layout file was empty" });
        }
      } catch (downloadError) {
        console.error(
          `Design JSON download failed from ${template.originalDesignJsonUrl}:`,
          downloadError.message,
        );
        return res.status(502).json({
          success: false,
          message: `Failed to download layout from storage: ${downloadError.message}`,
        });
      }

      dbTemplateId = template._id;
      if (template.builderType === "email_builder") {
        projectBuilderType = "email";
        contentType = template.contentType || "email";
      } else if (template.builderType === "document_builder") {
        projectBuilderType = "document";
        contentType = template.contentType || "document";
      } else {
        projectBuilderType = "page";
        contentType = template.contentType || "web";
      }
    }

    const project = await UserProject.create({
      userId: req.user.id,
      projectName,
      builderType: projectBuilderType,
      contentType: contentType,
      templateId: dbTemplateId,
      draftJson,
      status: "draft",
    });

    res.status(201).json({ success: true, data: project });
  } catch (error) {
    console.error("Create project error:", error);
    res
      .status(500)
      .json({ success: false, message: "Server error creating project" });
  }
});

// @desc    Get projects of current user
// @route   GET /api/projects
// @access  Private
router.get("/projects", protect, publishingApiLimiter, async (req, res) => {
  try {
    const projects = await UserProject.find({
      userId: req.user.id,
      status: { $ne: "deleted" },
    }).sort({ updatedAt: -1 });

    const projectsWithHost = [];
    for (const p of projects) {
      const projectObj = p.toObject();
      const hostRecord = await PublishedHostname.findOne({
        projectId: p._id,
        isActive: true,
      });
      projectObj.hostname = hostRecord ? hostRecord.hostname : null;
      projectsWithHost.push(projectObj);
    }

    res
      .status(200)
      .json({ success: true, count: projects.length, data: projectsWithHost });
  } catch (error) {
    console.error("Get projects error:", error);
    res
      .status(500)
      .json({ success: false, message: "Server error fetching projects" });
  }
});

// @desc    Get single project
// @route   GET /api/projects/:id
// @access  Private
router.get("/projects/:id", protect, publishingApiLimiter, async (req, res) => {
  try {
    const project = await UserProject.findById(req.params.id);
    if (!project || project.status === "deleted") {
      return res
        .status(404)
        .json({ success: false, message: "Project not found" });
    }

    // Authorization check
    if (
      project.userId.toString() !== req.user.id &&
      req.user.role !== "admin"
    ) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized access to this project",
      });
    }

    const projectObj = project.toObject();
    const hostRecord = await PublishedHostname.findOne({
      projectId: project._id,
      isActive: true,
    });
    projectObj.hostname = hostRecord ? hostRecord.hostname : null;

    res.status(200).json({ success: true, data: projectObj });
  } catch (error) {
    console.error("Get project error:", error);
    res
      .status(500)
      .json({ success: false, message: "Server error fetching project" });
  }
});

// @desc    Get version history of a project
// @route   GET /api/projects/:id/versions
// @access  Private
router.get(
  "/projects/:id/versions",
  protect,
  publishingApiLimiter,
  async (req, res) => {
    try {
      const project = await UserProject.findById(req.params.id);
      if (!project || project.status === "deleted") {
        return res
          .status(404)
          .json({ success: false, message: "Project not found" });
      }
      if (
        project.userId.toString() !== req.user.id &&
        req.user.role !== "admin"
      ) {
        return res.status(403).json({
          success: false,
          message: "Unauthorized access to project versions",
        });
      }

      const versions = await ProjectVersion.find({
        projectId: project._id,
      }).sort({ versionNumber: -1 });

      res
        .status(200)
        .json({ success: true, count: versions.length, data: versions });
    } catch (error) {
      console.error("Get project versions error:", error);
      res.status(500).json({
        success: false,
        message: "Server error fetching project versions",
      });
    }
  },
);

// @desc    Update project info
// @route   PUT /api/projects/:id
// @access  Private
router.put("/projects/:id", protect, publishingApiLimiter, async (req, res) => {
  try {
    let project = await UserProject.findById(req.params.id);
    if (!project || project.status === "deleted") {
      return res
        .status(404)
        .json({ success: false, message: "Project not found" });
    }

    // Authorization check
    if (
      project.userId.toString() !== req.user.id &&
      req.user.role !== "admin"
    ) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized to update this project",
      });
    }

    const allowedUpdates = {};
    if (req.body.projectName !== undefined) {
      allowedUpdates.projectName = req.body.projectName;
    }

    project = await UserProject.findByIdAndUpdate(
      req.params.id,
      allowedUpdates,
      { new: true, runValidators: true },
    );
    res.status(200).json({ success: true, data: project });
  } catch (error) {
    console.error("Update project error:", error);
    res
      .status(500)
      .json({ success: false, message: "Server error updating project" });
  }
});

// @desc    Soft delete project
// @route   DELETE /api/projects/:id
// @access  Private
router.delete(
  "/projects/:id",
  protect,
  publishingApiLimiter,
  async (req, res) => {
    try {
      const project = await UserProject.findById(req.params.id);
      if (!project || project.status === "deleted") {
        return res
          .status(404)
          .json({ success: false, message: "Project not found" });
      }

      // Authorization check
      if (
        project.userId.toString() !== req.user.id &&
        req.user.role !== "admin"
      ) {
        return res.status(403).json({
          success: false,
          message: "Unauthorized to delete this project",
        });
      }

      project.status = "deleted";
      project.deletedAt = new Date();
      await project.save();

      // Deactivate hostname if project is deleted
      await PublishedHostname.updateMany(
        { projectId: project._id },
        { isActive: false, deletedAt: new Date() },
      );

      res
        .status(200)
        .json({ success: true, message: "Project deleted successfully" });
    } catch (error) {
      console.error("Delete project error:", error);
      res
        .status(500)
        .json({ success: false, message: "Server error deleting project" });
    }
  },
);

// ==========================================
// 3. AUTOSAVE ENDPOINT
// ==========================================

// @desc    Autosave project draft (Strictly validates ownership, never publishes)
// @route   PUT /api/projects/:id/autosave
// @access  Private
router.put(
  "/projects/:id/autosave",
  protect,
  autosaveLimiter,
  async (req, res) => {
    try {
      const { draftJson } = req.body;
      if (!draftJson) {
        return res
          .status(400)
          .json({ success: false, message: "No draft content provided" });
      }

      // Request payload size validation: Limit to 10MB
      const byteSize = Buffer.byteLength(JSON.stringify(draftJson), "utf-8");
      if (byteSize > 10 * 1024 * 1024) {
        return res.status(413).json({
          success: false,
          message:
            "Autosave failed. Design JSON payload size exceeds 10MB limit.",
        });
      }

      const project = await UserProject.findById(req.params.id);
      if (!project || project.status === "deleted") {
        return res
          .status(404)
          .json({ success: false, message: "Project not found" });
      }

      // Authorization check
      if (
        project.userId.toString() !== req.user.id &&
        req.user.role !== "admin"
      ) {
        return res.status(403).json({
          success: false,
          message: "Unauthorized to autosave this project",
        });
      }

      project.draftJson = draftJson;
      await project.save();

      res
        .status(200)
        .json({ success: true, message: "Draft autosaved successfully" });
    } catch (error) {
      console.error("Autosave project error:", error);
      res
        .status(500)
        .json({ success: false, message: "Server error autosaving project" });
    }
  },
);

// ==========================================
// 4. PUBLISHING ENDPOINT
// ==========================================

// @desc    Publish project to subdomain (Handles HTML sanitization & DO Spaces uploads)
// @route   POST /api/projects/:id/publish
// @access  Private
router.post(
  "/projects/:id/publish",
  protect,
  publishLimiter,
  async (req, res) => {
    try {
      const { rawHtml, slug } = req.body;
      if (!rawHtml || !slug) {
        return res.status(400).json({
          success: false,
          message: "HTML content and subdomain slug are required",
        });
      }

      // Request payload size validation: Limit to 5MB
      const byteSize = Buffer.byteLength(rawHtml, "utf-8");
      if (byteSize > 5 * 1024 * 1024) {
        return res.status(413).json({
          success: false,
          message: "Publishing failed. HTML payload size exceeds 5MB limit.",
        });
      }

      // 1. Validate slug formatting
      const cleanedSlug = slug.toLowerCase().trim();
      const slugRegex = /^[a-z0-9]+(-[a-z0-9]+)*$/;
      if (
        !slugRegex.test(cleanedSlug) ||
        cleanedSlug.length < 3 ||
        cleanedSlug.length > 63
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid slug. Must be 3-63 lowercase alphanumeric characters, optionallly split by hyphens.",
        });
      }

      // 2. Reserved names list check
      if (RESERVED_SLUGS.includes(cleanedSlug)) {
        return res.status(400).json({
          success: false,
          message: "Subdomain slug is reserved and cannot be claimed.",
        });
      }

      // 3. Verify project exists & belongs to the authenticated user
      const project = await UserProject.findById(req.params.id);
      if (!project || project.status === "deleted") {
        return res
          .status(404)
          .json({ success: false, message: "Project not found" });
      }
      if (
        project.userId.toString() !== req.user.id &&
        req.user.role !== "admin"
      ) {
        return res.status(403).json({
          success: false,
          message: "Unauthorized to publish this project",
        });
      }

      // Verify project has canPublish = true capability
      if (!project.canPublish) {
        return res.status(400).json({
          success: false,
          message: `Publishing is not supported for ${project.contentType} projects.`,
        });
      }

      // 4. Verify slug availability & subdomain cooldown constraints
      const targetHostname = `${cleanedSlug}.onechatai.site`;
      const existingHostname = await PublishedHostname.findOne({
        hostname: targetHostname,
      });

      if (existingHostname) {
        // If it belongs to a different project
        if (existingHostname.projectId.toString() !== project._id.toString()) {
          if (existingHostname.isActive) {
            return res.status(400).json({
              success: false,
              message: "Subdomain is already in use by another project.",
            });
          }

          // Cooldown check for inactive subdomains
          if (existingHostname.deletedAt) {
            const daysSinceDeletion =
              (new Date() - new Date(existingHostname.deletedAt)) /
              (1000 * 60 * 60 * 24);
            if (daysSinceDeletion < COOLDOWN_DAYS) {
              return res.status(400).json({
                success: false,
                message: `Subdomain is in a cooldown period. Try again in ${Math.ceil(COOLDOWN_DAYS - daysSinceDeletion)} days.`,
              });
            }
          }
        }
      }

      // 5. Sanitize HTML content to strip JavaScript/events/frames
      const sanitizedHtml = sanitizeProjectHtml(rawHtml);

      // 6. Find version increment
      const latestVersion = await ProjectVersion.findOne({
        projectId: project._id,
      }).sort({ versionNumber: -1 });
      const versionNumber = latestVersion ? latestVersion.versionNumber + 1 : 1;

      // 7. Setup DO Spaces upload parameters (Path Traversal Protection)
      const fileKey = `publications/${project._id}/version-${versionNumber}/index.html`;

      // 8. Upload static index.html to DO Spaces
      const uploadCommand = new PutObjectCommand({
        Bucket: DO_BUCKET_NAME,
        Key: fileKey,
        Body: Buffer.from(sanitizedHtml, "utf-8"),
        ContentType: "text/html",
        // ACL: "public-read",
      });

      await s3ClientCms.send(uploadCommand);

      // 9. Database updates inside safe rollback wrapper
      let projectVersion;
      try {
        projectVersion = await ProjectVersion.create({
          projectId: project._id,
          versionNumber,
          htmlPath: fileKey,
          publishedBy: req.user.id,
        });

        // Deactivate all other active hostnames for this project
        await PublishedHostname.updateMany(
          {
            projectId: project._id,
            hostname: { $ne: targetHostname },
            isActive: true,
          },
          { isActive: false, deletedAt: new Date() },
        );

        await PublishedHostname.findOneAndUpdate(
          { hostname: targetHostname },
          {
            projectId: project._id,
            activeVersionId: projectVersion._id,
            isActive: true,
            deletedAt: null,
          },
          { upsert: true, new: true },
        );

        project.activeVersionId = projectVersion._id;
        project.status = "published";
        await project.save();
      } catch (dbError) {
        console.error(
          "Database update failed during publishing, rolling back S3 file upload:",
          dbError.message,
        );
        try {
          const rollbackCommand = new DeleteObjectCommand({
            Bucket: DO_BUCKET_NAME,
            Key: fileKey,
          });
          await s3ClientCms.send(rollbackCommand);
        } catch (s3Err) {
          console.error(
            "Failed to clean up S3 file key during rollback:",
            s3Err.message,
          );
        }
        throw dbError; // Rethrow to let outer try-catch handle the 500 response
      }

      // 10. Prune old versions (keep top 10, protect active)
      await pruneProjectVersions(project._id, projectVersion._id);

      // 11. Trigger Next.js cache invalidation webhook
      triggerCacheInvalidation(targetHostname);

      res.status(200).json({
        success: true,
        message: "Project published successfully",
        hostname: targetHostname,
        version: versionNumber,
      });
    } catch (error) {
      console.error("Publish project error:", error);
      res
        .status(500)
        .json({ success: false, message: "Server error publishing project" });
    }
  },
);

// ==========================================
// 5. ROLLBACK ENDPOINT
// ==========================================

// @desc    Rollback live website to a previous version
// @route   POST /api/projects/:id/rollback
// @access  Private
router.post(
  "/projects/:id/rollback",
  protect,
  publishLimiter,
  async (req, res) => {
    try {
      const { versionId } = req.body;
      if (!versionId) {
        return res
          .status(400)
          .json({ success: false, message: "Target version ID is required" });
      }

      // 1. Verify project ownership
      const project = await UserProject.findById(req.params.id);
      if (!project || project.status === "deleted") {
        return res
          .status(404)
          .json({ success: false, message: "Project not found" });
      }
      if (
        project.userId.toString() !== req.user.id &&
        req.user.role !== "admin"
      ) {
        return res.status(403).json({
          success: false,
          message: "Unauthorized to rollback this project",
        });
      }

      // 2. Verify target version belongs to this project
      const version = await ProjectVersion.findOne({
        _id: versionId,
        projectId: project._id,
      });
      if (!version) {
        return res.status(404).json({
          success: false,
          message: "Target version not found for this project",
        });
      }

      // 3. Update version pointer in database
      project.activeVersionId = version._id;
      await project.save();

      // Update the live routing hostname mapping pointer
      const publishedRecord = await PublishedHostname.findOneAndUpdate(
        { projectId: project._id, isActive: true },
        { activeVersionId: version._id },
      );

      if (publishedRecord) {
        // Trigger Next.js cache invalidation webhook
        triggerCacheInvalidation(publishedRecord.hostname);
      }

      res.status(200).json({
        success: true,
        message: `Project rolled back successfully to version ${version.versionNumber}`,
        activeVersion: version.versionNumber,
      });
    } catch (error) {
      console.error("Rollback project error:", error);
      res
        .status(500)
        .json({ success: false, message: "Server error rolling back project" });
    }
  },
);

// ==========================================
// 6. UNPUBLISH ENDPOINT
// ==========================================

// @desc    Unpublish project (take site offline)
// @route   POST /api/projects/:id/unpublish
// @access  Private
router.post(
  "/projects/:id/unpublish",
  protect,
  publishingApiLimiter,
  async (req, res) => {
    try {
      const project = await UserProject.findById(req.params.id);
      if (!project || project.status === "deleted") {
        return res
          .status(404)
          .json({ success: false, message: "Project not found" });
      }

      // Authorization check
      if (
        project.userId.toString() !== req.user.id &&
        req.user.role !== "admin"
      ) {
        return res.status(403).json({
          success: false,
          message: "Unauthorized to unpublish this project",
        });
      }

      project.status = "draft";
      await project.save();

      // Deactivate any active hostnames associated with this project
      const hostnames = await PublishedHostname.find({
        projectId: project._id,
        isActive: true,
      });

      for (const host of hostnames) {
        host.isActive = false;
        host.deletedAt = new Date();
        await host.save();

        // Invalidate cache
        triggerCacheInvalidation(host.hostname);
      }
    

      res
        .status(200)
        .json({ success: true, message: "Project unpublished successfully" });
    } catch (error) {
      console.error("Unpublish project error:", error);
      res
        .status(500)
        .json({ success: false, message: "Server error unpublishing project" });
    }
  },
);

module.exports = router;
