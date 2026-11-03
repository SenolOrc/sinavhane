/**
 * Denklem veri modeli.
 *
 * NEDEN AYRI DOSYA: bu tipler hem denklem editörünü (UI) hem çizim motorunu
 * (`ciz.ts`) hem de motoru kullanan başka modülleri ilgilendiriyor. Modalın
 * içinde dururken tipi almak isteyen her dosya React'e ve lucide ikonlarına
 * bağımlı bir dosyayı import etmek zorundaydı.
 */

export type DenklemCikti = {
  dataUrl: string;
  oran: number;
  /** Denklemin GERÇEK yüksekliğinin punto'ya oranı (h / punto).
   *  Satır içi yerleştirme bunu kullanmalı: sabit bir katsayı (eski hâli
   *  punto*1.5) kesir/integral gibi uzun yapıları yarı yarıya küçültüyordu. */
  yukseklikOrani: number;
  denklemVerisi: DenklemBelgesi;
};

export type DenklemParcasi = DenklemParcaTaban & { bitisik?: boolean };

/** `bitisik`: önceki parçayla ARADA boşluk bırakma (kimya formülü: H₂O, SO₄²⁻). */
type DenklemParcaTaban =
  | { id: string; tur: "metin"; deger: string }
  | {
      id: string;
      tur: "kesir";
      pay: string;
      payda: string;
      payParcalari?: DenklemParcasi[];
      paydaParcalari?: DenklemParcasi[];
    }
  | {
      id: string;
      tur: "kok";
      derece: string;
      icerik: string;
      dereceParcalari?: DenklemParcasi[];
      icerikParcalari?: DenklemParcasi[];
    }
  | {
      id: string;
      tur: "us";
      taban: string;
      ust: string;
      alt: string;
      tabanParcalari?: DenklemParcasi[];
      ustParcalari?: DenklemParcasi[];
      altParcalari?: DenklemParcasi[];
    }
  | {
      id: string;
      tur: "limit";
      altYazi: string;
      ifade: string;
      altYaziParcalari?: DenklemParcasi[];
      ifadeParcalari?: DenklemParcasi[];
    }
  | {
      id: string;
      tur: "integral";
      kat: 1 | 2 | 3;
      altSinir: string;
      ustSinir: string;
      ifade: string;
      altSinirParcalari?: DenklemParcasi[];
      ustSinirParcalari?: DenklemParcasi[];
      ifadeParcalari?: DenklemParcasi[];
    }
  | {
      id: string;
      tur: "toplam";
      altYazi: string;
      ustYazi: string;
      ifade: string;
      altYaziParcalari?: DenklemParcasi[];
      ustYaziParcalari?: DenklemParcasi[];
      ifadeParcalari?: DenklemParcasi[];
    }
  | {
      id: string;
      tur: "carpim";
      altYazi: string;
      ustYazi: string;
      ifade: string;
      altYaziParcalari?: DenklemParcasi[];
      ustYaziParcalari?: DenklemParcasi[];
      ifadeParcalari?: DenklemParcasi[];
    }
  | {
      id: string;
      tur: "turev";
      kismi: boolean;
      derece: string;
      pay: string;
      payda: string;
    }
  | { id: string; tur: "operator"; sembol: string }
  | { id: string; tur: "sembol"; sembol: string }
  | {
      id: string;
      tur: "grup";
      stil: "parantez" | "koseli" | "suslu" | "mutlak";
      icerik: string;
      icerikParcalari?: DenklemParcasi[];
    }
  | {
      id: string;
      tur: "fonksiyon";
      ad: string;
      arguman: string;
      argumanParcalari?: DenklemParcasi[];
    }
  | {
      id: string;
      tur: "vektor";
      stil: "ok" | "kalin" | "sapka" | "ustcizgi" | "nokta";
      ifade: string;
      ifadeParcalari?: DenklemParcasi[];
    }
  | {
      id: string;
      tur: "matris";
      stil: "parantez" | "koseli" | "determinant";
      satirlar: string[][];
    }
  | { id: string; tur: "sistem"; satirlar: string[] }
  | {
      id: string;
      tur: "parcali";
      satirlar: { ifade: string; kosul: string }[];
    }
  | { id: string; tur: "binom"; ust: string; alt: string };

export type ParcaTuru = DenklemParcasi["tur"];

export type DenklemBelgesi = {
  surum: "v1";
  punto: number;
  parcalar: DenklemParcasi[];
};
