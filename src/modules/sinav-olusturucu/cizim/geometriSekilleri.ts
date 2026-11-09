// Geometri şekilleri: köşe adlı üçgen, çember (kiriş/teğet/merkez açı), benzer üçgenler,
// çokgen, açı yayı, dik açı işareti, eş kenar işareti.
//
// NEDEN BÖYLE: Üçgen aracı yalnız ikizkenar çiziyordu; etiketler elle tıklanıp köşelerden
// kayık duruyordu. Burada köşe adı, kenar ölçüsü, açı yayı, dik açı karesi ve eş kenar
// tırtığı ÜÇGENİN KENDİ VERİSİNDEN hesaplanır: köşe adı köşeden dışarı doğru (merkeze göre)
// konur, bu yüzden şekil taşınınca/boyanınca/değişince adlar köşeye bağlı kalır.
//
// Her şey saf (tuval/React bilmez); çizim yalnız `ctx` yöntemlerini çağırır.

import { COGRAFYA_BOYUTLARI, varsayilanCografya } from "./cografya";
import type { FizikEk, GeoAciIsareti, GeometriVerisi, Nokta, Sekil } from "./tipler";
import { MUREKKEP } from "./sabitler";
import { icerikCizicisiKaydet } from "./fizikIcerik";
import { FIZIK_TANIMLARI, fizikMetniCiz, fizikMetniOlcu } from "./fizik";
import { aciNormu, aciYayiCiz, dikAciIsaretiCiz, dilimTara, dogru, ince, koseAdi, noktaCiz, tirtikCiz } from "./geometriYardimci";
import {
  DORTGEN_TIPLERI, KATI_TURLERI, ekGeoCiz, ekGeoGecerliMi, ekGeoMu, ekGeoYazilari,
  kagitDuzgunCokgen, kagitGenelUcgen, kagitParalelkenar, kagitSerbest, kagitYamuk,
  varsayilanDogruAci, varsayilanDortgen, varsayilanKati, varsayilanKatlama,
} from "./geometriEk";

export { aciYayiCiz, dikAciIsaretiCiz, tirtikCiz };

type FizikSekli = Extract<Sekil, { tur: "fizik" }>;
type UcgenVerisi = Extract<GeometriVerisi, { tur: "ucgen" }>;
type CemberVerisi = Extract<GeometriVerisi, { tur: "cember" }>;
type BenzerVerisi = Extract<GeometriVerisi, { tur: "benzer" }>;
type CokgenVerisi = Extract<GeometriVerisi, { tur: "cokgen" }>;
type Kutu = { x: number; y: number; w: number; h: number };

export const GEOMETRI_NESNELERI = ["ucgenABC", "dikUcgen", "benzerUcgen", "cemberGeo", "cokgenAd", "dogrudaAcilar", "dortgenGeo", "katiCisim", "kagitKatlama", "cografyaSekil", "fizikSekil"] as const;
export const geometriMi = (nesne: string) => (GEOMETRI_NESNELERI as readonly string[]).includes(nesne);
/** `ek` ayarlarıyla çizilen basit işaretler. */
export const GEOMETRI_ISARETLERI = ["aciYayi", "dikAci", "esIsaret"] as const;

const RAD = Math.PI / 180;
const TAM = Math.PI * 2;
const norm = aciNormu;

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

const d2 = (p: Nokta, q: Nokta) => Math.hypot(p.x - q.x, p.y - q.y);

/** Ağırlık merkezi G: köşelerin ortalaması (kenarortayların kesişimi). */
export function agirlikMerkezi(K: Nokta[]): Nokta {
  return { x: (K[0].x + K[1].x + K[2].x) / 3, y: (K[0].y + K[1].y + K[2].y) / 3 };
}

/** İç teğet çemberin merkezi I (açıortayların kesişimi) ve yarıçapı r = Alan / u (u: yarı çevre). */
export function icTegetCemberi(K: Nokta[]): { merkez: Nokta; r: number } {
  const [A, B, C] = K;
  const a = d2(B, C), b = d2(C, A), c = d2(A, B), t = a + b + c || 1;
  const alan = Math.abs((B.x - A.x) * (C.y - A.y) - (C.x - A.x) * (B.y - A.y)) / 2;
  return { merkez: { x: (a * A.x + b * B.x + c * C.x) / t, y: (a * A.y + b * B.y + c * C.y) / t }, r: alan / (t / 2) };
}

/** Çevrel çemberin merkezi (kenar orta dikmelerinin kesişimi) ve yarıçapı R = abc / (4·Alan). */
export function cevrelCemberi(K: Nokta[]): { merkez: Nokta; r: number } | null {
  const [A, B, C] = K;
  const D = 2 * (A.x * (B.y - C.y) + B.x * (C.y - A.y) + C.x * (A.y - B.y));
  if (Math.abs(D) < 1e-12) return null;
  const a2 = A.x * A.x + A.y * A.y, b2 = B.x * B.x + B.y * B.y, c2 = C.x * C.x + C.y * C.y;
  const merkez = { x: (a2 * (B.y - C.y) + b2 * (C.y - A.y) + c2 * (A.y - B.y)) / D, y: (a2 * (C.x - B.x) + b2 * (A.x - C.x) + c2 * (B.x - A.x)) / D };
  return { merkez, r: d2(merkez, A) };
}

/** i köşesinden çizilen açıortayın karşı kenardaki ayağı: BN / NC = c / b (iç açıortay teoremi). */
export function aciortayAyagi(K: Nokta[], i: number): Nokta {
  const V = K[i], P1 = K[(i + 1) % 3], P2 = K[(i + 2) % 3];
  const l1 = d2(V, P1), l2 = d2(V, P2), t = l1 + l2 || 1;
  return { x: (l2 * P1.x + l1 * P2.x) / t, y: (l2 * P1.y + l1 * P2.y) / t };
}

/** i köşesindeki dış açının uzantı ucu: önceki köşeden (i+2) bu köşeye doğru kenarın uzantısı. */
export function disAciUzantisi(K: Nokta[], i: number, oran = 0.45): Nokta {
  const V = K[i], O = K[(i + 2) % 3];
  return { x: V.x + (V.x - O.x) * oran, y: V.y + (V.y - O.y) * oran };
}

const KOSE_HARF = ["A", "B", "C"] as const;

/** Üçgenin TUVALDEKİ köşeleri — çizimle aynı yerleşim (sığdırma ya da `sabitKutu`). */
export function ucgenYerlesimi(v: UcgenVerisi, k: Kutu): Nokta[] {
  if (v.mod === "serbest" && v.sabitKutu && v.kose.length === 3) return v.kose.map((p) => ({ x: k.x + p.x * k.w, y: k.y + p.y * k.h }));
  const ham = ucgenKoseleri(v) ?? ucgenKoseleri(varsayilanUcgen())!;
  // Çevrel çember ve dış açı uzantıları da kutuya sığsın diye sığdırmaya katılır.
  const ek: Nokta[] = [];
  if (v.cevrelCember) {
    const c = cevrelCemberi(ham);
    if (c) ek.push({ x: c.merkez.x - c.r, y: c.merkez.y - c.r }, { x: c.merkez.x + c.r, y: c.merkez.y + c.r });
  }
  for (const h of v.disAci ?? []) { const i = KOSE_HARF.indexOf(h); if (i >= 0) ek.push(disAciUzantisi(ham, i)); }
  return kutuyaSigdir([...ham, ...ek], k, 30).slice(0, 3);
}

/** Yayın ortasına küçük dik çizgi (açıortayın eş yarılarını ayırt etmek için). */
function yayTiki(ctx: CanvasRenderingContext2D, V: Nokta, aci: number, r: number) {
  ince(ctx, 0.85, () => dogru(ctx, { x: V.x + Math.cos(aci) * (r - 4), y: V.y + Math.sin(aci) * (r - 4) }, { x: V.x + Math.cos(aci) * (r + 4), y: V.y + Math.sin(aci) * (r + 4) }));
}

