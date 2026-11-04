/**
 * DENKLEM ÇİZİM MOTORU — UI'sız.
 *
 * NEDEN AYRI: bu kod `DenklemEditoruModal.tsx`'in içinde kapalıydı. Motorun
 * kendisi React bilmiyor (yalnız bir 2D bağlamına çiziyor) ama modalın içinde
 * durduğu için modal DIŞINDAN kullanılamıyordu — akış şeması kutusuna denklem
 * yazılamamasının nedeni buydu. Buraya taşındı; DAVRANIŞ DEĞİŞMEDİ, kod olduğu
 * gibi geldi.
 *
 * Motorun tek kuralı: GEOMETRİ ve ÇİZİM aynı hesabı kullanır (`parcaGeometri`
 * / `parcaCiz` çiftleri). Ayrışırlarsa ölçtüğünden başka boyda çizer.
 */
import type { DenklemParcasi } from "./tipler";

const FONT = "'Times New Roman', Times, serif";

/**
 * İç içe bir alanda çizilecek EN KÜÇÜK punto (pt).
 *
 * NEDEN VAR: editördeki `punto` doğrudan KÂĞITTAKİ punto — denklem görseli
 * `punto * yukseklikOrani` ile doğal boyutunda basılıyor (SinavOlusturucuScreen
 * `denklemGenisligiMm`). Yani buradaki her küçültme fiziksel boyuta iniyor.
 * İç içe yapılar çarpımsal küçülttüğü için tabansız zincirler okunmaz boyuta
 * düşüyordu; ölçüldü (300 dpi, rakam yüksekliği):
 *   9,00 pt → 2,15 mm · 6,84 pt → 1,63 mm · 5,32 pt → 1,27 mm · 5,20 → 1,24 mm
 * Gövde metni 10 pt ≈ 2,4 mm. 7 pt (≈1,67 mm) sıkışık ama okunur; altı değil.
 *
 * KAPSAM: taban HER küçültme noktasında geçerli, yalnız yeni alanlarda değil.
 * Etkisi ölçüldü ve DAR: değişen tek şey bugün ZATEN 7 pt'nin altına düşen
 * zincirler (blokta yalnız üs→üs ve üs→üs→kesir; satır içinde birkaçı daha).
 * Hepsi hâlihazırda okunmayan durumlar. Mevcut sınavlar etkilenmez: denklem
 * kâğıda `gorselDataUrl` olarak basılıyor, yeniden çizim ancak düzenlenince olur.
 */
export const TABAN_PUNTO = 7;

/** Çocuk bağlamın puntosu — tabanın altına inmez. Geometri ve çizim AYNI
 *  fonksiyonu çağırmalı, yoksa ölçtüğünden başka boyda çizer. */
export function altPunto(punto: number, oran: number): number {
  return Math.max(TABAN_PUNTO, punto * oran);
}

const BOSLUK_ORANI = 0.3;
const PAY_ORANI = 0.4;

const USTSAYI_HARITASI: Record<string, string> = {
  "0": "⁰",
  "1": "¹",
  "2": "²",
  "3": "³",
  "4": "⁴",
  "5": "⁵",
  "6": "⁶",
  "7": "⁷",
  "8": "⁸",
  "9": "⁹",
  "+": "⁺",
  "-": "⁻",
  "−": "⁻",
  n: "ⁿ",
  i: "ⁱ",
};

function ustSayi(deger: string): string {
  return deger
    .split("")
    .map((karakter) => USTSAYI_HARITASI[karakter] ?? karakter)
    .join("");
}

// Her parçanın kapladığı yatay alan ile taban çizgisinin üstünde/altında
// ihtiyaç duyduğu dikey alanı hesaplar — hem önizleme hem son çıktı aynı
// hesabı kullanır, böylece ekranda görülen kağıda basılanla birebir eşleşir.
function ifadeGeometri(
  ctx: CanvasRenderingContext2D,
  punto: number,
  metin: string,
  parcalar?: DenklemParcasi[],
) {
  if (parcalar) return toplamGeometri(ctx, punto, parcalar);
  ctx.font = `${punto}px ${FONT}`;
  return {
    genislik: Math.max(ctx.measureText(metin).width, punto * 0.25),
    ust: punto * 0.8,
    alt: punto * 0.25,
  };
}

/** Vektör işaretinin taban çizgisinden yüksekliği (içerik tepesinin biraz üstü). */
function vektorIsaretY(punto: number, icerikUst: number): number {
  return Math.max(punto * 0.88, icerikUst + punto * 0.08);
}

function ifadeCiz(
  ctx: CanvasRenderingContext2D,
  punto: number,
  metin: string,
  parcalar: DenklemParcasi[] | undefined,
  x: number,
  taban: number,
) {
  if (!parcalar) {
    ctx.font = `${punto}px ${FONT}`;
    ctx.textAlign = "left";
    ctx.fillText(metin, x, taban);
    return;
  }
  let parcaX = x;
  parcalar.forEach((parca, index) => {
    if (index > 0 && !parca.bitisik) parcaX += punto * BOSLUK_ORANI;
    parcaCiz(ctx, punto, parca, parcaX, taban);
    parcaX += parcaGeometri(ctx, punto, parca).genislik;
  });
}

