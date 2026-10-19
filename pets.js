// =====================================================================
//  pets.js - Hewan peliharaan siswa yang tumbuh mengikuti tier
// ---------------------------------------------------------------------
//  Siswa memilih satu hewan + nama (disimpan di users/{uid}.pet =
//  { species, name }). Wujudnya ditentukan tier (lihat tiers.js):
//    Perunggu I = Telur, Perunggu II-III = Bayi, Perak = Anak,
//    Emas = Remaja, Platinum = Dewasa, Berlian = Legenda.
//  Semua gambar digambar dengan SVG di file ini (karakter asli ExtraCourse).
//  Hewan tidak pernah sedih/sakit; hanya tumbuh.
// =====================================================================

export const PET_SPECIES = [
    { key: "kucing", name: "Kucing", body: "#f2a65a", dark: "#cf7a2c", belly: "#fde6cc", accent: "#f7c79a" },
    { key: "kelinci", name: "Kelinci", body: "#f1ebe3", dark: "#cdbca8", belly: "#ffffff", accent: "#f6b3c2" },
    { key: "naga", name: "Naga", body: "#78c98a", dark: "#3f9a5c", belly: "#e8f4c4", accent: "#4fb0a6" },
];
export const PET_NAME_MAX = 16;

export const STAGES = ["Telur", "Bayi", "Anak", "Remaja", "Dewasa", "Legenda"];

// Wujud dari indeks tier (0-12)
export function stageForTier(tierIndex) {
    if (tierIndex <= 0) return 0;
    if (tierIndex <= 2) return 1;
    if (tierIndex <= 5) return 2;
    if (tierIndex <= 8) return 3;
    if (tierIndex <= 11) return 4;
    return 5;
}

// Siswa yang belum memilih hewan: telur abu-abu
const NO_PET = { key: "none", name: "Belum memilih", body: "#d6ddd9", dark: "#aab5af", belly: "#f1f4f2", accent: "#c3ccc7" };
export const speciesOf = (key) => key === "none" ? NO_PET : PET_SPECIES.find((s) => s.key === key) || PET_SPECIES[0];

// Data hewan yang boleh dilihat siswa lain (koleksi pets/{uid})
export function publicPet(pet, equipped) {
    return pet ? { species: pet.species, name: pet.name, equipped: equipped || {} } : null;
}

// Tier pertama untuk wujud berikutnya (untuk teks "x XP lagi sampai tumbuh")
export function nextStageTier(tierIndex) {
    const now = stageForTier(tierIndex);
    for (let i = tierIndex + 1; i <= 12; i++) if (stageForTier(i) > now) return i;
    return null;
}

// ---------- Gambar ----------
const EYE = "#2b2622";

function eyes(cx, cy, gap, r) {
    return [-1, 1].map((d) => `<circle cx="${cx + d * gap}" cy="${cy}" r="${r}" fill="${EYE}"/>
        <circle cx="${cx + d * gap - r * .35}" cy="${cy - r * .4}" r="${r * .38}" fill="#fff"/>`).join("");
}
function blush(cx, cy, gap, r) {
    return [-1, 1].map((d) => `<ellipse cx="${cx + d * gap}" cy="${cy}" rx="${r}" ry="${r * .6}" fill="#ff8f8f" opacity=".45"/>`).join("");
}
function face(cx, cy, s, sp) {
    const mouth = sp.key === "kucing"
        ? `<path d="M${cx - 4 * s} ${cy + 6 * s}q${2 * s} ${3 * s} ${4 * s} 0q${2 * s} ${3 * s} ${4 * s} 0" fill="none" stroke="${EYE}" stroke-width="${1.6 * s}" stroke-linecap="round"/>`
        : `<path d="M${cx - 3 * s} ${cy + 6 * s}q${3 * s} ${3.5 * s} ${6 * s} 0" fill="none" stroke="${EYE}" stroke-width="${1.6 * s}" stroke-linecap="round"/>`;
    const nose = sp.key === "naga" ? "" : `<path d="M${cx - 2 * s} ${cy + 3 * s}h${4 * s}l-${2 * s} ${2.2 * s}z" fill="${sp.key === "kelinci" ? sp.accent : "#d35d5d"}"/>`;
    const whisk = sp.key === "kucing" ? [-1, 1].map((d) => `<path d="M${cx + d * 9 * s} ${cy + 4 * s}l${d * 9 * s} -${2 * s}M${cx + d * 9 * s} ${cy + 6.5 * s}l${d * 9 * s} ${1 * s}" stroke="${sp.dark}" stroke-width="${1.1 * s}" stroke-linecap="round" opacity=".7"/>`).join("") : "";
    return eyes(cx, cy - 1 * s, 7.5 * s, 3.4 * s) + blush(cx, cy + 4 * s, 12 * s, 3.2 * s) + nose + mouth + whisk;
}

