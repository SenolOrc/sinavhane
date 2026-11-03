// lib/veriDosyasi.ts — app_data_dir() altında göreli bir "alt yol" ile çalışan
// genel ikili dosya deposu (Ders Kitabı modülü: PDF + thumbnail önbelleği).
// Tauri'de Rust'taki veri_dosyasi_*/veri_klasoru_* komutlarına gider; tarayıcı
// önizlemesinde aynı "alt yol" anahtarıyla IndexedDB'de saklanır — persistence.ts'teki
// SQLite/localStorage ikili stratejisiyle, taslakDepo.ts'teki IndexedDB kalıbıyla aynı.
import { tauriVarMi } from "@/lib/tauri";
import { androidIstek, androidVarMi, parcaliGonder } from "@/lib/platform";

// OA85 — Telefon (Android tam + iOS kabuğu): dosyalar artık IndexedDB'de DEĞİL, uygulamanın kendi
// klasöründe (Android files/veri, iOS Application Support/veri). Yazım parça parça köprüden; okuma
// `/veri/<altYol>` adresinden (pdf.js URL'den akışla okur, kitabın tamamını belleğe almaz). IndexedDB
// yalnız ESKİ kurulumların verisi için okunur: dosya ilk açıldığında yerel klasöre taşınır, IndexedDB'den
// silinir (tembel göç). Neden: IndexedDB kotası dolabilir, iOS yer daralınca web verisini silebilir.
function telefonMu(): boolean {
  return !tauriVarMi() && androidVarMi();
}
function telefonUrl(altYol: string): string {
  return `/veri/${altYol.split("/").map(encodeURIComponent).join("/")}`;
}
async function telefondaVar(altYol: string): Promise<boolean> {
  return !!(await androidIstek<boolean>("veriVar", { altYol }));
}
async function telefonaYaz(altYol: string, veri: Uint8Array): Promise<void> {
  const oturum = await parcaliGonder(veri);
  await androidIstek("veriYazBitir", { oturum, altYol });
}
/** Eski kurulum: IndexedDB'deki dosyayı yerel klasöre taşır. Taşınamazsa IndexedDB'de kalır (veri kaybı yok). */
async function eskiyiTasi(altYol: string): Promise<boolean> {
  const eski = await storeIslemi<Uint8Array>("readonly", (store) => store.get(altYol)).catch(() => undefined);
  if (!eski) return false;
  try {
    await telefonaYaz(altYol, eski);
    await storeIslemi("readwrite", (store) => { store.delete(altYol); }).catch(() => undefined);
    return true;
  } catch (err) {
    console.warn("[veriDosyasi] eski dosya taşınamadı, IndexedDB'de kaldı:", altYol, err);
    return false;
  }
}

const DB_ADI = "ogretmen-asistani-veri-dosyalari";
const STORE_ADI = "dosyalar";

function veritabaniAc(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const istek = indexedDB.open(DB_ADI, 1);
    istek.onerror = () => reject(istek.error);
    istek.onupgradeneeded = () => {
      const db = istek.result;
      if (!db.objectStoreNames.contains(STORE_ADI)) db.createObjectStore(STORE_ADI);
    };
    istek.onsuccess = () => resolve(istek.result);
  });
}

async function storeIslemi<T>(
  mode: IDBTransactionMode,
  calistir: (store: IDBObjectStore) => IDBRequest<T> | void,
): Promise<T | undefined> {
  const db = await veritabaniAc();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_ADI, mode);
    const store = tx.objectStore(STORE_ADI);
    const istek = calistir(store);
    let sonuc: T | undefined;
    if (istek) {
      istek.onsuccess = () => {
        sonuc = istek.result;
      };
      istek.onerror = () => reject(istek.error);
    }
    tx.oncomplete = () => {
      db.close();
      resolve(sonuc);
    };
    tx.onerror = () => {
      db.close();
      reject(tx.error);
    };
  });
}

async function invoke<T>(komut: string, args?: Record<string, unknown>): Promise<T> {
  const api = await import("@tauri-apps/api/core");
  return api.invoke<T>(komut, args);
}

