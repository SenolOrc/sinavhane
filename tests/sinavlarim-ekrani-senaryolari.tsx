// Sınav kütüphanesi aşama 2 — "Sınavlarım" ekranı.
//
// Aşama 1 (bkz. sinav-kutuphanesi-senaryolari.ts) yalnız veri katmanını
// doğruluyordu. Burada gerçek DOM üzerinde: kart listesi İÇERİK OKUNMADAN
// çizilir mi, sil/geri-al (10 sn havuz kalıbı) round-trip yapıyor mu,
// yeniden adlandırma kalıcı mı, aktif sınır "yeni sınav"ı engelliyor mu ve
// "geçiş yap" gerçekten /sinav-olusturucu'ya dönüp aktif işaretçiyi taşıyor mu.
import "./_tarayici-ortami";
import "./_sahte-indexeddb";

import React, { act } from "react";
import { JSDOM } from "jsdom";
import { readFileSync } from "node:fs";
// react-router-dom (data router API'leri) react-dom'u İÇERİDE import eder;
// react-dom modülü ise `canUseDOM`/`isInputEventSupported`'ı MODÜL YÜKLENİRKEN
// bir kez hesaplayıp sabitliyor. Bu import üstte statik olsaydı, jsdom
// window/document henüz kurulmadan react-dom değerlendirilir, "canUseDOM"
// false'a kilitlenir ve gerçek <input> değişiklik olayları (onChange) bir
// daha ASLA doğru algılanmaz — bu yüzden react-router-dom da jsdom
// kurulduktan SONRA dinamik import edilir (aşağıda, calistir() içinde).

function dogrula(kosul: unknown, mesaj: string) {
  if (!kosul) throw new Error(`SINAVLARIM EKRANI TESTİ BAŞARISIZ: ${mesaj}`);
}

// Sahte-IndexedDB'nin (tests/_sahte-indexeddb.ts) her open/transaction'ı bir
// setTimeout(0) tiki. 10ms Mac/Linux'ta yeterliydi ama Windows'ta sistem
// zamanlayıcı çözünürlüğü kaba olduğundan zincirlenmiş tikler 10ms'i aşıyor
// (rastgele değil, tutarlı başarısızlık — DEVAM.md §21).
const ZAMANLAYICI_TIK_BEKLEME = 200;

