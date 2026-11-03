// Geometri şekilleri: köşe adlı üçgen, çember (kiriş/teğet/merkez açı), benzer üçgenler,
// çokgen, açı yayı, dik açı işareti, eş kenar işareti.
//
// NEDEN BÖYLE: Üçgen aracı yalnız ikizkenar çiziyordu; etiketler elle tıklanıp köşelerden
// kayık duruyordu. Burada köşe adı, kenar ölçüsü, açı yayı, dik açı karesi ve eş kenar
// tırtığı ÜÇGENİN KENDİ VERİSİNDEN hesaplanır: köşe adı köşeden dışarı doğru (merkeze göre)
// konur, bu yüzden şekil taşınınca/boyanınca/değişince adlar köşeye bağlı kalır.
//
// Her şey saf (tuval/React bilmez); çizim yalnız `ctx` yöntemlerini çağırır.

import type { FizikEk, GeoAciIsareti, GeometriVerisi, Nokta, Sekil } from "./tipler";
import { MUREKKEP } from "./sabitler";
import { fizikMetniCiz } from "./fizik";

type FizikSekli = Extract<Sekil, { tur: "fizik" }>;
type UcgenVerisi = Extract<GeometriVerisi, { tur: "ucgen" }>;
type CemberVerisi = Extract<GeometriVerisi, { tur: "cember" }>;
type BenzerVerisi = Extract<GeometriVerisi, { tur: "benzer" }>;
type CokgenVerisi = Extract<GeometriVerisi, { tur: "cokgen" }>;

export const GEOMETRI_NESNELERI = ["ucgenABC", "dikUcgen", "benzerUcgen", "cemberGeo", "cokgenAd"] as const;
export const geometriMi = (nesne: string) => (GEOMETRI_NESNELERI as readonly string[]).includes(nesne);
/** `ek` ayarlarıyla çizilen basit işaretler. */
export const GEOMETRI_ISARETLERI = ["aciYayi", "dikAci", "esIsaret"] as const;

const RAD = Math.PI / 180;
const TAM = Math.PI * 2;

// ── Çizim yardımcıları ─────────────────────────────────────────────────────

function dogru(ctx: CanvasRenderingContext2D, a: Nokta, b: Nokta) {
  ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
}

function ince<T>(ctx: CanvasRenderingContext2D, k: number, ciz: () => T): T {
  ctx.save();
  ctx.lineWidth = Math.max(0.9, ctx.lineWidth * k);
  const r = ciz();
  ctx.restore();
  return r;
}

const norm = (a: number) => { let v = a % TAM; if (v <= -Math.PI) v += TAM; if (v > Math.PI) v -= TAM; return v; };

/** Köşede (V) iki ışın (P1, P2) arasındaki iç açının yayı; `adet` kadar iç içe yay. Yayın orta açısını döndürür. */
export function aciYayiCiz(ctx: CanvasRenderingContext2D, V: Nokta, P1: Nokta, P2: Nokta, r: number, adet = 1): number {
  const t1 = Math.atan2(P1.y - V.y, P1.x - V.x);
  const t2 = Math.atan2(P2.y - V.y, P2.x - V.x);
  const fark = norm(t2 - t1);
  ince(ctx, 0.85, () => {
    for (let i = 0; i < Math.max(1, adet); i += 1) {
      ctx.beginPath();
      ctx.arc(V.x, V.y, r + i * 4, t1, t1 + fark, fark < 0);
      ctx.stroke();
    }
  });
  return t1 + fark / 2;
}

/** Köşede dik açı işareti: iki kenar boyunca küçük kare. */
export function dikAciIsaretiCiz(ctx: CanvasRenderingContext2D, V: Nokta, P1: Nokta, P2: Nokta, boy: number) {
  const l1 = Math.hypot(P1.x - V.x, P1.y - V.y) || 1;
  const l2 = Math.hypot(P2.x - V.x, P2.y - V.y) || 1;
  const u = { x: ((P1.x - V.x) / l1) * boy, y: ((P1.y - V.y) / l1) * boy };
  const v = { x: ((P2.x - V.x) / l2) * boy, y: ((P2.y - V.y) / l2) * boy };
  ince(ctx, 0.85, () => {
    ctx.beginPath();
    ctx.moveTo(V.x + u.x, V.y + u.y);
    ctx.lineTo(V.x + u.x + v.x, V.y + u.y + v.y);
    ctx.lineTo(V.x + v.x, V.y + v.y);
    ctx.stroke();
  });
}

