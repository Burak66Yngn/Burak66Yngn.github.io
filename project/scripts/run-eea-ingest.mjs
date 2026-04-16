#!/usr/bin/env node
/**
 * EEA CO₂ Ingestion Script — API-based (no CSV download needed)
 *
 * Fetches data directly from EEA DISCODATA API and upserts into Supabase.
 *
 * Run with plain Node.js:
 *   node scripts/run-eea-ingest.mjs
 *   node scripts/run-eea-ingest.mjs --dry-run
 *   node scripts/run-eea-ingest.mjs --year 2023
 *
 * Reads .env.local from parent directory automatically.
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

// ─── Load .env.local ─────────────────────────────────────────────────────────
function loadEnv() {
  const envPath = resolve(__dirname, "..", ".env.local");
  if (!existsSync(envPath)) {
    console.error("❌ .env.local not found at:", envPath);
    process.exit(1);
  }
  const lines = readFileSync(envPath, "utf-8").split("\n");
  for (const line of lines) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const idx = t.indexOf("=");
    if (idx === -1) continue;
    const k = t.slice(0, idx).trim();
    const v = t.slice(idx + 1).trim();
    if (!process.env[k]) process.env[k] = v;
  }
}
loadEnv();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

// ─── Args ─────────────────────────────────────────────────────────────────────
const args     = process.argv.slice(2);
const isDryRun = args.includes("--dry-run");
const yearIdx  = args.indexOf("--year");
const year     = yearIdx !== -1 && args[yearIdx + 1] ? args[yearIdx + 1] : "2024";
const VERSION_MAP = { "2024": "29", "2023": "27", "2022": "24", "2021": "22", "2020": "19" };
const TABLE    = `co2cars_${year}Pv${VERSION_MAP[year] ?? "29"}`;


// ─── EEA DISCODATA API ───────────────────────────────────────────────────────
const DISCODATA_BASE = "https://discodata.eea.europa.eu/sql";
const PAGE_SIZE = 1000;

function buildQuery(page) {
  const sql = `SELECT "Mh","Year",AVG("Ewltp (g/km)") as avg_co2,COUNT(*) as total_reg,AVG("M (kg)") as avg_mass FROM [CO2Emission].[latest].[${TABLE}] WHERE "Mh" IS NOT NULL AND "Ewltp (g/km)" IS NOT NULL GROUP BY "Mh","Year"`;
  const encoded = encodeURIComponent(sql);
  return `${DISCODATA_BASE}?query=${encoded}&p=${page}&nrOfHits=${PAGE_SIZE}`;
}

async function fetchPage(page) {
  const url = buildQuery(page);
  const res  = await fetch(url);
  if (!res.ok) throw new Error(`DISCODATA API error: ${res.status} ${res.statusText}`);
  return res.json();
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function toSlug(name) {
  return name.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  if (!SUPABASE_URL || !SERVICE_KEY) {
    console.error("❌ Missing env vars. Check .env.local");
    process.exit(1);
  }

  console.log(`\n🌐 Fetching EEA DISCODATA — table: ${TABLE} — year: ${year}`);
  console.log("   (This fetches aggregated fleet averages per manufacturer, no CSV needed)\n");

  // ── Fetch all pages ─────────────────────────────────────────────────────────
  const allRows = [];
  let page = 1;

  while (true) {
    process.stdout.write(`\r   Page ${page}... (${allRows.length} rows so far)`);
    const data = await fetchPage(page);

    if (data.errors?.length) {
      console.error("\n❌ API error:", data.errors[0].error);
      process.exit(1);
    }

    const results = data.results || [];
    if (results.length === 0) break;
    allRows.push(...results);
    if (results.length < PAGE_SIZE) break; // last page
    page++;
  }

  console.log(`\n   ✅ Fetched ${allRows.length} manufacturer × year rows`);

  // ── Filter: skip 0 CO2 rows (BEVs with no WLTP), negative, too high ─────────
  const valid = allRows.filter(r =>
    r.avg_co2 > 0 && r.avg_co2 < 500 && r.total_reg > 0
  );
  console.log(`   After quality filter: ${valid.length} rows`);

  if (isDryRun) {
    console.log("\n🔍 DRY RUN — no data written. Sample:");
    valid.slice(0, 10).forEach(r => {
      console.log(`   ${r.Mh} | ${r.Year} | ${Math.round(r.avg_co2)} g/km | ${r.total_reg.toLocaleString()} reg`);
    });
    console.log("\n✅ Dry run done. Remove --dry-run to write to Supabase.");
    return;
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

  // ── Resolve metric / source / sector IDs ──────────────────────────────────
  const [{ data: metric }, { data: source }, { data: sector }] = await Promise.all([
    supabase.from("metrics").select("id").eq("slug", "fleet-co2").maybeSingle(),
    supabase.from("sources").select("id").eq("slug", "eea").maybeSingle(),
    supabase.from("sectors").select("id").eq("slug", "automotive").maybeSingle(),
  ]);

  if (!metric) { console.error("❌ Metric 'fleet-co2' not found. Run seed.sql first."); process.exit(1); }
  if (!source) { console.error("❌ Source 'eea' not found. Run seed.sql first."); process.exit(1); }
  if (!sector) { console.error("❌ Sector 'automotive' not found. Run seed.sql first."); process.exit(1); }

  console.log("\n🏭 Upserting companies...");

  // ── Upsert companies (one per unique Mh) ──────────────────────────────────
  const uniqueCompanies = [...new Map(valid.map(r => [toSlug(r.Mh), r])).values()];
  const { error: cErr } = await supabase.from("companies").upsert(
    uniqueCompanies.map(r => ({
      slug:      toSlug(r.Mh),
      name:      r.Mh,
      sector_id: sector.id,
      region:    "EU manufacturer",
      note:      `Auto-ingested from EEA DISCODATA ${TABLE}.`,
    })),
    { onConflict: "slug", ignoreDuplicates: true }
  );
  if (cErr) { console.error("❌ Company upsert failed:", cErr.message); process.exit(1); }
  console.log(`   ✅ ${uniqueCompanies.length} companies ensured`);

  // ── Resolve company ID map ─────────────────────────────────────────────────
  const { data: companies } = await supabase
    .from("companies")
    .select("id, slug")
    .in("slug", uniqueCompanies.map(r => toSlug(r.Mh)));

  const cidMap = new Map((companies ?? []).map(c => [c.slug, c.id]));

  // ── Build metric_values rows ───────────────────────────────────────────────
  const rows = valid.map(r => {
    const slug = toSlug(r.Mh);
    const cid  = cidMap.get(slug);
    if (!cid) return null;
    const avgCo2 = Math.round(r.avg_co2);
    const yr     = String(r.Year);
    const comparable = parseInt(yr, 10) >= 2021;
    return {
      company_id:          cid,
      metric_id:           metric.id,
      source_id:           source.id,
      value:               String(avgCo2),
      unit:                "g/km",
      year:                yr,
      trust_label:         "verified",
      comparability_state: comparable ? "same_method" : "not_comparable",
      scope_note:          `EU fleet average ${r.Mh} (${yr}), ${r.total_reg.toLocaleString()} registrations.`,
      method_family:       "fleet-reporting",
      boundary:            "tank-to-wheel-fleet",
      note:                comparable
        ? `WLTP-based. Avg mass: ${Math.round(r.avg_mass)} kg.`
        : `Pre-2021 mixed test cycle. Do not compare directly with 2021+ WLTP values.`,
    };
  }).filter(Boolean);

  // ── Batch upsert metric_values ─────────────────────────────────────────────
  console.log(`📊 Upserting ${rows.length} metric values...`);
  const CHUNK = 200;
  let done = 0;
  for (let i = 0; i < rows.length; i += CHUNK) {
    const chunk = rows.slice(i, i + CHUNK);
    const { error } = await supabase
      .from("metric_values")
      .insert(chunk);
    if (error) { console.error(`\n❌ Upsert error:`, error.message); process.exit(1); }
    done += chunk.length;
    process.stdout.write(`\r   ${done}/${rows.length} rows upserted`);
  }

  console.log(`\n   ✅ ${done} metric_values upserted`);
  console.log(`\n🎉 Done! AutomotivePage should now show ${uniqueCompanies.length} manufacturers.`);
}

main().catch(err => { console.error("💥", err); process.exit(1); });
