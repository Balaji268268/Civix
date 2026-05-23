# Dataset Report — spam_text_v1_sample

- **rows:** 2000  
- **input sha256:** `dce5520a2ce7cad9e6893728…`  
- **text length (chars):** p10=21 / p50=60 / p90=144  
- **exact duplicates:** 156 (7.8%) | near-dup prefix12:** 866 (43.3%)  

## Class balance (`spam_family`)

| value | count | % |
|---|---|---|
| scam_template | 410 | 20.5 |
| keyboard_mash | 296 | 14.8 |
| mixed_script | 221 | 11.1 |
| repeated_word | 217 | 10.8 |
| boundary_real | 210 | 10.5 |
| lorem | 187 | 9.3 |
| random_ascii | 173 | 8.7 |
| symbol_digit | 145 | 7.2 |
| repeated_char | 141 | 7.0 |

## Source mix (Layer A=real-external, B=synthetic, C=app)

| source | rows |
|---|---|
| layerB:synthetic | 2000 |

## QC gates

| gate | pass | value |
|---|---|---|
| min_class_support | ❌ |  |
| exact_dup_rate_lt_15pct | ✅ | 7.8 |
| near_dup_rate_lt_30pct | ❌ | 43.3 |
| no_zero_texts | ✅ | 10 |

**Overall: ❌ FAILURES PRESENT**