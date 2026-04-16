# Simulasi Sistem Pembayaran Digital Berbasis Sistem Terdistribusi

Proyek ini merupakan simulasi sistem pembayaran digital yang dibuat untuk memahami dan membandingkan dua model komunikasi dalam sistem terdistribusi, yaitu Request-Response dan Publish-Subscribe.

---

## Tujuan
Mensimulasikan proses komunikasi antara client dan server serta menganalisis perbedaan karakteristik komunikasi sinkron dan asinkron dalam sistem terdistribusi.

---

## Teknologi yang Digunakan
- Python (Flask)
- MQTT (Eclipse Mosquitto)
- JavaScript (Frontend)
- HTML & CSS
- Server-Sent Events (SSE)

---

## Cara Menjalankan

### 1. Install dependensi
pip install -r requirements.txt

### 2. Jalankan MQTT Broker
mosquitto

### 3. Jalankan server
python app.py

### 4. Buka aplikasi di browser
http://127.0.0.1:5000

---

## Cara Kerja Sistem

1. User menginput nomor rekening dan nominal pembayaran
2. Client mengirim request ke server (Request-Response)
3. Server memvalidasi dan memproses transaksi
4. Server mengirim response ke client
5. Server mengirim notifikasi melalui MQTT (Publish-Subscribe)
6. Client menerima notifikasi secara real-time

---

## Fitur Utama

- Simulasi pembayaran digital
- Validasi rekening dan saldo
- Log komunikasi sistem
- Visualisasi alur komunikasi
- Notifikasi real-time
- Metrik performa komunikasi

---

## Dokumentasi Lengkap

Laporan lengkap dapat diakses melalui:
[Link Google Drive](https://drive.google.com/drive/folders/1qKFpxPSALMUY8xvjsAhwg0lt_LLIh_f2?usp=sharing)

---

## Author
Olivia Dafina  
NIM: 11231077
Sistem Paralel Terdistribusi A