// Fizik şekillerinin çizimi: atış, enerji dönüşümü, çarpışma, tork, vektör toplama, serbest cisim.
// Hepsi saf çizim: veri (ayar tablosu) → tuval. Yalnız gri/siyah kullanılır (baskı dostu).
import { fizikMetniCiz } from "../fizik";
import { kokluYaz } from "../kokluDeger";
import { ayarMantik, ayarMetin, ayarSayi, ayarSayilar, ayarSec, type CografyaVerisi } from "./sema";

type Kutu = { x: number; y: number; w: number; h: number };
const D2R = Math.PI / 180;
const GRI = "#ececec";

/** Çizim sırasında açık: tam köklü değerler (5√2, 2√3/3) ondalık yerine √ ile yazılır. */
let kokluModu = false;
/** Köklü giriş yapılmışsa ("10√2") ya da "Köklü değerleri √ ile yaz" açıksa köklü yazım devrede. */
function kokluAcikMi(v: CografyaVerisi): boolean {
  if (ayarMantik(v, "kokYaz")) return true;
  return Object.values(v.ayar).some((d) => typeof d === "string" && d.includes("√"));
}
function kokluIle<T>(v: CografyaVerisi, f: () => T): T {
  const onceki = kokluModu;
  kokluModu = kokluAcikMi(v);
  try { return f(); } finally { kokluModu = onceki; }
}

/** 1 ondalık, virgüllü, gereksiz sıfırsız. Köklü kip açıksa tam köklü değer √ ile yazılır. */
export const sayiYaz = (n: number, ond = 1) => {
  if (kokluModu) { const k = kokluYaz(n); if (k) return k; }
  return String(Number(n.toFixed(ond))).replace(".", ",");
};

function ok(ctx: CanvasRenderingContext2D, x0: number, y0: number, x1: number, y1: number, s = 7) {
  const dx = x1 - x0, dy = y1 - y0, L = Math.hypot(dx, dy);
  if (L < 0.5) return;
  const ux = dx / L, uy = dy / L, bas = Math.min(s, L * 0.6);
  ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1 - ux * bas * 0.6, y1 - uy * bas * 0.6); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x1, y1);
  ctx.lineTo(x1 - ux * bas - uy * bas * 0.42, y1 - uy * bas + ux * bas * 0.42);
  ctx.lineTo(x1 - ux * bas + uy * bas * 0.42, y1 - uy * bas - ux * bas * 0.42);
  ctx.closePath();
  ctx.save(); ctx.fillStyle = ctx.strokeStyle as string; ctx.fill(); ctx.restore();
}
const cizgi = (ctx: CanvasRenderingContext2D, x0: number, y0: number, x1: number, y1: number) => { ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke(); };
function kesik(ctx: CanvasRenderingContext2D, x0: number, y0: number, x1: number, y1: number, d = [4, 3]) {
  ctx.save(); ctx.setLineDash(d); cizgi(ctx, x0, y0, x1, y1); ctx.restore();
}
function zemin(ctx: CanvasRenderingContext2D, x0: number, x1: number, y: number, boy = 7) {
  cizgi(ctx, x0, y, x1, y);
  ctx.save(); ctx.lineWidth = Math.max(0.7, ctx.lineWidth * 0.5);
  for (let x = x0 + 4; x < x1; x += 8) cizgi(ctx, x, y, x - boy * 0.7, y + boy);
  ctx.restore();
}
/** Uca göre yazı: ok yönüne bakan tarafa yerleşir. */
function ucYazi(ctx: CanvasRenderingContext2D, t: string, x: number, y: number, ux: number, uy: number, punto: number) {
  if (!t) return;
  if (ux > 0.35) fizikMetniCiz(ctx, t, x + 5, y + uy * 4, punto, "sol");
  else if (ux < -0.35) fizikMetniCiz(ctx, t, x - 5, y + uy * 4, punto, "sag");
  else fizikMetniCiz(ctx, t, x + 7, y + (uy >= 0 ? 1 : -1) * (punto * 0.35), punto, "sol");
}
const vecAd = (a: string) => (a.includes("vec(") || a.includes("\\") ? a : `vec(${a})`);
const bol = (m: string) => m.split(",").map((t) => t.trim());
function puntoOlc(k: Kutu, taban = 14) { return Math.max(11, Math.min(taban + 1, k.w / 24)); }

// ════════════════════════════════════════════════════════════════════════════
// 1) ATIŞ
// ════════════════════════════════════════════════════════════════════════════

export type AtisHesap = { vx: number; vy: number; h0: number; T: number; R: number; tepeT: number; H: number };
export function atisHesapla(v: CografyaVerisi): AtisHesap {
  const tip = ayarSec(v, "tip");
  let aci = tip === "yatay" ? 0 : ayarSayi(v, "aci");
  if (tip === "egik") aci = Math.max(1, aci);
  let h0 = tip === "egik" ? 0 : ayarSayi(v, "h0");
  if (tip !== "egik" && h0 <= 0) h0 = 45; // yüksekten atışta yükseklik 0 olamaz
  const v0 = ayarSayi(v, "v0"), g = ayarSayi(v, "g");
  const vx = v0 * Math.cos(aci * D2R), vy = v0 * Math.sin(aci * D2R);
  const T = (vy + Math.sqrt(vy * vy + 2 * g * h0)) / g;
  const tepeT = vy > 0 ? vy / g : 0;
  return { vx, vy, h0, T, R: vx * T, tepeT, H: h0 + (vy > 0 ? (vy * vy) / (2 * g) : 0) };
}

