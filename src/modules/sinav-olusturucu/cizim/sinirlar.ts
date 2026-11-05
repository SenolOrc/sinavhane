// Şeklin kapladığı alan: ham sınırlar, döndürülmüş sınırlar, merkez,
// tutamaç noktaları ve tüm çizimin içerik sınırı.
//
// `geometri.ts`'ten ayrı durmasının nedeni `ctx` bağımlılığı: metin şeklinin
// yüksekliği ancak `ctx.measureText` ile bilinir, dolayısıyla bu dosyadaki
// her şey bir canvas bağlamı ister. Testler bunun için sahte bir ctx veriyor
// (`measureText` = karakter sayısı × 10) — gerçek tuval gerekmiyor.

import type { Nokta, Sekil, TutamacId } from "./tipler";
import { METIN_PUNTO, METIN_SATIR_ARALIGI, VARSAYILAN_TUVAL } from "./sabitler";
import type { TuvalOlcusu } from "./sabitler";
import { FIZIK_ETIKET_PUNTO, FIZIK_TANIMLARI, fizikMetniOlcu, fizikSatirGenisligi } from "./fizik";
import { grafikEtiketPayi } from "./grafik";
import { istatistikPayi } from "./istatistik";
import { semaPayi } from "./sema";
import { kimyaPayi } from "./kimya";
import { enerjiDuzeyiDisPayi } from "./fizikEk";
import { egikKuvvetDisPayi } from "./fizikSahneler";
import { siviDisPayi } from "./sivi";
import { geometriDisPayi, geometriMi } from "./geometriSekilleri";
import {
  baglayiciYolu,
  noktaDondur,
  noktaListesiKutusu,
  sekilGeometriKutusu,
  sekilTasi,
  sekilTutamacNoktalari,
} from "./geometri";

export function metinOlculeri(ctx: CanvasRenderingContext2D, sekil: Extract<Sekil, { tur: "metin" }>) {
  const punto = sekil.punto ?? METIN_PUNTO;
  const satirAraligi = sekil.satirAraligi ?? METIN_SATIR_ARALIGI;
  ctx.font = `${punto}px "Times New Roman", Times, serif`;
  const satirlar = sekil.metin.split("\n");
  return {
    satirlar,
    punto,
    satirAraligi,
    // Alt/üst simge, vektör oku, ⊗ ⊙ ve ⁵⁶₂₆Fe istifi çizimle AYNI hesaptan ölçülür.
    w: Math.max(10, ...satirlar.map((satir) => fizikSatirGenisligi(ctx, satir || " ", punto))),
    h: Math.max(1, satirlar.length) * punto * satirAraligi,
  };
}

export function sekilHamSinirlari(ctx: CanvasRenderingContext2D, sekil: Sekil) {
  const PAY = 4;
  if (sekil.tur === "dogru")
    return {
      x: Math.min(sekil.x1, sekil.x2) - PAY,
      y: Math.min(sekil.y1, sekil.y2) - PAY,
      w: Math.abs(sekil.x2 - sekil.x1) + PAY * 2,
      h: Math.abs(sekil.y2 - sekil.y1) + PAY * 2,
    };
  if (sekil.tur === "dikdortgen" && sekil.serbestKoseler) {
    const kutu = noktaListesiKutusu(sekil.serbestKoseler);
    return { x: kutu.x - PAY, y: kutu.y - PAY, w: kutu.w + PAY * 2, h: kutu.h + PAY * 2 };
  }
  if (sekil.tur === "dikdortgen" || sekil.tur === "elips" || sekil.tur === "akis" || sekil.tur === "fizik")
    return { x: sekil.x - PAY, y: sekil.y - PAY, w: sekil.w + PAY * 2, h: sekil.h + PAY * 2 };
  if (sekil.tur === "ucgen") {
    const xler = [sekil.x1, sekil.x2, sekil.x3];
    const yler = [sekil.y1, sekil.y2, sekil.y3];
    const x = Math.min(...xler) - PAY;
    const y = Math.min(...yler) - PAY;
    return { x, y, w: Math.max(...xler) - x + PAY, h: Math.max(...yler) - y + PAY };
  }
  if (sekil.tur === "serbest" || sekil.tur === "cokgen" || sekil.tur === "dalga") {
    const xler = sekil.noktalar.map((n) => n.x);
    const yler = sekil.noktalar.map((n) => n.y);
    const x = Math.min(...xler) - PAY;
    const y = Math.min(...yler) - PAY;
    return { x, y, w: Math.max(...xler) - x + PAY, h: Math.max(...yler) - y + PAY };
  }
  // Bağlayıcı: kutusu tutunduğu şekillere bağlı ve buradan erişilemiyor.
  // Seçim dikdörtgeni onu yakalamasın diye tuval dışında (bkz.
  // geometri.ts BAGLAYICI_KUTU_DISI'nin gerekçesi).
  if (sekil.tur === "baglayici") return { x: -1e6, y: -1e6, w: 0, h: 0 };
  const olcu = metinOlculeri(ctx, sekil);
  return { x: sekil.x - PAY, y: sekil.y - olcu.punto - PAY, w: olcu.w + PAY * 2, h: olcu.h + PAY * 2 };
}

