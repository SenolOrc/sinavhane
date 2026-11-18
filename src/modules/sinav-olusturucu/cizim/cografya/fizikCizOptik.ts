// Fizik şekilleri – Optik (ışığın kırılması): Snell yasası, tam yansıma, paralel katmanlar ve levha,
// görünür derinlik, prizmada ışın izleme (dağılma dahil), fiber optik. Saf çizim: veri → tuval. Yalnız gri/siyah.
import { fizikMetniCiz, fizikMetniOlcu } from "../fizik";
import { ayarMantik, ayarMetin, ayarSayi, ayarSec, type CografyaVerisi } from "./sema";
import { D2R, cizgi, puntoOlc, sayiYaz, type Kutu } from "./fizikYardim";

type Ctx = CanvasRenderingContext2D;
type V2 = { x: number; y: number };
const PI = Math.PI;
const R2D = 180 / PI;
/** Çizim başında yakalanan mürekkep rengi (save/restore sonrası ok başlıkları için). */
let MUR = "#000";
/** Etiket yerleştirmede kaçınılacak çizgiler, yerleşmiş yazı kutuları ve şekil sınırı (her çizimde sıfırlanır). */
type Rect = { x0: number; y0: number; x1: number; y1: number };
let ENGEL: [V2, V2][] = [];
let KUTULAR: Rect[] = [];
let SINIR: Rect = { x0: -1e9, y0: -1e9, x1: 1e9, y1: 1e9 };
const engelEkle = (a: V2, b: V2) => { ENGEL.push([a, b]); };
function segRect(a: V2, b: V2, r: Rect): boolean {
  let t0 = 0, t1 = 1; const dx = b.x - a.x, dy = b.y - a.y;
  const p = [-dx, dx, -dy, dy], q = [a.x - r.x0, r.x1 - a.x, a.y - r.y0, r.y1 - a.y];
  for (let i = 0; i < 4; i++) {
    if (p[i] === 0) { if (q[i] < 0) return false; }
    else { const t = q[i] / p[i]; if (p[i] < 0) { if (t > t1) return false; if (t > t0) t0 = t; } else { if (t < t0) return false; if (t < t1) t1 = t; } }
  }
  return true;
}
const kesisir = (a: Rect, b: Rect) => a.x0 < b.x1 && a.x1 > b.x0 && a.y0 < b.y1 && a.y1 > b.y0;

// ── Ortak yardımcılar ───────────────────────────────────────────────────────────────────────
const de = (r: number) => `${sayiYaz(r * R2D, 1).replace("-", "−")}°`;
/** Kırılma indisi yazımı: 4/3 ve 5/3 kesir, diğerleri en çok 2 ondalık. */
export function nYazi(n: number): string {
  if (Math.abs(n - 4 / 3) < 0.002) return "4/3";
  if (Math.abs(n - 5 / 3) < 0.002) return "5/3";
  return sayiYaz(n, 2);
}
/** Ortamın baskı dostu gri tonu: hava beyaz, yoğun ortam koyulaşır. */
const gri = (n: number) => { const g = Math.round(255 - Math.min(1, Math.max(0, n - 1) / 1.2) * 56); return `rgb(${g},${g},${g})`; };

function etiket(ctx: Ctx, metin: string, x: number, y: number, punto: number, hiza: "orta" | "sol" | "sag" = "orta", zemin = "#fff") {
  if (!metin) return;
  const w = fizikMetniOlcu(ctx, metin, punto).w + 4, x0 = hiza === "orta" ? x - w / 2 : hiza === "sol" ? x - 2 : x - w + 2;
  ctx.save(); ctx.fillStyle = zemin; ctx.fillRect(x0, y - punto * 0.62, w, punto * 1.24); ctx.restore();
  fizikMetniCiz(ctx, metin, x, y, punto, hiza);
  KUTULAR.push({ x0, y0: y - punto * 0.62, x1: x0 + w, y1: y + punto * 0.62 });
}
const birim = (a: number, b: number): V2 => { const L = Math.hypot(a, b) || 1; return { x: a / L, y: b / L }; };

/** Ucu (x,y)'den ux,uy yönüne bakan dolu ok başı (başlık merkezi (x,y)). */
function okBasi(ctx: Ctx, x: number, y: number, ux: number, uy: number, s = 8) {
  const tx = x + ux * s * 0.5, ty = y + uy * s * 0.5, bx = x - ux * s * 0.5, by = y - uy * s * 0.5;
  ctx.save(); ctx.fillStyle = MUR; ctx.beginPath();
  ctx.moveTo(tx, ty); ctx.lineTo(bx - uy * s * 0.34, by + ux * s * 0.34); ctx.lineTo(bx + uy * s * 0.34, by - ux * s * 0.34);
  ctx.closePath(); ctx.fill(); ctx.restore();
}
/** Işın: kırık çizgi, her parçanın ortasında yön oku. */
function isinCiz(ctx: Ctx, p: V2[], kal: number, kes = false, okla = true) {
  ctx.save(); ctx.strokeStyle = MUR; ctx.lineWidth = kal; ctx.lineJoin = "round"; if (kes) ctx.setLineDash([5, 3.5]);
  ctx.beginPath(); ctx.moveTo(p[0].x, p[0].y); for (let i = 1; i < p.length; i++) ctx.lineTo(p[i].x, p[i].y); ctx.stroke();
  ctx.restore();
  for (let i = 1; i < p.length; i++) engelEkle(p[i - 1], p[i]);
  if (!okla) return;
  for (let i = 1; i < p.length; i++) {
    const dx = p[i].x - p[i - 1].x, dy = p[i].y - p[i - 1].y, L = Math.hypot(dx, dy);
    if (L < 34) continue;
    okBasi(ctx, p[i - 1].x + dx * 0.5, p[i - 1].y + dy * 0.5, dx / L, dy / L, 8.5);
  }
}
function ince(ctx: Ctx, a: V2, b: V2, kal: number, desen: number[] = [4, 3]) {
  ctx.save(); ctx.strokeStyle = MUR; ctx.lineWidth = kal; ctx.setLineDash(desen); cizgi(ctx, a.x, a.y, b.x, b.y); ctx.restore();
  engelEkle(a, b);
}
/** O etrafında a→b yönleri (birim, ekran) arasında yay; metin varsa yayın dışına yazar. */
function aciYay(ctx: Ctx, o: V2, a: V2, b: V2, r: number, metin: string, punto: number, zemin = "#fff", bolge?: Partial<Rect>, kisit?: V2) {
  const a1 = Math.atan2(a.y, a.x), a2 = Math.atan2(b.y, b.x);
  let d = a2 - a1; while (d > PI) d -= 2 * PI; while (d < -PI) d += 2 * PI;
  if (Math.abs(d) < 0.02) return;
  ctx.save(); ctx.strokeStyle = MUR; ctx.lineWidth = Math.max(0.9, ctx.lineWidth * 0.62); ctx.beginPath(); ctx.arc(o.x, o.y, r, a1, a1 + d, d < 0); ctx.stroke(); ctx.restore();
  if (!metin) return;
  const { w, h } = fizikMetniOlcu(ctx, metin, punto), sg = Math.sign(d);
  const adaylar: [number, number][] = [[a1 + d / 2, 0], [a2 + sg * 0.28, 0], [a2 + sg * 0.5, 0], [a2 + sg * 0.3, 20], [a2 + sg * 0.3, 40], [a2 + sg * 0.6, 26], [a1 + d / 2, 16], [a2 + sg * 0.4, 18], [a1 - sg * 0.28, 0], [a1 - sg * 0.5, 0], [a1 - sg * 0.4, 18], [a1 - sg * 0.3, 20], [a1 - sg * 0.3, 40], [a1 + d / 2, 34]];
  if (Math.abs(d) < 0.42) adaylar.unshift(adaylar.splice(1, 1)[0]);
  let secilen: { x: number; y: number; r: Rect } | null = null, ilk: { x: number; y: number; r: Rect } | null = null;
  for (const [ang, ek] of adaylar) {
    const dx = Math.cos(ang), dy = Math.sin(ang), rr = r + 4 + ek + (Math.abs(dx) * w + Math.abs(dy) * h) / 2;
    const cx = o.x + dx * rr, cy = o.y + dy * rr, rc: Rect = { x0: cx - w / 2 - 1, y0: cy - h / 2 - 1, x1: cx + w / 2 + 1, y1: cy + h / 2 + 1 };
    if (!ilk) ilk = { x: cx, y: cy, r: rc };
    const kv = kisit ?? a;
    if ((cx - o.x) * kv.x + (cy - o.y) * kv.y < 3) continue;
    if (bolge && ((bolge.x0 !== undefined && rc.x0 < bolge.x0) || (bolge.x1 !== undefined && rc.x1 > bolge.x1) || (bolge.y0 !== undefined && rc.y0 < bolge.y0) || (bolge.y1 !== undefined && rc.y1 > bolge.y1))) continue;
    if (rc.x0 < SINIR.x0 || rc.x1 > SINIR.x1 || rc.y0 < SINIR.y0 || rc.y1 > SINIR.y1) continue;
    if (ENGEL.some(([p, q]) => segRect(p, q, rc)) || KUTULAR.some((b) => kesisir(b, rc))) continue;
    secilen = { x: cx, y: cy, r: rc }; break;
  }
  const yer = secilen ?? ilk!;
  etiket(ctx, metin, yer.x, yer.y, punto, "orta", zemin);
}
/** Adaylar (merkeze göre kaydırmalar) içinde çizgilere ve yazılara değmeyen ilk yere yazar. */
function serbestEtiket(ctx: Ctx, metin: string, cx: number, cy: number, punto: number, zemin: string, kayma: [number, number][]) {
  const { w, h } = fizikMetniOlcu(ctx, metin, punto);
  for (const [dx, dy] of kayma) {
    const x = cx + dx, y = cy + dy, rc: Rect = { x0: x - w / 2 - 1, y0: y - h / 2 - 1, x1: x + w / 2 + 1, y1: y + h / 2 + 1 };
    if (rc.x0 < SINIR.x0 || rc.x1 > SINIR.x1 || rc.y0 < SINIR.y0 || rc.y1 > SINIR.y1) continue;
    if (ENGEL.some(([p, q]) => segRect(p, q, rc)) || KUTULAR.some((b) => kesisir(b, rc))) continue;
    etiket(ctx, metin, x, y, punto, "orta", zemin); return;
  }
  etiket(ctx, metin, cx + kayma[0][0], cy + kayma[0][1], punto, "orta", zemin);
}
/** Işının kutu içinde kalan en büyük uzunluğu (p noktasından d yönünde). */
function kutuUzunluk(p: V2, d: V2, r: { x0: number; y0: number; x1: number; y1: number }): number {
  let t = 1e9;
  if (d.x > 1e-9) t = Math.min(t, (r.x1 - p.x) / d.x); else if (d.x < -1e-9) t = Math.min(t, (r.x0 - p.x) / d.x);
  if (d.y > 1e-9) t = Math.min(t, (r.y1 - p.y) / d.y); else if (d.y < -1e-9) t = Math.min(t, (r.y0 - p.y) / d.y);
  return Math.max(0, t);
}
const asin1 = (s: number) => Math.asin(Math.max(-1, Math.min(1, s)));