export async function veriDosyasiYaz(altYol: string, veri: Uint8Array): Promise<void> {
  if (tauriVarMi()) {
    const api = await import("@tauri-apps/api/core");
    const ham = veri.byteOffset === 0 && veri.byteLength === veri.buffer.byteLength
      ? veri
      : veri.slice();
    await api.invoke<void>("veri_dosyasi_yaz", ham, { headers: { "x-oa-alt-yol": altYol } });
    return;
  }
  if (telefonMu()) {
    await telefonaYaz(altYol, veri);
    await storeIslemi("readwrite", (store) => { store.delete(altYol); }).catch(() => undefined);
    return;
  }
  await storeIslemi("readwrite", (store) => store.put(veri, altYol));
}

export async function veriDosyasiOku(altYol: string): Promise<Uint8Array | null> {
  if (tauriVarMi()) {
    try {
      const sonuc = await invoke<ArrayBuffer>("veri_dosyasi_oku", { altYol });
      return new Uint8Array(sonuc);
    } catch (err) {
      if (String(err).includes("OA_DOSYA_YOK")) return null;
      throw err;
    }
  }
  if (telefonMu() && (await telefondaVar(altYol) || await eskiyiTasi(altYol))) {
    const yanit = await fetch(telefonUrl(altYol));
    if (yanit.ok) return new Uint8Array(await yanit.arrayBuffer());
  }
  const sonuc = await storeIslemi<Uint8Array>("readonly", (store) => store.get(altYol));
  return sonuc ?? null;
}

export async function veriDosyasiUrl(altYol: string): Promise<string | null> {
  if (telefonMu()) {
    if (await telefondaVar(altYol)) return telefonUrl(altYol);
    return (await eskiyiTasi(altYol)) ? telefonUrl(altYol) : null;
  }
  if (!tauriVarMi()) return null;
  const api = await import("@tauri-apps/api/core");
  const tamYol = await api.invoke<string | null>("veri_dosyasi_tam_yol", { altYol });
  return tamYol ? api.convertFileSrc(tamYol) : null;
}

export async function veriDosyasiSil(altYol: string): Promise<void> {
  if (tauriVarMi()) {
    await invoke<void>("veri_dosyasi_sil", { altYol });
    return;
  }
  if (telefonMu()) await androidIstek("veriSil", { altYol });
  await storeIslemi("readwrite", (store) => {
    store.delete(altYol);
  });
}

/**
 * Klasörün diskteki boyutu; ölçülemiyorsa `null`.
 *
 * Eskiden tarayıcı önizlemesinde 0 dönüyordu ve çağıran bunu gerçek bir ölçüm
 * sanıp "Kitaplarınız 0 B" yazıyordu — yani ölçüm YOKKEN ölçüm varmış gibi bir
 * sayı gösteriliyordu. `null`, "bilmiyorum"u "sıfır"dan ayırıyor; çağıran da
 * göstergeyi hiç çizmiyor. (Gerçek 0 hâlâ mümkün: klasör boşsa 0 döner.)
 */
export async function veriKlasoruBoyutu(altYol: string): Promise<number | null> {
  if (telefonMu()) return androidIstek<number>("veriKlasorBoyut", { altYol });
  if (!tauriVarMi()) return null;
  return invoke<number>("veri_klasoru_boyutu", { altYol });
}

export async function veriKlasoruTemizle(altYol: string): Promise<void> {
  if (telefonMu()) { await androidIstek("veriKlasorTemizle", { altYol }); return; }
  if (!tauriVarMi()) return;
  await invoke<void>("veri_klasoru_temizle", { altYol });
}

/** Dosya var mı — içeriği OKUMADAN (masaüstü/telefon). Tarayıcı önizlemesinde IndexedDB'ye bakar. */
export async function veriDosyasiVarMi(altYol: string): Promise<boolean> {
  if (tauriVarMi() || telefonMu()) return !!(await veriDosyasiUrl(altYol));
  return !!(await veriDosyasiOku(altYol));
}