/** Doğru parçası ortasına eş kenar işareti (tırtık): `adet` kadar kısa dik çizgi. */
export function tirtikCiz(ctx: CanvasRenderingContext2D, a: Nokta, b: Nokta, adet: number, boy = 6) {
  const L = Math.hypot(b.x - a.x, b.y - a.y);
  if (L < 1e-6 || adet < 1) return;
  const ux = (b.x - a.x) / L, uy = (b.y - a.y) / L;
  const o = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
  const aralik = 4;
  ince(ctx, 0.9, () => {
    for (let i = 0; i < adet; i += 1) {
      const t = (i - (adet - 1) / 2) * aralik;
      const cx = o.x + ux * t, cy = o.y + uy * t;
      // Hafif eğik "/" tırtık (ders kitabı gösterimi): dikten biraz yatık.
      ctx.beginPath();
      ctx.moveTo(cx - uy * boy + ux * 2, cy + ux * boy + uy * 2);
      ctx.lineTo(cx + uy * boy - ux * 2, cy - ux * boy - uy * 2);
      ctx.stroke();
    }
  });
}

/** Köşe adı / etiketi: `merkez` noktasından köşeye doğru uzaklaşan yönde `uzak` kadar dışarıda. */
function koseAdi(ctx: CanvasRenderingContext2D, ad: string, kose: Nokta, merkez: Nokta, uzak: number, punto = 18) {
  const t = ad.trim();
  if (!t) return;
  const dx = kose.x - merkez.x, dy = kose.y - merkez.y;
  const L = Math.hypot(dx, dy) || 1;
  fizikMetniCiz(ctx, t, kose.x + (dx / L) * uzak, kose.y + (dy / L) * uzak, punto);
}

// ── Üçgen ──────────────────────────────────────────────────────────────────

/** Üçgenin köşeleri [A, B, C], matematik koordinatında (y yukarı). Geçersiz ölçüde null. */
export function ucgenKoseleri(v: UcgenVerisi): Nokta[] | null {
  if (v.mod === "serbest") {
    if (v.kose.length !== 3) return null;
    return v.kose.map((p) => ({ x: p.x, y: -p.y }));
  }
  if (v.mod === "kenar") {
    const [a, b, c] = v.olcu;
    if (![a, b, c].every((n) => Number.isFinite(n) && n > 0)) return null;
    if (a + b <= c + 1e-9 || a + c <= b + 1e-9 || b + c <= a + 1e-9) return null;
    const ax = (a * a + c * c - b * b) / (2 * a);
    const ay2 = c * c - ax * ax;
    if (ay2 <= 1e-12) return null;
    return [{ x: ax, y: Math.sqrt(ay2) }, { x: 0, y: 0 }, { x: a, y: 0 }];
  }
  const [b, c, aci] = v.olcu;
  if (![b, c, aci].every((n) => Number.isFinite(n)) || b <= 0 || c <= 0 || aci <= 0.5 || aci >= 179.5) return null;
  return [{ x: 0, y: 0 }, { x: c, y: 0 }, { x: b * Math.cos(aci * RAD), y: b * Math.sin(aci * RAD) }];
}

/** Üçgenin kenar uzunlukları [a (BC), b (CA), c (AB)] ve iç açıları [A, B, C] (derece). */
export function ucgenOlculeri(koseler: Nokta[]): { kenar: number[]; aci: number[] } {
  const [A, B, C] = koseler;
  const d = (p: Nokta, q: Nokta) => Math.hypot(p.x - q.x, p.y - q.y);
  const a = d(B, C), b = d(C, A), c = d(A, B);
  const aci = (x: number, y: number, z: number) => Math.acos(Math.max(-1, Math.min(1, (y * y + z * z - x * x) / (2 * y * z)))) / RAD;
  return { kenar: [a, b, c], aci: [aci(a, b, c), aci(b, c, a), aci(c, a, b)] };
}

/** Kutuya sığdırılmış köşeler (tuval koordinatı) ve ölçek. */
function kutuyaSigdir(koseler: Nokta[], k: { x: number; y: number; w: number; h: number }, pay: number): Nokta[] {
  const xs = koseler.map((p) => p.x), ys = koseler.map((p) => p.y);
  const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
  const bw = Math.max(1e-9, x1 - x0), bh = Math.max(1e-9, y1 - y0);
  const olcek = Math.max(1e-6, Math.min((k.w - 2 * pay) / bw, (k.h - 2 * pay) / bh));
  const ox = k.x + k.w / 2 - ((x0 + x1) / 2) * olcek;
  const oy = k.y + k.h / 2 + ((y0 + y1) / 2) * olcek;
  return koseler.map((p) => ({ x: ox + p.x * olcek, y: oy - p.y * olcek }));
}

const ayakNoktasi = (P: Nokta, A: Nokta, B: Nokta): Nokta => {
  const dx = B.x - A.x, dy = B.y - A.y;
  const t = ((P.x - A.x) * dx + (P.y - A.y) * dy) / (dx * dx + dy * dy || 1);
  return { x: A.x + t * dx, y: A.y + t * dy };
};

