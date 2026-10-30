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
| `leaderboard.html` | Papan peringkat mingguan: Semua Jenjang (default) / per jenjang, Minggu Ini / Minggu Lalu / **Musim**, kartu poster 1080×1350 untuk diunduh |
| `admin.html` | Admin: siswa (buat akun tanpa email, ubah jenjang/nama, hapus akun), kode kelas, **paket soal**, **pengumuman**, skor game |
| (admin, tab Skor) | Hemat kuota: memuat 100 skor terbaru, tampil 50 baris; "Tampilkan lebih banyak" +50 baris, memuat +100 skor jika perlu. Ringkasan per siswa dihitung dari skor yang sudah dimuat |
| `admin-login.html` | Login admin |
| `gamelist.html` | Daftar game (Berpoin / Latihan) |
| `game-ui.css` | **Gaya bersama seluruh website** (lihat "Tampilan" di bawah): token warna + mode gelap, header, navigasi bawah, kartu, tombol, isian, komponen game. `admin.html` punya salinan token sendiri di `<style>` (karena kelas `nav.tabs` admin berbeda) |
| `word-source.js` | `mountWordSource` (opsi `type`: "kosakata" / "verb" / "kalimat", kolom di `PACK_FIELDS`): tab Paket Guru / Kata Sendiri, cari + filter (jenjang, level), tag, pratinjau paket, isian kata sendiri. `mountPlaySettings`: arah soal (`directions: null` = tanpa pilihan arah), acak urutan, batas waktu (on/off) + waktu saran. Juga `isAnswerCorrect`, `shuffled`, `formatClock` |
| `announcements.js` | Jendela pengumuman di `user-dashboard.html`: pengumuman aktif (jenjang siswa + Semua siswa) yang terbit setelah siswa terakhir menekan "Mengerti" (`users.announceSeenAt`, cadangan localStorage); belum pernah = 30 hari terakhir; maks. 5 sekaligus. Format isi: `announcementHtml` di `ec-common.js` (paragraf dipisah baris kosong, baris "- " jadi daftar berpoin) |
| `game-scores.js` | Modul simpan skor + muat paket soal + `loadPlayedPackIds()` (Set paket yang pernah dimainkan siswa, game apa pun; dipakai lonceng & titik merah di daftar paket; event `ec-pack-played` setelah skor berpaket tersimpan) |
| `weekly-results.js` | Hasil akhir tiap minggu: `getWeekResult(key)`, `loadHistory()`, `archiveFinishedWeeks()` (admin). Minggu selesai dibekukan ke `weeklyResults` saat admin membuka `admin.html` atau papan peringkat; sebelum itu dihitung langsung dari `gameScores` |
| `tiers.js` | **Tier**: XP = jumlah poin mingguan sepanjang masa (tanpa bonus musim; tidak pernah turun). `TIERS` (batas XP, ubah di sini): Perunggu I/II/III 0/50/100, Perak 200/300/450, Emas 600/800/1000, Platinum 1300/1600/2000, Berlian 2500. `tierFor(xp)`, `xpByUser(riwayat, mingguIni)`, `tierBadge(tier, px)` (perisai SVG berwarna, angka romawi). Riwayat dari `loadHistory()` |
| `pets.js` | Juga katalog toko `SHOP_ITEMS` (id, slot head/face/neck/bg, nama, harga, `minTier` = indeks tier minimal) + gambar barang (`drawHead/Face/Neck/Bg`, `itemSvg`). `petSvg(..., wear)` memakai barang; barang di slot leher/kepala menggantikan hiasan bawaan wujud (syal Remaja, kalung Dewasa, mahkota Legenda). **Hewan peliharaan**: 3 jenis asli (Kucing, Kelinci, Naga), digambar SVG di file ini (`petSvg(jenis, wujud, px)`). Wujud dari tier (`stageForTier`): Perunggu I Telur, Perunggu II–III Bayi, Perak Anak, Emas Remaja (syal; naga bersayap), Platinum Dewasa (kalung + lonceng), Berlian Legenda (mahkota + cahaya). Disimpan di `users/{uid}.pet = {species, name ≤16}` (aturan `isValidPet` di firestore.rules). Hewan tidak pernah sedih/sakit |
| `toko.html` | **Toko**: pratinjau hewan (barang dicoba sebelum dibeli), saldo koin, tab Kepala / Wajah / Leher / Latar, kartu barang (harga, Dimiliki, Dipakai, terkunci tier). Beli = langsung dipakai. Memilih barang memunculkan bilah aksi di atas navigasi bawah (hewan kecil memakai barang yang dicoba + status + Batal/Beli/Pakai/Lepas), hasil ditampilkan sebagai notifikasi singkat. `?slot=bg` membuka tab tertentu. Tanpa hewan → arahkan ke Beranda |
| `recap.js` | Jendela "Rekap minggu lalu" di Beranda, sekali per minggu (localStorage `ec-recap-<uid>`), muncul setelah jendela pengumuman (`window.ecNewsDone`): judul juara jika siswa juara 1–3, strip #Semua jenjang · #Jenjang · Poin, naik/turun dari minggu sebelumnya, juara 1–3 Semua Jenjang + jenjang siswa. Tidak muncul jika minggu lalu tidak ada yang bermain |
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
| `pilihan-ganda.html` (Pilihan Ganda Cepat) | `pilihan-ganda` | Ya, memakai paket `kosakata`. Satu soal per layar, 4 pilihan (`CHOICES`; lebih sedikit jika paket kecil), hitung mundur 10 detik per soal (`SECONDS`; habis = salah). Pengecoh diambil dari jawaban kata lain di paket, kecuali yang artinya sama (big/large = besar). Arah Kata → Arti / Arti → Kata. Tombol 1–4 di keyboard. Lencana "x beruntun" dan "beruntun terbaik" di hasil (hanya tampilan, poin tetap 1 per benar). Tanpa batas waktu total (`mountPlaySettings({ timer: false })`). Tombol Berhenti menyimpan hasil sejauh itu |
| `question.html` | – | Tidak (pengacak pertanyaan) |

