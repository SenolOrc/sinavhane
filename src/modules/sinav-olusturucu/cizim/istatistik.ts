// İstatistik grafikleri: sütun, çubuk, daire, çizgi, histogram (+ sıklık çokgeni),
// kutu grafiği, gövde-yaprak. Veri bir TABLO (`IstatistikVerisi`): satır = kategori,
// sütun = seri; öğretmen sayıları tabloya yazar (ya da Excel'den yapıştırır).
//
// Hesaplar (özet sayılar, çeyrekler, sınıflandırma) SAF ve testli; çizim onların
// üstünde ince katman. Varsayılan boyama SİYAH-BEYAZ (gri tonlar): sınav kâğıdı
// çoğu zaman siyah-beyaz basılır, renkler birbirinden ayırt edilemezdi.

import type { IstatistikTuru, IstatistikVerisi, Sekil } from "./tipler";
import { MUREKKEP } from "./sabitler";
import { fizikMetniCiz } from "./fizik";
import { eksenSayilari, guzelAdim, sayiYaz, sayiYazDuyarli } from "./grafik";

type FizikSekli = Extract<Sekil, { tur: "fizik" }>;

const GRI = ["#ffffff", "#9ca3af", "#e5e7eb", "#4b5563", "#d1d5db", "#6b7280"];
const RENKLI = ["#60a5fa", "#f87171", "#4ade80", "#fbbf24", "#a78bfa", "#fb923c"];
const renkAl = (i: number, renkli?: boolean) => (renkli ? RENKLI : GRI)[i % 6];

export const ISTATISTIK_TURLERI: { tur: IstatistikTuru; ad: string }[] = [
  { tur: "sutun", ad: "Sütun" },
  { tur: "cubuk", ad: "Çubuk (yatay)" },
  { tur: "daire", ad: "Daire" },
  { tur: "cizgi", ad: "Çizgi" },
  { tur: "histogram", ad: "Histogram" },
  { tur: "kutu", ad: "Kutu" },
  { tur: "govde", ad: "Gövde–yaprak" },
];

// ── Sınırlar ───────────────────────────────────────────────────────────────

/** Gövde–yaprak: en çok bu kadar gövde satırı (1000000000;5;6 gibi girdi sekmeyi dondurmasın). */
export const EN_COK_GOVDE_SATIRI = 200;
/** Ham veri satırında (kutu / gövde–yaprak) en çok değer sayısı. */
export const EN_COK_HAM_DEGER = 400;
/** Sütun / çubuk / daire / çizgi tablosunda gösterilen en çok satır. */
export const EN_COK_TABLO_SATIRI = 60;
/** Histogram: ham veriden en çok sınıf sayısı. */
export const EN_COK_SINIF = 40;
/** Giriş alanlarında başlık ve ad uzunlukları. */
export const EN_COK_BASLIK = 80;
export const EN_COK_AD = 40;
export const GOVDE_GENIS_UYARISI = `Değer aralığı çok geniş (en çok ${EN_COK_GOVDE_SATIRI} gövde satırı). Daha küçük sayılar yazın.`;

const enKucukEnBuyuk = (v: number[]): [number, number] => {
  let mn = Infinity, mx = -Infinity;
  for (const x of v) { if (x < mn) mn = x; if (x > mx) mx = x; }
  return [mn, mx];
};

/**
 * Gövde–yaprak için gövde satırı sayısı (gruplar ortak ölçekte). Sonlu hesaplanamıyorsa ya da
 * sınır aşılıyorsa Infinity döner — çizim/sınıflama ÖNCE bununla denetlenir (sınırsız döngü yok).
 */
export function govdeSatirSayisi(gruplar: number[][], birim?: number): number {
  const hepsi: number[] = [];
  for (const g of gruplar) for (const x of g) if (Number.isFinite(x)) hepsi.push(x);
  if (!hepsi.length) return 0;
  const b = birim ?? (hepsi.some((x) => !Number.isInteger(x)) ? 0.1 : 1);
  const [mn, mx] = enKucukEnBuyuk(hepsi);
  const g1 = Math.floor(Math.round(mn / b) / 10), g2 = Math.floor(Math.round(mx / b) / 10);
  if (!Number.isFinite(g1) || !Number.isFinite(g2)) return Infinity;
  return g2 - g1 + 1;
}

// ── Hesaplar ───────────────────────────────────────────────────────────────

const sirala = (v: number[]) => [...v].filter(Number.isFinite).sort((a, b) => a - b);

export function medyan(sirali: number[]): number {
  const n = sirali.length;
  if (!n) return NaN;
  return n % 2 ? sirali[(n - 1) / 2] : (sirali[n / 2 - 1] + sirali[n / 2]) / 2;
}

