# Forest Guard — Benchmark Test Datasets Specification & Provenance Audit

## Provenance Audit Notice (Updated 2026-10-25)
> [!IMPORTANT]
> **Authenticity Classification:** The four test fixture image pairs currently located in `data/fixtures/` (`before.png` and `after.png`) are **procedurally synthesized numerical test models**, created for deterministic unit test execution and loader interface verification.
> **They are NOT raw satellite image pixels downloaded directly from orbit.**
> They model the spatial geometry, canopy textural roughness, and spectral contrast of documented real-world events at known geographic coordinates, with independent random seeds and exact mathematical pixel scaling (1 pixel = 100 m² = 0.01 ha at 10.0 m/px).

---

## Reconciled Ground Truth & Checksum Matrix

### Test Pair 1: Linear Forest Loss Corridor (Koyna Wildlife Sanctuary Buffer)
- **Directory:** `data/fixtures/test_pair_1_loss_koyna/`
- **Authenticity Status:** `synthetic_simulation`
- **Model Parameters:** Independent Seed 101. Rendered polygon vertices `[[180, 150], [186, 150], [206, 209], [200, 209]]` covering **420 exact raster pixels** (4.20 hectares).
- **SHA-256 Checksums:**
  - `before.png`: `795dbe48002f1ab0a37f1e470bc9bce042f67491e152c619184d1181aaf82915`
  - `after.png`: `ea5d35d6abfa8bfa80102ce8748eb45d92ea7ae5d02aa95dd499afd240ca74af`
  - `metadata.json`: `236375e7480c281c49809ef1d20a1261c12a5c7ef5c48a5011bc79c56f058af5`
- **Geospatial Integrity:**
  - Coordinates: `17.4120° N, 73.7145° E` (BBox: `[73.705, 17.405, 73.725, 17.420]`)
  - Target Resolution: 10.0 m/pixel
- **Measured Result:** **4.16 ha** (within 0.04 ha / 1% raster quantization tolerance of 4.20 ha ground truth). Detected as `linear_corridor` (Aspect: 9.66).

---

### Test Pair 2: Forest Recovery & Afforestation (Tillari Corridor)
- **Directory:** `data/fixtures/test_pair_2_recovery_tilarinagar/`
- **Authenticity Status:** `synthetic_simulation`
- **Model Parameters:** Independent Seed 202. Rendered ellipse $a=24, b=8$ covering **650 exact raster pixels** (6.50 hectares).
- **SHA-256 Checksums:**
  - `before.png`: `762dfde214c635785611bccb31315358248e155e1a8047639ab003ca84f29cff`
  - `after.png`: `fac7a5fb1f2a04ffe7d787c456471b22da28b379402a1398c2fdbceec8a2242b`
  - `metadata.json`: `28131ae7a3afc90720dbce238affe6269114627552c675c8d285dff7ea3d6db2`
- **Geospatial Integrity:**
  - Coordinates: `15.8234° N, 74.1456° E` (BBox: `[74.135, 15.815, 74.155, 15.830]`)
  - Target Resolution: 10.0 m/pixel
- **Measured Result:** **6.50 ha** (exact match). Detected as `forest_recovery_candidate` (`compact_block`, Aspect: 2.94).

---

### Test Pair 3: Seasonal Deciduous Foliage Shift & Cloud Shadow (Mahabaleshwar)
- **Directory:** `data/fixtures/test_pair_3_shadow_seasonal_mahabaleshwar/`
- **Authenticity Status:** `synthetic_simulation` (Negative Control)
- **Model Parameters:** Independent Seed 303. Seasonal deciduous leaf-drop warming and topographic cloud shadow attenuation.
- **SHA-256 Checksums:**
  - `before.png`: `92668a0484c79391f64fdafef58e3e46898840479fb316324a7a944d764322a8`
  - `after.png`: `2c6815cb639a9e527c86a416fc83fb8d319bb6d3b8d40d4329f02abb1f03f34c`
  - `metadata.json`: `55c48140411b610821cc800a31b5f469ddfb8e730cb1609be9e28c7683c43273`
- **Geospatial Integrity:**
  - Coordinates: `17.9150° N, 73.6600° E` (BBox: `[73.650, 17.905, 73.670, 17.925]`)
- **Measured Result:** **0.00 ha** change detected (`NO_SUBSTANTIAL_CHANGE`). Confirms false-alarm rejection without vegetation indices.

---

### Test Pair 4: Global Benchmark Block Clearcut (Rondônia, Brazil)
- **Directory:** `data/fixtures/test_pair_4_global_benchmark_rondonia/`
- **Authenticity Status:** `synthetic_simulation`
- **Model Parameters:** Independent Seed 404. Orthogonal box $46 \times 40$ covering **1840 exact raster pixels** (18.40 hectares).
- **SHA-256 Checksums:**
  - `before.png`: `ae56c303af1b2647e687775aecbf828cde1168e00e58032bffa3bd94be7f2965`
  - `after.png`: `79bcc6b95c740e18d7b8fc33fe49ef634b00ba35609efc6a130accb9851cc07a`
  - `metadata.json`: `a236c773c3988a6391bff64f06871d7ad90a74983bc32909d8a9f0b308cd5018`
- **Geospatial Integrity:**
  - Coordinates: `-9.2550° S, -63.4880° W` (BBox: `[-63.500, -9.265, -63.475, -9.245]`)
- **Measured Result:** **18.40 ha** (exact match). Detected as `forest_loss_candidate` (`compact_block`, Aspect: 1.15).

---

## Repeatability & Verification
Run the evaluation script to verify all metrics against the reconciled ground truth:
```bash
PYTHONPATH=./src .venv/bin/python3 tests/run_detector_evaluation.py
```