function ucgenCiz(ctx: CanvasRenderingContext2D, v: UcgenVerisi, k: { x: number; y: number; w: number; h: number }) {
  const ham = ucgenKoseleri(v) ?? ucgenKoseleri(varsayilanUcgen())!;
  const P = kutuyaSigdir(ham, k, 30);
  const [A, B, C] = P;
  const merkez = { x: (A.x + B.x + C.x) / 3, y: (A.y + B.y + C.y) / 3 };
  ctx.beginPath();
  ctx.moveTo(A.x, A.y); ctx.lineTo(B.x, B.y); ctx.lineTo(C.x, C.y); ctx.closePath();
  ctx.stroke();

  // Yükseklik: köşeden karşı kenara dik (kesikli değil; ince düz çizgi), ayağı ve dik açı işaretiyle.
  const yi = ["A", "B", "C"].indexOf(v.yukseklik);
  if (yi >= 0) {
    const tepe = P[yi], t1 = P[(yi + 1) % 3], t2 = P[(yi + 2) % 3];
    const H = ayakNoktasi(tepe, t1, t2);
    ince(ctx, 0.85, () => dogru(ctx, tepe, H));
    const boy = Math.min(10, Math.hypot(tepe.x - H.x, tepe.y - H.y) * 0.25);
    // Ayak, kenar uzantısındaysa (geniş açılı üçgen) dik açı işareti ayağın tepe tarafındaki yönde.
    const yon = Math.hypot(t1.x - H.x, t1.y - H.y) >= Math.hypot(t2.x - H.x, t2.y - H.y) ? t1 : t2;
    dikAciIsaretiCiz(ctx, H, tepe, yon, boy);
    if (v.ayakAdi.trim()) {
      const dx = H.x - tepe.x, dy = H.y - tepe.y, L = Math.hypot(dx, dy) || 1;
      fizikMetniCiz(ctx, v.ayakAdi.trim(), H.x + (dx / L) * 14, H.y + (dy / L) * 14, 17);
    }
    if (v.yukseklikEtiket.trim()) {
      const o = { x: (tepe.x + H.x) / 2, y: (tepe.y + H.y) / 2 };
      const nx = -(H.y - tepe.y), ny = H.x - tepe.x, nl = Math.hypot(nx, ny) || 1;
      const yonu = ((o.x - merkez.x) * nx + (o.y - merkez.y) * ny) >= 0 ? 1 : -1;
      fizikMetniCiz(ctx, v.yukseklikEtiket.trim(), o.x + (yonu * nx / nl) * 12, o.y + (yonu * ny / nl) * 12, 16);
    }
  }

  // Açı işaretleri ve etiketleri: A, B, C köşeleri
  for (let i = 0; i < 3; i += 1) {
    const V = P[i], P1 = P[(i + 1) % 3], P2 = P[(i + 2) % 3];
    const isaret: GeoAciIsareti = v.aciIsareti[i] ?? "yok";
    const adet = v.esAci[i] ?? 0;
    const etiket = (v.acilar[i] ?? "").trim();
    const r = Math.min(20, Math.hypot(P1.x - V.x, P1.y - V.y) * 0.25, Math.hypot(P2.x - V.x, P2.y - V.y) * 0.25);
    let orta: number | null = null;
    if (isaret === "dik") {
      dikAciIsaretiCiz(ctx, V, P1, P2, Math.max(7, r * 0.7));
      orta = Math.atan2((P1.y + P2.y) / 2 - V.y, (P1.x + P2.x) / 2 - V.x);
    } else if (isaret === "yay" || adet > 0) {
      orta = aciYayiCiz(ctx, V, P1, P2, Math.max(8, r), isaret === "yay" ? Math.max(1, adet) : adet);
    }
    if (etiket) {
      const t = orta ?? Math.atan2((P1.y + P2.y) / 2 - V.y, (P1.x + P2.x) / 2 - V.x);
      const d = (isaret === "dik" ? Math.max(7, r * 0.7) * 1.9 : Math.max(8, r)) + 15 + Math.max(0, adet - 1) * 4;
      fizikMetniCiz(ctx, etiket, V.x + Math.cos(t) * d, V.y + Math.sin(t) * d, 15);
    }
  }

  // Eş kenar işaretleri ve kenar etiketleri: a = BC, b = CA, c = AB
  const kenarlar: [Nokta, Nokta][] = [[B, C], [C, A], [A, B]];
  kenarlar.forEach(([p, q], i) => {
    tirtikCiz(ctx, p, q, v.esKenar[i] ?? 0);
    const t = (v.kenarlar[i] ?? "").trim();
    if (!t) return;
    const o = { x: (p.x + q.x) / 2, y: (p.y + q.y) / 2 };
    const dx = o.x - merkez.x, dy = o.y - merkez.y, L = Math.hypot(dx, dy) || 1;
    fizikMetniCiz(ctx, t, o.x + (dx / L) * 15, o.y + (dy / L) * 14, 16);
  });

  // Köşe adları: köşeye bağlı (merkezden köşeye doğru dışarıda)
  P.forEach((q, i) => koseAdi(ctx, v.adlar[i] ?? "", q, merkez, 17));
}

// ── Çember ─────────────────────────────────────────────────────────────────

