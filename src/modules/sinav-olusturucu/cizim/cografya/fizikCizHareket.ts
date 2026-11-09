// Fizik şekilleri – Paket 5: yol/yer değiştirme, bağıl hareket, serbest düşme/düşey atış, stroboskop, hareket grafikleri.
import { fizikMetniCiz, fizikMetniOlcu } from "../fizik";
import { ayarMantik, ayarSayi, ayarSayilar, ayarSec, type CografyaVerisi } from "./sema";
import { cizgi, kesik, kokluIle, ok, puntoOlc, sayiYaz, vecAd, type Kutu } from "./fizikYardim";

type Ctx = CanvasRenderingContext2D;
const PI = Math.PI;
const HARF = "ABCDEFGH";

function beyaz(ctx: Ctx, metin: string, x: number, y: number, punto: number, hiza: "orta" | "sol" | "sag" = "orta") {
  const w = fizikMetniOlcu(ctx, metin, punto).w + 4, x0 = hiza === "orta" ? x - w / 2 : hiza === "sol" ? x - 2 : x - w + 2;
  ctx.save(); ctx.fillStyle = "#fff"; ctx.fillRect(x0, y - punto * 0.62, w, punto * 1.24); ctx.restore();
  fizikMetniCiz(ctx, metin, x, y, punto, hiza);
}
function nokta(ctx: Ctx, x: number, y: number, r: number, renk = "#000") { ctx.save(); ctx.beginPath(); ctx.arc(x, y, r, 0, PI * 2); ctx.fillStyle = renk; ctx.fill(); ctx.restore(); }
function kure(ctx: Ctx, x: number, y: number, r: number, renk = "#cfcfcf") { ctx.save(); ctx.beginPath(); ctx.arc(x, y, r, 0, PI * 2); ctx.fillStyle = renk; ctx.fill(); ctx.stroke(); ctx.restore(); }
function araba(ctx: Ctx, x: number, y: number, w: number, h: number, renk = "#d9d9d9") {
  ctx.save(); ctx.fillStyle = renk; ctx.beginPath(); ctx.rect(x - w / 2, y - h, w, h * 0.72); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.rect(x - w * 0.28, y - h * 1.38, w * 0.56, h * 0.38); ctx.fill(); ctx.stroke();
  for (const sx of [-0.3, 0.3]) { ctx.beginPath(); ctx.arc(x + sx * w, y - h * 0.14, h * 0.17, 0, PI * 2); ctx.fillStyle = "#000"; ctx.fill(); }
  ctx.restore();
}
const guzel = (n: number) => { const s = n === 0 ? "0" : String(Number(n.toFixed(1))).replace(".", ","); return s.replace("-", "−"); };

