const crypto = require("crypto");

/**
 * Generate a digital signature of the document hash using the server's private key.
 * This proves that the document was verified and issued by THIS system.
 */
function signHash(hash) {
  // In a real production system, this would use a HSM or a secure private key from vault.
  // For this 'Elite' rebuild, we'll use a local key derived from a secret.
  const privateKey = process.env.SIGNING_PRIVATE_KEY || "default_elite_secret_key_32_chars_!!";
  
  // We'll use HMAC-SHA512 as a robust 'Digital Signature' for this context, 
  // or actual RSA/Ed25519 if preferred. Let's use HMAC for simplicity but high entropy.
  return crypto
    .createHmac("sha512", privateKey)
    .update(hash)
    .digest("hex");
}

/**
 * Verify if a signature matches a hash.
 */
function verifySignature(hash, signature) {
  const expected = signHash(hash);
  return crypto.timingSafeEqual(
    Buffer.from(signature, "hex"),
    Buffer.from(expected, "hex")
  );
}

module.exports = { signHash, verifySignature };
