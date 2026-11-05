// v1.2 geometri senaryoları (G ajanı): üçgen yardımcı elemanları, çember açıları,
// doğruda açılar, özel dörtgenler, katı cisimler, kağıt katlama, doğrudan etkileşim
// yardımcıları ve PNG kırpma payı. React'siz — `cizim/` saf.

import type { GeometriVerisi, Nokta, Sekil } from "../src/modules/sinav-olusturucu/cizim/tipler";
import { FIZIK_TANIMLARI, fizikCiz, fizikSimgeCiz } from "../src/modules/sinav-olusturucu/cizim/fizik";
import {
  CEMBER_SABLONLARI, DOGRU_ACI_SABLONLARI, DORTGEN_SABLONLARI, GEOMETRI_KUTUPHANESI, KATI_SABLONLARI, KATLAMA_SABLONLARI, UCGEN_SABLONLARI,
  aciortayAyagi, agirlikMerkezi, cemberYerlesimi, cevrelCemberi, geometriDisPayi, geometriOnizlemeCiz, geometriSablonOnizlemeCiz,
  geometriVerisiGecerliMi, icTegetCemberi, ikinciKesisim, tegetNoktalari, ucgenKoseleri, ucgenYerlesimi, varsayilanCember, varsayilanUcgen,
} from "../src/modules/sinav-olusturucu/cizim/geometriSekilleri";
import {
  aciOlc, dogruAciDuzeni, dortgenKoseleri, katDuzelt, katiCokyuzlu, kagitKoseleri, katlamaHesapla, varsayilanDogruAci, varsayilanDortgen, varsayilanKati, varsayilanKatlama,
} from "../src/modules/sinav-olusturucu/cizim/geometriEk";
import {
  geometriEnYakinKenarVeyaKose, geometriEtiketiAyarla, geometriEtiketiOku, geometriKenarlari, geometriKoseTasi, geometriKoseleri,
} from "../src/modules/sinav-olusturucu/cizim/geometriEtkilesim";
import { sekilGecerliMi } from "../src/modules/sinav-olusturucu/cizim/sablon";
import { cizimIcerikSiniri } from "../src/modules/sinav-olusturucu/cizim/sinirlar";
import { sekilleriCiz } from "../src/modules/sinav-olusturucu/cizim/ciz";

type FizikSekli = Extract<Sekil, { tur: "fizik" }>;

function dogrula(kosul: unknown, mesaj: string) {
  if (!kosul) throw new Error(`TEST BAŞARISIZ: ${mesaj}`);
}
function yakin(a: number, b: number, mesaj: string, tol = 1e-6) {
  dogrula(Math.abs(a - b) <= tol, `${mesaj} (beklenen ${b}, gelen ${a})`);
}
function yakinN(p: Nokta, q: Nokta, mesaj: string, tol = 1e-6) {
  dogrula(Math.hypot(p.x - q.x, p.y - q.y) <= tol, `${mesaj} (beklenen ${q.x},${q.y}; gelen ${p.x},${p.y})`);
}
function test(ad: string, fn: () => void) {
  fn();
  console.log(`✓ ${ad}`);
}

function izlemeCtx() {
  const yazilar: { t: string; x: number; y: number }[] = [];
  const cagrilar: string[] = [];
  const kesikler: number[][] = [];
  const ozellikler: Record<string, unknown> = { font: "", lineWidth: 1 };
  const proxy = new Proxy(ozellikler, {
    get(hedef, ad: string) {
      if (ad === "measureText") return (m: string) => ({ width: [...m].length * 10 });
      if (ad === "fillText") return (t: string, x: number, y: number) => { yazilar.push({ t, x, y }); cagrilar.push(ad); };
      if (ad === "setLineDash") return (d: number[]) => { kesikler.push(d); cagrilar.push(ad); };
      if (ad in hedef) return hedef[ad];
      return (...a: unknown[]) => { cagrilar.push(ad); return a; };
    },
    set(hedef, ad: string, deger) { hedef[ad] = deger; return true; },
  });
  return { ctx: proxy as unknown as CanvasRenderingContext2D, yazilar, cagrilar, kesikler };
}

const sekil = (nesne: FizikSekli["nesne"], ek: Partial<FizikSekli> = {}): FizikSekli => ({
  id: "s", tur: "fizik", nesne, kalinlik: 2, x: 100, y: 100, w: FIZIK_TANIMLARI[nesne].w, h: FIZIK_TANIMLARI[nesne].h, ...ek,
});

// ── Üçgen yardımcı elemanları ──────────────────────────────────────────────

test("üçgen: ağırlık merkezi = köşe ortalaması ve kenarortayların kesişimi", () => {
  const K = ucgenKoseleri(varsayilanUcgen({ olcu: [7, 5, 6] }))!;
  const G = agirlikMerkezi(K);
  yakinN(G, { x: (K[0].x + K[1].x + K[2].x) / 3, y: (K[0].y + K[1].y + K[2].y) / 3 }, "G ortalama");
  // G, A'dan BC ortasına giden kenarortayı 2:1 böler.
  const M = { x: (K[1].x + K[2].x) / 2, y: (K[1].y + K[2].y) / 2 };
  yakinN(G, { x: K[0].x + (M.x - K[0].x) * (2 / 3), y: K[0].y + (M.y - K[0].y) * (2 / 3) }, "AG:GM = 2:1");
});

