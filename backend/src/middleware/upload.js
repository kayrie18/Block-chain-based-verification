const path = require("path");
const multer = require("multer");
const { getLocalUploadDir } = require("../services/storageService");

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, getLocalUploadDir());
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    const base = path.basename(file.originalname, ext).replace(/\s+/g, "_");
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${base}-${unique}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 20 * 1024 * 1024, // 20MB
  },
});

module.exports = { upload };

