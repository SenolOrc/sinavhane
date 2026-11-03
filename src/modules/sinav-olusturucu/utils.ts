import type { CSSProperties } from "react";

import { MADDE_HARFLERI, PT_MM } from "./constants";
import type { Hizalama, MetinKonumu, SoruOgesi } from "./types";

const NUMARA_MM = 7;
const YAN_METIN_REZERV_MM = 34;
const EK_GORSEL_ARA_MM = 3;

export function metinKonumuYanYanaMi(metinKonumu: MetinKonumu) {
  return metinKonumu === "sag" || metinKonumu === "sol";
}

// Görsel gövdesi (numara sütunu çıkmış hâldeki içerik genişliği, "govdeMm")
// içinde metin sağda/solda ise görselin alabileceği azami genişlik. Hem
// SoruIcerik/gorselYerlesimHesapla hem de Görsel Ekle modalı aynı formülü
// kullanır ki ilk ekleme anındaki sınır, kağıttaki gerçek sınırla uyuşsun.
export function govdeGorselMaxMm(govdeMm: number, yanYana: boolean) {
  return yanYana ? Math.max(20, govdeMm - YAN_METIN_REZERV_MM) : govdeMm;
}

// Görsel + yandaki metin sütununun paylaştığı alanı hesaplar. Hem kağıt
// önizlemesi (SoruIcerik) hem düzenleme paneli hem de "metin için yer kalmadı"
// uyarısı bu tek hesaba dayanır — aksi halde üçü ayrı ayrı hesaplayıp
// birbirinden sapabilir.
export function gorselYerlesimHesapla(
  soru: SoruOgesi,
  icerikGenislikMm: number,
  /** Verilirse görsel/çizim bu yüksekliği (mm) AŞMAYACAK şekilde en-boy korunarak
   *  küçültülür (sayfa içerik alanını aşan görsel yazdırmada kırpılıyordu). */
  azamiYukMm?: number,
) {
  const govdeMm = Math.max(20, icerikGenislikMm - NUMARA_MM);
  const yanYana = soru.tur === "gorsel" && metinKonumuYanYanaMi(soru.metinKonumu);
  const maxGorselMm = govdeGorselMaxMm(govdeMm, yanYana);
  let gorselMm = Math.min(soru.genislikMm, maxGorselMm);
  if (
    azamiYukMm && azamiYukMm > 0 && soru.tur === "gorsel" && !soru.tamSayfa &&
    !soru.gorselYukseklikMm && soru.gorselOran && soru.gorselOran > 0
  ) {
    gorselMm = Math.min(gorselMm, Math.max(8, azamiYukMm * soru.gorselOran));
  }

  if (!yanYana) {
    return { govdeMm, yanYana, maxGorselMm, gorselMm, metinAlaniMm: govdeMm };
  }

  const ekYanMm = (soru.ekGorseller ?? [])
    .filter((parca) => parca.konum === "yan")
    .reduce((genis, parca) => {
      const parcaMaxMm = Math.max(18, govdeMm * 0.38);
      return Math.max(genis, Math.min(parca.genislikMm, parcaMaxMm));
    }, 0);
  const gorselTarafiMm =
    gorselMm + (ekYanMm > 0 ? EK_GORSEL_ARA_MM + ekYanMm : 0);
  const metinAlaniMm = Math.max(
    0,
    govdeMm - gorselTarafiMm - EK_GORSEL_ARA_MM,
  );

  return { govdeMm, yanYana, maxGorselMm, gorselMm, metinAlaniMm };
}

// ─── Çizim (şekil) ölçeği: okunabilirlik alt sınırı ─────────────────────────
// Çizim PNG'si editörde CSS pikselinin 3 katı çözünürlükte üretilir (bkz.
// CizimEditoruModal.olustur `kalite`). Doğal boyut = piksel/3 CSS px (96 dpi).
// Sütuna sığmak için bu boydan %70'in altına inen şekilde yazılar ~7 pt'nin
// altına düşer (periyodik tablo, Lewis, eksen yazıları) → şekil otomatik TAM
// GENİŞLİKTE basılır.
export const CIZIM_MIN_OLCEK = 0.7;
export const CIZIM_PNG_KALITE = 3;

