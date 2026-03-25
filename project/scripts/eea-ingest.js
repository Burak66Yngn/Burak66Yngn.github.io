// ============================================================
// EU Carbon Transparency Platform
// EU1-43: EEA Ingestion Pipeline v1
//
// EU1-64: Fetch raw data from EEA DISCODATA API
// EU1-65: Normalize to internal schema format
// EU1-66: Upsert into Supabase metric_values
//
// Run: node scripts/eea-ingest.js
// Requires: NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local
// ============================================================

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

// ── Load .env.local ──────────────────────────────────────────
function loadEnv() {
  try {
    const envPath = resolve(__dirname, '../.env.local')
    const raw = readFileSync(envPath, 'utf-8')
    for (const line of raw.split('\n')) {
      const [key, ...rest] = line.split('=')
      if (key && !key.startsWith('#')) {
        process.env[key.trim()] = rest.join('=').trim()
      }
    }
  } catch {
    console.warn('⚠️  .env.local bulunamadı — env değişkenleri ortamdan okunacak')
  }
}
loadEnv()

const SUPABASE_URL  = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY  // service_role key bypasses RLS for writes

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ NEXT_PUBLIC_SUPABASE_URL veya NEXT_PUBLIC_SUPABASE_ANON_KEY tanımlı değil')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

// ── Config ───────────────────────────────────────────────────
const TARGET_YEAR  = 2024        // Hangi yıl çekilsin
const EEA_TABLE    = 'co2cars_2024Pv29'  // En güncel EEA versiyonu
const EEA_BASE_URL = 'https://discodata.eea.europa.eu/sql'

// Hangi üreticileri (Mk = brand) içeriyoruz — MVP için top 20
const TARGET_BRANDS = [
  'VOLKSWAGEN', 'TOYOTA', 'STELLANTIS', 'RENAULT', 'HYUNDAI',
  'BMW', 'MERCEDES-BENZ', 'FORD', 'OPEL', 'KIA',
  'AUDI', 'SKODA', 'SEAT', 'PEUGEOT', 'CITROEN',
  'VOLVO', 'NISSAN', 'HONDA', 'MAZDA', 'DACIA'
]

// ── EU1-64: EEA'dan ham veri çek (aggregate sorgu) ───────────
async function fetchEEAData(year) {
  console.log(`\n📡 EU1-64: EEA DISCODATA API'den ${year} verisi çekiliyor...`)

  const sql = `
    SELECT
      [Man]             AS manufacturer,
      [Mk]              AS brand,
      [Year]            AS year,
      COUNT(*)          AS total_registrations,
      AVG([Ewltp (g/km)]) AS avg_co2_wltp_gkm,
      SUM(CASE WHEN [Ft] IN ('electric', 'hydrogen') THEN 1 ELSE 0 END) AS bev_count,
      ROUND(
        100.0 * SUM(CASE WHEN [Ft] IN ('electric', 'hydrogen') THEN 1 ELSE 0 END) / COUNT(*),
        2
      ) AS bev_share_pct
    FROM [CO2Emission].[latest].[${EEA_TABLE}]
    WHERE [Ct] = 'M1'
      AND [Year] = ${year}
      AND [Ewltp (g/km)] IS NOT NULL
    GROUP BY [Man], [Mk], [Year]
    ORDER BY total_registrations DESC
  `.trim().replace(/\s+/g, ' ')

  const url = `${EEA_BASE_URL}?query=${encodeURIComponent(sql)}&p=1&nrOfHits=500`

  const res = await fetch(url)
  if (!res.ok) throw new Error(`EEA API hatası: ${res.status} ${res.statusText}`)

  const json = await res.json()
  const rows = json.results || []
  console.log(`   ✅ ${rows.length} üretici kaydı alındı`)
  return rows
}

// ── EU1-65: Normalize et ─────────────────────────────────────
function normalizeRows(rawRows) {
  console.log('\n🔧 EU1-65: Veri normalize ediliyor...')

  return rawRows
    .filter(row => {
      // Sadece hedef markaları dahil et (MVP scope)
      const brand = (row.brand || '').toUpperCase()
      return TARGET_BRANDS.some(b => brand.includes(b) || (row.manufacturer || '').toUpperCase().includes(b))
    })
    .map(row => ({
      // Üretici bilgileri
      company_slug: slugify(row.brand || row.manufacturer),
      company_name: toTitleCase(row.brand || row.manufacturer),
      manufacturer_raw: row.manufacturer,
      brand_raw: row.brand,

      // Metrik değerleri
      year: Number(row.year),
      avg_co2_wltp:      parseFloat(row.avg_co2_wltp_gkm)    || null,
      total_registrations: parseInt(row.total_registrations)  || null,
      bev_share_pct:     parseFloat(row.bev_share_pct)        || null,

      // Trust & comparability
      trust_label:    'verified',
      comparability:  'same_method',
      scope_note:     'EU M1 fleet, WLTP type approval test cycle. Does not include production or end-of-life emissions.',
      methodology_version: `EEA ${EEA_TABLE}`,
      source_url: 'https://www.eea.europa.eu/en/datahub/datahubitem-view/fa8b1229-3db6-495d-b18e-9c9b3267c02b',
    }))
}