// Telinga / tanduk di atas kepala (cx, cy = pusat kepala, r = jari-jari)
function headTop(sp, cx, cy, r, stage) {
    if (sp.key === "kucing") {
        return [-1, 1].map((d) => {
            const bx = cx + d * r * .62, by = cy - r * .62;
            return `<path d="M${bx - d * r * .32} ${by + r * .12}L${cx + d * r * .78} ${cy - r * 1.18}L${bx + d * r * .36} ${by + r * .32}z" fill="${sp.body}" stroke="${sp.dark}" stroke-width="2" stroke-linejoin="round"/>
                <path d="M${bx - d * r * .14} ${by + r * .08}L${cx + d * r * .74} ${cy - r * .98}L${bx + d * r * .26} ${by + r * .22}z" fill="${sp.accent}"/>`;
        }).join("");
    }
    if (sp.key === "kelinci") {
        const len = r * (0.85 + stage * 0.03);
        return [-1, 1].map((d) => {
            const x = cx + d * r * .38, tilt = d * (stage === 1 ? 14 : 8);
            return `<g transform="rotate(${tilt} ${x} ${cy - r * .7})"><ellipse cx="${x}" cy="${cy - r * .7 - len * .55}" rx="${r * .27}" ry="${len * .62}" fill="${sp.body}" stroke="${sp.dark}" stroke-width="2"/>
                <ellipse cx="${x}" cy="${cy - r * .7 - len * .5}" rx="${r * .13}" ry="${len * .46}" fill="${sp.accent}"/></g>`;
        }).join("");
    }
    // naga: tanduk kecil, makin panjang
    const h = r * (0.32 + stage * 0.07);
    return [-1, 1].map((d) => {
        const x = cx + d * r * .45, y = cy - r * .78;
        return `<path d="M${x - d * r * .12} ${y + r * .1}Q${x + d * r * .05} ${y - h} ${x + d * r * .26} ${y - h * 1.1}Q${x + d * r * .2} ${y - h * .2} ${x + d * r * .2} ${y + r * .14}z" fill="#f4e3a1" stroke="#c9a94c" stroke-width="1.6" stroke-linejoin="round"/>`;
    }).join("");
}

function tail(sp, x, y, s, stage) {
    if (sp.key === "kucing") return `<path d="M${x} ${y}q${22 * s} ${-2 * s} ${18 * s} ${-26 * s}" fill="none" stroke="${sp.dark}" stroke-width="${8 * s}" stroke-linecap="round"/><path d="M${x} ${y}q${22 * s} ${-2 * s} ${18 * s} ${-26 * s}" fill="none" stroke="${sp.body}" stroke-width="${5 * s}" stroke-linecap="round"/>`;
    if (sp.key === "kelinci") return `<circle cx="${x + 2 * s}" cy="${y - 4 * s}" r="${7 * s}" fill="#fff" stroke="${sp.dark}" stroke-width="2"/>`;
    const spikes = stage >= 3 ? `<path d="M${x + 14 * s} ${y - 12 * s}l${6 * s} ${-3 * s}l${-1 * s} ${6 * s}z" fill="${sp.accent}"/>` : "";
    return `<path d="M${x - 2 * s} ${y + 2 * s}Q${x + 22 * s} ${y + 4 * s} ${x + 20 * s} ${y - 16 * s}" fill="none" stroke="${sp.dark}" stroke-width="${9 * s}" stroke-linecap="round"/><path d="M${x - 2 * s} ${y + 2 * s}Q${x + 22 * s} ${y + 4 * s} ${x + 20 * s} ${y - 16 * s}" fill="none" stroke="${sp.body}" stroke-width="${6 * s}" stroke-linecap="round"/>${spikes}`;
}

