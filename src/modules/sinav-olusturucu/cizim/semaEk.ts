// Ek matematik şemaları: trigonometrik birim çember, eşitsizlik işaret tablosu,
// fonksiyon (küme eşleme) ok diyagramı.
//
// `sema.ts` gibi: tek şekil (kutu = çizim alanı), veriyle tanımlı, saf geometri.
// Matematik hesapları (birim çember değerleri, işaret tablosunun otomatik
// çıkarılması, çözüm kümesi, fonksiyon olma koşulu) ayrı saf fonksiyonlardır —
// testler bunları tuvalsiz doğrular.

import type { IsaretKoku, IsaretSatiri, SemaVerisi } from "./tipler";
import { MUREKKEP } from "./sabitler";
import { fizikMetniCiz } from "./fizik";
import { sayiYaz } from "./grafik";

type Kutu = { x: number; y: number; w: number; h: number };
type BirimCemberVerisi = Extract<SemaVerisi, { tur: "birimCember" }>;
type IsaretTablosuVerisi = Extract<SemaVerisi, { tur: "isaretTablosu" }>;
type FonksiyonSemaVerisi = Extract<SemaVerisi, { tur: "fonksiyonSema" }>;

export const EN_COK_KOK = 8;
export const EN_COK_ISARET_SATIRI = 6;
export const EN_COK_KOK_YAZISI = 20;
export const EN_COK_ELEMAN = 8;
export const EN_COK_ELEMAN_YAZISI = 20;
export const BIRIM_CEMBER_ACI_SINIRI = 720;
const EKSI = "−";

// ═══ Birim çember ══════════════════════════════════════════════════════════

export type TrigIsaret = "+" | "−" | "0" | "tanımsız";
export type BirimCemberDegerleri = {
  cos: number; sin: number;
  /** cos α = 0 iken null (tanımsız). */
  tan: number | null;
  /** sin α = 0 iken null (tanımsız). */
  cot: number | null;
  /** 1–4: bölge; null: açı bir eksen üstünde (0°, 90°, 180°, 270°). */
  bolge: 1 | 2 | 3 | 4 | null;
  isaret: { sin: TrigIsaret; cos: TrigIsaret; tan: TrigIsaret; cot: TrigIsaret };
  /** Özel açılarda (30° ve 45° katları) tam değer yazısı, değilse 4 basamaklı ondalık. */
  yazi: { sin: string; cos: string; tan: string; cot: string };
};

/** Açıyı [0, 360) aralığına indirger. */
export const aciIndirge = (a: number) => (((a % 360) + 360) % 360 + 360) % 360;

const SIN_TAM: Record<number, string> = { 0: "0", 30: "1/2", 45: "√2/2", 60: "√3/2", 90: "1" };
const TAN_TAM: Record<number, string> = { 0: "0", 30: "√3/3", 45: "1", 60: "√3" };

/** P(cos α, sin α), tan α, cot α ve açının bölgesine göre işaretler. */
export function birimCemberDegerleri(aciDerece: number): BirimCemberDegerleri {
  const a = aciIndirge(aciDerece);
  const r = (a * Math.PI) / 180;
  const yuvarla = (v: number) => (Math.abs(v) < 1e-12 ? 0 : v);
  const cos = yuvarla(Math.cos(r));
  const sin = yuvarla(Math.sin(r));
  const tan = cos === 0 ? null : yuvarla(sin / cos);
  const cot = sin === 0 ? null : yuvarla(cos / sin);
  const bolge = a % 90 === 0 ? null : ((Math.floor(a / 90) + 1) as 1 | 2 | 3 | 4);
  const isr = (v: number | null): TrigIsaret => (v === null ? "tanımsız" : v > 0 ? "+" : v < 0 ? "−" : "0");
  // Tam değer: referans açı (0–90) ve bölge işareti.
  const ref = a <= 90 ? a : a <= 180 ? 180 - a : a <= 270 ? a - 180 : 360 - a;
  const tamMi = Number.isInteger(a) && (a % 30 === 0 || a % 45 === 0);
  const isaretli = (deger: number | null, mutlak: string | undefined) => {
    if (deger === null) return "tanımsız";
    if (!tamMi || mutlak === undefined) return sayiYaz(Math.round(deger * 1e4) / 1e4);
    if (mutlak === "0") return "0";
    return deger < 0 ? `${EKSI}${mutlak}` : mutlak;
  };
  return {
    cos, sin, tan, cot, bolge,
    isaret: { sin: isr(sin), cos: isr(cos), tan: isr(tan), cot: isr(cot) },
    yazi: {
      sin: isaretli(sin, SIN_TAM[ref]),
      cos: isaretli(cos, SIN_TAM[90 - ref]),
      tan: isaretli(tan, TAN_TAM[ref]),
      cot: isaretli(cot, TAN_TAM[90 - ref]),
    },
  };
}

/** Bölgede pozitif olan oranlar (ezber: "Tümü – sin – tan/cot – cos"). */
export const BOLGE_POZITIF: Record<1 | 2 | 3 | 4, string> = { 1: "tümü +", 2: "sin +", 3: "tan, cot +", 4: "cos +" };
const ROMA = ["", "I", "II", "III", "IV"];

/** Birim çemberin çizim ölçüleri (çizim ve testler aynı hesabı kullanır). */
export function birimCemberYerlesimi(k: Kutu) {
  const s = Math.min(k.w, k.h);
  const R = s * 0.3;
  const cx = k.x + k.w / 2;
  const cy = k.y + k.h / 2;
  return { cx, cy, R, eksen: R * 1.32 };
}

function okUcu(ctx: CanvasRenderingContext2D, x: number, y: number, aci: number, boy = 9) {
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x - boy * Math.cos(aci - 0.42), y - boy * Math.sin(aci - 0.42));
  ctx.lineTo(x - boy * Math.cos(aci + 0.42), y - boy * Math.sin(aci + 0.42));
  ctx.closePath();
  ctx.fill();
}

function nokta(ctx: CanvasRenderingContext2D, x: number, y: number, r = 3.6) {
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
}

