const mongoose = require("mongoose");
const { Document } = require("../models/Document");
const { getDocumentHashFromChain } = require("../services/blockchainService");
const { compareHashesSecure, normalizeSha256, isSha256Hex } = require("../services/verificationService");
const { buildVerificationUrl, parseScanData, generateQrCodeDataUrl } = require("../services/qrService");
const { logAction } = require("./auditController");

async function getDocumentQr(req, res, next) {
  try {
    const documentId = String(req.params.documentId || "").trim();
    if (!documentId) {
      return res.status(400).json({ error: { message: "documentId is required" } });
    }

    if (!mongoose.Types.ObjectId.isValid(documentId)) {
      return res.status(404).json({ error: { message: "Document not found (Invalid ID format)" } });
    }

    const doc = await Document.findById(documentId)
      .select("title ownerName issuingOrganization documentType uploadDate sha256Hash blockchain")
      .lean()
      .exec();
    if (!doc) return res.status(404).json({ error: { message: "Document not found" } });

    const verificationUrl = buildVerificationUrl(documentId);
    const qrCodeDataUrl = await generateQrCodeDataUrl(verificationUrl);

    return res.status(200).json({
      documentId,
      verificationUrl,
      qrCodeDataUrl,
      metadata: {
        title: doc.title,
        ownerName: doc.ownerName,
        issuingOrganization: doc.issuingOrganization,
        documentType: doc.documentType,
        uploadDate: doc.uploadDate,
        sha256Hash: doc.sha256Hash,
        blockchain: doc.blockchain || null,
      },
    });
  } catch (err) {
    return next(err);
  }
}

async function verifyFromQrScan(req, res, next) {
  try {
    const queryDocumentId = String(req.query?.documentId || "").trim();
    const bodyScanData = String(req.body?.scanData || "").trim();
    const bodyDocumentId = String(req.body?.documentId || "").trim();

    const parsed = parseScanData(bodyScanData);
    const documentId = queryDocumentId || bodyDocumentId || parsed.documentId;

    if (!documentId) {
      return res.status(400).json({
        error: { message: "Provide documentId or scanData (URL/raw ID) to verify" },
      });
    }

    if (!mongoose.Types.ObjectId.isValid(documentId)) {
      return res.status(404).json({ error: { message: "Document not found (Invalid ID format)" } });
    }

    const doc = await Document.findById(documentId)
      .select("title ownerName issuingOrganization documentType uploadDate sha256Hash blockchain")
      .lean()
      .exec();
    if (!doc) return res.status(404).json({ error: { message: "Document not found" } });

    const dbHash = normalizeSha256(doc.sha256Hash);
    let chainHash = "";
    let chainTimestamp = null;
    let chainError = null;

    try {
      const chain = await getDocumentHashFromChain({ documentId, fallbackSha256Hash: doc.sha256Hash });
      chainHash = normalizeSha256(chain.sha256HashHex);
      chainTimestamp = chain.timestamp;
    } catch (err) {
      chainError = err?.message || "Blockchain lookup failed";
    }

    const hashesComparable = isSha256Hex(dbHash) && isSha256Hex(chainHash);
    const isAuthentic = hashesComparable ? compareHashesSecure(dbHash, chainHash) : false;
    const verdict = chainError
      ? "Verification Unavailable"
      : isAuthentic
        ? "Authentic Document"
        : "Document Tampered";

    await logAction({
      userId: req.auth?.userId || null,
      action: "QR Verification",
      details: `Document verified via QR scan. ID: ${documentId}. Result: ${verdict}`,
      type: isAuthentic ? "success" : "warning",
      metadata: { documentId, isAuthentic, chainError },
    });

    return res.status(200).json({
      status: chainError ? "verified_with_warnings" : "verified",
      verdict,
      isAuthentic,
      documentId,
      metadata: {
        title: doc.title,
        ownerName: doc.ownerName,
        issuingOrganization: doc.issuingOrganization,
        documentType: doc.documentType,
        uploadDate: doc.uploadDate,
      },
      hashes: {
        databaseHash: dbHash,
        blockchainHash: chainHash || null,
        blockchainTimestamp: chainTimestamp,
      },
      blockchain: {
        transactionId: doc.blockchain?.transactionId || null,
        confirmed: Boolean(doc.blockchain?.confirmed),
        blockNumber: doc.blockchain?.blockNumber ?? null,
        lookupError: chainError,
      },
    });
  } catch (err) {
    return next(err);
  }
}

module.exports = { getDocumentQr, verifyFromQrScan };

