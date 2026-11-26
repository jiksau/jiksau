# Keamanan Data ExtraCourse (Firestore)

Website ini fokus pada **permainan dan aktivitas belajar**. Data administratif (absensi, data pendaftaran lengkap, laporan orang tua) dikelola di spreadsheet, **bukan** di website.

File `firestore.rules` mengatur siapa boleh membaca dan mengubah data di database Firebase `extra-course-d02c2`.

## Data yang disimpan website

| Data | Isi | Siswa | Admin | Belum login |
|---|---|---|---|---|
| Profil (`users`) | Nama, email/nama pengguna, jenjang, kode kelas | Lihat profil sendiri; dibuat saat daftar dengan kode kelas aktif; hanya bisa mengubah waktu masuk terakhir & waktu terakhir menekan "Mengerti" di pengumuman | Semua (buat akun tanpa email, ubah nama & jenjang) | Tidak bisa |
| Kode kelas (`classCodes`) | Kode, jenjang, keterangan, aktif/nonaktif | Hanya bisa mengecek satu kode saat mendaftar | Semua | Hanya cek satu kode |
| Paket soal (`questionPacks`) | Judul, jenis, jenjang, daftar soal, status (draf/terjadwal/terbit/nonaktif), pembuat (`ownerId`) | Membaca paket yang aktif | Semua | Tidak bisa |
| Pengumuman (`announcements`) | Judul, isi, untuk jenjang, aktif/nonaktif | Membaca pengumuman yang aktif | Semua | Tidak bisa |
| Minggu pertama main paket (`packStarts`) | Siswa, paket, Senin minggu pertama ia memainkan paket itu (dasar batas 2 minggu poin) | Membuat miliknya sekali (bersama skor pertama di paket itu), tidak bisa mengubah/menghapus; minggu tidak boleh di masa depan; membaca miliknya sendiri | Semua; ikut terhapus saat akun dihapus | Tidak bisa |
| Hasil akhir mingguan (`weeklyResults`) | Peringkat akhir tiap minggu yang sudah selesai (nama, jenjang, poin) | Membaca (untuk rekap & riwayat juara) | Semua; tersimpan otomatis saat admin membuka halaman admin | Tidak bisa |
| Skor game (`gameScores`) | Nama, jenjang, game, nilai, paket soal, waktu, minggu | Simpan skor sendiri (tidak bisa mengubah); nilai harus angka (`percent` 0–100, `points` bilangan bulat, `mode` teks pendek); skor berpaket hanya jika paketnya aktif, sesuai jenjang, jumlah soal sama, dan `packStart` sama dengan catatan `packStarts`; `week` harus minggu ini (kelonggaran 1 jam setelah Senin 00.00 WIB untuk skor offline); lihat skor sendiri + skor siswa lain untuk papan peringkat | Semua, termasuk hapus | Tidak bisa |

Semua koleksi lain ditolak, termasuk data lama (absensi, pendaftaran, kelas, koleksi lama `teachers`). Peran guru yang baru memakai profil di `users` (lihat bagian Guru).

**Toko (barang):** siswa tidak bisa menambahkan barang hadiah sendiri (`topi-santa-emas`, `syal-kembang-api`; diberikan admin). Barang Edisi Liburan 2026 (`topi-santa`, `tanduk-rusa`, `syal-rajut`, `latar-salju`, `latar-kembang-api`) hanya bisa ditambahkan siswa antara 1 Des 2026 00.00 dan 3 Jan 2027 23.59 WIB (waktu server); setelah itu tetap dimiliki dan boleh dipakai. Hewan publik (`pets`) hanya boleh memakai barang yang ada di `users.items` pemiliknya. Pengecekan ini tidak menambah baca (profil sudah dibaca aturan). Keterbatasan lama tetap: harga & saldo koin dicek di browser.

Siswa tidak bisa mengubah jenjang atau perannya sendiri, melihat data siswa lain, atau mendaftar tanpa kode kelas yang aktif.

## Guru

