// Fizik şekilleri – Paket 2: Dalgalar (atma, periyodik dalga, duran dalga, Doppler, su dalgaları).
// Saf çizim: veri (ayar tablosu) → tuval. Yalnız gri/siyah (baskı dostu).
import { fizikMetniCiz } from "../fizik";
import { ayarMantik, ayarSayi, ayarSec, type CografyaVerisi } from "./sema";
import { cizgi, dolgu, kesik, ok, olcuOku, puntoOlc, sayiYaz, type Kutu } from "./fizikYardim";

type Ctx = CanvasRenderingContext2D;
const KISA = "#bdbdbd";
function izgaraCiz(ctx: Ctx, x0: number, y0: number, nx: number, ny: number, q: number) {
  ctx.save(); ctx.strokeStyle = KISA; ctx.lineWidth = 0.6; ctx.setLineDash([1.5, 2.5]);
  for (let i = 0; i <= nx; i++) cizgi(ctx, x0 + i * q, y0, x0 + i * q, y0 + ny * q);
  for (let j = 0; j <= ny; j++) cizgi(ctx, x0, y0 + j * q, x0 + nx * q, y0 + j * q);
  ctx.restore();
}

// ════════════════════════════════════════════════════════════════════════════
// ATMA
// ════════════════════════════════════════════════════════════════════════════
const NK = 16; // yay uzunluğu (kare)
const ucgen = (x: number, c: number, a: number, gen: number) => a * Math.max(0, 1 - Math.abs(x - c) / (gen / 2));

type Atma = { c: number; a: number; yon: 1 | -1 };
/** t anında atmaların (görüntü atmalar dahil) bileşke yüksekliği (kare). */
export function atmaYuksekligi(v: CografyaVerisi, x: number, t: number): number {
  const tip = ayarSec(v, "tip"), gen = ayarSayi(v, "gen");
  const a1 = ayarSayi(v, "a1") * (ayarSec(v, "yon") === "alt" ? -1 : 1), a2 = ayarSayi(v, "a2"), k1 = ayarSayi(v, "k1"), k2 = ayarSayi(v, "k2");
  let u = ucgen(x, k1 + t, a1, gen);
  if (tip === "sabit") u -= ucgen(x, 2 * NK - (k1 + t), a1, gen);
  else if (tip === "serbest") u += ucgen(x, 2 * NK - (k1 + t), a1, gen);
  else if (tip === "yapici") u += ucgen(x, k2 - t, a1 > 0 ? a2 : -a2, gen);
  else if (tip === "yikici") u += ucgen(x, k2 - t, a1 > 0 ? -a2 : a2, gen);
  return u;
}
function atmaCiz(ctx: Ctx, v: CografyaVerisi, k: Kutu) {
  const punto = puntoOlc(k), kal = ctx.lineWidth, tip = ayarSec(v, "tip");
  const a1 = ayarSayi(v, "a1"), a2 = ayarSayi(v, "a2"), t = ayarSayi(v, "t"), gen = ayarSayi(v, "gen");
  const M = Math.max(2, Math.ceil(tip === "yapici" || tip === "yikici" ? a1 + a2 : a1));
  const ust = 26, alt = 12, sol = 12, sag = tip === "sabit" || tip === "serbest" ? 22 : 12;
  const q = Math.min(28, (k.w - sol - sag) / NK, (k.h - ust - alt) / (2 * M));
  const gx = k.x + sol, cy = k.y + ust + (k.h - ust - alt) / 2;
  const sgn = ayarSec(v, "yon") === "alt" ? -1 : 1;
  if (ayarMantik(v, "izgara")) izgaraCiz(ctx, gx, cy - M * q, NK, 2 * M, q);
  ctx.save(); ctx.lineJoin = "round";
  const yol = (tt: number, kalinlik: number, kesikli: boolean) => {
    ctx.save(); ctx.lineWidth = kalinlik; if (kesikli) ctx.setLineDash([4, 3]);
    ctx.beginPath();
    const n = NK * 8;
    for (let i = 0; i <= n; i++) { const x = (NK * i) / n, y = atmaYuksekligi(v, x, tt); if (i === 0) ctx.moveTo(gx + x * q, cy - y * q); else ctx.lineTo(gx + x * q, cy - y * q); }
    ctx.stroke(); ctx.restore();
  };
  if (ayarMantik(v, "ilk") && t > 0) yol(0, Math.max(0.8, kal * 0.5), true);
  yol(t, Math.max(1.6, kal * 1.2), false);
  // Uç gösterimi
  if (tip === "sabit") {
    const x = gx + NK * q;
    ctx.save(); ctx.lineWidth = Math.max(1.6, kal * 1.2); cizgi(ctx, x, cy - 14, x, cy + 14); ctx.restore();
    ctx.save(); ctx.lineWidth = Math.max(0.8, kal * 0.55);
    for (let y = cy - 12; y <= cy + 12; y += 5) cizgi(ctx, x, y, x + 7, y + 5);
    ctx.restore();
  } else if (tip === "serbest") {
    const x = gx + NK * q;
    ctx.save(); ctx.lineWidth = Math.max(1.4, kal); cizgi(ctx, x + 6, cy - 22, x + 6, cy + 22);
    ctx.beginPath(); ctx.arc(x + 1, cy, 4, 0, Math.PI * 2); dolgu(ctx, () => ctx.fill(), "#fff"); ctx.stroke(); ctx.restore();
  }
  // Yön okları (ilk konumdaki atmaların üstünde)
  const oklar: Atma[] = [{ c: ayarSayi(v, "k1"), a: a1 * sgn, yon: 1 }];
  if (tip === "yapici" || tip === "yikici") oklar.push({ c: ayarSayi(v, "k2"), a: a2, yon: -1 });
  if (t > 0 && ayarMantik(v, "ilk")) for (const o of oklar) {
    ctx.save(); ctx.lineWidth = Math.max(1.1, kal);
    const sx = gx + o.c * q, y0 = o.a >= 0 ? cy - Math.abs(o.a) * q - 8 : cy + Math.abs(o.a) * q + 8;
    ok(ctx, sx - o.yon * 12, y0, sx + o.yon * 12, y0, 6); ctx.restore();
  }
  void gen;
  if (ayarMantik(v, "zaman")) fizikMetniCiz(ctx, `t = ${sayiYaz(t, 0)} s`, k.x + 8, k.y + 11, punto, "sol");
  if (ayarMantik(v, "hiz")) fizikMetniCiz(ctx, "v = 1 kare/s", k.x + k.w - 8, k.y + 11, punto, "sag");
  ctx.restore();
}