// ════════════════════════════════════════════════════════════════════════════
// YOL – YER DEĞİŞTİRME
// ════════════════════════════════════════════════════════════════════════════
export function yolYerHesap(v: CografyaVerisi) {
  const tip = ayarSec(v, "tip"), boy = ayarSayi(v, "kareBoy");
  let pts: { x: number; y: number }[] = [{ x: 0, y: 0 }];
  if (tip === "dogru") {
    for (const x of ayarSayilar(v, "konum")) pts.push({ x, y: 0 });
  } else {
    const dx = ayarSayilar(v, "dx"), dy = ayarSayilar(v, "dy");
    for (let i = 0; i < Math.max(dx.length, dy.length); i++) { const p = pts[pts.length - 1]; pts.push({ x: p.x + (dx[i] ?? 0), y: p.y + (dy[i] ?? 0) }); }
  }
  // Hareketsiz (sıfır uzunluklu) etapları at.
  pts = pts.filter((p, i) => i === 0 || Math.hypot(p.x - pts[i - 1].x, p.y - pts[i - 1].y) > 1e-9 || false);
  let yol = 0;
  for (let i = 1; i < pts.length; i++) yol += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
  const son = pts[pts.length - 1];
  return { tip, pts, boy, yol: yol * boy, yer: Math.hypot(son.x, son.y) * boy, bx: son.x * boy, by: son.y * boy };
}
function yolYerCiz(ctx: Ctx, v: CografyaVerisi, k: Kutu) {
  const punto = puntoOlc(k), kal = ctx.lineWidth, h = yolYerHesap(v);
  const pts = h.pts, ad = (i: number) => HARF[i] ?? String(i);
  const deger = ayarMantik(v, "deger"), izgara = ayarMantik(v, "izgara"), adlar = ayarMantik(v, "nokta"), yerOk = ayarMantik(v, "yerOk");
  ctx.save(); ctx.lineJoin = "round";
  if (h.tip === "dogru") {
    const xs = pts.map((p) => p.x), mn = Math.min(...xs, 0) - 1, mx = Math.max(...xs, 0) + 1;
    const px = 28, W = k.w - px * 2, sx = W / (mx - mn), X = (x: number) => k.x + px + (x - mn) * sx;
    const yAks = k.y + k.h * 0.6;
    ctx.save(); ctx.lineWidth = Math.max(1, kal * 0.9); ok(ctx, k.x + px - 8, yAks, k.x + k.w - px + 10, yAks, 7); ctx.restore();
    ctx.save(); ctx.lineWidth = Math.max(0.8, kal * 0.6);
    for (let x = Math.ceil(mn); x <= Math.floor(mx); x++) { cizgi(ctx, X(x), yAks - 3, X(x), yAks + 3); if (izgara || x === 0 || xs.includes(x)) fizikMetniCiz(ctx, guzel(x * h.boy), X(x), yAks + 12, punto * 0.8); }
    ctx.restore();
    fizikMetniCiz(ctx, "x (m)", k.x + k.w - px + 6, yAks - 10, punto * 0.85, "sag");
    const ust = k.y + 14;
    for (let i = 1; i < pts.length; i++) {
      const y = yAks - 16 - (i - 1) * Math.min(18, (yAks - ust - 20) / Math.max(1, pts.length - 1));
      ctx.save(); ctx.lineWidth = Math.max(1.4, kal * 1.1);
      ok(ctx, X(pts[i - 1].x), y, X(pts[i].x), y, 7); ctx.restore();
      ctx.save(); ctx.lineWidth = Math.max(0.7, kal * 0.5); kesik(ctx, X(pts[i - 1].x), yAks, X(pts[i - 1].x), y, [2, 3]); kesik(ctx, X(pts[i].x), yAks, X(pts[i].x), y, [2, 3]); ctx.restore();
    }
    for (let i = 0; i < pts.length; i++) { nokta(ctx, X(pts[i].x), yAks, 3); if (adlar) beyaz(ctx, ad(i), X(pts[i].x) + (i % 2 ? 0 : 0), yAks + 26, punto * 0.95); }
    if (yerOk) {
      const yy = yAks + 48;
      ctx.save(); ctx.lineWidth = Math.max(2, kal * 1.6); ok(ctx, X(0), yy, X(pts[pts.length - 1].x), yy, 8); ctx.restore();
      if (deger) beyaz(ctx, `yer değiştirme = ${sayiYaz(h.bx, 1)} m`, (X(0) + X(pts[pts.length - 1].x)) / 2, yy + 11, punto * 0.85);
    }
  } else {
    const xs = pts.map((p) => p.x), ys = pts.map((p) => p.y);
    const mnx = Math.min(...xs), mxx = Math.max(...xs), mny = Math.min(...ys), mxy = Math.max(...ys);
    const sx = Math.max(1, mxx - mnx), sy = Math.max(1, mxy - mny), pay = 26;
    const c = Math.max(8, Math.min(34, Math.floor(Math.min((k.w - pay * 2) / sx, (k.h - pay * 2 - (deger ? 12 : 0)) / sy))));
    const ox = k.x + (k.w - sx * c) / 2 - mnx * c, oy = k.y + (k.h - (deger ? 12 : 0) - sy * c) / 2 + mxy * c + (deger ? 0 : 0);
    const X = (x: number) => ox + x * c, Y = (y: number) => oy - y * c;
    if (izgara) {
      const sk = ctx.strokeStyle; ctx.save(); ctx.strokeStyle = "#c8c8c8"; ctx.lineWidth = 0.6;
      const gx0 = Math.floor(mnx) - 1, gx1 = Math.ceil(mxx) + 1, gy0 = Math.floor(mny) - 1, gy1 = Math.ceil(mxy) + 1;
      for (let x = gx0; x <= gx1; x++) cizgi(ctx, X(x), Y(gy0), X(x), Y(gy1));
      for (let y = gy0; y <= gy1; y++) cizgi(ctx, X(gx0), Y(y), X(gx1), Y(y));
      ctx.restore(); ctx.strokeStyle = sk;
    }
    for (let i = 1; i < pts.length; i++) { ctx.save(); ctx.lineWidth = Math.max(1.4, kal * 1.1); ok(ctx, X(pts[i - 1].x), Y(pts[i - 1].y), X(pts[i].x), Y(pts[i].y), 7); ctx.restore(); }
    const son = pts[pts.length - 1];
    if (yerOk && (son.x !== 0 || son.y !== 0)) { ctx.save(); ctx.lineWidth = Math.max(2, kal * 1.6); ctx.setLineDash([6, 3]); ok(ctx, X(0), Y(0), X(son.x), Y(son.y), 8); ctx.restore(); }
    for (let i = 0; i < pts.length; i++) {
      nokta(ctx, X(pts[i].x), Y(pts[i].y), 3);
      if (adlar) {
        const dxn = i > 0 ? pts[i].x - pts[i - 1].x : -1, dyn = i > 0 ? pts[i].y - pts[i - 1].y : -1;
        beyaz(ctx, ad(i), X(pts[i].x) + Math.sign(dxn || 1) * 10, Y(pts[i].y) - Math.sign(dyn || 1) * 10, punto * 0.95);
      }
    }
    if (deger) fizikMetniCiz(ctx, `yol = ${sayiYaz(h.yol, 1)} m · yer değiştirme = ${sayiYaz(h.yer, 1)} m`, k.x + k.w / 2, k.y + k.h - 6, punto * 0.85);
  }
  ctx.restore();
}

