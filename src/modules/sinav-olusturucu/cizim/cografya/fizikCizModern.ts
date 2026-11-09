// Fizik şekilleri – Paket 6: fotoelektrik olay, I–V grafiği, radyoaktif bozunma, basit makineler.
import { fizikMetniCiz, fizikMetniOlcu } from "../fizik";
import { ayarMantik, ayarMetin, ayarSayi, ayarSec, type CografyaVerisi } from "./sema";
import { cizgi, kesik, ok, olcuOku, puntoOlc, sayiYaz, vecAd, zemin, type Kutu } from "./fizikYardim";

type Ctx = CanvasRenderingContext2D;
const PI = Math.PI;

function beyaz(ctx: Ctx, metin: string, x: number, y: number, punto: number, hiza: "orta" | "sol" | "sag" = "orta") {
  const w = fizikMetniOlcu(ctx, metin, punto).w + 4, x0 = hiza === "orta" ? x - w / 2 : hiza === "sol" ? x - 2 : x - w + 2;
  ctx.save(); ctx.fillStyle = "#fff"; ctx.fillRect(x0, y - punto * 0.62, w, punto * 1.24); ctx.restore();
  fizikMetniCiz(ctx, metin, x, y, punto, hiza);
}
function nokta(ctx: Ctx, x: number, y: number, r: number, renk = "#000") { ctx.save(); ctx.beginPath(); ctx.arc(x, y, r, 0, PI * 2); ctx.fillStyle = renk; ctx.fill(); ctx.restore(); }
const eks = (n: number, o = 1) => sayiYaz(n, o).replace("-", "−");
/** Dalgalı (foton) ok: (x0,y0)→(x1,y1). */
function foton(ctx: Ctx, x0: number, y0: number, x1: number, y1: number) {
  const dx = x1 - x0, dy = y1 - y0, L = Math.hypot(dx, dy), ux = dx / L, uy = dy / L, nx = -uy, ny = ux, bas = 7, son = L - bas * 0.6;
  ctx.beginPath(); ctx.moveTo(x0, y0);
  for (let s = 1; s <= 40; s++) { const t = (s / 40) * son, a = Math.sin((t / 12) * PI * 2) * 2.4; ctx.lineTo(x0 + ux * t + nx * a, y0 + uy * t + ny * a); }
  ctx.stroke(); ok(ctx, x1 - ux * 2, y1 - uy * 2, x1, y1, bas);
}

