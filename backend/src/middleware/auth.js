const { User } = require("../models/User");
const { verifyAuthToken } = require("../utils/jwt");

function requireAuth(req, res, next) {
  try {
    const header = req.headers.authorization || "";
    const [scheme, headerToken] = header.split(" ");
    let token = null;

    if (scheme === "Bearer" && headerToken) {
      token = headerToken;
    } else if (req.query?.token) {
      token = String(req.query.token);
    }

    if (!token) {
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

function requireApprovedVerifier(req, res, next) {
  if (req.auth?.role !== "Verifier") {
    return next();
  }
  if (!req.user) {
    return res.status(401).json({ error: { message: "User context is required" } });
  }
  if (!req.user.isVerifierApproved) {
    return res.status(403).json({ error: { message: "Verifier account is pending admin approval" } });
  }
  return next();
}

module.exports = { requireAuth, requireRole, attachUser, requireApprovedVerifier };

