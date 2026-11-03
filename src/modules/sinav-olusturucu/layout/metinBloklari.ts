// Metin HTML'inin üst düzey "bloklarını" (blok etiketler ve aralarındaki
// çıplak/satır içi düzenli metin kümeleri) hem canlı ölçüm DOM'unda hem de
// sanitize edilmiş HTML'den AYNI kuralla çıkarır. İkisi aynı kuralı paylaştığı
// için blok sayıları tutar; tutmazsa çağıran bölmekten vazgeçer.
// DOM gerektirir (tarayıcı); testlerde `layout/soruBolme` doğrudan kullanılır.

import { htmlTemizle } from "../security/html";

const BLOK_ETIKETLERI = new Set([
  "P", "DIV", "UL", "OL", "H1", "H2", "H3", "H4", "H5", "H6",
  "TABLE", "BLOCKQUOTE", "PRE", "HR", "FIGURE", "SECTION", "LI",
]);

function bosMetin(dugum: ChildNode) {
  return dugum.nodeType === 3 && (dugum.textContent ?? "").trim() === "";
}

/** Üst düzey düğümleri bloklara gruplar. Boşluk-yalnız kümeler atılır. */
export function ustDuzeyBloklar(kok: Element): ChildNode[][] {
  const gruplar: ChildNode[][] = [];
  let akis: ChildNode[] = [];
  const akisKapat = () => {
    if (akis.some((d) => !bosMetin(d))) gruplar.push(akis);
    akis = [];
  };
  for (const dugum of Array.from(kok.childNodes)) {
    if (dugum.nodeType === 1 && BLOK_ETIKETLERI.has((dugum as Element).tagName)) {
      akisKapat();
      gruplar.push([dugum]);
    } else if (dugum.nodeType === 1 || dugum.nodeType === 3) {
      akis.push(dugum);
    }
  }
  akisKapat();
  return gruplar;
}

/** Bir bloğun ekrandaki üst kenarı (px, viewport). */
export function blokUstPx(grup: ChildNode[]): number {
  const ilk = grup.find((d) => !bosMetin(d)) ?? grup[0];
  if (ilk.nodeType === 1) return (ilk as Element).getBoundingClientRect().top;
  const r = document.createRange();
  r.selectNodeContents(ilk);
  return r.getBoundingClientRect().top;
}

function kacis(m: string) {
  return m.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** Sanitize edilmiş metnin blok HTML'leri; DOM yoksa `null`. */
export function metinBlokHtmlleri(html: string | undefined): string[] | null {
  if (!html || typeof document === "undefined") return null;
  const kap = document.createElement("div");
  kap.innerHTML = htmlTemizle(html);
  return ustDuzeyBloklar(kap).map((grup) =>
    grup
      .map((d) => (d.nodeType === 1 ? (d as Element).outerHTML : kacis(d.textContent ?? "")))
      .join(""),
  );
}
