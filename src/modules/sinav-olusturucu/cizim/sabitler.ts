// Çizim editörünün sayısal sabitleri.
//
// Tuval ölçüsü (CANVAS_W/H) yalnız bir stil değeri değil: şekiller bu
// çerçeveye kırpılıyor (`sekilTasiSinirli`, `sekilGeometriAyarla`) ve
// `cizim-editoru-senaryolari.ts` beklenen kutuları buna göre kuruyor.
// Değiştiren, testteki tuval boyutunu da güncellemek zorunda.

// VARSAYILAN tuval ölçüsü. Artık tek doğru değil: tuval büyüyebiliyor ve
// gerçek ölçü BELGEDE saklanıyor (`CizimBelgesi.genislik/yukseklik`). Bu iki
// sabit yalnızca (a) yeni çizimin başlangıcı ve (b) ölçü verilmeyen eski
// çağrılar için varsayılan.
//
// DİKKAT: belgedeki ölçü uzun süre YAZILIYOR ama HİÇ OKUNMUYORDU — kaydedilen
// çizim yeniden açılınca hep 960×600 varsayılıyordu. Tuval sabitken bu
// görünmez bir kusurdu; değişken olunca büyük çizimleri kırpardı.
export const CANVAS_W = 960;

export const CANVAS_H = 600;

/** Tuval ölçüsü. Fonksiyonlara parametre olarak geçer; verilmezse varsayılan. */
export type TuvalOlcusu = { w: number; h: number };

export const VARSAYILAN_TUVAL: TuvalOlcusu = { w: CANVAS_W, h: CANVAS_H };

/**
 * Hazır tuval ölçüleri.
 *
 * Öğretmenin örnek olarak gönderdiği karmaşık akış şeması ~1900×1300 idi;
 * 960×600'e sığdırınca kutular okunmaz oluyordu. En büyük ölçü A4'e basılınca
 * hâlâ okunur: çizim kâğıda kendi doğal oranında, en fazla bağlam genişliği
 * kadar giriyor, yani geniş tuval "daha çok kutu" demek, "daha küçük yazı"
 * değil — sayfaya sığmayan şemayı öğretmen ikiye böler.
 */
export const TUVAL_OLCULERI: { ad: string; w: number; h: number }[] = [
  { ad: "Normal", w: 960, h: 600 },
  { ad: "Geniş", w: 1440, h: 900 },
  { ad: "Çok geniş", w: 1920, h: 1200 },
  { ad: "Dikey", w: 900, h: 1400 },
];

export const EN_BUYUK_TUVAL = { w: 2400, h: 1800 };

export const MUREKKEP = "#0f172a";

export const VURUS_PAYI = 6;

export const TUTAMAC_BOYUT = 9;

export const TUTAMAC_VURUS_YARICAPI = 9;

export const METIN_PUNTO = 20;

export const METIN_SATIR_ARALIGI = 1.2;

export const IZGARA_ARALIK = 20;

export const GECMIS_LIMITI = 80;

export const KULLANICI_SABLONLARI_ANAHTARI = "ogretmen-asistani:cizim-sablonlari:v1";

export const SABLON_ADI_SINIRI = 12;

// YENİ ŞEKİL TÜRÜ EKLEYEN BURAYI DA GÜNCELLEMELİ: bu liste kullanıcı
// şablonlarının beyaz listesi (`sablon.ts`). Eksik kalırsa şablona kaydedilen
// şekil geri yüklenirken SESSİZCE düşer.
export const GECERLI_SEKIL_TURLERI = ["dogru", "dikdortgen", "elips", "ucgen", "cokgen", "dalga", "serbest", "metin", "akis", "fizik", "baglayici"];

// ── Akış şeması ────────────────────────────────────────────────────────────
/** Yeni akış kutusunun varsayılan ölçüsü (px, tuval birimi). */
export const AKIS_VARSAYILAN_W = 180;
export const AKIS_VARSAYILAN_H = 80;
/** Karar kutusu daha geniş olmalı: eşkenar dörtgende kullanılabilir iç genişlik
 *  kutu genişliğinin ~yarısı, aynı metin dikdörtgenin iki katı yer istiyor. */
export const AKIS_KARAR_W = 220;
export const AKIS_KARAR_H = 120;
export const AKIS_PUNTO = 15;
export const AKIS_SATIR_ARALIGI = 1.25;
/** Metnin kutu kenarına değmemesi için iç boşluk (px). */
export const AKIS_IC_PAY = 10;
/** Eşkenar dörtgen/paralelkenar/altıgende metnin sığdığı genişlik oranı —
 *  kenarlar eğik olduğu için tam genişlik kullanılamaz. Ölçülmedi, geometriden
 *  türetildi: eşkenar dörtgende orta yükseklikte genişlik tamdır ama üst/alt
 *  satırlar daralır, bu yüzden güvenli taraf seçildi. */
