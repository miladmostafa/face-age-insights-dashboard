import fs from "node:fs";
import path from "node:path";
import { demoWriteKeyPath, loadEnvFile, resolveDemoWriteKey } from "../src/lib/config";

loadEnvFile();
import { openStore } from "../src/lib/db";
import { generateWriteKey, hashWriteKey } from "../src/lib/keys";
import {
  buildSeedEvents,
  DEMO_SITE_ID,
  DEMO_SITE_NAME,
  SEED_SCAN_COUNT,
} from "../src/lib/seed-data";

async function main() {
  const force = process.argv.includes("--force");
  const writeKey = resolveDemoWriteKey() || generateWriteKey();
  const store = openStore();
  const existing = await store.findSiteByWriteKeyHash(hashWriteKey(writeKey));
  const siteId = existing?.id ?? DEMO_SITE_ID;

  await store.upsertSite({
    id: siteId,
    name: existing?.name ?? DEMO_SITE_NAME,
    writeKeyHash: hashWriteKey(writeKey),
    allowedOrigins: existing?.allowedOrigins ?? "*",
    createdAt: existing?.createdAt ?? Date.now(),
  });

  const count = await store.countEvents(siteId);
  if (count > 0 && !force) {
    console.log(`Demo data already present (${count} events). Pass --force to rebuild it.`);
  } else {
    if (count > 0) await store.deleteEvents(siteId);
    const events = buildSeedEvents(Date.now(), siteId);
    for (const event of events) await store.insertEvent(event);
    console.log(`Seeded ${SEED_SCAN_COUNT} anonymized scans for ${DEMO_SITE_NAME}.`);
  }

  const file = demoWriteKeyPath();
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${writeKey}\n`, { mode: 0o600 });
  console.log(`Demo write key: ${writeKey}`);
  console.log("Dashboard: http://localhost:3000");
  console.log("Live demo: http://localhost:3000/demo");
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
