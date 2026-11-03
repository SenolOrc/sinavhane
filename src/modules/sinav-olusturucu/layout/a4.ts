import { MM_PX, PT_MM, SATIR_MM } from "../constants";
import type { Bant, SayfaYerlesimi, SoruOgesi } from "../types";
import { htmlToText } from "../utils";

export function mmPx(mm: number) {
  return mm * MM_PX;
}

export function puntoPx(punto: number) {
  return punto * PT_MM * MM_PX;
}

// ── Testin sonuna basılan cevap anahtarı ────────────────────────────────────
//
// Geometri BURADA tanımlı çünkü iki yerde birden gerekiyor: bloğu çizen
// bileşen (SinavKagit) ve son sayfada ona yer AYIRAN yerleşim (aşağıdaki
// `sonSayfaEkMm`). İkisi ayrışırsa hata sessiz olur — blok kâğıda sığmayıp
// son soruyu taşırır ya da boşuna bir sayfa doğar. Tarayıcının varsayılan
// satır yüksekliğine güvenmemek için `lineHeight` bileşende AÇIKÇA veriliyor;
// buradaki çarpan onunla birebir aynı olmak zorunda.
export const ANAHTAR_SUTUN = 4;
export const ANAHTAR_PUNTO = 12;
export const ANAHTAR_SATIR_ARA_MM = 3;
export const ANAHTAR_SATIR_YUKSEKLIK = 1.3;
/** "CEVAP ANAHTARI" satırı. Ayrı sayfaya basılan anahtarda ZATEN 15pt'ti;
 *  testin sonundaki de aynı olsun diye o değer korundu — ortaklaştırma
 *  çalışan çıktıyı değiştirmemeli. */
export const ANAHTAR_BASLIK_PUNTO = 15;
/** Ayrı sayfada anahtarın üstündeki sınav başlığı (testin sonunda çizilmez:
 *  o başlık zaten 1. sayfanın tepesinde). Rezerv hesabına GİRMEZ. */
export const ANAHTAR_UST_BASLIK_PUNTO = 13;
/** Bloğun son sorudan ayrılması için üstten boşluk. */
export const ANAHTAR_UST_BOSLUK_MM = 8;
/** Başlık ile ızgara arası (ayrı sayfadaki marginBottom ile aynı). */
export const ANAHTAR_BASLIK_ALT_MM = 6;
/** Sınav başlığı ile "CEVAP ANAHTARI" arası — yalnız ayrı sayfada. */
export const ANAHTAR_UST_BASLIK_ARA_MM = 2;

/** "CEVAP ANAHTARI" başlığı + N maddelik ızgaranın toplam yüksekliği (mm). */
export function cevapAnahtariYuksekligiMm(maddeSayisi: number): number {
  if (maddeSayisi <= 0) return 0;
  const satir = Math.ceil(maddeSayisi / ANAHTAR_SUTUN);
  const satirMm = ANAHTAR_PUNTO * PT_MM * ANAHTAR_SATIR_YUKSEKLIK;
  return (
    ANAHTAR_UST_BOSLUK_MM +
    ANAHTAR_BASLIK_PUNTO * PT_MM * ANAHTAR_SATIR_YUKSEKLIK +
    ANAHTAR_BASLIK_ALT_MM +
    satir * satirMm +
    Math.max(0, satir - 1) * ANAHTAR_SATIR_ARA_MM
  );
}

export function kabaTahminMm(soru: SoruOgesi, icerikMm: number, testModu = false) {
  const satirKarakter = Math.max(18, icerikMm / 2.1);
  let toplam = 6;
  if (soru.tur === "gorsel") {
    // Serbest yükseklik verilmişse oran GEÇERSİZ: görsel dikeyde esnetilmiş
    // demektir ve ilk boyamadaki tahmin de onu kullanmalı. (Gerçek sayfalama
    // DOM'dan ölçüyor; burası yalnız ölçüm gelmeden önceki tahmin — yanlış
    // tahmin ilk karede sayfa sayısını oynatır.)
    toplam += soru.gorselYukseklikMm
      ? soru.gorselYukseklikMm
      : Math.min(soru.genislikMm, icerikMm) / Math.max(0.3, soru.gorselOran ?? 1.35);
  }
  const kok = htmlToText(soru.tur === "metin" ? soru.metinHtml : soru.altMetinHtml);
  if (kok.length > 0) {
    toplam += Math.ceil(kok.length / satirKarakter) * (soru.punto * PT_MM * 1.45);
  }
  for (const madde of soru.maddeler) {
    const uzunluk = Math.max(1, htmlToText(madde.metinHtml).length);
    toplam +=
      (Math.ceil(uzunluk / satirKarakter) * (soru.punto * PT_MM * 1.45)) /
        soru.maddeKolon +
      (testModu ? 0 : madde.cevapSatir * SATIR_MM);
  }
  return toplam;
}