// ════════════════════════════════════════════════════════════════════════════
// FOTOELEKTRİK
// ════════════════════════════════════════════════════════════════════════════
export function fotoHesap(v: CografyaVerisi) {
  const hf = ayarSayi(v, "hf"), W = ayarSayi(v, "W");
  return { hf, W, Ek: Math.max(0, hf - W), kopar: hf > W + 1e-9, f0: W, W2: ayarSayi(v, "W2") };
}
function fotoCiz(ctx: Ctx, v: CografyaVerisi, k: Kutu) {
  const punto = puntoOlc(k), kal = ctx.lineWidth, h = fotoHesap(v), tip = ayarSec(v, "tip"), veri = ayarMantik(v, "veri");
  ctx.save(); ctx.lineJoin = "round";
  if (tip === "duzenek") {
    const px = k.x + 46, y0 = k.y + 24, y1 = k.y + k.h - 56, n = Math.round(ayarSayi(v, "yogun"));
    ctx.save(); ctx.fillStyle = "#c4c4c4"; ctx.fillRect(px - 16, y0, 16, y1 - y0); ctx.lineWidth = Math.max(1.4, kal * 1.1); ctx.strokeRect(px - 16, y0, 16, y1 - y0); ctx.restore();
    fizikMetniCiz(ctx, "metal", px - 8, y1 + 12, punto * 0.9);
    for (let i = 0; i < n; i++) {
      const yh = y0 + 24 + ((y1 - y0 - 48) * (i + 0.5)) / n;
      ctx.save(); ctx.lineWidth = Math.max(1.2, kal); foton(ctx, px + 170, yh - 46, px + 3, yh - 4); ctx.restore();
      if (h.kopar) {
        const L = 24 + Math.sqrt(h.Ek) * 20;
        ctx.save(); ctx.lineWidth = Math.max(1.2, kal); ok(ctx, px + 4, yh + 8, px + 4 + L, yh + 8, 6); ctx.restore();
        ctx.save(); ctx.beginPath(); ctx.arc(px + 4 + L + 8, yh + 8, 6, 0, PI * 2); ctx.fillStyle = "#fff"; ctx.fill(); ctx.lineWidth = Math.max(1, kal * 0.8); ctx.stroke(); ctx.restore();
        fizikMetniCiz(ctx, "−", px + 4 + L + 8, yh + 8, punto * 0.8);
      }
    }
    fizikMetniCiz(ctx, veri ? `foton: hf = ${eks(h.hf)} eV` : "foton: hf", px + 180, (y0 + y1) / 2 + 20, punto * 0.92, "sol");
    const b = k.y + k.h - 30;
    fizikMetniCiz(ctx, !h.kopar ? (veri ? `hf = ${eks(h.hf)} eV ≤ W = ${eks(h.W)} eV` : "hf ≤ W") : veri ? `W = ${eks(h.W)} eV · E_k = hf − W = ${eks(h.Ek)} eV` : "E_k = hf − W", k.x + k.w / 2, b, punto * 0.92);
    if (!h.kopar) fizikMetniCiz(ctx, "elektron sökülemez", k.x + k.w / 2, b + 16, punto * 0.88);
    else if (veri) fizikMetniCiz(ctx, `elektron başına en büyük kinetik enerji ${eks(h.Ek)} eV`, k.x + k.w / 2, b + 16, punto * 0.85);
  } else if (tip === "enerji") {
    const yAlt = k.y + k.h - 30, yUst = k.y + 24, sc = (yAlt - yUst) / Math.max(h.hf, h.W, 1) ;
    const cx = k.x + k.w * 0.35, bw = 70, yHf = yAlt - h.hf * sc, yW = yAlt - Math.min(h.W, h.hf) * sc;
    ctx.save(); ctx.fillStyle = "#c4c4c4"; ctx.fillRect(cx, yW, bw, yAlt - yW); ctx.restore();
    ctx.save(); ctx.lineWidth = Math.max(1.4, kal * 1.1); ctx.strokeRect(cx, yHf, bw, yAlt - yHf); if (h.kopar) cizgi(ctx, cx, yW, cx + bw, yW); ctx.restore();
    ctx.save(); ctx.lineWidth = Math.max(1, kal * 0.8); ok(ctx, cx - 34, yAlt, cx - 34, yHf, 7); ctx.restore();
    fizikMetniCiz(ctx, veri ? `hf = ${eks(h.hf)}` : "hf", cx - 40, (yAlt + yHf) / 2, punto * 0.92, "sag");
    fizikMetniCiz(ctx, veri ? `W = ${eks(Math.min(h.W, h.hf))}` : "W", cx + bw + 10, (yAlt + yW) / 2, punto * 0.92, "sol");
    if (h.kopar) fizikMetniCiz(ctx, veri ? `E_k = ${eks(h.Ek)}` : "E_k", cx + bw + 10, (yW + yHf) / 2, punto * 0.92, "sol");
    fizikMetniCiz(ctx, "enerji (eV)", cx + bw / 2, yAlt + 14, punto * 0.85);
    if (!h.kopar) fizikMetniCiz(ctx, "hf ≤ W: E_k = 0", cx + bw + 10, yUst + 8, punto * 0.88, "sol");
  } else {
    const L = 42, S = 24, U = 18, A = 26, gx = k.x + L, gw = k.w - L - S, gy = k.y + U, gh = k.h - U - A;
    const W2 = h.W2 > 0 ? h.W2 : 0, xmax = Math.max(h.hf * 1.1, h.W * 2, W2 * 2, 6), wmax = Math.max(h.W, W2), ymin = -wmax, ymax = xmax - Math.min(h.W, W2 || h.W);
    const X = (x: number) => gx + (x / xmax) * gw, Y = (y: number) => gy + gh - ((y - ymin) / (ymax - ymin)) * gh;
    ctx.save(); ctx.lineWidth = Math.max(1, kal * 0.9); ok(ctx, gx, Y(ymin), gx, gy - 8, 6); ok(ctx, gx - 2, Y(0), gx + gw + 8, Y(0), 6); ctx.restore();
    fizikMetniCiz(ctx, "E_k", gx + 6, gy - 8, punto * 0.9, "sol"); fizikMetniCiz(ctx, "f", gx + gw + 14, Y(0), punto * 0.9, "sol");
    const hat = (W: number, kes: boolean) => {
      ctx.save(); ctx.lineWidth = Math.max(1.8, kal * 1.5); if (kes) ctx.setLineDash([6, 3]);
      ctx.beginPath(); ctx.moveTo(X(W), Y(0)); ctx.lineTo(X(xmax), Y(xmax - W)); ctx.stroke(); ctx.restore();
      ctx.save(); ctx.lineWidth = Math.max(0.8, kal * 0.6); kesik(ctx, X(W), Y(0), X(0), Y(-W), [2, 3]); ctx.restore();
      nokta(ctx, X(0), Y(-W), 2.6);
    };
    hat(h.W, false); if (W2 > 0) hat(W2, true);
    beyaz(ctx, veri ? `−W = −${eks(h.W)} eV` : "−W", gx + 6, Y(-h.W) + (W2 > 0 && W2 < h.W ? 0 : 0), punto * 0.85, "sol");
    if (W2 > 0 && Math.abs(W2 - h.W) > 0.6) beyaz(ctx, veri ? `−W₂ = −${eks(W2)} eV` : "−W₂", gx + 6, Y(-W2), punto * 0.85, "sol");
    fizikMetniCiz(ctx, veri ? "f₀" : "f₀", X(h.W), Y(0) + 12, punto * 0.9);
    if (W2 > 0 && Math.abs(W2 - h.W) > 0.6) fizikMetniCiz(ctx, "f₀'", X(W2), Y(0) + 12, punto * 0.9);
    if (h.kopar) {
      ctx.save(); ctx.lineWidth = Math.max(0.7, kal * 0.5); kesik(ctx, X(h.hf), Y(0), X(h.hf), Y(h.Ek), [2, 3]); kesik(ctx, gx, Y(h.Ek), X(h.hf), Y(h.Ek), [2, 3]); ctx.restore();
      nokta(ctx, X(h.hf), Y(h.Ek), 2.8);
      if (veri) beyaz(ctx, `E_k = ${eks(h.Ek)} eV`, gx + 6, Y(h.Ek) - 8, punto * 0.85, "sol");
    }
    fizikMetniCiz(ctx, "eğim = h (Planck sabiti), her metal için aynı", k.x + k.w / 2, k.y + k.h - 8, punto * 0.8);
  }
  ctx.restore();
}

