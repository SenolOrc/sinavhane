// Fizik ek paketleri (akışkanlar, dalgalar, elektrik–manyetizma, çembersel hareket, hareket kavramları,
// madde ve doğası): hesap doğruluğu, panel değerlerinin şekle yansıması, köklü yazım, aşırı değer.
import { createCanvas } from "@napi-rs/canvas";
import { cografyaCiz, cografyaGecerliMi, fizikHesapOzeti, varsayilanCografya, COGRAFYA_BOYUTLARI } from "../src/modules/sinav-olusturucu/cizim/cografya";
import { torricelliHesapla, hidrolikF2, manometreBasinc } from "../src/modules/sinav-olusturucu/cizim/cografya/fizikCizEk";
import { bhmHesap, cemberselHesap, donmeHesap } from "../src/modules/sinav-olusturucu/cizim/cografya/fizikCizDinamik";
import { coulombHesap, cubukHesap, trafoHesap } from "../src/modules/sinav-olusturucu/cizim/cografya/fizikCizElektrik";
import { yolYerHesap, bagilHesap, dusmeHesap, stroboHesap, grafikHesap } from "../src/modules/sinav-olusturucu/cizim/cografya/fizikCizHareket";
import { vektorlerHesap } from "../src/modules/sinav-olusturucu/cizim/cografya/fizikCizVektor";
import { fotoHesap, bozunmaHesap, makineHesap } from "../src/modules/sinav-olusturucu/cizim/cografya/fizikCizModern";
import { kirilmaHesap, derinlikHesap, prizmaHesap, fiberHesap } from "../src/modules/sinav-olusturucu/cizim/cografya/fizikCizOptik";
import { devreAyristir, devreModeli, devreHesapla, devreDuzenle, devreOzet, degerleriOku, yapraklar } from "../src/modules/sinav-olusturucu/cizim/cografya/fizikCizDevre";
import { ucluHesap, akiHesap, ohmHesap, surtunmeHesap, lambaV, ekBul, gSayi } from "../src/modules/sinav-olusturucu/cizim/cografya/fizikCizGrafik";
import { hareketParcalari, GRAFIK_SABLONLARI, grafikCiz } from "../src/modules/sinav-olusturucu/cizim/grafik";
import { atmaYuksekligi, dalgaHesap, rezonansHesap } from "../src/modules/sinav-olusturucu/cizim/cografya/fizikCizDalga";

import { alanHesap, alanVektoru, alanSifirNoktasi, alanTam, degerYaz } from "../src/modules/sinav-olusturucu/cizim/cografya/fizikCizAlan";
import { FIZIK_SABLONLARI } from "../src/modules/sinav-olusturucu/cizim/geometriSekilleri";

function dogrula(k: unknown, m: string) { if (!k) { console.error("✗ " + m); process.exit(1); } }
function senaryo(ad: string, f: () => void) { f(); console.log("  ✓ " + ad); }
const yakin = (a: number, b: number, e = 1e-6) => Math.abs(a - b) <= e;
type V = ReturnType<typeof varsayilanCografya>;
/** Çizim sonrası dolu piksel sayısı (boş mu?) ve verilen ayarla iki çizimin farklı olup olmadığı için özet. */
function mürekkep(v: V): number {
  const { w, h } = COGRAFYA_BOYUTLARI[v.yapi];
  const c = createCanvas(w + 160, h + 160); const ctx = c.getContext("2d") as unknown as CanvasRenderingContext2D;
  ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, w + 160, h + 160);
  ctx.strokeStyle = "#0f172a"; ctx.fillStyle = "#0f172a"; ctx.lineWidth = 2;
  cografyaCiz(ctx, v, { x: 80, y: 80, w, h });
  const d = ctx.getImageData(0, 0, w + 160, h + 160).data;
  let n = 0; for (let i = 0; i < d.length; i += 4) if (d[i] < 200) n++;
  return n;
}
const ayar = (yapi: Parameters<typeof varsayilanCografya>[0], ek: Parameters<typeof varsayilanCografya>[1] = {}) => varsayilanCografya(yapi, ek);

console.log("Fizik ek paket senaryoları");

