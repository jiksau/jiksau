// =====================================================================
//  word-source.js - Bagian "pilih soal" & pengaturan untuk game kosakata
// ---------------------------------------------------------------------
//  1) mountWordSource: tab Paket Guru (berpoin) / Kata Sendiri (latihan),
//     cari & filter paket (jenjang, level), tag, dan pratinjau isi paket.
//  2) mountPlaySettings: arah soal, acak urutan, batas waktu (+ saran).
//
//  type: "kosakata" (default), "verb", atau "kalimat" (Susun Kalimat).
//
//  Contoh (lihat kosakata 5.html):
//    const source = mountWordSource($("source"), {
//        gameKey: "k5", maxOwn: 10, previewEl: $("preview"), onChange });
//    const settings = mountPlaySettings($("settings"), {
//        gameKey: "k5", secondsPerWord: 15, timerDefault: false,
//        count: () => source.words().length });
//    source.words() -> [{ q, a }]     settings.get() -> { reverse, shuffle, seconds|null }
//    source.scoreInfo() -> { packId, packName, packTier } (kosong untuk latihan)
// =====================================================================

import "./game-scores.js"; // window.loadQuestionPacks & window.saveGameScore
import { escapeHtml, packTags, packMaxPoints, PACK_ALL_LEVELS } from "./ec-common.js";

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

export function formatClock(seconds) {
    const s = Math.max(0, seconds);
    return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}

function tagsHtml(pack) {
    return packTags(pack).map((t, i) => {
        const cls = i === 0 ? (pack.level === PACK_ALL_LEVELS ? " all" : "") : " lvl";
        return `<span class="tag${cls}">${escapeHtml(t)}</span>`;
    }).join("");
}

// Tabel daftar kata (pratinjau & hasil). fields = PACK_FIELDS[...]
export function wordTableHtml(words, fields) {
    const head = fields.length > 2
        ? `<thead><tr><th></th>${fields.map((f) => `<th>${f.label}</th>`).join("")}</tr></thead>` : "";
    const cls = fields.length > 2 ? " cols" : fields.length === 1 ? " one" : "";
    return `<table class="word-table${cls}">${head}<tbody>${words.map((w, i) =>
        `<tr><td>${i + 1}</td>${fields.map((f) => `<td>${escapeHtml(w[f.key])}</td>`).join("")}</tr>`).join("")}</tbody></table>`;
}

// Kolom tiap jenis paket (urutan = urutan isian & pratinjau)
export const PACK_FIELDS = {
    kosakata: [
        { key: "q", label: "Kata", example: "apple" },
        { key: "a", label: "Arti", example: "apel" },
    ],
    verb: [
        { key: "arti", label: "Arti", example: "makan" },
        { key: "v1", label: "V1", example: "eat" },
        { key: "v2", label: "V2", example: "ate" },
        { key: "v3", label: "V3", example: "eaten" },
    ],
    kalimat: [
        { key: "text", label: "Kalimat", example: "I go to school every day." },
    ],
};

const UNITS = { kosakata: "kata", verb: "kata kerja", kalimat: "kalimat" };

// Kalimat: 2-20 kata, maks. 200 huruf (sama dengan aturan paket di admin)
function isValidSentence(text) {
    const t = String(text || "").trim().replace(/\s+/g, " ");
    const n = t ? t.split(" ").length : 0;
    return n >= 2 && n <= 20 && t.length <= 200;
}

