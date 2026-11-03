// db/persistence.ts — Tauri/SQLite kalıcı depo köprüsü.
// Repo hâlâ senkron çalışır; bu katman Tauri varsa JSON veriyi SQLite dosyasına
// yazar. Tarayıcı önizlemesinde localStorage yedek/fallback olarak kalır.
import { androidIstek, kaliciDepoVarMi, platform } from "@/lib/platform";

let kaydetZamanlayici: number | null = null;
let sonJson = "";
let sonHata: string | null = null;

// Masaüstünde ASIL depo SQLite. sqliteJsonKaydet debounce'lu ve invoke hatasını
// yalnız console.warn'a yazıyordu; sonHata'yı okuyan tek yer de Ayarlar ekranıydı
// (kaliciDepoBilgisi → AyarlarScreen). Yani disk dolduğunda/dosya kilitlendiğinde
// öğretmen bütün gün çalışıp uygulamayı kapatana kadar hiçbir şey görmüyor, açınca
// o günkü işi yok oluyordu. Abonelik, hatayı OLUŞTUĞU AN uygulama geneline duyurur.
const dinleyiciler = new Set<() => void>();

function durumuDuyur() {
  for (const dinleyici of dinleyiciler) dinleyici();
}

/** Kalıcı depo hata durumu değişince tetiklenir. Dönen fonksiyon aboneliği bırakır. */
export function kaliciDurumAbone(dinleyici: () => void): () => void {
  dinleyiciler.add(dinleyici);
  return () => dinleyiciler.delete(dinleyici);
}

function hatayiAyarla(yeni: string | null) {
  if (sonHata === yeni) return; // gereksiz render yok
  sonHata = yeni;
  durumuDuyur();
}

async function invoke<T>(komut: string, args?: Record<string, unknown>): Promise<T> {
  // Android "tam uygulama": aynı iki komutun Java karşılığı (şifreli dosya,
  // Android Keystore anahtarı; bkz. apps/android/.../Depo.java).
  if (platform() === "android") {
    if (komut === "db_yukle_json") return androidIstek<T>("dbOku");
    if (komut === "db_kaydet_json") return androidIstek<T>("dbYaz", { json: args?.json });
    if (komut === "db_dosyasi_yolu") return "Telefon: uygulamanın özel deposu (şifreli)" as T;
    throw new Error(`Bu işlem telefonda yok: ${komut}`);
  }
  const api = await import("@tauri-apps/api/core");
  return api.invoke<T>(komut, args);
}

let yazmaSirasi: Promise<unknown> = Promise.resolve();
function siraliYaz(json: string): Promise<void> {
  const is = yazmaSirasi.catch(() => undefined).then(() => invoke<void>("db_kaydet_json", { json }));
  yazmaSirasi = is;
  return is;
}

export async function sqliteJsonYukle(): Promise<string | null> {
  if (!kaliciDepoVarMi()) return null;
  try {
    const sonuc = await invoke<string | null>("db_yukle_json");
    hatayiAyarla(null); // yalnız BAŞARIDA temizle
    return sonuc;
  } catch (err) {
    hatayiAyarla(err instanceof Error ? err.message : String(err));
    console.warn("SQLite veri yüklenemedi", err);
    return null;
  }
}

/** Yazımı toplayan bekleme. Ard arda gelen kayıtlar tek diske yazımda birleşsin diye. */
const DEBOUNCE_MS = 250;

/**
 * Bir yazımın erteleyebileceği AZAMİ süre.
 *
 * NEDEN VAR: debounce zamanlayıcısı HER kayıtta sıfırlanıyor. Aralarında 250 ms'den
 * az duran bir değişiklik akışı (metin yazarken tetiklenen autosave) yazımı süresiz
 * erteleyebilir — yani "en fazla 250 ms'lik iş kaybolur" sanılan şeyin üst sınırı
 * yok. Tavan, kaybı kapanış kancasından BAĞIMSIZ olarak sınırlar: uygulama nasıl
 * ölürse ölsün (Cmd+Q, Zorla Çık, elektrik kesintisi, çökme) diskteki veri en fazla
 * bu kadar geride kalır.
 */
const AZAMI_BEKLEME_MS = 2000;

/** İlk bekleyen kaydın zamanı; bekleyen yokken null. Tavan bundan hesaplanıyor. */
let ilkBekleyisZamani: number | null = null;

function bekleyeniDiskeYaz(): void {
  kaydetZamanlayici = null;
  ilkBekleyisZamani = null;
  siraliYaz(sonJson)
    // Başarıda hatayı TEMİZLE: yoksa geçici bir hata (dosya bir an kilitli)
    // uygulama kapanana kadar uyarıyı ekranda tutar, öğretmen de gerçek bir
    // sorunla geçmiş bir sorunu ayırt edemez.
    .then(() => hatayiAyarla(null))
    .catch((err) => {
      hatayiAyarla(err instanceof Error ? err.message : String(err));
      console.warn("SQLite veri kaydedilemedi", err);
    });
}

