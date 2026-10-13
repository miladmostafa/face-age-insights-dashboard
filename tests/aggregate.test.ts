import { describe, expect, it } from "vitest";
import { aggregateEvents, formatPercent, toAnalyticsEvent } from "../src/lib/aggregate";
import { toCsv } from "../src/lib/csv";
import { aggregateToCsvRows } from "../src/lib/aggregate";
import { buildSeedEvents } from "../src/lib/seed-data";

describe("aggregation", () => {
  const events = buildSeedEvents(Date.UTC(2026, 9, 13)).map(toAnalyticsEvent);

  it("shows acne as the top concern and an 18 percent add-to-cart rate", () => {
    const aggregate = aggregateEvents(events, 5);
    expect(aggregate.suppressed).toBe(false);
    expect(aggregate.scanCount).toBe(500);
    expect(aggregate.topProblem?.key).toBe("acne");
    expect(aggregate.topProblem?.count).toBe(320);
    expect(formatPercent(aggregate.cartRate)).toBe("18%");
    expect(aggregate.funnel.map((step) => [step.stage, step.count])).toEqual([
      ["scan_completed", 500],
      ["product_view", 350],
      ["add_to_cart", 90],
      ["checkout", 35],
    ]);
  });

  it("hides the language used by only three scans", () => {
    const aggregate = aggregateEvents(events, 5);
    expect(aggregate.languages.some((row) => row.key === "ko")).toBe(false);
    expect(aggregate.languages.some((row) => row.key === "nl")).toBe(true);
    expect(aggregate.hiddenLanguages).toBe(1);
  });

  it("suppresses the whole dashboard below the threshold", () => {
    const aggregate = aggregateEvents(events.slice(0, 4), 5);
    expect(aggregate.suppressed).toBe(true);
    expect(aggregate.problems).toEqual([]);
    expect(aggregate.cartRate).toBeNull();
  });

  it("exports only the visible slices", () => {
    const aggregate = aggregateEvents(events, 5);
    const csv = toCsv(aggregateToCsvRows(aggregate));
    expect(csv.startsWith("metric,label,count,share\n")).toBe(true);
    expect(csv).toContain("problem,acne,320,0.6400\n");
    expect(csv).toContain("funnel,add_to_cart,90,0.1800\n");
    expect(csv).not.toContain(",ko,");
    expect(csv).not.toContain("@");
  });

  it("quotes cells that contain commas", () => {
    expect(
      toCsv([{ metric: "note", label: "a,b", count: 1, share: "1.0000" }]),
    ).toContain('"a,b"');
  });
});
