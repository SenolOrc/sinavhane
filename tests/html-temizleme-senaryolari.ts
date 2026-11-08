// `modules/sinav-olusturucu/security/html.ts` — zengin metin sanitizer'ı.
//
// NEDEN bu test var: bu dosya, öğretmenin yazdığı/yapıştırdığı ham HTML ile
// A4 kâğıdına basılan içerik arasındaki TEK kapı. Buradaki her kural bir
// saldırı yüzeyini ya da bir çıktı bozulmasını kapatıyor ve hepsi yorumlarla
// gerekçelendirilmiş — ama hiçbiri test edilmiyordu. Faz D'nin geri kalanı
// (dosya bölme, hook çıkarma) bu dosyaya dokunacak; önce ağ atılıyor.
//
// Kurulum notu: DOMPurify v2 MODÜL YÜKLENİRKEN `window`'a bakar; yoksa
// `isSupported = false` erken dönüşüne girer ve `sanitize` HİÇ tanımlanmaz.
// Bundan iki sonuç çıkıyor, ikisi de bu dosyanın kurulumunu belirliyor:
//
//  1. `html.ts` statik import EDİLEMEZ — jsdom global'leri kurulduktan SONRA
//     dinamik import ediliyor. (Aynı sınıf tuzak react-dom için
//     `sinavlarim-ekrani-senaryolari.tsx`'te açıklanmıştı.)
//  2. Bu testin esbuild komutu ötekilerden FARKLI: `--packages=external`
//     yerine `--external:jsdom`. Sebebi 1'in devamı — external bırakılan
//     `dompurify`, dinamik import'un içinde kalsa bile ESM'de en üste hoist
//     edilen gerçek bir `import` deyimine dönüşür ve jsdom kurulmadan
//     değerlendirilir. Bundle'a dâhil edilince html.ts'in tembel parçasıyla
//     birlikte, doğru anda çalışır. Bu satırı `--packages=external` yapan
//     biri "DOMPurify.sanitize is not a function" ile karşılaşır.
import { JSDOM } from "jsdom";

function dogrula(kosul: unknown, mesaj: string) {
  if (!kosul) throw new Error(`HTML TEMİZLEME TESTİ BAŞARISIZ: ${mesaj}`);
}

function senaryo(ad: string, calistir: () => void) {
  calistir();
  console.log(`✓ ${ad}`);
}

// Regex'i (`^data:image/png;base64,[A-Za-z0-9+/=]+$`) geçen en kısa geçerli
// gövde; testin görsel yolunu denemesi için içeriğinin çözülebilir olması
// gerekmiyor, sanitizer baytları hiç açmıyor.
const GECERLI_PNG = "data:image/png;base64,iVBORw0KGgo=";