// ════════════════════════════════════════════════════════════════════════════
// KIRILMA (tek sınır, üç katman, paralel yüzlü levha)
// ════════════════════════════════════════════════════════════════════════════
export function kirilmaHesap(v: CografyaVerisi) {
  const tip = ayarSec(v, "tip");
  const n1 = ayarSayi(v, "n1"), n2 = ayarSayi(v, "n2");
  const n3 = tip === "uc" ? ayarSayi(v, "n3") : tip === "levha" ? n1 : n2;
  const t1 = ayarSayi(v, "aci") * D2R;
  const s2 = (n1 * Math.sin(t1)) / n2;
  const sinirda = Math.abs(s2 - 1) < 1e-9;
  const tir1 = s2 > 1 + 1e-9;
  const t2 = tir1 ? NaN : asin1(s2);
  let t3 = NaN, tir2 = false;
  if (tip !== "tek" && !tir1) { const s3 = (n2 * Math.sin(t2)) / n3; tir2 = s3 > 1 + 1e-9; t3 = tir2 ? NaN : asin1(s3); }
  const kritik1 = n1 > n2 ? Math.asin(n2 / n1) : NaN;
  const kritik2 = tip !== "tek" && n2 > n3 ? Math.asin(n3 / n2) : NaN;
  const e = ayarSayi(v, "e");
  const d = tip === "levha" && !tir1 && !tir2 && t2 < 1.5 ? Math.abs((e * Math.sin(t1 - t2)) / Math.cos(t2)) : NaN;
  return { tip, n1, n2, n3, t1, t2, t3, tir1, tir2, sinirda, kritik1, kritik2, e, d };
}

