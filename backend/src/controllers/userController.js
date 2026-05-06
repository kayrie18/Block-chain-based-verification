const { User, ROLES } = require("../models/User");

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

    await user.save();
    return res.status(200).json({ user: user.toSafeJSON(), message: "Profile updated successfully" });
  } catch (err) {
    if (err?.code === 11000) {
      return res.status(409).json({ error: { message: "Email is already registered" } });
    }
    return next(err);
  }
}

async function uploadAvatar(req, res, next) {
  try {
    const user = req.user;
    if (!req.file) {
      return res.status(400).json({ error: { message: "Avatar image is required" } });
    }

    // Since upload middleware saves it to `uploads`, we just need the filename.
    // persistUploadedFile also registers the document, but this is an avatar, so we just use the req.file.filename directly.
    const fileUrl = `/uploads/${req.file.filename}`;
    
    user.profilePictureUrl = fileUrl;
    await user.save();
    
    return res.status(200).json({ user: user.toSafeJSON(), message: "Profile picture updated successfully" });
  } catch (err) {
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

async function updateUserRole(req, res, next) {
  try {
    const targetId = req.params.id;
    const targetUser = await User.findById(targetId);
    if (!targetUser) return res.status(404).json({ error: { message: "User not found" } });
    if (targetUser.role === ROLES.Admin && req.auth.userId !== targetId) {
      return res.status(403).json({ error: { message: "Cannot change Admin role" } });
    }

    const role = String(req.body?.role || targetUser.role).trim();
    const isVerifierApproved = req.body?.isVerifierApproved === true || req.body?.isVerifierApproved === 'true';

    if (!Object.values(ROLES).includes(role)) {
      return res.status(400).json({ error: { message: "Invalid role specified" } });
    }

    targetUser.role = role;
    if (role === ROLES.Verifier) {
      targetUser.isVerifierApproved = isVerifierApproved;
    } else {
      targetUser.isVerifierApproved = false;
    }

    await targetUser.save();
    return res.status(200).json({ user: targetUser.toSafeJSON(), message: "User role updated successfully" });
  } catch (err) {
    return next(err);
  }
}

async function deleteUser(req, res, next) {
  try {
    const targetId = req.params.id;
    const targetUser = await User.findById(targetId);
    if (!targetUser) return res.status(404).json({ error: { message: "User not found" } });
    if (targetUser.role === ROLES.Admin) {
      return res.status(400).json({ error: { message: "Cannot delete an Admin user" } });
    }

    await User.deleteOne({ _id: targetId });
    return res.status(200).json({ message: "User account deleted successfully" });
  } catch (err) {
    return next(err);
  }
}

async function approveUser(req, res, next) {
  try {
    const targetId = req.params.id;
    const targetUser = await User.findById(targetId);
    if (!targetUser) return res.status(404).json({ error: { message: "User not found" } });
    if (targetUser.role === 'Admin') return res.status(400).json({ error: { message: "Cannot approve Admin" } });

    targetUser.role = 'Verifier';
    targetUser.isVerifierApproved = true;
    await targetUser.save();

    return res.status(200).json({ user: targetUser.toSafeJSON(), message: "User promoted to Verifier" });
  } catch (err) {
    return next(err);
  }
}

module.exports = { getMe, updateProfile, uploadAvatar, listUsers, approveUser, updateUserRole, deleteUser };

