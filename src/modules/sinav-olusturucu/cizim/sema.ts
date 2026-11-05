// Matematik şemaları: Venn (2–3 küme; kesişen / alt küme / ayrık), olasılık ağacı (3 aşamaya kadar),
// sayı doğrusu (aralıklı). Birim çember, işaret tablosu ve fonksiyon ok diyagramı `semaEk.ts`'te.
//
// Hepsi tek şekil (kutu = çizim alanı) ve veriyle tanımlı: bölge değerleri,
// dal olasılıkları, aralık uçları panelden yazılır. Çizim saf geometri — Venn
// bölgesi boyama, bölgenin kümelere üyeliğini ızgaradan örnekleyerek buluyor
// (kesişim/fark için tek tek kırpma yolu kurmak yerine; hata payı 2 piksel).

import type { AgacDali, SemaVerisi, Sekil, VennDuzeni } from "./tipler";
import { MUREKKEP } from "./sabitler";
import { fizikMetniCiz } from "./fizik";
import { sayiYaz } from "./grafik";
import {
  birimCemberCiz,
  fonksiyonSemaCiz,
  isaretTablosuCiz,
  isaretTablosuVerisi,
  semaEkGecerliMi,
  varsayilanBirimCember,
  varsayilanFonksiyonSema,
} from "./semaEk";

type FizikSekli = Extract<Sekil, { tur: "fizik" }>;

// ── Sınırlar ───────────────────────────────────────────────────────────────

/** Sayı doğrusunda kabul edilen en büyük mutlak değer (1e21 gibi girdiler çerçeveyi taşırmasın). */
export const SAYI_DOGRUSU_SINIRI = 1e9;
export const EN_COK_DAL_ADI = 40;
export const EN_COK_OLASILIK = 20;
export const EN_COK_SEMA_BASLIK = 80;
export const EN_COK_SEMA_AD = 40;
/** Olasılık ağacı: en çok aşama (derinlik) ve uç (yaprak) sayısı. */
export const EN_COK_AGAC_ASAMA = 3;
export const EN_COK_YAPRAK = 36;

// ── Venn ───────────────────────────────────────────────────────────────────

/** Bölge adları: panelde değer kutularını etiketlemek için (veri dizisiyle aynı sıra). */
export function vennBolgeAdlari(kume: number, adlar: string[], duzen: VennDuzeni = "kesisen"): string[] {
  const [a, b, c] = [adlar[0] || "A", adlar[1] || "B", adlar[2] || "C"];
  if (kume === 2 && duzen === "altKume") return [`Yalnız ${a} (boş)`, `${a} (= ${a}∩${b})`, `${b}∖${a}`, "Hiçbiri (dışı)"];
  if (kume === 2 && duzen === "ayrik") return [a, `${a}∩${b} (boş)`, b, "Hiçbiri (dışı)"];
  return kume === 3
    ? [`Yalnız ${a}`, `Yalnız ${b}`, `Yalnız ${c}`, `${a}∩${b} (C hariç)`, `${a}∩${c} (B hariç)`, `${b}∩${c} (A hariç)`, `${a}∩${b}∩${c}`, "Hiçbiri (dışı)"]
    : [`Yalnız ${a}`, `${a}∩${b}`, `Yalnız ${b}`, "Hiçbiri (dışı)"];
}

/** Düzende anlamlı (panelde gösterilen) bölge indeksleri. */
export function vennGorunurBolgeler(kume: number, duzen: VennDuzeni = "kesisen"): number[] {
  if (kume === 3) return [0, 1, 2, 3, 4, 5, 6, 7];
  if (duzen === "altKume") return [1, 2, 3];
  if (duzen === "ayrik") return [0, 2, 3];
  return [0, 1, 2, 3];
}

const duzenOf = (v: { kume: number; duzen?: VennDuzeni }): VennDuzeni => (v.kume === 2 ? v.duzen ?? "kesisen" : "kesisen");

type Daire = { x: number; y: number; r: number };

/** Kümelerin daireleri: kutunun içine sığacak biçimde. */
export function vennDaireleri(kume: number, k: { x: number; y: number; w: number; h: number }, duzen: VennDuzeni = "kesisen"): Daire[] {
  const cx = k.x + k.w / 2;
  if (kume === 2 && duzen === "altKume") {
    // B büyük daire, A onun içinde (sola-aşağı kaydırılmış, B'ye değmez)
    const R = Math.min(k.h * 0.4, k.w * 0.3);
    const cy = k.y + k.h * 0.52;
    return [{ x: cx - R * 0.3, y: cy + R * 0.08, r: R * 0.5 }, { x: cx, y: cy, r: R }];
  }
  if (kume === 2 && duzen === "ayrik") {
    const r = Math.min(k.h * 0.3, k.w * 0.19);
    const cy = k.y + k.h * 0.54;
    return [{ x: cx - r * 1.3, y: cy, r }, { x: cx + r * 1.3, y: cy, r }];
  }
  if (kume === 3) {
    const r = Math.min(k.w * 0.25, k.h * 0.27);
    const d = r * 0.95;
    const cy = k.y + k.h * 0.5 + r * 0.2;
    return [
      { x: cx - d * 0.62, y: cy - d * 0.5, r },
      { x: cx + d * 0.62, y: cy - d * 0.5, r },
      { x: cx, y: cy + d * 0.58, r },
    ];
  }
  const r = Math.min(k.h * 0.36, k.w * 0.27);
  const cy = k.y + k.h * 0.5;
  return [{ x: cx - r * 0.62, y: cy, r }, { x: cx + r * 0.62, y: cy, r }];
}

