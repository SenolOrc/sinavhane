// v1.2 geometri şekilleri: doğruda açılar (d₁ ∥ d₂ + kesen, Z/U/M/kalem ucu/zikzak),
// özel dörtgenler, 3B katı cisimler ve kağıt katlama.
//
// Hepsi `geometriSekilleri.ts`'teki gibi ÇİZİLEN VERİDEN hesaplanır: köşe adı, açı yayı,
// gizli ayrıt, katlanan parça… şekil taşınınca/boyutlanınca birlikte gelir. Hesaplar
// (köşeler, açılar, görünmeyen ayrıtlar, katlama) saf fonksiyonlarda; testler bunları
// doğrudan çağırır. Matematik koordinatı: y YUKARI; tuvale `sigdir` ile çevrilir.

import type { GeoAciIsareti, GeometriVerisi, KatlamaAdimi, KatlamaKagidi, Nokta } from "./tipler";
import { fizikMetniCiz } from "./fizik";
import { cografyaCiz, cografyaGecerliMi, cografyaYazilari, type CografyaVerisi } from "./cografya";
import { aciNormu, aciYayiCiz, dikAciIsaretiCiz, dogru, ince, koseAdi, tirtikCiz } from "./geometriYardimci";

export type DogruAciVerisi = Extract<GeometriVerisi, { tur: "dogruAci" }>;
export type DortgenVerisi = Extract<GeometriVerisi, { tur: "dortgen" }>;
export type KatiVerisi = Extract<GeometriVerisi, { tur: "kati" }>;
export type KatlamaVerisi = Extract<GeometriVerisi, { tur: "katlama" }>;
type Kutu = { x: number; y: number; w: number; h: number };

const RAD = Math.PI / 180;
const TAM = Math.PI * 2;

/** Matematik koordinatındaki noktaları (y yukarı) kutuya sığdıran dönüşüm. */
export function sigdir(noktalar: Nokta[], k: Kutu, pay: number) {
  const xs = noktalar.map((p) => p.x), ys = noktalar.map((p) => p.y);
  const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
  const bw = Math.max(1e-9, x1 - x0), bh = Math.max(1e-9, y1 - y0);
  const olcek = Math.max(1e-6, Math.min(Math.max(1, k.w - 2 * pay) / bw, Math.max(1, k.h - 2 * pay) / bh));
  const ox = k.x + k.w / 2 - ((x0 + x1) / 2) * olcek;
  const oy = k.y + k.h / 2 + ((y0 + y1) / 2) * olcek;
  return { T: (p: Nokta): Nokta => ({ x: ox + p.x * olcek, y: oy - p.y * olcek }), olcek };
}

/** V köşesinde P1 ve P2 ışınları arasındaki açı (derece, 0–180). */
export function aciOlc(V: Nokta, P1: Nokta, P2: Nokta): number {
  const a = Math.atan2(P1.y - V.y, P1.x - V.x), b = Math.atan2(P2.y - V.y, P2.x - V.x);
  let f = Math.abs(a - b) % TAM;
  if (f > Math.PI) f = TAM - f;
  return f / RAD;
}

const ortaNokta = (p: Nokta, q: Nokta): Nokta => ({ x: (p.x + q.x) / 2, y: (p.y + q.y) / 2 });
const uz = (p: Nokta, q: Nokta) => Math.hypot(p.x - q.x, p.y - q.y);
const derece = (n: number) => `${Math.round(n * 10) / 10}°`.replace(".", ",");

/** İki doğrunun (p1p2, p3p4) kesişimi; paralelse null. */
export function dogruKesisimi(p1: Nokta, p2: Nokta, p3: Nokta, p4: Nokta): Nokta | null {
  const d = (p1.x - p2.x) * (p3.y - p4.y) - (p1.y - p2.y) * (p3.x - p4.x);
  if (Math.abs(d) < 1e-12) return null;
  const a = p1.x * p2.y - p1.y * p2.x, b = p3.x * p4.y - p3.y * p4.x;
  return { x: (a * (p3.x - p4.x) - (p1.x - p2.x) * b) / d, y: (a * (p3.y - p4.y) - (p1.y - p2.y) * b) / d };
}

/** Yayın yanına etiket: yay ortası yönünde. */
function yayEtiketi(ctx: CanvasRenderingContext2D, V: Nokta, P1: Nokta, P2: Nokta, r: number, metin: string, adet = 1) {
  const orta = adet > 0 ? aciYayiCiz(ctx, V, P1, P2, r, adet) : (() => {
    const t1 = Math.atan2(P1.y - V.y, P1.x - V.x);
    return t1 + aciNormu(Math.atan2(P2.y - V.y, P2.x - V.x) - t1) / 2;
  })();
  // Uzun etiket ("x + y", "180° − α") yaydan biraz daha uzağa: kollarla çakışmasın.
  const d = r + 14 + Math.max(0, adet - 1) * 4 + Math.max(0, [...metin.trim()].length - 2) * 3;
  if (metin.trim()) fizikMetniCiz(ctx, metin.trim(), V.x + Math.cos(orta) * d, V.y + Math.sin(orta) * d, 15);
}

// ════════════════════════════════════════════════════════════════════════════
// Doğruda açılar
// ════════════════════════════════════════════════════════════════════════════

export type DogruAciAcisi = { V: Nokta; P1: Nokta; P2: Nokta; i: number; olcu: number };

/**
 * Doğruda açılar düzeni (matematik koordinatı: d₂ y=0, d₁ y=1).
 * `acilar[i]` etiket indeksiyle; `olcu` çizilen gerçek açı (derece).
 */
export function dogruAciDuzeni(v: DogruAciVerisi) {
  const a = Math.max(10, Math.min(170, v.aci)) * RAD;
  const kisa = Math.max(10, Math.min(80, v.aci)) * RAD;
  const kisa2 = Math.max(10, Math.min(80, v.aci2)) * RAD;
  const noktalar: { p: Nokta; ad: string; i: number }[] = [];
  const parcalar: [Nokta, Nokta][] = [];
  const acilar: DogruAciAcisi[] = [];
  const ac = (V: Nokta, P1: Nokta, P2: Nokta, i: number) => acilar.push({ V, P1, P2, i, olcu: aciOlc(V, P1, P2) });
  const sag = (p: Nokta) => ({ x: p.x + 1, y: p.y });
  const sol = (p: Nokta) => ({ x: p.x - 1, y: p.y });
  let xs: number[] = [];
  if (v.duzen === "kesen") {
    const X1 = { x: 0.5 / Math.tan(a), y: 1 }, X2 = { x: -0.5 / Math.tan(a), y: 0 };
    const u = { x: Math.cos(a), y: Math.sin(a) };
    const uzat = 0.45 / Math.max(0.3, u.y);
    parcalar.push([{ x: X2.x - u.x * uzat, y: X2.y - u.y * uzat }, { x: X1.x + u.x * uzat, y: X1.y + u.y * uzat }]);
    [X1, X2].forEach((X, k) => {
      const U = { x: X.x + u.x, y: X.y + u.y }, D = { x: X.x - u.x, y: X.y - u.y };
      ac(X, sag(X), U, k * 4); ac(X, U, sol(X), k * 4 + 1); ac(X, sol(X), D, k * 4 + 2); ac(X, D, sag(X), k * 4 + 3);
    });
    noktalar.push({ p: X1, ad: v.adlar[0] ?? "", i: 0 }, { p: X2, ad: v.adlar[1] ?? "", i: 1 });
    xs = [X1.x, X2.x, X1.x + u.x * uzat, X2.x - u.x * uzat];
  } else if (v.duzen === "z" || v.duzen === "u") {
    const A = { x: 0, y: 1 };
    // Z: A'da (sol ışın, AB) = B'de (sağ ışın, BA) — iç ters. U: ikisi de sağ ışınla — karşı durumlu (toplam 180°).
    const B = v.duzen === "z" ? { x: -Math.cos(a) / Math.sin(a), y: 0 } : { x: Math.cos(a) / Math.sin(a), y: 0 };
    parcalar.push([A, B]);
    if (v.duzen === "z") { ac(A, sol(A), B, 0); ac(B, sag(B), A, 1); } else { ac(A, sag(A), B, 0); ac(B, sag(B), A, 1); }
    noktalar.push({ p: A, ad: v.adlar[0] ?? "", i: 0 }, { p: B, ad: v.adlar[1] ?? "", i: 1 });
    xs = [A.x, B.x];
  } else if (v.duzen === "m" || v.duzen === "kalemUcu") {
    const A = { x: 0, y: 1 }, B = { x: 0, y: 0 };
    const C = dogruKesisimi(A, { x: Math.cos(kisa), y: 1 - Math.sin(kisa) }, B, { x: Math.cos(kisa2), y: Math.sin(kisa2) })!;
    parcalar.push([A, C], [C, B]);
    if (v.duzen === "m") { ac(A, sag(A), C, 0); ac(B, sag(B), C, 1); } else { ac(A, sol(A), C, 0); ac(B, sol(B), C, 1); }
    ac(C, A, B, 2);
    noktalar.push({ p: A, ad: v.adlar[0] ?? "", i: 0 }, { p: B, ad: v.adlar[1] ?? "", i: 1 }, { p: C, ad: v.adlar[2] ?? "", i: 2 });
    xs = [A.x, C.x];
  } else {
    // Zikzak: A → C (sağa kırık) → D (sola kırık) → B. Sağa açılan açılar (A, D) toplamı = sola açılanlar (C, B).
    const A = { x: 0, y: 1 };
    const C = { x: 0.34 / Math.tan(kisa), y: 0.66 };
    const D = { x: C.x * 0.25, y: 0.33 };
    const B = { x: D.x + 0.33 / Math.tan(kisa2), y: 0 };
    parcalar.push([A, C], [C, D], [D, B]);
    ac(A, sag(A), C, 0); ac(C, A, D, 1); ac(D, C, B, 2); ac(B, sol(B), D, 3);
    noktalar.push({ p: A, ad: v.adlar[0] ?? "", i: 0 }, { p: C, ad: v.adlar[2] ?? "", i: 2 }, { p: D, ad: v.adlar[3] ?? "", i: 3 }, { p: B, ad: v.adlar[1] ?? "", i: 1 });
    xs = [A.x, B.x, C.x, D.x];
  }
  const x0 = Math.min(...xs) - 0.55, x1 = Math.max(...xs) + 0.55;
  const dogrular: [Nokta, Nokta][] = [[{ x: x0, y: 1 }, { x: x1, y: 1 }], [{ x: x0, y: 0 }, { x: x1, y: 0 }]];
  return { dogrular, parcalar, acilar, noktalar };
}

