const express = require("express");
const { register, login, verifyRole } = require("../controllers/authController");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

// POST /api/auth/register
router.post("/register", register);

// POST /api/auth/login
router.post("/login", login);

// GET /api/auth/verify-role?allowed=Admin,Issuer
router.get("/verify-role", requireAuth, verifyRole);

module.exports = router;

