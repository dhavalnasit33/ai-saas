const fs = require("fs");
const path = require("path");

const BASE_DIR = path.join(__dirname, "../uploads/logos");

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

async function saveImage(buffer, userId, type = "generated") {
  const dir = path.join(BASE_DIR, type);
  ensureDir(dir);

  const filename = `${userId}_${Date.now()}_${Math.round(
    Math.random() * 1e9
  )}.png`;

  const filepath = path.join(dir, filename);

  fs.writeFileSync(filepath, buffer);

  return {
    imageId: filename,
    imageUrl: `/uploads/logos/${type}/${filename}`,
    absolutePath: filepath,
  };
}

async function getImage(imageId, type = "generated") {
  const filepath = path.join(BASE_DIR, type, imageId);

  if (!fs.existsSync(filepath)) {
    throw new Error("Image not found on server");
  }

  return fs.readFileSync(filepath);
}

module.exports = {
  saveImage,
  getImage,
};