/** Bir noktanın hangi bölgede olduğu (veri dizisi indeksi) ya da -1. */
export function vennBolgesi(kume: number, daireler: Daire[], px: number, py: number): number {
  const ic = daireler.map((d) => (px - d.x) ** 2 + (py - d.y) ** 2 <= d.r ** 2);
  if (kume === 2) {
    if (ic[0] && !ic[1]) return 0;
    if (ic[0] && ic[1]) return 1;
    if (!ic[0] && ic[1]) return 2;
    return 3;
  }
  const [a, b, c] = ic;
  if (a && !b && !c) return 0;
  if (!a && b && !c) return 1;
  if (!a && !b && c) return 2;
  if (a && b && !c) return 3;
  if (a && !b && c) return 4;
  if (!a && b && c) return 5;
  if (a && b && c) return 6;
  return 7;
}

/** Bölge yazısının yeri (daire geometrisinden). */
function bolgeYeri(kume: number, daireler: Daire[], i: number, k: { x: number; y: number; w: number; h: number }, duzen: VennDuzeni = "kesisen"): { x: number; y: number } {
  const kose = { x: k.x + k.w - 14, y: k.y + k.h - 14 };
  if (kume === 2 && duzen === "altKume") {
    const [A, B] = daireler;
    return [{ x: A.x, y: A.y }, { x: A.x, y: A.y }, { x: B.x + B.r * 0.55, y: B.y - B.r * 0.1 }, kose][i];
  }
  if (kume === 2 && duzen === "ayrik") {
    const [A, B] = daireler;
    return [{ x: A.x, y: A.y }, { x: (A.x + B.x) / 2, y: A.y }, { x: B.x, y: B.y }, kose][i];
  }
  if (kume === 2) {
    const [A, B] = daireler;
    const r = A.r;
    return [{ x: A.x - r * 0.5, y: A.y }, { x: (A.x + B.x) / 2, y: A.y }, { x: B.x + r * 0.5, y: B.y }, { x: k.x + k.w - 14, y: k.y + k.h - 14 }][i];
  }
  const [A, B, C] = daireler;
  const g = { x: (A.x + B.x + C.x) / 3, y: (A.y + B.y + C.y) / 3 };
  const dis = (d: Daire, t: number) => {
    const vx = d.x - g.x, vy = d.y - g.y, n = Math.hypot(vx, vy) || 1;
    return { x: d.x + (vx / n) * d.r * t, y: d.y + (vy / n) * d.r * t };
  };
  const orta = (p: Daire, q: Daire, uzak: Daire) => {
    const m = { x: (p.x + q.x) / 2, y: (p.y + q.y) / 2 };
    const vx = m.x - uzak.x, vy = m.y - uzak.y, n = Math.hypot(vx, vy) || 1;
    return { x: m.x + (vx / n) * A.r * 0.38, y: m.y + (vy / n) * A.r * 0.38 };
  };
  return [dis(A, 0.55), dis(B, 0.55), dis(C, 0.55), orta(A, B, C), orta(A, C, B), orta(B, C, A), g, { x: k.x + k.w - 14, y: k.y + k.h - 14 }][i];
}

// ── Olasılık ağacı ─────────────────────────────────────────────────────────

/** Yaprak sayısı (alt dalı olmayan dal = 1 yaprak), tüm aşamalarda. */
export function agacYaprakSayisi(dallar: AgacDali[]): number {
  return dallar.reduce((t, d) => t + (d.alt?.length ? agacYaprakSayisi(d.alt) : 1), 0);
}

/** Ağacın aşama sayısı (kök dalları = 1). */
export function agacDerinligi(dallar: AgacDali[]): number {
  return dallar.reduce((m, d) => Math.max(m, 1 + (d.alt?.length ? agacDerinligi(d.alt) : 0)), 0);
}

/** Düz satır (aşama + ad + olasılık) — panel mini tablosu ve metin yazımı ortak biçimi. */
export type AgacSatiri = { asama: number; ad: string; olasilik: string };

export function agacSatirlari(dallar: AgacDali[], asama = 1): AgacSatiri[] {
  return dallar.flatMap((d) => [{ asama, ad: d.ad, olasilik: d.olasilik }, ...(d.alt ? agacSatirlari(d.alt, asama + 1) : [])]);
}

/**
 * Düz satırlardan ağaç. Her satır bir önceki satırların en son dalına bağlanır: 2. aşama son
 * 1. aşama dalına, 3. aşama son 2. aşama dalına. Uzun ad/olasılık KESİLİR (uyari).
 */
