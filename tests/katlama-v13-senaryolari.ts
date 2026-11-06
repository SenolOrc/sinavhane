// v1.3 serbest geometrik katlama: genel çokgen kâğıt, [DE] boyunca katlama, serbest çizgi,
// sürüklenen hedef (A′), eş kenar/açı işaretleri. React'siz.
import type { GeometriVerisi, Nokta, Sekil } from "../src/modules/sinav-olusturucu/cizim/tipler";
// Not: geometriSekilleri, geometriEk'ten ÖNCE yüklenmeli (modüller arası döngü).
import { KATLAMA_SABLONLARI, geometriVerisiGecerliMi } from "../src/modules/sinav-olusturucu/cizim/geometriSekilleri";
import {
  dogruyuKagidaKirp, ekGeoGecerliMi, kagitDuzgunCokgen, kagitGenelUcgen, kagitKoseleri, kagitParalelkenar, kagitSerbest, kagitYamuk,
  katDuzelt, katlamaHesapla, katlamaYansit, kucukTarafKosesi, sinirdaEnYakin, varsayilanKatlama,
} from "../src/modules/sinav-olusturucu/cizim/geometriEk";
import {
  geoYereldenDunyaya, katlamaCizgisiCiz, katlamaTutamacTasi, katlamaTutamaclari, katlananTarafiDegistir, katlanabilirMi, sekliKatlamayaDonustur,
} from "../src/modules/sinav-olusturucu/cizim/geometriEtkilesim";
import { katlamaYerlesimi } from "../src/modules/sinav-olusturucu/cizim/geometriEk";
import { sekilleriCiz } from "../src/modules/sinav-olusturucu/cizim/ciz";

type KatVeri = Extract<GeometriVerisi, { tur: "katlama" }>;
type FizikSekli = Extract<Sekil, { tur: "fizik" }>;

function dogrula(kosul: unknown, mesaj: string) { if (!kosul) throw new Error(`TEST BAŞARISIZ: ${mesaj}`); }
const yakin = (a: number, b: number, m: string, tol = 1e-6) => dogrula(Math.abs(a - b) <= tol, `${m} (beklenen ${b}, gelen ${a})`);
const uz = (a: Nokta, b: Nokta) => Math.hypot(a.x - b.x, a.y - b.y);
let sayac = 0;
function test(ad: string, f: () => void) { f(); sayac += 1; console.log(`✓ ${ad}`); }

function izlemeCtx() {
  const o: Record<string, unknown> = { font: "", lineWidth: 1 };
  const cagrilar: string[] = [];
  const proxy = new Proxy(o, {
    get(h, ad: string) {
      if (ad === "measureText") return (m: string) => ({ width: [...m].length * 10 });
      if (ad in h) return h[ad];
      return (...a: unknown[]) => { cagrilar.push(ad); return a; };
    },
    set(h, ad: string, d) { h[ad] = d; return true; },
  });
  return { ctx: proxy as unknown as CanvasRenderingContext2D, cagrilar };
}

const ucgen = kagitGenelUcgen(6, 7, 8)!; // |BC|=6, |CA|=7, |AB|=8
const veri = (kagit = ucgen, katlar: KatVeri["katlar"] = []): KatVeri => varsayilanKatlama({ kagit, katlar, sekil1: false, olcu: false, baslik: false, eski: true });
const adim = (ek: Partial<KatVeri["katlar"][number]>): KatVeri["katlar"][number] => ({ mod: "ikiKenar", k1: "A", k2: "B", hareketli: "A", kose: "A", kenar: "BC", uz: 4, hedef: "O", ...ek });

test("genel üçgen kâğıdı: kenar uzunlukları 6-7-8", () => {
  const K = kagitKoseleri(ucgen);
  dogrula(K.length === 3 && K.map((k) => k.ad).join("") === "ABC", "3 köşe A B C");
  yakin(uz(K[0], K[1]), 8, "|AB|"); yakin(uz(K[1], K[2]), 6, "|BC|"); yakin(uz(K[2], K[0]), 7, "|CA|");
  dogrula(kagitGenelUcgen(1, 2, 9) === null, "üçgen eşitsizliği sağlanmazsa null");
});

