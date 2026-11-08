import type { CizimBelgesi } from "./cizim/tipler";
import type { DenklemBelgesi } from "./denklem/tipler";

export type AracModal = "pdf-kaynak" | null;
export type SoruTuru = "metin" | "gorsel";
export type MetinKonumu = "ust" | "alt" | "sag" | "sol" | "yok";
export type EkGorselKonumu = "alt" | "yan";
export type Hizalama = "sol" | "orta" | "sag";
export type SayfaDuzeni = "tek" | "cift";
export type SinavGrubu = "A" | "B";
export type SinavTuru = "yazili" | "test";

export type Madde = {
  id: string;
  metinHtml: string;
  puan: number | null;
  cevapSatir: number;
};

export type EkGorselParcasi = {
  id: string;
  dataUrl: string;
  dosyaAdi?: string;
  konum: EkGorselKonumu;
  genislikMm: number;
  oran: number;
  secimNo?: number;
  kaynakSayfaNo?: number;
  kaynakAd?: string;
  cizimVerisi?: CizimBelgesi;
  denklemVerisi?: DenklemBelgesi;
};

export type SoruOgesi = {
  id: string;
  tur: SoruTuru;
  metinHtml?: string;
  gorselDataUrl?: string;
  dosyaAdi?: string;
  altMetinHtml?: string;
  metinKonumu: MetinKonumu;
  hizalama: Hizalama;
  genislikMm: number;
  gorselOran?: number;
  /**
   * Görselin SERBEST yüksekliği (mm). Yoksa yükseklik `gorselOran`dan gelir,
   * yani görsel hep orantılı çizilir — bugüne kadarki tek davranış buydu ve
   * öğretmen "görseli sadece aşağı/yukarı uzatamıyorum" derken bunu görüyordu.
   *
   * Dolduğunda `aspectRatio` bırakılıp `height` veriliyor: görsel dikeyde
   * serbestçe uzayıp kısalabiliyor. Köşe tutamacı bu alanı TEMİZLER — yani
   * "köşe = orantılı, alt tutamaç = serbest dikey" ayrımı korunuyor ve oranı
   * geri kazanmanın yolu her zaman elde.
   */
  gorselYukseklikMm?: number;
  ekGorseller?: EkGorselParcasi[];
  kaynakSecimNo?: number;
  kaynakSayfaNo?: number;
  kaynakAd?: string;      // "Palme Mat 9, s. 147" — Ders Kitabı'ndan gelen soruların kaynak rozeti
  kirpmaId?: string;      // Ders Kitabı kırpma kaydına köken referansı (kitap silinse de soru kendine yeter)
  /** Crash sonrası aynı transfer yeniden denenirken eklenenleri ayırt eder. */
  kaynakAktarimId?: string;
  kaynakKitapId?: string;
  kaynakSayfa?: number;
  kaynakSinif?: string;
  kaynakDers?: string;
  kaynakKonu?: string;
  logicalQuestionId?: string; // paket parçalarında ortak; eski/tek soruda id'ye düşer
  // Ders Kitabı'nda tam sayfa/sayfa aralığı tek mantıksal soru olarak kaydedildiğinde
  // parçaları ilişkilendirir (eski Ders Kitabı aktarımından gelen kayıtlarda bulunur).
  // B Grubu karıştırmasında parçalar birbirinden ayrılmasın diye kullanılır.
  paketId?: string;
  paketSira?: number;
  paketParcaSayisi?: number;
  paketBasligi?: string;
  boslukMm: number;
  /** Soru altındaki boşluğun görünümü: boş (varsayılan), çizgili ya da kareli. Eski kayıtlarda yok = boş. */
  cevapAlani?: CevapAlani;
  punto: number;
  puan: number | null;
  /**
   * BEP kâğıdındaki puan. Yalnız BEP görünümünde "Puanları 100'e eşit dağıt"
   * ile yazılır; normal sınavın `puan`ına DOKUNULMAZ (10 sorudan 5'i BEP'e
   * seçildiğinde 100 puan iki kâğıtta da tam çıksın diye). `undefined` = BEP
   * için ayrı puan yok, normal puan kullanılır (eski kayıtlar böyle açılır);
   * `null` = paket sorunun ilk parçası dışındaki parçalar (puan gösterilmez).
   */
  bepPuan?: number | null;
  maddeler: Madde[];
  maddeKolon: 1 | 2 | 3;
  tamGenislik: boolean;
  /** Kitaptan TAM SAYFA olarak alinmis gorsel: kendi sayfasinda, tam
   *  genislikte basilir. 1. sayfada 58mm baslik oldugu icin oraya sigmaz
   *  (269mm > 215mm kapasite) — sayfalayici bu bayragi gorunce yeni sayfa
   *  acar; devam sayfalarinda baslik olmadigindan 273mm kapasiteye oturur. */
  tamSayfa?: boolean;
  kazanim?: string;
  dogruSik?: string;
  bolumBasligi?: string;
  cizimVerisi?: CizimBelgesi;
  denklemVerisi?: DenklemBelgesi;
  /** YALNIZ yerleşimde TÜRETİLİR, asla kaydedilmez: tek sayfadan uzun bir metin
   *  sorusunun sayfalara bölünmüş parçası (bkz. layout/soruBolme). */
  devamParcasi?: boolean;
  /** Türetilmiş devam parçasında ilk maddenin asıl sorudaki sırası: harfler
   *  (a, b, c…) parçada yeniden başlamasın. */
  maddeHarfBaslangic?: number;
  /** Türetilmiş parçanın geldiği gerçek sorunun id'si (seçim/uyarı için). */
  devamKaynakId?: string;
  /** Türetilmiş parçada numara altında gösterilecek puan (`null` = gösterme). */
  gosterilenPuan?: number | null;
};