// ════════════════════════════════════════════════════════════════════════════
// BAĞIL HAREKET
// ════════════════════════════════════════════════════════════════════════════
export function bagilHesap(v: CografyaVerisi) {
  const vt = ayarSayi(v, "vt"), va = ayarSayi(v, "va"), th = (ayarSayi(v, "aci") * PI) / 180, d = ayarSayi(v, "d");
  const vx = va + vt * Math.sin(th), vy = vt * Math.cos(th);
  const t = vy > 1e-9 ? d / vy : Infinity;
  const v1 = ayarSayi(v, "v1"), v2 = ayarSayi(v, "v2");
  return { vt, va, vx, vy, vb: Math.hypot(vx, vy), t, x: Number.isFinite(t) ? vx * t : Infinity, dikAci: vt > 0 ? Math.asin(Math.min(1, va / vt)) * 180 / PI : 0, v1, v2, v21: v2 - v1 };
}
function bagilCiz(ctx: Ctx, v: CografyaVerisi, k: Kutu) {
  kokluIle(v, () => {
    const punto = puntoOlc(k), kal = ctx.lineWidth, h = bagilHesap(v), tip = ayarSec(v, "tip"), veri = ayarMantik(v, "veri");
    ctx.save(); ctx.lineJoin = "round";
    if (tip === "nehir") {
      const ust = k.y + k.h * 0.12, alt = k.y + k.h * 0.82, x0 = k.x + 8, x1 = k.x + k.w - 8, d = alt - ust;
      ctx.save(); ctx.lineWidth = Math.max(1.4, kal * 1.2); cizgi(ctx, x0, ust, x1, ust); cizgi(ctx, x0, alt, x1, alt); ctx.restore();
      ctx.save(); ctx.lineWidth = 0.7; ctx.strokeStyle = "#8a8a8a";
      for (const f of [0.28, 0.5, 0.72]) { const y = ust + d * f; for (let x = x0 + 30; x < x1 - 20; x += 90) { ctx.beginPath(); ctx.moveTo(x, y); ctx.bezierCurveTo(x + 8, y - 4, x + 14, y + 4, x + 22, y); ctx.stroke(); } }
      ctx.restore();
      const bx = k.x + k.w * 0.42, by = alt;
      const sc = Math.min(28, (d * 0.55) / Math.max(h.vb, h.vt, 1), (k.w * 0.34) / Math.max(h.vx, h.va, 1) );
      const tx = h.vt * Math.sin((ayarSayi(v, "aci") * PI) / 180) * sc, ty = -h.vy * sc, ax = h.va * sc, bxv = h.vx * sc, byv = -h.vy * sc;
      ctx.save(); ctx.lineWidth = Math.max(1.4, kal * 1.1); if (Math.hypot(tx, ty) > 2) ok(ctx, bx, by, bx + tx, by + ty, 7); ctx.restore();
      if (Math.hypot(tx, ty) > 2) beyaz(ctx, veri ? `${vecAd("v")}_t = ${sayiYaz(h.vt, 1)}` : vecAd("v") + "_t", bx + tx - 6, by + ty - 8, punto * 0.88, "sag");
      if (h.va > 0) {
        ctx.save(); ctx.lineWidth = Math.max(1.4, kal * 1.1); ok(ctx, bx + tx, by + ty, bx + tx + ax, by + ty, 7); ctx.restore();
        beyaz(ctx, veri ? `${vecAd("v")}_a = ${sayiYaz(h.va, 1)}` : vecAd("v") + "_a", bx + tx + ax / 2, by + ty - 10, punto * 0.88);
      }
      ctx.save(); ctx.lineWidth = Math.max(2, kal * 1.7); ok(ctx, bx, by, bx + bxv, by + byv, 8); ctx.restore();
      if (ayarMantik(v, "sonuc")) beyaz(ctx, `${vecAd("v")}_b = ${sayiYaz(h.vb, 1)}`, bx + bxv * 0.5 + 12, by + byv * 0.5 + 14, punto * 0.88, "sol");
      // gerçek yol (bileşke doğrultusu) karşı kıyıya
      const kx = bx + (h.vy > 0 ? (h.vx / h.vy) * d : 0);
      if (h.vy > 0) { ctx.save(); ctx.lineWidth = Math.max(0.8, kal * 0.6); kesik(ctx, bx + bxv, by + byv, kx, ust, [5, 3]); ctx.restore(); }
      kure(ctx, bx, by - 4, 4, "#fff");
      if (ayarMantik(v, "surukle")) {
        ctx.save(); ctx.lineWidth = Math.max(0.8, kal * 0.6);
        kesik(ctx, bx, by, bx, ust, [2, 3]); ctx.restore();
        ctx.save(); ctx.lineWidth = Math.max(0.8, kal * 0.6);
        const dx0 = x0 + 14; ok(ctx, dx0, by - d / 2 + 14, dx0, ust, 5); ok(ctx, dx0, by - d / 2 - 14, dx0, by, 5); ctx.restore();
        beyaz(ctx, veri ? `d = ${sayiYaz(ayarSayi(v, "d"), 0)} m` : "d", dx0 + 6, by - d / 2, punto * 0.88, "sol");
        if (Math.abs(kx - bx) > 12) {
          ctx.save(); ctx.lineWidth = Math.max(0.8, kal * 0.6); olcu(ctx, bx, ust - 9, kx, ust - 9); ctx.restore();
          beyaz(ctx, veri && Number.isFinite(h.x) ? `x = ${sayiYaz(h.x, 1)} m` : "x", (bx + kx) / 2, ust - 9, punto * 0.88);
        }
      }
      // akıntı yönü
      ctx.save(); ctx.lineWidth = Math.max(0.8, kal * 0.6); ok(ctx, x1 - 80, alt + 12, x1 - 20, alt + 12, 6); ctx.restore();
      fizikMetniCiz(ctx, "akıntı", x1 - 50, alt + 22, punto * 0.8);
    } else {
      const y = k.y + k.h * 0.6, x0 = k.x + 10, x1 = k.x + k.w - 10, gz = ayarSec(v, "gozlem");
      ctx.save(); ctx.lineWidth = Math.max(1.4, kal * 1.2); cizgi(ctx, x0, y, x1, y); ctx.restore();
      const M = Math.max(Math.abs(h.v1), Math.abs(h.v2), Math.abs(h.v21), 1), sc = (k.w * 0.28) / M;
      const c1 = k.x + k.w * 0.28, c2 = k.x + k.w * 0.64, w = 54, ch = 20;
      araba(ctx, c1, y, w, ch, "#e6e6e6"); araba(ctx, c2, y, w, ch, "#bdbdbd");
      fizikMetniCiz(ctx, "1", c1, y - ch * 1.9, punto * 0.95); fizikMetniCiz(ctx, "2", c2, y - ch * 1.9, punto * 0.95);
      const kok = (hız: number, cx: number, yy: number, ad: string) => {
        if (Math.abs(hız) < 1e-9) return;
        const dx = hız * sc;
        ctx.save(); ctx.lineWidth = Math.max(1.6, kal * 1.3); ok(ctx, cx, yy, cx + dx, yy, 7); ctx.restore();
        beyaz(ctx, veri ? `${vecAd(ad)} = ${sayiYaz(Math.abs(hız), 1)}` : vecAd(ad), cx + dx / 2, yy - 11, punto * 0.88);
      };
      const ya = y - ch * 2.5;
      if (gz === "yer") { kok(h.v1, c1, ya, "v_1"); kok(h.v2, c2, ya, "v_2"); }
      else if (gz === "a1") { kok(0, c1, ya, "v_1"); kok(h.v21, c2, ya, "v_21"); fizikMetniCiz(ctx, "gözlemci", c1, y + 14, punto * 0.85); }
      else { kok(-h.v21, c1, ya, "v_12"); kok(0, c2, ya, "v_2"); fizikMetniCiz(ctx, "gözlemci", c2, y + 14, punto * 0.85); }
      if (gz === "yer") fizikMetniCiz(ctx, "gözlemci (yer)", k.x + k.w / 2, y + 16, punto * 0.85);
    }
    ctx.restore();
  });
}
function olcu(ctx: Ctx, x0: number, y0: number, x1: number, y1: number) {
  const mx = (x0 + x1) / 2, my = (y0 + y1) / 2; ok(ctx, mx, my, x0, y0, 5); ok(ctx, mx, my, x1, y1, 5);
}