/**
 * Beş sayı özeti. Çeyrekler MEB yöntemiyle: veri ikiye bölünür (tek sayıda ise medyan
 * her iki yarıdan da dışarıda kalır), alt/üst yarının medyanı Q1/Q3 olur.
 * `uc`: 1,5·IQR dışındaki değerler (aykırı); bıyıklar bunların içindeki min/maks'a uzanır.
 */
export function besSayiOzeti(veri: number[]) {
  const v = sirala(veri);
  const n = v.length;
  if (!n) return null;
  const alt = v.slice(0, Math.floor(n / 2));
  const ust = v.slice(Math.ceil(n / 2));
  const q1 = alt.length ? medyan(alt) : v[0];
  const q3 = ust.length ? medyan(ust) : v[n - 1];
  const iqr = q3 - q1;
  const altSinir = q1 - 1.5 * iqr;
  const ustSinir = q3 + 1.5 * iqr;
  const ic = v.filter((x) => x >= altSinir && x <= ustSinir);
  return {
    min: v[0], q1, med: medyan(v), q3, max: v[n - 1], iqr,
    biyikAlt: ic[0] ?? v[0], biyikUst: ic[ic.length - 1] ?? v[n - 1],
    aykiri: v.filter((x) => x < altSinir || x > ustSinir),
  };
}

/**
 * Ortalama, ortanca (medyan), tepe değer(ler), açıklık, standart sapma.
 *
 * Standart sapma ÖRNEKLEM tanımıyla (payda n − 1) hesaplanır: MEB ortaöğretim
 * matematik programı s = √(Σ(xᵢ − x̄)² / (n − 1)) kullanır. Tek veride 0.
 *
 * Tepe değer: en çok tekrar eden değer(ler). Hiçbir değer tekrar etmiyorsa
 * (1, 2, 3) ya da birden fazla farklı değerin HEPSİ eşit sayıda tekrar
 * ediyorsa (10, 10, 20, 20, 30, 30) tepe değer yoktur → []. Tek farklı
 * değerden oluşan dizide (5, 5, 5) o değer en çok tekrar eden olduğundan
 * tepe değer 5 kabul edilir.
 */
export function ozetSayilar(veri: number[]) {
  const v = sirala(veri);
  const n = v.length;
  if (!n) return null;
  const ort = v.reduce((t, x) => t + x, 0) / n;
  const sayac = new Map<number, number>();
  for (const x of v) sayac.set(x, (sayac.get(x) ?? 0) + 1);
  let enCok = 0;
  for (const k of sayac.values()) if (k > enCok) enCok = k;
  const hepsiEsit = sayac.size > 1 && [...sayac.values()].every((k) => k === enCok);
  return {
    n, ortalama: ort, medyan: medyan(v), aciklik: v[n - 1] - v[0],
    tepe: enCok > 1 && !hepsiEsit ? [...sayac.entries()].filter(([, k]) => k === enCok).map(([x]) => x) : [],
    sapma: n > 1 ? Math.sqrt(v.reduce((t, x) => t + (x - ort) ** 2, 0) / (n - 1)) : 0,
  };
}

/** Ham veriden kaç sınıf çıkar (en çok EN_COK_SINIF'e izin verilir). Hesaplanamazsa Infinity. */
export function sinifSayisi(ham: number[], genislik: number, baslangic?: number): number {
  const v = sirala(ham);
  if (!v.length || !(genislik > 0)) return 0;
  const bas = baslangic ?? Math.floor(v[0] / genislik) * genislik;
  const sayi = Math.max(1, Math.ceil((v[v.length - 1] - bas) / genislik + 1e-9));
  return Number.isFinite(sayi) ? sayi : Infinity;
}

/** Ham veriden sınıflar: [bas, bas+genislik): alt sınır dahil, üst sınır hariç (30 değeri 30-40 sınıfına girer). */
export function siniflandir(ham: number[], genislik: number, baslangic?: number) {
  const v = sirala(ham);
  if (!v.length || !(genislik > 0)) return [];
  const bas = baslangic ?? Math.floor(v[0] / genislik) * genislik;
  const sayi = Math.max(1, Math.ceil((v[v.length - 1] - bas) / genislik + 1e-9));
  const siniflar = Array.from({ length: Math.min(sayi, 40) }, (_, i) => ({ ad: `${sayiYaz(bas + i * genislik)}-${sayiYaz(bas + (i + 1) * genislik)}`, v: [0] }));
  for (const x of v) {
    const i = Math.min(siniflar.length - 1, Math.max(0, Math.floor((x - bas) / genislik + 1e-9)));
    siniflar[i].v[0] += 1;
  }
  return siniflar;
}