function wings(sp, cx, cy, s) {
    return [-1, 1].map((d) => `<path d="M${cx + d * 12 * s} ${cy - 6 * s}Q${cx + d * 40 * s} ${cy - 30 * s} ${cx + d * 38 * s} ${cy + 2 * s}Q${cx + d * 30 * s} ${cy - 4 * s} ${cx + d * 26 * s} ${cy + 6 * s}Q${cx + d * 20 * s} ${cy} ${cx + d * 14 * s} ${cy + 6 * s}z" fill="${sp.accent}" stroke="${sp.dark}" stroke-width="2" stroke-linejoin="round" opacity=".95"/>`).join("");
}

function markings(sp, cx, cy, r, stage) {
    if (stage < 2) return "";
    if (sp.key === "kucing") return [-1, 0, 1].map((d) => `<path d="M${cx + d * r * .28} ${cy - r * .98}v${r * .28}" stroke="${sp.dark}" stroke-width="3" stroke-linecap="round"/>`).join("");
    if (sp.key === "naga") return [-1, 1].map((d) => `<circle cx="${cx + d * r * .62}" cy="${cy - r * .25}" r="${r * .07}" fill="${sp.dark}" opacity=".5"/>`).join("");
    return "";
}

function egg(sp) {
    return `<ellipse cx="60" cy="106" rx="26" ry="5" fill="#000" opacity=".1"/>
        <path d="M60 22C78 22 90 52 90 74C90 94 77 104 60 104C43 104 30 94 30 74C30 52 42 22 60 22z" fill="#fffaf2" stroke="${sp.dark}" stroke-width="2.5"/>
        <circle cx="48" cy="58" r="7" fill="${sp.body}"/><circle cx="72" cy="78" r="9" fill="${sp.body}"/><circle cx="54" cy="90" r="5" fill="${sp.body}"/><circle cx="70" cy="46" r="4.5" fill="${sp.body}"/>
        <path d="M44 40q4 -8 10 -10" stroke="#fff" stroke-width="4" stroke-linecap="round" fill="none" opacity=".9"/>`;
}

// ---------- Toko: aksesori & latar ----------
// slot: head (kepala), face (wajah), neck (leher), bg (latar).
// minTier = indeks tier minimal untuk membeli (lihat tiers.js), 0 = semua.
export const SHOP_ITEMS = [
    { id: "topi-pesta", slot: "head", name: "Topi pesta", price: 60 },
    { id: "bando-bunga", slot: "head", name: "Bando bunga", price: 90 },
    { id: "baret", slot: "head", name: "Baret pelukis", price: 140 },
    { id: "topi-penyihir", slot: "head", name: "Topi penyihir", price: 260, minTier: 3 },
    { id: "topi-wisuda", slot: "head", name: "Topi wisuda", price: 400, minTier: 6 },
    { id: "kacamata-bulat", slot: "face", name: "Kacamata bulat", price: 70 },
    { id: "kacamata-hitam", slot: "face", name: "Kacamata hitam", price: 150 },
    { id: "kacamata-bintang", slot: "face", name: "Kacamata bintang", price: 220, minTier: 3 },
    { id: "syal-merah", slot: "neck", name: "Syal merah", price: 60 },
    { id: "dasi-kupu", slot: "neck", name: "Dasi kupu-kupu", price: 100 },
    { id: "medali", slot: "neck", name: "Kalung medali", price: 320, minTier: 6 },
    { id: "latar-taman", slot: "bg", name: "Taman", price: 100 },
    { id: "latar-pantai", slot: "bg", name: "Pantai", price: 160 },
    { id: "latar-malam", slot: "bg", name: "Langit malam", price: 220, minTier: 3 },
];
export const SHOP_SLOTS = [
    { key: "head", name: "Kepala" }, { key: "face", name: "Wajah" },
    { key: "neck", name: "Leher" }, { key: "bg", name: "Latar" },
];
export const itemById = (id) => SHOP_ITEMS.find((i) => i.id === id) || null;

const OUT = 'stroke="#3b2f2a" stroke-width="1.6" stroke-linejoin="round"';

