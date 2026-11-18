// Panel ızgarası (çoklu panel): hücre geometrisi, başlık üretimi (I, II… / ①…⑫ / özel), zemin davranışı
// (üstteki şekil önce vurulur, bağlayıcı bağlanmaz, altta çizilir), "Panellere çoğalt" yerleşim matematiği,
// şablonlar ve ⊗/⊙ alanının küçük panel hücresine sığması.
import { createCanvas } from "@napi-rs/canvas";
import {
  COGRAFYA_BOYUTLARI, cografyaCiz, cografyaGecerliMi, cografyaKutuBoyutu, daireliSayi, panelBasligi, panelBasliklari,
  panelBoyutu, panelHucreleri, panelKenarUzakligi, panelOzellikleri, romenRakami, varsayilanCografya,
} from "../src/modules/sinav-olusturucu/cizim/cografya";
import { FIZIK_SABLONLARI, GEOMETRI_KUTUPHANESI } from "../src/modules/sinav-olusturucu/cizim/geometriSekilleri";
import { HAZIR_SAHNELER } from "../src/modules/sinav-olusturucu/cizim/sahneler";
import { panelGrafikSahnesi } from "../src/modules/sinav-olusturucu/cizim/panelSahneleri";
import { panellereCogalt, secimPaneli, panelSekliHucreleri } from "../src/modules/sinav-olusturucu/cizim/panelCogalt";
import { panelZeminiMi, zeminMi } from "../src/modules/sinav-olusturucu/cizim/geometri";
import { baglantiPortlari, portluMu } from "../src/modules/sinav-olusturucu/cizim/etkilesim";
import { enUstVurulan, etkilesimBelirle, sekilVuruldu } from "../src/modules/sinav-olusturucu/cizim/vurus";
import { sekilleriCiz } from "../src/modules/sinav-olusturucu/cizim/ciz";
import { sekilGecerliMi } from "../src/modules/sinav-olusturucu/cizim/sablon";
import { fizikEkCiz } from "../src/modules/sinav-olusturucu/cizim/fizikEk";
import type { Sekil } from "../src/modules/sinav-olusturucu/cizim/tipler";

function dogrula(k: unknown, m: string) { if (!k) { console.error("✗ " + m); process.exit(1); } }
function senaryo(ad: string, f: () => void) { f(); console.log("  ✓ " + ad); }
const yakin = (a: number, b: number, e = 1e-6) => Math.abs(a - b) <= e;
type FizikSekli = Extract<Sekil, { tur: "fizik" }>;

const tuval = createCanvas(900, 700);
const ctx = tuval.getContext("2d") as unknown as CanvasRenderingContext2D;

const panelSekli = (id: string, ek: Record<string, number | boolean | string>, x: number, y: number, w: number, h: number): FizikSekli => ({
  id, tur: "fizik", nesne: "fizikSekil", kalinlik: 2, x, y, w, h, geo: varsayilanCografya("panelIzgara", ek),
});
const tel = (id: string, x1: number, y1: number, x2: number, y2: number): Sekil => ({ id, tur: "dogru", kalinlik: 2, x1, y1, x2, y2 });

console.log("Panel ızgarası senaryoları");

senaryo("şema: varsayılan geçerli, satır 1–3 × sütun 1–4, sınır dışı değerler reddedilir", () => {
  const g = varsayilanCografya("panelIzgara");
  dogrula(cografyaGecerliMi(g as unknown as Record<string, unknown>), "varsayılan geçersiz");
  for (const [a, d] of [["satir", 4], ["satir", 0], ["sutun", 5], ["aralik", 41], ["punto", 7], ["baslik", "xyz"], ["yer", "orta"]] as const) {
    dogrula(!cografyaGecerliMi(varsayilanCografya("panelIzgara", { [a]: d }) as unknown as Record<string, unknown>), `${a}=${d} reddedilmedi`);
  }
  for (const [s, c] of [[1, 1], [3, 4], [2, 3]]) dogrula(cografyaGecerliMi(varsayilanCografya("panelIzgara", { satir: s, sutun: c }) as unknown as Record<string, unknown>), `${s}×${c} geçerli olmalı`);
  dogrula(COGRAFYA_BOYUTLARI.panelIzgara.w > 200, "yapı boyutu");
});

