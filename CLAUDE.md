# Aturan kerja – Website ExtraCourse

1. **Setiap sesi, baca `CATATAN-PROYEK.md` dulu** sebelum mengubah apa pun. Jika mengubah aturan Firestore atau data, baca juga `KEAMANAN.md`.
2. **Sebelum setiap commit yang mengubah file website** (`.html`, `.js`, `.css`), wajib jalankan:
   ```
   node versi.mjs
   node versi.mjs --cek
   ```
   Perintah pertama mengganti tanda versi (`?v=...`) di semua rujukan file lokal ke tanggal hari ini. Perintah kedua harus berbunyi "Semua rujukan memakai versi yang sama". File baru yang memuat `.css`/`.js` lokal juga wajib memakai tanda versi (`node versi.mjs` mengisinya otomatis). Commit yang hanya mengubah dokumen (`.md`) tidak perlu.
3. Jangan commit atau push sebelum pemilik setuju. Jika `firestore.rules` berubah, pemilik menempelkannya manual ke Firebase Console **sebelum** kode di-push.
4. Bahasa Indonesia sederhana; kerjakan satu fitur per langkah, jelaskan rencana sebelum menulis kode, dan kabari jika butuh biaya atau layanan pihak lain.
