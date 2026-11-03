// modules/ders-kitabi/lib/kirpmaGom.ts — kırpmayı JPEG olarak belgeye gömme
// ("sınav taslağına gönder" akışı, §4). pdfjs-dist burada YALNIZCA sayfa açmak
// için kullanılır; asıl render packages/shared/pdf-kirpma'daki bölgesel
// yardımcıyla yapılır (canvas hiçbir zaman sayfa-boyutunda ayrılmaz — şişme-karşıtı).
import type { DersKitabiAktarimHatasi, DersKitabiGorselAktarimi, KirpmaKaydi, KitapKaydi } from "@shared/types";
import { sayfaBolgesiniRenderEt, type YapisalPdfSayfa } from "@shared/pdf-kirpma";
import { kitapBul, kirpmaBul } from "../queries";
import { pdfBelgeAc } from "./pdfBelge";
import { paketButunluguBasarisizIdleriniBul } from "./paketButunlugu";
import { soruHavuzMetalariniOku } from "@/lib/soruRozetleri";

// Gömme çözünürlüğü, görselin KÂĞITTA kaplayacağı boyuta göre seçilir; sabit
// tek bir değer yanlış sonuç veriyor.
//
// Küçük kırpma sütun genişliğinde (~84mm) basılıyor: 1400px uzun kenar ≈ 300 DPI.
const HEDEF_UZUN_KENAR_PX = 1400;
// Tam sayfa ise tam genişlikte (~183mm geniş, ~259mm uzun kenar) basılıyor —
// yani aynı piksel sayısı 2,2 kat büyük alana yayılıyor ve 1400px burada ancak
// ~137 DPI ediyor. Kitap sayfasındaki küçük punto okunmaz hale geliyordu
// (2026-07-26'da tam sayfa aktarımı tam genişliğe çıkarıldıktan sonra bildirildi).
// 2400px ≈ 235 DPI: taranmış kitap metni için rahat okunur, JPEG 0.85 ile
// beyaz zeminli bir sayfa ~1 MB'ın altında kalıyor.
const TAM_SAYFA_UZUN_KENAR_PX = 2400;
const JPEG_KALITE = 0.85; // kitap sayfası (beyaz zemin/siyah metin) PNG'ye göre 4-6 kat küçük

