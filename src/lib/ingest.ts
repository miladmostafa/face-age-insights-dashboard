import { randomUUID } from "node:crypto";
import { anonymizeScan } from "./anonymize";
import type { Store } from "./db/types";
import { hashWriteKey } from "./keys";
import type { RateLimiter } from "./rate-limit";
import { parseIngestBody } from "./validate";

export type IngestResult = {
  status: number;
  body: Record<string, unknown>;
  allowOrigin: string | null;
};

export function resolveAllowOrigin(allowedOrigins: string, requestOrigin: string | null): string | null {
  const allowed = allowedOrigins
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  if (allowed.includes("*")) return "*";
  if (requestOrigin && allowed.includes(requestOrigin)) return requestOrigin;
  return null;
}

export async function handleIngest(options: {
  store: Store;
  payload: unknown;
  writeKey: string | null;
  origin: string | null;
  ip: string;
  now: number;
  limiter: RateLimiter;
  concernThreshold: number;
}): Promise<IngestResult> {
  const { store, payload, writeKey, origin, ip, now, limiter, concernThreshold } = options;

  if (!limiter(`ip:${ip}`, now)) {
    return { status: 429, body: { error: "Too many requests." }, allowOrigin: null };
  }

  if (!writeKey) {
    return { status: 401, body: { error: "Write key required." }, allowOrigin: null };
  }

  const keyHash = hashWriteKey(writeKey);
  if (!limiter(`key:${keyHash}`, now)) {
    return { status: 429, body: { error: "Too many requests." }, allowOrigin: null };
  }

  const site = await store.findSiteByWriteKeyHash(keyHash);
  if (!site) {
    return { status: 401, body: { error: "Write key was not recognized." }, allowOrigin: null };
  }

  const allowOrigin = resolveAllowOrigin(site.allowedOrigins, origin);
  if (origin && !allowOrigin) {
    return { status: 403, body: { error: "Origin is not allowed for this site." }, allowOrigin: null };
  }
  const parsed = parseIngestBody(payload);
  if (!parsed.ok) {
    return { status: 400, body: { error: parsed.error }, allowOrigin };
  }

  const event = parsed.event;
  if (event.type === "scan_completed") {
    const anonymized = anonymizeScan({
      language: event.language,
      skinAge: event.skinAge,
      skinAgeBucket: event.skinAgeBucket,
      skinHealth: event.skinHealth,
      problems: event.problems,
      concernThreshold,
    });
    await store.insertEvent({
      id: randomUUID(),
      siteId: site.id,
      type: "scan_completed",
      sessionId: event.sessionId,
      language: anonymized.language,
      skinAgeBucket: anonymized.skinAgeBucket,
      skinHealthPct: anonymized.skinHealthPct,
      problemKeys: JSON.stringify(anonymized.problemKeys),
      createdAt: now,
    });
  } else {
    await store.insertEvent({
      id: randomUUID(),
      siteId: site.id,
      type: event.type,
      sessionId: event.sessionId,
      language: null,
      skinAgeBucket: null,
      skinHealthPct: null,
      problemKeys: null,
      createdAt: now,
    });
  }

  return { status: 202, body: { ok: true }, allowOrigin };
}

export function readWriteKey(headers: Headers): string | null {
  const direct = headers.get("x-write-key")?.trim();
  if (direct) return direct;
  const authorization = headers.get("authorization")?.trim() ?? "";
  const match = authorization.match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() || null;
}

export function clientIp(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() || "unknown";
  return headers.get("x-real-ip")?.trim() || "unknown";
}
