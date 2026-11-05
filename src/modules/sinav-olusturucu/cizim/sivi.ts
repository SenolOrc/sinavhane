// Sıvı kapları: bölmeli sıvı basıncı kabı, kaldırma kuvveti kabı (yüzen X, askıda Y,
// batan Z) ve karışmayan iki sıvılı U borusu.
//
// FİZİK:
// - U borusu: ağır sıvı (d1) altta; hafif sıvı (d2) sağ kola eklenir. İki sıvının
//   ara yüzeyinden geçen yatay düzlemde basınçlar eşit: d1·h1 = d2·h2 (h1: sol koldaki
//   ağır sıvının bu düzlemden yüksekliği, h2: hafif sıvı sütunu). `otomatik` açıksa
//   h2 = d1·h1/d2 hesaplanır; yükseklikler aynı ölçekle çizilir (oran korunur).
// - Kaldırma kuvveti: eşit hacimli üç cisim. Yüzen X: Fk = G, batan hacim oranı =
//   dX/ds. Askıda Y: Fk = G (dY = ds). Batan Z: G = (dZ/ds)·Fk, tabandan N = G − Fk.
//   Oklar büyüklükle orantılı.

import type { Sekil, SiviVerisi } from "./tipler";
import { MUREKKEP } from "./sabitler";
import { fizikMetniCiz } from "./fizik";

type FizikSekli = Extract<Sekil, { tur: "fizik" }>;
type BolmeliVeri = Extract<SiviVerisi, { tur: "bolmeli" }>;
type KaldirmaVeri = Extract<SiviVerisi, { tur: "kaldirma" }>;
type UBorusuVeri = Extract<SiviVerisi, { tur: "uBorusu" }>;

export const SIVI_AGIR = "#9fb6cc";
export const SIVI_HAFIF = "#dce8f4";

export const varsayilanSivi = (tur: SiviVerisi["tur"] = "uBorusu"): SiviVerisi => {
  if (tur === "bolmeli") return { tur, satir: 4, sutun: 5, dolu: [10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 5, 6], engel: [7, 8], musluk: { taraf: "sag", konum: 3 }, noktalar: [{ hucre: 15, ad: "K" }, { hucre: 6, ad: "L" }] };
  if (tur === "kaldirma") return { tur, seviye: 0.7, xBatma: 0.5, zOran: 2, adlar: ["X", "Y", "Z"], kuvvet: false };
  return { tur: "uBorusu", d1: 3, d2: 1, h1: 2, h2: 6, otomatik: true };
};

/** U borusunda gösterilecek h2: otomatikse denge koşulundan. */
export function uBorusuH2(v: UBorusuVeri): number {
  return v.otomatik ? (v.d1 * v.h1) / v.d2 : v.h2;
}

export function uBorusuDengede(v: UBorusuVeri): boolean {
  return Math.abs(v.d1 * v.h1 - v.d2 * uBorusuH2(v)) < 1e-6 * Math.max(1, v.d1 * v.h1);
}

export function siviVerisiGecerliMi(v: unknown): v is SiviVerisi {
  if (!v || typeof v !== "object") return false;
  const o = v as Record<string, unknown>;
  const sayi = (x: unknown, a: number, b: number) => typeof x === "number" && Number.isFinite(x) && x >= a && x <= b;
  const tam = (x: unknown, a: number, b: number) => sayi(x, a, b) && Number.isInteger(x);
  if (o.tur === "bolmeli") {
    if (!tam(o.satir, 1, 12) || !tam(o.sutun, 1, 12)) return false;
    const n = (o.satir as number) * (o.sutun as number);
    const liste = (x: unknown) => Array.isArray(x) && x.length <= n && x.every((i) => tam(i, 0, n - 1));
    if (!liste(o.dolu) || !liste(o.engel)) return false;
    if (o.musluk !== undefined) {
      const m = o.musluk as Record<string, unknown> | null;
      if (!m || !["sol", "sag", "alt"].includes(String(m.taraf)) || !tam(m.konum, 0, 11)) return false;
    }
    if (o.noktalar !== undefined) {
      if (!Array.isArray(o.noktalar) || o.noktalar.length > 12) return false;
      if (!o.noktalar.every((p) => !!p && typeof p === "object" && tam((p as Record<string, unknown>).hucre, 0, n - 1) && typeof (p as Record<string, unknown>).ad === "string" && ((p as Record<string, unknown>).ad as string).length <= 8)) return false;
    }
    return true;
  }
  if (o.tur === "kaldirma") {
    return sayi(o.seviye, 0.3, 0.95) && sayi(o.xBatma, 0.1, 0.9) && sayi(o.zOran, 1.05, 5) && typeof o.kuvvet === "boolean" &&
      Array.isArray(o.adlar) && o.adlar.length === 3 && o.adlar.every((a) => typeof a === "string" && a.length <= 8);
  }
  if (o.tur === "uBorusu") {
    return sayi(o.d1, 0.1, 30) && sayi(o.d2, 0.1, 30) && sayi(o.h1, 0.1, 100) && sayi(o.h2, 0.1, 300) && typeof o.otomatik === "boolean";
  }
  return false;
}

