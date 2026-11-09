// Fizik şekilleri – ek paketler (Maarif): akışkanlar, dalgalar, elektrik–manyetizma, çembersel hareket,
// hareket kavramları, madde ve doğası. Yalnız VERİ (ayar tablosu): çizim `fizikCizEk.ts` içindedir.
import type { Alan } from "./sema";

export type FizikEkYapi =
  | "torricelli" | "bernoulli" | "hidrolik" | "manometre"
  | "atma" | "dalga" | "rezonans" | "doppler" | "kirinim";

type Sema = { ad: string; alt: string; alanlar: Alan[] };

export const FIZIK_EK_SEMA: Record<FizikEkYapi, Sema> = {
  // ── Paket 1: Akışkanlar ──────────────────────────────────────────────────
  torricelli: {
    ad: "Torricelli – delikli kap", alt: "Fizik – Akışkanlar",
    alanlar: [
      { k: "sayi", a: "h", ad: "Sıvı yüksekliği h (m)", min: 1, max: 20, adim: 0.5, v: 8, kok: true },
      { k: "sayi", a: "d1", ad: "1. delik derinliği (m, 0 = yok)", min: 0, max: 20, adim: 0.5, v: 2, kok: true },
      { k: "sayi", a: "d2", ad: "2. delik derinliği (m, 0 = yok)", min: 0, max: 20, adim: 0.5, v: 4, kok: true },
      { k: "sayi", a: "d3", ad: "3. delik derinliği (m, 0 = yok)", min: 0, max: 20, adim: 0.5, v: 6, kok: true },
      { k: "sayi", a: "g", ad: "g (m/s²)", min: 1, max: 20, adim: 0.2, v: 10 },
      { k: "mantik", a: "veri", ad: "Derinlikleri yaz (d₁, d₂…)", v: true },
      { k: "mantik", a: "deger", ad: "Değerleri sayıyla yaz", v: false },
      { k: "mantik", a: "kokYaz", ad: "Köklü değerleri √ ile yaz", v: false },
      { k: "mantik", a: "menzil", ad: "Menzilleri göster (x)", v: true },
      { k: "mantik", a: "hizOk", ad: "Çıkış hızı okları", v: false },
      { k: "mantik", a: "gaz", ad: "Kapalı kap (gaz basıncı P)", v: false },
      { k: "mantik", a: "yer", ad: "Zemin", v: true },
    ],
  },
  bernoulli: {
    ad: "Bernoulli – boru ve kesit (Venturi)", alt: "Fizik – Akışkanlar",
    alanlar: [
      { k: "sec", a: "tip", ad: "Düzenek", sec: [["venturi", "Venturi (manometre tüpleri)"], ["kademe", "Kesiti değişen boru"], ["yukseklik", "Yükseklik farklı boru"]], v: "venturi" },
      { k: "sayi", a: "a1", ad: "A₁ (cm²)", min: 1, max: 100, adim: 1, v: 40 },
      { k: "sayi", a: "a2", ad: "A₂ (cm²)", min: 1, max: 100, adim: 1, v: 10 },
      { k: "sayi", a: "v1", ad: "v₁ (m/s)", min: 0.5, max: 30, adim: 0.5, v: 2, kok: true },
      { k: "sayi", a: "dh", ad: "Yükseklik farkı h (m)", min: 0.5, max: 10, adim: 0.5, v: 2 },
      { k: "mantik", a: "veri", ad: "A ve v değerlerini yaz", v: true },
      { k: "mantik", a: "sonuc", ad: "v₂ değerini yaz (yoksa ?)", v: false },
      { k: "mantik", a: "kokYaz", ad: "Köklü değerleri √ ile yaz", v: false },
      { k: "mantik", a: "akim", ad: "Akım çizgileri", v: true },
      { k: "mantik", a: "yonOk", ad: "Akış yönü oku", v: true },
      { k: "mantik", a: "p", ad: "P₁, P₂ basınç yazıları", v: true },
    ],
  },
  hidrolik: {
    ad: "Hidrolik pres (Pascal)", alt: "Fizik – Akışkanlar",
    alanlar: [
      { k: "sayi", a: "a1", ad: "Küçük piston A₁ (cm²)", min: 1, max: 100, adim: 1, v: 10 },
      { k: "sayi", a: "a2", ad: "Büyük piston A₂ (cm²)", min: 1, max: 400, adim: 1, v: 50 },
      { k: "sayi", a: "f1", ad: "F₁ (N)", min: 1, max: 5000, adim: 1, v: 100, kok: true },
      { k: "sec", a: "sonuc", ad: "F₂", sec: [["soru", "Soru işareti"], ["deger", "Değer"], ["ad", "Yalnız F₂"]], v: "soru" },
      { k: "mantik", a: "veri", ad: "A ve F değerlerini yaz", v: true },
      { k: "mantik", a: "kokYaz", ad: "Köklü değerleri √ ile yaz", v: false },
      { k: "mantik", a: "yol", ad: "Piston yolları (x₁, x₂)", v: false },
      { k: "mantik", a: "yuk", ad: "Yük kutusu", v: true },
      { k: "metin", a: "yukAd", ad: "Yük yazısı", en: 8, v: "m" },
    ],
  },
  manometre: {
    ad: "Manometre (U borusu)", alt: "Fizik – Akışkanlar",
    alanlar: [
      { k: "sec", a: "tip", ad: "Düzenek", sec: [["acik", "Açık uçlu (atmosfere)"], ["kapali", "Kapalı uçlu (boşluk)"], ["ikiGaz", "İki gaz arası"]], v: "acik" },
      { k: "sayi", a: "fark", ad: "Seviye farkı h (cm, + sağ yüksek)", min: -20, max: 20, adim: 1, v: 10 },
      { k: "sayi", a: "rho", ad: "Sıvı özkütlesi (g/cm³)", min: 0.5, max: 14, adim: 0.1, v: 13.6 },
      { k: "mantik", a: "veri", ad: "h değerini yaz", v: true },
      { k: "mantik", a: "kapAd", ad: "Gaz / P₀ adları", v: true },
      { k: "mantik", a: "seviye", ad: "Seviye çizgileri", v: true },
      { k: "metin", a: "adlar", ad: "Adlar: sol gaz, sağ gaz, sıvı", en: 30, v: "Gaz, P_0, sıvı" },
    ],
  },
  // ── Paket 2: Dalgalar
  atma: {
    ad: "Atma (yay dalgası): yansıma ve girişim", alt: "Fizik – Dalgalar",
    alanlar: [
      { k: "sec", a: "tip", ad: "Durum", sec: [["tek", "Tek atma ilerliyor"], ["sabit", "Sabit uçtan yansıma"], ["serbest", "Serbest uçtan yansıma"], ["yapici", "Karşılaşma: yapıcı girişim"], ["yikici", "Karşılaşma: yıkıcı girişim"]], v: "sabit" },
      { k: "sayi", a: "a1", ad: "1. atma genliği (kare)", min: 1, max: 4, adim: 1, v: 2 },
      { k: "sayi", a: "a2", ad: "2. atma genliği (kare)", min: 1, max: 4, adim: 1, v: 2 },
      { k: "sayi", a: "gen", ad: "Atma tabanı (kare)", min: 1, max: 6, adim: 1, v: 2 },
      { k: "sayi", a: "k1", ad: "1. atma başlangıç konumu (kare)", min: 1, max: 14, adim: 1, v: 3 },
      { k: "sayi", a: "k2", ad: "2. atma başlangıç konumu (kare)", min: 2, max: 15, adim: 1, v: 13 },
      { k: "sayi", a: "t", ad: "Geçen süre t (s, hız 1 kare/s)", min: 0, max: 20, adim: 1, v: 4 },
      { k: "sec", a: "yon", ad: "1. atma yönü", sec: [["ust", "Yukarı (tepe)"], ["alt", "Aşağı (çukur)"]], v: "ust" },
      { k: "mantik", a: "izgara", ad: "Kare çizgileri", v: true },
      { k: "mantik", a: "ilk", ad: "İlk konumu kesikli çiz", v: true },
      { k: "mantik", a: "zaman", ad: "Süreyi yaz (t = … s)", v: true },
      { k: "mantik", a: "hiz", ad: "Hızı yaz (v = 1 kare/s)", v: true },
    ],
  },
  dalga: {
    ad: "Periyodik dalga (λ, A, T)", alt: "Fizik – Dalgalar",
    alanlar: [
      { k: "sec", a: "tip", ad: "Dalga türü", sec: [["enine", "Enine dalga"], ["boyuna", "Boyuna dalga (sıkışma–genleşme)"]], v: "enine" },
      { k: "sayi", a: "lam", ad: "Dalga boyu λ (kare)", min: 2, max: 8, adim: 1, v: 4 },
      { k: "sayi", a: "genlik", ad: "Genlik A (kare)", min: 1, max: 3, adim: 1, v: 2 },
      { k: "sayi", a: "sayi", ad: "Dalga sayısı", min: 1, max: 4, adim: 1, v: 2 },
      { k: "sayi", a: "kareBoy", ad: "1 kare = (cm)", min: 1, max: 100, adim: 1, v: 10 },
      { k: "sayi", a: "T", ad: "Periyot T (s)", min: 0.1, max: 10, adim: 0.1, v: 2 },
      { k: "mantik", a: "veri", ad: "λ ve A değerlerini yaz", v: false },
      { k: "mantik", a: "lamOk", ad: "λ ölçüsü", v: true },
      { k: "mantik", a: "genOk", ad: "Genlik ölçüsü (A)", v: true },
      { k: "mantik", a: "tepe", ad: "Tepe ve çukur adları", v: true },
      { k: "mantik", a: "noktalar", ad: "K, L, M, N noktaları", v: false },
      { k: "mantik", a: "izgara", ad: "Kare çizgileri", v: true },
    ],
  },
  rezonans: {
    ad: "Duran dalga (boru ve tel)", alt: "Fizik – Dalgalar",
    alanlar: [
      { k: "sec", a: "tip", ad: "Düzenek", sec: [["acik", "İki ucu açık boru"], ["kapali", "Bir ucu kapalı boru"], ["tel", "İki ucu sabit tel"]], v: "kapali" },
      { k: "sayi", a: "n", ad: "Mod numarası n", min: 1, max: 6, adim: 1, v: 2 },
      { k: "sayi", a: "L", ad: "Uzunluk L (m)", min: 0.1, max: 10, adim: 0.1, v: 1 },
      { k: "sayi", a: "hiz", ad: "Dalga hızı (m/s)", min: 50, max: 5000, adim: 10, v: 340 },
      { k: "mantik", a: "dk", ad: "Düğüm (D) ve karın (K) adları", v: true },
      { k: "mantik", a: "lYaz", ad: "L değerini yaz", v: true },
      { k: "mantik", a: "lamYaz", ad: "λ ve f değerlerini yaz", v: false },
      { k: "mantik", a: "yarim", ad: "Karşı yarı (kesikli)", v: true },
    ],
  },
  doppler: {
    ad: "Doppler olayı (hareketli kaynak)", alt: "Fizik – Dalgalar",
    alanlar: [
      { k: "sayi", a: "oran", ad: "Kaynak hızı / dalga hızı (vₖ/v)", min: 0, max: 1.6, adim: 0.1, v: 0.5 },
      { k: "sec", a: "yon", ad: "Kaynağın yönü", sec: [["sag", "Sağa"], ["sol", "Sola"]], v: "sag" },
      { k: "sayi", a: "n", ad: "Dalga cephesi sayısı", min: 3, max: 8, adim: 1, v: 5 },
      { k: "mantik", a: "hizOk", ad: "Kaynak hız oku", v: true },
      { k: "mantik", a: "gozlemci", ad: "Gözlemciler (A, B)", v: true },
      { k: "mantik", a: "fYaz", ad: "Frekans karşılaştırması", v: false },
      { k: "mantik", a: "konus", ad: "Süpersonikte Mach konisi", v: true },
    ],
  },
  kirinim: {
    ad: "Su dalgaları: yansıma, kırılma, kırınım, girişim", alt: "Fizik – Dalgalar",
    alanlar: [
      { k: "sec", a: "tip", ad: "Olay", sec: [["yansima", "Yansıma"], ["kirilma", "Kırılma (derin–sığ)"], ["kirinim", "Kırınım (aralık)"], ["girisim", "Girişim (iki kaynak)"]], v: "kirinim" },
      { k: "sayi", a: "lam", ad: "Dalga boyu λ (çizim birimi)", min: 8, max: 30, adim: 1, v: 16 },
      { k: "sayi", a: "aci", ad: "Gelme açısı i (°)", min: 10, max: 80, v: 40 },
      { k: "sayi", a: "oran", ad: "v₁ / v₂ (kırılmada)", min: 1, max: 3, adim: 0.1, v: 1.6 },
      { k: "sayi", a: "yarik", ad: "Aralık genişliği (λ)", min: 0.5, max: 6, adim: 0.5, v: 1.5 },
      { k: "sayi", a: "ara", ad: "S₁S₂ uzaklığı (λ)", min: 1, max: 6, adim: 0.5, v: 3 },
      { k: "mantik", a: "isin", ad: "Işın (yön) okları", v: true },
      { k: "mantik", a: "normal", ad: "Normal çizgisi", v: true },
      { k: "mantik", a: "etiket", ad: "Yazılar (i, r, λ, S₁, S₂)", v: true },
      { k: "mantik", a: "dugum", ad: "Girişim: düğüm (D) ve karın (K) çizgileri", v: true },
    ],
  },
  // <<PAKET-EK-SEMA>>
};

export const FIZIK_EK_BOYUT: Record<FizikEkYapi, { w: number; h: number }> = {
  torricelli: { w: 420, h: 260 }, bernoulli: { w: 420, h: 220 }, hidrolik: { w: 380, h: 230 }, manometre: { w: 320, h: 240 },
  atma: { w: 440, h: 210 }, dalga: { w: 440, h: 210 }, rezonans: { w: 420, h: 200 }, doppler: { w: 440, h: 230 }, kirinim: { w: 440, h: 270 },
};
