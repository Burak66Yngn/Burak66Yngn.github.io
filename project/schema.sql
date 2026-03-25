-- ============================================================
-- EU Carbon Transparency Platform — Supabase Schema v1
-- Sprint 1 | EU1-39
-- ============================================================

-- SECTORS
-- 'aviation' | 'automotive'
create table sectors (
  id         uuid primary key default gen_random_uuid(),
  slug       text unique not null,  -- 'aviation', 'automotive'
  label      text not null,         -- 'Aviation', 'Automotive'
  created_at timestamptz default now()
);

insert into sectors (slug, label) values
  ('aviation',   'Aviation'),
  ('automotive', 'Automotive');


-- COMPANIES
-- Airlines + Automakers
create table companies (
  id               uuid primary key default gen_random_uuid(),
  slug             text unique not null,  -- 'lufthansa', 'volkswagen', 'turkish-airlines'
  name             text not null,
  sector_id        uuid references sectors(id) on delete restrict,
  country_code     text,                  -- 'DE', 'TR', 'FR' (ISO 3166-1 alpha-2)
  headquarters     text,
  logo_url         text,
  website_url      text,
  is_eu_based      boolean default true,
  created_at       timestamptz default now()
);

create index idx_companies_sector on companies(sector_id);


-- SOURCES
-- Where the data comes from: EEA, Google TIM API, EASA FEL, ICAO, Green NCAP, EU ETS...
create table sources (
  id               uuid primary key default gen_random_uuid(),
  slug             text unique not null,  -- 'eea-co2', 'google-tim', 'easa-fel', 'icao-icec', 'green-ncap', 'eu-ets'
  name             text not null,         -- 'European Environment Agency'
  short_name       text,                  -- 'EEA'
  sector_id        uuid references sectors(id), -- null = cross-sector
  url              text,                  -- Source homepage / data page
  access_type      text,                  -- 'api' | 'csv_download' | 'web_tool' | 'pdf' | 'portal'
  update_frequency text,                  -- 'annual' | 'real_time' | 'quarterly' | 'on_demand'
  license          text,                  -- 'cc-by-sa-4.0' | 'eea-data-policy' | 'non-commercial-educational' | 'public'
  trust_class      text check (trust_class in ('verified', 'self_reported', 'calculated')),
  notes            text,                  -- License caveats, usage restrictions
  created_at       timestamptz default now()
);

-- Known sources from analysis doc
insert into sources (slug, name, short_name, access_type, update_frequency, license, trust_class, url, notes) values
  ('eea-co2',      'European Environment Agency CO₂ Performance',   'EEA',        'csv_download', 'annual',      'eea-data-policy',              'verified',   'https://www.eea.europa.eu/en/analysis/indicators/co2-performance-of-new-passenger-cars-in-europe', 'Fleet CO₂ only (WLTP type approval). Attribution required.'),
  ('google-tim',   'Google Travel Impact Model API',                 'TIM API',    'api',          'real_time',   'cc-by-sa-4.0',                 'calculated', 'https://developers.google.com/travel/impact-model', 'Future flights only (next 11 months). Share-alike applies.'),
  ('easa-fel',     'EASA EU Flight Emissions Label',                 'FEL',        'csv_download', 'periodic',    'display-rules-apply',          'verified',   'https://www.flightemissions.eu', 'Display rules apply — not for accounting. Phase 2 integration.'),
  ('icao-icec',    'ICAO Carbon Emissions Calculator',               'ICAO ICEC',  'web_tool',     'on_demand',   'open-source-methodology',      'calculated', 'https://www.icao.int/environmental-protection/Carbonoffset/Pages/default.aspx', 'Internationally recognized fallback method.'),
  ('green-ncap',   'Green NCAP Life Cycle Assessment',               'Green NCAP', 'pdf',          'periodic',    'non-commercial-educational',   'calculated', 'https://www.greenncap.com/european-lca-results', 'Written permission needed for reproduction. Link only in Phase 1.'),
  ('eu-ets',       'EU ETS Union Registry — Verified Emissions',     'EU ETS',     'portal',       'annual',      'public',                       'verified',   'https://www.dehst.de/EN/europaeischer-emissionshandel/anlagenbetreiber/berichterstattung/berichterstattung-node.html', 'Operator-level verified emissions. Free allocation + compliance data public.');


-- METRICS
-- The metric dictionary / glossary of what we measure
create table metrics (
  id                uuid primary key default gen_random_uuid(),
  slug              text unique not null,  -- 'fleet_co2_gkm', 'flight_co2e_pax', 'lca_co2e_km'
  name              text not null,         -- 'Fleet Average CO₂ (g/km)'
  description       text,
  unit              text,                  -- 'gCO₂/km', 'gCO₂e/pax', 'kgCO₂e/km'
  sector_id         uuid references sectors(id),
  category          text,                  -- 'fleet' | 'lca' | 'flight' | 'corporate'
  methodology_note  text,                  -- Key caveats about the metric's scope
  created_at        timestamptz default now()
);

