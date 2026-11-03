// core/sinifSirasi.ts — sınıfları öğretmenin beklediği sıraya dizer (SAF fonksiyon).
// Eskiden sınıflar EKLENME sırasıyla duruyordu: eklentiyle sonradan gelen "9-B",
// "10-A"nın arkasına düşüyordu ve sınıflar gruplanmıyordu (OA65).
// Sıra: Hazırlık → 9 → 10 → 11 → 12 (seviye), seviye içinde şube harfi (A, B, C…).
// Tanınmayan adlar ("Kulüp", "Rehberlik" vb.) en sona, kendi aralarında eklenme sırasıyla.
// Sıralama KARARLI: eşit anahtarlı sınıfların birbirine göre sırası değişmez.
export interface SiralanabilirSinif { ad: string }

function anahtar(ad: string): { seviye: number; sube: string } | null {
  const t = ad.replace(/\s+/g, " ").trim();
  const rakamli = t.match(/^(\d+)\s*[-./ ]\s*(.*)$/u);
  if (rakamli) return { seviye: Number(rakamli[1]), sube: rakamli[2].toLocaleLowerCase("tr") };
  const hazirlik = t.match(/^haz[ıiİI]rl[ıiİI]k\s*[-./ ]?\s*(.*)$/iu);
  if (hazirlik) return { seviye: 0, sube: hazirlik[1].toLocaleLowerCase("tr") };
  return null;
}

export function sinifSirala<T extends SiralanabilirSinif>(siniflar: readonly T[]): T[] {
  return siniflar
    .map((s, i) => ({ s, i, k: anahtar(s.ad) }))
    .sort((a, b) => {
      if (a.k && b.k) {
        return a.k.seviye - b.k.seviye || a.k.sube.localeCompare(b.k.sube, "tr", { numeric: true }) || a.i - b.i;
      }
      if (a.k) return -1;
      if (b.k) return 1;
      return a.i - b.i;
    })
    .map((x) => x.s);
}
