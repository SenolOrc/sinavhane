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

type TelDurumu = {
  /** Alan: "giren" ⊗, "cikan" ⊙ ya da çizgi yönü. */
  alan: "giren" | "cikan" | "sag" | "sol" | "yukari" | "asagi";
  /** Telin yatayla yaptığı açı (derece; yukarı eğik pozitif). 90 = dik (düşey), 0 = yatay. */
  aci: number;
  /** Akım tersi (←/↓). */
  ters?: boolean;
  aciGoster?: boolean;
  /** Tel yerine kesit (⊙/⊗). */
  kesit?: "cikan" | "giren";
};

/**
 * Hazır sahne: "Manyetik kuvvet: 6 panel (tel ve alan)" (MEB 11. sınıf, s. 227 görünümü).
 * 2×3 numaralı (①…⑥) panel; her hücrede ALAN (⊗ ⊙ ya da oklu çizgiler) ve ÜSTÜNE akım taşıyan tel.
 * Çizim sırası: panel → alan → tel (telin beyaz dolgusu altındaki simgeleri örter).
 */
export function manyetikKuvvetPanelSahnesi(): Sekil[] {
  const geo = varsayilanCografya("panelIzgara", { satir: 2, sutun: 3, baslik: "daire", yer: "ust", aralik: 14 });
  const kutu = { x: 20, y: 20, w: 600, h: 400 };
  const panel: FizikSekli = { id: "mk-panel", tur: "fizik", nesne: "fizikSekil", kalinlik: 2, ...kutu, geo };
  const sekiller: Sekil[] = [panel];
  const durumlar: TelDurumu[] = [
    { alan: "cikan", aci: 90 },                                  // 1: ⊙, tel alana dik (düşey)
    { alan: "asagi", aci: 30, aciGoster: true },                 // 2: alan çizgileri ↓, 30° eğik
    { alan: "giren", aci: 0 },                                   // 3: ⊗, yatay tel
    { alan: "yukari", aci: 90 },                                 // 4: alan ↑, tel alana paralel
    { alan: "cikan", aci: 30, aciGoster: true },                 // 5: ⊙, 30° eğik
    { alan: "sol", aci: 0, kesit: "giren" },                     // 6: alan ←, tel kesiti ⊗ (sayfaya giren akım)
  ];
  panelHucreleriVeriden(geo, kutu).forEach((h, i) => {
    const d = durumlar[i];
    const c = h.cerceve;
    const ic = { x: Math.round(c.x + 30), y: Math.round(c.y + 34), w: Math.round(c.w - 30 - 6), h: Math.round(c.h - 34 - 4) };
    const cizgili = d.alan !== "giren" && d.alan !== "cikan";
    const alan: FizikSekli = {
      id: `mk-alan-${i + 1}`, tur: "fizik", nesne: "alanNokta", kalinlik: 2, ...ic,
      etiket: "vec(B)", etiketYeri: "sol",
      ek: cizgili ? { sayi: 5, sayi2: 5, metin: d.alan } : { sayi: 2, sayi2: 2, ters: d.alan === "giren" },
    };
    sekiller.push(alan);
    const cx = ic.x + ic.w / 2, cy = ic.y + ic.h / 2;
    if (d.kesit) {
      sekiller.push({
        id: `mk-tel-${i + 1}`, tur: "fizik", nesne: "akimliTel", kalinlik: 2, x: cx - 25, y: cy - 15, w: 50, h: 30,
        etiket: "i", etiketYeri: "ust", ek: { metin: d.kesit, sayi: 7 },
      });
      return;
    }
    // Eğik telin uçları ⊗/⊙ simgelerine değmesin diye kısa tutulur.
    const boy = Math.round(Math.min(ic.h * 0.86, ic.w * 0.86, d.aci % 90 === 0 ? 120 : 90));
    sekiller.push({
      id: `mk-tel-${i + 1}`, tur: "fizik", nesne: "akimliTel", kalinlik: 2, x: Math.round(cx - boy / 2), y: Math.round(cy - 15), w: boy, h: 30,
      etiket: "i", etiketYeri: "ust", donus: -d.aci, ek: { sayi: 7, sayi2: d.aciGoster ? 1 : 0, ...(d.ters ? { ters: true } : {}) },
    });
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
  {
    id: "panel-manyetik-kuvvet-2x3",
    ad: "Manyetik kuvvet: 6 panel (tel ve alan)",
    ipucu: "①–⑥ numaralı 2×3 panel; her birinde manyetik alan (⊗ ⊙ ya da oklu çizgiler) ve üstünde akım taşıyan tel (dik, 30° eğik, paralel, kesit) ve i etiketi",
    aramaKelimeleri: ["panel", "çoklu panel", "manyetik kuvvet", "manyetik alan", "tel", "akım", "iletken", "akım taşıyan tel", "⊗", "⊙", "giren çıkan", "2x3", "şık", "B·i·L"],
    olustur: manyetikKuvvetPanelSahnesi,
  },
];
