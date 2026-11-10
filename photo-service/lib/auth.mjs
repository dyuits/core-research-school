import {
  createHmac,
  randomBytes,
  scryptSync,
  timingSafeEqual,
} from "node:crypto";
export function checkPassword(password, hash) {
  if (typeof password !== "string" || password.length > 128 || !hash)
    return false;
  const [salt, digest] = hash.split(":");
  if (!salt || !digest) return false;
  const actual = scryptSync(password, salt, 64),
    expected = Buffer.from(digest, "hex");
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}
export function issueToken(secret, now = Date.now()) {
  const payload = Buffer.from(
    JSON.stringify({
      exp: now + 8 * 60 * 60 * 1000,
      nonce: randomBytes(16).toString("hex"),
    })
  ).toString("base64url");
  return `${payload}.${createHmac("sha256", secret).update(payload).digest("base64url")}`;
}
export function isAdmin(header, secret, now = Date.now()) {
  if (!secret || !header?.startsWith("Bearer ")) return false;
  const [payload, signature, ...extra] = header.slice(7).split(".");
  if (
    !payload ||
    !signature ||
    extra.length ||
    payload.length > 500 ||
    signature.length > 100
  )
    return false;
  const expected = createHmac("sha256", secret).update(payload).digest();
  const actual = Buffer.from(signature, "base64url");
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected))
    return false;
  try {
    const claims = JSON.parse(Buffer.from(payload, "base64url").toString());
    return (
      Number.isFinite(claims.exp) &&
      claims.exp > now &&
      claims.exp <= now + 8 * 60 * 60 * 1000
    );
  } catch {
    return false;
  }
}
