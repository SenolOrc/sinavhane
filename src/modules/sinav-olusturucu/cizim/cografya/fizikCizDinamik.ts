// Fizik şekilleri – Paket 4: çembersel hareket, çekim/yörünge, basit harmonik hareket, dönme dinamiği.
import { fizikMetniCiz, fizikMetniOlcu } from "../fizik";
import { ayarMantik, ayarSayi, ayarSec, type CografyaVerisi } from "./sema";
import { GRI, cizgi, dolgu, kesik, ok, olcuOku, puntoOlc, sayiYaz, type Kutu } from "./fizikYardim";

type Ctx = CanvasRenderingContext2D;
const PI = Math.PI, D2R = PI / 180;
const G = 10;

function beyaz(ctx: Ctx, metin: string, x: number, y: number, punto: number, hiza: "orta" | "sol" | "sag" = "orta") {
  const w = fizikMetniOlcu(ctx, metin, punto).w + 4, x0 = hiza === "orta" ? x - w / 2 : hiza === "sol" ? x - 2 : x - w + 2;
  ctx.save(); ctx.fillStyle = "#fff"; ctx.fillRect(x0, y - punto * 0.62, w, punto * 1.24); ctx.restore();
  fizikMetniCiz(ctx, metin, x, y, punto, hiza);
}
function nokta(ctx: Ctx, x: number, y: number, r: number, renk = "#000") { ctx.save(); ctx.beginPath(); ctx.arc(x, y, r, 0, PI * 2); ctx.fillStyle = renk; ctx.fill(); ctx.restore(); }
function kure(ctx: Ctx, x: number, y: number, r: number, renk = "#cfcfcf") { ctx.save(); ctx.beginPath(); ctx.arc(x, y, r, 0, PI * 2); ctx.fillStyle = renk; ctx.fill(); ctx.stroke(); ctx.restore(); }
function vektor(ctx: Ctx, x: number, y: number, dx: number, dy: number, ad: string, punto: number, kal: number, ofs = 11, dis: [number, number] = [0, 0]) {
  ctx.save(); ctx.lineWidth = Math.max(1.4, kal * 1.1); ok(ctx, x, y, x + dx, y + dy, 7); ctx.restore();
  const L = Math.hypot(dx, dy) || 1;
  beyaz(ctx, ad, x + dx + (dx / L) * 4 + (-dy / L) * ofs * 0.4 + dis[0], y + dy + (dy / L) * 6 + (dx / L) * ofs * 0.4 + dis[1], punto * 0.9, dx + dis[0] > 8 ? "sol" : dx + dis[0] < -8 ? "sag" : "orta");
}
function yayCiz(ctx: Ctx, x0: number, x1: number, y: number, n = 9, a = 7) {
  const L = x1 - x0, bas = Math.min(10, L * 0.15);
  ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(x0 + bas, y);
  for (let i = 0; i < n; i++) ctx.lineTo(x0 + bas + ((L - 2 * bas) * (i + 0.5)) / n, y + (i % 2 ? a : -a));
  ctx.lineTo(x1 - bas, y); ctx.lineTo(x1, y); ctx.stroke();
}
function acıYayi(ctx: Ctx, cx: number, cy: number, r: number, a0: number, a1: number, ad: string, punto: number, kal: number, yaziR = r + 9) {
  ctx.save(); ctx.lineWidth = Math.max(0.8, kal * 0.55); ctx.beginPath(); ctx.arc(cx, cy, r, a0, a1); ctx.stroke(); ctx.restore();
  const m = (a0 + a1) / 2; fizikMetniCiz(ctx, ad, cx + Math.cos(m) * yaziR, cy + Math.sin(m) * yaziR, punto * 0.92);
}
/** Dönme yönünü gösteren yay + ok (ccw=true: ekranda saat yönünün tersi). */
function donmeOku(ctx: Ctx, cx: number, cy: number, r: number, ccw: boolean, kal: number) {
  ctx.save(); ctx.lineWidth = Math.max(1.2, kal);
  const sg = ccw ? -1 : 1, t0 = ccw ? 0.9 * PI : 0.1 * PI, t1 = t0 + sg * 1.45 * PI;
  ctx.beginPath(); ctx.arc(cx, cy, r, t0, t1, ccw); ctx.stroke();
  const px = cx + Math.cos(t1) * r, py = cy + Math.sin(t1) * r, tx = sg * -Math.sin(t1), ty = sg * Math.cos(t1);
  ok(ctx, px - tx * 3, py - ty * 3, px + tx * 5, py + ty * 5, 6); ctx.restore();
}