const sayiYaz = (n: number) => String(Math.round(n * 100) / 100).replace(".", ",");

function cizgi(ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number) {
  ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
}

function okBasi(ctx: CanvasRenderingContext2D, x: number, y: number, aci: number, boy: number) {
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x - boy * Math.cos(aci - 0.4), y - boy * Math.sin(aci - 0.4));
  ctx.lineTo(x - boy * Math.cos(aci + 0.4), y - boy * Math.sin(aci + 0.4));
  ctx.closePath();
  ctx.fill();
}

/** Düşey dolu ok (y1 → y2). */
function dikeyOk(ctx: CanvasRenderingContext2D, x: number, y1: number, y2: number) {
  if (Math.abs(y2 - y1) < 2) return;
  const yon = Math.sign(y2 - y1);
  ctx.save();
  ctx.lineWidth = Math.max(1.6, ctx.lineWidth);
  cizgi(ctx, x, y1, x, y2 - yon * 7);
  okBasi(ctx, x, y2, yon > 0 ? Math.PI / 2 : -Math.PI / 2, 10);
  ctx.restore();
}

/** Ölçü oku (iki uçlu) + etiket. */
function olcuOku(ctx: CanvasRenderingContext2D, x: number, y1: number, y2: number, etiket: string, taraf: "sol" | "sag") {
  ctx.save();
  ctx.lineWidth = 1;
  cizgi(ctx, x, y1 + 5, x, y2 - 5);
  okBasi(ctx, x, y1, -Math.PI / 2, 7);
  okBasi(ctx, x, y2, Math.PI / 2, 7);
  cizgi(ctx, x - 5, y1, x + 5, y1);
  cizgi(ctx, x - 5, y2, x + 5, y2);
  ctx.restore();
  fizikMetniCiz(ctx, etiket, taraf === "sol" ? x - 6 : x + 6, (y1 + y2) / 2, 15, taraf === "sol" ? "sag" : "sol");
}

// ── Bölmeli kap ────────────────────────────────────────────────────────────

export function bolmeliYerlesim(s: { x: number; y: number; w: number; h: number }, v: BolmeliVeri) {
  const hucre = Math.min(s.w / v.sutun, s.h / v.satir);
  const x0 = s.x + (s.w - hucre * v.sutun) / 2;
  const y0 = s.y + (s.h - hucre * v.satir) / 2;
  return { hucre, x0, y0 };
}

