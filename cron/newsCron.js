// const cron = require("node-cron");
// const axios = require("axios");
// const slugify = require("slugify");
// const FormData = require("form-data");
// const cloudinary = require("cloudinary").v2;

// const News = require("../models/News");
// const NewsCategory = require("../models/NewsCategory");

// // ✅ Fixed categories
// const fixedCategories = [
//   "sports",
//   "palestine",
//   "news",
//   "business & tech",
//   "politics",
//   "health & fitness",
//   "food",
//   "travel",
//   "marketing"
// ];

// cloudinary.config({
//   cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
//   api_key: process.env.CLOUDINARY_API_KEY,
//   api_secret: process.env.CLOUDINARY_API_SECRET,
// });


// // Utility: chunk an array into smaller arrays of size "size"
// function chunkArray(arr, size) {
//   const result = [];
//   for (let i = 0; i < arr.length; i += size) {
//     result.push(arr.slice(i, i + size));
//   }
//   return result;
// }

// // ✅ Upload helper
// const uploadToCloudinary = async (imageUrl) => {
//   try {
//     if (!imageUrl || !imageUrl.startsWith("http")) return null;

//     const formData = new FormData();
//     formData.append("file", imageUrl);
//     formData.append("upload_preset", process.env.CLOUDINARY_UPLOAD_PRESET);

//     const uploadRes = await axios.post(
//       `https://api.cloudinary.com/v1_1/${process.env.CLOUDINARY_CLOUD_NAME}/image/upload`,
//       formData,
//       { headers: formData.getHeaders() }
//     );

//     return uploadRes.data.secure_url;
//   } catch (err) {
//     console.warn("⚠️ Cloudinary upload skipped:", err.message);
//     return null;
//   }
// };

// // ✅ Extract public ID from Cloudinary URL (handles folders)
// function getPublicIdFromUrl(url) {
//   const match = url.match(/\/upload\/(?:v\d+\/)?(.+)\.[a-zA-Z]+$/);
//   return match ? match[1] : null;
// }

// async function fetchAndSave(category) {
//   try {
//     // 🔹 Remove old data for this category
//      const oldNews = await News.find({ category, image: { $exists: true, $ne: null } }).select("image");
//     const oldImages = oldNews.map((n) => n.image);

//     // 🔹 Remove old data for this category
//     await News.deleteMany({ category });
//     console.log(`🗑️ Cleared old ${category} news`);

//     // 🔹 Delete old images from Cloudinary
//     for (const url of oldImages) {
//       try {
//         const publicId = getPublicIdFromUrl(url);
//          if (publicId) {
//           await cloudinary.uploader.destroy(publicId);
//           console.log(`🗑️ Deleted old image: ${url}`);
//         }
//       } catch (err) {
//         console.warn(`⚠️ Could not delete image ${url}: ${err.message}`);
//       }
//     }

//     // 🔹 Fetch fresh data from NewsAPI
//     const response = await axios.get(
//       `${process.env.NEWS_BASE_URL}/everything`,
//       {
//         params: {
//           q: category,
//           language: "en",
//           sortBy: "publishedAt",
//           pageSize: 100,
//           apiKey: process.env.NEWS_API_KEY,
//         },
//       }
//     );

//     const articles = response.data.articles || [];
//     const chunks = chunkArray(articles, 50);

//     for (const chunk of chunks) {
//       const bulkOps = await Promise.all(
//         chunk
//           .filter((a) => a.urlToImage)
//           .map(async (article) => {
//             const slug = slugify(article.title || "news", {
//               lower: true,
//               strict: true,
//             });

//             const uploadedImage = await uploadToCloudinary(article.urlToImage);

//             return {
//               updateOne: {
//                 filter: { slug },
//                 update: {
//                   $set: {
//                     title: article.title,
//                     description: article.description,
//                     image: uploadedImage,
//                     category,
//                     publishedAt: article.publishedAt,
//                     slug,
//                     companyName: article.source?.name || null,
//                   },
//                 },
//                 upsert: true,
//               },
//             };
//           })
//       );

//       if (bulkOps.length > 0) {
//         await News.bulkWrite(bulkOps);
//         console.log(`✅ Inserted ${bulkOps.length} articles for ${category}`);
//       }
//     }

//     console.log(`🎉 Completed category ${category}`);
//   } catch (err) {
//     console.error(`❌ Error fetching ${category}:`, err.message);
//   }
// }

// async function runNewsCron() {
//   console.log("🚀 Running daily news cron job...");

//   // ✅ Get dynamic categories from DB (parent = null, is_active = true)
//   const dynamicCategories = await NewsCategory.find({
//     parent: { $ne: null },
//     is_active: true,
//   }).select("name");
//   const dynamicNames = dynamicCategories.map((c) => c.name.toLowerCase());

//   // ✅ Merge fixed + dynamic categories (unique)
//   const allCategories = [...new Set([...fixedCategories, ...dynamicNames])];

//   // ✅ Ensure only 100 API calls max
//   const limitedCategories = allCategories.slice(0, 100);

//   for (const category of limitedCategories) {
//     console.log(`➡️ Fetching news for: ${category}`);
//     await fetchAndSave(category);
//   }

//   console.log("🎉 News cron finished!");
// }

// // Run daily at midnight
// cron.schedule("0 0 * * *", runNewsCron);

