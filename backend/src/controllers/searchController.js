const { Document } = require("../models/Document");

function computeVerificationStatus(doc) {
  // Lightweight status intended for list/search views.
  // Full cryptographic verification is done via /api/verification.
  if (doc?.blockchain?.confirmed) return "OnChainConfirmed";
  if (doc?.blockchain?.transactionId) return "OnChainPending";
  return "NotOnChain";
}

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

async function searchDocuments(req, res, next) {
  try {
    const {
      q,
      title,
      ownerName,
      issuingOrganization,
      documentType,
      uploadDateFrom,
      uploadDateTo,
      sha256Hash,
      blockchainTx,
    } = req.query || {};

    const parsedLimit = Number(req.query?.limit);
    const parsedPage = Number(req.query?.page);
    const limit = Number.isFinite(parsedLimit) && parsedLimit > 0 ? Math.min(parsedLimit, 100) : 20;
    const page = Number.isFinite(parsedPage) && parsedPage > 0 ? parsedPage : 1;
    const skip = (page - 1) * limit;

    const allowedSortBy = new Set([
      "uploadDate",
      "createdAt",
      "updatedAt",
      "title",
      "ownerName",
      "issuingOrganization",
      "documentType",
    ]);
    const requestedSortBy = String(req.query?.sortBy || "uploadDate");
    const sortBy = allowedSortBy.has(requestedSortBy) ? requestedSortBy : "uploadDate";
    const sortDir = String(req.query?.sortDir || "desc").toLowerCase() === "asc" ? 1 : -1;
    const sort = { [sortBy]: sortDir, _id: -1 };

    const filter = {};

    if (req.auth && req.auth.role === "Issuer") {
      filter.uploadedBy = req.auth.userId;
    }

    if (sha256Hash) {
      filter.sha256Hash = String(sha256Hash).trim().toLowerCase();
    }

    if (blockchainTx) {
      filter["blockchain.transactionId"] = String(blockchainTx).trim();
    }

    const uploadDate = {};
    if (uploadDateFrom) {
      const d = new Date(uploadDateFrom);
      if (Number.isNaN(d.getTime())) {
        return res.status(400).json({ error: { message: "uploadDateFrom is invalid" } });
      }
      uploadDate.$gte = d;
    }
    if (uploadDateTo) {
      const d = new Date(uploadDateTo);
      if (Number.isNaN(d.getTime())) {
        return res.status(400).json({ error: { message: "uploadDateTo is invalid" } });
      }
      uploadDate.$lte = d;
    }
    if (Object.keys(uploadDate).length) {
      filter.uploadDate = uploadDate;
    }

    const and = [];
    const addRegex = (field, value) => {
      const v = String(value || "").trim();
      if (!v) return;
      and.push({ [field]: { $regex: escapeRegex(v), $options: "i" } });
    };

    addRegex("title", title);
    addRegex("ownerName", ownerName);
    addRegex("issuingOrganization", issuingOrganization);
    addRegex("documentType", documentType);

    const quick = String(q || "").trim();
    if (quick) {
      // Prefer text search when possible; fallback to regex OR if text index isn’t used by Mongo for any reason.
      // Note: cannot mix $text with other regex clauses efficiently; keep it simple.
      and.push({
        $or: [
          { title: { $regex: escapeRegex(quick), $options: "i" } },
          { ownerName: { $regex: escapeRegex(quick), $options: "i" } },
          { issuingOrganization: { $regex: escapeRegex(quick), $options: "i" } },
          { documentType: { $regex: escapeRegex(quick), $options: "i" } },
          { sha256Hash: { $regex: escapeRegex(quick.toLowerCase()), $options: "i" } },
          { "blockchain.transactionId": { $regex: escapeRegex(quick), $options: "i" } },
        ],
      });
    }

    if (and.length) filter.$and = and;

    const projection =
      "title ownerName issuingOrganization documentType uploadDate sha256Hash blockchain storageProvider ipfsCid uploadedBy createdAt updatedAt";

    const [items, total] = await Promise.all([
      Document.find(filter).select(projection).sort(sort).skip(skip).limit(limit).lean().exec(),
      Document.countDocuments(filter).exec(),
    ]);

    return res.status(200).json({
      items: items.map((d) => ({
        id: String(d._id),
        title: d.title,
        ownerName: d.ownerName,
        issuingOrganization: d.issuingOrganization,
        documentType: d.documentType,
        uploadDate: d.uploadDate,
        sha256Hash: d.sha256Hash,
        blockchain: d.blockchain || null,
        verificationStatus: computeVerificationStatus(d),
        storageProvider: d.storageProvider,
        ipfsCid: d.ipfsCid,
        uploadedBy: d.uploadedBy,
        createdAt: d.createdAt,
        updatedAt: d.updatedAt,
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

module.exports = { searchDocuments };

