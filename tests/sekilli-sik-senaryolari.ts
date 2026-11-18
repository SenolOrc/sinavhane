// Şekilli şıklar: model doğrulama (kaydet→yükle), B grubu karıştırma, yerleşim
// yüksekliği ve kâğıttaki sıra.
//
// Kurulum notu: soru-kaliplari-senaryolari.ts ile aynı (jsdom global'leri
// kurulduktan SONRA dinamik import; esbuild `--external:jsdom`).
import { JSDOM } from "jsdom";

function dogrula(kosul: unknown, mesaj: string): asserts kosul {
  if (!kosul) throw new Error(`ŞEKİLLİ ŞIK TESTİ BAŞARISIZ: ${mesaj}`);
}
function senaryo(ad: string, calistir: () => void) {
  calistir();
  console.log(`✓ ${ad}`);
}

/** Gerçek IHDR başlıklı küçük PNG veri URL'si (genişlik/yükseklik px). */
function png(gen: number, yuk: number): string {
  const b = Buffer.alloc(33);
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).copy(b, 0);
  b.writeUInt32BE(13, 8);
  b.write("IHDR", 12, "ascii");
  b.writeUInt32BE(gen, 16);
  b.writeUInt32BE(yuk, 20);
  return `data:image/png;base64,${b.toString("base64")}`;
}