export function birimCemberCiz(ctx: CanvasRenderingContext2D, v: BirimCemberVerisi, k: Kutu) {
  const { cx, cy, R, eksen } = birimCemberYerlesimi(k);
  const d = birimCemberDegerleri(v.aci);
  const aciYazi = (v.aciEtiketi ?? "α").trim() || "α";
  const P = { x: cx + R * d.cos, y: cy - R * d.sin };
  const sagSinir = k.x + k.w + 16, solSinir = k.x - 16;
  const ust = k.y + 4, alt = k.y + k.h - 4;
  ctx.fillStyle = MUREKKEP;
  ctx.strokeStyle = MUREKKEP;

  // Eksenler (oklu) ve adları
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(cx - eksen, cy); ctx.lineTo(cx + eksen, cy);
  ctx.moveTo(cx, cy + eksen); ctx.lineTo(cx, cy - eksen);
  ctx.stroke();
  okUcu(ctx, cx + eksen, cy, 0);
  okUcu(ctx, cx, cy - eksen, -Math.PI / 2);
  fizikMetniCiz(ctx, "cos", cx + eksen + 4, cy + 13, 14, "sol", undefined, Math.max(20, sagSinir - cx - eksen - 4));
  fizikMetniCiz(ctx, "sin", cx + 8, cy - eksen + 2, 14, "sol");
  fizikMetniCiz(ctx, "O", cx - 9, cy + 11, 14, "orta");
  // Birim çember
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.stroke();
  // ±1 çentikleri
  ctx.lineWidth = 1.2;
  // Sayılar, izdüşüm yazılarının (cos α / sin α) KARŞI tarafına yazılır ki üst üste binmesin.
  const xd = d.sin >= 0 ? -10 : 12;
  const yd = d.cos >= 0 ? 10 : -10;
  for (const [x, y, metin, dx, dy] of [
    [cx + R, cy, "1", 7, xd], [cx - R, cy, `${EKSI}1`, -9, xd], [cx, cy - R, "1", yd, -8], [cx, cy + R, `${EKSI}1`, yd * 1.2, 9],
  ] as [number, number, string, number, number][]) {
    ctx.beginPath();
    if (y === cy) { ctx.moveTo(x, cy - 4); ctx.lineTo(x, cy + 4); } else { ctx.moveTo(cx - 4, y); ctx.lineTo(cx + 4, y); }
    ctx.stroke();
    fizikMetniCiz(ctx, metin, x + dx, y + dy, 13, "orta");
  }

  // Bölgeler
  if (v.bolgeler) {
    for (const b of [1, 2, 3, 4] as const) {
      const sag = b === 1 || b === 4;
      const sy = b === 1 || b === 2 ? -1 : 1;
      // Köşelerde, çemberin ve tan doğrusunun dışında
      const bx = sag ? cx + R + 8 : cx - R - 8;
      fizikMetniCiz(ctx, `${ROMA[b]}: ${BOLGE_POZITIF[b]}`, bx, cy + sy * Math.min(R + 34, k.h / 2 - 14), 12, sag ? "sol" : "sag", "#475569", sag ? k.x + k.w + 14 - bx : bx - k.x + 14);
    }
  }

  // tan doğrusu x = 1 ve cot doğrusu y = 1 (kutu boyunca; kesikli uzantı O'dan T/K'ye)
  ctx.lineWidth = 1.4;
  if (v.tan) {
    ctx.beginPath(); ctx.moveTo(cx + R, ust + 14); ctx.lineTo(cx + R, alt); ctx.stroke();
    okUcu(ctx, cx + R, ust + 10, -Math.PI / 2, 8);
    fizikMetniCiz(ctx, "tan", cx + R - 6, ust + 12, 13, "sag");
  }
  if (v.cot) {
    const solX = Math.max(k.x + 4, cx - eksen * 1.25), sagX = Math.min(k.x + k.w - 26, cx + eksen * 1.25);
    ctx.beginPath(); ctx.moveTo(solX, cy - R); ctx.lineTo(sagX, cy - R); ctx.stroke();
    okUcu(ctx, sagX + 4, cy - R, 0, 8);
    fizikMetniCiz(ctx, "cot", sagX + 6, cy - R - 10, 13, "sol", undefined, Math.max(16, sagSinir - sagX - 6));
  }

  // Açı yayı (0 → α; |α| > 360 ise sarmal)
  const sweep = Math.max(-BIRIM_CEMBER_ACI_SINIRI, Math.min(BIRIM_CEMBER_ACI_SINIRI, v.aci));
  const r0 = Math.max(10, R * 0.2);
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  const adim = Math.max(8, Math.ceil(Math.abs(sweep) / 4));
  for (let i = 0; i <= adim; i += 1) {
    const t = (sweep * i) / adim;
    const rr = r0 + (Math.abs(t) / 360) * 5;
    const rad = (t * Math.PI) / 180;
    const x = cx + rr * Math.cos(rad), y = cy - rr * Math.sin(rad);
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  }
  ctx.stroke();
  if (Math.abs(sweep) > 4) {
    const son = (sweep * Math.PI) / 180;
    const rr = r0 + (Math.abs(sweep) / 360) * 5;
    okUcu(ctx, cx + rr * Math.cos(son), cy - rr * Math.sin(son), -son + (sweep > 0 ? -Math.PI / 2 : Math.PI / 2), 6);
    // Büyük açılarda yazı yayın başına (izdüşüm yazılarıyla çakışmasın)
    const yr = ((Math.abs(sweep) <= 90 ? sweep / 2 : Math.sign(sweep) * 22) * Math.PI) / 180;
    fizikMetniCiz(ctx, aciYazi, cx + (r0 + 13) * Math.cos(yr), cy - (r0 + 13) * Math.sin(yr), 14, "orta", undefined, R * 0.8);
  }

  // İzdüşüm dikmeleri
  if (v.izdusum !== false) {
    ctx.save();
    ctx.setLineDash([5, 4]);
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    if (d.sin !== 0) { ctx.moveTo(P.x, P.y); ctx.lineTo(P.x, cy); }
    if (d.cos !== 0) { ctx.moveTo(P.x, P.y); ctx.lineTo(cx, P.y); }
    ctx.stroke();
    ctx.restore();
    if (d.cos !== 0) {
      nokta(ctx, P.x, cy, 2.6);
      fizikMetniCiz(ctx, `cos ${aciYazi}`, P.x, cy + (d.sin >= 0 ? 15 : -14), 13, "orta", undefined, R);
    }
    if (d.sin !== 0) {
      nokta(ctx, cx, P.y, 2.6);
      fizikMetniCiz(ctx, `sin ${aciYazi}`, cx + (d.cos >= 0 ? -6 : 6), P.y, 13, d.cos >= 0 ? "sag" : "sol", undefined, R);
    }
  }

  // tan / cot noktaları: OP doğrusunun x = 1 ve y = 1 ile kesişimi
  ctx.lineWidth = 1.3;
  if (v.tan && d.tan !== null) {
    const T = { x: cx + R, y: cy - R * d.tan };
    if (T.y >= ust + 8 && T.y <= alt - 6) {
      ctx.save(); ctx.setLineDash([3, 3]); ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(T.x, T.y); ctx.stroke(); ctx.restore();
      nokta(ctx, T.x, T.y, 3.2);
      fizikMetniCiz(ctx, `T(1, tan ${aciYazi})`, T.x + 7, T.y + (T.y < cy ? -11 : 11), 13, "sol", undefined, Math.max(20, sagSinir - T.x - 7));
    }
  }
  if (v.cot && d.cot !== null) {
    const K = { x: cx + R * d.cot, y: cy - R };
    if (K.x >= k.x + 8 && K.x <= k.x + k.w - 8) {
      ctx.save(); ctx.setLineDash([3, 3]); ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(K.x, K.y); ctx.stroke(); ctx.restore();
      nokta(ctx, K.x, K.y, 3.2);
      fizikMetniCiz(ctx, `K(cot ${aciYazi}, 1)`, K.x, K.y - 13, 13, "orta", undefined, Math.min(K.x - solSinir, sagSinir - K.x) * 2);
    }
  }

  // Yarıçap vektörü ve P
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(P.x, P.y); ctx.stroke();
  nokta(ctx, P.x, P.y, 4);
  const ad = (v.noktaAdi ?? "P").trim() || "P";
  const pYazi = `${ad}(cos ${aciYazi}, sin ${aciYazi})`;
  const sagda = d.cos >= 0;
  const px = P.x + (sagda ? 8 : -8);
  fizikMetniCiz(ctx, pYazi, px, P.y + (d.sin >= 0 ? -13 : 13), 14, sagda ? "sol" : "sag", undefined, Math.max(24, sagda ? sagSinir - px : px - solSinir));
}

