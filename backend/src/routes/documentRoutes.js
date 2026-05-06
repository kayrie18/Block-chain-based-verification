const express = require("express");
const { uploadDocument, downloadDocument, revokeDocument, viewDocument } = require("../controllers/documentController");
const { requireAuth, requireRole, attachUser, requireApprovedVerifier } = require("../middleware/auth");
const { upload } = require("../middleware/upload");

const router = express.Router();

// POST /api/documents/upload (multipart/form-data)
// file field: "document"
router.post(
  "/upload",
  requireAuth,
  attachUser,
  requireRole("Admin", "Issuer", "Verifier"),
  requireApprovedVerifier,
  upload.single("document"),
  uploadDocument
);

// GET /api/documents/:id/download (Secure access control)
router.get("/:id/download", requireAuth, attachUser, requireRole("Admin", "Issuer", "User", "Verifier"), downloadDocument);

// GET /api/documents/:id/view (Inline preview)
router.get("/:id/view", requireAuth, attachUser, requireRole("Admin", "Issuer", "User", "Verifier"), viewDocument);

// PATCH /api/documents/:id/revoke (Advanced feature)
router.patch("/:id/revoke", requireAuth, attachUser, requireRole("Admin", "Issuer"), revokeDocument);

// Public Routes (Verified Only)
const { publicViewDocument, publicDownloadDocument } = require("../controllers/documentController");
router.get("/public/:id/view", publicViewDocument);
router.get("/public/:id/download", publicDownloadDocument);

module.exports = router;