// Kepala: (cx, cy, r) = pusat & jari-jari kepala
function drawHead(id, cx, cy, r) {
    const t = cy - r;
    switch (id) {
        case "topi-pesta": return `<g transform="rotate(12 ${cx} ${t})"><path d="M${cx - r * .42} ${t + r * .2}L${cx} ${t - r * .95}L${cx + r * .42} ${t + r * .2}z" fill="#7fa8e8" ${OUT}/>
            <path d="M${cx - r * .28} ${t - r * .2}L${cx + r * .3} ${t - .02 * r}M${cx - r * .14} ${t - r * .55}L${cx + r * .16} ${t - r * .45}" stroke="#f6cf4a" stroke-width="3.2" stroke-linecap="round"/>
            <circle cx="${cx}" cy="${t - r * .98}" r="${r * .16}" fill="#e85d5d" ${OUT}/></g>`;
        case "bando-bunga": return `<path d="M${cx - r * .9} ${cy - r * .35}Q${cx} ${t - r * .35} ${cx + r * .9} ${cy - r * .35}" fill="none" stroke="#4fae68" stroke-width="3.5" stroke-linecap="round"/>
            ${[[-.6, -.62, "#f6b3c2"], [0, -.98, "#f6cf4a"], [.6, -.62, "#c9a7f0"]].map(([dx, dy, c]) => {
                const x = cx + dx * r, y = cy + dy * r;
                return [0, 72, 144, 216, 288].map((a) => `<circle cx="${x + Math.cos(a * Math.PI / 180) * r * .13}" cy="${y + Math.sin(a * Math.PI / 180) * r * .13}" r="${r * .12}" fill="${c}"/>`).join("") + `<circle cx="${x}" cy="${y}" r="${r * .08}" fill="#fff6d6"/>`;
            }).join("")}`;
        case "baret": return `<ellipse cx="${cx + r * .1}" cy="${t + r * .12}" rx="${r * .78}" ry="${r * .3}" fill="#c74a4a" ${OUT} transform="rotate(-8 ${cx} ${t})"/>
            <path d="M${cx + r * .05} ${t - r * .18}l${r * .06} -${r * .2}" stroke="#3b2f2a" stroke-width="3" stroke-linecap="round"/>`;
        case "topi-penyihir": return `<g transform="rotate(-8 ${cx} ${t})"><ellipse cx="${cx}" cy="${t + r * .18}" rx="${r * .85}" ry="${r * .2}" fill="#5b4a9e" ${OUT}/>
            <path d="M${cx - r * .48} ${t + r * .14}Q${cx - r * .1} ${t - r * .6} ${cx + r * .35} ${t - r * 1.25}Q${cx + r * .15} ${t - r * .5} ${cx + r * .5} ${t + r * .14}z" fill="#6a58b5" ${OUT}/>
            <path d="M${cx - r * .44} ${t + r * .02}Q${cx} ${t - r * .1} ${cx + r * .46} ${t + r * .02}" stroke="#f6cf4a" stroke-width="3" fill="none"/>
            <path d="M${cx - r * .02} ${t - r * .5}l1.6 3.4l3.6.4l-2.7 2.4l.8 3.6l-3.3-1.9l-3.3 1.9l.8-3.6l-2.7-2.4l3.6-.4z" fill="#f6cf4a"/></g>`;
        case "topi-wisuda": return `<path d="M${cx - r * .5} ${t + r * .05}h${r}v${r * .28}q-${r * .5} ${r * .14} -${r} 0z" fill="#2f3440" ${OUT}/>
            <path d="M${cx} ${t - r * .42}L${cx + r * 1.05} ${t - r * .08}L${cx} ${t + r * .24}L${cx - r * 1.05} ${t - r * .08}z" fill="#3a4050" ${OUT}/>
            <path d="M${cx} ${t - r * .08}L${cx + r * .78} ${t + r * .05}v${r * .45}" fill="none" stroke="#f6cf4a" stroke-width="2.2"/>
            <rect x="${cx + r * .72}" y="${t + r * .45}" width="${r * .14}" height="${r * .3}" rx="2" fill="#f6cf4a"/>`;
    }
    return "";
}

