import { veriDosyasiOku, veriDosyasiUrl } from "@/lib/veriDosyasi";

export type DersKitabiPdfSayfa = {
  getViewport: (args: { scale: number }) => { width: number; height: number };
  render: (args: {
    canvasContext: CanvasRenderingContext2D;
    viewport: { width: number; height: number };
    transform?: number[];
  }) => { promise: Promise<void>; cancel?: () => void };
};

export type DersKitabiPdfBelge = {
  numPages: number;
  getPage: (sayfaNo: number) => Promise<DersKitabiPdfSayfa>;
  destroy: () => Promise<void>;
};

let workerKuruldu = false;

async function pdfjsGetir() {
  const pdfjs = await import("pdfjs-dist");
  if (!workerKuruldu) {
    pdfjs.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/build/pdf.worker.mjs", import.meta.url).toString();
    workerKuruldu = true;
  }
  return pdfjs;
}

/** Masaüstünde asset URL ile tembel/range okuma; tarayıcı önizlemesinde byte fallback. */
export async function pdfBelgeAc(kitapId: string): Promise<DersKitabiPdfBelge> {
  const pdfjs = await pdfjsGetir();
  const altYol = `kitaplar/${kitapId}.pdf`;
  const url = await veriDosyasiUrl(altYol);
  if (url) return pdfjs.getDocument({ url }).promise as unknown as Promise<DersKitabiPdfBelge>;
  const bytes = await veriDosyasiOku(altYol);
  if (!bytes) throw new Error("Kitap dosyası bulunamadı (silinmiş olabilir).");
  return pdfjs.getDocument({ data: bytes }).promise as unknown as Promise<DersKitabiPdfBelge>;
}
