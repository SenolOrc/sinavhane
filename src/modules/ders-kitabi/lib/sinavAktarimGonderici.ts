import type { DersKitabiSinavAktarimState, SinavAktarimKaynagi } from "@shared/types";
import { sinavAktarimKaydet, sinavAktarimTtlTemizle } from "@/lib/sinavAktarimDepo";
import { sepettekiKirpmalariGomGuvenli, type KirpmaGommeSecenekleri, type SepetGommeSonucu } from "./kirpmaGom";

export type SinavAktarimHazirlamaSonucu = {
  routeState: DersKitabiSinavAktarimState;
  gomme: SepetGommeSonucu;
};

export async function sinavAktariminiHazirla(
  kirpmaIdler: string[],
  source: SinavAktarimKaynagi,
  secenek: KirpmaGommeSecenekleri = {},
): Promise<SinavAktarimHazirlamaSonucu> {
  const gomme = await sepettekiKirpmalariGomGuvenli(kirpmaIdler, secenek);
  if (!gomme.gorseller.length) {
    const ayrinti = gomme.basarisizlar.slice(0, 5).map((hata) => `${hata.kaynakAd}: ${hata.neden}`).join(" · ");
    throw new Error(`Gönderilecek soru bulunamadı. Eksik PDF’leri yeniden bağlayın.${ayrinti ? ` ${ayrinti}` : ""}`);
  }
  if (secenek.signal?.aborted) throw new DOMException("Aktarım iptal edildi.", "AbortError");
  const basarisizSet = new Set(gomme.basarisizIds);
  const kullanilanKirpmaIdler = kirpmaIdler.filter((id) => !basarisizSet.has(id));
  const zarf = await sinavAktarimKaydet({
    iceAktarilacakGorseller: gomme.gorseller,
    gonderilemeyenSayisi: gomme.basarisizIds.length,
    gonderilemeyenler: gomme.basarisizlar,
    kullanilanKirpmaIdler,
  }, source, { signal: secenek.signal });
  void sinavAktarimTtlTemizle().catch(() => undefined);
  return {
    gomme,
    routeState: { transferId: zarf.transferId, version: zarf.version, source: zarf.source },
  };
}

export function aktarimIptalHatasiMi(err: unknown): boolean {
  return err instanceof DOMException && err.name === "AbortError";
}