function paralelOkuCiz(ctx: CanvasRenderingContext2D, p: Nokta, q: Nokta, adet = 2) {
  const L = uz(p, q) || 1, ux = (q.x - p.x) / L, uy = (q.y - p.y) / L;
  const o = { x: p.x + (q.x - p.x) * 0.12, y: p.y + (q.y - p.y) * 0.12 };
  ince(ctx, 0.9, () => {
    for (let i = 0; i < adet; i += 1) {
      const c = { x: o.x + ux * i * 6, y: o.y + uy * i * 6 };
      ctx.beginPath();
      ctx.moveTo(c.x - ux * 6 - uy * 5, c.y - uy * 6 + ux * 5);
      ctx.lineTo(c.x, c.y);
      ctx.lineTo(c.x - ux * 6 + uy * 5, c.y - uy * 6 - ux * 5);
      ctx.stroke();
    }
  });
}

function dogruAciCiz(ctx: CanvasRenderingContext2D, v: DogruAciVerisi, k: Kutu) {
  const d = dogruAciDuzeni(v);
  const tum = [...d.dogrular.flat(), ...d.parcalar.flat()];
  const { T } = sigdir(tum, k, 24);
  d.dogrular.forEach(([p, q], i) => {
    const P = T(p), Q = T(q);
    dogru(ctx, P, Q);
    if (v.paralelOk) paralelOkuCiz(ctx, P, Q);
    const ad = (v.dogruAdlari[i] ?? "").trim();
    if (ad) fizikMetniCiz(ctx, ad, Q.x + 4, Q.y - 12, 16, "sol");
  });
  d.parcalar.forEach(([p, q]) => dogru(ctx, T(p), T(q)));
  const kesen = v.duzen === "kesen";
  for (const a of d.acilar) {
    const et = (v.etiketler[a.i] ?? "").trim();
    if (kesen && !et && !v.olcuYaz) continue;
    const metin = et || (v.olcuYaz ? derece(a.olcu) : "");
    // Kesende bölge numaraları (1–8) yaysız yazılır; açı adı/ölçüsü yaylı.
    const yaysiz = kesen && /^[1-8]$/.test(et);
    yayEtiketi(ctx, T(a.V), T(a.P1), T(a.P2), kesen ? 15 : 18, metin, yaysiz ? 0 : 1);
  }
  for (const n of d.noktalar) {
    if (kesen) continue;
    const P = T(n.p);
    ctx.beginPath(); ctx.arc(P.x, P.y, 2.4, 0, TAM); ctx.fill();
    if (n.ad.trim()) {
      // Nokta adı doğrunun DIŞ yanına: üst doğrudakiler üste, alttakiler alta, aradakiler kırık yönüne.
      const ust = n.p.y > 0.99, alt = n.p.y < 0.01;
      const dy = ust ? -16 : alt ? 18 : 0;
      const dx = ust || alt ? -10 : (n.p.x >= 0.2 ? 16 : -16);
      fizikMetniCiz(ctx, n.ad.trim(), P.x + dx, P.y + dy, 16);
    }
  }
}

export function varsayilanDogruAci(ek: Partial<DogruAciVerisi> = {}): DogruAciVerisi {
  return {
    tur: "dogruAci", duzen: "kesen", aci: 60, aci2: 30, etiketler: ["1", "2", "3", "4", "5", "6", "7", "8"],
    adlar: ["A", "B", "C", "D"], dogruAdlari: ["d_1", "d_2"], paralelOk: true, olcuYaz: false, ...ek,
  };
}

// ════════════════════════════════════════════════════════════════════════════
// Özel dörtgenler
// ════════════════════════════════════════════════════════════════════════════

export const DORTGEN_TIPLERI: { id: DortgenVerisi["tip"]; ad: string; olcuAdlari: string[]; varsayilan: number[] }[] = [
  { id: "paralelkenar", ad: "Paralelkenar", olcuAdlari: ["|AB|", "|AD|", "A açısı °"], varsayilan: [6, 4, 60] },
  { id: "eskenar", ad: "Eşkenar dörtgen", olcuAdlari: ["Kenar", "A açısı °"], varsayilan: [5, 60] },
  { id: "yamuk", ad: "Yamuk", olcuAdlari: ["Alt taban |AB|", "Üst taban |DC|", "Yükseklik", "D'nin kayması"], varsayilan: [7, 4, 3.5, 1] },
  { id: "ikizkenarYamuk", ad: "İkizkenar yamuk", olcuAdlari: ["Alt taban |AB|", "Üst taban |DC|", "Yükseklik"], varsayilan: [7, 3, 3.5] },
  { id: "dikYamuk", ad: "Dik yamuk", olcuAdlari: ["Alt taban |AB|", "Üst taban |DC|", "Yükseklik"], varsayilan: [7, 4, 3.5] },
  { id: "deltoid", ad: "Deltoid", olcuAdlari: ["|AC| köşegeni", "|BD| köşegeni", "A'dan kesişim oranı"], varsayilan: [6, 4.4, 0.32] },
  { id: "dikdortgen", ad: "Dikdörtgen", olcuAdlari: ["|AB|", "|BC|"], varsayilan: [7, 4] },
  { id: "kare", ad: "Kare", olcuAdlari: ["Kenar"], varsayilan: [5] },
];

/** Dörtgenin köşeleri [A, B, C, D] (matematik koordinatı, y yukarı, saat yönünün tersi). Geçersizde null. */
export function dortgenKoseleri(v: DortgenVerisi): Nokta[] | null {
  const o = v.olcu;
  const poz = (n: number) => Number.isFinite(n) && n > 0;
  const aciDogru = (t: number) => Number.isFinite(t) && t > 1 && t < 179;
  switch (v.tip) {
    case "paralelkenar": case "eskenar": {
      const a = o[0], b = v.tip === "eskenar" ? o[0] : o[1], t = v.tip === "eskenar" ? o[1] : o[2];
      if (!poz(a) || !poz(b) || !aciDogru(t)) return null;
      const D = { x: b * Math.cos(t * RAD), y: b * Math.sin(t * RAD) };
      return [{ x: 0, y: 0 }, { x: a, y: 0 }, { x: a + D.x, y: D.y }, D];
    }
    case "dikdortgen": case "kare": {
      const a = o[0], b = v.tip === "kare" ? o[0] : o[1];
      if (!poz(a) || !poz(b)) return null;
      return [{ x: 0, y: 0 }, { x: a, y: 0 }, { x: a, y: b }, { x: 0, y: b }];
    }
    case "yamuk": case "ikizkenarYamuk": case "dikYamuk": {
      const [a, c, h] = o;
      if (!poz(a) || !poz(c) || !poz(h)) return null;
      const dx = v.tip === "yamuk" ? (Number.isFinite(o[3]) ? o[3] : 0) : v.tip === "dikYamuk" ? 0 : (a - c) / 2;
      return [{ x: 0, y: 0 }, { x: a, y: 0 }, { x: dx + c, y: h }, { x: dx, y: h }];
    }
    case "deltoid": {
      const [p, q, t] = o;
      if (!poz(p) || !poz(q) || !(t > 0.02 && t < 0.98)) return null;
      const y = p * (1 - t);
      return [{ x: 0, y: p }, { x: -q / 2, y }, { x: 0, y: 0 }, { x: q / 2, y }];
    }
    default: {
      const k = v.kose;
      if (!k || k.length !== 4) return null;
      return k.map((p) => ({ x: p.x, y: -p.y }));
    }
  }
}

/** Dörtgenin tuvaldeki köşeleri (çizimle aynı yerleşim). `serbest` kutuya doğrudan eşlenir. */
export function dortgenYerlesimi(v: DortgenVerisi, k: Kutu): Nokta[] {
  if (v.tip === "serbest" && v.kose && v.kose.length === 4) return v.kose.map((p) => ({ x: k.x + p.x * k.w, y: k.y + p.y * k.h }));
  const ham = dortgenKoseleri(v) ?? dortgenKoseleri(varsayilanDortgen())!;
  const { T } = sigdir(ham, k, 30);
  return ham.map(T);
}

function dortgenCiz(ctx: CanvasRenderingContext2D, v: DortgenVerisi, k: Kutu) {
  const P = dortgenYerlesimi(v, k);
  const [A, B, C, D] = P;
  const m = { x: (A.x + B.x + C.x + D.x) / 4, y: (A.y + B.y + C.y + D.y) / 4 };
  ctx.beginPath(); P.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y))); ctx.closePath(); ctx.stroke();
  if (v.kosegen) {
    ince(ctx, 0.8, () => { dogru(ctx, A, C); dogru(ctx, B, D); });
    const E = dogruKesisimi(A, C, B, D);
    if (E) {
      const u1 = { x: C.x - A.x, y: C.y - A.y }, u2 = { x: D.x - B.x, y: D.y - B.y };
      const cos = Math.abs(u1.x * u2.x + u1.y * u2.y) / ((Math.hypot(u1.x, u1.y) * Math.hypot(u2.x, u2.y)) || 1);
      if (v.dikIsaret && cos < 1e-3) dikAciIsaretiCiz(ctx, E, C, D, 8);
      ctx.beginPath(); ctx.arc(E.x, E.y, 2.4, 0, TAM); ctx.fill();
      if (v.kesisimAdi.trim()) {
        // Kesişim adı, köşegenler arasındaki en geniş boşluğa (C–D arası açının ortası değil; B–C arası).
        const t = Math.atan2((B.y + C.y) / 2 - E.y, (B.x + C.x) / 2 - E.x);
        fizikMetniCiz(ctx, v.kesisimAdi.trim(), E.x + Math.cos(t) * 15, E.y + Math.sin(t) * 15, 16);
      }
    }
  }
  if (v.yukseklik) {
    // D'den AB doğrusuna dikme; ayak AB dışındaysa AB kesikli uzatılır.
    const dx = B.x - A.x, dy = B.y - A.y;
    const t = ((D.x - A.x) * dx + (D.y - A.y) * dy) / (dx * dx + dy * dy || 1);
    const H = { x: A.x + t * dx, y: A.y + t * dy };
    if (t < 0 || t > 1) ince(ctx, 0.8, () => { ctx.save(); ctx.setLineDash([5, 4]); dogru(ctx, t < 0 ? A : B, H); ctx.restore(); });
    ince(ctx, 0.85, () => dogru(ctx, D, H));
    if (uz(D, H) > 8) dikAciIsaretiCiz(ctx, H, D, t > 0.5 ? A : B, 8);
    const L = uz(D, H) || 1;
    if (v.yukseklikAdi.trim()) fizikMetniCiz(ctx, v.yukseklikAdi.trim(), H.x + ((H.x - D.x) / L) * 15, H.y + ((H.y - D.y) / L) * 15, 16);
    if (v.yukseklikEtiket.trim()) fizikMetniCiz(ctx, v.yukseklikEtiket.trim(), (D.x + H.x) / 2 + (t > 0.5 ? -10 : 10), (D.y + H.y) / 2, 15);
  }
  cokgenIsaretleri(ctx, P, m, v);
}