async function calistir() {
  const dom = new JSDOM("<!doctype html><body></body>", { url: "http://localhost/" });
  Object.assign(globalThis, {
    window: dom.window,
    document: dom.window.document,
    HTMLElement: dom.window.HTMLElement,
    HTMLImageElement: dom.window.HTMLImageElement,
    Node: dom.window.Node,
  });

  const { htmlTemizle } = await import("../src/modules/sinav-olusturucu/security/html");

  // Çıktıyı sorgulanabilir hâle getirmek için ayrı bir INERT belgede ayrıştır:
  // temizlenmiş sonucu bile aktif belgeye yazmak, testin kendisinin kaçırdığı
  // bir açığı tetikleyebilirdi.
  const cozumleyici = dom.window.document.implementation.createHTMLDocument("");
  function ayristir(html: string) {
    cozumleyici.body.innerHTML = html;
    return cozumleyici.body;
  }

  senaryo("Boş girdi boş dönüyor (çağıranlar '' bekliyor)", () => {
    dogrula(htmlTemizle("") === "", "Boş girdi '' dönmedi.");
  });

  senaryo("Script ve olay öznitelikleri hiçbir yoldan geçemiyor", () => {
    const cikti = htmlTemizle(
      '<p onclick="kotu()">Soru</p><script>kotu()</script>' +
        '<img src="x" onerror="kotu()"><svg onload="kotu()"></svg>',
    );
    dogrula(!/script/i.test(cikti), "<script> etiketi çıktıda kaldı.");
    dogrula(!/on\w+\s*=/i.test(cikti), `Olay özniteliği çıktıda kaldı: ${cikti}`);
    dogrula(!/svg/i.test(cikti), "<svg> etiketi çıktıda kaldı.");
    dogrula(cikti.includes("Soru"), "Meşru metin de silinmiş.");
  });

  senaryo("Ham HTML aktif belgeye hiç yazılmıyor (inert ayrıştırma)", () => {
    // html.ts'in en kritik yorumu bu: ham HTML'i AKTİF belgeye ait bir düğüme
    // yazmak inert DEĞİLDİR, <img onerror> DOMPurify hiç çalışmadan tetiklenir.
    // Doğrudan "olay tetiklendi mi" ölçülemez (jsdom varsayılan olarak kaynak
    // yüklemez, yani onerror zaten hiç ateşlenmez ve iddia boşa düşerdi).
    // Ölçülebilir ve gerçekten koruyucu olan şey: temizleme işleminden sonra
    // AKTİF belgede tek bir düğüm bile birikmiş olmamalı — inert belge yerine
    // `document.body`/geçici bir div kullanan bir yeniden yazım burada patlar.
    const oncekiHtml = dom.window.document.body.innerHTML;
    const oncekiCocuk = dom.window.document.body.childNodes.length;
    htmlTemizle('<img src="x" onerror="kotu()"><p>metin</p>');
    dogrula(
      dom.window.document.body.innerHTML === oncekiHtml &&
        dom.window.document.body.childNodes.length === oncekiCocuk,
      "Temizleme aktif belgeyi değiştirdi — ham HTML aktif belgede ayrıştırılıyor.",
    );
  });

  senaryo("İzinli etiketler korunuyor, gerisi düşüyor (metin kalıyor)", () => {
    const cikti = htmlTemizle(
      "<b>k</b><i>i</i><u>a</u><strong>s</strong><em>e</em><sup>2</sup><sub>3</sub>" +
        "<ul><li>bir</li></ul><ol><li>iki</li></ol><p>par</p><br>",
    );
    for (const etiket of ["b", "i", "u", "strong", "em", "sup", "sub", "ul", "ol", "li", "p"]) {
      dogrula(cikti.includes(`<${etiket}>`), `İzinli <${etiket}> silinmiş.`);
    }
    const yasakli = htmlTemizle('<form><h1>hücre</h1></form><a href="javascript:kotu()">bağ</a><div>böl</div>');
    // (table/tr/td/th artık izinli: bkz. "Tablo:" senaryoları.)
    dogrula(!/<(form|h1|a|div)\b/i.test(yasakli), `Yasaklı etiket kaldı: ${yasakli}`);
    dogrula(yasakli.includes("hücre") && yasakli.includes("bağ"), "Yasaklı etiketin METNİ de silinmiş (içerik kaybı).");
  });

  senaryo("execCommand'in vertical-align span'i <sup>/<sub>'a çevriliyor", () => {
    // Chrome'un execCommand("superscript") çıktısı semantik etiket değil,
    // style'lı bir <span>. Dönüşüm DOMPurify'dan ÖNCE yapılmazsa stil süzgeci
    // vertical-align'ı atar ve üst simge sessizce düz metne iner (x² → x2).
    const ust = ayristir(htmlTemizle('x<span style="vertical-align: super">2</span>'));
    dogrula(ust.querySelector("sup")?.textContent === "2", `Üst simge <sup>'a çevrilmedi: ${ust.innerHTML}`);
    const alt = ayristir(htmlTemizle('H<span style="vertical-align: sub">2</span>O'));
    dogrula(alt.querySelector("sub")?.textContent === "2", `Alt simge <sub>'a çevrilmedi: ${alt.innerHTML}`);
    // Tanınmayan vertical-align değeri dönüştürülmemeli, span düz kalmalı.
    const orta = ayristir(htmlTemizle('a<span style="vertical-align: middle">b</span>'));
    dogrula(!orta.querySelector("sup") && !orta.querySelector("sub"), "İlgisiz vertical-align değeri de dönüştürülmüş.");
  });

  senaryo("Stil süzgeci: yalnız punto ve hizalama, ikisi de doğrulanarak", () => {
    const punto = ayristir(htmlTemizle('<p style="font-size: 14pt">m</p>')).querySelector("p")!;
    dogrula(punto.style.fontSize === "14pt", `İzinli punto silinmiş: ${punto.outerHTML}`);
    const hiza = ayristir(htmlTemizle('<p style="text-align: center">m</p>')).querySelector("p")!;
    dogrula(hiza.style.textAlign === "center", `İzinli hizalama silinmiş: ${hiza.outerHTML}`);
    // pt DIŞINDA birim yok: kâğıt yerleşimi punto üzerinden hesaplanıyor,
    // px/em/rem geçerse ölçüm ile çıktı ayrışır.
    const pikselli = ayristir(htmlTemizle('<p style="font-size: 40px">m</p>')).querySelector("p")!;
    dogrula(pikselli.style.fontSize === "", `pt olmayan birim geçti: ${pikselli.outerHTML}`);
    const uydurma = ayristir(htmlTemizle('<p style="text-align: bogus">m</p>')).querySelector("p")!;
    dogrula(uydurma.style.textAlign === "", `Listede olmayan hizalama geçti: ${uydurma.outerHTML}`);
    // Yerleşimi/görünümü ele geçirebilecek her şey düşer.
    const tehlikeli = ayristir(
      htmlTemizle('<p style="position: fixed; top: 0; background: url(http://kotu/x); font-size: 12pt">m</p>'),
    ).querySelector("p")!;
    dogrula(tehlikeli.style.position === "" && tehlikeli.style.background === "", `Beyaz listede olmayan stil geçti: ${tehlikeli.outerHTML}`);
    dogrula(tehlikeli.style.fontSize === "12pt", "Aynı bildirimdeki izinli punto da düşürülmüş.");
  });

  senaryo("Sınıf süzgeci: kapalı listeye tam eşleşen dışında hiçbir class kalmıyor", () => {
    const kesir = ayristir(htmlTemizle('<span class="kesir"><span class="kesir-pay">1</span></span>'));
    dogrula(kesir.querySelector(".kesir") && kesir.querySelector(".kesir-pay"), `Kesir yapısı sınıfları silinmiş: ${kesir.innerHTML}`);
    const kotu = ayristir(htmlTemizle('<span class="kotu">m</span>')).querySelector("span")!;
    dogrula(!kotu.hasAttribute("class"), `Listede olmayan sınıf kaldı: ${kotu.outerHTML}`);
    // Karışık liste: yalnız izinli olan(lar) hayatta kalır — "kesir varsa
    // hepsini geçir" gibi gevşek bir yeniden yazım burada patlar.
    const karisik = ayristir(htmlTemizle('<span class="kesir kotu">m</span>')).querySelector("span")!;
    dogrula(karisik.getAttribute("class") === "kesir", `Karışık sınıf listesi tam süzülmedi: ${karisik.outerHTML}`);
  });

  senaryo("Satır içi görsel: yalnız data:image/png kaynağı kabul ediliyor", () => {
    const gecerli = ayristir(htmlTemizle(`<img class="denklem-inline" src="${GECERLI_PNG}">`));
    dogrula(gecerli.querySelector("img"), "Geçerli denklem görseli silinmiş.");
    for (const kotuSrc of [
      "http://kotu/x.png",
      "https://kotu/x.png",
      "data:image/svg+xml;base64,PHN2Zz4=",
      "data:text/html;base64,PGgxPg==",
      "javascript:kotu()",
    ]) {
      const cikti = ayristir(htmlTemizle(`<img class="denklem-inline" src="${kotuSrc}">`));
      dogrula(!cikti.querySelector("img"), `Reddedilmesi gereken kaynak geçti: ${kotuSrc}`);
    }
  });

  senaryo("Denklem/çizim olmayan görsel siliniyor", () => {
    // Bu modülde satır içi <img>'in TEK meşru kullanımı denklem ve çizim.
    // İşaretsiz bir görsel, kaynağı geçerli olsa bile geçmemeli.
    const cikti = ayristir(htmlTemizle(`<img src="${GECERLI_PNG}">`));
    dogrula(!cikti.querySelector("img"), "İşaretsiz görsel geçti.");
    // İşaret class'tan da dataset'ten de okunabilmeli (ikisi de kullanılıyor).
    const dataIleCizim = ayristir(htmlTemizle(`<img src="${GECERLI_PNG}" data-cizim="{}">`)).querySelector("img");
    dogrula(dataIleCizim?.getAttribute("class") === "cizim-inline", "data-cizim ile işaretli görsel tanınmadı.");
  });

  senaryo("Görsel öznitelikleri sıfırdan kuruluyor, kimlik/veri korunuyor", () => {
    const img = ayristir(
      htmlTemizle(
        `<img class="denklem-inline kotu" src="${GECERLI_PNG}" data-denklem-id="d1" data-denklem="{&quot;p&quot;:1}"` +
          ' id="ele-gecir" width="9999" onclick="kotu()" style="height: 40px; position: fixed">',
      ),
    ).querySelector("img")!;
    dogrula(!img.hasAttribute("id") && !img.hasAttribute("width") && !img.hasAttribute("onclick"), `Beklenmedik öznitelik kaldı: ${img.outerHTML}`);
    dogrula(img.getAttribute("class") === "denklem-inline", `class sıfırdan kurulmadı: ${img.outerHTML}`);
    dogrula(img.getAttribute("alt") === "denklem", "alt yeniden yazılmadı.");
    dogrula(img.style.position === "", "Görselde beyaz listede olmayan stil kaldı.");
    // Bu ikisi taşınmazsa denklem bir daha DÜZENLENEMEZ hâle gelir — görsel
    // kalır ama üzerine tıklayınca açılacak belge kaybolur.
    dogrula(img.dataset.denklemId === "d1", "data-denklem-id kayboldu — denklem düzenlenemez hâle gelir.");
    dogrula(img.dataset.denklem === '{"p":1}', `data-denklem kayboldu: ${img.outerHTML}`);
  });

  senaryo("ALLOW_DATA_ATTR kapalı: sayılan dördü kalıyor, diğer data-* düşüyor", () => {
    // html.ts'in yorumu bu iddiayı açıkça kuruyor. Bayrak açıkken TÜM data-*
    // öznitelikleri listenin üstüne ekleniyordu; kapatıldı ama dördünün
    // korunduğu hiç doğrulanmamıştı.
    const img = ayristir(
      htmlTemizle(`<img class="cizim-inline" src="${GECERLI_PNG}" data-cizim-id="c1" data-cizim="{}" data-kotu="x">`),
    ).querySelector("img")!;
    dogrula(img.dataset.cizimId === "c1" && img.dataset.cizim === "{}", `Çizim kimliği/verisi düştü: ${img.outerHTML}`);
    dogrula(img.dataset.kotu === undefined, `Listede olmayan data-* geçti: ${img.outerHTML}`);
    const span = ayristir(htmlTemizle('<span data-kotu="x">m</span>')).querySelector("span")!;
    dogrula(!span.hasAttribute("data-kotu"), `Görsel dışında da data-* geçti: ${span.outerHTML}`);
  });

  senaryo("Görsel yüksekliği güvenli aralığa sıkıştırılıyor", () => {
    // Sınırsız yükseklik satır içi bir görselle sayfa yerleşimini bozar
    // (ölçüm sayfalamayı buna göre yapar); 0/negatif ise görsel yok olur.
    function yukseklik(stil: string) {
      const img = ayristir(htmlTemizle(`<img class="denklem-inline" src="${GECERLI_PNG}" style="${stil}">`)).querySelector("img")!;
      return img.style.height;
    }
    dogrula(yukseklik("height: 40px") === "40px", "Aralıktaki yükseklik korunmadı.");
    dogrula(yukseklik("height: 9999px") === "200px", "Üst sınır uygulanmadı.");
    dogrula(yukseklik("height: 1px") === "10px", "Alt sınır uygulanmadı.");
    // Birimsiz/anlaşılmayan yükseklik varsayılana düşer, silinmez.
    dogrula(yukseklik("height: 3em") === "32px", "Tanınmayan yükseklik varsayılana düşmedi.");
    dogrula(yukseklik("") === "32px", "Yükseklik yokken varsayılan uygulanmadı.");
    const img = ayristir(htmlTemizle(`<img class="denklem-inline" src="${GECERLI_PNG}">`)).querySelector("img")!;
    // Tailwind preflight img{display:block} veriyor; bu iki satır olmadan
    // görsel kendi satırına düşer (yorumdaki savunma katmanı).
    dogrula(img.style.display === "inline-block", "Satır içi kalma güvencesi (display) kayboldu.");
    dogrula(img.style.verticalAlign === "middle", "Satır içi hizalama kayboldu.");
  });

  senaryo("Enter'ın ürettiği <div> satır ayrımı korunuyor (<p>'ye çevrilir)", () => {
    const k = ayristir(htmlTemizle("Birinci<div>İkinci</div><div><br></div><div>Dördüncü</div>"));
    dogrula(!k.querySelector("div"), "div kaldı.");
    const ps = Array.from(k.querySelectorAll("p")).map((p) => p.textContent);
    dogrula(ps.length === 3 && ps[0] === "İkinci" && ps[2] === "Dördüncü", `Paragraflar bozuldu: ${k.innerHTML}`);
    dogrula(!k.innerHTML.includes("İkinciDördüncü") && !k.innerHTML.includes("Birinciİkinci"), "Satırlar birleşti.");
    const ic = ayristir(htmlTemizle("<div><p>A</p><div>B</div></div>"));
    dogrula(!ic.querySelector("div") && ic.querySelectorAll("p").length === 2, `İç içe div: ${ic.innerHTML}`);
    // Güvenlik zayıflamadı: div üzerindeki olay işleyici/stil yine siliniyor.
    const kotu = ayristir(htmlTemizle('<div onclick="x()" style="position:fixed">Z</div>'));
    dogrula(!kotu.innerHTML.includes("onclick") && !kotu.innerHTML.includes("position"), `Saldırı yüzeyi: ${kotu.innerHTML}`);
  });

  senaryo("Tablo: table/tr/td/th güvenli biçimde korunuyor (stilsiz, işleyicisiz)", () => {
    const k = ayristir(htmlTemizle(
      '<table style="position:fixed;background:red" onclick="kotu()" class="x" border="1">' +
        '<thead><tr><th style="color:red" onmouseover="kotu()" colspan="9">x</th><th>f(x)</th></tr></thead>' +
        '<tbody><tr><td rowspan="3" style="width:9999px">0,9</td><td onclick="kotu()">1,8</td></tr></tbody></table>',
    ));
    const tablo = k.querySelector("table");
    dogrula(!!tablo, `Tablo silinmiş: ${k.innerHTML}`);
    dogrula(tablo!.getAttribute("class") === "soru-tablo", "Tabloya yalnız soru-tablo sınıfı verilmeli.");
    dogrula(k.querySelectorAll("th").length === 2 && k.querySelectorAll("td").length === 2 && k.querySelectorAll("tr").length === 2, `Hücre yapısı bozuldu: ${k.innerHTML}`);
    for (const el of Array.from(k.querySelectorAll("table, thead, tbody, tr, td, th"))) {
      const adlar = Array.from(el.attributes).map((o) => o.name);
      const izinli = el.tagName === "TABLE" ? ["class"] : [];
      dogrula(adlar.every((a) => izinli.includes(a)), `<${el.tagName.toLowerCase()}> öznitelik taşıyor: ${adlar.join(",")}`);
    }
    dogrula(!/on\w+\s*=|style|colspan|rowspan|border/i.test(k.innerHTML), `Tehlikeli/stil özniteliği kaldı: ${k.innerHTML}`);
    dogrula(k.textContent!.includes("0,9") && k.textContent!.includes("f(x)"), "Hücre metni kaybolmuş.");
  });

  senaryo("Tablo: iç içe tablo düzleşiyor, dev tablo sınırlanıyor, boş tablo düşüyor", () => {
    const ic = ayristir(htmlTemizle("<table><tr><td>A<table><tr><td>B</td></tr></table></td></tr></table>"));
    dogrula(ic.querySelectorAll("table").length === 1, `İç içe tablo kaldı: ${ic.innerHTML}`);
    dogrula(ic.textContent!.includes("A") && ic.textContent!.includes("B"), "İç içe tablonun metni kaybolmuş.");
    const buyuk = "<table>" + "<tr>" + "<td>x</td>".repeat(30) + "</tr>".repeat(1) + "<tr><td>y</td></tr>".repeat(40) + "</table>";
    const b = ayristir(htmlTemizle(buyuk));
    dogrula(b.querySelectorAll("tr").length === 20, `Satır sınırı uygulanmadı: ${b.querySelectorAll("tr").length}`);
    dogrula(b.querySelector("tr")!.children.length === 20, "Sütun sınırı uygulanmadı.");
    dogrula(!ayristir(htmlTemizle("<table></table><p>x</p>")).querySelector("table"), "Boş tablo kaldı.");
  });

  senaryo("Tablo: hücre içinde script/olay/görsel kuralları aynen geçerli", () => {
    const k = ayristir(htmlTemizle(
      '<table><tr><td><script>kotu()</script><img src="x" onerror="kotu()">ok<sup>2</sup></td></tr></table>',
    ));
    dogrula(!/script|onerror|<img/i.test(k.innerHTML), `Hücrede tehlikeli içerik: ${k.innerHTML}`);
    dogrula(k.querySelector("td sup")?.textContent === "2", "Hücredeki üst simge korunmalı.");
    // İdempotent: iki kez temizlemek sonucu değiştirmez (editör her girişte yeniden temizliyor).
    const bir = htmlTemizle('<table><tr><th>x</th><td>1</td></tr></table>');
    dogrula(htmlTemizle(bir) === bir, "Tablo temizliği idempotent değil.");
  });

  senaryo("Fotoğraf: yalnız uygulamanın ürettiği JPEG kalır, boyut ve öznitelikler sınırlanır", () => {
    const jpeg = "data:image/jpeg;base64,/9j/4AAQSkZJRg==";
    const iyi = ayristir(htmlTemizle(`<p><img class="foto-inline" src="${jpeg}" onerror="kotu()" style="height:9999px" data-x="1"></p>`));
    const img = iyi.querySelector("img.foto-inline") as HTMLImageElement | null;
    dogrula(!!img, "Geçerli fotoğraf silindi.");
    dogrula(img!.style.height === "400px", `Fotoğraf yüksekliği 400 px ile sınırlanmalı: ${img!.style.height}`);
    dogrula(!/onerror|data-x/.test(iyi.innerHTML), "Fotoğrafta fazladan öznitelik kaldı.");
    dogrula(!ayristir(htmlTemizle(`<img class="foto-inline" src="https://ornek.com/a.jpg">`)).querySelector("img"), "Dış bağlantılı resim kalmamalı.");
    dogrula(!ayristir(htmlTemizle(`<img class="foto-inline" src="data:image/svg+xml;base64,PHN2Zz4=">`)).querySelector("img"), "SVG fotoğraf kalmamalı.");
    dogrula(!ayristir(htmlTemizle(`<img src="${jpeg}">`)).querySelector("img"), "Sınıfsız JPEG kalmamalı.");
    const hucre = ayristir(htmlTemizle(`<table><tr><td><img class="foto-inline" src="${jpeg}"></td></tr></table>`));
    dogrula(!!hucre.querySelector("td img.foto-inline"), "Tablo hücresindeki fotoğraf silindi.");
    const bir = htmlTemizle(`<p><img class="foto-inline" src="${jpeg}" style="height:120px"></p>`);
    dogrula(htmlTemizle(bir) === bir, "Fotoğraf temizliği idempotent değil: " + bir + " ≠ " + htmlTemizle(bir));
  });

  console.log("TÜM HTML TEMİZLEME SENARYOLARI BAŞARILI");
}

calistir().catch((hata) => {
  console.error(hata);
  process.exit(1);
});
