const fs = require("fs");
const path = require("path");
const axios = require("axios");
const AIProviderComparisoN = require("../models/Tool");

// // Base folder for all tool-related images
// const saveFolder = path.join(__dirname, "..", "uploads", "tool");
// if (!fs.existsSync(saveFolder)) fs.mkdirSync(saveFolder, { recursive: true });

// // Download function
// async function downloadImage(url, filename) {
//   const filePath = path.join(saveFolder, filename);

//   const writer = fs.createWriteStream(filePath);
//   const response = await axios({
//     url,
//     method: "GET",
//     responseType: "stream",
//   });

//   response.data.pipe(writer);

//   return new Promise((resolve, reject) => {
//     writer.on("finish", resolve);
//     writer.on("error", reject);
//   });
// }

// // Extract just the Cloudinary public ID + extension as filename
// function getFilenameFromUrl(url) {
//   return url.split("/").pop().split("?")[0];
// }

// // Main function
// async function downloadAllImages() {
//   try {
   
//     // ---- Download Tool icons + cover_images ----
//     const tools = await Tool.find({});
//     for (const tool of tools) {
//       // Tool icon
//       if (tool.icon) {
//         const filename = getFilenameFromUrl(tool.icon);
//         console.log(`Downloading Tool icon: ${tool.icon} -> ${filename}`);
//         await downloadImage(tool.icon, filename);
//       }

//       // Tool cover_image
//       if (tool.cover_image) {
//         const filename = getFilenameFromUrl(tool.cover_image);
//         console.log(`Downloading Tool cover_image: ${tool.cover_image} -> ${filename}`);
//         await downloadImage(tool.cover_image, filename);
//       }
//     }

//     console.log("✅ All ToolCategory + Tool images downloaded into uploads/tool folder!");
//   } catch (err) {
//     console.error("❌ Error downloading images:", err);
//   }
// }

// module.exports = downloadAllImages;




// Your server base URL
const SERVER_URL = 'https://api.onechatai.ai/uploads/ai-provider';

// Extract the Cloudinary public ID + extension
function getPublicId(url) {
  // Split by '/' and take last part
  return url.split('/').pop().split('?')[0];
}

// Main function to update all image URLs
async function downloadAllImages() {
  try {
    const records = await AIProviderComparisoN.find({});

    for (const record of records) {
      if (record.image && record.image.includes('/upload/')) {
        const publicId = getPublicId(record.image);
        const newUrl = `${SERVER_URL}/${publicId}`;

        record.image = newUrl;
       await record.save({ validateBeforeSave: false });


        console.log(`Updated record ${record._id}: ${newUrl}`);
      }
    }

    console.log('All image URLs updated successfully!');
  } catch (err) {
    console.error('Error updating image URLs:', err);
  }
}

module.exports = downloadAllImages;