async function calistir() {
  const dom = new JSDOM("<!doctype html><body></body>", { url: "http://localhost/" });
  Object.assign(globalThis, {
    window: dom.window,
    document: dom.window.document,
    HTMLElement: dom.window.HTMLElement,
    HTMLImageElement: dom.window.HTMLImageElement,
    Node: dom.window.Node,
    localStorage: dom.window.localStorage,
  });

  const { sinavTaslaginiDogrula, sinavTaslakKimlikleriniYenile, sinavTaslakOzeti } = await import("../src/modules/sinav-olusturucu/storage/taslakDosya");
  const { siklariKaristir, bGrubuSiklariniKaristir, cevapAnahtariOlustur } = await import("../src/modules/sinav-olusturucu/utils");
  const L = await import("../src/modules/sinav-olusturucu/layout/sekilliSiklar");
  const { kabaTahminMm, sayfalariOlustur } = await import("../src/modules/sinav-olusturucu/layout/a4");
  const { bolunebilirMi } = await import("../src/modules/sinav-olusturucu/layout/soruBolme");
  const { GorselAssetKaydi, hafifSnapshotOlustur, hafifSnapshotGeriYukle } = await import("../src/modules/sinav-olusturucu/history");
  const React = await import("react");
  const { renderToStaticMarkup } = await import("react-dom/server");
  const { SoruIcerik } = await import("../src/modules/sinav-olusturucu/components/SinavKagit");
  type Soru = import("../src/modules/sinav-olusturucu/types").SoruOgesi;
  type Madde = import("../src/modules/sinav-olusturucu/types").Madde;

  const HARFLER = ["A", "B", "C", "D", "E"];
  const sikMaddeleri = (oranlar: number[] = [1.5, 1.5, 1.5, 1.5, 1.5], metin = ""): Madde[] =>
    oranlar.map((oran, i) => ({
      id: `m${i}`,
      metinHtml: metin ? `<p>${metin}${HARFLER[i]}</p>` : "",
      puan: null,
      cevapSatir: 0,
      gorselDataUrl: png(Math.round(oran * 200), 200),
      gorselOran: oran,
      cizimVerisi: { surum: 1, sekiller: [{ id: `sh${i}` }] } as unknown as Madde["cizimVerisi"],
    }));
  const soru = (ek: Partial<Soru> = {}): Soru => ({
    id: "s1", tur: "metin", metinHtml: "<p>Devrenin şematik gösterimi hangisidir?</p>", metinKonumu: "alt", hizalama: "sol",
    genislikMm: 80, boslukMm: 0, punto: 11, puan: null, maddeler: sikMaddeleri(), maddeKolon: 1, tamGenislik: false,
    dogruSik: "C", ...ek,
  });
  const taslak = (sorular: Soru[]) => ({
    id: "t1", surum: "v0.11C", kayitZamani: "2026-11-18T10:00:00.000Z",
    baslik: { okulAdi: "Okul", sinifSeviyesi: "10", donem: "1", yaziliNo: "1", ders: "Fizik" },
    sorular,
    ayarlar: { kenarBosluk: 10, varsayilanSoruBosluk: 20, ogretmenler: [], sayfaNoGoster: true, sayfaDuzeni: "tek", sutunAra: 8, sutunAyirici: false, sinavTuru: "test" },
  });
  const reddedilir = (t: unknown) => { try { sinavTaslaginiDogrula(t); return false; } catch { return true; } };

  // ── 1. Model: kaydet → yükle ─────────────────────────────────────────
  senaryo("model: şekilli şıklı soru kaydet→yükle gidiş-dönüşte aynen korunur", () => {
    const t = taslak([soru({ sikGorselDuzeni: "uc-iki", sikGorselGenislikMm: 40 })]);
    const yuklenen = sinavTaslaginiDogrula(JSON.parse(JSON.stringify(sinavTaslaginiDogrula(t))));
    dogrula(JSON.stringify(yuklenen) === JSON.stringify(t), "gidiş-dönüş sonrası taslak değişti");
    const m = yuklenen.sorular[0].maddeler;
    dogrula(m.length === 5 && m.every((x) => x.gorselDataUrl?.startsWith("data:image/png;base64,") && x.gorselOran === 1.5 && !!x.cizimVerisi), "şık şekilleri kayboldu");
    dogrula(yuklenen.sorular[0].sikGorselDuzeni === "uc-iki" && yuklenen.sorular[0].sikGorselGenislikMm === 40, "düzen/boy kayboldu");
    dogrula(sinavTaslakOzeti(yuklenen).gorselSayisi === 5, "özet şık şekillerini saymadı");
  });

  senaryo("model: eski kayıt (şekilsiz şıklar, yeni alan yok) değişmeden açılır", () => {
    const eski = taslak([soru({ maddeler: [{ id: "a", metinHtml: "<p>1</p>", puan: null, cevapSatir: 0 }, { id: "b", metinHtml: "<p>2</p>", puan: null, cevapSatir: 0 }] })]);
    dogrula(sinavTaslaginiDogrula(eski).sorular[0].maddeler.length === 2, "eski kayıt reddedildi");
  });

  senaryo("model: geçersiz şık görseli ve bilinmeyen alanlar reddedilir", () => {
    const kotu = (degistir: (s: Record<string, unknown>) => void) => {
      const t = structuredClone(taslak([soru()]));
      degistir((t.sorular[0].maddeler[0] as unknown) as Record<string, unknown>);
      return t;
    };
    dogrula(reddedilir(kotu((m) => { m.gorselDataUrl = "javascript:alert(1)"; })), "javascript: URL kabul edildi");
    dogrula(reddedilir(kotu((m) => { m.gorselDataUrl = "https://example.com/a.png"; })), "uzak URL kabul edildi");
    dogrula(reddedilir(kotu((m) => { m.gorselDataUrl = "data:image/svg+xml;base64,PHN2Zy8+"; })), "SVG kabul edildi");
    dogrula(reddedilir(kotu((m) => { m.gorselDataUrl = "data:text/html;base64,PGI+"; })), "HTML veri URL'si kabul edildi");
    dogrula(reddedilir(kotu((m) => { m.gorselDataUrl = 42; })), "sayı kabul edildi");
    dogrula(reddedilir(kotu((m) => { m.gorselOran = 0; })), "geçersiz oran kabul edildi");
    dogrula(reddedilir(kotu((m) => { m.gorselOran = "1.5"; })), "metin oran kabul edildi");
    dogrula(reddedilir(kotu((m) => { m.cizimVerisi = "x"; })), "nesne olmayan çizim kabul edildi");
    dogrula(reddedilir(kotu((m) => { delete m.gorselDataUrl; })), "görselsiz çizim verisi kabul edildi");
    dogrula(reddedilir(kotu((m) => { m.bilinmeyen = 1; })), "bilinmeyen madde alanı kabul edildi");
    const duzen = structuredClone(taslak([soru()]));
    (duzen.sorular[0] as Record<string, unknown>).sikGorselDuzeni = "yedi-sutun";
    dogrula(reddedilir(duzen), "bilinmeyen şık düzeni kabul edildi");
    const boy = structuredClone(taslak([soru()]));
    (boy.sorular[0] as Record<string, unknown>).sikGorselGenislikMm = 0;
    dogrula(reddedilir(boy), "sıfır şekil genişliği kabul edildi");
  });

  senaryo("model: kimlik yenileme şekilleri korur, çizim belgesi iç kimliklerini yeniler", () => {
    let n = 0;
    const yeni = sinavTaslakKimlikleriniYenile(sinavTaslaginiDogrula(taslak([soru()])), () => `y${++n}`);
    const m = yeni.sorular[0].maddeler;
    dogrula(m.every((x, i) => x.gorselDataUrl === sikMaddeleri()[i].gorselDataUrl && x.id.startsWith("y")), "şekil/kimlik yenilemede bozuldu");
    dogrula(m.every((x) => !!x.cizimVerisi), "çizim belgesi kayboldu");
    dogrula(JSON.stringify(m[0].cizimVerisi).includes('"id":"y') , "çizim iç kimlikleri yenilenmedi");
  });

  senaryo("geri al: şık şekilleri geçmiş anlık görüntüsünden aynen döner", () => {
    const kayit = new GorselAssetKaydi();
    const durum = { sorular: [soru()], baslik: taslak([]).baslik, ayarlar: taslak([]).ayarlar } as never;
    const snap = hafifSnapshotOlustur(durum, kayit);
    dogrula(!snap.includes("data:image"), "anlık görüntü şık görselini satır içi taşıyor");
    const geri = hafifSnapshotGeriYukle(snap, kayit);
    dogrula(geri.sorular[0].maddeler.every((m, i) => m.gorselDataUrl === sikMaddeleri()[i].gorselDataUrl && m.id === `m${i}`), "geri yüklenen şekiller farklı");
  });

  // ── 2. B grubu karıştırma ───────────────────────────────────────────
  senaryo("karıştırma: şekil kendi şıkkıyla gider, dogruSik aynı şekli gösterir", () => {
    let farkliSirayla = 0;
    for (let seed = 1; seed <= 60; seed++) {
      for (const dogru of ["A", "B", "C", "D", "E", undefined]) {
        const s = soru({ id: `q${seed}`, dogruSik: dogru });
        const k = siklariKaristir(s, seed * 7919);
        dogrula(k.maddeler.length === 5, "şık sayısı değişti");
        for (const m of k.maddeler) {
          const orijinal = s.maddeler.find((x) => x.id === m.id)!;
          dogrula(m.gorselDataUrl === orijinal.gorselDataUrl && m.gorselOran === orijinal.gorselOran && m.cizimVerisi === orijinal.cizimVerisi, "şekil şıkkından koptu");
        }
        if (dogru) {
          const dogruMaddeId = `m${HARFLER.indexOf(dogru)}`;
          const yeniIndex = k.maddeler.findIndex((m) => m.id === dogruMaddeId);
          dogrula(k.dogruSik === HARFLER[yeniIndex], `dogruSik yanlış (seed ${seed}, ${dogru} → ${k.dogruSik}, gerçek ${HARFLER[yeniIndex]})`);
          dogrula(k.maddeler[HARFLER.indexOf(k.dogruSik!)].gorselDataUrl === s.maddeler[HARFLER.indexOf(dogru)].gorselDataUrl, "doğru şık başka şekli gösteriyor");
        } else dogrula(k.dogruSik === undefined, "işaretsiz soru işaretlendi");
        if (k.maddeler.some((m, i) => m.id !== `m${i}`)) farkliSirayla++;
      }
    }
    dogrula(farkliSirayla > 100, "karıştırma hiç sıra değiştirmedi");
  });

  senaryo("karıştırma: aynı tohum aynı sıra; cevap anahtarı karıştırılmış sıraya uyar", () => {
    const liste = [soru({ id: "x1", dogruSik: "B" }), soru({ id: "x2", dogruSik: "E" })];
    const a = bGrubuSiklariniKaristir(liste, 1234);
    const b = bGrubuSiklariniKaristir(liste, 1234);
    dogrula(JSON.stringify(a) === JSON.stringify(b), "aynı tohum farklı sonuç");
    const anahtar = cevapAnahtariOlustur(a);
    dogrula(anahtar.every((x, i) => a[i].maddeler[HARFLER.indexOf(x.cevap)].id === (i === 0 ? "m1" : "m4")), "anahtar şekil–harf eşleşmesini bozdu");
  });

  // ── 3. Kopyalama yardımcıları ───────────────────────────────────────
  senaryo("kopyala: kaynak şekil diğer şıklara derin kopyalanır, metin korunur", () => {
    const ms = sikMaddeleri().map((m, i) => i === 0 ? m : { id: m.id, metinHtml: "<p>başlık</p>", puan: null, cevapSatir: 0 } as Madde);
    const k = L.sekliTumSiklaraKopyala(ms, ms[0], ms[0].id);
    dogrula(k[0] === ms[0], "kaynak şık değişti");
    dogrula(k.every((m) => m.gorselDataUrl === ms[0].gorselDataUrl && m.gorselOran === 1.5), "şekil kopyalanmadı");
    dogrula(k[1].metinHtml === "<p>başlık</p>", "şık metni ezildi");
    dogrula(k[1].cizimVerisi !== ms[0].cizimVerisi && JSON.stringify(k[1].cizimVerisi) === JSON.stringify(ms[0].cizimVerisi), "çizim belgesi derin kopyalanmadı");
    const bos = L.sekliKaldir(k[2]);
    dogrula(!("gorselDataUrl" in bos) && !("cizimVerisi" in bos) && bos.metinHtml === "<p>başlık</p>", "şekil kaldırılamadı");
    dogrula(L.sekliTumSiklaraKopyala(ms, {}, undefined) === ms, "şekilsiz kaynak şıkları değiştirdi");
  });

  // ── 4. Yerleşim ─────────────────────────────────────────────────────
  const GEN = 183; // 190 mm içerik − 7 mm numara
  senaryo("düzen: her düzenin sütun/satır sayısı", () => {
    dogrula(L.sekilliSikSutunSayisi("yan5", 5) === 5 && L.sekilliSikSutunSayisi("uc-iki", 5) === 3, "yan5/uc-iki sütunları");
    dogrula(L.sekilliSikSutunSayisi("iki-sutun", 5) === 2 && L.sekilliSikSutunSayisi("tek", 5) === 1, "iki-sutun/tek sütunları");
    dogrula(L.sekilliSikSutunSayisi("yan5", 3) === 3, "3 şıkta yan5 3 sütun olmalı");
    const o = (d: "yan5" | "uc-iki" | "iki-sutun" | "tek") => L.sekilliSikOlcusu(soru({ sikGorselDuzeni: d }), GEN);
    dogrula(o("yan5").satir === 1 && o("uc-iki").satir === 2 && o("iki-sutun").satir === 3 && o("tek").satir === 5, "satır sayıları (1/2/3/5) yanlış");
  });

  senaryo("yükseklik: her düzen için kapalı formül ve artan sıra (sabit şekil boyu)", () => {
    const yuk = (d: "yan5" | "uc-iki" | "iki-sutun" | "tek") =>
      L.sekilliSikYuksekligiMm(soru({ sikGorselDuzeni: d, sikGorselGenislikMm: 30 }), GEN);
    const o = L.sekilliSikOlcusu(soru({ sikGorselDuzeni: "yan5", sikGorselGenislikMm: 30 }), GEN);
    dogrula(Math.abs(o.kutuYukMm - 30 / 1.5) < 1e-6, `şekil kutusu 30/1.5 olmalı, ${o.kutuYukMm}`);
    const satirMm = o.harfYukMm + L.SEKILLI_SIK_HARF_ARASI_MM + o.kutuYukMm;
    const beklenen = (satir: number) => satir * satirMm + (satir - 1) * L.SEKILLI_SIK_SATIR_ARASI_MM;
    const gercek = { yan5: yuk("yan5"), uc: yuk("uc-iki"), iki: yuk("iki-sutun"), tek: yuk("tek") };
    dogrula(Math.abs(gercek.yan5 - beklenen(1)) < 1e-6, `yan5 ${gercek.yan5} ≠ ${beklenen(1)}`);
    dogrula(Math.abs(gercek.uc - beklenen(2)) < 1e-6, `3+2 ${gercek.uc} ≠ ${beklenen(2)}`);
    dogrula(Math.abs(gercek.iki - beklenen(3)) < 1e-6, `2 sütun ${gercek.iki} ≠ ${beklenen(3)}`);
    dogrula(Math.abs(gercek.tek - beklenen(5)) < 1e-6, `tek ${gercek.tek} ≠ ${beklenen(5)}`);
    dogrula(gercek.yan5 < gercek.uc && gercek.uc < gercek.iki && gercek.iki < gercek.tek, "yükseklikler artmıyor");
  });

  senaryo("yükseklik: başlık metni yüksekliği artırır; şekilsiz şık yüksekliği düşürmez", () => {
    const duz = soru({ sikGorselDuzeni: "yan5", sikGorselGenislikMm: 30 });
    const basl = soru({ sikGorselDuzeni: "yan5", sikGorselGenislikMm: 30, maddeler: sikMaddeleri(undefined, "Kapalı devre ") });
    dogrula(L.sekilliSikYuksekligiMm(basl, GEN) > L.sekilliSikYuksekligiMm(duz, GEN), "başlık yükseklik eklemedi");
    const karisik = soru({ sikGorselDuzeni: "iki-sutun", sikGorselGenislikMm: 30 });
    karisik.maddeler = karisik.maddeler.map((m, i) => i === 4 ? { id: m.id, metinHtml: "", puan: null, cevapSatir: 0 } : m);
    dogrula(L.sekilliSikYuksekligiMm(karisik, GEN) > 0, "karışık şık yüksekliği 0");
  });

  senaryo("otomatik düzen: oran + genişliğe göre; dar sütunda daha az sütun", () => {
    const kare = soru({ maddeler: sikMaddeleri([1, 1, 1, 1, 1]) });
    const genis = soru({ maddeler: sikMaddeleri([2, 2, 2, 2, 2]) });
    dogrula(L.sekilliSikOtomatikDuzen(kare, GEN) === "yan5", "geniş sayfada kare şekiller 5 yan yana olmalı");
    dogrula(L.sekilliSikOtomatikDuzen(genis, GEN) === "uc-iki", "geniş (2:1) şekiller 3+2 olmalı");
    const sutun = 83; // iki sütunlu sayfada tek sütun içeriği
    dogrula(L.sekilliSikOtomatikDuzen(kare, sutun) === "iki-sutun", "dar sütunda kare şekiller 2 sütun olmalı");
    dogrula(L.sekilliSikOtomatikDuzen(genis, 60) === "tek", "çok dar alanda tek sütun olmalı");
    dogrula(L.sekilliSikOtomatikDuzen(soru({ maddeler: sikMaddeleri([1, 1, 1, 1]) }), 100) === "iki-sutun", "4 şıkta 3+1 seçilmemeli");
    dogrula(L.sekilliSikDuzeniCoz(soru({ sikGorselDuzeni: "tek" }), GEN) === "tek", "elle seçim yok sayıldı");
    const istenen = soru({ maddeler: sikMaddeleri([1, 1, 1, 1, 1]), sikGorselGenislikMm: 50 });
    dogrula(L.sekilliSikOtomatikDuzen(istenen, GEN) === "uc-iki", "50 mm istenince 5 yan yana sığmaz");
    const o = L.sekilliSikOlcusu(soru({ sikGorselDuzeni: "yan5", sikGorselGenislikMm: 100 }), GEN);
    dogrula(Math.max(...o.gorselMm) <= o.hucreMm + 1e-9, "şekil hücreden geniş");
  });

  senaryo("ölçek: PNG genişliği bilinen şekiller aynı ölçekle çizilir, kutu ortak", () => {
    const ms = sikMaddeleri([1.5, 1.5, 1.5, 1.5, 1.5]);
    ms[0].gorselDataUrl = png(600, 400); ms[0].gorselOran = 1.5;
    ms[1].gorselDataUrl = png(300, 200); ms[1].gorselOran = 1.5;
    const o = L.sekilliSikOlcusu(soru({ maddeler: ms, sikGorselDuzeni: "yan5" }), GEN);
    dogrula(Math.abs(o.gorselMm[0] / o.gorselMm[1] - 2) < 1e-6, "ölçek şıktan şıka değişti (2:1 beklenir)");
    dogrula(o.kutuYukMm >= o.gorselMm[0] / 1.5 - 1e-9, "kutu en yüksek şekli almıyor");
    const dev = soru({ maddeler: sikMaddeleri([0.2, 1, 1, 1, 1]), sikGorselDuzeni: "tek" });
    dogrula(L.sekilliSikOlcusu(dev, GEN).kutuYukMm <= L.SEKILLI_SIK_AZAMI_YUKSEKLIK_MM + 1e-9, "çok uzun şekil yükseklik sınırını aştı");
  });

  senaryo("tahmin + sayfalama: kabaTahminMm şekilli ızgarayı sayar; test dışı kipte saymaz", () => {
    const s = soru({ sikGorselDuzeni: "tek", sikGorselGenislikMm: 40 });
    const sekilli = kabaTahminMm(s, 190, true);
    dogrula(sekilli > L.sekilliSikYuksekligiMm(s, GEN), "tahmin ızgara yüksekliğini içermiyor");
    dogrula(kabaTahminMm(s, 190, false) < sekilli, "yazılı kipinde şekilli düzen sayılmamalı");
    const kisa = soru({ id: "k", maddeler: [], dogruSik: undefined });
    const sayfalar = sayfalariOlustur([kisa, s, s], (q) => kabaTahminMm(q, 190, true), { ciftSutun: false, kapasiteIlkMm: 100, kapasiteDevamMm: 230 });
    dogrula(sayfalar.length >= 2 && sayfalar.flatMap((p) => p.bantlar).length === 3, "yüksek şekilli sorular sayfalara bölünmedi");
    dogrula(sayfalar.every((p) => p.bantlar.length === 1 || p.kullanilanMm <= p.kapasiteMm + 1e-6), "sayfa kapasitesi aşıldı");
    dogrula(!bolunebilirMi(s), "şekilli şık ızgarası sayfalar arasında bölünmemeli");
    dogrula(bolunebilirMi(soru({ maddeler: [{ id: "a", metinHtml: "x", puan: null, cevapSatir: 0 }] })), "metin şıklı soru bölünebilirliğini yitirdi");
  });

  // ── 5. Kâğıttaki sıra ───────────────────────────────────────────────
  const goster = (s: Soru, testModu = true) =>
    renderToStaticMarkup(React.createElement(SoruIcerik, { soru: s, sira: 1, icerikGenislikMm: 190, tasarimModu: false, yazdirmaModu: true, testModu }));

  senaryo("kâğıt: A–E hücreleri sırayla, harf şeklin üstünde, şekil doğru şıkta", () => {
    const html = goster(soru({ sikGorselDuzeni: "uc-iki", maddeler: sikMaddeleri([1.5, 1.5, 1.5, 1.5, 1.5], "Devre ") }));
    const govde = dom.window.document.implementation.createHTMLDocument("").body;
    govde.innerHTML = html;
    const izgara = govde.querySelector('[data-testid="sekilli-sik-izgara"]');
    dogrula(izgara && izgara.getAttribute("data-sekilli-sik-duzen") === "uc-iki", "ızgara/düzen işareti yok");
    dogrula(/repeat\(3,/.test((izgara as HTMLElement).getAttribute("style") ?? ""), "3+2 için 3 sütunlu ızgara beklenir");
    const hucreler = [...izgara!.querySelectorAll("[data-sekilli-sik]")];
    dogrula(hucreler.map((h) => h.getAttribute("data-sekilli-sik")).join("") === "ABCDE", "hücre sırası A–E değil");
    hucreler.forEach((h, i) => {
      const cocuklar = [...h.children];
      dogrula(cocuklar[0].textContent === `${HARFLER[i]})`, `${HARFLER[i]} hücresinde harf ilk sırada değil`);
      const img = h.querySelector("img");
      dogrula(img?.getAttribute("src") === sikMaddeleri()[i].gorselDataUrl, `${HARFLER[i]} hücresinde yanlış şekil`);
      dogrula(h.textContent?.endsWith(`Devre ${HARFLER[i]}`), `${HARFLER[i]} başlığı şeklin altında değil`);
      dogrula(h.innerHTML.indexOf("<img") < h.innerHTML.indexOf(`Devre ${HARFLER[i]}`), "başlık şekilden önce");
    });
    dogrula(!govde.innerHTML.includes("data-madde-oge"), "şekilli hücreler metin şık işaretini taşıyor");
    // Soru kökü şıklardan önce
    dogrula(govde.innerHTML.indexOf("şematik") < govde.innerHTML.indexOf("sekilli-sik-izgara"), "soru kökü şıklardan sonra");
  });

  senaryo("kâğıt: her düzen kendi sütun sayısını verir; B grubu kâğıdında şekiller yeni sırayla", () => {
    for (const [d, k] of [["yan5", 5], ["iki-sutun", 2], ["tek", 1]] as const) {
      const h = goster(soru({ sikGorselDuzeni: d }));
      dogrula(h.includes(`repeat(${k},`), `${d} için ${k} sütun beklenir`);
    }
    const k = siklariKaristir(soru({ dogruSik: "C" }), 99);
    const html = goster(k);
    const govde = dom.window.document.implementation.createHTMLDocument("").body;
    govde.innerHTML = html;
    [...govde.querySelectorAll("[data-sekilli-sik]")].forEach((h, i) => {
      dogrula(h.querySelector("img")?.getAttribute("src") === k.maddeler[i].gorselDataUrl, "B kâğıdında şekil sırası karışık sırayla uyuşmuyor");
    });
  });

  senaryo("kâğıt: şekilsiz (yalnız metin) şıklar eski davranışla çizilir; yazılı kipinde şekil çizilmez", () => {
    const metinSik = (n: number): Madde[] => Array.from({ length: n }, (_, i) => ({ id: `t${i}`, metinHtml: `<p>Şık ${i}</p>`, puan: null, cevapSatir: 0 }));
    const duz = soru({ maddeler: metinSik(4) });
    const duzSikGorselAyarli = soru({ maddeler: metinSik(4), sikGorselDuzeni: "tek", sikGorselGenislikMm: 40 });
    dogrula(goster(duz) === goster(duzSikGorselAyarli), "şekilsiz soruda şekilli düzen ayarı çıktıyı değiştirdi");
    dogrula(!goster(duz).includes("sekilli-sik-izgara") && goster(duz).includes("data-madde-oge"), "metin şıklar eski kapta çizilmiyor");
    const yazili = goster(soru(), false);
    dogrula(!yazili.includes("sekilli-sik-izgara") && !yazili.includes("<img"), "yazılı kipinde şık şekilleri çizilmemeli");
  });

  console.log("TÜM ŞEKİLLİ ŞIK SENARYOLARI BAŞARILI");
}

calistir().catch((hata) => {
  console.error(hata);
  process.exit(1);
});