test("[DE] boyunca katlama (ikiKenar): |AD|=|A′D|, |AE|=|A′E|, D∈AB, E∈AC", () => {
  const v = veri(ucgen, [adim({ kenar1: "AB", oran1: 0.5, kenar2: "CA", oran2: 0.5, hareketli: "A" })]);
  const K = katlamaHesapla(v);
  const A = kagitKoseleri(ucgen)[0], B = kagitKoseleri(ucgen)[1], C = kagitKoseleri(ucgen)[2];
  const D = { x: (A.x + B.x) / 2, y: (A.y + B.y) / 2 }, E = { x: (A.x + C.x) / 2, y: (A.y + C.y) / 2 };
  const Ay = katlamaYansit(K.dogrular[0], A);
  yakin(uz(A, D), uz(Ay, D), "|AD| = |A′D|"); yakin(uz(A, E), uz(Ay, E), "|AE| = |A′E|");
  dogrula(K.katlamaCizgileri[0].length === 2, "katlama çizgisi iki uçlu");
  dogrula(K.katlamaCizgileri[0].some((n) => uz(n, D) < 1e-6) && K.katlamaCizgileri[0].some((n) => uz(n, E) < 1e-6), "uçlar D ve E");
  dogrula(K.hareketliParcalar[0].some((n) => uz(n, A) < 1e-6), "katlanan parça A'yı içerir");
  dogrula(K.sabit.some((n) => uz(n, B) < 1e-6) && K.sabit.some((n) => uz(n, C) < 1e-6), "sabit parça B ve C'yi içerir");
  // orta taban → tabana (BC) paralel
  const dd = { x: E.x - D.x, y: E.y - D.y }, bc = { x: C.x - B.x, y: C.y - B.y };
  yakin(dd.x * bc.y - dd.y * bc.x, 0, "DE ∥ BC");
});

test("serbestCizgi: aynı çizgi ikiKenar ile aynı sonucu verir; küçük taraf otomatik", () => {
  const a = veri(ucgen, [adim({ kenar1: "AB", oran1: 0.4, kenar2: "CA", oran2: 0.6, hareketli: "A" })]);
  const Ka = katlamaHesapla(a);
  const [p, q] = Ka.katlamaCizgileri[0];
  const b = veri(ucgen, [adim({ mod: "serbestCizgi", uc1: p, uc2: q, hareketli: "" })]);
  const Kb = katlamaHesapla(b);
  dogrula(Kb.dogrular[0].hareketli?.ad === "A", "küçük taraf köşesi A");
  const alan = (poly: Nokta[]) => Math.abs(poly.reduce((t, n, i) => { const m = poly[(i + 1) % poly.length]; return t + n.x * m.y - m.x * n.y; }, 0) / 2);
  yakin(alan(Ka.sabit), alan(Kb.sabit), "sabit parça alanı aynı");
  dogrula(kucukTarafKosesi(kagitKoseleri(ucgen), p, q)?.ad === "A", "kucukTarafKosesi A");
});

test("dogruyuKagidaKirp: çizgi kenarlara kırpılır, kesmeyen çizgi null", () => {
  const K = kagitKoseleri(ucgen);
  const r = dogruyuKagidaKirp(K, { x: 2, y: 1 }, { x: 3, y: 1 });
  dogrula(r !== null, "kesen doğru");
  yakin(r![0].y, 1, "uç 1 y"); yakin(r![1].y, 1, "uç 2 y");
  dogrula(sinirdaEnYakin(K, r![0]).uzaklik < 1e-6 && sinirdaEnYakin(K, r![1]).uzaklik < 1e-6, "uçlar sınırda");
  dogrula(dogruyuKagidaKirp(K, { x: 0, y: 100 }, { x: 1, y: 100 }) === null, "dışarıdan geçen doğru null");
});

test("sürüklenen A′ (getir + hedefXY): yansıma tam hedefe düşer, katlama çizgisi orta dikme", () => {
  const A = kagitKoseleri(ucgen)[0];
  const hedef = { x: 3, y: 1.5 };
  const v = veri(ucgen, [adim({ mod: "getir", hareketli: "A", hedefXY: hedef })]);
  const K = katlamaHesapla(v);
  const Ay = katlamaYansit(K.dogrular[0], A);
  yakin(uz(Ay, hedef), 0, "A′ = hedef");
  yakin(K.dogrular[0].p.x, (A.x + hedef.x) / 2, "orta nokta x");
  dogrula(K.katlananlar[0].some((n) => n.ad === "A′"), "katlanan köşe A′ adını alır");
  const d2 = katDuzelt(adim({ mod: "iki", hedefXY: hedef }), kagitKoseleri(ucgen));
  dogrula(d2.hedefXY === undefined, "getir dışında hedefXY temizlenir");
});