// ═══ İşaret tablosu ════════════════════════════════════════════════════════

type Polinom = number[]; // katsayılar: c0 + c1·x + c2·x² …
type Carpan = { p: Polinom; us: number };

/** "x^2-x-6", "2x-3", "3-x", "x" → katsayılar. Okunamazsa null. */
export function polinomOku(metin: string): Polinom | null {
  const s = metin.replace(/\s+/g, "").replace(/[−–]/g, "-").replace(/[*·]/g, "").replace(/,/g, ".").replace(/²/g, "^2").replace(/³/g, "^3");
  if (!s) return null;
  const terimler = s.match(/[+-]?[^+-]+/g);
  if (!terimler || terimler.join("") !== s) return null;
  const p: Polinom = [];
  for (const t of terimler) {
    const m = /^([+-]?)(\d+(?:\.\d+)?)?(x(?:\^(\d+))?)?$/.exec(t);
    if (!m || (!m[2] && !m[3])) return null;
    const isaret = m[1] === "-" ? -1 : 1;
    const katsayi = m[2] ? Number(m[2]) : 1;
    const derece = m[3] ? (m[4] ? Number(m[4]) : 1) : 0;
    if (derece > 12) return null;
    p[derece] = (p[derece] ?? 0) + isaret * katsayi;
  }
  for (let i = 0; i < p.length; i += 1) p[i] = p[i] ?? 0;
  while (p.length > 1 && Math.abs(p[p.length - 1]) < 1e-12) p.pop();
  return p;
}

/** Parantez derinliği 0'daki karakter konumlarını sırayla verir. */
function ustDuzeyde(s: string, f: (c: string, i: number) => void): boolean {
  let d = 0;
  for (let i = 0; i < s.length; i += 1) {
    const c = s[i];
    if (c === "(") d += 1;
    else if (c === ")") { d -= 1; if (d < 0) return false; }
    else if (d === 0) f(c, i);
  }
  return d === 0;
}

type Parca = { sabit: number; carpanlar: Carpan[] } | { hata: string };

function parcaOku(s: string, derinlik = 0): Parca {
  if (derinlik > 4) return { hata: "Çok iç içe parantez" };
  if (!s) return { hata: "Boş çarpan" };
  let toplamVar = false;
  const dengeli = ustDuzeyde(s, (c, i) => { if ((c === "+" || c === "-") && i > 0 && s[i - 1] !== "^") toplamVar = true; });
  if (!dengeli) return { hata: "Parantezler eşleşmiyor" };
  if (toplamVar) {
    if (s.includes("(")) return { hata: "İfadeyi çarpanlarına ayrılmış yazın: (x+2)(x-1)^2/(x-4)" };
    const p = polinomOku(s);
    return p ? { sabit: 1, carpanlar: [{ p, us: 1 }] } : { hata: `"${s.slice(0, 20)}" okunamadı` };
  }
  let i = 0, sabit = 1;
  const carpanlar: Carpan[] = [];
  if (s[0] === "-" || s[0] === "+") { if (s[0] === "-") sabit = -1; i = 1; }
  const usOku = (): number | null => {
    if (s[i] !== "^") return 1;
    const m = /^\^(\d+)/.exec(s.slice(i));
    if (!m) return null;
    i += m[0].length;
    const n = Number(m[1]);
    return n >= 1 && n <= 12 ? n : null;
  };
  while (i < s.length) {
    const c = s[i];
    if (c === "*" || c === "·") { i += 1; continue; }
    if (c === "(") {
      let d = 0, j = i;
      for (; j < s.length; j += 1) { if (s[j] === "(") d += 1; else if (s[j] === ")") { d -= 1; if (d === 0) break; } }
      const ic = s.slice(i + 1, j);
      i = j + 1;
      const us = usOku();
      if (us === null) return { hata: "Üs pozitif tam sayı olmalı: (x-1)^2" };
      const r = parcaOku(ic, derinlik + 1);
      if ("hata" in r) return r;
      sabit *= r.sabit ** us;
      for (const k of r.carpanlar) carpanlar.push({ p: k.p, us: k.us * us });
      continue;
    }
    if (c === "x") {
      i += 1;
      const us = usOku();
      if (us === null) return { hata: "Üs pozitif tam sayı olmalı: x^2" };
      carpanlar.push({ p: [0, 1], us });
      continue;
    }
    const m = /^\d+(?:[.,]\d+)?/.exec(s.slice(i));
    if (m) {
      i += m[0].length;
      const us = usOku();
      if (us === null) return { hata: "Üs pozitif tam sayı olmalı" };
      sabit *= Number(m[0].replace(",", ".")) ** us;
      continue;
    }
    return { hata: `"${c}" anlaşılmadı (yalnız x, sayı, + − ^ ( ) / kullanın)` };
  }
  return { sabit, carpanlar };
}

/** gcd */
const ebob = (a: number, b: number): number => (b ? ebob(b, a % b) : Math.abs(a));

function kesirYaz(p: number, q: number): string {
  if (q < 0) { p = -p; q = -q; }
  const g = ebob(Math.abs(p), q) || 1;
  p /= g; q /= g;
  const isaret = p < 0 ? EKSI : "";
  return q === 1 ? `${isaret}${Math.abs(p)}` : `${isaret}${Math.abs(p)}/${q}`;
}

