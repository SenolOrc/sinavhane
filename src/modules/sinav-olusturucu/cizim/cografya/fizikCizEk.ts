// Fizik şekilleri – ek paketlerin çizimi (akışkanlar, dalgalar, elektrik–manyetizma, çembersel hareket,
// hareket kavramları, madde ve doğası). Saf çizim: veri (ayar tablosu) → tuval. Yalnız gri/siyah.
import { fizikMetniCiz } from "../fizik";
import { ayarMantik, ayarMetin, ayarSayi, ayarSec, type CografyaVerisi } from "./sema";
import { bol, cizgi, dolgu, duzgun, kesik, ok, olcuOku, puntoOlc, sayiYaz, zemin, type Kutu } from "./fizikYardim";
import { dalgaCiz, dalgaOzet } from "./fizikCizDalga";
import { elektrikCiz, elektrikOzet } from "./fizikCizElektrik";

type Ctx = CanvasRenderingContext2D;

// ════════════════════════════════════════════════════════════════════════════
// PAKET 1 — AKIŞKANLAR
// ════════════════════════════════════════════════════════════════════════════

/** Torricelli: derinlikteki delikten çıkış hızı v = √(2gd), menzil x = 2√(d(h − d)). */
export function torricelliHesapla(h: number, d: number, g = 10) {
  const dd = Math.min(Math.max(d, 0), h);
  return { v: Math.sqrt(2 * g * dd), x: 2 * Math.sqrt(dd * (h - dd)), yuk: h - dd };
}
const torricelliDelikleri = (v: CografyaVerisi) => {
  const h = ayarSayi(v, "h");
  return ["d1", "d2", "d3"].map((a, i) => ({ i: i + 1, d: ayarSayi(v, a) })).filter((o) => o.d > 0 && o.d < h);
};