// ════════════════════════════════════════════════════════════════════════════
// FOTOELEKTRİK AKIM–GERİLİM GRAFİĞİ
// ════════════════════════════════════════════════════════════════════════════
function fotoGrafikCiz(ctx: Ctx, v: CografyaVerisi, k: Kutu) {
  const punto = puntoOlc(k), kal = ctx.lineWidth, tip = ayarSec(v, "tip"), veri = ayarMantik(v, "veri");
  const v0 = ayarSayi(v, "v0"), v02 = ayarSayi(v, "v02"), i1 = ayarSayi(v, "i1"), i2 = ayarSayi(v, "i2");
  const vmaxNeg = tip === "frekans" ? Math.max(v0, v02) : v0, Vs = 5, imax = tip === "yogunluk" ? Math.max(i1, i2) : i1;
  const L = 20, S = 46, U = 22, A = 38, gx = k.x + L, gw = k.w - L - S, gy = k.y + U, gh = k.h - U - A;
  const xmin = -(vmaxNeg + 1.5), xmax = Vs + 1.5, X = (x: number) => gx + ((x - xmin) / (xmax - xmin)) * gw, Y = (i: number) => gy + gh - (i / (imax * 1.15)) * gh;
  ctx.save(); ctx.lineJoin = "round";
  ctx.save(); ctx.lineWidth = Math.max(1, kal * 0.9); ok(ctx, gx, Y(0), gx + gw + 10, Y(0), 6); ctx.restore();
  ctx.save(); ctx.lineWidth = Math.max(1, kal * 0.9); ok(ctx, X(0), Y(0), X(0), gy - 8, 6); ctx.restore();
  fizikMetniCiz(ctx, "I (µA)", X(0) + 6, gy - 8, punto * 0.85, "sol"); fizikMetniCiz(ctx, "V", gx + gw + 14, Y(0), punto * 0.9, "sol");
  const egri = (V0: number, Is: number, kes: boolean, kal2: number) => {
    ctx.save(); ctx.lineWidth = kal2; if (kes) ctx.setLineDash([6, 3]); ctx.beginPath();
    for (let s = 0; s <= 60; s++) {
      const V = -V0 + ((Vs + V0) * s) / 60, t = s / 60, I = Is * (3 * t * t - 2 * t * t * t) * (1 - 0) ;
      s ? ctx.lineTo(X(V), Y(I)) : ctx.moveTo(X(V), Y(I));
    }
    ctx.lineTo(X(xmax - 0.2), Y(Is)); ctx.stroke(); ctx.restore();
  };
  const kk = Math.max(1.8, kal * 1.5);
  if (tip === "yogunluk") {
    egri(v0, i1, true, kk); egri(v0, i2, false, kk);
    fizikMetniCiz(ctx, veri ? `I₂ = ${eks(i2, 0)}` : "I₂", X(xmax - 0.2) + 6, Y(i2), punto * 0.85, "sol");
    fizikMetniCiz(ctx, veri ? `I₁ = ${eks(i1, 0)}` : "I₁", X(xmax - 0.2) + 6, Y(i1) + (Math.abs(i1 - i2) < 1 ? 12 : 0), punto * 0.85, "sol");
    fizikMetniCiz(ctx, "aynı frekans: V₀ aynı, doyma akımı şiddetle artar", k.x + k.w / 2, k.y + k.h - 5, punto * 0.78);
  } else {
    egri(v0, i1, true, kk); egri(v02, i1, false, kk);
    fizikMetniCiz(ctx, "f₁", X(-v0) + 4, Y(i1 * 0.35), punto * 0.9, "sol"); fizikMetniCiz(ctx, "f₂", X(-v02) + 4, Y(i1 * 0.35), punto * 0.9, "sol");
    fizikMetniCiz(ctx, "aynı şiddet: doyma akımı aynı, f arttıkça V₀ artar (f₂ > f₁)", k.x + k.w / 2, k.y + k.h - 5, punto * 0.78);
  }
  for (const V of tip === "frekans" ? [v0, v02] : [v0]) {
    nokta(ctx, X(-V), Y(0), 2.8);
    fizikMetniCiz(ctx, veri ? `−${eks(V, 0)}` : tip === "frekans" ? (V === v0 ? "−V₀₁" : "−V₀₂") : "−V₀", X(-V), Y(0) + 12, punto * 0.85);
  }
  ctx.restore();
}

