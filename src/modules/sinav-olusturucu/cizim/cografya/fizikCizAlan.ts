// Fizik şekilleri – Elektrik alan: kareli düzlemde nokta yükler ve K, L, M noktalarındaki alan vektörleri
// (tek tek alanlar, bileşke, bileşenler), doğru üzerinde iki yükün E = 0 noktası. Yalnız gri/siyah.
// Büyüklükler kq/d² biriminde verilir (d: bir kare kenarı): E = |q| / r²  (r kare cinsinden).
import { fizikMetniCiz, fizikMetniOlcu } from "../fizik";
import { kokluYaz } from "../kokluDeger";
import { ayarMantik, ayarMetin, ayarSayi, ayarSayilar, ayarSec, type CografyaVerisi } from "./sema";
import { bol, cizgi, kesik, kokluAcikMi, kokluIle, ok, olcuOku, puntoOlc, type Kutu } from "./fizikYardim";

type Ctx = CanvasRenderingContext2D;
const EPS = 1e-9;

export type AlanYuk = { x: number; y: number; q: number; ad: string };
export type AlanTek = { yuk: number; ex: number; ey: number; buy: number };
export type AlanNokta = {
  ad: string; x: number; y: number;
  /** Noktada bir yük duruyor: alan tanımsız, vektör çizilmez. */
  yukUstunde: boolean;
  tek: AlanTek[]; ex: number; ey: number; buy: number; aci: number; sifir: boolean;
};

/** Noktasal q yükünün (px, py) noktasındaki alanı kq/d² biriminde: E = q·r̂ / r². */
export function alanVektoru(yukler: { x: number; y: number; q: number }[], px: number, py: number) {
  let ex = 0, ey = 0;
  for (const y of yukler) {
    const dx = px - y.x, dy = py - y.y, r2 = dx * dx + dy * dy;
    if (r2 < EPS) continue;
    const r = Math.sqrt(r2);
    ex += (y.q * dx) / (r2 * r); ey += (y.q * dy) / (r2 * r);
  }
  return { ex, ey };
}

/**
 * Doğru üzerinde iki yükün bileşke alanının sıfır olduğu konum (x ekseni, kare cinsinden).
 * Aynı işaret: yükler arasında, r₁/r₂ = √|q₁| / √|q₂|. Zıt işaret: büyüklüğü küçük olan yükün dışında
 * (|q| eşitse yok). Yük sıfırsa ya da yükler çakışıksa null.
 */
export function alanSifirNoktasi(x1: number, q1: number, x2: number, q2: number): number | null {
  if (Math.abs(q1) < EPS || Math.abs(q2) < EPS || Math.abs(x2 - x1) < EPS) return null;
  const a = Math.sqrt(Math.abs(q1)), b = Math.sqrt(Math.abs(q2)), d = x2 - x1;
  if (q1 * q2 > 0) return x1 + (a * d) / (a + b);
  if (Math.abs(a - b) < EPS) return null;
  return x1 + (a * d) / (a - b);
}

const nAd = (a: string) => (/^[A-Za-zα-ωΑ-Ω][0-9]$/.test(a) ? `${a[0]}_${a[1]}` : a);

function yukleriOku(v: CografyaVerisi): AlanYuk[] {
  const dogru = ayarSec(v, "mod") === "dogru";
  const n = dogru ? 2 : Math.round(ayarSayi(v, "yukSayisi"));
  const xs = ayarSayilar(v, "yx"), ys = ayarSayilar(v, "yy"), qs = ayarSayilar(v, "yq"), ad = bol(ayarMetin(v, "adlar"));
  const out: AlanYuk[] = [];
  for (let i = 0; i < n; i++) {
    if (Math.abs(qs[i]) < EPS) continue;
    out.push({ x: Math.round(xs[i]), y: dogru ? 0 : Math.round(ys[i]), q: qs[i], ad: nAd(ad[i] || `q${i + 1}`) });
  }
  return out;
}

