// core/performansSablonu.ts — SAF FONKSİYON (UI yok, DB yok). Öğretmenin kendi
// performans şablonu: GRUPLAR (yüzde) → içinde KALEMLER (grup içi yüzde).
//
// NEDEN (2026-10 kullanıcı isteği): kalemler ve ağırlıklar sabitti (katılım, ödev,
// sınav, MEBİ, kitap). Öğretmen kâğıt çizelgesindeki gibi "Sınıf içi %70 (Kitap,
// Davranış, Katılım) + Ödev %30" kurmak, MEBİ'yi/kitabı tamamen çıkarmak, kendi
// kalemini (proje, sunum — elle not) eklemek istiyor.
//
// HESAP: kalem puanları 0..100. Grup puanı = verisi olan kalemlerin grup içi
// yüzdeleriyle ağırlıklı ortalaması (verisi olmayan kalemin payı AYNI GRUPTAKİ
// diğerlerine oranla geçer). Toplam = verisi olan grupların yüzdeleriyle ağırlıklı
// ortalama (tamamen verisiz grubun payı diğer gruplara geçer). "Eksik = 0" YOK —
// core/performans.ts'teki 2026-09 kararının aynısı; eksikler `eksikKalemler`de döner.

import { notYuvarla } from "@/core/notBasamak";
export type YerlesikKaynak = "katilim" | "olumlu" | "davranis" | "kitap" | "devam" | "odev" | "sinav" | "mebi";
export type KalemKaynak = YerlesikKaynak | "elle";

/** Günlük (Hızlı İşleme) kalemlerinin puan kuralı — OA54, öğretmen belirler.
 *  ARTI kalem (olumlu): işaretsiz öğrenci `baslangic` alır, hedefe ulaşınca 100.
 *  EKSİ kalem (davranış, devam, kitap): işaretsiz öğrenci `baslangic` alır (genelde 100),
 *  hedefe ulaşınca `enDusuk`e iner. Hedef: `olcut:"oran"` → katıldığı derslerin %deger'i,
 *  `olcut:"adet"` → deger kez. Ara değerler doğrusal. Ayar YOKSA eski hesap (geriye uyum). */
export interface GunlukAyar {
  baslangic: number;
  enDusuk: number;
  /** "oran": katıldığı derslerin %deger'i · "adet": deger kez · "puan" (OA55): her işaret deger puan. */
  olcut: "oran" | "adet" | "puan";
  deger: number;
}

export interface SablonKalem {
  /** Yerleşik kaynakta kaynağın kendisi ("odev"); elle kalemde "elle-<sayı>". Şablonda tekil. */
  id: string;
  kaynak: KalemKaynak;
  /** Elle kalemde öğretmenin verdiği ad; yerleşikte boş bırakılabilir (KAYNAK_BILGI.ad kullanılır). */
  ad?: string;
  /** Grup içi yüzde (0..100). */
  yuzde: number;
  /** Yalnız günlük kalemlerde (olumlu/davranis/kitap/devam). */
  ayar?: GunlukAyar;
  /** OA78: yalnız "olumlu" (Derse katılım) kaleminde. true → TAM not sayılır (↑ almayan o
   *  kalemden düşük alır, yüzdeler notla birebir tutar). Yoksa/false → notu yalnız yükseltir (OA76). */
  tamSayilir?: boolean;
  /** OA92: yalnız "sinav" kaleminde. "yazili" → Yazılı/Dinleme/Konuşma'lı (Edebiyat) sınavlarda yalnız
   *  Yazılı parçası alınır; parçasız sınavda not zaten yazılıdır. Yoksa: e-Okul ortalaması (varsayılan). */
  sinavParcasi?: "yazili";
}

export interface SablonGrup {
  id: string;
  ad: string;
  /** Dönem notundaki yüzde (0..100). */
  yuzde: number;
  kalemler: SablonKalem[];
}

export interface PerformansSablonu {
  gruplar: SablonGrup[];
}

