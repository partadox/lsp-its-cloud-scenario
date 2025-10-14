# Praktikum Sertifikasi Cloud Computing: Virtualisasi dan High Concurrency dengan Docker

Praktikum ini bertujuan untuk memahami konsep virtualisasi cloud computing dan high concurrency menggunakan Docker melalui tiga skenario pengujian yang dipantau dengan Grafana. Praktikum ini mengikuti standar SNI ISO/IEC 20000-9:2016 untuk arsitektur cloud computing.

## Deskripsi Praktikum

Praktikum ini dirancang untuk memenuhi kompetensi dalam skema okupasi Pengembang Cloud Computing. Peserta akan mempelajari dan mengimplementasikan arsitektur cloud yang memenuhi standar industri, dengan fokus pada:

1. Implementasi virtualisasi dengan Docker
2. Pengujian dan analisis konkurensi tinggi
3. Implementasi fault tolerance dan recovery

## Struktur Repositori

```
docker-cloud-praktikum/
├── docker-compose.yml                # Konfigurasi Docker Compose
├── init/                             # Script inisialisasi
│   ├── 01-schema.sql                 # Struktur database
│   └── 02-api.js                     # Konfigurasi API
├── services/                         # Layanan containerized
│   ├── web-app/                      # Aplikasi web
│   ├── api-service/                  # Layanan API
│   ├── database/                     # Database
│   └── cache/                        # Layanan cache
├── monitoring/                       # Konfigurasi monitoring
│   ├── grafana/                      # Dashboard Grafana
│   ├── prometheus/                   # Konfigurasi Prometheus
│   └── alertmanager/                 # Konfigurasi alert
├── load-test/                        # Script pengujian beban
│   ├── scenario1.js                  # Skenario beban standar
│   ├── scenario2.js                  # Skenario konkurensi tinggi
│   └── scenario3.js                  # Skenario failover
└── dokumentasi/                      # Templat dokumentasi
    ├── implementasi.md               # Templat dokumentasi implementasi
    ├── pengujian.md                  # Templat dokumentasi pengujian
    └── evaluasi.md                   # Templat dokumentasi evaluasi
```

## Skenario Pengujian

### Skenario 1: Implementasi Basic Containerization

- Tujuan: Memahami dasar virtualisasi dengan Docker
- Aktivitas:
  - Membuat image Docker untuk aplikasi sederhana
  - Menjalankan multiple container dengan Docker Compose
  - Memantau performa dasar dengan Grafana
  - Menghitung metrik dasar (CPU, memory, throughput)

### Skenario 2: High Concurrency Testing

- Tujuan: Menguji performa sistem saat konkurensi tinggi
- Aktivitas:
  - Mengkonfigurasi load balancer dengan Nginx
  - Menskalakan layanan secara horizontal
  - Melakukan stress test dengan 1000+ koneksi simultan
  - Memantau metrik performa dan respons sistem
  - Mengidentifikasi bottleneck dan melakukan optimasi

### Skenario 3: Fault Tolerance dan Recovery

- Tujuan: Mengimplementasikan dan menguji ketahanan sistem
- Aktivitas:
  - Mengkonfigurasi sistem replication untuk database
  - Mensimulasikan kegagalan node/container
  - Mengukur waktu recovery dan dampak pada end-user
  - Mengimplementasikan sistem alerting otomatis

## Persiapan Environment

### Menggunakan Docker

1. Install Docker dan Docker Compose di komputer
2. Clone repositori praktikum
3. Jalankan container dengan perintah:

```bash
docker-compose up -d
```

4. Akses dashboard monitoring:
   - Grafana: http://localhost:3000
   - Prometheus: http://localhost:9090

## Penilaian Praktikum

Peserta akan dinilai berdasarkan:

1. **Implementasi Virtualisasi (40%)**

   - Keberhasilan menjalankan semua container
   - Konfigurasi Docker yang optimal dan aman
   - Implementasi networking yang tepat

2. **Pengujian dan Analisis Konkurensi (30%)**

   - Hasil stress test pada semua skenario
   - Analisis bottleneck dan solusi yang diterapkan
   - Efektivitas strategi scaling yang diimplementasikan

3. **Dokumentasi dan Presentasi (30%)**
   - Kelengkapan dokumentasi implementasi
   - Kualitas analisis hasil pengujian
   - Kemampuan menjelaskan arsitektur dan keputusan teknis

## Alur Praktikum

1. **Persiapan**

   - Setup environment Docker
   - Memahami struktur aplikasi dan repository
   - Menjalankan container dasar

2. **Implementasi**

   - Implementasi ketiga skenario
   - Konfigurasi monitoring Grafana
   - Pengujian awal

3. **Pengujian**

   - Menjalankan stress test untuk setiap skenario
   - Mengumpulkan data dan metrik performa
   - Melakukan analisis awal

4. **Dokumentasi dan Finalisasi**

   - Menyusun dokumentasi implementasi
   - Analisis hasil pengujian
   - Persiapan presentasi

5. **Presentasi**
   - Presentasi hasil dan temuan
   - Demo live dari implementasi
   - Tanya jawab dengan asesor

## Kriteria Evaluasi (Sesuai SNI ISO/IEC 20000-9:2016)

1. **Performance**

   - Response time
   - Throughput
   - Resource utilization

2. **Reliability**

   - Availability
   - Fault tolerance
   - Recovery capability

3. **Integration**
   - Service interoperability
   - Monitoring integration
   - Alerting effectiveness

## Referensi

- [Docker Documentation](https://docs.docker.com/)
- [Docker Compose](https://docs.docker.com/compose/)
- [Grafana Documentation](https://grafana.com/docs/)
- [Prometheus Documentation](https://prometheus.io/docs/introduction/overview/)
- [k6 Load Testing](https://k6.io/docs/)
- [SNI ISO/IEC 20000-9:2016](https://www.iso.org/standard/70901.html)

## Modul Author

Arta Kusuma Hernanda
