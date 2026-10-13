import fs from "node:fs";
import path from "node:path";
import { DEFAULT_CONCERN_THRESHOLD, DEFAULT_K_ANONYMITY } from "./anonymize";

/** Load `.env` for scripts. Next.js already loads it for the app. */
export function loadEnvFile(file = path.join(process.cwd(), ".env")) {
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const separator = trimmed.indexOf("=");
    if (separator === -1) continue;
    const key = trimmed.slice(0, separator).trim();
    const value = trimmed.slice(separator + 1).trim();
    if (key && process.env[key] === undefined) process.env[key] = value;
  }
}

export function readPositiveInt(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) return fallback;
  return parsed;
}

export function kAnonymity(): number {
  return readPositiveInt(process.env.K_ANONYMITY, DEFAULT_K_ANONYMITY);
}

export function concernThreshold(): number {
  const parsed = Number(process.env.CONCERN_THRESHOLD);
  if (!Number.isFinite(parsed)) return DEFAULT_CONCERN_THRESHOLD;
  return Math.min(100, Math.max(0, parsed));
}

export function resolveClientId(env: NodeJS.ProcessEnv = process.env): string {
  const value = env.FACEAGE_CLIENT_ID?.trim() ?? "";
  if (!value || value === "YOUR_CLIENT_ID") return "";
  return value;
}

export function demoWriteKeyPath(): string {
  return path.join(process.cwd(), "data", "demo-write-key.txt");
}

export function resolveDemoWriteKey(env: NodeJS.ProcessEnv = process.env): string {
  const fromEnv = env.DEMO_WRITE_KEY?.trim();
  if (fromEnv) return fromEnv;
  const file = demoWriteKeyPath();
  if (fs.existsSync(file)) return fs.readFileSync(file, "utf8").trim();
  return "";
}

export function rangeFromPreset(preset: string | undefined, now: number): {
  from: number;
  to: number;
  preset: "7" | "30" | "90" | "all";
  label: string;
} {
  const day = 24 * 60 * 60 * 1000;
  if (preset === "7") return { from: now - 7 * day, to: now + day, preset: "7", label: "Last 7 days" };
  if (preset === "90") return { from: now - 90 * day, to: now + day, preset: "90", label: "Last 90 days" };
  if (preset === "all") return { from: 0, to: now + day, preset: "all", label: "All time" };
  return { from: now - 30 * day, to: now + day, preset: "30", label: "Last 30 days" };
}
