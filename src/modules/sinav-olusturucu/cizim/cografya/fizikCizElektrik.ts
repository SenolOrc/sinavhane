// Fizik şekilleri – Paket 3: Elektrik ve manyetizma (elektrik alan çizgileri, Coulomb, paralel levha /
// kondansatör, manyetik alanda parçacık, hareketli iletken çubuk, transformatör). Yalnız gri/siyah.
import { fizikMetniCiz, fizikMetniOlcu } from "../fizik";
import { ayarMantik, ayarSayi, ayarSec, type CografyaVerisi } from "./sema";
import { GRI, cizgi, dolgu, kesik, ok, olcuOku, puntoOlc, sayiYaz, type Kutu } from "./fizikYardim";

type Ctx = CanvasRenderingContext2D;
const PI = Math.PI;

function yukDaire(ctx: Ctx, x: number, y: number, r: number, isaret: number, dolguRenk = "#fff") {
  ctx.save(); ctx.beginPath(); ctx.arc(x, y, r, 0, PI * 2); ctx.fillStyle = dolguRenk; ctx.fill(); ctx.stroke();
  ctx.lineWidth = Math.max(1, ctx.lineWidth * 0.8);
  cizgi(ctx, x - r * 0.5, y, x + r * 0.5, y);
  if (isaret > 0) cizgi(ctx, x, y - r * 0.5, x, y + r * 0.5);
  ctx.restore();
}
const yukYazi = (q: number, m = Math.abs(q)) => `${q < 0 ? "−" : "+"}${m === 1 ? "" : m}q`;
/** Alan işaretlerinin üstüne gelen yazılar okunsun diye beyaz zeminli etiket. */
function beyazEtiket(ctx: Ctx, metin: string, x: number, y: number, punto: number, hiza: "orta" | "sol" | "sag" = "orta") {
  const w = fizikMetniOlcu(ctx, metin, punto).w + 4, x0 = hiza === "orta" ? x - w / 2 : hiza === "sol" ? x - 2 : x - w + 2;
  ctx.save(); ctx.fillStyle = "#fff"; ctx.fillRect(x0, y - punto * 0.62, w, punto * 1.24); ctx.restore();
  fizikMetniCiz(ctx, metin, x, y, punto, hiza);
}
function alanIsareti(ctx: Ctx, x: number, y: number, iceri: boolean, s = 3.4) {
  ctx.save(); ctx.lineWidth = Math.max(0.8, ctx.lineWidth * 0.55);
  if (iceri) { cizgi(ctx, x - s, y - s, x + s, y + s); cizgi(ctx, x - s, y + s, x + s, y - s); }
  else { ctx.beginPath(); ctx.arc(x, y, 1.9, 0, PI * 2); ctx.fill(); }
  ctx.restore();
}
function alanIsaretleri(ctx: Ctx, x0: number, y0: number, x1: number, y1: number, iceri: boolean, aralik = 24) {
  const nx = Math.max(1, Math.floor((x1 - x0) / aralik)), ny = Math.max(1, Math.floor((y1 - y0) / aralik));
  const ox = x0 + ((x1 - x0) - (nx - 1) * aralik) / 2, oy = y0 + ((y1 - y0) - (ny - 1) * aralik) / 2;
  for (let i = 0; i < nx; i++) for (let j = 0; j < ny; j++) alanIsareti(ctx, ox + i * aralik, oy + j * aralik, iceri);
}
function direncCiz(ctx: Ctx, x0: number, y0: number, x1: number, y1: number) {
  const L = Math.hypot(x1 - x0, y1 - y0), ux = (x1 - x0) / L, uy = (y1 - y0) / L, nx = -uy, ny = ux;
  const bas = L * 0.2, son = L * 0.8, n = 6;
  cizgi(ctx, x0, y0, x0 + ux * bas, y0 + uy * bas);
  ctx.beginPath(); ctx.moveTo(x0 + ux * bas, y0 + uy * bas);
  for (let i = 0; i < n; i++) { const t = bas + ((son - bas) * (i + 0.5)) / n; ctx.lineTo(x0 + ux * t + nx * 6 * (i % 2 ? 1 : -1), y0 + uy * t + ny * 6 * (i % 2 ? 1 : -1)); }
  ctx.lineTo(x0 + ux * son, y0 + uy * son); ctx.stroke();
  cizgi(ctx, x0 + ux * son, y0 + uy * son, x1, y1);
}

