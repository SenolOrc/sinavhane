// Hazır sahne: panel ızgarası + her panelde BOŞ eksenli grafik (2×3: x–t, v–t, a–t, x–t, v–t, a–t).
// Panel zemin olarak altta kalır; grafikler ayrı şekillerdir (tek tek seçilip düzenlenir). Yalnız VERİ üretir.
import type { GrafikVerisi, Sekil } from "./tipler";
import { varsayilanCografya } from "./cografya/sema";
import { panelHucreleriVeriden } from "./cografya/panelIzgara";
import type { HazirSahne } from "./sahneler";

type FizikSekli = Extract<Sekil, { tur: "fizik" }>;

const bosEksen = (yEtiket: string): GrafikVerisi => ({
  egriler: [], xEtiket: "t", yEtiket, xMin: 0, xMax: 5, yMin: 0, yMax: 5, izgara: false, sayilar: "yok",
});

export function panelGrafikSahnesi(): Sekil[] {
  const geo = varsayilanCografya("panelIzgara", { satir: 2, sutun: 3, baslik: "roman", yer: "alt", aralik: 16 });
  const kutu = { x: 20, y: 20, w: 600, h: 330 };
  const panel: FizikSekli = { id: "pg-panel", tur: "fizik", nesne: "fizikSekil", kalinlik: 2, ...kutu, geo };
  const sekiller: Sekil[] = [panel];
  const adlar = ["x", "v", "a", "x", "v", "a"];
  panelHucreleriVeriden(geo, kutu).forEach((h, i) => {
    const c = h.cerceve;
    const g: FizikSekli = {
      id: `pg-grafik-${i + 1}`, tur: "fizik", nesne: "grafik", kalinlik: 2,
      x: Math.round(c.x + 34), y: Math.round(c.y + 34), w: Math.round(c.w - 34 - 46), h: Math.round(c.h - 34 - 26),
      grafik: bosEksen(adlar[i]),
    };
    sekiller.push(g);
  });
  return sekiller;
}

export const PANEL_HAZIR_SAHNELER: HazirSahne[] = [
  {
    id: "panel-grafik-2x3",
    ad: "2×3 boş grafik paneli (eksenli)",
    ipucu: "Altı çerçeveli panel, her birinde boş x–t, v–t, a–t ekseni; altta I–VI. Grafikleri tek tek düzenleyin",
    aramaKelimeleri: ["panel", "çoklu panel", "boş grafik", "grafik paneli", "x-t", "v-t", "a-t", "eksen", "2x3", "şık"],
    olustur: panelGrafikSahnesi,
  },
];
