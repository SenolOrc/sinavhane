// Panel ızgarası (çoklu panel): aynı düzeneğin I, II, III ya da ①…⑥ varyantlarını yan yana gösteren
// çerçeveli kutular. Ders kitaplarındaki "I. durum / II. durum / III. durum" ve numaralı 3×2 panel dizilimi.
//
// Bu dosya SAF geometridir (tuval gerekmez): hücre dikdörtgenleri, başlık yazıları ve vuruş uzaklığı.
// Çizim `panelIzgaraCiz`de; "Panellere çoğalt" eylemi hücre dikdörtgenlerini `panelCogalt.ts`ten kullanır.
//
// Panel ızgarası bir ZEMİNdir (kareli alan gibi): her şeyin altında çizilir, yalnız çerçeve çizgilerine
// yakın tıklamada seçilir; içine konan şekillere/vektörlere tıklamayı çalmaz.
import { fizikMetniCiz } from "../fizik";
import { ayarMantik, ayarMetin, ayarSayi, ayarSec, type CografyaVerisi } from "./sema";
import { bol, dolgu, type Kutu } from "./fizikYardim";

type Ctx = CanvasRenderingContext2D;

export type PanelOzellik = {
  satir: number;
  sutun: number;
  aralik: number;
  cerceve: boolean;
  dolgu: boolean;
  baslik: string;
  yer: "ust" | "alt";
  punto: number;
  ozel: string;
};

export type PanelHucre = {
  /** 0'dan başlayan sıra: soldan sağa, sonra yukarıdan aşağıya. */
  indeks: number;
  satir: number;
  sutun: number;
  /** Hücrenin tamamı (başlık bandı dâhil). */
  yuva: Kutu;
  /** Çerçeve / içerik alanı (başlık bandı hariç). */
  cerceve: Kutu;
  /** Çerçevenin dışındaki başlık bandı; başlık çerçevenin içindeyse ya da yoksa null. */
  bant: Kutu | null;
};

export const PANEL_YAPISI = "panelIzgara";

/** Çerçevenin DIŞINA yazılan başlık biçimleri (bant ayrılır). */
const BANTLI = ["roman", "romanDurum", "sayi", "durum", "ozel"];

export function panelOzellikleri(v: CografyaVerisi): PanelOzellik {
  return {
    satir: Math.round(ayarSayi(v, "satir")),
    sutun: Math.round(ayarSayi(v, "sutun")),
    aralik: ayarSayi(v, "aralik"),
    cerceve: ayarMantik(v, "cerceve"),
    dolgu: ayarMantik(v, "dolgu"),
    baslik: ayarSec(v, "baslik"),
    yer: ayarSec(v, "yer") === "alt" ? "alt" : "ust",
    punto: ayarSayi(v, "punto"),
    ozel: ayarMetin(v, "basliklar"),
  };
}

// ── Başlık yazıları ────────────────────────────────────────────────────────

/** 1 → I, 4 → IV, 12 → XII (1–3999). */
export function romenRakami(n: number): string {
  let kalan = Math.max(1, Math.min(3999, Math.round(n)));
  const t: [number, string][] = [[1000, "M"], [900, "CM"], [500, "D"], [400, "CD"], [100, "C"], [90, "XC"], [50, "L"], [40, "XL"], [10, "X"], [9, "IX"], [5, "V"], [4, "IV"], [1, "I"]];
  let s = "";
  for (const [d, r] of t) while (kalan >= d) { s += r; kalan -= d; }
  return s;
}

/** 1 → ①, 12 → ⑫, 20 → ⑳; 20'den büyükse düz sayı. */
export function daireliSayi(n: number): string {
  const i = Math.round(n);
  return i >= 1 && i <= 20 ? String.fromCodePoint(0x2460 + i - 1) : String(i);
}

/** Tek bir panelin başlığı (1'den başlayan sıra). Özel başlıkta sıradaki yazı, yoksa boş. */
export function panelBasligi(tur: string, n: number, ozel = ""): string {
  switch (tur) {
    case "roman": return romenRakami(n);
    case "romanDurum": return `${romenRakami(n)}. durum`;
    case "daire": return daireliSayi(n);
    case "sayi": return String(n);
    case "durum": return `${n}. Durum`;
    case "ozel": return bol(ozel)[n - 1] ?? "";
    default: return "";
  }
}

/** Her panel için başlık yazısı ("yok" ise boş dizgiler). */
export function panelBasliklari(v: CografyaVerisi): string[] {
  const o = panelOzellikleri(v);
  return Array.from({ length: o.satir * o.sutun }, (_, i) => panelBasligi(o.baslik, i + 1, o.ozel));
}

// ── Hücre geometrisi ───────────────────────────────────────────────────────

/** Başlık bandının yüksekliği (başlık çerçevenin dışındaysa). */
export function panelBantYuksekligi(o: PanelOzellik): number {
  if (!BANTLI.includes(o.baslik)) return 0;
  if (o.baslik === "ozel" && !o.ozel.split(",").some((t) => t.trim())) return 0;
  return Math.max(14, Math.round(o.punto * 1.35) + 4);
}