function cemberCiz(ctx: CanvasRenderingContext2D, v: CemberVerisi, k: { x: number; y: number; w: number; h: number }) {
  const O = { x: k.x + k.w / 2, y: k.y + k.h / 2 };
  const R = Math.max(10, Math.min(k.w, k.h) / 2 - 26);
  const nokta = (aci: number): Nokta => ({ x: O.x + R * Math.cos(aci * RAD), y: O.y - R * Math.sin(aci * RAD) });
  ctx.beginPath(); ctx.arc(O.x, O.y, R, 0, TAM); ctx.stroke();
  const [A, B, C, T] = (v.konum.length >= 4 ? v.konum : [200, 340, 90, 300]).map(nokta);
  const nok = (p: Nokta, r = 2.6) => { ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, TAM); ctx.fill(); };
  const ad = (i: number) => (v.adlar[i] ?? "").trim();

  if (v.cap) {
    const A2 = { x: 2 * O.x - A.x, y: 2 * O.y - A.y };
    dogru(ctx, A, A2);
    nok(A2);
    koseAdi(ctx, ad(5), A2, O, 15);
  }
  if (v.kiris) dogru(ctx, A, B);
  if (v.yaricap) dogru(ctx, O, A);
  if (v.merkezAci) {
    dogru(ctx, O, A);
    dogru(ctx, O, B);
    const orta = aciYayiCiz(ctx, O, A, B, Math.max(12, R * 0.22), 1);
    const t = v.merkezAciEtiket.trim();
    if (t) fizikMetniCiz(ctx, t, O.x + Math.cos(orta) * (R * 0.22 + 20), O.y + Math.sin(orta) * (R * 0.22 + 20), 15);
  }
  if (v.cevreAci) {
    dogru(ctx, C, A);
    dogru(ctx, C, B);
    const orta = aciYayiCiz(ctx, C, A, B, 15, 1);
    const t = v.cevreAciEtiket.trim();
    if (t) fizikMetniCiz(ctx, t, C.x + Math.cos(orta) * 34, C.y + Math.sin(orta) * 34, 15);
  }
  if (v.teget) {
    // Teğet noktasında yarıçapa dik doğru + dik açı işareti
    dogru(ctx, O, T);
    const dx = T.x - O.x, dy = T.y - O.y, L = Math.hypot(dx, dy) || 1;
    const tx = -dy / L, ty = dx / L;
    const uzun = Math.min(R * 0.9, 80);
    dogru(ctx, { x: T.x - tx * uzun, y: T.y - ty * uzun }, { x: T.x + tx * uzun, y: T.y + ty * uzun });
    dikAciIsaretiCiz(ctx, T, O, { x: T.x + tx, y: T.y + ty }, 8);
    nok(T);
    koseAdi(ctx, ad(4), T, O, 15);
  }
  if (v.merkez) { nok(O, 3); fizikMetniCiz(ctx, ad(0), O.x + 12, O.y + 14, 17); }
  // Kiriş / yarıçap / merkez açı gösterildiyse A, B; çevre açıda C
  if (v.kiris || v.merkezAci || v.cevreAci || v.cap || v.yaricap) { nok(A); koseAdi(ctx, ad(1), A, O, 15); }
  if (v.kiris || v.merkezAci || v.cevreAci) { nok(B); koseAdi(ctx, ad(2), B, O, 15); }
  if (v.cevreAci) { nok(C); koseAdi(ctx, ad(3), C, O, 15); }
}

// ── Benzer üçgenler ────────────────────────────────────────────────────────

