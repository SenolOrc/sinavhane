import type { DenklemParcasi } from "./denklem/tipler";

/**
 * Bir parçanın TEK SATIRLIK okunur özeti — akordiyonda kapalı kartların
 * gövdesi bunu gösterir.
 *
 * NEDEN: parçalar soldan sağa BİRLEŞİR ama düzenleme kartları alt alta
 * diziliyordu. Ölçüldü: 6 parçalık basit bir denklemde kart yığını 1145 px,
 * yani ekranda aynı anda 2 kart görünüyor, 4'ü dışarıda kalıyordu. Öğretmen
 * kurduğu formülün ne yapısını ne parçalarını bir arada görebiliyordu.
 * Kapalı kart özetle çizilince yığın tek ekrana iniyor.
 *
 * Metin canvas'takinin birebir aynısı DEĞİL (o gerçek matematik dizgisi);
 * amaç "hangi parça bu?" sorusunu bir bakışta yanıtlamak.
 */
export function parcaOzeti(parca: DenklemParcasi): string {
  /** İç içe ifade varsa onu, yoksa düz metni yaz. */
  const alan = (duz: string, ic?: DenklemParcasi[]): string =>
    ic && ic.length ? ic.map(parcaOzeti).join("") : duz;
  switch (parca.tur) {
    case "metin":
      return parca.deger;
    case "operator":
    case "sembol":
      return parca.sembol;
    case "kesir":
      return `${alan(parca.pay, parca.payParcalari)}/${alan(parca.payda, parca.paydaParcalari)}`;
    case "kok": {
      const ic = alan(parca.icerik, parca.icerikParcalari);
      return parca.derece ? `${parca.derece}√${ic}` : `√${ic}`;
    }
    case "us": {
      const taban = alan(parca.taban, parca.tabanParcalari);
      const ust = alan(parca.ust, parca.ustParcalari);
      const alt = alan(parca.alt, parca.altParcalari);
      return `${taban}${ust ? `^${ust}` : ""}${alt ? `_${alt}` : ""}`;
    }
    case "limit":
      return `lim ${alan(parca.ifade, parca.ifadeParcalari)}`;
    case "integral":
      return `${"∫".repeat(parca.kat)} ${alan(parca.ifade, parca.ifadeParcalari)}`;
    case "toplam":
      return `Σ ${alan(parca.ifade, parca.ifadeParcalari)}`;
    case "carpim":
      return `Π ${alan(parca.ifade, parca.ifadeParcalari)}`;
    case "turev":
      return `${parca.kismi ? "∂" : "d"}${parca.pay}/${parca.kismi ? "∂" : "d"}${parca.payda}`;
    case "grup": {
      const ic = alan(parca.icerik, parca.icerikParcalari);
      const sinir: Record<typeof parca.stil, [string, string]> = {
        parantez: ["(", ")"],
        koseli: ["[", "]"],
        suslu: ["{", "}"],
        mutlak: ["|", "|"],
      };
      const [ac, kapa] = sinir[parca.stil];
      return `${ac}${ic}${kapa}`;
    }
    case "fonksiyon":
      return `${parca.ad}(${alan(parca.arguman, parca.argumanParcalari)})`;
    case "vektor":
      return parca.ifade;
    case "matris":
      return `${parca.satirlar.length}×${parca.satirlar[0]?.length ?? 0} ${
        parca.stil === "determinant" ? "determinant" : "matris"
      }`;
    case "sistem":
      return `${parca.satirlar.length} denklem`;
    case "parcali":
      return `${parca.satirlar.length} durum`;
    case "binom":
      return `C(${parca.ust}, ${parca.alt})`;
  }
}