// ════════════════════════════════════════════════════════════════════════════
// ELEKTRİK ALAN ÇİZGİLERİ
// ════════════════════════════════════════════════════════════════════════════
type Yuk = { x: number; y: number; q: number };
function yukleriKur(v: CografyaVerisi, k: Kutu): Yuk[] {
  const tip = ayarSec(v, "tip"), s = ayarSec(v, "isaret") === "+" ? 1 : -1, oran = ayarSayi(v, "oran"), sep = (ayarSayi(v, "ara") / 100) * k.w;
  const cx = k.x + k.w / 2, cy = k.y + k.h / 2;
  if (tip === "tek") return [{ x: cx, y: cy, q: s }];
  return [{ x: cx - sep / 2, y: cy, q: s }, { x: cx + sep / 2, y: cy, q: tip === "dipol" ? -s * oran : s * oran }];
}
function alanVektoru(yukler: Yuk[], px: number, py: number) {
  let ex = 0, ey = 0;
  for (const y of yukler) { const dx = px - y.x, dy = py - y.y, r2 = dx * dx + dy * dy + 1e-6, r = Math.sqrt(r2); ex += (y.q * dx) / (r2 * r); ey += (y.q * dy) / (r2 * r); }
  return { ex, ey };
}
function elektrikAlanCiz(ctx: Ctx, v: CografyaVerisi, k: Kutu) {
  const punto = puntoOlc(k), kal = ctx.lineWidth, yukler = yukleriKur(v, k), cizgiN = ayarSayi(v, "cizgi");
  const kutuIci = (x: number, y: number) => x > k.x + 3 && x < k.x + k.w - 3 && y > k.y + 3 && y < k.y + k.h - 3;
  const R = 8;
  ctx.save(); ctx.lineJoin = "round"; ctx.lineCap = "round";
  const poz = yukler.filter((y) => y.q > 0), neg = yukler.filter((y) => y.q < 0);
  const topPoz = poz.reduce((t, y) => t + y.q, 0), topNeg = neg.reduce((t, y) => t - y.q, 0);
  type Kaynak = { src: Yuk; n: number; ters: number; yay?: [number, number] };
  const isler: Kaynak[] = poz.length ? poz.map((src) => ({ src, n: Math.min(40, Math.round(cizgiN * src.q)), ters: 1 })) : neg.map((src) => ({ src, n: Math.min(40, Math.round(cizgiN * -src.q)), ters: -1 }));
  // Negatif yük pozitiften büyükse: fazla çizgiler sonsuzdan gelir (geriye doğru izlenir, pozitif yükün tersi tarafta başlar)
  if (poz.length && topNeg > topPoz) for (const src of neg) {
    const ekstra = Math.round(cizgiN * -src.q * (1 - topPoz / topNeg));
    const dp = Math.atan2(poz[0].y - src.y, poz[0].x - src.x);
    if (ekstra > 0) isler.push({ src, n: Math.min(30, ekstra), ters: -1, yay: [dp + (110 * PI) / 180, dp + (250 * PI) / 180] });
  }
  ctx.lineWidth = Math.max(1, kal * 0.8);
  for (const { src, n, ters, yay } of isler) {
    for (let i = 0; i < n; i++) {
      const a = yay ? yay[0] + ((yay[1] - yay[0]) * (i + 0.5)) / n : (2 * PI * i) / n;
      let px = src.x + Math.cos(a) * (R + 1), py = src.y + Math.sin(a) * (R + 1);
      const yol: { x: number; y: number }[] = [{ x: px, y: py }];
      for (let adim = 0; adim < 1400; adim++) {
        const e = alanVektoru(yukler, px, py), m = Math.hypot(e.ex, e.ey);
        if (m < 1e-9) break;
        px += ((ters * e.ex) / m) * 2.2; py += ((ters * e.ey) / m) * 2.2;
        if (!kutuIci(px, py)) { yol.push({ x: px, y: py }); break; }
        if (yukler.some((y) => Math.hypot(px - y.x, py - y.y) < R)) break;
        yol.push({ x: px, y: py });
      }
      if (yol.length < 3) continue;
      ctx.beginPath(); ctx.moveTo(yol[0].x, yol[0].y); for (const p of yol) ctx.lineTo(p.x, p.y); ctx.stroke();
      if (ayarMantik(v, "ok")) {
        const j = Math.floor(yol.length * 0.5), p = yol[Math.min(yol.length - 1, j)], p0 = yol[Math.max(0, j - 2)];
        const d = Math.hypot(p.x - p0.x, p.y - p0.y) || 1, ux = ((p.x - p0.x) / d) * ters, uy = ((p.y - p0.y) / d) * ters;
        ctx.save(); ctx.lineWidth = Math.max(1, kal * 0.8);
        const bx = p.x, by = p.y; ok(ctx, bx - ux * 5, by - uy * 5, bx + ux * 3, by + uy * 3, 6); ctx.restore();
      }
    }
  }
  if (ayarMantik(v, "es") && yukler.length === 1) {
    ctx.save(); ctx.lineWidth = Math.max(0.8, kal * 0.55); ctx.setLineDash([4, 3]);
    ctx.beginPath(); ctx.rect(k.x + 3, k.y + 3, k.w - 6, k.h - 6); ctx.clip();
    for (const r of [34, 62, 90]) { ctx.beginPath(); ctx.arc(yukler[0].x, yukler[0].y, r, 0, PI * 2); ctx.stroke(); }
    ctx.restore();
  }
  for (const y of yukler) yukDaire(ctx, y.x, y.y, R, y.q);
  if (ayarMantik(v, "yaz")) for (const y of yukler) fizikMetniCiz(ctx, yukYazi(y.q, yukler.length > 1 ? Math.abs(y.q) : 1), y.x, y.y + R + 11, punto * 0.95);
  if (ayarMantik(v, "test")) {
    const cx = k.x + k.w / 2, sep = (ayarSayi(v, "ara") / 100) * k.w;
    const px = yukler.length === 1 ? cx + 80 : cx + sep * 0.3, py = k.y + k.h * 0.26;
    const e = alanVektoru(yukler, px, py), m = Math.hypot(e.ex, e.ey) || 1, ux = e.ex / m, uy = e.ey / m;
    yukDaire(ctx, px, py, 5.5, 1);
    ctx.save(); ctx.lineWidth = Math.max(1.4, kal * 1.1); ok(ctx, px + ux * 7, py + uy * 7, px + ux * 42, py + uy * 42, 7); ctx.restore();
    fizikMetniCiz(ctx, "P", px - 12, py - 6, punto * 0.92);
    fizikMetniCiz(ctx, "vec(F)", px + ux * 24 + uy * 12, py + uy * 24 - ux * 12, punto * 0.92);
  }
  ctx.restore();
}

