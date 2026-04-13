const { User } = require("../models/User");
const { verifyAuthToken } = require("../utils/jwt");

function requireAuth(req, res, next) {
  try {
    const header = req.headers.authorization || "";
    const [scheme, token] = header.split(" ");

    if (scheme !== "Bearer" || !token) {
      return res.status(401).json({ error: { message: "Missing Bearer token" } });
    }

    const payload = verifyAuthToken(token);
    req.auth = {
      userId: payload.sub,
      role: payload.role,
    };
    return next();
  } catch (err) {
    return res.status(401).json({ error: { message: "Invalid or expired token" } });
  }
}

function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.auth?.role) {
      return res.status(401).json({ error: { message: "Not authenticated" } });
    }
    if (!allowedRoles.includes(req.auth.role)) {
      return res.status(403).json({ error: { message: "Forbidden" } });
    }
    return next();
  };
}

async function attachUser(req, res, next) {
  if (!req.auth?.userId) return next();
  try {
    const user = await User.findById(req.auth.userId);
    if (!user) {
      return res.status(401).json({ error: { message: "User no longer exists" } });
    }
    req.user = user;
    return next();
  } catch (err) {
    return next(err);
  }
}

module.exports = { requireAuth, requireRole, attachUser };

