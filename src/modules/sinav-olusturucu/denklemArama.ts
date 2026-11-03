/**
 * Denklem editöründeki aramaların ortak zemini.
 *
 * Hem sembol seçici hem parça ekleme listesi buradan geçer.
 *
 * Türkçe katlamanın kendisi artık burada DEĞİL, `@/lib/turkceMetin`'de:
 * aynı kural İçerik Hazırlama'nın aramalarında da gerekiyordu ve bir modül
 * başka bir modülün kodunu çağıramaz (CLAUDE.md).
 */

import { aramaIcinKucult } from "@/lib/turkceMetin";

export type AranabilirArac = {
  tur: string;
  etiket: string;
  /** Etikette geçmeyen ama öğretmenin yazması muhtemel karşılıklar
   *  ("bölme" → Kesir, "üslü" → Üs / Alt Simge). */
  esAnlamlilar?: string[];
};

/**
 * Parça türlerini arama metnine göre süzer. Boş sorguda hiçbir şey elenmez.
 * Eşleşme etikette VEYA eş anlamlılarda aranır.
 */
export function araclariSuz<T extends AranabilirArac>(
  araclar: readonly T[],
  arama: string,
): T[] {
  const q = aramaIcinKucult(arama.trim());
  if (!q) return [...araclar];
  return araclar.filter((arac) =>
    [arac.etiket, ...(arac.esAnlamlilar ?? [])].some((metin) =>
      aramaIcinKucult(metin).includes(q),
    ),
  );
}
