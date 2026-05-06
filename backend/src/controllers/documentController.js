const path = require("path");
const fs = require("fs/promises");
const { Document } = require("../models/Document");
const { generateSha256FromFile } = require("../services/hashService");
const { persistUploadedFile } = require("../services/storageService");
const { submitDocumentHashToBlockchain } = require("../services/blockchainService");
const { signHash } = require("../services/signingService");
const { logAction } = require("./auditController");

/**
 * Upload and Sign Document
 */
async function uploadDocument(req, res, next) {
  try {
    if (!req.file) {
      return res.status(400).json({ error: { message: "Document file is required" } });
    }

    const title = String(req.body?.title || "").trim();
    const ownerName = String(req.body?.ownerName || "").trim();
    const issuingOrganization = String(req.body?.issuingOrganization || "").trim();
    const documentType = String(req.body?.documentType || "").trim();
    const expiryDateRaw = req.body?.expiryDate;

    if (!title || !ownerName || !issuingOrganization || !documentType) {
      return res.status(400).json({
        error: { message: "title, ownerName, issuingOrganization, and documentType are required" },
      });
    }

    const sha256Hash = await generateSha256FromFile(req.file.path);
    
    // Check for duplicate hash
    const existingDoc = await Document.findOne({ sha256Hash });
    if (existingDoc) {
      await fs.unlink(req.file.path).catch(() => {});
      return res.status(409).json({ error: { message: "This document has already been uploaded." } });
    }

    const digitalSignature = signHash(sha256Hash);

    const stored = await persistUploadedFile(req.file);
    
    let expiryDate = null;
    if (expiryDateRaw) {
      expiryDate = new Date(expiryDateRaw);
      if (Number.isNaN(expiryDate.getTime())) {
        return res.status(400).json({ error: { message: "Invalid expiry date format" } });
      }
    }

    const doc = await Document.create({
      title,
      ownerName,
      issuingOrganization,
      documentType,
      uploadDate: new Date(),
      expiryDate,
      originalFileName: req.file.originalname,
      mimeType: req.file.mimetype || "application/octet-stream",
      sizeBytes: req.file.size,
      storageProvider: stored.storageProvider,
      storagePath: stored.storagePath,
      sha256Hash,
      digitalSignature,
      uploadedBy: req.auth.userId,
      status: "pending",
    });

    // Anchor hash on blockchain
    try {
      const blockchainResult = await submitDocumentHashToBlockchain({
        documentId: doc._id.toString(),
        sha256HashHex: sha256Hash,
      });
      await Document.findByIdAndUpdate(doc._id, {
        $set: {
          status: "verified",
          blockchain: {
            transactionId: blockchainResult.transactionId,
            confirmed: true,
            blockNumber: blockchainResult.blockNumber,
            timestamp: blockchainResult.timestamp,
          },
        },
      });
      doc.status = "verified";
      doc.blockchain = {
        transactionId: blockchainResult.transactionId,
        confirmed: true,
        blockNumber: blockchainResult.blockNumber,
        timestamp: blockchainResult.timestamp,
      };
    } catch (blockchainErr) {
      console.error("Blockchain anchoring failed:", blockchainErr);
      // Still proceed, but log error
      await logAction({
        userId: req.auth.userId,
        userName: req.user?.name,
        action: "Blockchain Anchoring Failed",
        details: `Document "${doc.title}" uploaded but blockchain anchoring failed: ${blockchainErr.message}`,
        type: "error",
        metadata: { documentId: doc._id },
      });
    }

    await logAction({
      userId: req.auth.userId,
      userName: req.user?.name,
      action: "Document Uploaded",
      details: `Document "${doc.title}" uploaded and anchored on blockchain.`,
      type: "info",
      metadata: { documentId: doc._id },
    });

    return res.status(201).json({ status: doc.status, document: doc });
  } catch (err) {
    return next(err);
  }
}

/**
 * SECURE Download with Access Control
 */