export function agacKur(satirlar: AgacSatiri[]): { dallar: AgacDali[]; uyari?: string } | { hata: string } {
  if (!satirlar.length) return { hata: "En az bir dal yazın: K: 1/2" };
  const dallar: AgacDali[] = [];
  const son: AgacDali[] = []; // her aşamanın son dalı
  let uzunAd = false, uzunOlasilik = false;
  for (const [i, sat] of satirlar.entries()) {
    if (!Number.isInteger(sat.asama) || sat.asama < 1) return { hata: `${i + 1}. satır: aşama 1, 2 ya da 3 olmalı` };
    if (sat.asama > EN_COK_AGAC_ASAMA) return { hata: `En çok ${EN_COK_AGAC_ASAMA} aşama (${i + 1}. satır)` };
    let ad = sat.ad.trim();
    let olasilik = sat.olasilik.trim();
    if (ad.length > EN_COK_DAL_ADI) { ad = ad.slice(0, EN_COK_DAL_ADI); uzunAd = true; }
    if (olasilik.length > EN_COK_OLASILIK) { olasilik = olasilik.slice(0, EN_COK_OLASILIK); uzunOlasilik = true; }
    const dal: AgacDali = { ad, olasilik };
    if (sat.asama === 1) dallar.push(dal);
    else {
      const ust = son[sat.asama - 2];
      if (!ust || son.length < sat.asama - 1) return { hata: sat.asama === 2 ? "Alt dal (- ile başlayan) bir ana daldan sonra gelmeli" : `${i + 1}. satır: 3. aşama dalı bir 2. aşama dalından sonra gelmeli` };
      ust.alt = [...(ust.alt ?? []), dal];
    }
    son[sat.asama - 1] = dal;
    son.length = sat.asama;
  }
  if (dallar.length > 6) return { hata: "En çok 6 ana dal" };
  const altFazla = (ds: AgacDali[]): boolean => ds.some((d) => (d.alt?.length ?? 0) > 6 || (d.alt ? altFazla(d.alt) : false));
  if (altFazla(dallar)) return { hata: "Bir dalın en çok 6 alt dalı olabilir" };
  if (agacYaprakSayisi(dallar) > EN_COK_YAPRAK) return { hata: `En çok ${EN_COK_YAPRAK} uç (sonuç) gösterilebilir` };
  const uyarilar = [uzunAd ? `Dal adı en çok ${EN_COK_DAL_ADI} karakter` : "", uzunOlasilik ? `Olasılık en çok ${EN_COK_OLASILIK} karakter` : ""].filter(Boolean);
  return { dallar, ...(uyarilar.length ? { uyari: `${uyarilar.join("; ")} (fazlası kesildi)` } : {}) };
}

// ── Yazımdan okuma ─────────────────────────────────────────────────────────

type Aralik = { bas: number | null; son: number | null; basDahil: boolean; sonDahil: boolean };

/** "(-2, 3]; [5, ∞)" → aralıklar. ∞ / inf / boş = sınırsız uç (açık). */
export function araliklariOku(metin: string): Aralik[] | null {
  const parcalar = metin.split(/;|\n/).map((p) => p.trim()).filter(Boolean);
  if (parcalar.length > 6) return null;
  const sonuc: Aralik[] = [];
  const uc = (t: string): number | null | undefined => {
    const x = t.trim().replace(/\u2212/g, "-").replace(",", ".");
    if (x === "" || /^[+-]?(∞|inf|sonsuz)$/i.test(x)) return null;
    const n = Number(x);
    return Number.isFinite(n) && Math.abs(n) <= SAYI_DOGRUSU_SINIRI ? n : undefined;
  };
  for (const p of parcalar) {
    const m = /^([\[(\]])\s*([^;]*?)\s*[;,]\s*([^;]*?)\s*([\])\[])$/.exec(p);
    if (!m) return null;
    const bas = uc(m[2]);
    const son = uc(m[3]);
    if (bas === undefined || son === undefined) return null;
    if (bas !== null && son !== null && bas > son) return null;
    sonuc.push({ bas, son, basDahil: m[1] === "[" && bas !== null, sonDahil: m[4] === "]" && son !== null });
  }
  return sonuc;
}

export function araliklariYaz(a: Aralik[]): string {
  const f = (x: number | null, bas: boolean) => (x === null ? (bas ? "-∞" : "∞") : String(x));
  return a.map((r) => `${r.basDahil ? "[" : "("}${f(r.bas, true)}, ${f(r.son, false)}${r.sonDahil ? "]" : ")"}`).join("; ");
}

/** "3; -1:A; 4:B:bos" → noktalar (x[:ad[:bos]]). */
export function sayiNoktalariniOku(metin: string): { x: number; ad?: string; dolu?: boolean }[] | null {
  const parcalar = metin.split(/;|\n/).map((p) => p.trim()).filter(Boolean);
  if (parcalar.length > 20) return null;
  const sonuc: { x: number; ad?: string; dolu?: boolean }[] = [];
  for (const p of parcalar) {
    const [xs, ad, tur] = p.split(":").map((t) => t.trim());
    const x = Number((xs ?? "").replace(",", ".").replace("\u2212", "-"));
    if (!(xs ?? "").length || !Number.isFinite(x) || Math.abs(x) > SAYI_DOGRUSU_SINIRI) return null;
    sonuc.push({ x, ...(ad ? { ad } : {}), ...(tur && /^(bos|boş|a[cç][ıi]k)$/i.test(tur) ? { dolu: false } : {}) });
  }
  return sonuc;
}

