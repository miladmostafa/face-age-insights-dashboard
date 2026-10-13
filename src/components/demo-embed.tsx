"use client";

import { useEffect, useState } from "react";
import type { DemoProduct } from "@/types/face-age";

const PRODUCTS: DemoProduct[] = [
  {
    id: 1,
    url: "https://getfaceage.com/",
    image: "https://static.getfaceage.com/logo.png",
    title: "Demo Clarifying Serum",
    description: "Sample catalog item for the insights funnel",
    price: 42,
    problems: ["acne", "oiliness", "pores"],
  },
  {
    id: 2,
    url: "https://getfaceage.com/",
    image: "https://static.getfaceage.com/logo.png",
    title: "Demo Brightening Cream",
    description: "Sample catalog item for the insights funnel",
    price: 36,
    problems: ["pigment", "dullness", "darkCircle"],
  },
  {
    id: 3,
    url: "https://getfaceage.com/",
    image: "https://static.getfaceage.com/logo.png",
    title: "Demo Barrier Moisturizer",
    description: "Sample catalog item for the insights funnel",
    price: 28,
    problems: ["dryness", "redness", "fineWrinkles"],
  },
];

function waitForWidgetFrame(): Promise<void> {
  return new Promise((resolve, reject) => {
    const started = Date.now();
    const timer = window.setInterval(() => {
      if (document.getElementById("FaceAge-module-iframe")) {
        window.clearInterval(timer);
        resolve();
        return;
      }
      if (Date.now() - started > 15000) {
        window.clearInterval(timer);
        reject(new Error("The face-age widget did not create its iframe."));
      }
    }, 50);
  });
}

function loadScript(src: string, id: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const existing = document.getElementById(id) as HTMLScriptElement | null;
    if (existing?.dataset.loaded === "true") {
      resolve();
      return;
    }
    const script = existing ?? document.createElement("script");
    const finish = () => {
      script.dataset.loaded = "true";
      resolve();
    };
    const fail = () => reject(new Error(`Could not load ${src}`));
    script.addEventListener("load", finish, { once: true });
    script.addEventListener("error", fail, { once: true });
    if (!existing) {
      script.id = id;
      script.src = src;
      script.async = false;
      document.body.appendChild(script);
    }
  });
}