senaryo("hücre geometrisi: satır × sütun, aralık, başlık bandı (alt/üst), çerçevesiz", () => {
  const k = { x: 10, y: 20, w: 540, h: 200 };
  // Başlıksız 1×3, aralık 12: hücre genişliği (540 − 24) / 3 = 172
  const a = panelHucreleri(panelOzellikleri(varsayilanCografya("panelIzgara", { satir: 1, sutun: 3, aralik: 12, baslik: "yok" })), k);
  dogrula(a.length === 3, "hücre sayısı");
  dogrula(yakin(a[0].cerceve.x, 10) && yakin(a[1].cerceve.x, 10 + 172 + 12) && yakin(a[2].cerceve.x, 10 + 2 * 184), "x konumları");
  dogrula(a.every((h) => yakin(h.cerceve.w, 172) && yakin(h.cerceve.h, 200) && yakin(h.cerceve.y, 20) && h.bant === null), "boyut/bant");
  // Son hücrenin sağ kenarı kutunun sağ kenarı
  dogrula(yakin(a[2].cerceve.x + a[2].cerceve.w, 550), "sağ kenar kutuya oturmalı");
  // 2×3, aralık 10: yükseklik (200 − 10) / 2 = 95; sıra soldan sağa sonra aşağı
  const b = panelHucreleri(panelOzellikleri(varsayilanCografya("panelIzgara", { satir: 2, sutun: 3, aralik: 10, baslik: "yok" })), k);
  dogrula(b.length === 6 && yakin(b[3].cerceve.y, 20 + 95 + 10) && b[3].satir === 1 && b[3].sutun === 0 && b[5].indeks === 5, "2×3 sırası");
  dogrula(yakin(b[5].cerceve.y + b[5].cerceve.h, 220), "alt kenar kutuya oturmalı");
  // Aralık 0: hücreler bitişik
  const c = panelHucreleri(panelOzellikleri(varsayilanCografya("panelIzgara", { satir: 1, sutun: 4, aralik: 0, baslik: "yok" })), k);
  dogrula(yakin(c[1].cerceve.x, 10 + 135), "aralık 0");
  // Başlık altta: bant hücrenin altında, çerçeve bant kadar kısalır
  const o = panelOzellikleri(varsayilanCografya("panelIzgara", { satir: 1, sutun: 1, baslik: "roman", yer: "alt", punto: 14 }));
  const alt = panelHucreleri(o, k)[0];
  dogrula(alt.bant && alt.bant.h === 23 && yakin(alt.cerceve.h, 177) && yakin(alt.bant.y, 20 + 177) && yakin(alt.cerceve.y, 20), "alt bant: " + JSON.stringify(alt));
  const ust = panelHucreleri({ ...o, yer: "ust" }, k)[0];
  dogrula(ust.bant && yakin(ust.bant.y, 20) && yakin(ust.cerceve.y, 43) && yakin(ust.cerceve.h, 177), "üst bant");
  // Daireli numara çerçevenin İÇİNDE: bant yok
  const d = panelHucreleri({ ...o, baslik: "daire" }, k)[0];
  dogrula(d.bant === null && yakin(d.cerceve.h, 200), "daireli başlıkta bant yok");
  // Özel başlık hepsi boşsa bant yok
  dogrula(panelHucreleri({ ...o, baslik: "ozel", ozel: " , " }, k)[0].bant === null, "boş özel başlık");
  // Yuva = çerçeve + bant (hücrenin tamamı)
  dogrula(yakin(alt.yuva.h, 200) && yakin(alt.yuva.y, 20), "yuva");
});

senaryo("önerilen boyut: satır/sütuna göre; kütüphane/panel aynı hesabı kullanır", () => {
  const a = panelBoyutu(varsayilanCografya("panelIzgara", { satir: 1, sutun: 3, aralik: 12, baslik: "yok" }));
  const b = panelBoyutu(varsayilanCografya("panelIzgara", { satir: 2, sutun: 3, aralik: 12, baslik: "yok" }));
  dogrula(a.w === b.w && b.h > a.h * 1.8, "2 satır yaklaşık iki kat yüksek: " + JSON.stringify([a, b]));
  dogrula(cografyaKutuBoyutu(varsayilanCografya("panelIzgara", { satir: 2, sutun: 3 })).h === panelBoyutu(varsayilanCografya("panelIzgara", { satir: 2, sutun: 3 })).h, "cografyaKutuBoyutu panel");
  dogrula(cografyaKutuBoyutu(varsayilanCografya("atis")).w === COGRAFYA_BOYUTLARI.atis.w, "diğer yapılar tablodan");
  const buyuk = panelBoyutu(varsayilanCografya("panelIzgara", { satir: 3, sutun: 4, aralik: 40 }));
  dogrula(buyuk.w > 300 && buyuk.w < 900 && buyuk.h > 200, "3×4 makul boyut " + JSON.stringify(buyuk));
});