// İntegral sembolünün ve sınırlarının yerleşimini GERÇEK font ölçümüyle
// (actualBoundingBoxAscent/Descent) hesaplar — sabit oranla tahmin etmek
// (ör. "yükseklik ~ punto*0.75") "∫" glifi fontlar arası çok farklı çıktığı
// için sınırların sembolün içine/altına düşmesine yol açıyordu. Bu fonksiyon
// hem geometri (parcaGeometri) hem çizim (parcaCiz) tarafından çağrılır ki
// iki yerde ayrı ayrı tutulan sabitler birbirinden sapmasın.
function integralOlculeri(
  ctx: CanvasRenderingContext2D,
  punto: number,
  kat: number,
  ustSinir: string,
  altSinir: string,
  ustSinirParcalari?: DenklemParcasi[],
  altSinirParcalari?: DenklemParcasi[],
) {
  const buyukPunto = punto * 1.9;
  ctx.font = `${buyukPunto}px ${FONT}`;
  const tekMetrics = ctx.measureText("∫");
  const tekW = tekMetrics.width;
  const integralAscent = tekMetrics.actualBoundingBoxAscent || buyukPunto * 0.85;
  const integralDescent = tekMetrics.actualBoundingBoxDescent || buyukPunto * 0.25;
  const araPay = tekW * 0.72;
  const semW = tekW + araPay * (kat - 1);
  // Sınırlar artık ham `measureText` değil, genel ifade ölçüsüyle ölçülüyor:
  // içlerine kesir/kök konabildiği için yükseklikleri tek satırlık metinden
  // farklı olabiliyor. Düz metinde `ifadeGeometri` zaten `measureText`e
  // düşüyor, yani parçasız sınırların ölçüsü DEĞİŞMİYOR — tek fark
  // `ust`/`alt`ın oransal tahminden (0.75/0.25) geliyor olması.
  const sinirPunto = altPunto(punto, 0.5);
  const ustGeo = ifadeGeometri(ctx, sinirPunto, ustSinir, ustSinirParcalari);
  const altGeo = ifadeGeometri(ctx, sinirPunto, altSinir, altSinirParcalari);
  const ustAscent = ustGeo.ust;
  const altAscent = altGeo.ust;
  const altDescent = altGeo.alt;
  const blokGenislik = Math.max(
    semW,
    ustGeo.genislik,
    altGeo.genislik,
    punto * 0.3,
  );
  const bosluk = punto * 0.18;
  // Sembolün kendi taban çizgisi, satırın ortak taban çizgisine göre offset.
  const semTabanOfset = punto * 0.25;
  return {
    buyukPunto,
    araPay,
    semW,
    blokGenislik,
    // Sınırların taban çizgisine göre y-offset'leri (çizimde doğrudan kullanılır).
    ustBaselineOfset: semTabanOfset - integralAscent - bosluk,
    altBaselineOfset: semTabanOfset + integralDescent + bosluk + altAscent,
    semTabanOfset,
    ust: integralAscent + bosluk - semTabanOfset + ustAscent,
    alt: semTabanOfset + integralDescent + bosluk + altAscent + altDescent,
  };
}

