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
import {
  dogruyuKagidaKirp, dortgenYerlesimi, kagitKoseleri, kagitSerbest, katDuzelt, katlamaYansit, katlamaYerlesimi,
  katlamaKutusunuSigdir, sinirdaEnYakin, varsayilanKatlama,
} from "./geometriEk";
import { noktaDondur } from "./geometri";

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


// ════════════════════════════════════════════════════════════════════════════
// Serbest katlama (v1.3): tuvaldeki üçgen/dörtgen/çokgeni katlanabilir kâğıda çevirme,
// tuvalde çizgi çekerek katlama, katlama uçlarını (D, E) ve katlanan köşeyi (A′) sürükleme.
// Hepsi saf: dünya (tuval) koordinatı alır, yeni şekil döndürür.
// ════════════════════════════════════════════════════════════════════════════

type KatlamaVerisi = Extract<GeometriVerisi, { tur: "katlama" }>;
type KatlamaAdimi = KatlamaVerisi["katlar"][number];

const KAGIT_PAY = 24;
const yuvarla3 = (x: number) => Math.round(x * 1000) / 1000;
const HARFLER = "ABCDEFGHIJKL";

/** Köşeleri (dünya, y aşağı) bu şekilden okunabilen şekil mi? Katla düğmesi bunu sorar. */
export function katlanabilirMi(s: Sekil): boolean {
  if (s.tur === "ucgen" || s.tur === "dikdortgen") return true;
  if (s.tur === "cokgen") return s.noktalar.length >= 3 && s.noktalar.length <= 12;
  if (s.tur !== "fizik") return false;
  if (s.nesne === "kagitKatlama") return true;
  if (!["ucgenABC", "dikUcgen", "dortgenGeo", "cokgenAd"].includes(s.nesne)) return false;
  const n = geometriKoseleri(s).filter((t) => t.tur === "kose").length;
  return n >= 3 && n <= 12;
}

function kaynakKoseleri(s: Sekil): { ad: string; x: number; y: number }[] | null {
  let noktalar: { ad?: string; x: number; y: number }[] | null = null;
  if (s.tur === "ucgen") noktalar = [{ x: s.x1, y: s.y1 }, { x: s.x2, y: s.y2 }, { x: s.x3, y: s.y3 }];
  else if (s.tur === "dikdortgen") {
    noktalar = s.serbestKoseler && s.serbestKoseler.length === 4
      ? s.serbestKoseler.map((p) => ({ x: p.x, y: p.y }))
      : [{ x: s.x, y: s.y }, { x: s.x + s.w, y: s.y }, { x: s.x + s.w, y: s.y + s.h }, { x: s.x, y: s.y + s.h }];
  } else if (s.tur === "cokgen") noktalar = s.noktalar.map((p) => ({ x: p.x, y: p.y }));
  else if (s.tur === "fizik" && ["ucgenABC", "dikUcgen", "dortgenGeo", "cokgenAd"].includes(s.nesne)) {
    const t = geometriKoseleri(s).filter((k) => k.tur === "kose");
    noktalar = t.map((k) => ({ ad: k.ad, x: k.x, y: k.y }));
  }
  if (!noktalar || noktalar.length < 3 || noktalar.length > 12) return null;
  if (noktalar.some((p) => !Number.isFinite(p.x) || !Number.isFinite(p.y))) return null;
  // Dönmüş basit şekiller: kutu merkezi etrafında döndür.
  const donus = (s as { donus?: number }).donus ?? 0;
  if (donus && s.tur !== "fizik") {
    const xs = noktalar.map((p) => p.x), ys = noktalar.map((p) => p.y);
    const m = { x: (Math.min(...xs) + Math.max(...xs)) / 2, y: (Math.min(...ys) + Math.max(...ys)) / 2 };
    noktalar = noktalar.map((p) => ({ ...p, ...noktaDondur(p, m, donus) }));
  }
  const kullanilan = new Set<string>();
  return noktalar.map((p, i) => {
    const aday = p.ad && /^[A-Z]$/.test(p.ad) && !kullanilan.has(p.ad) ? p.ad : HARFLER[i];
    kullanilan.add(aday);
    return { ad: aday, x: p.x, y: p.y };
  });
}

