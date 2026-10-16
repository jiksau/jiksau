// =====================================================================
//  notifications.js - Lonceng notifikasi paket soal baru untuk siswa
// ---------------------------------------------------------------------
//  Cara pakai: taruh wadah kosong di header, lalu
//      <span id="notif"></span>
//      <script type="module" src="notifications.js"></script>
//  (taruh setelah script halaman yang memanggil initializeApp, jika ada)
//
//  "Paket baru" = paket aktif untuk jenjang siswa + "Semua jenjang" yang
//  dirilis (publishedAt, atau createdAt untuk paket lama) dalam 30 hari
//  terakhir. Angka merah = paket baru yang BELUM PERNAH dimainkan siswa
//  (belum ada skor gameScores dengan packId itu, di game mana pun).
//  Membuka lonceng tidak menghapus angka; memainkan paketnya yang menghapus.
// =====================================================================

import "./game-scores.js"; // window.loadQuestionPacks
import { getApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";
import { getFirestore, doc, getDoc, getDocs, collection, query, where } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";
import { escapeHtml, packTags, PACK_GAMES, PACK_ALL_LEVELS } from "./ec-common.js";

const DAYS = 30;
const MAX_ITEMS = 20;
const root = document.getElementById("notif");

const ms = (ts) => ts?.toMillis?.() ?? 0;
const releasedAt = (p) => ms(p.publishedAt) || ms(p.createdAt);
const unit = { kosakata: "kata", verb: "kata kerja", kalimat: "kalimat" };

function whenLabel(t) {
    const day = (d) => new Date(d).setHours(0, 0, 0, 0);
    const diff = Math.round((day(Date.now()) - day(t)) / 86400000);
    if (diff <= 0) return "hari ini";
    if (diff === 1) return "kemarin";
    if (diff < 7) return `${diff} hari lalu`;
    return new Date(t).toLocaleDateString("id-ID", { day: "numeric", month: "short" });
}

const CSS = `
.ec-notif { position: relative; display: inline-flex; }
.ec-bell {
    position: relative; display: inline-flex; align-items: center; justify-content: center;
    width: 40px; height: 40px; padding: 0; border: 0; border-radius: 999px;
    background: rgba(255,255,255,.16); color: #fff; cursor: pointer;
}
.ec-bell:hover { background: rgba(255,255,255,.26); }
.ec-bell.light { background: #eef2ff; color: #4338ca; }
.ec-bell.light:hover { background: #e0e7ff; }
.ec-bell svg { width: 20px; height: 20px; }
.ec-count {
    position: absolute; top: -3px; right: -3px; min-width: 19px; height: 19px; padding: 0 5px;
    border-radius: 999px; background: #dc2626; color: #fff; border: 2px solid #fff;
    font: 700 11px/15px system-ui, sans-serif; text-align: center; box-sizing: border-box;
}
.ec-panel {
    position: absolute; top: calc(100% + 8px); right: 0; z-index: 1000;
    width: 360px; max-width: calc(100vw - 32px); max-height: min(70vh, 520px); overflow-y: auto;
    background: #fff; color: #1f2937; border-radius: 12px; text-align: left;
    box-shadow: 0 12px 32px rgba(17,24,39,.22); font: 15px/1.45 'Inter', system-ui, sans-serif;
}
.ec-panel h3 { margin: 0; padding: 14px 16px 10px; font-size: 1rem; font-weight: 700; border-bottom: 1px solid #e5e7eb; }
.ec-empty { padding: 24px 16px; color: #6b7280; text-align: center; font-size: .9rem; }
.ec-item { padding: 12px 16px; border-bottom: 1px solid #f1f2f4; }
.ec-item:last-child { border-bottom: 0; }
.ec-item.new { background: #f5f7ff; }
.ec-item .t { font-weight: 700; overflow-wrap: anywhere; }
.ec-item .new-dot { display: inline-block; width: 8px; height: 8px; margin-right: 6px; border-radius: 999px; background: #dc2626; vertical-align: 2px; }
.ec-item .meta { margin-top: 2px; color: #6b7280; font-size: .8rem; }
.ec-item .played { color: #15803d; font-weight: 600; }
.ec-tags { display: inline-flex; flex-wrap: wrap; gap: 4px; margin-right: 4px; vertical-align: middle; }
.ec-tag { display: inline-flex; align-items: center; height: 20px; padding: 0 7px; border-radius: 999px; background: #f3f4f6; color: #4b5563; font-size: .72rem; font-weight: 600; }
.ec-tag.all { background: #ecfdf5; color: #047857; }
.ec-tag.lvl { background: #eef2ff; color: #4338ca; }
.ec-games { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 8px; }
.ec-games a {
    display: inline-flex; align-items: center; height: 32px; padding: 0 12px; border-radius: 8px;
    border: 1px solid #c7d2fe; background: #fff; color: #4338ca; font-size: .85rem; font-weight: 600; text-decoration: none;
}
.ec-games a:hover { background: #eef2ff; }
@media (max-width: 520px) {
    .ec-panel { position: fixed; left: 16px; right: 16px; width: auto; max-width: none; }
}`;

const BELL = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>';

function tagsHtml(p) {
    return `<span class="ec-tags">${packTags(p).map((t, i) =>
        `<span class="ec-tag${i === 0 ? (p.level === PACK_ALL_LEVELS ? " all" : "") : " lvl"}">${escapeHtml(t)}</span>`).join("")}</span>`;
}

function itemHtml(p, played) {
    const isNew = !played;
    const games = (PACK_GAMES[p.type] || []).map((g) =>
        `<a href="${g.href}?paket=${encodeURIComponent(p.id)}">${escapeHtml(g.name)}</a>`).join("");
    return `<div class="ec-item${isNew ? " new" : ""}">
        <div class="t">${isNew ? '<span class="new-dot"></span>' : ""}${escapeHtml(p.title)}</div>
        <div class="meta">${tagsHtml(p)}${p.itemCount} ${unit[p.type] || "soal"} · ${whenLabel(releasedAt(p))}${played ? ' · <span class="played">Sudah dimainkan</span>' : ""}</div>
        <div class="ec-games">${games}</div>
    </div>`;
}

// Paket yang pernah dimainkan siswa ini (skor dengan packId, game apa pun)
async function playedPackIds(db, uid) {
    try {
        const snap = await getDocs(query(collection(db, "gameScores"), where("userId", "==", uid)));
        return new Set(snap.docs.map((d) => d.data().packId).filter(Boolean));
    } catch (e) {
        console.warn("Gagal memuat riwayat main:", e);
        return new Set();
    }
}

async function start(user) {
    const db = getFirestore(getApp());
    try {
        const snap = await getDoc(doc(db, "users", user.uid));
        if (!snap.exists()) return; // akun tidak aktif: tanpa lonceng
    } catch { return; }

    const [res, played] = await Promise.all([window.loadQuestionPacks(), playedPackIds(db, user.uid)]);
    if (res.status !== "ok") return;
    const since = Date.now() - DAYS * 86400000;
    // Yang belum dimainkan di atas, lalu yang paling baru
    const list = res.packs
        .filter((p) => PACK_GAMES[p.type] && releasedAt(p) >= since)
        .sort((a, b) => played.has(a.id) - played.has(b.id) || releasedAt(b) - releasedAt(a))
        .slice(0, MAX_ITEMS);

    const style = document.createElement("style");
    style.textContent = CSS;
    document.head.appendChild(style);

    root.className = "ec-notif";
    root.innerHTML = `
        <button type="button" class="ec-bell${root.dataset.light !== undefined ? " light" : ""}" aria-label="Notifikasi" aria-expanded="false">${BELL}<span class="ec-count" hidden></span></button>
        <div class="ec-panel" role="dialog" aria-label="Notifikasi" hidden></div>`;
    const bell = root.querySelector(".ec-bell");
    const count = root.querySelector(".ec-count");
    const panel = root.querySelector(".ec-panel");

    const unread = list.filter((p) => !played.has(p.id)).length;
    count.hidden = unread === 0;
    count.textContent = unread > 9 ? "9+" : String(unread);
    bell.setAttribute("aria-label", unread ? `Notifikasi, ${unread} paket baru belum dimainkan` : "Notifikasi");

    function open() {
        panel.innerHTML = `<h3>Paket soal baru</h3>` + (list.length
            ? list.map((p) => itemHtml(p, played.has(p.id))).join("")
            : '<div class="ec-empty">Belum ada paket baru.</div>');
        panel.hidden = false;
        // Di HP panel selebar layar, tepat di bawah lonceng
        panel.style.top = getComputedStyle(panel).position === "fixed"
            ? `${bell.getBoundingClientRect().bottom + 8}px` : "";
        bell.setAttribute("aria-expanded", "true");
    }
    function close() {
        panel.hidden = true;
        bell.setAttribute("aria-expanded", "false");
    }

    bell.addEventListener("click", (e) => { e.stopPropagation(); if (panel.hidden) open(); else close(); });
    document.addEventListener("click", (e) => { if (!panel.hidden && !root.contains(e.target)) close(); });
    document.addEventListener("keydown", (e) => { if (e.key === "Escape") close(); });

}

if (root) {
    const auth = getAuth(getApp());
    let started = false;
    onAuthStateChanged(auth, (user) => {
        if (user && !started) { started = true; start(user); }
    });
}
