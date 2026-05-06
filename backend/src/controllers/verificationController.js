const { Document } = require("../models/Document");
const { generateSha256FromFile } = require("../services/hashService");
const { getDocumentHashFromChain } = require("../services/blockchainService");
const { compareHashesSecure, normalizeSha256 } = require("../services/verificationService");

function computeStatus(doc, hashMatches) {
  if (!doc) return "Not Found";
  if (!hashMatches) return "Tampered";
  if (doc.isRevoked || doc.status === "revoked") return "Tampered";
  if (doc.expiryDate && new Date(doc.expiryDate).getTime() < Date.now()) return "Expired";
  return "Valid";
}

async function verifyByDocumentId(req, res, next) {
  try {
    const documentId = String(req.params.documentId || "").trim();
    const doc = await Document.findById(documentId).lean();
    if (!doc) return res.status(404).json({ status: "Not Found", isAuthentic: false });

    const onChain = await getDocumentHashFromChain({ documentId, fallbackSha256Hash: doc.sha256Hash });
    const chainHash = normalizeSha256(onChain.sha256HashHex);
    const hashMatches = compareHashesSecure(doc.sha256Hash, chainHash);
    const status = computeStatus(doc, hashMatches);
    return res.status(200).json({ status, isAuthentic: status === "Valid", documentId, hash: doc.sha256Hash });
  } catch (err) {
    return next(err);
  }
}

async function verifyByFile(req, res, next) {
  try {
    if (!req.file) return res.status(400).json({ error: { message: "Document file is required" } });
    const uploadedHash = await generateSha256FromFile(req.file.path);
    const doc = await Document.findOne({ sha256Hash: uploadedHash }).lean();
    if (!doc) return res.status(404).json({ status: "Not Found", isAuthentic: false, hash: uploadedHash });

    const onChain = await getDocumentHashFromChain({
      documentId: String(doc._id),
      fallbackSha256Hash: doc.sha256Hash,
    });
    const chainHash = normalizeSha256(onChain.sha256HashHex);
    const hashMatches = compareHashesSecure(uploadedHash, chainHash);
    const status = computeStatus(doc, hashMatches);
    return res.status(200).json({
      status,
      isAuthentic: status === "Valid",
      hash: uploadedHash,
      documentId: String(doc._id),
      title: doc.title,
    });
  } catch (err) {
    return next(err);
  }
}

module.exports = { verifyByDocumentId, verifyByFile };