// ════════════════════════════════════════════════════════════════════════════
// COULOMB (doğru üzerinde yükler)
// ════════════════════════════════════════════════════════════════════════════
export function coulombHesap(v: CografyaVerisi) {
  const xs = [ayarSayi(v, "x1"), ayarSayi(v, "x2"), ayarSayi(v, "x3")], qs = [ayarSayi(v, "q1"), ayarSayi(v, "q2"), ayarSayi(v, "q3")];
  const t = Number(ayarSec(v, "hedef")) - 1;
  const bilesen: { j: number; f: number }[] = []; // işaretli: + sağa
  for (let j = 0; j < 3; j++) {
    if (j === t || qs[j] === 0 || qs[t] === 0 || xs[j] === xs[t]) continue;
    const r = Math.abs(xs[t] - xs[j]), yon = Math.sign(xs[t] - xs[j]) * Math.sign(qs[j] * qs[t]);
    bilesen.push({ j, f: (yon * Math.abs(qs[j] * qs[t])) / (r * r) });
  }
  return { xs, qs, t, bilesen, net: bilesen.reduce((a, b) => a + b.f, 0) };
}
function coulombCiz(ctx: Ctx, v: CografyaVerisi, k: Kutu) {
  const punto = puntoOlc(k), kal = ctx.lineWidth, h = coulombHesap(v);
  const idx = [0, 1, 2].filter((i) => h.qs[i] !== 0 && !(h.xs[i] === h.xs[h.t] && i !== h.t));
  const gor = idx.length ? idx : [0, 1, 2];
  const mn = Math.min(...gor.map((i) => h.xs[i])), mx = Math.max(...gor.map((i) => h.xs[i]));
  const u = Math.min(46, (k.w - 110) / Math.max(1, mx - mn)), x0 = k.x + (k.w - (mx - mn) * u) / 2, cy = k.y + k.h * 0.46, X = (i: number) => x0 + (h.xs[i] - mn) * u;
  ctx.save(); ctx.lineJoin = "round";
  ctx.save(); ctx.lineWidth = Math.max(0.8, kal * 0.5); cizgi(ctx, k.x + 10, cy, k.x + k.w - 10, cy); ctx.restore();
  for (const i of gor) {
    if (h.qs[i] === 0) continue;
    yukDaire(ctx, X(i), cy, 12, h.qs[i], i === h.t ? "#d9d9d9" : "#fff");
    if (ayarMantik(v, "deger")) fizikMetniCiz(ctx, yukYazi(h.qs[i]), X(i), cy + 25, punto * 0.95); else fizikMetniCiz(ctx, `q_${i + 1}`, X(i), cy + 25, punto * 0.95);
  }
  const maxF = Math.max(0.25, ...h.bilesen.map((b) => Math.abs(b.f)), Math.abs(h.net));
  const pu = Math.min(95 / maxF, 150), tx = X(h.t);
  const uzun = (f: number) => Math.max(14, Math.min(Math.abs(f) * pu, 130));
  if (ayarMantik(v, "bilesen")) h.bilesen.forEach((b, i) => {
    const y = cy - 30 - i * 17, L = uzun(b.f) * Math.sign(b.f);
    ctx.save(); ctx.lineWidth = Math.max(1.3, kal * 1.05); ok(ctx, tx, y, tx + L, y, 7); ctx.restore();
    fizikMetniCiz(ctx, `vec(F)_${b.j + 1}`, tx + L + (L > 0 ? 6 : -6), y, punto * 0.9, L > 0 ? "sol" : "sag");
  });
  if (ayarMantik(v, "net")) {
    const y = cy + 48, L = uzun(h.net) * Math.sign(h.net || 1);
    if (Math.abs(h.net) > 1e-9) { ctx.save(); ctx.lineWidth = Math.max(1.8, kal * 1.4); ok(ctx, tx, y, tx + L, y, 8); ctx.restore(); fizikMetniCiz(ctx, "vec(F)_n", tx + L + (L > 0 ? 6 : -6), y, punto * 0.92, L > 0 ? "sol" : "sag"); }
    else fizikMetniCiz(ctx, "F_n = 0", tx, y, punto * 0.95);
  }
  if (ayarMantik(v, "olcu")) {
    const sirali = [...gor].filter((i) => h.qs[i] !== 0).sort((a, b) => h.xs[a] - h.xs[b]), yd = k.y + k.h - 22;
    ctx.save(); ctx.lineWidth = Math.max(0.8, kal * 0.55);
    for (let i = 0; i + 1 < sirali.length; i++) {
      const a = X(sirali[i]), b = X(sirali[i + 1]), d = h.xs[sirali[i + 1]] - h.xs[sirali[i]];
      if (d <= 0) continue;
      kesik(ctx, a, cy + 38, a, yd + 4, [2, 2]); kesik(ctx, b, cy + 38, b, yd + 4, [2, 2]);
      olcuOku(ctx, a, yd, b, yd, 4); fizikMetniCiz(ctx, d === 1 ? "d" : `${d}d`, (a + b) / 2, yd - 8, punto * 0.92);
    }
    ctx.restore();
  }
  ctx.restore();
}

