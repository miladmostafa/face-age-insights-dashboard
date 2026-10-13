import { describe, expect, it } from "vitest";
import {
  anonymizeScan,
  bucketSkinAge,
  concernKeys,
  filterByKAnonymity,
  passesKAnonymity,
  roundPercent,
  sanitizeLanguage,
  skinHealthFromDamage,
} from "../src/lib/anonymize";

describe("skin-age buckets", () => {
  it("buckets exact skin age and rejects values outside 0-120", () => {
    expect(bucketSkinAge(17)).toBe("under_18");
    expect(bucketSkinAge(18)).toBe("18_24");
    expect(bucketSkinAge(24.4)).toBe("18_24");
    expect(bucketSkinAge(37)).toBe("35_44");
    expect(bucketSkinAge(65)).toBe("65_plus");
    expect(bucketSkinAge(121)).toBeNull();
    expect(bucketSkinAge(Number.NaN)).toBeNull();
  });

  it("prefers the numeric age over a client-supplied bucket", () => {
    const result = anonymizeScan({
      skinAge: 37,
      skinAgeBucket: "18_24",
      skinHealth: 68,
      problems: [],
    });
    expect(result.skinAgeBucket).toBe("35_44");
    expect(result.skinHealthPct).toBe(70);
    expect(JSON.stringify(result)).not.toContain("37");
  });

  it("accepts a bucket when no exact age is present", () => {
    expect(anonymizeScan({ skinAgeBucket: "25_34", problems: [] }).skinAgeBucket).toBe("25_34");
  });
});

describe("skin health", () => {
  it("mirrors the widget health reading and rounds to 5 percent", () => {
    expect(skinHealthFromDamage(32)).toBe(68);
    expect(skinHealthFromDamage(0)).toBe(99);
    expect(roundPercent(68)).toBe(70);
    expect(roundPercent(99)).toBe(100);
    expect(roundPercent(-4)).toBe(0);
  });
});

describe("concerns and language", () => {
  it("keeps known keys at or above the threshold", () => {
    expect(
      concernKeys(
        [
          { key: "acne", score: 80 },
          { key: "pores", score: 39 },
          { key: "notAProblem", score: 90 },
          { key: "dryness" },
        ],
        40,
      ),
    ).toEqual(["acne", "dryness"]);
  });

  it("keeps a two-letter language code and drops anything else", () => {
    expect(sanitizeLanguage("EN-us")).toBe("en");
    expect(sanitizeLanguage("english")).toBeNull();
    expect(sanitizeLanguage("e")).toBeNull();
  });
});

describe("k-anonymity", () => {
  it("hides slices between 1 and k-1 and keeps zeroes", () => {
    expect(passesKAnonymity(0, 5)).toBe(true);
    expect(passesKAnonymity(4, 5)).toBe(false);
    expect(passesKAnonymity(5, 5)).toBe(true);
    const filtered = filterByKAnonymity(
      [
        { key: "ko", count: 3 },
        { key: "nl", count: 6 },
        { key: "empty", count: 0 },
      ],
      5,
    );
    expect(filtered.visible.map((row) => row.key)).toEqual(["nl", "empty"]);
    expect(filtered.hidden).toBe(1);
  });
});
