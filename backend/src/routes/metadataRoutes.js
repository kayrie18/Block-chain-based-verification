const express = require("express");
const {
  createMetadataRecord,
  getMetadataById,
  listMetadata,
  updateMetadata,
  deleteMetadata,
} = require("../controllers/metadataController");
const { requireAuth, requireRole } = require("../middleware/auth");

const router = express.Router();

// GET /api/metadata?skip=0&limit=20
router.get("/", requireAuth, listMetadata);

// POST /api/metadata (optional, non-upload flow)
router.post("/", requireAuth, requireRole("Admin", "Issuer"), createMetadataRecord);

// GET /api/metadata/:id
router.get("/:id", requireAuth, getMetadataById);

// PATCH /api/metadata/:id
router.patch("/:id", requireAuth, updateMetadata);

// DELETE /api/metadata/:id (admin-only)
router.delete("/:id", requireAuth, requireRole("Admin"), deleteMetadata);

module.exports = router;