Guru **bukan admin** dan tidak memakai akun admin. Akun guru dibuat admin di tab **Guru** (nama, email asli, password); profilnya `role: 'Guru'`, `active: true`, tanpa jenjang dan kode kelas.

- Di aturan, `isTeacher()` hanya benar jika profil `role 'Guru'` **dan** `active true`. Jika admin menonaktifkan, akses guru langsung hilang (tidak bisa membaca paket, pengumuman, skor, hasil mingguan, hewan).
- Guru tidak bisa mengubah `role` atau `active` miliknya sendiri; satu-satunya yang boleh ia ubah di profilnya adalah waktu masuk terakhir.
- Guru **tidak bisa membaca koleksi `users`** selain profilnya sendiri, jadi email siswa tidak terbuka.
- Skor dari akun guru **ditolak** di `gameScores` (guru tidak masuk papan peringkat). Profil tanpa field `role` (siswa lama) tetap dianggap siswa.
- Guru tidak bisa menyimpan hewan atau barang toko (`users.pet/items/equipped`, koleksi `pets`).
- Guru boleh membuka Daftar Game dan Peringkat untuk melihat saja. Beranda siswa dan Toko mengalihkan guru ke `guru.html`; siswa yang membuka `guru.html` dialihkan ke Beranda.
- **Paket guru (Tahap 2):** guru aktif boleh membuat paket dengan `ownerId` = dirinya sendiri, maks. **30 soal** (admin 200), level wajib, hanya field yang dikenal. Semua batas lain tetap (judul ≤80, jenis, jenjang, level 1–5, `itemCount` = jumlah soal).
- Guru membaca paket aktif + **semua paket miliknya** (termasuk draf & nonaktif); tidak bisa membaca draf/nonaktif guru lain.
- Guru hanya mengubah paket miliknya; **pemilik, waktu dibuat, dan jenis soal tidak bisa diganti**. Paket admin (tanpa `ownerId`) dan paket guru lain tidak bisa diubah atau dihapus guru.
- Tanggal terbit dari guru hanya boleh kosong (draf), **sekarang**, **di masa depan** (terjadwal), atau tidak diubah, jadi tidak bisa dimundurkan (Tantangan Harian memakai paket yang terbit sebelum 00.00).
- Guru hanya **menghapus** paket miliknya yang **Draf atau Nonaktif**. Paket Terbit/Terjadwal harus dinonaktifkan dulu. Admin bisa menghapus semua.
- **Draf tidak pernah aktif**: aturan menolak `active: true` bersamaan dengan `draft: true` (juga untuk admin), sehingga draf tidak bisa muncul di game, lonceng, Tantangan Harian, atau papan peringkat, dan skor dari draf ditolak.
- Guru yang dinonaktifkan langsung tidak bisa membaca draf/nonaktif miliknya maupun menulis/menghapus paket. Paketnya yang sudah terbit tetap bisa dimainkan siswa sampai admin menonaktifkannya.
- **Mode coba (Tahap 3):** di halaman game, akun guru melihat paket miliknya (semua status & jenjang) + paket terbit semua jenjang, dengan bilah "Mode coba: skor tidak disimpan". Hanya membaca; skor guru tidak dikirim dan juga ditolak aturan, jadi poin, lonceng, koin, tier, dan peringkat tidak berubah. Draf tetap hanya bisa dibaca pemiliknya. Lonceng, Beranda, dan Tantangan Harian guru tetap memakai daftar biasa.
- **Hasil per paket (Tahap 3):** guru membaca `gameScores` dengan `packId` paketnya, hanya saat Hasil dibuka. Nama & jenjang diambil dari skor (tanpa membaca `users`, jadi email siswa tidak terbuka); semua isi skor ditampilkan sebagai teks biasa. Catatan: seperti siswa (untuk papan peringkat), guru aktif secara teknis bisa membaca skor lain; isinya nama, jenjang, dan nilai, tanpa email.
- Semua judul & isi paket ditampilkan sebagai teks biasa (`escapeHtml` / `textContent`) di halaman siswa, admin, guru, lonceng, dan poster peringkat.