// module.exports = runNewsCron;



const cron = require("node-cron");
const axios = require("axios");
const slugify = require("slugify");
const fs = require("fs");
const path = require("path");

const News = require("../models/News");
const NewsCategory = require("../models/NewsCategory");

// ✅ Fixed categories
const fixedCategories = [
  "sports",
  "palestine",
  "news",
  "business & tech",
  "politics",
  "health & fitness",
  "food",
  "travel",
  "entertainment"
];

// Utility: chunk an array into smaller arrays of size "size"
function chunkArray(arr, size) {
  const result = [];
  for (let i = 0; i < arr.length; i += size) {
    result.push(arr.slice(i, i + size));
  }
  return result;
}

// ✅ Save image to local server
const saveImageLocally = async (imageUrl) => {
  try {
    if (!imageUrl || !imageUrl.startsWith("http")) return null;

    const response = await axios.get(imageUrl, { responseType: "arraybuffer" });
    const ext = path.extname(new URL(imageUrl).pathname) || ".jpg"; // better extension handling
    const fileName = `${Date.now()}-${Math.floor(Math.random() * 1000)}${ext}`;
    const dir = path.resolve(__dirname, "../uploads/news");

    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    const filePath = path.join(dir, fileName);
    fs.writeFileSync(filePath, response.data);

    // Return the public URL
    const baseUrl = process.env.SERVER_URL || "http://localhost:5000";
    return `${baseUrl}/uploads/news/${fileName}`;
  } catch (err) {
    console.warn("⚠️ Local image save skipped:", err.message);
    return null;
  }
};

// ✅ Fetch news for a single category and replace old entries
async function fetchAndSave(category) {
  try {
    console.log(`➡️ Processing category: ${category}`);
    const dir = path.resolve(__dirname, "../uploads/news");
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    // 🔹 Step 1: Find old news and collect their image URLs
    const oldNews = await News.find({
      category,
      image: { $exists: true, $ne: null },
    }).select("image");

    const oldImages = oldNews
      .map((n) => n.image)
      .filter(Boolean)
      .map((url) => {
        try {
          const pathname = new URL(url).pathname;
          return path.basename(pathname);
        } catch {
          return null;
        }
      })
      .filter(Boolean);

    for (const fileName of oldImages) {
      const filePath = path.join(dir, fileName);
      if (fs.existsSync(filePath)) {
        try {
          fs.unlinkSync(filePath);
          console.log(`✅ Deleted old image: ${fileName}`);
        } catch (err) {
          console.warn(`⚠️ Failed to delete ${fileName}: ${err.message}`);
        }
      } else {
        console.warn(`⚠️ File not found for deletion: ${fileName}`);
      }
    }

    // 🔹 Step 2: Delete old DB records for this category
    await News.deleteMany({ category });
    console.log(`🗑️ Cleared old ${category} news`);

    // 🔹 Step 4: Fetch fresh data from NewsAPI
    const response = await axios.get(
      `${process.env.NEWS_BASE_URL}/everything`,
      {
        params: {
          q: category,
          language: "en",
          sortBy: "publishedAt",
          pageSize: 100,
          apiKey: process.env.NEWS_API_KEY,
        },
      }
    );

    const articles = response.data.articles || [];
    const chunks = chunkArray(articles, 50);

    // 🔹 Step 5: Insert new articles in chunks
    for (const chunk of chunks) {
      const bulkOps = await Promise.all(
        chunk
          .filter((a) => a.urlToImage) // only articles with images
          .map(async (article) => {
            const slug = slugify(article.title || "news", {
              lower: true,
              strict: true,
            });
            const uploadedImage = await saveImageLocally(article.urlToImage);

            return {
              updateOne: {
                filter: { slug },
                update: {
                  $set: {
                    title: article.title,
                    description: article.description,
                    image: uploadedImage,
                    category,
                    publishedAt: article.publishedAt,
                    slug,
                    companyName: article.source?.name || null,
                  },
                },
                upsert: true,
              },
            };
          })
      );

      if (bulkOps.length > 0) {
        await News.bulkWrite(bulkOps);
        console.log(`✅ Inserted ${bulkOps.length} articles for ${category}`);
      }
    }

    console.log(`🎉 Completed category ${category}`);
  } catch (err) {
    console.error(`❌ Error fetching ${category}:`, err.message);
  }
}

// ✅ Run cron job
async function runNewsCron() {
  try {
    console.log("🚀 Running daily news cron job...");

    // ✅ Get dynamic categories from DB (only active child categories)
    const dynamicCategories = await NewsCategory.find({
      parent: { $ne: null },
      is_active: true,
    }).select("name");

    const dynamicNames = dynamicCategories.map((c) => c.name.toLowerCase());

    // ✅ Merge fixed + dynamic categories (unique)
    const allCategories = [...new Set([...fixedCategories, ...dynamicNames])];

    // ✅ Limit to 100 API calls max
    const limitedCategories = allCategories.slice(0, 100);

    for (const category of limitedCategories) {
      await fetchAndSave(category);
    }

    console.log("🎉 News cron finished!");
  } catch (err) {
    console.error("❌ Error running news cron:", err.message);
  }
}

// Run daily at midnight
cron.schedule("0 0 * * *", runNewsCron);

module.exports = runNewsCron;