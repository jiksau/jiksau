// =====================================================================
//  word-source.js - Bagian "pilih soal" untuk game kosakata
// ---------------------------------------------------------------------
//  Menampilkan dua pilihan:
//    - Paket Guru  : paket soal dari admin (questionPacks). Berpoin.
//    - Kata Sendiri: siswa mengetik kata sendiri. Latihan, tanpa poin.
//
//  Cara pakai (di <script type="module"> halaman game):
//    import { mountWordSource, isAnswerCorrect, shuffled } from "./word-source.js";
//    const source = mountWordSource(document.getElementById("source"), {
//        gameKey: "k2",          // untuk mengingat pilihan & kata sendiri
//        maxOwn: 100,            // batas jumlah kata sendiri
//        onChange: () => {},     // dipanggil saat soal berubah
//    });
//    source.words()      -> [{ q, a }]  (kata, arti)
//    source.scoreInfo()  -> { packId, packName } atau {} untuk latihan
//    source.title()      -> judul paket atau "Kata sendiri"
// =====================================================================

import "./game-scores.js"; // window.loadQuestionPacks & window.saveGameScore
import { escapeHtml } from "./ec-common.js";

const store = {
    get(key) { try { return JSON.parse(localStorage.getItem(key)); } catch { return null; } },
    set(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* abaikan */ } },
};

// Cocokkan jawaban: abaikan huruf besar/kecil & spasi berlebih.
// Jika kunci berisi beberapa jawaban dipisah "/", salah satunya cukup.
export function normalizeAnswer(text) {
    return String(text || "").trim().toLowerCase().replace(/\s+/g, " ");
}
export function isAnswerCorrect(userAnswer, key) {
    const answer = normalizeAnswer(userAnswer);
    if (!answer) return false;
    return answer === normalizeAnswer(key)
        || String(key).split("/").map(normalizeAnswer).filter(Boolean).includes(answer);
}

