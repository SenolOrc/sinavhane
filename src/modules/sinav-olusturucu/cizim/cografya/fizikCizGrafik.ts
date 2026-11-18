// Fizik şekilleri – hesaplı grafikler: hareket üçlüsü (x–t, v–t, a–t), V–I (Ohm), sürtünme F_s–F, Φ–t ve ε–t.
// Ders kitabı biçimi: ince eksenler ve ok uçları, eksen adı ok ucunda, isteğe bağlı açık gri kare çizgileri,
// kesikli kılavuzlar, yalnız siyah/gri. Ortak "eksen takımı" (plotCiz) hepsinde ve BOŞ cevap grafiklerinde kullanılır.
import { fizikMetniCiz, fizikMetniOlcu } from "../fizik";
import { guzelAdim, hareketParcalari } from "../grafik";
import { ayarMantik, ayarMetin, ayarSayi, ayarSayilar, ayarSec, type CografyaVerisi } from "./sema";
import { cizgi, ok, type Kutu } from "./fizikYardim";

type Ctx = CanvasRenderingContext2D;
type Nk = { x: number; y: number };

/** Sayı yazımı: Türkçe ondalık virgülü, "−" işareti, −0 yok. */
export function gSayi(n: number, ond = 2): string {
  let t = Number(n.toFixed(ond));
  if (Object.is(t, -0) || t === 0) t = 0;
  return String(t).replace(".", ",").replace("-", "−");
}
const temiz = (n: number) => Number(n.toFixed(9));

// ════════════════════════════════════════════════════════════════════════════
// ORTAK EKSEN TAKIMI
// ════════════════════════════════════════════════════════════════════════════
export type Ek = { lo: number; hi: number; adim: number };
type Plot = { x: number; y: number; w: number; h: number; ex: Ek; ey: Ek; X: (t: number) => number; Y: (v: number) => number };
type PlotSec = {
  izgara: boolean;
  /** Yatay eksen sayıları: düzenli adım / yalnız `sinirlar` / yok. */
  xSay: "adim" | "etap" | "yok";
  ySay: boolean;
  sifir: boolean;
  /** Etap sınırı değerleri (yatay eksende sayı ve isteğe bağlı kesikli dikey kılavuz). */
  sinirlar: number[];
  kilavuz: boolean;
  xAd: string; yAd: string;
  punto: number;
  /** Eğri o t'de eksenin ALTINDAYSA yatay eksen sayısı eksenin üstüne yazılır. */
  altta?: (t: number) => boolean;
  /** Ek tik/sayı yazmayı engelleyen y değerleri (özel etiket çakışması). */
  ySakin?: number[];
  xSakin?: number[];
  /** Yatay eksen adının en çok genişliği (komşu grafiğe taşmasın). */
  xAdGen?: number;
};

/** Değer aralığı için "güzel" eksen: 0 hep içeride; hepsi sıfırsa −1…1. */
export function ekBul(min: number, max: number, hedef = 4): Ek {
  let lo = Math.min(0, min), hi = Math.max(0, max);
  if (!(hi - lo > 1e-9)) return { lo: -1, hi: 1, adim: 1 };
  let adim = guzelAdim(hi - lo, hedef);
  const kur = () => { lo = temiz(Math.floor(Math.min(0, min) / adim + 1e-9) * adim); hi = temiz(Math.ceil(Math.max(0, max) / adim - 1e-9) * adim); };
  kur();
  while ((hi - lo) / adim > 12) { adim *= 2; kur(); }
  // Eğri uç değere değiyorsa kenarda yarım kalmasın: bir adım boşluk bırak.
  if (max > 1e-9 && max >= hi - 1e-9) hi = temiz(hi + adim);
  if (min < -1e-9 && min <= lo + 1e-9) lo = temiz(lo - adim);
  if (!(hi > lo)) hi = lo + adim;
  return { lo, hi, adim };
}
/** Süre ekseni: 0…T (T = 0 ise 8 s'lik boş eksen). */
function zamanEkseni(T: number): Ek {
  const t = T > 1e-9 ? T : 8;
  return { lo: 0, hi: t, adim: guzelAdim(t, 6) };
}

function plotKur(c: Kutu, m: { L: number; R: number; T: number; B: number }, ex: Ek, ey: Ek): Plot {
  const x = c.x + m.L, y = c.y + m.T, w = Math.max(24, c.w - m.L - m.R), h = Math.max(24, c.h - m.T - m.B);
  return { x, y, w, h, ex, ey, X: (t) => x + ((t - ex.lo) / (ex.hi - ex.lo)) * w, Y: (v) => y + h - ((v - ey.lo) / (ey.hi - ey.lo)) * h };
}