// ════════════════════════════════════════════════════════════════════════════
// PARALEL LEVHALAR
// ════════════════════════════════════════════════════════════════════════════
function levhaCiz(ctx: Ctx, v: CografyaVerisi, k: Kutu) {
  const punto = puntoOlc(k), kal = ctx.lineWidth, kond = ayarSec(v, "tip") === "kondansator", artı = ayarSec(v, "isaret") === "+";
  const V = ayarSayi(v, "V"), d = ayarSayi(v, "d"), veri = ayarMantik(v, "veri");
  const yu = k.y + 44, ya = k.y + k.h - 44, x0 = k.x + (kond ? 108 : 64), x1 = k.x + k.w - 62, cy = (yu + ya) / 2;
  ctx.save(); ctx.lineJoin = "round";
  ctx.save(); ctx.lineWidth = Math.max(2.2, kal * 1.7); cizgi(ctx, x0, yu, x1, yu); cizgi(ctx, x0, ya, x1, ya); ctx.restore();
  if (ayarMantik(v, "yuk")) for (let x = x0 + 14; x < x1 - 6; x += 24) { fizikMetniCiz(ctx, "+", x, yu - 10, punto); fizikMetniCiz(ctx, "−", x, ya + 10, punto); }
  if (kond) {
    if (ayarMantik(v, "dielektrik")) {
      const sx0 = x0 + (x1 - x0) * 0.22, sx1 = x0 + (x1 - x0) * 0.78;
      ctx.save(); ctx.beginPath(); ctx.rect(sx0, yu + 4, sx1 - sx0, ya - yu - 8); ctx.fillStyle = "#e8e8e8"; ctx.fill(); ctx.lineWidth = Math.max(0.8, kal * 0.55); ctx.stroke(); ctx.restore();
    }
  }
  if (ayarMantik(v, "alan")) {
    ctx.save(); ctx.lineWidth = Math.max(1, kal * 0.8);
    const n = Math.max(3, Math.floor((x1 - x0) / 34));
    for (let i = 0; i < n; i++) { const x = x0 + ((i + 0.5) * (x1 - x0)) / n; ok(ctx, x, yu + 3, x, ya - 3, 6); }
    ctx.restore();
    fizikMetniCiz(ctx, "vec(E)", x1 - 8, yu + 18, punto * 0.92, "sag");
  }
  if (kond && ayarMantik(v, "dielektrik")) {
    const mx = (x0 + x1) / 2;
    dolgu(ctx, () => ctx.fillRect(mx - 30, cy - 8, 60, 16), "#e8e8e8");
    fizikMetniCiz(ctx, "yalıtkan", mx, cy, punto * 0.9);
  }
  // d ölçüsü (sağda)
  const dx = x1 + 14;
  ctx.save(); ctx.lineWidth = Math.max(0.8, kal * 0.55); kesik(ctx, x1, yu, dx + 4, yu, [2, 2]); kesik(ctx, x1, ya, dx + 4, ya, [2, 2]); olcuOku(ctx, dx, yu, dx, ya, 5); ctx.restore();
  fizikMetniCiz(ctx, veri ? `d = ${sayiYaz(d, 0)} cm` : "d", dx + 6, cy, punto * 0.95, "sol");
  if (!kond) {
    // Yüklü parçacık: soldan yatay girer, ters işaretli levhaya doğru sapar
    const yon = artı ? 1 : -1, sx = x0 - 34, gx = x1 - x0, a = ((ya - yu) * 0.34) / (gx * gx);
    const yolY = (x: number) => cy + yon * a * x * x;
    ctx.save(); ctx.lineWidth = Math.max(1.6, kal * 1.2);
    cizgi(ctx, sx, cy, x0, cy);
    ctx.beginPath(); for (let i = 0; i <= 60; i++) { const x = (gx * i) / 60; if (i === 0) ctx.moveTo(x0 + x, yolY(x)); else ctx.lineTo(x0 + x, yolY(x)); } ctx.stroke();
    const egim = 2 * a * gx * yon; ctx.save(); ctx.setLineDash([5, 3]);
    cizgi(ctx, x1, yolY(gx), Math.min(k.x + k.w - 4, x1 + 26), yolY(gx) + egim * Math.min(26, k.x + k.w - 4 - x1)); ctx.restore();
    ctx.restore();
    yukDaire(ctx, sx, cy, 6.5, yon);
    if (ayarMantik(v, "yazi")) {
      ctx.save(); ctx.lineWidth = Math.max(1.3, kal * 1.05); ok(ctx, sx - 28, cy, sx - 9, cy, 6); ctx.restore();
      fizikMetniCiz(ctx, "vec(v)_0", sx - 22, cy - 11, punto * 0.9);
      const xm = gx * 0.5, ym = yolY(xm);
      ctx.save(); ctx.lineWidth = Math.max(1.3, kal * 1.05); ok(ctx, x0 + xm, ym, x0 + xm, ym + yon * 30, 7); ctx.restore();
      fizikMetniCiz(ctx, "vec(F)", x0 + xm + 8, ym + yon * 22, punto * 0.9, "sol");
    }
    if (veri) fizikMetniCiz(ctx, `V = ${sayiYaz(V, 0)} V`, (x0 + x1) / 2, ya + 24, punto * 0.95);
  } else {
    // Üreteç: sol tarafta, uzun çizgi (+) üst levhaya
    const bx = k.x + 76;
    ctx.save(); ctx.lineWidth = Math.max(1.2, kal);
    cizgi(ctx, x0, yu, bx, yu); cizgi(ctx, bx, yu, bx, cy - 9); cizgi(ctx, bx, cy + 9, bx, ya); cizgi(ctx, bx, ya, x0, ya);
    ctx.restore();
    ctx.save(); ctx.lineWidth = Math.max(2.4, kal * 1.8); cizgi(ctx, bx - 12, cy - 9, bx + 12, cy - 9); ctx.restore();
    ctx.save(); ctx.lineWidth = Math.max(2.4, kal * 1.8); cizgi(ctx, bx - 6, cy + 9, bx + 6, cy + 9); ctx.restore();
    fizikMetniCiz(ctx, "+", bx + 18, cy - 14, punto * 0.9); fizikMetniCiz(ctx, "−", bx + 18, cy + 15, punto * 0.9);
    fizikMetniCiz(ctx, veri ? `V = ${sayiYaz(V, 0)} V` : "V", bx - 16, cy, punto * 0.95, "sag");
    fizikMetniCiz(ctx, "A", (x0 + x1) / 2, yu - 25, punto * 0.92);
    if (veri) fizikMetniCiz(ctx, `E = V/d = ${sayiYaz(V / (d / 100), 0)} V/m`, (x0 + x1) / 2, ya + 24, punto * 0.92);
  }
  ctx.restore();
}