export function atisCiz(ctx: CanvasRenderingContext2D, v: CografyaVerisi, k: Kutu) {
  const tip = ayarSec(v, "tip");
  const g = ayarSayi(v, "g"), v0 = ayarSayi(v, "v0");
  const aci = tip === "yatay" ? 0 : tip === "egik" ? Math.max(1, ayarSayi(v, "aci")) : ayarSayi(v, "aci");
  const hs = atisHesapla(v);
  const punto = puntoOlc(k);
  const veri = ayarMantik(v, "veri"), sonuc = ayarMantik(v, "sonuc");
  const sol = (hs.h0 > 0 ? (veri ? 78 : 44) : 22) + (aci > 5 && veri ? 56 : 0), sag = 34, ust = 24, alt = ayarMantik(v, "menzil") ? 34 : 14;
  const duvar = hs.h0 > 0 ? 16 : 0;
  const aw = k.w - sol - sag - duvar, ah = k.h - ust - alt;
  if (aw < 40 || ah < 40) return;
  const sc = Math.min(aw / Math.max(hs.R, 1e-6), ah / Math.max(hs.H, 1e-6));
  const taban = k.y + ust + ah; // zemin çizgisi (y = 0 m)
  const ox = k.x + sol + duvar;
  const X = (x: number) => ox + x * sc, Y = (y: number) => taban - y * sc;
  const kal = ctx.lineWidth;
  ctx.save(); ctx.lineJoin = "round";
  if (ayarMantik(v, "yer")) zemin(ctx, k.x + 6, k.x + k.w - 6, taban);
  if (hs.h0 > 0) {
    // Yüksek zemin (kayalık/bina): sol tarafta taralı blok + h ölçüsü
    ctx.save(); ctx.fillStyle = GRI; ctx.fillRect(ox - duvar, Y(hs.h0), duvar, taban - Y(hs.h0)); ctx.restore();
    ctx.strokeRect(ox - duvar, Y(hs.h0), duvar, taban - Y(hs.h0));
    const dx = ox - duvar - 14;
    ctx.save(); ctx.lineWidth = Math.max(0.8, kal * 0.5);
    ok(ctx, dx, taban, dx, Y(hs.h0), 5); ok(ctx, dx, Y(hs.h0), dx, taban, 5); ctx.restore();
    fizikMetniCiz(ctx, veri ? `h = ${sayiYaz(hs.h0, 0)} m` : "h", dx - 3, (taban + Y(hs.h0)) / 2, punto * 0.9, "sag");
  }
  // Yörünge
  const N = 120;
  ctx.lineWidth = Math.max(1.2, kal);
  ctx.beginPath();
  for (let i = 0; i <= N; i++) {
    const t = (hs.T * i) / N, x = hs.vx * t, y = Math.max(0, hs.h0 + hs.vy * t - 0.5 * g * t * t);
    if (i === 0) ctx.moveTo(X(x), Y(y)); else ctx.lineTo(X(x), Y(y));
  }
  ctx.save(); ctx.setLineDash(tip === "yatay" || tip === "egik" || tip === "yuksekEgik" ? [] : []); ctx.stroke(); ctx.restore();
  // Eş zaman aralıklı noktalar
  if (ayarMantik(v, "noktalar")) {
    const n = 6;
    for (let i = 1; i < n; i++) {
      const t = (hs.T * i) / n, x = hs.vx * t, y = hs.h0 + hs.vy * t - 0.5 * g * t * t;
      ctx.beginPath(); ctx.arc(X(x), Y(y), 3, 0, Math.PI * 2); ctx.save(); ctx.fillStyle = "#fff"; ctx.fill(); ctx.restore(); ctx.stroke();
    }
  }
  // Başlangıç noktası, v0 oku, açı
  const sx = X(0), sy = Y(hs.h0);
  ctx.beginPath(); ctx.arc(sx, sy, 3.2, 0, Math.PI * 2); ctx.fill();
  const L0 = 36, ca = Math.cos(aci * D2R), sa = Math.sin(aci * D2R);
  ctx.lineWidth = Math.max(1.2, kal);
  ok(ctx, sx, sy, sx + ca * L0, sy - sa * L0, 7);
  const v0Yazi = veri ? `vec(v)_0 = ${sayiYaz(v0, 0)} m/s` : "vec(v)_0";
  if (aci > 5) fizikMetniCiz(ctx, v0Yazi, sx + ca * L0 - 4, sy - sa * L0 - 8, punto, "sag");
  else fizikMetniCiz(ctx, v0Yazi, sx + ca * L0 + 6, sy - 14, punto, "sol");
  if (aci !== 0) {
    ctx.save(); ctx.lineWidth = Math.max(0.8, kal * 0.5);
    kesik(ctx, sx, sy, sx + 44, sy, [3, 3]);
    const r = 24; ctx.beginPath(); ctx.arc(sx, sy, r, -aci * D2R, 0, aci < 0); ctx.stroke();
    ctx.restore();
    const ma = (-aci * D2R) / 2;
    fizikMetniCiz(ctx, veri ? `${sayiYaz(Math.abs(aci), 0)}°` : aci > 0 ? "α" : "θ", sx + Math.cos(ma) * 44, sy + Math.sin(ma) * 44 + (aci < 0 ? 4 : 0), punto * 0.9);
  }
  // Tepe noktası (H)
  if (ayarMantik(v, "tepe") && hs.vy > 0) {
    const tx = X(hs.vx * hs.tepeT), ty = Y(hs.H);
    ctx.beginPath(); ctx.arc(tx, ty, 3, 0, Math.PI * 2); ctx.fill();
    ctx.save(); ctx.lineWidth = Math.max(0.8, kal * 0.5); kesik(ctx, tx, ty, tx, taban); ctx.restore();
    if (ayarMantik(v, "bilesen")) { ctx.lineWidth = Math.max(1.2, kal); ok(ctx, tx, ty, tx + 30, ty, 7); fizikMetniCiz(ctx, "vec(v)_x", tx + 15, ty - punto * 0.85, punto * 0.9); }
    // H ölçüsü: tepeden yere (ya da atış yüksekliğinden tepeye) çift ok
    const hx = tx - 12;
    ctx.save(); ctx.lineWidth = Math.max(0.8, kal * 0.5);
    ok(ctx, hx, (ty + taban) / 2 + 0.01, hx, ty, 5); ok(ctx, hx, (ty + taban) / 2 - 0.01, hx, taban, 5); ctx.restore();
    fizikMetniCiz(ctx, sonuc ? `H = ${sayiYaz(hs.H)} m` : "H", hx - 3, (ty + taban) / 2, punto * 0.95, "sag");
  }
  // Menzil
  if (ayarMantik(v, "menzil")) {
    const my = taban + 14, x1 = X(hs.R);
    ctx.save(); ctx.lineWidth = Math.max(0.8, kal * 0.5);
    kesik(ctx, x1, taban, x1, my + 3, [2, 2]); kesik(ctx, sx, taban, sx, my + 3, [2, 2]);
    ok(ctx, (sx + x1) / 2 - 0.01, my, sx, my, 5); ok(ctx, (sx + x1) / 2 + 0.01, my, x1, my, 5); ctx.restore();
    const ad = tip === "egik" ? "R" : "x";
    const yz = sonuc ? `${ad} = ${sayiYaz(hs.R)} m` : ad;
    ctx.save(); ctx.fillStyle = "#fff"; const wq = yz.length * punto * 0.5 + 6; ctx.fillRect((sx + x1) / 2 - wq / 2, my - punto * 0.55, wq, punto * 1.1); ctx.restore();
    fizikMetniCiz(ctx, yz, (sx + x1) / 2, my, punto * 0.95);
  }
  // İniş yakınında hız bileşenleri
  if (ayarMantik(v, "bilesen")) {
    const t = hs.T * 0.72, px = hs.vx * t, py = hs.h0 + hs.vy * t - 0.5 * g * t * t;
    const vyP = hs.vy - g * t, hiz = Math.hypot(hs.vx, vyP);
    const olc = Math.min(54, 40 * Math.max(0.6, hiz / v0)) / Math.max(hiz, 1e-6);
    const bx = X(px), by = Y(py), dx = hs.vx * olc, dy = -vyP * olc;
    ctx.lineWidth = Math.max(1.2, kal);
    ok(ctx, bx, by, bx + dx, by + dy, 7);
    ctx.save(); ctx.lineWidth = Math.max(0.9, kal * 0.6);
    ok(ctx, bx, by, bx + dx, by, 6); ok(ctx, bx, by, bx, by + dy, 6);
    kesik(ctx, bx + dx, by, bx + dx, by + dy, [2, 2]);
    ctx.restore();
    fizikMetniCiz(ctx, "vec(v)_x", bx + dx / 2, by - punto * 0.75, punto * 0.9);
    fizikMetniCiz(ctx, "vec(v)_y", bx - 5, by + dy / 2, punto * 0.9, "sag");
    ucYazi(ctx, "vec(v)", bx + dx, by + dy, dx / Math.hypot(dx, dy), dy / Math.hypot(dx, dy), punto);
  }
  ctx.restore();
}

// ════════════════════════════════════════════════════════════════════════════
// 2) ENERJİ DÖNÜŞÜMÜ
// ════════════════════════════════════════════════════════════════════════════