export function sayiNoktalariniYaz(n: { x: number; ad?: string; dolu?: boolean }[]): string {
  return n.map((p) => [p.x, p.ad ?? "", p.dolu === false ? "bos" : ""].join(":").replace(/:+$/, "")).join("; ");
}

/**
 * Olasılık ağacı yazımı — her satır bir dal: "K: 1/3"; 2. aşama "- K: 1/2", 3. aşama "-- K: 1/2"
 * (tire sayısı ya da 2/4 boşluk girinti). Okunamazsa null. Ad en çok 40, olasılık en çok
 * 20 karakter: uzun metin KESİLİR (şekil geçersiz sayılıp başka bir şekle dönüşmesin); bkz. agacUyarisi.
 */
export function agacOku(metin: string): AgacDali[] | null {
  const r = agacOkuAyrinti(metin);
  return "dallar" in r ? r.dallar : null;
}

/** Okuma sonucu: dallar (+ kesilen metin varsa uyarı) ya da okunamama NEDENİ. */
export function agacOkuAyrinti(metin: string): { dallar: AgacDali[]; uyari?: string } | { hata: string } {
  const satirlar = metin.split(/\r?\n/).filter((s) => s.trim());
  if (!satirlar.length) return { hata: "En az bir dal yazın: K: 1/2" };
  const duz: AgacSatiri[] = [];
  for (const [i, sat] of satirlar.entries()) {
    const m = /^(\s*-*\s*)([^:]+?)\s*:\s*(.*?)\s*$/.exec(sat);
    if (!m) return { hata: `Dal okunamadı: ${i + 1}. satır ("ad: olasılık" yazın)` };
    const tire = (m[1].match(/-/g) ?? []).length;
    const bosluk = m[1].replace(/\t/g, "  ").length;
    const asama = tire > 0 ? 1 + tire : bosluk >= 4 ? 3 : bosluk >= 2 ? 2 : 1;
    duz.push({ asama, ad: m[2], olasilik: m[3] });
  }
  return agacKur(duz);
}

export function agacYaz(dallar: AgacDali[]): string {
  return agacSatirlari(dallar).map((s) => `${s.asama > 1 ? `${"-".repeat(s.asama - 1)} ` : ""}${s.ad}: ${s.olasilik}`).join("\n");
}

// ── Doğrulama ──────────────────────────────────────────────────────────────

const sayi = (v: unknown) => typeof v === "number" && Number.isFinite(v);

function dalGecerli(d: unknown, derinlik: number): boolean {
  if (!d || typeof d !== "object") return false;
  const x = d as AgacDali;
  if (typeof x.ad !== "string" || typeof x.olasilik !== "string" || x.ad.length > 40 || x.olasilik.length > 20) return false;
  if (x.alt === undefined) return true;
  return derinlik < EN_COK_AGAC_ASAMA && Array.isArray(x.alt) && x.alt.length <= 6 && x.alt.every((a) => dalGecerli(a, derinlik + 1));
}

export function semaVerisiGecerliMi(v: unknown): v is SemaVerisi {
  if (!v || typeof v !== "object") return false;
  const g = v as Record<string, unknown>;
  if (g.baslik !== undefined && typeof g.baslik !== "string") return false;
  if (g.tur === "venn") {
    return (g.kume === 2 || g.kume === 3) && Array.isArray(g.adlar) && g.adlar.length <= 3 && g.adlar.every((a) => typeof a === "string") &&
      Array.isArray(g.bolgeler) && g.bolgeler.length <= 8 && g.bolgeler.every((a) => typeof a === "string") && typeof g.evrensel === "boolean" &&
      (g.boyali === undefined || (Array.isArray(g.boyali) && g.boyali.every((i) => Number.isInteger(i)))) &&
      (g.duzen === undefined || g.duzen === "kesisen" || g.duzen === "altKume" || g.duzen === "ayrik");
  }
  if (g.tur === "agac") {
    return Array.isArray(g.dallar) && g.dallar.length >= 1 && g.dallar.length <= 6 && g.dallar.every((d) => dalGecerli(d, 1)) &&
      agacYaprakSayisi(g.dallar as AgacDali[]) <= EN_COK_YAPRAK;
  }
  if (g.tur === "birimCember" || g.tur === "isaretTablosu" || g.tur === "fonksiyonSema") return semaEkGecerliMi(g);
  if (g.tur === "sayiDogrusu") {
    return sayi(g.min) && sayi(g.max) && sayi(g.adim) && (g.max as number) > (g.min as number) && (g.adim as number) > 0 &&
      Array.isArray(g.araliklar) && g.araliklar.length <= 6 &&
      g.araliklar.every((a) => !!a && ((a as { bas: unknown }).bas === null || sayi((a as { bas: unknown }).bas)) && ((a as { son: unknown }).son === null || sayi((a as { son: unknown }).son))) &&
      Array.isArray(g.noktalar) && g.noktalar.length <= 20 && g.noktalar.every((n) => !!n && sayi((n as { x: unknown }).x));
  }
  return false;
}

// ── Varsayılanlar / şablonlar ──────────────────────────────────────────────

export type SemaSablonu = {
  id: string; ad: string; ipucu: string; olustur: () => SemaVerisi;
  /** Sol kütüphane araması için Türkçe anahtar kelimeler. */
  aramaKelimeleri?: string[];
};