test("üçgen: iç teğet merkezi açıortaylar üstünde, yarıçap = Alan/u, üç kenara uzaklık eşit", () => {
  const K = ucgenKoseleri(varsayilanUcgen({ olcu: [6, 5, 4] }))!;
  const { merkez: I, r } = icTegetCemberi(K);
  const [A, B, C] = K;
  const alan = Math.abs((B.x - A.x) * (C.y - A.y) - (C.x - A.x) * (B.y - A.y)) / 2;
  const u = (6 + 5 + 4) / 2;
  yakin(r, alan / u, "r = A/u");
  const uzaklik = (p: Nokta, a: Nokta, b: Nokta) => Math.abs((b.x - a.x) * (a.y - p.y) - (a.x - p.x) * (b.y - a.y)) / Math.hypot(b.x - a.x, b.y - a.y);
  for (const [p, q] of [[B, C], [C, A], [A, B]]) yakin(uzaklik(I, p, q), r, "I'nın kenara uzaklığı r");
  // I, her köşenin açıortayı üzerinde: açıortay ayağı N ile köşe ve I doğrusal.
  for (let i = 0; i < 3; i += 1) {
    const N = aciortayAyagi(K, i), V = K[i];
    yakin((N.x - V.x) * (I.y - V.y) - (N.y - V.y) * (I.x - V.x), 0, `I ${"ABC"[i]} açıortayında`, 1e-9);
    yakin(aciOlc(V, K[(i + 1) % 3], N), aciOlc(V, N, K[(i + 2) % 3]), `${"ABC"[i]} açıortayı açıyı ikiye böler`, 1e-9);
  }
});

test("üçgen: çevrel çember merkezi köşelere eşit uzaklıkta; R = abc/4A", () => {
  const K = ucgenKoseleri(varsayilanUcgen({ olcu: [6, 5, 4] }))!;
  const c = cevrelCemberi(K)!;
  for (const p of K) yakin(Math.hypot(p.x - c.merkez.x, p.y - c.merkez.y), c.r, "OA = OB = OC");
  const [A, B, C] = K;
  const alan = Math.abs((B.x - A.x) * (C.y - A.y) - (C.x - A.x) * (B.y - A.y)) / 2;
  yakin(c.r, (6 * 5 * 4) / (4 * alan), "R = abc/4A");
  // Dik üçgende çevrel merkez hipotenüsün ortası.
  const D = ucgenKoseleri(varsayilanUcgen({ mod: "aci", olcu: [4, 3, 90] }))!;
  const cd = cevrelCemberi(D)!;
  yakinN(cd.merkez, { x: (D[1].x + D[2].x) / 2, y: (D[1].y + D[2].y) / 2 }, "dik üçgende O hipotenüs ortası");
});

test("üçgen: yeni yardımcı elemanlar çizilir; çevrel çember/dış açı kutuya sığar; eski veri aynı yerleşim", () => {
  const eski = varsayilanUcgen();
  const k = { x: 0, y: 0, w: 220, h: 170 };
  const P = ucgenYerlesimi(eski, k);
  for (const p of P) dogrula(p.x >= 29.9 && p.x <= 190.1 && p.y >= 29.9 && p.y <= 140.1, "eski yerleşim 30 px payla");
  const cv = varsayilanUcgen({ cevrelCember: true });
  const Pc = ucgenYerlesimi(cv, k);
  const c = cevrelCemberi(Pc)!;
  dogrula(c.merkez.x - c.r >= 29 && c.merkez.x + c.r <= 191 && c.merkez.y - c.r >= 29 && c.merkez.y + c.r <= 141, "çevrel çember kutu içinde");
  for (const sb of UCGEN_SABLONLARI) {
    const t = izlemeCtx();
    fizikCiz(t.ctx, sekil("ucgenABC", { geo: sb.olustur() }));
    dogrula(t.cagrilar.filter((c) => c === "stroke").length >= 1 && t.yazilar.length >= 3, `${sb.ad} çizildi`);
  }
  const t = izlemeCtx();
  fizikCiz(t.ctx, sekil("ucgenABC", { geo: UCGEN_SABLONLARI.find((s) => s.id === "g-agirlik")!.olustur() }));
  dogrula(t.yazilar.some((y) => y.t === "G"), "ağırlık merkezi G yazılır");
});

// ── Çember açıları ─────────────────────────────────────────────────────────

test("çember: P'den iki teğetin uzunlukları eşit, OT ⟂ PT", () => {
  const O = { x: 0, y: 0 }, R = 3, P = { x: 7, y: 2 };
  const [T1, T2] = tegetNoktalari(O, R, P)!;
  yakin(Math.hypot(T1.x - P.x, T1.y - P.y), Math.hypot(T2.x - P.x, T2.y - P.y), "|PA| = |PB|");
  for (const T of [T1, T2]) {
    yakin(Math.hypot(T.x, T.y), R, "teğet noktası çemberde");
    yakin((T.x - O.x) * (P.x - T.x) + (T.y - O.y) * (P.y - T.y), 0, "OT ⟂ PT", 1e-9);
  }
  dogrula(tegetNoktalari(O, R, { x: 1, y: 0 }) === null, "içteki noktadan teğet yok");
});