test("yamuk, paralelkenar, düzgün beşgen/altıgen kâğıtları katlanır", () => {
  const kagitlar = [kagitYamuk(10, 6, 4), kagitParalelkenar(8, 5, 60), kagitDuzgunCokgen(5, 5), kagitDuzgunCokgen(6, 5)];
  const beklenen = [4, 4, 5, 6];
  kagitlar.forEach((kg, i) => {
    const K = kagitKoseleri(kg);
    dogrula(K.length === beklenen[i], `köşe sayısı ${beklenen[i]}`);
    const v = veri(kg, [katDuzelt(adim({ kenar1: "AB", oran1: 0.5, kenar2: "BC", oran2: 0.5, hareketli: "B" }), K)]);
    const H = katlamaHesapla(v);
    dogrula(H.sabit.length >= 3 && H.katlananlar[0].length >= 3, `parçalar oluştu (${beklenen[i]} köşe)`);
    dogrula(geometriVerisiGecerliMi(v), "doğrulayıcı kabul eder");
    const { ctx, cagrilar } = izlemeCtx();
    const s: FizikSekli = { id: "k", tur: "fizik", nesne: "kagitKatlama", kalinlik: 2, x: 50, y: 50, w: 420, h: 260, geo: { ...v, eslikGoster: true } };
    sekilleriCiz(ctx, [s]);
    dogrula(cagrilar.includes("arc"), "eş açı yayları çizildi");
  });
  const yamuk = kagitKoseleri(kagitYamuk(10, 6, 4));
  yakin(uz(yamuk[0], yamuk[1]), 10, "alt taban"); yakin(uz(yamuk[3], yamuk[2]), 6, "üst taban");
  yakin(kagitKoseleri(kagitParalelkenar(8, 5, 60))[3].y, 5 * Math.sin(Math.PI / 3), "paralelkenar yükseklik");
});

test("katDuzelt: ikiKenar oranı sınırlanır, aynı kenar iki kez seçilemez, varsayılan hareketli ortak köşe", () => {
  const K = kagitKoseleri(ucgen);
  const d = katDuzelt(adim({ kenar1: "AB", kenar2: "AB", oran1: 5, oran2: -2, hareketli: "" }), K);
  dogrula(d.kenar1 !== d.kenar2, "kenarlar farklı"); dogrula(d.oran1 === 0.95 && d.oran2 === 0.05, "oran 0.05–0.95");
  dogrula(d.kenar2 === "BC" && d.hareketli === "B", "varsayılan: sonraki kenar, ortak köşe B");
  const s = katDuzelt(adim({ mod: "serbestCizgi", uc1: undefined, uc2: undefined, hareketli: "Z" }), K);
  dogrula(!!s.uc1 && !!s.uc2 && s.hareketli === "", "serbestCizgi varsayılan uçlar, hareketli otomatik");
});

test("doğrulayıcı: yeni alanlar kabul, bozuk veri red; eski veri aynen geçerli", () => {
  const iyi = veri(ucgen, [adim({ kenar1: "AB", oran1: 0.5, kenar2: "CA", oran2: 0.5 })]);
  dogrula(ekGeoGecerliMi(iyi as unknown as Record<string, unknown>), "yeni veri geçerli");
  dogrula(ekGeoGecerliMi(varsayilanKatlama() as unknown as Record<string, unknown>), "eski varsayılan geçerli");
  const bozuk = { ...iyi, kagit: { ...ucgen, serbestKoseler: [{ ad: "A", x: 0, y: 0 }] } };
  dogrula(!ekGeoGecerliMi(bozuk as unknown as Record<string, unknown>), "2 köşeli serbest kâğıt reddedilir");
  const sonsuz = { ...iyi, katlar: [adim({ mod: "serbestCizgi", uc1: { x: Infinity, y: 0 }, uc2: { x: 1, y: 1 } })] };
  dogrula(!ekGeoGecerliMi(sonsuz as unknown as Record<string, unknown>), "sonsuz uç reddedilir");
  const cokKose = { ...iyi, kagit: kagitSerbest(Array.from({ length: 12 }, (_, i) => ({ x: Math.cos(i), y: Math.sin(i) }))) };
  dogrula(ekGeoGecerliMi(cokKose as unknown as Record<string, unknown>), "12 köşe geçerli");
});