// ── Paket 1: Akışkanlar
senaryo("Torricelli: v = √(2gd), x = 2√(d(h−d)); d = h/2'de x = h", () => {
  const r = torricelliHesapla(8, 2, 10);
  dogrula(yakin(r.v, Math.sqrt(40)) && yakin(r.x, 2 * Math.sqrt(12)) && yakin(r.yuk, 6), "d=2, h=8");
  dogrula(yakin(torricelliHesapla(8, 4, 10).x, 8), "d=h/2 → x=h");
  const o = fizikHesapOzeti(ayar("torricelli", { d1: 2, d2: 0, d3: 0, kokYaz: true }));
  dogrula(o && o.includes("4√3"), "köklü özet: " + o);
  dogrula(!cografyaGecerliMi({ tur: "cografya", yapi: "torricelli", ayar: { h: 99 } }), "h sınırı");
  dogrula(cografyaGecerliMi({ tur: "cografya", yapi: "torricelli", ayar: { h: "9√2" } }), "köklü h kabul");
});
senaryo("Bernoulli: süreklilik v₂ = A₁v₁/A₂ ve basınç farkı", () => {
  const o = fizikHesapOzeti(ayar("bernoulli", { a1: 40, a2: 10, v1: 2 }));
  dogrula(o && o.includes("v₂ = 8 m/s") && o.includes("30000 Pa"), "venturi özeti: " + o);
  const y = fizikHesapOzeti(ayar("bernoulli", { tip: "yukseklik", a1: 40, a2: 10, v1: 2, dh: 2 }));
  dogrula(y && y.includes("50000 Pa"), "yükseklikli: " + y);
});
senaryo("Hidrolik: F₂ = F₁·A₂/A₁", () => {
  const h = hidrolikF2(ayar("hidrolik", { a1: 10, a2: 50, f1: 100 }));
  dogrula(yakin(h.f2, 500) && yakin(h.oran, 0.2), "F2");
  const a = mürekkep(ayar("hidrolik", { sonuc: "soru" })), b = mürekkep(ayar("hidrolik", { sonuc: "deger" }));
  dogrula(a > 400 && b > a, "değerli çizim daha çok yazı içermeli");
});
senaryo("Manometre: P = P₀ ± ρgh (13,6 g/cm³, 10 cm → 13600 Pa)", () => {
  dogrula(yakin(manometreBasinc(ayar("manometre", { fark: 10, rho: 13.6 })).pa, 13600), "ρgh");
  const o = fizikHesapOzeti(ayar("manometre", { fark: -5 }));
  dogrula(o && o.includes("P₀ −"), "eksi fark: " + o);
});
senaryo("Akışkan şekilleri uç değerlerde çökmez ve boş değildir", () => {
  for (const [y, e] of [["torricelli", { h: 1, d1: 0.5, d2: 20, d3: 0 }], ["torricelli", { h: 20, d1: 10, d2: 0, d3: 0, gaz: true }], ["bernoulli", { a1: 1, a2: 100 }], ["bernoulli", { tip: "yukseklik", dh: 10, a1: 100, a2: 1 }], ["hidrolik", { a1: 1, a2: 400, yol: true }], ["manometre", { fark: 20, tip: "kapali" }], ["manometre", { fark: 0 }]] as const) {
    dogrula(mürekkep(ayar(y, e as never)) > 300, y + " boş/çöktü " + JSON.stringify(e));
  }
});
// ── Paket 2: Dalgalar
senaryo("Atma: sabit uç ters, serbest uç düz yansır; yapıcı toplar, yıkıcı çıkarır", () => {
  // k1=3, gen=2, hız 1: t=16'da merkez 19 → görüntü merkezi 2·16−19 = 13
  const sabit = ayar("atma", { tip: "sabit", t: 16 }), serbest = ayar("atma", { tip: "serbest", t: 16 });
  dogrula(yakin(atmaYuksekligi(sabit, 13, 16), -2) && yakin(atmaYuksekligi(serbest, 13, 16), 2), "yansıyan atma yönü");
  const y = ayar("atma", { tip: "yapici", t: 5, k1: 3, k2: 13, a1: 2, a2: 3 }), z = ayar("atma", { tip: "yikici", t: 5, k1: 3, k2: 13, a1: 3, a2: 2 });
  dogrula(yakin(atmaYuksekligi(y, 8, 5), 5), "yapıcı: 2 + 3");
  dogrula(yakin(atmaYuksekligi(z, 8, 5), 1), "yıkıcı: 3 − 2");
  const o = fizikHesapOzeti(z); dogrula(o && o.includes("1 kare"), "özet: " + o);
  dogrula(!cografyaGecerliMi({ tur: "cografya", yapi: "atma", ayar: { a1: 9 } }), "genlik sınırı");
});
senaryo("Dalga: v = λ/T, f = 1/T; duran dalga λ ve f (boru/tel)", () => {
  const h = dalgaHesap(ayar("dalga", { lam: 4, kareBoy: 10, T: 2 }));
  dogrula(yakin(h.lamCm, 40) && yakin(h.v, 0.2) && yakin(h.f, 0.5), "dalga hesabı");
  dogrula(yakin(rezonansHesap(ayar("rezonans", { tip: "kapali", n: 2, L: 1 })).lam, 4 / 3), "kapalı boru n=2: λ=4L/3");
  dogrula(yakin(rezonansHesap(ayar("rezonans", { tip: "acik", n: 3, L: 1 })).lam, 2 / 3), "açık boru n=3: λ=2L/3");
  const t = rezonansHesap(ayar("rezonans", { tip: "tel", n: 3, L: 1, hiz: 340 }));
  dogrula(yakin(t.f, 510), "tel f = 510 Hz");
});
senaryo("Doppler ve su dalgası özetleri", () => {
  const d = fizikHesapOzeti(ayar("doppler", { oran: 0.5 })); dogrula(d && d.includes("2·f") && d.includes("0,67"), "doppler: " + d);
  dogrula(fizikHesapOzeti(ayar("doppler", { oran: 1.5 }))?.includes("Mach"), "mach");
  const k = fizikHesapOzeti(ayar("kirinim", { tip: "kirilma", aci: 30, oran: 2 })); dogrula(k && k.includes("14,5"), "kırılma açısı: " + k);
  dogrula(fizikHesapOzeti(ayar("kirinim", { tip: "yansima", aci: 40 }))?.includes("40°"), "yansıma");
});
senaryo("Dalga şekilleri uç değerlerde çökmez ve boş değildir", () => {
  const liste: [Parameters<typeof varsayilanCografya>[0], Record<string, unknown>][] = [
    ["atma", { tip: "yapici", a1: 4, a2: 4, gen: 6, t: 20 }], ["atma", { tip: "sabit", t: 0 }], ["atma", { tip: "serbest", gen: 1, a1: 1, yon: "alt", t: 20 }],
    ["dalga", { lam: 8, sayi: 4, genlik: 3 }], ["dalga", { tip: "boyuna", lam: 2, sayi: 4 }], ["rezonans", { tip: "kapali", n: 6, L: 10 }], ["rezonans", { tip: "acik", n: 6 }], ["rezonans", { tip: "tel", n: 1 }],
    ["doppler", { oran: 0 }], ["doppler", { oran: 1.6, n: 8, yon: "sol" }], ["kirinim", { tip: "yansima", aci: 80 }], ["kirinim", { tip: "kirilma", aci: 80, oran: 3 }],
    ["kirinim", { tip: "kirinim", yarik: 6, lam: 30 }], ["kirinim", { tip: "girisim", ara: 6, lam: 8 }], ["kirinim", { tip: "girisim", ara: 1 }],
  ];
  for (const [y, e] of liste) dogrula(mürekkep(ayar(y, e as never)) > 300, y + " boş/çöktü " + JSON.stringify(e));
});
// ── Paket 3: Elektrik – manyetizma
senaryo("Coulomb: işaretli bileşenler ve net kuvvet (k·q²/d² biriminde)", () => {
  // q1=+4 (x=0), q2=−1 (x=3), q3=+1 (x=5); hedef q3: F13 = 4/25 sağa, F23 = −1·1 çekim → sola 1/4
  const h = coulombHesap(ayar("coulomb", {}));
  dogrula(h.bilesen.length === 2, "iki bileşen");
  dogrula(yakin(h.bilesen[0].f, 4 / 25) && yakin(h.bilesen[1].f, -1 / 4), "bileşenler: " + JSON.stringify(h.bilesen));
  dogrula(yakin(h.net, 4 / 25 - 1 / 4), "net");
  const o = coulombHesap(ayar("coulomb", { x1: 0, x2: 2, x3: 6, q1: 2, q2: 1, q3: -3, hedef: "2" }));
  // q2 iki yükün arasında: q1 (+2) onu sağa iter (2/4), q3 (−3) onu sağa çeker (3/16) → 0,6875
  dogrula(yakin(o.net, 2 / 4 + 3 / 16), "arada kalan yük net kuvveti: " + o.net);
  dogrula(coulombHesap(ayar("coulomb", { q3: 0, hedef: "1" })).bilesen.length === 1, "q=0 yük kuvvet vermez");
});
senaryo("İletken çubuk: ε = BLv, I = ε/R, F = BIL, P = εI (köklü giriş dahil)", () => {
  const h = cubukHesap(ayar("iletkenCubuk", { B: 2, L: 0.5, v: 4, R: 2 }));
  dogrula(yakin(h.emk, 4) && yakin(h.I, 2) && yakin(h.F, 2) && yakin(h.P, 8), "değerler");
  const k = ayar("iletkenCubuk", { B: "√3", L: 1, v: 4, R: 2, kokYaz: true });
  dogrula(cografyaGecerliMi(k as never), "köklü kabul");
  const o = fizikHesapOzeti(k); dogrula(o && o.includes("4√3"), "köklü özet: " + o);
});
senaryo("Transformatör: V₂ = V₁N₂/N₁, güç korunumu", () => {
  const h = trafoHesap(ayar("transformator", { n1: 100, n2: 400, v1: 50, r: 20 }));
  dogrula(yakin(h.v2, 200) && yakin(h.i2, 10) && yakin(h.i1, 40) && yakin(h.p, 2000), "değerler");
  dogrula(yakin(h.v1 * h.i1, h.v2 * h.i2), "P1 = P2");
  const o = fizikHesapOzeti(ayar("transformator", {})); dogrula(o && o.includes("yükselten"), "özet: " + o);
});
senaryo("Levha ve elektrik alan özetleri", () => {
  const o = fizikHesapOzeti(ayar("levhaYuk", { V: 100, d: 5 })); dogrula(o && o.includes("2000 V/m"), "E=V/d: " + o);
  dogrula(fizikHesapOzeti(ayar("manyetikParcacik", { tip: "secici" }))?.includes("v = E/B"), "hız seçici");
  dogrula(fizikHesapOzeti(ayar("elektrikAlan", { tip: "ayni" }))?.includes("itme"), "aynı yük");
});
senaryo("Elektrik–manyetizma şekilleri uç değerlerde çökmez ve boş değildir", () => {
  const liste: [Parameters<typeof varsayilanCografya>[0], Record<string, unknown>][] = [
    ["elektrikAlan", { tip: "tek", isaret: "-", es: true, cizgi: 16 }], ["elektrikAlan", { tip: "dipol", oran: 4, cizgi: 16, test: true }], ["elektrikAlan", { tip: "ayni", oran: 3, ara: 60 }], ["elektrikAlan", { tip: "dipol", ara: 15, cizgi: 4 }],
    ["coulomb", { x1: 0, x2: 0, x3: 0 }], ["coulomb", { q1: 0, q2: 0, q3: 0 }], ["coulomb", { x1: 12, x2: 0, x3: 6, hedef: "1", net: true }],
    ["levhaYuk", { tip: "yorunge", isaret: "-", d: 50, V: 1000 }], ["levhaYuk", { tip: "kondansator", dielektrik: true }],
    ["manyetikParcacik", { tip: "sapma", r: 100 }], ["manyetikParcacik", { tip: "sapma", r: 15, isaret: "-", alan: "disari" }], ["manyetikParcacik", { tip: "cember", r: 100 }], ["manyetikParcacik", { tip: "secici", isaret: "-" }],
    ["iletkenCubuk", { yon: "sol", alan: "disari", kuvvet: true }], ["iletkenCubuk", { B: 10, L: 5, v: 50, R: 0.1 }],
    ["transformator", { n1: 5000, n2: 10, sonuc: "deger", akim: true }], ["transformator", { n1: 10, n2: 5000 }],
  ];
  for (const [y, e] of liste) dogrula(mürekkep(ayar(y, e as never)) > 300, y + " boş/çöktü " + JSON.stringify(e));
});
// ── Paket 4: Çembersel hareket, çekim, salınım, dönme
senaryo("Çembersel hareket: a = v²/r, ω = v/r, T = 2πr/v, F = mv²/r (köklü giriş dahil)", () => {
  const h = cemberselHesap(ayar("cembersel", { v: 4, r: 2, m: 1 }));
  dogrula(yakin(h.ac, 8) && yakin(h.w, 2) && yakin(h.T, Math.PI) && yakin(h.Fc, 8), "değerler");
  const k = ayar("cembersel", { v: "4√2", r: 4, m: 2, kokYaz: true });
  dogrula(cografyaGecerliMi(k as never), "köklü kabul");
  const o = fizikHesapOzeti(k); dogrula(o && o.includes("8 m/s²") && o.includes("16 N"), "köklü özet: " + o);
  const v = cemberselHesap(ayar("cembersel", { tip: "egimli", r: 10, aci: 45 }));
  dogrula(yakin(v.vViraj, Math.sqrt(100)), "viraj hızı √(g r tanθ)");
});
senaryo("Basit harmonik: ω = √(k/m), T = 2π√(m/k), v_max = Aω, E = ½kA²; sarkaç T = 2π√(L/g)", () => {
  const h = bhmHesap(ayar("basitHarmonik", { m: 0.5, ks: 50, A: 10, L: 1 }));
  dogrula(yakin(h.w, 10) && yakin(h.T, Math.PI / 5) && yakin(h.vMax, 1) && yakin(h.aMax, 10) && yakin(h.E, 0.25), "yay değerleri");
  dogrula(yakin(h.Tsark, 2 * Math.PI * Math.sqrt(0.1)), "sarkaç");
});
senaryo("Dönme: Atwood makarası, yuvarlanma ivmesi, açısal momentum korunumu", () => {
  const h = donmeHesap(ayar("donme", { m1: 4, m2: 2, M: 2 }));
  dogrula(yakin(h.a, (2 * 10) / (4 + 2 + 1)), "a = (m1−m2)g/(m1+m2+M/2)");
  dogrula(yakin(h.T1, 4 * (10 - h.a)) && yakin(h.T2, 2 * (10 + h.a)) && h.T1 > h.T2, "gerilmeler farklı");
  dogrula(yakin(donmeHesap(ayar("donme", { m1: 3, m2: 3, M: 0 })).a, 0), "eşit kütle");
  dogrula(yakin(donmeHesap(ayar("donme", { tip: "tekerlek", aci: 30, sekil: "silindir" })).aTek, (10 * 0.5) / 1.5), "silindir a = g sinθ /1,5");
  dogrula(donmeHesap(ayar("donme", { tip: "tekerlek", sekil: "halka" })).aTek < donmeHesap(ayar("donme", { tip: "tekerlek", sekil: "kure" })).aTek, "halka küreden yavaş");
  dogrula(yakin(donmeHesap(ayar("donme", { r1: 2, r2: 1, w1: 2 })).w2, 8), "ω₂ = ω₁(r₁/r₂)²");
});
senaryo("Yörünge özetleri", () => {
  dogrula(fizikHesapOzeti(ayar("yorunge", { tip: "kepler" }))?.includes("A₁ = A₂"), "kepler");
  dogrula(fizikHesapOzeti(ayar("yorunge", { tip: "cember" }))?.includes("√(GM/r)"), "uydu");
});
senaryo("Paket 4 şekilleri uç değerlerde çökmez ve boş değildir", () => {
  const liste: [Parameters<typeof varsayilanCografya>[0], Record<string, unknown>][] = [
    ["cembersel", { tip: "yatay", konum: 0 }], ["cembersel", { tip: "yatay", konum: 360, fOk: true, veri: true }], ["cembersel", { tip: "dusey", konum: 90, fOk: true }], ["cembersel", { tip: "dusey", konum: 270, fOk: true, veri: true }],
    ["cembersel", { tip: "konik", aci: 70, fOk: true }], ["cembersel", { tip: "konik", aci: 10 }], ["cembersel", { tip: "egimli", aci: 70, fOk: true, veri: true }], ["cembersel", { tip: "egimli", aci: 10 }],
    ["yorunge", { tip: "cember", konum: 0 }], ["yorunge", { tip: "elips", e: 0.8, konum: 180 }], ["yorunge", { tip: "kepler", e: 0.1 }], ["yorunge", { tip: "kepler", e: 0.8 }],
    ["basitHarmonik", { tip: "yay", veri: true }], ["basitHarmonik", { tip: "sarkac", aci: 40, veri: true }], ["basitHarmonik", { tip: "grafik", grafik: "v" }], ["basitHarmonik", { tip: "grafik", grafik: "a", noktalar: false }],
    ["donme", { tip: "makara", m1: 1, m2: 20, M: 0 }], ["donme", { tip: "makara", m1: 20, m2: 20, M: 20, kuvvet: true }], ["donme", { tip: "tekerlek", sekil: "kure", aci: 60, kuvvet: true }], ["donme", { tip: "tekerlek", sekil: "halka", aci: 10 }],
    ["donme", { tip: "aciSal", r1: 5, r2: 0.5 }], ["donme", { tip: "aciSal", r1: 0.5, r2: 5 }],
  ];
  for (const [y, e] of liste) dogrula(mürekkep(ayar(y, e as never)) > 300, y + " boş/çöktü " + JSON.stringify(e));
});
// ── Paket 5: Hareket kavramları
senaryo("Yol ve yer değiştirme: 3 kare doğu + 4 kare kuzey → yol 7, yer değiştirme 5", () => {
  const h = yolYerHesap(ayar("yolYer", {}));
  dogrula(yakin(h.yol, 7) && yakin(h.yer, 5), "3-4-5");
  const d = yolYerHesap(ayar("yolYer", { tip: "dogru", konum: [6, -2, 3, 3] }));
  dogrula(yakin(d.yol, 6 + 8 + 5) && yakin(d.yer, 3), "doğru üzerinde gidip dönme");
  dogrula(yakin(yolYerHesap(ayar("yolYer", { kareBoy: 10 })).yol, 70), "kare boyu ölçeği");
  dogrula(fizikHesapOzeti(ayar("yolYer", {}))?.includes("yol ≥ |yer değiştirme|"), "özet");
});
senaryo("Bağıl hareket: nehir bileşke hızı, süre, sürüklenme; araç bağıl hızı", () => {
  const h = bagilHesap(ayar("bagilHareket", { vt: 4, va: 3, aci: 0, d: 100 }));
  dogrula(yakin(h.vb, 5) && yakin(h.t, 25) && yakin(h.x, 75), "3-4-5 nehir");
  const e = bagilHesap(ayar("bagilHareket", { vt: 6, va: 3, aci: -30 }));
  dogrula(yakin(e.vx, 0), "akıntıya karşı 30° → sürüklenme yok");
  dogrula(yakin(bagilHesap(ayar("bagilHareket", { v1: 20, v2: 10 })).v21, -10), "v21 = v2 − v1");
  dogrula(fizikHesapOzeti(ayar("bagilHareket", {}))?.includes("5"), "nehir özeti");
});
senaryo("Serbest düşme ve düşey atış formülleri", () => {
  const b = dusmeHesap(ayar("serbestDusme", { n: 4, g: 10 }));
  dogrula(yakin(b.hmax, 80) && yakin(b.vson, 40), "h = ½gt², v = gt");
  const a = dusmeHesap(ayar("serbestDusme", { tip: "yukari", v0: 30, g: 10 }));
  dogrula(yakin(a.T, 3) && yakin(a.hmax, 45) && yakin(a.ucus, 6), "çıkış süresi ve h_max");
});
senaryo("Stroboskop: aralık oranları ve grafik alanları", () => {
  const h = stroboHesap(ayar("stroboskop", { n: 5 }));
  dogrula(h.aralik.join() === "1,3,5,7" && h.toplam === 16, "1:3:5:7");
  dogrula(stroboHesap(ayar("stroboskop", { tip: "yavaslayan", n: 5 })).aralik.join() === "7,5,3,1", "ters oran");
  dogrula(stroboHesap(ayar("stroboskop", { tip: "duzgun", n: 4 })).aralik.join() === "1,1,1", "sabit hız");
  const g = grafikHesap(ayar("hareketGrafigi", { vdeg: [0, 6, 6, 0, -4] }));
  dogrula(yakin(g.yer, 6 + 12 + 6 - 4) && yakin(g.yol, 6 + 12 + 6 + 4), "v–t: yer değiştirme ve yol");
  const x = grafikHesap(ayar("hareketGrafigi", { tip: "xt", xdeg: [0, 8, 8, -4, 0] }));
  dogrula(yakin(x.yer, 0) && yakin(x.yol, 8 + 12 + 4), "x–t: yol ve yer değiştirme");
});
senaryo("Paket 5 şekilleri uç değerlerde çökmez ve boş değildir", () => {
  const liste: [Parameters<typeof varsayilanCografya>[0], Record<string, unknown>][] = [
    ["yolYer", {}], ["yolYer", { dx: [0, 0, 0, 0], dy: [0, 0, 0, 0] }], ["yolYer", { tip: "dogru", konum: [0, 0, 0, 0] }], ["yolYer", { dx: [8, -8, 8, -8], dy: [8, 8, -8, -8], izgara: false, deger: false }],
    ["bagilHareket", { tip: "nehir", va: 0, sonuc: true }], ["bagilHareket", { tip: "nehir", aci: 60, vt: 1, va: 20 }], ["bagilHareket", { tip: "yol", gozlem: "a2" }], ["bagilHareket", { tip: "yol", v1: 0, v2: 0 }],
    ["serbestDusme", { n: 2 }], ["serbestDusme", { n: 5, g: 15 }], ["serbestDusme", { tip: "yukari", v0: 5, n: 5 }], ["serbestDusme", { tip: "yukari", v0: 60, g: 5, n: 5, hiz: false }],
    ["stroboskop", { n: 4, tip: "duzgun" }], ["stroboskop", { n: 8, tip: "hizlanan", nesne: "araba" }], ["stroboskop", { n: 8, tip: "yavaslayan", cetvel: false }],
    ["hareketGrafigi", { vdeg: [0, 0, 0, 0, 0] }], ["hareketGrafigi", { vdeg: [-20, 20, -20, 20, -20] }], ["hareketGrafigi", { tip: "xt", xdeg: [40, -40, 40, -40, 40] }],
  ];
  for (const [y, e] of liste) dogrula(mürekkep(ayar(y, e as never)) > 300, y + " boş/çöktü " + JSON.stringify(e));
});
// ── Paket 6: Madde ve doğası, basit makineler
senaryo("Fotoelektrik: E_k = hf − W, eşik altında elektron yok", () => {
  const h = fotoHesap(ayar("fotoelektrik", { hf: 5, W: 3 }));
  dogrula(h.kopar && yakin(h.Ek, 2), "E_k = 2 eV");
  const a = fotoHesap(ayar("fotoelektrik", { hf: 2, W: 3 }));
  dogrula(!a.kopar && yakin(a.Ek, 0), "eşik altı");
  dogrula(fizikHesapOzeti(ayar("fotoelektrik", { hf: 2, W: 3 }))?.includes("sökülmez"), "eşik altı özeti");
  dogrula(fizikHesapOzeti(ayar("fotoGrafik", {}))?.includes("doyma akımı"), "I–V özeti");
});
senaryo("Radyoaktif bozunma: N = N₀/2ⁿ ve α/β/γ tepkimeleri", () => {
  const h = bozunmaHesap(ayar("bozunma", { n: 3, N0: 80, T: 4 }));
  dogrula(yakin(h.kalan, 10) && yakin(h.bozunan, 70) && yakin(h.sure, 12), "3 yarı ömür");
  const al = bozunmaHesap(ayar("bozunma", { A: 238, Z: 92, bozun: "alfa" }));
  dogrula(al.A2 === 234 && al.Z2 === 90, "alfa: A−4, Z−2");
  const be = bozunmaHesap(ayar("bozunma", { A: 14, Z: 6, bozun: "beta" }));
  dogrula(be.A2 === 14 && be.Z2 === 7, "beta: Z+1");
  const ga = bozunmaHesap(ayar("bozunma", { A: 60, Z: 28, bozun: "gama" }));
  dogrula(ga.A2 === 60 && ga.Z2 === 28, "gama: değişmez");
});
senaryo("Basit makineler: kaldıraç, makara, eğik düzlem", () => {
  dogrula(yakin(makineHesap(ayar("basitMakine", { G: 120, l1: 1, l2: 3 })).F, 40), "F = G·l1/l2");
  dogrula(yakin(makineHesap(ayar("basitMakine", { tip: "makara", G: 120, n: 2 })).F, 60), "F = G/n");
  const e = makineHesap(ayar("basitMakine", { tip: "egimli", G: 120, L: 5, h: 3 }));
  dogrula(yakin(e.F, 72) && yakin(e.kazanc, 120 / 72), "F = G·h/L");
  dogrula(makineHesap(ayar("basitMakine", { tip: "egimli", L: 2, h: 19 })).h < 2, "h ≥ L ise sınırlanır");
});
senaryo("Paket 6 şekilleri uç değerlerde çökmez ve boş değildir", () => {
  const liste: [Parameters<typeof varsayilanCografya>[0], Record<string, unknown>][] = [
    ["fotoelektrik", {}], ["fotoelektrik", { hf: 0.5, W: 8 }], ["fotoelektrik", { tip: "enerji", hf: 12, W: 0.5 }], ["fotoelektrik", { tip: "enerji", hf: 1, W: 8 }], ["fotoelektrik", { tip: "grafik", W2: 8, W: 0.5, hf: 12 }], ["fotoelektrik", { tip: "grafik", hf: 0.5, W: 8, veri: false }], ["fotoelektrik", { yogun: 4, veri: false }],
    ["fotoGrafik", {}], ["fotoGrafik", { tip: "frekans", v0: 1, v02: 12 }], ["fotoGrafik", { i1: 10, i2: 1 }], ["fotoGrafik", { i1: 5, i2: 5, veri: false }],
    ["bozunma", {}], ["bozunma", { n: 4, N0: 4000 }], ["bozunma", { tip: "izgara", n: 4 }], ["bozunma", { tip: "izgara", n: 1, veri: false }], ["bozunma", { tip: "tepkime", veri: false }], ["bozunma", { tip: "tepkime", bozun: "beta" }], ["bozunma", { tip: "tepkime", bozun: "gama", A: 300, Z: 120 }],
    ["basitMakine", {}], ["basitMakine", { l1: 10, l2: 1 }], ["basitMakine", { tip: "makara", n: 1 }], ["basitMakine", { tip: "makara", n: 6, sonuc: true }], ["basitMakine", { tip: "egimli", L: 20, h: 19, sonuc: true }], ["basitMakine", { tip: "egimli", L: 1, h: 1, veri: false }],
  ];
  for (const [y, e] of liste) dogrula(mürekkep(ayar(y, e as never)) > 300, y + " boş/çöktü " + JSON.stringify(e));
});
// ── Serbest vektör çizimi
senaryo("Serbest vektör: bileşenle ve büyüklük+açıyla giriş, bileşke", () => {
  const h = vektorlerHesap(ayar("vektorSerbest", { n: 2, xs: [3, 1, 0, 0, 0, 0], ys: [4, -2, 0, 0, 0, 0] }));
  dogrula(yakin(h.R.x, 4) && yakin(h.R.y, 2) && yakin(h.buy[0], 5), "x–y bileşenleri toplanır");
  const g = vektorlerHesap(ayar("vektorSerbest", { mod: "boyAci", n: 3, boy: [10, 10, 10, 0, 0, 0], aci: [0, 120, 240, 0, 0, 0] }));
  dogrula(yakin(g.buyR, 0, 1e-9), "120° aralıklı üç eşit kuvvetin bileşkesi 0");
  const d = vektorlerHesap(ayar("vektorSerbest", { mod: "boyAci", n: 1, boy: [10, 0, 0, 0, 0, 0], aci: [90, 0, 0, 0, 0, 0] }));
  dogrula(d.vek[0].x === 0 && yakin(d.vek[0].y, 10), "90° → x tam sıfır");
  dogrula(fizikHesapOzeti(ayar("vektorSerbest", { n: 2, xs: [3, 0, 0, 0, 0, 0], ys: [0, 4, 0, 0, 0, 0], adR: "F" }))?.includes("= 5"), "özet bileşke büyüklüğü");
  for (const e of [{ yerlesim: "serbest", n: 6, bx0: [0, 5, -5, 3, -3, 1], by0: [0, 5, -5, 3, -3, 1], bileske: true, bilesen: true }, { yerlesim: "serbest", n: 2, aciYay: true, deger: true }, { yerlesim: "paralel", n: 5 }, { yerlesim: "bilesenler", n: 3, mod: "boyAci" }, { n: 1 }, { n: 6, xs: [30, -30, 30, -30, 30, -30], ys: [30, 30, -30, -30, 0, 0] }, { yerlesim: "ayni", n: 6 }, { n: 3, bileske: false, izgara: false }, { n: 4, xs: [1, -1, 0, 0, 0, 0], ys: [0, 0, 0, 0, 0, 0] }, { mod: "boyAci", n: 6, aciYay: true, eksen: true, deger: true, birim: "N" }])
    dogrula(mürekkep(ayar("vektorSerbest", e as never)) > 100, "vektorSerbest boş/çöktü " + JSON.stringify(e));
});
senaryo("Boş kareli cevap alanı: 1–3 alan, yan yana/alt alta, çizgisiz ve eksenli", () => {
  for (const e of [{}, { adet: 1 }, { adet: 2, yon: "alt" }, { adet: 3, yon: "alt", sutun: 20, satir: 16 }, { cizgi: false }, { eksen: true, sutun: 3, satir: 3 }, { baslik: "" }])
    dogrula(mürekkep(ayar("kareliAlan", e as never)) > 300, "kareliAlan boş/çöktü " + JSON.stringify(e));
  dogrula(cografyaGecerliMi(ayar("kareliAlan", { adet: 3 })), "geçerli");
});
// ── Optik: ışığın kırılması
const R2D = 180 / Math.PI;
senaryo("Kırılma: Snell yasası, sınır açısı, tam yansıma", () => {
  const k = kirilmaHesap(ayar("kirilma", { n1: 1, n2: "4/3", aci: 53 }));
  dogrula(yakin(k.n2, 4 / 3, 1e-9) && !k.tir1 && yakin(Math.sin(k.t2), Math.sin((53 * Math.PI) / 180) / (4 / 3)), "θ₂ Snell");
  dogrula(yakin(k.t2 * R2D, 36.8, 0.02), "53° → 36,8°");
  const c = kirilmaHesap(ayar("kirilma", { n1: 1.5, n2: 1, aci: 30 }));
  dogrula(yakin(c.kritik1 * R2D, 41.8103, 1e-3) && !c.tir1, "sınır açısı asin(n₂/n₁)");
  dogrula(kirilmaHesap(ayar("kirilma", { n1: 1.5, n2: 1, aci: 60 })).tir1, "60° > θ_s → tam yansıma");
  const e = kirilmaHesap(ayar("kirilma", { n1: 2, n2: 1, aci: 30 }));
  dogrula(e.sinirda && !e.tir1 && yakin(e.t2, Math.PI / 2, 1e-6), "tam sınır açısında θ₂ = 90°");
  dogrula(!kirilmaHesap(ayar("kirilma", { n1: 1, n2: 1.5, aci: 89 })).tir1, "seyrekten yoğuna tam yansıma olmaz");
  dogrula(yakin(kirilmaHesap(ayar("kirilma", { n1: 1.5, n2: 1.5, aci: 40 })).t2, (40 * Math.PI) / 180, 1e-9), "n₁ = n₂ → doğrultu değişmez");
  const o = fizikHesapOzeti(ayar("kirilma", { n1: 1, n2: "4/3", aci: 53 }));
  dogrula(o && o.includes("θ₂ = 36,8°"), "özet: " + o);
  dogrula(cografyaGecerliMi(ayar("kirilma", { n2: "4/3" })) && !cografyaGecerliMi({ tur: "cografya", yapi: "kirilma", ayar: { n2: 5 } }), "n aralığı");
});
senaryo("Kırılma: paralel yüzlü levha ve üç katman", () => {
  const l = kirilmaHesap(ayar("kirilma", { tip: "levha", n1: 1, n2: 1.5, aci: 50, e: 4 }));
  dogrula(yakin(l.t3, l.t1, 1e-9), "çıkan ışın gelene paralel (θ₃ = θ₁)");
  dogrula(yakin(l.d, (4 * Math.sin(l.t1 - l.t2)) / Math.cos(l.t2), 1e-9) && l.d > 0, "yanal kayma d");
  dogrula(yakin(kirilmaHesap(ayar("kirilma", { tip: "levha", aci: 0 })).d, 0, 1e-9), "dik gelişte kayma yok");
  const u = kirilmaHesap(ayar("kirilma", { tip: "uc", n1: 1, n2: 1.5, n3: "4/3", aci: 50 }));
  dogrula(yakin(Math.sin(u.t1), u.n2 * Math.sin(u.t2), 1e-9) && yakin(u.n2 * Math.sin(u.t2), u.n3 * Math.sin(u.t3), 1e-9), "n₁sinθ₁ = n₂sinθ₂ = n₃sinθ₃");
  const t = kirilmaHesap(ayar("kirilma", { tip: "uc", n1: 1.6, n2: 1.4, n3: 1, aci: 40 }));
  dogrula(!t.tir1 && t.tir2 && yakin(t.kritik2 * R2D, 45.58, 0.01), "2. sınırda tam yansıma");
});
senaryo("Görünür derinlik: h′ = h·n_göz/n_cisim", () => {
  const a = derinlikHesap(ayar("gorunurDerinlik", { n: "4/3", h: 40 }));
  dogrula(yakin(a.hg, 30, 1e-3), "40 cm, n = 4/3 → 30 cm");
  dogrula(yakin(derinlikHesap(ayar("gorunurDerinlik", { n: "4/3", h: 40, yon: "havada" })).hg, 53.3333, 1e-3), "gözlemci sıvıda → n·h");
  const o = fizikHesapOzeti(ayar("gorunurDerinlik", { n: "4/3", h: 40 }));
  dogrula(o && o.includes("30 cm"), "özet: " + o);
});
senaryo("Prizma: eşkenar minimum sapma, dik prizmada 90° ve 180° dönme", () => {
  const A = 60, n = 1.5, t1 = Math.asin(n * Math.sin((A / 2) * Math.PI / 180)) * R2D;
  const m = prizmaHesap(ayar("prizmaIsin", { A, n, aci: t1 }));
  dogrula(m.cikti && yakin(m.sapma * R2D, 2 * t1 - A, 1e-6) && yakin(m.sapma * R2D, 37.1808, 1e-3), "minimum sapma δ = 2θ₁ − A");
  const g = prizmaHesap(ayar("prizmaIsin", { A, n, aci: 30 }));
  const t2 = Math.asin(Math.sin((30 * Math.PI) / 180) / n), t3 = (A * Math.PI) / 180 - t2, t4 = Math.asin(n * Math.sin(t3));
  dogrula(yakin(g.iz.olaylar[1].aciDis, t4, 1e-9) && yakin(g.sapma * R2D, 30 + t4 * R2D - A, 1e-6), "çıkış açısı ve δ = θ₁ + θ₄ − A");
  const d90 = prizmaHesap(ayar("prizmaIsin", { A: 90, n: 1.5, aci: 0, nokta: 50 }));
  dogrula(d90.cikti && d90.tirSayisi === 1 && yakin(d90.sapma * R2D, 90, 1e-6), "dik prizma: 90° dönme");
  const d180 = prizmaHesap(ayar("prizmaIsin", { A: 90, n: 1.5, giris: "taban", aci: 0, nokta: 28 }));
  dogrula(d180.cikti && d180.tirSayisi === 2 && yakin(d180.sapma * R2D, 180, 1e-6), "dik prizma: 180° dönme");
  const cam = prizmaHesap(ayar("prizmaIsin", { A: 90, n: 1.3, aci: 0 }));
  dogrula(cam.tirSayisi === 0 && cam.cikti, "n = 1,3: 45° sınır açısını aşmaz, tam yansıma olmaz");
  dogrula(fizikHesapOzeti(ayar("prizmaIsin", { A: 90, aci: 0 }))?.includes("tam yansıma"), "özet tam yansıma");
});
senaryo("Fiber optik: tam yansıma ve kabul açısı", () => {
  const f = fiberHesap(ayar("fiberOptik", { n1: 1.5, n2: 1.4, aci: 25 }));
  dogrula(f.tir && yakin(f.duvar, Math.PI / 2 - Math.asin(Math.sin((25 * Math.PI) / 180) / 1.5), 1e-9), "duvara gelme açısı 90° − θ₂");
  dogrula(yakin(f.aMaks * R2D, Math.asin(Math.sqrt(2.25 - 1.96)) * R2D, 1e-6), "α_maks");
  dogrula(!fiberHesap(ayar("fiberOptik", { aci: 55 })).tir, "α > α_maks → sızar");
});
senaryo("Optik şekilleri uç değerlerde çökmez ve boş değildir", () => {
  const liste: [Parameters<typeof varsayilanCografya>[0], Record<string, unknown>][] = [
    ["kirilma", { aci: 0 }], ["kirilma", { aci: 89, aciYaz: true }], ["kirilma", { n1: 1.5, n2: 1.5, aci: 40 }], ["kirilma", { n1: 1.5, n2: 1, aci: 89, kritik: true, aciYaz: true }],
    ["kirilma", { n1: 2, n2: 1, aci: 30, kritik: true }], ["kirilma", { sinir: "dusey", n1: 1.5, n2: 1, aci: 70, kritik: true, yansima: true }],
    ["kirilma", { tip: "levha", aci: 89 }], ["kirilma", { tip: "levha", n1: 1.5, n2: 1, aci: 30 }], ["kirilma", { tip: "uc", n1: 1, n2: 2.5, n3: 1, aci: 85 }],
    ["kirilma", { tip: "uc", n1: 1.6, n2: 1.4, n3: 1, aci: 40, goster: "aciGizli" }], ["kirilma", { goster: "kirilanYok", nYaz: false, ortamAd: false, normal: false }],
    ["prizmaIsin", { A: 20, aci: 10, aciYaz: true }], ["prizmaIsin", { A: 120, aci: -60, aciYaz: true, sapma: true }], ["prizmaIsin", { A: 60, n: 3, aci: 85, aciYaz: true }],
    ["prizmaIsin", { A: 60, aci: 0, degerYaz: true, sapma: true }], ["prizmaIsin", { A: 45, giris: "taban", aci: 30, nokta: 80 }], ["prizmaIsin", { n: 1.05, aci: -85, dagilma: true, dn: 0.2 }],
    ["gorunurDerinlik", { n: 3, h: 200 }], ["gorunurDerinlik", { n: 1.05, h: 1, deger: true }], ["gorunurDerinlik", { yon: "havada", n: 3, h: 200, deger: true }], ["gorunurDerinlik", { olcu: false, goz: false, cisim: "nokta" }],
    ["fiberOptik", { aci: 0 }], ["fiberOptik", { aci: 80, n2: 1 }], ["fiberOptik", { n1: 1.05, n2: 1.05, aci: 10 }],
  ];
  for (const [y, e] of liste) dogrula(mürekkep(ayar(y, e as never)) > 300, y + " boş/çöktü " + JSON.stringify(e));
  dogrula(mürekkep(ayar("kirilma", { aci: 20 })) !== mürekkep(ayar("kirilma", { aci: 60 })), "açı değişince şekil değişir");
});
// ── Karma devre
const dv = (ek: Record<string, unknown>) => ayar("karmaDevre", ek as never);
const hes = (ek: Record<string, unknown>) => { const m = devreModeli(dv(ek)); return { m, s: devreHesapla(m) }; };
senaryo("Karma devre: ayrıştırıcı (boşluk, ∥, |, //, tek eleman, hatalar)", () => {
  const ad = (i: string) => { const a = devreAyristir(i); return a.ok ? JSON.stringify(a.agac) : "HATA:" + a.hata; };
  dogrula(ad("R1 + (R2 // R3)") === ad("R1+(R2∥R3)") && ad("R1+(R2|R3)") === ad("  r1 + ( r2 || r3 ) "), "ayırıcı yazımları eşdeğer");
  dogrula(ad("R_1+(R_2//R_3)") === ad("R1+(R2//R3)"), "R_1 yazımı");
  const a = devreAyristir("R1 + R2 // R3");
  dogrula(a.ok && a.agac.t === "s" && a.agac.c[1].t === "p", "// '+' tan sıkı bağlanır");
  const b = devreAyristir("(R1 + R2) // R3 + R4");
  dogrula(b.ok && b.agac.t === "s" && b.agac.c.length === 2 && b.agac.c[0].t === "p", "(R1+R2)//R3+R4");
  const c = devreAyristir("R1 + (R2 + R3)");
  dogrula(c.ok && c.agac.t === "s" && c.agac.c.length === 3, "iç içe seri düzleşir");
  dogrula(devreAyristir("R1").ok && devreAyristir("((R1))").ok, "tek eleman, gereksiz parantez");
  for (const k of ["R1 + (R2 // R3", "R1 + R2)", "R1 + X2", "R1 R2", "R1 +", "", "()", "R1 + R1", "R1 // // R2", "5 + R1", "R1 $ R2"])
    dogrula(!devreAyristir(k).ok, "hata beklenirdi: '" + k + "'");
  dogrula(!devreAyristir("R1+R2+R3+R4+R5+R6+R7+R8+R9+R10+R11+R12+R13").ok, "eleman sınırı");
  const d = degerleriOku("R1=2, R2=3,5 , L1 = 6,R3=1.5");
  dogrula(d.R1 === 2 && d.R2 === 3.5 && d.L1 === 6 && d.R3 === 1.5, "değer okuma");
  dogrula(dv({ ifade: "R1 + (R2" }) && (fizikHesapOzeti(dv({ ifade: "R1 + (R2" })) ?? "").startsWith("İfade okunamadı"), "özette hata");
});
senaryo("Karma devre: R_eş (seri, paralel, karma, iç içe derinlik 3)", () => {
  const R = (i: string, d: string, ek: Record<string, unknown> = {}) => hes({ ifade: i, degerler: d, mod: "kl", ...ek }).s.Req;
  dogrula(yakin(R("R1+R2+R3", "R1=2,R2=3,R3=5"), 10), "seri");
  dogrula(yakin(R("R1//R2//R3", "R1=6,R2=3,R3=2"), 1), "paralel 1/6+1/3+1/2");
  dogrula(yakin(R("R1+(R2//R3)", "R1=4,R2=6,R3=3"), 6), "R1+(R2//R3)");
  dogrula(yakin(R("(R1+R2)//R3+R4", "R1=2,R2=4,R3=3,R4=4"), 6), "(R1+R2)//R3+R4");
  dogrula(yakin(R("(R1//R2)+(R3//R4)", "R1=6,R2=3,R3=4,R4=4"), 4), "iki grup");
  // derinlik 3: R1 + ((R2 + R3) // (R4 + (R5 // R6)))  = 2 + (6 // (1+2)) = 4
  dogrula(yakin(R("R1 + ((R2 + R3) // (R4 + (R5 // R6)))", "R1=2,R2=3,R3=3,R4=1,R5=6,R6=3"), 4), "derinlik 3");
  dogrula(yakin(R("(R1+(R2//(R3+(R4//R5))))//R6", "R1=1,R2=2,R3=3,R4=6,R5=3,R6=2"), (() => { const i = 3 + 2; const a = 2 * i / (2 + i); const b = 1 + a; return b * 2 / (b + 2); })()), "derinlik 4");
  dogrula(R("R1", "R1=7") === 7, "tek eleman");
  const eks = hes({ ifade: "R1+R2", degerler: "R1=1", mod: "kl" }).s;
  dogrula(!eks.tam && eks.eksik.join() === "R2", "eksik değer");
  dogrula((fizikHesapOzeti(dv({ mod: "kl", ifade: "R1+(R2//R3)", degerler: "R1=4,R2=6,R3=3" })) ?? "").includes("R_eş = 6 Ω"), "KL özeti");
  dogrula(!(fizikHesapOzeti(dv({ mod: "kl", ifade: "R1+(R2//R3)", degerler: "R1=4,R2=6,R3=3" })) ?? "").includes(" A"), "KL: akım yok");
});
senaryo("Karma devre: akım/gerilim toplam kuralları ve ölçü aleti okumaları", () => {
  const { m, s } = hes({ ifade: "R1 + ((R2 + R3) // (R4 + (R5 // R6)))", degerler: "R1=2,R2=3,R3=3,R4=1,R5=6,R6=3", V: 24, r: 1 });
  dogrula(s.tam && yakin(s.Req, 4) && yakin(s.I, 24 / 5) && yakin(s.Vu, 24 - s.I), "I = V/(R_eş+r), dış gerilim");
  const q = (a: string) => s.yaprak.get(yapraklar(m.agac).find((y) => y.ad === a)!)!;
  dogrula(yakin(q("R1").I, s.I) && yakin(q("R1").V, 2 * s.I), "R1 ana akım");
  const Vp = s.Vu - q("R1").V;
  dogrula(yakin(q("R2").V + q("R3").V, Vp) && yakin(q("R4").V + q("R5").V, Vp), "kol gerilimleri toplamı = paralel gerilim");
  dogrula(yakin(q("R2").I + q("R4").I, s.I), "kol akımları toplamı = I");
  dogrula(yakin(q("R5").I + q("R6").I, q("R4").I) && yakin(q("R5").V, q("R6").V), "iç paralel: akım bölüşümü");
  for (const y of yapraklar(m.agac)) dogrula(yakin(q(y.ad).V, q(y.ad).R * q(y.ad).I), "Ohm " + y.ad);
  // ampermetre ana kol, voltmetre eleman
  const a = hes({ ifade: "R1 + (R2 // R3)", degerler: "R1=4,R2=6,R3=3", V: 12, ampermetre: "ana", voltmetre: "eleman", voltmetreEleman: "R1" });
  dogrula(yakin(a.s.I, 2) && yakin(a.s.yaprak.get(a.m.anaAmper!)!.I, 2) && yakin(a.s.yaprak.get(a.m.ekVolt!)!.V, 8) && yakin(a.s.yaprak.get(a.m.ekVolt!)!.I, 0), "A = 2 A, V = 8 V, ideal voltmetre akımsız");
  dogrula(yakin(a.s.Req, 6), "ideal aletler R_eş'i değiştirmez");
  const e = hes({ ifade: "R1 + (R2 // R3)", degerler: "R1=4,R2=6,R3=3", V: 12, ampermetre: "eleman", ampermetreEleman: "R3" });
  dogrula(yakin(e.s.yaprak.get(e.m.ekAmper!)!.I, 4 / 3), "R3 kolundaki ampermetre 4/3 A");
  const o = fizikHesapOzeti(dv({ ifade: "R1 + (R2 // R3)", degerler: "R1=4,R2=6,R3=3", V: 12, ampermetre: "ana", voltmetre: "eleman" })) ?? "";
  dogrula(o.includes("I = V/(R_eş + r)") && o.includes("Ampermetre 2 A") && o.includes("Voltmetre 8 V") && o.includes("R₂ ∥ R₃") , "özet: " + o);
  const u = hes({ voltmetre: "uretec", V: 12, r: 1 });
  dogrula(yakin(u.s.Vu, 12 - 12 / 7), "üreteç uçları voltmetresi = V − I·r");
  const bad = devreModeli(dv({ ampermetre: "eleman", ampermetreEleman: "R9" }));
  dogrula(bad.hata && bad.hata.startsWith("Eleman bulunamadı"), "olmayan eleman adı");
});
senaryo("Karma devre: anahtar (açık → akım 0, kol kapanır) ve kısa devre", () => {
  const ac = hes({ ifade: "L1 + (L2 // L3)", degerler: "L1=6,L2=6,L3=3", anahtar: true, anahtarDurum: "acik" }).s;
  dogrula(ac.Req === Infinity && ac.I === 0, "açık anahtar: R_eş = ∞, I = 0");
  dogrula((fizikHesapOzeti(dv({ ifade: "L1", degerler: "L1=6", anahtar: true, anahtarDurum: "acik" })) ?? "").includes("akım 0"), "açık devre özeti");
  const kp = hes({ ifade: "L1 + (L2 // L3)", degerler: "L1=6,L2=6,L3=3", anahtar: true, anahtarDurum: "kapali", V: 12 }).s;
  dogrula(yakin(kp.Req, 8) && yakin(kp.I, 1.5), "kapalı anahtar direnci 0");
  const kolAcik = hes({ ifade: "R1 + (R2 // (S1 + R3))", degerler: "R1=4,R2=6,R3=3", anahtarDurum: "acik", V: 10 }).s;
  dogrula(yakin(kolAcik.Req, 10) && yakin(kolAcik.I, 1), "kolundaki açık anahtar kolu devre dışı bırakır");
  const kisa = hes({ ifade: "R1 // A1", degerler: "R1=5", V: 10, r: 1 }).s;
  dogrula(kisa.Req === 0 && yakin(kisa.I, 10), "ampermetre koluyla kısa devre R_eş = 0");
});
senaryo("Karma devre: yerleşim (dik tel, çakışmasız elemanlar, kutuya sığar) ve çizim", () => {
  const olc = (t: string) => t.length * 7;
  const ifadeler = ["R1", "R1+R2+R3+R4+R5+R6", "R1//R2//R3//R4//R5//R6", "R1+(R2//R3)", "(R1+R2)//R3+R4", "R1 + ((R2 + R3) // (R4 + (R5 // R6)))", "(R1+(R2//(R3+(R4//R5))))//R6", "L1+(L2//L3)"];
  for (const i of ifadeler) for (const yer of ["sol", "ust", "alt"]) for (const mod of ["uretec", "kl"]) {
    const ek = { ifade: i, degerler: "R1=1,R2=2,R3=3,R4=4,R5=5,R6=6,L1=1,L2=2,L3=3", uretecYeri: yer, mod, voltmetre: "uretec", ampermetre: "ana", anahtar: true, dugum: true, akim: true, okuma: true };
    const m = devreModeli(dv(ek)), s = devreHesapla(m);
    const d = devreDuzenle(m, s, { punto: 12, olc, etiket: "adDeger", soru: false, okuma: true, uretecYeri: yer as "sol", uretecYaz: true, akim: true, dugum: true });
    for (const p of d.prims) if (p.t === "tel") dogrula(p.x0 === p.x1 || p.y0 === p.y1, `${i}/${yer}/${mod}: tel dik değil`);
    const el = d.prims.filter((p): p is Extract<typeof p, { t: "el" }> => p.t === "el");
    for (let a = 0; a < el.length; a++) for (let b = a + 1; b < el.length; b++) {
      const A = el[a], B = el[b];
      dogrula(Math.abs(A.cx - B.cx) > (A.bw + B.bw) / 2 + 2 || Math.abs(A.cy - B.cy) > 26, `${i}/${yer}/${mod}: elemanlar çakışıyor`);
    }
    dogrula(d.kutu.x1 - d.kutu.x0 > 40 && d.kutu.y1 - d.kutu.y0 > 40, "kutu");
  }
  for (const i of ifadeler) {
    const n = mürekkep(dv({ ifade: i, degerler: "R1=1,R2=2,R3=3,R4=4,R5=5,R6=6,L1=1,L2=2,L3=3" }));
    dogrula(n > 800, "boş çizim: " + i);
  }
  dogrula(mürekkep(dv({ ifade: "R1 + (R2" })) > 100, "hata iletisi çizilir");
  dogrula(mürekkep(dv({ voltmetre: "eleman", ampermetre: "eleman" })) > mürekkep(dv({})), "ölçü aletleri şekle eklenir");
  dogrula(mürekkep(dv({ soru: false })) > mürekkep(dv({ soru: true })), "soru modunda değerler çizilmez");
  dogrula(cografyaGecerliMi({ tur: "cografya", yapi: "karmaDevre", ayar: { ifade: "R1+(R2//R3)", V: 12 } }), "geçerli ayar");
  dogrula(!cografyaGecerliMi({ tur: "cografya", yapi: "karmaDevre", ayar: { V: 999 } }), "V sınırı");
});