export const KAYNAK_BILGI: Record<KalemKaynak, { ad: string; aciklama: string }> = {
  katilim: { ad: "Ders içi (birleşik)", aciklama: "Olumlu ve olumsuz işaretler birlikte (eski birleşik kural)" },
  olumlu: { ad: "Olumlu davranışlar", aciklama: "Hızlı İşleme'de verdiğin ↑ işaretleri — hangi davranışların sayılacağını sen yazarsın" },
  davranis: { ad: "Olumsuz davranışlar", aciklama: "Hızlı İşleme'de verdiğin ↓ işaretleri — hangi davranışların sayılacağını sen yazarsın" },
  kitap: { ad: "Derse hazırlık (kitap)", aciklama: "Kitap / materyal getirmediği dersler" },
  devam: { ad: "Devam", aciklama: "Hızlı İşleme'deki “Yok” (derse gelmedi) işaretleri" },
  odev: { ad: "Ödev", aciklama: "Ödev Defteri ortalaması" },
  sinav: { ad: "Sınav", aciklama: "Yazılı ortalaması" },
  mebi: { ad: "MEBİ", aciklama: "Tamamlanan MEBİ etkinlik oranı" },
  elle: { ad: "Elle not", aciklama: "Notu öğretmen girer (proje, sunum, defter…)" },
};

export const YERLESIK_KAYNAKLAR: YerlesikKaynak[] = ["olumlu", "davranis", "kitap", "devam", "katilim", "odev", "sinav", "mebi"];

/** Her gün Hızlı İşleme'de işaretlenen kalemler (ekranda "Her gün" rozeti). */
export const GUNLUK_KAYNAKLAR: KalemKaynak[] = ["olumlu", "davranis", "kitap", "devam", "katilim"];
export function gunlukMu(k: KalemKaynak): boolean { return GUNLUK_KAYNAKLAR.includes(k); }
/** Ayarlanabilir günlük kalemler ve türleri: artı (yükseltir) / eksi (düşürür). */
export const AYARLI_KAYNAKLAR: Partial<Record<KalemKaynak, "arti" | "eksi">> = { olumlu: "arti", davranis: "eksi", kitap: "eksi", devam: "eksi" };

/** Yeni eklenen günlük kalemin önerilen kuralı. Kitap varsayılanı eski "getirdiği ders oranı"nın aynısı. */
export function varsayilanGunlukAyar(k: KalemKaynak): GunlukAyar | undefined {
  if (k === "olumlu") return { baslangic: 0, enDusuk: 0, olcut: "oran", deger: 25 };
  // OA76: olumsuz davranış kitap gibi SAF ORAN — olumsuz almadığı ders ÷ sayılan ders × 100.
  if (k === "davranis") return { baslangic: 100, enDusuk: 0, olcut: "oran", deger: 100 };
  if (k === "devam") return { baslangic: 100, enDusuk: 50, olcut: "oran", deger: 20 };
  if (k === "kitap") return { baslangic: 100, enDusuk: 0, olcut: "oran", deger: 100 };
  return undefined;
}

/** OA78: "Derse katılım" tam not sayılırken önerilen kural: ↑ aldığı ders ÷ işlenen ders × 100. */
export const TAM_KATILIM_AYARI: GunlukAyar = { baslangic: 0, enDusuk: 0, olcut: "oran", deger: 100 };

/** Günlük kalem puanı. `paydaDers`: öğrencinin sayılan ders sayısı (oran için), `isaretli`: işaret aldığı ders.
 *  Ders yoksa null (veri yok). SAF — testli. */
/** Kalem puanı, YUVARLANMADAN (nota giden hesap bunu kullanır). Denetim (2026-10): kalem 1 ondalığa,
 *  not tam sayıya yuvarlanınca bazı notlar 1 puan yukarı çıkıyordu (89,47 → 89,5 → 90). */
export function gunlukKalemPuaniHam(tur: "arti" | "eksi", ayar: GunlukAyar, paydaDers: number, isaretli: number): number | null {
  if (paydaDers <= 0) return null;
  if (ayar.olcut === "puan") {
    // OA55: "her − 10 puan" — sabit adım; artıda tavan 100, eksi kalemde en düşükte durur.
    const p = tur === "arti" ? Math.min(100, ayar.baslangic + ayar.deger * Math.max(0, isaretli)) : Math.max(ayar.enDusuk, ayar.baslangic - ayar.deger * Math.max(0, isaretli));
    return clamp(p);
  }
  const hedef = ayar.olcut === "adet" ? Math.max(1, ayar.deger) : Math.max(1e-9, (paydaDers * Math.max(1, ayar.deger)) / 100);
  const etki = Math.min(1, Math.max(0, isaretli) / hedef);
  const puan = tur === "arti" ? ayar.baslangic + (100 - ayar.baslangic) * etki : ayar.baslangic - (ayar.baslangic - ayar.enDusuk) * etki;
  return clamp(puan);
}