/**
 * Üçgen / dikdörtgen / dörtgen / çokgeni, köşe koordinatlarını koruyarak katlanabilir kâğıda çevirir
 * (henüz katlama yok). Şekil aynı yerde kalır; sonra tuvalde çizgi çekilerek katlanır.
 * Zaten katlama ise aynen döner; katlanamayan şekilde null.
 */
export function sekliKatlamayaDonustur(s: Sekil): FizikSekli | null {
  if (s.tur === "fizik" && s.nesne === "kagitKatlama") return s;
  const K = kaynakKoseleri(s);
  if (!K) return null;
  const xs = K.map((p) => p.x), ys = K.map((p) => p.y);
  const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
  const boyut = Math.max(x1 - x0, y1 - y0);
  if (boyut < 1e-6) return null;
  // Kâğıt birimi: en uzun kenar 12 birim (ölçek `olc` piksel/birim olarak aynı büyüklükte geri gelir).
  const ol = 12 / boyut;
  const kagit = kagitSerbest(K.map((p) => ({ x: yuvarla3((p.x - x0) * ol), y: yuvarla3((y1 - p.y) * ol) })));
  kagit.serbestKoseler = kagit.serbestKoseler!.map((q, i) => ({ ...q, ad: K[i].ad }));
  const geo: KatlamaVerisi = varsayilanKatlama({ kagit, katlar: [], sekil1: false, ok: true, olcu: false, eski: true, baslik: false, dolgu: "tarali", eslikGoster: false, yer: { olc: 1 / ol, ox: KAGIT_PAY, oy: y1 - y0 + KAGIT_PAY } });
  return {
    id: s.id, tur: "fizik", nesne: "kagitKatlama", kalinlik: "kalinlik" in s ? s.kalinlik : 2, ...("cizgiTipi" in s && s.cizgiTipi ? { cizgiTipi: s.cizgiTipi } : {}),
    x: x0 - KAGIT_PAY, y: y0 - KAGIT_PAY, w: x1 - x0 + 2 * KAGIT_PAY, h: y1 - y0 + 2 * KAGIT_PAY, geo,
  };
}

const katVerisi = (s: FizikSekli): KatlamaVerisi | null => (s.nesne === "kagitKatlama" && s.geo && s.geo.tur === "katlama" && geometriVerisiGecerliMi(s.geo) ? s.geo : null);
const asilKutu = (s: FizikSekli) => ({ x: s.x, y: s.y, w: s.w, h: s.h });

/** Dünya noktası → (yerleşim, kâğıt koordinatı). Çizim ve sürükleme aynı dönüşümü kullanır. */
function kagitaCevir(s: FizikSekli, v: KatlamaVerisi, dunya: Nokta) {
  const Y = katlamaYerlesimi(v, asilKutu(s));
  const yerel = geoDunyadanYerele(s, dunya);
  return { Y, kagit: (Y.iki ? Y.T1ters : Y.T2ters)(yerel), kagit2: Y.T2ters(yerel) };
}

const KENAR_AYAR = (s: FizikSekli, v: KatlamaVerisi): FizikSekli => katlamaKutusunuSigdir({ ...s, geo: v });

/**
 * Tuvalde bir noktadan ötekine çekilen çizgiyle katlama: çizgi kâğıdın kenarlarına kırpılır,
 * küçük taraf katlanır (`hareketli` otomatik). En çok 2 katlama; üçüncüde sonuncunun yerine geçer.
 * Çizgi kâğıdı kesmiyorsa ya da bir kenar boyunca gidiyorsa null.
 */
