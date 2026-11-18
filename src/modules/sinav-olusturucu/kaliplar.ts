// Hazır soru kalıpları ve "sabit veriler" satırı: saf (DOM'suz) üreticiler.
//
// Ders kitaplarında tekrar eden biçimler (I–II–III öncüllü test, Doğru/Yanlış +
// Açıklama tablosu, ✓ kutucuklu işaretleme, "(g = 10 m/s²; …alınız.)" satırı)
// öğretmenin elle yeniden yazmasına bırakılmasın diye tek tıkla eklenir.
// Üretilen HTML, `htmlTemizle` izin listesine uyar (p, table, th/td, br);
// böylece kaydet/aç ve kâğıt çıktısında aynen korunur.

import type { Madde } from "./types";
import { yeniId } from "./utils";

export type KalipTuru = "oncullu" | "dogruYanlis" | "isaretleme";

/** Sonundaki boş paragrafları (<p><br></p>, <br>) atar: eklenen parça metnin
 *  hemen altına gelsin, editörün bıraktığı boş satırlar birikmesin. */
export function sondakiBosluklariAt(html: string | undefined): string {
  let h = (html ?? "").trim();
  for (;;) {
    const yeni = h
      .replace(/(?:<p>\s*(?:<br\s*\/?>)?\s*<\/p>|<br\s*\/?>|\s)+$/i, "")
      .trim();
    if (yeni === h) return h;
    h = yeni;
  }
}

/** Parçayı soru metninin SONUNA ekler (mevcut düz metin <p>'ye sarılır ki blok
 *  olarak ayrı satırda dursun). */
export function kokunSonunaEkle(html: string | undefined, parca: string): string {
  const mevcut = sondakiBosluklariAt(html);
  if (!mevcut) return parca;
  const blokla = /^<(p|ul|ol|table|div)[\s>]/i.test(mevcut) && /<\/(p|ul|ol|table|div)>$/i.test(mevcut)
    ? mevcut
    : `<p>${mevcut}</p>`;
  return blokla + parca;
}

// ── 1. Öncüllü (I–II–III) ──────────────────────────────────────────────────

export const ONCULLU_SIKLARI_5 = ["Yalnız I", "Yalnız II", "I ve II", "II ve III", "I, II ve III"] as const;
export const ONCULLU_SIKLARI_4 = ["Yalnız I", "Yalnız II", "I ve II", "I, II ve III"] as const;

/** Mevcut şık sayısı 4 ise 4, aksi hâlde 5 (uygulamada ayrı bir şık sayısı ayarı yok). */
export function onculuSikSayisi(mevcutSikSayisi: number): 4 | 5 {
  return mevcutSikSayisi === 4 ? 4 : 5;
}

export function oncullKalibi(mevcutSikSayisi = 0): { kokParcasi: string; siklar: string[] } {
  const adet = onculuSikSayisi(mevcutSikSayisi);
  return {
    kokParcasi:
      "<p>I. …</p><p>II. …</p><p>III. …</p><p>yargılarından hangileri doğrudur?</p>",
    siklar: [...(adet === 4 ? ONCULLU_SIKLARI_4 : ONCULLU_SIKLARI_5)],
  };
}

/** Şık metinlerinden Madde listesi üretir (yeni id, cevap alanı yok). */
export function siklariMaddeYap(siklar: string[]): Madde[] {
  return siklar.map((metin) => ({ id: yeniId(), metinHtml: metin, puan: null, cevapSatir: 0 }));
}

/** Mevcut maddelerde yazılmış içerik var mı? (Varsa kalıp onları ezmez.) */
export function maddelerDoluMu(maddeler: Madde[]): boolean {
  return maddeler.some((m) => m.metinHtml.replace(/<[^>]*>/g, "").trim() !== "");
}

// ── 2. Doğru / Yanlış + Açıklama tablosu ──────────────────────────────────

export const DY_YONERGE =
  "Aşağıdaki önermelerin karşısına D (doğru) ya da Y (yanlış) yazınız; yanlış olanları “Açıklama” sütununda düzeltiniz.";
export const DY_SATIR_VARSAYILAN = 4;
export const DY_SATIR_EN_FAZLA = 19; // başlık dâhil sanitizer sınırı 20 satır

export function dogruYanlisKalibi(satir = DY_SATIR_VARSAYILAN): string {
  const n = Math.min(DY_SATIR_EN_FAZLA, Math.max(1, Math.round(satir) || DY_SATIR_VARSAYILAN));
  const bos = "<td><br></td>";
  const govde = `<tr>${bos.repeat(4)}</tr>`.repeat(n);
  return (
    `<p>${DY_YONERGE}</p>` +
    `<table class="soru-tablo soru-tablo-dy"><tbody>` +
    `<tr><th>Önerme</th><th>D</th><th>Y</th><th>Açıklama</th></tr>` +
    govde +
    `</tbody></table>`
  );
}

