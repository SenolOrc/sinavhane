// Fizik şekillerinin GERÇEK çizim sınırı (mürekkep kutusu) ve bağlayıcı tutunma noktaları.
//
// Fizik şeklinin kutusu çizimden büyük olabilir (etiket payı, boş köşeler): kutu kenarının
// ortasından başlayan bir ok havada kalır. Bu yüzden şekil bir kez gizli tuvale çizilir,
// dolu pikseller taranır ve tutunma noktası ÇİZİMİN kendi kenarından alınır:
//   üst  → en üstteki dolu satırların ortasına en yakın dolu piksel (x), alt → en alttakilerin,
//   sol  → en soldaki dolu sütunlarınki (y), sağ → en sağdakilerin.
// Tuval yoksa (testler, sunucu) sessizce null döner; çağıran kutu kenarına düşer.
//
// Döngüsel içe aktarmayı önlemek için çizici dışarıdan kaydedilir (`icerikCizicisiKaydet`).
import type { Nokta, Sekil } from "./tipler";

type FizikSekli = Extract<Sekil, { tur: "fizik" }>;

export type TutunmaYonu = "ust" | "sag" | "alt" | "sol";
export type IcerikTutunma = Record<TutunmaYonu, Nokta> & { kutu: { x: number; y: number; w: number; h: number } };

type Cizici = (ctx: CanvasRenderingContext2D, s: FizikSekli) => void;
type TuvalUretici = (w: number, h: number) => HTMLCanvasElement | null;

let cizici: Cizici | null = null;
let tuvalUretici: TuvalUretici = (w, h) => {
  if (typeof document === "undefined") return null;
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return c;
};
const onbellek = new Map<string, IcerikTutunma | null>();

export function icerikCizicisiKaydet(fn: Cizici) {
  cizici = fn;
  onbellek.clear();
}
/** Testler tuval sağlayıcısını (ör. @napi-rs/canvas) buradan verir. */
export function icerikTuvaliAyarla(fn: TuvalUretici) {
  tuvalUretici = fn;
  onbellek.clear();
}

const PAY = 60; // kutunun dışına taşan yazılar için
const ESIK = 40; // alfa eşiği
const KENAR_BOSLUGU = 2; // okun çizime yapışmaması için dışarı payı

function olc(s: FizikSekli): IcerikTutunma | null {
  if (!cizici) return null;
  const W = Math.ceil(s.w + PAY * 2), H = Math.ceil(s.h + PAY * 2);
  if (W < 4 || H < 4 || W > 2000 || H > 2000) return null;
  const tuval = tuvalUretici(W, H);
  const ctx = tuval?.getContext("2d");
  if (!tuval || !ctx) return null;
  try {
    cizici(ctx, { ...s, x: PAY, y: PAY, donus: undefined, ayna: undefined });
  } catch {
    return null;
  }
  let veri: Uint8ClampedArray;
  try {
    veri = ctx.getImageData(0, 0, W, H).data;
  } catch {
    return null;
  }
  const dolu = (x: number, y: number) => veri[(y * W + x) * 4 + 3] > ESIK;
  let x0 = W, x1 = -1, y0 = H, y1 = -1;
  for (let y = 0; y < H; y += 1) for (let x = 0; x < W; x += 1) if (dolu(x, y)) {
    if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
  }
  if (x1 < 0) return null;
  // Kenardaki dolu pikseller: ortalama alınır, ama ortalama iki ayrı çizgi (ör. üst ve alt zemin)
  // arasına düşüp boşluğa denk gelebilir; bu yüzden en yakın GERÇEK dolu piksele oturtulur.
  const satirlar = (idler: number[]) => { const a: number[] = []; for (const y of idler) for (let x = x0; x <= x1; x += 1) if (dolu(x, y)) a.push(x); return a; };
  const sutunlar = (idler: number[]) => { const a: number[] = []; for (const x of idler) for (let y = y0; y <= y1; y += 1) if (dolu(x, y)) a.push(y); return a; };
  const oturt = (liste: number[], yedek: number) => {
    if (!liste.length) return yedek;
    const ort = liste.reduce((t, v) => t + v, 0) / liste.length;
    return liste.reduce((en, v) => (Math.abs(v - ort) < Math.abs(en - ort) ? v : en), liste[0]);
  };
  const ustX = oturt(satirlar([y0, y0 + 1, y0 + 2]), (x0 + x1) / 2);
  const altX = oturt(satirlar([y1, y1 - 1, y1 - 2]), (x0 + x1) / 2);
  const solY = oturt(sutunlar([x0, x0 + 1, x0 + 2]), (y0 + y1) / 2);
  const sagY = oturt(sutunlar([x1, x1 - 1, x1 - 2]), (y0 + y1) / 2);
  // Tuval koordinatı → şekil koordinatı (şekil PAY'dan çizildi).
  const dx = s.x - PAY, dy = s.y - PAY;
  const yerel = (x: number, y: number): Nokta => ({ x: x + dx + 0.5, y: y + dy + 0.5 });
  return {
    kutu: { x: x0 + dx, y: y0 + dy, w: x1 - x0 + 1, h: y1 - y0 + 1 },
    ust: yerel(ustX, y0 - KENAR_BOSLUGU),
    alt: yerel(altX, y1 + 1 + KENAR_BOSLUGU),
    sol: yerel(x0 - KENAR_BOSLUGU, solY),
    sag: yerel(x1 + 1 + KENAR_BOSLUGU, sagY),
  };
}

/**
 * Şeklin çizim sınırına oturan tutunma noktaları (dönüşsüz, dünya koordinatında).
 * Ayna (`ayna`) çevrilmişse x'ler kutu merkezine göre yansıtılır. Ölçülemezse null.
 */
export function fizikIcerikTutunma(s: FizikSekli): IcerikTutunma | null {
  const anahtar = `${s.nesne}|${s.w}x${s.h}|${s.kalinlik}|${JSON.stringify(s.geo ?? null)}`;
  let r = onbellek.get(anahtar);
  if (r === undefined) {
    // Önbellek konumdan bağımsız: ölçüm (0,0)'a göre, sonra şeklin yerine kaydırılır.
    r = olc({ ...s, x: 0, y: 0 });
    if (onbellek.size > 200) onbellek.clear();
    onbellek.set(anahtar, r);
  }
  if (!r) return null;
  const kay = (p: Nokta): Nokta => {
    const x = s.ayna ? 2 * (s.w / 2) - p.x : p.x; // yerel (0,0) kutusunda yansıt
    return { x: x + s.x, y: p.y + s.y };
  };
  const kutuYansi = s.ayna ? { x: s.w - (r.kutu.x + r.kutu.w), y: r.kutu.y, w: r.kutu.w, h: r.kutu.h } : r.kutu;
  const sagSol = s.ayna;
  return {
    kutu: { x: kutuYansi.x + s.x, y: kutuYansi.y + s.y, w: kutuYansi.w, h: kutuYansi.h },
    ust: kay(r.ust),
    alt: kay(r.alt),
    sol: kay(sagSol ? r.sag : r.sol),
    sag: kay(sagSol ? r.sol : r.sag),
  };
}
