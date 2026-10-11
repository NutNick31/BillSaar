# plan.md — Electricity Bill Calculator (Karnataka / BESCOM first)

> Hand this file to Claude Code. It is the full build spec for the MVP.
> Goal: a fast, accurate, no-signup, mobile-first static website that calculates and explains Indian electricity bills, starting with BESCOM (Bengaluru), built so more electricity companies and states can be added later by adding data, not code.

---

## 1. Product summary

**Problem:** People in Bengaluru want to know "how much will my bill be?" and "why is my bill this amount?". The calculators that rank today disagree with each other and many use outdated slab rates. FY2026-27 is a flat per-unit rate, plus a fixed charge, a surcharge, tax, a monthly fuel adjustment (FPPCA) and a temporary true-up charge.

**Our edge:** accuracy and transparency. Every number comes from a dated official source shown on the page, and every line of the bill is explained.

**Target user:** a household in Karnataka, on a phone, holding their bill or meter reading.

**Non-goals for MVP:** user accounts, databases, payments, bill payment, scraping the electricity company's website, commercial or industrial tariffs.

---

## 2. Tech stack (keep it simple)

| Concern | Choice | Why |
|---|---|---|
| Site generator | **Astro** (latest stable), static output (`output: 'static'`) | Generates one HTML page per data entry; ships almost no JS |
| Language | **TypeScript** (strict) | Calculation logic must be typed and tested |
| Interactivity | Astro island with **vanilla TS** (or Preact if needed) for the calculator only | Small bundle, fast on cheap Android phones |
| Styling | Plain CSS with CSS variables (light/dark), no CSS framework | Small and fast |
| Tests | **Vitest** for calculation logic; **Playwright** smoke test for the calculator page | The calculator is the product; it must be correct |
| Hosting | **Cloudflare Pages** (free plan) | Unlimited static bandwidth, 500 builds/month |
| Analytics | Cloudflare Web Analytics (free, no cookies) | Privacy-friendly; no cookie banner needed |
| Package manager | npm | Default |

No backend, no database, no environment secrets.

---

## 3. Repository structure

```
/
├─ plan.md
├─ README.md                  # how to run, test, add a new electricity company
├─ astro.config.mjs           # set `site` to the production URL (placeholder for now)
├─ package.json
├─ tsconfig.json
├─ public/
│  ├─ favicon.svg
│  ├─ robots.txt
│  └─ _headers                # Cloudflare caching/security headers
├─ src/
│  ├─ data/
│  │  ├─ tariffs/
│  │  │  └─ karnataka/
│  │  │     └─ bescom.json    # tariff data, single source of truth
│  │  ├─ fppca/
│  │  │  └─ bescom.json       # monthly FPPCA paise/unit values
│  │  └─ companies.json       # list of states + companies (only BESCOM enabled in MVP)
│  ├─ lib/
│  │  ├─ types.ts             # Tariff, BillInput, BillLine, BillResult types
│  │  ├─ calculate.ts         # pure function: (tariff, input) => BillResult
│  │  ├─ format.ts            # ₹ formatting (en-IN), rounding helpers
│  │  └─ url-state.ts         # read/write inputs to the URL query string
│  ├─ components/
│  │  ├─ Calculator.astro     # wrapper + island
│  │  ├─ calculator.ts        # client-side logic (instant recalculation)
│  │  ├─ BillBreakdown.astro  # line-by-line table
│  │  ├─ SourceBox.astro      # "Source: <order>, last verified <date>" + link
│  │  ├─ UnverifiedBanner.astro
│  │  ├─ FAQ.astro            # renders FAQ + FAQPage JSON-LD
│  │  ├─ Breadcrumbs.astro
│  │  └─ RelatedLinks.astro
│  ├─ layouts/
│  │  └─ Base.astro           # <head>, meta, canonical, OG tags, theme, footer
│  ├─ pages/
│  │  ├─ index.astro
│  │  ├─ about.astro
│  │  ├─ karnataka/
│  │  │  ├─ index.astro
│  │  │  ├─ bescom-bill-calculator.astro
│  │  │  ├─ bescom-per-unit-rate-2026.astro
│  │  │  ├─ bescom-bill-for-[units]-units.astro   # programmatic pages
│  │  │  ├─ gruha-jyothi-free-units-calculator.astro
│  │  │  ├─ how-to-read-bescom-bill.astro
│  │  │  └─ what-is-fppca-true-up-charge.astro
│  │  ├─ sitemap.xml.ts (or use @astrojs/sitemap)
│  │  └─ 404.astro
│  └─ styles/global.css
└─ tests/
   ├─ calculate.test.ts
   ├─ real-bills.test.ts      # fixtures from real bills (see §9)
   ├─ fixtures/real-bills.json
   └─ e2e/calculator.spec.ts
```

