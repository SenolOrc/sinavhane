// v1.2 U: öğretmen dostu çizim arayüzü — JSDOM kullanıcı akışı testleri.
// Sol kütüphane + arama, kendiliğinden Seç'e dönüş, sürekli bağlayıcı kipi,
// bağlantı portları, yüzen araç çubuğu, köşe/nokta tutamaçları, çift tıklama
// baloncuğu, grafik noktası sürükleme, Ctrl+A + Hizala (bağlayıcılı), bölüm 6.

import { JSDOM } from "jsdom";

function dogrula(kosul: unknown, mesaj: string) {
  if (!kosul) throw new Error(`v12-U BAŞARISIZ: ${mesaj}`);
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
  const { kutuphaneGirdileri, kutuphaneAra, aramaOnerileri, kutuphaneAramaAnahtari } = await import("../src/modules/sinav-olusturucu/cizim/kutuphane");
  const { geometriKoseleri } = await import("../src/modules/sinav-olusturucu/cizim/geometriEtkilesim");
  const { grafikNoktaTutamaclari, sekilYatayCevir, baglantiPortlari, balonYerlesimi } = await import("../src/modules/sinav-olusturucu/cizim/etkilesim");
  const { sekilGecerliMi } = await import("../src/modules/sinav-olusturucu/cizim/sablon");
  const { varsayilanUcgen } = await import("../src/modules/sinav-olusturucu/cizim/geometriSekilleri");

  // ——— Saf: çift tıklama balonu şekle değmez, görünür alana sığar ———
  {
    const kesisir = (a: { x: number; y: number; w: number; h: number }, b: { x: number; y: number; w: number; h: number }) =>
      a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
    const gorunur = { x: 0, y: 0, w: 1000, h: 600 };
    const kacin = { x: 400, y: 200, w: 340, h: 260 };
    for (const [nokta, h] of [[{ x: 730, y: 450 }, 560], [{ x: 410, y: 210 }, 300], [{ x: 560, y: 455 }, 200]] as const) {
      const y = balonYerlesimi({ nokta, kacin, gorunur, w: 300, h });
      const kutu = { x: y.left, y: y.top, w: 300, h: Math.min(h, y.maxH) };
      dogrula(!kesisir(kutu, kacin), `balon şekli örtüyor: ${JSON.stringify(kutu)}`);
      dogrula(kutu.x >= 0 && kutu.y >= 0 && kutu.x + kutu.w <= 1000 && kutu.y + kutu.h <= 600, `balon görünür alan dışında: ${JSON.stringify(kutu)}`);
    }
    // Sağda yer yoksa sola açılır; yanlarda yer yoksa alta/üste kısaltılarak (maxH) açılır.
    const sol = balonYerlesimi({ nokta: { x: 900, y: 300 }, kacin: { x: 700, y: 100, w: 250, h: 300 }, gorunur, w: 300, h: 400 });
    dogrula(sol.left + 300 <= 700, `sağda yer yokken sola açılmadı: ${sol.left}`);
    const dar = balonYerlesimi({ nokta: { x: 500, y: 300 }, kacin: { x: 200, y: 60, w: 600, h: 300 }, gorunur, w: 300, h: 560 });
    dogrula(dar.top >= 360 && dar.top + dar.maxH <= 600 && dar.maxH < 560, `dar alanda balon alta kısaltılarak açılmadı: ${JSON.stringify(dar)}`);
    console.log("✓ v12-U: yerinde düzenleme balonu şekle değmez, görünür alana sığar (gerekirse kaydırmalı)");
  }

  // ——— Saf: kütüphane toplayıcısı ve arama ———
  {
    const hepsi = kutuphaneGirdileri([]);
    dogrula(hepsi.length > 150, `kütüphane çok az girdi topladı (${hepsi.length})`);
    const kategoriler = new Set(hepsi.map((g) => g.kategori));
    for (const k of ["sahne", "geometri", "matematik", "istatistik", "fizik", "kimya", "akis"]) dogrula(kategoriler.has(k as never), `kategori boş: ${k}`);
    dogrula(new Set(hepsi.map((g) => g.id)).size === hepsi.length, "kütüphane kimlikleri benzersiz değil");
    dogrula(kutuphaneAramaAnahtari("EĞİK Düzlem") === "egik duzlem", "Türkçe katlama yanlış");
    const ilk = (q: string) => kutuphaneAra(hepsi, q).map((g) => g.ad);
    dogrula(ilk("egik duzlem").some((a) => /eğik düzlem/i.test(a)), "“egik duzlem” eğik düzlemi bulmadı");
    dogrula(ilk("MAKARA").some((a) => a === "Makara"), "büyük harfle “MAKARA” bulunamadı");
    dogrula(ilk("beher")[0] === "Beher", `“beher” ilk sonuç Beher değil (${ilk("beher")[0]})`);
    dogrula(ilk("venn").length >= 2, "“venn” şemaları bulunamadı");
    dogrula(ilk("palanga").length >= 1, "“palanga” anahtar kelimesiyle sonuç yok");
    dogrula(ilk("parabol").length >= 1, "“parabol” sonuç yok");
    dogrula(ilk("pil").includes("Pil / Üreteç"), "“pil” Pil / Üreteç'i bulmadı");
    dogrula(ilk("zzqq").length === 0, "anlamsız arama sonuç döndürdü");
    const oneri = aramaOnerileri("y = x^2 - 4");
    dogrula(oneri.length === 1 && oneri[0].ekle().tur === "fizik", "yazılan ifade için “Çiz” önerisi yok");
    dogrula(aramaOnerileri("makara").length === 0, "düz sözcük ifade sanıldı");
    const sablonlu = kutuphaneGirdileri([{ id: "s1", ad: "Benim düzeneğim", sekiller: [{ id: "a", tur: "dikdortgen", kalinlik: 2, x: 0, y: 0, w: 10, h: 10 }] } as never]);
    dogrula(sablonlu.some((g) => g.kategori === "sablonlarim" && g.ad === "Benim düzeneğim"), "kullanıcı şablonu kütüphaneye girmedi");
    // Geometri şablonu eklerken `geo` verisi de gelir.
    const dik = hepsi.find((g) => g.kategori === "geometri" && g.ad.startsWith("Dik üçgen"));
    const e = dik?.ekle();
    dogrula(e && e.tur === "fizik" && e.ek?.geo, "geometri şablonu geo verisi taşımıyor");
    console.log("✓ v12-U: kütüphane toplayıcısı, Türkçe duyarsız arama, yazarak çiz önerisi");
  }

  // ——— Saf: bölüm 6 (sablon.ts renk/dolgu), yatay çevir, portlar ———
  {
    const temel = { id: "r", tur: "dikdortgen", kalinlik: 2, x: 0, y: 0, w: 10, h: 10 };
    dogrula(sekilGecerliMi({ ...temel, renk: "#1d4ed8", dolgu: "#e2e8f0" }), "geçerli renk/dolgu reddedildi");
    dogrula(sekilGecerliMi(temel), "renk/dolgusuz eski şekil reddedildi");
    dogrula(!sekilGecerliMi({ ...temel, renk: "url(javascript:1)" }), "geçersiz renk kabul edildi");
    dogrula(!sekilGecerliMi({ ...temel, dolgu: 5 }), "sayı dolgu kabul edildi");
    const u = sekilYatayCevir({ id: "u", tur: "ucgen", kalinlik: 2, x1: 0, y1: 0, x2: 10, y2: 20, x3: 40, y3: 20 } as never) as { x1: number; x3: number };
    dogrula(u.x1 === 40 && u.x3 === 0, "üçgen yatay çevrilmedi");
    const f = sekilYatayCevir({ id: "f", tur: "fizik", nesne: "pil", kalinlik: 2, x: 0, y: 0, w: 10, h: 10, donus: 30 } as never) as { ayna?: boolean; donus?: number };
    dogrula(f.ayna === true && f.donus === 330, "fizik nesnesi aynalanıp dönüşü ters çevrilmedi");
    const p = baglantiPortlari({ id: "k", tur: "fizik", nesne: "kutle", kalinlik: 2, x: 100, y: 100, w: 80, h: 60 } as never);
    dogrula(p.length === 4 && p[0].yon === "ust" && p[1].yon === "sag" && p[1].x === 180 && p[1].y === 130, "port konumları/yönleri yanlış");
    dogrula(baglantiPortlari({ id: "g", tur: "fizik", nesne: "grafik", kalinlik: 2, x: 0, y: 0, w: 10, h: 10 } as never).length === 0, "grafikte port olmamalı");
    console.log("✓ v12-U: sekilGecerliMi renk/dolgu, yatay çevir, bağlantı portları");
  }

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

  // ——— 1) Arama + ardı ardına ekleme (kütüphane açık kalır) ———
  {
    let cikti: any = null;
    await act(async () => root.render(<CizimEditoruModal key="k1" onClose={() => {}} onOlustur={(v) => { cikti = v; }} />));
    const arama = document.querySelector('input[aria-label="Şekil veya şablon ara"]') as HTMLInputElement;
    dogrula(arama, "kütüphane arama kutusu yok");
    for (const [sorgu, ad] of [["pil", "Pil / Üreteç"], ["direnc", "Direnç"], ["AMPERMETRE", "Ampermetre"]] as const) {
      await yaz(arama, sorgu);
      await etiketliTikla(`Ekle: ${ad}`);
      await bekle();
      dogrula(document.querySelector('input[aria-label="Şekil veya şablon ara"]'), "karta tıklayınca kütüphane kapandı");
    }
    dogrula(sekilSayisi() === 3, `ardı ardına 3 eleman eklenmedi (${sekilSayisi()})`);
    dogrula(etiketli("Seç / Taşı")?.getAttribute("aria-pressed") === "true", "eklemeden sonra araç Seç değil");
    dogrula(document.querySelector('[data-testid="yuzen-arac-cubugu"]'), "son eklenen seçili gelmedi / yüzen çubuk yok");
    dogrula(!panelAcik(), "basit fizik nesnesinde ayrıntılı panel kendiliğinden açıldı");
    await metinliTikla("Yeni Soru Olarak Ekle");
    dogrula(cikti.cizimVerisi.sekiller.map((s: any) => s.nesne).join() === "pil,direnc,ampermetre", "eklenen nesneler yanlış");
    console.log("✓ v12-U: aramayla ardı ardına Pil + Direnç + Ampermetre, kütüphane açık kalıyor");
  }

  // ——— 2) Çizim bitince Seç'e dönülür; Esc aracı bırakır, modalı kapatmaz ———
  {
    let kapandi = false;
    await act(async () => root.render(<CizimEditoruModal key="k2" onClose={() => { kapandi = true; }} onOlustur={() => {}} />));
    await etiketliTikla("Dikdörtgen");
    await surukle(100, 100, 220, 180);
    await bekle();
    dogrula(sekilSayisi() === 1, "dikdörtgen çizilmedi");
    dogrula(etiketli("Seç / Taşı")?.getAttribute("aria-pressed") === "true", "çizimden sonra araç Seç'e dönmedi");
    await etiketliTikla("Silgi");
    await tus("Escape");
    dogrula(etiketli("Seç / Taşı")?.getAttribute("aria-pressed") === "true" && !kapandi, "Esc aracı bırakmadı ya da modalı kapattı");
    console.log("✓ v12-U: çizim bitince Seç'e dönüş, Esc aracı bırakır");
  }

  // ——— 3) Sürekli bağlayıcı kipi + akıllı tür + sürükle-bağla ———
  {
    let cikti: any = null;
    const belge: any = { surum: 1, genislik: 960, yukseklik: 600, sekiller: [
      { id: "p", tur: "fizik", nesne: "pil", kalinlik: 2, x: 100, y: 100, w: 80, h: 44 },
      { id: "r", tur: "fizik", nesne: "direnc", kalinlik: 2, x: 400, y: 100, w: 100, h: 34 },
      { id: "a", tur: "fizik", nesne: "ampermetre", kalinlik: 2, x: 400, y: 300, w: 90, h: 44 },
      { id: "k", tur: "fizik", nesne: "kutle", kalinlik: 2, x: 100, y: 400, w: 90, h: 60 },
    ] };
    await act(async () => root.render(<CizimEditoruModal key="k3" baslangicBelgesi={belge} duzenlemeModu onClose={() => {}} onOlustur={(v) => { cikti = v; }} />));
    await etiketliTikla("Ok / Bağlayıcı");
    await tikla(140, 122); await tikla(450, 117);      // pil → direnç (iki tık)
    await surukle(450, 117, 445, 322);                   // direnç → ampermetre (sürükle-bırak)
    dogrula(etiketli("Ok / Bağlayıcı")?.getAttribute("aria-pressed") === "true", "bağlayıcı kurulunca araç bırakıldı (sürekli kip olmalı)");
    await surukle(145, 430, 300, 500);                   // kütle → boşluk (serbest uç)
    await tus("Escape");
    dogrula(etiketli("Seç / Taşı")?.getAttribute("aria-pressed") === "true", "Esc bağlayıcı kipinden çıkarmadı");
    await metinliTikla("Değişiklikleri Kaydet");
    const baglar = cikti.cizimVerisi.sekiller.filter((s: any) => s.tur === "baglayici");
    dogrula(baglar.length === 3, `3 bağlayıcı bekleniyordu (${baglar.length})`);
    const pr = baglar.find((b: any) => b.kaynak.sekilId === "p" && b.hedef.sekilId === "r");
    dogrula(pr && pr.okUcu === "yok" && pr.stil === undefined, `iki devre elemanı arası otomatik “devre teli” olmalı: ${JSON.stringify(pr)}`);
    dogrula(baglar.some((b: any) => b.kaynak.sekilId === "r" && b.hedef.sekilId === "a"), "sürükle-bırak ile bağlanmadı");
    const serbest = baglar.find((b: any) => b.kaynak.sekilId === "k");
    dogrula(serbest && "x" in serbest.hedef && serbest.stil === "duz" && serbest.okUcu === "son", `boşluğa çekilen ok düz ok olmalı: ${JSON.stringify(serbest)}`);
    console.log("✓ v12-U: sürekli bağlayıcı kipi, akıllı tür (devre teli/düz ok), sürükle-bırak, Esc");
  }

  // ——— 4) Port: seçili kütlenin sağ portundan öteki kütleye sürükle ———
  {
    let cikti: any = null;
    const belge: any = { surum: 1, genislik: 960, yukseklik: 600, sekiller: [
      { id: "k1", tur: "fizik", nesne: "kutle", kalinlik: 2, x: 100, y: 100, w: 80, h: 60 },
      { id: "k2", tur: "fizik", nesne: "kutle", kalinlik: 2, x: 400, y: 100, w: 80, h: 60 },
    ] };
    await act(async () => root.render(<CizimEditoruModal key="k4" baslangicBelgesi={belge} duzenlemeModu onClose={() => {}} onOlustur={(v) => { cikti = v; }} />));
    await tikla(140, 100); // kenarından seç
    await bekle();
    await surukle(180, 130, 430, 130); // sağ port (180,130) → k2
    await metinliTikla("Değişiklikleri Kaydet");
    const b = cikti.cizimVerisi.sekiller.find((s: any) => s.tur === "baglayici");
    dogrula(b && b.kaynak.sekilId === "k1" && b.kaynak.yon === "sag" && b.hedef.sekilId === "k2", `porttan bağlayıcı kurulmadı: ${JSON.stringify(b)}`);
    dogrula(cikti.cizimVerisi.sekiller.find((s: any) => s.id === "k1").x === 100, "porttan sürükleme kütleyi taşıdı");
    console.log("✓ v12-U: bağlantı portundan sürükleyerek bağlama");
  }

  // ——— 5) Yüzen araç çubuğu: renk, çevir, 90°, çoğalt, sil ———
  {
    let cikti: any = null;
    const belge: any = { surum: 1, genislik: 640, yukseklik: 400, sekiller: [
      { id: "u", tur: "ucgen", kalinlik: 2, x1: 100, y1: 100, x2: 120, y2: 200, x3: 260, y3: 200 },
    ] };
    await act(async () => root.render(<CizimEditoruModal key="k5" baslangicBelgesi={belge} duzenlemeModu onClose={() => {}} onOlustur={(v) => { cikti = v; }} />));
    await tikla(190, 200);
    dogrula(document.querySelector('[data-testid="yuzen-arac-cubugu"]'), "yüzen araç çubuğu çıkmadı");
    await etiketliTikla("Renk");
    const mavi = document.querySelector('[data-testid="yuzen-arac-cubugu"] button[aria-label="Renk: Mavi"]') as HTMLButtonElement;
    dogrula(mavi, "yüzen çubukta renk paleti yok");
    await act(async () => { mavi.click(); });
    await etiketliTikla("Yatay çevir");
    await etiketliTikla("90° döndür");
    await metinliTikla("Değişiklikleri Kaydet");
    const s = cikti.cizimVerisi.sekiller[0];
    dogrula(s.renk === "#1d4ed8" && s.x1 === 260 && s.x3 === 100 && s.donus === 90, `yüzen çubuk işlemleri uygulanmadı: ${JSON.stringify(s)}`);
    await etiketliTikla("Çoğalt");
    await bekle();
    dogrula(sekilSayisi() === 2, "yüzen çubukta Çoğalt çalışmadı");
    await etiketliTikla("Sil");
    dogrula(sekilSayisi() === 1, "yüzen çubukta Sil çalışmadı");
    await tus("z", { ctrlKey: true });
    dogrula(sekilSayisi() === 2, "Sil geri alınamadı");
    console.log("✓ v12-U: yüzen araç çubuğu (renk, çevir, 90°, çoğalt, sil, geri al)");
  }

  // ——— 6) Karmaşık nesne ayrıntılı paneli kendiliğinden açar; grafik noktası sürükleme ———
  {
    let cikti: any = null;
    const belge: any = { surum: 1, genislik: 960, yukseklik: 600, sekiller: [
      { id: "g", tur: "fizik", nesne: "grafik", kalinlik: 2, x: 100, y: 100, w: 300, h: 200,
        grafik: { egriler: [{ tur: "noktalar", noktalar: [{ x: 0, y: 0 }, { x: 4, y: 20 }, { x: 8, y: 20 }, { x: 10, y: 0 }], renk: "#2563eb" }], xEtiket: "t (s)", yEtiket: "v (m/s)" } },
    ] };
    await act(async () => root.render(<CizimEditoruModal key="k6" baslangicBelgesi={belge} duzenlemeModu onClose={() => {}} onOlustur={(v) => { cikti = v; }} />));
    await tikla(100, 200); // sol kenar
    await bekle();
    dogrula(panelAcik(), "grafik seçilince ayrıntılı panel kendiliğinden açılmadı");
    const t = grafikNoktaTutamaclari(belge.sekiller[0]);
    dogrula(t.length === 4, "grafikte 4 köşe tutamacı olmalı");
    const ikinci = t[1];
    // (4,20) noktasını yukarı-sağa sürükle; değer eksen adımına yakalanmalı.
    await surukle(ikinci.x, ikinci.y, ikinci.x + 31, ikinci.y - 7);
    await metinliTikla("Değişiklikleri Kaydet");
    const gr = cikti.cizimVerisi.sekiller[0].grafik;
    const p = gr.egriler[0].noktalar[1];
    dogrula(p.x !== 4 || p.y !== 20, `grafik noktası sürüklenmedi: ${JSON.stringify(p)}`);
    dogrula(Number.isInteger(p.x) && p.x >= 4 && p.x <= 8, `x eksen adımına yakalanmadı/komşuyu geçti: ${p.x}`);
    dogrula(p.y % 5 === 0, `y eksen adımına yakalanmadı: ${p.y}`);
    dogrula(gr.xMin === undefined && gr.yMax === undefined, "sürükleme sonrası pencere otomatiğe dönmedi");
    console.log("✓ v12-U: grafik seçilince panel açılır; köşe noktası sürüklenir, eksen adımına yakalanır");
  }

  // ——— 7) Üçgen köşe tutamacı + çift tıklama baloncuğu (kenar / köşe) ———
  {
    let cikti: any = null;
    const ucgen: any = { id: "t", tur: "fizik", nesne: "ucgenABC", kalinlik: 2, x: 100, y: 100, w: 220, h: 170, geo: varsayilanUcgen() };
    const belge: any = { surum: 1, genislik: 960, yukseklik: 600, sekiller: [ucgen] };
    await act(async () => root.render(<CizimEditoruModal key="k7" baslangicBelgesi={belge} duzenlemeModu onClose={() => {}} onOlustur={(v) => { cikti = v; }} />));
    const K = geometriKoseleri(ucgen);
    const [A, B, C] = K;
    await tikla((B.x + C.x) / 2, (B.y + C.y) / 2); // BC kenarına tıkla → seç
    await bekle();
    dogrula(panelAcik(), "geometri şekli seçilince ayrıntılı panel açılmadı");
    await surukle(A.x, A.y, A.x + 40, A.y - 20);
    await metinliTikla("Değişiklikleri Kaydet");
    let geo = cikti.cizimVerisi.sekiller[0].geo;
    dogrula(geo.mod === "serbest", `köşe sürükleyince üçgen serbest moda geçmedi: ${geo.mod}`);
    const yeniA = geometriKoseleri(cikti.cizimVerisi.sekiller[0])[0];
    dogrula(Math.hypot(yeniA.x - (A.x + 40), yeniA.y - (A.y - 20)) < 3, `A köşesi imlecin altına gelmedi (${yeniA.x},${yeniA.y})`);
    // Kenar BC'ye çift tıkla → etiket + tırtık.
    const K2 = geometriKoseleri(cikti.cizimVerisi.sekiller[0]);
    await ciftTikla((K2[1].x + K2[2].x) / 2, (K2[1].y + K2[2].y) / 2);
    const kenar = document.querySelector('input[aria-label="Kenar etiketi"]') as HTMLInputElement;
    dogrula(kenar, "kenara çift tıklayınca baloncuk açılmadı");
    await yaz(kenar, "5 cm");
    await etiketliTikla("Eş kenar tırtığı: 2");
    await etiketliTikla("Kapat");
    // Köşe A'ya çift tıkla → açı etiketi + dik açı.
    await ciftTikla(K2[0].x, K2[0].y);
    const aci = document.querySelector('input[aria-label="Açı etiketi"]') as HTMLInputElement;
    dogrula(aci, "köşeye çift tıklayınca açı baloncuğu açılmadı");
    await yaz(aci, "α");
    await metinliTikla("Dik açı ∟");
    await tus("Escape");
    dogrula(!document.querySelector('[data-testid="yerinde-duzenle"]'), "Esc baloncuğu kapatmadı");
    await metinliTikla("Değişiklikleri Kaydet");
    geo = cikti.cizimVerisi.sekiller[0].geo;
    dogrula(geo.kenarlar[0] === "5 cm" && geo.esKenar[0] === 2, `kenar etiketi/tırtığı yazılmadı: ${JSON.stringify(geo.kenarlar)} ${JSON.stringify(geo.esKenar)}`);
    dogrula(geo.acilar[0] === "α" && geo.aciIsareti[0] === "dik", `açı etiketi/işareti yazılmadı: ${JSON.stringify(geo.acilar)} ${JSON.stringify(geo.aciIsareti)}`);
    // Baloncuk değişikliği TEK geri alma adımı.
    await tus("z", { ctrlKey: true });
    await metinliTikla("Değişiklikleri Kaydet");
    geo = cikti.cizimVerisi.sekiller[0].geo;
    dogrula(geo.acilar[0] !== "α" && geo.kenarlar[0] === "5 cm", "baloncuk değişikliği tek adımda geri alınmadı");
    console.log("✓ v12-U: üçgen köşesi sürüklenir; kenar/köşeye çift tıklayınca etiket, tırtık, açı işareti yazılır");
  }

  // ——— 8) Akış kutusu ve fizik nesnesinde çift tıklayıp yerinde yaz ———
  {
    let cikti: any = null;
    const belge: any = { surum: 1, genislik: 960, yukseklik: 600, sekiller: [
      { id: "a1", tur: "akis", akisSekli: "surec", kalinlik: 2, x: 100, y: 100, w: 180, h: 80, metin: "İşlem" },
      { id: "m", tur: "fizik", nesne: "kutle", kalinlik: 2, x: 400, y: 100, w: 90, h: 60, etiket: "m" },
    ] };
    await act(async () => root.render(<CizimEditoruModal key="k8" baslangicBelgesi={belge} duzenlemeModu onClose={() => {}} onOlustur={(v) => { cikti = v; }} />));
    await ciftTikla(100, 140);
    const kutu = document.querySelector('textarea[aria-label="Kutu metni"]') as HTMLTextAreaElement;
    dogrula(kutu, "akış kutusuna çift tıklayınca metin baloncuğu açılmadı");
    await yaz(kutu, "Toplamı yazdır");
    await etiketliTikla("Kapat");
    await ciftTikla(400, 130);
    const et = document.querySelector('input[aria-label="Şekil etiketi"]') as HTMLInputElement;
    dogrula(et, "fizik nesnesine çift tıklayınca etiket baloncuğu açılmadı");
    await yaz(et, "m_1");
    await etiketliTikla("Kapat");
    await metinliTikla("Değişiklikleri Kaydet");
    const [a1, m] = cikti.cizimVerisi.sekiller;
    dogrula(a1.metin === "Toplamı yazdır" && m.etiket === "m_1", `yerinde düzenleme yazılmadı: ${a1.metin} / ${m.etiket}`);
    console.log("✓ v12-U: akış kutusu ve fizik etiketi çift tıklayıp yerinde düzenlenir");
  }

  // ——— 9) Ctrl+A (bağlayıcılar da seçili) + Hizala/Dağıt bozulmamalı ———
  {
    let cikti: any = null;
    const belge: any = { surum: 1, genislik: 960, yukseklik: 600, sekiller: [
      { id: "d1", tur: "dikdortgen", kalinlik: 2, x: 60, y: 100, w: 60, h: 50 },
      { id: "d2", tur: "akis", akisSekli: "surec", kalinlik: 2, x: 300, y: 200, w: 100, h: 60, metin: "x" },
      { id: "d3", tur: "akis", akisSekli: "surec", kalinlik: 2, x: 600, y: 300, w: 100, h: 60, metin: "y" },
      { id: "b", tur: "baglayici", kalinlik: 2, kaynak: { sekilId: "d2" }, hedef: { sekilId: "d3" } },
    ] };
    await act(async () => root.render(<CizimEditoruModal key="k9" baslangicBelgesi={belge} duzenlemeModu onClose={() => {}} onOlustur={(v) => { cikti = v; }} />));
    await tus("a", { ctrlKey: true });
    dogrula(document.body.textContent?.includes("4 şekil seçili"), "Ctrl+A tümünü seçmedi");
    await metinliTikla("Hizala");
    await metinliTikla("Sola hizala");
    await metinliTikla("Değişiklikleri Kaydet");
    let s = cikti.cizimVerisi.sekiller;
    dogrula(s.filter((x: any) => x.tur !== "baglayici").every((x: any) => Math.abs(x.x - 60) < 4), `sola hizalama bağlayıcıyla bozuldu: ${s.map((x: any) => x.x).join()}`);
    await metinliTikla("Hizala");
    await metinliTikla("Dikey dağıt");
    await metinliTikla("Değişiklikleri Kaydet");
    s = cikti.cizimVerisi.sekiller;
    const ys = s.filter((x: any) => x.tur !== "baglayici").map((x: any) => x.y + x.h / 2).sort((a: number, b: number) => a - b);
    dogrula(ys.every((y: number) => y > 0 && y < 600) && Math.abs((ys[1] - ys[0]) - (ys[2] - ys[1])) < 1, `dağıtma bağlayıcıyla bozuldu: ${ys.join()}`);
    console.log("✓ v12-U: Ctrl+A ile bağlayıcı seçiliyken Hizala/Dağıt doğru");
  }

  // ——— 10) Bölüm 6: dışarıya bağlı bağlayıcı kopyalanınca eski şekle bağlanmaz ———
  {
    let cikti: any = null;
    const belge: any = { surum: 1, genislik: 960, yukseklik: 600, sekiller: [
      { id: "k1", tur: "fizik", nesne: "kutle", kalinlik: 2, x: 100, y: 100, w: 80, h: 60 },
      { id: "k2", tur: "fizik", nesne: "kutle", kalinlik: 2, x: 400, y: 100, w: 80, h: 60 },
      { id: "ip", tur: "baglayici", kalinlik: 2, kaynak: { sekilId: "k1" }, hedef: { sekilId: "k2" }, stil: "duz" },
    ] };
    await act(async () => root.render(<CizimEditoruModal key="k10" baslangicBelgesi={belge} duzenlemeModu onClose={() => {}} onOlustur={(v) => { cikti = v; }} />));
    await tikla(140, 100);
    await tus("a", { ctrlKey: false });
    await tus("d", { ctrlKey: true });
    await bekle();
    await metinliTikla("Değişiklikleri Kaydet");
    const s = cikti.cizimVerisi.sekiller as any[];
    const yeniIpler = s.slice(3).filter((x) => x.tur === "baglayici");
    dogrula(yeniIpler.every((b) => !("sekilId" in b.hedef && b.hedef.sekilId === "k2") && !("sekilId" in b.kaynak && b.kaynak.sekilId === "k1")),
      `kopya bağlayıcı seçim dışındaki eski şekle bağlı kaldı: ${JSON.stringify(yeniIpler)}`);
    console.log("✓ v12-U: bölüm 6 — dışarıya bağlı bağlayıcı kopyada eski şekle bağlanmıyor");
  }

  // ——— 11) Hazır soru sahnesi tek tıkla, bağlayıcılarıyla eklenir ———
  {
    let cikti: any = null;
    await act(async () => root.render(<CizimEditoruModal key="k11" onClose={() => {}} onOlustur={(v) => { cikti = v; }} />));
    await kategoriAc("sahne");
    const kart = document.querySelector('section[data-kategori="sahne"] button[aria-label^="Ekle: "]') as HTMLButtonElement;
    dogrula(kart, "Hazır Soru Sahneleri kategorisinde kart yok");
    await act(async () => { kart.click(); });
    await bekle();
    dogrula(sekilSayisi() >= 1, "sahne eklenmedi");
    await metinliTikla("Yeni Soru Olarak Ekle");
    const s = cikti.cizimVerisi.sekiller as any[];
    const idler = new Set(s.map((x) => x.id));
    dogrula(s.filter((x) => x.tur === "baglayici").every((b) => [b.kaynak, b.hedef].every((u: any) => !("sekilId" in u) || idler.has(u.sekilId))), "sahnenin bağlayıcıları kopuk");
    console.log("✓ v12-U: hazır soru sahnesi tek tıkla eklenir, bağlayıcıları sağlam");
  }

  await act(async () => root.unmount());
  console.log("TÜM v12-U KULLANICI AKIŞLARI BAŞARILI");
}

main().catch((hata) => { console.error(hata); process.exit(1); });