// ════════════════════════════════════════════════════════════════════════════
// MANYETİK ALANDA PARÇACIK
// ════════════════════════════════════════════════════════════════════════════
function manyetikCiz(ctx: Ctx, v: CografyaVerisi, k: Kutu) {
  const punto = puntoOlc(k), kal = ctx.lineWidth, tip = ayarSec(v, "tip"), iceri = ayarSec(v, "alan") === "iceri", artı = ayarSec(v, "isaret") === "+";
  const donus = (artı ? 1 : -1) * (iceri ? 1 : -1); // +1: kuvvet ekranda yukarı (giriş yönüne göre)
  const rx0 = k.x + (tip === "secici" ? 40 : k.w * 0.3), rx1 = k.x + k.w - 12, ry0 = k.y + 12, ry1 = k.y + k.h - 12, cy = (ry0 + ry1) / 2;
  ctx.save(); ctx.lineJoin = "round";
  if (tip === "secici") {
    const yu = ry0 + 18, ya = ry1 - 18;
    ctx.save(); ctx.lineWidth = Math.max(2.2, kal * 1.7); cizgi(ctx, rx0, yu, rx1, yu); cizgi(ctx, rx0, ya, rx1, ya); ctx.restore();
    fizikMetniCiz(ctx, "+", rx0 + 12, yu - 9, punto); fizikMetniCiz(ctx, "−", rx0 + 12, ya + 10, punto);
    alanIsaretleri(ctx, rx0 + 28, yu + 8, rx1 - 10, ya - 8, iceri, 30);
    ctx.save(); ctx.lineWidth = Math.max(1.4, kal * 1.1); ok(ctx, rx1 - 90, yu + 5, rx1 - 90, yu + 28, 6); ctx.restore();
    fizikMetniCiz(ctx, "vec(E)", rx1 - 82, yu + 18, punto * 0.9, "sol");
    const px = rx0 + (rx1 - rx0) * 0.4;
    ctx.save(); ctx.lineWidth = Math.max(1.6, kal * 1.2); cizgi(ctx, k.x + 8, cy, rx1 + 0, cy); ctx.restore();
    yukDaire(ctx, px, cy, 7, artı ? 1 : -1);
    if (ayarMantik(v, "vf")) {
      ctx.save(); ctx.lineWidth = Math.max(1.4, kal * 1.1);
      ok(ctx, px + 10, cy, px + 52, cy, 7);
      const fe = artı ? 1 : -1, fb = -fe;
      ok(ctx, px, cy + fe * 10, px, cy + fe * 40, 7); ok(ctx, px - 6, cy + fb * 10, px - 6, cy + fb * 40, 7);
      ctx.restore();
      fizikMetniCiz(ctx, "vec(v)", px + 52, cy - 10, punto * 0.9);
      fizikMetniCiz(ctx, "vec(F)_E", px + 6, cy + fe * 36, punto * 0.85, "sol"); fizikMetniCiz(ctx, "vec(F)_B", px - 12, cy + fb * 36, punto * 0.85, "sag");
    }
    if (ayarMantik(v, "yaz")) fizikMetniCiz(ctx, "vec(B)", rx1 - 8, ya - 14, punto * 0.92, "sag");
    ctx.restore(); return;
  }
  // Alan bölgesi
  if (tip === "sapma") {
    ctx.save(); ctx.lineWidth = Math.max(1, kal * 0.8); ctx.strokeRect(rx0, ry0, rx1 - rx0, ry1 - ry0); ctx.restore();
    alanIsaretleri(ctx, rx0 + 6, ry0 + 6, rx1 - 6, ry1 - 6, iceri);
  } else alanIsaretleri(ctx, k.x + 12, ry0, k.x + k.w - 12, ry1, iceri);
  const R = Math.max(12, (ayarSayi(v, "r") / 100) * ((ry1 - ry0) / 2 - 2)) * (tip === "sapma" ? 1 : 1);
  const C = tip === "sapma" ? { x: rx0, y: cy } : { x: k.x + k.w / 2, y: cy };
  const P = (phi: number) => ({ x: C.x + R * Math.cos(phi), y: C.y + R * Math.sin(phi) });
  const dir = -donus; // φ yönü: donus=+1 → φ azalır
  const phi0 = donus > 0 ? PI / 2 : -PI / 2;
  ctx.save(); ctx.lineWidth = Math.max(1.8, kal * 1.3);
  if (tip === "sapma") {
    const g = P(phi0), c = P(phi0 + PI * dir);
    cizgi(ctx, k.x + 8, g.y, g.x, g.y);
    ctx.beginPath(); ctx.arc(C.x, C.y, R, phi0, phi0 + PI * dir, dir < 0); ctx.stroke();
    cizgi(ctx, c.x, c.y, k.x + 8, c.y);
    if (ayarMantik(v, "vf")) {
      ctx.save(); ctx.lineWidth = Math.max(1.4, kal * 1.1);
      ok(ctx, k.x + 14, g.y, k.x + 52, g.y, 7); ok(ctx, k.x + 52, c.y, k.x + 14, c.y, 7); ctx.restore();
      fizikMetniCiz(ctx, "vec(v)", k.x + 33, g.y + (donus > 0 ? 12 : -12), punto * 0.9);
      const pm = P(0);
      ctx.save(); ctx.lineWidth = Math.max(1.4, kal * 1.1); ok(ctx, pm.x, pm.y, pm.x - 30, pm.y, 7); ctx.restore();
      beyazEtiket(ctx, "vec(F)", pm.x - 16, pm.y + (donus > 0 ? 13 : -13), punto * 0.9);
    }
  } else {
    ctx.beginPath(); ctx.arc(C.x, C.y, R, 0, PI * 2); ctx.stroke();
    if (ayarMantik(v, "vf")) {
      const ph = 0, p = P(ph), vx = -Math.sin(ph) * -dir * -1, vy = Math.cos(ph) * -dir * -1;
      const vd = { x: Math.sin(0) === 0 ? 0 : 0, y: dir > 0 ? 1 : -1 }; void vx; void vy; void vd;
      ctx.save(); ctx.lineWidth = Math.max(1.4, kal * 1.1);
      const sy = dir > 0 ? 1 : -1; // φ artarken (0'da) hız aşağı (ekran y+)
      ok(ctx, p.x, p.y, p.x, p.y + sy * 34, 7);
      const q = P(PI); ok(ctx, q.x, q.y, q.x + 28, q.y, 7);
      ctx.restore();
      beyazEtiket(ctx, "vec(v)", p.x + 8, p.y + sy * 24, punto * 0.9, "sol");
      beyazEtiket(ctx, "vec(F)", q.x + 14, q.y - 12, punto * 0.9);
    }
  }
  ctx.restore();
  if (ayarMantik(v, "merkez")) {
    const phiR = tip === "sapma" ? (donus > 0 ? -PI / 4 : PI / 4) : (-3 * PI) / 4, pp = P(phiR);
    ctx.save(); ctx.beginPath(); ctx.arc(C.x, C.y, 2.8, 0, PI * 2); ctx.fill(); ctx.restore();
    ctx.save(); ctx.lineWidth = Math.max(0.8, kal * 0.55); kesik(ctx, C.x, C.y, pp.x, pp.y); ctx.restore();
    const mx = (C.x + pp.x) / 2, my = (C.y + pp.y) / 2;
    beyazEtiket(ctx, "r", mx + (tip === "sapma" ? 7 : -7), my + (donus > 0 ? -7 : 7) * (tip === "sapma" ? 1 : -1), punto * 0.95);
    fizikMetniCiz(ctx, "O", C.x - 9, C.y + (tip === "sapma" ? (donus > 0 ? 10 : -10) : 11), punto * 0.9);
  }
  if (ayarMantik(v, "yaz")) {
    fizikMetniCiz(ctx, "vec(B)", rx1 - 6, ry0 + 12, punto * 0.95, "sag");
    const gy = P(phi0).y;
    fizikMetniCiz(ctx, artı ? "+q" : "−q", k.x + 20, (tip === "sapma" ? gy : cy) + (tip === "sapma" ? (donus > 0 ? -22 : 22) : -(R + 12)), punto * 0.95);
  }
  ctx.restore();
}