function torricelliCiz(ctx: Ctx, v: CografyaVerisi, k: Kutu) {
  const punto = puntoOlc(k), kal = ctx.lineWidth, g = ayarSayi(v, "g");
  const h = ayarSayi(v, "h"), delik = torricelliDelikleri(v);
  const veri = ayarMantik(v, "veri"), deger = ayarMantik(v, "deger"), menzilYaz = ayarMantik(v, "menzil"), gaz = ayarMantik(v, "gaz");
  const solPay = deger ? 58 : 38, tw = 96, ust = 22, alt = menzilYaz ? 46 : 14, cap = gaz ? 22 : 12;
  const taban = k.y + k.h - alt;
  const maxR = Math.max(1e-6, ...delik.map((o) => torricelliHesapla(h, o.d, g).x), 0.4 * h);
  const scDik = (taban - k.y - ust - cap) / h;
  const scYat = (k.w - solPay - tw - 14) / maxR;
  const sc = Math.min(scDik, scYat);
  const xl = k.x + solPay, xr = xl + tw, yS = taban - h * sc, yTop = yS - cap;
  ctx.save(); ctx.lineJoin = "round";
  if (ayarMantik(v, "yer")) { const kz = ctx.lineWidth; zemin(ctx, k.x + 6, k.x + k.w - 6, taban); ctx.lineWidth = kz; }
  // Sıvı
  dolgu(ctx, () => ctx.fillRect(xl, yS, tw, taban - yS));
  // Kap: sol duvar, taban, sağ duvar (deliklerde boşluk)
  const yD = delik.map((o) => taban - (h - o.d) * sc);
  ctx.beginPath(); ctx.moveTo(xl, yTop); ctx.lineTo(xl, taban); ctx.lineTo(xr, taban); ctx.stroke();
  let y0 = yTop;
  for (const yy of [...yD].sort((a, b) => a - b)) { cizgi(ctx, xr, y0, xr, yy - 2.5); y0 = yy + 2.5; }
  cizgi(ctx, xr, y0, xr, taban);
  if (gaz) cizgi(ctx, xl, yTop, xr, yTop);
  // Yüzey (dalgalı kısa çizgi) ve gaz yazısı
  ctx.save(); ctx.lineWidth = Math.max(0.9, kal * 0.7);
  if (!gaz) { cizgi(ctx, xl + 2, yS, xr - 2, yS); }
  else { cizgi(ctx, xl + 2, yS, xr - 2, yS); fizikMetniCiz(ctx, "P", (xl + xr) / 2, (yTop + yS) / 2, punto); }
  ctx.restore();
  // h ölçüsü (soldan)
  const hx = xl - 16;
  ctx.save(); ctx.lineWidth = Math.max(0.8, kal * 0.55);
  kesik(ctx, hx - 4, yS, xl, yS, [2, 2]); olcuOku(ctx, hx, yS, hx, taban, 5);
  ctx.restore();
  fizikMetniCiz(ctx, deger ? `h = ${sayiYaz(h)} m` : "h", hx - 5, (yS + taban) / 2, punto * 0.95, "sag");
  // Delik başına: derinlik oku, sıvı jeti, menzil işareti
  const menzilleri = delik.map((o) => torricelliHesapla(h, o.d, g).x);
  delik.forEach((o, idx) => {
    const yh = yD[idx], hs = torricelliHesapla(h, o.d, g), Hh = hs.yuk;
    const yakin = menzilleri.slice(0, idx).some((r) => Math.abs(r - hs.x) * sc < 26);
    const ax = xl + 12 + idx * 22;
    ctx.save(); ctx.lineWidth = Math.max(0.8, kal * 0.55);
    kesik(ctx, ax, yh, xr, yh, [2, 3]); olcuOku(ctx, ax, yS + 0.5, ax, yh, 4);
    ctx.restore();
    if (veri || deger) fizikMetniCiz(ctx, deger ? `${sayiYaz(o.d)} m` : `d_${o.i}`, ax + 4, yh - punto * 0.65, punto * 0.85, "sol");
    // Jet: y(x) = Hh − x²/(4d)
    ctx.beginPath();
    const N = 48;
    for (let s = 0; s <= N; s++) {
      const x = (hs.x * s) / N, y = Math.max(0, Hh - (x * x) / (4 * o.d));
      const X = xr + x * sc, Y = taban - y * sc;
      if (s === 0) ctx.moveTo(X, Y); else ctx.lineTo(X, Y);
    }
    ctx.save(); ctx.lineWidth = Math.max(1.1, kal); ctx.stroke(); ctx.restore();
    if (ayarMantik(v, "hizOk")) {
      ctx.save(); ctx.lineWidth = Math.max(1.1, kal);
      ok(ctx, xr + 1, yh, xr + 24, yh, 6); ctx.restore();
      fizikMetniCiz(ctx, `vec(v)_${o.i}`, xr + 28, yh - punto * 0.55, punto * 0.85, "sol");
    }
    if (menzilYaz) {
      const xe = xr + hs.x * sc;
      ctx.save(); ctx.lineWidth = Math.max(0.8, kal * 0.55);
      cizgi(ctx, xe, taban - 3, xe, taban + 4);
      ctx.restore();
      fizikMetniCiz(ctx, deger ? `${sayiYaz(hs.x)} m` : `x_${o.i}`, xe, taban + 15 + (yakin ? punto * 1.0 : 0), punto * 0.85);
    }
  });
  ctx.restore();
}

// ── Bernoulli (Venturi / kesiti değişen boru / yükseklik farkı)
function bernoulliSonuc(v: CografyaVerisi) {
  const a1 = ayarSayi(v, "a1"), a2 = ayarSayi(v, "a2"), v1 = ayarSayi(v, "v1"), dh = ayarSayi(v, "dh");
  const v2 = (v1 * a1) / a2, tip = ayarSec(v, "tip");
  const dP = 0.5 * 1000 * (v2 * v2 - v1 * v1) + (tip === "yukseklik" ? 1000 * 10 * dh : 0);
  return { a1, a2, v1, v2, dh, dP, tip };
}
const hwOf = (a: number) => 6 + 26 * Math.sqrt(Math.max(1, Math.min(100, a)) / 100);