/** Ekranda gösterilen kalem puanı (1 ondalık). */
export function gunlukKalemPuani(tur: "arti" | "eksi", ayar: GunlukAyar, paydaDers: number, isaretli: number): number | null {
  const p = gunlukKalemPuaniHam(tur, ayar, paydaDers, isaretli);
  return p == null || !Number.isFinite(p) ? p : Math.round(p * 10) / 10;
}

/** Bir işaretin kalem puanını ortalama ne kadar oynattığı (ekranda "her − ≈ 10 puan"). */
export function isaretBasinaPuan(tur: "arti" | "eksi", ayar: GunlukAyar, paydaDers: number): number {
  const aralik = tur === "arti" ? 100 - ayar.baslangic : ayar.baslangic - ayar.enDusuk;
  if (ayar.olcut === "puan") return Math.min(ayar.deger, Math.max(0, aralik));
  const hedef = ayar.olcut === "adet" ? Math.max(1, ayar.deger) : Math.max(1, (paydaDers * Math.max(1, ayar.deger)) / 100);
  return Math.max(0, aralik) / hedef;
}

export function gunlukAyarHatasi(k: SablonKalem): string | null {
  const a = k.ayar; if (!a) return null;
  const ad = kalemAdi(k);
  const sayi = (x: number) => Number.isFinite(x) && x >= 0 && x <= 100;
  if (!sayi(a.baslangic)) return `“${ad}”: başlangıç puanı 0 ile 100 arasında olmalı.`;
  if (AYARLI_KAYNAKLAR[k.kaynak] === "eksi" && (!sayi(a.enDusuk) || a.enDusuk > a.baslangic)) return `“${ad}”: en düşük puan 0 ile başlangıç puanı arasında olmalı.`;
  if (a.olcut === "oran" && (!Number.isFinite(a.deger) || a.deger < 1 || a.deger > 100)) return `“${ad}”: yüzde 1 ile 100 arasında olmalı.`;
  if (a.olcut === "adet" && (!Number.isInteger(a.deger) || a.deger < 1 || a.deger > 500)) return `“${ad}”: işaret sayısı 1 ile 500 arasında tam sayı olmalı.`;
  if (a.olcut === "puan" && (!Number.isFinite(a.deger) || a.deger <= 0 || a.deger > 100)) return `“${ad}”: işaret başına puan 0'dan büyük, en fazla 100 olmalı.`;
  return null;
}

/** "Derse hazırlık (kitap)" kalemine sayılan durum ölçütü mü? Ada bakılır (öğretmen ölçütü
 *  adlandırır). Denetim (2026-10): JS'te /kitap/i "KİTAP"ı tanımıyordu (Türkçe İ) ve "materyal"
 *  adlı ölçüt hiç sayılmıyordu → Türkçe küçük harfe çevirip bakılır. */
export function kitapKriteriMi(ad: string): boolean {
  return /kita[pb]|materyal/.test(ad.toLocaleLowerCase("tr-TR")); // "kitabı" (ünsüz yumuşaması) da
}

export function kalemAdi(k: SablonKalem): string {
  const ad = (k.ad && k.ad.trim()) || KAYNAK_BILGI[k.kaynak].ad;
  return k.kaynak === "sinav" && k.sinavParcasi === "yazili" && !k.ad?.trim() ? `${ad} (yalnız Yazılı)` : ad;
}

/** Eski "dönem ağırlıkları"ndan (kriterGrubu → 0..1) tek gruplu şablon — notlar DEĞİŞMEZ. */
export function agirliklardanSablon(agirliklar: Array<{ kriterGrubu: string; agirlik: number }>): PerformansSablonu {
  const kalemler: SablonKalem[] = agirliklar
    .filter((a) => a.agirlik > 0 && (YERLESIK_KAYNAKLAR as string[]).includes(a.kriterGrubu))
    .map((a) => ({ id: a.kriterGrubu, kaynak: a.kriterGrubu as YerlesikKaynak, yuzde: Math.round(a.agirlik * 1000) / 10 }));
  return { gruplar: [{ id: "g1", ad: "Performans", yuzde: 100, kalemler }] };
}

/** Kalem başına dönem notundaki gerçek ağırlık (0..1) — eski ağırlık listesi biçiminde. */
export function etkinAgirliklar(s: PerformansSablonu): Array<{ kriterGrubu: string; agirlik: number }> {
  return s.gruplar.flatMap((g) => g.kalemler.map((k) => ({ kriterGrubu: k.id, agirlik: (g.yuzde / 100) * (k.yuzde / 100) })))
    .filter((a) => a.agirlik > 0);
}

