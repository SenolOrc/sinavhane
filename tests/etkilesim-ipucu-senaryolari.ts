// Bağlamsal imleç ve ipucu: etkilesimBelirle / imlecSinifi / etkilesimIpucu (saf).
import type { Sekil } from "../src/modules/sinav-olusturucu/cizim/tipler";
import { etkilesimBelirle, etkilesimIpucu, imlecSinifi, sekilTurAdi } from "../src/modules/sinav-olusturucu/cizim/vurus";

function dogrula(kosul: unknown, mesaj: string) {
  if (!kosul) throw new Error(`TEST BAŞARISIZ: ${mesaj}`);
}
const ctx = { font: "", measureText(m: string) { return { width: [...m].length * 10 }; } } as unknown as CanvasRenderingContext2D;
const dik: Sekil = { id: "d1", tur: "dikdortgen", kalinlik: 2, cizgiTipi: "duz", x: 100, y: 100, w: 200, h: 100 } as Sekil;
const cizgi: Sekil = { id: "c1", tur: "dogru", kalinlik: 2, x1: 400, y1: 100, x2: 500, y2: 100 } as Sekil;
const liste = [dik, cizgi];

// Seçili dikdörtgenin köşeleri: yöne uygun resize imleci
const kose = (x: number, y: number) => etkilesimBelirle(ctx, liste, ["d1"], { x, y }, 100);
dogrula(kose(100, 100).tur === "boyutlandir-nwse", "sol-üst köşe nwse olmalı");
dogrula(kose(300, 200).tur === "boyutlandir-nwse", "sağ-alt köşe nwse olmalı");
dogrula(kose(300, 100).tur === "boyutlandir-nesw", "sağ-üst köşe nesw olmalı");
dogrula(kose(100, 200).tur === "boyutlandir-nesw", "sol-alt köşe nesw olmalı");
dogrula(imlecSinifi("boyutlandir-nesw") === "nesw-resize", "nesw imleci");
dogrula(kose(200, 76).tur === "dondur", "döndürme tutamacı");
dogrula(imlecSinifi("dondur") === "grab", "dondur imleci grab");

// Şeklin kenarı: taşı. Boş yer: sec. Seçili olmayan şekil üstünde de taşı.
dogrula(etkilesimBelirle(ctx, liste, [], { x: 200, y: 100 }, 100).tur === "tasi", "kenar tasi");
dogrula(etkilesimBelirle(ctx, liste, [], { x: 200, y: 100 }, 100).hedefId === "d1", "hedef id");
dogrula(etkilesimBelirle(ctx, liste, [], { x: 450, y: 100 }, 100).tur === "tasi", "çizgi tasi");
dogrula(etkilesimBelirle(ctx, liste, [], { x: 50, y: 400 }, 100).tur === "sec", "boş yer sec");
dogrula(etkilesimBelirle(ctx, liste, [], { x: 50, y: 400 }, 100).hedefId === null, "boş yerde hedef yok");

// Bileşenin bildirdiği port / nokta durumu öncelikli
dogrula(etkilesimBelirle(ctx, liste, ["d1"], { x: 100, y: 100 }, 100, { portta: true }).tur === "bagla", "port bagla");
dogrula(etkilesimBelirle(ctx, liste, ["d1"], { x: 200, y: 100 }, 100, { noktaTutamacinda: true }).tur === "nokta", "nokta tutamacı");

// İpucu metinleri ve tür adı
dogrula(etkilesimIpucu("sec") === "", "boşta ipucu yok");
dogrula(etkilesimIpucu("tasi").includes("Taşımak"), "tasi ipucu");
dogrula(etkilesimIpucu("boyutlandir-nwse").includes("Boyutlandırmak"), "resize ipucu");
dogrula(sekilTurAdi(dik) === "Dikdörtgen" && sekilTurAdi(cizgi) === "Çizgi", "tür adları");

console.log("Etkileşim ipucu senaryoları ✓");