// ════════════════════════════════════════════════════════════════════════════
// ÇEMBERSEL HAREKET
// ════════════════════════════════════════════════════════════════════════════
export function cemberselHesap(v: CografyaVerisi) {
  const vv = ayarSayi(v, "v"), r = ayarSayi(v, "r"), m = ayarSayi(v, "m"), th = ayarSayi(v, "aci") * D2R;
  const ac = (vv * vv) / r;
  return { v: vv, r, m, ac, w: vv / r, T: (2 * PI * r) / vv, Fc: m * ac, th, tanTh: Math.tan(th), vViraj: Math.sqrt(G * r * Math.tan(th)), vKonik: Math.sqrt(G * r * Math.tan(th)) };
}
function cemberselCiz(ctx: Ctx, v: CografyaVerisi, k: Kutu) {
  const punto = puntoOlc(k), kal = ctx.lineWidth, tip = ayarSec(v, "tip"), h = cemberselHesap(v), veri = ayarMantik(v, "veri");
  const al = ayarSayi(v, "konum") * D2R, cx = k.x + k.w / 2, cy = k.y + k.h / 2;
  ctx.save(); ctx.lineJoin = "round";
  if (tip === "yatay" || tip === "dusey") {
    const R = Math.min(k.w, k.h) * 0.34;
    ctx.save(); ctx.lineWidth = Math.max(1, kal * 0.8); ctx.beginPath(); ctx.arc(cx, cy, R, 0, PI * 2); ctx.stroke(); ctx.restore();
    const B = { x: cx + R * Math.cos(al), y: cy - R * Math.sin(al) };
    const tx = -Math.sin(al), ty = -Math.cos(al), mx = (cx - B.x) / R, my = (cy - B.y) / R; // teğet (ccw) ve merkeze
    if (tip === "dusey") { ctx.save(); ctx.lineWidth = Math.max(1.4, kal); cizgi(ctx, cx, cy, B.x, B.y); ctx.restore(); }
    else if (ayarMantik(v, "rYaz")) { ctx.save(); ctx.lineWidth = Math.max(0.8, kal * 0.55); kesik(ctx, cx, cy, B.x, B.y); ctx.restore(); }
    nokta(ctx, cx, cy, 2.8); kure(ctx, B.x, B.y, 9);
    if (ayarMantik(v, "rYaz")) {
      fizikMetniCiz(ctx, "O", cx - 9, cy + 11, punto * 0.92);
      beyaz(ctx, veri ? `r = ${sayiYaz(h.r)} m` : "r", cx + (B.x - cx) * 0.2 - ty * 14, cy + (B.y - cy) * 0.2 + tx * 14, punto * 0.92);
    }
    if (ayarMantik(v, "vOk")) vektor(ctx, B.x, B.y, tx * 42, ty * 42, veri ? `v = ${sayiYaz(h.v)} m/s` : "vec(v)", punto, kal, 11, [-mx * 10, -my * 10]);
    if (ayarMantik(v, "aOk") && !ayarMantik(v, "fOk")) vektor(ctx, B.x, B.y, mx * 40, my * 40, "vec(a)_m", punto, kal);
    if (ayarMantik(v, "fOk")) {
      if (tip === "yatay") vektor(ctx, B.x, B.y, mx * 44, my * 44, veri ? `F_m = ${sayiYaz(h.Fc)} N` : "vec(F)_m", punto, kal, 11, [0, mx * 0 + 4]);
      else {
        vektor(ctx, B.x + 12, B.y, 0, 30, "m vec(g)", punto, kal, 11, [12, 0]);
        vektor(ctx, B.x - 3, B.y, mx * 32, my * 32, "vec(T)", punto, kal, 11, [-13, 0]);
      }
    }
    if (veri && tip === "dusey") fizikMetniCiz(ctx, `m = ${sayiYaz(h.m)} kg`, B.x + 14, B.y - 14, punto * 0.9, "sol");
  } else if (tip === "konik") {
    const y0 = k.y + 22, Ls = k.h * 0.58, th = ayarSayi(v, "aci") * D2R, M = { x: cx + Ls * Math.sin(th), y: y0 + Ls * Math.cos(th) }, rx = Ls * Math.sin(th);
    ctx.save(); ctx.lineWidth = Math.max(1.8, kal * 1.4); cizgi(ctx, cx - 44, y0, cx + 44, y0); ctx.restore();
    ctx.save(); ctx.lineWidth = Math.max(0.8, kal * 0.55); for (let x = cx - 40; x < cx + 40; x += 8) cizgi(ctx, x, y0, x + 5, y0 - 6); ctx.restore();
    ctx.save(); ctx.lineWidth = Math.max(0.8, kal * 0.55); kesik(ctx, cx, y0, cx, M.y + 26); ctx.setLineDash([4, 3]); ctx.beginPath(); ctx.ellipse(cx, M.y, rx, Math.max(6, rx * 0.26), 0, 0, PI * 2); ctx.stroke(); kesik(ctx, cx, M.y, M.x, M.y); ctx.restore();
    ctx.save(); ctx.lineWidth = Math.max(1.4, kal); cizgi(ctx, cx, y0, M.x, M.y); ctx.restore();
    kure(ctx, M.x, M.y, 9);
    acıYayi(ctx, cx, y0, 34, PI / 2 - th, PI / 2, "θ", punto, kal, 46);
    if (ayarMantik(v, "rYaz")) { beyaz(ctx, veri ? `r = ${sayiYaz(h.r)} m` : "r", (cx + M.x) / 2, M.y + 15, punto * 0.9); fizikMetniCiz(ctx, "L", (cx + M.x) / 2 + 12, (y0 + M.y) / 2 - 6, punto * 0.92, "sol"); }
    if (ayarMantik(v, "fOk")) {
      const ux = (cx - M.x) / Ls, uy = (y0 - M.y) / Ls;
      vektor(ctx, M.x, M.y, ux * 44, uy * 44, "vec(T)", punto, kal);
      vektor(ctx, M.x, M.y, 0, 34, "m vec(g)", punto, kal);
      vektor(ctx, M.x, M.y, -36, 0, "vec(F)_m", punto, kal);
    } else if (ayarMantik(v, "aOk")) vektor(ctx, M.x, M.y, -36, 0, "vec(a)_m", punto, kal);
    if (ayarMantik(v, "vOk")) { ctx.save(); ctx.beginPath(); ctx.arc(M.x + 22, M.y, 5, 0, PI * 2); ctx.fillStyle = "#fff"; ctx.fill(); ctx.stroke(); alanX(ctx, M.x + 22, M.y); ctx.restore(); fizikMetniCiz(ctx, "vec(v)", M.x + 34, M.y - 9, punto * 0.88, "sol"); }
  } else {
    // Eğimli viraj: merkez solda; yol sağa doğru yükselir
    const th = ayarSayi(v, "aci") * D2R, x0 = k.x + 40, x1 = k.x + k.w - 30, yB = k.y + k.h - 40, yT = yB - Math.tan(th) * (x1 - x0), L = Math.hypot(x1 - x0, yB - yT);
    ctx.save(); ctx.lineWidth = Math.max(2, kal * 1.5); cizgi(ctx, x0, yB, x1, yT); ctx.restore();
    ctx.save(); ctx.lineWidth = Math.max(0.8, kal * 0.55); for (let t = 0.04; t < 1; t += 0.05) { const px = x0 + (x1 - x0) * t, py = yB + (yT - yB) * t; cizgi(ctx, px, py, px - 6 * Math.sin(th) - 2, py + 6 * Math.cos(th) + 4); } ctx.restore();
    ctx.save(); ctx.lineWidth = Math.max(0.8, kal * 0.55); kesik(ctx, x0, yB, x1, yB); ctx.restore();
    acıYayi(ctx, x0, yB, 44, -th, 0, "θ", punto, kal, 56);
    const t = 0.58, px = x0 + (x1 - x0) * t, py = yB + (yT - yB) * t, ux = (x1 - x0) / L, uy = (yT - yB) / L, nx = uy, ny = -ux; // n: yüzeyden dışa (yukarı-sol)
    ctx.save(); ctx.translate(px, py); ctx.rotate(-th); ctx.fillStyle = "#cfcfcf"; ctx.fillRect(-24, -26, 48, 22); ctx.strokeRect(-24, -26, 48, 22);
    for (const dx of [-14, 14]) { ctx.beginPath(); ctx.arc(dx, -4, 4.5, 0, PI * 2); ctx.fillStyle = "#fff"; ctx.fill(); ctx.stroke(); }
    ctx.restore();
    const cm = { x: px + nx * 14, y: py + ny * 14 };
    if (ayarMantik(v, "rYaz")) { ctx.save(); ctx.lineWidth = Math.max(0.8, kal * 0.55); kesik(ctx, cm.x, cm.y, k.x + 14, cm.y); ctx.restore(); fizikMetniCiz(ctx, "merkez", k.x + 12, cm.y - 9, punto * 0.88, "sol"); }
    if (ayarMantik(v, "fOk")) {
      vektor(ctx, cm.x, cm.y, 0, 36, "m vec(g)", punto, kal);
      vektor(ctx, cm.x, cm.y, nx * 40, ny * 40, "vec(N)", punto, kal);
    }
    if (ayarMantik(v, "aOk") || ayarMantik(v, "vOk")) vektor(ctx, cm.x, cm.y, -40, 0, ayarMantik(v, "fOk") ? "vec(F)_m" : "vec(a)_m", punto, kal);
    if (veri) fizikMetniCiz(ctx, `θ = ${sayiYaz(ayarSayi(v, "aci"), 0)}°, r = ${sayiYaz(h.r)} m`, k.x + k.w - 8, k.y + 14, punto * 0.92, "sag");
  }
  ctx.restore();
}
function alanX(ctx: Ctx, x: number, y: number) { const s = 3; cizgi(ctx, x - s, y - s, x + s, y + s); cizgi(ctx, x - s, y + s, x + s, y - s); }

