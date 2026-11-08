// Coğrafya şekilleri: ortak veri biçimi + "şema". Her yapı (harita, izohips, jeoloji blokları, iklim
// grafikleri, Dünya–Güneş şemaları) kendi ayar alanlarını burada bildirir; varsayılan değerler,
// doğrulama (tür + aralık) ve panel (otomatik form) bu tek tablodan gelir.

export type CografyaYapi =
  | "harita" | "izohips" | "horstGraben" | "antiklinal" | "senklinal"
  | "walter" | "piramit" | "mevsim" | "aydinlanma";

export type AyarDegeri = number | boolean | string | number[];

export type CografyaVerisi = { tur: "cografya"; yapi: CografyaYapi; ayar: Record<string, AyarDegeri> };

export type Alan =
  | { k: "sayi"; a: string; ad: string; min: number; max: number; adim?: number; v: number }
  | { k: "mantik"; a: string; ad: string; v: boolean }
  | { k: "sec"; a: string; ad: string; sec: readonly (readonly [string, string])[]; v: string }
  | { k: "metin"; a: string; ad: string; en: number; v: string; desen?: RegExp; ipucu?: string }
  | { k: "sayilar"; a: string; ad: string; n: number; min: number; max: number; v: number[] };

const AY = ["O", "Ş", "M", "N", "M", "H", "T", "A", "E", "E", "K", "A"];
export const AY_KISA = AY;

