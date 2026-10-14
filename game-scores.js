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
//  Skor disimpan ke koleksi "gameScores" jika siswa sedang login.
//  Jika belum login, muncul pemberitahuan kecil dan skor tidak disimpan.
// =====================================================================

import { initializeApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";
import { getFirestore, collection, addDoc, doc, getDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";
import { firebaseConfig } from "./ec-common.js";

// Pakai app bawaan (default) agar status login dari halaman utama ikut terbaca.
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

let currentUser = null;
let currentName = null;
let currentLevel = null;

// Menunggu Firebase selesai memeriksa status login (sekali di awal).
const authReady = new Promise((resolve) => {
    onAuthStateChanged(auth, async (user) => {
        currentUser = user;
        currentName = null;
        currentLevel = null;
        if (user) {
            try {
                const snap = await getDoc(doc(db, "users", user.uid));
                if (snap.exists()) {
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
    clearTimeout(box._hideTimer);
    box._hideTimer = setTimeout(() => { box.style.opacity = "0"; }, 4500);
}

// ---------- Fungsi utama ----------
let lastSaveKey = null;

window.saveGameScore = async function ({ gameId, gameName, correct, total, points = null, mode = null }) {
    correct = Math.round(Number(correct));
    total = Math.round(Number(total));
    if (!gameId || !Number.isFinite(total) || total <= 0 || !Number.isFinite(correct)) return;
    correct = Math.max(0, Math.min(correct, total));

    // Cegah simpan ganda jika fungsi "selesai" terpanggil dua kali beruntun.
    const key = `${gameId}|${correct}|${total}|${points}`;
    if (key === lastSaveKey) return;
    lastSaveKey = key;
    setTimeout(() => { if (lastSaveKey === key) lastSaveKey = null; }, 3000);

    await authReady;
    if (!currentUser) {
        showToast('Skor tidak disimpan karena kamu belum login. <a href="index.html" style="color:#fff;text-decoration:underline">Login di sini</a>', true);
        return;
    }

    const data = {
        userId: currentUser.uid,
        userName: currentName || currentUser.email || "Siswa",
        userEmail: currentUser.email || null,
        gameId: String(gameId),
        gameName: String(gameName || gameId),
        correct,
        total,
        percent: Math.round((correct / total) * 100),
        timestamp: serverTimestamp(),
    };
    if (Number.isFinite(Number(points)) && points !== null) data.points = Math.round(Number(points));
    if (mode) data.mode = String(mode);
    if (currentLevel) data.level = currentLevel;

    try {
        await addDoc(collection(db, "gameScores"), data);
        showToast(`✅ Skor ${correct}/${total} tersimpan ke akunmu`);
    } catch (e) {
        console.error("Gagal menyimpan skor:", e);
        showToast("Skor gagal disimpan. Coba lagi nanti.", true);
    }
};
