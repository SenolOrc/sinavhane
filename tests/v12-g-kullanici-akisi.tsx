// v1.2 geometri paneli kullanıcı akışı (G ajanı, jsdom + React): yeni geometri
// nesnelerinin paneli açılır, hazır şablon düğmeleri ve ayarlar geçerli veri yazar.

import { JSDOM } from "jsdom";
import type { GeometriVerisi, Sekil } from "../src/modules/sinav-olusturucu/cizim/tipler";

function dogrula(kosul: unknown, mesaj: string) {
  if (!kosul) throw new Error(`KULLANICI AKIŞI BAŞARISIZ: ${mesaj}`);
}

async function main() {
  const dom = new JSDOM("<!doctype html><html><body><div id='root'></div></body></html>", { url: "http://localhost" });
  const g = globalThis as unknown as Record<string, unknown>;
  for (const [ad, deger] of Object.entries({
    window: dom.window, document: dom.window.document, navigator: dom.window.navigator,
    HTMLElement: dom.window.HTMLElement, HTMLInputElement: dom.window.HTMLInputElement, HTMLCanvasElement: dom.window.HTMLCanvasElement,
    HTMLSelectElement: dom.window.HTMLSelectElement, MouseEvent: dom.window.MouseEvent, Event: dom.window.Event,
    IS_REACT_ACT_ENVIRONMENT: true,
  })) Object.defineProperty(g, ad, { value: deger, configurable: true });
  const sahteCtx = new Proxy({ font: "", lineWidth: 1 } as Record<string, unknown>, {
    get(h, ad: string) {
      if (ad === "measureText") return (m: string) => ({ width: [...m].length * 10 });
      if (ad in h) return h[ad];
      return () => undefined;
    },
    set(h, ad: string, d) { h[ad] = d; return true; },
  });
  Object.defineProperty(dom.window.HTMLCanvasElement.prototype, "getContext", { value: () => sahteCtx });

  const React = await import("react");
  const { act } = React;
  const { createRoot } = await import("react-dom/client");
  const { GeoEkPaneli } = await import("../src/modules/sinav-olusturucu/components/GeometriPaneli");
  const { geometriVerisiGecerliMi } = await import("../src/modules/sinav-olusturucu/cizim/geometriSekilleri");
  const { FIZIK_TANIMLARI } = await import("../src/modules/sinav-olusturucu/cizim/fizik");
  type FizikSekli = Extract<Sekil, { tur: "fizik" }>;

  const root = createRoot(document.getElementById("root")!);
  let sekil: FizikSekli;
  let tarihce = 0;
  const ciz = async () => {
    await act(async () => {
      root.render(React.createElement(GeoEkPaneli, {
        sekil,
        guncelle: (y: Partial<FizikSekli>) => { sekil = { ...sekil, ...y }; },
        tarihceyeKaydet: () => { tarihce += 1; },
      }));
    });
  };
  const yeni = (nesne: FizikSekli["nesne"]): FizikSekli => ({ id: "s", tur: "fizik", nesne, kalinlik: 2, x: 0, y: 0, w: FIZIK_TANIMLARI[nesne].w, h: FIZIK_TANIMLARI[nesne].h });
  const etiketle = async (etiket: string) => {
    const b = document.querySelector(`button[aria-label="${etiket}"]`) as HTMLButtonElement | null;
    const ic = b ?? ([...document.querySelectorAll("button span[aria-label]")].find((s) => s.getAttribute("aria-label") === etiket)?.closest("button") as HTMLButtonElement | null);
    dogrula(ic, `“${etiket}” bulunamadı`);
    await act(async () => { ic!.click(); });
    await ciz();
  };
  const geo = () => sekil.geo as GeometriVerisi;

  // Doğruda açılar: Z kuralı şablonu, sonra düzen M
  sekil = yeni("dogrudaAcilar"); await ciz();
  dogrula(document.querySelector("[data-testid='geo-dogru-aci']"), "doğruda açılar paneli");
  await etiketle("Hazır kural: Z kuralı (iç ters)");
  dogrula(geo().tur === "dogruAci" && (geo() as { duzen: string }).duzen === "z" && geometriVerisiGecerliMi(geo()), "Z şablonu yazıldı");
  await etiketle("Düzen: M kuralı");
  dogrula((geo() as { duzen: string }).duzen === "m", "düzen M");
  dogrula(document.querySelector("input[aria-label=\"B'deki açı ° (10–80)\"]"), "M'de B açısı sayı kutusu");

  // Dörtgen: deltoid şablonu → köşegen dik
  sekil = yeni("dortgenGeo"); await ciz();
  await etiketle("Hazır dörtgen: Deltoid");
  dogrula(geo().tur === "dortgen" && (geo() as { tip: string; kosegen: boolean }).tip === "deltoid" && (geo() as { kosegen: boolean }).kosegen, "deltoid + köşegen");
  dogrula(document.querySelector("details"), "seyrek ayarlar katlanır bölümde");

  // Katı cisim: küp köşegeni
  sekil = yeni("katiCisim"); await ciz();
  await etiketle("Hazır cisim: Küp köşegeni");
  dogrula((geo() as { kosegen: string }).kosegen === "cisim", "küp cisim köşegeni");
  await etiketle("Cisim: Koni");
  dogrula((geo() as { cisim: string }).cisim === "koni" && geometriVerisiGecerliMi(geo()), "koni seçildi");

  // Kağıt katlama: dik üçgen şablonu, ikinci katlama ekle, seçim kutusu
  sekil = yeni("kagitKatlama"); await ciz();
  await etiketle("Hazır katlama: Karede iki köşe merkeze");
  dogrula((geo() as { katlar: unknown[] }).katlar.length === 2, "iki katlama");
  dogrula(!/İkinci katlama/.test(document.body.textContent ?? ""), "en çok iki katlama: ekle düğmesi gizli");
  await etiketle("Hazır katlama: Dikdörtgen köşegenden katlama");
  const ekle = [...document.querySelectorAll("button")].find((b) => b.textContent?.includes("İkinci katlama"))!;
  await act(async () => { ekle.click(); }); await ciz();
  dogrula((geo() as { katlar: unknown[] }).katlar.length === 2 && geometriVerisiGecerliMi(geo()), "ikinci katlama eklendi");
  const sec = document.querySelector("select[aria-label='Katlanan köşe']") as HTMLSelectElement;
  dogrula(sec && sec.options.length >= 2, "katlanan köşe seçim kutusu");

  // Üçgen: ağırlık merkezi şablonu ve iç teğet anahtarı
  sekil = yeni("ucgenABC"); await ciz();
  await etiketle("Hazır üçgen: Ağırlık merkezi");
  dogrula((geo() as { kenarortay?: string }).kenarortay === "hepsi", "kenarortay hepsi");
  const icTeget = [...document.querySelectorAll("button")].find((b) => b.textContent === "İç teğet çember")!;
  await act(async () => { icTeget.click(); }); await ciz();
  dogrula((geo() as { icTegetCember?: boolean }).icTegetCember === true, "iç teğet açıldı");

  // Çember: iki teğet şablonu
  sekil = yeni("cemberGeo"); await ciz();
  await etiketle("Hazır çember: İki teğet");
  dogrula((geo() as { disAci?: string }).disAci === "teget", "iki teğet");
  dogrula(tarihce > 5, "geri al geçmişi kaydedildi");

  await act(async () => root.unmount());
  console.log("✓ v1.2 geometri paneli kullanıcı akışı");
}

main().catch((e) => { console.error(e); process.exit(1); });
