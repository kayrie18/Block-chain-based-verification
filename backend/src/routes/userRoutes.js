const express = require("express");
const { getMe, updateProfile, listUsers } = require("../controllers/userController");
const { requireAuth, attachUser, requireRole } = require("../middleware/auth");
const { upload } = require("../middleware/upload");

const router = express.Router();

// GET /api/users/me
router.get("/me", requireAuth, attachUser, getMe);

// PATCH /api/users/me
router.patch("/me", requireAuth, attachUser, upload.single("profilePicture"), updateProfile);

// GET /api/users (admin only)
router.get("/", requireAuth, requireRole("Admin"), listUsers);

// Example of role-based access control endpoint (handy for frontend gating)
// GET /api/users/admin-only
router.get("/admin-only", requireAuth, requireRole("Admin"), (req, res) => {
  res.status(200).json({ ok: true, message: "Welcome, Admin." });
});

module.exports = router;
