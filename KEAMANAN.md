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
| Hasil akhir mingguan (`weeklyResults`) | Peringkat akhir tiap minggu yang sudah selesai (nama, jenjang, poin) | Membaca (untuk rekap & riwayat juara) | Semua; tersimpan otomatis saat admin membuka halaman admin | Tidak bisa |
| Skor game (`gameScores`) | Nama, jenjang, game, nilai, paket soal, waktu, minggu | Simpan skor sendiri (tidak bisa mengubah); nilai harus angka (`percent` 0–100, `points` bilangan bulat, `mode` teks pendek); skor berpaket hanya jika paketnya aktif, sesuai jenjang, dan jumlah soal sama; lihat skor sendiri + skor siswa lain untuk papan peringkat | Semua, termasuk hapus | Tidak bisa |

Semua koleksi lain ditolak, termasuk data lama (absensi, pendaftaran, kelas, koleksi lama `teachers`). Peran guru yang baru memakai profil di `users` (lihat bagian Guru).

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

Catatan: akun guru tidak punya jenjang, jadi di game ia hanya melihat paket "Semua jenjang". Ini akan diselesaikan di Tahap 3 (mode coba).

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

## Papan peringkat

- Poin = jumlah jawaban benar dari **paket soal guru** dalam satu minggu (Senin 00.00 – Minggu 23.59 WIB). Satu paket yang dimainkan berkali-kali hanya dihitung hasil terbaiknya. Latihan dengan kata sendiri tidak menambah poin.
- Ada papan **Semua Jenjang** (tampilan awal) dan papan per jenjang.
- Nama ditampilkan singkat (nama depan + inisial), misalnya "Aisyah P.".
- Skor yang mencurigakan bisa dihapus admin di tab **Skor Game**; poinnya otomatis hilang dari peringkat.
- Skor lama (sebelum fitur peringkat) tidak ikut dihitung karena belum punya data minggu.

## Keterbatasan

- **Password akun nama pengguna** tidak bisa direset dari website, karena Firebase versi gratis tidak mengizinkannya tanpa server. Jika siswa lupa, buatkan akun baru. Siswa yang memakai email bisa memakai tombol "Lupa password".
- **Hapus akun** di admin menghapus profil & semua skor siswa. Akun loginnya terhapus otomatis saat siswa itu mencoba masuk lagi; sebelum itu ia tidak bisa bermain atau menyimpan skor.

## Kalau email admin diganti

Ubah di fungsi `isAdmin()` dalam `firestore.rules` **dan** `ADMIN_EMAIL` di `ec-common.js`. Halaman `admin-login.html` juga masih menyebut email ini; cari `authorizedAdminEmail`.
