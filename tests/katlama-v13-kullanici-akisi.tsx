// v1.3: serbest geometrik katlama — JSDOM kullanıcı akışı: «Katla» düğmesi, tuvalde çizgi çekme,
// D/E uçları ve A′ sürükleme. (Kurulum yardımcıları v12-U testinden.)

import { JSDOM } from "jsdom";

function dogrula(kosul: unknown, mesaj: string) {
  if (!kosul) throw new Error(`Katlama-UI BAŞARISIZ: ${mesaj}`);
}

async function main() {
  const dom = new JSDOM("<!doctype html><html><body><div id='root'></div></body></html>", { url: "http://localhost" });
  const g = globalThis as unknown as Record<string, unknown>;
  for (const [ad, deger] of Object.entries({
    window: dom.window, document: dom.window.document, navigator: dom.window.navigator,
    HTMLElement: dom.window.HTMLElement, HTMLInputElement: dom.window.HTMLInputElement, HTMLCanvasElement: dom.window.HTMLCanvasElement,
    MouseEvent: dom.window.MouseEvent, KeyboardEvent: dom.window.KeyboardEvent, Event: dom.window.Event,
    IS_REACT_ACT_ENVIRONMENT: true,
  })) Object.defineProperty(g, ad, { value: deger, configurable: true });

  const sahteCtx = new Proxy({ font: "", lineWidth: 1 } as Record<string, unknown>, {
    get(h, ad: string) {
      if (ad === "measureText") return (m: string) => ({ width: [...m].length * 10, actualBoundingBoxAscent: 10, actualBoundingBoxDescent: 3 });
      if (ad in h) return h[ad];
      return () => undefined;
    },
    set(h, ad: string, d) { h[ad] = d; return true; },
  });
  Object.defineProperty(dom.window.HTMLCanvasElement.prototype, "getContext", { value: () => sahteCtx });
  Object.defineProperty(dom.window.HTMLCanvasElement.prototype, "toDataURL", { value: () => "data:image/png;base64,TEST" });
  Object.defineProperty(dom.window.HTMLCanvasElement.prototype, "getBoundingClientRect", {
    value: function (this: HTMLCanvasElement) {
      const width = Number.parseFloat(this.style.width) || 640;
      const height = Number.parseFloat(this.style.height) || 400;
      return { x: 0, y: 0, left: 0, top: 0, right: width, bottom: height, width, height, toJSON() {} };
    },
  });
  Object.defineProperty(dom.window.HTMLCanvasElement.prototype, "setPointerCapture", { value: () => {} });

  const React = await import("react");
  const { act } = React;
  const { createRoot } = await import("react-dom/client");
  const { CizimEditoruModal } = await import("../src/modules/sinav-olusturucu/components/CizimEditoruModal");

  const host = document.getElementById("root")!;
  const root = createRoot(host);
  const tus = async (key: string, ek: Partial<KeyboardEventInit> = {}) => {
    await act(async () => { document.body.dispatchEvent(new dom.window.KeyboardEvent("keydown", { key, bubbles: true, ...ek })); });
  };
  const etiketli = (etiket: string) => document.querySelector(`button[aria-label="${etiket}"]`) as HTMLButtonElement | null;
  const etiketliTikla = async (etiket: string) => {
    const b = etiketli(etiket);
    dogrula(b, `“${etiket}” etiketli düğme yok`);
    await act(async () => { b!.click(); });
  };
  const metinliTikla = async (metin: string) => {
    const b = [...document.querySelectorAll("button")].find((x) => x.textContent?.trim() === metin);
    dogrula(b, `“${metin}” düğmesi yok`);
    await act(async () => { (b as HTMLButtonElement).click(); });
  };
  let saat = 1000;
  const pointer = async (tur: string, x: number, y: number, ek: { detail?: number } = {}) => {
    const canvas = document.querySelector("canvas") as HTMLCanvasElement;
    const olay = new dom.window.MouseEvent(tur, { bubbles: true, clientX: x, clientY: y, detail: ek.detail ?? 1 });
    Object.defineProperty(olay, "pointerId", { value: 1 });
    await act(async () => { canvas.dispatchEvent(olay); });
  };
  const tikla = async (x: number, y: number) => { await pointer("pointerdown", x, y); await pointer("pointerup", x, y); };
  const surukle = async (x1: number, y1: number, x2: number, y2: number) => {
    await pointer("pointerdown", x1, y1);
    await pointer("pointermove", (x1 + x2) / 2, (y1 + y2) / 2);
    await pointer("pointermove", x2, y2);
    await pointer("pointerup", x2, y2);
  };
  const ciftTikla = async (x: number, y: number) => {
    await pointer("pointerdown", x, y); await pointer("pointerup", x, y);
    await pointer("pointerdown", x, y, { detail: 2 }); await pointer("pointerup", x, y, { detail: 2 });
  };
  const bekle = async () => { await act(async () => { await new Promise((r) => setTimeout(r, 5)); }); };
  const sekilSayisi = () => Number(/(\d+) şekil var/.exec(document.querySelector("canvas")!.getAttribute("aria-label") ?? "")?.[1] ?? -1);
  const kategoriAc = async (k: string) => {
    const b = document.querySelector(`section[data-kategori="${k}"] > button`) as HTMLButtonElement | null;
    dogrula(b, `kategori yok: ${k}`);
    if (b!.getAttribute("aria-expanded") !== "true") await act(async () => { b!.click(); });
  };
  const yaz = async (el: HTMLInputElement | HTMLTextAreaElement, deger: string) => {
    const proto = el instanceof dom.window.HTMLTextAreaElement ? dom.window.HTMLTextAreaElement.prototype : dom.window.HTMLInputElement.prototype;
    await act(async () => {
      Object.getOwnPropertyDescriptor(proto, "value")!.set!.call(el, deger);
      el.dispatchEvent(new dom.window.Event("input", { bubbles: true }));
    });
  };
  const panelAcik = () => !(document.querySelector('aside[aria-label="Seçili şekil ayarları"]') as HTMLElement).className.includes("hidden");
  void saat;

  const kaydet = async () => { await metinliTikla("Değişiklikleri Kaydet"); };
  const belgeUcgen = (): any => ({ surum: 1, genislik: 960, yukseklik: 600, sekiller: [
    { id: "u", tur: "ucgen", kalinlik: 2, x1: 200, y1: 300, x2: 500, y2: 300, x3: 350, y3: 100 },
  ] });

  // ——— 1) Üçgen seç → «Katla» → çizgi çek → şekil katlama nesnesi olur ———
  {
    let cikti: any = null;
    await act(async () => root.render(<CizimEditoruModal key="k1" baslangicBelgesi={belgeUcgen()} duzenlemeModu onClose={() => {}} onOlustur={(v) => { cikti = v; }} />));
    dogrula(!document.querySelector('[data-testid="arac-katla"]'), "seçim yokken Katla düğmesi görünmemeli");
    await tikla(350, 300); // alt kenar
    const katla = document.querySelector('[data-testid="arac-katla"]') as HTMLButtonElement;
    dogrula(katla, "üçgen seçilince yüzen çubukta Katla düğmesi yok");
    await act(async () => { katla.click(); });
    dogrula(document.querySelector('[data-testid="katla-ipucu"]'), "Katla kipi ipucu görünmedi");
    await surukle(100, 200, 600, 200);
    dogrula(!document.querySelector('[data-testid="katla-ipucu"]'), "çizgi çekilince Katla kipi kapanmalı");
    await kaydet();
    const s = cikti.cizimVerisi.sekiller;
    dogrula(s.length === 1 && s[0].tur === "fizik" && s[0].nesne === "kagitKatlama", `üçgen katlama nesnesine dönüşmedi: ${JSON.stringify(s[0]).slice(0, 160)}`);
    dogrula(s[0].geo.katlar.length === 1 && s[0].geo.katlar[0].mod === "serbestCizgi", "serbestCizgi adımı yok");
    dogrula(s[0].geo.kagit.serbestKoseler.length === 3, "kâğıt 3 köşeli değil");
    await act(async () => { (document.querySelector('[data-testid="arac-katla"]') as HTMLButtonElement | null)?.click(); });
    dogrula(document.querySelector('[data-testid="katla-ipucu"]'), "katlama şeklinde Katla yeniden kipi açmalı (2. katlama)");
    await tus("Escape");
    dogrula(!document.querySelector('[data-testid="katla-ipucu"]'), "Esc Katla kipini kapatmalı");
    console.log("✓ Katlama-UI: üçgen → Katla → fareyle çizgi → katlama nesnesi (geri alınabilir)");
    await tus("z", { ctrlKey: true });
    await kaydet();
    dogrula(cikti.cizimVerisi.sekiller[0].geo.katlar.length === 0, "geri al katlamayı kaldırmadı");
  }

  // ——— 2) Kâğıdı kesmeyen çizgi hata verir, şekil bozulmaz ———
  {
    let cikti: any = null;
    await act(async () => root.render(<CizimEditoruModal key="k2" baslangicBelgesi={belgeUcgen()} duzenlemeModu onClose={() => {}} onOlustur={(v) => { cikti = v; }} />));
    await tikla(350, 300);
    await act(async () => { (document.querySelector('[data-testid="arac-katla"]') as HTMLButtonElement).click(); });
    await surukle(100, 500, 700, 500); // üçgenin altından geçer
    dogrula(/kesmeli/.test(document.body.textContent ?? ""), "kesmeyen çizgi için uyarı çıkmadı");
    await kaydet();
    dogrula(cikti.cizimVerisi.sekiller[0].geo.katlar.length === 0, "kesmeyen çizgi katlama oluşturdu");
    console.log("✓ Katlama-UI: kâğıdı kesmeyen çizgi uyarı verir");
  }

  // ——— 3) D ucu ve A′ sürüklenir ———
  {
    const { katlamaTutamaclari } = await import("../src/modules/sinav-olusturucu/cizim/geometriEtkilesim");
    let cikti: any = null;
    await act(async () => root.render(<CizimEditoruModal key="k3" baslangicBelgesi={belgeUcgen()} duzenlemeModu onClose={() => {}} onOlustur={(v) => { cikti = v; }} />));
    await tikla(350, 300);
    await act(async () => { (document.querySelector('[data-testid="arac-katla"]') as HTMLButtonElement).click(); });
    await surukle(100, 200, 600, 200);
    await kaydet();
    const s0 = cikti.cizimVerisi.sekiller[0];
    const T0 = katlamaTutamaclari(s0);
    const uc = T0.find((t) => t.tur === "uc")!, hedef = T0.find((t) => t.tur === "hedef")!;
    dogrula(T0.length === 3, `3 tutamaç bekleniyordu (2 uç + A′): ${T0.length}`);
    await surukle(uc.x, uc.y, uc.x - 5, uc.y + 40);
    await kaydet();
    const s1 = cikti.cizimVerisi.sekiller[0];
    const T1 = katlamaTutamaclari(s1);
    dogrula(T1.find((t) => t.tur === "uc" && t.uc === uc.uc)!.y > uc.y + 20, "uç sürüklenince kenar boyunca kaymadı");
    dogrula(s1.geo.katlar[0].mod === "serbestCizgi", "uç sürüklemesi serbestCizgi bırakmalı");
    const h1 = T1.find((t) => t.tur === "hedef")!;
    await surukle(h1.x, h1.y, h1.x - 20, h1.y + 30);
    await kaydet();
    const s2 = cikti.cizimVerisi.sekiller[0];
    dogrula(s2.geo.katlar[0].mod === "getir" && !!s2.geo.katlar[0].hedefXY, `A′ sürüklemesi getir + hedefXY olmalı: ${JSON.stringify(s2.geo.katlar[0])}`);
    dogrula(cikti.cizimVerisi.sekiller.length === 1, "sürükleme yeni şekil üretmemeli");
    void hedef;
    console.log("✓ Katlama-UI: D ucu kenar boyunca, A′ serbestçe sürüklenir");
  }

  await act(async () => root.unmount());
  console.log("TÜM KATLAMA KULLANICI AKIŞLARI BAŞARILI");
}

main().catch((hata) => { console.error(hata); process.exit(1); });
