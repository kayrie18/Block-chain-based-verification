const express = require("express");
const router = express.Router();
const auditController = require("../controllers/auditController");
const { requireAuth } = require("../middleware/auth");

// Only authenticated users can view logs
router.get("/", requireAuth, auditController.getLogs);

module.exports = router;