// ════════════════════════════════════════════════════════════════════════════
// SERBEST DÜŞME / DÜŞEY ATIŞ
// ════════════════════════════════════════════════════════════════════════════
export function dusmeHesap(v: CografyaVerisi) {
  const tip = ayarSec(v, "tip"), g = ayarSayi(v, "g"), v0 = ayarSayi(v, "v0"), n0 = Math.round(ayarSayi(v, "n"));
  if (tip === "birak") return { tip, g, v0: 0, n: n0, T: n0, hmax: 0.5 * g * n0 * n0, ucus: 0, vson: g * n0 };
  const T = v0 / g, n = Math.max(1, Math.min(n0, Math.floor(2 * T)));
  return { tip, g, v0, n, T, hmax: (v0 * v0) / (2 * g), ucus: 2 * T, vson: v0 - g * n };
}
function dusmeCiz(ctx: Ctx, v: CografyaVerisi, k: Kutu) {
  const punto = puntoOlc(k), kal = ctx.lineWidth, h = dusmeHesap(v), tip = h.tip;
  const hizG = ayarMantik(v, "hiz"), yukG = ayarMantik(v, "yuk"), oranG = ayarMantik(v, "oran"), yerG = ayarMantik(v, "yer");
  const ust = k.y + 18, alt = k.y + k.h - (oranG ? 34 : 18), yuk = alt - ust;
  ctx.save(); ctx.lineJoin = "round";
  const hy = (t: number) => (tip === "birak" ? 0.5 * h.g * t * t : h.v0 * t - 0.5 * h.g * t * t);
  const hv = (t: number) => (tip === "birak" ? h.g * t : h.v0 - h.g * t);
  const zirve = tip === "birak" ? hy(h.n) : Math.max(...Array.from({ length: h.n + 1 }, (_, t) => hy(t)), tip === "birak" ? 0 : h.hmax);
  const sc = yuk / Math.max(1, zirve);
  const xa = k.x + k.w * 0.32, xb = k.x + k.w * 0.68;
  const Yf = tip === "birak" ? (t: number) => ust + (hy(t) / zirve) * (yuk - (hizG && tip === "birak" ? 58 : 0)) : (t: number) => alt - hy(t) * sc;
  const Xf = (t: number) => (tip === "birak" || t <= h.T ? xa : xb);
  if (yerG) { ctx.save(); ctx.lineWidth = Math.max(1.4, kal * 1.2); zemin2(ctx, k.x + 10, k.x + k.w - 10, tip === "birak" ? alt + 4 : alt + 4); ctx.restore(); }
  const v0y = tip === "birak" ? ust : alt;
  const vmax = Math.max(...Array.from({ length: h.n + 1 }, (_, t) => Math.abs(hv(t))), 1), vsc = (k.w * 0.22) / vmax;
  const ts = Array.from({ length: h.n + 1 }, (_, t) => t);
  if (tip === "yukari" && h.T > 0.01 && h.T < h.n && !Number.isInteger(h.T)) ts.push(h.T);
  ts.sort((a, b) => a - b);
  for (const t of ts) {
    const x = Xf(t), y = Yf(t), tepe = Math.abs(t - h.T) < 1e-9 && tip === "yukari" && !Number.isInteger(t);
    const ikinci = tip === "yukari" && t > h.T + 1e-9;
    ctx.save(); ctx.lineWidth = Math.max(0.7, kal * 0.5); kesik(ctx, ikinci ? xa + 9 : k.x + 12, y, x - 9, y, [2, 3]); ctx.restore();
    kure(ctx, x, y, 7, tepe ? "#fff" : "#cfcfcf");
    const ty = tepe ? `t = ${sayiYaz(h.T, 1)} s` : `t = ${t} s`;
    if (ikinci) fizikMetniCiz(ctx, ty, xb - 12, y - 8, punto * 0.8, "sag");
    else fizikMetniCiz(ctx, ty, k.x + 12, y - 8, punto * 0.8, "sol");
    if (hizG) {
      const vel = hv(t);
      if (Math.abs(vel) > 1e-9) {
        const dy = tip === "birak" ? vel * vsc * 0.6 : -vel * vsc * 0.6; // ekranda aşağı +
        ctx.save(); ctx.lineWidth = Math.max(1.5, kal * 1.2); ok(ctx, x + 11, y, x + 11, y + dy, 6); ctx.restore();
        beyaz(ctx, `${sayiYaz(Math.abs(vel), 1)} m/s`, x + 17, y + dy / 2, punto * 0.8, "sol");
      } else beyaz(ctx, "v = 0", x + 13, y, punto * 0.8, "sol");
    }
  }
  if (yukG) {
    const xr = k.x + k.w - 12;
    for (let i = 1; i < ts.length; i++) {
      if (tip === "yukari" && ts[i] > h.T && ts[i - 1] < h.T) continue;
    }
    const arr = tip === "birak" ? ts : ts.filter((t) => Number.isInteger(t));
    for (const t of arr) if (t > 0 || tip === "yukari") {
      const hv_ = hy(t);
      if (tip === "yukari" && (t === 0 || t > h.T + 1e-9)) continue;
      beyaz(ctx, `h = ${sayiYaz(hv_, 1)} m`, xr, Yf(t) - 9, punto * 0.8, "sag");
    }
  }
  if (oranG && tip === "birak" && h.n >= 2) {
    const oran = Array.from({ length: h.n }, (_, i) => 2 * i + 1).join(" : ");
    fizikMetniCiz(ctx, `ardışık saniyelerde yollar = ${oran}`, k.x + k.w / 2, k.y + k.h - 8, punto * 0.85);
  }
  if (oranG && tip === "yukari") fizikMetniCiz(ctx, `çıkış süresi = ${sayiYaz(h.T, 1)} s · en büyük yükseklik = ${sayiYaz(h.hmax, 1)} m`, k.x + k.w / 2, k.y + k.h - 8, punto * 0.85);
  void v0y;
  ctx.restore();
}
function zemin2(ctx: Ctx, x0: number, x1: number, y: number) {
  cizgi(ctx, x0, y, x1, y);
  ctx.save(); ctx.lineWidth = Math.max(0.7, ctx.lineWidth * 0.5);
  for (let x = x0 + 4; x < x1; x += 8) cizgi(ctx, x, y, x - 5, y + 7);
  ctx.restore();
}

