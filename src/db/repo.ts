// db/repo.ts — Sınavhane'nin veri katmanı: sınav kütüphanesi metadata'sı ve okul profili.
//
// Ekranlar bu repo ARAYÜZÜNÜ çağırır. Masaüstünde asıl kalıcı depo Tauri tarafındaki
// SQLite dosyasıdır (persistence.ts); tarayıcı önizlemesinde localStorage tek depodur.
// Sınav İÇERİĞİ burada değil: sinav-olusturucu/storage/taslakDepo.ts (IndexedDB).
//
// VERİ UYUMLULUĞU: kayıt biçimi eski "Öğretmen Asistanı" çekirdeğiyle AYNI tek JSON
// nesnesidir (aynı localStorage anahtarı, aynı SQLite komutları). Bu dosya yalnız
// `sinavlar` ve `ayarlar.okulProfili` alanlarını yönetir; okunan veride bulunan diğer
// TÜM alanlar (eski sürümlerden kalan sınıf/öğrenci/ödev tabloları, diğer ayarlar)
// dokunulmadan bellekte tutulur ve her kayıtta aynen geri yazılır — hiçbir veri düşmez.
//
// ZORUNLU KURAL: her `kaydet(db)` çağrısı bir `try` içinde olmalı ve `catch` bloğu
// değiştirilen alanı çağrıdan ÖNCEKİ değerine geri yükleyip hatayı yeniden fırlatmalı
// (kota dolarsa değişiklik bellekte "hayalet" olarak kalmasın). Diziyi yerinde
// değiştirme (`push`), her zaman yeni dizi kur (`db.x = [...db.x, y]`).

import type { OkulProfili, SinavKaydi } from "@shared/types";
import { kaliciDepoVarMi } from "@/lib/platform";
import { sqliteJsonHemenKaydet, sqliteJsonKaydet, sqliteJsonYukle } from "@/db/persistence";

/** persistence.ts::TARAYICI_DEPO_ANAHTARI ile AYNI olmalı. DEĞİŞTİRME: mevcut kullanıcı verisi bu anahtarda. */
const ANAHTAR = "ogretmen-asistani.db.v6";
/** Eski sürümlerin bıraktığı şifresiz geri-yükleme izi; kalıcı depoda temizlenir. */
const GERI_YUKLEME_ONCESI_ANAHTARI = "ogretmen-asistani.db.v6.geri-yukleme-oncesi";

type Ayarlar = Record<string, unknown> & { okulProfili?: OkulProfili };

/** Kalıcı veri nesnesi. Bilinmeyen alanlar (eski tablolar) index imzasıyla korunur. */
interface Veritabani {
  [alan: string]: unknown;
  sinavlar: SinavKaydi[];
  ayarlar: Ayarlar;
}

function nesneMi(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === "object" && !Array.isArray(v);
}

