import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = path.resolve(__dirname, "..");
const pkg = JSON.parse(
  fs.readFileSync(path.join(root, "node_modules", "face-age", "package.json"), "utf8"),
) as { version: string };
const source = fs.readFileSync(path.join(root, "node_modules", "face-age", "dist", "faceage.js"), "utf8");

describe("installed face-age package", () => {
  it("exposes the constructor, result callback, and funnel events used by the collector", () => {
    expect(pkg.version).toMatch(/^\d+\.\d+\.\d+$/);
    for (const token of [
      "getAdvisorData",
      "onDisplayProducts",
      "onClickProduct",
      "onAddToCart",
      "onCheckout",
      "setCustomProducts",
      "FaceAge-module-iframe",
      "skinAge",
      "damagePercentage",
      "fineWrinkles",
      "acne",
    ]) {
      expect(source).toContain(token);
    }
  });

  it("passes the problems array into getAdvisorData in face-age 2.4.x", () => {
    expect(pkg.version.startsWith("2.4.")).toBe(true);
    expect(source).toContain("getAdvisorData(e.problems)");
    expect(source).toContain("analysis:n,activeSelections:");
  });
});