/** Sayıyı küçük paydalı kesir olarak yazmayı dener. */
function rasyonelYaz(x: number): string | null {
  for (let q = 1; q <= 12; q += 1) {
    const p = Math.round(x * q);
    if (Math.abs(p / q - x) < 1e-9) return kesirYaz(p, q);
  }
  return null;
}

/** √n = k·√r (r kare çarpansız). */
function kokSadelestir(n: number): { k: number; r: number } {
  let k = 1, r = n;
  for (let f = 2; f * f <= r; f += 1) while (r % (f * f) === 0) { r /= f * f; k *= f; }
  return { k, r };
}

/** İkinci derece kökü (m ± s, s² = D/(4a²)) tam biçimde yazar: "1 − √2", "(3 + √5)/2". */
function ikinciDereceKokYaz(a: number, b: number, D: number, arti: boolean, sayisal: number): string {
  const ra = rasyonelYaz(sayisal);
  if (ra) return ra;
  // Katsayılar tam sayıysa: x = (−b ± √D) / 2a
  if ([a, b, D].every((v) => Number.isInteger(v)) && D > 0) {
    const { k, r } = kokSadelestir(D);
    if (r === 1) return sayiYaz(Math.round(sayisal * 100) / 100);
    let pay1 = -b, pay2 = k, payda = 2 * a;
    if (payda < 0) { pay1 = -pay1; payda = -payda; pay2 = -pay2; }
    const g = ebob(ebob(Math.abs(pay1), Math.abs(pay2)), payda) || 1;
    pay1 /= g; pay2 /= g; payda /= g;
    const isaretArti = (pay2 > 0) === arti;
    const kokYazi = `${Math.abs(pay2) === 1 ? "" : Math.abs(pay2)}√${r}`;
    const ust = pay1 === 0 ? `${isaretArti ? "" : EKSI}${kokYazi}` : `${pay1 < 0 ? EKSI : ""}${Math.abs(pay1)} ${isaretArti ? "+" : EKSI} ${kokYazi}`;
    return payda === 1 ? ust : pay1 === 0 ? `${ust}/${payda}` : `(${ust})/${payda}`;
  }
  return sayiYaz(Math.round(sayisal * 100) / 100);
}

export type IsaretHesabi = {
  kokler: (IsaretKoku & { x: number; payKat: number; paydaKat: number })[];
  /** Her aralığın işareti (kokler+1 adet), soldan sağa. */
  isaretler: ("+" | "-")[];
  /** Baş katsayının işareti (= en sağ aralığın işareti). */
  basIsaret: "+" | "-";
  /** Ayrıntılı satırlar için: her çarpanın adı, kökleri ve aralık işaretleri. */
  carpanSatirlari: IsaretSatiri[];
};

/**
 * "(x+2)(x-1)^2/(x-4)" gibi çarpanlarına ayrılmış rasyonel ifadenin işaret tablosu.
 * Birinci ve ikinci derece çarpanlar (ve c·xⁿ) kabul edilir; ikinci derecede Δ < 0 ise
 * çarpan işareti sabittir. En sağ aralığın işareti baş katsayıdan gelir; çift katlı
 * kökte işaret değişmez, tek katlıda değişir. Paydanın kökleri tanımsızdır.
 */
export function isaretTablosuHesapla(ifade: string, esitsizlik: IsaretTablosuVerisi["esitsizlik"] = ""): IsaretHesabi | { hata: string } {
  let s = ifade.replace(/\s+/g, "").replace(/[−–]/g, "-").replace(/²/g, "^2").replace(/³/g, "^3");
  s = s.replace(/^(?:[fgh]\(x\)|y)=/i, "");
  s = s.replace(/(<=|>=|≤|≥|<|>)0$/, "");
  if (!s) return { hata: "Bir ifade yazın: (x+2)(x-1)^2/(x-4)" };
  if (s.length > 120) return { hata: "İfade en çok 120 karakter olabilir" };
  const bolmeler: number[] = [];
  if (!ustDuzeyde(s, (c, i) => { if (c === "/") bolmeler.push(i); })) return { hata: "Parantezler eşleşmiyor" };
  if (bolmeler.length > 1) return { hata: "Yalnız bir bölme çizgisi kullanın: pay/(payda)" };
  const payM = bolmeler.length ? s.slice(0, bolmeler[0]) : s;
  const paydaM = bolmeler.length ? s.slice(bolmeler[0] + 1) : "";
  const pay = parcaOku(payM);
  if ("hata" in pay) return pay;
  const payda = paydaM ? parcaOku(paydaM) : { sabit: 1, carpanlar: [] as Carpan[] };
  if ("hata" in payda) return payda;

  let isaretCarpani = Math.sign(pay.sabit) * Math.sign(payda.sabit);
  if (isaretCarpani === 0) return { hata: "İfade sıfır sabitle çarpılmış" };
  type Kok = { x: number; payKat: number; paydaKat: number; yazi: string };
  const kokler: Kok[] = [];
  const carpanSatirlari: { ad: string; kokX: number[]; isaretFn: (t: number) => number; payda: boolean }[] = [];
  const kokEkle = (x: number, kat: number, paydaMi: boolean, yazi: string) => {
    const var0 = kokler.find((k) => Math.abs(k.x - x) < 1e-9);
    if (var0) { if (paydaMi) var0.paydaKat += kat; else var0.payKat += kat; return; }
    kokler.push({ x, payKat: paydaMi ? 0 : kat, paydaKat: paydaMi ? kat : 0, yazi });
  };
  for (const [paydaMi, liste] of [[false, pay.carpanlar], [true, payda.carpanlar]] as [boolean, Carpan[]][]) {
    for (const c of liste) {
      const p = c.p;
      const derece = p.length - 1;
      const ad = polinomYaz(p, c.us);
      const deger = (t: number) => p.reduce((top, k, i) => top + k * t ** i, 0) ** c.us;
      if (derece === 0) {
        if (Math.abs(p[0]) < 1e-12) return { hata: "Sıfır çarpan var" };
        isaretCarpani *= Math.sign(p[0]) ** c.us;
        continue;
      }
      // Baş katsayı katkısı
      isaretCarpani *= Math.sign(p[derece]) ** c.us;
      const yerelKokler: number[] = [];
      const tekTerimli = p.slice(0, derece).every((k) => Math.abs(k) < 1e-12);
      if (tekTerimli) {
        kokEkle(0, derece * c.us, paydaMi, "0");
        yerelKokler.push(0);
      } else if (derece === 1) {
        const x = -p[0] / p[1];
        kokEkle(x, c.us, paydaMi, rasyonelYaz(x) ?? sayiYaz(Math.round(x * 100) / 100));
        yerelKokler.push(x);
      } else if (derece === 2) {
        const [cc, b, a] = p;
        const D = b * b - 4 * a * cc;
        if (D < -1e-12) { /* gerçek kök yok: işaret sabit (a'nın işareti), baş katsayıda sayıldı */ }
        else if (Math.abs(D) <= 1e-12) {
          const x = -b / (2 * a);
          kokEkle(x, 2 * c.us, paydaMi, rasyonelYaz(x) ?? sayiYaz(Math.round(x * 100) / 100));
          yerelKokler.push(x);
        } else {
          const kd = Math.sqrt(D);
          const x1 = (-b - kd) / (2 * a), x2 = (-b + kd) / (2 * a);
          kokEkle(x1, c.us, paydaMi, ikinciDereceKokYaz(a, b, D, false, x1));
          kokEkle(x2, c.us, paydaMi, ikinciDereceKokYaz(a, b, D, true, x2));
          yerelKokler.push(x1, x2);
        }
      } else {
        return { hata: `"${ad}": üçüncü dereceden büyük çarpanı çarpanlarına ayırarak yazın` };
      }
      carpanSatirlari.push({ ad, kokX: yerelKokler, isaretFn: (t) => Math.sign(deger(t)), payda: paydaMi });
    }
  }
  if (kokler.length > EN_COK_KOK) return { hata: `En çok ${EN_COK_KOK} kök/tanımsız nokta gösterilebilir` };
  kokler.sort((a, b) => a.x - b.x);
  // İşaretler: en sağ aralık baş katsayının işareti; sola doğru tek katlı kökte değişir.
  const n = kokler.length;
  const isaretler: ("+" | "-")[] = new Array(n + 1);
  let s0 = isaretCarpani > 0 ? 1 : -1;
  const basIsaret = s0 > 0 ? "+" : "-";
  isaretler[n] = basIsaret;
  for (let i = n - 1; i >= 0; i -= 1) {
    if ((kokler[i].payKat + kokler[i].paydaKat) % 2 === 1) s0 = -s0;
    isaretler[i] = s0 > 0 ? "+" : "-";
  }
  const kapsayan = esitsizlik === "<=" || esitsizlik === ">=";
  const sonuc = kokler.map((k) => ({
    x: k.x, payKat: k.payKat, paydaKat: k.paydaKat,
    deger: k.yazi,
    kat: ((k.payKat + k.paydaKat) % 2 === 0 ? "cift" : "tek") as "tek" | "cift",
    ...(k.paydaKat > 0 ? { tanimsiz: true } : {}),
    ...(kapsayan && k.paydaKat === 0 ? { dahil: true } : {}),
  }));
  // Test noktası: aralık ortası (uçlarda kökün ±1 ötesi)
  const testNoktasi = (j: number) =>
    n === 0 ? 0 : j === 0 ? kokler[0].x - 1 : j === n ? kokler[n - 1].x + 1 : (kokler[j - 1].x + kokler[j].x) / 2;
  const satirlar: IsaretSatiri[] = carpanSatirlari.map((c) => ({
    ad: c.ad,
    isaretler: Array.from({ length: n + 1 }, (_, j) => (c.isaretFn(testNoktasi(j)) >= 0 ? "+" : "-")),
    noktalar: kokler.map((k) => (c.kokX.some((x) => Math.abs(x - k.x) < 1e-9) ? (c.payda ? "||" : "0") : "")),
  }));
  return { kokler: sonuc, isaretler, basIsaret, carpanSatirlari: satirlar };
}