// ── Tuvalde etkileşim (saf yardımcılar) ───────────────────────────────────

const ortak = { kalinlik: 2, cizgiTipi: "duz" as const };
const uc3: Sekil = { id: "u1", tur: "ucgen", ...ortak, x1: 100, y1: 300, x2: 400, y2: 300, x3: 250, y3: 80 } as Sekil;
const katSekil = (s: Sekil) => sekliKatlamayaDonustur(s)!;
const katVeri = (s: FizikSekli) => s.geo as KatVeri;
/** Kâğıt köşesinin tuvaldeki (dünya) yeri — çizimle aynı dönüşüm. */
const dunyada = (s: FizikSekli, ad: string): Nokta => {
  const v = katVeri(s), Y = katlamaYerlesimi(v, { x: s.x, y: s.y, w: s.w, h: s.h });
  const k = kagitKoseleri(v.kagit).find((n) => n.ad === ad)!;
  return geoYereldenDunyaya(s, Y.T2(k));
};

test("sekliKatlamayaDonustur: üçgen/dikdörtgen/çokgen köşeleri tuvalde AYNI yerde kalır", () => {
  const kaynaklar: [string, Sekil, Nokta[]][] = [
    ["üçgen", uc3, [{ x: 100, y: 300 }, { x: 400, y: 300 }, { x: 250, y: 80 }]],
    ["dikdörtgen", { id: "d1", tur: "dikdortgen", ...ortak, x: 50, y: 60, w: 200, h: 120 } as Sekil, [{ x: 50, y: 60 }, { x: 250, y: 60 }, { x: 250, y: 180 }, { x: 50, y: 180 }]],
    ["beşgen", { id: "c1", tur: "cokgen", ...ortak, noktalar: [{ x: 200, y: 50 }, { x: 290, y: 120 }, { x: 255, y: 230 }, { x: 145, y: 230 }, { x: 110, y: 120 }] } as Sekil, [{ x: 200, y: 50 }, { x: 290, y: 120 }, { x: 255, y: 230 }, { x: 145, y: 230 }, { x: 110, y: 120 }]],
  ];
  kaynaklar.forEach(([ad, sk, koseler]) => {
    dogrula(katlanabilirMi(sk), `${ad} katlanabilir`);
    const k = katSekil(sk);
    dogrula(k.nesne === "kagitKatlama" && geometriVerisiGecerliMi(k.geo!), `${ad}: geçerli katlama nesnesi`);
    dogrula(katVeri(k).katlar.length === 0, `${ad}: henüz katlama yok`);
    koseler.forEach((e, i) => { const d = dunyada(k, "ABCDEFGHIJKL"[i]); dogrula(uz(d, e) < 0.01, `${ad}: ${"ABCDE"[i]} köşesi yerinde (${d.x.toFixed(2)}, ${d.y.toFixed(2)})`); });
    dogrula(sekliKatlamayaDonustur(k) === k, `${ad}: zaten katlama ise aynen döner`);
  });
  dogrula(sekliKatlamayaDonustur({ id: "m", tur: "metin", metin: "x", x: 0, y: 0 } as Sekil) === null, "metin katlanamaz");
  dogrula(!katlanabilirMi({ id: "e", tur: "elips", ...ortak, x: 0, y: 0, w: 10, h: 10 } as Sekil), "elips katlanamaz");
  const on3 = { id: "g", tur: "cokgen", ...ortak, noktalar: Array.from({ length: 13 }, (_, i) => ({ x: Math.cos(i) * 50 + 100, y: Math.sin(i) * 50 + 100 })) } as Sekil;
  dogrula(sekliKatlamayaDonustur(on3) === null, "13 köşeli çokgen reddedilir");
});

