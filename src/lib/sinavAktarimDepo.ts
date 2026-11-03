import type {
  DersKitabiAktarimHatasi,
  DersKitabiGorselAktarimi,
  SinavAktarimKaynagi,
} from "@shared/types";

const DB_ADI = "ogretmen-asistani-sinav-aktarim";
const STORE_ADI = "zarflar";
export const SINAV_AKTARIM_SOZLESME_SURUMU = 1;
export const SINAV_AKTARIM_BEKLEYEN_TTL_MS = 24 * 60 * 60 * 1_000;
export const SINAV_AKTARIM_ACK_TTL_MS = 60 * 60 * 1_000;

export interface SinavAktarimPayload {
  iceAktarilacakGorseller: DersKitabiGorselAktarimi[];
  gonderilemeyenSayisi?: number;
  gonderilemeyenler?: DersKitabiAktarimHatasi[];
  /** Kullanım geçmişi yalnız hedef payload'ı kabul (ack) ettikten sonra yazılır. */
  kullanilanKirpmaIdler: string[];
}

export interface SinavAktarimZarfi {
  transferId: string;
  version: number;
  source: SinavAktarimKaynagi;
  olusturma: string;
  durum: "pending" | "ack" | "discarded";
  payload?: SinavAktarimPayload;
  ackZamani?: string;
  discardZamani?: string;
  kullanimMakbuzu?: SinavAktarimKullanimMakbuzu;
}

export interface SinavAktarimKullanimMakbuzu {
  kullanilanKirpmaIdler: string[];
  hedefId: string;
  hedefAd: string;
  eylem: "eklendi";
  kullanimKaydedildi: boolean;
}

export interface SinavAktarimBitirmeSonucu {
  zarf: SinavAktarimZarfi | null;
  /** Aynı zarfı yalnız ilk bitiren çağrı true alır. */
  yeniDurum: boolean;
}

export type SinavAktarimDepoSnapshoti = SinavAktarimZarfi[];

export function sinavAktarimZarfiHazirla(
  payload: SinavAktarimPayload,
  source: SinavAktarimKaynagi,
  secenek: { transferId?: string; simdi?: Date } = {},
): SinavAktarimZarfi {
  return {
    transferId: secenek.transferId ?? crypto.randomUUID(),
    version: SINAV_AKTARIM_SOZLESME_SURUMU,
    source,
    olusturma: (secenek.simdi ?? new Date()).toISOString(),
    durum: "pending",
    payload,
  };
}

export function sinavAktarimZarfiniAckle(zarf: SinavAktarimZarfi, simdi = new Date()): SinavAktarimZarfi {
  if (zarf.durum === "ack" && !zarf.payload) return zarf;
  return { ...zarf, durum: "ack", payload: undefined, ackZamani: simdi.toISOString() };
}

export function sinavAktarimZarfiniIptalEt(zarf: SinavAktarimZarfi, simdi = new Date()): SinavAktarimZarfi {
  if (zarf.durum === "discarded" && !zarf.payload) return zarf;
  return { ...zarf, durum: "discarded", payload: undefined, discardZamani: simdi.toISOString() };
}

export function sinavAktarimZarfiSuresiDoldu(
  zarf: SinavAktarimZarfi,
  simdiMs = Date.now(),
  bekleyenTtlMs = SINAV_AKTARIM_BEKLEYEN_TTL_MS,
  ackTtlMs = SINAV_AKTARIM_ACK_TTL_MS,
): boolean {
  if (zarf.durum === "ack" && zarf.kullanimMakbuzu && !zarf.kullanimMakbuzu.kullanimKaydedildi) return false;
  const tamamlanmaZamani = zarf.durum === "ack" ? zarf.ackZamani : zarf.durum === "discarded" ? zarf.discardZamani : undefined;
  const referans = tamamlanmaZamani ?? zarf.olusturma;
  const zaman = Date.parse(referans);
  if (!Number.isFinite(zaman)) return true;
  return simdiMs - zaman >= (zarf.durum === "pending" ? bekleyenTtlMs : ackTtlMs);
}

function veritabaniAc(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const istek = indexedDB.open(DB_ADI, 1);
    istek.onerror = () => reject(istek.error);
    istek.onupgradeneeded = () => {
      const db = istek.result;
      if (!db.objectStoreNames.contains(STORE_ADI)) db.createObjectStore(STORE_ADI, { keyPath: "transferId" });
    };
    istek.onsuccess = () => resolve(istek.result);
  });
}