// ════════════════════════════════════════════════════════════════════════════
// YÖRÜNGE
// ════════════════════════════════════════════════════════════════════════════
function keplerE(M: number, e: number) { let E = M; for (let i = 0; i < 40; i++) E = M + e * Math.sin(E); return E; }
function yorungeCiz(ctx: Ctx, v: CografyaVerisi, k: Kutu) {
  const punto = puntoOlc(k), kal = ctx.lineWidth, tip = ayarSec(v, "tip"), al = ayarSayi(v, "konum") * D2R, ad = ayarMantik(v, "adlar");
  ctx.save(); ctx.lineJoin = "round";
  const cx = k.x + k.w / 2, cy = k.y + k.h / 2;
  if (tip === "cember") {
    const R = Math.min(k.w, k.h) * 0.34, B = { x: cx + R * Math.cos(al), y: cy - R * Math.sin(al) };
    ctx.save(); ctx.lineWidth = Math.max(1.2, kal); ctx.beginPath(); ctx.arc(cx, cy, R, 0, PI * 2); ctx.stroke(); ctx.restore();
    kure(ctx, cx, cy, 22, "#bdbdbd"); kure(ctx, B.x, B.y, 7.5);
    if (ad) { fizikMetniCiz(ctx, "M", cx, cy, punto); fizikMetniCiz(ctx, "m", B.x + Math.cos(al) * 15, B.y - Math.sin(al) * 15, punto); }
    const mx = (cx - B.x) / R, my = (cy - B.y) / R, tx = -Math.sin(al), ty = -Math.cos(al);
    if (ayarMantik(v, "olcu")) { ctx.save(); ctx.lineWidth = Math.max(0.8, kal * 0.55); kesik(ctx, cx + Math.cos(al) * 22, cy - Math.sin(al) * 22, B.x - Math.cos(al) * 8, B.y + Math.sin(al) * 8); ctx.restore(); beyaz(ctx, "r", cx + (B.x - cx) * 0.45 + ty * 13, cy + (B.y - cy) * 0.45 - tx * 13, punto * 0.95); }
    if (ayarMantik(v, "kuvvet")) vektor(ctx, B.x, B.y, mx * 40, my * 40, "vec(F)_g", punto, kal);
    if (ayarMantik(v, "hizOk")) vektor(ctx, B.x, B.y, tx * 44, ty * 44, "vec(v)", punto, kal);
  } else {
    const e = ayarSayi(v, "e"), a = Math.min(k.w * 0.4, (k.h * 0.42) / Math.sqrt(1 - e * e)), b = a * Math.sqrt(1 - e * e), c = a * e;
    const P = (E: number) => ({ x: cx + a * Math.cos(E), y: cy - b * Math.sin(E) }), F = { x: cx + c, y: cy };
    ctx.save(); ctx.lineWidth = Math.max(1.2, kal); ctx.beginPath(); ctx.ellipse(cx, cy, a, b, 0, 0, PI * 2); ctx.stroke(); ctx.restore();
    if (tip === "kepler") {
      const dM = 0.9;
      const sektor = (M0: number, M1: number, etiket: string) => {
        const pts: { x: number; y: number }[] = []; for (let i = 0; i <= 24; i++) pts.push(P(keplerE(M0 + ((M1 - M0) * i) / 24, e)));
        ctx.save(); ctx.beginPath(); ctx.moveTo(F.x, F.y); for (const p of pts) ctx.lineTo(p.x, p.y); ctx.closePath(); ctx.fillStyle = "#d4d4d4"; ctx.fill(); ctx.lineWidth = Math.max(1, kal * 0.8); ctx.stroke(); ctx.restore();
        const m = pts[12]; if (ad) fizikMetniCiz(ctx, etiket, F.x + (m.x - F.x) * 0.62, F.y + (m.y - F.y) * 0.62 - 11, punto * 0.92);
      };
      sektor(-dM / 2, dM / 2, "A_1"); sektor(PI - dM / 2, PI + dM / 2, "A_2");
      fizikMetniCiz(ctx, "t_1 = t_2  ⇒  A_1 = A_2", cx, k.y + 12, punto * 0.95);
    }
    kure(ctx, F.x, F.y, 10, "#bdbdbd");
    if (ad) fizikMetniCiz(ctx, "M", F.x, F.y, punto * 0.85);
    if (tip === "elips") {
      const B = P(al);
      kure(ctx, B.x, B.y, 6.5); if (ad) fizikMetniCiz(ctx, "m", B.x + Math.cos(al) * 13, B.y - Math.sin(al) * 13, punto);
      const dx = F.x - B.x, dy = F.y - B.y, d = Math.hypot(dx, dy) || 1;
      if (ayarMantik(v, "kuvvet")) vektor(ctx, B.x, B.y, (dx / d) * 36, (dy / d) * 36, "vec(F)", punto, kal);
      if (ayarMantik(v, "hizOk")) { const tx = -a * Math.sin(al), ty = -b * Math.cos(al), tl = Math.hypot(tx, ty); vektor(ctx, B.x, B.y, (tx / tl) * 40, (ty / tl) * 40, "vec(v)", punto, kal); }
    }
    if (ayarMantik(v, "olcu")) {
      const A1 = P(0), A2 = P(PI);
      ctx.save(); ctx.lineWidth = Math.max(0.8, kal * 0.55); kesik(ctx, F.x, F.y, A1.x, A1.y); kesik(ctx, F.x, F.y, A2.x, A2.y); ctx.restore();
      nokta(ctx, A1.x, A1.y, 2.6); nokta(ctx, A2.x, A2.y, 2.6);
      fizikMetniCiz(ctx, "günberi", A1.x + 7, A1.y - 10, punto * 0.88, "sol"); fizikMetniCiz(ctx, "günöte", A2.x - 7, A2.y - 10, punto * 0.88, "sag");
      if (tip !== "kepler") { beyaz(ctx, "r_1", (F.x + A1.x) / 2, F.y + 11, punto * 0.92); beyaz(ctx, "r_2", (F.x + A2.x) / 2, F.y + 11, punto * 0.92); }
    }
  }
  ctx.restore();
}

