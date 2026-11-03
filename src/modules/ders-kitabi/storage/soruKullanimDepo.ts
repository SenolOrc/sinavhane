// Soru Havuzu'nun küçük metadata deposu. Kırpma görselleri ve PDF baytları
// kesinlikle burada tutulmaz; onlar kendi dosya/IndexedDB katmanlarında kalır.
const GECMIS_ANAHTARI = "ogretmen-asistani.ders-kitabi.soru-kullanim.v1";
const OZET_ANAHTARI = "ogretmen-asistani.ders-kitabi.soru-kullanim-ozet.v2";
const OLAY_ID_ANAHTARI = "ogretmen-asistani.ders-kitabi.soru-kullanim-olay-idleri.v1";
/** Ayrıntı geçmişi tavanı. Dışa açık: tam yedek birleştirmesi de aynı
 *  tavana uymak zorunda, yoksa birleşim depoya sığmayan bir liste üretir. */
export const AZAMI_GECMIS = 2_000;

export type SoruKullanimHedefi = "sinav" | "foy";
/** Yeni olay türleri eski kayıtları bozmadan eklenebilsin diye açık uçludur. */
export type SoruKullanimEylemi = "gonderildi" | "eklendi" | "yazdirildi" | (string & {});
export {
  soruHavuzMetalariniOku,
  soruHavuzMetasiniAyarla,
  type SoruHavuzMetasi,
  type SoruZorlugu,
} from "@/lib/soruRozetleri";
import {
  soruHavuzMetaSnapshotiAl,
  soruHavuzMetalariniSil,
  soruHavuzMetaSnapshotiniGeriYukle,
  type SoruHavuzMetasi,
} from "@/lib/soruRozetleri";

export interface SoruKullanimKaydi {
  kirpmaId: string;
  hedef: SoruKullanimHedefi;
  zaman: string;
  hedefId?: string;
  hedefAd?: string;
  eylem?: SoruKullanimEylemi;
  /** Crash sonrası aynı dış olayı tekrar işlerken sayacı ikinci kez artırmaz. */
  olayId?: string;
}

export interface SoruKullanimOzeti {
  toplam: number;
  sonKullanim: string;
  sonHedef: SoruKullanimHedefi;
  sonHedefId?: string;
  sonHedefAd?: string;
  sonEylem?: SoruKullanimEylemi;
}

function kayitMi(deger: unknown): deger is SoruKullanimKaydi {
  if (!deger || typeof deger !== "object") return false;
  const kayit = deger as Partial<SoruKullanimKaydi>;
  return typeof kayit.kirpmaId === "string"
    && (kayit.hedef === "sinav" || kayit.hedef === "foy")
    && typeof kayit.zaman === "string"
    && (kayit.hedefId === undefined || typeof kayit.hedefId === "string")
    && (kayit.hedefAd === undefined || typeof kayit.hedefAd === "string")
    && (kayit.eylem === undefined || typeof kayit.eylem === "string")
    && (kayit.olayId === undefined || typeof kayit.olayId === "string");
}

function varsayilanEylem(hedef: SoruKullanimHedefi): SoruKullanimEylemi {
  return hedef === "sinav" ? "gonderildi" : "eklendi";
}

function ozetiGuncelle(mevcut: SoruKullanimOzeti | undefined, kayit: SoruKullanimKaydi): SoruKullanimOzeti {
  const dahaYeni = !mevcut || kayit.zaman >= mevcut.sonKullanim;
  return {
    toplam: (mevcut?.toplam ?? 0) + 1,
    sonKullanim: dahaYeni ? kayit.zaman : mevcut.sonKullanim,
    sonHedef: dahaYeni ? kayit.hedef : mevcut.sonHedef,
    sonHedefId: dahaYeni ? kayit.hedefId : mevcut.sonHedefId,
    sonHedefAd: dahaYeni ? kayit.hedefAd : mevcut.sonHedefAd,
    sonEylem: dahaYeni ? (kayit.eylem ?? varsayilanEylem(kayit.hedef)) : mevcut.sonEylem,
  };
}

function ozetMi(deger: unknown): deger is SoruKullanimOzeti {
  if (!deger || typeof deger !== "object") return false;
  const aday = deger as Partial<SoruKullanimOzeti>;
  return Number.isInteger(aday.toplam) && (aday.toplam ?? 0) >= 0
    && typeof aday.sonKullanim === "string"
    && (aday.sonHedef === "sinav" || aday.sonHedef === "foy")
    && (aday.sonHedefId === undefined || typeof aday.sonHedefId === "string")
    && (aday.sonHedefAd === undefined || typeof aday.sonHedefAd === "string")
    && (aday.sonEylem === undefined || typeof aday.sonEylem === "string");
}