Catatan: nama file berspasi masih dipertahankan agar tautan lama tidak rusak.

## Paket soal (bank soal dari guru)

- Dibuat admin di tab **Paket Soal**: judul, jenis, jenjang (atau Semua jenjang), **level 1–5** (`tier`, 1 = paling mudah; `PACK_TIERS` di `ec-common.js`), daftar soal ditempel satu per baris. Daftar paket admin bisa dicari & difilter jenjang.
  - `kosakata`: `kata = arti` (jawaban alternatif dipisah `/`, mis. `big = besar / luas`) → item `{q, a}`
  - `verb`: `eat, ate, eaten = makan` → item `{v1, v2, v3, arti}`; bentuk ganda dengan `/` (mis. `learn, learnt / learned, learnt / learned = belajar`)
  - `kalimat`: satu kalimat per baris, 2–20 kata → item `{text}` (dipakai Susun Kalimat)
  - Maks. 200 soal per paket. Pengurai teks: `parsePackText` / `packToText` di `ec-common.js`.
  - **Jadwal terbit** (kolom Terbit: Sekarang / Jadwalkan / Tidak diubah): `publishedAt` boleh di masa depan. Saran jadwal = Senin depan 07.00. Paket terjadwal disaring di `loadQuestionPacks` (game-scores.js) sehingga tidak tampil di game, lonceng, atau Beranda sampai waktunya; aturan Firestore menolak skornya sebelum `publishedAt`. Admin: status "Terjadwal" + tanggal. Mengaktifkan lagi paket terjadwal tidak mengubah jadwalnya. (Isi paket terjadwal tetap bisa dibaca lewat konsol oleh siswa yang sangat paham teknis; hanya tampilan, tidak bisa diberi poin.)
