// =====================================================================
//  tiers.js - Tier siswa berdasarkan XP sepanjang masa
// ---------------------------------------------------------------------
//  XP = jumlah poin mingguan dari semua minggu (paket soal guru, hasil
//  terbaik per paket per minggu; sama dengan papan peringkat). Bonus musim
//  tidak dihitung. XP tidak pernah berkurang, jadi tier tidak pernah turun.
//  Ubah batas XP di TIERS bila terlalu cepat/lambat.
// =====================================================================

import { escapeHtml } from "./ec-common.js";

// Kelompok tier: warna lencana tetap sama di mode terang & gelap
export const TIER_GROUPS = [
    { key: "perunggu", name: "Perunggu", color: "#b26b34", light: "#e0a46f" },
    { key: "perak", name: "Perak", color: "#7d8a93", light: "#c3ccd2" },
    { key: "emas", name: "Emas", color: "#c48a0c", light: "#f2cf5b" },
    { key: "platinum", name: "Platinum", color: "#24938c", light: "#7fd6cf" },
    { key: "berlian", name: "Berlian", color: "#4a6fd8", light: "#a9bff5" },
];

// Batas XP tiap tier (urut naik). Berlian tanpa tingkat.
export const TIERS = [
    { group: 0, step: "I", xp: 0 },
    { group: 0, step: "II", xp: 50 },
    { group: 0, step: "III", xp: 100 },
    { group: 1, step: "I", xp: 200 },
    { group: 1, step: "II", xp: 300 },
    { group: 1, step: "III", xp: 450 },
    { group: 2, step: "I", xp: 600 },
    { group: 2, step: "II", xp: 800 },
    { group: 2, step: "III", xp: 1000 },
    { group: 3, step: "I", xp: 1300 },
    { group: 3, step: "II", xp: 1600 },
    { group: 3, step: "III", xp: 2000 },
    { group: 4, step: "", xp: 2500 },
].map((t, i) => ({ ...t, index: i, ...TIER_GROUPS[t.group], label: `${TIER_GROUPS[t.group].name}${t.step ? " " + t.step : ""}` }));

// Tier untuk sejumlah XP, plus kemajuan ke tier berikutnya
export function tierFor(xp = 0) {
    let i = 0;
    while (i + 1 < TIERS.length && xp >= TIERS[i + 1].xp) i++;
    const tier = TIERS[i];
    const next = TIERS[i + 1] || null;
    const progress = next ? (xp - tier.xp) / (next.xp - tier.xp) : 1;
    return { ...tier, xp, next, need: next ? next.xp - xp : 0, progress };
}

// XP semua siswa. weeks: [{week, ranking}] (riwayat minggu selesai),
// current: peringkat minggu ini ([{uid, points}]). Hasil: { uid: xp }
export function xpByUser(weeks, current = []) {
    const xp = {};
    const add = (r) => { xp[r.uid] = (xp[r.uid] || 0) + (r.points || 0); };
    (weeks || []).forEach((w) => (w.ranking || []).forEach(add));
    (current || []).forEach(add);
    return xp;
}

// Lencana tier (perisai SVG). size dalam px.
export function tierBadge(tier, size = 40) {
    const id = `tg${tier.index}x${Math.random().toString(36).slice(2, 7)}`;
    const roman = tier.step;
    const gem = tier.key === "berlian"
        ? `<path d="M20 13l6 6-6 9-6-9z" fill="#fff" opacity=".92"/>`
        : `<text x="20" y="${roman.length > 2 ? 26 : 26.5}" text-anchor="middle" font-family="Plus Jakarta Sans,system-ui,sans-serif" font-weight="800" font-size="${roman.length > 2 ? 10.5 : 12}" fill="#fff">${roman}</text>`;
    return `<svg class="tier-badge" width="${size}" height="${size}" viewBox="0 0 40 40" role="img" aria-label="${escapeHtml(tier.label)}">
        <defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${tier.light}"/><stop offset="1" stop-color="${tier.color}"/></linearGradient></defs>
        <path d="M20 3l14 5v11c0 9-6 15-14 18C12 34 6 28 6 19V8z" fill="url(#${id})" stroke="${tier.color}" stroke-width="1.5"/>
        <path d="M20 7l10 3.6V19c0 6.6-4.3 11.2-10 13.6" fill="none" stroke="#fff" stroke-opacity=".35" stroke-width="1.5"/>
        ${gem}
    </svg>`;
}