/** Köşe açı işaretleri, eş kenar/eş açı işaretleri, kenar etiketleri ve köşe adları (n köşe). */
export function cokgenIsaretleri(
  ctx: CanvasRenderingContext2D, P: Nokta[], m: Nokta,
  v: { adlar: string[]; kenarlar: string[]; acilar: string[]; aciIsareti: GeoAciIsareti[]; esKenar: number[]; esAci: number[] },
) {
  const n = P.length;
  for (let i = 0; i < n; i += 1) {
    const V = P[i], P1 = P[(i + 1) % n], P2 = P[(i + n - 1) % n];
    const isaret = v.aciIsareti[i] ?? "yok", adet = v.esAci[i] ?? 0, et = (v.acilar[i] ?? "").trim();
    const r = Math.max(8, Math.min(18, uz(V, P1) * 0.22, uz(V, P2) * 0.22));
    let orta: number | null = null;
    if (isaret === "dik") { dikAciIsaretiCiz(ctx, V, P1, P2, Math.max(7, r * 0.7)); orta = Math.atan2((P1.y + P2.y) / 2 - V.y, (P1.x + P2.x) / 2 - V.x); }
    else if (isaret === "yay" || adet > 0) orta = aciYayiCiz(ctx, V, P1, P2, r, isaret === "yay" ? Math.max(1, adet) : adet);
    if (et) {
      const t = orta ?? Math.atan2((P1.y + P2.y) / 2 - V.y, (P1.x + P2.x) / 2 - V.x);
      const d = r + 15 + Math.max(0, adet - 1) * 4;
      fizikMetniCiz(ctx, et, V.x + Math.cos(t) * d, V.y + Math.sin(t) * d, 15);
    }
  }
  for (let i = 0; i < n; i += 1) {
    const p = P[i], q = P[(i + 1) % n];
    tirtikCiz(ctx, p, q, v.esKenar[i] ?? 0);
    const t = (v.kenarlar[i] ?? "").trim();
    if (!t) continue;
    const o = ortaNokta(p, q);
    // Kenarın dışa dönük normali (merkezden uzaklaşan yön).
    let nx = -(q.y - p.y), ny = q.x - p.x;
    const L = Math.hypot(nx, ny) || 1;
    if ((o.x - m.x) * nx + (o.y - m.y) * ny < 0) { nx = -nx; ny = -ny; }
    fizikMetniCiz(ctx, t, o.x + (nx / L) * 15, o.y + (ny / L) * 14, 16);
  }
  P.forEach((q, i) => koseAdi(ctx, v.adlar[i] ?? "", q, m, 17));
}

export function varsayilanDortgen(ek: Partial<DortgenVerisi> = {}): DortgenVerisi {
  const tip = ek.tip ?? "paralelkenar";
  return {
    tur: "dortgen", tip, olcu: [...(DORTGEN_TIPLERI.find((t) => t.id === tip)?.varsayilan ?? [6, 4, 60])],
    adlar: ["A", "B", "C", "D"], kenarlar: ["", "", "", ""], acilar: ["", "", "", ""], aciIsareti: ["yok", "yok", "yok", "yok"],
    esKenar: [0, 0, 0, 0], esAci: [0, 0, 0, 0], kosegen: false, kesisimAdi: "E", dikIsaret: true,
    yukseklik: false, yukseklikAdi: "H", yukseklikEtiket: "h", ...ek,
  };
}

// ════════════════════════════════════════════════════════════════════════════
// 3B katı cisimler
// ════════════════════════════════════════════════════════════════════════════

type N3 = { x: number; y: number; z: number };
/** Eğik izdüşüm: derinlik (z, sayfanın içine) sağ-yukarı çizilir. */
const DERINLIK = { kx: 0.5 * Math.cos(35 * RAD), ky: 0.5 * Math.sin(35 * RAD) };
export const izdusum = (p: N3): Nokta => ({ x: p.x + p.z * DERINLIK.kx, y: p.y + p.z * DERINLIK.ky });
/** Bakış yönü (göze doğru): önden (−z), sağdan, yukarıdan. */
const GOZ: N3 = { x: DERINLIK.kx, y: DERINLIK.ky, z: -1 };

export type KatiAyriti = { i: number; j: number; gizli: boolean };

/** Çokyüzlü cisimlerin köşeleri, yüzleri ve ayrıtları (gizli = iki komşu yüz de arkaya bakıyor). */
export function katiCokyuzlu(v: KatiVerisi): { koseler: N3[]; yuzler: number[][]; ayritlar: KatiAyriti[] } | null {
  const o = v.olcu.map((n) => Math.max(0.1, Math.min(1000, Number.isFinite(n) ? n : 1)));
  let koseler: N3[] = [];
  let yuzler: number[][] = [];
  if (v.cisim === "kup" || v.cisim === "prizma") {
    const a = o[0], b = v.cisim === "kup" ? o[0] : o[1] ?? o[0], c = v.cisim === "kup" ? o[0] : o[2] ?? o[0];
    // A B C D alt yüz (A ön-sol, saat yönünün tersi yukarıdan bakınca), E F G H üstte.
    koseler = [{ x: 0, y: 0, z: 0 }, { x: a, y: 0, z: 0 }, { x: a, y: 0, z: b }, { x: 0, y: 0, z: b }].flatMap((p) => [p]);
    koseler = [...koseler, ...koseler.map((p) => ({ ...p, y: c }))];
    yuzler = [[0, 1, 2, 3], [4, 5, 6, 7], [0, 1, 5, 4], [1, 2, 6, 5], [2, 3, 7, 6], [3, 0, 4, 7]];
  } else if (v.cisim === "ucgenPrizma") {
    const a = o[0], h = o[1] ?? o[0];
    // Yatık üçgen prizma: ön yüz eşkenar üçgen ABC, arka yüz DEF (derinlik h).
    const on = [{ x: 0, y: 0, z: 0 }, { x: a, y: 0, z: 0 }, { x: a / 2, y: (a * Math.sqrt(3)) / 2, z: 0 }];
    koseler = [...on, ...on.map((p) => ({ ...p, z: h }))];
    yuzler = [[0, 1, 2], [3, 4, 5], [0, 1, 4, 3], [1, 2, 5, 4], [2, 0, 3, 5]];
  } else if (v.cisim === "piramit") {
    const a = o[0], h = o[1] ?? o[0];
    koseler = [{ x: 0, y: 0, z: 0 }, { x: a, y: 0, z: 0 }, { x: a, y: 0, z: a }, { x: 0, y: 0, z: a }, { x: a / 2, y: h, z: a / 2 }];
    yuzler = [[0, 1, 2, 3], [0, 1, 4], [1, 2, 4], [2, 3, 4], [3, 0, 4]];
  } else return null;
  const n = koseler.length;
  const g = { x: koseler.reduce((t, p) => t + p.x, 0) / n, y: koseler.reduce((t, p) => t + p.y, 0) / n, z: koseler.reduce((t, p) => t + p.z, 0) / n };
  const onde = yuzler.map((f) => {
    const [p, q, r] = f.map((i) => koseler[i]);
    const u = { x: q.x - p.x, y: q.y - p.y, z: q.z - p.z }, w = { x: r.x - p.x, y: r.y - p.y, z: r.z - p.z };
    let nn = { x: u.y * w.z - u.z * w.y, y: u.z * w.x - u.x * w.z, z: u.x * w.y - u.y * w.x };
    const m = { x: f.reduce((t, i) => t + koseler[i].x, 0) / f.length - g.x, y: f.reduce((t, i) => t + koseler[i].y, 0) / f.length - g.y, z: f.reduce((t, i) => t + koseler[i].z, 0) / f.length - g.z };
    if (nn.x * m.x + nn.y * m.y + nn.z * m.z < 0) nn = { x: -nn.x, y: -nn.y, z: -nn.z };
    return nn.x * GOZ.x + nn.y * GOZ.y + nn.z * GOZ.z > 1e-9;
  });
  const ayritlar: KatiAyriti[] = [];
  const anahtar = new Map<string, number[]>();
  yuzler.forEach((f, fi) => f.forEach((i, k) => {
    const j = f[(k + 1) % f.length];
    const ad = i < j ? `${i}-${j}` : `${j}-${i}`;
    anahtar.set(ad, [...(anahtar.get(ad) ?? []), fi]);
  }));
  for (const [ad, fl] of anahtar) {
    const [i, j] = ad.split("-").map(Number);
    ayritlar.push({ i, j, gizli: fl.every((f) => !onde[f]) });
  }
  return { koseler, yuzler, ayritlar };
}

const KATI_ADLARI: Record<KatiVerisi["cisim"], string[]> = {
  kup: ["A", "B", "C", "D", "E", "F", "G", "H"],
  prizma: ["A", "B", "C", "D", "E", "F", "G", "H"],
  ucgenPrizma: ["A", "B", "C", "D", "E", "F"],
  piramit: ["A", "B", "C", "D", "T"],
  silindir: ["O", "O'"],
  koni: ["O", "T"],
  kure: ["O"],
};

export const KATI_TURLERI: { id: KatiVerisi["cisim"]; ad: string; olcuAdlari: string[]; varsayilan: number[]; etiketler: string[] }[] = [
  { id: "kup", ad: "Küp", olcuAdlari: ["Ayrıt a"], varsayilan: [4], etiketler: ["a"] },
  { id: "prizma", ad: "Dikdörtgenler prizması", olcuAdlari: ["Genişlik a", "Derinlik b", "Yükseklik c"], varsayilan: [6, 4, 3], etiketler: ["a", "b", "c"] },
  { id: "ucgenPrizma", ad: "Üçgen prizma", olcuAdlari: ["Üçgen ayrıtı a", "Prizma uzunluğu h"], varsayilan: [4, 6], etiketler: ["a", "h"] },
  { id: "silindir", ad: "Silindir", olcuAdlari: ["Yarıçap r", "Yükseklik h"], varsayilan: [2, 4], etiketler: ["r", "h"] },
  { id: "koni", ad: "Koni", olcuAdlari: ["Yarıçap r", "Yükseklik h"], varsayilan: [2, 4], etiketler: ["r", "h", ""] },
  { id: "piramit", ad: "Kare piramit", olcuAdlari: ["Taban ayrıtı a", "Yükseklik h"], varsayilan: [4, 4], etiketler: ["a", "h", ""] },
  { id: "kure", ad: "Küre", olcuAdlari: ["Yarıçap r"], varsayilan: [2], etiketler: ["r"] },
];

export function varsayilanKati(ek: Partial<KatiVerisi> = {}): KatiVerisi {
  const cisim = ek.cisim ?? "kup";
  const t = KATI_TURLERI.find((x) => x.id === cisim)!;
  return { tur: "kati", cisim, olcu: [...t.varsayilan], etiketler: [...t.etiketler], adlar: [...KATI_ADLARI[cisim]], koseAdlari: cisim !== "kup", gizliKesik: true, kosegen: "yok", ...ek };
}

function kesikli(ctx: CanvasRenderingContext2D, gizli: boolean, ciz: () => void) {
  ctx.save();
  if (gizli) { ctx.setLineDash([5, 4]); ctx.lineWidth = Math.max(0.9, ctx.lineWidth * 0.8); }
  ciz();
  ctx.restore();
}