async function downloadDocument(req, res, next) {
  try {
    const docId = req.params.id;
    const doc = await Document.findById(docId);

    if (!doc) {
      return res.status(404).json({ error: { message: "Document not found" } });
    }

    // Access Control: Owner, Admin, or ANY authenticated user if document is VERIFIED
    const isOwner = String(doc.uploadedBy) === String(req.auth.userId);
    const isAdmin = req.auth.role === "Admin";
    const isVerified = doc.status === "verified";

    if (!isOwner && !isAdmin && !isVerified) {
      await logAction({
        userId: req.auth.userId,
        action: "Unauthorized Download Attempt",
        details: `User tried to download non-verified/private document ID: ${docId}`,
        type: "error",
      });
      return res.status(403).json({ error: { message: "Access denied. Private document require ownership or admin rights." } });
    }

    const absolutePath = path.resolve(doc.storagePath);
    
    // Check if file actually exists on disk
    try {
      await fs.access(absolutePath);
    } catch {
      return res.status(404).json({ error: { message: "Physical file missing on server." } });
    }

    await logAction({
      userId: req.auth.userId,
      userName: req.user?.name,
      action: "Document Downloaded",
      details: `Downloaded "${doc.title}"`,
      type: "info",
    });

    return res.download(absolutePath, doc.originalFileName);
  } catch (err) {
    return next(err);
  }
}

/**
 * Revoke Document (Advanced Feature)
 */
async function revokeDocument(req, res, next) {
  try {
    const docId = req.params.id;
    const doc = await Document.findById(docId);

    if (!doc) return res.status(404).json({ error: { message: "Document not found" } });

    // Access Control: Owner or Admin only
    if (String(doc.uploadedBy) !== String(req.auth.userId) && req.auth.role !== "Admin") {
      return res.status(403).json({ error: { message: "You are not authorized to revoke this document." } });
    }

    doc.status = "revoked";
    doc.isRevoked = true;
    await doc.save();

    await logAction({
      userId: req.auth.userId,
      userName: req.user?.name,
      action: "Document Revoked",
      details: `Document "${doc.title}" has been permanently neutralized.`,
      type: "warning",
      metadata: { documentId: docId },
    });

    return res.status(200).json({ status: "revoked", message: "Document has been revoked successfully." });
  } catch (err) {
    return next(err);
  }
}

/**
 * View Document Inline (for Read Feature)
 */
async function viewDocument(req, res, next) {
  try {
    const docId = req.params.id;
    const doc = await Document.findById(docId);
    if (!doc) return res.status(404).json({ error: { message: "Document not found" } });

    const isOwner = String(doc.uploadedBy) === String(req.auth.userId);
    const isVerified = doc.status === "verified";
    const isAdmin = req.auth.role === "Admin";

    if (!isOwner && !isVerified && !isAdmin) {
      return res.status(403).json({ error: { message: "Access denied." } });
    }

    const absolutePath = path.resolve(doc.storagePath);
    res.setHeader("Content-Type", doc.mimeType || "application/pdf");
    res.setHeader("Content-Disposition", `inline; filename="${doc.originalFileName}"`);
    return res.sendFile(absolutePath);
  } catch (err) {
    return next(err);
  }
}

/**
 * Public Download (Strictly Verified Only)
 */
async function publicDownloadDocument(req, res, next) {
  try {
    const docId = req.params.id;
    const doc = await Document.findById(docId);
    if (!doc || doc.status !== "verified") {
      return res.status(404).json({ error: { message: "Document not found or not verified." } });
    }
    const absolutePath = path.resolve(doc.storagePath);
    try {
      await fs.access(absolutePath);
    } catch {
      return res.status(404).json({ error: { message: "Physical file missing on server." } });
    }

    await logAction({
      userId: req.auth?.userId || null,
      userName: req.user?.name || "Public User",
      action: "Public Document Download",
      details: `Publicly downloaded verified document ID: ${docId}`,
      type: "info",
    });

    return res.download(absolutePath, doc.originalFileName);
  } catch (err) {
    return next(err);
  }
}

/**
 * Public View Inline (Strictly Verified Only)
 */
async function publicViewDocument(req, res, next) {
  try {
    const docId = req.params.id;
    const doc = await Document.findById(docId);
    if (!doc || doc.status !== "verified") {
      return res.status(404).json({ error: { message: "Document not found or not verified." } });
    }
    const absolutePath = path.resolve(doc.storagePath);
    res.setHeader("Content-Type", doc.mimeType || "application/pdf");
    res.setHeader("Content-Disposition", `inline; filename="${doc.originalFileName}"`);

    await logAction({
      userId: req.auth?.userId || null,
      userName: req.user?.name || "Public User",
      action: "Public Document View",
      details: `Publicly viewed verified document ID: ${docId}`,
      type: "info",
    });

    return res.sendFile(absolutePath);
  } catch (err) {
    return next(err);
  }
}

module.exports = { 
  uploadDocument, 
  downloadDocument, 
  revokeDocument, 
  viewDocument,
  publicDownloadDocument,
  publicViewDocument
};