export type CevapAlani = "bos" | "cizgi" | "kare";

export type MetinTaslak = {
  html: string;
  punto: number;
  boslukMm: number;
  maddeler: Madde[];
};

export type GorselTaslak = {
  dataUrl: string;
  dosyaAdi: string;
  genislikMm: number;
  altMetinHtml: string;
  metinKonumu: MetinKonumu;
  hizalama: Hizalama;
  gorselOran: number;
  boslukMm: number;
  tamGenislik?: boolean;
};

export type Bant =
  | { tip: "tam"; soru: SoruOgesi; yukMm: number }
  | { tip: "sutun"; sol: SoruOgesi[]; sag: SoruOgesi[]; yukMm: number };

/** Önizlemedeki yerleşim uyarıları. Önceden aynı anda YALNIZCA en öncelikli
 *  olan gösteriliyordu ve kaç sorunun sorunlu olduğu hiçbir yerde yazmıyordu:
 *  öğretmen birini düzeltince ikincisi çıkıyor, 30 soruluk kağıtta bitmeyen bir
 *  düzelt-kontrol döngüsü oluşuyordu. */
export type YerlesimUyarisi = {
  tip: "sayfaAsimi" | "metinDar" | "genislik";
  adet: number;
  ilkSoruId: string;
};

export type SayfaYerlesimi = {
  sayfaNo: number;
  bantlar: Bant[];
  kapasiteMm: number;
  kullanilanMm: number;
};

/** Antetteki logo kutusunun ölçüsü. Tek bir "doğru" boyut yok: okul armaları
 *  kare, MEB/ilçe logoları çoğu zaman geniş geliyor ve aynı mm'de çok farklı
 *  büyüklükte görünüyorlar. Ölçüler `LOGO_BOYUT_MM`'de. */
export type LogoBoyut = "kucuk" | "orta" | "buyuk";

export type BaslikBilgileri = {
  okulAdi: string;
  sinifSeviyesi: string;
  donem: string;
  yaziliNo: string;
  ders: string;
  tarih?: string;
  sureDakika?: string;
  /** Öğretmenin yüklediği okul/MEB logosu; başlığın yanında gösterilir. */
  logoDataUrl?: string;
  /** Logo kutusunun ölçüsü; logo yokken çıktıda karşılığı yoktur. */
  logoBoyut?: LogoBoyut;
  /** Başlık düzeni: "klasik" (varsayılan; tek satır başlık, alt alta kimlik alanları) ya da
   *  "merkez" (solda logo, ortada serbest satırlar, sağ üstte Toplam Puan kutusu, altta tek
   *  satırda üç çizgili kimlik alanı). */
  duzen?: BaslikDuzeni;
  /** "merkez" düzeninde ortadaki satırlar (her satır ayrı). Boşsa dönem/sınıf/ders/okul alanlarından türetilir. */
  ortaSatirlar?: string;
};

export type BaslikDuzeni = "klasik" | "merkez";

export type SinavTaslagi = {
  /** Kullanım geçmişindeki hedef kimliğinin oturumlar arasında sabit kalmasını sağlar. */
  id?: string;
  surum: "v0.11C";
  kayitZamani: string;
  baslik: BaslikBilgileri;
  sorular: SoruOgesi[];
  ayarlar: {
    kenarBosluk: number;
    varsayilanSoruBosluk: number;
    ogretmenler: string[];
    sayfaNoGoster: boolean;
    sayfaDuzeni: SayfaDuzeni;
    sutunAra: number;
    sutunAyirici: boolean;
    bGrubuAktif?: boolean;
    bSeed?: number;
    aktifGrup?: SinavGrubu;
    /** Son yazdırmadaki seed; "yeniden karıştırdınız, anahtar uyuşmayabilir"
     *  uyarısının oturumlar arasında yaşaması için saklanır. */
    sonYazdirilanBSeed?: number | null;
    sinavTuru?: SinavTuru;
    testBaslik?: string;
    /** Test kâğıdında öğrencinin doğru/yanlış/net yazacağı kutu. Test kipi
     *  bilerek sade tutulmuştu ("kağıdın üstünde yalnızca başlık görünür");
     *  bu kutu o kararı geri alınabilir biçimde genişletiyor. */
    testSonucKutusu?: boolean;
    /** Şık harf biçimi (A) B) C) ya da a) b) c)); yoksa kipin varsayılanı. */
    sikBicimi?: "buyuk" | "kucuk";
    /** Şık dizilimi: "otomatik" kısa şıkları yan yana dizer; yoksa test → otomatik,
     *  yazılı → liste. */
    sikDuzeni?: "liste" | "otomatik";
    // BEP görünümü (punto artışı + soru alt kümesi) hazırlaması saatler sürebilir;
    // taslakla birlikte saklanmazsa uygulama kapanınca sessizce kayboluyordu.
    bepAktif?: boolean;
    bepSeciliIds?: string[];
    bepPuntoArtis?: number;
    // Kurtarma sonrası PDF seçim numaralarının 1'den başlayıp mevcut
    // sorularla çakışmaması için sayaç da taslakla birlikte saklanır.
    kaynakSecimSayaci?: number;
  };
};