/** Izgara, eksenler, çentikler, sayılar ve eksen adları; `icerik` eğrileri ızgara ile eksen arasına çizer. */
function plotCiz(ctx: Ctx, P: Plot, o: PlotSec, icerik?: (ctx: Ctx, P: Plot) => void) {
  const ink = ctx.strokeStyle as string, kal = ctx.lineWidth, punto = o.punto, sp = punto * 0.8;
  const { ex, ey, X, Y } = P;
  const ay = Y(0), ax = X(ex.lo), orta = ey.lo < -1e-9;
  ctx.save(); ctx.lineJoin = "round"; ctx.lineCap = "butt"; ctx.setLineDash([]);
  if (o.izgara) {
    ctx.save(); ctx.strokeStyle = "#cfcfcf"; ctx.lineWidth = 0.6;
    for (let i = Math.ceil(ex.lo / ex.adim - 1e-9); i * ex.adim <= ex.hi + 1e-9; i++) cizgi(ctx, X(i * ex.adim), P.y, X(i * ex.adim), P.y + P.h);
    for (let i = Math.ceil(ey.lo / ey.adim - 1e-9); i * ey.adim <= ey.hi + 1e-9; i++) cizgi(ctx, P.x, Y(i * ey.adim), P.x + P.w, Y(i * ey.adim));
    ctx.restore();
  }
  if (o.kilavuz) {
    ctx.save(); ctx.strokeStyle = "#777"; ctx.lineWidth = Math.max(0.7, kal * 0.5); ctx.setLineDash([3, 3]);
    for (const t of o.sinirlar) if (t > ex.lo + 1e-9 && t <= ex.hi + 1e-9) cizgi(ctx, X(t), P.y, X(t), ay);
    ctx.restore();
  }
  ctx.save(); ctx.beginPath(); ctx.rect(P.x - 1, P.y - 1, P.w + 2, P.h + 2); ctx.clip();
  icerik?.(ctx, P);
  ctx.restore();
  // Eksenler (ok uçlu)
  ctx.strokeStyle = ink; ctx.fillStyle = ink; ctx.setLineDash([]);
  ctx.lineWidth = Math.max(1, kal * 0.8);
  ok(ctx, ax, P.y + P.h, ax, P.y - 10, 7);
  ctx.strokeStyle = ink;
  ok(ctx, ax, ay, P.x + P.w + 11, ay, 7);
  ctx.strokeStyle = ink;
  // Çentikler ve sayılar
  ctx.lineWidth = Math.max(0.7, kal * 0.5);
  const xT: number[] = [];
  if (o.xSay === "adim") for (let i = 1; i * ex.adim <= ex.hi + 1e-9; i++) xT.push(temiz(i * ex.adim));
  else if (o.xSay === "etap") for (const t of o.sinirlar) if (t > ex.lo + 1e-9 && t <= ex.hi + 1e-9) xT.push(t);
  let son = -1e9;
  for (const t of xT) {
    if (o.xSakin?.some((s) => Math.abs(P.X(s) - X(t)) < sp * 1.5)) continue;
    cizgi(ctx, X(t), ay - 3, X(t), ay + 3);
    const yaz = gSayi(t), w = fizikMetniOlcu(ctx, yaz, sp).w;
    if (X(t) - w / 2 - son >= 4) {
      const yukari = !o.kilavuz && o.altta?.(t);
      const yy = ay + (yukari ? -sp * 0.95 : sp * 1.0);
      ctx.save(); ctx.fillStyle = "#fff"; ctx.fillRect(X(t) - w / 2 - 1, yy - sp * 0.5, w + 2, sp); ctx.restore();
      ctx.fillStyle = ink;
      fizikMetniCiz(ctx, yaz, X(t), yy, sp);
      son = X(t) + w / 2;
    }
  }
  if (o.ySay) {
    let sonY = 1e9;
    const lis: number[] = [];
    for (let i = Math.ceil(ey.lo / ey.adim - 1e-9); i * ey.adim <= ey.hi + 1e-9; i++) if (i !== 0) lis.push(temiz(i * ey.adim));
    for (const v of lis.sort((a, b) => b - a)) {
      if (o.ySakin?.some((s) => Math.abs(Y(s) - Y(v)) < sp * 1.0)) continue;
      cizgi(ctx, ax - 3, Y(v), ax + 3, Y(v));
      if (Math.abs(Y(v) - sonY) >= sp * 1.1) { fizikMetniCiz(ctx, gSayi(v), ax - 6, Y(v), sp, "sag"); sonY = Y(v); }
    }
  }
  if (o.sifir || o.xSay !== "yok" || o.ySay) {
    // "0": yatay eksen ortadaysa y sayısı gibi eksen hizasında solda; değilse köşede, eksenin altında.
    if (orta) fizikMetniCiz(ctx, "0", ax - 6, ay, sp, "sag");
    else fizikMetniCiz(ctx, "0", ax - 5, ay + sp * 0.95, sp, "sag");
  }
  // Eksen adları ok ucunda
  ctx.strokeStyle = ink;
  if (o.yAd) fizikMetniCiz(ctx, o.yAd, ax + 8, P.y - 11, punto * 0.92, "sol", undefined, Math.max(36, P.w + 30));
  if (o.xAd) fizikMetniCiz(ctx, o.xAd, P.x + P.w + 17, ay, punto * 0.92, "sol", undefined, o.xAdGen ?? 60);
  ctx.restore();
}

/** Eğri çizgisi (kalın). */
function egriCiz(ctx: Ctx, P: Plot, pts: Nk[], kal: number) {
  if (pts.length < 2) return;
  ctx.save(); ctx.lineWidth = Math.max(1.8, kal * 1.5); ctx.lineJoin = "round"; ctx.setLineDash([]);
  ctx.beginPath(); pts.forEach((p, i) => (i ? ctx.lineTo(P.X(p.x), P.Y(p.y)) : ctx.moveTo(P.X(p.x), P.Y(p.y)))); ctx.stroke();
  ctx.restore();
}
function noktaCiz(ctx: Ctx, x: number, y: number, r = 2.8, dolu = true) {
  ctx.save(); ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fillStyle = dolu ? "#000" : "#fff"; ctx.fill(); if (!dolu) { ctx.lineWidth = 1.1; ctx.stroke(); } ctx.restore();
}

