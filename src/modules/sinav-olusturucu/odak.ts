// "Sınavhane Fizik" sürümünün TEK merkezi ayarı: hangi dersler/şekiller
// kütüphanede ve aramada GÖRÜNÜR.
//
// KARAR (öğretmen): uygulama yalnız FİZİK için uzmanlaşır. Diğer dersler
// SİLİNMEDİ, yalnız gizli: kod yerinde durur, eski sınavlardaki kimya/Venn/akış
// şeması vb. şekiller açılır, çizilir, yazdırılır, seçilip düzenlenir ve
// silinir. Gizlenen şey yalnız "eklenebilir" listeleridir (kütüphane kategorileri
// ve kartları, arama, "yazarak çiz" önerileri, denklem editöründeki kimya
// kısayolları).
//
// GERİ ALMAK İÇİN: `FIZIK_ODAKLI = false` yapmak yeter; tüm kategori, kart ve
// kısayollar eski hâline döner. Tek tek bir şekli geri açmak için aşağıdaki
// `GIZLI_*` listelerinden çıkarın.
//
// Bu dosya KASITLI olarak başka modüllere bağımlı değil (döngüsel içe aktarma
// olmasın); kategori kimlikleri düz metin.

/** true: yalnız fizik odaklı sürüm. false: tüm dersler (eski davranış). */
export const FIZIK_ODAKLI = true;

let odakli: boolean = FIZIK_ODAKLI;

/** Şu an fizik odaklı mı? (Her kullanımda okunur; sabit olarak önbelleğe alınmaz.) */
export function fizikOdakliMi(): boolean {
  return odakli;
}

/**
 * YALNIZ TESTLER İÇİN: gizli dersleri geçici açar/kapar, böylece gizli kodun
 * (kimya, Venn, akış şeması…) kendi testleri çalışmaya devam eder. Uygulama
 * kodu bunu ÇAĞIRMAZ; kalıcı geri alma için `FIZIK_ODAKLI` sabitini değiştirin.
 */
export function odakKipiniAyarla(deger: boolean): void {
  odakli = deger;
}

/** Pencere/sayfa başlığı ve üst bardaki ad. */
export const URUN_ADI = FIZIK_ODAKLI ? "Sınavhane Fizik" : "Sınavhane";

/** Yeni sınavlarda "Ders" alanının varsayılanı. */
export const VARSAYILAN_DERS = FIZIK_ODAKLI ? "Fizik" : "";

// ── Kütüphane kategorileri ─────────────────────────────────────────────────

export type KategoriTanimi = { id: string; ad: string };

/** Eski (tüm dersler) düzen: sıra ve adlar. */
export const TUM_KATEGORILER: KategoriTanimi[] = [
  { id: "sahne", ad: "Hazır Soru Sahneleri" },
  { id: "geometri", ad: "Geometri" },
  { id: "matematik", ad: "Matematik & Grafik" },
  { id: "istatistik", ad: "İstatistik & Şema" },
  { id: "fizik", ad: "Fizik" },
  { id: "kimya", ad: "Kimya" },
  { id: "akis", ad: "Akış Şeması" },
  { id: "sablonlarim", ad: "Şablonlarım" },
];

/** Fizik odaklı düzen: fizik önce; kimya ve akış şeması YOK. */
export const FIZIK_KATEGORILERI: KategoriTanimi[] = [
  { id: "sahne", ad: "Hazır Fizik Sahneleri" },
  { id: "fizik", ad: "Fizik" },
  { id: "geometri", ad: "Geometri (temel)" },
  { id: "matematik", ad: "Grafik y = f(x)" },
  { id: "istatistik", ad: "Tablo & Sütun Grafik" },
  { id: "sablonlarim", ad: "Şablonlarım" },
];

/** Kütüphanede sunulan kategoriler (sıralı). */
export function sunulanKategoriler(): KategoriTanimi[] {
  return odakli ? FIZIK_KATEGORILERI : TUM_KATEGORILER;
}

/** Açılışta açık gelen kategori(ler). */
export function varsayilanAcikKategoriler(): string[] {
  return odakli ? ["sahne"] : [];
}