- **Rencana rilis yang disarankan**: 2–3 paket baru per jenjang tiap Senin (+1 Kamis jika sanggup), memakai jadwal terbit.
- **Hanya skor dengan paket soal yang menambah poin.** Latihan dengan kata sendiri tetap tersimpan (riwayat), tetapi tidak dihitung.
- Jika satu paket dimainkan berkali-kali dalam seminggu, yang dihitung **hasil terbaik** per siswa per paket (`weeklyPoints` di `ec-common.js`, dipakai `leaderboard.html` dan `user-dashboard.html`).
- Siswa melihat paket aktif untuk jenjangnya + paket "Semua jenjang". Aturan Firestore menolak skor berpaket jika paket nonaktif, beda jenjang, atau `total` tidak sama dengan jumlah soal paket.
- Keterbatasan: jumlah jawaban benar tetap dihitung di browser siswa (tanpa server), jadi siswa yang sangat paham teknis masih bisa memalsukan nilai di satu paket, tetapi tidak bisa lagi menumpuk poin tanpa batas.

## Halaman game kosakata

- Tata letak: PC dua kolom (kiri pilih soal; kanan pratinjau + pengaturan + Mulai), HP satu kolom. Kelas `app wide`, `setup-grid`, `side`, `narrow` di `game-ui.css`.
- Kotak cari & filter muncul otomatis jika paket ≥ 6 atau ada lebih dari satu jenjang/level.
- Batas waktu: saran = jumlah soal × detik per soal (Kuis 8, Kartu 12, Hafalan Tanpa Salah 15, Kata Kerja 20, Susun Kalimat 25, Cocokkan Pasangan 6), dibulatkan ke menit (1–30). Default aktif di Kuis & Kartu, mati di Hafalan Tanpa Salah. Waktu habis di Hafalan Tanpa Salah = belum tuntas, skor tidak disimpan.
- Titik merah di depan judul paket = paket belum pernah dimainkan siswa di game mana pun; hilang setelah skor paket itu tersimpan.
- **Poin paket minggu ini** (`packMaxPoints` di `ec-common.js` = jumlah soal × bobot level × bobot game tertinggi; `loadWeekPackPoints` di game-scores.js = poin terbaik siswa per paket minggu ini): tag "Poin penuh" (hijau) atau "16/40 poin" di daftar paket & pratinjau, plus kalimat di pratinjau ("maks. x poin", "x dari y", "Poin penuh ... bisa didapat lagi Senin"). Beranda: kartu "Paket minggu ini" (Poin penuh x dari y paket, bilah, "Masih bisa tambah x poin" / semua penuh → tunggu paket baru atau Senin). Notifikasi simpan skor menampilkan poinnya. Skor siswa & daftar paket dimuat sekali per halaman (dipakai bersama lonceng), jadi tanpa tambahan baca Firestore.
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
3. **Bobot poin = level paket × jenis game** (`scorePoints` di `ec-common.js`, mulai minggu `WEIGHT_FROM_WEEK` = 2026-11-02; sebelumnya 1 jawaban benar = 1 poin). Level (`LEVEL_WEIGHT`, dari `packTier` di skor): Level 1–2 = 1, Level 3–4 = 2, Level 5 = 3, paket tanpa level = 1. Game (`GAME_WEIGHT`): menulis/menyusun (Kuis Kosakata, Kartu Hafalan, Hafalan Tanpa Salah, Kata Kerja, Susun Kalimat) ×2, memilih (Cocokkan Pasangan, Pilihan Ganda Cepat) ×1. Contoh: paket Level 3 di Kuis Kosakata = 4 poin per kata. Game baru wajib ditambahkan ke `GAME_WEIGHT` (tanpa entri = ×1). Level disimpan di skor saat dimainkan (`scoreInfo()` → `packTier`), dicek aturan Firestore agar sama dengan level paket; guru mengubah level paket tidak mengubah skor lama. Winrate/akurasi sengaja **tidak** dibuat: mengulang paket justru didorong (hanya hasil terbaik yang dihitung). Hanya dari paket soal, hasil terbaik (setelah bobot) per paket per minggu, dari game mana pun. Poin = XP = koin, jadi bobot juga mempercepat tier & koin (batas tier/harga toko mungkin perlu disesuaikan). Minggu dihitung Senin 00.00 – Minggu 23.59 WIB.
4. Skor hanya tersimpan jika siswa login dan profilnya masih ada. Jika tidak, muncul notifikasi kecil.