export function katlamaCizgisiCiz(s: FizikSekli, a: Nokta, b: Nokta): FizikSekli | null {
  const v = katVerisi(s);
  if (!v) return null;
  const A = kagitaCevir(s, v, a), B = kagitaCevir(s, v, b);
  const koseler = kagitKoseleri(v.kagit);
  const uc = dogruyuKagidaKirp(koseler, A.kagit2, B.kagit2);
  if (!uc) return null;
  const orta = { x: (uc[0].x + uc[1].x) / 2, y: (uc[0].y + uc[1].y) / 2 };
  if (sinirdaEnYakin(koseler, orta).uzaklik < 1e-6) return null;
  const adim = katDuzelt({ mod: "serbestCizgi", k1: "A", k2: "B", hareketli: "", kose: "A", kenar: koseler[0].ad + koseler[1].ad, uz: 1, hedef: "O", uc1: uc[0], uc2: uc[1] }, koseler);
  const katlar = v.katlar.length < 2 ? [...v.katlar, adim] : [v.katlar[0], adim];
  return KENAR_AYAR(s, { ...v, katlar });
}

export type KatlamaTutamac = {
  /** uc: katlama çizgisinin kenardaki ucu (D, E) · hedef: katlanan köşenin yeni konumu (A′). */
  tur: "uc" | "hedef";
  adim: number;
  /** tur "uc" için: 0 ya da 1 (çizginin hangi ucu). */
  uc: number;
  ad: string;
  x: number;
  y: number;
};

/** Seçili katlama şekli için sürükleme tutamaçları (dünya). Katlama yoksa boş. */
export function katlamaTutamaclari(s: FizikSekli): KatlamaTutamac[] {
  const v = katVerisi(s);
  if (!v || !v.katlar.length) return [];
  const Y = katlamaYerlesimi(v, asilKutu(s));
  const T = Y.iki ? Y.T1 : Y.T2;
  const liste: KatlamaTutamac[] = [];
  Y.K.dogrular.forEach((L, i) => {
    const uclar = Y.K.katlamaCizgileri[i];
    uclar.forEach((n, j) => {
      const d = geoYereldenDunyaya(s, T(n));
      const ad = Y.K.adlar.find((a) => Math.hypot(a.x - n.x, a.y - n.y) < 1e-6)?.ad ?? "";
      liste.push({ tur: "uc", adim: i, uc: j, ad, x: d.x, y: d.y });
    });
    if (L.hareketli) {
      const yan = katlamaYansit(L, L.hareketli);
      const d = geoYereldenDunyaya(s, Y.T2(yan));
      liste.push({ tur: "hedef", adim: i, uc: 0, ad: `${L.hareketli.ad}′`, x: d.x, y: d.y });
    }
  });
  return liste;
}

/**
 * Bir tutamacı `nokta`ya (dünya) sürükler. Uç: kenar üzerinde kayar (çizgi serbestCizgi olur).
 * Hedef (A′): katlama çizgisi A ile A′'nün orta dikmesi olur; A′ köşelere, ağırlık merkezine ve
 * kenarlara mıknatıslanır (`mikEsik` piksel). Geçersizse (çizgi kenar boyunca, A′ = A) null.
 */