// ── Tek tek gizlenen kartlar ───────────────────────────────────────────────

/** Kimliğe göre gizlenen kartlar (kategori görünür olsa bile). */
export const GIZLI_KART_KIMLIKLERI: ReadonlySet<string> = new Set([
  // Geometri: müfredat matematiğine özgü şablonlar
  "geo:g-dik-yukseklik", "geo:g-eskenar-yukseklik-kok", "geo:g-aciortay", "geo:g-kenarortay",
  "geo:g-dis-aci", "geo:g-ic-teget", "geo:g-cevrel",
  "geo:c-cap", "geo:c-ic-aci", "geo:c-dis-kesen", "geo:c-iki-teget", "geo:c-teget-kiris",
  "geo:q-paralelkenar-yukseklik", "geo:q-eskenar", "geo:q-yamuk", "geo:q-ikizkenar-yamuk",
  "geo:q-dik-yamuk", "geo:q-deltoid",
  // Matematik: eşitsizlik bölgeleri ve konikler (y=f(x) eğrileri KALIR)
  "mat:m-bolge", "mat:m-cember", "mat:m-elips", "mat:m-hiperbol",
  // İstatistik: yalnız sütun/çubuk/çizgi kalır
  "ist:daire", "ist:histogram", "ist:kutu", "ist:govde",
]);

/** Alt başlığı bu önekle başlayan kartlar gizli (geometri kategorisinde). */
export const GIZLI_ALT_BASLIK_ONEKLERI: readonly string[] =
  ["Coğrafya", "Katı cisimler", "Kağıt katlama", "Benzerlik", "Doğruda açılar"];

/** Kimlik öneki ile gizlenen kart aileleri (tüm şema şablonları: Venn, ağaç, birim çember…). */
export const GIZLI_KIMLIK_ONEKLERI: readonly string[] = ["sema:", "kimya-", "akis:"];

export type KartKimligi = { id: string; kategori: string; altBaslik?: string };

export function kategoriGorunurMu(kategori: string): boolean {
  return sunulanKategoriler().some((k) => k.id === kategori);
}

/** Kütüphanede/aramada gösterilsin mi? Kayıtlı şekillerin çizilmesini ETKİLEMEZ. */
export function kartGorunurMu(k: KartKimligi): boolean {
  if (!odakli) return true;
  if (!kategoriGorunurMu(k.kategori)) return false;
  if (GIZLI_KART_KIMLIKLERI.has(k.id)) return false;
  if (GIZLI_KIMLIK_ONEKLERI.some((o) => k.id.startsWith(o))) return false;
  if (k.altBaslik && GIZLI_ALT_BASLIK_ONEKLERI.some((o) => k.altBaslik!.startsWith(o))) return false;
  return true;
}

/** "Yazarak çiz" ile üretilen eğri türlerinden gizlenenler (eşitsizlik bölgesi, kapalı denklem/konik). */
const GIZLI_EGRI_TURLERI: readonly string[] = ["bolge", "denklem"];
export const egriGizliMi = (tur: string): boolean => odakli && GIZLI_EGRI_TURLERI.includes(tur);

/** MatematikSeridi sekmeleri: fizik sürümünde yalnız fonksiyon + tablo/sütun grafik. */
export const seritSekmesiGorunurMu = (id: string): boolean => !odakli || id !== "sema";

// ── Denklem editörü ────────────────────────────────────────────────────────

/** "Kimya formülü ekle" düğmesi ve kimya örnekleri. */
export const denklemKimyaGorunurMu = (): boolean => !odakli;

/** Fizik sürümünde kimya sembol grubundan yalnız fizikte de kullanılanlar kalır. */
export const FIZIK_SEMBOL_SUZGECI: readonly string[] = ["↑", "↓", "°C", "⁺", "⁻", "e⁻"];

/** "Yazarak çiz" örnek çipleri: fizik sürümünde gizlenenler (adlarıyla). */
const GIZLI_YAZARAK_ORNEKLERI: readonly string[] = ["Çember", "Bölge"];
export const yazarakOrnegiGizliMi = (ad: string): boolean => odakli && GIZLI_YAZARAK_ORNEKLERI.includes(ad);
