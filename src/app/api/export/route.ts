import { aggregateEvents, aggregateToCsvRows, toAnalyticsEvent } from "@/lib/aggregate";
import { toCsv } from "@/lib/csv";
import { kAnonymity, rangeFromPreset } from "@/lib/config";
import { getStore } from "@/lib/db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const store = getStore();
  const sites = await store.listSites();
  const site = sites.find((item) => item.id === url.searchParams.get("site")) ?? sites[0];
  if (!site) {
    return Response.json({ error: "No site to export. Seed the database first." }, { status: 404 });
  }

  const range = rangeFromPreset(url.searchParams.get("range") ?? undefined, Date.now());
  const rows = await store.listEvents(site.id, range.from, range.to);
  const aggregate = aggregateEvents(rows.map(toAnalyticsEvent), kAnonymity());
  if (aggregate.suppressed) {
    return Response.json(
      { error: "Not enough scans in this window to export a private aggregate." },
      { status: 409 },
    );
  }

  const csv = toCsv(aggregateToCsvRows(aggregate));
  return new Response(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="face-age-insights-${site.id}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