/** PNG veri URL'sinin piksel genişliği (IHDR'dan; görsel yüklenmeden okunur). */
export function pngGenislikPx(dataUrl: string | undefined): number | null {
  if (!dataUrl || !dataUrl.startsWith("data:image/png;base64,")) return null;
  try {
    const ikili = atob(dataUrl.slice(22, 22 + 32));
    if (ikili.length < 20 || ikili.charCodeAt(1) !== 0x50) return null;
    return (
      ikili.charCodeAt(16) * 16777216 +
      ikili.charCodeAt(17) * 65536 +
      ikili.charCodeAt(18) * 256 +
      ikili.charCodeAt(19)
    );
  } catch {
    return null;
  }
}

export function cizimDogalGenislikMm(soru: SoruOgesi): number | null {
  if (soru.tur !== "gorsel" || !soru.cizimVerisi || soru.denklemVerisi) return null;
  const px = pngGenislikPx(soru.gorselDataUrl);
  if (!px) return null;
  return ((px / CIZIM_PNG_KALITE) * 25.4) / 96;
}

export type CizimOlcekDurumu = {
  dogalMm: number;
  /** Kâğıtta gösterilen genişlik / doğal genişlik (1 = doğal boy). */
  oran: number;
  /** Sütuna sığmak için çok küçüleceği ve tam genişlikte okunur kalacağı için
   *  OTOMATİK tam genişliğe alınacak mı. */
  otoTam: boolean;
  /** `otoTam` iken kullanılacak genişlik (mm). */
  tamGenislikMm: number;
};

export function cizimOlcekDegerlendir(
  soru: SoruOgesi,
  sutunIcerikMm: number,
  tamIcerikMm: number,
  ciftSutun: boolean,
): CizimOlcekDurumu | null {
  const dogalMm = cizimDogalGenislikMm(soru);
  if (!dogalMm) return null;
  const yan = metinKonumuYanYanaMi(soru.metinKonumu);
  const sutunMax = govdeGorselMaxMm(Math.max(20, sutunIcerikMm - NUMARA_MM), yan);
  const tamMax = govdeGorselMaxMm(Math.max(20, tamIcerikMm - NUMARA_MM), yan);
  const alan = ciftSutun && !soru.tamGenislik ? sutunMax : tamMax;
  const oran = Math.min(soru.genislikMm, alan) / dogalMm;
  const tamGenislikMm = Math.round(Math.min(dogalMm, tamMax));
  const otoTam =
    ciftSutun &&
    !soru.tamGenislik &&
    !soru.tamSayfa &&
    oran < CIZIM_MIN_OLCEK &&
    // Yalnız "sütuna sığdır" niyetindeki şekiller: öğretmen boyutu elle
    // küçülttüyse (Küçük/Orta) kararı ona bırakılır, yalnız ipucu çıkar.
    soru.genislikMm >= sutunMax - 0.5 &&
    tamGenislikMm / dogalMm > oran + 0.05;
  return { dogalMm, oran, otoTam, tamGenislikMm };
}

// Bu genişliğin altında Times New Roman 9-14pt metinde uzun Türkçe sözcükler
// satıra sığmayıp harf harf alt satıra bölünmeye başlıyor.
export const METIN_ALANI_DAR_ESIK_MM = 30;