async function storeIslemi<T>(
  mode: IDBTransactionMode,
  calistir: (store: IDBObjectStore, tx: IDBTransaction) => IDBRequest<T> | void,
  signal?: AbortSignal,
): Promise<T | undefined> {
  if (signal?.aborted) throw new DOMException("Aktarım iptal edildi.", "AbortError");
  const db = await veritabaniAc();
  if (signal?.aborted) {
    db.close();
    throw new DOMException("Aktarım iptal edildi.", "AbortError");
  }
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_ADI, mode);
    const store = tx.objectStore(STORE_ADI);
    let sonuc: T | undefined;
    const iptal = () => {
      try { tx.abort(); } catch { /* işlem zaten tamamlanmış olabilir */ }
    };
    signal?.addEventListener("abort", iptal, { once: true });
    const temizle = () => {
      signal?.removeEventListener("abort", iptal);
      db.close();
    };
    try {
      const istek = calistir(store, tx);
      if (istek) {
        istek.onsuccess = () => { sonuc = istek.result; };
        istek.onerror = () => reject(istek.error);
      }
    } catch (err) {
      temizle();
      reject(err);
      return;
    }
    tx.oncomplete = () => { temizle(); resolve(sonuc); };
    tx.onerror = () => { temizle(); reject(tx.error); };
    tx.onabort = () => {
      temizle();
      reject(signal?.aborted ? new DOMException("Aktarım iptal edildi.", "AbortError") : tx.error ?? new Error("Aktarım deposu işlemi iptal edildi."));
    };
  });
}

export async function sinavAktarimKaydet(
  payload: SinavAktarimPayload,
  source: SinavAktarimKaynagi,
  secenek: { signal?: AbortSignal; transferId?: string; simdi?: Date } = {},
): Promise<SinavAktarimZarfi> {
  const zarf = sinavAktarimZarfiHazirla(payload, source, secenek);
  await storeIslemi("readwrite", (store) => store.put(zarf), secenek.signal);
  return zarf;
}

export async function sinavAktarimOku(transferId: string): Promise<SinavAktarimZarfi | null> {
  const sonuc = await storeIslemi<SinavAktarimZarfi>("readonly", (store) => store.get(transferId));
  return sonuc ?? null;
}

export async function bekleyenSinavAktarimlariniListele(): Promise<SinavAktarimZarfi[]> {
  const sonuc = await storeIslemi<SinavAktarimZarfi[]>("readonly", (store) => store.getAll());
  return (sonuc ?? []).filter((zarf) => zarf.durum === "pending" && !!zarf.payload).sort((a, b) => a.olusturma.localeCompare(b.olusturma));
}

export async function tamamlanmamisSinavAktarimKullanimlariniListele(): Promise<SinavAktarimZarfi[]> {
  const sonuc = await storeIslemi<SinavAktarimZarfi[]>("readonly", (store) => store.getAll());
  return (sonuc ?? []).filter((zarf) =>
    zarf.durum === "ack" && !!zarf.kullanimMakbuzu && !zarf.kullanimMakbuzu.kullanimKaydedildi,
  );
}

export async function sinavAktarimDeposuSnapshotiAl(): Promise<SinavAktarimDepoSnapshoti> {
  const sonuc = await storeIslemi<SinavAktarimZarfi[]>("readonly", (store) => store.getAll());
  return structuredClone(sonuc ?? []);
}

/** Tam yedek/rollback için store'un tamamını tek transaction içinde değiştirir. */
export async function sinavAktarimDeposunuGeriYukle(snapshot: SinavAktarimDepoSnapshoti): Promise<void> {
  const db = await veritabaniAc();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_ADI, "readwrite");
    const store = tx.objectStore(STORE_ADI);
    store.clear();
    for (const zarf of snapshot) store.put(structuredClone(zarf));
    tx.oncomplete = () => { db.close(); resolve(); };
    tx.onerror = () => { db.close(); reject(tx.error); };
    tx.onabort = () => { db.close(); reject(tx.error ?? new Error("Aktarım deposu geri yüklenemedi.")); };
  });
}