// ── EU1-66: Supabase'e yaz ───────────────────────────────────
async function upsertToSupabase(normalized) {
  console.log(`\n💾 EU1-66: ${normalized.length} kayıt Supabase'e yazılıyor...`)

  // Sabit ID'leri yükle
  const { data: sourceRow } = await supabase
    .from('sources').select('id').eq('slug', 'eea-co2').single()
  const { data: metricCO2 } = await supabase
    .from('metrics').select('id').eq('slug', 'fleet_co2_gkm').single()
  const { data: metricBEV } = await supabase
    .from('metrics').select('id').eq('slug', 'bev_share_pct').single()
  const { data: sectorRow } = await supabase
    .from('sectors').select('id').eq('slug', 'automotive').single()

  if (!sourceRow || !metricCO2 || !metricBEV || !sectorRow) {
    throw new Error('❌ Gerekli source/metric/sector bulunamadı. schema.sql çalıştırıldı mı?')
  }

  let inserted = 0
  let skipped  = 0
  let errors   = 0

  for (const row of normalized) {
    // Şirket upsert (yoksa oluştur)
    const { data: company, error: companyErr } = await supabase
      .from('companies')
      .upsert({
        slug:        row.company_slug,
        name:        row.company_name,
        sector_id:   sectorRow.id,
        is_eu_based: true,
      }, { onConflict: 'slug' })
      .select('id')
      .single()

    if (companyErr) {
      console.error(`   ⚠️  Şirket upsert hatası (${row.company_slug}):`, companyErr.message)
      errors++
      continue
    }

    // Fleet CO₂ metric_value upsert
    if (row.avg_co2_wltp !== null) {
      const { error: co2Err } = await supabase
        .from('metric_values')
        .upsert({
          company_id:          company.id,
          metric_id:           metricCO2.id,
          source_id:           sourceRow.id,
          year:                row.year,
          value:               row.avg_co2_wltp,
          value_unit:          'gCO₂/km',
          trust_label:         row.trust_label,
          comparability:       row.comparability,
          scope_note:          row.scope_note,
          methodology_version: row.methodology_version,
          source_url:          row.source_url,
          raw_source_value:    String(row.avg_co2_wltp),
          is_estimate:         false,
          updated_at:          new Date().toISOString(),
        }, { onConflict: 'company_id,metric_id,source_id,year' })

      if (co2Err) {
        console.error(`   ⚠️  CO₂ değeri yazma hatası (${row.company_slug}):`, co2Err.message)
        errors++
      } else {
        inserted++
      }
    }

    // BEV share metric_value upsert
    if (row.bev_share_pct !== null) {
      await supabase
        .from('metric_values')
        .upsert({
          company_id:          company.id,
          metric_id:           metricBEV.id,
          source_id:           sourceRow.id,
          year:                row.year,
          value:               row.bev_share_pct,
          value_unit:          '%',
          trust_label:         row.trust_label,
          comparability:       row.comparability,
          scope_note:          row.scope_note,
          methodology_version: row.methodology_version,
          source_url:          row.source_url,
          raw_source_value:    String(row.bev_share_pct),
          is_estimate:         false,
          updated_at:          new Date().toISOString(),
        }, { onConflict: 'company_id,metric_id,source_id,year' })
      inserted++
    }

    console.log(`   ✅ ${row.company_name.padEnd(25)} | CO₂: ${row.avg_co2_wltp ?? '-'} g/km | BEV: %${row.bev_share_pct ?? '-'}`)
    skipped++ // sadece log için değil, bunu aşağıda kaldırıyoruz
  }

  console.log(`\n📊 Özet: ${inserted} değer yazıldı | ${errors} hata`)
}

// ── Yardımcı fonksiyonlar ────────────────────────────────────
function slugify(str = '') {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

function toTitleCase(str = '') {
  return str.toLowerCase().replace(/\b\w/g, c => c.toUpperCase())
}

// ── Ana akış ─────────────────────────────────────────────────
async function main() {
  console.log('🚀 EEA Ingestion Pipeline v1 başlatılıyor...')
  console.log(`   Hedef yıl: ${TARGET_YEAR}`)
  console.log(`   Hedef markalar: ${TARGET_BRANDS.length} marka\n`)

  try {
    const raw        = await fetchEEAData(TARGET_YEAR)   // EU1-64
    const normalized = normalizeRows(raw)                 // EU1-65
    await upsertToSupabase(normalized)                    // EU1-66
    console.log('\n✅ Pipeline tamamlandı!')
  } catch (err) {
    console.error('\n❌ Pipeline hatası:', err.message)
    process.exit(1)
  }
}

main()
