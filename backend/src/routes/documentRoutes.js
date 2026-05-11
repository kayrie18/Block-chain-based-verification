const express = require("express");
const {
  uploadDocument,
  downloadDocument,
  revokeDocument,
  viewDocument,
  publicDownloadDocument,
  publicViewDocument,
} = require("../controllers/documentController");
const { requireAuth, attachUser } = require("../middleware/auth");
const { upload } = require("../middleware/upload");

const router = express.Router();

// POST /api/documents/upload
router.post("/upload", requireAuth, attachUser, upload.single("document"), uploadDocument);

// Protected document actions
router.get("/:id/download", requireAuth, attachUser, downloadDocument);
router.get("/:id/view", requireAuth, attachUser, viewDocument);
router.patch("/:id/revoke", requireAuth, attachUser, revokeDocument);

// Public verification-friendly document access
router.get("/public/:id/view", publicViewDocument);
router.get("/public/:id/download", publicDownloadDocument);

module.exports = router;