// ════════════════════════════════════════════════════════════════════════════
// İLETKEN ÇUBUK (hareketsel EMK)
// ════════════════════════════════════════════════════════════════════════════
export function cubukHesap(v: CografyaVerisi) {
  const B = ayarSayi(v, "B"), L = ayarSayi(v, "L"), vv = ayarSayi(v, "v"), R = ayarSayi(v, "R");
  const emk = B * L * vv, I = emk / R;
  return { B, L, v: vv, R, emk, I, F: B * I * L, P: emk * I };
}
function cubukCiz(ctx: Ctx, v: CografyaVerisi, k: Kutu) {
  const punto = puntoOlc(k), kal = ctx.lineWidth, iceri = ayarSec(v, "alan") === "iceri", sag = ayarSec(v, "yon") === "sag", h = cubukHesap(v), veri = ayarMantik(v, "veri");
  const yu = k.y + 44, ya = k.y + k.h - 40, xl = k.x + 62, xr = k.x + k.w - 34, xc = xl + (xr - xl) * (sag ? 0.52 : 0.62), cy = (yu + ya) / 2;
  ctx.save(); ctx.lineJoin = "round";
  alanIsaretleri(ctx, xl + 12, yu + 10, xr - 4, ya - 10, iceri, 26);
  ctx.save(); ctx.lineWidth = Math.max(1.6, kal * 1.2);
  cizgi(ctx, xl, yu, xr, yu); cizgi(ctx, xl, ya, xr, ya);
  cizgi(ctx, xl, yu, xl, cy - 24); cizgi(ctx, xl, cy + 24, xl, ya);
  ctx.restore();
  ctx.save(); ctx.lineWidth = Math.max(1.4, kal); direncCiz(ctx, xl, cy - 24, xl, cy + 24); ctx.restore();
  ctx.save(); ctx.lineWidth = Math.max(2.8, kal * 2.1); cizgi(ctx, xc, yu, xc, ya); ctx.restore();
  for (const y of [yu, ya]) { ctx.save(); ctx.beginPath(); ctx.arc(xc, y, 3.2, 0, PI * 2); ctx.fillStyle = "#fff"; ctx.fill(); ctx.stroke(); ctx.restore(); }
  const s = sag ? 1 : -1;
  ctx.save(); ctx.lineWidth = Math.max(1.5, kal * 1.2); ok(ctx, xc + s * 6, cy - 14, xc + s * 46, cy - 14, 8); ctx.restore();
  beyazEtiket(ctx, veri ? `v = ${sayiYaz(h.v)} m/s` : "vec(v)", xc + s * 28, cy - 27, punto * 0.92);
  // L ölçüsü
  const lx = xc + (sag ? -16 : 16);
  ctx.save(); ctx.lineWidth = Math.max(0.8, kal * 0.55); olcuOku(ctx, lx, yu, lx, ya, 5); ctx.restore();
  beyazEtiket(ctx, veri ? `L = ${sayiYaz(h.L)} m` : "L", lx + (sag ? -6 : 6), cy + 3, punto * 0.92, sag ? "sag" : "sol");
  // Akım
  if (ayarMantik(v, "akim")) {
    const ccw = (iceri && sag) || (!iceri && !sag); // saatin tersi: çubukta yukarı, üst rayda sola
    const a = Math.max(1.4, kal * 1.1);
    ctx.save(); ctx.lineWidth = a;
    const mid = (xl + xc) / 2, ym = cy + 40;
    if (ccw) { ok(ctx, mid + 8, yu, mid - 8, yu, 7); ok(ctx, mid - 8, ya, mid + 8, ya, 7); ok(ctx, xl, cy - 36, xl, cy - 28, 7); ok(ctx, xc, cy + 8, xc, cy - 4, 7); ok(ctx, xc, ya - 14, xc, ya - 26, 7); }
    else { ok(ctx, mid - 8, yu, mid + 8, yu, 7); ok(ctx, mid + 8, ya, mid - 8, ya, 7); ok(ctx, xl, cy + 28, xl, cy + 36, 7); ok(ctx, xc, cy - 8, xc, cy + 4, 7); }
    void ym; ctx.restore();
    fizikMetniCiz(ctx, "I", mid, yu - 10, punto * 0.95);
  }
  if (ayarMantik(v, "kuvvet")) {
    ctx.save(); ctx.lineWidth = Math.max(1.5, kal * 1.2); ok(ctx, xc - s * 6, cy + 18, xc - s * 44, cy + 18, 8); ctx.restore();
    beyazEtiket(ctx, "vec(F)_m", xc - s * 26, cy + 32, punto * 0.9);
  }
  fizikMetniCiz(ctx, veri ? `R = ${sayiYaz(h.R)} Ω` : "R", xl - 10, cy, punto * 0.95, "sag");
  fizikMetniCiz(ctx, veri ? `B = ${sayiYaz(h.B)} T` : "vec(B)", xr - 2, k.y + 14, punto * 0.95, "sag");
  ctx.restore();
}