function kirpmaDosyaAdi(baslik: string | undefined, sayfa: number): string {
  const temiz = (baslik ?? "").replace(/[\\/:*?"<>|]/g, " ").replace(/\s+/g, " ").trim();
  return `${temiz || `kitap-s${sayfa}`}.jpg`;
}

type PdfBelge = {
  numPages: number;
  getPage: (sayfaNo: number) => Promise<YapisalPdfSayfa>;
  destroy: () => Promise<void>;
};

export type KirpmaGommeIlerlemesi = {
  tamamlanan: number;
  toplam: number;
  kitapAd?: string;
  sayfa?: number;
  kirpmaId?: string;
};

export type KirpmaGommeSecenekleri = {
  onProgress?: (ilerleme: KirpmaGommeIlerlemesi) => void;
  signal?: AbortSignal;
};

function iptalKontrol(signal?: AbortSignal): void {
  if (signal?.aborted) throw new DOMException("Aktarım iptal edildi.", "AbortError");
}

function iptalHatasiMi(err: unknown): boolean {
  return err instanceof DOMException && err.name === "AbortError";
}

/** Aynı kitaptan birden fazla kırpma gömülüyorsa PDF belgesi tek sefer açılır. */
export async function kirpmalariGom(
  kitap: KitapKaydi,
  kirpmalar: KirpmaKaydi[],
  secenek: KirpmaGommeSecenekleri = {},
): Promise<{
 gorseller: DersKitabiGorselAktarimi[]; basarisizlar: DersKitabiAktarimHatasi[] }> {
  if (kirpmalar.length === 0) return { gorseller: [], basarisizlar: [] };
  // Doğru şıklar TEK seferde okunuyor: kırpma başına okumak 60 soruluk bir
  // gönderimde localStorage'ı 60 kez ayrıştırırdı.
  const havuzMetalari = soruHavuzMetalariniOku();
  iptalKontrol(secenek.signal);
  const belge = await pdfBelgeAc(kitap.id) as unknown as PdfBelge;
  try {
    const sonuclar: DersKitabiGorselAktarimi[] = [];
    const basarisizlar: DersKitabiAktarimHatasi[] = [];
    for (const [index, kirpma] of kirpmalar.entries()) {
      const kaynakAd = `${kitap.ad}, s. ${kirpma.sayfa}`;
      try {
        iptalKontrol(secenek.signal);
        const sayfa = await belge.getPage(kirpma.sayfa);
        // Kayan nokta toleransı: kutu 0..1 yazılır ama düzenleme sırasında
        // 0.9998 gibi değerler oluşabiliyor.
        const tamSayfaMi = kirpma.w >= 0.995 && kirpma.h >= 0.995;
        const canvas = await sayfaBolgesiniRenderEt(
          sayfa,
          { x: kirpma.x, y: kirpma.y, w: kirpma.w, h: kirpma.h },
          tamSayfaMi ? TAM_SAYFA_UZUN_KENAR_PX : HEDEF_UZUN_KENAR_PX,
        );
        iptalKontrol(secenek.signal);
        sonuclar.push({
          dataUrl: canvas.toDataURL("image/jpeg", JPEG_KALITE),
          oran: canvas.width / Math.max(1, canvas.height),
          kaynakAd,
          kirpmaId: kirpma.id,
          kitapId: kitap.id,
          sayfa: kirpma.sayfa,
          sinif: kirpma.sinif?.trim() || kitap.sinifSeviyesi?.trim() || undefined,
          ders: kitap.ders?.trim() || undefined,
          konu: kirpma.konu?.trim() || undefined,
          logicalQuestionId: kirpma.paketId ?? kirpma.id,
          dosyaAdi: kirpmaDosyaAdi(kirpma.baslikTahmini, kirpma.sayfa),
          paketId: kirpma.paketId,
          paketSira: kirpma.paketSira,
          paketParcaSayisi: kirpma.paketParcaSayisi,
          paketBasligi: kirpma.baslikTahmini,
          // Kayan nokta toleransi: kutu 0..1 olarak yazilir ama duzenleme
          // sirasinda 0.9998 gibi degerler olusabiliyor.
          tamSayfaMi,
          // Doğru şık havuzda sorunun kendi bilgisi; aktarımla taşınmazsa
          // öğretmen aynı cevabı her sınavda yeniden işaretlemek zorunda
          // kalırdı ve "Cevap Anahtarı" düğmesi pasif kalıyordu.
          dogruSik: havuzMetalari[kirpma.id]?.dogruSik,
        });
      } catch (err) {
        if (iptalHatasiMi(err)) throw err;
        basarisizlar.push({
          kirpmaId: kirpma.id,
          kaynakAd,
          neden: err instanceof Error ? err.message : "Görsel üretilemedi.",
        });
      } finally {
        if (!secenek.signal?.aborted) secenek.onProgress?.({ tamamlanan: index + 1, toplam: kirpmalar.length, kitapAd: kitap.ad, sayfa: kirpma.sayfa, kirpmaId: kirpma.id });
      }
    }
    return { gorseller: sonuclar, basarisizlar };
  } finally {
    await belge.destroy().catch(() => undefined);
  }
}

/** Sepet, birden fazla kitaptan toplanmış kırpmaları içerebilir — kitap başına
 * gruplanıp PDF'i o kitap için tek sefer açar. Silinmiş kırpma/kitap sessizce
 * atlanır (sepet zaten oturumluk bir referans listesi, hata değil). */
export async function sepettekiKirpmalariGom(kirpmaIdler: string[], secenek: KirpmaGommeSecenekleri = {}): Promise<DersKitabiGorselAktarimi[]> {
  return (await sepettekiKirpmalariGomGuvenli(kirpmaIdler, secenek)).gorseller;
}

export type SepetGommeSonucu = {
  gorseller: DersKitabiGorselAktarimi[];
  basarisizIds: string[];
  basarisizlar: DersKitabiAktarimHatasi[];
};

/** Başarılı soruları ve dosyası/kaydı bulunamayanları ayrı döndürür; çağıran yalnız
 * başarılı olanları sepetten temizleyebilir, veri kaybı yaşanmaz. */
export async function sepettekiKirpmalariGomGuvenli(kirpmaIdler: string[], secenek: KirpmaGommeSecenekleri = {}): Promise<SepetGommeSonucu> {
  iptalKontrol(secenek.signal);
  const toplam = kirpmaIdler.length;
  let tamamlanan = 0;
  const ilerlet = (kirpma?: KirpmaKaydi, kitapAd?: string) => {
    tamamlanan += 1;
    secenek.onProgress?.({ tamamlanan, toplam, kitapAd, sayfa: kirpma?.sayfa, kirpmaId: kirpma?.id });
  };
  const kirpmalar = kirpmaIdler
    .map((id) => kirpmaBul(id))
    .filter((k): k is KirpmaKaydi => !!k);
  const basarisizlar: DersKitabiAktarimHatasi[] = kirpmaIdler
    .filter((id) => !kirpmalar.some((k) => k.id === id))
    .map((kirpmaId) => ({ kirpmaId, kaynakAd: "Silinmiş kırpma", neden: "Kırpma kaydı bulunamadı." }));
  for (const kirpmaId of kirpmaIdler.filter((id) => !kirpmalar.some((k) => k.id === id))) {
    iptalKontrol(secenek.signal);
    tamamlanan += 1;
    secenek.onProgress?.({ tamamlanan, toplam, kirpmaId });
  }
  const kitapIdSirasi = [...new Set(kirpmalar.map((k) => k.kitapId))];
  const sonucHaritasi = new Map<string, DersKitabiGorselAktarimi>();
  for (const kitapId of kitapIdSirasi) {
    iptalKontrol(secenek.signal);
    const kitap = kitapBul(kitapId);
    if (!kitap) {
      basarisizlar.push(...kirpmalar.filter((k) => k.kitapId === kitapId).map((k) => ({
        kirpmaId: k.id,
        kaynakAd: `Silinmiş kitap, s. ${k.sayfa}`,
        neden: "Kitap kaydı bulunamadı.",
      })));
      for (const kirpma of kirpmalar.filter((k) => k.kitapId === kitapId)) ilerlet(kirpma, "Silinmiş kitap");
      continue;
    }
    const buKitabinKirpmalari = kirpmalar.filter((k) => k.kitapId === kitapId);
    try {
      const sonuc = await kirpmalariGom(kitap, buKitabinKirpmalari, {
        signal: secenek.signal,
        onProgress: ({ sayfa, kirpmaId }) => {
          const kirpma = buKitabinKirpmalari.find((oge) => oge.id === kirpmaId);
          tamamlanan += 1;
          secenek.onProgress?.({ tamamlanan, toplam, kitapAd: kitap.ad, sayfa: sayfa ?? kirpma?.sayfa, kirpmaId });
        },
      });
      basarisizlar.push(...sonuc.basarisizlar);
      for (const gomulen of sonuc.gorseller) {
        if (gomulen.kirpmaId) sonucHaritasi.set(gomulen.kirpmaId, gomulen);
      }
    } catch (err) {
      if (iptalHatasiMi(err)) throw err;
      basarisizlar.push(...buKitabinKirpmalari.map((k) => ({
        kirpmaId: k.id,
        kaynakAd: `${kitap.ad}, s. ${k.sayfa}`,
        neden: err instanceof Error ? err.message : "Kitap dosyası açılamadı.",
      })));
      for (const kirpma of buKitabinKirpmalari) ilerlet(kirpma, kitap.ad);
    }
  }
  iptalKontrol(secenek.signal);
  // PDF'ler kitap başına yalnız bir kez açılır; çıktı ise kullanıcının Seçilen
  // Sorular sırasına geri dizilir. Böylece A1, B1, A2 sırası kitap gruplamasında
  // A1, A2, B1'e dönüşmez.
  const ilkBasarisizIdSeti = new Set(basarisizlar.map((hata) => hata.kirpmaId));
  const basarisizIdSeti = paketButunluguBasarisizIdleriniBul(kirpmalar, ilkBasarisizIdSeti);
  // Çok sayfalı soru eksik sayfayla sınava/föye gitmemeli. Bir parça
  // üretilemediyse o paketin başarılı parçaları da bu aktarımda geri çekilir;
  // bağımsız diğer soruların kısmi başarısı korunur.
  for (const kirpma of kirpmalar) {
    if (basarisizIdSeti.has(kirpma.id) && !ilkBasarisizIdSeti.has(kirpma.id)) {
      basarisizlar.push({
        kirpmaId: kirpma.id,
        kaynakAd: `${kitapBul(kirpma.kitapId)?.ad ?? "Kitap"}, s. ${kirpma.sayfa}`,
        neden: "Çok sayfalı sorunun bir parçası hazırlanamadığı için paket eksik gönderilmedi.",
      });
    }
  }
  const gorseller = kirpmaIdler
    .filter((id) => !basarisizIdSeti.has(id))
    .map((id) => sonucHaritasi.get(id))
    .filter((gorsel): gorsel is DersKitabiGorselAktarimi => !!gorsel);
  const benzersizBasarisizlar = [...new Map(basarisizlar.map((hata) => [hata.kirpmaId, hata])).values()];
  return {
    gorseller,
    basarisizIds: benzersizBasarisizlar.map((hata) => hata.kirpmaId),
    basarisizlar: benzersizBasarisizlar,
  };
}
