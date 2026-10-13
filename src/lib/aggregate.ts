import {
  ageBucketLabel,
  AGE_BUCKETS,
  filterByKAnonymity,
  type AgeBucket,
} from "./anonymize";
import { problemLabel, type ProblemKey } from "./problems";

export const FUNNEL_STAGES = [
  "scan_completed",
  "product_view",
  "add_to_cart",
  "checkout",
] as const;

export type FunnelStage = (typeof FUNNEL_STAGES)[number];

export const FUNNEL_LABELS: Record<FunnelStage, string> = {
  scan_completed: "Scan",
  product_view: "Product view",
  add_to_cart: "Add to cart",
  checkout: "Checkout",
};

export type AnalyticsEvent = {
  type: string;
  sessionId: string;
  language: string | null;
  skinAgeBucket: string | null;
  skinHealthPct: number | null;
  problemKeys: string[];
};

export type CountShare = {
  key: string;
  label: string;
  count: number;
  share: number;
};

export type FunnelRow = {
  stage: FunnelStage;
  label: string;
  count: number | null;
  rate: number | null;
};

export type DashboardAggregate = {
  scanCount: number;
  suppressed: boolean;
  k: number;
  topProblem: CountShare | null;
  cartRate: number | null;
  checkoutRate: number | null;
  productClickCount: number | null;
  problems: CountShare[];
  hiddenProblems: number;
  ages: CountShare[];
  hiddenAges: number;
  health: CountShare[];
  hiddenHealth: number;
  languages: CountShare[];
  hiddenLanguages: number;
  funnel: FunnelRow[];
};

function share(count: number, total: number): number {
  if (total <= 0) return 0;
  return count / total;
}

function sessionsWith(events: AnalyticsEvent[], type: string): Set<string> {
  const ids = new Set<string>();
  for (const event of events) {
    if (event.type === type) ids.add(event.sessionId);
  }
  return ids;
}

function overlap(target: Set<string>, base: Set<string>): number {
  let count = 0;
  for (const id of target) {
    if (base.has(id)) count += 1;
  }
  return count;
}