test("katlamaCizgisiCiz: fareyle çekilen çizgi küçük tarafı (tepeyi) katlar; 2 katlama sınırı", () => {
  const k0 = katSekil(uc3);
  const k1 = katlamaCizgisiCiz(k0, { x: 20, y: 170 }, { x: 600, y: 170 })!;
  dogrula(!!k1, "çizgi kabul edildi");
  const v1 = katVeri(k1);
  dogrula(v1.katlar.length === 1 && v1.katlar[0].mod === "serbestCizgi", "serbestCizgi adımı");
  const K = katlamaHesapla(v1);
  dogrula(K.dogrular[0].hareketli?.ad === "C", "tepe köşesi C katlanır");
  const [p, q] = K.katlamaCizgileri[0];
  const Y = katlamaYerlesimi(v1, { x: k1.x, y: k1.y, w: k1.w, h: k1.h });
  yakin(Y.T2(p).y, 170 - 0, "çizgi tuvalde y=170'te", 0.02); yakin(Y.T2(q).y, 170, "çizgi tuvalde y=170'te (2. uç)", 0.02);
  dogrula(geometriVerisiGecerliMi(k1.geo!), "sonuç geçerli");
  const k2 = katlamaCizgisiCiz(k1, { x: 20, y: 270 }, { x: 600, y: 270 })!;
  dogrula(katVeri(k2).katlar.length === 2, "ikinci katlama eklenir");
  const k3 = katlamaCizgisiCiz(k2, { x: 20, y: 200 }, { x: 600, y: 200 })!;
  dogrula(katVeri(k3).katlar.length === 2, "üçüncüde sonuncunun yerine geçer");
  dogrula(katlamaCizgisiCiz(k0, { x: 0, y: 5 }, { x: 600, y: 5 }) === null, "kâğıdı kesmeyen çizgi null");
  dogrula(katlamaCizgisiCiz(k0, { x: 120, y: 300 }, { x: 380, y: 300 }) === null, "kenar boyunca çizgi null");
});

test("katlamaTutamaclari: D, E uçları ve A′; uç sürüklenince çizgi kenar boyunca kayar", () => {
  const k1 = katlamaCizgisiCiz(katSekil(uc3), { x: 20, y: 170 }, { x: 600, y: 170 })!;
  const T = katlamaTutamaclari(k1);
  dogrula(T.filter((t) => t.tur === "uc").length === 2 && T.filter((t) => t.tur === "hedef").length === 1, "2 uç + 1 hedef tutamacı");
  dogrula(T.find((t) => t.tur === "hedef")!.ad === "C′", "hedef adı C′");
  const ucT = T.find((t) => t.tur === "uc")!;
  const yeni = katlamaTutamacTasi(k1, ucT, { x: ucT.x, y: ucT.y + 40 })!;
  dogrula(!!yeni, "uç sürüklendi");
  const T2 = katlamaTutamaclari(yeni).filter((t) => t.tur === "uc");
  const oncekiDiger = T.find((t) => t.tur === "uc" && t.uc !== ucT.uc)!;
  const sonDiger = T2.find((t) => t.uc !== ucT.uc)!;
  dogrula(uz(sonDiger, oncekiDiger) < 0.02, "öbür uç yerinde");
  const sonUc = T2.find((t) => t.uc === ucT.uc)!;
  dogrula(sonUc.y > ucT.y + 20, `uç aşağı kaydı (${ucT.y.toFixed(1)} → ${sonUc.y.toFixed(1)})`);
  // uç hâlâ kenarın üstünde: üçgenin sol kenarı (100,300)-(250,80) doğrusu
  const sol = { x: 100 + (250 - 100) * ((300 - sonUc.y) / 220), y: sonUc.y };
  const sag = { x: 400 + (250 - 400) * ((300 - sonUc.y) / 220), y: sonUc.y };
  dogrula(Math.min(Math.abs(sonUc.x - sol.x), Math.abs(sonUc.x - sag.x)) < 0.05, "uç kenar üstünde");
  dogrula(katVeri(yeni).katlar[0].mod === "serbestCizgi", "serbestCizgi kalır");
});

