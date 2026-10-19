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

export const speciesOf = (key) => PET_SPECIES.find((s) => s.key === key) || PET_SPECIES[0];

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

// Gambar hewan. stage 0-5. size = lebar/tinggi dalam px.
export function petSvg(speciesKey, stage = 1, size = 120, cls = "pet-svg") {
    const sp = speciesOf(speciesKey);
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
            ${face(cx, cy - 4, .95, sp)}`;
    } else {
        // Anak - Legenda: kepala + badan, makin besar
        const g = [0, 0, 0, .1, .2, .22][stage];
        const hr = 24 + stage * 0.6;
        const hx = 60, hy = 48 - g * 20;
        const bx = 60, by = 84 - g * 4, brx = 19 + stage * 2.5, bry = 17 + stage * 2.2;
        const s = 0.8 + stage * 0.08;
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
            ${stage === 3 && sp.key !== "naga" ? `<path d="M${hx - 13} ${hy + hr - 3}q13 6 26 0l-13 12z" fill="${sp.key === "kucing" ? "#4fb0a6" : "#7fa8e8"}" stroke="${sp.dark}" stroke-width="1.5" stroke-linejoin="round"/>` : ""}
            ${stage >= 4 ? `<path d="M${hx - 14} ${hy + hr - 2}q14 9 28 0" fill="none" stroke="${sp.key === "naga" ? "#f4e3a1" : "#e85d5d"}" stroke-width="5" stroke-linecap="round"/>` : ""}
            ${stage === 4 ? `<circle cx="${hx}" cy="${hy + hr + 6}" r="4.2" fill="#f6cf4a" stroke="#c9961a" stroke-width="1.4"/>` : ""}
            ${stage === 5 ? `<path d="M${hx - 13} ${hy - hr + 1}l4 -12l5 7l4 -10l4 10l5 -7l4 12z" fill="#f6cf4a" stroke="#c9961a" stroke-width="1.6" stroke-linejoin="round"/>
                <path d="M22 30l2 5l5 2l-5 2l-2 5l-2 -5l-5 -2l5 -2zM98 50l1.6 4l4 1.6l-4 1.6l-1.6 4l-1.6 -4l-4 -1.6l4 -1.6zM92 18l1.2 3l3 1.2l-3 1.2l-1.2 3l-1.2 -3l-3 -1.2l3 -1.2z" fill="#f6cf4a"/>` : ""}`;
    }
    // Kelinci: telinga panjang, jadi gambar sedikit diperkecil agar tidak terpotong
    if (sp.key === "kelinci" && stage >= 1) art = `<g transform="translate(60 118) scale(.88) translate(-60 -118)">${art}</g>`;
    return `<svg class="${cls}" width="${size}" height="${size}" viewBox="0 0 120 120" role="img" aria-label="${sp.name} ${STAGES[stage] || ""}">
        <defs><radialGradient id="aura"><stop offset=".55" stop-color="#a9bff5" stop-opacity=".55"/><stop offset="1" stop-color="#a9bff5" stop-opacity="0"/></radialGradient></defs>${art}</svg>`;
}
