// core/performansDuzeni.ts — SAF (UI yok, DB yok). Öğretmenin e-Okul'a vereceği
// PERFORMANS NOTLARININ düzeni (OA54, kullanıcıyla konuşularak):
//
// - Öğretmen 1, 2 ya da 3 performans notu (e-Okul sütunu) verir.
// - Her sütun ya KENDİ HESABIYLA gelir (kendi grupları/yüzdeleri — core/performansSablonu.ts)
//   ya da önceki bir sütunla AYNI NOTU alır ("tek hesap, iki sütuna aynı not").
// - Yönetmelik (Ortaöğretim Kurumları Yön. md. 50 uygulaması) iki puanın farklı
//   ölçütlere dayanmasını öngörür; uygulama bunu YALNIZ BİLGİ olarak gösterir, dayatmaz.
// - Öğrencinin "dönem performansı" (risk, rapor, öğrenci kartı) = sütun notlarının
//   ortalaması (e-Okul da performans notlarını ayrı ayrı ortalamaya katar).
import { notYuvarla, dortBasamak } from "@/core/notBasamak";
import {
  sablonHatasi, sablonNormallestir, sablonHesapla, varsayilanGunlukAyar, etkinAgirliklar,
  type PerformansSablonu, type SablonKalem, type SablonSonuc, type KalemKaynak,
} from "@/core/performansSablonu";

export const AZAMI_SUTUN = 3;

export interface PerformansSutunu {
  /** Verilirse bu sütun, o indeksteki (0 tabanlı, ÖNCEKİ) sütunun notunu aynen alır; `sablon` yok sayılır. */
  ayni?: number;
  sablon: PerformansSablonu;
}

export interface PerformansDuzeni {
  sutunlar: PerformansSutunu[];
}

export function sutunAdi(i: number): string { return `${i + 1}. Performans`; }

/** Eski tek şablondan düzen: tek sütun — güncellemede notlar ve Aktar davranışı DEĞİŞMEZ. */
export function sablondanDuzen(s: PerformansSablonu): PerformansDuzeni {
  return { sutunlar: [{ sablon: s }] };
}

/** Sütunun gerçekte kullandığı şablonun indeksi ("aynı not" zinciri çözülür). */
export function kaynakSutun(d: PerformansDuzeni, i: number): number {
  let j = i, adim = 0;
  while (d.sutunlar[j]?.ayni != null && adim++ < AZAMI_SUTUN) j = d.sutunlar[j].ayni!;
  return j;
}

export function sutunSablonu(d: PerformansDuzeni, i: number): PerformansSablonu {
  return d.sutunlar[kaynakSutun(d, i)]?.sablon ?? d.sutunlar[0].sablon;
}

/** Kendi hesabı olan sütunların tüm kalemleri (tekrarsız, sütun sırasıyla). */
export function duzenKalemleri(d: PerformansDuzeni): Array<SablonKalem & { sutun: number }> {
  const r: Array<SablonKalem & { sutun: number }> = [];
  const gorulen = new Set<string>();
  d.sutunlar.forEach((s, i) => {
    if (s.ayni != null) return;
    for (const g of s.sablon.gruplar) for (const k of g.kalemler) {
      if (gorulen.has(k.id)) continue;
      gorulen.add(k.id); r.push({ ...k, sutun: i });
    }
  });
  return r;
}

/** Kalem başına "ortalama" gerçek ağırlık (0..1): kendi hesabı olan sütunlar eşit sayılır,
 *  "aynı not" sütunu kaynağının ağırlığını bir kez daha taşır (e-Okul ortalamasıyla tutarlı). */
export function duzenEtkinAgirliklar(d: PerformansDuzeni): Array<{ kriterGrubu: string; agirlik: number }> {
  const n = d.sutunlar.length;
  const top = new Map<string, number>();
  d.sutunlar.forEach((_, i) => {
    for (const a of etkinAgirliklar(sutunSablonu(d, i))) top.set(a.kriterGrubu, (top.get(a.kriterGrubu) ?? 0) + a.agirlik / n);
  });
  return [...top].map(([kriterGrubu, agirlik]) => ({ kriterGrubu, agirlik })).filter((a) => a.agirlik > 0);
}

