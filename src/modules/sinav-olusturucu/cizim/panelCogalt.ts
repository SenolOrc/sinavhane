// "Panellere çoğalt": bir panel ızgarasının BİR hücresindeki seçili şekilleri, öbür hücrelerin her birinde
// AYNI göreli konuma kopyalar (tel + ⊗ alanı + etiket gibi bir düzeneği altı panele tek hamlede yayar).
//
// Saf mantık (React yok): editör sonucu tek bir geçmiş adımı olarak uygular → Ctrl+Z hepsini geri alır.
// Kopyalar yeni kimlik alır; aralarındaki bağlayıcılar kendi kopyalarına bağlanır (kimlikleriYenile), seçim
// dışına bağlı uçlar serbest noktaya döner (disUclariSerbestBirak) — Ctrl+D ile aynı kurallar.
import type { Sekil } from "./tipler";
import {
  baglayiciYolu,
  disUclariSerbestBirak,
  kimlikleriYenile,
  panelZeminiMi,
  seciliBaglayicilarlaGenislet,
  sekilTasi,
} from "./geometri";
import { sekilSinirlari } from "./sinirlar";
import { panelHucreleriVeriden, type PanelHucre } from "./cografya/panelIzgara";

type FizikSekli = Extract<Sekil, { tur: "fizik" }>;

export type PanelSecimi = {
  panel: FizikSekli;
  /** Seçimin içinde bulunduğu hücre. */
  hucre: PanelHucre;
  hucreler: PanelHucre[];
};

/** Panel şeklinin hücreleri (kutu = şeklin kutusu). Döndürülmüş panelde null: hücreler eksene hizalı değil. */
export function panelSekliHucreleri(s: Sekil): PanelHucre[] | null {
  if (!panelZeminiMi(s) || s.tur !== "fizik" || s.geo?.tur !== "cografya") return null;
  if (Math.abs(s.donus ?? 0) > 0.01) return null;
  return panelHucreleriVeriden(s.geo, { x: s.x, y: s.y, w: s.w, h: s.h });
}

/** Seçilen şekillerin (bağlayıcılar yolundan) birleşik sınırı; yalnız bağlayıcı seçiliyse yolundan. */
function secimSiniri(ctx: CanvasRenderingContext2D, secilenler: Sekil[], tum: Sekil[]) {
  const kutular: { x: number; y: number; w: number; h: number }[] = [];
  for (const s of secilenler) {
    if (s.tur !== "baglayici") { kutular.push(sekilSinirlari(ctx, s)); continue; }
    const yol = baglayiciYolu(tum, s);
    if (!yol || !yol.length) continue;
    const xs = yol.map((p) => p.x), ys = yol.map((p) => p.y);
    kutular.push({ x: Math.min(...xs), y: Math.min(...ys), w: Math.max(...xs) - Math.min(...xs), h: Math.max(...ys) - Math.min(...ys) });
  }
  if (!kutular.length) return null;
  const x = Math.min(...kutular.map((k) => k.x)), y = Math.min(...kutular.map((k) => k.y));
  const sag = Math.max(...kutular.map((k) => k.x + k.w)), alt = Math.max(...kutular.map((k) => k.y + k.h));
  return { x, y, w: sag - x, h: alt - y };
}

/**
 * Seçim bir panel ızgarasının tek bir hücresinin içindeyse (birleşik sınırın MERKEZİ hücrede) o paneli ve
 * hücreyi döndürür; değilse null (eylem gizlenir). Panelin kendisi seçimdeyse de null.
 */
export function secimPaneli(ctx: CanvasRenderingContext2D, sekiller: Sekil[], seciliIds: string[]): PanelSecimi | null {
  if (!seciliIds.length) return null;
  const paneller = sekiller.filter((s) => panelSekliHucreleri(s) !== null);
  if (!paneller.length) return null;
  const ids = new Set(seciliBaglayicilarlaGenislet(seciliIds, sekiller));
  const secilenler = sekiller.filter((s) => ids.has(s.id));
  if (!secilenler.length || secilenler.some((s) => panelZeminiMi(s))) return null;
  const sinir = secimSiniri(ctx, secilenler, sekiller);
  if (!sinir) return null;
  const mx = sinir.x + sinir.w / 2, my = sinir.y + sinir.h / 2;
  for (let i = paneller.length - 1; i >= 0; i -= 1) {
    const panel = paneller[i] as FizikSekli;
    const hucreler = panelSekliHucreleri(panel)!;
    if (hucreler.length < 2) continue;
    const hucre = hucreler.find((h) => mx >= h.yuva.x && mx <= h.yuva.x + h.yuva.w && my >= h.yuva.y && my <= h.yuva.y + h.yuva.h);
    if (hucre) return { panel, hucre, hucreler };
  }
  return null;
}

export type PanelCogaltSonucu = {
  /** Tüm şekiller (eskiler + kopyalar sona eklenmiş). */
  sekiller: Sekil[];
  /** Yalnız yeni kopyalar. */
  eklenen: Sekil[];
  /** Kopyalanan hücrelerin indeksleri (kaynak hariç). */
  hedefHucreler: number[];
};

/**
 * Seçimi kaynak hücreden her DİĞER hücreye, hücrenin sol-üst köşesine göre aynı konumda kopyalar. Seçim
 * panel hücresinde değilse null. Girdi dizilerini DEĞİŞTİRMEZ (geri al geçmişi referans tutuyor).
 */
export function panellereCogalt(
  ctx: CanvasRenderingContext2D,
  sekiller: Sekil[],
  seciliIds: string[],
  yeniId?: () => string,
): PanelCogaltSonucu | null {
  const sec = secimPaneli(ctx, sekiller, seciliIds);
  if (!sec) return null;
  const ids = new Set(seciliBaglayicilarlaGenislet(seciliIds, sekiller));
  const kume = disUclariSerbestBirak(sekiller.filter((s) => ids.has(s.id)), sekiller);
  if (!kume.length) return null;
  const eklenen: Sekil[] = [];
  const hedefHucreler: number[] = [];
  for (const h of sec.hucreler) {
    if (h.indeks === sec.hucre.indeks) continue;
    const dx = h.yuva.x - sec.hucre.yuva.x, dy = h.yuva.y - sec.hucre.yuva.y;
    const kopya = (yeniId ? kimlikleriYenile(kume, yeniId) : kimlikleriYenile(kume)).map((s) => sekilTasi(s, dx, dy));
    eklenen.push(...kopya);
    hedefHucreler.push(h.indeks);
  }
  return { sekiller: [...sekiller, ...eklenen], eklenen, hedefHucreler };
}