function bolmeliCiz(ctx: CanvasRenderingContext2D, s: FizikSekli, v: BolmeliVeri) {
  const { hucre, x0, y0 } = bolmeliYerlesim(s, v);
  const W = hucre * v.sutun, H = hucre * v.satir;
  const hucreXY = (i: number) => ({ cx: x0 + (i % v.sutun) * hucre, cy: y0 + Math.floor(i / v.sutun) * hucre });
  ctx.fillStyle = SIVI_HAFIF;
  for (const i of new Set(v.dolu)) { const { cx, cy } = hucreXY(i); ctx.fillRect(cx, cy, hucre, hucre); }
  // Engel: taralı bölme
  for (const i of new Set(v.engel)) {
    const { cx, cy } = hucreXY(i);
    ctx.save();
    ctx.fillStyle = "#ffffff"; ctx.fillRect(cx, cy, hucre, hucre);
    ctx.beginPath(); ctx.rect(cx, cy, hucre, hucre); ctx.clip();
    ctx.lineWidth = 1; ctx.strokeStyle = MUREKKEP;
    for (let d = -hucre; d < hucre * 2; d += 7) cizgi(ctx, cx + d, cy + hucre, cx + d + hucre, cy);
    ctx.restore();
  }
  ctx.fillStyle = MUREKKEP;
  // Izgara (ince, gri) ve dış çerçeve (kalın)
  ctx.save();
  ctx.strokeStyle = "#8b97a6"; ctx.lineWidth = 0.8;
  for (let c = 1; c < v.sutun; c += 1) cizgi(ctx, x0 + c * hucre, y0, x0 + c * hucre, y0 + H);
  for (let r = 1; r < v.satir; r += 1) cizgi(ctx, x0, y0 + r * hucre, x0 + W, y0 + r * hucre);
  ctx.restore();
  ctx.save();
  ctx.lineWidth = Math.max(2, ctx.lineWidth * 1.4);
  ctx.strokeRect(x0, y0, W, H);
  ctx.restore();
  // Musluk: kenar ortasından dışarı boru + vana (kelebek simgesi)
  if (v.musluk) {
    const m = v.musluk;
    const boy = Math.max(18, hucre * 0.7), kal = Math.max(5, hucre * 0.16);
    let px: number, py: number, yatay: boolean, yon: number;
    if (m.taraf === "alt") { const c = Math.min(v.sutun - 1, m.konum); px = x0 + (c + 0.5) * hucre; py = y0 + H; yatay = false; yon = 1; }
    else { const r = Math.min(v.satir - 1, m.konum); py = y0 + (r + 0.5) * hucre; px = m.taraf === "sol" ? x0 : x0 + W; yatay = true; yon = m.taraf === "sol" ? -1 : 1; }
    ctx.save();
    ctx.fillStyle = "#ffffff";
    if (yatay) {
      ctx.fillRect(Math.min(px, px + yon * boy), py - kal / 2, boy, kal);
      ctx.strokeRect(Math.min(px, px + yon * boy), py - kal / 2, boy, kal);
      const vx = px + yon * boy * 0.55;
      ctx.beginPath(); ctx.moveTo(vx - 5, py - kal); ctx.lineTo(vx + 5, py + kal); ctx.lineTo(vx + 5, py - kal); ctx.lineTo(vx - 5, py + kal); ctx.closePath(); ctx.stroke();
      cizgi(ctx, vx, py - kal, vx, py - kal - 7); cizgi(ctx, vx - 5, py - kal - 7, vx + 5, py - kal - 7);
    } else {
      ctx.fillRect(px - kal / 2, py, kal, boy);
      ctx.strokeRect(px - kal / 2, py, kal, boy);
      const vy = py + boy * 0.55;
      ctx.beginPath(); ctx.moveTo(px - kal, vy - 5); ctx.lineTo(px + kal, vy + 5); ctx.lineTo(px - kal, vy + 5); ctx.lineTo(px + kal, vy - 5); ctx.closePath(); ctx.stroke();
      cizgi(ctx, px + kal, vy, px + kal + 7, vy); cizgi(ctx, px + kal + 7, vy - 5, px + kal + 7, vy + 5);
    }
    ctx.restore();
  }
  for (const n of v.noktalar ?? []) {
    const { cx, cy } = hucreXY(n.hucre);
    ctx.beginPath(); ctx.arc(cx + hucre / 2, cy + hucre / 2, 2.8, 0, Math.PI * 2); ctx.fill();
    fizikMetniCiz(ctx, n.ad, cx + hucre / 2 + 9, cy + hucre / 2 - 8, 14);
  }
}

// ── Kaldırma kuvveti kabı ──────────────────────────────────────────────────

export function kaldirmaYerlesim(s: { x: number; y: number; w: number; h: number }, v: KaldirmaVeri) {
  const ust = s.y + s.h * 0.08;
  const taban = s.y + s.h;
  const yuzey = taban - (taban - ust) * v.seviye;
  const a = Math.min(s.w * 0.17, (taban - yuzey) * 0.42, 70);
  const xs = [0.2, 0.5, 0.8].map((k) => s.x + s.w * k - a / 2);
  // X: yüzer (batan oran xBatma); Y: askıda, sıvı içinde ortada; Z: tabanda
  const xUst = yuzey - a * (1 - v.xBatma);
  const yUst = (yuzey + taban) / 2 - a / 2 - 4;
  const zUst = taban - a;
  // Kuvvet ölçeği: tam batan cismin kaldırma kuvveti = birim
  const birim = Math.min(46, a * 0.9);
  return { ust, taban, yuzey, a, xs, tops: [xUst, yUst, zUst], birim };
}