function parcaGeometri(
  ctx: CanvasRenderingContext2D,
  punto: number,
  parca: DenklemParcasi,
) {
  ctx.font = `${punto}px ${FONT}`;
  if (parca.tur === "metin") {
    return {
      genislik: ctx.measureText(parca.deger).width,
      ust: punto * 0.8,
      alt: punto * 0.25,
    };
  }
  if (parca.tur === "operator" || parca.tur === "sembol") {
    return {
      genislik: ctx.measureText(parca.sembol).width,
      ust: punto * 0.8,
      alt: punto * 0.25,
    };
  }
  if (parca.tur === "kesir") {
    const kesirPunto = altPunto(punto, 0.76);
    const payGeo = ifadeGeometri(ctx, kesirPunto, parca.pay, parca.payParcalari);
    const paydaGeo = ifadeGeometri(
      ctx,
      kesirPunto,
      parca.payda,
      parca.paydaParcalari,
    );
    return {
      genislik: Math.max(payGeo.genislik, paydaGeo.genislik) + punto * 0.35,
      ust: payGeo.ust + payGeo.alt + punto * 0.32,
      alt: paydaGeo.ust + paydaGeo.alt + punto * 0.18,
    };
  }
  if (parca.tur === "turev") {
    const isaret = parca.kismi ? "∂" : "d";
    const derece = parca.derece && parca.derece !== "1" ? ustSayi(parca.derece) : "";
    const pay = `${isaret}${derece}${parca.pay}`;
    const payda = `${isaret}${parca.payda}${derece}`;
    ctx.font = `${punto * 0.85}px ${FONT}`;
    const genislik =
      Math.max(ctx.measureText(pay).width, ctx.measureText(payda).width) +
      punto * 0.3;
    return { genislik, ust: punto * 0.95, alt: punto * 0.85 };
  }
  if (parca.tur === "kok") {
    const icerikGeo = ifadeGeometri(
      ctx,
      punto,
      parca.icerik,
      parca.icerikParcalari,
    );
    // Derece genişliği artık GERÇEK ölçüden: eskiden sabit punto*0.3 ekleniyordu,
    // içine kesir konunca radikalin soluna taşardı.
    const dereceGeo =
      parca.derece || parca.dereceParcalari?.length
        ? ifadeGeometri(ctx, altPunto(punto, 0.5), parca.derece, parca.dereceParcalari)
        : null;
    const radikalGenislik =
      punto * 0.55 + (dereceGeo ? Math.max(punto * 0.3, dereceGeo.genislik) : 0);
    return {
      genislik: radikalGenislik + icerikGeo.genislik + punto * 0.2,
      // Vinkülüm (üst çizgi) içeriği KAPSAMALI — bkz. parcaCiz'deki AYNI hesap
      // (ustCizgiY). Sabit punto*0.95 tek harfte (icerikGeo.ust≈punto*0.8)
      // yeterliydi ama içerik uzayınca (kesir, üslü ifade — ör. limitin gittiği
      // yerde kök içine kesir) vinkülüm payı/tepe noktasını dışarıda
      // bırakıyordu. punto*0.8+punto*0.15=punto*0.95 olduğundan düz metinde
      // SONUÇ DEĞİŞMİYOR; yalnız uzun içerikte büyüyor.
      ust: Math.max(punto * 0.78, icerikGeo.ust + punto * 0.15),
      alt: Math.max(punto * 0.25, icerikGeo.alt),
    };
  }
  if (parca.tur === "us") {
    const tabanGeo = ifadeGeometri(
      ctx,
      punto,
      parca.taban,
      parca.tabanParcalari,
    );
    const ustGeo = ifadeGeometri(
      ctx,
      altPunto(punto, 0.62),
      parca.ust,
      parca.ustParcalari,
    );
    const altGeo = ifadeGeometri(
      ctx,
      altPunto(punto, 0.62),
      parca.alt,
      parca.altParcalari,
    );
    const genislik =
      tabanGeo.genislik +
      Math.max(
        parca.ust ? ustGeo.genislik : 0,
        parca.alt ? altGeo.genislik : 0,
      ) +
      (parca.ust || parca.alt ? punto * 0.08 : 0);
    return {
      genislik,
      ust: Math.max(
        tabanGeo.ust,
        parca.ust ? punto * 0.42 + ustGeo.ust + ustGeo.alt : 0,
      ),
      alt: Math.max(
        tabanGeo.alt,
        parca.alt ? punto * 0.25 + altGeo.ust + altGeo.alt : 0,
      ),
    };
  }
  if (parca.tur === "grup") {
    const icGeo = ifadeGeometri(
      ctx,
      punto,
      parca.icerik,
      parca.icerikParcalari,
    );
    return {
      genislik: icGeo.genislik + punto * 0.7,
      ust: Math.max(icGeo.ust, punto * 0.92),
      alt: Math.max(icGeo.alt, punto * 0.3),
    };
  }
  if (parca.tur === "fonksiyon") {
    ctx.font = `${punto}px ${FONT}`;
    const adW = ctx.measureText(parca.ad).width;
    const argGeo = ifadeGeometri(
      ctx,
      punto,
      parca.arguman,
      parca.argumanParcalari,
    );
    return {
      genislik: adW + argGeo.genislik + punto * 0.85,
      ust: Math.max(argGeo.ust, punto * 0.92),
      alt: Math.max(argGeo.alt, punto * 0.3),
    };
  }
  if (parca.tur === "vektor") {
    // `\vec{F_1}` gibi YAPILI içerik (alt/üst simge, kesir…) varsa iç
    // parçaların gerçek geometrisi kullanılır; yoksa ham "F_1" metni
    // alt çizgisiyle basılıyordu.
    if (parca.ifadeParcalari && parca.ifadeParcalari.length > 0) {
      const icGeo = toplamGeometri(ctx, punto, parca.ifadeParcalari);
      return {
        genislik: icGeo.genislik + punto * 0.12,
        ust: Math.max(punto * 1.05, vektorIsaretY(punto, icGeo.ust) + punto * 0.17),
        alt: Math.max(punto * 0.25, icGeo.alt),
      };
    }
    ctx.font = `${parca.stil === "kalin" ? "bold " : ""}${punto}px ${FONT}`;
    return {
      genislik: ctx.measureText(parca.ifade).width + punto * 0.12,
      ust: punto * 1.05,
      alt: punto * 0.25,
    };
  }
  if (parca.tur === "limit") {
    ctx.font = `${punto}px ${FONT}`;
    const limW = ctx.measureText("lim").width;
    // Alt yazı ("x→0") artık ifade: içine kesir/kök girebiliyor. Yüksekliği de
    // ölçüye giriyor, yoksa iki satırlık bir alt yazı `alt`ı aşıp komşu
    // parçaların üstüne biner.
    const altPuntoLim = altPunto(punto, 0.55);
    const altGeo = ifadeGeometri(ctx, altPuntoLim, parca.altYazi, parca.altYaziParcalari);
    const stackW = Math.max(limW, altGeo.genislik);
    const ifadeGeo = ifadeGeometri(
      ctx,
      punto,
      parca.ifade,
      parca.ifadeParcalari,
    );
    return {
      genislik: stackW + punto * 0.35 + ifadeGeo.genislik,
      ust: Math.max(punto * 0.8, ifadeGeo.ust),
      alt: Math.max(punto * 0.75, punto * 0.55 + altGeo.ust + altGeo.alt, ifadeGeo.alt),
    };
  }
  if (parca.tur === "matris") {
    const olcu = matrisOlculeri(ctx, punto, parca.satirlar);
    const parantezGenislik =
      parca.stil === "determinant" ? punto * 0.22 : punto * 0.4;
    return {
      genislik: olcu.icGenislik + parantezGenislik * 2 + punto * 0.4,
      ust: olcu.yukseklik / 2 + punto * 0.15,
      alt: olcu.yukseklik / 2 + punto * 0.15,
    };
  }
  if (parca.tur === "sistem") {
    ctx.font = `${punto * 0.85}px ${FONT}`;
    let maxW = punto * 0.6;
    parca.satirlar.forEach((satir) => {
      maxW = Math.max(maxW, ctx.measureText(satir).width);
    });
    const satirYuksekligi = punto * 0.95;
    const yukseklik = satirYuksekligi * Math.max(1, parca.satirlar.length);
    const suzluGenislik = punto * 0.45;
    return {
      genislik: suzluGenislik + punto * 0.25 + maxW,
      ust: yukseklik / 2 + punto * 0.1,
      alt: yukseklik / 2 + punto * 0.1,
    };
  }
  if (parca.tur === "parcali") {
    ctx.font = `${punto * 0.85}px ${FONT}`;
    let ifadeW = punto * 0.6;
    let kosulW = punto * 0.6;
    parca.satirlar.forEach((satir) => {
      ifadeW = Math.max(ifadeW, ctx.measureText(satir.ifade).width);
      kosulW = Math.max(kosulW, ctx.measureText(satir.kosul).width);
    });
    const araGenislik = punto * 0.7;
    const satirYuksekligi = punto * 0.95;
    const yukseklik = satirYuksekligi * Math.max(1, parca.satirlar.length);
    const suzluGenislik = punto * 0.45;
    return {
      genislik: suzluGenislik + punto * 0.25 + ifadeW + araGenislik + kosulW,
      ust: yukseklik / 2 + punto * 0.1,
      alt: yukseklik / 2 + punto * 0.1,
    };
  }
  if (parca.tur === "binom") {
    const altPunto = punto * 0.8;
    ctx.font = `${altPunto}px ${FONT}`;
    const ustW = ctx.measureText(parca.ust).width;
    const altW = ctx.measureText(parca.alt).width;
    const icGenislik = Math.max(ustW, altW);
    const parantezGenislik = punto * 0.32;
    // Üst/alt sayı taban çizgiye göre kesirdeki gibi ortalanır (bkz. kesir'in
    // cizgiY'si) — önceki simetrik ust/alt (satırYüksekliği bazlı) sayıların
    // görsel merkezini taban çizginin biraz altına düşürüyordu; binom komşu
    // parçalara göre (integral, kesir vb.) daha aşağıda duruyormuş gibi görünüyordu.
    return {
      genislik: parantezGenislik * 2 + punto * 0.3 + icGenislik,
      ust: punto * 1.15,
      alt: punto * 0.55,
    };
  }
  if (parca.tur === "integral") {
    const olcu = integralOlculeri(
      ctx,
      punto,
      parca.kat,
      parca.ustSinir,
      parca.altSinir,
      parca.ustSinirParcalari,
      parca.altSinirParcalari,
    );
    const ifadeGeo = ifadeGeometri(ctx, punto, parca.ifade, parca.ifadeParcalari);
    return {
      genislik: olcu.blokGenislik + punto * 0.3 + ifadeGeo.genislik,
      ust: Math.max(olcu.ust, ifadeGeo.ust),
      alt: Math.max(olcu.alt, ifadeGeo.alt),
    };
  }
  // toplam / çarpım: büyük sembol, alt/üst indis ile ortalanır (LaTeX \sum ile aynı yerleşim)
  const buyukPuntoTC = punto * 1.3;
  ctx.font = `${buyukPuntoTC}px ${FONT}`;
  const sembolTC = parca.tur === "carpim" ? "Π" : "Σ";
  const semWTC = ctx.measureText(sembolTC).width;
  // Alt/üst yazılar artık ifade: içlerine kesir/kök girebiliyor. Yükseklikleri
  // `ust`/`alt`a katılıyor, yoksa iki satırlık bir indis komşu parçaya biner.
  const yaziPuntoTC = altPunto(punto, 0.5);
  const ustGeoTC = ifadeGeometri(ctx, yaziPuntoTC, parca.ustYazi, parca.ustYaziParcalari);
  const altGeoTC = ifadeGeometri(ctx, yaziPuntoTC, parca.altYazi, parca.altYaziParcalari);
  const blokGenislik = Math.max(semWTC, ustGeoTC.genislik, altGeoTC.genislik, punto * 0.3);
  const ifadeGeoTC = ifadeGeometri(ctx, punto, parca.ifade, parca.ifadeParcalari);
  return {
    genislik: blokGenislik + punto * 0.3 + ifadeGeoTC.genislik,
    ust: Math.max(punto * 1.35, punto + ustGeoTC.ust + ustGeoTC.alt, ifadeGeoTC.ust),
    alt: Math.max(punto * 0.95, punto * 0.55 + altGeoTC.ust + altGeoTC.alt, ifadeGeoTC.alt),
  };
}