// ════════════════════════════════════════════════════════════════════════════
// PERİYODİK DALGA
// ════════════════════════════════════════════════════════════════════════════
export function dalgaHesap(v: CografyaVerisi) {
  const lam = ayarSayi(v, "lam"), kare = ayarSayi(v, "kareBoy"), T = ayarSayi(v, "T");
  const lamM = (lam * kare) / 100;
  return { lamCm: lam * kare, A: ayarSayi(v, "genlik") * kare, T, f: 1 / T, v: lamM / T };
}
function dalgaCizimi(ctx: Ctx, v: CografyaVerisi, k: Kutu) {
  const punto = puntoOlc(k), kal = ctx.lineWidth, enine = ayarSec(v, "tip") === "enine";
  const lam = ayarSayi(v, "lam"), A = ayarSayi(v, "genlik"), nc = ayarSayi(v, "sayi"), veri = ayarMantik(v, "veri"), kareBoy = ayarSayi(v, "kareBoy");
  const toplam = lam * nc, sol = enine && ayarMantik(v, "genOk") ? (veri ? 68 : 34) : 16, ust = 40, alt = 22;
  const q = Math.min(30, (k.w - sol - 16) / toplam, (k.h - ust - alt) / (2 * (enine ? A : 1.6) + (enine ? 0 : 0)));
  const x0 = k.x + sol + Math.max(0, (k.w - sol - 16 - toplam * q) / 2), cy = k.y + ust + (k.h - ust - alt) / 2;
  ctx.save(); ctx.lineJoin = "round";
  if (enine) {
    if (ayarMantik(v, "izgara")) izgaraCiz(ctx, x0, cy - Math.ceil(A) * q, toplam, 2 * Math.ceil(A), q);
    ctx.save(); ctx.lineWidth = Math.max(0.8, kal * 0.55); kesik(ctx, x0 - 6, cy, x0 + toplam * q + 6, cy); ctx.restore();
    ctx.save(); ctx.lineWidth = Math.max(1.6, kal * 1.2); ctx.beginPath();
    const n = toplam * 24;
    for (let i = 0; i <= n; i++) { const x = (toplam * i) / n, y = A * Math.sin((2 * Math.PI * x) / lam); const X = x0 + x * q, Y = cy - y * q; if (i === 0) ctx.moveTo(X, Y); else ctx.lineTo(X, Y); }
    ctx.stroke(); ctx.restore();
    const cr = x0 + (lam / 4) * q; // ilk tepe
    if (ayarMantik(v, "genOk")) {
      const ax = x0 - 12;
      ctx.save(); ctx.lineWidth = Math.max(0.8, kal * 0.55);
      kesik(ctx, ax - 3, cy - A * q, cr, cy - A * q, [2, 2]);
      olcuOku(ctx, ax, cy - 0.001, ax, cy - A * q, 5);
      ctx.restore();
      fizikMetniCiz(ctx, veri ? `A = ${sayiYaz(A * kareBoy, 0)} cm` : "A", ax - 5, cy - (A * q) / 2, punto * 0.92, "sag");
    }
    if (ayarMantik(v, "lamOk")) {
      const c2 = cr + lam * q, yo = cy - A * q - 22;
      ctx.save(); ctx.lineWidth = Math.max(0.8, kal * 0.55);
      kesik(ctx, cr, cy - A * q - 1, cr, yo - 4, [2, 2]); kesik(ctx, c2, cy - A * q - 1, c2, yo - 4, [2, 2]);
      olcuOku(ctx, cr, yo, c2, yo, 5);
      ctx.restore();
      fizikMetniCiz(ctx, veri ? `λ = ${sayiYaz(lam * kareBoy, 0)} cm` : "λ", (cr + c2) / 2, yo - 9, punto * 0.95);
    }
    if (ayarMantik(v, "tepe")) {
      const tx = x0 + (lam / 4 + (nc > 1 ? lam : 0)) * q;
      fizikMetniCiz(ctx, "tepe", tx + 7, cy - A * q - 4, punto * 0.88, "sol");
      const cx2 = x0 + ((3 * lam) / 4 + (nc > 1 ? lam : 0)) * q;
      fizikMetniCiz(ctx, "çukur", cx2 + 7, cy + A * q + 5, punto * 0.88, "sol");
    }
    if (ayarMantik(v, "noktalar")) {
      const ad = ["K", "L", "M", "N"];
      for (let i = 0; i < 4; i++) {
        const x = (lam * (i + 0.0)) / 4 + lam / 8, y = A * Math.sin((2 * Math.PI * x) / lam), X = x0 + x * q, Y = cy - y * q;
        ctx.beginPath(); ctx.arc(X, Y, 2.8, 0, Math.PI * 2); ctx.fill();
        fizikMetniCiz(ctx, ad[i], X, Y + (y >= 0 ? -9 : 10), punto * 0.92);
      }
    }
  } else {
    // Boyuna dalga: sıkışma (S) ve genleşme (G) bölgeleri
    const bh = Math.min(70, k.h - ust - alt - 18), by0 = cy - bh / 2;
    const a = 0.16 * lam, adet = toplam * 6;
    ctx.save(); ctx.lineWidth = Math.max(1, kal * 0.8);
    for (let i = 0; i <= adet; i++) { const x = (toplam * i) / adet, xs = x + a * Math.sin((2 * Math.PI * x) / lam); cizgi(ctx, x0 + xs * q, by0, x0 + xs * q, by0 + bh); }
    ctx.restore();
    ctx.save(); ctx.lineWidth = Math.max(0.8, kal * 0.55); ctx.strokeRect(x0 - 2, by0 - 1, toplam * q + 4 + 0, bh + 2); ctx.restore();
    const s1 = x0 + (lam / 2) * q, s2 = s1 + lam * q;
    fizikMetniCiz(ctx, "S", s1, by0 + bh + 11, punto * 0.92);
    if (nc > 1) fizikMetniCiz(ctx, "S", s2, by0 + bh + 11, punto * 0.92);
    fizikMetniCiz(ctx, "G", x0 + lam * q, by0 - 9, punto * 0.92);
    if (ayarMantik(v, "lamOk")) {
      const yo = by0 - 18;
      ctx.save(); ctx.lineWidth = Math.max(0.8, kal * 0.55);
      kesik(ctx, s1, by0 - 1, s1, yo - 3, [2, 2]); kesik(ctx, s2, by0 - 1, s2, yo - 3, [2, 2]);
      olcuOku(ctx, s1, yo, s2, yo, 5);
      ctx.restore();
      fizikMetniCiz(ctx, veri ? `λ = ${sayiYaz(lam * kareBoy, 0)} cm` : "λ", (s1 + s2) / 2, yo - 9, punto * 0.95);
    }
  }
  ctx.restore();
}

