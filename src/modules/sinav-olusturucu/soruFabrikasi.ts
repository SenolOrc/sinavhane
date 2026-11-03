// Görsel soruların TEK üretim kapısı.
//
// NEDEN VAR: `tur: "gorsel"` bir SoruOgesi beş ayrı yerde elle kuruluyordu
// (aktarım eşleyicisi, görsel dosyası, çizim, denklem, PDF kaynağı) ve beşi de
// aynı on varsayılanı birebir tekrarlıyordu: altMetinHtml/metinKonumu/hizalama/
// ekGorseller/punto/puan/maddeler/maddeKolon/tamGenislik/kazanim.
//
// Tekrarın maliyeti kopyala-yapıştır değil, SESSİZ AYRIŞMA: `SoruOgesi`'ne yeni
// bir zorunlu alan eklendiğinde beş yerin beşi de güncellenmek zorundaydı; biri
// unutulursa tip hatası vermeyen (alan opsiyonelse) ya da yalnız tek bir akışta
// patlayan bir fark oluşuyordu. Aynı ders `kirpmaSilme.ts`'te öğrenilmişti
// (DEVAM.md §9.4): iki kopyadan eksik olanı tamamlamak yerine tek kaynağa indir.

import type { SoruOgesi } from "./types";
import { yeniId } from "./utils";

/**
 * Çağıranın vermesi gereken alanlar — bunların anlamlı bir varsayılanı olamaz.
 *
 * `dosyaAdi` opsiyonel çünkü `SoruOgesi`'nde de opsiyonel: Ders Kitabı
 * aktarımında dosya adı gelmeyebiliyor (`DersKitabiGorselAktarimi.dosyaAdi`).
 * İmzayı burada sıkılaştırmak tipi kaynağından daha katı yapardı.
 */
export type GorselSoruZorunlu = {
  gorselDataUrl: string;
  dosyaAdi?: string;
  genislikMm: number;
  boslukMm: number;
};

/**
 * Görsel soru üretir. Varsayılanlar burada, farklar `ek` ile geçilir.
 *
 * `ek` bilerek `Partial<SoruOgesi>`: çağıranların her biri farklı bir alt küme
 * veriyor (çizim `cizimVerisi`, denklem `denklemVerisi`, aktarım `kaynak*` ve
 * `paket*` alanları, PDF `kaynakSecimNo`/`kaynakSayfaNo`). Bunları tek tek
 * imzaya almak fabrikayı beş çağıranın birleşimi kadar şişirirdi.
 *
 * `id` de `ek` ile ezilebilir ama gerek yok: çağıran üretilen soruyu alıp
 * `.id`'sini okuyabilir (PdfKaynak akışı bunu yapıyor).
 */
export function gorselSoruYap(
  zorunlu: GorselSoruZorunlu,
  ek: Partial<SoruOgesi> = {},
): SoruOgesi {
  return {
    id: yeniId(),
    tur: "gorsel",
    altMetinHtml: "",
    metinKonumu: "alt",
    hizalama: "sol",
    ekGorseller: [],
    punto: 10,
    puan: null,
    maddeler: [],
    maddeKolon: 1,
    tamGenislik: false,
    kazanim: "",
    ...zorunlu,
    ...ek,
  };
}