// ════════════════════════════════════════════════════════════════════════════
// BASİT HARMONİK HAREKET
// ════════════════════════════════════════════════════════════════════════════
export function bhmHesap(v: CografyaVerisi) {
  const m = ayarSayi(v, "m"), ks = ayarSayi(v, "ks"), A = ayarSayi(v, "A") / 100, L = ayarSayi(v, "L");
  const w = Math.sqrt(ks / m), T = (2 * PI) / w, Tsark = 2 * PI * Math.sqrt(L / G);
  return { m, ks, A, L, w, T, f: 1 / T, vMax: A * w, aMax: A * w * w, E: 0.5 * ks * A * A, Tsark };
}
function bhmCiz(ctx: Ctx, v: CografyaVerisi, k: Kutu) {
  const punto = puntoOlc(k), kal = ctx.lineWidth, tip = ayarSec(v, "tip"), etiket = ayarMantik(v, "etiket"), veri = ayarMantik(v, "veri"), h = bhmHesap(v);
  ctx.save(); ctx.lineJoin = "round";
  if (tip === "yay") {
    const wx = k.x + 22, xEq = k.x + k.w * 0.55, Ap = Math.min(k.w * 0.2, 80), bw = 38, bh = 28, satir = (k.h - 34) / 3;
    const y0 = k.y + 34;
    ctx.save(); ctx.lineWidth = Math.max(2, kal * 1.5); cizgi(ctx, wx, y0 - 18, wx, y0 + 3 * satir - 6); ctx.restore();
    ctx.save(); ctx.lineWidth = Math.max(0.8, kal * 0.55); for (let y = y0 - 14; y < y0 + 3 * satir - 8; y += 7) cizgi(ctx, wx, y, wx - 6, y + 6); ctx.restore();
    const yer = [-Ap, 0, Ap];
    yer.forEach((d, i) => {
      const cy = y0 + satir * (i + 0.5) - 6, bx = xEq + d - bw / 2;
      ctx.save(); ctx.lineWidth = Math.max(1.2, kal); yayCiz(ctx, wx, bx, cy, 8 + i * 1, 7); ctx.restore();
      dolgu(ctx, () => ctx.fillRect(bx, cy - bh / 2, bw, bh), "#cfcfcf"); ctx.strokeRect(bx, cy - bh / 2, bw, bh);
      if (etiket) fizikMetniCiz(ctx, "m", bx + bw / 2, cy, punto * 0.9);
    });
    ctx.save(); ctx.lineWidth = Math.max(0.8, kal * 0.55);
    for (const [d, ad] of [[-Ap, "−A"], [0, "0"], [Ap, "+A"]] as const) { kesik(ctx, xEq + d, y0 - 12, xEq + d, y0 + 3 * satir - 10, [3, 3]); if (etiket) fizikMetniCiz(ctx, ad, xEq + d, y0 - 20, punto * 0.95); }
    ctx.restore();
    if (etiket) {
      const c1 = y0 + satir * 0.5 - 6, c2 = y0 + satir * 1.5 - 6, c3 = y0 + satir * 2.5 - 6;
      vektor(ctx, xEq - Ap + bw / 2, c1, 34, 0, "vec(F)", punto, kal); vektor(ctx, xEq + bw / 2, c2, 34, 0, "vec(v)", punto, kal); vektor(ctx, xEq + Ap - 4, c3 - bh / 2 - 9, -34, 0, "vec(F)", punto, kal);
      fizikMetniCiz(ctx, "v = 0", xEq - Ap - bw / 2 - 6, c1 - 18, punto * 0.85, "sag"); fizikMetniCiz(ctx, "v = 0", xEq + Ap + bw / 2 + 6, c3 + 18, punto * 0.85, "sol");
    }
    if (veri) fizikMetniCiz(ctx, `m = ${sayiYaz(h.m)} kg, k = ${sayiYaz(h.ks, 0)} N/m, A = ${sayiYaz(h.A * 100, 0)} cm`, k.x + k.w - 8, k.y + 12, punto * 0.9, "sag");
  } else if (tip === "sarkac") {
    const th = ayarSayi(v, "aci") * D2R, top = k.y + 26, Lp = k.h * 0.62, cx = k.x + k.w / 2, r = 10;
    ctx.save(); ctx.lineWidth = Math.max(1.8, kal * 1.4); cizgi(ctx, cx - 50, top, cx + 50, top); ctx.restore();
    ctx.save(); ctx.lineWidth = Math.max(0.8, kal * 0.55); for (let x = cx - 46; x < cx + 46; x += 8) cizgi(ctx, x, top, x + 5, top - 6); ctx.restore();
    const Pp = (a: number) => ({ x: cx + Lp * Math.sin(a), y: top + Lp * Math.cos(a) });
    ctx.save(); ctx.lineWidth = Math.max(0.8, kal * 0.55); ctx.setLineDash([3, 4]); ctx.beginPath(); ctx.arc(cx, top, Lp, PI / 2 - th, PI / 2 + th); ctx.stroke(); ctx.restore();
    const A = Pp(-th), B = Pp(0), C = Pp(th);
    ctx.save(); ctx.lineWidth = Math.max(1.4, kal); cizgi(ctx, cx, top, A.x, A.y); ctx.restore();
    ctx.save(); ctx.lineWidth = Math.max(0.8, kal * 0.55); kesik(ctx, cx, top, B.x, B.y); kesik(ctx, cx, top, C.x, C.y); ctx.restore();
    kure(ctx, C.x, C.y, r, "#fff"); kure(ctx, B.x, B.y, r, "#fff"); kure(ctx, A.x, A.y, r);
    if (etiket) { fizikMetniCiz(ctx, "A", A.x - 16, A.y + 2, punto); fizikMetniCiz(ctx, "O", B.x, B.y + 21, punto); fizikMetniCiz(ctx, "C", C.x + 16, C.y + 2, punto); acıYayi(ctx, cx, top, 34, PI / 2 - th, PI / 2, "θ", punto, kal, 46); }
    if (veri) fizikMetniCiz(ctx, `L = ${sayiYaz(h.L)} m, θ = ${sayiYaz(ayarSayi(v, "aci"), 0)}°`, k.x + k.w - 8, k.y + 12, punto * 0.9, "sag");
  } else {
    // x–t, v–t, a–t grafiği (2 periyot)
    const tur = ayarSec(v, "grafik"), x0 = k.x + 46, x1 = k.x + k.w - 20, cy = k.y + k.h / 2, hh = (k.h - 70) / 2, NT = 2;
    const f = (t: number) => (tur === "x" ? Math.cos(2 * PI * t) : tur === "v" ? -Math.sin(2 * PI * t) : -Math.cos(2 * PI * t));
    ctx.save(); ctx.lineWidth = Math.max(1.2, kal); ok(ctx, x0 - 8, cy, x1 + 8, cy, 7); ok(ctx, x0, cy + hh + 18, x0, cy - hh - 18, 7); ctx.restore();
    ctx.save(); ctx.lineWidth = Math.max(1.8, kal * 1.4); ctx.beginPath();
    for (let i = 0; i <= 240; i++) { const t = (NT * i) / 240, X = x0 + (t / NT) * (x1 - x0), Y = cy - f(t) * hh; if (i === 0) ctx.moveTo(X, Y); else ctx.lineTo(X, Y); }
    ctx.stroke(); ctx.restore();
    const yAd = tur === "x" ? ["+A", "−A"] : tur === "v" ? ["+Aω", "−Aω"] : ["+Aω²", "−Aω²"];
    ctx.save(); ctx.lineWidth = Math.max(0.8, kal * 0.55);
    for (const s of [1, -1]) { kesik(ctx, x0 - 4, cy - s * hh, x1, cy - s * hh, [2, 3]); fizikMetniCiz(ctx, s > 0 ? yAd[0] : yAd[1], x0 - 8, cy - s * hh, punto * 0.92, "sag"); }
    for (let i = 1; i <= 4; i++) { const X = x0 + (i / 4) * (x1 - x0); cizgi(ctx, X, cy - 3, X, cy + 3); fizikMetniCiz(ctx, i === 4 ? "2T" : i === 2 ? "T" : i % 2 ? `${i}T/2` : "", X, cy + 14, punto * 0.88); }
    ctx.restore();
    fizikMetniCiz(ctx, "t", x1 + 16, cy - 10, punto * 0.95); fizikMetniCiz(ctx, tur === "x" ? "x" : tur === "v" ? "v" : "a", x0 - 10, cy - hh - 20, punto);
    if (ayarMantik(v, "noktalar")) {
      const t4 = [0, 0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];
      for (const t of t4) { const X = x0 + (t / NT) * (x1 - x0), Y = cy - f(t) * hh; if (Math.abs(f(t)) > 0.99 || Math.abs(f(t)) < 0.01) nokta(ctx, X, Y, 2.8); }
    }
  }
  ctx.restore();
}

