import type { LogoBoyut } from "./types";

export const DONEMLER = ["1. DÖNEM", "2. DÖNEM"];
export const YAZILI_NUMARALARI = ["1. YAZILI", "2. YAZILI", "3. YAZILI"];
export const SINIF_SEVIYELERI = [
  "5. SINIF",
  "6. SINIF",
  "7. SINIF",
  "8. SINIF",
  "9. SINIF",
  "10. SINIF",
  "11. SINIF",
  "12. SINIF",
];

export const A4_GENISLIK_MM = 210;
export const A4_YUKSEKLIK_MM = 297;

/**
 * Kâğıdın YAZDIRMADAKİ yüksekliği — punto cinsinden ve 297 mm'den bir tık kısa.
 *
 * NEDEN: 297 mm yazıldığında her çıktının sonuna BOŞ BİR SAYFA ekleniyordu
 * (N sayfalık sınav N+1 sayfa basılıyor) ve sayfa hizaları da yavaşça
 * kayıyordu. Gerçek WKWebView + NSPrintOperation koşumunda, uygulamanın baskı
 * CSS'inin birebir kopyasıyla ölçüldü (8/12/20/30 sayfa):
 *
 *   297mm     → N+1 sayfa · üst şerit 0,265 → 1,235 mm (kayıyor)
 *   841.89pt  → N+1 sayfa · aynı kayma        (A4 kutusunun tam boyu)
 *   841.7pt   → N+1 sayfa · kayıyor
 *   841.6pt   → N+1 sayfa · kayıyor
 *   841.5pt   → N sayfa   · şerit HER sayfada 0,265 mm (sapma SIFIR)
 *   840pt     → N sayfa ama yerleşim tamamen bozuluyor
 *
 * Yani 297 mm ile 841.5 pt arasındaki 0,1375 mm'lik fark hem boş sayfayı hem
 * kaymayı kaldırıyor. DEVAM §14.3'te denenmemiş diye bırakılan "pt cinsinden
 * yaz" yolu tek başına YETMİYOR (841.89pt = 297mm ile aynı sonucu veriyor);
 * çalışan şey pt'ye geçmek değil, kutunun bir tık ALTINDA kalmak.
 *
 * Sayfa KAPASİTESİ hesabı bilerek 297 mm'de bırakıldı (`layout/a4.ts`):
 * 0,1375 mm, soru yüksekliklerinin yanında ölçülemeyecek kadar küçük ve
 * kapasiteyi oynatmak sayfalamayı — dolayısıyla mevcut sınavların düzenini —
 * değiştirirdi.
 */
export const A4_YAZDIRMA_YUKSEKLIK_PT = 841.5;
export const ILK_SAYFA_BASLIK_YUKSEKLIK_MM = 58;
export const DEVAM_SAYFA_BASLIK_YUKSEKLIK_MM = 0;
export const SAYFA_FOOTER_YUKSEKLIK_MM = 4;

// Kağıdın fiziksel asgari kenar boşluğu. TEK doğruluk kaynağı olmalı: arayüz
// 5 mm'ye izin verirken sayfa Math.max(6, ...) ile çizilip kapasite hesabı ham
// değeri kullandığı için motor sayfada 2 mm fazla yer olduğunu sanıyordu —
// kenarBosluk=5'te sistematik taşma.
export const MIN_KENAR_BOSLUK_MM = 6;
export const MAX_KENAR_BOSLUK_MM = 25;

// Son sayfadaki öğretmen adı + "İmza" bloğu (paddingTop 6 mm + 10pt ad + 8pt
// etiket). Normal akışta çizildiği için kapasiteden düşülmezse dolu bir son
// sayfada son soruyu fiziksel sayfadan taşırıyordu. Öğretmen adı yoksa blok
// hiç render edilmez, o yüzden çağıran tarafta koşullu geçilir.
export const OGRETMEN_IMZA_YUKSEKLIK_MM = 14;

// Antetteki logo kutusunun kenar uzunluğu. Eski sabit 14 mm öğretmenin
// bildirdiği gibi küçüktü; ölçüldü, büyütmenin sayfaya maliyeti YOK: logo
// satırı anteti yalnız (logo − başlık satırı) kadar uzatıyor ve yeni düzende
// kimlik bloğu logonun altından YANINA taşındığı için antet toplamda kısalıyor
// (logolu antet 33,4 mm → ~25 mm). ILK_SAYFA_BASLIK_YUKSEKLIK_MM = 58 rezervi
// en büyük seçenekte bile ~27 mm boş kalıyor, o yüzden rezerv değiştirilmedi.
export const LOGO_BOYUT_MM: Record<LogoBoyut, number> = {
  kucuk: 18,
  orta: 22,
  buyuk: 28,
};
export const VARSAYILAN_LOGO_BOYUT: LogoBoyut = "orta";

// Önizleme ölçeği: A4 genişliği ekranda 700px olarak çizilir.
// Tüm kağıt içi ölçüler bu tek sabitten türetilir; ölçüm ve önizleme
// aynı ölçeği kullandığı için sayfalama birebir tutarlıdır.
export const MM_PX = 700 / A4_GENISLIK_MM;
export const PT_MM = 0.352778;
export const SATIR_MM = 8;
/** Soru arası boşluk varsayılanı: yazılı kipinde 4 cevap satırı (el yazısı
 *  alanı), test kipinde yalnız ayırıcı boşluk (cevap alanı yok, sayfa israfı). */
export const VARSAYILAN_SORU_BOSLUK_YAZILI_MM = 4 * SATIR_MM;
export const VARSAYILAN_SORU_BOSLUK_TEST_MM = 8;
export const MADDE_HARFLERI = "abcçdefgğhıijklmnoöprsştuüvyz";

export const INPUT_CLASS =
  "mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100";
