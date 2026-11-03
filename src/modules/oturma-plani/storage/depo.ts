// modules/oturma-plani/storage/depo.ts — oturma planı kalıcılığı (izole localStorage
// anahtarı). Ana veri şemasına/repo'ya DOKUNMAZ; yalnız bu modülün yerleşimini saklar.
// Önceden modül kökünde çıplak bir dosyaydı (CLAUDE.md'nin "storage/ dışı depo yalnız
// iki büyük modülde" kalıbına uymuyordu); 2026-09-24'te storage/'e taşındı.
export type Planlar = Record<number, Record<string, number>>; // sinifId -> "<sira>-<koltuk>" -> ogrenciId

const ANAHTAR = "ogretmen-asistani.oturma.v1";

export function planlariYukle(): Planlar {
  try {
    const ham = localStorage.getItem(ANAHTAR);
    return ham ? (JSON.parse(ham) as Planlar) : {};
  } catch {
    return {};
  }
}

/** Yeni öğretim yılında yerleşimleri siler (lib/yilGecisi.ts çağırır). Sınıf id'leri
 *  yeni yılda yeniden kullanıldığı için eski yerleşim yeni sınıfa kalıntı bırakıyordu. */
export function planlariTemizle(): void {
  try { for (const a of OTURMA_ANAHTARLARI) localStorage.removeItem(a); } catch { /* erişim yoksa yapacak bir şey yok */ }
}

/** Tam yedek için (lib/tamYedek.ts): üç deponun ham JSON metni. 2026-09 denetimi:
 *  oturma planları hiçbir yedeğe girmiyordu, bilgisayar değişince hepsi gidiyordu. */
export type OturmaDepoSnapshoti = Record<string, string>;
export function oturmaDeposuSnapshotiAl(): OturmaDepoSnapshoti {
  const s: OturmaDepoSnapshoti = {};
  try { for (const a of OTURMA_ANAHTARLARI) { const v = localStorage.getItem(a); if (v != null) s[a] = v; } } catch { /* boş */ }
  return s;
}
export function oturmaDeposunuGeriYukle(s: OturmaDepoSnapshoti): void {
  for (const a of OTURMA_ANAHTARLARI) {
    const v = s[a];
    if (typeof v === "string") localStorage.setItem(a, v); else localStorage.removeItem(a);
  }
}

export function planlariKaydet(p: Planlar): boolean {
  try {
    localStorage.setItem(ANAHTAR, JSON.stringify(p));
    return true;
  } catch {
    return false; // kota/erişim hatası — çağıran öğretmeni uyarır
  }
}

// Sınıf krokisinin fiziksel sütun sayısı (yan yana kaç sıra dizili) okuldan
// okula, hatta sınıftan sınıfa değişir (2 ya da 3 sütunlu sınıflar da var) —
// bu yüzden sabit değer değil, sınıf başına ayrı saklanan bir tercih.
// Ayrı anahtar: mevcut Planlar şemasını (sinifId -> koltuk ataması) bozmadan eklendi.
export type SutunTercihleri = Record<number, number>; // sinifId -> sütun sayısı

const SUTUN_ANAHTARI = "ogretmen-asistani.oturma.sutun.v1";

export function sutunlariYukle(): SutunTercihleri {
  try {
    const ham = localStorage.getItem(SUTUN_ANAHTARI);
    return ham ? (JSON.parse(ham) as SutunTercihleri) : {};
  } catch {
    return {};
  }
}

export function sutunlariKaydet(t: SutunTercihleri): boolean {
  try {
    localStorage.setItem(SUTUN_ANAHTARI, JSON.stringify(t));
    return true;
  } catch {
    return false;
  }
}

// Sıra sayısı da sütun gibi sınıftan sınıfa değişir — bazı odalarda mevcuttan
// fazla/az fiziksel sıra olabilir (gerçek kullanıcı isteği: "öğretmen sütun
// VE sıra sayısını seçebilmeli"). Yoksa otomatik hesaba (mevcuda göre) düşülür.
export type SiraTercihleri = Record<number, number>; // sinifId -> sıra sayısı

const SIRA_ANAHTARI = "ogretmen-asistani.oturma.sira.v1";

export function siralariYukle(): SiraTercihleri {
  try {
    const ham = localStorage.getItem(SIRA_ANAHTARI);
    return ham ? (JSON.parse(ham) as SiraTercihleri) : {};
  } catch {
    return {};
  }
}

export function siralariKaydet(t: SiraTercihleri): boolean {
  try {
    localStorage.setItem(SIRA_ANAHTARI, JSON.stringify(t));
    return true;
  } catch {
    return false;
  }
}

const OTURMA_ANAHTARLARI = [ANAHTAR, SUTUN_ANAHTARI, SIRA_ANAHTARI];