function toprak(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, ad: string, punto: number, kesikKenar = false, dolgu = "#fff") {
  ctx.save(); ctx.fillStyle = dolgu;
  if (kesikKenar) ctx.setLineDash([3, 3]);
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); ctx.restore();
  if (ad) fizikMetniCiz(ctx, ad, x, y, punto * 0.85);
}

function sarkacCiz(ctx: CanvasRenderingContext2D, v: CografyaVerisi, k: Kutu, punto: number) {
  const aci = ayarSayi(v, "aci") * D2R;
  const kal = ctx.lineWidth;
  const cx = k.x + k.w / 2, top = k.y + 14;
  const L = Math.min(k.h - 56, k.w * 0.42);
  const r = Math.max(8, Math.min(12, L * 0.09));
  const P = (a: number) => ({ x: cx + Math.sin(a) * L, y: top + Math.cos(a) * L });
  const A = P(-aci), B = P(0), C = P(aci);
  // Tavan
  cizgi(ctx, cx - 40, top, cx + 40, top);
  ctx.save(); ctx.lineWidth = Math.max(0.7, kal * 0.5); for (let x = cx - 40; x < cx + 40; x += 8) cizgi(ctx, x, top, x + 5, top - 6); ctx.restore();
  // Yay (kesikli yörünge)
  ctx.save(); ctx.lineWidth = Math.max(0.8, kal * 0.5); ctx.setLineDash([3, 4]);
  ctx.beginPath(); ctx.arc(cx, top, L, Math.PI / 2 - aci, Math.PI / 2 + aci); ctx.stroke(); ctx.restore();
  // İp: A'da kesintisiz; B ve C'de kesikli
  cizgi(ctx, cx, top, A.x, A.y);
  kesik(ctx, cx, top, B.x, B.y); kesik(ctx, cx, top, C.x, C.y);
  const ad = ayarMantik(v, "noktaAd");
  toprak(ctx, C.x, C.y, r, "", punto, true);
  toprak(ctx, B.x, B.y, r, "", punto, true);
  toprak(ctx, A.x, A.y, r, ayarMetin(v, "kutle"), punto, false, "#d9d9d9");
  if (ad) {
    fizikMetniCiz(ctx, "A", A.x - r - 7, A.y, punto);
    fizikMetniCiz(ctx, "B", B.x, B.y + r + 9, punto);
    fizikMetniCiz(ctx, "C", C.x + r + 7, C.y, punto);
  }
  if (ayarMantik(v, "yukYaz")) {
    // A seviyesi ve B seviyesi: h ölçüsü
    const hx = k.x + k.w - 26;
    ctx.save(); ctx.lineWidth = Math.max(0.8, kal * 0.5);
    kesik(ctx, C.x + r + 16, A.y, hx + 6, A.y); kesik(ctx, B.x + r, B.y, hx + 6, B.y);
    ok(ctx, hx, (A.y + B.y) / 2 + 0.01, hx, A.y, 5); ok(ctx, hx, (A.y + B.y) / 2 - 0.01, hx, B.y, 5); ctx.restore();
    fizikMetniCiz(ctx, "h", hx + 9, (A.y + B.y) / 2, punto);
  }
  if (ayarMantik(v, "hizOk")) {
    ctx.lineWidth = Math.max(1.2, kal);
    ok(ctx, B.x - 4, B.y + r + 22, B.x + 36, B.y + r + 22, 7);
    fizikMetniCiz(ctx, "vec(v)", B.x + 16, B.y + r + 34, punto * 0.95);
  }
}

/** Pist: 5 yükseklik noktasından geçen yumuşak eğri (Catmull-Rom), tabanın altına inmez. */
export function pistNoktalari(yuk: number[], gx: number, gw: number, taban: number, gh: number): { x: number; y: number }[] {
  const P = yuk.map((h, i) => ({ x: gx + (gw * i) / (yuk.length - 1), y: taban - (h / 10) * gh }));
  const sonuc: { x: number; y: number }[] = [];
  for (let i = 0; i < P.length - 1; i++) {
    const p0 = P[Math.max(0, i - 1)], p1 = P[i], p2 = P[i + 1], p3 = P[Math.min(P.length - 1, i + 2)];
    for (let s = 0; s < 24; s++) {
      const t = s / 24, t2 = t * t, t3 = t2 * t;
      const f = (a: number, b: number, c: number, d: number) => 0.5 * ((2 * b) + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
      sonuc.push({ x: f(p0.x, p1.x, p2.x, p3.x), y: Math.min(taban, f(p0.y, p1.y, p2.y, p3.y)) });
    }
  }
  sonuc.push(P[P.length - 1]);
  return sonuc;
}

function pistCiz(ctx: CanvasRenderingContext2D, v: CografyaVerisi, k: Kutu, punto: number) {
  const yuk = ayarSayilar(v, "yuk"), kal = ctx.lineWidth;
  const gx = k.x + 24, gw = k.w - 48, gy = k.y + 26, gh = k.h - 56, taban = gy + gh;
  const nok = pistNoktalari(yuk, gx, gw, taban, gh);
  // Zemin dolgusu + eğri
  ctx.save(); ctx.fillStyle = GRI; ctx.beginPath(); ctx.moveTo(gx, taban); nok.forEach((p) => ctx.lineTo(p.x, p.y)); ctx.lineTo(gx + gw, taban); ctx.closePath(); ctx.fill(); ctx.restore();
  ctx.lineWidth = Math.max(1.4, kal * 1.1);
  ctx.beginPath(); nok.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y))); ctx.stroke();
  ctx.lineWidth = kal;
  zemin(ctx, gx - 10, gx + gw + 10, taban, 6);
  const noktaX = (i: number) => gx + (gw * i) / 4;
  const noktaY = (i: number) => taban - (yuk[i] / 10) * gh;
  // Sürtünmeli bölge
  const surt = ayarSec(v, "surt");
  if (surt !== "yok") {
    const i0 = "ABCDE".indexOf(surt[0]), i1 = "ABCDE".indexOf(surt[1]);
    const seg = nok.filter((p) => p.x >= noktaX(i0) - 0.5 && p.x <= noktaX(i1) + 0.5);
    ctx.save(); ctx.lineWidth = Math.max(0.9, kal * 0.7);
    for (let i = 1; i < seg.length - 1; i += 2) {
      const a = seg[i - 1], b = seg[i + 1], dx = b.x - a.x, dy = b.y - a.y, L = Math.hypot(dx, dy) || 1;
      cizgi(ctx, seg[i].x, seg[i].y, seg[i].x + (dy / L) * 5 - (dx / L) * 2, seg[i].y - (dx / L) * 5 - (dy / L) * 2);
    }
    ctx.restore();
    const mid = seg[Math.floor(seg.length / 2)];
    if (mid) fizikMetniCiz(ctx, "sürtünmeli", mid.x - 12, mid.y - 14, punto * 0.8, "sag");
  }
  // Yükseklik yazıları
  if (ayarMantik(v, "yukYaz")) {
    const et = bol(ayarMetin(v, "yukEtiket"));
    for (let i = 0; i < 5; i++) {
      const t = et[i]; if (!t || yuk[i] <= 0.3) continue;
      const x = noktaX(i) + (i === 0 ? 10 : i === 4 ? -10 : 0), y0 = noktaY(i);
      ctx.save(); ctx.lineWidth = Math.max(0.8, kal * 0.5);
      const xx = i === 0 ? noktaX(i) + 12 : i === 4 ? noktaX(i) - 12 : noktaX(i);
      kesik(ctx, xx, y0 + (i === 0 || i === 4 ? 0 : 8), xx, taban, [3, 3]); ctx.restore();
      const w = Math.max(14, t.length * punto * 0.55);
      ctx.save(); ctx.fillStyle = "#fff"; ctx.fillRect(xx - w / 2, (y0 + taban) / 2 - punto * 0.55, w, punto * 1.1); ctx.restore();
      fizikMetniCiz(ctx, t, xx, (y0 + taban) / 2, punto * 0.95);
      void x;
    }
  }
  // Nokta adları
  if (ayarMantik(v, "noktaAd")) {
    for (let i = 0; i < 5; i++) {
      ctx.beginPath(); ctx.arc(noktaX(i), noktaY(i), 2.4, 0, Math.PI * 2); ctx.fill();
      fizikMetniCiz(ctx, "ABCDE"[i], noktaX(i), noktaY(i) - 12 - (i === 0 ? 12 : 0), punto);
    }
  }
  // Cisim A noktasında
  const r = 8, a0 = nok[0], a1 = nok[3];
  const egim = Math.atan2(a1.y - a0.y, a1.x - a0.x);
  const cxo = a0.x + Math.sin(egim) * r, cyo = a0.y - Math.cos(egim) * r;
  toprak(ctx, cxo, cyo, r, ayarMetin(v, "kutle"), punto, false, "#d9d9d9");
  if (ayarMantik(v, "hizOk")) { ctx.lineWidth = Math.max(1.2, kal); ok(ctx, cxo + r + 2, cyo - 4, cxo + r + 26, cyo - 4 + Math.sin(egim) * 8, 6); fizikMetniCiz(ctx, "vec(v)", cxo + r + 14, cyo - 16, punto * 0.9); }
}