function matrisOlculeri(
  ctx: CanvasRenderingContext2D,
  punto: number,
  satirlar: string[][],
) {
  ctx.font = `${punto * 0.85}px ${FONT}`;
  const sutunSayisi = Math.max(1, ...satirlar.map((satir) => satir.length));
  const sutunGenislikleri: number[] = [];
  for (let s = 0; s < sutunSayisi; s += 1) {
    let max = punto * 0.4;
    satirlar.forEach((satir) => {
      max = Math.max(max, ctx.measureText(satir[s] ?? "").width);
    });
    sutunGenislikleri.push(max);
  }
  const hucreAra = punto * 0.5;
  const satirYuksekligi = punto * 0.95;
  const icGenislik =
    sutunGenislikleri.reduce((a, b) => a + b, 0) + hucreAra * (sutunSayisi - 1);
  const yukseklik = satirYuksekligi * Math.max(1, satirlar.length);
  return {
    sutunGenislikleri,
    hucreAra,
    satirYuksekligi,
    icGenislik,
    yukseklik,
    sutunSayisi,
  };
}

// `icKenar`: parantezin İÇERİĞE bakan (içeriğe en yakın) kenarının x konumu.
// Hem yuvarlak hem köşeli parantez, ucu/ayağı her zaman tam icKenar'da tutar ve
// gövdeyi SADECE dışarı (içerikten uzağa) doğru genislik kadar büyütür — böylece
// hangi stil seçilirse seçilsin parantez asla içerik metnine taşmaz.
function parantezCiz(
  ctx: CanvasRenderingContext2D,
  tip: "parantez" | "koseli" | "determinant",
  yon: "sol" | "sag",
  icKenar: number,
  yUst: number,
  yAlt: number,
  genislik: number,
) {
  const disaDogru = yon === "sol" ? -1 : 1;
  ctx.strokeStyle = "#0f172a";
  ctx.lineWidth = Math.max(1, (yAlt - yUst) * 0.02);
  ctx.beginPath();
  if (tip === "determinant") {
    ctx.moveTo(icKenar, yUst);
    ctx.lineTo(icKenar, yAlt);
    ctx.stroke();
    return;
  }
  const disX = icKenar + genislik * disaDogru;
  if (tip === "koseli") {
    ctx.moveTo(icKenar, yUst);
    ctx.lineTo(disX, yUst);
    ctx.lineTo(disX, yAlt);
    ctx.lineTo(icKenar, yAlt);
    ctx.stroke();
    return;
  }
  const yOrta = (yUst + yAlt) / 2;
  ctx.moveTo(icKenar, yUst);
  ctx.quadraticCurveTo(disX, yOrta, icKenar, yAlt);
  ctx.stroke();
}

function suzluCiz(
  ctx: CanvasRenderingContext2D,
  x: number,
  yUst: number,
  yAlt: number,
  genislik: number,
) {
  const yOrta = (yUst + yAlt) / 2;
  ctx.strokeStyle = "#0f172a";
  ctx.lineWidth = Math.max(1, (yAlt - yUst) * 0.018);
  ctx.beginPath();
  ctx.moveTo(x + genislik, yUst);
  ctx.quadraticCurveTo(x, yUst, x, (yUst + yOrta) / 2);
  ctx.quadraticCurveTo(x, yOrta, x - genislik * 0.55, yOrta);
  ctx.quadraticCurveTo(x, yOrta, x, (yOrta + yAlt) / 2);
  ctx.quadraticCurveTo(x, yAlt, x + genislik, yAlt);
  ctx.stroke();
}