// ════════════════════════════════════════════════════════════════════════════
// DURAN DALGA (boru, tel)
// ════════════════════════════════════════════════════════════════════════════
export function rezonansHesap(v: CografyaVerisi) {
  const tip = ayarSec(v, "tip"), n = ayarSayi(v, "n"), L = ayarSayi(v, "L"), hiz = ayarSayi(v, "hiz");
  const lam = tip === "kapali" ? (4 * L) / (2 * n - 1) : (2 * L) / n;
  return { tip, n, L, lam, f: hiz / lam, harmonik: tip === "kapali" ? 2 * n - 1 : n };
}
function rezonansCiz(ctx: Ctx, v: CografyaVerisi, k: Kutu) {
  const punto = puntoOlc(k), kal = ctx.lineWidth, h = rezonansHesap(v);
  const x0 = k.x + 40, x1 = k.x + k.w - 40, W = x1 - x0, cy = k.y + 74, hh = 34;
  // Mod: kapalı/açık için zarf
  const env = (u: number) => (h.tip === "kapali" ? Math.sin(((2 * h.n - 1) * Math.PI * u) / 2) : h.tip === "acik" ? Math.cos(h.n * Math.PI * u) : Math.sin(h.n * Math.PI * u)); // u ∈ [0,1]
  ctx.save(); ctx.lineJoin = "round";
  // Kap / tel
  if (h.tip === "tel") {
    ctx.save(); ctx.lineWidth = Math.max(1.4, kal);
    cizgi(ctx, x0, cy - 20, x0, cy + 20); cizgi(ctx, x1, cy - 20, x1, cy + 20); ctx.restore();
    ctx.save(); ctx.lineWidth = Math.max(0.8, kal * 0.55);
    for (let y = cy - 18; y < cy + 18; y += 5) { cizgi(ctx, x0, y, x0 - 6, y + 5); cizgi(ctx, x1, y, x1 + 6, y + 5); }
    ctx.restore();
  } else {
    const bh = hh + 10;
    ctx.save(); ctx.lineWidth = Math.max(1.6, kal * 1.2);
    cizgi(ctx, x0, cy - bh, x1, cy - bh); cizgi(ctx, x0, cy + bh, x1, cy + bh);
    if (h.tip === "kapali") cizgi(ctx, x0, cy - bh, x0, cy + bh);
    ctx.restore();
  }
  // Zarf eğrileri
  const N = 160;
  const egri = (isaret: number, kesikli: boolean) => {
    ctx.save(); ctx.lineWidth = Math.max(1.3, kal * 1.05); if (kesikli) { ctx.lineWidth = Math.max(0.9, kal * 0.6); ctx.setLineDash([4, 3]); }
    ctx.beginPath();
    for (let i = 0; i <= N; i++) { const u = i / N; const X = x0 + u * W, Y = cy - isaret * env(u) * hh; if (i === 0) ctx.moveTo(X, Y); else ctx.lineTo(X, Y); }
    ctx.stroke(); ctx.restore();
  };
  egri(1, false); egri(-1, ayarMantik(v, "yarim"));
  if (!ayarMantik(v, "yarim")) egri(-1, false);
  ctx.save(); ctx.lineWidth = Math.max(0.7, kal * 0.5); kesik(ctx, x0, cy, x1, cy, [2, 3]); ctx.restore();
  // Düğüm / karın etiketleri (eğrinin sıfırlarına ve uçlarına)
  if (ayarMantik(v, "dk")) {
    const nod: number[] = [], kar: number[] = [];
    const lamU = h.tip === "kapali" ? 4 / (2 * h.n - 1) : 2 / h.n; // λ, L = 1 birimde
    const yarimU = lamU / 2;
    if (h.tip === "acik") { for (let i = 0; i <= h.n; i++) kar.push(i * yarimU); for (let i = 0; i < h.n; i++) nod.push(yarimU / 2 + i * yarimU); }
    else if (h.tip === "kapali") { for (let i = 0; i < h.n; i++) nod.push(i * yarimU); for (let i = 0; i < h.n; i++) kar.push(yarimU / 2 + i * yarimU); }
    else { for (let i = 0; i <= h.n; i++) nod.push(i * yarimU); for (let i = 0; i < h.n; i++) kar.push(yarimU / 2 + i * yarimU); }
    const yb = cy + (h.tip === "tel" ? hh : hh + 10) + 14;
    for (const u of nod) fizikMetniCiz(ctx, "D", x0 + Math.min(1, Math.max(0, u)) * W, yb, punto * 0.92);
    for (const u of kar) fizikMetniCiz(ctx, "K", x0 + Math.min(1, Math.max(0, u)) * W, yb + punto * 1.15, punto * 0.92);
  }
  // L ölçüsü
  const yL = cy - (h.tip === "tel" ? hh : hh + 10) - 14;
  ctx.save(); ctx.lineWidth = Math.max(0.8, kal * 0.55);
  kesik(ctx, x0, yL + 4, x0, cy - 20, [2, 2]); kesik(ctx, x1, yL + 4, x1, cy - 20, [2, 2]);
  olcuOku(ctx, x0, yL, x1, yL, 5);
  ctx.restore();
  fizikMetniCiz(ctx, ayarMantik(v, "lYaz") ? `L = ${sayiYaz(h.L)} m` : "L", (x0 + x1) / 2, yL - 9, punto);
  if (ayarMantik(v, "lamYaz")) fizikMetniCiz(ctx, `λ = ${sayiYaz(h.lam, 2)} m,  f = ${sayiYaz(h.f, 0)} Hz`, (x0 + x1) / 2, k.y + k.h - 8, punto * 0.95);
  ctx.restore();
}