insert into metrics (slug, name, unit, category, description, methodology_note) values
  ('fleet_co2_gkm',         'Fleet Average CO₂ (g/km)',               'gCO₂/km',       'fleet',     'Average CO₂ emissions per km for new passenger cars fleet.',     'Based on WLTP type approval test cycle. Official EEA monitoring. Does NOT include production or end-of-life.'),
  ('bev_share_pct',         'BEV Market Share (%)',                    '%',             'fleet',     'Share of battery electric vehicles in new car registrations.',   'Source: EEA annual fleet monitoring dataset.'),
  ('flight_co2e_pax',       'Flight CO₂e per Passenger',              'gCO₂e/pax',     'flight',    'CO₂-equivalent emissions per passenger for a given flight.',      'Calculated via Google TIM API (well-to-wake, lifecycle). Includes contrail impact estimate.'),
  ('lca_co2e_km',           'Lifecycle CO₂e per km (LCA)',            'kgCO₂e/km',     'lca',       'Full lifecycle emissions per km (production + use + end-of-life).', 'Green NCAP methodology. Does NOT include brand-specific production. Compare with caution across years.'),
  ('eu_ets_verified_mt',    'EU ETS Verified Emissions (MtCO₂)',       'MtCO₂',         'corporate', 'Operator-level verified emissions under the EU Emissions Trading System.', 'Annual. EU ETS Union Registry public data.'),
  ('csrd_report_status',    'CSRD Report Status',                      NULL,            'corporate', 'Whether the company has published a CSRD/ESRS-compliant sustainability report.', 'Manual extraction + source link. Binary: yes/no + year + link.');


-- METRIC VALUES
-- The actual data points: company x metric x year x source
create table metric_values (
  id                  uuid primary key default gen_random_uuid(),
  company_id          uuid references companies(id) on delete cascade,
  metric_id           uuid references metrics(id) on delete restrict,
  source_id           uuid references sources(id) on delete restrict,
  year                integer not null,
  value               numeric,                -- null if metric is non-numeric (e.g. csrd_report_status)
  value_text          text,                   -- for non-numeric values ('yes', 'no', 'partial')
  value_unit          text,                   -- unit override if different from metric default

  -- Trust system
  trust_label         text not null check (trust_label in ('verified', 'self_reported', 'calculated', 'missing')),

  -- Comparability system
  comparability       text check (comparability in ('same_method', 'similar', 'not_comparable')),

  -- Context
  scope_note          text,                   -- 'EU fleet only, WLTP test cycle'
  methodology_version text,                   -- 'TIM v2.1', 'WLTP 2023', 'Green NCAP 4th ed.'
  source_url          text,                   -- Direct link to source page/report/CSV
  raw_source_value    text,                   -- Original value before normalization
  is_estimate         boolean default false,

  created_at          timestamptz default now(),
  updated_at          timestamptz default now(),

  unique(company_id, metric_id, source_id, year)
);

create index idx_metric_values_company   on metric_values(company_id);
create index idx_metric_values_metric    on metric_values(metric_id);
create index idx_metric_values_year      on metric_values(year);
create index idx_metric_values_trust     on metric_values(trust_label);


-- REGULATIONS
-- For the /regulation page — policy tracker
create table regulations (
  id             uuid primary key default gen_random_uuid(),
  slug           text unique not null,   -- 'csrd', 'esrs', 'eu-ets', 'refueleu', 'espr-dpp', 'easa-fel'
  name           text not null,          -- 'CSRD / ESRS'
  short_name     text,
  sector_id      uuid references sectors(id),  -- null = cross-sector
  status         text check (status in ('stable', 'moving', 'proposed')),
  effective_date date,
  description    text,
  platform_impact text,                  -- How this regulation affects what we show
  source_url     text,
  created_at     timestamptz default now()
);

insert into regulations (slug, name, short_name, status, description, platform_impact, source_url) values
  ('csrd',     'Corporate Sustainability Reporting Directive', 'CSRD',     'moving',  'Mandates large EU companies to publish ESRS-compliant sustainability reports. First-wave companies report on 2024 FY in 2025.', 'Drives future availability of standardized corporate emission data. Monitor omnibus timeline.',           'https://finance.ec.europa.eu/capital-markets-union-and-financial-markets/company-reporting-and-auditing/company-reporting/corporate-sustainability-reporting_en'),
  ('eu-ets',   'EU Emissions Trading System',                 'EU ETS',   'stable',  'Cap-and-trade system covering aviation operators within EU. Verified emissions data is public via Union Registry.', 'Operator-level verified emission source for airline company pages.',                                    'https://climate.ec.europa.eu/eu-action/eu-emissions-trading-system-eu-ets_en'),
  ('refueleu', 'ReFuelEU Aviation',                           'ReFuelEU', 'moving',  'Mandates sustainable aviation fuel (SAF) blending at EU airports from 2025 onward.',                            'Affects future fuel-mix data for aviation metrics.',                                                   'https://transport.ec.europa.eu/transport-modes/air/aviation-and-environment/refueleu-aviation_en'),
  ('easa-fel', 'EU Flight Emissions Label',                   'FEL',      'moving',  'Standardized methodology for displaying flight emissions at booking stage. Route + airline + aircraft level.',   'Our flight module should align with FEL in Phase 2. Phase 1 uses TIM API + ICAO as informational.',      'https://www.flightemissions.eu'),
  ('espr-dpp', 'Ecodesign for Sustainable Products / Digital Product Passport', 'ESPR / DPP', 'proposed', 'Framework regulation enabling product-level sustainability data (Digital Product Passport). Delegations per product group.', 'Data model should be DPP-ready. Real integration when first product group is confirmed.', 'https://commission.europa.eu/energy-climate-change-environment/standards-tools-and-labels/products-labelling-rules-and-requirements/ecodesign-sustainable-products-regulation_en');


-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- Enable RLS — all reads are public, writes require service role
-- ============================================================

alter table sectors        enable row level security;
alter table companies      enable row level security;
alter table sources        enable row level security;
alter table metrics        enable row level security;
alter table metric_values  enable row level security;
alter table regulations    enable row level security;

-- Public read access
create policy "Public read sectors"       on sectors        for select using (true);
create policy "Public read companies"     on companies      for select using (true);
create policy "Public read sources"       on sources        for select using (true);
create policy "Public read metrics"       on metrics        for select using (true);
create policy "Public read metric_values" on metric_values  for select using (true);
create policy "Public read regulations"   on regulations    for select using (true);