export function sekilMerkezi(ctx: CanvasRenderingContext2D, sekil: Sekil): Nokta {
  const s = sekilHamSinirlari(ctx, sekil);
  return { x: s.x + s.w / 2, y: s.y + s.h / 2 };
}

export function sekilSinirlari(ctx: CanvasRenderingContext2D, sekil: Sekil) {
  const ham = sekilHamSinirlari(ctx, sekil);
  const derece = sekil.donus ?? 0;
  if (Math.abs(derece) < 0.01) return ham;
  const merkez = { x: ham.x + ham.w / 2, y: ham.y + ham.h / 2 };
  const koseler = [
    { x: ham.x, y: ham.y }, { x: ham.x + ham.w, y: ham.y },
    { x: ham.x + ham.w, y: ham.y + ham.h }, { x: ham.x, y: ham.y + ham.h },
  ].map((n) => noktaDondur(n, merkez, derece));
  const xs = koseler.map((n) => n.x);
  const ys = koseler.map((n) => n.y);
  const x = Math.min(...xs), y = Math.min(...ys);
  return { x, y, w: Math.max(...xs) - x, h: Math.max(...ys) - y };
}

// sekilSinirlari, seçim çerçevesi için kasıtlı 4px pay (PAY) içerir — o amaç
// için doğrudur ama hizalama/değme hesaplarında YANLIŞ: iki şeklin gerçek
// kenarları arasında sistematik ~4-8px'lik bir sapmaya yol açıyordu (kral'ın
// "değdi mi değmedi mi anlamıyorum" tespitinin gerçek nedeni). Bu, PAY'sız,
// şeklin GERÇEK geometrik kutusunu (döndürme dahil) döndürür.
// Metin şekli için sekilGeometriKutusu { x, y, w:0, h:0 } döner (ölçüm ctx
// istediğinden orada hesaplanamıyor) — bu, kılavuzun metnin görünen kutusu
// yerine sol-taban çapa noktasına çizilmesine ve sürüklerken üç kenar
// adayının tek noktaya çökmesine yol açıyordu. Burada ctx alınıp metin için
// gerçek (PAY'sız) kutu üretiliyor; diğer türler değişmiyor.
export function sekilTamKutusu(ctx: CanvasRenderingContext2D, sekil: Sekil) {
  const ham = sekil.tur === "metin"
    ? (() => {
        const olcu = metinOlculeri(ctx, sekil);
        return { x: sekil.x, y: sekil.y - olcu.punto, w: olcu.w, h: olcu.h };
      })()
    : sekilGeometriKutusu(sekil);
  const derece = sekil.donus ?? 0;
  if (Math.abs(derece) < 0.01) return ham;
  const merkez = { x: ham.x + ham.w / 2, y: ham.y + ham.h / 2 };
  const koseler = [
    { x: ham.x, y: ham.y }, { x: ham.x + ham.w, y: ham.y },
    { x: ham.x + ham.w, y: ham.y + ham.h }, { x: ham.x, y: ham.y + ham.h },
  ].map((n) => noktaDondur(n, merkez, derece));
  const xs = koseler.map((n) => n.x);
  const ys = koseler.map((n) => n.y);
  const x = Math.min(...xs), y = Math.min(...ys);
  return { x, y, w: Math.max(...xs) - x, h: Math.max(...ys) - y };
}