/** Çok grafikli yerleşim: alt alta ya da yan yana, ortak yatay eksen (hizalı). */
type Grafik1 = { yAd: string; ey: Ek; ySay: boolean; icerik?: (ctx: Ctx, P: Plot) => void; altta?: (t: number) => boolean };
const MARJ = { L: 48, R: 52, T: 20, B: 21 };
function cokluCiz(ctx: Ctx, k: Kutu, yerlesim: string, ex: Ek, gr: Grafik1[], s: Omit<PlotSec, "yAd" | "ySay" | "altta" | "ySakin">) {
  const yan = yerlesim === "yan", n = gr.length, bosluk = yan ? 6 : 4;
  const cw = yan ? (k.w - bosluk * (n - 1)) / n : k.w, ch = yan ? k.h : (k.h - bosluk * (n - 1)) / n;
  gr.forEach((g, i) => {
    const c = { x: yan ? k.x + i * (cw + bosluk) : k.x, y: yan ? k.y : k.y + i * (ch + bosluk), w: cw, h: ch };
    const P = plotKur(c, yan ? { ...MARJ, L: 40, R: 46 } : MARJ, ex, g.ey);
    // Alt alta dizilişte yalnız en alttaki grafikte "t" sayıları gerekmez; ama her grafik kendi başına okunsun diye hepsinde yazılır.
    plotCiz(ctx, P, { ...s, yAd: g.yAd, ySay: g.ySay, altta: g.altta, xAdGen: Math.max(24, c.x + c.w - (P.x + P.w + 17) - 2) }, g.icerik);
  });
}

// ════════════════════════════════════════════════════════════════════════════
// HAREKET ÜÇLÜSÜ: x–t, v–t, a–t
// ════════════════════════════════════════════════════════════════════════════
export type UcluEtap = { t0: number; t1: number; sure: number; ivme: number; v0: number; v1: number; x0: number; x1: number };

/** Etapları (süre, ivme) ve başlangıç değerlerinden çıkarır. Süresi 0 olan etap atlanır. "hiz" girişinde ivme = Δv/Δt. */
export function ucluHesap(v: CografyaVerisi) {
  const n = Math.round(ayarSayi(v, "n")), giris = ayarSec(v, "giris");
  const sure = ayarSayilar(v, "sure"), iv = ayarSayilar(v, "ivme"), vs = ayarSayilar(v, "vson");
  const etaplar: UcluEtap[] = [];
  let t = 0, x = ayarSayi(v, "x0"), vel = ayarSayi(v, "v0");
  const x0 = x, v0 = vel;
  let yol = 0;
  for (let i = 0; i < n; i++) {
    const dt = sure[i] ?? 0;
    if (!(dt > 1e-9)) continue;
    const a = giris === "hiz" ? ((vs[i] ?? 0) - vel) / dt : iv[i] ?? 0;
    const v1 = vel + a * dt, x1 = x + vel * dt + 0.5 * a * dt * dt;
    if (vel * v1 < 0) { const tc = -vel / a, xc = x + vel * tc + 0.5 * a * tc * tc; yol += Math.abs(xc - x) + Math.abs(x1 - xc); } else yol += Math.abs(x1 - x);
    etaplar.push({ t0: t, t1: t + dt, sure: dt, ivme: a, v0: vel, v1, x0: x, x1 });
    t += dt; x = x1; vel = v1;
  }
  return { etaplar, T: t, x0, v0, xSon: x, vSon: vel, yer: x - x0, yol, evreler: etaplar.map((e) => ({ sure: e.sure, ivme: e.ivme })) };
}

type Buyukluk = "konum" | "hiz" | "ivme";
function ucluParcalar(h: ReturnType<typeof ucluHesap>, b: Buyukluk): Nk[][] {
  return hareketParcalari(b, h.x0, h.v0, h.evreler);
}
function parcaAralik(parcalar: Nk[][]): { min: number; max: number } {
  let min = 0, max = 0;
  for (const p of parcalar) for (const q of p) { min = Math.min(min, q.y); max = Math.max(max, q.y); }
  return { min, max };
}
/** Parçalar üzerinde t anındaki değerin (sürekli doğrusal/örneklenmiş) işareti: eksen altındaysa true. */
function altindaMi(parcalar: Nk[][], T: number): (t: number) => boolean {
  return (t) => parcalar.some((p) => p.some((q, i) => {
    const o = p[i - 1];
    if (!o) return Math.abs(q.x - t) < 1e-9 && q.y < -1e-9;
    if (t < Math.min(o.x, q.x) - 1e-9 || t > Math.max(o.x, q.x) + 1e-9 || o.x === q.x) return false;
    return o.y + ((q.y - o.y) * (t - o.x)) / (q.x - o.x) < -1e-9;
  })) && T > 0;
}
/** v–t grafiğinde eğri altı alan: artı açık gri, eksi taramalı. */
function hizAlaniBoya(ctx: Ctx, P: Plot, parca: Nk[]) {
  for (let i = 1; i < parca.length; i++) {
    const a = parca[i - 1], b = parca[i];
    const dilim: [Nk, Nk][] = a.y * b.y >= 0 ? [[a, b]] : (() => { const tc = a.x + ((b.x - a.x) * Math.abs(a.y)) / (Math.abs(a.y) + Math.abs(b.y)); return [[a, { x: tc, y: 0 }], [{ x: tc, y: 0 }, b]] as [Nk, Nk][]; })();
    for (const [p, q] of dilim) {
      const neg = p.y < 0 || q.y < 0;
      ctx.save(); ctx.beginPath(); ctx.moveTo(P.X(p.x), P.Y(0)); ctx.lineTo(P.X(p.x), P.Y(p.y)); ctx.lineTo(P.X(q.x), P.Y(q.y)); ctx.lineTo(P.X(q.x), P.Y(0)); ctx.closePath();
      ctx.fillStyle = neg ? "#fff" : "#dcdcdc"; ctx.fill();
      if (neg) { ctx.clip(); ctx.lineWidth = 0.7; ctx.strokeStyle = "#555"; for (let u = -P.h; u < P.w + P.h; u += 5) cizgi(ctx, P.X(p.x) + u, P.y + P.h, P.X(p.x) + u + P.h, P.y); }
      ctx.restore();
    }
  }
}

