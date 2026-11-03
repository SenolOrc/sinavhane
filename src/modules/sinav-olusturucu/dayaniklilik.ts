import type { SinavTaslagi, SoruOgesi } from "./types";
import { htmlToText } from "./utils";
import { parcaOzeti } from "./denklemOzet";
import type { DenklemBelgesi } from "./denklem/tipler";
import { aramaIcinKucult } from "@/lib/turkceMetin";

export type SoruListeFiltreleri = {
  arama: string;
  konu: string;
};

export type SiraliSoru = { soru: SoruOgesi; asilIndex: number };

/** Eşitlik kıyaslaması için. Konu süzgeci iki DEPOLANMIŞ değeri karşılaştırır
 *  (açılır liste zaten mevcut konulardan kuruluyor), bu yüzden burada ı/i
 *  katlaması yapılmaz — gerçekten farklı iki konu adı eşit sayılmasın. */
function normalize(deger: string | undefined): string {
  return (deger ?? "").toLocaleLowerCase("tr-TR").trim();
}

/**
 * ARAMA için. Eşitlikten farkı bilinçli: `toLocaleLowerCase("tr-TR")` tek
 * başına yetmiyor, büyük "I" Türkçe'de NOKTASIZ "ı"ya iniyor. Öğretmen
 * "FIZIK" yazdığında "Fizik" içeren soru bulunamıyordu — Caps Lock açık ya da
 * başlığı büyük harfle yazan biri için arama sessizce çalışmıyordu.
 * Katlama `@/lib/turkceMetin`'de; denklem editörü ve İçerik Hazırlama'nın
 * aramaları da aynı kapıdan geçiyor.
 */
function aramaIcin(deger: string | undefined): string {
  return aramaIcinKucult((deger ?? "").trim());
}

/**
 * Listede sorunun yerine geçen kısa metin.
 *
 * Görsel sorularda gövde metni YOK ve burası eskiden hepsine düpedüz
 * "Görsel soru" yazıyordu — PDF'ten ya da Soru Havuzu'ndan gelen bir sınavda
 * liste "Görsel soru / Görsel soru / Görsel soru…" hâline geliyor, yani soru
 * listesi tamamen ayırt edilemez oluyordu. Kesilme değil ASIL sorun buydu.
 *
 * Sıra bilerek böyle: paket başlığı (öğretmenin kendi verdiği ad) → kaynak
 * (“Palme Mat 9, s. 147”) → dosya adı. Hiçbiri yoksa eski metne düşülür.
 */
export function soruOzetMetni(soru: SoruOgesi) {
  const kok = listeMetni(soru.tur === "metin" ? soru.metinHtml : soru.altMetinHtml);
  if (kok) return kok.slice(0, 70);
  if (soru.tur === "gorsel") {
    const kaynak =
      soru.kaynakAd ??
      (soru.kaynakSayfaNo != null ? `Sayfa ${soru.kaynakSayfaNo}` : undefined);
    return (soru.paketBasligi || kaynak || soru.dosyaAdi || "Görsel soru").slice(0, 70);
  }
  return "Metin soru";
}

/** Denklem belgesinin tek satırlık okunur özeti ("x²+…"); boşsa "". */
export function denklemKisaMetni(belge: unknown, azami = 28): string {
  const parcalar = (belge as DenklemBelgesi | undefined)?.parcalar;
  if (!Array.isArray(parcalar) || parcalar.length === 0) return "";
  let ozet = "";
  try {
    ozet = parcalar.map(parcaOzeti).join("").replace(/\s+/g, " ").trim();
  } catch {
    return "";
  }
  return ozet.length > azami ? `${ozet.slice(0, azami - 1)}…` : ozet;
}

/**
 * Listede göstermek için metin HTML'ini düz metne çevirir; satır içi denklemler
 * ("<img data-denklem>") düşmek yerine kısaltılmış özetiyle yazılır. Yoksa
 * "integralinin değeri kaçtır?" gibi denklemi kaybolmuş, anlamsız bir kök kalıyor.
 */
export function listeMetni(html: string | undefined): string {
  if (!html) return "";
  const denklemli = html.replace(/<img\b[^>]*\bdata-denklem="([^"]*)"[^>]*>/gi, (_t, ham: string) => {
    try {
      const ozet = denklemKisaMetni(JSON.parse(decodeURIComponent(ham)), 24);
      return ozet ? ` ⟨${ozet}⟩ ` : " ⟨denklem⟩ ";
    } catch {
      return " ⟨denklem⟩ ";
    }
  });
  return htmlToText(denklemli).replace(/\s+/g, " ").trim();
}

/**
 * Soru LİSTESİNDE görünen etiket. Metni olmayan çizim/denklem soruları dosya adı
 * ("cizim.png", "denklem.png") yerine sıralı ad alır: "Çizim 2", "Denklem 1".
 * Yalnız denklemden oluşan sorularda denklemin kısaltılmış metni de gösterilir
 * ("Denklem: x²+…"). Dosya adı veride aynen kalır; yalnız görünen etiket değişir.
 * `azami`: karakter sınırı; liste satırı 70, `title` ipucu daha uzun alır.
 */
export function soruListeEtiketi(soru: SoruOgesi, sorular: SoruOgesi[], azami = 70) {
  const kok = listeMetni(soru.tur === "metin" ? soru.metinHtml : soru.altMetinHtml);
  if (kok) return kok.slice(0, azami);
  const etiketle = (ad: string, uygun: (s: SoruOgesi) => boolean) => {
    const sira = sorular.filter(uygun).findIndex((s) => s.id === soru.id) + 1;
    return sira > 0 ? `${ad} ${sira}` : ad;
  };
  if (soru.tur === "gorsel" && soru.denklemVerisi) {
    const ozet = denklemKisaMetni(soru.denklemVerisi, Math.min(azami, 40));
    if (ozet) return `Denklem: ${ozet}`.slice(0, azami);
    return etiketle("Denklem", (s) => s.tur === "gorsel" && !!s.denklemVerisi && !htmlToText(s.altMetinHtml));
  }
  if (soru.tur === "gorsel" && soru.cizimVerisi) {
    return etiketle("Çizim", (s) => s.tur === "gorsel" && !!s.cizimVerisi && !s.denklemVerisi && !htmlToText(s.altMetinHtml));
  }
  return soruOzetMetni(soru);
}