senaryo("başlık üretimi: Roman, daireli ①–⑫, 1. Durum, I. durum, özel", () => {
  dogrula([1, 2, 3, 4, 5, 6, 9, 10, 12, 14, 19, 40, 49, 90, 400, 1994].map(romenRakami).join(" ") === "I II III IV V VI IX X XII XIV XIX XL XLIX XC CD MCMXCIV", "romen: " + [1, 4, 9, 14, 40].map(romenRakami).join());
  dogrula(Array.from({ length: 12 }, (_, i) => daireliSayi(i + 1)).join("") === "①②③④⑤⑥⑦⑧⑨⑩⑪⑫", "daireli 1–12");
  dogrula(daireliSayi(20) === "⑳" && daireliSayi(21) === "21", "daireli sınır");
  dogrula(panelBasligi("roman", 3) === "III" && panelBasligi("romanDurum", 2) === "II. durum" && panelBasligi("durum", 2) === "2. Durum", "durum biçimleri");
  dogrula(panelBasligi("sayi", 5) === "5" && panelBasligi("daire", 6) === "⑥" && panelBasligi("yok", 1) === "", "sayı/daire/yok");
  dogrula(panelBasligi("ozel", 1, "x–t, v–t, a–t") === "x–t" && panelBasligi("ozel", 3, "x–t, v–t, a–t") === "a–t" && panelBasligi("ozel", 4, "x–t, v–t, a–t") === "", "özel (virgülle; fazlası boş)");
  const v = varsayilanCografya("panelIzgara", { satir: 2, sutun: 3, baslik: "daire" });
  dogrula(panelBasliklari(v).join("") === "①②③④⑤⑥", "panelBasliklari 2×3 daire");
  dogrula(panelBasliklari(varsayilanCografya("panelIzgara", { satir: 1, sutun: 2, baslik: "yok" })).every((t) => t === ""), "başlıksız");
  dogrula(panelBasliklari(varsayilanCografya("panelIzgara", { satir: 3, sutun: 4, baslik: "roman" })).length === 12, "3×4 = 12 başlık");
});

senaryo("zemin: panel ızgarası zemindir; kareli alan da; diğerleri değil", () => {
  const p = panelSekli("p", {}, 10, 10, 540, 200);
  dogrula(panelZeminiMi(p) && zeminMi(p), "panel zemin");
  dogrula(zeminMi({ id: "k", tur: "fizik", nesne: "kareliAlan", kalinlik: 1, x: 0, y: 0, w: 100, h: 80 }), "kareli alan zemin");
  const atis: Sekil = { id: "a", tur: "fizik", nesne: "fizikSekil", kalinlik: 2, x: 0, y: 0, w: 100, h: 80, geo: varsayilanCografya("atis") };
  dogrula(!panelZeminiMi(atis) && !zeminMi(atis) && !zeminMi(tel("t", 0, 0, 5, 5)), "diğer şekiller zemin değil");
  dogrula(!portluMu(p) && baglantiPortlari(p).length === 0, "panel bağlayıcı portu vermez");
  dogrula(portluMu(atis), "diğer fizik şekilleri portlu kalır");
});

senaryo("vuruş: panelin içi boş (içindeki şekle tıklama çalınmaz); çerçeve çizgisi ve başlık bandı seçer", () => {
  const p = panelSekli("p", { satir: 1, sutun: 3, baslik: "roman", yer: "alt", aralik: 12 }, 100, 100, 540, 200);
  dogrula(!sekilVuruldu(ctx, p, { x: 190, y: 180 }, 100, [p]), "hücre içi vurmamalı");
  dogrula(sekilVuruldu(ctx, p, { x: 100, y: 180 }, 100, [p]), "sol dış çerçeve çizgisi vurmalı");
  dogrula(sekilVuruldu(ctx, p, { x: 272, y: 180 }, 100, [p]) || sekilVuruldu(ctx, p, { x: 272 + 6, y: 180 }, 100, [p]), "1. hücrenin sağ çerçevesi");
  dogrula(sekilVuruldu(ctx, p, { x: 186, y: 300 - 10 }, 100, [p]), "başlık bandı (alt) vurmalı");
  dogrula(!sekilVuruldu(ctx, p, { x: 900, y: 900 }, 100, [p]), "uzakta vurmamalı");
  // Saf uzaklık: ortası kenardan uzak
  const v = p.geo as ReturnType<typeof varsayilanCografya>;
  dogrula(panelKenarUzakligi(v, { x: 100, y: 100, w: 540, h: 200 }, { x: 186, y: 150 }) > 20, "iç nokta uzak");
});

