// packages/shared/types.ts
// Sınavhane'nin paylaşılan kalıcı veri tipleri (db/repo.ts kayıt biçimi).

// Sınav kütüphanesi: küçük metadata burada (kalıcı JSON nesnesinin `sinavlar`
// alanında), büyük içerik (gömülü görselli SinavTaslagi) IndexedDB'de sinavId
// anahtarıyla — bkz. sinav-olusturucu/storage/taslakDepo.ts. Soru/sayfa sayısı ve
// boyut burada ÖNBELLEKLENİR: liste ekranı içeriğe hiç dokunmadan çizilir.
export interface SinavKaydi {
  id: string;
  ad: string;
  ders?: string;
  sinifSeviyesi?: string;
  donem?: string;
  yaziliNo?: string;
  soruSayisi: number;
  sayfaSayisi: number;
  /** İçeriğin kabaca kapladığı yer; disk raporu ve sınır uyarısı için. */
  boyutBayt: number;
  olusturma: string;
  guncelleme: string;
  /** true = kütüphanede gizli, içerik yerinde durur (kitaplardaki kalıp). */
  arsiv?: boolean;
  /** Başka bir öğretmenden gelen sınavlarda serbest metin gönderen notu. */
  gonderenNotu?: string;
  /** Doğrulanmış dış taslağın SHA-256 özeti. Yalnız aynı dosyanın yeniden
   * içe aktarılmasını önlemek için tutulur; parola veya sınav içeriği değildir. */
  iceAktarimParmakIzi?: string;
  /** Öğretmenin Sınavlarım ekranından elle verdiği ad. Varsa `ad` her autosave'de
   *  bunu taşır; yoksa `ad` başlık alanlarından türetilmeye devam eder
   *  (bkz. sinav-olusturucu/lib/sinavKutuphanesi.ts sinavAdiTuret/metadataTuret). */
  ozelAd?: string;
}

/** Okul profili: sınav başlığındaki okul/öğretmen/müdür/ilçe alanlarını doldurur.
 *  Kayıtta `ayarlar.okulProfili` altında durur (db/repo.ts). */
export interface OkulProfili { okulAdi: string; ogretmenAdi: string; okulMuduru: string; ilce: string }