export function soruKullanimGecmisiOku(): SoruKullanimKaydi[] {
  try {
    const ham = localStorage.getItem(GECMIS_ANAHTARI);
    const deger: unknown = ham ? JSON.parse(ham) : [];
    return Array.isArray(deger) ? deger.filter(kayitMi) : [];
  } catch {
    return [];
  }
}

function ozetleriNesneOku(): Record<string, SoruKullanimOzeti> {
  try {
    const ham = localStorage.getItem(OZET_ANAHTARI);
    if (ham !== null) {
      const deger: unknown = JSON.parse(ham);
      if (deger && typeof deger === "object" && !Array.isArray(deger)) {
        return Object.fromEntries(Object.entries(deger).filter(([id, ozet]) => !!id && ozetMi(ozet)));
      }
    }
  } catch {
    // Bozuk özet aşağıda sınırlı ayrıntı geçmişinden bir kez yeniden kurulur.
  }
  const ozetler: Record<string, SoruKullanimOzeti> = {};
  for (const kayit of soruKullanimGecmisiOku()) ozetler[kayit.kirpmaId] = ozetiGuncelle(ozetler[kayit.kirpmaId], kayit);
  try {
    localStorage.setItem(OZET_ANAHTARI, JSON.stringify(ozetler));
  } catch {
    // İkincil kullanım bilgisi ana iş akışını engellememeli.
  }
  return ozetler;
}

function olayIdleriniOku(): Set<string> {
  const gecmisten = soruKullanimGecmisiOku().map((kayit) => kayit.olayId).filter((id): id is string => !!id);
  try {
    const ham = localStorage.getItem(OLAY_ID_ANAHTARI);
    const deger: unknown = ham ? JSON.parse(ham) : [];
    if (Array.isArray(deger)) {
      return new Set([...deger.filter((id): id is string => typeof id === "string" && !!id), ...gecmisten]);
    }
  } catch {
    // Eski/bozuk indeks görünür geçmişteki olay kimliklerinden yeniden kurulur.
  }
  return new Set(gecmisten);
}

function katmanlariKaydet(
  kayitlar: SoruKullanimKaydi[],
  ozetler: Record<string, SoruKullanimOzeti>,
  olayIdleri: ReadonlySet<string>,
): void {
  if (kayitlar.length) localStorage.setItem(GECMIS_ANAHTARI, JSON.stringify(kayitlar.slice(-AZAMI_GECMIS)));
  else localStorage.removeItem(GECMIS_ANAHTARI);
  localStorage.setItem(OZET_ANAHTARI, JSON.stringify(ozetler));
  if (olayIdleri.size) localStorage.setItem(OLAY_ID_ANAHTARI, JSON.stringify([...olayIdleri]));
  else localStorage.removeItem(OLAY_ID_ANAHTARI);
}

export function soruKullanimKaydet(
  kirpmaIdler: string[],
  hedef: SoruKullanimHedefi,
  ayrinti?: { hedefId?: string; hedefAd?: string; eylem?: SoruKullanimEylemi; olayId?: string },
): boolean {
  const benzersizIdler = [...new Set(kirpmaIdler.filter(Boolean))];
  if (!benzersizIdler.length) return true;
  const mevcutGecmis = soruKullanimGecmisiOku();
  const mevcutOlayIdleri = olayIdleriniOku();
  if (ayrinti?.olayId && mevcutOlayIdleri.has(ayrinti.olayId)) return true;
  const zaman = new Date().toISOString();
  const yeniKayitlar = benzersizIdler.map((kirpmaId): SoruKullanimKaydi => ({
    kirpmaId,
    hedef,
    zaman,
    hedefId: ayrinti?.hedefId,
    hedefAd: ayrinti?.hedefAd,
    eylem: ayrinti?.eylem ?? varsayilanEylem(hedef),
    olayId: ayrinti?.olayId,
  }));
  let oncekiGecmisHam: string | null = null;
  let oncekiOzetHam: string | null = null;
  let oncekiOlayIdHam: string | null = null;
  let snapshotAlindi = false;
  try {
    oncekiGecmisHam = localStorage.getItem(GECMIS_ANAHTARI);
    oncekiOzetHam = localStorage.getItem(OZET_ANAHTARI);
    oncekiOlayIdHam = localStorage.getItem(OLAY_ID_ANAHTARI);
    snapshotAlindi = true;
    const tumu = [...mevcutGecmis, ...yeniKayitlar].slice(-AZAMI_GECMIS);
    const ozetler = { ...ozetleriNesneOku() };
    for (const kayit of yeniKayitlar) ozetler[kayit.kirpmaId] = ozetiGuncelle(ozetler[kayit.kirpmaId], kayit);
    if (ayrinti?.olayId) mevcutOlayIdleri.add(ayrinti.olayId);
    katmanlariKaydet(tumu, ozetler, mevcutOlayIdleri);
    return true;
  } catch {
    try {
      if (!snapshotAlindi) return false;
      if (oncekiGecmisHam === null) localStorage.removeItem(GECMIS_ANAHTARI);
      else localStorage.setItem(GECMIS_ANAHTARI, oncekiGecmisHam);
      if (oncekiOzetHam === null) localStorage.removeItem(OZET_ANAHTARI);
      else localStorage.setItem(OZET_ANAHTARI, oncekiOzetHam);
      if (oncekiOlayIdHam === null) localStorage.removeItem(OLAY_ID_ANAHTARI);
      else localStorage.setItem(OLAY_ID_ANAHTARI, oncekiOlayIdHam);
    } catch {
      // Depo tamamen kapalıysa geri alma da best-effort kalır.
    }
    // İkincil geçmiş bilgisi ana iş akışını engellememeli.
    return false;
  }
}