// =====================================================================
//  Pilih soal
// =====================================================================
export function mountWordSource(root, { gameKey, type = "kosakata", maxOwn = 100, previewEl = null, onChange = () => {} }) {
    const FIELDS = PACK_FIELDS[type];
    const unit = UNITS[type] || "kata";
    const isComplete = (w) => FIELDS.every((f) => typeof w?.[f.key] === "string" && w[f.key].trim())
        && (type !== "kalimat" || isValidSentence(w.text));
    const KEY = `ec-${gameKey}`;
    const saved = store.get(KEY) || {};
    // Dari notifikasi: game.html?paket=<id> langsung memilih paket itu
    const linkedPack = new URLSearchParams(location.search).get("paket");
    if (linkedPack) { saved.mode = "pack"; saved.packId = linkedPack; }
    const state = {
        mode: saved.mode === "own" ? "own" : "pack",
        packStatus: "loading",
        packs: [],
        pack: null,
        savedPackId: saved.packId || null,
        search: "",
        scope: "all",   // "all" | "mine" (jenjangku) | "SEMUA"
        tier: "all",
        played: null,   // Set packId yang pernah dimainkan (game apa pun)
        weekPoints: null, // Map packId -> poin terbaik minggu ini
        own: Array.isArray(saved.own) ? saved.own.filter(isComplete).slice(0, maxOwn) : [],
    };

    root.innerHTML = `
        <div class="segmented" role="tablist">
            <button type="button" data-src="pack">Paket Guru</button>
            <button type="button" data-src="own">${type === "kalimat" ? "Kalimat Sendiri" : "Kata Sendiri"}</button>
        </div>
        <p class="source-note" data-note></p>
        <div data-pack-area>
            <div class="pack-tools" data-tools hidden>
                <input type="search" class="input" data-search placeholder="Cari paket" autocomplete="off">
                <select class="input" data-scope aria-label="Jenjang"></select>
                <select class="input" data-tier aria-label="Level"></select>
            </div>
            <div class="pack-list scroll" data-pack-list></div>
            <div class="pack-count" data-pack-count></div>
        </div>
        <div data-own-area>
            <div class="word-head f${FIELDS.length}">${FIELDS.map((f) => `<span>${f.label}</span>`).join("")}<span></span></div>
            <div class="word-rows" data-rows style="margin-top:6px"></div>
            <div class="word-tools">
                <button type="button" class="btn ghost" data-add-row>+ Tambah baris</button>
                <span class="count" data-count></span>
            </div>
        </div>`;
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

    // ---------- Filter ----------
    function setupFilters() {
        const packs = state.packs;
        const myLevels = [...new Set(packs.filter((p) => p.level !== PACK_ALL_LEVELS).map((p) => p.level))];
        const hasAll = packs.some((p) => p.level === PACK_ALL_LEVELS);
        const tiers = [...new Set(packs.map((p) => p.tier).filter(Boolean))].sort((a, b) => a - b);

        const scopeOpts = [`<option value="all">Semua paket</option>`];
        if (myLevels.length) scopeOpts.push(`<option value="mine">${escapeHtml(packTags({ level: myLevels[0] })[0])}</option>`);
        if (hasAll) scopeOpts.push(`<option value="${PACK_ALL_LEVELS}">Semua jenjang</option>`);
        $("[data-scope]").innerHTML = scopeOpts.join("");
        $("[data-scope]").hidden = scopeOpts.length <= 2;

        $("[data-tier]").innerHTML = `<option value="all">Semua level</option>`
            + tiers.map((t) => `<option value="${t}">Level ${t}</option>`).join("");
        $("[data-tier]").hidden = tiers.length <= 1;

        // Jika hanya satu filter yang tampil, lebarkan ke satu baris penuh
        $("[data-scope]").style.gridColumn = $("[data-tier]").hidden ? "1 / -1" : "";
        $("[data-tier]").style.gridColumn = $("[data-scope]").hidden ? "1 / -1" : "";
        // Kotak cari & filter hanya muncul jika paketnya cukup banyak
        $("[data-tools]").hidden = packs.length < 6 && $("[data-scope]").hidden && $("[data-tier]").hidden;
    }

    function filteredPacks() {
        const term = state.search.trim().toLowerCase();
        return state.packs.filter((p) =>
            (state.scope === "all" || (state.scope === "mine" ? p.level !== PACK_ALL_LEVELS : p.level === state.scope))
            && (state.tier === "all" || String(p.tier) === state.tier)
            && (!term || String(p.title).toLowerCase().includes(term)));
    }

    // Poin paket minggu ini: label di daftar & pratinjau
    function packPoints(p) {
        if (!state.weekPoints) return null;
        const max = packMaxPoints(p);
        const got = state.weekPoints.get(p.id) || 0;
        return { got, max, full: max > 0 && got >= max };
    }
    function pointsTag(p) {
        const r = packPoints(p);
        if (!r || !r.got) return "";
        return r.full ? '<span class="tag full">Poin penuh</span>' : `<span class="tag part">${r.got}/${r.max} poin</span>`;
    }
    function pointsNote(p) {
        const r = packPoints(p);
        if (!r) return "";
        const text = r.full ? `Poin penuh minggu ini (${r.max}). Main lagi untuk berlatih; poin bisa didapat lagi Senin.`
            : r.got ? `Poin minggu ini: ${r.got} dari ${r.max}. Hasil terbaikmu yang dihitung.`
            : `Paket ini bernilai maks. ${r.max} poin minggu ini.`;
        return `<p class="pack-points${r.full ? " full" : ""}">${text}</p>`;
    }

    function renderPacks() {
        const box = $("[data-pack-list]");
        const messages = {
            loading: "Memuat paket soal...",
            login: 'Masuk dulu untuk memakai paket guru. <a href="index.html">Masuk</a>',
            inactive: "Akun ini tidak aktif. Hubungi guru.",
            error: "Paket gagal dimuat. Periksa internet, lalu muat ulang halaman.",
            empty: `Belum ada paket untuk jenjangmu. Coba tab ${type === "kalimat" ? "Kalimat" : "Kata"} Sendiri.`,
        };
        const status = state.packStatus === "ok" && !state.packs.length ? "empty" : state.packStatus;
        $("[data-pack-count]").textContent = "";
        if (status !== "ok") {
            box.innerHTML = `<div class="pack-msg">${messages[status] || messages.error}</div>`;
            return;
        }
        const list = filteredPacks();
        if (!list.length) {
            box.innerHTML = '<div class="pack-msg">Tidak ada paket yang cocok.</div>';
        } else {
            box.innerHTML = list.map((p) => `
                <button type="button" class="pack-item${state.pack?.id === p.id ? " selected" : ""}" data-pack="${escapeHtml(p.id)}">
                    <span class="info"><span class="t">${state.played && !state.played.has(p.id) ? '<span class="new-dot" title="Belum pernah dimainkan"></span>' : ""}${escapeHtml(p.title)}</span><span class="tags">${tagsHtml(p)}${pointsTag(p)}</span></span>
                    <span class="n">${p.itemCount} ${unit}</span>
                </button>`).join("");
        }
        if (list.length !== state.packs.length) $("[data-pack-count]").textContent = `${list.length} dari ${state.packs.length} paket`;
    }

    // ---------- Pratinjau ----------
    function renderPreview() {
        if (!previewEl) return;
        if (state.mode !== "pack") { previewEl.hidden = true; return; }
        previewEl.hidden = false;
        const p = state.pack;
        if (!p) {
            // Di HP kartu kosong disembunyikan agar tidak memakan tempat
            previewEl.classList.add("only-wide");
            previewEl.innerHTML = '<p class="preview-empty">Pilih paket untuk melihat isinya.</p>';
            return;
        }
        previewEl.classList.remove("only-wide");
        previewEl.innerHTML = `
            <div class="preview-head">
                <div><h2>${escapeHtml(p.title)}</h2><div class="tags">${tagsHtml(p)}${pointsTag(p)}</div></div>
                <span class="n">${p.itemCount} ${unit}</span>
            </div>
            ${pointsNote(p)}
            <div class="word-scroll">${wordTableHtml(api.words(), FIELDS)}</div>`;
    }

    // ---------- Kata sendiri ----------
    // Contoh isian hanya di baris pertama
    function rowHtml(w = {}, first = false) {
        return `<div class="word-row f${FIELDS.length}">
            ${FIELDS.map((f) => `<input class="input" data-f="${f.key}" placeholder="${FIELDS.length > 2 ? f.label + (first ? ": " + f.example : "") : first ? "contoh: " + f.example : ""}" value="${escapeHtml(w[f.key] || "")}" autocomplete="off" autocapitalize="none" aria-label="${f.label}">`).join("")}
            <button type="button" class="icon-btn" data-remove aria-label="Hapus baris">&times;</button>
        </div>`;
    }
    function renderRows() {
        const rows = state.own.length ? state.own : [{}];
        $("[data-rows]").innerHTML = rows.map((w, i) => rowHtml(w, i === 0)).join("");
        updateCount();
    }
    function readRows() {
        state.own = [...root.querySelectorAll(".word-row")]
            .map((r) => Object.fromEntries(FIELDS.map((f) => [f.key, r.querySelector(`[data-f="${f.key}"]`).value.trim()])))
            .filter(isComplete)
            .slice(0, maxOwn);
    }
    function updateCount() {
        const rows = root.querySelectorAll(".word-row").length;
        $("[data-count]").textContent = `${state.own.length} ${unit}` + (maxOwn < 100 ? ` (maks. ${maxOwn})` : "");
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
        root.querySelector(".word-row:last-child input").focus();
    });
    // Enter: pindah ke kolom berikutnya, lalu baris berikutnya (baris baru jika di akhir)
    $("[data-rows]").addEventListener("keydown", (e) => {
        if (e.key !== "Enter" || !e.target.matches("input")) return;
        e.preventDefault();
        const row = e.target.closest(".word-row");
        const inputs = [...row.querySelectorAll("input")];
        const i = inputs.indexOf(e.target);
        if (i < inputs.length - 1) { inputs[i + 1].focus(); return; }
        const next = row.nextElementSibling;
        if (next) next.querySelector("input").focus();
        else $("[data-add-row]").click();
    });

    // ---------- Pilihan ----------
    $("[data-search]").addEventListener("input", (e) => { state.search = e.target.value; renderPacks(); });
    $("[data-scope]").addEventListener("change", (e) => { state.scope = e.target.value; renderPacks(); });
    $("[data-tier]").addEventListener("change", (e) => { state.tier = e.target.value; renderPacks(); });

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
            const list = state.mode === "own" ? state.own : (state.pack?.items || []);
            return list.map((it) => Object.fromEntries(FIELDS.map((f) => [f.key, it[f.key] || ""])));
        },
        title() { return api.pack ? api.pack.title : "Kata sendiri"; },
        scoreInfo() { return api.pack ? { packId: api.pack.id, packName: api.pack.title, packTier: api.pack.tier || 1 } : {}; },
        // Pesan jika belum bisa mulai (null = siap)
        problem() {
            if (state.mode === "pack" && !state.pack) return "Pilih paket soal dulu.";
            if (!api.words().length) {
                if (type === "kalimat") return "Isi minimal satu kalimat (2–20 kata).";
                return FIELDS.length > 2 ? "Isi minimal satu baris lengkap." : "Isi minimal satu pasang kata dan arti.";
            }
            return null;
        },
    };

    renderRows();
    render();

    // Titik merah: paket yang belum pernah dimainkan di game mana pun
    window.loadPlayedPackIds().then((set) => { state.played = set; if (state.mode === "pack") renderPacks(); });
    window.loadWeekPackPoints().then((map) => { state.weekPoints = map; if (state.mode === "pack") { renderPacks(); renderPreview(); } });
    window.addEventListener("ec-pack-played", (e) => {
        const { packId, points } = e.detail;
        state.played?.add(packId);
        state.weekPoints?.set(packId, Math.max(state.weekPoints.get(packId) || 0, points));
        if (state.mode === "pack") { renderPacks(); renderPreview(); }
    });

    window.loadQuestionPacks(type).then((res) => {
        state.packStatus = res.status;
        // Urutan: level paling mudah dulu, lalu judul
        state.packs = (res.packs || []).sort((a, b) => (a.tier || 0) - (b.tier || 0)
            || String(a.title).localeCompare(String(b.title), "id", { numeric: true }));
        state.pack = state.packs.find((p) => p.id === state.savedPackId) || null;
        setupFilters();
        render();
        onChange();
    });

    return api;
}