function benzerCiz(ctx: CanvasRenderingContext2D, v: BenzerVerisi, k: { x: number; y: number; w: number; h: number }) {
  const ad = (i: number) => (v.adlar[i] ?? "").trim();
  const et = (i: number) => (v.etiketler[i] ?? "").trim();
  const oran = Math.max(0.15, Math.min(0.95, v.oran));
  const yazKenar = (p: Nokta, q: Nokta, m: Nokta, t: string) => {
    if (!t) return;
    const o = { x: (p.x + q.x) / 2, y: (p.y + q.y) / 2 };
    const dx = o.x - m.x, dy = o.y - m.y, L = Math.hypot(dx, dy) || 1;
    fizikMetniCiz(ctx, t, o.x + (dx / L) * 14, o.y + (dy / L) * 13, 15);
  };
  if (v.duzen === "ic") {
    // A tepede, BC tabanda; D ∈ AB, E ∈ AC ve DE ∥ BC (A'ya olan uzaklık oranı).
    const [A, B, C] = kutuyaSigdir([{ x: 0.9, y: 2.6 }, { x: 0, y: 0 }, { x: 3, y: 0 }], k, 28);
    const D = { x: A.x + (B.x - A.x) * oran, y: A.y + (B.y - A.y) * oran };
    const E = { x: A.x + (C.x - A.x) * oran, y: A.y + (C.y - A.y) * oran };
    const m = { x: (A.x + B.x + C.x) / 3, y: (A.y + B.y + C.y) / 3 };
    ctx.beginPath(); ctx.moveTo(A.x, A.y); ctx.lineTo(B.x, B.y); ctx.lineTo(C.x, C.y); ctx.closePath(); ctx.stroke();
    dogru(ctx, D, E);
    for (const p of [D, E]) { ctx.beginPath(); ctx.arc(p.x, p.y, 2.4, 0, TAM); ctx.fill(); }
    if (v.esAci) { aciYayiCiz(ctx, B, C, A, 14, 1); aciYayiCiz(ctx, D, E, A, 12, 1); aciYayiCiz(ctx, C, A, B, 14, 2); aciYayiCiz(ctx, E, A, D, 12, 2); }
    // Etiketler sırayla: AD, DB, AE, EC, DE, BC
    yazKenar(A, D, m, et(0)); yazKenar(D, B, m, et(1)); yazKenar(A, E, m, et(2)); yazKenar(E, C, m, et(3)); yazKenar(D, E, { x: D.x, y: D.y - 40 }, et(4)); yazKenar(B, C, m, et(5));
    koseAdi(ctx, ad(0), A, m, 16); koseAdi(ctx, ad(1), B, m, 16); koseAdi(ctx, ad(2), C, m, 16);
    koseAdi(ctx, ad(3), D, m, 16); koseAdi(ctx, ad(4), E, m, 16);
    return;
  }
  // Yan yana: ABC büyük, DEF = oran × ABC (aynı biçim; D↔A, E↔B, F↔C), eş açılar yaylarla.
  const sol = { x: k.x, y: k.y, w: k.w * 0.6, h: k.h };
  const [A, B, C] = kutuyaSigdir([{ x: 0.7, y: 2.2 }, { x: 0, y: 0 }, { x: 2.6, y: 0 }], sol, 26);
  const o = Math.min(0.7, oran);
  const E = { x: k.x + k.w * 0.64, y: B.y };
  const D = { x: E.x + (A.x - B.x) * o, y: B.y + (A.y - B.y) * o };
  const F = { x: E.x + (C.x - B.x) * o, y: B.y };
  const m1 = { x: (A.x + B.x + C.x) / 3, y: (A.y + B.y + C.y) / 3 };
  const m2 = { x: (D.x + E.x + F.x) / 3, y: (D.y + E.y + F.y) / 3 };
  for (const [p, q, r] of [[A, B, C], [D, E, F]]) { ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(q.x, q.y); ctx.lineTo(r.x, r.y); ctx.closePath(); ctx.stroke(); }
  if (v.esAci) {
    aciYayiCiz(ctx, A, B, C, 14, 1); aciYayiCiz(ctx, D, E, F, 12, 1);
    aciYayiCiz(ctx, B, C, A, 14, 2); aciYayiCiz(ctx, E, F, D, 12, 2);
    aciYayiCiz(ctx, C, A, B, 14, 3); aciYayiCiz(ctx, F, D, E, 12, 3);
  }
  yazKenar(B, C, m1, et(0)); yazKenar(C, A, m1, et(1)); yazKenar(A, B, m1, et(2));
  yazKenar(E, F, m2, et(3)); yazKenar(F, D, m2, et(4)); yazKenar(D, E, m2, et(5));
  [A, B, C].forEach((p, i) => koseAdi(ctx, ad(i), p, m1, 16));
  [D, E, F].forEach((p, i) => koseAdi(ctx, ad(i + 3), p, m2, 16));
}

// ── Çokgen ─────────────────────────────────────────────────────────────────

/** Düzgün n-gen köşeleri (tuval koordinatı): ilk köşe üstte, saat yönünde. */
export function cokgenKoseleri(n: number, k: { x: number; y: number; w: number; h: number }, pay = 26): Nokta[] {
  const cx = k.x + k.w / 2, cy = k.y + k.h / 2;
  const rx = Math.max(8, k.w / 2 - pay), ry = Math.max(8, k.h / 2 - pay);
  const r = Math.min(rx, ry);
  return Array.from({ length: n }, (_, i) => {
    const t = -Math.PI / 2 + (TAM * i) / n;
    return { x: cx + r * Math.cos(t), y: cy + r * Math.sin(t) };
  });
}

