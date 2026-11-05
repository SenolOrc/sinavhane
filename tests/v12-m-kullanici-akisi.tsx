// v1.2 (M ajanı) kullanıcı akışı: mini tablolar (grafik noktaları, adlı noktalar, enerji düzeyleri,
// olasılık ağacı), örnek çipleri, yeni şema panelleri (birim çember, işaret tablosu, fonksiyon şeması,
// Venn düzenleri). Paneller doğrudan (modal olmadan) render edilir; şekil durumu testte tutulur.

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
    Node: dom.window.Node, MouseEvent: dom.window.MouseEvent, KeyboardEvent: dom.window.KeyboardEvent, Event: dom.window.Event,
    IS_REACT_ACT_ENVIRONMENT: true,
  })) Object.defineProperty(g, ad, { value: deger, configurable: true });
  const sahteCtx = new Proxy({} as Record<string, unknown>, {
    get(h, ad: string) { if (ad === "measureText") return (m: string) => ({ width: [...m].length * 8 }); if (ad in h) return h[ad]; return () => undefined; },
    set(h, ad: string, d) { h[ad] = d; return true; },
  });
  Object.defineProperty(dom.window.HTMLCanvasElement.prototype, "getContext", { value: () => sahteCtx });

  const React = await import("react");
  const { act, useState } = React;
  const { createRoot } = await import("react-dom/client");
  const { SemaPaneli, MatematikSeridi } = await import("../src/modules/sinav-olusturucu/components/MatematikPaneli");
  const { GrafikSecimPaneli } = await import("../src/modules/sinav-olusturucu/components/GrafikPaneli");
  const { EnerjiTablolari, gecisleriKaydir, enerjiDuzeyleriYaz } = await import("../src/modules/sinav-olusturucu/components/EnerjiDuzeyTablosu");
  const { SEMA_SABLONLARI } = await import("../src/modules/sinav-olusturucu/cizim/sema");
  const { HIZLI_FONKSIYON_ORNEKLERI } = await import("../src/modules/sinav-olusturucu/components/GrafikPaneli");
  const { hizliMatematik } = await import("../src/modules/sinav-olusturucu/cizim/grafik");
  const { enerjiDuzeyleriOku } = await import("../src/modules/sinav-olusturucu/cizim/fizikEk");
  type Sekil = import("../src/modules/sinav-olusturucu/cizim/tipler").Sekil;
  type F = Extract<Sekil, { tur: "fizik" }>;

  const root = createRoot(document.getElementById("root")!);
  const girdiAyarla = Object.getOwnPropertyDescriptor(dom.window.HTMLInputElement.prototype, "value")!.set!;
  const secimAyarla = Object.getOwnPropertyDescriptor(dom.window.HTMLSelectElement.prototype, "value")!.set!;
  const yaz = async (el: Element | null, deger: string) => {
    dogrula(el, "girdi bulunamadı");
    // Gerçek kullanımdaki gibi önce kutuya odaklanılır (önceki kutu odağı bırakır).
    await act(async () => { (el as HTMLElement).focus(); });
    await act(async () => { girdiAyarla.call(el, deger); el!.dispatchEvent(new dom.window.Event("input", { bubbles: true })); });
  };
  const sec = async (el: Element | null, deger: string) => {
    dogrula(el, "seçim kutusu bulunamadı");
    await act(async () => { (el as HTMLElement).focus(); });
    await act(async () => { secimAyarla.call(el, deger); el!.dispatchEvent(new dom.window.Event("change", { bubbles: true })); });
  };
  const tikla = async (el: Element | null | undefined, ne = "düğme") => {
    dogrula(el, `${ne} bulunamadı`);
    await act(async () => { (el as HTMLElement).click(); });
  };
  const dugme = (metin: string) => [...document.querySelectorAll("button")].find((b) => b.textContent?.trim() === metin);
  const etiketli = (s: string) => document.querySelector(`[aria-label="${s}"]`);
  const tus = async (el: Element | null, key: string) => {
    await act(async () => { el!.dispatchEvent(new dom.window.KeyboardEvent("keydown", { key, bubbles: true })); });
  };

  let sekil: F;
  let tarihce = 0;
  function Sarmal({ ilk, Panel }: { ilk: F; Panel: (p: { sekil: F; guncelle: (y: Partial<F>) => void; tarihceyeKaydet: () => void }) => JSX.Element | null }) {
    const [s, setS] = useState(ilk);
    sekil = s;
    return <Panel sekil={s} guncelle={(y) => setS((o) => ({ ...o, ...y }))} tarihceyeKaydet={() => { tarihce += 1; }} />;
  }
  const semaSekli = (id: string): F => ({ id: "s", tur: "fizik", nesne: "sema", kalinlik: 3, x: 0, y: 0, w: 300, h: 200, sema: SEMA_SABLONLARI.find((x) => x.id === id)!.olustur() });

  // ── 1) Grafik noktaları mini tablosu ──
  const grafikSekli: F = { id: "g", tur: "fizik", nesne: "grafik", kalinlik: 3, x: 0, y: 0, w: 300, h: 200, grafik: { egriler: [{ tur: "noktalar", noktalar: [{ x: 0, y: 0 }, { x: 4, y: 20 }] }], xEtiket: "t (s)", yEtiket: "v (m/s)" } };
  await act(async () => root.render(<Sarmal key="g1" ilk={grafikSekli} Panel={GrafikSecimPaneli} />));
  dogrula(document.querySelector('[data-testid="grafik-nokta-tablosu"]'), "nokta tablosu görünmeli");
  dogrula(document.querySelectorAll('[data-testid="grafik-nokta-tablosu"] [data-testid="mini-tablo-satir"]').length === 2, "2 satır");
  const y2 = etiketli("Grafik noktaları tablosu: 2. satır y");
  await yaz(y2, "-12,5");
  const n = () => (sekil.grafik!.egriler[0] as { noktalar: { x: number; y: number }[] }).noktalar;
  dogrula(n()[1].y === -12.5, `y virgüllü ondalıkla güncellenmeli: ${JSON.stringify(n())}`);
  await yaz(y2, "-");
  dogrula(n()[1].y === -12.5, "yarım değer şekli bozmamalı");
  dogrula(document.querySelector('[data-testid="grafik-nokta-tablosu"] [role="alert"]')?.textContent?.includes("2. satır, y: sayı yazın"), `okunur hata: ${(y2 as HTMLInputElement).value} ${document.querySelector('[data-testid="grafik-nokta-tablosu"]')?.textContent}`);
  dogrula(y2?.getAttribute("aria-invalid") === "true", "aria-invalid");
  await yaz(y2, "15");
  // Enter son satırda yeni satır açar (x adımı korunur: 0→4→8)
  await tus(etiketli("Grafik noktaları tablosu: 2. satır x"), "Enter");
  dogrula(n().length === 3 && n()[2].x === 8 && n()[2].y === 15, `Enter yeni nokta: ${JSON.stringify(n())}`);
  await tikla(etiketli("Grafik noktaları tablosu: 3. satırı sil"));
  dogrula(n().length === 2, "satır silinir");
  dogrula((etiketli("Grafik noktaları tablosu: 1. satırı sil") as HTMLButtonElement).disabled, "en az 2 nokta: sil devre dışı");
  // Eski metin yazımı katlanır alanda duruyor ve çalışıyor
  dogrula(document.querySelector('[data-testid="metin-olarak-yapistir"] input[aria-label="Grafik noktaları"]'), "metin yazımı korunmalı");
  await yaz(etiketli("Grafik noktaları"), "0,0; 2,4; 6,4");
  dogrula(n().length === 3 && n()[2].x === 6, "metinle yazım tabloyu günceller");
  dogrula(document.querySelectorAll('[data-testid="grafik-nokta-tablosu"] [data-testid="mini-tablo-satir"]').length === 3, "tablo metinle eşitlenir");
  // Excel yapıştırma
  const x1 = etiketli("Grafik noktaları tablosu: 1. satır x")!;
  await act(async () => {
    const olay = new dom.window.Event("paste", { bubbles: true, cancelable: true });
    Object.defineProperty(olay, "clipboardData", { value: { getData: () => "0\t1\n1\t2\n2\t3\n3\t5\n" } });
    x1.dispatchEvent(olay);
  });
  dogrula(n().length === 4 && n()[3].y === 5, `Excel yapıştırma: ${JSON.stringify(n())}`);
  console.log("✓ Grafik noktaları: mini tablo, ondalık virgül, yarım değer, Enter, sil, metin ve Excel yapıştırma");

  // ── 2) Adlı noktalar ──
  await tikla(dugme("Adlı noktalar"), "Adlı noktalar tür düğmesi");
  dogrula(document.querySelector('[data-testid="grafik-isaret-tablosu"]'), "adlı nokta tablosu");
  await yaz(etiketli("Adlı noktalar tablosu: 1. satır Ad"), "F_1");
  await yaz(etiketli("Adlı noktalar tablosu: 1. satır x"), "-3");
  const isr = () => (sekil.grafik!.egriler[0] as { noktalar: { x: number; y: number; ad?: string }[] }).noktalar;
  dogrula(isr()[0].ad === "F_1" && isr()[0].x === -3, `adlı nokta: ${JSON.stringify(isr())}`);
  await tikla(dugme("+ Satır ekle"));
  dogrula(isr().length === 3 && isr()[2].ad === "A", `yeni adlı nokta ilk boş harf: ${JSON.stringify(isr())}`);
  console.log("✓ Adlı noktalar: ad/x/y tablosu, yeni satıra sıradaki harf");

  // ── 3) Fonksiyon örnek çipleri ──
  await tikla(dugme("Fonksiyon y=f(x)"));
  await tikla(etiketli("Örnek: |x|"));
  dogrula((sekil.grafik!.egriler[0] as { ifade: string }).ifade === "|x|", "çip ifadeyi yazar");
  for (const o of HIZLI_FONKSIYON_ORNEKLERI) dogrula("veri" in hizliMatematik(o.ifade), `hızlı örnek okunmalı: ${o.ifade}`);
  let eklenen: unknown = null;
  await act(async () => root.render(<MatematikSeridi onGrafik={(v) => { eklenen = v; }} onIstatistik={() => {}} onSema={() => {}} />));
  await tikla(etiketli("Örnek: Parçalı"));
  dogrula((etiketli("Hızlı fonksiyon") as HTMLInputElement).value === "{x<0: -x, x>=0: x^2}", "hızlı kutuya örnek gelir");
  await tikla(dugme("Çiz"));
  dogrula(eklenen, "örnekten grafik çizilir");
  await yaz(etiketli("Hızlı fonksiyon"), "y = x^");
  dogrula(document.body.textContent?.includes("sona bir sayı ya da x ekleyin"), "okunur hata önerisi");
  console.log("✓ Örnek çipleri ve okunur hata mesajları");

  // ── 4) Olasılık ağacı (3 aşama) mini tablosu ──
  await act(async () => root.render(<Sarmal key="a1" ilk={semaSekli("agac")} Panel={SemaPaneli} />));
  dogrula(document.querySelector('[data-testid="agac-tablosu"]'), "ağaç tablosu");
  const agac = () => (sekil.sema as { dallar: { ad: string; alt?: { ad: string; alt?: unknown[] }[] }[] }).dallar;
  await yaz(etiketli("Olasılık ağacı dalları: 1. satır Dal adı"), "Kırmızı");
  dogrula(agac()[0].ad === "Kırmızı", "dal adı tablodan");
  await sec(etiketli("Olasılık ağacı dalları: 3. satır Aşama"), "3");
  dogrula(agac()[0].alt?.[0].alt?.length === 1, `3. aşama dalı bağlanır: ${JSON.stringify(agac())}`);
  await sec(etiketli("Olasılık ağacı dalları: 1. satır Aşama"), "3");
  dogrula(document.querySelector('[data-testid="agac-tablosu"] [role="alert"]')?.textContent?.includes("ana daldan") || document.querySelector('[data-testid="agac-tablosu"] [role="alert"]')?.textContent?.includes("aşama"), "geçersiz aşama sırası okunur hata");
  await sec(etiketli("Olasılık ağacı dalları: 1. satır Aşama"), "1");
  await act(async () => root.render(<Sarmal key="a2" ilk={semaSekli("agac")} Panel={SemaPaneli} />));
  await tikla(dugme("+ Aşama ekle (her uca 2 dal)"));
  dogrula(agac()[0].alt?.[0].alt?.length === 2, "aşama eklenir (3 aşama)");
  dogrula((dugme("+ Aşama ekle (her uca 2 dal)") as HTMLButtonElement).disabled, "3 aşamada devre dışı");
  dogrula(document.querySelector('textarea[aria-label="Dallar"]'), "metin yazımı korunur");
  console.log("✓ Olasılık ağacı: aşama sütunlu mini tablo, 3. aşama, aşama ekle");

  // ── 5) Venn düzenleri ──
  await act(async () => root.render(<Sarmal key="v1" ilk={semaSekli("venn2")} Panel={SemaPaneli} />));
  await tikla(dugme("Alt küme A ⊂ B"));
  dogrula((sekil.sema as { duzen?: string }).duzen === "altKume" && document.querySelectorAll('[data-testid="venn-bolge"]').length === 3, "alt küme: 3 bölge satırı");
  dogrula((sekil.sema as { bolgeler: string[] }).bolgeler[0] === "", "boş küme bölgesi temizlenir");
  await tikla(dugme("Ayrık A ∩ B = ∅"));
  dogrula((sekil.sema as { duzen?: string }).duzen === "ayrik" && (sekil.sema as { bolgeler: string[] }).bolgeler[1] === "", "ayrık: A∩B boş");
  await tikla(dugme("Kesişen"));
  dogrula(!("duzen" in (sekil.sema as object)), "kesişen: eski biçim (alan yok)");
  console.log("✓ Venn: kesişen / alt küme / ayrık");

  // ── 6) Birim çember ──
  await act(async () => root.render(<Sarmal key="b1" ilk={semaSekli("birim30")} Panel={SemaPaneli} />));
  dogrula(document.querySelector('[data-testid="birim-degerler"]')?.textContent?.includes("cos α = √3/2"), "30° değerleri");
  await tikla(dugme("135°"));
  dogrula(document.querySelector('[data-testid="birim-degerler"]')?.textContent?.includes("II. bölge"), "135° II. bölge");
  await tikla(dugme("tan doğrusu (x = 1)"));
  dogrula((sekil.sema as { tan?: boolean; aci: number }).tan === true && (sekil.sema as { aci: number }).aci === 135, "tan doğrusu açılır");
  await yaz(etiketli("Açı α (°)"), "5000");
  dogrula((sekil.sema as { aci: number }).aci === 135 && document.body.textContent?.includes("−720° ile 720°"), "aşırı açı uyarı, uygulanmaz");
  console.log("✓ Birim çember: özel açılar, değerler, tan doğrusu, sınır");

  // ── 7) İşaret tablosu ──
  await act(async () => root.render(<Sarmal key="i1" ilk={semaSekli("isaret-x2")} Panel={SemaPaneli} />));
  dogrula(document.querySelector('[data-testid="isaret-cozum"]')?.textContent?.includes("(−2, 3)"), "x²−x−6<0 çözümü");
  await yaz(etiketli("İşaret tablosu ifadesi"), "(x+2)(x-1)^2/(x-4)");
  await sec(etiketli("Eşitsizlik"), ">=");
  await tikla(dugme("Tabloyu hesapla"));
  const it = () => sekil.sema as { kokler: { deger: string; kat: string; tanimsiz?: boolean }[]; satirlar: { isaretler: string[] }[]; cozum?: number[] };
  dogrula(it().kokler.map((k) => k.deger).join() === "−2,1,4" && it().kokler[1].kat === "cift" && it().kokler[2].tanimsiz, "otomatik kökler");
  dogrula(it().satirlar[it().satirlar.length - 1].isaretler.join("") === "+--+", "otomatik işaretler");
  dogrula(document.querySelector('[data-testid="isaret-cozum"]')?.textContent?.includes("(−∞, −2] ∪ {1} ∪ (4, ∞)"), `ÇK: ${document.querySelector('[data-testid="isaret-cozum"]')?.textContent}`);
  await yaz(etiketli("İşaret tablosu ifadesi"), "x^3-x+1");
  await tikla(dugme("Tabloyu hesapla"));
  dogrula(document.querySelector('[data-testid="isaret-hata"]')?.textContent?.includes("çarpanlarına ayırarak"), "3. derece için okunur hata");
  // Elle: kök sil → aralıklar birleşir; kök ekle; kurala göre doldur
  const once = it().kokler.length;
  await tikla(etiketli("İşaret tablosu kökleri: 3. satırı sil"));
  dogrula(it().kokler.length === once - 1 && it().satirlar.every((s) => s.isaretler.length === once), "kök silinince işaret dizisi kısalır");
  await tikla(dugme("+ Kök ekle"));
  dogrula(it().kokler.length === once - 1, "boş değerli kök henüz uygulanmaz");
  await yaz(etiketli("İşaret tablosu kökleri: 3. satır Değer"), "5");
  dogrula(it().kokler.length === once && it().satirlar.every((s) => s.isaretler.length === once + 1), "kök eklenince aralık bölünür");
  await tikla(dugme("en sağ +"));
  const son = it().satirlar[it().satirlar.length - 1].isaretler.join("");
  dogrula(son === "+--+", `kural (çift katlı 1'de değişmez): ${son}`);
  const isaretDugmesi = document.querySelector('[data-testid="isaret-satirlari"] button[title]') as HTMLButtonElement;
  await tikla(isaretDugmesi);
  dogrula(it().satirlar[it().satirlar.length - 1].isaretler[0] === "-", "aralık işaretine tıklayınca + → −");
  console.log("✓ İşaret tablosu: otomatik hesap, okunur hata, elle kök ekle/sil, kurala göre doldur");

  // ── 8) Fonksiyon şeması ──
  await act(async () => root.render(<Sarmal key="f1" ilk={semaSekli("fonksiyon-ok")} Panel={SemaPaneli} />));
  dogrula(document.querySelector('[data-testid="fonksiyon-durum"]')?.textContent?.includes("Fonksiyondur"), "fonksiyon durumu");
  await tikla(document.querySelector('[aria-label="1 → b"]')?.closest("button"));
  dogrula(document.querySelector('[data-testid="fonksiyon-durum"]')?.textContent?.includes("birden çok görüntüsü"), "ikinci ok → fonksiyon değil");
  await tikla(etiketli("Tanım kümesi elemanları: 1. satırı sil"));
  const fs = () => sekil.sema as { a: string[]; oklar: [number, number][] };
  dogrula(fs().a.join() === "2,3" && fs().oklar.every(([x]) => x < 2), `eleman silinince oklar yeniden numaralanır: ${JSON.stringify(fs())}`);
  console.log("✓ Fonksiyon şeması: ok aç/kapa, fonksiyon koşulu, eleman silme");

  // ── 9) Enerji düzeyleri ──
  dogrula(JSON.stringify(gecisleriKaydir([{ bas: 3, son: 1, etiket: "" }, { bas: 2, son: 1, etiket: "a" }], { tur: "sil", index: 1 })) === JSON.stringify([{ bas: 2, son: 1, etiket: "" }]), "düzey silinince geçiş kayar");
  const yazilan = enerjiDuzeyleriYaz([{ ad: "n=1", e: -13.6 }, { ad: "n=2", e: -3.4 }]);
  const geri = enerjiDuzeyleriOku(yazilan);
  dogrula("duzeyler" in geri && geri.duzeyler[0].e === -13.6, `düzey metni gidiş-dönüş: ${yazilan}`);
  let ek: Record<string, unknown> = {};
  function EnerjiSarmal() {
    const [e, setE] = useState<Record<string, unknown>>({});
    ek = e;
    return <EnerjiTablolari ek={e} ekYaz={(y) => setE((o) => ({ ...o, ...y }))} tarihce={() => {}} />;
  }
  await act(async () => root.render(<EnerjiSarmal key="e1" />));
  dogrula(document.querySelectorAll('[data-testid="enerji-duzey-tablosu"] [data-testid="mini-tablo-satir"]').length === 4, "varsayılan 4 düzey");
  await yaz(etiketli("Enerji düzeyleri: 2. satır Enerji"), "-3,5");
  dogrula(String(ek.metin).includes("n=2:-3,5"), `düzey metni: ${ek.metin}`);
  await tikla(etiketli("Enerji düzeyleri: 1. satırı sil"));
  dogrula(String(ek.metin2) === "1>1".replace("1>1", "") || !String(ek.metin2).includes("2>1"), `1. düzeyin geçişleri gider: ${ek.metin2}`);
  await sec(etiketli("Enerji geçişleri: 1. satır Bitiş"), "1");
  dogrula(document.querySelector('[data-testid="enerji-gecis-tablosu"]'), "geçiş tablosu");
  await tikla(dugme("+ Geçiş ekle"));
  const gecisSatiri = document.querySelectorAll('[data-testid="enerji-gecis-tablosu"] [data-testid="mini-tablo-satir"]').length;
  await sec(etiketli(`Enerji geçişleri: ${gecisSatiri}. satır Başlangıç`), "1");
  dogrula(document.querySelector('[data-testid="enerji-gecis-tablosu"] [role="alert"]')?.textContent?.includes("farklı düzey"), "aynı düzey geçişi okunur hata");
  dogrula(document.querySelector('input[aria-label="Düzeyler (ad:eV)"]'), "metin yazımı korunur");
  console.log("✓ Enerji düzeyleri: düzey/geçiş mini tabloları, kaydırma, doğrulama");

  await act(async () => root.unmount());
  console.log("TÜM v1.2 M KULLANICI AKIŞLARI BAŞARILI");
}

main().catch((e) => { console.error(e); process.exit(1); });
