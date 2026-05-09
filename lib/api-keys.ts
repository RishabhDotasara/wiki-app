import crypto from "crypto";

const API_KEY_SALT = process.env.NEXTAUTH_SECRET || "flightdeck-default-salt";

/**
 * Generates a deterministic, fixed API key for a given user email.
 * The key is a HMAC-SHA256 hash of the email salted with the app secret,
 * prefixed with "fd_" for easy identification.
 */
export function generateApiKey(email: string): string {
  const hmac = crypto.createHmac("sha256", API_KEY_SALT);
  hmac.update(email.toLowerCase().trim());
  const hash = hmac.digest("hex");
  // Return a readable prefix + first 40 chars of the hash
  return `fd_${hash.slice(0, 40)}`;
}

/**
 * Validates an API key by checking it against all known editor emails.
 * Returns the email if valid, null otherwise.
 *
 * Since keys are deterministic from email, we can reverse-lookup by
 * checking against the provided email header or by brute-forcing
 * known users. For simplicity, the webhook requires both the key
 * AND the author email — we just verify they match.
 */
export function validateApiKey(apiKey: string, email: string): boolean {
  const expected = generateApiKey(email);
  // Use timing-safe comparison to prevent timing attacks
  if (apiKey.length !== expected.length) return false;
  return crypto.timingSafeEqual(Buffer.from(apiKey), Buffer.from(expected));
}