senaryo("zemin önceliği: panel dizide SONRA gelse de üstündeki tel önce vurulur; boşlukta panel çerçevesi", () => {
  const wire = tel("w", 100, 180, 300, 180); // panelin sol çerçevesinden başlayıp içine giren tel
  const panel = panelSekli("p", { satir: 1, sutun: 3, baslik: "yok", aralik: 12 }, 100, 100, 540, 200);
  const sekiller: Sekil[] = [wire, panel]; // panel EN ÜSTTE (sonradan eklenmiş)
  // Tel ile panelin sol çerçevesi aynı noktada: tel önce
  dogrula(enUstVurulan(ctx, sekiller, { x: 100, y: 180 }, 100)?.id === "w", "tel panelden önce vurulmalı");
  // Yalnız çerçeve noktası: panel
  dogrula(enUstVurulan(ctx, sekiller, { x: 100, y: 120 }, 100)?.id === "p", "çerçeve çizgisi paneli seçmeli");
  // İç boşluk: hiçbiri (kutu seçimi başlar)
  dogrula(enUstVurulan(ctx, sekiller, { x: 190, y: 130 }, 100) === undefined, "iç boşlukta şekil yok");
  // etkilesimBelirle de aynı sırayı kullanır
  dogrula(etkilesimBelirle(ctx, sekiller, [], { x: 100, y: 180 }, 100).hedefId === "w", "etkileşim: tel");
  dogrula(etkilesimBelirle(ctx, sekiller, [], { x: 190, y: 130 }, 100).tur === "sec", "etkileşim: iç boşluk seç/kutu");
});

senaryo("çizim sırası: panel dizide sonra olsa da altta çizilir (telden ÖNCE)", () => {
  const olaylar: string[] = [];
  const oz: Record<string, unknown> = { font: "", lineWidth: 1 };
  const sahte = new Proxy(oz, {
    get(h, ad: string) {
      if (ad === "measureText") return (m: string) => ({ width: [...m].length * 8 });
      if (ad in h) return h[ad];
      return () => { olaylar.push(ad); };
    },
    set(h, ad: string, d) { h[ad] = d; return true; },
  }) as unknown as CanvasRenderingContext2D;
  const panel = panelSekli("p", { satir: 1, sutun: 2, baslik: "yok" }, 10, 10, 300, 120);
  sekilleriCiz(sahte, [tel("w", 20, 20, 120, 60), panel]);
  const ilkCerceve = olaylar.indexOf("stroke"), ilkTel = olaylar.indexOf("lineTo");
  dogrula(ilkCerceve >= 0 && ilkTel >= 0 && ilkCerceve < ilkTel, `sıra: panel stroke ${ilkCerceve}, lineTo ${ilkTel}`);
});