/**
 * Bağlayıcının kapladığı kutu — YOLUNDAN hesaplanıyor.
 *
 * `sekilHamSinirlari` bağlayıcıyı bilerek tuvalin ÇOK DIŞINA atıyor
 * (`{-1e6, -1e6}`; seçim dikdörtgeni yakalamasın diye) ve şekil listesi olmadan
 * yolu da hesaplayamaz. İçerik sınırı bunu kullanınca iki şey birden bozuluyordu:
 *
 * 1. ÖLÇÜLDÜ, bugünkü çıktıyı bozan asıl kusur: `-1e6` sol/üst uçta
 *    `Math.max(0, …)` ile 0'a kırpılıyor, yani BAĞLAYICI İÇEREN HER çizimin
 *    içerik sınırı (0, 0)'dan başlıyordu. İki kutu + bir ok: doğru kırpma
 *    282,182 196×306 iken sınır 0,0 478×488 çıkıyordu — soruya eklenen
 *    görselin solunda ve üstünde koca bir boşluk, şema da o oranda küçük.
 * 2. Serbest uçlu bağlayıcı (tip izin veriyor: `BaglayiciUcu` ham nokta
 *    olabilir) kutuların dışında durabilir ve sınıra katılmazsa kırpılırdı.
 *    Kutuya tutunan okta bu olmuyor: beş yerleşim denendi (yan yana, alt alta,
 *    hedef üstte, çapraz, örtüşen), yol kutuların ortak kutusundan çıkmıyor.
 *
 * Yetim bağlayıcıda (tutunduğu şekil silinmiş) yol yok — null döner ve sınıra
 * hiç katılmaz.
 */
function baglayiciSiniri(
  sekiller: Sekil[],
  sekil: Extract<Sekil, { tur: "baglayici" }>,
) {
  const yol = baglayiciYolu(sekiller, sekil);
  if (!yol || yol.length === 0) return null;
  const kutu = noktaListesiKutusu(yol);
  // Ok başı ve çizgi kalınlığı yolun dışına taşıyor.
  // Etiketli vektörde yazı çizginin YANINA düşer; payı büyüt ki kırpılmasın.
  const PAY = 6 + sekil.kalinlik + (sekil.etiket?.trim() ? 34 : 0);
  return { x: kutu.x - PAY, y: kutu.y - PAY, w: kutu.w + PAY * 2, h: kutu.h + PAY * 2 };
}

/**
 * Fizik etiketinin kapladığı kutu (dönüşsüz yaklaşım: etiket her zaman düz
 * yazılır, yeri şeklin merkezine göre dönen noktadan gelir).
 */
function fizikEtiketSiniri(ctx: CanvasRenderingContext2D, s: Extract<Sekil, { tur: "fizik" }>) {
  // Grafik: eksen sayıları, eksen adları, oklar ve başlık kutunun DIŞINA taşar.
  if (s.nesne === "grafik" || s.nesne === "istatistik" || s.nesne === "sema" || s.nesne === "kimya") {
    const pay = s.nesne === "grafik" ? grafikEtiketPayi(s) : s.nesne === "istatistik" ? istatistikPayi() : s.nesne === "kimya" ? kimyaPayi() : semaPayi();
    return { x: s.x - pay.sol, y: s.y - pay.ust, w: s.w + pay.sol + pay.sag, h: s.h + pay.ust + pay.alt };
  }
  const etiket = s.etiket?.trim();
  if (!etiket) return null;
  const punto = FIZIK_ETIKET_PUNTO;
  const olcu = fizikMetniOlcu(ctx, etiket.replace("|", "  "), punto);
  const merkez = { x: s.x + s.w / 2, y: s.y + s.h / 2 };
  const yer = s.etiketYeri ?? FIZIK_TANIMLARI[s.nesne].etiketYeri;
  // Etiketin kutuya göre orta noktası (çizimdeki konumlarla aynı).
  let nokta: Nokta =
    yer === "ust" ? { x: merkez.x, y: s.y - punto * 0.85 }
    : yer === "alt" ? { x: merkez.x, y: s.y + s.h + punto * 0.85 }
    : yer === "sag" ? { x: s.x + s.w + 8 + olcu.w / 2, y: merkez.y }
    : yer === "sol" ? { x: s.x - 8 - olcu.w / 2, y: merkez.y }
    : merkez;
  if (s.nesne === "koordinat") nokta = { x: s.x + s.w / 2, y: s.y + s.h / 2 };
  const derece = s.donus ?? 0;
  if (Math.abs(derece) >= 0.01) nokta = noktaDondur(nokta, merkez, derece);
  if (s.nesne === "koordinat") {
    // Etiketler eksen uçlarında: tüm kutuyu ve iki ucu kapsayan pay.
    return { x: s.x - 4, y: s.y - punto * 1.6, w: s.w + olcu.w + 16, h: s.h + punto * 1.6 + 4 };
  }
  const PAY = 4;
  return { x: nokta.x - olcu.w / 2 - PAY, y: nokta.y - olcu.h / 2 - PAY, w: olcu.w + PAY * 2, h: olcu.h + PAY * 2 };
}

