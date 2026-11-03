// Akış şemasının YAZARAK tarif edilmesi: metin → düğüm/kenar grafı.
//
// Saf: DOM, canvas ve React bilmez. Yerleşim (`akisYerlesim.ts`) ayrı tutuldu
// ki 45 kutuluk bir şema testte dizdirilip ÖLÇÜLEBİLSİN — ekran görüntüsüne
// bakıp "iyi görünüyor" demek zorunda kalmayalım.
//
// Öğretmenin yazacağı biçim:
//   (Başla) -> /Sayıyı oku/ -> <Çift mi?> -evet-> [Çifttir yazdır] -> (Bitir)
//   <Çift mi?> -hayır-> [Tektir yazdır] -> (Bitir)
//
// DÜĞÜM KİMLİĞİ METİNDİR. Aynı metin ikinci kez geçtiğinde YENİ kutu açılmaz,
// var olana bağlanır — döngü (geri kenar) bu yüzden kendiliğinden çıkar:
//   [Harf iste] -> <Doğru mu?> -hayır-> [Can azalt] -> [Harf iste]
// son adım yukarıdaki "Harf iste" kutusuna döner.

import type { AkisSekli } from "./tipler";

export type AkisDugumu = { id: string; metin: string; sekil: AkisSekli };
export type AkisKenari = { kaynakId: string; hedefId: string; etiket?: string };

export type AkisTarifi = {
  dugumler: AkisDugumu[];
  kenarlar: AkisKenari[];
  /** Öğretmene gösterilecek uyarılar; ayrıştırma bunlara rağmen sürer. */
  uyarilar: string[];
};

/**
 * Şekil işaretleri. Süslü/köşeli/açılı parantez seçimi keyfi değil: akış
 * şeması geleneğinde karar eşkenar dörtgen (`<>`), girdi/çıktı paralelkenar
 * (`//`), başla/bitir yuvarlatılmış (`()`) — işaretler o şekillere benziyor.
 */
const ISARETLER: { ac: string; kapa: string; sekil: AkisSekli }[] = [
  { ac: "(", kapa: ")", sekil: "baslangic" },
  { ac: "<", kapa: ">", sekil: "karar" },
  { ac: "[", kapa: "]", sekil: "surec" },
  { ac: "/", kapa: "/", sekil: "veri" },
  { ac: "{", kapa: "}", sekil: "hazirlik" },
  { ac: "|", kapa: "|", sekil: "belge" },
];

/** İşaretsiz yazılan adım işlem kutusudur — en sık kullanılan şekil. */
const VARSAYILAN_SEKIL: AkisSekli = "surec";

/**
 * Düğüm eşleştirme anahtarı. Türkçe katlama ŞART: öğretmen aynı adımı bir
 * satırda "Harf iste", ötekinde "HARF İSTE" yazarsa aynı kutu olmalı. Büyük
 * "I" noktasız "ı"ya indiği için `toLowerCase()` yetmez (§15.6 ailesi).
 */
function anahtar(metin: string): string {
  return metin.trim().replace(/\s+/g, " ").toLocaleLowerCase("tr");
}

/**
 * `->` ve `-evet->` oklarını yakalar; yakalama grubu etikettir (yoksa boş).
 *
 * DİKKAT: ilk yazışta `-{1,2}(...)?-{1,2}>` yazmıştım ve DÜZ `->` hiç
 * eşleşmiyordu — iki tire istiyordu. Sonuç sessiz değildi ama tuhaftı: satırın
 * tamamı tek kutu olup yalnız `-evet->` bölüyordu. Etiketli/etiketsiz ayrımı
 * ORTADAKİ tirenin varlığıdır: `-` [etiket `-`] `>`.
 */
const OK_KALIBI = /-(?:([^->\n]*?)-)?>/;

