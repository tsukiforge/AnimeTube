# AnimeTube 🎬

**Nonton video anime gratis tanpa login.**

AnimeTube adalah aplikasi web fan-made (non-komersial) yang mengumpulkan video anime dari YouTube melalui **YouTube Data API v3**. Bukan situs streaming ilegal: kami hanya **agregator** — semua video tetap diputar langsung dari server YouTube, dan kami tidak meng-host atau mengunggah konten apa pun.

URL produksi: **[https://animtubev1.vercel.app](https://animtubev1.vercel.app)**

---

## 🧭 Apa Tujuan Proyek Ini?

Proyek ini dibuat untuk memberikan pengalaman **menjelajah video anime yang bebas, modern, dan aman**, tanpa harus login ke akun YouTube:

1. **Eksplorasi tanpa hambatan** — semua konten bisa ditonton langsung, tanpa akun, tanpa paywall.
2. **Aman untuk umum** — semua pencarian memakai `safeSearch: strict` plus filter konten family-friendly di sisi klien.
3. **Pengalaman ala platform modern** — feed campuran (video panjang / Shorts / Live) yang disusun menyerupai YouTube.
4. **Bisa dipakai di mana saja** — web (desktop & HP) plus aplikasi **Android & iOS** hasil build Capacitor.

Kami tidak memiliki kontrol atas apa yang diunggah oleh pembuat konten di YouTube. AnimeTube hanya menampilkan apa yang sudah tersedia secara publik di sana.

## ✨ Fitur Utama

- **Feed ala YouTube** — halaman beranda menyusun video panjang, Shorts, dan Live stream dalam satu aliran seperti platform modern.
- **Kategori lengkap** — genre (Action, Adventure, Comedy, Drama, Fantasy, Sci-Fi, Mystery, Romance), demografi (Shonen, Shojo, Seinen, Josei), dan tema khusus (Isekai, Slice of Life, Sports, Supernatural, Mecha, Music).
- **Pencarian dengan filter ketat** — `safeSearch: strict` di semua request YouTube + filter konten yang menyingkirkan konten dewasa, kekerasan ekstrem, dan hal tidak pantas.
- **Mode Shorts** — pengalaman menonton video pendek vertical, mirip YouTube Shorts.
- **Seksi Live & Premier** — daftar live stream anime 24/7 dan jadwal premier.
- **Kanal anime populer** — halaman khusus Crunchyroll, Muse Asia, Ani-One, dan lainnya.
- **Musik anime** — seksi Popular Music yang menonjolkan video musik anime.
- **Setting pengguna** — pilih region konten & tema gelap/terang (tersimpan di localStorage).
- **Aplikasi mobile (Android/iOS)** — dibuat dengan Capacitor; hasil build di-upload otomatis ke **GitHub Releases** setiap push ke `main`.
- **SEO-friendly** — meta tag dinamis per halaman, JSON-LD structured data, dan sitemap untuk Google Search Console.

## 📱 Aplikasi Mobile

AnimeTube bisa dijalankan sebagai aplikasi Android & iOS berkat [Capacitor](https://capacitorjs.com):

- **Build otomatis di GitHub Actions** — setiap push ke `main` menghasilkan:
  - `animetube.apk` — APK release Android (ditandatangani jika secret keystore diset)
  - `animetube-release.aab` — bundle Android untuk Play Store
  - `animetube-ios.app.zip` — aplikasi iOS (unsigned, untuk simulator)
- **GitHub Release** — semua artifact di-upload otomatis ke Release berserta changelog dari commit terbaru.
- **API endpoint** — aplikasi mobile memakai `VITE_API_BASE` (default `https://animtubev1.vercel.app`) sebagai backend proxy; tidak perlu key YouTube di perangkat.

### Cara build manual (opsional)

```bash
npm run build            # 1. build web bundle ke dist/
npx cap sync android     # 2. sinkronkan platform (android | ios)
npx cap open android     # 3. buka di Android Studio / Xcode
```

> Untuk build release Android yang ditandatangani, lihat `.github/workflows/mobile-build.yml` — gunakan GitHub Secrets: `KEYSTORE_BASE64`, `KEYSTORE_PASSWORD`, `KEYSTORE_ALIAS`, `KEYSTORE_ALIAS_PASSWORD`.

## 🚀 Cara Menjalankan di Lokal

```bash
# 1. Install dependency
npm install --legacy-peer-deps

# 2. Buat file .env (root project)
YOUTUBE_API_KEY=YOUR_KEY_HERE

# 3. Jalankan development server
npm run dev
```

Buka `http://localhost:5173` di browser.

## 🔧 Konfigurasi

| Variabel | Kegunaan | Dimana |
| --- | --- | --- |
| `YOUTUBE_API_KEY` | API key YouTube Data API v3 | `.env` lokal / Vercel Environment Variables |
| `VITE_API_BASE` | Base URL API proxy untuk aplikasi mobile | GitHub Repository Variable (Actions) |

- **Di lokal**: proxy API berjalan di server Vite (`/api/youtube`), jadi key tidak pernah bocor ke browser.
- **Di produksi (Vercel)**: proxy berjalan sebagai serverless function (`api/youtube.ts`).
- **Di aplikasi mobile**: bundle memanggil `VITE_API_BASE` (mis. `https://animtubev1.vercel.app`) sehingga key YouTube tetap aman di server.

## 🧩 Struktur Proyek

```
src/
├── components/          # UI: Navbar, Sidebar, VideoCard, ShortsCard, AdSlot, Footer, dll.
├── hooks/               # useRegion, useTheme, useSeo
├── lib/
│   ├── youtube.functions.ts  # semua request YouTube API + filter + penataan feed
│   ├── content-filter.ts     # aturan family-friendly
│   ├── constants.ts          # daftar kategori & genre
│   ├── format.ts             # utilitas format (views, durasi, waktu)
│   └── seo.ts                # meta tag dinamis per halaman
├── routes/              # TanStack Router: index, shorts, live, channels, watch, search, dll.
└── main.tsx             # entry point
api/youtube.ts           # serverless proxy Vercel (memakai YOUTUBE_API_KEY)
android/ ios/            # platform Capacitor (dibuat otomatis oleh CI)
scripts/                 # utilitas CI (signing keystore, dll.)
.github/workflows/       # GitHub Actions: build mobile + release
public/                  # sitemap.xml, robots.txt, ads.txt, favicon
```

## 🛡️ Komitmen Keamanan & Tanggung Jawab

- Semua pencarian memakai `safeSearch: strict` milik YouTube.
- Filter tambahan menyingkirkan konten dewasa, kekerasan ekstrem, dan konten tidak pantas.
- Disclaimer legal terpasang di About & Footer: **pengguna bertanggung jawab atas apa yang mereka cari dan tonton**.
- Kami tidak mendukung, meng-host, atau bertanggung jawab atas konten pihak ketiga di YouTube.

> Dengan menggunakan aplikasi ini, pengguna dianggap telah memahami bahwa konten yang mereka akses adalah tanggung jawab pribadi mereka.

## 📌 Catatan Teknis

- Semua pencarian kategori otomatis menambahkan kata kunci `anime` agar hasil tetap relevan.
- Feed beranda menggunakan penimbangan berbasis durasi (video pendek/sedang/panjang/live) menyerupai algoritma penemuan YouTube.
- Kanal & genre di-cache di localStorage untuk meminimalkan pemakaian kuota API.
- Sitemap & robots.txt di `public/` — submit `https://animtubev1.vercel.app/sitemap.xml` di Google Search Console.

## ⚠️ Disclaimer

Website ini hanya menampilkan konten pihak ketiga melalui YouTube Data API. Proyek ini **tidak berafiliasi** dengan YouTube, Google, atau studio anime mana pun, dan bersifat **non-komersial** — dibuat sebagai alat eksplorasi dan eksperimen.

---

_Dibuat dengan tanggung jawab oleh tim AnimeTube._