/**
 * Kutunun DIŞINA yazı taşıran (grafik/istatistik/şema/kimya dışındaki) fizik
 * nesnelerinin dış payı, dönüş uygulanmış kutu olarak.
 *
 * ÖLÇÜLDÜ (@napi-rs/canvas, tüm şablonlar × varsayılan/0,55 ölçek/30°/90°):
 * - enerjiDuzeyi: düzey adı ve eV yazıları kutu dışına çıkıyor, PNG'de 13–39 px
 *   kırpılıyordu → yazılar ölçülerek kesin pay (`enerjiDuzeyiDisPayi`).
 * - geometri şekilleri: varsayılan adlarda 14 px kırpma payı yetiyor, koordinatlı
 *   adlarda ("A(−12,15)") 11 px kırpılıyordu → en uzun yazıdan üst sınır
 *   (`geometriDisPayi`).
 * - diğer ek şekiller (isinOk, halkaAkim, solenoid, telAlan, alanNokta,
 *   dalgaGirisim): mürekkep `sekilSinirlari` + 14 px içinde, pay gerekmedi.
 */
function fizikDisPayKutusu(ctx: CanvasRenderingContext2D, s: Extract<Sekil, { tur: "fizik" }>) {
  const pay = s.nesne === "enerjiDuzeyi" ? enerjiDuzeyiDisPayi(ctx, s)
    // v1.2: eğik düzlem kuvvet okları/yazıları ve sıvı kabı ölçü okları kutu dışına taşar (optik düzenek kutuya kırpılı çizilir).
    : s.nesne === "egikKuvvet" ? egikKuvvetDisPayi(ctx, s)
    : s.nesne === "siviKabi" ? siviDisPayi(s)
    : s.nesne === "optikDuzenek" ? { sol: 16, ust: 6, sag: 24, alt: 6 }
    : geometriMi(s.nesne) ? geometriDisPayi(ctx, s)
    : null;
  if (!pay) return null;
  const ham = { x: s.x - pay.sol, y: s.y - pay.ust, w: s.w + pay.sol + pay.sag, h: s.h + pay.ust + pay.alt };
  const derece = s.donus ?? 0;
  if (Math.abs(derece) < 0.01) return ham;
  const merkez = { x: s.x + s.w / 2, y: s.y + s.h / 2 };
  const koseler = [
    { x: ham.x, y: ham.y }, { x: ham.x + ham.w, y: ham.y },
    { x: ham.x + ham.w, y: ham.y + ham.h }, { x: ham.x, y: ham.y + ham.h },
  ].map((n) => noktaDondur(n, merkez, derece));
  const x = Math.min(...koseler.map((n) => n.x)), y = Math.min(...koseler.map((n) => n.y));
  return { x, y, w: Math.max(...koseler.map((n) => n.x)) - x, h: Math.max(...koseler.map((n) => n.y)) - y };
}

export function cizimIcerikSiniri(
  ctx: CanvasRenderingContext2D,
  sekiller: Sekil[],
  pay = 14,
  olcu: TuvalOlcusu = VARSAYILAN_TUVAL,
) {
  if (!sekiller.length) return { x: 0, y: 0, w: olcu.w, h: olcu.h };
  const sinirlar = sekiller
    .flatMap((s) => {
      if (s.tur === "baglayici") return [baglayiciSiniri(sekiller, s)];
      // Fizik etiketi kutunun DIŞINA yazılabilir ("R" direncin üstünde): içerik
      // sınırına katılmazsa soruya eklenen görselde kırpılırdı.
      if (s.tur === "fizik") return [sekilSinirlari(ctx, s), fizikEtiketSiniri(ctx, s), fizikDisPayKutusu(ctx, s)];
      return [sekilSinirlari(ctx, s)];
    })
    .filter((s): s is NonNullable<typeof s> => s !== null);
  if (!sinirlar.length) return { x: 0, y: 0, w: olcu.w, h: olcu.h };
  const sol = Math.max(0, Math.min(...sinirlar.map((s) => s.x)) - pay);
  const ust = Math.max(0, Math.min(...sinirlar.map((s) => s.y)) - pay);
  const sag = Math.min(olcu.w, Math.max(...sinirlar.map((s) => s.x + s.w)) + pay);
  const alt = Math.min(olcu.h, Math.max(...sinirlar.map((s) => s.y + s.h)) + pay);
  return { x: sol, y: ust, w: Math.max(24, Math.ceil(sag - sol)), h: Math.max(24, Math.ceil(alt - ust)) };
}

