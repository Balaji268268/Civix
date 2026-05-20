# Dataset Report — category_text_v1_sample

- **rows:** 10000  
- **input sha256:** `aa18d8154b67caf2a8759587…`  
- **text length (chars):** p10=75 / p50=99 / p90=119  
- **exact duplicates:** 65 (0.7%) | near-dup(real): 0 | near-dup(synthetic, by design): 8640  

## Class balance (`category_id`)

| value | count | % |
|---|---|---|
| roads | 1565 | 15.7 |
| solid_waste | 1337 | 13.4 |
| street_lighting | 1040 | 10.4 |
| water_supply | 877 | 8.8 |
| traffic | 729 | 7.3 |
| sewerage_drainage | 673 | 6.7 |
| electricity | 599 | 6.0 |
| parks_public_space | 480 | 4.8 |
| public_transport | 455 | 4.5 |
| health_hospitals | 368 | 3.7 |
| flood_management | 329 | 3.3 |
| public_safety | 289 | 2.9 |
| noise | 287 | 2.9 |
| trees | 205 | 2.0 |
| building_inspection | 197 | 2.0 |
| encroachment | 176 | 1.8 |
| gas_fire_hazards | 112 | 1.1 |
| other | 99 | 1.0 |
| markets_trade | 92 | 0.9 |
| public_conveniences | 91 | 0.9 |

## Source mix (Layer A=real-external, B=synthetic, C=app)

| source | rows |
|---|---|
| layerB:synthetic | 10000 |

## QC gates

| gate | pass | value |
|---|---|---|
| min_class_support | ✅ |  |
| exact_dup_rate_lt_15pct | ✅ | 0.65 |
| near_dup_real_rows_lt_30pct | ✅ | n/a |
| no_zero_texts | ✅ | 23 |

**Overall: ✅ ALL PASS**