/** Polinom yazısı: [−6, −1, 1] → "x^2 − x − 6" (üs varsa parantezli). */
export function polinomYaz(p: Polinom, us = 1): string {
  const parcalar: string[] = [];
  for (let i = p.length - 1; i >= 0; i -= 1) {
    const c = p[i];
    if (Math.abs(c) < 1e-12) continue;
    const mutlak = Math.abs(c);
    const kat = i === 0 ? sayiYaz(mutlak) : mutlak === 1 ? "" : sayiYaz(mutlak);
    const terim = `${kat}${i === 0 ? "" : i === 1 ? "x" : `x^${i}`}`;
    parcalar.push(parcalar.length === 0 ? `${c < 0 ? "-" : ""}${terim}` : `${c < 0 ? " - " : " + "}${terim}`);
  }
  const govde = (parcalar.join("") || "0").replace(/−/g, "-");
  const tekTerim = parcalar.length === 1;
  if (us === 1) return govde;
  return tekTerim && !govde.startsWith("-") && /^x$/.test(govde) ? `x^${us}` : `(${govde})^${us}`;
}

/**
 * İşaret kuralı: en sağ aralığın işareti verilir; sola doğru tek katlı (ve tanımsız tek katlı)
 * kökte işaret değişir, çift katlı kökte değişmez.
 */
export function isaretleriKuralaGoreDoldur(kokler: IsaretKoku[], enSag: "+" | "-"): ("+" | "-")[] {
  const sonuc: ("+" | "-")[] = new Array(kokler.length + 1);
  let s = enSag;
  sonuc[kokler.length] = s;
  for (let i = kokler.length - 1; i >= 0; i -= 1) {
    if (kokler[i].kat === "tek") s = s === "+" ? "-" : "+";
    sonuc[i] = s;
  }
  return sonuc;
}

/** Eşitsizliğe göre çözüm aralıkları (işaret satırından). */
export function cozumAraliklari(isaretler: string[], esitsizlik: IsaretTablosuVerisi["esitsizlik"]): number[] {
  if (!esitsizlik) return [];
  const aranan = esitsizlik.startsWith(">") ? "+" : "-";
  return isaretler.map((s, i) => (s === aranan ? i : -1)).filter((i) => i >= 0);
}

/** Çözüm kümesi yazısı: "(−∞, −2) ∪ [1, 4)", "ℝ", "∅", "{1}". */
export function cozumKumesiYaz(kokler: IsaretKoku[], cozum: number[]): string {
  const n = kokler.length;
  const secili = new Set(cozum.filter((i) => i >= 0 && i <= n));
  const parcalar: string[] = [];
  let j = 0;
  while (j <= n) {
    if (!secili.has(j)) {
      // Komşusu seçili olmayan dahil kök: tek nokta
      if (j < n && kokler[j].dahil && !kokler[j].tanimsiz && !secili.has(j + 1)) parcalar.push(`{${kokler[j].deger}}`);
      j += 1;
      continue;
    }
    const bas = j;
    while (j < n && secili.has(j + 1) && kokler[j].dahil && !kokler[j].tanimsiz) j += 1;
    const son = j;
    const solUc = bas === 0 ? `(${EKSI}∞` : `${kokler[bas - 1].dahil && !kokler[bas - 1].tanimsiz ? "[" : "("}${kokler[bas - 1].deger}`;
    const sagUc = son === n ? "∞)" : `${kokler[son].deger}${kokler[son].dahil && !kokler[son].tanimsiz ? "]" : ")"}`;
    parcalar.push(`${solUc}, ${sagUc}`);
    j = son + 1;
  }
  if (!parcalar.length) return "∅";
  if (parcalar.length === 1 && parcalar[0] === `(${EKSI}∞, ∞)`) return "ℝ";
  return parcalar.join(" ∪ ").replace(/-/g, EKSI);
}

