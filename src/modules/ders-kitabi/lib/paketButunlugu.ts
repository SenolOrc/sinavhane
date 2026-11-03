import type { KirpmaKaydi } from "@shared/types";

/** Seçili parçalardan biri başarısızsa aynı çok-sayfalı sorunun seçili bütün
 * parçalarını başarısız kabul eder. Bağımsız sorular etkilenmez. */
export function paketButunluguBasarisizIdleriniBul(kirpmalar: KirpmaKaydi[], basarisizIdler: Iterable<string>): Set<string> {
  const sonuc = new Set(basarisizIdler);
  const paketler = new Map<string, KirpmaKaydi[]>();
  for (const kirpma of kirpmalar) {
    if (!kirpma.paketId) continue;
    const anahtar = `${kirpma.kitapId}:${kirpma.paketId}`;
    paketler.set(anahtar, [...(paketler.get(anahtar) ?? []), kirpma]);
  }
  for (const paket of paketler.values()) {
    if (paket.some((kirpma) => sonuc.has(kirpma.id))) paket.forEach((kirpma) => sonuc.add(kirpma.id));
  }
  return sonuc;
}
