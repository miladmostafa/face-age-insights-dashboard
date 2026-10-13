import { describe, expect, it } from "vitest";
import { createSqliteStore } from "../src/lib/db/sqlite";
import { handleIngest, readWriteKey, resolveAllowOrigin } from "../src/lib/ingest";
import { hashWriteKey } from "../src/lib/keys";
import { createRateLimiter } from "../src/lib/rate-limit";
import { POSTGRES_MIGRATION } from "../src/lib/db/migrate";

const sessionId = "cd".repeat(16);

async function fixture() {
  const store = createSqliteStore(":memory:");
  const writeKey = "fa_test_key";
  await store.upsertSite({
    id: "site_test",
    name: "Test Shop",
    writeKeyHash: hashWriteKey(writeKey),
    allowedOrigins: "https://shop.example",
    createdAt: 1,
  });
  return { store, writeKey };
}

describe("ingest API", () => {
  it("stores a bucket and drops the exact age and weak concerns", async () => {
    const { store, writeKey } = await fixture();
    const result = await handleIngest({
      store,
      writeKey,
      origin: "https://shop.example",
      ip: "198.51.100.8",
      now: 1_700_000_000_000,
      limiter: createRateLimiter(10, 60_000),
      concernThreshold: 40,
      payload: {
        type: "scan_completed",
        sessionId,
        language: "en-US",
        skinAge: 37,
        skinHealth: 68,
        problems: [
          { key: "acne", score: 81 },
          { key: "pores", score: 10 },
        ],
      },
    });
    expect(result.status).toBe(202);
    expect(result.allowOrigin).toBe("https://shop.example");

    const rows = await store.listEvents("site_test", 0, 2_000_000_000_000);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.skinAgeBucket).toBe("35_44");
    expect(rows[0]?.skinHealthPct).toBe(70);
    expect(rows[0]?.language).toBe("en");
    expect(JSON.parse(rows[0]?.problemKeys ?? "[]")).toEqual(["acne"]);
    expect(JSON.stringify(rows[0])).not.toContain("37");
    expect(rows[0]?.createdAt).toBe(1_700_000_000_000);
  });

  it("rejects a bad write key, a blocked origin, and a flooded client", async () => {
    const { store, writeKey } = await fixture();
    const limiter = createRateLimiter(1, 60_000);
    const denied = await handleIngest({
      store,
      writeKey: "nope",
      origin: null,
      ip: "198.51.100.9",
      now: 10,
      limiter,
      concernThreshold: 40,
      payload: { type: "checkout", sessionId },
    });
    expect(denied.status).toBe(401);

    const blockedOrigin = await handleIngest({
      store,
      writeKey,
      origin: "https://evil.example",
      ip: "198.51.100.10",
      now: 11,
      limiter: createRateLimiter(10, 60_000),
      concernThreshold: 40,
      payload: { type: "checkout", sessionId },
    });
    expect(blockedOrigin.status).toBe(403);

    const first = await handleIngest({
      store,
      writeKey,
      origin: null,
      ip: "198.51.100.11",
      now: 12,
      limiter,
      concernThreshold: 40,
      payload: { type: "add_to_cart", sessionId },
    });
    const second = await handleIngest({
      store,
      writeKey,
      origin: null,
      ip: "198.51.100.11",
      now: 13,
      limiter,
      concernThreshold: 40,
      payload: { type: "add_to_cart", sessionId },
    });
    expect(first.status).toBe(202);
    expect(second.status).toBe(429);
  });

  it("reads the write key header and resolves CORS", () => {
    const headers = new Headers({ "X-Write-Key": "fa_abc" });
    expect(readWriteKey(headers)).toBe("fa_abc");
    expect(readWriteKey(new Headers({ Authorization: "Bearer fa_xyz" }))).toBe("fa_xyz");
    expect(resolveAllowOrigin("*", "https://anywhere.example")).toBe("*");
    expect(resolveAllowOrigin("https://shop.example, https://www.shop.example", "https://www.shop.example")).toBe(
      "https://www.shop.example",
    );
    expect(resolveAllowOrigin("https://shop.example", "https://other.example")).toBeNull();
  });
});

describe("postgres schema", () => {
  it("stores timestamps as bigint so millisecond times fit", () => {
    expect(POSTGRES_MIGRATION).toContain("created_at bigint NOT NULL");
    expect(POSTGRES_MIGRATION).toContain("CREATE TABLE IF NOT EXISTS events");
  });
});