/** Hesap sonucundan tablo verisi (son satır f(x); istenirse çarpan satırları üstte). */
export function isaretTablosuVerisi(ifade: string, esitsizlik: IsaretTablosuVerisi["esitsizlik"], ayrintili = false, ad = "f(x)"): IsaretTablosuVerisi | { hata: string } {
  const h = isaretTablosuHesapla(ifade, esitsizlik);
  if ("hata" in h) return h;
  const kokler: IsaretKoku[] = h.kokler.map((k) => ({ deger: k.deger, kat: k.kat, ...(k.tanimsiz ? { tanimsiz: true } : {}), ...(k.dahil ? { dahil: true } : {}) }));
  const cok = ayrintili && h.carpanSatirlari.length > 1 && h.carpanSatirlari.length < EN_COK_ISARET_SATIRI;
  return {
    tur: "isaretTablosu",
    kokler,
    satirlar: [...(cok ? h.carpanSatirlari : []), { ad, isaretler: h.isaretler }],
    cozum: cozumAraliklari(h.isaretler, esitsizlik),
    cozumSatiri: !!esitsizlik,
    katGoster: true,
    ifade,
    esitsizlik,
  };
}

/** Kök sayısı değişince satırların işaret/nokta dizilerini boyuna getirir. */
export function isaretSatirlariniUyarla(satirlar: IsaretSatiri[], kokSayisi: number): IsaretSatiri[] {
  return satirlar.map((s) => ({
    ...s,
    isaretler: Array.from({ length: kokSayisi + 1 }, (_, i) => s.isaretler[i] ?? ""),
    ...(s.noktalar ? { noktalar: Array.from({ length: kokSayisi }, (_, i) => s.noktalar![i] ?? "") } : {}),
  }));
}

/** Sayısal kök yazıları soldan sağa artmıyorsa uyarı. */
export function kokSirasiUyarisi(kokler: IsaretKoku[]): string | null {
  const sayilar = kokler.map((k) => {
    const t = k.deger.trim().replace(/[−–]/g, "-").replace(",", ".");
    const m = /^(-?\d+(?:\.\d+)?)(?:\/(\d+(?:\.\d+)?))?$/.exec(t);
    return m ? Number(m[1]) / (m[2] ? Number(m[2]) : 1) : null;
  });
  for (let i = 1; i < sayilar.length; i += 1) {
    const a = sayilar[i - 1], b = sayilar[i];
    if (a !== null && b !== null && !(b > a)) return "Kökler soldan sağa küçükten büyüğe sıralanmalı";
  }
  return null;
}

function isaretYazi(s: string) { return s === "-" ? EKSI : s; }