function parcaCiz(
  ctx: CanvasRenderingContext2D,
  punto: number,
  parca: DenklemParcasi,
  x: number,
  taban: number,
) {
  ctx.fillStyle = "#0f172a";
  ctx.strokeStyle = "#0f172a";
  ctx.textBaseline = "alphabetic";

  if (parca.tur === "metin") {
    ctx.font = `${punto}px ${FONT}`;
    ctx.textAlign = "left";
    ctx.fillText(parca.deger, x, taban);
    return;
  }

  if (parca.tur === "operator" || parca.tur === "sembol") {
    ctx.font = `${punto}px ${FONT}`;
    ctx.textAlign = "left";
    ctx.fillText(parca.sembol, x, taban);
    return;
  }

  if (parca.tur === "kesir") {
    const kesirPunto = altPunto(punto, 0.76);
    const payGeo = ifadeGeometri(ctx, kesirPunto, parca.pay, parca.payParcalari);
    const paydaGeo = ifadeGeometri(
      ctx,
      kesirPunto,
      parca.payda,
      parca.paydaParcalari,
    );
    const { genislik } = parcaGeometri(ctx, punto, parca);
    const cizgiY = taban - punto * 0.12;
    ifadeCiz(
      ctx,
      kesirPunto,
      parca.pay,
      parca.payParcalari,
      x + (genislik - payGeo.genislik) / 2,
      cizgiY - punto * 0.2 - payGeo.alt,
    );
    ifadeCiz(
      ctx,
      kesirPunto,
      parca.payda,
      parca.paydaParcalari,
      x + (genislik - paydaGeo.genislik) / 2,
      cizgiY + punto * 0.2 + paydaGeo.ust,
    );
    ctx.lineWidth = Math.max(1, punto * 0.045);
    ctx.beginPath();
    ctx.moveTo(x, cizgiY);
    ctx.lineTo(x + genislik, cizgiY);
    ctx.stroke();
    ctx.textAlign = "left";
    return;
  }

  if (parca.tur === "turev") {
    const isaret = parca.kismi ? "∂" : "d";
    const derece = parca.derece && parca.derece !== "1" ? ustSayi(parca.derece) : "";
    const pay = `${isaret}${derece}${parca.pay}`;
    const payda = `${isaret}${parca.payda}${derece}`;
    const { genislik } = parcaGeometri(ctx, punto, parca);
    const cizgiY = taban - punto * 0.15;
    ctx.font = `${punto * 0.85}px ${FONT}`;
    ctx.textAlign = "center";
    ctx.fillText(pay, x + genislik / 2, cizgiY - punto * 0.22);
    ctx.fillText(payda, x + genislik / 2, cizgiY + punto * 0.62);
    ctx.lineWidth = Math.max(1, punto * 0.045);
    ctx.beginPath();
    ctx.moveTo(x, cizgiY);
    ctx.lineTo(x + genislik, cizgiY);
    ctx.stroke();
    ctx.textAlign = "left";
    return;
  }

  if (parca.tur === "kok") {
    // Derece genişliği artık GERÇEK ölçüden: eskiden sabit punto*0.3 ekleniyordu,
    // içine kesir konunca radikalin soluna taşardı.
    const dereceGeo =
      parca.derece || parca.dereceParcalari?.length
        ? ifadeGeometri(ctx, altPunto(punto, 0.5), parca.derece, parca.dereceParcalari)
        : null;
    const radikalGenislik =
      punto * 0.55 + (dereceGeo ? Math.max(punto * 0.3, dereceGeo.genislik) : 0);
    const icerikGeo = ifadeGeometri(
      ctx,
      punto,
      parca.icerik,
      parca.icerikParcalari,
    );
    // Vinkülüm içeriği KAPSAMALI — bkz. parcaGeometri'deki AYNI hesap. Sabit
    // punto*0.78 tek harfte yeterliydi ama içerik uzayınca (kesir, üslü ifade)
    // vinkülüm çok aşağıda kalıp payı/tepe noktasını dışarıda bırakıyordu.
    const ustCizgiY = taban - Math.max(punto * 0.78, icerikGeo.ust + punto * 0.15);
    ctx.lineWidth = Math.max(1, punto * 0.05);
    ctx.beginPath();
    ctx.moveTo(x, taban - punto * 0.32);
    ctx.lineTo(x + radikalGenislik * 0.32, taban - punto * 0.02);
    ctx.lineTo(x + radikalGenislik * 0.55, ustCizgiY);
    ctx.stroke();
    // Derece artık ifade (içine kesir/kök girebiliyor). Boşken hiç çizilmiyor;
    // düz metinken `ifadeCiz` aynı `fillText`e düşüyor, davranış aynı.
    if (parca.derece || parca.dereceParcalari?.length) {
      ctx.textAlign = "left";
      ifadeCiz(
        ctx,
        altPunto(punto, 0.5),
        parca.derece,
        parca.dereceParcalari,
        x,
        ustCizgiY - punto * 0.05,
      );
    }
    ctx.beginPath();
    ctx.moveTo(x + radikalGenislik * 0.55, ustCizgiY);
    ctx.lineTo(
      x + radikalGenislik + icerikGeo.genislik + punto * 0.2,
      ustCizgiY,
    );
    ctx.stroke();
    ifadeCiz(
      ctx,
      punto,
      parca.icerik,
      parca.icerikParcalari,
      x + radikalGenislik + punto * 0.1,
      taban,
    );
    return;
  }

  if (parca.tur === "us") {
    const tabanGeo = ifadeGeometri(
      ctx,
      punto,
      parca.taban,
      parca.tabanParcalari,
    );
    ifadeCiz(ctx, punto, parca.taban, parca.tabanParcalari, x, taban);
    const ekX = x + tabanGeo.genislik + punto * 0.05;
    if (parca.ust)
      ifadeCiz(
        ctx,
        altPunto(punto, 0.62),
        parca.ust,
        parca.ustParcalari,
        ekX,
        taban - punto * 0.42,
      );
    if (parca.alt)
      ifadeCiz(
        ctx,
        altPunto(punto, 0.62),
        parca.alt,
        parca.altParcalari,
        ekX,
        taban + punto * 0.32,
      );
    return;
  }

  if (parca.tur === "grup") {
    const icGeo = ifadeGeometri(
      ctx,
      punto,
      parca.icerik,
      parca.icerikParcalari,
    );
    const [sol, sag] =
      parca.stil === "koseli"
        ? ["[", "]"]
        : parca.stil === "suslu"
          ? ["{", "}"]
          : parca.stil === "mutlak"
            ? ["|", "|"]
            : ["(", ")"];
    ctx.font = `${punto * 1.15}px ${FONT}`;
    ctx.textAlign = "left";
    ctx.fillText(sol, x, taban + punto * 0.04);
    ifadeCiz(
      ctx,
      punto,
      parca.icerik,
      parca.icerikParcalari,
      x + punto * 0.35,
      taban,
    );
    ctx.font = `${punto * 1.15}px ${FONT}`;
    ctx.fillText(sag, x + punto * 0.35 + icGeo.genislik, taban + punto * 0.04);
    return;
  }

  if (parca.tur === "fonksiyon") {
    ctx.font = `${punto}px ${FONT}`;
    ctx.textAlign = "left";
    ctx.fillText(parca.ad, x, taban);
    const adW = ctx.measureText(parca.ad).width;
    ctx.font = `${punto * 1.1}px ${FONT}`;
    ctx.fillText("(", x + adW + punto * 0.1, taban + punto * 0.03);
    const argGeo = ifadeGeometri(
      ctx,
      punto,
      parca.arguman,
      parca.argumanParcalari,
    );
    ifadeCiz(
      ctx,
      punto,
      parca.arguman,
      parca.argumanParcalari,
      x + adW + punto * 0.42,
      taban,
    );
    ctx.font = `${punto * 1.1}px ${FONT}`;
    ctx.fillText(
      ")",
      x + adW + punto * 0.42 + argGeo.genislik,
      taban + punto * 0.03,
    );
    return;
  }

  if (parca.tur === "vektor") {
    // İşaretin (ok/çizgi/şapka/nokta) taban çizgisinden yüksekliği: düz
    // metinde sabit; yapılı içerikte (ör. üslü) içeriğin tepesine göre.
    let isaretY = punto * 0.88;
    let w: number;
    if (parca.ifadeParcalari && parca.ifadeParcalari.length > 0) {
      const icGeo = toplamGeometri(ctx, punto, parca.ifadeParcalari);
      ifadeCiz(ctx, punto, parca.ifade, parca.ifadeParcalari, x, taban);
      w = icGeo.genislik;
      isaretY = vektorIsaretY(punto, icGeo.ust);
    } else {
      ctx.font = `${parca.stil === "kalin" ? "bold " : ""}${punto}px ${FONT}`;
      ctx.textAlign = "left";
      ctx.fillText(parca.ifade, x, taban);
      w = ctx.measureText(parca.ifade).width;
    }
    ctx.lineWidth = Math.max(1, punto * 0.045);
    const fark = isaretY - punto * 0.88;
    if (parca.stil === "ok") {
      const y = taban - isaretY;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + w, y);
      ctx.lineTo(x + w - punto * 0.16, y - punto * 0.1);
      ctx.moveTo(x + w, y);
      ctx.lineTo(x + w - punto * 0.16, y + punto * 0.1);
      ctx.stroke();
    } else if (parca.stil === "ustcizgi") {
      ctx.beginPath();
      ctx.moveTo(x, taban - punto * 0.86 - fark);
      ctx.lineTo(x + w, taban - punto * 0.86 - fark);
      ctx.stroke();
    } else if (parca.stil === "sapka") {
      ctx.font = `${punto * 0.65}px ${FONT}`;
      ctx.textAlign = "center";
      ctx.fillText("^", x + w / 2, taban - punto * 0.7 - fark);
    } else if (parca.stil === "nokta") {
      ctx.beginPath();
      ctx.arc(
        x + w / 2,
        taban - isaretY,
        Math.max(1.5, punto * 0.06),
        0,
        Math.PI * 2,
      );
      ctx.fill();
    }
    ctx.textAlign = "left";
    return;
  }

  if (parca.tur === "limit") {
    ctx.font = `${punto}px ${FONT}`;
    const limW = ctx.measureText("lim").width;
    const altPuntoLim = altPunto(punto, 0.55);
    const altGeo = ifadeGeometri(ctx, altPuntoLim, parca.altYazi, parca.altYaziParcalari);
    const stackW = Math.max(limW, altGeo.genislik);
    ctx.textAlign = "center";
    ctx.fillText("lim", x + stackW / 2, taban);
    // `ifadeCiz` soldan çizer; ortalama elle ve AYNI ölçüyle yapılıyor.
    ctx.textAlign = "left";
    ifadeCiz(
      ctx,
      altPuntoLim,
      parca.altYazi,
      parca.altYaziParcalari,
      x + stackW / 2 - altGeo.genislik / 2,
      taban + punto * 0.55 + altGeo.ust - altPuntoLim * 0.8,
    );
    ifadeCiz(
      ctx,
      punto,
      parca.ifade,
      parca.ifadeParcalari,
      x + stackW + punto * 0.35,
      taban,
    );
    return;
  }

  if (parca.tur === "matris") {
    const olcu = matrisOlculeri(ctx, punto, parca.satirlar);
    const { genislik, ust, alt } = parcaGeometri(ctx, punto, parca);
    const parantezGenislik =
      parca.stil === "determinant" ? punto * 0.22 : punto * 0.4;
    const yUst = taban - ust;
    const yAlt = taban + alt;
    parantezCiz(
      ctx,
      parca.stil,
      "sol",
      x + parantezGenislik,
      yUst,
      yAlt,
      parantezGenislik,
    );
    parantezCiz(
      ctx,
      parca.stil,
      "sag",
      x + genislik - parantezGenislik,
      yUst,
      yAlt,
      parantezGenislik,
    );
    ctx.font = `${punto * 0.85}px ${FONT}`;
    ctx.textAlign = "center";
    let sutunX = x + parantezGenislik + punto * 0.2;
    for (let s = 0; s < olcu.sutunSayisi; s += 1) {
      const merkezX = sutunX + olcu.sutunGenislikleri[s] / 2;
      for (let r = 0; r < parca.satirlar.length; r += 1) {
        const metin = parca.satirlar[r][s] ?? "";
        ctx.fillText(metin, merkezX, yUst + olcu.satirYuksekligi * (r + 0.72));
      }
      sutunX += olcu.sutunGenislikleri[s] + olcu.hucreAra;
    }
    ctx.textAlign = "left";
    return;
  }

  if (parca.tur === "sistem") {
    const { ust, alt } = parcaGeometri(ctx, punto, parca);
    const yUst = taban - ust;
    const yAlt = taban + alt;
    const suzluGenislik = punto * 0.45;
    suzluCiz(ctx, x, yUst, yAlt, suzluGenislik);
    ctx.font = `${punto * 0.85}px ${FONT}`;
    ctx.textAlign = "left";
    const satirYuksekligi = punto * 0.95;
    const satirBaslangic = x + suzluGenislik + punto * 0.25;
    parca.satirlar.forEach((satir, i) => {
      ctx.fillText(satir, satirBaslangic, yUst + satirYuksekligi * (i + 0.72));
    });
    return;
  }

  if (parca.tur === "parcali") {
    const { ust, alt } = parcaGeometri(ctx, punto, parca);
    const yUst = taban - ust;
    const yAlt = taban + alt;
    const suzluGenislik = punto * 0.45;
    suzluCiz(ctx, x, yUst, yAlt, suzluGenislik);
    ctx.font = `${punto * 0.85}px ${FONT}`;
    ctx.textAlign = "left";
    const satirYuksekligi = punto * 0.95;
    const satirBaslangic = x + suzluGenislik + punto * 0.25;
    let ifadeW = punto * 0.6;
    parca.satirlar.forEach((satir) => {
      ifadeW = Math.max(ifadeW, ctx.measureText(satir.ifade).width);
    });
    const araGenislik = punto * 0.7;
    parca.satirlar.forEach((satir, i) => {
      const y = yUst + satirYuksekligi * (i + 0.72);
      ctx.fillText(`${satir.ifade},`, satirBaslangic, y);
      ctx.fillText(satir.kosul, satirBaslangic + ifadeW + araGenislik, y);
    });
    return;
  }

  if (parca.tur === "binom") {
    const { genislik, ust, alt } = parcaGeometri(ctx, punto, parca);
    const yUst = taban - ust;
    const yAlt = taban + alt;
    const parantezGenislik = punto * 0.32;
    parantezCiz(
      ctx,
      "parantez",
      "sol",
      x + parantezGenislik,
      yUst,
      yAlt,
      parantezGenislik,
    );
    parantezCiz(
      ctx,
      "parantez",
      "sag",
      x + genislik - parantezGenislik,
      yUst,
      yAlt,
      parantezGenislik,
    );
    const altPunto = punto * 0.8;
    ctx.font = `${altPunto}px ${FONT}`;
    ctx.textAlign = "center";
    const merkezX = x + genislik / 2;
    ctx.fillText(parca.ust, merkezX, taban - punto * 0.5);
    ctx.fillText(parca.alt, merkezX, taban + punto * 0.3);
    ctx.textAlign = "left";
    return;
  }

  if (parca.tur === "integral") {
    const olcu = integralOlculeri(
      ctx,
      punto,
      parca.kat,
      parca.ustSinir,
      parca.altSinir,
      parca.ustSinirParcalari,
      parca.altSinirParcalari,
    );
    const merkezX = x + olcu.blokGenislik / 2;
    ctx.font = `${olcu.buyukPunto}px ${FONT}`;
    ctx.textAlign = "left";
    const semBaslangic = merkezX - olcu.semW / 2;
    for (let i = 0; i < parca.kat; i += 1) {
      ctx.fillText(
        "∫",
        semBaslangic + olcu.araPay * i,
        taban + olcu.semTabanOfset,
      );
    }
    // Sınırlar `ifadeCiz` ile çiziliyor (içlerinde kesir/kök olabilir).
    // `ifadeCiz` SOLDAN çizer, `fillText`in "center" hizası ise yok: ortalama
    // elle yapılıyor — ölçüyü de aynı fonksiyondan alarak (ifadeGeometri),
    // yoksa ölçtüğünden başka yere çizer.
    ctx.textAlign = "left";
    const sinirP = altPunto(punto, 0.5);
    const ustG = ifadeGeometri(ctx, sinirP, parca.ustSinir, parca.ustSinirParcalari);
    const altG = ifadeGeometri(ctx, sinirP, parca.altSinir, parca.altSinirParcalari);
    ifadeCiz(
      ctx,
      sinirP,
      parca.ustSinir,
      parca.ustSinirParcalari,
      merkezX - ustG.genislik / 2,
      taban + olcu.ustBaselineOfset,
    );
    ifadeCiz(
      ctx,
      sinirP,
      parca.altSinir,
      parca.altSinirParcalari,
      merkezX - altG.genislik / 2,
      taban + olcu.altBaselineOfset,
    );
    ifadeCiz(
      ctx,
      punto,
      parca.ifade,
      parca.ifadeParcalari,
      x + olcu.blokGenislik + punto * 0.3,
      taban,
    );
    return;
  }

  // toplam / çarpım: sembol ile alt/üst indis aynı eksende ortalanır
  const buyukPuntoTC = punto * 1.3;
  const sembolTC = parca.tur === "carpim" ? "Π" : "Σ";
  ctx.font = `${buyukPuntoTC}px ${FONT}`;
  const semWTC = ctx.measureText(sembolTC).width;
  const yaziPuntoTC = altPunto(punto, 0.5);
  const ustGeoTC = ifadeGeometri(ctx, yaziPuntoTC, parca.ustYazi, parca.ustYaziParcalari);
  const altGeoTC = ifadeGeometri(ctx, yaziPuntoTC, parca.altYazi, parca.altYaziParcalari);
  const blokGenislik = Math.max(semWTC, ustGeoTC.genislik, altGeoTC.genislik, punto * 0.3);
  const merkezX = x + blokGenislik / 2;
  ctx.font = `${buyukPuntoTC}px ${FONT}`;
  ctx.textAlign = "center";
  ctx.fillText(sembolTC, merkezX, taban + punto * 0.05);
  ctx.textAlign = "left";
  ifadeCiz(
    ctx,
    yaziPuntoTC,
    parca.ustYazi,
    parca.ustYaziParcalari,
    merkezX - ustGeoTC.genislik / 2,
    taban - punto,
  );
  ifadeCiz(
    ctx,
    yaziPuntoTC,
    parca.altYazi,
    parca.altYaziParcalari,
    merkezX - altGeoTC.genislik / 2,
    taban + punto * 0.55,
  );
  ifadeCiz(
    ctx,
    punto,
    parca.ifade,
    parca.ifadeParcalari,
    x + blokGenislik + punto * 0.3,
    taban,
  );
}