function yayEnerjiCiz(ctx: CanvasRenderingContext2D, v: CografyaVerisi, k: Kutu, punto: number) {
  const kal = ctx.lineWidth;
  const yz = k.y + k.h * 0.8;
  const gx = k.x + 14, gw = k.w - 28;
  const duvarX = gx + 10;
  const bw = 40, bh = 30;
  const dogalX = duvarX + 110; // yayın doğal boyu bittiği yer
  const blokSol = duvarX + 52;
  const rampa = dogalX + gw * 0.32;
  const egik = ayarMantik(v, "egikCikis");
  const hRamp = egik ? Math.min(k.h * 0.55, 120) : 0;
  const bitis = gx + gw;
  // Duvar
  ctx.save(); ctx.fillStyle = GRI; ctx.fillRect(duvarX - 8, yz - 96, 8, 96); ctx.restore();
  ctx.strokeRect(duvarX - 8, yz - 96, 8, 96);
  // Zemin + rampa
  ctx.lineWidth = Math.max(1.4, kal * 1.1);
  ctx.beginPath(); ctx.moveTo(duvarX - 8, yz); ctx.lineTo(rampa, yz);
  if (egik) { ctx.lineTo(bitis - 36, yz - hRamp); ctx.lineTo(bitis - 36, yz); }
  else ctx.lineTo(bitis, yz);
  ctx.stroke(); ctx.lineWidth = kal;
  ctx.save(); ctx.lineWidth = Math.max(0.7, kal * 0.5); for (let x = duvarX - 8; x < rampa; x += 8) cizgi(ctx, x, yz, x - 5, yz + 7); ctx.restore();
  // Yay (zikzak) duvar → blok
  const yy = yz - bh / 2, dis = 6;
  ctx.beginPath(); ctx.moveTo(duvarX, yy);
  const adim = (blokSol - duvarX - 12) / 9;
  ctx.lineTo(duvarX + 6, yy);
  for (let i = 0; i < 8; i++) ctx.lineTo(duvarX + 6 + adim * (i + 0.5), yy + (i % 2 ? dis : -dis));
  ctx.lineTo(blokSol, yy); ctx.stroke();
  // Blok
  ctx.save(); ctx.fillStyle = "#d9d9d9"; ctx.fillRect(blokSol, yz - bh, bw, bh); ctx.restore(); ctx.strokeRect(blokSol, yz - bh, bw, bh);
  fizikMetniCiz(ctx, ayarMetin(v, "kutle"), blokSol + bw / 2, yz - bh / 2, punto);
  fizikMetniCiz(ctx, "k", duvarX + (blokSol - duvarX) / 2, yy - dis - 9, punto);
  // Doğal boy işareti + x ölçüsü
  const nx = blokSol + bw + 22;
  ctx.save(); ctx.lineWidth = Math.max(0.8, kal * 0.5);
  kesik(ctx, nx, yz + 2, nx, yz - bh - 16, [3, 3]); kesik(ctx, blokSol + bw, yz - bh - 12, blokSol + bw, yz - bh, [2, 2]);
  ok(ctx, (blokSol + bw + nx) / 2 - 0.01, yz - bh - 12, blokSol + bw, yz - bh - 12, 5); ok(ctx, (blokSol + bw + nx) / 2 + 0.01, yz - bh - 12, nx, yz - bh - 12, 5); ctx.restore();
  fizikMetniCiz(ctx, "x", (blokSol + bw + nx) / 2, yz - bh - 24, punto);
  // Sürtünmeli bölge (düz zeminde, doğal boydan rampaya)
  const surt = ayarSec(v, "surt");
  if (surt !== "yok") {
    ctx.save(); ctx.lineWidth = Math.max(0.9, kal * 0.7);
    for (let x = nx + 6; x < rampa - 3; x += 6) cizgi(ctx, x, yz, x + 2, yz - 5);
    ctx.restore(); fizikMetniCiz(ctx, "sürtünmeli", (nx + rampa) / 2, yz - 14, punto * 0.8);
  }
  if (egik) {
    const hx = bitis - 18;
    ctx.save(); ctx.lineWidth = Math.max(0.8, kal * 0.5);
    kesik(ctx, bitis - 36, yz - hRamp, hx + 4, yz - hRamp); kesik(ctx, rampa, yz, hx + 4, yz);
    ok(ctx, hx, (yz - hRamp / 2) + 0.01, hx, yz - hRamp, 5); ok(ctx, hx, (yz - hRamp / 2) - 0.01, hx, yz, 5); ctx.restore();
    fizikMetniCiz(ctx, "h", hx + 9, yz - hRamp / 2, punto);
  }
  if (ayarMantik(v, "hizOk")) { ctx.lineWidth = Math.max(1.2, kal); ok(ctx, blokSol + bw + 4, yz - bh / 2, blokSol + bw + 24, yz - bh / 2, 6); }
}

export function enerjiCiz(ctx: CanvasRenderingContext2D, v: CografyaVerisi, k: Kutu) {
  const punto = puntoOlc(k);
  ctx.save(); ctx.lineJoin = "round"; ctx.lineCap = "round";
  const tur = ayarSec(v, "tur");
  if (tur === "sarkac") sarkacCiz(ctx, v, k, punto);
  else if (tur === "yay") yayEnerjiCiz(ctx, v, k, punto);
  else pistCiz(ctx, v, k, punto);
  ctx.restore();
}

// ════════════════════════════════════════════════════════════════════════════
// 3) ÇARPIŞMA
// ════════════════════════════════════════════════════════════════════════════

