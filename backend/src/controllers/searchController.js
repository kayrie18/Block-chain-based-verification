const { Document } = require("../models/Document");
const { getDocumentHashFromChain } = require("../services/blockchainService");
const { compareHashesSecure, isSha256Hex, normalizeSha256 } = require("../services/verificationService");
const { logAction } = require("./auditController");

function computeVerificationStatus(doc) {
  if (!doc) return "Not Found";
  if (doc.isRevoked || doc.status === "revoked") return "Revoked";
  if (doc.expiryDate && new Date(doc.expiryDate).getTime() < Date.now()) return "Expired";
  if (doc?.blockchain?.confirmed) return "Valid";
  if (doc?.blockchain?.transactionId) return "Pending";
  return "Not Found";
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

    if (req.auth) {
      if (req.auth.role === "Issuer" || req.auth.role === "User") {
        // Issuers and normal Users only see documents they uploaded
        filter.uploadedBy = req.auth.userId;
      } else if (req.auth.role === "Verifier") {
        // Verifiers see all documents from their organization
        filter.issuingOrganization = req.user?.organization;
      }
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
      "title ownerName issuingOrganization documentType uploadDate sha256Hash blockchain storageProvider ipfsCid uploadedBy status isRevoked expiryDate digitalSignature createdAt updatedAt";

    const [dbItems, total] = await Promise.all([
      Document.find(filter).select(projection).sort(sort).skip(skip).limit(limit).lean().exec(),
      Document.countDocuments(filter).exec(),
    ]);

    const items = await Promise.all(dbItems.map(async (d) => {
      let isAuthentic = false;
      let verificationStatus = computeVerificationStatus(d);
      
      try {
        const onChain = await getDocumentHashFromChain({ documentId: String(d._id), fallbackSha256Hash: d.sha256Hash });
        const originalHash = normalizeSha256(onChain.sha256HashHex);
        const uploadedHash = d.sha256Hash;
        isAuthentic = compareHashesSecure(uploadedHash, originalHash);
        verificationStatus = isAuthentic ? "Valid" : "Tampered";
      } catch (err) {
        verificationStatus = computeVerificationStatus(d);
      }

      return {
        id: String(d._id),
        title: d.title,
        ownerName: d.ownerName,
        issuingOrganization: d.issuingOrganization,
        documentType: d.documentType,
        uploadDate: d.uploadDate,
        sha256Hash: d.sha256Hash,
        status: d.status,
        isRevoked: d.isRevoked,
        expiryDate: d.expiryDate,
        digitalSignature: d.digitalSignature,
        blockchain: d.blockchain || null,
        verificationStatus,
        isAuthentic,
        storageProvider: d.storageProvider,
        ipfsCid: d.ipfsCid,
        uploadedBy: d.uploadedBy,
        createdAt: d.createdAt,
        updatedAt: d.updatedAt,
      };
    }));

    if (req.auth) {
      await logAction({
        userId: req.auth.userId,
        userName: req.user?.name,
        action: "Dashboard Search",
        details: `User performed a search query: "${q || title || sha256Hash || 'General'}"`,
        type: "info",
      });
    }

    return res.status(200).json({
      items,
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

async function publicSearchDocuments(req, res, next) {
  try {
    const q = String(req.query?.q || "").trim();
    if (!q) {
      return res.status(400).json({ error: { message: "Search query is required (Document ID or Hash)." } });
    }

    const filter = { status: "verified" };
    
    // Allow either exact match by Object ID (if length 24) or by SHA256 hash
    if (q.length === 24 && /^[0-9a-fA-F]{24}$/.test(q)) {
      filter._id = q;
    } else {
      filter.sha256Hash = q.toLowerCase();
    }

    const projection =
      "title ownerName issuingOrganization documentType uploadDate sha256Hash blockchain storageProvider ipfsCid status isRevoked expiryDate createdAt";

    const doc = await Document.findOne(filter).select(projection).lean().exec();

    if (!doc) {
      return res.status(404).json({ status: "Not Found", error: { message: "No verified document found matching this query." } });
    }

    let onChain;
    try {
      onChain = await getDocumentHashFromChain({ documentId: doc._id.toString(), fallbackSha256Hash: doc.sha256Hash });
    } catch (err) {
      // Failed to retrieve from blockchain
      const payload = {
        document: {
          id: String(doc._id),
          title: doc.title,
          ownerName: doc.ownerName,
          issuingOrganization: doc.issuingOrganization,
          documentType: doc.documentType,
          uploadDate: doc.uploadDate,
          sha256Hash: doc.sha256Hash,
          status: doc.status,
          isRevoked: doc.isRevoked,
          expiryDate: doc.expiryDate,
          blockchain: doc.blockchain || null,
          storageProvider: doc.storageProvider,
          ipfsCid: doc.ipfsCid,
          verificationStatus: computeVerificationStatus(doc),
          isAuthentic: false,
          createdAt: doc.createdAt,
        }
      };
      await logAction({
        userId: null,
        userName: "Public User",
        action: "Document Verification Search",
        details: `Public verification failed blockchain lookup for document ID: ${doc._id}`,
        type: "warning",
        metadata: { documentId: doc._id },
      });
      return res.status(200).json(payload);
    }

    const originalHash = normalizeSha256(onChain.sha256HashHex);
    const uploadedHash = doc.sha256Hash;
    const matches = compareHashesSecure(uploadedHash, originalHash);

    const status = matches ? computeVerificationStatus(doc) : "Tampered";
    await logAction({
      userId: req.auth?.userId || null,
      userName: req.user?.name || "Public User",
      action: "Document Verification Search",
      details: `Public verification triggered for document ID: ${doc._id}. Result: ${status}`,
      type: matches ? "success" : "warning",
      metadata: { documentId: doc._id, isAuthentic: matches },
    });
    return res.status(200).json({
      document: {
        id: String(doc._id),
        title: doc.title,
        ownerName: doc.ownerName,
        issuingOrganization: doc.issuingOrganization,
        documentType: doc.documentType,
        uploadDate: doc.uploadDate,
        sha256Hash: doc.sha256Hash,
        status: doc.status,
        isRevoked: doc.isRevoked,
        expiryDate: doc.expiryDate,
        blockchain: doc.blockchain || null,
        storageProvider: doc.storageProvider,
        ipfsCid: doc.ipfsCid,
        verificationStatus: status,
        isAuthentic: matches,
        createdAt: doc.createdAt,
      }
    });

  } catch (err) {
    return next(err);
  }
}

module.exports = { searchDocuments, publicSearchDocuments };