function bernoulliCiz(ctx: Ctx, v: CografyaVerisi, k: Kutu) {
  const b = bernoulliSonuc(v), punto = puntoOlc(k), kal = ctx.lineWidth;
  const veri = ayarMantik(v, "veri"), sonuc = ayarMantik(v, "sonuc");
  const venturi = b.tip === "venturi", yuk = b.tip === "yukseklik";
  const x0 = k.x + 28, x1 = k.x + k.w - (b.tip === "yukseklik" ? 62 : 28), W = x1 - x0;
  const hw1 = hwOf(b.a1), hw2 = hwOf(b.a2);
  const tup = venturi ? 62 : 0, yuksPx = yuk ? Math.min(70, 16 + b.dh * 9) : 0;
  const cy1 = venturi ? k.y + 30 + tup + hw1 + 6 : yuk ? k.y + k.h - 62 - hw1 : k.y + k.h * 0.42;
  const cy2 = yuk ? cy1 - yuksPx : cy1;
  // Profil: t∈[0,1] → eksen y ve yarı genişlik
  const prof = (t: number) => {
    if (venturi) {
      const a = duzgun((t - 0.26) / 0.16), c = duzgun((t - 0.58) / 0.16);
      return { cy: cy1, hw: hw1 + (hw2 - hw1) * (a - c) };
    }
    if (yuk) { const s = duzgun((t - 0.34) / 0.3); return { cy: cy1 + (cy2 - cy1) * s, hw: hw1 + (hw2 - hw1) * s }; }
    const s = duzgun((t - 0.42) / 0.14);
    return { cy: cy1, hw: hw1 + (hw2 - hw1) * s };
  };
  const N = 80, P = (t: number, f = 1) => { const p = prof(t); return { x: x0 + W * t, y: p.cy + p.hw * f }; };
  ctx.save(); ctx.lineJoin = "round"; ctx.lineCap = "round";
  // Boru gövdesi (sıvı dolgusu) + kenarlar
  ctx.beginPath();
  for (let i = 0; i <= N; i++) { const q = P(i / N, -1); if (i === 0) ctx.moveTo(q.x, q.y); else ctx.lineTo(q.x, q.y); }
  for (let i = N; i >= 0; i--) { const q = P(i / N, 1); ctx.lineTo(q.x, q.y); }
  ctx.closePath(); dolgu(ctx, () => ctx.fill(), "#f4f4f4");
  for (const f of [-1, 1]) {
    ctx.beginPath();
    for (let i = 0; i <= N; i++) { const q = P(i / N, f); if (i === 0) ctx.moveTo(q.x, q.y); else ctx.lineTo(q.x, q.y); }
    ctx.stroke();
  }
  // Uçlarda açık gösterim: kesikli ağız çizgileri
  for (const t of [0, 1]) { const a = P(t, -1), c = P(t, 1); ctx.save(); ctx.lineWidth = Math.max(0.8, kal * 0.55); kesik(ctx, a.x, a.y, c.x, c.y, [2, 3]); ctx.restore(); }
  // Akım çizgileri
  if (ayarMantik(v, "akim")) {
    ctx.save(); ctx.lineWidth = Math.max(0.8, kal * 0.55);
    for (const f of [-0.6, 0, 0.6]) {
      ctx.beginPath();
      for (let i = 0; i <= N; i++) { const q = P(i / N, f); if (i === 0) ctx.moveTo(q.x, q.y); else ctx.lineTo(q.x, q.y); }
      ctx.stroke();
    }
    ctx.restore();
  }
  // Akış yönü oku (boruya girmeden)
  if (ayarMantik(v, "yonOk")) {
    const p = prof(0);
    ctx.save(); ctx.lineWidth = Math.max(1.2, kal);
    ok(ctx, x0 - 22, p.cy, x0 - 3, p.cy, 6);
    ctx.restore();
  }
  // Manometre tüpleri (Venturi)
  if (venturi) {
    const tw = 12, tx1 = x0 + W * 0.13, tx2 = x0 + W * 0.5;
    const ustY = cy1 - hw1 - tup, tabanY = (xx: number) => { const t = (xx - x0) / W; const p = prof(t); return p.cy - p.hw; };
    const fark = Math.max(6, Math.min(34, Math.abs(b.v2 * b.v2 - b.v1 * b.v1) / 20 * 8));
    const baz = ustY + tup * 0.52;
    const yl = b.v2 > b.v1 ? baz - fark / 2 : baz + fark / 2, yr = b.v2 > b.v1 ? baz + fark / 2 : baz - fark / 2;
    const tup1 = tabanY(tx1), tup2 = tabanY(tx2);
    for (const [tx, ty, yl2] of [[tx1, tup1, yl], [tx2, tup2, yr]] as const) {
      dolgu(ctx, () => ctx.fillRect(tx - tw / 2, yl2, tw, ty - yl2 + 1), "#f4f4f4");
      cizgi(ctx, tx - tw / 2, ustY, tx - tw / 2, ty); cizgi(ctx, tx + tw / 2, ustY, tx + tw / 2, ty);
      cizgi(ctx, tx - tw / 2, yl2, tx + tw / 2, yl2);
    }
    // Seviye farkı ölçüsü
    const dx = tx2 + tw / 2 + 22;
    ctx.save(); ctx.lineWidth = Math.max(0.8, kal * 0.55);
    kesik(ctx, tx1 + tw / 2, yl, dx + 6, yl, [2, 3]); kesik(ctx, tx2 + tw / 2, yr, dx + 6, yr, [2, 3]);
    ctx.restore();
    if (Math.abs(yl - yr) > 4) { olcuOku(ctx, dx, yl, dx, yr, 4); fizikMetniCiz(ctx, "Δh", dx + 8, (yl + yr) / 2, punto * 0.9, "sol"); }
    if (ayarMantik(v, "p")) { fizikMetniCiz(ctx, "P_1", tx1, ustY - 9, punto * 0.95); fizikMetniCiz(ctx, "P_2", tx2, ustY - 9, punto * 0.95); }
  } else if (ayarMantik(v, "p")) {
    const p1 = prof(0.12), p2 = prof(0.84);
    ctx.save(); ctx.fillStyle = "#000";
    for (const p of [p1, p2]) { ctx.beginPath(); ctx.arc(x0 + W * (p === p1 ? 0.12 : 0.84), p.cy, 2.4, 0, Math.PI * 2); ctx.fill(); }
    ctx.restore();
    fizikMetniCiz(ctx, "P_1", x0 + W * 0.12 + 5, p1.cy - p1.hw * 0.0 - 7, punto * 0.9, "sol");
    fizikMetniCiz(ctx, "P_2", x0 + W * 0.84 + 5, p2.cy - 7, punto * 0.9, "sol");
  }
  // Yükseklik farkı ölçüsü
  if (yuk) {
    const hx = x1 + 6;
    ctx.save(); ctx.lineWidth = Math.max(0.8, kal * 0.55);
    kesik(ctx, x0 + W * 0.05, cy1, hx + 8, cy1, [2, 3]); olcuOku(ctx, hx + 2, cy1, hx + 2, cy2, 4);
    ctx.restore();
    fizikMetniCiz(ctx, veri ? `h = ${sayiYaz(b.dh)} m` : "h", hx + 2, (cy1 + cy2) / 2, punto * 0.9, "sol");
  }
  // Kesit / hız yazıları
  const p1 = prof(0.08), p2 = prof(yuk ? 0.8 : venturi ? 0.5 : 0.84);
  const v2Yazi = sonuc ? `v_2 = ${sayiYaz(b.v2)} m/s` : "v_2";
  fizikMetniCiz(ctx, veri ? `A_1 = ${sayiYaz(b.a1, 0)} cm²` : "A_1", x0 + W * 0.08, p1.cy + p1.hw + punto * 0.95, punto * 0.92, "orta");
  fizikMetniCiz(ctx, veri ? `v_1 = ${sayiYaz(b.v1)} m/s` : "v_1", x0 + W * 0.08, p1.cy + p1.hw + punto * 2.2, punto * 0.92, "orta");
  const x2 = x0 + W * (yuk ? 0.8 : venturi ? 0.5 : 0.84);
  const y2a = yuk ? p2.cy - p2.hw - punto * 2.4 : p2.cy + p2.hw + punto * 0.95, y2b = yuk ? p2.cy - p2.hw - punto * 1.1 : p2.cy + p2.hw + punto * 2.2;
  fizikMetniCiz(ctx, veri ? `A_2 = ${sayiYaz(b.a2, 0)} cm²` : "A_2", x2, y2a, punto * 0.92, "orta");
  fizikMetniCiz(ctx, v2Yazi, x2, y2b, punto * 0.92, "orta");
  ctx.restore();
}