function ucgenCiz(ctx: CanvasRenderingContext2D, v: UcgenVerisi, k: Kutu) {
  const P = ucgenYerlesimi(v, k);
  const [A, B, C] = P;
  const merkez = { x: (A.x + B.x + C.x) / 3, y: (A.y + B.y + C.y) / 3 };

  if (v.cevrelCember) {
    const c = cevrelCemberi(P);
    if (c) {
      ince(ctx, 0.85, () => { ctx.beginPath(); ctx.arc(c.merkez.x, c.merkez.y, c.r, 0, TAM); ctx.stroke(); });
      noktaCiz(ctx, c.merkez, 2.4);
      const ad = (v.cevrelMerkezAdi ?? "O").trim();
      if (ad) fizikMetniCiz(ctx, ad, c.merkez.x + 11, c.merkez.y + 12, 16);
    }
  }
  if (v.icTegetCember) {
    const c = icTegetCemberi(P);
    ince(ctx, 0.85, () => { ctx.beginPath(); ctx.arc(c.merkez.x, c.merkez.y, c.r, 0, TAM); ctx.stroke(); });
    noktaCiz(ctx, c.merkez, 2.4);
    const ad = (v.icMerkezAdi ?? "I").trim();
    if (ad) fizikMetniCiz(ctx, ad, c.merkez.x + 9, c.merkez.y - 9, 15);
  }

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

  // Açıortay: köşeden karşı kenara; açının iki eş yarısı tikli yaylarla.
  const ai = KOSE_HARF.indexOf((v.aciortay ?? "yok") as "A");
  if (ai >= 0) {
    const V = P[ai], P1 = P[(ai + 1) % 3], P2 = P[(ai + 2) % 3];
    const N = aciortayAyagi(P, ai);
    ince(ctx, 0.85, () => dogru(ctx, V, N));
    noktaCiz(ctx, N, 2.2);
    const r = Math.max(14, Math.min(26, d2(V, P1) * 0.28, d2(V, P2) * 0.28));
    yayTiki(ctx, V, aciYayiCiz(ctx, V, P1, N, r, 1), r);
    yayTiki(ctx, V, aciYayiCiz(ctx, V, N, P2, r, 1), r);
    const ad = (v.aciortayAdi ?? "N").trim();
    if (ad) { const L = d2(N, V) || 1; fizikMetniCiz(ctx, ad, N.x + ((N.x - V.x) / L) * 14, N.y + ((N.y - V.y) / L) * 14, 16); }
  }

  // Kenarortay(lar): karşı kenarın orta noktasına; yarılar eş tırtıklı. Üçü birden: ağırlık merkezi G.
  const ko = v.kenarortay ?? "yok";
  const koListe = ko === "hepsi" ? [0, 1, 2] : ko === "yok" ? [] : [KOSE_HARF.indexOf(ko)];
  for (const i of koListe) {
    const V = P[i], P1 = P[(i + 1) % 3], P2 = P[(i + 2) % 3];
    const M = { x: (P1.x + P2.x) / 2, y: (P1.y + P2.y) / 2 };
    ince(ctx, 0.85, () => dogru(ctx, V, M));
    noktaCiz(ctx, M, 2.2);
    const adet = ko === "hepsi" ? i + 1 : 1;
    tirtikCiz(ctx, P1, M, adet, 5);
    tirtikCiz(ctx, M, P2, adet, 5);
    if (ko !== "hepsi") {
      const ad = (v.kenarortayAdi ?? "V").trim();
      if (ad) { const L = d2(M, V) || 1; fizikMetniCiz(ctx, ad, M.x + ((M.x - V.x) / L) * 14, M.y + ((M.y - V.y) / L) * 14, 16); }
    }
  }
  if (ko === "hepsi") {
    const G = agirlikMerkezi(P);
    noktaCiz(ctx, G, 2.8);
    const ad = (v.agirlikAdi ?? "G").trim();
    if (ad) fizikMetniCiz(ctx, ad, G.x + 11, G.y - 10, 16);
  }

  // Dış açılar: kenar uzantısı + yay + etiket.
  for (const h of v.disAci ?? []) {
    const i = KOSE_HARF.indexOf(h);
    if (i < 0) continue;
    const V = P[i], U = disAciUzantisi(P, i), Q = P[(i + 1) % 3];
    ince(ctx, 0.85, () => dogru(ctx, V, U));
    const r = Math.max(12, Math.min(20, d2(V, U) * 0.4));
    const orta = aciYayiCiz(ctx, V, U, Q, r, 1);
    const t = (v.disAciEtiket?.[i] ?? "").trim();
    if (t) fizikMetniCiz(ctx, t, V.x + Math.cos(orta) * (r + 15), V.y + Math.sin(orta) * (r + 15), 15);
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

/** Çemberin tuvaldeki yerleşimi: merkez O, yarıçap R, dış nokta P (varsa). Dış açı yoksa eski yerleşimin AYNISI. */
export function cemberYerlesimi(v: CemberVerisi, k: Kutu): { O: Nokta; R: number; P: Nokta | null; nokta: (aci: number) => Nokta } {
  const disVar = (v.disAci ?? "yok") !== "yok";
  const pAci = (v.disNokta?.aci ?? 0) * RAD;
  const pUz = Math.max(1.25, Math.min(3, v.disNokta?.uzaklik ?? 1.9));
  const bx0 = Math.min(-1, disVar ? pUz * Math.cos(pAci) : -1), bx1 = Math.max(1, disVar ? pUz * Math.cos(pAci) : 1);
  const by0 = Math.min(-1, disVar ? -pUz * Math.sin(pAci) : -1), by1 = Math.max(1, disVar ? -pUz * Math.sin(pAci) : 1);
  const R = disVar
    ? Math.max(10, Math.min((k.w - 52) / (bx1 - bx0), (k.h - 52) / (by1 - by0)))
    : Math.max(10, Math.min(k.w, k.h) / 2 - 26);
  const O = disVar
    ? { x: k.x + k.w / 2 - ((bx0 + bx1) / 2) * R, y: k.y + k.h / 2 - ((by0 + by1) / 2) * R }
    : { x: k.x + k.w / 2, y: k.y + k.h / 2 };
  const nokta = (aci: number): Nokta => ({ x: O.x + R * Math.cos(aci * RAD), y: O.y - R * Math.sin(aci * RAD) });
  const P = disVar ? { x: O.x + R * pUz * Math.cos(pAci), y: O.y - R * pUz * Math.sin(pAci) } : null;
  return { O, R, P, nokta };
}

/** P'den geçen doğrunun çemberle İKİNCİ kesişimi (X çember üstünde). Teğetse X'in kendisi. */
export function ikinciKesisim(O: Nokta, P: Nokta, X: Nokta): Nokta {
  const dx = X.x - P.x, dy = X.y - P.y;
  const a = dx * dx + dy * dy || 1;
  // t = 1 bir kök (X); kökler çarpımı c/a → diğer kök.
  const c = (P.x - O.x) ** 2 + (P.y - O.y) ** 2 - ((X.x - O.x) ** 2 + (X.y - O.y) ** 2);
  const t2 = c / a;
  return { x: P.x + dx * t2, y: P.y + dy * t2 };
}

/** P dış noktasından çembere çizilen iki teğetin değme noktaları. */
export function tegetNoktalari(O: Nokta, R: number, P: Nokta): [Nokta, Nokta] | null {
  const d = Math.hypot(P.x - O.x, P.y - O.y);
  if (d <= R + 1e-9) return null;
  const t = Math.atan2(P.y - O.y, P.x - O.x), f = Math.acos(R / d);
  return [{ x: O.x + R * Math.cos(t + f), y: O.y + R * Math.sin(t + f) }, { x: O.x + R * Math.cos(t - f), y: O.y + R * Math.sin(t - f) }];
}

/** İki doğru parçasının (AB, CD) iç kesişimi; yoksa null. */
function parcaKesisimi(A: Nokta, B: Nokta, C: Nokta, D: Nokta): Nokta | null {
  const r = { x: B.x - A.x, y: B.y - A.y }, q = { x: D.x - C.x, y: D.y - C.y };
  const den = r.x * q.y - r.y * q.x;
  if (Math.abs(den) < 1e-12) return null;
  const t = ((C.x - A.x) * q.y - (C.y - A.y) * q.x) / den, u = ((C.x - A.x) * r.y - (C.y - A.y) * r.x) / den;
  if (t <= 1e-6 || t >= 1 - 1e-6 || u <= 1e-6 || u >= 1 - 1e-6) return null;
  return { x: A.x + t * r.x, y: A.y + t * r.y };
}

function cemberCiz(ctx: CanvasRenderingContext2D, v: CemberVerisi, k: Kutu) {
  const { O, R, P, nokta } = cemberYerlesimi(v, k);
  if (v.dilimTarama) {
    const [A0, B0] = (v.konum.length >= 2 ? v.konum : [200, 340]).map(nokta);
    const t1 = Math.atan2(A0.y - O.y, A0.x - O.x), fark = norm(Math.atan2(B0.y - O.y, B0.x - O.x) - t1);
    dilimTara(ctx, O, R, t1, fark);
  }
  ctx.beginPath(); ctx.arc(O.x, O.y, R, 0, TAM); ctx.stroke();
  const [A, B, C, T] = (v.konum.length >= 4 ? v.konum : [200, 340, 90, 300]).map(nokta);
  const D = nokta(v.konum[4] ?? 290);
  const nok = (p: Nokta, r = 2.6) => noktaCiz(ctx, p, r);
  const ad = (i: number) => (v.adlar[i] ?? "").trim();

  if (v.cap) {
    const A2 = { x: 2 * O.x - A.x, y: 2 * O.y - A.y };
    dogru(ctx, A, A2);
    nok(A2);
    koseAdi(ctx, ad(5), A2, O, 15);
  }
  if (v.kiris) dogru(ctx, A, B);
  if (v.yaricap) dogru(ctx, O, A);
  if (v.merkezAci || v.dilimTarama) {
    dogru(ctx, O, A);
    dogru(ctx, O, B);
  }
  if (v.merkezAci) {
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
  if (v.icAci) {
    // İki kiriş AB ve CD; E kesişimi. AEC açısı = (AC yayı + BD yayı) / 2.
    dogru(ctx, A, B); dogru(ctx, C, D);
    const E = parcaKesisimi(A, B, C, D);
    if (E) {
      const orta = aciYayiCiz(ctx, E, A, C, 14, 1);
      const t = (v.icAciEtiket ?? "").trim();
      if (t) fizikMetniCiz(ctx, t, E.x + Math.cos(orta) * 30, E.y + Math.sin(orta) * 30, 15);
      nok(E, 2.4);
      const t2 = orta + Math.PI;
      if (ad(6)) fizikMetniCiz(ctx, ad(6), E.x + Math.cos(t2) * 15, E.y + Math.sin(t2) * 15, 16);
    }
    nok(D); koseAdi(ctx, ad(5), D, O, 15);
  }
  const disAdi = (i: number) => (v.disAdlar?.[i] ?? ["P", "C", "D"][i]).trim();
  if (P && v.disAci === "kesen") {
    // P'den A ve B üzerinden iki kesen; ikinci kesişimler yakın/uzak noktalar.
    const ikinci = [A, B].map((X) => ikinciKesisim(O, P, X));
    [A, B].forEach((X, i) => {
      const Y = ikinci[i];
      const uzak = Math.hypot(X.x - P.x, X.y - P.y) >= Math.hypot(Y.x - P.x, Y.y - P.y) ? X : Y;
      dogru(ctx, P, uzak);
      nok(Y); koseAdi(ctx, disAdi(i + 1), Y, O, 15);
    });
    const orta = aciYayiCiz(ctx, P, A, B, 20, 1);
    const t = (v.disAciEtiket ?? "").trim();
    if (t) fizikMetniCiz(ctx, t, P.x + Math.cos(orta) * 36, P.y + Math.sin(orta) * 36, 15);
  }
  if (P && v.disAci === "teget") {
    const tn = tegetNoktalari(O, R, P);
    if (tn) {
      tn.forEach((Tn, i) => {
        dogru(ctx, P, Tn);
        ince(ctx, 0.8, () => dogru(ctx, O, Tn));
        dikAciIsaretiCiz(ctx, Tn, O, P, 7);
        tirtikCiz(ctx, P, Tn, 1);
        nok(Tn); koseAdi(ctx, disAdi(i + 1), Tn, O, 15);
      });
      const orta = aciYayiCiz(ctx, P, tn[0], tn[1], 20, 1);
      const t = (v.disAciEtiket ?? "").trim();
      if (t) fizikMetniCiz(ctx, t, P.x + Math.cos(orta) * 36, P.y + Math.sin(orta) * 36, 15);
    }
  }
  if (P && (v.disAci === "kesen" || v.disAci === "teget")) {
    nok(P);
    const L = Math.hypot(P.x - O.x, P.y - O.y) || 1;
    if (disAdi(0)) fizikMetniCiz(ctx, disAdi(0), P.x + ((P.x - O.x) / L) * 14, P.y + ((P.y - O.y) / L) * 14, 17);
  }
  if (v.tegetKiris) {
    // T'deki teğet + TA kirişi; açı, kirişle AYNI yana bakan teğet ışınıyla (yarısı TA yayı).
    const dx = T.x - O.x, dy = T.y - O.y, L = Math.hypot(dx, dy) || 1;
    let tx = -dy / L, ty = dx / L;
    if (tx * (A.x - T.x) + ty * (A.y - T.y) < 0) { tx = -tx; ty = -ty; }
    const uzun = Math.min(R * 0.9, 80);
    dogru(ctx, { x: T.x - tx * uzun, y: T.y - ty * uzun }, { x: T.x + tx * uzun, y: T.y + ty * uzun });
    dogru(ctx, T, A);
    const orta = aciYayiCiz(ctx, T, { x: T.x + tx, y: T.y + ty }, A, 18, 1);
    const t = (v.tegetKirisEtiket ?? "").trim();
    if (t) fizikMetniCiz(ctx, t, T.x + Math.cos(orta) * 34, T.y + Math.sin(orta) * 34, 15);
    nok(T); koseAdi(ctx, ad(4), T, O, 15);
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
  const aGor = v.kiris || v.merkezAci || v.cevreAci || v.cap || v.yaricap || v.icAci || v.disAci === "kesen" || v.tegetKiris || v.dilimTarama;
  const bGor = v.kiris || v.merkezAci || v.cevreAci || v.icAci || v.disAci === "kesen" || v.dilimTarama;
  if (aGor) { nok(A); koseAdi(ctx, ad(1), A, O, 15); }
  if (bGor) { nok(B); koseAdi(ctx, ad(2), B, O, 15); }
  if (v.cevreAci || v.icAci) { nok(C); koseAdi(ctx, ad(3), C, O, 15); }
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
  const v = s.geo && geometriVerisiGecerliMi(s.geo) && geometriNesneyeUygun(s.nesne, s.geo) ? s.geo : varsayilanGeometri(s.nesne);
  const k = { x: s.x, y: s.y, w: s.w, h: s.h };
  ctx.save();
  ctx.strokeStyle = MUREKKEP;
  ctx.fillStyle = MUREKKEP;
  ctx.lineWidth = Math.max(1.4, Math.min(2.4, s.kalinlik * 0.85));
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  if (ekGeoMu(v)) ekGeoCiz(ctx, v, k);
  else if (v.tur === "ucgen") ucgenCiz(ctx, v, k);
  else if (v.tur === "cember") cemberCiz(ctx, v, k);
  else if (v.tur === "benzer") benzerCiz(ctx, v, k);
  else cokgenCiz(ctx, v, k);
  ctx.restore();
}

/**
 * Kütüphane kartı / panel için küçük önizleme: verilen geometri verisini nesnenin varsayılan
 * kutusunda çizip (w×h) alana sığdırır. Gerçek çizim rutini kullanılır.
 */
export function geometriOnizlemeCiz(ctx: CanvasRenderingContext2D, nesne: string, geo: GeometriVerisi, w: number, h: number) {
  const t = geo.tur === "cografya" ? COGRAFYA_BOYUTLARI[geo.yapi] : (FIZIK_TANIMLARI as Record<string, { w: number; h: number } | undefined>)[nesne] ?? { w: 220, h: 170 };
  // Yazılar kutu dışına taşabildiği için çevresine pay bırakılır.
  const payX = 30, payY = 26;
  const olcek = Math.min(w / (t.w + 2 * payX), h / (t.h + 2 * payY));
  ctx.save();
  ctx.clearRect(0, 0, w, h);
  ctx.translate((w - (t.w + 2 * payX) * olcek) / 2, (h - (t.h + 2 * payY) * olcek) / 2);
  ctx.scale(olcek, olcek);
  geometriCiz(ctx, { id: "onizleme", tur: "fizik", nesne: nesne as FizikSekli["nesne"], kalinlik: Math.max(1.6, 1.4 / olcek), x: payX, y: payY, w: t.w, h: t.h, geo });
  ctx.restore();
}

/** Şablon önizlemesi (sol kütüphane): `sb.nesne` yoksa veri türünden tahmin edilir. */
export function geometriSablonOnizlemeCiz(ctx: CanvasRenderingContext2D, sb: GeometriSablonu, w: number, h: number) {
  const geo = sb.olustur();
  const nesne = sb.nesne ?? ({ ucgen: "ucgenABC", cember: "cemberGeo", benzer: "benzerUcgen", cokgen: "cokgenAd", dogruAci: "dogrudaAcilar", dortgen: "dortgenGeo", kati: "katiCisim", katlama: "kagitKatlama", cografya: "cografyaSekil" } as const)[geo.tur];
  geometriOnizlemeCiz(ctx, nesne, geo, w, h);
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

/**
 * Hazır geometri şablonu. `aramaKelimeleri`: sol kütüphane aramasında (Türkçe karakter duyarsız)
 * kullanılan anahtar sözcükler. `nesne`: şablonun eklendiği fizik nesnesi (kütüphane için).
 */
export type GeometriSablonu = { id: string; ad: string; ipucu: string; olustur: () => GeometriVerisi; aramaKelimeleri?: string[]; nesne?: string; altBaslik?: string };

export const UCGEN_SABLONLARI: GeometriSablonu[] = [
  { id: "g-genel", ad: "Genel üçgen", ipucu: "a, b, c uzunluklarıyla (6, 5, 4)", olustur: () => varsayilanUcgen(), nesne: "ucgenABC", aramaKelimeleri: ["üçgen", "abc", "kenar", "çeşitkenar"] },
  { id: "g-dik-yukseklik", ad: "Dik üçgen + yükseklik", ipucu: "A'da dik açı, hipotenüse AH yüksekliği", nesne: "dikUcgen", aramaKelimeleri: ["dik üçgen", "yükseklik", "öklid", "hipotenüs", "pisagor"],
    olustur: () => varsayilanUcgen({ mod: "aci", olcu: [4, 3, 90], aciIsareti: ["dik", "yok", "yok"], yukseklik: "A", yukseklikEtiket: "h", ayakAdi: "H" }) },
  { id: "g-dik-30-60-90", ad: "30°-60°-90° dik üçgen (köklü)", ipucu: "Kenarlar 4, 4√3, 8: köklü uzunluk panelden yazılır", nesne: "dikUcgen", aramaKelimeleri: ["30 60 90", "köklü", "√3", "özel üçgen", "dik üçgen", "kök"],
    olustur: () => varsayilanUcgen({ mod: "aci", olcu: [4, 4 * Math.sqrt(3), 90], aciIsareti: ["dik", "yok", "yok"], kenarlar: ["8", "4", "4√3"], acilar: ["", "30°", "60°"] }) },
  { id: "g-dik-45-45-90", ad: "İkizkenar dik üçgen (a√2)", ipucu: "Dik kenarlar 5, hipotenüs 5√2", nesne: "dikUcgen", aramaKelimeleri: ["45 45 90", "köklü", "√2", "özel üçgen", "ikizkenar dik üçgen", "kök"],
    olustur: () => varsayilanUcgen({ mod: "aci", olcu: [5, 5, 90], aciIsareti: ["dik", "yok", "yok"], kenarlar: ["5√2", "5", "5"], acilar: ["", "45°", "45°"], esKenar: [0, 1, 1] }) },
  { id: "g-eskenar-yukseklik-kok", ad: "Eşkenar üçgen + yükseklik (3√3)", ipucu: "Kenar 6, yükseklik 3√3", nesne: "ucgenABC", aramaKelimeleri: ["eşkenar üçgen", "yükseklik", "köklü", "√3", "kök"],
    olustur: () => varsayilanUcgen({ olcu: [6, 6, 6], kenarlar: ["", "6", "6"], esKenar: [0, 1, 1], esAci: [1, 1, 1], yukseklik: "A", yukseklikEtiket: "3√3", ayakAdi: "H" }) },
  { id: "g-ikizkenar", ad: "İkizkenar", ipucu: "b = c; eş kenar ve eş taban açıları işaretli", nesne: "ucgenABC", aramaKelimeleri: ["ikizkenar üçgen", "eş kenar", "taban açısı"],
    olustur: () => varsayilanUcgen({ olcu: [4, 5, 5], esKenar: [0, 1, 1], esAci: [0, 1, 1] }) },
  { id: "g-eskenar", ad: "Eşkenar", ipucu: "Üç kenar ve üç açı eş işaretli", nesne: "ucgenABC", aramaKelimeleri: ["eşkenar üçgen", "60 derece"],
    olustur: () => varsayilanUcgen({ olcu: [5, 5, 5], esKenar: [1, 1, 1], esAci: [1, 1, 1], acilar: ["60°", "60°", "60°"] }) },
  { id: "g-iki-kenar-aci", ad: "İki kenar + açı", ipucu: "b, c kenarları ve aralarındaki A açısı (120°)", nesne: "ucgenABC", aramaKelimeleri: ["kosinüs teoremi", "geniş açılı üçgen"],
    olustur: () => varsayilanUcgen({ mod: "aci", olcu: [4, 5, 120], aciIsareti: ["yay", "yok", "yok"], acilar: ["120°", "", ""] }) },
  // v1.2 yardımcı elemanlar
  { id: "g-aciortay", ad: "Açıortay", ipucu: "A açısının açıortayı AN; iki eş açı", nesne: "ucgenABC", aramaKelimeleri: ["açıortay", "iç açıortay teoremi", "an"],
    olustur: () => varsayilanUcgen({ olcu: [6, 4, 5], kenarlar: ["", "b", "c"], aciortay: "A", aciortayAdi: "N" }) },
  { id: "g-kenarortay", ad: "Kenarortay", ipucu: "A'dan BC'nin orta noktası V'ye kenarortay", nesne: "ucgenABC", aramaKelimeleri: ["kenarortay", "orta nokta", "av"],
    olustur: () => varsayilanUcgen({ kenarlar: ["", "", ""], kenarortay: "A", kenarortayAdi: "V" }) },
  { id: "g-agirlik", ad: "Ağırlık merkezi", ipucu: "Üç kenarortay ve ağırlık merkezi G", nesne: "ucgenABC", aramaKelimeleri: ["ağırlık merkezi", "kenarortay", "g noktası", "2:1"],
    olustur: () => varsayilanUcgen({ kenarlar: ["", "", ""], kenarortay: "hepsi", agirlikAdi: "G" }) },
  { id: "g-dis-aci", ad: "Dış açı", ipucu: "C köşesinde BC uzantısı ve dış açı (A + B)", nesne: "ucgenABC", aramaKelimeleri: ["dış açı", "uzantı", "iç açılar toplamı"],
    olustur: () => varsayilanUcgen({ kenarlar: ["", "", ""], aciIsareti: ["yay", "yay", "yok"], acilar: ["α", "β", ""], disAci: ["C"], disAciEtiket: ["", "", "α+β"] }) },
  { id: "g-ic-teget", ad: "İç teğet çember", ipucu: "İç teğet çember ve merkezi I (açıortayların kesişimi)", nesne: "ucgenABC", aramaKelimeleri: ["iç teğet çember", "iç merkez", "açıortay kesişimi", "r = A/u"],
    olustur: () => varsayilanUcgen({ kenarlar: ["", "", ""], icTegetCember: true, icMerkezAdi: "I" }) },
  { id: "g-cevrel", ad: "Çevrel çember", ipucu: "Çevrel çember ve merkezi O (orta dikmelerin kesişimi)", nesne: "ucgenABC", aramaKelimeleri: ["çevrel çember", "dış merkez", "orta dikme", "sinüs teoremi"],
    olustur: () => varsayilanUcgen({ kenarlar: ["", "", ""], cevrelCember: true, cevrelMerkezAdi: "O" }) },
];

export function varsayilanCember(ek: Partial<CemberVerisi> = {}): CemberVerisi {
  return {
    tur: "cember", adlar: ["O", "A", "B", "C", "T", "D"], konum: [200, 340, 90, 300],
    merkez: true, yaricap: false, kiris: true, cap: false, merkezAci: false, cevreAci: false, teget: false,
    merkezAciEtiket: "2α", cevreAciEtiket: "α", ...ek,
  };
}

export const CEMBER_SABLONLARI: GeometriSablonu[] = [
  { id: "c-kiris", ad: "Çember + kiriş", ipucu: "Merkez O, kiriş AB", olustur: () => varsayilanCember(), nesne: "cemberGeo", aramaKelimeleri: ["çember", "kiriş", "daire"] },
  { id: "c-merkez-aci", ad: "Merkez açı", ipucu: "AOB merkez açısı ve ACB çevre açısı (2α, α)", olustur: () => varsayilanCember({ kiris: true, merkezAci: true, cevreAci: true }), nesne: "cemberGeo", aramaKelimeleri: ["merkez açı", "çevre açı", "yay"] },
  { id: "c-teget", ad: "Teğet", ipucu: "T noktasında teğet; OT ⟂ teğet", olustur: () => varsayilanCember({ kiris: false, teget: true, konum: [200, 340, 90, 300] }), nesne: "cemberGeo", aramaKelimeleri: ["teğet", "yarıçap dik"] },
  { id: "c-cap", ad: "Çap + çevre açı", ipucu: "AB çap, C çember üstünde: ACB = 90°", olustur: () => varsayilanCember({ kiris: false, cap: true, cevreAci: true, cevreAciEtiket: "90°", konum: [180, 0, 70, 300], adlar: ["O", "A", "B", "C", "T", "B"] }), nesne: "cemberGeo", aramaKelimeleri: ["çap", "thales", "90 derece"] },
  // v1.2
  { id: "c-ic-aci", ad: "İç açı (kesişen kirişler)", ipucu: "AB ve CD kirişleri E'de kesişir: AEC = (AC + BD) / 2", nesne: "cemberGeo", aramaKelimeleri: ["iç açı", "kesişen kiriş", "kiriş kesişimi"],
    olustur: () => varsayilanCember({ kiris: false, icAci: true, icAciEtiket: "x", konum: [160, 10, 80, 300, 230], adlar: ["O", "A", "B", "C", "T", "D", "E"] }) },
  { id: "c-dis-kesen", ad: "Dış açı (iki kesen)", ipucu: "P'den iki kesen: APB = (AB − CD) / 2", nesne: "cemberGeo", aramaKelimeleri: ["dış açı", "kesen", "dış nokta"],
    olustur: () => varsayilanCember({ kiris: false, disAci: "kesen", disAciEtiket: "x", disNokta: { aci: 0, uzaklik: 2.1 }, disAdlar: ["P", "C", "D"], konum: [130, 230, 90, 300] }) },
  { id: "c-iki-teget", ad: "İki teğet", ipucu: "P'den iki teğet: |PA| = |PB|, OA ⟂ PA", nesne: "cemberGeo", aramaKelimeleri: ["iki teğet", "teğet uzunlukları eşit", "dış açı"],
    olustur: () => varsayilanCember({ kiris: false, disAci: "teget", disAciEtiket: "x", disNokta: { aci: 0, uzaklik: 2.1 }, disAdlar: ["P", "A", "B"] }) },
  { id: "c-teget-kiris", ad: "Teğet-kiriş açısı", ipucu: "T'de teğet ve TA kirişi: açı = TA yayının yarısı", nesne: "cemberGeo", aramaKelimeleri: ["teğet kiriş açısı", "teğet", "kiriş"],
    olustur: () => varsayilanCember({ kiris: false, tegetKiris: true, tegetKirisEtiket: "α", konum: [150, 340, 90, 270] }) },
  { id: "c-dilim", ad: "Daire dilimi", ipucu: "AOB merkez açısının dilimi taralı", nesne: "cemberGeo", aramaKelimeleri: ["daire dilimi", "dilim alanı", "taralı", "sektör"],
    olustur: () => varsayilanCember({ kiris: false, merkezAci: true, dilimTarama: true, merkezAciEtiket: "60°", konum: [20, 80, 90, 300] }) },
];

export function varsayilanBenzer(ek: Partial<BenzerVerisi> = {}): BenzerVerisi {
  return { tur: "benzer", duzen: "ic", oran: 0.5, adlar: ["A", "B", "C", "D", "E", "F"], etiketler: [], esAci: true, ...ek };
}

export const BENZER_SABLONLARI: GeometriSablonu[] = [
  { id: "b-ic", ad: "DE ∥ BC (Thales)", ipucu: "ABC içinde BC'ye paralel DE", olustur: () => varsayilanBenzer(), nesne: "benzerUcgen", aramaKelimeleri: ["benzerlik", "thales", "temel orantı"] },
  { id: "b-yan", ad: "Yan yana benzer üçgenler", ipucu: "ABC ~ DEF, eş açılar yaylarla", olustur: () => varsayilanBenzer({ duzen: "yan", oran: 0.6, adlar: ["A", "B", "C", "D", "E", "F"], etiketler: ["a", "b", "c", "a'", "b'", "c'"] }), nesne: "benzerUcgen", aramaKelimeleri: ["benzer üçgen", "benzerlik oranı"] },
];

export function varsayilanCokgen(ek: Partial<CokgenVerisi> = {}): CokgenVerisi {
  const n = ek.n ?? 5;
  return { tur: "cokgen", n, adlar: "ABCDEFGHIJKL".split("").slice(0, n), merkez: false, kosegen: false, esKenar: false, ...ek };
}

export const COKGEN_SABLONLARI: GeometriSablonu[] = [
  { id: "p-5", ad: "Beşgen ABCDE", ipucu: "Düzgün beşgen, köşe adlı", olustur: () => varsayilanCokgen({ n: 5 }), nesne: "cokgenAd", aramaKelimeleri: ["beşgen", "düzgün çokgen"] },
  { id: "p-6", ad: "Altıgen + köşegen", ipucu: "Düzgün altıgen, merkez O ve köşegenler", olustur: () => varsayilanCokgen({ n: 6, merkez: true, kosegen: true }), nesne: "cokgenAd", aramaKelimeleri: ["altıgen", "köşegen"] },
  { id: "p-4", ad: "Kare ABCD", ipucu: "Eş kenar işaretli kare", olustur: () => varsayilanCokgen({ n: 4, esKenar: true }), nesne: "cokgenAd", aramaKelimeleri: ["kare", "dörtgen"] },
];

// ── v1.2 şablon listeleri ──────────────────────────────────────────────────

export const DOGRU_ACI_SABLONLARI: GeometriSablonu[] = [
  { id: "d-kesen", ad: "Paralel iki doğru ve kesen", ipucu: "d₁ ∥ d₂, kesen 8 açı oluşturur (1–8 numaralı)", nesne: "dogrudaAcilar", aramaKelimeleri: ["paralel", "kesen", "yöndeş", "ters açı", "d1 d2"],
    olustur: () => varsayilanDogruAci() },
  { id: "d-yondes", ad: "Yöndeş açılar", ipucu: "Kesenin aynı yanında, eş açılar", nesne: "dogrudaAcilar", aramaKelimeleri: ["yöndeş açılar", "paralel"],
    olustur: () => varsayilanDogruAci({ etiketler: ["α", "", "", "", "α", "", "", ""] }) },
  { id: "d-z", ad: "Z kuralı (iç ters)", ipucu: "İç ters açılar eşittir", nesne: "dogrudaAcilar", aramaKelimeleri: ["z kuralı", "iç ters açılar", "paralel"],
    olustur: () => varsayilanDogruAci({ duzen: "z", aci: 55, etiketler: ["α", "α"] }) },
  { id: "d-u", ad: "U kuralı (karşı durumlu)", ipucu: "Karşı durumlu açıların toplamı 180°", nesne: "dogrudaAcilar", aramaKelimeleri: ["u kuralı", "karşı durumlu", "180 derece"],
    olustur: () => varsayilanDogruAci({ duzen: "u", aci: 60, etiketler: ["α", "180° − α"] }) },
  { id: "d-m", ad: "M kuralı", ipucu: "Kırık doğru: ortadaki açı = uç açıların toplamı (x + y)", nesne: "dogrudaAcilar", aramaKelimeleri: ["m kuralı", "kırık doğru", "zikzak"],
    olustur: () => varsayilanDogruAci({ duzen: "m", aci: 40, aci2: 30, etiketler: ["x", "y", "x + y"] }) },
  { id: "d-kalem", ad: "Kalem ucu", ipucu: "Üç açının toplamı 360°", nesne: "dogrudaAcilar", aramaKelimeleri: ["kalem ucu", "360 derece", "paralel"],
    olustur: () => varsayilanDogruAci({ duzen: "kalemUcu", aci: 40, aci2: 35, etiketler: ["a", "b", "c"] }) },
  { id: "d-zikzak", ad: "Zikzak kuralı", ipucu: "Sağa bakan açılar toplamı = sola bakanlar toplamı", nesne: "dogrudaAcilar", aramaKelimeleri: ["zikzak", "kırık doğru", "testere"],
    olustur: () => varsayilanDogruAci({ duzen: "zikzak", aci: 45, aci2: 40, etiketler: ["a", "b", "c", "d"] }) },
];

export const DORTGEN_SABLONLARI: GeometriSablonu[] = [
  { id: "q-paralelkenar", ad: "Paralelkenar", ipucu: "Karşılıklı kenarlar paralel ve eş", nesne: "dortgenGeo", aramaKelimeleri: ["paralelkenar", "dörtgen"],
    olustur: () => varsayilanDortgen({ tip: "paralelkenar", esKenar: [1, 2, 1, 2] }) },
  { id: "q-paralelkenar-yukseklik", ad: "Paralelkenar + yükseklik", ipucu: "D'den AB'ye DH yüksekliği", nesne: "dortgenGeo", aramaKelimeleri: ["paralelkenar alanı", "yükseklik", "dh"],
    olustur: () => varsayilanDortgen({ tip: "paralelkenar", yukseklik: true, kenarlar: ["a", "", "", "b"] }) },
  { id: "q-eskenar", ad: "Eşkenar dörtgen", ipucu: "Köşegenler dik kesişir (E)", nesne: "dortgenGeo", aramaKelimeleri: ["eşkenar dörtgen", "baklava", "köşegen dik"],
    olustur: () => varsayilanDortgen({ tip: "eskenar", kosegen: true, esKenar: [1, 1, 1, 1] }) },
  { id: "q-yamuk", ad: "Yamuk", ipucu: "AB ∥ DC; D'den yükseklik", nesne: "dortgenGeo", aramaKelimeleri: ["yamuk", "taban", "orta taban"],
    olustur: () => varsayilanDortgen({ tip: "yamuk", yukseklik: true }) },
  { id: "q-ikizkenar-yamuk", ad: "İkizkenar yamuk", ipucu: "|AD| = |BC|, taban açıları eş", nesne: "dortgenGeo", aramaKelimeleri: ["ikizkenar yamuk", "yamuk"],
    olustur: () => varsayilanDortgen({ tip: "ikizkenarYamuk", esKenar: [0, 1, 0, 1], esAci: [1, 1, 0, 0] }) },
  { id: "q-dik-yamuk", ad: "Dik yamuk", ipucu: "A ve D köşeleri dik", nesne: "dortgenGeo", aramaKelimeleri: ["dik yamuk", "yamuk"],
    olustur: () => varsayilanDortgen({ tip: "dikYamuk", aciIsareti: ["dik", "yok", "yok", "dik"] }) },
  { id: "q-deltoid", ad: "Deltoid", ipucu: "|AB| = |AD|, |CB| = |CD|; köşegenler dik", nesne: "dortgenGeo", aramaKelimeleri: ["deltoid", "uçurtma", "köşegen dik"],
    olustur: () => varsayilanDortgen({ tip: "deltoid", kosegen: true, esKenar: [1, 2, 2, 1] }) },
  { id: "q-dikdortgen", ad: "Dikdörtgen + köşegen", ipucu: "Köşegenler eş ve birbirini ortalar", nesne: "dortgenGeo", aramaKelimeleri: ["dikdörtgen", "köşegen"],
    olustur: () => varsayilanDortgen({ tip: "dikdortgen", kosegen: true, aciIsareti: ["dik", "dik", "dik", "dik"] }) },
  { id: "q-kare", ad: "Kare + köşegen", ipucu: "Köşegenler dik, eş ve birbirini ortalar", nesne: "dortgenGeo", aramaKelimeleri: ["kare", "köşegen", "dörtgen"],
    olustur: () => varsayilanDortgen({ tip: "kare", kosegen: true, esKenar: [1, 1, 1, 1], aciIsareti: ["dik", "yok", "yok", "yok"] }) },
];

export const KATI_SABLONLARI: GeometriSablonu[] = [
  ...KATI_TURLERI.map((t) => ({
    id: `k-${t.id}`, ad: t.ad, ipucu: `${t.ad}: ${t.olcuAdlari.join(", ")}`, nesne: "katiCisim",
    aramaKelimeleri: [t.ad.toLocaleLowerCase("tr"), "katı cisim", "3b", "üç boyutlu", ...(t.id === "kup" || t.id === "prizma" ? ["hacim", "ayrıt"] : t.id === "kure" ? ["yarıçap", "hacim"] : ["hacim"])],
    olustur: (): GeometriVerisi => varsayilanKati({ cisim: t.id }),
  })),
  { id: "k-kup-kok", ad: "Küp (a = 2√3)", ipucu: "Ayrıt 2√3, köşegen AG = 6: köklü uzunluk panelden yazılır", nesne: "katiCisim", aramaKelimeleri: ["küp", "köklü", "√3", "cisim köşegeni", "kök"],
    olustur: () => varsayilanKati({ cisim: "kup", olcu: [2 * Math.sqrt(3)], etiketler: ["2√3"], kosegen: "cisim", koseAdlari: true }) },
  { id: "k-kup-kosegen", ad: "Küp köşegeni", ipucu: "Küpte cisim köşegeni AG = a√3", nesne: "katiCisim", aramaKelimeleri: ["küp köşegeni", "cisim köşegeni", "a√3"],
    olustur: () => varsayilanKati({ cisim: "kup", kosegen: "cisim", koseAdlari: true }) },
  { id: "k-prizma-yuzey", ad: "Prizma yüzey köşegeni", ipucu: "Ön yüzde AF yüzey köşegeni", nesne: "katiCisim", aramaKelimeleri: ["yüzey köşegeni", "prizma"],
    olustur: () => varsayilanKati({ cisim: "prizma", kosegen: "yuzey" }) },
];

/** Yeni katlama şablonlarının ortak görünümü: tek şekil üzerinde (eski konum kesikli), eş açı/kenar işaretli. */
const KAT_TEK = { sekil1: false, ok: true, olcu: false, eski: true, baslik: false, dolgu: "tarali" as const, eslikGoster: true };

export const KATLAMA_SABLONLARI: GeometriSablonu[] = [
  { id: "f-kosegen", ad: "Dikdörtgen köşegenden katlama", ipucu: "16×8 kağıt AC boyunca katlanır: D′ ve E oluşur", nesne: "kagitKatlama", aramaKelimeleri: ["kağıt katlama", "köşegen", "dikdörtgen", "katlama"],
    olustur: () => varsayilanKatlama() },
  { id: "f-dik-ucgen", ad: "Dik üçgen köşeden noktaya", ipucu: "6-8-10 dik üçgen A ile BC'deki D noktası boyunca katlanır", nesne: "kagitKatlama", aramaKelimeleri: ["dik üçgen katlama", "kağıt katlama"],
    olustur: () => varsayilanKatlama({ kagit: { tur: "dikucgen", w: 16, h: 8, a: 10, p: 8, q: 6 }, katlar: [{ mod: "nokta", k1: "A", k2: "C", hareketli: "B", kose: "A", kenar: "BC", uz: 3, hedef: "O" }] }) },
  { id: "f-kare-merkez", ad: "Karede iki köşe merkeze", ipucu: "10×10 karede B ve D köşeleri merkez O'ya katlanır", nesne: "kagitKatlama", aramaKelimeleri: ["kare katlama", "merkeze katlama", "kağıt katlama"],
    olustur: () => varsayilanKatlama({ kagit: { tur: "kare", w: 16, h: 8, a: 10, p: 8, q: 6 }, katlar: [
      { mod: "getir", k1: "A", k2: "C", hareketli: "B", kose: "A", kenar: "BC", uz: 4, hedef: "O" },
      { mod: "getir", k1: "A", k2: "C", hareketli: "D", kose: "A", kenar: "BC", uz: 4, hedef: "O" },
    ] }) },
  { id: "f-ucgen-tepe-de", ad: "Üçgende tepeyi [DE] boyunca katla", ipucu: "A köşesi, AB ve AC üzerindeki D, E noktalarından geçen [DE] boyunca katlanır: |AD| = |A′D|, |AE| = |A′E|", nesne: "kagitKatlama",
    aramaKelimeleri: ["üçgen katlama", "tepe katlama", "DE boyunca", "köşe katlama", "kağıt katlama"],
    olustur: () => varsayilanKatlama({
      kagit: kagitSerbest([{ x: 3, y: 7 }, { x: 0, y: 0 }, { x: 9, y: 0 }]),
      katlar: [{ mod: "ikiKenar", k1: "A", k2: "B", hareketli: "A", kose: "A", kenar: "BC", uz: 4, hedef: "O", kenar1: "AB", oran1: 0.4, kenar2: "CA", oran2: 0.45 }],
      ...KAT_TEK }) },
  { id: "f-aciortay", ad: "Köşeyi kenar üzerine katla (açıortay)", ipucu: "|AB|=6, |AC|=9, |BC|=10: B köşesi [AD] açıortayı boyunca AC üzerindeki B′ noktasına gelir; |AB| = |AB′|", nesne: "kagitKatlama",
    aramaKelimeleri: ["açıortay katlama", "köşeyi kenara katla", "üçgen katlama", "kağıt katlama"],
    olustur: () => varsayilanKatlama({
      kagit: kagitGenelUcgen(10, 9, 6)!,
      katlar: [{ mod: "nokta", k1: "A", k2: "B", hareketli: "B", kose: "A", kenar: "BC", uz: 4, hedef: "O" }],
      ...KAT_TEK, olcu: true }) },
  { id: "f-dikme", ad: "Köşeyi kendi kenarı üzerine katla (dikme)", ipucu: "C köşesi, BC kenarına dik [DE] boyunca yine BC üzerindeki C′ noktasına katlanır: [DE] ⊥ [BC]", nesne: "kagitKatlama",
    aramaKelimeleri: ["dikme katlama", "kenara dik katlama", "üçgen katlama", "kağıt katlama"],
    olustur: () => varsayilanKatlama({
      kagit: kagitSerbest([{ x: 3, y: 6 }, { x: 0, y: 0 }, { x: 10, y: 0 }]),
      katlar: [{ mod: "getir", k1: "A", k2: "B", hareketli: "C", kose: "A", kenar: "BC", uz: 4, hedef: "O", hedefXY: { x: 4, y: 0 } }],
      ...KAT_TEK, olcu: true }) },
  { id: "f-paralelkenar", ad: "Paralelkenarda köşeyi köşegen boyunca katla", ipucu: "ABCD paralelkenarında B köşesi [AC] köşegeni boyunca katlanır", nesne: "kagitKatlama",
    aramaKelimeleri: ["paralelkenar katlama", "köşegen katlama", "dörtgen katlama", "kağıt katlama"],
    olustur: () => varsayilanKatlama({
      kagit: kagitParalelkenar(8, 5, 60),
      katlar: [{ mod: "iki", k1: "A", k2: "C", hareketli: "B", kose: "A", kenar: "BC", uz: 4, hedef: "O" }],
      ...KAT_TEK, olcu: true }) },
  { id: "f-yamuk", ad: "Yamukta köşeyi [DE] boyunca katla", ipucu: "ABCD ikizkenar yamukta D köşesi, CD ve DA kenarlarının orta noktalarından geçen doğru boyunca katlanır", nesne: "kagitKatlama",
    aramaKelimeleri: ["yamuk katlama", "dörtgen katlama", "köşe katlama", "kağıt katlama"],
    olustur: () => varsayilanKatlama({
      kagit: kagitYamuk(12, 6, 5),
      katlar: [{ mod: "ikiKenar", k1: "A", k2: "B", hareketli: "D", kose: "A", kenar: "BC", uz: 4, hedef: "O", kenar1: "CD", oran1: 0.5, kenar2: "DA", oran2: 0.5 }],
      ...KAT_TEK }) },
  { id: "f-besgen", ad: "Düzgün beşgende köşeyi katla", ipucu: "Düzgün beşgenin A köşesi, komşu kenarların orta noktalarından geçen doğru boyunca katlanır", nesne: "kagitKatlama",
    aramaKelimeleri: ["beşgen katlama", "çokgen katlama", "köşe katlama", "kağıt katlama"],
    olustur: () => varsayilanKatlama({
      kagit: kagitDuzgunCokgen(5, 5),
      katlar: [{ mod: "ikiKenar", k1: "A", k2: "B", hareketli: "A", kose: "A", kenar: "BC", uz: 4, hedef: "O", kenar1: "EA", oran1: 0.5, kenar2: "AB", oran2: 0.5 }],
      ...KAT_TEK }) },
];

/** Sol kütüphane için tüm geometri şablonları (her biri `nesne` + `aramaKelimeleri` taşır). */

const cg = (id: string, ad: string, ipucu: string, yapi: Parameters<typeof varsayilanCografya>[0], ek: Parameters<typeof varsayilanCografya>[1], anahtar: string[]): GeometriSablonu => ({
  id, ad, ipucu, nesne: "cografyaSekil", altBaslik: SEMA_ALT[yapi], aramaKelimeleri: ["coğrafya", ...anahtar], olustur: () => varsayilanCografya(yapi, ek),
});
const SEMA_ALT: Record<string, string> = {
  harita: "Coğrafya – Harita", izohips: "Coğrafya – İzohips", horstGraben: "Coğrafya – Jeoloji blokları", antiklinal: "Coğrafya – Jeoloji blokları", senklinal: "Coğrafya – Jeoloji blokları",
  walter: "Coğrafya – İklim ve nüfus", piramit: "Coğrafya – İklim ve nüfus", mevsim: "Coğrafya – Dünya ve Güneş", aydinlanma: "Coğrafya – Dünya ve Güneş",
};
export const COGRAFYA_SABLONLARI: GeometriSablonu[] = [
  cg("c-turkiye-bos", "Türkiye haritası (il sınırlı)", "81 il sınırı; işaretli illere A, B, C yazılır", "harita", {}, ["türkiye", "harita", "il", "plaka", "boş harita", "yer bulma", "karadeniz", "akdeniz", "ege"]),
  cg("c-turkiye-sade", "Türkiye haritası (sade, il sınırsız)", "Yalnız dış sınır; deniz adları", "harita", { iller: false, isaret: "" }, ["türkiye", "harita", "sade", "boş harita", "kontur"]),
  cg("c-turkiye-nehir", "Türkiye: nehirler ve göller", "Kızılırmak, Fırat, Dicle… Van, Tuz gölü", "harita", { nehir: true, gol: true, isaret: "", plaka: false }, ["türkiye", "nehir", "göl", "akarsu", "kızılırmak", "fırat", "dicle", "van gölü", "tuz gölü", "sakarya"]),
  cg("c-turkiye-plaka", "Türkiye: plaka numaralı il haritası", "Her ilde plaka numarası", "harita", { plaka: true, isaret: "", deniz: false }, ["türkiye", "plaka", "il", "numara"]),
  cg("c-izohips-tepe", "İzohips: tepe", "Halka halka kapalı eğriler, zirve noktası", "izohips", { arazi: "tepe" }, ["izohips", "eş yükselti", "tepe", "yükselti", "topografya", "harita"]),
  cg("c-izohips-iki-tepe", "İzohips: iki tepe", "İki zirve ve aradaki boyun", "izohips", { arazi: "ikiTepe", aralik: 100, yukseklik: 800 }, ["izohips", "iki tepe", "boyun", "eş yükselti"]),
  cg("c-izohips-vadi", "İzohips: vadi", "Eğriler yüksek yere doğru V biçimli", "izohips", { arazi: "vadi", aralik: 100, yukseklik: 800 }, ["izohips", "vadi", "eş yükselti", "akarsu vadisi"]),
  cg("c-izohips-sirt", "İzohips: sırt", "Eğriler alçak yere doğru V biçimli", "izohips", { arazi: "sirt", aralik: 100, yukseklik: 800 }, ["izohips", "sırt", "eş yükselti", "tepe sırtı"]),
  cg("c-izohips-boyun", "İzohips: boyun (semer)", "İki tepe arasındaki alçak geçit", "izohips", { arazi: "boyun", aralik: 100, yukseklik: 800 }, ["izohips", "boyun", "semer", "geçit", "eş yükselti"]),
  cg("c-izohips-yamac", "İzohips: yamaç (eğim)", "Sık eğriler dik, seyrek eğriler yatay", "izohips", { arazi: "yamac", aralik: 100, yukseklik: 800 }, ["izohips", "yamaç", "eğim", "dik", "eş yükselti"]),
  cg("c-izohips-profil", "İzohips ve A–B profili", "Haritanın altında A–B kesit grafiği", "izohips", { arazi: "ikiTepe", aralik: 100, yukseklik: 800, profil: true }, ["izohips", "profil", "kesit", "topografya profili", "eş yükselti"]),
  cg("c-horst-graben", "Horst – Graben", "Faylarla çöken (graben) ve yüksekte kalan (horst) bloklar", "horstGraben", {}, ["horst", "graben", "fay", "çöküntü", "yarık", "blok diyagram", "jeoloji", "kırık", "yer kabuğu", "tektonik"]),
  cg("c-horst-graben-renkli", "Horst – Graben (renkli)", "Bej katmanlar, kahverengi taban", "horstGraben", { renk: "renkli" }, ["horst", "graben", "renkli", "fay", "blok diyagram"]),
  cg("c-antiklinal", "Antiklinal (dom kıvrım)", "Katmanlar yukarı kıvrılır; ortada en yaşlı katman", "antiklinal", {}, ["antiklinal", "kıvrım", "dom", "anti", "blok diyagram", "jeoloji", "kıvrılma", "tektonik"]),
  cg("c-antiklinal-kivrimli", "Antiklinal (kıvrımlı yüzey)", "Yüzey kıvrımı izler (aşınmamış)", "antiklinal", { yuzey: "kivrimli", renk: "renkli" }, ["antiklinal", "kıvrım", "dom", "blok diyagram"]),
  cg("c-senklinal", "Senklinal (çanak kıvrım)", "Katmanlar aşağı kıvrılır; ortada en genç katman", "senklinal", {}, ["senklinal", "kıvrım", "çanak", "sin", "blok diyagram", "jeoloji", "çukur kıvrım", "tektonik"]),
  cg("c-senklinal-kivrimli", "Senklinal (kıvrımlı yüzey)", "Yüzey kıvrımı izler (aşınmamış)", "senklinal", { yuzey: "kivrimli", renk: "renkli" }, ["senklinal", "kıvrım", "çanak", "blok diyagram"]),
  cg("c-walter", "Sıcaklık–yağış grafiği (Ankara)", "Aylık sıcaklık eğrisi + yağış çubukları, kurak dönem taralı", "walter", {}, ["iklim", "grafik", "sıcaklık", "yağış", "walter", "ombrotermik", "iklim grafiği", "ankara", "kurak dönem", "karasal", "akdeniz iklimi"]),
  cg("c-walter-izmir", "Sıcaklık–yağış grafiği (Akdeniz iklimi)", "Yazlar sıcak ve kurak, kışlar ılık ve yağışlı", "walter", { baslik: "İzmir", sicaklik: [8.9, 9.6, 12.1, 16.1, 21, 25.7, 28.4, 27.9, 23.9, 19, 13.9, 10.4], yagis: [128, 98, 76, 49, 31, 12, 4, 3, 17, 47, 92, 146] }, ["iklim", "akdeniz iklimi", "izmir", "sıcaklık", "yağış", "grafik", "walter"]),
  cg("c-walter-rize", "Sıcaklık–yağış grafiği (Karadeniz iklimi)", "Her mevsim yağışlı", "walter", { baslik: "Rize", sicaklik: [7.2, 7.1, 8.9, 12.5, 16.3, 20.2, 22.9, 23.2, 19.9, 16.1, 11.7, 8.9], yagis: [211, 160, 134, 94, 73, 111, 95, 120, 198, 260, 245, 240], kuru: false }, ["iklim", "karadeniz iklimi", "rize", "sıcaklık", "yağış", "grafik", "walter"]),
  cg("c-piramit", "Nüfus piramidi", "Yaş grubu ve cinsiyete göre nüfus (%)", "piramit", {}, ["nüfus", "piramit", "yaş", "yaş grubu", "genç nüfus", "yaşlı nüfus", "demografi", "erkek", "kadın"]),
  cg("c-piramit-genc", "Nüfus piramidi (genç nüfus, geniş taban)", "Gelişmekte olan ülke", "piramit", { baslik: "Genç nüfuslu ülke", erkek: [16, 14, 12, 10, 8, 6, 4, 2, 1], kadin: [15.5, 13.8, 11.8, 9.8, 7.8, 5.8, 4, 2.2, 1.2] }, ["nüfus", "piramit", "genç nüfus", "geniş taban"]),
  cg("c-piramit-yasli", "Nüfus piramidi (yaşlı nüfus, dar taban)", "Gelişmiş ülke", "piramit", { baslik: "Yaşlı nüfuslu ülke", erkek: [4.6, 5, 5.6, 6.6, 7.4, 8, 6.8, 4.6, 2.6], kadin: [4.4, 4.8, 5.4, 6.4, 7.3, 8.2, 7.4, 5.6, 4] }, ["nüfus", "piramit", "yaşlı nüfus", "dar taban"]),
  cg("c-mevsim", "Mevsimlerin oluşumu (Dünya'nın yörüngesi)", "Dört konumda Dünya, 23°27′ eğik eksen, gece yarısı gri", "mevsim", {}, ["mevsim", "yörünge", "dünya", "güneş", "ekinoks", "gündönümü", "eksen eğikliği", "yıllık hareket", "21 haziran", "22 aralık"]),
  cg("c-aydinlanma-haziran", "Aydınlanma çemberi: 21 Haziran", "Kuzey yarımkürede en uzun gündüz; Kuzey Kutup Dairesi içinde kutup gündüzü", "aydinlanma", { tarih: "haziran" }, ["aydınlanma çemberi", "21 haziran", "yengeç dönencesi", "kutup gündüzü", "gece gündüz", "dönence", "kutup dairesi"]),
  cg("c-aydinlanma-aralik", "Aydınlanma çemberi: 22 Aralık", "Güney yarımkürede en uzun gündüz; Kuzey Kutup Dairesi içinde kutup gecesi", "aydinlanma", { tarih: "aralik" }, ["aydınlanma çemberi", "22 aralık", "oğlak dönencesi", "kutup gecesi", "gece gündüz", "dönence"]),
  cg("c-aydinlanma-ekinoks", "Aydınlanma çemberi: 21 Mart / 23 Eylül", "Her yerde gece ile gündüz eşit", "aydinlanma", { tarih: "ekinoks" }, ["aydınlanma çemberi", "ekinoks", "21 mart", "23 eylül", "gece gündüz eşit"]),
];

const FIZIK_ALT: Record<string, string> = { atis: "Fizik – Atış", enerji: "Fizik – Enerji", carpisma: "Fizik – Momentum", tork: "Fizik – Tork", vektorToplam: "Fizik – Vektör", scd: "Fizik – Kuvvet",
  torricelli: "Fizik – Akışkanlar", bernoulli: "Fizik – Akışkanlar", hidrolik: "Fizik – Akışkanlar", manometre: "Fizik – Akışkanlar" };
const fz = (id: string, ad: string, ipucu: string, yapi: Parameters<typeof varsayilanCografya>[0], ek: Parameters<typeof varsayilanCografya>[1], anahtar: string[]): GeometriSablonu => ({
  id, ad, ipucu, nesne: "fizikSekil", altBaslik: FIZIK_ALT[yapi], aramaKelimeleri: ["fizik", ...anahtar], olustur: () => varsayilanCografya(yapi, ek),
});
export const FIZIK_SABLONLARI: GeometriSablonu[] = [
  fz("f-atis-egik-kok", "Köklü eğik atış (10√2 m/s, 45°)", "v₀ = 10√2: panelde v₀ kutusuna √ ile yazılır", "atis", { tip: "egik", v0: "10√2", aci: 45, h0: 0, sonuc: true, kokYaz: true }, ["eğik atış", "köklü", "√2", "kök", "45"]),
  fz("f-atis-egik-kok3", "Köklü eğik atış (20√3 m/s, 30°)", "v₀ = 20√3: bileşenler ve menzilde √ görünür", "atis", { tip: "egik", v0: "20√3", aci: 30, h0: 0, sonuc: true, kokYaz: true }, ["eğik atış", "köklü", "√3", "kök", "30"]),
  fz("f-carpisma-kok", "Köklü hızlı esnek çarpışma (4√3 m/s)", "v₁ = 4√3: eşit kütleler hız değiştirir", "carpisma", { tip: "esnek", m1: 2, m2: 2, v1: "4√3", v2: 0, sonra: "hesap", kokYaz: true }, ["çarpışma", "köklü", "√3", "kök", "momentum"]),
  fz("f-carpisma-yapisan-kok", "Köklü yapışan çarpışma (4√2 m/s)", "m₁ = 1, m₂ = 3, v₁ = 4√2 → ortak hız √2", "carpisma", { tip: "yapisan", m1: 1, m2: 3, v1: "4√2", v2: 0, sonra: "hesap", kokYaz: true }, ["çarpışma", "yapışma", "köklü", "√2", "kök"]),
  fz("f-atis-yatay", "Yatay atış (yüksekten)", "Yüksek yerden yatay atılan cisim: h, x ve hız bileşenleri", "atis", { tip: "yatay", v0: 20, aci: 0, h0: 80, tepe: false, bilesen: true }, ["atış", "yatay atış", "yörünge", "parabol", "menzil", "kinematik"]),
  fz("f-atis-egik", "Eğik atış (53°)", "v₀, açı, tepe noktası H ve menzil R", "atis", { tip: "egik", v0: 50, aci: 53, h0: 0 }, ["eğik atış", "atış", "yörünge", "parabol", "tepe", "menzil", "kinematik"]),
  fz("f-atis-egik-sonuc", "Eğik atış (değerli: H, R)", "Verilenler ve H, R değerleri yazılı", "atis", { tip: "egik", v0: 50, aci: 53, h0: 0, sonuc: true }, ["eğik atış", "atış", "H", "R", "menzil"]),
  fz("f-atis-yuksek-yukari", "Yüksekten eğik atış (yukarı)", "Yüksek yerden yukarı eğik atış", "atis", { tip: "yuksekEgik", v0: 40, aci: 30, h0: 45 }, ["yüksekten atış", "eğik atış", "kinematik"]),
  fz("f-atis-yuksek-asagi", "Yüksekten eğik atış (aşağı)", "Yüksek yerden aşağı eğik atış", "atis", { tip: "yuksekEgik", v0: 20, aci: -37, h0: 60, tepe: false }, ["yüksekten atış", "aşağı atış", "kinematik"]),
  fz("f-atis-noktalar", "Yatay atış (eş zamanlı noktalar)", "Eşit zaman aralıklarıyla konumlar", "atis", { tip: "yatay", v0: 20, aci: 0, h0: 80, noktalar: true, bilesen: false, tepe: false }, ["stroboskop", "eş zaman", "atış"]),
  fz("f-enerji-sarkac", "Sarkaç (A–B–C)", "A'dan bırakılan sarkaç, yükseklik h", "enerji", { tur: "sarkac", aci: 60 }, ["sarkaç", "enerji", "mekanik enerji", "potansiyel", "kinetik", "korunum"]),
  fz("f-enerji-pist", "Pist (A–E, sürtünmesiz)", "A'dan bırakılan cisim, yükseklikler 4h, h, 3h, 0, 2h", "enerji", { tur: "pist" }, ["pist", "enerji", "mekanik enerji", "sürtünmesiz", "yükseklik", "korunum"]),
  fz("f-enerji-pist-surt", "Pist (B–C sürtünmeli)", "Bir bölgesi sürtünmeli pist", "enerji", { tur: "pist", surt: "BC" }, ["pist", "sürtünme", "enerji", "iş", "ısı"]),
  fz("f-enerji-yay", "Yay + kütle (eğik çıkış)", "Sıkıştırılmış yay, düz zemin, h yüksekliğine çıkış", "enerji", { tur: "yay" }, ["yay", "enerji", "esneklik", "potansiyel enerji", "hooke"]),
  fz("f-enerji-yay-surt", "Yay + kütle (sürtünmeli zemin)", "Sürtünmeli zeminde yaydan fırlatma", "enerji", { tur: "yay", surt: "AB", egikCikis: false }, ["yay", "sürtünme", "enerji", "iş"]),
  fz("f-carpisma-esnek", "Esnek çarpışma", "İki cisim çarpışır ve ayrılır; sonra değerleri sorulur", "carpisma", { tip: "esnek", m1: 2, m2: 2, v1: 6, v2: 0 }, ["çarpışma", "esnek", "momentum", "itme", "korunum"]),
  fz("f-carpisma-yapisan", "Yapışarak çarpışma", "Çarpışıp birlikte hareket eder", "carpisma", { tip: "yapisan", m1: 2, m2: 3, v1: 6, v2: 0 }, ["çarpışma", "yapışma", "tam esnek olmayan", "momentum"]),
  fz("f-carpisma-zit", "Zıt yönlü çarpışma", "Birbirine doğru gelen iki cisim", "carpisma", { tip: "yapisan", m1: 2, m2: 4, v1: 6, v2: -3 }, ["çarpışma", "zıt yön", "momentum", "tek boyut"]),
  fz("f-carpisma-ayrilma", "Ayrılma (patlama)", "Duran sistem iki parçaya ayrılır", "carpisma", { tip: "ayrilma", m1: 2, m2: 4, v1: -6, v2: 0, sonra: "hesap" }, ["patlama", "ayrılma", "momentum", "geri tepme"]),
  fz("f-tork-denge", "Dengede çubuk (kuvvetler)", "Mesnetten eşit torklar", "tork", { mod: "kuvvet", mesnet: 5, konum: [2, 8, 0, 0], deger: [3, 3, 0, 0], adlar: "F_1, F_2, F_3, F_4" }, ["tork", "denge", "kaldıraç", "moment", "çubuk"]),
  fz("f-tork-uc-kuvvet", "Çubuk: yukarı ve aşağı kuvvetler", "Üç kuvvet, mesnet ortada", "tork", { mod: "kuvvet", mesnet: 5, konum: [1, 3, 8, 0], deger: [3, -3, 4, 0], adlar: "F_1, F_2, F_3, F_4" }, ["tork", "kuvvet", "çubuk", "kaldıraç"]),
  fz("f-tork-agirlik", "Asılı kütleli çubuk (denge)", "Çubuğa asılı kütleler", "tork", { mod: "agirlik", mesnet: 5, konum: [1, 3, 8, 0], deger: [3, 3, 6, 0], adlar: "3m, 3m, 6m, m" }, ["tork", "asılı kütle", "denge", "terazi", "kaldıraç"]),
  fz("f-tork-ip", "İple asılı çubuk (kütleli)", "Ortasından iple asılı, çubuğun ağırlığı G", "tork", { mod: "agirlik", destek: "ip", mesnet: 4, konum: [1, 8, 0, 0], deger: [4, 3, 0, 0], agirlikOk: false, adlar: "2m, m, m, m" }, ["tork", "ip", "çubuk", "denge", "ağırlık merkezi"]),
  fz("f-vektor-ucuca", "Vektör toplama (uç uca)", "A + B bileşkesi kareli düzlemde", "vektorToplam", { yontem: "ucuca" }, ["vektör", "toplama", "bileşke", "uç uca", "kareli"]),
  fz("f-vektor-paralel", "Vektör toplama (paralelkenar)", "Aynı noktadan çıkan A ve B", "vektorToplam", { yontem: "paralel", ax: 4, ay: 1, bx: 1, by: 3 }, ["vektör", "paralelkenar", "bileşke", "kareli"]),
  fz("f-vektor-cikarma", "Vektör çıkarma (A − B)", "İki vektörün farkı", "vektorToplam", { yontem: "cikarma", ax: 5, ay: 2, bx: 2, by: 3 }, ["vektör", "çıkarma", "fark", "kareli"]),
  fz("f-vektor-bilesen", "Bileşke ve bileşenleri", "Bileşkenin x ve y bileşenleri", "vektorToplam", { yontem: "ucuca", ax: 3, ay: 2, bx: 1, by: 2, bilesen: true, uzunluk: true }, ["vektör", "bileşen", "bileşke", "x y"]),
  fz("f-vektor-soru", "Bileşkeyi bul (soru)", "Bileşke gizli: öğrenci çizer", "vektorToplam", { yontem: "ucuca", bileske: false }, ["vektör", "bileşke", "soru", "kareli"]),
  fz("f-scd-yatay", "Yatay zeminde cisim (mg, N)", "Serbest cisim diyagramı", "scd", {}, ["serbest cisim", "kuvvet", "ağırlık", "normal", "newton"]),
  fz("f-scd-yatay-f", "Yatay zeminde F ve sürtünme", "F çeken kuvvet, f sürtünme", "scd", { dis: true, surtunme: true, disAci: 0 }, ["serbest cisim", "sürtünme", "kuvvet", "newton"]),
  fz("f-scd-yatay-egik-f", "Eğik F kuvveti", "Yüzeyle açı yapan F", "scd", { dis: true, surtunme: true, disAci: 30 }, ["serbest cisim", "eğik kuvvet", "newton"]),
  fz("f-scd-egik", "Eğik düzlemde cisim", "mg, N ve sürtünme", "scd", { yuzey: "egik", surtunme: true }, ["serbest cisim", "eğik düzlem", "kuvvet", "sürtünme"]),
  fz("f-scd-egik-bilesen", "Eğik düzlem: ağırlık bileşenleri", "mg sinα ve mg cosα kesikli", "scd", { yuzey: "egik", bilesen: true }, ["serbest cisim", "bileşen", "eğik düzlem"]),
  fz("f-scd-ip", "İple asılı cisim (mg, T)", "Tavandan ipte asılı", "scd", { yuzey: "askida", normal: false, gerilme: true }, ["serbest cisim", "gerilme", "ip", "denge"]),
  // ── Paket 1: Akışkanlar
  fz("f-torricelli", "Torricelli: üç delikli kap", "Delik derinlikleri d₁, d₂, d₃; jetlerin menzili", "torricelli", {}, ["torricelli", "akışkan", "delikli kap", "sıvı basıncı", "menzil", "jet"]),
  fz("f-torricelli-tek", "Torricelli: tek delik (değerli)", "d = 2 m, h = 8 m: x = 4√3 m", "torricelli", { d1: 2, d2: 0, d3: 0, deger: true, kokYaz: true, hizOk: true }, ["torricelli", "köklü", "√3", "akışkan", "çıkış hızı"]),
  fz("f-torricelli-orta", "Torricelli: en uzak menzil (d = h/2)", "Ortadaki delik en uzağa atar", "torricelli", { h: 8, d1: 2, d2: 4, d3: 6, veri: true, menzil: true }, ["torricelli", "en uzak menzil", "h/2", "akışkan"]),
  fz("f-torricelli-gaz", "Torricelli: kapalı kap (gaz basıncı)", "Üstte gaz basıncı P olan kapalı kap", "torricelli", { d1: 3, d2: 0, d3: 0, gaz: true }, ["torricelli", "gaz basıncı", "kapalı kap", "akışkan"]),
  fz("f-bernoulli-venturi", "Venturi borusu (manometreli)", "Daralan kesitte basınç düşer: manometre farkı", "bernoulli", { tip: "venturi" }, ["bernoulli", "venturi", "süreklilik", "manometre", "akışkan", "basınç"]),
  fz("f-bernoulli-kesit", "Kesiti değişen boru (süreklilik)", "A₁v₁ = A₂v₂; v₂ sorulur", "bernoulli", { tip: "kademe", a1: 40, a2: 10, v1: 2 }, ["süreklilik denklemi", "kesit", "debi", "bernoulli", "akışkan"]),
  fz("f-bernoulli-yukseklik", "Bernoulli: yükseklik farklı boru", "Yükselen ve daralan boru, P₁ − P₂", "bernoulli", { tip: "yukseklik", dh: 3, a1: 30, a2: 10, v1: 2 }, ["bernoulli", "yükseklik", "basınç farkı", "akışkan"]),
  fz("f-hidrolik-pres", "Hidrolik pres (F₂ sorulur)", "A₂ = 5A₁: kuvvet 5 katına çıkar", "hidrolik", {}, ["hidrolik", "pascal", "pres", "kaldıraç", "basınç", "piston"]),
  fz("f-hidrolik-yol", "Hidrolik pres: piston yolları", "x₁·A₁ = x₂·A₂ (iş korunumu)", "hidrolik", { yol: true, sonuc: "deger", a1: 20, a2: 100, f1: 50 }, ["hidrolik", "piston", "yol", "iş", "pascal"]),
  fz("f-manometre-acik", "Açık uçlu manometre", "Gaz basıncı P = P₀ + ρgh", "manometre", {}, ["manometre", "u borusu", "açık hava basıncı", "gaz basıncı", "civa"]),
  fz("f-manometre-kapali", "Kapalı uçlu manometre", "Kapalı uç boşluk: P = ρgh", "manometre", { tip: "kapali", fark: 12 }, ["manometre", "kapalı uçlu", "barometre", "civa", "boşluk"]),
  fz("f-manometre-iki", "İki gaz arası manometre", "İki kap arasındaki basınç farkı", "manometre", { tip: "ikiGaz", fark: 6, adlar: "A, B, sıvı" }, ["manometre", "iki gaz", "basınç farkı", "u borusu"]),
  // <<PAKET-EK-SABLON>>
];

export const GEOMETRI_KUTUPHANESI: GeometriSablonu[] = [
  ...UCGEN_SABLONLARI, ...CEMBER_SABLONLARI, ...BENZER_SABLONLARI, ...COKGEN_SABLONLARI,
  ...DOGRU_ACI_SABLONLARI, ...DORTGEN_SABLONLARI, ...KATI_SABLONLARI, ...KATLAMA_SABLONLARI, ...COGRAFYA_SABLONLARI, ...FIZIK_SABLONLARI,
];

export function varsayilanGeometri(nesne: string): GeometriVerisi {
  if (nesne === "dikUcgen") return UCGEN_SABLONLARI[1].olustur();
  if (nesne === "benzerUcgen") return varsayilanBenzer();
  if (nesne === "cemberGeo") return varsayilanCember();
  if (nesne === "cokgenAd") return varsayilanCokgen();
  if (nesne === "dogrudaAcilar") return varsayilanDogruAci();
  if (nesne === "dortgenGeo") return varsayilanDortgen();
  if (nesne === "katiCisim") return varsayilanKati();
  if (nesne === "kagitKatlama") return varsayilanKatlama();
  if (nesne === "cografyaSekil") return varsayilanCografya("harita");
  if (nesne === "fizikSekil") return varsayilanCografya("atis");
  return varsayilanUcgen();
}

/** Bu veri bu nesnede çizilebilir mi (ör. `dortgenGeo` nesnesine üçgen verisi gelmesin)? */
export function geometriNesneyeUygun(nesne: string, v: GeometriVerisi): boolean {
  const bek: Record<string, GeometriVerisi["tur"][]> = {
    ucgenABC: ["ucgen"], dikUcgen: ["ucgen"], benzerUcgen: ["benzer"], cemberGeo: ["cember"], cokgenAd: ["cokgen"],
    dogrudaAcilar: ["dogruAci"], dortgenGeo: ["dortgen"], katiCisim: ["kati"], kagitKatlama: ["katlama"], cografyaSekil: ["cografya"], fizikSekil: ["cografya"],
  };
  return !bek[nesne] || bek[nesne].includes(v.tur);
}

// ── Doğrulama ──────────────────────────────────────────────────────────────

const sayi = (v: unknown) => typeof v === "number" && Number.isFinite(v);
const metinDizisi = (v: unknown, en: number) => Array.isArray(v) && v.length <= en && v.every((t) => typeof t === "string" && t.length <= 24);
const sayiDizisi = (v: unknown, en: number) => Array.isArray(v) && v.length <= en && v.every((t) => sayi(t) && Math.abs(t as number) <= 1e6);
const istegeBagliMetin = (v: unknown) => v === undefined || (typeof v === "string" && v.length <= 24);
const istegeBagliBool = (v: unknown) => v === undefined || typeof v === "boolean";

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
      typeof g.ayakAdi === "string" && g.ayakAdi.length <= 24 &&
      // v1.2 isteğe bağlı alanlar
      (g.aciortay === undefined || ["yok", "A", "B", "C"].includes(String(g.aciortay))) &&
      (g.kenarortay === undefined || ["yok", "A", "B", "C", "hepsi"].includes(String(g.kenarortay))) &&
      (g.disAci === undefined || (Array.isArray(g.disAci) && g.disAci.length <= 3 && g.disAci.every((t) => ["A", "B", "C"].includes(String(t))))) &&
      (g.disAciEtiket === undefined || metinDizisi(g.disAciEtiket, 3)) &&
      [g.aciortayAdi, g.kenarortayAdi, g.agirlikAdi, g.icMerkezAdi, g.cevrelMerkezAdi].every(istegeBagliMetin) &&
      [g.icTegetCember, g.cevrelCember, g.sabitKutu].every(istegeBagliBool);
  }
  if (g.tur === "cember") {
    const dn = g.disNokta as Record<string, unknown> | undefined;
    return metinDizisi(g.adlar, 8) && sayiDizisi(g.konum, 5) && ["merkez", "yaricap", "kiris", "cap", "merkezAci", "cevreAci", "teget"].every((a) => typeof g[a] === "boolean") &&
      typeof g.merkezAciEtiket === "string" && (g.merkezAciEtiket as string).length <= 24 && typeof g.cevreAciEtiket === "string" && (g.cevreAciEtiket as string).length <= 24 &&
      [g.icAci, g.tegetKiris, g.dilimTarama].every(istegeBagliBool) &&
      [g.icAciEtiket, g.disAciEtiket, g.tegetKirisEtiket].every(istegeBagliMetin) &&
      (g.disAci === undefined || ["yok", "kesen", "teget"].includes(String(g.disAci))) &&
      (dn === undefined || (!!dn && typeof dn === "object" && sayi(dn.aci) && Math.abs(dn.aci as number) <= 720 && sayi(dn.uzaklik) && (dn.uzaklik as number) >= 1 && (dn.uzaklik as number) <= 5)) &&
      (g.disAdlar === undefined || metinDizisi(g.disAdlar, 3));
  }
  if (g.tur === "benzer") {
    return (g.duzen === "ic" || g.duzen === "yan") && sayi(g.oran) && metinDizisi(g.adlar, 6) && metinDizisi(g.etiketler, 6) && typeof g.esAci === "boolean";
  }
  if (g.tur === "cokgen") {
    return Number.isInteger(g.n) && (g.n as number) >= 3 && (g.n as number) <= 12 && metinDizisi(g.adlar, 12) &&
      ["merkez", "kosegen", "esKenar"].every((a) => typeof g[a] === "boolean");
  }
  return ekGeoGecerliMi(g);
}

/** `ek` (açı yayı, ışın ok, halka akım…) değerleri sınırlı ve temiz mi? */
export function fizikEkGecerliMi(v: unknown): v is FizikEk {
  if (!v || typeof v !== "object") return false;
  const e = v as Record<string, unknown>;
  const kisa = (t: unknown) => t === undefined || (typeof t === "string" && t.length <= 400);
  const sayi1 = (t: unknown) => t === undefined || (sayi(t) && Math.abs(t as number) <= 1e4);
  return (e.ters === undefined || typeof e.ters === "boolean") && sayi1(e.sayi) && sayi1(e.sayi2) && kisa(e.metin) && kisa(e.metin2);
}

// ── Dış pay (PNG kırpma sınırı) ────────────────────────────────────────────

/**
 * Geometri şeklinin yazılarının kutu DIŞINA taşabileceği pay (yerel, dönüşsüz).
 *
 * Köşe adları/etiketler köşeden dışarı doğru en çok ~34 px uzağa, ORTALI
 * yazılıyor; köşe kutunun kenarında olabildiği için taşma ≈ 34 + yazı/2.
 * Varsayılan adlarda taşma kırpma payının (14 px) içinde kalıyordu; koordinatlı
 * adlarda ("A(−12,15)") PNG'de 11 px kırpıldığı ölçüldü. Kesin konumu her
 * şablonda ayrı hesaplamak yerine en uzun yazıdan güvenli bir üst sınır
 * veriliyor — fazla beyaz alan dışa aktarımda `icerigeKirp` ile zaten atılıyor.
 *
 * v1.2: `sabitKutu` üçgende köşeler kutunun tam kenarında olabilir (sığdırma payı
 * yok), doğruda açılarda d₁/d₂ adı doğrunun SAĞ ucundan sola hizalı yazılır —
 * ikisinde de yazının tam genişliği payı eklenir. Ölçüm: tests/v12-g-senaryolari.ts
 * (gerçek tuval pikseli, tüm şablonlar × 0°/90°).
 */
export function geometriDisPayi(ctx: CanvasRenderingContext2D, s: FizikSekli) {
  const v = s.geo && geometriVerisiGecerliMi(s.geo) && geometriNesneyeUygun(s.nesne, s.geo) ? s.geo : varsayilanGeometri(s.nesne);
  const yazilar: string[] =
    v.tur === "ucgen" ? [...v.adlar, ...v.kenarlar, ...v.acilar, v.yukseklikEtiket, v.ayakAdi, ...(v.disAciEtiket ?? []), v.aciortayAdi ?? "", v.kenarortayAdi ?? "", v.agirlikAdi ?? "", v.icMerkezAdi ?? "", v.cevrelMerkezAdi ?? ""]
    : v.tur === "cember" ? [...v.adlar, v.merkezAciEtiket, v.cevreAciEtiket, v.icAciEtiket ?? "", v.disAciEtiket ?? "", v.tegetKirisEtiket ?? "", ...(v.disAdlar ?? [])]
    : v.tur === "benzer" ? [...v.adlar, ...v.etiketler]
    : v.tur === "cokgen" ? [...v.adlar]
    : ekGeoYazilari(v);
  let w = 0, h = 0;
  for (const y of yazilar) {
    const t = (y ?? "").trim();
    if (!t) continue;
    const o = fizikMetniOlcu(ctx, t, 18);
    w = Math.max(w, o.w); h = Math.max(h, o.h);
  }
  const tamGenislik = (v.tur === "ucgen" && v.sabitKutu) || v.tur === "dogruAci";
  const yatay = Math.max(28, Math.ceil(34 + (tamGenislik ? w : w / 2) + 4));
  const dikey = Math.max(24, Math.ceil(34 + h / 2 + 4));
  // Sürüklenen köşeler (sabitKutu üçgen / serbest dörtgen) kutunun dışına çıkabilir: taşma kadar ek pay.
  const serbestKose = v.tur === "ucgen" && v.sabitKutu ? v.kose : v.tur === "dortgen" && v.tip === "serbest" ? v.kose ?? [] : [];
  const tas = { sol: 0, sag: 0, ust: 0, alt: 0 };
  for (const p of serbestKose) {
    tas.sol = Math.max(tas.sol, -p.x * s.w); tas.sag = Math.max(tas.sag, (p.x - 1) * s.w);
    tas.ust = Math.max(tas.ust, -p.y * s.h); tas.alt = Math.max(tas.alt, (p.y - 1) * s.h);
  }
  return { sol: yatay + Math.ceil(tas.sol), sag: yatay + Math.ceil(tas.sag), ust: dikey + Math.ceil(tas.ust), alt: dikey + Math.ceil(tas.alt) };
}

/** Panel/simge için tür adları (kütüphane, önizleme). */
export { DORTGEN_TIPLERI, KATI_TURLERI };

// Bağlayıcı tutunma noktaları için fizik şeklinin gerçek çizim sınırı bu çiziciyle ölçülür.
icerikCizicisiKaydet((ctx, s) => geometriCiz(ctx, s));
