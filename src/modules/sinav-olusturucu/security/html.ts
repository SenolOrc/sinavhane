import DOMPurify from "dompurify";

const IZINLI_HIZALAMA = ["left", "center", "right", "justify"];
// Kesir yapısı (üstte pay, çizgi, altta payda) için sabit, kapalı sınıf listesi —
// class attribute'una izin vermek yerine bu listeye tam eşleşmeyen her şey silinir.
const IZINLI_SINIFLAR = [
  "kesir",
  "kesir-pay",
  "kesir-cizgi",
  "kesir-payda",
  "denklem-inline",
  "cizim-inline",
  "soru-tablo",
];

// Basit soru tablosu (limit/türev değer tablosu, veri tablosu). YALNIZ bu etiketler;
// colspan/rowspan/style/event handler YOK. Kenarlık sınıfla (index.css `.soru-tablo`)
// verilir, bu yüzden tablo her ortamda (ekran, kâğıt, yazdırma) aynı görünür.
const TABLO_BOYUT_SINIRI = 20; // en çok 20 satır / 20 sütun: yapıştırılan dev tabloya karşı

// Tablo öğelerinde HİÇBİR öznitelik kalmaz (tablo kökünde yalnız class="soru-tablo").
// Satır/sütun sınırı da burada uygulanır; hücre içeriği metin/simge/denklem olarak kalır.
function tabloTemizle(kok: HTMLElement) {
  kok.querySelectorAll<HTMLElement>("table").forEach((tablo) => {
    // İç içe tablo: içteki düz içeriğe indirilir (ekranda ve kâğıtta taşma/ölçüm sorunu).
    if (tablo.parentElement?.closest("table")) {
      tablo.replaceWith(...Array.from(tablo.querySelectorAll("td, th")).map((h) => h.textContent ?? ""));
      return;
    }
    tablo.querySelectorAll("tr").forEach((tr, i) => {
      if (i >= TABLO_BOYUT_SINIRI) tr.remove();
      else Array.from(tr.children).forEach((h, j) => { if (j >= TABLO_BOYUT_SINIRI) h.remove(); });
    });
  });
  kok.querySelectorAll<HTMLElement>("table, thead, tbody, tr, td, th").forEach((el) => {
    Array.from(el.attributes).forEach((o) => el.removeAttribute(o.name));
    if (el.tagName === "TABLE") el.setAttribute("class", "soru-tablo");
  });
  // Boş tablo (satırı kalmayan) kalmasın.
  kok.querySelectorAll("table").forEach((t) => {
    if (!t.querySelector("td, th")) t.remove();
  });
}

// GÜVENLİK: Ham HTML'i AKTİF belgeye ait bir düğüme yazmak inert DEĞİLDİR —
// <script> çalışmasa da <img src=x onerror=...> / <svg onload=...> DOMPurify hiç
// çalışmadan tetiklenir. createHTMLDocument tarayıcı bağlamı olmayan ayrı bir belge
// üretir; oraya yazılan içerik kaynak yüklemez ve olay işleyicisi çalıştırmaz.
// Temizlenmemiş HTML SADECE bu belgede ayrıştırılır.
function inertGovde(html: string): HTMLElement {
  const belge = document.implementation.createHTMLDocument("");
  belge.body.innerHTML = html;
  return belge.body;
}

// Chrome execCommand("subscript"/"superscript") <sub>/<sup> değil,
// style="vertical-align: sub|super" ile işaretli <span> üretir. Sanitizer bu stili
// tanımadığından DOMPurify'dan ÖNCE semantik etikete çevirmemiz gerekir.
function altUstSimgeDonustur(html: string) {
  if (typeof window === "undefined") return html;
  const kok = inertGovde(html);
  kok.querySelectorAll<HTMLElement>('span[style*="vertical-align"]').forEach((span) => {
    const dikeyHiza = span.style.verticalAlign;
    if (dikeyHiza !== "sub" && dikeyHiza !== "super") return;
    // Yeni düğüm de inert belgede yaratılmalı: aktif belgeye ait bir elemana
    // temizlenmemiş innerHTML yazmak yukarıdaki korumayı delerdi.
    const yeni = kok.ownerDocument.createElement(dikeyHiza === "sub" ? "sub" : "sup");
    while (span.firstChild) yeni.appendChild(span.firstChild);
    span.replaceWith(yeni);
  });
  return kok.innerHTML;
}

// Chrome/WebView contenteditable'da Enter'a basınca <div> üretir. <div> izinli listede
// olmadığından DOMPurify etiketi soyup içeriği bitişik bırakıyordu ("AB" birleşmesi,
// Enter yeni satır açmıyordu). <div> ÖNCE <p>'ye çevrilir; içinde zaten blok öğe
// (p/div/ul/ol) varsa yalnız sarmalayıcı açılır (iç içe <p> geçersizdir).
function divParagrafaDonustur(html: string) {
  if (typeof window === "undefined" || !/<div[\s>]/i.test(html)) return html;
  const kok = inertGovde(html);
  const divler = Array.from(kok.querySelectorAll("div")).reverse(); // en içten dışa
  divler.forEach((div) => {
    const blokIceriyor = div.querySelector(":scope > p, :scope > div, :scope > ul, :scope > ol") !== null;
    if (blokIceriyor) {
      div.replaceWith(...Array.from(div.childNodes));
      return;
    }
    const p = kok.ownerDocument.createElement("p");
    while (div.firstChild) p.appendChild(div.firstChild);
    div.replaceWith(p);
  });
  return kok.innerHTML;
}