export function shuffled(list) {
    const a = [...list];
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

export function mountWordSource(root, { gameKey, maxOwn = 100, onChange = () => {} }) {
    const KEY = `ec-${gameKey}`;
    const saved = store.get(KEY) || {};
    const state = {
        mode: saved.mode === "own" ? "own" : "pack",
        packStatus: "loading",
        packs: [],
        pack: null,
        savedPackId: saved.packId || null,
        own: Array.isArray(saved.own) ? saved.own.filter((w) => w && typeof w.q === "string").slice(0, maxOwn) : [],
    };

    root.innerHTML = `
        <div class="segmented" role="tablist">
            <button type="button" data-src="pack">Paket Guru</button>
            <button type="button" data-src="own">Kata Sendiri</button>
        </div>
        <p class="source-note" data-note></p>
        <div data-pack-area><div class="pack-list" data-pack-list></div></div>
        <div data-own-area>
            <div class="word-head"><span>Kata</span><span>Arti</span><span></span></div>
            <div class="word-rows" data-rows style="margin-top:6px"></div>
            <div class="word-tools">
                <button type="button" class="btn ghost" data-add-row>+ Tambah baris</button>
                <span class="count" data-count></span>
            </div>
        </div>
        <div class="word-scroll" data-preview hidden><table class="word-table"><tbody data-preview-body></tbody></table></div>`;
    const $ = (sel) => root.querySelector(sel);

    function persist() {
        store.set(KEY, { mode: state.mode, packId: state.pack?.id || state.savedPackId, own: state.own });
    }

    function render() {
        root.querySelectorAll("[data-src]").forEach((b) => b.classList.toggle("active", b.dataset.src === state.mode));
        $("[data-note]").textContent = state.mode === "pack"
            ? "Poin dihitung dari hasil terbaik per paket setiap minggu."
            : "Latihan bebas, tidak menambah poin.";
        $("[data-pack-area]").hidden = state.mode !== "pack";
        $("[data-own-area]").hidden = state.mode !== "own";
        if (state.mode === "pack") renderPacks();
        renderPreview();
    }

    function renderPacks() {
        const box = $("[data-pack-list]");
        const messages = {
            loading: "Memuat paket soal...",
            login: 'Masuk dulu untuk memakai paket guru. <a href="index.html">Masuk</a>',
            inactive: "Akun ini tidak aktif. Hubungi guru.",
            error: "Paket gagal dimuat. Periksa internet, lalu muat ulang halaman.",
            empty: "Belum ada paket untuk jenjangmu. Coba tab Kata Sendiri.",
        };
        const status = state.packStatus === "ok" && !state.packs.length ? "empty" : state.packStatus;
        if (status !== "ok") {
            box.innerHTML = `<div class="pack-msg">${messages[status] || messages.error}</div>`;
            return;
        }
        box.innerHTML = state.packs.map((p) => `
            <button type="button" class="pack-item${state.pack?.id === p.id ? " selected" : ""}" data-pack="${escapeHtml(p.id)}">
                <span class="t">${escapeHtml(p.title)}</span><span class="n">${p.itemCount} kata</span>
            </button>`).join("");
    }

    // Pratinjau hanya untuk paket (kata sendiri sudah terlihat di isian).
    function renderPreview() {
        const show = state.mode === "pack" && state.pack;
        $("[data-preview]").hidden = !show;
        if (!show) return;
        $("[data-preview-body]").innerHTML = api.words().map((w, i) =>
            `<tr><td>${i + 1}</td><td>${escapeHtml(w.q)}</td><td>${escapeHtml(w.a)}</td></tr>`).join("");
    }

    // ---------- Kata sendiri ----------
    // Contoh isian hanya di baris pertama
    function rowHtml(w = { q: "", a: "" }, first = false) {
        return `<div class="word-row">
            <input class="input" data-q placeholder="${first ? "contoh: apple" : ""}" value="${escapeHtml(w.q)}" autocomplete="off" aria-label="Kata">
            <input class="input" data-a placeholder="${first ? "contoh: apel" : ""}" value="${escapeHtml(w.a)}" autocomplete="off" aria-label="Arti">
            <button type="button" class="icon-btn" data-remove aria-label="Hapus baris">&times;</button>
        </div>`;
    }
    function renderRows() {
        const rows = state.own.length ? state.own : [{ q: "", a: "" }];
        $("[data-rows]").innerHTML = rows.map((w, i) => rowHtml(w, i === 0)).join("");
        updateCount();
    }
    function readRows() {
        state.own = [...root.querySelectorAll(".word-row")]
            .map((r) => ({ q: r.querySelector("[data-q]").value.trim(), a: r.querySelector("[data-a]").value.trim() }))
            .filter((w) => w.q && w.a)
            .slice(0, maxOwn);
    }
    function updateCount() {
        const rows = root.querySelectorAll(".word-row").length;
        $("[data-count]").textContent = `${state.own.length} kata` + (maxOwn < 100 ? ` (maks. ${maxOwn})` : "");
        $("[data-add-row]").disabled = rows >= maxOwn;
    }

    $("[data-rows]").addEventListener("input", () => { readRows(); updateCount(); persist(); onChange(); });
    $("[data-rows]").addEventListener("click", (e) => {
        if (!e.target.closest("[data-remove]")) return;
        const row = e.target.closest(".word-row");
        if (root.querySelectorAll(".word-row").length > 1) row.remove();
        else row.querySelectorAll("input").forEach((i) => { i.value = ""; });
        readRows(); updateCount(); persist(); onChange();
    });
    $("[data-add-row]").addEventListener("click", () => {
        if (root.querySelectorAll(".word-row").length >= maxOwn) return;
        $("[data-rows]").insertAdjacentHTML("beforeend", rowHtml());
        updateCount();
        root.querySelector(".word-row:last-child [data-q]").focus();
    });
    // Enter di kolom Arti baris terakhir = tambah baris baru
    $("[data-rows]").addEventListener("keydown", (e) => {
        if (e.key !== "Enter") return;
        e.preventDefault();
        const row = e.target.closest(".word-row");
        if (e.target.matches("[data-q]")) { row.querySelector("[data-a]").focus(); return; }
        const next = row.nextElementSibling;
        if (next) next.querySelector("[data-q]").focus();
        else $("[data-add-row]").click();
    });

    // ---------- Pilihan ----------
    root.addEventListener("click", (e) => {
        const src = e.target.closest("[data-src]");
        if (src && src.dataset.src !== state.mode) {
            state.mode = src.dataset.src;
            persist(); render(); onChange();
            return;
        }
        const item = e.target.closest("[data-pack]");
        if (item) {
            state.pack = state.packs.find((p) => p.id === item.dataset.pack) || null;
            state.savedPackId = state.pack?.id || null;
            persist(); render(); onChange();
        }
    });

    const api = {
        get mode() { return state.mode; },
        get pack() { return state.mode === "pack" ? state.pack : null; },
        words() {
            if (state.mode === "own") return state.own.map((w) => ({ ...w }));
            return (state.pack?.items || []).map((it) => ({ q: it.q, a: it.a }));
        },
        title() { return api.pack ? api.pack.title : "Kata sendiri"; },
        scoreInfo() { return api.pack ? { packId: api.pack.id, packName: api.pack.title } : {}; },
        // Pesan jika belum bisa mulai (null = siap)
        problem() {
            if (state.mode === "pack" && !state.pack) return "Pilih paket soal dulu.";
            if (!api.words().length) return "Isi minimal satu pasang kata dan arti.";
            return null;
        },
    };

    renderRows();
    render();

    window.loadQuestionPacks("kosakata").then((res) => {
        state.packStatus = res.status;
        state.packs = res.packs || [];
        state.pack = state.packs.find((p) => p.id === state.savedPackId) || null;
        render();
        onChange();
    });

    return api;
}
