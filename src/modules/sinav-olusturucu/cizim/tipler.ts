// Çizim editörünün veri modeli.
//
// Bu dosya eskiden `components/CizimEditoruModal.tsx` içindeydi ve modülün
// `types.ts`'i tipleri BİR REACT BİLEŞENİNDEN import ediyordu — tersine bir
// bağımlılık. Tipler buraya alınınca o ok düzeldi: artık kimse çizim
// belgesini okumak için bileşeni yüklemek zorunda değil.

import type { DenklemBelgesi } from "../denklem/tipler";

export type Nokta = { x: number; y: number };

export type CizimAraci =
  | "sec"
  | "dogru"
  | "ok"
  | "dikdortgen"
  | "elips"
  | "ucgen"
  | "cokgen"
  | "dalga"
  | "serbest"
  | "silgi"
  | "metin"
  | "baglayici";

export type CizgiTipi = "duz" | "kesik";

/**
 * Akış şeması kutusunun biçimi. Adlar MEB müfredatındaki karşılıklarıyla:
 * baslangic = başla/bitir (yuvarlatılmış), surec = işlem (dikdörtgen),
 * karar = karar (eşkenar dörtgen), veri = girdi/çıktı (paralelkenar),
 * hazirlik = döngü hazırlığı (altıgen), belge = çıktı belgesi (alt kenarı
 * dalgalı dikdörtgen).
 */
export type AkisSekli =
  | "baslangic"
  | "surec"
  | "karar"
  | "veri"
  | "hazirlik"
  | "belge";

export type TaramaTipi = "yok" | "capraz" | "nokta";

/**
 * Fizik şekil kütüphanesi (bkz. `fizik.ts`). Adlar öğretmenin dilinde; her biri
 * tek bir kutuya (x, y, w, h) çizilir, bu yüzden taşıma/boyutlandırma/döndürme
 * mevcut kutu şekilleriyle aynı yoldan çalışır.
 */
export type FizikNesnesi =
  // Mekanik
  | "kutle" | "kure" | "egikDuzlem" | "makara" | "araba" | "nokta" | "yay" | "kap"
  | "duvar" | "zemin" | "tavan"
  // Elektrik
  | "direnc" | "pil" | "ampul" | "anahtarAcik" | "anahtarKapali" | "kondansator"
  | "bobin" | "ampermetre" | "voltmetre"
  // Optik
  | "mercekTumsek" | "mercekCukur" | "aynaCukur" | "aynaTumsek" | "aynaDuzlem" | "prizma"
  // Diğer
  | "miknatis" | "yukArti" | "yukEksi" | "koordinat"
  // Vektörler (tek tıkla eklenen oklar)
  | "vektorKuvvet" | "vektorHiz" | "vektorIvme" | "vektorBilesen"
  // Vektör çizmek için kareli alan (satır/sütun seçilebilir)
  | "kareliAlan"
  // Eksenli fizik grafiği (konum/hız/ivme–zaman, sinüs…). Bkz. `grafik.ts`.
  | "grafik"
  // İstatistik grafikleri (sütun, daire, histogram, kutu…). Bkz. `istatistik.ts`.
  | "istatistik"
  // Şemalar: Venn, olasılık ağacı, sayı doğrusu. Bkz. `sema.ts`.
  | "sema"
  // Kimya: laboratuvar malzemeleri + atom/molekül/periyodik tablo. Bkz. `kimya.ts`.
  | "beher" | "erlenmayer" | "balonJoje" | "mezur" | "denemeTupu" | "buret" | "ayirmaHunisi" | "bunsenBeki" | "huni" | "damitma"
  | "damlalik" | "gazKabi"
  | "kimya"
  // Geometri (bkz. `geometriSekilleri.ts`): köşe adlı üçgen, çember, benzer üçgenler, çokgen, açı yayı, dik açı, eş kenar işareti.
  | "ucgenABC" | "dikUcgen" | "benzerUcgen" | "cemberGeo" | "cokgenAd" | "aciYayi" | "dikAci" | "esIsaret"
  // v1.2 geometri (bkz. `geometriEk.ts`): doğruda açılar, özel dörtgenler, 3B katı cisimler, kağıt katlama.
  | "dogrudaAcilar" | "dortgenGeo" | "katiCisim" | "kagitKatlama"
  // Fizik ek şekilleri (bkz. `fizikEk.ts`): ışın ok, halka akım, solenoid, düz tel alanı, ⊗/⊙ alanı, girişim, enerji düzeyi, devre düğümü.
  | "isinOk" | "halkaAkim" | "solenoid" | "telAlan" | "alanNokta" | "dalgaGirisim" | "enerjiDuzeyi" | "dugum"
  // v1.2 hesaplı hazır sahneler (bkz. `fizikSahneler.ts`, `optik.ts`, `sivi.ts`): eğik düzlemde kuvvetler, asal eksenli optik düzenek, sıvı kapları.
  | "egikKuvvet" | "optikDuzenek" | "siviKabi";

/** Fizik ek şekillerinin (ışın ok, halka akım, ⊗ alanı…) küçük ayarları; anlamı şekle göre `fizikEk.ts`'te. */
export type FizikEk = { ters?: boolean; sayi?: number; sayi2?: number; metin?: string; metin2?: string };

