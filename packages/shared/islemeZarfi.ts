// packages/shared/islemeZarfi.ts — telefon ↔ masaüstü taşıma sözleşmesi.
//
// İKİ YÖN, İKİ AYRI PAKET:
//   ListePaketi  bilgisayar → telefon. İSİM İÇERİR (öğretmen adı görmeden
//                işaretleyemez), bu yüzden ÜRETİLİRKEN PAROLALANIR.
//   IslemeZarfi  telefon → bilgisayar. İSİM TAŞIMAZ; yalnız Okul No + kriter +
//                değer. Telefon kaybolsa açığa çıkan şey bir sınıf listesinden
//                ibaret kalsın diye böyle (bkz. MOBIL-HIZLI-ISLEME-PLANI.md §10).
//
// NEDEN Okul No, neden `ogrenciId` değil: `Ogrenci.no` types.ts'te "DEĞİŞMEZ
// ANAHTAR" diye işaretli ve e-Okul/MEBİ akışlarının tamamı onunla eşleşiyor.
// İç id iki cihaz arasında kayabilir. `sinifId` yine de taşınır, çünkü aynı
// okul no farklı sınıflarda tekrar edebilir.
//
// Bu dosya SAF ve bağımlılıksızdır: hem `apps/desktop` (Vite/Tauri) hem de
// `apps/mobil` (PWA) aynı kaynağı import eder. DOM, Node ya da Tauri API'si
// kullanma — testler bunu doğrudan Node'da çalıştırıyor.

export const ISLEME_ZARFI_FORMAT = "oa-isleme-zarfi" as const;
export const ISLEME_ZARFI_SURUMU = 2 as const;
export const LISTE_PAKETI_FORMAT = "oa-liste-paketi" as const;
export const LISTE_PAKETI_SURUMU = 2 as const;

/** Zarfın ham metin boyutu sınırı. Köprüdeki 1 MiB sınırının (src-tauri
 *  lib.rs) emsali; zarf ondan çok daha küçük olduğu için cömert. */
export const ZARF_AZAMI_BAYT = 2 * 1024 * 1024;
export const ZARF_AZAMI_GUN = 400;
export const ZARF_AZAMI_ISTISNA = 500;
export const ZARF_AZAMI_ODEV = 200;
export const ZARF_AZAMI_ODEV_PUANI = 500;

// ─── Telefon → bilgisayar ───────────────────────────────────────────────────

export interface ZarfIstisna {
  /** Okul No. Ogrenci.no ile birebir eşleşir. */
  no: string;
  kriterId: number;
  /** GunlukKayit.deger ile aynı ham değer (normalize core/ içinde yapılır). */
  deger: number;
  onceki?: number | null;
}

export interface ZarfGun {
  sinifId: number;
  /** "2026-09-09" — yerel günün ISO tarih kısmı. */
  tarih: string;
  donem: 1 | 2;
  /** BOŞ OLABİLİR ve bu anlamlıdır: "baktım, hepsi tamamdı". Kural 1'de
   *  istisnasız gün hiç kayıt üretmediği için bu ayrım yalnız GunlukIslendi
   *  iziyle yapılabiliyor (bkz. types.ts::GunlukIslendi). */
  istisnalar: ZarfIstisna[];
  silinenler?: Array<{ no: string; kriterId: number; onceki: number }>;
  /** "Ders yapılmadı" nedeni (bkz. DERS_YAPILMADI_NEDENLERI). Varsa `istisnalar`
   *  BOŞ olmak zorunda: işaret alınan ders yapılmıştır. Opsiyonel alan — eski
   *  masaüstü bilmediği alanı yok sayar, eski telefon hiç göndermez. */
  yapilmadi?: string;
  /** "Yok" (derse gelmedi) öğrencilerin okul numaraları — o günün TAM listesi
   *  (masaüstü sınıf+tarih için ezer). Bu öğrencilerin o gün işareti olamaz.
   *  Opsiyonel: eski telefon göndermez (masaüstü dokunmaz), eski masaüstü yok sayar. */
  gelmedi?: string[];
}

