import { describe, expect, it } from "vitest";
import { findBlockedKey, parseIngestBody } from "../src/lib/validate";

const sessionId = "ab".repeat(16);

describe("ingest validation", () => {
  it("accepts an anonymized scan", () => {
    const parsed = parseIngestBody({
      type: "scan_completed",
      sessionId,
      language: "en",
      skinAgeBucket: "35_44",
      skinHealth: 70,
      problems: [{ key: "acne", score: 72 }],
    });
    expect(parsed.ok).toBe(true);
  });

  it("accepts funnel events and rejects extra fields", () => {
    expect(parseIngestBody({ type: "add_to_cart", sessionId }).ok).toBe(true);
    const extra = parseIngestBody({
      type: "onCheckout" in {} ? "checkout" : "checkout",
      sessionId,
      productId: "serum-1",
    });
    expect(extra.ok).toBe(false);
  });

  it("rejects unknown problem keys, emails, and image payloads", () => {
    expect(
      parseIngestBody({
        type: "scan_completed",
        sessionId,
        problems: [{ key: "wrinkles", score: 10 }],
      }).ok,
    ).toBe(false);

    expect(findBlockedKey({ email: "a@b.co" })).toBe("email");
    expect(
      parseIngestBody({
        type: "scan_completed",
        sessionId,
        problems: [],
        note: "a@b.co",
      }).ok,
    ).toBe(false);
    expect(parseIngestBody({ image: "data:image/jpeg;base64,aaaa" }).ok).toBe(false);
    expect(parseIngestBody({ type: "scan_completed", sessionId, problems: [], photo: "x" }).ok).toBe(
      false,
    );
  });

  it("rejects a session id that could carry an email", () => {
    expect(
      parseIngestBody({
        type: "product_view",
        sessionId: "user@example.com",
      }).ok,
    ).toBe(false);
  });
});