// ── 3. ✓ kutucuklu işaretleme ─────────────────────────────────────────────

export const ISARETLEME_YONERGE = "(Birden fazla doğru seçenek olabilir.)";
export const ISARETLEME_SATIR_VARSAYILAN = 4;

export function isaretlemeKalibi(satir = ISARETLEME_SATIR_VARSAYILAN): string {
  const n = Math.min(12, Math.max(1, Math.round(satir) || ISARETLEME_SATIR_VARSAYILAN));
  return (
    `<p>${ISARETLEME_YONERGE}</p>` + Array.from({ length: n }, () => "<p>☐ …</p>").join("")
  );
}

// ── 4. Sabit veriler satırı ───────────────────────────────────────────────

export type SabitVeri = {
  id: string;
  etiket: string;
  /** "deger": "…alınız." cümlesine girer; "not": cümleden sonra ayrı cümle olur. */
  tur: "deger" | "not";
  metin: string;
};

export const SABIT_VERILER: readonly SabitVeri[] = [
  { id: "g", etiket: "g = 10", tur: "deger", metin: "g = 10 m/s²" },
  { id: "sin37", etiket: "sin37° / cos37°", tur: "deger", metin: "sin37° = 0,6; cos37° = 0,8" },
  { id: "sin53", etiket: "sin53° / cos53°", tur: "deger", metin: "sin53° = 0,8; cos53° = 0,6" },
  { id: "sin30", etiket: "sin30° / cos30°", tur: "deger", metin: "sin30° = 0,5; cos30° = √3/2" },
  { id: "pi", etiket: "π = 3", tur: "deger", metin: "π = 3" },
  { id: "k", etiket: "k = 9·10⁹", tur: "deger", metin: "k = 9·10⁹ N·m²/C²" },
  { id: "surtunme", etiket: "Sürtünmeler ihmal", tur: "not", metin: "Sürtünmeler ihmal edilmiştir." },
];

/** Seçili sabitlerden satır metni (parantezli, HTML'siz). Hiçbiri seçili değilse "". */
export function sabitVeriSatiri(secili: readonly string[]): string {
  const sec = SABIT_VERILER.filter((v) => secili.includes(v.id));
  const degerler = sec.filter((v) => v.tur === "deger").map((v) => v.metin);
  const notlar = sec.filter((v) => v.tur === "not").map((v) => v.metin);
  const parcalar: string[] = [];
  if (degerler.length > 0) parcalar.push(`${degerler.join("; ")} alınız.`);
  parcalar.push(...notlar);
  return parcalar.length > 0 ? `(${parcalar.join(" ")})` : "";
}

const SABIT_SATIR_RE = /<p>\(([^<]*(?:alınız|ihmal edilmiştir)\.[^<]*)\)<\/p>$/i;

/** Satırı soru metninin sonuna ekler; metin zaten böyle bir satırla bitiyorsa
 *  ikincisini eklemek yerine onu GÜNCELLER (tekrar tıklamak çoğaltmaz). */
export function sabitVeriSatiriniUygula(html: string | undefined, satir: string): string {
  if (!satir) return html ?? "";
  const mevcut = sondakiBosluklariAt(html);
  const govde = SABIT_SATIR_RE.test(mevcut) ? mevcut.replace(SABIT_SATIR_RE, "").trim() : mevcut;
  return kokunSonunaEkle(govde, `<p>${satir}</p>`);
}

// ── Tercih saklama (localStorage; yoksa/bozuksa bellek) ──────────────────

const SABIT_TERCIH_ANAHTARI = "sinav-sabit-veriler-v1";
const VARSAYILAN_SECIM: readonly string[] = ["g"];
let bellekSecimi: string[] | null = null;

export function sabitSeciminiOku(): string[] {
  const gecerli = (v: unknown): string[] | null =>
    Array.isArray(v) ? v.filter((x): x is string => typeof x === "string" && SABIT_VERILER.some((s) => s.id === x)) : null;
  try {
    const ham = globalThis.localStorage?.getItem(SABIT_TERCIH_ANAHTARI);
    const okunan = ham ? gecerli(JSON.parse(ham)) : null;
    if (okunan) return okunan;
  } catch {
    /* erişilemiyor/bozuk: bellek ya da varsayılan */
  }
  return bellekSecimi ? [...bellekSecimi] : [...VARSAYILAN_SECIM];
}

export function sabitSeciminiYaz(secili: readonly string[]): void {
  bellekSecimi = [...secili];
  try {
    globalThis.localStorage?.setItem(SABIT_TERCIH_ANAHTARI, JSON.stringify(secili));
  } catch {
    /* yok say */
  }
}