async function sinavAktarimDurumunuBitir(
  transferId: string,
  hedef: "ack" | "discarded",
  simdi: Date,
  kullanimMakbuzu?: Omit<SinavAktarimKullanimMakbuzu, "kullanimKaydedildi">,
): Promise<SinavAktarimBitirmeSonucu> {
  const db = await veritabaniAc();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_ADI, "readwrite");
    const store = tx.objectStore(STORE_ADI);
    let sonuc: SinavAktarimBitirmeSonucu = { zarf: null, yeniDurum: false };
    const istek = store.get(transferId) as IDBRequest<SinavAktarimZarfi | undefined>;
    istek.onerror = () => reject(istek.error);
    istek.onsuccess = () => {
      const mevcut = istek.result;
      if (!mevcut) return;
      if (mevcut.durum !== "pending" || !mevcut.payload) {
        sonuc = { zarf: mevcut, yeniDurum: false };
        return;
      }
      const tamamlanan = hedef === "ack"
        ? {
            ...sinavAktarimZarfiniAckle(mevcut, simdi),
            kullanimMakbuzu: kullanimMakbuzu
              ? { ...kullanimMakbuzu, kullanilanKirpmaIdler: [...new Set(kullanimMakbuzu.kullanilanKirpmaIdler)], kullanimKaydedildi: false }
              : undefined,
          }
        : sinavAktarimZarfiniIptalEt(mevcut, simdi);
      sonuc = { zarf: tamamlanan, yeniDurum: true };
      store.put(tamamlanan);
    };
    tx.oncomplete = () => { db.close(); resolve(sonuc); };
    tx.onerror = () => { db.close(); reject(tx.error); };
    tx.onabort = () => { db.close(); reject(tx.error ?? new Error("Aktarım durumu güncellenemedi.")); };
  });
}

/** Tek readwrite transaction içinde compare-and-set yapar; eşzamanlı alıcılardan
 * yalnız biri `yeniAck: true` alır. */
export async function sinavAktarimAck(
  transferId: string,
  kullanimMakbuzu?: Omit<SinavAktarimKullanimMakbuzu, "kullanimKaydedildi">,
  simdi = new Date(),
): Promise<SinavAktarimBitirmeSonucu & { yeniAck: boolean }> {
  const sonuc = await sinavAktarimDurumunuBitir(transferId, "ack", simdi, kullanimMakbuzu);
  return { ...sonuc, yeniAck: sonuc.yeniDurum };
}

/** Kullanıcının bekleyen aktarımı açıkça çöpe atması için payload'ı temizler. */
export async function sinavAktarimDiscard(transferId: string, simdi = new Date()): Promise<SinavAktarimBitirmeSonucu & { yeniDiscard: boolean }> {
  const sonuc = await sinavAktarimDurumunuBitir(transferId, "discarded", simdi);
  return { ...sonuc, yeniDiscard: sonuc.yeniDurum };
}

/** Kullanım olayı idempotent yazıldıktan sonra küçük makbuzu tamamlandı işaretler. */
export async function sinavAktarimKullaniminiTamamla(transferId: string): Promise<boolean> {
  const db = await veritabaniAc();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_ADI, "readwrite");
    const store = tx.objectStore(STORE_ADI);
    let tamamlandi = false;
    const istek = store.get(transferId) as IDBRequest<SinavAktarimZarfi | undefined>;
    istek.onerror = () => reject(istek.error);
    istek.onsuccess = () => {
      const zarf = istek.result;
      if (!zarf?.kullanimMakbuzu || zarf.kullanimMakbuzu.kullanimKaydedildi) {
        tamamlandi = !!zarf?.kullanimMakbuzu?.kullanimKaydedildi;
        return;
      }
      store.put({
        ...zarf,
        kullanimMakbuzu: { ...zarf.kullanimMakbuzu, kullanimKaydedildi: true },
      });
      tamamlandi = true;
    };
    tx.oncomplete = () => { db.close(); resolve(tamamlandi); };
    tx.onerror = () => { db.close(); reject(tx.error); };
    tx.onabort = () => { db.close(); reject(tx.error ?? new Error("Aktarım kullanım makbuzu güncellenemedi.")); };
  });
}

export async function sinavAktarimTtlTemizle(simdiMs = Date.now()): Promise<number> {
  const db = await veritabaniAc();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_ADI, "readwrite");
    const store = tx.objectStore(STORE_ADI);
    let silinen = 0;
    const istek = store.openCursor();
    istek.onerror = () => reject(istek.error);
    istek.onsuccess = () => {
      const cursor = istek.result;
      if (!cursor) return;
      if (sinavAktarimZarfiSuresiDoldu(cursor.value as SinavAktarimZarfi, simdiMs)) {
        cursor.delete();
        silinen += 1;
      }
      cursor.continue();
    };
    tx.oncomplete = () => { db.close(); resolve(silinen); };
    tx.onerror = () => { db.close(); reject(tx.error); };
    tx.onabort = () => { db.close(); reject(tx.error ?? new Error("Aktarım TTL temizliği iptal edildi.")); };
  });
}
