// Fizik şekilleri (atış, enerji, çarpışma, tork, vektör toplama, serbest cisim): hesap doğruluğu,
// şema/doğrulama, şablonlar, çizim (boş değil, kutudan fazla taşmaz), aşırı değerlerde çökmeme.
import { createCanvas } from "@napi-rs/canvas";
import {
  COGRAFYA_BOYUTLARI, FIZIK_SEMA, FIZIK_YAPILARI, SEMA, atisHesapla, carpismaSonra, cografyaCiz, cografyaGecerliMi,
  fizikHesapOzeti, torkDengesi, varsayilanCografya,
} from "../src/modules/sinav-olusturucu/cizim/cografya";
import { FIZIK_SABLONLARI, GEOMETRI_KUTUPHANESI } from "../src/modules/sinav-olusturucu/cizim/geometriSekilleri";
import { sekilGecerliMi } from "../src/modules/sinav-olusturucu/cizim/sablon";
import { baglantiPortlari, portluMu } from "../src/modules/sinav-olusturucu/cizim/etkilesim";
import type { Sekil } from "../src/modules/sinav-olusturucu/cizim/tipler";
import { fizikIcerikTutunma, icerikTuvaliAyarla } from "../src/modules/sinav-olusturucu/cizim/fizikIcerik";
import { baglayiciYolu } from "../src/modules/sinav-olusturucu/cizim/geometri";

function dogrula(k: unknown, m: string) { if (!k) { console.error("✗ " + m); process.exit(1); } }
function senaryo(ad: string, f: () => void) { f(); console.log("  ✓ " + ad); }
const yakin = (a: number, b: number, e = 1e-6) => Math.abs(a - b) <= e;
type V = ReturnType<typeof varsayilanCografya>;

const PAY = 80;
/** Mürekkep sayısı + kutunun PAY px'ten fazla dışına taşan mürekkep var mı. */
function olc(v: V) {
  const { w, h } = COGRAFYA_BOYUTLARI[v.yapi];
  const W = w + 2 * PAY, H = h + 2 * PAY;
  const c = createCanvas(W, H); const ctx = c.getContext("2d") as unknown as CanvasRenderingContext2D;
  ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = "#0f172a"; ctx.fillStyle = "#0f172a"; ctx.lineWidth = 2;
  cografyaCiz(ctx, v, { x: PAY, y: PAY, w, h });
  const d = ctx.getImageData(0, 0, W, H).data;
  let n = 0, tasma = 0;
  const ic = 36; // kutunun 44 px dışına kadar yazı/ok payı normal; daha ötesi taşmadır
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (d[(y * W + x) * 4] < 200) { n++; if (x < PAY - 44 || x > PAY + w + 44 || y < PAY - 44 || y > PAY + h + 44) tasma++; }
  }
  void ic;
  return { n, tasma };
}

console.log("Fizik şekilleri senaryoları");

senaryo("altı yapı, şema ve varsayılanlar geçerli", () => {
  dogrula(FIZIK_YAPILARI.length === 6, "6 yapı bekleniyordu");
  for (const y of FIZIK_YAPILARI) {
    dogrula(SEMA[y].alanlar.length > 3, y + ": alan yok");
    dogrula(FIZIK_SEMA[y].alt.startsWith("Fizik – "), y + ": alt başlık");
    dogrula(cografyaGecerliMi(varsayilanCografya(y) as unknown as Record<string, unknown>), y + ": varsayılan geçersiz");
    dogrula(COGRAFYA_BOYUTLARI[y].w > 200, y + ": boyut yok");
  }
});

senaryo("atış hesapları (g = 10)", () => {
  const a = atisHesapla(varsayilanCografya("atis", { tip: "egik", v0: 20, aci: 45, h0: 0, g: 10 }));
  dogrula(yakin(a.R, 40, 1e-6), "R = v²/g = 40, bulunan " + a.R);
  dogrula(yakin(a.H, 10, 1e-6), "H = 10, bulunan " + a.H);
  dogrula(yakin(a.T, 2 * Math.sqrt(2), 1e-6), "T = 2,83");
  const y = atisHesapla(varsayilanCografya("atis", { tip: "yatay", v0: 20, h0: 80, g: 10 }));
  dogrula(yakin(y.T, 4) && yakin(y.R, 80) && yakin(y.H, 80), "yatay atış: T=4, R=80, H=80");
  const as = atisHesapla(varsayilanCografya("atis", { tip: "yuksekEgik", v0: 20, aci: -90 + 53, h0: 60, g: 10 }));
  dogrula(as.vy < 0 && as.H === 60 && as.T > 0 && as.R > 0, "aşağı atış: tepe yok, H = h");
  const o = fizikHesapOzeti(varsayilanCografya("atis", { tip: "egik", v0: 20, aci: 45 }));
  dogrula(!!o && o.includes("40") && o.includes("10"), "özet metni");
});