/** Kenarın dışına (cismin merkezinden uzağa) ölçü etiketi. */
function disEtiket(ctx: CanvasRenderingContext2D, t: string, p: Nokta, q: Nokta, m: Nokta, uzak = 15) {
  const tt = t.trim();
  if (!tt) return;
  const o = ortaNokta(p, q);
  let nx = -(q.y - p.y), ny = q.x - p.x;
  const L = Math.hypot(nx, ny) || 1;
  if ((o.x - m.x) * nx + (o.y - m.y) * ny < 0) { nx = -nx; ny = -ny; }
  fizikMetniCiz(ctx, tt, o.x + (nx / L) * uzak, o.y + (ny / L) * uzak, 16);
}

function katiCiz(ctx: CanvasRenderingContext2D, v: KatiVerisi, k: Kutu) {
  const et = (i: number) => v.etiketler[i] ?? "";
  const cok = katiCokyuzlu(v);
  if (cok) {
    const ham = cok.koseler.map(izdusum);
    const { T } = sigdir(ham, k, 26);
    const P = ham.map(T);
    const m = { x: P.reduce((t, p) => t + p.x, 0) / P.length, y: P.reduce((t, p) => t + p.y, 0) / P.length };
    for (const a of cok.ayritlar) {
      if (a.gizli && !v.gizliKesik) continue;
      kesikli(ctx, a.gizli, () => dogru(ctx, P[a.i], P[a.j]));
    }
    if (v.cisim === "kup" || v.cisim === "prizma") {
      if (v.kosegen === "cisim") ince(ctx, 0.9, () => dogru(ctx, P[0], P[6]));
      if (v.kosegen === "yuzey") ince(ctx, 0.9, () => dogru(ctx, P[0], P[5]));
      disEtiket(ctx, et(0), P[0], P[1], m);
      // Yükseklik ön yüzün SOL ayrıtına (AE), ön yüzün merkezine göre dışarı.
      const onM = { x: (P[0].x + P[1].x + P[4].x + P[5].x) / 4, y: (P[0].y + P[1].y + P[4].y + P[5].y) / 4 };
      if (v.cisim === "prizma") { disEtiket(ctx, et(1), P[1], P[2], m); disEtiket(ctx, et(2), P[0], P[4], onM); }
    } else if (v.cisim === "ucgenPrizma") {
      disEtiket(ctx, et(0), P[0], P[1], m);
      disEtiket(ctx, et(1), P[1], P[4], m, 12);
    } else {
      // Piramit: tepe T'den taban merkezine yükseklik (cismin içinde → kesikli).
      const tabanM = T(izdusum({ x: v.olcu[0] / 2, y: 0, z: v.olcu[0] / 2 }));
      if (et(1).trim() || v.kosegen !== "yok") {
        kesikli(ctx, true, () => dogru(ctx, P[4], tabanM));
        dikAciIsaretiCiz(ctx, tabanM, P[4], P[1], 6);
        if (et(1).trim()) fizikMetniCiz(ctx, et(1).trim(), (P[4].x + tabanM.x) / 2 + 9, (P[4].y + tabanM.y) / 2, 15, "sol");
      }
      if (v.kosegen === "yuzey") kesikli(ctx, true, () => { dogru(ctx, P[0], P[2]); dogru(ctx, P[1], P[3]); });
      disEtiket(ctx, et(0), P[0], P[1], m);
      disEtiket(ctx, et(2), P[1], P[4], m, 13);
    }
    if (v.koseAdlari) P.forEach((p, i) => koseAdi(ctx, v.adlar[i] ?? "", p, m, 14));
    return;
  }
  // Dönel cisimler: taban elipsi (yukarıdan eğik bakış), arka yarı kesikli.
  const r = Math.max(0.1, v.olcu[0] ?? 2), h = v.cisim === "kure" ? 2 * r : Math.max(0.1, v.olcu[1] ?? 4);
  const e = 0.3;
  const ham = v.cisim === "kure" ? [{ x: -r, y: -r }, { x: r, y: r }] : [{ x: -r, y: -r * e }, { x: r, y: h + (v.cisim === "silindir" ? r * e : 0) }];
  const { T, olcek } = sigdir(ham, k, 26);
  const rx = r * olcek, ry = r * e * olcek;
  const elips = (merkez: Nokta, bas: number, son: number, gizli: boolean) => {
    if (gizli && !v.gizliKesik) return;
    kesikli(ctx, gizli, () => { ctx.beginPath(); ctx.ellipse(merkez.x, merkez.y, rx, ry, 0, bas, son); ctx.stroke(); });
  };
  const nok = (p: Nokta) => { ctx.beginPath(); ctx.arc(p.x, p.y, 2.2, 0, TAM); ctx.fill(); };
  if (v.cisim === "kure") {
    const O = T({ x: 0, y: 0 });
    ctx.beginPath(); ctx.arc(O.x, O.y, rx, 0, TAM); ctx.stroke();
    elips(O, 0, Math.PI, false);
    elips(O, Math.PI, TAM, true);
    nok(O);
    ince(ctx, 0.9, () => dogru(ctx, O, { x: O.x + rx, y: O.y }));
    if (et(0).trim()) fizikMetniCiz(ctx, et(0).trim(), O.x + rx / 2, O.y - 10, 16);
    if (v.koseAdlari && (v.adlar[0] ?? "").trim()) fizikMetniCiz(ctx, v.adlar[0].trim(), O.x - 10, O.y - 10, 16);
    return;
  }
  const O = T({ x: 0, y: 0 });
  const ust = T({ x: 0, y: h });
  // Tuvalde y aşağı: ellipse 0→π alt (ön) yarı.
  if (v.cisim === "silindir") {
    elips(O, 0, Math.PI, false);
    elips(O, Math.PI, TAM, true);
    elips(ust, 0, TAM, false);
    dogru(ctx, { x: O.x - rx, y: O.y }, { x: ust.x - rx, y: ust.y });
    dogru(ctx, { x: O.x + rx, y: O.y }, { x: ust.x + rx, y: ust.y });
    nok(ust); nok(O);
    ince(ctx, 0.9, () => dogru(ctx, ust, { x: ust.x + rx, y: ust.y }));
    if (et(0).trim()) fizikMetniCiz(ctx, et(0).trim(), ust.x + rx / 2, ust.y - 10, 16);
    kesikli(ctx, true, () => dogru(ctx, O, ust));
    if (et(1).trim()) fizikMetniCiz(ctx, et(1).trim(), O.x + rx + 12, (O.y + ust.y) / 2, 16, "sol");
    if (v.koseAdlari) { koseAdi(ctx, v.adlar[0] ?? "", O, { x: O.x + 1, y: O.y - 1 }, 12); koseAdi(ctx, v.adlar[1] ?? "", ust, { x: ust.x + 1, y: ust.y + 1 }, 12); }
    return;
  }
  // Koni: tepeden taban elipsine teğet doğrular; görünen taban yayı teğet noktaları arasındaki ön yay.
  const H = O.y - ust.y;
  const yt = Math.min(ry * 0.999, (ry * ry) / Math.max(1e-6, H));
  const xt = rx * Math.sqrt(Math.max(0, 1 - (yt * yt) / (ry * ry)));
  const tSag = Math.atan2(-yt / ry, xt / rx), tSol = Math.PI - tSag;
  elips(O, tSag, tSol, false);
  elips(O, tSol, tSag + TAM, true);
  dogru(ctx, ust, { x: O.x + xt, y: O.y - yt });
  dogru(ctx, ust, { x: O.x - xt, y: O.y - yt });
  nok(O); nok(ust);
  // Taban (alt yüz) görünmez: yükseklik ve yarıçap kesikli.
  kesikli(ctx, true, () => { dogru(ctx, O, ust); dogru(ctx, O, { x: O.x + rx, y: O.y }); });
  dikAciIsaretiCiz(ctx, O, ust, { x: O.x + rx, y: O.y }, 6);
  if (et(0).trim()) fizikMetniCiz(ctx, et(0).trim(), O.x + rx / 2, O.y + 12, 16);
  if (et(1).trim()) fizikMetniCiz(ctx, et(1).trim(), O.x - 9, (O.y + ust.y) / 2, 16, "sag");
  if (et(2).trim()) fizikMetniCiz(ctx, et(2).trim(), (ust.x + O.x + xt) / 2 + 12, (ust.y + O.y - yt) / 2, 16, "sol");
  if (v.koseAdlari) { koseAdi(ctx, v.adlar[0] ?? "", O, { x: O.x + 1, y: O.y - 1 }, 13); koseAdi(ctx, v.adlar[1] ?? "", ust, { x: ust.x, y: ust.y + 1 }, 14); }
}

// ════════════════════════════════════════════════════════════════════════════
// Kağıt katlama (doğrulanmış başvuru uygulamasından TypeScript'e taşındı)
// ════════════════════════════════════════════════════════════════════════════

export type KagitKosesi = { ad: string; x: number; y: number };
export type KatNoktasi = { x: number; y: number; ad?: string | null };
export type KatlamaDogrusu = { p: Nokta; d: Nokta; hareketli: KagitKosesi | undefined; hedefAd: string | null; hedefNokta: Nokta | null; merkez: Nokta };

/** Kağıdın köşeleri (y yukarı). Dikdörtgen/kare: A sol-alt, B sağ-alt, C sağ-üst, D sol-üst. Dik üçgen: B'de dik, A üstte. */
export function kagitKoseleri(k: KatlamaKagidi): KagitKosesi[] {
  if (k.tur === "serbest" && k.serbestKoseler && k.serbestKoseler.length >= 3) return k.serbestKoseler.map((n) => ({ ad: n.ad, x: n.x, y: n.y }));
  if (k.tur === "dikucgen") return [{ ad: "A", x: 0, y: k.q }, { ad: "B", x: 0, y: 0 }, { ad: "C", x: k.p, y: 0 }];
  const w = k.tur === "kare" ? k.a : k.w, h = k.tur === "kare" ? k.a : k.h;
  if (k.tur === "serbest") return [{ ad: "A", x: 0, y: 0 }, { ad: "B", x: w, y: 0 }, { ad: "C", x: w, y: h }, { ad: "D", x: 0, y: h }];
  return [{ ad: "A", x: 0, y: 0 }, { ad: "B", x: w, y: 0 }, { ad: "C", x: w, y: h }, { ad: "D", x: 0, y: h }];
}

export function kagitKenarlari(koseler: KagitKosesi[]) {
  return koseler.map((p, i) => {
    const q = koseler[(i + 1) % koseler.length];
    return { ad: p.ad + q.ad, p, q, uz: Math.hypot(q.x - p.x, q.y - p.y) };
  });
}

