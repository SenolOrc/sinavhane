// Tek sayfadan uzun bir METİN sorusunu blok (paragraf/liste) sınırlarında
// sayfalara bölen, saf (DOM'suz) yerleşim yardımcısı.
//
// NEDEN: baskı sayfası sabit yükseklikli + `overflow:hidden` (bkz. SinavKagit),
// yani tek sayfadan uzun bir soru sonunda KESİLİYORDU. Burada soru, yalnız
// yerleşim için, ardışık parçalara ayrılır: her parça `<id>~d<k>` kimliği alır (özgün id ölçüm
// alanında tam hâliyle ölçülmeye devam eder); parça 0 numarayı taşır, devamlar numarasız çizilir ve aynı mantıksal soruya bağlıdır
// (numaralama/cevap anahtarı/puan toplamı özgün listeden yürür, etkilenmez).
//
// GÜVENLİK İLKESİ: yalnız ölçümün güvenilir olduğu durumda bölünür; şüphede
// `null` dönülür ve mevcut "sığmıyor" uyarısı çalışmaya devam eder. Bölünen
// kaynak HTML değil, ekrandaki sanitize edilmiş DOM'un üst düzey çocuklarıdır;
// çocuk sayısı ölçümle birebir tutmuyorsa bölünmez.

import type { SoruOgesi } from "../types";
import { soruPuani, mantiksalSoruId } from "../utils";

/** Üst düzey blokların soru kutusuna göre üst kenarları (mm) ve kutu yüksekliği.
 *  `maddeUstMm`: şık/madde kutularının üst kenarları (yalnız maddeleri soru
 *  gövdesinde alt alta dizili, yani yanında görsel olmayan sorularda ölçülür). */
export type BlokOlcusu = { ustMm: number[]; toplamMm: number; maddeUstMm?: number[] };

/** Parçaların sayfa kapasitesinden ayrılan güvenlik payı (mm): blok araları/
 *  kenar boşluğu çökmesi gibi yuvarlama farklarını karşılar. */
export const BOLME_GUVENLIK_MM = 5;

/** Bölme için en az bu kadar uzun olmalı; kısa soruda DOM ölçümü gereksiz. */
export const BOLME_OLCUM_ESIGI_MM = 100;

export function bolunebilirMi(soru: SoruOgesi): boolean {
  if (soru.tamSayfa || soru.paketId || mantiksalSoruId(soru) !== soru.id) return false;
  if (soru.tur === "metin") return (soru.ekGorseller ?? []).length === 0;
  // Görselli/çizimli soru: görsel ve kök (yan yana ise o satır da) ilk parçada
  // kalır, maddeler her zaman görselin ALTINDA dizildiği için madde sınırında
  // devam eder.
  return soru.maddeler.length > 0;
}

/**
 * `blokHtml[i]`, `olcu.ustMm[i]` konumundaki blok. Parçaları döndürür; bölmeye
 * gerek yoksa/yapılamıyorsa `null`.
 *
 * "Atom" = bölünmez en küçük birim: metin sorusunda her üst düzey blok ve (ölçüm
 * varsa) her madde; görselli soruda baştaki "başlık" (görsel+kök) ve her madde.
 * Kesim yalnız atomlar arasında yapılır; aynı satırdaki (çok sütunlu) maddeler
 * birbirinden ayrılmaz. Ölçüm maddeleri vermiyorsa (eski davranış) maddeler son
 * parçada kalır.
 */
