// =====================================================================
//  game-scores.js - Menyimpan skor game ke akun siswa (Firestore)
// ---------------------------------------------------------------------
//  Cara pakai di halaman game:
//    1. Tambahkan sebelum </body>:
//         <script type="module" src="game-scores.js"></script>
//    2. Saat permainan selesai, panggil:
//         window.saveGameScore?.({
//           gameId: "kosakata-2", gameName: "Vocabulary Memorize",
//           correct: 8, total: 10,          // wajib
//           points: 950, mode: "timed",     // opsional
//         });
//
//       Untuk permainan dengan paket soal guru, tambahkan juga
//         packId: paket.id, packName: paket.title
//       Hanya skor dengan packId yang dihitung di papan peringkat.
//    3. Daftar paket soal untuk siswa yang sedang login:
//         const hasil = await window.loadQuestionPacks("kosakata");
//         // hasil.status: "ok" | "login" | "inactive" | "error"
//         // hasil.packs: [{ id, title, type, level, items, itemCount }]
//
//  Skor disimpan ke koleksi "gameScores" jika siswa sedang login.
//  Jika belum login, muncul pemberitahuan kecil dan skor tidak disimpan.
// =====================================================================

import { initializeApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";
import { getFirestore, collection, addDoc, doc, getDoc, getDocs, query, where, serverTimestamp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";
import { firebaseConfig, weekKeyFor, PACK_ALL_LEVELS } from "./ec-common.js";

// Pakai app bawaan (default) agar status login dari halaman utama ikut terbaca.
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

let currentUser = null;
let currentName = null;
let currentLevel = null;
let hasProfile = false;

// Menunggu Firebase selesai memeriksa status login (sekali di awal).
const authReady = new Promise((resolve) => {
    onAuthStateChanged(auth, async (user) => {
        currentUser = user;
        currentName = null;
        currentLevel = null;
        hasProfile = false;
        if (user) {
            try {
                const snap = await getDoc(doc(db, "users", user.uid));
                if (snap.exists()) {
                    hasProfile = true;
                    currentName = snap.data().name || null;
                    currentLevel = snap.data().level || null;
                }
            } catch (e) {
                console.warn("Gagal memuat nama siswa:", e);
            }
        }
        resolve();
    });
});

// ---------- Notifikasi kecil di pojok layar ----------
function showToast(html, isError = false) {
    let box = document.getElementById("gameScoreToast");
    if (!box) {
        box = document.createElement("div");
        box.id = "gameScoreToast";
        box.style.cssText = [
            "position:fixed", "left:50%", "bottom:20px", "transform:translateX(-50%)",
            "max-width:calc(100% - 32px)", "padding:12px 18px", "border-radius:10px",
            "font:600 14px/1.4 system-ui,sans-serif", "color:#fff", "z-index:99999",
            "box-shadow:0 6px 20px rgba(0,0,0,.25)", "transition:opacity .3s", "text-align:center",
        ].join(";");
        document.body.appendChild(box);
    }
    box.style.background = isError ? "#b45309" : "#15803d";
    box.innerHTML = html;
    box.style.opacity = "1";
    box.style.pointerEvents = "auto";
    clearTimeout(box._hideTimer);
    // Setelah memudar, pesan tidak boleh menghalangi tombol di bawahnya (penting di HP).
    box._hideTimer = setTimeout(() => { box.style.opacity = "0"; box.style.pointerEvents = "none"; }, 4500);
}

// ---------- Fungsi utama ----------
let lastSaveKey = null;

window.saveGameScore = async function ({ gameId, gameName, correct, total, points = null, mode = null, packId = null, packName = null }) {
    correct = Math.round(Number(correct));
    total = Math.round(Number(total));
    if (!gameId || !Number.isFinite(total) || total <= 0 || !Number.isFinite(correct)) return;
    correct = Math.max(0, Math.min(correct, total));

    // Cegah simpan ganda jika fungsi "selesai" terpanggil dua kali beruntun.
    const key = `${gameId}|${correct}|${total}|${points}|${packId}`;
    if (key === lastSaveKey) return;
    lastSaveKey = key;
    setTimeout(() => { if (lastSaveKey === key) lastSaveKey = null; }, 3000);

    await authReady;
    if (!currentUser) {
        showToast('Skor tidak disimpan karena kamu belum login. <a href="index.html" style="color:#fff;text-decoration:underline">Login di sini</a>', true);
        return;
    }

    if (!hasProfile) {
        showToast('Skor tidak disimpan: akun ini tidak aktif. Hubungi admin.', true);
        return;
    }

    const data = {
        userId: currentUser.uid,
        userName: currentName || currentUser.email || "Siswa",
        gameId: String(gameId),
        gameName: String(gameName || gameId),
        correct,
        total,
        percent: Math.round((correct / total) * 100),
        timestamp: serverTimestamp(),
        week: weekKeyFor(), // untuk papan peringkat mingguan
    };
    if (Number.isFinite(Number(points)) && points !== null) data.points = Math.round(Number(points));
    if (mode) data.mode = String(mode);
    if (currentLevel) data.level = currentLevel;
    // Paket soal dari guru: hanya skor seperti ini yang dihitung di papan peringkat.
    if (packId) {
        data.packId = String(packId);
        data.packName = String(packName || "Paket soal").slice(0, 80);
    }

    try {
        await addDoc(collection(db, "gameScores"), data);
        showToast(packId
            ? `Skor ${correct}/${total} tersimpan.`
            : `Skor ${correct}/${total} tersimpan (latihan, tanpa poin).`);
    } catch (e) {
        console.error("Gagal menyimpan skor:", e);
        showToast(packId && e?.code === "permission-denied"
            ? "Skor gagal disimpan: paket ini sudah tidak aktif."
            : "Skor gagal disimpan. Coba lagi nanti.", true);
    }
};

// Paket soal aktif untuk jenjang siswa + paket "Semua jenjang".
// Dua query terpisah agar sesuai aturan keamanan Firestore.
window.loadQuestionPacks = async function (type) {
    await authReady;
    if (!currentUser) return { status: "login", packs: [] };
    if (!hasProfile) return { status: "inactive", packs: [] };
    try {
        const levels = currentLevel ? [currentLevel, PACK_ALL_LEVELS] : [PACK_ALL_LEVELS];
        const snaps = await Promise.all(levels.map((lvl) => getDocs(query(
            collection(db, "questionPacks"),
            where("active", "==", true),
            where("level", "==", lvl),
        ))));
        const packs = snaps.flatMap((snap) => snap.docs.map((d) => ({ id: d.id, ...d.data() })))
            .filter((p) => !type || p.type === type)
            .sort((a, b) => String(a.title).localeCompare(String(b.title), "id", { numeric: true }));
        return { status: "ok", packs, level: currentLevel };
    } catch (e) {
        console.error("Gagal memuat paket soal:", e);
        return { status: "error", packs: [], message: e?.message || String(e) };
    }
};
