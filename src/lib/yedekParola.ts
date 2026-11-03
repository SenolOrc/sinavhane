export type ParolaGucu = "bos" | "yetersiz" | "orta" | "guclu";

export function yedekParolaGucu(parola: string): ParolaGucu {
  if (!parola) return "bos";
  const uzunluk = [...parola].length;
  if (uzunluk < 12) return "yetersiz";
  const cesit = [/[a-zçğıöşü]/, /[A-ZÇĞİÖŞÜ]/, /\d/, /[^\p{L}\p{N}\s]/u]
    .filter((desen) => desen.test(parola)).length;
  return uzunluk >= 16 && cesit >= 3 ? "guclu" : "orta";
}

function guvenliSayi(ustSinir: number): number {
  if (!globalThis.crypto?.getRandomValues) throw new Error("Güvenli parola üreticisi bu ortamda kullanılamıyor.");
  const kabulSiniri = Math.floor(0x1_0000_0000 / ustSinir) * ustSinir;
  const tampon = new Uint32Array(1);
  do globalThis.crypto.getRandomValues(tampon); while (tampon[0] >= kabulSiniri);
  return tampon[0] % ustSinir;
}

export function gucluYedekParolasiUret(): string {
  const gruplar = ["ABCDEFGHJKLMNPQRSTUVWXYZ", "abcdefghijkmnopqrstuvwxyz", "23456789", "!@#$%*-_=+"];
  const tumu = gruplar.join("");
  const karakterler = gruplar.map((grup) => grup[guvenliSayi(grup.length)]);
  while (karakterler.length < 20) karakterler.push(tumu[guvenliSayi(tumu.length)]);
  for (let i = karakterler.length - 1; i > 0; i--) {
    const j = guvenliSayi(i + 1);
    [karakterler[i], karakterler[j]] = [karakterler[j], karakterler[i]];
  }
  return karakterler.join("");
}
