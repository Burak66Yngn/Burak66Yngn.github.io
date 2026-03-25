-- ============================================================
-- EU Carbon Transparency Platform — Data Source Inventory
-- EU1-60 (Automotive) + EU1-61 (Aviation) + EU1-62 (Licensing) + EU1-63 (Update Frequency)
-- Run this AFTER schema.sql — adds remaining sources to the `sources` table
-- ============================================================

-- Note: The following were already inserted via schema.sql seed:
--   eea-co2, google-tim, easa-fel, icao-icec, green-ncap, eu-ets
-- This file adds the remaining sources.

-- ============================================================
-- EU1-60: AUTOMOTIVE SOURCES
-- ============================================================

insert into sources (slug, name, short_name, sector_id, access_type, update_frequency, license, trust_class, url, notes)
select
  slug, name, short_name,
  (select id from sectors where slug = 'automotive'),
  access_type, update_frequency, license, trust_class, url, notes
from (values
  (
    'acea-registrations',
    'European Automobile Manufacturers'' Association — New Car Registrations',
    'ACEA',
    'portal',
    'monthly',
    'public',
    'verified',
    'https://www.acea.auto/pc-registrations/',
    'Monthly EU new car registration data by manufacturer and fuel type. Free to access. Attribution recommended. Good for BEV share tracking.'
  ),
  (
    'ec-car-labelling',
    'European Commission — Car Labelling Directive',
    'EC Car Labelling',
    'portal',
    'static',
    'public',
    'verified',
    'https://climate.ec.europa.eu/eu-action/transport/road-transport-reducing-co2-emissions-vehicles/co2-emission-performance-standards-cars-and-vans_en',
    'Regulatory reference only (not a data source). Covers consumer CO₂ labelling obligations and fleet targets. National implementation may differ.'
  ),
  (
    'osd-turkey',
    'Otomotiv Sanayii Derneği — Türkiye Araç Pazarı',
    'OSD',
    'portal',
    'monthly',
    'public',
    'self_reported',
    'https://www.osd.org.tr',
    'TR-only source. Monthly vehicle sales data for Turkey. Useful for TR expansion. Not EU-standardized — use separately from EU fleet data.'
  ),
  (
    'wltp-regulation',
    'WLTP Type Approval Regulation (EU 2017/1151)',
    'WLTP',
    'pdf',
    'static',
    'public',
    'verified',
    'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32017R1151',
    'Regulatory methodology reference. Defines the WLTP test cycle used by EEA fleet CO₂ data. Not a data source — methodology anchor.'
  ),
  (
    'ec-espr-dpp',
    'European Commission — ESPR / Digital Product Passport',
    'ESPR / DPP',
    'portal',
    'static',
    'public',
    'verified',
    'https://commission.europa.eu/energy-climate-change-environment/standards-tools-and-labels/products-labelling-rules-and-requirements/ecodesign-sustainable-products-regulation_en',
    'Regulatory reference. DPP framework incoming. MVP: model fields/ID logic as DPP-ready. Real integration when first product group delegations confirmed.'
  )
) as v(slug, name, short_name, access_type, update_frequency, license, trust_class, url, notes);


-- ============================================================
-- EU1-61: AVIATION SOURCES
-- ============================================================

insert into sources (slug, name, short_name, sector_id, access_type, update_frequency, license, trust_class, url, notes)
select
  slug, name, short_name,
  (select id from sectors where slug = 'aviation'),
  access_type, update_frequency, license, trust_class, url, notes
from (values
  (
    'eurostat-air',
    'Eurostat — Air Passenger Transport Statistics',
    'Eurostat Air',
    'csv_download',
    'annual',
    'cc-by-4.0',
    'verified',
    'https://ec.europa.eu/eurostat/statistics-explained/index.php?title=Air_passenger_transport_statistics',
    'EU-wide air passenger volume data. 2024: 1.1B passengers, +8.3% YoY. Useful for market context. Free reuse under CC BY 4.0.'
  ),
  (
    'refueleu-aviation',
    'ReFuelEU Aviation — DG MOVE',
    'ReFuelEU',
    'portal',
    'static',
    'public',
    'verified',
    'https://transport.ec.europa.eu/transport-modes/air/aviation-and-environment/refueleu-aviation_en',
    'Regulatory reference. Mandates SAF blending at EU airports from 2025. Affects fuel-mix metrics. Not a data source — regulatory anchor for aviation sector.'
  ),
  (
    'easa-fel-faq',
    'EASA — Flight Emissions Label FAQ & Technical Docs',
    'EASA FEL FAQ',
    'portal',
    'periodic',
    'display-rules-apply',
    'verified',
    'https://www.flightemissions.eu/en/faq',
    'Technical documentation for FEL display rules. Label is NOT for accounting/reporting. ISO 14083 aligned. Phase 2: integrate public CSV via aggregator program.'
  ),
  (
    'tim-methodology',
    'Google Travel Impact Model — Methodology Documentation',
    'TIM Methodology',
    'pdf',
    'periodic',
    'cc-by-sa-4.0',
    'calculated',
    'https://developers.google.com/travel/impact-model/methodology',
    'Detailed methodology for TIM API: well-to-wake lifecycle, contrail impact categories, class multipliers. Use as "source methodology" reference in UI. CC BY-SA 4.0.'
  ),
  (
    'tr-dhmi-aviation',
    'T.C. Ulaştırma ve Altyapı Bakanlığı — Havalimanı İstatistikleri',
    'DHMİ / UAB',
    'portal',
    'annual',
    'public',
    'self_reported',
    'https://www.uab.gov.tr',
    'TR-only source. 2024: 230.2M passengers. Useful for TR expansion context. Not EU-standardized — keep separate from EU aviation data.'
  ),
  (
    'eu-ets-aviation-monitoring',
    'EU ETS — Aviation Monitoring, Reporting & Verification',
    'EU ETS MRV',
    'portal',
    'annual',
    'public',
    'verified',
    'https://climate.ec.europa.eu/eu-action/transport/aviation_en',
    'Aviation-specific EU ETS data: operator-level MRV reports, free allocation, verified emissions. Complements the Union Registry download. Kamuya açık.'
  )
) as v(slug, name, short_name, access_type, update_frequency, license, trust_class, url, notes);


-- ============================================================
-- EU1-62: LICENSING NOTES SUMMARY (as a view-friendly query)
-- ============================================================
-- Run this to verify licensing for all sources:

-- select slug, name, license, trust_class, notes
-- from sources
-- order by license, slug;


-- ============================================================
-- EU1-63: UPDATE FREQUENCY SUMMARY
-- ============================================================
-- Run this to see update schedules:

-- select slug, name, update_frequency, sector_id
-- from sources
-- order by update_frequency, slug;
