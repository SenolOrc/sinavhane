// Geometri şekilleriyle DOĞRUDAN etkileşim için saf yardımcılar (köşe tutamaçları,
// çift tıklama balonu). Editör (CizimEditoruModal) bunları çağırır; burada React yok.
//
// Koordinatlar DÜNYA (tuval) koordinatıdır: şeklin `donus` ve `ayna` dönüşümü
// uygulanmış hâli — fare konumu doğrudan verilebilir.
//
//   geometriKoseleri(sekil)                  → sürüklenebilir noktalar (köşe / çember noktası / dış nokta P)
//   geometriKoseTasi(sekil, i, nokta)        → i. nokta oraya taşınmış YENİ geo verisi (ya da null)
//   geometriKoseTasiSekil(sekil, i, nokta)   → aynısı + kutu yeni köşeleri kapsayacak şekilde güncellenmiş şekil
//   geometriKenarlari(sekil)                 → kenar parçaları (etiket indeksiyle)
//   geometriEnYakinKenarVeyaKose(sekil, p)   → çift tıklanan köşe/kenar
//   geometriEtiketiAyarla(geo, hedef, yama)  → köşe adı / açı etiketi-işareti / kenar etiketi-tırtığı yaz

import type { GeoAciIsareti, GeometriVerisi, Nokta, Sekil } from "./tipler";
import { cemberYerlesimi, cokgenKoseleri, geometriNesneyeUygun, geometriVerisiGecerliMi, ucgenYerlesimi, varsayilanGeometri } from "./geometriSekilleri";
import { dortgenYerlesimi } from "./geometriEk";

type FizikSekli = Extract<Sekil, { tur: "fizik" }>;

export type GeoTutamac = {
  /** Sürükleme için verilecek indeks (`geometriKoseTasi`). */
  index: number;
  ad: string;
  x: number;
  y: number;
  /** kose: çokgen köşesi · cember: çember üstündeki nokta (yalnız açısı değişir) · dis: çember dışındaki P. */
  tur: "kose" | "cember" | "dis";
};

export type GeoKenar = { index: number; ad: string; p: Nokta; q: Nokta };

export type GeoHedef = { tur: "kose"; index: number } | { tur: "kenar"; index: number };

const kutu = (s: FizikSekli) => ({ x: s.x, y: s.y, w: s.w, h: s.h });
const geoVerisi = (s: FizikSekli): GeometriVerisi => (s.geo && geometriVerisiGecerliMi(s.geo) && geometriNesneyeUygun(s.nesne, s.geo) ? s.geo : varsayilanGeometri(s.nesne));

/** Yerel (dönmemiş) noktayı dünya koordinatına taşır — `fizikCiz` ile aynı dönüşüm. */
export function geoYereldenDunyaya(s: FizikSekli, p: Nokta): Nokta {
  const c = { x: s.x + s.w / 2, y: s.y + s.h / 2 };
  let dx = p.x - c.x;
  const dy = p.y - c.y;
  if (s.ayna) dx = -dx;
  const r = ((s.donus ?? 0) * Math.PI) / 180;
  return { x: c.x + dx * Math.cos(r) - dy * Math.sin(r), y: c.y + dx * Math.sin(r) + dy * Math.cos(r) };
}

export function geoDunyadanYerele(s: FizikSekli, p: Nokta): Nokta {
  const c = { x: s.x + s.w / 2, y: s.y + s.h / 2 };
  const r = (-(s.donus ?? 0) * Math.PI) / 180;
  const dx = p.x - c.x, dy = p.y - c.y;
  let x = dx * Math.cos(r) - dy * Math.sin(r);
  const y = dx * Math.sin(r) + dy * Math.cos(r);
  if (s.ayna) x = -x;
  return { x: c.x + x, y: c.y + y };
}

