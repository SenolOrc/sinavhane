// v1.2 F ajanı KULLANICI AKIŞI (jsdom + React): hesaplı düzeneklerin sade panelleri
// (eğik düzlem kuvvetleri, optik, sıvı kabı) ve organik yan grup paneli. Panel, şekli
// gerçek editördeki gibi `guncelle` ile değiştirir; çizim veriden yeniden hesaplanır.

import { JSDOM } from "jsdom";

function dogrula(kosul: unknown, mesaj: string) {
  if (!kosul) throw new Error(`KULLANICI AKIŞI BAŞARISIZ: ${mesaj}`);
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

  await import("../src/modules/sinav-olusturucu/cizim/fizik");
  const React = await import("react");
  const { act, useState } = React;
  const { createRoot } = await import("react-dom/client");
  const { FizikSecimPaneli } = await import("../src/modules/sinav-olusturucu/components/FizikPaneli");
  const { OrganikYanGrupPaneli } = await import("../src/modules/sinav-olusturucu/components/KimyaPaneli");
  const { egikKuvvetSekli, optikSekli, siviSekli } = await import("../src/modules/sinav-olusturucu/cizim/fizikSahneSablonlari");
  const { varsayilanEgikKuvvet, egikYerlesim } = await import("../src/modules/sinav-olusturucu/cizim/fizikSahneler");
  const { varsayilanOptik } = await import("../src/modules/sinav-olusturucu/cizim/optik");
  const { sekilGecerliMi } = await import("../src/modules/sinav-olusturucu/cizim/sablon");
  type Sekil = import("../src/modules/sinav-olusturucu/cizim/tipler").Sekil;
  type FizikSekli = Extract<Sekil, { tur: "fizik" }>;
  type Zincir = NonNullable<Extract<import("../src/modules/sinav-olusturucu/cizim/tipler").KimyaVerisi, { tur: "molekul" }>["zincir"]>;

  const root = createRoot(document.getElementById("root")!);
  let son: FizikSekli | null = null;
  function Kabuk({ ilk }: { ilk: FizikSekli }) {
    const [s, setS] = useState(ilk);
    son = s;
    return <FizikSecimPaneli sekil={s} guncelle={(y) => setS((o) => ({ ...o, ...y }))} tarihceyeKaydet={() => {}} />;
  }
  const dugme = (metin: string) => [...document.querySelectorAll("button")].find((b) => b.textContent?.trim() === metin) as HTMLButtonElement | undefined;
  const girdiYaz = async (etiket: string, deger: string) => {
    const el = document.querySelector(`input[aria-label="${etiket}"]`) as HTMLInputElement | null;
    dogrula(el, `"${etiket}" girdisi yok`);
    const ayarla = Object.getOwnPropertyDescriptor(dom.window.HTMLInputElement.prototype, "value")!.set!;
    await act(async () => { ayarla.call(el, deger); el!.dispatchEvent(new dom.window.Event("input", { bubbles: true })); });
  };

  // 1) Eğik düzlem: kütleyi 5 → 10 kg yapınca N oku iki katına çıkar.
  await act(async () => root.render(<Kabuk key="egik" ilk={egikKuvvetSekli(varsayilanEgikKuvvet())} />));
  dogrula(document.querySelector("[data-testid='egik-kuvvet-paneli']"), "eğik düzlem paneli açılmadı");
  const nBoyu = () => { const y = egikYerlesim(son!, son!.kuvvet!); const n = y.oklar.find((o) => o.ad === "N")!; return Math.hypot(n.uc.x - n.bas.x, n.uc.y - n.bas.y); };
  const ilkN = nBoyu();
  await girdiYaz("Kütle (kg)", "10");
  dogrula(son!.kuvvet!.kutle === 10, "kütle güncellenmedi");
  dogrula(Math.abs(nBoyu() / ilkN - 2) < 1e-9, "kütle 2 katına çıkınca N oku 2 kat olmalı");
  dogrula(document.querySelector("[data-testid='egik-kuvvet-ozet']")?.textContent?.includes("mg = 100 N"), "özet yazısı mg = 100 N");
  await act(async () => { dugme("fₛ")!.click(); });
  dogrula(son!.kuvvet!.goster.surtunme && son!.kuvvet!.mu === 0.3, "fₛ açılınca μ = 0,3 varsayılanı");
  dogrula(sekilGecerliMi(son!), "eğik düzlem şekli geçerli kaldı");
  console.log("✓ Eğik düzlem paneli: kütle → oklar orantılı, fₛ");

  // 2) Optik: cisim uzaklığı 5 yapılınca özet sanal, düz, büyük.
  await act(async () => root.render(<Kabuk key="optik" ilk={optikSekli(varsayilanOptik())} />));
  dogrula(document.querySelector("[data-testid='optik-ozet']")?.textContent?.includes("dᵢ = 15"), "do=30: dᵢ = 15");
  await girdiYaz("dₒ", "5");
  const ozet = document.querySelector("[data-testid='optik-ozet']")?.textContent ?? "";
  dogrula(ozet.includes("dᵢ = -10") || ozet.includes("dᵢ = −10"), `do=5: dᵢ = −10 (${ozet})`);
  dogrula(ozet.includes("Sanal, düz, büyük"), "do=5: sanal, düz, büyük");
  await act(async () => { dugme("Kalın kenarlı mercek")!.click(); });
  dogrula(son!.optik!.tur === "kalinMercek", "tür değişti");
  dogrula(dugme("Merkezden geçen"), "mercekte 'Merkezden geçen' ışın düğmesi");
  console.log("✓ Optik paneli: dₒ → görüntü otomatik, tür değişimi");

  // 3) Sıvı: U borusu otomatik h2; kaldırma ve bölmeli türlerine geçiş.
  await act(async () => root.render(<Kabuk key="sivi" ilk={siviSekli({ tur: "uBorusu", d1: 3, d2: 1, h1: 2, h2: 6, otomatik: true })} />));
  await girdiYaz("h₁", "3");
  const h2 = document.querySelector("input[aria-label='h₂']") as HTMLInputElement;
  dogrula(h2.disabled && h2.value === "9", `otomatik h₂ = 9 (gelen ${h2.value})`);
  await act(async () => { dugme("Bölmeli kap")!.click(); });
  dogrula(son!.sivi!.tur === "bolmeli", "bölmeli kaba geçildi");
  const hucre = document.querySelector("button[aria-label='Bölme 1. satır 1. sütun']") as HTMLButtonElement;
  await act(async () => { hucre.click(); });
  dogrula(son!.sivi!.tur === "bolmeli" && son!.sivi!.dolu.includes(0), "bölmeye tıklayınca sıvı eklendi");
  dogrula(sekilGecerliMi(son!), "sıvı kabı şekli geçerli kaldı");
  console.log("✓ Sıvı paneli: U borusu dengesi, bölme tıklama");

  // 4) Organik: bütanın C2'sine −C₂H₅ → 3-metilpentan; halka → sikloalkan.
  let z: Zincir = { n: 4, tur: "alkan", konum: 1 };
  function ZKabuk() {
    const [v, setV] = useState(z);
    z = v;
    return <OrganikYanGrupPaneli z={v} yazZ={(y) => setV((o) => ({ ...o, ...y }))} />;
  }
  await act(async () => root.render(<ZKabuk key="org" />));
  const sec = async (etiket: string, deger: string) => {
    const el = document.querySelector(`select[aria-label="${etiket}"]`) as HTMLSelectElement;
    await act(async () => { el.value = deger; el.dispatchEvent(new dom.window.Event("change", { bubbles: true })); });
  };
  await sec("Yan grubun karbonu", "2");
  await sec("Yan grup", "C2H5");
  await act(async () => { dugme("+ Bağla")!.click(); });
  const ad = document.querySelector("[data-testid='organik-ad']")?.textContent ?? "";
  dogrula(ad.includes("3-metilpentan") && ad.includes("C6H14"), `ad/formül (${ad})`);
  await act(async () => { dugme("Halka (sikloalkan)")!.click(); });
  const ad2 = document.querySelector("[data-testid='organik-ad']")?.textContent ?? "";
  dogrula(z.halka === true && ad2.includes("etilsiklobütan") && ad2.includes("C6H12"), `halka (${ad2})`);
  console.log("✓ Organik yan grup paneli: IUPAC adı ve formül canlı");

  await act(async () => root.unmount());
  console.log("TÜM v1.2 F KULLANICI AKIŞLARI BAŞARILI");
}

main().catch((e) => { console.error(e); process.exit(1); });