// ════════════════════════════════════════════════════════════════════════════
// DÖNME DİNAMİĞİ
// ════════════════════════════════════════════════════════════════════════════
export function donmeHesap(v: CografyaVerisi) {
  const m1 = ayarSayi(v, "m1"), m2 = ayarSayi(v, "m2"), M = ayarSayi(v, "M");
  const a = ((m1 - m2) * G) / (m1 + m2 + M / 2), T1 = m1 * (G - a), T2 = m2 * (G + a);
  const kat = { silindir: 0.5, halka: 1, kure: 0.4 }[ayarSec(v, "sekil") as "silindir" | "halka" | "kure"], th = ayarSayi(v, "aci") * D2R;
  const r1 = ayarSayi(v, "r1"), r2 = ayarSayi(v, "r2"), w1 = ayarSayi(v, "w1");
  return { m1, m2, M, a, T1, T2, kat, aTek: (G * Math.sin(th)) / (1 + kat), fs: kat * (G * Math.sin(th)) / (1 + kat), r1, r2, w1, w2: w1 * (r1 / r2) ** 2 };
}
function donmeCiz(ctx: Ctx, v: CografyaVerisi, k: Kutu) {
  const punto = puntoOlc(k), kal = ctx.lineWidth, tip = ayarSec(v, "tip"), h = donmeHesap(v), veri = ayarMantik(v, "veri");
  ctx.save(); ctx.lineJoin = "round";
  if (tip === "makara") {
    const cx = k.x + k.w / 2, y0 = k.y + 24, R = 34, cyp = y0 + 40;
    ctx.save(); ctx.lineWidth = Math.max(1.8, kal * 1.4); cizgi(ctx, cx - 40, y0, cx + 40, y0); ctx.restore();
    ctx.save(); ctx.lineWidth = Math.max(0.8, kal * 0.55); for (let x = cx - 36; x < cx + 36; x += 8) cizgi(ctx, x, y0, x + 5, y0 - 6); cizgi(ctx, cx, y0, cx, cyp); ctx.restore();
    ctx.save(); ctx.beginPath(); ctx.arc(cx, cyp, R, 0, PI * 2); ctx.fillStyle = h.M > 0 ? "#e0e0e0" : "#fff"; ctx.fill(); ctx.lineWidth = Math.max(1.4, kal); ctx.stroke(); ctx.restore();
    if (h.M > 0) fizikMetniCiz(ctx, "M", cx, cyp, punto); else nokta(ctx, cx, cyp, 2.6);
    const agir = h.m1 >= h.m2, d = Math.min(26, Math.abs(h.m1 - h.m2) * 4), baz = k.y + k.h - 78;
    const yl = baz + (agir ? d : -d), yr = baz + (agir ? -d : d), bw = 62, bh = 32;
    ctx.save(); ctx.lineWidth = Math.max(1.2, kal); cizgi(ctx, cx - R, cyp, cx - R, yl); cizgi(ctx, cx + R, cyp, cx + R, yr); ctx.restore();
    for (const [x, y, ad, m] of [[cx - R, yl, "m_1", h.m1], [cx + R, yr, "m_2", h.m2]] as const) {
      dolgu(ctx, () => ctx.fillRect(x - bw / 2, y, bw, bh), "#cfcfcf"); ctx.strokeRect(x - bw / 2, y, bw, bh);
      fizikMetniCiz(ctx, veri ? `${ad} = ${sayiYaz(m, 0)} kg` : ad, x, y + bh / 2, punto * (veri ? 0.86 : 0.95));
    }
    if (ayarMantik(v, "hizOk")) {
      const ys = (agir ? 1 : -1);
      vektor(ctx, cx - R - bw / 2 - 12, yl + bh / 2, 0, ys * 30, "vec(a)", punto, kal);
      vektor(ctx, cx + R + bw / 2 + 12, yr + bh / 2, 0, -ys * 30, "vec(a)", punto, kal);
      donmeOku(ctx, cx, cyp, R - 9, agir, kal);
    }
    if (ayarMantik(v, "kuvvet")) {
      vektor(ctx, cx - R - 12, yl, 0, -28, "vec(T)_1", punto, kal); vektor(ctx, cx + R + 12, yr, 0, -28, "vec(T)_2", punto, kal);
      vektor(ctx, cx - R, yl + bh, 0, 26, "m_1 vec(g)", punto * 0.9, kal); vektor(ctx, cx + R, yr + bh, 0, 26, "m_2 vec(g)", punto * 0.9, kal);
    }
  } else if (tip === "tekerlek") {
    const th = ayarSayi(v, "aci") * D2R, x0 = k.x + 36, x1 = k.x + k.w - 30, yB = k.y + k.h - 36, yT = yB - Math.tan(th) * (x1 - x0), Rw = 32;
    ctx.save(); ctx.lineWidth = Math.max(2, kal * 1.5); cizgi(ctx, x0, yB, x1, yB); cizgi(ctx, x1, yB, x1, yT); cizgi(ctx, x0, yB, x1, yT); ctx.restore();
    acıYayi(ctx, x0, yB, 46, -th, 0, "θ", punto, kal, 58);
    const t = 0.52, ux = Math.cos(th), uy = -Math.sin(th), cpx = x0 + (x1 - x0) * t, cpy = yB + (yT - yB) * t;
    const ox = -Math.sin(th), oy = -Math.cos(th); // yüzeyin dışa normali (yukarı-sol)
    const C = { x: cpx + ox * Rw, y: cpy + oy * Rw };
    ctx.save(); ctx.beginPath(); ctx.arc(C.x, C.y, Rw, 0, PI * 2); ctx.fillStyle = "#e6e6e6"; ctx.fill(); ctx.lineWidth = Math.max(1.4, kal); ctx.stroke(); ctx.restore();
    const sekil = ayarSec(v, "sekil");
    ctx.save(); ctx.lineWidth = Math.max(0.8, kal * 0.55);
    if (sekil === "halka") { ctx.beginPath(); ctx.arc(C.x, C.y, Rw - 5, 0, PI * 2); ctx.fillStyle = "#fff"; ctx.fill(); ctx.stroke(); }
    else if (sekil === "kure") { ctx.beginPath(); ctx.ellipse(C.x, C.y, Rw, 8, 0, 0, PI * 2); ctx.stroke(); cizgi(ctx, C.x, C.y - Rw, C.x, C.y + Rw); }
    else { cizgi(ctx, C.x - Rw, C.y, C.x + Rw, C.y); cizgi(ctx, C.x, C.y - Rw, C.x, C.y + Rw); }
    ctx.restore(); nokta(ctx, C.x, C.y, 2.4);
    if (ayarMantik(v, "hizOk")) {
      vektor(ctx, C.x, C.y, -ux * 44, -uy * 44, "vec(a)", punto, kal);
      donmeOku(ctx, C.x, C.y, Rw * 0.62, false, kal);
    }
    if (ayarMantik(v, "kuvvet")) {
      vektor(ctx, C.x, C.y, 0, 26, "m vec(g)", punto, kal, 11, [16, -4]);
      vektor(ctx, cpx, cpy, ox * (2 * Rw + 16), oy * (2 * Rw + 16), "vec(N)", punto, kal);
      vektor(ctx, cpx, cpy, ux * 34, uy * 34, "vec(f)", punto, kal);
    }
    if (veri) fizikMetniCiz(ctx, `θ = ${sayiYaz(ayarSayi(v, "aci"), 0)}°`, k.x + 10, k.y + 14, punto * 0.92, "sol");
  } else {
    // Açısal momentum korunumu: üstten görünüm, iki panel
    const pw = k.w / 2, yc = k.y + k.h / 2 + 12, px = (r: number) => 14 + r * 24;
    for (let i = 0; i < 2; i++) {
      const cx = k.x + pw * (i + 0.5), r = i === 0 ? h.r1 : h.r2, rp = Math.min(px(r), pw * 0.4), w = i === 0 ? h.w1 : h.w2;
      ctx.save(); ctx.lineWidth = Math.max(1.4, kal); cizgi(ctx, cx - rp, yc, cx + rp, yc); ctx.restore();
      nokta(ctx, cx, yc, 3); kure(ctx, cx - rp, yc, 7.5); kure(ctx, cx + rp, yc, 7.5);
      ctx.save(); ctx.lineWidth = Math.max(0.8, kal * 0.55); ctx.setLineDash([3, 3]); ctx.beginPath(); ctx.arc(cx, yc, rp, 0, PI * 2); ctx.stroke(); ctx.restore();
      donmeOku(ctx, cx, yc, rp * 0.36, true, kal);
      fizikMetniCiz(ctx, i === 0 ? "Önce" : "Sonra", cx, k.y + 14, punto);
      ctx.save(); ctx.lineWidth = Math.max(0.8, kal * 0.55); olcuOku(ctx, cx, yc + 28, cx + rp, yc + 28, 4); ctx.restore();
      fizikMetniCiz(ctx, veri ? `r_${i + 1} = ${sayiYaz(r)} m` : `r_${i + 1}`, cx + rp / 2, yc + 46, punto * 0.92);
      fizikMetniCiz(ctx, i === 0 ? (veri ? `ω_1 = ${sayiYaz(w)} rad/s` : "ω_1") : (veri ? `ω_2 = ${sayiYaz(w)} rad/s` : "ω_2"), cx, k.y + 36, punto * 0.92);
    }
    ctx.save(); ctx.lineWidth = Math.max(1.4, kal); ok(ctx, k.x + pw - 14, yc - 40, k.x + pw + 14, yc - 40, 7); ctx.restore();
    fizikMetniCiz(ctx, "L = Iω sabit", k.x + pw, k.y + k.h - 10, punto * 0.92);
  }
  ctx.restore();
}