// ════════════════════════════════════════════════════════════════════════════
// RADYOAKTİF BOZUNMA
// ════════════════════════════════════════════════════════════════════════════
export function bozunmaHesap(v: CografyaVerisi) {
  const n = Math.round(ayarSayi(v, "n")), N0 = ayarSayi(v, "N0"), T = ayarSayi(v, "T"), A = Math.round(ayarSayi(v, "A")), Z = Math.round(ayarSayi(v, "Z")), t = ayarSec(v, "bozun");
  const dA = t === "alfa" ? -4 : 0, dZ = t === "alfa" ? -2 : t === "beta" ? 1 : 0;
  return { n, N0, T, kalan: N0 / 2 ** n, bozunan: N0 - N0 / 2 ** n, sure: n * T, bozun: t, A, Z, A2: A + dA, Z2: Z + dZ };
}
function nuklid(ctx: Ctx, x: number, y: number, A: string, Z: string, sembol: string, punto: number) {
  fizikMetniCiz(ctx, sembol, x, y, punto * 1.5);
  fizikMetniCiz(ctx, A, x - punto * 1.0 - 3, y - punto * 0.6, punto * 0.85, "sag");
  fizikMetniCiz(ctx, Z, x - punto * 1.0 - 3, y + punto * 0.6, punto * 0.85, "sag");
}
function bozunmaCiz(ctx: Ctx, v: CografyaVerisi, k: Kutu) {
  const punto = puntoOlc(k), kal = ctx.lineWidth, h = bozunmaHesap(v), tip = ayarSec(v, "tip"), veri = ayarMantik(v, "veri");
  ctx.save(); ctx.lineJoin = "round";
  if (tip === "grafik") {
    const L = 52, S = 26, U = 20, A = 32, gx = k.x + L, gw = k.w - L - S, gy = k.y + U, gh = k.h - U - A, tmax = h.n + 0.6;
    const X = (t: number) => gx + (t / tmax) * gw, Y = (N: number) => gy + gh - (N / h.N0) * gh * 0.95;
    ctx.save(); ctx.lineWidth = Math.max(1, kal * 0.9); ok(ctx, gx, Y(0), gx, gy - 8, 6); ok(ctx, gx - 2, Y(0), gx + gw + 8, Y(0), 6); ctx.restore();
    fizikMetniCiz(ctx, "N", gx + 7, gy - 8, punto * 0.9, "sol"); fizikMetniCiz(ctx, "t", gx + gw + 14, Y(0), punto * 0.9, "sol");
    ctx.save(); ctx.lineWidth = Math.max(1.8, kal * 1.5); ctx.beginPath();
    for (let s = 0; s <= 80; s++) { const t = (s / 80) * tmax; s ? ctx.lineTo(X(t), Y(h.N0 * 2 ** -t)) : ctx.moveTo(X(t), Y(h.N0 * 2 ** -t)); }
    ctx.stroke(); ctx.restore();
    for (let i = 0; i <= h.n; i++) {
      const N = h.N0 / 2 ** i;
      ctx.save(); ctx.lineWidth = Math.max(0.7, kal * 0.5); kesik(ctx, X(i), Y(0), X(i), Y(N), [2, 3]); kesik(ctx, gx, Y(N), X(i), Y(N), [2, 3]); ctx.restore();
      nokta(ctx, X(i), Y(N), 2.8);
      fizikMetniCiz(ctx, i === 0 ? "0" : veri ? `${eks(i * h.T, 0)}` : i === 1 ? "T" : `${i}T`, X(i), Y(0) + 11, punto * 0.85);
      fizikMetniCiz(ctx, veri ? eks(N, N < 10 && N % 1 ? 1 : 0) : i === 0 ? "N₀" : `N₀/${2 ** i}`, gx - 5, Y(N), punto * 0.85, "sag");
    }
    fizikMetniCiz(ctx, veri ? "t (gün)" : "t (yarı ömür)", gx + gw / 2, k.y + k.h - 6, punto * 0.85);
  } else if (tip === "izgara") {
    const panel = h.n + 1, ac = 8, sa = 4, bw = (k.w - 10) / panel, gap = 6, yer = Math.min(14, (bw - gap) / ac), r = Math.max(2.2, yer * 0.36);
    for (let p = 0; p < panel; p++) {
      const bx = k.x + 5 + p * bw + (bw - ac * yer) / 2, by = k.y + k.h * 0.2, kal_ = 32 / 2 ** p;
      ctx.save(); ctx.lineWidth = Math.max(0.7, kal * 0.6);
      for (let q = 0; q < ac * sa; q++) {
        const cx = bx + (q % ac) * yer + yer / 2, cy = by + Math.floor(q / ac) * yer + yer / 2, canli = q < kal_;
        ctx.beginPath(); ctx.arc(cx, cy, r, 0, PI * 2); ctx.fillStyle = canli ? "#555" : "#fff"; ctx.fill(); if (!canli) { ctx.save(); ctx.strokeStyle = "#999"; ctx.stroke(); ctx.restore(); }
      }
      ctx.restore();
      fizikMetniCiz(ctx, p === 0 ? "t = 0" : p === 1 ? "t = T" : `t = ${p}T`, bx + (ac * yer) / 2, by + sa * yer + 14, punto * 0.85);
      fizikMetniCiz(ctx, veri ? `kalan: ${eks(h.N0 / 2 ** p, h.N0 / 2 ** p < 10 && (h.N0 / 2 ** p) % 1 ? 1 : 0)}` : `kalan: N₀/${2 ** p}`, bx + (ac * yer) / 2, by + sa * yer + 28, punto * 0.78);
    }
    fizikMetniCiz(ctx, "koyu: bozunmamış, açık: bozunmuş çekirdek", k.x + k.w / 2, k.y + 12, punto * 0.85);
    if (veri) fizikMetniCiz(ctx, `yarı ömür T = ${eks(h.T, 0)} gün · ${h.n}T = ${eks(h.sure, 0)} gün sonra N = ${eks(h.kalan, 1)}`, k.x + k.w / 2, k.y + k.h - 14, punto * 0.85);
  } else {
    const cy = k.y + k.h * 0.42, x1 = k.x + k.w * 0.16, x2 = k.x + k.w * 0.52, x3 = k.x + k.w * 0.86, sx = ayarMetin(v, "x") || "X", sy = ayarMetin(v, "y") || "Y";
    const nA = (n: number) => (veri ? String(n) : "A"), nZ = (n: number) => (veri ? String(n) : "Z");
    nuklid(ctx, x1, cy, veri ? String(h.A) : "A", veri ? String(h.Z) : "Z", sx, punto);
    ctx.save(); ctx.lineWidth = Math.max(1.6, kal * 1.3); ok(ctx, x1 + 28, cy, x2 - 50, cy, 8); ctx.restore();
    nuklid(ctx, x2, cy, veri ? String(h.A2) : h.bozun === "alfa" ? "A−4" : "A", veri ? String(h.Z2) : h.bozun === "alfa" ? "Z−2" : h.bozun === "beta" ? "Z+1" : "Z", sy + (h.bozun === "gama" ? "*" : ""), punto);
    fizikMetniCiz(ctx, "+", x2 + 42, cy, punto * 1.3);
    if (h.bozun === "alfa") nuklid(ctx, x3, cy, "4", "2", "He", punto);
    else if (h.bozun === "beta") nuklid(ctx, x3, cy, "0", "−1", "e", punto);
    else fizikMetniCiz(ctx, "γ", x3, cy, punto * 1.5);
    void nA; void nZ;
    const ad = h.bozun === "alfa" ? "α bozunması: A 4, Z 2 azalır" : h.bozun === "beta" ? "β bozunması: A aynı, Z 1 artar (n → p + elektron)" : "γ bozunması: A ve Z değişmez, çekirdek uyarılmış halden temel hale geçer";
    fizikMetniCiz(ctx, ad, k.x + k.w / 2, cy + 52, punto * 0.92);
    fizikMetniCiz(ctx, h.bozun === "alfa" ? "ana çekirdek → yavru çekirdek + α (helyum çekirdeği)" : h.bozun === "beta" ? "ana çekirdek → yavru çekirdek + elektron (+ antinötrino)" : "ana çekirdek* → ana çekirdek + γ fotonu", k.x + k.w / 2, cy + 72, punto * 0.8);
  }
  ctx.restore();
}

