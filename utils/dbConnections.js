const mongoose = require("mongoose");

// Initialize secondary Content Studio connection (Read-Only)
const contentStudioUri =
  process.env.CONTENT_STUDIO_MONGODB_URI;

console.log("Initializing Replit Content Studio read-only connection...");
const contentStudioConnection = mongoose.createConnection(contentStudioUri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

contentStudioConnection.on("connected", () => {
  console.log("✅ Connected to Replit Content Studio Database");
});

contentStudioConnection.on("error", (err) => {
  console.error("❌ Replit Content Studio Database connection error:", err);
});

module.exports = {
  contentStudioConnection,
};