// ════════════════════════════════════════════════════════════════════════════
export function dinamikCiz(ctx: Ctx, v: CografyaVerisi, k: Kutu): boolean {
  switch (v.yapi) {
    case "cembersel": cemberselCiz(ctx, v, k); return true;
    case "yorunge": yorungeCiz(ctx, v, k); return true;
    case "basitHarmonik": bhmCiz(ctx, v, k); return true;
    case "donme": donmeCiz(ctx, v, k); return true;
    default: return false;
  }
}
void GRI;

export function dinamikOzet(v: CografyaVerisi): string | null | undefined {
  switch (v.yapi) {
    case "cembersel": {
      const h = cemberselHesap(v), tip = ayarSec(v, "tip");
      const temel = `a_m = v²/r = ${sayiYaz(h.ac, 2)} m/s² · ω = v/r = ${sayiYaz(h.w, 2)} rad/s · T = 2πr/v = ${sayiYaz(h.T, 2)} s · F_m = mv²/r = ${sayiYaz(h.Fc, 2)} N`;
      if (tip === "egimli") return `${temel} · sürtünmesiz ideal viraj hızı: v = √(g·r·tanθ) = ${sayiYaz(h.vViraj, 2)} m/s`;
      if (tip === "konik") return `${temel} · konik sarkaçta tanθ = v²/(g·r) (mg ve T'nin bileşkesi merkezcil kuvvettir)`;
      if (tip === "dusey") return `${temel} · düşey çemberde en üstte T + mg = mv²/r, en altta T − mg = mv²/r`;
      return temel;
    }
    case "yorunge": {
      const tip = ayarSec(v, "tip");
      return tip === "cember" ? "F_g = G·M·m/r² merkezcil kuvvettir: v = √(GM/r), T² ∝ r³ (Kepler 3. yasa)" : tip === "elips" ? "Günberide hız en büyük, günötede en küçük; açısal momentum ve toplam enerji korunur (Kepler 1. ve 2. yasa)" : "Kepler 2. yasa: yarıçap vektörü eşit sürelerde eşit alan tarar: A₁ = A₂, bu yüzden günberide hız daha büyüktür";
    }
    case "basitHarmonik": {
      const h = bhmHesap(v), tip = ayarSec(v, "tip");
      if (tip === "sarkac") return `T = 2π√(L/g) = ${sayiYaz(h.Tsark, 2)} s · f = ${sayiYaz(1 / h.Tsark, 2)} Hz (küçük açılar için, kütleden bağımsız)`;
      return `ω = √(k/m) = ${sayiYaz(h.w, 2)} rad/s · T = 2π√(m/k) = ${sayiYaz(h.T, 2)} s · f = ${sayiYaz(h.f, 2)} Hz · v_max = Aω = ${sayiYaz(h.vMax, 2)} m/s · a_max = Aω² = ${sayiYaz(h.aMax, 2)} m/s² · E = ½kA² = ${sayiYaz(h.E, 3)} J`;
    }
    case "donme": {
      const h = donmeHesap(v), tip = ayarSec(v, "tip");
      if (tip === "makara") return `a = (m₁ − m₂)g / (m₁ + m₂ + M/2) = ${sayiYaz(h.a, 2)} m/s² · T₁ = ${sayiYaz(h.T1, 2)} N · T₂ = ${sayiYaz(h.T2, 2)} N (M > 0 ise T₁ ≠ T₂)`;
      if (tip === "tekerlek") return `a_cm = g·sinθ / (1 + I/mR²) = ${sayiYaz(h.aTek, 2)} m/s² (I/mR² = ${sayiYaz(h.kat, 1)}) · sürtünme kuvveti f = ${sayiYaz(h.fs, 2)} m (kütle başına, yukarı)`;
      return `I₁ω₁ = I₂ω₂, I ∝ r² → ω₂ = ω₁(r₁/r₂)² = ${sayiYaz(h.w2, 2)} rad/s · kinetik enerji artar (içeri çekerken iş yapılır)`;
    }
    default: return undefined;
  }
}
