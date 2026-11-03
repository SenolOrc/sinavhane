// modules/ders-kitabi/storage/foyDepo.ts — föy İÇERİĞİ (gömülü JPEG'ler nedeniyle
// büyük) burada, IndexedDB'de, foyId anahtarıyla saklanır — Veritabani JSON blob'una
// GİRMEZ (bkz. types.ts FoyKaydi yorumu: blob bütün halinde kaydedildiğinden gömülü
// görseller her kaydı şişirir). taslakDepo.ts'teki tek-anahtarlı kalıbın çok-anahtarlı hali.
//
// Şekil kasıtlı olarak sınav oluşturucunun SinavTaslagi tipini İMPORT ETMEZ (modüller
// birbirinin kodunu çağırmaz, CLAUDE.md) — sınav oluşturucu tarafındaki asıl "föyü aç/
// yazdır" entegrasyonu (Faz 2'nin geri kalanı) bu JSON'u kendi şemasına göre okuyacak.
export type FoyIcerigi = {
  ad: string;
  sinifIdler?: number[];
  /** Yalnız eski IndexedDB kayıtlarını okuyabilmek için; yeni yazım üretmez. */
  sinifId?: number;
  teslim?: string;
  sorular: {
    id: string;
    gorselDataUrl: string;
    gorselOran: number;
    /** Kırpma sırasında sayfanın tamamı seçildiyse true (bkz. kirpmaGom.ts).
     *  Yalnız bu soru tam sayfa basılır/kendi sayfasını alır; normal (tekil)
     *  kırpmalar kompakt basılır (bkz. lib/foySayfalama.ts). */
    tamSayfaMi?: boolean;
    kaynakAd?: string;
    kirpmaId?: string;
    paketId?: string;
    paketSira?: number;
    paketParcaSayisi?: number;
    paketBasligi?: string;
  }[];
  olusturma: string;
};

export function foyMantiksalSoruSayisi(icerik: FoyIcerigi): number {
  return new Set(icerik.sorular.map((soru) => soru.paketId || soru.id)).size;
}

const DB_ADI = "ogretmen-asistani-ders-kitabi";
const STORE_ADI = "foyler";

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

export async function foyIcerigiKaydet(foyId: string, icerik: FoyIcerigi): Promise<void> {
  await storeIslemi("readwrite", (store) => store.put(icerik, foyId));
}

export async function foyIcerigiOku(foyId: string): Promise<FoyIcerigi | null> {
  const sonuc = await storeIslemi<FoyIcerigi>("readonly", (store) => store.get(foyId));
  return sonuc ?? null;
}

export async function foyIcerigiSil(foyId: string): Promise<void> {
  await storeIslemi("readwrite", (store) => {
    store.delete(foyId);
  });
}

export type FoyDepoSnapshoti = Record<string, FoyIcerigi>;

export async function foyDeposuSnapshotiAl(): Promise<FoyDepoSnapshoti> {
  const db = await veritabaniAc();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_ADI, "readonly");
    const store = tx.objectStore(STORE_ADI);
    const sonuc: FoyDepoSnapshoti = {};
    const istek = store.openCursor();
    istek.onerror = () => reject(istek.error);
    istek.onsuccess = () => {
      const cursor = istek.result;
      if (!cursor) return;
      if (typeof cursor.key === "string") sonuc[cursor.key] = cursor.value as FoyIcerigi;
      cursor.continue();
    };
    tx.oncomplete = () => { db.close(); resolve(sonuc); };
    tx.onerror = () => { db.close(); reject(tx.error); };
    tx.onabort = () => { db.close(); reject(tx.error ?? new Error("Föy deposu okuma işlemi iptal edildi.")); };
  });
}

/** Verilen snapshot kanonik yeni durumdur; eski/orphan kayıtlar aynı transaction'da temizlenir. */
export async function foyDeposunuGeriYukle(snapshot: FoyDepoSnapshoti): Promise<void> {
  await storeIslemi("readwrite", (store) => {
    store.clear();
    for (const [foyId, icerik] of Object.entries(snapshot)) store.put(icerik, foyId);
  });
}

/** Depoyu tamamen boşaltır (yıl geçişi). Ayrı bir ad taşıyor çünkü çağrı yerinde
 *  niyet "boş snapshot geri yükle" değil "föy içeriklerini KALICI sil" —
 *  bkz. lib/yilGecisi.ts. */
export async function foyDeposunuTemizle(): Promise<void> {
  await storeIslemi("readwrite", (store) => {
    store.clear();
  });
}