export function alanHesap(v: CografyaVerisi) {
  const dogru = ayarSec(v, "mod") === "dogru";
  const yukler = yukleriOku(v);
  const np = Math.round(ayarSayi(v, "noktaSayisi"));
  const xs = ayarSayilar(v, "nx"), ys = ayarSayilar(v, "ny"), ad = bol(ayarMetin(v, "nAdlar"));
  const noktalar: AlanNokta[] = [];
  for (let i = 0; i < np; i++) {
    const x = Math.round(xs[i]), y = dogru ? 0 : Math.round(ys[i]);
    const yukUstunde = yukler.some((q) => q.x === x && q.y === y);
    const tek: AlanTek[] = [];
    if (!yukUstunde) {
      yukler.forEach((q, j) => {
        const f = alanVektoru([q], x, y);
        tek.push({ yuk: j, ex: f.ex, ey: f.ey, buy: Math.hypot(f.ex, f.ey) });
      });
    }
    let ex = tek.reduce((t, a) => t + a.ex, 0), ey = tek.reduce((t, a) => t + a.ey, 0);
    if (Math.abs(ex) < 1e-9) ex = 0;
    if (Math.abs(ey) < 1e-9) ey = 0;
    const buy = Math.hypot(ex, ey);
    noktalar.push({
      ad: ad[i] || String.fromCharCode(75 + i), x, y, yukUstunde, tek, ex, ey, buy,
      aci: buy < 1e-9 ? 0 : (Math.atan2(ey, ex) * 180) / Math.PI, sifir: !yukUstunde && buy < 1e-9,
    });
  }
  let sifirX: number | null = null;
  if (dogru && yukler.length === 2) sifirX = alanSifirNoktasi(yukler[0].x, yukler[0].q, yukler[1].x, yukler[1].q);
  return { dogru, yukler, noktalar, sifirX };
}

// ── Sayı biçimleri ────────────────────────────────────────────────────────────
const eksi = (s: string) => s.replace("-", "−");
/** Tam sayı oranı (payda ≤ 36) ise "a/b" ("−3/4"), değilse null. */
function kesirYaz(n: number): string | null {
  if (Math.abs(n) < EPS) return "0";
  for (let b = 1; b <= 36; b++) {
    const a = n * b, r = Math.round(a);
    if (Math.abs(a - r) < 1e-9 * Math.max(1, Math.abs(a))) return eksi(b === 1 ? String(r) : `${r}/${b}`);
  }
  return null;
}
const ondalik = (n: number, o = 2) => eksi(String(Number(n.toFixed(o))).replace(".", ","));
/** Şekilde: kesir; irrasyonelse köklü kip açıksa √ ile, değilse ondalık. */
export function degerYaz(n: number, koklu: boolean): string {
  const k = kesirYaz(n);
  if (k !== null) return k;
  if (koklu) { const s = kokluYaz(n); if (s) return s; }
  return ondalik(n, 2);
}
/** Hesap özetinde: her zaman tam değer (kesir ya da köklü), olmazsa 3 ondalık. */
export function alanTam(n: number): string {
  return kesirYaz(n) ?? kokluYaz(n) ?? ondalik(n, 3);
}
const yukYazisi = (q: number) => {
  const m = Math.abs(q);
  return `${q < 0 ? "−" : "+"}${m === 1 ? "" : String(Number(m.toFixed(2))).replace(".", ",")}q`;
};

// ── Çizim ─────────────────────────────────────────────────────────────────────
type Dikdortgen = { x0: number; y0: number; x1: number; y1: number };
const kesisir = (a: Dikdortgen, b: Dikdortgen) => a.x0 < b.x1 && a.x1 > b.x0 && a.y0 < b.y1 && a.y1 > b.y0;

export function alanNoktaCiz(ctx: Ctx, v: CografyaVerisi, k: Kutu): boolean {
  if (v.yapi !== "elektrikAlanNokta") return false;
  kokluIle(v, () => ciz(ctx, v, k));
  return true;
}

