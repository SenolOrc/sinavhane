/**
 * İçerik Hazırlama'nın metin eşleştirmeleri TEK yerde.
 *
 * Dört ekran (Kitaplar, Soru Havuzu, Kitap Okuyucu'nun önerili alanları, Soru
 * Seçici pop-up'ı) aynı işi ayrı ayrı yazmıştı ve dördü de aynı Türkçe I/ı
 * tuzağını taşıyordu. §9.7'nin kuralı: aynı kusurun kopyaları varsa eksik
 * olanı tamamlamak yerine tek kaynağa indir — yoksa dördüncü kez ayrışır.
 *
 * Buradaki her şey saf: birim testi `tests/ders-kitabi-senaryolari.ts`'te.
 */

import { aramaIcinKucult } from "@/lib/turkceMetin";

/** Kitap kartındaki simgeyi seçen ders kümesi. Simgenin kendisi ekranda. */
export type DersTuru =
  | "matematik" | "fizik" | "kimya" | "biyoloji" | "dil" | "sosyal" | "genel";

/**
 * Öğretmenin yazdığı sınıf değerini görüntülenebilir etikete çevirir.
 *
 * Eskiden `/sınıf/i.test(temiz)` idi ve "9. SINIF" için FALSE dönüyordu —
 * JS'in `i` bayrağı, büyük hâli ASCII'ye düşen ASCII-dışı karakterleri
 * eşleştirmiyor (`/ı/i.test("I") === false`). Sonuç: her kartta
 * "9. SINIF. sınıf". Kıyas RegExp'in kendi katlamasına değil, tek kapıdan
 * geçen Türkçe katlamaya bırakıldı; yan kazanç, ASCII ile yazılmış "9. sinif"
 * de artık ikinci kez etiketlenmiyor.
 */
export function sinifEtiketi(deger?: string): string {
  const temiz = deger?.trim();
  if (!temiz) return "Sınıf belirtilmemiş";
  return aramaIcinKucult(temiz).includes("sinif") ? temiz : `${temiz}. sınıf`;
}

/**
 * Ders adından simge kümesini bulur.
 *
 * Kalıplar KATLANMIŞ yazılır ("fransizca", "inkilap"): karşılaştırılan metin
 * `aramaIcinKucult`'tan geçtiği için ı'lar i'ye inmiş oluyor. "coğrafya"
 * katlamadan etkilenmez (katlama yalnız ı→i), o yüzden ğ'si duruyor.
 * Düz `toLocaleLowerCase("tr")` yetmiyordu: öğretmen dersi "FIZIK"/"TARIH"
 * diye büyük harfle yazdığında hepsi genel kitap simgesine düşüyordu.
 */
export function dersTuru(ders?: string): DersTuru {
  const d = aramaIcinKucult(ders ?? "");
  if (/mat/.test(d)) return "matematik";
  if (/fizik/.test(d)) return "fizik";
  if (/kimya/.test(d)) return "kimya";
  if (/biyoloji|fen/.test(d)) return "biyoloji";
  if (/ingilizce|almanca|fransizca|dil/.test(d)) return "dil";
  if (/tarih|sosyal|coğrafya|inkilap/.test(d)) return "sosyal";
  return "genel";
}

/**
 * Modüldeki BÜTÜN serbest metin aramalarının tek kapısı.
 *
 * Parçalar tek metin gibi birleştirilip aranır — öğretmen "palme 147"
 * yazabiliyor. Boş sorgu hiçbir şeyi elemez.
 */
export function aramaEslesirMi(
  hedefParcalari: readonly (string | number | undefined | null)[],
  sorgu: string,
): boolean {
  const q = aramaIcinKucult(sorgu.trim());
  if (!q) return true;
  const hedef = hedefParcalari
    .filter((parca) => parca !== undefined && parca !== null && parca !== "")
    .join(" ");
  return aramaIcinKucult(hedef).includes(q);
}