## Data Firestore

- `users/{uid}`: name, role "Student", email, level, classCode, loginType ("email"/"username"), createdAt, lastLoginAt, announceSeenAt (terakhir menekan "Mengerti" di pengumuman)
- `classCodes/{KODE}`: level, note, active, createdAt
- `questionPacks/{id}`: title, type ("kosakata"/"verb"/"kalimat"), level (jenjang atau "SEMUA"), tier (1–5, opsional untuk paket lama), active, items[], itemCount, createdAt, updatedAt, publishedAt (diisi saat dibuat & saat diaktifkan lagi; dasar notifikasi, paket lama memakai createdAt)
- `announcements/{id}`: title (≤80), body (≤2000), level (jenjang atau "SEMUA"), active, createdAt, updatedAt, publishedAt (diisi saat terbit, saat diaktifkan lagi, atau saat diubah dengan centang "Tampilkan lagi")
- `weeklyResults/{week}`: week, ranking [{uid, name, level, points, packs, rank}] (papan Semua Jenjang; papan jenjang = `levelRanking`), players, savedAt. Hanya admin yang menulis
- `gameScores/{id}`: userId, userName, gameId, gameName, correct, total, percent, points?, mode?, level?, packId?, packName?, packTier? (level paket 1–5 saat dimainkan), week ("YYYY-MM-DD" Senin), timestamp
- Akun tanpa email memakai email sintetis `<namapengguna>@siswa.extra-course-d02c2.firebaseapp.com`.

## Tampilan (sejak 17 Okt 2026, meniru Monitor Kelas)

