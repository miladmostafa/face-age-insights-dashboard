# Face Age Insights Dashboard: anonymized skin-scan analytics for the face-age widget

Face Age Insights is an open-source Next.js dashboard for brands and agencies using the [face-age](https://www.npmjs.com/package/face-age) skin analysis widget from [Face Age](https://getfaceage.com). A small collector sits next to the embed. After each completed scan it sends anonymized concern keys, a skin-age bucket, skin health, and the widget language to an API you host. Add-to-cart and checkout clicks are counted on the same funnel, so a marketing lead can see which skin concerns show up most and what share of scans reach the cart.

![Face Age Insights dashboard showing acne as the top concern and an 18 percent add-to-cart rate](docs/dashboard-overview.png)

## Features

- Collector snippet that listens to the real face-age widget, with no extra runtime dependencies
- Ingest API validated with Zod, scoped by a per-site write key, with CORS and rate limiting
- Charts for concern frequency, skin-age buckets, skin health, and the scan → product view → cart → checkout funnel
- CSV export of the same aggregates
- k-anonymity threshold so small slices stay hidden
- Seeded Northwind Beauty demo (acne leads, and 18% of scans add to cart)
- SQLite by default, Postgres when `DATABASE_URL` is a Postgres connection string
- Dockerfile and Docker Compose

## How it works

1. A brand adds `#FaceAge-module` to the page and renders the [face-age](https://www.npmjs.com/package/face-age) widget with `new FaceAge(options).render()`. The widget creates its own internal iframe. Do not wrap the module in another iframe.
2. The collector calls `API.getAdvisorData()` and the public events `onDisplayProducts`, `onClickProduct`, `onAddToCart`, and `onCheckout`.
3. On a completed scan it posts concern keys, a skin-age bucket, skin health, and language. Funnel events are counts only.
4. The dashboard aggregates those events. In the seeded demo, acne is the top concern and 18% of scans lead to add-to-cart, which is enough to decide which products to feature.

The collector was checked against **face-age 2.4.13**. In that release, `API.getAdvisorData(callback)` receives `{ analysis, activeSelections }`, and `analysis` is the problems array (`key`, `title`, `number`, and related display fields). It does not include skin age. `skinAge` and `damagePercentage` are on the analysis object the widget already holds in memory. The collector reads those two numbers when they are present, converts skin age to a bucket and damage into the widget's skin-health percent, and never sends the photo, quiz answers, product ids, or exact age. If a later release puts `skinAge` on `analysis` itself, the collector uses that public field first.

## Quick start

Clone the repository and install dependencies:

```bash
git clone https://github.com/miladmostafa/face-age-insights-dashboard.git
cd face-age-insights-dashboard
npm install
```

Install the latest face-age widget:

```bash
npm install face-age@latest
```

Copy the environment file, then seed the demo and start the app:

```bash
cp .env.example .env
npm run seed
npm run dev
```

Open the dashboard at [http://localhost:3000](http://localhost:3000) and the live widget at [http://localhost:3000/demo](http://localhost:3000/demo).

![Skin-age distribution and scan-to-checkout funnel on the insights dashboard](docs/dashboard-funnel.png)

## Configuration

| Variable | Purpose |
| --- | --- |
| `FACEAGE_CLIENT_ID` | Client ID for the live demo widget. Leave empty to show setup instructions instead of the widget. |
| `DEMO_WRITE_KEY` | Write key for the seeded site. Leave empty and `npm run seed` will generate one. |
| `DATABASE_URL` | `file:./data/insights.db` (SQLite) or a `postgres://` / `postgresql://` URL. |
| `K_ANONYMITY` | Minimum events before a slice is shown. Default `5`. |
| `CONCERN_THRESHOLD` | Problem score (0–100) that counts as a concern. Default `40`. |
| `DASHBOARD_TOKEN` | Optional password for the dashboard and CSV export. |

### Face Age Client ID

The live demo embeds the real widget, so it needs a Client ID (`faceageId`).

1. Create an account at [panel.getfaceage.com](https://panel.getfaceage.com/).
2. Copy the Client ID from the panel.
3. Set `FACEAGE_CLIENT_ID` in `.env` (this file is gitignored). Do not commit the ID.
4. Restart `npm run dev`.

If `FACEAGE_CLIENT_ID` is empty, `/demo` explains how to set it and links to the panel. Seeded dashboard charts do not need a Client ID.

### Collector snippet

Serve `collector/face-age-insights.js` from this app (the dev and production builds also publish it at `/collector/face-age-insights.js`) or copy the file onto the brand site.

```html
<div id="FaceAge-module"></div>
<script src="https://cdn.jsdelivr.net/npm/face-age@latest/dist/faceage.js"></script>
<script src="https://your-dashboard.example/collector/face-age-insights.js"></script>
<script>
  var widget = new FaceAge({
    elementId: "FaceAge-module",
    faceageId: "YOUR_CLIENT_ID",
    language: "en",
    showProducts: true,
    showAddToCard: true,
  });
  widget.render();
  FaceAgeInsights.attach(widget, {
    endpoint: "https://your-dashboard.example/api/ingest",
    writeKey: "YOUR_WRITE_KEY",
    language: "en",
  });
</script>
```

`npm run seed` prints the demo write key and saves it to `data/demo-write-key.txt`. Create extra sites by inserting a row whose `write_key_hash` is the SHA-256 hex digest of the key you give that site. Set `allowed_origins` to a comma-separated list, or `*` while you are testing.

### Postgres

```bash
docker compose --profile postgres up -d postgres
DATABASE_URL=postgres://insights:insights@localhost:5432/insights npm run seed
DATABASE_URL=postgres://insights:insights@localhost:5432/insights npm run dev
```

### Docker

```bash
FACEAGE_CLIENT_ID=your-client-id DEMO_WRITE_KEY=your-write-key docker compose up --build
```

The app container uses SQLite on a named volume and seeds demo data on startup when the database is empty.

## Privacy

- No photos, emails, names, or exact skin ages are stored. Skin age is bucketed before it is written. Skin health is rounded to the nearest 5 percent.
- Quiz answers and product ids from the widget are ignored.
- Shoppers can opt out in the demo, or a site can call `FaceAgeInsights.optOut()`. The scanner keeps working.
- Any chart slice, funnel step, or CSV row with fewer than `K_ANONYMITY` events is omitted.
- The ingest route is write-only. Set `DASHBOARD_TOKEN` before exposing the dashboard on a public host.

A longer disclosure is on the in-app Privacy page.

## FAQ

**Does this store facial photos?**  
No. The face-age widget sends photos to Face Age for analysis. This project never reads `API.getImage()` and rejects image payloads at the API.

**Do I need a Client ID to view the charts?**  
No. `npm run seed` loads a fictional shop, Northwind Beauty. The Client ID is only for the live widget on `/demo`.

**Where do I get a Client ID?**  
From [panel.getfaceage.com](https://panel.getfaceage.com/). Put it in `FACEAGE_CLIENT_ID`.

**Why is a language or age bucket missing?**  
It had fewer events than `K_ANONYMITY`. The seeded data hides a language used only three times when the threshold is 5.

**What counts as a concern?**  
A face-age problem whose score is at least `CONCERN_THRESHOLD` (40 by default). Frequency is the share of scans with that concern.

**Can I use Postgres instead of SQLite?**  
Yes. Set `DATABASE_URL` to a `postgres://` or `postgresql://` connection string. Tables are created on first use.

**How is this different from the widget's Google Analytics events?**  
face-age can already emit GA and Meta Pixel events. This dashboard is a first-party store you host, with a write key, an anonymization step, and a k-anonymity check before anything is shown.

## Screenshots

![Overview of anonymized skin concerns and headline conversion stats](docs/dashboard-overview.png)

![Funnel from skin scan to checkout, with skin-age buckets](docs/dashboard-funnel.png)

![Live demo page with the face-age widget mounted in the page](docs/demo-widget.png)

## Development

```bash
npm test
npm run lint
npm run typecheck
npm run build
npm run smoke
```

## License

MIT. See [LICENSE](LICENSE).

The face-age widget is a separate package. Its license and terms are on [npm](https://www.npmjs.com/package/face-age) and [getfaceage.com](https://getfaceage.com).