/**
 * Eğik düzlemde kütle + kuvvet bileşenleri (bkz. `fizikSahneler.ts`). Oklar kuvvetin
 * BÜYÜKLÜĞÜYLE orantılı (g = 10 m/s², `olcek` px/N): kütle artınca mg, N, bileşenler uzar.
 */
export type EgikKuvvetVerisi = {
  /** Eğim açısı (derece, 5–70). */
  aci: number;
  /** Kütle (kg, 0,1–100). */
  kutle: number;
  /** Sürtünme katsayısı (0–1,5); 0 → sürtünmesiz. */
  mu: number;
  /** Ok ölçeği: piksel / newton (0,2–20). */
  olcek: number;
  goster: { mg: boolean; bilesen: boolean; normal: boolean; surtunme: boolean };
  /** Okların yanına sayısal değer (mg = 50 N). */
  degerler: boolean;
  /** Kütlenin eğik yüzeydeki yeri (0 = alt uç, 1 = üst uç). */
  konum: number;
  aciEtiketi: string;
  kutleEtiketi: string;
};

/** Asal eksenli optik düzenek (bkz. `optik.ts`). Uzunluklar birim (cm) cinsinden; 1/f = 1/do + 1/di. */
export type OptikVerisi = {
  tur: "cukurAyna" | "tumsekAyna" | "inceMercek" | "kalinMercek";
  /** Odak uzaklığının BÜYÜKLÜĞÜ (işaret türden gelir: tümsek ayna / kalın kenarlı mercekte f < 0). */
  f: number;
  /** Cisim uzaklığı do (> 0). */
  uzaklik: number;
  /** Cisim boyu. */
  boy: number;
  isinlar: { paralel: boolean; odak: boolean; merkez: boolean; egrilik?: boolean };
  goruntu: boolean;
  isaretler: boolean;
  /** di, büyütme ve görüntü niteliği yazısı. */
  bilgi: boolean;
};

/** Sıvı kapları (bkz. `sivi.ts`). */
export type SiviVerisi =
  | {
      tur: "bolmeli";
      satir: number;
      sutun: number;
      /** Dolu bölmeler (satır·sütun + sütun, üstten 0). */
      dolu: number[];
      /** Taralı engel bölmeleri. */
      engel: number[];
      musluk?: { taraf: "sol" | "sag" | "alt"; konum: number };
      /** Noktalar (K, L, M…) — bölme indeksi + ad. */
      noktalar?: { hucre: number; ad: string }[];
    }
  | {
      tur: "kaldirma";
      /** Sıvı seviyesi (0,3–0,95, kap yüksekliğine oran). */
      seviye: number;
      /** Yüzen X'in batan oranı = dX/dsıvı (0,1–0,9). */
      xBatma: number;
      /** dZ/dsıvı (> 1). */
      zOran: number;
      adlar: string[];
      kuvvet: boolean;
    }
  | {
      tur: "uBorusu";
      /** Sol kolda üstteki sıvının (ağır, alttaki sıvı) özkütlesi d1; sağ kola eklenen hafif sıvı d2. */
      d1: number;
      d2: number;
      h1: number;
      h2: number;
      /** Açıksa h2 = d1·h1/d2 (denge koşulu) otomatik. */
      otomatik: boolean;
    };

export type GeoAciIsareti = "yok" | "yay" | "dik";