- Hijau `#1f6f4a` (gelap: `#5cc493`), latar `#f3f5f4`, kartu putih bergaris tipis sudut 14px, font **Plus Jakarta Sans** (Google Fonts, dipasang di `<head>` tiap halaman). Mode gelap otomatis mengikuti HP/PC (`prefers-color-scheme`). Selalu pakai token (`var(--accent)`, `--surface`, `--line`, `--muted`, `--ok`, `--bad`, `--warn`, `--info`, `--soft` ...), jangan warna langsung.
- Header lengket: `<header class="topbar"><div class="topbar-inner">` berisi `<a class="logo" href="user-dashboard.html">EC</a>` (logo = tombol ke Beranda; di admin ke admin.html) + `<div class="brand"><b>Judul</b><small>sub</small></div>` + `<span id="notif">` (lonceng). Di halaman game: `<a class="back">` (panah + "Game") + `<h1>`.
- Halaman siswa utama (`user-dashboard.html`, `gamelist.html`, `leaderboard.html`) memakai navigasi bawah `nav.tabs` (Beranda / Game / Peringkat) + `body.has-tabs`. Halaman game tidak memakai navigasi bawah.
- Komponen: `.card`, `.sec` (judul bagian), `.list` + `.item` (baris bisa diketuk, panah kanan), `.stats` + `.stat`, `.btn` (`.secondary`, `.ghost`, `.danger`, `.block`), `.input`, `.search`, `.empty`.
- Ikon: SVG garis (`class="ico"`), tanpa emoji kecuali medali peringkat. Poster peringkat tetap hijau di mode gelap.
- Nama merek: **ExtraCourse** (tanpa spasi); halaman masuk memakai "Special ExtraCourse". Slogan "Teman Belajar" tidak dipakai lagi.
- Beranda: kartu peringkat = 2 lencana lingkaran (#rank dari total; Semua jenjang & jenjang siswa, makin dekat juara 1 makin penuh) + kotak Poin + ikon >; nilai terbaik maks. 3 game, latihan terakhir maks. 5.
- Peringkat: kartu minggu (tanggal, sisa waktu, 7 kotak hari, aturan poin di balik tombol "i"), kartu posisi strip angka (#Peringkat · Poin · Paket) + bilah "x poin lagi untuk mengejar NAMA", nama siswa KAPITAL, jenjang di bawah nama (podium & daftar 4-10). Poster: "Top 10 Minggu Ini" / "Juara Minggu Ini", jenjang di depan nama untuk peringkat 4-10.

- **Musim bulanan** (tab Musim di Peringkat): satu musim = satu bulan, berisi minggu yang hari Seninnya jatuh di bulan itu (kunci `YYYY-MM`, `seasonWeeks`). Poin musim = jumlah poin mingguan **+ bonus peringkat mingguan** Semua Jenjang (`WEEK_BONUS` di `ec-common.js`: juara 1 +10, 2 +8, 3 +6, 4 +4, 5 +2; peringkat kembar dapat bonus sama; hanya minggu yang sudah selesai). Total poin musim siswa sama di semua papan; papan jenjang hanya menyaring (`seasonRanking(weeks, mingguIni, jenjang)`; `loadSeasonWeeks` di `weekly-results.js`). Papan mingguan tetap mulai dari nol (bonus sengaja tidak dimasukkan ke mingguan agar adil). Rekap Senin menampilkan "+x poin bonus" untuk peringkat 1–5. Kartu musim: rentang tanggal, sisa waktu, satu kotak per minggu (angka = tanggal Senin); strip #Peringkat · Poin · Bonus; daftar: "3 minggu · +8 bonus". Poster: "Musim Oktober". Rekap Senin pertama musim baru menampilkan Juara Musim + gelar juara musim di judul.
- Kartu paling atas Beranda = hewan + tier: hewan bergerak pelan (bisa diketuk untuk melompat), nama & wujud, lencana tier + XP, bilah ke tier berikutnya ("x XP lagi, Mochi tumbuh jadi Remaja" jika tier berikutnya mengubah wujud). Belum memilih = Telur misterius + tombol "Pilih hewan" (jendela pilih jenis + nama). "Semua tier" juga menampilkan 5 wujud hewan (yang belum tercapai = telur) + "Ubah hewan atau nama". Rekap Senin: "Mochi menetas / tumbuh jadi ...".
- Tier tampil di: kartu atas Beranda (lencana, XP, bilah ke tier berikutnya, tombol "Semua tier" berisi tangga tier; label "Naik!" jika tier naik sejak kunjungan terakhir, localStorage `ec-tier-<uid>`), lencana kecil di depan nama di podium & daftar Peringkat, dan rekap Senin ("Naik tier ke ...").
- **Koin** (`coinsEarned` di `tiers.js`): 1 koin per poin mingguan + bonus peringkat 1–5 Semua Jenjang (+10/8/6/4/2) di minggu yang sudah selesai. Saldo = koin didapat − harga barang yang dimiliki. Tidak ada angka koin tersimpan (tidak bisa diubah langsung). Barang tersimpan di `users/{uid}.items` (daftar id) & `equipped` ({head, face, neck, bg}); aturan `isValidShop` (barang dipakai harus dimiliki). Tanpa server, harga & saldo dicek di browser: siswa yang sangat paham teknis bisa menambah barang tanpa koin, tetapi barang hanya tampilan. Beranda: baris koin + tombol Toko di kartu hewan.
- Riwayat juara (Peringkat, di bawah daftar): kartu "Paling sering juara 1" (hanya jika ada yang ≥2 kali; nama kembar semua) + "Prestasimu" (jumlah 🥇🥈🥉), lalu juara 1–3 per minggu (4 minggu, tombol "Lihat minggu sebelumnya"). Mengikuti papan yang dipilih (Semua/jenjang). Riwayat dimulai `FIRST_WEEK` = 2026-10-12.

## Preferensi pemilik

- Tampilan harus **rapi di HP dan PC** (cek kedua ukuran, juga mode gelap). Suka tampilan Monitor Kelas (hijau, kartu simetris, kotak cari jelas).
- **Jangan banyak ikon/emoji dekoratif.** Medali 🥇🥈🥉 boleh karena memberi kesan pemenang.
- Bahasa Indonesia di semua teks untuk siswa.
- Kerjakan pelan-pelan, satu fitur per langkah; jelaskan dengan bahasa sederhana.
- Fitur berat yang tidak perlu (mis. tombol Bagikan) lebih baik ditiadakan.
- **Kabari pemilik** jika suatu fitur butuh upgrade berbayar atau layanan pihak lain (mis. server/Cloud Functions Firebase).

## Keterbatasan yang diketahui

- Kuota gratis Firestore 50.000 baca/hari. Beranda & Peringkat membaca semua skor minggu ini setiap dibuka; lonceng & riwayat membaca semua skor milik siswa. Aman untuk puluhan siswa; jika siswa aktif mendekati 80–100, perlu penghematan (simpan ringkasan, jangan hitung ulang dari nol). Cek di Firebase Console → Firestore → Usage.

- Password akun nama pengguna tidak bisa direset dari website (Firebase gratis, tanpa server).
- Hapus akun dari admin menghapus profil + skor; akun login terhapus saat siswa mencoba masuk lagi.
- Skor sebelum fitur peringkat tidak punya field `week`, jadi tidak dihitung di papan peringkat.
- Skor tanpa `packId` (semua skor sebelum fitur paket soal) tidak dihitung di papan peringkat.

## Rencana berikutnya

1. ~~Bank soal + paket resmi~~ (selesai untuk semua game berpoin, termasuk Susun Kalimat).
2. ~~Daftar game dirapikan~~ (nama Indonesia, tanpa emoji). Kartu Arti (`kosakatapart2.html`) dan Chat (`chat real 1.html`) dihapus karena kurang menarik. Pertanyaan Acak belum memakai gaya baru.
3. ~~Reset mingguan lebih seru: rekap minggu lalu + riwayat juara~~ (selesai). ~~Musim bulanan~~ (selesai). **Proyek besar (disetujui urutannya): 1) Tier ~~selesai~~, 2) karakter ~~selesai: hewan peliharaan~~, 3) koin + toko ~~selesai~~.** ~~Hewan tampil di papan peringkat & poster~~ (selesai: koleksi publik `pets/{uid}` = {species, name, equipped}, ditulis pemilik saat memilih hewan / ganti barang, disalin otomatis saat membuka Beranda; dihapus admin bersama akun. Peringkat: hewan berdiri di atas podium, avatar kecil di daftar 4–10, poster juga. Wujud dari tier pemilik; belum memilih = telur abu-abu). Ide lanjutan: barang baru/musiman, hadiah barang untuk Juara Musim. Koin hanya untuk tampilan (bukan skill yang membantu menang) selama tanpa server. Karakter: hewan peliharaan (dipilih pemilik). Hewan belum tampil di papan peringkat (siswa tidak bisa membaca profil siswa lain; nanti bisa lewat data skor/hasil mingguan). Ide lain: rangkaian minggu aktif, target bersama, paket bonus, riwayat juara musim.
4. Game baru dari paket soal: ~~Cocokkan Pasangan~~ (selesai), ~~Pilihan Ganda Cepat~~ (selesai). Dengarkan & Tulis ditunda sampai sistem utama berjalan (suara bawaan browser, gratis; kualitas beda tiap HP).
5. Mengatasi "kehabisan soal": ~~bobot poin level × game~~, ~~tanda Poin penuh~~, ~~jadwal terbit paket~~ (selesai). Berikutnya: **Tantangan Harian** (10 kata acak per hari dari paket aktif jenjang siswa, sama untuk semua siswa sejenjang, sekali per hari, rangkaian hari aktif; guru tidak perlu membuat soal harian). Setelah 1–2 minggu bobot berjalan: tinjau batas tier, bonus juara, harga toko (naikkan batas tier bersama XP lama agar tier tidak turun; tambah barang baru, jangan naikkan harga lama).
