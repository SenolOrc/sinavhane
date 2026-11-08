// Coğrafya şekilleri girişi: tek tür ("cografya") altında dokuz yapı.
import { aydinlanmaCiz, mevsimCiz } from "./dunya";
import { piramitCiz, walterCiz } from "./grafik";
import { haritaCiz } from "./harita";
import { izohipsCiz } from "./izohips";
import { horstGrabenCiz, kivrimCiz } from "./jeoloji";
import type { CografyaVerisi } from "./sema";

export * from "./sema";
export type Kutu = { x: number; y: number; w: number; h: number };

export function cografyaCiz(ctx: CanvasRenderingContext2D, v: CografyaVerisi, k: Kutu) {
  switch (v.yapi) {
    case "harita": return haritaCiz(ctx, v, k);
    case "izohips": return izohipsCiz(ctx, v, k);
    case "horstGraben": return horstGrabenCiz(ctx, v, k);
    case "antiklinal": case "senklinal": return kivrimCiz(ctx, v, k);
    case "walter": return walterCiz(ctx, v, k);
    case "piramit": return piramitCiz(ctx, v, k);
    case "mevsim": return mevsimCiz(ctx, v, k);
    case "aydinlanma": return aydinlanmaCiz(ctx, v, k);
  }
}

/** Her yapının önerilen kutu boyutu (px). */
export const COGRAFYA_BOYUTLARI: Record<CografyaVerisi["yapi"], { w: number; h: number }> = {
  harita: { w: 520, h: 250 }, izohips: { w: 300, h: 260 }, horstGraben: { w: 300, h: 230 }, antiklinal: { w: 300, h: 230 }, senklinal: { w: 300, h: 230 },
  walter: { w: 340, h: 230 }, piramit: { w: 320, h: 260 }, mevsim: { w: 460, h: 260 }, aydinlanma: { w: 420, h: 260 },
};
