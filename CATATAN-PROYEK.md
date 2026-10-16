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
| `admin.html` | Admin: siswa (buat akun tanpa email, ubah jenjang/nama, hapus akun), kode kelas, **paket soal**, **pengumuman**, skor game |
| `admin-login.html` | Login admin |
| `gamelist.html` | Daftar game (Berpoin / Latihan) |
| `game-ui.css` | **Gaya bersama seluruh website** (lihat "Tampilan" di bawah): token warna + mode gelap, header, navigasi bawah, kartu, tombol, isian, komponen game. `admin.html` punya salinan token sendiri di `<style>` (karena kelas `nav.tabs` admin berbeda) |
| `word-source.js` | `mountWordSource` (opsi `type`: "kosakata" / "verb" / "kalimat", kolom di `PACK_FIELDS`): tab Paket Guru / Kata Sendiri, cari + filter (jenjang, level), tag, pratinjau paket, isian kata sendiri. `mountPlaySettings`: arah soal (`directions: null` = tanpa pilihan arah), acak urutan, batas waktu (on/off) + waktu saran. Juga `isAnswerCorrect`, `shuffled`, `formatClock` |
| `announcements.js` | Jendela pengumuman di `user-dashboard.html`: pengumuman aktif (jenjang siswa + Semua siswa) yang terbit setelah siswa terakhir menekan "Mengerti" (`users.announceSeenAt`, cadangan localStorage); belum pernah = 30 hari terakhir; maks. 5 sekaligus. Format isi: `announcementHtml` di `ec-common.js` (paragraf dipisah baris kosong, baris "- " jadi daftar berpoin) |
| `game-scores.js` | Modul simpan skor + muat paket soal + `loadPlayedPackIds()` (Set paket yang pernah dimainkan siswa, game apa pun; dipakai lonceng & titik merah di daftar paket; event `ec-pack-played` setelah skor berpaket tersimpan) |
| `notifications.js` | Lonceng notifikasi paket baru (di `user-dashboard.html` & `gamelist.html`, wadah `<span id="notif">`; atribut `data-light` untuk latar terang). Paket aktif jenjang siswa + Semua jenjang yang dirilis ≤ 30 hari, maks. 20. Angka merah = paket baru yang belum pernah dimainkan siswa (belum ada `gameScores` miliknya dengan `packId` itu, game apa pun); membuka lonceng tidak menghapus angka. Tombol game memakai `?paket=<id>` sehingga paket langsung terpilih (`word-source.js`). Daftar game per jenis paket: `PACK_GAMES` di `ec-common.js` (tambahkan di sini setiap ada game baru) |

## Game yang ada

| File | gameId | Simpan skor? |
|---|---|---|
| `kosakata 2.html` (Kuis Kosakata) | `kosakata-2` | Ya, memakai paket soal |
| `kosakata 3.html` (Kartu Hafalan) | `kosakata-3` | Ya, memakai paket soal |
| `kosakata 4.html` (Kata Kerja V1-V2-V3) | `kosakata-4` | Ya, memakai paket jenis `verb`. Benar jika ketiga bentuk tepat. Arah: Arti → V1,V2,V3 atau V1 → V2,V3 |
| `kosakata 5.html` (Hafalan Tanpa Salah) | `kosakata-5` | Ya, memakai paket soal (`points` = jumlah salah sebelum tuntas; kata sendiri maks. 10) |
| `scramble.html` (Susun Kalimat) | `scramble` | Ya, memakai paket jenis `kalimat`. Satu kalimat per layar, siswa mengetuk kotak kata untuk menyusun. Tanda baca akhir (. ? !) tidak diacak. Benar jika urutan sama persis dengan kalimat paket (huruf besar/kecil diabaikan). 3 kesempatan per kalimat (`MAX_TRIES`); benar di kesempatan mana pun = 1 poin; susunan salah yang sama tidak mengurangi kesempatan |
| `cocokkan.html` (Cocokkan Pasangan) | `cocokkan` | Ya, memakai paket `kosakata`. Kata & arti diacak dalam dua kolom, siswa mengetuk untuk memasangkan. Ronde berisi maks. 6 pasang (`ROUND_SIZE`), dibagi rata; semua kata paket dimainkan. Poin hanya untuk kata yang cocok di percobaan pertama (salah pasang = kata yang diketuk pertama tidak dapat poin). Arti kembar (big/large = besar) dan kata kembar (can = bisa/kaleng) diterima. Tombol Berhenti menyimpan hasil sejauh itu |
| `question.html` | – | Tidak (pengacak pertanyaan) |

Catatan: nama file berspasi masih dipertahankan agar tautan lama tidak rusak.

## Paket soal (bank soal dari guru)