## Memasang aturan

1. Buka https://console.firebase.google.com → project **extra-course-d02c2**.
2. **Firestore Database → tab Rules**.
3. Hapus isi editor, tempel seluruh isi `firestore.rules`, klik **Publish**.

## Menghapus data lama

Data absensi, pendaftaran, kelas, dan guru tidak dipakai lagi. Untuk menghapusnya:

1. **Firestore Database → tab Data**.
2. Pada setiap koleksi berikut, klik **⋮** di samping namanya → **Delete collection**, lalu ketik nama koleksinya untuk konfirmasi:
   - `studentAttendance`
   - `artifacts` (berisi data pendaftaran lama)
   - `classes`
   - `teachers`
3. **Jangan hapus** `users`, `gameScores`, dan `classCodes`.

## Langkah pertama setelah dipasang

1. Login admin → tab **Kode Kelas** → buat kode untuk setiap jenjang atau kelompok, misalnya `SMP24` untuk SMP.
2. Bagikan kode itu ke siswa. Siswa mendaftar di halaman depan dengan nama, email, password, dan kode kelas.
3. Untuk siswa tanpa email: tab **Siswa** → **Buat Akun Siswa**. Catat nama pengguna dan password, lalu berikan ke siswa.
4. Siswa lama yang sudah punya akun belum punya jenjang. Atur jenjangnya di tab **Siswa** (kolom Jenjang).

## Uji setelah memasang

- [ ] Daftar dengan kode kelas yang benar → berhasil, masuk ke dashboard, jenjang tampil
- [ ] Daftar dengan kode salah/nonaktif → ditolak dengan pesan jelas
- [ ] Admin membuat akun nama pengguna → siswa bisa masuk dengan nama pengguna & password itu
- [ ] Mainkan satu game sampai selesai → skor muncul di dashboard siswa dan tab Skor Game admin
- [ ] Admin bisa mengubah jenjang siswa
- [ ] Login sebagai siswa lalu buka `admin.html` → diarahkan keluar

Jika muncul pesan *"Missing or insufficient permissions"*, catat langkah mana yang gagal.

## Uji fitur paket soal (setelah memasang aturan terbaru)

- [ ] Admin → tab **Paket Soal** → buat paket kosakata untuk satu jenjang → muncul di Daftar Paket Soal
- [ ] Login sebagai siswa jenjang itu → Kosakata 2 → tab **Paket dari Guru** menampilkan paket tersebut
- [ ] Main sampai selesai → muncul pesan "Hasil terbaikmu di paket ini masuk papan peringkat" → poin muncul di Papan Peringkat
- [ ] Main lagi paket yang sama dengan nilai lebih rendah → poin di papan peringkat **tidak** bertambah
- [ ] Tab **Kata Sendiri** → main → pesan "latihan bebas", poin tidak bertambah
- [ ] Nonaktifkan paket di admin → paket hilang dari game siswa

Jika game menampilkan "Paket soal gagal dimuat", kemungkinan aturan terbaru belum dipasang.

## Uji pengumuman (setelah memasang aturan terbaru)

- [ ] Admin → tab **Pengumuman** → isi judul & isi → **Terbitkan** → muncul di Daftar Pengumuman
- [ ] Login sebagai siswa → jendela pengumuman muncul di dashboard → tekan **Mengerti** → jendela tertutup
- [ ] Muat ulang dashboard / masuk dari HP lain → pengumuman itu tidak muncul lagi
- [ ] Ubah pengumuman dengan centang "Tampilkan lagi" (atau nonaktifkan lalu aktifkan) → siswa melihatnya lagi

Jika tab Pengumuman menampilkan "Gagal memuat pengumuman", aturan terbaru belum dipasang.

## Uji notifikasi paket baru