export const AKIS_IC_GENISLIK_ORANI: Record<string, number> = {
  baslangic: 0.82,
  surec: 1,
  karar: 0.56,
  veri: 0.74,
  hazirlik: 0.7,
  belge: 1,
};

export const HIZALAMA_ESIGI = 9;

// Kilitlenmiş bir hizalamayı BOZMAK için giriş eşiğinden çok daha geniş bir
// alan gerekir (güçlü histerezis). Gerçek fare hareketi pikselde pikselde
// gelmez — birkaç piksellik sıçramalarla gelir; dar bir çıkış payı bu
// sıçramalarda kilidi anında bozup çizgiyi titretiyordu. Amaç: çizgi, şekil
// serbest bırakılana kadar sabit kalsın.
export const HIZALAMA_CIKIS_ORANI = 3.5;

export const HIZALAMA_CIZGI_PAYI = 20;

export const DEGME_TOLERANSI = 1.5;

// Yeni çizilen bir taslağın kalıcı şekle dönüşmesi için gereken asgari ölçü.
// Kazara tek tıkla nokta büyüklüğünde şekil bırakmayı engeller. Beş ayrı dalda
// çıplak `4` olarak duruyordu; tek sabite indirildi (bkz. taslagiKesinlestir).
export const ASGARI_CIZIM_PX = 4;

/** Yeni eklenen kutunun içindeki hazır metin. Boş bırakmak yerine örnek
 *  koymak, öğretmene kutunun ne işe yaradığını da anlatıyor. */
export const AKIS_VARSAYILAN_METIN: Record<string, string> = {
  baslangic: "BAŞLA",
  surec: "İşlem",
  karar: "Koşul?",
  veri: "Girdi / Çıktı",
  hazirlik: "Hazırlık",
  belge: "Çıktı belgesi",
};

/** Akış kutusu dolgu paleti. Baskı çoğunlukla siyah-beyaz olduğu için tonlar
 *  AÇIK seçildi: gri tonlamaya düştüğünde metin okunur kalsın. */
export const AKIS_DOLGU_PALETI = [
  { ad: "Dolgusuz", deger: undefined },
  { ad: "Mavi", deger: "#dbeafe" },
  { ad: "Yeşil", deger: "#dcfce7" },
  { ad: "Sarı", deger: "#fef9c3" },
  { ad: "Kırmızı", deger: "#fee2e2" },
  { ad: "Gri", deger: "#f1f5f9" },
] as const;

/** Bağlayıcının kutudan dik çıktığı ilk parça (px). Sıfır olsaydı ok kutunun
 *  kenarından hemen kıvrılır ve kenara yapışık görünürdü. */
export const BAGLAYICI_CIKIS = 22;
/** Ok başı uzunluğu (px). */
export const BAGLAYICI_OK_BOYU = 11;
/** Etiket puntosu ("Evet"/"Hayır"). */
export const BAGLAYICI_ETIKET_PUNTO = 13;
/** Bağlayıcıya tıklama toleransı — çizgi ince, vuruş payı geniş olmalı. */
export const BAGLAYICI_VURUS_PAYI = 8;

/**
 * Tuvalin verilen kaba sığdığı yakınlaştırma oranı (%).
 *
 * Saf fonksiyon — DOM okumaz, ölçüyü çağıran verir; testlenebilsin diye.
 * `PAY`: kabın iç dolgusu + kenarlık. Düşülmezse "sığdı" denen oranda
 * kaydırma çubuğu çıkıyor ve sığdırma amacını kaçırıyor.
 * Sonuç zoom düğmeleriyle aynı aralıkta tutuluyor (%25–%200) ve 5'in katına
 * yuvarlanıyor: "%137" gibi bir değer sonraki ±25 adımlarını da tuhaflaştırır.
 */
export function sigdirmaOrani(
  kapGenislik: number,
  kapYukseklik: number,
  olcu: TuvalOlcusu,
): number {
  const PAY = 24;
  const en = (kapGenislik - PAY) / olcu.w;
  const boy = (kapYukseklik - PAY) / olcu.h;
  const ham = Math.min(en, boy) * 100;
  if (!Number.isFinite(ham) || ham <= 0) return 100;
  return Math.max(25, Math.min(200, Math.floor(ham / 5) * 5));
}