function cokgenCiz(ctx: CanvasRenderingContext2D, v: CokgenVerisi, k: { x: number; y: number; w: number; h: number }) {
  const n = Math.max(3, Math.min(12, Math.round(v.n)));
  const P = cokgenKoseleri(n, k);
  const O = { x: k.x + k.w / 2, y: k.y + k.h / 2 };
  ctx.beginPath(); P.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y))); ctx.closePath(); ctx.stroke();
  if (v.kosegen) {
    ince(ctx, 0.7, () => {
      ctx.save(); ctx.setLineDash([5, 4]);
      for (let i = 0; i < n; i += 1) for (let j = i + 2; j < n; j += 1) if (!(i === 0 && j === n - 1)) dogru(ctx, P[i], P[j]);
      ctx.restore();
    });
  }
  if (v.esKenar) for (let i = 0; i < n; i += 1) tirtikCiz(ctx, P[i], P[(i + 1) % n], 1);
  if (v.merkez) { ctx.beginPath(); ctx.arc(O.x, O.y, 2.6, 0, TAM); ctx.fill(); fizikMetniCiz(ctx, "O", O.x + 10, O.y + 12, 16); }
  P.forEach((p, i) => koseAdi(ctx, v.adlar[i] ?? "", p, O, 16));
}

// ── Dışa açık çizim ────────────────────────────────────────────────────────

export function geometriCiz(ctx: CanvasRenderingContext2D, s: FizikSekli) {
  const v = s.geo && geometriVerisiGecerliMi(s.geo) ? s.geo : varsayilanGeometri(s.nesne);
  const k = { x: s.x, y: s.y, w: s.w, h: s.h };
  ctx.save();
  ctx.strokeStyle = MUREKKEP;
  ctx.fillStyle = MUREKKEP;
  ctx.lineWidth = Math.max(1.4, Math.min(2.4, s.kalinlik * 0.85));
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  if (v.tur === "ucgen") ucgenCiz(ctx, v, k);
  else if (v.tur === "cember") cemberCiz(ctx, v, k);
  else if (v.tur === "benzer") benzerCiz(ctx, v, k);
  else cokgenCiz(ctx, v, k);
  ctx.restore();
}

/** Açı yayı, dik açı işareti, eş kenar işareti (`ek` ayarlı basit işaretler). */
export function geometriIsaretiCiz(ctx: CanvasRenderingContext2D, s: FizikSekli) {
  const { x, y, w, h } = s;
  const ek: FizikEk = s.ek ?? {};
  ctx.save();
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  if (s.nesne === "esIsaret") {
    // Kısa doğru parçası + ortasında tırtıklar (sayı = ek.sayi: 1–3)
    const a = { x, y: y + h / 2 }, b = { x: x + w, y: y + h / 2 };
    dogru(ctx, a, b);
    tirtikCiz(ctx, a, b, Math.max(1, Math.min(3, Math.round(ek.sayi ?? 1))), Math.min(8, h * 0.35));
  } else if (s.nesne === "dikAci") {
    // İki kenar + dik açı karesi; sol altta köşe
    const V = { x: x + 4, y: y + h - 4 };
    const P1 = { x: x + w, y: V.y }, P2 = { x: V.x, y };
    if (ek.sayi2 !== 1) { dogru(ctx, V, P1); dogru(ctx, V, P2); }
    dikAciIsaretiCiz(ctx, V, P1, P2, Math.max(8, Math.min(w, h) * 0.22));
  } else {
    // aciYayi: V köşesi, ilk kol yatay, ikinci kol `ek.sayi` derece yukarıda. sayi2 === 1 → yalnız yay.
    const derece = Math.max(1, Math.min(359, ek.sayi ?? 60));
    const t = derece * RAD;
    const kolBoyu = Math.max(20, Math.min(w * 0.9, h * 0.95 / Math.max(0.25, Math.abs(Math.sin(t)) > 0.25 ? Math.abs(Math.sin(t)) : 0.25)));
    const kol = Math.min(kolBoyu, w * 0.9);
    // 90°'den büyük açıda ikinci kol sola uzanır: köşeyi sağa kaydır.
    const sol = Math.max(0, -Math.cos(t)) * kol;
    const V = { x: x + 6 + sol, y: y + h - 6 };
    const P1 = { x: Math.min(x + w, V.x + kol), y: V.y };
    const P2 = { x: V.x + Math.cos(t) * kol, y: V.y - Math.sin(t) * kol };
    if (derece < 180) {
      if (ek.sayi2 !== 1) { dogru(ctx, V, P1); dogru(ctx, V, P2); }
      const r = Math.max(12, Math.min(34, kol * 0.38));
      const orta = aciYayiCiz(ctx, V, P1, P2, r, 1);
      const metin = (s.etiket ?? "").trim() || `${Math.round(derece)}°`;
      fizikMetniCiz(ctx, metin, V.x + Math.cos(orta) * (r + 16), V.y + Math.sin(orta) * (r + 16), 16);
    } else {
      // Yansıma açısı (≥180): tam yay çiz
      const r = Math.max(12, Math.min(34, kol * 0.38));
      if (ek.sayi2 !== 1) dogru(ctx, V, P1);
      ctx.beginPath(); ctx.arc(V.x, V.y, r, 0, -t, true); ctx.stroke();
      fizikMetniCiz(ctx, (s.etiket ?? "").trim() || `${Math.round(derece)}°`, V.x + Math.cos(-t / 2) * (r + 16), V.y + Math.sin(-t / 2) * (r + 16), 16);
    }
  }
  ctx.restore();
}

