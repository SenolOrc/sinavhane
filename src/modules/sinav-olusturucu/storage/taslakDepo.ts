// Sınav İÇERİĞİ (gömülü görseller nedeniyle büyük) burada, IndexedDB'de,
// sinavId anahtarıyla saklanır — Veritabani JSON blob'una GİRMEZ. Metadata
// (ad/ders/soru sayısı/arşiv) db.sinavlar'da; bkz. types.ts SinavKaydi.
//
// v0.11C'ye kadar burada TEK anahtar vardı (`son-taslak-v011c`): tek slot,
// her kayıt bir öncekini eziyordu. Kütüphaneye geçişte o anahtar bir GÖÇ
// KAYNAĞI oldu — `eskiTekSlotuOku` onu okur, çağıran taraf kütüphaneye ilk
// sınav olarak alır ve `eskiTekSlotuTemizle` ile kaldırır.

import type { SinavTaslagi } from "../types";

const DB_ADI = "ogretmen-asistani-sinav-olusturucu";
const STORE_ADI = "taslaklar";
/** Kütüphane öncesi tek slot. Yalnız göç için okunur. */
const ESKI_TEK_SLOT_KEY = "son-taslak-v011c";
const SINAV_ON_EKI = "sinav:";

function sinavAnahtari(sinavId: string) {
  return `${SINAV_ON_EKI}${sinavId}`;
}

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

export async function sinavIcerigiOku(sinavId: string): Promise<SinavTaslagi | null> {
  const sonuc = await storeIslemi<SinavTaslagi>("readonly", (store) =>
    store.get(sinavAnahtari(sinavId)),
  );
  return sonuc ?? null;
}

export async function sinavIcerigiKaydet(sinavId: string, taslak: SinavTaslagi) {
  await storeIslemi<IDBValidKey>("readwrite", (store) =>
    store.put(taslak, sinavAnahtari(sinavId)),
  );
}

export async function sinavIcerigiSil(sinavId: string) {
  await storeIslemi<undefined>("readwrite", (store) => {
    store.delete(sinavAnahtari(sinavId));
  });
}

// ─── Göç: kütüphane öncesi tek slot ─────────────────────────────────────────

export async function eskiTekSlotuOku(): Promise<SinavTaslagi | null> {
  const sonuc = await storeIslemi<SinavTaslagi>("readonly", (store) =>
    store.get(ESKI_TEK_SLOT_KEY),
  );
  return sonuc ?? null;
}

export async function eskiTekSlotuTemizle() {
  await storeIslemi<undefined>("readwrite", (store) => {
    store.delete(ESKI_TEK_SLOT_KEY);
  });
}

/** Yalnız tam yedek geri yüklemesi için: kütüphane ÖNCESİ bir yedekteki tek
 *  slot içeriğini yerine koyar; açılıştaki göç onu kütüphaneye taşır. */
export async function eskiTekSlotuYaz(taslak: SinavTaslagi) {
  await storeIslemi<IDBValidKey>("readwrite", (store) =>
    store.put(taslak, ESKI_TEK_SLOT_KEY),
  );
}

// ─── Tam yedek katmanı ──────────────────────────────────────────────────────

export type SinavDepoSnapshoti = Record<string, SinavTaslagi>;

/** Anahtar = sinavId (depo ön eki soyulmuş hâlde). */
export async function sinavDeposuSnapshotiAl(): Promise<SinavDepoSnapshoti> {
  const db = await veritabaniAc();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_ADI, "readonly");
    const store = tx.objectStore(STORE_ADI);
    const sonuc: SinavDepoSnapshoti = {};
    const istek = store.openCursor();
    istek.onerror = () => reject(istek.error);
    istek.onsuccess = () => {
      const cursor = istek.result;
      if (cursor) {
        const anahtar = String(cursor.key);
        // Eski tek slot snapshot'a girmez; göç sırasında zaten kütüphaneye taşınır.
        if (anahtar.startsWith(SINAV_ON_EKI)) {
          sonuc[anahtar.slice(SINAV_ON_EKI.length)] = cursor.value as SinavTaslagi;
        }
        cursor.continue();
        return;
      }
      db.close();
      resolve(sonuc);
    };
    tx.onerror = () => {
      db.close();
      reject(tx.error);
    };
  });
}

/** Tam yedek geri yüklemesi: verilen kümeyi yazar, kümede olmayan sınav
 *  içeriklerini SİLMEZ (birleştirme kuralı çağıran tarafta uygulanır). */
export async function sinavDeposunuGeriYukle(snapshot: SinavDepoSnapshoti) {
  const db = await veritabaniAc();
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_ADI, "readwrite");
    const store = tx.objectStore(STORE_ADI);
    for (const [sinavId, taslak] of Object.entries(snapshot)) {
      store.put(taslak, sinavAnahtari(sinavId));
    }
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = () => {
      db.close();
      reject(tx.error);
    };
  });
}