- Dibuat admin di tab **Paket Soal**: judul, jenis, jenjang (atau Semua jenjang), **level 1–5** (`tier`, 1 = paling mudah; `PACK_TIERS` di `ec-common.js`), daftar soal ditempel satu per baris. Daftar paket admin bisa dicari & difilter jenjang.
  - `kosakata`: `kata = arti` (jawaban alternatif dipisah `/`, mis. `big = besar / luas`) → item `{q, a}`
  - `verb`: `eat, ate, eaten = makan` → item `{v1, v2, v3, arti}`; bentuk ganda dengan `/` (mis. `learn, learnt / learned, learnt / learned = belajar`)
  - `kalimat`: satu kalimat per baris, 2–20 kata → item `{text}` (dipakai Susun Kalimat)
  - Maks. 200 soal per paket. Pengurai teks: `parsePackText` / `packToText` di `ec-common.js`.
- **Hanya skor dengan paket soal yang menambah poin.** Latihan dengan kata sendiri tetap tersimpan (riwayat), tetapi tidak dihitung.
- Jika satu paket dimainkan berkali-kali dalam seminggu, yang dihitung **hasil terbaik** per siswa per paket (`weeklyPoints` di `ec-common.js`, dipakai `leaderboard.html` dan `user-dashboard.html`).
- Siswa melihat paket aktif untuk jenjangnya + paket "Semua jenjang". Aturan Firestore menolak skor berpaket jika paket nonaktif, beda jenjang, atau `total` tidak sama dengan jumlah soal paket.
- Keterbatasan: jumlah jawaban benar tetap dihitung di browser siswa (tanpa server), jadi siswa yang sangat paham teknis masih bisa memalsukan nilai di satu paket, tetapi tidak bisa lagi menumpuk poin tanpa batas.

## Halaman game kosakata

- Tata letak: PC dua kolom (kiri pilih soal; kanan pratinjau + pengaturan + Mulai), HP satu kolom. Kelas `app wide`, `setup-grid`, `side`, `narrow` di `game-ui.css`.
- Kotak cari & filter muncul otomatis jika paket ≥ 6 atau ada lebih dari satu jenjang/level.
- Batas waktu: saran = jumlah soal × detik per soal (Kuis 8, Kartu 12, Hafalan Tanpa Salah 15, Kata Kerja 20, Susun Kalimat 25, Cocokkan Pasangan 6), dibulatkan ke menit (1–30). Default aktif di Kuis & Kartu, mati di Hafalan Tanpa Salah. Waktu habis di Hafalan Tanpa Salah = belum tuntas, skor tidak disimpan.
- Titik merah di depan judul paket = paket belum pernah dimainkan siswa di game mana pun; hilang setelah skor paket itu tersimpan.
- Pilihan siswa (paket, kata sendiri, pengaturan) diingat di browser (`localStorage`, kunci `ec-k2`, `ec-k2-settings`, dst.).

## Cara menyambungkan game ke skor & papan peringkat

1. Sebelum `</body>`: `<script type="module" src="game-scores.js"></script>`
2. Saat permainan selesai:
   ```js
   window.saveGameScore?.({
     gameId: "id-game-unik", gameName: "Nama Game",
     correct: 8, total: 10,          // wajib, bilangan bulat, correct <= total <= 1000
     points: 950, mode: "timed",     // opsional
     packId: paket.id, packName: paket.title, // wajib agar masuk papan peringkat
   });
   ```
   Daftar paket: `const hasil = await window.loadQuestionPacks("kosakata")` → `hasil.status` (`ok`/`login`/`inactive`/`error`) dan `hasil.packs`. Untuk game kosakata cukup pakai `mountWordSource` dari `word-source.js` (contoh: `kosakata 5.html`); `source.scoreInfo()` mengisi `packId`/`packName`.
3. **1 jawaban benar = 1 poin** di papan peringkat, hanya dari paket soal, hasil terbaik per paket per minggu. Minggu dihitung Senin 00.00 – Minggu 23.59 WIB.
4. Skor hanya tersimpan jika siswa login dan profilnya masih ada. Jika tidak, muncul notifikasi kecil.

## Data Firestore