/** Masaüstü (db/repo.ts) ve telefon aynı listeyi gösterir. */
export const DERS_YAPILMADI_NEDENLERI = ["Resmî tatil", "Gezi / etkinlik", "Rapor / izin", "Sınav", "Diğer"] as const;

/** Bir ödevin telefonda girilen puanları. Ödevin KENDİSİ telefonda açılmaz
 *  (yalnız notlama) — `odevId` liste paketinden gelir. */
export interface ZarfOdevPuani {
  no: string;
  /** puan modu: 0..100 | "G" · işaret modu: "+" | "-" (bkz. types.ts::OdevPuani) */
  puan: number | "G" | "+" | "-";
  onceki?: number | "G" | "+" | "-" | null;
}

export interface ZarfOdev {
  odevId: number;
  sinifId: number;
  puanlar: ZarfOdevPuani[];
  silinenler?: Array<{ no: string; onceki: number | "G" | "+" | "-" }>;
}

export interface IslemeZarfi {
  format: typeof ISLEME_ZARFI_FORMAT;
  surum: 1 | 2;
  /** Idempotency anahtarı: aynı zarf iki kez içe aktarılırsa ikincisi 0 yazar. */
  zarfId: string;
  olusturma: string;
  /** Üretildiği liste paketinin parmak izi — tazelik uyarısı için (§5). */
  listeParmakIzi: string;
  gunler: ZarfGun[];
  /** Ödev notlaması. SÜRÜM ARTIRILMADI çünkü alan opsiyonel: ödev öncesi
   *  telefonlar bu alanı hiç göndermiyor, ödev öncesi masaüstü de bilmediği
   *  alanı yok sayıyor (doğrulayıcı yalnız tanıdığı alanlara bakıyor). */
  odevler?: ZarfOdev[];
}

// ─── Bilgisayar → telefon ───────────────────────────────────────────────────

export interface ListeOgrencisi {
  no: string;
  adSoyad: string;
}

/** Telefonda notlanabilecek ödev. MEBİ kaynaklı ödevler bu listeye GİRMEZ:
 *  onlar eklentiden senkronla geliyor ve Ödev Defteri'nde salt okunur
 *  (bkz. modules/odev/README.md). */
export interface ListeOdevi {
  id: number;
  ad: string;
  mod: "isaret" | "puan";
  tarih: string;
  sonTarih?: string;
  puanlar?: Record<string, number | "G" | "+" | "-">;
}

export interface ListeSinifi {
  id: number;
  ad: string;
  ogrenciler: ListeOgrencisi[];
  /** Ödev öncesi paketlerde yok; telefon yokluğunu "ödev yok" sayar. */
  odevler?: ListeOdevi[];
  gunler?: Array<{ tarih: string; donem: 1 | 2; isaretler: Record<string, number>; gelmedi?: string[] }>;
  /** Bilgisayarda "ders yapılmadı" işaretli günler (son 90 gün). */
  yapilmadi?: Array<{ tarih: string; neden: string }>;
  /** kriterId → "≈ notuna +0,25" (bu sınıfın işlenen ders sayısına göre).
   *  Yalnız bilgi; telefon hesap yapmaz. */
  isaretEtkisi?: Record<string, string>;
}

export interface ListeKriteri {
  id: number;
  ad: string;
  tip: "durum" | "arti" | "eksi";
  /** Ayarlar'daki puan değeri (arti: +2, eksi: -2). Telefon işareti bu
   *  değerle yazar; eski paketlerde yok → +1/-1 ve masaüstü birleştirirken
   *  kriterin gerçek değerine çevirir (lib/telefonBirlestirme.ts). */
  puan?: number;
}

export interface ListePaketi {
  format: typeof LISTE_PAKETI_FORMAT;
  surum: 1 | 2;
  olusturma: string;
  /** Bu tarihten sonra telefon işleme ekranını açmaz, "listeyi tazele" der. */
  sonKullanma: string;
  donem: 1 | 2;
  kriterler: ListeKriteri[];
  siniflar: ListeSinifi[];
  program?: Array<{sinifId:number;gun:number;sira:number}>;
}