test("A′ sürükleme: hedef kenara/köşeye mıknatıslanır, çizgi orta dikme olur", () => {
  const k1 = katlamaCizgisiCiz(katSekil(uc3), { x: 20, y: 170 }, { x: 600, y: 170 })!;
  const hedefT = katlamaTutamaclari(k1).find((t) => t.tur === "hedef")!;
  // BC (alt kenar y=300) yakınına bırak: 6 px yukarıda → kenara oturur
  const k2 = katlamaTutamacTasi(k1, hedefT, { x: 260, y: 294 })!;
  dogrula(!!k2, "A′ sürüklendi");
  const v2 = katVeri(k2);
  dogrula(v2.katlar[0].mod === "getir" && !!v2.katlar[0].hedefXY && v2.katlar[0].hareketli === "C", "getir + hedefXY, C katlanır");
  const Y = katlamaYerlesimi(v2, { x: k2.x, y: k2.y, w: k2.w, h: k2.h });
  const hedefDunya = geoYereldenDunyaya(k2, Y.T2(v2.katlar[0].hedefXY!));
  yakin(hedefDunya.y, 300, "A′ alt kenara (y=300) mıknatıslandı", 0.05);
  const K = katlamaHesapla(v2);
  const C = kagitKoseleri(v2.kagit)[2];
  yakin(uz(katlamaYansit(K.dogrular[0], C), v2.katlar[0].hedefXY!), 0, "yansıma tam hedefte");
  dogrula(geometriVerisiGecerliMi(k2.geo!), "geçerli");
  const ayni = katlamaTutamacTasi(k1, hedefT, { x: 250, y: 80 });
  dogrula(ayni === null, "A′'yü A'nın üstüne bırakmak reddedilir");
  // köşeye mıknatıs: A köşesi (100,300) yakınına
  const kA = katlamaTutamacTasi(k1, hedefT, { x: 104, y: 297 })!;
  const hA = geoYereldenDunyaya(kA, katlamaYerlesimi(katVeri(kA), { x: kA.x, y: kA.y, w: kA.w, h: kA.h }).T2(katVeri(kA).katlar[0].hedefXY!));
  dogrula(uz(hA, { x: 100, y: 300 }) < 0.05, "A′ köşeye (A) oturdu");
});

test("katlananTarafiDegistir: katlanan parçaya tıklayınca karşı taraf katlanır", () => {
  const k1 = katlamaCizgisiCiz(katSekil(uc3), { x: 20, y: 170 }, { x: 600, y: 170 })!;
  const K = katlamaHesapla(katVeri(k1));
  const Y = katlamaYerlesimi(katVeri(k1), { x: k1.x, y: k1.y, w: k1.w, h: k1.h });
  const poly = K.katlananlar[0].map(Y.T2);
  const merkez = geoYereldenDunyaya(k1, { x: poly.reduce((t, n) => t + n.x, 0) / poly.length, y: poly.reduce((t, n) => t + n.y, 0) / poly.length });
  const k2 = katlananTarafiDegistir(k1, merkez)!;
  dogrula(!!k2 && katVeri(k2).katlar[0].hareketli !== "C" && katVeri(k2).katlar[0].hareketli !== "", "karşı taraf seçildi");
  dogrula(katlananTarafiDegistir(k1, { x: 5, y: 5 }) === null, "boş yere tıklamak null");
  dogrula(katlananTarafiDegistir(k2, merkez) !== null || true, "çağrı hata vermez");
});

test("dönmüş katlama şekli: tutamaç ↔ sürükleme tutarlı (döndürme + ayna)", () => {
  const k0 = { ...katlamaCizgisiCiz(katSekil(uc3), { x: 20, y: 170 }, { x: 600, y: 170 })!, donus: 35, ayna: true } as FizikSekli;
  const T = katlamaTutamaclari(k0);
  T.filter((t) => t.tur === "uc").forEach((t) => {
    const ayni = katlamaTutamacTasi(k0, t, { x: t.x, y: t.y })!;
    dogrula(!!ayni, "uç kendi yerine bırakılınca geçerli");
    const T2 = katlamaTutamaclari(ayni).find((u) => u.tur === "uc" && u.uc === t.uc)!;
    dogrula(uz(T2, t) < 0.02, "uç aynı dünya konumunda kaldı");
  });
});