/** Satır × sütun hücrelerin dikdörtgenleri (kutu k içinde, aralık = hücreler arası boşluk). */
export function panelHucreleri(o: PanelOzellik, k: Kutu): PanelHucre[] {
  const yw = (k.w - o.aralik * (o.sutun - 1)) / o.sutun;
  const yh = (k.h - o.aralik * (o.satir - 1)) / o.satir;
  const bant = Math.min(panelBantYuksekligi(o), Math.max(0, yh - 8));
  const liste: PanelHucre[] = [];
  for (let r = 0; r < o.satir; r += 1) {
    for (let c = 0; c < o.sutun; c += 1) {
      const yuva = { x: k.x + c * (yw + o.aralik), y: k.y + r * (yh + o.aralik), w: yw, h: yh };
      const ust = o.yer === "ust";
      const cerceve = { x: yuva.x, y: yuva.y + (ust ? bant : 0), w: yw, h: yh - bant };
      const bantK = bant > 0 ? { x: yuva.x, y: ust ? yuva.y : yuva.y + yh - bant, w: yw, h: bant } : null;
      liste.push({ indeks: r * o.sutun + c, satir: r, sutun: c, yuva, cerceve, bant: bantK });
    }
  }
  return liste;
}

/** Verilen veri ve kutuya göre hücreler (kısayol). */
export const panelHucreleriVeriden = (v: CografyaVerisi, k: Kutu) => panelHucreleri(panelOzellikleri(v), k);

/** Önerilen kutu boyutu: hücre başına ~180×140 px; satır/sütun/aralığa göre. */
export function panelBoyutu(v: CografyaVerisi): { w: number; h: number } {
  const o = panelOzellikleri(v);
  const hw = Math.max(120, Math.min(190, Math.floor((600 - o.aralik * (o.sutun - 1)) / o.sutun)));
  const hh = Math.round(hw * 0.78) + panelBantYuksekligi(o);
  return { w: Math.round(hw * o.sutun + o.aralik * (o.sutun - 1)), h: Math.round(hh * o.satir + o.aralik * (o.satir - 1)) };
}

/** p noktasının dikdörtgen ÇİZGİSİNE uzaklığı (içeride kenara, dışarıda köşeye/kenara). */
function dikdortgenCizgisineUzaklik(p: { x: number; y: number }, r: Kutu): number {
  const dx = Math.max(r.x - p.x, 0, p.x - (r.x + r.w));
  const dy = Math.max(r.y - p.y, 0, p.y - (r.y + r.h));
  if (dx > 0 || dy > 0) return Math.hypot(dx, dy);
  return Math.min(p.x - r.x, r.x + r.w - p.x, p.y - r.y, r.y + r.h - p.y);
}

/**
 * Vuruş testi için uzaklık (dönüşsüz/yerel nokta): yalnız çerçeve çizgilerine ve başlık bantlarına
 * yakınlık sayılır; panellerin İÇİ boştur — içindeki cisimlere tıklamayı çalmaz.
 */
export function panelKenarUzakligi(v: CografyaVerisi, k: Kutu, p: { x: number; y: number }): number {
  const o = panelOzellikleri(v);
  const bas = panelBasliklari(v);
  let en = Infinity;
  for (const h of panelHucreleri(o, k)) {
    if (h.bant && bas[h.indeks] && p.x >= h.bant.x && p.x <= h.bant.x + h.bant.w && p.y >= h.bant.y && p.y <= h.bant.y + h.bant.h) return 0;
    en = Math.min(en, dikdortgenCizgisineUzaklik(p, h.cerceve));
  }
  return en;
}

// ── Çizim ──────────────────────────────────────────────────────────────────

export function panelIzgaraCiz(ctx: Ctx, v: CografyaVerisi, k: Kutu) {
  const o = panelOzellikleri(v);
  const hucreler = panelHucreleri(o, k);
  const bas = panelBasliklari(v);
  const kal = ctx.lineWidth;
  ctx.save();
  ctx.lineJoin = "round";
  ctx.setLineDash([]);
  for (const h of hucreler) {
    const f = h.cerceve;
    if (o.dolgu) dolgu(ctx, () => ctx.fillRect(f.x, f.y, f.w, f.h), "#f0f0f0");
    if (o.cerceve) {
      ctx.save();
      ctx.lineWidth = Math.max(0.9, Math.min(1.3, kal * 0.7));
      ctx.beginPath();
      ctx.rect(Math.round(f.x) + 0.5, Math.round(f.y) + 0.5, Math.round(f.w) - 1, Math.round(f.h) - 1);
      ctx.stroke();
      ctx.restore();
    }
    const yazi = bas[h.indeks];
    if (!yazi) continue;
    if (o.baslik === "daire") {
      // Çerçevenin içinde, üst (ya da alt) ortada daire içinde sayı: harf tipinden bağımsız, siyah-beyaz baskıya uygun.
      const r = Math.max(8, o.punto * 0.85), cx = f.x + f.w / 2;
      const cy = o.yer === "ust" ? f.y + r + 5 : f.y + f.h - r - 5;
      ctx.save();
      ctx.fillStyle = "#ffffff";
      ctx.lineWidth = Math.max(0.9, Math.min(1.3, kal * 0.7));
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.restore();
      fizikMetniCiz(ctx, String(h.indeks + 1), cx, cy, o.punto * 0.9);
    } else if (h.bant) {
      fizikMetniCiz(ctx, yazi, h.bant.x + h.bant.w / 2, h.bant.y + h.bant.h / 2, o.punto, "orta", undefined, h.bant.w - 6);
    }
  }
  ctx.restore();
}