/** OA74 (öğretmen kararı): bir Performansa bağlanan (notNo) ödev o Performansa girebiliyor mu?
 *  - "yok": düzende o numarada Performans yok (ör. 1 Performanslı derste "2. Performans"),
 *  - "ayni": o Performans önceki bir Performansla "aynı not" — kendi hesabı/Ödev kalemi yok,
 *  - "odevKalemiYok": o Performansın hesabında (yüzdesi > 0) Ödev kalemi yok.
 *  Üçünde de ödev HİÇBİR Performansa sayılmaz (hesap: lib/ogrenciPerformans.ts::odevOrt100). Bağsız ödev → null. */
export type OdevBagSorunu = { tur: "yok"; performansSayisi: number } | { tur: "ayni"; kaynak: number } | { tur: "odevKalemiYok" };
export function odevBagSorunu(d: PerformansDuzeni, notNo: number | undefined | null): OdevBagSorunu | null {
  if (notNo == null) return null;
  const s = d.sutunlar[notNo - 1];
  if (!s || !Number.isInteger(notNo) || notNo < 1) return { tur: "yok", performansSayisi: d.sutunlar.length };
  if (s.ayni != null) return { tur: "ayni", kaynak: kaynakSutun(d, notNo - 1) + 1 };
  const odevVar = s.sablon.gruplar.some((g) => g.yuzde > 0 && g.kalemler.some((k) => k.kaynak === "odev" && k.yuzde > 0));
  return odevVar ? null : { tur: "odevKalemiYok" };
}

/** Kısa uyarı metni (Ödev Defteri ve Performans Ayarları aynı cümleyi kullanır; OA61 terimleri). */
export function odevBagSorunuMetni(s: OdevBagSorunu, notNo: number): string {
  if (s.tur === "yok") return `${notNo}. Performans bu dersin düzeninde yok (${s.performansSayisi} Performans var); bu ödev hiçbir Performansa sayılmaz. “Hepsine” ya da var olan bir Performansı seç.`;
  if (s.tur === "ayni") return `${notNo}. Performans, ${s.kaynak}. Performans ile aynı not olarak kurulu; kendi Ödev kalemi yok, bu ödev hiçbir Performansa sayılmaz. ${s.kaynak}. Performansı ya da “Hepsine”yi seç.`;
  return `${notNo}. Performans’ta “Ödev” kalemi yok; bu ödev hiçbir Performansa sayılmaz. Dönem sonu → Performans Ayarları’ndan Ödev kalemini ekle ya da başka bir Performans seç.`;
}

export function duzenHatasi(d: PerformansDuzeni): string | null {
  if (!d.sutunlar.length) return "En az bir Performans (1. Performans) olmalı.";
  if (d.sutunlar.length > AZAMI_SUTUN) return `En fazla ${AZAMI_SUTUN} Performans olabilir.`;
  for (let i = 0; i < d.sutunlar.length; i++) {
    const s = d.sutunlar[i];
    if (s.ayni != null) {
      if (i === 0) return "1. Performans kendi hesabıyla olmalı.";
      if (!Number.isInteger(s.ayni) || s.ayni < 0 || s.ayni >= i) return `${sutunAdi(i)} yalnız önceki bir performansla aynı olabilir.`;
      continue;
    }
    const h = sablonHatasi(s.sablon);
    if (h) return `${sutunAdi(i)}: ${h}`;
  }
  return null;
}

export function duzenNormallestir(v: unknown): PerformansDuzeni | null {
  if (!v || typeof v !== "object" || !Array.isArray((v as PerformansDuzeni).sutunlar)) return null;
  const sutunlar: PerformansSutunu[] = [];
  for (const [i, s] of (v as PerformansDuzeni).sutunlar.slice(0, AZAMI_SUTUN).entries()) {
    if (!s || typeof s !== "object") return null;
    if (i > 0 && Number.isInteger(s.ayni) && (s.ayni as number) >= 0 && (s.ayni as number) < i) {
      sutunlar.push({ ayni: s.ayni, sablon: sablonNormallestir(s.sablon) ?? sutunlar[s.ayni as number].sablon });
      continue;
    }
    const sablon = sablonNormallestir(s.sablon);
    if (!sablon) {
      // Denetim (2026-10): "aynı not" bağı bozuksa (ör. olmayan sütuna) bütün düzen atılmasın → 1. notla aynı.
      if (i > 0 && s.ayni != null) { sutunlar.push({ ayni: 0, sablon: sutunlar[0].sablon }); continue; }
      return null;
    }
    sutunlar.push({ sablon });
  }
  const d = { sutunlar };
  return duzenHatasi(d) ? null : d;
}

