const { S3Client } = require("@aws-sdk/client-s3");

// 1. Original Spaces credentials for onechatai.storage
const SPACES_KEY = process.env.DO_SPACES_KEY || "DO801EA84FJHG4KEMBX9";
const SPACES_SECRET =
  process.env.DO_SPACES_SECRET || "FPWVNeCBjwMhCmVuZpRG21FawPAo7PvUj0wcLne3Iy4";
const SPACES_ENDPOINT =
  process.env.DO_SPACES_ENDPOINT || "https://nyc3.digitaloceanspaces.com";
const SPACES_REGION = "us-east-1";

console.log("🔌 Initializing original S3 Client for onechatai.storage...");
const s3Client = new S3Client({
  endpoint: SPACES_ENDPOINT,
  region: SPACES_REGION,
  credentials: {
    accessKeyId: SPACES_KEY,
    secretAccessKey: SPACES_SECRET,
  },
  requestChecksumCalculation: "WHEN_REQUIRED",
  responseChecksumValidation: "WHEN_REQUIRED",
});

// 2. New CMS Spaces credentials for onechatai-cms
const SPACES_KEY_CMS = process.env.DO_SPACES_KEY_CMS || "DO8013MK8978QEHXMYFA";
const SPACES_SECRET_CMS =
  process.env.DO_SPACES_SECRET_CMS || "RWecIc7v3WQlhca0o4myns+ik7ic+wXD7+yg944YNfY";

console.log("🔌 Initializing new S3 Client for onechatai-cms...");
const s3ClientCms = new S3Client({
  endpoint: SPACES_ENDPOINT,
  region: SPACES_REGION,
  credentials: {
    accessKeyId: SPACES_KEY_CMS,
    secretAccessKey: SPACES_SECRET_CMS,
  },
  requestChecksumCalculation: "WHEN_REQUIRED",
  responseChecksumValidation: "WHEN_REQUIRED",
});

module.exports = { s3Client, s3ClientCms };
