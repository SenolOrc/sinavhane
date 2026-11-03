// packages/shared/types.ts
// Uygulama + eklentinin paylaştığı tek doğru kaynak (single source of truth).
// Modül içinde tip TANIMLAMA; ortaksa buraya koy.
// Kaynak: MASTER §3, §5, §6, §7.

// ─── Temel varlıklar (MASTER §7 veri modeli) ───────────────────────────────

export interface Sinif {
  id: number;
  ad: string;          // "10-B"
  brans: string;       // Eski kayıtlarla uyum için ilk/varsayılan ders
  dersler?: string[];  // Aynı şubenin birden fazla dersi: ["Fizik", "Seçmeli Fizik"]
  rehber?: boolean;    // OA96: öğretmenin rehber (sınıf) öğretmeni olduğu şube — yalnız etiket; en fazla bir sınıf
}

/** Eski tek-branşlı kayıtları da kapsayan, tekrarsız sınıf ders listesi. */
export function sinifDersleri(sinif: Pick<Sinif, "brans" | "dersler">): string[] {
  const gorulen = new Set<string>();
  const sonuc: string[] = [];
  for (const ham of [sinif.brans, ...(sinif.dersler ?? [])]) {
    const ders = String(ham ?? "").replace(/\s+/g, " ").trim();
    const anahtar = ders.toLocaleLowerCase("tr");
    if (!ders || ders === "—" || gorulen.has(anahtar)) continue;
    gorulen.add(anahtar);
    sonuc.push(ders);
  }
  return sonuc;
}

/** OA69: ders adlarını karşılaştırma anahtarı. "Seçmeli Fizik" / "SEÇMELİ FİZİK" / "Secmeli Fizik"
 *  aynı ders sayılmalı — e-Okul büyük harf, öğretmen küçük harf yazabiliyor; İ/I ve şapka farkı
 *  aynı derse iki ayrı performans düzeni/ödev listesi açmasın. */
const DERS_ANAHTARI_ONBELLEK = new Map<string, string>();

export function dersAnahtari(ders: string | undefined | null): string {
  // OA74 hız: saf fonksiyon, sınırlı önbellekli (performans hesabında öğrenci × gün × ders başına
  // çağrılıyordu; 14 sınıfta tüm sürenin %38'i). Sonuç önbelleksiz hâliyle birebir aynıdır.
  const ham = String(ders ?? "");
  const onbellekte = DERS_ANAHTARI_ONBELLEK.get(ham);
  if (onbellekte !== undefined) return onbellekte;
  const sonuc = dersAnahtariHesapla(ham);
  if (DERS_ANAHTARI_ONBELLEK.size >= 5000) DERS_ANAHTARI_ONBELLEK.clear();
  DERS_ANAHTARI_ONBELLEK.set(ham, sonuc);
  return sonuc;
}