function kirilmaCiz(ctx: Ctx, v: CografyaVerisi, k: Kutu) {
  const h = kirilmaHesap(v), punto = puntoOlc(k) * 0.92, kal = ctx.lineWidth, kalin = Math.max(1.7, kal * 1.2);
  const tek = h.tip === "tek", dusey = tek && ayarSec(v, "sinir") === "dusey";
  const goster = ayarSec(v, "goster"), kirilanYok = goster === "kirilanYok", aciGizli = goster === "aciGizli";
  const aciYaz = ayarMantik(v, "aciYaz"), nYaz = ayarMantik(v, "nYaz"), ortamAd = ayarMantik(v, "ortamAd");
  const etk = ortamAd || nYaz, satir = etk ? 26 : 12;
  const ns = [h.n1, h.n2, h.n3], adlar = [ayarMetin(v, "ad1"), ayarMetin(v, "ad2"), ayarMetin(v, "ad3")];
  const ortamYazi = (i: number) => {
    const np = nYaz ? `n_${i + 1} = ${nYazi(ns[i])}` : `n_${i + 1}`;
    return ortamAd && adlar[i] ? `${adlar[i]} (${np})` : np;
  };
  const sin1 = Math.sin(h.t1), cos1 = Math.cos(h.t1);

  // Yerleşim: (ox, oy) = ilk sınırdaki geliş noktası.
  const ox = dusey ? k.x + k.w / 2 : k.x + (tek ? 0.4 : 0.46) * k.w;
  const oy = dusey ? k.y + k.h / 2 : tek ? k.y + k.h * 0.5 : k.y + k.h * 0.37;
  const sagSin = k.x + k.w - (h.tip === "levha" ? 74 : 12);
  const yerel = (u: number, w: number): V2 => (dusey ? { x: ox - w, y: oy + u } : { x: ox + u, y: oy - w });
  const yon = (du: number, dw: number): V2 => (dusey ? { x: -dw, y: du } : { x: du, y: -dw });
  // Sınırlar (yerel w ekseni): üst/alt sınırlar
  let tpx = 0;
  if (!tek) {
    const tBas = k.h * 0.29, tan2 = Math.tan(Math.min(h.tir1 ? 0 : h.t2, 1.5));
    tpx = Math.max(34, Math.min(tBas, (h.tir2 ? 95 : 150) / Math.max(0.2, tan2)));
  }
  const cap = dusey
    ? { uPos: k.y + k.h - oy - satir, uNeg: oy - k.y - 12, vPos: ox - k.x - 12, vNeg: k.x + k.w - 12 - ox }
    : { uPos: sagSin - ox, uNeg: ox - k.x - 12, vPos: oy - k.y - satir, vNeg: k.y + k.h - oy - satir };
  const uzun = (du: number, dw: number, vNegEk = 0, vPosEk = 0) => {
    let r = 1e9;
    if (du > 1e-6) r = Math.min(r, cap.uPos / du); else if (du < -1e-6) r = Math.min(r, cap.uNeg / -du);
    if (dw > 1e-6) r = Math.min(r, (cap.vPos - vPosEk) / dw); else if (dw < -1e-6) r = Math.min(r, (cap.vNeg - vNegEk) / -dw);
    return Math.max(8, r);
  };
  const RNOM = 138;

  // ── Ortam bölgeleri ──
  const bolge = (x0: number, y0: number, x1: number, y1: number, n: number) => {
    ctx.save(); ctx.fillStyle = gri(n); ctx.fillRect(x0, y0, x1 - x0, y1 - y0); ctx.strokeStyle = MUR; ctx.lineWidth = Math.max(0.8, kal * 0.6); ctx.strokeRect(x0, y0, x1 - x0, y1 - y0); ctx.restore();
  };
  const KX0 = k.x + 2, KX1 = k.x + k.w - 2, KY0 = k.y + 2, KY1 = k.y + k.h - 2;
  let y2 = 0;
  if (dusey) { bolge(KX0, KY0, ox, KY1, h.n1); bolge(ox, KY0, KX1, KY1, h.n2); }
  else if (tek) { bolge(KX0, KY0, KX1, oy, h.n1); bolge(KX0, oy, KX1, KY1, h.n2); }
  else { y2 = oy + tpx; bolge(KX0, KY0, KX1, oy, h.n1); bolge(KX0, oy, KX1, y2, h.n2); bolge(KX0, y2, KX1, KY1, h.n3); }
  ctx.save(); ctx.strokeStyle = MUR; ctx.lineWidth = kalin;
  if (dusey) cizgi(ctx, ox, KY0, ox, KY1); else { cizgi(ctx, KX0, oy, KX1, oy); if (!tek) cizgi(ctx, KX0, y2, KX1, y2); }
  ctx.restore();
  if (dusey) engelEkle({ x: ox, y: KY0 }, { x: ox, y: KY1 }); else { engelEkle({ x: KX0, y: oy }, { x: KX1, y: oy }); if (!tek) engelEkle({ x: KX0, y: y2 }, { x: KX1, y: y2 }); }
  const zemAt = (x: number, y: number) => {
    if (dusey) return gri(x < ox ? h.n1 : h.n2);
    if (tek) return gri(y < oy ? h.n1 : h.n2);
    return gri(y < oy ? h.n1 : y < y2 ? h.n2 : h.n3);
  };

  const R1: Partial<Rect> = dusey ? { x1: ox } : { y1: oy }, R2: Partial<Rect> = dusey ? { x0: ox } : tek ? { y0: oy } : { y0: oy, y1: y2 }, R3: Partial<Rect> = { y0: y2 };
  // Işın verisi (yerel: u sağa, w sınıra dik, birinci ortama doğru +)
  const kritikTek = ayarMantik(v, "kritik") && tek && h.n1 > h.n2;
  const yansimaCiz = ayarMantik(v, "yansima") || h.tir1 || h.sinirda;
  const nokta = (u: number, w: number) => yerel(u, w);

  // Normaller
  if (ayarMantik(v, "normal")) {
    ctx.save(); ctx.strokeStyle = MUR; ctx.lineWidth = Math.max(0.8, kal * 0.6); ctx.setLineDash([4, 3]);
    if (dusey) { cizgi(ctx, KX0 + 8, oy, KX1 - 8, oy); engelEkle({ x: KX0 + 8, y: oy }, { x: KX1 - 8, y: oy }); }
    else {
      const yTop = KY0 + 14, yBot = tek ? KY1 - 10 : y2 + 40;
      cizgi(ctx, ox, yTop, ox, yBot); engelEkle({ x: ox, y: yTop }, { x: ox, y: yBot });
      if (!tek && !h.tir1) {
        const qx = ox + tpx * Math.tan(h.t2), yb = Math.min(KY1 - 8, y2 + 44);
        if (qx < KX1 - 10) { cizgi(ctx, qx, y2 - 44, qx, yb); engelEkle({ x: qx, y: y2 - 44 }, { x: qx, y: yb }); }
        if (h.tir2) { const sx = ox + 2 * tpx * Math.tan(h.t2); if (sx < KX1 - 10) { cizgi(ctx, sx, oy - 44, sx, oy + 44); engelEkle({ x: sx, y: oy - 44 }, { x: sx, y: oy + 44 }); } }
      }
    }
    ctx.restore();
    const pn = dusey ? { x: KX0 + 9, y: oy - 10 } : { x: ox, y: KY0 + 10 };
    etiket(ctx, "N", pn.x, pn.y, punto, "orta", zemAt(pn.x, pn.y));
  }

  // ── Işınlar ──
  const A: V2 = nokta(0, 0);
  const incU = -sin1, incW = cos1; // gelen ışının başlangıç yönü (O'dan geriye)
  const Ri = Math.min(RNOM, uzun(incU, incW));
  isinCiz(ctx, [nokta(incU * Ri, incW * Ri), A], kalin);
  const Rr = Math.min(Ri, uzun(sin1, cos1));
  if (kritikTek && !h.sinirda) {
    const tc = h.kritik1, Rc = Math.min(RNOM * 0.92, uzun(-Math.sin(tc), Math.cos(tc)));
    ince(ctx, nokta(-Math.sin(tc) * Rc, Math.cos(tc) * Rc), A, Math.max(0.9, kal * 0.7));
    const Rb = Math.min(RNOM, uzun(1, 0));
    ince(ctx, A, nokta(Rb, 0), Math.max(0.9, kal * 0.7));
  }
  const refl = () => {
    const t = kalin * (h.tir1 ? 1 : 0.75);
    isinCiz(ctx, [A, nokta(sin1 * Rr, cos1 * Rr)], t);
  };
  let Q: V2 | null = null, S: V2 | null = null;
  const qxl = !tek && !h.tir1 ? tpx * Math.tan(h.t2) : 0;
  if (!kirilanYok) {
    if (h.tir1) refl();
    else {
      if (yansimaCiz) refl();
      if (h.sinirda) {
        isinCiz(ctx, [A, nokta(Math.min(RNOM, uzun(1, 0)), 0)], kalin);
      } else if (tek) {
        const Rt = Math.min(RNOM, uzun(Math.sin(h.t2), -Math.cos(h.t2)));
        isinCiz(ctx, [A, nokta(Math.sin(h.t2) * Rt, -Math.cos(h.t2) * Rt)], kalin);
      } else {
        Q = nokta(qxl, -tpx);
        if (h.tir2) {
          S = nokta(2 * qxl, 0);
          const Re = Math.min(RNOM, uzun(sin1, cos1) , (cap.uPos - 2 * qxl) / Math.max(0.2, sin1) );
          isinCiz(ctx, [A, Q, S, nokta(2 * qxl + sin1 * Re, cos1 * Re)], kalin);
        } else {
          const sin3 = Math.sin(h.t3), cos3 = Math.cos(h.t3);
          const R3 = Math.max(10, Math.min(RNOM, ((k.y + k.h - 10) - y2) / cos3, (cap.uPos - qxl) / Math.max(0.2, sin3)));
          isinCiz(ctx, [A, Q, nokta(qxl + sin3 * R3, -tpx - cos3 * R3)], kalin);
        }
      }
    }
  }

  // ── Yanal kayma ve levha kalınlığı ──
  if (h.tip === "levha" && !kirilanYok) {
    if (ayarMantik(v, "kayma") && Q && !h.tir1 && !h.tir2 && h.t1 > 0.02 && Number.isFinite(h.d)) {
      // Gelen ışının doğrultusu (kesikli) ve çıkan ışına dik ölçü
      const dirU = sin1, dirW = -cos1, Lq = (y2 + 60 > KY1 - 8 ? KY1 - 8 - y2 : 60);
      const ext = Math.min(Lq + tpx, ((k.y + k.h - 10) - oy) / cos1);
      ince(ctx, A, nokta(dirU * ext, dirW * ext), Math.max(0.9, kal * 0.7));
      const dm = h.t3 * 0 + 1; void dm;
      const E = nokta(qxl + dirU * Lq * 0.62, -tpx + dirW * Lq * 0.62);
      // E çıkan ışın üstünde; dik izdüşüm → gelen ışının doğrultusu
      const eL = { u: qxl + dirU * Lq * 0.62, w: -tpx + dirW * Lq * 0.62 };
      const tproj = eL.u * dirU + eL.w * dirW;
      const F = nokta(dirU * tproj, dirW * tproj);
      if (Math.hypot(E.x - F.x, E.y - F.y) > 9) {
        ctx.save(); ctx.strokeStyle = MUR; ctx.lineWidth = Math.max(0.8, kal * 0.6);
        okBasi(ctx, E.x + (F.x - E.x) * 0.08, E.y + (F.y - E.y) * 0.08, birim(F.x - E.x, F.y - E.y).x, birim(F.x - E.x, F.y - E.y).y, 6);
        okBasi(ctx, F.x + (E.x - F.x) * 0.08, F.y + (E.y - F.y) * 0.08, birim(E.x - F.x, E.y - F.y).x, birim(E.x - F.x, E.y - F.y).y, 6);
        cizgi(ctx, E.x, E.y, F.x, F.y);
        ctx.restore();
        const dTxt = ayarMantik(v, "aciYaz") ? `d = ${sayiYaz(h.d, 2)} cm` : "d";
        const tw = fizikMetniOlcu(ctx, dTxt, punto).w, mx = (E.x + F.x) / 2, my = (E.y + F.y) / 2, o1 = tw / 2 + 9;
        serbestEtiket(ctx, dTxt, mx, my, punto, gri(h.n3), [[o1, 4], [-o1, 4], [o1, 16], [-o1, 16], [0, 24], [o1 + 12, 26], [-o1 - 12, 26]]);
      }
    }
    // kalınlık ölçüsü
    const dx = k.x + k.w - 62;
    ctx.save(); ctx.strokeStyle = MUR; ctx.lineWidth = Math.max(0.8, kal * 0.6);
    okBasi(ctx, dx, oy + 6, 0, -1, 6); okBasi(ctx, dx, y2 - 6, 0, 1, 6); cizgi(ctx, dx, oy + 3, dx, y2 - 3); ctx.restore();
    etiket(ctx, aciYaz ? `e = ${sayiYaz(h.e, 1)} cm` : "e", dx + 6, (oy + y2) / 2, punto, "sol", gri(h.n2));
  }

  // ── Açı yayları ve yazıları ──
  const N_UP = yon(0, 1), N_DN = yon(0, -1);
  const tY = (s: string, t: number) => (aciYaz ? `${s} = ${de(t)}` : s);
  if (h.t1 > 0.02) {
    const back = yon(incU, incW), rf = yon(sin1, cos1);
    let rI = 34, rS = 34;
    if (kritikTek && !h.sinirda) { if (h.tir1) { rS = 22; rI = 42; } else { rS = 54; rI = 30; } }
    const adIn = h.sinirda && tek ? "θ_s" : "θ_1";
    const zUst = zemAt(A.x + N_UP.x * 20 + back.x * 20, A.y + N_UP.y * 20 + back.y * 20);
    aciYay(ctx, A, N_UP, back, rI, adIn === "θ_s" ? tY("θ_s", h.t1) : tY("θ_1", h.t1), punto, zUst, R1);
    if (!kirilanYok && (h.tir1 || (yansimaCiz && !h.sinirda) || h.sinirda)) aciYay(ctx, A, N_UP, rf, rI, tY(adIn, h.t1), punto, zUst, R1);
    if (kritikTek && !h.sinirda) {
      const tc = h.kritik1, bc = yon(-Math.sin(tc), Math.cos(tc));
      aciYay(ctx, A, N_UP, bc, rS, tY("θ_s", tc), punto, zUst, R1);
    }
    if (!kirilanYok && !h.tir1) {
      const z = zemAt(A.x + N_DN.x * 25 + yon(1, 0).x * 25, A.y + N_DN.y * 25 + yon(1, 0).y * 25);
      if (h.sinirda) aciYay(ctx, A, N_DN, yon(1, 0), 34, aciGizli ? "θ_2 = ?" : tY("θ_2", PI / 2), punto, z, R2);
      else {
        const rd = yon(Math.sin(h.t2), -Math.cos(h.t2));
        aciYay(ctx, A, N_DN, rd, 34, aciGizli ? "θ_2 = ?" : tY("θ_2", h.t2), punto, z, R2);
      }
    }
  }
  if (!tek && Q && !kirilanYok && !h.tir1) {
    const a2 = h.t2, bk = yon(-Math.sin(a2), Math.cos(a2));
    const zz = gri(h.n2);
    if (h.tir2) {
      const qpos = Q;
      const refl2 = yon(Math.sin(a2), Math.cos(a2));
      aciYay(ctx, qpos, N_UP, bk, 26, aciGizli ? "θ_2 = ?" : tY("θ_2", a2), punto, zz, R2);
      aciYay(ctx, qpos, N_UP, refl2, 26, "", punto, zz, R2);
      if (S) { aciYay(ctx, S, N_UP, yon(sin1, cos1), 30, tY("θ_1", h.t1), punto, gri(h.n1), R1); }
    } else {
      aciYay(ctx, Q, N_UP, bk, 26, aciGizli ? "θ_2 = ?" : tY("θ_2", a2), punto, zz, R2);
      aciYay(ctx, Q, N_DN, yon(Math.sin(h.t3), -Math.cos(h.t3)), 28, aciGizli ? "θ_3 = ?" : tY("θ_3", h.t3), punto, gri(h.n3), R3);
    }
  }

  // ── Ortam yazıları ──
  if (etk) {
    if (dusey) {
      etiket(ctx, ortamYazi(0), ox - 8, k.y + k.h - 13, punto, "sag", gri(h.n1));
      etiket(ctx, ortamYazi(1), ox + 8, k.y + k.h - 13, punto, "sol", gri(h.n2));
    } else if (tek) {
      etiket(ctx, ortamYazi(0), k.x + 9, k.y + 13, punto, "sol", gri(h.n1));
      etiket(ctx, ortamYazi(1), k.x + 9, k.y + k.h - 13, punto, "sol", gri(h.n2));
    } else {
      etiket(ctx, ortamYazi(0), k.x + 9, k.y + 13, punto, "sol", gri(h.n1));
      etiket(ctx, ortamYazi(1), k.x + 9, oy + 13, punto, "sol", gri(h.n2));
      if (h.tip === "uc") etiket(ctx, ortamYazi(2), k.x + 9, k.y + k.h - 13, punto, "sol", gri(h.n3));
      else etiket(ctx, ortamYazi(0).replace("_1", "_1"), k.x + 9, k.y + k.h - 13, punto, "sol", gri(h.n1));
    }
  }
}

