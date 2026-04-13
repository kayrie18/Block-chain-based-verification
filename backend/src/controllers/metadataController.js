const { Document } = require("../models/Document");

function toMetadataDTO(doc) {
  return {
    id: doc._id.toString(),
    title: doc.title,
    ownerName: doc.ownerName,
    issuingOrganization: doc.issuingOrganization,
    documentType: doc.documentType,
    uploadDate: doc.uploadDate,
    sha256Hash: doc.sha256Hash,
    blockchain: doc.blockchain || null,
    storageProvider: doc.storageProvider,
    ipfsCid: doc.ipfsCid,
    uploadedBy: doc.uploadedBy?.toString ? doc.uploadedBy.toString() : doc.uploadedBy,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

async function createMetadataRecord(req, res, next) {
  // Optional: supports creating metadata without file upload (if needed by frontend workflow).
  // In the standard flow, metadata is created during /api/documents/upload already.
  try {
    const title = String(req.body?.title || "").trim();
    const ownerName = String(req.body?.ownerName || "").trim();
    const issuingOrganization = String(req.body?.issuingOrganization || "").trim();
    const documentType = String(req.body?.documentType || "").trim();
    const uploadDateRaw = req.body?.uploadDate;
    const sha256Hash = String(req.body?.sha256Hash || "").trim().toLowerCase();
    const transactionId = String(req.body?.transactionId || "").trim() || null;

    if (!title || !ownerName || !issuingOrganization || !documentType) {
      return res.status(400).json({
        error: { message: "title, ownerName, issuingOrganization, and documentType are required" },
      });
    }
    if (!/^[a-f0-9]{64}$/.test(sha256Hash)) {
      return res.status(400).json({ error: { message: "sha256Hash must be a 64-char hex SHA-256 value" } });
    }

    const uploadDate = uploadDateRaw ? new Date(uploadDateRaw) : new Date();
    if (Number.isNaN(uploadDate.getTime())) {
      return res.status(400).json({ error: { message: "uploadDate is invalid" } });
    }

    const doc = await Document.create({
      title,
      ownerName,
      issuingOrganization,
      documentType,
      uploadDate,
      originalFileName: req.body?.originalFileName || "N/A",
      mimeType: req.body?.mimeType || "application/octet-stream",
      sizeBytes: Number(req.body?.sizeBytes || 0),
      storageProvider: req.body?.storageProvider || "local",
      storagePath: req.body?.storagePath || "N/A",
      ipfsCid: req.body?.ipfsCid || null,
      sha256Hash,
      blockchain: transactionId ? { transactionId, confirmed: false } : undefined,
      uploadedBy: req.auth.userId,
    });

    return res.status(201).json({ metadata: toMetadataDTO(doc) });
  } catch (err) {
    return next(err);
  }
}

async function getMetadataById(req, res, next) {
  try {
    const id = req.params.id;
    const doc = await Document.findById(id).exec();
    if (!doc) return res.status(404).json({ error: { message: "Document metadata not found" } });
    return res.status(200).json({ metadata: toMetadataDTO(doc) });
  } catch (err) {
    return next(err);
  }
}

async function listMetadata(req, res, next) {
  try {
    const parsedLimit = Number(req.query?.limit);
    const parsedSkip = Number(req.query?.skip);
    const limit = Number.isFinite(parsedLimit) && parsedLimit > 0 ? Math.min(parsedLimit, 100) : 20;
    const skip = Number.isFinite(parsedSkip) && parsedSkip >= 0 ? parsedSkip : 0;

    const docs = await Document.find({})
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .select("title ownerName issuingOrganization documentType uploadDate sha256Hash blockchain uploadedBy createdAt updatedAt storageProvider ipfsCid")
      .exec();

    return res.status(200).json({
      items: docs.map(toMetadataDTO),
      page: { skip, limit },
    });
  } catch (err) {
    return next(err);
  }
}

async function updateMetadata(req, res, next) {
  try {
    const id = req.params.id;
    const doc = await Document.findById(id).exec();
    if (!doc) return res.status(404).json({ error: { message: "Document metadata not found" } });

    const isAdmin = req.auth.role === "Admin";
    const isIssuer = req.auth.role === "Issuer";
    const isOwner = String(doc.uploadedBy) === String(req.auth.userId);

    if (!isAdmin && !isIssuer && !isOwner) {
      return res.status(403).json({ error: { message: "Forbidden" } });
    }

    const allowedFields = ["title", "ownerName", "issuingOrganization", "documentType", "uploadDate"];
    for (const field of allowedFields) {
      if (req.body?.[field] != null) {
        if (field === "uploadDate") {
          const d = new Date(req.body.uploadDate);
          if (Number.isNaN(d.getTime())) {
            return res.status(400).json({ error: { message: "uploadDate is invalid" } });
          }
          doc.uploadDate = d;
        } else {
          doc[field] = String(req.body[field]).trim();
        }
      }
    }

    await doc.save();
    return res.status(200).json({ metadata: toMetadataDTO(doc) });
  } catch (err) {
    return next(err);
  }
}

async function deleteMetadata(req, res, next) {
  try {
    const id = req.params.id;
    const deleted = await Document.findByIdAndDelete(id).exec();
    if (!deleted) return res.status(404).json({ error: { message: "Document metadata not found" } });
    return res.status(200).json({ status: "deleted", id });
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  createMetadataRecord,
  getMetadataById,
  listMetadata,
  updateMetadata,
  deleteMetadata,
};

