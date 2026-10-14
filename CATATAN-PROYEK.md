# Catatan Proyek – Website ExtraCourse

Ringkasan untuk melanjutkan pengembangan di chat baru. Baca file ini dulu sebelum mengubah apa pun.

## Arah proyek

- Website ini fokus pada **game dan aktivitas belajar yang menyenangkan**.
- Data administratif (absensi, pendaftaran lengkap, laporan orang tua) **tidak** ada di sini; semuanya dikelola di spreadsheet.
- Pengguna: siswa les ExtraCourse dengan jenjang SD, SMP, SMA, Kuliah S1, Kuliah S2, dan Umum.

## Teknologi

- HTML/CSS/JS statis, tanpa build step. Firebase **9.23.0** dari CDN gstatic.
- Firebase Auth (email/password) dan Firestore, project `extra-course-d02c2`.
- Konfigurasi bersama ada di **`ec-common.js`**: config Firebase, `ADMIN_EMAIL`, daftar jenjang (`LEVELS`), helper nama pengguna, helper minggu peringkat (WIB), `shortName`, `escapeHtml`, dan `friendlyAuthError`.
- Aturan keamanan ada di **`firestore.rules`**, dengan penjelasan di **`KEAMANAN.md`**. Aturan **harus ditempel manual** ke Firebase Console → Firestore → Rules setiap kali berubah.

## Halaman

| File | Isi |
|---|---|
| `index.html` | Masuk (email **atau** nama pengguna) & daftar (nama, email, password, **kode kelas**) |
| `user-dashboard.html` | Dashboard siswa: akun, peringkat minggu ini, progres latihan game |
| `leaderboard.html` | Papan peringkat mingguan: Semua Jenjang (default) / per jenjang, minggu ini / lalu, kartu poster 1080×1350 untuk diunduh |
| `admin.html` | Admin: siswa (buat akun tanpa email, ubah jenjang/nama, hapus akun), kode kelas, skor game |
| `admin-login.html` | Login admin |
| `gamelist.html` | Daftar game |
| `game-scores.js` | Modul simpan skor (lihat di bawah) |

## Game yang ada

| File | gameId | Simpan skor? |
|---|---|---|
| `kosakata 2.html` | `kosakata-2` | Ya |
| `kosakata 3.html` | `kosakata-3` | Ya |
| `kosakata 4.html` (verb V1-V2-V3) | `kosakata-4` | Ya |
| `kosakata 5.html` (hafalan tanpa salah) | `kosakata-5` | Ya (`points` = jumlah salah sebelum tuntas) |
| `scramble.html` | `scramble` | Ya (`points` = skor game) |
| `kosakatapart2.html` | – | Tidak (tanpa skor) |
| `question.html` | – | Tidak (pengacak pertanyaan) |
| `chat real 1.html` | – | Tidak (memakai project Firebase lain: `ask-me-questions-25b22`) |

Catatan: nama file berspasi masih dipertahankan agar tautan lama tidak rusak.

## Cara menyambungkan game ke skor & papan peringkat

1. Sebelum `</body>`: `<script type="module" src="game-scores.js"></script>`
2. Saat permainan selesai:
   ```js
   window.saveGameScore?.({
     gameId: "id-game-unik", gameName: "Nama Game",
     correct: 8, total: 10,          // wajib, bilangan bulat, correct <= total <= 1000
     points: 950, mode: "timed",     // opsional
   });
   ```
3. **1 jawaban benar = 1 poin** di papan peringkat. Minggu dihitung Senin 00.00 – Minggu 23.59 WIB.
4. Skor hanya tersimpan jika siswa login dan profilnya masih ada. Jika tidak, muncul notifikasi kecil.

## Data Firestore

- `users/{uid}`: name, role "Student", email, level, classCode, loginType ("email"/"username"), createdAt, lastLoginAt
- `classCodes/{KODE}`: level, note, active, createdAt
- `gameScores/{id}`: userId, userName, gameId, gameName, correct, total, percent, points?, mode?, level?, week ("YYYY-MM-DD" Senin), timestamp
- Akun tanpa email memakai email sintetis `<namapengguna>@siswa.extra-course-d02c2.firebaseapp.com`.

## Preferensi pemilik

- Tampilan harus **rapi di HP dan PC** (cek kedua ukuran).
- **Jangan banyak ikon/emoji dekoratif.** Medali 🥇🥈🥉 boleh karena memberi kesan pemenang.
- Bahasa Indonesia di semua teks untuk siswa.
- Kerjakan pelan-pelan, satu fitur per langkah; jelaskan dengan bahasa sederhana.
- Fitur berat yang tidak perlu (mis. tombol Bagikan) lebih baik ditiadakan.

## Keterbatasan yang diketahui

- Password akun nama pengguna tidak bisa direset dari website (Firebase gratis, tanpa server).
- Hapus akun dari admin menghapus profil + skor; akun login terhapus saat siswa mencoba masuk lagi.
- Skor sebelum fitur peringkat tidak punya field `week`, jadi tidak dihitung di papan peringkat.
