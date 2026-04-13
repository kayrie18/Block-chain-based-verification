const fs = require("fs/promises");
const path = require("path");
const { Document } = require("../models/Document");
const { User } = require("../models/User");
const { AuditLog } = require("../models/AuditLog");
const { getLocalUploadDir } = require("../services/storageService");

function formatBytes(bytes) {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  let value = Number(bytes);
  let index = 0;
  while (value >= 1024 && index < units.length - 1) {
    value /= 1024;
    index += 1;
  }
  return `${value.toFixed(2)} ${units[index]}`;
}

async function getUploadDirSize() {
  const root = path.resolve(process.cwd(), "uploads");
  try {
    const items = await fs.readdir(root, { withFileTypes: true });
    const totals = await Promise.all(
      items.map(async (item) => {
        if (!item.isFile()) return 0;
        const info = await fs.stat(path.join(root, item.name));
        return info.size;
      })
    );
    return totals.reduce((sum, value) => sum + value, 0);
  } catch (err) {
    return 0;
  }
}

async function getMetrics(req, res, next) {
  try {
    const filter = {};
    if (req.auth && req.auth.role === "Issuer") {
      filter.uploadedBy = req.auth.userId;
    }

    const totalDocuments = await Document.countDocuments(filter);
    const issuerCount = await User.countDocuments({ role: "Issuer" });
    const verifiedDocuments = await Document.countDocuments({ ...filter, "blockchain.confirmed": true });
    const aggregate = await Document.aggregate([
      { $match: filter },
      { $group: { _id: null, totalBytes: { $sum: "$sizeBytes" } } },
    ]);
    const storedBytes = aggregate?.[0]?.totalBytes || 0;
    const uploadDirBytes = await getUploadDirSize();
    const health = Math.min(100, 100 - Math.max(0, totalDocuments / 100));

    return res.status(200).json({
      totalDocuments,
      totalVerified: verifiedDocuments,
      totalIssuers: issuerCount,
      storageUsedBytes: uploadDirBytes,
      storageUsedHuman: formatBytes(uploadDirBytes),
      storageDeclaredBytes: storedBytes,
      blockchainLatencyMs: process.env.ETH_RPC_URL ? 1100 : 450,
      systemHealth: Number(health.toFixed(2)),
      uploadsDirectory: getLocalUploadDir(),
    });
  } catch (err) {
    return next(err);
  }
}

async function getAuditLog(req, res, next) {
  try {
    const logs = await AuditLog.find()
      .sort({ timestamp: -1 })
      .limit(20)
      .lean();

    const formattedLogs = logs.map((log) => ({
      id: log._id.toString(),
      userId: log.userId?.toString() || null,
      userName: log.userName,
      action: log.action,
      details: log.details,
      timestamp: log.timestamp,
      type: log.type,
    }));

    return res.status(200).json({ logs: formattedLogs });
  } catch (err) {
    return next(err);
  }
}

module.exports = { getMetrics, getAuditLog };
