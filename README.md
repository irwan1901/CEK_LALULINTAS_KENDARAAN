# LPR-Brand Vision 🚗🔍

Sistem inspeksi CCTV lalu lintas modern untuk Pengenalan Plat Nomor Otomatis (License Plate Recognition / ANPR / LPR) dan Pengenalan Merek Kendaraan (Vehicle Brand Recognition) berbasis AI multimodal (Google Gemini 3.8 Flash).

Antarmuka dirancang menyerupai monitor ruang kontrol pengawasan CCTV dengan tema gelap taktis, crosshairs, live HUD, dan overlay deteksi real-time.

---

## 🌟 Fitur Utama

- **Live CCTV Video Player & Canvas HUD**:
  - Pemutar video HTML5 dengan overlay canvas.
  - Tanda waktu CCTV warna merah (`CAM-01 [REC]`).
  - Indikator FPS pemrosesan frame secara real-time.
  - Poligon ROI (Region of Interest) interaktif yang dapat digambar klik-demi-klik.
  - Kotak pelacakan kendaraan biru/cyan dengan label `[car #ID]`.
- **Ekstraksi & Analisis Cerdas**:
  - Pengambilan sampel frame otomatis berdasarkan interval waktu yang ditentukan.
  - Deteksi objek kendaraan di dalam batas ROI.
  - Pemotongan (crop) area kendaraan secara teroptimasi (< 1 MB JPEG).
  - Panggilan AI aman melalui endpoint backend `/api/analyze` (menggunakan Gemini 3.8 Flash dengan JSON Schema terstruktur).
- **Algoritma Pelacakan & Voting di Browser**:
  - Pencocokan kendaraan antar frame menggunakan IoU (Intersection over Union) dengan penomoran unik `track_id`.
  - Sistem voting merek: Mengunci (lock) merek kendaraan setelah mencapai jumlah voting yang ditentukan (default: 3 kali berturut/konsisten) untuk efisiensi API.
  - Penentuan plat nomor berdasarkan frekuensi kemunculan terbanyak (tie-breaker: confidence tertinggi).
  - Pembatasan laju (rate limiting) maksimal 2 request/detik per sesi agar tidak membebani API dan mencegah duplikasi crop.
- **Panel Deteksi Terbaru**:
  - Menampilkan hingga 20 kartu deteksi terbaru (yang terbaru di atas) dengan bingkai kuning tipis.
  - Foto crop plat / bagian depan kendaraan.
  - Nomor plat dengan tipografi tebal monospace.
  - Label merek mobil (lowercase) disertai titik warna keyakinan:
    - 🟢 Hijau: Keyakinan tinggi (≥ 75%)
    - 🟡 Kuning: Keyakinan sedang (50% - 74%)
    - 🔴 Merah: Keyakinan rendah (< 50%)
  - Peringatan badge kuning "perlu cek" jika format plat tidak lolos validasi pola regex.
  - Nilai merek di bawah ambang batas (threshold) otomatis ditandai sebagai `unknown`.
- **Panel Pengaturan Fleksibel (Collapsible)**:
  - Ambang keyakinan merek (slider, default 0.25).
  - Jumlah voting penguncian merek (default 3).
  - Interval sampel frame (default 0.5 detik).
  - Filter merek yang diizinkan (multi-select 25 merek mobil terpopuler).
  - Pola regex validasi plat nomor (dapat disesuaikan).
- **Ekspor & Manajemen Data**:
  - Ekspor hasil analisis ke format **CSV** dan **JSON** (kolom: `track_id`, `plate`, `brand`, `brand_confidence`, `timestamp`).
  - Tombol **Hapus Data** untuk membersihkan memori dan crop.
- **Mode Demo Interaktif**:
  - Simulasi lalu lintas CCTV otomatis bawaan untuk mencoba aplikasi tanpa perlu mengunggah video sendiri.
- **Pemberitahuan Privasi (Privacy Notice)**:
  - Memastikan data plat nomor diproses secara etis di sisi browser klien dan tidak disimpan secara permanen.

---

## 🛠️ Environment Variables

Aplikasi ini membutuhkan variabel lingkungan berikut:

| Variabel | Keterangan | Wajib? |
| :--- | :--- | :--- |
| `GEMINI_API_KEY` | Kunci API Google AI Studio / Gemini API untuk analisis OCR plat dan merek mobil. | **Wajib** |
| `PORT` | Port server Express lokal (default: `3000`). | Opsional |

---

## 🚀 Panduan Deploy ke Vercel

Struktur proyek sudah disiapkan untuk deployment langsung ke Vercel:

### 1. Struktur Folder Vercel
- Frontend SPA: React + Vite di root project.
- Serverless Function: `api/analyze.ts` (secara otomatis dikenali oleh Vercel sebagai serverless route `/api/analyze`).

### 2. Langkah Deployment via Vercel Dashboard
1. Hubungkan repositori GitHub/GitLab Anda ke Vercel.
2. Vercel akan otomatis mendeteksi framework: **Vite**.
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
   - **Install Command**: `npm install`
3. Masuk ke tab **Environment Variables** di Vercel:
   - Tambahkan key: `GEMINI_API_KEY`
   - Masukkan nilai API key Gemini Anda dari Google AI Studio.
4. Klik **Deploy**.

### 3. File `vercel.json` (Opsional jika ingin rewrite routing)
Jika Anda membutuhkan rewrite SPA untuk client routing, file konfigurasi standar `vercel.json`:
```json
{
  "rewrites": [
    { "source": "/api/(.*)", "destination": "/api/$1" },
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

---

## 💻 Menjalankan di Lokal (Development)

1. Pasang dependensi:
   ```bash
   npm install
   ```
2. Buat file `.env` di direktori root dan masukkan:
   ```env
   GEMINI_API_KEY="AIzaSy..."
   PORT=3000
   ```
3. Jalankan server pengembang:
   ```bash
   npm run dev
   ```
4. Buka peramban di `http://localhost:3000`.

---

## 📄 Lisensi & Hak Cipta
Dirancang untuk keamanan lalu lintas, manajemen parkir pintar, dan surveillance modern.
