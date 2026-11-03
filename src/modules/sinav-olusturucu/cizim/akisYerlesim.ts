// Akış grafını tuvale dizen yerleşim. Saf: DOM/canvas/React bilmez, şekil
// listesi döner — 45 kutuluk örnek testte dizdirilip ölçülebilsin diye.
//
// Yöntem katmanlı yerleşim (Sugiyama'nın sadeleştirilmiş hâli):
//   1. GERİ KENARLARI ayır (döngüler). Katman hesabı yalnız ileri kenarlarla
//      yapılır, yoksa döngü sonsuza kadar katman iter.
//   2. En uzun yol ile katman ata.
//   3. KATMAN ATLAYAN kenarlara ara düğüm koy (bkz. `araDugumleriEkle`).
//   4. Katman içinde sırala (barycenter) — ok kesişmelerini azaltır.
//   5. Koordinat ver.
//   6. Bağlayıcıları kur; GERİ kenarların iki ucu da SAĞDAN çıkar, böylece ok
//      kutuların üstünden geçmek yerine sağdan dolaşır.

import type { AkisSekli, Sekil } from "./tipler";
import type { AkisKenari, AkisTarifi } from "./akisMetni";
import {
  AKIS_KARAR_H,
  BAGLAYICI_CIKIS,
  AKIS_KARAR_W,
  AKIS_VARSAYILAN_H,
  AKIS_VARSAYILAN_W,
} from "./sabitler";

/** Kutular arası boşluk. Dikey aralık, bağlayıcının çıkış parçasından
 *  (BAGLAYICI_CIKIS = 22) belirgin şekilde büyük olmalı ki ok görünsün. */
const YATAY_ARALIK = 60;
const DIKEY_ARALIK = 70;
/** Sol/üst kenar payı — şema tuvalin köşesine yapışmasın. */
const KENAR_PAYI = 40;
/** Geri okun kutuların sağından dolaşması için ayrılan şerit. */
const GERI_OK_SERIDI = 70;
/**
 * Ara düğümün katmanda kapladığı genişlik. Kutu değil, KORİDOR: atlayan okun
 * dolaşırken sıkışmaması için bu kadar yer ayrılıyor. Yüksekliği 0 — katman
 * yüksekliğini büyütmemeli, yoksa şema boyu ara düğüm sayısınca uzardı.
 */
const ARA_DUGUM_W = BAGLAYICI_CIKIS * 2;

/** Ara düğüm kimliği: gerçek düğümlerle çakışmasın diye ayrı önek. */
function araDugumId(kenarIndex: number, katman: number): string {
  return `akis-ara-${kenarIndex}-${katman}`;
}

function araDugumMu(id: string): boolean {
  return id.startsWith("akis-ara-");
}

function olcu(sekil: AkisSekli): { w: number; h: number } {
  return sekil === "karar"
    ? { w: AKIS_KARAR_W, h: AKIS_KARAR_H }
    : { w: AKIS_VARSAYILAN_W, h: AKIS_VARSAYILAN_H };
}

/**
 * Geri kenarları (döngü) bulur — DFS'te GRİ bir düğüme giden kenar.
 *
 * Neden ayrı: katman ataması döngüde ilerleyemez. Geri kenarlar katman
 * hesabından çıkarılır, ama ÇİZİLİR — yalnız yol farklı yönlendirilir.
 */
export function geriKenarlariBul(tarif: AkisTarifi): Set<number> {
  const komsular = new Map<string, { hedefId: string; index: number }[]>();
  tarif.kenarlar.forEach((k, index) => {
    const liste = komsular.get(k.kaynakId) ?? [];
    liste.push({ hedefId: k.hedefId, index });
    komsular.set(k.kaynakId, liste);
  });

  const renk = new Map<string, "beyaz" | "gri" | "siyah">();
  tarif.dugumler.forEach((d) => renk.set(d.id, "beyaz"));
  const geri = new Set<number>();

  // Yinelemesiz DFS: 45+ kutuluk şemada özyineleme yığını şişebilir ve asıl
  // sebep, hatanın yerleşimde mi grafta mı olduğunu gizler.
  for (const kok of tarif.dugumler) {
    if (renk.get(kok.id) !== "beyaz") continue;
    const yigin: { id: string; sira: number }[] = [{ id: kok.id, sira: 0 }];
    renk.set(kok.id, "gri");
    while (yigin.length) {
      const ust = yigin[yigin.length - 1];
      const liste = komsular.get(ust.id) ?? [];
      if (ust.sira >= liste.length) {
        renk.set(ust.id, "siyah");
        yigin.pop();
        continue;
      }
      const { hedefId, index } = liste[ust.sira];
      ust.sira += 1;
      const durum = renk.get(hedefId);
      if (durum === "gri") geri.add(index);
      else if (durum === "beyaz") {
        renk.set(hedefId, "gri");
        yigin.push({ id: hedefId, sira: 0 });
      }
    }
  }
  return geri;
}

