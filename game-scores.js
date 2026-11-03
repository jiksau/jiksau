// =====================================================================
//  game-scores.js - Menyimpan skor game ke akun siswa (Firestore)
// ---------------------------------------------------------------------
//  Cara pakai di halaman game:
//    1. Tambahkan sebelum </body>:
//         <script type="module" src="game-scores.js?v=2026-11-03-7"></script>
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
//       Halaman game (word-source.js) memanggil dengan { forGame: true }:
//       untuk akun guru hasilnya paket miliknya (semua status & jenjang,
//       own: true) + paket terbit semua jenjang (mode coba, hasil.teacher).
//       Lonceng, Beranda, dan Tantangan Harian memanggil tanpa opsi ini.
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
import { firebaseConfig, weekKeyFor, dayKeyFor, previousDayKey, PACK_ALL_LEVELS, PACK_GAMES, scorePoints, packMaxPoints } from "./ec-common.js?v=2026-11-03-7";

// Pakai app bawaan (default) agar status login dari halaman utama ikut terbaca.
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

let currentUser = null;
let currentName = null;
let currentLevel = null;
let hasProfile = false;
let isTeacher = false; // akun guru: skor tidak disimpan (lihat firestore.rules)

// Menunggu Firebase selesai memeriksa status login (sekali di awal).
const authReady = new Promise((resolve) => {
    onAuthStateChanged(auth, async (user) => {
        currentUser = user;
        currentName = null;
        currentLevel = null;
        hasProfile = false;
        isTeacher = false;
        if (user) {
            try {
                const snap = await getDoc(doc(db, "users", user.uid));
                if (snap.exists()) {
                    hasProfile = true;
                    currentName = snap.data().name || null;
                    currentLevel = snap.data().level || null;
                    isTeacher = snap.data().role === "Guru";
                }
            } catch (e) {
                console.warn("Gagal memuat nama siswa:", e);
            }
        }
        resolve();
    });
});

