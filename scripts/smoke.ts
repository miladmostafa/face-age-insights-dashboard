import os from "node:os";
import path from "node:path";
import { aggregateEvents, formatPercent, toAnalyticsEvent } from "../src/lib/aggregate";
import { toCsv } from "../src/lib/csv";
import { createSqliteStore } from "../src/lib/db/sqlite";
import { handleIngest } from "../src/lib/ingest";
import { generateWriteKey } from "../src/lib/keys";
import { createRateLimiter } from "../src/lib/rate-limit";
import { buildSeedEvents, DEMO_SITE_ID, DEMO_SITE_NAME } from "../src/lib/seed-data";
import { hashWriteKey } from "../src/lib/keys";

async function main() {
  const databaseUrl = `file:${path.join(os.tmpdir(), `insights-smoke-${Date.now()}.db`)}`;
  const store = createSqliteStore(databaseUrl);
  const writeKey = generateWriteKey();
  await store.upsertSite({
    id: DEMO_SITE_ID,
    name: DEMO_SITE_NAME,
    writeKeyHash: hashWriteKey(writeKey),
    allowedOrigins: "*",
    createdAt: Date.now(),
  });
  for (const event of buildSeedEvents(Date.UTC(2026, 9, 13))) {
    await store.insertEvent(event);
  }

  const sessionId = "ab".repeat(16);
  const accepted = await handleIngest({
    store,
    writeKey,
    origin: "https://shop.example",
    ip: "203.0.113.10",
    now: Date.UTC(2026, 9, 13),
    limiter: createRateLimiter(100, 60_000),
    concernThreshold: 40,
    payload: {
      type: "scan_completed",
      sessionId,
      language: "en",
      skinAge: 37,
      skinHealth: 68,
      problems: [
        { key: "acne", score: 80 },
        { key: "pores", score: 20 },
      ],
    },
  });
  if (accepted.status !== 202) {
    throw new Error(`Expected sample scan to be accepted, got ${accepted.status}`);
  }

  const rows = await store.listEvents(DEMO_SITE_ID, 0, Date.UTC(2026, 9, 14));
  const stored = rows.find((row) => row.sessionId === sessionId);
  if (!stored || stored.skinAgeBucket !== "35_44" || stored.problemKeys?.includes("pores")) {
    throw new Error("Ingest did not bucket age or drop the low-score problem.");
  }
  if (JSON.stringify(stored).includes("37")) {
    throw new Error("Exact skin age was stored.");
  }

  const aggregate = aggregateEvents(
    rows.filter((row) => row.id.startsWith("seed-")).map(toAnalyticsEvent),
    5,
  );
  if (aggregate.topProblem?.key !== "acne") {
    throw new Error(`Expected acne to lead, saw ${aggregate.topProblem?.key}`);
  }
  if (formatPercent(aggregate.cartRate) !== "18%") {
    throw new Error(`Expected 18% add-to-cart, saw ${formatPercent(aggregate.cartRate)}`);
  }
  const csv = toCsv(
    (await import("../src/lib/aggregate")).aggregateToCsvRows(aggregate),
  );
  if (!csv.includes("problem,acne,320,")) {
    throw new Error("CSV export missed the acne row.");
  }
  console.log(
    `Smoke passed: ${aggregate.scanCount} scans, top concern ${aggregate.topProblem.label}, add-to-cart ${formatPercent(aggregate.cartRate)}.`,
  );
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