test("çember: kesenin ikinci kesişimi çemberde ve P, X ile doğrusal; kuvvet PX·PY sabit", () => {
  const O = { x: 0, y: 0 }, R = 2, P = { x: 5, y: 1 };
  const g = (a: number) => ({ x: R * Math.cos(a), y: R * Math.sin(a) });
  const kuvvet = (P.x ** 2 + P.y ** 2) - R * R;
  for (const a of [2.2, 2.6, 3.4]) {
    const X = g(a), Y = ikinciKesisim(O, P, X);
    yakin(Math.hypot(Y.x, Y.y), R, "Y çemberde", 1e-9);
    yakin((X.x - P.x) * (Y.y - P.y) - (X.y - P.y) * (Y.x - P.x), 0, "P, X, Y doğrusal", 1e-9);
    yakin(Math.hypot(X.x - P.x, X.y - P.y) * Math.hypot(Y.x - P.x, Y.y - P.y), kuvvet, "noktanın kuvveti", 1e-9);
  }
});

test("çember: dış açılı yerleşim P'yi kutuda tutar; eski veri eski yerleşim", () => {
  const k = { x: 0, y: 0, w: 220, h: 220 };
  const eski = cemberYerlesimi(varsayilanCember(), k);
  yakin(eski.R, 220 / 2 - 26, "eski R");
  yakinN(eski.O, { x: 110, y: 110 }, "eski O");
  const yeni = cemberYerlesimi(varsayilanCember({ disAci: "teget", disNokta: { aci: 0, uzaklik: 2.5 } }), k);
  dogrula(!!yeni.P && yeni.P.x <= 220 - 25.9 && yeni.O.x - yeni.R >= 25.9, "P ve çember kutuda");
  for (const sb of CEMBER_SABLONLARI) {
    const v = sb.olustur();
    dogrula(geometriVerisiGecerliMi(v), `${sb.ad} geçerli`);
    const t = izlemeCtx();
    fizikCiz(t.ctx, sekil("cemberGeo", { geo: v }));
    dogrula(t.cagrilar.includes("arc"), `${sb.ad} çizildi`);
  }
  const t = izlemeCtx();
  fizikCiz(t.ctx, sekil("cemberGeo", { geo: CEMBER_SABLONLARI.find((s) => s.id === "c-dilim")!.olustur() }));
  dogrula(t.cagrilar.includes("clip"), "daire dilimi taranır (kırpma yolu)");
});

// ── Doğruda açılar ─────────────────────────────────────────────────────────

test("doğruda açılar: yöndeş/iç ters eşit, U toplamı 180°, M: x+y=z, kalem ucu 360°, zikzak", () => {
  const kesen = dogruAciDuzeni(varsayilanDogruAci({ aci: 65 }));
  const o = (i: number) => kesen.acilar.find((a) => a.i === i)!.olcu;
  yakin(o(0), 65, "1 numaralı açı = kesen açısı");
  yakin(o(0), o(4), "yöndeş açılar eşit", 1e-9);
  yakin(o(3), o(5), "iç ters açılar eşit (4 ve 6)", 1e-9);
  yakin(o(3) + o(4), 180, "karşı durumlu iç açılar 180°", 1e-9);
  yakin(o(0), o(2), "ters açılar eşit", 1e-9);
  const z = dogruAciDuzeni(varsayilanDogruAci({ duzen: "z", aci: 52 }));
  yakin(z.acilar[0].olcu, z.acilar[1].olcu, "Z: iç ters eşit", 1e-9);
  yakin(z.acilar[0].olcu, 52, "Z: A açısı istenen");
  const u = dogruAciDuzeni(varsayilanDogruAci({ duzen: "u", aci: 70 }));
  yakin(u.acilar[0].olcu + u.acilar[1].olcu, 180, "U: toplam 180°", 1e-9);
  const m = dogruAciDuzeni(varsayilanDogruAci({ duzen: "m", aci: 40, aci2: 25 }));
  yakin(m.acilar[0].olcu, 40, "M: x"); yakin(m.acilar[1].olcu, 25, "M: y");
  yakin(m.acilar[2].olcu, 65, "M: z = x + y", 1e-9);
  const kalem = dogruAciDuzeni(varsayilanDogruAci({ duzen: "kalemUcu", aci: 40, aci2: 35 }));
  yakin(kalem.acilar.reduce((t, a) => t + a.olcu, 0), 360, "kalem ucu: toplam 360°", 1e-9);
  const zz = dogruAciDuzeni(varsayilanDogruAci({ duzen: "zikzak", aci: 45, aci2: 40 }));
  const a = (i: number) => zz.acilar.find((x) => x.i === i)!.olcu;
  yakin(a(0) + a(2), a(1) + a(3), "zikzak: sağa açılanlar = sola açılanlar", 1e-9);
  // Kırık noktalar paralellerin arasında
  for (const d of [m, kalem, zz]) for (const n of d.noktalar) dogrula(n.p.y >= -1e-9 && n.p.y <= 1 + 1e-9, "nokta şeritte");
});