/** Geometri şekillerinin verisi (bkz. `geometriSekilleri.ts`). Koordinatlar birim kutuda, y aşağı. */
export type GeometriVerisi =
  | {
      tur: "ucgen";
      /** serbest: köşe koordinatları · kenar: a, b, c uzunlukları · aci: b, c kenarları ve A açısı (derece). */
      mod: "serbest" | "kenar" | "aci";
      olcu: number[];
      kose: Nokta[];
      /** Köşe adları [A, B, C], kenar etiketleri [a, b, c] (a = BC karşısı A), açı etiketleri. */
      adlar: string[];
      kenarlar: string[];
      acilar: string[];
      aciIsareti: GeoAciIsareti[];
      /** Eş kenar işareti (tırtık) sayısı: [a, b, c] kenarı, 0–3. */
      esKenar: number[];
      /** Eş açı yayı sayısı: [A, B, C] köşesi, 0–3. */
      esAci: number[];
      yukseklik: "yok" | "A" | "B" | "C";
      yukseklikEtiket: string;
      ayakAdi: string;
      // ── v1.2 yardımcı elemanlar (hepsi isteğe bağlı; eski belgeler değişmeden açılır) ──
      /** Köşeden karşı kenara açıortay (ayak adı `aciortayAdi`, varsayılan "N") + iki eş açı yayı. */
      aciortay?: "yok" | "A" | "B" | "C";
      aciortayAdi?: string;
      /** Karşı kenarın orta noktasına kenarortay (ayak `kenarortayAdi`, varsayılan "V"); "hepsi": üçü + ağırlık merkezi. */
      kenarortay?: "yok" | "A" | "B" | "C" | "hepsi";
      kenarortayAdi?: string;
      /** Ağırlık merkezi adı (varsayılan "G"). */
      agirlikAdi?: string;
      /** Dış açılar: A'da CA uzantısı, B'de AB uzantısı, C'de BC uzantısı; etiketler [A, B, C]. */
      disAci?: ("A" | "B" | "C")[];
      disAciEtiket?: string[];
      /** İç teğet çember ve merkezi (`icMerkezAdi`, varsayılan "I"). */
      icTegetCember?: boolean;
      icMerkezAdi?: string;
      /** Çevrel çember ve merkezi (`cevrelMerkezAdi`, varsayılan "O"). */
      cevrelCember?: boolean;
      cevrelMerkezAdi?: string;
      /** serbest modda `kose` kutuya DOĞRUDAN eşlenir (sığdırma yok): köşe sürükleme fareyi izlesin. */
      sabitKutu?: boolean;
    }
  | {
      tur: "cember";
      /** Merkez, A, B (kiriş uçları), C (çevre açı köşesi), T (teğet noktası) adları. */
      adlar: string[];
      /** A, B, C, T noktalarının çember üstündeki konumu (derece, saat yönünün tersi). */
      konum: number[];
      merkez: boolean;
      yaricap: boolean;
      kiris: boolean;
      cap: boolean;
      merkezAci: boolean;
      cevreAci: boolean;
      teget: boolean;
      merkezAciEtiket: string;
      cevreAciEtiket: string;
      // ── v1.2 (isteğe bağlı). `konum[4]` = D (iç açı kirişi CD'nin ucu, adı `adlar[5]`). ──
      /** İki kiriş (AB, CD) çember içinde E'de kesişir; AEC iç açısı işaretlenir. */
      icAci?: boolean;
      icAciEtiket?: string;
      /** Çember dışındaki P'den iki kesen (PA, PB) ya da iki teğet. */
      disAci?: "yok" | "kesen" | "teget";
      disAciEtiket?: string;
      /** P'nin konumu: merkezden açı (derece) ve uzaklık (yarıçap katı, 1,25–3). */
      disNokta?: { aci: number; uzaklik: number };
      /** Dış açı adları: [P, 1. yakın/teğet noktası, 2. yakın/teğet noktası]. */
      disAdlar?: string[];
      /** T'deki teğet ile TA kirişi arasındaki teğet-kiriş açısı. */
      tegetKiris?: boolean;
      tegetKirisEtiket?: string;
      /** AOB merkez açısının daire dilimini tarar. */
      dilimTarama?: boolean;
    }
  | {
      tur: "dogruAci";
      /** kesen: d₁ ∥ d₂ + kesen (8 açı) · z: iç ters · u: karşı durumlu · m: M (zikzak, tek kırık) · kalemUcu · zikzak (iki kırık). */
      duzen: "kesen" | "z" | "u" | "m" | "kalemUcu" | "zikzak";
      /** kesende kesenin eğimi; diğerlerinde A'daki açı (derece). */
      aci: number;
      /** B'deki açı (m, kalemUcu, zikzak). */
      aci2: number;
      /** Açı bölgesi etiketleri (kesende 8 bölge: üst kesişim sağ-üst, sol-üst, sol-alt, sağ-alt, alt kesişim aynı sıra). */
      etiketler: string[];
      /** Nokta adları [A, B, C, D] ve doğru adları [d₁, d₂]. */
      adlar: string[];
      dogruAdlari: string[];
      paralelOk: boolean;
      /** Etiketi boş açılara ölçülen dereceyi yaz. */
      olcuYaz: boolean;
    }
  | {
      tur: "dortgen";
      tip: "paralelkenar" | "eskenar" | "yamuk" | "ikizkenarYamuk" | "dikYamuk" | "deltoid" | "dikdortgen" | "kare" | "serbest";
      /** Türe göre ölçüler (bkz. `dortgenKoseleri`). */
      olcu: number[];
      /** Yalnız `serbest`: birim kutuda köşeler (y aşağı). */
      kose?: Nokta[];
      adlar: string[];
      /** [AB, BC, CD, DA] kenar etiketleri; açı etiketleri [A, B, C, D]. */
      kenarlar: string[];
      acilar: string[];
      aciIsareti: GeoAciIsareti[];
      esKenar: number[];
      esAci: number[];
      kosegen: boolean;
      kesisimAdi: string;
      /** Köşegenler dikse kesişimde ∟ işareti. */
      dikIsaret: boolean;
      yukseklik: boolean;
      yukseklikAdi: string;
      yukseklikEtiket: string;
    }
  | {
      tur: "kati";
      cisim: "kup" | "prizma" | "ucgenPrizma" | "silindir" | "koni" | "piramit" | "kure";
      /** kup [a] · prizma [a, b, c] · ucgenPrizma [a, h] · silindir/koni [r, h] · piramit [a, h] · kure [r]. */
      olcu: number[];
      /** Ölçü etiketleri (olcu ile aynı sıra; koni/piramitte 3. = ana doğru / yan ayrıt). */
      etiketler: string[];
      adlar: string[];
      koseAdlari: boolean;
      /** Arka (görünmeyen) ayrıtlar kesikli [5,4]; kapalıysa hiç çizilmez. */
      gizliKesik: boolean;
      kosegen: "yok" | "cisim" | "yuzey";
    }
  | {
      tur: "katlama";
      kagit: KatlamaKagidi;
      /** En çok iki katlama. */
      katlar: KatlamaAdimi[];
      /** Şekil I (katlamadan önce) yanında gösterilsin. */
      sekil1: boolean;
      ok: boolean;
      olcu: boolean;
      eski: boolean;
      baslik: boolean;
      dolgu: "mavi" | "gri" | "tarali";
    }
  | {
      tur: "benzer";
      /** ic: BC'ye paralel DE doğrusu (Thales) · yan: yan yana iki benzer üçgen. */
      duzen: "ic" | "yan";
      oran: number;
      adlar: string[];
      /** Serbest kenar etiketleri (sırayla). */
      etiketler: string[];
      esAci: boolean;
    }
  | { tur: "cokgen"; n: number; adlar: string[]; merkez: boolean; kosegen: boolean; esKenar: boolean };