const isaretSablonu = (ifade: string, esitsizlik: "<" | "<=" | ">" | ">=", ayrintili = false): SemaVerisi => {
  const v = isaretTablosuVerisi(ifade, esitsizlik, ayrintili);
  return "hata" in v ? { tur: "isaretTablosu", kokler: [], satirlar: [{ ad: "f(x)", isaretler: ["+"] }] } : v;
};

export const SEMA_SABLONLARI: SemaSablonu[] = [
  { id: "venn2", ad: "Venn (2 küme)", ipucu: "İki küme; bölge değerleri yazılır, bölgeler boyanabilir", aramaKelimeleri: ["venn", "küme", "kesişim", "birleşim", "şema"], olustur: () => ({ tur: "venn", kume: 2, adlar: ["A", "B"], bolgeler: ["5", "3", "4", "2"], evrensel: true, evrenselAd: "E" }) },
  { id: "venn3", ad: "Venn (3 küme)", ipucu: "Üç küme", aramaKelimeleri: ["venn", "küme", "üç küme", "kesişim"], olustur: () => ({ tur: "venn", kume: 3, adlar: ["A", "B", "C"], bolgeler: ["4", "5", "3", "2", "1", "2", "1", "3"], evrensel: true, evrenselAd: "E" }) },
  { id: "venn-boyali", ad: "Venn (A\\B boyalı)", ipucu: "Fark kümesi boyalı örnek", aramaKelimeleri: ["venn", "fark kümesi", "boyalı", "tarama", "küme"], olustur: () => ({ tur: "venn", kume: 2, adlar: ["A", "B"], bolgeler: ["", "", "", ""], evrensel: true, evrenselAd: "E", boyali: [0] }) },
  { id: "venn-alt", ad: "Alt küme (A ⊂ B)", ipucu: "İç içe iki küme: A, B'nin alt kümesi", aramaKelimeleri: ["alt küme", "venn", "iç içe", "kapsama", "küme"], olustur: () => ({ tur: "venn", kume: 2, duzen: "altKume", adlar: ["A", "B"], bolgeler: ["", "3", "5", ""], evrensel: true, evrenselAd: "E" }) },
  { id: "venn-ayrik", ad: "Ayrık kümeler", ipucu: "A ∩ B = ∅: kesişmeyen iki küme", aramaKelimeleri: ["ayrık", "venn", "boş küme", "kesişmeyen", "küme"], olustur: () => ({ tur: "venn", kume: 2, duzen: "ayrik", adlar: ["A", "B"], bolgeler: ["4", "", "6", ""], evrensel: true, evrenselAd: "E" }) },
  {
    id: "agac", ad: "Olasılık ağacı", ipucu: "İki aşamalı ağaç; dal olasılıkları yazılır",
    aramaKelimeleri: ["olasılık", "ağaç", "dal", "torba", "olasılık ağacı"],
    olustur: () => ({
      tur: "agac",
      dallar: [
        { ad: "K", olasilik: "1/3", alt: [{ ad: "K", olasilik: "1/2" }, { ad: "M", olasilik: "1/2" }] },
        { ad: "M", olasilik: "2/3", alt: [{ ad: "K", olasilik: "1/2" }, { ad: "M", olasilik: "1/2" }] },
      ],
    }),
  },
  {
    id: "agac3", ad: "3 aşamalı ağaç (zar-para-zar)", ipucu: "Zar (çift/tek) → para (Y/T) → zar (6 / 6 değil)",
    aramaKelimeleri: ["olasılık", "ağaç", "üç aşama", "zar", "para", "yazı tura"],
    olustur: () => {
      const zar2 = () => [{ ad: "6", olasilik: "1/6" }, { ad: "6'", olasilik: "5/6" }];
      const para = () => [{ ad: "Y", olasilik: "1/2", alt: zar2() }, { ad: "T", olasilik: "1/2", alt: zar2() }];
      return { tur: "agac", dallar: [{ ad: "Çift", olasilik: "1/2", alt: para() }, { ad: "Tek", olasilik: "1/2", alt: para() }] };
    },
  },
  {
    id: "sayi", ad: "Sayı doğrusu", ipucu: "Aralık: açık/kapalı uçlar; nokta işaretleme",
    aramaKelimeleri: ["sayı doğrusu", "aralık", "eşitsizlik", "gerçek sayılar"],
    olustur: () => ({
      tur: "sayiDogrusu", min: -5, max: 6, adim: 1,
      araliklar: [{ bas: -2, son: 3, basDahil: false, sonDahil: true }],
      noktalar: [],
    }),
  },
  { id: "birim30", ad: "Birim çember 30°", ipucu: "P(cos α, sin α), eksenlere izdüşüm; α = 30°", aramaKelimeleri: ["birim çember", "trigonometri", "sinüs", "kosinüs", "açı", "çember"], olustur: () => varsayilanBirimCember(30) },
  { id: "birim-tan", ad: "Birim çember (tan, cot)", ipucu: "α = 135°: tan (x = 1) ve cot (y = 1) doğruları, bölge işaretleri", aramaKelimeleri: ["birim çember", "tanjant", "kotanjant", "tan", "cot", "trigonometri", "bölge"], olustur: () => ({ ...varsayilanBirimCember(135), tan: true, cot: true, bolgeler: true }) },
  { id: "isaret-x2", ad: "x²−x−6 < 0 işaret tablosu", ipucu: "Kökler −2 ve 3; çözüm kümesi taralı", aramaKelimeleri: ["işaret tablosu", "eşitsizlik", "ikinci derece", "kök", "çözüm kümesi"], olustur: () => isaretSablonu("x^2-x-6", "<") },
  { id: "isaret-rasyonel", ad: "(x+2)(x−1)²/(x−4) ≥ 0", ipucu: "Çift katlı kök (1) ve tanımsız nokta (4); çarpan satırlarıyla", aramaKelimeleri: ["işaret tablosu", "rasyonel", "çift katlı", "tanımsız", "eşitsizlik"], olustur: () => isaretSablonu("(x+2)(x-1)^2/(x-4)", ">=", true) },
  { id: "fonksiyon-ok", ad: "f: A→B fonksiyon", ipucu: "Ok (Venn) diyagramıyla fonksiyon; bire bir / örten bilgisi panelde", aramaKelimeleri: ["fonksiyon", "ok diyagramı", "eşleme", "tanım kümesi", "değer kümesi", "bağıntı"], olustur: () => varsayilanFonksiyonSema() },
  { id: "fonksiyon-degil", ad: "Fonksiyon olmayan eşleme", ipucu: "Bir elemanın iki görüntüsü var", aramaKelimeleri: ["fonksiyon değil", "bağıntı", "ok diyagramı", "eşleme"], olustur: () => ({ tur: "fonksiyonSema", adlar: ["A", "B"], fonkAd: "", a: ["1", "2", "3"], b: ["a", "b", "c"], oklar: [[0, 0], [0, 1], [1, 2], [2, 2]] }) },
];

