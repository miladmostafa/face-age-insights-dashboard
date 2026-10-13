import type { Metadata } from "next";
import { SiteFooter, SiteHeader } from "@/components/site-header";
import { DEFAULT_CONCERN_THRESHOLD, DEFAULT_K_ANONYMITY } from "@/lib/anonymize";

export const metadata: Metadata = {
  title: "Privacy",
  description:
    "What Face Age Insights collects from face-age scans, what it refuses, and how k-anonymity hides small groups.",
};

export default function PrivacyPage() {
  return (
    <>
      <SiteHeader current="privacy" />
      <main className="mx-auto max-w-3xl px-5 py-10">
        <p className="text-xs uppercase tracking-[0.18em] text-teal">Disclosure</p>
        <h1 className="mt-2 font-serif text-4xl tracking-tight sm:text-5xl">Privacy</h1>
        <div className="mt-6 space-y-4 text-[17px] leading-relaxed text-ink/90">
          <p>
            Face Age Insights is a first-party counter for the{" "}
            <a className="underline underline-offset-2" href="https://getfaceage.com">
              face-age
            </a>{" "}
            skin scanner. It is meant for brands and agencies who want aggregate results without
            building a profile of each shopper.
          </p>
          <h2 className="pt-4 font-serif text-2xl">What a scan can send</h2>
          <ul className="list-disc space-y-2 pl-5">
            <li>Problem keys whose score is at least {DEFAULT_CONCERN_THRESHOLD}, such as acne or pores.</li>
            <li>A skin-age bucket, such as 25–34. The exact skin-age number is dropped.</li>
            <li>Skin health rounded to the nearest 5 percent.</li>
            <li>A two-letter language code.</li>
            <li>A random session id so a scan can be tied to a later add-to-cart in the same tab.</li>
          </ul>
          <h2 className="pt-4 font-serif text-2xl">What never belongs here</h2>
          <ul className="list-disc space-y-2 pl-5">
            <li>Photos, camera frames, or image uploads. Face Age analyzes those in its own cloud.</li>
            <li>Names, emails, phone numbers, or quiz answers.</li>
            <li>Calendar age, gender, or an exact skin age.</li>
            <li>Product catalog ids. Funnel events are counts only.</li>
          </ul>
          <h2 className="pt-4 font-serif text-2xl">Small groups stay hidden</h2>
          <p>
            The dashboard hides a slice until it has at least {DEFAULT_K_ANONYMITY} events. A
            language used by three shoppers, or a checkout count of two, is not shown. The CSV
            export uses the same rule. You can raise the threshold with the{" "}
            <code className="rounded bg-card px-1">K_ANONYMITY</code> environment variable.
          </p>
          <h2 className="pt-4 font-serif text-2xl">Opt out</h2>
          <p>
            The live demo has an opt-out control. On your own site, call{" "}
            <code className="rounded bg-card px-1">FaceAgeInsights.optOut()</code> or set{" "}
            <code className="rounded bg-card px-1">localStorage[&quot;faceage_insights_opt_out&quot;] = &quot;1&quot;</code>.
            The scanner keeps working. Events from that browser stop.
          </p>
          <p>
            The ingest API is write-only and expects a per-site write key. Protect the dashboard
            itself with <code className="rounded bg-card px-1">DASHBOARD_TOKEN</code> when it is
            reachable beyond your team.
          </p>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