/** Kağıt katlama: kağıt (dikdörtgen w×h, kare a, B'de dik üçgen |BC| = p, |AB| = q). Koordinat y yukarı. */
export type KatlamaKagidi = { tur: "dikdortgen" | "kare" | "dikucgen"; w: number; h: number; a: number; p: number; q: number };
/**
 * Bir katlama. iki: k1–k2 köşelerinden geçen çizgi · nokta: `kose` köşesi ile `kenar` kenarında, kenarın
 * ilk köşesinden `uz` birim uzaktaki nokta · getir: `hareketli` köşe `hedef`e (köşe ya da "O" merkez) gelir.
 */
export type KatlamaAdimi = { mod: "iki" | "nokta" | "getir"; k1: string; k2: string; hareketli: string; kose: string; kenar: string; uz: number; hedef: string };

export type IstatistikTuru ="sutun" | "cubuk" | "daire" | "cizgi" | "histogram" | "kutu" | "govde";

/**
 * İstatistik grafiği verisi: bir TABLO. Satır = kategori (ya da kutu/gövde grafiğinde
 * bir grup), sütun = seri. `kutu` ve `govde` türlerinde `satirlar[i].v` ham veri listesidir.
 */
export type IstatistikVerisi = {
  tur: IstatistikTuru;
  baslik?: string;
  seriler: string[];
  satirlar: { ad: string; v: number[] }[];
  xEtiket?: string;
  yEtiket?: string;
  /** Değer yazısı: yok / değer / yüzde (daire) / ad+yüzde. */
  yazi?: "yok" | "deger" | "yuzde";
  renkli?: boolean;
  izgara?: boolean;
  /** Histogram: sıklık çokgenini üste çizer. */
  cokgen?: boolean;
  yMax?: number;
  yAdim?: number;
  /** Gövde-yaprak: yaprak birimi (1, 0.1, 10). Boşsa otomatik. */
  birim?: number;
  sade?: boolean;
};

/**
 * Grafik eğrisinin üç kaynağı (hepsi `grafik.ts`'te noktalara çevrilir):
 *  - noktalar : elle yazılan köşe noktaları (0,0; 2,10; 6,10).
 *  - hareket  : evrelerden (süre + ivme) hesaplanan konum / hız / ivme grafiği.
 *               Üç grafik AYNI evrelerden çıktığı için birbiriyle tutarlıdır.
 *  - sinus    : A·sin(2πt/T + faz) + ofset (ya da cos).
 */
export type GrafikBuyuklugu = "konum" | "hiz" | "ivme";

/**
 * Eğrinin çizgi deseni (siyah-beyaz baskıda renk yerine desenle ayırt edilir):
 * düz · kesikli · noktalı · çizgi-nokta · asimptot (ince, sık kesikli).
 * Verilmezse `kesik` bayrağına bakılır (eski belgeler değişmeden açılır).
 */
export type GrafikCizgiDeseni = "duz" | "kesik" | "nokta" | "cizgiNokta" | "asimptot";

export type GrafikEgriOrtak = {
  renk?: string;
  kesik?: boolean;
  cizgi?: GrafikCizgiDeseni;
  /** Eğrinin altında kalan alanı (yer değiştirme / yol) açık renkle boyar. */
  alan?: boolean;
  /** Köşe noktalarına nokta koyar ve eksenlere kesikli kılavuz çizer. */
  kilavuz?: boolean;
  /** Eğrinin ucuna yazılan ad (x_1, I, II…). */
  etiket?: string;
  /** Noktalara küçük daire koyar (serpme diyagramı, köşe noktaları). */
  nokta?: boolean;
  /** Noktaları çizgiyle BİRLEŞTİRME (serpme diyagramı). */
  cizgisiz?: boolean;
};

/** Parçalı fonksiyonda tanım aralığının ucu: boş daire (dahil değil) / dolu daire (dahil) / işaretsiz. */
export type GrafikUcu = "yok" | "dolu" | "bos";

