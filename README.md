# Current Bill Calculator

A fast, no-signup, mobile-first static site that calculates and explains Indian household electricity bills, starting with
BESCOM (Bengaluru), FY2026-27. Built with Astro and TypeScript. There is no backend. Rates live in JSON files, so you
update the site by editing data, not code.

The full spec is in [PLAN.md](PLAN.md).

## Run it

Requires Node 22.12+ (see `.nvmrc`).

```sh
npm install
npm run dev        # http://localhost:4321
npm run build      # static site in dist/
npm run preview    # serve dist/ locally
```

## Test it

```sh
npm test           # Vitest: calculation, schema, URL state, real bills
npm run test:e2e   # Playwright: calculator page on a mobile viewport (first time: npx playwright install chromium)
npm run check      # astro check && vitest run && astro build (run this before every deploy)
npm run og         # re-render public/og.png from scripts/og-image.html
```

## Where things are

| Path | What it is |
|---|---|
| `src/data/tariffs/karnataka/bescom.json` | BESCOM tariff. The single source of truth for every rate on the site |
| `src/data/fppca/bescom.json` | Monthly FPPCA values (paise per unit) |
| `src/data/companies.json` | States and companies (only enabled ones get pages) |
| `src/lib/schema.ts` | zod schema. The build fails if a data file is invalid |
| `src/lib/calculate.ts` | Pure bill calculation `calculate(tariff, input, fppca)` |
| `src/components/Calculator.astro` + `calculator.ts` | Calculator UI and its small browser script (~5 KB gzipped) |
| `src/pages/karnataka/bescom-bill-for-[units]-units.astro` | Programmatic pages, one per value in `exampleUnits` |
| `src/site.ts` | Site name, contact email, routes |
| `astro.config.mjs` | **`site`: the production URL** |
| `public/_headers` | Cloudflare caching and security headers |

Fields added beyond the PLAN.md data example: `stateSlug`, `gruhaJyothi.coveredLines` (which bill lines the subsidy pays),
`exampleUnits` (the N-units page list) and `lastVerifiedOn` on the FPPCA file.

## Routine updates

**New FPPCA month:** add a line to `src/data/fppca/bescom.json`, e.g. `"2026-06": 31`. The calculator default, the FPPCA
table and every worked example update automatically. Run `npm run check`, then push.

**New tariff year:** update the rates in `bescom.json`, move the old year into `history`, and update `financialYear`,
`effectiveFrom` and `effectiveTo`. If the year in the rate page URL changes, rename
`src/pages/karnataka/bescom-per-unit-rate-2026.astro`, update `ROUTES.bescomRate` in `src/site.ts`, and add a redirect in
`public/_redirects` (`/karnataka/bescom-per-unit-rate-2026/ /karnataka/bescom-per-unit-rate-2027/ 301`).

**More "N units" pages:** edit `exampleUnits` in `bescom.json`.

## Add a new electricity company

1. Create `src/data/tariffs/<state>/<company>.json` (copy `bescom.json`; it must pass `TariffSchema`) and
   `src/data/fppca/<company>.json`.
2. Set `enabled: true` for it in `src/data/companies.json` and add the state if it is new.
3. Load and validate it in `src/lib/data.ts`, like `bescom`.
4. Add pages under `src/pages/<state>/`. The BESCOM pages are the template: they only read from the data, so copying them
   and swapping the import is enough. Add the routes to `src/site.ts`.
5. Add real-bill fixtures for the company and keep `verified: false` until they pass.

Each company gets its own data file, because charges such as the true-up differ between companies.

## Before launch

- [ ] Set `site` in `astro.config.mjs` to your real URL (see Deploy, step 4).
- [ ] Set `contactEmail` in `src/site.ts`, so people can report mistakes.
- [ ] Review the "Who builds it" text in `src/pages/about.astro`.

## Human verification checklist

These can't be automated. Until they are all done, every page shows the "being verified" banner.

- [ ] Download the official KERC tariff order PDF. Confirm ₹5.80/unit, ₹150/kW/month and the 35 paise P&G surcharge
      for FY2026-27 domestic. Add the official URL to `sources` (it becomes a link automatically).
- [ ] Confirm the exact base the 9% electricity tax applies to (`electricityTax.appliesTo`).
- [ ] Confirm the FPPCA monthly values from an official BESCOM/KERC notice. Add the latest months and set `source` to the URL.
- [ ] Confirm how the FY25 true-up appears on the bill.
- [ ] Confirm the Gruha Jyothi over-limit rule (`overLimitRule`) and whether it covers fixed charges (`coveredLines`).
- [ ] Confirm the eligible-units rule. The data uses "FY2022-23 average + 10%, max 200". Some 2024 reports describe a
      flat +10 units for low-usage homes instead. If that applies, the rule in `gruhaJyothiEligibleUnits` needs an update.
