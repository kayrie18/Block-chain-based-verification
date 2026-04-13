const { User } = require("../models/User");
const { logAction } = require("./auditController");

async function getMe(req, res) {
  // `attachUser` middleware loads the full user model as `req.user`
  return res.status(200).json({ user: req.user.toSafeJSON() });
}

async function updateProfile(req, res, next) {
  try {
    const user = req.user;
    const name = String(req.body?.name || user.name).trim();
    const email = String(req.body?.email || user.email).trim().toLowerCase();
    const organization = String(req.body?.organization || user.organization || "").trim() || null;
    const password = req.body?.password ? String(req.body.password) : undefined;

    if (!name) {
      return res.status(400).json({ error: { message: "Name is required" } });
    }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: { message: "Valid email is required" } });
    }
    if (password !== undefined && password.length < 8) {
      return res.status(400).json({ error: { message: "Password must be at least 8 characters" } });
    }

    if (email !== user.email) {
      const existing = await User.findOne({ email });
      if (existing) {
        return res.status(409).json({ error: { message: "Email is already registered" } });
      }
    }

    user.name = name;
    user.email = email;
    user.organization = organization;
    if (password) user.password = password;

    if (req.file) {
      // For local storage, we store the filename or a relative path
      // The frontend will prepend the base URL
      user.profilePicture = req.file.filename;
    }

    await user.save();

    await logAction({
      userId: user._id,
      action: "Profile Update",
      details: `User ${user.name} updated their profile information${req.file ? " and picture" : ""}.`,
      type: "success",
    });

    return res.status(200).json({ user: user.toSafeJSON(), message: "Profile updated successfully" });
  } catch (err) {
    if (err?.code === 11000) {
      return res.status(409).json({ error: { message: "Email is already registered" } });
    }
    return next(err);
  }
}

async function listUsers(req, res) {
  try {
    const users = await User.find({}, '-passwordHash').sort({ createdAt: -1 });
    return res.status(200).json({ users: users.map(u => u.toSafeJSON()) });
  } catch (err) {
    return res.status(500).json({ error: { message: "Failed to fetch users" } });
  }
}

module.exports = { getMe, updateProfile, listUsers };

