# Master Data Source Inventory
**EU1-60 (Automotive) + EU1-61 (Aviation) + EU1-62 (Licensing) + EU1-63 (Update Frequency)**

---

## Automotive Sources

| # | Kaynak | Slug | Erişim | Güncelleme | Lisans | Trust |
|---|--------|------|--------|-----------|--------|-------|
| 1 | [EEA CO₂ Performance](https://www.eea.europa.eu/en/analysis/indicators/co2-performance-of-new-passenger-cars-in-europe) | `eea-co2` | CSV indirme | Yılda 1 | EEA Data Policy | ✅ Verified |
| 2 | [Green NCAP LCA](https://www.greenncap.com/european-lca-results) | `green-ncap` | Web + PDF | Periyodik | ⚠️ Non-commercial educational | Calculated |
| 3 | [ACEA New Car Registrations](https://www.acea.auto/pc-registrations/) | `acea-registrations` | Portal | Aylık | Public | ✅ Verified |
| 4 | [EC Car Labelling Directive](https://climate.ec.europa.eu) | `ec-car-labelling` | Portal | Statik | Public | ✅ Verified |
| 5 | [OSD Türkiye](https://www.osd.org.tr) | `osd-turkey` | Portal | Aylık | Public | Self-reported |
| 6 | [WLTP Regulation](https://eur-lex.europa.eu) | `wltp-regulation` | PDF | Statik | Public | ✅ Verified |
| 7 | [ESPR / DPP](https://commission.europa.eu) | `ec-espr-dpp` | Portal | Statik | Public | ✅ Verified |

### Otomotiv Veri Katmanları (KRİTİK AYRIMI)

> **Fleet CO₂ (official)** → EEA · WLTP tip onay testi · Filo ortalaması · Yılda 1 güncelleme
>
> **Lifecycle CO₂ (estimated)** → Green NCAP · Üretim + kullanım + end-of-life · Marka-spesifik üretim dahil DEĞİL

❗ Bu iki katmanı UI'da kesinlikle ayırın — aynı ekranda kıyaslanamaz.

---

## Aviation Sources

| # | Kaynak | Slug | Erişim | Güncelleme | Lisans | Trust |
|---|--------|------|--------|-----------|--------|-------|
| 1 | [Google TIM API](https://developers.google.com/travel/impact-model) | `google-tim` | REST API | Gerçek zamanlı | CC BY-SA 4.0 | Calculated |
| 2 | [EASA FEL](https://www.flightemissions.eu) | `easa-fel` | CSV / Aggregator | Periyodik | ⚠️ Display kuralları geçerli | ✅ Verified |
| 3 | [ICAO ICEC](https://www.icao.int) | `icao-icec` | Web tool + PDF | On-demand | Open-source methodology | Calculated |
| 4 | [EU ETS Union Registry](https://www.dehst.de) | `eu-ets` | Portal indirme | Yılda 1 | Public | ✅ Verified |
| 5 | [Eurostat Air Transport](https://ec.europa.eu/eurostat) | `eurostat-air` | CSV indirme | Yılda 1 | CC BY 4.0 | ✅ Verified |
| 6 | [ReFuelEU Aviation](https://transport.ec.europa.eu) | `refueleu-aviation` | Portal | Statik | Public | ✅ Verified |
| 7 | [EASA FEL FAQ / Docs](https://www.flightemissions.eu/en/faq) | `easa-fel-faq` | Portal | Periyodik | ⚠️ Display kuralları geçerli | ✅ Verified |
| 8 | [TIM Methodology Docs](https://developers.google.com/travel/impact-model/methodology) | `tim-methodology` | PDF | Periyodik | CC BY-SA 4.0 | Calculated |
| 9 | [DHMİ / UAB TR](https://www.uab.gov.tr) | `tr-dhmi-aviation` | Portal | Yılda 1 | Public | Self-reported |
| 10 | [EU ETS MRV Aviation](https://climate.ec.europa.eu) | `eu-ets-aviation-monitoring` | Portal | Yılda 1 | Public | ✅ Verified |

### Uçuş Emisyonu Karar Ağacı (Faz 1 → Faz 2)

```
Faz 1 (MVP):
  → Google TIM API (computeFlightEmissions)
     └── flight_number + carrier + date → gCO₂e/pax (sınıf bazlı)
     └── "Bilgilendirme amaçlı" etiketiyle sun. FEL logosu KULLANMA.
  → ICAO ICEC (fallback / metodoloji referansı)

Faz 2:
  → EASA FEL public CSV + aggregator rehberi ile tam uyum
  → FEL logosunu yalnızca display kurallarına uyarak kullan
```

---

## Lisans Özeti (EU1-62)

| Kaynak | Lisans | Kısıt |
|--------|--------|-------|
| EEA CO₂ | EEA Data Policy | Attribution zorunlu |
| Google TIM API | CC BY-SA 4.0 | Attribution + share-alike (türev yayımlayacaksan) |
| EASA FEL | Display kuralları | Muhasebe amaçlı kullanılamaz; logo kurallı |
| ICAO ICEC | Open-source methodology | Serbest |
| Green NCAP | Non-commercial educational | **Yeniden yayımlamak için yazılı izin gerekli** |
| EU ETS | Public | Serbest |
| Eurostat | CC BY 4.0 | Attribution önerilir |
| ACEA, OSD, Bakanlıklar | Public | Attribution önerilir |

---

## Güncelleme Sıklıkları (EU1-63)

| Sıklık | Kaynaklar |
|--------|----------|
| Gerçek zamanlı | Google TIM API (sadece gelecek 11 ay) |
| Aylık | ACEA registrations, OSD |
| Yılda 1 | EEA CO₂, EU ETS, Eurostat Air, DHMİ/UAB |
| Periyodik | Green NCAP, EASA FEL, TIM Methodology |
| Statik | WLTP Regulation, Car Labelling, ReFuelEU, ESPR/DPP |

> **⚠️ TIM API kritik kısıt:** Sadece gelecek 11 aylık ticari uçuşlar sorgulanabilir. Geçmiş uçuş verisi yok.
> Fallback: Route bazlı "tipik" değer veya ICAO ICEC.