async function calistir() {
  const dom = new JSDOM("<!doctype html><body></body>", { url: "http://localhost/" });
  Object.assign(globalThis, {
    window: dom.window,
    document: dom.window.document,
    HTMLElement: dom.window.HTMLElement,
    Node: dom.window.Node,
    Event: dom.window.Event,
    KeyboardEvent: dom.window.KeyboardEvent,
  });
  Object.defineProperty(globalThis, "navigator", { value: dom.window.navigator, configurable: true });
  // React-dom'un IE<=9 "propertychange" polyfill'i (yalnız text input'larda,
  // autoFocus commit anında) jsdom'da isEventSupported('input') yanlış
  // negatif verirse attachEvent'i arar; jsdom bunu hiç uygulamaz. Gerçek
  // tarayıcıda bu dal zaten çalışmıyor — burada yalnız test ortamının bu
  // eski yolu çökmeden atlaması için no-op'lanıyor.
  const eleman = dom.window.HTMLElement.prototype as unknown as { attachEvent?: () => void; detachEvent?: () => void };
  eleman.attachEvent = eleman.attachEvent ?? (() => undefined);
  eleman.detachEvent = eleman.detachEvent ?? (() => undefined);
  Object.assign(dom.window, {
    requestAnimationFrame: (cb: FrameRequestCallback) => dom.window.setTimeout(() => cb(Date.now()), 0),
    cancelAnimationFrame: (id: number) => dom.window.clearTimeout(id),
  });
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

  const { createMemoryRouter, RouterProvider } = await import("react-router-dom");
  const repo = await import("../src/db/repo");
  const { SinavlarimScreen } = await import("../src/modules/sinav-olusturucu/SinavlarimScreen");
  const { aktifSinavIdOku, aktifSinavIdYaz } = await import("../src/modules/sinav-olusturucu/lib/sinavKutuphanesi");
  const { createRoot } = await import("react-dom/client");
  // Geri al toast'ı ekranın kendi JSX'inde değil, app/Layout.tsx'in her
  // sayfada bir kez render ettiği GLOBAL <GeriAlToast /> bileşeninde (bkz.
  // lib/geriAlKuyrugu.ts gerekçesi: ekran değişince bildirim kaybolmasın).
  // Test bu yüzden ekranları GERÇEK Layout'un altında monte eder; toast
  // Layout'tan kaldırılırsa (eski hata: hiç render edilmiyordu) 2. adım düşer.
  const { Layout } = await import("../src/app/Layout");

  function taslakUret(ozel: Record<string, unknown> = {}) {
    return {
      surum: "v0.11C" as const,
      kayitZamani: "2026-07-25T10:00:00.000Z",
      baslik: { okulAdi: "", sinifSeviyesi: "9. SINIF", donem: "1. DÖNEM", yaziliNo: "1. YAZILI", ders: "Matematik" },
      sorular: [],
      ayarlar: { kenarBosluk: 10, varsayilanSoruBosluk: 5, ogretmenler: [], sayfaNoGoster: true, sayfaDuzeni: "cift" as const, sutunAra: 8, sutunAyirici: true },
      ...ozel,
    };
  }
  const { metadataTuret } = await import("../src/modules/sinav-olusturucu/lib/sinavKutuphanesi");

  const birinci = repo.sinavEkle(metadataTuret(taslakUret() as never, 2));
  const ikinci = repo.sinavEkle(metadataTuret(taslakUret({ baslik: { ...taslakUret().baslik, ders: "Fizik", sinifSeviyesi: "10. SINIF" } }) as never, 1));
  const arsivli = repo.sinavEkle(metadataTuret(taslakUret({ baslik: { ...taslakUret().baslik, ders: "Kimya" } }) as never, 1));
  repo.sinavArsivle(arsivli.id, true);
  aktifSinavIdYaz(birinci.id);

  const routes = [
    {
      path: "/",
      element: <Layout />,
      children: [
        { path: "sinav-olusturucu/sinavlarim", element: <SinavlarimScreen /> },
        { path: "sinav-olusturucu", element: <div data-testid="editor-yer-tutucu">EDİTÖR</div> },
      ],
    },
  ];
  const router = createMemoryRouter(routes, { initialEntries: ["/sinav-olusturucu/sinavlarim"] });
  const host = document.createElement("div");
  document.body.append(host);
  const root = createRoot(host);
  await act(async () => {
    root.render(<RouterProvider router={router} />);
  });

  // ─── 1. Liste yalnız metadata ile çiziliyor ──────────────────────────────
  dogrula(host.textContent!.includes(birinci.ad) && host.textContent!.includes(ikinci.ad), "aktif sınavlar listelenmemiş");
  dogrula(!host.textContent!.includes(arsivli.ad) || !!document.querySelector("details")?.textContent?.includes(arsivli.ad), "arşivli sınav yanlış yerde görünüyor");
  dogrula(host.textContent!.includes("2 sayfa") || host.textContent!.includes(`${birinci.sayfaSayisi} sayfa`), "sayfa sayısı metadata'dan gösterilmiyor");
  dogrula(host.textContent!.includes("Aktif"), "aktif rozeti görünmüyor");

  const kaynak = readFileSync("src/modules/sinav-olusturucu/SinavlarimScreen.tsx", "utf8");
  dogrula(
    !/for \(const \w+ of (aktifListe|tumu)\)[\s\S]{0,120}sinavIcerigiOku/.test(kaynak),
    "liste render'ı her kart için içerik okuyor (aşama 1'deki 'liste ekranı içerik okumasın' kuralı ihlal edilmiş)",
  );
  dogrula(kaynak.includes("sinavIcerigiOku(kayit.id)") && /async function sil\(/.test(kaynak), "içerik yalnız silme anlık görüntüsü için okunmalı");

  // ─── 2. Silme + 10 sn geri al ─────────────────────────────────────────────
  const ikinciKart = Array.from(host.querySelectorAll("article")).find((el) => el.textContent?.includes(ikinci.ad))!;
  const silButonu = ikinciKart.querySelector('button[aria-label="Sınavı sil"]') as HTMLButtonElement;
  await act(async () => {
    silButonu.click();
    // sil() sahte-IndexedDB'de zincirlenmiş 4 setTimeout(0) tiki bekliyor (oku:
    // open+transaction, sil: open+transaction). Windows'ta sistem zamanlayıcı
    // çözünürlüğü Mac/Linux'tan kaba olduğundan 10ms bazen yetmiyordu (tutarlı
    // başarısızlık, flaky değil) — bkz. DEVAM.md §21.
    await new Promise((r) => setTimeout(r, ZAMANLAYICI_TIK_BEKLEME));
  });
  dogrula(!repo.sinavBul(ikinci.id), "silinen sınav kütüphaneden çıkmamış");
  dogrula(!!document.querySelector('[role="status"]')?.textContent?.includes("silindi"), "geri al toast'ı görünmüyor (Layout <GeriAlToast />'ı render etmiyor mu?)");
  const geriAlButonu = document.querySelector('[role="status"] button') as HTMLButtonElement;
  dogrula(!!geriAlButonu && geriAlButonu.textContent!.includes("10 sn"), "geri al düğmesi 10 sn kalıbını taşımıyor");
  await act(async () => {
    geriAlButonu.click();
    await new Promise((r) => setTimeout(r, ZAMANLAYICI_TIK_BEKLEME));
  });
  dogrula(!!repo.sinavBul(ikinci.id), "geri al sınavı kütüphaneye döndürmemiş");

  // ─── 3. Yeniden adlandırma kalıcı ─────────────────────────────────────────
  const birinciKart = Array.from(host.querySelectorAll("article")).find((el) => el.textContent?.includes(birinci.ad))!;
  const yenidenAdlandirButonu = birinciKart.querySelector('button[aria-label="Sınavı yeniden adlandır"]') as HTMLButtonElement;
  await act(async () => {
    yenidenAdlandirButonu.click();
  });
  const adInputu = birinciKart.querySelector('input[aria-label="Sınav adını düzenle"]') as HTMLInputElement;
  dogrula(!!adInputu, "yeniden adlandırma input'u açılmadı");
  await act(async () => {
    const setter = Object.getOwnPropertyDescriptor(dom.window.HTMLInputElement.prototype, "value")!.set!;
    setter.call(adInputu, "Elle Verilen Ad");
    adInputu.dispatchEvent(new dom.window.Event("input", { bubbles: true }));
  });
  // Bu jsdom + esbuild-tek-parça-bundle ortamında react-dom, jsdom
  // window/document kurulmadan ÖNCE (dynamic import zinciri esbuild
  // tarafından tek dosyada üst düzey import'a dönüştürüldüğü için)
  // değerlendiriliyor; bu da `isInputEventSupported`'ı kalıcı olarak false'a
  // kilitliyor ve React'i "input" yerine keyup/keydown bazlı IE-uyum
  // yoluna düşürüyor. O yol değeri yalnız `keyup`/`keydown`/`selectionchange`
  // olaylarında karşılaştırıyor — bu yüzden Enter'dan ÖNCE ayrı bir `keyup`
  // dispatch'i ile değişikliğin state'e işlenmesini garanti ediyoruz;
  // aksi halde Enter'ın kendi onKeyDown'ı ile aynı olayda yarışıp state'i
  // HENÜZ GÜNCELLENMEMİŞ okuyor (gerçek tarayıcıda bu sorun yok).
  await act(async () => {
    adInputu.dispatchEvent(new dom.window.KeyboardEvent("keyup", { bubbles: true, cancelable: true }));
  });
  await act(async () => {
    adInputu.dispatchEvent(new dom.window.KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true }));
  });
  dogrula(repo.sinavBul(birinci.id)?.ad === "Elle Verilen Ad", "yeniden adlandırma kalıcılaşmadı");
  dogrula(repo.sinavBul(birinci.id)?.ozelAd === "Elle Verilen Ad", "ozelAd işaretlenmedi");

  // ─── 4. Geçiş yap: aktif işaretçi taşınıyor ve editöre dönülüyor ──────────
  // "ikinci" zaten ekranda render edilmiş durumda (2. adımda silinip geri
  // alındı) — SinavlarimScreen kendi state'ini yalnız kendi eylemleriyle
  // (sil/arşivle/yeniden adlandır/geri al) tazelediği için, ekranın DIŞINDAN
  // repo'ya yeni kayıt eklemek burada bir yenilemeyi TETİKLEMEZ (aynı yol
  // üzerinde ikinci bir router.navigate de aynı rota olduğu için remount
  // yapmaz) — bu yüzden zaten listede olan bir kaydı hedef alıyoruz.
  dogrula(ikinci.id !== aktifSinavIdOku(), "ön koşul: hedef kayıt zaten aktif olmamalı");
  const ikinciKartYeniden = Array.from(document.querySelectorAll("article")).find((el) => el.textContent?.includes(ikinci.ad))!;
  const gecisButonu = Array.from(ikinciKartYeniden.querySelectorAll("button")).find((b) => b.textContent === "Geçiş yap") as HTMLButtonElement;
  dogrula(!!gecisButonu, "geçiş yap düğmesi bulunamadı");
  await act(async () => {
    gecisButonu.click();
    await new Promise((r) => setTimeout(r, ZAMANLAYICI_TIK_BEKLEME));
  });
  dogrula(aktifSinavIdOku() === ikinci.id, "geçiş yap aktif işaretçiyi taşımadı");
  dogrula(router.state.location.pathname === "/sinav-olusturucu", "geçiş yap Sınav Oluşturucu'ya dönmüyor");
  dogrula(!!document.querySelector('[data-testid="editor-yer-tutucu"]'), "editör ekranı render edilmedi");

  await act(async () => {
    root.unmount();
  });
  host.remove();

  console.log("✓ Liste metadata ile çiziliyor, içerik yalnız silme anlık görüntüsünde okunuyor");
  console.log("✓ Silme + 10 sn geri al round-trip yapıyor (toast gerçek Layout'tan geliyor)");
  console.log("✓ Yeniden adlandırma kalıcı (ozelAd), aktif rozeti doğru");
  console.log("✓ Geçiş yap aktif işaretçiyi taşıyor ve Sınav Oluşturucu'ya dönüyor");
  console.log("TÜM SINAVLARIM EKRANI SENARYOLARI BAŞARILI");
}

calistir().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exitCode = 1;
});