- [ ] Admin membuat paket baru → siswa jenjang itu melihat angka merah di lonceng (dashboard & daftar game)
- [ ] Siswa membuka lonceng → angka tetap; tombol game membuka game dengan paket itu sudah terpilih
- [ ] Mainkan paket itu sampai selesai, kembali ke daftar game → angka berkurang satu, paket bertanda "Sudah dimainkan"
- [ ] Muat ulang halaman / masuk dari HP lain → angka tetap sama

## Uji rekap & riwayat juara (setelah memasang aturan terbaru)

1. Setelah minggu berganti (Senin), buka halaman admin sekali: hasil minggu lalu tersimpan otomatis ke koleksi `weeklyResults`.
2. Masuk sebagai siswa → Beranda: jendela "Rekap minggu lalu" muncul sekali (setelah pengumuman, jika ada).
3. Halaman Peringkat → bagian "Riwayat juara" di bawah daftar.

## Uji peran Guru – Tahap 1 (setelah memasang aturan terbaru)

- [ ] Admin → tab **Guru** → buat akun (nama, email asli, password) → muncul di Daftar Guru dengan status Aktif; admin tetap masuk (tidak ter-logout)
- [ ] Buat akun guru dengan email yang sudah terdaftar (mis. email siswa) → ditolak: "Email ini sudah terdaftar"
- [ ] Buat akun guru dengan email admin → ditolak
- [ ] Guru tidak muncul di Daftar Siswa
- [ ] Masuk sebagai guru di halaman depan → langsung ke `guru.html`, nama guru tampil
- [ ] Halaman depan → isi email guru → **Lupa password** → email atur ulang terkirim
- [ ] Sebagai guru, buka `user-dashboard.html` dan `toko.html` lewat alamat → dialihkan ke `guru.html`
- [ ] Sebagai guru, buka **Daftar game** dan **Papan peringkat** → tampil normal, tanpa error dan tanpa tampilan rusak (cek HP & PC, mode gelap)
- [ ] Sebagai guru, mainkan satu game sampai selesai → muncul "Akun guru: skor tidak disimpan"; guru **tidak** muncul di papan peringkat
- [ ] Admin → **Nonaktifkan** guru → guru memuat ulang `guru.html` → "Akun guru nonaktif"; **Aktifkan** lagi → halaman guru kembali normal
- [ ] Sebagai siswa, buka `guru.html` lewat alamat → dialihkan ke Beranda
- [ ] Siswa lama & baru tetap bisa main dan skornya masuk papan peringkat; Toko & hewan tetap berjalan
- [ ] Admin: tab Siswa, Kode Kelas, Paket Soal, Pengumuman, Skor Game tetap berjalan

Catatan: akun guru tidak punya jenjang. Sejak Tahap 3, di halaman game guru melihat paket miliknya di jenjang mana pun + paket terbit semua jenjang (mode coba).

## Uji paket guru – Tahap 2 (setelah memasang aturan terbaru)

Siapkan 2 akun guru (A dan B) dan 1 akun siswa SMP.