export function carpismaSonra(v: CografyaVerisi): { v1: number; v2: number; ortak?: number } {
  const tip = ayarSec(v, "tip");
  const m1 = ayarSayi(v, "m1"), m2 = ayarSayi(v, "m2"), v1 = ayarSayi(v, "v1"), v2 = ayarSayi(v, "v2");
  if (tip === "esnek") return { v1: ((m1 - m2) * v1 + 2 * m2 * v2) / (m1 + m2), v2: ((m2 - m1) * v2 + 2 * m1 * v1) / (m1 + m2) };
  if (tip === "yapisan") { const u = (m1 * v1 + m2 * v2) / (m1 + m2); return { v1: u, v2: u, ortak: u }; }
  return { v1, v2: (-m1 * v1) / m2 }; // ayrılma: toplam momentum 0
}

export function carpismaCiz(ctx: CanvasRenderingContext2D, v: CografyaVerisi, k: Kutu) {
  const tip = ayarSec(v, "tip"), kal = ctx.lineWidth;
  const m1 = ayarSayi(v, "m1"), m2 = ayarSayi(v, "m2");
  const punto = puntoOlc(k);
  const deger = ayarMantik(v, "deger"), sonraKip = ayarSec(v, "sonra");
  const sonra = carpismaSonra(v);
  const iki = sonraKip !== "yok";
  const satirH = (k.h - 8) / (iki ? 2 : 1);
  const bw = (m: number) => Math.max(34, Math.min(86, 26 + 11 * Math.sqrt(m))), bh = (m: number) => bw(m) * 0.72;
  const w1 = bw(m1), w2 = bw(m2);
  const ortaX = k.x + k.w / 2;
  ctx.save(); ctx.lineJoin = "round";
  const satir = (idx: number, ad: string, sol1: number, sol2: number, ucret: { v1: number | null; v2: number | null; soru: boolean; ortak?: number; birlesik?: boolean }, vAd: [string, string], zeminSag: boolean) => {
    const yb = k.y + 4 + satirH * (idx + 1) - 12; // blok tabanı
    if (ayarMantik(v, "zemin")) cizgi(ctx, k.x + 8, yb, k.x + k.w - 8, yb);
    fizikMetniCiz(ctx, ad, k.x + 6, k.y + 4 + satirH * idx + 10, punto * 0.95, "sol");
    const blok = (x: number, w: number, h: number, ad: string, kutleYaz: string) => {
      ctx.save(); ctx.fillStyle = "#e3e3e3"; ctx.fillRect(x, yb - h, w, h); ctx.restore(); ctx.strokeRect(x, yb - h, w, h);
      fizikMetniCiz(ctx, kutleYaz, x + w / 2, yb - h / 2, punto);
      void ad;
    };
    const t1 = deger ? `${sayiYaz(m1)} kg` : "m_1", t2 = deger ? `${sayiYaz(m2)} kg` : "m_2";
    blok(sol1, w1, bh(m1), "1", t1); blok(sol2, w2, bh(m2), "2", t2);
    const ustY = (h: number) => yb - h - 14;
    const hizOk = (cx: number, h: number, hiz: number | null, soru: boolean, ad: string, gosterDeger: boolean, tepeWide: number) => {
      const y = ustY(h);
      if (soru) { fizikMetniCiz(ctx, `${ad} = ?`, cx, y - 4, punto); return; }
      if (hiz === null) return;
      if (Math.abs(hiz) < 1e-6) { fizikMetniCiz(ctx, gosterDeger ? `${ad} = 0` : ad, cx, y - 2, punto); return; }
      const len = Math.max(22, Math.min(tepeWide, 16 + 1.5 * Math.abs(hiz))), yon = Math.sign(hiz);
      ctx.lineWidth = Math.max(1.3, kal * 1.1);
      ok(ctx, cx - (yon * len) / 2, y, cx + (yon * len) / 2, y, 7);
      ctx.lineWidth = kal;
      fizikMetniCiz(ctx, gosterDeger ? `${ad} = ${sayiYaz(Math.abs(hiz))} m/s` : ad, cx, y - 11, punto * 0.95);
    };
    if (ucret.birlesik) hizOk((sol1 + sol2 + w2) / 2, Math.max(bh(m1), bh(m2)), ucret.v1, ucret.soru, vAd[0], ucret.v1 !== null, 70);
    else {
      hizOk(sol1 + w1 / 2, bh(m1), ucret.v1, ucret.soru, vAd[0], ucret.v1 !== null && (idx === 0 ? deger : true), 70);
      hizOk(sol2 + w2 / 2, bh(m2), ucret.v2, ucret.soru, vAd[1], ucret.v2 !== null && (idx === 0 ? deger : true), 70);
    }
    void zeminSag;
  };
  // ── ÖNCE ──
  const oncekiTemas = tip === "ayrilma";
  const o1 = oncekiTemas ? ortaX - w1 : ortaX - w1 - 62 - Math.min(40, w1 * 0.3);
  const o2 = oncekiTemas ? ortaX : ortaX + 62;
  satir(0, "Önce", o1, o2,
    oncekiTemas ? { v1: 0, v2: 0, soru: false } : { v1: ayarSayi(v, "v1"), v2: ayarSayi(v, "v2"), soru: false },
    ["v_1", "v_2"], false);
  if (iki) {
    kesik(ctx, k.x + 10, k.y + 4 + satirH - 2, k.x + k.w - 10, k.y + 4 + satirH - 2, [2, 4]);
    // ── SONRA ──
    const soru = sonraKip === "soru";
    let s1: number, s2: number, hz1: number | null, hz2: number | null;
    if (tip === "yapisan") { s1 = ortaX - w1; s2 = ortaX; hz1 = hz2 = sonra.v1; }
    else if (tip === "esnek") { s1 = ortaX - w1 - 26; s2 = ortaX + 26; hz1 = sonra.v1; hz2 = sonra.v2; }
    else { s1 = ortaX - w1 - 70; s2 = ortaX + 70; hz1 = sonra.v1; hz2 = sonra.v2; }
    if (soru) { hz1 = hz2 = null; }
    satir(1, "Sonra", s1, s2, { v1: hz1, v2: hz2, soru, birlesik: tip === "yapisan" }, tip === "yapisan" ? ["v", "v"] : ["v_1'", "v_2'"], false);
    if (tip === "yapisan") {
      // Yapışık gösterim: ortak çizgiyi belirginleştir
      const yb = k.y + 4 + satirH * 2 - 12, hmax = Math.max(bh(m1), bh(m2));
      ctx.save(); ctx.lineWidth = Math.max(1.6, kal * 1.3); cizgi(ctx, ortaX, yb, ortaX, yb - Math.min(bh(m1), bh(m2))); ctx.restore();
      void hmax;
    }
  }
  ctx.restore();
}

// ════════════════════════════════════════════════════════════════════════════
// 4) TORK
// ════════════════════════════════════════════════════════════════════════════

export function torkDengesi(v: CografyaVerisi): number {
  const m = ayarSayi(v, "mesnet"), konum = ayarSayilar(v, "konum"), deger = ayarSayilar(v, "deger"), mod = ayarSec(v, "mod");
  let t = 0;
  for (let i = 0; i < 4; i++) t += (mod === "agirlik" ? Math.abs(deger[i]) : deger[i]) * (konum[i] - m); // + saat yönü (aşağı yük, mesnedin sağında)
  return t;
}