// ── Varsayılanlar ve şablonlar ─────────────────────────────────────────────

export function varsayilanUcgen(ek: Partial<UcgenVerisi> = {}): UcgenVerisi {
  return {
    tur: "ucgen", mod: "kenar", olcu: [6, 5, 4], kose: [{ x: 0.5, y: 0.1 }, { x: 0.1, y: 0.9 }, { x: 0.9, y: 0.9 }],
    adlar: ["A", "B", "C"], kenarlar: ["a", "b", "c"], acilar: ["", "", ""], aciIsareti: ["yok", "yok", "yok"],
    esKenar: [0, 0, 0], esAci: [0, 0, 0], yukseklik: "yok", yukseklikEtiket: "h", ayakAdi: "H", ...ek,
  };
}

export type GeometriSablonu = { id: string; ad: string; ipucu: string; olustur: () => GeometriVerisi };

export const UCGEN_SABLONLARI: GeometriSablonu[] = [
  { id: "g-genel", ad: "Genel üçgen", ipucu: "a, b, c uzunluklarıyla (6, 5, 4)", olustur: () => varsayilanUcgen() },
  { id: "g-dik-yukseklik", ad: "Dik üçgen + yükseklik", ipucu: "A'da dik açı, hipotenüse AH yüksekliği",
    olustur: () => varsayilanUcgen({ mod: "aci", olcu: [4, 3, 90], aciIsareti: ["dik", "yok", "yok"], yukseklik: "A", yukseklikEtiket: "h", ayakAdi: "H" }) },
  { id: "g-ikizkenar", ad: "İkizkenar", ipucu: "b = c; eş kenar ve eş taban açıları işaretli",
    olustur: () => varsayilanUcgen({ olcu: [4, 5, 5], esKenar: [0, 1, 1], esAci: [0, 1, 1] }) },
  { id: "g-eskenar", ad: "Eşkenar", ipucu: "Üç kenar ve üç açı eş işaretli",
    olustur: () => varsayilanUcgen({ olcu: [5, 5, 5], esKenar: [1, 1, 1], esAci: [1, 1, 1], acilar: ["60°", "60°", "60°"] }) },
  { id: "g-iki-kenar-aci", ad: "İki kenar + açı", ipucu: "b, c kenarları ve aralarındaki A açısı (120°)",
    olustur: () => varsayilanUcgen({ mod: "aci", olcu: [4, 5, 120], aciIsareti: ["yay", "yok", "yok"], acilar: ["120°", "", ""] }) },
];

export function varsayilanCember(ek: Partial<CemberVerisi> = {}): CemberVerisi {
  return {
    tur: "cember", adlar: ["O", "A", "B", "C", "T", "D"], konum: [200, 340, 90, 300],
    merkez: true, yaricap: false, kiris: true, cap: false, merkezAci: false, cevreAci: false, teget: false,
    merkezAciEtiket: "2α", cevreAciEtiket: "α", ...ek,
  };
}

export const CEMBER_SABLONLARI: GeometriSablonu[] = [
  { id: "c-kiris", ad: "Çember + kiriş", ipucu: "Merkez O, kiriş AB", olustur: () => varsayilanCember() },
  { id: "c-merkez-aci", ad: "Merkez açı", ipucu: "AOB merkez açısı ve ACB çevre açısı (2α, α)", olustur: () => varsayilanCember({ kiris: true, merkezAci: true, cevreAci: true }) },
  { id: "c-teget", ad: "Teğet", ipucu: "T noktasında teğet; OT ⟂ teğet", olustur: () => varsayilanCember({ kiris: false, teget: true, konum: [200, 340, 90, 300] }) },
  { id: "c-cap", ad: "Çap + çevre açı", ipucu: "AB çap, C çember üstünde: ACB = 90°", olustur: () => varsayilanCember({ kiris: false, cap: true, cevreAci: true, cevreAciEtiket: "90°", konum: [180, 0, 70, 300], adlar: ["O", "A", "B", "C", "T", "B"] }) },
];

export function varsayilanBenzer(ek: Partial<BenzerVerisi> = {}): BenzerVerisi {
  return { tur: "benzer", duzen: "ic", oran: 0.5, adlar: ["A", "B", "C", "D", "E", "F"], etiketler: [], esAci: true, ...ek };
}

export const BENZER_SABLONLARI: GeometriSablonu[] = [
  { id: "b-ic", ad: "DE ∥ BC (Thales)", ipucu: "ABC içinde BC'ye paralel DE", olustur: () => varsayilanBenzer() },
  { id: "b-yan", ad: "Yan yana benzer üçgenler", ipucu: "ABC ~ DEF, eş açılar yaylarla", olustur: () => varsayilanBenzer({ duzen: "yan", oran: 0.6, adlar: ["A", "B", "C", "D", "E", "F"], etiketler: ["a", "b", "c", "a'", "b'", "c'"] }) },
];

