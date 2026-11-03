// Vuruş testi: bir tıklamanın hangi şekle denk geldiği.
//
// Kritik ayrıntı, şeklin İÇİNİN dolu sayılmaması: iç içe dikdörtgenlerde
// dıştakinin boş iç alanına tıklayan öğretmen içtekini seçebilmeli. Bu yüzden
// ölçü "kutunun içinde mi" değil, KENARA uzaklık. Pay zoom'a göre büyür
// (`vurusPayi`), yoksa uzaklaştırılmış tuvalde ince çizgiler tıklanamaz olur.

import type { Nokta, Sekil } from "./tipler";
import { BAGLAYICI_VURUS_PAYI, DEGME_TOLERANSI, TUTAMAC_VURUS_YARICAPI, VURUS_PAYI } from "./sabitler";
import {
  akisKutusuKosaleri,
  baglayiciYolu,
  elipsKenarUzakligi,
  enKucukKenarUzakligi,
  izgaraBoyutu,
  noktaCokgenIcindeMi,
  noktaSegmenteUzaklik,
} from "./geometri";
import { noktaYerel, sekilHamSinirlari } from "./sinirlar";

// Vuruş payı, tuvalin gerçek çizim uzayında sabit bir mesafe (VURUS_PAYI). Uzaklaştırılmış
// (küçük zoom) görünümde ekrandaki 1 piksel, tuval uzayında daha fazla birime karşılık
// gelir; payı da zoom'a göre büyütmezsek uzaklaştırılmış karmaşık çizimlerde ince
// çizgili şekilleri (doğru, üçgen kenarı vb.) seçmek gerçek ekranda birkaç piksele
// sıkışır ve "seçemiyorum" hissi verir.
export function vurusPayi(zoomYuzde: number) {
  return VURUS_PAYI * (100 / Math.max(zoomYuzde, 1));
}

export function tutamacPayi(zoomYuzde: number) {
  return TUTAMAC_VURUS_YARICAPI * (100 / Math.max(zoomYuzde, 1));
}

