// Sürükleme sırasında beliren hizalama kılavuzları ve kilitlenme.
//
// Kilitlenmenin iki eşiği var ve bu bilinçli: bir kenara YAKALANMAK için
// `HIZALAMA_ESIGI` yeterken, KOPMAK için `HIZALAMA_CIKIS_ORANI` katı gerekiyor.
// Tek eşikle kilit sınırında şekil titrer (yakalan-kop-yakalan); asimetrik
// eşik bu titremeyi keser. `susturulmusTemizle` da aynı amaca hizmet eder.

import type { HizalamaAday, KenarKilidi, Nokta, Sekil, TutamacId } from "./tipler";
import { HIZALAMA_CIKIS_ORANI, HIZALAMA_CIZGI_PAYI, HIZALAMA_ESIGI } from "./sabitler";
import { noktaDondur, sekilNoktalariniAl } from "./geometri";
import { sekilMerkezi, sekilTamKutusu } from "./sinirlar";

export function hizalamaEsigi(zoomYuzde: number) {
  return HIZALAMA_ESIGI * (100 / Math.max(zoomYuzde, 1));
}

// Kılavuz çizgisinin ne kadar uzunlukta çizileceğini belirler: sürüklenen
// öğenin (kutu ya da tek nokta) ve hizalanılan hedefin kapladığı aralığı
// birleştirip küçük bir pay ekler — tuvalin bir ucundan diğerine "sonsuz
// eksen" gibi uzayan çizgi yerine, sadece ilgili bölgede kısa bir işaret.
export function dikeyCizgiUret(x: number, hareketliY1: number, hareketliY2: number, hedefKutu: HizalamaAday["kutu"]): { x: number; y1: number; y2: number } {
  const y1 = Math.min(hareketliY1, hedefKutu.y) - HIZALAMA_CIZGI_PAYI;
  const y2 = Math.max(hareketliY2, hedefKutu.y + hedefKutu.h) + HIZALAMA_CIZGI_PAYI;
  return { x, y1, y2 };
}

export function yatayCizgiUret(y: number, hareketliX1: number, hareketliX2: number, hedefKutu: HizalamaAday["kutu"]): { y: number; x1: number; x2: number } {
  const x1 = Math.min(hareketliX1, hedefKutu.x) - HIZALAMA_CIZGI_PAYI;
  const x2 = Math.max(hareketliX2, hedefKutu.x + hedefKutu.w) + HIZALAMA_CIZGI_PAYI;
  return { y, x1, x2 };
}

// Aday değerler arasından hedefe en yakın olanı (eşik içindeyse) döndürür.
export function enYakinHizalamaAdayi(deger: number, adaylar: HizalamaAday[], esik: number): HizalamaAday | null {
  let enYakin: HizalamaAday | null = null;
  let enKucukFark = esik;
  for (const aday of adaylar) {
    const fark = Math.abs(deger - aday.deger);
    if (fark <= enKucukFark) {
      enKucukFark = fark;
      enYakin = aday;
    }
  }
  return enYakin;
}

// Hâlihazırda kilitli bir aday varsa (bir önceki karede yakalanmış), onu
// bozmak için daha geniş bir eşik (esikCik) uygulanır; yoksa dar eşikle
// (esikGir) sıfırdan aranır. Bu, sürüklerken kılavuzun titremeden sabit
// kalmasını sağlar — kral'ın "bir görünüp bir kayboluyor" tespitinin çözümü.
export function hizalamaKilitliEslestir(
  deger: number,
  adaylar: HizalamaAday[],
  kilitli: HizalamaAday | null,
  esikGir: number,
): HizalamaAday | null {
  if (kilitli && Math.abs(deger - kilitli.deger) <= esikGir * HIZALAMA_CIKIS_ORANI) return kilitli;
  return enYakinHizalamaAdayi(deger, adaylar, esikGir);
}

// Şekil taşınırken (tek nokta değil, sol/orta/sağ ya da üst/orta/alt üç kenar
// birden aday) aynı histerezisli mantık: önce kilitli hedefe hâlâ yakın bir
// kenar var mı diye bakılır (varsa o kenar üzerinden düzeltme hesaplanır),
// yoksa öncelik sırasıyla (kenarDegerleri dizisinin sırası) sıfırdan aranır.
export function hizalamaKilitliEslestirKenar(
  kenarDegerleri: number[],
  adaylar: HizalamaAday[],
  kilitli: KenarKilidi | null,
  esikGir: number,
): { hedef: HizalamaAday; kenarDegeri: number; kenarIndex: number } | null {
  if (kilitli) {
    const kd = kenarDegerleri[kilitli.kenarIndex];
    if (kd !== undefined && Math.abs(kd - kilitli.aday.deger) <= esikGir * HIZALAMA_CIKIS_ORANI) {
      return { hedef: kilitli.aday, kenarDegeri: kd, kenarIndex: kilitli.kenarIndex };
    }
  }
  for (let i = 0; i < kenarDegerleri.length; i += 1) {
    const eslesen = enYakinHizalamaAdayi(kenarDegerleri[i], adaylar, esikGir);
    if (eslesen) return { hedef: eslesen, kenarDegeri: kenarDegerleri[i], kenarIndex: i };
  }
  return null;
}