// ════════════════════════════════════════════════════════════════════════════
// STROBOSKOP
// ════════════════════════════════════════════════════════════════════════════
export function stroboHesap(v: CografyaVerisi) {
  const tip = ayarSec(v, "tip"), n = Math.round(ayarSayi(v, "n"));
  const aralik: number[] = [];
  for (let i = 1; i < n; i++) aralik.push(tip === "duzgun" ? 1 : tip === "hizlanan" ? 2 * i - 1 : 2 * (n - i) - 1);
  const konum = [0]; for (const a of aralik) konum.push(konum[konum.length - 1] + a);
  const hiz = konum.map((_, i) => (tip === "duzgun" ? 1 : tip === "hizlanan" ? i : n - 1 - i));
  return { tip, n, aralik, konum, hiz, toplam: konum[konum.length - 1] };
}
function stroboCiz(ctx: Ctx, v: CografyaVerisi, k: Kutu) {
  const punto = puntoOlc(k), kal = ctx.lineWidth, h = stroboHesap(v), nesne = ayarSec(v, "nesne");
  const px = 22, L = k.w - px * 2 - (ayarMantik(v, "hizOk") ? 56 : 16), d = L / h.toplam, X = (i: number) => k.x + px + h.konum[i] * d;
  const yO = k.y + k.h * 0.48, r = Math.max(3.5, Math.min(9, d * 0.42));
  ctx.save(); ctx.lineJoin = "round";
  const vmax = Math.max(...h.hiz, 1);
  for (let i = 0; i <= h.n - 1; i++) {
    if (nesne === "top") kure(ctx, X(i), yO, r, i === 0 ? "#fff" : "#cfcfcf"); else araba(ctx, X(i), yO + r * 0.8, Math.min(30, Math.max(8, d * 0.8)), Math.min(12, r * 1.3), "#d9d9d9");
    if (ayarMantik(v, "hizOk") && h.hiz[i] > 0) {
      const dl = (h.hiz[i] / vmax) * Math.min(48, Math.max(14, d * 2.2));
      ctx.save(); ctx.lineWidth = Math.max(1.4, kal * 1.1); ok(ctx, X(i), yO - r - 10, X(i) + dl, yO - r - 10, 6); ctx.restore();
    }
    if (ayarMantik(v, "zaman")) fizikMetniCiz(ctx, `t_${i}`, X(i), yO - r - 22 - (ayarMantik(v, "hizOk") ? 4 : -8), punto * 0.8);
  }
  if (ayarMantik(v, "olcu")) {
    for (let i = 1; i < h.n; i++) {
      const xm = (X(i - 1) + X(i)) / 2, a = h.aralik[i - 1], etiket = a === 1 ? "d" : `${a}d`;
      const yy = yO + r + 14;
      ctx.save(); ctx.lineWidth = Math.max(0.8, kal * 0.55); olcu(ctx, X(i - 1) + 1, yy, X(i) - 1, yy); ctx.restore();
      if ((X(i) - X(i - 1)) >= fizikMetniOlcu(ctx, etiket, punto * 0.8).w + 6) beyaz(ctx, etiket, xm, yy + 10, punto * 0.8);
    }
  }
  if (ayarMantik(v, "cetvel")) {
    const yc = k.y + k.h - 14;
    ctx.save(); ctx.lineWidth = Math.max(1, kal * 0.8); cizgi(ctx, X(0), yc, X(h.n - 1), yc);
    for (let u = 0; u <= h.toplam; u++) { cizgi(ctx, k.x + px + u * d, yc, k.x + px + u * d, yc + (u % 5 === 0 ? 7 : 4)); }
    ctx.restore();
  }
  ctx.restore();
}

