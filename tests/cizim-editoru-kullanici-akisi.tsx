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

  const host = document.getElementById("root")!;
  const root = createRoot(host);
  const tikla = async (metin: string) => {
    const buton = [...document.querySelectorAll("button")].find((b) => b.textContent?.trim().includes(metin));
    dogrula(buton, `“${metin}” butonu bulunamadı`);
    await act(async () => { (buton as HTMLButtonElement).click(); });
  };
  const tiklaTam = async (metin: string) => {
    const buton = [...document.querySelectorAll("button")].find((b) => b.textContent?.trim() === metin);
    dogrula(buton, `“${metin}” düğmesi bulunamadı`);
    await act(async () => { (buton as HTMLButtonElement).click(); });
  };
  const basligaTikla = async (baslik: string) => {
    const buton = document.querySelector(`button[title="${baslik}"]`);
    dogrula(buton, `“${baslik}” başlıklı buton bulunamadı`);
    await act(async () => { (buton as HTMLButtonElement).click(); });
  };
  // v1.2: ızgara, tuval ölçüsü, temizle, geçmiş, "Sadece tuval" → "Daha fazla" menüsünde.
  const dahaFazlaAc = async () => {
    if (document.querySelector('[data-testid="daha-fazla-menusu"]')) return;
    await basligaTikla("Daha fazla: ızgara, tuval ölçüsü, temizle…");
  };
  // v1.2: kütüphane kategorisini aç (açık/kapalı durumu tarayıcıda hatırlanıyor).
  const etiketliTiklaOnce = async (etiket: string) => {
    const buton = document.querySelector(`button[aria-label="${etiket}"]`);
    dogrula(buton, `“${etiket}” etiketli düğme bulunamadı`);
    await act(async () => { (buton as HTMLButtonElement).click(); });
  };
  const kategoriAc = async (kategori: string) => {
    const baslik = document.querySelector(`section[data-kategori="${kategori}"] > button`) as HTMLButtonElement | null;
    dogrula(baslik, `“${kategori}” kütüphane kategorisi yok`);
    if (baslik!.getAttribute("aria-expanded") !== "true") await act(async () => { baslik!.click(); });
  };
  const kutuphaneKarti = async (kategori: string, ad: string) => {
    await kategoriAc(kategori);
    const kart = document.querySelector(`button[aria-label="Ekle: ${ad}"]`) as HTMLButtonElement | null;
    dogrula(kart, `“${ad}” kütüphane kartı yok`);
    await act(async () => { kart!.click(); });
  };
  const pointer = async (canvas: HTMLCanvasElement, tur: string, x: number, y: number, shiftKey = false) => {
    const olay = new dom.window.MouseEvent(tur, { bubbles: true, clientX: x, clientY: y, shiftKey, buttons: tur === "pointermove" ? 1 : 0 });
    Object.defineProperty(olay, "pointerId", { value: 1 });
    await act(async () => { canvas.dispatchEvent(olay); });
  };
  const ciz = async (canvas: HTMLCanvasElement, x1: number, y1: number, x2: number, y2: number) => {
    await pointer(canvas, "pointerdown", x1, y1);
    await pointer(canvas, "pointermove", x2, y2);
    await pointer(canvas, "pointerup", x2, y2);
  };

  // Senaryo 1: Kullanıcı gibi iç içe dikdörtgen, çember ve üçgen çiz.
  let cikti: any = null;
  await act(async () => root.render(<CizimEditoruModal key="manuel" onClose={() => {}} onOlustur={(v) => { cikti = v; }} />));
  const canvas = document.querySelector("canvas")!;
  // v1.2: çizim bitince araç kendiliğinden Seç'e döner; her şekil için araç yeniden seçilir.
  for (const [arac, x1, y1, x2, y2] of [
    ["Dikdörtgen", 70, 55, 570, 345], ["Dikdörtgen", 135, 105, 505, 295], ["Dikdörtgen", 215, 155, 425, 245],
    ["Daire / Elips", 120, 45, 430, 355], ["Daire / Elips", 205, 130, 345, 270],
    ["Üçgen", 145, 80, 500, 330], ["Üçgen", 210, 115, 430, 285],
  ] as const) {
    await tikla(arac);
    await ciz(canvas, x1, y1, x2, y2);
  }
  await tikla("Yeni Soru Olarak Ekle");
  dogrula(cikti?.cizimVerisi?.sekiller.length === 7, "Karmaşık manuel çizimde şekil kaybı var");
  dogrula(cikti.oran > 1.2 && cikti.oran < 2, "Karmaşık çizimin otomatik kırpma oranı mantıksız");
  console.log("✓ Kullanıcı akışı: iç içe 3 dikdörtgen + 2 çember + 2 üçgen");

  // Senaryo 2: Shift ile çoklu seç, grupla ve birlikte kaydet.
  cikti = null;
  const ikiSekil: any = { surum: 1, genislik: 640, yukseklik: 400, sekiller: [
    { id: "a", tur: "dikdortgen", kalinlik: 2, x: 100, y: 120, w: 120, h: 80 },
    { id: "b", tur: "elips", kalinlik: 2, x: 360, y: 120, w: 120, h: 80 },
  ] };
  await act(async () => root.render(<CizimEditoruModal key="grup" baslangicBelgesi={ikiSekil} duzenlemeModu onClose={() => {}} onOlustur={(v) => { cikti = v; }} />));
  const grupCanvas = document.querySelector("canvas")!;
  await tikla("Seç / Taşı");
  await pointer(grupCanvas, "pointerdown", 100, 150); await pointer(grupCanvas, "pointerup", 100, 150);
  await pointer(grupCanvas, "pointerdown", 420, 120, true); await pointer(grupCanvas, "pointerup", 420, 120, true);
  await tikla("Grupla");
  await tikla("Değişiklikleri Kaydet");
  const grupIds = cikti.cizimVerisi.sekiller.map((s: any) => s.grupId);
  dogrula(grupIds[0] && grupIds[0] === grupIds[1], "Çoklu seçim gruba dönüşmedi");
  console.log("✓ Kullanıcı akışı: Shift çoklu seçim ve gruplama");

  // Senaryo 3: Üç şekli çoklu seç ve yatay eşit dağıt.
  cikti = null;
  const daginik: any = { surum: 1, genislik: 640, yukseklik: 400, sekiller: [
    { id: "d1", tur: "dikdortgen", kalinlik: 2, x: 60, y: 120, w: 60, h: 50 },
    { id: "d2", tur: "dikdortgen", kalinlik: 2, x: 210, y: 120, w: 60, h: 50 },
    { id: "d3", tur: "dikdortgen", kalinlik: 2, x: 500, y: 120, w: 60, h: 50 },
  ] };
  await act(async () => root.render(<CizimEditoruModal key="dagit" baslangicBelgesi={daginik} duzenlemeModu onClose={() => {}} onOlustur={(v) => { cikti = v; }} />));
  const dagitCanvas = document.querySelector("canvas")!;
  await tikla("Seç / Taşı");
  await pointer(dagitCanvas, "pointerdown", 60, 140); await pointer(dagitCanvas, "pointerup", 60, 140);
  await pointer(dagitCanvas, "pointerdown", 210, 140, true); await pointer(dagitCanvas, "pointerup", 210, 140, true);
  await pointer(dagitCanvas, "pointerdown", 500, 140, true); await pointer(dagitCanvas, "pointerup", 500, 140, true);
  await tikla("Yatay dağıt");
  await tikla("Değişiklikleri Kaydet");
  const merkezler = cikti.cizimVerisi.sekiller.map((s: any) => s.x + s.w / 2).sort((a: number, b: number) => a - b);
  dogrula(Math.abs((merkezler[1] - merkezler[0]) - (merkezler[2] - merkezler[1])) < 0.01, "Yatay eşit dağıtma çalışmadı");
  console.log("✓ Kullanıcı akışı: hizalama yardımcısıyla yatay eşit dağıtma");

  // Senaryo 4: Döndürme tutamacını sürükle ve Shift ile 15°'ye kilitle.
  cikti = null;
  const tekSekil: any = { surum: 1, genislik: 640, yukseklik: 400, sekiller: [
    { id: "r", tur: "dikdortgen", kalinlik: 2, x: 250, y: 160, w: 140, h: 70 },
  ] };
  await act(async () => root.render(<CizimEditoruModal key="dondur" baslangicBelgesi={tekSekil} duzenlemeModu onClose={() => {}} onOlustur={(v) => { cikti = v; }} />));
  const rotCanvas = document.querySelector("canvas")!;
  await tikla("Seç / Taşı");
  await pointer(rotCanvas, "pointerdown", 250, 190); await pointer(rotCanvas, "pointerup", 250, 190);
  await pointer(rotCanvas, "pointerdown", 320, 132);
  await pointer(rotCanvas, "pointermove", 405, 195, true);
  await pointer(rotCanvas, "pointerup", 405, 195, true);
  await tikla("Değişiklikleri Kaydet");
  dogrula(Math.abs(cikti.cizimVerisi.sekiller[0].donus) >= 45, "Döndürme tutamacı şekli döndürmedi");
  dogrula(Math.abs(cikti.cizimVerisi.sekiller[0].donus % 15) < 0.001, "Shift ile 15° kilidi çalışmadı");
  console.log("✓ Kullanıcı akışı: döndürme tutamacı ve 15° kilidi");

  // Senaryo 5: Seçim kutusu, grup döndürme, yakınlaştırma ve silgi birlikte çalışmalı.
  cikti = null;
  const uxBelgesi: any = { surum: 1, genislik: 640, yukseklik: 400, sekiller: [
    { id: "u1", tur: "dikdortgen", kalinlik: 2, x: 80, y: 90, w: 100, h: 70 },
    { id: "u2", tur: "elips", kalinlik: 2, x: 230, y: 100, w: 100, h: 70 },
    { id: "u3", tur: "ucgen", kalinlik: 2, x1: 430, y1: 80, x2: 380, y2: 190, x3: 500, y3: 190 },
  ] };
  await act(async () => root.render(<CizimEditoruModal key="ux" baslangicBelgesi={uxBelgesi} duzenlemeModu onClose={() => {}} onOlustur={(v) => { cikti = v; }} />));
  const uxCanvas = document.querySelector("canvas")!;
  await tikla("Seç / Taşı");
  await ciz(uxCanvas, 55, 65, 350, 200);
  dogrula(document.body.textContent?.includes("2 şekil seçili"), "Sürükleyerek çoklu seçim çalışmadı");
  await pointer(uxCanvas, "pointerdown", 205, 62);
  await pointer(uxCanvas, "pointermove", 350, 125, true);
  await pointer(uxCanvas, "pointerup", 350, 125, true);
  // İddia TAŞINDI, silinmedi. Koruduğu şey "yakınlaştırma tuvalin ekrandaki
  // ölçüsünü değiştiriyor". Eski beklenen değer (1200px) tuvalin HEP 960 geniş
  // olduğu varsayımından geliyordu; tuval artık BELGEDEN geldiği için (bu belge
  // 640 diyor) beklenen değer de belgeden türetiliyor. Sabit bırakılsaydı iddia
  // yakınlaştırmayı değil, eski sabiti korurdu.
  dogrula(uxCanvas.width === uxBelgesi.genislik, "tuval ölçüsü belgeden alınmıyor");
  const zoomOncesi = uxCanvas.style.width;
  await basligaTikla("Yakınlaştır");
  dogrula(
    uxCanvas.style.width === `${uxBelgesi.genislik * 1.25}px`,
    `Yakınlaştırma tuval ölçüsünü değiştirmedi (önce ${zoomOncesi}, sonra ${uxCanvas.style.width})`,
  );
  await tikla("Silgi");
  // %125 zoom altında üçgenin tepe noktasından kenarı boyunca sil.
  await ciz(uxCanvas, 537.5, 100, 475, 237.5);
  await tikla("Değişiklikleri Kaydet");
  dogrula(cikti.cizimVerisi.sekiller.length === 2, "Silgi üzerinden geçilen şekli silmedi");
  dogrula(cikti.cizimVerisi.sekiller.every((s: any) => Math.abs(s.donus ?? 0) >= 15), "Grup döndürme seçili iki şekli birlikte döndürmedi");
  console.log("✓ Kullanıcı akışı: seçim kutusu + grup döndürme + zoom + silgi");

  // Senaryo 6: Tamamen temizlenmiş düzenleme de kaydetmeden kapanmamalı.
  await act(async () => root.render(<CizimEditoruModal key="kapatma" baslangicBelgesi={tekSekil} duzenlemeModu onClose={() => {}} onOlustur={() => {}} />));
  await dahaFazlaAc();
  await tiklaTam("Tümünü temizle");
  await tiklaTam("Temizle");
  await tiklaTam("Vazgeç");
  dogrula(document.body.textContent?.includes("Kaydedilmemiş çizim var"), "Boşaltılmış çizimde kapatma uyarısı açılmadı");
  await tiklaTam("Çizime dön");
  console.log("✓ Kullanıcı akışı: boş tuvalde kaydetmeden kapatma koruması");

  // Senaryo 7: Kesin ölçüler ve tarama çıktının düzenlenebilir verisine yazılmalı.
  cikti = null;
  await act(async () => root.render(<CizimEditoruModal key="olcu" baslangicBelgesi={tekSekil} duzenlemeModu onClose={() => {}} onOlustur={(v) => { cikti = v; }} />));
  const olcuCanvas = document.querySelector("canvas")!;
  await tikla("Seç / Taşı");
  await pointer(olcuCanvas, "pointerdown", 250, 190); await pointer(olcuCanvas, "pointerup", 250, 190);
  const genislik = document.querySelector('input[aria-label="Genişlik"]') as HTMLInputElement;
  dogrula(genislik, "Kesin genişlik alanı gösterilmedi");
  await act(async () => { genislik.value = "180"; genislik.dispatchEvent(new dom.window.FocusEvent("focusout", { bubbles: true })); });
  await tiklaTam("Çapraz");
  await tikla("Değişiklikleri Kaydet");
  dogrula(Math.abs(cikti.cizimVerisi.sekiller[0].w - 180) < 0.01, "Sayısal genişlik uygulanmadı");
  dogrula(cikti.cizimVerisi.sekiller[0].tarama === "capraz", "Çapraz tarama belgeye kaydedilmedi");
  console.log("✓ Kullanıcı akışı: kesin ölçü ve baskıya uygun tarama");

  // Senaryo 8: Seçimi kullanıcı şablonuna kaydet, yeni editörde tekrar ekle.
  cikti = null;
  await act(async () => root.render(<CizimEditoruModal key="sablon-kaydet" baslangicBelgesi={tekSekil} duzenlemeModu onClose={() => {}} onOlustur={() => {}} />));
  const sablonCanvas = document.querySelector("canvas")!;
  await tikla("Seç / Taşı");
  await pointer(sablonCanvas, "pointerdown", 250, 190); await pointer(sablonCanvas, "pointerup", 250, 190);
  await tiklaTam("Şablon kaydet");
  const adAlani = [...document.querySelectorAll("input")].find((i) => i.parentElement?.textContent?.includes("Şablon adı")) as HTMLInputElement;
  dogrula(adAlani, "Şablon adı alanı açılmadı");
  await act(async () => {
    Object.getOwnPropertyDescriptor(dom.window.HTMLInputElement.prototype, "value")?.set?.call(adAlani, "Özel kutu");
    adAlani.dispatchEvent(new dom.window.Event("input", { bubbles: true }));
  });
  await tiklaTam("Kaydet");
  dogrula(window.localStorage.getItem("ogretmen-asistani:cizim-sablonlari:v1")?.includes("Özel kutu"), "Kullanıcı şablonu kalıcı saklanmadı");
  await act(async () => root.render(<CizimEditoruModal key="sablon-yeni" onClose={() => {}} onOlustur={(v) => { cikti = v; }} />));
  await kutuphaneKarti("sablonlarim", "Özel kutu");
  await tikla("Yeni Soru Olarak Ekle");
  dogrula(cikti.cizimVerisi.sekiller.length === 1, "Kullanıcı şablonu yeni editöre eklenmedi");
  console.log("✓ Kullanıcı akışı: oturumlar arası kullanıcı şablonu");

  // Senaryo 9: Klavyeyle sıfırdan şekil oluştur ve ekran okuyucu özetini doğrula.
  cikti = null;
  await act(async () => root.render(<CizimEditoruModal key="erisilebilir" onClose={() => {}} onOlustur={(v) => { cikti = v; }} />));
  await tiklaTam("Üçgen");
  const klavyeCanvas = document.querySelector("canvas")!;
  await act(async () => { klavyeCanvas.focus(); klavyeCanvas.dispatchEvent(new dom.window.KeyboardEvent("keydown", { key: "Enter", bubbles: true })); });
  dogrula(klavyeCanvas.getAttribute("role") === "img" && klavyeCanvas.getAttribute("aria-label")?.includes("1 şekil"), "Canvas erişilebilirlik özeti güncellenmedi");
  await tikla("Yeni Soru Olarak Ekle");
  dogrula(cikti.cizimVerisi.sekiller[0].tur === "ucgen", "Enter ile klavyeden şekil oluşturulmadı");
  console.log("✓ Kullanıcı akışı: klavyeyle şekil oluşturma ve ekran okuyucu özeti");

  // Senaryo 12: Sağ-alt köşedeki metin kutusu tuvalin dışına taşmamalı.
  await act(async () => root.render(<CizimEditoruModal key="metin-sinir" onClose={() => {}} onOlustur={() => {}} />));
  await tiklaTam("Metin");
  const metinCanvas = document.querySelector("canvas")!;
  await pointer(metinCanvas, "pointerdown", 955, 595);
  const metinKutusu = document.querySelector('textarea[placeholder="Etiket metni"]')?.parentElement as HTMLDivElement;
  // Tuval 960×600 (CANVAS_W/CANVAS_H); kutu 224×126 için üst sınır CANVAS_W-224 / CANVAS_H-126.
  dogrula(Number.parseFloat(metinKutusu.style.left) <= 736 && Number.parseFloat(metinKutusu.style.top) <= 474, "Metin kutusu sağ-alt sınırdan taştı");
  console.log("✓ Kullanıcı akışı: metin kutusu kenar sınırlaması");

  // Senaryo 10: Uzun oturumda geçmiş sınırı kullanıcıya görünmeli ve 80'i aşmamalı.
  await act(async () => root.render(<CizimEditoruModal key="gecmis" onClose={() => {}} onOlustur={() => {}} />));
  await tiklaTam("Dikdörtgen");
  const gecmisCanvas = document.querySelector("canvas")!;
  for (let i = 0; i < 85; i += 1) {
    await act(async () => { gecmisCanvas.dispatchEvent(new dom.window.KeyboardEvent("keydown", { key: "Enter", bubbles: true })); });
    if (i < 84) await tiklaTam("Dikdörtgen");
  }
  await dahaFazlaAc();
  dogrula(document.body.textContent?.includes("Geçmiş 80/80"), "Geçmiş sınırı görünür değil veya 80'i aştı");
  console.log("✓ Kullanıcı akışı: 80 adımlık görünür geçmiş sınırı");

  // Senaryo 13 (v1.2): KİP YOK. Eskiden Çizim/Fizik/Matematik/Kimya/Akış kip
  // sekmeleri vardı; öğretmen şekli bulmak için 4 katman geziyordu. Artık temel
  // araçlar HEP üst çubukta, akış kutuları da sol kütüphanede.
  const dugmeVar = (metin: string) =>
    [...document.querySelectorAll("button")].some((b) => b.textContent?.trim() === metin);

  await act(async () => root.render(<CizimEditoruModal key="kip" onClose={() => {}} onOlustur={() => {}} />));
  dogrula(!document.querySelector("[data-kip-sekmesi]"), "Eski kip sekmeleri hâlâ duruyor");
  for (const arac of ["Seç / Taşı", "Çizgi", "Ok / Bağlayıcı", "Dikdörtgen", "Daire / Elips", "Üçgen", "Çokgen", "Dalga", "Serbest çizgi", "Metin", "Silgi"]) {
    dogrula(document.querySelector(`button[data-arac][aria-label="${arac}"]`), `Temel araç üst çubukta yok: ${arac}`);
  }
  await kutuphaneKarti("akis", "İşlem");
  const kipCanvas = document.querySelector("canvas")!;
  dogrula(kipCanvas.getAttribute("aria-label")?.includes("1 şekil"), "Kütüphaneden akış kutusu eklenmedi");
  dogrula(document.querySelector('button[aria-label="Ekle: Karar"]'), "Kart eklenince kütüphane kapandı — ardı ardına ekleme yapılamaz");
  await kutuphaneKarti("akis", "Karar");
  dogrula(kipCanvas.getAttribute("aria-label")?.includes("2 şekil"), "İkinci akış kutusu eklenmedi");
  dogrula(dugmeVar("Üçgen") || !!document.querySelector('button[aria-label="Üçgen"]'), "Akış kutusu eklenince genel araçlar kayboldu");
  console.log("✓ Kullanıcı akışı: kipsiz araç çubuğu + kütüphaneden ardı ardına akış kutusu");

  // Senaryo 14: Eski (akış kutulu) çizim olduğu gibi açılır, şekil kaybı yok.
  await act(async () => root.render(
    <CizimEditoruModal
      key="kip-hatirlama"
      onClose={() => {}}
      onOlustur={() => {}}
      duzenlemeModu
      baslangicBelgesi={{
        surum: 1,
        genislik: 960,
        yukseklik: 600,
        sekiller: [{ id: "k1", tur: "akis", akisSekli: "islem", kalinlik: 2, cizgiTipi: "duz", x: 10, y: 10, w: 120, h: 60, metin: "x" }],
      } as any}
    />,
  ));
  dogrula(document.querySelector("canvas")!.getAttribute("aria-label")?.includes("1 şekil"), "Akış kutulu eski çizim açılınca şekil kayboldu");
  console.log("✓ Kullanıcı akışı: akış kutulu eski çizim açılıyor");

  // ——— Senaryo: araç çubuğu düzeni ———
  // KORUDUĞU ŞEY: tuvalin görünen yüksekliği. 1200×800 gerçek pencerede
  // ölçüldü — eskiden bir şekil seçilince çubuk 404 px içerik isteyip 240 px'e
  // sıkışıyor (164 px kontrol kendi içinde kayıyor), tuvalin 600 px'inin
  // yalnız 302 px'i görünüyordu. Üç değişiklik bunu düzeltti ve üçü de burada
  // yoklanıyor, çünkü hepsi tek satırlık bir sınıf değişikliğiyle geri alınabilir.
  await act(async () => root.render(
    <CizimEditoruModal
      key="duzen"
      onClose={() => {}}
      onOlustur={() => {}}
      duzenlemeModu
      baslangicBelgesi={{
        surum: 1,
        genislik: 960,
        yukseklik: 600,
        sekiller: [{ id: "d1", tur: "dikdortgen", kalinlik: 2, cizgiTipi: "duz", x: 40, y: 40, w: 120, h: 80 }],
      }}
    />,
  ));

  // 1) Seçim paneli SAĞ SÜTUNDA ve seçim yokken hiç çizilmiyor.
  const panel = () => document.querySelector('aside[aria-label="Seçili şekil ayarları"]');
  dogrula(panel(), "seçili şekil paneli sağ sütuna taşınmamış");
  dogrula(
    // Yeni yerleşim: panel yalnız gösterilecek bir şey varsa (seçim ya da şekil/şablon kütüphanesi) açılır.
    (panel() as HTMLElement).className.includes("hidden") || !!(panel() as HTMLElement).textContent?.includes("Şablonlarım"),
    "seçim yokken sağ sütun boşuna yer kaplıyor — tuval daralıyor",
  );
  const olcuTuvali = document.querySelector("canvas")!;
  await tikla("Seç / Taşı");
  // Dikdörtgenin KENARINA tıklanıyor, içine değil: `vurus.ts` şeklin içini
  // dolu saymıyor (dolgusuz şekilde içeriden tıklamak seçmez).
  await pointer(olcuTuvali, "pointerdown", 100, 40);
  await pointer(olcuTuvali, "pointerup", 100, 40);
  // v1.2: basit şekilde ayrıntılı panel KENDİLİĞİNDEN açılmaz; yüzen çubuk yeter.
  dogrula((panel() as HTMLElement).className.includes("hidden"), "basit şekil seçilince ayrıntılı panel kendiliğinden açıldı");
  dogrula(document.querySelector('[data-testid="yuzen-arac-cubugu"]'), "şekil seçilince yüzen araç çubuğu çıkmadı");
  await etiketliTiklaOnce("Ayrıntılar");
  dogrula(!(panel() as HTMLElement).className.includes("hidden"), "“Ayrıntılar” ayrıntılı paneli açmadı");

  // 2) Araç çubuğu KENDİ İÇİNDE KAYMIYOR. `max-h-[30vh] overflow-y-auto`
  //    geri gelirse kontroller yine ikinci bir kaydırma çubuğunun arkasında
  //    kaybolur — iddia sınıfı doğrudan yokluyor.
  // (Yeni yerleşim: araçlar solda dikey çubukta.)
  const cubuk = document.querySelector('[aria-label="Çizim araçları"]') as HTMLElement | null;
  dogrula(cubuk, "araç çubuğu bulunamadı — iddia bir şey yoklamıyor");
  dogrula(
    !cubuk!.className.includes("overflow-y-auto") && !cubuk!.className.includes("max-h-"),
    "araç çubuğu yine kendi içinde kayıyor — kontroller görünmez oluyor",
  );

  // 3) Görünüm ayarları ALT ŞERİTTE, araç çubuğunda değil.
  dogrula(
    !cubuk!.textContent?.includes("Izgaraya yakala"),
    "görünüm ayarları araç çubuğuna geri dönmüş",
  );
  await dahaFazlaAc();
  dogrula(dugmeVar("Sadece tuval"), "odak kipi düğmesi yok");
  console.log("✓ Kullanıcı akışı: seçim paneli sağda, çubuk kaymıyor, görünüm altta");

  // Seçileni sil + Delete tuşu (eskiden güncelleyici boşaltılmış ref'i okuyup hiçbir şeyi silmiyordu)
  {
    const silDoc: any = { surum: 1, genislik: 640, yukseklik: 400, sekiller: [
      { id: "s1", tur: "dikdortgen", kalinlik: 2, x: 100, y: 100, w: 120, h: 80 },
      { id: "s2", tur: "dikdortgen", kalinlik: 2, x: 360, y: 100, w: 120, h: 80 },
    ] };
    let silCikti: any = null;
    await act(async () => root.render(<CizimEditoruModal key="sil" baslangicBelgesi={silDoc} duzenlemeModu onClose={() => {}} onOlustur={(v) => { silCikti = v; }} />));
    const silCanvas = document.querySelector("canvas")!;
    await tikla("Seç / Taşı");
    await pointer(silCanvas, "pointerdown", 100, 140); await pointer(silCanvas, "pointerup", 100, 140);
    await tikla("Seçileni sil");
    await tikla("Değişiklikleri Kaydet");
    dogrula(silCikti?.cizimVerisi?.sekiller.length === 1, `"Seçileni sil" şekli silmedi (${silCikti?.cizimVerisi?.sekiller.length})`);
    dogrula(silCikti.cizimVerisi.sekiller[0].id === "s2", "yanlış şekil silindi");
    // Delete tuşu
    silCikti = null;
    await act(async () => root.render(<CizimEditoruModal key="sil2" baslangicBelgesi={silDoc} duzenlemeModu onClose={() => {}} onOlustur={(v) => { silCikti = v; }} />));
    const silCanvas2 = document.querySelector("canvas")!;
    await tikla("Seç / Taşı");
    await pointer(silCanvas2, "pointerdown", 360, 140); await pointer(silCanvas2, "pointerup", 360, 140);
    await act(async () => { document.body.dispatchEvent(new dom.window.KeyboardEvent("keydown", { key: "Delete", bubbles: true })); });
    await tikla("Değişiklikleri Kaydet");
    dogrula(silCikti?.cizimVerisi?.sekiller.length === 1 && silCikti.cizimVerisi.sekiller[0].id === "s1", "Delete tuşu seçili şekli silmedi");
    console.log("✓ Kullanıcı akışı: Seçileni sil düğmesi ve Delete tuşu");
  }

  const tus = async (key: string, ek: Partial<KeyboardEventInit> = {}) => {
    await act(async () => { document.body.dispatchEvent(new dom.window.KeyboardEvent("keydown", { key, bubbles: true, ...ek })); });
  };
  const etiketliTikla = async (etiket: string) => {
    const buton = document.querySelector(`button[aria-label="${etiket}"]`);
    dogrula(buton, `“${etiket}” etiketli düğme bulunamadı`);
    await act(async () => { (buton as HTMLButtonElement).click(); });
  };
  const kesinOlcu = async (etiket: string, deger: string) => {
    const alan = document.querySelector(`input[aria-label="${etiket}"]`) as HTMLInputElement;
    dogrula(alan, `“${etiket}” kesin ölçü alanı yok`);
    await act(async () => { alan.value = deger; alan.dispatchEvent(new dom.window.FocusEvent("focusout", { bubbles: true })); });
  };

  // Madde 12 + 16(2): tuval ölçüsü değişince tuval YENİDEN ÇİZİLMELİ ve
  // Ctrl+Z ölçüyü geri almalı.
  {
    const belge: any = { surum: 1, genislik: 960, yukseklik: 600, sekiller: [
      { id: "t1", tur: "dikdortgen", kalinlik: 2, x: 100, y: 100, w: 120, h: 80 },
    ] };
    await act(async () => root.render(<CizimEditoruModal key="tuval-olcu" baslangicBelgesi={belge} duzenlemeModu onClose={() => {}} onOlustur={() => {}} />));
    const tuval = document.querySelector("canvas")!;
    const silmeler: number[][] = [];
    const eskiClear = sahteCtx.clearRect;
    await dahaFazlaAc();
    sahteCtx.clearRect = (...a: number[]) => { silmeler.push(a); };
    await basligaTikla("1440×900");
    sahteCtx.clearRect = eskiClear;
    dogrula(tuval.width === 1440, "tuval ölçüsü değişmedi");
    dogrula(silmeler.some((a) => a[2] === 1440 && a[3] === 900),
      "tuval ölçüsü değişince yeniden çizilmedi — tarayıcı tuvali sildiği için ekran bembeyaz kalır");
    await tus("z", { ctrlKey: true });
    dogrula(tuval.width === 960, `Ctrl+Z tuval ölçüsünü geri almadı (${tuval.width})`);
    await tus("y", { ctrlKey: true });
    dogrula(tuval.width === 1440, `Ctrl+Y tuval ölçüsünü yinelemedi (${tuval.width})`);
    console.log("✓ Kullanıcı akışı: tuval ölçüsü değişince yeniden çizim + Ctrl+Z/Ctrl+Y ölçüyü geri alır");
  }

  // Madde 12: genişletilmiş tuvalde ok tuşu ve Ctrl+D şekli eski 960×600 sınırına ışınlamamalı.
  {
    let cikti: any = null;
    const belge: any = { surum: 1, genislik: 960, yukseklik: 600, sekiller: [
      { id: "g1", tur: "dikdortgen", kalinlik: 2, x: 100, y: 100, w: 120, h: 80 },
    ] };
    await act(async () => root.render(<CizimEditoruModal key="genis-tus" baslangicBelgesi={belge} duzenlemeModu onClose={() => {}} onOlustur={(v) => { cikti = v; }} />));
    const tuval = document.querySelector("canvas")!;
    await dahaFazlaAc();
    await basligaTikla("1440×900");
    await tikla("Seç / Taşı");
    await pointer(tuval, "pointerdown", 100, 140); await pointer(tuval, "pointerup", 100, 140);
    await kesinOlcu("X", "1250");
    await kesinOlcu("Y", "700");
    await tus("ArrowRight");
    await tus("ArrowDown");
    await tus("d", { ctrlKey: true });
    await act(async () => { await new Promise((r) => setTimeout(r, 5)); });
    await tikla("Değişiklikleri Kaydet");
    const [asil, kopya] = cikti.cizimVerisi.sekiller;
    dogrula(Math.abs(asil.x - 1251) < 0.01 && Math.abs(asil.y - 701) < 0.01,
      `ok tuşu geniş tuvalde şekli eski sınıra ışınladı: (${asil.x}, ${asil.y})`);
    dogrula(kopya && Math.abs(kopya.x - 1267) < 0.01 && Math.abs(kopya.y - 717) < 0.01,
      `Ctrl+D geniş tuvalde kopyayı eski sınıra ışınladı: (${kopya?.x}, ${kopya?.y})`);
    dogrula(cikti.cizimVerisi.genislik === 1440, "kaydedilen belge genişliği yanlış");
    console.log("✓ Kullanıcı akışı: geniş tuvalde ok tuşu ve Ctrl+D güncel tuval sınırını kullanır");
  }

  // Madde 13: Ctrl+D, şablon kaydet/ekle ve taşıma bağlayıcıları korur.
  {
    const fizikBelge = (): any => ({ surum: 1, genislik: 960, yukseklik: 600, sekiller: [
      { id: "k1", tur: "fizik", nesne: "kutle", kalinlik: 2, x: 100, y: 100, w: 80, h: 60 },
      { id: "k2", tur: "fizik", nesne: "kutle", kalinlik: 2, x: 400, y: 100, w: 80, h: 60 },
      { id: "ip", tur: "baglayici", kalinlik: 2, kaynak: { sekilId: "k1" }, hedef: { sekilId: "k2" }, stil: "duz" },
      { id: "v", tur: "baglayici", kalinlik: 2, kaynak: { sekilId: "k1" }, hedef: { x: 140, y: 300 }, stil: "vektor", okUcu: "son" },
    ] });
    const { baglayiciYolu } = await import("../src/modules/sinav-olusturucu/cizim/geometri");
    const baglayicilarSaglam = (sekiller: any[], eskiIdler: string[]) => sekiller
      .filter((s) => s.tur === "baglayici")
      .every((b) => [b.kaynak, b.hedef].every((u: any) => !("sekilId" in u) || (sekiller.some((s) => s.id === u.sekilId) && !eskiIdler.includes(u.sekilId)))
        && baglayiciYolu(sekiller, b) !== null);

    // Ctrl+D: iki cisim seçili → ip ve vektör de kopyalanır, uçlar KOPYALARA bağlanır.
    let cikti: any = null;
    await act(async () => root.render(<CizimEditoruModal key="cogalt-bag" baslangicBelgesi={fizikBelge()} duzenlemeModu onClose={() => {}} onOlustur={(v) => { cikti = v; }} />));
    let tuval = document.querySelector("canvas")!;
    await tikla("Seç / Taşı");
    await pointer(tuval, "pointerdown", 140, 130); await pointer(tuval, "pointerup", 140, 130);
    await pointer(tuval, "pointerdown", 440, 130, true); await pointer(tuval, "pointerup", 440, 130, true);
    await tus("d", { ctrlKey: true });
    await act(async () => { await new Promise((r) => setTimeout(r, 5)); });
    await tikla("Değişiklikleri Kaydet");
    const sonra = cikti.cizimVerisi.sekiller as any[];
    dogrula(sonra.length === 8, `Ctrl+D bağlayıcıları kopyalamadı (${sonra.length} şekil)`);
    const yeniBaglar = sonra.slice(4).filter((s) => s.tur === "baglayici");
    dogrula(yeniBaglar.length === 2 && baglayicilarSaglam(yeniBaglar.concat(sonra.slice(4)), ["k1", "k2"]),
      "kopya bağlayıcılar eski cisimlere bağlı kaldı ya da çizilemiyor");
    console.log("✓ Kullanıcı akışı: Ctrl+D bağlayıcı uçlarını kopyalara bağlar");

    // Taşıma: cisim sürüklenince tek uçlu vektörün serbest ucu da aynı kadar gelir.
    await act(async () => root.render(<CizimEditoruModal key="tasi-vektor" baslangicBelgesi={fizikBelge()} duzenlemeModu onClose={() => {}} onOlustur={(v) => { cikti = v; }} />));
    tuval = document.querySelector("canvas")!;
    await tikla("Seç / Taşı");
    await pointer(tuval, "pointerdown", 140, 130);
    await pointer(tuval, "pointermove", 200, 175);
    await pointer(tuval, "pointerup", 200, 175);
    await tikla("Değişiklikleri Kaydet");
    const tasinmis = cikti.cizimVerisi.sekiller as any[];
    const k1 = tasinmis.find((s) => s.id === "k1"), v = tasinmis.find((s) => s.id === "v");
    const dx = k1.x - 100, dy = k1.y - 100;
    dogrula(Math.abs(dx) > 1 || Math.abs(dy) > 1, "cisim taşınmadı");
    dogrula(Math.abs(v.hedef.x - (140 + dx)) < 0.01 && Math.abs(v.hedef.y - (300 + dy)) < 0.01,
      `vektörün serbest ucu cisimle gelmedi: (${v.hedef.x}, ${v.hedef.y}), cisim (${dx}, ${dy}) kaydı`);
    const ip = tasinmis.find((s) => s.id === "ip");
    dogrula(ip.kaynak.sekilId === "k1" && ip.hedef.sekilId === "k2", "iki cisme bağlı ip bozuldu");
    console.log("✓ Kullanıcı akışı: cisim taşınınca kuvvet vektörünün serbest ucu da taşınır");

    // Şablon: iki cisim + ip + vektör kaydedilir, yeni editörde eklenince teller görünür.
    window.localStorage.removeItem("ogretmen-asistani:cizim-sablonlari:v1");
    await act(async () => root.render(<CizimEditoruModal key="sablon-bag" baslangicBelgesi={fizikBelge()} duzenlemeModu onClose={() => {}} onOlustur={() => {}} />));
    tuval = document.querySelector("canvas")!;
    await tikla("Seç / Taşı");
    await pointer(tuval, "pointerdown", 140, 130); await pointer(tuval, "pointerup", 140, 130);
    await pointer(tuval, "pointerdown", 440, 130, true); await pointer(tuval, "pointerup", 440, 130, true);
    await tiklaTam("Şablon kaydet");
    const uzunAd = "Eğik Düzlem Sürtünmeli Makara 2";
    const adAlani = [...document.querySelectorAll("input")].find((i) => i.parentElement?.textContent?.includes("Şablon adı")) as HTMLInputElement;
    await act(async () => {
      Object.getOwnPropertyDescriptor(dom.window.HTMLInputElement.prototype, "value")?.set?.call(adAlani, uzunAd);
      adAlani.dispatchEvent(new dom.window.Event("input", { bubbles: true }));
    });
    await tiklaTam("Kaydet");
    const kayitli = JSON.parse(window.localStorage.getItem("ogretmen-asistani:cizim-sablonlari:v1") ?? "[]");
    dogrula(kayitli[0]?.ad === uzunAd, `şablon adı kesildi: “${kayitli[0]?.ad}”`);
    dogrula(kayitli[0].sekiller.filter((s: any) => s.tur === "baglayici").length === 2, "şablona bağlayıcılar kaydedilmedi");
    // Eski sürümün kaydettiği biçim: şablon içi kimlikler aynen (k1/k2/ip) — eklerken eşlenmeli.
    window.localStorage.setItem("ogretmen-asistani:cizim-sablonlari:v1", JSON.stringify([
      ...kayitli,
      { id: "eski", ad: "Eski devre", sekiller: fizikBelge().sekiller.slice(0, 3) },
    ]));
    for (const ad of [uzunAd, "Eski devre"]) {
      await act(async () => root.render(<CizimEditoruModal key={`sablon-ekle-${ad}`} onClose={() => {}} onOlustur={(v) => { cikti = v; }} />));
      await kutuphaneKarti("sablonlarim", ad);
      await tikla("Yeni Soru Olarak Ekle");
      const eklenen = cikti.cizimVerisi.sekiller as any[];
      dogrula(eklenen.some((s) => s.tur === "baglayici"), `“${ad}”: bağlayıcı eklenmedi`);
      dogrula(baglayicilarSaglam(eklenen, ["k1", "k2"]), `“${ad}”: şablondaki teller/ipler eklendiği tuvalde kopuk`);
    }
    console.log("✓ Kullanıcı akışı: şablon (32 karakter ad) bağlayıcılarla kaydedilir; eski şablonun telleri eklerken onarılır");
  }

  // Madde 16(3): seçili temel şekle renk ve dolgu; "Siyah"/"Dolgusuz" alanı siler.
  {
    let cikti: any = null;
    const belge: any = { surum: 1, genislik: 640, yukseklik: 400, sekiller: [
      { id: "rd", tur: "dikdortgen", kalinlik: 2, x: 100, y: 100, w: 120, h: 80 },
    ] };
    await act(async () => root.render(<CizimEditoruModal key="renk" baslangicBelgesi={belge} duzenlemeModu onClose={() => {}} onOlustur={(v) => { cikti = v; }} />));
    const tuval = document.querySelector("canvas")!;
    await tikla("Seç / Taşı");
    await pointer(tuval, "pointerdown", 100, 140); await pointer(tuval, "pointerup", 100, 140);
    await etiketliTikla("Renk: Mavi");
    await etiketliTikla("Dolgu: Açık gri");
    await tikla("Değişiklikleri Kaydet");
    dogrula(cikti.cizimVerisi.sekiller[0].renk === "#1d4ed8" && cikti.cizimVerisi.sekiller[0].dolgu === "#e2e8f0", "renk/dolgu belgeye yazılmadı");
    await etiketliTikla("Renk: Siyah");
    await etiketliTikla("Dolgu: Dolgusuz");
    await tikla("Değişiklikleri Kaydet");
    dogrula(!("renk" in cikti.cizimVerisi.sekiller[0]) && !("dolgu" in cikti.cizimVerisi.sekiller[0]), "Siyah/Dolgusuz seçilince alan silinmedi (eski biçim korunmalı)");
    await tus("z", { ctrlKey: true });
    await tikla("Değişiklikleri Kaydet");
    dogrula(cikti.cizimVerisi.sekiller[0].dolgu === "#e2e8f0", "renk/dolgu değişikliği geri alınamıyor");
    console.log("✓ Kullanıcı akışı: temel şekle renk/dolgu, siyah/dolgusuz eski biçime döner, geri alınabilir");
  }

  await act(async () => root.unmount());
  console.log("TÜM KULLANICI AKIŞLARI BAŞARILI");
}

main().catch((hata) => { console.error(hata); process.exit(1); });
