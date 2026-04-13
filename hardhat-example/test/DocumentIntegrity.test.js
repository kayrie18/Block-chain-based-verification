const { expect } = require("chai");

describe("DocumentIntegrity", function () {
  let documentIntegrity;
  let owner;
  let addr1;

  beforeEach(async function () {
    [owner, addr1] = await ethers.getSigners();
    
    const DocumentIntegrity = await ethers.getContractFactory("DocumentIntegrity");
    documentIntegrity = await DocumentIntegrity.deploy();
    await documentIntegrity.waitForDeployment();
  });

  it("Should store and retrieve a document hash", async function () {
    const documentId = "doc-001";
    const hash = ethers.keccak256(ethers.toUtf8Bytes("test-content"));

    // Store hash
    await documentIntegrity.storeDocumentHash(documentId, hash);

    // Retrieve and verify
    const record = await documentIntegrity.getDocumentHash(documentId);
    expect(record.sha256Hash).to.equal(hash);
    expect(record.submitter).to.equal(owner.address);
  });

  it("Should verify a document hash", async function () {
    const documentId = "doc-002";
    const hash = ethers.keccak256(ethers.toUtf8Bytes("test-content"));

    // Store hash
    await documentIntegrity.storeDocumentHash(documentId, hash);

    // Verify
    const isValid = await documentIntegrity.verifyDocumentHash(documentId, hash);
    expect(isValid).to.be.true;
  });

  it("Should return false for invalid hash", async function () {
    const documentId = "doc-003";
    const hash = ethers.keccak256(ethers.toUtf8Bytes("test-content"));
    const wrongHash = ethers.keccak256(ethers.toUtf8Bytes("wrong-content"));

    // Store hash
    await documentIntegrity.storeDocumentHash(documentId, hash);

    // Verify with wrong hash
    const isValid = await documentIntegrity.verifyDocumentHash(documentId, wrongHash);
    expect(isValid).to.be.false;
  });

  it("Should check if document exists", async function () {
    const documentId = "doc-004";
    const hash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("test-content"));

    expect(await documentIntegrity.hasDocument(documentId)).to.be.false;

    await documentIntegrity.storeDocumentHash(documentId, hash);

    expect(await documentIntegrity.hasDocument(documentId)).to.be.true;
  });
});