// ════════════════════════════════════════════════════════════════════════════
// BASİT MAKİNELER
// ════════════════════════════════════════════════════════════════════════════
export function makineHesap(v: CografyaVerisi) {
  const tip = ayarSec(v, "tip"), G = ayarSayi(v, "G"), l1 = ayarSayi(v, "l1"), l2 = ayarSayi(v, "l2"), n = Math.round(ayarSayi(v, "n")), L = ayarSayi(v, "L"), hh = Math.min(ayarSayi(v, "h"), L * 0.95);
  const F = tip === "kaldirac" ? (G * l1) / l2 : tip === "makara" ? G / n : (G * hh) / L;
  return { tip, G, l1, l2, n, L, h: hh, F, kazanc: G / F, yol: tip === "makara" ? n : tip === "egimli" ? L / hh : l2 / l1 };
}
function kutuCiz(ctx: Ctx, x: number, y: number, w: number, h: number, ad: string, punto: number) {
  ctx.save(); ctx.fillStyle = "#d4d4d4"; ctx.fillRect(x - w / 2, y - h, w, h); ctx.strokeRect(x - w / 2, y - h, w, h); ctx.restore();
  fizikMetniCiz(ctx, ad, x, y - h / 2, punto * 0.95);
}
function makineCiz(ctx: Ctx, v: CografyaVerisi, k: Kutu) {
  const punto = puntoOlc(k), kal = ctx.lineWidth, h = makineHesap(v), veri = ayarMantik(v, "veri"), sonuc = ayarMantik(v, "sonuc");
  ctx.save(); ctx.lineJoin = "round"; ctx.lineWidth = Math.max(1.4, kal * 1.1);
  const Gad = veri ? `G = ${eks(h.G, 0)} N` : "G", Fad = sonuc ? `F = ${eks(h.F, 1)} N` : "F";
  if (h.tip === "kaldirac") {
    const x0 = k.x + 30, x1 = k.x + k.w - 30, tot = h.l1 + h.l2, u = (x1 - x0) / tot, yB = k.y + k.h * 0.55, fx = x0 + h.l1 * u;
    ctx.save(); ctx.lineWidth = Math.max(3, kal * 2.4); cizgi(ctx, x0, yB, x1, yB); ctx.restore();
    ctx.beginPath(); ctx.moveTo(fx, yB + 1); ctx.lineTo(fx - 12, yB + 30); ctx.lineTo(fx + 12, yB + 30); ctx.closePath(); ctx.fillStyle = "#c4c4c4"; ctx.fill(); ctx.stroke();
    zemin(ctx, fx - 30, fx + 30, yB + 30, 6);
    kutuCiz(ctx, x0 + 10, yB - 2, 26, 22, "G", punto);
    // yük aşağı ağırlık oku
    ctx.save(); ctx.lineWidth = Math.max(1.5, kal * 1.2); ok(ctx, x0 + 10, yB + 2, x0 + 10, yB + 28, 7); ctx.restore();
    fizikMetniCiz(ctx, Gad, x0 + 10, yB + 42, punto * 0.9);
    ctx.save(); ctx.lineWidth = Math.max(1.5, kal * 1.2); ok(ctx, x1 - 4, yB - 40, x1 - 4, yB - 2, 8); ctx.restore();
    fizikMetniCiz(ctx, Fad, x1 - 4, yB - 50, punto * 0.95);
    fizikMetniCiz(ctx, "O", fx, yB + 44, punto * 0.9);
    const dy = yB + 62;
    ctx.save(); ctx.lineWidth = Math.max(0.8, kal * 0.6); olcuOku(ctx, x0, dy, fx, dy, 5); olcuOku(ctx, fx, dy, x1, dy, 5); ctx.restore();
    fizikMetniCiz(ctx, veri ? `l_1 = ${eks(h.l1, 0)} m` : "l_1", (x0 + fx) / 2, dy + 12, punto * 0.85);
    fizikMetniCiz(ctx, veri ? `l_2 = ${eks(h.l2, 0)} m` : "l_2", (fx + x1) / 2, dy + 12, punto * 0.85);
  } else if (h.tip === "makara") {
    const tavan = k.y + 14, kutuY = k.y + k.h - 52, cx = k.x + k.w * 0.42, ar = 24, n = h.n, blokW = Math.max(46, n * 22 + 14), blokY = k.y + k.h * 0.52;
    zemin(ctx, k.x + 20, k.x + k.w - 20, tavan, -7);
    const xs = Array.from({ length: n }, (_, i) => cx - blokW / 2 + 10 + ((blokW - 20) * (n === 1 ? 0.5 : i / (n - 1))));
    ctx.save(); ctx.fillStyle = "#e0e0e0"; ctx.fillRect(cx - blokW / 2, blokY, blokW, 14); ctx.strokeRect(cx - blokW / 2, blokY, blokW, 14); ctx.restore();
    for (let i = 0; i < n; i++) {
      const sonCubuk = i === n - 1;
      cizgi(ctx, xs[i], blokY, xs[i], sonCubuk ? tavan + 14 : tavan);
    }
    const fx = xs[n - 1];
    ctx.save(); ctx.beginPath(); ctx.arc(fx + 9, tavan + 14, 9, PI, 0); ctx.stroke(); ctx.restore();
    // son ip: çıkış makarasından aşağı
    cizgi(ctx, fx + 18, tavan + 14, fx + 18, blokY - 12 + 0);
    ctx.save(); ctx.lineWidth = Math.max(1.5, kal * 1.2); ok(ctx, fx + 18, blokY - 24, fx + 18, blokY + 20, 8); ctx.restore();
    fizikMetniCiz(ctx, Fad, fx + 26, blokY + 8, punto * 0.95, "sol");
    cizgi(ctx, cx, blokY + 14, cx, kutuY - 22);
    kutuCiz(ctx, cx, kutuY, 36, 22, "G", punto);
    fizikMetniCiz(ctx, Gad, cx + 26, kutuY - 11, punto * 0.9, "sol");
    fizikMetniCiz(ctx, `${n} ip yükü taşır: F = G/${n}`, k.x + k.w / 2, k.y + k.h - 12, punto * 0.88);
    void ar;
  } else {
    const L0 = h.L, H0 = h.h, b0 = Math.sqrt(L0 * L0 - H0 * H0), pay = 34, sc = Math.min((k.w - pay * 2) / b0, (k.h - pay * 2 - 22) / H0), bx0 = k.x + pay, by0 = k.y + k.h - pay - 10;
    const bx1 = bx0 + b0 * sc, ty = by0 - H0 * sc;
    ctx.save(); ctx.fillStyle = "#e4e4e4"; ctx.beginPath(); ctx.moveTo(bx0, by0); ctx.lineTo(bx1, by0); ctx.lineTo(bx1, ty); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.restore();
    // eğik düzlem sağ üstte yüksek: sol altta başlayıp sağ üste çıkar
    const th = Math.atan2(H0, b0), ux = Math.cos(th), uy = -Math.sin(th), t = 0.5;
    const cx = bx0 + (bx1 - bx0) * t, cy = by0 + (ty - by0) * t;
    ctx.save(); ctx.translate(cx, cy); ctx.rotate(-th); ctx.fillStyle = "#c4c4c4"; ctx.fillRect(-14, -22, 28, 22); ctx.strokeRect(-14, -22, 28, 22); ctx.restore();
    const mx = cx + (-uy) * 0 + (uy * 0), my = cy - 11;
    void mx;
    const nx = -Math.sin(th) * 0, gX = cx - Math.sin(th) * 11 * 0;
    void nx; void gX;
    const kx = cx + uy * 11 * -1 * 0, ky = my;
    void kx;
    ctx.save(); ctx.lineWidth = Math.max(1.5, kal * 1.2); ok(ctx, cx - Math.sin(th) * 11, cy - Math.cos(th) * 11, cx - Math.sin(th) * 11, cy - Math.cos(th) * 11 + 38, 7); ctx.restore();
    fizikMetniCiz(ctx, Gad, cx - Math.sin(th) * 11 - 4, cy - Math.cos(th) * 11 + 52, punto * 0.88);
    ctx.save(); ctx.lineWidth = Math.max(1.5, kal * 1.2); ok(ctx, cx + ux * 14 - Math.sin(th) * 11, cy + uy * 14 - Math.cos(th) * 11, cx + ux * 52 - Math.sin(th) * 11, cy + uy * 52 - Math.cos(th) * 11, 7); ctx.restore();
    beyaz(ctx, Fad, cx + ux * 62 - Math.sin(th) * 11 + 8, cy + uy * 62 - Math.cos(th) * 11 - 8, punto * 0.92, "sol");
    void ky;
    ctx.save(); ctx.lineWidth = Math.max(0.8, kal * 0.6); olcuOku(ctx, bx1 + 14, by0, bx1 + 14, ty, 5); ctx.restore();
    fizikMetniCiz(ctx, veri ? `h = ${eks(H0, 0)} m` : "h", bx1 + 20, (by0 + ty) / 2, punto * 0.88, "sol");
    fizikMetniCiz(ctx, veri ? `L = ${eks(L0, 0)} m` : "L", (bx0 + bx1) / 2 + Math.sin(th) * 30 + 6, (by0 + ty) / 2 + Math.cos(th) * 30, punto * 0.88);
    fizikMetniCiz(ctx, "F = G·h/L", k.x + k.w / 2, k.y + k.h - 8, punto * 0.88);
  }
  ctx.restore();
}

