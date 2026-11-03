import type { FoyKaydi } from "./types";

type EskiFoyKaydi = Omit<FoyKaydi, "sinifIdler"> & {
  sinifIdler?: number[];
  sinifId?: number;
};

/** Eski tekil sinifId kaydını yeni çoklu sınıf sözleşmesine taşır ve eski
 * alanı çıktıdan kaldırır. Saf tutulur; repo okuması ve testler aynı kuralı kullanır. */
export function foySiniflariniNormalle(kayit: EskiFoyKaydi): FoyKaydi {
  const { sinifId, ...kalan } = kayit;
  const adaylar = Array.isArray(kayit.sinifIdler)
    ? kayit.sinifIdler
    : typeof sinifId === "number"
      ? [sinifId]
      : [];
  const sinifIdler = [...new Set(adaylar.filter((id) => Number.isInteger(id) && id > 0))];
  return { ...kalan, sinifIdler: sinifIdler.length ? sinifIdler : undefined };
}