function ciz(ctx: Ctx, v: CografyaVerisi, k: Kutu) {
  const h = alanHesap(v), { dogru, yukler, noktalar } = h;
  const punto = puntoOlc(k, 13), kal = ctx.lineWidth, koyu = ctx.strokeStyle, dolgu = ctx.fillStyle;
  const koklu = kokluAcikMi(v), deger = ayarMantik(v, "deger");
  const goster = ayarSec(v, "goster"), hedef = ayarSec(v, "hedef"), yon = ayarSec(v, "olcek") === "yon";
  const okBoy = ayarSayi(v, "okBoy"), bilesen = ayarMantik(v, "bilesen");
  const tekGoster = goster === "hepsi" || goster === "tek", bilGoster = goster === "hepsi" || goster === "bileske";
  const secili = (i: number) => hedef === "hepsi" || Number(hedef) === i;
  const cizilen = noktalar.filter((p, i) => goster !== "yok" && secili(i) && !p.yukUstunde);

  // Vektör ölçeği: en uzun vektör okBoy kare ("yalnız yön"de hepsi okBoy kare).
  let enBuyuk = 0;
  for (const p of cizilen) {
    if (tekGoster) for (const t of p.tek) enBuyuk = Math.max(enBuyuk, t.buy);
    if (bilGoster) enBuyuk = Math.max(enBuyuk, p.buy);
  }
  const olcek = enBuyuk > EPS ? okBoy / enBuyuk : 0;
  // Karedeki (veri birimi) uç farkı.
  const uzunluk = (ex: number, ey: number) => {
    const L = Math.hypot(ex, ey);
    if (L < EPS) return { dx: 0, dy: 0 };
    const f = yon ? okBoy / L : olcek;
    return { dx: ex * f, dy: ey * f };
  };

  // Sınırlar (yükler, noktalar, vektör uçları, sıfır noktası)
  const nok: { x: number; y: number }[] = [...yukler, ...noktalar];
  for (const p of cizilen) {
    if (tekGoster) for (const t of p.tek) { const u = uzunluk(t.ex, t.ey); nok.push({ x: p.x + u.dx, y: p.y + u.dy }); }
    if (bilGoster) { const u = uzunluk(p.ex, p.ey); nok.push({ x: p.x + u.dx, y: p.y + u.dy }); }
  }
  const sifirGoster = dogru && ayarMantik(v, "sifirNokta") && h.sifirX !== null;
  if (sifirGoster) nok.push({ x: h.sifirX!, y: 0 });
  if (!nok.length) nok.push({ x: 0, y: 0 });
  const mnx = Math.min(...nok.map((q) => q.x)), mxx = Math.max(...nok.map((q) => q.x));
  const mny = dogru ? 0 : Math.min(...nok.map((q) => q.y)), mxy = dogru ? 0 : Math.max(...nok.map((q) => q.y));
  const gx0 = Math.floor(mnx - 0.9), gx1 = Math.ceil(mxx + 0.9), gy0 = dogru ? -1 : Math.floor(mny - 0.9), gy1 = dogru ? 1 : Math.ceil(mxy + 0.9);
  const sx = Math.max(2, gx1 - gx0), sy = Math.max(2, gy1 - gy0);
  const yazAlt = deger ? punto + 6 : 0;
  const pay = 8;
  let c = Math.min(44, (k.w - pay * 2) / sx, dogru ? 44 : (k.h - pay * 2 - yazAlt) / sy);
  const kb = ayarSayi(v, "kareBoy");
  if (kb > 0) c = Math.min(c, kb);
  c = Math.max(8, c);
  const W = sx * c, H = dogru ? 0 : sy * c;
  const ox = k.x + (k.w - W) / 2 - gx0 * c;
  const oy = dogru ? k.y + k.h / 2 : k.y + (k.h - yazAlt - H) / 2 + gy1 * c;
  const X = (x: number) => ox + x * c, Y = (y: number) => oy - y * c;

  ctx.save(); ctx.lineJoin = "round"; ctx.lineCap = "butt";
  // Kare çizgileri / cetvel
  if (ayarMantik(v, "izgara")) {
    ctx.save(); ctx.strokeStyle = "#c8c8c8"; ctx.lineWidth = 0.6;
    if (dogru) { for (let x = gx0; x <= gx1; x++) cizgi(ctx, X(x), Y(0) - 4, X(x), Y(0) + 4); }
    else {
      for (let x = gx0; x <= gx1; x++) cizgi(ctx, X(x), Y(gy0), X(x), Y(gy1));
      for (let y = gy0; y <= gy1; y++) cizgi(ctx, X(gx0), Y(y), X(gx1), Y(y));
    }
    ctx.restore(); ctx.strokeStyle = koyu; ctx.fillStyle = dolgu;
  }
  if (dogru) {
    ctx.save(); ctx.lineWidth = Math.max(1, kal * 0.8); cizgi(ctx, X(gx0), Y(0), X(gx1), Y(0)); ctx.restore();
  }

  const dolu: Dikdortgen[] = [];
  const yukR = Math.max(6, Math.min(10, c * 0.3));
  const beyaz = (t: string, cx: number, cy: number, p: number, yoket = true) => {
    const w = fizikMetniOlcu(ctx, t, p).w + 3, hh = p * 1.15;
    ctx.save(); ctx.fillStyle = "#fff"; ctx.fillRect(cx - w / 2, cy - hh / 2, w, hh); ctx.restore();
    ctx.fillStyle = dolgu; ctx.strokeStyle = koyu;
    fizikMetniCiz(ctx, t, cx, cy, p, "orta");
    if (yoket) dolu.push({ x0: cx - w / 2, y0: cy - hh / 2, x1: cx + w / 2, y1: cy + hh / 2 });
  };
  /** Verilen aday merkezlerden dolu kutulara çarpmayan ilkini seçer (yoksa en azını çarpanı). */
  const yerles = (t: string, p: number, adaylar: [number, number][]) => {
    const w = fizikMetniOlcu(ctx, t, p).w + 3, hh = p * 1.15;
    let en = adaylar[0], enSay = 1e9;
    for (const a of adaylar) {
      const r = { x0: a[0] - w / 2, y0: a[1] - hh / 2, x1: a[0] + w / 2, y1: a[1] + hh / 2 };
      const kutuIci = r.x0 >= k.x - 6 && r.x1 <= k.x + k.w + 6 && r.y0 >= k.y - 6 && r.y1 <= k.y + k.h + 6;
      const say = dolu.filter((d) => kesisir(d, r)).length + (kutuIci ? 0 : 2);
      if (say < enSay) { en = a; enSay = say; if (say === 0) break; }
    }
    beyaz(t, en[0], en[1], p);
  };
  /** Bir noktanın çevresinde (yarıçap r) etiket adayları: sağ-üst, sol-üst, sağ-alt, sol-alt, üst, alt, sağ, sol. */
  const cevre = (t: string, p: number, cx: number, cy: number, r: number): [number, number][] => {
    const w = fizikMetniOlcu(ctx, t, p).w + 3, hh = p * 1.15, dx = r + w / 2 + 1, dy = r + hh / 2 + 1;
    return [[cx + dx * 0.78, cy - dy * 0.78], [cx - dx * 0.78, cy - dy * 0.78], [cx + dx * 0.78, cy + dy * 0.78], [cx - dx * 0.78, cy + dy * 0.78],
      [cx, cy - dy], [cx, cy + dy], [cx + dx, cy], [cx - dx, cy]];
  };

  // Yükler
  const yaziTur = ayarSec(v, "yazi");
  ctx.save(); ctx.lineWidth = Math.max(1.2, kal);
  for (const q of yukler) {
    ctx.beginPath(); ctx.arc(X(q.x), Y(q.y), yukR, 0, Math.PI * 2); ctx.fillStyle = "#fff"; ctx.fill(); ctx.stroke();
    ctx.lineWidth = Math.max(1, kal * 0.8);
    cizgi(ctx, X(q.x) - yukR * 0.5, Y(q.y), X(q.x) + yukR * 0.5, Y(q.y));
    if (q.q > 0) cizgi(ctx, X(q.x), Y(q.y) - yukR * 0.5, X(q.x), Y(q.y) + yukR * 0.5);
    ctx.lineWidth = Math.max(1.2, kal);
    dolu.push({ x0: X(q.x) - yukR - 1, y0: Y(q.y) - yukR - 1, x1: X(q.x) + yukR + 1, y1: Y(q.y) + yukR + 1 });
  }
  ctx.restore(); ctx.strokeStyle = koyu; ctx.fillStyle = dolgu;
  // Noktalar (önce kutuları ayır)
  for (const p of noktalar) {
    ctx.save(); ctx.fillStyle = dolgu; ctx.beginPath(); ctx.arc(X(p.x), Y(p.y), 2.8, 0, Math.PI * 2); ctx.fill(); ctx.restore();
    dolu.push({ x0: X(p.x) - 3, y0: Y(p.y) - 3, x1: X(p.x) + 3, y1: Y(p.y) + 3 });
  }
  // Vektörler: aynı yöndeki oklar (ör. bileşke ile tek tek alan) üst üste binmesin diye dikey kaydırılır.
  const vecEtiket = (t: string, ux: number, uy: number, tx: number, ty: number) => {
    const p9 = punto * 0.92, w = fizikMetniOlcu(ctx, t, p9).w + 3, hh = punto * 1.1;
    const px = -uy, py = ux, ad: [number, number][] = [];
    for (const r of [0, 1, 2.2]) {
      const ax = ux * (w / 2 + 6 + r * 9), ay = uy * (hh / 2 + 5 + r * 9);
      for (const g of [0, 1, -1, 2, -2]) ad.push([tx + ax + px * g * (hh * 0.9), ty + ay + py * g * (hh * 0.9)]);
    }
    yerles(t, p9, ad);
  };
  const tekEtiketi = (t: AlanTek) => (deger ? `E_${t.yuk + 1} = ${degerYaz(t.buy, koklu)}` : `vec(E)_${t.yuk + 1}`);
  type Ogse = { p: AlanNokta; ex: number; ey: number; yazi: string; kalin: boolean; offx: number; offy: number };
  const taslak: (Ogse & { tx: number; ty: number; ux: number; uy: number })[] = [];
  ctx.save(); ctx.lineJoin = "round";
  for (const p of cizilen) {
    const px = X(p.x), py = Y(p.y);
    const ogeler: Ogse[] = [];
    if (tekGoster && !(yukler.length === 1 && bilGoster)) p.tek.forEach((t) => ogeler.push({ p, ex: t.ex, ey: t.ey, yazi: tekEtiketi(t), kalin: false, offx: 0, offy: 0 }));
    if (bilGoster && p.buy > EPS) ogeler.push({ p, ex: p.ex, ey: p.ey, yazi: deger ? `E_${p.ad} = ${degerYaz(p.buy, koklu)}` : `vec(E)_${p.ad}`, kalin: true, offx: 0, offy: 0 });
    // Yön grupları
    const grupla = ogeler.filter((o) => Math.hypot(o.ex, o.ey) > EPS);
    if (dogru) {
      let i = 0;
      for (const o of grupla) { if (!o.kalin) { o.offy = i === 0 ? -10 : 10; i++; } }
    } else {
      const gorulen = new Set<Ogse>();
      for (const o of grupla) {
        if (gorulen.has(o)) continue;
        const ayni = grupla.filter((q) => !gorulen.has(q) && Math.abs(q.ex * o.ey - q.ey * o.ex) < 1e-9 * Math.hypot(q.ex, q.ey) * Math.hypot(o.ex, o.ey) && q.ex * o.ex + q.ey * o.ey > 0);
        ayni.forEach((q) => gorulen.add(q));
        if (ayni.length < 2) continue;
        const L = Math.hypot(o.ex, o.ey), nx = -o.ey / L, ny = -o.ex / L; // ekrandaki dik (y ters)
        ayni.sort((a, b) => Number(a.kalin) - Number(b.kalin) || Math.hypot(a.ex, a.ey) - Math.hypot(b.ex, b.ey));
        ayni.forEach((q, i) => { const s = (i - (ayni.length - 1) / 2) * 5; q.offx = -nx * s; q.offy = ny * s * -1; });
      }
    }
    for (const o of ogeler) {
      const u = uzunluk(o.ex, o.ey);
      if (Math.hypot(u.dx, u.dy) < EPS) continue;
      const sx0 = px + o.offx, sy0 = py + o.offy, tx = sx0 + u.dx * c, ty = sy0 - u.dy * c;
      if (dogru && !o.kalin) { ctx.save(); ctx.lineWidth = Math.max(0.7, kal * 0.5); ctx.strokeStyle = "#8a8a8a"; kesik(ctx, px, py, px, sy0, [2, 2]); ctx.restore(); }
      if (o.kalin && bilesen && Math.abs(u.dx) > EPS && Math.abs(u.dy) > EPS) {
        ctx.save(); ctx.lineWidth = Math.max(0.9, kal * 0.7); ctx.strokeStyle = koyu;
        kesik(ctx, sx0, sy0, tx, sy0, [3, 3]); kesik(ctx, tx, sy0, tx, ty, [3, 3]); ctx.restore();
      }
      ctx.strokeStyle = koyu; ctx.fillStyle = dolgu; ctx.lineWidth = o.kalin ? Math.max(2.4, kal * 1.9) : Math.max(1.3, kal);
      ok(ctx, sx0, sy0, tx, ty, o.kalin ? 10 : 8);
      const Ls = Math.hypot(tx - sx0, ty - sy0);
      for (let m = 0; m <= Ls; m += 5) { const qx = sx0 + ((tx - sx0) * m) / Ls, qy = sy0 + ((ty - sy0) * m) / Ls; dolu.push({ x0: qx - 3, y0: qy - 3, x1: qx + 3, y1: qy + 3 }); }
      taslak.push({ ...o, tx, ty, ux: (tx - sx0) / Ls, uy: (ty - sy0) / Ls });
    }
  }
  ctx.restore(); ctx.strokeStyle = koyu; ctx.fillStyle = dolgu;
  // Yük yazıları
  if (yaziTur !== "yok") {
    for (const q of yukler) {
      const t = yaziTur === "ad" ? q.ad : yukYazisi(q.q);
      yerles(t, punto, cevre(t, punto, X(q.x), Y(q.y), yukR));
    }
  }

  for (const t of taslak.filter((q) => q.kalin)) vecEtiket(t.yazi, t.ux, t.uy, t.tx, t.ty);
  for (const t of taslak.filter((q) => !q.kalin)) vecEtiket(t.yazi, t.ux, t.uy, t.tx, t.ty);
  // Bileşke bileşen yazıları
  if (bilesen && bilGoster) {
    for (const p of cizilen) {
      if (p.buy < EPS || Math.abs(p.ex) < EPS || Math.abs(p.ey) < EPS) continue;
      const u = uzunluk(p.ex, p.ey), px = X(p.x), py = Y(p.y), tx = px + u.dx * c, ty = py - u.dy * c;
      const sg = u.dy >= 0 ? 1 : -1, sgx = u.dx >= 0 ? 1 : -1;
      const tX = deger ? `E_x = ${degerYaz(p.ex, koklu)}` : "E_x", tY = deger ? `E_y = ${degerYaz(p.ey, koklu)}` : "E_y";
      yerles(tX, punto * 0.85, [[(px + tx) / 2, py + sg * (punto * 0.75)], [(px + tx) / 2, py - sg * (punto * 0.75)]]);
      const wy = fizikMetniOlcu(ctx, tY, punto * 0.85).w / 2 + 5;
      yerles(tY, punto * 0.85, [[tx + sgx * wy, (py + ty) / 2], [tx - sgx * wy, (py + ty) / 2]]);
    }
  }
  // Bileşke sıfır olan noktalar: "E_K = 0"
  if (bilGoster) {
    for (const p of noktalar) {
      if (!yukler.length || !p.sifir || !secili(noktalar.indexOf(p))) continue;
      const t = `E_${p.ad} = 0`;
      yerles(t, punto * 0.92, cevre(t, punto * 0.92, X(p.x), Y(p.y), 5));
    }
  }
  // Nokta adları
  for (const p of noktalar) {
    const t = p.ad;
    yerles(t, punto, cevre(t, punto, X(p.x), Y(p.y), 4).slice(0, 8));
  }

  // E = 0 noktası (doğru üzerinde)
  if (sifirGoster) {
    const sx0 = X(h.sifirX!), y0 = Y(0);
    ctx.save(); ctx.lineWidth = Math.max(1, kal * 0.9); ctx.strokeStyle = koyu;
    kesik(ctx, sx0, y0 - 26, sx0, y0 + 26, [4, 3]);
    ctx.beginPath(); ctx.arc(sx0, y0, 3.2, 0, Math.PI * 2); ctx.fillStyle = "#fff"; ctx.fill(); ctx.stroke(); ctx.restore();
    ctx.strokeStyle = koyu; ctx.fillStyle = dolgu;
    const t = "E = 0";
    yerles(t, punto * 0.95, [[sx0, y0 - 26 - punto * 0.65], [sx0, y0 + 26 + punto * 0.65]]);
    if (deger) {
      // Yüklere uzaklıklar (kare cinsinden), çift uçlu ölçü okları
      ctx.save(); ctx.lineWidth = Math.max(0.8, kal * 0.6);
      yukler.forEach((q, qi) => {
        const yy = y0 + 26 + punto * 1.7 + qi * (punto + 4);
        const a = X(q.x), b = sx0, d = Math.abs(h.sifirX! - q.x);
        if (Math.abs(a - b) < 14) return;
        kesik(ctx, a, y0 + yukR + 2, a, yy + 4, [2, 2]);
        olcuOku(ctx, a, yy, b, yy, 4);
        beyaz(degerYaz(d, koklu), (a + b) / 2, yy, punto * 0.88, false);
      });
      ctx.restore(); ctx.strokeStyle = koyu; ctx.fillStyle = dolgu;
    }
  }

  // Birim notu
  if (deger) {
    ctx.fillStyle = dolgu;
    fizikMetniCiz(ctx, "E birimi: kq/d²  (d: bir kare kenarı)", k.x + k.w / 2, k.y + k.h - punto * 0.5, punto * 0.85, "orta");
  }
  ctx.restore();
}

