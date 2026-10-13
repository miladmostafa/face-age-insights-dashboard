import type { Metadata } from "next";
import { DemoEmbed } from "@/components/demo-embed";
import { SiteFooter, SiteHeader } from "@/components/site-header";
import { concernThreshold, resolveClientId, resolveDemoWriteKey } from "@/lib/config";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Live face-age demo",
  description:
    "Try the face-age skin analysis widget with the Face Age Insights collector attached. Scans can send anonymized concern and funnel events to the dashboard.",
};

export default function DemoPage() {
  const clientId = resolveClientId();
  const writeKey = resolveDemoWriteKey();

  return (
    <>
      <SiteHeader current="demo" />
      <main className="mx-auto max-w-6xl px-5 py-8">
        <p className="text-xs uppercase tracking-[0.18em] text-teal">Widget plus collector</p>
        <h1 className="mt-2 font-serif text-4xl tracking-tight sm:text-5xl">Live face-age demo</h1>
        <p className="mt-3 max-w-2xl text-muted">
          This page places <code className="rounded bg-card px-1">#FaceAge-module</code> directly
          in the document and starts the{" "}
          <a className="underline decoration-line underline-offset-2" href="https://www.npmjs.com/package/face-age">
            face-age
          </a>{" "}
          widget with your Client ID. Get an ID from{" "}
          <a className="underline decoration-line underline-offset-2" href="https://panel.getfaceage.com/">
            panel.getfaceage.com
          </a>
          .
        </p>
        <div className="mt-8">
          {clientId ? (
            <DemoEmbed
              clientId={clientId}
              writeKey={writeKey}
              concernThreshold={concernThreshold()}
            />
          ) : (
            <MissingClientId />
          )}
        </div>
      </main>
      <SiteFooter />
    </>
  );
}

function MissingClientId() {
  return (
    <section className="rounded-3xl bg-card p-8 shadow-card">
      <h2 className="font-serif text-3xl">Add a Face Age Client ID</h2>
      <p className="mt-3 max-w-2xl text-muted">
        The live widget needs a Client ID. Create one in the Face Age panel, then set{" "}
        <code className="rounded bg-paper px-1">FACEAGE_CLIENT_ID</code> in your{" "}
        <code className="rounded bg-paper px-1">.env</code> file and restart the app. The
        dashboard and its seeded charts work without this value.
      </p>
      <p className="mt-4">
        <a
          className="inline-flex rounded-full bg-deep px-4 py-2 text-sm text-paper hover:bg-teal"
          href="https://panel.getfaceage.com/"
        >
          Open the Face Age panel
        </a>
      </p>
      <pre className="mt-6 overflow-x-auto rounded-2xl bg-deep p-4 text-sm text-paper">{`FACEAGE_CLIENT_ID=your-client-id`}</pre>
    </section>
  );
}
