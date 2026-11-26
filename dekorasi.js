// =====================================================================
//  dekorasi.js - Dekorasi musiman Musim Liburan (tanpa Firebase)
// ---------------------------------------------------------------------
//  Dimuat HANYA oleh halaman siswa: user-dashboard.html (Beranda),
//  gamelist.html, leaderboard.html, toko.html. Halaman permainan tidak
//  memuat file ini, jadi tetap polos (anak fokus mengerjakan soal).
//
//  Nuansa mengikuti tanggal (holidayPhase di ec-common.js):
//    "liburan"   1-30 Des   : lampu header + salju di atas Beranda
//    "tahunbaru" 31 Des-3 Jan: lampu header + kembang api kecil di Beranda
//    di luar itu            : tidak ada apa-apa
//  Gaya ada di game-ui.css (body.deco-liburan / body.deco-tahunbaru).
//  Salju/kembang api hanya di halaman yang punya <div id="decoScene">
//  (Beranda, di dalam header): di belakang logo/judul/lonceng, tidak bisa diketuk.
//
//  Pratinjau (hanya untuk dicek): ?pratinjau=liburan / ?pratinjau=tahunbaru,
//  diingat selama tab terbuka (sessionStorage); ?pratinjau=mati = normal.
//  Pratinjau hanya mengubah dekorasi, bukan Toko atau tanda event.
//  "Kurangi animasi" di perangkat: salju & kembang api tidak dibuat, lampu diam.
// =====================================================================

import { holidayPhase } from "./ec-common.js?v=2026-11-26-10";

const PREVIEW_KEY = "ec-pratinjau-dekorasi";
const PHASES = ["liburan", "tahunbaru"];

function currentPhase() {
    const q = new URLSearchParams(location.search).get("pratinjau");
    try {
        if (q === "mati") sessionStorage.removeItem(PREVIEW_KEY);
        else if (PHASES.includes(q)) sessionStorage.setItem(PREVIEW_KEY, q);
        const saved = sessionStorage.getItem(PREVIEW_KEY);
        if (PHASES.includes(saved)) return saved;
    } catch { /* sessionStorage tidak tersedia: pakai tanggal */ }
    return holidayPhase();
}

const phase = currentPhase();
const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

if (phase) {
    document.body.classList.add(`deco-${phase}`);
    const scene = document.getElementById("decoScene");
    if (scene && !reduceMotion) {
        document.body.classList.add("deco-scene-on");
        if (phase === "liburan") snow(scene);
        else fireworks(scene);
    }
}

// Salju: titik kecil turun pelan (CSS animation, hanya transform/opacity)
function snow(scene) {
    const n = window.innerWidth < 600 ? 14 : 26;
    let html = "";
    for (let i = 0; i < n; i++) {
        const size = 3 + Math.random() * 3;
        const dur = 6 + Math.random() * 5;
        html += `<i class="flake" style="left:${(Math.random() * 100).toFixed(1)}%;width:${size.toFixed(1)}px;height:${size.toFixed(1)}px;`
            + `--drift:${(Math.random() * 16 - 8).toFixed(0)}px;animation-duration:${dur.toFixed(1)}s;animation-delay:-${(Math.random() * dur).toFixed(1)}s"></i>`;
    }
    scene.innerHTML = html;
}

// Kembang api: letupan kecil tiap 2-4 detik (maks. 2 sekaligus), di dalam
// kotak selebar kolom isi header (bukan selebar jendela). Berhenti saat tab
// tidak terlihat.
function fireworks(scene) {
    const COLORS = ["fw-red", "fw-gold", "fw-green"];
    const box = document.createElement("span");
    box.className = "fw-box";
    scene.appendChild(box);
    let timer = null;
    const burst = () => {
        if (box.childElementCount >= 2) return;
        const b = document.createElement("span");
        b.className = `burst ${COLORS[Math.floor(Math.random() * COLORS.length)]}`;
        // Sisi kanan kolom isi (judul di kiri, lonceng paling kanan)
        const narrow = box.clientWidth < 500;
        b.style.left = `${(narrow ? 62 + Math.random() * 20 : 46 + Math.random() * 40).toFixed(1)}%`;
        b.style.top = `${(28 + Math.random() * 8).toFixed(0)}px`;
        b.innerHTML = Array.from({ length: 12 }, (_, i) => `<i style="--a:${i * 30}deg"></i>`).join("")
            + Array.from({ length: 6 }, (_, i) => `<i class="in" style="--a:${i * 60 + 15}deg"></i>`).join("");
        box.appendChild(b);
        setTimeout(() => b.remove(), 1700);
    };
    const next = () => {
        timer = setTimeout(() => { if (!document.hidden) burst(); next(); }, 2000 + Math.random() * 2000);
    };
    setTimeout(burst, 600);
    next();
    document.addEventListener("visibilitychange", () => {
        clearTimeout(timer);
        if (!document.hidden) next();
    });
}