function ucluGrafikler(v: CografyaVerisi, h: ReturnType<typeof ucluHesap>) {
  const goster = ayarSec(v, "goster"), bosSayi = ayarMantik(v, "bosSayi"), nokta = ayarMantik(v, "nokta"), alan = ayarMantik(v, "alan");
  const ad = { x: ayarMetin(v, "xAd"), v: ayarMetin(v, "vAd"), a: ayarMetin(v, "aAd") };
  const kal0 = 2;
  const sira: { b: Buyukluk; g: "x" | "v" | "a" }[] = [{ b: "konum", g: "x" }, { b: "hiz", g: "v" }, { b: "ivme", g: "a" }];
  return sira.map(({ b, g }): Grafik1 => {
    const parcalar = ucluParcalar(h, b), r = parcaAralik(parcalar), ey = ekBul(r.min, r.max, 4);
    const verilen = goster === "hepsi" || goster === g;
    return {
      yAd: ad[g], ey, ySay: verilen || bosSayi, altta: verilen && b !== "ivme" ? altindaMi(parcalar, h.T) : undefined,
      icerik: verilen ? (ctx, P) => {
        if (b === "hiz" && alan) for (const p of parcalar) hizAlaniBoya(ctx, P, p);
        ctx.strokeStyle = "#000";
        for (const p of parcalar) egriCiz(ctx, P, p, ctx.lineWidth || kal0);
        if (nokta && b !== "ivme") {
          for (const e of h.etaplar) { noktaCiz(ctx, P.X(e.t1), P.Y(b === "hiz" ? e.v1 : e.x1)); }
          noktaCiz(ctx, P.X(0), P.Y(b === "hiz" ? h.v0 : h.x0));
        }
      } : undefined,
    };
  });
}

function ucluCiz(ctx: Ctx, v: CografyaVerisi, k: Kutu) {
  const h = ucluHesap(v), punto = Math.max(10, Math.min(14, k.w / 34));
  const ex = zamanEkseni(h.T);
  const sinirlar = h.etaplar.map((e) => temiz(e.t1));
  const gr = ucluGrafikler(v, h);
  cokluCiz(ctx, k, ayarSec(v, "yerlesim"), ex, gr, {
    izgara: ayarMantik(v, "izgara"), xSay: ayarSec(v, "sayilar") as PlotSec["xSay"], sifir: ayarMantik(v, "sifir"), sinirlar,
    kilavuz: ayarMantik(v, "kilavuz"), xAd: ayarMetin(v, "tAd"), punto,
  });
}

export function ucluOzet(v: CografyaVerisi): string {
  const h = ucluHesap(v);
  if (!h.etaplar.length) return "Etap süreleri 0: grafik boş. En az bir etabın süresi > 0 olmalı.";
  const parca = h.etaplar.map((e, i) => `${i + 1}. etap (${gSayi(e.t0)}–${gSayi(e.t1)} s): a = ${gSayi(e.ivme)} m/s², v: ${gSayi(e.v0)} → ${gSayi(e.v1)} m/s, Δx = ${gSayi(e.x1 - e.x0)} m`);
  return `${parca.join(" · ")} · toplam: yer değiştirme ${gSayi(h.yer)} m, yol ${gSayi(h.yol)} m, son hız ${gSayi(h.vSon)} m/s · v–t eğimi = ivme, x–t eğimi = hız`;
}

// ════════════════════════════════════════════════════════════════════════════
// Φ–t ve ε–t
// ════════════════════════════════════════════════════════════════════════════
export type AkiEtap = { t0: number; t1: number; sure: number; phi0: number; phi1: number; emk: number };

/** Etap uç değerlerinden akı etapları ve ε = −N·ΔΦ/Δt (Lenz). Süresi 0 olan etap atlanır. */
export function akiHesap(v: CografyaVerisi) {
  const n = Math.round(ayarSayi(v, "n")), N = ayarSayi(v, "N");
  const sure = ayarSayilar(v, "sure"), phi = ayarSayilar(v, "phi");
  const etaplar: AkiEtap[] = [];
  let t = 0, p = ayarSayi(v, "phi0");
  const phi0 = p;
  for (let i = 0; i < n; i++) {
    const dt = sure[i] ?? 0;
    if (!(dt > 1e-9)) continue;
    const p1 = phi[i] ?? 0;
    etaplar.push({ t0: t, t1: t + dt, sure: dt, phi0: p, phi1: p1, emk: temiz((-N * (p1 - p)) / dt) });
    t += dt; p = p1;
  }
  return { etaplar, T: t, phi0, N };
}