export function sqliteJsonKaydet(json: string): void {
  if (!kaliciDepoVarMi()) return;
  sonJson = json;
  const simdi = Date.now();
  if (ilkBekleyisZamani == null) ilkBekleyisZamani = simdi;
  if (kaydetZamanlayici != null) window.clearTimeout(kaydetZamanlayici);
  // Normalde 250 ms ertele; ama ilk bekleyen kayıttan bu yana geçen süre tavana
  // dayandıysa erteleme kısalır ve 0'a iner — yazım artık ötelenemez.
  const kalanTavan = AZAMI_BEKLEME_MS - (simdi - ilkBekleyisZamani);
  const gecikme = Math.max(0, Math.min(DEBOUNCE_MS, kalanTavan));
  kaydetZamanlayici = window.setTimeout(bekleyeniDiskeYaz, gecikme);
}

/** repo.ts::ANAHTAR ile AYNI olmalı (test: denetim-oa74-hizli bunu kaynaktan doğrular). */
export const TARAYICI_DEPO_ANAHTARI = "ogretmen-asistani.db.v6";

/**
 * OA74 (denetim, yalnız tarayıcı önizlemesi): kalıcı depo YOKKEN localStorage TEK depodur.
 * `repo.ts::veritabaniHazirla` "SQLite'a göç başarılı" sayıp (bu fonksiyon tarayıcıda hiçbir şey
 * yazmadan döndüğü için) anahtarı siliyordu → kayıt yapılmadan ikinci yenilemede bütün veri
 * kayboluyordu ([var, görünüyor] → [yok, görünmüyor]). Göç yapılamadığına göre kopya yerinde
 * kalmalı: çağıranın senkron devamı (removeItem) bittikten sonra anahtar YOKSA geri yazılır. Anahtar
 * varsa (arada yeni bir kayıt yazıldıysa) dokunulmaz — daha yeni veri ezilmez. Tauri/Android yolu
 * (kaliciDepoVarMi) bu fonksiyona hiç girmez.
 * Asıl temiz düzeltme repo.ts'te YAPILDI (OA74 hız turu): veritabaniHazirla'nın göç dalı
 * `kaliciDepoVarMi()` değilse removeItem çağırmıyor. Bu koruma zararsız ikinci emniyet olarak kalır.
 */
function tarayiciKopyasiniKoru(json: string): void {
  const ls = typeof localStorage !== "undefined" ? localStorage : undefined;
  if (!ls) return;
  globalThis.setTimeout(() => {
    try {
      if (ls.getItem(TARAYICI_DEPO_ANAHTARI) === null) ls.setItem(TARAYICI_DEPO_ANAHTARI, json);
    } catch {
      // Kota dolu: tarayıcı önizlemesinde yapılacak başka şey yok (kaydet() zaten DepoDoluHatasi verir).
    }
  }, 0);
}

export async function sqliteJsonHemenKaydet(json: string): Promise<void> {
  if (!kaliciDepoVarMi()) { tarayiciKopyasiniKoru(json); return; }
  if (kaydetZamanlayici != null) {
    window.clearTimeout(kaydetZamanlayici);
    kaydetZamanlayici = null;
  }
  ilkBekleyisZamani = null;
  sonJson = json;
  try {
    await siraliYaz(json);
    hatayiAyarla(null); // yalnız BAŞARIDA temizle
  } catch (err) {
    hatayiAyarla(err instanceof Error ? err.message : String(err));
    throw err;
  }
}

/**
 * Bekleyen debounce'lu yazımı hemen diske indirir; bekleyen yoksa hiçbir şey yapmaz.
 *
 * NEDEN: `sqliteJsonKaydet` 250 ms'lik bir `setTimeout` içinde yazıyor ve zamanlayıcı
 * HER kayıtta sıfırlanıyor. Yani kayıp penceresi "250 ms" değil: aralarında 250 ms'den
 * az duran bir değişiklik akışı (yazarken autosave) yazımı süresiz erteleyebilir.
 * O sırada uygulama kapanırsa yazım hiç gerçekleşmez, üstelik bellek "kaydedildi"
 * sanır — `kaydet` çağrısı senkron döndüğü için hiçbir yerde hata görünmez.
 *
 * `sqliteJsonHemenKaydet`'ten farkı FIRLATMAMASI: bunu çağıran yer pencere kapanışı
 * ve orada bir istisna pencereyi kapanamaz hâle getirir. Hata yine `hatayiAyarla`
 * ile duyuruluyor (banner'ı besleyen yol), yalnız yukarı taşınmıyor.
 * Dönen değer boşaltmanın gerçekten yazıp yazmadığını söyler — testler bunu okuyor.
 */
export async function sqliteBekleyeniBosalt(): Promise<"yazildi" | "bekleyen-yok" | "hata"> {
  if (!kaliciDepoVarMi()) return "bekleyen-yok";
  if (kaydetZamanlayici == null) return "bekleyen-yok";
  window.clearTimeout(kaydetZamanlayici);
  kaydetZamanlayici = null;
  ilkBekleyisZamani = null;
  try {
    await siraliYaz(sonJson);
    hatayiAyarla(null); // yalnız BAŞARIDA temizle
    return "yazildi";
  } catch (err) {
    hatayiAyarla(err instanceof Error ? err.message : String(err));
    console.warn("Kapanışta bekleyen SQLite yazımı tamamlanamadı", err);
    return "hata";
  }
}

export async function sqliteDosyaYolu(): Promise<string | null> {
  if (!kaliciDepoVarMi()) return null;
  try {
    return await invoke<string>("db_dosyasi_yolu");
  } catch {
    return null;
  }
}

export function sonKaliciHata(): string | null {
  return sonHata;
}