export interface SutunSonuc {
  no: number; ad: string; ayni?: number; sonuc: SablonSonuc;
  /** OA76: öğretmenin dönem sonunda olumlu davranış için eklediği puan (100 sınırıyla kırpılmış, etkin değer). */
  ogretmenEki?: number;
}
export interface DuzenSonuc {
  sutunlar: SutunSonuc[];
  /** Verisi olan sütun notlarının ortalaması (dönem performansı); hiç yoksa null. */
  ortalama: number | null;
  /** OA74: sütunların YUVARLANMAMIŞ hesaplarının ortalaması (4 basamak, MEB md. 51) — yıl sonu bununla hesaplanır. */
  ortalamaHam: number | null;
}

/** `kalemPuani`: kalem → 0..100 ya da null. Kalemin kuralı (ayar) kalemde durduğu için
 *  puan sütun sütun hesaplanır. */
export function duzenHesapla(d: PerformansDuzeni, kalemPuani: (k: SablonKalem, sutunNo: number) => number | null, ekler?: Partial<Record<number, number>>): DuzenSonuc {
  const onbellek = new Map<number, SablonSonuc>();
  const sutunlar = d.sutunlar.map((s, i): SutunSonuc => {
    const j = kaynakSutun(d, i);
    let sonuc = onbellek.get(j);
    if (!sonuc) {
      const sablon = d.sutunlar[j].sablon;
      const puanlar: Record<string, number | null> = {};
      for (const g of sablon.gruplar) for (const k of g.kalemler) puanlar[k.id] = kalemPuani(k, j + 1);
      sonuc = sablonHesapla(sablon, puanlar);
      onbellek.set(j, sonuc);
    }
    // OA76: öğretmen eki (olumlu davranış) — yalnız verisi olan nota, 100'ü geçmeden; önbellekteki sonuç değişmez.
    const ek = ekler?.[i + 1];
    if (ek && ek > 0 && sonuc.toplam != null) {
      const ham = sonuc.toplamHam ?? sonuc.toplam;
      const yeniHam = Math.min(100, ham + ek);
      const etkin = yeniHam - ham;
      if (etkin > 0) {
        return { no: i + 1, ad: sutunAdi(i), ...(s.ayni != null ? { ayni: s.ayni } : {}), ogretmenEki: etkin,
          sonuc: { ...sonuc, toplam: notYuvarla(yeniHam), toplamHam: yeniHam } };
      }
    }
    return { no: i + 1, ad: sutunAdi(i), ...(s.ayni != null ? { ayni: s.ayni } : {}), sonuc };
  });
  // Dönem performansı: e-Okul'a giden (yuvarlanmış) notların ortalaması. ortalamaHam: hiç yuvarlanmamış
  // sütun hesaplarının ortalaması (4 basamak) — yıl sonu bununla, yuvarlama yalnız en sonda (OA74 kuralı).
  const dolu = sutunlar.filter((s) => s.sonuc.toplam != null);
  const ort = (f: (s: SutunSonuc) => number) => dolu.reduce((a, s) => a + f(s), 0) / dolu.length;
  return {
    sutunlar,
    ortalama: dolu.length ? notYuvarla(ort((s) => s.sonuc.toplam!)) : null,
    ortalamaHam: dolu.length ? dortBasamak(ort((s) => s.sonuc.toplamHam ?? s.sonuc.toplam!)) : null,
  };
}

function k(kaynak: KalemKaynak, yuzde: number, ek: Partial<SablonKalem> = {}): SablonKalem {
  const ayar = varsayilanGunlukAyar(kaynak);
  return { id: kaynak, kaynak, yuzde, ...(ayar ? { ayar } : {}), ...ek };
}

