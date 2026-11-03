import { sinifSirala } from "@/core/sinifSirasi";
import { telefonPlani } from "@/lib/telefonBirlestirme";
import type { DersIciAyar, DersIciBant } from "@/core/dersIci";
import { VARSAYILAN_DERS_ICI, dersIciAyarHatasi } from "@/core/dersIci";
import type { PerformansSablonu } from "@/core/performansSablonu";
import { agirliklardanSablon, etkinAgirliklar, sablonHatasi, sablonNormallestir, kalemAdi } from "@/core/performansSablonu";
import type { PerformansDuzeni } from "@/core/performansDuzeni";
import { duzenHatasi, duzenNormallestir, sablondanDuzen, duzenKalemleri, sutunAdi, duzenEtkinAgirliklar } from "@/core/performansDuzeni";
import type { IslemeZarfi } from "@shared/islemeZarfi";
// db/repo.ts — uygulamanın tek veri katmanı.
//
// Ekranlar bu repo ARAYÜZÜNÜ çağırır. Masaüstü uygulamada ana kalıcı depo
// Tauri tarafındaki SQLite dosyasıdır; tarayıcı önizlemesinde localStorage fallback olarak
// çalışır. Böylece yıl boyu günlük kayıtlar WebView temizlenince kaybolmaz.
//
// ZORUNLU KURAL (2026-08'de `kitapEkle`'de bulunan gerçek veri kaybından sonra
// TÜM dosyaya uygulandı): her `kaydet(db)` çağrısı bir `try` İÇİNDE olmalı ve
// `catch` bloğu o fonksiyonun değiştirdiği TÜM `db.*` alanlarını (ve varsa
// sayaçları: `sonXId`) çağrıdan ÖNCEKİ değerine geri yüklemeli, sonra hatayı
// yeniden fırlatmalı. Neden: `kaydet()` (localStorage kotası dolması gibi bir
// nedenle) başarısız olabilir; geri alma yoksa değişiklik BELLEKTE "hayalet"
// olarak kalır — ekranda başarılı görünüp diske hiç yazılmaz, bir sonraki
// başarılı `kaydet()` onu fark ettirmeden diske sızdırır ya da uygulama o
// arada kapanırsa sessizce kaybolur.
//
// İKİ TUZAK, ikisi de bu turda yakalandı:
// 1) Diziyi `.push()` ile YERİNDE değiştirmek: `const onceki = db.x; db.x.push(y)`
//    sonrası `onceki` de ZATEN değişmiş aynı diziyi gösterir — rollback hiçbir
//    şey geri almaz. Her zaman `db.x = [...db.x, y]` (yeni dizi referansı) kullan.
// 2) Sayaç önce artırılıp SONRA "önceki" diye yakalanırsa (`const yeni = {id:
//    ++db.sonXId}; const oncekiId = db.sonXId`), geri alma sayacı zaten artmış
//    değerine "geri yükler" — bir id boşa gider. Sayacı ARTIRMADAN ÖNCE yakala.
// 3) Bir dizi elemanı `.find()` ile bulup alanlarını doğrudan mutasyona uğratmak
//    (`const o = db.x.find(...); o.alan = yeni`) da aynı tuzağa düşer — dizi
//    referansı değişmese de içindeki nesne değişir. Alan(lar)ın eski değerini
//    AYRI yakalayıp catch'te tek tek geri ata (bkz. `ogrenciNoGuncelle`).

import type {
  EokulProfilHam,
  Sinif, Ogrenci, Kriter, Devamsizlik, GunlukKayit, GunlukIslendi, EokulDevamsizlikHam, DonemAgirlik,
  SinavNotu, EokulSinavHam, EokulPerformansHam, DavranisEtiket, OgrenciEtiket, DersProgrami, EokulSinifListe,
  TutanakKaydi, MebiKonuTamamlamaHam, MebiKonuEnvanterHam, KazanimHam, OdevKaydi, OdevPuani, Gorev,
  KitapKaydi, KirpmaKaydi, KitapNotuKaydi, FoyKaydi, SinavKaydi, DonemDurumu, DonemSnapshot, DonemSnapshotOgrenci, YilArsivi,
  MebiOdevEnvanterHam, MebiOdevSubeDetayHam, RubrikOlcek, RubrikSablonu,
} from "@shared/types";
import { dersAnahtari } from "@shared/types";
import { odevAgirligiGecerli, odevEksiPuaniGecerli, odevNotNoGecerli } from "@/core/odevAyar";
import { notBasamakKaynagiBagla } from "@/core/notBasamak";
import { gecikmeGecerliMi, saatDakika, zilSaatleriHatasi, VARSAYILAN_GECIKME_DK, type HatirlatmaAyari, type ZilSaatleri } from "@/core/hatirlatma";
import { rubrikHatasi, rubrikKopyala, rubrikNormallestir, rubrikSecimiNormallestir } from "@/core/rubrik";
import { sinifDersleri } from "@shared/types";
import { gunDersiCoz, gunDerseSayilir, gunlukSuzmeDersi } from "@/core/gunDersi";
import { foySiniflariniNormalle } from "@shared/foy";
import { kazanimKimlikUret, kazanimKoduTespitEt, sonrakiOgretimYili, varsayilanOgretimYili } from "@shared/kazanim";
import { VARSAYILAN_RISK_ESIKLERI, type RiskEsikleri } from "@/core/risk";
import { kumulatifKirilimHesapla, type KirilimSonucu } from "@/core/donem";
import { demoVeriUret } from "@/db/demoVeri";
import {
  seedSiniflar, seedOgrenciler, seedKriterler, seedDevamsizlik, seedEksikOdev, seedAgirliklari,
  seedDavranisEtiketleri, seedDersProgrami, seedKazanimlar, seedOdevler, seedOdevPuanlari,
} from "./seed";
import { simdiYerelISO, bugunYerelISO } from "@/lib/tarih";
import { kaliciDepoVarMi } from "@/lib/platform";
import { sqliteJsonHemenKaydet, sqliteJsonKaydet, sqliteJsonYukle, sqliteDosyaYolu, sonKaliciHata } from "@/db/persistence";

// Seed/şema değişince bu sürümü ARTIR → eski kayıtlı veri atlanıp yeni seed yüklenir
// (kullanıcının elle localStorage.clear() yapmasına gerek kalmaz).
const ANAHTAR = "ogretmen-asistani.db.v6";
const KATILIM_TABAN_VARSAYILAN = 50;
function gecerliTaban(x: unknown): number {
  return typeof x === "number" && Number.isFinite(x) && x >= 0 && x <= 100 ? Math.round(x) : KATILIM_TABAN_VARSAYILAN;
} // localStorage önbellek/göç anahtarı

// ─── OA74 hız: türetilmiş indeks önbelleği ───────────────────────────────────
// NEDEN: ekranlar (Bugün, Sınıf Listesi, raporlar, Aktar) öğrenci başına işlenen günleri,
// ödev puanlarını, kayıtları her çağrıda TÜM tablolar taranarak hesaplıyordu (14 sınıf /
// 594 öğrencide Bugün 3 sn). Türetilmiş indeksler burada VERİ SÜRÜMÜNE bağlı tutulur;
// hesap kuralı DEĞİŞMEDİ, yalnız aynı sonuç bir kez hesaplanır (notlar birebir aynı).
//
// SÜRÜM ne zaman artar (biri yeter, önbellek tümden düşer):
//  1) her `kaydet()` çağrısında — başta VE sonda (başarısız kaydet + catch'teki geri alma da
//     yeni sürümle okunur). Yerinde nesne alanı değişimi (ZORUNLU KURAL tuzak 3) böyle görünür.
//  2) `db` yerine yenisi konduğunda (içe aktarma, geri yükleme ve geri alması, yeni yıl, demo,
//     sıfırlama, telefon zarfı, açılış) — `veriDegisti()` + kimlik kontrolü.
//  3) İzlenen tablolardan birinin DİZİ KİMLİĞİ değiştiğinde (ZORUNLU KURAL gereği her yazma
//     yeni dizi kurar) — kaydet'ten önce aynı fonksiyonda yapılan okuma da bayat görmez.
// Önbellekten dışarı verilen dizi/küme/nesne HER ZAMAN kopyadır (çağıran değiştirse de bozulmaz).
// Yeni bir yazma yolu yerinde nesne değiştirip kaydet'ten ÖNCE türetilmiş veri okuyacaksa
// araya `veriDegisti()` koy. Test: `tests/onbellek-senaryolari.ts` (test:onbellek).
let veriSurumu = 0;
/** İzlenen tabloların son görülen kimlikleri (açık alan karşılaştırması: bu fonksiyon çok sık çağrılır). */
const iz: { db: Veritabani | null } & { -readonly [K in IzlenenAlan]?: Veritabani[K] } = { db: null };
type IzlenenAlan = "siniflar" | "ogrenciler" | "kriterler" | "devamsizlik" | "gunlukKayitlar" | "gunlukIslendi" | "dersYapilmadi" | "gelmedi" | "subeTasimalari" | "donemDurumu" | "odevler" | "odevPuanlari" | "sinavNotlari" | "elleNotlar" | "performansIstisnalari" | "olumluEklemeleri" | "mebiKonuDurum" | "mebiAdEslemeleri" | "ayarlar";

function veriDegisti(): void {
  veriSurumu++;
}

/** Güncel veri sürümü (kimlik değişimi varsa önce artırır). lib/ katmanındaki önbellekler de bunu anahtar alır. */
export function veriSurumuGetir(): number {
  const v = db;
  if (
    iz.db !== v ||
    iz.siniflar !== v.siniflar ||
    iz.ogrenciler !== v.ogrenciler ||
    iz.kriterler !== v.kriterler ||
    iz.devamsizlik !== v.devamsizlik ||
    iz.gunlukKayitlar !== v.gunlukKayitlar ||
    iz.gunlukIslendi !== v.gunlukIslendi ||
    iz.dersYapilmadi !== v.dersYapilmadi ||
    iz.gelmedi !== v.gelmedi ||
    iz.subeTasimalari !== v.subeTasimalari ||
    iz.donemDurumu !== v.donemDurumu ||
    iz.odevler !== v.odevler ||
    iz.odevPuanlari !== v.odevPuanlari ||
    iz.sinavNotlari !== v.sinavNotlari ||
    iz.elleNotlar !== v.elleNotlar ||
    iz.performansIstisnalari !== v.performansIstisnalari ||
    iz.olumluEklemeleri !== v.olumluEklemeleri ||
    iz.mebiKonuDurum !== v.mebiKonuDurum ||
    iz.mebiAdEslemeleri !== v.mebiAdEslemeleri ||
    iz.ayarlar !== v.ayarlar
  ) {
    iz.db = v;
    iz.siniflar = v.siniflar;
    iz.ogrenciler = v.ogrenciler;
    iz.kriterler = v.kriterler;
    iz.devamsizlik = v.devamsizlik;
    iz.gunlukKayitlar = v.gunlukKayitlar;
    iz.gunlukIslendi = v.gunlukIslendi;
    iz.dersYapilmadi = v.dersYapilmadi;
    iz.gelmedi = v.gelmedi;
    iz.subeTasimalari = v.subeTasimalari;
    iz.donemDurumu = v.donemDurumu;
    iz.odevler = v.odevler;
    iz.odevPuanlari = v.odevPuanlari;
    iz.sinavNotlari = v.sinavNotlari;
    iz.elleNotlar = v.elleNotlar;
    iz.performansIstisnalari = v.performansIstisnalari;
    iz.olumluEklemeleri = v.olumluEklemeleri;
    iz.mebiKonuDurum = v.mebiKonuDurum;
    iz.mebiAdEslemeleri = v.mebiAdEslemeleri;
    iz.ayarlar = v.ayarlar;
    veriSurumu++;
  }
  return veriSurumu;
}

/** YALNIZ TEST: tüm türetilmiş önbelleği düşürür (önbellekli ve önbelleksiz hesap karşılaştırması için). */
export function onbellegiTemizle(): void {
  veriSurumu++;
  turetilmisOnbellek = null;
}

interface Turetilmis {
  surum: number;
  ogrenciById?: Map<number, Ogrenci>;
  ogrencilerBySinif?: Map<number, Ogrenci[]>;
  sinifById?: Map<number, Sinif>;
  sinifDers: Map<number, string[]>;
  kayitlarByOgrenci?: Map<number, GunlukKayit[]>;
  gelmediByOgrenci?: Map<number, GelmediKaydi[]>;
  islendiBySinif?: Map<number, GunlukIslendi[]>;
  yapilmadiBySinif?: Map<number, Set<string>>;
  tasima?: Map<number, SubeTasimaKaydi[]>;
  gunDonemi?: (tarih: string) => 1 | 2;
  kayitGunleriBySinif?: Map<number, Set<string>>;
  sinifIslenen: Map<string, Set<string>>;
  ogrenciIslenen: Map<string, Set<string>>;
  suzgec: Map<string, ((tarih: string) => boolean) | null>;
  odevPuanDonemli?: Map<number, OgrenciOdevPuaniDonemli[]>;
  sinavByOgrenci?: Map<number, SinavNotu[]>;
  elleByOgrenci?: Map<number, ElleNot[]>;
  istisnaByOgrenci?: Map<number, PerformansIstisnasi[]>;
  mebiKonuByOgrenci?: Map<number, MebiKonuKaydi[]>;
  devamsizlikByOgrenci?: Map<number, Devamsizlik>;
  mebiAdIndeksi?: Map<string, Ogrenci[]>;
  mebiAliasIndeksi?: Map<string, MebiAdEsleme[]>;
  mebiBaglam: Map<string, boolean>;
  sinifDersAnahtar?: Map<number, string[] | null>;
}
let turetilmisOnbellek: Turetilmis | null = null;

function T(): Turetilmis {
  const surum = veriSurumuGetir();
  if (!turetilmisOnbellek || turetilmisOnbellek.surum !== surum) {
    turetilmisOnbellek = { surum, sinifDers: new Map(), sinifIslenen: new Map(), ogrenciIslenen: new Map(), suzgec: new Map(), mebiBaglam: new Map() };
  }
  return turetilmisOnbellek;
}

/** Diziyi anahtara göre gruplar (dizideki sıra korunur). */
function grupla<K, V>(liste: readonly V[], anahtar: (x: V) => K): Map<K, V[]> {
  const m = new Map<K, V[]>();
  for (const x of liste) {
    const k = anahtar(x);
    const l = m.get(k);
    if (l) l.push(x); else m.set(k, [x]);
  }
  return m;
}

/** İlk eşleşen (Array.find ile aynı) — kimliğe göre. */
function ilkIndeks<K, V>(liste: readonly V[], anahtar: (x: V) => K): Map<K, V> {
  const m = new Map<K, V>();
  for (const x of liste) { const k = anahtar(x); if (!m.has(k)) m.set(k, x); }
  return m;
}

function ogrenciIndeksi(): Map<number, Ogrenci> {
  const t = T();
  return (t.ogrenciById ??= ilkIndeks(db.ogrenciler, (o) => o.id));
}

function sinifIndeksi(): Map<number, Sinif> {
  const t = T();
  return (t.sinifById ??= ilkIndeks(db.siniflar, (s) => s.id));
}

function ogrenciKayitIndeksi(): Map<number, GunlukKayit[]> {
  const t = T();
  return (t.kayitlarByOgrenci ??= grupla(db.gunlukKayitlar, (k) => k.ogrenciId));
}

interface Veritabani {
  siniflar: Sinif[];
  ogrenciler: Ogrenci[];
  kriterler: Kriter[];
  devamsizlik: Devamsizlik[];
  eksikOdev: Record<number, number>;
  gunlukKayitlar: GunlukKayit[];
  sonGunlukId: number;
  // "Hiç bakılmadı" ile "baktım, istisna yok" ayrımı — Kural 1'de istisnasız
  // bir gün hiç GunlukKayit üretmediği için bu izi ayrı tutmak gerekiyor
  // (bkz. gunuIsaretle / gunIslendiMi, modules/hizli-isleme).
  gunlukIslendi: GunlukIslendi[];
  /** Programda ders vardı ama YAPILMADI (tatil, gezi, rapor, sınav...). Bu günler
   *  "işlenmemiş ders" uyarısına ve katılım/kitap paydasına girmez. */
  dersYapilmadi: DersYapilmadi[];
  /** Hızlı İşleme'de "Yok" işaretlenen öğrenciler (sınıf+tarih). O gün öğrencinin
   *  katılım/kitap paydasından düşer. e-Okul devamsızlığının YERİNE GEÇMEZ. */
  gelmedi: GelmediKaydi[];
  /** OA74: şube taşıma geçmişi (`ogrenciSubeTasi` yazar). GunlukKayit sınıf taşımadığı için
   *  taşınan öğrencinin eski kayıtları, tarihine göre o gün bulunduğu sınıfa bağlanır
   *  (`ogrencininTarihtekiSinifi`). Eski kayıtta yok → [] (taşıması bilinmeyen öğrenci hep
   *  şu anki sınıfında sayılır — eski davranış). */
  subeTasimalari?: SubeTasimaKaydi[];
  // Dönem Yaşam Döngüsü — durum makinesi (D1_ACIK -> D2_ACIK -> YIL_SONU).
  // Geçiş YALNIZ kapanış sihirbazıyla olur; dönem seçtirmeyen ekranlar (risk,
  // Bugün) bu değeri varsayılan olarak kullanır (aktifDonem null ise "yil").
  donemDurumu: DonemDurumu;
  donemSnapshotlar: DonemSnapshot[]; // kapanış anının immutable fotoğrafı
  yilArsivleri: YilArsivi[]; // yıl geçişi izleri — ham veriyi silmez/taşımaz
  donemAgirliklari: DonemAgirlik[];
  /** Öğretmenin "elle not" kalemlerine (proje, sunum…) girdiği notlar — kalem tanımı
   *  performans şablonunda (ayarlar.performansSablonlari). Eski kayıtta yok → []. */
  elleNotlar?: ElleNot[];
  /** OA55: öğretmenin bir öğrencide bir performans kalemini hesaba KATMAMA kararı
   *  (ör. sessiz öğrencide aktif katılım). Sebep bilerek saklanmaz. Eski kayıtta yok → []. */
  performansIstisnalari?: PerformansIstisnasi[];
  /** OA76: dönem sonunda öğretmenin olumlu davranış için bir Performans notuna eklediği puan
   *  (otomatik değil; not 100'ü geçmez). `ders`: iki dersli şubede dersAnahtari. Eski kayıtta yok → []. */
  olumluEklemeleri?: OlumluEkleme[];
  /** Denetim (2026-10): verilen en büyük sınıf/öğrenci kimliği. Silinen kaydın kimliği yeni
   *  kayda VERİLMEZ (eskiden "en büyük + 1" idi → silinen son öğrencinin artığı yenisine geçebiliyordu). */
  sonSinifId?: number;
  sonOgrenciId?: number;
  // Opsiyonel: eski kayıtlı veritabanlarında yok — okurken core/risk.ts'in
  // varsayılanına düşülür (riskEsikleriGetir). Migration gerektirmez.
  riskEsikleri?: RiskEsikleri;
  sinavNotlari: SinavNotu[];
  performansNotlari: SinavNotu[]; // e-Okul'dan çekilen ders içi performans (1.Performans..)
  davranisEtiketleri: DavranisEtiket[];
  ogrenciEtiketleri: OgrenciEtiket[];
  dersProgrami: DersProgrami[];
  tutanaklar: TutanakKaydi[];
  gorevler: Gorev[];
  sonGorevId: number;
  mebiDurum: Array<{ ogrenciId: number; tamamlanan: number; toplam: number }>;
  mebiKonuDurum: MebiKonuKaydi[]; // konu bazında detay (öğrenci × konu)
  mebiEnvanter: MebiEnvanterKaydi[]; // ders konu envanteri (sınıf × konu: tamamlayan sayısı)
  // Hedef Temelli Destek Eğitimi ödevleri artık `odevler`/`odevPuanlari`nın
  // içinde yaşar (kaynak==="mebi") — bu yalnız MEBİ'nin ödev başlığı/son tarihini
  // önbelleğe alır (envanter, ilgili sınıfta OdevKaydi oluşmadan da gelebilir).
  mebiOdevMeta: MebiOdevMeta[];
  // Kazanım TANIMI (e-Okul'dan gelen, yeniden çekilebilir önbellek) ile SINIF
  // BAZLI İŞLENME KAYDI (öğretmenin elle girdiği, yeniden üretilemez) ayrı
  // tutulur. Kimlik e-Okul'un ham DOM id'sinden bağımsız bileşik bir anahtardan
  // türetilir (bkz. @shared/kazanim::kazanimKimlikUret) — DOM id'si sayfa
  // başına sıfırlandığı için kademe/derse göre benzersiz DEĞİL; doğrudan
  // kullanılsaydı farklı kademelerin kazanımları birbirinin üzerine yazardı
  // (2026-08 sağlamlaştırma turunda bulunan gerçek veri bozulması hatası).
  kazanimTanimlari: KazanimTanimi[];
  kazanimIslenmeKayitlari: Record<number, Record<string, KazanimIslenmeKaydi>>; // sinifId -> kazanimId -> kayıt
  odevler: OdevKaydi[];
  odevPuanlari: OdevPuani[];
  sonKriterId: number;
  sonOdevId: number;
  sonEtiketId: number;
  sonOgrenciEtiketId: number;
  sonDersId: number;
  sonTutanakId: number;
  senkronLog: Array<{ kaynak: string; zaman: string }>;
  islemGunlugu: IslemGunluguKaydi[];
  sonLogId: number;
  mebiAdEslemeleri: MebiAdEsleme[];
  // Ders Kitabı modülü — kanonik metadata (PDF diski dosya sisteminde,
  // föy taslak JSON'u IndexedDB'de; burada yalnızca küçük referanslar).
  kitaplar: KitapKaydi[];
  kirpmalar: KirpmaKaydi[];
  kitapNotlari: KitapNotuKaydi[];
  foyler: FoyKaydi[];
  // Sınav kütüphanesi metadata'sı; içerik IndexedDB'de (taslakDepo.ts).
  sinavlar: SinavKaydi[];
  ayarlar: {
    kazanimTakibiAktif: boolean; aktifOgretimYili: string; veriYokPerformansPuani: number; katilimTabanPuani: number;
    sonYedekZamani?: string; okulProfili?: OkulProfili;
    /** Dönem başına performans şablonu; yoksa donemAgirliklari'ndan türetilir. */
    performansSablonlari?: { 1?: PerformansSablonu; 2?: PerformansSablonu };
    /** OA54: dönem başına performans DÜZENİ (1–3 e-Okul sütunu). Yoksa şablondan tek sütun türetilir. */
    performansDuzenleri?: { 1?: PerformansDuzeni; 2?: PerformansDuzeni };
    /** OA69: derse özel düzen (anahtar = dersAnahtari(ders)). Anahtar VARSA o ders "ayrı düzen"
     *  kullanır (öğretmen Ayarlar'da açtı); dönem kaydı yoksa 2. dönem 1.'yi devralır, o da yoksa
     *  ortak düzen. Ortak düzen ve donemAgirliklari bundan ETKİLENMEZ — telefon/Hızlı İşleme
     *  ortak düzeni okumaya devam eder. */
    performansDuzenleriDers?: Record<string, { 1?: PerformansDuzeni; 2?: PerformansDuzeni }>;
    /** Denetim (2026-10): kayıtlı düzen okunamadıysa (bozuk yedek) ham hâli burada saklanır ve ekranda
     *  söylenir — eskiden sessizce atılıp notlar eski varsayılana dönüyordu. Öğretmen yeniden kaydedince silinir. */
    performansDuzeniOkunamadi?: Array<{ donem: 1 | 2; ham: string }>;
    /** e-Okul başlığından en son okunan profil (eklenti, adapters/eokul-profil.ts). */
    eokulProfil?: EokulProfilHam & { zaman: string };
    /** Okul profili doluyken e-Okul'da FARKLI görünen alanlar — sessizce yazılmaz, sorulur. */
    eokulProfilOnerisi?: Partial<Pick<OkulProfili, "okulAdi" | "ogretmenAdi" | "ilce">>; programDegisim?: Record<string, string>;
    /** Telefon (Android tam) ↔ Chrome eklentisi karekod eşleşmesi: packages/shared/eklentiPaketi.ts
     *  `eslesmeSakla` biçimi. Android'de tüm veri gibi cihazda şifreli durur. */
    eklentiEslesme?: EklentiEslesmeKaydi;
    /** Ders içi (katılım) puanlama: ↑/↓ sayımı → puan (core/dersIci.ts). Yoksa varsayılan. */
    dersIci?: DersIciAyar;
    /** Karekod/dosyayla alınıp işlenmiş son 50 eklenti paketinin kimliği (çift işlemeyi önler). */
    eklentiIslenenPaketler?: string[];
    /** OA58: öğretmenin kayıtlı dereceli puanlama ölçekleri (ödeve KOPYALANARAK verilir). */
    rubrikSablonlari?: RubrikSablonu[];
    /** OA59: performans notlarının virgülden sonra kaç basamakla tutulacağı (0 = tam sayı, varsayılan). */
    notBasamak?: 0 | 1 | 2;
    /** OA70: okulun zil saatleri (dersler[0] = 1. ders). Okuldan okula değişir, öğretmen girer —
     *  tahmin edilmez. Yoksa "dersi işlemedin" hatırlatması planlanamaz. */
    zilSaatleri?: ZilSaatleri;
    /** OA70: telefonda "dersi işlemediysem hatırlat" (core/hatirlatma.ts). Yoksa kapalı. */
    hatirlatma?: HatirlatmaAyari;
  };
}

export interface KazanimTanimi {
  id: string;            // bileşik kimlik (kazanimKimlikUret) — e-Okul'un ham DOM id'sinden BAĞIMSIZ
  ogretimYili: string;   // "2025-2026"
  kademe: string;
  ders: string;
  kod: string | null;
  konu: string;
  metin: string;
  kaynak: "eokul" | "yillik-plan";
  // Kaynakta (e-Okul'un güncel çekişinde) artık yok ama en az bir sınıfta
  // işlenmişti — kayıp önlemek için silinmeden bu bayrakla işaretlenir.
  // `kademeKazanimlari` bunları hariç tutar; yalnız `kademeKaldirilanKazanimlari`
  // döner. Eski kayıtlarda hiç yok — undefined zaten "aktif" demek.
  silindiKaynakta?: boolean;
  // Yıllık plandan gelir (e-Okul'da bu bilgi yok). Eşleşen bir e-Okul kazanımına
  // da SONRADAN eklenebilir (bkz. yillikPlanIceAktar) — metin/konu değişmez.
  ay?: number;   // 1-12
  hafta?: number;
}

/** Yıllık plan Excel'inden ayrıştırılmış, önizlemede onaylanmış bir satır
 *  (bkz. modules/kazanim/lib/yillikPlanExcel.ts). */
export interface YillikPlanSatiri {
  konu: string;
  metin: string;
  ay?: number;
  hafta?: number;
  belirsiz?: string;
}

export interface KazanimIslenmeKaydi {
  kazanimId: string;
  sinifId: number;
  islendi: boolean;
  tarih: string;      // ISO — en son işaretlenme tarihi
  donem: 1 | 2;
  kaynak: "elle";
  guncelleme: string; // ISO
}

// Gerçek (dağıtım) derlemesinde uygulama tamamen BOŞ başlar — öğretmen kendi
// sınıfını/öğrencilerini e-Okul'dan aktarır veya elle girer. Örnek seed verisi
// (sahte sınıflar, öğrenciler, "Fizik" branşı vb.) yalnızca geliştirme sırasında
// (npm run dev / tauri dev) ekranları canlı test edebilmek için yüklenir.
const GELISTIRME = import.meta.env.DEV;

/**
 * DENEME DERLEMESİ — yalnız `VITE_OA_DENEME=1` ile derlenmiş paketlerde açık.
 *
 * NEDEN AYRI BAYRAK: normal ürün BOŞ açılmalı, gerçek bir öğretmen sahte
 * öğrencilerle karşılaşmamalı. Ama dağıtılan deneme sürümünde kullanıcı
 * Ayarlar'ı bulup düğmeye basmak zorunda kalmasın isteniyor. İkisi aynı kod,
 * farklı derleme.
 *
 * YALNIZ İLK AÇILIŞTA: ilkVeri() sadece depoda hiç veri yokken çağrılıyor
 * (localYukle / veritabaniHazirla). Yani kullanıcı çalışmaya başladıktan sonra
 * demo veri onun kayıtlarının üstüne YAZMAZ.
 */
// `?.` ŞART: test derlemelerinde esbuild yalnız `import.meta.env.DEV`i define
// ediyor, `import.meta.env` nesnesi tanımsız kalıyor ve düz erişim patlıyor
// (faz2 süiti bunu ilk koşumda yakaladı).
const DENEME_DERLEMESI = import.meta.env?.VITE_OA_DENEME === "1";

/** Yeni kurulumda ve Hızlı İşleme'deki "önerilen kriterleri ekle" düğmesinde
 *  kullanılan başlangıç seti (Kural 4: şablon kolaylaştırır, öğretmen düzenler). */
export const VARSAYILAN_KRITERLER: Kriter[] = seedKriterler.map((k) => ({ ...k }));
export const VARSAYILAN_AGIRLIKLAR: DonemAgirlik[] = [1, 2].flatMap((donem) =>
  seedAgirliklari.filter((a) => a.donem === 1).map((a) => ({ ...a, donem: donem as 1 | 2 })));

function ilkVeri(): Veritabani {
  // DİKKAT — burada bosVeri() ÇAĞRILAMAZ. ilkVeri() modül yüklenirken, tam
  // `let db = localVeriYukle()` satırında çalışıyor; bosVeri() ise `db.donemDurumu`
  // okuyor. Yani db henüz atanmamışken kendisine erişilir ve uygulama
  // "Cannot access before initialization" ile AÇILMAZ. Deneme derlemesi ilk
  // koşumda tam olarak böyle çöktü; demo dalı bu yüzden aşağıdaki taban nesnenin
  // üstüne biniyor, bosVeri()'ye hiç uğramıyor.
  const taban: Veritabani = {
    siniflar: GELISTIRME ? seedSiniflar : [],
    ogrenciler: GELISTIRME ? seedOgrenciler : [],
    // Üretimde de ÖNERİLEN kriter + ağırlık seti gelir (2026-09 denetimi: temiz
    // kurulumda Hızlı İşleme'de hiç düğme yoktu, öğretmen nedenini bulamıyordu).
    // Öğrenci/sınıf seed'i yalnız geliştirmede.
    kriterler: VARSAYILAN_KRITERLER,
    devamsizlik: GELISTIRME ? seedDevamsizlik : [],
    eksikOdev: GELISTIRME ? seedEksikOdev : {},
    gunlukKayitlar: [],
    sonGunlukId: 0,
    gunlukIslendi: [],
    dersYapilmadi: [],
    gelmedi: [],
    donemDurumu: { aktifDonem: 1 },
    donemSnapshotlar: [],
    yilArsivleri: [],
    donemAgirliklari: VARSAYILAN_AGIRLIKLAR,
    sinavNotlari: [],
    performansNotlari: [],
    davranisEtiketleri: GELISTIRME ? seedDavranisEtiketleri : [],
    ogrenciEtiketleri: [],
    dersProgrami: GELISTIRME ? seedDersProgrami : [],
    tutanaklar: [],
    gorevler: [],
    sonGorevId: 0,
    mebiDurum: [],
    mebiKonuDurum: [],
    mebiEnvanter: [],
    mebiOdevMeta: [],
    kazanimTanimlari: GELISTIRME ? seedKazanimlar : [],
    kazanimIslenmeKayitlari: {},
    odevler: GELISTIRME ? seedOdevler : [],
    odevPuanlari: GELISTIRME ? seedOdevPuanlari : [],
    // Eskiden seedKriterler.length (5) idi ama en büyük id 6 — yeni kriter
    // "Dersi bozdu" ile AYNI id'yi alıyordu.
    sonKriterId: Math.max(0, ...VARSAYILAN_KRITERLER.map((k) => k.id)),
    sonOdevId: GELISTIRME ? seedOdevler.length : 0,
    sonEtiketId: GELISTIRME ? seedDavranisEtiketleri.length : 0,
    sonOgrenciEtiketId: 0,
    sonDersId: GELISTIRME ? seedDersProgrami.length : 0,
    sonTutanakId: 0,
    senkronLog: [],
    islemGunlugu: [],
    sonLogId: 0,
    mebiAdEslemeleri: [],
    kitaplar: [],
    kirpmalar: [],
    kitapNotlari: [],
    foyler: [],
    sinavlar: [],
    ayarlar: { kazanimTakibiAktif: true, aktifOgretimYili: varsayilanOgretimYili(), veriYokPerformansPuani: 50, katilimTabanPuani: KATILIM_TABAN_VARSAYILAN },
  };

  if (!DENEME_DERLEMESI) return taban;
  return {
    ...taban,
    ...demoVeriUret(),
    // Demo kayıtları bu id'lere bağlı (gunlukKayitlar.kriterId,
    // ogrenciEtiketleri.etiketId) — boş bırakılırsa isimsiz kalırlar.
    kriterler: seedKriterler,
    donemAgirliklari: seedAgirliklari,
    davranisEtiketleri: seedDavranisEtiketleri,
    sonKriterId: Math.max(0, ...seedKriterler.map((k) => k.id)),
    sonEtiketId: Math.max(0, ...seedDavranisEtiketleri.map((e) => e.id)),
  };
}


export type IslemSeviyesi = "bilgi" | "uyari" | "hata";
export type EslesmeKaynak = "eokul-no" | "mebi-ad";

export interface EslesmeOnerisi {
  ogrenciId: number;
  no: string;
  adSoyad: string;
  sinifAd: string;
  skor: number;
}

export interface EslesmeyenKayit {
  kaynak: EslesmeKaynak;
  okulNo?: string;
  adSoyad: string;
  neden: string;
  oneriler: EslesmeOnerisi[];
}

export interface IslemGunluguKaydi {
  id: number;
  zaman: string;
  kaynak: "eokul" | "mebi" | "sistem" | "yedek";
  seviye: IslemSeviyesi;
  baslik: string;
  mesaj: string;
  eslesmeyen?: EslesmeyenKayit[];
}

export interface SistemSagligi {
  depo: { tur: "SQLite" | "localStorage"; yol: string | null; hata: string | null };
  ozet: VeritabaniOzeti;
  sonSenkron: { eokul: string | null; mebi: string | null };
  sorunlar: Array<{ seviye: IslemSeviyesi; baslik: string; mesaj: string }>;
  eslesmeyenSayisi: number;
  hataSayisi: number;
}

export { DERS_YAPILMADI_NEDENLERI } from "@shared/islemeZarfi";
export interface GelmediKaydi {
  sinifId: number;
  ogrenciId: number;
  tarih: string;
}

/** OA74: öğrenci `tarih` gününden (dahil) itibaren `eskiSinifId`'den `yeniSinifId`'ye geçti.
 *  `tarih`ten ÖNCEKİ günler eski sınıfa aittir. */
export interface SubeTasimaKaydi {
  ogrenciId: number;
  eskiSinifId: number;
  yeniSinifId: number;
  tarih: string; // ISO "2026-10-10" — taşımanın yapıldığı gün
}

export interface DersYapilmadi {
  sinifId: number;
  tarih: string; // ISO "2026-09-28"
  neden: string;
}

interface MebiAdEsleme {
  mebiAdSoyad: string;
  ogrenciId: number;
  sinifId: number;
  ogretimYili: string;
  zaman: string;
}

export interface VeritabaniOzeti {
  sinif: number;
  ogrenci: number;
  hizliIsleme: number;
  devamsizlik: number;
  sinav: number;
  performans: number;
  mebi: number;
  odev: number;
}

interface YedekPaket {
  uygulama: "ogretmen-asistani";
  yedekSurumu: 1;
  olusturmaZamani: string;
  ozet: VeritabaniOzeti;
  veri: Veritabani;
}

/** OA69: sınıfın ilk (ana) dersi — ödev/elle not göçü ve varsayılan ders. Ders yoksa undefined. */
function sinifIlkDersi(siniflar: Sinif[], sinifId: number | undefined): string | undefined {
  const s = sinifId == null ? undefined : siniflar.find((x) => x.id === sinifId);
  return s ? sinifDersleri(s)[0] : undefined;
}

function normalleştir(kayitli: Partial<Veritabani>): Veritabani {
  // Geriye dönük uyum: eski sürümde olmayan alanları varsayılanla doldur.
  const m = {
    ...ilkVeri(),
    ...kayitli,
    senkronLog: kayitli.senkronLog ?? [],
    islemGunlugu: Array.isArray(kayitli.islemGunlugu) ? kayitli.islemGunlugu : [],
    sonLogId: kayitli.sonLogId ?? 0,
    mebiAdEslemeleri: Array.isArray(kayitli.mebiAdEslemeleri) ? kayitli.mebiAdEslemeleri : [],
  };
  // Dizi alanlarını özellikle güvenceye al: bozuk/eksik yedek hızlı işleme geçmişini sıfırlamasın.
  m.ayarlar = {
    kazanimTakibiAktif: kayitli.ayarlar?.kazanimTakibiAktif ?? true,
    aktifOgretimYili: kayitli.ayarlar?.aktifOgretimYili ?? varsayilanOgretimYili(),
    veriYokPerformansPuani: kayitli.ayarlar?.veriYokPerformansPuani ?? 50,
    // Eski kayıtta yok → 50 (eski sabit formülle AYNI sonuç; notlar kendiliğinden değişmez).
    katilimTabanPuani: gecerliTaban(kayitli.ayarlar?.katilimTabanPuani),
    sonYedekZamani: typeof kayitli.ayarlar?.sonYedekZamani === "string" ? kayitli.ayarlar.sonYedekZamani : undefined,
    okulProfili: okulProfiliNormallestir(kayitli.ayarlar?.okulProfili),
    eokulProfil: eokulProfilNormallestir(kayitli.ayarlar?.eokulProfil),
    eokulProfilOnerisi: eokulOneriNormallestir(kayitli.ayarlar?.eokulProfilOnerisi),
    programDegisim: programDegisimNormallestir(kayitli.ayarlar?.programDegisim),
    eklentiEslesme: eklentiEslesmeNormallestir(kayitli.ayarlar?.eklentiEslesme),
    eklentiIslenenPaketler: eklentiPaketKimlikleriNormallestir(kayitli.ayarlar?.eklentiIslenenPaketler),
    dersIci: dersIciNormallestir(kayitli.ayarlar?.dersIci, kayitli.ayarlar?.katilimTabanPuani),
    performansSablonlari: sablonlariNormallestir(kayitli.ayarlar?.performansSablonlari),
    performansDuzenleri: duzenleriNormallestir(kayitli.ayarlar?.performansDuzenleri),
    performansDuzeniOkunamadi: okunamayanDuzenler(kayitli.ayarlar?.performansDuzenleri, kayitli.ayarlar?.performansDuzeniOkunamadi),
    performansDuzenleriDers: dersDuzenleriNormallestir(kayitli.ayarlar?.performansDuzenleriDers),
    // OA69 denetimi: bu iki alan buraya hiç taşınmıyordu → aşağıdaki doğrulama hep boş görüyor,
    // not basamağı (OA59) ve "Ölçeklerim" (OA58) HER AÇILIŞTA ve yedek geri yüklemede kayboluyordu.
    notBasamak: kayitli.ayarlar?.notBasamak,
    rubrikSablonlari: kayitli.ayarlar?.rubrikSablonlari,
    // OA70: aynı tuzak — burada yeniden kurulmayan alan her açılışta ve yedek geri yüklemede düşer.
    zilSaatleri: zilSaatleriNormallestir(kayitli.ayarlar?.zilSaatleri),
    hatirlatma: hatirlatmaNormallestir(kayitli.ayarlar?.hatirlatma),
  };
  m.elleNotlar = elleNotlariNormallestir(m.elleNotlar);
  m.performansIstisnalari = istisnalariNormallestir(m.performansIstisnalari);
  m.olumluEklemeleri = olumluEklemeleriNormallestir(m.olumluEklemeleri);
  // (Günlük kayıtların dönem etiketi onarımı aşağıda, eksik etiketler 1'e tamamlandıktan SONRA — OA74.)
  for (const alan of ["sonSinifId", "sonOgrenciId"] as const) {
    const v = m[alan];
    m[alan] = typeof v === "number" && Number.isInteger(v) && v > 0 ? v : undefined;
  }
  m.gunlukKayitlar = Array.isArray(m.gunlukKayitlar) ? m.gunlukKayitlar : [];
  // OA73: `ders` alanı nesne KORUNARAK taşınır (yeniden kurulmaz); yalnız bozuksa (metin değil,
  // boş, 100 karakterden uzun) alan düşer — gün ORTAK sayılır, iz kaybolmaz.
  m.gunlukIslendi = Array.isArray(m.gunlukIslendi)
    ? m.gunlukIslendi.map((g) => {
      if (!g || g.ders === undefined) return g;
      const d = typeof g.ders === "string" ? g.ders.trim() : "";
      if (d && d.length <= 100) return d === g.ders ? g : { ...g, ders: d };
      const { ders: _bozuk, ...geri } = g;
      void _bozuk;
      return geri;
    })
    : [];
  m.dersYapilmadi = Array.isArray(m.dersYapilmadi) ? m.dersYapilmadi : [];
  m.gelmedi = Array.isArray(m.gelmedi) ? m.gelmedi.filter((g) => g && typeof g.ogrenciId === "number" && typeof g.tarih === "string") : [];
  // OA74: şube taşıma geçmişi — nesneler korunur, bozuk satır düşer (normalleştir'de kurulmayan alan düşerdi).
  m.subeTasimalari = subeTasimalariNormallestir(m.subeTasimalari);
  m.devamsizlik = Array.isArray(m.devamsizlik) ? m.devamsizlik : [];
  m.siniflar = sinifSirala((Array.isArray(m.siniflar) ? m.siniflar : [])).map((s) => {
    const dersler = sinifDersleri(s);
    return { ...s, brans: dersler[0] ?? "—", dersler };
  });
  m.sinavNotlari = Array.isArray(m.sinavNotlari) ? m.sinavNotlari : [];
  m.performansNotlari = Array.isArray(m.performansNotlari) ? m.performansNotlari : [];
  m.tutanaklar = Array.isArray(m.tutanaklar) ? m.tutanaklar : [];
  m.ogrenciEtiketleri = Array.isArray(m.ogrenciEtiketleri) ? m.ogrenciEtiketleri : [];
  m.donemSnapshotlar = Array.isArray(m.donemSnapshotlar) ? m.donemSnapshotlar : [];
  m.yilArsivleri = Array.isArray(m.yilArsivleri) ? m.yilArsivleri : [];
  // Dönem Yaşam Döngüsü göçü: eski kayıtlarda donemDurumu hiç yoktu (basit
  // aktifDonem: number sayacı vardı). Eski değeri koru, tüm dönem-etiketlenebilir
  // kayıtları 1. döneme işaretle ve TEK SEFERLİK bilgi logu düş (bir sonraki
  // yüklemede kayitli.donemDurumu artık dolu olacağından bu blok tekrar çalışmaz).
  if (!kayitli.donemDurumu) {
    const eskiAktifDonem = (kayitli as { aktifDonem?: number }).aktifDonem;
    m.donemDurumu = { aktifDonem: eskiAktifDonem === 2 ? 2 : 1 };
    m.gunlukKayitlar = m.gunlukKayitlar.map((k) => ({ ...k, donem: k.donem ?? 1 }));
    m.sinavNotlari = m.sinavNotlari.map((s) => ({ ...s, donem: s.donem ?? 1, kaynak: s.kaynak ?? "senkron" }));
    m.performansNotlari = m.performansNotlari.map((s) => ({ ...s, donem: s.donem ?? 1, kaynak: s.kaynak ?? "senkron" }));
    m.tutanaklar = m.tutanaklar.map((t) => ({ ...t, donem: t.donem ?? 1 }));
    m.ogrenciEtiketleri = m.ogrenciEtiketleri.map((e) => ({ ...e, donem: e.donem ?? 1 }));
    m.sonLogId = (m.sonLogId ?? 0) + 1;
    m.islemGunlugu = [{
      id: m.sonLogId,
      zaman: simdiYerelISO(),
      kaynak: "sistem",
      seviye: "bilgi",
      baslik: "Dönem etiketleme",
      mesaj: "Mevcut kayıtlar 1. döneme etiketlendi; gerekirse kayıtlar üzerinden düzeltebilirsiniz.",
    }, ...m.islemGunlugu];
  } else {
    // Normal yol: her alan ayrı ayrı eksikse (kısmi/elle düzenlenmiş yedek) 1'e tamamlanır.
    m.gunlukKayitlar = m.gunlukKayitlar.map((k) => ({ ...k, donem: k.donem ?? 1 }));
    m.sinavNotlari = m.sinavNotlari.map((s) => ({ ...s, donem: s.donem ?? 1, kaynak: s.kaynak ?? "senkron" }));
    m.performansNotlari = m.performansNotlari.map((s) => ({ ...s, donem: s.donem ?? 1, kaynak: s.kaynak ?? "senkron" }));
    m.tutanaklar = m.tutanaklar.map((t) => ({ ...t, donem: t.donem ?? 1 }));
    m.ogrenciEtiketleri = m.ogrenciEtiketleri.map((e) => ({ ...e, donem: e.donem ?? 1 }));
  }
  // Denetim (2026-10) + OA74 onarımı: 1. dönem KAPANDIYSA günlük kaydın dönemi TARİHİNDEN gelir,
  // İKİ YÖNDE de: kapanış gününe kadar 1, sonrası 2. (Eskiden yalnız "2 → 1" düzeltiliyordu;
  // telefon zarfı dönemi paketten aldığı için 2. dönem gününe "1" etiketli kayıt kalabiliyor ve
  // sınıfın o günü dizideki sıraya göre bir döneme düşüyordu.) Kapanış yoksa etikete dokunulmaz.
  m.gunlukKayitlar = gunlukDonemleriniTarihtenOnar(m.gunlukKayitlar, m.donemDurumu);
  // Ders boyutu öncesindeki notları sınıfın ilk/varsayılan dersine bağla.
  // Böylece eski veri kaybolmaz; yeni aktarımlar aynı sınıftaki seçmeli dersi
  // ayrı anahtarla saklar.
  const sinifDersi = new Map(m.siniflar.map((s) => [s.id, sinifDersleri(s)[0] ?? s.brans] as const));
  const ogrenciDersi = new Map(m.ogrenciler.map((o) => [o.id, sinifDersi.get(o.sinifId) ?? "Ders"] as const));
  m.sinavNotlari = m.sinavNotlari.map((n) => ({ ...n, ders: n.ders?.trim() || ogrenciDersi.get(n.ogrenciId) || "Ders" }));
  m.performansNotlari = m.performansNotlari.map((n) => ({ ...n, ders: n.ders?.trim() || ogrenciDersi.get(n.ogrenciId) || "Ders" }));
  // OA69: ders boyutu öncesindeki elle notlar öğrencinin sınıfının İLK dersine aittir (o güne dek
  // tek not vardı ve ana derste kullanılıyordu). Dersi olan kayda dokunulmaz → idempotent; ders
  // bulunamazsa (sınıfı silinmiş öğrenci) boş kalır, hesap onu da eskisi gibi sayar.
  {
    const ogrenciSinifi = new Map(m.ogrenciler.map((o) => [o.id, o.sinifId] as const));
    m.elleNotlar = (m.elleNotlar ?? []).map((n) => {
      if (typeof n.ders === "string" && n.ders.trim()) return n.ders === n.ders.trim() ? n : { ...n, ders: n.ders.trim() };
      const d = sinifIlkDersi(m.siniflar, ogrenciSinifi.get(n.ogrenciId));
      return d ? { ...n, ders: d } : n;
    });
  }
  // Göç: "Ödev yaptı" durum kriteri Hızlı İşleme'den kaldırıldı (ödev artık kendi modülünde).
  // Yalnız varsayılan seed kriterini hedefler; öğretmenin özel eklediği kriterlere dokunmaz.
  m.kriterler = m.kriterler.filter((k) => !(k.id === 2 && k.tip === "durum" && k.ad === "Ödev yaptı"));
  // Göç (2026-09): eski telefon sürümü durum kriterinde (kitap/defter) "+ getirdi"
  // diye deger>0 kayıt yazıyordu. Masaüstü bu kriterde HER kaydı "getirmedi"
  // saydığı için öğrencinin kitap puanı haksız yere düşüyordu. "Getirdi" kural 1'de
  // kayıt DEĞİLDİR (istisna yok = getirdi); bu kayıtlar silinir. Masaüstü durum
  // kaydını her zaman deger 0 yazar, dolayısıyla deger>0 durum kaydı yalnız o
  // hatadan gelir. İdempotent.
  {
    // Yalnız YÜKLENEN veride tanımlı kriterlere bakılır: kriter listesi olmayan eski/elle
    // düzenlenmiş bir yedekte varsayılan kriterler devreye girer ve id'leri tesadüfen
    // eşleşebilir — o durumda kayıt silinmemeli.
    const kayitliKriterler = Array.isArray((kayitli as { kriterler?: unknown }).kriterler) ? m.kriterler : [];
    const durumIdleri = new Set(kayitliKriterler.filter((k) => k.tip === "durum").map((k) => k.id));
    const once = m.gunlukKayitlar.length;
    m.gunlukKayitlar = m.gunlukKayitlar.filter((k) => !(durumIdleri.has(k.kriterId) && k.deger > 0));
    const silinen = once - m.gunlukKayitlar.length;
    if (silinen > 0) m.sonLogId = (m.sonLogId ?? 0) + 1;
    if (silinen > 0) m.islemGunlugu = [{
      id: m.sonLogId,
      zaman: simdiYerelISO(),
      kaynak: "sistem",
      seviye: "bilgi",
      baslik: "Telefon kayıtları düzeltildi",
      mesaj: `Telefondan gelen ${silinen} “kitap/defter getirdi” işareti yanlışlıkla “getirmedi” sayılıyordu; kaldırıldı, puanlar düzeldi.`,
    }, ...m.islemGunlugu];
  }
  // Göç: kazanım kimliği artık e-Okul'un ham DOM id'sinden BAĞIMSIZ bileşik bir
  // anahtar (öğretim yılı+kademe+ders+kod/metin) — eski id sayfa başına
  // sıfırlandığından kademe/derse göre benzersiz değildi, farklı kademeler
  // birbirinin üzerine yazılıyordu (2026-08 sağlamlaştırma turunda bulunan
  // gerçek veri bozulması hatası). Varlık kontrolü `kayitli.kazanimTanimlari`
  // üzerinden: bir kez göçtükten sonra bu blok bir daha çalışmaz (idempotent —
  // normalleştir() HER açılışta çalışıyor, dönem göçüyle AYNI desen).
  if (!Array.isArray(kayitli.kazanimTanimlari)) {
    const eskiKazanim = kayitli as unknown as {
      kazanimlar?: Array<{ id: string; konu: string; metin: string; ders: string; kademe?: string; sinifAd?: string }>;
      kazanimIsleme?: Record<number, string[]>;
    };
    const ogretimYili = m.ayarlar.aktifOgretimYili;
    const eskiTanimlar = (eskiKazanim.kazanimlar ?? []).filter((k) => !/^k\d+$/.test(k.id)); // demo seed (k1..k6) at
    const idHaritasi = new Map<string, string>(); // eski ham id -> yeni bileşik id
    m.kazanimTanimlari = eskiTanimlar.map((k) => {
      const kademe = k.kademe ?? (k.sinifAd?.match(/\d+/)?.[0] ?? "");
      const kod = kazanimKoduTespitEt(k.metin);
      const id = kazanimKimlikUret({ ogretimYili, kademe, ders: k.ders, kod, metin: k.metin });
      idHaritasi.set(k.id, id);
      return { id, ogretimYili, kademe, ders: k.ders, kod, konu: k.konu, metin: k.metin, kaynak: "eokul" as const };
    });

    let eslesmeyen = 0;
    const yeniIslenme: Record<number, Record<string, KazanimIslenmeKaydi>> = {};
    for (const [sinifIdStr, kazanimIdler] of Object.entries(eskiKazanim.kazanimIsleme ?? {})) {
      const sinifId = Number(sinifIdStr);
      for (const eskiId of kazanimIdler) {
        const yeniId = idHaritasi.get(eskiId);
        if (!yeniId) { eslesmeyen++; continue; }
        (yeniIslenme[sinifId] ??= {})[yeniId] = {
          kazanimId: yeniId, sinifId, islendi: true,
          tarih: bugunYerelISO(), donem: m.donemDurumu.aktifDonem ?? 1,
          kaynak: "elle", guncelleme: simdiYerelISO(),
        };
      }
    }
    m.kazanimIslenmeKayitlari = yeniIslenme;

    // logEkle() DEĞİL: bu fonksiyon `db` henüz atanmadan ham kayıttan `m`yi
    // inşa ediyor — dönem göçüyle (yukarıda) AYNI sebeple elle işleniyor.
    m.sonLogId = (m.sonLogId ?? 0) + 1;
    m.islemGunlugu = [{
      id: m.sonLogId,
      zaman: simdiYerelISO(),
      kaynak: "sistem",
      seviye: eslesmeyen > 0 ? "uyari" : "bilgi",
      baslik: "Kazanım verisi göçürüldü",
      mesaj: eslesmeyen > 0
        ? `Kazanım kimlikleri güvenli bir yapıya taşındı. ${eslesmeyen} işlenme kaydı eski sürümdeki bir hata yüzünden eşleştirilemedi — Kazanım Takibi ekranından gözden geçirin.`
        : "Kazanım kimlikleri güvenli bir yapıya taşındı.",
    }, ...m.islemGunlugu];
  } else {
    m.kazanimTanimlari = m.kazanimTanimlari ?? [];
    m.kazanimIslenmeKayitlari = m.kazanimIslenmeKayitlari ?? {};
  }
  m.performansNotlari = m.performansNotlari ?? [];
  m.sonGunlukId = Math.max(m.sonGunlukId ?? 0, ...m.gunlukKayitlar.map((g) => g.id ?? 0));
  m.sonOdevId = Math.max(m.sonOdevId ?? 0, ...m.odevler.map((o) => o.id ?? 0));
  m.sonEtiketId = Math.max(m.sonEtiketId ?? 0, ...m.davranisEtiketleri.map((e) => e.id ?? 0));
  m.sonOgrenciEtiketId = Math.max(m.sonOgrenciEtiketId ?? 0, ...m.ogrenciEtiketleri.map((e) => e.id ?? 0));
  m.sonDersId = Math.max(m.sonDersId ?? 0, ...m.dersProgrami.map((d) => d.id ?? 0));
  m.sonTutanakId = Math.max(m.sonTutanakId ?? 0, ...m.tutanaklar.map((t) => t.id ?? 0));
  m.gorevler = Array.isArray(m.gorevler) ? m.gorevler : [];
  m.sonGorevId = Math.max(m.sonGorevId ?? 0, ...m.gorevler.map((g) => g.id ?? 0));
  m.sonLogId = Math.max(m.sonLogId ?? 0, ...m.islemGunlugu.map((l) => l.id ?? 0));
  // Ders Kitabı: eski yedeklerde bu alanlar hiç yoktu; dizi güvencesine al.
  m.kitaplar = Array.isArray(m.kitaplar) ? m.kitaplar : [];
  m.kirpmalar = Array.isArray(m.kirpmalar) ? m.kirpmalar : [];
  m.kitapNotlari = Array.isArray(m.kitapNotlari) ? m.kitapNotlari : [];
  m.foyler = Array.isArray(m.foyler) ? m.foyler : [];
  m.foyler = m.foyler.map((foy) => foySiniflariniNormalle(foy as Parameters<typeof foySiniflariniNormalle>[0]));
  // Sınav kütüphanesi öncesi kayıtlarda bu alan yok.
  m.sinavlar = Array.isArray(m.sinavlar) ? m.sinavlar : [];
  // Eski kayıtlarda foyId hiç yoktu (undefined kalması doğru davranış); elle
  // düzenlenmiş/bozuk bir yedekte string olmayan bir değer sızmasın diye tip
  // güvencesi burada alınır (mod alanındaki normalize kalıbının aynısı).
  m.odevler = m.odevler.map((o) => ({
    ...(typeof o.foyId === "string" ? o : { ...o, foyId: undefined }),
    donem: o.donem ?? 1,
    kaynak: o.kaynak ?? "elle",
    // OA58: bozuk dereceli puanlama ölçeği ödevi bozmasın — okunamazsa düz puanlı ödev olarak kalır.
    rubrik: rubrikNormallestir((o as { rubrik?: unknown }).rubrik),
    // OA59: bozuk ayar ödevi bozmasın — geçersizse varsayılana (undefined) döner.
    agirlik: odevAgirligiGecerli((o as { agirlik?: unknown }).agirlik),
    eksiPuan: odevEksiPuaniGecerli((o as { eksiPuan?: unknown }).eksiPuan),
    notNo: odevNotNoGecerli((o as { notNo?: unknown }).notNo),
    // OA69: dersi olmayan (eski) ödev sınıfın İLK dersine yazılır — o güne dek ödev tek derse
    // sayılıyordu; yeni bir ikinci ders eklenince eski ödevler ona sızmasın. Dersi olana dokunulmaz.
    ders: typeof o.ders === "string" && o.ders.trim() ? o.ders.trim() : (sinifIlkDersi(m.siniflar, o.sinifId)),
  }));
  m.ayarlar.notBasamak = m.ayarlar.notBasamak === 1 || m.ayarlar.notBasamak === 2 ? m.ayarlar.notBasamak : undefined;
  m.odevPuanlari = (Array.isArray(m.odevPuanlari) ? m.odevPuanlari : []).map((p) => {
    if (p.rubrikSecim === undefined && p.geriBildirim === undefined) return p;
    const ol = m.odevler.find((o) => o.id === p.odevId)?.rubrik;
    return { ...p, rubrikSecim: ol ? rubrikSecimiNormallestir(ol, p.rubrikSecim) : undefined, geriBildirim: typeof p.geriBildirim === "string" ? p.geriBildirim : undefined };
  });
  m.ayarlar.rubrikSablonlari = (Array.isArray(m.ayarlar.rubrikSablonlari) ? m.ayarlar.rubrikSablonlari : []).flatMap((x) => {
    const o = rubrikNormallestir(x);
    return o && typeof (x as { id?: unknown }).id === "string" ? [{ ...o, id: (x as RubrikSablonu).id }] : [];
  });
  m.mebiOdevMeta = Array.isArray(m.mebiOdevMeta) ? m.mebiOdevMeta : [];
  return m;
}

function yedekVerisiniAyikla(parsed: unknown): Partial<Veritabani> | null {
  if (!parsed || typeof parsed !== "object") return null;
  const aday = parsed as Partial<YedekPaket> & Partial<Veritabani>;
  // Yeni yedek formatı: metadata + veri. Eski yedek formatı: doğrudan Veritabani JSON'u.
  if (aday.uygulama === "ogretmen-asistani" && aday.veri) return aday.veri as Partial<Veritabani>;
  return aday as Partial<Veritabani>;
}

function parseVeri(ham: string | null): Veritabani | null {
  if (!ham) return null;
  try {
    const ayiklanmis = yedekVerisiniAyikla(JSON.parse(ham));
    return ayiklanmis ? normalleştir(ayiklanmis) : null;
  } catch {
    return null;
  }
}

function ozet(v: Veritabani): VeritabaniOzeti {
  return {
    sinif: v.siniflar.length,
    ogrenci: v.ogrenciler.length,
    hizliIsleme: v.gunlukKayitlar.length,
    devamsizlik: v.devamsizlik.length,
    sinav: v.sinavNotlari.length,
    performans: v.performansNotlari.length,
    mebi: v.mebiDurum.length + v.mebiKonuDurum.length + v.mebiEnvanter.length,
    odev: v.odevler.length + v.odevPuanlari.length,
  };
}

function seri(v: Veritabani): string {
  return JSON.stringify(v);
}

function yedekSeri(v: Veritabani): string {
  const paket: YedekPaket = {
    uygulama: "ogretmen-asistani",
    yedekSurumu: 1,
    olusturmaZamani: simdiYerelISO(),
    ozet: ozet(v),
    veri: v,
  };
  return JSON.stringify(paket, null, 2);
}


const NORM_METIN_ONBELLEK = new Map<string, string>();

function normMetin(a: string): string {
  // OA74 hız: saf, sınırlı önbellek (MEBİ eşleştirme/öneri her öğrenci adını tekrar normalleştiriyordu).
  const onbellekte = NORM_METIN_ONBELLEK.get(a);
  if (onbellekte !== undefined) return onbellekte;
  const sonuc = normMetinHesapla(a);
  if (NORM_METIN_ONBELLEK.size >= 20000) NORM_METIN_ONBELLEK.clear();
  NORM_METIN_ONBELLEK.set(a, sonuc);
  return sonuc;
}

/** OA82: sınıf adı eşleştirme anahtarı — büyük/küçük, tire/eğik çizgi/boşluk ve "Sınıfı/Şubesi" farkı yok. */
function sinifAdAnahtari(ad: string): string {
  return normMetin(ad).replace(/\b(SINIFI?|SUBESI?)\b/g, " ").replace(/\s+/g, "");
}

function normMetinHesapla(a: string): string {
  return a
    .toLocaleUpperCase("tr")
    .replace(/[İI]/g, (m) => (m === "İ" ? "I" : "I"))
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function adSkoru(kaynakAd: string, hedefAd: string): number {
  const a = normMetin(kaynakAd);
  const b = normMetin(hedefAd);
  if (!a || !b) return 0;
  if (a === b) return 100;
  const at = new Set(a.split(" ").filter(Boolean));
  const bt = new Set(b.split(" ").filter(Boolean));
  const ortak = [...at].filter((x) => bt.has(x)).length;
  const tokenSkor = Math.round((ortak / Math.max(at.size, bt.size, 1)) * 80);
  const parcaSkor = a.includes(b) || b.includes(a) ? 15 : 0;
  return Math.min(99, tokenSkor + parcaSkor);
}

function ogrenciOnerileri(adSoyad: string, okulNo?: string): EslesmeOnerisi[] {
  const no = String(okulNo ?? "").trim();
  return db.ogrenciler
    .map((o) => {
      const sinifAd = db.siniflar.find((s) => s.id === o.sinifId)?.ad ?? "?";
      const noBonus = no && String(o.no) === no ? 100 : 0;
      const skor = Math.max(noBonus, adSkoru(adSoyad, o.adSoyad));
      return { ogrenciId: o.id, no: String(o.no), adSoyad: o.adSoyad, sinifAd, skor };
    })
    .filter((o) => o.skor >= 35)
    .sort((a, b) => b.skor - a.skor || a.adSoyad.localeCompare(b.adSoyad, "tr"))
    .slice(0, 5);
}

function mebiSinifBaglamiUyuyor(sinifAd: string, baglam?: string): boolean {
  if (!baglam) return true;
  const sinif = normMetin(sinifAd);
  const hedef = normMetin(baglam);
  const parcalar = sinif.match(/(\d{1,2})\s*([A-Z])$/);
  if (parcalar) return new RegExp(`(^|\\s)${parcalar[1]}(\\s|$)`).test(hedef) && new RegExp(`(^|\\s)${parcalar[2]}(\\s|$)`).test(hedef);
  // OA74: Hazırlık şubesi. Uygulamadaki ad "Hazırlık-A" (eklenti `sinifAdiCozumle`), MEBİ bağlamı
  // "AL - Hazırlık Sınıfı / A Şubesi (-)" → normMetin "AL HAZIRLIK SINIFI A SUBESI". Eskiden
  // `hedef.includes("HAZIRLIK A")` hiç tutmuyordu → Hazırlık'ta MEBİ ödevi 0 öğrenci eşleşiyordu.
  // Bağlamda "HAZIRLIK" kelimesi + şube harfi aranır; "X ŞUBESİ" varsa harf ONDAN alınır
  // (Hazırlık-B, "A Şubesi"ne eşleşmesin), yoksa tek başına duran harf. Rakamlı sınıflar yukarıda
  // değişmeden kalır (9-A, Hazırlık bağlamına zaten eşleşmez: "9" kelimesi yok).
  const haz = sinif.match(/^(?:HAZIRLIK|HAZ|HZ)(?:\s+SINIFI?)?\s*([A-Z])$/);
  if (haz) {
    if (!/(^|\s)(HAZIRLIK|HAZ)(\s|$)/.test(hedef)) return false;
    const sube = hedef.match(/(?:^|\s)([A-Z])\s+SUBES?I?(?:\s|$)/);
    return sube ? sube[1] === haz[1] : new RegExp(`(^|\\s)${haz[1]}(\\s|$)`).test(hedef);
  }
  return hedef.includes(sinif);
}

function mebiEslesmisOgrenciId(adSoyad: string, sinifBaglami?: string): number | null {
  // OA74 hız: ad normalleştirmesi tüm öğrenciler için her tamamlayanda yeniden yapılıyordu (MEBİ
  // ödev detayı 40 tamamlayan × 600 öğrenci). Ad → öğrenciler indeksi veri sürümüne bağlı, kural aynı.
  const t = T();
  const n = normMetin(adSoyad);
  const aktifYil = db.ayarlar.aktifOgretimYili;
  t.mebiAliasIndeksi ??= grupla(db.mebiAdEslemeleri, (x) => normMetin(x.mebiAdSoyad));
  const alias = t.mebiAliasIndeksi.get(n)?.find((x) => x.ogretimYili === aktifYil);
  if (alias) {
    const aday = ogrenciGetir(alias.ogrenciId);
    const ogrenci = aday && aday.sinifId === alias.sinifId
      ? aday
      : db.ogrenciler.find((o) => o.id === alias.ogrenciId && o.sinifId === alias.sinifId);
    const sinif = ogrenci && sinifIndeksi().get(ogrenci.sinifId);
    if (ogrenci && sinif && mebiBaglamUyuyorOnbellekli(sinif.ad, sinifBaglami)) return ogrenci.id;
  }
  t.mebiAdIndeksi ??= grupla(db.ogrenciler, (o) => normMetin(o.adSoyad));
  const adaylar = (t.mebiAdIndeksi.get(n) ?? []).filter((o) => {
    const sinif = sinifIndeksi().get(o.sinifId);
    return !!sinif && mebiBaglamUyuyorOnbellekli(sinif.ad, sinifBaglami);
  });
  return adaylar.length === 1 ? adaylar[0].id : null;
}

function mebiBaglamUyuyorOnbellekli(sinifAd: string, baglam?: string): boolean {
  const t = T();
  const anahtar = `${sinifAd}\u0000${baglam ?? "\u0001"}`;
  let v = t.mebiBaglam.get(anahtar);
  if (v === undefined) { v = mebiSinifBaglamiUyuyor(sinifAd, baglam); t.mebiBaglam.set(anahtar, v); }
  return v;
}

function logEkle(kayit: Omit<IslemGunluguKaydi, "id" | "zaman">): IslemGunluguKaydi {
  // Bu yardımcı ONLARCA yazma fonksiyonundan çağrılıyor; kendi kaydet()'i
  // başarısız olursa (kotanın dolması gibi) kendi durumunu (sonLogId,
  // islemGunlugu) kendi içinde geri almalı — aksi halde çağıran taraf logEkle
  // İÇİNDE neyin değiştiğini bilemeyip yalnızca KENDİ alanlarını geri alırdı.
  const oncekiLog = db.islemGunlugu;
  const oncekiLogId = db.sonLogId;
  try {
    const yeni = logEkleBellekte(kayit);
    kaydet(db);
    return yeni;
  } catch (err) {
    db.islemGunlugu = oncekiLog;
    db.sonLogId = oncekiLogId;
    throw err;
  }
}

/** OA74 hız: `logEkle`in KAYDETMEYEN hâli — yalnız tek kaydet()'le biten toplu yazmalar (MEBİ
 *  senkronu) kullanır; çağıran catch'inde `yanYazimGeriAl` ile islemGunlugu/sonLogId'yi geri alır. */
function logEkleBellekte(kayit: Omit<IslemGunluguKaydi, "id" | "zaman">): IslemGunluguKaydi {
  const yeni: IslemGunluguKaydi = { id: ++db.sonLogId, zaman: simdiYerelISO(), ...kayit };
  db.islemGunlugu = [yeni, ...db.islemGunlugu].slice(0, 200);
  return yeni;
}

function eslesmeLogu(
  kaynak: "eokul" | "mebi",
  baslik: string,
  mesaj: string,
  eslesmeyen: EslesmeyenKayit[],
  bellekte = false,
): void {
  if (eslesmeyen.length === 0) return;
  if (bellekte) logEkleBellekte({ kaynak, seviye: "uyari", baslik, mesaj, eslesmeyen });
  else logEkle({ kaynak, seviye: "uyari", baslik, mesaj, eslesmeyen });
}

/** OA74 hız: MEBİ senkronu eskiden bir çağrıda 3–4 kez kaydet() yapıyordu (senkron izi, iki günlük
 *  satırı, asıl veri) — her biri bütün veritabanını yazıyor (14 sınıfta ~20 ms × 4). Artık yan
 *  yazımlar bellekte yapılır, TEK kaydet() çağıranda; başarısızsa bu üç alan da geri alınır. */
interface YanYazimOnceki { islemGunlugu: IslemGunluguKaydi[]; sonLogId: number; senkronLog: Veritabani["senkronLog"] }
function yanYazimOnceki(): YanYazimOnceki {
  return { islemGunlugu: db.islemGunlugu, sonLogId: db.sonLogId, senkronLog: db.senkronLog };
}
function yanYazimGeriAl(o: YanYazimOnceki): void {
  db.islemGunlugu = o.islemGunlugu;
  db.sonLogId = o.sonLogId;
  db.senkronLog = o.senkronLog;
}

function localYukle(): Veritabani {
  const kayitli = parseVeri(localStorage.getItem(ANAHTAR));
  if (kayitli) return kayitli;
  const v = ilkVeri();
  localStorage.setItem(ANAHTAR, seri(v));
  return v;
}

function localKaydet(v: Veritabani): void {
  if (!kaliciDepoVarMi()) localStorage.setItem(ANAHTAR, seri(v));
}

/** Kalıcı depoya YAZILAMADIĞINI çağırana bildiren hata.
 *  Kota hatasını yutmak, bellekteki db'yi diskten sessizce ayırıyordu: kayıt
 *  ekranda görünmezken bellekte duruyor, bir sonraki başarılı kaydet onu
 *  (ara adımları hiç çalışmadığı için eksik hâlde) diske yazıyordu. */
export class DepoDoluHatasi extends Error {
  constructor(readonly sebep: unknown) {
    super(
      "Kayıt alanı doldu; bu işlem kaydedilemedi. Ayarlar'dan tam yedek alıp " +
      "kullanmadığınız kitap/kırpmaları silin, sonra tekrar deneyin.",
    );
    this.name = "DepoDoluHatasi";
  }
}

let telefonYazimiSuruyor = false;
const GERI_YUKLEME_ONCESI_ANAHTARI = "ogretmen-asistani.db.v6.geri-yukleme-oncesi";

function kaydet(v: Veritabani): void {
  // OA74 hız: her yazma türetilmiş önbelleği düşürür — başta (yerinde değişen alanlar) ve sonda
  // (başarısız kaydet'in ardından catch'te yapılan geri alma da eski önbelleği görmesin).
  veriDegisti();
  try {
    kaydetIc(v);
  } finally {
    veriDegisti();
  }
}

function kaydetIc(v: Veritabani): void {
  if (telefonYazimiSuruyor) throw new Error("Telefon aktarımı kaydediliyor; lütfen birkaç saniye sonra tekrar deneyin.");
  const json = seri(v);
  // SIRA ÖNEMLİ: SQLite masaüstünde ASIL depo, localStorage yalnız hızlı
  // önbellek/tarayıcı fallback'i. Önce localStorage yazılırken kota dolduğunda
  // setItem fırlatıp asıl kalıcı yazımı da engelliyordu — yani tarayıcı
  // önbelleğinin dolması masaüstünde gerçek veri kaybına yol açıyordu.
  sqliteJsonKaydet(json);
  if (typeof window !== "undefined") queueMicrotask(() => window.dispatchEvent(new Event("oa-veri-degisti")));
  if (kaliciDepoVarMi()) {
    // Masaüstünde (ve Android tam uygulamada) düz öğrenci JSON'unun WebView localStorage'ında ikinci bir
    // kopyasını bırakma. SQLite artık işletim sistemi kasasındaki anahtarla şifreli.
    localStorage.removeItem(ANAHTAR);
    localStorage.removeItem(GERI_YUKLEME_ONCESI_ANAHTARI); // OA93: eski sürümlerden kalmış şifresiz iz
    return;
  }
  try {
    localStorage.setItem(ANAHTAR, json);
  } catch (err) {
    // Tauri varsa veri SQLite'a gitti; localStorage'ın dolması yalnızca
    // önbelleği etkiler, işlemi başarısız saymak yanlış olur. Tarayıcıda ise
    // localStorage TEK depodur → çağıran mutlaka haberdar edilmeli.
    if (kaliciDepoVarMi()) {
      console.warn("localStorage önbelleği yazılamadı (SQLite yazıldı)", err);
      return;
    }
    throw new DepoDoluHatasi(err);
  }
}

let db = localYukle();
notBasamakKaynagiBagla(() => db.ayarlar.notBasamak ?? 0);
let kaliciHazir = false;

/** Uygulama açılışında SQLite'ı yükle. İlk çalıştırmada mevcut localStorage verisini SQLite'a göç eder. */
export async function veritabaniHazirla(): Promise<void> {
  if (kaliciHazir) return;
  const sqliteJson = await sqliteJsonYukle();
  const sqliteVeri = parseVeri(sqliteJson);
  if (sqliteVeri) {
    db = sqliteVeri;
    veriDegisti();
    localKaydet(db);
    localStorage.removeItem(ANAHTAR);
  } else {
    // İlk masaüstü çalıştırma: eski localStorage verisi varsa SQLite'a taşınır.
    try {
      await sqliteJsonHemenKaydet(seri(db));
      // OA74: tarayıcı önizlemesinde (kalıcı depo yok) göç YAPILMADI — localStorage tek depodur,
      // silinirse ikinci yenilemede bütün veri kaybolurdu (persistence.ts'teki koruma yedek kalır).
      if (kaliciDepoVarMi()) localStorage.removeItem(ANAHTAR);
    } catch {
      // Göç başarısızsa tek mevcut kopyayı silme; kalıcı depo uyarısı zaten görünür.
    }
  }
  kaliciHazir = true;
}

export function veritabaniOzeti(): VeritabaniOzeti {
  return ozet(db);
}

export function yedekDosyasiOzeti(ham: string): VeritabaniOzeti | null {
  const yeni = parseVeri(ham);
  return yeni ? ozet(yeni) : null;
}

export function veritabaniDisariAktar(): string {
  return yedekSeri(db);
}


interface GeriYuklemeOncesiKaydi {
  zaman: string;
  veri: Veritabani;
}

/** "Yedekten geri yükle" tek seviyeli geri alma izi: geri yüklemeden HEMEN
 *  önceki tam durumu ayrı bir localStorage anahtarında saklar. Sayfa geri
 *  yükleme sonrası yeniden yüklendiği için in-memory değil, kalıcı olmalı.
 *  Yeni bir geri yükleme eskisinin izini siler (tek seviye yeterli). */
function geriYuklemeOncesiSakla(v: Veritabani): void {
  // OA93: masaüstü/telefonda (kalıcı şifreli depo) WebView localStorage'ına
  // ŞİFRESİZ tam öğrenci kopyası bırakılmaz; orada geri dönüş için şifreli
  // otomatik yedekler (Ayarlar › Otomatik yedekler) var. Ayrıca bu ikinci kopya
  // büyük veride kotayı doldurup geri yüklemeyi düşürüyordu.
  if (kaliciDepoVarMi()) {
    try { localStorage.removeItem(GERI_YUKLEME_ONCESI_ANAHTARI); } catch { /* yok say */ }
    return;
  }
  try {
    const kayit: GeriYuklemeOncesiKaydi = { zaman: simdiYerelISO(), veri: v };
    localStorage.setItem(GERI_YUKLEME_ONCESI_ANAHTARI, JSON.stringify(kayit));
  } catch {
    // localStorage doluysa geri alma izi sessizce kaybolur — geri yükleme yine de devam eder.
  }
}

/** "Son geri yüklemeyi geri al" butonunun görünüp görünmeyeceğini ve
 *  üstündeki zaman etiketini belirler. */
export function geriYuklemeOncesiBilgisi(): { zaman: string } | null {
  try {
    const ham = localStorage.getItem(GERI_YUKLEME_ONCESI_ANAHTARI);
    if (!ham) return null;
    const kayit = JSON.parse(ham) as GeriYuklemeOncesiKaydi;
    return { zaman: kayit.zaman };
  } catch {
    return null;
  }
}

/** OA93: içe aktarılan/geri alınan veritabanını kalıcı depoya yazar. Masaüstü ve
 *  telefonda asıl depo SQLite/dosyadır, düz JSON WebView localStorage'ına YAZILMAZ
 *  (kaydet() ile aynı kural). Yazım başarısızsa bellekteki db önceki hâline döner
 *  — ekranda görünen ile diskte duran ayrışmasın (repo onceki/geri al kuralı). */
async function iceAktarilaniKalicilastir(onceki: Veritabani): Promise<void> {
  const json = seri(db);
  try {
    if (kaliciDepoVarMi()) {
      try { localStorage.removeItem(ANAHTAR); } catch { /* yok say */ }
    } else {
      localStorage.setItem(ANAHTAR, json);
    }
    await sqliteJsonHemenKaydet(json);
  } catch (err) {
    db = onceki;
    veriDegisti();
    const kota = err instanceof DOMException && (err.name === "QuotaExceededError" || err.code === 22);
    if (kota) throw new Error("Tarayıcı deposunda yer kalmadı; yedek geri yüklenemedi. Mevcut verileriniz olduğu gibi duruyor.");
    throw err;
  }
}

/** Az önceki "Yedekten geri yükle" işlemini geri alır: geri yüklemeden HEMEN
 *  önceki duruma döner (bu durumdaki İçerik Hazırlama dahil her şey aynen
 *  geri gelir — geri yükleme sırasında zaten dokunulmamıştı). Tek seviye;
 *  onay popup'ı çağıran taraftadır (AyarlarScreen). */
export async function geriYuklemeyiGeriAl(): Promise<VeritabaniOzeti> {
  const ham = localStorage.getItem(GERI_YUKLEME_ONCESI_ANAHTARI);
  if (!ham) throw new Error("Geri alınacak bir yedekten-geri-yükleme bulunamadı.");
  const kayit = JSON.parse(ham) as GeriYuklemeOncesiKaydi;
  const onceki = db;
  db = kayit.veri;
  veriDegisti();
  await iceAktarilaniKalicilastir(onceki);
  localStorage.removeItem(GERI_YUKLEME_ONCESI_ANAHTARI);
  const sonuc = ozet(db);
  if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent("oa-senkron", { detail: "Yedekten geri yükleme geri alındı" }));
  return sonuc;
}

/** Kimliğe göre birleştirir: YERELDE olan korunur, yedekte olup yerelde
 *  olmayan eklenir. Hiçbir yerel kayıt geriye sarılmaz. */
function kimlikleBirlestir<T extends { id: string }>(mevcut: T[], yedek: T[]): T[] {
  const varOlan = new Set(mevcut.map((kayit) => kayit.id));
  return [...mevcut, ...yedek.filter((kayit) => !varOlan.has(kayit.id))];
}

export interface IcerikHazirlamaBirlestirmeOzeti {
  kitap: number;
  kirpma: number;
  kitapNotu: number;
  foy: number;
  sinav: number;
  /** kitapId'si hiçbir kitaba çözülemediği için düşürülen kırpma/not sayısı. */
  dusurulen: number;
}

export async function veritabaniIceAktar(
  ham: string,
  secenekler?: { icerikHazirlamayiBirlestir?: boolean },
): Promise<VeritabaniOzeti & { birlestirme?: IcerikHazirlamaBirlestirmeOzeti }> {
  const yeni = parseVeri(ham);
  if (!yeni) throw new Error("Seçilen dosya Öğretmen Asistanı verisi gibi görünmüyor.");
  const onceki = db;
  geriYuklemeOncesiSakla(db);

  // İçerik Hazırlama (kitaplar/kırpmalar/kitap notları/föyler) VARSAYILAN olarak
  // yedekten geri yüklenmez: "Yedekten geri yükle" sınıf/öğrenci/dönem verisini
  // kurtarmak içindir — eski bir yedeği geri yüklemek, o yedekten SONRA kitaplığa
  // eklenmiş kitapları/soruları/föyleri geriye sarıp kaybettirmemeli.
  //
  // Ama bu kural tek yönlü kaldığı sürece FELAKET KURTARMA imkânsızdı: yeni bir
  // bilgisayarda ya da disk kaybından sonra kitaplık, kırpmalar, notlar ve föyler
  // yedek dosyası bunları İÇERDİĞİ HÂLDE geri gelmiyordu. Birleştirme seçeneği
  // iki kaygıyı da karşılar: yerelde olan korunur, eksik olan eklenir.
  let birlestirme: IcerikHazirlamaBirlestirmeOzeti | undefined;
  if (secenekler?.icerikHazirlamayiBirlestir) {
    // Aynı PDF farklı id ile kayıtlıysa ikinci kez eklenmez (kitapDosyasi.ts
    // içe aktarımda aynı hash kontrolünü yapıyor; burada da aynı kural geçerli).
    const mevcutHashler = new Set(db.kitaplar.map((kitap) => kitap.dosyaHash).filter(Boolean));
    const gelenKitaplar = yeni.kitaplar.filter((kitap) => !mevcutHashler.has(kitap.dosyaHash));
    const kitaplar = kimlikleBirlestir(db.kitaplar, gelenKitaplar);

    // kitapId'si çözülemeyen kırpma/not düşürülür — föy içe aktarımındaki kalıp:
    // kopuk referans sessizce bırakılmaz, sayısı kullanıcıya bildirilir.
    const kitapIdleri = new Set(kitaplar.map((kitap) => kitap.id));
    const gelenKirpmalar = yeni.kirpmalar.filter((k) => kitapIdleri.has(k.kitapId));
    const gelenNotlar = yeni.kitapNotlari.filter((n) => kitapIdleri.has(n.kitapId));
    const dusurulen =
      (yeni.kirpmalar.length - gelenKirpmalar.length) +
      (yeni.kitapNotlari.length - gelenNotlar.length);

    const kirpmalar = kimlikleBirlestir(db.kirpmalar, gelenKirpmalar);
    const kitapNotlari = kimlikleBirlestir(db.kitapNotlari, gelenNotlar);
    const foyler = kimlikleBirlestir(db.foyler, yeni.foyler);
    const sinavlar = kimlikleBirlestir(db.sinavlar, yeni.sinavlar);

    birlestirme = {
      kitap: kitaplar.length - db.kitaplar.length,
      kirpma: kirpmalar.length - db.kirpmalar.length,
      kitapNotu: kitapNotlari.length - db.kitapNotlari.length,
      foy: foyler.length - db.foyler.length,
      sinav: sinavlar.length - db.sinavlar.length,
      dusurulen,
    };
    db = { ...yeni, kitaplar, kirpmalar, kitapNotlari, foyler, sinavlar };
    veriDegisti();
  } else {
    db = {
      ...yeni,
      kitaplar: db.kitaplar,
      kirpmalar: db.kirpmalar,
      kitapNotlari: db.kitapNotlari,
      foyler: db.foyler,
      sinavlar: db.sinavlar,
    };
    veriDegisti();
  }
  // SQLite kaydı başarısız olursa başarı mesajı vermeyelim; yoksa uygulama yeniden açılınca eski SQLite geri basar.
  await iceAktarilaniKalicilastir(onceki);
  const sonuc = ozet(db);
  if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent("oa-senkron", { detail: "Yedekten veri içe aktarıldı" }));
  return birlestirme ? { ...sonuc, birlestirme } : sonuc;
}

export async function kaliciDepoBilgisi(): Promise<{ tur: "SQLite" | "localStorage"; yol: string | null; hata: string | null }> {
  const yol = await sqliteDosyaYolu();
  return { tur: yol ? "SQLite" : "localStorage", yol, hata: sonKaliciHata() };
}




export function islemGunluguGetir(limit = 80): IslemGunluguKaydi[] {
  return db.islemGunlugu.slice(0, limit);
}

export function islemGunluguTemizle(): void {
  const onceki = db.islemGunlugu;
  try {
    db.islemGunlugu = [];
    kaydet(db);
  } catch (err) {
    db.islemGunlugu = onceki;
    throw err;
  }
}

export function islemGunluguSil(id: number): void {
  const onceki = db.islemGunlugu;
  try {
    db.islemGunlugu = db.islemGunlugu.filter((l) => l.id !== id);
    kaydet(db);
  } catch (err) {
    db.islemGunlugu = onceki;
    throw err;
  }
}

export function islemGunluguEkle(kayit: Omit<IslemGunluguKaydi, "id" | "zaman">): IslemGunluguKaydi {
  return logEkle(kayit);
}

export function sonEslesmeUyarilari(limit = 30): IslemGunluguKaydi[] {
  return db.islemGunlugu.filter((l) => (l.eslesmeyen?.length ?? 0) > 0).slice(0, limit);
}

export async function sistemSagligiGetir(): Promise<SistemSagligi> {
  const depo = await kaliciDepoBilgisi();
  const sonUyarilar = db.islemGunlugu.filter((l) => l.seviye !== "bilgi").slice(0, 30);
  const eslesmeyenSayisi = sonUyarilar.reduce((s, l) => s + (l.eslesmeyen?.length ?? 0), 0);
  const sorunlar: SistemSagligi["sorunlar"] = [];
  if (depo.hata) sorunlar.push({ seviye: "hata", baslik: "Kalıcı depo hatası", mesaj: depo.hata });
  if (!depo.yol) sorunlar.push({ seviye: "uyari", baslik: "SQLite aktif değil", mesaj: "Uygulama tarayıcı önizlemesinde veya Tauri deposu erişilemiyor. Ana veri localStorage fallback üzerinden çalışır." });
  if (eslesmeyenSayisi > 0) sorunlar.push({ seviye: "uyari", baslik: "Eşleşmeyen öğrenci var", mesaj: `Son işlemlerde ${eslesmeyenSayisi} kayıt öğrenciyle eşleşmedi. Eşleştirme uyarılarını kontrol et.` });
  if (db.ogrenciler.some((o) => !String(o.no).trim())) sorunlar.push({ seviye: "uyari", baslik: "Okul numarası eksik", mesaj: "Bazı öğrencilerin okul numarası boş. e-Okul verileri okul no ile eşleşir." });
  if (!sorunlar.length) sorunlar.push({ seviye: "bilgi", baslik: "Sistem sağlıklı", mesaj: "Depo, veri sayıları ve son işlem kayıtlarında kritik sorun görünmüyor." });
  return {
    depo,
    ozet: ozet(db),
    sonSenkron: { eokul: senkronGetir("eokul"), mebi: senkronGetir("mebi") },
    sorunlar,
    eslesmeyenSayisi,
    hataSayisi: db.islemGunlugu.filter((l) => l.seviye === "hata").length,
  };
}

/**
 * Şube değişikliği (öğrenci 9-A'dan 9-B'ye geçti). Eskiden tek yol öğrenciyi
 * silip yeniden eklemekti ve bütün geçmişi (işaretler, notlar, tutanaklar)
 * gidiyordu. Geçmiş kayıtlar öğrenciye bağlı olduğu için olduğu gibi taşınır;
 * eski sınıfın ödevlerindeki puanlar o ödevlerde kalır. Geri alma döndürür.
 * OA74: taşıma `db.subeTasimalari`na (tarih = bugün) yazılır; işlenen gün hesapları taşımadan
 * önceki kayıtları eski sınıfa bağlar. Geri alma bu satırı da kaldırır.
 */
export function ogrenciSubeTasi(ogrenciId: number, hedefSinifId: number): () => void {
  const o = db.ogrenciler.find((x) => x.id === ogrenciId);
  if (!o) throw new Error("Öğrenci bulunamadı.");
  if (!db.siniflar.some((s) => s.id === hedefSinifId)) throw new Error("Hedef sınıf bulunamadı.");
  if (o.sinifId === hedefSinifId) throw new Error("Öğrenci zaten bu sınıfta.");
  const onceki = db.ogrenciler;
  const oncekiTasima = db.subeTasimalari;
  const eskiSinif = o.sinifId;
  const kayit: SubeTasimaKaydi = { ogrenciId, eskiSinifId: eskiSinif, yeniSinifId: hedefSinifId, tarih: bugunYerelISO() };
  try {
    db.ogrenciler = db.ogrenciler.map((x) => (x.id === ogrenciId ? { ...x, sinifId: hedefSinifId } : x));
    db.subeTasimalari = [...(db.subeTasimalari ?? []), kayit];
    kaydet(db);
  } catch (err) {
    db.ogrenciler = onceki;
    db.subeTasimalari = oncekiTasima;
    throw err;
  }
  return () => {
    const simdi = db.ogrenciler.find((x) => x.id === ogrenciId);
    if (!simdi || simdi.sinifId !== hedefSinifId) throw new Error("Bu taşıma artık geri alınamıyor: öğrenci o arada değişti.");
    if (!db.siniflar.some((s) => s.id === eskiSinif)) throw new Error("Bu taşıma artık geri alınamıyor: eski sınıf silinmiş.");
    const oncesi = db.ogrenciler;
    const oncesiTasima = db.subeTasimalari;
    // Yazılan taşıma satırı (yedekten yüklenmiş olabilir → kimlikle değil alanlarla, SONUNCUSU).
    const liste = db.subeTasimalari ?? [];
    let i = -1;
    for (let j = liste.length - 1; j >= 0; j--) {
      const t = liste[j];
      if (t.ogrenciId === ogrenciId && t.eskiSinifId === eskiSinif && t.yeniSinifId === hedefSinifId && t.tarih === kayit.tarih) { i = j; break; }
    }
    try {
      db.ogrenciler = db.ogrenciler.map((x) => (x.id === ogrenciId ? { ...x, sinifId: eskiSinif } : x));
      if (i >= 0) db.subeTasimalari = liste.filter((_, j) => j !== i);
      kaydet(db);
    } catch (err) {
      db.ogrenciler = oncesi;
      db.subeTasimalari = oncesiTasima;
      throw err;
    }
  };
}

export function ogrenciNoGuncelle(ogrenciId: number, okulNo: string, adSoyad?: string): void {
  const o = db.ogrenciler.find((x) => x.id === ogrenciId);
  if (!o) throw new Error("Öğrenci bulunamadı.");
  const no = String(okulNo).trim();
  if (!no) throw new Error("Okul numarası boş olamaz.");
  const cakisan = db.ogrenciler.find((x) => x.id !== ogrenciId && String(x.no) === no);
  if (cakisan) throw new Error(`Bu okul numarası zaten ${cakisan.adSoyad} öğrencisinde görünüyor.`);
  // `o` db.ogrenciler İÇİNDEKİ nesnenin ta kendisi (map/spread değil, doğrudan
  // referans) — yani dizi düzeyinde bir "önceki" yakalayıp geri atamak yetmez,
  // alanları TEK TEK eski değerine döndürmek gerekiyor.
  const eskiNo = o.no;
  const eskiAdSoyad = o.adSoyad;
  o.no = no;
  if (adSoyad?.trim()) o.adSoyad = adSoyad.trim();
  try {
    logEkle({ kaynak: "sistem", seviye: "bilgi", baslik: "Okul no eşleştirildi", mesaj: `${o.adSoyad}: ${eskiNo || "boş"} → ${no}. İlgili e-Okul verisini yeniden içe aktar.` });
    kaydet(db);
  } catch (err) {
    o.no = eskiNo;
    o.adSoyad = eskiAdSoyad;
    throw err;
  }
}

/**
 * Veli adı/telefonu toplu içe aktarımı (CSV/Google Form dışa aktarımı — MASTER
 * §3'e göre okul geneli, e-Okul'da bugün YOK). Eşleştirme HER ZAMAN Okul No ile
 * (öğrencinin değişmez anahtarı) — sınıfla sınırlı değil, tek dosyayla tüm okul
 * güncellenebilir. Boş hücre mevcut değeri SİLMEZ (öğretmen kısmi dosya
 * yükleyebilir); sadece dolu hücreler yazılır.
 */
export function veliBilgileriIceAktar(
  satirlar: Array<{ no: string; veliAd?: string; veliTel?: string }>,
): { guncellenen: number; eslesmeyen: string[] } {
  let guncellenen = 0;
  const eslesmeyen: string[] = [];
  // Her değiştirilen öğrencinin ESKİ veliAd/veliTel'i burada tutulur — toplu
  // içe aktarım kaydet() adımında patlarsa hepsi tek tek geri alınabilsin diye
  // (satır düzeyinde in-place mutasyon, dizi referansı geri almak yetmez).
  const gerialma: Array<{ o: Ogrenci; veliAd: string | undefined; veliTel: string | undefined }> = [];
  for (const satir of satirlar) {
    const no = String(satir.no).trim();
    if (!no) continue;
    const o = db.ogrenciler.find((x) => String(x.no).trim() === no);
    if (!o) { eslesmeyen.push(no); continue; }
    const ad = satir.veliAd?.trim();
    const tel = satir.veliTel?.trim();
    if (!ad && !tel) continue;
    gerialma.push({ o, veliAd: o.veliAd, veliTel: o.veliTel });
    if (ad) o.veliAd = ad;
    if (tel) o.veliTel = tel;
    guncellenen++;
  }
  if (guncellenen) {
    try {
      logEkle({ kaynak: "sistem", seviye: "bilgi", baslik: "Veli bilgisi içe aktarıldı", mesaj: `${guncellenen} öğrenci güncellendi${eslesmeyen.length ? `, ${eslesmeyen.length} okul no eşleşmedi` : ""}.` });
      kaydet(db);
    } catch (err) {
      for (const { o, veliAd, veliTel } of gerialma) {
        o.veliAd = veliAd;
        o.veliTel = veliTel;
      }
      throw err;
    }
  }
  return { guncellenen, eslesmeyen };
}

/** Tek öğrencinin veli adı/telefonunu düzenler (Öğrenci Kartı) — toplu CSV
 *  içe aktarımın aksine burada boş bırakılan alan mevcut değeri SİLER; bu bir
 *  form düzenleme, kısmi dosya yükleme değil. */
export function veliBilgisiGuncelle(ogrenciId: number, veliAd: string, veliTel: string): void {
  const o = db.ogrenciler.find((x) => x.id === ogrenciId);
  if (!o) return;
  const eskiAd = o.veliAd;
  const eskiTel = o.veliTel;
  o.veliAd = veliAd.trim() || undefined;
  o.veliTel = veliTel.trim() || undefined;
  try {
    kaydet(db);
  } catch (err) {
    o.veliAd = eskiAd;
    o.veliTel = eskiTel;
    throw err;
  }
}

export function mebiAdEslemeKaydet(mebiAdSoyad: string, ogrenciId: number): void {
  const o = db.ogrenciler.find((x) => x.id === ogrenciId);
  if (!o) throw new Error("Öğrenci bulunamadı.");
  const ad = mebiAdSoyad.trim();
  if (!ad) throw new Error("MEBİ adı boş olamaz.");
  const oncekiEslemeler = db.mebiAdEslemeleri;
  try {
    db.mebiAdEslemeleri = [
      ...db.mebiAdEslemeleri.filter((x) => normMetin(x.mebiAdSoyad) !== normMetin(ad)),
      { mebiAdSoyad: ad, ogrenciId, sinifId: o.sinifId, ogretimYili: db.ayarlar.aktifOgretimYili, zaman: simdiYerelISO() },
    ];
    logEkle({ kaynak: "sistem", seviye: "bilgi", baslik: "MEBİ ad eşleştirmesi kaydedildi", mesaj: `${ad} → ${o.adSoyad}. İlgili MEBİ verisini yeniden içe aktar.` });
    kaydet(db);
  } catch (err) {
    db.mebiAdEslemeleri = oncekiEslemeler;
    throw err;
  }
}


// ─── Okuma ─────────────────────────────────────────────────────────────────

export function siniflariGetir(): Sinif[] {
  return db.siniflar;
}

/** OA96: rehber olunan sınıf (en fazla bir tane). Yalnız etiket + Devamsızlık'ta varsayılan sınıf; veriyi etkilemez. */
export function rehberSinifiGetir(): Sinif | undefined {
  return db.siniflar.find((s) => s.rehber);
}

/** `sinifId` null → rehber sınıf yok. Yeni sınıf seçilince eskisinin işareti kalkar. */
export function rehberSinifiAyarla(sinifId: number | null): void {
  const onceki = db.siniflar;
  try {
    db.siniflar = db.siniflar.map((s) => {
      const olmali = sinifId != null && s.id === sinifId;
      if (!!s.rehber === olmali) return s;
      const { rehber: _eski, ...gerisi } = s;
      return olmali ? { ...gerisi, rehber: true } : gerisi;
    });
    kaydet(db);
  } catch (err) {
    db.siniflar = onceki;
    throw err;
  }
}

/** Sınıfın AKTİF öğrencileri. "Nakil gitti" olanlar burada yoktur (OA95). */
export function sinifOgrencileri(sinifId: number): Ogrenci[] {
  return sinifOgrencileriTumu(sinifId).filter((o) => !o.nakilTarihi);
}

/** Dönem raporları için roster: 1. dönemde (kapanmış, verisi olan) nakil giden öğrenci de görünür;
 *  2. dönem ve yıl sonunda yalnız aktifler. */
export function sinifOgrencileriDonem(sinifId: number, donem: 1 | 2 | "yil"): Ogrenci[] {
  return donem === 1 ? sinifOgrencileriTumu(sinifId) : sinifOgrencileri(sinifId);
}

/** Nakil giden öğrenciler DAHİL tüm kayıtlı öğrenciler (liste yönetimi ve rapor için). */
export function sinifOgrencileriTumu(sinifId: number): Ogrenci[] {
  const t = T();
  t.ogrencilerBySinif ??= grupla(db.ogrenciler, (o) => o.sinifId);
  return t.ogrencilerBySinif.get(sinifId)?.slice() ?? [];
}

/** OA95: öğrenciyi "Nakil gitti" yapar / geri alır. Kayıt silinmez. Geri alma işlevi döner. */
export function ogrenciNakilAyarla(ogrenciId: number, nakilGitti: boolean): () => void {
  const o = db.ogrenciler.find((x) => x.id === ogrenciId);
  if (!o) throw new Error("Öğrenci bulunamadı.");
  const eski = o.nakilTarihi;
  const yeni = nakilGitti ? (eski ?? bugunYerelISO()) : undefined;
  if (yeni === eski) return () => undefined;
  const uygula = (v: string | undefined) => { if (v) o.nakilTarihi = v; else delete o.nakilTarihi; };
  uygula(yeni);
  try {
    logEkle({ kaynak: "sistem", seviye: "bilgi", baslik: nakilGitti ? "Öğrenci nakil gitti" : "Nakil işareti kaldırıldı", mesaj: `${o.adSoyad} (No ${o.no})` });
    kaydet(db);
  } catch (err) {
    uygula(eski);
    throw err;
  }
  return () => {
    const simdi = o.nakilTarihi;
    uygula(eski);
    try { kaydet(db); } catch { uygula(simdi); }
  };
}

export function ogrenciGetir(ogrenciId: number): Ogrenci | undefined {
  return ogrenciIndeksi().get(ogrenciId);
}

export function kriterleriGetir(): Kriter[] {
  return db.kriterler;
}

export function devamsizlikGetir(ogrenciId: number): Devamsizlik {
  const t = T();
  t.devamsizlikByOgrenci ??= ilkIndeks(db.devamsizlik, (d) => d.ogrenciId);
  return (
    t.devamsizlikByOgrenci.get(ogrenciId) ?? {
      ogrenciId, ozurluGun: 0, ozursuzGun: 0, gec: 0, toplamGun: 0,
    }
  );
}

export function eksikOdevGetir(ogrenciId: number): number {
  return db.eksikOdev[ogrenciId] ?? 0;
}

export function gununKayitlari(sinifId: number, tarih: string): GunlukKayit[] {
  const ogrIds = new Set(sinifGunuOgrencileri(sinifId, tarih).map((o) => o.id));
  return db.gunlukKayitlar.filter((k) => k.tarih === tarih && ogrIds.has(k.ogrenciId));
}

/** Öğretmen bu sınıf+günü açıp kontrol etti mi (istisna olsun ya da olmasın)?
 *  Kural 1'de istisnasız bir gün hiç GunlukKayit üretmediği için, "hiç
 *  bakılmadı" ile "baktım, hepsi tamamdı" ayrımı SADECE bu izle yapılabilir. */
export function gunIslendiMi(sinifId: number, tarih: string): boolean {
  return db.gunlukIslendi.some((g) => g.sinifId === sinifId && g.tarih === tarih);
}

// ─── OA73: günün dersi (kayıt anında yazılır; kural core/gunDersi.ts) ─────────

/** İÇ KULLANIM: dönen dizi önbellektedir — yalnız okunur (değiştirme). */
function sinifDersListesi(sinifId: number | undefined): string[] {
  if (sinifId == null) return [];
  const t = T();
  let l = t.sinifDers.get(sinifId);
  if (!l) {
    const s = sinifIndeksi().get(sinifId);
    l = s ? sinifDersleri(s) : [];
    t.sinifDers.set(sinifId, l);
  }
  return l;
}

/** OA74 hız: sınıf yoksa null; varsa derslerinin `dersAnahtari`'ları (sırasıyla). Önbellekli —
 *  dönen dizi YALNIZ OKUNUR (lib/ogrenciPerformans.ts::odevDerseUyar ödev başına çağırıyor). */
export function sinifDersAnahtarlari(sinifId: number | undefined): readonly string[] | null {
  if (sinifId == null) return null;
  const t = T();
  t.sinifDersAnahtar ??= new Map();
  let l = t.sinifDersAnahtar.get(sinifId);
  if (l === undefined) {
    l = sinifIndeksi().has(sinifId) ? sinifDersListesi(sinifId).map(dersAnahtari) : null;
    t.sinifDersAnahtar.set(sinifId, l);
  }
  return l;
}

/** OA74 hız: sınıfın dersleri (ilk = ana ders) — `sinifDersleri(sınıf)` ile aynı, kopya döner. */
export function sinifDersleriGetir(sinifId: number | undefined): string[] {
  return sinifDersListesi(sinifId).slice();
}

/** Bu sınıf+gün hangi derse işlendi? Kayıtlı ders sınıfın derslerinden biriyse onun adı;
 *  değilse (eski gün, telefon zarfı, ders sınıftan çıkarılmış, tek dersli sınıf) undefined = ORTAK. */
export function gunDersi(sinifId: number, tarih: string): string | undefined {
  const g = db.gunlukIslendi.find((x) => x.sinifId === sinifId && x.tarih === tarih);
  return gunDersiCoz(g?.ders, sinifDersListesi(sinifId));
}

/** Günlük işaretlerin süzüleceği ders (tek dersli sınıfta undefined; iki derslide verilen ya da ana ders). */
export function gunlukSuzmeDersiGetir(sinifId: number | undefined, ders?: string): string | undefined {
  return gunlukSuzmeDersi(sinifDersListesi(sinifId), ders);
}

/** `ders` verilmiş ve sınıf iki+ dersliyse "bu tarih o derse sayılır mı" süzgeci; aksi halde null
 *  (süzme yok — tek dersli sınıfta veri ve notlar OA73 öncesiyle birebir). Sınıfın günleri bir kez taranır. */
export function sinifGunDersSuzgeci(sinifId: number, ders?: string): ((tarih: string) => boolean) | null {
  const dersler = sinifDersListesi(sinifId);
  if (!ders || dersler.length < 2) return null;
  const t = T();
  const anahtar = `${sinifId}|${ders}`;
  const onbellekte = t.suzgec.get(anahtar);
  if (onbellekte !== undefined) return onbellekte;
  const harita = new Map<string, string | undefined>();
  for (const g of sinifIzleri(sinifId)) if (g.ders) harita.set(g.tarih, gunDersiCoz(g.ders, dersler));
  // gunDerseSayilir(gunDersi, ders): dersi kayıtsız (undefined) gün ORTAK → sayılır; kayıtlıysa
  // anahtarlar eşitse. Aynı kural, tarih başına bir kez önceden hesaplanır.
  const sayilmayan = new Set<string>();
  for (const [tarih, gd] of harita) if (!gunDerseSayilir(gd, ders)) sayilmayan.add(tarih);
  const suzgec = (tarih: string) => !sayilmayan.has(tarih);
  t.suzgec.set(anahtar, suzgec);
  return suzgec;
}

/** Sınıfın işlendi izleri (gunlukIslendi sırasıyla) — iç kullanım, yalnız okunur. */
function sinifIzleri(sinifId: number): GunlukIslendi[] {
  const t = T();
  t.islendiBySinif ??= grupla(db.gunlukIslendi, (g) => g.sinifId);
  return t.islendiBySinif.get(sinifId) ?? [];
}

/** Kaydedilen günün iz listesi: iz yoksa eklenir (iki+ derste dersiyle); varsa ve yeni geçerli
 *  ders verildiyse dersi DEĞİŞİR (öğretmen düzeltmesi). Ders verilmezse/geçersizse mevcut ders
 *  korunur. Yeni dizi + yeni nesne döner (ZORUNLU KURAL tuzak 1/3: yerinde mutasyon yok). */
function islendiIziYaz(liste: GunlukIslendi[], sinifId: number, tarih: string, ders?: string): GunlukIslendi[] {
  const yazilacak = gunDersiCoz(ders, sinifDersListesi(sinifId));
  const i = liste.findIndex((g) => g.sinifId === sinifId && g.tarih === tarih);
  if (i < 0) return [...liste, yazilacak ? { sinifId, tarih, ders: yazilacak } : { sinifId, tarih }];
  if (!yazilacak || liste[i].ders === yazilacak) return liste;
  return liste.map((g, j) => (j === i ? { ...g, ders: yazilacak } : g));
}

/** Bir sınıfın "ders yapılmadı" günleri (telefona giden liste için). */
export function sinifYapilmayanGunler(sinifId: number): DersYapilmadi[] {
  return db.dersYapilmadi.filter((d) => d.sinifId === sinifId);
}

export function gelmediGetir(sinifId: number, tarih: string): Set<number> {
  return new Set(db.gelmedi.filter((g) => g.sinifId === sinifId && g.tarih === tarih).map((g) => g.ogrenciId));
}

/** Telefon liste paketi için: sınıfın "Yok" kayıtları tarih → öğrenci id'leri. */
export function sinifGelmediGunleri(sinifId: number): Map<string, number[]> {
  const m = new Map<string, number[]>();
  for (const g of db.gelmedi) if (g.sinifId === sinifId) m.set(g.tarih, [...(m.get(g.tarih) ?? []), g.ogrenciId]);
  return m;
}

/** Öğrencinin "Yok" (derse gelmedi) tarihleri — sıralı. */
/** Öğrencinin Yok kayıtları, hangi sınıfta işaretlendiğiyle (şube değiştiren öğrenci için). */
export function ogrenciGelmediKayitlari(ogrenciId: number): Array<{ sinifId: number; tarih: string }> {
  return ogrenciGelmediListesi(ogrenciId).map((g) => ({ sinifId: g.sinifId, tarih: g.tarih }));
}

/** İç kullanım (yalnız okunur): öğrencinin Yok satırları, db.gelmedi sırasıyla. */
function ogrenciGelmediListesi(ogrenciId: number): GelmediKaydi[] {
  const t = T();
  t.gelmediByOgrenci ??= grupla(db.gelmedi, (g) => g.ogrenciId);
  return t.gelmediByOgrenci.get(ogrenciId) ?? [];
}

export function ogrenciGelmediTarihleri(ogrenciId: number): string[] {
  return db.gelmedi.filter((g) => g.ogrenciId === ogrenciId).map((g) => g.tarih).sort();
}

export function ogrenciGelmediGunSayisi(ogrenciId: number): number {
  return db.gelmedi.filter((g) => g.ogrenciId === ogrenciId).length;
}

/** OA74: sınıf+tarih kaydedilirken EZİLECEK "Yok" satırı mı? Yalnız o sınıfın, o günün ve
 *  ŞU AN sınıfta olan (ekranda görünen, listesi gönderilen) öğrencilerin satırları. Başka şubeye
 *  taşınmış öğrencinin bu sınıfta işaretlenmiş eski "Yok"u ekranda görünmez, gönderilen listede
 *  de olamaz → eskiden gün her yeniden kaydedildiğinde sessizce siliniyordu. */
function gelmediEzilirMi(g: GelmediKaydi, sinifId: number, tarih: string, sinifOgr: Set<number>): boolean {
  return g.sinifId === sinifId && g.tarih === tarih && sinifOgr.has(g.ogrenciId);
}

/** Sınıf+tarih için "Yok" listesini EZER (Hızlı İşleme o günün tam hâlini gönderir). */
export function gelmediKaydet(sinifId: number, tarih: string, ogrenciIdler: number[]): void {
  const onceki = db.gelmedi;
  const sinifOgr = new Set(sinifGunuOgrencileri(sinifId, tarih).map((o) => o.id));
  try {
    db.gelmedi = [
      ...db.gelmedi.filter((g) => !gelmediEzilirMi(g, sinifId, tarih, sinifOgr)),
      ...[...new Set(ogrenciIdler)].filter((id) => sinifOgr.has(id)).map((ogrenciId) => ({ sinifId, ogrenciId, tarih })),
    ];
    kaydet(db);
  } catch (err) {
    db.gelmedi = onceki;
    throw err;
  }
}

export function dersYapilmadiGetir(sinifId: number, tarih: string): DersYapilmadi | undefined {
  return db.dersYapilmadi.find((d) => d.sinifId === sinifId && d.tarih === tarih);
}

/** Uyarı/ilerleme hesapları için: bu ders "halledildi" mi? İşlendi (kayıt ya da
 *  "istisna yok" izi) YA DA ders yapılmadı olarak işaretlendi. */
export function gunKontrolEdildiMi(sinifId: number, tarih: string): boolean {
  return gunIslendiMi(sinifId, tarih) || gununKayitlari(sinifId, tarih).length > 0 || !!dersYapilmadiGetir(sinifId, tarih);
}

/**
 * Programdaki dersi "yapılmadı" olarak işaretler (tatil, gezi, rapor, sınav...).
 * NEDEN VAR: eskiden böyle bir seçenek yoktu; öğretmen tatil gününün uyarısını
 * susturmak için "istisna yok" diyordu ve o gün İŞLENMİŞ ders sayılıp katılım/
 * kitap yüzdesinin paydasını büyütüyordu. O gün işaret (istisna) varsa reddedilir —
 * derste işaret alınmışsa ders yapılmıştır; önce işaretler kaldırılmalı.
 */
export function dersYapilmadiIsaretle(sinifId: number, tarih: string, neden: string): void {
  const sinifOgr = new Set(db.ogrenciler.filter((o) => o.sinifId === sinifId).map((o) => o.id));
  // Yalnız HÂLÂ TANIMLI kriterlerin kayıtları "işaret" sayılır: silinmiş bir
  // kriterin eski kaydı ekranda görünmez, öğretmen kaldıramaz — reddin sebebi
  // olursa gün sonsuza dek "yapılmadı" işaretlenemezdi (denetim 2026-10).
  const kriterIdleri = new Set(db.kriterler.map((k) => k.id));
  if (db.gunlukKayitlar.some((k) => k.tarih === tarih && sinifOgr.has(k.ogrenciId) && kriterIdleri.has(k.kriterId))) {
    throw new Error("Bu gün için öğrenci işaretleri var; ders yapılmış görünüyor. Önce işaretleri kaldırıp kaydedin.");
  }
  const oncekiY = db.dersYapilmadi;
  const oncekiI = db.gunlukIslendi;
  try {
    db.dersYapilmadi = [
      ...db.dersYapilmadi.filter((d) => !(d.sinifId === sinifId && d.tarih === tarih)),
      { sinifId, tarih, neden: neden.trim() || "Diğer" },
    ];
    // "istisna yok" izi varsa kalkar: aynı gün hem işlendi hem yapılmadı olamaz.
    db.gunlukIslendi = db.gunlukIslendi.filter((g) => !(g.sinifId === sinifId && g.tarih === tarih));
    kaydet(db);
  } catch (err) {
    db.dersYapilmadi = oncekiY;
    db.gunlukIslendi = oncekiI;
    throw err;
  }
}

export function dersYapilmadiKaldir(sinifId: number, tarih: string): void {
  const onceki = db.dersYapilmadi;
  try {
    db.dersYapilmadi = db.dersYapilmadi.filter((d) => !(d.sinifId === sinifId && d.tarih === tarih));
    kaydet(db);
  } catch (err) {
    db.dersYapilmadi = onceki;
    throw err;
  }
}

/**
 * Bir sınıfın (seçili dönemde) İŞLENEN günleri — öğretmenin Hızlı İşleme'de
 * kaydettiği, istisna olsun ya da olmasın "kontrol edildi" izi düşen günler.
 *
 * NEDEN VAR (2026-09 hatası): katılım ve kitap yüzdesi "işlenen gün"e bölünüyor,
 * ama bu sayı eskiden ÖĞRENCİNİN KENDİ kayıtlarının tarihlerinden çıkıyordu. Kayıt
 * yalnız istisnada yazıldığı için (Kural 1) 20 dersin 1'inde kitabı unutan
 * öğrenci "1 gün işlendi, 1 gün getirmedi" → kitap %0 alıyordu; tek bir +2 alan
 * da "1 günde +2" → katılım 70. Doğru payda sınıfın işlenen gün sayısıdır.
 *
 * Dönem: iz (GunlukIslendi) dönem taşımıyor. OA74'ten beri günün dönemi
 * `gunDonemiCozucu`'dan gelir (1. dönem kapandıysa tarihten, kapanmadıysa o tarihteki
 * kayıtların en küçük etiketi) — dizideki sıraya bağlı değildir.
 */
/** Sınıfta en az bir ders işlenmiş mi (yeni gelen öğrenciye katılma tarihi yazmak için). */
function sinifDersIslendiMi(sinifId: number): boolean {
  if (db.gunlukIslendi.some((g) => g.sinifId === sinifId)) return true;
  const ogr = new Set(db.ogrenciler.filter((o) => o.sinifId === sinifId).map((o) => o.id));
  return db.gunlukKayitlar.some((k) => ogr.has(k.ogrenciId));
}

/** Öğrencinin sınıfa katılma tarihini elle düzeltme (Öğrenci Kartı). Boş = dönem başından beri. */
export function ogrenciKatilmaTarihiAyarla(ogrenciId: number, tarih: string | null): void {
  const o = db.ogrenciler.find((x) => x.id === ogrenciId);
  if (!o) throw new Error("Öğrenci bulunamadı.");
  if (tarih != null && !/^\d{4}-\d{2}-\d{2}$/.test(tarih)) throw new Error("Geçersiz tarih.");
  const onceki = db.ogrenciler;
  db.ogrenciler = db.ogrenciler.map((x) => {
    if (x.id !== ogrenciId) return x;
    const { katilmaTarihi: _eski, ...geri } = x;
    void _eski;
    return tarih ? { ...geri, katilmaTarihi: tarih } : geri;
  });
  try { kaydet(db); } catch (err) { db.ogrenciler = onceki; throw err; }
}

/** OA90: sürekli devamsız işareti. OA94: kaldırılınca işaretli kaldığı günler bir aralık olarak
 *  saklanır (katılma tarihi değişmez): o günler paydaya girmez, kapanmış dönemin notu değişmez. */
export function ogrenciDevamEtmiyorAyarla(ogrenciId: number, devamEtmiyor: boolean): void {
  const o = db.ogrenciler.find((x) => x.id === ogrenciId);
  if (!o) throw new Error("Öğrenci bulunamadı.");
  const onceki = db.ogrenciler;
  const bugun = bugunYerelISO();
  db.ogrenciler = db.ogrenciler.map((x) => {
    if (x.id !== ogrenciId) return x;
    const { devamEtmiyor: _eski, ...geri } = x;
    void _eski;
    if (devamEtmiyor) return { ...geri, devamEtmiyor: bugun };
    if (!x.devamEtmiyor || x.devamEtmiyor >= bugun) return geri;
    return { ...geri, devamsizAraliklari: [...(x.devamsizAraliklari ?? []), { bas: x.devamEtmiyor, bit: bugun }] };
  });
  try { kaydet(db); } catch (err) { db.ogrenciler = onceki; throw err; }
}

/** OA94: öğrenci o gün "sürekli devamsız" mıydı (açık işaret ya da geçmiş aralık)? */
export function ogrenciDevamsizGunMu(o: Pick<Ogrenci, "devamEtmiyor" | "devamsizAraliklari">, tarih: string): boolean {
  if (o.devamEtmiyor && tarih >= o.devamEtmiyor) return true;
  return (o.devamsizAraliklari ?? []).some((a) => tarih >= a.bas && tarih < a.bit);
}

/** OA94: bu dönemin sonucu "sürekli devamsız → veri yok" mu? Kapanmış dönem kapanış günündeki
 *  duruma göre (sonradan işaretlemek/kaldırmak kapanmış notu değiştirmez); açık dönem şu anki işarete göre. */
export function ogrenciDonemdeDevamsizMi(o: Pick<Ogrenci, "devamEtmiyor" | "devamsizAraliklari">, donem: 1 | 2 | "yil"): boolean {
  const d = db.donemDurumu;
  const kapanis = donem === 1 ? d.d1KapanisZamani : donem === 2 ? d.d2KapanisZamani : d.d2KapanisZamani;
  if (!kapanis) return !!o.devamEtmiyor;
  return ogrenciDevamsizGunMu(o, kapanis.slice(0, 10));
}

/** OA90: derse gelen (sürekli devamsız işaretli olmayan) öğrenciler. */
export function devamEdenOgrenciler<T extends Pick<Ogrenci, "devamEtmiyor">>(liste: T[]): T[] {
  return liste.filter((o) => !o.devamEtmiyor);
}

// ─── OA74: şube taşıma geçmişi + günün dönemi (işlenen gün hesapları için) ───────

function subeTasimalariNormallestir(v: unknown): SubeTasimaKaydi[] {
  if (!Array.isArray(v)) return [];
  return v.filter((t): t is SubeTasimaKaydi => {
    if (!t || typeof t !== "object") return false;
    const x = t as Record<string, unknown>;
    return Number.isInteger(x.ogrenciId) && Number.isInteger(x.eskiSinifId) && Number.isInteger(x.yeniSinifId)
      && typeof x.tarih === "string" && /^\d{4}-\d{2}-\d{2}$/.test(x.tarih);
  });
}

/** 1. dönem kapandıysa günlük kaydın dönemi TARİHİNDEN (iki yönde); kapanmadıysa dokunulmaz.
 *  Değişiklik yoksa aynı dizi döner (gereksiz yazım/kimlik değişimi olmasın). */
function gunlukDonemleriniTarihtenOnar(kayitlar: GunlukKayit[], durum?: DonemDurumu | null): GunlukKayit[] {
  const ilk = ikinciDonemIlkGunu(durum);
  if (!ilk) return kayitlar;
  const dogru = (t: string): 1 | 2 => (t < ilk ? 1 : 2);
  if (!kayitlar.some((k) => k.donem !== dogru(k.tarih))) return kayitlar;
  return kayitlar.map((k) => (k.donem === dogru(k.tarih) ? k : { ...k, donem: dogru(k.tarih) }));
}

/** Öğrenci başına taşıma listesi (tarihe göre sıralı, eşit tarihte yazılış sırası korunur). */
/** İç kullanım: önbellekli, yalnız okunur. */
function subeTasimaIndeksi(): Map<number, SubeTasimaKaydi[]> {
  const t = T();
  return (t.tasima ??= subeTasimaIndeksiKur());
}

function subeTasimaIndeksiKur(): Map<number, SubeTasimaKaydi[]> {
  const m = new Map<number, SubeTasimaKaydi[]>();
  for (const t of db.subeTasimalari ?? []) m.set(t.ogrenciId, [...(m.get(t.ogrenciId) ?? []), t]);
  for (const l of m.values()) l.sort((a, b) => (a.tarih < b.tarih ? -1 : a.tarih > b.tarih ? 1 : 0));
  return m;
}

/** Öğrencinin `tarih` günü bulunduğu sınıf: o tarihten SONRA yapılan ilk taşımanın eski sınıfı;
 *  sonrasında taşıma yoksa şu anki sınıfı. Taşıma geçmişi olmayan öğrenci → şu anki sınıfı. */
function tarihtekiSinif(o: Ogrenci, tarih: string, tasimalar?: SubeTasimaKaydi[]): number {
  for (const t of tasimalar ?? []) if (tarih < t.tarih) return t.eskiSinifId;
  return o.sinifId;
}

/** Dışa açık: öğrencinin bir tarihteki sınıfı (ekranlar/raporlar için). */
export function ogrencininTarihtekiSinifi(ogrenciId: number, tarih: string): number | undefined {
  const o = ogrenciGetir(ogrenciId);
  return o ? tarihtekiSinif(o, tarih, subeTasimaIndeksi().get(ogrenciId)) : undefined;
}

/** OA74 eki (fuzz "ders-izolasyonu"): Hızlı İşleme'de sınıf+günün öğrencileri — şu an sınıfta olan
 *  VE o tarihte de bu sınıfta bulunanlar. Taşıma geçmişi olmayan öğrencide `sinifOgrencileri` ile
 *  aynı. Başka şubeden taşınıp gelen öğrenci, taşımadan ÖNCEKİ bir günde listede yoktur: o günün
 *  paydası eski sınıfınındır (`ogrenciIslenenGunler`), buraya yazılan işaret eski sınıfın izsiz
 *  "kayıt günü" olup eski sınıf arkadaşlarının paydasını büyütüyor ve günün dersinden bağımsız
 *  (ORTAK) sayılıyordu. Başka şubeye taşınmış öğrenci zaten listede değildir (OA74 "Yok" ezme). */
export function sinifGunuOgrencileri(sinifId: number, tarih: string): Ogrenci[] {
  const tasima = subeTasimaIndeksi();
  // OA90: sürekli devamsız öğrenci derste listelenmez; kaydetme de onun eski işaretlerine dokunmaz.
  return sinifOgrencileri(sinifId).filter((o) => !o.devamEtmiyor && tarihtekiSinif(o, tarih, tasima.get(o.id)) === sinifId);
}

export function ogrenciSubeTasimalari(ogrenciId: number): SubeTasimaKaydi[] {
  return (db.subeTasimalari ?? []).filter((t) => t.ogrenciId === ogrenciId);
}

/**
 * OA74 — bir ders gününün dönemi, SIRADAN BAĞIMSIZ:
 *  - 1. dönem kapandıysa (d1KapanisZamani var) TARİHTEN: kapanış gününe kadar 1, sonrası 2
 *    (`tarihinDonemi` ile aynı kural; normalleştir etiketleri de buna onarır).
 *  - Kapanmadıysa etiketler korunur; o tarihteki kayıtlar farklı dönem diyorsa EN KÜÇÜK etiket
 *    (1) kazanır — 1. dönem kapanmadan meşru bir 2. dönem günü olamaz, farklı etiket yalnız
 *    telefon paketinden gelebilir. Kaydı olmayan (yalnız izli) gün 1.
 * Eskiden "o tarihte ilk görülen kaydın etiketi" kazanıyordu → sonuç dizideki sıraya bağlıydı.
 */
function gunDonemiCozucu(): (tarih: string) => 1 | 2 {
  const t = T();
  return (t.gunDonemi ??= gunDonemiCozucuKur());
}

function gunDonemiCozucuKur(): (tarih: string) => 1 | 2 {
  const ilk = ikinciDonemIlkGunu(db.donemDurumu);
  if (ilk) return (t) => (t >= ilk ? 2 : 1);
  const enKucuk = new Map<string, 1 | 2>();
  for (const k of db.gunlukKayitlar) if (k.donem === 1 || !enKucuk.has(k.tarih)) enKucuk.set(k.tarih, k.donem === 2 ? 2 : 1);
  return (t) => enKucuk.get(t) ?? 1;
}

/** OA73: `ders` verilirse (ve sınıf iki+ dersliyse) yalnız o derse işlenen ya da dersi kayıtlı
 *  olmayan (ORTAK) günler. Verilmezse eskisi gibi tüm günler.
 *  OA74: kaynak (1) sınıfın KENDİ izleri (gunlukIslendi — hizliIslemeKaydet ve telefon zarfı her
 *  işlenen günde yazar) + (2) eski veri için, izi olmayan kayıt günleri: yalnız O TARİHTE bu
 *  sınıfta olan öğrencilerin kayıtları (`subeTasimalari`). Eskiden şu anki öğrencilerin TÜM
 *  kayıt günleri sayılıyordu → başka şubeden taşınan öğrencinin eski şubedeki günleri yeni
 *  sınıfın işlenen günü olup sınıf arkadaşlarının paydasını büyütüyordu. */
export function sinifIslenenGunler(sinifId: number, donemSecim: 1 | 2 | "yil", ders?: string): Set<string> {
  // OA74 hız: (sınıf, dönem, ders) başına bir kez hesaplanır; çağırana KOPYA verilir.
  const t = T();
  const anahtar = `${sinifId}|${donemSecim}|${ders ?? ""}`;
  let sonuc = t.sinifIslenen.get(anahtar);
  if (!sonuc) {
    sonuc = sinifIslenenGunlerHesapla(sinifId, donemSecim, ders);
    t.sinifIslenen.set(anahtar, sonuc);
  }
  return new Set(sonuc);
}

/** Her kayıt, sahibinin O TARİHTE bulunduğu sınıfa (kayıt sırasıyla) — `sinifIslenenGunler`in
 *  "izsiz eski kayıt günleri" kaynağı. Eskiden her çağrıda tüm kayıtlar taranıyordu. */
function kayitGunleriSinifIndeksi(): Map<number, Set<string>> {
  const t = T();
  if (t.kayitGunleriBySinif) return t.kayitGunleriBySinif;
  const tasima = subeTasimaIndeksi();
  const ogr = ogrenciIndeksi();
  const m = new Map<number, Set<string>>();
  for (const k of db.gunlukKayitlar) {
    const o = ogr.get(k.ogrenciId);
    if (!o) continue;
    const s = tarihtekiSinif(o, k.tarih, tasima.get(o.id));
    let g = m.get(s);
    if (!g) m.set(s, (g = new Set()));
    g.add(k.tarih);
  }
  return (t.kayitGunleriBySinif = m);
}

function sinifIslenenGunlerHesapla(sinifId: number, donemSecim: 1 | 2 | "yil", ders?: string): Set<string> {
  // Aday öğrenciler (şu an bu sınıfta ya da taşıma geçmişinde bu sınıf geçen) ve onların o tarihte
  // bu sınıfta olduğu kayıt günleri: kayitGunleriSinifIndeksi (aynı kural, tek geçişte).
  const kayitGunleri = kayitGunleriSinifIndeksi().get(sinifId) ?? new Set<string>();
  const gunDonemi = gunDonemiCozucu();
  const sonuc = new Set<string>();
  const yapilmadi = new Set(db.dersYapilmadi.filter((d) => d.sinifId === sinifId).map((d) => d.tarih));
  for (const g of sinifIzleri(sinifId)) {
    if (yapilmadi.has(g.tarih)) continue;
    if (donemSecim === "yil" || gunDonemi(g.tarih) === donemSecim) sonuc.add(g.tarih);
  }
  // İz düşmemiş ama kayıt olan günler (eski veri, telefon zarfı öncesi) de işlenmiştir.
  for (const tarih of kayitGunleri) {
    if (donemSecim === "yil" || gunDonemi(tarih) === donemSecim) sonuc.add(tarih);
  }
  const suzgec = sinifGunDersSuzgeci(sinifId, ders);
  if (suzgec) for (const t of [...sonuc]) if (!suzgec(t)) sonuc.delete(t);
  return sonuc;
}

/** Öğrencinin payda olarak kullanılacak işlenen günleri: her tarih için O GÜN bulunduğu sınıfın
 *  işlenen günleri + kendi kayıtlarının günleri.
 *  OA74 kararı (şube taşıma): taşınan öğrencinin paydası = taşımadan önceki günler için ESKİ
 *  sınıfının, sonrası için yeni sınıfının işlenen günleri (iki sınıfın ders süzgeci kendi
 *  derslerine göre; eski sınıf tek dersliyse o günler her derse sayılır — OA73'teki "eski
 *  şubedeki Yok süzülmez" ile aynı). Taşıma geçmişi olmayan öğrencide hesap eskisiyle birebir. */
export function ogrenciIslenenGunler(ogrenciId: number, donemSecim: 1 | 2 | "yil", ders?: string): Set<string> {
  // OA74 hız: (öğrenci, dönem, ders) başına bir kez; çağırana KOPYA verilir.
  const t = T();
  const anahtar = `${ogrenciId}|${donemSecim}|${ders ?? ""}`;
  let sonuc = t.ogrenciIslenen.get(anahtar);
  if (!sonuc) {
    sonuc = ogrenciIslenenGunlerHesapla(ogrenciId, donemSecim, ders);
    t.ogrenciIslenen.set(anahtar, sonuc);
  }
  return new Set(sonuc);
}

function ogrenciIslenenGunlerHesapla(ogrenciId: number, donemSecim: 1 | 2 | "yil", ders?: string): Set<string> {
  const ogr = ogrenciGetir(ogrenciId);
  const tasimalar = ogr ? subeTasimaIndeksi().get(ogr.id) : undefined;
  let sonuc = new Set<string>();
  if (ogr && !tasimalar?.length) sonuc = sinifIslenenGunler(ogr.sinifId, donemSecim, ders);
  else if (ogr && tasimalar) {
    const siniflar = new Set([ogr.sinifId, ...tasimalar.flatMap((t) => [t.eskiSinifId, t.yeniSinifId])]);
    for (const s of siniflar) {
      for (const t of sinifIslenenGunler(s, donemSecim, ders)) if (tarihtekiSinif(ogr, t, tasimalar) === s) sonuc.add(t);
    }
  }
  // Dönem ortasında gelen öğrenci: geldiği günden önceki dersler paydasına girmez (denetim 2026-10).
  if (ogr?.katilmaTarihi) for (const t of [...sonuc]) if (t < ogr.katilmaTarihi) sonuc.delete(t);
  // OA94: sürekli devamsız kaldığı günler (geçmiş aralıklar) paydaya girmez.
  if (ogr?.devamsizAraliklari?.length) for (const t of [...sonuc]) if (ogrenciDevamsizGunMu({ devamsizAraliklari: ogr.devamsizAraliklari }, t)) sonuc.delete(t);
  // OA73: öğrencinin kendi kayıtlarının günleri de aynı ders süzgecinden geçer (öteki dersin günü girmesin).
  // OA74: süzgeç o gün bulunduğu sınıfın; dönem sınıf günleriyle aynı kuraldan (gunDonemiCozucu).
  const suzgecler = new Map<number, ((t: string) => boolean) | null>();
  const suzgecAl = (s: number) => {
    if (!suzgecler.has(s)) suzgecler.set(s, sinifGunDersSuzgeci(s, ders));
    return suzgecler.get(s)!;
  };
  const gunDonemi = gunDonemiCozucu();
  for (const k of ogrenciKayitIndeksi().get(ogrenciId) ?? []) {
    if (donemSecim !== "yil" && gunDonemi(k.tarih) !== donemSecim) continue;
    const suzgec = ogr ? suzgecAl(tarihtekiSinif(ogr, k.tarih, tasimalar)) : null;
    if (!suzgec || suzgec(k.tarih)) sonuc.add(k.tarih);
  }
  // "Yok" işaretli günler öğrencinin paydasından düşer (2026-09 denetimi: gelmeyen
  // öğrenci o gün kitap ve katılım tabanını tam alıyordu).
  for (const g of ogrenciGelmediListesi(ogrenciId)) sonuc.delete(g.tarih);
  return sonuc;
}

export function ogrenciGunlukKayitlari(ogrenciId: number): GunlukKayit[] {
  return ogrenciKayitIndeksi().get(ogrenciId)?.slice() ?? [];
}

// ─── Yazma (MASTER Kural 1: sadece istisnalar yazılır) ──────────────────────

/**
 * Bir sınıfın bir gününe ait işaretleri kaydeder. Önce o gün+sınıfın eski
 * kayıtlarını siler, sonra gelenleri yazar (idempotent: tekrar kaydet = üzerine yaz).
 *
 * DİKKAT — bu bir BİRLEŞTİRME DEĞİL, bir EZMEDİR. Ekrandan gelen çağrı için
 * doğru: Hızlı İşleme o günün TAM halini gönderir, eksik olan silinmiş demektir.
 * Başka bir CİHAZDAN gelen kısmi veri için YANLIŞ: telefondan gelen zarf bunu
 * çağırırsa, o gün bilgisayarda girilmiş her şey sessizce uçar. Zarf için
 * `gunlukBirlestir` kullan (bkz. MOBIL-HIZLI-ISLEME-PLANI.md §7.1) — ama YENİ
 * bir ekrandan zarf işleniyorsa muhtemelen bunu da doğrudan değil,
 * `lib/telefonBirlestirme.ts::telefonZarfPlani`/`telefonZarfiniUygula`
 * üzerinden çağırmak istersin (`gunlukBirlestir` + `odevPuanBirlestir`'i TEK
 * işlemde birleştirip "aktarım makbuzu" üreten güncel UI katmanı — bkz.
 * `modules/entegrasyon/components/ZarfIceAktar.tsx`).
 */
export function gunlukKaydet(
  sinifId: number,
  tarih: string,
  kayitlar: Array<Omit<GunlukKayit, "id" | "donem">>,
): void {
  const ogrIds = new Set(sinifOgrencileri(sinifId).map((o) => o.id));
  const oncekiGunlukKayitlar = db.gunlukKayitlar;
  const oncekiSonGunlukId = db.sonGunlukId;
  const donem = tarihinDonemi(tarih);
  const kalanlar = db.gunlukKayitlar.filter(
    (k) => !(k.tarih === tarih && ogrIds.has(k.ogrenciId)),
  );
  const yeniler = kayitlar.map((k) => ({ ...k, id: ++db.sonGunlukId, donem }));
  try {
    db.gunlukKayitlar = [...kalanlar, ...yeniler];
    kaydet(db);
  } catch (err) {
    db.gunlukKayitlar = oncekiGunlukKayitlar;
    db.sonGunlukId = oncekiSonGunlukId;
    throw err;
  }
}

// ─── Telefondan gelen zarf (MOBIL-HIZLI-ISLEME-PLANI.md §7) ─────────────────

export interface ZarfCakismasi {
  ogrenciId: number;
  sinifId: number;
  tarih: string;
  kriterId: number;
  telefonDeger: number;
  bilgisayarDeger: number;
}

export interface ZarfUygulamaSonucu {
  yazilan: number;         // eklenen + (karar gereği) üzerine yazılan
  atlanan: number;         // okul no bu sınıfta bulunamadı
  cakisan: number;         // cakismalar.length ile aynı
  isaretlenenGun: number;  // yeni "kontrol edildi" izi düşen (sinif, tarih)
  cakismalar: ZarfCakismasi[];
}

export type ZarfCakismaKarari = "sor" | "telefonKazanir" | "bilgisayarKazanir";

/**
 * Telefondan (ya da ikinci bir bilgisayardan) gelen kısmi işaretleri MEVCUT
 * kayıtların ÜSTÜNE EKLER. `gunlukKaydet`'in aksine hiçbir şeyi silmez.
 *
 * Kimlik `(ogrenciId, tarih, kriterId)`. Aynı üçlü:
 *   - yoksa            → eklenir
 *   - varsa, değer aynı→ dokunulmaz (aynı zarf iki kez uygulanırsa 0 yazar)
 *   - varsa, değer farklı → ÇAKIŞMA. "sor" ise YAZILMAZ, listeye konur ve karar
 *     öğretmene bırakılır — `kaynak: "elle"` bir kaydın sormadan ezilmemesi
 *     kuralının aynısı.
 *
 * TEK YAZMA: her günü ayrı ayrı `gunuIsaretle` ile işaretlemek yerine hem
 * kayıtlar hem izler tek `kaydet()` çağrısında yazılır. Aksi halde ortada bir
 * hata olursa zarfın yarısı diske inmiş, yarısı inmemiş olurdu.
 */
export function gunlukBirlestir(
  gunler: Array<{
    sinifId: number;
    tarih: string;
    donem: 1 | 2;
    istisnalar: Array<{ no: string; kriterId: number; deger: number }>;
  }>,
  cakismaKarari: ZarfCakismaKarari = "sor",
): ZarfUygulamaSonucu {
  // YIL_SONU'da hangi döneme yazılacağı tanımsız; `gunlukKaydet` de aynı
  // varsayımı yapıyor. Tahmin etmek yerine reddediyoruz.
  if (db.donemDurumu.aktifDonem === null) {
    throw new Error("Yıl sonu kapalıyken zarf içe aktarılamaz.");
  }

  const oncekiKayitlar = db.gunlukKayitlar;
  const oncekiSonId = db.sonGunlukId;
  const oncekiIslendi = db.gunlukIslendi;

  const sonuc: ZarfUygulamaSonucu = {
    yazilan: 0, atlanan: 0, cakisan: 0, isaretlenenGun: 0, cakismalar: [],
  };

  // Çalışma kopyaları: db.* ancak her şey hesaplandıktan sonra değiştirilir.
  let kayitlar = db.gunlukKayitlar;
  let sonId = db.sonGunlukId;
  let islendi = db.gunlukIslendi;

  // (ogrenciId|tarih|kriterId) → kayıt. Zarf 400 gün × 500 istisna olabildiği
  // için her istisnada diziyi taramak yerine tek seferde indeks kuruluyor.
  const anahtar = (ogrenciId: number, tarih: string, kriterId: number) =>
    `${ogrenciId}|${tarih}|${kriterId}`;
  const indeks = new Map<string, GunlukKayit>();
  for (const k of kayitlar) indeks.set(anahtar(k.ogrenciId, k.tarih, k.kriterId), k);

  const eklenecek: GunlukKayit[] = [];
  const guncellenecek = new Map<number, number>(); // kayıt id → yeni değer

  for (const gun of gunler) {
    const noMap = new Map(
      db.ogrenciler.filter((o) => o.sinifId === gun.sinifId).map((o) => [String(o.no), o.id] as const),
    );

    for (const istisna of gun.istisnalar) {
      const ogrenciId = noMap.get(istisna.no);
      if (ogrenciId === undefined) { sonuc.atlanan++; continue; }

      const mevcut = indeks.get(anahtar(ogrenciId, gun.tarih, istisna.kriterId));
      if (!mevcut) {
        const yeni: GunlukKayit = {
          id: ++sonId,
          ogrenciId,
          tarih: gun.tarih,
          kriterId: istisna.kriterId,
          deger: istisna.deger,
          // Paketin dönemi yazılır (tests/mobil-zarf "zarfın dönemi esas alınır" kilitler). OA74:
          // 1. dönem kapandıysa etiket bir sonraki yüklemede normalleştir'de tarihe onarılır; işlenen
          // gün hesapları (gunDonemiCozucu) zaten tarihi kullanır. Ekranın kullandığı yol
          // `telefonZarfiniUygula` etiketi yazarken onarır.
          donem: gun.donem,
        };
        eklenecek.push(yeni);
        indeks.set(anahtar(ogrenciId, gun.tarih, istisna.kriterId), yeni);
        sonuc.yazilan++;
        continue;
      }

      if (mevcut.deger === istisna.deger) continue; // idempotent

      sonuc.cakisan++;
      sonuc.cakismalar.push({
        ogrenciId, sinifId: gun.sinifId, tarih: gun.tarih, kriterId: istisna.kriterId,
        telefonDeger: istisna.deger, bilgisayarDeger: mevcut.deger,
      });
      if (cakismaKarari === "telefonKazanir") {
        guncellenecek.set(mevcut.id, istisna.deger);
        sonuc.yazilan++;
      }
    }

    // İstisna listesi boş olsa da gün "kontrol edildi" sayılır.
    if (!islendi.some((g) => g.sinifId === gun.sinifId && g.tarih === gun.tarih)) {
      islendi = [...islendi, { sinifId: gun.sinifId, tarih: gun.tarih }];
      sonuc.isaretlenenGun++;
    }
  }

  if (eklenecek.length || guncellenecek.size) {
    kayitlar = kayitlar.map((k) =>
      guncellenecek.has(k.id) ? { ...k, deger: guncellenecek.get(k.id)! } : k,
    );
    kayitlar = [...kayitlar, ...eklenecek];
  }

  try {
    db.gunlukKayitlar = kayitlar;
    db.sonGunlukId = sonId;
    db.gunlukIslendi = islendi;
    kaydet(db);
  } catch (err) {
    db.gunlukKayitlar = oncekiKayitlar;
    db.sonGunlukId = oncekiSonId;
    db.gunlukIslendi = oncekiIslendi;
    throw err;
  }

  return sonuc;
}

/** Bir sınıf+günü "kontrol edildi" olarak işaretler — istisna olsun ya da
 *  olmasın. gunlukKaydet çağrılan her seferde de tetiklenir (bkz.
 *  modules/hizli-isleme/hooks/useSinifIsleme.ts::kaydet). Idempotent. */
export function gunuIsaretle(sinifId: number, tarih: string, ders?: string): void {
  const yapilmadiVar = !!dersYapilmadiGetir(sinifId, tarih);
  const yeniIz = islendiIziYaz(db.gunlukIslendi, sinifId, tarih, ders); // OA73: günün dersi
  if (yeniIz === db.gunlukIslendi && !yapilmadiVar) return;
  const onceki = db.gunlukIslendi;
  const oncekiY = db.dersYapilmadi;
  try {
    db.gunlukIslendi = yeniIz;
    // Öğretmen o günü işlediyse ders yapılmıştır — eski "yapılmadı" işareti kalkar.
    if (yapilmadiVar) db.dersYapilmadi = db.dersYapilmadi.filter((d) => !(d.sinifId === sinifId && d.tarih === tarih));
    kaydet(db);
  } catch (err) {
    db.gunlukIslendi = onceki;
    db.dersYapilmadi = oncekiY;
    throw err;
  }
}

// ─── Köprüden gelen e-Okul verisi (Faz 3) ───────────────────────────────────

/** Köprüden gelen HAM devamsızlığı Okul No ile eşleyip yazar. Eşleşmeyen atlanır.
 *  Dönüş: { yazilan, atlanan } sayıları. */
export function devamsizlikYazHam(ham: EokulDevamsizlikHam[]): { yazilan: number; atlanan: number } {
  const noMap = new Map(db.ogrenciler.map((o) => [String(o.no), o.id] as const));
  const cevrilen: Devamsizlik[] = [];
  const eslesmeyen: EslesmeyenKayit[] = [];
  for (const h of ham) {
    const ogrenciId = noMap.get(String(h.okulNo));
    if (ogrenciId == null) {
      eslesmeyen.push({
        kaynak: "eokul-no",
        okulNo: String(h.okulNo),
        adSoyad: h.adSoyad,
        neden: "Okul numarası uygulamadaki öğrencilerle eşleşmedi.",
        oneriler: ogrenciOnerileri(h.adSoyad, h.okulNo),
      });
      continue;
    }
    cevrilen.push({
      ogrenciId,
      ozurluGun: h.ozurluGun,
      ozursuzGun: h.ozursuzGun,
      gec: h.gec,
      toplamGun: h.toplamGun,
    });
  }
  if (cevrilen.length) {
    devamsizlikYaz(cevrilen);
    logEkle({ kaynak: "eokul", seviye: "bilgi", baslik: "Devamsızlık çekildi", mesaj: `${cevrilen.length} öğrenci güncellendi.` });
  }
  eslesmeLogu("eokul", "Devamsızlık eşleşmeyenleri", `${eslesmeyen.length} devamsızlık satırı öğrenciyle eşleşmedi.`, eslesmeyen);
  return { yazilan: cevrilen.length, atlanan: eslesmeyen.length };
}

/** Eklenti köprüsünden gelen devamsızlık kayıtlarını yazar (Okul No → ogrenciId). */
export function devamsizlikYaz(kayitlar: Devamsizlik[]): void {
  const onceki = db.devamsizlik;
  let calisan = db.devamsizlik;
  for (const d of kayitlar) {
    const i = calisan.findIndex((x) => x.ogrenciId === d.ogrenciId);
    calisan = i >= 0 ? calisan.map((x, idx) => (idx === i ? d : x)) : [...calisan, d];
  }
  try {
    db.devamsizlik = calisan;
    senkronIsaretle("eokul");
    kaydet(db);
  } catch (err) {
    db.devamsizlik = onceki;
    throw err;
  }
}

/** Köprüden gelen HAM sınav notlarını Okul No ile eşleyip yazar. Öğrencinin eski
 *  sınavları temizlenip yenileri yazılır. Dönüş: { yazilan, atlanan } öğrenci sayısı. */
export interface SinavCakismaKaydi {
  ogrenciId: number;
  adSoyad: string;
  ders: string;
  ad: string;
  eskiPuan: SinavNotu["puan"];
  yeniPuan: SinavNotu["puan"];
  /** OA95: Edebiyat Y/D/K parçaları — çakışma çözülünce kaybolmasın. */
  yeniDetay?: SinavNotu["detay"];
  donem: 1 | 2;
}

/** Paketi dönem bilgisi taşımayan öğrenci — hangi döneme yazılacağı öğretmene
 *  sorulana kadar YAZILMAZ (bkz. DonemBelirsizBanner, donemBelirsizNotlariCoz). */
export interface DonemBelirsizKaydi {
  okulNo: string;
  ogrenciId: number;
  adSoyad: string;
  ders: string;
  notlar: { ad: string; puan: SinavNotu["puan"] }[];
}

export interface NotYazSonucu {
  yazilan: number;
  atlanan: number;
  // "elle" kaynaklı bir notun üstüne sormadan yazılmayan, karar bekleyen satırlar.
  cakisan: SinavCakismaKaydi[];
  // Paket dönem taşımadığı için hiç yazılmayan, karar bekleyen satırlar.
  donemBelirsiz: DonemBelirsizKaydi[];
}

/** sinavYazHam/performansYazHam ortak mantığı: paketin dönemi esastır (uygulamanın
 *  aktif dönemi değil). Eksikse SESSİZCE VARSAYILMAZ — MASTER Kural 3 ("hiçbir
 *  kritik karar otomatik verilmez"): satır hiç yazılmadan donemBelirsiz'e
 *  eklenir, öğretmen DonemBelirsizBanner'dan dönemi seçince
 *  donemBelirsizNotlariCoz ile (bu fonksiyondan, dönem artık sabitlenmiş olarak)
 *  yeniden yazılır. "elle" kaynaklı bir nota denk gelen satır da YAZILMAZ,
 *  cakisan'a eklenir — çağıran taraf (bridge.ts) toplu onay bekletir (bkz.
 *  notCakismalariniCoz). */
function notlariYazHam(
  hedef: SinavNotu[],
  ham: Array<{ okulNo: string; adSoyad: string; ders: string; notlar: { ad: string; puan: SinavNotu["puan"]; detay?: SinavNotu["detay"] }[]; donem?: 1 | 2 }>,
): { yeniHedef: SinavNotu[]; sonuc: NotYazSonucu } {
  const noMap = new Map(db.ogrenciler.map((o) => [String(o.no), o.id] as const));
  const guncelDurum = db.donemDurumu;
  let yazilan = 0;
  let kapanmisDonemeYazilan = 0;
  const eslesmeyen: EslesmeyenKayit[] = [];
  const cakisan: SinavCakismaKaydi[] = [];
  const donemBelirsiz: DonemBelirsizKaydi[] = [];
  let calisan = hedef;
  for (const h of ham) {
    const ders = h.ders.replace(/\s+/g, " ").trim();
    if (!ders) continue;
    const ogrenciId = noMap.get(String(h.okulNo));
    if (ogrenciId == null) {
      eslesmeyen.push({
        kaynak: "eokul-no",
        okulNo: String(h.okulNo),
        adSoyad: h.adSoyad,
        neden: "Okul numarası uygulamadaki öğrencilerle eşleşmedi.",
        oneriler: ogrenciOnerileri(h.adSoyad, h.okulNo),
      });
      continue;
    }
    const donem = h.donem;
    if (donem == null) {
      donemBelirsiz.push({ okulNo: String(h.okulNo), ogrenciId, adSoyad: h.adSoyad, ders, notlar: h.notlar });
      continue;
    }
    if ((donem === 1 && guncelDurum.d1KapanisZamani) || (donem === 2 && guncelDurum.d2KapanisZamani)) {
      // Paket açıkça belirtiyor ama o dönem kapanış sihirbazıyla zaten kapatılmış —
      // engellenmez (kapalı dönem "yumuşak kilit"), sadece bilgi düşülür.
      kapanmisDonemeYazilan++;
    }
    const mevcutBuDonem = calisan.filter((x) => x.ogrenciId === ogrenciId && x.donem === donem && normMetin(x.ders ?? "") === normMetin(ders));
    const digerKayitlar = calisan.filter((x) => !(x.ogrenciId === ogrenciId && x.donem === donem && normMetin(x.ders ?? "") === normMetin(ders)));
    const yeniSatirlar: SinavNotu[] = [];
    for (const n of h.notlar) {
      const eski = mevcutBuDonem.find((x) => x.ad === n.ad);
      if (eski?.kaynak === "elle" && eski.puan !== n.puan) {
        cakisan.push({ ogrenciId, adSoyad: h.adSoyad, ders, ad: n.ad, eskiPuan: eski.puan, yeniPuan: n.puan, ...(n.detay ? { yeniDetay: { ...n.detay } } : {}), donem });
        yeniSatirlar.push(eski); // karar bekleniyor — elle değer korunur
        continue;
      }
      // OA91: Edebiyat Y/D/K parçaları (yalnız varsa; puan yine e-Okul'un ortalaması).
      yeniSatirlar.push({ ogrenciId, ders, ad: n.ad, puan: n.puan, donem, kaynak: "senkron", ...(n.detay ? { detay: { ...n.detay } } : {}) });
    }
    // OA93: e-Okul paketinde HİÇ olmayan, öğretmenin elle girdiği sınav (ör. henüz e-Okul'a
    // girilmemiş "3.Sınav") eskiden sessizce siliniyordu. Elle not sorulmadan ezilmez/silinmez.
    const paketAdlari = new Set(h.notlar.map((n) => n.ad));
    for (const eski of mevcutBuDonem) {
      if (eski.kaynak === "elle" && !paketAdlari.has(eski.ad)) yeniSatirlar.push(eski);
    }
    calisan = [...digerKayitlar, ...yeniSatirlar];
    yazilan++;
  }
  senkronIsaretle("eokul");
  if (yazilan) logEkle({ kaynak: "eokul", seviye: "bilgi", baslik: "Notlar çekildi", mesaj: `${yazilan} öğrenci güncellendi.` });
  if (donemBelirsiz.length) logEkle({ kaynak: "eokul", seviye: "uyari", baslik: "Dönem soruldu", mesaj: `${donemBelirsiz.length} öğrencide paket dönem bilgisi taşımıyordu; öğretmene soruldu, dönem seçilene kadar yazılmadı.` });
  if (kapanmisDonemeYazilan) logEkle({ kaynak: "eokul", seviye: "bilgi", baslik: "Kapanış sonrası veri işlendi", mesaj: `Kapanış sonrası kapalı bir döneme ${kapanmisDonemeYazilan} kayıt işlendi.` });
  eslesmeLogu("eokul", "Not eşleşmeyenleri", `${eslesmeyen.length} satır öğrenciyle eşleşmedi.`, eslesmeyen);
  return { yeniHedef: calisan, sonuc: { yazilan, atlanan: eslesmeyen.length, cakisan, donemBelirsiz } };
}

/** Not/performans sayfası doğrudan çekilirse de seçili dersi öğrencinin
 * sınıfına ekler. Böylece öğretmen aynı ders için ayrıca "öğrenci listesini
 * çek" adımını çalıştırmak zorunda kalmaz. Yeni dizi/nesne üretir; çağıran
 * fonksiyon kaydet başarısızlığında sınıfları da geri alır. */
function notDersleriniSiniflaraBirleştir(
  ham: Array<{ okulNo: string; ders: string }>,
): Sinif[] {
  const noSinif = new Map(db.ogrenciler.map((o) => [String(o.no), o.sinifId] as const));
  const eklenecek = new Map<number, string[]>();
  for (const h of ham) {
    const sinifId = noSinif.get(String(h.okulNo));
    const ders = h.ders.replace(/\s+/g, " ").trim();
    if (sinifId == null || !ders) continue;
    const liste = eklenecek.get(sinifId) ?? [];
    if (!liste.some((d) => normMetin(d) === normMetin(ders))) liste.push(ders);
    eklenecek.set(sinifId, liste);
  }
  if (!eklenecek.size) return db.siniflar;
  return db.siniflar.map((sinif) => {
    const yeniDersler = eklenecek.get(sinif.id);
    if (!yeniDersler?.length) return sinif;
    const dersler = sinifDersleri(sinif);
    for (const ders of yeniDersler) {
      if (!dersler.some((d) => normMetin(d) === normMetin(ders))) dersler.push(ders);
    }
    return { ...sinif, brans: dersler[0] ?? sinif.brans, dersler };
  });
}

/** Öğretmen DonemBelirsizBanner'dan dönemi seçince çağrılır: bekleyen
 *  kayıtları o dönem SABİTLENMİŞ olarak notlariYazHam'dan geçirir (elle
 *  çakışma koruması burada da geçerli — dönüşteki cakisan'ı çağıran taraf
 *  yine sinavCakismasiEkle'ye eklemeli). */
export function donemBelirsizNotlariCoz(
  hedef: "sinav" | "performans",
  kayitlar: DonemBelirsizKaydi[],
  donem: 1 | 2,
): NotYazSonucu {
  const hedefDizi = hedef === "sinav" ? db.sinavNotlari : db.performansNotlari;
  const ham = kayitlar.map((k) => ({ okulNo: k.okulNo, adSoyad: k.adSoyad, ders: k.ders, notlar: k.notlar, donem }));
  const { yeniHedef, sonuc } = notlariYazHam(hedefDizi, ham);
  const oncekiSinav = db.sinavNotlari;
  const oncekiPerformans = db.performansNotlari;
  const oncekiSiniflar = db.siniflar;
  try {
    if (hedef === "sinav") db.sinavNotlari = yeniHedef;
    else db.performansNotlari = yeniHedef;
    db.siniflar = notDersleriniSiniflaraBirleştir(ham);
    kaydet(db);
  } catch (err) {
    db.sinavNotlari = oncekiSinav;
    db.performansNotlari = oncekiPerformans;
    db.siniflar = oncekiSiniflar;
    throw err;
  }
  return sonuc;
}

export function sinavYazHam(ham: EokulSinavHam[]): NotYazSonucu {
  const { yeniHedef, sonuc } = notlariYazHam(db.sinavNotlari, ham);
  const onceki = db.sinavNotlari;
  const oncekiSiniflar = db.siniflar;
  try {
    db.sinavNotlari = yeniHedef;
    db.siniflar = notDersleriniSiniflaraBirleştir(ham);
    kaydet(db);
  } catch (err) {
    db.sinavNotlari = onceki;
    db.siniflar = oncekiSiniflar;
    throw err;
  }
  return sonuc;
}

/**
 * Öğretmenin Sınav Analizi ekranında ELLE girdiği puanları kalıcı yazar
 * (kaynak "elle"). NEDEN: eskiden bu puanlar hiçbir yere kaydedilmiyordu —
 * sınıf/sınav değişince kayboluyor, eklentisi olmayan öğretmenin performans
 * notunda "Sınav" kalemi hep boş kalıyordu. SinavNotu.kaynak alanı bu akış
 * için zaten hazırlanmıştı: e-Okul senkronu "elle" notun üstüne sormadan yazmaz.
 *
 * Kurallar: puan null (boş) → o öğrencinin bu sınavdaki ELLE notu silinir;
 * senkrondan gelen nota boş bırakarak dokunulmaz (yanlışlıkla silinmesin).
 * Aynı değer zaten varsa kaynak değiştirilmez (senkron not "elle" olmasın).
 */
export function sinavNotlariElleKaydet(
  ders: string,
  donem: 1 | 2,
  sinavAd: string,
  girisler: Array<{ ogrenciId: number; puan: number | "G" | "K" | null }>,
): { yazilan: number; silinen: number } {
  const ad = sinavAd.trim();
  if (!ad) throw new Error("Sınav adı boş olamaz.");
  const eslesir = (n: SinavNotu, ogrenciId: number) =>
    n.ogrenciId === ogrenciId && n.ad === ad && (n.donem ?? 1) === donem && normMetin(n.ders ?? "") === normMetin(ders);
  let dizi = db.sinavNotlari;
  let yazilan = 0, silinen = 0;
  for (const g of girisler) {
    const mevcut = dizi.find((n) => eslesir(n, g.ogrenciId));
    if (g.puan === null) {
      if (mevcut && mevcut.kaynak === "elle") { dizi = dizi.filter((n) => n !== mevcut); silinen++; }
      continue;
    }
    if (mevcut && mevcut.puan === g.puan) continue;
    const yeni: SinavNotu = { ogrenciId: g.ogrenciId, ders, ad, puan: g.puan, donem, kaynak: "elle" };
    dizi = mevcut ? dizi.map((n) => (n === mevcut ? yeni : n)) : [...dizi, yeni];
    yazilan++;
  }
  if (!yazilan && !silinen) return { yazilan, silinen };
  const onceki = db.sinavNotlari;
  try {
    db.sinavNotlari = dizi;
    logEkle({ kaynak: "sistem", seviye: "bilgi", baslik: "Sınav puanları elle kaydedildi", mesaj: `${ders} · ${ad} (${donem}. dönem): ${yazilan} yazıldı${silinen ? `, ${silinen} silindi` : ""}.` });
    kaydet(db);
  } catch (err) {
    db.sinavNotlari = onceki;
    throw err;
  }
  return { yazilan, silinen };
}

/** OA91: Yazılı/Dinleme/Konuşma'lı sınavda (Edebiyat) Sınav Analizi yalnız YAZILI parçasını düzenler.
 *  Resmî not (e-Okul ortalaması, `puan`) ve diğer parçalar DEĞİŞMEZ — performansa ortalama girmeye devam
 *  eder. e-Okul notu olmayan öğrenciye yazılamaz (ortalaması yok): `yazilamayan` sayılır. */
export function sinavYaziliElleKaydet(
  ders: string,
  donem: 1 | 2,
  sinavAd: string,
  girisler: Array<{ ogrenciId: number; puan: number | "G" | "K" | null }>,
): { yazilan: number; silinen: number; yazilamayan: number } {
  const ad = sinavAd.trim();
  const eslesir = (n: SinavNotu, ogrenciId: number) =>
    n.ogrenciId === ogrenciId && n.ad === ad && (n.donem ?? 1) === donem && normMetin(n.ders ?? "") === normMetin(ders);
  let dizi = db.sinavNotlari;
  let yazilan = 0, silinen = 0, yazilamayan = 0;
  for (const g of girisler) {
    const mevcut = dizi.find((n) => eslesir(n, g.ogrenciId));
    if (!mevcut) { if (g.puan !== null) yazilamayan++; continue; }
    const eski = mevcut.detay?.yazili;
    if ((eski ?? null) === g.puan) continue;
    const { yazili: _y, ...digerParcalar } = mevcut.detay ?? {};
    void _y;
    const detay = g.puan === null ? digerParcalar : { ...digerParcalar, yazili: g.puan };
    const yeni: SinavNotu = { ...mevcut, detay };
    dizi = dizi.map((n) => (n === mevcut ? yeni : n));
    if (g.puan === null) silinen++; else yazilan++;
  }
  if (!yazilan && !silinen) return { yazilan, silinen, yazilamayan };
  const onceki = db.sinavNotlari;
  try {
    db.sinavNotlari = dizi;
    logEkle({ kaynak: "sistem", seviye: "bilgi", baslik: "Yazılı puanları elle kaydedildi", mesaj: `${ders} · ${ad} (${donem}. dönem): ${yazilan} yazıldı${silinen ? `, ${silinen} silindi` : ""}. Ortalama (resmî not) değişmedi.` });
    kaydet(db);
  } catch (err) {
    db.sinavNotlari = onceki;
    throw err;
  }
  return { yazilan, silinen, yazilamayan };
}

/** OA92: e-Okul'dan Yazılı/Dinleme/Konuşma'lı (Edebiyat) sınav notu hiç geldi mi? Gelmediyse
 *  Performans Ayarları "yalnız Yazılı" seçimini hiç göstermez (diğer branşların kafası karışmasın). */
export function parcaliSinavVarMi(): boolean {
  return db.sinavNotlari.some((n) => !!n.detay);
}

export function sinavlariGetir(ogrenciId: number, ders?: string): SinavNotu[] {
  const t = T();
  t.sinavByOgrenci ??= grupla(db.sinavNotlari, (x) => x.ogrenciId);
  return (t.sinavByOgrenci.get(ogrenciId) ?? []).filter((x) => !ders || normMetin(x.ders ?? "") === normMetin(ders));
}

/** e-Okul'dan çekilen ders içi performans notlarını yazar (No ile eşleşir). */
export function performansYazHam(ham: EokulPerformansHam[]): NotYazSonucu {
  const { yeniHedef, sonuc } = notlariYazHam(db.performansNotlari, ham);
  const onceki = db.performansNotlari;
  const oncekiSiniflar = db.siniflar;
  try {
    db.performansNotlari = yeniHedef;
    db.siniflar = notDersleriniSiniflaraBirleştir(ham);
    kaydet(db);
  } catch (err) {
    db.performansNotlari = onceki;
    db.siniflar = oncekiSiniflar;
    throw err;
  }
  return sonuc;
}

/** `donem` verilmezse TÜM dönemlerin notu döner (ör. Öğrenci Kartı geçmiş
 *  gösterimi); e-Okul'a YAZILACAK bir slotu önizlerken (Performans Aktar/
 *  Dağıtım) mutlaka `donem` verilmeli — yoksa başka dönemin notu karışır
 *  (aynı "1.Performans" adı her dönemde yeniden kullanılır). */
export function ogrenciPerformanslari(ogrenciId: number, donem?: 1 | 2, ders?: string): SinavNotu[] {
  return db.performansNotlari.filter((x) => x.ogrenciId === ogrenciId
    && (donem == null || (x.donem ?? 1) === donem)
    && (!ders || normMetin(x.ders ?? "") === normMetin(ders)));
}

/** Bekleyen sınav/performans notu çakışmalarını sonuçlandırır (toplu karar —
 *  MASTER Kural 3: hiçbir kritik karar otomatik verilmez). "senkron": senkron
 *  değeri şimdi yazılır. "elle-koru": hiçbir şey değişmez (elle değer zaten duruyor). */
export function notCakismalariniCoz(
  hedef: "sinav" | "performans",
  cakismalar: SinavCakismaKaydi[],
  karar: "senkron" | "elle-koru",
): void {
  if (karar === "elle-koru" || !cakismalar.length) return;
  const dizi = hedef === "sinav" ? "sinavNotlari" : "performansNotlari";
  const onceki = db[dizi];
  let calisan = db[dizi];
  for (const c of cakismalar) {
    calisan = [
      ...calisan.filter((x) => !(x.ogrenciId === c.ogrenciId && x.donem === c.donem && x.ad === c.ad && normMetin(x.ders ?? "") === normMetin(c.ders))),
      { ogrenciId: c.ogrenciId, ders: c.ders, ad: c.ad, puan: c.yeniPuan, donem: c.donem, kaynak: "senkron" as const, ...(c.yeniDetay ? { detay: { ...c.yeniDetay } } : {}) },
    ];
  }
  try {
    db[dizi] = calisan;
    logEkle({ kaynak: "eokul", seviye: "bilgi", baslik: "Sınav notu çakışması çözüldü", mesaj: `${cakismalar.length} kayıt senkron değeriyle güncellendi.` });
    kaydet(db);
  } catch (err) {
    db[dizi] = onceki;
    throw err;
  }
}

/** Bir sınıfta (seçili dönemde) çekilmiş performans slot adları (ör. "1.Performans"). */
export function sinifPerformansAdlari(sinifId: number, donem: 1 | 2, ders?: string): string[] {
  const set = new Set<string>();
  for (const o of db.ogrenciler.filter((x) => x.sinifId === sinifId))
    for (const p of ogrenciPerformanslari(o.id, donem, ders)) set.add(p.ad);
  return [...set].sort();
}

/** Bir kaynağın son senkron zamanını günceller (MASTER: veri tazeliği görünür). */
export function senkronIsaretle(kaynak: string): void {
  const onceki = db.senkronLog;
  try {
    senkronIsaretleBellekte(kaynak);
    kaydet(db);
  } catch (err) {
    db.senkronLog = onceki;
    throw err;
  }
}

/** `senkronIsaretle`nin kaydetmeyen hâli (bkz. yanYazimOnceki). */
function senkronIsaretleBellekte(kaynak: string): void {
  const zaman = simdiYerelISO();
  const i = db.senkronLog.findIndex((x) => x.kaynak === kaynak);
  db.senkronLog =
    i >= 0
      ? db.senkronLog.map((x, idx) => (idx === i ? { ...x, zaman } : x))
      : [...db.senkronLog, { kaynak, zaman }];
}

export function senkronGetir(kaynak: string): string | null {
  // Sınıf yokken "son veri alma" kaydı ANLAMSIZ: öğretmen sınıf/öğrencileri silip
  // temiz başladığında eski tarihler ("9 gün önce") yeni kurulumu dolu gösteriyordu.
  if (db.siniflar.length === 0) return null;
  return db.senkronLog.find((x) => x.kaynak === kaynak)?.zaman ?? null;
}

// ─── Ayarlar: kriterler (Kademe 1) ──────────────────────────────────────────

export function kriterEkle(k: Omit<Kriter, "id">): Kriter {
  // DİKKAT: "önceki" sayaç ARTIRMADAN ÖNCE yakalanmalı — aksi halde geri
  // almada sayaç zaten artmış değerine "geri yüklenir", bir sonraki id boşa
  // atlar (kritik değil ama sinsi bir tutarsızlık).
  const oncekiKriterler = db.kriterler;
  const oncekiSonKriterId = db.sonKriterId;
  const yeni: Kriter = { ...k, id: ++db.sonKriterId };
  try {
    db.kriterler = [...db.kriterler, yeni];
    kaydet(db);
    return yeni;
  } catch (err) {
    db.kriterler = oncekiKriterler;
    db.sonKriterId = oncekiSonKriterId;
    throw err;
  }
}

export function kriterGuncelle(id: number, alanlar: Partial<Omit<Kriter, "id">>): void {
  const k = db.kriterler.find((x) => x.id === id);
  if (!k) { kaydet(db); return; }
  const eski = { ...k };
  Object.assign(k, alanlar);
  try {
    kaydet(db);
  } catch (err) {
    Object.assign(k, eski);
    throw err;
  }
}

export function kriterSil(id: number): void {
  const onceki = db.kriterler;
  try {
    db.kriterler = db.kriterler.filter((x) => x.id !== id);
    kaydet(db);
  } catch (err) {
    db.kriterler = onceki;
    throw err;
  }
}

export function kriterKullanimSayisi(id: number): number {
  return db.gunlukKayitlar.filter((g) => g.kriterId === id).length;
}

// ─── Dönem Yaşam Döngüsü: durum makinesi ────────────────────────────────────
// D1_ACIK -[1. dönemi kapat]-> D2_ACIK (D1 kapalı) -[2. dönemi kapat]-> YIL_SONU.
// Geçiş YALNIZ kapanış sihirbazı (donemGecisiUygula) ile olur — MASTER Kural 3:
// hiçbir kritik karar otomatik verilmez, serbest bir "dönem değiştir" API'si YOK.

export function donemDurumuGetir(): DonemDurumu {
  return db.donemDurumu;
}

/** Dönem seçtirmeyen ekranların (Bugün, Sınıf Listesi, Öğrenci Kartı risk
 *  göstergesi) varsayılan dönemi. YIL_SONU'da null döner — çağıran taraf bunu
 *  "yil" (Yıl Sonu birleştirme) olarak yorumlamalı, tahmini bir dönem UYDURMAZ. */
/** Bir ders gününün ait olduğu dönem: 1. dönem kapandıysa kapanış gününe kadar 1, sonrası 2.
 *  Denetim (2026-10): eskiden kayda "şu anki" dönem yazılıyordu → 2. dönemde işlenen
 *  unutulmuş bir 1. dönem günü 2. döneme sayılıyordu. */
export function tarihinDonemi(tarih: string): 1 | 2 {
  const ilk = ikinciDonemIlkGunu(db.donemDurumu);
  if (ilk) return tarih < ilk ? 1 : 2;
  return db.donemDurumu.aktifDonem ?? 1;
}

/** OA94 (kapanış sihirbazı): `bas` günü ve sonrasında işlenmiş ders sayısı (sınıf+gün). */
export function tarihtenSonraIslenenDers(bas: string): number {
  const anah = new Set<string>();
  const gunler = new Set<string>();
  for (const g of db.gunlukIslendi) if (g.tarih >= bas) { anah.add(`${g.sinifId}|${g.tarih}`); gunler.add(g.tarih); }
  for (const k of db.gunlukKayitlar) if (k.tarih >= bas && !gunler.has(k.tarih)) { anah.add(`?|${k.tarih}`); gunler.add(k.tarih); }
  return anah.size;
}

/** OA94: 2. dönemin ilk günü — sihirbazda seçilen başlangıç, yoksa 1. dönem kapanış gününün ertesi.
 *  1. dönem kapanmadıysa null. */
export function ikinciDonemIlkGunu(d?: DonemDurumu | null): string | null {
  if (!d?.d1KapanisZamani) return null;
  if (d.d2BaslangicTarihi && /^\d{4}-\d{2}-\d{2}$/.test(d.d2BaslangicTarihi)) return d.d2BaslangicTarihi;
  const [y, a, g] = d.d1KapanisZamani.slice(0, 10).split("-").map(Number);
  const t = new Date(y, a - 1, g + 1);
  return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, "0")}-${String(t.getDate()).padStart(2, "0")}`;
}

/** OA94: bu günün işlenmemiş dersi "unutuldu" diye sorulur mu? Yıl sonundan sonra hiç; 2. dönemde
 *  kapanmış 1. dönemin (kapanış günü dahil) günleri sorulmaz. */
export function islenmemisSorulurMu(tarih: string): boolean {
  const d = db.donemDurumu;
  if (d.aktifDonem === null) return false;
  const ilk = ikinciDonemIlkGunu(d);
  // 1. dönem kapandıysa 2. dönem başlangıcından önceki günler (kapanmış dönem + yarıyıl tatili) sorulmaz.
  return !(d.aktifDonem === 2 && ilk && tarih < ilk);
}

/** OA94: bu gün KAPANMIŞ bir döneme mi yazılır (yumuşak kilit uyarısı için)? */
export function tarihKapaliDonemde(tarih: string): 1 | 2 | null {
  const d = db.donemDurumu;
  const donem = tarihinDonemi(tarih);
  if (donem === 1 && d.d1KapanisZamani) return 1;
  if (donem === 2 && d.d2KapanisZamani) return 2;
  return null;
}

export function aktifDonemGetir(): 1 | 2 | null {
  return db.donemDurumu.aktifDonem;
}

/** Yalnız kapanış/yıl geçişi sihirbazı çağırır. Sihirbaz dışında dönem
 *  değiştiren başka bir yol YOK (bkz. modules/ayarlar DonemKapanisSihirbazi). */
export function donemGecisiUygula(yeni: DonemDurumu): void {
  const onceki = db.donemDurumu;
  // OA94: kapanmış dönem ikinci kez kapatılamaz (sınır kayar, bütün 2. dönem 1. döneme yazılırdı).
  // Yeni yıl ({ aktifDonem: 1 }) iki kapanışı birlikte temizler — o serbest.
  if ((onceki.d1KapanisZamani && yeni.d1KapanisZamani && yeni.d1KapanisZamani !== onceki.d1KapanisZamani)
    || (onceki.d2KapanisZamani && yeni.d2KapanisZamani && yeni.d2KapanisZamani !== onceki.d2KapanisZamani)) {
    throw new Error("Bu dönem zaten kapatıldı.");
  }
  const oncekiGunluk = db.gunlukKayitlar;
  const oncekiOdev = db.odevler;
  try {
    db.donemDurumu = yeni;
    // OA94: dönem sınırı değiştiyse (1. dönem kapandı / 2. dönem başlangıcı seçildi) günlük kayıtlar ve
    // ödevler TARİHLERİNDEN yeniden dönemlenir — kapanış öncesi işlenmiş 2. dönem dersleri 2. döneme geçer.
    if (ikinciDonemIlkGunu(yeni) !== ikinciDonemIlkGunu(onceki)) {
      db.gunlukKayitlar = gunlukDonemleriniTarihtenOnar(db.gunlukKayitlar, yeni);
      const ilk = ikinciDonemIlkGunu(yeni);
      if (ilk && db.odevler.some((o) => o.donem !== (o.tarih < ilk ? 1 : 2))) {
        db.odevler = db.odevler.map((o) => { const d: 1 | 2 = o.tarih < ilk ? 1 : 2; return o.donem === d ? o : { ...o, donem: d }; });
      }
    }
    veriDegisti();
    kaydet(db);
  } catch (err) {
    db.donemDurumu = onceki;
    db.gunlukKayitlar = oncekiGunluk;
    db.odevler = oncekiOdev;
    veriDegisti();
    throw err;
  }
}

/** Kapanış anının immutable fotoğrafı: mevcut kümülatif devamsızlık + MEBİ
 *  değerlerini tüm öğrenciler için dondurur. Sonradan güncellenmez/silinmez —
 *  devamsızlık/MEBİ dönem kırılımı (core/donem.ts) buradan türetilir. */
export function donemSnapshotAl(donem: 1 | 2): DonemSnapshot {
  // OA94: kapanmış dönemin fotoğrafı yeniden alınmaz (kırılım kapanıştaki değerden türetilir).
  if ((donem === 1 && db.donemDurumu.d1KapanisZamani) || (donem === 2 && db.donemDurumu.d2KapanisZamani)) throw new Error("Bu dönem zaten kapatıldı.");
  const ogrenciler: DonemSnapshotOgrenci[] = db.ogrenciler.map((o) => {
    const d = devamsizlikGetir(o.id);
    const m = mebiGetir(o.id);
    return {
      ogrenciId: o.id,
      ozurluGun: d.ozurluGun,
      ozursuzGun: d.ozursuzGun,
      mebiTamamlanan: m?.tamamlanan ?? 0,
      mebiToplam: m?.toplam ?? 0,
    };
  });
  const snapshot: DonemSnapshot = { id: crypto.randomUUID(), donem, zaman: simdiYerelISO(), ogrenciler };
  const onceki = db.donemSnapshotlar;
  try {
    db.donemSnapshotlar = [...db.donemSnapshotlar, snapshot];
    kaydet(db);
    return snapshot;
  } catch (err) {
    db.donemSnapshotlar = onceki;
    throw err;
  }
}

export function donemSnapshotlariGetir(): DonemSnapshot[] {
  return db.donemSnapshotlar;
}

export function donemSnapshotBul(donem: 1 | 2): DonemSnapshot | undefined {
  // Aynı dönem için birden çok snapshot teorik olarak alınmaz (sihirbaz tek
  // seferlik) ama en yenisini almak güvenli varsayılan.
  return [...db.donemSnapshotlar].reverse().find((s) => s.donem === donem);
}

/** OA94: e-Okul devamsızlığı YIL BOYU BİRİKİR (2. dönemde sıfırlanmaz). Döküm yalnız bilgi:
 *  1. dönem = kapanış fotoğrafı, 2. dönem = yıl toplamı − 1. dönem. Fotoğraf yoksa null (tahmin yok). */
export function devamsizlikDokumu(ogrenciId: number): { ozursuz: KirilimSonucu; ozurlu: KirilimSonucu } | null {
  const sn = db.donemDurumu.d1KapanisZamani ? donemSnapshotBul(1)?.ogrenciler.find((x) => x.ogrenciId === ogrenciId) : undefined;
  if (!sn) return null;
  const g = devamsizlikGetir(ogrenciId);
  return { ozursuz: kumulatifKirilimHesapla(g.ozursuzGun, sn.ozursuzGun), ozurlu: kumulatifKirilimHesapla(g.ozurluGun, sn.ozurluGun) };
}

/** OA94: dökümün tek satırlık metni (Kart ve rapor aynı cümleyi kullanır). */
export function devamsizlikDokumMetni(ogrenciId: number): string | null {
  const d = devamsizlikDokumu(ogrenciId);
  if (!d) return null;
  if (d.ozursuz.tutarsiz || d.ozurlu.tutarsiz) return `Yıl toplamı 1. dönem kapanışındakinden az (1. dönem: özürsüz ${d.ozursuz.d1}, özürlü ${d.ozurlu.d1}) — e-Okul'da 1. dönem sonradan düzeltilmiş olabilir`;
  return `1. dönem: özürsüz ${d.ozursuz.d1}, özürlü ${d.ozurlu.d1} · 2. dönemde eklenen: özürsüz ${d.ozursuz.d2}, özürlü ${d.ozurlu.d2}`;
}

/** Yeni Öğretim Yılı sihirbazının 2. adımı: HAM VERİYİ SİLMEZ/TAŞIMAZ — yalnızca
 *  "bu yıl şu an kapandı, D1/D2 snapshot'ları şunlardı" izini bırakır. */
export function yilArsiviEkle(yil: string): YilArsivi {
  const yeni: YilArsivi = {
    id: crypto.randomUUID(),
    yil,
    zaman: simdiYerelISO(),
    // OA95: yıl geçişi dönem kopyalarını SİLER; kimlik saklamak boşa işaret ederdi. Özet arşivin içinde durur.
    ozet: {
      sinifSayisi: db.siniflar.length,
      ogrenciSayisi: db.ogrenciler.length,
      d1Zaman: donemSnapshotBul(1)?.zaman,
      d2Zaman: donemSnapshotBul(2)?.zaman,
    },
  };
  const onceki = db.yilArsivleri;
  try {
    db.yilArsivleri = [...db.yilArsivleri, yeni];
    kaydet(db);
    return yeni;
  } catch (err) {
    db.yilArsivleri = onceki;
    throw err;
  }
}

export function yilArsivleriGetir(): YilArsivi[] {
  return db.yilArsivleri;
}

/** Tamamen boş bir Veritabani — GELİŞTİRME seed'i asla karışmaz (sıfırlama
 *  gerçekten boş başlamalı, test verisiyle değil). */
function bosVeri(): Veritabani {
  return {
    siniflar: [],
    ogrenciler: [],
    // Kriterler, ağırlıklar, davranış etiketi TANIMLARI ve yapılacaklar öğretmenin
    // YÖNTEMİDİR, öğrenci verisi değil — yeni yılda KORUNUR (2026-09 denetimi:
    // eskiden siliniyordu, öğretmen her Eylül sistemini baştan kuruyordu).
    kriterler: db.kriterler,
    devamsizlik: [],
    eksikOdev: {},
    gunlukKayitlar: [],
    sonGunlukId: 0,
    gunlukIslendi: [],
    dersYapilmadi: [],
    gelmedi: [],
    subeTasimalari: [],
    donemDurumu: db.donemDurumu,
    donemSnapshotlar: [],
    yilArsivleri: db.yilArsivleri,
    donemAgirliklari: db.donemAgirliklari,
    // OA94: risk eşikleri de öğretmenin yöntemi — yeni yılda korunur.
    ...(db.riskEsikleri ? { riskEsikleri: db.riskEsikleri } : {}),
    sinavNotlari: [],
    performansNotlari: [],
    davranisEtiketleri: db.davranisEtiketleri,
    ogrenciEtiketleri: [],
    dersProgrami: [],
    tutanaklar: [],
    gorevler: db.gorevler,
    // Kimlik sayaçları yeni yılda da ilerler (eski yılın artığı hiçbir yerde yeni öğrenciye bağlanmasın).
    sonSinifId: db.sonSinifId,
    sonOgrenciId: db.sonOgrenciId,
    sonGorevId: db.sonGorevId,
    mebiDurum: [],
    mebiKonuDurum: [],
    mebiEnvanter: [],
    mebiOdevMeta: [],
    kazanimTanimlari: [],
    kazanimIslenmeKayitlari: {},
    odevler: [],
    odevPuanlari: [],
    sonKriterId: db.sonKriterId,
    sonOdevId: 0,
    sonEtiketId: db.sonEtiketId,
    sonOgrenciEtiketId: 0,
    sonDersId: 0,
    sonTutanakId: 0,
    senkronLog: [],
    islemGunlugu: [],
    sonLogId: 0,
    mebiAdEslemeleri: [],
    kitaplar: db.kitaplar,
    kirpmalar: db.kirpmalar,
    kitapNotlari: db.kitapNotlari,
    foyler: [],
    // Sınavlar yıl geçişinde KORUNUR: föy sınıfa/döneme bağlıdır ama sınav
    // kağıdı öğrenci verisi içermez ve yıldan yıla yeniden kullanılan
    // materyaldir (kitaplar/soru havuzu gibi).
    sinavlar: db.sinavlar,
    ayarlar: db.ayarlar,
  };
}

/** Hiç kriter yoksa önerilen seti, hiç ağırlık yoksa önerilen ağırlıkları ekler.
 *  Eski sürümle kurulup kriterleri boş kalan öğretmen için tek tık çözüm. */
export function varsayilanKriterleriYukle(): { kriter: number; agirlik: number } {
  const oncekiK = db.kriterler, oncekiA = db.donemAgirliklari, oncekiId = db.sonKriterId;
  const sonuc = { kriter: 0, agirlik: 0 };
  try {
    if (db.kriterler.length === 0) {
      db.kriterler = VARSAYILAN_KRITERLER.map((k) => ({ ...k }));
      db.sonKriterId = Math.max(db.sonKriterId, ...db.kriterler.map((k) => k.id));
      sonuc.kriter = db.kriterler.length;
    }
    if (db.donemAgirliklari.length === 0) {
      db.donemAgirliklari = VARSAYILAN_AGIRLIKLAR.map((a) => ({ ...a }));
      sonuc.agirlik = db.donemAgirliklari.length;
    }
    if (sonuc.kriter || sonuc.agirlik) kaydet(db);
  } catch (err) {
    db.kriterler = oncekiK; db.donemAgirliklari = oncekiA; db.sonKriterId = oncekiId;
    throw err;
  }
  return sonuc;
}

/** Yeni Öğretim Yılı sihirbazının SON adımı: İçerik Hazırlama'daki kitaplar/
 *  kırpmalar/kitap notları (kitaplık + soru havuzunun temeli) HARİÇ sınıf,
 *  öğrenci ve bunlara bağlı TÜM veriyi (devamsızlık, ödev, tutanak, davranış
 *  etiketi, oturma planı, kazanım işleme, sınav/performans notu, günlük kayıt,
 *  dönem anlık görüntüleri, föyler) kalıcı olarak siler. GERİ DÖNÜŞÜ YOK —
 *  sihirbaz bu adımdan önce zorunlu tam yedek + riskli öğrenciler raporu alır.
 *  `yilArsivleri` (yıl geçişi izi) ve İçerik Hazırlama verisi korunur.
 *
 *  DİKKAT: burada silinen föy METADATA'sıdır. Föy İÇERİĞİ (gömülü JPEG'ler)
 *  IndexedDB'de durur ve repo senkron olduğu için buradan silinemez. Doğrudan
 *  çağırma — `lib/yilGecisi.ts::yilGecisiniTamamla` iki depoyu birlikte
 *  temizler; tek başına çağrılırsa içerikler yetim kalır. */
export function yeniYilIcinSifirla(): void {
  const onceki = db;
  try {
    db = bosVeri();
    veriDegisti();
    kaydet(db);
  } catch (err) {
    db = onceki;
    veriDegisti();
    throw err;
  }
}

/**
 * DENEME veri setini yükler (8 sınıf × 10 öğrenci + devamsızlık/not/ödev/etiket).
 *
 * NEDEN ELLE: `seed.ts` yalnız geliştirmede yükleniyor, yani paketlenmiş uygulama
 * boş açılıyor — bu DOĞRU, gerçek öğretmen sahte öğrenci görmemeli. Ama deneme
 * kullanıcısının bakacak bir şeyi olmalı. Bu yüzden demo veri üründe de var ama
 * yalnız Ayarlar'dan bilinçli bir tıklamayla geliyor.
 *
 * ÜZERİNE YAZAR, birleştirmez: yarı dolu bir veritabanına demo eklemek gerçek
 * kayıtlarla sahte kayıtları ayırt edilemez hâle getirirdi. Çağıran ekran bu
 * yüzden ONAY ve ZORUNLU YEDEK istiyor (yıl geçişi sihirbazının kalıbı).
 * İçerik Hazırlama depoları (kitap/föy/kırpma) SQLite dışında yaşıyor ve
 * buraya dokunulmuyor — demo veri onları ne siler ne doldurur.
 */
export async function demoVerisiniYukle(): Promise<void> {
  const demo = demoVeriUret();
  const onceki = db;
  try {
    db = {
      ...bosVeri(),
      ...demo,
      // Kriterler/ağırlıklar/etiket tanımları demo setinin dışında: onlar
      // seed'de tanımlı ve demo kayıtları bu id'lere BAĞLI (gunlukKayitlar.kriterId,
      // ogrenciEtiketleri.etiketId). Boş bırakılsa günlük kayıtlar isimsiz kalırdı.
      kriterler: seedKriterler,
      donemAgirliklari: seedAgirliklari,
      davranisEtiketleri: seedDavranisEtiketleri,
      sonKriterId: Math.max(0, ...seedKriterler.map((k) => k.id)),
      sonEtiketId: Math.max(0, ...seedDavranisEtiketleri.map((e) => e.id)),
    };
    veriDegisti();
    const json = seri(db);
    localStorage.setItem(ANAHTAR, json);
    // ÖNEMLİ: `kaydet()`in debounce'lu (250ms) sqlite yazımı burada YETMEZ —
    // çağıran taraf (AyarlarScreen) bundan hemen sonra window.location.reload()
    // çağırıyor, bu da bekleyen zamanlayıcıyı sayfayla birlikte yok ediyordu.
    // Sonuç: demo veri localStorage'a yazılıp SQLite'a hiç ulaşmadan reload
    // sonrası veritabaniHazirla() eski (boş) SQLite içeriğini geri yüklüyordu —
    // "yükle diyorum ama bir şey olmuyor" tam olarak buydu. Diğer yıkıcı+reload
    // akışları (geriYuklemeyiGeriAl, tamYedekIceAktar) zaten `sqliteJsonHemenKaydet`
    // ile AWAIT ediyor; demo veri de aynı desene alındı.
    await sqliteJsonHemenKaydet(json);
  } catch (err) {
    db = onceki;
    veriDegisti();
    throw err;
  }
}

// ─── Ayarlar: dönem ağırlıkları (Kademe 2) ─────────────────────────────────

export function agirliklariGetir(donem: number): DonemAgirlik[] {
  return db.donemAgirliklari.filter((a) => a.donem === donem);
}

export function agirliklariKaydet(donem: number, setler: DonemAgirlik[]): void {
  const onceki = db.donemAgirliklari;
  // İz (C3): ağırlık değişikliği geçmiş notların dayanağını değiştirir; İşlem
  // Günlüğü'nde "ne, neden değişti" görülebilsin.
  const yuzde = (a?: DonemAgirlik) => Math.round((a?.agirlik ?? 0) * 100);
  const farklar = setler
    .map((a) => ({ g: a.kriterGrubu, eski: yuzde(onceki.find((x) => x.donem === donem && x.kriterGrubu === a.kriterGrubu)), yeni: yuzde(a) }))
    .filter((f) => f.eski !== f.yeni);
  try {
    db.donemAgirliklari = [
      ...db.donemAgirliklari.filter((a) => a.donem !== donem),
      ...setler.map((a) => ({ ...a, donem })),
    ];
    kaydet(db);
  } catch (err) {
    db.donemAgirliklari = onceki;
    throw err;
  }
  if (farklar.length) {
    try {
      logEkle({ kaynak: "sistem", seviye: "bilgi", baslik: `${donem}. dönem ağırlıkları değişti`, mesaj: farklar.map((f) => `${f.g} %${f.eski}→%${f.yeni}`).join(", ") });
    } catch { /* ağırlık kaydedildi; iz yazılamadıysa kaydı geri almayız */ }
  }
}

// ─── Ayarlar: devamsızlık risk eşikleri (core/risk.ts) ─────────────────────
// Öğretmen istediği bir gerçek yönetmelik sınırı okula/branşa göre değişebilir
// diye buradan ayarlanabilir; core/risk.ts saf kalır (DB bilmez), değer her
// çağrıda parametre olarak geçirilir (bkz. lib/ogrenciRisk.ts).

export function riskEsikleriGetir(): RiskEsikleri {
  // Eski kayıtlarda yalnız iki devamsızlık alanı bulunabilir. Alan alan
  // birleştirme, yeni güvenli varsayılanların migration gerektirmeden gelmesini sağlar.
  return { ...VARSAYILAN_RISK_ESIKLERI, ...(db.riskEsikleri ?? {}) };
}

export function riskEsikleriKaydet(esikler: RiskEsikleri): void {
  const sayilar = [esikler.ozursuzDikkatGun, esikler.ozursuzKritikGun,
    esikler.odevDikkatSayisi, esikler.odevKritikSayisi,
    esikler.performansKritikPuani, esikler.performansDikkatPuani];
  if (!sayilar.every(Number.isFinite)
    || esikler.ozursuzDikkatGun < 1 || esikler.ozursuzKritikGun <= esikler.ozursuzDikkatGun
    || esikler.odevDikkatSayisi < 1 || esikler.odevKritikSayisi <= esikler.odevDikkatSayisi
    || esikler.performansKritikPuani < 0 || esikler.performansDikkatPuani > 100
    || esikler.performansKritikPuani >= esikler.performansDikkatPuani) {
    throw new Error("Risk eşikleri geçersiz.");
  }
  const onceki = db.riskEsikleri;
  try {
    db.riskEsikleri = esikler;
    kaydet(db);
  } catch (err) {
    db.riskEsikleri = onceki;
    throw err;
  }
}

// ─── e-Okul'dan sınıf + öğrenci aktarımı (seed bağımlılığını kaldırır) ──────

/** Liste nereden geldi: e-Okul eklentisi mi, öğretmenin dosyası/yapıştırması mı.
 *  "dosya" iken e-Okul senkron zamanı İŞARETLENMEZ — kenar çubuğu ve Sistem
 *  Sağlığı "e-Okul'dan çekildi" demesin. */
export type ListeKaynagi = "eokul" | "dosya";

/** Hiç kullanılmamış yeni kimlik (sayaç + mevcutların en büyüğü). Sayaç başarısız yazımda
 *  ilerlemiş kalabilir — bu yalnız bir numaranın atlanması demektir, zararsız. */
function yeniSinifId(): number {
  const id = Math.max(db.sonSinifId ?? 0, 0, ...db.siniflar.map((s) => s.id)) + 1;
  db.sonSinifId = id; return id;
}
function ogrenciIdTabani(): number {
  return Math.max(db.sonOgrenciId ?? 0, 0, ...db.ogrenciler.map((o) => o.id));
}

export function sinifVeOgrenciYaz(liste: EokulSinifListe, kaynak: ListeKaynagi = "eokul"): { sinifAd: string; ders: string; dersEklendi: boolean; eklenen: number; guncellenen: number; ayrilanlar: string[]; numarasiDegisen: string[]; baskaSubede: string[]; yeniler: string[] } {
  const oncekiSiniflar = db.siniflar;
  const oncekiOgrenciler = db.ogrenciler;
  // OA82: "Hazırlık-A" (e-Okul) ile elle açılmış "HAZIRLIK A" / "9/A" aynı sınıf sayılır (tek aday varsa).
  let sinif = db.siniflar.find((s) => s.ad === liste.sinifAd);
  if (!sinif) {
    const adaylar = db.siniflar.filter((s) => sinifAdAnahtari(s.ad) === sinifAdAnahtari(liste.sinifAd));
    if (adaylar.length === 1) sinif = adaylar[0];
  }
  let yeniSiniflar = db.siniflar;
  const gelenDers = liste.brans.replace(/\s+/g, " ").trim();
  let dersEklendi = false;
  if (!sinif) {
    const id = yeniSinifId();
    sinif = { id, ad: liste.sinifAd, brans: gelenDers || "—", dersler: gelenDers ? [gelenDers] : [] };
    yeniSiniflar = [...db.siniflar, sinif];
    dersEklendi = !!gelenDers;
  } else if (gelenDers) {
    const dersler = sinifDersleri(sinif);
    if (!dersler.some((d) => normMetin(d) === normMetin(gelenDers))) {
      const guncelSinif: Sinif = {
        ...sinif,
        brans: sinif.brans && sinif.brans !== "—" ? sinif.brans : gelenDers,
        dersler: [...dersler, gelenDers],
      };
      yeniSiniflar = db.siniflar.map((s) => s.id === sinif!.id ? guncelSinif : s);
      sinif = guncelSinif;
      dersEklendi = true;
    }
  }
  let eklenen = 0, guncellenen = 0;
  // OA95: sınıfta zaten öğrenci varken gelen yeni öğrenci "sınıfa yeni katıldı" sayılır (ilk toplu liste sayılmaz).
  const sinifOncedenDolu = db.ogrenciler.some((x) => x.sinifId === sinif!.id);
  const yeniler: string[] = [];
  let sonId = ogrenciIdTabani();
  // mevcut öğrenci in-place güncelleniyor (adSoyad); geri alma için eski değer tutulur.
  const guncellenenGerialma: Array<{ o: Ogrenci; adSoyad: string; no: string }> = [];
  let yeniOgrenciler = db.ogrenciler;
  const gelenNolar = new Set(liste.ogrenciler.map((o) => String(o.okulNo)));
  // OA86: numarası değişen öğrenci İKİNCİ KEZ eklenmesin (öğretmen bir hafta eskisini, bir hafta
  // yenisini işaretleyince iki yarım kayıt → iki öğrencinin de notu düşüyordu). Numarayla eşleşmeyen
  // gelen öğrenci, bu sınıfta AYNI ADLI ve numarası gelen listede OLMAYAN tek bir öğrenciyle eşleşirse
  // (ad listede de tekse) o öğrencinin numarası güncellenir — kimliği, bütün kayıtları aynen kalır.
  const numarasiDegisen: string[] = [];
  const gelenAdSayisi = new Map<string, number>();
  for (const o of liste.ogrenciler) gelenAdSayisi.set(ogrenciAdAnahtari(o.adSoyad), (gelenAdSayisi.get(ogrenciAdAnahtari(o.adSoyad)) ?? 0) + 1);
  const yeniNumaraAlanlar = new Set<number>();
  for (const o of liste.ogrenciler) {
    let mevcut = yeniOgrenciler.find((x) => x.sinifId === sinif!.id && String(x.no) === String(o.okulNo));
    if (!mevcut && gelenAdSayisi.get(ogrenciAdAnahtari(o.adSoyad)) === 1
      && !yeniOgrenciler.some((x) => String(x.no) === String(o.okulNo))) {
      const adaylar = yeniOgrenciler.filter((x) => x.sinifId === sinif!.id && !gelenNolar.has(String(x.no))
        && !yeniNumaraAlanlar.has(x.id) && ogrenciAdAnahtari(x.adSoyad) === ogrenciAdAnahtari(o.adSoyad));
      if (adaylar.length === 1) {
        mevcut = adaylar[0];
        yeniNumaraAlanlar.add(mevcut.id);
        numarasiDegisen.push(`${mevcut.adSoyad}: ${mevcut.no || "boş"} → ${o.okulNo}`);
      }
    }
    if (mevcut) {
      guncellenenGerialma.push({ o: mevcut, adSoyad: mevcut.adSoyad, no: mevcut.no });
      mevcut.adSoyad = o.adSoyad;
      mevcut.no = String(o.okulNo);
      guncellenen++;
    } else {
      // Ders işlenmeye başlamış bir sınıfa sonradan gelen öğrenci (nakil): katılma tarihi bugün.
      const sonradan = sinifDersIslendiMi(sinif.id);
      yeniOgrenciler = [...yeniOgrenciler, { id: ++sonId, sinifId: sinif.id, no: String(o.okulNo), adSoyad: o.adSoyad, ...(sonradan ? { katilmaTarihi: bugunYerelISO() } : {}), ...(sinifOncedenDolu ? { eklenmeTarihi: bugunYerelISO() } : {}) }];
      eklenen++;
      if (sinifOncedenDolu) yeniler.push(`${o.adSoyad} (No ${o.okulNo})`);
    }
  }
  // e-Okul'daki dgListem sınıfın TÜM öğrencilerini taşır (bkz.
  // adapters/eokul-ogrenci-liste.ts başlığı) — yani gelen listede olmayan
  // ama uygulamada bu sınıfta kayıtlı görünen bir öğrenci gerçekten ayrılmış/
  // nakil olmuş demektir. Kural 3 gereği BUNU OTOMATİK SİLMİYORUZ (devamsızlık/
  // not/tutanak geçmişini sessizce sildirebilecek geri dönüşsüz bir işlem —
  // yanlış şubeden çekilmiş bir liste de aynı sinyali üretirdi). Yalnız
  // ADI GEÇMİYOR diye bildirip öğretmene bırakıyoruz; silme Sınıf Listesi'nden
  // elle yapılır (zaten geri-al kuyruğundan geçiyor).
  const ayrilanlar = yeniOgrenciler
    .filter((x) => x.sinifId === sinif!.id && !x.nakilTarihi && !gelenNolar.has(String(x.no)))
    .map((x) => x.adSoyad);
  // OA95: gelen öğrencinin Okul No'su BAŞKA bir sınıfta da kayıtlıysa uyar (nakil/şube değişikliği olabilir).
  const baskaSubede: string[] = [];
  for (const o of liste.ogrenciler) {
    const var_ = db.ogrenciler.find((x) => x.sinifId !== sinif!.id && String(x.no) === String(o.okulNo));
    if (!var_) continue;
    const sn = db.siniflar.find((s) => s.id === var_.sinifId)?.ad ?? "başka sınıf";
    baskaSubede.push(`${o.adSoyad} (No ${o.okulNo}) — ${sn} sınıfında da kayıtlı`);
  }
  try {
    db.siniflar = sinifSirala(yeniSiniflar);
    db.ogrenciler = yeniOgrenciler;
    db.sonOgrenciId = sonId;
    if (kaynak === "eokul") senkronIsaretle("eokul");
    const logKaynak = kaynak === "eokul" ? "eokul" : "sistem";
    if (dersEklendi || eklenen || guncellenen) logEkle({ kaynak: logKaynak, seviye: "bilgi", baslik: kaynak === "eokul" ? "Sınıf dersi ve öğrenci listesi çekildi" : "Öğrenci listesi dosyadan/elle eklendi", mesaj: `${sinif.ad} · ${gelenDers || "Ders belirtilmedi"}: ${eklenen} eklendi, ${guncellenen} güncellendi.` });
    // Dosyadan/elle eklemede liste çoğu zaman KISMİ olur (tek öğrenci eklemek gibi);
    // "listede yok = ayrıldı" çıkarımı yalnız e-Okul'un tam sınıf listesinde anlamlı.
    if (numarasiDegisen.length) logEkle({ kaynak: logKaynak, seviye: "bilgi", baslik: "Öğrenci numarası değişmiş", mesaj: `${sinif.ad}: ${numarasiDegisen.join("; ")} — aynı öğrenci sayıldı, kayıtları korundu.` });
    if (yeniler.length) logEkle({ kaynak: logKaynak, seviye: "uyari", baslik: "Sınıfa yeni öğrenci katıldı", mesaj: `${sinif.ad}: ${yeniler.join(", ")}. Sınıf listesinde "Yeni" etiketi görünür. Nakil geldiyse eski notlarını elle girmen gerekebilir.` });
    if (baskaSubede.length) logEkle({ kaynak: logKaynak, seviye: "uyari", baslik: "Aynı Okul No başka sınıfta da var", mesaj: `${sinif.ad}: ${baskaSubede.join("; ")}. Öğrenci şube değiştirdiyse Sınıflar ve Öğrenciler'de \"Şube değiştir\" ya da \"Birleştir\" kullanın.` });
    if (kaynak === "eokul" && ayrilanlar.length) logEkle({ kaynak: "eokul", seviye: "uyari", baslik: "Öğrenci listesinde artık görünmeyenler var", mesaj: `${sinif.ad}: ${ayrilanlar.join(", ")} — son çekilen listede yoktu. e-Okul'da gerçekten ayrıldılarsa Sınıflar ve Öğrenciler → Sınıfları yönet'ten elle silin (yanlış şubeden çekilmiş olabileceği için otomatik silinmedi).` });
    kaydet(db);
  } catch (err) {
    db.siniflar = oncekiSiniflar;
    db.ogrenciler = oncekiOgrenciler;
    for (const { o, adSoyad, no } of guncellenenGerialma.reverse()) { o.adSoyad = adSoyad; o.no = no; }
    throw err;
  }
  return { sinifAd: sinif.ad, ders: gelenDers, dersEklendi, eklenen, guncellenen, ayrilanlar: kaynak === "eokul" ? ayrilanlar : [], numarasiDegisen, baskaSubede, yeniler };
}

/** OA86: öğrenci adı karşılaştırması (büyük/küçük, Türkçe harf, fazla boşluk farkı yok). */
export function ogrenciAdAnahtari(ad: string): string {
  return normMetin(ad).replace(/\s+/g, " ").trim();
}

// ─── OA86: aynı öğrencinin iki kaydını birleştirme ─────────────────────────────
// Numarası değişen öğrenci eski sürümlerde ikinci kez ekleniyordu. Öğretmen bir hafta eskisini,
// bir hafta yenisini işaretleyince iki yarım kayıt oluşuyor, iki öğrencinin de notu düşüyordu.
// Birleştirme: gidenin TÜM kayıtları tutulana geçer, giden silinir. Aynı şeyi tutan iki kayıt
// varsa (aynı gün aynı ölçüt, aynı ödev, aynı sınav…) TUTULANINKİ kalır. Aynı gün birinde "Derste
// yok", ötekinde işaret varsa öğrenci o gün derstedir → "Derste yok" düşer.

type BirlestirmeAlani = "gunlukKayitlar" | "gelmedi" | "devamsizlik" | "sinavNotlari" | "performansNotlari" | "odevPuanlari"
  | "elleNotlar" | "performansIstisnalari" | "olumluEklemeleri" | "mebiDurum" | "mebiKonuDurum" | "ogrenciEtiketleri"
  | "tutanaklar" | "mebiAdEslemeleri" | "subeTasimalari";
/** null: hepsi taşınır (çakışma kavramı yok). Boş dizi: öğrenci başına tek kayıt. */
const BIRLESTIRME_ANAHTARI: Record<BirlestirmeAlani, string[] | null> = {
  gunlukKayitlar: ["tarih", "kriterId"],
  gelmedi: ["sinifId", "tarih"],
  devamsizlik: [],
  sinavNotlari: ["ad", "donem", "ders"],
  performansNotlari: ["ad", "donem", "ders"],
  odevPuanlari: ["odevId"],
  elleNotlar: ["kalemId", "donem", "ders"],
  performansIstisnalari: ["donem", "kalem"],
  olumluEklemeleri: ["donem", "sutun", "ders"],
  mebiDurum: [],
  mebiKonuDurum: ["ders", "konu"],
  ogrenciEtiketleri: null,
  tutanaklar: null,
  mebiAdEslemeleri: null,
  subeTasimalari: null,
};

export interface BirlestirmeOzeti {
  tasinan: number;           // tutulana geçen kayıt sayısı
  cakisan: number;           // ikisinde de olduğu için tutulanınki kalan
  isaretGunu: number;        // gidenin işaretli olduğu ders günü
  dersteYokDusen: number;    // aynı gün ötekinde işaret olduğu için düşen "Derste yok"
}

function birlestirmeHesapla(tutulanId: number, gidenId: number): { yeni: Partial<Record<BirlestirmeAlani, unknown[]>>; eksikOdev: Record<number, number>; ozet: BirlestirmeOzeti } {
  const d = db as unknown as Record<BirlestirmeAlani, Array<Record<string, unknown>> | undefined>;
  const yeni: Partial<Record<BirlestirmeAlani, unknown[]>> = {};
  const ozet: BirlestirmeOzeti = { tasinan: 0, cakisan: 0, isaretGunu: 0, dersteYokDusen: 0 };
  const anahtar = (x: Record<string, unknown>, alanlar: string[]) => JSON.stringify(alanlar.map((a) => x[a] ?? null));
  for (const alan of Object.keys(BIRLESTIRME_ANAHTARI) as BirlestirmeAlani[]) {
    const dizi = d[alan];
    if (!Array.isArray(dizi) || !dizi.some((x) => x?.ogrenciId === gidenId)) continue;
    const alanlar = BIRLESTIRME_ANAHTARI[alan];
    const tutulanAnahtarlari = new Set(alanlar ? dizi.filter((x) => x?.ogrenciId === tutulanId).map((x) => anahtar(x, alanlar)) : []);
    const sonuc: unknown[] = [];
    for (const x of dizi) {
      if (x?.ogrenciId !== gidenId) { sonuc.push(x); continue; }
      if (alanlar && tutulanAnahtarlari.has(anahtar(x, alanlar))) { ozet.cakisan++; continue; }
      sonuc.push({ ...x, ogrenciId: tutulanId });
      ozet.tasinan++;
    }
    yeni[alan] = sonuc;
  }
  // Aynı gün hem işaret hem "Derste yok": öğrenci derstedir (Dersi İşle "Yok"ta işaret yazmaz).
  const gunluk = (yeni.gunlukKayitlar ?? db.gunlukKayitlar) as GunlukKayit[];
  const isaretGunleri = new Set(gunluk.filter((g) => g.ogrenciId === tutulanId).map((g) => g.tarih));
  ozet.isaretGunu = new Set(db.gunlukKayitlar.filter((g) => g.ogrenciId === gidenId).map((g) => g.tarih)).size;
  const gelmedi = (yeni.gelmedi ?? db.gelmedi) as GelmediKaydi[];
  const kalanGelmedi = gelmedi.filter((g) => !(g.ogrenciId === tutulanId && isaretGunleri.has(g.tarih)));
  if (kalanGelmedi.length !== gelmedi.length) { ozet.dersteYokDusen = gelmedi.length - kalanGelmedi.length; yeni.gelmedi = kalanGelmedi; }
  const eksikOdev = { ...db.eksikOdev };
  if (gidenId in eksikOdev) {
    if (!(tutulanId in eksikOdev)) { eksikOdev[tutulanId] = eksikOdev[gidenId]; ozet.tasinan++; } else ozet.cakisan++;
    delete eksikOdev[gidenId];
  }
  return { yeni, eksikOdev, ozet };
}

/** Birleştirmeden önce ne olacağını söyler (veriyi değiştirmez). */
export function ogrenciBirlestirmeOnizle(tutulanId: number, gidenId: number): BirlestirmeOzeti {
  ogrenciBirlestirmeDogrula(tutulanId, gidenId);
  return birlestirmeHesapla(tutulanId, gidenId).ozet;
}

function ogrenciBirlestirmeDogrula(tutulanId: number, gidenId: number): { tutulan: Ogrenci; giden: Ogrenci } {
  const tutulan = db.ogrenciler.find((o) => o.id === tutulanId);
  const giden = db.ogrenciler.find((o) => o.id === gidenId);
  if (!tutulan || !giden) throw new Error("Öğrenci bulunamadı.");
  if (tutulanId === gidenId) throw new Error("Aynı kaydı kendisiyle birleştiremezsin.");
  if (tutulan.sinifId !== giden.sinifId) throw new Error("Yalnız aynı sınıftaki iki kayıt birleştirilir. Önce Şube değiştir ile aynı sınıfa al.");
  return { tutulan, giden };
}

/** Gidenin bütün kayıtlarını tutulana taşır, gideni siler. Dönüş: geri alma (arada başka yazma olduysa reddeder). */
export function ogrencileriBirlestir(tutulanId: number, gidenId: number): { ozet: BirlestirmeOzeti; geriAl: () => void } {
  const { tutulan, giden } = ogrenciBirlestirmeDogrula(tutulanId, gidenId);
  const { yeni, eksikOdev, ozet } = birlestirmeHesapla(tutulanId, gidenId);
  const d = db as unknown as Record<string, unknown>;
  const onceki: Record<string, unknown> = { ogrenciler: db.ogrenciler, eksikOdev: db.eksikOdev, sonOgrenciId: db.sonOgrenciId };
  for (const alan of Object.keys(yeni)) onceki[alan] = d[alan];
  const uygulanan: Record<string, unknown> = {
    ...yeni,
    ogrenciler: db.ogrenciler.filter((o) => o.id !== gidenId),
    eksikOdev,
  };
  try {
    Object.assign(db, uygulanan);
    db.sonOgrenciId = Math.max(db.sonOgrenciId ?? 0, gidenId);
    logEkle({ kaynak: "sistem", seviye: "bilgi", baslik: "İki öğrenci kaydı birleştirildi", mesaj: `${giden.adSoyad} (No ${giden.no}) → ${tutulan.adSoyad} (No ${tutulan.no}): ${ozet.tasinan} kayıt taşındı${ozet.cakisan ? `, ikisinde de olan ${ozet.cakisan} kayıttan No ${tutulan.no} kaydındaki kaldı` : ""}.` });
    kaydet(db);
  } catch (err) {
    Object.assign(db, onceki);
    throw err;
  }
  const geriAl = () => {
    for (const [alan, deger] of Object.entries(uygulanan)) {
      if (d[alan] !== deger) throw new Error("Bu birleştirme artık geri alınamıyor: arada bu öğrencilerle ilgili başka bir kayıt yapıldı.");
    }
    const simdi: Record<string, unknown> = {};
    for (const alan of Object.keys(onceki)) simdi[alan] = d[alan];
    try {
      Object.assign(db, onceki);
      logEkle({ kaynak: "sistem", seviye: "bilgi", baslik: "Birleştirme geri alındı", mesaj: `${giden.adSoyad} (No ${giden.no}) yeniden ayrı kayıt.` });
      kaydet(db);
    } catch (err) {
      Object.assign(db, simdi);
      throw err;
    }
  };
  return { ozet, geriAl };
}

/** Bir sınıfta aynı adla birden çok görünen öğrenciler (numarası değişip ikinci kez eklenmiş olabilir). */
export function ayniAdliOgrenciler(sinifId?: number): Ogrenci[][] {
  const gruplar = new Map<string, Ogrenci[]>();
  for (const o of db.ogrenciler) {
    if (sinifId != null && o.sinifId !== sinifId) continue;
    if (o.nakilTarihi) continue;
    const k = `${o.sinifId}|${ogrenciAdAnahtari(o.adSoyad)}`;
    gruplar.set(k, [...(gruplar.get(k) ?? []), o]);
  }
  return [...gruplar.values()].filter((g) => g.length > 1).map((g) => g.map((o) => ({ ...o })));
}

// Sınıfı ve TÜM ilişkili kayıtlarını siler (elle eklenen demo sınıfları temizlemek için).
/**
 * Silme işleminin "geri al" kapanışını kurar (lib/geriAlKuyrugu ile kullanılır).
 *
 * NEDEN BÖYLE (2026-09 denetimi): sınıf/öğrenci/ödev/tutanak silme onaydan sonra
 * kalıcıydı. Tam anlık görüntüyü geri yüklemek (Object.assign) silmeden SONRA
 * yapılan başka yazmaları (ör. telefondan gelen aktarım) ezerdi. Bunun yerine
 * silmeden önceki dizilerde olup şimdi olmayan kayıtlar (filter aynı nesne
 * referanslarını koruduğu için kimlikle bulunur) mevcut dizilere GERİ EKLENİR;
 * sözlük alanlarında yalnız eksik anahtarlar geri konur. Arada aynı id'yle yeni
 * kayıt açıldıysa geri alma güvenle yapılamaz ve hata verir.
 */
function silmeGeriAlKur(onceki: Partial<Veritabani>): () => void {
  return () => {
    const yedek: Partial<Veritabani> = {};
    const d = db as unknown as Record<string, unknown>;
    const yeni: Record<string, unknown> = {};
    for (const [alan, eski] of Object.entries(onceki)) {
      const simdi = d[alan];
      (yedek as Record<string, unknown>)[alan] = simdi;
      if (Array.isArray(eski) && Array.isArray(simdi)) {
        const mevcut = new Set(simdi);
        const geri = eski.filter((x) => !mevcut.has(x));
        if (!geri.length) continue;
        const idVar = (x: unknown): x is { id: number } => !!x && typeof x === "object" && typeof (x as { id?: unknown }).id === "number";
        const simdiIdler = new Set(simdi.filter(idVar).map((x) => x.id));
        if (geri.some((x) => idVar(x) && simdiIdler.has(x.id))) {
          throw new Error("Bu silme artık geri alınamıyor: arada aynı numarayla yeni kayıt eklendi.");
        }
        const birlesik = [...simdi, ...geri];
        yeni[alan] = birlesik.every(idVar) ? [...birlesik].sort((a, b) => (a as { id: number }).id - (b as { id: number }).id) : birlesik;
      } else if (eski && typeof eski === "object" && simdi && typeof simdi === "object" && !Array.isArray(eski)) {
        const ek: Record<string, unknown> = { ...(simdi as Record<string, unknown>) };
        let degisti = false;
        for (const [k, v] of Object.entries(eski as Record<string, unknown>)) if (!(k in ek)) { ek[k] = v; degisti = true; }
        if (degisti) yeni[alan] = ek;
      }
    }
    try {
      Object.assign(db, yeni);
      logEkle({ kaynak: "sistem", seviye: "bilgi", baslik: "Silme geri alındı", mesaj: "Silinen kayıtlar geri getirildi." });
      kaydet(db);
    } catch (err) {
      Object.assign(db, yedek);
      throw err;
    }
    if (typeof window !== "undefined") window.dispatchEvent(new Event("oa-veri-degisti"));
  };
}

export function sinifSil(sinifId: number): () => void {
  const sinif = db.siniflar.find((s) => s.id === sinifId);
  const ogrIds = new Set(db.ogrenciler.filter((o) => o.sinifId === sinifId).map((o) => o.id));
  // Bu fonksiyon 15 farklı alanı birden değiştiriyor; tek tek "onceki" değişkeni
  // yerine bir anlık görüntü nesnesi tutup hata durumunda Object.assign ile
  // hepsini bir kerede geri yüklemek okunurluğu koruyor.
  const onceki = {
    siniflar: db.siniflar,
    ogrenciler: db.ogrenciler,
    devamsizlik: db.devamsizlik,
    gunlukKayitlar: db.gunlukKayitlar,
    sinavNotlari: db.sinavNotlari,
    performansNotlari: db.performansNotlari,
    ogrenciEtiketleri: db.ogrenciEtiketleri,
    tutanaklar: db.tutanaklar,
    odevler: db.odevler,
    odevPuanlari: db.odevPuanlari,
    mebiDurum: db.mebiDurum,
    mebiKonuDurum: db.mebiKonuDurum,
    dersProgrami: db.dersProgrami,
    dersYapilmadi: db.dersYapilmadi,
    gelmedi: db.gelmedi,
    eksikOdev: db.eksikOdev,
    kazanimIslenmeKayitlari: db.kazanimIslenmeKayitlari,
    mebiEnvanter: db.mebiEnvanter,
    gunlukIslendi: db.gunlukIslendi,
    elleNotlar: db.elleNotlar ?? [],
    performansIstisnalari: db.performansIstisnalari ?? [],
    olumluEklemeleri: db.olumluEklemeleri ?? [],
  };
  try {
    db.sonSinifId = Math.max(db.sonSinifId ?? 0, sinifId);
    db.sonOgrenciId = Math.max(db.sonOgrenciId ?? 0, ...ogrIds);
    db.siniflar = db.siniflar.filter((s) => s.id !== sinifId);
    // Denetim: işlenen ders izi, elle notlar ve istisnalar da gider (yoksa aynı kimliği
    // alan yeni sınıfa/öğrenciye geçiyordu).
    db.gunlukIslendi = db.gunlukIslendi.filter((g) => g.sinifId !== sinifId);
    db.elleNotlar = (db.elleNotlar ?? []).filter((n) => !ogrIds.has(n.ogrenciId));
    db.performansIstisnalari = (db.performansIstisnalari ?? []).filter((x) => !ogrIds.has(x.ogrenciId));
    db.olumluEklemeleri = (db.olumluEklemeleri ?? []).filter((x) => !ogrIds.has(x.ogrenciId));
    db.ogrenciler = db.ogrenciler.filter((o) => o.sinifId !== sinifId);
    db.devamsizlik = db.devamsizlik.filter((d) => !ogrIds.has(d.ogrenciId));
    db.gunlukKayitlar = db.gunlukKayitlar.filter((g) => !ogrIds.has(g.ogrenciId));
    db.sinavNotlari = db.sinavNotlari.filter((n) => !ogrIds.has(n.ogrenciId));
    db.performansNotlari = db.performansNotlari.filter((n) => !ogrIds.has(n.ogrenciId));
    db.ogrenciEtiketleri = db.ogrenciEtiketleri.filter((e) => !ogrIds.has(e.ogrenciId));
    db.tutanaklar = db.tutanaklar.filter((t) => !ogrIds.has(t.ogrenciId));
    // Sınıfın ödevleri de gider (denetim 2026-10: puanlar siliniyor, ödev kayıtları sınıfsız
    // "yetim" kalıp hiçbir ekranda görünmüyordu). Başka şubeye taşınmış öğrencinin bu
    // ödevlerdeki satırları da ödevle birlikte gider; hepsi geri almaya dahil.
    const silinenOdevIds = new Set(db.odevler.filter((o) => o.sinifId === sinifId).map((o) => o.id));
    db.odevler = db.odevler.filter((o) => o.sinifId !== sinifId);
    db.odevPuanlari = db.odevPuanlari.filter((p) => !ogrIds.has(p.ogrenciId) && !silinenOdevIds.has(p.odevId));
    db.mebiDurum = db.mebiDurum.filter((m) => !ogrIds.has(m.ogrenciId));
    db.mebiKonuDurum = db.mebiKonuDurum.filter((m) => !ogrIds.has(m.ogrenciId));
    db.dersProgrami = db.dersProgrami.filter((d) => d.sinifId !== sinifId);
    db.dersYapilmadi = db.dersYapilmadi.filter((d) => d.sinifId !== sinifId);
    db.gelmedi = db.gelmedi.filter((g) => g.sinifId !== sinifId);
    const yeniEksikOdev = { ...db.eksikOdev };
    for (const id of ogrIds) delete yeniEksikOdev[id];
    db.eksikOdev = yeniEksikOdev;
    const yeniKazanimIslenme = { ...db.kazanimIslenmeKayitlari };
    delete yeniKazanimIslenme[sinifId];
    db.kazanimIslenmeKayitlari = yeniKazanimIslenme;
    if (sinif) db.mebiEnvanter = db.mebiEnvanter.filter((e) => _normAd(e.sinifAd) !== _normAd(sinif.ad));
    kaydet(db);
  } catch (err) {
    Object.assign(db, onceki);
    throw err;
  }
  return silmeGeriAlKur(onceki);
}

/** Boş bir sınıf açar (öğrencisiz). Aynı adda sınıf varsa onu döndürür. */
export function sinifEkle(ad: string, ders: string): Sinif {
  const temizAd = ad.replace(/\s+/g, " ").trim().toLocaleUpperCase("tr-TR");
  if (!temizAd) throw new Error("Sınıf adı boş olamaz.");
  const mevcut = db.siniflar.find((s) => normMetin(s.ad) === normMetin(temizAd));
  if (mevcut) return mevcut;
  const temizDers = ders.replace(/\s+/g, " ").trim();
  const onceki = db.siniflar;
  const sinif: Sinif = {
    id: yeniSinifId(),
    ad: temizAd,
    brans: temizDers || "—",
    dersler: temizDers ? [temizDers] : [],
  };
  try {
    db.siniflar = sinifSirala([...db.siniflar, sinif]);
    logEkle({ kaynak: "sistem", seviye: "bilgi", baslik: "Sınıf elle eklendi", mesaj: `${sinif.ad}${temizDers ? ` · ${temizDers}` : ""}` });
    kaydet(db);
  } catch (err) {
    db.siniflar = onceki;
    throw err;
  }
  return sinif;
}

/** Tek öğrenciyi ve ona bağlı TÜM kayıtlarını siler (nakil giden, yanlış eklenen).
 *  sinifSil'in öğrenci ölçeğindeki ikizi — aynı alan listesi. */
export function ogrenciSil(ogrenciId: number): () => void {
  const onceki = {
    ogrenciler: db.ogrenciler,
    devamsizlik: db.devamsizlik,
    gunlukKayitlar: db.gunlukKayitlar,
    sinavNotlari: db.sinavNotlari,
    performansNotlari: db.performansNotlari,
    ogrenciEtiketleri: db.ogrenciEtiketleri,
    tutanaklar: db.tutanaklar,
    odevPuanlari: db.odevPuanlari,
    mebiDurum: db.mebiDurum,
    mebiKonuDurum: db.mebiKonuDurum,
    eksikOdev: db.eksikOdev,
    mebiAdEslemeleri: db.mebiAdEslemeleri,
    gelmedi: db.gelmedi,
    elleNotlar: db.elleNotlar ?? [],
    performansIstisnalari: db.performansIstisnalari ?? [],
    olumluEklemeleri: db.olumluEklemeleri ?? [],
  };
  const ogr = db.ogrenciler.find((o) => o.id === ogrenciId);
  if (!ogr) return () => undefined;
  try {
    db.ogrenciler = db.ogrenciler.filter((o) => o.id !== ogrenciId);
    db.elleNotlar = (db.elleNotlar ?? []).filter((n) => n.ogrenciId !== ogrenciId);
    db.performansIstisnalari = (db.performansIstisnalari ?? []).filter((x) => x.ogrenciId !== ogrenciId);
    db.olumluEklemeleri = (db.olumluEklemeleri ?? []).filter((x) => x.ogrenciId !== ogrenciId);
    db.sonOgrenciId = Math.max(db.sonOgrenciId ?? 0, ogrenciId);
    db.devamsizlik = db.devamsizlik.filter((d) => d.ogrenciId !== ogrenciId);
    db.gunlukKayitlar = db.gunlukKayitlar.filter((g) => g.ogrenciId !== ogrenciId);
    db.sinavNotlari = db.sinavNotlari.filter((n) => n.ogrenciId !== ogrenciId);
    db.performansNotlari = db.performansNotlari.filter((n) => n.ogrenciId !== ogrenciId);
    db.ogrenciEtiketleri = db.ogrenciEtiketleri.filter((e) => e.ogrenciId !== ogrenciId);
    db.tutanaklar = db.tutanaklar.filter((t) => t.ogrenciId !== ogrenciId);
    db.odevPuanlari = db.odevPuanlari.filter((p) => p.ogrenciId !== ogrenciId);
    db.mebiDurum = db.mebiDurum.filter((m) => m.ogrenciId !== ogrenciId);
    db.mebiKonuDurum = db.mebiKonuDurum.filter((m) => m.ogrenciId !== ogrenciId);
    db.mebiAdEslemeleri = db.mebiAdEslemeleri.filter((m) => m.ogrenciId !== ogrenciId);
    db.gelmedi = db.gelmedi.filter((g) => g.ogrenciId !== ogrenciId);
    const yeniEksikOdev = { ...db.eksikOdev };
    delete yeniEksikOdev[ogrenciId];
    db.eksikOdev = yeniEksikOdev;
    logEkle({ kaynak: "sistem", seviye: "bilgi", baslik: "Öğrenci silindi", mesaj: `${ogr.adSoyad} (No ${ogr.no})` });
    kaydet(db);
  } catch (err) {
    Object.assign(db, onceki);
    throw err;
  }
  return silmeGeriAlKur(onceki);
}

// ─── Davranış / rehberlik etiketleri (MASTER §10.3, KVKK: local) ────────────

export function etiketTanimlariGetir(): DavranisEtiket[] {
  return db.davranisEtiketleri;
}

export function etiketTanimEkle(ad: string, renk: DavranisEtiket["renk"]): void {
  const onceki = db.davranisEtiketleri;
  const oncekiId = db.sonEtiketId;
  try {
    db.davranisEtiketleri = [...db.davranisEtiketleri, { id: ++db.sonEtiketId, ad, renk }];
    kaydet(db);
  } catch (err) {
    db.davranisEtiketleri = onceki;
    db.sonEtiketId = oncekiId;
    throw err;
  }
}

export function etiketTanimSil(id: number): void {
  const oncekiEtiketler = db.davranisEtiketleri;
  const oncekiOgrenciEtiketler = db.ogrenciEtiketleri;
  try {
    db.davranisEtiketleri = db.davranisEtiketleri.filter((e) => e.id !== id);
    db.ogrenciEtiketleri = db.ogrenciEtiketleri.filter((oe) => oe.etiketId !== id);
    kaydet(db);
  } catch (err) {
    db.davranisEtiketleri = oncekiEtiketler;
    db.ogrenciEtiketleri = oncekiOgrenciEtiketler;
    throw err;
  }
}

export function etiketTanimKullanimSayisi(id: number): number {
  return db.ogrenciEtiketleri.filter((oe) => oe.etiketId === id).length;
}

export function ogrenciEtiketleriGetir(ogrenciId: number): OgrenciEtiket[] {
  return db.ogrenciEtiketleri.filter((oe) => oe.ogrenciId === ogrenciId);
}

export function ogrenciEtiketEkle(ogrenciId: number, etiketId: number, not?: string): void {
  const onceki = db.ogrenciEtiketleri;
  const oncekiId = db.sonOgrenciEtiketId;
  try {
    db.ogrenciEtiketleri = [
      ...db.ogrenciEtiketleri,
      {
        id: ++db.sonOgrenciEtiketId,
        ogrenciId,
        etiketId,
        tarih: simdiYerelISO(),
        not: not?.trim() || undefined,
        donem: aktifDonemGetir() ?? 1,
      },
    ];
    kaydet(db);
  } catch (err) {
    db.ogrenciEtiketleri = onceki;
    db.sonOgrenciEtiketId = oncekiId;
    throw err;
  }
}

export function ogrenciEtiketSil(id: number): void {
  const onceki = db.ogrenciEtiketleri;
  try {
    db.ogrenciEtiketleri = db.ogrenciEtiketleri.filter((oe) => oe.id !== id);
    kaydet(db);
  } catch (err) {
    db.ogrenciEtiketleri = onceki;
    throw err;
  }
}

// ─── Kazanım / gelişim düzeyi (MASTER §10.1 — ders bazlı liste) ─────────────

/**
 * Bir e-Okul çekişi her zaman TEK bir (öğretim yılı, kademe, ders) alt kümesini
 * temsil eder — bu yüzden merge/üzerine-yazma yerine o alt kümeyi ham'dan
 * yeniden inşa edip GERİ KALANA DOKUNMAYIZ. Eski tasarım ham DOM id'sini TÜM
 * veritabanında global `find` ile eşleştiriyordu; e-Okul'un id numaralandırması
 * sayfa başına sıfırlandığından farklı kademelerin kazanımları birbirinin
 * üzerine yazılıyordu (2026-08 sağlamlaştırma turunda bulunan gerçek veri
 * bozulması). Alt küme değiştirme bu çakışma sınıfını yapısal olarak imkânsız
 * kılar: mutasyon yok, yalnızca `db.kazanimTanimlari` referans değişimi.
 */
export function kazanimTanimYaz(ham: KazanimHam): { eklenen: number; guncellenen: number; mukerrer: number; kaldirilan: number; toplam: number } {
  const kademe = ham.sinifAd.match(/\d+/)?.[0] ?? "";
  const ogretimYili = db.ayarlar.aktifOgretimYili;
  const onceki = db.kazanimTanimlari;
  const buAltKumedeMi = (k: KazanimTanimi) =>
    k.ogretimYili === ogretimYili && k.kademe === kademe && _normAd(k.ders) === _normAd(ham.ders);
  const digerleri = onceki.filter((k) => !buAltKumedeMi(k));
  const eskiAltKume = onceki.filter(buAltKumedeMi);

  let eklenen = 0;
  let guncellenen = 0;
  let mukerrer = 0;
  const altKume = new Map<string, KazanimTanimi>();
  for (const konu of ham.konular) {
    for (const m of konu.maddeler) {
      const kod = m.kod ?? kazanimKoduTespitEt(m.metin);
      const id = kazanimKimlikUret({ ogretimYili, kademe, ders: ham.ders, kod, metin: m.metin });
      if (altKume.has(id)) mukerrer++;
      else if (eskiAltKume.some((k) => k.id === id)) guncellenen++;
      else eklenen++;
      altKume.set(id, { id, ogretimYili, kademe, ders: ham.ders, kod, konu: konu.ad, metin: m.metin, kaynak: "eokul" });
    }
  }

  // Kaynaktan kaldırılan (yeni ham'da artık olmayan) ama en az bir sınıfta
  // işlenmiş kazanımlar SİLİNMEZ — müfredat revize olup e-Okul bir kazanımı
  // kaldırdığında öğretmenin işaretlediği emek sessizce kaybolmasın (spec §7).
  // Hiç işlenmemiş olanlar güvenle atılır (kayıp riski yok, hiç kullanılmadı).
  const herhangiSinifIslemisMi = (id: string) =>
    Object.values(db.kazanimIslenmeKayitlari).some((kayitlar) => id in kayitlar);
  const kaldirilanlar = eskiAltKume.filter((k) => !altKume.has(k.id));
  const korunanKaldirilanlar = kaldirilanlar
    .filter((k) => herhangiSinifIslemisMi(k.id))
    .map((k) => ({ ...k, silindiKaynakta: true }));

  try {
    db.kazanimTanimlari = [...digerleri, ...altKume.values(), ...korunanKaldirilanlar];
    senkronIsaretle("eokul");
    const kaldirilan = kaldirilanlar.length;
    if (eklenen || guncellenen || mukerrer || kaldirilan) {
      const parcalar = [
        eklenen ? `${eklenen} yeni` : null,
        guncellenen ? `${guncellenen} güncellendi` : null,
        kaldirilan ? `${kaldirilan} kaynaktan kaldırıldı` : null,
        mukerrer ? `${mukerrer} mükerrer` : null,
      ].filter(Boolean).join(", ");
      logEkle({
        kaynak: "eokul", seviye: kaldirilan || mukerrer ? "uyari" : "bilgi", baslik: "Kazanımlar çekildi",
        mesaj: `${ham.ders} (${kademe}. sınıf): ${parcalar} (toplam ${db.kazanimTanimlari.length}).`,
      });
    }
    kaydet(db);
  } catch (err) {
    db.kazanimTanimlari = onceki;
    throw err;
  }
  return { eklenen, guncellenen, mukerrer, kaldirilan: kaldirilanlar.length, toplam: db.kazanimTanimlari.length };
}

/**
 * Öğretmenin kendi yıllık plan dosyasından (Excel — bkz.
 * modules/kazanim/lib/yillikPlanExcel.ts) çıkarılan, önizlemede onaylanmış
 * satırları kazanım tanımlarıyla birleştirir. `kazanimTanimYaz`'dan farkı:
 * bu bir alt kümeyi TAMAMEN yeniden inşa etmiyor (yıllık plan dosyası zaten
 * eksiksiz olmayabilir, e-Okul'un tam listesini SİLME riski almayız) — yalnız
 * EKLER/GÜNCELLER. Aynı kazanım kimliği (kod/metinden türer) e-Okul'da zaten
 * varsa metin/konu'ya DOKUNULMAZ, yalnız ay/hafta eklenir — spec: "kazanım
 * metinleri e-Okul'dan, ay/hafta planlaması yıllık plandan gelebilir."
 */
export function yillikPlanIceAktar(
  kademe: string, ders: string, satirlar: YillikPlanSatiri[],
): { eslesen: number; eklenen: number; mukerrer: number; toplam: number } {
  const ogretimYili = db.ayarlar.aktifOgretimYili;
  const onceki = db.kazanimTanimlari;

  let eslesen = 0;
  let eklenen = 0;
  let mukerrer = 0;
  const gorulen = new Set<string>();
  let calisan = onceki;
  for (const satir of satirlar) {
    const kod = kazanimKoduTespitEt(satir.metin);
    const id = kazanimKimlikUret({ ogretimYili, kademe, ders, kod, metin: satir.metin });
    if (gorulen.has(id)) { mukerrer++; continue; }
    gorulen.add(id);

    const mevcut = calisan.find((k) => k.id === id);
    if (mevcut) {
      eslesen++;
      calisan = calisan.map((k) => (k.id === id ? { ...k, ay: satir.ay ?? k.ay, hafta: satir.hafta ?? k.hafta } : k));
    } else {
      eklenen++;
      calisan = [...calisan, {
        id, ogretimYili, kademe, ders, kod, konu: satir.konu, metin: satir.metin,
        kaynak: "yillik-plan", ay: satir.ay, hafta: satir.hafta,
      }];
    }
  }

  try {
    db.kazanimTanimlari = calisan;
    if (eklenen || eslesen) {
      logEkle({
        kaynak: "sistem", seviye: "bilgi", baslik: "Yıllık plandan kazanım içe aktarıldı",
        mesaj: `${ders} (${kademe}. sınıf): ${eklenen} yeni, ${eslesen} eşleşen kazanıma ay/hafta eklendi${mukerrer ? `, ${mukerrer} mükerrer atlandı` : ""} (toplam ${db.kazanimTanimlari.length}).`,
      });
    }
    kaydet(db);
  } catch (err) {
    db.kazanimTanimlari = onceki;
    throw err;
  }
  return { eslesen, eklenen, mukerrer, toplam: db.kazanimTanimlari.length };
}

/**
 * Bir kademenin, BELİRLİ bir dersteki kazanımları. `ders` ZORUNLU: aksi halde
 * (eski imza `ders?` opsiyoneldi) aynı kademedeki farklı dersler — ör. birden
 * çok branş okutan bir öğretmende — tek listede karışır. Karşılaştırma
 * `_normAd` ile: `Sinif.brans` (öğrenci listesi ekranı) ile `KazanimHam.ders`
 * (gelişim düzeyi dropdown'ı) FARKLI e-Okul sayfalarından geldiği için birebir
 * yazım eşleşmesi garanti değil.
 */
export function kademeKazanimlari(kademe: string, ders: string) {
  return db.kazanimTanimlari.filter((k) => k.kademe === kademe && _normAd(k.ders) === _normAd(ders) && !k.silindiKaynakta);
}

/** Yalnız "kaynaktan kaldırıldı" işaretli kazanımlar — ana ekranın ayrı, gri
 *  bölümü için (bkz. kazanimTanimYaz'daki korunanKaldirilanlar). */
export function kademeKaldirilanKazanimlari(kademe: string, ders: string): KazanimTanimi[] {
  return db.kazanimTanimlari.filter((k) => k.kademe === kademe && _normAd(k.ders) === _normAd(ders) && k.silindiKaynakta);
}

/** Bir veya daha çok kazanım tanımını KALICI olarak siler — tanımdan VE tüm
 *  sınıfların işlenme kaydından (yetim kayıt kalmasın), TEK işlemde (biri
 *  başarısız olursa hepsi geri alınır). GERİ DÖNÜŞÜ YOK. */
function kazanimlariTopluSil(idler: string[]): void {
  const idSeti = new Set(idler);
  const oncekiTanimlar = db.kazanimTanimlari;
  const oncekiIslenme = db.kazanimIslenmeKayitlari;
  try {
    db.kazanimTanimlari = db.kazanimTanimlari.filter((k) => !idSeti.has(k.id));
    const yeniIslenme: typeof db.kazanimIslenmeKayitlari = {};
    for (const [sinifIdStr, kayitlar] of Object.entries(db.kazanimIslenmeKayitlari)) {
      const kalanlar = { ...kayitlar };
      for (const id of idSeti) delete kalanlar[id];
      yeniIslenme[Number(sinifIdStr)] = kalanlar;
    }
    db.kazanimIslenmeKayitlari = yeniIslenme;
    kaydet(db);
  } catch (err) {
    db.kazanimTanimlari = oncekiTanimlar;
    db.kazanimIslenmeKayitlari = oncekiIslenme;
    throw err;
  }
}

/** Öğretmenin kararı: kaldırılan kazanımı KALICI olarak siler. */
export function kazanimKaldirilaniSil(kazanimId: string): void {
  kazanimlariTopluSil([kazanimId]);
}

/** Bir konudaki (kademe+ders sınırlı) TÜM kazanımları TEK seferde kalıcı
 *  olarak siler — gerçek kullanıcı isteği: yanlış/deneme amaçlı bir Yıllık
 *  Plan içe aktarımının onlarca maddesini tek tek silmek "baya uğraştırıcı"
 *  oluyordu. kademe+ders sınırı, aynı konu adının BAŞKA bir kademe/derste
 *  yanlışlıkla silinmesini engeller. */
export function kazanimKonusunuSil(kademe: string, ders: string, konu: string): void {
  const idler = db.kazanimTanimlari
    .filter((k) => k.kademe === kademe && _normAd(k.ders) === _normAd(ders) && k.konu === konu)
    .map((k) => k.id);
  kazanimlariTopluSil(idler);
}

export function kazanimIslendiMi(sinifId: number, kazanimId: string): boolean {
  return db.kazanimIslenmeKayitlari[sinifId]?.[kazanimId]?.islendi ?? false;
}

/** Bir sınıfta bir kazanımın son işlenme tarihi — rapor için (yoksa null). */
export function kazanimIslenmeTarihi(sinifId: number, kazanimId: string): string | null {
  return db.kazanimIslenmeKayitlari[sinifId]?.[kazanimId]?.tarih ?? null;
}

/** Aynı kademe+dersteki DİĞER şubelerden (haricSinifId hariç) bu kazanımı henüz
 *  işlememiş olanlar — birden çok şube aynı müfredatı işleyen bir öğretmenin
 *  şubeler arası ilerleme farkını (biri unutuldu mu) Kazanımlar ekranında fark
 *  etmesi için. `id` döndürülüyor ki UI "eksik" rozetine tıklayınca doğrudan o
 *  şubeye geçip AYNI kazanıma kaydırabilsin (kazanım id'si şubeler arasında
 *  ortak — bkz. kazanimKimlikUret). Tek şube varsa boş dizi döner. */
export function kazanimDigerSubelerdeEksik(kazanimId: string, kademe: string, ders: string, haricSinifId: number): { id: number; ad: string }[] {
  return db.siniflar
    .filter((s) => s.id !== haricSinifId && sinifDersleri(s).includes(ders) && (s.ad.match(/\d+/)?.[0] ?? "") === kademe)
    .filter((s) => !kazanimIslendiMi(s.id, kazanimId))
    .map((s) => ({ id: s.id, ad: s.ad }));
}

/** Kazanımlar → "Diğer şubelerde de işlendi": aynı kazanımı birkaç şubede TEK
 *  yazmayla işlendi yapar (her şubeye gidip tek tek işaretlemek gerekiyordu).
 *  Zaten işlenmiş olana dokunmaz. Geri alma döndürür. */
export function kazanimSiniflardaIsle(kazanimId: string, sinifIdler: number[]): () => void {
  const onceki = db.kazanimIslenmeKayitlari;
  const tarih = bugunYerelISO();
  const donem = db.donemDurumu.aktifDonem ?? 1;
  const guncelleme = simdiYerelISO();
  const yeni = { ...db.kazanimIslenmeKayitlari };
  const degisen: number[] = [];
  for (const sinifId of new Set(sinifIdler)) {
    if (!db.siniflar.some((s) => s.id === sinifId)) continue;
    const kayitlar = yeni[sinifId] ?? {};
    if (kayitlar[kazanimId]?.islendi) continue;
    yeni[sinifId] = { ...kayitlar, [kazanimId]: { kazanimId, sinifId, islendi: true, tarih, donem, kaynak: "elle", guncelleme } };
    degisen.push(sinifId);
  }
  try {
    db.kazanimIslenmeKayitlari = yeni;
    kaydet(db);
  } catch (err) {
    db.kazanimIslenmeKayitlari = onceki;
    throw err;
  }
  return () => {
    const oncesi = db.kazanimIslenmeKayitlari;
    const geri = { ...db.kazanimIslenmeKayitlari };
    for (const sinifId of degisen) {
      const k = { ...(geri[sinifId] ?? {}) };
      const eski = onceki[sinifId]?.[kazanimId];
      if (eski) k[kazanimId] = eski; else delete k[kazanimId];
      geri[sinifId] = k;
    }
    try {
      db.kazanimIslenmeKayitlari = geri;
      kaydet(db);
    } catch (err) {
      db.kazanimIslenmeKayitlari = oncesi;
      throw err;
    }
  };
}

/** Bir sınıfta kazanımın işlenme durumunu aç/kapa (sınıf bazlı). */
export function kazanimToggleSinif(sinifId: number, kazanimId: string): void {
  const sinifKayitlari = db.kazanimIslenmeKayitlari[sinifId] ?? {};
  const mevcutIslendi = sinifKayitlari[kazanimId]?.islendi ?? false;
  const yeniKayit: KazanimIslenmeKaydi = {
    kazanimId, sinifId, islendi: !mevcutIslendi,
    tarih: bugunYerelISO(),
    donem: db.donemDurumu.aktifDonem ?? 1,
    kaynak: "elle",
    guncelleme: simdiYerelISO(),
  };
  const onceki = db.kazanimIslenmeKayitlari;
  try {
    db.kazanimIslenmeKayitlari = { ...db.kazanimIslenmeKayitlari, [sinifId]: { ...sinifKayitlari, [kazanimId]: yeniKayit } };
    kaydet(db);
  } catch (err) {
    db.kazanimIslenmeKayitlari = onceki;
    throw err;
  }
}

/** Hızlı İşleme kazanım senkronunun seçenekleri (bkz. kazanimIslemeToplu). */
export interface KazanimIslemeSecenek {
  /**
   * Ekranda GÖSTERİLEN kazanım kimlikleri. Verilirse "işlendi" işareti YALNIZ
   * bu kapsamın içinde kaldırılır. NEDEN: Hızlı İşleme yalnız seçili dersin
   * (ör. "Seçmeli Fizik") kazanımlarını gösterip gönderiyor; kapsam yokken
   * listede olmayan HER işaret kaldırılıyordu → "Fizik" işaretleri, Hazırlık
   * sınıfında (kademe yok → boş liste) TÜM işaretler ve kaynaktan kaldırılmış
   * kazanımların işaretleri sessizce siliniyordu (denetim 2026-10, KRİTİK).
   * Verilmezse eski davranış: listede olmayan her işaret kaldırılır.
   */
  kapsamIdler?: string[];
  /** Kazanımın işlendiği ders günü (YYYY-AA-GG). Verilmezse bugün. Dönem bu
   *  tarihten türetilir — geçmiş bir günü işleyen öğretmenin kaydı o günün
   *  dönemine düşsün (bugünün/aktif dönemin değil). */
  tarih?: string;
}

/** Saf hesap: sınıfın yeni kazanım kayıtları, değişiklik yoksa null. Hem
 *  kazanimIslemeToplu hem tek-işlemli hizliIslemeKaydet aynı kuralı kullansın diye. */
function kazanimIslemeHesapla(
  sinifId: number,
  seciliIdler: string[],
  secenek: KazanimIslemeSecenek = {},
): Record<string, KazanimIslenmeKaydi> | null {
  const mevcut = db.kazanimIslenmeKayitlari[sinifId] ?? {};
  const seciliSet = new Set(seciliIdler);
  const kapsam = secenek.kapsamIdler ? new Set(secenek.kapsamIdler) : null;
  const tarih = secenek.tarih ?? bugunYerelISO();
  const donem = tarihinDonemi(tarih);
  const guncelleme = simdiYerelISO();

  const yeni: Record<string, KazanimIslenmeKaydi> = { ...mevcut };
  let degisti = false;
  for (const id of seciliSet) {
    if (!mevcut[id]?.islendi) {
      yeni[id] = { kazanimId: id, sinifId, islendi: true, tarih, donem, kaynak: "elle", guncelleme };
      degisti = true;
    }
  }
  for (const [id, kayit] of Object.entries(mevcut)) {
    if (kapsam && !kapsam.has(id)) continue; // ekranda görünmeyene dokunma
    if (kayit.islendi && !seciliSet.has(id)) {
      yeni[id] = { ...kayit, islendi: false, guncelleme };
      degisti = true;
    }
  }
  return degisti ? yeni : null;
}

/**
 * Hızlı İşleme'de öğretmenin o oturumda seçtiği kazanım kimlikleriyle bir
 * sınıfın işlenme kaydını TEK seferde senkronlar. `kazanimToggleSinif`'i
 * kazanım başına çağırmak yerine (her çağrı kendi `kaydet()`'ini tetikler) —
 * yalnız GERÇEKTEN DEĞİŞENLER yazılır; hiçbir şey değişmediyse no-op (her
 * Hızlı İşleme kaydında gereksiz yazım/log olmasın). Ekrandan çağrılırken
 * `secenek.kapsamIdler` VERİLMELİ (bkz. KazanimIslemeSecenek).
 */
export function kazanimIslemeToplu(sinifId: number, seciliIdler: string[], secenek: KazanimIslemeSecenek = {}): void {
  const yeni = kazanimIslemeHesapla(sinifId, seciliIdler, secenek);
  if (!yeni) return;

  const onceki = db.kazanimIslenmeKayitlari;
  try {
    db.kazanimIslenmeKayitlari = { ...db.kazanimIslenmeKayitlari, [sinifId]: yeni };
    kaydet(db);
  } catch (err) {
    db.kazanimIslenmeKayitlari = onceki;
    throw err;
  }
}

/**
 * Hızlı İşleme "Kaydet"inin TAMAMI tek `kaydet()` ile: günün işaretleri
 * (gunlukKaydet gibi sınıf+günü EZER), "Yok" listesi (gelmediKaydet gibi),
 * "kontrol edildi" izi (gunuIsaretle gibi; "ders yapılmadı" işaretini kaldırır)
 * ve verilirse kazanımlar. NEDEN: eskiden bunlar 3–4 ayrı `kaydet()` idi;
 * ortadaki biri (ör. disk dolu) başarısız olunca öncekiler diske yazılmış,
 * sonrakiler yazılmamış kalıyordu — ekran "kaydedilemedi" derken işaretler
 * yarım kaydedilmiş oluyordu. Hata olursa TÜM alanlar geri alınır.
 * Mantık bilerek o üç fonksiyonla aynı; birinde kural değişirse burada da değişmeli.
 */
export function hizliIslemeKaydet(
  sinifId: number,
  tarih: string,
  kayitlar: Array<Omit<GunlukKayit, "id" | "donem">>,
  gelmediler: number[],
  kazanim?: { seciliIdler: string[]; kapsamIdler: string[] },
  /** OA73: Hızlı İşleme'de seçili ders — iki+ dersli sınıfta günün dersi olarak yazılır
   *  (tek dersli sınıfta ya da sınıfta olmayan adla hiçbir şey yazılmaz). */
  ders?: string,
): void {
  const oncekiGunluk = db.gunlukKayitlar;
  const oncekiSonGunlukId = db.sonGunlukId; // sayaç ARTIRILMADAN önce yakalanır (ZORUNLU KURAL tuzak 2)
  const oncekiGelmedi = db.gelmedi;
  const oncekiIslendi = db.gunlukIslendi;
  const oncekiYapilmadi = db.dersYapilmadi;
  const oncekiKazanim = db.kazanimIslenmeKayitlari;

  // OA74 eki: yalnız o tarihte de sınıfta olan şu anki öğrenciler (`sinifGunuOgrencileri`) — taşınıp
  // gelen öğrencinin taşıma öncesi güne işareti/Yok'u yazılmaz, o tarihteki eski kayıtları ezilmez.
  const ogrIds = new Set(sinifGunuOgrencileri(sinifId, tarih).map((o) => o.id));
  const yok = new Set(gelmediler.filter((id) => ogrIds.has(id)));
  const donem = tarihinDonemi(tarih);
  const yeniKazanim = kazanim
    ? kazanimIslemeHesapla(sinifId, kazanim.seciliIdler, { kapsamIdler: kazanim.kapsamIdler, tarih })
    : null;
  try {
    const kalanlar = db.gunlukKayitlar.filter((k) => !(k.tarih === tarih && ogrIds.has(k.ogrenciId)));
    const yeniler = kayitlar
      .filter((k) => ogrIds.has(k.ogrenciId) && !yok.has(k.ogrenciId))
      .map((k) => ({ ...k, id: ++db.sonGunlukId, donem }));
    db.gunlukKayitlar = [...kalanlar, ...yeniler];
    // OA74: yalnız ŞU AN sınıfta olanların "Yok"u ezilir; taşınmış öğrencinin bu sınıftaki eski
    // "Yok"u kalır (işaretler zaten yalnız şu anki öğrenciler için siliniyordu — `kalanlar`).
    db.gelmedi = [
      ...db.gelmedi.filter((g) => !gelmediEzilirMi(g, sinifId, tarih, ogrIds)),
      ...[...yok].map((ogrenciId) => ({ sinifId, ogrenciId, tarih })),
    ];
    db.gunlukIslendi = islendiIziYaz(db.gunlukIslendi, sinifId, tarih, ders);
    db.dersYapilmadi = db.dersYapilmadi.filter((d) => !(d.sinifId === sinifId && d.tarih === tarih));
    if (yeniKazanim) db.kazanimIslenmeKayitlari = { ...db.kazanimIslenmeKayitlari, [sinifId]: yeniKazanim };
    kaydet(db);
  } catch (err) {
    db.gunlukKayitlar = oncekiGunluk;
    db.sonGunlukId = oncekiSonGunlukId;
    db.gelmedi = oncekiGelmedi;
    db.gunlukIslendi = oncekiIslendi;
    db.dersYapilmadi = oncekiYapilmadi;
    db.kazanimIslenmeKayitlari = oncekiKazanim;
    throw err;
  }
}

export function sinifIslenenKazanimSayisi(sinifId: number, ders?: string): number {
  const kayitlar = db.kazanimIslenmeKayitlari[sinifId];
  if (!kayitlar) return 0;
  const dersKazanimlari = ders
    ? new Set(db.kazanimTanimlari.filter((k) => normMetin(k.ders) === normMetin(ders)).map((k) => k.id))
    : null;
  return Object.values(kayitlar).filter((k) => k.islendi && (!dersKazanimlari || dersKazanimlari.has(k.kazanimId))).length;
}

/** Yıllık plan içe aktarma önizlemesinin "eşleşecek/yeni" tahminini gerçek
 *  kimlikle hesaplayabilmesi için — bkz. kazanimKimlikUret'in ogretimYili girdisi. */
export function aktifOgretimYiliGetir(): string {
  return db.ayarlar.aktifOgretimYili;
}

/** Kazanım takibi öğretmen için opsiyonel — kapalıyken UI'da gizlenir, veri silinmez. */
export function kazanimTakibiAktifMi(): boolean {
  return db.ayarlar.kazanimTakibiAktif;
}

export function kazanimTakibiAyarla(aktif: boolean): void {
  const onceki = db.ayarlar.kazanimTakibiAktif;
  db.ayarlar.kazanimTakibiAktif = aktif;
  try {
    kaydet(db);
  } catch (err) {
    db.ayarlar.kazanimTakibiAktif = onceki;
    throw err;
  }
  if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent("oa-senkron", { detail: "Ayarlar güncellendi" }));
}

/** Hiçbir kaynakta (katılım/ödev/sınav/MEBİ/kitap) veri yokken "Dönem Performansı"
 *  kartında gösterilecek puan — eskiden sabit 50 idi (katılım normalizasyonunun
 *  "taban" değeri, veri yokluğuna sızmıştı); artık öğretmen seçer (gerçek kullanıcı
 *  isteği: "isterse sıfır isterse başka değer olsun"). Risk motorunu ETKİLEMEZ
 *  (lib/ogrenciRisk.ts kasıtlı olarak ayrı bir kuralla veri yoksa 100/nötr sayar —
 *  "eksik veri asla risk üretmez"); yalnız lib/ogrenciOzet.ts'teki gösterim puanı. */
/** Okul profili: okul adı, öğretmen, müdür, ilçe. Bir kez Ayarlar'da girilir;
 *  ŞÖK, Dağıtım, Sınav Analizi ve yeni sınav başlığı buradan dolar (eskiden her
 *  belgede elle yazılıyordu — 2026-09 kullanıcı denetimi). */
export interface OkulProfili { okulAdi: string; ogretmenAdi: string; okulMuduru: string; ilce: string }
const BOS_OKUL_PROFILI: OkulProfili = { okulAdi: "", ogretmenAdi: "", okulMuduru: "", ilce: "" };
function okulProfiliNormallestir(h: unknown): OkulProfili | undefined {
  if (!h || typeof h !== "object") return undefined;
  const o = h as Record<string, unknown>;
  const m = (k: string) => (typeof o[k] === "string" ? (o[k] as string).slice(0, 200) : "");
  return { okulAdi: m("okulAdi"), ogretmenAdi: m("ogretmenAdi"), okulMuduru: m("okulMuduru"), ilce: m("ilce") };
}
export function okulProfiliGetir(): OkulProfili {
  return { ...BOS_OKUL_PROFILI, ...(db.ayarlar.okulProfili ?? {}) };
}
// ─── e-Okul'dan okul/öğretmen bilgisi (2026-10) ────────────────────────────
// Eklenti her e-Okul gönderiminde sayfa başlığını da yollar ("eokul-profil").
// Kural: Okul profilinin BOŞ alanları doldurulur; DOLU alan e-Okul'dakinden farklıysa
// üzerine yazılmaz, öneri olarak saklanır ve Ayarlar'da sorulur. Müdür adı e-Okul
// öğretmen ekranında yok → elle kalır.
function eokulProfilNormallestir(v: unknown): (EokulProfilHam & { zaman: string }) | undefined {
  if (!v || typeof v !== "object") return undefined;
  const o = v as Record<string, unknown>;
  const m = (k: string, n = 200) => (typeof o[k] === "string" && (o[k] as string).trim() ? (o[k] as string).slice(0, n) : undefined);
  const r = {
    ogretmenAdi: m("ogretmenAdi", 120), okulAdi: m("okulAdi"), il: m("il", 60), ilce: m("ilce", 60),
    kurumKodu: m("kurumKodu", 10), ogretimYili: m("ogretimYili", 9),
    donem: o.donem === 1 || o.donem === 2 ? (o.donem as 1 | 2) : undefined,
    zaman: m("zaman", 40) ?? "",
  };
  return Object.fromEntries(Object.entries(r).filter(([, x]) => x !== undefined)) as unknown as EokulProfilHam & { zaman: string };
}
function eokulOneriNormallestir(v: unknown): Partial<Pick<OkulProfili, "okulAdi" | "ogretmenAdi" | "ilce">> | undefined {
  if (!v || typeof v !== "object") return undefined;
  const o = v as Record<string, unknown>;
  const r: Partial<Pick<OkulProfili, "okulAdi" | "ogretmenAdi" | "ilce">> = {};
  for (const k of ["okulAdi", "ogretmenAdi", "ilce"] as const) if (typeof o[k] === "string" && (o[k] as string).trim()) r[k] = (o[k] as string).slice(0, 200);
  return Object.keys(r).length ? r : undefined;
}
const esitMi = (a: string, b: string) => a.trim().toLocaleLowerCase("tr-TR") === b.trim().toLocaleLowerCase("tr-TR");

export function eokulProfilIsle(p: EokulProfilHam): { doldurulan: string[]; farkli: string[] } {
  const oncekiAyar = db.ayarlar;
  const profil = { ...BOS_OKUL_PROFILI, ...(db.ayarlar.okulProfili ?? {}) };
  const gelen: Partial<Pick<OkulProfili, "okulAdi" | "ogretmenAdi" | "ilce">> = {
    ...(p.okulAdi ? { okulAdi: p.okulAdi } : {}), ...(p.ogretmenAdi ? { ogretmenAdi: p.ogretmenAdi } : {}), ...(p.ilce ? { ilce: p.ilce } : {}),
  };
  const ad: Record<string, string> = { okulAdi: "okul adı", ogretmenAdi: "öğretmen adı", ilce: "ilçe" };
  const doldurulan: string[] = [], farkli: string[] = [];
  const oneri: Partial<Pick<OkulProfili, "okulAdi" | "ogretmenAdi" | "ilce">> = {};
  for (const [k, v] of Object.entries(gelen) as Array<[keyof typeof gelen, string]>) {
    if (!profil[k].trim()) { profil[k] = v; doldurulan.push(ad[k]); }
    else if (!esitMi(profil[k], v)) { oneri[k] = v; farkli.push(ad[k]); }
  }
  db.ayarlar = {
    ...db.ayarlar,
    okulProfili: okulProfiliNormallestir(profil),
    eokulProfil: eokulProfilNormallestir({ ...p, zaman: simdiYerelISO() }),
    eokulProfilOnerisi: Object.keys(oneri).length ? oneri : undefined,
  };
  try {
    kaydet(db);
  } catch (err) {
    db.ayarlar = oncekiAyar;
    throw err;
  }
  return { doldurulan, farkli };
}

export function eokulProfilGetir(): (EokulProfilHam & { zaman: string }) | undefined {
  return db.ayarlar.eokulProfil;
}
export function eokulProfilOnerisiGetir(): Partial<Pick<OkulProfili, "okulAdi" | "ogretmenAdi" | "ilce">> | undefined {
  return db.ayarlar.eokulProfilOnerisi;
}
/** Öneriyi uygula (true) ya da yoksay (false). */
export function eokulProfilOnerisiKapat(uygula: boolean): void {
  const onceki = db.ayarlar;
  const o = db.ayarlar.eokulProfilOnerisi;
  if (!o) return;
  db.ayarlar = {
    ...db.ayarlar,
    okulProfili: uygula ? okulProfiliNormallestir({ ...BOS_OKUL_PROFILI, ...(db.ayarlar.okulProfili ?? {}), ...o }) : db.ayarlar.okulProfili,
    eokulProfilOnerisi: undefined,
  };
  try {
    kaydet(db);
  } catch (err) {
    db.ayarlar = onceki;
    throw err;
  }
}

export function okulProfiliKaydet(p: OkulProfili): void {
  const onceki = db.ayarlar.okulProfili;
  db.ayarlar.okulProfili = okulProfiliNormallestir({
    okulAdi: p.okulAdi.trim(), ogretmenAdi: p.ogretmenAdi.trim(), okulMuduru: p.okulMuduru.trim(), ilce: p.ilce.trim(),
  });
  try {
    kaydet(db);
  } catch (err) {
    db.ayarlar.okulProfili = onceki;
    throw err;
  }
}

/** Bilgisayar DIŞINA (dosya olarak) en son ne zaman tam yedek alındı. Yedek
 *  hatırlatması buna bakar (components/YedekHatirlatmaBanner.tsx). */
export function sonYedekZamaniGetir(): string | null {
  return db.ayarlar.sonYedekZamani ?? null;
}

export function yedekAlindiIsaretle(): void {
  const onceki = db.ayarlar.sonYedekZamani;
  db.ayarlar.sonYedekZamani = simdiYerelISO();
  try {
    kaydet(db);
  } catch (err) {
    db.ayarlar.sonYedekZamani = onceki;
    throw err;
  }
}

// ── Telefon ↔ Chrome eklentisi karekod köprüsü (lib/eklentiKarekod.ts) ──
export interface EklentiEslesmeKaydi { kimlik: string; anahtar: string }
const EKLENTI_PAKET_IZ_SINIRI = 50;

function eklentiEslesmeNormallestir(h: unknown): EklentiEslesmeKaydi | undefined {
  if (!h || typeof h !== "object") return undefined;
  const o = h as Record<string, unknown>;
  if (typeof o.kimlik !== "string" || !/^[0-9a-f]{8}$/.test(o.kimlik)) return undefined;
  if (typeof o.anahtar !== "string" || !/^[A-Za-z0-9_-]{43}$/.test(o.anahtar)) return undefined;
  return { kimlik: o.kimlik, anahtar: o.anahtar };
}
function eklentiPaketKimlikleriNormallestir(h: unknown): string[] | undefined {
  if (!Array.isArray(h)) return undefined;
  return h.filter((x): x is string => typeof x === "string" && /^[0-9a-f]{16}$/.test(x)).slice(-EKLENTI_PAKET_IZ_SINIRI);
}

export function eklentiEslesmeGetir(): EklentiEslesmeKaydi | null {
  return db.ayarlar.eklentiEslesme ?? null;
}
export function eklentiEslesmeKaydet(e: EklentiEslesmeKaydi): void {
  const temiz = eklentiEslesmeNormallestir(e);
  if (!temiz) throw new Error("Eşleşme bilgisi geçersiz.");
  const onceki = db.ayarlar;
  db.ayarlar = { ...db.ayarlar, eklentiEslesme: temiz };
  try {
    kaydet(db);
  } catch (err) {
    db.ayarlar = onceki;
    throw err;
  }
}
export function eklentiEslesmeSil(): void {
  const onceki = db.ayarlar;
  const { eklentiEslesme: _silinen, ...kalan } = db.ayarlar;
  void _silinen;
  db.ayarlar = kalan;
  try {
    kaydet(db);
  } catch (err) {
    db.ayarlar = onceki;
    throw err;
  }
}
export function eklentiIslenenPaketlerGetir(): string[] {
  return [...(db.ayarlar.eklentiIslenenPaketler ?? [])];
}
/** Paket kimliğini işlenmiş olarak ekler; son 50 kimlik tutulur. */
export function eklentiPaketiIslendiIsaretle(paketId: string): void {
  if (!/^[0-9a-f]{16}$/.test(paketId)) throw new Error("Paket kimliği geçersiz.");
  const onceki = db.ayarlar;
  const liste = (db.ayarlar.eklentiIslenenPaketler ?? []).filter((x) => x !== paketId);
  db.ayarlar = { ...db.ayarlar, eklentiIslenenPaketler: [...liste, paketId].slice(-EKLENTI_PAKET_IZ_SINIRI) };
  try {
    kaydet(db);
  } catch (err) {
    db.ayarlar = onceki;
    throw err;
  }
}

/** Kayıtlı ders içi ayarını doğrular; bozuk/eksik alan varsayılana döner. Eski kurulumda
 *  ayar yoksa: öğretmen eski "katılım taban puanı"nı 50'den farklı ayarlamışsa o değer
 *  başlangıç olur (onun bilinçli seçimi), aksi halde "Dengeli" (75). */
function dersIciNormallestir(v: unknown, eskiTaban: unknown): DersIciAyar {
  const varsayilan: DersIciAyar = {
    ...VARSAYILAN_DERS_ICI,
    baslangic: typeof eskiTaban === "number" && Number.isFinite(eskiTaban) && eskiTaban !== 50 && eskiTaban >= 0 && eskiTaban <= 100
      ? Math.round(eskiTaban) : VARSAYILAN_DERS_ICI.baslangic,
  };
  if (!v || typeof v !== "object") return varsayilan;
  const o = v as Partial<DersIciAyar>;
  const bantlar = (x: unknown, yedek: DersIciBant[]) => Array.isArray(x) && x.length > 0 && x.length <= 6
    && x.every((b) => b && Number.isFinite(b.esik) && Number.isFinite(b.puan))
    ? x.map((b) => ({ esik: Number(b.esik), puan: Number(b.puan) })) : yedek;
  const paylar: Record<number, number> = {};
  if (o.olcekPaylari && typeof o.olcekPaylari === "object") {
    for (const [k, p] of Object.entries(o.olcekPaylari)) if (Number.isInteger(Number(k)) && Number.isFinite(p) && (p as number) >= 0) paylar[Number(k)] = p as number;
  }
  return {
    mod: o.mod === "olcek" ? "olcek" : "bant",
    baslangic: Number.isFinite(o.baslangic) && (o.baslangic as number) >= 0 && (o.baslangic as number) <= 100 ? (o.baslangic as number) : varsayilan.baslangic,
    olumluBantlar: bantlar(o.olumluBantlar, varsayilan.olumluBantlar),
    olumsuzBantlar: bantlar(o.olumsuzBantlar, varsayilan.olumsuzBantlar),
    olcekPaylari: paylar,
    tamPuanOrani: Number.isFinite(o.tamPuanOrani) && (o.tamPuanOrani as number) >= 1 && (o.tamPuanOrani as number) <= 100 ? (o.tamPuanOrani as number) : VARSAYILAN_DERS_ICI.tamPuanOrani,
  };
}

/** Ders içi puanlama ayarı (core/dersIci.ts). Her zaman tam/geçerli bir nesne döner. */
// ─── Performans şablonu (2026-10) ───────────────────────────────────────────
/** OA69: `ders` — notun hangi derse ait olduğu (aynı şubede iki ders). Eski kayıtta yok → açılış
 *  göçü öğrencinin sınıfının ilk dersini yazar. Tek dersli sınıfta hesaba etkisi yoktur. */
export interface ElleNot { kalemId: string; ogrenciId: number; donem: 1 | 2; puan: number; ders?: string }

function sablonlariNormallestir(v: unknown): { 1?: PerformansSablonu; 2?: PerformansSablonu } {
  const o = (v && typeof v === "object" ? v : {}) as Record<string, unknown>;
  const r: { 1?: PerformansSablonu; 2?: PerformansSablonu } = {};
  const s1 = sablonNormallestir(o["1"]); if (s1) r[1] = s1;
  const s2 = sablonNormallestir(o["2"]); if (s2) r[2] = s2;
  return r;
}
function okunamayanDuzenler(v: unknown, onceki: unknown): Array<{ donem: 1 | 2; ham: string }> | undefined {
  const o = (v && typeof v === "object" ? v : {}) as Record<string, unknown>;
  const r: Array<{ donem: 1 | 2; ham: string }> = Array.isArray(onceki)
    ? onceki.filter((x): x is { donem: 1 | 2; ham: string } => !!x && (x.donem === 1 || x.donem === 2) && typeof x.ham === "string").slice(0, 2)
    : [];
  for (const d of [1, 2] as const) {
    if (o[String(d)] != null && !duzenNormallestir(o[String(d)]) && !r.some((x) => x.donem === d)) {
      try { r.push({ donem: d, ham: JSON.stringify(o[String(d)]).slice(0, 20000) }); } catch { /* döngüsel değer */ }
    }
  }
  return r.length ? r : undefined;
}

function duzenleriNormallestir(v: unknown): { 1?: PerformansDuzeni; 2?: PerformansDuzeni } {
  const o = (v && typeof v === "object" ? v : {}) as Record<string, unknown>;
  const r: { 1?: PerformansDuzeni; 2?: PerformansDuzeni } = {};
  const d1 = duzenNormallestir(o["1"]); if (d1) r[1] = d1;
  const d2 = duzenNormallestir(o["2"]); if (d2) r[2] = d2;
  return r;
}
export interface PerformansIstisnasi { ogrenciId: number; donem: 1 | 2; kalem: string }
function istisnalariNormallestir(v: unknown): PerformansIstisnasi[] {
  if (!Array.isArray(v)) return [];
  return v.filter((x): x is PerformansIstisnasi => !!x && Number.isInteger(x.ogrenciId) && (x.donem === 1 || x.donem === 2)
    && typeof x.kalem === "string" && x.kalem.length > 0 && x.kalem.length < 40);
}
function olumluEklemeleriNormallestir(v: unknown): OlumluEkleme[] {
  if (!Array.isArray(v)) return [];
  return v.filter((x): x is OlumluEkleme => !!x && Number.isInteger(x.ogrenciId) && (x.donem === 1 || x.donem === 2)
    && Number.isInteger(x.sutun) && x.sutun >= 1 && x.sutun <= 3 && Number.isFinite(x.puan) && x.puan > 0 && x.puan <= 100
    && (x.ders === undefined || (typeof x.ders === "string" && x.ders.length < 100)));
}
function elleNotlariNormallestir(v: unknown): ElleNot[] {
  if (!Array.isArray(v)) return [];
  return v.filter((n): n is ElleNot => !!n && typeof n.kalemId === "string" && Number.isInteger(n.ogrenciId)
    && (n.donem === 1 || n.donem === 2) && Number.isFinite(n.puan) && n.puan >= 0 && n.puan <= 100)
    .map((n) => (n.ders === undefined || typeof n.ders === "string" ? n : { ...n, ders: undefined }));
}

/** OA69: derse özel düzenler. Bozuk dönem kaydı atılır (ortak düzene düşer); hiç geçerli dönemi
 *  kalmayan ders de "ayrı düzen açık" sayılır — öğretmenin anahtarı kaybolmasın, boş giriş ortak düzeni verir. */
function dersDuzenleriNormallestir(v: unknown): Record<string, { 1?: PerformansDuzeni; 2?: PerformansDuzeni }> | undefined {
  if (!v || typeof v !== "object" || Array.isArray(v)) return undefined;
  const r: Record<string, { 1?: PerformansDuzeni; 2?: PerformansDuzeni }> = {};
  for (const [k, x] of Object.entries(v as Record<string, unknown>)) {
    const anahtar = dersAnahtari(k);
    if (!anahtar) continue;
    r[anahtar] = duzenleriNormallestir(x);
  }
  return Object.keys(r).length ? r : undefined;
}

/** Dönemin performans şablonu. Öğretmen hiç kurmadıysa eski ağırlıklardan TEK gruplu
 *  şablon türetilir — güncelleme sonrası notlar kendiliğinden değişmez. */
export function performansSablonuGetir(donem: number, ders?: string): PerformansSablonu {
  const d = donem === 2 ? 2 : 1;
  // OA69: dersin ayrı düzeni varsa şablon onun 1. Performans'ı (Kart/PDF başlıkları notla aynı kalsın).
  const dersin = dersDuzeni(d, ders);
  if (dersin) return dersin.sutunlar[0].sablon;
  const kayitli = db.ayarlar.performansSablonlari?.[d];
  if (kayitli) return kayitli;
  // 2. dönem düzeni 1. dönemden DEVRALINIYORSA (performansDuzeniKaynagi = "birinciDonem") şablon da
  // o düzenin 1. Performans'ından gelmeli. Eskiden burada 2. dönemin eski varsayılan ağırlıkları
  // dönüyordu → not düzenle doğru hesaplanırken PDF başlığı/sütunları ve Öğrenci Kartı başka
  // kalemleri gösteriyordu. (1. sütun hiçbir zaman "aynı not" olamaz, şablonu hep kendisindedir.)
  const devralinan = d === 2 ? db.ayarlar.performansDuzenleri?.[1]?.sutunlar[0]?.sablon : undefined;
  if (devralinan) return devralinan;
  const agirlik = db.donemAgirliklari.filter((a) => a.donem === d);
  // Denetim (2026-10): 2. dönem ağırlığı hiç yoksa kalemsiz bir grup çıkıyordu → 1. dönemdekiyle devam.
  if (d === 2 && !agirlik.some((a) => a.agirlik > 0)) return performansSablonuGetir(1);
  return agirliklardanSablon(agirlik);
}

/** Öğretmen şablonu kendisi kaydetti mi (türetilmiş değil)? */
export function performansSablonuOzelMi(donem: number): boolean {
  return !!db.ayarlar.performansSablonlari?.[donem === 2 ? 2 : 1];
}

export function performansSablonuKaydet(donem: number, s: PerformansSablonu): void {
  const d: 1 | 2 = donem === 2 ? 2 : 1;
  const hata = sablonHatasi(s);
  if (hata) throw new Error(hata);
  const temiz = sablonNormallestir(s);
  if (!temiz) throw new Error("Şablon kaydedilemedi: geçersiz değer.");
  const oncekiAyar = db.ayarlar, oncekiAg = db.donemAgirliklari;
  try {
    const duzen = db.ayarlar.performansDuzenleri?.[d];
    db.ayarlar = {
      ...db.ayarlar,
      performansSablonlari: { ...(db.ayarlar.performansSablonlari ?? {}), [d]: temiz },
      // Düzen kurulduysa tek şablonu yazan eski yol 1. sütunu günceller (ikisi ayrışmasın).
      ...(duzen ? { performansDuzenleri: { ...db.ayarlar.performansDuzenleri, [d]: { sutunlar: duzen.sutunlar.map((x, i) => (i === 0 ? { sablon: temiz } : x)) } } } : {}),
    };
    // Eski "ağırlık" okuyan yerler (Hızlı İşleme etkisi, telefon paketi) tutarlı kalsın:
    // kalem başına gerçek ağırlık eski listeye de yazılır.
    db.donemAgirliklari = [
      ...db.donemAgirliklari.filter((a) => a.donem !== d),
      ...etkinAgirliklar(temiz).map((a) => ({ donem: d, kriterGrubu: a.kriterGrubu, agirlik: a.agirlik })),
    ];
    kaydet(db);
  } catch (err) {
    db.ayarlar = oncekiAyar; db.donemAgirliklari = oncekiAg;
    throw err;
  }
  try {
    logEkle({ kaynak: "sistem", seviye: "bilgi", baslik: `${d}. dönem performans şablonu değişti`,
      mesaj: temiz.gruplar.map((g) => `${g.ad} %${g.yuzde}: ${g.kalemler.map((k) => `${kalemAdi(k)} %${k.yuzde}`).join(", ")}`).join(" · ") });
  } catch { /* şablon kaydedildi; iz yazılamadıysa kaydı geri almayız */ }
}

/** Dönemin performans DÜZENİ (OA54). Öğretmen kurmadıysa şablondan tek sütun —
 *  güncellemede notlar ve Performans Aktar davranışı DEĞİŞMEZ. */
export function performansDuzeniGetir(donem: number, ders?: string): PerformansDuzeni {
  const d = donem === 2 ? 2 : 1;
  const dersin = dersDuzeni(d, ders);
  if (dersin) return dersin;
  const kayitli = db.ayarlar.performansDuzenleri?.[d];
  if (kayitli) return kayitli;
  // Denetim (2026-10): 1. dönemde kurulan düzen 2. döneme geçmiyordu (Şubat'ta eski varsayılanla
  // hesaplanıyordu). 2. dönem için ayrı bir şey kaydedilmediyse 1. dönemin düzeni geçerlidir.
  // (Eski kullanıcıda ikisi de yok → değişiklik yok.)
  if (d === 2 && db.ayarlar.performansDuzenleri?.[1] && !db.ayarlar.performansSablonlari?.[2]) return db.ayarlar.performansDuzenleri[1];
  return sablondanDuzen(performansSablonuGetir(d));
}

/** OA69: dersin ayrı düzeni (öğretmen açtıysa). Dönem kaydı yoksa 2. dönem dersin 1. dönemini
 *  devralır (ortak düzendeki kuralla aynı: Şubat'ta sessizce ortak düzene dönmesin); o da yoksa
 *  undefined → ortak düzen. Ders verilmezse ya da ayrı düzen kapalıysa undefined. */
function dersDuzeni(d: 1 | 2, ders?: string): PerformansDuzeni | undefined {
  if (!ders) return undefined;
  const g = db.ayarlar.performansDuzenleriDers?.[dersAnahtari(ders)];
  if (!g) return undefined;
  return g[d] ?? (d === 2 ? g[1] : undefined);
}

/** OA69: bu ders için "ayrı düzen" açık mı (Ayarlar → Performans notu anahtarı). */
export function performansDuzeniDersAyriMi(ders: string): boolean {
  return !!db.ayarlar.performansDuzenleriDers?.[dersAnahtari(ders)];
}

/** OA69: ayrı düzeni olan derslerin anahtarları (dersAnahtari biçiminde). */
export function performansDuzeniAyriDersler(): string[] {
  return Object.keys(db.ayarlar.performansDuzenleriDers ?? {});
}

/** OA69: dersi ayrı düzene geçir / ortak düzene döndür. Açarken ortak düzenin O ANKİ hâli
 *  verilen dönem için kopyalanır (öğretmen sıfırdan başlamasın, notlar değişmeden başlar).
 *  Kapatınca dersin iki dönemlik kaydı silinir → ortak düzen geçerli olur. */
export function performansDuzeniDersAyir(ders: string, donem: number, ayri: boolean): void {
  const anahtar = dersAnahtari(ders);
  if (!anahtar) throw new Error("Ders adı boş olamaz.");
  const d: 1 | 2 = donem === 2 ? 2 : 1;
  const onceki = db.ayarlar;
  const liste = { ...(db.ayarlar.performansDuzenleriDers ?? {}) };
  if (ayri) {
    if (liste[anahtar]) return;
    liste[anahtar] = { [d]: performansDuzeniGetir(d) };
  } else {
    if (!liste[anahtar]) return;
    delete liste[anahtar];
  }
  try {
    db.ayarlar = { ...db.ayarlar, performansDuzenleriDers: Object.keys(liste).length ? liste : undefined };
    kaydet(db);
  } catch (err) {
    db.ayarlar = onceki;
    throw err;
  }
  try {
    logEkle({ kaynak: "sistem", seviye: "bilgi", baslik: ayri ? `${ders}: ayrı performans düzeni açıldı` : `${ders}: ortak performans düzenine dönüldü`,
      mesaj: ayri ? "Başlangıçta ortak düzenin kopyası; bu dersin notları ortak düzen değişince artık değişmez." : "Bu dersin ayrı düzeni silindi." });
  } catch { /* ayar kaydedildi */ }
}

/** Ekranda söylemek için: dönemin düzeni nereden geliyor. */
export function performansDuzeniKaynagi(donem: number, ders?: string): "kendi" | "birinciDonem" | "eski" {
  const d = donem === 2 ? 2 : 1;
  const g = ders ? db.ayarlar.performansDuzenleriDers?.[dersAnahtari(ders)] : undefined;
  if (g) {
    if (g[d]) return "kendi";
    if (d === 2 && g[1]) return "birinciDonem";
  }
  if (db.ayarlar.performansDuzenleri?.[d]) return "kendi";
  if (d === 2 && db.ayarlar.performansDuzenleri?.[1] && !db.ayarlar.performansSablonlari?.[2]) return "birinciDonem";
  return "eski";
}

/** Bozuk kayıttan okunamayan düzen var mı (ekranda uyarı). */
export function performansDuzeniOkunamadiMi(donem: number): boolean {
  return !!db.ayarlar.performansDuzeniOkunamadi?.some((x) => x.donem === (donem === 2 ? 2 : 1));
}

export function performansDuzeniOzelMi(donem: number, ders?: string): boolean {
  const d = donem === 2 ? 2 : 1;
  if (ders && dersDuzeni(d, ders)) return true;
  return !!db.ayarlar.performansDuzenleri?.[d];
}

export function performansDuzeniKaydet(donem: number, duzen: PerformansDuzeni, ders?: string): void {
  const d: 1 | 2 = donem === 2 ? 2 : 1;
  const hata = duzenHatasi(duzen);
  if (hata) throw new Error(hata);
  const temiz = duzenNormallestir(duzen);
  if (!temiz) throw new Error("Performans düzeni kaydedilemedi: geçersiz değer.");
  // OA69: ayrı düzeni AÇIK derse kayıt yalnız o dersin kaydını yazar. Ortak düzen, şablon ve
  // donemAgirliklari'na dokunulmaz — telefon/Hızlı İşleme ortak düzeni okur, öteki dersler etkilenmez.
  const dersAn = ders ? dersAnahtari(ders) : "";
  if (dersAn && db.ayarlar.performansDuzenleriDers?.[dersAn]) {
    const onceki = db.ayarlar;
    try {
      const liste = db.ayarlar.performansDuzenleriDers;
      db.ayarlar = { ...db.ayarlar, performansDuzenleriDers: { ...liste, [dersAn]: { ...liste[dersAn], [d]: temiz } } };
      kaydet(db);
    } catch (err) {
      db.ayarlar = onceki;
      throw err;
    }
    try {
      logEkle({ kaynak: "sistem", seviye: "bilgi", baslik: `${ders}: ${d}. dönem performans notu düzeni değişti`,
        mesaj: temiz.sutunlar.map((x, i) => x.ayni != null ? `${sutunAdi(i)} = ${sutunAdi(x.ayni)}` : `${sutunAdi(i)}: ${x.sablon.gruplar.map((g) => `${g.ad} %${g.yuzde}`).join(" · ")}`).join(" | ") });
    } catch { /* düzen kaydedildi */ }
    return;
  }
  const oncekiAyar = db.ayarlar, oncekiAg = db.donemAgirliklari;
  try {
    const ilk = temiz.sutunlar[0].sablon;
    db.ayarlar = {
      ...db.ayarlar,
      performansDuzenleri: { ...(db.ayarlar.performansDuzenleri ?? {}), [d]: temiz },
      performansDuzeniOkunamadi: (db.ayarlar.performansDuzeniOkunamadi ?? []).filter((x) => x.donem !== d).length
        ? (db.ayarlar.performansDuzeniOkunamadi ?? []).filter((x) => x.donem !== d) : undefined,
      // Eski sürüme dönülürse ya da tek şablon okuyan yer kalırsa: 1. sütun.
      performansSablonlari: { ...(db.ayarlar.performansSablonlari ?? {}), [d]: ilk },
    };
    // Eski "ağırlık" okuyanlar (telefon paketi): kalemin dönem performansındaki gerçek ortalama
    // ağırlığı ("aynı not" sütunu da sayılır — denetim 2026-10; eskiden yalnız kendi hesabı olanlar).
    db.donemAgirliklari = [
      ...db.donemAgirliklari.filter((a) => a.donem !== d),
      ...duzenEtkinAgirliklar(temiz).map((a) => ({ donem: d, kriterGrubu: a.kriterGrubu, agirlik: a.agirlik })),
    ];
    kaydet(db);
  } catch (err) {
    db.ayarlar = oncekiAyar; db.donemAgirliklari = oncekiAg;
    throw err;
  }
  try {
    logEkle({ kaynak: "sistem", seviye: "bilgi", baslik: `${d}. dönem performans notu düzeni değişti`,
      mesaj: temiz.sutunlar.map((x, i) => x.ayni != null ? `${sutunAdi(i)} = ${sutunAdi(x.ayni)}`
        : `${sutunAdi(i)}: ${x.sablon.gruplar.map((g) => `${g.ad} %${g.yuzde} (${g.kalemler.map((k) => `${kalemAdi(k)} %${k.yuzde}`).join(", ")})`).join(" · ")}`).join(" | ") });
  } catch { /* düzen kaydedildi; iz yazılamadıysa kaydı geri almayız */ }
}

/** Bir elle kalemin bir sınıftaki notları (ogrenciId → puan). */
/** OA69: elle not bu derse mi ait? `ders` verilmezse hepsi (eski davranış — tek dersli sınıf).
 *  Notun dersi öğrencinin sınıfının derslerinden hiçbiri değilse (ders adı değişti) ilk derse sayılır. */
function elleNotDerseUyar(n: ElleNot, ders?: string): boolean {
  if (!ders) return true;
  const sinifId = ogrenciGetir(n.ogrenciId)?.sinifId;
  const dersler = sinifId === undefined ? [] : sinifDersListesi(sinifId).map(dersAnahtari);
  let nd = dersAnahtari(n.ders);
  if (!nd || (dersler.length && !dersler.includes(nd))) nd = dersler[0] ?? nd;
  return nd === dersAnahtari(ders);
}

/** Bir elle kalemin bir sınıftaki notları (ogrenciId → puan). OA69: `ders` verilirse yalnız o dersin notları. */
export function elleNotlariGetir(kalemId: string, donem: 1 | 2, ders?: string): Map<number, number> {
  const m = new Map<number, number>();
  for (const n of db.elleNotlar ?? []) if (n.kalemId === kalemId && n.donem === donem && elleNotDerseUyar(n, ders)) m.set(n.ogrenciId, n.puan);
  return m;
}

/** Öğrencinin elle notları (kalemId → puan) — verilen dönemde. OA69: `ders` verilirse yalnız o dersin. */
export function ogrenciElleNotlari(ogrenciId: number, donem: 1 | 2, ders?: string): Record<string, number> {
  const r: Record<string, number> = {};
  const t = T();
  t.elleByOgrenci ??= grupla(db.elleNotlar ?? [], (n) => n.ogrenciId);
  for (const n of t.elleByOgrenci.get(ogrenciId) ?? []) if (n.donem === donem && elleNotDerseUyar(n, ders)) r[n.kalemId] = n.puan;
  return r;
}

/** Bir kalemin notlarını toplu yazar (null = notu sil). Hepsi ya yazılır ya hiçbiri.
 *  OA69: `ders` verilirse yalnız o dersin notu değişir (öteki dersinki kalır); verilmezse eskisi gibi
 *  öğrencinin bu kalemdeki notu değişir ve yeni not sınıfın ilk dersine yazılır. */
export function elleNotlariKaydet(kalemId: string, donem: 1 | 2, kayitlar: Array<{ ogrenciId: number; puan: number | null }>, ders?: string): void {
  for (const k of kayitlar) {
    if (k.puan != null && (!Number.isFinite(k.puan) || k.puan < 0 || k.puan > 100)) throw new Error("Not 0 ile 100 arasında olmalı.");
  }
  const onceki = db.elleNotlar ?? [];
  const degisen = new Set(kayitlar.map((k) => k.ogrenciId));
  const yeni = onceki.filter((n) => !(n.kalemId === kalemId && n.donem === donem && degisen.has(n.ogrenciId) && elleNotDerseUyar(n, ders)));
  for (const k of kayitlar) {
    if (k.puan == null) continue;
    const notDersi = ders?.trim() || sinifIlkDersi(db.siniflar, db.ogrenciler.find((o) => o.id === k.ogrenciId)?.sinifId);
    yeni.push({ kalemId, donem, ogrenciId: k.ogrenciId, puan: Math.round(k.puan * 10) / 10, ...(notDersi ? { ders: notDersi } : {}) });
  }
  db.elleNotlar = yeni;
  try {
    kaydet(db);
  } catch (err) {
    db.elleNotlar = onceki;
    throw err;
  }
}

/** Öğrencide hesaba katılmayan kalemler (kaynak "olumlu" ya da elle kimliği). "yil": iki dönemin birleşimi. */
export function ogrenciPerformansIstisnalari(ogrenciId: number, donem: 1 | 2 | "yil"): Set<string> {
  const t = T();
  t.istisnaByOgrenci ??= grupla(db.performansIstisnalari ?? [], (x) => x.ogrenciId);
  return new Set((t.istisnaByOgrenci.get(ogrenciId) ?? []).filter((x) => donem === "yil" || x.donem === donem).map((x) => x.kalem));
}

/** Bu dönem istisnaların tamamı (Ayarlar'daki "kimde neyi kapattım" listesi; silinmiş öğrenciler atlanır). */
export function performansIstisnalariGetir(donem: 1 | 2): PerformansIstisnasi[] {
  const var_ = new Set(db.ogrenciler.map((o) => o.id));
  return (db.performansIstisnalari ?? []).filter((x) => x.donem === donem && var_.has(x.ogrenciId)).map((x) => ({ ...x }));
}

/** Bir kalemi bir öğrencide (o dönem) hesaba kat / katma. Sebep SAKLANMAZ (öğrencinin özel durumu uygulamaya yazılmaz). hesabaKatma=true → kalem bu öğrencide hesaba KATILMAZ. */
export function performansIstisnasiAyarla(ogrenciId: number, donem: 1 | 2, kalem: string, hesabaKatma: boolean): void {
  if (!db.ogrenciler.some((o) => o.id === ogrenciId)) throw new Error("Öğrenci bulunamadı.");
  if (!kalem || kalem.length >= 40) throw new Error("Geçersiz kalem.");
  const onceki = db.performansIstisnalari ?? [];
  const diger = onceki.filter((x) => !(x.ogrenciId === ogrenciId && x.donem === donem && x.kalem === kalem));
  db.performansIstisnalari = hesabaKatma ? [...diger, { ogrenciId, donem, kalem }] : diger;
  try {
    kaydet(db);
  } catch (err) {
    db.performansIstisnalari = onceki;
    throw err;
  }
}

// ─── OA76: dönem sonu olumlu davranış eki ───────────────────────────────────
export interface OlumluEkleme { ogrenciId: number; donem: 1 | 2; sutun: number; puan: number; ders?: string }

/** Öğrencinin o dönem (ve dersteki) ekleri: Performans no → puan. Ders verilmezse dersi olmayan ekler. */
export function ogrenciOlumluEkleri(ogrenciId: number, donem: 1 | 2, ders?: string): Partial<Record<number, number>> {
  const anahtar = ders ? dersAnahtari(ders) : undefined;
  const r: Partial<Record<number, number>> = {};
  for (const x of db.olumluEklemeleri ?? []) {
    if (x.ogrenciId !== ogrenciId || x.donem !== donem) continue;
    if ((x.ders ?? undefined) !== anahtar) continue;
    r[x.sutun] = (r[x.sutun] ?? 0) + x.puan;
  }
  return r;
}

/** Bir sınıfın (o dönem, o ders) eklerini YAZAR: verilen öğrencilerin eski satırları silinir, puanı > 0
 *  olanlar yazılır. Geri alma deseni (ZORUNLU KURAL) + İşlem Günlüğü. */
export function olumluEklemeleriKaydet(donem: 1 | 2, ders: string | undefined, satirlar: Array<{ ogrenciId: number; sutun: number; puan: number }>): void {
  const anahtar = ders ? dersAnahtari(ders) : undefined;
  for (const x of satirlar) {
    if (!db.ogrenciler.some((o) => o.id === x.ogrenciId)) throw new Error("Öğrenci bulunamadı.");
    if (!Number.isInteger(x.sutun) || x.sutun < 1 || x.sutun > 3) throw new Error("Geçersiz Performans.");
    if (!Number.isFinite(x.puan) || x.puan < 0 || x.puan > 100) throw new Error("Eklenecek puan 0 ile 100 arasında olmalı.");
  }
  const ids = new Set(satirlar.map((x) => x.ogrenciId));
  const onceki = db.olumluEklemeleri ?? [];
  const kalan = onceki.filter((x) => !(ids.has(x.ogrenciId) && x.donem === donem && (x.ders ?? undefined) === anahtar));
  const yeni = satirlar.filter((x) => x.puan > 0).map((x): OlumluEkleme => ({ ogrenciId: x.ogrenciId, donem, sutun: x.sutun, puan: x.puan, ...(anahtar ? { ders: anahtar } : {}) }));
  db.olumluEklemeleri = [...kalan, ...yeni];
  try {
    kaydet(db);
  } catch (err) {
    db.olumluEklemeleri = onceki;
    throw err;
  }
  try {
    logEkle({ kaynak: "sistem", seviye: "bilgi", baslik: "Olumlu davranış eki", mesaj: `${donem}. dönem${ders ? ` · ${ders}` : ""}: ${yeni.length} öğrenciye öğretmen kararıyla puan eklendi.` });
  } catch { /* günlük yazılamazsa asıl kayıt geçerli kalır */ }
}

/** Hiç kullanılmış elle kalem kimlikleri (düzenlerde + notu olanlar): yeni kalem silinmiş
 *  bir kalemin kimliğini (ve eski notlarını) devralmasın. */
export function kullanilmisElleKimlikleri(): Set<string> {
  const r = new Set((db.elleNotlar ?? []).map((n) => n.kalemId));
  for (const x of db.performansIstisnalari ?? []) if (x.kalem.startsWith("elle-")) r.add(x.kalem);
  for (const d of [1, 2] as const) for (const k of duzenKalemleri(performansDuzeniGetir(d))) if (k.kaynak === "elle") r.add(k.id);
  // OA69: derse özel düzenlerdeki elle kalemler de (ortak düzende yeni açılan kalem onların notunu devralmasın).
  for (const g of Object.values(db.ayarlar.performansDuzenleriDers ?? {})) {
    for (const x of [g[1], g[2]]) if (x) for (const k of duzenKalemleri(x)) if (k.kaynak === "elle") r.add(k.id);
  }
  return r;
}

/** Şablonlarda tanımlı elle kalemler (iki dönem birleşik, tekil). */
export function elleKalemleriGetir(): Array<{ id: string; ad: string; donemler: Array<1 | 2> }> {
  const r = new Map<string, { id: string; ad: string; donemler: Array<1 | 2> }>();
  // OA69: ortak düzen + derse özel düzenler (ayrı düzende açılan "Proje" de Elle Not ekranında görünsün).
  const ayriDersler = Object.keys(db.ayarlar.performansDuzenleriDers ?? {});
  for (const d of [1, 2] as const) {
    for (const duzen of [performansDuzeniGetir(d), ...ayriDersler.map((a) => performansDuzeniGetir(d, a))]) {
      for (const k of duzenKalemleri(duzen)) {
        if (k.kaynak !== "elle") continue;
        const v = r.get(k.id) ?? { id: k.id, ad: kalemAdi(k), donemler: [] };
        if (!v.donemler.includes(d)) v.donemler.push(d);
        r.set(k.id, v);
      }
    }
  }
  return [...r.values()];
}

export function dersIciAyarGetir(): DersIciAyar {
  return db.ayarlar.dersIci ?? dersIciNormallestir(undefined, db.ayarlar.katilimTabanPuani);
}

/** Ders içi puanlama ayarını kaydeder. Geçersizse (bant sırası, ölçek toplamı 100 değil…)
 *  hata fırlatır ve hiçbir şey değişmez. Değişiklik İşlem Günlüğü'ne yazılır. */
export function dersIciAyarKaydet(yeni: DersIciAyar): void {
  const olumluIdler = db.kriterler.filter((k) => k.tip === "arti").map((k) => k.id);
  // Önce HAM girdi doğrulanır: normalleştirme geçersiz değeri sessizce varsayılana
  // çevirirdi (öğretmen 120 yazar, 75 kaydedilir ve haberi olmaz).
  const hamHata = dersIciAyarHatasi(yeni, olumluIdler);
  if (hamHata) throw new Error(hamHata);
  const temiz = dersIciNormallestir(yeni, db.ayarlar.katilimTabanPuani);
  if (yeni.mod === "olcek") {
    // Ölçekte yalnız mevcut olumlu kriterlerin payı tutulur (silinmiş kriterin payı düşer).
    temiz.olcekPaylari = Object.fromEntries(olumluIdler.map((id) => [id, temiz.olcekPaylari[id] ?? 0]));
  }
  const hata = dersIciAyarHatasi(temiz, olumluIdler);
  if (hata) throw new Error(hata);
  const onceki = db.ayarlar;
  db.ayarlar = { ...db.ayarlar, dersIci: temiz };
  try {
    kaydet(db);
  } catch (err) {
    db.ayarlar = onceki;
    throw err;
  }
  try {
    islemGunluguEkle({
      kaynak: "sistem", seviye: "bilgi", baslik: "Ders içi puanlama değişti",
      mesaj: temiz.mod === "olcek"
        ? `Ölçek modu · tam puan için derslerin %${temiz.tamPuanOrani}'i`
        : `Başlangıç ${temiz.baslangic} · olumlu ${temiz.olumluBantlar.map((b) => `%${b.esik}+→+${b.puan}`).join(", ")} · olumsuz ${temiz.olumsuzBantlar.map((b) => `%${b.esik}+→−${b.puan}`).join(", ")}`,
    });
  } catch { /* günlük yazılamazsa ayar yine kaydedildi */ }
}

/** Hiç +/- almamış ("tamam") öğrencinin ders içi katılım puanı. Eskiden
 *  core/performans.ts'te 50 olarak sabitti; öğretmen kendi ölçeğine göre ayarlar. */
export function katilimTabanPuaniGetir(): number {
  return db.ayarlar.katilimTabanPuani;
}

export function katilimTabanPuaniAyarla(puan: number): void {
  if (!Number.isFinite(puan) || puan < 0 || puan > 100) throw new Error("Puan 0-100 arasında olmalı.");
  const onceki = db.ayarlar.katilimTabanPuani;
  db.ayarlar.katilimTabanPuani = Math.round(puan);
  try {
    kaydet(db);
  } catch (err) {
    db.ayarlar.katilimTabanPuani = onceki;
    throw err;
  }
}

export function veriYokPerformansPuaniGetir(): number {
  return db.ayarlar.veriYokPerformansPuani;
}

export function veriYokPerformansPuaniAyarla(puan: number): void {
  if (!Number.isFinite(puan) || puan < 0 || puan > 100) throw new Error("Puan 0-100 arasında olmalı.");
  const onceki = db.ayarlar.veriYokPerformansPuani;
  db.ayarlar.veriYokPerformansPuani = Math.round(puan);
  try {
    kaydet(db);
  } catch (err) {
    db.ayarlar.veriYokPerformansPuani = onceki;
    throw err;
  }
}

/**
 * Yeni Öğretim Yılı sihirbazı tamamlanınca çağrılır (bkz. lib/yilGecisi.ts).
 * Bunsuz yeni yılın kazanımları eski `aktifOgretimYili` etiketiyle yazılır ve
 * kazanim kimliğinin "aynı öğretim yılının kazanımı asla iki kere gelmez"
 * varsayımı bozulur.
 */
export function ogretimYiliIlerlet(kapananYil: string): void {
  const onceki = db.ayarlar;
  try {
    db.ayarlar = { ...db.ayarlar, aktifOgretimYili: sonrakiOgretimYili(kapananYil) };
    kaydet(db);
  } catch (err) {
    db.ayarlar = onceki;
    throw err;
  }
}

// ─── MEBİ (MASTER §3 — sadece oku; ad ile eşleşir, No yok) ─────────────────

const _normAd = (a: string) => a.toLocaleUpperCase("tr").replace(/\s+/g, " ").trim();

/**
 * 2026-09-24'e kadar bu {tamamlanan, toplam} özeti ayrı bir `db.mebiDurum`
 * tablosundan geliyordu — onu dolduran TEK yol (`mebiYazHam`, "mebi-modul"
 * eklenti kaynağından) hiçbir zaman gerçekten çalışmıyordu: o adaptör
 * (`mebi-modul.ts`) `content.ts`'ten hiç çağrılmıyordu, yani bu kart HER
 * kurulumda sessizce boş kalıyordu. Artık MEBİ konu tamamlama verisinden
 * (`mebiKonuGetir` — gerçekten çalışan `mebi-konu-tamamlama` adaptöründen
 * beslenir) türetiliyor: toplam = şimdiye kadar çekilmiş konu kaydı sayısı,
 * tamamlanan = bunlardan tamamlanmış olanı. Not: bu, MEBİ'deki TÜM
 * derslerin toplamı değil, öğretmenin "Tüm konuları al" dediği derslerin
 * toplamı — ama en azından gerçek veriye dayanıyor (önceden hiç dolmuyordu).
 */
export function mebiGetir(ogrenciId: number): { tamamlanan: number; toplam: number } | null {
  const kayitlar = mebiKonuGetir(ogrenciId);
  if (!kayitlar.length) return null;
  return { tamamlanan: kayitlar.filter((k) => k.tamamlandi).length, toplam: kayitlar.length };
}

// MEBİ "Konu Tamamlama Raporu" — konu bazında detay (öğrenci × konu). Ad ile eşleşir.
export interface MebiKonuKaydi {
  ogrenciId: number;
  ders: string;
  konu: string;
  tamamlandi: boolean;
  tarih?: string;
  yuzde?: number;
}

export function mebiKonuTamamlamaYaz(ham: MebiKonuTamamlamaHam): { eslesen: number; toplam: number; konu: string } {
  let eslesen = 0;
  const eslesmeyen: EslesmeyenKayit[] = [];
  const onceki = db.mebiKonuDurum;
  // OA74 hız: öğrenci başına tüm konu kayıtlarını normalleştirerek taramak yerine bu konunun
  // satırları bir kez indekslenir (ilk eşleşen satır — eski findIndex ile aynı).
  const calisan = db.mebiKonuDurum.slice();
  const konuAnahtari = _normAd(ham.konu);
  const konuSatiri = new Map<number, number>();
  calisan.forEach((m, idx) => { if (!konuSatiri.has(m.ogrenciId) && _normAd(m.konu) === konuAnahtari) konuSatiri.set(m.ogrenciId, idx); });
  for (const og of ham.ogrenciler) {
    const ogrenciId = mebiEslesmisOgrenciId(og.adSoyad, ham.sinif);
    if (ogrenciId == null) {
      eslesmeyen.push({
        kaynak: "mebi-ad",
        adSoyad: og.adSoyad,
        neden: "MEBİ okul numarası vermediği için ad-soyad veya kayıtlı MEBİ ad eşleştirmesi bulunamadı.",
        oneriler: ogrenciOnerileri(og.adSoyad),
      });
      continue;
    }
    eslesen++;
    const kayit: MebiKonuKaydi = {
      ogrenciId, ders: ham.ders, konu: ham.konu, tamamlandi: og.tamamlandi,
      ...(og.tarih ? { tarih: og.tarih } : {}),
      ...(og.yuzde !== undefined ? { yuzde: og.yuzde } : {}),
    };
    const i = konuSatiri.get(ogrenciId);
    if (i !== undefined) calisan[i] = kayit;
    else { konuSatiri.set(ogrenciId, calisan.length); calisan.push(kayit); }
  }
  const yan = yanYazimOnceki();
  try {
    db.mebiKonuDurum = calisan;
    senkronIsaretleBellekte("mebi");
    if (eslesen) logEkleBellekte({ kaynak: "mebi", seviye: "bilgi", baslik: "MEBİ konu tamamlama çekildi", mesaj: `${ham.konu}: ${eslesen}/${ham.ogrenciler.length} öğrenci işlendi.` });
    eslesmeLogu("mebi", "MEBİ konu eşleşmeyenleri", `${ham.konu}: ${eslesmeyen.length} öğrenci eşleşmedi.`, eslesmeyen, true);
    kaydet(db);
  } catch (err) {
    db.mebiKonuDurum = onceki;
    yanYazimGeriAl(yan);
    throw err;
  }
  return { eslesen, toplam: ham.ogrenciler.length, konu: ham.konu };
}

export function mebiKonuGetir(ogrenciId: number): MebiKonuKaydi[] {
  const t = T();
  t.mebiKonuByOgrenci ??= grupla(db.mebiKonuDurum, (m) => m.ogrenciId);
  return t.mebiKonuByOgrenci.get(ogrenciId)?.slice() ?? [];
}

// MEBİ ders konu envanteri (sınıf × konu). MEBİ menüsü buradan beslenir.
export interface MebiEnvanterKaydi {
  sinifAd: string;
  ders: string;
  konu: string;
  tamamlayan: number;
  basariYuzde?: number;
}

export function mebiEnvanterYaz(ham: MebiKonuEnvanterHam): { konu: number; sinif: string } {
  const onceki = db.mebiEnvanter;
  let calisan = db.mebiEnvanter;
  for (const k of ham.konular) {
    const kayit: MebiEnvanterKaydi = {
      sinifAd: ham.sinif, ders: ham.ders, konu: k.konu, tamamlayan: k.tamamlayan,
      ...(k.basariYuzde !== undefined ? { basariYuzde: k.basariYuzde } : {}),
    };
    const i = calisan.findIndex((m) =>
      _normAd(m.sinifAd) === _normAd(ham.sinif) && _normAd(m.ders) === _normAd(ham.ders) && _normAd(m.konu) === _normAd(k.konu));
    calisan = i >= 0 ? calisan.map((m, idx) => (idx === i ? kayit : m)) : [...calisan, kayit];
  }
  const yan = yanYazimOnceki();
  try {
    db.mebiEnvanter = calisan;
    senkronIsaretleBellekte("mebi");
    logEkleBellekte({ kaynak: "mebi", seviye: "bilgi", baslik: "MEBİ konu envanteri çekildi", mesaj: `${ham.sinif} · ${ham.ders}: ${ham.konular.length} konu alındı.` });
    kaydet(db);
  } catch (err) {
    db.mebiEnvanter = onceki;
    yanYazimGeriAl(yan);
    throw err;
  }
  return { konu: ham.konular.length, sinif: ham.sinif };
}

/** MEBİ menüsü: veri gelmiş sınıflar + konu/tamamlanan özet. */
export function mebiSiniflari(): Array<{ sinifAd: string; konuSayi: number; tamamlananKonu: number }> {
  const m = new Map<string, { konuSayi: number; tamamlananKonu: number }>();
  for (const e of db.mebiEnvanter) {
    const g = m.get(e.sinifAd) ?? { konuSayi: 0, tamamlananKonu: 0 };
    g.konuSayi++; if (e.tamamlayan > 0) g.tamamlananKonu++;
    m.set(e.sinifAd, g);
  }
  return [...m.entries()].map(([sinifAd, v]) => ({ sinifAd, ...v }))
    .sort((a, b) => a.sinifAd.localeCompare(b.sinifAd, "tr"));
}

export function mebiKonulariSinif(sinifAd: string): MebiEnvanterKaydi[] {
  return db.mebiEnvanter.filter((e) => _normAd(e.sinifAd) === _normAd(sinifAd))
    .sort((a, b) => a.konu.localeCompare(b.konu, "tr"));
}

/** Bir konuda kim yaptı (tarih+yüzde) / kim yapmadı. Detay çekilmemişse herkes yapmamış sayılır. */
export function mebiKonuKimYapti(sinifAd: string, konu: string): {
  yapanlar: Array<{ ogrenciId: number; adSoyad: string; tarih?: string; yuzde?: number }>;
  yapmayanlar: Array<{ ogrenciId: number; adSoyad: string }>;
} {
  const sinif = db.siniflar.find((s) => _normAd(s.ad) === _normAd(sinifAd));
  const roster = sinif ? db.ogrenciler.filter((o) => o.sinifId === sinif.id && !o.nakilTarihi) : [];
  const adOf = (id: number) => db.ogrenciler.find((o) => o.id === id)?.adSoyad ?? "?";
  const kayitlar = db.mebiKonuDurum.filter((m) =>
    _normAd(m.konu) === _normAd(konu) && roster.some((o) => o.id === m.ogrenciId));
  if (kayitlar.length) {
    const yapanlar = kayitlar.filter((k) => k.tamamlandi).map((k) => ({
      ogrenciId: k.ogrenciId,
      adSoyad: adOf(k.ogrenciId),
      ...(k.tarih ? { tarih: k.tarih } : {}),
      ...(k.yuzde !== undefined ? { yuzde: k.yuzde } : {}),
    })).sort((a, b) => (b.yuzde ?? 0) - (a.yuzde ?? 0));
    const yapmayanlar = kayitlar.filter((k) => !k.tamamlandi).map((k) => ({ ogrenciId: k.ogrenciId, adSoyad: adOf(k.ogrenciId) }))
      .sort((a, b) => a.adSoyad.localeCompare(b.adSoyad, "tr"));
    return { yapanlar, yapmayanlar };
  }
  return {
    yapanlar: [],
    yapmayanlar: roster.map((o) => ({ ogrenciId: o.id, adSoyad: o.adSoyad })).sort((a, b) => a.adSoyad.localeCompare(b.adSoyad, "tr")),
  };
}

// ─── MEBİ Hedef Temelli Destek Eğitimi — Ödevler (ad ile eşleşir, No yok) ───
// MEBİ ödevi İKİNCİ bir varlık değil, doğrudan Ödev Defteri kaydıdır
// (OdevKaydi.kaynak==="mebi"). MEBİ şubesi ile bu uygulamanın sınıfı arasında
// kurulu bir eşleştirme YOK — bu yüzden her tamamlayan KENDİ eşleşen öğrenci
// kaydının sinifId'sine göre dağıtılır; bir MEBİ ödevi böylece birden çok sınıfta
// birden çok OdevKaydi'ye karşılık gelebilir (aynı mebiOdevId ile tekilleştirilir).
// ⚠ MEBİ sayfası yalnız TAMAMLAYANLARI listeler. Son tarih GEÇMEDEN tamamlamayan
// öğrenci TAHMİN EDİLMEZ (satır oluşmaz, "boş = girilmedi"). Son tarih GEÇTİKTEN
// sonra o şubenin detayı çekilince, sınıfta satırı olmayan öğrenciye açık bir
// "yapmadı" satırı yazılır (bkz. mebiYapmadiUzlastir) — denetim 2026-10: geç
// tamamlayan 0 alıp ortalamaya girerken hiç yapmayan ortalamaya hiç girmiyordu
// (geç yapan 40, hiç yapmayan 80 gibi ters sonuç).

interface MebiOdevMeta {
  id: string;
  baslik: string;
  olusturmaTarihi: string;
  sonTarih?: string;
}

/** Senkronun yazdığı "yapmadı" satırı mı? Gerçek MEBİ satırı her zaman mebiTamamlandi:true
 *  ile yazılır; false yalnız bu otomatik satırda olur. Öğretmen dokunduysa (override) artık
 *  otomatik sayılmaz — senkron onu silmez. */
function mebiOtomatikYapmadiMi(p: OdevPuani): boolean {
  return p.mebiTamamlandi === false && p.puan === "-" && p.elleTamamlandiOverride == null && !p.sayilsinOverride;
}

/**
 * MEBİ ödevlerinde "hiç yapmadı" satırlarını son tarihe göre uzlaştırır (SAF: yeni dizi döner).
 *  - Son tarih geçtiyse (son gün dahil zamanında, ertesi günden itibaren geçmiş): sınıfta satırı
 *    olmayan her öğrenciye `{puan:"-", mebiTamamlandi:false}` yazılır → core/sonTarih "yapmadi" →
 *    0 puan, geç tamamlamayla aynı kural. Son tarihten SONRA sınıfa katılan öğrenci atlanır.
 *  - Son tarih yoksa/ileri alındıysa: daha önce yazılmış otomatik satırlar kaldırılır (öğrencinin
 *    hâlâ süresi var). Öğretmenin dokunduğu satır korunur.
 * `ekle=false`: yalnız kaldırma yapılır (envanter senkronu — o anda şubenin güncel tamamlayan
 * listesi elde yok; arada tamamlamış öğrenciye yanlışlıkla "yapmadı" yazılmasın).
 * Tekrar çağrılınca aynı sonucu verir (idempotent); sonradan tamamlayan öğrencinin satırı
 * mebiOdevDetayYaz'da "tamamladı"ya çevrilir.
 */
function mebiYapmadiUzlastir(puanlar: OdevPuani[], odevler: OdevKaydi[], bugun: string, ekle = true): OdevPuani[] {
  let sonuc = puanlar;
  for (const o of odevler) {
    if (o.kaynak !== "mebi") continue;
    const gecti = !!o.sonTarih && /^\d{4}-\d{2}-\d{2}$/.test(o.sonTarih) && o.sonTarih < bugun;
    if (!gecti) {
      if (sonuc.some((p) => p.odevId === o.id && mebiOtomatikYapmadiMi(p))) {
        sonuc = sonuc.filter((p) => !(p.odevId === o.id && mebiOtomatikYapmadiMi(p)));
      }
      continue;
    }
    if (!ekle) continue;
    const satiriOlan = new Set(sonuc.filter((p) => p.odevId === o.id).map((p) => p.ogrenciId));
    const eklenecek: OdevPuani[] = db.ogrenciler
      .filter((og) => og.sinifId === o.sinifId && !og.nakilTarihi && !satiriOlan.has(og.id) && !(og.katilmaTarihi && og.katilmaTarihi > o.sonTarih!))
      .map((og) => ({ odevId: o.id, ogrenciId: og.id, puan: "-" as const, mebiTamamlandi: false }));
    if (eklenecek.length) sonuc = [...sonuc, ...eklenecek];
  }
  return sonuc;
}

/** MEBİ'nin "01.03.2026" (ya da ISO) oluşturma tarihini YYYY-MM-DD'ye çevirir; okunamazsa undefined. */
function mebiTarihiISO(v: string | undefined): string | undefined {
  if (!v) return undefined;
  const iso = v.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  const tr = v.trim().match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})/);
  return tr ? `${tr[3]}-${tr[2].padStart(2, "0")}-${tr[1].padStart(2, "0")}` : undefined;
}

export function mebiOdevEnvanterYaz(ham: MebiOdevEnvanterHam): { eklenen: number; sonTarihGuncellenen: number } {
  let eklenen = 0, sonTarihGuncellenen = 0;
  const oncekiPuanlar = db.odevPuanlari;
  const oncekiMeta = db.mebiOdevMeta;
  let calisanMeta = db.mebiOdevMeta;
  // db.odevler'deki ilgili kayıtlar İÇ İÇE (in-place) güncelleniyor — geri
  // alma için eski sonTarih/sonTarihKaynak/sonTarihGuncelleme'leri tutuyoruz.
  const odevGerialma: Array<{ ok: OdevKaydi; sonTarih: string | undefined; sonTarihKaynak: OdevKaydi["sonTarihKaynak"]; sonTarihGuncelleme: string | undefined }> = [];
  const yan = yanYazimOnceki();
  try {
    for (const o of ham.odevler) {
      const i = calisanMeta.findIndex((m) => m.id === o.id);
      if (i < 0) {
        calisanMeta = [...calisanMeta, { id: o.id, baslik: o.baslik, olusturmaTarihi: o.olusturmaTarihi, ...(o.sonTarih ? { sonTarih: o.sonTarih } : {}) }];
        eklenen++;
      } else {
        const eski = calisanMeta[i];
        if (o.sonTarih && o.sonTarih !== eski.sonTarih) {
          // MEBİ'den değişen son tarih kanoniktir — ilgili tüm OdevKaydi'lere yansıt (bkz. §3.6).
          for (const ok of db.odevler.filter((x) => x.mebiOdevId === o.id)) {
            odevGerialma.push({ ok, sonTarih: ok.sonTarih, sonTarihKaynak: ok.sonTarihKaynak, sonTarihGuncelleme: ok.sonTarihGuncelleme });
            ok.sonTarih = o.sonTarih;
            ok.sonTarihKaynak = "mebi";
            ok.sonTarihGuncelleme = simdiYerelISO();
          }
          sonTarihGuncellenen++;
          logEkleBellekte({ kaynak: "mebi", seviye: "bilgi", baslik: "MEBİ son tarih değişti", mesaj: `${o.baslik}: son tarih ${eski.sonTarih ?? "yok"} → ${o.sonTarih}.` });
        }
        calisanMeta = calisanMeta.map((m, idx) => (idx === i ? { ...eski, baslik: o.baslik, olusturmaTarihi: o.olusturmaTarihi, ...(o.sonTarih ? { sonTarih: o.sonTarih } : {}) } : m));
      }
    }
    // Son tarih ileri alındıysa önceden yazılmış otomatik "yapmadı" satırları kalkar (yalnız kaldırma).
    const envanterIdleri = new Set(ham.odevler.map((o) => o.id));
    db.odevPuanlari = mebiYapmadiUzlastir(db.odevPuanlari, db.odevler.filter((x) => !!x.mebiOdevId && envanterIdleri.has(x.mebiOdevId)), bugunYerelISO(), false);
    db.mebiOdevMeta = calisanMeta;
    senkronIsaretleBellekte("mebi");
    kaydet(db);
  } catch (err) {
    db.odevPuanlari = oncekiPuanlar;
    db.mebiOdevMeta = oncekiMeta;
    yanYazimGeriAl(yan);
    for (const { ok, sonTarih, sonTarihKaynak, sonTarihGuncelleme } of odevGerialma) {
      ok.sonTarih = sonTarih;
      ok.sonTarihKaynak = sonTarihKaynak;
      ok.sonTarihGuncelleme = sonTarihGuncelleme;
    }
    throw err;
  }
  return { eklenen, sonTarihGuncellenen };
}

export function mebiOdevDetayYaz(ham: MebiOdevSubeDetayHam): { yeniOdev: number; eslesen: number; toplam: number } {
  const eslesmeyen: EslesmeyenKayit[] = [];
  let eslesen = 0;
  // Bu şubedeki her tamamlayanı KENDİ öğrenci kaydının sinifId'sine göre grupla.
  const sinifaGoreTamamlayan = new Map<number, typeof ham.tamamlayanlar>();
  for (const t of ham.tamamlayanlar) {
    const ogrenciId = mebiEslesmisOgrenciId(t.adSoyad, ham.sube);
    if (ogrenciId == null) {
      eslesmeyen.push({
        kaynak: "mebi-ad",
        adSoyad: t.adSoyad,
        neden: "MEBİ okul numarası vermediği için ad-soyad veya kayıtlı MEBİ ad eşleştirmesi bulunamadı.",
        oneriler: ogrenciOnerileri(t.adSoyad),
      });
      continue;
    }
    const ogrenci = db.ogrenciler.find((o) => o.id === ogrenciId);
    if (!ogrenci) continue;
    eslesen++;
    const liste = sinifaGoreTamamlayan.get(ogrenci.sinifId) ?? [];
    liste.push(t);
    sinifaGoreTamamlayan.set(ogrenci.sinifId, liste);
  }

  const meta = db.mebiOdevMeta.find((m) => m.id === ham.odevId);
  let yeniOdev = 0;
  const oncekiOdevler = db.odevler;
  const oncekiPuanlar = db.odevPuanlari;
  const oncekiSonOdevId = db.sonOdevId;
  let calisanOdevler = db.odevler;
  let calisanPuanlar = db.odevPuanlari;
  // db.odevPuanlari'nda in-place güncellenen kayıtların eski hâli (geri alma için).
  const puanGerialma: Array<{ p: OdevPuani; puan: OdevPuani["puan"]; mebiTamamlandi: boolean | undefined; tamamlanmaTarihi: string | undefined; mebiYuzde: number | undefined }> = [];
  const yan = yanYazimOnceki();

  try {
    for (const [sinifId, tamamlayanlar] of sinifaGoreTamamlayan) {
      let odev = calisanOdevler.find((o) => o.mebiOdevId === ham.odevId && o.sinifId === sinifId);
      if (!odev) {
        // Veriliş tarihi MEBİ'nin oluşturma tarihi (okunamazsa bugün); dönem bu tarihten
        // (odevEkle/gunlukKaydet ile aynı kural) — eskiden senkron anındaki aktif dönem yazılıyordu.
        const verilis = mebiTarihiISO(meta?.olusturmaTarihi) ?? bugunYerelISO();
        odev = {
          id: ++db.sonOdevId, sinifId, ad: meta?.baslik ?? ham.baslik, tarih: verilis,
          mod: "isaret", donem: tarihinDonemi(verilis),
          kaynak: "mebi", mebiOdevId: ham.odevId,
          // OA69 (öğretmen kararı): MEBİ ödevi sınıfın İLK dersine sayılır; MEBİ ders ayrımı vermiyor.
          ...(sinifIlkDersi(db.siniflar, sinifId) ? { ders: sinifIlkDersi(db.siniflar, sinifId) } : {}),
          ...(meta?.sonTarih ? { sonTarih: meta.sonTarih, sonTarihKaynak: "mebi" as const, sonTarihGuncelleme: simdiYerelISO() } : {}),
        };
        calisanOdevler = [...calisanOdevler, odev];
        yeniOdev++;
      }
      for (const t of tamamlayanlar) {
        const ogrenciId = mebiEslesmisOgrenciId(t.adSoyad, ham.sube);
        if (ogrenciId == null) continue; // yukarıda zaten eşleşti, tip daraltma için tekrar kontrol
        const mevcut = calisanPuanlar.find((p) => p.odevId === odev!.id && p.ogrenciId === ogrenciId);
        if (mevcut) {
          puanGerialma.push({ p: mevcut, puan: mevcut.puan, mebiTamamlandi: mevcut.mebiTamamlandi, tamamlanmaTarihi: mevcut.tamamlanmaTarihi, mebiYuzde: mevcut.mebiYuzde });
          // Önceden otomatik "yapmadı" yazılmış öğrenci sonradan (geç) tamamladıysa satır tamamlamaya döner.
          mevcut.puan = "+";
          mevcut.mebiTamamlandi = true;
          if (t.tarih) mevcut.tamamlanmaTarihi = t.tarih;
          if (t.yuzde !== undefined) mevcut.mebiYuzde = t.yuzde;
        } else {
          calisanPuanlar = [...calisanPuanlar, {
            odevId: odev.id, ogrenciId, puan: "+", mebiTamamlandi: true,
            ...(t.tarih ? { tamamlanmaTarihi: t.tarih } : {}),
            ...(t.yuzde !== undefined ? { mebiYuzde: t.yuzde } : {}),
          }];
        }
      }
    }
    // Bu şubenin güncel tamamlayan listesi elde: son tarihi geçmiş ödevde satırı olmayan
    // öğrenciye "yapmadı" yazılır. Yalnız bu şubeye ait sınıflar (tamamlayanı olan ya da adı
    // şubeyle uyuşan) — başka şubenin listesi henüz çekilmemiş olabilir.
    const subeSiniflari = new Set(sinifaGoreTamamlayan.keys());
    for (const s of db.siniflar) if (mebiSinifBaglamiUyuyor(s.ad, ham.sube)) subeSiniflari.add(s.id);
    calisanPuanlar = mebiYapmadiUzlastir(
      calisanPuanlar,
      calisanOdevler.filter((o) => o.mebiOdevId === ham.odevId && subeSiniflari.has(o.sinifId)),
      bugunYerelISO(),
    );

    db.odevler = calisanOdevler;
    db.odevPuanlari = calisanPuanlar;
    senkronIsaretleBellekte("mebi");
    if (eslesen) logEkleBellekte({ kaynak: "mebi", seviye: "bilgi", baslik: "MEBİ ödev tamamlama çekildi", mesaj: `${meta?.baslik ?? ham.baslik} · ${ham.sube}: ${eslesen}/${ham.tamamlayanlar.length} öğrenci işlendi.` });
    eslesmeLogu("mebi", "MEBİ ödev eşleşmeyenleri", `${meta?.baslik ?? ham.baslik} · ${ham.sube}: ${eslesmeyen.length} öğrenci eşleşmedi.`, eslesmeyen, true);
    kaydet(db);
  } catch (err) {
    yanYazimGeriAl(yan);
    db.odevler = oncekiOdevler;
    db.odevPuanlari = oncekiPuanlar;
    db.sonOdevId = oncekiSonOdevId;
    for (const { p, puan, mebiTamamlandi, tamamlanmaTarihi, mebiYuzde } of puanGerialma) {
      p.puan = puan;
      p.mebiTamamlandi = mebiTamamlandi;
      p.tamamlanmaTarihi = tamamlanmaTarihi;
      p.mebiYuzde = mebiYuzde;
    }
    throw err;
  }
  return { yeniOdev, eslesen, toplam: ham.tamamlayanlar.length };
}

/** Tek kayıtlık öğretmen düzeltmesi: MEBİ ham durumunun üstüne yerel karar yazar. `null` = MEBİ durumuna dön. */
export function odevPuaniElleDuzelt(odevId: number, ogrenciId: number, override: boolean | null): void {
  const p = db.odevPuanlari.find((x) => x.odevId === odevId && x.ogrenciId === ogrenciId);
  if (!p) throw new Error("Ödev puanı kaydı bulunamadı.");
  const onceki = p.elleTamamlandiOverride;
  p.elleTamamlandiOverride = override;
  try {
    kaydet(db);
  } catch (err) {
    p.elleTamamlandiOverride = onceki;
    throw err;
  }
}

/** Geç/belirsiz tamamlanan tek bir kayıt için "mazeretle sayılsın" kararı — geri alınabilir. */
export function odevPuaniSayilsinAyarla(odevId: number, ogrenciId: number, sayilsin: boolean): void {
  const p = db.odevPuanlari.find((x) => x.odevId === odevId && x.ogrenciId === ogrenciId);
  if (!p) throw new Error("Ödev puanı kaydı bulunamadı.");
  const onceki = p.sayilsinOverride;
  p.sayilsinOverride = sayilsin;
  try {
    kaydet(db);
  } catch (err) {
    p.sayilsinOverride = onceki;
    throw err;
  }
}

// ─── Tutanak / disiplin (MASTER §10.4 — KVKK: local, olgusal, minimum) ─────

export function tutanaklariGetir(ogrenciId: number): TutanakKaydi[] {
  return db.tutanaklar.filter((t) => t.ogrenciId === ogrenciId)
    .sort((a, b) => b.tarih.localeCompare(a.tarih));
}

export function tutanakEkle(ogrenciId: number, konu: string): void {
  if (!konu.trim()) return;
  const onceki = db.tutanaklar;
  const oncekiId = db.sonTutanakId;
  try {
    db.tutanaklar = [...db.tutanaklar, { id: ++db.sonTutanakId, ogrenciId, tarih: simdiYerelISO(), konu: konu.trim(), donem: aktifDonemGetir() ?? 1 }];
    kaydet(db);
  } catch (err) {
    db.tutanaklar = onceki;
    db.sonTutanakId = oncekiId;
    throw err;
  }
}

export function tutanakSil(id: number): () => void {
  const onceki = db.tutanaklar;
  try {
    db.tutanaklar = db.tutanaklar.filter((t) => t.id !== id);
    kaydet(db);
  } catch (err) {
    db.tutanaklar = onceki;
    throw err;
  }
  return silmeGeriAlKur({ tutanaklar: onceki });
}

// ─── Yapılacaklar (öğretmenin kendi hatırlatma notları) ────────────────────

export function gorevleriGetir(): Gorev[] {
  return db.gorevler;
}

export function gorevEkle(metin: string, sonTarih?: string): void {
  const temiz = metin.trim();
  if (!temiz) return;
  const onceki = db.gorevler;
  const oncekiId = db.sonGorevId;
  try {
    db.gorevler = [...db.gorevler, {
      id: ++db.sonGorevId,
      metin: temiz,
      durum: "bekliyor",
      eklenmeZamani: simdiYerelISO(),
      sonTarih: sonTarih || undefined,
    }];
    kaydet(db);
  } catch (err) {
    db.gorevler = onceki;
    db.sonGorevId = oncekiId;
    throw err;
  }
}

/** Notun metnini ve/veya son tarihini düzenler — önceden tek yol sil+yeniden
 *  eklemekti, bu da eklenmeZamani'nı ve listedeki sırasını bozuyordu. */
export function gorevGuncelle(id: number, alanlar: { metin?: string; sonTarih?: string | null }): void {
  const g = db.gorevler.find((x) => x.id === id);
  if (!g) return;
  const eski = { metin: g.metin, sonTarih: g.sonTarih };
  if (alanlar.metin !== undefined) g.metin = alanlar.metin.trim() || g.metin;
  if (alanlar.sonTarih !== undefined) g.sonTarih = alanlar.sonTarih || undefined;
  try {
    kaydet(db);
  } catch (err) {
    Object.assign(g, eski);
    throw err;
  }
}

export function gorevDurumDegistir(id: number): void {
  const onceki = db.gorevler;
  try {
    db.gorevler = db.gorevler.map((g) =>
      g.id === id ? { ...g, durum: g.durum === "bekliyor" ? "tamamlandi" : "bekliyor" } : g,
    );
    kaydet(db);
  } catch (err) {
    db.gorevler = onceki;
    throw err;
  }
}

export function gorevSil(id: number): void {
  const onceki = db.gorevler;
  try {
    db.gorevler = db.gorevler.filter((g) => g.id !== id);
    kaydet(db);
  } catch (err) {
    db.gorevler = onceki;
    throw err;
  }
}

// Dashboard'un "yaklaşan görev" sayısı için: bekleyen + son tarihi bugünden
// itibaren `gunSayisi` gün içinde (veya geçmişte/gecikmiş) olan görevler.
/** Tarihi en yakın bekleyen görev (Bugün ekranı sayı yerine başlığı gösterir). */
export function enYakinGorev(gunSayisi = 3): { metin: string; sonTarih: string } | null {
  const esikTarih = new Date();
  esikTarih.setDate(esikTarih.getDate() + gunSayisi);
  const esik = bugunYerelISO(esikTarih);
  const g = db.gorevler
    .filter((x) => x.durum === "bekliyor" && x.sonTarih && x.sonTarih <= esik)
    .sort((a, b) => (a.sonTarih! < b.sonTarih! ? -1 : 1))[0];
  return g ? { metin: g.metin, sonTarih: g.sonTarih! } : null;
}

export function yaklasanGorevSayisi(gunSayisi = 3): number {
  const esikTarih = new Date();
  esikTarih.setDate(esikTarih.getDate() + gunSayisi);
  const esik = bugunYerelISO(esikTarih);
  return db.gorevler.filter(
    (g) => g.durum === "bekliyor" && g.sonTarih && g.sonTarih <= esik,
  ).length;
}

// ─── Ders programı (MASTER §10.2) ──────────────────────────────────────────

export function dersProgramiGetir(): DersProgrami[] {
  return db.dersProgrami;
}

export function gununDersleri(gun: number): DersProgrami[] {
  return db.dersProgrami.filter((d) => d.gun === gun).sort((a, b) => a.sira - b.sira);
}

/**
 * Program geçerlilik tarihi (sınıf başına). Program değişince (ders eklendi,
 * silindi, gün/saat değişti) o sınıf için bugün yazılır; "işlenmemiş ders"
 * taraması bu tarihten ÖNCEKİ günlere yeni programı uygulamaz. Eskiden Salı'ya
 * ders eklenince geçmiş bütün Salılar "unutuldu" diye kırmızı çıkıyordu; ilk
 * kurulumda da okul başından beri her gün eksik görünüyordu (2026-09 denetimi).
 */
function programDegisimNormallestir(h: unknown): Record<string, string> | undefined {
  if (!h || typeof h !== "object" || Array.isArray(h)) return undefined;
  const sonuc: Record<string, string> = {};
  for (const [k, v] of Object.entries(h as Record<string, unknown>)) {
    if (/^\d{1,9}$/.test(k) && typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v)) sonuc[k] = v;
  }
  return sonuc;
}
export function programGecerlilikTarihi(sinifId: number): string | null {
  return db.ayarlar.programDegisim?.[String(sinifId)] ?? null;
}
/** Bu tarihte bu sınıfın (şimdiki) programı geçerli miydi? Geçmiş tarama yalnız bunlara bakar. */
export function programTarihteGecerliMi(sinifId: number, tarih: string): boolean {
  const t = programGecerlilikTarihi(sinifId);
  return !t || tarih >= t;
}
/** Ders Programı ekranından elle: "bu program okul başından beri böyleydi" (null = sınır yok). */
export function programGecerlilikAyarla(sinifId: number, tarih: string | null): void {
  if (tarih !== null && !/^\d{4}-\d{2}-\d{2}$/.test(tarih)) throw new Error("Geçersiz tarih.");
  const onceki = db.ayarlar;
  const yeni = { ...(db.ayarlar.programDegisim ?? {}) };
  if (tarih === null) delete yeni[String(sinifId)]; else yeni[String(sinifId)] = tarih;
  try {
    db.ayarlar = { ...db.ayarlar, programDegisim: yeni };
    kaydet(db);
  } catch (err) {
    db.ayarlar = onceki;
    throw err;
  }
}
function programDegistiIsaretle(sinifId: number): void {
  db.ayarlar = { ...db.ayarlar, programDegisim: { ...(db.ayarlar.programDegisim ?? {}), [String(sinifId)]: bugunYerelISO() } };
}

export function dersEkle(sinifId: number, gun: number, sira: number, ad?: string): void {
  const onceki = db.dersProgrami;
  const oncekiId = db.sonDersId;
  const oncekiAyarlar = db.ayarlar;
  try {
    db.dersProgrami = [...db.dersProgrami, { id: ++db.sonDersId, sinifId, gun, sira, ad }];
    programDegistiIsaretle(sinifId);
    kaydet(db);
  } catch (err) {
    db.dersProgrami = onceki;
    db.sonDersId = oncekiId;
    db.ayarlar = oncekiAyarlar;
    throw err;
  }
}

export function dersSil(id: number): void {
  const onceki = db.dersProgrami;
  const oncekiAyarlar = db.ayarlar;
  const silinen = db.dersProgrami.find((d) => d.id === id);
  try {
    db.dersProgrami = db.dersProgrami.filter((d) => d.id !== id);
    if (silinen) programDegistiIsaretle(silinen.sinifId);
    kaydet(db);
  } catch (err) {
    db.dersProgrami = onceki;
    db.ayarlar = oncekiAyarlar;
    throw err;
  }
}

/** Ders adını (oda/etiket) değiştirir ya da başka bir güne/saate taşır. Çakışma
 *  kontrolü BURADA yapılmaz — ekle()'deki gibi çağıran taraf (ekran) önceden bakar.
 *  Yalnız ad değişimi programın geçerlilik tarihini değiştirmez. */
export function dersGuncelle(id: number, alanlar: Partial<Pick<DersProgrami, "gun" | "sira" | "ad">>): void {
  const d = db.dersProgrami.find((x) => x.id === id);
  if (!d) { kaydet(db); return; }
  const eski = { ...d };
  const oncekiAyarlar = db.ayarlar;
  const zamanDegisti = (alanlar.gun !== undefined && alanlar.gun !== d.gun) || (alanlar.sira !== undefined && alanlar.sira !== d.sira);
  Object.assign(d, alanlar);
  try {
    if (zamanDegisti) programDegistiIsaretle(d.sinifId);
    kaydet(db);
  } catch (err) {
    Object.assign(d, eski);
    db.ayarlar = oncekiAyarlar;
    throw err;
  }
}


// ─── Etkinlik / Ödev Defteri (puanlı ödev) ─────────────────────────────────

export function odevleriGetir(sinifId: number): OdevKaydi[] {
  return db.odevler
    .filter((o) => o.sinifId === sinifId)
    .map((o) => ({ ...o, mod: o.mod ?? "puan" })) // eski kayıtlar puanlıydı
    .sort((a, b) => b.tarih.localeCompare(a.tarih));
}

/** sinifId bilinmeden (ör. rota parametresinden) tek bir ödevi bulur. */
export function odevBul(id: number): OdevKaydi | undefined {
  const bulunan = db.odevler.find((o) => o.id === id);
  return bulunan ? { ...bulunan, mod: bulunan.mod ?? "puan" } : undefined;
}

// foyId, ayrı bir odevGuncelle/odevFoyBagla fonksiyonu yerine burada opsiyonel
// bir son parametre olarak eklendi: çağıran taraf (FoyOlusturModal) föyü
// oluşturduğu anda foyId'yi zaten elinde tutuyor, iki adımlı "oluştur, sonra
// güncelle" akışına gerek yok. Sondaki opsiyonel parametre mevcut çağıranları
// (OdevDefteriScreen) hiç etkilemez — bu, tek bir genel "odev alanlarını
// güncelle" yüzeyi açmaktan (odev modülünde henüz hiç yok) daha dar bir dokunuş.
export function odevEkle(
  sinifId: number,
  ad: string,
  tarih: string,
  mod: OdevKaydi["mod"] = "isaret",
  foyId?: string,
  /** OA58: dereceli puanlama — verilirse ödev "puan" modunda açılır ve ölçek ödeve KOPYALANIR. */
  rubrik?: RubrikOlcek,
  /** OA69: ödevin dersi; verilmezse sınıfın ilk dersi (tek dersli sınıfta zaten tek seçenek). */
  ders?: string,
): OdevKaydi {
  // Sınıfsız ödev yetim kalır (hiçbir ekranda görünmez, silinemez) — 2026-09 telefon denetimi.
  if (!Number.isInteger(sinifId) || sinifId <= 0) throw new Error("Ödev için önce bir sınıf seçin.");
  const onceki = db.odevler;
  const oncekiId = db.sonOdevId;
  if (rubrik) {
    const hata = rubrikHatasi(rubrik);
    if (hata) throw new Error(hata);
  }
  // Dönem ödevin VERİLİŞ tarihinden (gunlukKaydet ile aynı kural): 2. dönemde geriye
  // tarihli girilen bir 1. dönem ödevi eskiden 2. döneme sayılıyordu (denetim 2026-10).
  const yeni: OdevKaydi = {
    id: ++db.sonOdevId, sinifId, ad: ad.trim(), tarih, mod: rubrik ? "puan" : mod, foyId, donem: tarihinDonemi(tarih), kaynak: "elle",
    ...(rubrik ? { rubrik: rubrikKopyala(rubrik) } : {}),
  };
  const odevDersi = odevDersiCoz(sinifId, ders);
  if (odevDersi) yeni.ders = odevDersi;
  try {
    db.odevler = [...db.odevler, yeni];
    kaydet(db);
    return yeni;
  } catch (err) {
    db.odevler = onceki;
    db.sonOdevId = oncekiId;
    throw err;
  }
}

/** OA69: verilen ders sınıfın derslerinden biriyse onun sınıftaki yazılışı, değilse sınıfın ilk dersi. */
function odevDersiCoz(sinifId: number, ders?: string): string | undefined {
  const s = db.siniflar.find((x) => x.id === sinifId);
  if (!s) return ders?.trim() || undefined;
  const dersler = sinifDersleri(s);
  return (ders ? dersler.find((d) => dersAnahtari(d) === dersAnahtari(ders)) : undefined) ?? dersler[0];
}

/** OA69: ödevin dersini değiştir (Ödev Defteri → ödev ayarı). MEBİ ödevi hep ilk derste kalır. */
export function odevDersiniKaydet(id: number, ders: string): void {
  const o = db.odevler.find((x) => x.id === id);
  if (!o || o.kaynak === "mebi") return;
  const s = db.siniflar.find((x) => x.id === o.sinifId);
  const yeni = s ? sinifDersleri(s).find((d) => dersAnahtari(d) === dersAnahtari(ders)) : undefined;
  if (!yeni) throw new Error("Bu ders sınıfın dersleri arasında yok.");
  const eski = o.ders;
  o.ders = yeni;
  try {
    kaydet(db);
  } catch (err) {
    o.ders = eski;
    throw err;
  }
}

export function odevSil(id: number): () => void {
  const oncekiOdevler = db.odevler;
  const oncekiPuanlar = db.odevPuanlari;
  try {
    db.odevler = db.odevler.filter((o) => o.id !== id);
    db.odevPuanlari = db.odevPuanlari.filter((p) => p.odevId !== id);
    kaydet(db);
  } catch (err) {
    db.odevler = oncekiOdevler;
    db.odevPuanlari = oncekiPuanlar;
    throw err;
  }
  return silmeGeriAlKur({ odevler: oncekiOdevler, odevPuanlari: oncekiPuanlar });
}

/** "elle" kaynaklı ödevin ad/tarih/son tarihini düzenler — önceden tek yol
 *  sil+yeniden oluşturmaktı, bu da o ödeve girilmiş TÜM öğrenci puanlarını
 *  siliyordu (bkz. OdevDefteriScreen). MEBİ kaynaklı ödevler burada değişmez
 *  (salt okunur, senkrondan gelir). mod BİLEREK burada yok — mevcut puanların
 *  tipini (+/− vs 0-100) bozmamak için oluşturulduktan sonra sabit kalır. */
export function odevGuncelle(id: number, alanlar: { ad?: string; tarih?: string; sonTarih?: string | null }): void {
  const o = db.odevler.find((x) => x.id === id);
  if (!o || o.kaynak === "mebi") return;
  const eski = { ad: o.ad, tarih: o.tarih, donem: o.donem, sonTarih: o.sonTarih, sonTarihKaynak: o.sonTarihKaynak, sonTarihGuncelleme: o.sonTarihGuncelleme };
  if (alanlar.ad !== undefined) o.ad = alanlar.ad.trim() || o.ad;
  // Tarih gerçekten değişince dönem de yeni tarihe göre yeniden belirlenir (odevEkle ile aynı kural);
  // tarih aynı kalıyorsa mevcut etikete dokunulmaz (yalnız ad/son tarih düzenlemesi notu oynatmasın).
  if (alanlar.tarih !== undefined && alanlar.tarih !== o.tarih) {
    o.tarih = alanlar.tarih;
    o.donem = tarihinDonemi(alanlar.tarih);
  }
  if (alanlar.sonTarih !== undefined) {
    if (alanlar.sonTarih) {
      o.sonTarih = alanlar.sonTarih;
      o.sonTarihKaynak = "elle";
      o.sonTarihGuncelleme = simdiYerelISO();
    } else {
      o.sonTarih = undefined;
      o.sonTarihKaynak = undefined;
      o.sonTarihGuncelleme = undefined;
    }
  }
  try {
    kaydet(db);
  } catch (err) {
    Object.assign(o, eski);
    throw err;
  }
}

/** OA59: ödev ayarları — ağırlık (0,5–10), işaretli ödevde "yapmadı" puanı (0–99), bağlı performans notu (1–3).
 *  `null` = varsayılana döndür. Yalnız verilen alanlar değişir; kayıt başarısızsa geri alınır. */
export function odevAyarlariniKaydet(id: number, alanlar: { agirlik?: number | null; eksiPuan?: number | null; notNo?: number | null }): void {
  const o = db.odevler.find((x) => x.id === id);
  if (!o) return;
  const eski = { agirlik: o.agirlik, eksiPuan: o.eksiPuan, notNo: o.notNo };
  if (alanlar.agirlik !== undefined) {
    if (alanlar.agirlik !== null && odevAgirligiGecerli(alanlar.agirlik) === undefined && alanlar.agirlik !== 1) throw new Error("Ağırlık 0,5 ile 10 arasında olmalı.");
    o.agirlik = alanlar.agirlik === null ? undefined : odevAgirligiGecerli(alanlar.agirlik);
  }
  if (alanlar.eksiPuan !== undefined) {
    if (alanlar.eksiPuan !== null && odevEksiPuaniGecerli(alanlar.eksiPuan) === undefined && alanlar.eksiPuan !== 0) throw new Error("“Yapmadı” puanı 0 ile 99 arasında olmalı.");
    o.eksiPuan = alanlar.eksiPuan === null ? undefined : odevEksiPuaniGecerli(alanlar.eksiPuan);
  }
  if (alanlar.notNo !== undefined) o.notNo = alanlar.notNo === null ? undefined : odevNotNoGecerli(alanlar.notNo);
  try {
    kaydet(db);
  } catch (err) {
    Object.assign(o, eski);
    throw err;
  }
}

export function notBasamakGetir(): 0 | 1 | 2 {
  return db.ayarlar.notBasamak ?? 0;
}

export function notBasamakKaydet(b: 0 | 1 | 2): void {
  const onceki = db.ayarlar.notBasamak;
  db.ayarlar.notBasamak = b === 0 ? undefined : b;
  try {
    kaydet(db);
  } catch (err) {
    db.ayarlar.notBasamak = onceki;
    throw err;
  }
}

// ─── OA70: zil saatleri + "dersi işlemedin" hatırlatması ─────────────────

/** Bozuk/elle düzenlenmiş yedekteki zil tablosu bütünüyle atılır (yarım tablo yanlış saatte
 *  bildirim üretir; hiç bildirim olmaması daha az zararlı). Öğretmen yeniden girer. */
function zilSaatleriNormallestir(h: unknown): ZilSaatleri | undefined {
  const d = (h as { dersler?: unknown } | null | undefined)?.dersler;
  if (!Array.isArray(d) || d.length === 0) return undefined;
  const dersler = d.map((x) => ({ bas: String((x as { bas?: unknown })?.bas ?? "").trim(), bit: String((x as { bit?: unknown })?.bit ?? "").trim() }));
  return zilSaatleriHatasi(dersler) ? undefined : { dersler };
}
function hatirlatmaNormallestir(h: unknown): HatirlatmaAyari | undefined {
  if (!h || typeof h !== "object") return undefined;
  const o = h as { acik?: unknown; gecikmeDk?: unknown };
  return { acik: o.acik === true, gecikmeDk: gecikmeGecerliMi(o.gecikmeDk) ? o.gecikmeDk : undefined };
}

export function zilSaatleriGetir(): ZilSaatleri | null {
  const z = db.ayarlar.zilSaatleri;
  return z ? { dersler: z.dersler.map((d) => ({ ...d })) } : null;
}

/** Boş tablo (ya da null) zil saatlerini kaldırır. Geçersiz tablo KAYDEDİLMEZ (fırlatır). */
export function zilSaatleriKaydet(dersler: Array<{ bas: string; bit: string }> | null): void {
  const temiz = (dersler ?? []).map((d) => ({ bas: String(d.bas ?? "").trim(), bit: String(d.bit ?? "").trim() }));
  const hata = zilSaatleriHatasi(temiz);
  if (hata) throw new Error(hata);
  const onceki = db.ayarlar;
  db.ayarlar = { ...db.ayarlar, zilSaatleri: temiz.length ? { dersler: temiz } : undefined };
  try {
    kaydet(db);
  } catch (err) {
    db.ayarlar = onceki;
    throw err;
  }
  try {
    islemGunluguEkle({
      kaynak: "sistem", seviye: "bilgi", baslik: "Zil saatleri değişti",
      mesaj: temiz.length ? `${temiz.length} ders saati · ${temiz[0].bas}–${temiz[temiz.length - 1].bit}` : "Zil saatleri kaldırıldı",
    });
  } catch { /* günlük yazılamazsa ayar yine kaydedildi */ }
}

export function hatirlatmaAyariGetir(): { acik: boolean; gecikmeDk: number } {
  const h = db.ayarlar.hatirlatma;
  return { acik: h?.acik === true, gecikmeDk: gecikmeGecerliMi(h?.gecikmeDk) ? h!.gecikmeDk! : VARSAYILAN_GECIKME_DK };
}

export function hatirlatmaAyariKaydet(a: { acik: boolean; gecikmeDk?: number }): void {
  if (typeof a?.acik !== "boolean") throw new Error("Hatırlatma ayarı okunamadı.");
  if (a.gecikmeDk !== undefined && !gecikmeGecerliMi(a.gecikmeDk)) throw new Error("Gecikme 0–60 dk arasında tam sayı olmalı.");
  const yeni: HatirlatmaAyari = { acik: a.acik, gecikmeDk: a.gecikmeDk === VARSAYILAN_GECIKME_DK ? undefined : a.gecikmeDk };
  const onceki = db.ayarlar;
  db.ayarlar = { ...db.ayarlar, hatirlatma: yeni };
  try {
    kaydet(db);
  } catch (err) {
    db.ayarlar = onceki;
    throw err;
  }
  try {
    islemGunluguEkle({
      kaynak: "sistem", seviye: "bilgi", baslik: "Ders hatırlatması",
      mesaj: yeni.acik ? `Açık · ders bitiminden ${yeni.gecikmeDk ?? VARSAYILAN_GECIKME_DK} dk sonra` : "Kapalı",
    });
  } catch { /* günlük yazılamazsa ayar yine kaydedildi */ }
}

/** Ders Programı ekranı için: N. ders saatinin "08:30–09:10" metni (zil yoksa null). */
export function zilAraligi(sira: number): string | null {
  const d = db.ayarlar.zilSaatleri?.dersler[sira - 1];
  return d && saatDakika(d.bas) !== null && saatDakika(d.bit) !== null ? `${d.bas}–${d.bit}` : null;
}

// ─── OA58: dereceli puanlama ölçek kütüphanesi ────────────────────────────

export function rubrikSablonlariGetir(): RubrikSablonu[] {
  return (db.ayarlar.rubrikSablonlari ?? []).map((x) => rubrikKopyala(x) as RubrikSablonu);
}

/** Ölçeği kütüphaneye ekler (id yoksa yeni) ya da aynı id'li olanı günceller. Ödevlere dokunmaz (onlar kopya). */
export function rubrikSablonuKaydet(sablon: RubrikOlcek & { id?: string }): RubrikSablonu {
  const hata = rubrikHatasi(sablon);
  if (hata) throw new Error(hata);
  const onceki = db.ayarlar.rubrikSablonlari;
  const liste = onceki ?? [];
  const id = sablon.id ?? `rb-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
  const kayit = { ...rubrikKopyala(sablon), id } as RubrikSablonu;
  try {
    db.ayarlar.rubrikSablonlari = liste.some((x) => x.id === id) ? liste.map((x) => (x.id === id ? kayit : x)) : [...liste, kayit];
    kaydet(db);
    return kayit;
  } catch (err) {
    db.ayarlar.rubrikSablonlari = onceki;
    throw err;
  }
}

export function rubrikSablonuSil(id: string): void {
  const onceki = db.ayarlar.rubrikSablonlari;
  try {
    db.ayarlar.rubrikSablonlari = (onceki ?? []).filter((x) => x.id !== id);
    kaydet(db);
  } catch (err) {
    db.ayarlar.rubrikSablonlari = onceki;
    throw err;
  }
}

export function odevPuanlariGetir(odevId: number): OdevPuani[] {
  return db.odevPuanlari.filter((p) => p.odevId === odevId);
}

/**
 * Bir ödevin puanlarını YALNIZ `kapsam`daki öğrenciler için EZER: o öğrencilerin
 * satırları silinip verilenler yazılır; kapsamda olup listede olmayanın satırı
 * silinir (öğretmen kutuyu boşalttı). Kapsam dışındaki satırlar KORUNUR.
 * `kapsam` verilmezse yalnız listedeki öğrenciler.
 *
 * Neden kapsam (denetim 2026-10): eskiden ödevin TÜM satırları silinip ekrandaki
 * liste yazılıyordu → (1) şube değiştirmiş öğrencinin eski sınıftaki ödev puanı,
 * (2) dereceli ödevde bir ölçütü yeniden tıklanıp yarım kalan öğrencinin daha önce
 * kaydedilmiş puanı sessizce siliniyordu. Ekran artık yalnız elindeki/karar verdiği
 * öğrencileri kapsam olarak verir.
 *
 * Başka bir CİHAZDAN gelen kısmi veri için yine YANLIŞ yol — yeni satırları
 * yalnız {odevId, ogrenciId, puan} ile kurduğu için MEBİ alanlarını
 * (mebiYuzde, tamamlanmaTarihi, override'lar) da düşürür. Telefondan gelen zarf
 * için `odevPuanBirlestir` kullan (bkz. MOBIL-HIZLI-ISLEME-PLANI.md §7.6) — güncel
 * UI katmanı için bkz. `gunlukKaydet`'in yukarıdaki yorumundaki `telefonZarfPlani`/
 * `telefonZarfiniUygula` notu, aynısı burada da geçerli.
 */
export function odevPuanKaydet(
  odevId: number,
  puanlar: Array<{ ogrenciId: number; puan: OdevPuani["puan"]; rubrikSecim?: number[]; geriBildirim?: string }>,
  kapsam?: number[],
): void {
  const onceki = db.odevPuanlari;
  const ezilecek = new Set([...(kapsam ?? []), ...puanlar.map((p) => p.ogrenciId)]);
  try {
    db.odevPuanlari = [
      ...db.odevPuanlari.filter((p) => p.odevId !== odevId || !ezilecek.has(p.ogrenciId)),
      ...puanlar.map((p) => ({
        odevId, ogrenciId: p.ogrenciId, puan: p.puan,
        // OA58: dereceli puanlama seçimi ve geri bildirimi (yalnız doluysa yazılır; düz ödevde alan hiç oluşmaz).
        ...(p.rubrikSecim ? { rubrikSecim: p.rubrikSecim } : {}),
        ...(p.geriBildirim?.trim() ? { geriBildirim: p.geriBildirim.trim().slice(0, 400) } : {}),
      })),
    ];
    kaydet(db);
  } catch (err) {
    db.odevPuanlari = onceki;
    throw err;
  }
}

export interface ZarfOdevCakismasi {
  odevId: number;
  odevAd: string;
  ogrenciId: number;
  telefonPuan: OdevPuani["puan"];
  bilgisayarPuan: OdevPuani["puan"];
}

export interface ZarfOdevSonucu {
  yazilan: number;
  atlanan: number;       // okul no eşleşmedi / ödev yok / MEBİ ödevi / moda uymayan değer
  cakisan: number;
  cakismalar: ZarfOdevCakismasi[];
}

/**
 * Telefondan gelen ödev puanlarını MEVCUT satırların üstüne EKLER.
 * `odevPuanKaydet`in aksine hiçbir satırı silmez ve mevcut satırın MEBİ
 * alanlarını KORUR (yalnız `puan` alanını değiştirir).
 *
 * Atlama sebepleri — hepsi sayılır, hiçbiri sessizce yutulmaz:
 *   - ödev bulunamadı ya da zarftaki sınıfa ait değil
 *   - ödev MEBİ kaynaklı (senkronla geliyor, telefon dokunamaz)
 *   - okul no o sınıfta yok
 *   - değer ödevin moduna uymuyor (işaret ödevine sayı, puan ödevine "+"/"-")
 */
export function odevPuanBirlestir(
  odevler: Array<{ odevId: number; sinifId: number; puanlar: Array<{ no: string; puan: OdevPuani["puan"] }> }>,
  cakismaKarari: ZarfCakismaKarari = "sor",
): ZarfOdevSonucu {
  const oncekiPuanlar = db.odevPuanlari;
  const sonuc: ZarfOdevSonucu = { yazilan: 0, atlanan: 0, cakisan: 0, cakismalar: [] };

  let puanlar = db.odevPuanlari;
  const indeks = new Map<string, OdevPuani>();
  for (const p of puanlar) indeks.set(`${p.odevId}|${p.ogrenciId}`, p);

  const eklenecek: OdevPuani[] = [];
  const guncellenecek = new Map<string, OdevPuani["puan"]>();

  for (const giris of odevler) {
    const odev = db.odevler.find((o) => o.id === giris.odevId);
    if (!odev || odev.sinifId !== giris.sinifId || odev.kaynak === "mebi") {
      sonuc.atlanan += giris.puanlar.length;
      continue;
    }
    const mod = odev.mod ?? "puan"; // eski kayıtlar puanlıydı (bkz. odevleriGetir)
    const noMap = new Map(
      db.ogrenciler.filter((o) => o.sinifId === giris.sinifId).map((o) => [String(o.no), o.id] as const),
    );

    for (const satir of giris.puanlar) {
      const ogrenciId = noMap.get(satir.no);
      if (ogrenciId === undefined) { sonuc.atlanan++; continue; }

      const isaretDegeri = satir.puan === "+" || satir.puan === "-";
      const sayisal = typeof satir.puan === "number";
      if ((mod === "isaret" && sayisal) || (mod === "puan" && isaretDegeri)) {
        sonuc.atlanan++;
        continue;
      }

      const anahtar = `${giris.odevId}|${ogrenciId}`;
      const mevcut = indeks.get(anahtar);
      if (!mevcut) {
        const yeni: OdevPuani = { odevId: giris.odevId, ogrenciId, puan: satir.puan };
        eklenecek.push(yeni);
        indeks.set(anahtar, yeni);
        sonuc.yazilan++;
        continue;
      }
      if (mevcut.puan === satir.puan) continue; // idempotent

      sonuc.cakisan++;
      sonuc.cakismalar.push({
        odevId: giris.odevId, odevAd: odev.ad, ogrenciId,
        telefonPuan: satir.puan, bilgisayarPuan: mevcut.puan,
      });
      if (cakismaKarari === "telefonKazanir") {
        guncellenecek.set(anahtar, satir.puan);
        sonuc.yazilan++;
      }
    }
  }

  if (eklenecek.length || guncellenecek.size) {
    // MEBİ alanları KORUNUYOR: satır yeniden kurulmuyor, yalnız puan değişiyor.
    puanlar = puanlar.map((p) => {
      const yeniPuan = guncellenecek.get(`${p.odevId}|${p.ogrenciId}`);
      return yeniPuan === undefined ? p : { ...p, puan: yeniPuan };
    });
    puanlar = [...puanlar, ...eklenecek];
  }

  try {
    db.odevPuanlari = puanlar;
    kaydet(db);
  } catch (err) {
    db.odevPuanlari = oncekiPuanlar;
    throw err;
  }

  return sonuc;
}

/** Bir öğrencinin tüm ödev puanları (performans ödev grubu için). */
export function ogrenciOdevPuanlari(ogrenciId: number): OdevPuani[] {
  return db.odevPuanlari.filter((p) => p.ogrenciId === ogrenciId);
}

/** Ödev puanının donem'i, kendisinde değil ödevin kendisinde (OdevKaydi.donem)
 *  yaşar — bir ödev hangi dönemde ATANDIYSA, ona verilen tüm puanlar o döneme
 *  aittir. Dönem bazlı performans hesabı (lib/ogrenciPerformans.ts) bunu kullanır. */
export interface OgrenciOdevPuaniDonemli {
  puan: OdevPuani["puan"];
  donem: 1 | 2;
  /** Ödevin verildiği gün (OdevKaydi.tarih) — trend penceresi bunu kullanır
   *  (lib/ogrenciTrend.ts). Ödev kaydı bulunamazsa boş; core/trend geçersiz
   *  tarihi zaten yok sayar. */
  tarih: string;
  // MEBİ senkronu — son tarih hükmü için (bkz. core/sonTarih.ts::odevEtkiliPuan100).
  kaynak?: "elle" | "mebi";
  sonTarih?: string;
  mebiTamamlandi?: boolean;
  mebiYuzde?: number;
  tamamlanmaTarihi?: string;
  elleTamamlandiOverride?: boolean | null;
  sayilsinOverride?: boolean;
  /** OA59: ödev ayarları (ağırlık, "yapmadı" puanı, bağlı performans notu). */
  odevId?: number;
  /** OA69: ödevin sınıfı ve dersi — iki dersli şubede ödev yalnız kendi dersinin notuna girer. */
  sinifId?: number;
  ders?: string;
  agirlik?: number;
  eksiPuan?: number;
  notNo?: number;
}

/** PDF dökümü için: öğrencinin ödevleri (ad, tarih, son tarih, ham puan) — tarih sıralı. */
export function ogrenciOdevListesi(ogrenciId: number): Array<{ ad: string; tarih: string; sonTarih?: string; donem: 1 | 2; puan: OdevPuani["puan"]; kaynak?: string; tamamlanmaTarihi?: string }> {
  const odevOf = new Map(db.odevler.map((o) => [o.id, o] as const));
  return db.odevPuanlari
    .filter((p) => p.ogrenciId === ogrenciId && odevOf.has(p.odevId))
    .map((p) => {
      const o = odevOf.get(p.odevId)!;
      return { ad: o.ad, tarih: o.tarih, sonTarih: o.sonTarih, donem: o.donem, puan: p.puan, kaynak: o.kaynak, tamamlanmaTarihi: p.tamamlanmaTarihi };
    })
    .sort((a, b) => a.tarih.localeCompare(b.tarih));
}

export function ogrenciOdevPuanlariDonemli(ogrenciId: number): OgrenciOdevPuaniDonemli[] {
  // OA74 hız: tüm öğrenciler için bir kez kurulur (eskiden öğrenci başına 5 kez tüm ödev+puan
  // taranıyordu); her çağrıya yeni nesneler verilir (eskisi gibi).
  const t = T();
  t.odevPuanDonemli ??= odevPuanDonemliIndeksiKur();
  return (t.odevPuanDonemli.get(ogrenciId) ?? []).map((x) => ({ ...x }));
}

function odevPuanDonemliIndeksiKur(): Map<number, OgrenciOdevPuaniDonemli[]> {
  const odevOf = new Map(db.odevler.map((o) => [o.id, o] as const));
  const m = new Map<number, OgrenciOdevPuaniDonemli[]>();
  for (const p of db.odevPuanlari) {
    const l = m.get(p.ogrenciId);
    const x = odevPuanDonemliSatiri(p, odevOf);
    if (l) l.push(x); else m.set(p.ogrenciId, [x]);
  }
  return m;
}

function odevPuanDonemliSatiri(p: OdevPuani, odevOf: Map<number, OdevKaydi>): OgrenciOdevPuaniDonemli {
  const o = odevOf.get(p.odevId);
  return {
    puan: p.puan,
    donem: o?.donem ?? 1,
    tarih: o?.tarih ?? "",
    kaynak: o?.kaynak,
    sonTarih: o?.sonTarih,
    mebiTamamlandi: p.mebiTamamlandi,
    mebiYuzde: p.mebiYuzde,
    tamamlanmaTarihi: p.tamamlanmaTarihi,
    elleTamamlandiOverride: p.elleTamamlandiOverride,
    sayilsinOverride: p.sayilsinOverride,
    odevId: p.odevId,
    sinifId: o?.sinifId,
    ders: o?.ders,
    agirlik: o?.agirlik,
    eksiPuan: o?.eksiPuan,
    notNo: o?.notNo,
  };
}

// ─── Ders Kitabı (kitaplık/okuyucu/kırpma) ──────────────────────────────────
// PDF dosyası ve föy taslak JSON'u burada YOK (bkz. types.ts KitapKaydi/FoyKaydi
// yorumu) — bu fonksiyonlar yalnızca küçük metadata'yı yönetir. Dosya
// kaydet/sil/hash gibi async işlemler modülün lib katmanında, bu fonksiyonlarla
// birlikte (önce/sonra) çağrılır — repo senkron kalır (mevcut mimari).

export function kitaplariGetir(): KitapKaydi[] {
  return db.kitaplar;
}

export function kitapHashIleBul(dosyaHash: string): KitapKaydi | undefined {
  return db.kitaplar.find((k) => k.dosyaHash === dosyaHash);
}

export function kitapBul(id: string): KitapKaydi | undefined {
  return db.kitaplar.find((k) => k.id === id);
}

// id çağıran taraftan gelir (kitapEkle İÇİNDE üretilmez): dosya adı da aynı
// uuid olduğundan (kitaplar/{id}.pdf), lib katmanı önce id'yi üretip dosyayı
// yazar, sonra bu id'yle metadata kaydını açar — id çakışması pratikte imkansız.
export function kitapEkle(kayit: Omit<KitapKaydi, "eklenme" | "sonSayfa" | "arsiv">): KitapKaydi {
  const yeni: KitapKaydi = { ...kayit, sonSayfa: 1, eklenme: simdiYerelISO() };
  // kirpmaEkle'deki hayalet kayıt gerekçesiyle AYNI: kaydet() (kota dolması
  // gibi bir nedenle) başarısız olursa, diske hiç yazılamayan kitap ekranda
  // "içe aktarıldı" gibi görünüp bellekte kalmamalı — geri alınmazsa bir
  // sonraki başarılı kaydet'le (ör. bir kırpma eklendiğinde) diske sessizce
  // sızardı. ESKİDEN burada `db.kitaplar.push(yeni)` kullanılıyordu; bu, diziyi
  // YERİNDE mutasyona uğrattığı için aşağıdaki `oncekiKitaplar` de AYNI
  // (zaten değişmiş) diziyi işaret ediyor ve rollback hiçbir şey geri almıyordu.
  const oncekiKitaplar = db.kitaplar;
  try {
    db.kitaplar = [...db.kitaplar, yeni];
    kaydet(db);
    return yeni;
  } catch (err) {
    db.kitaplar = oncekiKitaplar;
    throw err;
  }
}

export function kitapGuncelle(id: string, patch: Partial<Omit<KitapKaydi, "id">>): void {
  const oncekiKitaplar = db.kitaplar;
  try {
    db.kitaplar = db.kitaplar.map((k) => (k.id === id ? { ...k, ...patch } : k));
    kaydet(db);
  } catch (err) {
    db.kitaplar = oncekiKitaplar;
    throw err;
  }
}

/** Kitap dosyası silinir (çağıran taraf hallediyor); kayıt kırpma/not referansları
 * için arşivlenir — hash'i eşleşen bir PDF yeniden içe aktarılırsa diriltilir. */
export function kitapSil(id: string): void {
  const oncekiKitaplar = db.kitaplar;
  try {
    db.kitaplar = db.kitaplar.map((k) => (k.id === id ? { ...k, arsiv: true } : k));
    kaydet(db);
  } catch (err) {
    db.kitaplar = oncekiKitaplar;
    throw err;
  }
}

export function kitabaBagliVarlikSayisi(kitapId: string): { kirpma: number; not: number } {
  return {
    kirpma: db.kirpmalar.filter((k) => k.kitapId === kitapId).length,
    not: db.kitapNotlari.filter((n) => n.kitapId === kitapId).length,
  };
}

export function kirpmalariGetir(kitapId: string): KirpmaKaydi[] {
  return db.kirpmalar.filter((k) => k.kitapId === kitapId).sort((a, b) => a.sayfa - b.sayfa);
}

/** Kitaptan bağımsız TÜM kırpmalar — yalnızca sınıf/konu rozet önerileri gibi
 * kitap-sınırı gözetmeyen, salt-okunur özetler için (tekil kitap ekranları
 * hâlâ kirpmalariGetir(kitapId) kullanır). */
export function tumKirpmalar(): KirpmaKaydi[] {
  return db.kirpmalar;
}

export function kirpmaBul(id: string): KirpmaKaydi | undefined {
  return db.kirpmalar.find((k) => k.id === id);
}

export function kirpmaEkle(kayit: Omit<KirpmaKaydi, "id" | "eklenme">): KirpmaKaydi {
  const yeni: KirpmaKaydi = { ...kayit, id: crypto.randomUUID(), eklenme: simdiYerelISO() };
  // foyEkle'deki geri alma kalıbı: diske yazılamayan kayıt bellekte de KALMAMALI.
  // Çağıran (soruyuKaydet) hata sonrası soru havuzu metasını yazmadan çıkıyor;
  // kayıt bellekte kalırsa ekranda hiç görünmeden, metasız bir hayalet olarak
  // bir sonraki başarılı kaydet'le diske sızıyordu.
  const oncekiKirpmalar = db.kirpmalar;
  try {
    db.kirpmalar = [...db.kirpmalar, yeni];
    kaydet(db);
    return yeni;
  } catch (err) {
    db.kirpmalar = oncekiKirpmalar;
    throw err;
  }
}

/** Çoklu sayfa paketini tek Veritabani yazımıyla ekler. */
export function kirpmaTopluEkle(kayitlar: Omit<KirpmaKaydi, "id" | "eklenme">[]): KirpmaKaydi[] {
  const eklenme = simdiYerelISO();
  const yeniler = kayitlar.map((kayit) => ({ ...kayit, id: crypto.randomUUID(), eklenme }));
  // Paket ya tamamen eklenir ya hiç: yarısı bellekte kalan bir sayfa paketi
  // (kirpmaEkle'deki hayalet kaydın çoklu hâli) paket parça sayımını da bozardı.
  const oncekiKirpmalar = db.kirpmalar;
  try {
    db.kirpmalar = [...db.kirpmalar, ...yeniler];
    kaydet(db);
    return yeniler;
  } catch (err) {
    db.kirpmalar = oncekiKirpmalar;
    throw err;
  }
}

export function kirpmaGuncelle(id: string, patch: Partial<Omit<KirpmaKaydi, "id" | "kitapId">>): void {
  const onceki = db.kirpmalar;
  try {
    db.kirpmalar = db.kirpmalar.map((k) => (k.id === id ? { ...k, ...patch } : k));
    kaydet(db);
  } catch (err) {
    db.kirpmalar = onceki;
    throw err;
  }
}

/** Birden çok kırpmayı TEK yazımda günceller (Soru Havuzu toplu bilgi; her soru için ayrı
 *  kaydet() yüzlerce soruda yavaştı). Ya hepsi ya hiçbiri. */
export function kirpmalariTopluGuncelle(degisiklikler: Array<{ id: string; patch: Partial<Omit<KirpmaKaydi, "id" | "kitapId">> }>): void {
  if (!degisiklikler.length) return;
  const harita = new Map(degisiklikler.map((d) => [d.id, d.patch] as const));
  const onceki = db.kirpmalar;
  try {
    db.kirpmalar = db.kirpmalar.map((k) => (harita.has(k.id) ? { ...k, ...harita.get(k.id)! } : k));
    kaydet(db);
  } catch (err) {
    db.kirpmalar = onceki;
    throw err;
  }
}

export function kirpmaSil(id: string): void {
  const onceki = db.kirpmalar;
  try {
    db.kirpmalar = db.kirpmalar.filter((k) => k.id !== id);
    kaydet(db);
  } catch (err) {
    db.kirpmalar = onceki;
    throw err;
  }
}

export function kirpmaGeriYukle(kayit: KirpmaKaydi): void {
  if (db.kirpmalar.some((k) => k.id === kayit.id)) { kaydet(db); return; }
  const onceki = db.kirpmalar;
  try {
    db.kirpmalar = [...db.kirpmalar, kayit];
    kaydet(db);
  } catch (err) {
    db.kirpmalar = onceki;
    throw err;
  }
}

export function kitapNotlariGetir(kitapId: string): KitapNotuKaydi[] {
  return db.kitapNotlari.filter((n) => n.kitapId === kitapId).sort((a, b) => a.sayfa - b.sayfa);
}

/** OA77: kitap okurken "Sınavda sor" diye etiketlenen notlar (silinmiş kitabınkiler hariç) + kitap adı.
 *  Sınav Hazırla'daki "Sınav için ayırdıkların" listesi. Sıra: sınava alınmamışlar önce, yeniden eskiye. */
export function sinavIcinAyrilanNotlar(): Array<KitapNotuKaydi & { kitapAd: string }> {
  const kitapAd = new Map(db.kitaplar.map((k) => [k.id, k.ad] as const));
  return db.kitapNotlari
    .filter((n) => n.amac === "sinav" && kitapAd.has(n.kitapId))
    .map((n) => ({ ...n, kitapAd: kitapAd.get(n.kitapId) ?? "" }))
    .sort((a, b) => Number(!!a.sinavaAlindi) - Number(!!b.sinavaAlindi) || (a.eklenme < b.eklenme ? 1 : a.eklenme > b.eklenme ? -1 : 0));
}

export function kitapNotuEkle(kayit: Omit<KitapNotuKaydi, "id" | "eklenme" | "guncelleme">): KitapNotuKaydi {
  const zaman = simdiYerelISO();
  const yeni: KitapNotuKaydi = { ...kayit, id: crypto.randomUUID(), eklenme: zaman, guncelleme: zaman };
  const onceki = db.kitapNotlari;
  try {
    db.kitapNotlari = [...db.kitapNotlari, yeni];
    kaydet(db);
    return yeni;
  } catch (err) {
    db.kitapNotlari = onceki;
    throw err;
  }
}

export function kitapNotuGuncelle(id: string, patch: Partial<Omit<KitapNotuKaydi, "id" | "kitapId" | "eklenme">>): void {
  const onceki = db.kitapNotlari;
  try {
    db.kitapNotlari = db.kitapNotlari.map((n) => (n.id === id ? { ...n, ...patch, guncelleme: simdiYerelISO() } : n));
    kaydet(db);
  } catch (err) {
    db.kitapNotlari = onceki;
    throw err;
  }
}

export function kitapNotuSil(id: string): void {
  const onceki = db.kitapNotlari;
  try {
    db.kitapNotlari = db.kitapNotlari.filter((n) => n.id !== id);
    kaydet(db);
  } catch (err) {
    db.kitapNotlari = onceki;
    throw err;
  }
}

export function kitapNotuGeriYukle(kayit: KitapNotuKaydi): void {
  if (db.kitapNotlari.some((n) => n.id === kayit.id)) { kaydet(db); return; }
  const onceki = db.kitapNotlari;
  try {
    db.kitapNotlari = [...db.kitapNotlari, kayit];
    kaydet(db);
  } catch (err) {
    db.kitapNotlari = onceki;
    throw err;
  }
}

// ─── Sınav kütüphanesi (metadata) ───────────────────────────────────────────
// İçerik burada DEĞİL: sinav-olusturucu/storage/taslakDepo.ts, IndexedDB'de
// sinavId anahtarıyla. Buradaki sayaçlar önbelleklidir; liste ekranı içeriğe
// hiç dokunmadan çizilebilsin diye (bkz. types.ts SinavKaydi yorumu).

/** Aynı anda kütüphanede tutulabilecek AKTİF sınav sayısı. Arşivdekiler
 *  sayılmaz — sınır, Mayıs ayında öğretmeni tıkamak için değil, diskin
 *  farkında olmadan şişmesini engellemek içindir. */
export const AZAMI_AKTIF_SINAV = 20;

export function sinavlarGetir(): SinavKaydi[] {
  return db.sinavlar;
}

export function aktifSinavSayisi(): number {
  return db.sinavlar.filter((sinav) => !sinav.arsiv).length;
}

export function sinavBul(id: string): SinavKaydi | undefined {
  return db.sinavlar.find((sinav) => sinav.id === id);
}

export function sinavEkle(
  kayit: Omit<SinavKaydi, "id" | "olusturma" | "guncelleme"> & { id?: string },
): SinavKaydi {
  if (!kayit.arsiv && aktifSinavSayisi() >= AZAMI_AKTIF_SINAV) {
    throw new Error(
      `Kütüphanede en fazla ${AZAMI_AKTIF_SINAV} aktif sınav tutulabilir. Devam etmek için bir sınavı arşivleyin.`,
    );
  }
  const zaman = simdiYerelISO();
  const yeni: SinavKaydi = {
    ...kayit,
    id: kayit.id ?? crypto.randomUUID(),
    olusturma: zaman,
    guncelleme: zaman,
  };
  const onceki = db.sinavlar;
  try {
    db.sinavlar = [...db.sinavlar, yeni];
    kaydet(db);
    return yeni;
  } catch (err) {
    db.sinavlar = onceki;
    throw err;
  }
}

export function sinavGuncelle(
  id: string,
  yama: Partial<Omit<SinavKaydi, "id" | "olusturma">>,
): void {
  const onceki = db.sinavlar;
  try {
    db.sinavlar = db.sinavlar.map((sinav) =>
      sinav.id === id ? { ...sinav, ...yama, guncelleme: simdiYerelISO() } : sinav,
    );
    kaydet(db);
  } catch (err) {
    db.sinavlar = onceki;
    throw err;
  }
}

/** Arşivleme İÇERİĞİ SİLMEZ; yalnız kütüphane listesinden gizler
 *  (kitaplardaki `arsiv` kalıbı). Geri almak tek tıktır. */
export function sinavArsivle(id: string, arsiv: boolean): void {
  if (!arsiv && aktifSinavSayisi() >= AZAMI_AKTIF_SINAV) {
    throw new Error(
      `Arşivden çıkarmak için önce başka bir sınavı arşivleyin (aktif sınır: ${AZAMI_AKTIF_SINAV}).`,
    );
  }
  sinavGuncelle(id, { arsiv });
}

export function sinavSil(id: string): void {
  const onceki = db.sinavlar;
  try {
    db.sinavlar = db.sinavlar.filter((sinav) => sinav.id !== id);
    kaydet(db);
  } catch (err) {
    db.sinavlar = onceki;
    throw err;
  }
}

/** Geri alma (silme toast'ı) için: kayıt aynı kimlikle geri konur. */
export function sinavGeriYukle(kayit: SinavKaydi): void {
  if (db.sinavlar.some((sinav) => sinav.id === kayit.id)) { kaydet(db); return; }
  const onceki = db.sinavlar;
  try {
    db.sinavlar = [...db.sinavlar, kayit];
    kaydet(db);
  } catch (err) {
    db.sinavlar = onceki;
    throw err;
  }
}

export function foylerGetir(): FoyKaydi[] {
  return db.foyler.map((foy) => foySiniflariniNormalle(foy));
}

export function foyEkle(kayit: Omit<FoyKaydi, "id" | "olusturma">): FoyKaydi {
  const yeni: FoyKaydi = { ...kayit, id: crypto.randomUUID(), olusturma: simdiYerelISO() };
  const oncekiFoyler = db.foyler;
  try {
    db.foyler = [...db.foyler, yeni];
    kaydet(db);
    return yeni;
  } catch (err) {
    db.foyler = oncekiFoyler;
    throw err;
  }
}

export function foyGuncelle(
  id: string,
  patch: Partial<Omit<FoyKaydi, "id" | "olusturma">>,
): void {
  const onceki = db.foyler;
  try {
    db.foyler = db.foyler.map((foy) =>
      foy.id === id ? foySiniflariniNormalle({ ...foy, ...patch }) : foy,
    );
    kaydet(db);
  } catch (err) {
    db.foyler = onceki;
    throw err;
  }
}

export type FoyBagliKayitOzeti = { odev: number; puan: number };

export function foyeBagliKayitOzeti(id: string): FoyBagliKayitOzeti {
  const odevIds = new Set(db.odevler.filter((o) => o.foyId === id).map((o) => o.id));
  return {
    odev: odevIds.size,
    puan: db.odevPuanlari.filter((p) => odevIds.has(p.odevId)).length,
  };
}

/** Varsayılan güvenli silme yalnız föy belgesini kaldırır. Bağlı ödevler ve
 * öğrenci puanları korunur; artık var olmayan föye açılan bağlantı bırakmamak
 * için ödevlerin opsiyonel foyId referansı çözülür. İlişkili kayıtları silmek
 * çağıranın açıkça `bagliKayitlariSil: true` vermesini gerektirir. */
export function foySil(id: string, secenek: { bagliKayitlariSil?: boolean } = {}): void {
  const oncekiFoyler = db.foyler;
  const oncekiOdevler = db.odevler;
  const oncekiOdevPuanlari = db.odevPuanlari;
  const silinecekOdevIds = new Set(db.odevler.filter((o) => o.foyId === id).map((o) => o.id));
  try {
    db.foyler = db.foyler.filter((f) => f.id !== id);
    if (secenek.bagliKayitlariSil) {
      db.odevler = db.odevler.filter((o) => !silinecekOdevIds.has(o.id));
      db.odevPuanlari = db.odevPuanlari.filter((p) => !silinecekOdevIds.has(p.odevId));
    } else {
      db.odevler = db.odevler.map((o) => o.foyId === id ? { ...o, foyId: undefined } : o);
    }
    kaydet(db);
  } catch (err) {
    db.foyler = oncekiFoyler;
    db.odevler = oncekiOdevler;
    db.odevPuanlari = oncekiOdevPuanlari;
    throw err;
  }
}

/** Test/geliştirme: veritabanını seed'e döndür. */
export function sifirla(): void {
  const onceki = db;
  try {
    db = ilkVeri();
    veriDegisti();
    kaydet(db);
  } catch (err) {
    db = onceki;
    veriDegisti();
    throw err;
  }
}

/** Zarfın önizlemesi, uygulamada kullanılacak aynı saf plan üzerinden üretilir. */
export function telefonZarfPlani(zarf: IslemeZarfi, telefonKazanir = false) {
  return telefonPlani(db, zarf, telefonKazanir);
}

/** Tek kalıcı yazma: başarı kesinleşene kadar mevcut DB değişmez, zarf silinmez. */
export async function telefonZarfiniUygula(zarf: IslemeZarfi, karar: ZarfCakismaKarari) {
  if (telefonYazimiSuruyor) throw new Error("Bir telefon aktarımı zaten kaydediliyor.");
  if (db.donemDurumu.aktifDonem === null) throw new Error("Yıl sonu kapalıyken aktarım yapılamaz.");
  const plan = telefonPlani(db, zarf, karar === "telefonKazanir");
  if (karar === "sor" && plan.degisiklikler.some(d => d.cakisma)) throw new Error("Çakışmalar için önce bir karar seçin.");
  // OA74: paket dönemi, 1. dönem kapandıysa tarihe göre düzeltilir (normalleştir'le aynı kural).
  const yeni = { ...db, gunlukKayitlar: gunlukDonemleriniTarihtenOnar(plan.veri.gunlukKayitlar, db.donemDurumu), gunlukIslendi: plan.veri.gunlukIslendi,
    odevPuanlari: plan.veri.odevPuanlari, sonGunlukId: plan.veri.sonGunlukId,
    dersYapilmadi: plan.veri.dersYapilmadi ?? db.dersYapilmadi, gelmedi: plan.veri.gelmedi ?? db.gelmedi };
  telefonYazimiSuruyor = true;
  try {
    const json = seri(yeni);
    if (kaliciDepoVarMi()) await sqliteJsonHemenKaydet(json);
    else localStorage.setItem(ANAHTAR, json);
    db = yeni;
    veriDegisti();
    if (typeof window !== "undefined") window.dispatchEvent(new Event("oa-veri-degisti"));
    return plan;
  } finally { telefonYazimiSuruyor = false; }
}
