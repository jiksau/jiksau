// =====================================================================
//  announcements.js - Jendela pengumuman dari admin di dashboard siswa
// ---------------------------------------------------------------------
//  Cara pakai (user-dashboard.html, setelah script halaman):
//      <script type="module" src="announcements.js"></script>
//
//  Yang tampil: pengumuman AKTIF untuk jenjang siswa + "Semua siswa"
//  yang terbit (publishedAt) setelah siswa terakhir menekan "Mengerti"
//  (users/{uid}.announceSeenAt; cadangan di localStorage). Siswa yang
//  belum pernah menekan "Mengerti" melihat pengumuman 30 hari terakhir.
// =====================================================================

import { initializeApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";
import { getFirestore, collection, doc, getDoc, getDocs, query, where, updateDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";
import { firebaseConfig, escapeHtml, announcementHtml, PACK_ALL_LEVELS } from "./ec-common.js";

const DAYS = 30;
const MAX_SHOWN = 5;

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const ms = (ts) => ts?.toMillis?.() ?? 0;
const publishedMs = (n) => ms(n.publishedAt) || ms(n.createdAt);

const CSS = `
.ec-news-overlay {
    position: fixed; inset: 0; z-index: 2000; display: flex; align-items: center; justify-content: center;
    padding: 16px; background: rgba(17,24,39,.55);
}
.ec-news {
    display: flex; flex-direction: column; width: 100%; max-width: 520px; max-height: calc(100vh - 32px);
    background: #fff; color: #1f2937; border-radius: 14px; box-shadow: 0 20px 50px rgba(0,0,0,.3);
    font: 15px/1.55 'Inter', system-ui, sans-serif; text-align: left; overflow: hidden;
}
.ec-news-head { padding: 16px 20px 0; font-size: .75rem; font-weight: 700; letter-spacing: .05em; text-transform: uppercase; color: #4338ca; }
.ec-news-list { padding: 4px 20px 8px; overflow-y: auto; }
.ec-news-item { padding: 12px 0; border-bottom: 1px solid #e5e7eb; }
.ec-news-item:last-child { border-bottom: 0; }
.ec-news-item h3 { margin: 0; font-size: 1.12rem; font-weight: 800; line-height: 1.3; overflow-wrap: anywhere; }
.ec-news-item .date { margin: 2px 0 8px; color: #6b7280; font-size: .8rem; }
.ec-news-item p { margin: 0 0 8px; overflow-wrap: anywhere; }
.ec-news-item ul { margin: 0 0 8px; padding-left: 20px; list-style: disc; }
.ec-news-item li { margin: 2px 0; overflow-wrap: anywhere; }
.ec-news-foot { padding: 12px 20px 18px; border-top: 1px solid #f1f2f4; }
.ec-news-foot button {
    width: 100%; height: 46px; border: 0; border-radius: 10px; background: #4338ca; color: #fff;
    font: 600 1rem 'Inter', system-ui, sans-serif; cursor: pointer;
}
.ec-news-foot button:hover { background: #3730a3; }
@media (max-width: 520px) { .ec-news-head, .ec-news-list, .ec-news-foot { padding-left: 16px; padding-right: 16px; } }`;

function dateLabel(t) {
    return new Date(t).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
}

function show(list, onOk) {
    const style = document.createElement("style");
    style.textContent = CSS;
    document.head.appendChild(style);
    const overlay = document.createElement("div");
    overlay.className = "ec-news-overlay";
    overlay.innerHTML = `
        <div class="ec-news" role="dialog" aria-modal="true" aria-labelledby="ecNewsHead">
            <div class="ec-news-head" id="ecNewsHead">Pengumuman</div>
            <div class="ec-news-list">${list.map((n) => `
                <article class="ec-news-item">
                    <h3>${escapeHtml(n.title)}</h3>
                    <div class="date">${dateLabel(publishedMs(n))}</div>
                    ${announcementHtml(n.body)}
                </article>`).join("")}
            </div>
            <div class="ec-news-foot"><button type="button">Mengerti</button></div>
        </div>`;
    document.body.appendChild(overlay);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden"; // halaman di belakang tidak ikut bergulir
    const btn = overlay.querySelector("button");
    btn.focus();
    btn.addEventListener("click", () => {
        overlay.remove();
        document.body.style.overflow = prevOverflow;
        onOk();
    });
}

async function start(user) {
    const LOCAL = `ec-news-seen-${user.uid}`;
    let profile;
    try {
        const snap = await getDoc(doc(db, "users", user.uid));
        if (!snap.exists()) return;
        profile = snap.data();
    } catch { return; }

    let seen = ms(profile.announceSeenAt);
    try { seen = Math.max(seen, Number(localStorage.getItem(LOCAL)) || 0); } catch { /* abaikan */ }
    const since = seen || Date.now() - DAYS * 86400000;

    let items = [];
    try {
        const levels = profile.level ? [profile.level, PACK_ALL_LEVELS] : [PACK_ALL_LEVELS];
        const snaps = await Promise.all(levels.map((lvl) => getDocs(query(
            collection(db, "announcements"), where("active", "==", true), where("level", "==", lvl)))));
        items = snaps.flatMap((s) => s.docs.map((d) => ({ id: d.id, ...d.data() })));
    } catch (e) {
        console.warn("Gagal memuat pengumuman:", e);
        return;
    }

    const list = items.filter((n) => publishedMs(n) > since)
        .sort((a, b) => publishedMs(b) - publishedMs(a))
        .slice(0, MAX_SHOWN);
    if (!list.length) return;

    show(list, () => {
        try { localStorage.setItem(LOCAL, String(Date.now())); } catch { /* abaikan */ }
        updateDoc(doc(db, "users", user.uid), { announceSeenAt: serverTimestamp() })
            .catch((e) => console.warn("Gagal menyimpan status pengumuman:", e));
    });
}

let started = false;
onAuthStateChanged(auth, (user) => {
    if (user && !started) { started = true; start(user); }
});