senaryo("çizim: çerçeve/gri zemin/başlık mürekkebi; ayar değişince değişir; kutudan taşmaz", () => {
  const ink = (ek: Record<string, number | boolean | string>) => {
    const W = 640, H = 340, c = createCanvas(W, H), g = c.getContext("2d") as unknown as CanvasRenderingContext2D;
    g.fillStyle = "#fff"; g.fillRect(0, 0, W, H); g.strokeStyle = "#0f172a"; g.fillStyle = "#0f172a"; g.lineWidth = 2;
    cografyaCiz(g, varsayilanCografya("panelIzgara", ek), { x: 40, y: 40, w: 540, h: 260 });
    const d = g.getImageData(0, 0, W, H).data;
    let n = 0, gri = 0, tasma = 0;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const i = (y * W + x) * 4;
      if (d[i] < 200) { n++; if (x < 38 || x > 582 || y < 38 || y > 302) tasma++; }
      if (d[i] > 225 && d[i] < 250) gri++;
    }
    return { n, gri, tasma };
  };
  const tam = ink({ satir: 2, sutun: 3, baslik: "daire", yer: "ust" });
  dogrula(tam.n > 1500 && tam.tasma === 0, "2×3 daireli: boş ya da taşıyor " + JSON.stringify(tam));
  dogrula(ink({ cerceve: false, baslik: "yok" }).n === 0, "çerçevesiz + başlıksız hiçbir şey çizilmez");
  dogrula(ink({ cerceve: false, baslik: "roman" }).n > 50, "çerçevesiz ama başlıklı");
  dogrula(ink({ dolgu: true }).gri > ink({ dolgu: false }).gri + 5000, "açık gri zemin");
  dogrula(ink({ satir: 2 }).n > ink({ satir: 1 }).n, "satır sayısı çizimi değiştirir");
  dogrula(ink({ baslik: "daire" }).n !== ink({ baslik: "roman" }).n, "başlık biçimi çizimi değiştirir");
  const t3 = ink({ satir: 3, sutun: 4, baslik: "ozel", basliklar: "a, b, c, d, e, f, g, h, i, j, k, l", punto: 24, yer: "alt" });
  dogrula(t3.n > 500 && t3.tasma === 0, "3×4 en büyük punto " + JSON.stringify(t3));
});

senaryo("şablonlar: 5 hazır şablon + eksenli sahne; geçerli, kütüphanede, boş değil", () => {
  const idler = ["f-panel-roman", "f-panel-roman-durum", "f-panel-daire-6", "f-panel-durum-2", "f-panel-grafik"];
  const kutuphane = new Set(GEOMETRI_KUTUPHANESI.map((s) => s.id));
  for (const id of idler) {
    const sb = FIZIK_SABLONLARI.find((s) => s.id === id);
    dogrula(sb && kutuphane.has(id), id + " yok");
    const g = sb!.olustur();
    dogrula(g.tur === "cografya" && g.yapi === "panelIzgara" && cografyaGecerliMi(g as unknown as Record<string, unknown>), id + " geçersiz");
    const b = cografyaKutuBoyutu(g);
    dogrula(sekilGecerliMi({ id: "t", tur: "fizik", nesne: "fizikSekil", kalinlik: 2, x: 0, y: 0, w: b.w, h: b.h, geo: g }), id + ": sekilGecerliMi");
  }
  const g = (id: string) => FIZIK_SABLONLARI.find((s) => s.id === id)!.olustur() as ReturnType<typeof varsayilanCografya>;
  dogrula(panelBasliklari(g("f-panel-roman")).join() === "I,II,III", "I–II–III");
  dogrula(panelBasliklari(g("f-panel-daire-6")).join("") === "①②③④⑤⑥" && panelOzellikleri(g("f-panel-daire-6")).satir === 2, "2×3 ①…⑥");
  dogrula(panelBasliklari(g("f-panel-durum-2")).join() === "1. Durum,2. Durum", "1. Durum / 2. Durum");
  dogrula(panelBasliklari(g("f-panel-roman-durum")).join() === "I. durum,II. durum,III. durum", "I. durum…");
  dogrula(panelBasliklari(g("f-panel-grafik")).join() === "x–t,v–t,a–t,x–t,v–t,a–t", "grafik panel başlıkları");
  // Önerilen kutuda hücreler en az 100 px genişliğinde
  for (const id of idler) { const o = g(id), b = cografyaKutuBoyutu(o); dogrula(panelHucreleri(panelOzellikleri(o), { x: 0, y: 0, ...b }).every((h) => h.cerceve.w >= 100 && h.cerceve.h >= 60), id + ": hücre küçük"); }
  // Sahne: kayıtlı, 1 panel + 6 grafik, kimlikler benzersiz, her grafik kendi hücresinde
  dogrula(HAZIR_SAHNELER.some((s) => s.id === "panel-grafik-2x3"), "sahne kayıtlı değil");
  const sahne = panelGrafikSahnesi();
  dogrula(sahne.length === 7 && new Set(sahne.map((s) => s.id)).size === 7 && sahne.every(sekilGecerliMi), "sahne şekilleri");
  const panel = sahne[0] as FizikSekli, hucreler = panelSekliHucreleri(panel)!;
  dogrula(panelZeminiMi(panel) && hucreler.length === 6, "sahne paneli");
  sahne.slice(1).forEach((s, i) => {
    const f = hucreler[i].cerceve, gs = s as FizikSekli;
    dogrula(gs.nesne === "grafik" && gs.x >= f.x && gs.y >= f.y && gs.x + gs.w <= f.x + f.w && gs.y + gs.h <= f.y + f.h, `grafik ${i + 1} hücreye sığmıyor`);
  });
  // Sahne çizimi boş değil ve çökmez (boş eksenli grafikler dâhil)
  const c = createCanvas(700, 420), cg = c.getContext("2d") as unknown as CanvasRenderingContext2D;
  cg.fillStyle = "#fff"; cg.fillRect(0, 0, 700, 420);
  sekilleriCiz(cg, sahne);
  const d = cg.getImageData(0, 0, 700, 420).data; let n = 0;
  for (let i = 0; i < d.length; i += 4) if (d[i] < 200) n++;
  dogrula(n > 2500, "sahne çizimi boş (" + n + ")");
});

