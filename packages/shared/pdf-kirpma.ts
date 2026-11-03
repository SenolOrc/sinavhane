// packages/shared/pdf-kirpma.ts
// PDF sayfası üzerinde alan seçme/kırpma için SAF mantık — pdfjs-dist'i
// İMPORT ETMEZ, yalnızca yapısal bir { getViewport, render } tipi alır (PdfKaynakModal'ın
// kendi tipiyle aynı kalıp, bkz. YapisalPdfSayfa). İki tüketicisi var:
// sinav-olusturucu/components/PdfKaynakModal.tsx (mevcut, davranışı aynı kalır) ve
// modules/ders-kitabi (yeni). Ortak mantık modüller birbirinin kodunu çağırmasın diye
// buraya çıkarıldı (CLAUDE.md mimari sınırı).

export type Dikdortgen = { x: number; y: number; w: number; h: number };

/** Negatif genişlik/yükseklikle (sağdan sola / aşağıdan yukarı sürükleme) çizilen bir
 * dikdörtgeni normal hale getirir (pozitif w/h, sol-üst köşeli). */
export function dikdortgenNormalle(d: Dikdortgen): Dikdortgen {
  return {
    x: d.w < 0 ? d.x + d.w : d.x,
    y: d.h < 0 ? d.y + d.h : d.y,
    w: Math.abs(d.w),
    h: Math.abs(d.h),
  };
}

/** clientX/Y'yi (pointer olayı) bir dikdörtgenin (ör. canvas.getBoundingClientRect())
 * İÇİNE sıkıştırılmış yerel koordinata çevirir. */
export function noktaYereleCevir(
  clientX: number,
  clientY: number,
  kutu: { left: number; top: number; width: number; height: number },
): { x: number; y: number } {
  return {
    x: Math.min(Math.max(clientX - kutu.left, 0), kutu.width),
    y: Math.min(Math.max(clientY - kutu.top, 0), kutu.height),
  };
}

/** CSS-piksel uzayındaki bir seçim dikdörtgenini canvas'ın GERÇEK piksel
 * ızgarasına (canvas.width/height, yüksek-DPI'de CSS boyutundan farklı olabilir) çevirir. */
export function secimCanvasPikseline(
  secim: Dikdortgen,
  cssKutu: { width: number; height: number },
  canvasPiksel: { width: number; height: number },
): Dikdortgen {
  return {
    x: Math.round((secim.x / cssKutu.width) * canvasPiksel.width),
    y: Math.round((secim.y / cssKutu.height) * canvasPiksel.height),
    w: Math.round((secim.w / cssKutu.width) * canvasPiksel.width),
    h: Math.round((secim.h / cssKutu.height) * canvasPiksel.height),
  };
}

/** Bir (GERÇEK piksel uzayındaki) kutuyu 0-1 aralığında NORMALİZE eder — kırpmalar
 * tablosundaki x/y/w/h saklama biçiminin temeli (zoom/render çözünürlüğünden bağımsız). */
export function kutuNormallestir(pikselKutu: Dikdortgen, konteyner: { width: number; height: number }): Dikdortgen {
  return {
    x: pikselKutu.x / konteyner.width,
    y: pikselKutu.y / konteyner.height,
    w: pikselKutu.w / konteyner.width,
    h: pikselKutu.h / konteyner.height,
  };
}

/** Normalize (0-1) bir kutuyu bir konteynerin piksel boyutuna göre geri açar. */
export function kutuGenislet(normalizeKutu: Dikdortgen, konteyner: { width: number; height: number }): Dikdortgen {
  return {
    x: normalizeKutu.x * konteyner.width,
    y: normalizeKutu.y * konteyner.height,
    w: normalizeKutu.w * konteyner.width,
    h: normalizeKutu.h * konteyner.height,
  };
}

/** Zaten render edilmiş bir canvas'tan, GERÇEK piksel uzayındaki bir kutuyu PNG
 * dataURL olarak kırpar (PdfKaynakModal'ın "önce tam sayfayı render et, sonra
 * kırp" akışı). */
