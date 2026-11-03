// Node altında IndexedDB kullanan depoları (taslakDepo.ts gibi — açık anahtarla
// get/put/delete/openCursor) test edebilmek için minimal sahte.
//
// sinav-aktarim-zarfi-senaryolari.ts'teki sahte transaction ile AYNI kalıp
// (istekler bir kuyruğa yazılır, transaction "çalışınca" sırayla işlenir, hepsi
// bitince oncomplete tetiklenir) — burada TEK farkı, o dosyadaki mağaza örtük
// anahtarlıyken (deger.transferId) burası taslakDepo.ts'in kullandığı AÇIK
// anahtarı (`store.put(deger, anahtar)`) ve `openCursor`'ı da destekler.
//
// `_tarayici-ortami.ts` ile aynı yan-etki-ile-kurulum kalıbını izler:
//     import "./_tarayici-ortami";
//     import "./_sahte-indexeddb";

class SahteIstek<T> {
  result!: T;
  error: DOMException | null = null;
  onsuccess: ((event: Event) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
}

type SahteCursor = { key: string; value: unknown; continue: () => void };

const magazalar = new Map<string, Map<string, unknown>>();

function magazayiGetir(ad: string): Map<string, unknown> {
  let m = magazalar.get(ad);
  if (!m) {
    m = new Map();
    magazalar.set(ad, m);
  }
  return m;
}

class SahteTransaction {
  oncomplete: ((event: Event) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  private islemler: Array<() => void> = [];

  constructor() {
    setTimeout(() => {
      for (const islem of this.islemler) islem();
      this.oncomplete?.({} as Event);
    }, 0);
  }

  objectStore(ad: string) {
    const veri = magazayiGetir(ad);
    return {
      get: (anahtar: IDBValidKey) => {
        const istek = new SahteIstek<unknown>();
        this.islemler.push(() => {
          const deger = veri.get(String(anahtar));
          istek.result = deger === undefined ? undefined : structuredClone(deger);
          istek.onsuccess?.({} as Event);
        });
        return istek;
      },
      put: (deger: unknown, anahtar: IDBValidKey) => {
        const istek = new SahteIstek<IDBValidKey>();
        this.islemler.push(() => {
          veri.set(String(anahtar), structuredClone(deger));
          istek.result = anahtar;
          istek.onsuccess?.({} as Event);
        });
        return istek;
      },
      delete: (anahtar: IDBValidKey) => {
        const istek = new SahteIstek<undefined>();
        this.islemler.push(() => {
          veri.delete(String(anahtar));
          istek.onsuccess?.({} as Event);
        });
        return istek;
      },
      // foyDepo.foyDeposunuGeriYukle "önce temizle, sonra yaz" yapıyor; clear
      // olmadan yıl geçişi/geri yükleme yolları test edilemiyordu.
      clear: () => {
        const istek = new SahteIstek<undefined>();
        this.islemler.push(() => {
          veri.clear();
          istek.onsuccess?.({} as Event);
        });
        return istek;
      },
      openCursor: () => {
        const istek = new SahteIstek<SahteCursor | null>();
        this.islemler.push(() => {
          const girdiler = [...veri.entries()];
          let index = 0;
          const adimla = () => {
            if (index >= girdiler.length) {
              istek.result = null;
              istek.onsuccess?.({} as Event);
              return;
            }
            const [anahtar, deger] = girdiler[index++];
            istek.result = { key: anahtar, value: structuredClone(deger), continue: adimla };
            istek.onsuccess?.({} as Event);
          };
          adimla();
        });
        return istek;
      },
    };
  }
}

const sahteDb = {
  objectStoreNames: { contains: () => true },
  createObjectStore: () => undefined,
  transaction: () => new SahteTransaction(),
  close: () => undefined,
};

Object.defineProperty(globalThis, "indexedDB", {
  configurable: true,
  value: {
    open: () => {
      const istek = new SahteIstek<typeof sahteDb>();
      setTimeout(() => {
        istek.result = sahteDb;
        istek.onsuccess?.({} as Event);
      }, 0);
      return istek;
    },
  } as unknown as IDBFactory,
});

export {};