export type GrafikEgrisi = GrafikEgriOrtak &
  (
    | { tur: "noktalar"; noktalar: Nokta[] }
    | { tur: "hareket"; buyukluk: GrafikBuyuklugu; x0: number; v0: number; evreler: { sure: number; ivme: number }[] }
    /** y = f(x) yazımı ("x^2-4", "2x+1", "sin(x)/x") ya da dikey doğru ("x=3"). Bkz. `ifade.ts`. */
    | { tur: "fonksiyon"; ifade: string; baslangic?: number; bitis?: number; ucBas?: GrafikUcu; ucSon?: GrafikUcu }
    /** Eşitsizlik bölgesi ("y>2x+1", "x+y<=4"): bölge boyanır, sınır çizilir (kesikli = < >). */
    | { tur: "bolge"; ifade: string }
    /** Kapalı denklem ("x^2+y^2=25", "x^2/9+y^2/4=1"): çember, elips, hiperbol… sol−sağ=0 eğrisi çizilir. */
    | { tur: "denklem"; ifade: string }
    /** İki eğri arasındaki alan: ifade (üst) ile ifade2 (alt; boşsa x ekseni) arası, [baslangic, bitis] aralığında boyanır. */
    | { tur: "arasi"; ifade: string; ifade2: string; baslangic?: number; bitis?: number }
    /** x0 noktasında y=f(x) eğrisinin teğeti (sayısal türev). */
    | { tur: "teget"; ifade: string; x0: number }
    /** Adlı noktalar: A(2,3) gibi; ad noktanın yanına yazılır. */
    | { tur: "isaret"; noktalar: { x: number; y: number; ad?: string }[] }
    | {
        tur: "sinus";
        fonksiyon: "sin" | "cos";
        genlik: number;
        periyot: number;
        /** Derece. */
        faz: number;
        ofset: number;
        baslangic: number;
        bitis: number;
      }
  );

export type GrafikVerisi = {
  egriler: GrafikEgrisi[];
  xEtiket: string;
  yEtiket: string;
  /** Verilmezse eğrilerden otomatik. */
  xMin?: number;
  xMax?: number;
  yMin?: number;
  yMax?: number;
  /** Eksen sayı aralığı; verilmezse otomatik. */
  xAdim?: number;
  yAdim?: number;
  izgara?: boolean;
  /** Eğrilerin kesişim noktalarını ve eksen kesişim köklerini (x; y) etiketiyle işaretle. */
  kesisim?: boolean;
  /** y=f(x) eğrilerinin yerel uç noktalarını (tepe: en küçük/en büyük) (x; y) etiketiyle otomatik işaretle. */
  tepe?: boolean;
  /** oto: düzgün aralıklı sayılar · kilavuz: yalnız köşe değerleri · yok */
  sayilar?: "oto" | "kilavuz" | "yok";
  /** Yatay eksen radyan: sayılar π katı olarak yazılır (π/2, π, 3π/2…). */
  piEksen?: boolean;
  /** Önizleme/simge: yazısız, sade çizim. */
  sade?: boolean;
};

export type FizikEtiketYeri = "ic" | "ust" | "alt" | "sag" | "sol";

/**
 * Bağlayıcının çizim biçimi.
 *  - dik     : dik açılı yol (akış şeması oku, devre teli). Varsayılan.
 *  - duz     : iki şeklin arasında DÜZ çizgi (ip, çubuk, ışın).
 *  - yay     : düz çizgi üstünde zikzaklı yay.
 *  - vektor  : düz, kalın, dolu uçlu ok (kuvvet / hız vektörü).
 */
export type BaglayiciStili = "dik" | "duz" | "yay" | "vektor";

/** Temel şekillerin isteğe bağlı çizgi rengi (#rrggbb). Yoksa siyah mürekkep —
 *  eski kayıtlı çizimler bu alan olmadan AYNI görünür. */
export type TemelRenk = { renk?: string };
/** Kapalı temel şekillerin isteğe bağlı iç dolgusu (#rrggbb). Yoksa dolgusuz. */
export type TemelDolgu = { dolgu?: string };