// ── Hidrolik pres
export function hidrolikF2(v: CografyaVerisi) {
  const a1 = ayarSayi(v, "a1"), a2 = ayarSayi(v, "a2"), f1 = ayarSayi(v, "f1");
  return { a1, a2, f1, f2: (f1 * a2) / a1, oran: a1 / a2 };
}
function hidrolikCiz(ctx: Ctx, v: CografyaVerisi, k: Kutu) {
  const h = hidrolikF2(v), punto = puntoOlc(k), kal = ctx.lineWidth, veri = ayarMantik(v, "veri");
  const w = (a: number) => 14 + 46 * Math.sqrt(Math.min(400, a) / 400);
  const w1 = w(h.a1), w2 = w(h.a2);
  const cxl = k.x + k.w * 0.24, cxr = k.x + k.w * 0.64;
  const base = k.y + k.h - 40, tabanKanal = base + 2, kanalH = 16;
  const ust = k.y + 70;
  const dl = 26, dr = Math.max(3, dl * h.oran);
  const pl = ust + 30 + dl, pr = ust + 30 - dr; // piston üst yüzeyleri
  ctx.save(); ctx.lineJoin = "round";
  // Sıvı
  dolgu(ctx, () => {
    ctx.beginPath();
    ctx.rect(cxl - w1 / 2, pl + 7, w1, base - pl - 7 + 0.5);
    ctx.rect(cxr - w2 / 2, pr + 7, w2, base - pr - 7 + 0.5);
    ctx.rect(cxl - w1 / 2, base - kanalH + 2, cxr - cxl + w2 / 2 + w1 / 2, kanalH - 2);
    ctx.fill();
  });
  // Kap çizgileri
  const xl0 = cxl - w1 / 2, xl1 = cxl + w1 / 2, xr0 = cxr - w2 / 2, xr1 = cxr + w2 / 2;
  ctx.beginPath(); ctx.moveTo(xl0, ust); ctx.lineTo(xl0, tabanKanal); ctx.lineTo(xr1, tabanKanal); ctx.lineTo(xr1, ust); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(xl1, ust); ctx.lineTo(xl1, base - kanalH); ctx.lineTo(xr0, base - kanalH); ctx.lineTo(xr0, ust); ctx.stroke();
  // Pistonlar
  for (const [cx, w0, y] of [[cxl, w1, pl], [cxr, w2, pr]] as const) {
    dolgu(ctx, () => ctx.fillRect(cx - w0 / 2 + 1, y, w0 - 2, 7), "#bdbdbd");
    ctx.strokeRect(cx - w0 / 2 + 1, y, w0 - 2, 7);
  }
  // Küçük piston: çubuk + F1
  ctx.save(); ctx.lineWidth = Math.max(1.2, kal);
  ok(ctx, cxl, pl - 40, cxl, pl - 2, 7);
  ctx.restore();
  fizikMetniCiz(ctx, veri ? `F_1 = ${sayiYaz(h.f1, 0)} N` : "F_1", xl0 - 8, pl - 26, punto, "sag");
  // Büyük piston: yük kutusu + F2
  if (ayarMantik(v, "yuk")) {
    const bw = Math.min(w2 - 6, 52), bh = 26;
    dolgu(ctx, () => ctx.fillRect(cxr - bw / 2, pr - bh, bw, bh), "#d9d9d9");
    ctx.strokeRect(cxr - bw / 2, pr - bh, bw, bh);
    fizikMetniCiz(ctx, ayarMetin(v, "yukAd"), cxr, pr - bh / 2, punto);
  }
  const sonuc = ayarSec(v, "sonuc");
  const f2Yazi = sonuc === "soru" ? "F_2 = ?" : sonuc === "deger" ? `F_2 = ${sayiYaz(h.f2, 0)} N` : "F_2";
  ctx.save(); ctx.lineWidth = Math.max(1.2, kal);
  const fx = xr1 + 18;
  ok(ctx, fx, pr + 4, fx, pr - 34, 7);
  ctx.restore();
  fizikMetniCiz(ctx, f2Yazi, fx + 7, pr - 14, punto, "sol");
  // Kesit alanları
  fizikMetniCiz(ctx, veri ? `A_1 = ${sayiYaz(h.a1, 0)} cm²` : "A_1", cxl, tabanKanal + 14, punto * 0.92);
  fizikMetniCiz(ctx, veri ? `A_2 = ${sayiYaz(h.a2, 0)} cm²` : "A_2", cxr, tabanKanal + 14, punto * 0.92);
  // Piston yolları (silindirlerin arasında)
  if (ayarMantik(v, "yol")) {
    const y1a = ust + 30, ax = xl1 + 12, bx = xr0 - 12;
    ctx.save(); ctx.lineWidth = Math.max(0.8, kal * 0.55);
    kesik(ctx, xl1, y1a, ax + 4, y1a, [2, 2]); olcuOku(ctx, ax, y1a, ax, pl, 4);
    kesik(ctx, xr0, y1a, bx - 4, y1a, [2, 2]); olcuOku(ctx, bx, y1a, bx, pr, 3);
    ctx.restore();
    fizikMetniCiz(ctx, "x_1", ax + 7, (y1a + pl) / 2, punto * 0.9, "sol");
    fizikMetniCiz(ctx, "x_2", bx - 7, (y1a + pr) / 2 + 2, punto * 0.9, "sag");
  }
  ctx.restore();
}

