// core/rubrik.ts — Dereceli puanlama anahtarı (analitik rubrik) hesabı. SAF: UI ve DB bilmez.
//
// Öğretmen her ölçüt için bir düzey seçer; toplam 100'lük puana çevrilir.
// Çeviri tek formül (öğretmen yalnız "en düşük düzey kaç puan alsın" der):
//   ölçüt yüzdesi = taban + (100 − taban) × (düzey puanı − en düşük) / (en yüksek − en düşük)
//   toplam        = ölçüt yüzdelerinin AĞIRLIKLI ortalaması (ağırlık boşsa eşit)
// taban boşsa "düz oran" (en düşük/en yüksek × 100): 1–4 ölçeğinde taban 25 → 3 = 75, 2 = 50.
// taban 0 yazılırsa en düşük düzey 0 alır. Araştırma: plan notu (OA58) ve CLAUDE.md.
import type { RubrikOlcek, RubrikSablonu } from "@shared/types";

export const RUBRIK_EN_FAZLA_OLCUT = 10;
export const RUBRIK_EN_AZ_DUZEY = 2;
export const RUBRIK_EN_FAZLA_DUZEY = 6;

const yuvarla1 = (x: number) => Math.round(x * 10) / 10;

export function rubrikPuanAraligi(o: RubrikOlcek): { en: number; ek: number } {
  const p = o.duzeyler.map((d) => d.puan);
  return { en: Math.min(...p), ek: Math.max(...p) };
}

/** Taban (en düşük düzeyin 100'lük karşılığı) — boşsa düz oran. */
export function rubrikTabani(o: RubrikOlcek): number {
  if (typeof o.taban === "number" && Number.isFinite(o.taban)) return o.taban;
  const { en, ek } = rubrikPuanAraligi(o);
  return ek > 0 ? (100 * en) / ek : 0;
}

/** Ölçeğin kendi tutarlılığı: boşsa null, aksi hâlde Türkçe hata cümlesi. */
export function rubrikHatasi(o: RubrikOlcek): string | null {
  if (!o.ad.trim()) return "Ölçeğe bir ad yazın.";
  if (o.olcutler.length < 1) return "En az bir ölçüt gerekir.";
  if (o.olcutler.length > RUBRIK_EN_FAZLA_OLCUT) return `En çok ${RUBRIK_EN_FAZLA_OLCUT} ölçüt olabilir.`;
  if (o.olcutler.some((c) => !c.ad.trim())) return "Her ölçütün bir adı olmalı.";
  if (o.duzeyler.length < RUBRIK_EN_AZ_DUZEY || o.duzeyler.length > RUBRIK_EN_FAZLA_DUZEY) return `Düzey sayısı ${RUBRIK_EN_AZ_DUZEY}–${RUBRIK_EN_FAZLA_DUZEY} arasında olmalı.`;
  if (o.duzeyler.some((d) => !d.ad.trim())) return "Her düzeyin bir adı olmalı.";
  if (o.duzeyler.some((d) => !Number.isFinite(d.puan) || d.puan < 0 || d.puan > 100)) return "Düzey puanları 0–100 arasında bir sayı olmalı.";
  const puanlar = o.duzeyler.map((d) => d.puan);
  if (new Set(puanlar).size !== puanlar.length) return "İki düzeyin puanı aynı olamaz.";
  for (let i = 1; i < puanlar.length; i++) if (puanlar[i] >= puanlar[i - 1]) return "Düzeyler en yüksekten en düşüğe doğru sıralı olmalı.";
  if (puanlar[0] <= 0) return "En yüksek düzeyin puanı 0'dan büyük olmalı.";
  if (o.olcutler.some((c) => c.agirlik !== undefined && (!Number.isFinite(c.agirlik) || c.agirlik <= 0))) return "Ağırlık 0'dan büyük bir sayı olmalı (boş bırakılırsa eşit sayılır).";
  if (o.taban !== undefined && (!Number.isFinite(o.taban) || o.taban < 0 || o.taban >= 100)) return "En düşük düzeyin karşılığı 0 ile 99 arasında olmalı.";
  return null;
}