test("sabit yerleşim: katlama değişince köşeler dünyada KAYMAZ, kutu içeriği kapsar (döndürülmüşte de)", () => {
  [0, 40].forEach((donus) => {
    let s = { ...katSekil(uc3), donus } as FizikSekli;
    const onceki = ["A", "B", "C"].map((a) => geoYereldenDunyaya(s, dunyada({ ...s, donus: 0 } as FizikSekli, a)));
    s = katlamaCizgisiCiz(s, { x: 20, y: 170 }, { x: 600, y: 170 })!;
    const hT = katlamaTutamaclari(s).find((t) => t.tur === "hedef")!;
    s = katlamaTutamacTasi(s, hT, { x: 100, y: 120 })!; // üçgenin dışına taşan bir parça
    const sonra = ["A", "B", "C"].map((a) => geoYereldenDunyaya(s, dunyada({ ...s, donus: 0 } as FizikSekli, a)));
    onceki.forEach((o, i) => dogrula(uz(o, sonra[i]) < 0.05, `A B C yerinde (dönüş ${donus})`));
    const v = katVeri(s), Y = katlamaYerlesimi(v, { x: s.x, y: s.y, w: s.w, h: s.h });
    Y.ikinciNoktalar.map(Y.T2).forEach((p) => dogrula(p.x >= s.x && p.x <= s.x + s.w && p.y >= s.y && p.y <= s.y + s.h, "tüm noktalar kutunun içinde"));
    dogrula(s.w > 0 && geometriVerisiGecerliMi(s.geo!), "geçerli");
  });
});

test("yeni hazır katlama şablonları: geçerli, çizilir, geometrik özellikleri doğru", () => {
  const yeni = ["f-ucgen-tepe-de", "f-aciortay", "f-dikme", "f-paralelkenar", "f-yamuk", "f-besgen"];
  yeni.forEach((id) => {
    const sb = KATLAMA_SABLONLARI.find((x) => x.id === id);
    dogrula(!!sb, `${id} var`);
    const v = sb!.olustur() as KatVeri;
    dogrula(geometriVerisiGecerliMi(v), `${id} geçerli`);
    dogrula(sb!.aramaKelimeleri!.length >= 3 && sb!.ipucu.length > 10, `${id} aranabilir ve açıklamalı`);
    const { ctx } = izlemeCtx();
    sekilleriCiz(ctx, [{ id: "k", tur: "fizik", nesne: "kagitKatlama", kalinlik: 2, x: 50, y: 50, w: 420, h: 260, geo: v } as FizikSekli]);
    const K = katlamaHesapla(v);
    dogrula(K.katlananlar.every((p) => p.length >= 3) && K.sabit.length >= 3, `${id}: parçalar var`);
    const L = K.dogrular[0], V = L.hareketli!;
    const Vy = katlamaYansit(L, V);
    const C = kagitKoseleri(v.kagit);
    const orta = { x: (V.x + Vy.x) / 2, y: (V.y + Vy.y) / 2 };
    // yansıma: V–V′ doğruya dik, orta noktası doğru üstünde
    yakin((Vy.x - V.x) * L.d.x + (Vy.y - V.y) * L.d.y, 0, `${id}: VV′ ⊥ katlama çizgisi`, 1e-9);
    yakin(L.d.x * (orta.y - L.p.y) - L.d.y * (orta.x - L.p.x), 0, `${id}: orta nokta çizgi üstünde`, 1e-9);
    if (id === "f-aciortay") {
      const A = C[0], B = C[1], Cc = C[2];
      yakin(uz(A, Vy), uz(A, B), "|AB′| = |AB|", 1e-5);
      const t = ((Vy.x - A.x) * (Cc.x - A.x) + (Vy.y - A.y) * (Cc.y - A.y)) / (uz(A, Cc) ** 2);
      yakin(uz({ x: A.x + (Cc.x - A.x) * t, y: A.y + (Cc.y - A.y) * t }, Vy), 0, "B′ AC üstünde", 1e-5);
    }
    if (id === "f-dikme") {
      yakin(Vy.y, 0, "C′ BC üstünde (y=0)", 1e-9);
      yakin(L.d.x, 0, "[DE] ⊥ [BC]: yön dikey", 1e-9);
    }
  });
  dogrula(KATLAMA_SABLONLARI.length >= 9, "9 hazır katlama şablonu");
});

console.log(`Katlama v1.3 senaryoları: ${sayac} ✓`);