/** Gövde–yaprak: birim 1 → gövde = onlar; 0,1 → gövde = tam kısım, yaprak = ondalık basamak. */
export function govdeYaprak(veri: number[], birim?: number) {
  const v = sirala(veri);
  const b = birim ?? (v.some((x) => !Number.isInteger(x)) ? 0.1 : 1);
  const bos = { birim: b, satirlar: [] as { govde: number; yapraklar: number[] }[], cokGenis: false };
  if (!v.length) return bos;
  // Önce aralığı denetle: sınır aşılırsa döngüye hiç girilmez (1000000000;5;6 sekmeyi dondurmasın).
  if (!(govdeSatirSayisi([v], b) <= EN_COK_GOVDE_SATIRI)) return { ...bos, cokGenis: true };
  const sonuc = new Map<number, number[]>();
  for (const x of v) {
    const t = Math.round(x / b); // birim cinsinden tam sayı
    const govde = Math.floor(t / 10);
    const yaprak = ((t % 10) + 10) % 10;
    const liste = sonuc.get(govde);
    if (liste) liste.push(yaprak); else sonuc.set(govde, [yaprak]);
  }
  let en = Infinity, cok = -Infinity;
  for (const g of sonuc.keys()) { if (g < en) en = g; if (g > cok) cok = g; }
  const satirlar: { govde: number; yapraklar: number[] }[] = [];
  for (let g = en; g <= cok; g += 1) satirlar.push({ govde: g, yapraklar: (sonuc.get(g) ?? []).sort((a, c) => a - c) });
  return { birim: b, satirlar, cokGenis: false };
}

/**
 * Tablo metnini (Excel/Sheets'ten yapıştırılan, sekme ya da ; ile ayrılmış) okur.
 * İlk satırın ilk sütunu sayı değilse ya da diğer hücreler sayı değilse başlık satırıdır.
 */
export function tabloOku(metin: string): { seriler: string[]; satirlar: { ad: string; v: number[] }[]; fazlaSatir: number; fazlaSeri: number } | null {
  const satirlar = metin.split(/\r?\n/).filter((s) => s.trim()).map((s) => s.split(/\t|;/).map((h) => h.trim()));
  if (satirlar.length < 1) return null;
  const sayi = (h: string) => h !== "" && Number.isFinite(Number(h.replace(",", ".")));
  const kolon = satirlar.reduce((m, s) => (s.length > m ? s.length : m), 0); // spread yok: çok satırlı yapıştırmada yığın taşmasın
  if (kolon < 2) return null;
  const baslikVar = satirlar.length > 1 && satirlar[0].slice(1).some((h) => !sayi(h));
  const seriler = baslikVar ? satirlar[0].slice(1) : Array.from({ length: kolon - 1 }, (_, i) => `Seri ${i + 1}`);
  const govde = baslikVar ? satirlar.slice(1) : satirlar;
  const sonuc = govde.slice(0, EN_COK_TABLO_SATIRI).map((s) => ({
    ad: (s[0] ?? "").slice(0, EN_COK_AD),
    v: Array.from({ length: Math.min(6, kolon - 1) }, (_, i) => (sayi(s[i + 1] ?? "") ? Number(s[i + 1].replace(",", ".")) : 0)),
  }));
  return {
    seriler: seriler.slice(0, 6).map((a) => a.slice(0, EN_COK_AD)),
    satirlar: sonuc,
    fazlaSatir: Math.max(0, govde.length - EN_COK_TABLO_SATIRI),
    fazlaSeri: Math.max(0, kolon - 1 - 6),
  };
}

// ── Varsayılan veriler / şablonlar ─────────────────────────────────────────

const base = (tur: IstatistikTuru): IstatistikVerisi => ({
  tur, seriler: ["Öğrenci sayısı"], satirlar: [], xEtiket: "", yEtiket: "", yazi: "deger", renkli: false, izgara: true,
});

export const varsayilanIstatistik = (): IstatistikVerisi => ({
  ...base("sutun"),
  satirlar: [{ ad: "Pzt", v: [12] }, { ad: "Sal", v: [18] }, { ad: "Çar", v: [9] }, { ad: "Per", v: [15] }, { ad: "Cum", v: [21] }],
  yEtiket: "Sayı",
});

export type IstatistikSablonu = { id: string; ad: string; ipucu: string; olustur: () => IstatistikVerisi };

