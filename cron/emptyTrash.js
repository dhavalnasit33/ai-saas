const cron = require("node-cron");
const { DeleteObjectCommand, ListObjectsV2Command, DeleteObjectsCommand } = require("@aws-sdk/client-s3");

// s3Client → onechatai.storage (user file storage)
// s3ClientCms → onechatai-cms (publishing & project assets)
const { s3Client, s3ClientCms } = require("../utils/s3Client");
const StorageFile = require("../models/StorageFile");
const StorageFolder = require("../models/StorageFolder");
const UserProject = require("../models/UserProject");
const ProjectVersion = require("../models/ProjectVersion");
const PublishedHostname = require("../models/PublishedHostname");

const BUCKET_NAME = process.env.DO_BUCKET_NAME || "onechatai.storage";
const DO_BUCKET_NAME_CMS = process.env.DO_BUCKET_NAME_CMS || "onechatai-cms";

// Helper: Recursively delete folder prefix from DO Spaces
// Accepts the target s3 client so the correct credentials are used per bucket
async function deleteSpacesFolder(client, bucket, prefix) {
  try {
    let truncated = true;
    while (truncated) {
      const listCmd = new ListObjectsV2Command({
        Bucket: bucket,
        Prefix: prefix,
      });
      const listRes = await client.send(listCmd);
      if (!listRes.Contents || listRes.Contents.length === 0) {
        truncated = false;
        break;
      }

      const deleteObjects = listRes.Contents.map((obj) => ({ Key: obj.Key }));
      const deleteCmd = new DeleteObjectsCommand({
        Bucket: bucket,
        Delete: { Objects: deleteObjects },
      });
      await client.send(deleteCmd);
      console.log(`🧹 Deleted from Spaces bucket ${bucket}: prefix "${prefix}" (${deleteObjects.length} objects)`);

      if (!listRes.IsTruncated) {
        truncated = false;
      }
    }
  } catch (err) {
    console.error(`❌ Failed to delete Spaces folder prefix "${prefix}":`, err.message);
  }
}

const startTrashCleanupJob = () => {
  // Run every midnight ("0 0 * * *")
  cron.schedule("0 0 * * *", async () => {
    console.log("🧹 Running Storage & Project Cleanup Job (Cloud)...");
    try {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

      // ==========================================
      // 1. Storage Files & Folders Cleanup (onechatai.storage → s3Client)
      // ==========================================
      const expiredFiles = await StorageFile.find({
        isDeleted: true,
        deletedAt: { $lt: thirtyDaysAgo },
      });

      console.log(`Found ${expiredFiles.length} expired storage files to delete.`);

      for (const file of expiredFiles) {
        if (file.storageKey && !file.storageKey.startsWith("http")) {
          try {
            const deleteCmd = new DeleteObjectCommand({
              Bucket: BUCKET_NAME,
              Key: file.storageKey,
            });
            await s3Client.send(deleteCmd);
            console.log(`Deleted from Cloud (storage): ${file.filename}`);
          } catch (e) {
            console.error(
              `Failed to delete S3 key ${file.storageKey} (might already be gone):`,
              e.message,
            );
          }
        }
        await StorageFile.findByIdAndDelete(file._id);
      }

      await StorageFolder.deleteMany({
        isDeleted: true,
        deletedAt: { $lt: thirtyDaysAgo },
      });

      // ==========================================
      // 2. Soft-Deleted Projects Cleanup (onechatai-cms → s3ClientCms)
      // ==========================================
      const expiredProjects = await UserProject.find({
        status: "deleted",
        updatedAt: { $lt: thirtyDaysAgo },
      });

      console.log(`Found ${expiredProjects.length} expired soft-deleted projects to clean up.`);

      for (const project of expiredProjects) {
        console.log(`🧹 Processing permanent deletion of Project: ${project.projectName} (${project._id})`);

        // A. Delete files from DigitalOcean Spaces (CMS bucket) first
        // 1. publications/{projectId}/
        const publicationsPrefix = `publications/${project._id}/`;
        await deleteSpacesFolder(s3ClientCms, DO_BUCKET_NAME_CMS, publicationsPrefix);

        // 2. assets/{projectId}/ (Unlayer image uploads)
        const assetsPrefix = `assets/${project._id}/`;
        await deleteSpacesFolder(s3ClientCms, DO_BUCKET_NAME_CMS, assetsPrefix);

        // 3. exports/{userId}/{projectId}/
        const exportsPrefix = `exports/${project.userId}/${project._id}/`;
        await deleteSpacesFolder(s3ClientCms, DO_BUCKET_NAME_CMS, exportsPrefix);

        // B. Delete related database documents next
        await ProjectVersion.deleteMany({ projectId: project._id });
        await PublishedHostname.deleteMany({ projectId: project._id });

        // C. Delete the parent project record last (maintaining idempotency)
        await UserProject.findByIdAndDelete(project._id);

        console.log(`✅ Permanently deleted Project: ${project._id}`);
      }

      console.log("✅ Storage & Project Cleanup Job finished successfully.");
    } catch (err) {
      console.error("❌ Cleanup Job Failed:", err);
    }
  });
};

module.exports = startTrashCleanupJob;