---

## 4. Tariff data (single source of truth)

All rates live in JSON. **No rate is ever hard-coded in components or page text.** Pages read values from the data so that updating one file updates the whole site.

### 4.1 `src/data/tariffs/karnataka/bescom.json` (MVP content)

```json
{
  "company": "BESCOM",
  "companyFullName": "Bangalore Electricity Supply Company Limited",
  "state": "Karnataka",
  "slug": "bescom",
  "category": "domestic",
  "financialYear": "2026-27",
  "effectiveFrom": "2026-04-01",
  "effectiveTo": "2027-03-31",
  "verified": false,
  "lastVerifiedOn": null,
  "sources": [
    {
      "title": "KERC Multi-Year Tariff Order (27 March 2025)",
      "url": "TODO: link to the official KERC PDF",
      "note": "Flat energy charge and fixed charges for FY2025-26 to FY2027-28"
    }
  ],
  "energyCharge": { "type": "flat", "ratePerUnit": 5.80 },
  "fixedCharge": { "perKwPerMonth": 150.00 },
  "pensionGratuitySurcharge": { "ratePerUnit": 0.35 },
  "electricityTax": {
    "percent": 9,
    "appliesTo": ["energy", "fixed"],
    "note": "TODO verify exact tax base against the KERC order / a real bill"
  },
  "fppca": { "source": "fppca/bescom.json", "userOverridable": true },
  "trueUp": {
    "label": "FY25 True-Up Charges",
    "activeFrom": "2026-05",
    "activeTo": "2027-04",
    "householdSpecific": true,
    "note": "Amount depends on each household's FY2024-25 usage; the user enters it from their bill"
  },
  "gruhaJyothi": {
    "enabled": true,
    "maxFreeUnits": 200,
    "bufferPercent": 10,
    "baselineDescription": "Average monthly consumption in FY2022-23 plus 10%, capped at 200 units",
    "overLimitRule": "pay_excess_units_only",
    "note": "TODO verify how charges are applied when usage exceeds the eligible limit, and whether fixed charges are covered"
  },
  "history": [
    { "financialYear": "2025-26", "energyRatePerUnit": 5.80, "fixedPerKw": 145.00 },
    { "financialYear": "2027-28", "energyRatePerUnit": 5.75, "fixedPerKw": 160.00 }
  ]
}
```

### 4.2 `src/data/fppca/bescom.json`

```json
{
  "unit": "paise_per_unit",
  "verified": false,
  "source": "TODO: official KERC/BESCOM FPPCA notification (secondary source currently: billunits.in)",
  "months": {
    "2026-01": 39,
    "2026-02": 24,
    "2026-03": 44,
    "2026-04": 47,
    "2026-05": 25
  }
}
```

The calculator defaults to the latest available month and lets the user pick a month or type their own value.

### 4.3 Data rules
- Validate all JSON at build time with a schema (zod). The build **fails** if a required field is missing.
- If `verified` is `false`, every page using that data shows `UnverifiedBanner`: "These rates are being verified against the official order. Check against your bill."
- `lastVerifiedOn` is shown in `SourceBox` on every page.

---

## 5. Calculation logic (`src/lib/calculate.ts`)

A pure, deterministic function with no DOM access, fully unit-tested.

### 5.1 Input

```ts
type BillInput = {
  units?: number;            // kWh used this month; OR provide the two readings
  previousReading?: number;
  currentReading?: number;
  sanctionedLoadKw: number;  // default 1
  fppcaPaisePerUnit?: number;// default: latest month from data
  trueUpAmount?: number;     // ₹ from the user's bill; default 0
  gruhaJyothi: {
    enrolled: boolean;       // default false
    eligibleUnits?: number;  // from the bill; clamp to 0..200
  };
  billingMonth?: string;     // "YYYY-MM"
};
```

### 5.2 Steps
1. `units = units ?? (currentReading - previousReading)`. Reject negative or non-numeric values with a friendly error.
2. `energy = units × energyCharge.ratePerUnit`
3. `fixed = sanctionedLoadKw × fixedCharge.perKwPerMonth`
4. `pgSurcharge = units × pensionGratuitySurcharge.ratePerUnit`
5. `fppca = units × fppcaPaisePerUnit / 100`
6. `tax = (sum of lines listed in electricityTax.appliesTo) × percent / 100`
7. `trueUp = trueUpAmount`
8. `gross = energy + fixed + pgSurcharge + fppca + tax + trueUp`
9. Gruha Jyothi (if enrolled):
   - if `units ≤ eligibleUnits` → subsidy = full bill per configured rule (bill shows ₹0 payable for covered lines)
   - else → user pays only for `units − eligibleUnits`; recompute the per-unit lines on the excess units
   - Implement behind the `overLimitRule` config so it can change without code edits.
