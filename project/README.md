# Carbon Transparency Platform

EU-first evidence system for carbon data in automotive and aviation sectors.

**Live preview:** https://skill-deploy-u4ve3crvem-codex-agent-deploys.vercel.app/

---

## What it does

Collects official and methodology-backed carbon data for ~20-30 automakers and ~20-30 airlines. Every data point is shown with a source link, scope note, trust label, and comparability tag.

**No rankings.** The product answers: *"Does this data exist? Is it reliable? Can it be compared?"*

---

## Tech Stack

| Layer | Tool |
|-------|------|
| Frontend | Next.js + Tailwind CSS + Framer Motion |
| Database | Supabase (PostgreSQL) |
| Deployment | Vercel |
| Flight data | Google Travel Impact Model API |
| Automotive data | EEA CO₂ Performance Dataset |

---

## Local Setup

### 1. Clone the repo

```bash
git clone <repo-url>
cd <project-folder>
```

### 2. Install dependencies

```bash
npm install
```

### 3. Set environment variables

Create a `.env.local` file in the project root:

```env
NEXT_PUBLIC_SUPABASE_URL=https://wstgkurozvtkrkoaubfr.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>
```

> ⚠️ Never commit `.env.local` to Git. It's already in `.gitignore`.

### 4. Set up the database

In Supabase → SQL Editor, run these in order:

```
1. project/schema.sql                  ← Creates all tables + seed data
2. project/data-source-inventory.sql  ← Adds remaining data sources
```

### 5. Run locally

```bash
npm run dev
```

App runs at `http://localhost:3000`

---

## Pages

| Route | Purpose |
|-------|---------|
| `/` | Homepage |
| `/registry` | Browse all companies + metrics |
| `/compare` | Side-by-side metric comparison |
| `/methodology` | How trust labels and comparability work |
| `/regulation` | EU policy tracker (CSRD, FEL, ReFuelEU…) |
| `/sources` | All data sources with trust class |
| `/explore` | Free-text search across evidence |

---

## Database Schema

6 tables in Supabase:

```
sectors          → aviation / automotive
companies        → airlines + automakers
sources          → EEA, TIM API, EASA FEL, ICAO, Green NCAP, EU ETS…
metrics          → metric dictionary (fleet_co2, flight_co2e, lca_co2e…)
metric_values    → actual data: value + year + trust_label + comparability + scope_note
regulations      → policy tracker: CSRD, EU ETS, ReFuelEU, FEL, ESPR/DPP
```

See `project/schema.sql` for full schema and `project/data-source-inventory.md` for source details.

---

## Trust Labels

| Label | Meaning |
|-------|---------|
| `verified` | Official institution data (EEA, EU ETS, EASA) |
| `self_reported` | Company sustainability report |
| `calculated` | Derived via published methodology (TIM API, ICAO) |
| `missing` | No public data available |

---

## Team

| Kişi | Rol |
|------|-----|
| Burak Yangın | Frontend + Backend |
| [Arkadaş] | Supabase / DB yönetimi |

Organization: **ebya** on Supabase

---

## Sprint Progress

| Sprint | Task | Status |
|--------|------|--------|
| EU1 Sprint 1 | EU1-39 Define DB schema | ✅ Done |
| EU1 Sprint 1 | EU1-60/61/62/63 Data source inventory | ✅ Done |
| EU1 Sprint 1 | EU1-24 README | ✅ Done |
| EU1 Sprint 1 | EU1-43 EEA ingestion pipeline | 🔄 In progress |