function akiGrafikler(v: CografyaVerisi, h: ReturnType<typeof akiHesap>) {
  const goster = ayarSec(v, "goster"), bosSayi = ayarMantik(v, "bosSayi"), nokta = ayarMantik(v, "nokta"), dik = ayarMantik(v, "dik"), deger = ayarMantik(v, "deger");
  const phiVer = goster === "ikisi" || goster === "aki" || goster === "akiVerilir", emkVer = goster === "ikisi" || goster === "emk" || goster === "emkVerilir";
  const phiPts: Nk[] = [{ x: 0, y: h.phi0 }, ...h.etaplar.map((e) => ({ x: e.t1, y: e.phi1 }))];
  const emkParca: Nk[][] = h.etaplar.map((e) => [{ x: e.t0, y: e.emk }, { x: e.t1, y: e.emk }]);
  const ra = parcaAralik([phiPts]), re = parcaAralik(emkParca);
  const out: (Grafik1 & { ad: string })[] = [];
  const phiG: Grafik1 & { ad: string } = {
    ad: "aki", yAd: ayarMetin(v, "phiAd"), ey: ekBul(ra.min, ra.max, 4), ySay: phiVer || bosSayi, altta: phiVer ? altindaMi([phiPts], h.T) : undefined,
    icerik: phiVer ? (ctx, P) => { ctx.strokeStyle = "#000"; egriCiz(ctx, P, phiPts, ctx.lineWidth || 2); if (nokta) phiPts.forEach((q) => noktaCiz(ctx, P.X(q.x), P.Y(q.y))); } : undefined,
  };
  const emkG: Grafik1 & { ad: string } = {
    ad: "emk", yAd: ayarMetin(v, "emkAd"), ey: ekBul(re.min, re.max, 4), ySay: emkVer || bosSayi, altta: emkVer ? altindaMi(emkParca, h.T) : undefined,
    icerik: emkVer ? (ctx, P) => {
      ctx.strokeStyle = "#000";
      for (const p of emkParca) egriCiz(ctx, P, p, ctx.lineWidth || 2);
      if (dik) {
        ctx.save(); ctx.lineWidth = 0.8; ctx.setLineDash([3, 3]);
        for (let i = 1; i < h.etaplar.length; i++) { const a = h.etaplar[i - 1], b = h.etaplar[i]; if (Math.abs(a.emk - b.emk) > 1e-9) cizgi(ctx, P.X(b.t0), P.Y(a.emk), P.X(b.t0), P.Y(b.emk)); }
        ctx.restore();
      }
      if (deger) {
        const sp = 10;
        for (const e of h.etaplar) {
          if (Math.abs(e.emk) < 1e-9) continue;
          const xm = (P.X(e.t0) + P.X(e.t1)) / 2, genis = fizikMetniOlcu(ctx, gSayi(e.emk), sp).w;
          if (P.X(e.t1) - P.X(e.t0) < genis + 4) continue;
          fizikMetniCiz(ctx, gSayi(e.emk), xm, P.Y(e.emk) + (e.emk > 0 ? -9 : 9), sp);
        }
      }
    } : undefined,
  };
  if (goster !== "emk") out.push(phiG);
  if (goster !== "aki") out.push(emkG);
  return out;
}

function akiCiz(ctx: Ctx, v: CografyaVerisi, k: Kutu) {
  const h = akiHesap(v), punto = Math.max(10, Math.min(14, k.w / 30));
  const ex = zamanEkseni(h.T), sinirlar = h.etaplar.map((e) => temiz(e.t1));
  const gr = akiGrafikler(v, h);
  cokluCiz(ctx, k, ayarSec(v, "yerlesim"), ex, gr, {
    izgara: ayarMantik(v, "izgara"), xSay: ayarSec(v, "sayilar") as PlotSec["xSay"], sifir: ayarMantik(v, "sifir"), sinirlar,
    kilavuz: ayarMantik(v, "kilavuz"), xAd: ayarMetin(v, "tAd"), punto,
  });
}

export function akiOzet(v: CografyaVerisi): string {
  const h = akiHesap(v);
  if (!h.etaplar.length) return "Etap süreleri 0: grafik boş. En az bir etabın süresi > 0 olmalı.";
  const N = h.N > 1 ? `${gSayi(h.N, 0)}·` : "";
  const parca = h.etaplar.map((e, i) => `${i + 1}. etap (${gSayi(e.t0)}–${gSayi(e.t1)} s): ΔΦ = ${gSayi(e.phi1 - e.phi0)}, ε = −${N}ΔΦ/Δt = ${gSayi(e.emk)}`);
  return `${parca.join(" · ")} · akı sabitken ε = 0; akı artarken ε < 0, azalırken ε > 0 (Lenz: ε = −N·ΔΦ/Δt)`;
}

// ════════════════════════════════════════════════════════════════════════════
// V–I (OHM) GRAFİĞİ
// ════════════════════════════════════════════════════════════════════════════
/** Lambanın V(I): akım arttıkça ısınan filament direnci büyür (R = R_L·(1 + 0,7·(I/Imax)²)); eğri eğimi artar. */
export function lambaV(I: number, Rl: number, Imax: number): number { return Rl * I * (1 + 0.7 * (I / Imax) ** 2); }