export function varsayilanCokgen(ek: Partial<CokgenVerisi> = {}): CokgenVerisi {
  const n = ek.n ?? 5;
  return { tur: "cokgen", n, adlar: "ABCDEFGHIJKL".split("").slice(0, n), merkez: false, kosegen: false, esKenar: false, ...ek };
}

export const COKGEN_SABLONLARI: GeometriSablonu[] = [
  { id: "p-5", ad: "Beşgen ABCDE", ipucu: "Düzgün beşgen, köşe adlı", olustur: () => varsayilanCokgen({ n: 5 }) },
  { id: "p-6", ad: "Altıgen + köşegen", ipucu: "Düzgün altıgen, merkez O ve köşegenler", olustur: () => varsayilanCokgen({ n: 6, merkez: true, kosegen: true }) },
  { id: "p-4", ad: "Kare ABCD", ipucu: "Eş kenar işaretli kare", olustur: () => varsayilanCokgen({ n: 4, esKenar: true }) },
];

export function varsayilanGeometri(nesne: string): GeometriVerisi {
  if (nesne === "dikUcgen") return UCGEN_SABLONLARI[1].olustur();
  if (nesne === "benzerUcgen") return varsayilanBenzer();
  if (nesne === "cemberGeo") return varsayilanCember();
  if (nesne === "cokgenAd") return varsayilanCokgen();
  return varsayilanUcgen();
}

// ── Doğrulama ──────────────────────────────────────────────────────────────

const sayi = (v: unknown) => typeof v === "number" && Number.isFinite(v);
const metinDizisi = (v: unknown, en: number) => Array.isArray(v) && v.length <= en && v.every((t) => typeof t === "string" && t.length <= 24);
const sayiDizisi = (v: unknown, en: number) => Array.isArray(v) && v.length <= en && v.every((t) => sayi(t) && Math.abs(t as number) <= 1e6);

export function geometriVerisiGecerliMi(v: unknown): v is GeometriVerisi {
  if (!v || typeof v !== "object") return false;
  const g = v as Record<string, unknown>;
  if (g.tur === "ucgen") {
    return ["serbest", "kenar", "aci"].includes(String(g.mod)) && sayiDizisi(g.olcu, 3) && (g.olcu as number[]).length === 3 &&
      Array.isArray(g.kose) && g.kose.length === 3 && g.kose.every((p) => !!p && sayi((p as Nokta).x) && sayi((p as Nokta).y)) &&
      metinDizisi(g.adlar, 3) && metinDizisi(g.kenarlar, 3) && metinDizisi(g.acilar, 3) &&
      Array.isArray(g.aciIsareti) && g.aciIsareti.length === 3 && g.aciIsareti.every((t) => ["yok", "yay", "dik"].includes(String(t))) &&
      [g.esKenar, g.esAci].every((d) => Array.isArray(d) && d.length === 3 && d.every((n) => Number.isInteger(n) && n >= 0 && n <= 3)) &&
      ["yok", "A", "B", "C"].includes(String(g.yukseklik)) && typeof g.yukseklikEtiket === "string" && g.yukseklikEtiket.length <= 24 &&
      typeof g.ayakAdi === "string" && g.ayakAdi.length <= 24;
  }
  if (g.tur === "cember") {
    return metinDizisi(g.adlar, 6) && sayiDizisi(g.konum, 4) && ["merkez", "yaricap", "kiris", "cap", "merkezAci", "cevreAci", "teget"].every((a) => typeof g[a] === "boolean") &&
      typeof g.merkezAciEtiket === "string" && (g.merkezAciEtiket as string).length <= 24 && typeof g.cevreAciEtiket === "string" && (g.cevreAciEtiket as string).length <= 24;
  }
  if (g.tur === "benzer") {
    return (g.duzen === "ic" || g.duzen === "yan") && sayi(g.oran) && metinDizisi(g.adlar, 6) && metinDizisi(g.etiketler, 6) && typeof g.esAci === "boolean";
  }
  if (g.tur === "cokgen") {
    return Number.isInteger(g.n) && (g.n as number) >= 3 && (g.n as number) <= 12 && metinDizisi(g.adlar, 12) &&
      ["merkez", "kosegen", "esKenar"].every((a) => typeof g[a] === "boolean");
  }
  return false;
}

/** `ek` (açı yayı, ışın ok, halka akım…) değerleri sınırlı ve temiz mi? */
export function fizikEkGecerliMi(v: unknown): v is FizikEk {
  if (!v || typeof v !== "object") return false;
  const e = v as Record<string, unknown>;
  const kisa = (t: unknown) => t === undefined || (typeof t === "string" && t.length <= 400);
  const sayi1 = (t: unknown) => t === undefined || (sayi(t) && Math.abs(t as number) <= 1e4);
  return (e.ters === undefined || typeof e.ters === "boolean") && sayi1(e.sayi) && sayi1(e.sayi2) && kisa(e.metin) && kisa(e.metin2);
}