/** Doğrunun (p→q) iki yanından DAHA KÜÇÜK olanın doğrudan en uzak köşesi (katlanacak köşe). */
export function kucukTarafKosesi(koseler: KagitKosesi[], p: Nokta, q: Nokta): KagitKosesi | undefined {
  const dx = q.x - p.x, dy = q.y - p.y, l = Math.hypot(dx, dy) || 1;
  const d = (a: Nokta) => (dx * (a.y - p.y) - dy * (a.x - p.x)) / l;
  let poz = 0, neg = 0;
  koseler.forEach((n) => { const v = d(n); if (v > 1e-9) poz += v; else if (v < -1e-9) neg -= v; });
  const isaret = poz <= neg ? 1 : -1;
  let enIyi: KagitKosesi | undefined, enD = 1e-9;
  koseler.forEach((n) => { const v = isaret * d(n); if (v > enD) { enD = v; enIyi = n; } });
  return enIyi ?? koseler[0];
}

/** Sonsuz doğrunun (a–b) çokgenin sınırını kestiği en uzak iki nokta; kesmiyorsa null. */
export function dogruyuKagidaKirp(koseler: KagitKosesi[], a: Nokta, b: Nokta): [Nokta, Nokta] | null {
  const dx = b.x - a.x, dy = b.y - a.y, l = Math.hypot(dx, dy);
  if (l < 1e-9) return null;
  const noktalar: { t: number; p: Nokta }[] = [];
  koseler.forEach((P, i) => {
    const Q = koseler[(i + 1) % koseler.length];
    const ex = Q.x - P.x, ey = Q.y - P.y;
    const den = dx * ey - dy * ex;
    if (Math.abs(den) < 1e-12) return;
    const t = ((P.x - a.x) * ey - (P.y - a.y) * ex) / den;
    const u = ((P.x - a.x) * dy - (P.y - a.y) * dx) / den;
    if (u < -1e-9 || u > 1 + 1e-9) return;
    const uc = Math.max(0, Math.min(1, u));
    const nk = { x: P.x + ex * uc, y: P.y + ey * uc };
    noktalar.push({ t, p: nk });
  });
  if (noktalar.length < 2) return null;
  noktalar.sort((m, n) => m.t - n.t);
  const ilk = noktalar[0], son = noktalar[noktalar.length - 1];
  if (Math.hypot(ilk.p.x - son.p.x, ilk.p.y - son.p.y) < 1e-6) return null;
  return [ilk.p, son.p];
}

/** Noktanın çokgen sınırındaki en yakın izdüşümü: nokta, kenar adı ve kenar üzerindeki oran. */
export function sinirdaEnYakin(koseler: KagitKosesi[], n: Nokta): { nokta: Nokta; kenar: string; oran: number; uzaklik: number } {
  let en = { nokta: { x: koseler[0].x, y: koseler[0].y }, kenar: koseler[0].ad + koseler[1 % koseler.length].ad, oran: 0, uzaklik: Infinity };
  koseler.forEach((P, i) => {
    const Q = koseler[(i + 1) % koseler.length];
    const ex = Q.x - P.x, ey = Q.y - P.y;
    const t = Math.max(0, Math.min(1, ((n.x - P.x) * ex + (n.y - P.y) * ey) / (ex * ex + ey * ey || 1)));
    const m = { x: P.x + ex * t, y: P.y + ey * t };
    const u = Math.hypot(n.x - m.x, n.y - m.y);
    if (u < en.uzaklik) en = { nokta: m, kenar: P.ad + Q.ad, oran: t, uzaklik: u };
  });
  return en;
}

/** Katlama doğrusu: p noktası, d birim yönü; `getir`de hedef noktası. */
export function katlamaDogrusu(kt: KatlamaAdimi, koseler: KagitKosesi[]): KatlamaDogrusu {
  const bul = (ad: string) => koseler.find((v) => v.ad === ad);
  const merkez = { x: koseler.reduce((t, v) => t + v.x, 0) / koseler.length, y: koseler.reduce((t, v) => t + v.y, 0) / koseler.length };
  let p: Nokta, q: Nokta;
  let hareketli = bul(kt.hareketli);
  let hedefAd: string | null = null, hedefNokta: Nokta | null = null;
  if (kt.mod === "iki") {
    p = bul(kt.k1) ?? koseler[0]; q = bul(kt.k2) ?? koseler[2 % koseler.length];
  } else if (kt.mod === "nokta") {
    p = bul(kt.kose) ?? koseler[0];
    const e = kagitKenarlari(koseler).find((x) => x.ad === kt.kenar) ?? kagitKenarlari(koseler)[1];
    const t = Math.max(0.02, Math.min(0.98, kt.uz / e.uz));
    q = { x: e.p.x + (e.q.x - e.p.x) * t, y: e.p.y + (e.q.y - e.p.y) * t };
  } else if (kt.mod === "ikiKenar") {
    const ke = kagitKenarlari(koseler);
    const e1 = ke.find((x) => x.ad === kt.kenar1) ?? ke[0];
    const e2 = ke.find((x) => x.ad === kt.kenar2 && x.ad !== e1.ad) ?? ke[(ke.indexOf(e1) + 1) % ke.length];
    const nk = (e: (typeof ke)[number], o: number | undefined): Nokta => {
      const t = Math.max(0.02, Math.min(0.98, o ?? 0.5));
      return { x: e.p.x + (e.q.x - e.p.x) * t, y: e.p.y + (e.q.y - e.p.y) * t };
    };
    p = nk(e1, kt.oran1); q = nk(e2, kt.oran2);
  } else if (kt.mod === "serbestCizgi") {
    p = kt.uc1 ?? { x: (koseler[0].x + koseler[1].x) / 2, y: (koseler[0].y + koseler[1].y) / 2 };
    q = kt.uc2 ?? { x: (koseler[1].x + koseler[2 % koseler.length].x) / 2, y: (koseler[1].y + koseler[2 % koseler.length].y) / 2 };
    if (!hareketli) hareketli = kucukTarafKosesi(koseler, p, q);
  } else {
    const V = bul(kt.hareketli) ?? koseler[0];
    hedefAd = kt.hedefXY ? null : kt.hedef;
    hedefNokta = kt.hedefXY ? { x: kt.hedefXY.x, y: kt.hedefXY.y } : kt.hedef === "O" ? merkez : bul(kt.hedef) ?? merkez;
    const m = { x: (V.x + hedefNokta.x) / 2, y: (V.y + hedefNokta.y) / 2 };
    const n = { x: hedefNokta.x - V.x, y: hedefNokta.y - V.y };
    p = m; q = { x: m.x - n.y, y: m.y + n.x };
    hareketli = V;
  }
  const dx = q.x - p.x, dy = q.y - p.y, l = Math.hypot(dx, dy) || 1;
  return { p: { x: p.x, y: p.y }, d: { x: dx / l, y: dy / l }, hareketli, hedefAd, hedefNokta, merkez };
}

/** Katlama ayarlarını kağıda uydurur (geçersiz köşe/kenar adı, sınır dışı uzunluk). */
export function katDuzelt(kt: KatlamaAdimi, koseler: KagitKosesi[]): KatlamaAdimi {
  const ad = koseler.map((v) => v.ad);
  const ilk = (liste: string[], v: string) => (liste.includes(v) ? v : liste[0]);
  const k = { ...kt };
  k.k1 = ilk(ad, k.k1);
  k.k2 = ilk(ad.filter((a) => a !== k.k1), k.k2);
  k.kose = ilk(ad, k.kose);
  const kenarlar = kagitKenarlari(koseler).filter((e) => !e.ad.includes(k.kose));
  k.kenar = ilk(kenarlar.map((e) => e.ad), k.kenar);
  const e = kenarlar.find((x) => x.ad === k.kenar)!;
  const enCok = Math.max(1, Math.round(e.uz) - 1);
  k.uz = Math.max(1, Math.min(enCok, k.uz || Math.round(e.uz / 2)));
  const sinirla = (n: number, a: number, b: number) => Math.max(a, Math.min(b, n));
  if (k.mod === "iki") k.hareketli = ilk(ad.filter((a) => a !== k.k1 && a !== k.k2), k.hareketli);
  else if (k.mod === "nokta") k.hareketli = ilk(ad.filter((a) => a !== k.kose), k.hareketli);
  else if (k.mod === "ikiKenar") {
    const tum = kagitKenarlari(koseler).map((e) => e.ad);
    k.kenar1 = ilk(tum, k.kenar1 ?? "");
    const i1 = tum.indexOf(k.kenar1);
    k.kenar2 = k.kenar2 && k.kenar2 !== k.kenar1 && tum.includes(k.kenar2) ? k.kenar2 : tum[(i1 + 1) % tum.length];
    k.oran1 = sinirla(k.oran1 ?? 0.5, 0.05, 0.95);
    k.oran2 = sinirla(k.oran2 ?? 0.5, 0.05, 0.95);
    const ortak = ad.find((a) => k.kenar1!.includes(a) && k.kenar2!.includes(a));
    k.hareketli = ad.includes(k.hareketli) ? k.hareketli : ortak ?? ad[0];
  } else if (k.mod === "serbestCizgi") {
    const fin = (n?: Nokta) => !!n && Number.isFinite(n.x) && Number.isFinite(n.y);
    if (!fin(k.uc1) || !fin(k.uc2) || Math.hypot(k.uc1!.x - k.uc2!.x, k.uc1!.y - k.uc2!.y) < 1e-6) {
      const b = (i: number) => koseler[i % koseler.length];
      k.uc1 = { x: (b(0).x + b(1).x) / 2, y: (b(0).y + b(1).y) / 2 };
      k.uc2 = { x: (b(1).x + b(2).x) / 2, y: (b(1).y + b(2).y) / 2 };
    }
    k.hareketli = ad.includes(k.hareketli) ? k.hareketli : "";
  } else k.hareketli = ilk(ad, k.hareketli);
  k.hedef = ilk(["O", ...ad.filter((a) => a !== k.hareketli)], k.hedef);
  if (k.mod !== "getir") delete k.hedefXY;
  return k;
}

/**
 * Katlama sonucu: sabit kalan parça, katlanan (yansıtılmış) parçalar, katlama çizgileri,
 * katlanan kenarın kağıt kenarını kestiği yeni noktalar ve ad listesi (B′, E, F…).
 */
