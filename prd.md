# PRD — Sistem Absensi Karyawan

BELOVECORP INDONESIA · ReactFastAPIMySQL

## 1. Ringkasan

Sistem absensi berbasis web untuk karyawan toko. Karyawan absen manual lewat website, sistem mencatat waktu, lokasi (geolocation), dan mewajibkan foto barang random sebagai bukti kehadiran real-time. Karyawan juga mencatat log kegiatan harian. Sistem menyusun laporan harian otomatis yang dikirim ke grup, dan tersedia dashboard admin untuk Aldin_Hndr.

## 2. Tech Stack

- **Frontend:** React (Vite) — SPA, kamera via `getUserMedia`, lokasi via `navigator.geolocation`
- **Backend:** FastAPI (Python) — REST API, auth JWT, scheduler (APScheduler) untuk laporan harian
- **Database:** MySQL, dikelola via phpMyAdmin
- **Storage foto:** lokal server (folder `/uploads`) atau S3-compatible, di-link ke path di DB

## 3. Role & Aktor

- **Karyawan** — absen masuk/pulang, isi log kegiatan
- **Admin (Aldin_Hndr)** — lihat dashboard, kelola daftar barang random, kelola karyawan/toko, trigger/edit laporan sebelum dikirim ke grup

## 4. Functional Requirements

### 4.1 Absensi

- Karyawan login → tombol "Absen Masuk" / "Absen Pulang"
- Sistem ambil koordinat GPS browser, cocokkan radius toko (opsional, warning jika di luar radius — tidak wajib blokir)
- Sistem pilih 1 nama barang random aktif dari tabel `random_items`
- Karyawan wajib foto barang tsb langsung dari kamera (tidak boleh upload dari galeri) sebelum submit
- Data tersimpan: user, tipe (masuk/pulang), waktu server, lat/long, alamat (reverse geocode), foto, item yang diminta

### 4.2 Log Kegiatan

- Karyawan bisa tambah entry kegiatan bebas kapan saja selama shift (multi-entry per hari)
- Setiap entry: deskripsi teks + timestamp otomatis

### 4.3 Laporan Harian

- Cron job jam tertentu (mis. 21:00 WIB) mengumpulkan semua `activities` per karyawan per tanggal
- Generate teks format:

  ```
  {Hari}, {tanggal}
  Activity:
  - {kegiatan 1}
  - {kegiatan 2}
  ```
- Laporan gabungan semua karyawan dikirim ke grup (channel dikonfirmasi kemudian: WhatsApp/Telegram)
- Admin bisa lihat & edit draft laporan sebelum terkirim (opsional tombol "kirim manual")

### 4.4 Dashboard Admin

- Rekap kehadiran per karyawan per periode (tabel + filter tanggal)
- Lihat foto & lokasi tiap absen
- CRUD daftar `random_items`
- CRUD karyawan & toko

## 5. Non-Functional Requirements

- Auth JWT, password hashing (bcrypt)
- Foto disimpan dengan nama unik (UUID), validasi tipe file (jpg/png) & ukuran maks (mis. 5MB)
- Server waktu sebagai source of truth (bukan waktu device client) untuk cegah manipulasi jam
- Responsive — mayoritas akses dari HP karyawan

## 6. Skema Database

| Tabel | Kolom Utama |
| --- | --- |
| `users` | id, nama, email, password_hash, role(karyawan/admin), store_id |
| `stores` | id, nama, latitude, longitude, radius_meter |
| `random_items` | id, nama_barang, aktif |
| `attendances` | id, user_id, tipe(masuk/pulang), waktu, latitude, longitude, alamat, foto_path, random_item_id |
| `activities` | id, user_id, deskripsi, waktu |
| `daily_reports` | id, tanggal, konten_text, sent_at, status |

## 7. API Endpoints (FastAPI)

| Method | Endpoint | Keterangan |
| --- | --- | --- |
| POST | `/auth/login` | Login, return JWT |
| GET | `/random-item/next` | Ambil 1 barang random aktif |
| POST | `/attendance` | Submit absen (multipart: foto + lokasi + tipe) |
| GET | `/attendance/me` | Riwayat absen user login |
| POST | `/activities` | Tambah log kegiatan |
| GET | `/activities/me?date=` | List kegiatan per tanggal |
| GET | `/admin/attendances` | Rekap semua karyawan (admin) |
| GET | `/admin/daily-report?date=` | Preview laporan harian |
| POST | `/admin/daily-report/send` | Trigger kirim manual ke grup |
| CRUD | `/admin/random-items` | Kelola daftar barang |

## 8. Integrasi Grup

Menunggu konfirmasi platform grup:

- **Telegram** — Bot API, gratis, setup cepat (rekomendasi)
- **WhatsApp** — perlu provider (Fonnte/Wablas) atau Baileys (unofficial, rawan ban)

## 9. Roadmap

- **Fase 1:** Auth + skema DB + setup FastAPI/React project
- **Fase 2:** Modul absen (lokasi + kamera + random item)
- **Fase 3:** Modul log kegiatan
- **Fase 4:** Generator + scheduler laporan harian
- **Fase 5:** Integrasi kirim ke grup
- **Fase 6:** Dashboard admin

## 10. Open Questions

- Platform grup: WhatsApp atau Telegram?
- Radius toko wajib blokir absen atau cukup warning?
- Satu toko atau multi-toko (multi-cabang)?