- [ ] Guru A → **Buat paket** kosakata SMP Level 2, 5 soal → **Simpan draf** → kartu bergaris putus-putus, status Draf
- [ ] Siswa SMP: draf **tidak** muncul di game, lonceng, Beranda, atau Tantangan Harian
- [ ] Guru A → draf → **Terbitkan** → status Terbit; siswa melihatnya di game & lonceng, main → poin masuk peringkat
- [ ] Guru A → paket baru → Jadwalkan 10 menit lagi → status Terjadwal + tanggal; siswa belum melihatnya; setelah waktunya tampil
- [ ] Isi 31 soal → "Maksimal 30 soal"; tidak bisa disimpan. Baris tanpa `=` → kesalahan per baris tampil
- [ ] Jenis Kosakata → muncul catatan "Kosakata: tulis kata Inggris = arti Indonesia. Paket ini juga dipakai untuk Tantangan Harian."
- [ ] Ubah paket terbit (judul / ejaan) → tersimpan; skor lama siswa tidak berubah
- [ ] Siswa membuka paket itu, guru menambah 1 soal, siswa menyelesaikan → pesan "paket ini baru diubah ... Muat ulang halaman"; setelah dimuat ulang skornya tersimpan
- [ ] Paket Terbit/Terjadwal tidak punya tombol Hapus; **Nonaktifkan** → hilang dari game siswa → tombol **Hapus** muncul → hapus berhasil
- [ ] Nonaktif → **Aktifkan** → terbit lagi, siswa mendapat notifikasi
- [ ] Guru B tidak melihat paket Guru A di halaman guru
- [ ] Admin → Paket Soal: kolom **Pembuat** = nama Guru A; paket lama = Admin; filter pembuat berfungsi; status Draf/Terjadwal/Terbit/Nonaktif
- [ ] Admin bisa mengubah, menonaktifkan, menerbitkan draf, dan menghapus paket Guru A; pemiliknya tetap Guru A
- [ ] Admin menonaktifkan akun Guru A → halaman guru: "Akun guru nonaktif"; paket Guru A yang terbit tetap bisa dimainkan siswa
- [ ] Judul paket `<b>tes</b>` → tampil apa adanya sebagai teks (guru, admin, game, lonceng)
- [ ] Paket lama, skor, poin, Tantangan Harian, dan Toko siswa tetap berjalan

## Uji hasil & mode coba – Tahap 3 (tidak ada perubahan aturan)

Siapkan Guru A dengan paket kosakata SMP (terbit), paket draf jenjang SD, dan paket Kalimat; dua siswa SMP **bernama sama**.

- [ ] Guru A → kartu kosakata → **Coba** → muncul 5 pilihan game → buka Kuis Kosakata: paket langsung terpilih, bilah "Mode coba: skor tidak disimpan" tampil
- [ ] Main sampai selesai → pesan "Mode coba: skor tidak disimpan."; tidak ada skor baru di admin (tab Skor Game); peringkat, lonceng, koin, dan tier siswa tidak berubah
- [ ] Kartu Kalimat → **Coba** → langsung membuka Susun Kalimat
- [ ] Coba paket **draf SD** → bisa dimainkan guru (tag Draf); login sebagai siswa SD → draf tetap tidak muncul di game, lonceng, Beranda, Tantangan Harian
- [ ] Di halaman game, akun guru melihat paketnya di jenjang mana pun + paket terbit semua jenjang; filter Paket saya / per jenjang berfungsi
- [ ] Akun guru → Beranda/lonceng/Tantangan Harian tetap seperti biasa (tidak menampilkan draf)
- [ ] Dua siswa bernama sama memainkan paket SMP → **Hasil**: muncul sebagai dua baris terpisah; jumlah Siswa, Permainan, nilai terbaik + nama game, jumlah main, terakhir main benar
- [ ] Siswa menyelesaikan Hafalan Tanpa Salah → tampil "Tuntas, x salah", tidak masuk rata-rata; jika hanya ada Hafalan → rata-rata "–"
- [ ] **Minggu ini** hanya menghitung skor minggu ini (Senin–Minggu); **Semua waktu** menghitung semuanya; berpindah pilihan tidak memuat ulang
- [ ] Nama siswa yang sangat panjang tidak merusak tampilan di HP (maks. 2 baris)
- [ ] Draf tidak punya tombol Hasil
- [ ] Siswa & admin: game, skor, peringkat, Tantangan Harian, Toko, tab Paket Soal tetap berjalan

## Uji tampilan Paket A (tanpa perubahan aturan)