export interface RubrikSonucu {
  /** Ham toplam (ör. 13) ve en çok (ör. 16) — ağırlıksız, kâğıttaki "Toplam Puan". */
  toplam: number;
  enCok: number;
  /** 100'lük puan (tek ondalık) — ödev puanı olarak yazılan değer. */
  yuz: number;
  /** Ölçüt başına 100'lük karşılık. */
  olcutYuzleri: number[];
}

/** secim[i] = i. ölçüt için seçilen düzey sırası; eksik/geçersiz seçim varsa null (puan üretilmez). */
export function rubrikHesapla(o: RubrikOlcek, secim: ReadonlyArray<number | null | undefined> | undefined): RubrikSonucu | null {
  if (!secim || secim.length !== o.olcutler.length || rubrikHatasi(o)) return null;
  const { en, ek } = rubrikPuanAraligi(o);
  const taban = rubrikTabani(o);
  let toplam = 0;
  let agToplam = 0;
  let agPuan = 0;
  const olcutYuzleri: number[] = [];
  for (let i = 0; i < o.olcutler.length; i++) {
    const j = secim[i];
    if (typeof j !== "number" || !Number.isInteger(j) || j < 0 || j >= o.duzeyler.length) return null;
    const p = o.duzeyler[j].puan;
    const yuzde = taban + (100 - taban) * ((p - en) / (ek - en));
    const w = o.olcutler[i].agirlik ?? 1;
    toplam += p;
    agToplam += w;
    agPuan += w * yuzde;
    olcutYuzleri.push(yuvarla1(yuzde));
  }
  return { toplam, enCok: ek * o.olcutler.length, yuz: yuvarla1(agPuan / agToplam), olcutYuzleri };
}

/** Kayıtlı puan, seçimden hesaplanan puanla aynı mı? Değilse puan sonradan başka yerden (telefon/elle) değişmiştir. */
export function rubrikSecimiGuncelMi(o: RubrikOlcek, secim: number[] | undefined, puan: unknown): boolean {
  const s = rubrikHesapla(o, secim);
  return !!s && typeof puan === "number" && Math.abs(s.yuz - puan) < 0.05;
}

/** Bozuk/elle düzenlenmiş yedekten gelen ölçeği güvenli hâle getirir; kurtarılamazsa undefined. */
export function rubrikNormallestir(ham: unknown): RubrikOlcek | undefined {
  if (!ham || typeof ham !== "object") return undefined;
  const h = ham as Partial<RubrikOlcek>;
  if (!Array.isArray(h.olcutler) || !Array.isArray(h.duzeyler)) return undefined;
  const sayi = (v: unknown): number | undefined => (typeof v === "number" && Number.isFinite(v) ? v : undefined);
  const o: RubrikOlcek = {
    ad: typeof h.ad === "string" ? h.ad : "Dereceli puanlama",
    olcutler: h.olcutler.map((c) => ({ ad: typeof c?.ad === "string" ? c.ad : "", agirlik: sayi(c?.agirlik) })),
    duzeyler: h.duzeyler.map((d) => ({ ad: typeof d?.ad === "string" ? d.ad : "", puan: sayi(d?.puan) ?? NaN })),
    aciklamalar: h.olcutler.map((_, i) => h.duzeyler!.map((__, j) => {
      const satir = Array.isArray(h.aciklamalar) ? h.aciklamalar[i] : undefined;
      return Array.isArray(satir) && typeof satir[j] === "string" ? satir[j] : "";
    })),
    taban: sayi(h.taban),
  };
  return rubrikHatasi(o) ? undefined : o;
}