/** Yerel köşeler ve adları (çizimle aynı yerleşim). */
function yerelNoktalar(s: FizikSekli): { noktalar: Omit<GeoTutamac, "index">[] } {
  const v = geoVerisi(s);
  const k = kutu(s);
  if (v.tur === "ucgen") return { noktalar: ucgenYerlesimi(v, k).map((p, i) => ({ ...p, ad: v.adlar[i] || "ABC"[i], tur: "kose" as const })) };
  if (v.tur === "dortgen") return { noktalar: dortgenYerlesimi(v, k).map((p, i) => ({ ...p, ad: v.adlar[i] || "ABCD"[i], tur: "kose" as const })) };
  if (v.tur === "cokgen") {
    const n = Math.max(3, Math.min(12, Math.round(v.n)));
    return { noktalar: cokgenKoseleri(n, k).map((p, i) => ({ ...p, ad: v.adlar[i] ?? "", tur: "kose" as const })) };
  }
  if (v.tur === "cember") {
    const { P, nokta } = cemberYerlesimi(v, k);
    const konum = v.konum.length >= 4 ? v.konum : [200, 340, 90, 300];
    const adlar = [v.adlar[1], v.adlar[2], v.adlar[3], v.adlar[4], v.adlar[5]];
    const liste: Omit<GeoTutamac, "index">[] = [0, 1, 2, 3].map((i) => ({ ...nokta(konum[i]), ad: adlar[i] || "ABCT"[i], tur: "cember" as const }));
    if (v.icAci) liste.push({ ...nokta(v.konum[4] ?? 290), ad: adlar[4] || "D", tur: "cember" });
    if (P) liste.push({ ...P, ad: v.disAdlar?.[0] || "P", tur: "dis" });
    return { noktalar: liste };
  }
  return { noktalar: [] };
}

/**
 * Sürüklenebilir noktalar (dünya koordinatı). Üçgen/dörtgen/çokgen köşeleri; çemberde A, B, C, T
 * (+ iç açıda D, dış açıda P). Diğer geometri verilerinde boş liste.
 *
 * Çemberde `index`: 0 A, 1 B, 2 C, 3 T, 4 D (yalnız iç açı açıkken), 5 P (dış açı).
 */
export function geometriKoseleri(s: FizikSekli): GeoTutamac[] {
  const v = geoVerisi(s);
  const { noktalar } = yerelNoktalar(s);
  return noktalar.map((n, i) => {
    const d = geoYereldenDunyaya(s, n);
    const index = v.tur === "cember" ? (n.tur === "dis" ? 5 : i) : i;
    return { ...n, ...d, index };
  });
}

const sinirla = (n: number, a: number, b: number) => Math.max(a, Math.min(b, n));

/**
 * `index`. noktayı `nokta`ya (dünya) taşır ve YENİ geometri verisini döndürür; taşınamıyorsa null.
 *  - Üçgen: `mod: "serbest"` + `sabitKutu` olur, köşeler kutuya doğrudan eşlenir (öbür köşeler yerinde kalır).
 *  - Dörtgen: `tip: "serbest"` olur (özel tür kısıtı kalkar; panelden tür yeniden seçilebilir).
 *  - Çember: noktanın çember üstündeki açısı (`konum[i]`) fare açısına döner; P'de açı + uzaklık.
 *  - Düzgün çokgen: köşe taşınmaz (null).
 */
export function geometriKoseTasi(s: FizikSekli, index: number, nokta: Nokta): GeometriVerisi | null {
  const v = geoVerisi(s);
  const k = kutu(s);
  const p = geoDunyadanYerele(s, nokta);
  const birim = (q: Nokta): Nokta => ({ x: sinirla((q.x - k.x) / (k.w || 1), -0.5, 1.5), y: sinirla((q.y - k.y) / (k.h || 1), -0.5, 1.5) });
  if (v.tur === "ucgen") {
    if (index < 0 || index > 2) return null;
    const P = ucgenYerlesimi(v, k).map(birim);
    P[index] = birim(p);
    return { ...v, mod: "serbest", sabitKutu: true, kose: P };
  }
  if (v.tur === "dortgen") {
    if (index < 0 || index > 3) return null;
    const P = dortgenYerlesimi(v, k).map(birim);
    P[index] = birim(p);
    return { ...v, tip: "serbest", kose: P };
  }
  if (v.tur === "cember") {
    const { O, R } = cemberYerlesimi(v, k);
    const aci = (Math.atan2(-(p.y - O.y), p.x - O.x) * 180) / Math.PI;
    const yuvarla = (a: number) => Math.round(((a % 360) + 360) % 360);
    if (index === 5) {
      const uz = Math.hypot(p.x - O.x, p.y - O.y) / (R || 1);
      return { ...v, disNokta: { aci: yuvarla(aci), uzaklik: Math.round(sinirla(uz, 1.25, 3) * 100) / 100 } };
    }
    if (index < 0 || index > 4) return null;
    const konum = [...(v.konum.length >= 4 ? v.konum : [200, 340, 90, 300])];
    while (konum.length < 5) konum.push(290);
    konum[index] = yuvarla(aci);
    return { ...v, konum: index === 4 || v.konum.length >= 5 ? konum : konum.slice(0, 4) };
  }
  return null;
}