// Wajah: (cx, ey) = tengah antara mata, gap = jarak mata dari tengah
function drawFace(id, cx, ey, gap) {
    const lens = (fn) => [-1, 1].map((d) => fn(cx + d * gap)).join("");
    switch (id) {
        case "kacamata-bulat": return lens((x) => `<circle cx="${x}" cy="${ey}" r="${gap * .72}" fill="#bfe3ff" fill-opacity=".25" stroke="#3b2f2a" stroke-width="2"/>`)
            + `<path d="M${cx - gap * .28} ${ey - 1}q${gap * .28} -3 ${gap * .56} 0" fill="none" stroke="#3b2f2a" stroke-width="2"/>`;
        case "kacamata-hitam": return lens((x) => `<rect x="${x - gap * .8}" y="${ey - gap * .55}" width="${gap * 1.6}" height="${gap * 1.05}" rx="${gap * .45}" fill="#22262e"/>
            <path d="M${x - gap * .45} ${ey - gap * .25}l${gap * .35} -${gap * .1}" stroke="#fff" stroke-opacity=".6" stroke-width="1.6" stroke-linecap="round"/>`)
            + `<path d="M${cx - gap * .2} ${ey - gap * .25}h${gap * .4}" stroke="#22262e" stroke-width="2.4"/>`;
        case "kacamata-bintang": return lens((x) => {
                const R = gap * .95, ri = R * .48;
                const pts = [...Array(10)].map((_, i) => { const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? ri : R; return `${(x + Math.cos(a) * rr).toFixed(1)},${(ey + Math.sin(a) * rr).toFixed(1)}`; }).join(" ");
                return `<polygon points="${pts}" fill="#ff8fb8" fill-opacity=".85" stroke="#d94f86" stroke-width="1.6" stroke-linejoin="round"/>`;
            }) + `<path d="M${cx - gap * .2} ${ey}h${gap * .4}" stroke="#d94f86" stroke-width="2.2"/>`;
    }
    return "";
}

// Leher: (cx, ny) = tengah leher, w = setengah lebar
function drawNeck(id, cx, ny, w) {
    switch (id) {
        case "syal-merah": return `<path d="M${cx - w} ${ny - 3}Q${cx} ${ny + 7} ${cx + w} ${ny - 3}l1 6Q${cx} ${ny + 14} ${cx - w - 1} ${ny + 3}z" fill="#e05252" ${OUT}/>
            <path d="M${cx + w * .35} ${ny + 4}l${w * .15} ${w * .9}l${w * .32} -${w * .1}l-${w * .12} -${w * .85}z" fill="#e05252" ${OUT}/>`;
        case "dasi-kupu": return `<path d="M${cx} ${ny + 2}l-${w * .62} -${w * .36}v${w * .72}z M${cx} ${ny + 2}l${w * .62} -${w * .36}v${w * .72}z" fill="#4a6fd8" ${OUT}/>
            <circle cx="${cx}" cy="${ny + 2}" r="${w * .17}" fill="#3557b8" ${OUT}/>`;
        case "medali": return `<path d="M${cx - w * .7} ${ny - 4}L${cx} ${ny + w * .55}L${cx + w * .7} ${ny - 4}" fill="none" stroke="#4a6fd8" stroke-width="4"/>
            <circle cx="${cx}" cy="${ny + w * .78}" r="${w * .33}" fill="#f6cf4a" stroke="#c9961a" stroke-width="1.8"/>
            <path d="M${cx} ${ny + w * .62}l1.4 2.8l3 .4l-2.2 2.1l.6 3l-2.8 -1.5l-2.8 1.5l.6 -3l-2.2 -2.1l3 -.4z" fill="#fff6d6"/>`;
    }
    return "";
}