export function torkCiz(ctx: CanvasRenderingContext2D, v: CografyaVerisi, k: Kutu) {
  const kal = ctx.lineWidth, punto = puntoOlc(k);
  const mesnet = ayarSayi(v, "mesnet"), konum = ayarSayilar(v, "konum"), deger = ayarSayilar(v, "deger");
  const mod = ayarSec(v, "mod"), destek = ayarSec(v, "destek");
  const adlar = bol(ayarMetin(v, "adlar"));
  const x0 = k.x + 34, x1 = k.x + k.w - 34, u = (x1 - x0) / 10;
  const barH = 16, by = k.y + k.h * 0.44;
  const X = (p: number) => x0 + p * u;
  ctx.save(); ctx.lineJoin = "round";
  // Mesnet
  const mx = X(mesnet);
  if (destek === "ip") {
    const tav = k.y + 8;
    cizgi(ctx, mx - 30, tav, mx + 30, tav);
    ctx.save(); ctx.lineWidth = Math.max(0.7, kal * 0.5); for (let x = mx - 30; x < mx + 30; x += 8) cizgi(ctx, x, tav, x + 5, tav - 6); ctx.restore();
    cizgi(ctx, mx, tav, mx, by);
  } else {
    const tb = by + barH + 30;
    ctx.save(); ctx.fillStyle = GRI; ctx.beginPath(); ctx.moveTo(mx, by + barH); ctx.lineTo(mx - 18, tb); ctx.lineTo(mx + 18, tb); ctx.closePath(); ctx.fill(); ctx.restore();
    ctx.beginPath(); ctx.moveTo(mx, by + barH); ctx.lineTo(mx - 18, tb); ctx.lineTo(mx + 18, tb); ctx.closePath(); ctx.stroke();
    zemin(ctx, mx - 40, mx + 40, tb, 6);
  }
  // Çubuk
  ctx.save(); ctx.fillStyle = "#e3e3e3"; ctx.fillRect(x0, by, x1 - x0, barH); ctx.restore();
  ctx.lineWidth = Math.max(1.5, kal * 1.2); ctx.strokeRect(x0, by, x1 - x0, barH); ctx.lineWidth = kal;
  if (ayarMantik(v, "olcek")) {
    ctx.save(); ctx.lineWidth = Math.max(0.7, kal * 0.5);
    for (let i = 1; i < 10; i++) cizgi(ctx, X(i), by, X(i), by + barH);
    ctx.restore();
    if (ayarMantik(v, "sayi")) for (let i = 0; i <= 10; i++) fizikMetniCiz(ctx, `${i}`, X(i), by + barH / 2, punto * 0.75);
  }
  if (destek === "ip") { ctx.beginPath(); ctx.arc(mx, by, 3, 0, Math.PI * 2); ctx.fill(); }
  else { ctx.beginPath(); ctx.arc(mx, by + barH, 3, 0, Math.PI * 2); ctx.fill(); }
  // Çubuğun ağırlığı
  if (ayarMantik(v, "agirlikOk")) {
    // Çubuğun ağırlığı G: merkezden aşağı
    ctx.lineWidth = Math.max(1.3, kal * 1.1); ok(ctx, X(5), by + barH / 2, X(5), by + barH + 34, 7);
    fizikMetniCiz(ctx, "vec(G)", X(5) + 12, by + barH + 30, punto * 0.95, "sol");
    ctx.lineWidth = kal;
  }
  // Yükler
  for (let i = 0; i < 4; i++) {
    const d = deger[i]; if (Math.abs(d) < 1e-9) continue;
    const x = X(konum[i]); const ad = adlar[i] ?? "";
    if (mod === "agirlik") {
      const sz = Math.max(20, Math.min(56, 16 + 5 * Math.abs(d)));
      const ipU = 18, ytop = by + barH + ipU;
      cizgi(ctx, x, by + barH, x, ytop);
      ctx.save(); ctx.fillStyle = "#d9d9d9"; ctx.fillRect(x - sz / 2, ytop, sz, sz * 0.8); ctx.restore(); ctx.strokeRect(x - sz / 2, ytop, sz, sz * 0.8);
      fizikMetniCiz(ctx, ad, x, ytop + sz * 0.4, punto * 0.95, "orta", undefined, sz - 4);
    } else {
      const len = Math.max(26, Math.min(64, 18 + 7 * Math.abs(d)));
      ctx.lineWidth = Math.max(1.4, kal * 1.2);
      if (d > 0) { ok(ctx, x, by - len - 4, x, by, 8); fizikMetniCiz(ctx, ad, x, by - len - 4 - punto * 0.7, punto); }
      else { ok(ctx, x, by + barH + len + 4, x, by + barH, 8); fizikMetniCiz(ctx, ad, x, by + barH + len + 4 + punto * 0.7, punto); }
      ctx.lineWidth = kal;
    }
  }
  ctx.restore();
}

// ════════════════════════════════════════════════════════════════════════════
// 5) VEKTÖR TOPLAMA (kareli düzlemde)
// ════════════════════════════════════════════════════════════════════════════