function toplamGeometri(
  ctx: CanvasRenderingContext2D,
  punto: number,
  parcalar: DenklemParcasi[],
) {
  let genislik = 0;
  let ust = punto * 0.9;
  let alt = punto * 0.3;
  parcalar.forEach((parca, index) => {
    const g = parcaGeometri(ctx, punto, parca);
    genislik += g.genislik + (index > 0 && !parca.bitisik ? punto * BOSLUK_ORANI : 0);
    ust = Math.max(ust, g.ust);
    alt = Math.max(alt, g.alt);
  });
  return { genislik: Math.max(genislik, punto), ust, alt };
}

/**
 * Denklemin kapladığı yer: genişlik + taban çizgisinin üstü/altı.
 *
 * Dışa açık, çünkü denklemi KENDİ tuvaline değil başka bir çizimin içine
 * yerleştiren çağıran (akış şeması kutusu) önce sığıp sığmadığını ölçmek
 * zorunda.
 */
export function denklemOlcusu(
  ctx: CanvasRenderingContext2D,
  punto: number,
  parcalar: DenklemParcasi[],
) {
  const { genislik, ust, alt } = toplamGeometri(ctx, punto, parcalar);
  const pay = punto * PAY_ORANI;
  return { w: genislik + pay * 2, h: ust + alt + pay * 2 };
}

