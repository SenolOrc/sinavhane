// Fizik ek paketleri (akışkanlar, dalgalar, elektrik–manyetizma, çembersel hareket, hareket kavramları,
// madde ve doğası): hesap doğruluğu, panel değerlerinin şekle yansıması, köklü yazım, aşırı değer.
import { createCanvas } from "@napi-rs/canvas";
import { cografyaCiz, cografyaGecerliMi, fizikHesapOzeti, varsayilanCografya, COGRAFYA_BOYUTLARI } from "../src/modules/sinav-olusturucu/cizim/cografya";
import { torricelliHesapla, hidrolikF2, manometreBasinc } from "../src/modules/sinav-olusturucu/cizim/cografya/fizikCizEk";
import { coulombHesap, cubukHesap, trafoHesap } from "../src/modules/sinav-olusturucu/cizim/cografya/fizikCizElektrik";
import { atmaYuksekligi, dalgaHesap, rezonansHesap } from "../src/modules/sinav-olusturucu/cizim/cografya/fizikCizDalga";

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
// <<PAKET-EK-TEST>>

console.log("Tüm fizik ek paket senaryoları geçti.");