- [ ] Siswa main paket baru sampai selesai → kartu hasil "+x poin" (sama dengan kenaikan di Beranda/Peringkat)
- [ ] Main lagi paket yang sama dengan nilai lebih rendah → "Hasil terbaikmu masih x poin"; nilai lebih tinggi → "+selisih poin"
- [ ] Paket yang sudah poin penuh → "Poin penuh"; tab Kata Sendiri → "Latihan bebas: tanpa poin"
- [ ] Tantangan Harian selesai → "+x poin"; buka lagi hari itu → tetap tampil poin dari skor tersimpan
- [ ] Akun guru selesai main → "Mode coba: skor tidak disimpan"
- [ ] Matikan internet sebelum menekan selesai → setelah ±8 detik "Internet belum tersambung..." (tanpa angka poin); nyalakan lagi → otomatis berganti hasil poin; di admin hanya ada **satu** skor baru
- [ ] Halaman masuk: label di atas setiap isian, tiga hewan tampil, tautan "Admin" kecil di bawah tetap membuka login admin; HP, PC, mode gelap
- [ ] Beranda belum ada paket penuh → "Belum ada paket dengan poin penuh (0 dari n)"

## Uji tampilan Paket B (tanpa perubahan aturan)

- [ ] Beranda, Peringkat, rekap Senin, Tantangan Harian, admin: label kecil huruf biasa (tidak kapital); nama siswa & poster tetap kapital
- [ ] Guru di HP: Ubah/Coba/Hasil sama lebar di baris pertama, tombol status di kanan bawah; draf: Terbitkan hijau; filter memudar di tepi saat bisa digeser
- [ ] Susun Kalimat: kata yang dipakai menjadi kotak kosong bergaris putus-putus, tidak bisa diketuk; sisa kesempatan tetap 3 per kalimat; ketuk kata di susunan → kata kembali ke tempatnya

## Uji batas 2 minggu per paket (setelah memasang aturan terbaru)

Pasang aturan dulu, lalu push kode segera. Di antara keduanya, skor paket dari halaman lama ditolak dengan pesan "Muat ulang halaman lalu main lagi"; sebaiknya dilakukan saat sepi (mis. Minggu malam).

- [ ] Siswa main paket yang **belum pernah** dimainkan: skor tersimpan, "+x poin"; di Firebase Console ada dokumen `packStarts/<uid>_<packId>` dengan `week` = Senin minggu ini, dan skornya punya `packStart` yang sama
- [ ] Main lagi paket yang sama: tersimpan seperti biasa, tidak ada dokumen `packStarts` baru
- [ ] Paket yang sudah dimainkan sebelum aturan ini: `packStarts.week` = minggu skor paling awal siswa di paket itu
- [ ] Mulai 30 Nov: paket yang minggu pertamanya 16 Nov atau lebih awal bertanda "Latihan: poin paket ini sudah habis" di daftar paket & pratinjau; main sampai selesai, kartu hasil menampilkan kalimat yang sama; poin, jumlah Paket, koin, dan XP tidak bertambah
- [ ] Paket yang minggu pertamanya 23 Nov masih berpoin di minggu 30 Nov, menjadi latihan mulai 7 Des
- [ ] Beranda "Paket minggu ini" tidak menghitung paket latihan
- [ ] Peringkat, Musim, tier, koin, rekap untuk minggu sebelum 30 Nov tidak berubah
- [ ] Buka paket di HP B, lalu mainkan paket itu pertama kali di HP A, baru selesaikan di HP B: skor dari B tetap tersimpan (dikirim ulang otomatis)
- [ ] Main offline Minggu malam, internet kembali sebelum Senin 01.00: skor masuk minggu lalu; lewat 01.00: ditolak
- [ ] Tantangan Harian & latihan Kata Sendiri tetap tersimpan seperti biasa
- [ ] Admin menghapus akun siswa: dokumen `packStarts` siswa itu ikut terhapus

## Uji event Musim Liburan – Tahap 1 (setelah memasang aturan terbaru)

Aturan ini digabung dengan aturan batas 2 minggu: tempel **sekali** (29 Nov). Aturan event aman dipasang sebelum kode event: kode lama tidak mengenal barang baru.

