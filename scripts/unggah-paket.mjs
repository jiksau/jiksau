// Pengunggah paket soal otomatis ExtraCourse.
//
// Membaca file paket-otomatis/<Senin>.json lalu menyimpan paketnya ke
// Firestore (questionPacks) sebagai paket admin yang TERJADWAL terbit
// Senin itu pukul 06.00 WIB. Dijalankan oleh GitHub Actions
// (.github/workflows/unggah-paket.yml) setiap ada file paket baru.
//
//     node scripts/unggah-paket.mjs --cek [file...]   → hanya memeriksa isi file
//     node scripts/unggah-paket.mjs [file...]         → periksa + unggah
//
// Tanpa nama file: semua file di paket-otomatis/.
// Unggah butuh variabel FIREBASE_SERVICE_ACCOUNT (isi JSON kunci akses),
// disimpan di GitHub → Settings → Secrets and variables → Actions.
//
// Aman diulang: ID dokumen tetap (auto-<Senin>-<jenjang>), jadi paket tidak
// dobel. Paket yang SUDAH terbit tidak diubah lagi, karena skor siswa
// terikat pada jumlah soal paket.

import { readdirSync, readFileSync } from "node:fs";
import { basename, join } from "node:path";

const DIR = "paket-otomatis";
const LEVELS = ["SD", "SMP", "SMA", "S1", "S2", "UMUM", "SEMUA"];
const TYPES = ["kosakata"];
const MAX_ITEMS = 200;
const ONLY_CHECK = process.argv.includes("--cek");

const args = process.argv.slice(2).filter((a) => !a.startsWith("--"));
const files = args.length ? args
    : readdirSync(DIR).filter((f) => /^\d{4}-\d{2}-\d{2}\.json$/.test(f)).sort().map((f) => join(DIR, f));

const clean = (s) => String(s ?? "").trim().replace(/\s+/g, " ");

// Senin 06.00 WIB = Minggu 23.00 UTC
function publishDate(week) {
    const d = new Date(`${week}T06:00:00+07:00`);
    return d;
}

function checkFile(path) {
    const errors = [];
    const week = basename(path, ".json");
    let data;
    try { data = JSON.parse(readFileSync(path, "utf8")); }
    catch (e) { return { errors: [`${path}: bukan JSON yang sah (${e.message})`] }; }

    const when = publishDate(week);
    if (isNaN(when) || when.getUTCDay() !== 0) errors.push(`${path}: nama file harus tanggal hari Senin (YYYY-MM-DD).`);
    if (data.week !== week) errors.push(`${path}: field "week" harus sama dengan nama file (${week}).`);
    if (!clean(data.theme)) errors.push(`${path}: field "theme" wajib diisi.`);
    if (!Array.isArray(data.packs) || data.packs.length === 0) errors.push(`${path}: "packs" harus berisi minimal satu paket.`);

    const seenLevels = new Set();
    const packs = (data.packs || []).map((p, i) => {
        const at = `${path} paket ${i + 1}`;
        const title = clean(p.title);
        const type = p.type || "kosakata";
        const level = p.level;
        const tier = p.tier;
        if (!title || title.length > 80) errors.push(`${at}: judul wajib, maks. 80 huruf.`);
        if (!TYPES.includes(type)) errors.push(`${at}: jenis harus salah satu dari ${TYPES.join(", ")}.`);
        if (!LEVELS.includes(level)) errors.push(`${at}: jenjang harus salah satu dari ${LEVELS.join(", ")}.`);
        if (seenLevels.has(level)) errors.push(`${at}: jenjang ${level} muncul dua kali di minggu ini.`);
        seenLevels.add(level);
        if (!Number.isInteger(tier) || tier < 1 || tier > 5) errors.push(`${at}: level harus bilangan 1–5.`);
        if (!Array.isArray(p.items) || p.items.length === 0 || p.items.length > MAX_ITEMS) {
            errors.push(`${at}: soal harus 1–${MAX_ITEMS}.`);
        }
        const seenQ = new Set();
        const items = (p.items || []).map((it, j) => {
            const q = clean(it.q), a = clean(it.a);
            if (!q || !a) errors.push(`${at} soal ${j + 1}: kata dan arti wajib diisi.`);
            if (q.length > 80 || a.length > 80) errors.push(`${at} soal ${j + 1}: maks. 80 huruf per sisi.`);
            if (q.includes("=") || a.includes("=")) errors.push(`${at} soal ${j + 1}: tidak boleh memakai tanda =.`);
            const key = q.toLowerCase();
            if (seenQ.has(key)) errors.push(`${at} soal ${j + 1}: kata "${q}" muncul dua kali.`);
            seenQ.add(key);
            return { q, a };
        });
        return { id: `auto-${week}-${String(level).toLowerCase()}`, title, type, level, tier, items };
    });
    return { week, when, theme: clean(data.theme), packs, errors };
}

const results = files.map(checkFile);
const allErrors = results.flatMap((r) => r.errors);
if (allErrors.length) {
    console.error("Ada yang perlu diperbaiki:\n- " + allErrors.join("\n- "));
    process.exit(1);
}
for (const r of results) {
    console.log(`${r.week} · ${r.theme}: ${r.packs.map((p) => `${p.level} L${p.tier} (${p.items.length} soal)`).join(", ")}`);
}
if (ONLY_CHECK) {
    console.log("Pemeriksaan selesai: semua file sah.");
    process.exit(0);
}

const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
if (!raw) {
    console.error("FIREBASE_SERVICE_ACCOUNT belum diisi (lihat GitHub → Settings → Secrets).");
    process.exit(1);
}
const { initializeApp, cert } = await import("firebase-admin/app");
const { getFirestore, FieldValue, Timestamp } = await import("firebase-admin/firestore");
initializeApp({ credential: cert(JSON.parse(raw)) });
const db = getFirestore();

let made = 0, updated = 0, skipped = 0;
for (const r of results) {
    for (const p of r.packs) {
        const ref = db.collection("questionPacks").doc(p.id);
        const snap = await ref.get();
        const data = {
            title: p.title, type: p.type, level: p.level, tier: p.tier,
            items: p.items, itemCount: p.items.length, active: true,
            publishedAt: Timestamp.fromDate(r.when), updatedAt: FieldValue.serverTimestamp(),
        };
        if (snap.exists) {
            const pub = snap.get("publishedAt");
            if (pub && pub.toDate() <= new Date()) { skipped++; console.log(`Lewati ${p.id}: sudah terbit.`); continue; }
            await ref.set(data, { merge: true });
            updated++; console.log(`Diperbarui ${p.id}`);
        } else {
            await ref.set({ ...data, createdAt: FieldValue.serverTimestamp() });
            made++; console.log(`Dibuat ${p.id}`);
        }
    }
}
console.log(`Selesai: ${made} dibuat, ${updated} diperbarui, ${skipped} dilewati (sudah terbit).`);
