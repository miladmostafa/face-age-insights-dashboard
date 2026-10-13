import { describe, expect, it, vi } from "vitest";
import insights from "../collector/face-age-insights.js";

type Handler = (data?: unknown) => void;

function fakeWidget(overrides?: {
  skinAge?: number;
  damagePercentage?: number;
  analysis?: unknown;
}) {
  const handlers: Record<string, Handler> = {};
  const widget = {
    w: {
      globals: {
        skinAnalyzeData: {
          skinAge: overrides?.skinAge ?? 37,
          damagePercentage: overrides?.damagePercentage ?? 32,
          imageSubmit: "data:image/jpeg;base64,secret",
        },
        formData: { email: "shopper@example.com" },
      },
    },
    API: {
      getAdvisorData(callback: Handler) {
        handlers.advisor = callback;
      },
    },
    onDisplayProducts(callback: Handler) {
      handlers.display = callback;
    },
    onClickProduct(callback: Handler) {
      handlers.click = callback;
    },
    onAddToCart(callback: Handler) {
      handlers.cart = callback;
    },
    onCheckout(callback: Handler) {
      handlers.checkout = callback;
    },
    emit(name: string, data?: unknown) {
      handlers[name]?.(data);
    },
  };
  return widget;
}

describe("collector", () => {
  it("turns the real getAdvisorData shape into an anonymized scan", () => {
    const widget = fakeWidget();
    const event = insights.buildScanEvent(
      widget,
      {
        analysis: [
          { key: "acne", title: "Acne", number: 72, description: "ignore me" },
          { key: "pores", number: 12 },
          { key: "masks", number: 99 },
        ],
        activeSelections: { email: "shopper@example.com" },
      },
      { language: "en", sessionId: "ab".repeat(16), concernThreshold: 40 },
    );

    expect(event.type).toBe("scan_completed");
    expect(event.skinAgeBucket).toBe("35_44");
    expect(event.skinHealth).toBe(68);
    expect(event.problems).toEqual([{ key: "acne", score: 72 }]);
    const encoded = JSON.stringify(event);
    expect(encoded).not.toContain("@");
    expect(encoded).not.toContain("data:image");
    expect(encoded).not.toContain("37");
    expect(encoded).not.toContain("shopper");
  });

  it("also reads skin age when a future SDK passes an analysis object", () => {
    const event = insights.buildScanEvent(
      { w: { globals: {} } },
      {
        analysis: {
          skinAge: 22,
          damagePercentage: 10,
          problems: [{ key: "dryness", number: 50 }],
        },
      },
      { sessionId: "cd".repeat(16) },
    );
    expect(event.skinAgeBucket).toBe("18_24");
    expect(event.skinHealth).toBe(90);
    expect(event.problems).toEqual([{ key: "dryness", score: 50 }]);
  });

  it("counts funnel callbacks and drops their payloads when opted in", async () => {
    const widget = fakeWidget();
    const bodies: unknown[] = [];
    const fetch = vi.fn(async (_url: string, init?: { body?: string }) => {
      bodies.push(JSON.parse(init?.body ?? "{}"));
      return { ok: true, status: 202 };
    });
    insights.attach(widget, {
      endpoint: "https://insights.example/api/ingest",
      writeKey: "fa_test",
      language: "en",
      fetch,
      storage: memory(),
    });

    widget.emit("advisor", {
      analysis: [{ key: "acne", number: 60 }],
      activeSelections: { email: "shopper@example.com" },
    });
    widget.emit("display", [{ id: "secret-product", title: "Serum" }]);
    widget.emit("click", "secret-product");
    widget.emit("cart", [{ id: "secret-product", variable: "30ml" }]);
    widget.emit("checkout", [{ id: "secret-product" }]);

    await vi.waitFor(() => expect(bodies).toHaveLength(5));
    const encoded = JSON.stringify(bodies);
    expect(encoded).not.toContain("secret-product");
    expect(encoded).not.toContain("@");
    expect(bodies.map((body) => (body as { type: string }).type)).toEqual([
      "scan_completed",
      "product_view",
      "product_click",
      "add_to_cart",
      "checkout",
    ]);
  });

  it("does not send a sample after opt-out", async () => {
    const storage = memory();
    insights.optOut(storage);
    const fetch = vi.fn();
    const result = await insights.sendSample({
      endpoint: "https://insights.example/api/ingest",
      writeKey: "fa_test",
      fetch,
      storage,
    });
    expect(result.optedOut).toBe(true);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("sends nothing after opt-out", async () => {
    const widget = fakeWidget();
    const storage = memory();
    insights.optOut(storage);
    const fetch = vi.fn();
    insights.attach(widget, {
      endpoint: "https://insights.example/api/ingest",
      writeKey: "fa_test",
      fetch,
      storage,
    });
    widget.emit("advisor", { analysis: [{ key: "acne", number: 80 }] });
    widget.emit("cart", [{ id: 1 }]);
    await new Promise((resolve) => setTimeout(resolve, 10));
    expect(fetch).not.toHaveBeenCalled();
    insights.optIn(storage);
    expect(insights.isOptedOut(storage)).toBe(false);
  });
});

function memory() {
  const data = new Map<string, string>();
  return {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => {
      data.set(key, value);
    },
    removeItem: (key: string) => {
      data.delete(key);
    },
  };
}
