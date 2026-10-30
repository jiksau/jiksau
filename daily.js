// =====================================================================
//  daily.js - Pilih kata Tantangan Harian
// ---------------------------------------------------------------------
//  10 kata per hari dari paket kosakata aktif (jenjang siswa + Semua
//  jenjang) yang sudah terbit sebelum hari itu dimulai (00.00 WIB), jadi
//  paket yang terbit siang hari tidak mengubah soal hari itu.
//  Urutan acak memakai "benih" tanggal + jenjang: semua siswa di jenjang
//  yang sama mendapat kata yang sama, dan berganti setiap hari.
// =====================================================================

import { dayStartMs } from "./ec-common.js";
import { normalizeAnswer } from "./word-source.js";

export const DAILY_SIZE = 10;
export const DAILY_MIN_POOL = 4; // minimal kata agar pilihan ganda masuk akal

// Angka acak yang selalu sama untuk benih yang sama (mulberry32)
function seededRandom(seedText) {
    let h = 1779033703 ^ seedText.length;
    for (let i = 0; i < seedText.length; i++) {
        h = Math.imul(h ^ seedText.charCodeAt(i), 3432918353);
        h = (h << 13) | (h >>> 19);
    }
    let a = h >>> 0;
    return () => {
        a = (a + 0x6D2B79F5) | 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

function shuffleWith(list, rand) {
    const a = [...list];
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(rand() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

// Hasil: { words: [{q, a}] (maks. 10), pool: semua kata (untuk pengecoh) }
export function dailyWords(packs, dayKey, level) {
    const start = dayStartMs(dayKey);
    const released = (p) => (p.publishedAt?.toMillis?.() ?? p.createdAt?.toMillis?.() ?? 0) < start;
    const seen = new Set();
    const pool = [];
    packs.filter((p) => p.type === "kosakata" && released(p))
        .sort((a, b) => (a.id < b.id ? -1 : 1))
        .forEach((p) => (p.items || []).forEach((it) => {
            const key = normalizeAnswer(it.q);
            if (!key || !it.a || seen.has(key)) return;
            seen.add(key);
            pool.push({ q: it.q, a: it.a });
        }));
    const words = shuffleWith(pool, seededRandom(`${dayKey}|${level || "-"}`)).slice(0, DAILY_SIZE);
    return { words, pool };
}

// Pilihan ganda: jawaban benar + 3 pengecoh yang artinya berbeda
// (big = besar tidak dijadikan pengecoh untuk large = besar).
const alts = (text) => String(text).split("/").map(normalizeAnswer).filter(Boolean);
const overlaps = (x, y) => { const ay = alts(y); return alts(x).some((t) => ay.includes(t)); };

export function choicesFor(word, pool, count = 4) {
    const picked = [];
    for (const other of shuffleWith(pool, Math.random)) {
        if (picked.length >= count - 1) break;
        if (overlaps(other.a, word.a) || picked.some((p) => overlaps(p, other.a))) continue;
        picked.push(other.a);
    }
    return shuffleWith([word.a, ...picked], Math.random);
}