export const ISTATISTIK_SABLONLARI: IstatistikSablonu[] = [
  { id: "sutun", ad: "Sütun", ipucu: "Dikey sütun grafiği", olustur: () => varsayilanIstatistik() },
  {
    id: "gruplu", ad: "Gruplu sütun", ipucu: "İki seri yan yana (örn. kız/erkek)",
    olustur: () => ({ ...base("sutun"), seriler: ["Kız", "Erkek"], satirlar: [{ ad: "9-A", v: [14, 11] }, { ad: "9-B", v: [10, 15] }, { ad: "9-C", v: [13, 12] }], yEtiket: "Öğrenci sayısı" }),
  },
  {
    id: "cubuk", ad: "Çubuk", ipucu: "Yatay çubuk grafiği",
    olustur: () => ({ ...base("cubuk"), satirlar: [{ ad: "Futbol", v: [40] }, { ad: "Basketbol", v: [25] }, { ad: "Voleybol", v: [20] }, { ad: "Yüzme", v: [15] }], yEtiket: "", xEtiket: "Öğrenci sayısı" }),
  },
  {
    id: "daire", ad: "Daire", ipucu: "Daire (pasta) grafiği; yüzde ya da değer yazılır",
    olustur: () => ({ ...base("daire"), yazi: "yuzde", satirlar: [{ ad: "Mavi", v: [40] }, { ad: "Yeşil", v: [25] }, { ad: "Kırmızı", v: [20] }, { ad: "Sarı", v: [15] }] }),
  },
  {
    id: "cizgi", ad: "Çizgi", ipucu: "Zamana göre değişim",
    olustur: () => ({ ...base("cizgi"), seriler: ["Sıcaklık (°C)"], satirlar: [{ ad: "Oca", v: [3] }, { ad: "Şub", v: [5] }, { ad: "Mar", v: [9] }, { ad: "Nis", v: [14] }, { ad: "May", v: [19] }, { ad: "Haz", v: [24] }], yEtiket: "°C", xEtiket: "Ay" }),
  },
  {
    id: "histogram", ad: "Histogram", ipucu: "Sınıf aralıkları ve sıklık; sıklık çokgeni eklenebilir",
    olustur: () => ({ ...base("histogram"), seriler: ["Sıklık"], satirlar: [{ ad: "0-10", v: [3] }, { ad: "10-20", v: [7] }, { ad: "20-30", v: [12] }, { ad: "30-40", v: [8] }, { ad: "40-50", v: [4] }], yEtiket: "Sıklık", xEtiket: "Not aralığı", cokgen: true }),
  },
  {
    id: "kutu", ad: "Kutu", ipucu: "Beş sayı özeti: min, Q1, ortanca, Q3, maks",
    olustur: () => ({ ...base("kutu"), seriler: ["Veri"], yazi: "deger", satirlar: [{ ad: "Sınıf A", v: [12, 15, 17, 18, 20, 22, 25, 26, 30, 41] }], xEtiket: "Not" }),
  },
  {
    id: "govde", ad: "Gövde–yaprak", ipucu: "Gövde–yaprak diyagramı (iki grup yan yana olabilir)",
    olustur: () => ({ ...base("govde"), seriler: ["Veri"], satirlar: [{ ad: "", v: [12, 15, 17, 21, 23, 23, 28, 31, 34, 35, 39, 42, 47] }] }),
  },
];

// ── Doğrulama ──────────────────────────────────────────────────────────────

const TURLER = ["sutun", "cubuk", "daire", "cizgi", "histogram", "kutu", "govde"];

export function istatistikVerisiGecerliMi(v: unknown): v is IstatistikVerisi {
  if (!v || typeof v !== "object") return false;
  const g = v as Record<string, unknown>;
  if (!TURLER.includes(String(g.tur))) return false;
  if (!Array.isArray(g.seriler) || g.seriler.length > 6 || !g.seriler.every((x) => typeof x === "string")) return false;
  if (!Array.isArray(g.satirlar) || g.satirlar.length > 80) return false;
  const ham = g.tur === "kutu" || g.tur === "govde";
  const okSatir = g.satirlar.every((r) => {
    if (!r || typeof r !== "object") return false;
    const s = r as { ad?: unknown; v?: unknown };
    return typeof s.ad === "string" && Array.isArray(s.v) && s.v.length <= (ham ? 400 : 6) && s.v.every((x) => typeof x === "number" && Number.isFinite(x));
  });
  if (!okSatir) return false;
  for (const a of ["yMax", "yAdim", "birim"]) {
    const x = g[a];
    if (x !== undefined && (typeof x !== "number" || !Number.isFinite(x) || x <= 0)) return false;
  }
  return true;
}

// ── Çizim ──────────────────────────────────────────────────────────────────

/** Yazıların kutunun dışına taşan payı (içerik sınırı ve yerleşim için). */
export function istatistikPayi() {
  return { sol: 66, ust: 52, sag: 104, alt: 54 };
}

function sar(metin: string, enCok: number): string {
  if (metin.length <= enCok || !metin.includes(" ")) return metin;
  const kelimeler = metin.split(" ");
  const satirlar: string[] = [];
  let simdiki = "";
  for (const k of kelimeler) {
    if (simdiki && (simdiki + " " + k).length > enCok) { satirlar.push(simdiki); simdiki = k; } else simdiki = simdiki ? simdiki + " " + k : k;
  }
  if (simdiki) satirlar.push(simdiki);
  return satirlar.join("\n");
}

function cizgi(ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number) {
  ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
}

type Alan = { x: number; y: number; w: number; h: number };

