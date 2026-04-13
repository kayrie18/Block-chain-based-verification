const express = require("express");
const { uploadDocument } = require("../controllers/documentController");
const { getDocumentHash, verifyDocumentHash } = require("../controllers/hashController");
const { requireAuth, requireRole } = require("../middleware/auth");
const { upload } = require("../middleware/upload");

const router = express.Router();

// POST /api/documents/upload (multipart/form-data)
// file field: "document"
router.post(
  "/upload",
  requireAuth,
  requireRole("Admin", "Issuer", "User"),
  upload.single("document"),
  uploadDocument
);

// GET /api/documents/:id/hash
router.get("/:id/hash", requireAuth, getDocumentHash);

// GET /api/documents/:id/verify-hash?hash=<sha256hex>
router.get("/:id/verify-hash", requireAuth, verifyDocumentHash);

module.exports = router;