senaryo("çarpışma: momentum ve enerji korunumu", () => {
  const e = carpismaSonra(varsayilanCografya("carpisma", { tip: "esnek", m1: 2, m2: 2, v1: 6, v2: 0 }));
  dogrula(yakin(e.v1, 0) && yakin(e.v2, 6), "eşit kütle esnek: hızlar yer değiştirir");
  const e2 = carpismaSonra(varsayilanCografya("carpisma", { tip: "esnek", m1: 2, m2: 4, v1: 6, v2: -3 }));
  dogrula(yakin(2 * 6 + 4 * -3, 2 * e2.v1 + 4 * e2.v2), "esnek: momentum korunur");
  dogrula(yakin(0.5 * 2 * 36 + 0.5 * 4 * 9, 0.5 * 2 * e2.v1 ** 2 + 0.5 * 4 * e2.v2 ** 2), "esnek: enerji korunur");
  const y = carpismaSonra(varsayilanCografya("carpisma", { tip: "yapisan", m1: 2, m2: 3, v1: 6, v2: 0 }));
  dogrula(yakin(y.v1, 2.4) && yakin(y.v2, 2.4), "yapışan: 12/5 = 2,4");
  const a = carpismaSonra(varsayilanCografya("carpisma", { tip: "ayrilma", m1: 2, m2: 4, v1: -6 }));
  dogrula(yakin(2 * a.v1 + 4 * a.v2, 0) && yakin(a.v2, 3), "ayrılma: toplam momentum 0, v₂′ = 3");
});

senaryo("tork dengesi", () => {
  const d = varsayilanCografya("tork", { mod: "kuvvet", mesnet: 5, konum: [2, 8, 0, 0], deger: [3, 3, 0, 0] });
  dogrula(yakin(torkDengesi(d), 0), "simetrik kuvvetler dengede");
  const n = varsayilanCografya("tork", { mod: "kuvvet", mesnet: 5, konum: [2, 8, 0, 0], deger: [3, 5, 0, 0] });
  dogrula(torkDengesi(n) > 0, "sağ taraf ağır → pozitif");
  const yukari = varsayilanCografya("tork", { mod: "kuvvet", mesnet: 5, konum: [1, 3, 8, 0], deger: [3, -3, 4, 0] });
  dogrula(yakin(torkDengesi(yukari), 3 * -4 + -3 * -2 + 4 * 3), "yukarı yönlü kuvvet işareti");
  dogrula(!!fizikHesapOzeti(d)?.includes("dengede"), "özet dengede der");
});

senaryo("bozuk veri reddedilir", () => {
  dogrula(!cografyaGecerliMi({ tur: "cografya", yapi: "atis", ayar: { v0: -1 } }), "negatif hız");
  dogrula(!cografyaGecerliMi({ tur: "cografya", yapi: "atis", ayar: { tip: "uzay" } }), "bilinmeyen atış tipi");
  dogrula(!cografyaGecerliMi({ tur: "cografya", yapi: "tork", ayar: { konum: [1, 2] } }), "kısa konum dizisi");
  dogrula(!cografyaGecerliMi({ tur: "cografya", yapi: "scd", ayar: { yok: true } }), "bilinmeyen alan");
  dogrula(!cografyaGecerliMi({ tur: "cografya", yapi: "enerji", ayar: { yuk: [1, 2, 3, 4, 99] } }), "pist yüksekliği sınır dışı");
  dogrula(!cografyaGecerliMi({ tur: "cografya", yapi: "vektorToplam", ayar: { ax: 50 } }), "vektör sınır dışı");
});

senaryo("her şablon geçerli, kütüphanede, çizimi boş değil, kutudan taşmaz", () => {
  dogrula(FIZIK_SABLONLARI.length >= 26, "şablon sayısı " + FIZIK_SABLONLARI.length);
  const ids = new Set(GEOMETRI_KUTUPHANESI.map((s) => s.id));
  const gorulen = new Set<string>();
  for (const sb of FIZIK_SABLONLARI) {
    dogrula(ids.has(sb.id), sb.id + " kütüphanede yok");
    dogrula(sb.nesne === "fizikSekil", sb.id + ": nesne");
    const g = sb.olustur();
    dogrula(g.tur === "cografya", sb.id + ": tür");
    dogrula(cografyaGecerliMi(g as unknown as Record<string, unknown>), sb.id + ": geçersiz");
    const o = olc(g);
    dogrula(o.n > 400, sb.id + ": çizim boş (" + o.n + ")");
    dogrula(o.tasma === 0, sb.id + ": kutudan taşıyor (" + o.tasma + " px)");
    const b = COGRAFYA_BOYUTLARI[g.yapi];
    const s: Sekil = { id: "t", tur: "fizik", nesne: "fizikSekil", kalinlik: 2, x: 0, y: 0, w: b.w, h: b.h, geo: g } as Sekil;
    dogrula(sekilGecerliMi(s), sb.id + ": sekilGecerliMi");
    gorulen.add(g.yapi);
  }
  for (const y of FIZIK_YAPILARI) dogrula(gorulen.has(y), y + ": şablonu yok");
});

