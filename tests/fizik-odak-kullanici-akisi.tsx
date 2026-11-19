// "Sınavhane Fizik": gizli dersler (kimya, akış şeması, Venn…) kütüphanede/aramada YOK;
// ama bu şekilleri içeren eski sınavlar açılır, çizilir, seçilir ve düzenlenir.
// Bu test odak kipini DEĞİŞTİRMEZ (varsayılan: fizik odaklı).

import { createCanvas } from "@napi-rs/canvas";
import { JSDOM } from "jsdom";

function dogrula(kosul: unknown, mesaj: string) {
  if (!kosul) throw new Error(`FİZİK ODAK BAŞARISIZ: ${mesaj}`);
}

async function main() {
  const odak = await import("../src/modules/sinav-olusturucu/odak");
  const { kutuphaneGirdileri, kutuphaneAra, aramaOnerileri, kutuphaneKategorileri } = await import("../src/modules/sinav-olusturucu/cizim/kutuphane");
  const { sekilGecerliMi } = await import("../src/modules/sinav-olusturucu/cizim/sablon");
  const { sekilleriCiz } = await import("../src/modules/sinav-olusturucu/cizim/ciz");
  const { varsayilanKimya } = await import("../src/modules/sinav-olusturucu/cizim/kimya");
  const { SEMA_SABLONLARI } = await import("../src/modules/sinav-olusturucu/cizim/sema");
  const { bosBelgeDurumu } = await import("../src/modules/sinav-olusturucu/belgeDurumu");
  const { sembolGruplariniSuz } = await import("../src/modules/sinav-olusturucu/denklemSemboller");

  dogrula(odak.fizikOdakliMi(), "varsayılan kip fizik odaklı olmalı");

  // ——— 1) Kategoriler ———
  {
    const idler = kutuphaneKategorileri().map((k) => k.id).join();
    dogrula(idler === "sahne,fizik,geometri,matematik,istatistik,sablonlarim", `kategori sırası yanlış: ${idler}`);
    dogrula(kutuphaneKategorileri()[0].ad === "Hazır Fizik Sahneleri", "ilk kategori Hazır Fizik Sahneleri değil");
    for (const gizli of ["kimya", "akis"]) dogrula(!idler.includes(gizli), `gizli kategori sunuluyor: ${gizli}`);
    console.log("✓ fizik odak: yalnız fizik odaklı kategoriler sunuluyor, fizik önde");
  }

  // ——— 2) Kartlar ve arama ———
  {
    const hepsi = kutuphaneGirdileri([]);
    const katlar = new Set(hepsi.map((g) => g.kategori));
    for (const k of ["sahne", "fizik", "geometri", "matematik", "istatistik"]) dogrula(katlar.has(k as never), `görünür kategori boş: ${k}`);
    for (const k of ["kimya", "akis"]) dogrula(!katlar.has(k as never), `gizli kategori kartları sızdı: ${k}`);
    dogrula(!hepsi.some((g) => g.id.startsWith("sema:") || g.id.startsWith("kimya") || g.id.startsWith("akis:")), "gizli kart kimlikleri sızdı");
    dogrula(!hepsi.some((g) => /Coğrafya|Katı cisimler|Kağıt katlama|Benzerlik|Doğruda açılar/.test(g.altBaslik ?? "")), "gizli geometri alt başlıkları sızdı");
    for (const id of ["ist:daire", "ist:histogram", "ist:kutu", "ist:govde", "mat:m-bolge", "mat:m-elips", "geo:g-aciortay", "geo:c-turkiye-bos"]) {
      dogrula(!hepsi.some((g) => g.id === id), `gizli kart sızdı: ${id}`);
    }
    // Korunanlar
    for (const id of ["ist:sutun", "ist:cizgi", "ist:cubuk", "mat:m-parabol", "mat:m-alt-alan", "mat:m-teget", "geo:g-dik-30-60-90", "geo:c-teget", "geo:p-4", "nesne:egikDuzlem", "sahne:egik-kuvvet", "nesne:aciYayi"]) {
      dogrula(hepsi.some((g) => g.id === id), `korunması gereken kart yok: ${id}`);
    }
    // Arama: gizli şeyler dönmez
    const ara = (q: string) => [...aramaOnerileri(q), ...kutuphaneAra(hepsi, q)];
    for (const q of ["venn", "beher", "kimya", "organik", "lewis", "periyodik", "akış", "algoritma", "harita", "izohips", "histogram", "kutu grafiği", "olasılık", "birim çember", "elips", "küp", "katlama", "thales"]) {
      const bulunan = ara(q).filter((g) => !["sablonlarim"].includes(g.kategori));
      const kotu = bulunan.filter((g) => /venn|beher|kimya|organik|lewis|periyodik|akış|harita|izohips|histogram|olasılık|birim çember|elips|katlama|thales|küp/i.test(g.ad) && !/kutu/.test(q));
      dogrula(kotu.length === 0, `“${q}” gizli sonuç döndürdü: ${kotu.map((g) => g.ad).join(", ")}`);
    }
    dogrula(ara("venn").length === 0, "“venn” hiçbir sonuç dönmemeli");
    dogrula(ara("eğik").some((g) => g.id === "nesne:egikDuzlem") && ara("egik").length >= 5, "“eğik” fizik sonuçları dönmedi");
    dogrula(ara("mercek").some((g) => g.kategori === "fizik" || g.kategori === "sahne"), "“mercek” sonuç yok");
    dogrula(ara("makara").some((g) => g.ad === "Makara"), "“makara” sonuç yok");
    dogrula(ara("parabol").length >= 1, "“parabol” sonuç yok");
    // “Çiz:” önerileri
    dogrula(aramaOnerileri("y = x^2 - 4").length === 1, "y=f(x) önerisi çalışmıyor");
    dogrula(aramaOnerileri("0,5; 5,15; 9,15").length === 1, "nokta ifadesi önerisi çalışmıyor");
    dogrula(aramaOnerileri("y = sin(x)").length === 1, "sin(x) önerisi çalışmıyor");
    dogrula(aramaOnerileri("x^2+y^2=25").length === 0, "konik “Çiz:” önerisi gizli olmalı");
    dogrula(aramaOnerileri("y > x + 1").length === 0, "eşitsizlik “Çiz:” önerisi gizli olmalı");
    // Kod silinmedi: gizlilik kapatılınca hepsi var
    const tum = kutuphaneGirdileri([], { gizlilikYok: true });
    dogrula(tum.some((g) => g.kategori === "kimya") && tum.some((g) => g.id === "sema:venn2") && tum.some((g) => g.kategori === "akis"), "gizli kodun kartları üretilemiyor");
    console.log("✓ fizik odak: gizli kart/arama/“Çiz:” önerisi yok; fizik, y=f(x), tablo-sütun, temel geometri var");
  }

  // ——— 3) Varsayılan ders, denklem kısayolları ———
  {
    dogrula(bosBelgeDurumu().baslik.ders === "Fizik", "yeni sınavın varsayılan dersi Fizik değil");
    dogrula(odak.URUN_ADI === "Sınavhane Fizik", "ürün adı yanlış");
    const gruplar = sembolGruplariniSuz("", "operator");
    dogrula(!gruplar.some((g) => /^Kimya/.test(g.baslik)), "kimya sembol grubu görünür");
    console.log("✓ fizik odak: Ders=Fizik, ad, denklem editöründe kimya kısayolu yok");
  }

  // ——— 4) Kayıtlı sınavdaki gizli şekiller geçerli ve çiziliyor ———
  {
    const venn = SEMA_SABLONLARI.find((s) => s.id === "venn2")!;
    const sekiller: any[] = [
      { id: "k1", tur: "fizik", nesne: "kimya", kalinlik: 2, x: 20, y: 20, w: 200, h: 200, kimya: varsayilanKimya() },
      { id: "v1", tur: "fizik", nesne: "sema", kalinlik: 2, x: 260, y: 20, w: 300, h: 200, sema: venn.olustur() },
      { id: "b1", tur: "fizik", nesne: "beher", kalinlik: 2, x: 20, y: 260, w: 80, h: 100 },
      { id: "a1", tur: "akis", akisSekli: "karar", kalinlik: 2, x: 260, y: 260, w: 140, h: 80, metin: "Çift mi?" },
      { id: "h1", tur: "fizik", nesne: "istatistik", kalinlik: 2, x: 420, y: 260, w: 200, h: 140, istatistik: (await import("../src/modules/sinav-olusturucu/cizim/istatistik")).ISTATISTIK_SABLONLARI.find((s) => s.id === "histogram")!.olustur() },
    ];
    for (const s of sekiller) dogrula(sekilGecerliMi(s), `gizli türde kayıtlı şekil geçersiz sayıldı: ${s.id}`);
    // JSON gidiş-dönüş (kayıt/yükleme) sonrası da geçerli
    const yuklenen = JSON.parse(JSON.stringify(sekiller));
    for (const s of yuklenen) dogrula(sekilGecerliMi(s), `kayıt/yükleme sonrası geçersiz: ${s.id}`);
    const c = createCanvas(700, 460);
    const ctx = c.getContext("2d") as unknown as CanvasRenderingContext2D;
    ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, 700, 460);
    for (const s of yuklenen) {
      const c2 = createCanvas(700, 460);
      const x2 = c2.getContext("2d") as unknown as CanvasRenderingContext2D;
      x2.fillStyle = "#fff"; x2.fillRect(0, 0, 700, 460);
      sekilleriCiz(x2, [s]);
      const d = x2.getImageData(0, 0, 700, 460).data;
      let n = 0; for (let i = 0; i < d.length; i += 4) if (d[i] < 200) n++;
      dogrula(n > 50, `gizli türdeki şekil çizilmedi: ${s.id} (${n} piksel)`);
    }
    console.log("✓ fizik odak: kimya / Venn / beher / akış / histogram şekilleri hâlâ geçerli ve çiziliyor");
  }

  // ——— 5) Arayüz: kütüphane paneli ve eski şekillerin düzenlenmesi ———
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
  const root = createRoot(document.getElementById("root")!);
  const yaz = async (el: HTMLInputElement, deger: string) => {
    await act(async () => {
      Object.getOwnPropertyDescriptor(dom.window.HTMLInputElement.prototype, "value")!.set!.call(el, deger);
      el.dispatchEvent(new dom.window.Event("input", { bubbles: true }));
    });
  };
  const pointer = async (tur: string, x: number, y: number) => {
    const canvas = document.querySelector("canvas") as HTMLCanvasElement;
    const olay = new dom.window.MouseEvent(tur, { bubbles: true, clientX: x, clientY: y, detail: 1 });
    Object.defineProperty(olay, "pointerId", { value: 1 });
    await act(async () => { canvas.dispatchEvent(olay); });
  };
  const panelAcik = () => !(document.querySelector('aside[aria-label="Seçili şekil ayarları"]') as HTMLElement).className.includes("hidden");

  {
    await act(async () => root.render(<CizimEditoruModal key="a" onClose={() => {}} onOlustur={() => {}} />));
    const bolumler = [...document.querySelectorAll("section[data-kategori]")].map((s) => s.getAttribute("data-kategori")).join();
    dogrula(bolumler === "sahne,fizik,geometri,matematik,istatistik,sablonlarim", `arayüzde kategoriler yanlış: ${bolumler}`);
    dogrula(document.querySelector('section[data-kategori="sahne"] > button')!.getAttribute("aria-expanded") === "true", "Hazır Fizik Sahneleri varsayılan açık değil");
    dogrula(document.querySelector('section[data-kategori="sahne"] [data-kutuphane-girdisi="sahne:atwood"]'), "fizik sahnesi (Atwood) kartı görünmüyor");
    const arama = document.querySelector('input[aria-label="Şekil veya şablon ara"]') as HTMLInputElement;
    await yaz(arama, "venn");
    dogrula(!document.querySelector("[data-kutuphane-girdisi]"), "“venn” aramasında kart görünüyor");
    await yaz(arama, "eğik");
    dogrula(document.querySelector('[data-kutuphane-girdisi="nesne:egikDuzlem"]'), "“eğik” aramasında Eğik düzlem kartı yok");
    console.log("✓ fizik odak arayüzü: kategoriler, açık fizik sahneleri, venn→boş, eğik→fizik");
  }

  const secVeDogrula = async (anahtar: string, sekil: any, kontrol: () => unknown, ad: string) => {
    const belge: any = { surum: 1, genislik: 960, yukseklik: 600, sekiller: [sekil] };
    await act(async () => root.render(<CizimEditoruModal key={anahtar} baslangicBelgesi={belge} duzenlemeModu onClose={() => {}} onOlustur={() => {}} />));
    await pointer("pointerdown", sekil.x + sekil.w / 2, sekil.y + sekil.h / 2);
    await pointer("pointerup", sekil.x + sekil.w / 2, sekil.y + sekil.h / 2);
    dogrula(document.querySelector('[data-testid="yuzen-arac-cubugu"]') || panelAcik(), `${ad}: seçilemedi`);
    dogrula(kontrol(), `${ad}: düzenleme paneli açılmadı`);
  };
  await secVeDogrula("k", { id: "k1", tur: "fizik", nesne: "kimya", kalinlik: 2, x: 100, y: 100, w: 200, h: 200, kimya: varsayilanKimya() }, () => panelAcik(), "kimya şekli");
  await secVeDogrula("v", { id: "v1", tur: "fizik", nesne: "sema", kalinlik: 2, x: 100, y: 100, w: 300, h: 200, sema: SEMA_SABLONLARI.find((s) => s.id === "venn2")!.olustur() }, () => panelAcik(), "Venn şeması");
  await secVeDogrula("a", { id: "a1", tur: "akis", akisSekli: "surec", kalinlik: 2, x: 100, y: 100, w: 140, h: 60, metin: "İşlem" }, () => document.querySelector('[aria-label="Akış kutusu metni"]'), "akış kutusu");
  console.log("✓ fizik odak arayüzü: eski sınavdaki kimya / Venn / akış şekli seçilip Ayrıntılar ile düzenlenebiliyor");

  console.log("TÜM FİZİK ODAK SENARYOLARI BAŞARILI");
  process.exit(0);
}

main().catch((e) => { console.error(e); process.exit(1); });