export function soruKullanimOzetleriOku(): Map<string, SoruKullanimOzeti> {
  return new Map(Object.entries(ozetleriNesneOku()));
}

export interface SoruKullanimDepoSnapshoti {
  gecmis: SoruKullanimKaydi[];
  ozetler: Record<string, SoruKullanimOzeti>;
  /** Ayrıntı geçmişinin 2.000 satırlık tavanından bağımsız idempotency indeksi. */
  olayIdleri?: string[];
}

export function soruKullanimDeposuSnapshotiAl(): SoruKullanimDepoSnapshoti {
  return {
    gecmis: soruKullanimGecmisiOku(),
    ozetler: structuredClone(ozetleriNesneOku()),
    olayIdleri: [...olayIdleriniOku()],
  };
}

export function soruKullanimDeposunuGeriYukle(snapshot: SoruKullanimDepoSnapshoti): void {
  const olayIdleri = snapshot.olayIdleri ?? [
    ...olayIdleriniOku(),
    ...snapshot.gecmis.map((kayit) => kayit.olayId).filter((id): id is string => !!id),
  ];
  katmanlariKaydet(snapshot.gecmis, snapshot.ozetler, new Set(olayIdleri));
}

export interface SoruSilmeMetaSnapshoti {
  metalar: Record<string, SoruHavuzMetasi>;
  kullanimlar: SoruKullanimKaydi[];
  kullanimOzetleri: Record<string, SoruKullanimOzeti>;
}

export function soruSilmeMetaSnapshotiAl(kirpmaIdler: string[]): SoruSilmeMetaSnapshoti {
  const idler = new Set(kirpmaIdler);
  const tumOzetler = ozetleriNesneOku();
  return {
    metalar: soruHavuzMetaSnapshotiAl(kirpmaIdler),
    kullanimlar: soruKullanimGecmisiOku().filter((kayit) => idler.has(kayit.kirpmaId)),
    kullanimOzetleri: Object.fromEntries(Object.entries(tumOzetler).filter(([id]) => idler.has(id))),
  };
}

/** Meta ve kullanım geçmişini birlikte temizler. İkinci yazım başarısız olursa
 * ilk yazımı snapshot'tan geri alır; yarım temizlik/orphan bırakmaz. */
export function soruSilmeMetalariniTemizle(kirpmaIdler: string[], snapshot: SoruSilmeMetaSnapshoti): void {
  const oncekiKullanim = soruKullanimDeposuSnapshotiAl();
  const idler = new Set(kirpmaIdler);
  try {
    soruHavuzMetalariniSil(kirpmaIdler);
    soruKullanimDeposunuGeriYukle({
      gecmis: oncekiKullanim.gecmis.filter((kayit) => !idler.has(kayit.kirpmaId)),
      ozetler: Object.fromEntries(Object.entries(oncekiKullanim.ozetler).filter(([id]) => !idler.has(id))),
      olayIdleri: oncekiKullanim.olayIdleri ?? [],
    });
  } catch (err) {
    soruHavuzMetaSnapshotiniGeriYukle(snapshot.metalar);
    soruKullanimDeposunuGeriYukle(oncekiKullanim);
    throw err;
  }
}

export function soruSilmeMetaSnapshotiniGeriYukle(snapshot: SoruSilmeMetaSnapshoti): void {
  soruHavuzMetaSnapshotiniGeriYukle(snapshot.metalar);
  const mevcut = soruKullanimDeposuSnapshotiAl();
  const imzalar = new Set(mevcut.gecmis.map((kayit) => `${kayit.kirpmaId}|${kayit.hedef}|${kayit.zaman}|${kayit.hedefId ?? ""}`));
  const eklenecek = snapshot.kullanimlar.filter((kayit) => !imzalar.has(`${kayit.kirpmaId}|${kayit.hedef}|${kayit.zaman}|${kayit.hedefId ?? ""}`));
  soruKullanimDeposunuGeriYukle({
    gecmis: [...mevcut.gecmis, ...eklenecek].sort((a, b) => a.zaman.localeCompare(b.zaman)),
    ozetler: { ...mevcut.ozetler, ...snapshot.kullanimOzetleri },
    olayIdleri: mevcut.olayIdleri ?? [],
  });
}