export function ohmHesap(v: CografyaVerisi) {
  const lamba = ayarSec(v, "lamba"), yalniz = lamba === "yalniz";
  const n = yalniz ? 0 : Math.round(ayarSayi(v, "n")), Rler = ayarSayilar(v, "R").slice(0, n);
  const Imax = ayarSayi(v, "Imax"), I0 = Math.min(ayarSayi(v, "I0"), Imax), Rl = ayarSayi(v, "Rl");
  const lambaVar = lamba !== "yok";
  const Rtop = Math.max(1e-9, ...Rler, lambaVar ? lambaV(Imax, Rl, Imax) / Imax : 0);
  // Pencere: düşey eksen en dik elemanın ~%70'ine kadar (en dik çizgi üstten çıkar, hepsi görünür).
  const ey = ekBul(0, Rtop * Imax * 0.7, 4);
  return { n, R: Rler, Imax, I0, Rl, lambaVar, yalniz, Vtop: ey.hi, ey, Vler: Rler.map((r) => r * I0), VL: lambaVar ? lambaV(I0, Rl, Imax) : 0 };
}
type OhmEleman = { ad: string; vAd: string; V: (I: number) => number };
function ohmElemanlari(v: CografyaVerisi, h: ReturnType<typeof ohmHesap>): OhmEleman[] {
  const rAd = ayarMetin(v, "rAd") || "R", lAd = ayarMetin(v, "lambaAd"), rDeger = ayarMantik(v, "rDeger");
  const el: OhmEleman[] = h.R.map((r, i) => ({ ad: rDeger ? `${rAd}_${i + 1} = ${gSayi(r, 1)} Ω` : `${rAd}_${i + 1}`, vAd: `V_${i + 1}`, V: (I: number) => r * I }));
  if (h.lambaVar) el.push({ ad: lAd, vAd: "V_L", V: (I: number) => lambaV(I, h.Rl, h.Imax) });
  return el;
}

function ohmCiz(ctx: Ctx, v: CografyaVerisi, k: Kutu) {
  const h = ohmHesap(v), el = ohmElemanlari(v, h), punto = Math.max(11, Math.min(15, k.w / 26)), kal = ctx.lineWidth, sp = punto * 0.85;
  const iAd = ayarMetin(v, "iAd"), vAd = ayarMetin(v, "vAd"), ters = ayarSec(v, "eksen") === "IV";
  const deger = ayarMantik(v, "deger"), eksenSayi = ayarMantik(v, "eksenSayi");
  const I0 = h.I0, kilavuz = I0 > 1e-9;
  const Iek: Ek = { lo: 0, hi: h.Imax, adim: guzelAdim(h.Imax, 5) };
  const ex = ters ? h.ey : Iek, ey = ters ? { ...Iek, adim: guzelAdim(h.Imax, 4) } : h.ey;
  const P = plotKur(k, { L: 60, R: 66, T: 26, B: 32 }, ex, ey);
  /** (I, V) → (yatay, düşey) */
  const don = (I: number, V: number): Nk => (ters ? { x: V, y: I } : { x: I, y: V });
  // Elemanın (yatay, düşey) noktaları; düşey/yatay V penceresini aşınca kesişim noktasında biter.
  const egri = (e: OhmEleman): Nk[] => {
    const pts: Nk[] = [], N = 80;
    let oI = 0;
    for (let i = 0; i <= N; i++) {
      const I = (h.Imax * i) / N, V = e.V(I);
      if (V > h.Vtop + 1e-9) {
        const v0 = e.V(oI), f = (h.Vtop - v0) / (V - v0);
        pts.push(don(oI + (I - oI) * f, h.Vtop));
        break;
      }
      pts.push(don(I, V)); oI = I;
    }
    return pts;
  };
  const noktalar = el.map((e) => ({ e, I: I0, V: e.V(I0) })).filter((q) => kilavuz && q.V <= h.Vtop + 1e-9).map((q) => ({ ...q, p: don(q.I, q.V) }));
  // Eksen etiketleri: yatay eksende (x'e göre) ve düşey eksende (y'ye göre) aynı yerdekiler birleşir.
  type Et = { yer: number; ad: string; deger: number };
  const yatayEt: Et[] = [], dikeyEt: Et[] = [];
  const ekle = (liste: Et[], yer: number, ad: string, d: number) => { if (!liste.some((q) => Math.abs(q.yer - yer) < 0.5)) liste.push({ yer, ad, deger: d }); };
  for (const q of noktalar) {
    if (ters) { ekle(yatayEt, P.X(q.p.x), q.e.vAd, q.V); ekle(dikeyEt, P.Y(q.p.y), "I_0", q.I); }
    else { ekle(yatayEt, P.X(q.p.x), "I_0", q.I); ekle(dikeyEt, P.Y(q.p.y), q.e.vAd, q.V); }
  }
  plotCiz(ctx, P, {
    izgara: ayarMantik(v, "izgara"), xSay: eksenSayi ? "adim" : "yok", ySay: eksenSayi, sifir: true, sinirlar: [], kilavuz: false,
    xAd: ters ? vAd : iAd, yAd: ters ? iAd : vAd, punto,
    xSakin: yatayEt.length ? noktalar.map((q) => q.p.x) : undefined, ySakin: dikeyEt.length ? noktalar.map((q) => q.p.y) : undefined,
  }, (c, Q) => { c.strokeStyle = "#000"; for (const e of el) egriCiz(c, Q, egri(e), kal); });
  ctx.strokeStyle = "#000"; ctx.fillStyle = "#000";
  // Kılavuzlar: her noktadan iki eksene kesikli çizgi, nokta, eksen etiketleri
  if (noktalar.length) {
    ctx.save(); ctx.strokeStyle = "#555"; ctx.lineWidth = Math.max(0.8, kal * 0.55); ctx.setLineDash([4, 3]);
    for (const q of noktalar) { cizgi(ctx, P.X(q.p.x), P.Y(0), P.X(q.p.x), P.Y(q.p.y)); cizgi(ctx, P.X(0), P.Y(q.p.y), P.X(q.p.x), P.Y(q.p.y)); }
    ctx.restore(); ctx.strokeStyle = "#000"; ctx.fillStyle = "#000";
    for (const q of noktalar) noktaCiz(ctx, P.X(q.p.x), P.Y(q.p.y), 2.6);
    const yaz = (e: Et) => (deger ? gSayi(e.deger, 2) : e.ad);
    const dik = [...dikeyEt].sort((a, b) => a.yer - b.yer);
    for (let i = 1; i < dik.length; i++) if (dik[i].yer - dik[i - 1].yer < sp * 1.05) dik[i].yer = dik[i - 1].yer + sp * 1.05;
    for (const e of dik) fizikMetniCiz(ctx, yaz(e), P.X(0) - 6, e.yer, sp, "sag");
    const yat = [...yatayEt].sort((a, b) => a.yer - b.yer);
    for (let i = 1; i < yat.length; i++) { const w0 = fizikMetniOlcu(ctx, yaz(yat[i - 1]), sp).w / 2 + fizikMetniOlcu(ctx, yaz(yat[i]), sp).w / 2 + 4; if (yat[i].yer - yat[i - 1].yer < w0) yat[i].yer = yat[i - 1].yer + w0; }
    for (const e of yat) fizikMetniCiz(ctx, yaz(e), e.yer, P.Y(0) + sp * 1.05, sp);
  }
  // Çizgi adları uçlarda (üstten çıkanın üstüne, yana çıkanın sağına); çakışanlar itilir
  const adlar = el.map((e) => { const pts = egri(e), u = pts[pts.length - 1] ?? { x: 0, y: 0 }; return { ad: e.ad, x: P.X(u.x), y: P.Y(u.y) }; }).sort((a, b) => a.x - b.x);
  const yerlesik: { x0: number; x1: number; y: number }[] = [];
  for (const a of adlar) {
    const w = fizikMetniOlcu(ctx, a.ad, sp).w, uste = a.y <= P.y + 1.5;
    let tx = uste ? a.x - w / 2 : a.x + 6, ty = uste ? P.y - sp * 0.9 : a.y;
    if (!uste && Math.abs(ty - P.Y(0)) < sp * 1.3) ty = P.Y(0) - sp * 1.3; // yatay eksen adıyla çakışmasın
    tx = Math.min(tx, k.x + k.w - w);
    for (let g = 0; g < 8; g++) {
      if (!yerlesik.some((r) => tx < r.x1 + 3 && tx + w > r.x0 - 3 && Math.abs(ty - r.y) < sp * 1.05)) break;
      ty += uste ? -sp * 1.05 : sp * 1.05;
    }
    yerlesik.push({ x0: tx, x1: tx + w, y: ty });
    fizikMetniCiz(ctx, a.ad, tx, ty, sp, "sol");
  }
}

