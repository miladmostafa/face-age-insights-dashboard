import { SiteFooter, SiteHeader } from "@/components/site-header";
import { DashboardView } from "@/components/dashboard-view";
import { aggregateEvents, toAnalyticsEvent } from "@/lib/aggregate";
import { kAnonymity, rangeFromPreset } from "@/lib/config";
import { getStore } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ site?: string; range?: string }>;
}) {
  const params = await searchParams;
  const store = getStore();
  const sites = await store.listSites();
  const range = rangeFromPreset(params.range, Date.now());

  if (sites.length === 0) {
    return (
      <>
        <SiteHeader current="dashboard" />
        <main className="mx-auto max-w-6xl px-5 py-16">
          <h1 className="font-serif text-5xl tracking-tight">No sites yet</h1>
          <p className="mt-4 max-w-xl text-muted">
            Seed the Northwind Beauty demo, then open this dashboard to see concern frequency,
            skin-age buckets, and the path from scan to checkout.
          </p>
          <pre className="mt-6 overflow-x-auto rounded-2xl bg-deep p-4 text-sm text-paper">
            npm run seed
          </pre>
        </main>
        <SiteFooter />
      </>
    );
  }

  const site = sites.find((item) => item.id === params.site) ?? sites[0];
  const rows = await store.listEvents(site.id, range.from, range.to);
  const aggregate = aggregateEvents(rows.map(toAnalyticsEvent), kAnonymity());

  return (
    <>
      <SiteHeader current="dashboard" />
      <main>
        <DashboardView
          sites={sites}
          site={site}
          preset={range.preset}
          label={range.label}
          aggregate={aggregate}
        />
      </main>
      <SiteFooter />
    </>
  );
}
