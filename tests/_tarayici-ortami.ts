// Node altında çalışan testler için asgari tarayıcı depolama stub'ı.
//
// `db/repo.ts` modül gövdesinde `let db = localYukle()` çalıştırıyor; dolayısıyla
// repo'yu (doğrudan ya da dolaylı olarak) import eden HER
// test, import değerlendirilirken localStorage'a ihtiyaç duyar. ES import'ları
// hoist edildiği için stub aynı dosyanın gövdesine yazılamaz — bu modül, ilgili
// testin İLK import'u olarak yan etkisiyle kurulmalıdır:
//
//     import "./_tarayici-ortami";
//     import * as repo from "../src/db/repo";
//
// Kalıcılık gerektiren testler kendi zengin sahtelerini kurmaya devam edebilir
// (bkz. tam-yedek-senaryolari.ts); burası yalnızca "import patlamasın" içindir.

class BellekDeposu implements Storage {
  private veri = new Map<string, string>();

  get length() {
    return this.veri.size;
  }

  clear() {
    this.veri.clear();
  }

  getItem(anahtar: string) {
    return this.veri.has(anahtar) ? this.veri.get(anahtar)! : null;
  }

  key(index: number) {
    return Array.from(this.veri.keys())[index] ?? null;
  }

  removeItem(anahtar: string) {
    this.veri.delete(anahtar);
  }

  setItem(anahtar: string, deger: string) {
    this.veri.set(anahtar, String(deger));
  }
}

for (const ad of ["localStorage", "sessionStorage"] as const) {
  if (!(ad in globalThis)) {
    Object.defineProperty(globalThis, ad, {
      value: new BellekDeposu(),
      configurable: true,
      writable: true,
    });
  }
}

export {};