function adimiCoz(ham: string): { metin: string; sekil: AkisSekli } | null {
  const parca = ham.trim();
  if (!parca) return null;
  for (const { ac, kapa, sekil } of ISARETLER) {
    if (parca.length >= 2 && parca.startsWith(ac) && parca.endsWith(kapa)) {
      const metin = parca.slice(1, -1).trim();
      return metin ? { metin, sekil } : null;
    }
  }
  return { metin: parca, sekil: VARSAYILAN_SEKIL };
}

/**
 * Bir satırı zincire böler: "A -> B -evet-> C" → adımlar + aradaki etiketler.
 * Ok kalıbı ETİKETİ de yuttuğu için bölme `split` ile değil, elle yürüyerek
 * yapılıyor; `split(/->/)` etiketi kaybederdi.
 */
function satiriBol(satir: string): { adimlar: string[]; etiketler: (string | undefined)[] } {
  const adimlar: string[] = [];
  const etiketler: (string | undefined)[] = [];
  let kalan = satir;
  for (;;) {
    const eslesme = OK_KALIBI.exec(kalan);
    if (!eslesme) {
      adimlar.push(kalan);
      break;
    }
    adimlar.push(kalan.slice(0, eslesme.index));
    const etiket = eslesme[1]?.trim();
    etiketler.push(etiket ? etiket : undefined);
    kalan = kalan.slice(eslesme.index + eslesme[0].length);
  }
  return { adimlar, etiketler };
}

export function akisMetniniCoz(metin: string): AkisTarifi {
  const dugumler: AkisDugumu[] = [];
  const kenarlar: AkisKenari[] = [];
  const uyarilar: string[] = [];
  const kimlikler = new Map<string, string>();
  let sira = 0;

  const dugumAl = (adim: { metin: string; sekil: AkisSekli }, satirNo: number): string => {
    const ah = anahtar(adim.metin);
    const varOlan = kimlikler.get(ah);
    if (varOlan) {
      // Aynı adım farklı şekille yazılmışsa İLK şekil kalır: sonradan
      // sessizce şekil değiştirmek, öğretmenin ilk yazdığını bozardı.
      const dugum = dugumler.find((d) => d.id === varOlan)!;
      if (dugum.sekil !== adim.sekil && adim.sekil !== VARSAYILAN_SEKIL) {
        uyarilar.push(
          `${satirNo}. satır: "${adim.metin}" daha önce farklı şekille yazılmış; ilk şekil korundu.`,
        );
      }
      return varOlan;
    }
    sira += 1;
    const id = `akis-${sira}`;
    kimlikler.set(ah, id);
    dugumler.push({ id, metin: adim.metin.trim().replace(/\s+/g, " "), sekil: adim.sekil });
    return id;
  };

  metin.split("\n").forEach((hamSatir, index) => {
    const satirNo = index + 1;
    const satir = hamSatir.split("#")[0].trim();
    if (!satir) return;

    const { adimlar, etiketler } = satiriBol(satir);
    const cozulmus = adimlar.map((a) => adimiCoz(a));

    if (cozulmus.length > 1 && cozulmus.some((a) => a === null)) {
      uyarilar.push(`${satirNo}. satır: oklardan birinin ucu boş, o bağlantı atlandı.`);
    }

    let oncekiId: string | null = null;
    cozulmus.forEach((adim, i) => {
      if (!adim) {
        oncekiId = null;
        return;
      }
      const id = dugumAl(adim, satirNo);
      if (oncekiId) {
        const etiket = etiketler[i - 1];
        const zatenVar = kenarlar.some(
          (k) => k.kaynakId === oncekiId && k.hedefId === id && k.etiket === etiket,
        );
        if (oncekiId === id) {
          uyarilar.push(`${satirNo}. satır: "${adim.metin}" kendine bağlanamaz, bu ok atlandı.`);
        } else if (!zatenVar) {
          kenarlar.push({ kaynakId: oncekiId, hedefId: id, ...(etiket ? { etiket } : {}) });
        }
      }
      oncekiId = id;
    });
  });

  return { dugumler, kenarlar, uyarilar };
}