export const varsayilanSema = (): SemaVerisi => SEMA_SABLONLARI[0].olustur();

// ── Çizim ──────────────────────────────────────────────────────────────────

/**
 * Şeklin kutu dışına taşan yazı payı (PNG kırpma sınırı). Tüm şema türleri yazılarını kutu
 * + 16 px içinde tutar (başlık üstte 18 px yukarıda); `veri` ileride türe özel pay için.
 */
export function semaPayi(_veri?: SemaVerisi) {
  return { sol: 20, ust: 34, sag: 20, alt: 30 };
}

/** Şablon eklenirken önerilen kutu ölçüsü (U: fizikNesnesiEkle'de FIZIK_TANIMLARI.sema yerine). */
export function semaBoyutu(v: SemaVerisi): { w: number; h: number } {
  if (v.tur === "birimCember") return { w: 380, h: 300 };
  if (v.tur === "isaretTablosu") return { w: Math.max(340, 120 + 70 * (v.kokler.length + 1)), h: 44 * (1 + v.satirlar.length + (v.cozumSatiri ? 1 : 0)) };
  if (v.tur === "fonksiyonSema") return { w: 320, h: Math.max(200, 60 + 30 * Math.max(v.a.length, v.b.length)) };
  if (v.tur === "agac") return agacDerinligi(v.dallar) >= 3 ? { w: 440, h: Math.max(220, 36 * agacYaprakSayisi(v.dallar)) } : { w: 300, h: Math.max(200, 26 * agacYaprakSayisi(v.dallar)) };
  return { w: 300, h: 200 };
}

export function semaCiz(ctx: CanvasRenderingContext2D, s: FizikSekli) {
  const v = s.sema && semaVerisiGecerliMi(s.sema) ? s.sema : varsayilanSema();
  const k = { x: s.x, y: s.y, w: s.w, h: s.h };
  ctx.save();
  ctx.strokeStyle = MUREKKEP;
  ctx.fillStyle = MUREKKEP;
  ctx.lineWidth = Math.max(1.4, Math.min(2.2, s.kalinlik * 0.8));
  ctx.lineJoin = "round";
  ctx.setLineDash([]);
  if (v.tur === "venn") vennCiz(ctx, v, k);
  else if (v.tur === "agac") agacCiz(ctx, v, k);
  else if (v.tur === "birimCember") birimCemberCiz(ctx, v, k);
  else if (v.tur === "isaretTablosu") isaretTablosuCiz(ctx, v, k);
  else if (v.tur === "fonksiyonSema") fonksiyonSemaCiz(ctx, v, k);
  else sayiDogrusuCiz(ctx, v, k);
  if (v.baslik?.trim()) fizikMetniCiz(ctx, v.baslik.trim(), k.x + k.w / 2, k.y - 18, 17, "orta", undefined, k.w + 40);
  ctx.restore();
}

type Kutu = { x: number; y: number; w: number; h: number };