/** Hazır düzenler (Ayarlar → Performans notu, tek tıkla). */
export const HAZIR_DUZENLER: Record<"onerilen" | "yonetmelik" | "tekHesap" | "cizelge" | "tek", { ad: string; aciklama: string; duzen: () => PerformansDuzeni }> = {
  /** OA76 (öğretmenle kararlaştırılan model): ödev ve sınav yüzdeyle; ders içi = kitap + olumsuz
   *  davranış, ikisi de ORAN (Derste yok günleri sayılmaz). Olumlu davranış nota girmez — dönem
   *  sonunda bilgi; öğretmen isterse kalem olarak ekler (yalnız yükseltir) ya da elle puan ekler. */
  onerilen: {
    ad: "Önerilen (2 Performans)",
    aciklama: "1. Performans: ödev %60, sınav %40. 2. Performans: ödev %40, sınav %30, ders içi %30 (kitap + olumsuz davranış).",
    duzen: () => ({ sutunlar: [
      { sablon: { gruplar: [
        { id: "g1", ad: "Ödev", yuzde: 60, kalemler: [k("odev", 100)] },
        { id: "g2", ad: "Sınav", yuzde: 40, kalemler: [k("sinav", 100)] },
      ] } },
      { sablon: { gruplar: [
        { id: "g1", ad: "Ödev", yuzde: 40, kalemler: [k("odev", 100)] },
        { id: "g2", ad: "Sınav", yuzde: 30, kalemler: [k("sinav", 100)] },
        { id: "g3", ad: "Ders içi", yuzde: 30, kalemler: [k("kitap", 50), k("davranis", 50)] },
      ] } },
    ] }),
  },
  yonetmelik: {
    ad: "Yönetmeliğe göre (2 Performans)",
    aciklama: "1. Performans: performans görevleri (ödev vb.). 2. Performans: derse hazırlık, devam, katılım ve davranış.",
    duzen: () => ({ sutunlar: [
      { sablon: { gruplar: [{ id: "g1", ad: "Performans görevleri", yuzde: 100, kalemler: [k("odev", 100)] }] } },
      { sablon: { gruplar: [{ id: "g1", ad: "Ders içi", yuzde: 100, kalemler: [k("kitap", 25), k("devam", 25), k("olumlu", 25), k("davranis", 25)] }] } },
    ] }),
  },
  tekHesap: {
    ad: "Tek hesap, 2 Performans aynı",
    aciklama: "Tek bir hesap kurulur; aynı not iki performans sütununa da yazılır.",
    duzen: () => ({ sutunlar: [
      { sablon: { gruplar: [
        { id: "g1", ad: "Ders içi", yuzde: 50, kalemler: [
          k("olumlu", 40, { ayar: { baslangic: 50, enDusuk: 0, olcut: "oran", deger: 25 } }), k("davranis", 30), k("kitap", 30)] },
        { id: "g2", ad: "Ödevler", yuzde: 50, kalemler: [k("odev", 100)] },
      ] } },
      { ayni: 0, sablon: { gruplar: [] } },
    ] }),
  },
  cizelge: {
    ad: "Kâğıt çizelge (1 Performans)",
    aciklama: "Sınıf içi %70 (kitap, davranış, katılım) + ödev %30.",
    duzen: () => ({ sutunlar: [
      { sablon: { gruplar: [
        { id: "g1", ad: "Sınıf içi", yuzde: 70, kalemler: [k("kitap", 20), k("davranis", 30), k("olumlu", 50, { ayar: { baslangic: 50, enDusuk: 0, olcut: "oran", deger: 25 } })] },
        { id: "g2", ad: "Ödev", yuzde: 30, kalemler: [k("odev", 100)] },
      ] } },
    ] }),
  },
  tek: {
    ad: "Sade başla (1 Performans, ödev)",
    aciklama: "Tek bir not, yalnız ödevle başlar; diğer kalemleri sen eklersin.",
    duzen: () => ({ sutunlar: [{ sablon: { gruplar: [{ id: "g1", ad: "Performans", yuzde: 100, kalemler: [k("odev", 100)] }] } }] }),
  },
};
