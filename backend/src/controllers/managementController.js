const { Document } = require("../models/Document");
const { submitDocumentHashToBlockchain } = require("../services/blockchainService");
const { logAction } = require("./auditController");

async function listPendingDocuments(req, res, next) {
  try {
    const filter = { status: "pending" };
    if (req.auth.role === "Verifier" && req.user?.organization) {
      filter.issuingOrganization = req.user.organization;
    }

    const items = await Document.find(filter)
      .sort({ uploadDate: -1 })
      .limit(100)
      .populate("uploadedBy", "name")
      .lean();

    return res.status(200).json({ items: items.map((doc) => ({
      id: doc._id.toString(),
      title: doc.title,
      ownerName: doc.ownerName,
      issuingOrganization: doc.issuingOrganization,
      documentType: doc.documentType,
      uploadedBy: doc.uploadedBy || null,
      uploadDate: doc.uploadDate,
      status: doc.status,
      sha256Hash: doc.sha256Hash,
    })) });
  } catch (err) {
    return next(err);
  }
}

async function approvePendingDocument(req, res, next) {
  try {
    const id = req.params.id;
    const doc = await Document.findById(id);
    if (!doc) {
      return res.status(404).json({ error: { message: "Document not found" } });
    }
    if (doc.status !== "pending") {
      return res.status(400).json({ error: { message: "Only pending documents can be approved" } });
    }

    const blockchainResult = await submitDocumentHashToBlockchain({
      documentId: doc._id.toString(),
      sha256HashHex: doc.sha256Hash,
    });

    doc.status = "verified";
    doc.blockchain = {
      transactionId: blockchainResult.transactionId,
      confirmed: blockchainResult.confirmed,
      blockNumber: blockchainResult.blockNumber,
      timestamp: blockchainResult.timestamp,
    };
    await doc.save();

    await logAction({
      userId: req.auth.userId,
      userName: req.user?.name,
      action: "Pending Document Approved",
      details: `Approved document ${doc.title} and anchored on blockchain`,
      type: "success",
      metadata: { documentId: doc._id.toString() },
    });

    return res.status(200).json({ message: "Document approved and anchored on blockchain", document: doc });
  } catch (err) {
    return next(err);
  }
}

async function rejectPendingDocument(req, res, next) {
  try {
    const id = req.params.id;
    const reason = String(req.body?.reason || "No reason provided").trim();
    const doc = await Document.findById(id);
    if (!doc) {
      return res.status(404).json({ error: { message: "Document not found" } });
    }
    if (doc.status !== "pending") {
      return res.status(400).json({ error: { message: "Only pending documents can be rejected" } });
    }

    doc.status = "rejected";
    doc.rejectionReason = reason;
    await doc.save();

    await logAction({
      userId: req.auth.userId,
      userName: req.user?.name,
      action: "Pending Document Rejected",
      details: `Rejected document ${doc.title}: ${reason}`,
      type: "warning",
      metadata: { documentId: doc._id.toString(), reason },
    });

    return res.status(200).json({ message: "Document rejected", document: doc });
  } catch (err) {
    return next(err);
  }
}

module.exports = { listPendingDocuments, approvePendingDocument, rejectPendingDocument };
