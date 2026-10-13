import Link from "next/link";

const LINKS = [
  { href: "/", id: "dashboard", label: "Dashboard" },
  { href: "/demo", id: "demo", label: "Live demo" },
  { href: "/privacy", id: "privacy", label: "Privacy" },
] as const;

export function SiteHeader({ current }: { current: (typeof LINKS)[number]["id"] }) {
  return (
    <header className="border-b border-white/10 bg-deep text-paper">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-5 py-4">
        <Link href="/" className="group">
          <span className="block font-serif text-xl tracking-tight">Face Age Insights</span>
          <span className="block text-xs uppercase tracking-[0.16em] text-paper/70">
            Anonymized skin-scan analytics
          </span>
        </Link>
        <nav className="flex flex-wrap gap-2 text-sm" aria-label="Primary">
          {LINKS.map((link) => {
            const active = link.id === current;
            return (
              <Link
                key={link.id}
                href={link.href}
                aria-current={active ? "page" : undefined}
                className={`rounded-full px-3 py-1.5 ${
                  active ? "bg-paper text-deep" : "text-paper/85 hover:bg-white/10"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="mx-auto max-w-6xl px-5 py-10 text-sm text-muted">
      <p>
        Built for the{" "}
        <a className="underline decoration-line underline-offset-2" href="https://getfaceage.com">
          Face Age
        </a>{" "}
        browser widget (
        <a
          className="underline decoration-line underline-offset-2"
          href="https://www.npmjs.com/package/face-age"
        >
          face-age on npm
        </a>
        ). Photos are analyzed by Face Age and are not sent to this dashboard.
      </p>
    </footer>
  );
}