export function canvasBolgesiniKirp(
  canvas: HTMLCanvasElement,
  pikselKutu: Dikdortgen,
): { dataUrl: string; oran: number } {
  if (pikselKutu.w < 8 || pikselKutu.h < 8) throw new Error("Seçim çok küçük.");
  const out = document.createElement("canvas");
  out.width = pikselKutu.w;
  out.height = pikselKutu.h;
  const ctx = out.getContext("2d");
  if (!ctx) throw new Error("Canvas oluşturulamadı.");
  ctx.drawImage(canvas, pikselKutu.x, pikselKutu.y, pikselKutu.w, pikselKutu.h, 0, 0, pikselKutu.w, pikselKutu.h);
  return { dataUrl: out.toDataURL("image/png"), oran: pikselKutu.w / Math.max(1, pikselKutu.h) };
}

// ─── Bölgesel render (Ders Kitabı — şişme-karşıtı tasarımın temeli) ────────
// Tüm sayfayı yüksek çözünürlükte rasterize edip SONRA kırpmak yerine, pdf.js'in
// render(transform) parametresiyle YALNIZCA kırpma bölgesi hedef boyutta çizilir —
// canvas hiçbir zaman sayfa-boyutunda ayrılmaz (RAM'i yakan asıl şey budur).

export type YapisalPdfViewport = { width: number; height: number };
export type YapisalPdfSayfa = {
  getViewport: (args: { scale: number }) => YapisalPdfViewport;
  render: (args: {
    canvasContext: CanvasRenderingContext2D;
    viewport: YapisalPdfViewport;
    transform?: number[];
  }) => { promise: Promise<void> };
};

/** Saf hesap: normalize bir bölgeyi hedef uzun-kenar pikseline sığdıracak ölçeği
 * bulur. DOM/pdfjs'e dokunmaz — birim testle doğrulanabilir. */
export function bolgeselRenderOlcegiHesapla(
  normalizeKutu: Dikdortgen,
  sayfaOlcek1Boyutu: { width: number; height: number },
  hedefUzunKenarPx: number,
): { olcek: number; cikti: { w: number; h: number } } {
  const kutuW1 = normalizeKutu.w * sayfaOlcek1Boyutu.width;
  const kutuH1 = normalizeKutu.h * sayfaOlcek1Boyutu.height;
  const olcek = hedefUzunKenarPx / Math.max(kutuW1, kutuH1, 1);
  return {
    olcek,
    cikti: { w: Math.max(1, Math.round(kutuW1 * olcek)), h: Math.max(1, Math.round(kutuH1 * olcek)) },
  };
}

/** Bir PDF sayfasının yalnızca normalize edilmiş bir bölgesini, hedef uzun-kenar
 * pikseline göre ölçeklenmiş bir canvas'a render eder. pdfjs-dist İMPORT ETMEZ —
 * çağıran taraf (pdf.js'ten gelen gerçek) sayfayı bu yapısal tiple verir. */
export async function sayfaBolgesiniRenderEt(
  sayfa: YapisalPdfSayfa,
  normalizeKutu: Dikdortgen,
  hedefUzunKenarPx: number,
): Promise<HTMLCanvasElement> {
  const taban = sayfa.getViewport({ scale: 1 });
  const { olcek, cikti } = bolgeselRenderOlcegiHesapla(normalizeKutu, taban, hedefUzunKenarPx);
  const tamViewport = sayfa.getViewport({ scale: olcek });
  const ofsetX = normalizeKutu.x * tamViewport.width;
  const ofsetY = normalizeKutu.y * tamViewport.height;
  const canvas = document.createElement("canvas");
  canvas.width = cikti.w;
  canvas.height = cikti.h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas oluşturulamadı.");
  await sayfa.render({
    canvasContext: ctx,
    viewport: tamViewport,
    transform: [1, 0, 0, 1, -ofsetX, -ofsetY],
  }).promise;
  return canvas;
}
