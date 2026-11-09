// Fizik şekilleri (9–11. sınıf): atış, enerji dönüşümü, çarpışma, tork, vektör toplama, serbest cisim.
// Coğrafya şekilleriyle AYNI ayar tablosu düzenini kullanır (varsayılanlar + doğrulama + otomatik panel).
import type { Alan } from "./sema";

export type FizikYapi = "atis" | "enerji" | "carpisma" | "tork" | "vektorToplam" | "scd";

export const FIZIK_SEMA: Record<FizikYapi, { ad: string; alt: string; alanlar: Alan[] }> = {
  atis: {
    ad: "Atış hareketi (yörünge)", alt: "Fizik – Atış",
    alanlar: [
      { k: "sec", a: "tip", ad: "Atış", sec: [["yatay", "Yatay atış"], ["egik", "Eğik atış"], ["yuksekEgik", "Yüksekten eğik atış"]], v: "egik" },
      { k: "sayi", a: "v0", ad: "İlk hız v₀ (m/s)", min: 1, max: 300, v: 40, kok: true },
      { k: "sayi", a: "aci", ad: "Atış açısı (°, − aşağı)", min: -89, max: 89, v: 53 },
      { k: "sayi", a: "h0", ad: "Atış yüksekliği h (m)", min: 0, max: 1000, v: 0, kok: true },
      { k: "sayi", a: "g", ad: "g (m/s²)", min: 1, max: 20, adim: 0.2, v: 10 },
      { k: "mantik", a: "veri", ad: "Verilenleri yaz", v: true },
      { k: "mantik", a: "sonuc", ad: "H ve menzili değerle yaz", v: false },
      { k: "mantik", a: "kokYaz", ad: "Köklü değerleri √ ile yaz", v: false },
      { k: "mantik", a: "bilesen", ad: "Hız bileşenleri", v: true },
      { k: "mantik", a: "tepe", ad: "Tepe noktası (H)", v: true },
      { k: "mantik", a: "menzil", ad: "Menzil (x)", v: true },
      { k: "mantik", a: "noktalar", ad: "Eş zaman aralıklı noktalar", v: false },
      { k: "mantik", a: "yer", ad: "Zemin", v: true },
    ],
  },
  enerji: {
    ad: "Enerji dönüşümü (sarkaç, pist, yay)", alt: "Fizik – Enerji",
    alanlar: [
      { k: "sec", a: "tur", ad: "Düzenek", sec: [["sarkac", "Sarkaç"], ["pist", "Pist (A–E)"], ["yay", "Yay + kütle"]], v: "pist" },
      { k: "sayi", a: "aci", ad: "Sarkaç açısı (°)", min: 5, max: 85, v: 60 },
      { k: "sayilar", a: "yuk", ad: "Pist yükseklikleri A–E (0–10)", n: 5, min: 0, max: 10, v: [8, 2, 6, 0, 4] },
      { k: "sec", a: "surt", ad: "Sürtünmeli bölge", sec: [["yok", "Yok (sürtünmesiz)"], ["AB", "A–B"], ["BC", "B–C"], ["CD", "C–D"], ["DE", "D–E"]], v: "yok" },
      { k: "mantik", a: "noktaAd", ad: "Nokta adları", v: true },
      { k: "mantik", a: "yukYaz", ad: "Yükseklik yazıları", v: true },
      { k: "mantik", a: "hizOk", ad: "Hız okları", v: false },
      { k: "mantik", a: "egikCikis", ad: "Yay: eğik çıkış (h)", v: true },
      { k: "metin", a: "yukEtiket", ad: "Yükseklik yazıları (virgülle, A–E)", en: 40, v: "4h, h, 3h, 0, 2h" },
      { k: "metin", a: "kutle", ad: "Kütle yazısı", en: 8, v: "m" },
    ],
  },
  carpisma: {
    ad: "Çarpışma (önce – sonra)", alt: "Fizik – Momentum",
    alanlar: [
      { k: "sec", a: "tip", ad: "Çarpışma", sec: [["esnek", "Esnek"], ["yapisan", "Yapışarak (tam esnek olmayan)"], ["ayrilma", "Ayrılma (patlama)"]], v: "yapisan" },
      { k: "sayi", a: "m1", ad: "m₁ (kg)", min: 0.5, max: 50, adim: 0.5, v: 2, kok: true },
      { k: "sayi", a: "m2", ad: "m₂ (kg)", min: 0.5, max: 50, adim: 0.5, v: 3, kok: true },
      { k: "sayi", a: "v1", ad: "v₁ (m/s, − sola)", min: -60, max: 60, v: 6, kok: true },
      { k: "sayi", a: "v2", ad: "v₂ (m/s, − sola)", min: -60, max: 60, v: 0, kok: true },
      { k: "sec", a: "sonra", ad: "Sonra", sec: [["hesap", "Değerleri yaz"], ["soru", "Soru işareti"], ["yok", "Gösterme"]], v: "soru" },
      { k: "mantik", a: "deger", ad: "Önce değerleri yaz", v: true },
      { k: "mantik", a: "kokYaz", ad: "Köklü değerleri √ ile yaz", v: false },
      { k: "mantik", a: "zemin", ad: "Zemin çizgisi", v: true },
    ],
  },
  tork: {
    ad: "Tork ve denge (çubuk)", alt: "Fizik – Tork",
    alanlar: [
      { k: "sec", a: "mod", ad: "Yükler", sec: [["kuvvet", "Kuvvet okları"], ["agirlik", "Asılı kütleler"]], v: "kuvvet" },
      { k: "sayi", a: "mesnet", ad: "Mesnet konumu (0–10)", min: 0, max: 10, adim: 0.5, v: 5 },
      { k: "sayilar", a: "konum", ad: "Yük konumları (0–10)", n: 4, min: 0, max: 10, v: [1, 3, 7, 9] },
      { k: "sayilar", a: "deger", ad: "Büyüklükler (+ aşağı, − yukarı, 0 yok)", n: 4, min: -9, max: 9, v: [4, 0, 2, 0] },
      { k: "sec", a: "destek", ad: "Mesnet", sec: [["ucgen", "Üçgen takoz"], ["ip", "Tavandan ip"]], v: "ucgen" },
      { k: "mantik", a: "olcek", ad: "Ölçek çizgileri", v: true },
      { k: "mantik", a: "sayi", ad: "Ölçek sayıları", v: false },
      { k: "mantik", a: "agirlikOk", ad: "Çubuğun ağırlığı (G)", v: false },
      { k: "metin", a: "adlar", ad: "Yük adları (virgülle)", en: 40, v: "F_1, F_2, F_3, F_4" },
    ],
  },
  vektorToplam: {
    ad: "Vektör toplama / çıkarma (kareli)", alt: "Fizik – Vektör",
    alanlar: [
      { k: "sec", a: "yontem", ad: "Yöntem", sec: [["ucuca", "Uç uca ekleme"], ["paralel", "Paralelkenar"], ["cikarma", "Çıkarma (A − B)"]], v: "ucuca" },
      { k: "sayi", a: "ax", ad: "A: sağa (kare)", min: -9, max: 9, adim: 1, v: 4 },
      { k: "sayi", a: "ay", ad: "A: yukarı (kare)", min: -9, max: 9, adim: 1, v: 1 },
      { k: "sayi", a: "bx", ad: "B: sağa (kare)", min: -9, max: 9, adim: 1, v: 2 },
      { k: "sayi", a: "by", ad: "B: yukarı (kare)", min: -9, max: 9, adim: 1, v: 3 },
      { k: "mantik", a: "bileske", ad: "Bileşkeyi göster", v: true },
      { k: "mantik", a: "bilesen", ad: "Bileşke x–y bileşenleri", v: false },
      { k: "mantik", a: "izgara", ad: "Kare çizgileri", v: true },
      { k: "mantik", a: "uzunluk", ad: "Bileşke uzunluğu yaz", v: false },
      { k: "metin", a: "adlar", ad: "Adlar (A, B, bileşke)", en: 20, v: "A, B, R" },
    ],
  },
  scd: {
    ad: "Serbest cisim diyagramı", alt: "Fizik – Kuvvet",
    alanlar: [
      { k: "sec", a: "yuzey", ad: "Düzenek", sec: [["yatay", "Yatay zemin"], ["egik", "Eğik düzlem"], ["askida", "İple asılı"]], v: "yatay" },
      { k: "sayi", a: "aci", ad: "Eğim açısı (°)", min: 10, max: 70, v: 30 },
      { k: "mantik", a: "agirlik", ad: "Ağırlık", v: true },
      { k: "mantik", a: "normal", ad: "Normal kuvvet", v: true },
      { k: "mantik", a: "surtunme", ad: "Sürtünme", v: false },
      { k: "mantik", a: "gerilme", ad: "Gerilme", v: false },
      { k: "mantik", a: "dis", ad: "Dış kuvvet F", v: false },
      { k: "mantik", a: "bilesen", ad: "Ağırlık bileşenleri (eğik)", v: false },
      { k: "sayi", a: "disAci", ad: "F açısı (°, yüzeye göre)", min: -80, max: 80, v: 0 },
      { k: "sec", a: "yon", ad: "F yönü", sec: [["sag", "Sağa / yukarı"], ["sol", "Sola / aşağı"]], v: "sag" },
      { k: "sec", a: "cisim", ad: "Cisim", sec: [["kutu", "Kutu"], ["nokta", "Nokta"]], v: "kutu" },
      { k: "mantik", a: "yuzeyCiz", ad: "Yüzeyi çiz", v: true },
      { k: "metin", a: "adlar", ad: "Adlar: ağırlık, normal, sürtünme, gerilme, dış", en: 40, v: "mg, N, f, T, F" },
    ],
  },
};

export const FIZIK_YAPILARI = Object.keys(FIZIK_SEMA) as FizikYapi[];

export const FIZIK_BOYUTLARI: Record<FizikYapi, { w: number; h: number }> = {
  atis: { w: 420, h: 240 }, enerji: { w: 380, h: 240 }, carpisma: { w: 420, h: 230 },
  tork: { w: 400, h: 220 }, vektorToplam: { w: 300, h: 240 }, scd: { w: 300, h: 230 },
};