const yuvarla = (x: number) => Math.round(x * 10) / 10;
const yaz = (x: number) => String(yuvarla(x)).replace(".", ",");

/** Şablon geçerli mi? Hata metni ya da null. */
export function sablonHatasi(s: PerformansSablonu): string | null {
  if (!s.gruplar.length) return "En az bir grup olmalı.";
  if (s.gruplar.length > 8) return "En fazla 8 grup olabilir.";
  const idler = new Set<string>();
  for (const g of s.gruplar) {
    const ad = g.ad.trim() || "Adsız grup";
    if (!g.ad.trim()) return "Her grubun bir adı olmalı.";
    if (!Number.isFinite(g.yuzde) || g.yuzde < 0 || g.yuzde > 100) return `“${ad}” grubunun yüzdesi 0 ile 100 arasında olmalı.`;
    if (!g.kalemler.length) return `“${ad}” grubunda kalem yok — kalem ekle ya da grubu sil.`;
    for (const k of g.kalemler) {
      if (idler.has(k.id)) return `“${kalemAdi(k)}” şablonda iki kez var.`;
      idler.add(k.id);
      if (k.kaynak === "elle" && !(k.ad ?? "").trim()) return "Elle not kaleminin bir adı olmalı (ör. Proje).";
      const ah = gunlukAyarHatasi(k); if (ah) return ah;
      if (!Number.isFinite(k.yuzde) || k.yuzde < 0 || k.yuzde > 100) return `“${kalemAdi(k)}” yüzdesi 0 ile 100 arasında olmalı.`;
    }
    const kt = g.kalemler.reduce((t, k) => t + k.yuzde, 0);
    if (Math.abs(kt - 100) > 0.05) return `“${ad}” içindeki kalemlerin toplamı %100 olmalı (şu an %${yaz(kt)}).`;
  }
  const gt = s.gruplar.reduce((t, g) => t + g.yuzde, 0);
  if (Math.abs(gt - 100) > 0.05) return `Grupların toplamı %100 olmalı (şu an %${yaz(gt)}).`;
  return null;
}

export interface KalemSonuc { id: string; ad: string; puan: number | null; /** grup içi yüzde (şablondaki) */ yuzde: number; /** verisi olanlar arasında gerçek grup içi pay (0..100) */ pay: number }
export interface GrupSonuc { id: string; ad: string; yuzde: number; puan: number | null; /** dönem notuna katkı (puan × gerçek grup payı) */ katki: number; pay: number; kalemler: KalemSonuc[] }
export interface SablonSonuc {
  /** Hiçbir kalemde veri yoksa null. */
  toplam: number | null;
  /** OA74: `toplam`ın yuvarlanmamış hâli (yıl sonu bununla hesaplanır; ekranda gösterilmez). */
  toplamHam?: number | null;
  gruplar: GrupSonuc[];
  /** Verisi olan kalemler: id → puan */
  kalemPuanlari: Record<string, number>;
  /** Şablonda olup bu öğrencide verisi olmayan kalemler */
  eksikKalemler: string[];
  /** OA76: olumlu kalem notu düşüreceği için hesaba katılmadı ("yalnız yükseltir"). */
  olumluSayilmadi?: boolean;
}

/** puanlar: kalem id → 0..100 ya da null (veri yok).
 *  OA76 (öğretmen kararı): "Olumlu davranışlar" kalemi notu YALNIZ YÜKSELTİR. Öğretmen sessiz/düzgün
 *  öğrenciye ↑ vermeyebilir; ↑ almamak ceza olmasın. Not olumlu kalemli ve kalemsiz hesaplanır,
 *  yüksek olan yazılır; kalemsiz kazanırsa `olumluSayilmadi` true olur (ekran "yükseltmediği için
 *  sayılmadı" der). */