export function vektorToplamCiz(ctx: CanvasRenderingContext2D, v: CografyaVerisi, k: Kutu) {
  const yontem = ayarSec(v, "yontem"), kal = ctx.lineWidth;
  const ax = ayarSayi(v, "ax"), ay = ayarSayi(v, "ay"), bx = ayarSayi(v, "bx"), by = ayarSayi(v, "by");
  const punto = puntoOlc(k);
  const ad = bol(ayarMetin(v, "adlar")); const aA = ad[0] || "A", aB = ad[1] || "B", aR = ad[2] || "R";
  const A = { x: ax, y: ay }, B = { x: bx, y: by };
  type Seg = { a: { x: number; y: number }; b: { x: number; y: number }; ad: string; kalin: boolean; kesikli?: boolean };
  const seg: Seg[] = [];
  let Rs = { x: 0, y: 0 }, Re = { x: ax + bx, y: ay + by };
  if (yontem === "ucuca") {
    seg.push({ a: { x: 0, y: 0 }, b: A, ad: aA, kalin: false }, { a: A, b: { x: ax + bx, y: ay + by }, ad: aB, kalin: false });
  } else if (yontem === "paralel") {
    seg.push({ a: { x: 0, y: 0 }, b: A, ad: aA, kalin: false }, { a: { x: 0, y: 0 }, b: B, ad: aB, kalin: false },
      { a: A, b: { x: ax + bx, y: ay + by }, ad: "", kalin: false, kesikli: true }, { a: B, b: { x: ax + bx, y: ay + by }, ad: "", kalin: false, kesikli: true });
  } else {
    seg.push({ a: { x: 0, y: 0 }, b: A, ad: aA, kalin: false }, { a: { x: 0, y: 0 }, b: B, ad: aB, kalin: false });
    Rs = B; Re = A;
  }
  const noktalar = [{ x: 0, y: 0 }, A, B, Re, Rs];
  const minX = Math.min(...noktalar.map((p) => p.x)), maxX = Math.max(...noktalar.map((p) => p.x));
  const minY = Math.min(...noktalar.map((p) => p.y)), maxY = Math.max(...noktalar.map((p) => p.y));
  const spanX = maxX - minX, spanY = maxY - minY;
  const marjX = Math.max(1, Math.ceil((6 - spanX) / 2)), marjY = Math.max(1, Math.ceil((5 - spanY) / 2));
  const cols = spanX + 2 * marjX, rows = spanY + 2 * marjY;
  const pad = 6;
  const cell = Math.min(44, (k.w - 2 * pad) / cols, (k.h - 2 * pad) / rows);
  const gw = cols * cell, gh = rows * cell, gx = k.x + (k.w - gw) / 2, gy = k.y + (k.h - gh) / 2;
  const PX = (x: number) => gx + (x - minX + marjX) * cell, PY = (y: number) => gy + gh - (y - minY + marjY) * cell;
  const mur = ctx.strokeStyle;
  ctx.save(); ctx.lineJoin = "round"; ctx.lineCap = "round";
  if (ayarMantik(v, "izgara")) {
    ctx.save(); ctx.strokeStyle = "#bdbdbd"; ctx.lineWidth = Math.max(0.6, kal * 0.4);
    for (let i = 0; i <= cols; i++) cizgi(ctx, gx + i * cell, gy, gx + i * cell, gy + gh);
    for (let j = 0; j <= rows; j++) cizgi(ctx, gx, gy + j * cell, gx + gw, gy + j * cell);
    ctx.restore();
    ctx.strokeStyle = mur; ctx.fillStyle = mur as string;
  }
  const cx = noktalar.reduce((s, p) => s + p.x, 0) / noktalar.length, cy = noktalar.reduce((s, p) => s + p.y, 0) / noktalar.length;
  const etiketle = (a: { x: number; y: number }, b: { x: number; y: number }, t: string) => {
    if (!t) return;
    const mx = (PX(a.x) + PX(b.x)) / 2, my = (PY(a.y) + PY(b.y)) / 2;
    const dx = PX(b.x) - PX(a.x), dy = PY(b.y) - PY(a.y), L = Math.hypot(dx, dy) || 1;
    let nx = -dy / L, ny = dx / L;
    if (nx * (mx - PX(cx)) + ny * (my - PY(cy)) < 0) { nx = -nx; ny = -ny; }
    fizikMetniCiz(ctx, vecAd(t), mx + nx * 14, my + ny * 14, punto * 1.1);
  };
  const vektor = (a: { x: number; y: number }, b: { x: number; y: number }, kalin: number) => {
    ctx.lineWidth = Math.max(1.4, kal * kalin);
    ok(ctx, PX(a.x), PY(a.y), PX(b.x), PY(b.y), 8 + kalin * 2);
  };
  for (const s of seg) {
    if (s.kesikli) { ctx.save(); ctx.lineWidth = Math.max(0.9, kal * 0.6); kesik(ctx, PX(s.a.x), PY(s.a.y), PX(s.b.x), PY(s.b.y)); ctx.restore(); continue; }
    vektor(s.a, s.b, 1.1); etiketle(s.a, s.b, s.ad);
  }
  if (ayarMantik(v, "bileske")) {
    // Bileşke: kalın, adlı
    ctx.save();
    vektor(Rs, Re, 1.9);
    ctx.restore();
    const ad2 = yontem === "cikarma" ? `${aA} − ${aB}` : aR;
    const Lv = Math.hypot(Re.x - Rs.x, Re.y - Rs.y);
    const metin = ayarMantik(v, "uzunluk") ? `${ad2} (|${aR}| = ${sayiYaz(Lv)})` : ad2;
    const mx = (PX(Rs.x) + PX(Re.x)) / 2, my = (PY(Rs.y) + PY(Re.y)) / 2;
    const dx = PX(Re.x) - PX(Rs.x), dy = PY(Re.y) - PY(Rs.y), L = Math.hypot(dx, dy) || 1;
    let nx = -dy / L, ny = dx / L;
    if (nx * (mx - PX(cx)) + ny * (my - PY(cy)) < 0) { nx = -nx; ny = -ny; }
    fizikMetniCiz(ctx, yontem === "cikarma" ? metin : vecAd(aR) + (ayarMantik(v, "uzunluk") ? ` (|${aR}| = ${sayiYaz(Lv)})` : ""), mx + nx * 16, my + ny * 16, punto * 1.1, nx < -0.3 ? "sag" : nx > 0.3 ? "sol" : "orta");
    if (ayarMantik(v, "bilesen") && (Re.x !== Rs.x || Re.y !== Rs.y)) {
      ctx.save(); ctx.lineWidth = Math.max(0.9, kal * 0.6);
      kesik(ctx, PX(Rs.x), PY(Rs.y), PX(Re.x), PY(Rs.y)); kesik(ctx, PX(Re.x), PY(Rs.y), PX(Re.x), PY(Re.y)); ctx.restore();
      fizikMetniCiz(ctx, `${aR}_x`, (PX(Rs.x) + PX(Re.x)) / 2, PY(Rs.y) + (Re.y >= Rs.y ? 12 : -12), punto * 0.9);
      fizikMetniCiz(ctx, `${aR}_y`, PX(Re.x) + (Re.x >= Rs.x ? 12 : -12), (PY(Rs.y) + PY(Re.y)) / 2, punto * 0.9);
    }
  }
  ctx.restore();
}

// ════════════════════════════════════════════════════════════════════════════
// 6) SERBEST CİSİM DİYAGRAMI
// ════════════════════════════════════════════════════════════════════════════