- [ ] Add 5–10 real bills to `tests/fixtures/real-bills.json` (remove names and account IDs) and get them passing (±₹1).
- [ ] Set `verified: true` and `lastVerifiedOn` in both data files.

## Deploy (Cloudflare Pages, free)

1. **Push to GitHub.** Create an empty repository on github.com, then:
   ```sh
   git add -A && git commit -m "Initial site"
   git branch -M main
   git remote add origin https://github.com/<you>/<repo>.git
   git push -u origin main
   ```
2. **Connect Cloudflare.** In the Cloudflare dashboard, go to **Workers & Pages → Create → Pages → Connect to Git** and
   pick the repository.
3. **Build settings:** Framework preset *Astro*, build command `npm run build`, output directory `dist`. Node comes from
   `.nvmrc`. No environment variables are needed.
4. **Set the URL.** The project name becomes `https://<project-name>.pages.dev`. Put that exact URL in `site` in
   `astro.config.mjs`, commit and push. Every push to `main` redeploys automatically. Canonical tags, the sitemap and
   robots.txt all depend on this value.
5. **Analytics.** In the Pages project, open **Metrics → Web Analytics → Enable**. It uses no cookies, so no banner is
   needed, and `_headers` already allows its script.
6. **Check it live:** `/robots.txt`, `/sitemap-index.xml`, and a shared link such as
   `/karnataka/bescom-bill-calculator/?units=250&kw=2` should all work.

Alternative without GitHub: `npm run build && npx wrangler pages deploy dist` (it asks you to log in to Cloudflare once).

**Custom domain:** PLAN.md says to add a domain later. If you already know you will buy one (a short `.in` costs about
₹500–900 a year), buy it **before** submitting to Google. A domain move after Google has indexed the site costs weeks of
rankings. To add it: Pages project → **Custom domains → Set up a domain**. Then update `site` and add a redirect from
`pages.dev`.

## Getting traffic

Search is the main channel: people search "bescom bill calculator", "bescom bill for 200 units", "gruha jyothi
calculator" every month. Social and community posts help Google find the site and send the first visitors.

**Week 1: get indexed**
1. **Google Search Console**: add the site and verify it (DNS record if you have a domain; otherwise the HTML-tag
   method). Submit `sitemap-index.xml`. Use **URL Inspection → Request indexing** on the 8 main pages: home, Karnataka,
   calculator, rate, Gruha Jyothi, FPPCA, how-to-read and the 200-units page.
2. **Bing Webmaster Tools**: choose "Import from Google Search Console". Bing also feeds DuckDuckGo and several AI search
   tools.
3. If the domain's DNS is on Cloudflare, turn on **Caching → Configuration → Crawler Hints**. It notifies search engines
   through IndexNow whenever pages change.

**Weeks 1–4: first visitors and links**
- **WhatsApp**: the share button is built in. Post a link in your apartment, RWA or office groups, framed as "this
  shows why your bill is what it is", not as an ad.
- **Reddit r/bangalore and r/karnataka**: read each subreddit's self-promotion rules first. Posts that help people do
  well, e.g. "BESCOM bills changed to a flat ₹5.80/unit; I made a free calculator that shows every line, including the
  true-up charge". Reply to questions in the comments.
- **X/Twitter**: people post photos of BESCOM bills whenever tariffs or FPPCA change. Reply with a prefilled link for
  their units (`?units=N`) only where it actually answers their question.
- **Quora** and apartment-app community boards (MyGate, NoBrokerHood): answer "how to calculate BESCOM bill"
  questions with a short explanation and the link.
- **Local media and civic blogs** (Citizen Matters Bengaluru, for example): pitch the story "online calculators still
  use old slab rates". One link from a local news site counts for more than many directory links.

**Every month: stay fresh**
- When the new FPPCA value is published, add it to the data file and redeploy. Then post the update ("BESCOM FPPCA
  for <month>: X paise, here's what it adds to a 200-unit bill"). These news moments bring repeat search traffic.
- Finish the verification checklist and remove the banner. Accuracy is this site's edge, and "verified on <date>"
  builds trust.

**Months 2–3: grow what works** (see PLAN.md §13–14)
- In Search Console, open **Performance**. Find queries with many impressions and few clicks; improve those pages'
  titles, or add a page for the query (e.g. a new units value).
- Kannada versions of the calculator and Gruha Jyothi pages. Few sites cover these searches in Kannada, so they are
  easier to rank for.
- Next companies: MESCOM, HESCOM, GESCOM and CESC. Each one brings a new set of searches.

**Expect:** a new site usually needs 4–12 weeks before Google ranks it for anything competitive. Judge progress at 8 weeks
by Search Console *impressions*, as PLAN.md §14 suggests, not by visitors in the first fortnight.
