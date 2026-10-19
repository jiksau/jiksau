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

// ---------- Paket soal (bank soal dari guru) ----------
// Disimpan di koleksi questionPacks. Hanya permainan dengan paket soal
// yang menambah poin di papan peringkat.
export const PACK_ALL_LEVELS = "SEMUA";
export const PACK_MAX_ITEMS = 200;
// Level kesulitan paket di dalam satu jenjang (1 = paling mudah).
export const PACK_TIERS = [1, 2, 3, 4, 5];

// Label tag paket, contoh: ["SMP", "Level 2"] atau ["Semua jenjang", "Level 1"]
export function packTags(pack) {
    const tags = [packLevelLabel(pack?.level)];
    if (pack?.tier) tags.push(`Level ${pack.tier}`);
    return tags;
}

// Game yang bisa memakai tiap jenis paket (untuk admin & notifikasi siswa).
// href boleh ditambah ?paket=<id> agar paket langsung terpilih.
export const PACK_GAMES = {
    kosakata: [
        { name: "Kuis Kosakata", href: "kosakata%202.html" },
        { name: "Kartu Hafalan", href: "kosakata%203.html" },
        { name: "Hafalan Tanpa Salah", href: "kosakata%205.html" },
        { name: "Cocokkan Pasangan", href: "cocokkan.html" },
    ],
    verb: [{ name: "Kata Kerja V1-V2-V3", href: "kosakata%204.html" }],
    kalimat: [{ name: "Susun Kalimat", href: "scramble.html" }],
};
const gameNames = (type) => PACK_GAMES[type].map((g) => g.name).join(", ");

export const PACK_TYPES = [
    {
        value: "kosakata", label: "Kosakata (kata = arti)",
        hint: "Satu pasang per baris: kata = arti. Jika ada beberapa jawaban benar, pisahkan dengan / (contoh: big = besar / luas).",
        example: "apple = apel\nbook = buku\nbig = besar / luas",
        games: gameNames("kosakata"),
    },
    {
        value: "verb", label: "Kata kerja (V1, V2, V3 = arti)",
        hint: "Satu kata kerja per baris: V1, V2, V3 = arti. Jika ada dua bentuk benar, pisahkan dengan / (contoh: learn, learnt / learned, learnt / learned = belajar).",
        example: "eat, ate, eaten = makan\ngo, went, gone = pergi\nlearn, learnt / learned, learnt / learned = belajar",
        games: gameNames("verb"),
    },
    {
        value: "kalimat", label: "Kalimat (untuk susun kalimat)",
        hint: "Satu kalimat per baris, 2–20 kata.",
        example: "I go to school every day.\nShe is reading a book.",
        games: gameNames("kalimat"),
    },
];

export function packTypeLabel(value) {
    return PACK_TYPES.find((t) => t.value === value)?.label || value;
}

export function packLevelLabel(value) {
    return value === PACK_ALL_LEVELS ? "Semua jenjang" : levelLabel(value);
}

// Mengubah teks yang ditempel admin menjadi daftar soal.
// Hasil: { items: [...], errors: ["Baris 3: ..."] }
export function parsePackText(type, text) {
    const items = [];
    const errors = [];
    const clean = (s) => String(s || "").trim().replace(/\s+/g, " ");
    String(text || "").split(/\r?\n/).forEach((raw, i) => {
        const line = clean(raw);
        if (!line) return;
        const at = `Baris ${i + 1}`;
        if (type === "kalimat") {
            const words = line.split(" ").length;
            if (words < 2 || words > 20) errors.push(`${at}: kalimat harus 2–20 kata.`);
            else if (line.length > 200) errors.push(`${at}: kalimat terlalu panjang (maks. 200 huruf).`);
            else items.push({ text: line });
            return;
        }
        const eq = line.indexOf("=");
        if (eq < 0) { errors.push(`${at}: tanda = tidak ditemukan.`); return; }
        const left = clean(line.slice(0, eq));
        const right = clean(line.slice(eq + 1));
        if (!left || !right) { errors.push(`${at}: sisi kiri dan kanan tanda = harus diisi.`); return; }
        if (left.length > 80 || right.length > 80) { errors.push(`${at}: terlalu panjang (maks. 80 huruf per sisi).`); return; }
        if (type === "verb") {
            const forms = left.split(",").map(clean);
            if (forms.length !== 3 || forms.some((f) => !f)) { errors.push(`${at}: tulis tiga bentuk dipisah koma, contoh: eat, ate, eaten = makan.`); return; }
            items.push({ v1: forms[0], v2: forms[1], v3: forms[2], arti: right });
        } else {
            items.push({ q: left, a: right });
        }
    });
    if (items.length > PACK_MAX_ITEMS) errors.push(`Maksimal ${PACK_MAX_ITEMS} soal per paket (sekarang ${items.length}).`);
    return { items, errors };
}

