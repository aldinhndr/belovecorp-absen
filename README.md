# BeloveAbsen — Sistem Absensi Karyawan

Web absensi untuk karyawan toko BeloveCorp: absen masuk/pulang dengan GPS + foto barang random dari kamera, log kegiatan harian, laporan otomatis jam 21:00 WIB ke Telegram, dan dashboard admin.

## Stack

- Frontend: React + Vite
- Backend: FastAPI + JWT
- Database: MySQL 8
- Scheduler: APScheduler

## Keputusan default (open questions PRD)

- Grup: **Telegram** (bot API)
- Radius toko: **warning**, tidak memblokir absen
- **Multi-toko** didukung

## Jalankan cepat

### 1. MySQL

```bash
docker compose up -d mysql
# MySQL di localhost:3307 (user root / password)
```

Atau buat database `belove_absen` di phpMyAdmin, lalu import `backend/schema.sql`.

Sesuaikan `backend/.env` (`DATABASE_URL`).

### 2. Backend

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8002
```

Tabel dibuat otomatis saat startup, plus seed:

- Admin: `aldin@belovecorp.com` / `admin123`
- Karyawan: `karyawan@belovecorp.com` / `karyawan123`

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

Buka http://localhost:5173

## Telegram (laporan grup)

1. Buat bot via [@BotFather](https://t.me/BotFather)
2. Masukkan bot ke grup, ambil `chat_id`
3. Isi `TELEGRAM_BOT_TOKEN` dan `TELEGRAM_CHAT_ID` di `backend/.env`
4. Restart backend. Cron kirim jam 21:00 WIB, atau tombol **Kirim ke grup** di admin.

## Endpoint utama

| Method | Path | Keterangan |
| --- | --- | --- |
| POST | `/auth/login` | Login JWT |
| GET | `/random-item/next` | Barang random aktif |
| POST | `/attendance` | Absen (multipart foto + GPS) |
| GET | `/attendance/me` | Riwayat absen |
| POST | `/activities` | Log kegiatan |
| GET | `/activities/me` | Kegiatan hari ini |
| GET/PUT/POST | `/admin/daily-report*` | Preview, edit, kirim laporan |
| CRUD | `/admin/random-items` `/admin/stores` `/admin/users` | Master data |
