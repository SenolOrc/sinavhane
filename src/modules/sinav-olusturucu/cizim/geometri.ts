// Saf geometri: şekil noktalarının üretimi, taşınması, boyutlandırılması
// ve nokta/kenar uzaklıkları. Hiçbiri canvas bağlamına dokunmaz.
//
// Buradaki fonksiyonların hepsi aynı sözleşmeyi taşır: şekli DEĞİŞTİRMEZ,
// yenisini döndürür. Bu bir üslup tercihi değil: geri al geçmişi şekil
// dizilerinin anlık görüntülerini REFERANSLA saklıyor
// (`CizimEditoruModal.tsx` `gecmisRef`), dolayısıyla yerinde bir değişiklik
// geçmişteki kaydı da sessizce değiştirir ve Ctrl+Z eski hâle dönemez.

import type { AkisSekli, BaglayiciUcu, CizilenTaslak, Nokta, Sekil, TutamacId } from "./tipler";
import { ASGARI_CIZIM_PX, BAGLAYICI_CIKIS, VARSAYILAN_TUVAL } from "./sabitler";
import type { TuvalOlcusu } from "./sabitler";

export function sekilId() {
  return `sekil-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

export function kutuNormalle(x: number, y: number, w: number, h: number) {
  return {
    x: w < 0 ? x + w : x,
    y: h < 0 ? y + h : y,
    w: Math.abs(w),
    h: Math.abs(h),
  };
}

// Çizerken sürüklenen kutudan ikizkenar üçgen köşeleri türetir (tepe ortada,
// taban düz). Oluşturulduktan sonra her köşe ayrı ayrı sürüklenip dik/geniş
// açılı/çeşitkenar gibi başka üçgen türlerine dönüştürülebilir.
export function ucgenNoktalari(kutu: { x: number; y: number; w: number; h: number }) {
  return {
    x1: kutu.x + kutu.w / 2,
    y1: kutu.y,
    x2: kutu.x,
    y2: kutu.y + kutu.h,
    x3: kutu.x + kutu.w,
    y3: kutu.y + kutu.h,
  };
}

// Kutuya içten teğet bir elips üzerine eşit aralıklı yerleştirilmiş düzgün
// çokgen köşeleri üretir (tepe noktası yukarıda, üçgendeki tepe-ortada
// kuralıyla tutarlı). Oluşturulduktan sonra her köşe ayrı ayrı sürüklenip
// düzgün olmayan bir çokgene dönüştürülebilir.
export function cokgenNoktalariUret(kutu: { x: number; y: number; w: number; h: number }, kenarSayisi: number): Nokta[] {
  const cx = kutu.x + kutu.w / 2;
  const cy = kutu.y + kutu.h / 2;
  const rx = kutu.w / 2;
  const ry = kutu.h / 2;
  const noktalar: Nokta[] = [];
  for (let i = 0; i < kenarSayisi; i += 1) {
    const aci = -Math.PI / 2 + (i * 2 * Math.PI) / kenarSayisi;
    noktalar.push({ x: cx + rx * Math.cos(aci), y: cy + ry * Math.sin(aci) });
  }
  return noktalar;
}

// Kutu içine sinüs benzeri bir dalga için çeyrek-periyot noktaları üretir
// (her tepe/çukur/sıfır-geçişi ayrı bir kontrol noktası). Her nokta daha sonra
// tek tek sürüklenip genlik/dalga boyu yerelden değiştirilebilir.
const DALGA_ASGARI_YUKSEKLIK = 12;

export function dalgaNoktalariUret(kutu: { x: number; y: number; w: number; h: number }, dalgaSayisi: number): Nokta[] {
  // Tam yatay sürükleme (h=0) düz çizgi + "çok küçük" ret demekti: dalga hiç
  // oluşmuyordu. Yükseklik tabanlı en az bir genlik uygulanır (yatay dalga çizilir).
  const h = kutu.h < DALGA_ASGARI_YUKSEKLIK ? DALGA_ASGARI_YUKSEKLIK : kutu.h;
  const cy = kutu.y + kutu.h / 2;
  const genlik = h / 2;
  const parcaSayisi = Math.max(1, dalgaSayisi) * 4;
  const noktalar: Nokta[] = [];
  for (let i = 0; i <= parcaSayisi; i += 1) {
    const x = kutu.x + (i / parcaSayisi) * kutu.w;
    const y = cy - genlik * Math.sin((i * Math.PI) / 2);
    noktalar.push({ x, y });
  }
  return noktalar;
}

export function dortgenKoseleri(kutu: { x: number; y: number; w: number; h: number }): Nokta[] {
  return [
    { x: kutu.x, y: kutu.y },
    { x: kutu.x + kutu.w, y: kutu.y },
    { x: kutu.x + kutu.w, y: kutu.y + kutu.h },
    { x: kutu.x, y: kutu.y + kutu.h },
  ];
}

export function noktaListesiKutusu(noktalar: Nokta[]) {
  const xs = noktalar.map((n) => n.x);
  const ys = noktalar.map((n) => n.y);
  const x = Math.min(...xs);
  const y = Math.min(...ys);
  return { x, y, w: Math.max(...xs) - x, h: Math.max(...ys) - y };
}

// Şeklin "her köşesi/noktası ayrı ayrı taşınabilir" bir temsili varsa onu
// döndürür (çizgi, üçgen, çokgen, dalga, serbest çizgi, serbest bırakılmış
// dikdörtgen); yoksa null (kutu tabanlı dikdörtgen/elips için). Taşıma,
// boyutlandırma ve kesin-ölçü panelinin ortak temeli budur.
export function sekilNoktalariniAl(sekil: Sekil): Nokta[] | null {
  if (sekil.tur === "dogru") return [{ x: sekil.x1, y: sekil.y1 }, { x: sekil.x2, y: sekil.y2 }];
  if (sekil.tur === "ucgen") return [{ x: sekil.x1, y: sekil.y1 }, { x: sekil.x2, y: sekil.y2 }, { x: sekil.x3, y: sekil.y3 }];
  if (sekil.tur === "serbest" || sekil.tur === "cokgen" || sekil.tur === "dalga") return sekil.noktalar;
  if (sekil.tur === "dikdortgen" && sekil.serbestKoseler) return sekil.serbestKoseler;
  return null;
}

export function sekilNoktalariniUygula(sekil: Sekil, noktalar: Nokta[]): Sekil {
  if (sekil.tur === "dogru") return { ...sekil, x1: noktalar[0].x, y1: noktalar[0].y, x2: noktalar[1].x, y2: noktalar[1].y };
  if (sekil.tur === "ucgen")
    return { ...sekil, x1: noktalar[0].x, y1: noktalar[0].y, x2: noktalar[1].x, y2: noktalar[1].y, x3: noktalar[2].x, y3: noktalar[2].y };
  if (sekil.tur === "serbest" || sekil.tur === "cokgen" || sekil.tur === "dalga") return { ...sekil, noktalar };
  if (sekil.tur === "dikdortgen" && sekil.serbestKoseler) return { ...sekil, serbestKoseler: noktalar };
  return sekil;
}

// Köşe tutamaçları için nokta listesi — serbest çizgi burada BİLEREK hariç
// tutulur: bir serbest çizginin onlarca noktası olabilir, hepsini ayrı tutamaç
// yapmak kullanılamaz bir karmaşaya yol açar. Serbest çizgi yalnızca taşınır/
// döndürülür/oransal ölçeklenir (bkz. sekilNoktalariniAl).
export function sekilTutamacNoktalari(sekil: Sekil): Nokta[] | null {
  if (sekil.tur === "serbest") return null;
  return sekilNoktalariniAl(sekil);
}

export function noktaDondur(nokta: Nokta, merkez: Nokta, derece: number): Nokta {
  const radyan = (derece * Math.PI) / 180;
  const cos = Math.cos(radyan);
  const sin = Math.sin(radyan);
  const dx = nokta.x - merkez.x;
  const dy = nokta.y - merkez.y;
  return { x: merkez.x + dx * cos - dy * sin, y: merkez.y + dx * sin + dy * cos };
}

export function noktaSegmenteUzaklik(p: Nokta, a: Nokta, b: Nokta) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const uzunlukKare = dx * dx + dy * dy;
  if (uzunlukKare === 0) return Math.hypot(p.x - a.x, p.y - a.y);
  let t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / uzunlukKare;
  t = Math.max(0, Math.min(1, t));
  const izX = a.x + t * dx;
  const izY = a.y + t * dy;
  return Math.hypot(p.x - izX, p.y - izY);
}

export function enKucukKenarUzakligi(nokta: Nokta, koseler: Nokta[]) {
  let enKucuk = Infinity;
  for (let i = 0; i < koseler.length; i += 1) {
    const sonraki = koseler[(i + 1) % koseler.length];
    enKucuk = Math.min(enKucuk, noktaSegmenteUzaklik(nokta, koseler[i], sonraki));
  }
  return enKucuk;
}

// Elips çevresine düzgün aralıklarla örnek nokta alıp bunları çokgen gibi
// birbirine bağlayarak yaklaşık kenar uzaklığı hesaplar (kesin elips-nokta
// mesafesi formülü yerine basit ve yeterince doğru bir yöntem).
export function elipsKenarUzakligi(sekil: { x: number; y: number; w: number; h: number }, nokta: Nokta) {
  const cx = sekil.x + sekil.w / 2;
  const cy = sekil.y + sekil.h / 2;
  const rx = Math.max(1, sekil.w / 2);
  const ry = Math.max(1, sekil.h / 2);
  const ORNEK_SAYISI = 48;
  const koseler: Nokta[] = [];
  for (let i = 0; i < ORNEK_SAYISI; i += 1) {
    const aci = (i / ORNEK_SAYISI) * Math.PI * 2;
    koseler.push({ x: cx + rx * Math.cos(aci), y: cy + ry * Math.sin(aci) });
  }
  return enKucukKenarUzakligi(nokta, koseler);
}

// Nokta-listesi olmayan geriye kalan tek şekiller (normal dikdörtgen, elips,
// metin) hepsi x/y alanına sahiptir; noktalar null döndüğünde tur kümesi
// çalışma zamanında bunlarla sınırlıdır ama ayrık birleşim TS'e bunu yapısal
// olarak kanıtlayamaz — bu yüzden burada dar bir cast gerekir.
export function kutuTabanliSekil(sekil: Sekil): Extract<Sekil, { x: number; y: number }> {
  return sekil as Extract<Sekil, { x: number; y: number }>;
}

export function sekilTasi(sekil: Sekil, dx: number, dy: number): Sekil {
  // Bağlayıcı tutunduğu şekillerle GELİR; kendi başına taşınmaz. Yalnız
  // serbest (şekle bağlanmamış) uçları kayar — iki ucu da bağlıysa taşıma
  // görünür bir etki yapmaz ve yapmamalı, yoksa ok kutudan kopardı.
  if (sekil.tur === "baglayici") {
    const ucTasi = (uc: typeof sekil.kaynak) =>
      "sekilId" in uc ? uc : { x: uc.x + dx, y: uc.y + dy };
    return { ...sekil, kaynak: ucTasi(sekil.kaynak), hedef: ucTasi(sekil.hedef) };
  }
  const noktalar = sekilNoktalariniAl(sekil);
  if (noktalar) return sekilNoktalariniUygula(sekil, noktalar.map((n) => ({ x: n.x + dx, y: n.y + dy })));
  const kutu = kutuTabanliSekil(sekil);
  return { ...kutu, x: kutu.x + dx, y: kutu.y + dy };
}

/** Tuvalin TAMAMEN dışında, sıfır ölçülü kutu.
 *
 *  Bağlayıcının kutusu tutunduğu şekillere bağlı; bu fonksiyonun şekil
 *  listesine erişimi yok. Sıfır kutuyu (0,0)'da bırakmak, sol üstten başlayan
 *  her seçim dikdörtgeninin bağlayıcıları da yakalaması demekti. Uzağa
 *  koymak bilinçli bir karar: bağlayıcı SEÇİM DİKDÖRTGENİYLE seçilmez, üstüne
 *  tıklanarak seçilir (`sekilVuruldu` bağlayıcıyı yolundan yakalıyor). */
const BAGLAYICI_KUTU_DISI = { x: -1e6, y: -1e6, w: 0, h: 0 };

export function sekilGeometriKutusu(sekil: Sekil) {
  if (sekil.tur === "baglayici") return BAGLAYICI_KUTU_DISI;
  const noktalar = sekilNoktalariniAl(sekil);
  if (noktalar) return noktaListesiKutusu(noktalar);
  if (sekil.tur === "metin") return { x: sekil.x, y: sekil.y, w: 0, h: 0 };
  const kutu = sekil as Extract<Sekil, { x: number; y: number; w: number; h: number }>;
  return { x: kutu.x, y: kutu.y, w: kutu.w, h: kutu.h };
}

export function sekilGeometriAyarla(
  sekil: Sekil,
  deger: Partial<{ x: number; y: number; w: number; h: number; donus: number }>,
  olcu: TuvalOlcusu = VARSAYILAN_TUVAL,
): Sekil {
  const ilk = sekilGeometriKutusu(sekil);
  const hedefX = Math.max(0, Math.min(olcu.w, deger.x ?? ilk.x));
  const hedefY = Math.max(0, Math.min(olcu.h, deger.y ?? ilk.y));
  let sonuc = sekilTasi(sekil, hedefX - ilk.x, hedefY - ilk.y);
  const tasinmis = sekilGeometriKutusu(sonuc);
  const hedefW = Math.max(1, Math.min(olcu.w - hedefX, deger.w ?? tasinmis.w));
  const hedefH = Math.max(1, Math.min(olcu.h - hedefY, deger.h ?? tasinmis.h));
  const noktalar = sekilNoktalariniAl(sonuc);
  if (noktalar) {
    const sx = tasinmis.w > 0 ? hedefW / tasinmis.w : 1;
    const sy = tasinmis.h > 0 ? hedefH / tasinmis.h : 1;
    const olcekle = (n: Nokta) => ({ x: hedefX + (n.x - hedefX) * sx, y: hedefY + (n.y - hedefY) * sy });
    sonuc = sekilNoktalariniUygula(sonuc, noktalar.map(olcekle));
  } else if (sonuc.tur === "dikdortgen" || sonuc.tur === "elips" || sonuc.tur === "fizik" || sonuc.tur === "akis") {
    sonuc = { ...sonuc, w: hedefW, h: hedefH };
  }
  return { ...sonuc, donus: deger.donus ?? sonuc.donus } as Sekil;
}

const AKIS_ASGARI_W = 40;
const AKIS_ASGARI_H = 24;

export function sekilBoyutlandir(orijinal: Sekil, handleId: TutamacId, nokta: Nokta): Sekil {
  if (typeof handleId === "string" && handleId.startsWith("nokta-")) {
    // Nokta-listesi olan her şekilde ortak yol: tek bir köşe/nokta bağımsız
    // sürüklenir — üçgende dik/geniş açılıya dönüşmesi, çokgende düzgünlükten
    // çıkması, dalgada tek bir tepenin yerelden değişmesi hep bu mekanizmadır.
    const noktalar = sekilNoktalariniAl(orijinal);
    if (!noktalar) return orijinal;
    const index = Number(handleId.slice("nokta-".length));
    const yeni = noktalar.map((n, i) => (i === index ? nokta : n));
    return sekilNoktalariniUygula(orijinal, yeni);
  }
  if (orijinal.tur === "dikdortgen" || orijinal.tur === "elips" || orijinal.tur === "fizik" || orijinal.tur === "akis") {
    // Sürüklenen köşenin karşı köşesi sabit kalır; kutu her zaman bu iki nokta
    // arasından yeniden normalize edilir (hangi köşe tutulursa tutulsun çalışır).
    const sabit =
      handleId === "sol-ust"
        ? { x: orijinal.x + orijinal.w, y: orijinal.y + orijinal.h }
        : handleId === "sag-ust"
          ? { x: orijinal.x, y: orijinal.y + orijinal.h }
          : handleId === "sol-alt"
            ? { x: orijinal.x + orijinal.w, y: orijinal.y }
            : { x: orijinal.x, y: orijinal.y };
    const kutu = kutuNormalle(nokta.x, nokta.y, sabit.x - nokta.x, sabit.y - nokta.y);
    if (orijinal.tur === "akis") {
      // Akış kutusu içindeki yazı/ok bağlantıları sıfıra yakın kutuda anlamsızlaşır:
      // en küçük ölçü uygulanır, sabit köşe yerinde kalır.
      const w = Math.max(AKIS_ASGARI_W, kutu.w);
      const h = Math.max(AKIS_ASGARI_H, kutu.h);
      const x = nokta.x >= sabit.x ? sabit.x : sabit.x - w;
      const y = nokta.y >= sabit.y ? sabit.y : sabit.y - h;
      return { ...orijinal, x, y, w, h };
    }
    return { ...orijinal, ...kutu };
  }
  return orijinal;
}

// Yeni çizilen taslağın kalıcı şekle dönüşmeye HAZIR olup olmadığını söyler.
//
// NEDEN SAF FONKSİYON: bu karar `CizimEditoruModal`'da beş dala yayılmıştı
// (serbest / doğru / üçgen / çokgen-dalga / kutu) ve her dal aynı kuyruğu
// tekrarlıyordu: tarihçeye kaydet → yeni id ver → listeye ekle → setTimeout ile
// seç → taslağı temizle. Değişen TEK şey buradaki "yeterince büyük mü"
// kuralıydı. Kural dallara dağılmış olduğu için birim testle yoklanamıyordu;
// §11.3'teki mutasyon denemesi çizim geometrisinde tam bu sınıftan iki boşluk
// bulmuştu.
//
// Dönüş: kalıcı hâle getirilecek şekil (kutu tabanlılarda NORMALİZE edilmiş),
// çok küçükse null. `id` burada verilmez — çağıran `sekilId()` ile verir,
// böylece fonksiyon saf kalır (Date.now/Math.random içermez).
export function taslagiKesinlestir(taslak: CizilenTaslak): CizilenTaslak | null {
  if (taslak.tur === "serbest") {
    return taslak.noktalar.length < 2 ? null : taslak;
  }
  if (taslak.tur === "dogru") {
    const uzunluk = Math.hypot(taslak.x2 - taslak.x1, taslak.y2 - taslak.y1);
    return uzunluk < ASGARI_CIZIM_PX ? null : taslak;
  }
  if (taslak.tur === "ucgen") {
    const xler = [taslak.x1, taslak.x2, taslak.x3];
    const yler = [taslak.y1, taslak.y2, taslak.y3];
    const dar =
      Math.max(...xler) - Math.min(...xler) < ASGARI_CIZIM_PX ||
      Math.max(...yler) - Math.min(...yler) < ASGARI_CIZIM_PX;
    return dar ? null : taslak;
  }
  if (taslak.tur === "cokgen" || taslak.tur === "dalga") {
    const kutu = noktaListesiKutusu(taslak.noktalar);
    return kutu.w < ASGARI_CIZIM_PX || kutu.h < ASGARI_CIZIM_PX ? null : taslak;
  }
  // Kutu tabanlılar (dikdörtgen/elips): sağdan sola veya aşağıdan yukarı
  // çizilmiş olabilir, önce normalize edilir — negatif w/h ile kaydedilen bir
  // şekil sonradan vuruş/tutamaç hesaplarını bozar.
  const kutu = kutuNormalle(taslak.x, taslak.y, taslak.w, taslak.h);
  if (kutu.w < ASGARI_CIZIM_PX || kutu.h < ASGARI_CIZIM_PX) return null;
  return { ...taslak, ...kutu };
}

// ── Akış şeması kutusu ─────────────────────────────────────────────────────
//
// Kutunun çevresi TEK yerde üretiliyor. Sebebi ileriye dönük: bağlayıcılar
// kutuya tutunurken tutunma noktalarını bu çevreden alacak. Çizim ve tutunma
// ayrı ayrı hesaplansaydı ok, kutunun kenarından bir tık içeride/dışarıda
// biterdi — ve fark yalnız eğik kenarlı şekillerde (karar, veri) görünürdü.
//
// Dönen liste KAPALI bir çokgen: son nokta ilkine bağlanır.
export function akisKutusuKosaleri(sekil: {
  akisSekli: AkisSekli;
  x: number;
  y: number;
  w: number;
  h: number;
}): Nokta[] {
  const { x, y, w, h } = sekil;
  const sag = x + w;
  const alt = y + h;
  const ortaY = y + h / 2;
  const ortaX = x + w / 2;
  if (sekil.akisSekli === "karar") {
    return [
      { x: ortaX, y },
      { x: sag, y: ortaY },
      { x: ortaX, y: alt },
      { x, y: ortaY },
    ];
  }
  if (sekil.akisSekli === "veri") {
    const egim = Math.min(w * 0.18, h * 0.6);
    return [
      { x: x + egim, y },
      { x: sag, y },
      { x: sag - egim, y: alt },
      { x, y: alt },
    ];
  }
  if (sekil.akisSekli === "hazirlik") {
    const egim = Math.min(w * 0.15, h * 0.5);
    return [
      { x: x + egim, y },
      { x: sag - egim, y },
      { x: sag, y: ortaY },
      { x: sag - egim, y: alt },
      { x: x + egim, y: alt },
      { x, y: ortaY },
    ];
  }
  // baslangic (yuvarlatılmış) ve belge (dalgalı alt kenar) DİKDÖRTGEN kutuyla
  // temsil edilir: eğrileri köşe listesiyle anlatmak yanıltıcı olurdu, çizim
  // tarafı kendi yolunu kuruyor. Tutunma/vuruş için dikdörtgen yeterince doğru.
  return [
    { x, y },
    { x: sag, y },
    { x: sag, y: alt },
    { x, y: alt },
  ];
}

/** Nokta kapalı bir çokgenin İÇİNDE mi (ışın atma). Akış kutusunun dolu
 *  sayılması için gerekli: öğretmen kutunun ortasındaki yazıya tıklayınca
 *  kutu seçilmeli, kenar çizgisini yakalamak zorunda kalmamalı. */
export function noktaCokgenIcindeMi(p: Nokta, kose: Nokta[]): boolean {
  let icinde = false;
  for (let i = 0, j = kose.length - 1; i < kose.length; j = i++) {
    const kesisiyor =
      kose[i].y > p.y !== kose[j].y > p.y &&
      p.x <
        ((kose[j].x - kose[i].x) * (p.y - kose[i].y)) / (kose[j].y - kose[i].y) +
          kose[i].x;
    if (kesisiyor) icinde = !icinde;
  }
  return icinde;
}


// ── Kareli alan (vektör çizmek için ızgara) ────────────────────────────────

const IZGARA_VARSAYILAN = { satir: 3, sutun: 4 };
const izgaraSayi = (v: unknown, varsayilan: number) =>
  typeof v === "number" && Number.isFinite(v) ? Math.min(40, Math.max(1, Math.round(v))) : varsayilan;

export function izgaraBoyutu(sekil: Sekil): { satir: number; sutun: number } {
  if (sekil.tur !== "fizik") return IZGARA_VARSAYILAN;
  return { satir: izgaraSayi(sekil.satir, IZGARA_VARSAYILAN.satir), sutun: izgaraSayi(sekil.sutun, IZGARA_VARSAYILAN.sutun) };
}

/** (sütun c, satır r) köşesinin tuvaldeki yeri; döndürme/çevirme dikkate alınır. r yukarıdan aşağı sayılır. */
export function izgaraDugumu(sekil: Sekil, c: number, r: number): Nokta {
  if (sekil.tur !== "fizik") return { x: 0, y: 0 };
  const { satir, sutun } = izgaraBoyutu(sekil);
  const merkez = { x: sekil.x + sekil.w / 2, y: sekil.y + sekil.h / 2 };
  let x = sekil.x + (sekil.w * c) / sutun;
  const y = sekil.y + (sekil.h * r) / satir;
  if (sekil.ayna) x = 2 * merkez.x - x;
  return noktaDondur({ x, y }, merkez, sekil.donus ?? 0);
}

/** Şeklin YEREL (döndürülmemiş) koordinatındaki noktaya en yakın köşe. */
export function enYakinDugum(sekil: Sekil, yerel: Nokta): { c: number; r: number } {
  if (sekil.tur !== "fizik") return { c: 0, r: 0 };
  const { satir, sutun } = izgaraBoyutu(sekil);
  let x = yerel.x;
  if (sekil.ayna) x = 2 * (sekil.x + sekil.w / 2) - x;
  const c = Math.min(sutun, Math.max(0, Math.round(((x - sekil.x) / sekil.w) * sutun)));
  const r = Math.min(satir, Math.max(0, Math.round(((yerel.y - sekil.y) / sekil.h) * satir)));
  return { c, r };
}

// ── Bağlayıcı (akış şeması oku) ────────────────────────────────────────────

/** Bağlayıcı ucunun tutunduğu şekli bulur (serbest uçta null). */
export function baglayiciUcSekli(sekiller: Sekil[], uc: BaglayiciUcu): Sekil | null {
  if (!("sekilId" in uc)) return null;
  return sekiller.find((s) => s.id === uc.sekilId) ?? null;
}

/** Şeklin kaba kutusu — tutunma ve yön seçimi bunun üstünden yürür. */
function tutunmaKutusu(sekil: Sekil) {
  return sekilGeometriKutusu(sekil);
}

/**
 * Şeklin verilen yöndeki tutunma noktası.
 *
 * Akış kutusunda nokta ÇEVREDEN alınıyor (`akisKutusuKosaleri` ile aynı
 * kaynak): karar kutusunda üst tutunma noktası eşkenar dörtgenin TEPESİ olmalı,
 * kaba kutunun üst kenarının ortası değil — aradaki fark kutu yüksekliğinin
 * yarısı kadar ve ok havada başlıyormuş gibi görünüyordu.
 */
export function tutunmaNoktasi(sekil: Sekil, yon: "ust" | "sag" | "alt" | "sol"): Nokta {
  const yerel = tutunmaNoktasiYerel(sekil, yon);
  const derece = sekil.donus ?? 0;
  if (Math.abs(derece) < 0.01) return yerel;
  // Döndürülmüş şekilde tutunma noktası da şekille DÖNER: yoksa makara/direnç
  // 90° çevrilince ip havada kalıyordu.
  const k = tutunmaKutusu(sekil);
  return noktaDondur(yerel, { x: k.x + k.w / 2, y: k.y + k.h / 2 }, derece);
}

/** Yönü şeklin dönüşü kadar çevirir (en yakın 90°'ye yuvarlanır). */
export function yonDondur(yon: "ust" | "sag" | "alt" | "sol", derece: number): "ust" | "sag" | "alt" | "sol" {
  const sira = ["ust", "sag", "alt", "sol"] as const;
  const adim = Math.round(derece / 90);
  const i = sira.indexOf(yon);
  return sira[(((i + adim) % 4) + 4) % 4];
}

function tutunmaNoktasiYerel(sekil: Sekil, yon: "ust" | "sag" | "alt" | "sol"): Nokta {
  const k = tutunmaKutusu(sekil);
  const merkez = { x: k.x + k.w / 2, y: k.y + k.h / 2 };
  const kaba: Nokta =
    yon === "ust" ? { x: merkez.x, y: k.y }
    : yon === "alt" ? { x: merkez.x, y: k.y + k.h }
    : yon === "sol" ? { x: k.x, y: merkez.y }
    : { x: k.x + k.w, y: merkez.y };
  if (sekil.tur !== "akis") return kaba;
  // Merkezden kaba noktaya giden ışının çokgen kenarlarıyla kesişimi.
  const kose = akisKutusuKosaleri(sekil);
  let enIyi: Nokta | null = null;
  let enIyiT = Infinity;
  for (let i = 0; i < kose.length; i += 1) {
    const a = kose[i];
    const b = kose[(i + 1) % kose.length];
    const kesisim = isinSegmentKesisimi(merkez, kaba, a, b);
    if (kesisim && kesisim.t < enIyiT) {
      enIyiT = kesisim.t;
      enIyi = kesisim.nokta;
    }
  }
  return enIyi ?? kaba;
}

/** Merkezden `hedef`e giden ışının [a,b] segmentini kestiği nokta. */
function isinSegmentKesisimi(
  merkez: Nokta,
  hedef: Nokta,
  a: Nokta,
  b: Nokta,
): { nokta: Nokta; t: number } | null {
  const rx = hedef.x - merkez.x;
  const ry = hedef.y - merkez.y;
  const sx = b.x - a.x;
  const sy = b.y - a.y;
  const payda = rx * sy - ry * sx;
  if (Math.abs(payda) < 1e-9) return null;
  const t = ((a.x - merkez.x) * sy - (a.y - merkez.y) * sx) / payda;
  const u = ((a.x - merkez.x) * ry - (a.y - merkez.y) * rx) / payda;
  if (t < 0 || u < 0 || u > 1) return null;
  return { nokta: { x: merkez.x + rx * t, y: merkez.y + ry * t }, t };
}

/**
 * İki şekil için EN UYGUN kenar çiftini seçer ("oto" yönü).
 *
 * Kural basit ve öngörülebilir: merkezler arasındaki fark hangi eksende
 * büyükse o eksenin kenarları kullanılır. Akış şemaları yukarıdan aşağı
 * okunduğu için EŞİTLİKTE dikey tercih edilir.
 */
export function otoYonler(
  a: { x: number; y: number; w: number; h: number },
  b: { x: number; y: number; w: number; h: number },
): { kaynak: "ust" | "sag" | "alt" | "sol"; hedef: "ust" | "sag" | "alt" | "sol" } {
  const dx = b.x + b.w / 2 - (a.x + a.w / 2);
  const dy = b.y + b.h / 2 - (a.y + a.h / 2);
  if (Math.abs(dx) > Math.abs(dy)) {
    return dx >= 0 ? { kaynak: "sag", hedef: "sol" } : { kaynak: "sol", hedef: "sag" };
  }
  return dy >= 0 ? { kaynak: "alt", hedef: "ust" } : { kaynak: "ust", hedef: "alt" };
}

function yonVektoru(yon: "ust" | "sag" | "alt" | "sol"): Nokta {
  if (yon === "ust") return { x: 0, y: -1 };
  if (yon === "alt") return { x: 0, y: 1 };
  if (yon === "sol") return { x: -1, y: 0 };
  return { x: 1, y: 0 };
}

/**
 * Bağlayıcının DİK AÇILI yolu.
 *
 * Yol her çizimde yeniden hesaplanıyor (saklanmıyor) — kutu taşınınca ok da
 * gelsin diye. Yöntem: her uçtan kısa bir dik "çıkış" parçası atılır, sonra iki
 * çıkış ucu eksen eksen birleştirilir. Serbest uçta çıkış yönü, karşı uca göre
 * seçilir.
 */
export function baglayiciYolu(
  sekiller: Sekil[],
  baglayici: Extract<Sekil, { tur: "baglayici" }>,
): Nokta[] | null {
  const kaynakSekil = baglayiciUcSekli(sekiller, baglayici.kaynak);
  const hedefSekil = baglayiciUcSekli(sekiller, baglayici.hedef);
  // Tutunduğu şekil silinmişse çizme. Silme akışı yetim bağlayıcıyı zaten
  // temizliyor (`yetimBaglayicilariAt`); bu savunma katmanı, eski/bozuk bir
  // belgeden gelen kaydın çizim döngüsünü patlatmasını engelliyor.
  if ("sekilId" in baglayici.kaynak && !kaynakSekil) return null;
  if ("sekilId" in baglayici.hedef && !hedefSekil) return null;
  // Tutunduğu şekil silinmişse çizme. Sessiz çökme yerine sessiz yokluk:
  // çağıran taraf (silme akışı) yetim bağlayıcıyı zaten temizliyor, bu yalnız
  // savunma katmanı.


  const kaynakKutu = kaynakSekil
    ? tutunmaKutusu(kaynakSekil)
    : { x: (baglayici.kaynak as Nokta).x, y: (baglayici.kaynak as Nokta).y, w: 0, h: 0 };
  const hedefKutu = hedefSekil
    ? tutunmaKutusu(hedefSekil)
    : { x: (baglayici.hedef as Nokta).x, y: (baglayici.hedef as Nokta).y, w: 0, h: 0 };

  const oto = otoYonler(kaynakKutu, hedefKutu);
  const kYonSecim = "sekilId" in baglayici.kaynak ? baglayici.kaynak.yon ?? "oto" : "oto";
  const hYonSecim = "sekilId" in baglayici.hedef ? baglayici.hedef.yon ?? "oto" : "oto";
  // DÖNÜK ŞEKİL: seçilen yön EKRANDAKİ yöndür ("Sol" = gördüğün sol). Şeklin
  // hangi YEREL kenarına denk geldiği dönüşten geri hesaplanır ve tutunma noktası
  // o kenarın dönmüş hâlinden alınır — 90° çevrilmiş direncin ekranda solda
  // görünen ucu "Sol"dur. Dönüşsüz şekilde yerel = dünya, davranış eskisiyle aynı.
  const kd = kaynakSekil?.donus ?? 0;
  const hd = hedefSekil?.donus ?? 0;
  const kYon = kYonSecim === "oto" ? oto.kaynak : kYonSecim;
  const hYon = hYonSecim === "oto" ? oto.hedef : hYonSecim;
  const kYerel = yonDondur(kYon, -kd);
  const hYerel = yonDondur(hYon, -hd);

  let bas = kaynakSekil ? tutunmaNoktasi(kaynakSekil, kYerel) : (baglayici.kaynak as Nokta);
  let son = hedefSekil ? tutunmaNoktasi(hedefSekil, hYerel) : (baglayici.hedef as Nokta);

  // DÜZ biçimde (ip/yay/vektör) iki şekil karşılıklı duruyorsa çizgi EĞİK
  // olmasın: ortak kesişim aralığında (merkezlere en yakın) tek bir doğruda
  // buluşturulur. Yalnız dönüşsüz şekiller için (yön seçimi eksen olarak korunur); dönük
  // şekle dokunmaz.
  if ((baglayici.stil ?? "dik") !== "dik" && kaynakSekil && hedefSekil && kd === 0 && hd === 0 && !("dugum" in baglayici.kaynak && baglayici.kaynak.dugum) && !("dugum" in baglayici.hedef && baglayici.hedef.dugum) && !(kaynakSekil.tur === "fizik" && kaynakSekil.nesne === "makara") && !(hedefSekil.tur === "fizik" && hedefSekil.nesne === "makara")) {
    if (kYon === "sag" || kYon === "sol") {
      const alt = Math.max(kaynakKutu.y, hedefKutu.y);
      const ust = Math.min(kaynakKutu.y + kaynakKutu.h, hedefKutu.y + hedefKutu.h);
      if (ust > alt) {
        const ort = (kaynakKutu.y + kaynakKutu.h / 2 + hedefKutu.y + hedefKutu.h / 2) / 2;
        const y = Math.min(ust, Math.max(alt, ort));
        bas = { x: bas.x, y };
        son = { x: son.x, y };
      }
    } else if (kYon === "ust" || kYon === "alt") {
      const sol = Math.max(kaynakKutu.x, hedefKutu.x);
      const sag = Math.min(kaynakKutu.x + kaynakKutu.w, hedefKutu.x + hedefKutu.w);
      if (sag > sol) {
        const ort = (kaynakKutu.x + kaynakKutu.w / 2 + hedefKutu.x + hedefKutu.w / 2) / 2;
        const x = Math.min(sag, Math.max(sol, ort));
        bas = { x, y: bas.y };
        son = { x, y: son.y };
      }
    }
  }

  // MAKARA: ip çemberin TEĞETİNE oturur (kenar ortasına değil). Aksi halde
  // makaranın yanındaki kütleye giden ip, çemberin içinden geçiyormuş gibi görünür.
  if ((baglayici.stil ?? "dik") !== "dik") {
    const teget = (sekil: Sekil | null | undefined, diger: Nokta, mevcut: Nokta, secim: string): Nokta => {
      if (!sekil || sekil.tur !== "fizik" || sekil.nesne !== "makara" || (sekil.donus ?? 0) !== 0) return mevcut;
      const c = { x: sekil.x + sekil.w / 2, y: sekil.y + sekil.h / 2 };
      const r = Math.min(sekil.w, sekil.h) / 2;
      const d = Math.hypot(diger.x - c.x, diger.y - c.y);
      if (d <= r + 1) return mevcut;
      const taban = Math.atan2(diger.y - c.y, diger.x - c.x);
      const sapma = Math.acos(r / d);
      const aday = [taban + sapma, taban - sapma].map((a) => ({ x: c.x + r * Math.cos(a), y: c.y + r * Math.sin(a) }));
      // Elle yön seçildiyse teğet o tarafta olandır ("ust" = ekranda en üstteki).
      if (secim === "ust") return aday[0].y <= aday[1].y ? aday[0] : aday[1];
      if (secim === "alt") return aday[0].y >= aday[1].y ? aday[0] : aday[1];
      if (secim === "sol") return aday[0].x <= aday[1].x ? aday[0] : aday[1];
      if (secim === "sag") return aday[0].x >= aday[1].x ? aday[0] : aday[1];
      return Math.abs(aday[0].x - diger.x) <= Math.abs(aday[1].x - diger.x) ? aday[0] : aday[1];
    };
    const yeniBas = teget(kaynakSekil, son, bas, kYonSecim);
    const yeniSon = teget(hedefSekil, bas, son, hYonSecim);
    bas = yeniBas;
    son = yeniSon;
  }

  // KARELİ ALAN köşesi: uç, alanın (sütun, satır) köşesine oturur.
  const kd2 = "dugum" in baglayici.kaynak ? baglayici.kaynak.dugum : undefined;
  const hd2 = "dugum" in baglayici.hedef ? baglayici.hedef.dugum : undefined;
  if (kd2 && kaynakSekil && kaynakSekil.tur === "fizik") bas = izgaraDugumu(kaynakSekil, kd2.c, kd2.r);
  if (hd2 && hedefSekil && hedefSekil.tur === "fizik") son = izgaraDugumu(hedefSekil, hd2.c, hd2.r);

  // DÜZ biçimler (ip, yay, vektör): iki tutunma noktası arasında tek doğru.
  if ((baglayici.stil ?? "dik") !== "dik") {
    return Math.hypot(son.x - bas.x, son.y - bas.y) < 0.5 ? null : [bas, son];
  }

  const kv = yonVektoru(kYon);
  const hv = yonVektoru(hYon);
  const cikisBas = { x: bas.x + kv.x * BAGLAYICI_CIKIS, y: bas.y + kv.y * BAGLAYICI_CIKIS };
  const cikisSon = { x: son.x + hv.x * BAGLAYICI_CIKIS, y: son.y + hv.y * BAGLAYICI_CIKIS };

  const kDikey = kv.x === 0;
  const hDikey = hv.x === 0;
  const ara: Nokta[] = [];
  if (kDikey && hDikey) {
    const ortaY = (cikisBas.y + cikisSon.y) / 2;
    ara.push({ x: cikisBas.x, y: ortaY }, { x: cikisSon.x, y: ortaY });
  } else if (!kDikey && !hDikey) {
    // İki uç da yatay. Aynı yöne çıkıyorlarsa (sağ→sağ / sol→sol) bu bir
    // DOLAŞMA isteğidir: ok, iki kutunun arasında kalan her şeyin dışından
    // geçmeli. Orta nokta yeterli değil — akış şemasında geri dönen ok
    // (döngü) kaynak kutu solda kaldığında aradaki kutuların ÜSTÜNDEN
    // geçiyordu (ölçüldü: üç kutu). Engelleri temizleyen bir şerit seçiliyor.
    const ayniYon = kv.x === hv.x;
    let ortaX = (cikisBas.x + cikisSon.x) / 2;
    if (ayniYon) {
      const ustY = Math.min(bas.y, son.y);
      const altY = Math.max(bas.y, son.y);
      const engeller = sekiller.filter((s) => {
        if (s.tur === "baglayici") return false;
        if (kaynakSekil && s.id === kaynakSekil.id) return false;
        if (hedefSekil && s.id === hedefSekil.id) return false;
        const k = tutunmaKutusu(s);
        return k.y + k.h > ustY && k.y < altY;
      });
      const kenarlar = engeller.map((s) => {
        const k = tutunmaKutusu(s);
        return kv.x > 0 ? k.x + k.w : k.x;
      });
      ortaX = kv.x > 0
        ? Math.max(cikisBas.x, cikisSon.x, ...kenarlar.map((x) => x + BAGLAYICI_CIKIS))
        : Math.min(cikisBas.x, cikisSon.x, ...kenarlar.map((x) => x - BAGLAYICI_CIKIS));
      // HER DOLAŞAN OKA KENDİ ŞERİDİ. Aynı yönde dolaşan ve dikeyde ÇAKIŞAN
      // oklar aynı x'i seçince çizgileri de "Evet/Hayır" etiketleri de üst
      // üste biniyor — öğretmen bildirdi: "aynı çizgide iki tane hayır var".
      // Sıra listedeki konumdan geliyor: aynı belge her çizimde aynı şeridi
      // verir (kutu taşınsa bile), yoksa şerit sırası titrerdi.
      const benimIndex = sekiller.findIndex((s) => s.id === baglayici.id);
      let seritSirasi = 0;
      sekiller.forEach((s, index) => {
        if (s.tur !== "baglayici" || s.id === baglayici.id) return;
        if (benimIndex >= 0 && index > benimIndex) return;
        const sk = "sekilId" in s.kaynak ? s.kaynak.yon : undefined;
        const sh = "sekilId" in s.hedef ? s.hedef.yon : undefined;
        if (!sk || sk === "oto" || sk !== sh) return;
        const v = yonVektoru(sk);
        if (v.x !== kv.x) return;
        const a = baglayiciUcSekli(sekiller, s.kaynak);
        const b = baglayiciUcSekli(sekiller, s.hedef);
        if (!a || !b) return;
        const ak = tutunmaKutusu(a);
        const bk = tutunmaKutusu(b);
        const oUst = Math.min(ak.y + ak.h / 2, bk.y + bk.h / 2);
        const oAlt = Math.max(ak.y + ak.h / 2, bk.y + bk.h / 2);
        if (oAlt > ustY && oUst < altY) seritSirasi += 1;
      });
      ortaX += kv.x * seritSirasi * BAGLAYICI_CIKIS;
    }
    ara.push({ x: ortaX, y: cikisBas.y }, { x: ortaX, y: cikisSon.y });
  } else if (kDikey) {
    ara.push({ x: cikisBas.x, y: cikisSon.y });
  } else {
    ara.push({ x: cikisSon.x, y: cikisBas.y });
  }

  // Aynı noktaya düşen ardışık köşeler ayıklanıyor: sıfır uzunluklu parça hem
  // ok başının açısını bozuyor hem de etiket konumunu kaydırıyor.
  const ham = [bas, cikisBas, ...ara, cikisSon, son];
  const yol: Nokta[] = [];
  for (const n of ham) {
    const onceki = yol[yol.length - 1];
    if (!onceki || Math.abs(onceki.x - n.x) > 0.01 || Math.abs(onceki.y - n.y) > 0.01) yol.push(n);
  }
  return yol.length >= 2 ? yol : null;
}

/** Yolun ORTA noktası (etiket buraya konur) — parça uzunluklarına göre. */
export function yolOrtaNoktasi(yol: Nokta[]): Nokta {
  let toplam = 0;
  for (let i = 1; i < yol.length; i += 1) toplam += Math.hypot(yol[i].x - yol[i - 1].x, yol[i].y - yol[i - 1].y);
  let kalan = toplam / 2;
  for (let i = 1; i < yol.length; i += 1) {
    const uzunluk = Math.hypot(yol[i].x - yol[i - 1].x, yol[i].y - yol[i - 1].y);
    if (kalan <= uzunluk || i === yol.length - 1) {
      const oran = uzunluk === 0 ? 0 : kalan / uzunluk;
      return {
        x: yol[i - 1].x + (yol[i].x - yol[i - 1].x) * oran,
        y: yol[i - 1].y + (yol[i].y - yol[i - 1].y) * oran,
      };
    }
    kalan -= uzunluk;
  }
  return yol[0];
}