export function isaretTablosuCiz(ctx: CanvasRenderingContext2D, v: IsaretTablosuVerisi, k: Kutu) {
  const n = v.kokler.length;
  const satirN = v.satirlar.length;
  const cozumVar = !!v.cozumSatiri;
  const toplam = 1 + satirN + (cozumVar ? 1 : 0);
  const satirH = k.h / toplam;
  const adW = Math.max(46, Math.min(110, k.w * 0.17));
  const x0 = k.x + adW, x1 = k.x + k.w;
  const kokX = (i: number) => x0 + ((i + 1) * (x1 - x0)) / (n + 1);
  const sinirX = (i: number) => (i < 0 ? x0 : i >= n ? x1 : kokX(i));
  const araOrta = (j: number) => (sinirX(j - 1) + sinirX(j)) / 2;
  const tabloAlt = k.y + satirH * (1 + satirN);
  const punto = Math.max(11, Math.min(17, satirH * 0.42));
  ctx.strokeStyle = MUREKKEP;
  ctx.fillStyle = MUREKKEP;

  // Çerçeve çizgileri: başlık altı yatay, ad sütunu dikey
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(k.x, k.y + satirH); ctx.lineTo(x1, k.y + satirH);
  ctx.moveTo(x0, k.y + 2); ctx.lineTo(x0, tabloAlt);
  ctx.stroke();
  // Kök kılavuzları (ince kesikli, gri)
  ctx.save();
  ctx.strokeStyle = "#94a3b8";
  ctx.lineWidth = 1;
  ctx.setLineDash([3, 4]);
  ctx.beginPath();
  for (let i = 0; i < n; i += 1) { ctx.moveTo(kokX(i), k.y + satirH); ctx.lineTo(kokX(i), tabloAlt); }
  ctx.stroke();
  ctx.restore();

  // Başlık satırı: x | −∞  kökler  +∞
  const katlar = v.katGoster !== false;
  const baslikY = k.y + satirH * (katlar && n ? 0.36 : 0.5);
  fizikMetniCiz(ctx, "x", k.x + adW / 2, k.y + satirH / 2, punto, "orta");
  fizikMetniCiz(ctx, `${EKSI}∞`, x0 + 6, baslikY, punto, "sol");
  fizikMetniCiz(ctx, "+∞", x1 - 4, baslikY, punto, "sag");
  const kolon = (x1 - x0) / (n + 1);
  v.kokler.forEach((kok, i) => {
    fizikMetniCiz(ctx, kok.deger.replace(/-/g, EKSI), kokX(i), baslikY, punto, "orta", undefined, kolon * 0.95);
    if (!katlar) return;
    const yy = k.y + satirH * 0.76;
    const cx = kokX(i);
    if (kok.tanimsiz) {
      ctx.lineWidth = 1.6;
      ctx.beginPath(); ctx.moveTo(cx - 2.5, yy - 6); ctx.lineTo(cx - 2.5, yy + 6); ctx.moveTo(cx + 2.5, yy - 6); ctx.lineTo(cx + 2.5, yy + 6); ctx.stroke();
      return;
    }
    const r = Math.max(3, Math.min(4.5, satirH * 0.1));
    const xs = kok.kat === "cift" ? [cx - r - 1.5, cx + r + 1.5] : [cx];
    ctx.lineWidth = 1.4;
    for (const x of xs) {
      ctx.beginPath(); ctx.arc(x, yy, r, 0, Math.PI * 2);
      ctx.fillStyle = kok.dahil ? MUREKKEP : "#ffffff";
      ctx.fill(); ctx.stroke();
    }
    ctx.fillStyle = MUREKKEP;
  });

  // İşaret satırları
  v.satirlar.forEach((s, r) => {
    const yUst = k.y + satirH * (1 + r);
    const yOrta = yUst + satirH / 2;
    if (r > 0) {
      ctx.save(); ctx.strokeStyle = "#cbd5e1"; ctx.lineWidth = 0.8;
      ctx.beginPath(); ctx.moveTo(k.x, yUst); ctx.lineTo(x1, yUst); ctx.stroke(); ctx.restore();
    }
    fizikMetniCiz(ctx, s.ad, k.x + adW / 2, yOrta, punto, "orta", undefined, adW - 6);
    for (let j = 0; j <= n; j += 1) {
      const isr = s.isaretler[j] ?? "";
      if (isr) fizikMetniCiz(ctx, isaretYazi(isr), araOrta(j), yOrta, punto + 3, "orta");
    }
    const sonSatir = r === satirN - 1;
    for (let i = 0; i < n; i += 1) {
      const nk = s.noktalar?.[i] ?? (sonSatir ? (v.kokler[i].tanimsiz ? "||" : "0") : "");
      const cx = kokX(i);
      if (nk === "||") {
        ctx.lineWidth = 1.6;
        ctx.beginPath(); ctx.moveTo(cx - 2.5, yUst + satirH * 0.18); ctx.lineTo(cx - 2.5, yUst + satirH * 0.82);
        ctx.moveTo(cx + 2.5, yUst + satirH * 0.18); ctx.lineTo(cx + 2.5, yUst + satirH * 0.82); ctx.stroke();
      } else if (nk) {
        ctx.save(); ctx.fillStyle = "#ffffff"; ctx.fillRect(cx - punto * 0.4, yOrta - punto * 0.55, punto * 0.8, punto * 1.1); ctx.restore();
        fizikMetniCiz(ctx, nk, cx, yOrta, punto, "orta");
      }
    }
  });

  // Çözüm kümesi satırı: sayı doğrusu + tarama
  if (cozumVar) {
    const yOrta = tabloAlt + satirH / 2;
    fizikMetniCiz(ctx, "Ç.K.", k.x + adW / 2, yOrta, punto - 1, "orta", undefined, adW - 6);
    const sol = x0 + 4, sag = x1 - 4;
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(sol, yOrta); ctx.lineTo(sag - 8, yOrta); ctx.stroke();
    okUcu(ctx, sag, yOrta, 0, 9);
    const secili = new Set(v.cozum ?? []);
    const bant = Math.min(12, satirH * 0.32);
    for (const j of secili) {
      if (j < 0 || j > n) continue;
      const a = j === 0 ? sol : kokX(j - 1), b = j === n ? sag - 10 : kokX(j);
      ctx.lineWidth = 4.2;
      ctx.beginPath(); ctx.moveTo(a, yOrta); ctx.lineTo(b, yOrta); ctx.stroke();
      // Tarama: çizginin üstünde eğik çizgiler
      ctx.save();
      ctx.beginPath(); ctx.rect(a, yOrta - bant, b - a, bant); ctx.clip();
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let x = a - bant; x < b + bant; x += 6) { ctx.moveTo(x, yOrta); ctx.lineTo(x + bant, yOrta - bant); }
      ctx.stroke();
      ctx.restore();
    }
    ctx.lineWidth = 1.6;
    v.kokler.forEach((kok, i) => {
      const komsu = secili.has(i) || secili.has(i + 1);
      const dahil = !!kok.dahil && !kok.tanimsiz;
      if (!komsu && !dahil) return;
      ctx.beginPath(); ctx.arc(kokX(i), yOrta, 4.6, 0, Math.PI * 2);
      ctx.fillStyle = dahil ? MUREKKEP : "#ffffff";
      ctx.fill(); ctx.stroke();
      ctx.fillStyle = MUREKKEP;
    });
  }
}

// ═══ Fonksiyon ok diyagramı ════════════════════════════════════════════════

export type FonksiyonDurumu = { fonksiyon: boolean; neden?: string; birebir: boolean; orten: boolean; ozet: string };

/** Eşleme fonksiyon mu? Tanım kümesindeki HER eleman tam bir elemanla eşlenmeli. */
export function fonksiyonDurumu(v: Pick<FonksiyonSemaVerisi, "a" | "b" | "oklar">): FonksiyonDurumu {
  const cikis = v.a.map((_, i) => v.oklar.filter(([x]) => x === i).length);
  const bosta = cikis.findIndex((c) => c === 0);
  const cift = cikis.findIndex((c) => c > 1);
  const hedefler = v.oklar.map(([, y]) => y);
  const birebir = new Set(hedefler).size === hedefler.length;
  const orten = v.b.every((_, j) => hedefler.includes(j));
  if (!v.a.length) return { fonksiyon: false, neden: "Tanım kümesi boş", birebir: false, orten: false, ozet: "Tanım kümesi boş" };
  if (cift >= 0) return { fonksiyon: false, neden: `${v.a[cift] || cift + 1} elemanının birden çok görüntüsü var`, birebir, orten, ozet: `Fonksiyon değil: ${v.a[cift] || cift + 1} elemanının birden çok görüntüsü var` };
  if (bosta >= 0) return { fonksiyon: false, neden: `${v.a[bosta] || bosta + 1} elemanı eşlenmemiş`, birebir, orten, ozet: `Fonksiyon değil: ${v.a[bosta] || bosta + 1} elemanı eşlenmemiş` };
  const tur = [birebir ? "bire bir" : "bire bir değil", orten ? "örten" : "içine"].join(", ");
  return { fonksiyon: true, birebir, orten, ozet: `Fonksiyondur (${tur})` };
}

/** Eleman silinince okları yeniden numaralar (silinen elemanın okları gider). */
export function oklariYenidenNumarala(oklar: [number, number][], taraf: "a" | "b", silinen: number): [number, number][] {
  const t = taraf === "a" ? 0 : 1;
  return oklar.filter((o) => o[t] !== silinen).map((o) => {
    const y: [number, number] = [o[0], o[1]];
    if (y[t] > silinen) y[t] -= 1;
    return y;
  });
}

