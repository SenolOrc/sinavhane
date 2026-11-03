import type { SinavTaslagi, SoruOgesi } from "./types";

type HafifEkGorsel = Omit<NonNullable<SoruOgesi["ekGorseller"]>[number], "dataUrl"> & {
  dataAssetId: string;
};

type HafifSoru = Omit<SoruOgesi, "gorselDataUrl" | "ekGorseller"> & {
  gorselAssetId?: string;
  ekGorseller?: HafifEkGorsel[];
};

/**
 * Geri al/ileri al'ın kapsadığı durum: taslağın soruları + başlık bilgileri +
 * sayfa düzeni ayarları.
 *
 * Geçmiş eskiden yalnız `sorular`'ı tutuyordu; punto/kenar boşluğu/sütun düzeni
 * ya da okul adı gibi bir alanı değiştirdikten sonra Ctrl+Z o değişikliği geri
 * almıyordu (kullanıcıya yardım ekranında "geri al yalnız soruları kapsar" diye
 * yazmak zorunda kalınmıştı).
 *
 * `SinavTaslagi`'nın `id`/`surum`/`kayitZamani` alanları BİLEREK dışarıda:
 * `kayitZamani` her çağrıda değiştiği için snapshot'lar hep farklı görünür,
 * "değişmediyse geçmişe yazma" karşılaştırması bozulur ve her debounce turunda
 * yeni bir geçmiş adımı birikirdi.
 */
export type SinavGecmisDurumu = Pick<SinavTaslagi, "sorular" | "baslik" | "ayarlar">;

type HafifDurum = {
  sorular: HafifSoru[];
  baslik: Omit<SinavGecmisDurumu["baslik"], "logoDataUrl"> & { logoAssetId?: string };
  ayarlar: SinavGecmisDurumu["ayarlar"];
};

/**
 * Büyük data URL'lerini her geçmiş adımına kopyalamak yerine bir kez tutar.
 * Snapshot'lar yalnızca kısa asset kimliklerini içerir.
 */
export class GorselAssetKaydi {
  private readonly iddenVeriye = new Map<string, string>();
  private readonly veridenIde = new Map<string, string>();
  private sira = 0;

  kaydet(dataUrl: string): string {
    const mevcut = this.veridenIde.get(dataUrl);
    if (mevcut) return mevcut;
    const id = `g${++this.sira}`;
    this.veridenIde.set(dataUrl, id);
    this.iddenVeriye.set(id, dataUrl);
    return id;
  }

  getir(id: string): string | undefined {
    return this.iddenVeriye.get(id);
  }

  get assetSayisi(): number {
    return this.iddenVeriye.size;
  }

  get gorselBaytSayisi(): number {
    let toplam = 0;
    this.iddenVeriye.forEach((veri) => {
      toplam += veri.length;
    });
    return toplam;
  }

  kullanilmayanlariTemizle(snapshotlar: string[]): number {
    const kullanilan = new Set<string>();
    snapshotlar.forEach((snapshot) => {
      // logoAssetId de taranmalı: aksi halde logo çöp toplanır ve geçmişe
      // dönünce "geri alma görseli bulunamadı" ile adım kaybedilir.
      const eslesmeler = snapshot.matchAll(/"(?:gorselAssetId|dataAssetId|logoAssetId)":"([^"]+)"/g);
      for (const eslesme of eslesmeler) kullanilan.add(eslesme[1]);
    });
    let silinen = 0;
    this.iddenVeriye.forEach((dataUrl, id) => {
      if (kullanilan.has(id)) return;
      this.iddenVeriye.delete(id);
      this.veridenIde.delete(dataUrl);
      silinen += 1;
    });
    return silinen;
  }
}

export function hafifSnapshotOlustur(
  durum: SinavGecmisDurumu,
  kayit: GorselAssetKaydi,
): string {
  const sorular: HafifSoru[] = durum.sorular.map((soru) => {
    const { gorselDataUrl, ekGorseller, ...kalan } = soru;
    return {
      ...kalan,
      ...(gorselDataUrl ? { gorselAssetId: kayit.kaydet(gorselDataUrl) } : {}),
      ekGorseller: (ekGorseller ?? []).map((parca) => {
        const { dataUrl, ...parcaKalan } = parca;
        return { ...parcaKalan, dataAssetId: kayit.kaydet(dataUrl) };
      }),
    };
  });
  // Logo da soru görselleri gibi asset kaydına gider: aksi halde her geçmiş
  // adımı logonun tam data URL'ini kopyalar (30 adım × logo boyutu).
  const { logoDataUrl, ...baslikKalan } = durum.baslik;
  const hafif: HafifDurum = {
    sorular,
    baslik: {
      ...baslikKalan,
      ...(logoDataUrl ? { logoAssetId: kayit.kaydet(logoDataUrl) } : {}),
    },
    ayarlar: durum.ayarlar,
  };
  return JSON.stringify(hafif);
}

export function hafifSnapshotGeriYukle(
  snapshot: string,
  kayit: GorselAssetKaydi,
): SinavGecmisDurumu {
  const hafif = JSON.parse(snapshot) as HafifDurum;
  const sorular = hafif.sorular.map((soru) => {
    const { gorselAssetId, ekGorseller, ...kalan } = soru;
    const gorselDataUrl = gorselAssetId ? kayit.getir(gorselAssetId) : undefined;
    if (gorselAssetId && !gorselDataUrl) {
      throw new Error(`Geri alma görseli bulunamadı: ${gorselAssetId}`);
    }
    return {
      ...kalan,
      ...(gorselDataUrl ? { gorselDataUrl } : {}),
      ekGorseller: (ekGorseller ?? []).map((parca) => {
        const { dataAssetId, ...parcaKalan } = parca;
        const dataUrl = kayit.getir(dataAssetId);
        if (!dataUrl) throw new Error(`Geri alma görseli bulunamadı: ${dataAssetId}`);
        return { ...parcaKalan, dataUrl };
      }),
    } as SoruOgesi;
  });

  const { logoAssetId, ...baslikKalan } = hafif.baslik;
  const logoDataUrl = logoAssetId ? kayit.getir(logoAssetId) : undefined;
  if (logoAssetId && !logoDataUrl) {
    throw new Error(`Geri alma görseli bulunamadı: ${logoAssetId}`);
  }
  return {
    sorular,
    baslik: { ...baslikKalan, ...(logoDataUrl ? { logoDataUrl } : {}) },
    ayarlar: hafif.ayarlar,
  };
}
