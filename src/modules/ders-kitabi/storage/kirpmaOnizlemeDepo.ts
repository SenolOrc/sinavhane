// modules/ders-kitabi/storage/kirpmaOnizlemeDepo.ts — kırpma/bölge-notu küçük
// resimleri, foyDepo.ts'teki kalıbı izleyerek IndexedDB'de saklanır.
// TÜRETİLMİŞ VERİDİR: kaynak her zaman ekrandaki sayfa canvas'ıdır (bkz.
// lib/kirpmaOnizleme.ts), buradaki kayıt yalnızca bir önbellektir — silinmesi
// veri kaybı DEĞİLDİR. Ana repo JSON'una girmez; PDF yeniden bağlanmadan arşivli
// sorular görülebilsin diye uygulama-geneli tam yedek v2'ye ayrıca dahil edilir.
// Anahtar genelde bir kırpma id'sidir; bölge-notu önizlemeleri için notun
// kendi id'si aynı depoda kullanılır (ikisi de crypto.randomUUID() ile üretilir,
// çakışma riski yok) — ayrı bir mağaza açmak gereksiz ikilik yaratırdı.
// Ayrı bir veritabanı adı kasıtlı: foyDepo.ts "ogretmen-asistani-ders-kitabi"
// adını kendi sürüm/onupgradeneeded'iyle yönetiyor — aynı adı farklı bir sürüm
// numarasıyla burada da açmak, iki dosyanın birbirinden habersiz
// onupgradeneeded'leri arasında çakışıp bir mağazanın hiç oluşmamasına yol
// açabilirdi (IndexedDB, veritabanı ilk açılışta hangi sürüm istenmişse
// yalnızca O çağrının onupgradeneeded'ini çalıştırır).
const DB_ADI = "ogretmen-asistani-ders-kitabi-onizleme";
const STORE_ADI = "kirpma-onizlemeleri";

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

export async function kirpmaOnizlemeKaydet(id: string, dataUrl: string): Promise<void> {
  await storeIslemi("readwrite", (store) => store.put(dataUrl, id));
}

/** Kayıt yoksa null döner — HATA VERMEZ, yeniden üretmeye çalışmaz (eski
 * kırpmalar/notlar için kabul edilen durum; çağıran taraf ikon placeholder'da kalır). */
export async function kirpmaOnizlemeOku(id: string): Promise<string | null> {
  try {
    const sonuc = await storeIslemi<string>("readonly", (store) => store.get(id));
    return sonuc ?? null;
  } catch {
    return null;
  }
}

export async function kirpmaOnizlemeSil(id: string): Promise<void> {
  await storeIslemi("readwrite", (store) => {
    store.delete(id);
  });
}

export type KirpmaOnizlemeDepoSnapshoti = Record<string, string>;

export async function kirpmaOnizlemeDeposuSnapshotiAl(): Promise<KirpmaOnizlemeDepoSnapshoti> {
  const db = await veritabaniAc();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_ADI, "readonly");
    const store = tx.objectStore(STORE_ADI);
    const sonuc: KirpmaOnizlemeDepoSnapshoti = {};
    const istek = store.openCursor();
    istek.onerror = () => reject(istek.error);
    istek.onsuccess = () => {
      const cursor = istek.result;
      if (!cursor) return;
      if (typeof cursor.key === "string" && typeof cursor.value === "string") sonuc[cursor.key] = cursor.value;
      cursor.continue();
    };
    tx.oncomplete = () => { db.close(); resolve(sonuc); };
    tx.onerror = () => { db.close(); reject(tx.error); };
    tx.onabort = () => { db.close(); reject(tx.error ?? new Error("Önizleme deposu okuma işlemi iptal edildi.")); };
  });
}

export async function kirpmaOnizlemeDeposunuGeriYukle(snapshot: KirpmaOnizlemeDepoSnapshoti): Promise<void> {
  await storeIslemi("readwrite", (store) => {
    store.clear();
    for (const [id, dataUrl] of Object.entries(snapshot)) store.put(dataUrl, id);
  });
}