// Kebalikan parsePackText, untuk mengubah paket yang sudah ada.
export function packToText(type, items) {
    return (items || []).map((it) => type === "kalimat" ? it.text
        : type === "verb" ? `${it.v1}, ${it.v2}, ${it.v3} = ${it.arti}`
        : `${it.q} = ${it.a}`).join("\n");
}

// ---------- Hitung poin mingguan ----------
// Hanya skor dari paket soal guru (punya packId) yang dihitung.
// Jika satu paket dimainkan berkali-kali dalam seminggu, yang dihitung
// hanya hasil terbaiknya. Latihan dengan kata sendiri tidak menambah poin.
// scores: array data dokumen gameScores. Hasil: array per siswa.
export function weeklyPoints(scores) {
    const by = {};
    scores.forEach((s) => {
        if (!s || !s.packId) return;
        const r = by[s.userId] ||= { uid: s.userId, name: s.userName, level: s.level || null, best: {}, points: 0, games: 0, last: 0 };
        r.best[s.packId] = Math.max(r.best[s.packId] || 0, Number(s.correct) || 0);
        r.games += 1;
        const t = s.timestamp?.toMillis?.() ?? Date.now();
        if (t >= r.last) { r.last = t; r.name = s.userName || r.name; r.level = s.level || r.level; }
    });
    return Object.values(by).map((r) => {
        r.points = Object.values(r.best).reduce((a, b) => a + b, 0);
        r.packs = Object.keys(r.best).length;
        delete r.best;
        return r;
    });
}

// Urutkan hasil weeklyPoints menjadi peringkat (hanya yang punya poin).
// Poin sama = peringkat sama (1, 2, 2, 4, ...).
export function rankPlayers(rows) {
    const list = rows.filter((r) => r.points > 0)
        .sort((a, b) => b.points - a.points || b.packs - a.packs || shortName(a.name).localeCompare(shortName(b.name), "id"));
    list.forEach((r, i) => { r.rank = i > 0 && r.points === list[i - 1].points ? list[i - 1].rank : i + 1; });
    return list;
}

// Peringkat satu jenjang dari peringkat semua jenjang
export function levelRanking(ranking, level) {
    return rankPlayers((ranking || []).filter((r) => r.level === level).map((r) => ({ ...r })));
}

// ---------- Riwayat mingguan ----------
// Senin minggu pertama papan peringkat; riwayat juara dimulai dari sini.
export const FIRST_WEEK = "2026-10-12";

// Minggu yang sudah selesai, terbaru dulu (tidak termasuk minggu ini).
export function finishedWeeks(now = new Date()) {
    const out = [];
    for (let k = previousWeekKey(weekKeyFor(now)); k >= FIRST_WEEK; k = previousWeekKey(k)) out.push(k);
    return out;
}

// ---------- Musim bulanan ----------
// Satu musim = satu bulan, berisi minggu-minggu yang hari Seninnya jatuh
// di bulan itu (satu minggu tidak pernah terbelah dua musim).
// Kunci musim = "YYYY-MM". Poin musim = jumlah poin mingguan.
export const seasonKeyFor = (weekKey) => weekKey.slice(0, 7);

// Senin-Senin dalam satu musim, urut dari awal
export function seasonWeeks(season) {
    const [y, m] = season.split("-").map(Number);
    const out = [];
    for (let d = 1; d <= 31; d++) {
        const t = new Date(Date.UTC(y, m - 1, d));
        if (t.getUTCMonth() !== m - 1) break;
        if (t.getUTCDay() === 1) out.push(t.toISOString().slice(0, 10));
    }
    return out;
}