// ════════════════════════════════════════════════════════════════════════════
// GÖRÜNÜR DERİNLİK
// ════════════════════════════════════════════════════════════════════════════
export function derinlikHesap(v: CografyaVerisi) {
  const n = ayarSayi(v, "n"), h = ayarSayi(v, "h"), suda = ayarSec(v, "yon") === "suda";
  const nCisim = suda ? n : 1, nGoz = suda ? 1 : n;
  return { n, h, suda, nCisim, nGoz, hg: (h * nGoz) / nCisim };
}
function baliCiz(ctx: Ctx, x: number, y: number, s: number, kes: boolean) {
  ctx.save(); ctx.fillStyle = kes ? "#fff" : "#bdbdbd"; ctx.strokeStyle = MUR; ctx.lineWidth = Math.max(1, ctx.lineWidth * 0.8); if (kes) ctx.setLineDash([3, 2.5]);
  ctx.beginPath(); ctx.ellipse(x, y, s, s * 0.5, 0, 0, 2 * PI); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x + s * 0.85, y); ctx.lineTo(x + s * 1.55, y - s * 0.5); ctx.lineTo(x + s * 1.55, y + s * 0.5); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.setLineDash([]); ctx.beginPath(); ctx.arc(x - s * 0.5, y - s * 0.1, 1.5, 0, 2 * PI); ctx.fillStyle = MUR; ctx.fill();
  ctx.restore();
}
function gozCiz(ctx: Ctx, x: number, y: number, ux: number, uy: number) {
  // (ux,uy): ışığın göze geliş yönü; göz ışığa doğru bakar.
  ctx.save(); ctx.translate(x, y); ctx.rotate(Math.atan2(uy, ux)); ctx.strokeStyle = MUR; ctx.lineWidth = Math.max(1, ctx.lineWidth * 0.8); ctx.fillStyle = "#fff";
  ctx.beginPath(); ctx.moveTo(-9, 0); ctx.quadraticCurveTo(0, -9, 9, 0); ctx.quadraticCurveTo(0, 9, -9, 0); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.arc(-3.5, 0, 3.2, 0, 2 * PI); ctx.fillStyle = MUR; ctx.fill();
  ctx.restore();
}
function derinlikCiz(ctx: Ctx, v: CografyaVerisi, k: Kutu) {
  const h = derinlikHesap(v), punto = puntoOlc(k) * 0.92, kal = ctx.lineWidth, kalin = Math.max(1.7, kal * 1.2);
  const deger = ayarMantik(v, "deger"), sonuc = ayarMantik(v, "sonuc"), adYaz = ayarMantik(v, "adYaz");
  const sivi = ayarMetin(v, "sivi"), ortamAd = ayarMantik(v, "ortamAd"), nYaz = ayarMantik(v, "nYaz");
  const ys = k.y + k.h * 0.5, ox = k.x + k.w * 0.56;
  const sg = h.suda ? 1 : -1; // nesne yönü: aşağı (+1) ya da yukarı (−1)
  const avail = (h.suda ? k.y + k.h - ys : ys - k.y) - 30;
  const sc = avail / Math.max(h.h, h.hg);
  const hp = h.h * sc, ha = h.hg * sc;
  // ortamlar
  ctx.save(); ctx.fillStyle = gri(h.n); ctx.fillRect(k.x + 2, ys, k.w - 4, k.y + k.h - 2 - ys);
  ctx.strokeStyle = MUR; ctx.lineWidth = Math.max(0.8, kal * 0.6); ctx.strokeRect(k.x + 2, k.y + 2, k.w - 4, k.h - 4);
  ctx.lineWidth = kalin; cizgi(ctx, k.x + 2, ys, k.x + k.w - 2, ys); ctx.restore();
  const O = { x: ox, y: ys + sg * hp }, I = { x: ox, y: ys + sg * ha };
  const al = Math.atan(1) * 0.8; // ≈ 36° değil: dar ışın (görünür derinlik paraksiyal)
  const xs = hp * Math.tan(Math.min(al * 0.45, 0.33)), P = { x: ox + xs, y: ys };
  const dB = birim(P.x - I.x, P.y - I.y);
  // gözlemci tarafına doğru uzantı
  const LB = 62, E0 = { x: P.x + dB.x * LB, y: P.y + dB.y * LB };
  // Görünen (sanal) ışın uzantısı
  ince(ctx, I, P, Math.max(0.9, kal * 0.75));
  // Işın A: dik
  const yA = ys - sg * 56;
  isinCiz(ctx, [O, { x: ox, y: ys }, { x: ox, y: yA }], kalin);
  // Işın B: eğik
  isinCiz(ctx, [O, P, E0], kalin);
  // gözlemci
  if (ayarMantik(v, "goz")) gozCiz(ctx, E0.x + dB.x * 9, E0.y + dB.y * 9, -dB.x, -dB.y);
  // cisim ve görüntü
  const balik = ayarSec(v, "cisim") === "balik";
  if (balik) { baliCiz(ctx, O.x - 8, O.y, 9, false); baliCiz(ctx, I.x - 8, I.y, 9, true); }
  else {
    ctx.save(); ctx.fillStyle = MUR; ctx.beginPath(); ctx.arc(O.x, O.y, 3.6, 0, 2 * PI); ctx.fill();
    ctx.fillStyle = "#fff"; ctx.strokeStyle = MUR; ctx.beginPath(); ctx.arc(I.x, I.y, 3.6, 0, 2 * PI); ctx.fill(); ctx.setLineDash([2, 1.6]); ctx.stroke(); ctx.restore();
  }
  const zO = gri(h.suda ? h.n : 1);
  if (adYaz) {
    etiket(ctx, "O", O.x + 22, O.y + sg * 4, punto, "orta", zO);
    etiket(ctx, "O′", I.x + 22, I.y + (Math.abs(ha - hp) < 16 ? -sg * 12 : sg * 4), punto, "orta", zO);
  }
  // ölçüler
  if (ayarMantik(v, "olcu")) {
    const d1x = ox - 150 + 0, d2x = ox - 62;
    const ek = (x: number, y: number) => { ctx.save(); ctx.strokeStyle = MUR; ctx.lineWidth = Math.max(0.8, kal * 0.6); ctx.setLineDash([2, 3]); cizgi(ctx, x, y, ox - 24, y); ctx.restore(); };
    const olcu = (x: number, yA2: number, yB: number, txt: string, tz: string) => {
      ctx.save(); ctx.strokeStyle = MUR; ctx.lineWidth = Math.max(0.8, kal * 0.6);
      const s = Math.sign(yB - yA2) || 1;
      okBasi(ctx, x, yA2 + s * 5, 0, -s, 6); okBasi(ctx, x, yB - s * 5, 0, s, 6); cizgi(ctx, x, yA2 + s * 3, x, yB - s * 3); ctx.restore();
      etiket(ctx, txt, x - 5, (yA2 + yB) / 2, punto, "sag", tz);
    };
    const hTxt = deger ? `h = ${sayiYaz(h.h, 1)} cm` : "h";
    const gTxt = sonuc ? (deger ? `h′ = ${sayiYaz(h.hg, 1)} cm` : "h′") : (deger ? "h′ = ?" : "h′");
    ek(d1x, ys); ek(d1x, O.y); olcu(d1x, ys, O.y, hTxt, zO);
    if (Math.abs(ha - hp) > 10) { ek(d2x, I.y); olcu(d2x, ys, I.y, gTxt, zO); }
    else etiket(ctx, gTxt, d2x - 5, I.y + sg * 2, punto, "sag", zO);
  }
  // ortam yazıları
  if (ortamAd) {
    const sv = nYaz ? `${sivi} (n = ${nYazi(h.n)})` : sivi;
    etiket(ctx, sv, k.x + k.w - 10, k.y + k.h - 14, punto, "sag", gri(h.n));
    etiket(ctx, "hava", k.x + k.w - 10, k.y + 14, punto, "sag", "#fff");
  }
}

