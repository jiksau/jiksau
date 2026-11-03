// Nomor versi file website ExtraCourse.
//
// Jalankan SEBELUM setiap commit yang mengubah file website:
//     node versi.mjs          → ganti versi ke tanggal hari ini (WIB)
//     node versi.mjs --cek    → hanya memeriksa, tidak mengubah apa pun
//
// Semua rujukan ke file lokal (.css/.js) di seluruh .html dan .js diberi
// tanda versi yang SAMA, misalnya game-ui.css?v=2026-11-03:
//   <link href="game-ui.css?v=...">, <script src="notifications.js?v=...">,
//   import ... from "./ec-common.js?v=...".
// Dengan begitu browser siswa selalu memuat satu set file yang cocok
// (tidak bercampur file lama & baru). Tanda harus sama di semua tempat:
// satu file dengan dua tanda berbeda dimuat dua kali oleh browser.
// Jika di hari yang sama dijalankan lagi, versi menjadi 2026-11-03-2, -3, dst.

import { readdirSync, readFileSync, writeFileSync } from "node:fs";

const ONLY_CHECK = process.argv.includes("--cek");
const SELF = "versi.mjs";

// File lokal: tanpa "http:", "https:", atau "//" di depan.
const ATTR = /((?:href|src)\s*=\s*["'])(?![a-z]+:|\/\/)([\w./-]+\.(?:css|js))(\?v=[\w.-]*)?(["'])/g;
const IMPORT = /(\bfrom\s*["']|\bimport\s*\(?\s*["'])(\.{1,2}\/[\w./-]+\.js)(\?v=[\w.-]*)?(["'])/g;

const files = readdirSync(".").filter((f) => /\.(html|js)$/.test(f) && f !== SELF).sort();

function todayWib() {
    return new Date(Date.now() + 7 * 3600 * 1000).toISOString().slice(0, 10);
}

// Versi yang sedang dipakai (semua tanda ?v= yang ditemukan)
const found = new Set();
const missing = [];
for (const f of files) {
    const text = readFileSync(f, "utf8");
    for (const re of [ATTR, IMPORT]) {
        for (const m of text.matchAll(re)) {
            if (m[3]) found.add(m[3].slice(3));
            else missing.push(`${f}: ${m[2]}`);
        }
    }
}

if (ONLY_CHECK) {
    console.log(found.size ? `Versi dipakai: ${[...found].join(", ")}` : "Belum ada tanda versi.");
    if (found.size > 1) console.log("PERINGATAN: ada lebih dari satu versi. Jalankan: node versi.mjs");
    if (missing.length) console.log(`PERINGATAN: ${missing.length} rujukan tanpa versi:\n  ` + missing.join("\n  "));
    if (found.size <= 1 && !missing.length) console.log("Semua rujukan memakai versi yang sama.");
    process.exit(found.size > 1 || missing.length ? 1 : 0);
}

// Versi baru: tanggal hari ini; jika sudah dipakai hari ini, tambah -2, -3, ...
const today = todayWib();
let next = today;
const sameDay = [...found].filter((v) => v === today || v.startsWith(today + "-"));
if (sameDay.length) {
    const n = Math.max(...sameDay.map((v) => (v === today ? 1 : Number(v.slice(today.length + 1)) || 1)));
    next = `${today}-${n + 1}`;
}

let changedFiles = 0;
let refs = 0;
for (const f of files) {
    const text = readFileSync(f, "utf8");
    const out = text
        .replace(ATTR, (_, a, p, _v, z) => { refs++; return `${a}${p}?v=${next}${z}`; })
        .replace(IMPORT, (_, a, p, _v, z) => { refs++; return `${a}${p}?v=${next}${z}`; });
    if (out !== text) { writeFileSync(f, out); changedFiles++; }
}

console.log(`Versi baru: ${next} (${refs} rujukan, ${changedFiles} file diubah).`);