export function sablonHesapla(s: PerformansSablonu, puanlar: Record<string, number | null | undefined>): SablonSonuc {
  const tam = sablonHesaplaHam(s, puanlar);
  // OA78: "tam sayılır" seçilmiş olumlu kalem normal kalem gibi hesaplanır; kural yalnız "yükseltir" olanlara.
  const yukseltir = (k: SablonKalem) => k.kaynak === "olumlu" && !k.tamSayilir;
  const olumluVar = s.gruplar.some((g) => g.kalemler.some((k) => yukseltir(k) && k.yuzde > 0 && puanlar[k.id] != null && Number.isFinite(puanlar[k.id] as number)));
  if (!olumluVar || tam.toplamHam == null) return tam;
  const olumsuz: PerformansSablonu = { gruplar: s.gruplar.map((g) => ({ ...g, kalemler: g.kalemler.filter((k) => !yukseltir(k)) })) };
  const alt = sablonHesaplaHam(olumsuz, puanlar);
  if (alt.toplamHam == null || alt.toplamHam <= tam.toplamHam + 1e-9) return tam;
  // Olumlu kalem notu düşürüyordu → sayılmaz. Kalem ekranda puanıyla görünsün (pay 0).
  const gruplar = alt.gruplar.map((g, gi) => {
    const asil = s.gruplar[gi];
    const ekler: KalemSonuc[] = asil.kalemler.filter(yukseltir).map((k) => {
      const p = puanlar[k.id];
      return { id: k.id, ad: kalemAdi(k), puan: p != null && Number.isFinite(p) ? clamp(p) : null, yuzde: k.yuzde, pay: 0 };
    });
    return ekler.length ? { ...g, kalemler: [...g.kalemler, ...ekler] } : g;
  });
  const kalemPuanlari = { ...alt.kalemPuanlari };
  for (const g of s.gruplar) for (const k of g.kalemler) if (yukseltir(k) && puanlar[k.id] != null && Number.isFinite(puanlar[k.id] as number)) kalemPuanlari[k.id] = clamp(puanlar[k.id] as number);
  return { ...alt, gruplar, kalemPuanlari, olumluSayilmadi: true };
}

function sablonHesaplaHam(s: PerformansSablonu, puanlar: Record<string, number | null | undefined>): SablonSonuc {
  const kalemPuanlari: Record<string, number> = {};
  const eksikKalemler: string[] = [];
  const gruplar: GrupSonuc[] = s.gruplar.map((g) => {
    const dolu = g.kalemler.filter((k) => puanlar[k.id] != null && Number.isFinite(puanlar[k.id] as number) && k.yuzde > 0);
    const kt = dolu.reduce((t, k) => t + k.yuzde, 0);
    const kalemler = g.kalemler.map((k): KalemSonuc => {
      const p = puanlar[k.id];
      const var_ = p != null && Number.isFinite(p);
      if (var_) kalemPuanlari[k.id] = clamp(p as number); else if (k.yuzde > 0) eksikKalemler.push(k.id);
      return { id: k.id, ad: kalemAdi(k), puan: var_ ? clamp(p as number) : null, yuzde: k.yuzde, pay: var_ && kt > 0 && k.yuzde > 0 ? (k.yuzde / kt) * 100 : 0 };
    });
    const puan = kt > 0 ? dolu.reduce((t, k) => t + clamp(puanlar[k.id] as number) * k.yuzde, 0) / kt : null;
    return { id: g.id, ad: g.ad, yuzde: g.yuzde, puan, katki: 0, pay: 0, kalemler };
  });
  const gt = gruplar.filter((g) => g.puan != null && g.yuzde > 0).reduce((t, g) => t + g.yuzde, 0);
  let toplam = 0;
  for (const g of gruplar) {
    if (g.puan == null || g.yuzde <= 0 || gt <= 0) continue;
    g.pay = (g.yuzde / gt) * 100;
    g.katki = g.puan * (g.yuzde / gt);
    toplam += g.katki;
  }
  return { toplam: gt > 0 ? notYuvarla(clamp(toplam)) : null, toplamHam: gt > 0 ? clamp(toplam) : null, gruplar, kalemPuanlari, eksikKalemler };
}

/** Performans Aktar'da "yalnız şu kalemler" seçimi: şablonu seçili kalemlerle daraltır
 *  (boşalan grup çıkar). Yüzdeler hesapta zaten oranla yeniden dağıtılır. */
export function sablonuDaralt(s: PerformansSablonu, kalemIdler?: string[]): PerformansSablonu {
  if (!kalemIdler?.length) return s;
  const sec = new Set(kalemIdler);
  return {
    gruplar: s.gruplar
      .map((g) => ({ ...g, kalemler: g.kalemler.filter((k) => sec.has(k.id)) }))
      .filter((g) => g.kalemler.length > 0),
  };
}

export function sablonKalemleri(s: PerformansSablonu): SablonKalem[] {
  return s.gruplar.flatMap((g) => g.kalemler);
}