export function sayfalariOlustur(
  sorular: SoruOgesi[],
  yukseklikMm: (soru: SoruOgesi) => number,
  ayar: {
    ciftSutun: boolean;
    kapasiteIlkMm: number;
    kapasiteDevamMm: number;
    /** Son sayfada öğretmen imza bloğu için ayrılacak yükseklik (yoksa 0). */
    imzaMm?: number;
    /** Cevap anahtarı testin sonuna basılacaksa son sayfada ayrılacak
     *  yükseklik (`cevapAnahtariYuksekligiMm`); ayrı sayfa seçildiğinde 0. */
    anahtarMm?: number;
  },
): SayfaYerlesimi[] {
  if (sorular.length === 0) return [];

  type SutunTaslagi = {
    sol: SoruOgesi[];
    sag: SoruOgesi[];
    solMm: number;
    sagMm: number;
    kapasiteMm: number;
    sagda: boolean;
  };

  const sayfalar: SayfaYerlesimi[] = [];
  let sayfaNo = 1;
  let kapasite = ayar.kapasiteIlkMm;
  let kalan = kapasite;
  let bantlar: Bant[] = [];
  let sutun: SutunTaslagi | null = null;

  /** `dengele`: bant, ardından gelen tam genişlik soru ya da belge sonu yüzünden
   *  kapanıyorsa sütunlar yeniden dengelenir (sırayı bozmadan: önce sol, sonra
   *  sağ). Sol sütun dolu sağ boş kalan bantlar kısalır; kazanılan yükseklik
   *  sonraki soruya kalır (sayfa israfı). Sayfa dolduğu için kapanan bantlar
   *  zaten dengelidir, onlara dokunulmaz. */
  function bantKapat(dengele = false) {
    if (!sutun) return;
    if (dengele) sutunuDengele(sutun);
    const yuk = Math.max(sutun.solMm, sutun.sagMm);
    bantlar.push({ tip: "sutun", sol: sutun.sol, sag: sutun.sag, yukMm: yuk });
    kalan = Math.max(0, kalan - yuk);
    sutun = null;
  }

  function sutunuDengele(b: SutunTaslagi) {
    const hepsi = [...b.sol, ...b.sag];
    if (hepsi.length < 2) return;
    const yukler = hepsi.map((q) => yukseklikMm(q) + q.boslukMm);
    const topla = (bas: number, son: number) => yukler.slice(bas, son).reduce((t, y) => t + y, 0);
    // Soru sonu boşluğu sütunun dibinde sığma denetimine girmez (yukarıdaki kural).
    const sigar = (bas: number, son: number) =>
      son <= bas || topla(bas, son) - hepsi[son - 1].boslukMm <= b.kapasiteMm + 0.001;
    let en = -1;
    let enMm = Infinity;
    for (let i = 0; i <= hepsi.length; i++) {
      if (!sigar(0, i) || !sigar(i, hepsi.length)) continue;
      const mm = Math.max(topla(0, i), topla(i, hepsi.length));
      // Eşitlikte sol sütun daha dolu olan (daha büyük i) tercih edilir.
      if (mm < enMm - 0.001 || (Math.abs(mm - enMm) <= 0.001 && i > en)) {
        en = i;
        enMm = mm;
      }
    }
    if (en < 0) return;
    b.sol = hepsi.slice(0, en);
    b.sag = hepsi.slice(en);
    b.solMm = topla(0, en);
    b.sagMm = topla(en, hepsi.length);
  }

  function sayfaKapat() {
    bantKapat();
    // Tam sayfa sorusu kendinden sonra sayfayı kapatıyor; o soru listenin
    // sonuncusuysa döngü bitince gelen kapanış BOŞ bir sayfa üretirdi.
    if (bantlar.length === 0 && sayfalar.length > 0) return;
    sayfalar.push({
      sayfaNo,
      bantlar,
      kapasiteMm: kapasite,
      kullanilanMm: kapasite - kalan,
    });
    sayfaNo += 1;
    kapasite = ayar.kapasiteDevamMm;
    kalan = kapasite;
    bantlar = [];
  }

  for (const soru of sorular) {
    const yuk = yukseklikMm(soru) + soru.boslukMm;
    // SIĞMA denetimi sorunun KENDİ yüksekliğiyle yapılır: soru sonrası boşluk
    // (boslukMm) sonraki soruyla arasındaki mesafedir; sayfanın dibinde
    // gerekmez. Boşluk dâhil karşılaştırınca sayfada yer olduğu hâlde soru
    // sonraki sayfaya atılıyordu (1. sayfa %39 dolu, %61 boş).
    const sigmaMm = yukseklikMm(soru);
    const tamYerlesim = !ayar.ciftSutun || soru.tamGenislik;

    // Tam sayfa aktarımı KENDİ sayfasını ister. Üstünde bir şey varsa sayfa
    // kapanır; altına da bir şey konmaz. Gerekçe geometrik: A4 oranındaki bir
    // sayfa görseli tam genişlikte ~269mm sürüyor, ilk sayfanın kapasitesi ise
    // 58mm'lik başlık yüzünden 215mm. Aynı sayfayı paylaşmaya kalkarsa kâğıt
    // 297mm'yi aşar ve SONRAKİ TÜM sayfaların hizası kayar (bkz. SinavKagit'te
    // sabitlenen yükseklik). Devam sayfalarında başlık olmadığı için 273mm
    // kapasiteye rahat oturur.
    if (soru.tamSayfa) {
      bantKapat(true);
      if (bantlar.length > 0) sayfaKapat();
      bantlar.push({ tip: "tam", soru, yukMm: yuk });
      kalan = Math.max(0, kalan - yuk);
      sayfaKapat();
      continue;
    }

    if (tamYerlesim) {
      bantKapat(true);
      if (sigmaMm > kalan && bantlar.length > 0) sayfaKapat();
      bantlar.push({ tip: "tam", soru, yukMm: yuk });
      kalan = Math.max(0, kalan - yuk);
      continue;
    }

    let aktif: SutunTaslagi | null = sutun;
    if (!aktif) {
      if (kalan < 10 && bantlar.length > 0) sayfaKapat();
      // Soru kalan alana sığmıyorsa ve sayfada başka içerik varsa YENİ SAYFA:
      // aksi hâlde sütuna zorla konup sayfa dibinde kesiliyordu.
      if (sigmaMm > kalan && bantlar.length > 0) sayfaKapat();
      aktif = {
        sol: [],
        sag: [],
        solMm: 0,
        sagMm: 0,
        kapasiteMm: kalan,
        sagda: false,
      };
      sutun = aktif;
    }

    const solaSigar =
      !aktif.sagda && (aktif.solMm + sigmaMm <= aktif.kapasiteMm || aktif.sol.length === 0);

    if (solaSigar) {
      aktif.sol.push(soru);
      aktif.solMm += yuk;
    } else {
      aktif.sagda = true;
      // Sağ sütun boş olsa da sığma denetimi ŞART: sütun kapasitesi iki yanda
      // aynıdır, sığmayan soru sağa zorlanırsa sayfa dibinde KESİLİR (sessiz
      // içerik kaybı). Sığmıyorsa sayfa kapanır, soru yeni sayfanın solundan
      // başlar (orada tek başına da sığmazsa bölme/taşma uyarısı devreye girer).
      if (aktif.sagMm + sigmaMm <= aktif.kapasiteMm) {
        aktif.sag.push(soru);
        aktif.sagMm += yuk;
      } else {
        sayfaKapat();
        sutun = {
          sol: [soru],
          sag: [],
          solMm: yuk,
          sagMm: 0,
          kapasiteMm: kalan,
          sagda: false,
        };
      }
    }
  }

  bantKapat(true);
  sayfaKapat();

  // İmza bloğu SON sayfada normal akışta çizilir ama kapasiteden düşülmüyordu.
  // Hangi sayfanın son olduğu ancak sayfalama bittiğinde bilindiği için burada,
  // son geçişte ele alınır: son sayfada blok sığmıyorsa son bant(lar) yeni bir
  // sayfaya taşınır. Tek bantlı bir sayfada taşıma yapılmaz — o soru zaten tek
  // başına sayfayı dolduruyor demektir ve mevcut taşma uyarısı bunu bildirir.
  //
  // Cevap anahtarı testin sonuna basıldığında AYNI yerde duruyor (imzanın
  // üstünde) ve aynı riski taşıyor, o yüzden iki blok tek bir rezerv olarak
  // toplanıyor. Ayrı ayrı yürütülseydi ikisi birden sığmadığında yalnız biri
  // için taşıma yapılırdı.
  const imzaMm = (ayar.imzaMm ?? 0) + (ayar.anahtarMm ?? 0);
  if (imzaMm > 0) {
    let guvenlik = sayfalar.length + 4;
    while (guvenlik-- > 0) {
      const son = sayfalar[sayfalar.length - 1];
      if (!son) break;
      const bosMm = son.kapasiteMm - son.kullanilanMm;
      if (bosMm >= imzaMm || son.bantlar.length <= 1) break;
      const tasinan = son.bantlar.pop();
      if (!tasinan) break;
      son.kullanilanMm -= tasinan.yukMm;
      sayfalar.push({
        sayfaNo: son.sayfaNo + 1,
        bantlar: [tasinan],
        kapasiteMm: ayar.kapasiteDevamMm,
        kullanilanMm: tasinan.yukMm,
      });
    }
  }

  return sayfalar;
}