export function katlamaHesapla(v: { kagit: KatlamaKagidi; katlar: KatlamaAdimi[] }) {
  const EPS = 1e-7;
  const koseler = kagitKoseleri(v.kagit);
  const yan = (L: KatlamaDogrusu, a: Nokta) => L.d.x * (a.y - L.p.y) - L.d.y * (a.x - L.p.x);
  const yansit = (L: KatlamaDogrusu, a: Nokta): Nokta => {
    const vx = a.x - L.p.x, vy = a.y - L.p.y, t = vx * L.d.x + vy * L.d.y;
    return { x: 2 * (L.p.x + L.d.x * t) - a.x, y: 2 * (L.p.y + L.d.y * t) - a.y };
  };
  const kirp = (poly: KatNoktasi[], L: KatlamaDogrusu, isaret: number): KatNoktasi[] => {
    const cik: KatNoktasi[] = [];
    for (let i = 0; i < poly.length; i += 1) {
      const P = poly[i], Q = poly[(i + 1) % poly.length];
      const sp = isaret * yan(L, P), sq = isaret * yan(L, Q);
      if (sp >= -EPS) cik.push(P);
      if ((sp > EPS && sq < -EPS) || (sp < -EPS && sq > EPS)) {
        const t = sp / (sp - sq);
        cik.push({ x: P.x + t * (Q.x - P.x), y: P.y + t * (Q.y - P.y), ad: null });
      }
    }
    return cik.filter((n, i) => { const w = cik[(i + 1) % cik.length]; return cik.length < 2 || Math.hypot(n.x - w.x, n.y - w.y) > 1e-6; });
  };
  const adlar: KagitKosesi[] = koseler.map((n) => ({ x: n.x, y: n.y, ad: n.ad }));
  const harfSirasi = "DEFGHKLMNPRST".split("");
  const adBul = (pt: Nokta) => adlar.find((a) => Math.hypot(a.x - pt.x, a.y - pt.y) < 1e-6)?.ad ?? null;
  const adVer = (pt: Nokta) => {
    const var_ = adBul(pt);
    if (var_) return var_;
    const ad = harfSirasi.find((h) => !adlar.some((a) => a.ad === h)) ?? "?";
    adlar.push({ x: pt.x, y: pt.y, ad });
    return ad;
  };
  const katlar = v.katlar.slice(0, 2);
  const dogrular = katlar.map((kt) => katlamaDogrusu(kt, koseler));
  const merkez = dogrular.length ? dogrular[0].merkez : { x: 0, y: 0 };
  if (katlar.some((kt) => kt.mod === "getir" && kt.hedef === "O")) adlar.push({ x: merkez.x, y: merkez.y, ad: "O" });

  const katlamaCizgileri = dogrular.map((L) => {
    const ki = [...kirp(koseler, L, 1), ...kirp(koseler, L, -1)].filter((n) => Math.abs(yan(L, n)) < 1e-6);
    const tekil: KatNoktasi[] = [];
    ki.forEach((n) => { if (!tekil.some((w) => Math.hypot(w.x - n.x, w.y - n.y) < 1e-6)) tekil.push(n); });
    tekil.forEach((n) => adVer(n));
    return tekil.slice(0, 2);
  });

  const isaretler = dogrular.map((L) => (L.hareketli && yan(L, L.hareketli) >= 0 ? 1 : -1));
  let sabit: KatNoktasi[] = koseler.slice();
  dogrular.forEach((L, i) => { sabit = kirp(sabit, L, -isaretler[i]); });
  const hareketliParcalar = dogrular.map((L, i) => kirp(koseler, L, isaretler[i]));
  const katlananlar = hareketliParcalar.map((parca, i) => {
    const L = dogrular[i];
    return parca.map((n) => {
      if (Math.abs(yan(L, n)) < 1e-6) return { x: n.x, y: n.y, ad: adVer(n) };
      const r = yansit(L, n);
      const kaynak = adBul(n);
      if (L.hedefNokta && L.hedefAd && Math.hypot(r.x - L.hedefNokta.x, r.y - L.hedefNokta.y) < 1e-6) return { x: r.x, y: r.y, ad: L.hedefAd };
      const var_ = adBul(r);
      return { x: r.x, y: r.y, ad: var_ || (kaynak ? `${kaynak}′` : "") };
    });
  });
  const kesisim = (a: Nokta, b: Nokta, c: Nokta, d: Nokta): Nokta | null => {
    const r = { x: b.x - a.x, y: b.y - a.y }, q = { x: d.x - c.x, y: d.y - c.y };
    const den = r.x * q.y - r.y * q.x;
    if (Math.abs(den) < 1e-12) return null;
    const t = ((c.x - a.x) * q.y - (c.y - a.y) * q.x) / den, u = ((c.x - a.x) * r.y - (c.y - a.y) * r.x) / den;
    if (t <= 1e-6 || t >= 1 - 1e-6 || u <= 1e-6 || u >= 1 - 1e-6) return null;
    return { x: a.x + t * r.x, y: a.y + t * r.y };
  };
  const yeniNoktalar: KagitKosesi[] = [];
  katlananlar.forEach((poly) => poly.forEach((a, i) => {
    const b = poly[(i + 1) % poly.length];
    sabit.forEach((c, j) => {
      const d = sabit[(j + 1) % sabit.length];
      const kk = kesisim(a, b, c, d);
      if (kk && !yeniNoktalar.some((w) => Math.hypot(w.x - kk.x, w.y - kk.y) < 1e-6)) yeniNoktalar.push({ x: kk.x, y: kk.y, ad: adVer(kk) });
    });
  }));
  return { koseler, dogrular, katlamaCizgileri, sabit, hareketliParcalar, katlananlar, yeniNoktalar, adlar, merkez };
}

const KAT_DOLGU = { mavi: "#cdeefb", gri: "#d9dee5" } as const;

function taraliDoldur(ctx: CanvasRenderingContext2D, poly: Nokta[]) {
  const xs = poly.map((p) => p.x), ys = poly.map((p) => p.y);
  const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
  ctx.save();
  ctx.beginPath(); poly.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y))); ctx.closePath();
  ctx.clip();
  ctx.lineWidth = 0.9;
  ctx.beginPath();
  for (let c = x0 - (y1 - y0); c <= x1; c += 7) { ctx.moveTo(c, y1); ctx.lineTo(c + (y1 - y0), y0); }
  ctx.stroke();
  ctx.restore();
}

const yaklasik = (a: Nokta, b: Nokta) => Math.hypot(a.x - b.x, a.y - b.y) < 1e-6;
const sayiYaz = (n: number) => (Number.isInteger(n) ? String(n) : String(Math.round(n * 100) / 100).replace(".", ","));

/** Katlama çiziminin yerleşimi: kutular, ölçek ve kağıt→tuval dönüşümleri (çizim ve sürükleme ortak kullanır). */
export function katlamaYerlesimi(v: KatlamaVerisi, k: Kutu) {
  const K = katlamaHesapla(v);
  const iki = v.sekil1;
  const baslikPay = v.baslik ? 22 : 0;
  const kutular: Kutu[] = iki
    ? [{ x: k.x, y: k.y, w: k.w * 0.44, h: k.h - baslikPay }, { x: k.x + k.w * 0.56, y: k.y, w: k.w * 0.44, h: k.h - baslikPay }]
    : [{ x: k.x, y: k.y, w: k.w, h: k.h - baslikPay }];
  const ikinciNoktalar: Nokta[] = [...K.sabit, ...K.katlananlar.flat(), ...K.koseler];
  if (v.yer && !iki) {
    const { olc, ox, oy } = v.yer;
    const T = (p: Nokta): Nokta => ({ x: k.x + ox + p.x * olc, y: k.y + oy - p.y * olc });
    const Tt = (q: Nokta): Nokta => ({ x: (q.x - k.x - ox) / olc, y: -(q.y - k.y - oy) / olc });
    return { K, iki, kutular, ikinciNoktalar, olc, T1: T, T2: T, T1ters: Tt, T2ters: Tt };
  }
  const bbox = (pts: Nokta[]) => ({ x0: Math.min(...pts.map((p) => p.x)), x1: Math.max(...pts.map((p) => p.x)), y0: Math.min(...pts.map((p) => p.y)), y1: Math.max(...pts.map((p) => p.y)) });
  const b1 = bbox(K.koseler), b2 = bbox(ikinciNoktalar);
  const PAY = 24;
  const olcK = Math.min(...(iki ? [[b1, kutular[0]], [b2, kutular[1]]] as const : [[b2, kutular[0]]] as const).map(([b, kt]) =>
    Math.min((kt.w - 2 * PAY) / Math.max(b.x1 - b.x0, 1e-6), (kt.h - 2 * PAY) / Math.max(b.y1 - b.y0, 1e-6))));
  const olc = Math.max(0.01, olcK);
  const donustur = (kt: Kutu, b: ReturnType<typeof bbox>) => (p: Nokta): Nokta => ({ x: kt.x + kt.w / 2 + (p.x - (b.x0 + b.x1) / 2) * olc, y: kt.y + kt.h / 2 - (p.y - (b.y0 + b.y1) / 2) * olc });
  const tersle = (kt: Kutu, b: ReturnType<typeof bbox>) => (q: Nokta): Nokta => ({ x: (q.x - kt.x - kt.w / 2) / olc + (b.x0 + b.x1) / 2, y: -(q.y - kt.y - kt.h / 2) / olc + (b.y0 + b.y1) / 2 });
  const T1 = donustur(kutular[0], b1), T2 = donustur(kutular[iki ? 1 : 0], b2);
  const T1ters = tersle(kutular[0], b1), T2ters = tersle(kutular[iki ? 1 : 0], b2);
  return { K, iki, kutular, ikinciNoktalar, olc, T1, T2, T1ters, T2ters };
}

/** Doğruya (p, birim yön d) göre yansıma. */
export function katlamaYansit(L: { p: Nokta; d: Nokta }, a: Nokta): Nokta {
  const t = (a.x - L.p.x) * L.d.x + (a.y - L.p.y) * L.d.y;
  return { x: 2 * (L.p.x + L.d.x * t) - a.x, y: 2 * (L.p.y + L.d.y * t) - a.y };
}

