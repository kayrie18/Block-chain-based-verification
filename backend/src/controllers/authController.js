const { User, ROLES } = require("../models/User");
const { signAuthToken } = require("../utils/jwt");

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function isValidEmail(email) {
  // Intentionally simple; frontend can enforce stricter rules.
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isValidRole(role) {
  return Object.values(ROLES).includes(role);
}

async function register(req, res, next) {
  try {
    const name = String(req.body?.name || "").trim();
    const email = normalizeEmail(req.body?.email);
    const password = String(req.body?.password || "");
    const requestedRole = String(req.body?.role || ROLES.User);
    const organization = String(req.body?.organization || "").trim() || null;
    const publicRoles = [ROLES.User, ROLES.Issuer, ROLES.Verifier];
    const role = publicRoles.includes(requestedRole) ? requestedRole : ROLES.User;

    if (!name) return res.status(400).json({ error: { message: "Name is required" } });
    if (!email || !isValidEmail(email)) {
      return res.status(400).json({ error: { message: "Valid email is required" } });
    }
    if (!password || password.length < 8) {
      return res.status(400).json({ error: { message: "Password must be at least 8 characters" } });
    }

    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(409).json({ error: { message: "Email is already registered" } });
    }

    const user = new User({ name, email, role, organization });
    user.password = password; // triggers bcrypt hashing in model pre-save
    await user.save();

    const token = signAuthToken({ userId: user._id.toString(), role: user.role });
    return res.status(201).json({ user: user.toSafeJSON(), token });
  } catch (err) {
    // Handle duplicate email race
    if (err?.code === 11000) {
      return res.status(409).json({ error: { message: "Email is already registered" } });
    }
    return next(err);
  }
}

async function login(req, res, next) {
  try {
    const email = normalizeEmail(req.body?.email);
    const password = String(req.body?.password || "");

    if (!email || !isValidEmail(email)) {
      return res.status(400).json({ error: { message: "Valid email is required" } });
    }
    if (!password) return res.status(400).json({ error: { message: "Password is required" } });

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ error: { message: "Invalid credentials" } });
    }

    const ok = await user.verifyPassword(password);
    if (!ok) {
      return res.status(401).json({ error: { message: "Invalid credentials" } });
    }

    const token = signAuthToken({ userId: user._id.toString(), role: user.role });
    return res.status(200).json({ user: user.toSafeJSON(), token });
  } catch (err) {
    return next(err);
  }
}

async function verifyRole(req, res) {
  // Requires auth middleware; uses JWT payload as “source of truth” for role gating.
  const { userId, role } = req.auth;

  const allowed = req.query?.allowed;
  if (typeof allowed === "string" && allowed.trim()) {
    const allowedRoles = allowed
      .split(",")
      .map((r) => r.trim())
      .filter(Boolean);
    const isAllowed = allowedRoles.includes(role);
    return res.status(200).json({ userId, role, isAllowed, allowedRoles });
  }

  return res.status(200).json({ userId, role });
}

module.exports = { register, login, verifyRole };