/** Değer ekseni: aralık ve adım (negatif değerler dahil). */
function degerEkseni(deger: number[], v: IstatistikVerisi) {
  const mx = Math.max(0, ...deger);
  const mn = Math.min(0, ...deger);
  const adim = v.yAdim && v.yAdim > 0 ? v.yAdim : guzelAdim((mx - mn) * 1.05 || 1, 6);
  const ustHam = v.yMax ?? Math.ceil(mx / adim - 1e-9) * adim;
  const ust = ustHam || adim;
  const alt = mn < 0 ? Math.floor(mn / adim + 1e-9) * adim : 0;
  return { alt, ust: ust > alt ? ust : alt + adim, adim };
}

export function istatistikCiz(ctx: CanvasRenderingContext2D, s: FizikSekli) {
  const ham = s.istatistik && istatistikVerisiGecerliMi(s.istatistik) ? s.istatistik : varsayilanIstatistik();
  // Tablo grafiklerinde en çok EN_COK_TABLO_SATIRI satır çizilir (1000 sütun/dilim okunmaz yığın olur).
  const v: IstatistikVerisi = ham.tur === "kutu" || ham.tur === "govde" || ham.satirlar.length <= EN_COK_TABLO_SATIRI
    ? ham : { ...ham, satirlar: ham.satirlar.slice(0, EN_COK_TABLO_SATIRI) };
  const kutu: Alan = { x: s.x, y: s.y, w: s.w, h: s.h };
  ctx.save();
  ctx.strokeStyle = MUREKKEP;
  ctx.fillStyle = MUREKKEP;
  ctx.lineWidth = Math.max(1.2, Math.min(2, s.kalinlik * 0.7));
  ctx.lineJoin = "round";
  ctx.setLineDash([]);
  if (v.tur === "daire") dairePasta(ctx, v, kutu);
  else if (v.tur === "kutu") kutuGrafigi(ctx, v, kutu);
  else if (v.tur === "govde") govdeGrafigi(ctx, v, kutu);
  else cubukCizgi(ctx, v, kutu);
  if (v.baslik?.trim() && !v.sade) fizikMetniCiz(ctx, v.baslik.trim(), kutu.x + kutu.w / 2, kutu.y - 36, 17, "orta", undefined, kutu.w + 120);
  ctx.restore();
}

function gosterge(ctx: CanvasRenderingContext2D, v: IstatistikVerisi, kutu: Alan) {
  if (v.seriler.length < 2) return;
  v.seriler.forEach((ad, i) => {
    const gy = kutu.y + 6 + i * 22;
    ctx.fillStyle = renkAl(i, v.renkli);
    ctx.fillRect(kutu.x + kutu.w + 12, gy, 14, 14);
    ctx.strokeStyle = MUREKKEP;
    ctx.strokeRect(kutu.x + kutu.w + 12, gy, 14, 14);
    fizikMetniCiz(ctx, ad, kutu.x + kutu.w + 32, gy + 7, 14, "sol", undefined, 70);
  });
  ctx.fillStyle = MUREKKEP;
}