// ════════════════════════════════════════════════════════════════════════════
// PRİZMA
// ════════════════════════════════════════════════════════════════════════════
type Olay = { p: V2; kenar: number; nOut: V2; gel: V2; tur: "tir" | "cikis" | "giris"; aciIc: number; aciDis: number; giden: V2 };
type PrizmaIz = { giris: V2; gelen: V2; yol: V2[]; olaylar: Olay[]; cikis: V2 | null; cikisYon: V2 | null; kenar0: number; nOut0: V2 };

/** Üçgen: tepe T, sol alt SA, sağ alt SG (matematik koordinatı, y yukarı). */
function ucgenKoseler(A: number) {
  const b = Math.tan(A / 2);
  return { T: { x: 0, y: 1 }, SA: { x: -b, y: 0 }, SG: { x: b, y: 0 } };
}
function prizmaIzle(A: number, n: number, giris: string, aci: number, f: number): PrizmaIz {
  const { T, SA, SG } = ucgenKoseler(A);
  const G = { x: 0, y: 1 / 3 };
  const kenarlar: [V2, V2][] = [[T, SA], [SA, SG], [SG, T]]; // 0 sol, 1 taban, 2 sağ
  const dis = (i: number): V2 => {
    const [a, b] = kenarlar[i], t = birim(b.x - a.x, b.y - a.y); let nn = { x: -t.y, y: t.x };
    const m = { x: (a.x + b.x) / 2 - G.x, y: (a.y + b.y) / 2 - G.y };
    if (nn.x * m.x + nn.y * m.y < 0) nn = { x: -nn.x, y: -nn.y };
    return nn;
  };
  const gi = giris === "taban" ? 1 : 0;
  const [a0, b0] = kenarlar[gi];
  const ff = giris === "taban" ? f : f; // kenar boyunca a0→b0 (sol: tepeden alta; taban: soldan sağa)
  const giriP = { x: a0.x + (b0.x - a0.x) * ff, y: a0.y + (b0.y - a0.y) * ff };
  const nO = dis(gi), ic = { x: -nO.x, y: -nO.y };
  const th = aci * D2R, c = Math.cos(th), s = Math.sin(th);
  const gelen = { x: ic.x * c - ic.y * s, y: ic.x * s + ic.y * c };
  const sinT = Math.sin(Math.abs(th)) / n, tt = Math.asin(sinT);
  const sg = th >= 0 ? 1 : -1, ct = Math.cos(tt), st = Math.sin(tt) * sg;
  let d = { x: ic.x * ct - ic.y * st, y: ic.x * st + ic.y * ct };
  const yol: V2[] = [giriP], olaylar: Olay[] = [];
  olaylar.push({ p: giriP, kenar: gi, nOut: nO, gel: gelen, tur: "giris", aciIc: tt, aciDis: Math.abs(th), giden: d });
  let p = giriP, onceki = gi, cikis: V2 | null = null, cikisYon: V2 | null = null;
  for (let it = 0; it < 8; it++) {
    let best = 1e9, bi = -1;
    for (let i = 0; i < 3; i++) {
      if (i === onceki) continue;
      const [a, b] = kenarlar[i], ex = b.x - a.x, ey = b.y - a.y, den = d.x * ey - d.y * ex;
      if (Math.abs(den) < 1e-12) continue;
      const t = ((a.x - p.x) * ey - (a.y - p.y) * ex) / den, u = ((a.x - p.x) * d.y - (a.y - p.y) * d.x) / den;
      if (t > 1e-7 && u >= -1e-9 && u <= 1 + 1e-9 && t < best) { best = t; bi = i; }
    }
    if (bi < 0) break;
    const q = { x: p.x + d.x * best, y: p.y + d.y * best }, no = dis(bi);
    yol.push(q);
    const ci = d.x * no.x + d.y * no.y, sinI = Math.sqrt(Math.max(0, 1 - ci * ci)), aciI = Math.asin(Math.min(1, sinI));
    if (n * sinI > 1 + 1e-9) {
      const r = { x: d.x - 2 * ci * no.x, y: d.y - 2 * ci * no.y };
      olaylar.push({ p: q, kenar: bi, nOut: no, gel: d, tur: "tir", aciIc: aciI, aciDis: aciI, giden: r });
      d = r; p = q; onceki = bi;
    } else {
      const sinO = Math.min(1, n * sinI), aciO = Math.asin(sinO);
      // dışa kırılma: teğet bileşeni koru
      const tan = { x: d.x - ci * no.x, y: d.y - ci * no.y }, tl = Math.hypot(tan.x, tan.y);
      const tu = tl < 1e-12 ? { x: 0, y: 0 } : { x: tan.x / tl, y: tan.y / tl };
      const out = { x: no.x * Math.cos(aciO) + tu.x * sinO, y: no.y * Math.cos(aciO) + tu.y * sinO };
      olaylar.push({ p: q, kenar: bi, nOut: no, gel: d, tur: "cikis", aciIc: aciI, aciDis: aciO, giden: out });
      cikis = q; cikisYon = out; break;
    }
  }
  return { giris: giriP, gelen, yol, olaylar, cikis, cikisYon, kenar0: gi, nOut0: nO };
}
export function prizmaHesap(v: CografyaVerisi) {
  const A = ayarSayi(v, "A") * D2R, n = ayarSayi(v, "n");
  const iz = prizmaIzle(A, n, ayarSec(v, "giris"), ayarSayi(v, "aci"), ayarSayi(v, "nokta") / 100);
  let sapma = NaN;
  if (iz.cikisYon) {
    const c = iz.gelen.x * iz.cikisYon.x + iz.gelen.y * iz.cikisYon.y;
    sapma = Math.acos(Math.max(-1, Math.min(1, c)));
  }
  return { A, n, iz, sapma, tirSayisi: iz.olaylar.filter((o) => o.tur === "tir").length, cikti: !!iz.cikisYon };
}
/** Kırmızı için n, mavi için n + dn ile iki izi birlikte döndürür. */
function prizmaCiz(ctx: Ctx, v: CografyaVerisi, k: Kutu) {
  const h = prizmaHesap(v), punto = puntoOlc(k) * 0.9, kal = ctx.lineWidth, kalin = Math.max(1.7, kal * 1.2);
  const aciYaz = ayarMantik(v, "aciYaz"), deger = ayarMantik(v, "degerYaz"), dag = ayarMantik(v, "dagilma");
  const Aderece = ayarSayi(v, "A"), b = Math.tan(h.A / 2);
  const sc = Math.min((k.h * 0.5), (k.w * 0.34) / b), cx = k.x + k.w * 0.5, yb = k.y + k.h * 0.7;
  const Sx = (p: V2): V2 => ({ x: cx + p.x * sc, y: yb - p.y * sc });
  const Dx = (d: V2): V2 => ({ x: d.x, y: -d.y });
  const { T, SA, SG } = ucgenKoseler(h.A);
  const kutu = { x0: k.x + 6, y0: k.y + 6, x1: k.x + k.w - 6, y1: k.y + k.h - 6 };
  // prizma gövdesi
  ctx.save(); ctx.fillStyle = gri(h.n); ctx.strokeStyle = MUR; ctx.lineWidth = kalin; ctx.lineJoin = "round";
  ctx.beginPath(); const t0 = Sx(T), t1 = Sx(SA), t2 = Sx(SG); ctx.moveTo(t0.x, t0.y); ctx.lineTo(t1.x, t1.y); ctx.lineTo(t2.x, t2.y); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.restore();
  engelEkle(t0, t1); engelEkle(t1, t2); engelEkle(t2, t0);

  const izleri = dag ? [{ iz: h.iz, kes: false, ad: "kırmızı" }, { iz: prizmaIzle(h.A, h.n + ayarSayi(v, "dn"), ayarSec(v, "giris"), ayarSayi(v, "aci"), ayarSayi(v, "nokta") / 100), kes: true, ad: "mavi" }] : [{ iz: h.iz, kes: false, ad: "" }];
  // gelen ışın
  const g = h.iz, gelenY = Dx(g.gelen), gp = Sx(g.giris);
  const Lg = Math.min(0.46 * k.w, kutuUzunluk(gp, { x: -gelenY.x, y: -gelenY.y }, kutu));
  isinCiz(ctx, [{ x: gp.x - gelenY.x * Lg, y: gp.y - gelenY.y * Lg }, gp], kalin);
  // normaller
  const NL = 24;
  const normalCiz = (o: Olay) => {
    const p = Sx(o.p), nn = Dx(o.nOut);
    ince(ctx, { x: p.x - nn.x * NL * 0.8, y: p.y - nn.y * NL * 0.8 }, { x: p.x + nn.x * NL * 1.4, y: p.y + nn.y * NL * 1.4 }, Math.max(0.8, kal * 0.6), [3, 2.5]);
  };
  if (ayarMantik(v, "normal")) for (const o of g.olaylar) normalCiz(o);
  // izler
  const sonlar: { p: V2; d: V2; ad: string }[] = [];
  for (const { iz, kes, ad } of izleri) {
    const yol = iz.yol.map(Sx);
    let cikisPts: V2[] = [];
    if (iz.cikis && iz.cikisYon) {
      const cp = Sx(iz.cikis), cd = Dx(iz.cikisYon), L = Math.min(0.46 * k.w, kutuUzunluk(cp, cd, kutu));
      cikisPts = [{ x: cp.x + cd.x * L, y: cp.y + cd.y * L }];
      sonlar.push({ p: cikisPts[0], d: cd, ad });
    }
    isinCiz(ctx, [...yol, ...cikisPts], kalin, kes);
  }
  // gelen ışının prizma içindeki başlangıcı kırmızı ile ortak; sapma açısı
  if (ayarMantik(v, "sapma") && !dag && h.cikti && Number.isFinite(h.sapma) && h.sapma > 0.02 && h.sapma < PI - 0.05) {
    const a = h.iz, d1 = a.gelen, d2 = a.cikisYon as V2, c = a.cikis as V2;
    const den = d1.x * d2.y - d1.y * d2.x;
    if (Math.abs(den) > 1e-6) {
      const t = ((c.x - a.giris.x) * d2.y - (c.y - a.giris.y) * d2.x) / den;
      const X = { x: a.giris.x + d1.x * t, y: a.giris.y + d1.y * t }, Xs = Sx(X);
      if (t > 0 && Xs.x > kutu.x0 && Xs.x < kutu.x1 && Xs.y > kutu.y0 && Xs.y < kutu.y1) {
        ince(ctx, Sx(a.giris), Xs, Math.max(0.9, kal * 0.7)); ince(ctx, Xs, Sx(c), Math.max(0.9, kal * 0.7));
        const dd = Dx(d1), de2 = Dx(d2);
        // kesişimden gelen ışının devamı (kesikli) ve çıkan ışın
        const ext = Math.min(34, kutuUzunluk(Xs, dd, kutu));
        ince(ctx, Xs, { x: Xs.x + dd.x * ext, y: Xs.y + dd.y * ext }, Math.max(0.9, kal * 0.7));
        aciYay(ctx, Xs, dd, de2, 22, "", punto, gri(h.n));
        const dyz = aciYaz && deger ? `δ = ${de(h.sapma)}` : "δ", bs = birim(dd.x + de2.x, dd.y + de2.y);
        serbestEtiket(ctx, dyz, Xs.x + bs.x * 40, Xs.y + bs.y * 40, punto, "#fff", [[0, 0], [0, -14], [14, -8], [-14, -8], [0, 14], [20, 10]]);
      }
    }
  }
  // açı yayları ve yazıları
  if (aciYaz) {
    let idx = 1;
    for (const o of g.olaylar) {
      const p = Sx(o.p), nOut = Dx(o.nOut), nIn = { x: -nOut.x, y: -nOut.y };
      const ad = (i: number) => `θ_${i}`, yazi = (i: number, a: number) => (deger ? `${ad(i)} = ${de(a)}` : ad(i));
      if (o.tur === "giris") {
        const gel = Dx(o.gel), geri = { x: -gel.x, y: -gel.y };
        if (o.aciDis > 0.02) aciYay(ctx, p, nOut, geri, 24, yazi(idx, o.aciDis), punto, "#fff");
        aciYay(ctx, p, nIn, Dx(o.giden), 20, yazi(idx + 1, o.aciIc), punto, gri(h.n));
        idx += 2;
      } else if (o.tur === "cikis") {
        const gel = Dx(o.gel), geri = { x: -gel.x, y: -gel.y };
        aciYay(ctx, p, nIn, geri, 20, yazi(idx, o.aciIc), punto, gri(h.n));
        aciYay(ctx, p, nOut, Dx(o.giden), 24, yazi(idx + 1, o.aciDis), punto, "#fff");
        idx += 2;
      } else {
        const gel = Dx(o.gel), geri = { x: -gel.x, y: -gel.y };
        aciYay(ctx, p, nIn, geri, 20, yazi(idx, o.aciIc), punto, gri(h.n));
        aciYay(ctx, p, nIn, Dx(o.giden), 20, "", punto, gri(h.n));
        idx += 1;
      }
    }
  }
  // dağılma etiketleri
  if (dag) for (const s2 of sonlar) etiket(ctx, s2.ad, s2.p.x - 3, s2.p.y + (s2.ad === "kırmızı" ? -22 : 14), punto * 0.92, "sag", "#fff");
  // tepe açısı, n
  if (ayarMantik(v, "tepeYaz")) {
    const ap = Sx(T);
    etiket(ctx, deger || aciYaz ? `A = ${sayiYaz(Aderece, 0)}°` : "A", ap.x, ap.y - 11, punto, "orta", "#fff");
  }
  if (ayarMantik(v, "nYaz")) {
    etiket(ctx, dag ? `n_k = ${sayiYaz(h.n, 2)}, n_m = ${sayiYaz(h.n + ayarSayi(v, "dn"), 2)}` : `n = ${nYazi(h.n)}`, k.x + 10, k.y + 14, punto, "sol", "#fff");
  }
}