export function fonksiyonSemaCiz(ctx: CanvasRenderingContext2D, v: FonksiyonSemaVerisi, k: Kutu) {
  const ust = v.fonkAd.trim() ? 30 : 8;
  const altPay = 24;
  const ry = Math.max(20, (k.h - ust - altPay) / 2);
  const cyE = k.y + ust + ry;
  const rx = Math.max(24, Math.min(k.w * 0.14, ry * 0.9));
  const ax = k.x + k.w * 0.25, bx = k.x + k.w * 0.75;
  const [adA, adB] = [v.adlar[0] || "A", v.adlar[1] || "B"];
  ctx.strokeStyle = MUREKKEP;
  ctx.fillStyle = MUREKKEP;
  if (v.fonkAd.trim()) {
    fizikMetniCiz(ctx, `${v.fonkAd.trim()}: ${adA} → ${adB}`, k.x + k.w / 2, k.y + 12, 16, "orta", undefined, k.w * 0.9);
  }
  ctx.lineWidth = 2;
  for (const x of [ax, bx]) { ctx.beginPath(); ctx.ellipse(x, cyE, rx, ry, 0, 0, Math.PI * 2); ctx.stroke(); }
  fizikMetniCiz(ctx, adA, ax, k.y + k.h - 10, 16, "orta", undefined, rx * 2);
  fizikMetniCiz(ctx, adB, bx, k.y + k.h - 10, 16, "orta", undefined, rx * 2);
  const yerler = (n: number) => Array.from({ length: n }, (_, i) => cyE - ry * 0.72 + ((i + 0.5) * ry * 1.44) / Math.max(1, n));
  const ya = yerler(v.a.length), yb = yerler(v.b.length);
  const punto = Math.max(11, Math.min(15, (ry * 1.44) / Math.max(1, v.a.length, v.b.length) * 0.7));
  const noktaA = ax + rx * 0.42, noktaB = bx - rx * 0.42;
  v.a.forEach((e, i) => { nokta(ctx, noktaA, ya[i], 2.8); fizikMetniCiz(ctx, e, ax - rx * 0.12, ya[i], punto, "orta", undefined, rx * 0.95); });
  v.b.forEach((e, i) => { nokta(ctx, noktaB, yb[i], 2.8); fizikMetniCiz(ctx, e, bx + rx * 0.12, yb[i], punto, "orta", undefined, rx * 0.95); });
  ctx.lineWidth = 1.5;
  for (const [i, j] of v.oklar) {
    if (ya[i] === undefined || yb[j] === undefined) continue;
    const x1 = noktaA + 4, y1 = ya[i], x2 = noktaB - 5, y2 = yb[j];
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
    okUcu(ctx, x2, y2, Math.atan2(y2 - y1, x2 - x1), 9);
  }
}

// ═══ Doğrulama ═════════════════════════════════════════════════════════════

const metin = (v: unknown, n: number) => typeof v === "string" && v.length <= n;
const secMetin = (v: unknown, n: number) => v === undefined || metin(v, n);
const bayrak = (v: unknown) => v === undefined || typeof v === "boolean";

export function semaEkGecerliMi(g: Record<string, unknown>): boolean {
  if (g.tur === "birimCember") {
    return typeof g.aci === "number" && Number.isFinite(g.aci) && Math.abs(g.aci) <= BIRIM_CEMBER_ACI_SINIRI &&
      secMetin(g.noktaAdi, 12) && secMetin(g.aciEtiketi, 16) && bayrak(g.tan) && bayrak(g.cot) && bayrak(g.izdusum) && bayrak(g.bolgeler);
  }
  if (g.tur === "isaretTablosu") {
    const kokler = g.kokler, satirlar = g.satirlar;
    if (!Array.isArray(kokler) || kokler.length > EN_COK_KOK) return false;
    if (!kokler.every((k) => !!k && typeof k === "object" && metin((k as IsaretKoku).deger, EN_COK_KOK_YAZISI) &&
      ((k as IsaretKoku).kat === "tek" || (k as IsaretKoku).kat === "cift") && bayrak((k as IsaretKoku).tanimsiz) && bayrak((k as IsaretKoku).dahil))) return false;
    if (!Array.isArray(satirlar) || satirlar.length < 1 || satirlar.length > EN_COK_ISARET_SATIRI) return false;
    const isaret = (s: unknown) => s === "+" || s === "-" || s === "";
    if (!satirlar.every((s) => !!s && typeof s === "object" && metin((s as IsaretSatiri).ad, 40) &&
      Array.isArray((s as IsaretSatiri).isaretler) && (s as IsaretSatiri).isaretler.length <= EN_COK_KOK + 1 && (s as IsaretSatiri).isaretler.every(isaret) &&
      ((s as IsaretSatiri).noktalar === undefined || (Array.isArray((s as IsaretSatiri).noktalar) && (s as IsaretSatiri).noktalar!.length <= EN_COK_KOK &&
        (s as IsaretSatiri).noktalar!.every((x) => x === "0" || x === "||" || x === ""))))) return false;
    if (g.cozum !== undefined && !(Array.isArray(g.cozum) && g.cozum.length <= EN_COK_KOK + 1 && g.cozum.every((i) => Number.isInteger(i) && i >= 0 && i <= EN_COK_KOK))) return false;
    return bayrak(g.cozumSatiri) && bayrak(g.katGoster) && secMetin(g.ifade, 120) &&
      (g.esitsizlik === undefined || ["<", "<=", ">", ">=", ""].includes(g.esitsizlik as string));
  }
  if (g.tur === "fonksiyonSema") {
    const liste = (v: unknown) => Array.isArray(v) && v.length <= EN_COK_ELEMAN && v.every((e) => metin(e, EN_COK_ELEMAN_YAZISI));
    if (!liste(g.a) || !liste(g.b)) return false;
    const na = (g.a as string[]).length, nb = (g.b as string[]).length;
    return Array.isArray(g.adlar) && g.adlar.length <= 2 && g.adlar.every((a) => metin(a, 12)) && metin(g.fonkAd, 12) &&
      Array.isArray(g.oklar) && g.oklar.length <= EN_COK_ELEMAN * EN_COK_ELEMAN &&
      g.oklar.every((o) => Array.isArray(o) && o.length === 2 && Number.isInteger(o[0]) && Number.isInteger(o[1]) && o[0] >= 0 && o[0] < na && o[1] >= 0 && o[1] < nb);
  }
  return false;
}

// ═══ Varsayılanlar ═════════════════════════════════════════════════════════

export const varsayilanBirimCember = (aci = 30): BirimCemberVerisi => ({ tur: "birimCember", aci, noktaAdi: "P", aciEtiketi: "α", izdusum: true });

export function varsayilanIsaretTablosu(): IsaretTablosuVerisi {
  const v = isaretTablosuVerisi("x^2-x-6", "<");
  return "hata" in v ? { tur: "isaretTablosu", kokler: [], satirlar: [{ ad: "f(x)", isaretler: ["+"] }] } : v;
}

export const varsayilanFonksiyonSema = (): FonksiyonSemaVerisi => ({
  tur: "fonksiyonSema", adlar: ["A", "B"], fonkAd: "f",
  a: ["1", "2", "3"], b: ["a", "b", "c", "d"], oklar: [[0, 0], [1, 2], [2, 2]],
});