function dersAnahtariHesapla(ham: string): string {
  return ham
    .toLocaleUpperCase("tr")
    .replace(/İ/g, "I")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export interface Ogrenci {
  id: number;
  sinifId: number;
  no: string;          // Okul No — DEĞİŞMEZ ANAHTAR (MASTER §3). Eşleştirme hep bununla.
  adSoyad: string;
  fotoYolu?: string;
  veliAd?: string;     // e-Okul'dan
  veliTel?: string;    // KVKK: hassas, local kalır, sadece panoya kopyalama eyleminde kullanılır
  /** Denetim (2026-10): dönem ortasında sınıfa eklenen öğrencinin ilk günü (YYYY-MM-DD). Bu tarihten
   *  önceki dersler katılım/kitap/devam paydasına girmez. Yoksa: dönem başından beri sınıfta. */
  katilmaTarihi?: string;
  /** OA95: dolu bir sınıfa sonradan eklenen öğrencinin ekleme günü (YYYY-MM-DD). Yalnız "Yeni" etiketi için; hesaba girmez. */
  eklenmeTarihi?: string;
  /** OA90: "Sürekli devamsız" — öğretmen işaretledi (işaretlendiği gün, YYYY-MM-DD). Dersi İşle ve
   *  Ödev Defteri listesinde görünmez, performans hesaplanmaz (veri yok gibi; e-Okul'a boş gider),
   *  risk listelerine girmez. Kayıtları silinmez; kaldırılınca geri gelir. */
  devamEtmiyor?: string;
  /** OA94: geçmiş "sürekli devamsız" aralıkları [bas, bit) — işaret kaldırılınca eklenir. Bu günler
   *  paydaya girmez; kapanmış dönem, kapanış günündeki işarete göre hesaplanır (geri dönüş onu değiştirmez). */
  devamsizAraliklari?: { bas: string; bit: string }[];
  /** OA95: "Nakil gitti" — nakil günü (YYYY-MM-DD). Kayıtlar silinmez (1. dönem raporu alınabilir).
   *  Öğrenci sınıf listelerinden, ders işlemeden ve 2. dönem hesabından çıkar. Kaldırılınca geri gelir. */
  nakilTarihi?: string;
}

// ─── Kriter & ağırlık (MASTER §5 — iki ayrı kademe) ────────────────────────

export type KriterTip = "durum" | "arti" | "eksi";

export interface Kriter {
  id: number;
  ad: string;          // "Kitap getirdi", "Aktif katılım", "Uyudu"
  tip: KriterTip;
  puanDegeri: number;  // durum: 0/1 mantığı; arti: +2; eksi: -2
}

export interface DonemAgirlik {
  donem: number;
  kriterGrubu: string; // "katilim" | "odev" | "sinav" | "mebi" | "kitap" ...
  agirlik: number;     // 0..1 (yüzde/100). Bir döneme ait ağırlıklar 1.0'a tamamlanmalı.
}

// ─── Günlük döngü (MASTER §1 Hızlı İşleme) ─────────────────────────────────

export interface GunlukKayit {
  id: number;
  ogrenciId: number;
  tarih: string;       // ISO "2026-06-28"
  kriterId: number;
  deger: number;       // işaret/şiddet; ham +/- (normalize core/ içinde yapılır)
  donem: 1 | 2;         // Dönem Yaşam Döngüsü — yazıldığı anki aktif dönem
}

// Kural 1'de istisnasız bir gün HİÇ GunlukKayit üretmez — bu da "hiç bakılmadı"
// ile "baktım, hepsi tamamdı" ayrımını imkansız kılardı. Bu iz, öğretmenin o
// sınıf+günü açıp kontrol ettiğini (istisna olsun ya da olmasın) ayrıca kaydeder.
export interface GunlukIslendi {
  sinifId: number;
  tarih: string; // ISO "2026-06-28"
  /** OA73: iki+ dersli sınıfta bu günün hangi derse işlendiği (Hızlı İşleme'de kayıt anındaki
   *  seçili ders). Ders programından TÜRETİLMEZ — program sonradan değişince geçmiş gün kaymasın.
   *  Yoksa (eski gün, telefon zarfı, tek dersli sınıf) gün ORTAKTIR: sınıfın her dersine sayılır. */
  ders?: string;
}

// ─── e-Okul / MEBİ kaynaklı (MASTER §3) ────────────────────────

export interface Devamsizlik {
  ogrenciId: number;
  ozurluGun: number;   // gün bazında (yarım = 0.5)
  ozursuzGun: number;  // RİSK İÇİN KRİTİK — ağır sayılır (MASTER §6)
  gec: number;
  toplamGun: number;
}

/** OA91: Türk Dili ve Edebiyatı gibi derslerde e-Okul sınavı üç parçalıdır: Yazılı (%50),
 *  Dinleme (%25), Konuşma (%25). `SinavNotu.puan` e-Okul'un hesapladığı ORTALAMADIR (resmî not,
 *  performansa o girer); parçalar yalnız gösterim ve sınav tutanağı (Yazılı) içindir.
 *  Diğer derslerde bu alan hiç oluşmaz. */
export interface SinavDetay {
  yazili?: number | "G" | "K";
  dinleme?: number | "G" | "K";
  konusma?: number | "G" | "K";
}

export interface SinavNotu {
  ogrenciId: number;
  ders?: string;        // Eski kayıtlarda yok; açılış göçü sınıfın varsayılan dersini atar
  ad: string;          // "1. Yazılı"
  puan: number | "G" | "K"; // G=Girmedi/Getirmedi, K=Kopya (MASTER §3 özel değerler)
  // Dönem Yaşam Döngüsü — eski kayıtlarda yoktur, normalleştir() 1'e tamamlar.
  donem?: 1 | 2;
  // "elle" girilen bir not senkron tarafından sormadan üzerine yazılmaz (bkz.
  // db/repo.ts sinavYazHam çakışma kuralı). Bugün elle giriş ekranı yok; alan
  // ileride eklenecek elle giriş akışı için hazırlık — tüm senkron yazımları
  // "senkron" damgalar.
  kaynak?: "elle" | "senkron";
  /** OA91: yalnız Yazılı/Dinleme/Konuşma'lı derslerde (bkz. SinavDetay). */
  detay?: SinavDetay;
}


export interface MebiModul {
  ogrenciId: number;
  modul: string;
  tamamlandi: boolean;
}

export interface GozlemNotu {
  id: number;
  ogrenciId: number;
  tarih: string;
  metin: string;       // olgusal dil — teşhis değil gözlem (KVKK)
}

// ─── Davranış / rehberlik etiketi (MASTER §10.3) ───────────────────────────
// Risk halkasından AYRI. Özel nitelikli kişisel veri (KVKK): local, minimum,
// OLGUSAL dil (teşhis değil gözlem). Renk öğretmence seçilir.

// Hex renk kodu (ör. "#3b82f6") — Ayarlar'da öğretmen serbestçe seçer (renk seçici).
// Eski kayıtlarda adlandırılmış değerler (yesil/mavi/mor/turuncu/kirmizi/gri) de olabilir —
// geriye dönük uyum için EtiketRozet.tsx'te çözülür, göç gerekmez.
export type EtiketRenk = string;

export interface DavranisEtiket {
  id: number;
  ad: string;
  renk: EtiketRenk;
}

export interface OgrenciEtiket {
  id: number;
  ogrenciId: number;
  etiketId: number;
  tarih: string;     // ISO
  not?: string;      // kısa, olgusal gözlem (opsiyonel)
  donem: 1 | 2;      // Dönem Yaşam Döngüsü — atandığı anki aktif dönem
}

// ─── Ders programı (MASTER §10.2) ──────────────────────────────────────────
// Haftalık program; Dashboard "Bugünkü Dersler"i besler, işlenmeyen ders işaretlenir.

export interface DersProgrami {
  id: number;
  sinifId: number;
  gun: number;   // 1=Pzt .. 5=Cum (hafta içi)
  sira: number;  // kaçıncı ders saati (1..10)
  ad?: string;   // ders adı (öğretmenin branşı), opsiyonel
}

// ─── Tutanak / disiplin (MASTER §10.4) ─────────────────────────────────────
// ⚠ KVKK: "özel nitelikli kişisel veri" — veli telefonundan bile hassas.
// En az veri, OLGUSAL dil (teşhis değil gözlem), yalnız bu cihazda.

export interface TutanakKaydi {
  id: number;
  ogrenciId: number;
  tarih: string;   // ISO
  konu: string;    // kısa, olgusal
  donem: 1 | 2;    // Dönem Yaşam Döngüsü — girildiği anki aktif dönem
}

// ─── Yapılacaklar (öğretmenin kendi hatırlatma notları — MASTER dışı, basit liste) ──

export type GorevDurum = "bekliyor" | "tamamlandi";

export interface Gorev {
  id: number;
  metin: string;
  durum: GorevDurum;
  eklenmeZamani: string;    // ISO
  sonTarih?: string;        // ISO tarih (YYYY-MM-DD), isteğe bağlı
}

// ─── Etkinlik / Ödev Defteri (puanlı ödev — performans ödev grubuna katkı) ──

/** Dereceli puanlama anahtarı (analitik rubrik): ölçütler × düzeyler. Ödeve oluşturulurken KOPYALANIR
 *  (sonradan şablon değişse eski ödevin puanları oynamaz). Hesap: core/rubrik.ts. */
export interface RubrikOlcek {
  ad: string;
  olcutler: Array<{ ad: string; /** Boş = eşit; yalnız oranlar önemli. */ agirlik?: number }>;
  /** Düzeyler en yüksekten en düşüğe. puan = o düzeyin ham puanı (4, 3, 2, 1 …). */
  duzeyler: Array<{ ad: string; puan: number }>;
  /** aciklamalar[ölçüt][düzey] — hücre metni (isteğe bağlı, boş olabilir). */
  aciklamalar: string[][];
  /** En düşük düzeyin 100'lük karşılığı. Boş = düz oran (en düşük/en yüksek × 100; 1–4 ölçeğinde 25). */
  taban?: number;
}
export type RubrikSablonu = RubrikOlcek & { id: string };

export interface OdevKaydi {
  id: number;
  sinifId: number;
  ad: string;       // "Kitap s.45 problemleri"
  tarih: string;    // ISO
  mod: "isaret" | "puan"; // işaretli (+/−) VEYA opsiyonel puan (0-100)
  /** Dereceli puanlama: varsa ödev "puan" modundadır (puanlar 0–100 yazılır, telefon/performans aynen çalışır);
   *  öğretmen her öğrenci için ölçüt başına düzey seçer, toplam 100'e çevrilip puan olur. */
  rubrik?: RubrikOlcek;
  /** OA59: ödevin performans ortalamasındaki ağırlığı (varsayılan 1; 2 = iki ödev gibi sayılır). */
  agirlik?: number;
  /** OA59: işaretli ödevde "Yapmadı (−)" kaç puan sayılsın (0–99, varsayılan 0). "Yaptı" hep 100. */
  eksiPuan?: number;
  /** OA59: ödev yalnız bu performans notuna (1., 2., 3. sütun) sayılır; boşsa bütün notlara. */
  notNo?: number;
  /** OA69: ödevin dersi (aynı şubede "Fizik" + "Seçmeli Fizik" varken bir dersin ödevi ötekinin
   *  notuna sızmasın). Eski kayıtlarda yok → açılış göçü sınıfın İLK dersini yazar. MEBİ ödevleri
   *  her zaman ilk derse (öğretmen kararı). Tek dersli sınıfta hesaba etkisi yoktur. */
  ders?: string;
  // Ders Kitabı modülünden "föy" olarak oluşturulduysa köken referansı — yalnızca
  // OLUŞTURULMA anında odevEkle ile set edilir, sonradan değiştirilmez. Opsiyonel
  // olduğundan eski kayıtlarda hiç yoktur; repo.ts normalleştir() bunu tip
  // güvenliği için (bozuk/elle düzenlenmiş yedeklere karşı) ayrıca güvenceye alır.
  foyId?: string;
  donem: 1 | 2;    // Dönem Yaşam Döngüsü — oluşturulduğu anki aktif dönem
  // MEBİ senkronu (Hedef Temelli Destek Eğitimi) — eski kayıtlarda yoktur,
  // normalleştir() "elle" ile tamamlar. mebiOdevId tekrar senkronda tekilleştirme
  // anahtarıdır (bkz. db/repo.ts::mebiOdevDetayYaz).
  kaynak?: "elle" | "mebi";
  mebiOdevId?: string;
  sonTarih?: string;              // YYYY-MM-DD
  sonTarihKaynak?: "mebi" | "elle";
  sonTarihGuncelleme?: string;    // yerel ISO zaman
}

export interface OdevPuani {
  odevId: number;
  ogrenciId: number;
  // puan modu: 0..100 | "G" (getirmedi=0) · işaret modu: "+" (yaptı=100) | "-" (yapmadı=0)
  // MEBİ kaynaklı kayıtlarda senkron her zaman "+" yazar (tamamladı) — kanonik
  // MEBİ gerçeği bu alana GÖMÜLMEZ, ayrı tutulur (bkz. mebiTamamlandi/core/sonTarih.ts).
  puan: number | "G" | "+" | "-";
  // MEBİ senkronu — ham gerçek + öğretmenin yerel kararları (core/sonTarih.ts okur).
  mebiTamamlandi?: boolean;
  /** Dereceli puanlama: ölçüt başına seçilen düzey sırası (RubrikOlcek.duzeyler indisi). puan bundan hesaplanır;
   *  puan sonradan başka yerden (telefon, elle) değişirse bu seçim bayattır ("elle" sayılır). */
  rubrikSecim?: number[];
  /** Dereceli puanlama: öğretmenin bu öğrenciye yazdığı kısa geri bildirim (PDF'e girer). */
  geriBildirim?: string;
  // MEBİ'nin bildirdiği başarı yüzdesi (0-100) — önceden senkronda okunup HİÇ
  // saklanmıyordu, bu yüzden %3 yapan da %100 yapan da zamanında tamamlamışsa
  // aynı 100 performans puanını alıyordu (gerçek kullanıcı bulgusu). Artık
  // saklanır; core/sonTarih.ts::odevEtkiliPuan100 varsa doğrudan puan olarak
  // kullanır, yoksa (eski kayıtlar/yüzde vermeyen senkron) 100'e döner.
  mebiYuzde?: number;
  tamamlanmaTarihi?: string;              // YYYY-MM-DD, MEBİ'den (yoksa "belirsiz")
  elleTamamlandiOverride?: boolean | null; // öğretmenin açık yerel düzeltmesi
  sayilsinOverride?: boolean;              // geç/belirsiz olsa da puana sayılsın (tek kayıt)
}

// ─── Dönem Yaşam Döngüsü ────────────────────────────────────────────────────
// Durum makinesi: D1_ACIK -[1. dönemi kapat]-> D2_ACIK -[2. dönemi kapat]-> YIL_SONU.
// Geçiş YALNIZ kapanış sihirbazıyla olur (MASTER Kural 3 — otomatik karar yok).

export interface DonemDurumu {
  aktifDonem: 1 | 2 | null; // null = YIL_SONU
  d1KapanisZamani?: string; // ISO
  d2KapanisZamani?: string; // ISO
  /** OA94: 2. dönemin ilk günü (YYYY-MM-DD), kapanış sihirbazında sorulur (varsayılan kapanış günü).
   *  Bu günden önceki dersler 1., bu gün ve sonrası 2. dönem. Yoksa: kapanış gününün ertesi. */
  d2BaslangicTarihi?: string;
}

// Kapanış sihirbazının 3. adımında oluşturulan, kapanış anının "fotoğrafı".
// Immutable: oluşturulduktan sonra hiçbir akış günceleyemez/silemez (yıl
// geçişi arşivlemesi hariç). Devamsızlık/MEBİ kümülatif olduğundan dönem
// kırılımı (D2 = güncel − D1 snapshot) buradan türetilir.
export interface DonemSnapshotOgrenci {
  ogrenciId: number;
  ozurluGun: number;
  ozursuzGun: number;
  mebiTamamlanan: number;
  mebiToplam: number;
}

export interface DonemSnapshot {
  id: string;
  donem: 1 | 2;
  zaman: string; // ISO
  ogrenciler: DonemSnapshotOgrenci[];
}

// Yıl geçişi sihirbazının kapanış özeti — ham kayıtlar (gunlukKayitlar,
// sinavNotlari vb.) SİLİNMEZ/taşınmaz, yerinde kalır. Bu yalnızca "hangi yıl
// ne zaman kapandı, hangi dönem snapshot'larına karşılık geliyor" izidir.
export interface YilArsivi {
  id: string;
  yil: string; // "2025-2026"
  zaman: string; // ISO — geçiş anı
  /** ESKİ kayıtlar: yıl geçişi dönem kopyalarını sildiği için bu kimlikler boşa işaret eder. OA95'ten beri yazılmaz. */
  d1SnapshotId?: string;
  d2SnapshotId?: string;
  /** OA95: arşivin kendi özeti — silinen kopyalara bağlı değildir. */
  ozet?: { sinifSayisi: number; ogrenciSayisi: number; d1Zaman?: string; d2Zaman?: string };
}

// ─── Motor çıktıları (MASTER §6) ───────────────────────────────────────────

export type RiskSeviye = "normal" | "dikkat" | "kritik"; // yeşil / sarı / kırmızı

export interface PerformansSonuc {
  ogrenciId: number;
  toplamPuan: number;          // 0..100, dönem ağırlık seti uygulanmış
  gruplar: Record<string, number>; // grup bazında 100'lük alt puanlar (şeffaflık) — YALNIZ verisi olan gruplar
  /** Ağırlık setinde olduğu hâlde bu öğrenci için verisi OLMAYAN gruplar.
   *  Bunlar hesaptan çıkarılır, ağırlıkları kalan gruplara oranla dağıtılır;
   *  ekranlar bu listeyi "hesaba katılmadı" diye GÖSTERİR (sessiz dağıtım yok). */
  eksikGruplar?: string[];
  /** OA54: e-Okul performans sütunlarının notları (1., 2., 3.); `toplamPuan` bunların ortalamasıdır. */
  sutunNotlari?: Array<number | null>;
}

export interface RiskSonuc {
  ogrenciId: number;
  seviye: RiskSeviye;
  nedenler: string[];          // "Yüksek özürsüz devamsızlık", "5 ödev eksik" ...
}

// ─── e-Okul eklentisinden gelen HAM veri (Okul No anahtarlı) ────────────────
// Eklenti ogrenciId bilmez; Okul No döndürür. Uygulama Okul No → ogrenciId eşler.

export interface EokulDevamsizlikHam {
  okulNo: string;       // OOMPageHeader1_lblNumara — değişmez anahtar (MASTER §3)
  adSoyad: string;      // bilgi/teyit amaçlı (eşleştirme Okul No ile)
  ozurluGun: number;
  ozursuzGun: number;   // risk için kritik
  gec: number;
  toplamGun: number;
}

// ─── e-Okul eklentisinden gelen HAM sınav notları (Okul No anahtarlı) ───────

export interface EokulSinavNot {
  ad: string;                 // "1.Sınav" ...
  puan: number | "G" | "K";   // G=Girmedi, K=Kopya (MASTER §3)
  /** OA91: Edebiyat vb. Y/D/K'lı ekranda parçalar (puan = e-Okul'un Ort.'u). */
  detay?: SinavDetay;
}

export interface EokulSinavHam {
  okulNo: string;
  adSoyad: string;
  ders: string;
  notlar: EokulSinavNot[];
  // Dönem Yaşam Döngüsü — eklenti e-Okul sayfasında seçili dönemi okuyup koyar.
  // Yoksa uygulama aktif dönemi varsayar + Sistem Sağlığı'na uyarı düşer.
  donem: 1 | 2;
}

// Ders içi performans (1.Performans..6.Performans) — sınavla aynı yapı, ayrı kaynak.
export interface EokulPerformansHam {
  okulNo: string;
  adSoyad: string;
  ders: string;
  notlar: EokulSinavNot[]; // { ad: "1.Performans", puan }
  donem: 1 | 2;
}

// ─── Uygulamadan eklentiye gönderilen DOLDURMA verisi (performans) ──────────

export interface PerformansDoldurKayit {
  okulNo: string;
  puan: number | "G";  // getirmeyen → "G" (MASTER §3)
}

export interface EokulPerformansDoldur {
  sinifAd: string;
  ders: string;
  donem: 1 | 2;
  ogretimYili: string;
  slot: 1 | 2 | 3 | 4 | 5 | 6;
  requestId: string;
  kayitlar: PerformansDoldurKayit[];
}

// ─── e-Okul'dan sınıf öğrenci listesi (not ekranı dgListem) ─────────────────

export interface EokulOgrenciSatir {
  okulNo: string;
  adSoyad: string;
}

export interface EokulSinifListe {
  sinifAd: string;   // "9-F"
  brans: string;     // "Fizik"
  ogrenciler: EokulOgrenciSatir[];
}

// MebiHam/MebiDersDurum (eski "mebi-modul" adaptörünün ham tipi) 2026-09-24'te
// kaldırıldı — o adaptör hiçbir yerden çağrılmıyordu (ölü kod), yerini
// mebi-konu-tamamlama aldı (bkz. MebiKonuTamamlamaHam altta).

// Yeni: MEBİ "Konu Tamamlama Raporu" — TEK konu × TÜM sınıf (subject-details-tymm).
// Her öğrenci: tamamlandı mı + (tamamlandıysa) tarih + başarı yüzdesi. Eşleştirme AD ile.
export interface MebiOgrenciTamamlama {
  adSoyad: string;
  tamamlandi: boolean;
  tarih?: string;   // "12.05.2026" (tamamlandıysa)
  yuzde?: number;   // başarı yüzdesi (tamamlandıysa)
}

export interface MebiKonuTamamlamaHam {
  ders: string;      // "Fizik" (breadcrumb)
  konu: string;      // "Basınç"
  sinif: string;     // "9-F" (başlıktan)
  branchId: string;  // e-Okul şube id'si ile AYNI (URL'den) — sınıf eşleştirmesi
  ogrenciler: MebiOgrenciTamamlama[];
}

// MEBİ ders konu listesi (lesson-details-tymm) — TEK derste TÜM konu envanteri +
// kaç öğrenci tamamlamış + başarı oranı. Tamamlayan 0 ise detay linki YOK (kimse yapmamış).
export interface MebiKonuEnvanterSatir {
  konu: string;
  tamamlayan: number;      // kaç öğrenci tamamladı
  basariYuzde?: number;    // sınıf başarı oranı (tamamlayan>0 ise)
}

export interface MebiKonuEnvanterHam {
  ders: string;
  sinif: string;
  branchId: string;
  konular: MebiKonuEnvanterSatir[];
}

// ─── MEBİ Hedef Temelli Destek Eğitimi — Ödevler (goal-based-support) ───────
// Öğretmenin MEBİ'de verdiği ÖDEV (test/quiz) türü kayıtlar Ödev Defteri'ne
// normal ödev olarak senkronlanır (bkz. OdevKaydi.kaynak==="mebi"). PDF türü
// statik kaynaklar öğrenci bazlı tamamlama içermediğinden bu boru hattına
// hiç girmez (adapter listeleme sırasında eler). Sadece OKUMA.
// ⚠ MEBİ bu ekranda da Okul No göstermez → eşleştirme AD ile (MEBİ istisnası).
// Not: MEBİ sayfası yalnız TAMAMLAYANLARI listeler (mebi-konu-tamamlama'nın
// aksine "tamamlamadı" satırı yok) — adapter bunu OLDUĞU GİBİ yansıtır,
// tamamlamayanları TAHMİN ETMEZ.

export interface MebiOdevSatir {
  id: string;              // MEBİ ödev guid'i
  baslik: string;
  olusturmaTarihi: string; // "19.07.2026"
  sonTarih?: string;       // MEBİ'nin "Bitiş Tarihi"si — YYYY-MM-DD'ye çevrilmiş
}

export interface MebiOdevEnvanterHam {
  odevler: MebiOdevSatir[];
}

export interface MebiOdevTamamlayan {
  adSoyad: string;
  tarih?: string;   // YYYY-MM-DD, tamamlanma tarihi (DOM'da varsa)
  yuzde?: number;
}

export interface MebiOdevSubeDetayHam {
  odevId: string;
  baslik: string;
  sube: string;      // "AL - 12. Sınıf / A Şubesi (ALANI YOK)" — MEBİ'nin kendi şube adı
  branchId: string;
  tamamlayanlar: MebiOdevTamamlayan[];
}

// ─── Kazanım / gelişim düzeyi (MASTER §10.1 — DERS/SINIF bazlı) ─────────────
// e-Okul gelişim düzeyi ekranında öğrenci No yok → ders bazlı kazanım LİSTESİ çekilir;
// işlenme takibini öğretmen elle yapar.

export interface KazanimMadde {
  id: string;       // e-Okul ham DOM referansı (rdMadde<konu>_<id>) — SAYFA BAŞINA
                    // sıfırlanır, kademe/derse göre BENZERSİZ DEĞİL. Kalıcı kimlik
                    // üretiminde KULLANILMAZ (bkz. @shared/kazanim::kazanimKimlikUret).
  metin: string;    // kazanım kodu + açıklama
  kod: string | null; // "FİZ.9.3.1." gibi tespit edilebiliyorsa; yoksa null
}

export interface KazanimKonu {
  ad: string;       // "AKIŞKANLAR"
  maddeler: KazanimMadde[];
}

export interface KazanimHam {
  sinifAd: string;
  ders: string;
  konular: KazanimKonu[];
}

/** e-Okul sayfa başlığından (adapters/eokul-profil.ts). Alanlar sayfada yoksa gelmez. */
export interface EokulProfilHam {
  ogretmenAdi?: string;
  okulAdi?: string;
  il?: string;
  ilce?: string;
  kurumKodu?: string;
  ogretimYili?: string;
  donem?: 1 | 2;
}

// ─── Köprü protokolü (MIMARI §1 — Local WebSocket) ─────────────────────────

export type KopruKaynak =
  | "eokul-ogrenci-liste" | "eokul-devamsizlik" | "eokul-sinav"
  | "eokul-performans-oku" | "eokul-kazanim" | "eokul-profil"
  | "mebi-konu-tamamlama" | "mebi-konu-envanter" | "mebi-odev-envanter" | "mebi-odev-detay";

export type KopruMesaj =
  | { type: "merhaba"; token: string; protocolVersion: number; extensionVersion: string }
  | { type: "auth_ok"; token: string; protocolVersion: number }
  | { type: "auth_error"; token: string; mesaj: string }
  | { type: "veri"; kaynak: KopruKaynak; token: string; requestId: string; payload: unknown[] }
  | { type: "veri_ok"; token: string; requestId: string }
  | { type: "veri_error"; token: string; requestId?: string; mesaj: string }
  | { type: "doldur"; hedef: "eokul-performans" | "oku"; token: string; payload: unknown }
  | { type: "doldur_sonuc"; token: string; requestId: string; payload: DoldurmaKopruSonucu }
  | { type: "durum"; token: string; mesaj: string };

export interface DoldurmaKopruSonucu {
  ok: boolean;
  yazilan: number;
  bulunamayan: string[];
  mesaj: string;
}

// Adapter sonucu — tanımazsa veri YAZMAZ (MIMARI §2).
export type AdapterSonuc<T> =
  | { ok: true; veri: T }
  | { ok: false; neden: string };

// ─── Ders Kitabı (kitaplık/okuyucu/kırpma) — dört katmanlı depolama modeli ──
// Kanonik veriler burada (Veritabani blob'unda) küçük kalır: kitap PDF'i
// diskte (app_data_dir/kitaplar), föy belgesi (gömülü JPEG'ler nedeniyle
// büyük) IndexedDB'de (bkz. modules/ders-kitabi/storage/foyDepo.ts) —
// yalnızca metadata'ları burada.

export interface KitapKaydi {
  id: string;              // uuid; dosya adıyla aynı (kitaplar/{id}.pdf)
  ad: string;
  yayin?: string;           // "MEB", "Palme"...
  ders?: string;
  sinifSeviyesi?: string;
  sayfaSayisi: number;
  dosyaHash: string;        // SHA-256 — aynı kitabın ikinci içe aktarımını engeller (öksüz eşleştirme)
  dosyaBoyut: number;       // byte
  sonSayfa: number;         // kaldığı yer
  eklenme: string;          // ISO
  arsiv?: boolean;          // true = dosyası silindi, kayıt (kırpma/not referansları için) duruyor
}

export interface KirpmaKaydi {
  id: string;
  kitapId: string;
  sayfa: number;
  // 0-1 aralığında NORMALİZE dikdörtgen: zoom/render çözünürlüğünden bağımsız.
  x: number; y: number; w: number; h: number;
  baslikTahmini?: string;
  // Öğretmenin Soru Havuzu'nda serbest yazdığı kategorileme — kitabın kendi
  // sinifSeviyesi/ders alanlarından BAĞIMSIZ (bir kitaptaki soru başka bir
  // sınıfa/konuya da atanabilir). İkisi de opsiyonel, boş bırakılabilir.
  sinif?: string;
  konu?: string;
  // Tam sayfa / sayfa aralığı tek mantıksal ödev sorusu olarak eklendiğinde
  // parçaları ilişkilendirir. Eski kırpma kayıtlarında bu alanlar bulunmaz.
  paketId?: string;
  paketSira?: number;       // 1 tabanlı parça sırası
  paketParcaSayisi?: number;
  eklenme: string;
}

export interface KitapNotuKaydi {
  id: string;
  kitapId: string;
  sayfa: number;
  x?: number; y?: number; w?: number; h?: number; // opsiyonel vurgu dikdörtgeni (normalize)
  metinHtml: string;        // htmlTemizle'den geçmiş olmalı (girişte VE okumada)
  amac?: "sinav" | "odev" | "ders";
  /** OA77: "Sınavda sor" notu sınava alındı (öğretmen işaretler; tarih). Sınav Hazırla → "Sınav için ayırdıkların". */
  sinavaAlindi?: string;
  eklenme: string;
  guncelleme: string;
}

// Föy = sınav oluşturucunun 'foy' belgeTuru'yle ürettiği taslak (Faz 2).
// taslakJson burada DEĞİL — foyDepo.ts'te (IndexedDB, foyId anahtarlı).
export interface FoyKaydi {
  id: string;
  ad: string;
  sinifIdler?: number[];
  teslim?: string;
  olusturma: string;
}

// Sınav kütüphanesi. Föy ile AYNI ayrım: küçük metadata burada (Veritabani JSON
// blob'unda), büyük içerik (gömülü görselli SinavTaslagi) IndexedDB'de sinavId
// anahtarıyla — bkz. sinav-olusturucu/storage/taslakDepo.ts.
//
// FoyKaydi'nin AKSİNE soru/sayfa sayısı ve boyut burada ÖNBELLEKLENİR: föy
// listesi "N soru" yazabilmek için her föyün tüm gömülü JPEG'lerini belleğe
// okuyor (FoylerimBolumu) — 20 sınavda bu ekranı her açışta yüzlerce MB demek
// olurdu. Liste bu alanlarla içeriğe hiç dokunmadan çizilir.
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

// ─── Ders Kitabı → Sınav Oluşturucu köprüsü (sepetten "sınava gönder") ──────
// Modüller birbirinin kodunu çağırmaz (CLAUDE.md); bu, iki modülün de yalnızca
// packages/shared'a bağımlı kaldığı, router state ile taşınan sabit bir
// sözleşmedir (bkz. modules/ders-kitabi KitapOkuyucuScreen → navigate(state)
// ve sinav-olusturucu SinavOlusturucuScreen'in bunu okuyan effect'i).
export interface DersKitabiGorselAktarimi {
  dataUrl: string;
  oran: number;
  kaynakAd?: string;   // "Palme Mat 9, s. 147" — kaynak rozeti
  kirpmaId?: string;   // köken referansı; kitap silinse de belge kendine yeter
  kitapId?: string;
  sayfa?: number;
  sinif?: string;      // kırpma sınıfı; boşsa kitabın sınıf seviyesi
  ders?: string;
  konu?: string;
  logicalQuestionId?: string; // çok sayfalı pakette ortak, tek soruda kırpma id'si
  dosyaAdi?: string;
  paketId?: string;
  paketSira?: number;
  paketParcaSayisi?: number;
  paketBasligi?: string;
  /** Kirpma kitabin TAM SAYFASI mi (x/y=0, w/h=1)? Alici taraf bunu bilmeden
   *  her aktarimi sutun genisligine kuculttugu icin tam sayfa gonderimler
   *  okunamayacak kadar kucuk cikiyordu. Bkz. sayfaPaketi.ts: tam sayfa ve
   *  sayfa araligi kayitlari 0..1 kutusuyla uretilir. */
  tamSayfaMi?: boolean;
  /** Soru Havuzu'nda isaretlenmis dogru sik (A-E). Sinav Olusturucu bunu
   *  SoruOgesi.dogruSik'e yazar; cevap anahtari cikti da ondan uretilir.
   *  Bos birakilabilir - test olmayan sorularda anlami yok. */
  dogruSik?: string;
}

export interface DersKitabiAktarimHatasi {
  kirpmaId: string;
  kaynakAd: string;
  neden: string;
}

/** Ders Kitabı → Sınav Oluşturucu router state sözleşmesi. Gömülemeyen
 * kırpmalar Seçilen Sorular'da tutulur; sayı hedef ekranda kullanıcıya bildirilir. */
export type SinavAktarimKaynagi = "ders-kitabi" | "soru-havuzu";

export interface DersKitabiSinavAktarimState {
  /** Yeni sözleşmede route yalnız küçük zarf referansını taşır. */
  transferId?: string;
  version?: number;
  source?: SinavAktarimKaynagi;
  /** Geçiş dönemi: eski doğrudan payload route state'i okunmaya devam eder. */
  iceAktarilacakGorseller?: DersKitabiGorselAktarimi[];
  gonderilemeyenSayisi?: number;
  gonderilemeyenler?: DersKitabiAktarimHatasi[];
}

// ─── ŞÖK (Şube Öğretmenler Kurulu) Raporu (MEB formatı) ────────────────────
// Word jeneratörü ayrı gelecek; burada yalnız veri modeli.

export type SokSablonTipi = "hizli" | "detayli";

export interface SokToplanti {
  okulAdi: string;          // auto-fill (useEokulProfil)
  tarih: string;            // ISO "yyyy-mm-dd"
  saat: string;             // "14:30"
  donem: string;            // "2025-2026 / 2. Dönem"
  sinif: string;            // "10-B"
  rehberOgretmen: string;   // sınıf rehber öğretmeni (auto-fill)
  okulMuduru: string;       // auto-fill (ZORUNLU)
  mudurYardimcisi?: string; // kurul başkanı (opsiyonel; boşsa müdür kullanılır)
}

export interface SokKatilimci {
  id: number;
  ad: string;
  brans: string;
}

// Gündem maddesi VE alınan karar aynı yapıyı paylaşır (düzenlenebilir liste).
export interface SokMadde {
  id: number;
  metin: string;
}

// Özel öğrenci gündemi — riskli öğrenci + ilgili öğretmen yorumu (rapora gömülür).
export interface SokOgrenciGundem {
  ogrenciId: number;
  ad: string;               // ad soyad
  sinif: string;
  riskSeviye: RiskSeviye;
  riskNedenleri: string[];
  yorum: string;            // "Fizik notu düşük", "Devamsızlık arttı" ...
  ozelDurumlar: string[];   // GİZLİ — yalnız ŞÖK raporu Madde 6 & 11'e işlenir; genel listelerde gösterilmez
}

export interface SokRapor {
  sablon: SokSablonTipi;
  toplanti: SokToplanti;
  katilimcilar: SokKatilimci[];
  gundem: SokMadde[];
  kararlar: SokMadde[];
  ogrenciGundemleri: SokOgrenciGundem[];
}