// Satır içi denklem/çizim görseli: gelen style/src/data-* değerlerine güvenilmez,
// her biri sıfırdan doğrulanıp güvenli bir aralığa sıkıştırılarak yeniden kurulur.
// İki türden hangisi olduğu silinmeden ÖNCE class/dataset'ten belirlenir.
function satirIciGorselTemizle(img: HTMLImageElement) {
  const src = img.getAttribute("src") ?? "";
  if (!/^data:image\/png;base64,[A-Za-z0-9+/=]+$/.test(src)) {
    img.remove();
    return;
  }
  const denklemMi = img.classList.contains("denklem-inline") || img.dataset.denklem !== undefined;
  const cizimMi = !denklemMi && (img.classList.contains("cizim-inline") || img.dataset.cizim !== undefined);
  if (!denklemMi && !cizimMi) {
    img.remove();
    return;
  }
  const yukselikMetin = img.style.height.match(/^(\d+(?:\.\d+)?)px$/);
  const yukseklik = yukselikMetin
    ? Math.min(200, Math.max(10, parseFloat(yukselikMetin[1])))
    : 32;
  const denklemId = img.dataset.denklemId ?? "";
  const denklemVerisi = img.dataset.denklem ?? "";
  const cizimId = img.dataset.cizimId ?? "";
  const cizimVerisi = img.dataset.cizim ?? "";
  Array.from(img.attributes).forEach((oznitelik) => {
    if (!["src", "alt"].includes(oznitelik.name)) img.removeAttribute(oznitelik.name);
  });
  img.style.height = `${yukseklik}px`;
  img.style.verticalAlign = "middle";
  img.style.cursor = "pointer";
  // Savunma katmanı: class düşse veya global CSS'in yüklenmediği bir yüzeyde
  // render edilse bile (Tailwind preflight img{display:block} verir) görsel
  // satır içi kalsın, kendi satırına düşmesin.
  img.style.display = "inline-block";
  if (denklemMi) {
    img.setAttribute("class", "denklem-inline");
    if (denklemId) img.dataset.denklemId = denklemId;
    if (denklemVerisi) img.dataset.denklem = denklemVerisi;
    img.setAttribute("alt", "denklem");
  } else {
    img.setAttribute("class", "cizim-inline");
    if (cizimId) img.dataset.cizimId = cizimId;
    if (cizimVerisi) img.dataset.cizim = cizimVerisi;
    img.setAttribute("alt", "çizim");
  }
}

function stilTemizle(html: string) {
  if (typeof window === "undefined") return html;
  // Girdi DOMPurify'dan geçmiş olsa da inert belge kullanılır: temizleme
  // zincirinin hiçbir adımı aktif belgeye ham içerik yazmamalı.
  const kok = inertGovde(html);
  kok.querySelectorAll<HTMLImageElement>("img").forEach(satirIciGorselTemizle);
  tabloTemizle(kok);
  kok.querySelectorAll<HTMLElement>("[style]").forEach((el) => {
    if (el.tagName === "IMG") return;
    const fontSize = el.style.fontSize;
    const izinliPunto = /^\d{1,2}(\.\d{1,2})?pt$/i.test(fontSize.trim()) ? fontSize : "";
    const izinliHizalama = IZINLI_HIZALAMA.includes(el.style.textAlign) ? el.style.textAlign : "";
    el.removeAttribute("style");
    if (izinliPunto) el.style.fontSize = izinliPunto;
    if (izinliHizalama) el.style.textAlign = izinliHizalama;
  });
  kok.querySelectorAll<HTMLElement>("[class]").forEach((el) => {
    if (el.tagName === "IMG") return;
    const izinli = el.getAttribute("class")?.split(/\s+/).filter((s) => IZINLI_SINIFLAR.includes(s)) ?? [];
    if (izinli.length > 0) el.setAttribute("class", izinli.join(" "));
    else el.removeAttribute("class");
  });
  return kok.innerHTML;
}

export function htmlTemizle(html: string) {
  if (!html) return "";
  const temiz = DOMPurify.sanitize(divParagrafaDonustur(altUstSimgeDonustur(html)), {
    // ul/ol/li: madde işaretli/numaralı liste. sup/sub: üst/alt simge (x², H₂O).
    // img: yalnızca satır içi denklem/çizim görseli (data: URL zorunlu, satırIciGorselTemizle
    // ile ayrıca doğrulanır — burada sadece etiketin silinmemesi sağlanır).
    // class: yalnızca kesir/denklem/çizim yapıları için (IZINLI_SINIFLAR ile ayrıca doğrulanır).
    ALLOWED_TAGS: ["b", "i", "u", "strong", "em", "span", "br", "p", "ul", "ol", "li", "sup", "sub", "img", "table", "thead", "tbody", "tr", "td", "th"],
    ALLOWED_ATTR: ["style", "class", "src", "alt", "data-denklem-id", "data-denklem", "data-cizim-id", "data-cizim"],
    // Kapalı liste gerçekten kapalı olsun: true iken TÜM data-* öznitelikleri
    // listenin üstüne ekleniyordu. Yukarıda açıkça sayılan dördü, DOMPurify
    // ALLOWED_ATTR dalında ayrıca kontrol edildiği için bu bayrak kapalıyken de korunur.
    ALLOW_DATA_ATTR: false,
  });
  return stilTemizle(String(temiz));
}