export function scdCiz(ctx: CanvasRenderingContext2D, v: CografyaVerisi, k: Kutu) {
  const yuzey = ayarSec(v, "yuzey"), kal = ctx.lineWidth;
  const punto = puntoOlc(k);
  const adlar = bol(ayarMetin(v, "adlar"));
  const [aMg, aN, aF, aT, aD] = [adlar[0] || "mg", adlar[1] || "N", adlar[2] || "f", adlar[3] || "T", adlar[4] || "F"];
  const alfa = ayarSayi(v, "aci") * D2R;
  const nokta = ayarSec(v, "cisim") === "nokta", yuzeyCiz = ayarMantik(v, "yuzeyCiz");
  const bw = 58, bh = 40;
  ctx.save(); ctx.lineJoin = "round"; ctx.lineCap = "round";
  let C: { x: number; y: number }, uAlt = { x: 1, y: 0 }, nor = { x: 0, y: -1 }, aciBlok = 0;
  if (yuzey === "egik") {
    const yb = k.y + k.h - 16;
    const W = Math.min(k.w * 0.78, (k.h * 0.62) / Math.tan(alfa)), H = W * Math.tan(alfa), x0 = k.x + (k.w - W) / 2;
    const P0 = { x: x0, y: yb }, P1 = { x: x0 + W, y: yb }, P2 = { x: x0 + W, y: yb - H };
    if (yuzeyCiz) {
      ctx.save(); ctx.fillStyle = GRI; ctx.beginPath(); ctx.moveTo(P0.x, P0.y); ctx.lineTo(P1.x, P1.y); ctx.lineTo(P2.x, P2.y); ctx.closePath(); ctx.fill(); ctx.restore();
      ctx.lineWidth = Math.max(1.4, kal * 1.1); ctx.beginPath(); ctx.moveTo(P0.x, P0.y); ctx.lineTo(P1.x, P1.y); ctx.lineTo(P2.x, P2.y); ctx.closePath(); ctx.stroke(); ctx.lineWidth = kal;
      zemin(ctx, P0.x - 14, P1.x + 6, yb, 6);
      ctx.save(); ctx.lineWidth = Math.max(0.8, kal * 0.5);
      ctx.beginPath(); ctx.arc(P0.x, P0.y, 26, -alfa, 0); ctx.stroke(); ctx.restore();
      fizikMetniCiz(ctx, "α", P0.x + 40, P0.y - 8, punto * 0.95);
    }
    uAlt = { x: Math.cos(alfa), y: -Math.sin(alfa) }; nor = { x: -Math.sin(alfa), y: -Math.cos(alfa) };
    const t = Math.hypot(W, H) * 0.55, hh = nokta ? 0 : bh / 2;
    C = { x: P0.x + uAlt.x * t + nor.x * hh, y: P0.y + uAlt.y * t + nor.y * hh };
    aciBlok = -alfa;
  } else if (yuzey === "askida") {
    const tav = k.y + 10;
    C = { x: k.x + k.w / 2, y: k.y + k.h * 0.62 };
    if (yuzeyCiz) {
      cizgi(ctx, C.x - 40, tav, C.x + 40, tav);
      ctx.save(); ctx.lineWidth = Math.max(0.7, kal * 0.5); for (let x = C.x - 40; x < C.x + 40; x += 8) cizgi(ctx, x, tav, x + 5, tav - 6); ctx.restore();
      cizgi(ctx, C.x, tav, C.x, C.y - (nokta ? 0 : bh / 2));
    }
  } else {
    const yb = k.y + k.h * 0.72;
    C = { x: k.x + k.w / 2, y: yb - (nokta ? 0 : bh / 2) };
    if (yuzeyCiz) zemin(ctx, k.x + 8, k.x + k.w - 8, yb);
  }
  // Cisim
  if (nokta) { ctx.beginPath(); ctx.arc(C.x, C.y, 4.5, 0, Math.PI * 2); ctx.fill(); }
  else {
    ctx.save(); ctx.translate(C.x, C.y); ctx.rotate(aciBlok);
    ctx.fillStyle = "#e3e3e3"; ctx.fillRect(-bw / 2, -bh / 2, bw, bh); ctx.lineWidth = Math.max(1.4, kal * 1.1); ctx.strokeRect(-bw / 2, -bh / 2, bw, bh);
    ctx.restore();
  }
  const kuv = (dx: number, dy: number, boy: number, ad: string, kesikli = false, ince = false) => {
    const L = Math.hypot(dx, dy) || 1, ux = dx / L, uy = dy / L;
    const e = { x: C.x + ux * boy, y: C.y + uy * boy };
    ctx.save(); ctx.lineWidth = Math.max(ince ? 1 : 1.6, kal * (ince ? 0.8 : 1.3));
    if (kesikli) ctx.setLineDash([4, 3]);
    ok(ctx, C.x, C.y, e.x, e.y, ince ? 6 : 8); ctx.restore();
    ucYazi(ctx, vecAd(ad), e.x, e.y, ux, uy, punto);
  };
  const mgB = 54;
  const yon = ayarSec(v, "yon") === "sol" ? -1 : 1, da = ayarSayi(v, "disAci") * D2R;
  if (ayarMantik(v, "agirlik")) kuv(0, 1, mgB, aMg);
  if (ayarMantik(v, "normal") && yuzey !== "askida") kuv(nor.x, nor.y, yuzey === "egik" ? mgB * Math.cos(alfa) : mgB, aN);
  if (ayarMantik(v, "gerilme")) {
    if (yuzey === "askida") kuv(0, -1, mgB, aT);
    else kuv(uAlt.x, uAlt.y, 44, aT);
  }
  if (ayarMantik(v, "surtunme") && yuzey !== "askida") kuv(-uAlt.x * (yon === 1 ? 1 : -1), -uAlt.y * (yon === 1 ? 1 : -1), 34, aF);
  if (ayarMantik(v, "dis")) {
    // Yüzeye paralel doğrultudan, yüzeyden uzağa doğru da kadar yukarı eğik
    const dx = yon * uAlt.x * Math.cos(da) + nor.x * Math.sin(da), dy = yon * uAlt.y * Math.cos(da) + nor.y * Math.sin(da);
    kuv(dx, dy, 50, aD);
  }
  if (ayarMantik(v, "bilesen") && yuzey === "egik") {
    kuv(-uAlt.x, -uAlt.y, mgB * Math.sin(alfa), `${aMg} sinα`, true, true);
    kuv(-nor.x, -nor.y, mgB * Math.cos(alfa), `${aMg} cosα`, true, true);
  }
  ctx.restore();
}

// ════════════════════════════════════════════════════════════════════════════
// Dağıtıcı
// ════════════════════════════════════════════════════════════════════════════

export function fizikSekilCiz(ctx: CanvasRenderingContext2D, v: CografyaVerisi, k: Kutu) {
  return kokluIle(v, () => fizikSekilCizIc(ctx, v, k));
}
function fizikSekilCizIc(ctx: CanvasRenderingContext2D, v: CografyaVerisi, k: Kutu) {
  switch (v.yapi) {
    case "atis": return atisCiz(ctx, v, k);
    case "enerji": return enerjiCiz(ctx, v, k);
    case "carpisma": return carpismaCiz(ctx, v, k);
    case "tork": return torkCiz(ctx, v, k);
    case "vektorToplam": return vektorToplamCiz(ctx, v, k);
    case "scd": return scdCiz(ctx, v, k);
  }
}

/** Öğretmene hesap özeti (panelde gösterilir; şekle yazılmaz). Hesap yoksa null. */
export function fizikHesapOzeti(v: CografyaVerisi): string | null {
  return kokluIle(v, () => fizikHesapOzetiIc(v));
}
function fizikHesapOzetiIc(v: CografyaVerisi): string | null {
  if (v.yapi === "atis") {
    const h = atisHesapla(v);
    const not = ayarSec(v, "tip") !== "egik" && ayarSayi(v, "h0") <= 0 ? ` (yükseklik 0 girildiği için h = ${sayiYaz(h.h0, 0)} m alındı)` : "";
    return `${not ? "Not" + not + ". " : ""}Uçuş süresi T = ${sayiYaz(h.T)} s · menzil = ${sayiYaz(h.R)} m · en yüksek nokta H = ${sayiYaz(h.H)} m · vₓ = ${sayiYaz(h.vx)} m/s · ilk v_y = ${sayiYaz(h.vy)} m/s`;
  }
  if (v.yapi === "carpisma") {
    const m1 = ayarSayi(v, "m1"), m2 = ayarSayi(v, "m2"), tip = ayarSec(v, "tip");
    const a1 = tip === "ayrilma" ? 0 : ayarSayi(v, "v1"), a2 = tip === "ayrilma" ? 0 : ayarSayi(v, "v2");
    const s = carpismaSonra(v);
    const ek0 = 0.5 * m1 * a1 * a1 + 0.5 * m2 * a2 * a2, ek1 = 0.5 * m1 * s.v1 * s.v1 + 0.5 * m2 * s.v2 * s.v2;
    const p0 = m1 * a1 + m2 * a2;
    return `Sonra: v₁′ = ${sayiYaz(s.v1)} m/s, v₂′ = ${sayiYaz(s.v2)} m/s · momentum p = ${sayiYaz(p0)} kg·m/s (korunur) · kinetik enerji ${sayiYaz(ek0)} J → ${sayiYaz(ek1)} J`;
  }
  if (v.yapi === "tork") {
    const t = torkDengesi(v);
    return Math.abs(t) < 1e-9 ? "Mesnete göre net tork = 0: çubuk dengede." : `Mesnete göre net tork ≠ 0 (${sayiYaz(Math.abs(t))} birim, ${t > 0 ? "sağ taraf ağır" : "sol taraf ağır"}): çubuk dengede değil.`;
  }
  if (v.yapi === "vektorToplam") {
    const ax = ayarSayi(v, "ax"), ay = ayarSayi(v, "ay"), bx = ayarSayi(v, "bx"), by = ayarSayi(v, "by");
    const c = ayarSec(v, "yontem") === "cikarma";
    const rx = c ? ax - bx : ax + bx, ry = c ? ay - by : ay + by;
    return `${c ? "A − B" : "Bileşke"} = (${rx}, ${ry}) · büyüklüğü = ${sayiYaz(Math.hypot(rx, ry))} kare`;
  }
  return null;
}