// ════════════════════════════════════════════════════════════════════════════
// HAREKET GRAFİKLERİ
// ════════════════════════════════════════════════════════════════════════════
export function grafikHesap(v: CografyaVerisi) {
  const tip = ayarSec(v, "tip"), y = (tip === "vt" ? ayarSayilar(v, "vdeg") : ayarSayilar(v, "xdeg")).slice(0, 5);
  while (y.length < 5) y.push(y[y.length - 1] ?? 0);
  const etap = [] as { t0: number; t1: number; y0: number; y1: number; egim: number; alan: number }[];
  let yer = 0, yol = 0;
  for (let i = 0; i < 4; i++) {
    const t0 = i * 2, t1 = t0 + 2, y0 = y[i], y1 = y[i + 1], egim = (y1 - y0) / 2;
    const alan = ((y0 + y1) / 2) * 2;
    etap.push({ t0, t1, y0, y1, egim, alan });
    if (tip === "vt") {
      yer += alan;
      if (y0 * y1 >= 0) yol += Math.abs(alan);
      else { const tc = (Math.abs(y0) / (Math.abs(y0) + Math.abs(y1))) * 2; yol += (Math.abs(y0) * tc) / 2 + (Math.abs(y1) * (2 - tc)) / 2; }
    } else yol += Math.abs(y1 - y0);
  }
  if (tip === "xt") yer = y[4] - y[0];
  return { tip, y, etap, yer, yol, ort: yer / 8 };
}
const eks = (n: number) => sayiYaz(n, 1).replace("-", "−");
function iyiAdim(aralik: number) { for (const a of [1, 2, 5, 10, 20, 25, 50, 100]) if (aralik / a <= 8) return a; return 200; }
function grafikCiz(ctx: Ctx, v: CografyaVerisi, k: Kutu) {
  const punto = puntoOlc(k), kal = ctx.lineWidth, h = grafikHesap(v), vt = h.tip === "vt";
  const L = 40, S = 36, U = 16, A = 24;
  const gx = k.x + L, gw = k.w - L - S, gy = k.y + U, gh = k.h - U - A;
  const mn = Math.min(0, ...h.y), mx = Math.max(0, ...h.y), adim = iyiAdim(Math.max(1, mx - mn));
  const lo = Math.floor(mn / adim) * adim, hi = Math.ceil(mx / adim) * adim || adim;
  const X = (t: number) => gx + (t / 8) * gw, Y = (y: number) => gy + gh - ((y - lo) / (hi - lo)) * gh;
  ctx.save(); ctx.lineJoin = "round";
  if (ayarMantik(v, "izgara")) {
    ctx.save(); ctx.strokeStyle = "#cfcfcf"; ctx.lineWidth = 0.6;
    for (let t = 0; t <= 8; t += 2) cizgi(ctx, X(t), gy, X(t), gy + gh);
    for (let y = lo; y <= hi; y += adim) cizgi(ctx, gx, Y(y), gx + gw, Y(y));
    ctx.restore();
  }
  if (vt && ayarMantik(v, "alan")) {
    for (const e of h.etap) {
      const parca: [number, number, number, number][] = [];
      if (e.y0 * e.y1 >= 0) parca.push([e.t0, e.y0, e.t1, e.y1]);
      else { const tc = e.t0 + (Math.abs(e.y0) / (Math.abs(e.y0) + Math.abs(e.y1))) * 2; parca.push([e.t0, e.y0, tc, 0], [tc, 0, e.t1, e.y1]); }
      for (const [a, ya, b, yb] of parca) {
        const neg = ya < 0 || yb < 0;
        ctx.save(); ctx.beginPath(); ctx.moveTo(X(a), Y(0)); ctx.lineTo(X(a), Y(ya)); ctx.lineTo(X(b), Y(yb)); ctx.lineTo(X(b), Y(0)); ctx.closePath();
        ctx.fillStyle = neg ? "#fff" : "#dcdcdc"; ctx.fill();
        if (neg) { ctx.clip(); ctx.lineWidth = 0.7; ctx.strokeStyle = "#555"; for (let q = -gh; q < gw + gh; q += 5) cizgi(ctx, X(a) + q, Y(lo) + 0, X(a) + q - gh, Y(hi)); }
        ctx.restore();
      }
    }
  }
  ctx.save(); ctx.lineWidth = Math.max(1, kal * 0.9);
  ok(ctx, gx, Y(lo), gx, gy - 8, 6); ok(ctx, gx - 2, Y(0), gx + gw + 10, Y(0), 6);
  ctx.restore();
  if (ayarMantik(v, "sayi")) {
    ctx.save(); ctx.lineWidth = Math.max(0.7, kal * 0.5);
    for (let t = 2; t <= 8; t += 2) { cizgi(ctx, X(t), Y(0) - 3, X(t), Y(0) + 3); fizikMetniCiz(ctx, String(t), X(t), Y(0) + (lo < 0 ? -9 : 10) * (lo < 0 ? 1 : 1) + (lo < 0 ? 0 : 0), punto * 0.8); }
    for (let y = lo; y <= hi; y += adim) if (y !== 0) { cizgi(ctx, gx - 3, Y(y), gx + 3, Y(y)); fizikMetniCiz(ctx, guzel(y), gx - 6, Y(y), punto * 0.8, "sag"); }
    ctx.restore();
    fizikMetniCiz(ctx, "0", gx - 6, Y(0) + 2, punto * 0.8, "sag");
  }
  fizikMetniCiz(ctx, vt ? "v (m/s)" : "x (m)", gx + 4, gy - 8, punto * 0.85, "sol");
  fizikMetniCiz(ctx, "t (s)", gx + gw + 14, Y(0), punto * 0.85, "sol");
  ctx.save(); ctx.lineWidth = Math.max(1.8, kal * 1.5);
  ctx.beginPath(); h.y.forEach((y, i) => (i ? ctx.lineTo(X(i * 2), Y(y)) : ctx.moveTo(X(0), Y(y)))); ctx.stroke(); ctx.restore();
  if (ayarMantik(v, "nokta")) h.y.forEach((y, i) => nokta(ctx, X(i * 2), Y(y), 2.8));
  if (ayarMantik(v, "egim")) {
    for (const e of h.etap) {
      const xm = X((e.t0 + e.t1) / 2), ym = Y((e.y0 + e.y1) / 2);
      const metin = vt ? (Math.abs(e.egim) < 1e-9 ? `v = ${eks(e.y0)}` : `a = ${eks(e.egim)}`) : (Math.abs(e.egim) < 1e-9 ? "durgun" : `v = ${eks(e.egim)}`);
      const yukari = e.egim >= 0;
      beyaz(ctx, metin, xm, ym + (yukari ? -11 : 11) * (vt && Math.abs(e.egim) < 1e-9 ? -1 : 1), punto * 0.78);
    }
  }
  ctx.restore();
}