// ─── Doğrulama ──────────────────────────────────────────────────────────────
//
// Zarf GÜVENİLMEZ GİRDİDİR: dosya elle düzenlenmiş, bozulmuş ya da başka bir
// sürümden gelmiş olabilir. Stil ve yardımcılar `apps/desktop/src/lib/
// kopruPayloadDogrulama.ts`'ten alındı — orada da köprüden gelen payload
// repo'ya ulaşmadan önce aynı biçimde süzülüyor.
//
// KIRPMA YOK: sınırı aşan zarf kısaltılmaz, tamamen reddedilir. Yarısı yazılmış
// bir zarf, öğretmenin "aktardım" sanıp eksik veriyle devam etmesi demek olurdu.

const nesne = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);

const metin = (v: unknown, azami = 300): v is string =>
  typeof v === "string" && v.trim().length > 0 && v.length <= azami;

const dizi = (v: unknown, azami: number): v is unknown[] =>
  Array.isArray(v) && v.length <= azami;

const tamsayi = (v: unknown, min = 1, max = Number.MAX_SAFE_INTEGER): v is number =>
  typeof v === "number" && Number.isInteger(v) && v >= min && v <= max;

const okulNo = (v: unknown): v is string => typeof v === "string" && /^\d{1,20}$/.test(v);

const kimlik = (v: unknown): v is string =>
  typeof v === "string" && v.length >= 8 && v.length <= 64 && /^[A-Za-z0-9-]+$/.test(v);

const zamanDamgasi = (v: unknown): v is string =>
  typeof v === "string" && v.length <= 40 && !Number.isNaN(Date.parse(v));

/** "2026-09-09" — hem biçim hem GERÇEK takvim günü. `2026-02-31` biçime uyar
 *  ama gün değildir; Date ile geri çevirip karşılaştırarak eleniyor. */
