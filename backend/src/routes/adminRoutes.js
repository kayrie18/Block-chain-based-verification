const express = require("express");
const router = express.Router();
const adminController = require("../controllers/adminController");
const { requireAuth, requireRole } = require("../middleware/auth");

// DELETE /api/admin/clear?type=all
router.delete("/clear", requireAuth, requireRole("Admin"), adminController.clearData);

module.exports = router;