// Sürükleme/boyutlandırma BAŞLARKEN sürüklenen değer(ler) zaten bir adayın
// giriş eşiği içindeyse ilk harekette anında kilitleniyor, kilidi kırmak için
// geniş çıkış eşiği kadar çekmek gerekiyordu ("Köşeleri serbest bırak"ta her
// köşe komşularıyla aynı x/y'yi paylaştığından bu garanti oluyordu — köşe
// tutulur tutulmaz iki eksende kilitlenip ince ayar imkânsızlaşıyordu). Bu
// fonksiyon, bir eksendeki "susturulmuş" (başlangıçta eşikte olduğu için
// eşleştirmede atlanan) aday DEĞERLERİNİ günceller: ham (snap uygulanmamış)
// değer(ler) o değerden çıkış eşiğinden daha uzağa taşındıysa susturma kalkar.
export function susturulmusTemizle(kume: Set<number>, hamDegerler: number[], cikisEsigi: number) {
  for (const deger of kume) {
    if (hamDegerler.every((h) => Math.abs(h - deger) > cikisEsigi)) kume.delete(deger);
  }
}

// Hareket eden/sürüklenen şekil(ler) HARİÇ diğer tüm şekillerin kenar ve
// merkez konumlarını (kendi kutularıyla birlikte) toplar — hizalama
// kılavuzlarının "diğer şekle göre" kısmının temeli. Kutu bilgisi, kılavuz
// çizgisinin ne kadar uzunlukta çizileceğini belirlemek için saklanır.
export function digerSekillerKenarAdaylari(
  ctx: CanvasRenderingContext2D,
  sekiller: Sekil[],
  haric: Set<string>,
): { x: HizalamaAday[]; y: HizalamaAday[] } {
  const x: HizalamaAday[] = [];
  const y: HizalamaAday[] = [];
  for (const s of sekiller) {
    if (haric.has(s.id)) continue;
    const b = sekilTamKutusu(ctx, s);
    x.push({ deger: b.x, kutu: b }, { deger: b.x + b.w / 2, kutu: b }, { deger: b.x + b.w, kutu: b });
    y.push({ deger: b.y, kutu: b }, { deger: b.y + b.h / 2, kutu: b }, { deger: b.y + b.h, kutu: b });
  }
  return { x, y };
}

// Bir noktayı (tek bir köşeyi) sıfır boyutlu bir "kutu" olarak aday haline
// getirir — böylece şekil-kutusu adaylarıyla aynı kod yoluyla, aynı
// kılavuz-uzunluğu hesabıyla işlenebilir.
export function noktaAdayi(n: Nokta): HizalamaAday {
  return { deger: n.x, kutu: { x: n.x, y: n.y, w: 0, h: 0 } };
}

export function noktaAdayiY(n: Nokta): HizalamaAday {
  return { deger: n.y, kutu: { x: n.x, y: n.y, w: 0, h: 0 } };
}

// Boyutlandırma (döndürme tutamacı hariç) için hizalama adayları: diğer TÜM
// şekillerin kenar/merkezleri + (nokta tutamacıysa) aynı şeklin BAŞKA
// köşeleri. Hem sürükleme BAŞINDA "susturma" hesabında (isaretciAsagi) hem
// her karede eşleştirmede (isaretciHareket) aynı aday kümesi kullanılsın diye
// tek yerde toplanır.
export function boyutlandirmaAdaylari(
  ctx: CanvasRenderingContext2D,
  sekiller: Sekil[],
  orijinal: Sekil,
  handleId: TutamacId,
): { xAdaylar: HizalamaAday[]; yAdaylar: HizalamaAday[] } {
  const { x: xAdaylar, y: yAdaylar } = digerSekillerKenarAdaylari(ctx, sekiller, new Set([orijinal.id]));
  if (typeof handleId === "string" && handleId.startsWith("nokta-")) {
    const index = Number(handleId.slice("nokta-".length));
    const noktalar = sekilNoktalariniAl(orijinal);
    if (noktalar) {
      const merkez = sekilMerkezi(ctx, orijinal);
      const derece = orijinal.donus ?? 0;
      noktalar.forEach((n, i) => {
        if (i === index) return;
        const g = Math.abs(derece) < 0.01 ? n : noktaDondur(n, merkez, derece);
        xAdaylar.push(noktaAdayi(g));
        yAdaylar.push(noktaAdayiY(g));
      });
    }
  }
  return { xAdaylar, yAdaylar };
}

// Taşınan şekil grubunun (PAY'sız, döndürme dahil) birleşik kutusu — hem
// sürükleme BAŞINDA (isaretciAsagi, susturma hesabı için) hem her karede
// (isaretciHareket) aynı hesap kullanılsın diye tek yerde.
export function tasimaKenarDegerleri(ctx: CanvasRenderingContext2D, sekiller: Sekil[]) {
  const sinirlar = sekiller.map((s) => sekilTamKutusu(ctx, s));
  const sol = Math.min(...sinirlar.map((s) => s.x));
  const ust = Math.min(...sinirlar.map((s) => s.y));
  const sag = Math.max(...sinirlar.map((s) => s.x + s.w));
  const alt = Math.max(...sinirlar.map((s) => s.y + s.h));
  return { sol, ust, sag, alt };
}