// ════════════════════════════════════════════════════════════════════════════
// TRANSFORMATÖR
// ════════════════════════════════════════════════════════════════════════════
export function trafoHesap(v: CografyaVerisi) {
  const n1 = ayarSayi(v, "n1"), n2 = ayarSayi(v, "n2"), v1 = ayarSayi(v, "v1"), r = ayarSayi(v, "r");
  const v2 = (v1 * n2) / n1, i2 = v2 / r, i1 = (i2 * n2) / n1;
  return { n1, n2, v1, r, v2, i1, i2, p: v2 * i2 };
}
function sargi(ctx: Ctx, xLeg: number, y0: number, y1: number, n: number, sol: boolean) {
  const adim = (y1 - y0) / n;
  ctx.save(); ctx.lineWidth = Math.max(1.4, ctx.lineWidth);
  for (let i = 0; i < n; i++) { const y = y0 + adim * (i + 0.5); ctx.beginPath(); ctx.ellipse(xLeg, y, 17, Math.min(6, adim * 0.62), 0, 0, PI); ctx.stroke(); }
  ctx.restore();
  return { alt: { x: xLeg + (sol ? -17 : 17), y: y1 - adim * 0.5 }, ust: { x: xLeg + (sol ? -17 : 17), y: y0 + adim * 0.5 } };
}
function trafoCiz(ctx: Ctx, v: CografyaVerisi, k: Kutu) {
  const punto = puntoOlc(k), kal = ctx.lineWidth, h = trafoHesap(v), veri = ayarMantik(v, "veri");
  const cx = k.x + k.w / 2, yu = k.y + 38, ya = k.y + k.h - 50, lg = 82, cy = (yu + ya) / 2;
  ctx.save(); ctx.lineJoin = "round";
  // Çekirdek
  dolgu(ctx, () => { ctx.beginPath(); ctx.rect(cx - lg - 10, yu, 2 * lg + 20, ya - yu); ctx.rect(cx - lg + 10, yu + 20, 2 * lg - 20, ya - yu - 40); ctx.fill("evenodd"); }, GRI);
  ctx.save(); ctx.lineWidth = Math.max(1.6, kal * 1.2); ctx.strokeRect(cx - lg - 10, yu, 2 * lg + 20, ya - yu); ctx.strokeRect(cx - lg + 10, yu + 20, 2 * lg - 20, ya - yu - 40); ctx.restore();
  if (ayarMantik(v, "cekirdek")) fizikMetniCiz(ctx, "demir çekirdek", cx, yu + 10, punto * 0.85);
  const gor = (n: number) => Math.max(3, Math.min(10, Math.round((n / Math.max(h.n1, h.n2)) * 9)));
  const L = sargi(ctx, cx - lg, yu + 30, ya - 30, gor(h.n1), true), Rr = sargi(ctx, cx + lg, yu + 30, ya - 30, gor(h.n2), false);
  // Primer devre
  const sx = k.x + 84;
  ctx.save(); ctx.lineWidth = Math.max(1.2, kal);
  cizgi(ctx, L.ust.x, L.ust.y, sx, L.ust.y); cizgi(ctx, sx, L.ust.y, sx, cy - 14); cizgi(ctx, sx, cy + 14, sx, L.alt.y); cizgi(ctx, sx, L.alt.y, L.alt.x, L.alt.y);
  ctx.beginPath(); ctx.arc(sx, cy, 14, 0, PI * 2); ctx.fillStyle = "#fff"; ctx.fill(); ctx.stroke(); ctx.restore();
  fizikMetniCiz(ctx, "~", sx, cy, punto * 1.2);
  // Sekonder devre
  const rx = k.x + k.w - 84;
  ctx.save(); ctx.lineWidth = Math.max(1.2, kal);
  cizgi(ctx, Rr.ust.x, Rr.ust.y, rx, Rr.ust.y); cizgi(ctx, rx, Rr.ust.y, rx, cy - 24); direncCiz(ctx, rx, cy - 24, rx, cy + 24); cizgi(ctx, rx, cy + 24, rx, Rr.alt.y); cizgi(ctx, rx, Rr.alt.y, Rr.alt.x, Rr.alt.y);
  ctx.restore();
  fizikMetniCiz(ctx, veri ? `N_1 = ${sayiYaz(h.n1, 0)}` : "N_1", cx - lg, ya + 16, punto);
  fizikMetniCiz(ctx, veri ? `N_2 = ${sayiYaz(h.n2, 0)}` : "N_2", cx + lg, ya + 16, punto);
  fizikMetniCiz(ctx, veri ? `V_1 = ${sayiYaz(h.v1, 0)} V` : "V_1", sx - 18, cy, punto * 0.95, "sag");
  const sonuc = ayarSec(v, "sonuc");
  fizikMetniCiz(ctx, sonuc === "soru" ? "V_2 = ?" : sonuc === "deger" ? `V_2 = ${sayiYaz(h.v2)} V` : "V_2", rx + 14, cy + 22, punto * 0.95, "sol");
  fizikMetniCiz(ctx, veri ? `R = ${sayiYaz(h.r, 0)} Ω` : "R", rx + 14, cy - 8, punto * 0.92, "sol");
  if (ayarMantik(v, "akim")) {
    ctx.save(); ctx.lineWidth = Math.max(1.3, kal * 1.05);
    ok(ctx, sx + 12, L.ust.y, sx + 40, L.ust.y, 6); ok(ctx, rx - 12, Rr.ust.y, rx - 40, Rr.ust.y, 6); ctx.restore();
    fizikMetniCiz(ctx, "I_1", sx + 26, L.ust.y - 10, punto * 0.92); fizikMetniCiz(ctx, "I_2", rx - 26, Rr.ust.y - 10, punto * 0.92);
  }
  ctx.restore();
}

