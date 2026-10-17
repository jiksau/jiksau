// =====================================================================
//  weekly-results.js - Hasil akhir tiap minggu (rekap & riwayat juara)
// ---------------------------------------------------------------------
//  Website tidak punya server, jadi hasil minggu yang sudah selesai
//  "dibekukan" ke koleksi weeklyResults/{Senin} oleh admin: otomatis
//  setiap kali admin membuka admin.html atau papan peringkat.
//  Selama belum dibekukan, hasil dihitung langsung dari gameScores.
//
//  weeklyResults/{week}: week, ranking [{uid, name, level, points, packs, rank}],
//  players, savedAt. ranking = papan Semua Jenjang; papan per jenjang
//  diturunkan dengan levelRanking().
// =====================================================================

import { getApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import {
    getFirestore, collection, doc, getDoc, getDocs, setDoc, query, where, serverTimestamp
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";
import { weeklyPoints, rankPlayers, finishedWeeks } from "./ec-common.js";

const db = () => getFirestore(getApp());
const slim = (r) => ({ uid: r.uid, name: r.name || "Siswa", level: r.level || null, points: r.points, packs: r.packs, rank: r.rank });

// Hitung langsung dari skor (dipakai sebelum minggu dibekukan)
export async function computeWeek(key) {
    const snap = await getDocs(query(collection(db(), "gameScores"), where("week", "==", key)));
    return rankPlayers(weeklyPoints(snap.docs.map((d) => d.data()))).map(slim);
}

// Peringkat akhir Semua Jenjang untuk satu minggu yang sudah selesai
export async function getWeekResult(key) {
    try {
        const snap = await getDoc(doc(db(), "weeklyResults", key));
        if (snap.exists()) return snap.data().ranking || [];
    } catch (e) {
        console.warn("Gagal membaca hasil minggu:", e);
    }
    return computeWeek(key);
}

// Semua minggu yang sudah selesai, terbaru dulu: [{week, ranking}].
// Minggu yang belum dibekukan dihitung langsung (maks. 4 terbaru).
export async function loadHistory() {
    const saved = {};
    try {
        const snap = await getDocs(collection(db(), "weeklyResults"));
        snap.docs.forEach((d) => { saved[d.id] = d.data().ranking || []; });
    } catch (e) {
        console.warn("Gagal membaca riwayat juara:", e);
    }
    const weeks = finishedWeeks();
    const missing = weeks.filter((k) => !saved[k]).slice(0, 4);
    const live = await Promise.all(missing.map((k) => computeWeek(k).catch(() => null)));
    missing.forEach((k, i) => { if (live[i]) saved[k] = live[i]; });
    return weeks.filter((k) => saved[k]).map((k) => ({ week: k, ranking: saved[k] }));
}

// Khusus admin: bekukan minggu selesai yang belum tersimpan
export async function archiveFinishedWeeks() {
    const have = new Set((await getDocs(collection(db(), "weeklyResults"))).docs.map((d) => d.id));
    let saved = 0;
    for (const key of finishedWeeks()) {
        if (have.has(key)) continue;
        const ranking = await computeWeek(key);
        await setDoc(doc(db(), "weeklyResults", key), { week: key, ranking, players: ranking.length, savedAt: serverTimestamp() });
        saved++;
    }
    return saved;
}