10. `payable = gross − subsidy`, rounded to the nearest rupee (keep paise in each line, round only the total).

### 5.3 Output

```ts
type BillLine = { key: string; label: string; formula: string; amount: number; explanation: string };
type BillResult = { units: number; lines: BillLine[]; subsidy: number; payable: number; warnings: string[] };
```

Each line carries a human-readable `formula` string, e.g. `"250 units × ₹5.80"`, shown in the UI.

Warnings include: units > 200 with Gruha Jyothi on (not eligible), true-up left empty during its active months, unverified data.

---

## 6. Pages and content

Every page has: unique `<title>` and meta description, canonical URL, breadcrumbs, H1, the tool or a worked example **above the fold**, a short plain-language explanation, an FAQ (with FAQPage JSON-LD), `SourceBox`, and related links. All rupee figures on content pages are **computed from the data at build time**, never typed by hand.

| Route | Purpose | Target search |
|---|---|---|
| `/` | Pick state/company → calculator; short intro; link to BESCOM | "electricity bill calculator india" |
| `/karnataka/` | List Karnataka companies (only BESCOM live; others "coming soon", not linked) | "electricity bill calculator karnataka" |
| `/karnataka/bescom-bill-calculator` | **Main tool page** | "bescom bill calculator" |
| `/karnataka/bescom-per-unit-rate-2026` | Current rate table, every component, previous and next year from `history` | "bescom per unit rate" |
| `/karnataka/bescom-bill-for-[units]-units` | Programmatic worked examples | "bescom bill for 200 units" |
| `/karnataka/gruha-jyothi-free-units-calculator` | Eligible-units check: baseline × 1.1, capped at 200; "am I over this month?" | "gruha jyothi calculator" |
| `/karnataka/how-to-read-bescom-bill` | Each bill line explained (labelled list; add an annotated sample bill image later) | "how to read bescom bill" |
| `/karnataka/what-is-fppca-true-up-charge` | What FPPCA and the FY25 true-up are, why they change, the monthly FPPCA table | "fppca charges bescom" |
| `/about` | Who built it, how data is verified, contact email, disclaimer | — |
| `/404` | Links back to the calculator | — |

### 6.1 Programmatic "N units" pages
- Generate for units: `50, 75, 100, 120, 150, 175, 200, 250, 300, 350, 400, 500` (from a list in data, easy to change).
- Each page shows: the full breakdown for N units at 1 kW and 2 kW, the same with and without Gruha Jyothi, a comparison with the neighbouring values in the list, and a prefilled calculator link (`?units=N`).
- These must be genuinely different, useful pages. **Do not** generate thin or duplicate filler text.

### 6.2 Required disclaimer (footer, every page)
"This is an estimate based on the published tariff. Your actual bill may differ. Always check your official BESCOM bill. Not affiliated with BESCOM or KERC."

---

## 7. Calculator UX

- **Mobile-first.** Large numeric inputs (`inputmode="decimal"`), one column on phones.
- **Two input modes:** "Units used" (default) or "Meter readings (previous / current)".
- **Instant results** as the user types; no "Calculate" button needed.
- **Total payable** displayed large at the top of the results; breakdown table below with formula and a one-line explanation per row (expand for more).
- "Advanced" collapsible section: sanctioned load (default 1 kW), FPPCA month or custom value, true-up amount, Gruha Jyothi toggle and eligible units.
- **Shareable URL:** inputs sync to the query string (`?units=250&kw=2&gj=1&gju=150`). Add a "Copy link" and a "Share on WhatsApp" button (`https://wa.me/?text=...`).
- Validation messages in plain language next to the field.
- Light/dark theme following the system, with a toggle.
- Accessibility: proper `<label>`s, visible focus, WCAG AA contrast, results area `aria-live="polite"`.
- No pop-ups, no signup, no cookie banner, no ads in MVP.
- The page must work without JS by showing a worked example (progressive enhancement); the calculator activates with JS.

---

## 8. SEO and performance requirements

- `@astrojs/sitemap` → `sitemap.xml`; `robots.txt` pointing to it.
- JSON-LD: `WebApplication` on calculator pages, `FAQPage` on pages with an FAQ, `BreadcrumbList` everywhere.
- Open Graph and Twitter meta tags; a simple generated OG image (static SVG/PNG is fine).
- Internal linking: every N-units page links to the main calculator, the rate page, and its neighbours.
- `lang="en-IN"`; ₹ formatted with `Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' })`.
- Performance budget: Lighthouse mobile **≥ 95** in Performance, Accessibility, Best Practices and SEO. JS on the calculator page **< 30 KB** gzipped. No web fonts (system font stack).
- `public/_headers`: long cache for hashed assets, short cache for HTML, basic security headers (`X-Content-Type-Options`, `Referrer-Policy`, a CSP allowing Cloudflare analytics).