export function zarfTarihiGecerli(v: unknown): v is string {
  if (typeof v !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return false;
  const d = new Date(`${v}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === v;
}

const deger = (v: unknown): v is number =>
  typeof v === "number" && Number.isFinite(v) && v >= -100 && v <= 100;

const donem = (v: unknown): v is 1 | 2 => v === 1 || v === 2;

function istisnaGecerli(v: unknown): v is ZarfIstisna {
  return nesne(v) && okulNo(v.no) && tamsayi(v.kriterId) && deger(v.deger) &&
    (v.onceki === undefined || v.onceki === null || deger(v.onceki));
}

function gunGecerli(v: unknown): v is ZarfGun {
  return (
    nesne(v) &&
    tamsayi(v.sinifId) &&
    zarfTarihiGecerli(v.tarih) &&
    donem(v.donem) &&
    dizi(v.istisnalar, ZARF_AZAMI_ISTISNA) &&
    v.istisnalar.every(istisnaGecerli) &&
    (v.silinenler === undefined || (dizi(v.silinenler, ZARF_AZAMI_ISTISNA) && v.silinenler.every(x => nesne(x) && okulNo(x.no) && tamsayi(x.kriterId) && deger(x.onceki)))) &&
    (v.yapilmadi === undefined || (metin(v.yapilmadi, 60) && v.istisnalar.length === 0)) &&
    (v.gelmedi === undefined || (dizi(v.gelmedi, 1_000) && v.gelmedi.every(okulNo) && new Set(v.gelmedi).size === v.gelmedi.length
      && (v.yapilmadi === undefined || v.gelmedi.length === 0)
      && !v.istisnalar.some((i) => (v.gelmedi as string[]).includes(i.no))))
  );
}

/** Ödev puanı: puan modunda 0..100 ya da "G"; işaret modunda "+"/"-".
 *  MODA UYGUNLUK BURADA DENETLENMEZ — hangi ödevin hangi modda olduğunu yalnız
 *  masaüstü bilir (liste paketi telefona gitmiş olabilir ama ödevin modu o
 *  arada değişmiş olabilir). Uyumsuz değer birleştirmede atlanır ve raporlanır. */
export function puanDegeriGecerli(p: unknown): p is number | "G" | "+" | "-" {
  return p === "G" || p === "+" || p === "-" || (typeof p === "number" && Number.isFinite(p) && p >= 0 && p <= 100);
}

function odevPuaniGecerli(v: unknown): v is ZarfOdevPuani {
  if (!nesne(v) || !okulNo(v.no)) return false;
  if (v.onceki !== undefined && v.onceki !== null && !puanDegeriGecerli(v.onceki)) return false;
  const p = v.puan;
  if (p === "G" || p === "+" || p === "-") return true;
  return typeof p === "number" && Number.isFinite(p) && p >= 0 && p <= 100;
}

function odevGecerli(v: unknown): v is ZarfOdev {
  return (
    nesne(v) &&
    tamsayi(v.odevId) &&
    tamsayi(v.sinifId) &&
    dizi(v.puanlar, ZARF_AZAMI_ODEV_PUANI) &&
    (v.puanlar.length > 0 || (Array.isArray(v.silinenler) && v.silinenler.length > 0)) &&
    v.puanlar.every(odevPuaniGecerli) &&
    (v.silinenler === undefined || (dizi(v.silinenler, ZARF_AZAMI_ODEV_PUANI) && v.silinenler.every(x => nesne(x) && okulNo(x.no) && puanDegeriGecerli(x.onceki))))
  );
}

/** Geçerliyse zarfın kendisini, değilse `null` döner. Çağıran taraf `null`'u
 *  "bu dosya işleme zarfı değil ya da bozuk" diye gösterir. */
export function islemeZarfiDogrula(v: unknown): IslemeZarfi | null {
  if (!nesne(v)) return null;
  if (v.format !== ISLEME_ZARFI_FORMAT || (v.surum !== 1 && v.surum !== ISLEME_ZARFI_SURUMU)) return null;
  if (!kimlik(v.zarfId) || !zamanDamgasi(v.olusturma) || !metin(v.listeParmakIzi, 128)) return null;
  if (!dizi(v.gunler, ZARF_AZAMI_GUN)) return null;
  if (!v.gunler.every(gunGecerli)) return null;
  if (v.odevler !== undefined) {
    if (!dizi(v.odevler, ZARF_AZAMI_ODEV)) return null;
    if (!v.odevler.every(odevGecerli)) return null;
  }
  // BOŞ ZARF ANLAMSIZ, ama "boş" artık iki bölüme birden bakmak demek: öğretmen
  // o gün sınıf işlemeden yalnız ödev notlamış olabilir (ya da tersi).
  const odevSayisi = Array.isArray(v.odevler) ? v.odevler.length : 0;
  if (v.gunler.length === 0 && odevSayisi === 0) return null;
  return v as unknown as IslemeZarfi;
}

/** Ham METİNDEN doğrular. Boyut kapısı JSON.parse'tan ÖNCE: 50 MiB'lık bir
 *  dosyayı ayrıştırmaya kalkmak arayüzü dondurur. */
export function islemeZarfiAyristir(ham: string): IslemeZarfi | null {
  if (typeof ham !== "string" || ham.length === 0) return null;
  if (ham.length > ZARF_AZAMI_BAYT) return null;
  try {
    return islemeZarfiDogrula(JSON.parse(ham) as unknown);
  } catch {
    return null;
  }
}

function kriterGecerli(v: unknown): v is ListeKriteri {
  return (
    nesne(v) && tamsayi(v.id) && metin(v.ad, 200) &&
    (v.tip === "durum" || v.tip === "arti" || v.tip === "eksi") &&
    (v.puan === undefined || deger(v.puan))
  );
}

function listeOdeviGecerli(v: unknown): v is ListeOdevi {
  return (
    nesne(v) && tamsayi(v.id) && metin(v.ad, 300) &&
    (v.mod === "isaret" || v.mod === "puan") &&
    zarfTarihiGecerli(v.tarih) &&
    (v.sonTarih === undefined || zarfTarihiGecerli(v.sonTarih)) &&
    (v.puanlar === undefined || (nesne(v.puanlar) && Object.keys(v.puanlar).length <= 1000 && Object.entries(v.puanlar).every(([no, p]) => okulNo(no) && puanDegeriGecerli(p))))
  );
}

function listeSinifiGecerli(v: unknown): v is ListeSinifi {
  return (
    nesne(v) && tamsayi(v.id) && metin(v.ad, 100) &&
    dizi(v.ogrenciler, 1_000) &&
    v.ogrenciler.every((o) => nesne(o) && okulNo(o.no) && metin(o.adSoyad, 200)) &&
    (v.gunler === undefined || (dizi(v.gunler, 400) && v.gunler.every(g => nesne(g) && zarfTarihiGecerli(g.tarih) && donem(g.donem) && nesne(g.isaretler) && Object.keys(g.isaretler).length <= 10000 && Object.entries(g.isaretler).every(([k, v]) => /^\d{1,20}\|\d+$/.test(k) && deger(v)) && (g.gelmedi === undefined || (dizi(g.gelmedi, 1_000) && g.gelmedi.every(okulNo)))))) &&
    (v.odevler === undefined ||
      (dizi(v.odevler, ZARF_AZAMI_ODEV) && v.odevler.every(listeOdeviGecerli))) &&
    (v.yapilmadi === undefined || (dizi(v.yapilmadi, 400) && v.yapilmadi.every(y => nesne(y) && zarfTarihiGecerli(y.tarih) && metin(y.neden, 60)))) &&
    (v.isaretEtkisi === undefined || (nesne(v.isaretEtkisi) && Object.keys(v.isaretEtkisi).length <= 200 && Object.entries(v.isaretEtkisi).every(([k, x]) => /^\d{1,9}$/.test(k) && metin(x, 40))))
  );
}

export function listePaketiDogrula(v: unknown): ListePaketi | null {
  if (!nesne(v)) return null;
  if (v.format !== LISTE_PAKETI_FORMAT || (v.surum !== 1 && v.surum !== LISTE_PAKETI_SURUMU)) return null;
  if (!zamanDamgasi(v.olusturma) || !zamanDamgasi(v.sonKullanma) || !donem(v.donem)) return null;
  if (!dizi(v.kriterler, 200) || !v.kriterler.every(kriterGecerli)) return null;
  if (!dizi(v.siniflar, 100) || v.siniflar.length === 0) return null;
  if (!v.siniflar.every(listeSinifiGecerli)) return null;
  const siniflar=v.siniflar as Array<{id:number}>;
  if(v.program!==undefined&&(!Array.isArray(v.program)||v.program.length>1000||!v.program.every((p:unknown)=>nesne(p)&&Number.isInteger(p.sinifId)&&siniflar.some((s)=>s.id===p.sinifId)&&Number.isInteger(p.gun)&&Number(p.gun)>=1&&Number(p.gun)<=7&&Number.isInteger(p.sira)&&Number(p.sira)>=1&&Number(p.sira)<=20)))return null;
  return v as unknown as ListePaketi;
}

/** Liste paketinin parmak izi bu METİNDEN hesaplanır (sha256). Alan sırası
 *  değişse bile aynı izin çıkması için gövde burada düzleştiriliyor —
 *  JSON.stringify anahtar sırasını korur, dolayısıyla nesneyi doğrudan
 *  stringify etmek makineden makineye farklı iz üretebilirdi. */
export function listeParmakIziGovdesi(paket: ListePaketi): string {
  const sirala = (v: unknown): unknown => {
    if (Array.isArray(v)) return v.map(sirala);
    if (v && typeof v === "object") return Object.fromEntries(Object.entries(v).sort(([a], [b]) => a.localeCompare(b)).map(([k, x]) => [k, sirala(x)]));
    return v;
  };
  // Süre ve üretim tarihi metaveridir; her yenilemede ayrıca kaydedilir.
  return JSON.stringify(sirala({ donem: paket.donem,
    kriterler: [...paket.kriterler].sort((a,b) => a.id-b.id),
    siniflar: paket.siniflar.map(s => ({ ...s,
      ogrenciler: [...s.ogrenciler].sort((a,b) => a.no.localeCompare(b.no)),
      odevler: [...(s.odevler ?? [])].sort((a,b) => a.id-b.id),
      gunler: [...(s.gunler ?? [])].sort((a,b) => a.tarih.localeCompare(b.tarih)),
    })).sort((a,b) => a.id-b.id),
  }));
}