/** Seçim dizisi ölçeğe uyuyor mu (ölçüt sayısı, düzey sınırı)? Bozuksa undefined. */
export function rubrikSecimiNormallestir(o: RubrikOlcek, secim: unknown): number[] | undefined {
  if (!Array.isArray(secim) || secim.length !== o.olcutler.length) return undefined;
  return secim.every((j) => Number.isInteger(j) && j >= 0 && j < o.duzeyler.length) ? (secim as number[]) : undefined;
}

// ─── Hazır ölçekler (öğretmen düzenleyebilir; bunlar yalnız örnek) ───────────

const DUZEY_4 = [
  { ad: "Çok İyi", puan: 4 },
  { ad: "İyi", puan: 3 },
  { ad: "Orta", puan: 2 },
  { ad: "Geliştirilebilir", puan: 1 },
];

/** Kullanıcının gönderdiği "Gelişmiş Dereceli Puanlama Anahtarı" örneği (rapor/poster ödevi). */
export const HAZIR_RUBRIK_RAPOR: RubrikOlcek = {
  ad: "Rapor / proje ödevi (örnek)",
  olcutler: [{ ad: "İçerik" }, { ad: "Günlük hayat bağlamı" }, { ad: "Görsellik" }, { ad: "Zamanın etkili kullanımı" }],
  duzeyler: DUZEY_4.map((d) => ({ ...d })),
  aciklamalar: [
    [
      "Raporda konunun bütün temel kavramlarına yer verilmiştir.",
      "Raporda konunun bazı temel kavramlarına yer verilmiştir.",
      "Raporda konunun temel kavramlarından birine yer verilmiştir.",
      "Raporda konunun temel kavramlarına yer verilmemiştir.",
    ],
    [
      "Konunun temel kavramlarının tümü günlük hayat örnekleri ile ilişkilendirilmiştir.",
      "Konunun temel kavramlarının birçoğu günlük hayat örnekleri ile ilişkilendirilmiştir.",
      "Konunun temel kavramlarından çok azı günlük hayat örnekleri ile ilişkilendirilmiştir.",
      "Konunun temel kavramları günlük hayat örnekleri ile ilişkilendirilmemiştir.",
    ],
    [
      "Raporda renk, desen, doku gibi görsel unsurlar kullanılmış ve estetik ögelere yer verilmiştir.",
      "Raporda renk, desen, doku gibi görsel unsurlar kısmen kullanılmış ve estetik ögelere yer verilmiştir.",
      "Raporda renk, desen, doku gibi görsel unsurlar içerikle uyumlu değildir; estetik ögelere yer verilmemiştir.",
      "Raporda renk, desen, doku gibi görsel unsurlar kullanılmamış ve estetik ögelere yer verilmemiştir.",
    ],
    [
      "Rapor hazırlama görevi için verilen süre etkili bir şekilde kullanılmıştır.",
      "Rapor hazırlama görevi için verilen süre kısmen etkili bir şekilde kullanılmıştır.",
      "Rapor hazırlama görevi için verilen süre etkili bir şekilde kullanılamamış; broşür veya poster geç teslim edilmiştir.",
      "Rapor hazırlama görevi için verilen süre çok aşılmıştır.",
    ],
  ],
};

/** Her ödeve uyan sade ölçek (öğretmen ölçüt adlarını kendisi yazar). */
export const HAZIR_RUBRIK_GENEL: RubrikOlcek = {
  ad: "Genel ödev (örnek)",
  olcutler: [{ ad: "İçerik" }, { ad: "Düzen ve temizlik" }, { ad: "Zamanında teslim" }],
  duzeyler: DUZEY_4.map((d) => ({ ...d })),
  aciklamalar: [0, 1, 2].map(() => ["", "", "", ""]),
};

export const HAZIR_RUBRIKLER: RubrikOlcek[] = [HAZIR_RUBRIK_RAPOR, HAZIR_RUBRIK_GENEL];

export function rubrikKopyala(o: RubrikOlcek): RubrikOlcek {
  return JSON.parse(JSON.stringify(o)) as RubrikOlcek;
}

export type { RubrikSablonu };
