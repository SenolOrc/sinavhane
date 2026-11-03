import type { DersKitabiGorselAktarimi } from "@shared/types";
import type { SoruOgesi } from "./types";

/** Hem mevcut taslaktaki hem aynı transfer içindeki kırpma tekrarlarını eler. */
export function dersKitabiTekrarlariniAyir(
  gelen: DersKitabiGorselAktarimi[],
  mevcutSorular: SoruOgesi[],
): { benzersiz: DersKitabiGorselAktarimi[]; tekrarSayisi: number } {
  const bilinen = new Set(mevcutSorular.map((soru) => soru.kirpmaId).filter(Boolean));
  const benzersiz: DersKitabiGorselAktarimi[] = [];
  let tekrarSayisi = 0;
  for (const aktarim of gelen) {
    if (aktarim.kirpmaId && bilinen.has(aktarim.kirpmaId)) {
      tekrarSayisi += 1;
      continue;
    }
    benzersiz.push(aktarim);
    if (aktarim.kirpmaId) bilinen.add(aktarim.kirpmaId);
  }
  return { benzersiz, tekrarSayisi };
}