function vennCiz(ctx: CanvasRenderingContext2D, v: Extract<SemaVerisi, { tur: "venn" }>, k: Kutu) {
  const duzen = duzenOf(v);
  const daireler = vennDaireleri(v.kume, k, duzen);
  const boyali = new Set(v.boyali ?? []);
  // Boyalı bölgeler: ızgaradan örnekle, tek yolda doldur (dikiş yok)
  if (boyali.size) {
    const H = 2;
    ctx.fillStyle = "rgba(100,116,139,0.38)";
    ctx.beginPath();
    for (let j = 0; j * H < k.h; j += 1) {
      let bas = -1;
      const py = k.y + j * H + H / 2;
      const nx = Math.ceil(k.w / H);
      for (let i = 0; i <= nx; i += 1) {
        const px = k.x + i * H + H / 2;
        const ic = i < nx && boyali.has(vennBolgesi(v.kume, daireler, px, py)) && (v.evrensel || vennBolgesi(v.kume, daireler, px, py) !== (v.kume === 2 ? 3 : 7));
        if (ic && bas < 0) bas = i;
        if (!ic && bas >= 0) { ctx.rect(k.x + bas * H, k.y + j * H, (i - bas) * H, H); bas = -1; }
      }
    }
    ctx.fill();
  }
  ctx.strokeStyle = MUREKKEP;
  if (v.evrensel) {
    ctx.lineWidth = 1.8;
    ctx.strokeRect(k.x, k.y, k.w, k.h);
    if (v.evrenselAd?.trim()) fizikMetniCiz(ctx, v.evrenselAd.trim(), k.x + 14, k.y + 14, 17, "sol", undefined, k.w * 0.3);
  }
  ctx.lineWidth = 2;
  for (const d of daireler) { ctx.beginPath(); ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2); ctx.stroke(); }
  // Küme adları
  const adlar = v.adlar;
  daireler.forEach((d, i) => {
    const ad = (adlar[i] ?? "").trim();
    if (!ad) return;
    const ust = v.kume === 3 && i === 2 ? false : true;
    // Alt kümede A'nın adı kendi dairesinin hemen üstüne (B'nin içinde) yazılır.
    const dx = (duzen === "altKume" && i === 0) || duzen === "ayrik" ? 0 : i === 0 ? -d.r * 0.75 : i === 1 ? d.r * 0.75 : 0;
    fizikMetniCiz(ctx, ad, d.x + dx, ust ? d.y - d.r - 12 : d.y + d.r + 14, 17, "orta", undefined, Math.max(40, d.r * 1.6));
  });
  // Bölge değerleri
  const gorunur = new Set(vennGorunurBolgeler(v.kume, duzen));
  v.bolgeler.forEach((metin, i) => {
    if (!metin?.trim() || !gorunur.has(i)) return;
    if (i === (v.kume === 2 ? 3 : 7) && !v.evrensel) return;
    const p = bolgeYeri(v.kume, daireler, i, k, duzen);
    fizikMetniCiz(ctx, metin.trim(), p.x, p.y, 16, "orta", undefined, Math.max(30, daireler[0].r * 0.9));
  });
}

function agacCiz(ctx: CanvasRenderingContext2D, v: Extract<SemaVerisi, { tur: "agac" }>, k: Kutu) {
  const derinlik = Math.max(1, agacDerinligi(v.dallar));
  const yaprak = agacYaprakSayisi(v.dallar);
  const satirH = k.h / Math.max(1, yaprak);
  // Aşama sütunları: 1–2 aşamada eski yerleşim aynen korunur.
  const oranlar = derinlik === 1 ? [0.72] : derinlik === 2 ? [0.42, 0.82] : [0.26, 0.5, 0.74];
  const xs = [k.x + 8, ...oranlar.map((o) => k.x + k.w * o)];
  const y0 = k.y + k.h / 2;
  ctx.lineWidth = 1.8;
  ctx.fillStyle = MUREKKEP;
  ctx.strokeStyle = MUREKKEP;
  ctx.beginPath(); ctx.arc(xs[0], y0, 3.4, 0, Math.PI * 2); ctx.fill();
  let sira = 0;
  const dalCiz = (d: AgacDali, asama: number, px: number, py: number, yol: string[]) => {
    const n = d.alt?.length ? agacYaprakSayisi(d.alt) : 1;
    const x1 = xs[asama];
    const y1 = k.y + satirH * (sira + n / 2);
    ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(x1, y1); ctx.stroke();
    if (asama === 1) {
      // Olasılık: çizginin ortasında, çizginin üst/alt tarafına
      const yukari = y1 < py - 1;
      fizikMetniCiz(ctx, d.olasilik, (px + x1) / 2 + (yukari ? -6 : 6), (py + y1) / 2 + (yukari ? -11 : 11), 15, "orta", undefined, Math.max(30, x1 - px));
    } else {
      const yu = y1 < py - 1;
      const dikey = Math.abs(y1 - py) < 1;
      fizikMetniCiz(ctx, d.olasilik, (px + x1) / 2, (py + y1) / 2 + (dikey ? -12 : yu ? -11 : 11), 15, "orta", undefined, Math.max(30, x1 - px));
    }
    ctx.beginPath(); ctx.arc(x1, y1, 3, 0, Math.PI * 2); ctx.fill();
    if (d.alt?.length) {
      fizikMetniCiz(ctx, d.ad, x1 - 2, y1 - 14, 16, "sag", undefined, Math.max(30, x1 - px));
      for (const a of d.alt) dalCiz(a, asama + 1, x1, y1, [...yol, d.ad]);
    } else {
      // Uç: 1. aşamada yalnız kendi adı, daha derinde yolun tamamı (KM, ÇY6…)
      // 3 aşamada sonuç sıralı üçlü olarak yazılır: (Ç, Y, 6)
      const uc = asama === 1 ? d.ad : derinlik >= 3 ? `(${[...yol, d.ad].join(", ")})` : [...yol, d.ad].join("").replace(/\s+/g, "");
      fizikMetniCiz(ctx, uc, x1 + 10, y1, 16, "sol", undefined, Math.max(40, k.x + k.w + 8 - x1));
      sira += 1;
    }
  };
  for (const d of v.dallar) dalCiz(d, 1, xs[0], y0, []);
}

