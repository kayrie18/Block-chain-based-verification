const express = require("express");
const { searchDocuments, publicSearchDocuments } = require("../controllers/searchController");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

// GET /api/search/documents?...filters...
router.get("/documents", requireAuth, searchDocuments);

// GET /api/search/public?q=...
router.get("/public", publicSearchDocuments);

module.exports = router;

