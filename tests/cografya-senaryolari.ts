// Coğrafya şekilleri: şema, geçerlilik, şablonlar, çizim (boş olmayan, kutu içinde), kütüphane kaydı.
import { createCanvas } from "@napi-rs/canvas";
import {
  COGRAFYA_BOYUTLARI, COGRAFYA_YAPILARI, SEMA, cografyaCiz, cografyaGecerliMi, varsayilanCografya,
} from "../src/modules/sinav-olusturucu/cizim/cografya";
import { COGRAFYA_SABLONLARI, GEOMETRI_KUTUPHANESI } from "../src/modules/sinav-olusturucu/cizim/geometriSekilleri";
import { sekilGecerliMi } from "../src/modules/sinav-olusturucu/cizim/sablon";
import type { Sekil } from "../src/modules/sinav-olusturucu/cizim/tipler";

function dogrula(k: unknown, m: string) { if (!k) { console.error("✗ " + m); process.exit(1); } }
function senaryo(ad: string, f: () => void) { f(); console.log("  ✓ " + ad); }

function mürekkep(v: ReturnType<typeof varsayilanCografya>) {
  const { w, h } = COGRAFYA_BOYUTLARI[v.yapi];
  const W = w + 80, H = h + 80;
  const c = createCanvas(W, H); const ctx = c.getContext("2d") as unknown as CanvasRenderingContext2D;
  ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, W, H);
  cografyaCiz(ctx, v, { x: 40, y: 40, w, h });
  const d = (c.getContext("2d") as unknown as CanvasRenderingContext2D).getImageData(0, 0, W, H).data;
  let n = 0;
  for (let i = 0; i < d.length; i += 4) if (d[i] < 200) n++;
  return n;
}

console.log("Coğrafya senaryoları");

senaryo("her yapı için şema ve varsayılan veri geçerli", () => {
  dogrula(COGRAFYA_YAPILARI.length === 9, "9 yapı bekleniyordu: " + COGRAFYA_YAPILARI.length);
  for (const y of COGRAFYA_YAPILARI) {
    dogrula(SEMA[y].alanlar.length > 0, y + ": alan yok");
    dogrula(cografyaGecerliMi(varsayilanCografya(y) as unknown as Record<string, unknown>), y + ": varsayılan geçersiz");
    dogrula(COGRAFYA_BOYUTLARI[y].w > 100, y + ": boyut yok");
  }
});

senaryo("bozuk veri reddedilir", () => {
  dogrula(!cografyaGecerliMi({ tur: "cografya", yapi: "yok", ayar: {} }), "bilinmeyen yapı");
  dogrula(!cografyaGecerliMi({ tur: "cografya", yapi: "walter", ayar: { sicaklik: [1, 2] } }), "kısa dizi");
  dogrula(!cografyaGecerliMi({ tur: "cografya", yapi: "izohips", ayar: { aralik: -5 } }), "negatif aralık");
  dogrula(!cografyaGecerliMi({ tur: "cografya", yapi: "harita", ayar: "x" }), "ayar nesne değil");
});

senaryo("her şablon geçerli, kütüphanede, çizimi boş değil", () => {
  dogrula(COGRAFYA_SABLONLARI.length >= 27, "şablon sayısı " + COGRAFYA_SABLONLARI.length);
  const ids = new Set(GEOMETRI_KUTUPHANESI.map((s) => s.id));
  for (const sb of COGRAFYA_SABLONLARI) {
    dogrula(ids.has(sb.id), sb.id + " kütüphanede yok");
    const g = sb.olustur();
    dogrula(g.tur === "cografya", sb.id + ": tür");
    dogrula(cografyaGecerliMi(g as unknown as Record<string, unknown>), sb.id + ": geçersiz");
    dogrula(mürekkep(g) > 300, sb.id + ": çizim boş");
    const b = COGRAFYA_BOYUTLARI[g.yapi];
    const s: Sekil = { id: "t", tur: "fizik", nesne: "cografyaSekil", kalinlik: 2, x: 0, y: 0, w: b.w, h: b.h, geo: g } as Sekil;
    dogrula(sekilGecerliMi(s), sb.id + ": sekilGecerliMi");
  }
});

senaryo("ayar değişince çizim değişir (turkiye plaka / izohips aralık / piramit)", () => {
  const a = mürekkep(varsayilanCografya("harita", { plaka: false }));
  const b = mürekkep(varsayilanCografya("harita", { plaka: true }));
  dogrula(a !== b, "plaka açılınca değişmedi");
  const c = mürekkep(varsayilanCografya("izohips", { aralik: 50 }));
  const d = mürekkep(varsayilanCografya("izohips", { aralik: 200 }));
  dogrula(c !== d, "izohips aralığı etkisiz");
});

senaryo("aşırı/bozuk ayarda çökmez", () => {
  for (const y of COGRAFYA_YAPILARI) {
    const v = varsayilanCografya(y, { aralik: 0, katman: 99, genlik: -3, sicaklik: [] as number[] });
    try { mürekkep(v); } catch (e) { dogrula(false, y + ": çizim çöktü " + e); }
  }
});

console.log("TÜM COĞRAFYA SENARYOLARI BAŞARILI");
