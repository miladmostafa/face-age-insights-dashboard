import Link from "next/link";
import type { DashboardAggregate, FunnelRow } from "@/lib/aggregate";
import { formatPercent } from "@/lib/aggregate";
import { isProblemKey, PROMOTION_HINTS } from "@/lib/problems";
import type { SiteRecord } from "@/lib/db/types";
import { AgeChart, HealthChart, ProblemChart } from "./charts";

export function DashboardView({
  sites,
  site,
  preset,
  label,
  aggregate,
}: {
  sites: SiteRecord[];
  site: SiteRecord;
  preset: string;
  label: string;
  aggregate: DashboardAggregate;
}) {
  const topThree = aggregate.problems.slice(0, 3);
  const insight = buildInsight(aggregate);

  return (
    <div className="mx-auto max-w-6xl px-5 py-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-teal">First-party results</p>
          <h1 className="mt-2 font-serif text-4xl tracking-tight text-ink sm:text-5xl">
            {site.name}
          </h1>
          <p className="mt-2 max-w-2xl text-muted">
            {label}. Counts stay aggregated, and any slice with fewer than {aggregate.k} events
            stays hidden.
          </p>
        </div>
        <a
          className="rounded-full bg-deep px-4 py-2 text-sm text-paper hover:bg-teal"
          href={`/api/export?site=${encodeURIComponent(site.id)}&range=${preset}`}
        >
          Export CSV
        </a>
      </div>

      <div className="mt-6 flex flex-wrap gap-2" role="navigation" aria-label="Date range">
        {[
          ["7", "7 days"],
          ["30", "30 days"],
          ["90", "90 days"],
          ["all", "All time"],
        ].map(([value, text]) => (
          <Link
            key={value}
            href={`/?site=${encodeURIComponent(site.id)}&range=${value}`}
            className={`rounded-full border px-3 py-1.5 text-sm ${
              preset === value
                ? "border-deep bg-deep text-paper"
                : "border-line bg-card text-ink hover:border-teal"
            }`}
            aria-current={preset === value ? "page" : undefined}
          >
            {text}
          </Link>
        ))}
      </div>

      {sites.length > 1 ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {sites.map((item) => (
            <Link
              key={item.id}
              href={`/?site=${encodeURIComponent(item.id)}&range=${preset}`}
              className={`rounded-full px-3 py-1 text-sm ${
                item.id === site.id ? "bg-teal text-paper" : "bg-card text-ink ring-1 ring-line"
              }`}
            >
              {item.name}
            </Link>
          ))}
        </div>
      ) : null}

      {aggregate.suppressed ? (
        <section className="mt-8 rounded-3xl bg-card p-8 shadow-card">
          <h2 className="font-serif text-3xl">Not enough scans yet</h2>
          <p className="mt-3 max-w-2xl text-muted">
            {aggregate.scanCount} scan{aggregate.scanCount === 1 ? "" : "s"} in this window.
            Aggregates appear after {aggregate.k} scans so a small group cannot be singled out.
            Run <code className="rounded bg-paper px-1">npm run seed</code> for the Northwind
            Beauty demo, or complete scans on the live demo page.
          </p>
        </section>
      ) : (
        <>
          <section className="mt-8 rounded-3xl bg-deep px-6 py-7 text-paper shadow-card sm:px-8">
            <p className="text-xs uppercase tracking-[0.18em] text-paper/60">Planning snapshot</p>
            <p className="mt-3 max-w-3xl font-serif text-3xl leading-tight sm:text-4xl">{insight}</p>
          </section>

          <section className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Stat label="Scans" value={String(aggregate.scanCount)} />
            <Stat
              label="Top concern"
              value={aggregate.topProblem?.label ?? "—"}
              detail={
                aggregate.topProblem
                  ? `${formatPercent(aggregate.topProblem.share)} of scans`
                  : "Hidden"
              }
            />
            <Stat label="Add to cart" value={formatPercent(aggregate.cartRate)} detail="of scans" />
            <Stat label="Checkout" value={formatPercent(aggregate.checkoutRate)} detail="of scans" />
          </section>

          <section className="mt-6 grid gap-4 lg:grid-cols-5">
            <article className="rounded-3xl bg-card p-5 shadow-card lg:col-span-3">
              <h2 className="font-serif text-2xl">Concern frequency</h2>
              <p className="mt-1 text-sm text-muted">
                A concern is a face-age problem score of 40 or higher. The collector sends keys,
                not photos.
              </p>
              <div className="mt-4">
                <ProblemChart rows={aggregate.problems} />
              </div>
              {aggregate.hiddenProblems > 0 ? (
                <p className="mt-2 text-sm text-muted">
                  {aggregate.hiddenProblems} concern{aggregate.hiddenProblems === 1 ? "" : "s"}{" "}
                  hidden below the privacy threshold.
                </p>
              ) : null}
            </article>
            <article className="rounded-3xl bg-card p-5 shadow-card lg:col-span-2">
              <h2 className="font-serif text-2xl">What to promote</h2>
              <p className="mt-1 text-sm text-muted">
                Start with the concerns shoppers already see in their results.
              </p>
              <ol className="mt-4 space-y-4">
                {topThree.map((problem, index) => (
                  <li key={problem.key} className="flex gap-3">
                    <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-paper font-serif text-deep">
                      {index + 1}
                    </span>
                    <div>
                      <p className="font-medium">
                        {problem.label}{" "}
                        <span className="text-muted">
                          {problem.count.toLocaleString("en-US")} scans
                        </span>
                      </p>
                      <p className="text-sm text-muted">
                        {isProblemKey(problem.key)
                          ? PROMOTION_HINTS[problem.key]
                          : "Match a product to this concern."}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            </article>
          </section>

          <section className="mt-4 grid gap-4 lg:grid-cols-2">
            <article className="rounded-3xl bg-card p-5 shadow-card">
              <h2 className="font-serif text-2xl">Skin-age distribution</h2>
              <p className="mt-1 text-sm text-muted">
                Skin age is stored only as a bucket. This is not a person&apos;s calendar age.
              </p>
              <div className="mt-4">
                <AgeChart rows={aggregate.ages} />
              </div>
              {aggregate.hiddenAges > 0 ? (
                <p className="mt-2 text-sm text-muted">
                  {aggregate.hiddenAges} age bucket{aggregate.hiddenAges === 1 ? "" : "s"} hidden.
                </p>
              ) : null}
            </article>
            <article className="rounded-3xl bg-card p-5 shadow-card">
              <h2 className="font-serif text-2xl">Skin health</h2>
              <p className="mt-1 text-sm text-muted">
                Percent rounded to the nearest 5, using the widget&apos;s skin-health reading.
              </p>
              <div className="mt-4">
                <HealthChart rows={aggregate.health} />
              </div>
            </article>
          </section>

          <section className="mt-4 grid gap-4 lg:grid-cols-5">
            <article className="rounded-3xl bg-card p-5 shadow-card lg:col-span-3">
              <h2 className="font-serif text-2xl">Scan funnel</h2>
              <p className="mt-1 text-sm text-muted">
                Scan, then product view, add to cart, and checkout. Product clicks in this window:{" "}
                {aggregate.productClickCount == null ? "hidden" : aggregate.productClickCount}.
              </p>
              <Funnel steps={aggregate.funnel} />
            </article>
            <article className="rounded-3xl bg-card p-5 shadow-card lg:col-span-2">
              <h2 className="font-serif text-2xl">Language</h2>
              <p className="mt-1 text-sm text-muted">Widget language code only. No names or emails.</p>
              <table className="mt-4 w-full text-left text-sm">
                <thead>
                  <tr className="text-muted">
                    <th className="pb-2 font-medium">Code</th>
                    <th className="pb-2 font-medium">Scans</th>
                    <th className="pb-2 font-medium">Share</th>
                  </tr>
                </thead>
                <tbody>
                  {aggregate.languages.map((row) => (
                    <tr key={row.key} className="border-t border-line">
                      <td className="py-2">{row.label}</td>
                      <td className="py-2">{row.count}</td>
                      <td className="py-2">{formatPercent(row.share)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {aggregate.hiddenLanguages > 0 ? (
                <p className="mt-3 text-sm text-muted">
                  {aggregate.hiddenLanguages} language{aggregate.hiddenLanguages === 1 ? "" : "s"}{" "}
                  hidden because fewer than {aggregate.k} scans used them.
                </p>
              ) : null}
            </article>
          </section>
        </>
      )}
    </div>
  );
}

function Stat({ label, value, detail }: { label: string; value: string; detail?: string }) {
  return (
    <article className="rounded-3xl bg-card px-5 py-4 shadow-card">
      <p className="text-xs uppercase tracking-[0.16em] text-muted">{label}</p>
      <p className="mt-2 font-serif text-3xl tracking-tight">{value}</p>
      {detail ? <p className="text-sm text-muted">{detail}</p> : null}
    </article>
  );
}

function Funnel({ steps }: { steps: FunnelRow[] }) {
  const max = steps.find((step) => step.count != null)?.count || 1;
  return (
    <ol className="mt-5 space-y-3">
      {steps.map((step) => {
        const width = step.count == null ? 8 : Math.max(8, (step.count / max) * 100);
        return (
          <li key={step.stage}>
            <div className="mb-1 flex items-baseline justify-between gap-3 text-sm">
              <span className="font-medium">{step.label}</span>
              <span className="text-muted">
                {step.count == null ? "Hidden" : step.count.toLocaleString("en-US")}
                {step.rate != null ? ` · ${formatPercent(step.rate)}` : ""}
              </span>
            </div>
            <div className="h-3 rounded-full bg-paper">
              <div
                className="h-3 rounded-full bg-teal"
                style={{ width: `${width}%` }}
                role="presentation"
              />
            </div>
          </li>
        );
      })}
    </ol>
  );
}

function buildInsight(aggregate: DashboardAggregate): string {
  if (!aggregate.topProblem || aggregate.cartRate == null) {
    return "There are enough scans to look around, but the headline slices are still hidden.";
  }
  return `${aggregate.topProblem.label} is the top concern, in ${formatPercent(aggregate.topProblem.share)} of scans. ${formatPercent(aggregate.cartRate)} of scans lead to add-to-cart.`;
}