/**
 * `geometriKoseTasi` + kutu normalleştirme: sürüklenen köşe şeklin kutusunun
 * (x, y, w, h) dışına çıktıysa kutu yeni köşeleri de kapsayacak kadar büyütülür
 * ve köşeler yeni kutuya göre yeniden birimlenir. Böylece seçim çerçevesi,
 * tutamaçlar, vuruş testi ve PNG kırpma aynı kutuyu kullanır. Dünyadaki köşe
 * konumları değişmez (döndürülmüş/aynalı şekilde de). Taşınamıyorsa null.
 */
export function geometriKoseTasiSekil(s: FizikSekli, index: number, nokta: Nokta): FizikSekli | null {
  const geo = geometriKoseTasi(s, index, nokta);
  if (!geo) return null;
  const kose = geo.tur === "ucgen" && geo.sabitKutu ? geo.kose : geo.tur === "dortgen" && geo.tip === "serbest" ? geo.kose ?? [] : [];
  if (!kose.length) return { ...s, geo };
  const k = kutu(s);
  // Eski yerel çerçevede köşeler (piksel).
  const L = kose.map((p) => ({ x: k.x + p.x * k.w, y: k.y + p.y * k.h }));
  const x0 = Math.min(k.x, ...L.map((p) => p.x)), y0 = Math.min(k.y, ...L.map((p) => p.y));
  const x1 = Math.max(k.x + k.w, ...L.map((p) => p.x)), y1 = Math.max(k.y + k.h, ...L.map((p) => p.y));
  const EPS = 1e-6;
  if (x0 >= k.x - EPS && y0 >= k.y - EPS && x1 <= k.x + k.w + EPS && y1 <= k.y + k.h + EPS) return { ...s, geo };
  const w = x1 - x0, h = y1 - y0;
  // Yeni kutunun merkezi dünyada nereye düşüyorsa kutu oraya oturur: dönüş merkezi
  // değişse de köşelerin dünya konumu korunur.
  const W = geoYereldenDunyaya(s, { x: (x0 + x1) / 2, y: (y0 + y1) / 2 });
  const birimli = L.map((p) => ({ x: (p.x - x0) / w, y: (p.y - y0) / h }));
  const yeniGeo = geo.tur === "ucgen" ? { ...geo, kose: birimli } : geo.tur === "dortgen" ? { ...geo, kose: birimli } : geo;
  return { ...s, x: W.x - w / 2, y: W.y - h / 2, w, h, geo: yeniGeo };
}

/** Kenar parçaları (dünya). Üçgende `index` veri sırasıdır: 0 = a (BC), 1 = b (CA), 2 = c (AB). Dörtgende 0 AB, 1 BC, 2 CD, 3 DA. */
export function geometriKenarlari(s: FizikSekli): GeoKenar[] {
  const v = geoVerisi(s);
  if (v.tur !== "ucgen" && v.tur !== "dortgen" && v.tur !== "cokgen") return [];
  const K = geometriKoseleri(s);
  if (v.tur === "ucgen") {
    const [A, B, C] = K;
    return [[B, C], [C, A], [A, B]].map(([p, q], i) => ({ index: i, ad: `${p.ad}${q.ad}`, p: { x: p.x, y: p.y }, q: { x: q.x, y: q.y } }));
  }
  return K.map((p, i) => {
    const q = K[(i + 1) % K.length];
    return { index: i, ad: `${p.ad}${q.ad}`, p: { x: p.x, y: p.y }, q: { x: q.x, y: q.y } };
  });
}

const parcaUzakligi = (p: Nokta, a: Nokta, b: Nokta) => {
  const dx = b.x - a.x, dy = b.y - a.y;
  const t = sinirla(((p.x - a.x) * dx + (p.y - a.y) * dy) / (dx * dx + dy * dy || 1), 0, 1);
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
};

/** Çift tıklanan noktaya en yakın köşe (öncelikli) ya da kenar; eşikten uzaksa null. */
export function geometriEnYakinKenarVeyaKose(s: FizikSekli, nokta: Nokta, esik = 12):
  | { tur: "kose"; index: number; ad: string; x: number; y: number }
  | { tur: "kenar"; index: number; ad: string; x: number; y: number }
  | null {
  let enIyi: { tur: "kose"; index: number; ad: string; x: number; y: number } | null = null;
  let enD = esik;
  for (const t of geometriKoseleri(s)) {
    const d = Math.hypot(t.x - nokta.x, t.y - nokta.y);
    if (d <= enD) { enD = d; enIyi = { tur: "kose", index: t.index, ad: t.ad, x: t.x, y: t.y }; }
  }
  if (enIyi) return enIyi;
  let kenar: { tur: "kenar"; index: number; ad: string; x: number; y: number } | null = null;
  enD = esik;
  for (const e of geometriKenarlari(s)) {
    const d = parcaUzakligi(nokta, e.p, e.q);
    if (d <= enD) { enD = d; kenar = { tur: "kenar", index: e.index, ad: e.ad, x: (e.p.x + e.q.x) / 2, y: (e.p.y + e.q.y) / 2 }; }
  }
  return kenar;
}