// Latar di belakang hewan (lingkaran penuh di kotak 120x120)
function drawBg(id) {
    const clip = `<clipPath id="bgc"><circle cx="60" cy="62" r="57"/></clipPath>`;
    switch (id) {
        case "latar-taman": return `<defs>${clip}</defs><g clip-path="url(#bgc)"><rect width="120" height="120" fill="#cfeafc"/>
            <circle cx="94" cy="26" r="9" fill="#ffe27a"/><path d="M0 92Q30 78 60 88T120 84V120H0z" fill="#9edb8f"/><path d="M0 104Q40 94 120 102V120H0z" fill="#7fcb74"/>
            ${[[18, 98, "#f6b3c2"], [100, 96, "#f6cf4a"], [30, 108, "#c9a7f0"]].map(([x, y, c]) => `<circle cx="${x}" cy="${y}" r="3" fill="${c}"/>`).join("")}</g>`;
        case "latar-pantai": return `<defs>${clip}</defs><g clip-path="url(#bgc)"><rect width="120" height="120" fill="#bfe7ff"/>
            <circle cx="28" cy="28" r="10" fill="#ffd36b"/><rect y="76" width="120" height="20" fill="#5fb6e8"/><path d="M0 80q10 -4 20 0t20 0t20 0t20 0t20 0t20 0" stroke="#e9f7ff" stroke-width="2" fill="none"/>
            <path d="M0 96Q60 88 120 96V120H0z" fill="#f3dca5"/></g>`;
        case "latar-malam": return `<defs>${clip}</defs><g clip-path="url(#bgc)"><rect width="120" height="120" fill="#28305a"/>
            <circle cx="92" cy="28" r="10" fill="#fff3c4"/><circle cx="96" cy="25" r="9" fill="#28305a"/>
            ${[[20, 22], [40, 40], [64, 16], [106, 54], [14, 60], [80, 46]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="1.4" fill="#fff"/>`).join("")}
            <path d="M0 98Q60 86 120 98V120H0z" fill="#3b4a7a"/></g>`;
    }
    return "";
}

// Gambar hewan. stage 0-5. size = lebar/tinggi dalam px.
// wear = { head, face, neck, bg } (id barang yang dipakai, opsional)
export function petSvg(speciesKey, stage = 1, size = 120, cls = "pet-svg", wear = {}) {
    const sp = speciesOf(speciesKey);
    const w = wear || {};
    let art;
    if (stage <= 0) {
        art = egg(sp);
    } else if (stage === 1) {
        // Bayi: satu bulatan (kepala = badan)
        const cx = 60, cy = 74, r = 28;
        art = `<ellipse cx="60" cy="106" rx="24" ry="5" fill="#000" opacity=".1"/>
            ${tail(sp, cx + 20, cy + 18, .7, stage)}
            ${headTop(sp, cx, cy, r, stage)}
            <ellipse cx="${cx}" cy="${cy}" rx="${r * 1.08}" ry="${r}" fill="${sp.body}" stroke="${sp.dark}" stroke-width="2.5"/>
            <ellipse cx="${cx}" cy="${cy + 13}" rx="${r * .55}" ry="${r * .38}" fill="${sp.belly}"/>
            <ellipse cx="${cx - 12}" cy="${cy + r - 1}" rx="7" ry="4.5" fill="${sp.body}" stroke="${sp.dark}" stroke-width="2"/>
            <ellipse cx="${cx + 12}" cy="${cy + r - 1}" rx="7" ry="4.5" fill="${sp.body}" stroke="${sp.dark}" stroke-width="2"/>
            ${face(cx, cy - 4, .95, sp)}
            ${drawNeck(w.neck, cx, cy + 13, 15)}
            ${drawFace(w.face, cx, cy - 5, 7.1)}
            ${drawHead(w.head, cx, cy + 4, r * .95)}`;
    } else {
        // Anak - Legenda: kepala + badan, makin besar
        const g = [0, 0, 0, .1, .2, .22][stage];
        const hr = 24 + stage * 0.6;
        const hx = 60, hy = 48 - g * 20;
        const bx = 60, by = 84 - g * 4, brx = 19 + stage * 2.5, bry = 17 + stage * 2.2;
        const s = 0.8 + stage * 0.08;
        // Barang toko menggantikan hiasan bawaan wujud di slot yang sama
        const ownNeck = !w.neck, ownHead = !w.head;
        art = `${stage === 5 ? `<circle cx="60" cy="66" r="52" fill="url(#aura)"/>` : ""}
            <ellipse cx="60" cy="108" rx="${brx + 8}" ry="5" fill="#000" opacity=".1"/>
            ${sp.key === "naga" && stage >= 3 ? wings(sp, bx, by - 4, s) : ""}
            ${tail(sp, bx + brx * .7, by + bry * .5, s, stage)}
            <ellipse cx="${bx}" cy="${by}" rx="${brx}" ry="${bry}" fill="${sp.body}" stroke="${sp.dark}" stroke-width="2.5"/>
            <ellipse cx="${bx}" cy="${by + 3}" rx="${brx * .58}" ry="${bry * .7}" fill="${sp.belly}"/>
            <ellipse cx="${bx - brx * .5}" cy="${by + bry - 2}" rx="8" ry="5" fill="${sp.body}" stroke="${sp.dark}" stroke-width="2"/>
            <ellipse cx="${bx + brx * .5}" cy="${by + bry - 2}" rx="8" ry="5" fill="${sp.body}" stroke="${sp.dark}" stroke-width="2"/>
            <ellipse cx="${bx - brx * .82}" cy="${by - 2}" rx="5.5" ry="8" fill="${sp.body}" stroke="${sp.dark}" stroke-width="2" transform="rotate(20 ${bx - brx * .82} ${by - 2})"/>
            <ellipse cx="${bx + brx * .82}" cy="${by - 2}" rx="5.5" ry="8" fill="${sp.body}" stroke="${sp.dark}" stroke-width="2" transform="rotate(-20 ${bx + brx * .82} ${by - 2})"/>
            ${headTop(sp, hx, hy, hr, stage)}
            <circle cx="${hx}" cy="${hy}" r="${hr}" fill="${sp.body}" stroke="${sp.dark}" stroke-width="2.5"/>
            ${markings(sp, hx, hy, hr, stage)}
            ${face(hx, hy + 3, .95, sp)}
            ${ownNeck && stage === 3 && sp.key !== "naga" ? `<path d="M${hx - 13} ${hy + hr - 3}q13 6 26 0l-13 12z" fill="${sp.key === "kucing" ? "#4fb0a6" : "#7fa8e8"}" stroke="${sp.dark}" stroke-width="1.5" stroke-linejoin="round"/>` : ""}
            ${ownNeck && stage >= 4 ? `<path d="M${hx - 14} ${hy + hr - 2}q14 9 28 0" fill="none" stroke="${sp.key === "naga" ? "#f4e3a1" : "#e85d5d"}" stroke-width="5" stroke-linecap="round"/>` : ""}
            ${ownNeck && stage === 4 ? `<circle cx="${hx}" cy="${hy + hr + 6}" r="4.2" fill="#f6cf4a" stroke="#c9961a" stroke-width="1.4"/>` : ""}
            ${drawNeck(w.neck, hx, hy + hr - 1, 15)}
            ${drawFace(w.face, hx, hy + 2, 7.1)}
            ${ownHead && stage === 5 ? `<path d="M${hx - 13} ${hy - hr + 1}l4 -12l5 7l4 -10l4 10l5 -7l4 12z" fill="#f6cf4a" stroke="#c9961a" stroke-width="1.6" stroke-linejoin="round"/>` : ""}
            ${drawHead(w.head, hx, hy, hr)}
            ${stage === 5 ? `<path d="M22 30l2 5l5 2l-5 2l-2 5l-2 -5l-5 -2l5 -2zM98 50l1.6 4l4 1.6l-4 1.6l-1.6 4l-1.6 -4l-4 -1.6l4 -1.6zM92 18l1.2 3l3 1.2l-3 1.2l-1.2 3l-1.2 -3l-3 -1.2l3 -1.2z" fill="#f6cf4a"/>` : ""}`;
    }
    // Kelinci: telinga panjang, jadi gambar sedikit diperkecil agar tidak terpotong
    if (sp.key === "kelinci" && stage >= 1) art = `<g transform="translate(60 118) scale(.88) translate(-60 -118)">${art}</g>`;
    return `<svg class="${cls}" width="${size}" height="${size}" viewBox="0 0 120 120" role="img" aria-label="${sp.name} ${STAGES[stage] || ""}">
        <defs><radialGradient id="aura"><stop offset=".55" stop-color="#a9bff5" stop-opacity=".55"/><stop offset="1" stop-color="#a9bff5" stop-opacity="0"/></radialGradient></defs>${drawBg(w.bg)}${art}</svg>`;
}

// Gambar satu barang toko saja (untuk kartu barang)
export function itemSvg(id, size = 64) {
    const it = itemById(id);
    if (!it) return "";
    const body = it.slot === "head" ? drawHead(id, 60, 118, 50)
        : it.slot === "face" ? `<g transform="translate(60 60) scale(2.4) translate(-60 -60)">${drawFace(id, 60, 60, 7.1)}</g>`
        : it.slot === "neck" ? `<g transform="translate(60 52) scale(2.2) translate(-60 -52)">${drawNeck(id, 60, 50, 15)}</g>`
        : drawBg(id);
    return `<svg width="${size}" height="${size}" viewBox="0 0 120 120" aria-hidden="true">${body}</svg>`;
}