function kaldirmaCiz(ctx: CanvasRenderingContext2D, s: FizikSekli, v: KaldirmaVeri) {
  const y = kaldirmaYerlesim(s, v);
  ctx.fillStyle = SIVI_HAFIF;
  ctx.fillRect(s.x, y.yuzey, s.w, y.taban - y.yuzey);
  ctx.fillStyle = MUREKKEP;
  ctx.save(); ctx.lineWidth = 1; cizgi(ctx, s.x, y.yuzey, s.x + s.w, y.yuzey); ctx.restore();
  ctx.save();
  ctx.lineWidth = Math.max(2, ctx.lineWidth * 1.4);
  ctx.beginPath(); ctx.moveTo(s.x, y.ust); ctx.lineTo(s.x, y.taban); ctx.lineTo(s.x + s.w, y.taban); ctx.lineTo(s.x + s.w, y.ust); ctx.stroke();
  ctx.restore();
  y.xs.forEach((bx, i) => {
    const by = y.tops[i];
    ctx.save();
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(bx, by, y.a, y.a);
    // Batan kısım sıvı rengiyle değil, cisim beyaz kalır; yüzeyin cismi kestiği yer çizgiyle belli.
    ctx.strokeRect(bx, by, y.a, y.a);
    ctx.restore();
    fizikMetniCiz(ctx, v.adlar[i] ?? "", bx + y.a / 2, by + y.a / 2 + (v.kuvvet ? -y.a * 0.22 : 0), 16);
  });
  if (v.kuvvet) {
    const fk = [v.xBatma, 1, 1].map((k) => k * y.birim);
    const g = [v.xBatma, 1, v.zOran].map((k) => k * y.birim);
    y.xs.forEach((bx, i) => {
      const cx = bx + y.a / 2, cy = y.tops[i] + y.a / 2;
      dikeyOk(ctx, cx - 7, cy, cy - fk[i]);
      fizikMetniCiz(ctx, "F_k", cx - 11, cy - fk[i] - 2, 13, "sag");
      dikeyOk(ctx, cx + 7, cy, cy + g[i]);
      fizikMetniCiz(ctx, "G", cx + 11, cy + g[i] - 6, 13, "sol");
    });
    // Z: tabandan tepki N = G − Fk
    const zx = y.xs[2] + y.a * 0.86;
    const n = (v.zOran - 1) * y.birim;
    dikeyOk(ctx, zx, y.taban, y.taban - n);
    fizikMetniCiz(ctx, "N", zx + 5, y.taban - n - 4, 13, "sol");
  }
}

// ── U borusu ───────────────────────────────────────────────────────────────

export function uBorusuYerlesim(s: { x: number; y: number; w: number; h: number }, v: UBorusuVeri) {
  const aw = Math.max(16, Math.min(s.w * 0.15, 44));
  const xL = s.x + s.w * 0.27, xR = s.x + s.w * 0.73;
  const Rout = (xR - xL) / 2 + aw / 2;
  const Rin = Math.max(2, (xR - xL) / 2 - aw / 2);
  const xm = (xL + xR) / 2;
  const yb = s.y + s.h - Rout;
  const ust = s.y + 6;
  const h2 = uBorusuH2(v);
  // Ara yüzey düzlemi: kollarda, büküm başlangıcının biraz üstünde.
  const I = yb - Math.min((yb - ust) * 0.28, 50);
  const olcek = (I - ust - 8) / Math.max(v.h1, h2, 1e-6);
  const L1 = I - v.h1 * olcek;
  const L2 = I - h2 * olcek;
  return { aw, xL, xR, Rout, Rin, xm, yb, ust, I, olcek, L1, L2, h2 };
}