// Şeklin kenarına (metin/kutu için: kutusuna) olan ham uzaklığı — hem vuruş
// testi (sekilVuruldu, zoom'a göre paylı) hem de değme göstergesi (çok küçük,
// sabit bir toleransla) bu tek fonksiyonu paylaşır.
export function sekilKenarUzakligi(ctx: CanvasRenderingContext2D, sekil: Sekil, nokta: Nokta): number {
  const p = noktaYerel(ctx, sekil, nokta);
  if (sekil.tur === "dogru")
    return noktaSegmenteUzaklik(p, { x: sekil.x1, y: sekil.y1 }, { x: sekil.x2, y: sekil.y2 });
  if (sekil.tur === "serbest" || sekil.tur === "dalga") {
    let enKucuk = Infinity;
    for (let i = 0; i < sekil.noktalar.length - 1; i += 1) {
      enKucuk = Math.min(enKucuk, noktaSegmenteUzaklik(p, sekil.noktalar[i], sekil.noktalar[i + 1]));
    }
    return enKucuk;
  }
  if (sekil.tur === "cokgen") return enKucukKenarUzakligi(p, sekil.noktalar);
  // Akış kutusu: kenarlarına değmek yetmiyor, İÇİ de tıklanabilir olmalı —
  // öğretmen kutunun ortasındaki yazıya tıklayıp seçmek istiyor. Diğer
  // şekillerde iç boş kabul ediliyor (kenar çizgisi aranıyor); burada dolu
  // sayılıyor çünkü kutu bir "nesne", bir çizgi değil.
  if (sekil.tur === "akis") {
    const koseler = akisKutusuKosaleri(sekil);
    if (noktaCokgenIcindeMi(p, koseler)) return 0;
    return enKucukKenarUzakligi(p, koseler);
  }
  // Fizik nesnesi de bir "nesne": kutusunun İÇİ tıklanabilir (kütle bloğunun
  // ortasına tıklayıp seçmek doğal). Kenara uzaklık, kutu dışında kalan
  // tıklamalar için (ip bağlamak üzere kenara yakın basmak).
  // Kareli alan: yalnız çizgilerine yakınlık seçer — içi boş; içine konan
  // cisimlere/vektörlere tıklamayı çalmaz.
  if (sekil.tur === "fizik" && sekil.nesne === "kareliAlan") {
    const { satir, sutun } = izgaraBoyutu(sekil);
    if (p.x < sekil.x - 1 || p.x > sekil.x + sekil.w + 1 || p.y < sekil.y - 1 || p.y > sekil.y + sekil.h + 1) {
      return enKucukKenarUzakligi(p, [
        { x: sekil.x, y: sekil.y }, { x: sekil.x + sekil.w, y: sekil.y },
        { x: sekil.x + sekil.w, y: sekil.y + sekil.h }, { x: sekil.x, y: sekil.y + sekil.h },
      ]);
    }
    let en = Infinity;
    for (let c = 0; c <= sutun; c += 1) en = Math.min(en, Math.abs(p.x - (sekil.x + (sekil.w * c) / sutun)));
    for (let r = 0; r <= satir; r += 1) en = Math.min(en, Math.abs(p.y - (sekil.y + (sekil.h * r) / satir)));
    return en;
  }
  if (sekil.tur === "fizik") {
    const koseler = [
      { x: sekil.x, y: sekil.y },
      { x: sekil.x + sekil.w, y: sekil.y },
      { x: sekil.x + sekil.w, y: sekil.y + sekil.h },
      { x: sekil.x, y: sekil.y + sekil.h },
    ];
    return noktaCokgenIcindeMi(p, koseler) ? 0 : enKucukKenarUzakligi(p, koseler);
  }
  if (sekil.tur === "dikdortgen" && sekil.serbestKoseler) return enKucukKenarUzakligi(p, sekil.serbestKoseler);
  // Dikdörtgen/elips/üçgen sadece çizgiyle (dolgusuz) çizildiği için vuruş testi de
  // sadece kenara yakınlığa bakar — tüm iç alanı "vurulmuş" saymak, iç içe geçmiş
  // küçük bir şekli büyük olanın kutusu yüzünden hiç seçilemez hale getiriyordu.
  if (sekil.tur === "dikdortgen")
    return enKucukKenarUzakligi(p, [
      { x: sekil.x, y: sekil.y },
      { x: sekil.x + sekil.w, y: sekil.y },
      { x: sekil.x + sekil.w, y: sekil.y + sekil.h },
      { x: sekil.x, y: sekil.y + sekil.h },
    ]);
  if (sekil.tur === "ucgen")
    return enKucukKenarUzakligi(p, [
      { x: sekil.x1, y: sekil.y1 },
      { x: sekil.x2, y: sekil.y2 },
      { x: sekil.x3, y: sekil.y3 },
    ]);
  if (sekil.tur === "elips") return elipsKenarUzakligi(sekil, p);
  const sinir = sekilHamSinirlari(ctx, sekil);
  const icinde = p.x >= sinir.x && p.x <= sinir.x + sinir.w && p.y >= sinir.y && p.y <= sinir.y + sinir.h;
  return icinde ? 0 : Infinity;
}

export function sekilVuruldu(
  ctx: CanvasRenderingContext2D,
  sekil: Sekil,
  nokta: Nokta,
  zoomYuzde = 100,
  /** Bağlayıcı için ŞART: yolu şekil listesinden hesaplanıyor. Verilmezse
   *  bağlayıcı hiç vurulamaz — sessiz "seçilemiyor" hatası olurdu, o yüzden
   *  bu parametreyi eklemeden bağlayıcıyı tıklanabilir sayma. */
  sekiller?: Sekil[],
) {
  if (sekil.tur === "baglayici") {
    if (!sekiller) return false;
    const yol = baglayiciYolu(sekiller, sekil);
    if (!yol) return false;
    let enYakin = Infinity;
    for (let i = 1; i < yol.length; i += 1) {
      enYakin = Math.min(enYakin, noktaSegmenteUzaklik(nokta, yol[i - 1], yol[i]));
    }
    return enYakin <= BAGLAYICI_VURUS_PAYI;
  }
  return sekilKenarUzakligi(ctx, sekil, nokta) <= vurusPayi(zoomYuzde);
}

// Bir köşenin, HARİÇ tutulan (kendi) şekil dışında başka herhangi bir şekle
// neredeyse tam üst üste geldiğini bildirir — hizalama kılavuzundan çok daha
// sıkı, sabit bir toleransla (zoom'a göre büyümez). Sürükleme bitip kılavuz
// çizgisi kaybolduktan SONRA da "değdi mi" sorusuna kalıcı bir görsel cevap
// vermek için kullanılır.
export function noktaBaskaSekleDegiyorMu(
  ctx: CanvasRenderingContext2D,
  sekiller: Sekil[],
  haricId: string,
  nokta: Nokta,
): boolean {
  for (const s of sekiller) {
    if (s.id === haricId) continue;
    if (sekilKenarUzakligi(ctx, s, nokta) <= DEGME_TOLERANSI) return true;
  }
  return false;
}
