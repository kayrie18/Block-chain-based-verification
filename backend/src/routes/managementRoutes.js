const express = require("express");
const { listPendingDocuments, approvePendingDocument, rejectPendingDocument } = require("../controllers/managementController");
const { requireAuth, requireRole, attachUser } = require("../middleware/auth");

const router = express.Router();

router.get(
  "/pending",
  requireAuth,
  requireRole("Admin", "Verifier"),
  attachUser,
  listPendingDocuments
);

router.post(
  "/approve/:id",
  requireAuth,
  requireRole("Admin", "Verifier"),
  attachUser,
  approvePendingDocument
);

router.post(
  "/reject/:id",
  requireAuth,
  requireRole("Admin", "Verifier"),
  attachUser,
  rejectPendingDocument
);

module.exports = router;
