// Merkezi Soru Rozetleri ve soru-bazli havuz metadata'si.
// PDF/gorsel tutmaz; yalnizca kucuk, yerel ayar ve atama kayitlarini saklar.

export type SoruZorlugu = "kolay" | "orta" | "zor";

export interface SoruRozeti {
  id: string;
  ad: string;
  renk: string;
  sira: number;
  aktif: boolean;
}

export interface SoruHavuzMetasi {
  zorluk?: SoruZorlugu;
  rozetIdler: string[];
  /** Test sorularının doğru şıkkı (A–E). Havuzda tutulur çünkü sorunun
   *  KENDİ özelliği: aynı soru başka sınavlara da gidince cevabı yeniden
   *  işaretlemek gerekmesin. Sınav Oluşturucu'ya aktarımla taşınır ve orada
   *  `SoruOgesi.dogruSik` olur; cevap anahtarı ondan üretilir. */
  dogruSik?: string;
  // Eski surumde karttan verilen favori bilgisi artik UI'da kullanilmaz; veri
  // kaybi yaratmamak icin migrasyonda korunur.
  favori?: boolean;
  // Bozuk/elle duzenlenmis eski kayitta birden cok zorluk bulunursa ham liste
  // burada korunur. Yeni model yine yalniz tek bir zorluk kullanir.
  legacyEtiketler?: string[];
}

export interface SoruRozetDepoSnapshoti {
  rozetler: SoruRozeti[];
  metalar: Record<string, SoruHavuzMetasi>;
}

const ROZET_ANAHTARI = "ogretmen-asistani.soru-rozetleri.v1";
const META_ANAHTARI = "ogretmen-asistani.ders-kitabi.soru-havuzu-meta.v1";
const META_SURUM_ANAHTARI = "ogretmen-asistani.ders-kitabi.soru-havuzu-meta-surum";
const ZORLUKLAR = new Set<SoruZorlugu>(["kolay", "orta", "zor"]);
const VARSAYILAN_RENKLER = ["#0ea5e9", "#8b5cf6", "#f97316", "#10b981", "#ef4444", "#64748b"];

function metinNormalle(deger: string): string {
  return deger.trim().replace(/\s+/g, " ").toLocaleLowerCase("tr");
}