export function soruListesiniFiltrele(
  sorular: SoruOgesi[],
  filtreler: SoruListeFiltreleri,
): SiraliSoru[] {
  const arama = aramaIcin(filtreler.arama);
  return sorular
    .map((soru, asilIndex) => ({ soru, asilIndex }))
    .filter(({ soru }) => {
      const aranabilir = aramaIcin([
        soru.metinHtml,
        soru.altMetinHtml,
        soru.dosyaAdi,
        soru.kaynakAd,
        soru.kaynakSinif,
        soru.kaynakDers,
        soru.kaynakKonu,
        soru.kazanim,
      ].filter(Boolean).join(" ").replace(/<[^>]+>/g, " "));
      return (
        (!arama || aranabilir.includes(arama)) &&
        (!filtreler.konu || normalize(soru.kaynakKonu) === normalize(filtreler.konu))
      );
    });
}

export function sanalPencereHesapla<T>(
  liste: T[],
  scrollTop: number,
  viewportYuksekligi: number,
  satirYuksekligi: number,
  overscan = 5,
) {
  const baslangic = Math.max(0, Math.floor(scrollTop / satirYuksekligi) - overscan);
  const bitis = Math.min(
    liste.length,
    Math.ceil((scrollTop + viewportYuksekligi) / satirYuksekligi) + overscan,
  );
  return {
    baslangic,
    bitis,
    ustBosluk: baslangic * satirYuksekligi,
    altBosluk: Math.max(0, (liste.length - bitis) * satirYuksekligi),
    dilim: liste.slice(baslangic, bitis),
  };
}

export async function sinirliAllSettled<T, R>(
  ogeler: T[],
  eszamanlilik: number,
  islem: (oge: T, index: number) => Promise<R>,
): Promise<PromiseSettledResult<R>[]> {
  const limit = Math.max(1, Math.floor(eszamanlilik));
  const sonuc: PromiseSettledResult<R>[] = [];
  for (let bas = 0; bas < ogeler.length; bas += limit) {
    const parca = ogeler.slice(bas, bas + limit);
    const parcaSonucu = await Promise.allSettled(
      parca.map((oge, index) => islem(oge, bas + index)),
    );
    sonuc.push(...parcaSonucu);
  }
  return sonuc;
}

export function taslakAnlamliMi(taslak: SinavTaslagi): boolean {
  if ((taslak.sorular ?? []).length > 0) return true;
  const b = taslak.baslik;
  if (
    [
      b.okulAdi,
      b.sinifSeviyesi,
      b.donem,
      b.yaziliNo,
      b.ders,
      b.tarih,
      b.sureDakika,
    ].some((v) => v?.trim())
  ) return true;
  if (b.logoDataUrl) return true;
  // `logoBoyut` BİLEREK listede yok. Logosuz bir belgede boyutun çıktıda
  // karşılığı yok; saymak, hiçbir şey göstermeyen boş bir taslağı açılışta
  // "yüklenmeye değer" ilan ederdi. Var olan bir sınav için kayıp da doğmuyor:
  // bu süzgeç autosave'i değil AÇILIŞTAKİ yükleme kararını yönetiyor (bkz.
  // SinavOlusturucuScreen aktifSinaviHazirla), logo varken de üstteki satır
  // zaten true dönüyor.
  const a = taslak.ayarlar;
  return (
    (a.ogretmenler ?? []).some((v) => v.trim()) ||
    a.kenarBosluk !== 10 ||
    a.varsayilanSoruBosluk !== 32 ||
    a.sayfaNoGoster === false ||
    a.sayfaDuzeni !== "cift" ||
    a.sutunAra !== 8 ||
    a.sutunAyirici === false ||
    a.bGrubuAktif === true ||
    a.sinavTuru === "test" ||
    !!a.testBaslik?.trim()
  );
}

export async function yazdirmaKaynaklariniBekle(
  kok: ParentNode,
  timeoutMs = 15_000,
): Promise<void> {
  const fontlar = typeof document !== "undefined" ? document.fonts : undefined;
  const gorseller = Array.from(kok.querySelectorAll("img"));
  const hazirlik = Promise.all([
    fontlar?.ready ?? Promise.resolve(),
    ...gorseller.map(async (gorsel) => {
      if (!gorsel.complete) {
        await new Promise<void>((resolve, reject) => {
          gorsel.addEventListener("load", () => resolve(), { once: true });
          gorsel.addEventListener("error", () => reject(new Error("Bir yazdırma görseli yüklenemedi.")), { once: true });
        });
      }
      if (!gorsel.naturalWidth) throw new Error("Bir yazdırma görseli çözümlenemedi.");
      if (typeof gorsel.decode === "function") await gorsel.decode();
    }),
  ]).then(() => undefined);
  let zamanlayici = 0;
  const zamanAsimi = new Promise<never>((_, reject) => {
    zamanlayici = window.setTimeout(
      () => reject(new Error("Yazdırma görselleri zamanında hazırlanamadı.")),
      timeoutMs,
    );
  });
  try {
    await Promise.race([hazirlik, zamanAsimi]);
  } finally {
    window.clearTimeout(zamanlayici);
  }
}
