# Dokumentasi Pengujian

## Metodologi Pengujian

Pengujian dilaksanakan dengan tiga skenario berbeda untuk mengevaluasi performa, ketahanan, dan kemampuan failover sistem. Pengujian menggunakan k6 sebagai load testing tool dan memanfaatkan Grafana untuk visualisasi hasil.

## Lingkungan Pengujian

- **Hardware**: [Spesifikasi hardware yang digunakan]
- **Network**: [Spesifikasi jaringan]
- **Docker Version**: [Versi Docker]
- **Load Test Tool**: k6
- **Metrics Collection**: Prometheus
- **Visualisasi**: Grafana

## Skenario 1: Basic Containerization

### Tujuan
Menguji performa dasar sistem dengan beban normal untuk memvalidasi implementasi containerization.

### Konfigurasi
- Durasi: 4 menit
- Jumlah Virtual Users: 50-100
- Request Rate: ~10-50 request/detik

### Hasil

| Metrik                | Target     | Hasil    | Status    |
|-----------------------|------------|----------|-----------|
| Throughput            | 100 RPS    | ___ RPS  | [PASS/FAIL] |
| Response Time (avg)   | <100ms     | ___ms    | [PASS/FAIL] |
| Response Time (p95)   | <500ms     | ___ms    | [PASS/FAIL] |
| Error Rate            | <1%        | ___%     | [PASS/FAIL] |
| CPU Utilization       | <50%       | ___%     | [PASS/FAIL] |
| Memory Utilization    | <60%       | ___%     | [PASS/FAIL] |

### Visualisasi Hasil
[Screenshot Grafana dashboard hasil pengujian]

### Analisis
[Analisis hasil pengujian, termasuk bottleneck yang ditemukan dan optimasi yang dilakukan]

## Skenario 2: High Concurrency

### Tujuan
Menguji kemampuan sistem untuk menangani konkurensi tinggi dengan beban heavy load dan mengidentifikasi bottleneck.

### Konfigurasi
- Durasi: 9 menit
- Jumlah Virtual Users: 100-1000
- Request Rate: ~500-1000 request/detik

### Hasil

| Metrik                | Target     | Hasil    | Status    |
|-----------------------|------------|----------|-----------|
| Throughput            | 500 RPS    | ___ RPS  | [PASS/FAIL] |
| Response Time (avg)   | <200ms     | ___ms    | [PASS/FAIL] |
| Response Time (p95)   | <800ms     | ___ms    | [PASS/FAIL] |
| Error Rate            | <5%        | ___%     | [PASS/FAIL] |
| CPU Utilization       | <80%       | ___%     | [PASS/FAIL] |
| Memory Utilization    | <80%       | ___%     | [PASS/FAIL] |

### Visualisasi Hasil
[Screenshot Grafana dashboard hasil pengujian]

### Analisis
[Analisis hasil pengujian, termasuk bottleneck yang ditemukan dan optimasi yang dilakukan]

## Skenario 3: Fault Tolerance dan Recovery

### Tujuan
Menguji ketahanan sistem saat terjadi kegagalan komponen dan kemampuan pemulihan secara otomatis.

### Konfigurasi
- Durasi: 5 menit
- Jumlah Virtual Users: 200
- Request Rate: ~100-200 request/detik
- Failover Trigger: Manual shutdown salah satu container pada menit ke-3

### Hasil

| Metrik                | Target     | Hasil    | Status    |
|-----------------------|------------|----------|-----------|
| Throughput            | 100 RPS    | ___ RPS  | [PASS/FAIL] |
| Response Time (avg)   | <300ms     | ___ms    | [PASS/FAIL] |
| Response Time (p95)   | <1000ms    | ___ms    | [PASS/FAIL] |
| Error Rate            | <10%       | ___%     | [PASS/FAIL] |
| Failover Time         | <30s       | ___s     | [PASS/FAIL] |
| Data Loss             | 0          | ___      | [PASS/FAIL] |

### Visualisasi Hasil
[Screenshot Grafana dashboard hasil pengujian]

### Analisis
[Analisis hasil pengujian, termasuk observasi saat failover dan recovery]

## Perbandingan Skenario

### Performa

| Skenario              | Throughput (RPS) | Response Time (ms) | Error Rate (%) |
|-----------------------|------------------|---------------------|----------------|
| Basic Containerization | ___             | ___                | ___            |
| High Concurrency      | ___             | ___                | ___            |
| Fault Tolerance       | ___             | ___                | ___            |

### Resource Utilization

| Skenario              | CPU (%) | Memory (%) | Network (Mbps) |
|-----------------------|---------|------------|----------------|
| Basic Containerization | ___    | ___        | ___            |
| High Concurrency      | ___    | ___        | ___            |
| Fault Tolerance       | ___    | ___        | ___            |

## Kesimpulan dan Rekomendasi

[Isian peserta untuk kesimpulan hasil pengujian dan rekomendasi]
