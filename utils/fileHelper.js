const fs = require("fs");
const path = require("path");

const deleteLocalFile = (url) => {
  if (!url || typeof url !== "string") return;

  // Only delete if it points to a local upload
  if (!url.includes("/uploads/")) return;

  try {
    const fileName = url.split("/").pop();
    const parts = url.split("/");
    const uploadFolder = parts[parts.length - 2];
    const filePath = path.join(__dirname, "../uploads", uploadFolder, fileName);

    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      console.log(`Successfully deleted local file: ${filePath}`);
    } else {
      console.log(`File not found: ${filePath}`);
    }
  } catch (err) {
    console.error(`Failed to delete file ${url}:`, err.message);
  }
};

module.exports = { deleteLocalFile };