senaryo("Panellere çoğalt: göreli konum korunur, kimlikler benzersiz, girdi değişmez", () => {
  const panel = panelSekli("panel", { satir: 2, sutun: 3, baslik: "daire", yer: "ust", aralik: 14 }, 40, 30, 540, 300);
  const hucreler = panelSekliHucreleri(panel)!;
  const h0 = hucreler[0].yuva;
  const tl = tel("tel", h0.x + 30, h0.y + 60, h0.x + 120, h0.y + 60);
  const alan: Sekil = { id: "alan", tur: "fizik", nesne: "alanNokta", kalinlik: 2, x: h0.x + 20, y: h0.y + 30, w: 90, h: 70, ek: { sayi: 3, sayi2: 2, ters: true } };
  const once: Sekil[] = [panel, tl, alan];
  const kopyaOnce = JSON.stringify(once);
  const sec = secimPaneli(ctx, once, ["tel", "alan"]);
  dogrula(sec && sec.hucre.indeks === 0 && sec.hucreler.length === 6, "seçim hücre 0'da");
  const r = panellereCogalt(ctx, once, ["tel", "alan"]);
  dogrula(r && r.eklenen.length === 10 && r.sekiller.length === 13 && r.hedefHucreler.join() === "1,2,3,4,5", "5 hücre × 2 şekil");
  dogrula(JSON.stringify(once) === kopyaOnce && r!.sekiller.slice(0, 3).every((s, i) => s === once[i]), "girdi/eski şekiller DEĞİŞMEMELİ (geri al geçmişi referans tutar)");
  // Göreli konum: her kopya, kendi hücresinde aynı ofsette
  for (const hi of r!.hedefHucreler) {
    const y = hucreler[hi].yuva, dx = y.x - h0.x, dy = y.y - h0.y;
    const tk = r!.eklenen.find((s) => s.tur === "dogru" && Math.abs((s as { x1: number }).x1 - (tl as { x1: number }).x1 - dx) < 1e-9 && Math.abs((s as { y1: number }).y1 - (tl as { y1: number }).y1 - dy) < 1e-9);
    dogrula(tk && Math.abs((tk as { x2: number }).x2 - (tl as { x2: number }).x2 - dx) < 1e-9, `hücre ${hi}: tel ofseti`);
    const ak = r!.eklenen.find((s) => s.tur === "fizik" && s.nesne === "alanNokta" && Math.abs(s.x - alan.x - dx) < 1e-9 && Math.abs(s.y - alan.y - dy) < 1e-9) as FizikSekli | undefined;
    dogrula(ak && ak.w === 90 && ak.h === 70 && ak.ek?.ters === true && ak.ek.sayi === 3, `hücre ${hi}: alan ofseti/özellikleri`);
    // Kopya o hücrenin içinde
    dogrula(ak!.x >= y.x && ak!.x + ak!.w <= y.x + y.w && ak!.y >= y.y && ak!.y + ak!.h <= y.y + y.h, `hücre ${hi}: kopya hücre dışında`);
  }
  const idler = r!.sekiller.map((s) => s.id);
  dogrula(new Set(idler).size === idler.length, "kimlikler benzersiz olmalı");
  dogrula(r!.eklenen.every((s) => s.id !== "tel" && s.id !== "alan"), "kopya eski kimliği taşımamalı");
  // Kopyalar sona eklenir: panelin kendisi çoğaltılmaz
  dogrula(r!.sekiller.filter(panelZeminiMi).length === 1, "panel çoğalmamalı");
});

