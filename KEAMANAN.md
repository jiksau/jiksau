# Keamanan Data ExtraCourse (Firestore)

Website ini fokus pada **permainan dan aktivitas belajar**. Data administratif (absensi, data pendaftaran lengkap, laporan orang tua) dikelola di spreadsheet, **bukan** di website.

File `firestore.rules` mengatur siapa boleh membaca dan mengubah data di database Firebase `extra-course-d02c2`.

## Data yang disimpan website

| Data | Isi | Siswa | Admin | Belum login |
|---|---|---|---|---|
| Profil (`users`) | Nama, email/nama pengguna, jenjang, kode kelas | Lihat profil sendiri; dibuat saat daftar dengan kode kelas aktif; hanya bisa mengubah waktu masuk terakhir | Semua (buat akun tanpa email, ubah nama & jenjang) | Tidak bisa |
| Kode kelas (`classCodes`) | Kode, jenjang, keterangan, aktif/nonaktif | Hanya bisa mengecek satu kode saat mendaftar | Semua | Hanya cek satu kode |
| Paket soal (`questionPacks`) | Judul, jenis, jenjang, daftar soal, aktif/nonaktif | Membaca paket yang aktif | Semua | Tidak bisa |
| Skor game (`gameScores`) | Nama, jenjang, game, nilai, paket soal, waktu, minggu | Simpan skor sendiri (tidak bisa mengubah); skor berpaket hanya jika paketnya aktif, sesuai jenjang, dan jumlah soal sama; lihat skor sendiri + skor siswa lain untuk papan peringkat | Semua, termasuk hapus | Tidak bisa |

Semua koleksi lain ditolak, termasuk data lama (absensi, pendaftaran, kelas, guru).

Siswa tidak bisa mengubah jenjang atau perannya sendiri, melihat data siswa lain, atau mendaftar tanpa kode kelas yang aktif.

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

## Uji notifikasi paket baru

- [ ] Admin membuat paket baru → siswa jenjang itu melihat angka merah di lonceng (dashboard & daftar game)
- [ ] Siswa membuka lonceng → angka tetap; tombol game membuka game dengan paket itu sudah terpilih
- [ ] Mainkan paket itu sampai selesai, kembali ke daftar game → angka berkurang satu, paket bertanda "Sudah dimainkan"
- [ ] Muat ulang halaman / masuk dari HP lain → angka tetap sama

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