export type GeoEtiketYamasi = {
  /** Köşe: ad, açı etiketi, açı işareti, eş açı yayı sayısı (0–3). */
  ad?: string;
  aciEtiket?: string;
  aciIsareti?: GeoAciIsareti;
  esAci?: number;
  /** Kenar: etiket ve eş kenar tırtığı sayısı (0–3). */
  kenarEtiket?: string;
  esKenar?: number;
};

/** Balondaki geçerli değerler (açılırken doldurmak için). */
export function geometriEtiketiOku(v: GeometriVerisi, hedef: GeoHedef): GeoEtiketYamasi | null {
  const i = hedef.index;
  if (v.tur === "ucgen" || v.tur === "dortgen") {
    if (hedef.tur === "kose") return { ad: v.adlar[i] ?? "", aciEtiket: v.acilar[i] ?? "", aciIsareti: v.aciIsareti[i] ?? "yok", esAci: v.esAci[i] ?? 0 };
    return { kenarEtiket: v.kenarlar[i] ?? "", esKenar: v.esKenar[i] ?? 0 };
  }
  if (v.tur === "cokgen" && hedef.tur === "kose") return { ad: v.adlar[i] ?? "" };
  if (v.tur === "cember" && hedef.tur === "kose") return { ad: i === 5 ? v.disAdlar?.[0] ?? "P" : v.adlar[i + 1] ?? "" };
  return null;
}

/** Köşe/kenar yamasını veriye yazar (sınırlar: metin ≤ 24, sayılar 0–3). Desteklenmeyen hedefte veri aynen döner. */
export function geometriEtiketiAyarla(v: GeometriVerisi, hedef: GeoHedef, yama: GeoEtiketYamasi): GeometriVerisi {
  const i = hedef.index;
  const kes = (t: string) => t.slice(0, 24);
  const say = (n: number) => Math.max(0, Math.min(3, Math.round(n)));
  const koy = <T,>(d: T[], n: number, deger: T, dolgu: T) => Array.from({ length: Math.max(d.length, n) }, (_, j) => (j === i ? deger : d[j] ?? dolgu));
  if (v.tur === "ucgen" || v.tur === "dortgen") {
    const n = v.tur === "ucgen" ? 3 : 4;
    if (i < 0 || i >= n) return v;
    if (hedef.tur === "kose") {
      return {
        ...v,
        ...(yama.ad !== undefined ? { adlar: koy(v.adlar, n, kes(yama.ad), "") } : {}),
        ...(yama.aciEtiket !== undefined ? { acilar: koy(v.acilar, n, kes(yama.aciEtiket), "") } : {}),
        ...(yama.aciIsareti !== undefined ? { aciIsareti: koy<GeoAciIsareti>(v.aciIsareti, n, yama.aciIsareti, "yok") } : {}),
        ...(yama.esAci !== undefined ? { esAci: koy(v.esAci, n, say(yama.esAci), 0) } : {}),
      } as GeometriVerisi;
    }
    return {
      ...v,
      ...(yama.kenarEtiket !== undefined ? { kenarlar: koy(v.kenarlar, n, kes(yama.kenarEtiket), "") } : {}),
      ...(yama.esKenar !== undefined ? { esKenar: koy(v.esKenar, n, say(yama.esKenar), 0) } : {}),
    } as GeometriVerisi;
  }
  if (v.tur === "cokgen" && hedef.tur === "kose" && yama.ad !== undefined && i >= 0 && i < v.n) return { ...v, adlar: koy(v.adlar, v.n, kes(yama.ad), "") };
  if (v.tur === "cember" && hedef.tur === "kose" && yama.ad !== undefined) {
    if (i === 5) { const d = [...(v.disAdlar ?? ["P", "C", "D"])]; d[0] = kes(yama.ad); return { ...v, disAdlar: d }; }
    if (i >= 0 && i <= 4) { const a = [...v.adlar]; while (a.length < i + 2) a.push(""); a[i + 1] = kes(yama.ad); return { ...v, adlar: a }; }
  }
  return v;
}
