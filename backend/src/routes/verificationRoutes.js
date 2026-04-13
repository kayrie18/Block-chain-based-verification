const express = require("express");
const { verifyUploadedDocument } = require("../controllers/verificationController");
const { requireAuth, requireRole } = require("../middleware/auth");
const { upload } = require("../middleware/upload");

const router = express.Router();

// POST /api/verification/documents/:documentId
// multipart/form-data, file field: "document"
router.post(
  "/documents/:documentId",
  requireAuth,
  requireRole("Admin", "Issuer", "Verifier", "User"),
  upload.single("document"),
  verifyUploadedDocument
);

module.exports = router;