export function birlesikSinir(ctx: CanvasRenderingContext2D, sekiller: Sekil[]) {
  const sinirlar = sekiller.map((s) => sekilSinirlari(ctx, s));
  const x = Math.min(...sinirlar.map((s) => s.x));
  const y = Math.min(...sinirlar.map((s) => s.y));
  const sag = Math.max(...sinirlar.map((s) => s.x + s.w));
  const alt = Math.max(...sinirlar.map((s) => s.y + s.h));
  return { x, y, w: sag - x, h: alt - y };
}

export function noktaYerel(ctx: CanvasRenderingContext2D, sekil: Sekil, nokta: Nokta): Nokta {
  const derece = sekil.donus ?? 0;
  return Math.abs(derece) < 0.01 ? nokta : noktaDondur(nokta, sekilMerkezi(ctx, sekil), -derece);
}

export function sekilTasiSinirli(
  ctx: CanvasRenderingContext2D,
  sekil: Sekil,
  dx: number,
  dy: number,
  olcu: TuvalOlcusu = VARSAYILAN_TUVAL,
): Sekil {
  // Bağlayıcının kutusu bilerek tuval dışında (-1e6); genel yol onu "içeri
  // itmek" için serbest uçlarını 1e6 px kaydırıyordu (seçili kuvvet vektörü
  // ok tuşu/Ctrl+D ile ekrandan kayboluyordu). Yalnız serbest uçlar taşınır
  // ve tuval içinde tutulur; şekle tutunan uçlar zaten şekille gelir.
  if (sekil.tur === "baglayici") {
    const tasinan = sekilTasi(sekil, dx, dy) as typeof sekil;
    const sinirla = (u: typeof sekil.kaynak) => ("sekilId" in u ? u
      : { x: Math.max(0, Math.min(olcu.w, u.x)), y: Math.max(0, Math.min(olcu.h, u.y)) });
    return { ...tasinan, kaynak: sinirla(tasinan.kaynak), hedef: sinirla(tasinan.hedef) };
  }
  const ilk = sekilTasi(sekil, dx, dy);
  const sinir = sekilSinirlari(ctx, ilk);
  const duzeltX = sinir.x < 0 ? -sinir.x : sinir.x + sinir.w > olcu.w ? olcu.w - (sinir.x + sinir.w) : 0;
  const duzeltY = sinir.y < 0 ? -sinir.y : sinir.y + sinir.h > olcu.h ? olcu.h - (sinir.y + sinir.h) : 0;
  return sekilTasi(ilk, duzeltX, duzeltY);
}

// Nokta-listesi olan şekillerde (çizgi, üçgen, çokgen, dalga, serbest bırakılmış
// dikdörtgen) her nokta kendi tutamacını alır. Kutu-tabanlı şekillerde
// (dikdörtgen normal modda, elips) köşe tutamaçları kullanılır. Serbest çizgi ve
// metin etiketi sadece taşınır/döndürülür, ayrı tutamaçları yoktur.
export function sekilTutamaclari(ctx: CanvasRenderingContext2D, sekil: Sekil): { id: TutamacId; x: number; y: number }[] {
  // Bağlayıcının tutamacı YOK: uçları şekillere bağlı, boyutlandırmak ya da
  // döndürmek anlamsız. Döndürme tutamacı bırakılsaydı ok kendi ekseninde
  // döner ve tutunduğu kutulardan kopmuş görünürdü.
  if (sekil.tur === "baglayici") return [];
  let ham: { id: TutamacId; x: number; y: number }[] = [];
  const noktalar = sekilTutamacNoktalari(sekil);
  if (noktalar) {
    ham = noktalar.map((n, i) => ({ id: `nokta-${i}` as TutamacId, x: n.x, y: n.y }));
  } else if (sekil.tur === "dikdortgen" || sekil.tur === "elips" || sekil.tur === "akis" || sekil.tur === "fizik") {
    ham = [
      { id: "sol-ust", x: sekil.x, y: sekil.y },
      { id: "sag-ust", x: sekil.x + sekil.w, y: sekil.y },
      { id: "sol-alt", x: sekil.x, y: sekil.y + sekil.h },
      { id: "sag-alt", x: sekil.x + sekil.w, y: sekil.y + sekil.h },
    ];
  }
  const merkez = sekilMerkezi(ctx, sekil);
  const derece = sekil.donus ?? 0;
  const dondurHam = { id: "dondur" as const, x: merkez.x, y: sekilHamSinirlari(ctx, sekil).y - 24 };
  return [...ham, dondurHam].map((t) => ({ ...t, ...noktaDondur(t, merkez, derece) }));
}
