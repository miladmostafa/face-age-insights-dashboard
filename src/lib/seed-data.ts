import type { AgeBucket } from "./anonymize";
import type { EventRecord } from "./db/types";
import type { ProblemKey } from "./problems";

export const DEMO_SITE_ID = "site_northwind";
export const DEMO_SITE_NAME = "Northwind Beauty";
export const SEED_SCAN_COUNT = 500;
export const SEED_PRODUCT_VIEWS = 350;
export const SEED_PRODUCT_CLICKS = 160;
export const SEED_ADD_TO_CART = 90;
export const SEED_CHECKOUTS = 35;
export const SEED_WINDOW_MS = 28 * 24 * 60 * 60 * 1000;

const PROBLEM_PLAN: { key: ProblemKey; count: number; salt: number }[] = [
  { key: "acne", count: 320, salt: 3 },
  { key: "pores", count: 255, salt: 7 },
  { key: "oiliness", count: 220, salt: 11 },
  { key: "darkCircle", count: 195, salt: 13 },
  { key: "pigment", count: 165, salt: 17 },
  { key: "dryness", count: 140, salt: 19 },
  { key: "fineWrinkles", count: 130, salt: 23 },
  { key: "redness", count: 105, salt: 29 },
  { key: "eyeWrinkles", count: 85, salt: 31 },
  { key: "dullness", count: 75, salt: 37 },
  { key: "eyeBag", count: 55, salt: 41 },
  { key: "deepWrinkles", count: 40, salt: 43 },
  { key: "sagginess", count: 30, salt: 47 },
];

const AGE_PLAN: { bucket: AgeBucket; count: number }[] = [
  { bucket: "18_24", count: 70 },
  { bucket: "25_34", count: 160 },
  { bucket: "35_44", count: 140 },
  { bucket: "45_54", count: 80 },
  { bucket: "55_64", count: 35 },
  { bucket: "65_plus", count: 15 },
];

const HEALTH_PLAN: { pct: number; count: number }[] = [
  { pct: 45, count: 15 },
  { pct: 50, count: 30 },
  { pct: 55, count: 55 },
  { pct: 60, count: 80 },
  { pct: 65, count: 100 },
  { pct: 70, count: 90 },
  { pct: 75, count: 60 },
  { pct: 80, count: 40 },
  { pct: 85, count: 20 },
  { pct: 90, count: 10 },
];

const LANGUAGE_PLAN: { language: string; count: number }[] = [
  { language: "ko", count: 3 },
  { language: "nl", count: 6 },
  { language: "de", count: 15 },
  { language: "fr", count: 24 },
  { language: "es", count: 42 },
  { language: "en", count: 410 },
];

function selected(index: number, count: number, salt: number, total = SEED_SCAN_COUNT): boolean {
  return ((index * salt) % total) < count;
}

function pickByRank<T extends { count: number }>(index: number, salt: number, plan: T[]): T {
  const rank = (index * salt) % SEED_SCAN_COUNT;
  let seen = 0;
  for (const item of plan) {
    seen += item.count;
    if (rank < seen) return item;
  }
  return plan[plan.length - 1];
}

export function seedSessionId(index: number): string {
  return index.toString(16).padStart(32, "0");
}

export function buildSeedEvents(now: number, siteId = DEMO_SITE_ID): EventRecord[] {
  const events: EventRecord[] = [];
  for (let index = 0; index < SEED_SCAN_COUNT; index += 1) {
    const createdAt = now - SEED_WINDOW_MS + Math.floor((index / SEED_SCAN_COUNT) * SEED_WINDOW_MS);
    const sessionId = seedSessionId(index);
    const problems = PROBLEM_PLAN.filter((item) => selected(index, item.count, item.salt)).map(
      (item) => item.key,
    );
    const age = pickByRank(index, 19, AGE_PLAN);
    const health = pickByRank(index, 23, HEALTH_PLAN);
    const language = pickByRank(index, 13, LANGUAGE_PLAN);
    const rank = (index * 17) % SEED_SCAN_COUNT;

    events.push({
      id: `seed-scan-${index}`,
      siteId,
      type: "scan_completed",
      sessionId,
      language: language.language,
      skinAgeBucket: age.bucket,
      skinHealthPct: health.pct,
      problemKeys: JSON.stringify(problems),
      createdAt,
    });

    if (rank < SEED_PRODUCT_VIEWS) {
      events.push({
        id: `seed-view-${index}`,
        siteId,
        type: "product_view",
        sessionId,
        language: null,
        skinAgeBucket: null,
        skinHealthPct: null,
        problemKeys: null,
        createdAt: createdAt + 1_000,
      });
    }
    if (rank < SEED_PRODUCT_CLICKS) {
      events.push({
        id: `seed-click-${index}`,
        siteId,
        type: "product_click",
        sessionId,
        language: null,
        skinAgeBucket: null,
        skinHealthPct: null,
        problemKeys: null,
        createdAt: createdAt + 2_000,
      });
    }
    if (rank < SEED_ADD_TO_CART) {
      events.push({
        id: `seed-cart-${index}`,
        siteId,
        type: "add_to_cart",
        sessionId,
        language: null,
        skinAgeBucket: null,
        skinHealthPct: null,
        problemKeys: null,
        createdAt: createdAt + 3_000,
      });
    }
    if (rank < SEED_CHECKOUTS) {
      events.push({
        id: `seed-checkout-${index}`,
        siteId,
        type: "checkout",
        sessionId,
        language: null,
        skinAgeBucket: null,
        skinHealthPct: null,
        problemKeys: null,
        createdAt: createdAt + 4_000,
      });
    }
  }
  return events;
}