// ── Hesaplı grafikler: hareket üçlüsü, V–I, sürtünme, Φ–t / ε–t
senaryo("Hareket üçlüsü: v, x'in türevi; a, v'nin eğimi; süresi 0 olan etap atlanır", () => {
  const v = ayar("hareketUclu", { n: 4, x0: 3, v0: 2, sure: [4, 0, 4, 2, 0, 0], ivme: [3, 99, -2, 0, 0, 0] });
  const h = ucluHesap(v);
  dogrula(h.etaplar.length === 3 && yakin(h.T, 10), "0 süreli etap atlanmalı");
  const xp = hareketParcalari("konum", h.x0, h.v0, h.evreler)[0], vp = hareketParcalari("hiz", h.x0, h.v0, h.evreler)[0], ap = hareketParcalari("ivme", h.x0, h.v0, h.evreler);
  dogrula(ap.length === 3 && yakin(ap[0][0].y, 3) && yakin(ap[1][0].y, -2) && yakin(ap[2][0].y, 0), "a = etap ivmesi");
  for (let i = 1; i < vp.length; i++) dogrula(yakin((vp[i].y - vp[i - 1].y) / (vp[i].x - vp[i - 1].x), ap[i - 1][0].y), "a = v eğimi");
  // x'in sayısal türevi v'ye eşit (örneklenen parabol noktalarında)
  for (let i = 1; i < xp.length - 1; i++) {
    const hv = (xp[i + 1].y - xp[i - 1].y) / (xp[i + 1].x - xp[i - 1].x);
    const t = xp[i].x, ev = vp.length > 1 ? vp.reduce((a, b, j) => (j && vp[j - 1].x <= t && t <= b.x ? vp[j - 1].y + ((b.y - vp[j - 1].y) * (t - vp[j - 1].x)) / (b.x - vp[j - 1].x) : a), NaN) : NaN;
    if (Number.isFinite(ev)) dogrula(Math.abs(hv - ev) < 0.4, `x'=v t=${t.toFixed(2)}: ${hv} vs ${ev}`);
  }
  dogrula(yakin(xp[xp.length - 1].y, h.xSon, 1e-6) && yakin(h.vSon, 2 + 12 - 8 + 0), "uç değerler");
  dogrula(yakin(h.yer, h.xSon - 3), "yer değiştirme");
});
senaryo("Hareket üçlüsü: hız girişinde ivme = Δv/Δt; geri dönüşte yol > yer değiştirme", () => {
  const h = ucluHesap(ayar("hareketUclu", { giris: "hiz", n: 3, sure: [2, 2, 2, 0, 0, 0], vson: [8, 0, -4, 0, 0, 0], v0: 0 }));
  dogrula(yakin(h.etaplar[0].ivme, 4) && yakin(h.etaplar[1].ivme, -4) && yakin(h.etaplar[2].ivme, -2), "ivmeler");
  dogrula(yakin(h.vSon, -4) && yakin(h.yer, 8 + 8 - 4) && yakin(h.yol, 8 + 8 + 4), `yer ${h.yer} yol ${h.yol}`);
  const g = ucluHesap(ayar("hareketUclu", { n: 1, v0: 10, sure: [4, 0, 0, 0, 0, 0], ivme: [-5, 0, 0, 0, 0, 0] }));
  dogrula(yakin(g.vSon, -10) && yakin(g.yer, 0) && yakin(g.yol, 20), "dönüş: 10 m ileri, 10 m geri");
  const o = fizikHesapOzeti(ayar("hareketUclu", {}));
  dogrula(o && o.includes("1. etap") && o.includes("a = 5 m/s²"), "özet: " + o);
});
senaryo("Hareket üçlüsü: soru modunda iki grafik boş; kenar durumlar çizilir", () => {
  const dolu = mürekkep(ayar("hareketUclu", { goster: "hepsi" })), bir = mürekkep(ayar("hareketUclu", { goster: "x" })), uc = mürekkep(ayar("hareketUclu", { goster: "a", bosSayi: false }));
  dogrula(dolu > bir && bir > 1500 && uc > 800, `soru modu mürekkebi ${dolu} ${bir} ${uc}`);
  const durumlar: Record<string, number | boolean | string | number[]>[] = [
    { sure: [0, 0, 0, 0, 0, 0] }, { ivme: [0, 0, 0, 0, 0, 0], v0: 0, x0: 0 }, { n: 6, sure: [1, 2, 3, 1, 2, 3], ivme: [30, -30, 30, -30, 30, -30], v0: -60, x0: -200 },
    { n: 6, sure: [30, 30, 30, 30, 30, 30], ivme: [1, 1, 1, 1, 1, 1] }, { giris: "hiz", n: 6, sure: [0.1, 0.1, 0.1, 0.1, 0.1, 0.1], vson: [60, -60, 60, -60, 60, -60] },
    { yerlesim: "yan", sayilar: "adim" }, { sayilar: "yok", sifir: false }, { tAd: "zaman t (saniye cinsinden)", xAd: "konum x (kilometre cinsinden)" },
  ];
  for (const d of durumlar) { const n = mürekkep(ayar("hareketUclu", d)); dogrula(n > 300, "çizim boş: " + JSON.stringify(d)); dogrula(cografyaGecerliMi(ayar("hareketUclu", d) as unknown as Record<string, unknown>), "geçerli: " + JSON.stringify(d)); }
  dogrula(!cografyaGecerliMi({ tur: "cografya", yapi: "hareketUclu", ayar: { n: 9 } }), "etap sınırı");
  dogrula(fizikHesapOzeti(ayar("hareketUclu", { sure: [0, 0, 0, 0, 0, 0] }))!.includes("boş"), "boş özet");
});
senaryo("V–I: R eğimi, lamba doğrusal değil, kılavuz değerleri", () => {
  const h = ohmHesap(ayar("ohmGrafik", { n: 3, R: [2, 4, 8], I0: 2 }));
  dogrula(h.n === 3 && yakin(h.Vler[0], 4) && yakin(h.Vler[1], 8) && yakin(h.Vler[2], 16), "V = R·I₀");
  dogrula(ohmHesap(ayar("ohmGrafik", { n: 2, R: [2, 4, 8] })).R.length === 2, "n direnç");
  const a = lambaV(1, 4, 4), b = lambaV(2, 4, 4), c = lambaV(4, 4, 4);
  dogrula(b > a && c > b && c / 4 > a / 1 * 1.2 && yakin(lambaV(0, 4, 4), 0), "lamba: R artar, V(0)=0");
  const l = ohmHesap(ayar("ohmGrafik", { lamba: "yalniz" }));
  dogrula(l.n === 0 && l.lambaVar, "yalnız lamba");
  const o = fizikHesapOzeti(ayar("ohmGrafik", { n: 2, R: [2, 5, 10], I0: 2 }));
  dogrula(o && o.includes("R1 = 2 Ω → V = 4 V") && o.includes("R2 = 5 Ω → V = 10 V"), "özet: " + o);
  for (const d of [{ lamba: "ekle" }, { lamba: "yalniz", I0: 0 }, { eksen: "IV", n: 3, deger: true, rDeger: true }, { R: [1000, 1000, 1000], Imax: 100, I0: 100 }, { R: [0.5, 1000, 0.5], n: 3 }, { I0: 0, eksenSayi: true, izgara: true }, { R: [5, 5, 5], n: 3 }, { iAd: "akım şiddeti I (amper)", vAd: "potansiyel fark V (volt)", n: 3, deger: true }]) {
    dogrula(mürekkep(ayar("ohmGrafik", d as never)) > 600, "V–I çizimi: " + JSON.stringify(d));
  }
  dogrula(mürekkep(ayar("ohmGrafik", { I0: 2 })) > mürekkep(ayar("ohmGrafik", { I0: 0 })), "kılavuz çizgi ekler");
});
senaryo("Sürtünme grafiği: f_s,max ve kinetik", () => {
  const h = surtunmeHesap(ayar("surtunmeGrafik", { fsmax: 20, fk: 14 }));
  dogrula(yakin(h.fsmax, 20) && yakin(h.fk, 14) && yakin(h.mu, 0.7), "değerler");
  dogrula(yakin(surtunmeHesap(ayar("surtunmeGrafik", { fsmax: 10, fk: 30 })).fk, 10), "f_k ≤ f_s,max kırpılır");
  const o = fizikHesapOzeti(ayar("surtunmeGrafik", {}));
  dogrula(o && o.includes("20 N") && o.includes("14 N"), "özet: " + o);
  for (const d of [{ fk: 0 }, { fk: 20 }, { fsmax: 500, fk: 499 }, { fsmax: 1, fk: 1 }, { etiket: false, kilavuz: false }, { deger: true, devam: true, eksenSayi: true, izgara: true }, { fsmax: 100, fk: 98, deger: true }]) {
    dogrula(mürekkep(ayar("surtunmeGrafik", d as never)) > 500, "sürtünme çizimi: " + JSON.stringify(d));
  }
  dogrula(mürekkep(ayar("surtunmeGrafik", { etiket: true })) > mürekkep(ayar("surtunmeGrafik", { etiket: false })), "durgun/kinetik yazıları");
});
senaryo("Φ–t ve ε–t: ε = −N·ΔΦ/Δt, işaret ve sıfır", () => {
  const h = akiHesap(ayar("akiEmk", { N: 1, n: 4, sure: [2, 2, 2, 2, 0, 0], phi: [6, 6, 0, 0, 0, 0] }));
  dogrula(h.etaplar.length === 4 && yakin(h.etaplar[0].emk, -3) && yakin(h.etaplar[1].emk, 0) && yakin(h.etaplar[2].emk, 3) && yakin(h.etaplar[3].emk, 0), "ε basamakları " + h.etaplar.map((e) => e.emk));
  const n = akiHesap(ayar("akiEmk", { N: 50, n: 1, phi0: 0.1, sure: [0.5, 0, 0, 0, 0, 0], phi: [0.4, 0, 0, 0, 0, 0] }));
  dogrula(yakin(n.etaplar[0].emk, -30, 1e-6), "N=50: ε = −50·0,3/0,5 = −30, bulunan " + n.etaplar[0].emk);
  const z = akiHesap(ayar("akiEmk", { n: 3, sure: [2, 0, 2, 0, 0, 0], phi: [4, 99, 0, 0, 0, 0] }));
  dogrula(z.etaplar.length === 2 && yakin(z.etaplar[1].phi0, 4) && yakin(z.etaplar[1].emk, 2), "0 süreli etap atlanır, akı sürekli");
  const o = fizikHesapOzeti(ayar("akiEmk", {}));
  dogrula(o && o.includes("ε = −ΔΦ/Δt = −3") && o.includes("Lenz"), "özet: " + o);
  const hepsi = mürekkep(ayar("akiEmk", { goster: "ikisi" })), soru = mürekkep(ayar("akiEmk", { goster: "akiVerilir" })), tek = mürekkep(ayar("akiEmk", { goster: "emk" }));
  dogrula(hepsi > soru && soru > 800 && tek > 400, `gösterim kipleri ${hepsi} ${soru} ${tek}`);
  for (const d of [{ sure: [0, 0, 0, 0, 0, 0] }, { phi: [0, 0, 0, 0, 0, 0], phi0: 0 }, { n: 6, sure: [1, 1, 1, 1, 1, 1], phi: [100, -100, 100, -100, 100, -100], phi0: -100 }, { yerlesim: "yan", goster: "aki" }, { goster: "emkVerilir", deger: true, dik: true, nokta: true, izgara: true }, { N: 1000, sure: [0.5, 0.5, 0.5, 0.5, 0.5, 0.5], n: 6 }, { phiAd: "manyetik akı Φ (weber cins.)", emkAd: "indüksiyon emk'sı ε (volt)" }]) {
    dogrula(mürekkep(ayar("akiEmk", d as never)) > 300, "Φ–t çizimi: " + JSON.stringify(d));
  }
});
senaryo("Boş cevap grafikleri (genel grafik): eğri yok, eksenler ve kareler var; 0 ve sayılar ayarlanır", () => {
  const bos = GRAFIK_SABLONLARI.filter((x) => x.id.startsWith("bos-"));
  dogrula(bos.length >= 5, "boş şablonlar");
  const ink = (g: ReturnType<typeof bos[0]["olustur"]>) => {
    const c = createCanvas(420, 260); const x = c.getContext("2d") as unknown as CanvasRenderingContext2D;
    x.fillStyle = "#fff"; x.fillRect(0, 0, 420, 260); x.strokeStyle = "#0f172a"; x.fillStyle = "#0f172a";
    grafikCiz(x, { id: "g", tur: "fizik", nesne: "grafik", kalinlik: 2, x: 80, y: 60, w: 250, h: 140, grafik: g } as never);
    const d = x.getImageData(0, 0, 420, 260).data; let n = 0; for (let i = 0; i < d.length; i += 4) if (d[i] < 200) n++; return n;
  };
  for (const b of bos) { const g = b.olustur(); dogrula(g.egriler.length === 0 && g.izgara === true && g.yEtiket && g.xEtiket, b.id + ": eğrisiz kareli"); dogrula(ink(g) > 500, b.id + ": boş değil"); }
  const sayisiz = bos.find((x) => x.id === "bos-sayisiz")!.olustur();
  dogrula(ink({ ...sayisiz, sifir: true }) > ink({ ...sayisiz, sifir: false }), "orijin 0 yazısı");
  dogrula(ink(bos.find((x) => x.id === "bos-xt")!.olustur()) > ink(sayisiz), "sayılar yazılır");
  dogrula(bos.find((x) => x.id === "bos-vt")!.olustur().yMin! < 0, "negatif bölge");
});
senaryo("Sayı biçimi ve eksen aralığı yardımcıları", () => {
  dogrula(gSayi(-1.5) === "−1,5" && gSayi(-0.001) === "0" && gSayi(0.25) === "0,25", "Türkçe ondalık, −");
  const e = ekBul(-3, 6); dogrula(e.lo <= -3 && e.hi >= 6 && e.adim > 0, "aralık kapsar");
  dogrula(ekBul(0, 0).lo === -1 && ekBul(0, 0).hi === 1, "hepsi sıfır");
});
// ── Elektrik alan: kareli düzlemde nokta yükler (elektrikAlanNokta)
senaryo("elektrikAlanNokta: tek yük E = |q|/r², yön + yükten uzağa / − yüke doğru", () => {
  const a = alanVektoru([{ x: 0, y: 0, q: 2 }], 3, 0);
  dogrula(yakin(a.ex, 2 / 9) && yakin(a.ey, 0), "+2q, r=3 → 2/9");
  const b = alanVektoru([{ x: 0, y: 0, q: -1 }], 0, 2);
  dogrula(yakin(b.ex, 0) && yakin(b.ey, -1 / 4), "−q: yüke doğru (−y), 1/4");
  const h = alanHesap(ayar("elektrikAlanNokta", { yukSayisi: 1, yx: [-2, 0, 0, 0], yq: [2, 0, 0, 0], noktaSayisi: 2, nx: [1, -2, 0], ny: [0, 2, 0] }));
  dogrula(yakin(h.noktalar[0].buy, 2 / 9) && yakin(h.noktalar[1].buy, 1 / 2) && yakin(h.noktalar[1].ey, 1 / 2), "K, L büyüklükleri");
});
senaryo("elektrikAlanNokta: süperpozisyon (bileşke = tek tek alanların vektörel toplamı)", () => {
  const h = alanHesap(ayar("elektrikAlanNokta", { yukSayisi: 4, yx: [-3, 3, 3, -3], yy: [3, 3, -3, -3], yq: [1, -2, 3, -1], noktaSayisi: 3, nx: [0, 2, -1], ny: [0, 1, -2] }));
  for (const p of h.noktalar) {
    const t = alanVektoru(h.yukler, p.x, p.y);
    dogrula(yakin(p.ex, t.ex) && yakin(p.ey, t.ey), p.ad + ": toplam");
    dogrula(yakin(p.ex, p.tek.reduce((s2, x) => s2 + x.ex, 0)), p.ad + ": tek tek toplam");
    dogrula(yakin(p.buy, Math.hypot(p.ex, p.ey)), p.ad + ": büyüklük");
  }
  const sab = (id: string) => FIZIK_SABLONLARI.find((x) => x.id === id)!.olustur();
  const u = alanHesap(sab("f-ealannokta-uc-yuk")).noktalar[0];
  dogrula(yakin(u.ex, 0) && yakin(u.ey, 1 / 2) && yakin(u.aci, 90), "+q,+q,−2q: bileşke +y, 1/2");
});
senaryo("elektrikAlanNokta: simetri — eşit yüklerin ortası E = 0, dipol ortası 2kq/r² (−q'ya doğru), kare merkezi √2/4", () => {
  const sab = (id: string) => FIZIK_SABLONLARI.find((x) => x.id === id)!.olustur();
  const e = alanHesap(sab("f-ealannokta-esit-orta")).noktalar[0];
  dogrula(e.sifir && e.buy === 0 && yakin(e.tek[0].buy, 1 / 9) && yakin(e.tek[1].buy, 1 / 9), "iki +q ortası: sıfır");
  const d = alanHesap(sab("f-ealannokta-dipol-orta")).noktalar[0];
  dogrula(yakin(d.ex, 2 / 9) && yakin(d.ey, 0) && !d.sifir, "dipol: +x (−q yönü), 2/9");
  const k = alanHesap(sab("f-ealannokta-kare-4")).noktalar[0];
  dogrula(yakin(k.buy, Math.SQRT2 / 4) && yakin(k.ex, 0) && yakin(k.ey, -Math.SQRT2 / 4) && yakin(k.aci, -90), "kare-4 merkez: √2/4, −y");
  const fiz = FIZIK_SABLONLARI.filter((x) => x.id.startsWith("f-ealannokta-"));
  dogrula(fiz.length >= 8, "en az 8 şablon: " + fiz.length);
  for (const t of fiz) dogrula(cografyaGecerliMi(t.olustur() as unknown as Record<string, unknown>) && mürekkep(t.olustur()) > 800, t.id + ": geçerli ve boş değil");
});
senaryo("elektrikAlanNokta: doğru üzerinde E = 0 noktası (q ve 4q → 1/3'te; zıt yükte dışarıda)", () => {
  dogrula(yakin(alanSifirNoktasi(0, 1, 3, 4)!, 1), "q (0) ve 4q (3): x = 1 (d/3)");
  dogrula(yakin(alanSifirNoktasi(0, 4, 3, 1)!, 2), "4q (0) ve q (3): x = 2");
  dogrula(yakin(alanSifirNoktasi(0, 1, 3, -4)!, -3), "q ve −4q: küçük yükün dışında x = −3");
  dogrula(yakin(alanSifirNoktasi(0, 4, 3, -1)!, 6), "4q ve −q: x = 6");
  dogrula(alanSifirNoktasi(0, 1, 3, -1) === null, "eşit zıt yükler: yok");
  dogrula(alanSifirNoktasi(2, 1, 2, 1) === null && alanSifirNoktasi(0, 0, 3, 1) === null, "çakışık / yüksüz: yok");
  for (const [q1, q2] of [[1, 4], [2, 3], [1, -4], [3, -2], [5, 5]] as [number, number][]) {
    const x = alanSifirNoktasi(-1, q1, 4, q2)!;
    const f = alanVektoru([{ x: -1, y: 0, q: q1 }, { x: 4, y: 0, q: q2 }], x, 0);
    dogrula(Math.hypot(f.ex, f.ey) < 1e-9, `q1=${q1}, q2=${q2}: bulunan noktada alan sıfır`);
  }
  const v = ayar("elektrikAlanNokta", { mod: "dogru", yx: [0, 3, 0, 0], yq: [1, 4, 0, 0], noktaSayisi: 0 });
  dogrula(yakin(alanHesap(v).sifirX!, 1), "mod dogru: sifirX");
  dogrula((fizikHesapOzeti(v) ?? "").includes("x = 1"), "özet: E = 0 noktası x = 1: " + fizikHesapOzeti(v));
});
senaryo("elektrikAlanNokta: köklü ve kesirli çıktı tam (√2/2, 3/5, 1/4), özet köklü", () => {
  const v = ayar("elektrikAlanNokta", { yukSayisi: 2, yx: [-1, 1, 0, 0], yy: [0, 0, 0, 0], yq: [1, -1, 0, 0], noktaSayisi: 1, nx: [0, 0, 0], ny: [1, 0, 0] });
  const p = alanHesap(v).noktalar[0];
  dogrula(yakin(p.buy, Math.SQRT2 / 2) && yakin(p.ex, Math.SQRT2 / 2) && yakin(p.ey, 0), "dipol dik açı: √2/2");
  dogrula(alanTam(p.buy) === "√2/2" && alanTam(0.25) === "1/4" && alanTam(-3 / 5) === "−3/5" && alanTam(0) === "0", "alanTam biçimleri");
  const oz = fizikHesapOzeti(v) ?? "";
  dogrula(oz.includes("|E| = √2/2 kq/d²") && oz.includes("E_y = 0"), "özet köklü: " + oz);
  const ayarli = (kok: boolean) => mürekkep(ayar("elektrikAlanNokta", { yukSayisi: 2, yx: [-1, 1, 0, 0], yy: [0, 0, 0, 0], yq: [1, -1, 0, 0], noktaSayisi: 1, nx: [0, 0, 0], ny: [1, 0, 0], deger: true, kokYaz: kok }));
  dogrula(degerYaz(Math.SQRT2 / 2, true) === "√2/2" && degerYaz(Math.SQRT2 / 2, false) === "0,71" && degerYaz(0.25, false) === "1/4", "şekil yazısı: köklü kip √, kapalıyken ondalık");
  dogrula(ayarli(true) > 500 && ayarli(false) > 500, "köklü kip çizimi");
  const k2 = alanHesap(ayar("elektrikAlanNokta", { yukSayisi: 2, yx: [-1, 2, 0, 0], yy: [0, 1, 0, 0], yq: [1, 3, 0, 0], noktaSayisi: 1, nx: [0, 0, 0], ny: [0, 0, 0] })).noktalar[0];
  dogrula(alanTam(k2.tek[0].buy) === "1" && alanTam(k2.tek[1].buy) === "3/5", "kesirli tek tek alanlar");
});
senaryo("elektrikAlanNokta: kenar durumlar (yük üzerinde nokta, çakışık yükler, hepsi sıfır, soru modu, yalnız yön)", () => {
  const ust = ayar("elektrikAlanNokta", { yukSayisi: 2, yx: [0, 3, 0, 0], yy: [0, 0, 0, 0], yq: [1, -2, 0, 0], noktaSayisi: 2, nx: [0, 1, 0], ny: [0, 1, 0], deger: true });
  const hu = alanHesap(ust);
  dogrula(hu.noktalar[0].yukUstunde && hu.noktalar[0].tek.length === 0 && !hu.noktalar[1].yukUstunde, "yük üzerindeki nokta atlanır");
  dogrula(/yükün üzerinde/.test(fizikHesapOzeti(ust) ?? "") && mürekkep(ust) > 500, "özet ve çizim");
  const cak = alanHesap(ayar("elektrikAlanNokta", { yukSayisi: 2, yx: [1, 1, 0, 0], yy: [1, 1, 0, 0], yq: [1, 2, 0, 0], noktaSayisi: 1, nx: [-1, 0, 0], ny: [0, 0, 0] })).noktalar[0];
  const tek = alanVektoru([{ x: 1, y: 1, q: 3 }], -1, 0);
  dogrula(yakin(cak.ex, tek.ex) && yakin(cak.ey, tek.ey), "çakışık yükler toplanır");
  const sifir = ayar("elektrikAlanNokta", { yukSayisi: 3, yq: [0, 0, 0, 0], noktaSayisi: 3 });
  dogrula(alanHesap(sifir).yukler.length === 0 && /Yük bulunamadı/.test(fizikHesapOzeti(sifir) ?? "") && mürekkep(sifir) > 100, "hepsi sıfır: çökmez");
  const soru = ayar("elektrikAlanNokta", { goster: "yok" }), tam = ayar("elektrikAlanNokta", {}), bilesenYok = ayar("elektrikAlanNokta", { goster: "tek" });
  dogrula(mürekkep(soru) < mürekkep(bilesenYok) && mürekkep(bilesenYok) < mürekkep(tam), "soru modu < yalnız tek < tümü");
  const yon = ayar("elektrikAlanNokta", { olcek: "yon" });
  dogrula(mürekkep(yon) !== mürekkep(tam), "yalnız yön farklı çizilir");
  for (const e of [{ yukSayisi: 4, yx: [8, -8, 8, -8], yy: [8, 8, -8, -8], yq: [9, -9, 9, -9], noktaSayisi: 3, nx: [8, -8, 0], ny: [-8, 8, 0], deger: true, bilesen: true }, { kareBoy: 60, okBoy: 5 }, { mod: "dogru", noktaSayisi: 3, nx: [-8, 8, 0], deger: true }]) {
    const v2 = ayar("elektrikAlanNokta", e as never);
    dogrula(cografyaGecerliMi(v2 as unknown as Record<string, unknown>) && mürekkep(v2) > 300, "uç değer çizilir");
  }
});
// <<PAKET-EK-TEST>>

console.log("Tüm fizik ek paket senaryoları geçti.");
