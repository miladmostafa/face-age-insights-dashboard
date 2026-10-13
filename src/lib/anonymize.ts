import { isProblemKey, type ProblemKey } from "./problems";

/** Skin-age buckets. Exact skin age is never stored. */
export const AGE_BUCKETS = [
  "under_18",
  "18_24",
  "25_34",
  "35_44",
  "45_54",
  "55_64",
  "65_plus",
] as const;

export type AgeBucket = (typeof AGE_BUCKETS)[number];

export const AGE_BUCKET_LABELS: Record<AgeBucket, string> = {
  under_18: "Under 18",
  "18_24": "18–24",
  "25_34": "25–34",
  "35_44": "35–44",
  "45_54": "45–54",
  "55_64": "55–64",
  "65_plus": "65+",
};

export const DEFAULT_CONCERN_THRESHOLD = 40;
export const DEFAULT_K_ANONYMITY = 5;

export function bucketSkinAge(age: number): AgeBucket | null {
  if (!Number.isFinite(age)) return null;
  const n = Math.round(age);
  if (n < 0 || n > 120) return null;
  if (n < 18) return "under_18";
  if (n <= 24) return "18_24";
  if (n <= 34) return "25_34";
  if (n <= 44) return "35_44";
  if (n <= 54) return "45_54";
  if (n <= 64) return "55_64";
  return "65_plus";
}

export function isAgeBucket(value: string): value is AgeBucket {
  return (AGE_BUCKETS as readonly string[]).includes(value);
}

export function ageBucketLabel(bucket: string): string {
  return isAgeBucket(bucket) ? AGE_BUCKET_LABELS[bucket] : bucket;
}

/**
 * The widget labels "Skin Health" as 100 minus damage, and shows 99 when
 * damage is reported as 0. This mirrors face-age 2.4.13.
 */
export function skinHealthFromDamage(damage: number): number | null {
  if (!Number.isFinite(damage)) return null;
  const d = Math.min(100, Math.max(0, damage));
  if (d === 0) return 99;
  return Math.max(0, Math.min(100, Math.round(100 - d)));
}

/** Round a percent to the nearest step so a single scan is less distinctive. */
export function roundPercent(value: number, step = 5): number | null {
  if (!Number.isFinite(value)) return null;
  const clamped = Math.min(100, Math.max(0, value));
  const rounded = Math.round(clamped / step) * step;
  return Math.min(100, Math.max(0, rounded));
}

export function sanitizeLanguage(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const primary = value.trim().toLowerCase().split(/[-_]/)[0] ?? "";
  return /^[a-z]{2}$/.test(primary) ? primary : null;
}

export type ProblemScore = {
  key: string;
  score?: number | null;
};

export function concernKeys(
  problems: ProblemScore[],
  threshold = DEFAULT_CONCERN_THRESHOLD,
): ProblemKey[] {
  const keys: ProblemKey[] = [];
  for (const problem of problems) {
    if (!problem || !isProblemKey(problem.key)) continue;
    if (keys.includes(problem.key)) continue;
    const score = problem.score;
    if (score == null || (Number.isFinite(score) && score >= threshold)) {
      keys.push(problem.key);
    }
  }
  return keys;
}

export type AnonymizedScan = {
  language: string | null;
  skinAgeBucket: AgeBucket | null;
  skinHealthPct: number | null;
  problemKeys: ProblemKey[];
};

export function anonymizeScan(input: {
  language?: unknown;
  skinAge?: number | null;
  skinAgeBucket?: string | null;
  skinHealth?: number | null;
  problems?: ProblemScore[];
  concernThreshold?: number;
}): AnonymizedScan {
  let skinAgeBucket: AgeBucket | null = null;
  if (typeof input.skinAge === "number") {
    skinAgeBucket = bucketSkinAge(input.skinAge);
  } else if (input.skinAgeBucket && isAgeBucket(input.skinAgeBucket)) {
    skinAgeBucket = input.skinAgeBucket;
  }

  return {
    language: sanitizeLanguage(input.language),
    skinAgeBucket,
    skinHealthPct:
      typeof input.skinHealth === "number" ? roundPercent(input.skinHealth) : null,
    problemKeys: concernKeys(input.problems ?? [], input.concernThreshold),
  };
}

/**
 * Drop a slice whose count is below the k-anonymity threshold.
 * A count of zero is kept: it reports that a known bucket did not occur.
 */
export function passesKAnonymity(count: number, k: number): boolean {
  if (k <= 1) return true;
  return count === 0 || count >= k;
}

export function filterByKAnonymity<T extends { count: number }>(rows: T[], k: number): {
  visible: T[];
  hidden: number;
} {
  const visible = rows.filter((row) => passesKAnonymity(row.count, k));
  return { visible, hidden: rows.length - visible.length };
}
