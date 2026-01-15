# Mahasiswa Web Scrapper-autoabsen

Bot WhatsApp yang terintegrasi dengan **Web Mahasiswa** (Sistem Informasi Akademik) untuk mahasiswa. Bot ini memiliki fitur login otomatis, pengecekan jadwal kuliah/ujian, informasi profil, dan **auto absen** (presensi otomatis).

## Fitur Utama

-   **Login Otomatis:** Login ke Web Mahasiswa menggunakan NIM dan Password.
-   **Jadwal Kuliah:** Cek jadwal kuliah harian (`.jadwal`).
-   **Jadwal Ujian:** Cek jadwal ujian tengah dan akhir semester (`.jadwalujian`).
-   **Auto Absen:** Memantau halaman presensi secara otomatis dan melakukan presensi jika tombol tersedia (`.autoabsen` dan `.stopabsen`).
-   **Auto Stop:** Otomatis menghentikan auto absen jika pengguna logout (`.logout`).
-   **Broadcast:** Mengirim pesan ke semua pengguna saat bot baru dijalankan.
-   **LID Mapping:** Dukungan untuk nomor WhatsApp anonim (LID) dengan verifikasi otomatis/manual.

## Teknologi & Library

### Backend
-   **Runtime:** Node.js
-   **Framework:** Express.js
-   **Bot Engine:** @whiskeysockets/baileys (WhatsApp Web API)
-   **Scraping:** Puppeteer (Headless Chrome)
-   **Database:** SQLite3
-   **Utilities:** Dotenv, QRCode Terminal, Cors, JSDOM

### Dashboard (Frontend)
-   **Framework:** Next.js (React)
-   **Styling:** Tailwind CSS, PostCSS
-   **Icons:** Lucide React

## Prasyarat

-   Node.js (v18+)
-   NPM / Yarn
-   Koneksi Internet (untuk WhatsApp dan akses Web)
-   Chromium/Chrome (diunduh otomatis oleh Puppeteer)

## Instalasi

1.  **Clone Repository**
    ```bash
    git clone https://github.com/username/auto-absen.git
    cd auto-absen/backend
    ```

2.  **Install Dependencies**
    ```bash
    npm install
    ```

3.  **Konfigurasi Environment**
    Buat file `.env` di dalam folder `backend/` (lihat `.env.example` jika ada, atau sesuaikan dengan konfigurasi DB).
    ```env
    SERVICE_PORT=4000
    ```

4.  **Database**
    Bot menggunakan SQLite (`backend/db/siadin_user.db`). Jalankan inisialisasi jika diperlukan (biasanya otomatis atau via script `init.js`).

## Penggunaan

1.  **Jalankan Bot**
    ```bash
    node index.js
    ```
    Atau gunakan `nodmeon` untuk development:
    ```bash
    npm run dev
    ```

2.  **Scan QR Code**
    Terminal akan menampilkan QR Code. Scan menggunakan aplikasi WhatsApp di HP Anda (Linked Devices).

3.  **Command Bot**
    Kirim pesan ke nomor WhatsApp bot:
    
    -   `.siadin` - Menampilkan menu bantuan.
    -   `.login` - Login ke akun (pastikan data user sudah ada di DB).
    -   `.logout` - Logout dan hentikan auto absen.
    -   `.jadwal` - Lihat jadwal kuliah hari ini.
    -   `.jadwalujian` - Lihat jadwal ujian.
    -   `.absen` - Cek presensi manual.
    -   `.autoabsen` - Mulai pemantauan presensi otomatis (interval 1 menit).
    -   `.stopabsen` - Hentikan auto absen manual.

## Struktur Project

-   `backend/` - Kode utama backend Node.js.
    -   `services/` - Layanan logika bisnis (Web Scraper, WA Bot, API).
        -   `siadin/` - Logika scraping (Auth, Schedule, Attendance).
        -   `wa-bot/` - Logika bot WhatsApp.
    -   `utilities/` - Helper function (jika ada).
    -   `lib/` - Manager browser (`browserManager.js`).
    -   `db/` - Koneksi dan file database SQLite.

## Troubleshooting

-   **Unregistered User / Unknown LID**: 
    Jika bot tidak mengenali nomor Anda, balas pesan bot dengan nomor WhatsApp asli Anda (contoh: `0857xxxx`) untuk verifikasi pemetaan ID.
-   **Browser Error**:
    Pastikan tidak ada instance Chrome yang nyangkut. Restart bot jika perlu.

## Lisensi

[MIT](LICENSE)