// ════════════════════════════════════════════════════════════════════════════
export function hareketCiz(ctx: Ctx, v: CografyaVerisi, k: Kutu): boolean {
  switch (v.yapi) {
    case "yolYer": yolYerCiz(ctx, v, k); return true;
    case "bagilHareket": bagilCiz(ctx, v, k); return true;
    case "serbestDusme": dusmeCiz(ctx, v, k); return true;
    case "stroboskop": stroboCiz(ctx, v, k); return true;
    case "hareketGrafigi": grafikCiz(ctx, v, k); return true;
    default: return false;
  }
}

export function hareketOzet(v: CografyaVerisi): string | null | undefined {
  switch (v.yapi) {
    case "yolYer": {
      const h = yolYerHesap(v);
      return `Yol = ${sayiYaz(h.yol, 1)} m (skaler, hep ≥ 0) · yer değiştirme = ${sayiYaz(h.yer, 1)} m (vektör: ilk konumdan son konuma) · yol ≥ |yer değiştirme|`;
    }
    case "bagilHareket": return kokluIle(v, () => {
      const h = bagilHesap(v), tip = ayarSec(v, "tip");
      if (tip === "nehir") return `Bileşke hız v_b = √(v_t² + v_a²) = ${sayiYaz(h.vb, 2)} m/s (dik gidişte) · karşıya geçiş süresi t = d/v_dik = ${Number.isFinite(h.t) ? sayiYaz(h.t, 2) : "∞"} s · sürüklenme x = ${Number.isFinite(h.x) ? sayiYaz(h.x, 1) : "∞"} m`;
      return `Bağıl hız: v₂₁ = v₂ − v₁ = ${sayiYaz(h.v21, 1)} m/s (1. araçtaki gözlemciye göre 2. aracın hızı) · v₁₂ = ${sayiYaz(-h.v21, 1)} m/s`;
    });
    case "serbestDusme": {
      const h = dusmeHesap(v);
      return h.tip === "birak" ? `Serbest düşme (v₀ = 0): v = g·t, h = ½·g·t² · t = ${h.n} s sonunda v = ${sayiYaz(h.vson, 1)} m/s, h = ${sayiYaz(h.hmax, 1)} m · ardışık saniyelerde yollar 1 : 3 : 5 …`
        : `Düşey atış: v = v₀ − g·t, h = v₀·t − ½·g·t² · çıkış süresi ${sayiYaz(h.T, 2)} s · en büyük yükseklik = v₀²/2g = ${sayiYaz(h.hmax, 1)} m · uçuş süresi ${sayiYaz(h.ucus, 2)} s`;
    }
    case "stroboskop": {
      const t = ayarSec(v, "tip");
      return t === "duzgun" ? "Sabit hızlı harekette eşit sürede eşit yol alınır: ardışık konumlar arası uzaklık eşit." : t === "hizlanan" ? "Durgundan düzgün hızlanan harekette ardışık eşit zamanlarda yollar 1 : 3 : 5 : 7 … oranındadır; x ∝ t²." : "Düzgün yavaşlayan harekette ardışık eşit zamanlarda yollar … 7 : 5 : 3 : 1 oranında azalır.";
    }
    case "hareketGrafigi": {
      const h = grafikHesap(v);
      return h.tip === "vt" ? `v–t grafiğinde eğim ivmedir, grafik altındaki işaretli alan yer değiştirmedir: yer değiştirme = ${sayiYaz(h.yer, 1)} m, yol = ${sayiYaz(h.yol, 1)} m, ortalama hız = ${sayiYaz(h.ort, 2)} m/s`
        : `x–t grafiğinde eğim hızdır: yer değiştirme = ${sayiYaz(h.yer, 1)} m, yol = ${sayiYaz(h.yol, 1)} m, ortalama hız = ${sayiYaz(h.ort, 2)} m/s`;
    }
    default: return undefined;
  }
}
void ayarSayi;