// =====================================================================
//  Pengaturan permainan: arah, acak, batas waktu
// =====================================================================
//  secondsPerWord: dasar waktu saran. Saran = jumlah kata x detik,
//  dibulatkan ke atas ke menit (1-30 menit).
const DEFAULT_DIRECTIONS = ["Kata → Arti", "Arti → Kata"];

//  timer: false = tanpa pilihan batas waktu total (mis. Pilihan Ganda Cepat
//  memakai hitung mundur per soal); seconds selalu null.
export function mountPlaySettings(root, { gameKey, secondsPerWord = 10, timerDefault = true, count = () => 0, directions = DEFAULT_DIRECTIONS, timer = true }) {
    const KEY = `ec-${gameKey}-settings`;
    const saved = store.get(KEY) || {};
    const state = {
        reverse: !!saved.reverse,
        shuffle: !!saved.shuffle,
        timer: timer && (typeof saved.timer === "boolean" ? saved.timer : timerDefault),
        // null = ikuti saran otomatis; angka = menit pilihan siswa
        minutes: Number.isInteger(saved.minutes) ? saved.minutes : null,
    };

    root.innerHTML = `
        <div class="opts">
            <label class="field" data-dir-field>Arah soal
                <select class="input" data-dir>
                    <option value="qa">${directions?.[0] || ""}</option>
                    <option value="aq">${directions?.[1] || ""}</option>
                </select>
            </label>
            <div class="opt-row">
                <label class="check"><input type="checkbox" data-shuffle> Acak urutan</label>
                <label class="check" data-timer-field><input type="checkbox" data-timer> Batas waktu</label>
            </div>
            <div class="timer-row" data-timer-row>
                <input type="number" class="input" data-min min="1" max="30" inputmode="numeric" aria-label="Menit">
                <span class="unit">menit</span>
                <span class="unit" data-auto>· sesuai saran</span>
                <button type="button" class="btn ghost" data-suggest></button>
            </div>
        </div>`;
    const $ = (sel) => root.querySelector(sel);

    // directions: null = game tanpa pilihan arah (mis. Susun Kalimat)
    $("[data-dir-field]").hidden = !directions;
    if (!directions) state.reverse = false;
    $("[data-timer-field]").hidden = !timer;

    const suggested = () => Math.min(30, Math.max(1, Math.ceil((count() * secondsPerWord) / 60)));
    const persist = () => store.set(KEY, state);

    function render() {
        $("[data-dir]").value = state.reverse ? "aq" : "qa";
        $("[data-shuffle]").checked = state.shuffle;
        $("[data-timer]").checked = state.timer;
        $("[data-timer-row]").hidden = !state.timer;
        const s = suggested();
        if (document.activeElement !== $("[data-min]")) $("[data-min]").value = state.minutes ?? s;
        const custom = state.minutes !== null && state.minutes !== s;
        $("[data-suggest]").textContent = `Pakai saran (${s} menit)`;
        $("[data-suggest]").hidden = !custom;
        $("[data-auto]").hidden = custom;
    }

    $("[data-dir]").addEventListener("change", (e) => { state.reverse = e.target.value === "aq"; persist(); });
    $("[data-shuffle]").addEventListener("change", (e) => { state.shuffle = e.target.checked; persist(); });
    $("[data-timer]").addEventListener("change", (e) => { state.timer = e.target.checked; persist(); render(); });
    $("[data-min]").addEventListener("input", (e) => {
        const v = parseInt(e.target.value, 10);
        if (v >= 1 && v <= 30) { state.minutes = v; persist(); render(); }
    });
    $("[data-min]").addEventListener("blur", () => render());
    $("[data-suggest]").addEventListener("click", () => { state.minutes = null; persist(); render(); });

    render();

    return {
        refresh: render, // panggil saat jumlah kata berubah (ganti paket)
        get() {
            const minutes = state.minutes ?? suggested();
            return { reverse: state.reverse, shuffle: state.shuffle, seconds: state.timer ? minutes * 60 : null };
        },
    };
}
