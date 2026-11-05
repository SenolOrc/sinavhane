// Fizik kipi ve "yazarak ekle" için KULLANICI AKIŞI testleri (jsdom + React).
// Öğretmenin yaptığı sırayla: kip seç → şekil ekle → bağla → etiketle → kaydet.

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

  const cagrilar: string[] = [];
  const sahteCtx = new Proxy({ font: "", lineWidth: 1 } as Record<string, unknown>, {
    get(h, ad: string) {
      if (ad === "measureText") return (m: string) => ({ width: [...m].length * 10, actualBoundingBoxAscent: 10, actualBoundingBoxDescent: 3 });
      if (ad in h) return h[ad];
      return (...a: unknown[]) => { cagrilar.push(ad); return a; };
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
  const { DenklemEditoruModal } = await import("../src/modules/sinav-olusturucu/components/DenklemEditoruModal");

  const root = createRoot(document.getElementById("root")!);
  const tikla = async (metin: string) => {
    const buton = [...document.querySelectorAll("button")].find((b) => b.textContent?.trim().includes(metin));
    dogrula(buton, `“${metin}” butonu bulunamadı`);
    await act(async () => { (buton as HTMLButtonElement).click(); });
  };
  const tamTikla = async (metin: string) => {
    const buton = [...document.querySelectorAll("button")].find((b) => b.textContent?.trim() === metin);
    dogrula(buton, `“${metin}” (tam eşleşme) butonu bulunamadı`);
    await act(async () => { (buton as HTMLButtonElement).click(); });
  };
  const etiketiyleTikla = async (etiket: string) => {
    const buton = document.querySelector(`button[aria-label="${etiket}"]`);
    dogrula(buton, `“${etiket}” (aria-label) butonu bulunamadı`);
    await act(async () => { (buton as HTMLButtonElement).click(); });
  };
  const pointer = async (canvas: HTMLCanvasElement, tur: string, x: number, y: number) => {
    const olay = new dom.window.MouseEvent(tur, { bubbles: true, clientX: x, clientY: y, buttons: tur === "pointermove" ? 1 : 0 });
    Object.defineProperty(olay, "pointerId", { value: 1 });
    await act(async () => { canvas.dispatchEvent(olay); });
  };
  /** Tuval koordinatına tıkla (ekran ölçeği = style.width / tuval genişliği). */
  const tuvaleTikla = async (canvas: HTMLCanvasElement, x: number, y: number) => {
    const olcek = Number.parseFloat(canvas.style.width) / canvas.width;
    await pointer(canvas, "pointerdown", x * olcek, y * olcek);
    await pointer(canvas, "pointerup", x * olcek, y * olcek);
  };
  const yaz = async (girdi: HTMLInputElement, deger: string) => {
    const ayarla = Object.getOwnPropertyDescriptor(dom.window.HTMLInputElement.prototype, "value")!.set!;
    await act(async () => {
      ayarla.call(girdi, deger);
      girdi.dispatchEvent(new dom.window.Event("input", { bubbles: true }));
    });
  };
  // v1.2: kip sekmeleri yok; şekiller sol kütüphanede (kategori + katlanır "ayrıntılı araçlar").
  const kategoriAc = async (kategori: string) => {
    const baslik = document.querySelector(`section[data-kategori="${kategori}"] > button`) as HTMLButtonElement | null;
    dogrula(baslik, `“${kategori}” kütüphane kategorisi yok`);
    if (baslik!.getAttribute("aria-expanded") !== "true") await act(async () => { baslik!.click(); });
  };
  const kutuphaneEk = async (kategori: string) => {
    await kategoriAc(kategori);
    const ek = document.querySelector(`button[data-ek-bolum="${kategori}"]`) as HTMLButtonElement | null;
    dogrula(ek, `“${kategori}” ayrıntılı araçlar bölümü yok`);
    if (ek!.getAttribute("aria-expanded") !== "true") await act(async () => { ek!.click(); });
  };
  const dugmeVar = (metin: string) => [...document.querySelectorAll("button")].some((b) => b.textContent?.trim().includes(metin));

  // ——— 1) Fizik kipi: ekle, bağla, etiketle, kaydet ———
  let cikti: any = null;
  await act(async () => root.render(<CizimEditoruModal key="fizik" onClose={() => {}} onOlustur={(v) => { cikti = v; }} />));
  dogrula(!document.querySelector("[data-kip-sekmesi]"), "eski kip sekmeleri hâlâ var");
  await kategoriAc("fizik");
  dogrula(document.querySelector('button[aria-label="Ekle: Kütle"]'), "Kütüphanenin Fizik kategorisinde şekil yok");
  // Temel çizim araçları her zaman üst çubukta (ok/çizgi/elips fizik şemasında lazım).
  dogrula(dugmeVar("Dikdörtgen") && dugmeVar("Seç / Taşı"), "çizim araçları kaybolmuş");

  await etiketiyleTikla("Ekle: Kütle");
  await etiketiyleTikla("Ekle: Kütle");
  // Palette küçük önizleme tuvalleri de var: asıl çizim tuvali role="img" olan.
  const canvas = document.querySelector<HTMLCanvasElement>('canvas[role="img"]')!;
  // İlk blok (430,270)-(520,330); ikincisi boş yere, ilkinin üstüne (430,170)-(520,230).

  // Bağlantı: İp / Çubuk → blok 1 (yalnız onda olan nokta) → blok 2 (yalnız onda olan nokta)
  await tikla("Ok / Bağlayıcı");
  await tikla("İp / Çubuk");
  dogrula(document.body.textContent?.includes("Bir şekilden ötekine sürükleyin ya da sırayla tıklayın"), "bağlantı yönergesi görünmüyor");
  await tuvaleTikla(canvas, 440, 275);
  dogrula(document.body.textContent?.includes("Şimdi HEDEFE"), "kaynak seçilince yönerge değişmiyor");
  await tuvaleTikla(canvas, 440, 175);

  // Vektör: blok 2'den BOŞ bir noktaya (serbest uç)
  await tikla("Kuvvet / Vektör");
  await tuvaleTikla(canvas, 440, 175);
  await tuvaleTikla(canvas, 800, 450);

  // Etiket: seçim aracıyla blok 1'i seç, etiketi yaz
  await tikla("Seç / Taşı");
  await tuvaleTikla(canvas, 440, 275);
  const panel = document.querySelector('[data-testid="fizik-secim-paneli"]');
  dogrula(panel, "kütle seçilince fizik paneli açılmıyor");
  const etiketGirdisi = document.querySelector('input[aria-label="Fizik şekli etiketi"]') as HTMLInputElement;
  dogrula(etiketGirdisi && etiketGirdisi.value === "m", "yeni kütlede hazır etiket 'm' gelmeli");
  await yaz(etiketGirdisi, "m_1");
  await tikla("90° döndür");

  await tikla("Yeni Soru Olarak Ekle");
  const sekiller = cikti?.cizimVerisi?.sekiller as any[];
  dogrula(sekiller, "çizim çıktısı yok");
  const kutleler = sekiller.filter((s) => s.tur === "fizik");
  const baglar = sekiller.filter((s) => s.tur === "baglayici");
  dogrula(kutleler.length === 2 && kutleler.every((k) => k.nesne === "kutle"), "iki kütle olmalı");
  dogrula(baglar.length === 2, `iki bağlantı olmalı (${baglar.length})`);
  const ip = baglar.find((b) => b.stil === "duz");
  dogrula(ip && ip.okUcu === "yok" && ip.kaynak.sekilId === kutleler[0].id && ip.hedef.sekilId === kutleler[1].id, "ip kütleleri bağlamalı, ucunda ok olmamalı");
  const vektor = baglar.find((b) => b.stil === "vektor");
  dogrula(vektor && vektor.okUcu === "son" && vektor.kaynak.sekilId === kutleler[1].id && "x" in vektor.hedef && vektor.hedef.x > 700, "vektör kütleden boş noktaya gitmeli");
  dogrula(kutleler[0].etiket === "m_1" && kutleler[0].donus === 90, `etiket/dönüş kaydedilmeli (${kutleler[0].etiket}, ${kutleler[0].donus})`);
  console.log("✓ Kullanıcı akışı: fizik kipinde kütle ekle, ip + vektör bağla, etiketle, döndür, kaydet");

  // ——— 2) Fizik içerikli çizim yeniden açılınca Fizik kipinde ———
  await act(async () => root.render(
    <CizimEditoruModal
      key="fizik-ac" onClose={() => {}} onOlustur={() => {}} duzenlemeModu
      baslangicBelgesi={{ surum: 1, genislik: 960, yukseklik: 600, sekiller: [{ id: "f1", tur: "fizik", nesne: "makara", kalinlik: 2, x: 100, y: 100, w: 70, h: 70 }] }}
    />,
  ));
  dogrula(document.querySelector('canvas[role="img"]')?.getAttribute("aria-label")?.includes("1 şekil"), "fizik içerikli çizim açılınca şekil kayboldu");
  console.log("✓ Kullanıcı akışı: fizik içerikli çizim olduğu gibi açılıyor");

  // ——— 3) Seçili bağlantının biçimi değiştirilebiliyor ———
  await act(async () => root.render(
    <CizimEditoruModal
      key="bag-bicim" onClose={() => {}} onOlustur={(v) => { cikti = v; }} duzenlemeModu
      baslangicBelgesi={{
        surum: 1, genislik: 960, yukseklik: 600,
        sekiller: [
          { id: "a", tur: "fizik", nesne: "kutle", kalinlik: 2, x: 100, y: 200, w: 90, h: 60 },
          { id: "b", tur: "fizik", nesne: "kutle", kalinlik: 2, x: 400, y: 200, w: 90, h: 60 },
          { id: "c", tur: "baglayici", kalinlik: 2, kaynak: { sekilId: "a" }, hedef: { sekilId: "b" }, stil: "duz", okUcu: "yok" },
        ],
      }}
    />,
  ));
  const c2 = document.querySelector<HTMLCanvasElement>('canvas[role="img"]')!;
  await tikla("Seç / Taşı");
  await tuvaleTikla(c2, 295, 230); // ipin ortası
  dogrula(document.querySelector('[data-testid="baglayici-bicim-paneli"]'), "ip seçilince biçim paneli açılmıyor");
  // "Yay" paletteki yay NESNESİ düğmesiyle de eşleşir: biçim panelindekini seç.
  const yayDugmesi = [...document.querySelectorAll('[data-testid="baglayici-bicim-paneli"] button')].find((b) => b.textContent?.trim() === "Yay");
  dogrula(yayDugmesi, "biçim panelinde Yay düğmesi yok");
  await act(async () => { (yayDugmesi as HTMLButtonElement).click(); });
  await tikla("Değişiklikleri Kaydet");
  dogrula(cikti.cizimVerisi.sekiller.find((s: any) => s.tur === "baglayici").stil === "yay", "ip yaya dönüşmedi");
  console.log("✓ Kullanıcı akışı: seçili bağlantı ip → yay");

  // ——— 4) Denklem editörü: yazarak ekle ———
  let denklem: any = null;
  await act(async () => root.render(<DenklemEditoruModal key="denk" onClose={() => {}} onOlustur={(v) => { denklem = v; }} />));
  const yazimGirdisi = document.getElementById("denklem-yazarak-ekle") as HTMLInputElement;
  dogrula(yazimGirdisi, "'Yazarak ekle' girişi yok");
  await yaz(yazimGirdisi, "x = v_0 t + 1/2 a t^2");
  await act(async () => {
    yazimGirdisi.dispatchEvent(new dom.window.KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
  });
  dogrula(yazimGirdisi.value === "", "Enter sonrası giriş temizlenmeli (arka arkaya yazabilmek için)");
  await yaz(yazimGirdisi, "sqrt(a^2 + b^2)");
  await tikla("Ekle");
  await tikla("Yeni Soru Olarak Ekle");
  const turler = denklem?.denklemVerisi?.parcalar.map((p: any) => p.tur).join(",");
  dogrula(
    turler === "metin,operator,us,metin,operator,kesir,metin,us,kok",
    `yazılan ifade doğru parçalara dönüşmeli: ${turler}`,
  );
  console.log("✓ Kullanıcı akışı: denklemi yazarak ekle (Enter ve Ekle düğmesi, arka arkaya)");

  // Uyarı: kapanmayan parantez yine eklenir ama uyarılır.
  await act(async () => root.render(<DenklemEditoruModal key="denk2" onClose={() => {}} onOlustur={() => {}} />));
  const g2 = document.getElementById("denklem-yazarak-ekle") as HTMLInputElement;
  await yaz(g2, "(a + b");
  await tikla("Ekle");
  dogrula(document.body.textContent?.includes("kapatılmadı"), "kapanmayan parantez uyarısı görünmüyor");
  console.log("✓ Kullanıcı akışı: bozuk yazıda uyarı gösteriliyor, parça yine de ekleniyor");

  // ——— Kareli alan: ekle, satır sayısını değiştir, köşelerden vektör ekle ———
  let cikti2: any = null;
  await act(async () => root.render(<CizimEditoruModal key="kareli" onClose={() => {}} onOlustur={(v) => { cikti2 = v; }} />));
  await kategoriAc("fizik");
  await etiketiyleTikla("Ekle: Kareli alan");
  dogrula(document.querySelector('[data-testid="kareli-alan-paneli"]'), "kareli alan eklenince paneli açılmıyor");
  const satirGirdisi = document.querySelector('input[aria-label="Satır"]') as HTMLInputElement;
  dogrula(satirGirdisi && satirGirdisi.value === "3", "varsayılan 3 satır olmalı");
  dogrula((document.querySelector('input[aria-label="Sütun"]') as HTMLInputElement).value === "4", "varsayılan 4 sütun olmalı");
  await yaz(satirGirdisi, "2");
  await tikla("Vektörü ekle");
  await tikla("Yeni Soru Olarak Ekle");
  const s2 = cikti2?.cizimVerisi?.sekiller as any[];
  const alan = s2.find((s) => s.nesne === "kareliAlan");
  dogrula(alan && alan.satir === 2 && alan.sutun === 4, `alan satır/sütun kaydedilmedi: ${JSON.stringify(alan)}`);
  dogrula(Math.abs(alan.h - 100) < 0.5, `2 satırda yükseklik hücre*2 olmalı (${alan.h})`);
  const vek = s2.find((s) => s.tur === "baglayici");
  dogrula(vek && vek.stil === "vektor" && vek.kaynak.sekilId === alan.id && vek.kaynak.dugum && vek.hedef.dugum, "vektör alanın köşelerine tutunmalı");
  console.log("✓ Kullanıcı akışı: kareli alan ekle, satır sayısı değiştir, köşelerden vektör ekle");

  // ——— Grafik: şablon ekle, evre süresini değiştir, sinüs genliğini değiştir, üçlü ekle ———
  let cikti3: any = null;
  await act(async () => root.render(<CizimEditoruModal key="grafik" onClose={() => {}} onOlustur={(v) => { cikti3 = v; }} />));
  await kutuphaneEk("fizik");
  await etiketiyleTikla("Grafik ekle: v–t");
  dogrula(document.querySelector('[data-testid="grafik-paneli"]'), "grafik eklenince paneli açılmıyor");
  dogrula(document.querySelectorAll('[data-testid="grafik-evre"]').length === 3, "v–t şablonu 3 evre içermeli");
  await yaz(document.querySelector('input[aria-label="Evre 1 süre (s)"]') as HTMLInputElement, "5");
  dogrula((document.querySelector('[data-testid="grafik-ozet"]')?.textContent ?? "").includes("Toplam 11 s"), `özet güncellenmedi: ${document.querySelector('[data-testid="grafik-ozet"]')?.textContent}`);
  await tikla("+ Evre ekle");
  dogrula(document.querySelectorAll('[data-testid="grafik-evre"]').length === 4, "evre eklenmedi");
  // "Noktalarla" şablon düğmesiyle karışmasın: tam eşleşen tür düğmesi.
  const turDugmesi = [...document.querySelectorAll("button")].find((b) => b.textContent?.trim() === "Noktalar");
  dogrula(turDugmesi, "Noktalar tür düğmesi bulunamadı");
  await act(async () => { (turDugmesi as HTMLButtonElement).click(); });
  const nokta = document.querySelector('input[aria-label="Grafik noktaları"]') as HTMLInputElement;
  dogrula(nokta, "noktalar kutusu görünmeli");
  await yaz(nokta, "0,0; 3,6; 6,6");
  await tikla("Yeni Soru Olarak Ekle");
  const s3 = cikti3?.cizimVerisi?.sekiller as any[];
  const gr = s3.find((s) => s.nesne === "grafik");
  dogrula(gr && gr.grafik.egriler[0].tur === "noktalar" && gr.grafik.egriler[0].noktalar.length === 3, `noktalar kaydedilmedi: ${JSON.stringify(gr?.grafik?.egriler?.[0])}`);
  console.log("✓ Kullanıcı akışı: v–t grafiği ekle, evre düzenle, noktalara geç");

  await act(async () => root.render(<CizimEditoruModal key="grafik2" onClose={() => {}} onOlustur={(v) => { cikti3 = v; }} />));
  await kutuphaneEk("fizik");
  await etiketiyleTikla("Grafik ekle: Sinüs");
  await yaz(document.querySelector('input[aria-label="Genlik A"]') as HTMLInputElement, "3");
  await tikla("Yeni Soru Olarak Ekle");
  const sn = (cikti3?.cizimVerisi?.sekiller as any[]).find((s) => s.nesne === "grafik");
  dogrula(sn && sn.grafik.egriler[0].tur === "sinus" && sn.grafik.egriler[0].genlik === 3, `sinüs genliği kaydedilmedi: ${JSON.stringify(sn?.grafik?.egriler?.[0])}`);

  await act(async () => root.render(<CizimEditoruModal key="grafik3" onClose={() => {}} onOlustur={(v) => { cikti3 = v; }} />));
  await kutuphaneEk("fizik");
  await etiketiyleTikla("Grafik ekle: x–t, v–t, a–t üçlü");
  await tikla("Yeni Soru Olarak Ekle");
  const ucluler = (cikti3?.cizimVerisi?.sekiller as any[]).filter((s) => s.nesne === "grafik");
  dogrula(ucluler.length === 3, `üçlü grafik 3 şekil olmalı (${ucluler.length})`);
  const buyuklukler = ucluler.map((s) => s.grafik.egriler[0].buyukluk).join();
  dogrula(buyuklukler === "konum,hiz,ivme", `sıra konum,hız,ivme olmalı (${buyuklukler})`);
  dogrula(ucluler[0].y < ucluler[1].y && ucluler[1].y < ucluler[2].y && ucluler.every((s) => s.x === ucluler[0].x), "alt alta, hizalı");
  dogrula(ucluler.every((s) => s.y >= 0 && s.y + s.h <= 600), "üçlü grafik tuvale sığmalı");
  console.log("✓ Kullanıcı akışı: sinüs genliği, üçlü grafik");

  // ——— Hızlı çiz: noktaları yaz → grafik; v–t'den x–t ve a–t üret ———
  await act(async () => root.render(<CizimEditoruModal key="grafik4" onClose={() => {}} onOlustur={(v) => { cikti3 = v; }} />));
  await kutuphaneEk("fizik");
  const hizli = document.querySelector('input[aria-label="Hızlı grafik noktaları"]') as HTMLInputElement;
  dogrula(hizli, "hızlı çiz kutusu görünmeli");
  await yaz(hizli, "0,5; 5,15; 9,15; 11,9");
  await tamTikla("Çiz");
  dogrula(document.querySelector('[data-testid="grafik-paneli"]'), "hızlı çizimden sonra grafik paneli açılmalı");
  await tikla("Bunu v–t say");
  await tikla("Yeni Soru Olarak Ekle");
  const hz = (cikti3?.cizimVerisi?.sekiller as any[]).filter((s) => s.nesne === "grafik");
  dogrula(hz.length === 4, `hızlı v–t + üretilen 3 grafik = 4 olmalı (${hz.length})`);
  const ev = hz.find((s) => s.grafik.egriler[0].tur === "hareket" && s.grafik.egriler[0].buyukluk === "konum")?.grafik.egriler[0].evreler;
  dogrula(ev && ev[0].ivme === 2 && ev[2].ivme === -3, `evreler v–t noktalarından gelmeli: ${JSON.stringify(ev)}`);
  console.log("✓ Kullanıcı akışı: hızlı çiz, v–t'den x–t/a–t üret");

  // ——— Matematik: hızlı fonksiyon, istatistik tablosu, Venn ———
  await act(async () => root.render(<CizimEditoruModal key="mat1" onClose={() => {}} onOlustur={(v) => { cikti3 = v; }} />));
  await kutuphaneEk("matematik");
  dogrula(document.querySelector('[data-testid="matematik-seridi"]'), "matematik şeridi görünmeli");
  dogrula(!dugmeVar("Devre teli"), "Matematik sekmesinde bağlantı satırı gizli olmalı");
  const hizliF = document.querySelector('input[aria-label="Hızlı fonksiyon"]') as HTMLInputElement;
  dogrula(hizliF, "hızlı fonksiyon kutusu görünmeli");
  await yaz(hizliF, "y = x^2 - 4; y > x + 1");
  await tamTikla("Çiz");
  dogrula(document.querySelector('[data-testid="grafik-paneli"]'), "fonksiyon çizilince grafik paneli açılmalı");
  const ifadeK = document.querySelector('input[aria-label="Fonksiyon"]') as HTMLInputElement;
  dogrula(ifadeK && ifadeK.value === "y = x^2 - 4", "fonksiyon ifadesi panelde görünmeli");
  await yaz(ifadeK, "x^2 - 9");
  await tikla("Yeni Soru Olarak Ekle");
  const fg = (cikti3?.cizimVerisi?.sekiller as any[]).find((x) => x.nesne === "grafik");
  dogrula(fg && fg.grafik.egriler.length === 2 && fg.grafik.egriler[0].ifade === "x^2 - 9" && fg.grafik.egriler[1].tur === "bolge", `fonksiyon+bölge kaydedilmedi: ${JSON.stringify(fg?.grafik?.egriler)}`);
  console.log("✓ Kullanıcı akışı: hızlı fonksiyon + eşitsizlik, ifade düzenleme");

  await act(async () => root.render(<CizimEditoruModal key="mat1b" onClose={() => {}} onOlustur={(v) => { cikti3 = v; }} />));
  await kutuphaneEk("matematik");
  await yaz(document.querySelector('input[aria-label="Hızlı fonksiyon"]') as HTMLInputElement, "x^2+y^2=25; y=x+1; kesisim");
  await tamTikla("Çiz");
  dogrula(document.querySelector('[data-testid="grafik-paneli"]'), "denklem çizilince grafik paneli açılmalı");
  dogrula(document.querySelector('[data-testid="grafik-denklem"]'), "ilk eğri denklem düzenleyicisi görünmeli");
  const denK = document.querySelector('input[aria-label="Denklem"]') as HTMLInputElement;
  dogrula(denK && denK.value === "x^2+y^2=25", "denklem panelde görünmeli");
  await yaz(denK, "x^2+y^2=16");
  await tikla("Yeni Soru Olarak Ekle");
  const dg = (cikti3?.cizimVerisi?.sekiller as any[]).find((x) => x.nesne === "grafik");
  dogrula(dg && dg.grafik.kesisim === true && dg.grafik.egriler[0].tur === "denklem" && dg.grafik.egriler[0].ifade === "x^2+y^2=16", `denklem kaydedilmedi: ${JSON.stringify(dg?.grafik)}`);
  console.log("✓ Kullanıcı akışı: hızlı çember denklemi + kesişim, düzenleme");

  await act(async () => root.render(<CizimEditoruModal key="mat2" onClose={() => {}} onOlustur={(v) => { cikti3 = v; }} />));
  await kutuphaneEk("matematik");
  await tamTikla("İstatistik");
  await etiketiyleTikla("İstatistik ekle: Sütun");
  dogrula(document.querySelector('[data-testid="istatistik-paneli"]'), "istatistik paneli açılmalı");
  const tablo = document.querySelector('textarea[aria-label="İstatistik tablosu"]') as HTMLTextAreaElement;
  dogrula(tablo, "tablo kutusu görünmeli");
  const tAyarla = Object.getOwnPropertyDescriptor(dom.window.HTMLTextAreaElement.prototype, "value")!.set!;
  await act(async () => { tAyarla.call(tablo, "\tSayı\nMavi\t40\nYeşil\t25\nKırmızı\t35"); tablo.dispatchEvent(new dom.window.Event("input", { bubbles: true })); });
  const daireDugme = [...document.querySelectorAll("button")].find((b) => b.textContent?.trim() === "Daire" && b.getAttribute("aria-pressed") !== null);
  dogrula(daireDugme, "Daire tür düğmesi bulunamadı");
  await act(async () => { (daireDugme as HTMLButtonElement).click(); });
  await tikla("Yeni Soru Olarak Ekle");
  const ig = (cikti3?.cizimVerisi?.sekiller as any[]).find((x) => x.nesne === "istatistik");
  dogrula(ig && ig.istatistik.tur === "daire" && ig.istatistik.satirlar.length === 3 && ig.istatistik.satirlar[0].v[0] === 40, `istatistik kaydedilmedi: ${JSON.stringify(ig?.istatistik)}`);
  console.log("✓ Kullanıcı akışı: istatistik şablonu, tablo yapıştır, daireye çevir");

  await act(async () => root.render(<CizimEditoruModal key="mat3" onClose={() => {}} onOlustur={(v) => { cikti3 = v; }} />));
  await kutuphaneEk("matematik");
  await tamTikla("Şema");
  await etiketiyleTikla("Şema ekle: Venn (2 küme)");
  dogrula(document.querySelector('[data-testid="sema-venn"]'), "Venn paneli açılmalı");
  const bolge = document.querySelector('input[aria-label="Bölge: A∩B"]') as HTMLInputElement;
  dogrula(bolge, "A∩B bölge kutusu bulunamadı");
  await yaz(bolge, "7");
  const boyaDugmeleri = [...document.querySelectorAll('[data-testid="venn-bolge"] button')];
  await act(async () => { (boyaDugmeleri[1] as HTMLButtonElement).click(); });
  await tikla("Yeni Soru Olarak Ekle");
  const vg = (cikti3?.cizimVerisi?.sekiller as any[]).find((x) => x.nesne === "sema");
  dogrula(vg && vg.sema.bolgeler[1] === "7" && vg.sema.boyali?.join() === "1", `Venn kaydedilmedi: ${JSON.stringify(vg?.sema)}`);
  console.log("✓ Kullanıcı akışı: Venn değeri yaz, bölge boya");

  // ——— Uç durumlar: açık uyarılar, çökme yok, şekil korunur ———
  await act(async () => root.render(<CizimEditoruModal key="uc1" onClose={() => {}} onOlustur={(v) => { cikti3 = v; }} />));
  await kutuphaneEk("matematik");
  const hizliU = document.querySelector('input[aria-label="Hızlı fonksiyon"]') as HTMLInputElement;
  await yaz(hizliU, "y=x^2;x=1e300");
  dogrula(document.body.textContent?.includes("çizilemeyecek kadar büyük/belirsiz"), "çok büyük değer için açık hata görünmeli");
  const ciz1 = [...document.querySelectorAll("button")].find((b) => b.textContent?.trim() === "Çiz") as HTMLButtonElement;
  dogrula(ciz1.disabled, "büyük değerde Çiz devre dışı olmalı");
  await yaz(hizliU, "y=1" + "0".repeat(300) + "x");
  dogrula(document.body.textContent?.includes("en çok 200 karakter"), "uzun ifade için açık hata görünmeli");
  console.log("✓ Kullanıcı akışı: çok büyük/uzun ifade açık hata verir");

  await act(async () => root.render(<CizimEditoruModal key="uc2" onClose={() => {}} onOlustur={(v) => { cikti3 = v; }} />));
  await kutuphaneEk("fizik");
  const hizliN = document.querySelector('input[aria-label="Hızlı grafik noktaları"]') as HTMLInputElement;
  await yaz(hizliN, Array.from({ length: 81 }, (_, i) => `${i},${i}`).join("; "));
  dogrula(document.querySelector('[data-testid="grafik-hizli-hata"]')?.textContent === "En çok 80 nokta", "81 nokta nedeni yazmalı");
  await yaz(hizliN, "0,0; 1,1; x,2");
  dogrula(document.querySelector('[data-testid="grafik-hizli-hata"]')?.textContent?.includes("3. nokta"), "okunamayan nokta nedeni yazmalı");
  await yaz(hizliN, "0,0; 0,5; 0,10");
  dogrula(document.querySelector('[data-testid="grafik-hizli-uyari"]')?.textContent?.includes("Aynı x"), "aynı x uyarısı görünmeli");
  console.log("✓ Kullanıcı akışı: hızlı grafik noktası nedenleri ve aynı x uyarısı");

  await act(async () => root.render(<CizimEditoruModal key="uc3" onClose={() => {}} onOlustur={(v) => { cikti3 = v; }} />));
  await kutuphaneEk("matematik");
  await tamTikla("Şema");
  await etiketiyleTikla("Şema ekle: Venn (3 küme)");
  const satirlar3 = [...document.querySelectorAll('[data-testid="venn-bolge"]')];
  dogrula(satirlar3.length === 8 && satirlar3.every((r) => r.querySelectorAll("button").length === 1 && r.querySelectorAll("input").length === 1), "3 kümede 8 bölge satırı, her birinde bir giriş + Boya");
  const sonBoya = satirlar3[7].querySelector("button") as HTMLButtonElement;
  const once = sonBoya.getAttribute("aria-pressed");
  await act(async () => { sonBoya.click(); });
  dogrula((document.querySelectorAll('[data-testid="venn-bolge"]')[7].querySelector("button") as HTMLButtonElement).getAttribute("aria-pressed") !== once, "Hiçbiri Boya aria-pressed değişmeli");
  console.log("✓ Kullanıcı akışı: Venn 3 küme satırları ve Hiçbiri boyama");

  await act(async () => root.render(<CizimEditoruModal key="uc4" onClose={() => {}} onOlustur={(v) => { cikti3 = v; }} />));
  await kutuphaneEk("matematik");
  await tamTikla("Şema");
  await etiketiyleTikla("Şema ekle: Olasılık ağacı");
  const dallar = document.querySelector('textarea[aria-label="Dallar"]') as HTMLTextAreaElement;
  const tA = Object.getOwnPropertyDescriptor(dom.window.HTMLTextAreaElement.prototype, "value")!.set!;
  await act(async () => { dallar.focus(); });
  await act(async () => { tA.call(dallar, `${"K".repeat(45)}: ${"1".repeat(25)}\nM: 1/2`); dallar.dispatchEvent(new dom.window.Event("input", { bubbles: true })); });
  dogrula(document.querySelector('[data-testid="sema-uyari"]')?.textContent?.includes("40"), "ağaç uzun ad uyarısı görünmeli");
  dogrula(document.querySelector('[data-testid="sema-agac"]'), "şekil Venn'e dönmemeli, ağaç paneli kalmalı");
  await tikla("Yeni Soru Olarak Ekle");
  const ag = (cikti3?.cizimVerisi?.sekiller as any[]).find((x) => x.nesne === "sema");
  dogrula(ag?.sema.tur === "agac" && ag.sema.dallar[0].ad.length === 40 && ag.sema.dallar[0].olasilik.length === 20, `ağaç kesilerek kaydedilmeli: ${JSON.stringify(ag?.sema)}`);
  console.log("✓ Kullanıcı akışı: ağaçta uzun ad/olasılık kesilir ve uyarılır");

  await act(async () => root.render(<CizimEditoruModal key="uc5" onClose={() => {}} onOlustur={(v) => { cikti3 = v; }} />));
  await kutuphaneEk("matematik");
  await tamTikla("İstatistik");
  await etiketiyleTikla("İstatistik ekle: Gövde–yaprak");
  const deg = document.querySelector('input[aria-label="Değerler"]') as HTMLInputElement;
  const sureOnce = Date.now();
  await yaz(deg, "1000000000;5;6");
  dogrula(Date.now() - sureOnce < 3000, "geniş aralık donmamalı");
  dogrula(document.querySelector('[data-testid="istatistik-ham-uyari"]')?.textContent?.includes("Değer aralığı çok geniş"), "gövde–yaprak aralık uyarısı görünmeli");
  await yaz(deg, "0,5;1000000");
  dogrula(document.querySelector('[data-testid="istatistik-ham-uyari"]'), "ondalık geniş aralık da uyarılmalı, hata ekranı yok");
  await tikla("Yeni Soru Olarak Ekle");
  const gy = (cikti3?.cizimVerisi?.sekiller as any[]).find((x) => x.nesne === "istatistik");
  dogrula(gy?.istatistik.satirlar[0].v.every((n: number) => n < 100), "önceki geçerli veri korunmalı");
  console.log("✓ Kullanıcı akışı: gövde–yaprak çok geniş aralık uyarısı, önceki şekil korunur");

  await act(async () => root.render(<CizimEditoruModal key="uc6" onClose={() => {}} onOlustur={(v) => { cikti3 = v; }} />));
  await kutuphaneEk("fizik");
  await etiketiyleTikla("Grafik ekle: x–t (ivmeli)");
  const sureK = document.querySelector('input[aria-label="Evre 1 süre (s)"]') as HTMLInputElement;
  dogrula(sureK, "evre süre kutusu bulunamadı");
  await yaz(sureK, "1e308");
  dogrula(document.querySelector('[data-testid="grafik-hareket-uyari"]'), "1e308 için uyarı görünmeli");
  await tikla("Yeni Soru Olarak Ekle");
  const hg = (cikti3?.cizimVerisi?.sekiller as any[]).find((x) => x.nesne === "grafik");
  dogrula(hg.grafik.egriler[0].evreler[0].sure === 1e6, `süre 1e6'ya kıstırılmalı: ${hg.grafik.egriler[0].evreler[0].sure}`);
  console.log("✓ Kullanıcı akışı: hareket evresi 1e308 kıstırılır ve uyarılır");

  // ——— Kimya: laboratuvar, atom, periyodik tablo ———
  await act(async () => root.render(<CizimEditoruModal key="kim1" onClose={() => {}} onOlustur={(v) => { cikti3 = v; }} />));
  await kutuphaneEk("kimya");
  dogrula(document.querySelector('[data-testid="kimya-seridi"]'), "kimya şeridi görünmeli");
  await etiketiyleTikla("Ekle: Beher");
  const seviye = document.querySelector('input[aria-label="Sıvı seviyesi"]') as HTMLInputElement;
  dogrula(seviye, "beher seçilince sıvı seviyesi çıkmalı");
  const aralikAyarla = Object.getOwnPropertyDescriptor(dom.window.HTMLInputElement.prototype, "value")!.set!;
  await act(async () => { aralikAyarla.call(seviye, "80"); seviye.dispatchEvent(new dom.window.Event("input", { bubbles: true })); seviye.dispatchEvent(new dom.window.Event("change", { bubbles: true })); });
  await etiketiyleTikla("Dolgu: Mavi");
  await tikla("Yeni Soru Olarak Ekle");
  const beher = (cikti3?.cizimVerisi?.sekiller as any[]).find((x) => x.nesne === "beher");
  dogrula(beher && beher.seviye === 0.8 && beher.dolgu, `beher sıvısı kaydedilmedi: ${JSON.stringify(beher)}`);
  console.log("✓ Kullanıcı akışı: beher ekle, sıvı seviyesi ve rengi");

  await act(async () => root.render(<CizimEditoruModal key="kim2" onClose={() => {}} onOlustur={(v) => { cikti3 = v; }} />));
  await kutuphaneEk("kimya");
  await tamTikla("Atom / Molekül");
  await etiketiyleTikla("Kimya ekle: Bohr atomu (Cl)");
  dogrula((document.querySelector('[data-testid="kimya-dizilim"]')?.textContent ?? "").includes("2, 8, 7"), "Cl dizilimi 2, 8, 7 olmalı");
  const el = document.querySelector('input[aria-label="Element (sembol ya da no)"]') as HTMLInputElement;
  await yaz(el, "Na");
  dogrula((document.querySelector('[data-testid="kimya-dizilim"]')?.textContent ?? "").includes("2, 8, 1"), "Na dizilimi 2, 8, 1 olmalı");
  await tamTikla("+1");
  dogrula((document.querySelector('[data-testid="kimya-dizilim"]')?.textContent ?? "").includes("Dizilim: 2, 8 "), "Na⁺ dizilimi 2, 8 olmalı");
  await tikla("Yeni Soru Olarak Ekle");
  const at = (cikti3?.cizimVerisi?.sekiller as any[]).find((x) => x.nesne === "kimya");
  dogrula(at && at.kimya.tur === "atom" && at.kimya.z === 11 && at.kimya.yuk === 1, `atom kaydedilmedi: ${JSON.stringify(at?.kimya)}`);
  console.log("✓ Kullanıcı akışı: atom ekle, elementi Na yap, +1 yük");

  await act(async () => root.render(<CizimEditoruModal key="kim3" onClose={() => {}} onOlustur={(v) => { cikti3 = v; }} />));
  await kutuphaneEk("kimya");
  await tamTikla("Periyodik tablo");
  await etiketiyleTikla("Kimya ekle: İlk 20 element");
  const boyali = document.querySelector('input[aria-label="Boyalı elementler"]') as HTMLInputElement;
  dogrula(boyali, "boyalı elementler kutusu görünmeli");
  await yaz(boyali, "O, 11-12");
  await tamTikla("Tüm tablo");
  await tikla("Yeni Soru Olarak Ekle");
  const pt = (cikti3?.cizimVerisi?.sekiller as any[]).find((x) => x.nesne === "kimya");
  dogrula(pt && pt.kimya.bolge === "tum" && pt.kimya.boyali.join() === "8,11,12" && pt.h === 315, `periyodik tablo kaydedilmedi: ${JSON.stringify(pt)}`);
  console.log("✓ Kullanıcı akışı: periyodik tablo, boyalı elementler, tüm tabloya geç");

  await act(async () => root.unmount());
  console.log("TÜM FİZİK KULLANICI AKIŞLARI BAŞARILI");
}

main().catch((hata) => { console.error(hata); process.exit(1); });