/** Verilen alt sınırdan küçük olmayan en küçük 1-2-5 adımı. */
function yukariGuzelAdim(enAz: number): number {
  if (!(enAz > 0) || !Number.isFinite(enAz)) return 1;
  const us = 10 ** Math.floor(Math.log10(enAz));
  for (const c of [1, 2, 5, 10]) if (c * us >= enAz * (1 - 1e-9)) return c * us;
  return 10 * us;
}

function sayiDogrusuCiz(ctx: CanvasRenderingContext2D, v: Extract<SemaVerisi, { tur: "sayiDogrusu" }>, k: Kutu) {
  const y = k.y + k.h * 0.5;
  const sol = k.x + 6, sag = k.x + k.w - 6;
  const x0 = sol + 18, x1 = sag - 18; // çerçevenin içinde kalan çizim aralığı
  const aralik = v.max - v.min;
  const X = (d: number) => x0 + ((d - v.min) / aralik) * (x1 - x0);
  const Xk = (d: number) => Math.min(x1, Math.max(x0, X(d))); // çerçeveye kırpılmış
  ctx.strokeStyle = MUREKKEP;
  ctx.fillStyle = MUREKKEP;
  ctx.lineWidth = 1.8;
  ctx.beginPath(); ctx.moveTo(sol + 6, y); ctx.lineTo(sag - 6, y); ctx.stroke();
  for (const [ux, yon] of [[sol, -1], [sag, 1]] as [number, number][]) {
    ctx.beginPath(); ctx.moveTo(ux, y); ctx.lineTo(ux - yon * 12, y - 5); ctx.lineTo(ux - yon * 12, y + 5); ctx.closePath(); ctx.fill();
  }
  // Çentik ve sayılar: etiketler birbirine binmesin diye adım gerekirse büyütülür (seyreltme)
  ctx.lineWidth = 1.2;
  const uzunEtiket = Math.max(Math.abs(v.min), Math.abs(v.max)) >= 1e5;
  const enAzAdim = (aralik * (uzunEtiket ? 84 : 40)) / (x1 - x0);
  const adim = v.adim >= enAzAdim ? v.adim : yukariGuzelAdim(enAzAdim);
  const bas = Math.ceil(v.min / adim - 1e-9);
  const son = Math.floor(v.max / adim + 1e-9);
  for (let i = bas; i <= son && i - bas < 80; i += 1) {
    const d = Math.round(i * adim * 1e9) / 1e9;
    ctx.beginPath(); ctx.moveTo(X(d), y - 5); ctx.lineTo(X(d), y + 5); ctx.stroke();
    fizikMetniCiz(ctx, sayiYaz(d), X(d), y + 20, 15);
  }
  // Aralıklar: kalın çizgi + uç daireleri (dahil → dolu, değil → boş); sonsuz uç ok.
  // Çerçevenin dışındaki uç kırpılır (daire çizilmez, çizgi kenara kadar uzanır).
  const rVar = 4.6;
  for (const a of v.araliklar) {
    if ((a.bas !== null && a.bas > v.max) || (a.son !== null && a.son < v.min)) continue; // tümüyle dışarıda
    const x1a = a.bas === null ? sol : Xk(a.bas);
    const x2a = a.son === null ? sag : Xk(a.son);
    ctx.lineWidth = 4.5;
    ctx.beginPath(); ctx.moveTo(Math.min(x1a, x2a), y); ctx.lineTo(Math.max(x1a, x2a), y); ctx.stroke();
    ctx.lineWidth = 1.8;
    const uc = (ux: number, dahil: boolean) => {
      ctx.beginPath(); ctx.arc(ux, y, rVar, 0, Math.PI * 2);
      ctx.fillStyle = dahil ? MUREKKEP : "#ffffff";
      ctx.fill(); ctx.stroke();
      ctx.fillStyle = MUREKKEP;
    };
    if (a.bas !== null && a.bas >= v.min) uc(x1a, a.basDahil);
    if (a.son !== null && a.son <= v.max) uc(x2a, a.sonDahil);
  }
  for (const n of v.noktalar) {
    if (n.x < v.min - 1e-9 || n.x > v.max + 1e-9) continue; // çerçevenin dışında
    ctx.beginPath(); ctx.arc(X(n.x), y, rVar, 0, Math.PI * 2);
    ctx.fillStyle = n.dolu === false ? "#ffffff" : MUREKKEP;
    ctx.fill(); ctx.stroke();
    ctx.fillStyle = MUREKKEP;
    if (n.ad?.trim()) fizikMetniCiz(ctx, n.ad.trim(), X(n.x), y - 18, 16, "orta", undefined, 60);
  }
}