- [ ] Sebelum 1 Des: Toko menampilkan baris "Musim Liburan Akhir Tahun, 1 Des – 3 Jan. Kumpulkan koinmu dari sekarang." dan 5 barang edisi terkunci dengan harga + label "Mulai 1 Des" (bilah aksi "Segera hadir 1 Desember · x koin"; bisa dicoba, tanpa tombol Beli); Topi Santa emas terkunci "Hadiah juara"; Beranda tanpa tanda event; lewat konsol, menambah `topi-santa` ke `items` ditolak
- [ ] Mulai 1 Des: Beranda menampilkan "Musim Liburan Akhir Tahun" (ketuk → Toko); Toko: catatan "dijual sampai 3 Januari", 5 barang edisi di depan tiap slot dengan tanda "Edisi Liburan 2026"; beli → saldo berkurang sesuai harga, barang langsung dipakai
- [ ] Topi Santa emas tampil terkunci "Hadiah juara" (satu baris), bilah aksi "Hadiah Juara 1–3 Musim Liburan, tidak dijual", tidak bisa dibeli; menambahkannya lewat konsol ditolak
- [ ] Peringkat → Musim, 1–6 Des: "Musim November" + kalimat "Minggu terakhir Musim November. Musim Liburan mulai Senin 7 Desember."; total Musim November tidak berubah
- [ ] Mulai 7 Des: tab Musim "Musim Liburan" (7 Des – 3 Jan, 4 kotak minggu) + kalimat hadiah; poster "Musim Liburan" dengan salju; rekap Senin bertema salju dan menyebut "papan Musim Liburan" untuk bonus
- [ ] Hewan di Peringkat memakai barang edisi yang dibeli; mengisi `pets.equipped` dengan barang yang tidak dimiliki lewat konsol ditolak
- [ ] Setelah 3 Jan: barang edisi tidak tampil bagi yang tidak memiliki; pemilik tetap bisa memakai/melepas; membeli lewat konsol ditolak
- [ ] 4 Jan setelah 01.00: admin membuka `admin.html` → konsol "Hadiah Juara Musim Liburan diberikan ke n siswa"; juara 1–3 melihat Topi Santa emas "Dimiliki" di Toko (saldo tidak berkurang); rekap 4 Jan: "Juara Musim Liburan" + "Hadiahmu: Topi Santa emas"
- [ ] HP & PC, mode terang & gelap: tanda Beranda, kartu musim, kartu Toko rapi

## Papan peringkat

- Poin = jumlah jawaban benar dari **paket soal guru** dalam satu minggu (Senin 00.00 – Minggu 23.59 WIB). Satu paket yang dimainkan berkali-kali hanya dihitung hasil terbaiknya. Mulai 30 Nov 2026 setiap paket memberi poin hanya di 2 minggu kalender pertama siswa memainkannya; setelah itu latihan tanpa poin. Keterbatasan (tanpa server): siswa yang sangat paham teknis bisa mencatat "minggu ini" sebagai minggu pertama untuk paket yang sudah lama ia mainkan, tetapi hanya sekali per paket (paling banyak 2 minggu tambahan). Latihan dengan kata sendiri tidak menambah poin.
- Ada papan **Semua Jenjang** (tampilan awal) dan papan per jenjang.
- Nama ditampilkan singkat (nama depan + inisial), misalnya "Aisyah P.".
- Skor yang mencurigakan bisa dihapus admin di tab **Skor Game**; poinnya otomatis hilang dari peringkat.
- Skor lama (sebelum fitur peringkat) tidak ikut dihitung karena belum punya data minggu.

## Keterbatasan

- **Password akun nama pengguna** tidak bisa direset dari website, karena Firebase versi gratis tidak mengizinkannya tanpa server. Jika siswa lupa, buatkan akun baru. Siswa yang memakai email bisa memakai tombol "Lupa password".
- **Hapus akun** di admin menghapus profil & semua skor siswa. Akun loginnya terhapus otomatis saat siswa itu mencoba masuk lagi; sebelum itu ia tidak bisa bermain atau menyimpan skor.

## Kalau email admin diganti

Ubah di fungsi `isAdmin()` dalam `firestore.rules` **dan** `ADMIN_EMAIL` di `ec-common.js`. Halaman `admin-login.html` juga masih menyebut email ini; cari `authorizedAdminEmail`.
