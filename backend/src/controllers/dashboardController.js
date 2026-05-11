const fs = require("fs/promises");
const path = require("path");
const { Document } = require("../models/Document");
const { User } = require("../models/User");
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
    const totalDocuments = await Document.countDocuments();
    const issuerCount = await User.countDocuments({ role: "Issuer" });
    const verifiedDocuments = await Document.countDocuments({ "blockchain.confirmed": true });
    const aggregate = await Document.aggregate([
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

const { AuditLog } = require("../models/AuditLog");

async function getAuditLog(req, res, next) {
  try {
    const parsedLimit = Number(req.query?.limit);
    const parsedPage = Number(req.query?.page);
    const limit = Number.isFinite(parsedLimit) && parsedLimit > 0 ? Math.min(parsedLimit, 50) : 20;
    const page = Number.isFinite(parsedPage) && parsedPage > 0 ? parsedPage : 1;
    const skip = (page - 1) * limit;

    const filter = {};
    if (req.auth.role !== "Admin") {
      filter.userId = req.auth.userId;
    }

    const [logs, total] = await Promise.all([
      AuditLog.find(filter)
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(limit)
        .lean()
        .exec(),
      AuditLog.countDocuments(filter).exec(),
    ]);

    return res.status(200).json({
      logs: logs.map((entry) => ({
        id: String(entry._id),
        userId: entry.userId ? String(entry.userId) : null,
        userName: entry.userName,
        action: entry.action,
        details: entry.details,
        type: entry.type,
        metadata: entry.metadata || {},
        timestamp: entry.timestamp,
      })),
      page: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 0,
      },
    });
  } catch (err) {
    return next(err);
  }
}

module.exports = { getMetrics, getAuditLog };