export type CizimSekliGovdesi =
  | ({ id: string; tur: "dogru"; kalinlik: number; cizgiTipi?: CizgiTipi; okUcu?: "yok" | "son" | "cift"; x1: number; y1: number; x2: number; y2: number } & TemelRenk)
  | ({ id: string; tur: "dikdortgen"; kalinlik: number; cizgiTipi?: CizgiTipi; x: number; y: number; w: number; h: number; serbestKoseler?: Nokta[] } & TemelRenk & TemelDolgu)
  | ({ id: string; tur: "elips"; kalinlik: number; cizgiTipi?: CizgiTipi; x: number; y: number; w: number; h: number } & TemelRenk & TemelDolgu)
  | ({
      id: string;
      tur: "ucgen";
      kalinlik: number;
      cizgiTipi?: CizgiTipi;
      x1: number;
      y1: number;
      x2: number;
      y2: number;
      x3: number;
      y3: number;
    } & TemelRenk & TemelDolgu)
  | ({ id: string; tur: "cokgen"; kalinlik: number; cizgiTipi?: CizgiTipi; noktalar: Nokta[] } & TemelRenk & TemelDolgu)
  | ({ id: string; tur: "dalga"; kalinlik: number; cizgiTipi?: CizgiTipi; noktalar: Nokta[] } & TemelRenk)
  | ({ id: string; tur: "serbest"; kalinlik: number; cizgiTipi?: CizgiTipi; noktalar: Nokta[] } & TemelRenk)
  | ({ id: string; tur: "metin"; metin: string; punto?: number; satirAraligi?: number; x: number; y: number } & TemelRenk)
  /**
   * Fizik nesnesi (kütle, makara, direnç, mercek…). Etiket `fizik.ts`'in küçük
   * yazım diliyle yazılır: `m_1`, `v^2`, `\theta`. Bağlayıcılar buna da
   * tutunur — kütleyi taşıyınca ip/yay/vektör birlikte gelir.
   */
  | {
      id: string;
      tur: "fizik";
      nesne: FizikNesnesi;
      kalinlik: number;
      cizgiTipi?: CizgiTipi;
      x: number;
      y: number;
      w: number;
      h: number;
      etiket?: string;
      etiketYeri?: FizikEtiketYeri;
      /** Yatay çevirme (eğik düzlem yönü, pil kutbu, duvarın yüzü…). */
      ayna?: boolean;
      dolgu?: string;
      /** Yalnız `kareliAlan`: bölme sayıları (varsayılan 3 satır × 4 sütun). */
      satir?: number;
      sutun?: number;
      /** Yalnız `kareliAlan`: çizgi rengi, kalınlığı ve dış çerçeve (varsayılan açık gri, ince, çerçeveli). */
      renk?: string;
      izgaraKalinlik?: number;
      cerceve?: boolean;
      /** Yalnız `grafik`: eksenler ve eğriler. */
      grafik?: GrafikVerisi;
      /** Yalnız `istatistik`. */
      istatistik?: IstatistikVerisi;
      /** Yalnız `sema`. */
      sema?: SemaVerisi;
      /** Yalnız `kimya`: atom, molekül ya da periyodik tablo. */
      kimya?: KimyaVerisi;
      /** Yalnız geometri şekilleri (`ucgenABC`, `cemberGeo`…). */
      geo?: GeometriVerisi;
      /** Yalnız fizik ek şekilleri (`halkaAkim`, `enerjiDuzeyi`…) ve açı yayı / dik açı / eş kenar işareti. */
      ek?: FizikEk;
      /** Laboratuvar kaplarında sıvı seviyesi (0–1); sıvı `dolgu` rengiyle çizilir. */
      seviye?: number;
      /** Yalnız `egikKuvvet`. */
      kuvvet?: EgikKuvvetVerisi;
      /** Yalnız `optikDuzenek`. */
      optik?: OptikVerisi;
      /** Yalnız `siviKabi`. */
      sivi?: SiviVerisi;
    }
  /**
   * Akış şeması kutusu. Metin KUTUNUN İÇİNDE: ayrı bir "metin" şekli olsaydı
   * kutuyla birlikte taşınmaz, ortalanmaz ve kutu yeniden boyutlanınca yerinde
   * kalırdı — akış şemasını kullanılabilir kılan şey bu bağ.
   */
  | {
      id: string;
      tur: "akis";
      akisSekli: AkisSekli;
      kalinlik: number;
      cizgiTipi?: CizgiTipi;
      x: number;
      y: number;
      w: number;
      h: number;
      metin: string;
      punto?: number;
      /** Dolgu rengi (#rrggbb) ya da yoksa saydam. Modülün geri kalanı tek
       *  mürekkepli; dolgu YALNIZ akış kutusunda var. */
      dolgu?: string;
      /**
       * Kutunun içeriği METİN YERİNE bir denklem.
       *
       * Kutu ya metin ya denklem gösterir, ikisini birden değil: akış şeması
       * kutuları tek ifade taşır ("x ← a/b", "Δ > 0?") ve kutu içini ikiye
       * bölmek hem sığdırmayı hem düzenlemeyi karmaşıklaştırırdı.
       *
       * `metin` SİLİNMİYOR: denklem kaldırılınca öğretmenin yazdığı metin
       * geri gelsin diye veride duruyor.
       */
      denklem?: DenklemBelgesi;
    }
  /**
   * İki kutuyu birleştiren dik açılı ok.
   *
   * Yol SAKLANMIYOR, her çizimde uçlardan HESAPLANIYOR. Saklansaydı kutu
   * taşınınca ok yerinde kalırdı — akış şemasını kullanılabilir kılan şey tam
   * olarak bu bağ (mevcut "ok" aracı sabit iki uçlu, o yüzden yetmiyor).
   */
  | {
      id: string;
      tur: "baglayici";
      kalinlik: number;
      cizgiTipi?: CizgiTipi;
      kaynak: BaglayiciUcu;
      hedef: BaglayiciUcu;
      /** Karar kutusundan çıkan dalların "Evet"/"Hayır" etiketi. */
      etiket?: string;
      okUcu?: "yok" | "son" | "cift";
      /** Çizim biçimi; yoksa "dik" (eski belgeler değişmeden açılır). */
      stil?: BaglayiciStili;
      /** Çizgi/ok/etiket rengi (#rrggbb); yoksa siyah. */
      renk?: string;
    };

/**
 * Bağlayıcının bir ucu. Şekle TUTUNUR (`sekilId`) ya da serbest bir noktadır.
 *
 * `yon: "oto"` varsayılan ve önemli: öğretmenin kutunun hangi kenarından
 * çıkacağını seçmesi gerekmesin — iki kutunun konumuna bakıp en kısa/temiz
 * kenar seçiliyor ve kutu taşınınca kendiliğinden güncelleniyor. Elle bir yön
 * seçildiyse ona saygı duyulur (karar kutusunda "evet sağdan, hayır aşağıdan"
 * gibi bilinçli düzenler için).
 */