// ════════════════════════════════════════════════════════════════════════════
// DOPPLER
// ════════════════════════════════════════════════════════════════════════════
function dopplerCiz(ctx: Ctx, v: CografyaVerisi, k: Kutu) {
  const punto = puntoOlc(k), kal = ctx.lineWidth, o = ayarSayi(v, "oran"), n = ayarSayi(v, "n"), yon = ayarSec(v, "yon") === "sag" ? 1 : -1;
  const orta = k.y + k.h / 2 - (ayarMantik(v, "fYaz") ? 8 : 0);
  const R0 = Math.min((k.h - 56) / (2 * n), (k.w - 90) / (2 * n + n * o));
  // Çember kümesinin sınırını bul, kutu içinde ortala
  let mn = Infinity, mx = -Infinity;
  for (let i = 0; i <= n; i++) { const cx = -yon * o * R0 * i; mn = Math.min(mn, cx - i * R0); mx = Math.max(mx, cx + i * R0); }
  const xs = k.x + (k.w - (mx - mn)) / 2 - mn;
  ctx.save();
  ctx.beginPath(); ctx.rect(k.x, k.y, k.w, k.h); ctx.clip();
  ctx.lineWidth = Math.max(0.9, kal * 0.7);
  for (let i = 1; i <= n; i++) { ctx.beginPath(); ctx.arc(xs - yon * o * R0 * i, orta, i * R0, 0, Math.PI * 2); ctx.stroke(); }
  if (o > 1 && ayarMantik(v, "konus")) {
    const th = Math.asin(1 / o), L = n * R0 * 1.1;
    ctx.save(); ctx.lineWidth = Math.max(1.2, kal);
    for (const s of [-1, 1]) cizgi(ctx, xs, orta, xs - yon * Math.cos(th) * L, orta + s * Math.sin(th) * L);
    ctx.restore();
  }
  ctx.restore();
  ctx.save(); ctx.beginPath(); ctx.arc(xs, orta, 3.6, 0, Math.PI * 2); ctx.fill(); ctx.restore();
  fizikMetniCiz(ctx, "S", xs - 1, orta - 10, punto * 0.95);
  if (ayarMantik(v, "hizOk")) {
    ctx.save(); ctx.lineWidth = Math.max(1.4, kal * 1.1);
    ok(ctx, xs + yon * 5, orta, xs + yon * 38, orta, 7); ctx.restore();
    fizikMetniCiz(ctx, "vec(v)_k", xs + yon * 22, orta + 12, punto * 0.9);
  }
  if (ayarMantik(v, "gozlemci")) {
    const rA = 9, ax = k.x + (yon > 0 ? k.w - 18 : 18), bx = k.x + (yon > 0 ? 18 : k.w - 18);
    for (const [x, ad] of [[ax, "A"], [bx, "B"]] as const) {
      ctx.save(); ctx.beginPath(); ctx.arc(x, orta, rA, 0, Math.PI * 2); ctx.fillStyle = "#fff"; ctx.fill(); ctx.stroke(); ctx.restore();
      fizikMetniCiz(ctx, ad, x, orta, punto * 0.9);
    }
  }
  if (ayarMantik(v, "fYaz")) {
    const t = o === 0 ? "f_A = f_S = f_B" : o >= 1 ? "Kaynak sesten hızlı: Mach konisi" : "f_B < f_S < f_A";
    fizikMetniCiz(ctx, ayarMantik(v, "gozlemci") || o === 0 ? t : t.replace(/f_A/g, "f_ön").replace(/f_B/g, "f_arka"), k.x + k.w / 2, k.y + k.h - 8, punto);
  }
}