// ── Hesap özeti ───────────────────────────────────────────────────────────────
export function alanNoktaOzet(v: CografyaVerisi): string | null | undefined {
  if (v.yapi !== "elektrikAlanNokta") return undefined;
  const h = alanHesap(v), { yukler, noktalar } = h;
  if (!yukler.length) return "Yük bulunamadı: en az bir yükün q ≠ 0 olmalı.";
  const nQ = (q: number) => yukYazisi(q);
  const parcalar: string[] = [];
  if (h.dogru) {
    if (yukler.length === 2) {
      const [a, b] = yukler, x0 = h.sifirX;
      if (x0 === null) parcalar.push(a.q * b.q < 0 ? "Eşit büyüklükte zıt yükler: doğru üzerinde E = 0 noktası yoktur" : "E = 0 noktası yok (yükler çakışık)");
      else {
        const d1 = Math.abs(x0 - a.x), d2 = Math.abs(x0 - b.x), ic = Math.min(a.x, b.x) < x0 && x0 < Math.max(a.x, b.x);
        parcalar.push(`E = 0 noktası: x = ${alanTam(x0)} (${ic ? "yükler arasında" : "yüklerin dışında, küçük yüke yakın"}) · ${a.ad}'e uzaklık ${alanTam(d1)}, ${b.ad}'e uzaklık ${alanTam(d2)} kare · koşul: |q₁|/r₁² = |q₂|/r₂² → r₁/r₂ = √(|q₁|/|q₂|) = ${alanTam(Math.sqrt(Math.abs(a.q / b.q)))}`);
      }
    } else parcalar.push("Doğru üzerinde E = 0 noktası için iki yük gerekir.");
  }
  for (const p of noktalar) {
    if (p.yukUstunde) { parcalar.push(`${p.ad}(${p.x}; ${p.y}) bir yükün üzerinde: alan tanımsız`); continue; }
    const tek = p.tek.map((t) => `${yukler[t.yuk].ad} (${nQ(yukler[t.yuk].q)}): E = ${alanTam(t.buy)}`).join(", ");
    if (p.sifir) { parcalar.push(`${p.ad}(${p.x}; ${p.y}): ${tek} → bileşke E = 0`); continue; }
    parcalar.push(`${p.ad}(${p.x}; ${p.y}): ${tek} → E_x = ${alanTam(p.ex)}, E_y = ${alanTam(p.ey)} · |E| = ${alanTam(p.buy)} kq/d² · +x ekseniyle ${alanTam(((p.aci % 360) + 360) % 360)}°`);
  }
  return `Birim kq/d² (d: bir kare kenarı), E = |q|/r² ve doğrultu: + yükten uzağa, − yüke doğru. ${parcalar.join(" · ")}`;
}