export type BaglayiciYonu = "oto" | "ust" | "sag" | "alt" | "sol";

export type BaglayiciUcu =
  /** `dugum`: kareli alanın (sütun, satır) köşesine tutunur; alan taşınınca/boyutlanınca birlikte gelir. */
  | { sekilId: string; yon?: BaglayiciYonu; dugum?: { c: number; r: number } }
  | { x: number; y: number };

export type CizimSekli = CizimSekliGovdesi & {
  donus?: number;
  grupId?: string;
  tarama?: TaramaTipi;
};

export type Sekil = CizimSekli;

export type CizimBelgesi = {
  surum: 1;
  genislik: number;
  yukseklik: number;
  sekiller: CizimSekli[];
};

export type CizimCikti = {
  dataUrl: string;
  oran: number;
  cizimVerisi: CizimBelgesi;
};

// Metin şekli çizilerek değil, tıklayıp yazılarak eklenir — sürüklenerek çizilen
// önizleme (taslak) hiçbir zaman "metin" olamaz, bu yüzden ayrı bir tip.
// Akış kutusu ve bağlayıcı da SÜRÜKLENEREK çizilmiyor: kutu tek tıkla
// ekleniyor (asıl içeriği metni), bağlayıcı iki şekle tıklanarak kuruluyor.
// Tipten dışlanmaları yalnız temizlik değil — `taslagiKesinlestir` kutu
// tabanlı normalleştirmeye düşüyor ve bu ikisinde o alanlar yok.
export type CizilenTaslak = Exclude<Sekil, { tur: "metin" } | { tur: "akis" } | { tur: "fizik" } | { tur: "baglayici" }>;

export type KullaniciSablonu = { id: string; ad: string; sekiller: CizimSekli[] };

export type HizalamaAday = { deger: number; kutu: { x: number; y: number; w: number; h: number } };

export type HizalamaCizgileri = {
  dikey: { x: number; y1: number; y2: number }[];
  yatay: { y: number; x1: number; x2: number }[];
};

// Kilit artık HANGİ kenarla (sol/orta/sağ → kenarIndex 0/1/2) kilitlendiğini de
// taşır. Önceden kilitli hedefe yeniden eşleşirken kenarlar hep [sol, orta,
// sağ] sırasıyla taranıp geniş çıkış eşiğine giren İLK kenar alınıyordu —
// dar bir şekilde sağ kenarla kilitliyken sol kenar da eşiğe girince düzeltme
// yanlış kenardan hesaplanıp şekil bir karede kendi genişliği kadar
// zıplıyordu. Artık YALNIZCA kilitlenen indeksteki kenar denenir; tutmazsa
// sıfırdan (öncelik sıralı) aranır ve yeni kilitte yeni indeks saklanır.
export type KenarKilidi = { aday: HizalamaAday; kenarIndex: number };

export type TutamacId = "sol-ust" | "sag-ust" | "sol-alt" | "sag-alt" | `nokta-${number}` | "dondur";

/** Kimya şekli verisi (bkz. `kimya.ts`). */
export type KimyaVerisi =
  | {
      tur: "atom";
      /** Atom numarası; kabuklar (K, L, M…) otomatik dolar. */
      z: number;
      /** İyon yükü: +1 (Na⁺), −1 (Cl⁻). */
      yuk: number;
      notron?: number;
      /** Kabuk başına elektron — verilirse otomatik dizilimin yerine geçer. */
      kabuklar?: number[];
      cekirdek: "yuk" | "pn" | "sembol";
      kabukAdi: boolean;
      baslik?: string;
    }
  | {
      tur: "molekul";
      /** MOLEKULLER kimliği; "ozel" = `ozel` alanındaki yazımdan, "zincir" = `zincir` alanındaki alkan/alken/alkin. */
      id: string;
      gosterim: "lewis" | "cizgi";
      kismiYuk: boolean;
      geometri: boolean;
      baslik?: string;
      /** Özel molekül: atomlar "O(0,-0.35,2); H(-0.85,0.45)" (simge, x, y, serbest çift), bağlar "1-2; 1-3; 2=3; 2#3". */
      ozel?: { ad: string; atomlar: string; baglar: string };
      zincir?: {
        n: number;
        tur: "alkan" | "alken" | "alkin";
        konum: number;
        /** v1.2: halkalı (sikloalkan, n = 3–8; yalnız alkan). */
        halka?: boolean;
        /** v1.2: ana zincirdeki karbonlara bağlı yan gruplar (k: 1'den karbon numarası). */
        yanGruplar?: { k: number; g: OrganikYanGrup }[];
      };
    }
  /** Orbital kutu-ok diyagramı: elektron sayısı (z − yük) Aufbau + Hund kuralıyla otomatik dolar. */
  | { tur: "orbital"; z: number; yuk: number; baslik?: string; dizilim: boolean }
  /** Tuz köprülü (Daniell tipi) pil. */
  | { tur: "pil"; anot: string; katot: string; anotCozelti: string; katotCozelti: string; voltmetre: boolean; iyonlar: boolean; baslik?: string }
  | {
      tur: "periyodik";
      bolge: "tum" | "ilk20" | "ilk3" | "ana";
      goster: "sembol" | "sembolNo" | "tam";
      /** Boyanacak elementlerin atom numaraları. */
      boyali: number[];
      /** Simgesi "?" yapılacak elementler. */
      soru: number[];
      grupNo: boolean;
      baslik?: string;
    };