// ════════════════════════════════════════════════════════════════════════════
// FİBER OPTİK
// ════════════════════════════════════════════════════════════════════════════
export function fiberHesap(v: CografyaVerisi) {
  const n1 = ayarSayi(v, "n1"), n2 = Math.min(ayarSayi(v, "n2"), n1), a = ayarSayi(v, "aci") * D2R;
  const tr = Math.asin(Math.sin(a) / n1), duvar = PI / 2 - tr;
  const kritik = Math.asin(n2 / n1), tir = n1 * Math.sin(duvar) >= n2 - 1e-9;
  const sinMax = Math.sqrt(Math.max(0, n1 * n1 - n2 * n2));
  return { n1, n2, a, tr, duvar, kritik, tir, aMaks: sinMax >= 1 ? PI / 2 : Math.asin(sinMax) };
}
function fiberCiz(ctx: Ctx, v: CografyaVerisi, k: Kutu) {
  const h = fiberHesap(v), punto = puntoOlc(k) * 0.9, kal = ctx.lineWidth, kalin = Math.max(1.7, kal * 1.2);
  const aciYaz = ayarMantik(v, "aciYaz"), deger = ayarMantik(v, "degerYaz");
  const cy = k.y + k.h * 0.5, c = Math.min(27, k.h * 0.15), band = 21;
  const x0 = k.x + 56, x1 = k.x + k.w - 158;
  // kılıf ve çekirdek
  ctx.save(); ctx.strokeStyle = MUR; ctx.lineWidth = Math.max(0.9, kal * 0.7);
  ctx.fillStyle = gri(h.n2 + 0.2); ctx.fillRect(x0, cy - c - band, x1 - x0, 2 * band + 2 * c);
  ctx.fillStyle = gri(h.n1 + 0.2); ctx.fillRect(x0, cy - c, x1 - x0, 2 * c);
  ctx.strokeRect(x0, cy - c - band, x1 - x0, 2 * band + 2 * c);
  ctx.lineWidth = kalin; cizgi(ctx, x0, cy - c, x1, cy - c); cizgi(ctx, x0, cy + c, x1, cy + c);
  ctx.restore();
  // kopukluk işareti
  ctx.save(); ctx.strokeStyle = MUR; ctx.lineWidth = Math.max(0.9, kal * 0.7); ctx.fillStyle = "#fff";
  ctx.beginPath(); ctx.moveTo(x1 - 1, cy - c - band - 2); ctx.lineTo(x1 + 7, cy - c * 0.5); ctx.lineTo(x1 - 1, cy + c * 0.5 + 0); ctx.lineTo(x1 + 7, cy + c + band + 2); ctx.lineTo(x1 + 12, cy + c + band + 2); ctx.lineTo(x1 + 12, cy - c - band - 2); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.restore();
  // ışın (yerel: x sağa, y yukarı)
  const ey = cy + c * 0.55; // giriş yüksekliği (ekran)
  const sa = Math.sin(h.a), ca = Math.cos(h.a);
  const Li = Math.min(x0 - k.x - 10, 70 / Math.max(0.3, sa) * 0.8, 62 / Math.max(0.05, ca)) ;
  const giris: V2 = { x: x0, y: ey };
  const bas: V2 = { x: x0 - ca * Li, y: ey + sa * Li };
  // normal (giriş yüzeyine dik = eksen yönü)
  if (ayarMantik(v, "normal")) ince(ctx, { x: x0 - 40, y: ey }, { x: x0 + 40, y: ey }, Math.max(0.8, kal * 0.6), [4, 3]);
  const pts: V2[] = [bas, giris];
  let px = x0, py = ey, dx = Math.cos(h.tr), dy = -Math.sin(h.tr); // yukarı yön: ekranda −y
  const duvarlar: { p: V2; yon: number; tir: boolean }[] = [];
  let sizdi: V2[] | null = null;
  for (let i = 0; i < 12 && px < x1 - 0.5; i++) {
    const hedefY = dy < 0 ? cy - c : cy + c, t = dy === 0 ? 1e9 : (hedefY - py) / dy;
    if (px + dx * t >= x1) { pts.push({ x: x1, y: py + dy * ((x1 - px) / dx) }); px = x1; break; }
    px += dx * t; py = hedefY; pts.push({ x: px, y: py });
    duvarlar.push({ p: { x: px, y: py }, yon: dy < 0 ? -1 : 1, tir: h.tir });
    if (!h.tir) {
      // kılıfa kırılma
      const sinPsi = Math.min(1, (h.n1 * Math.sin(h.duvar)) / h.n2), psi = Math.asin(sinPsi);
      const yy = dy < 0 ? -1 : 1, ux = Math.sin(psi), uy = Math.cos(psi) * yy;
      const L = Math.min(150, kutuUzunluk({ x: px, y: py }, { x: ux, y: uy }, { x0: k.x + 4, y0: k.y + 4, x1: k.x + k.w - 4, y1: k.y + k.h - 4 }));
      sizdi = [{ x: px, y: py }, { x: px + ux * L, y: py + uy * L }];
      break;
    }
    dy = -dy;
  }
  isinCiz(ctx, pts, kalin);
  if (sizdi) isinCiz(ctx, sizdi, kalin);
  // normaller ve açılar
  const yazi = (s: string, a: number) => (deger ? `${s} = ${de(a)}` : s);
  if (aciYaz) {
    const geri = birim(bas.x - giris.x, bas.y - giris.y);
    aciYay(ctx, giris, { x: -1, y: 0 }, geri, 26, yazi("θ_1", h.a), punto, "#fff");
    aciYay(ctx, giris, { x: 1, y: 0 }, birim(Math.cos(h.tr), -Math.sin(h.tr)), 22, yazi("θ_2", h.tr), punto, gri(h.n1 + 0.2));
  }
  if (duvarlar[0]) {
    const w = duvarlar[0], nn = { x: 0, y: w.yon }; // dışa normal
    if (ayarMantik(v, "normal")) ince(ctx, { x: w.p.x, y: w.p.y - w.yon * 20 }, { x: w.p.x, y: w.p.y + w.yon * 24 }, Math.max(0.8, kal * 0.6), [3, 2.5]);
    if (aciYaz) {
      const prev = pts[pts.indexOf(w.p) - 1] ?? pts[pts.length - 2], idx = pts.findIndex((q) => q.x === w.p.x && q.y === w.p.y);
      const a = pts[idx - 1], geri = birim(a.x - w.p.x, a.y - w.p.y); void prev;
      aciYay(ctx, w.p, { x: 0, y: -w.yon }, geri, 20, yazi("θ_3", h.duvar), punto, gri(h.n1 + 0.2));
      void nn;
    }
  }
  // yazılar
  if (ayarMantik(v, "ortamAd")) {
    const nYaz = ayarMantik(v, "nYaz"), lx = x1 + 18;
    etiket(ctx, nYaz ? `kılıf (n_2 = ${nYazi(h.n2)})` : "kılıf", lx, cy - c - band * 0.5 - 14, punto, "sol");
    etiket(ctx, nYaz ? `çekirdek (n_1 = ${nYazi(h.n1)})` : "çekirdek", lx, cy, punto, "sol");
    etiket(ctx, nYaz ? `kılıf (n_2 = ${nYazi(h.n2)})` : "kılıf", lx, cy + c + band * 0.5 + 14, punto, "sol");
    etiket(ctx, "hava", k.x + 8, cy + c + band + 18, punto, "sol");
  }
}

