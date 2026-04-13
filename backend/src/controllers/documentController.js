const { Document } = require("../models/Document");
const { generateSha256FromFile } = require("../services/hashService");
const { persistUploadedFile } = require("../services/storageService");
const { submitDocumentHashToBlockchain } = require("../services/blockchainService");
const { logAction } = require("./auditController");

async function uploadDocument(req, res, next) {
  try {
    if (!req.file) {
      return res.status(400).json({ error: { message: "Document file is required" } });
    }

    const title = String(req.body?.title || "").trim();
    const ownerName = String(req.body?.ownerName || "").trim();
    const issuingOrganization = String(req.body?.issuingOrganization || "").trim();
    const documentType = String(req.body?.documentType || "").trim();
    const uploadDateRaw = req.body?.uploadDate;

    if (!title || !ownerName || !issuingOrganization || !documentType) {
      return res.status(400).json({
        error: {
          message: "title, ownerName, issuingOrganization, and documentType are required",
        },
      });
    }

    const uploadDate = uploadDateRaw ? new Date(uploadDateRaw) : new Date();
    if (Number.isNaN(uploadDate.getTime())) {
      return res.status(400).json({ error: { message: "uploadDate is invalid" } });
    }

    const stored = await persistUploadedFile(req.file);
    const sha256Hash = await generateSha256FromFile(req.file.path);

    const doc = await Document.create({
      title,
      ownerName,
      issuingOrganization,
      documentType,
      uploadDate,
      originalFileName: req.file.originalname,
      mimeType: req.file.mimetype || "application/octet-stream",
      sizeBytes: req.file.size,
      storageProvider: stored.storageProvider,
      storagePath: stored.storagePath,
      ipfsCid: stored.ipfsCid,
      sha256Hash,
      uploadedBy: req.auth.userId,
    });

    const blockchainResult = await submitDocumentHashToBlockchain({
      documentId: doc._id.toString(),
      sha256Hash,
      uploadedBy: req.auth.userId,
      uploadDate: doc.uploadDate,
      documentType: doc.documentType,
      issuingOrganization: doc.issuingOrganization,
      storageProvider: doc.storageProvider,
      ipfsCid: doc.ipfsCid,
    });

    if (blockchainResult?.accepted) {
      doc.blockchain = {
        transactionId: blockchainResult.transactionId || null,
        confirmed: Boolean(blockchainResult.confirmed),
        blockNumber: blockchainResult.blockNumber ?? null,
        timestamp: blockchainResult.timestamp ?? Math.floor(doc.uploadDate.getTime() / 1000),
      };
      await doc.save();
    }

    await logAction({
      userId: req.auth.userId,
      action: "Document Upload",
      details: `Document "${doc.title}" uploaded and registered on blockchain. Hash: ${sha256Hash.substring(0, 10)}...`,
      type: "success",
      metadata: { documentId: doc._id, txId: doc.blockchain?.transactionId },
    });

    return res.status(201).json({
      status: "uploaded",
      message: "Document received, stored, and hashed successfully.",
      document: {
        id: doc._id.toString(),
        title: doc.title,
        ownerName: doc.ownerName,
        issuingOrganization: doc.issuingOrganization,
        documentType: doc.documentType,
        uploadDate: doc.uploadDate,
        originalFileName: doc.originalFileName,
        mimeType: doc.mimeType,
        sizeBytes: doc.sizeBytes,
        storageProvider: doc.storageProvider,
        storagePath: doc.storagePath,
        ipfsCid: doc.ipfsCid,
        sha256Hash: doc.sha256Hash,
        blockchain: doc.blockchain,
        uploadedBy: doc.uploadedBy,
      },
      storageNote: stored.statusNote,
      blockchain: blockchainResult,
    });
  } catch (err) {
    return next(err);
  }
}

module.exports = { uploadDocument };