export function yeniId() {
  return `soru-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function sayiSinirla(value: number, min: number, max: number) {
  if (Number.isNaN(value)) return min;
  return Math.min(max, Math.max(min, value));
}

export function htmlToText(html?: string) {
  if (!html) return "";
  return html
    .replace(/<br\s*\/?\s*>/gi, "\n")
    .replace(/<\/(p|div)>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    // RichTextEditor alt/üst simgeden çıkarken imleç işaretçisi olarak sıfır
    // genişlikli boşluk (U+200B) bırakıyor. trim() bunu silmediği için görünüşte
    // bomboş bir soru "içerik var" sayılıp kaydedilebiliyordu.
    .replace(/[\u200B\uFEFF]/g, "")
    .trim();
}

export function trBuyuk(value: string, fallback: string) {
  return (value.trim() || fallback).toLocaleUpperCase("tr-TR");
}

/**
 * Madde/şık harfi.
 *
 * TEST KİPİNDE ALFABE FARKLI ve bu bir tercih değil, ZORUNLULUK: cevap
 * anahtarı `SoruOgesi.dogruSik` üzerinden A–E ile çalışıyor. Türk alfabesi
 * sırası (a, b, c, Ç, d…) kullanılırsa kâğıttaki 4. şık "ç", 5. şık "d"
 * oluyor; anahtar ise aynı şıklara "D" ve "E" diyor.
 *
 * Bu SESSİZ ve YANLIŞ PUANLAMA üretiyordu: anahtarda "D" gören öğretmen
 * kâğıtta "d"yi arar ve 5. şıkkı doğru sayar, oysa kastedilen 4. şıktır.
 * Gerçek baskı çıktısında görüldü (30 soruluk test, anahtar "29) E" diyor
 * ama kâğıtta E diye bir şık yok).
 *
 * YAZILI kipi DEĞİŞMEDİ: oradaki a/b/c/ç alt maddeleri cevap anahtarına
 * bağlı değil ve Türkçe sıralama doğru olan.
 */
export const TEST_SIK_HARFLERI = "ABCDE";

/** Şık/madde harf biçimi. `buyuk` = A) B) C) D) E); `kucuk` = a) b) c) …
 *  Verilmezse kipin kendi varsayılanı: test → buyuk, yazılı → kucuk. */
export type SikBicimi = "buyuk" | "kucuk";
/** `otomatik` = kısa şıklar yer elverdikçe yan yana/çok sütun dizilir (sayfa
 *  tasarrufu); `liste` = her şık ayrı satır (sorunun kendi sütun ayarı geçerli). */
export type SikDuzeni = "liste" | "otomatik";

export function maddeHarfi(index: number, testModu?: boolean, sikBicimi?: SikBicimi) {
  const bicim: SikBicimi = sikBicimi ?? (testModu ? "buyuk" : "kucuk");
  if (bicim === "buyuk") {
    // Test kipinde yalnız A–E (cevap anahtarıyla birebir); sonrası sayı.
    const sinir = testModu ? TEST_SIK_HARFLERI.length : 26;
    if (index < sinir) return "ABCDEFGHIJKLMNOPQRSTUVWXYZ"[index];
    return `${index + 1}`;
  }
  // Test kipinde küçük harf Latin sırasıdır (a b c d e): Türk alfabesi 4./5.
  // şıkkı "ç"/"d" yapıp cevap anahtarıyla ayrıştırırdı (bkz. yukarıdaki açıklama).
  if (testModu) return index < 26 ? "abcdefghijklmnopqrstuvwxyz"[index] : `${index + 1}`;
  if (index < MADDE_HARFLERI.length) return MADDE_HARFLERI[index];
  return `m${index + 1}`;
}

/**
 * Bir sorunun şıklarının kaç sütunda dizileceği. Sorunun kendi `maddeKolon`u 1
 * ve düzen "otomatik" ise kısa şıklar yan yana dizilir: A–E şıklı kısa bir test
 * sorusu 5 satır yerine 1–3 satır tutar. Hiçbir şık metni kısaltılmaz; sığacak
 * sütun sayısı SIĞDIRILAMIYORSA 1'de kalınır (eski davranış).
 * Satır içi çizim/denklem/tablo içeren şıklar "geniş" sayılır.
 */
/** Otomatik çok sütunlu şık dizilimindeki sütun arası boşluk (mm). */
export const OTOMATIK_SUTUN_ARASI_MM = 3;

export function etkinMaddeKolon(
  soru: Pick<SoruOgesi, "maddeler" | "maddeKolon" | "punto">,
  icerikGenislikMm: number,
  sikDuzeni: SikDuzeni | undefined,
): number {
  const n = soru.maddeler.length;
  if (soru.maddeKolon > 1 || sikDuzeni !== "otomatik" || n < 2) return soru.maddeKolon;
  const harfMm = soru.punto * PT_MM * 0.5;
  let enUzunMm = 0;
  for (const madde of soru.maddeler) {
    const html = madde.metinHtml ?? "";
    if (/<(table|ul|ol|br)\b|<\/p>\s*<p/i.test(html)) return 1;
    const gorsel = (html.match(/<img\b/gi) ?? []).length * 16;
    const metin = htmlToText(html).trim();
    if (metin.includes("\n")) return 1;
    enUzunMm = Math.max(enUzunMm, (metin.length + gorsel) * harfMm);
  }
  const mevcutMm = Math.max(20, icerikGenislikMm - 7);
  const sutunMm = 7 + 1.5 + enUzunMm + OTOMATIK_SUTUN_ARASI_MM; // harf alanı + boşluk + metin + sütun arası
  let k = Math.min(n, 5, Math.floor((mevcutMm + OTOMATIK_SUTUN_ARASI_MM) / sutunMm));
  // Satırlar dengeli dolsun: 5 şık 4 sütuna sığıyorsa "4 + 1" yerine "3 + 2".
  if (k > 1 && k < n && n % k !== 0) k = Math.ceil(n / Math.ceil(n / k));
  return Math.max(1, k);
}

export function hizalamaJustify(hizalama: Hizalama): CSSProperties["justifyContent"] {
  if (hizalama === "orta") return "center";
  if (hizalama === "sag") return "flex-end";
  return "flex-start";
}

export function soruPuani(soru: SoruOgesi): number | null {
  const puanliMaddeler = soru.maddeler.filter((madde) => madde.puan != null);
  if (puanliMaddeler.length > 0) {
    return puanliMaddeler.reduce((toplam, madde) => toplam + (madde.puan ?? 0), 0);
  }
  return soru.puan;
}

export function mantiksalSoruId(soru: SoruOgesi): string {
  return soru.logicalQuestionId ?? soru.paketId ?? soru.id;
}

export function mantiksalSoruGruplari(sorular: SoruOgesi[]): SoruOgesi[][] {
  const gruplar: SoruOgesi[][] = [];
  const indeksler = new Map<string, number>();
  for (const soru of sorular) {
    const kimlik = mantiksalSoruId(soru);
    const indeks = indeksler.get(kimlik);
    if (indeks === undefined) {
      indeksler.set(kimlik, gruplar.length);
      gruplar.push([soru]);
    } else {
      gruplar[indeks].push(soru);
    }
  }
  for (const grup of gruplar) {
    if (grup.length > 1) grup.sort((a, b) => (a.paketSira ?? 0) - (b.paketSira ?? 0));
  }
  return gruplar;
}

export function mantiksalSoruSiraHaritasi(sorular: SoruOgesi[]): Map<string, number> {
  const harita = new Map<string, number>();
  mantiksalSoruGruplari(sorular).forEach((grup, index) => {
    for (const soru of grup) harita.set(soru.id, index + 1);
  });
  return harita;
}

export function puanlariMantiksalEsitDagit(sorular: SoruOgesi[]): SoruOgesi[] {
  const gruplar = mantiksalSoruGruplari(sorular);
  if (gruplar.length === 0) return sorular;
  const taban = Math.floor(100 / gruplar.length);
  const artan = 100 - taban * gruplar.length;
  return gruplar.flatMap((grup, index) =>
    grup.map((soru, parcaIndex) => ({
      ...soru,
      puan: parcaIndex === 0 ? taban + (index < artan ? 1 : 0) : null,
      maddeler: soru.maddeler.map((madde) => ({ ...madde, puan: null })),
    })),
  );
}

export function mantiksalSoruGrubunuSil(sorular: SoruOgesi[], soruId: string): SoruOgesi[] {
  const hedef = sorular.find((soru) => soru.id === soruId);
  if (!hedef) return sorular;
  const logicalId = mantiksalSoruId(hedef);
  return sorular.filter((soru) => mantiksalSoruId(soru) !== logicalId);
}

export function mantiksalSoruGrubunuTasi(
  sorular: SoruOgesi[],
  soruId: string,
  yon: "yukari" | "asagi",
): SoruOgesi[] {
  const gruplar = mantiksalSoruGruplari(sorular);
  const index = gruplar.findIndex((grup) => grup.some((soru) => soru.id === soruId));
  const hedef = yon === "yukari" ? index - 1 : index + 1;
  if (index < 0 || hedef < 0 || hedef >= gruplar.length) return sorular;
  const kopya = [...gruplar];
  const [tasinan] = kopya.splice(index, 1);
  kopya.splice(hedef, 0, tasinan);
  return kopya.flat();
}

export function mantiksalSoruGrubunuHedefeTasi(
  sorular: SoruOgesi[],
  kaynakId: string,
  hedefId: string,
): SoruOgesi[] {
  const gruplar = mantiksalSoruGruplari(sorular);
  const kaynakIndex = gruplar.findIndex((grup) => grup.some((soru) => soru.id === kaynakId));
  const hedefIndex = gruplar.findIndex((grup) => grup.some((soru) => soru.id === hedefId));
  if (kaynakIndex < 0 || hedefIndex < 0 || kaynakIndex === hedefIndex) return sorular;
  const kopya = [...gruplar];
  const [tasinan] = kopya.splice(kaynakIndex, 1);
  kopya.splice(hedefIndex, 0, tasinan);
  return kopya.flat();
}

export function deterministikKaristir<T>(liste: T[], seed: number) {
  const kopya = [...liste];
  let durum = seed || 1;
  function rastgele() {
    durum = (durum * 1664525 + 1013904223) >>> 0;
    return durum / 4294967296;
  }
  for (let i = kopya.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rastgele() * (i + 1));
    [kopya[i], kopya[j]] = [kopya[j], kopya[i]];
  }
  return kopya;
}

// B Grubu karıştırması aynı paketId'ye sahip soruları (Ders Kitabı'ndan gelen
// çok sayfalı tek mantıksal soru) birim olarak taşır — düz deterministikKaristir
// her SoruOgesi'ni bağımsız karıştırdığından paket sayfaları kağıtta birbirinden
// kopardı. Paketsiz sorular tek elemanlı grup olduğundan davranış değişmez.
export function paketFarkindaKaristir(liste: SoruOgesi[], seed: number): SoruOgesi[] {
  return deterministikKaristir(mantiksalSoruGruplari(liste), seed).flat();
}

/**
 * Soru Havuzu'nda işaretli olup sınavda BOŞ kalan doğru şıkları bulur.
 *
 * NEDEN VAR: `dogruSik` havuzdan sınava aktarım ANINDA kopyalanıyor
 * (kirpmaGom → gorselSoruYap). Öğretmen soruyu cevapsız gönderip cevabı
 * sonradan havuzda işaretlerse o bilgi sınava hiç ulaşmıyordu — ne senkron
 * ne uyarı vardı, soru cevap anahtarına sessizce girmiyordu.
 *
 * ELLE İŞARETLENMİŞ ŞIK ADAY DEĞİLDİR. Bu bir tercih değil, bu depodaki
 * yerleşik kural: §17'de senkron akışı için "kaynak: elle bir notun üstüne
 * sormadan yazılmaz" diye konmuştu. Sınavda bilerek farklı işaretlenmiş bir
 * şıkkı havuzdan gelen değerle ezmek aynı hatanın bu moduldeki hâli olurdu.
 */
export function havuzdanEksikCevaplar(
  sorular: SoruOgesi[],
  havuzMetalari: Record<string, { dogruSik?: string } | undefined>,
): { soruId: string; sik: string }[] {
  return sorular.flatMap((soru) => {
    if (soru.dogruSik) return [];
    const havuzSik = soru.kirpmaId ? havuzMetalari[soru.kirpmaId]?.dogruSik : undefined;
    return havuzSik ? [{ soruId: soru.id, sik: havuzSik }] : [];
  });
}

/** `havuzdanEksikCevaplar` sonucunu uygular. Boş olmayan şıkka DOKUNMAZ:
 *  liste üretildikten sonra öğretmen elle işaretlemiş olabilir. */
export function eksikCevaplariUygula(
  sorular: SoruOgesi[],
  eksikler: { soruId: string; sik: string }[],
): SoruOgesi[] {
  const harita = new Map(eksikler.map((k) => [k.soruId, k.sik]));
  if (harita.size === 0) return sorular;
  return sorular.map((soru) =>
    !soru.dogruSik && harita.has(soru.id)
      ? { ...soru, dogruSik: harita.get(soru.id) }
      : soru,
  );
}
