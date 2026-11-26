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

import { holidayPhase } from "./ec-common.js?v=2026-11-26-9";

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

// Kembang api: satu letupan kecil tiap 4-7 detik, berhenti saat tab tidak terlihat
function fireworks(scene) {
    const COLORS = ["fw-red", "fw-gold", "fw-green"];
    let timer = null;
    const burst = () => {
        const b = document.createElement("span");
        b.className = `burst ${COLORS[Math.floor(Math.random() * COLORS.length)]}`;
        // Di HP hanya di sisi kanan (judul di kiri); di layar lebar juga di luar kolom isi
        const narrow = window.innerWidth < 700;
        b.style.left = `${(narrow ? 66 + Math.random() * 20 : (Math.random() < .5 ? 3 + Math.random() * 17 : 72 + Math.random() * 24)).toFixed(1)}%`;
        b.style.top = `${(16 + Math.random() * 30).toFixed(0)}px`;
        b.innerHTML = Array.from({ length: 10 }, (_, i) => `<i style="--a:${i * 36}deg"></i>`).join("");
        scene.appendChild(b);
        setTimeout(() => b.remove(), 1600);
    };
    const next = () => {
        timer = setTimeout(() => { if (!document.hidden) burst(); next(); }, 4000 + Math.random() * 3000);
    };
    setTimeout(burst, 800);
    next();
    document.addEventListener("visibilitychange", () => {
        clearTimeout(timer);
        if (!document.hidden) next();
    });
}