// ════════════════════════════════════════════════════════════════════════════
export function elektrikCiz(ctx: Ctx, v: CografyaVerisi, k: Kutu): boolean {
  switch (v.yapi) {
    case "elektrikAlan": elektrikAlanCiz(ctx, v, k); return true;
    case "coulomb": coulombCiz(ctx, v, k); return true;
    case "levhaYuk": levhaCiz(ctx, v, k); return true;
    case "manyetikParcacik": manyetikCiz(ctx, v, k); return true;
    case "iletkenCubuk": cubukCiz(ctx, v, k); return true;
    case "transformator": trafoCiz(ctx, v, k); return true;
    default: return false;
  }
}

export function elektrikOzet(v: CografyaVerisi): string | null | undefined {
  switch (v.yapi) {
    case "elektrikAlan": {
      const tip = ayarSec(v, "tip");
      return tip === "tek" ? "Pozitif yükten çıkan, negatif yüke giren çizgiler; çizgiler birbirini kesmez, sık oldukları yerde alan büyüktür" : tip === "dipol" ? `Çizgi sayısı yük büyüklüğüyle orantılı (|q₂|/|q₁| = ${sayiYaz(ayarSayi(v, "oran"), 0)}); büyük yükten daha çok çizgi çıkar` : "Aynı işaretli yükler arasında çizgi yoktur (itme): ortada net alan sıfır noktası bulunur";
    }
    case "coulomb": {
      const h = coulombHesap(v);
      if (!h.bilesen.length) return "Kuvvet hesabı için hedef yükün ve en az bir başka yükün q ≠ 0 olmalı, konumlar farklı olmalı.";
      const p = h.bilesen.map((b) => `F${b.j + 1}→${h.t + 1} = ${sayiYaz(Math.abs(b.f), 3)} (${b.f > 0 ? "sağa" : "sola"})`).join(" · ");
      return `${p} · net = ${sayiYaz(Math.abs(h.net), 3)} k·q²/d² ${Math.abs(h.net) < 1e-9 ? "(denge)" : h.net > 0 ? "(sağa)" : "(sola)"}`;
    }
    case "levhaYuk": {
      const V = ayarSayi(v, "V"), d = ayarSayi(v, "d") / 100;
      return `E = V/d = ${sayiYaz(V / d, 0)} V/m · F = qE (pozitif yük alan yönünde, negatif yük ters yönde sapar)${ayarSec(v, "tip") === "kondansator" ? " · C = Q/V" : ""}`;
    }
    case "manyetikParcacik": return ayarSec(v, "tip") === "secici" ? "Hız seçici: qE = qvB → v = E/B (yük ve kütleden bağımsız)" : "F = qvB merkezcil kuvvettir: r = mv/(qB), T = 2πm/(qB); hız yönü değişir, büyüklüğü değişmez (iş yapmaz)";
    case "iletkenCubuk": {
      const h = cubukHesap(v);
      return `ε = B·L·v = ${sayiYaz(h.emk, 2)} V · I = ε/R = ${sayiYaz(h.I, 2)} A · F = B·I·L = ${sayiYaz(h.F, 2)} N (harekete zıt, Lenz) · güç P = ${sayiYaz(h.P, 2)} W`;
    }
    case "transformator": {
      const h = trafoHesap(v);
      return `V₂/V₁ = N₂/N₁ → V₂ = ${sayiYaz(h.v2)} V · I₂ = V₂/R = ${sayiYaz(h.i2, 2)} A · I₁ = ${sayiYaz(h.i1, 2)} A (P₁ = P₂ = ${sayiYaz(h.p, 1)} W) · ${h.n2 > h.n1 ? "gerilim yükselten" : h.n2 < h.n1 ? "gerilim düşüren" : "gerilim değiştirmeyen"}`;
    }
    default: return undefined;
  }
}
