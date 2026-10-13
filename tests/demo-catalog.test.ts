import { describe, expect, it, vi } from "vitest";
import { restoreCatalogAfterScan } from "../src/lib/demo-catalog";
import type { FaceAgeWidget } from "../src/types/face-age";

describe("restoreCatalogAfterScan", () => {
  it("puts the catalog back before the collector reads the finished scan", () => {
    const calls: string[] = [];
    const widget: FaceAgeWidget = {
      render: () => Promise.resolve(),
      API: {
        setCustomProducts: () => {
          calls.push("products");
        },
      },
      w: {
        globals: {
          getAdvisorData: () => {
            calls.push("collector");
          },
        },
      },
    };

    restoreCatalogAfterScan(widget, []);
    widget.w?.globals?.getAdvisorData?.({ analysis: [] });

    expect(calls).toEqual(["products", "collector"]);
  });

  it("still restores the catalog when no collector is attached", () => {
    const setCustomProducts = vi.fn();
    const widget: FaceAgeWidget = {
      render: () => Promise.resolve(),
      API: { setCustomProducts },
      w: { globals: {} },
    };

    restoreCatalogAfterScan(widget, []);
    widget.w?.globals?.getAdvisorData?.({ analysis: [] });

    expect(setCustomProducts).toHaveBeenCalledOnce();
  });
});