/** Sütun / çubuk / çizgi / histogram: kategori ekseni + değer ekseni. */
function cubukCizgi(ctx: CanvasRenderingContext2D, v: IstatistikVerisi, k: Alan) {
  const yatay = v.tur === "cubuk";
  const hist = v.tur === "histogram";
  const cizgiGrafik = v.tur === "cizgi";
  const n = v.satirlar.length;
  const seriN = hist ? 1 : Math.max(1, v.seriler.length);
  const deger = v.satirlar.flatMap((r) => r.v.slice(0, seriN));
  const { alt, ust, adim } = degerEkseni(deger, v);
  const aralik = ust - alt;
  // Değer → koordinat
  const dKoor = (d: number) => (yatay ? k.x + ((d - alt) / aralik) * k.w : k.y + k.h - ((d - alt) / aralik) * k.h);
  const taban = dKoor(Math.max(alt, 0));
  const hucre = (yatay ? k.h : k.w) / Math.max(1, n);
  const kMerkez = (i: number) => (yatay ? k.y + hucre * (i + 0.5) : k.x + hucre * (i + 0.5));
  const dolu = hist ? 1 : cizgiGrafik ? 0 : 0.72;
  const barW = (hucre * dolu) / seriN;

  // Izgara + değer ekseni sayıları
  const sayilar = eksenSayilari(alt, ust, adim);
  ctx.save();
  for (const d of sayilar) {
    const c = dKoor(d);
    if (v.izgara && Math.abs(d) > 1e-9) {
      ctx.strokeStyle = "#d3dae3"; ctx.lineWidth = 0.8;
      if (yatay) cizgi(ctx, c, k.y, c, k.y + k.h); else cizgi(ctx, k.x, c, k.x + k.w, c);
    }
  }
  ctx.restore();

  // Çubuklar / çizgiler
  v.satirlar.forEach((r, i) => {
    for (let si = 0; si < seriN; si += 1) {
      const d = r.v[si] ?? 0;
      if (cizgiGrafik) continue;
      const c = kMerkez(i) - (hucre * dolu) / 2 + barW * si;
      ctx.fillStyle = renkAl(si, v.renkli);
      ctx.strokeStyle = MUREKKEP;
      ctx.lineWidth = 1.4;
      const dc = dKoor(d);
      if (yatay) { ctx.fillRect(taban, c, dc - taban, barW); ctx.strokeRect(taban, c, dc - taban, barW); }
      else { ctx.fillRect(c, Math.min(dc, taban), barW, Math.abs(taban - dc)); ctx.strokeRect(c, Math.min(dc, taban), barW, Math.abs(taban - dc)); }
    }
  });
  if (cizgiGrafik) {
    for (let si = 0; si < seriN; si += 1) {
      ctx.strokeStyle = v.renkli ? RENKLI[si % 6] : si === 0 ? MUREKKEP : GRI[3 + (si % 3)];
      ctx.lineWidth = 2;
      ctx.setLineDash(!v.renkli && si > 0 ? [6, 4] : []);
      ctx.beginPath();
      v.satirlar.forEach((r, i) => { const px = kMerkez(i), py = dKoor(r.v[si] ?? 0); if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py); });
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = v.renkli ? RENKLI[si % 6] : MUREKKEP;
      v.satirlar.forEach((r, i) => { ctx.beginPath(); ctx.arc(kMerkez(i), dKoor(r.v[si] ?? 0), 3.4, 0, Math.PI * 2); ctx.fill(); });
    }
  }
  // Sıklık çokgeni: bar merkezleri + her iki uçta sıfır sıklıklı (boş) sınıf
  if (hist && v.cokgen && n) {
    const nk: { x: number; y: number }[] = [{ x: kMerkez(-1), y: taban }];
    v.satirlar.forEach((r, i) => nk.push({ x: kMerkez(i), y: dKoor(r.v[0] ?? 0) }));
    nk.push({ x: kMerkez(n), y: taban });
    ctx.strokeStyle = MUREKKEP; ctx.lineWidth = 2; ctx.setLineDash([]);
    ctx.beginPath();
    nk.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
    ctx.stroke();
    ctx.fillStyle = MUREKKEP;
    nk.forEach((p) => { ctx.beginPath(); ctx.arc(p.x, p.y, 3, 0, Math.PI * 2); ctx.fill(); });
  }

  // Eksenler
  ctx.strokeStyle = MUREKKEP; ctx.fillStyle = MUREKKEP; ctx.lineWidth = 1.6;
  if (yatay) {
    cizgi(ctx, taban, k.y, taban, k.y + k.h);
    cizgi(ctx, k.x, k.y + k.h, k.x + k.w, k.y + k.h);
  } else {
    cizgi(ctx, k.x, k.y, k.x, k.y + k.h);
    cizgi(ctx, k.x, taban, k.x + k.w, taban);
  }
  // Değer ekseni sayıları
  ctx.lineWidth = 1.1;
  for (const d of sayilar) {
    const c = dKoor(d);
    if (yatay) { cizgi(ctx, c, k.y + k.h, c, k.y + k.h + 4); fizikMetniCiz(ctx, sayiYazDuyarli(d), c, k.y + k.h + 16, 14); }
    else { cizgi(ctx, k.x - 4, c, k.x, c); fizikMetniCiz(ctx, sayiYazDuyarli(d), k.x - 8, c, 14, "sag", undefined, 58); }
  }
  // Kategori adları
  const enCok = Math.max(4, Math.floor(hucre / 7));
  v.satirlar.forEach((r, i) => {
    const ad = sar(r.ad, enCok);
    if (yatay) fizikMetniCiz(ctx, ad, k.x - 8, kMerkez(i), 14, "sag", undefined, 58);
    else fizikMetniCiz(ctx, ad, kMerkez(i), k.y + k.h + 14 + (ad.includes("\n") ? 6 : 0), 14, "orta", undefined, Math.max(28, hucre * 0.98));
  });
  // Değer yazıları
  if (v.yazi === "deger") {
    v.satirlar.forEach((r, i) => {
      for (let si = 0; si < seriN; si += 1) {
        const d = r.v[si] ?? 0;
        const c = kMerkez(i) - (cizgiGrafik ? 0 : (hucre * dolu) / 2) + (cizgiGrafik ? 0 : barW * si + barW / 2);
        if (yatay) fizikMetniCiz(ctx, sayiYazDuyarli(d), dKoor(d) + 6, c, 13, "sol");
        else fizikMetniCiz(ctx, sayiYazDuyarli(d), c, dKoor(d) + (d >= 0 ? -10 : 12), 13, "orta", undefined, Math.max(28, hucre * 0.98));
      }
    });
  }
  // Eksen adları
  if (!v.sade) {
    if (v.yEtiket?.trim() && !yatay) fizikMetniCiz(ctx, v.yEtiket.trim(), k.x - 6, k.y - 17, 15, "sol", undefined, k.w + 60);
    if (v.xEtiket?.trim()) fizikMetniCiz(ctx, v.xEtiket.trim(), k.x + k.w / 2, k.y + k.h + 42, 15, "orta", undefined, k.w + 60);
    if (yatay && v.yEtiket?.trim()) fizikMetniCiz(ctx, v.yEtiket.trim(), k.x - 6, k.y - 17, 15, "sol", undefined, k.w + 60);
  }
  gosterge(ctx, v, k);
}

