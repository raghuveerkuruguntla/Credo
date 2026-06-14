import crypto from "crypto";

// AES-256-GCM encryption for sensitive values (Plaid access tokens) at rest.
// Requires ENCRYPTION_KEY: a 32-byte key, hex (64 chars) or base64.
// Generate one with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

function getKey(): Buffer | null {
  const raw = process.env.ENCRYPTION_KEY;
  if (!raw) return null;
  // Accept hex (64 chars) or base64
  if (/^[0-9a-fA-F]{64}$/.test(raw)) return Buffer.from(raw, "hex");
  const b = Buffer.from(raw, "base64");
  if (b.length === 32) return b;
  // Fallback: derive a 32-byte key from an arbitrary string
  return crypto.createHash("sha256").update(raw).digest();
}

export function encryptionConfigured(): boolean {
  return Boolean(process.env.ENCRYPTION_KEY);
}

// Returns "enc:v1:<iv>:<authTag>:<ciphertext>" (all base64). If no key is
// configured, returns the plaintext unchanged (dev convenience).
export function encrypt(plaintext: string): string {
  const key = getKey();
  if (!key) return plaintext;
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const ct = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `enc:v1:${iv.toString("base64")}:${tag.toString("base64")}:${ct.toString("base64")}`;
}

export function decrypt(value: string): string {
  if (!value.startsWith("enc:v1:")) return value; // plaintext (legacy / no key)
  const key = getKey();
  if (!key) throw new Error("ENCRYPTION_KEY is required to decrypt stored tokens");
  const [, , ivB64, tagB64, ctB64] = value.split(":");
  const iv = Buffer.from(ivB64, "base64");
  const tag = Buffer.from(tagB64, "base64");
  const ct = Buffer.from(ctB64, "base64");
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ct), decipher.final()]).toString("utf8");
}
