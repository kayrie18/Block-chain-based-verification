const path = require("path");
const multer = require("multer");
const { getLocalUploadDir } = require("../services/storageService");

// ── Allowed MIME types ─────────────────────────────────────────────────────
const ALLOWED_MIMES = new Set([
  // PDF
  "application/pdf",
  // Images
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/svg+xml",
  // Word / Office
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  // Excel
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  // PowerPoint (.ppt + .pptx)
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  // Text / plain
  "text/plain",
  "text/csv",
  // Generic binary (catch-all for renamed files)
  "application/octet-stream",
]);

// ── Allowed file extensions (backup guard when MIME spoofed) ───────────────
const ALLOWED_EXTS = new Set([
  ".pdf", ".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg",
  ".doc", ".docx", ".xls", ".xlsx", ".ppt", ".pptx",
  ".txt", ".csv",
]);

function fileFilter(_req, file, cb) {
  const ext = path.extname(file.originalname).toLowerCase();
  if (ALLOWED_MIMES.has(file.mimetype) || ALLOWED_EXTS.has(ext)) {
    return cb(null, true);
  }
  const err = new Error(
    `File type not allowed. Accepted: PDF, images, Word, Excel, PowerPoint, plain text. Got: ${file.mimetype}`
  );
  err.statusCode = 415;
  return cb(err, false);
}

// ── Disk storage ───────────────────────────────────────────────────────────
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

// ── Multer instance ────────────────────────────────────────────────────────
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 20 * 1024 * 1024, // 20 MB
    files: 1,
  },
});

module.exports = { upload };