export function ohmOzet(v: CografyaVerisi): string {
  const h = ohmHesap(v);
  const parca = h.R.map((r, i) => `R${i + 1} = ${gSayi(r, 1)} Ω → V = ${gSayi(r * h.I0)} V (I = ${gSayi(h.I0)} A)`);
  if (h.lambaVar) parca.push(`lamba: ohmik değil (R = V/I akım arttıkça büyür; I = ${gSayi(h.I0)} A'de R ≈ ${gSayi(h.I0 > 0 ? h.VL / h.I0 : h.Rl, 1)} Ω)`);
  return `${parca.join(" · ")} · V–I grafiğinin eğimi direnç R = V/I; eğim büyüdükçe direnç büyük${h.R.length > 1 ? " (en dik çizgi en büyük R)" : ""}`;
}

// ════════════════════════════════════════════════════════════════════════════
// SÜRTÜNME GRAFİĞİ F_s – F
// ════════════════════════════════════════════════════════════════════════════
export function surtunmeHesap(v: CografyaVerisi) {
  const fsmax = ayarSayi(v, "fsmax"), fk = Math.min(ayarSayi(v, "fk"), fsmax), uzat = ayarSayi(v, "uzat");
  const xMax = fsmax * uzat, yMax = fsmax * 1.2;
  return { fsmax, fk, uzat, xMax, yMax, ex: ekBul(0, xMax, 5), ey: ekBul(0, yMax, 4), mu: fk > 0 ? fk / fsmax : 0 };
}
function surtunmeCiz(ctx: Ctx, v: CografyaVerisi, k: Kutu) {
  const h = surtunmeHesap(v), punto = Math.max(11, Math.min(15, k.w / 26)), kal = ctx.lineWidth, sp = punto * 0.85;
  const deger = ayarMantik(v, "deger"), etiket = ayarMantik(v, "etiket"), eksenSayi = ayarMantik(v, "eksenSayi"), kilavuz = ayarMantik(v, "kilavuz"), devam = ayarMantik(v, "devam");
  const maxAd = ayarMetin(v, "maxAd"), kAd = ayarMetin(v, "kAd");
  const ex: Ek = { lo: 0, hi: h.xMax, adim: h.ex.adim }, ey: Ek = { lo: 0, hi: h.yMax, adim: h.ey.adim };
  const P = plotKur(k, { L: 62, R: 58, T: 26, B: 32 }, ex, ey);
  const yazD = (d: number) => gSayi(d, 2);
  plotCiz(ctx, P, {
    izgara: ayarMantik(v, "izgara"), xSay: eksenSayi ? "adim" : "yok", ySay: eksenSayi, sifir: true, sinirlar: [], kilavuz: false,
    xAd: ayarMetin(v, "xAd"), yAd: ayarMetin(v, "yAd"), punto,
    ySakin: kilavuz ? [h.fsmax, h.fk] : undefined, xSakin: kilavuz ? [h.fsmax] : undefined,
  }, (c, Q) => {
    c.strokeStyle = "#000";
    const pts: Nk[] = [{ x: 0, y: 0 }, { x: h.fsmax, y: h.fsmax }];
    if (h.fk < h.fsmax - 1e-9) pts.push({ x: h.fsmax, y: h.fk });
    pts.push({ x: h.xMax, y: h.fk });
    egriCiz(c, Q, pts, kal);
    if (devam) { c.save(); c.strokeStyle = "#555"; c.lineWidth = Math.max(0.8, kal * 0.55); c.setLineDash([4, 3]); cizgi(c, Q.X(h.fsmax), Q.Y(h.fsmax), Q.X(Math.min(h.xMax, h.yMax)), Q.Y(Math.min(h.xMax, h.yMax))); c.restore(); }
  });
  ctx.strokeStyle = "#000"; ctx.fillStyle = "#000";
  const X = P.X, Y = P.Y;
  noktaCiz(ctx, X(h.fsmax), Y(h.fsmax), 2.8);
  if (kilavuz) {
    ctx.save(); ctx.strokeStyle = "#555"; ctx.lineWidth = Math.max(0.8, kal * 0.55); ctx.setLineDash([4, 3]);
    cizgi(ctx, X(0), Y(h.fsmax), X(h.fsmax), Y(h.fsmax)); cizgi(ctx, X(h.fsmax), Y(0), X(h.fsmax), Y(h.fsmax));
    if (h.fk > 1e-9) cizgi(ctx, X(0), Y(h.fk), X(h.fsmax), Y(h.fk));
    ctx.restore(); ctx.strokeStyle = "#000"; ctx.fillStyle = "#000";
    // Eksen değerleri (kinetik ve maksimum birbirine yakınsa aralarını aç)
    let ym = Y(h.fsmax), yk = Y(h.fk);
    if (h.fk > 1e-9 && yk - ym < sp * 1.1) { yk = ym + sp * 1.1; }
    fizikMetniCiz(ctx, deger ? yazD(h.fsmax) : maxAd, X(0) - 6, ym, sp, "sag");
    if (h.fk > 1e-9 && h.fk < h.fsmax - 1e-9) fizikMetniCiz(ctx, deger ? yazD(h.fk) : kAd, X(0) - 6, yk, sp, "sag");
    fizikMetniCiz(ctx, deger ? yazD(h.fsmax) : maxAd, X(h.fsmax), Y(0) + sp * 1.05, sp);
  }
  if (etiket) {
    // "durgun": yükselen doğrunun üst-solunda; "kinetik": yatay parçanın üstünde (sağda)
    fizikMetniCiz(ctx, "durgun", (X(0) + X(h.fsmax)) / 2 - 8, (Y(0) + Y(h.fsmax)) / 2 - sp * 0.9, sp, "sag");
    const kx = (X(h.fsmax) + X(h.xMax)) / 2 + 6;
    const ky = Y(h.fk) + (h.fk > h.yMax * 0.5 ? sp * 1.0 : -sp * 0.9);
    fizikMetniCiz(ctx, "kinetik", kx, ky, sp);
  }
}
export function surtunmeOzet(v: CografyaVerisi): string {
  const h = surtunmeHesap(v);
  return `Durgun sürtünme uygulanan kuvvete eşit artar (f_s = F) ve en çok f_s,max = ${gSayi(h.fsmax)} N olur; cisim kayınca kinetik sürtünme sabit f_k = ${gSayi(h.fk)} N · f_k ≤ f_s,max (k/s oranı ${gSayi(h.mu)})`;
}