- `users/{uid}`: name, role "Student", email, level, classCode, loginType ("email"/"username"), createdAt, lastLoginAt, announceSeenAt (terakhir menekan "Mengerti" di pengumuman)
- `classCodes/{KODE}`: level, note, active, createdAt
- `questionPacks/{id}`: title, type ("kosakata"/"verb"/"kalimat"), level (jenjang atau "SEMUA"), tier (1–5, opsional untuk paket lama), active, items[], itemCount, createdAt, updatedAt, publishedAt (diisi saat dibuat & saat diaktifkan lagi; dasar notifikasi, paket lama memakai createdAt)
- `announcements/{id}`: title (≤80), body (≤2000), level (jenjang atau "SEMUA"), active, createdAt, updatedAt, publishedAt (diisi saat terbit, saat diaktifkan lagi, atau saat diubah dengan centang "Tampilkan lagi")
- `gameScores/{id}`: userId, userName, gameId, gameName, correct, total, percent, points?, mode?, level?, packId?, packName?, week ("YYYY-MM-DD" Senin), timestamp
- Akun tanpa email memakai email sintetis `<namapengguna>@siswa.extra-course-d02c2.firebaseapp.com`.

## Tampilan (sejak 17 Okt 2026, meniru Monitor Kelas)

- Hijau `#1f6f4a` (gelap: `#5cc493`), latar `#f3f5f4`, kartu putih bergaris tipis sudut 14px, font **Plus Jakarta Sans** (Google Fonts, dipasang di `<head>` tiap halaman). Mode gelap otomatis mengikuti HP/PC (`prefers-color-scheme`). Selalu pakai token (`var(--accent)`, `--surface`, `--line`, `--muted`, `--ok`, `--bad`, `--warn`, `--info`, `--soft` ...), jangan warna langsung.
- Header lengket: `<header class="topbar"><div class="topbar-inner">` berisi `<span class="logo">EC</span>` + `<div class="brand"><b>Judul</b><small>sub</small></div>` + `<span id="notif">` (lonceng). Di halaman game: `<a class="back">` (panah + "Game") + `<h1>`.
- Halaman siswa utama (`user-dashboard.html`, `gamelist.html`, `leaderboard.html`) memakai navigasi bawah `nav.tabs` (Beranda / Game / Peringkat) + `body.has-tabs`. Halaman game tidak memakai navigasi bawah.
- Komponen: `.card`, `.sec` (judul bagian), `.list` + `.item` (baris bisa diketuk, panah kanan), `.stats` + `.stat`, `.btn` (`.secondary`, `.ghost`, `.danger`, `.block`), `.input`, `.search`, `.empty`.
- Ikon: SVG garis (`class="ico"`), tanpa emoji kecuali medali peringkat. Poster peringkat tetap hijau di mode gelap.
- Nama merek: **ExtraCourse** (tanpa spasi); halaman masuk memakai "Special ExtraCourse". Slogan "Teman Belajar" tidak dipakai lagi.
- Beranda: kartu peringkat (#rank besar, poin, kapsul "Semua jenjang x/y" & jenjang), nilai terbaik maks. 3 game, latihan terakhir maks. 5.
- Peringkat: kartu minggu (tanggal, sisa waktu, 7 kotak hari, aturan poin di balik tombol "i"), kartu posisi dengan bilah "x poin lagi menyalip NAMA", nama siswa KAPITAL, jenjang di bawah nama (podium & daftar 4-10). Poster: "Top 10 Minggu Ini" / "Juara Minggu Ini", jenjang di depan nama untuk peringkat 4-10.

## Preferensi pemilik

- Tampilan harus **rapi di HP dan PC** (cek kedua ukuran, juga mode gelap). Suka tampilan Monitor Kelas (hijau, kartu simetris, kotak cari jelas).
- **Jangan banyak ikon/emoji dekoratif.** Medali 🥇🥈🥉 boleh karena memberi kesan pemenang.
- Bahasa Indonesia di semua teks untuk siswa.
- Kerjakan pelan-pelan, satu fitur per langkah; jelaskan dengan bahasa sederhana.
- Fitur berat yang tidak perlu (mis. tombol Bagikan) lebih baik ditiadakan.

## Keterbatasan yang diketahui

- Password akun nama pengguna tidak bisa direset dari website (Firebase gratis, tanpa server).
- Hapus akun dari admin menghapus profil + skor; akun login terhapus saat siswa mencoba masuk lagi.
- Skor sebelum fitur peringkat tidak punya field `week`, jadi tidak dihitung di papan peringkat.
- Skor tanpa `packId` (semua skor sebelum fitur paket soal) tidak dihitung di papan peringkat.

## Rencana berikutnya

1. ~~Bank soal + paket resmi~~ (selesai untuk semua game berpoin, termasuk Susun Kalimat).
2. ~~Daftar game dirapikan~~ (nama Indonesia, tanpa emoji). Kartu Arti (`kosakatapart2.html`) dan Chat (`chat real 1.html`) dihapus karena kurang menarik. Pertanyaan Acak belum memakai gaya baru.
3. Game baru dari paket soal: ~~Cocokkan Pasangan~~ (selesai). Berikutnya: Pilihan Ganda Cepat, Dengarkan & Tulis, Tantangan Harian.
