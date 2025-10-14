# Panduan Menjalankan Modul Assessment Cloud Computing

## Daftar Isi
1. [Persiapan Environment](#persiapan-environment)
2. [Menjalankan Layanan](#menjalankan-layanan)
3. [Scaling Multiple Instances](#scaling-multiple-instances)
4. [Akses Dashboard Monitoring](#akses-dashboard-monitoring)
5. [Load Testing](#load-testing)
6. [Troubleshooting](#troubleshooting)

---

## Persiapan Environment

### Prasyarat
- Docker versi 20.10 atau lebih baru
- Docker Compose versi 1.29 atau lebih baru
- Minimal 8GB RAM tersedia
- Port yang dibutuhkan bebas: 80, 3000-3001, 6379, 8080-8082, 9090, 9093, 9100, 3001, 8081

### Cek Instalasi Docker
```bash
docker --version
docker-compose --version
```

### Clone Repository Modul
```bash
# Clone repository dari GitHub
git clone https://github.com/partadox/lsp-its-cloud-scenario.git

# Masuk ke directory project
cd lsp-its-cloud-scenario
```

---

## Menjalankan Layanan

### Mode 1: Jalankan Single Instance (Basic)
Untuk testing awal atau development:

```bash
# Build dan jalankan semua services
docker-compose up -d

# Cek status containers
docker-compose ps

# Lihat logs
docker-compose logs -f
```

**Services yang berjalan:**
- webapp: 1 instance
- api: 1 instance
- db: MySQL database
- redis: Cache server
- nginx: Load balancer
- prometheus: Metrics collector
- grafana: Dashboard monitoring
- alertmanager: Alert management
- node-exporter: Host metrics
- cadvisor: Container metrics

---

## Scaling Multiple Instances

### Mode 2: Jalankan Multiple Instances (Production-like)
Untuk simulasi high concurrency dan load testing:

```bash
# Jalankan dengan scaling
docker-compose -f docker-compose.yml -f docker-compose.scale.yml up -d --scale webapp=3 --scale api=2

# Verifikasi jumlah instances
docker-compose ps | grep -E "webapp|api"
```

**Konfigurasi Scaling:**
- webapp: 3 instances (ports 8080-8082)
- api: 2 instances (ports 3000-3001)

### Melihat Load Distribution
```bash
# Cek container yang running
docker ps --format "table {{.Names}}\t{{.Ports}}\t{{.Status}}"

# Monitor resource usage
docker stats
```

---

## Akses Dashboard Monitoring

### 1. Grafana Dashboard
- **URL:** http://localhost:3001
- **Username:** admin
- **Password:** admin

**Langkah-langkah:**
1. Login ke Grafana
2. Navigate ke Dashboards
3. Import dashboard atau buat dashboard baru
4. Pilih Prometheus sebagai data source

### 2. Prometheus
- **URL:** http://localhost:9090
- **Gunakan untuk:** Query metrics langsung, troubleshooting targets

**Cek Targets:**
1. Buka http://localhost:9090/targets
2. Pastikan semua targets dalam status "UP"
3. Untuk multiple instances, akan terlihat beberapa endpoint untuk webapp dan api

### 3. Alertmanager
- **URL:** http://localhost:9093
- **Gunakan untuk:** Manage alerts dan notifikasi

### 4. cAdvisor
- **URL:** http://localhost:8081
- **Gunakan untuk:** Monitor container metrics secara detail

### 5. Aplikasi Web
- **URL:** http://localhost:80 (melalui Nginx load balancer)
- **Direct access (scaled):**
  - webapp instances: http://localhost:8080, http://localhost:8081, http://localhost:8082
  - api instances: http://localhost:3000, http://localhost:3001

---

## Load Testing

### Persiapan Load Testing
```bash
# Install k6 jika belum (https://k6.io/docs/getting-started/installation/)
# Atau gunakan docker
docker pull grafana/k6
```

### Menjalankan Skenario Testing

#### Skenario 1: Basic Load Test
```bash
# Menggunakan k6 yang terinstall
k6 run load-test/scenario1.js

# Atau menggunakan Docker
docker run --rm -i --network host grafana/k6 run - <load-test/scenario1.js
```

#### Skenario 2: High Concurrency Test
```bash
k6 run load-test/scenario2.js
```

#### Skenario 3: Failover Test
```bash
k6 run load-test/scenario3.js
```

### Monitor Hasil Testing
1. Buka Grafana: http://localhost:3001
2. Lihat metrics real-time saat load test berjalan
3. Perhatikan:
   - CPU usage per container
   - Memory usage
   - Response time
   - Request rate
   - Error rate

---

## Monitoring Multiple Instances

### Melihat Metrics di Prometheus

1. **Cek semua API instances yang terdeteksi:**
```
up{job="api-service"}
```

2. **Cek semua Web App instances yang terdeteksi:**
```
up{job="web-app"}
```

3. **Request rate per instance:**
```
rate(http_requests_total[5m])
```

4. **Response time per instance:**
```
histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))
```

### Membuat Dashboard Grafana untuk Multiple Instances

1. Login ke Grafana
2. Create New Dashboard
3. Add Panel dengan queries:

**Panel 1: Instances Status**
```
up{job=~"api-service|web-app"}
```

**Panel 2: CPU Usage per Instance**
```
rate(container_cpu_usage_seconds_total{name=~".*api.*|.*webapp.*"}[5m]) * 100
```

**Panel 3: Memory Usage per Instance**
```
container_memory_usage_bytes{name=~".*api.*|.*webapp.*"} / 1024 / 1024
```

**Panel 4: Request Rate**
```
sum(rate(http_requests_total[5m])) by (instance)
```

---

## Troubleshooting

### Problem: Replicas Conflict Error
**Solusi:** Sudah diperbaiki dengan menghapus `deploy.replicas` dari docker-compose.yml. Gunakan `--scale` flag saat startup.

### Problem: Port Already in Use
```bash
# Cek port yang digunakan
sudo netstat -tulpn | grep LISTEN

# Atau di Windows/Mac
netstat -an | findstr LISTEN

# Stop service yang conflict atau ubah port di docker-compose.yml
```

### Problem: Prometheus Tidak Deteksi Multiple Instances
**Solusi:** Sudah diperbaiki dengan DNS service discovery di prometheus.yml. Restart Prometheus:
```bash
docker-compose restart prometheus
```

### Problem: Container Gagal Start
```bash
# Lihat logs detail
docker-compose logs [service-name]

# Contoh:
docker-compose logs api

# Rebuild jika perlu
docker-compose build --no-cache [service-name]
docker-compose up -d
```

### Problem: Database Connection Error
```bash
# Pastikan database sudah ready
docker-compose logs db

# Restart API services
docker-compose restart api

# Atau restart semua
docker-compose down
docker-compose up -d
```

### Problem: Grafana Dashboard Kosong
1. Cek Prometheus data source di Grafana
2. Go to Configuration > Data Sources
3. Test connection ke Prometheus
4. Pastikan URL: http://prometheus:9090

### Melihat Network Connectivity
```bash
# Cek network yang dibuat
docker network ls

# Inspect network
docker network inspect lsp-its-cloud-scenario_monitoring

# Test connectivity antar container
docker exec [container-name] ping [another-container]
```

---

## Menghentikan dan Membersihkan

### Stop Semua Services
```bash
docker-compose down
```

### Stop dan Hapus Volumes (HATI-HATI: Data akan hilang)
```bash
docker-compose down -v
```

### Cleanup Images
```bash
# Hapus unused images
docker image prune -a

# Hapus specific images
docker rmi $(docker images 'lsp-its-cloud-scenario*' -q)
```

---

## Tips dan Best Practices

### 1. Development Workflow
- Gunakan single instance untuk development
- Gunakan multiple instances untuk testing production-like scenarios

### 2. Monitoring Best Practices
- Selalu monitor resources saat scaling
- Set up alerts untuk kondisi abnormal
- Backup dashboard configurations

### 3. Load Testing Tips
- Mulai dengan load rendah, tingkatkan bertahap
- Monitor system resources saat testing
- Catat baseline metrics sebelum testing

### 4. Resource Management
```bash
# Set resource limits jika diperlukan
docker-compose --compatibility up -d

# Monitor resource usage
docker stats --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}"
```

### 5. Logs Management
```bash
# Limit log size di docker-compose.yml (sudah include di config)
# View logs specific service
docker-compose logs -f --tail=100 [service-name]

# Export logs
docker-compose logs > full-logs.txt
```

---

## Skenario Pengujian Lengkap

### Test Scenario 1: Basic Containerization
1. Start services: `docker-compose up -d`
2. Verify all services running: `docker-compose ps`
3. Access application: http://localhost:80
4. Check Grafana: http://localhost:3001
5. Run basic load test: `k6 run load-test/scenario1.js`

### Test Scenario 2: High Concurrency
1. Scale services: `docker-compose -f docker-compose.yml -f docker-compose.scale.yml up -d --scale webapp=3 --scale api=2`
2. Verify scaling: `docker-compose ps`
3. Check Prometheus targets: http://localhost:9090/targets
4. Run high load test: `k6 run load-test/scenario2.js`
5. Monitor metrics in Grafana

### Test Scenario 3: Fault Tolerance
1. Services running with scaling
2. Run failover test: `k6 run load-test/scenario3.js` (in background)
3. Simulate failure: `docker stop lsp-its-cloud-scenario_api_1`
4. Monitor recovery in Grafana
5. Check alerts in Alertmanager
6. Restart failed service: `docker-compose up -d`

---

## Quick Reference Commands

```bash
# Start services
docker-compose up -d

# Start with scaling
docker-compose -f docker-compose.yml -f docker-compose.scale.yml up -d --scale webapp=3 --scale api=2

# Check status
docker-compose ps

# View logs
docker-compose logs -f [service]

# Restart service
docker-compose restart [service]

# Stop all
docker-compose down

# Rebuild and start
docker-compose up -d --build

# Scale on the fly
docker-compose up -d --scale webapp=5 --scale api=3

# Monitor resources
docker stats

# Check network
docker network inspect lsp-its-cloud-scenario_monitoring
```