test("doğruda açılar: şablonlar geçerli ve çizilir; ölçü yaz açıkken derece yazılır", () => {
  for (const sb of DOGRU_ACI_SABLONLARI) {
    const v = sb.olustur();
    dogrula(geometriVerisiGecerliMi(v), `${sb.ad} geçerli`);
    const t = izlemeCtx();
    fizikCiz(t.ctx, sekil("dogrudaAcilar", { geo: v }));
    dogrula(t.cagrilar.includes("stroke") && t.yazilar.length >= 2, `${sb.ad} çizildi`);
  }
  const t = izlemeCtx();
  fizikCiz(t.ctx, sekil("dogrudaAcilar", { geo: varsayilanDogruAci({ etiketler: [], olcuYaz: true, aci: 60 }) }));
  dogrula(t.yazilar.filter((y) => y.t.includes("60") || y.t.includes("120")).length >= 2, "60° / 120° yazıldı");
});

// ── Özel dörtgenler ────────────────────────────────────────────────────────

test("dörtgen: tür özellikleri (paralellik, eşlik, köşegen dikliği)", () => {
  const vek = (p: Nokta, q: Nokta) => ({ x: q.x - p.x, y: q.y - p.y });
  const capraz = (u: Nokta, v: Nokta) => u.x * v.y - u.y * v.x;
  const nokta = (u: Nokta, v: Nokta) => u.x * v.x + u.y * v.y;
  const uz = (p: Nokta, q: Nokta) => Math.hypot(p.x - q.x, p.y - q.y);
  const K = (tip: Parameters<typeof varsayilanDortgen>[0]) => dortgenKoseleri(varsayilanDortgen(tip))!;
  const [A, B, C, D] = K({ tip: "paralelkenar" });
  yakin(capraz(vek(A, B), vek(D, C)), 0, "AB ∥ DC"); yakin(capraz(vek(A, D), vek(B, C)), 0, "AD ∥ BC");
  const e = K({ tip: "eskenar" });
  yakin(nokta(vek(e[0], e[2]), vek(e[1], e[3])), 0, "eşkenar dörtgende köşegenler dik", 1e-9);
  yakin(uz(e[0], e[1]), uz(e[1], e[2]), "eşkenar: kenarlar eş");
  const iy = K({ tip: "ikizkenarYamuk" });
  yakin(uz(iy[0], iy[3]), uz(iy[1], iy[2]), "ikizkenar yamuk: AD = BC");
  yakin(capraz(vek(iy[0], iy[1]), vek(iy[3], iy[2])), 0, "yamuk: AB ∥ DC");
  const dy = K({ tip: "dikYamuk" });
  yakin(nokta(vek(dy[0], dy[1]), vek(dy[0], dy[3])), 0, "dik yamuk: A dik");
  const dl = K({ tip: "deltoid" });
  yakin(uz(dl[0], dl[1]), uz(dl[0], dl[3]), "deltoid: AB = AD"); yakin(uz(dl[2], dl[1]), uz(dl[2], dl[3]), "deltoid: CB = CD");
  yakin(nokta(vek(dl[0], dl[2]), vek(dl[1], dl[3])), 0, "deltoid: köşegenler dik");
  const kr = K({ tip: "kare" });
  yakin(uz(kr[0], kr[2]), uz(kr[1], kr[3]), "kare: köşegenler eş");
  dogrula(dortgenKoseleri(varsayilanDortgen({ tip: "paralelkenar", olcu: [5, 4, 200] })) === null, "geçersiz açı reddedilir");
  for (const sb of DORTGEN_SABLONLARI) {
    const v = sb.olustur();
    dogrula(geometriVerisiGecerliMi(v), `${sb.ad} geçerli`);
    const t = izlemeCtx();
    fizikCiz(t.ctx, sekil("dortgenGeo", { geo: v }));
    dogrula(t.yazilar.filter((y) => "ABCD".includes(y.t)).length === 4, `${sb.ad}: 4 köşe adı`);
  }
});

// ── Katı cisimler ──────────────────────────────────────────────────────────