export function aggregateEvents(
  events: AnalyticsEvent[],
  k: number,
): DashboardAggregate {
  const scans = sessionsWith(events, "scan_completed");
  const scanCount = scans.size;
  const empty = emptyAggregate(k);

  if (scanCount < Math.max(k, 1)) {
    return { ...empty, scanCount, suppressed: true };
  }

  const problemCounts = new Map<string, number>();
  const ageCounts = new Map<string, number>();
  for (const bucket of AGE_BUCKETS) ageCounts.set(bucket, 0);
  const healthCounts = new Map<number, number>();
  const languageCounts = new Map<string, number>();

  const seenScan = new Set<string>();
  for (const event of events) {
    if (event.type !== "scan_completed") continue;
    if (seenScan.has(event.sessionId)) continue;
    seenScan.add(event.sessionId);

    for (const key of event.problemKeys) {
      problemCounts.set(key, (problemCounts.get(key) ?? 0) + 1);
    }
    if (event.skinAgeBucket) {
      ageCounts.set(event.skinAgeBucket, (ageCounts.get(event.skinAgeBucket) ?? 0) + 1);
    }
    if (event.skinHealthPct != null) {
      healthCounts.set(
        event.skinHealthPct,
        (healthCounts.get(event.skinHealthPct) ?? 0) + 1,
      );
    }
    if (event.language) {
      languageCounts.set(event.language, (languageCounts.get(event.language) ?? 0) + 1);
    }
  }

  const problemsAll = [...problemCounts.entries()]
    .map(([key, count]) => ({
      key,
      label: problemLabel(key),
      count,
      share: share(count, scanCount),
    }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
  const problems = filterByKAnonymity(problemsAll, k);

  const agesAll = AGE_BUCKETS.map((bucket) => {
    const count = ageCounts.get(bucket) ?? 0;
    return {
      key: bucket,
      label: ageBucketLabel(bucket),
      count,
      share: share(count, scanCount),
    };
  }).filter((row) => row.count > 0);
  const ages = filterByKAnonymity(agesAll, k);

  const healthAll = [...healthCounts.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([pct, count]) => ({
      key: String(pct),
      label: `${pct}%`,
      count,
      share: share(count, scanCount),
    }));
  const health = filterByKAnonymity(healthAll, k);

  const languagesAll = [...languageCounts.entries()]
    .map(([key, count]) => ({
      key,
      label: key.toUpperCase(),
      count,
      share: share(count, scanCount),
    }))
    .sort((a, b) => b.count - a.count || a.key.localeCompare(b.key));
  const languages = filterByKAnonymity(languagesAll, k);

  const views = overlap(sessionsWith(events, "product_view"), scans);
  const carts = overlap(sessionsWith(events, "add_to_cart"), scans);
  const checkouts = overlap(sessionsWith(events, "checkout"), scans);
  const clicks = overlap(sessionsWith(events, "product_click"), scans);

  const funnelCounts: Record<FunnelStage, number> = {
    scan_completed: scanCount,
    product_view: views,
    add_to_cart: carts,
    checkout: checkouts,
  };

  const funnel: FunnelRow[] = FUNNEL_STAGES.map((stage) => {
    const count = funnelCounts[stage];
    const visible = count === 0 || count >= k;
    return {
      stage,
      label: FUNNEL_LABELS[stage],
      count: visible ? count : null,
      rate: visible ? share(count, scanCount) : null,
    };
  });

  return {
    scanCount,
    suppressed: false,
    k,
    topProblem: problems.visible[0] ?? null,
    cartRate: carts >= k || carts === 0 ? share(carts, scanCount) : null,
    checkoutRate: checkouts >= k || checkouts === 0 ? share(checkouts, scanCount) : null,
    productClickCount: clicks >= k || clicks === 0 ? clicks : null,
    problems: problems.visible,
    hiddenProblems: problems.hidden,
    ages: ages.visible,
    hiddenAges: ages.hidden,
    health: health.visible,
    hiddenHealth: health.hidden,
    languages: languages.visible,
    hiddenLanguages: languages.hidden,
    funnel,
  };
}

function emptyAggregate(k: number): DashboardAggregate {
  return {
    scanCount: 0,
    suppressed: true,
    k,
    topProblem: null,
    cartRate: null,
    checkoutRate: null,
    productClickCount: null,
    problems: [],
    hiddenProblems: 0,
    ages: [],
    hiddenAges: 0,
    health: [],
    hiddenHealth: 0,
    languages: [],
    hiddenLanguages: 0,
    funnel: [],
  };
}

export function formatPercent(rate: number | null): string {
  if (rate == null || !Number.isFinite(rate)) return "—";
  const pct = Math.round(rate * 1000) / 10;
  const text = Number.isInteger(pct) ? String(pct) : pct.toFixed(1);
  return `${text}%`;
}

export type CsvRow = {
  metric: string;
  label: string;
  count: number;
  share: string;
};

export function aggregateToCsvRows(aggregate: DashboardAggregate): CsvRow[] {
  if (aggregate.suppressed) return [];
  const rows: CsvRow[] = [];
  const push = (metric: string, items: CountShare[]) => {
    for (const item of items) {
      rows.push({
        metric,
        label: item.key,
        count: item.count,
        share: item.share.toFixed(4),
      });
    }
  };
  push("problem", aggregate.problems);
  push("skin_age", aggregate.ages);
  push("skin_health", aggregate.health);
  push("language", aggregate.languages);
  for (const step of aggregate.funnel) {
    if (step.count == null || step.rate == null) continue;
    rows.push({
      metric: "funnel",
      label: step.stage,
      count: step.count,
      share: step.rate.toFixed(4),
    });
  }
  return rows;
}

export function parseProblemKeys(value: string | null): ProblemKey[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is ProblemKey => typeof item === "string") as ProblemKey[];
  } catch {
    return [];
  }
}

export function toAnalyticsEvent(row: {
  type: string;
  sessionId: string;
  language: string | null;
  skinAgeBucket: string | null;
  skinHealthPct: number | null;
  problemKeys: string | null;
}): AnalyticsEvent {
  return {
    type: row.type,
    sessionId: row.sessionId,
    language: row.language,
    skinAgeBucket: row.skinAgeBucket,
    skinHealthPct: row.skinHealthPct,
    problemKeys: parseProblemKeys(row.problemKeys),
  };
}

export type AgeBucketKey = AgeBucket;
