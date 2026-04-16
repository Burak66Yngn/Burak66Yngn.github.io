#!/usr/bin/env node
/**
 * Supabase Seed Script — inserts minimum required rows
 * Run ONCE before the ingestion script.
 *
 *   node scripts/seed-supabase.mjs
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

function loadEnv() {
  const envPath = resolve(__dirname, "..", ".env.local");
  if (!existsSync(envPath)) { console.error("❌ .env.local not found"); process.exit(1); }
  for (const line of readFileSync(envPath, "utf-8").split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i === -1) continue;
    const k = t.slice(0, i).trim(), v = t.slice(i + 1).trim();
    if (!process.env[k]) process.env[k] = v;
  }
}
loadEnv();

const URL = process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
if (!URL || !KEY) { console.error("❌ Missing env vars"); process.exit(1); }

const sb = createClient(URL, KEY);

async function upsert(table, rows, conflict) {
  const { error } = await sb.from(table).upsert(rows, { onConflict: conflict, ignoreDuplicates: true });
  if (error) console.error(`  ⚠️  ${table}:`, error.message);
  else console.log(`  ✅ ${table} (${rows.length} rows)`);
}

async function main() {
  console.log("\n🌱 Seeding Supabase...\n");

  // 1. Sectors
  await upsert("sectors", [
    { name: "Aviation",   slug: "aviation" },
    { name: "Automotive", slug: "automotive" },
  ], "slug");

  const { data: sectors } = await sb.from("sectors").select("id, slug");
  const sectorId = Object.fromEntries((sectors ?? []).map(s => [s.slug, s.id]));

  // 2. Sources
  await upsert("sources", [
    { name: "European Environment Agency", slug: "eea",
      sector_id: sectorId["automotive"], data_type: "Fleet CO2 performance",
      trust_label: "verified", update_frequency: "Annual",
      license: "Public institutional publication",
      methodology: "Official manufacturer fleet monitoring and reporting.",
      note: "Useful for operational fleet intensity, not lifecycle comparison.",
      url: "https://www.eea.europa.eu/" },
    { name: "EASA / Flight Emissions Label", slug: "easa-fel",
      sector_id: sectorId["aviation"], data_type: "Passenger-flight emissions label",
      trust_label: "calculated", update_frequency: "Rolling programme update",
      license: "EU public framework",
      methodology: "Harmonised passenger-flight label rules defined by the EU framework.",
      note: "Comparable within the label framework, with limits outside it.",
      url: "https://transport.ec.europa.eu/" },
    { name: "Google Travel Impact Model", slug: "google-tim",
      sector_id: sectorId["aviation"], data_type: "Flight emissions estimate",
      trust_label: "calculated", update_frequency: "Model iteration",
      license: "Public methodology with platform-specific use",
      methodology: "Modelled passenger-flight estimate based on aircraft and route attributes.",
      note: "Use as a model family, not as a substitute for verified operator reporting.",
      url: "https://developers.google.com/travel/impact-model" },
    { name: "Green NCAP", slug: "green-ncap",
      sector_id: sectorId["automotive"], data_type: "Lifecycle and efficiency estimates",
      trust_label: "calculated", update_frequency: "Programme release",
      license: "Public programme output",
      methodology: "Vehicle efficiency and lifecycle modelling with programme assumptions.",
      note: "Useful for vehicle-level review, not a replacement for official fleet reporting.",
      url: "https://www.greenncap.com/" },
    { name: "Corporate sustainability disclosures", slug: "csrd-filings",
      sector_id: null, data_type: "Self-reported metrics",
      trust_label: "self_reported", update_frequency: "Annual reporting cycle",
      license: "Company filing terms",
      methodology: "Issuer-defined sustainability reporting with disclosed notes.",
      note: "Useful as supporting context, with method and scope checks before comparison.",
      url: "https://finance.ec.europa.eu/" },
  ], "slug");

  // 3. Metrics
  await upsert("metrics", [
    { name: "Fleet CO2", slug: "fleet-co2", unit: "g/km",
      definition: "Operational manufacturer fleet average emissions under an official reporting framework.",
      valid_when: "The same reporting regime, fleet definition, and reporting year are aligned.",
      invalid_when: "Compared directly with lifecycle estimates or non-fleet consumer-facing model claims.",
      metric_family: "vehicle-operational-co2", boundary_note: "tank-to-wheel-fleet",
      note: "Use for manufacturer comparison within a shared official perimeter." },
    { name: "Passenger-flight estimate", slug: "flight-passenger-estimate", unit: "kg CO2e/pax",
      definition: "Estimated passenger emissions for a route or itinerary using a published model family.",
      valid_when: "The same passenger basis, cabin treatment, routing assumptions, and model family are aligned.",
      invalid_when: "Compared directly with annual operator totals or carrier-defined intensity ratios.",
      metric_family: "aviation-passenger-co2e", boundary_note: "flight-passenger-estimate",
      note: "Use for itinerary-level review, not for broad operator ranking." },
    { name: "Vehicle lifecycle intensity", slug: "vehicle-lifecycle-intensity", unit: "gCO2e/km",
      definition: "Lifecycle emissions intensity including manufacturing and energy pathway assumptions.",
      valid_when: "The same lifecycle model scope, dataset assumptions, and energy mix basis are aligned.",
      invalid_when: "Compared directly with tailpipe-only or fleet-reporting figures.",
      metric_family: "vehicle-lifecycle-co2e", boundary_note: "lifecycle-vehicle",
      note: "Use for technology interpretation, not alongside operational compliance metrics." },
  ], "slug");

  // 4. Regulations
  await upsert("regulations", [
    { name: "CSRD / ESRS", slug: "csrd-esrs", status: "moving",
      summary: "Corporate sustainability reporting is becoming more structured.",
      impact: "Adds more machine-readable reporting context and methodology disclosures.",
      availability: "Useful for metadata and self-reported evidence, with continuing need for scope checks.",
      signal: "Disclosure structure is strengthening, but the reporting perimeter is not static." },
    { name: "EU ETS Aviation", slug: "eu-ets", status: "stable",
      summary: "Aviation emissions within the EU ETS provide verified emissions records.",
      impact: "Provides compliance-grade emissions records for operators within the scheme boundary.",
      availability: "Reliable for verified operator emissions, not for route-level passenger comparability.",
      signal: "Institutional backbone for verified scope-bound emissions data." },
    { name: "Flight Emissions Label", slug: "flight-emissions-label", status: "moving",
      summary: "A harmonised EU label improves the comparability of passenger-flight estimates.",
      impact: "Defines a clearer methodology family for passenger-flight emissions.",
      availability: "Helpful for route comparison inside the label logic.",
      signal: "Comparability is improving, but only inside the label perimeter." },
    { name: "ESPR / Digital Product Passport", slug: "espr-dpp", status: "upcoming",
      summary: "Product-level sustainability documentation is moving toward more structured digital disclosure.",
      impact: "Could improve traceability and source granularity for vehicle and component evidence.",
      availability: "Roadmap-relevant now, operational data availability still uneven.",
      signal: "Coverage is likely to arrive gradually rather than all at once." },
    { name: "ReFuelEU Aviation", slug: "refueleu", status: "partial",
      summary: "Fuel policy affects how aviation sustainability data is disclosed and interpreted.",
      impact: "Adds context around fuel mix, compliance, and emissions-related claims.",
      availability: "Important for interpretation, but not a universal source of comparable passenger metrics.",
      signal: "Regulation affects interpretation before it produces matching datasets." },
  ], "slug");

  // 5. Sample companies
  await upsert("companies", [
    { name: "Nordline Motors", slug: "nordline-motors", sector_id: sectorId["automotive"],
      region: "EU manufacturer",
      summary: "Reference automaker page with official fleet reporting and lifecycle records shown separately.",
      note: "Automaker record with documented source families and a mix of available, estimated, and missing records." },
    { name: "Aeralis Europe", slug: "aeralis-europe", sector_id: sectorId["aviation"],
      region: "EU network carrier",
      summary: "Reference airline page with route-level estimates, operator totals, and company disclosures shown separately.",
      note: "Airline record with published method families and source-linked entries." },
  ], "slug");

  console.log("\n🌱 Seed complete. Now run:");
  console.log("   node scripts/run-eea-ingest.mjs --dry-run");
  console.log("   node scripts/run-eea-ingest.mjs\n");
}

main().catch(err => { console.error("💥", err); process.exit(1); });
