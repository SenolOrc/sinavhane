import { JSDOM } from "jsdom";

function dogrula(kosul: unknown, mesaj: string) {
  if (!kosul) throw new Error(`KULLANICI AKIŞI BAŞARISIZ: ${mesaj}`);
}

async function main() {
  const dom = new JSDOM("<!doctype html><html><body><div id='root'></div></body></html>", { url: "http://localhost" });
  Object.defineProperty(globalThis, "window", { value: dom.window, configurable: true });
  Object.defineProperty(globalThis, "document", { value: dom.window.document, configurable: true });
  Object.defineProperty(globalThis, "navigator", { value: dom.window.navigator, configurable: true });
  Object.defineProperty(globalThis, "HTMLElement", { value: dom.window.HTMLElement, configurable: true });
  Object.defineProperty(globalThis, "HTMLCanvasElement", { value: dom.window.HTMLCanvasElement, configurable: true });
  Object.defineProperty(globalThis, "MouseEvent", { value: dom.window.MouseEvent, configurable: true });
  Object.defineProperty(globalThis, "KeyboardEvent", { value: dom.window.KeyboardEvent, configurable: true });
  Object.defineProperty(globalThis, "IS_REACT_ACT_ENVIRONMENT", { value: true, configurable: true });

  const sahteCtx = {
    font: "", fillStyle: "", strokeStyle: "", lineWidth: 1, lineCap: "round", lineJoin: "round", textBaseline: "alphabetic",
    clearRect() {}, fillRect() {}, strokeRect() {}, beginPath() {}, rect() {}, clip() {}, moveTo() {}, lineTo() {}, quadraticCurveTo() {}, stroke() {}, fill() {},
    ellipse() {}, arc() {}, closePath() {}, save() {}, restore() {}, setLineDash() {}, translate() {}, rotate() {}, scale() {},
    fillText() {}, measureText(metin: string) { return { width: [...metin].length * 10 }; },
    // Fizik kipindeki palet simgeleri (FizikSimgesi) ve fizik nesneleri için.
    setTransform() {}, resetTransform() {}, bezierCurveTo() {}, arcTo() {}, strokeText() {}
  };
  Object.defineProperty(dom.window.HTMLCanvasElement.prototype, "getContext", { value: () => sahteCtx });
  Object.defineProperty(dom.window.HTMLCanvasElement.prototype, "toDataURL", { value: () => "data:image/png;base64,TEST" });
  Object.defineProperty(dom.window.HTMLCanvasElement.prototype, "getBoundingClientRect", {
    value: function(this: HTMLCanvasElement) {
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

  const root = createRoot(document.getElementById("root")!);
  const var_ = (metin: string) => [...document.querySelectorAll("button")].find((b) => b.textContent?.trim().includes(metin));
  const tikla = async (metin: string) => {
    const buton = var_(metin);
    dogrula(buton, `“${metin}” butonu bulunamadı`);
    await act(async () => { (buton as HTMLButtonElement).click(); });
  };
  const pointer = async (canvas: HTMLCanvasElement, tur: string, x: number, y: number) => {
    const olay = new dom.window.MouseEvent(tur, { bubbles: true, clientX: x, clientY: y, buttons: tur === "pointermove" ? 1 : 0 });
    Object.defineProperty(olay, "pointerId", { value: 1 });
    await act(async () => { canvas.dispatchEvent(olay); });
  };
  const tus = async (key: string, ek: Partial<KeyboardEventInit> = {}) => {
    await act(async () => { document.body.dispatchEvent(new dom.window.KeyboardEvent("keydown", { key, bubbles: true, ...ek })); });
  };

  // 2×3 panel (540×300, aralık 14, başlık yok → hücre 170.67×143): tel + ⊗ alanı 1. hücrede.
  const belge: any = { surum: 1, genislik: 640, yukseklik: 400, sekiller: [
    { id: "panel", tur: "fizik", nesne: "fizikSekil", kalinlik: 2, x: 40, y: 30, w: 540, h: 300,
      geo: { tur: "cografya", yapi: "panelIzgara", ayar: { satir: 2, sutun: 3, baslik: "daire", yer: "ust", aralik: 14 } } },
    { id: "tel", tur: "dogru", kalinlik: 2, x1: 70, y1: 120, x2: 180, y2: 120 },
    { id: "disTel", tur: "dogru", kalinlik: 2, x1: 70, y1: 360, x2: 180, y2: 360 },
  ] };
  let cikti: any = null;
  await act(async () => root.render(<CizimEditoruModal key="panel" baslangicBelgesi={belge} duzenlemeModu onClose={() => {}} onOlustur={(v) => { cikti = v; }} />));
  const tuval = document.querySelector("canvas")!;
  await tikla("Seç / Taşı");

  // Tel panelin ÇERÇEVESİ içinde: üstüne tıklamak paneli değil teli seçer (zemin önceliği)
  await pointer(tuval, "pointerdown", 125, 120); await pointer(tuval, "pointerup", 125, 120);
  dogrula(var_("Panellere çoğalt"), "hücredeki seçimde “Panellere çoğalt” görünmeli");

  // Panel dışındaki tel seçilince düğme gizlenir
  await pointer(tuval, "pointerdown", 125, 360); await pointer(tuval, "pointerup", 125, 360);
  dogrula(!var_("Panellere çoğalt"), "panel dışındaki seçimde düğme gizli olmalı");

  // Tek tıkla 5 panele çoğalt; sonra Ctrl+Z TEK adımda hepsini geri alır
  await pointer(tuval, "pointerdown", 125, 120); await pointer(tuval, "pointerup", 125, 120);
  await tikla("Panellere çoğalt");
  await tikla("Değişiklikleri Kaydet");
  const sonra = cikti.cizimVerisi.sekiller;
  dogrula(sonra.length === 3 + 5, `5 kopya beklenirdi, toplam ${sonra.length}`);
  const teller = sonra.filter((s: any) => s.tur === "dogru" && s.y1 !== 360);
  dogrula(teller.length === 6, "orijinal + 5 kopya tel");
  dogrula(new Set(sonra.map((s: any) => s.id)).size === sonra.length, "kimlikler benzersiz olmalı");
  // 2. hücre (sağa 184.67), 4. hücre (aşağı 157)
  dogrula(teller.some((s: any) => Math.abs(s.x1 - (70 + (540 - 28) / 3 + 14)) < 0.01), "sağdaki hücreye kopya yok");
  dogrula(teller.some((s: any) => Math.abs(s.y1 - (120 + 157)) < 1), "alttaki satıra kopya yok");

  await tus("z", { ctrlKey: true });
  await tikla("Değişiklikleri Kaydet");
  dogrula(cikti.cizimVerisi.sekiller.length === 3, `Ctrl+Z tek adımda geri almadı (${cikti.cizimVerisi.sekiller.length})`);
  await tus("y", { ctrlKey: true });
  await tikla("Değişiklikleri Kaydet");
  dogrula(cikti.cizimVerisi.sekiller.length === 8, "Ctrl+Y kopyaları geri getirmedi");
  console.log("✓ Kullanıcı akışı: Panellere çoğalt (hücredeki seçim, panel dışında gizli, tek adımda geri al/ileri al)");

  // Panelin kendisi seçilince eylem yok; çerçeve çizgisine tıklamak paneli seçer
  await pointer(tuval, "pointerdown", 40, 200); await pointer(tuval, "pointerup", 40, 200);
  dogrula(document.querySelector('[role="toolbar"]'), "panel çerçevesine tıklamak paneli seçmeli (araç çubuğu görünmeli)");
  dogrula(!var_("Panellere çoğalt"), "panel seçiliyken düğme gizli olmalı");
  console.log("✓ Kullanıcı akışı: panel çerçevesi seçilir, eylem gizlenir");

  await act(async () => root.unmount());
  console.log("TÜM PANEL KULLANICI AKIŞLARI BAŞARILI");
}

main().catch((hata) => { console.error(hata); process.exit(1); });