export function modernCiz(ctx: Ctx, v: CografyaVerisi, k: Kutu): boolean {
  switch (v.yapi) {
    case "fotoelektrik": fotoCiz(ctx, v, k); return true;
    case "fotoGrafik": fotoGrafikCiz(ctx, v, k); return true;
    case "bozunma": bozunmaCiz(ctx, v, k); return true;
    case "basitMakine": makineCiz(ctx, v, k); return true;
    default: return false;
  }
}

export function modernOzet(v: CografyaVerisi): string | null | undefined {
  switch (v.yapi) {
    case "fotoelektrik": {
      const h = fotoHesap(v);
      return h.kopar ? `hf = W + E_k → E_k = ${eks(h.hf)} − ${eks(h.W)} = ${eks(h.Ek)} eV · eşik frekansı f₀ = W/h (frekans eşikten küçükse ışık şiddeti artsa da elektron sökülmez)` : `hf = ${eks(h.hf)} eV ≤ W = ${eks(h.W)} eV: foton enerjisi bağlanma enerjisini yenemez, elektron sökülmez (şiddet artırılsa da)`;
    }
    case "fotoGrafik": return ayarSec(v, "tip") === "yogunluk" ? "Işık şiddeti artınca birim zamanda sökülen elektron artar: doyma akımı büyür, kesme gerilimi (V₀ = E_k,maks/e) değişmez." : "Frekans artınca elektronların E_k,maks değeri artar: kesme gerilimi büyür; şiddet aynıysa doyma akımı değişmez.";
    case "bozunma": {
      const h = bozunmaHesap(v);
      if (ayarSec(v, "tip") === "tepkime") return h.bozun === "alfa" ? `α bozunması: (A, Z) → (A − 4, Z − 2) = (${h.A2}, ${h.Z2}) + α (He çekirdeği)` : h.bozun === "beta" ? `β bozunması: (A, Z) → (A, Z + 1) = (${h.A2}, ${h.Z2}) + elektron · kütle numarası ve yük korunur` : "γ bozunması: A ve Z değişmez, çekirdek fazla enerjisini foton olarak yayar";
      return `N = N₀/2ⁿ: ${h.n} yarı ömür (${eks(h.sure, 0)} gün) sonra ${eks(h.kalan, h.kalan % 1 ? 1 : 0)} çekirdek kalır, ${eks(h.bozunan, 1)} çekirdek bozunmuştur`;
    }
    case "basitMakine": {
      const h = makineHesap(v);
      return h.tip === "kaldirac" ? `Kaldıraç dengesi: F·l₂ = G·l₁ → F = ${eks(h.F, 1)} N (kuvvet kazancı ${eks(h.kazanc, 2)}); iş kazancı yoktur` : h.tip === "makara" ? `İdeal makara sisteminde F = G/n = ${eks(h.F, 1)} N, ip n = ${h.n} kat fazla çekilir; iş kazancı yoktur` : `Sürtünmesiz eğik düzlemde F = G·h/L = ${eks(h.F, 1)} N, yol L/h = ${eks(h.yol, 2)} kat uzar; iş kazancı yoktur`;
    }
    default: return undefined;
  }
}
void vecAd;
