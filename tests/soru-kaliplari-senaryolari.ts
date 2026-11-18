// Soru kalıpları (öncüllü / D-Y tablosu / ✓ kutucuk), sabit veriler satırı,
// noktalı cevap alanı ve madde başına cevap alanı.
//
// Kurulum notu: html-temizleme-senaryolari.ts ile aynı (jsdom global'leri
// kurulduktan SONRA dinamik import; esbuild `--external:jsdom`).
import { JSDOM } from "jsdom";

function dogrula(kosul: unknown, mesaj: string): asserts kosul {
  if (!kosul) throw new Error(`SORU KALIPLARI TESTİ BAŞARISIZ: ${mesaj}`);
}
function senaryo(ad: string, calistir: () => void) {
  calistir();
  console.log(`✓ ${ad}`);
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

  const K = await import("../src/modules/sinav-olusturucu/kaliplar");
  const { htmlTemizle } = await import("../src/modules/sinav-olusturucu/security/html");
  const { sayfalariOlustur, kabaTahminMm, maddeCevapYuksekligiMm } = await import("../src/modules/sinav-olusturucu/layout/a4");
  const { SATIR_MM, KARE_MM, CEVAP_ALANI_TURLERI } = await import("../src/modules/sinav-olusturucu/constants");
  const { sinavTaslaginiDogrula } = await import("../src/modules/sinav-olusturucu/storage/taslakDosya");
  const React = await import("react");
  const { renderToStaticMarkup } = await import("react-dom/server");
  const { SoruIcerik, CevapAlaniCizgisi, cevapAlaniDeseni } = await import("../src/modules/sinav-olusturucu/components/SinavKagit");
  type Soru = import("../src/modules/sinav-olusturucu/types").SoruOgesi;

  const ayristir = (html: string) => {
    const b = dom.window.document.implementation.createHTMLDocument("").body;
    b.innerHTML = html;
    return b;
  };
  const metin = (html: string) => ayristir(html).textContent ?? "";

  const soru = (ek: Partial<Soru> = {}): Soru => ({
    id: "s1", tur: "metin", metinHtml: "<p>Soru</p>", metinKonumu: "alt", hizalama: "sol", genislikMm: 80,
    boslukMm: 0, punto: 11, puan: null, maddeler: [], maddeKolon: 1, tamGenislik: false, ...ek,
  });

  // ── 1. Noktalı cevap alanı (soru altı) ───────────────────────────────
  senaryo("CevapAlani: 'nokta' sabit listede; desen yalnız cizgi/kare/nokta için var", () => {
    dogrula(CEVAP_ALANI_TURLERI.includes("nokta") && CEVAP_ALANI_TURLERI.length === 4, "tür listesi eksik");
    dogrula(cevapAlaniDeseni("bos") === null && cevapAlaniDeseni(undefined) === null, "boş alan desen almamalı");
    const n = cevapAlaniDeseni("nokta", true)!;
    dogrula(n.backgroundImage.includes("radial-gradient") && n.backgroundSize.startsWith("1.6mm 8mm"), "nokta deseni yanlış: " + JSON.stringify(n));
    dogrula(!n.backgroundImage.includes("#000") && n.backgroundImage.includes("#8a8a8a"), "S/B baskı için açık gri olmalı");
    const k = cevapAlaniDeseni("kare", true)!;
    dogrula(k.backgroundSize.includes("5mm 100%") && !!k.boxShadow, "kare deseni bozuldu");
    dogrula(cevapAlaniDeseni("cizgi", true)!.backgroundSize === "100% 8mm", "çizgi deseni bozuldu");
  });

  senaryo("Soru altı noktalı alan kâğıtta çiziliyor ve yüksekliği satıra yuvarlanıyor", () => {
    const html = (ek: Partial<Soru>) =>
      renderToStaticMarkup(React.createElement(CevapAlaniCizgisi, { soru: soru(ek), yazdirmaModu: true }));
    const nokta = html({ cevapAlani: "nokta", boslukMm: 30 });
    dogrula(nokta.includes('data-cevap-alani="nokta"'), "nokta alanı çizilmedi");
    dogrula(nokta.includes("height:24mm"), "30mm boşluk 3 satıra (24mm) yuvarlanmalı: " + nokta.slice(0, 400));
    dogrula(!html({ cevapAlani: "bos", boslukMm: 30 }).includes("data-cevap-alani"), "boş alan çizilmemeli");
    dogrula(!html({ cevapAlani: "nokta", boslukMm: 0 }).includes("data-cevap-alani"), "boşluk 0 iken çizilmemeli");
  });

  // ── 2. Madde başına cevap alanı ──────────────────────────────────────
  senaryo("Madde cevap alanı yüksekliği: bos/cizgi/nokta = satır × SATIR_MM, kare tam karelere iner, test kipinde 0", () => {
    dogrula(maddeCevapYuksekligiMm({ cevapSatir: 3, cevapAlani: "nokta" }) === 3 * SATIR_MM, "nokta");
    dogrula(maddeCevapYuksekligiMm({ cevapSatir: 3 }) === 3 * SATIR_MM, "alanı olmayan eski madde değişmemeli");
    dogrula(maddeCevapYuksekligiMm({ cevapSatir: 3, cevapAlani: "cizgi" }) === 24, "cizgi");
    dogrula(maddeCevapYuksekligiMm({ cevapSatir: 3, cevapAlani: "kare" }) === 20, "kare 24mm → 20mm (4 kare)");
    dogrula(maddeCevapYuksekligiMm({ cevapSatir: 1, cevapAlani: "kare" }) === 5, "kare 8mm → 5mm");
    dogrula(maddeCevapYuksekligiMm({ cevapSatir: 0, cevapAlani: "kare" }) === 0, "0 satır = alan yok");
    dogrula(maddeCevapYuksekligiMm({ cevapSatir: 3, cevapAlani: "nokta" }, true) === 0, "test kipinde alan yok");
  });

  senaryo("Kâğıt: her madde kendi alanını, kendi metninden HEMEN sonra çiziyor; test kipinde hiç çizmiyor", () => {
    const maddeler = [
      { id: "a", metinHtml: "<p>BİRİNCİ</p>", puan: null, cevapSatir: 3, cevapAlani: "kare" as const },
      { id: "b", metinHtml: "<p>İKİNCİ</p>", puan: null, cevapSatir: 2, cevapAlani: "nokta" as const },
      { id: "c", metinHtml: "<p>ÜÇÜNCÜ</p>", puan: null, cevapSatir: 2, cevapAlani: "cizgi" as const },
      { id: "d", metinHtml: "<p>DÖRDÜNCÜ</p>", puan: null, cevapSatir: 1 },
    ];
    const s = soru({ maddeler });
    const ciz = (testModu: boolean) =>
      renderToStaticMarkup(React.createElement(SoruIcerik, { soru: s, sira: 1, icerikGenislikMm: 180, tasarimModu: false, yazdirmaModu: true, testModu }));
    const yazili = ciz(false);
    const alanlar = [...yazili.matchAll(/data-testid="madde-cevap-alani" data-cevap-alani="(\w+)"/g)].map((m) => m[1]);
    dogrula(alanlar.join() === "kare,nokta,cizgi,bos", "alan türleri/sırası yanlış: " + alanlar.join());
    dogrula(yazili.includes("height:20mm") && yazili.includes("height:16mm") && yazili.includes("height:8mm"), "yükseklikler yanlış");
    const sira = ["BİRİNCİ", "data-cevap-alani=\"kare\"", "İKİNCİ", "data-cevap-alani=\"nokta\"", "ÜÇÜNCÜ", "data-cevap-alani=\"cizgi\"", "DÖRDÜNCÜ"].map((x) => yazili.indexOf(x));
    dogrula(sira.every((v, i) => v >= 0 && (i === 0 || v > sira[i - 1])), "alan, kendi maddesinden sonra gelmiyor: " + sira.join());
    dogrula(!ciz(true).includes("madde-cevap-alani"), "test kipinde şık altına alan çizildi");
  });

  senaryo("Sayfalama: madde alanı yüksekliği kaba tahmine giriyor ve sayfa taşırıyor", () => {
    const bos = soru({ maddeler: [{ id: "a", metinHtml: "x", puan: null, cevapSatir: 0 }] });
    const alanli = soru({ maddeler: [{ id: "a", metinHtml: "x", puan: null, cevapSatir: 5, cevapAlani: "nokta" }] });
    const fark = kabaTahminMm(alanli, 180) - kabaTahminMm(bos, 180);
    dogrula(Math.abs(fark - 5 * SATIR_MM) < 0.01, `tahmin farkı 40mm olmalı: ${fark}`);
    dogrula(kabaTahminMm(alanli, 180, true) === kabaTahminMm(bos, 180, true), "test kipinde fark olmamalı");
    // Ölçüm fonksiyonu alanı sayıyorsa (kâğıttaki DOM ölçümü gibi) iki soru bir sayfaya sığmaz.
    const yuk = (q: Soru) => 20 + q.maddeler.reduce((t, m) => t + maddeCevapYuksekligiMm(m), 0);
    const ayar = { ciftSutun: false, kapasiteIlkMm: 100, kapasiteDevamMm: 100 };
    dogrula(sayfalariOlustur([bos, bos], yuk, ayar).length === 1, "alansız iki soru tek sayfaya sığmalı");
    const iki = sayfalariOlustur([alanli, { ...alanli, id: "s2" }], yuk, ayar);
    dogrula(iki.length === 2, `alanlı iki soru (2×60mm) iki sayfa olmalı: ${iki.length}`);
  });

  senaryo("Kaydet/aç: madde.cevapAlani ve 'nokta' doğrulayıcıdan geçiyor; eski kayıt ve geçersiz tür", () => {
    const taslak = (maddeEk: object, soruEk: object = {}) => ({
      surum: "v0.11C", kayitZamani: "2026-08-26T10:00:00.000Z",
      baslik: { okulAdi: "O", sinifSeviyesi: "9", donem: "1", yaziliNo: "1", ders: "Fizik" },
      sorular: [{ ...soru({ maddeler: [{ id: "m", metinHtml: "a", puan: null, cevapSatir: 2, ...maddeEk }] }), ...soruEk }],
      ayarlar: { kenarBosluk: 10, varsayilanSoruBosluk: 20, ogretmenler: ["Ö"], sayfaNoGoster: true, sayfaDuzeni: "cift", sutunAra: 8, sutunAyirici: true },
    });
    const hata = (t: unknown) => { try { sinavTaslaginiDogrula(t); return false; } catch { return true; } };
    dogrula(!hata(taslak({})), "eski madde (cevapAlani yok) açılmalı");
    for (const t of ["bos", "cizgi", "kare", "nokta"]) dogrula(!hata(taslak({ cevapAlani: t })), `madde ${t}`);
    dogrula(!hata(taslak({}, { cevapAlani: "nokta" })), "soru düzeyinde nokta");
    dogrula(hata(taslak({ cevapAlani: "dalga" })), "geçersiz madde alanı reddedilmeli");
    dogrula(hata(taslak({}, { cevapAlani: "dalga" })), "geçersiz soru alanı reddedilmeli");
  });

  // ── 3. Kalıplar ──────────────────────────────────────────────────────
  senaryo("Öncüllü: 3 öncül + bitiş cümlesi; şıklar 5'li, mevcut 4 ise 4'lü", () => {
    const k5 = K.oncullKalibi(0);
    const g = ayristir(k5.kokParcasi);
    const p = [...g.querySelectorAll("p")].map((x) => x.textContent);
    dogrula(p.length === 4 && p[0]!.startsWith("I. ") && p[1]!.startsWith("II. ") && p[2]!.startsWith("III. ") && p[3] === "yargılarından hangileri doğrudur?", "metin yanlış: " + p.join("|"));
    dogrula(k5.siklar.join("|") === "Yalnız I|Yalnız II|I ve II|II ve III|I, II ve III", "5 şık yanlış");
    dogrula(K.oncullKalibi(4).siklar.length === 4 && K.oncullKalibi(4).siklar.at(-1) === "I, II ve III", "4 şık yanlış");
    dogrula(K.oncullKalibi(3).siklar.length === 5 && K.oncullKalibi(5).siklar.length === 5, "4 dışı 5 olmalı");
    const m = K.siklariMaddeYap(k5.siklar);
    dogrula(m.length === 5 && new Set(m.map((x) => x.id)).size === 5 && m.every((x) => x.cevapSatir === 0 && x.puan === null), "Madde üretimi yanlış");
    dogrula(!K.maddelerDoluMu(m.map((x) => ({ ...x, metinHtml: "<p><br></p>" }))) && K.maddelerDoluMu(m), "maddelerDoluMu");
  });

  senaryo("Kök ekleme: mevcut metnin altına eklenir, sondaki boş paragraflar birikmez, çıplak metin <p>'ye sarılır", () => {
    dogrula(K.kokunSonunaEkle("", "<p>X</p>") === "<p>X</p>", "boş kök");
    dogrula(K.kokunSonunaEkle("<p>Soru</p><p><br></p><p><br></p>", "<p>X</p>") === "<p>Soru</p><p>X</p>", "boş paragraflar");
    dogrula(K.kokunSonunaEkle("Çıplak metin", "<p>X</p>") === "<p>Çıplak metin</p><p>X</p>", "çıplak metin");
  });

  senaryo("D/Y tablosu: başlık Önerme|D|Y|Açıklama, N boş satır, sanitizer sınıfı ve yapıyı koruyor", () => {
    const html = htmlTemizle(K.dogruYanlisKalibi());
    const g = ayristir(html);
    const t = g.querySelector("table.soru-tablo.soru-tablo-dy")!;
    dogrula(!!t, "tablo sınıfı sanitizer'dan geçmedi: " + html);
    dogrula([...t.querySelectorAll("th")].map((x) => x.textContent).join("|") === "Önerme|D|Y|Açıklama", "başlık");
    dogrula(t.querySelectorAll("tr").length === 5 && [...t.querySelectorAll("td")].every((x) => (x.textContent ?? "") === ""), "4 boş satır olmalı");
    dogrula(g.querySelector("p")!.textContent === K.DY_YONERGE, "yönerge satırı");
    dogrula(ayristir(htmlTemizle(K.dogruYanlisKalibi(7))).querySelectorAll("tr").length === 8, "satır sayısı parametresi");
    dogrula(ayristir(htmlTemizle(K.dogruYanlisKalibi(99))).querySelectorAll("tr").length === 20, "20 satır sınırı (sanitizer) aşılmamalı");
    dogrula(htmlTemizle(html) === html, "idempotent değil");
    // Normal tablo bu sınıfı almıyor.
    dogrula(htmlTemizle('<table class="soru-tablo-dy"><tr><td>a</td></tr></table>').includes("soru-tablo-dy"), "table üzerindeki sınıf korunmalı");
    dogrula(!htmlTemizle("<table><tr><td>a</td></tr></table>").includes("soru-tablo-dy"), "sınıfsız tabloya sınıf eklendi");
  });

  senaryo("✓ kutucuklu işaretleme: yönerge + her satır ☐ ile başlıyor, sanitizer'dan değişmeden geçiyor", () => {
    const html = htmlTemizle(K.isaretlemeKalibi());
    const p = [...ayristir(html).querySelectorAll("p")].map((x) => x.textContent ?? "");
    dogrula(p[0] === "(Birden fazla doğru seçenek olabilir.)", "yönerge");
    dogrula(p.length === 5 && p.slice(1).every((x) => x.startsWith("☐ ")), "4 kutulu satır olmalı: " + p.join("|"));
    dogrula(htmlTemizle(html) === html, "idempotent değil");
    dogrula(K.isaretlemeKalibi(2).split("☐").length === 3, "satır sayısı parametresi");
  });

  senaryo("Üç kalıp da soru metnine eklenip kâğıtta çiziliyor (S/B: yalnız siyah/gri)", () => {
    const kok = htmlTemizle(K.kokunSonunaEkle("<p>Soru kökü</p>", K.oncullKalibi().kokParcasi) + K.dogruYanlisKalibi() + K.isaretlemeKalibi());
    const s = soru({ metinHtml: kok });
    const html = renderToStaticMarkup(React.createElement(SoruIcerik, { soru: s, sira: 1, icerikGenislikMm: 180, tasarimModu: false, yazdirmaModu: true }));
    dogrula(html.includes("yargılarından hangileri doğrudur?") && html.includes("soru-tablo-dy") && html.includes("☐"), "kalıplar kâğıtta yok");
    dogrula(!/#(?:[0-9a-f]{6})/i.test(html.replace(/#0f172a|#8a8a8a|#475569/gi, "")), "beklenmeyen renk");
  });

  // ── 4. Sabit veriler ─────────────────────────────────────────────────
  senaryo("Sabit veri satırı: seçim sırası katalog sırası, '; ' ile birleşir, 'alınız.' ve not ayrı cümle", () => {
    dogrula(K.sabitVeriSatiri(["g", "sin37"]) === "(g = 10 m/s²; sin37° = 0,6; cos37° = 0,8 alınız.)", K.sabitVeriSatiri(["g", "sin37"]));
    dogrula(K.sabitVeriSatiri(["sin37", "g"]) === K.sabitVeriSatiri(["g", "sin37"]), "sıra seçim sırasına bağlı olmamalı");
    dogrula(K.sabitVeriSatiri(["g", "pi", "surtunme"]) === "(g = 10 m/s²; π = 3 alınız. Sürtünmeler ihmal edilmiştir.)", K.sabitVeriSatiri(["g", "pi", "surtunme"]));
    dogrula(K.sabitVeriSatiri(["surtunme"]) === "(Sürtünmeler ihmal edilmiştir.)", "yalnız not");
    dogrula(K.sabitVeriSatiri(["k"]).includes("k = 9·10⁹ N·m²/C²") && K.sabitVeriSatiri(["sin53"]).includes("sin53° = 0,8; cos53° = 0,6"), "k / 53°");
    dogrula(K.sabitVeriSatiri(["sin30"]).includes("cos30° = √3/2"), "30°");
    dogrula(K.sabitVeriSatiri([]) === "" && K.sabitVeriSatiri(["yok"]) === "", "boş seçim");
  });

  senaryo("Sabit veri satırı metnin SONUNA eklenir; tekrar eklemek çoğaltmaz, günceller", () => {
    const bir = K.sabitVeriSatiriniUygula("<p>Hesaplayınız.</p><p><br></p>", K.sabitVeriSatiri(["g"]));
    dogrula(bir === "<p>Hesaplayınız.</p><p>(g = 10 m/s² alınız.)</p>", bir);
    const iki = K.sabitVeriSatiriniUygula(bir, K.sabitVeriSatiri(["g", "pi"]));
    dogrula(iki === "<p>Hesaplayınız.</p><p>(g = 10 m/s²; π = 3 alınız.)</p>", iki);
    dogrula(K.sabitVeriSatiriniUygula("<p>A</p>", "") === "<p>A</p>", "boş satır metni değiştirmemeli");
    dogrula(htmlTemizle(iki) === iki, "sanitizer satırı bozmamalı");
    // Sıradan parantezli son paragraf (veri satırı değil) ezilmez.
    dogrula(K.sabitVeriSatiriniUygula("<p>(Şekil I)</p>", "(π = 3 alınız.)") === "<p>(Şekil I)</p><p>(π = 3 alınız.)</p>", "alakasız paragraf ezildi");
  });

  senaryo("Sabit veri tercihi localStorage'da tutuluyor; bozuk/erişilemez depoda bellek/varsayılan", () => {
    dom.window.localStorage.clear();
    dogrula(K.sabitSeciminiOku().join() === "g", "varsayılan g olmalı");
    K.sabitSeciminiYaz(["pi", "k"]);
    dogrula(K.sabitSeciminiOku().join() === "pi,k", "kayıt okunamadı");
    dom.window.localStorage.setItem("sinav-sabit-veriler-v1", "{bozuk");
    dogrula(K.sabitSeciminiOku().join() === "pi,k", "bozuk kayıtta bellek değeri beklenir");
    dom.window.localStorage.setItem("sinav-sabit-veriler-v1", JSON.stringify(["pi", "bilinmeyen", 3]));
    dogrula(K.sabitSeciminiOku().join() === "pi", "bilinmeyen kimlikler ayıklanmalı");
    const eski = (globalThis as { localStorage?: Storage }).localStorage;
    Object.defineProperty(globalThis, "localStorage", { configurable: true, get() { throw new Error("erişim yok"); } });
    dogrula(K.sabitSeciminiOku().join() === "pi,k", "erişilemezken bellek değeri beklenir");
    K.sabitSeciminiYaz(["g"]); // patlamamalı
    Object.defineProperty(globalThis, "localStorage", { configurable: true, writable: true, value: eski });
  });

  console.log("TÜM SORU KALIPLARI SENARYOLARI BAŞARILI");
}

calistir().catch((hata) => {
  console.error(hata);
  process.exit(1);
});