// ════════════════════════════════════════════════════════════════════════════
// Dışa açık
// ════════════════════════════════════════════════════════════════════════════
export function optikCiz(ctx: Ctx, v: CografyaVerisi, k: Kutu): boolean {
  ENGEL = []; KUTULAR = []; SINIR = { x0: k.x + 3, y0: k.y + 3, x1: k.x + k.w - 3, y1: k.y + k.h - 3 };
  switch (v.yapi) {
    case "kirilma": MUR = String(ctx.strokeStyle); kirilmaCiz(ctx, v, k); ctx.strokeStyle = MUR; return true;
    case "gorunurDerinlik": MUR = String(ctx.strokeStyle); derinlikCiz(ctx, v, k); ctx.strokeStyle = MUR; return true;
    case "prizmaIsin": MUR = String(ctx.strokeStyle); prizmaCiz(ctx, v, k); ctx.strokeStyle = MUR; return true;
    case "fiberOptik": MUR = String(ctx.strokeStyle); fiberCiz(ctx, v, k); ctx.strokeStyle = MUR; return true;
    default: return false;
  }
}

const dd = (r: number) => `${sayiYaz(r * R2D, 1)}°`;
export function optikOzet(v: CografyaVerisi): string | null | undefined {
  switch (v.yapi) {
    case "kirilma": {
      const h = kirilmaHesap(v);
      const p: string[] = [];
      if (h.tir1) p.push(`θ₁ = ${dd(h.t1)} > sınır açısı θ_s = ${dd(h.kritik1)} → tam yansıma (kırılan ışın yok, yansıma açısı = ${dd(h.t1)})`);
      else {
        p.push(`n₁·sinθ₁ = n₂·sinθ₂ → sinθ₂ = ${sayiYaz((h.n1 * Math.sin(h.t1)) / h.n2, 3)} → θ₂ = ${dd(h.t2)}`);
        if (h.sinirda) p.push("θ₁ tam sınır açısıdır: kırılan ışın yüzeye paralel gider (θ₂ = 90°)");
        else if (h.n1 < h.n2) p.push("Seyrek ortamdan yoğun ortama geçerken ışın normale yaklaşır");
        else if (h.n1 > h.n2) p.push(`Yoğun ortamdan seyrek ortama geçerken ışın normalden uzaklaşır (sınır açısı θ_s = ${dd(h.kritik1)})`);
        else p.push("n₁ = n₂: ışın doğrultusunu değiştirmez");
      }
      if (h.tip !== "tek" && !h.tir1) {
        if (h.tir2) p.push(`2. sınırda θ₂ = ${dd(h.t2)} > θ_s = ${dd(h.kritik2)} → tam yansıma; ışık 1. ortama θ₁ = ${dd(h.t1)} ile geri çıkar`);
        else p.push(`n₂·sinθ₂ = n₃·sinθ₃ → θ₃ = ${dd(h.t3)}${h.tip === "levha" ? " (= θ₁: çıkan ışın gelene paralel)" : ""}`);
        if (Number.isFinite(h.d)) p.push(`Yanal kayma d = e·sin(θ₁ − θ₂)/cosθ₂ = ${sayiYaz(h.d, 2)} cm`);
      }
      return p.join(" · ");
    }
    case "gorunurDerinlik": {
      const h = derinlikHesap(v);
      return `h′ = h·n_göz/n_cisim = ${sayiYaz(h.h, 1)}·${nYazi(h.nGoz)}/${nYazi(h.nCisim)} = ${sayiYaz(h.hg, 2)} cm · ${h.suda ? "cisim gerçek konumundan yüzeye daha yakın görünür" : "cisim gerçek konumundan daha uzak (yüksekte) görünür"} (bakış yüzeye dike yakınken)`;
    }
    case "prizmaIsin": {
      const h = prizmaHesap(v), p: string[] = [];
      const o0 = h.iz.olaylar[0];
      p.push(`Girişte sinθ₁ = n·sinθ₂ → θ₂ = ${dd(o0.aciIc)}`);
      h.iz.olaylar.slice(1).forEach((o, i) => {
        p.push(o.tur === "tir" ? `${i + 2}. yüzeyde gelme açısı ${dd(o.aciIc)} > sınır açısı ${dd(Math.asin(1 / h.n))} → tam yansıma` : `${i + 2}. yüzeyde gelme açısı ${dd(o.aciIc)} → ışık θ = ${dd(o.aciDis)} ile havaya çıkar`);
      });
      if (!h.cikti) p.push("Işın prizmadan çıkamadı (sürekli tam yansıma)");
      else p.push(`Sapma açısı δ = ${dd(h.sapma)}`);
      p.push(`Sınır açısı θ_s = asin(1/n) = ${dd(Math.asin(1 / h.n))}`);
      return p.join(" · ");
    }
    case "fiberOptik": {
      const h = fiberHesap(v);
      return `Uçta sinα = n₁·sinθ₂ → θ₂ = ${dd(h.tr)} · yan yüzeye gelme açısı = 90° − θ₂ = ${dd(h.duvar)}, sınır açısı θ_s = asin(n₂/n₁) = ${dd(h.kritik)} → ${h.tir ? "tam yansıma: ışık çekirdekte ilerler" : "tam yansıma olmaz: ışık kılıfa sızar"} · en büyük giriş açısı α_maks = ${dd(h.aMaks)}`;
    }
    default: return undefined;
  }
}