test("katı cisim: küp/prizmada gizli ayrıtlar arka-alt-sol köşeye (D) çıkan üç ayrıt", () => {
  for (const cisim of ["kup", "prizma"] as const) {
    const c = katiCokyuzlu(varsayilanKati({ cisim }))!;
    const gizli = c.ayritlar.filter((a) => a.gizli);
    dogrula(c.ayritlar.length === 12, `${cisim}: 12 ayrıt`);
    dogrula(gizli.length === 3 && gizli.every((a) => a.i === 3 || a.j === 3), `${cisim}: gizli ayrıtlar D'de (${JSON.stringify(gizli)})`);
  }
  const p = katiCokyuzlu(varsayilanKati({ cisim: "ucgenPrizma" }))!;
  dogrula(p.ayritlar.length === 9, "üçgen prizma 9 ayrıt");
  const gizliP = p.ayritlar.filter((a) => a.gizli).map((a) => [a.i, a.j].sort().join("-")).sort();
  dogrula(JSON.stringify(gizliP) === JSON.stringify(["0-3", "3-4", "3-5"]), `üçgen prizma: arka-alt-sol köşe D'nin ayrıtları gizli (${gizliP})`);
  const pr = katiCokyuzlu(varsayilanKati({ cisim: "piramit" }))!;
  dogrula(pr.ayritlar.length === 8, "kare piramit 8 ayrıt");
  dogrula(pr.ayritlar.filter((a) => a.gizli).every((a) => a.i === 3 || a.j === 3) && pr.ayritlar.some((a) => a.gizli), "piramitte gizli ayrıtlar arka köşe D'de");
  // Ön ayrıtlar asla gizli değil: A-B (ön alt) ve B-F
  const kup = katiCokyuzlu(varsayilanKati({ cisim: "kup" }))!;
  dogrula(!kup.ayritlar.find((a) => a.i === 0 && a.j === 1)!.gizli, "AB görünür");
});

test("katı cisim: gizli ayrıt [5,4] kesikli; kapalıyken çizilmez; tüm şablonlar çizilir", () => {
  const t = izlemeCtx();
  fizikCiz(t.ctx, sekil("katiCisim", { geo: varsayilanKati({ cisim: "kup" }) }));
  dogrula(t.kesikler.some((d) => d[0] === 5 && d[1] === 4), "kesikli desen [5,4]");
  const say = (v: GeometriVerisi) => { const c = izlemeCtx(); fizikCiz(c.ctx, sekil("katiCisim", { geo: v })); return c.cagrilar.filter((x) => x === "stroke").length; };
  dogrula(say(varsayilanKati({ cisim: "kup", gizliKesik: false })) === say(varsayilanKati({ cisim: "kup" })) - 3, "gizli kapalı: 3 ayrıt eksik");
  for (const sb of KATI_SABLONLARI) {
    const v = sb.olustur();
    dogrula(geometriVerisiGecerliMi(v), `${sb.ad} geçerli`);
    const c = izlemeCtx();
    fizikCiz(c.ctx, sekil("katiCisim", { geo: v }));
    dogrula(c.cagrilar.includes("stroke"), `${sb.ad} çizildi`);
    if (["silindir", "koni", "kure"].includes((v as { cisim: string }).cisim)) dogrula(c.kesikler.some((d) => d[0] === 5), `${sb.ad}: arka yarı kesikli`);
  }
});

// ── Kağıt katlama ──────────────────────────────────────────────────────────

const ad = (K: ReturnType<typeof katlamaHesapla>, n: string) => K.adlar.find((a) => a.ad === n);

test("katlama: 16×8 dikdörtgen AC boyunca → D′(6,4; −4,8), E(10; 0)", () => {
  const K = katlamaHesapla(varsayilanKatlama());
  const Dp = K.katlananlar[0].find((p) => p.ad === "D′");
  dogrula(!!Dp, "D′ var");
  yakinN(Dp!, { x: 6.4, y: -4.8 }, "D′");
  dogrula(K.yeniNoktalar.length === 1, "tek yeni nokta");
  yakinN(K.yeniNoktalar[0], { x: 10, y: 0 }, "E");
  dogrula(K.yeniNoktalar[0].ad === "E", "yeni noktanın adı E");
});

test("katlama: 6-8-10 dik üçgen A'dan BD=3 noktasına → B′(4,8; 2,4) AC üstünde", () => {
  const v = KATLAMA_SABLONLARI.find((s) => s.id === "f-dik-ucgen")!.olustur() as Extract<GeometriVerisi, { tur: "katlama" }>;
  const K = katlamaHesapla(v);
  const Bp = K.katlananlar[0].find((p) => p.ad === "B′")!;
  yakinN(Bp, { x: 4.8, y: 2.4 }, "B′");
  yakin(Bp.x / 8 + Bp.y / 6, 1, "B′ AC doğrusu üstünde");
  yakinN(ad(K, "D")!, { x: 3, y: 0 }, "D noktası BC'de B'den 3 birim");
});

test("katlama: 10×10 kare, B ve D merkeze → E(5,0), F(10,5), G(5,10), H(0,5)", () => {
  const v = KATLAMA_SABLONLARI.find((s) => s.id === "f-kare-merkez")!.olustur() as Extract<GeometriVerisi, { tur: "katlama" }>;
  const K = katlamaHesapla(v);
  yakinN(ad(K, "E")!, { x: 5, y: 0 }, "E"); yakinN(ad(K, "F")!, { x: 10, y: 5 }, "F");
  yakinN(ad(K, "G")!, { x: 5, y: 10 }, "G"); yakinN(ad(K, "H")!, { x: 0, y: 5 }, "H");
  // İki köşe de O'ya geldi
  dogrula(K.katlananlar.every((p) => p.some((n) => n.ad === "O" && Math.hypot(n.x - 5, n.y - 5) < 1e-9)), "B ve D, O'da");
});

