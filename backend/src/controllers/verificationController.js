const fs = require("fs/promises");
const { generateSha256FromFile } = require("../services/hashService");
const { getDocumentHashFromChain } = require("../services/blockchainService");
const { compareHashesSecure, isSha256Hex, normalizeSha256 } = require("../services/verificationService");
const { logAction } = require("./auditController");

async function verifyUploadedDocument(req, res, next) {
  let uploadedPath = null;
  try {
    const documentId = String(req.params?.documentId || "").trim();
    if (!documentId) {
      return res.status(400).json({ error: { message: "documentId is required" } });
    }

    if (!req.file?.path) {
      return res.status(400).json({ error: { message: "Verification file is required" } });
    }
    uploadedPath = req.file.path;

    const uploadedHash = await generateSha256FromFile(uploadedPath);
    let onChain;
    try {
      onChain = await getDocumentHashFromChain({ documentId, fallbackSha256Hash: uploadedHash });
    } catch (err) {
      return res.status(200).json({
        status: "unverifiable",
        verdict: "Verification Unavailable",
        isAuthentic: false,
        documentId,
        uploadedHash,
        message: err?.message || "Document not found in blockchain ledger",
      });
    }
    const originalHash = normalizeSha256(String(onChain.sha256HashHex).replace(/^0x/i, ""));

    if (!isSha256Hex(originalHash)) {
      return res.status(404).json({
        status: "unverifiable",
        documentId,
        message: "Invalid document hash or document number",
      });
    }

    const matches = compareHashesSecure(uploadedHash, originalHash);
    const verdict = matches ? "Verification successful" : "Document Tampered";

    await logAction({
      userId: req.auth?.userId || null,
      action: "Document Verification",
      details: `Verification completed for document ID: ${documentId}. Result: ${verdict}`,
      type: matches ? "success" : "warning",
      metadata: { documentId, matches, uploadedHash },
    });

    return res.status(200).json({
      status: "verified",
      verdict,
      isAuthentic: matches,
      documentId,
      uploadedHash,
      blockchainHash: originalHash,
      blockchainTimestamp: onChain.timestamp,
    });
  } catch (err) {
    return next(err);
  } finally {
    if (uploadedPath) {
      await fs.unlink(uploadedPath).catch(() => {
        // Ignore temp cleanup errors.
      });
    }
  }
}

module.exports = { verifyUploadedDocument };

