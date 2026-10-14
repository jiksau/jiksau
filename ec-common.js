// =====================================================================
//  ec-common.js - Pengaturan bersama website ExtraCourse
// ---------------------------------------------------------------------
//  Dipakai oleh index.html, user-dashboard.html, admin.html dan
//  game-scores.js, supaya konfigurasi tidak perlu disalin ke banyak file.
// =====================================================================

export const FIREBASE_VERSION = "9.23.0";

export const firebaseConfig = {
    apiKey: "AIzaSyA-EoipgOVg9prfbYJ5VoYjA8rqk-RDW5U",
    authDomain: "extra-course-d02c2.firebaseapp.com",
    projectId: "extra-course-d02c2",
    storageBucket: "extra-course-d02c2.firebasestorage.app",
    messagingSenderId: "40624772967",
    appId: "1:40624772967:web:d022eb7b2c2f4785a641c2",
};

// Email admin. Jika diganti, ubah juga fungsi isAdmin() di firestore.rules.
export const ADMIN_EMAIL = "admin@extracourse.com";

// Jenjang siswa. "value" disimpan di database, "label" ditampilkan.
export const LEVELS = [
    { value: "SD", label: "SD" },
    { value: "SMP", label: "SMP" },
    { value: "SMA", label: "SMA" },
    { value: "S1", label: "Kuliah S1" },
    { value: "S2", label: "Kuliah S2" },
    { value: "UMUM", label: "Umum" },
];

export function levelLabel(value) {
    return LEVELS.find((l) => l.value === value)?.label || "Belum diatur";
}

// ---------- Akun tanpa email (dibuat admin) ----------
// Siswa tanpa email login dengan "nama pengguna". Di belakang layar,
// Firebase tetap butuh format email, jadi nama pengguna diubah menjadi
// <nama>@<USERNAME_DOMAIN>. Domain ini milik Firebase (tidak menerima email),
// sehingga tidak bisa dipakai orang lain.
export const USERNAME_DOMAIN = "siswa.extra-course-d02c2.firebaseapp.com";
export const USERNAME_PATTERN = /^[a-z0-9][a-z0-9._]{2,29}$/;

export function normalizeUsername(text) {
    return String(text || "").trim().toLowerCase();
}

// Mengubah isian login ("budi.smp" atau "budi@gmail.com") menjadi email Firebase.
export function loginIdToEmail(text) {
    const id = String(text || "").trim();
    if (id.includes("@")) return id;
    return `${normalizeUsername(id)}@${USERNAME_DOMAIN}`;
}

export function isUsernameEmail(email) {
    return String(email || "").toLowerCase().endsWith("@" + USERNAME_DOMAIN);
}

export function usernameFromEmail(email) {
    return isUsernameEmail(email) ? email.split("@")[0] : null;
}

// Kode kelas: huruf besar & angka, 4-12 karakter.
export const CLASS_CODE_PATTERN = /^[A-Z0-9]{4,12}$/;

export function normalizeClassCode(text) {
    return String(text || "").trim().toUpperCase().replace(/\s+/g, "");
}

export function escapeHtml(text) {
    return String(text ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

// Pesan error Firebase dalam Bahasa Indonesia.
export function friendlyAuthError(error) {
    const code = error?.code || "";
    const map = {
        "auth/email-already-in-use": "Email atau nama pengguna ini sudah terdaftar.",
        "auth/invalid-email": "Format email tidak valid.",
        "auth/weak-password": "Password minimal 6 karakter.",
        "auth/user-not-found": "Akun tidak ditemukan. Periksa kembali email atau nama pengguna.",
        "auth/wrong-password": "Password salah.",
        "auth/invalid-credential": "Email/nama pengguna atau password salah.",
        "auth/invalid-login-credentials": "Email/nama pengguna atau password salah.",
        "auth/too-many-requests": "Terlalu banyak percobaan. Coba lagi beberapa menit lagi.",
        "auth/network-request-failed": "Koneksi internet bermasalah. Coba lagi.",
        "permission-denied": "Akses ditolak oleh server.",
    };
    return map[code] || error?.message || "Terjadi kesalahan. Coba lagi.";
}

// ---------- Minggu peringkat (Senin 00.00 - Minggu 23.59 WIB) ----------
const WIB_OFFSET_MS = 7 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

// Kunci minggu = tanggal Senin (WIB) dalam format "YYYY-MM-DD".
export function weekKeyFor(date = new Date()) {
    const wib = new Date(date.getTime() + WIB_OFFSET_MS);
    const daysSinceMonday = (wib.getUTCDay() + 6) % 7;
    const monday = Date.UTC(wib.getUTCFullYear(), wib.getUTCMonth(), wib.getUTCDate() - daysSinceMonday);
    return new Date(monday).toISOString().slice(0, 10);
}

export function previousWeekKey(key) {
    return new Date(Date.parse(key + "T00:00:00Z") - 7 * DAY_MS).toISOString().slice(0, 10);
}

// Waktu (ms) saat minggu berakhir / peringkat direset.
export function weekEndMs(key) {
    return Date.parse(key + "T00:00:00Z") + 7 * DAY_MS - WIB_OFFSET_MS;
}

// Contoh: "13–19 Okt 2026" atau "28 Sep – 4 Okt 2026"
export function weekRangeLabel(key) {
    const start = new Date(Date.parse(key + "T00:00:00Z"));
    const end = new Date(start.getTime() + 6 * DAY_MS);
    const month = (d) => d.toLocaleDateString("id-ID", { month: "short", timeZone: "UTC" });
    const sameMonth = start.getUTCMonth() === end.getUTCMonth();
    const left = sameMonth ? `${start.getUTCDate()}` : `${start.getUTCDate()} ${month(start)} `;
    return `${left}–${sameMonth ? "" : " "}${end.getUTCDate()} ${month(end)} ${end.getUTCFullYear()}`;
}

// "Aisyah Putri Ramadhani" -> "Aisyah P." (privasi di papan peringkat)
export function shortName(name) {
    const parts = String(name || "Siswa").trim().split(/\s+/);
    return parts.length > 1 ? `${parts[0]} ${parts[1][0].toUpperCase()}.` : parts[0];
}