test("katlama: katDuzelt geçersiz seçimleri onarır; en çok iki katlama; doğrulayıcı", () => {
  const kos = kagitKoseleri({ tur: "dikucgen", w: 16, h: 8, a: 10, p: 8, q: 6 });
  const k = katDuzelt({ mod: "iki", k1: "D", k2: "D", hareketli: "Z", kose: "A", kenar: "AB", uz: 99, hedef: "D" }, kos);
  dogrula(k.k1 === "A" && k.k2 !== k.k1 && k.hareketli !== k.k1 && k.hareketli !== k.k2, "köşeler onarıldı");
  dogrula(k.kenar === "BC" && k.uz <= 7, "kenar A'yı içermez ve uzunluk sınırlı");
  dogrula(geometriVerisiGecerliMi(varsayilanKatlama()), "varsayılan geçerli");
  const uc = { ...varsayilanKatlama(), katlar: [0, 1, 2].map(() => varsayilanKatlama().katlar[0]) };
  dogrula(!geometriVerisiGecerliMi(uc), "üç katlama reddedilir");
  dogrula(!geometriVerisiGecerliMi({ ...varsayilanKatlama(), kagit: { tur: "kare", w: 0, h: 8, a: 10, p: 8, q: 6 } }), "sıfır ölçü reddedilir");
  for (const sb of KATLAMA_SABLONLARI) {
    for (const ayar of [{}, { sekil1: false }, { dolgu: "tarali" as const, eski: true }]) {
      const t = izlemeCtx();
      fizikCiz(t.ctx, sekil("kagitKatlama", { geo: { ...(sb.olustur() as Extract<GeometriVerisi, { tur: "katlama" }>), ...ayar } }));
      dogrula(t.cagrilar.includes("fill") && t.yazilar.length >= 3, `${sb.ad} çizildi`);
    }
  }
  const t = izlemeCtx();
  fizikCiz(t.ctx, sekil("kagitKatlama", { geo: varsayilanKatlama() }));
  dogrula(["D′", "E", "Şekil I", "Şekil II", "16", "8"].every((y) => t.yazilar.some((x) => x.t === y)), `etiketler: ${t.yazilar.map((y) => y.t).join(" ")}`);
});

// ── Doğrulama, kütüphane, önizleme ─────────────────────────────────────────

test("doğrulama: sınırlar ve eski veri; kütüphane adları/arama kelimeleri; önizleme", () => {
  dogrula(geometriVerisiGecerliMi(varsayilanUcgen()) && geometriVerisiGecerliMi(varsayilanCember()), "eski biçim geçerli");
  dogrula(!geometriVerisiGecerliMi({ ...varsayilanUcgen(), kenarortay: "X" }), "bozuk kenarortay");
  dogrula(!geometriVerisiGecerliMi({ ...varsayilanUcgen(), aciortayAdi: "x".repeat(50) }), "uzun ad");
  dogrula(!geometriVerisiGecerliMi({ ...varsayilanCember(), disNokta: { aci: 0, uzaklik: 99 } }), "uzak P");
  dogrula(!geometriVerisiGecerliMi({ ...varsayilanDogruAci(), etiketler: Array(20).fill("x") }), "fazla etiket");
  dogrula(!geometriVerisiGecerliMi({ ...varsayilanDortgen(), tip: "besgen" }), "bilinmeyen dörtgen");
  dogrula(!geometriVerisiGecerliMi({ ...varsayilanKati(), olcu: [-1] }), "negatif ölçü");
  dogrula(sekilGecerliMi(sekil("katiCisim", { geo: varsayilanKati() })) && !sekilGecerliMi(sekil("katiCisim", { geo: { tur: "kati" } as unknown as GeometriVerisi })), "şablon doğrulayıcısı");
  const idler = new Set<string>();
  for (const sb of GEOMETRI_KUTUPHANESI) {
    dogrula(!idler.has(sb.id), `yinelenen id ${sb.id}`); idler.add(sb.id);
    dogrula(!!sb.nesne && sb.nesne in FIZIK_TANIMLARI && (sb.aramaKelimeleri?.length ?? 0) > 0, `${sb.ad}: nesne + arama kelimeleri`);
    dogrula(geometriVerisiGecerliMi(sb.olustur()), `${sb.ad} geçerli`);
    const t = izlemeCtx();
    geometriSablonOnizlemeCiz(t.ctx, sb, 64, 40);
    dogrula(t.cagrilar.includes("stroke"), `${sb.ad} önizlemesi çizildi`);
  }
  for (const ara of ["z kuralı", "ağırlık merkezi", "küp köşegeni", "kağıt katlama", "deltoid", "iki teğet"]) {
    dogrula(GEOMETRI_KUTUPHANESI.some((s) => s.aramaKelimeleri!.some((k) => k.includes(ara)) || s.ad.toLocaleLowerCase("tr").includes(ara)), `aranabilir: ${ara}`);
  }
  for (const n of ["dogrudaAcilar", "dortgenGeo", "katiCisim", "kagitKatlama"] as const) {
    const t = izlemeCtx();
    fizikSimgeCiz(t.ctx, n, 44, 30);
    dogrula(t.cagrilar.includes("stroke"), `${n} simgesi`);
    const o = izlemeCtx();
    geometriOnizlemeCiz(o.ctx, n, sekil(n).geo ?? KATI_SABLONLARI[0].olustur(), 64, 40);
  }
  // Uyumsuz veri (dörtgen nesnesinde üçgen verisi) varsayılana düşer, patlamaz.
  const t = izlemeCtx();
  fizikCiz(t.ctx, sekil("dortgenGeo", { geo: varsayilanUcgen() }));
  dogrula(t.yazilar.filter((y) => y.t === "D").length === 1, "uyumsuz veri: varsayılan dörtgen");
});