// ── Manometre (U borusu)
export function manometreBasinc(v: CografyaVerisi) {
  const fark = ayarSayi(v, "fark"), rho = ayarSayi(v, "rho");
  return { fark, rho, pa: rho * 1000 * 10 * (Math.abs(fark) / 100) };
}
function manometreCiz(ctx: Ctx, v: CografyaVerisi, k: Kutu) {
  const punto = puntoOlc(k), kal = ctx.lineWidth, tip = ayarSec(v, "tip");
  const m = manometreBasinc(v), ad = bol(ayarMetin(v, "adlar"));
  const veri = ayarMantik(v, "veri"), kapAd = ayarMantik(v, "kapAd");
  const sc = 2.4, cx = k.x + k.w * 0.4, ayr = 84, hw = 6;
  const xl = cx - ayr / 2, xr = cx + ayr / 2;
  const ym = k.y + 104, ustY = k.y + 48, yb = ym + sc * 20 + 14;
  const yL = ym + (m.fark * sc) / 2, yR = ym - (m.fark * sc) / 2;
  ctx.save(); ctx.lineJoin = "round";
  // Sıvı dolgusu
  dolgu(ctx, () => {
    ctx.beginPath();
    ctx.moveTo(xl - hw, yL); ctx.lineTo(xl - hw, yb + 2 * hw); ctx.lineTo(xr + hw, yb + 2 * hw); ctx.lineTo(xr + hw, yR);
    ctx.lineTo(xr - hw, yR); ctx.lineTo(xr - hw, yb); ctx.lineTo(xl + hw, yb); ctx.lineTo(xl + hw, yL); ctx.closePath(); ctx.fill();
  });
  // U borusu çizgileri
  ctx.beginPath(); ctx.moveTo(xl - hw, ustY); ctx.lineTo(xl - hw, yb + 2 * hw); ctx.lineTo(xr + hw, yb + 2 * hw); ctx.lineTo(xr + hw, ustY); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(xl + hw, ustY); ctx.lineTo(xl + hw, yb); ctx.lineTo(xr - hw, yb); ctx.lineTo(xr - hw, ustY); ctx.stroke();
  cizgi(ctx, xl - hw, yL, xl + hw, yL); cizgi(ctx, xr - hw, yR, xr + hw, yR);
  // Gaz kapları
  const kap = (x: number, yy: number, metin: string) => {
    dolgu(ctx, () => { ctx.beginPath(); ctx.roundRect(x - 30, yy - 34, 60, 34, 8); ctx.fill(); }, "#fff");
    ctx.beginPath(); ctx.roundRect(x - 30, yy - 34, 60, 34, 8); ctx.stroke();
    if (kapAd && metin) fizikMetniCiz(ctx, metin, x, yy - 17, punto);
  };
  kap(xl, ustY, ad[0] ?? "Gaz");
  if (tip === "ikiGaz") kap(xr, ustY, ad[1] ?? "Gaz");
  else if (tip === "kapali") {
    cizgi(ctx, xr - hw, ustY, xr + hw, ustY);
    ctx.save(); ctx.lineWidth = Math.max(0.7, kal * 0.5);
    for (let x = xr - hw + 2; x < xr + hw; x += 4) cizgi(ctx, x, ustY, x + 2, ustY - 5);
    ctx.restore();
    if (kapAd) fizikMetniCiz(ctx, "boşluk", xr + hw + 6, ustY + 14, punto * 0.85, "sol");
  } else {
    ctx.save(); ctx.lineWidth = Math.max(1.2, kal);
    ok(ctx, xr, ustY - 30, xr, ustY - 3, 6); ctx.restore();
    if (kapAd) fizikMetniCiz(ctx, ad[1] ?? "P_0", xr + 8, ustY - 20, punto, "sol");
  }
  // Seviye çizgileri ve h ölçüsü
  const dx = xr + hw + 30;
  if (ayarMantik(v, "seviye")) {
    ctx.save(); ctx.lineWidth = Math.max(0.8, kal * 0.55);
    kesik(ctx, xl + hw + 2, yL, dx + 6, yL, [2, 3]); kesik(ctx, xr + hw + 2, yR, dx + 6, yR, [2, 3]);
    ctx.restore();
  }
  if (Math.abs(yL - yR) > 3) {
    ctx.save(); ctx.lineWidth = Math.max(0.8, kal * 0.55);
    if (!ayarMantik(v, "seviye")) { kesik(ctx, xr + hw + 2, yR, dx + 6, yR, [2, 3]); kesik(ctx, xr + hw + 2, yL, dx + 6, yL, [2, 3]); }
    ctx.restore();
    olcuOku(ctx, dx, yL, dx, yR, 4);
    fizikMetniCiz(ctx, veri ? `h = ${sayiYaz(Math.abs(m.fark), 0)} cm` : "h", dx + 8, (yL + yR) / 2, punto, "sol");
  }
  if (kapAd && ad[2]) fizikMetniCiz(ctx, ad[2], cx, yb + 2 * hw + 14, punto * 0.92);
  ctx.restore();
}