// ════════════════════════════════════════════════════════════════════════════
// SU DALGALARI
// ════════════════════════════════════════════════════════════════════════════
function aciYay(ctx: Ctx, cx: number, cy: number, r: number, a0: number, a1: number, ad: string, punto: number, kal: number, yaziR = r + 9) {
  ctx.save(); ctx.lineWidth = Math.max(0.8, kal * 0.55);
  ctx.beginPath(); ctx.arc(cx, cy, r, a0, a1); ctx.stroke(); ctx.restore();
  const m = (a0 + a1) / 2;
  fizikMetniCiz(ctx, ad, cx + Math.cos(m) * yaziR, cy + Math.sin(m) * yaziR, punto * 0.95);
}
function kirinimCiz(ctx: Ctx, v: CografyaVerisi, k: Kutu) {
  const tip = ayarSec(v, "tip"), punto = puntoOlc(k), kal = ctx.lineWidth, lam = ayarSayi(v, "lam"), etiket = ayarMantik(v, "etiket");
  const cy = k.y + k.h / 2;
  ctx.save(); ctx.lineJoin = "round";
  const kes = (f: () => void) => { ctx.save(); ctx.beginPath(); ctx.rect(k.x + 2, k.y + 2, k.w - 4, k.h - 4); ctx.clip(); f(); ctx.restore(); };
  if (tip === "kirinim") {
    const g = ayarSayi(v, "yarik") * lam, wx = k.x + k.w * 0.34, yu = k.y + 10, ya = k.y + k.h - 10;
    const g2 = Math.min(g, k.h - 40);
    // Engel
    ctx.save(); ctx.lineWidth = Math.max(2.2, kal * 1.6);
    cizgi(ctx, wx, yu, wx, cy - g2 / 2); cizgi(ctx, wx, cy + g2 / 2, wx, ya); ctx.restore();
    // Gelen düz cepheler
    ctx.save(); ctx.lineWidth = Math.max(1, kal * 0.8);
    for (let x = wx - lam; x > k.x + 16; x -= lam) cizgi(ctx, x, yu + 2, x, ya - 2);
    ctx.restore();
    if (ayarMantik(v, "isin")) { ctx.save(); ctx.lineWidth = Math.max(1.2, kal); ok(ctx, k.x + 8, cy, k.x + 8 + 28, cy, 6); ctx.restore(); }
    // Geçen cepheler: düz parça + iki dörtte bir yay
    kes(() => {
      ctx.lineWidth = Math.max(1, kal * 0.8);
      for (let j = 1; wx + j * lam < k.x + k.w; j++) {
        const r = j * lam;
        cizgi(ctx, wx + r, cy - g2 / 2, wx + r, cy + g2 / 2);
        ctx.beginPath(); ctx.arc(wx, cy - g2 / 2, r, -Math.PI / 2, 0); ctx.stroke();
        ctx.beginPath(); ctx.arc(wx, cy + g2 / 2, r, 0, Math.PI / 2); ctx.stroke();
      }
    });
    if (etiket) {
      const xa = wx - lam; // λ ölçüsü: iki gelen cephe arası
      if (xa - lam > k.x + 14) { ctx.save(); ctx.lineWidth = Math.max(0.8, kal * 0.55); olcuOku(ctx, xa - lam, yu + 8, xa, yu + 8, 4); ctx.restore(); fizikMetniCiz(ctx, "λ", xa - lam / 2, yu + 18, punto * 0.95); }
      const xo = wx + 8; ctx.save(); ctx.lineWidth = Math.max(0.8, kal * 0.55); olcuOku(ctx, xo, cy - g2 / 2, xo, cy + g2 / 2, 4); ctx.restore();
      fizikMetniCiz(ctx, "d", xo + 8, cy, punto * 0.95, "sol");
    }
  } else if (tip === "girisim") {
    const d = ayarSayi(v, "ara") * lam, sx = k.x + 36, s1 = cy - d / 2, s2 = cy + d / 2;
    kes(() => {
      ctx.save(); ctx.strokeStyle = "#c2c2c2"; ctx.lineWidth = 0.7;
      for (const sy of [s1, s2]) for (let j = 1; j * lam < k.w * 1.1; j++) { ctx.beginPath(); ctx.arc(sx, sy, j * lam, -Math.PI / 2, Math.PI / 2); ctx.stroke(); }
      ctx.restore();
      if (ayarMantik(v, "dugum")) {
        const hip = (c: number, kesikli: boolean) => {
          const a = c / 2, f = d / 2; if (a >= f - 1e-6) return;
          const b = Math.sqrt(f * f - a * a);
          for (const sg of [-1, 1]) {
            ctx.save(); ctx.lineWidth = kesikli ? Math.max(1.2, kal) : Math.max(1.3, kal * 1.1); if (kesikli) ctx.setLineDash([5, 4]);
            ctx.beginPath();
            for (let u = 0; u <= 3; u += 0.05) { const X = b * Math.sinh(u), Y = sg * a * Math.cosh(u); if (sx + X > k.x + k.w + 5) break; if (u === 0) ctx.moveTo(sx + X, cy + Y); else ctx.lineTo(sx + X, cy + Y); }
            ctx.stroke(); ctx.restore();
          }
        };
        for (let m = 0; (m + 0.5) * lam < d; m++) hip((m + 0.5) * lam, true);
        for (let m = 1; m * lam < d; m++) hip(m * lam, false);
        ctx.save(); ctx.lineWidth = Math.max(1.4, kal * 1.1); cizgi(ctx, sx, cy, k.x + k.w, cy); ctx.restore();
      }
    });
    for (const sy of [s1, s2]) { ctx.save(); ctx.beginPath(); ctx.arc(sx, sy, 3.4, 0, Math.PI * 2); ctx.fill(); ctx.restore(); }
    if (etiket) {
      if (ayarMantik(v, "dugum")) {
        const yl = k.y + k.h - 9, tx = "kesikli: düğüm (D) · düz: karın (K)";
        dolgu(ctx, () => ctx.fillRect(k.x + k.w / 2 - 112, yl - 8, 224, 15), "#fff");
        fizikMetniCiz(ctx, tx, k.x + k.w / 2, yl, punto * 0.85);
      }
      fizikMetniCiz(ctx, "S_1", sx - 8, s1, punto, "sag"); fizikMetniCiz(ctx, "S_2", sx - 8, s2, punto, "sag");
      if (ayarMantik(v, "dugum")) {
        const xk = k.x + k.w - 14;
        fizikMetniCiz(ctx, "K", xk, cy - 9, punto * 0.92);
      }
    }
  } else if (tip === "yansima") {
    const aci = (ayarSayi(v, "aci") * Math.PI) / 180, yz = k.y + k.h * 0.74, cx = k.x + k.w / 2, L = Math.min(k.h * 0.62, k.w * 0.36);
    // Yansıtıcı yüzey
    ctx.save(); ctx.lineWidth = Math.max(2, kal * 1.5); cizgi(ctx, k.x + 16, yz, k.x + k.w - 16, yz); ctx.restore();
    ctx.save(); ctx.lineWidth = Math.max(0.8, kal * 0.55); for (let x = k.x + 20; x < k.x + k.w - 18; x += 7) cizgi(ctx, x, yz, x - 6, yz + 7); ctx.restore();
    const dg = { x: -Math.sin(aci), y: -Math.cos(aci) }, yg = { x: Math.sin(aci), y: -Math.cos(aci) };
    const gel = { x: cx + dg.x * L, y: yz + dg.y * L }, yan = { x: cx + yg.x * L, y: yz + yg.y * L };
    if (ayarMantik(v, "normal")) { ctx.save(); ctx.lineWidth = Math.max(0.8, kal * 0.55); kesik(ctx, cx, yz, cx, yz - L - 14); ctx.restore(); if (etiket) fizikMetniCiz(ctx, "N", cx + 8, yz - L - 10, punto * 0.92, "sol"); }
    // Dalga cepheleri (ışına dik kısa parçalar)
    ctx.save(); ctx.lineWidth = Math.max(1, kal * 0.8);
    const cepheler = (merkez: { x: number; y: number }, yon: { x: number; y: number }) => {
      for (const s of [0.34, 0.66, 1.0]) {
        const px = cx + yon.x * L * s, py = yz + yon.y * L * s, dx = -yon.y, dy = yon.x;
        if (s === 1.0 && false) continue; cizgi(ctx, px - dx * 26, py - dy * 26, px + dx * 26, py + dy * 26);
      }
      void merkez;
    };
    cepheler(gel, dg); cepheler(yan, yg);
    ctx.restore();
    ctx.save(); ctx.lineWidth = Math.max(1.4, kal * 1.1);
    if (ayarMantik(v, "isin")) { ok(ctx, gel.x - dg.x * 0, gel.y - dg.y * 0, cx + dg.x * 14, yz + dg.y * 14, 7); ok(ctx, cx + yg.x * 14, yz + yg.y * 14, yan.x, yan.y, 7); }
    else { cizgi(ctx, gel.x, gel.y, cx, yz); cizgi(ctx, cx, yz, yan.x, yan.y); }
    ctx.restore();
    if (etiket) {
      aciYay(ctx, cx, yz, 40, -Math.PI / 2 - aci, -Math.PI / 2, "i", punto, kal);
      aciYay(ctx, cx, yz, 40, -Math.PI / 2, -Math.PI / 2 + aci, "r", punto, kal);
    }
  } else {
    // Kırılma: derin (üst) → sığ (alt)
    const i = (ayarSayi(v, "aci") * Math.PI) / 180, oran = ayarSayi(v, "oran"), r = Math.asin(Math.sin(i) / oran);
    const yb = k.y + k.h * 0.5, cx = k.x + k.w * 0.5, L = Math.min(k.h * 0.42, k.w * 0.3);
    dolgu(ctx, () => ctx.fillRect(k.x + 8, yb, k.w - 16, k.h - (yb - k.y) - 8), "#f0f0f0");
    ctx.save(); ctx.lineWidth = Math.max(1.4, kal); cizgi(ctx, k.x + 8, yb, k.x + k.w - 8, yb); ctx.restore();
    if (ayarMantik(v, "normal")) { ctx.save(); ctx.lineWidth = Math.max(0.8, kal * 0.55); kesik(ctx, cx, yb - L - 12, cx, yb + L + 12); ctx.restore(); if (etiket) fizikMetniCiz(ctx, "N", cx + 8, yb - L - 8, punto * 0.92, "sol"); }
    const dg = { x: -Math.sin(i), y: -Math.cos(i) }, dk = { x: Math.sin(r), y: Math.cos(r) }; // ışın yönü: gelen ışının kaynağı / kırılan ışının gidişi
    const gel = { x: cx + dg.x * L, y: yb + dg.y * L }, kir = { x: cx + dk.x * L, y: yb + dk.y * L };
    // Cepheler: üstte λ₁, altta λ₂ = λ₁ / oran
    const lam2 = lam / oran;
    kes(() => {
      ctx.save(); ctx.beginPath(); ctx.rect(k.x + 8, k.y + 4, k.w - 16, yb - k.y - 4); ctx.clip(); ctx.lineWidth = Math.max(1, kal * 0.8);
      for (let s = lam * 0.5; s < L + 20; s += lam) { const px = cx + dg.x * s, py = yb + dg.y * s; cizgi(ctx, px + dg.y * 60, py - dg.x * 60, px - dg.y * 60, py + dg.x * 60); }
      ctx.restore();
      ctx.save(); ctx.beginPath(); ctx.rect(k.x + 8, yb, k.w - 16, k.h - (yb - k.y) - 8); ctx.clip(); ctx.lineWidth = Math.max(1, kal * 0.8);
      for (let s = lam2 * 0.5; s < L + 30; s += lam2) { const px = cx + dk.x * s, py = yb + dk.y * s; cizgi(ctx, px + dk.y * 60, py - dk.x * 60, px - dk.y * 60, py + dk.x * 60); }
      ctx.restore();
    });
    ctx.save(); ctx.lineWidth = Math.max(1.4, kal * 1.1);
    if (ayarMantik(v, "isin")) { ok(ctx, gel.x, gel.y, cx + dg.x * 3, yb + dg.y * 3, 7); ok(ctx, cx + dk.x * 3, yb + dk.y * 3, kir.x, kir.y, 7); }
    else { cizgi(ctx, gel.x, gel.y, cx, yb); cizgi(ctx, cx, yb, kir.x, kir.y); }
    ctx.restore();
    if (etiket) {
      aciYay(ctx, cx, yb, 36, -Math.PI / 2 - i, -Math.PI / 2, "i", punto, kal);
      aciYay(ctx, cx, yb, 36, Math.PI / 2 - r, Math.PI / 2, "r", punto, kal, 60);
      fizikMetniCiz(ctx, "derin (v_1)", k.x + 14, yb - 12, punto * 0.9, "sol");
      fizikMetniCiz(ctx, "sığ (v_2)", k.x + 14, yb + 12, punto * 0.9, "sol");
    }
  }
  ctx.restore();
}