/**
 * Denklemi VERİLEN bağlama, verilen sol-üst köşeden çizer.
 *
 * NEDEN AYRI (eskiden `denklemCiz`in içindeydi): `denklemCiz` tuvalin SAHİBİ —
 * boyutunu değiştiriyor, dönüşümünü kuruyor ve beyaza boyuyor. Bu üçü yüzünden
 * başka bir çizimin ortasına denklem koyulamıyordu. Sahiplik `denklemCiz`de
 * kaldı; yerleştirme buraya çıktı.
 *
 * Arka plan BOYAMAZ: akış şeması kutusunun kendi dolgusu var, üzerine beyaz
 * dikdörtgen basmak dolguyu silerdi.
 */
export function denklemiCiz(
  ctx: CanvasRenderingContext2D,
  punto: number,
  parcalar: DenklemParcasi[],
  solX: number,
  ustY: number,
  seciliParcaId?: string | null,
) {
  const { genislik, ust, alt } = toplamGeometri(ctx, punto, parcalar);
  const pay = punto * PAY_ORANI;
  const genGenislik = genislik + pay * 2;
  const genYukseklik = ust + alt + pay * 2;
  const taban = ustY + pay + ust;
  let x = solX + pay;
  parcalar.forEach((parca, index) => {
    if (index > 0 && !parca.bitisik) x += punto * BOSLUK_ORANI;
    const geometri = parcaGeometri(ctx, punto, parca);
    if (parca.id === seciliParcaId) {
      ctx.fillStyle = "#dbeafe";
      ctx.fillRect(
        x - punto * 0.12,
        ustY + pay * 0.45,
        geometri.genislik + punto * 0.24,
        ust + alt + pay * 1.1,
      );
    }
    parcaCiz(ctx, punto, parca, x, taban);
    x += geometri.genislik;
  });
  return { w: genGenislik, h: genYukseklik };
}

