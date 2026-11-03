import type {
  SinavAktarimPayload,
  SinavAktarimBitirmeSonucu,
  SinavAktarimKullanimMakbuzu,
  SinavAktarimZarfi,
} from "@/lib/sinavAktarimDepo";
import type { DersKitabiGorselAktarimi } from "@shared/types";
import type { SinavAktarimKaynagi } from "@shared/types";
import { dersKitabiTekrarlariniAyir } from "./aktarim";
import type { SinavTaslagi, SoruOgesi } from "./types";

export interface AktarimKalicilastirmaBagimliliklari {
  taslakKaydet: (taslak: SinavTaslagi) => Promise<void>;
  ackle: (
    transferId: string,
    makbuz: Omit<SinavAktarimKullanimMakbuzu, "kullanimKaydedildi">,
  ) => Promise<SinavAktarimBitirmeSonucu & { yeniAck: boolean }>;
  kullanimiTamamla: (transferId: string) => Promise<boolean>;
  kullanimKaydet: (
    kirpmaIdler: string[],
    ayrinti: { hedefId: string; hedefAd: string; eylem: "eklendi"; olayId: string },
  ) => boolean;
}

export interface AktarimKalicilastirmaGirdisi {
  taslak: SinavTaslagi;
  payload: SinavAktarimPayload;
  transferId?: string;
  hedefId: string;
  hedefAd: string;
  sorulariOlustur: (gelen: DersKitabiGorselAktarimi[]) => SoruOgesi[];
}

export interface AktarimKalicilastirmaSonucu {
  taslak: SinavTaslagi;
  eklenenSayisi: number;
  tekrarSayisi: number;
  kullanimYazilanIdler: string[];
  kullanimTamamlandi: boolean;
}

export function sinavAktarimKaynakEtiketi(source: SinavAktarimKaynagi): "Ders Kitabı" | "Soru Havuzu" {
  return source === "soru-havuzu" ? "Soru Havuzu" : "Ders Kitabı";
}

export async function sinavAktarimKullaniminiUzlastir(
  zarf: SinavAktarimZarfi,
  bagimliliklar: Pick<AktarimKalicilastirmaBagimliliklari, "kullanimKaydet" | "kullanimiTamamla">,
): Promise<boolean> {
  const makbuz = zarf.kullanimMakbuzu;
  if (!makbuz || makbuz.kullanimKaydedildi) return true;
  const yazildi = bagimliliklar.kullanimKaydet(makbuz.kullanilanKirpmaIdler, {
    hedefId: makbuz.hedefId,
    hedefAd: makbuz.hedefAd,
    eylem: makbuz.eylem,
    olayId: `sinav-aktarim:${zarf.transferId}`,
  });
  return yazildi ? bagimliliklar.kullanimiTamamla(zarf.transferId) : false;
}

/** Önce birleştirilmiş taslağı kalıcılaştırır, sonra zarfı atomik ACK'ler.
 * Yeni sorular transfer kimliğiyle işaretlendiği için save→ACK arasındaki crash
 * yeniden denemesinde dedupe edilen sorular yine bu transfere ait olarak tanınır;
 * daha eski taslak tekrarları kullanım geçmişine yazılmaz. */
export async function sinavAktariminiKalicilastir(
  girdi: AktarimKalicilastirmaGirdisi,
  bagimliliklar: AktarimKalicilastirmaBagimliliklari,
): Promise<AktarimKalicilastirmaSonucu> {
  const { benzersiz, tekrarSayisi } = dersKitabiTekrarlariniAyir(
    girdi.payload.iceAktarilacakGorseller,
    girdi.taslak.sorular,
  );
  const yeniSorular = girdi.sorulariOlustur(benzersiz).map((soru) =>
    girdi.transferId ? { ...soru, kaynakAktarimId: girdi.transferId } : soru,
  );
  const birlesik: SinavTaslagi = {
    ...girdi.taslak,
    id: girdi.taslak.id ?? girdi.hedefId,
    kayitZamani: new Date().toISOString(),
    sorular: [...girdi.taslak.sorular, ...yeniSorular],
  };

  await bagimliliklar.taslakKaydet(birlesik);

  let kullanimIdleri: string[];
  let kullanimTamamlandi = true;
  if (girdi.transferId) {
    const buTransferinIdleri = birlesik.sorular
      .filter((soru) => soru.kaynakAktarimId === girdi.transferId)
      .map((soru) => soru.kirpmaId)
      .filter((id): id is string => !!id);
    const ack = await bagimliliklar.ackle(girdi.transferId, {
      kullanilanKirpmaIdler: [...new Set(buTransferinIdleri)],
      hedefId: birlesik.id ?? girdi.hedefId,
      hedefAd: girdi.hedefAd,
      eylem: "eklendi",
    });
    if (!ack.zarf || ack.zarf.durum !== "ack") {
      throw new Error("Aktarım başka bir işlem tarafından iptal edildi; zarf kabul edilemedi.");
    }
    kullanimIdleri = ack.yeniAck ? [...new Set(buTransferinIdleri)] : [];
    kullanimTamamlandi = await sinavAktarimKullaniminiUzlastir(ack.zarf, bagimliliklar);
  } else {
    kullanimIdleri = yeniSorular.map((soru) => soru.kirpmaId).filter((id): id is string => !!id);
    kullanimIdleri = [...new Set(kullanimIdleri)];
    kullanimTamamlandi = bagimliliklar.kullanimKaydet(kullanimIdleri, {
      hedefId: birlesik.id ?? girdi.hedefId,
      hedefAd: girdi.hedefAd,
      eylem: "eklendi",
      olayId: `sinav-legacy:${birlesik.id ?? girdi.hedefId}:${birlesik.kayitZamani}`,
    });
  }
  return {
    taslak: birlesik,
    eklenenSayisi: yeniSorular.length,
    tekrarSayisi,
    kullanimYazilanIdler: kullanimIdleri,
    kullanimTamamlandi,
  };
}