function fnv1a(deger: string): string {
  let hash = 2166136261;
  for (let i = 0; i < deger.length; i += 1) {
    hash ^= deger.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

function legacyRozetId(ad: string): string {
  return `legacy-${fnv1a(metinNormalle(ad))}`;
}

function rozetMi(deger: unknown): deger is SoruRozeti {
  if (!deger || typeof deger !== "object") return false;
  const aday = deger as Partial<SoruRozeti>;
  return typeof aday.id === "string" && typeof aday.ad === "string"
    && typeof aday.renk === "string" && typeof aday.aktif === "boolean";
}

function rozetleriHamOku(): SoruRozeti[] {
  try {
    const ham = localStorage.getItem(ROZET_ANAHTARI);
    const deger: unknown = ham ? JSON.parse(ham) : [];
    if (!Array.isArray(deger)) return [];
    return deger.filter(rozetMi).map((rozet, index) => ({
      ...rozet,
      ad: rozet.ad.trim(),
      sira: Number.isFinite(rozet.sira) ? rozet.sira : index,
    })).filter((rozet) => !!rozet.ad);
  } catch {
    return [];
  }
}

function rozetleriKaydet(rozetler: SoruRozeti[]): void {
  const sirali = rozetler
    .map((rozet, sira) => ({ ...rozet, sira }))
    .sort((a, b) => a.sira - b.sira);
  localStorage.setItem(ROZET_ANAHTARI, JSON.stringify(sirali));
}

function eskiEtiketAdlariniOku(): string[] {
  try {
    const ham = localStorage.getItem(META_ANAHTARI);
    const deger: unknown = ham ? JSON.parse(ham) : {};
    if (!deger || typeof deger !== "object" || Array.isArray(deger)) return [];
    const adlar: string[] = [];
    for (const meta of Object.values(deger)) {
      if (!meta || typeof meta !== "object") continue;
      const etiketler = (meta as { etiketler?: unknown }).etiketler;
      if (!Array.isArray(etiketler)) continue;
      for (const etiket of etiketler) {
        if (typeof etiket === "string" && etiket.trim() && !ZORLUKLAR.has(metinNormalle(etiket) as SoruZorlugu)) {
          adlar.push(etiket.trim());
        }
      }
    }
    return [...new Map(adlar.map((ad) => [metinNormalle(ad), ad])).values()];
  } catch {
    return [];
  }
}

function ilkRozetleriOlustur(): SoruRozeti[] {
  const eskiAdlar = eskiEtiketAdlariniOku();
  // Onceki resmi kullanim etiketleri, hic atama olmasa da merkezi listede hazir
  // gelir. Eski surumde bulunabilecek diger serbest etiketler de kaybolmaz.
  const benzersiz = new Map<string, string>();
  for (const ad of ["Ödev", "Yazılı", ...eskiAdlar]) {
    const anahtar = metinNormalle(ad);
    if (!benzersiz.has(anahtar)) benzersiz.set(anahtar, ad);
  }
  const adlar = [...benzersiz.values()];
  return adlar.map((ad, sira) => ({
    id: legacyRozetId(ad),
    ad,
    renk: VARSAYILAN_RENKLER[sira % VARSAYILAN_RENKLER.length],
    sira,
    aktif: true,
  }));
}

export function soruRozetleriGetir(aktifYalniz = false): SoruRozeti[] {
  let rozetler = rozetleriHamOku();
  if (!rozetler.length && localStorage.getItem(ROZET_ANAHTARI) === null) {
    rozetler = ilkRozetleriOlustur();
    rozetleriKaydet(rozetler);
  }
  const sirali = [...rozetler].sort((a, b) => a.sira - b.sira);
  return aktifYalniz ? sirali.filter((rozet) => rozet.aktif) : sirali;
}

export function soruRozetiEkle(ad: string, renk: string): SoruRozeti {
  const temiz = ad.trim().replace(/\s+/g, " ");
  if (!temiz) throw new Error("Rozet adı gerekli.");
  const rozetler = soruRozetleriGetir();
  if (rozetler.some((rozet) => metinNormalle(rozet.ad) === metinNormalle(temiz))) {
    throw new Error("Bu adla bir soru rozeti zaten var.");
  }
  const yeni: SoruRozeti = { id: crypto.randomUUID(), ad: temiz, renk, sira: rozetler.length, aktif: true };
  rozetleriKaydet([...rozetler, yeni]);
  return yeni;
}

export function soruRozetiGuncelle(id: string, patch: Partial<Pick<SoruRozeti, "ad" | "renk" | "aktif">>): void {
  const rozetler = soruRozetleriGetir();
  const temizAd = patch.ad?.trim().replace(/\s+/g, " ");
  if (patch.ad !== undefined && !temizAd) throw new Error("Rozet adı boş olamaz.");
  if (temizAd && rozetler.some((rozet) => rozet.id !== id && metinNormalle(rozet.ad) === metinNormalle(temizAd))) {
    throw new Error("Bu adla bir soru rozeti zaten var.");
  }
  rozetleriKaydet(rozetler.map((rozet) => rozet.id === id ? { ...rozet, ...patch, ad: temizAd ?? rozet.ad } : rozet));
}

export function soruRozetiTasi(id: string, yon: -1 | 1): void {
  const rozetler = soruRozetleriGetir();
  const index = rozetler.findIndex((rozet) => rozet.id === id);
  const hedef = index + yon;
  if (index < 0 || hedef < 0 || hedef >= rozetler.length) return;
  [rozetler[index], rozetler[hedef]] = [rozetler[hedef], rozetler[index]];
  rozetleriKaydet(rozetler);
}

function metaHamOku(): Record<string, unknown> {
  try {
    const ham = localStorage.getItem(META_ANAHTARI);
    const deger: unknown = ham ? JSON.parse(ham) : {};
    return deger && typeof deger === "object" && !Array.isArray(deger) ? deger as Record<string, unknown> : {};
  } catch {
    return {};
  }
}

function metaKaydet(metalar: Record<string, SoruHavuzMetasi>): void {
  // "Anlamlı" süzgeci: hiçbir bilgi taşımayan kayıtlar depoyu şişirmesin.
  // YENİ ALAN EKLEYEN BURAYI DA GÜNCELLEMELİ — `dogruSik` eklendiğinde bu
  // satır unutuldu ve yalnızca doğru şıkkı işaretlenmiş bir soru kaydedilirken
  // SESSİZCE atıldı: modal kapanıyor, öğretmen işaretledim sanıyor, hiçbir şey
  // yazılmıyordu. tsc bunu görmez; ancak gerçek depoda ölçünce çıktı.
  const anlamli = Object.fromEntries(Object.entries(metalar).filter(([, meta]) =>
    !!meta.zorluk || meta.rozetIdler.length > 0 || !!meta.dogruSik || !!meta.favori || !!meta.legacyEtiketler?.length));
  if (Object.keys(anlamli).length) localStorage.setItem(META_ANAHTARI, JSON.stringify(anlamli));
  else localStorage.removeItem(META_ANAHTARI);
  localStorage.setItem(META_SURUM_ANAHTARI, "2");
}

export function soruHavuzMetalariniOku(): Record<string, SoruHavuzMetasi> {
  const hamMetalar = metaHamOku();
  const rozetler = soruRozetleriGetir();
  const rozetIdSet = new Set(rozetler.map((rozet) => rozet.id));
  const adId = new Map(rozetler.map((rozet) => [metinNormalle(rozet.ad), rozet.id]));
  const sonuc: Record<string, SoruHavuzMetasi> = {};
  let migrasyonGerekli = localStorage.getItem(META_SURUM_ANAHTARI) !== "2";

  for (const [kirpmaId, deger] of Object.entries(hamMetalar)) {
    if (!deger || typeof deger !== "object" || Array.isArray(deger)) continue;
    const aday = deger as { zorluk?: unknown; rozetIdler?: unknown; favori?: unknown; legacyEtiketler?: unknown; etiketler?: unknown; dogruSik?: unknown };
    const eskiEtiketler = Array.isArray(aday.etiketler)
      ? aday.etiketler.filter((etiket): etiket is string => typeof etiket === "string" && !!etiket.trim())
      : [];
    const eskiZorluklar = eskiEtiketler
      .map(metinNormalle)
      .filter((etiket): etiket is SoruZorlugu => ZORLUKLAR.has(etiket as SoruZorlugu));
    const zorluk = ZORLUKLAR.has(aday.zorluk as SoruZorlugu)
      ? aday.zorluk as SoruZorlugu
      : eskiZorluklar[eskiZorluklar.length - 1];
    const rozetIdler = Array.isArray(aday.rozetIdler)
      ? aday.rozetIdler.filter((id): id is string => typeof id === "string" && rozetIdSet.has(id))
      : [];
    for (const etiket of eskiEtiketler) {
      if (ZORLUKLAR.has(metinNormalle(etiket) as SoruZorlugu)) continue;
      const id = adId.get(metinNormalle(etiket));
      if (id) rozetIdler.push(id);
    }
    sonuc[kirpmaId] = {
      zorluk,
      rozetIdler: [...new Set(rozetIdler)],
      favori: typeof aday.favori === "boolean" ? aday.favori : undefined,
      legacyEtiketler: Array.isArray(aday.legacyEtiketler)
        ? aday.legacyEtiketler.filter((etiket): etiket is string => typeof etiket === "string")
        : (eskiEtiketler.length > 1 && eskiZorluklar.length > 1 ? eskiEtiketler : undefined),
      // Bu okuyucu metayı alan alan YENİDEN KURUYOR (beyaz liste). Listede
      // olmayan alan her okumada düşer; `soruHavuzMetasiniAyarla` okuduğunu
      // geri yazdığı için de diğer soruların kayıtlı şıkları siliniyordu —
      // "ikinciyi işaretleyince birincininki uçuyor". tsc göremez: yeni alan
      // opsiyonel olduğu için eksik nesne de tipe uyuyor.
      dogruSik: typeof aday.dogruSik === "string" && /^[A-E]$/.test(aday.dogruSik)
        ? aday.dogruSik
        : undefined,
    };
    if (eskiEtiketler.length) migrasyonGerekli = true;
  }
  if (migrasyonGerekli) metaKaydet(sonuc);
  return sonuc;
}

export function soruHavuzMetasiniAyarla(
  kirpmaId: string,
  patch: { zorluk?: SoruZorlugu; rozetIdler: string[]; dogruSik?: string },
): void {
  const metalar = soruHavuzMetalariniOku();
  const aktifIdler = new Set(soruRozetleriGetir(true).map((rozet) => rozet.id));
  const mevcut = metalar[kirpmaId] ?? { rozetIdler: [] };
  // Devre disi eski atamalar modalda degistirilse bile sessizce kaybolmaz.
  const devreDisiAtamalar = mevcut.rozetIdler.filter((id) => !aktifIdler.has(id));
  metalar[kirpmaId] = {
    ...mevcut,
    zorluk: patch.zorluk,
    rozetIdler: [...new Set([...devreDisiAtamalar, ...patch.rozetIdler.filter((id) => aktifIdler.has(id))])],
    dogruSik: patch.dogruSik,
  };
  metaKaydet(metalar);
}

export function soruHavuzMetaSnapshotiAl(kirpmaIdler: string[]): Record<string, SoruHavuzMetasi> {
  const metalar = soruHavuzMetalariniOku();
  return Object.fromEntries(kirpmaIdler.filter((id) => !!metalar[id]).map((id) => [id, structuredClone(metalar[id])]));
}

export function soruHavuzMetalariniSil(kirpmaIdler: string[]): void {
  const metalar = soruHavuzMetalariniOku();
  for (const id of kirpmaIdler) delete metalar[id];
  metaKaydet(metalar);
}

export function soruHavuzMetaSnapshotiniGeriYukle(snapshot: Record<string, SoruHavuzMetasi>): void {
  const metalar = soruHavuzMetalariniOku();
  for (const [id, meta] of Object.entries(snapshot)) metalar[id] = structuredClone(meta);
  metaKaydet(metalar);
}

export function soruRozetiKullanimSayisi(id: string): number {
  return Object.values(soruHavuzMetalariniOku()).filter((meta) => meta.rozetIdler.includes(id)).length;
}

export function soruRozetiSil(id: string): void {
  rozetleriKaydet(soruRozetleriGetir().filter((rozet) => rozet.id !== id));
  const metalar = soruHavuzMetalariniOku();
  for (const meta of Object.values(metalar)) meta.rozetIdler = meta.rozetIdler.filter((rozetId) => rozetId !== id);
  metaKaydet(metalar);
}

export function soruRozetDeposuSnapshotiAl(): SoruRozetDepoSnapshoti {
  return {
    rozetler: structuredClone(soruRozetleriGetir()),
    metalar: structuredClone(soruHavuzMetalariniOku()),
  };
}

/** Tam yedek/rollback için iki ilişkili localStorage katmanını birlikte yazar. */
export function soruRozetDeposunuGeriYukle(snapshot: SoruRozetDepoSnapshoti): void {
  const oncekiRozet = localStorage.getItem(ROZET_ANAHTARI);
  const oncekiMeta = localStorage.getItem(META_ANAHTARI);
  const oncekiSurum = localStorage.getItem(META_SURUM_ANAHTARI);
  try {
    rozetleriKaydet(structuredClone(snapshot.rozetler));
    metaKaydet(structuredClone(snapshot.metalar));
  } catch (err) {
    if (oncekiRozet === null) localStorage.removeItem(ROZET_ANAHTARI); else localStorage.setItem(ROZET_ANAHTARI, oncekiRozet);
    if (oncekiMeta === null) localStorage.removeItem(META_ANAHTARI); else localStorage.setItem(META_ANAHTARI, oncekiMeta);
    if (oncekiSurum === null) localStorage.removeItem(META_SURUM_ANAHTARI); else localStorage.setItem(META_SURUM_ANAHTARI, oncekiSurum);
    throw err;
  }
}
