// =====================================================================
//  recap.js - Rekap minggu lalu di Beranda (sekali tiap minggu)
// ---------------------------------------------------------------------
//  Cara pakai (user-dashboard.html, setelah announcements.js):
//      <script type="module" src="recap.js"></script>
//
//  Saat siswa pertama kali membuka Beranda di minggu baru, muncul jendela:
//  juara minggu lalu (Semua Jenjang + juara jenjang siswa), peringkat &
//  poin siswa, dan naik/turun dibanding minggu sebelumnya.
//  Muncul setelah jendela pengumuman ditutup (window.ecNewsDone).
//  "Sudah dilihat" disimpan di browser (ec-recap-<uid> = kunci minggu ini).
// =====================================================================

import { initializeApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";
import { getFirestore, doc, getDoc } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";
import {
    firebaseConfig, ADMIN_EMAIL, escapeHtml, levelLabel, shortName, levelRanking,
    weekKeyFor, previousWeekKey, weekEndMs, weekRangeLabel, FIRST_WEEK
} from "./ec-common.js";
import { getWeekResult } from "./weekly-results.js";

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const MEDAL = { 1: "🥇", 2: "🥈", 3: "🥉" };
const NAME = (r) => shortName(r.name).toUpperCase();

const CSS = `
.ec-recap-overlay {
    position: fixed; inset: 0; z-index: 2000; display: flex; align-items: center; justify-content: center;
    padding: 20px; background: rgba(10,16,13,.5);
}
.ec-recap {
    display: flex; flex-direction: column; width: 100%; max-width: 420px; max-height: calc(100vh - 40px);
    background: var(--surface, #fff); color: var(--text, #17201c); border-radius: 20px;
    box-shadow: 0 20px 50px rgba(0,0,0,.25); overflow: hidden; text-align: left;
    font: 15px/1.5 "Plus Jakarta Sans", system-ui, sans-serif; animation: ecRecapPop .2s ease-out;
}
@keyframes ecRecapPop { from { opacity: 0; transform: scale(.96); } to { opacity: 1; transform: none; } }
.ec-recap-body { padding: 20px 20px 4px; overflow-y: auto; }
.ec-recap-tag { display: inline-block; padding: 2px 9px; border-radius: 99px; font-size: 11.5px; font-weight: 700; background: var(--accent-soft, #e1f0e8); color: var(--accent, #1f6f4a); }
.ec-recap h3 { margin: 8px 0 2px; font-size: 21px; line-height: 1.25; font-weight: 700; }
.ec-recap .wk { color: var(--muted, #66706b); font-size: 13px; }
.ec-recap .strip { display: grid; grid-template-columns: repeat(var(--n, 3), 1fr); margin-top: 14px; border: 1px solid var(--line, #e2e7e4); border-radius: 14px; overflow: hidden; }
.ec-recap .strip > div { padding: 12px 4px 10px; text-align: center; border-left: 1px solid var(--line, #e2e7e4); min-width: 0; }
.ec-recap .strip > div:first-child { border-left: 0; background: var(--accent-soft, #e1f0e8); }
.ec-recap .strip b { display: block; font-size: 24px; line-height: 1.1; font-weight: 700; font-variant-numeric: tabular-nums; }
.ec-recap .strip > div:first-child b { color: var(--accent, #1f6f4a); }
.ec-recap .strip span { font-size: 11.5px; color: var(--muted, #66706b); font-weight: 600; }
.ec-recap .move { margin-top: 10px; font-size: 13.5px; color: var(--muted, #66706b); }
.ec-recap .move b.up { color: var(--ok, #1f8a55); }
.ec-recap .move b.down { color: var(--bad, #c0392b); }
.ec-recap .note { margin-top: 14px; padding: 12px 14px; border-radius: 12px; background: var(--soft, #eef2f0); font-size: 14px; }
.ec-recap .sec { margin: 18px 0 6px; font-size: 11px; font-weight: 700; letter-spacing: .06em; text-transform: uppercase; color: var(--muted, #66706b); }
.ec-recap .row { display: grid; grid-template-columns: 26px 1fr auto; gap: 6px; align-items: center; padding: 8px 0; border-top: 1px solid var(--line, #e2e7e4); }
.ec-recap .row:first-of-type { border-top: 0; }
.ec-recap .row .m { font-size: 18px; line-height: 1; }
.ec-recap .row .n { font-weight: 700; letter-spacing: .02em; overflow-wrap: anywhere; min-width: 0; }
.ec-recap .row .n small { font-weight: 600; font-size: 11.5px; color: var(--muted, #66706b); letter-spacing: 0; margin-left: 6px; }
.ec-recap .row .p { font-size: 13px; color: var(--muted, #66706b); white-space: nowrap; font-variant-numeric: tabular-nums; }
.ec-recap .row.me .n { color: var(--accent, #1f6f4a); }
.ec-recap-foot { padding: 12px 20px 18px; }
.ec-recap-foot button {
    width: 100%; height: 48px; border: 0; border-radius: 12px; cursor: pointer;
    background: var(--accent, #1f6f4a); color: var(--accent-ink, #fff);
    font: 600 15px "Plus Jakarta Sans", system-ui, sans-serif;
}
.ec-recap-foot button:active { transform: scale(.98); }
@media (max-width: 520px) { .ec-recap-body, .ec-recap-foot { padding-left: 18px; padding-right: 18px; } }`;

function rowsHtml(list, uid, showLevel) {
    return list.filter((r) => r.rank <= 3).map((r) => `
        <div class="row${r.uid === uid ? " me" : ""}"><span class="m">${MEDAL[r.rank]}</span>
        <span class="n">${escapeHtml(NAME(r))}${showLevel && r.level ? `<small>${escapeHtml(levelLabel(r.level))}</small>` : ""}</span>
        <span class="p">${r.points} poin</span></div>`).join("");
}

function show(html, onClose) {
    const style = document.createElement("style");
    style.textContent = CSS;
    document.head.appendChild(style);
    const overlay = document.createElement("div");
    overlay.className = "ec-recap-overlay";
    overlay.innerHTML = `<div class="ec-recap" role="dialog" aria-modal="true" aria-labelledby="ecRecapTitle">
        <div class="ec-recap-body">${html}</div>
        <div class="ec-recap-foot"><button type="button">Mulai minggu baru</button></div></div>`;
    document.body.appendChild(overlay);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const btn = overlay.querySelector("button");
    btn.focus();
    btn.addEventListener("click", () => {
        overlay.remove();
        document.body.style.overflow = prevOverflow;
        onClose();
    });
}

async function start(user) {
    const thisWeek = weekKeyFor();
    const lastWeek = previousWeekKey(thisWeek);
    if (lastWeek < FIRST_WEEK) return;
    const LOCAL = `ec-recap-${user.uid}`;
    const seen = () => { try { return localStorage.getItem(LOCAL) === thisWeek; } catch { return false; } };
    const markSeen = () => { try { localStorage.setItem(LOCAL, thisWeek); } catch { /* abaikan */ } };
    if (seen()) return;

    let profile;
    try {
        const snap = await getDoc(doc(db, "users", user.uid));
        if (!snap.exists()) return;
        profile = snap.data();
    } catch { return; }

    const ranking = await getWeekResult(lastWeek);
    if (!ranking.length) { markSeen(); return; } // tidak ada yang bermain: tanpa rekap

    const uid = user.uid;
    const level = profile.level || null;
    const me = ranking.find((r) => r.uid === uid);
    const lvList = level ? levelRanking(ranking, level) : [];
    const meLv = lvList.find((r) => r.uid === uid);
    // Akun yang dibuat setelah minggu lalu berakhir: cukup tampilkan juara
    const isNew = (profile.createdAt?.toMillis?.() ?? 0) >= weekEndMs(lastWeek);

    let title = "Minggu baru dimulai!";
    let mine = "";
    if (me) {
        const champ = me.rank <= 3 ? `Juara ${me.rank} Semua Jenjang`
            : meLv && meLv.rank <= 3 ? `Juara ${meLv.rank} Jenjang ${levelLabel(level)}` : "";
        title = champ ? `Selamat, kamu ${champ}!` : "Ini hasilmu minggu lalu";
        const cells = [`<div><b>#${me.rank}</b><span>Semua jenjang</span></div>`];
        if (meLv) cells.push(`<div><b>#${meLv.rank}</b><span>Jenjang ${escapeHtml(levelLabel(level))}</span></div>`);
        cells.push(`<div><b>${me.points}</b><span>Poin</span></div>`);
        mine = `<div class="strip" style="--n:${cells.length}">${cells.join("")}</div>`;

        // Naik / turun dibanding minggu sebelumnya (papan Semua Jenjang)
        const before = previousWeekKey(lastWeek);
        if (before >= FIRST_WEEK) {
            const prev = (await getWeekResult(before).catch(() => [])).find((r) => r.uid === uid);
            if (prev) {
                const d = prev.rank - me.rank;
                mine += `<div class="move">${d > 0 ? `<b class="up">Naik ${d} peringkat</b> dari minggu sebelumnya.`
                    : d < 0 ? `<b class="down">Turun ${-d} peringkat</b> dari minggu sebelumnya.`
                    : "Peringkatmu sama dengan minggu sebelumnya."}</div>`;
            }
        }
    } else if (!isNew) {
        mine = `<div class="note">Kamu tidak bermain minggu lalu. Poin sudah kembali nol untuk semua, jadi ini kesempatanmu!</div>`;
    }

    const lvTop = level && lvList.length ? `<div class="sec">Juara Jenjang ${escapeHtml(levelLabel(level))}</div>${rowsHtml(lvList, uid, false)}` : "";
    const html = `
        <span class="ec-recap-tag">Rekap minggu lalu</span>
        <h3 id="ecRecapTitle">${escapeHtml(title)}</h3>
        <div class="wk">${weekRangeLabel(lastWeek)} · ${ranking.length} pemain</div>
        ${mine}
        <div class="sec">Juara Semua Jenjang</div>${rowsHtml(ranking, uid, true)}
        ${lvTop}`;

    // Tunggu jendela pengumuman ditutup lebih dulu
    await (window.ecNewsDone || Promise.resolve());
    if (seen()) return;
    show(html, markSeen);
}

let started = false;
onAuthStateChanged(auth, (user) => {
    if (!user || started || user.email === ADMIN_EMAIL) return;
    started = true;
    start(user).catch((e) => console.warn("Gagal memuat rekap mingguan:", e));
});