/** Yerel tarih-saat: YYYY-MM-DDTHH:mm:ss (UTC değil; gece yarısı kayması olmasın). */
function simdiYerelISO(d = new Date()): string {
  const iki = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${iki(d.getMonth() + 1)}-${iki(d.getDate())}T${iki(d.getHours())}:${iki(d.getMinutes())}:${iki(d.getSeconds())}`;
}

function ilkVeri(): Veritabani {
  return { sinavlar: [], ayarlar: {} };
}

const BOS_OKUL_PROFILI: OkulProfili = { okulAdi: "", ogretmenAdi: "", okulMuduru: "", ilce: "" };

function okulProfiliNormallestir(h: unknown): OkulProfili | undefined {
  if (!nesneMi(h)) return undefined;
  const m = (k: string) => (typeof h[k] === "string" ? (h[k] as string).slice(0, 200) : "");
  return { okulAdi: m("okulAdi"), ogretmenAdi: m("ogretmenAdi"), okulMuduru: m("okulMuduru"), ilce: m("ilce") };
}

/** Okunan ham nesneyi kullanılabilir hâle getirir. Yalnız yönetilen iki alanı güvenceye
 *  alır; geri kalan her alan olduğu gibi taşınır (eski veri kaybolmaz). */
function normallestir(kayitli: Record<string, unknown>): Veritabani {
  const ayarlar: Ayarlar = nesneMi(kayitli.ayarlar) ? { ...kayitli.ayarlar } : {};
  if ("okulProfili" in ayarlar) ayarlar.okulProfili = okulProfiliNormallestir(ayarlar.okulProfili);
  return {
    ...kayitli,
    // Sınav kütüphanesi öncesi kayıtlarda bu alan yok.
    sinavlar: Array.isArray(kayitli.sinavlar) ? (kayitli.sinavlar as SinavKaydi[]) : [],
    ayarlar,
  };
}

function parseVeri(ham: string | null): Veritabani | null {
  if (!ham) return null;
  try {
    const parsed: unknown = JSON.parse(ham);
    if (!nesneMi(parsed)) return null;
    // Eski yedek paketi biçimi ({ uygulama, veri }) de okunur.
    const veri = parsed.uygulama === "ogretmen-asistani" && nesneMi(parsed.veri) ? parsed.veri : parsed;
    return normallestir(veri);
  } catch {
    return null;
  }
}

function seri(v: Veritabani): string {
  return JSON.stringify(v);
}

function localYukle(): Veritabani {
  const kayitli = parseVeri(localStorage.getItem(ANAHTAR));
  if (kayitli) return kayitli;
  const v = ilkVeri();
  localStorage.setItem(ANAHTAR, seri(v));
  return v;
}

/** Kalıcı depoya YAZILAMADIĞINI çağırana bildiren hata (tarayıcıda localStorage kotası). */
class DepoDoluHatasi extends Error {
  constructor(readonly sebep: unknown) {
    super("Kayıt alanı doldu; bu işlem kaydedilemedi. Kullanmadığınız sınavları silip tekrar deneyin.");
    this.name = "DepoDoluHatasi";
  }
}

function kaydet(v: Veritabani): void {
  const json = seri(v);
  // SIRA ÖNEMLİ: SQLite masaüstünde ASIL depo; localStorage kotası dolsa bile kalıcı yazım engellenmesin.
  sqliteJsonKaydet(json);
  if (kaliciDepoVarMi()) {
    // Masaüstünde verinin WebView localStorage'ında ikinci (şifresiz) kopyası bırakılmaz.
    localStorage.removeItem(ANAHTAR);
    localStorage.removeItem(GERI_YUKLEME_ONCESI_ANAHTARI);
    return;
  }
  try {
    localStorage.setItem(ANAHTAR, json);
  } catch (err) {
    throw new DepoDoluHatasi(err);
  }
}

let db = localYukle();
let kaliciHazir = false;

/** Uygulama açılışında SQLite'ı yükle. İlk çalıştırmada mevcut localStorage verisini SQLite'a göç eder. */
export async function veritabaniHazirla(): Promise<void> {
  if (kaliciHazir) return;
  const sqliteVeri = parseVeri(await sqliteJsonYukle());
  if (sqliteVeri) {
    db = sqliteVeri;
    localStorage.removeItem(ANAHTAR);
  } else {
    try {
      await sqliteJsonHemenKaydet(seri(db));
      // Tarayıcı önizlemesinde (kalıcı depo yok) localStorage tek depodur → silinmez.
      if (kaliciDepoVarMi()) localStorage.removeItem(ANAHTAR);
    } catch {
      // Göç başarısızsa tek mevcut kopyayı silme; kalıcı depo uyarısı zaten görünür.
    }
  }
  kaliciHazir = true;
}

// ─── Okul profili (sınav başlığını doldurur) ──────────────────────────────────

export function okulProfiliGetir(): OkulProfili {
  return { ...BOS_OKUL_PROFILI, ...(db.ayarlar.okulProfili ?? {}) };
}

// ─── Sınav kütüphanesi (metadata) ───────────────────────────────────────────
// Buradaki sayaçlar önbelleklidir; liste ekranı içeriğe hiç dokunmadan çizilebilsin
// diye (bkz. types.ts SinavKaydi yorumu).

/** Aynı anda kütüphanede tutulabilecek AKTİF sınav sayısı. Arşivdekiler sayılmaz. */
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

/** Arşivleme İÇERİĞİ SİLMEZ; yalnız kütüphane listesinden gizler. Geri almak tek tıktır. */
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
