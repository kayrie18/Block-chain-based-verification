const { storeDocumentHashOnChain, getDocumentHashFromChain } = require("../services/blockchainService");
const { Document } = require("../models/Document");
const { Block } = require("../models/Block");

async function storeHash(req, res, next) {
  try {
    const documentId = String(req.body?.documentId || "").trim();
    const sha256HashHex = String(req.body?.sha256HashHex || "").trim().toLowerCase();
    const timestampRaw = req.body?.timestamp;

    if (!documentId) {
      return res.status(400).json({ error: { message: "documentId is required" } });
    }
    if (!/^[a-f0-9]{64}$/.test(sha256HashHex)) {
      return res.status(400).json({ error: { message: "sha256HashHex must be a 64-char hex SHA-256 value" } });
    }

    const timestamp =
      timestampRaw == null ? undefined : typeof timestampRaw === "number" ? timestampRaw : Number(timestampRaw);
    if (timestamp !== undefined && Number.isNaN(timestamp)) {
      return res.status(400).json({ error: { message: "timestamp must be a number (unix seconds)" } });
    }

    const result = await storeDocumentHashOnChain({
      documentId,
      sha256HashHex,
      timestamp,
    });

    // Keep metadata record in sync with blockchain transaction reference.
    await Document.findByIdAndUpdate(documentId, {
      $set: {
        blockchain: {
          transactionId: result.transactionId,
          confirmed: true,
          blockNumber: result.blockNumber ?? null,
          timestamp: result.timestamp ?? null,
        },
      },
    }).exec();

    return res.status(200).json({
      status: "submitted",
      documentId,
      sha256HashHex,
      transactionId: result.transactionId,
      confirmed: result.confirmed,
      blockNumber: result.blockNumber,
      timestamp: result.timestamp,
    });
  } catch (err) {
    return next(err);
  }
}

async function getHash(req, res, next) {
  try {
    const documentId = String(req.params.documentId || "").trim();
    if (!documentId) return res.status(400).json({ error: { message: "documentId is required" } });

    const doc = await Document.findById(documentId).select("sha256Hash blockchain").lean();
    if (!doc) return res.status(404).json({ error: { message: "Document not found" } });

    const result = await getDocumentHashFromChain({ documentId, fallbackSha256Hash: doc.sha256Hash });
    return res.status(200).json(result);
  } catch (err) {
    return next(err);
  }
}

async function getBlockchainRecords(req, res, next) {
  try {
    const parsedLimit = Number(req.query?.limit);
    const limit = Number.isFinite(parsedLimit) && parsedLimit > 0 ? Math.min(parsedLimit, 100) : 20;

    const blocks = await Block.find({ "data.documentId": { $ne: "GENESIS" } })
      .sort({ index: -1 })
      .limit(limit)
      .lean()
      .exec();

    const docIds = blocks.map((b) => b.data.documentId);
    const docs = await Document.find({ _id: { $in: docIds } })
      .select("title ownerName")
      .lean()
      .exec();

    const docMap = {};
    for (const d of docs) {
      docMap[String(d._id)] = d;
    }

    return res.status(200).json({
      records: blocks.map((b) => {
        const d = docMap[b.data.documentId];
        return {
          id: String(b._id),
          title: d?.title || `Block #${b.index}`,
          ownerName: d?.ownerName || "Blockchain Network",
          sha256Hash: b.data.sha256HashHex,
          transactionId: b.hash,
          blockNumber: b.index,
          timestamp: b.timestamp,
          confirmed: true,
        };
      }),
    });
  } catch (err) {
    return next(err);
  }
}

module.exports = { storeHash, getHash, getBlockchainRecords };

