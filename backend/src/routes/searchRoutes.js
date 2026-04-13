const express = require("express");
const { searchDocuments } = require("../controllers/searchController");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

// GET /api/search/documents?...filters...
router.get("/documents", requireAuth, searchDocuments);

module.exports = router;