export const SEMA: Record<CografyaYapi, { ad: string; alt: string; alanlar: Alan[] }> = {
  harita: {
    ad: "Türkiye haritası", alt: "Coğrafya – Harita",
    alanlar: [
      { k: "mantik", a: "iller", ad: "İl sınırları", v: true },
      { k: "mantik", a: "nehir", ad: "Nehirler", v: false },
      { k: "mantik", a: "gol", ad: "Göller", v: false },
      { k: "mantik", a: "plaka", ad: "Tüm plaka no", v: false },
      { k: "mantik", a: "deniz", ad: "Deniz adları", v: true },
      { k: "mantik", a: "adlar", ad: "İşaretli il adı", v: false },
      { k: "sec", a: "etiket", ad: "İşaret", sec: [["harf", "A, B, C"], ["sayi", "1, 2, 3"], ["yok", "Yok"]], v: "harf" },
      { k: "sec", a: "dolgu", ad: "Dolgu", sec: [["gri", "Gri"], ["tarama", "Tarama"]], v: "gri" },
      { k: "metin", a: "isaret", ad: "İşaretli iller (plaka no)", en: 60, v: "34, 6, 35", desen: /^[0-9, ]*$/, ipucu: "Örn: 34, 6, 35 (İstanbul, Ankara, İzmir)" },
    ],
  },
  izohips: {
    ad: "Eş yükselti (izohips)", alt: "Coğrafya – İzohips",
    alanlar: [
      { k: "sec", a: "arazi", ad: "Arazi", sec: [["tepe", "Tepe"], ["ikiTepe", "İki tepe"], ["vadi", "Vadi"], ["sirt", "Sırt"], ["boyun", "Boyun"], ["yamac", "Yamaç"]], v: "tepe" },
      { k: "sayi", a: "aralik", ad: "Eğri aralığı (m)", min: 5, max: 500, v: 50 },
      { k: "sayi", a: "yukseklik", ad: "En yüksek nokta (m)", min: 50, max: 5000, v: 400 },
      { k: "mantik", a: "yaz", ad: "Yükseklik yaz", v: true },
      { k: "mantik", a: "zirve", ad: "Zirve işareti", v: true },
      { k: "mantik", a: "profil", ad: "A–B profili", v: false },
    ],
  },
  horstGraben: {
    ad: "Horst – Graben", alt: "Coğrafya – Jeoloji blokları",
    alanlar: [
      { k: "sayi", a: "katman", ad: "Katman", min: 1, max: 5, adim: 1, v: 3 },
      { k: "sayi", a: "atim", ad: "Fay atımı", min: 0.2, max: 4, adim: 0.1, v: 1.4 },
      { k: "sayi", a: "genislik", ad: "Graben genişliği", min: 1, max: 7, adim: 0.2, v: 3.6 },
      { k: "sayi", a: "egim", ad: "Fay eğimi", min: 0, max: 1.5, adim: 0.02, v: 0.18 },
      { k: "mantik", a: "ok", ad: "Fay okları", v: true },
      { k: "mantik", a: "yaz", ad: "Yazılar", v: true },
      { k: "sec", a: "renk", ad: "Boyama", sec: [["gri", "Gri (baskı)"], ["renkli", "Renkli"]], v: "gri" },
      { k: "metin", a: "adlar", ad: "Bloklar ve faylar (virgülle: sol, orta, sağ, sol fay, sağ fay)", en: 70, v: "Horst, Graben, Horst, Fay, Fay" },
    ],
  },
  antiklinal: {
    ad: "Antiklinal (dom kıvrım)", alt: "Coğrafya – Jeoloji blokları",
    alanlar: [
      { k: "sayi", a: "katman", ad: "Katman", min: 2, max: 5, adim: 1, v: 4 },
      { k: "sayi", a: "genlik", ad: "Kıvrım yüksekliği", min: 0.3, max: 3, adim: 0.1, v: 1.6 },
      { k: "sec", a: "yuzey", ad: "Üst yüzey", sec: [["duz", "Aşınmış (düz)"], ["kivrimli", "Kıvrımlı"]], v: "duz" },
      { k: "mantik", a: "eksen", ad: "Eksen düzlemi", v: true },
      { k: "mantik", a: "yaz", ad: "Yazılar", v: true },
      { k: "sec", a: "renk", ad: "Boyama", sec: [["gri", "Gri (baskı)"], ["renkli", "Renkli"]], v: "gri" },
      { k: "metin", a: "adlar", ad: "Yazılar (virgülle: kıvrım adı, eksen, kanat)", en: 60, v: "Antiklinal, Eksen, Kanat" },
    ],
  },
  senklinal: {
    ad: "Senklinal (çanak kıvrım)", alt: "Coğrafya – Jeoloji blokları",
    alanlar: [
      { k: "sayi", a: "katman", ad: "Katman", min: 2, max: 5, adim: 1, v: 4 },
      { k: "sayi", a: "genlik", ad: "Kıvrım derinliği", min: 0.3, max: 3, adim: 0.1, v: 1.6 },
      { k: "sec", a: "yuzey", ad: "Üst yüzey", sec: [["duz", "Aşınmış (düz)"], ["kivrimli", "Kıvrımlı"]], v: "duz" },
      { k: "mantik", a: "eksen", ad: "Eksen düzlemi", v: true },
      { k: "mantik", a: "yaz", ad: "Yazılar", v: true },
      { k: "sec", a: "renk", ad: "Boyama", sec: [["gri", "Gri (baskı)"], ["renkli", "Renkli"]], v: "gri" },
      { k: "metin", a: "adlar", ad: "Yazılar (virgülle: kıvrım adı, eksen, kanat)", en: 60, v: "Senklinal, Eksen, Kanat" },
    ],
  },
  walter: {
    ad: "Sıcaklık–yağış grafiği", alt: "Coğrafya – İklim",
    alanlar: [
      { k: "metin", a: "baslik", ad: "İstasyon / başlık", en: 30, v: "Ankara" },
      { k: "sayilar", a: "sicaklik", ad: "Aylık sıcaklık (°C), 12 değer (O…A)", n: 12, min: -50, max: 60, v: [0.1, 1.5, 5.6, 11.1, 15.8, 19.8, 23.2, 22.9, 18.7, 13.2, 7.1, 2.6] },
      { k: "sayilar", a: "yagis", ad: "Aylık yağış (mm), 12 değer", n: 12, min: 0, max: 1500, v: [34, 32, 34, 41, 47, 31, 14, 11, 17, 28, 31, 40] },
      { k: "mantik", a: "kuru", ad: "Kurak dönemi tara", v: true },
      { k: "mantik", a: "toplam", ad: "Ortalama / toplam yaz", v: true },
    ],
  },
  piramit: {
    ad: "Nüfus piramidi", alt: "Coğrafya – Nüfus",
    alanlar: [
      { k: "metin", a: "baslik", ad: "Başlık", en: 30, v: "Nüfus piramidi" },
      { k: "sayilar", a: "erkek", ad: "Erkek (%), 9 yaş grubu (0-9 … 80+)", n: 9, min: 0, max: 40, v: [7.9, 8.0, 8.2, 8.3, 7.3, 6.4, 4.6, 2.6, 1.0] },
      { k: "sayilar", a: "kadin", ad: "Kadın (%), 9 yaş grubu", n: 9, min: 0, max: 40, v: [7.5, 7.6, 7.8, 8.0, 7.2, 6.4, 4.9, 3.1, 1.6] },
      { k: "mantik", a: "deger", ad: "Değerleri yaz", v: true },
    ],
  },
  mevsim: {
    ad: "Mevsimler (Dünya'nın yörüngesi)", alt: "Coğrafya – Dünya ve Güneş",
    alanlar: [
      { k: "sec", a: "yarim", ad: "Yarımküre", sec: [["kuzey", "Kuzey"], ["guney", "Güney"]], v: "kuzey" },
      { k: "mantik", a: "tarih", ad: "Tarihler", v: true },
      { k: "mantik", a: "mevsimAd", ad: "Mevsim adları", v: true },
      { k: "mantik", a: "aci", ad: "23°27′ eksen eğikliği", v: true },
    ],
  },
  aydinlanma: {
    ad: "Aydınlanma çemberi", alt: "Coğrafya – Dünya ve Güneş",
    alanlar: [
      { k: "sec", a: "tarih", ad: "Tarih", sec: [["haziran", "21 Haziran"], ["aralik", "22 Aralık"], ["ekinoks", "21 Mart / 23 Eylül"]], v: "haziran" },
      { k: "mantik", a: "enlem", ad: "Özel enlem adları", v: true },
      { k: "mantik", a: "isin", ad: "Güneş ışınları", v: true },
      { k: "mantik", a: "yaz", ad: "Aydınlık / karanlık yazısı", v: true },
    ],
  },
};

