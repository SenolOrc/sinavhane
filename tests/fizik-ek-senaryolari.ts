// Fizik ek paketleri (akışkanlar, dalgalar, elektrik–manyetizma, çembersel hareket, hareket kavramları,
// madde ve doğası): hesap doğruluğu, panel değerlerinin şekle yansıması, köklü yazım, aşırı değer.
import { createCanvas } from "@napi-rs/canvas";
import { cografyaCiz, cografyaGecerliMi, fizikHesapOzeti, varsayilanCografya, COGRAFYA_BOYUTLARI } from "../src/modules/sinav-olusturucu/cizim/cografya";
import { torricelliHesapla, hidrolikF2, manometreBasinc } from "../src/modules/sinav-olusturucu/cizim/cografya/fizikCizEk";

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
// <<PAKET-EK-TEST>>

console.log("Tüm fizik ek paket senaryoları geçti.");
