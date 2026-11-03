// modules/ders-kitabi/lib/rozetSecenekleri.ts — öğretmenin daha önce sorulara
// yazdığı sınıf/konu değerlerini "rozet" (yeniden seçilebilir öneri) olarak
// çıkarır. Öğretmen her soruda aynı şeyi yeniden yazmasın diye: bir kez
// yazılan sınıf/konu, sonraki soru eklemede seçenek listesinde belirir.
import type { KirpmaKaydi } from "@shared/types";

function secenekSirala(a: string, b: string): number {
  return a.localeCompare(b, "tr", { numeric: true, sensitivity: "base" });
}

// Öğretmen aynı sınıf/konuyu her seferinde aynı büyük/küçük harfle yazmayabilir
// ("Elektrostatik" / "elektrostatik" / "elekTrostatik") — bunlar öneri
// listesinde ayrı ayrı satırlar olarak belirmesin diye harf büyüklüğünden
// bağımsız gruplanır; ilk görülen yazım gösterim için korunur.
function benzersizSecenekler(degerler: (string | undefined)[]): string[] {
  const gruplar = new Map<string, string>();
  for (const ham of degerler) {
    const temiz = ham?.trim();
    if (!temiz) continue;
    const anahtar = temiz.toLocaleLowerCase("tr");
    if (!gruplar.has(anahtar)) gruplar.set(anahtar, temiz);
  }
  return [...gruplar.values()].sort(secenekSirala);
}

export function sinifSecenekleriCikar(kirpmalar: KirpmaKaydi[]): string[] {
  return benzersizSecenekler(kirpmalar.map((k) => k.sinif));
}

export function konuSecenekleriCikar(kirpmalar: KirpmaKaydi[]): string[] {
  return benzersizSecenekler(kirpmalar.map((k) => k.konu));
}