/** En uzun yol ile katman ataması (yalnız ileri kenarlar). */
function katmanlariAta(tarif: AkisTarifi, ileri: AkisKenari[]): Map<string, number> {
  const gelenSayisi = new Map<string, number>();
  tarif.dugumler.forEach((d) => gelenSayisi.set(d.id, 0));
  ileri.forEach((k) => gelenSayisi.set(k.hedefId, (gelenSayisi.get(k.hedefId) ?? 0) + 1));

  const katman = new Map<string, number>();
  tarif.dugumler.forEach((d) => katman.set(d.id, 0));

  // Kahn sırası: ileri kenarlar döngüsüz olduğu için tamamlanır.
  const kuyruk = tarif.dugumler.filter((d) => (gelenSayisi.get(d.id) ?? 0) === 0).map((d) => d.id);
  const kalan = new Map(gelenSayisi);
  while (kuyruk.length) {
    const id = kuyruk.shift()!;
    for (const k of ileri) {
      if (k.kaynakId !== id) continue;
      katman.set(k.hedefId, Math.max(katman.get(k.hedefId) ?? 0, (katman.get(id) ?? 0) + 1));
      const yeni = (kalan.get(k.hedefId) ?? 0) - 1;
      kalan.set(k.hedefId, yeni);
      if (yeni === 0) kuyruk.push(k.hedefId);
    }
  }
  return katman;
}

/** Katman içi sıralama: barycenter (üstteki komşuların ortalaması). */
function katmanIciSirala(
  katmanlar: string[][],
  ileri: AkisKenari[],
): void {
  const sira = new Map<string, number>();
  katmanlar.forEach((k) => k.forEach((id, i) => sira.set(id, i)));

  // İki geçiş yeterli: daha fazlası bu ölçekte (≤ birkaç yüz kutu) görünür
  // fark üretmiyor, üstelik salınıma girebiliyor.
  for (let tur = 0; tur < 2; tur += 1) {
    for (let i = 1; i < katmanlar.length; i += 1) {
      const agirlik = new Map<string, number>();
      for (const id of katmanlar[i]) {
        const ustler = ileri.filter((k) => k.hedefId === id).map((k) => sira.get(k.kaynakId));
        const gecerli = ustler.filter((x): x is number => x !== undefined);
        agirlik.set(id, gecerli.length ? gecerli.reduce((a, b) => a + b, 0) / gecerli.length : sira.get(id) ?? 0);
      }
      katmanlar[i] = [...katmanlar[i]].sort((a, b) => (agirlik.get(a) ?? 0) - (agirlik.get(b) ?? 0));
      katmanlar[i].forEach((id, index) => sira.set(id, index));
    }
  }
}

/**
 * KATMAN ATLAYAN kenarlara ara düğüm koyar ve sıralama için kenar zincirini
 * döndürür (A→B üç katman atlıyorsa A→d1, d1→d2, d2→B).
 *
 * NEDEN: atlayan ok bugün katmanların YANINDAN dolaşıyor. Dolaşma doğru
 * çiziliyor (ölçüldü: kutu kesmiyor) ama iki bedeli var — ok şemanın bir
 * ucundan öbür ucuna uzuyor ve atladığı katmanlarda kendine yer AYRILMADIĞI
 * için şema yatayda hiç genişlemiyor, yalnız uzuyor. 35 kutuluk gerçek örnekte
 * ölçülen en/boy 1:3,8'di; A4'e sığdırılınca kutu yazısı ~2,8 puntoya iniyordu.
 *
 * Ara düğüm iki işi birden yapıyor: (1) sıralamaya girdiği için barycenter
 * zinciri düzleştiriyor, kesişme azalıyor; (2) katmanda ARA_DUGUM_W kadar yer
 * kapladığı için okun geçeceği koridor açık kalıyor.
 *
 * Ara düğümler ÇİZİLMEZ — yalnız yerleşimde vardır (`sekiller`e girmezler).
 */
function araDugumleriEkle(
  katmanlar: string[][],
  katman: Map<string, number>,
  ileri: AkisKenari[],
): AkisKenari[] {
  const siralamaKenarlari: AkisKenari[] = [];
  ileri.forEach((kenar, index) => {
    const bas = katman.get(kenar.kaynakId) ?? 0;
    const son = katman.get(kenar.hedefId) ?? 0;
    if (son - bas <= 1) {
      siralamaKenarlari.push(kenar);
      return;
    }
    let oncekiId = kenar.kaynakId;
    for (let k = bas + 1; k < son; k += 1) {
      const id = araDugumId(index, k);
      katmanlar[k].push(id);
      katman.set(id, k);
      siralamaKenarlari.push({ kaynakId: oncekiId, hedefId: id });
      oncekiId = id;
    }
    siralamaKenarlari.push({ kaynakId: oncekiId, hedefId: kenar.hedefId });
  });
  return siralamaKenarlari;
}

