// Fizik şekilleri – ek paketler (Maarif): akışkanlar, dalgalar, elektrik–manyetizma, çembersel hareket,
// hareket kavramları, madde ve doğası. Yalnız VERİ (ayar tablosu): çizim `fizikCizEk.ts` içindedir.
import type { Alan } from "./sema";

export type FizikEkYapi =
  | "torricelli" | "bernoulli" | "hidrolik" | "manometre";

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
};

export const FIZIK_EK_BOYUT: Record<FizikEkYapi, { w: number; h: number }> = {
  torricelli: { w: 420, h: 260 }, bernoulli: { w: 420, h: 220 }, hidrolik: { w: 380, h: 230 }, manometre: { w: 320, h: 240 },
};