export function metniBol(
  soru: SoruOgesi,
  blokHtml: string[],
  olcu: BlokOlcusu,
  /** 1. sayfadaki (başlıklı, en dar) ve devam sayfalarındaki kapasite (mm).
   *  İlk parça soru nerede başlarsa başlasın güvenli olsun diye 1. sayfa
   *  kapasitesine göre boyutlanır; devam parçaları tam sayfa kapasitesine göre. */
  kapasiteIlkMm: number,
  kapasiteDevamMm: number,
): SoruOgesi[] | null {
  if (!bolunebilirMi(soru)) return null;
  const gorselli = soru.tur === "gorsel";
  const maddeUst = olcu.maddeUstMm;
  const maddeOlcuVar =
    !!maddeUst && maddeUst.length === soru.maddeler.length && maddeUst.length > 0;
  if (gorselli && !maddeOlcuVar) return null;
  const blokSayisi = gorselli ? 1 : blokHtml.length;
  if (!gorselli && olcu.ustMm.length !== blokHtml.length) return null;
  const n = blokSayisi + (maddeOlcuVar ? soru.maddeler.length : 0);
  if (n < 2) return null;
  if (!(olcu.toplamMm + soru.boslukMm > Math.min(kapasiteIlkMm, kapasiteDevamMm))) return null;
  const poz = [
    ...(gorselli ? [0] : olcu.ustMm),
    ...(maddeOlcuVar ? maddeUst! : []),
    olcu.toplamMm,
  ];
  for (let i = 1; i < poz.length; i++) if (!(poz[i] >= poz[i - 1])) return null;
  // `c` = atom c-1 ile c arasındaki sınır. Madde-madde sınırı yalnız YENİ SATIRDA.
  const kesilebilir = (c: number) =>
    c >= n || c < blokSayisi || c === blokSayisi || poz[c] - poz[c - 1] > 0.5;

  const araliklar: [number, number][] = [];
  let a = 0;
  while (a < n) {
    const ust = a === 0 ? 0 : poz[a];
    const kap = (araliklar.length === 0 ? kapasiteIlkMm : kapasiteDevamMm) - BOLME_GUVENLIK_MM;
    let en = -1;
    let ilkKesim = n;
    for (let c = a + 1; c <= n; c++) {
      if (!kesilebilir(c)) continue;
      if (ilkKesim === n && c < n) ilkKesim = c;
      // Son parça soru sonrası boşluğu da taşır (taşma uyarısı onu da sayar).
      if (poz[c] - ust <= kap - (c === n ? soru.boslukMm : 0)) en = c;
      else break;
    }
    // Hiçbir kesim sığmıyorsa en küçük bölünmez parça (taşma uyarısı çıkar).
    const b = en > a ? en : Math.min(n, Math.max(a + 1, ilkKesim));
    araliklar.push([a, b]);
    a = b;
  }
  if (araliklar.length < 2) return null;

  const puan = soruPuani(soru);
  return araliklar.map(([bas, son], k) => {
    const sonParca = k === araliklar.length - 1;
    const blokBas = Math.min(bas, blokSayisi);
    const blokSon = Math.min(son, blokSayisi);
    const maddeBas = Math.max(0, bas - blokSayisi);
    const maddeSon = Math.max(0, son - blokSayisi);
    const maddeler = maddeOlcuVar
      ? soru.maddeler.slice(maddeBas, maddeSon)
      : sonParca
        ? soru.maddeler
        : [];
    const ortak = {
      ...soru,
      id: `${soru.id}~d${k}`,
      maddeler,
      maddeHarfBaslangic: maddeOlcuVar ? maddeBas : 0,
      boslukMm: sonParca ? soru.boslukMm : 0,
      logicalQuestionId: soru.id,
      paketSira: k,
      devamParcasi: k > 0,
      devamKaynakId: soru.id,
      gosterilenPuan: k === 0 ? puan : null,
      bolumBasligi: k === 0 ? soru.bolumBasligi : undefined,
    };
    if (!gorselli) {
      return { ...ortak, metinHtml: blokHtml.slice(blokBas, blokSon).join("") };
    }
    if (k === 0) return ortak;
    // Görselli sorunun devam parçası: yalnız maddeler (görsel ilk parçada kaldı).
    return {
      ...ortak,
      tur: "metin" as const,
      metinHtml: "",
      altMetinHtml: undefined,
      gorselDataUrl: undefined,
      ekGorseller: undefined,
      cizimVerisi: undefined,
      denklemVerisi: undefined,
    };
  });
}

/** Listeyi yerinde genişletir: bölünen sorunun yerine parçaları koyar. */
export function uzunSorulariBol(
  sorular: SoruOgesi[],
  kapasiteIlkMm: number,
  kapasiteDevamMm: number,
  blokAl: (soru: SoruOgesi) => { blokHtml: string[]; olcu: BlokOlcusu } | null,
): SoruOgesi[] {
  let degisti = false;
  const sonuc = sorular.flatMap((soru) => {
    if (!bolunebilirMi(soru)) return [soru];
    const veri = blokAl(soru);
    if (!veri) return [soru];
    const parcalar = metniBol(soru, veri.blokHtml, veri.olcu, kapasiteIlkMm, kapasiteDevamMm);
    if (!parcalar) return [soru];
    degisti = true;
    return parcalar;
  });
  return degisti ? sonuc : sorular;
}