export function DemoEmbed({
  clientId,
  writeKey,
  concernThreshold,
}: {
  clientId: string;
  writeKey: string;
  concernThreshold: number;
}) {
  const [status, setStatus] = useState("Loading the face-age widget…");
  const [optedOut, setOptedOut] = useState(false);
  const [sampleNote, setSampleNote] = useState("");

  useEffect(() => {
    let cancelled = false;
    const container = document.getElementById("FaceAge-module");

    async function boot() {
      try {
        await loadScript("/vendor/face-age/faceage.js", "face-age-sdk");
        await loadScript("/collector/face-age-insights.js", "face-age-insights-collector");
        if (cancelled || !window.FaceAge) {
          if (!cancelled) setStatus("The face-age script did not start.");
          return;
        }
        const widget = new window.FaceAge({
          elementId: "FaceAge-module",
          faceageId: clientId,
          displayModel: "section",
          language: "en",
          height: "680px",
          currency: "$",
          quiz: false,
          showProducts: true,
          showRoutine: true,
          showAddToCard: true,
          showCamera: true,
          showUpload: true,
          privacyUrl: `${window.location.origin}/privacy`,
          problems: [
            "fineWrinkles",
            "eyeWrinkles",
            "deepWrinkles",
            "darkCircle",
            "eyeBag",
            "pores",
            "pigment",
            "redness",
            "oiliness",
            "dryness",
            "sagginess",
            "dullness",
            "acne",
          ],
        });
        const rendered = widget.render();
        // face-age 2.4.13 returns a promise from render() that does not resolve
        // after a successful mount. Wait for the internal iframe instead.
        await Promise.race([
          rendered.catch(() => undefined),
          waitForWidgetFrame(),
        ]);
        widget.API?.setCustomProducts?.(PRODUCTS);
        if (writeKey && window.FaceAgeInsights) {
          window.FaceAgeInsights.attach(widget, {
            endpoint: `${window.location.origin}/api/ingest`,
            writeKey,
            language: "en",
            concernThreshold,
          });
          setOptedOut(window.FaceAgeInsights.isOptedOut());
        }
        if (!cancelled) {
          setStatus(
            writeKey
              ? "Widget ready. A completed scan can send an anonymized event to this dashboard."
              : "Widget ready. Set DEMO_WRITE_KEY or run npm run seed before events can be stored.",
          );
        }
      } catch (error) {
        if (!cancelled) {
          setStatus(error instanceof Error ? error.message : "The widget could not start.");
        }
      }
    }

    void boot();
    return () => {
      cancelled = true;
      if (container) container.replaceChildren();
    };
  }, [clientId, concernThreshold, writeKey]);

  async function sendSample() {
    if (!window.FaceAgeInsights || !writeKey) return;
    if (window.FaceAgeInsights.isOptedOut()) {
      setSampleNote("Collection is off, so the sample was not sent.");
      return;
    }
    setSampleNote("Sending a labeled sample…");
    const result = await window.FaceAgeInsights.sendSample({
      endpoint: `${window.location.origin}/api/ingest`,
      writeKey,
      language: "en",
    });
    const keys = result.scan?.problems?.map((problem) => problem.key).join(", ") || "none";
    const failed = result.results?.some((item) => item.ok === false);
    setSampleNote(
      failed
        ? "The sample was not accepted. Check the demo write key and that the database has been seeded."
        : `Sample stored. Concerns sent: ${keys}. Skin-age bucket: ${result.scan?.skinAgeBucket ?? "n/a"}. Exact age was not sent.`,
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,340px)_1fr]">
      <aside className="space-y-4">
        <div className="rounded-3xl bg-card p-5 shadow-card">
          <h2 className="font-serif text-2xl">Before you scan</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            The widget renders in this page, including the iframe it creates for itself. This
            dashboard does not wrap it in another frame. Photos stay with Face Age. If you leave
            collection on, a finished scan sends concern keys, a skin-age bucket, skin health, and
            the language code.
          </p>
          <p className="mt-3 text-sm" role="status">
            {status}
          </p>
        </div>
        <div className="rounded-3xl bg-card p-5 shadow-card">
          <h2 className="font-serif text-2xl">Opt out</h2>
          <p className="mt-2 text-sm text-muted">
            Opting out keeps the scanner working and stops this browser from posting events.
          </p>
          <button
            type="button"
            className="mt-4 rounded-full bg-deep px-4 py-2 text-sm text-paper hover:bg-teal"
            onClick={() => {
              if (!window.FaceAgeInsights) return;
              if (window.FaceAgeInsights.isOptedOut()) {
                window.FaceAgeInsights.optIn();
                setOptedOut(false);
              } else {
                window.FaceAgeInsights.optOut();
                setOptedOut(true);
              }
            }}
          >
            {optedOut ? "Opt back in" : "Opt out of anonymous insights"}
          </button>
          <p className="mt-2 text-sm text-muted">
            {optedOut ? "Collection is off in this browser." : "Collection is on in this browser."}
          </p>
        </div>
        <div className="rounded-3xl bg-card p-5 shadow-card">
          <h2 className="font-serif text-2xl">No camera?</h2>
          <p className="mt-2 text-sm text-muted">
            Send one clearly labeled sample through the same ingest API. It is not a real scan and
            includes no photo.
          </p>
          <button
            type="button"
            className="mt-4 rounded-full border border-line bg-paper px-4 py-2 text-sm hover:border-teal disabled:opacity-50"
            disabled={!writeKey}
            onClick={() => void sendSample()}
          >
            Send sample event
          </button>
          {sampleNote ? (
            <p className="mt-3 text-sm" role="status">
              {sampleNote}
            </p>
          ) : null}
        </div>
      </aside>
      <div className="min-w-0 rounded-3xl bg-card p-3 shadow-card sm:p-5">
        <div id="FaceAge-module" />
      </div>
    </div>
  );
}
