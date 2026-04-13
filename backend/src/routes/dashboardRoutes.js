const express = require("express");
const { getMetrics, getAuditLog } = require("../controllers/dashboardController");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

router.get("/metrics", requireAuth, getMetrics);
router.get("/audit", requireAuth, getAuditLog);

module.exports = router;
