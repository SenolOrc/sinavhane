// Çizim PNG'sini dışa aktarırken BOŞ kenarları kırpar.
//
// NEDEN: şekil sınırları nesnenin kutusundan (ör. gövde-yaprak/kutu/sayı doğrusu
// şemalarının 320×200 tuvali) hesaplanıyor; asıl çizim bunun küçük bir kısmını
// kaplayınca kâğıda büyük bir boş alanla basılıyor ve sayfa/sütun israf oluyor
// (şekil de küçük kalıyor). Vektör sınırı yerine ÇİZİLMİŞ PİKSELLERE bakılır:
// tek doğru kaynak, gerçekten mürekkep olan alandır.

/** Beyaz sayılan en düşük kanal değeri; altı "mürekkep". */
const BEYAZ_ESIGI = 248;

/**
 * `kaynak` beyaz zeminli bir tuvaldir. İçeriğin (beyaz olmayan piksellerin)
 * sınırlayıcı kutusu + `payPx` ile kırpılmış YENİ tuval döner. İçerik yoksa ya da
 * kırpma bir şey kazandırmıyorsa kaynağın kendisi döner.
 * `payPx` tuval pikseli cinsindendir (3× kalitede 8 CSS px = 24).
 */
export function icerigeKirp(kaynak: HTMLCanvasElement, payPx: number): HTMLCanvasElement {
  const ctx = kaynak.getContext("2d");
  const w = kaynak.width;
  const h = kaynak.height;
  if (!ctx || w < 2 || h < 2) return kaynak;
  let veri: Uint8ClampedArray;
  try {
    veri = ctx.getImageData(0, 0, w, h).data;
  } catch {
    return kaynak; // tuval kirlenmişse (cross-origin) kırpmadan devam
  }
  if (!veri || veri.length < w * h * 4) return kaynak; // sahte/boş tuval (test ortamı)
  let minX = w;
  let minY = h;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < h; y++) {
    const satir = y * w * 4;
    for (let x = 0; x < w; x++) {
      const i = satir + x * 4;
      if (veri[i + 3] > 8 && (veri[i] < BEYAZ_ESIGI || veri[i + 1] < BEYAZ_ESIGI || veri[i + 2] < BEYAZ_ESIGI)) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (maxX < 0) return kaynak;
  const x0 = Math.max(0, minX - payPx);
  const y0 = Math.max(0, minY - payPx);
  const x1 = Math.min(w, maxX + 1 + payPx);
  const y1 = Math.min(h, maxY + 1 + payPx);
  const yw = x1 - x0;
  const yh = y1 - y0;
  // Kazanç yoksa (ya da bozuk ölçü) yeni tuval üretme.
  if (yw >= w - 2 && yh >= h - 2) return kaynak;
  if (yw < 8 || yh < 8) return kaynak;
  const hedef = document.createElement("canvas");
  hedef.width = yw;
  hedef.height = yh;
  const hctx = hedef.getContext("2d");
  if (!hctx) return kaynak;
  hctx.fillStyle = "#ffffff";
  hctx.fillRect(0, 0, yw, yh);
  hctx.drawImage(kaynak, x0, y0, yw, yh, 0, 0, yw, yh);
  return hedef;
}