senaryo("Panellere çoğalt: başka hücreden, bağlayıcı/grup/döndürme korunur; 1×2 panelde de çalışır", () => {
  const panel = panelSekli("panel", { satir: 1, sutun: 2, baslik: "roman", yer: "alt" }, 20, 20, 400, 200);
  const hc = panelSekliHucreleri(panel)!;
  const y1 = hc[1].yuva;
  const a: Sekil = { id: "a", tur: "fizik", nesne: "kutle", kalinlik: 2, x: y1.x + 20, y: y1.y + 20, w: 40, h: 30, grupId: "g1", donus: 30 };
  const b: Sekil = { id: "b", tur: "fizik", nesne: "kutle", kalinlik: 2, x: y1.x + 100, y: y1.y + 20, w: 40, h: 30, grupId: "g1" };
  const ip: Sekil = { id: "ip", tur: "baglayici", kalinlik: 2, kaynak: { sekilId: "a", yon: "sag" }, hedef: { sekilId: "b", yon: "sol" }, okUcu: "yok", stil: "duz" };
  const r = panellereCogalt(ctx, [panel, a, b, ip], ["a", "b"]); // bağlayıcı seçime kendiliğinden eklenir
  dogrula(r && r.hedefHucreler.join() === "0" && r.eklenen.length === 3, "tek hedef hücre, 3 şekil: " + (r ? r.eklenen.length : "null"));
  const [ka, kb, kip] = r!.eklenen as [FizikSekli, FizikSekli, Extract<Sekil, { tur: "baglayici" }>];
  const dx = hc[0].yuva.x - y1.x;
  dogrula(yakin(ka.x, a.x + dx) && yakin(ka.y, a.y) && ka.donus === 30, "dönüş korunmalı, konum kaymalı");
  dogrula(ka.grupId && ka.grupId === kb.grupId && ka.grupId !== "g1", "grup kimliği yenilenmeli, kopyalar kendi aralarında grup kalmalı");
  dogrula("sekilId" in kip.kaynak && kip.kaynak.sekilId === ka.id && "sekilId" in kip.hedef && kip.hedef.sekilId === kb.id, "bağlayıcı KOPYALARA bağlanmalı");
});

senaryo("Panellere çoğalt: uygun değilse null (panel dışı, panel seçili, döndürülmüş panel, tek hücre, boş seçim)", () => {
  const panel = panelSekli("panel", { satir: 1, sutun: 3 }, 50, 50, 540, 200);
  const hc = panelSekliHucreleri(panel)!;
  const iceri = tel("i", hc[0].yuva.x + 10, hc[0].yuva.y + 10, hc[0].yuva.x + 50, hc[0].yuva.y + 10);
  const disari = tel("d", 700, 500, 760, 500);
  dogrula(secimPaneli(ctx, [panel, disari], ["d"]) === null && panellereCogalt(ctx, [panel, disari], ["d"]) === null, "panel dışındaki seçim");
  dogrula(secimPaneli(ctx, [panel, iceri], []) === null, "boş seçim");
  dogrula(secimPaneli(ctx, [panel, iceri], ["panel", "i"]) === null, "panel seçimdeyse");
  dogrula(secimPaneli(ctx, [iceri], ["i"]) === null, "panel yoksa");
  dogrula(panelSekliHucreleri({ ...panel, donus: 15 }) === null && secimPaneli(ctx, [{ ...panel, donus: 15 }, iceri], ["i"]) === null, "döndürülmüş panel");
  const tek = panelSekli("tek", { satir: 1, sutun: 1 }, 50, 50, 300, 200);
  dogrula(secimPaneli(ctx, [tek, tel("x", 60, 60, 90, 60)], ["x"]) === null, "tek hücreli panelde çoğaltılacak yer yok");
  dogrula(secimPaneli(ctx, [panel, iceri], ["i"])?.hucre.indeks === 0, "uygun seçim hücre 0");
  // Merkezi hücrenin içinde olan seçim, hücreyi hafifçe aşsa da o hücreden sayılır
  const tasan = tel("t", hc[1].yuva.x - 10, hc[1].yuva.y + 30, hc[1].yuva.x + 80, hc[1].yuva.y + 30);
  dogrula(secimPaneli(ctx, [panel, tasan], ["t"])?.hucre.indeks === 1, "merkez kuralı");
  // Üst üste iki panel: en üsttekinin hücresi seçilir
  const ust = panelSekli("ust", { satir: 2, sutun: 2 }, 50, 50, 540, 200);
  dogrula(secimPaneli(ctx, [panel, ust, iceri], ["i"])?.panel.id === "ust", "üstteki panel önce");
});