// ── Doğrudan etkileşim ─────────────────────────────────────────────────────

test("etkileşim: köşeler, köşe taşıma (üçgen fareyi izler), çember noktası açısı, döndürülmüş şekil", () => {
  const s = sekil("ucgenABC", { geo: varsayilanUcgen() });
  const K = geometriKoseleri(s);
  dogrula(K.length === 3 && K.map((k) => k.ad).join("") === "ABC", "üç köşe");
  const hedef = { x: K[0].x + 20, y: K[0].y - 10 };
  const yeni = geometriKoseTasi(s, 0, hedef)!;
  dogrula(yeni.tur === "ucgen" && yeni.mod === "serbest" && yeni.sabitKutu === true, "serbest + sabitKutu");
  const s2 = { ...s, geo: yeni };
  const K2 = geometriKoseleri(s2);
  yakinN(K2[0], hedef, "taşınan köşe fare konumunda", 1e-6);
  yakinN(K2[1], K[1], "B yerinde", 1e-6); yakinN(K2[2], K[2], "C yerinde", 1e-6);
  // Döndürülmüş + aynalı şekilde de taşınan köşe fareyi izler.
  const d = { ...s, donus: 37, ayna: true };
  const Kd = geometriKoseleri(d);
  const hd = { x: Kd[1].x + 15, y: Kd[1].y + 5 };
  yakinN(geometriKoseleri({ ...d, geo: geometriKoseTasi(d, 1, hd)! })[1], hd, "dönük/aynalı şekilde köşe fareyi izler", 1e-6);
  // Çember: A noktası fare açısına döner.
  const c = sekil("cemberGeo", { geo: varsayilanCember() });
  const lay = cemberYerlesimi(varsayilanCember(), { x: c.x, y: c.y, w: c.w, h: c.h });
  const fare = { x: lay.O.x + 50, y: lay.O.y - 50 };
  const cy = geometriKoseTasi(c, 0, fare)!;
  dogrula(cy.tur === "cember" && cy.konum[0] === 45, `A açısı 45° (gelen ${cy.tur === "cember" ? cy.konum[0] : "?"})`);
  // Dış nokta P sürüklenir
  const cp = sekil("cemberGeo", { geo: CEMBER_SABLONLARI.find((x) => x.id === "c-iki-teget")!.olustur() });
  const P = geometriKoseleri(cp).find((k) => k.tur === "dis")!;
  dogrula(P && P.index === 5, "P tutamacı");
  const cp2 = geometriKoseTasi(cp, 5, { x: P.x, y: P.y - 30 })!;
  dogrula(cp2.tur === "cember" && !!cp2.disNokta && cp2.disNokta.aci > 0, "P yukarı taşındı");
  // Dörtgen köşesi
  const q = sekil("dortgenGeo", { geo: varsayilanDortgen() });
  const qK = geometriKoseleri(q);
  const qy = geometriKoseTasi(q, 2, { x: qK[2].x + 10, y: qK[2].y })!;
  dogrula(qy.tur === "dortgen" && qy.tip === "serbest" && geometriVerisiGecerliMi(qy), "dörtgen serbest");
  yakinN(geometriKoseleri({ ...q, geo: qy })[2], { x: qK[2].x + 10, y: qK[2].y }, "dörtgen köşesi fareyi izler");
  dogrula(geometriKoseTasi(sekil("cokgenAd"), 0, { x: 0, y: 0 }) === null, "düzgün çokgen köşesi taşınmaz");
});