// ---------- Mode coba (akun guru) ----------
// Halaman game: semua game berpaket (PACK_GAMES) + Tantangan Harian.
const GAME_PAGES = new Set([
    ...Object.values(PACK_GAMES).flat().map((g) => decodeURIComponent(g.href)),
    "harian.html",
]);
const pageFile = decodeURIComponent(location.pathname.split("/").pop() || "");
authReady.then(() => {
    if (!isTeacher || !GAME_PAGES.has(pageFile)) return;
    const bar = document.createElement("div");
    bar.className = "trial-bar";
    bar.setAttribute("role", "status");
    bar.textContent = "Mode coba: skor tidak disimpan";
    const header = document.querySelector("header.topbar");
    if (header) header.after(bar); else document.body.prepend(bar);
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

// ---------- Baris poin di kartu hasil ----------
// el: elemen [data-score-line] di kartu hasil game. kind menentukan warna:
// wait, offline, gain, same, full, free, trial, info, err. Semua teks lewat textContent.
function scoreLine(el, kind, main, sub = "") {
    if (!el) return;
    el.hidden = false;
    el.className = `score-line ${kind}`;
    el.textContent = "";
    const b = document.createElement("b");
    b.textContent = main;
    el.appendChild(b);
    if (sub) {
        const small = document.createElement("small");
        small.textContent = sub;
        el.appendChild(small);
    }
}

// Hasil terbaik siswa ini untuk satu paket di minggu tertentu (setelah bobot,
// sama seperti weeklyPoints). null = riwayat belum siap / gagal dimuat,
// jadi kenaikan poin tidak ditebak.
async function bestBefore(packId, week) {
    if (!myScoresCache) return null;
    const list = await Promise.race([myScoresCache, new Promise((r) => setTimeout(() => r(null), 3000))]);
    if (!list || myScoresFailed) return null;
    return list.filter((x) => x.packId === packId && x.week === week)
        .reduce((m, x) => Math.max(m, scorePoints(x)), 0);
}

// Isi baris poin setelah skor berpaket TERSIMPAN.
function packLine(el, data, prev) {
    if (prev === null) return scoreLine(el, "info", "Skor tersimpan. Lihat poinmu di Beranda.");
    const now = scorePoints(data);
    const max = packMaxPoints({ itemCount: data.total, tier: data.packTier }, data.week);
    const after = Math.max(prev, now);
    if (prev >= max && max > 0) return scoreLine(el, "full", "Poin penuh", "Poin bisa didapat lagi Senin.");
    if (now > prev) return scoreLine(el, "gain", `+${now - prev} poin`,
        after >= max && max > 0 ? "Poin penuh" : `Total paket ini minggu ini: ${after} dari ${max}`);
    if (prev === 0) return scoreLine(el, "same", "Belum dapat poin di paket ini");
    return scoreLine(el, "same", `Hasil terbaikmu masih ${prev} poin`);
}

// ---------- Fungsi utama ----------
let lastSaveKey = null;

// daily: tanggal Tantangan Harian ("YYYY-MM-DD"); disimpan dengan ID
// harian-<tanggal>-<uid> sehingga hanya bisa sekali per hari.
// resultEl: elemen baris poin di kartu hasil (opsional). Jika ada, hasil
// simpan & poin tampil di sana (tanpa notifikasi pojok).
// Hasil: "ok", "exists" (harian sudah tersimpan hari ini), "denied", "error",
// atau undefined (tidak disimpan).
window.saveGameScore = async function ({ gameId, gameName, correct, total, points = null, mode = null, packId = null, packName = null, packTier = null, daily = null, resultEl = null }) {
    correct = Math.round(Number(correct));
    total = Math.round(Number(total));
    if (!gameId || !Number.isFinite(total) || total <= 0 || !Number.isFinite(correct)) return;
    correct = Math.max(0, Math.min(correct, total));

    // Cegah simpan ganda jika fungsi "selesai" terpanggil dua kali beruntun.
    const key = `${gameId}|${correct}|${total}|${points}|${packId}`;
    if (key === lastSaveKey) return;
    lastSaveKey = key;
    setTimeout(() => { if (lastSaveKey === key) lastSaveKey = null; }, 3000);

    const toast = (html, isError) => { if (!resultEl) showToast(html, isError); };
    scoreLine(resultEl, "wait", "Menyimpan skor...");

    await authReady;
    if (!currentUser) {
        scoreLine(resultEl, "err", "Skor tidak disimpan: kamu belum masuk.");
        toast('Skor tidak disimpan karena kamu belum login. <a href="index.html" style="color:#fff;text-decoration:underline">Login di sini</a>', true);
        return;
    }

    if (!hasProfile) {
        scoreLine(resultEl, "err", "Skor tidak disimpan: akun tidak aktif.", "Hubungi admin.");
        toast('Skor tidak disimpan: akun ini tidak aktif. Hubungi admin.', true);
        return;
    }

    if (isTeacher) {
        scoreLine(resultEl, "trial", "Mode coba: skor tidak disimpan");
        toast('Mode coba: skor tidak disimpan.', true);
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

    // Hasil terbaik SEBELUM skor ini (dibaca dari riwayat yang sudah dimuat)
    const prev = data.packId ? await bestBefore(data.packId, data.week) : null;
    const dailyId = data.daily ? `harian-${data.daily}-${currentUser.uid}` : null;

    // Satu kali kirim. Saat offline Firebase menunggu (tidak langsung gagal):
    // setelah 8 detik tampil pesan offline, lalu otomatis diganti hasil poin
    // begitu skor benar-benar tersimpan. Skor tidak pernah dikirim ulang.
    const slow = setTimeout(() => scoreLine(resultEl, "offline", "Internet belum tersambung.",
        "Jangan tutup halaman ini, skor akan disimpan saat internet kembali."), 8000);
    try {
        if (dailyId) await setDoc(doc(db, "gameScores", dailyId), data);
        else await addDoc(collection(db, "gameScores"), data);
    } catch (e) {
        clearTimeout(slow);
        console.error("Gagal menyimpan skor:", e);
        const denied = e?.code === "permission-denied";
        if (dailyId && denied) {
            // Ditolak: sudah tersimpan hari ini (dokumen ada) atau memang tidak diizinkan
            let exists = null;
            try { exists = (await getDoc(doc(db, "gameScores", dailyId))).exists(); } catch (_) { /* tidak diketahui */ }
            if (exists) {
                scoreLine(resultEl, "info", "Tantangan hari ini sudah tersimpan sebelumnya.", "Poin tidak bertambah lagi hari ini.");
                toast("Tantangan hari ini sudah pernah disimpan.", true);
                return "exists";
            }
            scoreLine(resultEl, "err", "Skor tidak bisa disimpan: akses ditolak.", "Muat ulang halaman. Jika tetap gagal, hubungi admin.");
            toast("Skor tidak bisa disimpan: akses ditolak.", true);
            return "denied";
        }
        if (packId && denied) {
            scoreLine(resultEl, "err", "Skor gagal disimpan: paket ini baru diubah atau dinonaktifkan.", "Muat ulang halaman lalu main lagi.");
            toast("Skor gagal disimpan: paket ini baru diubah atau dinonaktifkan. Muat ulang halaman lalu main lagi.", true);
            return "denied";
        }
        scoreLine(resultEl, "err", denied ? "Skor tidak bisa disimpan: akses ditolak." : "Skor gagal disimpan karena koneksi.",
            denied ? "Muat ulang halaman. Jika tetap gagal, hubungi admin." : "Periksa internet, lalu main lagi.");
        toast("Skor gagal disimpan. Coba lagi nanti.", true);
        return denied ? "denied" : "error";
    }

    clearTimeout(slow);
    // Tersimpan. Riwayat di halaman ikut diperbarui, jadi "Main lagi" di paket
    // yang sama menghitung kenaikan dari hasil terbaik terbaru.
    if (packId || data.daily) myScoresCache?.then((list) => list && list.push(data));
    if (packId) {
        window.dispatchEvent(new CustomEvent("ec-pack-played", { detail: { packId: data.packId, points: scorePoints(data) } }));
        packLine(resultEl, data, prev);
    } else if (data.daily) {
        const pts = scorePoints(data);
        scoreLine(resultEl, pts > 0 ? "gain" : "same", pts > 0 ? `+${pts} poin` : "Belum dapat poin hari ini", "Tantangan Harian");
    } else {
        scoreLine(resultEl, "free", "Latihan bebas: tanpa poin");
    }
    toast(packId || data.daily
        ? `Skor ${correct}/${total} tersimpan (${scorePoints(data)} poin).`
        : `Skor ${correct}/${total} tersimpan (latihan, tanpa poin).`);
    return "ok";
};

// Skor berpaket & Tantangan Harian milik siswa ini (game apa pun). Dimuat
// sekali per halaman; skor yang baru disimpan ikut ditambahkan. Jika gagal: daftar kosong.
let myScoresCache = null;
let myScoresFailed = false; // true = riwayat gagal dimuat (daftar kosong bukan berarti belum pernah main)
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
                myScoresFailed = true;
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
let teacherPacksCache = null;

// Mode coba (hanya akun guru, hanya halaman game): paket milik guru di
// jenjang & status apa pun (own: true) + paket terbit semua jenjang.
// Hanya membaca; tidak ada yang ditulis, jadi draf tetap tersembunyi dari siswa.
async function loadTeacherGamePacks(type) {
    teacherPacksCache ||= (async () => {
        const [mine, active] = await Promise.all([
            getDocs(query(collection(db, "questionPacks"), where("ownerId", "==", currentUser.uid))),
            getDocs(query(collection(db, "questionPacks"), where("active", "==", true))),
        ]);
        const now = Date.now();
        const byId = new Map();
        active.docs.forEach((d) => {
            const p = { id: d.id, ...d.data() };
            if (!((p.publishedAt?.toMillis?.() ?? 0) > now)) byId.set(p.id, p); // terjadwal orang lain: belum tampil
        });
        mine.docs.forEach((d) => byId.set(d.id, { id: d.id, ...d.data(), own: true }));
        return [...byId.values()].sort((a, b) => String(a.title).localeCompare(String(b.title), "id", { numeric: true }));
    })();
    try {
        const packs = (await teacherPacksCache).filter((p) => !type || p.type === type);
        return { status: "ok", packs, level: null, teacher: true };
    } catch (e) {
        teacherPacksCache = null;
        console.error("Gagal memuat paket soal (mode coba):", e);
        return { status: "error", packs: [], message: e?.message || String(e) };
    }
}

// opts.forGame: dipanggil dari halaman game (word-source.js). Hanya di sana
// akun guru mendapat daftar mode coba; tempat lain memakai daftar biasa.
window.loadQuestionPacks = async function (type, opts = {}) {
    await authReady;
    if (!currentUser) return { status: "login", packs: [] };
    if (!hasProfile) return { status: "inactive", packs: [] };
    if (opts.forGame && isTeacher) return loadTeacherGamePacks(type);
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