---

## 9. Testing

1. **Unit tests (Vitest)** for `calculate.ts`:
   - 0 units, 1 unit, 100, 200, 201, 500 units
   - meter readings mode, including current < previous (error)
   - 1 kW vs 3 kW fixed charge
   - FPPCA default vs override
   - Gruha Jyothi: under limit, exactly at limit, over limit, units > 200
   - true-up amount added correctly
   - rounding: lines keep paise, total rounded to the rupee
2. **Real-bill tests:** `tests/fixtures/real-bills.json` holds 5–10 real BESCOM bills (units, kW, FPPCA, true-up, Gruha Jyothi, printed total). The test asserts our total is within ±₹1 of the printed total. Start with placeholder fixtures and a clear `TODO: add real bills` so the human owner fills them in. **The site should not be marked `verified: true` until these pass.**
3. **Schema test:** all data files pass the zod schema.
4. **E2E (Playwright):** load the calculator, type 250 units, see a total; change kW, total updates; URL contains the inputs; reload restores them.
5. CI command: `npm run check` = `astro check && vitest run && astro build`.

---

## 10. Deployment (Cloudflare Pages, free)

1. Push the repo to GitHub.
2. Cloudflare dashboard → Workers & Pages → Create → Pages → connect the GitHub repo.
3. Build command `npm run build`, output directory `dist`, Node version via `.nvmrc` (current LTS).
4. Launch on the free `*.pages.dev` subdomain first. Set `site` in `astro.config.mjs` to that URL.
5. Enable Cloudflare Web Analytics for the project.
6. After launch: add the site to **Google Search Console** and **Bing Webmaster Tools**, submit `sitemap.xml`, and request indexing for the main pages.
7. Later (once impressions appear): buy a short `.in` domain, add it in Cloudflare Pages, and redirect `pages.dev` to it. Change domains only once.

Document all of this in `README.md`.

---

## 11. Human verification checklist (must be done before calling the data "verified")

Claude Code cannot do these; leave them as a checklist in `README.md`:

- [ ] Download the official KERC tariff order PDF; confirm ₹5.80/unit, ₹150/kW/month, 35 paise P&G surcharge for FY2026-27 domestic; add the official URL to `sources`.
- [ ] Confirm the exact base the 9% electricity tax applies to.
- [ ] Confirm FPPCA monthly values from an official BESCOM/KERC notice; add the latest months.
- [ ] Confirm how the FY25 true-up appears on the bill.
- [ ] Confirm Gruha Jyothi over-limit rule and whether it covers fixed charges.
- [ ] Add 5–10 real bills to `tests/fixtures/real-bills.json` and get them passing.
- [ ] Set `verified: true` and `lastVerifiedOn` in the data files.

---

## 12. Build order for Claude Code

1. Scaffold Astro + TypeScript strict + Vitest + Playwright; add `npm run check`.
2. Write `types.ts`, zod schema, and the two data files from §4.
3. Implement `calculate.ts` and its unit tests (§5, §9.1). All tests green before any UI.
4. Build `Base.astro`, global CSS (light/dark), `SourceBox`, `UnverifiedBanner`, footer disclaimer.
5. Build the calculator island + `BillBreakdown` + URL state + share buttons; the main BESCOM calculator page.
6. Build the rate page, Gruha Jyothi page, FPPCA/true-up page, how-to-read page, home, Karnataka index, about, 404.
7. Build programmatic N-units pages from the data list.
8. Add sitemap, robots, JSON-LD, OG tags, `_headers`.
9. Run Lighthouse; fix anything below 95. Run E2E tests.
10. Write `README.md` (run, test, deploy, **how to add a new company**, the verification checklist).

---

## 13. Later (not in MVP)

- Other Karnataka companies (MESCOM, HESCOM, GESCOM, CESC, HRECS), each with its **own** data file (their true-up charges differ).
- Appliance usage estimator (AC/geyser hours → units → ₹).
- "Why is my bill higher than last month?" comparison.
- Kannada and Hindi versions of key pages.
- Other states (Maharashtra MSEDCL, Tamil Nadu, etc.), each verified from its regulator's order.
- Tariff-change email alerts.
- Solar/EV categories.

## 14. Success check (8 weeks after launch)

Watch Search Console. If impressions grow, add the next company or state. If they stay flat after fixing on-page basics, revisit the idea shortlist.
