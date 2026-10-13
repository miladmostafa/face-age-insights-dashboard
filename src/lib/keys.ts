import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

export function hashWriteKey(key: string): string {
  return createHash("sha256").update(key).digest("hex");
}

export function generateWriteKey(): string {
  return `fa_${randomBytes(24).toString("hex")}`;
}

export function writeKeysMatch(storedHash: string, provided: string): boolean {
  const actual = Buffer.from(hashWriteKey(provided), "hex");
  const expected = Buffer.from(storedHash, "hex");
  if (actual.length === 0 || actual.length !== expected.length) return false;
  return timingSafeEqual(actual, expected);
}