export type AkisYerlesimSonucu = {
  sekiller: Sekil[];
  /** Şemanın kapladığı alan — çağıran buna göre tuval ölçüsü seçer. */
  genislik: number;
  yukseklik: number;
};

export function akisiYerlestir(
  tarif: AkisTarifi,
  secenekler: { kalinlik?: number } = {},
): AkisYerlesimSonucu {
  const kalinlik = secenekler.kalinlik ?? 2;
  if (!tarif.dugumler.length) return { sekiller: [], genislik: 0, yukseklik: 0 };

  const geriIndeksler = geriKenarlariBul(tarif);
  const ileri = tarif.kenarlar.filter((_, i) => !geriIndeksler.has(i));

  const katman = katmanlariAta(tarif, ileri);
  const enBuyukKatman = Math.max(...tarif.dugumler.map((d) => katman.get(d.id) ?? 0));
  const katmanlar: string[][] = Array.from({ length: enBuyukKatman + 1 }, () => []);
  tarif.dugumler.forEach((d) => katmanlar[katman.get(d.id) ?? 0].push(d.id));
  // Sıralama ara düğümler EKLENDİKTEN sonra yapılıyor: zincir sıralamaya
  // girmezse ara düğüm rastgele bir sütuna düşer ve koridor işe yaramaz.
  const siralamaKenarlari = araDugumleriEkle(katmanlar, katman, ileri);
  katmanIciSirala(katmanlar, siralamaKenarlari);

  // GERİ OKUN UÇLARI KATMANIN EN SAĞINA. Geri ok sağdan çıkıp sağdan giriyor;
  // ucundaki kutunun sağında başka kutu kalırsa okun YATAY parçası onun
  // üstünden geçiyor (ölçüldü: yalnız dikey şeridi temizlemek yetmedi,
  // "Kazandın" kutusu kesiliyordu). Sıra korunarak sona alınıyor.
  const geriUclar = new Set<string>();
  tarif.kenarlar.forEach((k, i) => {
    if (!geriIndeksler.has(i)) return;
    geriUclar.add(k.kaynakId);
    geriUclar.add(k.hedefId);
  });
  if (geriUclar.size) {
    for (let i = 0; i < katmanlar.length; i += 1) {
      katmanlar[i] = [
        ...katmanlar[i].filter((id) => !geriUclar.has(id)),
        ...katmanlar[i].filter((id) => geriUclar.has(id)),
      ];
    }
  }

  const sekilBilgisi = new Map(tarif.dugumler.map((d) => [d.id, d]));
  const kutu = new Map<string, { x: number; y: number; w: number; h: number }>();
  /** Ara düğüm gerçek bir kutu değil: dar bir koridor ve yüksekliği YOK. */
  const olcuAl = (id: string) =>
    araDugumMu(id) ? { w: ARA_DUGUM_W, h: 0 } : olcu(sekilBilgisi.get(id)!.sekil);

  // Katman genişlikleri ve toplam genişlik — şema ORTALANIYOR, yoksa çok
  // dallanan bir katman şemayı sağa kaydırıp diğerlerini kenarda bırakıyor.
  const katmanGenislikleri = katmanlar.map((katmanIdler) =>
    katmanIdler.reduce((toplam, id, i) => toplam + olcuAl(id).w + (i > 0 ? YATAY_ARALIK : 0), 0),
  );
  const enGenis = Math.max(...katmanGenislikleri, 0);

  // ŞERİT PAYI. Dolaşan her okun kendi dikey şeridi var (bkz. baglayiciYolu);
  // ikinci şerit `BAGLAYICI_CIKIS` kadar daha dışarıda. Sol şeritler için yer
  // ayrılmazsa ok tuvalin dışına (negatif x) taşar ve dışa aktarımda kırpılır.
  const geriSayisi = tarif.kenarlar.filter((_, i) => geriIndeksler.has(i)).length;
  const atlayanSayisi = tarif.kenarlar.filter((k, i) =>
    !geriIndeksler.has(i) && Math.abs((katman.get(k.hedefId) ?? 0) - (katman.get(k.kaynakId) ?? 0)) > 1,
  ).length;
  const solPay = KENAR_PAYI + atlayanSayisi * BAGLAYICI_CIKIS;

  let y = KENAR_PAYI;
  katmanlar.forEach((katmanIdler, i) => {
    const katmanYuksekligi = Math.max(...katmanIdler.map((id) => olcuAl(id).h));
    let x = solPay + (enGenis - katmanGenislikleri[i]) / 2;
    for (const id of katmanIdler) {
      const { w, h } = olcuAl(id);
      // Katman içinde dikeyde ORTALA: karar kutusu (120) işlem kutusundan
      // (80) yüksek; hizalanmazsa aynı satırdaki oklar eğri görünür.
      kutu.set(id, { x, y: y + (katmanYuksekligi - h) / 2, w, h });
      x += w + YATAY_ARALIK;
    }
    y += katmanYuksekligi + DIKEY_ARALIK;
  });

  const sekiller: Sekil[] = tarif.dugumler.map((d) => {
    const k = kutu.get(d.id)!;
    return {
      id: d.id,
      tur: "akis",
      akisSekli: d.sekil,
      kalinlik,
      cizgiTipi: "duz",
      x: k.x,
      y: k.y,
      w: k.w,
      h: k.h,
      metin: d.metin,
    };
  });

  tarif.kenarlar.forEach((kenar, index) => {
    const geri = geriIndeksler.has(index);
    // KATMAN ATLAYAN ileri ok da dolaştırılmalı. Gerçek şemada çıktı: iki dal
    // farklı uzunlukta olunca kısa daldaki ok bir katmanı atlıyor ve arada
    // kalan kutunun ÜSTÜNDEN geçiyor. Geri oklar SAĞ, atlayanlar SOL şeridi
    // kullanıyor; ikisi aynı şeritte olsaydı üst üste binerlerdi.
    const atlayan = !geri && Math.abs((katman.get(kenar.hedefId) ?? 0) - (katman.get(kenar.kaynakId) ?? 0)) > 1;
    // KOMŞU KATMAN OKU ARTIK `oto` DEĞİL: alttan çıkıp üstten giriyor.
    //
    // `oto` en kısa kenarı seçiyor ve iki kutu yatayda uzaksa YAN kenarları
    // seçiyordu; ortaya çıkan yol "sağdan çık → yatay → dikey → yatay → sola
    // gir" oluyor ve hem yatay parçalar hem dikey parça KATMAN SATIRLARININ
    // İÇİNDEN geçiyordu. 35 kutuluk gerçek örnekte ölçülen dört kutu kesmesinin
    // DÖRDÜ de buradan geliyordu ("Lives > 0 mı?" → "Kullanıcıdan harf iste"
    // oku "Puanı hesapla" ve "Tebrikler yazdır"ın içinden geçiyordu).
    //
    // Alt→üst zorlanınca yatay parça katmanlar ARASINDAKİ boşluğa iniyor; orası
    // yerleşim gereği boş (DIKEY_ARALIK = 70, iki uçtaki çıkış payı 2×22 = 44).
    // Ölçüldü: aynı örnekte kesme 4 → 0.
    //
    // Geri ve atlayan oklar bunun DIŞINDA: onların yatay parçası zaten katman
    // satırlarını kesmek zorunda, o yüzden `baglayiciYolu`nun engel temizleyen
    // şeridini kullanıyorlar (geri = sağ, atlayan = sol; aynı şeritte olsalardı
    // üst üste binerlerdi).
    const uclar: { kaynak: "sag" | "sol" | "alt"; hedef: "sag" | "sol" | "ust" } = geri
      ? { kaynak: "sag", hedef: "sag" }
      : atlayan
        ? { kaynak: "sol", hedef: "sol" }
        : { kaynak: "alt", hedef: "ust" };
    sekiller.push({
      id: `akis-ok-${index + 1}`,
      tur: "baglayici",
      kalinlik,
      cizgiTipi: "duz",
      kaynak: { sekilId: kenar.kaynakId, yon: uclar.kaynak },
      hedef: { sekilId: kenar.hedefId, yon: uclar.hedef },
      okUcu: "son",
      ...(kenar.etiket ? { etiket: kenar.etiket } : {}),
    });
  });

  const saglar = [...kutu.values()].map((k) => k.x + k.w);
  const altlar = [...kutu.values()].map((k) => k.y + k.h);
  return {
    sekiller,
    // Sağdaki geri ok şeritleri de alana dâhil: hesaba katılmazsa tuval bir
    // küçük ölçüde seçilir ve en dıştaki ok kenara dayanır.
    genislik: Math.max(...saglar) + KENAR_PAYI + (geriSayisi ? GERI_OK_SERIDI + geriSayisi * BAGLAYICI_CIKIS : 0),
    yukseklik: Math.max(...altlar) + KENAR_PAYI,
  };
}