export function katlamaTutamacTasi(s: FizikSekli, t: Pick<KatlamaTutamac, "tur" | "adim" | "uc">, nokta: Nokta, mikEsik = 10): FizikSekli | null {
  const v = katVerisi(s);
  if (!v || !v.katlar[t.adim]) return null;
  const { Y, kagit, kagit2 } = kagitaCevir(s, v, nokta);
  const koseler = kagitKoseleri(v.kagit);
  const L = Y.K.dogrular[t.adim];
  const eski = v.katlar[t.adim];
  const yenile = (adim: KatlamaAdimi) => KENAR_AYAR(s, { ...v, katlar: v.katlar.map((k, i) => (i === t.adim ? katDuzelt(adim, koseler) : k)) });
  if (t.tur === "uc") {
    const uclar = Y.K.katlamaCizgileri[t.adim];
    if (uclar.length !== 2) return null;
    const yeni = sinirdaEnYakin(koseler, kagit).nokta;
    const uc1 = t.uc === 0 ? yeni : uclar[0], uc2 = t.uc === 1 ? yeni : uclar[1];
    if (Math.hypot(uc1.x - uc2.x, uc1.y - uc2.y) < 1e-3) return null;
    const orta = { x: (uc1.x + uc2.x) / 2, y: (uc1.y + uc2.y) / 2 };
    if (sinirdaEnYakin(koseler, orta).uzaklik < 1e-6) return null;
    // Katlanan köşe çizginin üstüne düşerse otomatiğe dön.
    const ad = L.hareketli?.ad ?? "";
    const V = koseler.find((k) => k.ad === ad);
    const dx = uc2.x - uc1.x, dy = uc2.y - uc1.y;
    const vYan = V ? Math.abs(dx * (V.y - uc1.y) - dy * (V.x - uc1.x)) / (Math.hypot(dx, dy) || 1) : 0;
    return yenile({ ...eski, mod: "serbestCizgi", uc1, uc2, hareketli: V && vYan > 1e-6 ? ad : "" });
  }
  const V = L.hareketli;
  if (!V) return null;
  // Mıknatıs: köşeler, ağırlık merkezi, kenar noktaları (piksel eşiği → kâğıt birimi).
  const esik = mikEsik / (Y.olc || 1);
  const merkez = { x: koseler.reduce((m, k) => m + k.x, 0) / koseler.length, y: koseler.reduce((m, k) => m + k.y, 0) / koseler.length };
  let hedef: Nokta = kagit2;
  const adaylar: Nokta[] = [...koseler.filter((k) => k.ad !== V.ad), merkez];
  let en = esik;
  adaylar.forEach((a) => { const d = Math.hypot(a.x - kagit2.x, a.y - kagit2.y); if (d < en) { en = d; hedef = { x: a.x, y: a.y }; } });
  if (en === esik) {
    const sn = sinirdaEnYakin(koseler, kagit2);
    if (sn.uzaklik < esik) hedef = sn.nokta;
  }
  if (Math.hypot(hedef.x - V.x, hedef.y - V.y) < 0.05) return null;
  void kagit;
  return yenile({ ...eski, mod: "getir", hareketli: V.ad, hedefXY: { x: yuvarla3(hedef.x), y: yuvarla3(hedef.y) } });
}

/** Katlanan parçaya tıklanırsa katlamanın hangi tarafı katlanacağını tersine çevirir; parçada değilse null. */
export function katlananTarafiDegistir(s: FizikSekli, nokta: Nokta): FizikSekli | null {
  const v = katVerisi(s);
  if (!v || !v.katlar.length) return null;
  const Y = katlamaYerlesimi(v, asilKutu(s));
  const yerel = geoDunyadanYerele(s, nokta);
  const icinde = (poly: Nokta[], p: Nokta) => {
    let c = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i, i += 1) {
      if ((poly[i].y > p.y) !== (poly[j].y > p.y) && p.x < ((poly[j].x - poly[i].x) * (p.y - poly[i].y)) / (poly[j].y - poly[i].y) + poly[i].x) c = !c;
    }
    return c;
  };
  const i = Y.K.katlananlar.findIndex((poly) => poly.length >= 3 && icinde(poly.map(Y.T2), yerel));
  if (i < 0) return null;
  const adim = v.katlar[i], L = Y.K.dogrular[i];
  if (adim.mod === "getir" || !L.hareketli) return null;
  const koseler = kagitKoseleri(v.kagit);
  const mesafe = (n: Nokta) => L.d.x * (n.y - L.p.y) - L.d.y * (n.x - L.p.x);
  const isaret = mesafe(L.hareketli) >= 0 ? 1 : -1;
  let enIyi: string | null = null, enD = 1e-9;
  koseler.forEach((k) => { const d = -isaret * mesafe(k); if (d > enD) { enD = d; enIyi = k.ad; } });
  if (!enIyi) return null;
  return KENAR_AYAR(s, { ...v, katlar: v.katlar.map((k, j) => (j === i ? katDuzelt({ ...k, hareketli: enIyi! }, koseler) : k)) });
}
