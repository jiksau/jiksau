# Keamanan Data Extra Course (Firestore)

File `firestore.rules` berisi aturan yang menentukan **siapa boleh membaca dan mengubah data** di database Firebase `extra-course-d02c2`.

## Kenapa perlu?

Halaman admin (`admin.html`, `admin-registrations.html`, `admin-attendance.html`) memang mengecek email admin, tetapi pengecekan itu hanya berjalan di browser. Orang yang sudah mendaftar akun bisa langsung mengakses database tanpa melewati halaman admin. Satu-satunya pengaman yang sebenarnya adalah aturan di server Firebase.

## Siapa boleh apa

| Data | Siswa (sudah login) | Admin | Belum login |
|---|---|---|---|
| Profil (`users`) | Lihat profil sendiri; buat profil saat daftar (peran otomatis "Student"); perbarui waktu login terakhir | Semua | Tidak bisa |
| Pendaftaran | Kirim pendaftaran atas nama sendiri; lihat pendaftaran sendiri | Semua | Tidak bisa |
| Absensi & evaluasi (`studentAttendance`) | Catat absensi sendiri; lihat riwayat sendiri | Semua, termasuk edit & hapus | Tidak bisa |
| Kelas (`classes`) & guru (`teachers`) | Tidak bisa | Semua | Tidak bisa |

Siswa tidak bisa mengubah perannya sendiri menjadi admin, melihat data siswa lain, atau mengedit absensi yang sudah tercatat.

Catatan: jalur data pendaftaran (`artifacts/.../public/data/registrations`) sengaja **tidak dipindah** supaya pendaftaran lama tetap tampil di panel admin. Kata "public" di jalur itu hanya nama; yang menentukan akses adalah aturan ini.

## Cara memasang (±5 menit)

1. Buka https://console.firebase.google.com dan pilih project **extra-course-d02c2**.
2. Menu kiri: **Firestore Database → tab Rules**.
3. **Simpan cadangan:** salin aturan lama ke Notepad dulu, untuk berjaga-jaga.
4. Hapus isi editor, tempel seluruh isi `firestore.rules`, lalu klik **Publish**.

Aturan berlaku dalam 1–2 menit.

## Uji setelah memasang

Coba di website, sebaiknya di jendela penyamaran (incognito):

- [ ] Daftar akun siswa baru → diarahkan ke form pendaftaran
- [ ] Kirim form pendaftaran → berhasil, masuk ke dashboard
- [ ] Dashboard siswa menampilkan nama, status pendaftaran, dan riwayat absensi
- [ ] Siswa mencatat absensi & evaluasi → berhasil
- [ ] Login sebagai `admin@extracourse.com` → semua menu admin tampil: pendaftaran, absensi, kelas, guru
- [ ] Admin bisa mengedit dan menghapus data
- [ ] Login sebagai siswa lalu buka `admin.html` → ditolak

Kalau ada yang gagal (pesan "Missing or insufficient permissions"), tempel kembali aturan lama dari cadangan, lalu kabari bagian mana yang gagal.

## Kalau email admin diganti

Ubah email di fungsi `isAdmin()` dalam `firestore.rules`, **dan** di tiga halaman admin (cari `authorizedAdminEmail`).
