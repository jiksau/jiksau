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
//         packId: paket.id, packName: paket.title, packTier: paket.tier
//       Hanya skor dengan packId (atau daily: Tantangan Harian) yang dihitung di papan peringkat.
//    3. Daftar paket soal untuk siswa yang sedang login:
//         const hasil = await window.loadQuestionPacks("kosakata");
//         // hasil.status: "ok" | "login" | "inactive" | "error"
//         // hasil.packs: [{ id, title, type, level, items, itemCount }]
//
//    4. Paket yang pernah dimainkan siswa (game apa pun):
//         const played = await window.loadPlayedPackIds(); // Set berisi packId
//       Setelah skor berpaket tersimpan, halaman menerima event
//       "ec-pack-played" (event.detail.packId).
//
//  Skor disimpan ke koleksi "gameScores" jika siswa sedang login.
//  Jika belum login, muncul pemberitahuan kecil dan skor tidak disimpan.
// =====================================================================

import { initializeApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";
import { getFirestore, collection, addDoc, setDoc, doc, getDoc, getDocs, query, where, serverTimestamp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";
import { firebaseConfig, weekKeyFor, dayKeyFor, previousDayKey, PACK_ALL_LEVELS, scorePoints } from "./ec-common.js";

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

// daily: tanggal Tantangan Harian ("YYYY-MM-DD"); disimpan dengan ID
// harian-<tanggal>-<uid> sehingga hanya bisa sekali per hari.
// Hasil: "ok", "denied", "error", atau undefined (tidak disimpan).
window.saveGameScore = async function ({ gameId, gameName, correct, total, points = null, mode = null, packId = null, packName = null, packTier = null, daily = null }) {
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
        // Level paket (1-5) saat dimainkan, dasar bobot poin (scorePoints)
        if (Number.isInteger(packTier)) data.packTier = packTier;
    } else if (daily) {
        data.daily = String(daily);
    }

    try {
        if (data.daily) await setDoc(doc(db, "gameScores", `harian-${data.daily}-${currentUser.uid}`), data);
        else await addDoc(collection(db, "gameScores"), data);
        if (packId || data.daily) myScoresCache?.then((list) => list.push(data));
        if (packId) {
            window.dispatchEvent(new CustomEvent("ec-pack-played", { detail: { packId: data.packId, points: scorePoints(data) } }));
        }
        showToast(packId || data.daily
            ? `Skor ${correct}/${total} tersimpan (${scorePoints(data)} poin).`
            : `Skor ${correct}/${total} tersimpan (latihan, tanpa poin).`);
        return "ok";
    } catch (e) {
        console.error("Gagal menyimpan skor:", e);
        const denied = e?.code === "permission-denied";
        showToast(data.daily && denied ? "Tantangan hari ini sudah pernah disimpan."
            : packId && denied ? "Skor gagal disimpan: paket ini sudah tidak aktif."
            : "Skor gagal disimpan. Coba lagi nanti.", true);
        return denied ? "denied" : "error";
    }
};

// Skor berpaket & Tantangan Harian milik siswa ini (game apa pun). Dimuat
// sekali per halaman; skor yang baru disimpan ikut ditambahkan. Jika gagal: daftar kosong.
let myScoresCache = null;
function loadMyPackScores() {
    if (!myScoresCache) {
        myScoresCache = (async () => {
            await authReady;
            if (!currentUser || !hasProfile) return [];
            try {
                const snap = await getDocs(query(collection(db, "gameScores"), where("userId", "==", currentUser.uid)));
                return snap.docs.map((d) => d.data()).filter((s) => s.packId || s.daily);
            } catch (e) {
                console.warn("Gagal memuat riwayat main:", e);
                return [];
            }
        })();
    }
    return myScoresCache;
}

// Paket yang pernah dimainkan siswa ini (Set packId).
window.loadPlayedPackIds = async function () {
    return new Set((await loadMyPackScores()).map((s) => s.packId).filter(Boolean));
};

// Poin terbaik siswa ini per paket minggu ini (Map packId -> poin, setelah bobot).
window.loadWeekPackPoints = async function () {
    const week = weekKeyFor();
    const best = new Map();
    (await loadMyPackScores()).filter((s) => s.packId && s.week === week).forEach((s) => {
        best.set(s.packId, Math.max(best.get(s.packId) || 0, scorePoints(s)));
    });
    return best;
};

// Tantangan Harian siswa ini: { today: skor hari ini | null, streak: hari berturut-turut }.
// Rangkaian dihitung mundur dari hari ini (jika sudah main) atau kemarin.
window.loadDailyStatus = async function () {
    const byDay = new Map();
    (await loadMyPackScores()).filter((s) => s.daily && s.gameId === "harian").forEach((s) => byDay.set(s.daily, s));
    const today = dayKeyFor();
    let day = byDay.has(today) ? today : previousDayKey(today);
    let streak = 0;
    while (byDay.has(day)) { streak++; day = previousDayKey(day); }
    return { today: byDay.get(today) || null, streak };
};

// Paket soal aktif untuk jenjang siswa + paket "Semua jenjang".
// Dua query terpisah agar sesuai aturan keamanan Firestore.
// Dimuat sekali per halaman (lonceng & Beranda memakai hasil yang sama).
let packsCache = null;
window.loadQuestionPacks = async function (type) {
    await authReady;
    if (!currentUser) return { status: "login", packs: [] };
    if (!hasProfile) return { status: "inactive", packs: [] };
    packsCache ||= (async () => {
        const levels = currentLevel ? [currentLevel, PACK_ALL_LEVELS] : [PACK_ALL_LEVELS];
        const snaps = await Promise.all(levels.map((lvl) => getDocs(query(
            collection(db, "questionPacks"),
            where("active", "==", true),
            where("level", "==", lvl),
        ))));
        return snaps.flatMap((snap) => snap.docs.map((d) => ({ id: d.id, ...d.data() })))
            .sort((a, b) => String(a.title).localeCompare(String(b.title), "id", { numeric: true }));
    })();
    try {
        // Paket terjadwal (publishedAt di masa depan) belum terlihat siswa
        const now = Date.now();
        const packs = (await packsCache).filter((p) => (!type || p.type === type)
            && !((p.publishedAt?.toMillis?.() ?? 0) > now));
        return { status: "ok", packs, level: currentLevel };
    } catch (e) {
        packsCache = null; // coba lagi di panggilan berikutnya
        console.error("Gagal memuat paket soal:", e);
        return { status: "error", packs: [], message: e?.message || String(e) };
    }
};