// ════════════════════════════════════════════════════════════════════════════
// Dağıtıcı
// ════════════════════════════════════════════════════════════════════════════
export function grafikEkCiz(ctx: Ctx, v: CografyaVerisi, k: Kutu): boolean {
  switch (v.yapi) {
    case "hareketUclu": ucluCiz(ctx, v, k); return true;
    case "ohmGrafik": ohmCiz(ctx, v, k); return true;
    case "surtunmeGrafik": surtunmeCiz(ctx, v, k); return true;
    case "akiEmk": akiCiz(ctx, v, k); return true;
    default: return false;
  }
}
export function grafikEkOzet(v: CografyaVerisi): string | null | undefined {
  switch (v.yapi) {
    case "hareketUclu": return ucluOzet(v);
    case "ohmGrafik": return ohmOzet(v);
    case "surtunmeGrafik": return surtunmeOzet(v);
    case "akiEmk": return akiOzet(v);
    default: return undefined;
  }
}

/** Grafik ailelerinin önerilen kutusu: yerleşime (alt alta / yan yana) ve grafik sayısına göre. */
export function grafikKutuBoyutu(v: CografyaVerisi): { w: number; h: number } | null {
  const yan = ayarSec(v, "yerlesim") === "yan";
  if (v.yapi === "hareketUclu") return yan ? { w: 690, h: 190 } : { w: 400, h: 450 };
  if (v.yapi === "akiEmk") {
    const g = ayarSec(v, "goster"), n = g === "aki" || g === "emk" ? 1 : 2;
    return yan ? { w: n === 1 ? 300 : 520, h: 200 } : { w: 400, h: n === 1 ? 220 : 380 };
  }
  return null;
}
