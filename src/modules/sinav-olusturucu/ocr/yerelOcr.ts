export type OcrIlerleme = { durum: string; oran: number };

export function ocrMetniniTemizle(metin: string, mod: "duzyazi" | "siir"): string {
  const satirlar = metin.replace(/\r/g, "").split("\n").map((satir) => satir.trimEnd());
  if (mod === "siir") return satirlar.join("\n").replace(/\n{3,}/g, "\n\n").trim();
  return satirlar
    .join("\n")
    .replace(/([\p{L}])-[ \t]*\n[ \t]*([\p{Ll}])/gu, "$1$2")
    .replace(/(?<![.!?:;”"'])\n(?!\n)/g, " ")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export async function yerelTurkceOcr(
  gorsel: string,
  mod: "duzyazi" | "siir",
  ilerleme: (bilgi: OcrIlerleme) => void,
): Promise<{ metin: string; guven: number }> {
  const { createWorker, OEM, PSM } = await import("tesseract.js");
  const kok = new URL("ocr/", document.baseURI).toString().replace(/\/$/, "");
  const worker = await createWorker("tur", OEM.LSTM_ONLY, {
    workerPath: `${kok}/worker.min.js`,
    corePath: `${kok}/core`,
    langPath: kok,
    logger: (m) => ilerleme({ durum: m.status, oran: Math.max(0, Math.min(1, m.progress ?? 0)) }),
  });
  try {
    await worker.setParameters({
      tessedit_pageseg_mode: mod === "siir" ? PSM.SINGLE_BLOCK : PSM.AUTO,
      preserve_interword_spaces: "1",
    });
    const { data } = await worker.recognize(gorsel);
    return { metin: ocrMetniniTemizle(data.text, mod), guven: data.confidence };
  } finally {
    await worker.terminate();
  }
}

export async function ocrGorseliHazirla(file: File): Promise<string> {
  if (file.size > 25 * 1024 * 1024) throw new Error("OCR kaynağı 25 MB sınırını aşıyor.");
  if (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")) {
    const pdfjs = await import("pdfjs-dist");
    pdfjs.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/build/pdf.worker.mjs", import.meta.url).toString();
    const belge = await pdfjs.getDocument({ data: await file.arrayBuffer() }).promise;
    const sayfa = await belge.getPage(1);
    const gorunum = sayfa.getViewport({ scale: 2 });
    const canvas = document.createElement("canvas");
    canvas.width = Math.ceil(gorunum.width); canvas.height = Math.ceil(gorunum.height);
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("PDF sayfası çizilemedi.");
    await sayfa.render({ canvasContext: ctx, viewport: gorunum }).promise;
    return canvas.toDataURL("image/png");
  }
  if (!file.type.startsWith("image/")) throw new Error("Lütfen JPG, PNG, WebP veya PDF seçin.");
  return await new Promise((resolve, reject) => {
    const okuyucu = new FileReader();
    okuyucu.onload = () => resolve(String(okuyucu.result));
    okuyucu.onerror = () => reject(new Error("Görsel okunamadı."));
    okuyucu.readAsDataURL(file);
  });
}

export async function gorseliDondur(dataUrl: string): Promise<string> {
  const img = new Image();
  await new Promise<void>((resolve, reject) => { img.onload = () => resolve(); img.onerror = () => reject(new Error("Görsel döndürülemedi.")); img.src = dataUrl; });
  const canvas = document.createElement("canvas"); canvas.width = img.naturalHeight; canvas.height = img.naturalWidth;
  const ctx = canvas.getContext("2d"); if (!ctx) throw new Error("Görsel döndürülemedi.");
  ctx.translate(canvas.width, 0); ctx.rotate(Math.PI / 2); ctx.drawImage(img, 0, 0);
  return canvas.toDataURL("image/png");
}

export type OcrKirpma = { x: number; y: number; genislik: number; yukseklik: number };

export async function gorseliKirp(dataUrl: string, alan: OcrKirpma): Promise<string> {
  const img = new Image();
  await new Promise<void>((resolve, reject) => { img.onload = () => resolve(); img.onerror = () => reject(new Error("Seçili alan hazırlanamadı.")); img.src = dataUrl; });
  const x = Math.round(alan.x * img.naturalWidth);
  const y = Math.round(alan.y * img.naturalHeight);
  const genislik = Math.max(1, Math.round(alan.genislik * img.naturalWidth));
  const yukseklik = Math.max(1, Math.round(alan.yukseklik * img.naturalHeight));
  const canvas = document.createElement("canvas"); canvas.width = genislik; canvas.height = yukseklik;
  const ctx = canvas.getContext("2d"); if (!ctx) throw new Error("Seçili alan hazırlanamadı.");
  ctx.drawImage(img, x, y, genislik, yukseklik, 0, 0, genislik, yukseklik);
  return canvas.toDataURL("image/png");
}