export const COGRAFYA_YAPILARI = Object.keys(SEMA) as CografyaYapi[];

export function varsayilanCografya(yapi: CografyaYapi, ek: Record<string, AyarDegeri> = {}): CografyaVerisi {
  const ayar: Record<string, AyarDegeri> = {};
  for (const a of SEMA[yapi].alanlar) ayar[a.a] = Array.isArray(a.v) ? [...a.v] : a.v;
  return { tur: "cografya", yapi, ayar: { ...ayar, ...ek } };
}

/** Geçerli ayar değeri: yoksa/bozuksa varsayılanı döndürür (çizim kodu hep güvenli değer görsün). */
export function ayarSayi(v: CografyaVerisi, a: string): number {
  const al = SEMA[v.yapi].alanlar.find((x) => x.a === a);
  const d = v.ayar[a];
  const ok = al?.k === "sayi" ? al : null;
  if (typeof d === "number" && Number.isFinite(d) && ok) return Math.max(ok.min, Math.min(ok.max, d));
  return ok ? ok.v : 0;
}
export const ayarMantik = (v: CografyaVerisi, a: string): boolean => (typeof v.ayar[a] === "boolean" ? (v.ayar[a] as boolean) : !!(SEMA[v.yapi].alanlar.find((x) => x.a === a) as { v?: boolean } | undefined)?.v);
export function ayarSec(v: CografyaVerisi, a: string): string {
  const al = SEMA[v.yapi].alanlar.find((x) => x.a === a);
  const d = v.ayar[a];
  if (al?.k === "sec") return typeof d === "string" && al.sec.some(([k]) => k === d) ? d : al.v;
  return typeof d === "string" ? d : "";
}
export function ayarMetin(v: CografyaVerisi, a: string): string {
  const al = SEMA[v.yapi].alanlar.find((x) => x.a === a);
  const d = v.ayar[a];
  return typeof d === "string" ? d : al?.k === "metin" ? al.v : "";
}
export function ayarSayilar(v: CografyaVerisi, a: string): number[] {
  const al = SEMA[v.yapi].alanlar.find((x) => x.a === a);
  const d = v.ayar[a];
  if (al?.k !== "sayilar") return [];
  if (Array.isArray(d) && d.length === al.n && d.every((x) => typeof x === "number" && Number.isFinite(x))) return d.map((x) => Math.max(al.min, Math.min(al.max, x)));
  return [...al.v];
}

export function cografyaGecerliMi(g: Record<string, unknown>): boolean {
  if (g.tur !== "cografya" || typeof g.yapi !== "string" || !(g.yapi in SEMA)) return false;
  const sema = SEMA[g.yapi as CografyaYapi];
  const ayar = g.ayar;
  if (!ayar || typeof ayar !== "object" || Array.isArray(ayar)) return false;
  const a = ayar as Record<string, unknown>;
  if (Object.keys(a).some((k) => !sema.alanlar.some((al) => al.a === k))) return false; // bilinmeyen alan
  for (const al of sema.alanlar) {
    const d = a[al.a];
    if (d === undefined) continue; // eksik alan varsayılanla tamamlanır
    if (al.k === "sayi" && !(typeof d === "number" && Number.isFinite(d) && d >= al.min && d <= al.max)) return false;
    if (al.k === "mantik" && typeof d !== "boolean") return false;
    if (al.k === "sec" && !(typeof d === "string" && al.sec.some(([k]) => k === d))) return false;
    if (al.k === "metin" && !(typeof d === "string" && d.length <= al.en && (!al.desen || al.desen.test(d)))) return false;
    if (al.k === "sayilar" && !(Array.isArray(d) && d.length === al.n && d.every((x) => typeof x === "number" && Number.isFinite(x) && x >= al.min && x <= al.max))) return false;
  }
  return true;
}

/** Çizimde geçecek yazılar (kutu payı / dışa aktarım ölçümü için). */
export function cografyaYazilari(v: CografyaVerisi): string[] {
  return SEMA[v.yapi].alanlar.filter((a) => a.k === "metin").map((a) => ayarMetin(v, a.a)).flatMap((t) => t.split(","));
}