// ════════════════════════════════════════════════════════════════════════════
// Dağıtıcı
// ════════════════════════════════════════════════════════════════════════════

export function fizikEkCiz(ctx: Ctx, v: CografyaVerisi, k: Kutu): boolean {
  if (dalgaCiz(ctx, v, k) || elektrikCiz(ctx, v, k)) return true;
  switch (v.yapi) {
    case "torricelli": torricelliCiz(ctx, v, k); return true;
    case "bernoulli": bernoulliCiz(ctx, v, k); return true;
    case "hidrolik": hidrolikCiz(ctx, v, k); return true;
    case "manometre": manometreCiz(ctx, v, k); return true;
    default: return false;
  }
}

/** Öğretmene hesap özeti (panelde gösterilir; şekle yazılmaz). */
export function fizikEkHesapOzeti(v: CografyaVerisi): string | null | undefined {
  const d = dalgaOzet(v) ?? elektrikOzet(v);
  if (d !== undefined) return d;
  switch (v.yapi) {
    case "torricelli": {
      const g = ayarSayi(v, "g"), h = ayarSayi(v, "h");
      const l = torricelliDelikleri(v);
      if (!l.length) return "Delik derinliği 0 < d < h olmalı.";
      const parca = l.map((o) => { const r = torricelliHesapla(h, o.d, g); return `d${o.i}: v = ${sayiYaz(r.v)} m/s, x = ${sayiYaz(r.x)} m`; });
      return `${parca.join(" · ")} · en uzak menzil d = h/2 derinlikteki delikte (x = h = ${sayiYaz(h)} m)`;
    }
    case "bernoulli": {
      const b = bernoulliSonuc(v);
      return `A₁v₁ = A₂v₂ → v₂ = ${sayiYaz(b.v2)} m/s · P₁ − P₂ = ${sayiYaz(b.dP, 0)} Pa (ρ = 1000 kg/m³, g = 10 m/s²)`;
    }
    case "hidrolik": {
      const h = hidrolikF2(v);
      return `F₂ = F₁·A₂/A₁ = ${sayiYaz(h.f2)} N · basınç P = F₁/A₁ = ${sayiYaz(h.f1 / (h.a1 / 10000), 0)} Pa · piston yolları x₂ = x₁·A₁/A₂ (oran ${sayiYaz(h.oran, 2)})`;
    }
    case "manometre": {
      const m = manometreBasinc(v), tip = ayarSec(v, "tip");
      const f = `ρ·g·h = ${sayiYaz(m.pa, 0)} Pa`;
      return tip === "acik" ? `Gaz basıncı P = P₀ ${m.fark >= 0 ? "+" : "−"} ${f}` : tip === "kapali" ? `Gaz basıncı P = ${f} (kapalı uç boşluk)` : `P_sol − P_sağ = ${m.fark >= 0 ? "+" : "−"}${f}`;
    }
    default: return undefined;
  }
}