/** Daire grafiği: ilk seri; dilimler 12 yönünden saat yönünde. */
function dairePasta(ctx: CanvasRenderingContext2D, v: IstatistikVerisi, k: Alan) {
  const degerler = v.satirlar.map((r) => Math.max(0, r.v[0] ?? 0));
  const toplam = degerler.reduce((t, d) => t + d, 0);
  const cx = k.x + k.w / 2, cy = k.y + k.h / 2;
  const r = Math.min(k.w, k.h) / 2;
  if (!(toplam > 0)) {
    // Dilim yok (satır yok ya da değerlerin hepsi 0/negatif): boş daire yerine nedenini yaz.
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke();
    fizikMetniCiz(ctx, "Dilim yok: değerler pozitif olmalı", cx, cy, 14, "orta", undefined, r * 1.7);
    return;
  }
  let a0 = -Math.PI / 2;
  degerler.forEach((d, i) => {
    const a1 = a0 + (d / toplam) * Math.PI * 2;
    if (d > 0) {
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, r, a0, a1);
      ctx.closePath();
      ctx.fillStyle = renkAl(i, v.renkli);
      ctx.fill();
      ctx.strokeStyle = MUREKKEP;
      ctx.lineWidth = 1.6;
      ctx.stroke();
      // Etiket: dilimin dışında, ortası yönünde
      const am = (a0 + a1) / 2;
      const yuzde = (d / toplam) * 100;
      const ad = v.satirlar[i].ad.trim();
      const deger = v.yazi === "deger" ? sayiYazDuyarli(d) : v.yazi === "yuzde" ? `%${sayiYaz(Math.round(yuzde * 10) / 10)}` : "";
      const metin = [ad, deger].filter(Boolean).join("\n");
      if (metin) {
        const dx = Math.cos(am), dy = Math.sin(am);
        const lx = cx + dx * (r + 10);
        fizikMetniCiz(ctx, metin, lx, cy + dy * (r + 12 + Math.abs(dy) * 12), 14, Math.abs(dx) < 0.25 ? "orta" : dx > 0 ? "sol" : "sag", undefined, 96);
      }
    }
    a0 = a1;
  });
}

/** Kutu grafiği: her satır bir grup (ham veri); yatay sayı ekseni. */
function kutuGrafigi(ctx: CanvasRenderingContext2D, v: IstatistikVerisi, k: Alan) {
  const gruplar = v.satirlar.map((r) => ({ ad: r.ad, ozet: besSayiOzeti(r.v) })).filter((g) => g.ozet);
  if (!gruplar.length) return;
  const tum = gruplar.flatMap((g) => [g.ozet!.min, g.ozet!.max]);
  const [mn, mx] = enKucukEnBuyuk(tum);
  const adim = v.yAdim && v.yAdim > 0 ? v.yAdim : guzelAdim(mx - mn || 1, 8);
  const alt = Math.floor(mn / adim + 1e-9) * adim;
  const ust = Math.max(Math.ceil(mx / adim - 1e-9) * adim, alt + adim);
  const X = (d: number) => k.x + ((d - alt) / (ust - alt)) * k.w;
  const satirH = k.h / gruplar.length;
  // Eksen
  ctx.lineWidth = 1.6;
  cizgi(ctx, k.x, k.y + k.h, k.x + k.w, k.y + k.h);
  ctx.lineWidth = 1.1;
  for (const d of eksenSayilari(alt, ust, adim)) {
    cizgi(ctx, X(d), k.y + k.h, X(d), k.y + k.h + 4);
    fizikMetniCiz(ctx, sayiYazDuyarli(d), X(d), k.y + k.h + 16, 14);
    if (v.izgara) { ctx.strokeStyle = "#d3dae3"; ctx.lineWidth = 0.8; cizgi(ctx, X(d), k.y, X(d), k.y + k.h); ctx.strokeStyle = MUREKKEP; ctx.lineWidth = 1.1; }
  }
  gruplar.forEach((g, i) => {
    const o = g.ozet!;
    const cy = k.y + satirH * (i + 0.5);
    const bh = Math.min(46, satirH * 0.46);
    ctx.lineWidth = 1.8;
    ctx.fillStyle = renkAl(1, v.renkli);
    ctx.fillRect(X(o.q1), cy - bh / 2, X(o.q3) - X(o.q1), bh);
    ctx.strokeRect(X(o.q1), cy - bh / 2, X(o.q3) - X(o.q1), bh);
    ctx.lineWidth = 2.6;
    cizgi(ctx, X(o.med), cy - bh / 2, X(o.med), cy + bh / 2);
    ctx.lineWidth = 1.8;
    cizgi(ctx, X(o.biyikAlt), cy, X(o.q1), cy);
    cizgi(ctx, X(o.q3), cy, X(o.biyikUst), cy);
    cizgi(ctx, X(o.biyikAlt), cy - bh / 4, X(o.biyikAlt), cy + bh / 4);
    cizgi(ctx, X(o.biyikUst), cy - bh / 4, X(o.biyikUst), cy + bh / 4);
    ctx.fillStyle = MUREKKEP;
    for (const a of o.aykiri) { ctx.beginPath(); ctx.arc(X(a), cy, 3, 0, Math.PI * 2); ctx.fill(); }
    if (v.yazi === "deger") {
      for (const d of [o.biyikAlt, o.q1, o.med, o.q3, o.biyikUst]) fizikMetniCiz(ctx, sayiYazDuyarli(d), X(d), cy - bh / 2 - 9, 12);
    }
    if (g.ad.trim() && gruplar.length > 0) fizikMetniCiz(ctx, g.ad.trim(), k.x - 8, cy, 14, "sag", undefined, 58);
  });
  if (!v.sade && v.xEtiket?.trim()) fizikMetniCiz(ctx, v.xEtiket.trim(), k.x + k.w / 2, k.y + k.h + 40, 15, "orta", undefined, k.w + 60);
}