senaryo("ayar değişince çizim değişir", () => {
  const f = (y: Parameters<typeof varsayilanCografya>[0], ek: Parameters<typeof varsayilanCografya>[1]) => olc(varsayilanCografya(y, ek)).n;
  dogrula(f("atis", { bilesen: true }) !== f("atis", { bilesen: false }), "atış bileşen");
  dogrula(f("atis", { noktalar: true }) !== f("atis", { noktalar: false }), "atış noktalar");
  dogrula(f("enerji", { tur: "sarkac" }) !== f("enerji", { tur: "pist" }), "enerji türü");
  dogrula(f("enerji", { tur: "pist", surt: "BC" }) !== f("enerji", { tur: "pist", surt: "yok" }), "sürtünmeli bölge");
  dogrula(f("carpisma", { sonra: "yok" }) !== f("carpisma", { sonra: "hesap" }), "çarpışma sonra");
  dogrula(f("carpisma", { tip: "esnek" }) !== f("carpisma", { tip: "ayrilma" }), "çarpışma türü");
  dogrula(f("tork", { mod: "kuvvet" }) !== f("tork", { mod: "agirlik" }), "tork modu");
  dogrula(f("tork", { olcek: true }) !== f("tork", { olcek: false }), "tork ölçek");
  dogrula(f("vektorToplam", { yontem: "ucuca" }) !== f("vektorToplam", { yontem: "paralel" }), "vektör yöntemi");
  dogrula(f("vektorToplam", { bileske: true }) !== f("vektorToplam", { bileske: false }), "bileşke gizleme");
  dogrula(f("scd", { surtunme: true }) !== f("scd", { surtunme: false }), "sürtünme oku");
  dogrula(f("scd", { yuzey: "egik" }) !== f("scd", { yuzey: "yatay" }), "eğik düzlem");
});

senaryo("uç değerlerde çökmez, sonlu çizer", () => {
  for (const y of FIZIK_YAPILARI) {
    const alanlar = FIZIK_SEMA[y].alanlar;
    for (const secim of ["min", "max"] as const) {
      const ek: Record<string, number | boolean | string | number[]> = {};
      for (const al of alanlar) {
        if (al.k === "sayi") ek[al.a] = secim === "min" ? al.min : al.max;
        else if (al.k === "sayilar") ek[al.a] = Array(al.n).fill(secim === "min" ? al.min : al.max);
        else if (al.k === "mantik") ek[al.a] = secim === "max";
        else if (al.k === "sec") ek[al.a] = al.sec[secim === "min" ? 0 : al.sec.length - 1][0];
      }
      const v = varsayilanCografya(y, ek);
      dogrula(cografyaGecerliMi(v as unknown as Record<string, unknown>), y + " " + secim + ": uç değer geçersiz");
      try { olc(v); fizikHesapOzeti(v); } catch (e) { dogrula(false, y + " " + secim + ": çöktü " + e); }
    }
    // Bozuk ayar: çizim yine de çökmemeli
    try { olc(varsayilanCografya(y, { v0: NaN, aci: 1e9, yuk: [] as number[], konum: [] as number[], deger: "x" as unknown as number })); } catch (e) { dogrula(false, y + ": bozuk ayarda çöktü " + e); }
  }
});

senaryo("fizik şekilleri bağlayıcı için 4 port verir (kutu kenarları), geometri portsuz kalır", () => {
  for (const y of FIZIK_YAPILARI) {
    const b = COGRAFYA_BOYUTLARI[y];
    const s = { id: "p", tur: "fizik", nesne: "fizikSekil", kalinlik: 2, x: 10, y: 20, w: b.w, h: b.h, geo: varsayilanCografya(y) } as Sekil;
    dogrula(portluMu(s), y + ": portlu değil");
    const p = baglantiPortlari(s);
    dogrula(p.length === 4, y + ": port sayısı");
    dogrula(p.some((q) => q.yon === "sag" && Math.abs(q.x - (10 + b.w)) < 1e-6 && Math.abs(q.y - (20 + b.h / 2)) < 1e-6), y + ": sağ port yeri");
  }
  const cg = { id: "c", tur: "fizik", nesne: "cografyaSekil", kalinlik: 2, x: 0, y: 0, w: 300, h: 200, geo: varsayilanCografya("harita") } as Sekil;
  dogrula(!portluMu(cg), "coğrafya şekli portsuz kalmalı");
});