/** Kağıt katlama çizimi: (isteğe bağlı) Şekil I → Şekil II yan yana. */
function katlamaCiz(ctx: CanvasRenderingContext2D, v: KatlamaVerisi, k: Kutu) {
  const { K, iki, kutular, ikinciNoktalar, T1, T2 } = katlamaYerlesimi(v, k);
  const yol = (pts: Nokta[], T: (p: Nokta) => Nokta, kapali = true) => {
    ctx.beginPath(); pts.forEach((p, i) => { const q = T(p); if (i) ctx.lineTo(q.x, q.y); else ctx.moveTo(q.x, q.y); });
    if (kapali) ctx.closePath();
  };
  const ortala = (pts: Nokta[]) => ({ x: pts.reduce((t, p) => t + p.x, 0) / pts.length, y: pts.reduce((t, p) => t + p.y, 0) / pts.length });
  const etiketKoy = (pt: Nokta, ad: string, T: (p: Nokta) => Nokta, mrk: Nokta) => {
    const P = T(pt), M = T(mrk);
    const dx = P.x - M.x, dy = P.y - M.y, l = Math.hypot(dx, dy) || 1;
    fizikMetniCiz(ctx, ad, P.x + (dx / l) * 14, P.y + (dy / l) * 14, 16);
  };
  const nok = (P: Nokta) => { ctx.beginPath(); ctx.arc(P.x, P.y, 2.4, 0, TAM); ctx.fill(); };
  const m1 = ortala(K.koseler);
  if (iki) {
    ctx.save(); ctx.fillStyle = "#ffffff"; yol(K.koseler, T1); ctx.fill(); ctx.restore();
    yol(K.koseler, T1); ctx.stroke();
    K.katlamaCizgileri.forEach((c) => { if (c.length === 2) ince(ctx, 0.75, () => { ctx.save(); ctx.setLineDash([6, 5]); yol(c, T1, false); ctx.stroke(); ctx.restore(); }); });
    const gorunen = K.adlar.filter((a) => K.koseler.some((n) => n.ad === a.ad) || K.katlamaCizgileri.some((c) => c.some((n) => yaklasik(n, a))) || a.ad === "O");
    gorunen.forEach((a) => {
      if (a.ad === "O") { const P = T1(a); nok(P); fizikMetniCiz(ctx, "O", P.x, P.y - 11, 16); }
      else etiketKoy(a, a.ad, T1, m1);
    });
    if (v.olcu) {
      kagitKenarlari(K.koseler).forEach((e) => {
        if (Math.abs(e.uz - Math.round(e.uz)) > 1e-6) return;
        if ((v.kagit.tur === "dikdortgen" || v.kagit.tur === "kare") && (e.ad === "CD" || e.ad === "DA")) return;
        if (v.kagit.tur === "kare" && e.ad !== "AB") return;
        const P = T1(ortaNokta(e.p, e.q)), M = T1(m1);
        const dx = P.x - M.x, dy = P.y - M.y, l = Math.hypot(dx, dy) || 1;
        fizikMetniCiz(ctx, sayiYaz(Math.round(e.uz)), P.x + (dx / l) * 15, P.y + (dy / l) * 15, 14);
      });
    }
    if (v.kagit.tur === "dikucgen") dikAciIsaretiCiz(ctx, T1(K.koseler[1]), T1(K.koseler[0]), T1(K.koseler[2]), 9);
    if (v.ok) {
      K.hareketliParcalar.forEach((parca, i) => {
        if (!parca.length) return;
        const L = K.dogrular[i];
        const a = ortala(parca);
        const t = (a.x - L.p.x) * L.d.x + (a.y - L.p.y) * L.d.y;
        const ayak = { x: L.p.x + L.d.x * t, y: L.p.y + L.d.y * t };
        const S = T1({ x: a.x + (ayak.x - a.x) * 0.25, y: a.y + (ayak.y - a.y) * 0.25 });
        const E = T1({ x: ayak.x + (ayak.x - a.x) * 0.55, y: ayak.y + (ayak.y - a.y) * 0.55 });
        const Ay = T1(ayak), nx = -(E.y - S.y), ny = E.x - S.x, nl = Math.hypot(nx, ny) || 1;
        const C = { x: Ay.x + (nx / nl) * 22, y: Ay.y + (ny / nl) * 22 };
        ince(ctx, 0.8, () => {
          ctx.beginPath(); ctx.moveTo(S.x, S.y); ctx.quadraticCurveTo(C.x, C.y, E.x, E.y); ctx.stroke();
          okUcu(ctx, E, Math.atan2(E.y - C.y, E.x - C.x));
        });
      });
    }
    // Şekil I → Şekil II oku
    const oy = kutular[0].y + kutular[0].h / 2, ox0 = k.x + k.w * 0.465, ox1 = k.x + k.w * 0.535;
    ince(ctx, 0.85, () => { dogru(ctx, { x: ox0, y: oy }, { x: ox1, y: oy }); okUcu(ctx, { x: ox1, y: oy }, 0); });
    if (v.baslik) fizikMetniCiz(ctx, "Şekil I", kutular[0].x + kutular[0].w / 2, k.y + k.h - 9, 15);
  }
  const m2 = ortala(ikinciNoktalar);
  if (v.eski) K.hareketliParcalar.forEach((parca) => {
    if (!parca.length) return;
    ctx.save(); ctx.setLineDash([5, 5]); ctx.lineWidth = Math.max(0.9, ctx.lineWidth * 0.7); ctx.strokeStyle = "#6b7280"; yol(parca, T2); ctx.stroke(); ctx.restore();
  });
  ctx.save(); ctx.fillStyle = "#ffffff"; yol(K.sabit, T2); ctx.fill(); ctx.restore();
  yol(K.sabit, T2); ctx.stroke();
  K.katlananlar.forEach((poly) => {
    if (!poly.length) return;
    if (v.dolgu === "tarali") { ctx.save(); ctx.fillStyle = "#ffffff"; yol(poly, T2); ctx.fill(); ctx.restore(); taraliDoldur(ctx, poly.map(T2)); }
    else { ctx.save(); ctx.fillStyle = KAT_DOLGU[v.dolgu]; yol(poly, T2); ctx.fill(); ctx.restore(); }
    yol(poly, T2); ctx.stroke();
  });
  const etiketli: KatNoktasi[] = [];
  const ekle = (n: KatNoktasi) => { if (!n.ad || etiketli.some((w) => yaklasik(w, n))) return; etiketli.push(n); };
  K.sabit.forEach((n) => ekle({ x: n.x, y: n.y, ad: K.adlar.find((a) => yaklasik(a, n))?.ad }));
  K.katlananlar.forEach((poly) => poly.forEach(ekle));
  K.yeniNoktalar.forEach(ekle);
  // Tek şekilde "eski konum" kesikli çiziliyorsa katlanan köşenin ESKİ yerini de adıyla göster (A ve A′).
  if (v.eski && !iki) K.dogrular.forEach((L) => { if (L.hareketli) ekle({ x: L.hareketli.x, y: L.hareketli.y, ad: L.hareketli.ad }); });
  etiketli.forEach((n) => {
    if (n.ad === "O") { const P = T2(n); nok(P); fizikMetniCiz(ctx, "O", P.x, P.y - 11, 16); }
    else etiketKoy(n, n.ad ?? "", T2, m2);
  });
  K.yeniNoktalar.forEach((n) => nok(T2(n)));
  if (v.eslikGoster) eslikIsaretleriCiz(ctx, K, T2);
  if (iki && v.baslik) fizikMetniCiz(ctx, "Şekil II", kutular[1].x + kutular[1].w / 2, k.y + k.h - 9, 15);
}

/**
 * Katlamanın doğurduğu eşlikler: katlanan köşe V ile yansıması V′ için |VP| = |V′P| (çentik) ve
 * ∠VPQ = ∠V′PQ (yay). Çizginin ilk ucunda tek, ikinci ucunda çift çentik/yay kullanılır.
 */
function eslikIsaretleriCiz(ctx: CanvasRenderingContext2D, K: ReturnType<typeof katlamaHesapla>, T: (p: Nokta) => Nokta) {
  K.dogrular.forEach((L, i) => {
    const uclar = K.katlamaCizgileri[i];
    if (!L.hareketli || uclar.length !== 2) return;
    const V = L.hareketli, Vy = katlamaYansit(L, V);
    uclar.forEach((P, j) => {
      const Ps = T(P), Os = T(uclar[1 - j]);
      [V, Vy].forEach((X) => {
        const Xs = T(X);
        const uz = Math.hypot(Xs.x - Ps.x, Xs.y - Ps.y);
        if (uz < 14) return;
        const ux = (Xs.x - Ps.x) / uz, uy = (Xs.y - Ps.y) / uz;
        const M = { x: (Xs.x + Ps.x) / 2, y: (Xs.y + Ps.y) / 2 };
        ince(ctx, 0.9, () => {
          for (let c = 0; c <= j; c += 1) {
            const o = (c - j / 2) * 4;
            ctx.beginPath();
            ctx.moveTo(M.x + ux * o - uy * 4.5, M.y + uy * o + ux * 4.5);
            ctx.lineTo(M.x + ux * o + uy * 4.5, M.y + uy * o - ux * 4.5);
            ctx.stroke();
          }
          const a1 = Math.atan2(Os.y - Ps.y, Os.x - Ps.x), a2 = Math.atan2(Xs.y - Ps.y, Xs.x - Ps.x);
          let d = a2 - a1;
          while (d > Math.PI) d -= 2 * Math.PI;
          while (d <= -Math.PI) d += 2 * Math.PI;
          if (Math.abs(d) < 0.05) return;
          for (let c = 0; c <= j; c += 1) {
            ctx.beginPath();
            ctx.arc(Ps.x, Ps.y, 15 + c * 4, a1, a1 + d, d < 0);
            ctx.stroke();
          }
        });
      });
    });
  });
}

function okUcu(ctx: CanvasRenderingContext2D, uc: Nokta, aci: number, boy = 9) {
  ctx.beginPath();
  ctx.moveTo(uc.x, uc.y);
  ctx.lineTo(uc.x - Math.cos(aci - 0.42) * boy, uc.y - Math.sin(aci - 0.42) * boy);
  ctx.lineTo(uc.x - Math.cos(aci + 0.42) * boy, uc.y - Math.sin(aci + 0.42) * boy);
  ctx.closePath();
  ctx.fill();
}

const KAGIT_ADLARI = "ABCDEFGHIJKL";

/** Köşe listesinden (y yukarı) serbest kâğıt. 3–12 köşe; adlar A, B, C… */
export function kagitSerbest(noktalar: Nokta[]): KatlamaKagidi {
  const n = noktalar.slice(0, 12);
  const yuvarla = (x: number) => Math.round(x * 1e6) / 1e6;
  const xs = n.map((q) => q.x), ys = n.map((q) => q.y);
  const w = Math.max(1, Math.min(60, Math.max(...xs) - Math.min(...xs))), h = Math.max(1, Math.min(60, Math.max(...ys) - Math.min(...ys)));
  return {
    tur: "serbest", w, h, a: Math.max(w, h), p: w, q: h,
    serbestKoseler: n.map((q, i) => ({ ad: KAGIT_ADLARI[i], x: yuvarla(q.x), y: yuvarla(q.y) })),
  };
}

/** Kenarları |BC| = a, |CA| = b, |AB| = c olan üçgen (A sol-alt, B sağda). Üçgen eşitsizliği sağlanmazsa null. */
export function kagitGenelUcgen(a: number, b: number, c: number): KatlamaKagidi | null {
  if (!(a > 0 && b > 0 && c > 0) || a + b <= c || a + c <= b || b + c <= a) return null;
  const x = (b * b + c * c - a * a) / (2 * c), y = Math.sqrt(Math.max(0, b * b - x * x));
  return kagitSerbest([{ x: 0, y: 0 }, { x: c, y: 0 }, { x, y }]);
}

/** Yamuk: alt taban |AB| = alt, üst taban |DC| = ust, yükseklik h; `kayma` üst tabanın soldan ofseti (yok = ikizkenar). */
export function kagitYamuk(alt: number, ust: number, h: number, kayma?: number): KatlamaKagidi {
  const o = kayma ?? (alt - ust) / 2;
  return kagitSerbest([{ x: 0, y: 0 }, { x: alt, y: 0 }, { x: o + ust, y: h }, { x: o, y: h }]);
}

/** Paralelkenar: |AB| = a, |AD| = b, A açısı derece. */
export function kagitParalelkenar(a: number, b: number, aciDerece: number): KatlamaKagidi {
  const r = (Math.max(10, Math.min(170, aciDerece)) * Math.PI) / 180;
  const dx = b * Math.cos(r), dy = b * Math.sin(r);
  return kagitSerbest([{ x: 0, y: 0 }, { x: a, y: 0 }, { x: a + dx, y: dy }, { x: dx, y: dy }]);
}