/** Gövde–yaprak: 1 grup → tek taraf; 2 grup → sırt sırta (ilki solda, ters sıralı). */
function govdeGrafigi(ctx: CanvasRenderingContext2D, v: IstatistikVerisi, k: Alan) {
  const gruplar = v.satirlar.slice(0, 2);
  if (!gruplar.length) return;
  // Gruplar ORTAK gövde ölçeğinde çizilir; aralık sınırı aşılıyorsa (1000000000;5;6) döngüye girilmez.
  if (!(govdeSatirSayisi(gruplar.map((g) => g.v), v.birim) <= EN_COK_GOVDE_SATIRI)) {
    fizikMetniCiz(ctx, "Değer aralığı çok geniş", k.x + k.w / 2, k.y + k.h / 2, 15, "orta", undefined, k.w);
    return;
  }
  const sonuclar = gruplar.map((g) => govdeYaprak(g.v, v.birim));
  const birim = sonuclar[0].birim;
  const tum = sonuclar.flatMap((s) => s.satirlar.map((r) => r.govde));
  if (!tum.length) return;
  const [en, cok] = enKucukEnBuyuk(tum);
  const satirH = 22;
  const iki = gruplar.length === 2;
  const govdeX = iki ? k.x + k.w / 2 : k.x + 46;
  ctx.fillStyle = MUREKKEP;
  ctx.lineWidth = 1.8;
  const ustY = k.y + 6;
  const altY = ustY + (cok - en + 1) * satirH;
  cizgi(ctx, govdeX + (iki ? 14 : 0), ustY - 4, govdeX + (iki ? 14 : 0), altY);
  if (iki) cizgi(ctx, govdeX - 14, ustY - 4, govdeX - 14, altY);
  if (!v.sade) {
    gruplar.forEach((g, gi) => {
      if (g.ad.trim()) fizikMetniCiz(ctx, g.ad.trim(), iki ? (gi === 0 ? govdeX - 60 : govdeX + 60) : govdeX, ustY - 18, 15, "orta", undefined, iki ? 110 : k.w);
    });
  }
  for (let g = en; g <= cok; g += 1) {
    const cy = ustY + (g - en + 0.5) * satirH;
    if (iki) fizikMetniCiz(ctx, String(g), govdeX, cy, 16);
    else fizikMetniCiz(ctx, String(g), govdeX - 8, cy, 16, "sag");
    sonuclar.forEach((s, gi) => {
      const satir = s.satirlar.find((r) => r.govde === g);
      if (!satir?.yapraklar.length) return;
      const yaz = satir.yapraklar.join(" ");
      if (iki && gi === 0) fizikMetniCiz(ctx, [...satir.yapraklar].reverse().join(" "), govdeX - 22, cy, 16, "sag");
      else fizikMetniCiz(ctx, yaz, govdeX + (iki ? 22 : 10), cy, 16, "sol");
    });
  }
  // Anahtar
  const anahtar = birim === 1 ? `Anahtar: 2 | 3 = 23` : birim === 0.1 ? `Anahtar: 2 | 3 = 2,3` : `Anahtar: 2 | 3 = 230`;
  if (!v.sade) fizikMetniCiz(ctx, anahtar, k.x, altY + 18, 14, "sol");
}