senaryo("bağlayıcı uçları çizimin gerçek kenarında: 28 şablonda 4 port da mürekkebe ≤7 px yakın, kutu dışına taşmaz", () => {
  icerikTuvaliAyarla((w, h) => createCanvas(w, h) as unknown as HTMLCanvasElement);
  for (const sb of FIZIK_SABLONLARI) {
    const geo = sb.olustur();
    if (geo.tur !== "cografya") continue;
    const b = COGRAFYA_BOYUTLARI[geo.yapi];
    const s = { id: "t", tur: "fizik", nesne: "fizikSekil", kalinlik: 2, x: 30, y: 40, w: b.w, h: b.h, geo } as Extract<Sekil, { tur: "fizik" }>;
    const t = fizikIcerikTutunma(s);
    dogrula(t, sb.id + ": tutunma ölçülemedi");
    if (!t) continue;
    // Bağımsız referans çizim: ink'i kendimiz tara
    const W = b.w + 2 * PAY + 60, H = b.h + 2 * PAY + 60;
    const c = createCanvas(W, H); const ctx = c.getContext("2d") as unknown as CanvasRenderingContext2D;
    ctx.strokeStyle = "#0f172a"; ctx.fillStyle = "#0f172a"; ctx.lineWidth = 2;
    cografyaCiz(ctx, geo, { x: 30, y: 40, w: b.w, h: b.h });
    const d = ctx.getImageData(0, 0, W, H).data;
    const yakinMurekkep = (p: { x: number; y: number }, r: number) => {
      for (let yy = Math.floor(p.y - r); yy <= p.y + r; yy++) for (let xx = Math.floor(p.x - r); xx <= p.x + r; xx++)
        if (xx >= 0 && yy >= 0 && xx < W && yy < H && d[(yy * W + xx) * 4 + 3] > 40) return true;
      return false;
    };
    for (const yon of ["ust", "sag", "alt", "sol"] as const) {
      dogrula(yakinMurekkep(t[yon], 7), `${sb.id}: ${yon} ucu çizimden >7 px uzak (${t[yon].x.toFixed(0)},${t[yon].y.toFixed(0)})`);
    }
    // Hiçbir uç, kutunun 60 px dışına çıkmaz; ve çizim kutusu kutuya yakın
    dogrula(t.ust.y >= s.y - 60 && t.alt.y <= s.y + s.h + 60 && t.sol.x >= s.x - 60 && t.sag.x <= s.x + s.w + 60, sb.id + ": uç kutudan çok uzakta");
    dogrula(t.ust.y < t.alt.y && t.sol.x < t.sag.x, sb.id + ": uçlar ters");
  }
  // Konum bağımsız: şekil taşınınca uçlar aynı miktarda kayar; ayna çevirince sol/sağ yer değiştirir
  const geo = varsayilanCografya("carpisma");
  const b = COGRAFYA_BOYUTLARI.carpisma;
  const a = { id: "a", tur: "fizik", nesne: "fizikSekil", kalinlik: 2, x: 0, y: 0, w: b.w, h: b.h, geo } as Extract<Sekil, { tur: "fizik" }>;
  const t0 = fizikIcerikTutunma(a)!, t1 = fizikIcerikTutunma({ ...a, x: 100, y: 50 })!;
  dogrula(yakin(t1.sag.x - t0.sag.x, 100, 1e-6) && yakin(t1.ust.y - t0.ust.y, 50, 1e-6), "taşınınca uç kaymadı");
  const m = fizikIcerikTutunma({ ...a, ayna: true })!;
  dogrula(yakin(m.sag.x, b.w - t0.sol.x, 1e-6), "ayna: sağ uç, solun yansıması olmalı");
  // Bağlayıcı yolu kutu kenarında değil, çizim kenarında bitiyor
  const hedef = { ...a, id: "h", x: 0, y: 300 };
  const ba = { id: "k", tur: "baglayici", kalinlik: 2, okUcu: "son", kaynak: { sekilId: "a", yon: "alt" }, hedef: { sekilId: "h", yon: "ust" } } as Extract<Sekil, { tur: "baglayici" }>;
  const yol = baglayiciYolu([a, hedef, ba], ba)!;
  dogrula(yakin(yol[0].y, t0.alt.y, 1e-6), "bağlayıcı kaynak ucu çizim kenarında değil");
  dogrula(yol[0].y !== a.y + a.h || t0.alt.y === a.y + a.h, "bağlayıcı hâlâ kutu kenarında");
});

console.log("TÜM FİZİK ŞEKİLLERİ SENARYOLARI BAŞARILI");