senaryo("⊗/⊙ alanı küçük panel hücresine sığar; alan çizgisi (→ ← ↑ ↓) modu", () => {
  const panel = panelSekli("p", { satir: 2, sutun: 3, baslik: "daire", aralik: 14 }, 20, 20, 540, 300);
  const f = panelSekliHucreleri(panel)![0].cerceve;
  const W = 700, H = 420;
  const ink = (ek: Record<string, unknown>, w: number, h: number) => {
    const c = createCanvas(W, H), g = c.getContext("2d") as unknown as CanvasRenderingContext2D;
    g.fillStyle = "#fff"; g.fillRect(0, 0, W, H); g.strokeStyle = "#0f172a"; g.fillStyle = "#0f172a"; g.lineWidth = 2;
    const s: FizikSekli = { id: "a", tur: "fizik", nesne: "alanNokta", kalinlik: 2, x: f.x + 12, y: f.y + 34, w, h, ek };
    fizikEkCiz(g, s);
    const d = g.getImageData(0, 0, W, H).data;
    let n = 0, x0 = 1e9, x1 = -1, y0 = 1e9, y1 = -1;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (d[(y * W + x) * 4] < 200) { n++; x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
    return { n, x0, x1, y0, y1, s };
  };
  // Hücreye sığan küçük kutu (≈ hücrenin %55'i): mürekkep kutudan ve hücreden taşmaz
  const w = Math.round(f.w * 0.55), h = Math.round(f.h * 0.5);
  for (const ters of [false, true]) {
    const o = ink({ sayi: 4, sayi2: 3, ters }, w, h);
    dogrula(o.n > 150, "simgeler çizilmedi");
    dogrula(o.x0 >= o.s.x - 1 && o.x1 <= o.s.x + w + 1 && o.y0 >= o.s.y - 1 && o.y1 <= o.s.y + h + 1, `simgeler kutudan taşıyor ${JSON.stringify(o)}`);
    dogrula(o.x0 >= f.x && o.x1 <= f.x + f.w && o.y0 >= f.y && o.y1 <= f.y + f.h, "simgeler hücreden taşıyor");
  }
  // Çok küçük (60×40) ve yoğun (6×4): çökmeden kutu içinde
  const k = ink({ sayi: 6, sayi2: 4 }, 60, 40);
  dogrula(k.n > 100 && k.x0 >= k.s.x - 1 && k.x1 <= k.s.x + 61 && k.y0 >= k.s.y - 1 && k.y1 <= k.s.y + 41, "küçük/yoğun alan taşıyor " + JSON.stringify(k));
  // Çizgi modu: dört yön çizilir, kutuyu aşmaz; yön değişince çizim değişir; geçersiz yön ⊗/⊙'ya düşer
  const sim = ink({ sayi: 4, sayi2: 3 }, w, h).n;
  const yonler = (["sag", "sol", "yukari", "asagi"] as const).map((y) => ({ y, o: ink({ sayi: 4, sayi2: 3, metin: y }, w, h) }));
  for (const { y, o } of yonler) {
    dogrula(o.n > 60 && o.n !== sim, `${y}: çizgi çizilmedi`);
    dogrula(o.x0 >= o.s.x - 1 && o.x1 <= o.s.x + w + 1 && o.y0 >= o.s.y - 1 && o.y1 <= o.s.y + h + 1, `${y}: kutudan taşıyor ${JSON.stringify(o)}`);
  }
  dogrula(yonler[0].o.n === yonler[1].o.n && yonler[2].o.n === yonler[3].o.n, "ters yön simetrik mürekkep");
  dogrula(ink({ sayi: 4, sayi2: 3, metin: "bozuk" }, w, h).n === sim, "bilinmeyen yön ⊗/⊙ olarak çizilir");
  dogrula(sekilGecerliMi({ id: "a", tur: "fizik", nesne: "alanNokta", kalinlik: 2, x: 0, y: 0, w: 90, h: 60, ek: { metin: "sag", sayi: 3 } }), "ek.metin geçerli");
});

console.log("TÜM PANEL IZGARASI SENARYOLARI BAŞARILI");