test("etkileşim: çift tıklamada en yakın köşe/kenar; etiket yazma", () => {
  const s = sekil("ucgenABC", { geo: varsayilanUcgen() });
  const K = geometriKoseleri(s);
  const kose = geometriEnYakinKenarVeyaKose(s, { x: K[1].x + 3, y: K[1].y + 2 });
  dogrula(kose?.tur === "kose" && kose.index === 1, "B köşesi bulundu");
  const kenarlar = geometriKenarlari(s);
  dogrula(kenarlar[0].ad === "BC", "a kenarı BC");
  const o = { x: (kenarlar[0].p.x + kenarlar[0].q.x) / 2, y: (kenarlar[0].p.y + kenarlar[0].q.y) / 2 + 2 };
  const kenar = geometriEnYakinKenarVeyaKose(s, o);
  dogrula(kenar?.tur === "kenar" && kenar.index === 0, "BC kenarı bulundu");
  dogrula(geometriEnYakinKenarVeyaKose(s, { x: -500, y: -500 }) === null, "uzakta null");
  let g = geometriEtiketiAyarla(s.geo!, { tur: "kose", index: 1 }, { ad: "K", aciEtiket: "60°", aciIsareti: "yay", esAci: 9 });
  dogrula(g.tur === "ucgen" && g.adlar[1] === "K" && g.acilar[1] === "60°" && g.aciIsareti[1] === "yay" && g.esAci[1] === 3, "köşe yaması (eş açı 3'e sınırlı)");
  g = geometriEtiketiAyarla(g, { tur: "kenar", index: 0 }, { kenarEtiket: "x+2", esKenar: 2 });
  dogrula(g.tur === "ucgen" && g.kenarlar[0] === "x+2" && g.esKenar[0] === 2 && geometriVerisiGecerliMi(g), "kenar yaması");
  dogrula(JSON.stringify(geometriEtiketiOku(g, { tur: "kenar", index: 0 })) === JSON.stringify({ kenarEtiket: "x+2", esKenar: 2 }), "okuma");
  const d = geometriEtiketiAyarla(varsayilanDortgen(), { tur: "kenar", index: 3 }, { kenarEtiket: "a".repeat(40) });
  dogrula(d.tur === "dortgen" && d.kenarlar[3].length === 24, "metin 24'e kırpılır");
});

// ── PNG kırpma payı (gerçek tuval) ─────────────────────────────────────────

test("PNG dışa aktarım: yeni geometri şekillerinin yazıları kırpılmaz (gerçek tuval pikseli)", () => {
  let tuvalUret: ((w: number, h: number) => { getContext(t: "2d"): unknown; toBuffer?(t: string): Buffer }) | null = null;
  try { tuvalUret = require("@napi-rs/canvas").createCanvas; } catch { /* yok */ }
  if (!tuvalUret) { console.log("  (atlandı: @napi-rs/canvas yok)"); return; }
  const fs = require("fs") as typeof import("fs");
  const kayit = process.env.V12G_PNG;
  const W = 1400, H = 1000;
  const durumlar: [string, Sekil][] = [];
  for (const sb of GEOMETRI_KUTUPHANESI) {
    const nesne = sb.nesne as FizikSekli["nesne"];
    durumlar.push([sb.id, { ...sekil(nesne, { geo: sb.olustur() }), x: 560, y: 420 }]);
    durumlar.push([`${sb.id}-90`, { ...sekil(nesne, { geo: sb.olustur() }), x: 560, y: 420, donus: 90 }]);
  }
  // Köşesi kutu kenarına sürüklenmiş üçgen, uzun adlar
  const s0 = sekil("ucgenABC", { geo: varsayilanUcgen() });
  durumlar.push(["surukle", { ...s0, x: 560, y: 420, geo: { ...varsayilanUcgen({ adlar: ["A(−12,15)", "B", "C(40,70)"] }), mod: "serbest", sabitKutu: true, kose: [{ x: 1.4, y: -0.4 }, { x: -0.4, y: 1.4 }, { x: 1, y: 1 }] } }]);
  durumlar.push(["dogru-uzun", { ...sekil("dogrudaAcilar", { geo: varsayilanDogruAci({ dogruAdlari: ["d_1 doğrusu", "d_2 doğrusu"] }) }), x: 560, y: 420 }]);
  for (const [ad, s] of durumlar) {
    const tuval = tuvalUret(W, H);
    const ctx = tuval.getContext("2d") as CanvasRenderingContext2D;
    ctx.fillStyle = "#ffffff"; ctx.fillRect(0, 0, W, H);
    sekilleriCiz(ctx, [s]);
    const veri = ctx.getImageData(0, 0, W, H).data;
    let x0 = W, y0 = H, x1 = -1, y1 = -1;
    for (let y = 0; y < H; y += 1) for (let x = 0; x < W; x += 1) {
      const i = (y * W + x) * 4;
      if (veri[i] < 245 || veri[i + 1] < 245 || veri[i + 2] < 245) {
        if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
      }
    }
    dogrula(x1 >= 0, `${ad}: hiç çizilmedi`);
    const b = cizimIcerikSiniri(ctx, [s], 14, { w: W, h: H });
    dogrula(x0 >= b.x && y0 >= b.y && x1 + 1 <= b.x + b.w && y1 + 1 <= b.y + b.h,
      `${ad}: mürekkep [${x0},${y0}–${x1},${y1}] içerik sınırının [${b.x},${b.y} ${b.w}×${b.h}] dışında — PNG'de kırpılır`);
    if (kayit && !ad.endsWith("-90") && tuval.toBuffer) {
      // Göz kontrolü için kırpılmış görüntü
      const kirp = tuvalUret(b.w, b.h);
      const kc = kirp.getContext("2d") as CanvasRenderingContext2D;
      kc.drawImage(tuval as unknown as CanvasImageSource, b.x, b.y, b.w, b.h, 0, 0, b.w, b.h);
      fs.writeFileSync(`${kayit}/${ad}.png`, kirp.toBuffer!("image/png"));
    }
  }
  void geometriDisPayi;
});

console.log("TÜM v1.2 GEOMETRİ (G) SENARYOLARI BAŞARILI");