/**
 * Tek başına duran bir denklem tuvali üretir (editör önizlemesi ve soruya
 * eklenen PNG). Tuvalin boyutunu, dönüşümünü ve beyaz zeminini BU fonksiyon
 * kurar; yerleştirmeyi `denklemiCiz` yapar.
 */
export function denklemCiz(
  canvas: HTMLCanvasElement,
  punto: number,
  parcalar: DenklemParcasi[],
  kalite: number,
  seciliParcaId?: string | null,
  /** Yalnız EKRANDAKİ boyutu büyütür (CSS px). Geometri ve punto aynı kalır,
   *  bu yüzden çıktı üretimi (zoom verilmeyen çağrı) etkilenmez. */
  zoom = 1,
) {
  const olcumCtx = canvas.getContext("2d");
  if (!olcumCtx) return;
  const { w: genGenislik, h: genYukseklik } = denklemOlcusu(olcumCtx, punto, parcalar);
  canvas.width = Math.ceil(genGenislik * kalite * zoom);
  canvas.height = Math.ceil(genYukseklik * kalite * zoom);
  canvas.style.width = `${Math.ceil(genGenislik * zoom)}px`;
  canvas.style.height = `${Math.ceil(genYukseklik * zoom)}px`;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.setTransform(kalite * zoom, 0, 0, kalite * zoom, 0, 0);
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, genGenislik, genYukseklik);
  denklemiCiz(ctx, punto, parcalar, 0, 0, seciliParcaId);
  return { w: genGenislik, h: genYukseklik };
}

/**
 * Yatay `tikX` noktasının hangi parçaya düştüğü (yoksa null).
 *
 * NEDEN MOTORDA: bu döngü yerleşimin (kenar payı, parçalar arası boşluk, parça
 * genişliği) İKİNCİ kopyasıydı ve editörün içinde duruyordu. Yerleşim
 * değişseydi tıklama sessizce yanlış parçayı seçerdi; artık `denklemiCiz` ile
 * aynı sabitleri okuyor.
 */
export function tiklananParca(
  ctx: CanvasRenderingContext2D,
  punto: number,
  parcalar: DenklemParcasi[],
  tikX: number,
  solX = 0,
): DenklemParcasi | null {
  let x = solX + punto * PAY_ORANI;
  for (let index = 0; index < parcalar.length; index += 1) {
    if (index > 0 && !parcalar[index].bitisik) x += punto * BOSLUK_ORANI;
    const genislik = parcaGeometri(ctx, punto, parcalar[index]).genislik;
    if (tikX >= x - punto * 0.15 && tikX <= x + genislik + punto * 0.15) {
      return parcalar[index];
    }
    x += genislik;
  }
  return null;
}
