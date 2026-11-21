# Paket Soal Otomatis – Panduan

Folder ini berisi paket soal mingguan yang dibuat otomatis oleh Claude (tugas terjadwal tiap Minggu sore). Setiap file yang masuk ke `main` diunggah GitHub Actions ke Firebase (`questionPacks`) sebagai paket admin yang **terjadwal terbit Senin 06.00 WIB**.

## Aturan pembuatan

- **Satu file per minggu**, nama file = tanggal hari Senin: `YYYY-MM-DD.json`.
- **4 paket kosakata**, masing-masing **10 soal**: `SD`, `SMP`, `SMA`, dan `SEMUA` (semua jenjang).
- **Satu tema per minggu** untuk keempat paket. Kata di keempat paket tidak boleh sama satu sama lain, dan tidak boleh mengulang kata dari 8 minggu terakhir (cek file-file sebelumnya). Tema tidak boleh mengulang tema 12 minggu terakhir.
- **Level bergilir** mulai 2026-11-23: minggu ke-0 Level 1, ke-1 Level 2, ke-2 Level 3, lalu ulang (`(jumlah minggu sejak 2026-11-23) mod 3 + 1`). Keempat paket memakai level yang sama.
- Isi: **vocabulary dasar bahasa Inggris**. `q` = kata/frasa Inggris, `a` = arti bahasa Indonesia. Jawaban alternatif dipisah ` / ` (mis. `big` → `besar / luas`). Maks. 80 huruf per sisi, tanpa tanda `=`.
- Tingkat kesulitan sesuai jenjang **dan** level:
  - SD: kata benda/kerja/sifat sehari-hari yang konkret.
  - SMP: kata umum yang sedikit lebih luas, boleh frasa pendek (mis. `heavy rain`).
  - SMA: kata akademis/umum tingkat menengah, frasa, kata kerja frasal sederhana.
  - SEMUA: kata inti tema yang bisa dikerjakan semua jenjang.
  - Level 1 = paling mudah di jenjang itu; Level 3 = lebih menantang tetapi tetap wajar.
- Satu kata = satu arti utama yang jelas. Hindari kata yang artinya ambigu tanpa konteks; jika ada dua arti umum, tulis keduanya dengan ` / `.
- Tema mengikuti musim/momen dan topik sekolah (mis. musim hujan, liburan sekolah, Tahun Baru, ujian, Ramadan, hari besar nasional). Hindari tema sensitif (agama secara khusus, politik).
- Judul paket: `<Tema> · <Jenjang>` (mis. `Weather & Seasons · SMP`, `Weather & Seasons · Semua Jenjang`), maks. 80 huruf.

## Format file

```json
{
  "week": "2026-11-23",
  "theme": "Weather & Seasons",
  "packs": [
    {
      "title": "Weather & Seasons · SD",
      "type": "kosakata",
      "level": "SD",
      "tier": 1,
      "items": [{ "q": "rain", "a": "hujan" }]
    }
  ]
}
```

## Pemeriksaan

Sebelum commit: `node scripts/unggah-paket.mjs --cek paket-otomatis/<file>.json` harus berbunyi "Pemeriksaan selesai: semua file sah."

## Catatan

- ID paket di Firestore: `auto-<Senin>-<jenjang>` (mis. `auto-2026-11-23-smp`). Mengirim ulang file yang sama tidak membuat paket dobel.
- Paket yang **sudah terbit tidak diubah** lagi oleh pengunggah (skor siswa terikat pada jumlah soal). Perbaikan setelah terbit dilakukan manual di admin.html.
- Paket otomatis tampil sebagai paket **Admin** dan bisa diubah/dinonaktifkan seperti biasa.
