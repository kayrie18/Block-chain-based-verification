const { ethers } = require("ethers");
const abi = require("../contracts/DocumentIntegrity.abi.json");

function isConfigured() {
  return isWriteConfigured();
}

function isReadConfigured() {
  return Boolean(
    process.env.ETH_RPC_URL &&
      process.env.DOC_INTEGRITY_CONTRACT_ADDRESS &&
      process.env.DOC_INTEGRITY_CONTRACT_ADDRESS !== "0x0000000000000000000000000000000000000000"
  );
}

function isWriteConfigured() {
  return Boolean(
    process.env.ETH_RPC_URL &&
      process.env.ETH_PRIVATE_KEY &&
      process.env.DOC_INTEGRITY_CONTRACT_ADDRESS &&
      process.env.DOC_INTEGRITY_CONTRACT_ADDRESS !== "0x0000000000000000000000000000000000000000"
  );
}

function getProvider() {
  return new ethers.JsonRpcProvider(
    process.env.ETH_RPC_URL,
    process.env.ETH_CHAIN_ID ? Number(process.env.ETH_CHAIN_ID) : undefined
  );
}

function getSigner(provider) {
  return new ethers.Wallet(process.env.ETH_PRIVATE_KEY, provider);
}

function getContract(signerOrProvider) {
  return new ethers.Contract(process.env.DOC_INTEGRITY_CONTRACT_ADDRESS, abi, signerOrProvider);
}

function serializeEthersError(err) {
  return {
    message: err?.shortMessage || err?.message || "Blockchain error",
    code: err?.code,
    reason: err?.reason,
    action: err?.action,
    data: err?.data,
  };
}

function normalizeHashInput(hash) {
  const hex = String(hash || "").trim();
  if (!hex) return "";
  if (hex.startsWith("0x")) return hex.toLowerCase();
  return `0x${hex.toLowerCase()}`;
}

async function submitDocumentHashToBlockchain(payload) {
  const documentId = String(payload.documentId);
  const sha256HashHex = normalizeHashInput(payload.sha256HashHex || payload.sha256Hash);

  if (!isWriteConfigured()) {
    const simulatedTimestamp = Math.floor(Date.now() / 1000);
    return {
      accepted: true,
      provider: "simulation",
      transactionId: `SIMULATED-${documentId}-${simulatedTimestamp}`,
      confirmed: true,
      blockNumber: simulatedTimestamp,
      timestamp: simulatedTimestamp,
      note: "Blockchain simulation used because Ethereum settings are not configured.",
    };
  }

  try {
    const provider = getProvider();
    const signer = getSigner(provider);
    const contract = getContract(signer);

    const tx = await contract.storeDocumentHash(documentId, sha256HashHex);
    const receipt = await tx.wait();

    return {
      accepted: true,
      provider: "ethers",
      transactionId: tx.hash,
      confirmed: Boolean(receipt?.status === 1),
      blockNumber: receipt?.blockNumber ?? null,
      timestamp: Math.floor(Date.now() / 1000),
      note: receipt?.status === 1 ? "Stored on-chain." : "Transaction mined but reverted.",
    };
  } catch (err) {
    return {
      accepted: false,
      provider: "ethers",
      transactionId: null,
      confirmed: false,
      error: serializeEthersError(err),
    };
  }
}

async function storeDocumentHashOnChain({ documentId, sha256HashHex, timestamp }) {
  if (!isWriteConfigured()) {
    const simulatedTimestamp = typeof timestamp === "number" ? timestamp : Math.floor(Date.now() / 1000);
    return {
      transactionId: `SIMULATED-${String(documentId)}-${simulatedTimestamp}`,
      confirmed: true,
      blockNumber: simulatedTimestamp,
      timestamp: simulatedTimestamp,
    };
  }

  try {
    const provider = getProvider();
    const signer = getSigner(provider);
    const contract = getContract(signer);

    const normalizedHash = normalizeHashInput(sha256HashHex);
    const tx = await contract.storeDocumentHash(String(documentId), normalizedHash);
    const receipt = await tx.wait();

    if (receipt?.status !== 1) {
      const e = new Error("Blockchain transaction reverted");
      e.statusCode = 502;
      e.transactionId = tx.hash;
      throw e;
    }

    return {
      transactionId: tx.hash,
      confirmed: true,
      blockNumber: receipt.blockNumber,
      timestamp: typeof timestamp === "number" ? timestamp : Math.floor(Date.now() / 1000),
    };
  } catch (err) {
    const e = new Error(err?.shortMessage || err?.message || "Failed to store hash on-chain");
    e.statusCode = err?.statusCode || 502;
    e.details = serializeEthersError(err);
    if (err?.transactionId) e.transactionId = err.transactionId;
    throw e;
  }
}

async function getDocumentHashFromChain({ documentId, fallbackSha256Hash }) {
  if (!isReadConfigured()) {
    if (!fallbackSha256Hash) {
      const err = new Error("Blockchain read is not configured and no fallback hash was provided");
      err.statusCode = 500;
      throw err;
    }
    return {
      documentId: String(documentId),
      sha256HashHex: normalizeHashInput(fallbackSha256Hash),
      timestamp: Math.floor(Date.now() / 1000),
      simulated: true,
    };
  }

  try {
    const provider = getProvider();
    const contract = getContract(provider);

    const result = await contract.getDocumentHash(String(documentId));
    const sha256HashHex = result?.sha256Hash ? ethers.hexlify(result.sha256Hash).slice(2).toLowerCase() : "";
    const timestamp = result?.timestamp != null ? Number(result.timestamp) : null;

    return {
      documentId: String(documentId),
      sha256HashHex,
      timestamp,
    };
  } catch (err) {
    const e = new Error(err?.shortMessage || err?.message || "Failed to retrieve hash from blockchain");
    e.statusCode = 502;
    e.details = serializeEthersError(err);
    throw e;
  }
}

module.exports = {
  submitDocumentHashToBlockchain,
  storeDocumentHashOnChain,
  getDocumentHashFromChain,
  isConfigured,
  isReadConfigured,
  isWriteConfigured,
};

