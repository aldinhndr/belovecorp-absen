CREATE DATABASE IF NOT EXISTS belove_absen
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE belove_absen;

CREATE TABLE IF NOT EXISTS stores (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nama VARCHAR(150) NOT NULL,
  latitude DOUBLE NOT NULL,
  longitude DOUBLE NOT NULL,
  radius_meter INT NOT NULL DEFAULT 150
);

CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nama VARCHAR(150) NOT NULL,
  email VARCHAR(191) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('karyawan', 'admin') NOT NULL DEFAULT 'karyawan',
  store_id INT NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_users_store FOREIGN KEY (store_id) REFERENCES stores(id)
);

CREATE TABLE IF NOT EXISTS random_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nama_barang VARCHAR(150) NOT NULL,
  qr_token VARCHAR(64) UNIQUE,
  aktif TINYINT(1) NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS attendances (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  tipe ENUM('masuk', 'pulang') NOT NULL,
  waktu DATETIME NOT NULL,
  latitude DOUBLE NOT NULL,
  longitude DOUBLE NOT NULL,
  alamat TEXT NULL,
  foto_path VARCHAR(255) NOT NULL,
  random_item_id INT NULL,
  jarak_meter DOUBLE NULL,
  di_luar_radius TINYINT(1) NOT NULL DEFAULT 0,
  INDEX idx_att_user (user_id),
  INDEX idx_att_waktu (waktu),
  CONSTRAINT fk_att_user FOREIGN KEY (user_id) REFERENCES users(id),
  CONSTRAINT fk_att_item FOREIGN KEY (random_item_id) REFERENCES random_items(id)
);

CREATE TABLE IF NOT EXISTS activities (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  deskripsi TEXT NOT NULL,
  waktu DATETIME NOT NULL,
  INDEX idx_act_user (user_id),
  INDEX idx_act_waktu (waktu),
  CONSTRAINT fk_act_user FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS daily_reports (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tanggal DATE NOT NULL,
  konten_text TEXT NOT NULL,
  sent_at DATETIME NULL,
  status ENUM('draft', 'sent') NOT NULL DEFAULT 'draft',
  UNIQUE KEY uq_daily_reports_tanggal (tanggal)
);

CREATE TABLE IF NOT EXISTS schedules (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  day_of_week ENUM('Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu') NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_schedule_user_day (user_id, day_of_week),
  CONSTRAINT fk_schedules_user FOREIGN KEY (user_id) REFERENCES users(id)
);