/** Venn şeması, olasılık ağacı, sayı doğrusu (bkz. `sema.ts`). */
export type SemaVerisi =
  | {
      tur: "venn";
      /** 2 ya da 3 küme. */
      kume: number;
      adlar: string[];
      /** Bölge değerleri (yazı): 2 kümede [yalnız A, A∩B, yalnız B, dışı]; 3 kümede [A, B, C, A∩B, A∩C, B∩C, A∩B∩C, dışı]. */
      bolgeler: string[];
      evrensel: boolean;
      evrenselAd?: string;
      /** Boyanacak bölge indeksleri (bölgeler ile aynı sıra). */
      boyali?: number[];
      baslik?: string;
      /**
       * Yalnız 2 kümede: kesisen (varsayılan) · altKume (A ⊂ B, iç içe) · ayrik (A ∩ B = ∅).
       * Bölge dizisinin anlamı değişmez: altKume'de "yalnız A" (0), ayrik'te "A∩B" (1) boş kümedir.
       */
      duzen?: VennDuzeni;
    }
  | {
      tur: "agac";
      /** Kökten dallar; her dalın alt dalları olabilir (en çok 3 aşama). */
      dallar: AgacDali[];
      baslik?: string;
    }
  /** Trigonometrik birim çember (bkz. `semaEk.ts`). */
  | {
      tur: "birimCember";
      /** α (derece, −720…720). */
      aci: number;
      /** P noktasının adı (varsayılan "P"). */
      noktaAdi?: string;
      /** Açı yayının yazısı (varsayılan "α"; "30°" da yazılabilir). */
      aciEtiketi?: string;
      /** tan doğrusu (x = 1) ve T(1, tan α). */
      tan?: boolean;
      /** cot doğrusu (y = 1) ve K(cot α, 1). */
      cot?: boolean;
      /** P'den eksenlere kesikli izdüşüm dikmeleri ve cos α / sin α yazıları (varsayılan açık). */
      izdusum?: boolean;
      /** Bölge numaraları (I–IV) ve pozitif olan oranlar. */
      bolgeler?: boolean;
      baslik?: string;
    }
  /** Eşitsizlik işaret tablosu (bkz. `semaEk.ts`). */
  | {
      tur: "isaretTablosu";
      /** Soldan sağa kökler / tanımsız noktalar (en çok 8). */
      kokler: IsaretKoku[];
      /** Satırlar (en çok 6): her biri kökler+1 aralığın işareti ("+", "-" ya da ""). */
      satirlar: IsaretSatiri[];
      /** Çözüm kümesindeki aralıkların indeksleri (taranır). */
      cozum?: number[];
      /** Altta çözüm kümesi sayı doğrusu satırı. */
      cozumSatiri?: boolean;
      /** Kök değerinin altında katlılık/dahil işareti: ○ tek, ○○ çift, ● dahil, || tanımsız. */
      katGoster?: boolean;
      /** Otomatik hesap kaynağı: "(x+2)(x-1)^2/(x-4)". */
      ifade?: string;
      esitsizlik?: "<" | "<=" | ">" | ">=" | "";
      baslik?: string;
    }
  /** Fonksiyon / küme eşleme ok diyagramı (bkz. `semaEk.ts`). */
  | {
      tur: "fonksiyonSema";
      /** [tanım kümesi adı, değer kümesi adı]. */
      adlar: string[];
      /** Fonksiyon adı (f); boşsa üst yazı çizilmez. */
      fonkAd: string;
      a: string[];
      b: string[];
      /** Eşleme okları: [A'daki indeks, B'deki indeks]. */
      oklar: [number, number][];
      baslik?: string;
    }
  | {
      tur: "sayiDogrusu";
      min: number;
      max: number;
      adim: number;
      /** Boyalı aralıklar ve noktalar. */
      araliklar: { bas: number | null; son: number | null; basDahil: boolean; sonDahil: boolean }[];
      noktalar: { x: number; ad?: string; dolu?: boolean }[];
      baslik?: string;
    };

/** Organik zincire bağlanabilen yan gruplar (bkz. `kimya.ts` organikAdlandir). */
export type OrganikYanGrup = "CH3" | "C2H5" | "Cl" | "Br" | "OH" | "NH2";

export type AgacDali = { ad: string; olasilik: string; alt?: AgacDali[] };

export type VennDuzeni = "kesisen" | "altKume" | "ayrik";

/** İşaret tablosunda bir kök: değer yazısı ("-2", "1/2", "√3"), katlılık, tanımsızlık, çözüme dahil olma. */
export type IsaretKoku = { deger: string; kat: "tek" | "cift"; tanimsiz?: boolean; dahil?: boolean };

/** İşaret tablosu satırı; `noktalar` kök başına "0" / "||" / "" (yoksa son satırda kök türünden). */
export type IsaretSatiri = { ad: string; isaretler: string[]; noktalar?: string[] };