function uBorusuCiz(ctx: CanvasRenderingContext2D, s: FizikSekli, v: UBorusuVeri) {
  const y = uBorusuYerlesim(s, v);
  const { aw, xL, xR, Rout, Rin, xm, yb, ust, I, L1, L2, h2 } = y;
  // Ağır sıvı (d1): sol kolda L1'e kadar, bükümde, sağ kolda ara yüzey I'ya kadar.
  ctx.save();
  ctx.fillStyle = SIVI_AGIR;
  ctx.beginPath();
  ctx.moveTo(xL - aw / 2, L1);
  ctx.lineTo(xL - aw / 2, yb);
  ctx.arc(xm, yb, Rout, Math.PI, 0, true);
  ctx.lineTo(xR + aw / 2, I);
  ctx.lineTo(xR - aw / 2, I);
  ctx.lineTo(xR - aw / 2, yb);
  ctx.arc(xm, yb, Rin, 0, Math.PI, false);
  ctx.lineTo(xL + aw / 2, L1);
  ctx.closePath();
  ctx.fill();
  // Hafif sıvı (d2): sağ kolda I'dan L2'ye
  ctx.fillStyle = SIVI_HAFIF;
  ctx.fillRect(xR - aw / 2, L2, aw, I - L2);
  ctx.restore();
  ctx.save();
  ctx.lineWidth = 1;
  cizgi(ctx, xL - aw / 2, L1, xL + aw / 2, L1);
  cizgi(ctx, xR - aw / 2, L2, xR + aw / 2, L2);
  cizgi(ctx, xR - aw / 2, I, xR + aw / 2, I);
  // Ara yüzeyden geçen eş basınç düzlemi (kesikli)
  ctx.setLineDash([5, 4]);
  cizgi(ctx, xL - aw / 2 - 10, I, xR + aw / 2 + 10, I);
  ctx.restore();
  // Boru duvarları
  ctx.save();
  ctx.lineWidth = Math.max(1.8, ctx.lineWidth * 1.3);
  ctx.beginPath();
  ctx.moveTo(xL - aw / 2, ust); ctx.lineTo(xL - aw / 2, yb); ctx.arc(xm, yb, Rout, Math.PI, 0, true); ctx.lineTo(xR + aw / 2, ust);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(xL + aw / 2, ust); ctx.lineTo(xL + aw / 2, yb); ctx.arc(xm, yb, Rin, Math.PI, 0, true); ctx.lineTo(xR - aw / 2, ust);
  ctx.stroke();
  ctx.restore();
  fizikMetniCiz(ctx, "d_1", xL, (L1 + I) / 2 + (I - L1 < 22 ? 18 : 0), 15);
  fizikMetniCiz(ctx, "d_2", xR, (L2 + I) / 2, 15);
  olcuOku(ctx, xL - aw / 2 - 14, L1, I, "h_1", "sol");
  olcuOku(ctx, xR + aw / 2 + 14, L2, I, "h_2", "sag");
  void h2;
}

export function siviCiz(ctx: CanvasRenderingContext2D, s: FizikSekli) {
  const v = s.sivi && siviVerisiGecerliMi(s.sivi) ? s.sivi : varsayilanSivi();
  ctx.save();
  ctx.strokeStyle = MUREKKEP;
  ctx.fillStyle = MUREKKEP;
  ctx.lineWidth = Math.max(1.2, s.kalinlik);
  ctx.lineJoin = "round";
  ctx.setLineDash([]);
  if (v.tur === "bolmeli") bolmeliCiz(ctx, s, v);
  else if (v.tur === "kaldirma") kaldirmaCiz(ctx, s, v);
  else uBorusuCiz(ctx, s, v);
  ctx.restore();
}

/** Kutu dışına taşan yazı/ok payı (yerel). */
export function siviDisPayi(s: FizikSekli) {
  const v = s.sivi && siviVerisiGecerliMi(s.sivi) ? s.sivi : varsayilanSivi();
  if (v.tur === "uBorusu") {
    const y = uBorusuYerlesim(s, v);
    const sol = Math.max(0, s.x - (y.xL - y.aw / 2 - 14 - 34));
    const sag = Math.max(0, y.xR + y.aw / 2 + 14 + 34 - (s.x + s.w));
    return { sol, ust: 0, sag, alt: 0 };
  }
  if (v.tur === "bolmeli") {
    const p = v.musluk ? 40 : 0;
    return { sol: v.musluk?.taraf === "sol" ? p : 0, ust: 0, sag: v.musluk?.taraf === "sag" ? p : 0, alt: v.musluk?.taraf === "alt" ? p : 0 };
  }
  if (v.kuvvet) {
    const y = kaldirmaYerlesim(s, v);
    const zAlt = y.tops[2] + y.a / 2 + v.zOran * y.birim + 8;
    return { sol: 0, ust: 0, sag: 0, alt: Math.max(0, zAlt - (s.y + s.h)) };
  }
  return { sol: 0, ust: 0, sag: 0, alt: 0 };
}

export { sayiYaz as siviSayiYaz };