// ════════════════════════════════════════════════════════════════════════════
export function dalgaCiz(ctx: Ctx, v: CografyaVerisi, k: Kutu): boolean {
  switch (v.yapi) {
    case "atma": atmaCiz(ctx, v, k); return true;
    case "dalga": dalgaCizimi(ctx, v, k); return true;
    case "rezonans": rezonansCiz(ctx, v, k); return true;
    case "doppler": dopplerCiz(ctx, v, k); return true;
    case "kirinim": kirinimCiz(ctx, v, k); return true;
    default: return false;
  }
}

export function dalgaOzet(v: CografyaVerisi): string | null | undefined {
  switch (v.yapi) {
    case "atma": {
      const t = ayarSayi(v, "t"); let mx = 0;
      for (let x = 0; x <= NK; x += 0.25) mx = Math.max(mx, Math.abs(atmaYuksekligi(v, x, t)));
      const tip = ayarSec(v, "tip");
      const not = tip === "sabit" ? "sabit uçta atma ters döner" : tip === "serbest" ? "serbest uçta atma aynı yönde döner" : tip === "yapici" ? "atmalar aynı yönlüyse genlikler toplanır" : tip === "yikici" ? "zıt yönlü atmalar karşılaşınca genlikler çıkarılır" : "atma şekil değiştirmeden ilerler";
      return `t = ${sayiYaz(t, 0)} s'de en büyük sapma = ${sayiYaz(mx, 1)} kare · ${not} · hız 1 kare/s`;
    }
    case "dalga": {
      const h = dalgaHesap(v);
      return `λ = ${sayiYaz(h.lamCm, 0)} cm · A = ${sayiYaz(h.A, 0)} cm · T = ${sayiYaz(h.T)} s · f = ${sayiYaz(h.f, 2)} Hz · v = λ/T = ${sayiYaz(h.v, 2)} m/s`;
    }
    case "rezonans": {
      const h = rezonansHesap(v);
      const ad = h.tip === "kapali" ? `${h.harmonik}. harmonik (yalnız tek harmonikler), L = ${h.harmonik}λ/4` : `${h.harmonik}. harmonik, L = ${h.harmonik}λ/2`;
      return `${ad} · λ = ${sayiYaz(h.lam, 3)} m · f = v/λ = ${sayiYaz(h.f, 1)} Hz`;
    }
    case "doppler": {
      const o = ayarSayi(v, "oran");
      if (o >= 1) return `Kaynak sesten hızlı (vₖ/v = ${sayiYaz(o)}): cepheler Mach konisi oluşturur, sin θ = v/vₖ = ${sayiYaz(1 / o, 2)}`;
      return `Önündeki gözlemci f·v/(v − vₖ) = ${sayiYaz(1 / (1 - o), 2)}·f, arkadaki f·v/(v + vₖ) = ${sayiYaz(1 / (1 + o), 2)}·f duyar`;
    }
    case "kirinim": {
      const tip = ayarSec(v, "tip");
      if (tip === "yansima") return `Yansıma kanunu: gelme açısı = yansıma açısı = ${sayiYaz(ayarSayi(v, "aci"), 0)}° · λ ve v değişmez`;
      if (tip === "kirilma") { const i = (ayarSayi(v, "aci") * Math.PI) / 180, r = Math.asin(Math.sin(i) / ayarSayi(v, "oran")); return `sin i / sin r = v₁/v₂ = λ₁/λ₂ = ${sayiYaz(ayarSayi(v, "oran"))} → r = ${sayiYaz((r * 180) / Math.PI, 1)}° · frekans değişmez`; }
      if (tip === "kirinim") { const g = ayarSayi(v, "yarik"); return g <= 1.5 ? `Aralık λ'ya yakın (d = ${sayiYaz(g)}λ): kırınım belirgin, cepheler daireselleşir` : `Aralık λ'dan çok büyük (d = ${sayiYaz(g)}λ): kırınım yalnız kenarlarda`; }
      const d = ayarSayi(v, "ara");
      let dug = 0; for (let m = 0; (m + 0.5) < d; m++) dug += 1;
      return `S₁S₂ = ${sayiYaz(d)}λ: iki yanda toplam ${2 * dug} düğüm çizgisi · yapıcı: Δx = nλ, yıkıcı: Δx = (n+½)λ`;
    }
    default: return undefined;
  }
}