/** Düzgün n-gen (n = 3–12), çevrel çember yarıçapı R; A en alt-solda, saat yönünün tersine. */
export function kagitDuzgunCokgen(n: number, R: number): KatlamaKagidi {
  const m = Math.max(3, Math.min(12, Math.round(n)));
  return kagitSerbest(Array.from({ length: m }, (_, i) => {
    const t = -Math.PI / 2 - Math.PI / m + (2 * Math.PI * i) / m;
    return { x: R * Math.cos(t), y: R * Math.sin(t) };
  }));
}

export function varsayilanKatlama(ek: Partial<KatlamaVerisi> = {}): KatlamaVerisi {
  return {
    tur: "katlama", kagit: { tur: "dikdortgen", w: 16, h: 8, a: 10, p: 8, q: 6 },
    katlar: [{ mod: "iki", k1: "A", k2: "C", hareketli: "D", kose: "A", kenar: "BC", uz: 4, hedef: "O" }],
    sekil1: true, ok: true, olcu: true, eski: false, baslik: true, dolgu: "mavi", ...ek,
  };
}

// ════════════════════════════════════════════════════════════════════════════
// Dağıtıcı, doğrulama, dış pay
// ════════════════════════════════════════════════════════════════════════════

export type EkGeoVerisi = DogruAciVerisi | DortgenVerisi | KatiVerisi | KatlamaVerisi | CografyaVerisi;
export const ekGeoMu = (v: GeometriVerisi): v is EkGeoVerisi => v.tur === "dogruAci" || v.tur === "dortgen" || v.tur === "kati" || v.tur === "katlama" || v.tur === "cografya";

export function ekGeoCiz(ctx: CanvasRenderingContext2D, v: EkGeoVerisi, k: Kutu) {
  if (v.tur === "dogruAci") dogruAciCiz(ctx, v, k);
  else if (v.tur === "dortgen") dortgenCiz(ctx, v, k);
  else if (v.tur === "kati") katiCiz(ctx, v, k);
  else if (v.tur === "cografya") cografyaCiz(ctx, v, k);
  else katlamaCiz(ctx, v, k);
}

const sayi = (v: unknown) => typeof v === "number" && Number.isFinite(v);
const metinler = (v: unknown, en: number, uzun = 24) => Array.isArray(v) && v.length <= en && v.every((t) => typeof t === "string" && t.length <= uzun);
const sayilar = (v: unknown, en: number, sinir = 1e4) => Array.isArray(v) && v.length <= en && v.every((t) => sayi(t) && Math.abs(t as number) <= sinir);
const bool = (g: Record<string, unknown>, ...alanlar: string[]) => alanlar.every((a) => typeof g[a] === "boolean");
const kisaMetin = (t: unknown, en = 24) => typeof t === "string" && t.length <= en;
const ISARETLER = ["yok", "yay", "dik"];
const aralikTamsayi = (d: unknown, n: number) => Array.isArray(d) && d.length === n && d.every((x) => Number.isInteger(x) && x >= 0 && x <= 3);

export function ekGeoGecerliMi(g: Record<string, unknown>): boolean {
  if (g.tur === "dogruAci") {
    return ["kesen", "z", "u", "m", "kalemUcu", "zikzak"].includes(String(g.duzen)) && sayi(g.aci) && sayi(g.aci2) &&
      Math.abs(g.aci as number) <= 360 && Math.abs(g.aci2 as number) <= 360 &&
      metinler(g.etiketler, 8) && metinler(g.adlar, 6) && metinler(g.dogruAdlari, 2) && bool(g, "paralelOk", "olcuYaz");
  }
  if (g.tur === "dortgen") {
    const tipler = ["paralelkenar", "eskenar", "yamuk", "ikizkenarYamuk", "dikYamuk", "deltoid", "dikdortgen", "kare", "serbest"];
    const kose = g.kose === undefined || (Array.isArray(g.kose) && g.kose.length === 4 && g.kose.every((p) => !!p && sayi((p as Nokta).x) && sayi((p as Nokta).y) && Math.abs((p as Nokta).x) <= 10 && Math.abs((p as Nokta).y) <= 10));
    return tipler.includes(String(g.tip)) && sayilar(g.olcu, 4) && kose && (g.tip !== "serbest" || Array.isArray(g.kose)) &&
      metinler(g.adlar, 4) && metinler(g.kenarlar, 4) && metinler(g.acilar, 4) &&
      Array.isArray(g.aciIsareti) && g.aciIsareti.length === 4 && g.aciIsareti.every((t) => ISARETLER.includes(String(t))) &&
      aralikTamsayi(g.esKenar, 4) && aralikTamsayi(g.esAci, 4) && bool(g, "kosegen", "dikIsaret", "yukseklik") &&
      kisaMetin(g.kesisimAdi) && kisaMetin(g.yukseklikAdi) && kisaMetin(g.yukseklikEtiket);
  }
  if (g.tur === "kati") {
    return ["kup", "prizma", "ucgenPrizma", "silindir", "koni", "piramit", "kure"].includes(String(g.cisim)) && sayilar(g.olcu, 3, 1000) &&
      (g.olcu as number[]).length >= 1 && (g.olcu as number[]).every((n) => n > 0) &&
      metinler(g.etiketler, 3) && metinler(g.adlar, 8) && bool(g, "koseAdlari", "gizliKesik") && ["yok", "cisim", "yuzey"].includes(String(g.kosegen));
  }
  if (g.tur === "cografya") return cografyaGecerliMi(g);
  if (g.tur === "katlama") {
    const k = g.kagit as Record<string, unknown> | undefined;
    const nk = (t: unknown) => !!t && typeof t === "object" && sayi((t as Nokta).x) && sayi((t as Nokta).y) && Math.abs((t as Nokta).x) <= 1000 && Math.abs((t as Nokta).y) <= 1000;
    const serbestOk = !!k && (k.serbestKoseler === undefined ? k.tur !== "serbest" : Array.isArray(k.serbestKoseler) && k.serbestKoseler.length >= 3 && k.serbestKoseler.length <= 12 &&
      k.serbestKoseler.every((q) => !!q && typeof (q as KagitKosesi).ad === "string" && (q as KagitKosesi).ad.length >= 1 && (q as KagitKosesi).ad.length <= 2 && nk(q)));
    const kagitOk = !!k && typeof k === "object" && ["dikdortgen", "kare", "dikucgen", "serbest"].includes(String(k.tur)) &&
      ["w", "h", "a", "p", "q"].every((a) => sayi(k[a]) && (k[a] as number) >= 1 && (k[a] as number) <= 60) && serbestOk;
    const adOk = (t: unknown) => typeof t === "string" && t.length <= 2;
    const katOk = Array.isArray(g.katlar) && g.katlar.length <= 2 && g.katlar.every((kt) => {
      const x = kt as Record<string, unknown>;
      return !!x && ["iki", "nokta", "getir", "ikiKenar", "serbestCizgi"].includes(String(x.mod)) && ["k1", "k2", "hareketli", "kose", "kenar", "hedef"].every((a) => adOk(x[a])) &&
        sayi(x.uz) && (x.uz as number) >= 0 && (x.uz as number) <= 100 &&
        (x.kenar1 === undefined || adOk(x.kenar1)) && (x.kenar2 === undefined || adOk(x.kenar2)) &&
        (x.oran1 === undefined || (sayi(x.oran1) && (x.oran1 as number) >= 0 && (x.oran1 as number) <= 1)) &&
        (x.oran2 === undefined || (sayi(x.oran2) && (x.oran2 as number) >= 0 && (x.oran2 as number) <= 1)) &&
        (x.uc1 === undefined || nk(x.uc1)) && (x.uc2 === undefined || nk(x.uc2)) && (x.hedefXY === undefined || nk(x.hedefXY));
    });
    return kagitOk && katOk && bool(g, "sekil1", "ok", "olcu", "eski", "baslik") && (g.eslikGoster === undefined || typeof g.eslikGoster === "boolean") &&
      (g.yer === undefined || (!!g.yer && typeof g.yer === "object" && sayi((g.yer as Record<string, unknown>).olc) && (g.yer as { olc: number }).olc >= 0.01 && (g.yer as { olc: number }).olc <= 1000 &&
        sayilar([(g.yer as { ox: number }).ox, (g.yer as { oy: number }).oy], 2, 1e5))) && ["mavi", "gri", "tarali"].includes(String(g.dolgu));
  }
  return false;
}

/** Yazılar + kutu dışına taşan parçalar için dış pay (yerel, dönüşsüz). */
export function ekGeoYazilari(v: EkGeoVerisi): string[] {
  if (v.tur === "dogruAci") return [...v.etiketler, ...v.adlar, ...v.dogruAdlari, v.olcuYaz ? "179,9°" : ""];
  if (v.tur === "dortgen") return [...v.adlar, ...v.kenarlar, ...v.acilar, v.kesisimAdi, v.yukseklikAdi, v.yukseklikEtiket];
  if (v.tur === "kati") return [...v.etiketler, ...(v.koseAdlari ? v.adlar : [])];
  if (v.tur === "cografya") return cografyaYazilari(v);
  return ["A′", "Şekil II", "16"];
}

/**
 * Sabit yerleşimli (`yer`) katlama şeklinin kutusunu içeriğe (kâğıt + katlanan parçalar + yazı payı)
 * sığdırır. Kutunun MERKEZİ değişmez: döndürülmüş / aynalı şekilde de hiçbir nokta dünyada kaymaz.
 * `yer` yoksa ya da Şekil I yan yana açıksa şekli aynen döndürür.
 */
export function katlamaKutusunuSigdir<T extends { x: number; y: number; w: number; h: number; geo?: GeometriVerisi }>(s: T): T {
  const v = s.geo;
  if (!v || v.tur !== "katlama" || !v.yer || v.sekil1) return s;
  const Y = katlamaYerlesimi(v, { x: s.x, y: s.y, w: s.w, h: s.h });
  const pts = Y.ikinciNoktalar.map(Y.T2);
  if (!pts.length) return s;
  const PAY = 24;
  const cx = s.x + s.w / 2, cy = s.y + s.h / 2;
  const hx = Math.max(...pts.map((p) => Math.abs(p.x - cx))) + PAY, hy = Math.max(...pts.map((p) => Math.abs(p.y - cy))) + PAY;
  const w = Math.max(40, hx * 2), h = Math.max(40, hy * 2);
  if (Math.abs(w - s.w) < 0.01 && Math.abs(h - s.h) < 0.01) return s;
  const x = cx - w / 2, y = cy - h / 2;
  return { ...s, x, y, w, h, geo: { ...v, yer: { olc: v.yer.olc, ox: v.yer.ox + (s.x - x), oy: v.yer.oy + (s.y - y) } } };
}
