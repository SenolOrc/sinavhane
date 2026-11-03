// core/notBasamak.ts — performans notunun yuvarlanma biçimi (OA59). Öğretmen seçer:
//   0 = tam sayı (varsayılan; eski davranış), 1 = bir ondalık, 2 = iki ondalık.
// Yönetmelik md. 51/1-e: ortalama bölmesi virgülden sonra dört basamak yürütülür; e-Okul'a hangi biçimde
// yazılacağı öğretmenin kullandığı ekrana bağlıdır, o yüzden seçim öğretmene bırakıldı.
// Kaynak (ayar) repo'dan bağlanır; çekirdek veritabanını bilmez.
export type NotBasamak = 0 | 1 | 2;

let kaynak: () => NotBasamak = () => 0;
export function notBasamakKaynagiBagla(f: () => NotBasamak): void { kaynak = f; }
export function suAnkiNotBasamak(): NotBasamak { return kaynak(); }

/** `basamak` ondalığa yarım yukarı yuvarlar. Denetim (OA74): `Math.round(x * k) / k` ikili kesir hatasıyla
 *  69,45 → 69,4, 53,725 → 53,72 veriyordu (69.45 * 10 = 694.4999…). Çarpım 12 anlamlı basamağa indirilip
 *  yuvarlanır: kayan nokta gürültüsü silinir, gerçek ondalık değer korunur. Tam sayılar değişmez. */
export function basamakYuvarla(x: number, basamak: number): number {
  if (!Number.isFinite(x)) return x;
  const k = 10 ** basamak;
  return Math.round(Number((x * k).toPrecision(12))) / k;
}

/** Ayara göre yuvarlar. */
export function notYuvarla(x: number): number {
  return basamakYuvarla(x, kaynak());
}

/** Yönetmelik md. 51: ortalama bölmesi virgülden sonra DÖRT basamak yürütülür — ara değer bununla tutulur,
 *  nota yalnız en sonda (notYuvarla) çevrilir. */
export function dortBasamak(x: number): number {
  return basamakYuvarla(x, 4);
}

/** Ekranda gösterim: Türkçe virgül, gereksiz sıfır yok ("85", "85,5"). */
export function notYaz(x: number | null | undefined): string {
  if (x == null || !Number.isFinite(x)) return "—";
  return String(notYuvarla(x)).replace(".", ",");
}