/** Hazır şablonlar (Ayarlar'da tek tıkla). */
export const HAZIR_SABLONLAR: Record<"cizelge" | "sade" | "genis", { ad: string; sablon: PerformansSablonu }> = {
  cizelge: {
    ad: "Sınıf içi + Ödev (kâğıt çizelge)",
    sablon: { gruplar: [
      { id: "g1", ad: "Sınıf içi", yuzde: 70, kalemler: [{ id: "kitap", kaynak: "kitap", yuzde: 20 }, { id: "davranis", kaynak: "davranis", yuzde: 30 }, { id: "olumlu", kaynak: "olumlu", yuzde: 50 }] },
      { id: "g2", ad: "Ödev", yuzde: 30, kalemler: [{ id: "odev", kaynak: "odev", yuzde: 100 }] },
    ] },
  },
  sade: {
    ad: "Sade (Katılım + Davranış + Ödev)",
    sablon: { gruplar: [
      { id: "g1", ad: "Ders içi", yuzde: 60, kalemler: [{ id: "olumlu", kaynak: "olumlu", yuzde: 60 }, { id: "davranis", kaynak: "davranis", yuzde: 40 }] },
      { id: "g2", ad: "Ödev", yuzde: 40, kalemler: [{ id: "odev", kaynak: "odev", yuzde: 100 }] },
    ] },
  },
  genis: {
    ad: "Geniş (uygulamanın eski ayarı)",
    sablon: { gruplar: [{ id: "g1", ad: "Performans", yuzde: 100, kalemler: [
      { id: "katilim", kaynak: "katilim", yuzde: 25 }, { id: "odev", kaynak: "odev", yuzde: 25 }, { id: "sinav", kaynak: "sinav", yuzde: 20 },
      { id: "mebi", kaynak: "mebi", yuzde: 15 }, { id: "kitap", kaynak: "kitap", yuzde: 15 },
    ] }] },
  },
};

/** Saklanan (eski sürüm, elle bozulmuş olabilir) değeri güvenli şablona çevirir; geçersizse null. */
export function sablonNormallestir(v: unknown): PerformansSablonu | null {
  if (!v || typeof v !== "object" || !Array.isArray((v as PerformansSablonu).gruplar)) return null;
  const gruplar: SablonGrup[] = [];
  for (const g of (v as PerformansSablonu).gruplar) {
    if (!g || typeof g !== "object" || !Array.isArray(g.kalemler)) continue;
    const kalemler: SablonKalem[] = [];
    for (const k of g.kalemler) {
      if (!k || typeof k.id !== "string" || !(k.kaynak in KAYNAK_BILGI) || !Number.isFinite(k.yuzde)) continue;
      const a = k.ayar as Partial<GunlukAyar> | undefined;
      let ayar: GunlukAyar | undefined = a && AYARLI_KAYNAKLAR[k.kaynak as KalemKaynak] && (a.olcut === "oran" || a.olcut === "adet" || a.olcut === "puan")
        ? { baslangic: Number(a.baslangic), enDusuk: Number(a.enDusuk ?? 0), olcut: a.olcut, deger: Number(a.deger) } : undefined;
      // Denetim (2026-10): tek bir bozuk kural bütün şablonu (ve düzeni) düşürüyordu → yalnız o kural
      // düşer, kalem önerilen kuralla hesaplanır.
      if (ayar && gunlukAyarHatasi({ id: k.id, kaynak: k.kaynak, yuzde: 0, ayar })) ayar = undefined;
      kalemler.push({ id: k.id, kaynak: k.kaynak, yuzde: Number(k.yuzde), ...(typeof k.ad === "string" && k.ad.trim() ? { ad: k.ad.trim().slice(0, 40) } : {}), ...(ayar ? { ayar } : {}), ...(k.kaynak === "olumlu" && k.tamSayilir === true ? { tamSayilir: true } : {}), ...(k.kaynak === "sinav" && k.sinavParcasi === "yazili" ? { sinavParcasi: "yazili" as const } : {}) });
    }
    gruplar.push({ id: typeof g.id === "string" ? g.id : `g${gruplar.length + 1}`, ad: typeof g.ad === "string" ? g.ad.slice(0, 40) : "Grup", yuzde: Number(g.yuzde) || 0, kalemler });
  }
  const s = { gruplar };
  return sablonHatasi(s) ? null : s;
}

function clamp(x: number): number {
  return Math.min(100, Math.max(0, x));
}