// "Oktober 2026"
export function seasonLabel(season) {
    return new Date(Date.parse(season + "-01T00:00:00Z")).toLocaleDateString("id-ID", { month: "long", year: "numeric", timeZone: "UTC" });
}

// "5 Okt – 1 Nov 2026" (Senin pertama sampai Minggu terakhir musim)
export function seasonRangeLabel(season) {
    const weeks = seasonWeeks(season);
    const start = new Date(Date.parse(weeks[0] + "T00:00:00Z"));
    const end = new Date(Date.parse(weeks[weeks.length - 1] + "T00:00:00Z") + 6 * DAY_MS);
    const f = (d) => d.toLocaleDateString("id-ID", { day: "numeric", month: "short", timeZone: "UTC" });
    return `${f(start)} – ${f(end)} ${end.getUTCFullYear()}`;
}

// Bonus poin musim untuk peringkat 1-5 papan mingguan Semua Jenjang.
// Diberikan setelah minggu itu selesai. Poin sama = peringkat sama = bonus sama.
export const WEEK_BONUS = { 1: 10, 2: 8, 3: 6, 4: 4, 5: 2 };
export const weekBonus = (rank) => WEEK_BONUS[rank] || 0;

// Gabungkan peringkat beberapa minggu menjadi peringkat musim.
// weeks: [{week, ranking}] dengan ranking = papan Semua Jenjang.
// Poin musim = jumlah poin mingguan + bonus peringkat (hanya minggu yang
// sudah selesai, yaitu sebelum currentWeek).
// Hasil: peringkat dengan points (total), weekPoints, bonus, packs, weeks.
// level: jika diisi, hanya siswa jenjang itu (total poin tetap sama).
export function seasonRanking(weeks, currentWeek = weekKeyFor(), level = null) {
    const by = {};
    weeks.forEach((w) => (w.ranking || []).forEach((r) => {
        const s = by[r.uid] ||= { uid: r.uid, name: r.name, level: r.level, points: 0, weekPoints: 0, bonus: 0, packs: 0, weeks: 0, last: "" };
        s.weekPoints += r.points; s.packs += r.packs || 0; s.weeks += 1;
        if (w.week < currentWeek) s.bonus += weekBonus(r.rank);
        if (w.week >= s.last) { s.last = w.week; s.name = r.name || s.name; s.level = r.level || s.level; }
    }));
    const all = Object.values(by).map((s) => ({ ...s, points: s.weekPoints + s.bonus }));
    return rankPlayers(level ? all.filter((s) => s.level === level) : all);
}

// "Aisyah Putri Ramadhani" -> "Aisyah P." (privasi di papan peringkat)
export function shortName(name) {
    const parts = String(name || "Siswa").trim().split(/\s+/);
    return parts.length > 1 ? `${parts[0]} ${parts[1][0].toUpperCase()}.` : parts[0];
}

// ---------- Pengumuman ----------
export const ANNOUNCE_TITLE_MAX = 80;
export const ANNOUNCE_BODY_MAX = 2000;

// Teks pengumuman -> HTML aman. Paragraf dipisah baris kosong;
// baris yang diawali "- " menjadi daftar berpoin.
export function announcementHtml(text) {
    return String(text || "").trim().split(/\n\s*\n/).map((block) => {
        const lines = block.split("\n").map((l) => l.trim()).filter(Boolean);
        const out = [];
        let list = [];
        const flush = () => { if (list.length) { out.push(`<ul>${list.join("")}</ul>`); list = []; } };
        let para = [];
        const flushPara = () => { if (para.length) { out.push(`<p>${para.join("<br>")}</p>`); para = []; } };
        lines.forEach((l) => {
            if (l.startsWith("- ")) { flushPara(); list.push(`<li>${escapeHtml(l.slice(2))}</li>`); }
            else { flush(); para.push(escapeHtml(l)); }
        });
        flushPara(); flush();
        return out.join("");
    }).join("");
}
