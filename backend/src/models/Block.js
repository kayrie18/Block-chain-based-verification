const mongoose = require("mongoose");
const crypto = require("crypto");

const blockSchema = new mongoose.Schema({
  index: { type: Number, required: true },
  timestamp: { type: Number, required: true },
  data: {
    documentId: { type: String, required: true },
    sha256HashHex: { type: String, required: true },
  },
  previousHash: { type: String, required: true },
  hash: { type: String, required: true, index: true },
});

blockSchema.statics.calculateHash = function (index, previousHash, timestamp, data) {
  return crypto
    .createHash("sha256")
    .update(index + previousHash + timestamp + JSON.stringify(data))
    .digest("hex");
};

blockSchema.statics.getLatestBlock = async function () {
  return this.findOne().sort({ index: -1 }).exec();
};

blockSchema.statics.addBlock = async function (data, timestamp = Math.floor(Date.now() / 1000)) {
  let previousBlock = await this.getLatestBlock();

  // Lazy initialize Genesis Block if no blocks exist
  if (!previousBlock) {
    const genesisData = { documentId: "GENESIS", sha256HashHex: "0".repeat(64) };
    const genesisHash = this.calculateHash(0, "0", 0, genesisData);
    previousBlock = await this.create({
      index: 0,
      timestamp: 0,
      data: genesisData,
      previousHash: "0",
      hash: genesisHash,
    });
  }

  const nextIndex = previousBlock.index + 1;
  const hash = this.calculateHash(nextIndex, previousBlock.hash, timestamp, data);

  const newBlock = await this.create({
    index: nextIndex,
    timestamp,
    data,
    previousHash: previousBlock.hash,
    hash,
  });

  return newBlock;
};

const Block = mongoose.model("Block", blockSchema);

module.exports = { Block };
