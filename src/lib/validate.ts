import { z } from "zod";
import { AGE_BUCKETS } from "./anonymize";
import { PROBLEM_KEYS } from "./problems";

const sessionId = z
  .string()
  .regex(/^[a-f0-9]{32}$/, "sessionId must be 32 lowercase hex characters");

const problem = z
  .object({
    key: z.enum(PROBLEM_KEYS),
    score: z.number().min(0).max(100).optional(),
  })
  .strict();

const scanEvent = z
  .object({
    type: z.literal("scan_completed"),
    sessionId,
    language: z.string().min(2).max(12).optional(),
    skinAge: z.number().int().min(0).max(120).optional(),
    skinAgeBucket: z.enum(AGE_BUCKETS).optional(),
    skinHealth: z.number().min(0).max(100).optional(),
    problems: z.array(problem).max(13),
  })
  .strict();

function funnelEvent(type: "product_view" | "product_click" | "add_to_cart" | "checkout") {
  return z
    .object({
      type: z.literal(type),
      sessionId,
    })
    .strict();
}

export const ingestEventSchema = z.discriminatedUnion("type", [
  scanEvent,
  funnelEvent("product_view"),
  funnelEvent("product_click"),
  funnelEvent("add_to_cart"),
  funnelEvent("checkout"),
]);

export type IngestEventInput = z.infer<typeof ingestEventSchema>;

const BLOCKED_KEY = /email|e-mail|phone|name|image|photo|picture|token|address|gender|birthday/i;

export function findBlockedKey(value: unknown, depth = 0): string | null {
  if (depth > 6 || value == null) return null;
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findBlockedKey(item, depth + 1);
      if (found) return found;
    }
    return null;
  }
  if (typeof value === "object") {
    for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
      if (BLOCKED_KEY.test(key)) return key;
      const found = findBlockedKey(child, depth + 1);
      if (found) return found;
    }
  }
  if (typeof value === "string") {
    if (/data:/i.test(value) || value.length > 200) return "oversized-string";
    if (/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i.test(value)) return "email";
  }
  return null;
}

export type ParseResult =
  | { ok: true; event: IngestEventInput }
  | { ok: false; error: string };

export function parseIngestBody(body: unknown): ParseResult {
  const blocked = findBlockedKey(body);
  if (blocked) {
    return { ok: false, error: "Payload contains data this dashboard does not collect." };
  }
  const parsed = ingestEventSchema.safeParse(body);
  if (!parsed.success) {
    return { ok: false, error: "Event payload is not valid." };
  }
  return { ok: true, event: parsed.data };
}
