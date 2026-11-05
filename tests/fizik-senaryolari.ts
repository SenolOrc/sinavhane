// Fizik şekil kütüphanesi senaryoları: katalog, etiket yazımı, bağlantılar,
// döndürme, içerik sınırı ve şablon doğrulaması. React'siz — `cizim/` saf.

import type { CizimSekli, Sekil } from "../src/modules/sinav-olusturucu/cizim/tipler";
import {
  FIZIK_GRUPLARI,
  FIZIK_TANIMLARI,
  fizikCiz,
  fizikMetniParcala,
  fizikNesnesiGecerliMi,
  fizikSimgeCiz,
  zigzagNoktalari,
} from "../src/modules/sinav-olusturucu/cizim/fizik";
import type { FizikNesnesi } from "../src/modules/sinav-olusturucu/cizim/tipler";
import {
  baglayiciYolu,
  sekilGeometriAyarla,
  sekilTasi,
  tutunmaNoktasi,
  yonDondur,
} from "../src/modules/sinav-olusturucu/cizim/geometri";
import { cizimIcerikSiniri, metinOlculeri, sekilTutamaclari } from "../src/modules/sinav-olusturucu/cizim/sinirlar";
import { izgaraDugumu, enYakinDugum, izgaraBoyutu } from "../src/modules/sinav-olusturucu/cizim/geometri";
import { bosYerBul } from "../src/modules/sinav-olusturucu/cizim/yerlesim";
import { sekilVuruldu } from "../src/modules/sinav-olusturucu/cizim/vurus";
import { sekilleriCiz } from "../src/modules/sinav-olusturucu/cizim/ciz";
import { sekilGecerliMi } from "../src/modules/sinav-olusturucu/cizim/sablon";
import {
  eksenSayilari, egriParcalari, egriVurguNoktalari, grafikDuzeni, grafikVerisiGecerliMi, guzelAdim, hareketOzeti,
  hareketParcalari, hareketUcluGrafik, noktalardanEvreler, noktalardanGrafik, noktalariOku, noktalariYaz, piYaz, sayiYaz, GRAFIK_SABLONLARI, ORNEK_EVRELER,
} from "../src/modules/sinav-olusturucu/cizim/grafik";
import { derle, esitsizlikOku, fonksiyonOku } from "../src/modules/sinav-olusturucu/cizim/ifade";
import {
  govdeSatirSayisi, sinifSayisi, besSayiOzeti, govdeYaprak, ISTATISTIK_SABLONLARI, istatistikCiz, istatistikVerisiGecerliMi, ozetSayilar, siniflandir, tabloOku,
} from "../src/modules/sinav-olusturucu/cizim/istatistik";
import {
  agacOkuAyrinti, agacOku, agacYaz, agacYaprakSayisi, araliklariOku, araliklariYaz, SEMA_SABLONLARI, semaCiz, semaVerisiGecerliMi, sayiNoktalariniOku, vennBolgeAdlari, vennBolgesi, vennDaireleri,
} from "../src/modules/sinav-olusturucu/cizim/sema";
import { ayniXUyarisi, ekstremumNoktalari, noktalariOkuAyrinti, sayiYazDuyarli, adliNoktalariOku, adliNoktalariYaz, dogrusalRegresyon, hizliMatematik, kesisimNoktalari, MAT_GRAFIK_SABLONLARI, tegetDogrusu } from "../src/modules/sinav-olusturucu/cizim/grafik";
import {
  ELEMENT_KUTLELERI, ELEMENT_SEMBOLLERI, KIMYA_ATOM_SABLONLARI, KIMYA_GRAFIK_SABLONLARI, KIMYA_LAB_NESNELERI, KIMYA_MOLEKUL_SABLONLARI, KIMYA_PERIYODIK_SABLONLARI,
  MOLEKULLER, elementKonumu, elementListesiOku, enBolKutleNumarasi, kabukDizilimi, kimyaBoyutu, kimyaCiz, kimyaVerisiGecerliMi, periyodikGoruluyor,
} from "../src/modules/sinav-olusturucu/cizim/kimya";
import { GECERLI_SEKIL_TURLERI } from "../src/modules/sinav-olusturucu/cizim/sabitler";
import {
  BENZER_SABLONLARI, CEMBER_SABLONLARI, COKGEN_SABLONLARI, UCGEN_SABLONLARI, geometriVerisiGecerliMi, ucgenKoseleri, ucgenOlculeri, varsayilanUcgen,
} from "../src/modules/sinav-olusturucu/cizim/geometriSekilleri";
import { enerjiDuzeyleriOku, enerjiGecisleriOku } from "../src/modules/sinav-olusturucu/cizim/fizikEk";
import {
  KIMYA_ORBITAL_SABLONLARI, KIMYA_ORGANIK_SABLONLARI, KIMYA_PIL_SABLONLARI, orbitalDizilimi, orbitalDizilimMetni, ozelMolekulOku, ozelMolekulVerisi, pilVerisi, molekulVerisi,
  zincirAdi, zincirMolekulu, zincirVerisi,
} from "../src/modules/sinav-olusturucu/cizim/kimya";
import { cizgiDeseniDegerleri, egriCizgiDeseni, adliNoktaSatiri, parcaKosuluOku } from "../src/modules/sinav-olusturucu/cizim/grafik";
import type { GeometriVerisi, GrafikCizgiDeseni } from "../src/modules/sinav-olusturucu/cizim/tipler";
import { fizikElipsMi } from "../src/modules/sinav-olusturucu/cizim/fizik";

function dogrula(kosul: unknown, mesaj: string) {
  if (!kosul) throw new Error(`TEST BAŞARISIZ: ${mesaj}`);
}
function yakin(a: number, b: number, mesaj: string, tol = 0.5) {
  dogrula(Math.abs(a - b) <= tol, `${mesaj} (beklenen ${b}, gelen ${a})`);
}
function test(ad: string, fn: () => void) {
  fn();
  console.log(`✓ ${ad}`);
}

// Çağrıları sayan sahte ctx: bilinmeyen her yöntem sessizce kabul edilir.
function sahteCtx() {
  const cagrilar: string[] = [];
  const ozellikler: Record<string, unknown> = { font: "", lineWidth: 1 };
  const proxy = new Proxy(ozellikler, {
    get(hedef, ad: string) {
      if (ad === "measureText") return (m: string) => ({ width: [...m].length * 10 });
      if (ad in hedef) return hedef[ad];
      return (...a: unknown[]) => { cagrilar.push(ad); return a; };
    },
    set(hedef, ad: string, deger) { hedef[ad] = deger; return true; },
  });
  return { ctx: proxy as unknown as CanvasRenderingContext2D, cagrilar };
}

const ortak = { kalinlik: 2 };
const kutle = (id: string, x: number, y: number, ek: Partial<Extract<Sekil, { tur: "fizik" }>> = {}): Sekil => ({
  id, tur: "fizik", nesne: "kutle", ...ortak, x, y, w: 90, h: 60, ...ek,
});

const tumNesneler = Object.keys(FIZIK_TANIMLARI) as FizikNesnesi[];

test("Katalog: otuz beş nesne, her biri bir grupta, ölçüleri pozitif", () => {
  dogrula(tumNesneler.length === 67 + 4 /* v1.2 geometri */ + 3 /* v1.2 fizik: egikKuvvet, optikDuzenek, siviKabi */, `nesne sayısı ${tumNesneler.length}`);
  const gruplar = new Set(FIZIK_GRUPLARI.map((g) => g.id));
  for (const n of tumNesneler) {
    const t = FIZIK_TANIMLARI[n];
    dogrula(gruplar.has(t.grup), `${n} grubu yok`);
    dogrula(t.w > 0 && t.h > 0, `${n} ölçüsü`);
    dogrula(t.ad.length > 0 && t.ipucu.length > 0, `${n} adı/ipucu`);
  }
  for (const g of FIZIK_GRUPLARI) dogrula(tumNesneler.some((n) => FIZIK_TANIMLARI[n].grup === g.id), `boş grup ${g.id}`);
  dogrula(fizikNesnesiGecerliMi("kutle") && !fizikNesnesiGecerliMi("toString") && !fizikNesnesiGecerliMi("__proto__"), "geçerlilik kontrolü prototip anahtarını yakalamalı");
});

test("Etiket yazımı: alt/üst simge, grup, Yunan harfi, kaçış", () => {
  const p = (s: string) => JSON.stringify(fizikMetniParcala(s));
  dogrula(p("m_1") === JSON.stringify([{ t: "m", m: "n" }, { t: "1", m: "alt" }]), "m_1 → " + p("m_1"));
  dogrula(p("v^2") === JSON.stringify([{ t: "v", m: "n" }, { t: "2", m: "ust" }]), "v^2");
  dogrula(p("v_{0x}") === JSON.stringify([{ t: "v", m: "n" }, { t: "0x", m: "alt" }]), "v_{0x}");
  dogrula(p("x^10 + 1") === JSON.stringify([{ t: "x", m: "n" }, { t: "10", m: "ust" }, { t: " + 1", m: "n" }]), "x^10: rakam dizisi bütün");
  dogrula(p("\\theta") === JSON.stringify([{ t: "θ", m: "n" }]), "\\theta");
  dogrula(p("\\Delta t") === JSON.stringify([{ t: "Δ t", m: "n" }]), "\\Delta t");
  dogrula(p("v_\\theta") === JSON.stringify([{ t: "v", m: "n" }, { t: "θ", m: "alt" }]), "v_\\theta");
  dogrula(p("a\\_b") === JSON.stringify([{ t: "a_b", m: "n" }]), "kaçışlı alt çizgi düz kalmalı");
  dogrula(p("\\bilinmeyen") === JSON.stringify([{ t: "\\bilinmeyen", m: "n" }]), "bilinmeyen komut yutulmamalı");
  dogrula(p("x_") === JSON.stringify([{ t: "x", m: "n" }, { t: "_", m: "n" }]) || p("x_").includes("x"), "yarım alt çizgi çökmemeli");
  dogrula(p("F_{sür}") === JSON.stringify([{ t: "F", m: "n" }, { t: "sür", m: "alt" }]), "F_{sür}");
});

test("Serbest metin etiketi: vektör oku, alt/üst simge, ⁵⁶₂₆Fe istifi, ⊗ ⊙", () => {
  const p = (s: string) => fizikMetniParcala(s).map((x) => `${x.m}:${x.t}${x.t2 !== undefined ? "/" + x.t2 : ""}`).join("|");
  // Vektör oku: bozuk "→{F}" ya da sessizce atılan U+20D7 değil, harfin ÜSTÜNDE ok.
  dogrula(p("\\vec{F}") === "ok:F", `\\vec{F} → ${p("\\vec{F}")}`);
  dogrula(p("vec(F)") === "ok:F", "vec(F)");
  dogrula(p("\\vec F") === "ok:F", "\\vec F");
  dogrula(p("F\u20d7") === "ok:F", "birleşik ok (F⃗) harfi okla işaretlemeli, atmamalı: " + p("F\u20d7"));
  dogrula(p("\\vec{F}_1") === "ok:F|alt:1", "vec{F}_1: ok + indis: " + p("\\vec{F}_1"));
  dogrula(p("vec(F_1)") === "ok:F|alt:1", "vec(F_1): " + p("vec(F_1)"));
  dogrula(p("\\vec{\\theta}") === "ok:θ", "\\vec{\\theta}");
  dogrula(p("\\bar{x}") === "cizgi:x", "\\bar{x} üstçizgi");
  dogrula(!p("\\vec{F}").includes("→"), "ok metni '→' karakterine dönmemeli");
  dogrula(p("ovec") === "n:ovec", "kelime içindeki vec etkilenmemeli");
  // Alt/üst simge (serbest etikette de): iyon yükü, indis, üs.
  dogrula(p("d_s") === "n:d|alt:s", "d_s");
  dogrula(p("F_{sür}") === "n:F|alt:sür", "F_{sür}");
  dogrula(p("x^2") === "n:x|ust:2", "x^2");
  dogrula(p("SO_4^{2-}") === "n:SO|istif:2−/4", "SO_4^{2-} indis+yük ÜST ÜSTE, eksi işareti: " + p("SO_4^{2-}"));
  dogrula(p("SO_4^{2-}").includes("−") && !p("SO_4^{2-}").includes("-"), "yük işareti kısa tire değil eksi");
  dogrula(p("x^{-1}") === "n:x|ust:−1", "x^{-1}: " + p("x^{-1}"));
  // Çekirdek gösterimi: kütle numarası üstte, atom numarası altta.
  dogrula(p("^{56}_{26}Fe") === "istif:56/26|n:Fe", "^{56}_{26}Fe: " + p("^{56}_{26}Fe"));
  dogrula(p("_{26}^{56}Fe") === "istif:56/26|n:Fe", "_{26}^{56}Fe: " + p("_{26}^{56}Fe"));
  dogrula(fizikMetniParcala("^{56}_{26}Fe")[0].tabansiz === true && fizikMetniParcala("x_1^2")[0].tabansiz === undefined, "tabansız istif işareti");
  // ⊗ ⊙: Unicode'a bağlı kalmadan daire içinde çarpı/nokta olarak çizilir.
  dogrula(p("\\otimes") === "daire:x" && p("\\odot") === "daire:." && p("⊗⊙") === "daire:x|daire:.", "\\otimes \\odot ⊗ ⊙: " + p("⊗⊙"));
  dogrula(p("B \\otimes") === "n:B |daire:x", "B \\otimes: " + p("B \\otimes"));
  // Ölçü: simgeli etiket düz harf sayısından dar, ok/daire genişliği ölçülüyor.
  const { ctx } = sahteCtx();
  const olc = (metin: string) => metinOlculeri(ctx, { id: "m", tur: "metin", metin, x: 0, y: 0 }).w;
  dogrula(olc("x^2") < olc("x^22") && olc("x^2") < 30, "üst simge ölçüsü");
  dogrula(olc("\\vec{F}") >= 10 && olc("\\vec{F}") < olc("\\vec{F}\\vec{F}"), "ok ölçüsü");
  dogrula(olc("\\otimes") > 6, "⊗ ölçüsü pozitif");
  // Çizim hatasız ve ok/daire çizgisi çıkarıyor.
  const sahte = sahteCtx();
  sekilleriCiz(sahte.ctx, [{ id: "m", tur: "metin", metin: "\\vec{F} \\otimes \\odot ^{56}_{26}Fe SO_4^{2-}", x: 20, y: 30, punto: 20 } as Sekil]);
  dogrula(sahte.cagrilar.includes("arc") && sahte.cagrilar.includes("lineTo") && sahte.cagrilar.includes("fillText"), "ok + daire + metin çizilmeli: " + [...new Set(sahte.cagrilar)].join(","));
});

test("Her fizik nesnesi hatasız çiziliyor (dönük, aynalı, etiketli)", () => {
  for (const n of tumNesneler) {
    for (const ek of [{}, { donus: 90 }, { ayna: true }, { etiket: "m_1", donus: 30, ayna: true }, { dolgu: "#dbeafe", etiketYeri: "sag" as const }]) {
      const { ctx, cagrilar } = sahteCtx();
      const t = FIZIK_TANIMLARI[n];
      fizikCiz(ctx, { id: "a", tur: "fizik", nesne: n, kalinlik: 2, x: 20, y: 20, w: t.w, h: t.h, ...ek });
      dogrula(cagrilar.length > 0, `${n} hiçbir şey çizmedi`);
    }
    const { ctx } = sahteCtx();
    fizikSimgeCiz(ctx, n, 44, 30);
  }
});

test("Hiç ölçüsüz/sıfır ölçülü nesne çizimi patlatmıyor", () => {
  const { ctx } = sahteCtx();
  for (const n of tumNesneler) fizikCiz(ctx, { id: "s", tur: "fizik", nesne: n, kalinlik: 1, x: 5, y: 5, w: 1, h: 1, etiket: "" });
});

test("Zikzak: uçlar düz kuyruk, uç noktalar korunur, kısa yolda da çalışır", () => {
  const z = zigzagNoktalari({ x: 0, y: 0 }, { x: 100, y: 0 }, 6, 10, 0.2);
  dogrula(z[0].x === 0 && z[z.length - 1].x === 100, "uçlar korunmalı");
  dogrula(z.length === 6 + 4, `nokta sayısı ${z.length}`);
  yakin(z[1].y, 0, "ilk kuyruk düz");
  dogrula(Math.abs(z[2].y) === 10 && z[2].y === -z[3].y, "dişler zıt yönde");
  const kisa = zigzagNoktalari({ x: 5, y: 5 }, { x: 5, y: 5 }, 6, 10);
  dogrula(kisa.length === 2, "sıfır uzunlukta dejenere dönüş");
});

test("DÜZ bağlantı: yan yana iki kütle arasında yatay ip, kütle taşınınca ip gelir", () => {
  const a = kutle("a", 100, 100);
  const b = kutle("b", 300, 100);
  const ip: Sekil = { id: "ip", tur: "baglayici", ...ortak, kaynak: { sekilId: "a" }, hedef: { sekilId: "b" }, stil: "duz", okUcu: "yok" };
  const yol = baglayiciYolu([a, b, ip], ip as Extract<Sekil, { tur: "baglayici" }>);
  dogrula(yol && yol.length === 2, "düz yol iki noktalı olmalı");
  yakin(yol![0].x, 190, "ip A'nın sağ kenarında başlamalı");
  yakin(yol![0].y, 130, "ip kütlenin yan orta noktasında");
  yakin(yol![1].x, 300, "ip B'nin sol kenarında bitmeli");
  yakin(yol![0].y, yol![1].y, "yatay");
  const tasindi = [a, sekilTasi(b, 0, 80), ip];
  const yeni = baglayiciYolu(tasindi, ip as Extract<Sekil, { tur: "baglayici" }>);
  yakin(yeni![1].y, 210, "kütle taşınınca ip ucu da gelmeli");
});

test("DİK bağlantı eskisi gibi: stil yoksa dik açılı yol", () => {
  const a = kutle("a", 100, 100);
  const b = kutle("b", 300, 260);
  const ok: Sekil = { id: "ok", tur: "baglayici", ...ortak, kaynak: { sekilId: "a" }, hedef: { sekilId: "b" } };
  const yol = baglayiciYolu([a, b, ok], ok as Extract<Sekil, { tur: "baglayici" }>)!;
  dogrula(yol.length > 2, "dik yol köşeli olmalı");
  for (let i = 1; i < yol.length; i += 1) {
    dogrula(Math.abs(yol[i].x - yol[i - 1].x) < 0.01 || Math.abs(yol[i].y - yol[i - 1].y) < 0.01, "her parça eksene paralel");
  }
});

test("Serbest uçlu vektör: kütleden boş noktaya", () => {
  const a = kutle("a", 100, 100);
  const f: Sekil = { id: "f", tur: "baglayici", ...ortak, kaynak: { sekilId: "a", yon: "sag" }, hedef: { x: 400, y: 130 }, stil: "vektor", okUcu: "son", etiket: "F" };
  const yol = baglayiciYolu([a, f], f as Extract<Sekil, { tur: "baglayici" }>)!;
  yakin(yol[0].x, 190, "vektör kütlenin sağ kenarından çıkmalı");
  yakin(yol[1].x, 400, "serbest uç noktada");
  const sinir = cizimIcerikSiniri(sahteCtx().ctx, [a, f]);
  dogrula(sinir.x + sinir.w >= 400, "serbest uç içerik sınırına girmeli");
});

test("Yetim bağlantı: şekil silinince yol yok (çökme yok)", () => {
  const ip: Sekil = { id: "ip", tur: "baglayici", ...ortak, kaynak: { sekilId: "yok" }, hedef: { x: 5, y: 5 }, stil: "yay" };
  dogrula(baglayiciYolu([ip], ip as Extract<Sekil, { tur: "baglayici" }>) === null, "yetim bağlayıcı null olmalı");
});

test("Döndürme: 90° çevrilmiş direncin YEREL 'sol' ucu yukarı çıkar, tutunma noktası döner", () => {
  const r: Sekil = { id: "r", tur: "fizik", nesne: "direnc", ...ortak, x: 100, y: 100, w: 100, h: 34, donus: 90 };
  const sol = tutunmaNoktasi(r, "sol");
  yakin(sol.x, 150, "sol uç merkez x'e gelir");
  yakin(sol.y, 67, "sol uç yukarı çıkar (merkez y 117 - 50)");
  dogrula(yonDondur("sol", 90) === "ust" && yonDondur("ust", 90) === "sag" && yonDondur("sag", -90) === "ust" && yonDondur("alt", 360) === "alt", "yön döndürme");
  // Dönüşsüz şekilde eski davranış birebir.
  const d: Sekil = { ...r, donus: 0 } as Sekil;
  const s0 = tutunmaNoktasi(d, "sol");
  yakin(s0.x, 100, "dönüşsüz sol");
  yakin(s0.y, 117, "dönüşsüz sol y");
});

test("Dönük şekle bağlı düz ip: yön EKRANDAKİ yöndür, dönüşten sonra doğru uca oturur", () => {
  const r: Sekil = { id: "r", tur: "fizik", nesne: "direnc", ...ortak, x: 100, y: 100, w: 100, h: 34, donus: 90 };
  const k = kutle("k", 100, 400, { w: 100 });
  const tel: Sekil = { id: "t", tur: "baglayici", ...ortak, kaynak: { sekilId: "r", yon: "ust" }, hedef: { sekilId: "k", yon: "ust" }, stil: "duz", okUcu: "yok" };
  const yol = baglayiciYolu([r, k, tel], tel as Extract<Sekil, { tur: "baglayici" }>)!;
  yakin(yol[0].x, 150, "ekrandaki 'Üst' seçimi: dönmüş direncin üstte görünen ucu");
  yakin(yol[0].y, 67, "direnç 90° döndü: ip üst uçtan çıkar");
  dogrula(yol[0].y < yol[1].y, "ip aşağıdaki kütleye iner");
});

test("Boyutlandırma ve kesin ölçü fizik nesnesinde çalışıyor", () => {
  const k = kutle("k", 100, 100);
  const buyuk = sekilGeometriAyarla(k, { w: 200, h: 120 }) as Extract<Sekil, { tur: "fizik" }>;
  dogrula(buyuk.w === 200 && buyuk.h === 120, "w/h uygulanmalı");
  const tut = sekilTutamaclari(sahteCtx().ctx, k).map((t) => t.id);
  dogrula(["sol-ust", "sag-ust", "sol-alt", "sag-alt", "dondur"].every((i) => tut.includes(i as never)), "köşe + döndürme tutamaçları: " + tut.join(","));
});

test("Vuruş: kütlenin İÇİ tıklanabilir, uzağı değil (akış kutusu gibi nesne)", () => {
  const { ctx } = sahteCtx();
  const k = kutle("k", 100, 100);
  dogrula(sekilVuruldu(ctx, k, { x: 140, y: 130 }), "iç tıklama");
  dogrula(!sekilVuruldu(ctx, k, { x: 400, y: 400 }), "uzak tıklama");
});

test("İçerik sınırı: kutunun dışındaki etiket kırpılmıyor", () => {
  const { ctx } = sahteCtx();
  const r: Sekil = { id: "r", tur: "fizik", nesne: "direnc", ...ortak, x: 200, y: 200, w: 100, h: 34, etiket: "R", etiketYeri: "ust" };
  const etiketsiz: Sekil = { ...r, etiket: undefined } as Sekil;
  const ile = cizimIcerikSiniri(ctx, [r], 0);
  const siz = cizimIcerikSiniri(ctx, [etiketsiz], 0);
  dogrula(ile.y < siz.y, `etiketli çizimin üst sınırı daha yukarıda olmalı (${ile.y} < ${siz.y})`);
  const sag: Sekil = { ...r, etiketYeri: "sag", etiket: "R_1 = 20" } as Sekil;
  dogrula(cizimIcerikSiniri(ctx, [sag], 0).w > siz.w, "sağ etiket genişliği artırmalı");
});

test("Şablon doğrulaması: fizik beyaz listede, bozuk kayıt reddedilir", () => {
  dogrula(GECERLI_SEKIL_TURLERI.includes("fizik"), "tür beyaz listede");
  dogrula(sekilGecerliMi(kutle("k", 1, 2)), "geçerli fizik şekli");
  dogrula(!sekilGecerliMi({ id: "x", tur: "fizik", nesne: "uzayGemisi", kalinlik: 2, x: 1, y: 1, w: 5, h: 5 }), "bilinmeyen nesne reddedilmeli");
  dogrula(!sekilGecerliMi({ id: "x", tur: "fizik", nesne: "kutle", kalinlik: 2, x: "1", y: 1, w: 5, h: 5 }), "sayısal olmayan alan reddedilmeli");
  dogrula(!sekilGecerliMi({ id: "x", tur: "fizik", nesne: "kutle", kalinlik: 2, x: NaN, y: 1, w: 5, h: 5 }), "NaN reddedilmeli");
  dogrula(!sekilGecerliMi({ id: "b", tur: "baglayici", kalinlik: 2, kaynak: { x: 1, y: 1 }, hedef: { x: 2, y: 2 }, stil: "dalgali" }), "bilinmeyen stil reddedilmeli");
  dogrula(sekilGecerliMi({ id: "b", tur: "baglayici", kalinlik: 2, kaynak: { x: 1, y: 1 }, hedef: { x: 2, y: 2 } }), "stilsiz (eski) bağlayıcı geçerli");
});

test("Tüm belge çizimi: fizik + ip + yay + vektör birlikte çiziliyor", () => {
  const { ctx, cagrilar } = sahteCtx();
  const belge: CizimSekli[] = [
    { id: "z", tur: "fizik", nesne: "zemin", ...ortak, x: 50, y: 300, w: 400, h: 20 },
    kutle("a", 100, 240) as CizimSekli,
    kutle("b", 300, 240) as CizimSekli,
    { id: "ip", tur: "baglayici", ...ortak, kaynak: { sekilId: "a" }, hedef: { sekilId: "b" }, stil: "yay", etiket: "k" },
    { id: "f", tur: "baglayici", ...ortak, kaynak: { sekilId: "b", yon: "sag" }, hedef: { x: 450, y: 270 }, stil: "vektor", etiket: "F_{ap}" },
  ];
  sekilleriCiz(ctx, belge);
  dogrula(cagrilar.filter((c) => c === "lineTo").length > 10, "yay zikzağı ve oklar çizilmeli");
});

test("Yerleşim: yeni şekil mevcutlarla kesişmez; vektör grubu var", () => {
  const mevcut = [{ x: 430, y: 270, w: 90, h: 60 }];
  const k = bosYerBul(mevcut, 90, 60, { w: 960, h: 600 });
  const kesisiyor = k.x < 520 && k.x + 90 > 430 && k.y < 330 && k.y + 60 > 270;
  dogrula(!kesisiyor, `yeni şekil üst üste bindi: ${JSON.stringify(k)}`);
  for (const v of ["vektorKuvvet", "vektorHiz", "vektorIvme", "vektorBilesen"] as const) {
    dogrula(FIZIK_TANIMLARI[v].grup === "vektor", `${v} vektör grubunda değil`);
  }
  // Tam boş yer yoksa yeni büyük şekil öncekinin tam üstüne değil, en az örtüşen yere gelir.
  const buyuk = { x: 230, y: 125, w: 500, h: 350 };
  const k2 = bosYerBul([buyuk], 500, 350, { w: 960, h: 600 });
  const ox = Math.max(0, Math.min(k2.x + 500, buyuk.x + buyuk.w) - Math.max(k2.x, buyuk.x));
  const oy = Math.max(0, Math.min(k2.y + 350, buyuk.y + buyuk.h) - Math.max(k2.y, buyuk.y));
  dogrula(ox * oy < 500 * 350 * 0.5, `büyük şekil öncekinin üstüne bindi: ${JSON.stringify(k2)}`);
});

test("Düz bağlantı: karşılıklı iki kütle arasında çizgi yatay", () => {
  const mk = (id: string, x: number, y: number): Sekil => ({ id, tur: "fizik", nesne: "kutle", kalinlik: 2, x, y, w: 90, h: 60 });
  const a = mk("a", 100, 100);
  const b = mk("b", 300, 120);
  const ip: Sekil = { id: "ip", tur: "baglayici", kalinlik: 2, kaynak: { sekilId: "a" }, hedef: { sekilId: "b" }, okUcu: "yok", stil: "duz" };
  const yol = baglayiciYolu([a, b, ip], ip as Extract<Sekil, { tur: "baglayici" }>)!;
  dogrula(Math.abs(yol[0].y - yol[1].y) < 0.01, `ip eğik: ${JSON.stringify(yol)}`);
});

test("Kareli alan: satır/sütun, köşe konumu, yakalama, taşıma, geçerlilik", () => {
  const alan: Sekil = { id: "g", tur: "fizik", nesne: "kareliAlan", kalinlik: 1, x: 100, y: 50, w: 200, h: 120, satir: 3, sutun: 4 };
  const b = izgaraBoyutu(alan);
  dogrula(b.satir === 3 && b.sutun === 4, "satır/sütun okunamadı");
  const sagAlt = izgaraDugumu(alan, 4, 3);
  dogrula(sagAlt.x === 300 && sagAlt.y === 170, `sağ-alt köşe ${JSON.stringify(sagAlt)}`);
  const sag1 = izgaraDugumu(alan, 1, 0);
  dogrula(sag1.x === 150 && sag1.y === 50, "1. sütun yanlış");
  const yakin = enYakinDugum(alan, { x: 152, y: 92 });
  dogrula(yakin.c === 1 && yakin.r === 1, `yakalama ${JSON.stringify(yakin)}`);
  dogrula(enYakinDugum(alan, { x: 999, y: -50 }).c === 4 && enYakinDugum(alan, { x: 999, y: -50 }).r === 0, "alan dışı köşeye sıkışmalı");
  // Boş/bozuk değerlerde varsayılan 3×4
  dogrula(izgaraBoyutu({ ...alan, satir: undefined, sutun: undefined } as Sekil).sutun === 4, "varsayılan sütun");
  // Vektör köşelere tutunur; alan taşınınca birlikte gelir
  const vek: Sekil = { id: "v", tur: "baglayici", kalinlik: 2, kaynak: { sekilId: "g", dugum: { c: 0, r: 3 } }, hedef: { sekilId: "g", dugum: { c: 2, r: 1 } }, stil: "vektor", okUcu: "son" };
  const y1 = baglayiciYolu([alan, vek], vek as Extract<Sekil, { tur: "baglayici" }>)!;
  dogrula(y1[0].x === 100 && y1[0].y === 170 && y1[1].x === 200 && y1[1].y === 90, `vektör yolu ${JSON.stringify(y1)}`);
  const tasinan = { ...alan, x: 130, y: 70 } as Sekil;
  const y2 = baglayiciYolu([tasinan, vek], vek as Extract<Sekil, { tur: "baglayici" }>)!;
  dogrula(y2[0].x === 130 && y2[0].y === 190, "alan taşınınca vektör gelmedi");
  const buyuyen = { ...alan, w: 400 } as Sekil;
  dogrula(baglayiciYolu([buyuyen, vek], vek as Extract<Sekil, { tur: "baglayici" }>)![1].x === 300, "alan boyutlanınca vektör gelmedi");
  // Şablon doğrulaması
  dogrula(sekilGecerliMi(alan) && !sekilGecerliMi({ ...alan, satir: 0 }) && !sekilGecerliMi({ ...alan, sutun: 99 }), "şablon doğrulaması");
  // Hit: yalnız çizgiye yakın; hücre içi boş (içindeki cisme tıklamayı çalmaz)
  const ctx = { font: "", measureText: () => ({ width: 8 }) } as unknown as CanvasRenderingContext2D;
  dogrula(sekilVuruldu(ctx, alan, { x: 150, y: 80 }, 100, [alan]), "köşe/çizgi üstü vurmalı");
  dogrula(!sekilVuruldu(ctx, alan, { x: 125, y: 70 }, 100, [alan]), "hücre içi vurmamalı");
  // Çizim: zemin her zaman altta, çökmeden
  sekilleriCiz(sahteCtx().ctx, [vek, alan]);
});

test("Vektör rengi: bağlayıcı ve vektör nesnesi seçilen renkle çizilir; bozuk renk reddedilir", () => {
  const renkler: string[] = [];
  const ozellik: Record<string, unknown> = { font: "", lineWidth: 1 };
  const ctx = new Proxy(ozellik, {
    get(h, ad: string) {
      if (ad === "measureText") return (m: string) => ({ width: [...m].length * 8 });
      if (ad in h) return h[ad];
      return () => undefined;
    },
    set(h, ad: string, v) { if (ad === "strokeStyle" || ad === "fillStyle") renkler.push(String(v)); h[ad] = v; return true; },
  }) as unknown as CanvasRenderingContext2D;
  const vk: Sekil = { id: "v", tur: "baglayici", kalinlik: 2, kaynak: { x: 10, y: 10 }, hedef: { x: 100, y: 10 }, stil: "vektor", okUcu: "son", etiket: "F", renk: "#dc2626" };
  sekilleriCiz(ctx, [vk]);
  dogrula(renkler.includes("#dc2626"), "bağlayıcı vektör kırmızı çizilmeli");
  renkler.length = 0;
  sekilleriCiz(ctx, [{ id: "n", tur: "fizik", nesne: "vektorKuvvet", kalinlik: 2, x: 10, y: 10, w: 100, h: 26, etiket: "F", renk: "#2563eb" } as Sekil]);
  dogrula(renkler.includes("#2563eb"), "vektör nesnesi mavi çizilmeli");
  dogrula(sekilGecerliMi(vk) && !sekilGecerliMi({ ...vk, renk: "kırmızı" } as Sekil), "renk doğrulaması");
});

test("Grafik: hareket evreleri — konum/hız/ivme birbiriyle tutarlı", () => {
  // 4 s'de 5 m/s², 4 s sabit, 2 s'de −10 m/s²: v=20 → 20 → 0; x = 40 + 80 + 20 = 140
  const o = hareketOzeti(0, 0, ORNEK_EVRELER);
  yakin(o.toplamSure, 10, "toplam süre"); yakin(o.sonHiz, 0, "son hız"); yakin(o.sonKonum, 140, "son konum");
  const v = hareketParcalari("hiz", 0, 0, ORNEK_EVRELER);
  dogrula(v.length === 1 && v[0].length === 4, "hız tek sürekli çizgi, 4 köşe");
  yakin(v[0][1].y, 20, "t=4'te hız 20"); yakin(v[0][3].y, 0, "t=10'da hız 0");
  const a = hareketParcalari("ivme", 0, 0, ORNEK_EVRELER);
  dogrula(a.length === 3 && a[2][0].y === -10, "ivme evre başına yatay parça");
  const x = hareketParcalari("konum", 0, 0, ORNEK_EVRELER)[0];
  yakin(x[x.length - 1].y, 140, "konum çizgisi 140'ta biter");
  const t4 = x.find((p) => Math.abs(p.x - 4) < 1e-9)!;
  yakin(t4.y, 40, "t=4'te konum 40");
  const hv = egriVurguNoktalari({ tur: "hareket", buyukluk: "hiz", x0: 0, v0: 0, evreler: ORNEK_EVRELER });
  dogrula(hv.length === 4 && hv[1].x === 4 && hv[1].y === 20, "köşe noktaları evre sınırlarında");
  const uc = hareketUcluGrafik(0, 0, ORNEK_EVRELER);
  dogrula(uc.length === 3 && uc.every((g) => g.xMin === 0 && g.xMax === 10), "üçlü grafik aynı zaman aralığında");
  yakin(hareketOzeti(0, 10, [{ sure: 5, ivme: 0 }]).yerDegistirme, 50, "sabit hızda yer değiştirme");
});

test("Grafik: sinüs örneklemesi, aralık ve adım seçimi", () => {
  const sin = GRAFIK_SABLONLARI.find((x) => x.id === "sin")!.olustur();
  const p = egriParcalari(sin.egriler[0])[0];
  yakin(p[0].y, 0, "sin(0)=0", 1e-9);
  const tepe = p.reduce((m, q) => (q.y > m.y ? q : m), p[0]);
  yakin(tepe.y, 2, "genlik 2", 1e-6); yakin(tepe.x, 1, "ilk tepe T/4'te", 0.05);
  const d = grafikDuzeni(sin);
  dogrula(d.xMin === 0 && d.xMax === 8, `sinüs x aralığı 2 periyot (${d.xMin}..${d.xMax})`);
  dogrula(d.yMin < -2 && d.yMax > 2 && d.yMin === -d.yMax, `sinüs y simetrik (${d.yMin}..${d.yMax})`);
  const cos = egriParcalari({ tur: "sinus", fonksiyon: "cos", genlik: 3, periyot: 2, faz: 0, ofset: 1, baslangic: 0, bitis: 2 })[0];
  yakin(cos[0].y, 4, "cos(0)·3 + 1 = 4", 1e-9);
  const faz = egriParcalari({ tur: "sinus", fonksiyon: "sin", genlik: 1, periyot: 4, faz: 90, ofset: 0, baslangic: 0, bitis: 4 })[0];
  yakin(faz[0].y, 1, "faz 90° sin → 1", 1e-9);
  dogrula(guzelAdim(10) === 2 && guzelAdim(6) === 1 && guzelAdim(100) === 20 && guzelAdim(0.6) === 0.1, "güzel adım");
  dogrula(eksenSayilari(0, 1, 0.1).length === 11 && eksenSayilari(-1, 1, 0.5).includes(0), "eksen sayıları kayan nokta hatasız");
  const negatif = grafikDuzeni({ egriler: [{ tur: "hareket", buyukluk: "hiz", x0: 0, v0: 20, evreler: [{ sure: 8, ivme: -5 }] }], xEtiket: "t", yEtiket: "v" });
  dogrula(negatif.yMin < -20 && negatif.yMax >= 20, "negatif hızda eksen aşağı uzar");
  const elle = grafikDuzeni({ ...sin, xMin: 0, xMax: 12, yMin: -5, yMax: 5, yAdim: 5 });
  dogrula(elle.xMax === 12 && elle.yMin === -5 && elle.yAdim === 5, "elle verilen aralık kullanılır");
});

test("Grafik: sayı yazımı (virgül, eksi, π) ve nokta yazısı", () => {
  dogrula(sayiYaz(2.5) === "2,5" && sayiYaz(-3) === "\u22123" && sayiYaz(0) === "0" && sayiYaz(1e-12) === "0", "sayı yazımı");
  dogrula(piYaz(Math.PI) === "π" && piYaz(Math.PI / 2) === "π/2" && piYaz(3 * Math.PI / 2) === "3π/2" && piYaz(2 * Math.PI) === "2π" && piYaz(-Math.PI) === "\u2212π", "π yazımı");
  const n = noktalariOku("0,0; 4,20; 8,20; 10,0")!;
  dogrula(n.length === 4 && n[1].x === 4 && n[1].y === 20, "virgüllü nokta yazısı");
  dogrula(noktalariOku("0 0; 2,5 10; -1 3.5")!.map((q) => q.y).join() === "0,10,3.5", "boşluk/ondalık virgül");
  dogrula(noktalariOku("0:0; 1:-2")![1].y === -2, "iki nokta üst üste");
  dogrula(noktalariOku("0,0") === null && noktalariOku("0,0; a,b") === null && noktalariOku("0,0; 1,") === null, "bozuk yazı reddedilir");
  dogrula(noktalariOku(noktalariYaz(n))!.length === 4, "yaz → oku gidiş dönüş");
});

test("Grafik: şekil çizilir, sınırı etiket payını içerir, doğrulama bozuk veriyi reddeder", () => {
  for (const sb of GRAFIK_SABLONLARI) {
    const g: Sekil = { id: "g", tur: "fizik", nesne: "grafik", kalinlik: 2, x: 100, y: 80, w: 300, h: 180, grafik: sb.olustur(), etiket: "Şekil I" };
    sekilleriCiz(sahteCtx().ctx, [g]);
    dogrula(sekilGecerliMi(g), `şablon geçerli: ${sb.id}`);
  }
  // Verisiz grafik de çökmeden çizilir (eski/elle düzenlenmiş şablon)
  sekilleriCiz(sahteCtx().ctx, [{ id: "g", tur: "fizik", nesne: "grafik", kalinlik: 2, x: 10, y: 10, w: 200, h: 120 } as Sekil]);
  const g: Sekil = { id: "g", tur: "fizik", nesne: "grafik", kalinlik: 2, x: 100, y: 80, w: 300, h: 180, grafik: GRAFIK_SABLONLARI[2].olustur() };
  const sinir = cizimIcerikSiniri(sahteCtx().ctx, [g], 0);
  dogrula(sinir.x <= 100 - 40 && sinir.y <= 80 - 28 && sinir.x + sinir.w >= 400 + 70, `içerik sınırı eksen yazılarını kapsamalı (${JSON.stringify(sinir)})`);
  const ctx = { font: "", measureText: () => ({ width: 8 }) } as unknown as CanvasRenderingContext2D;
  dogrula(sekilVuruldu(ctx, g, { x: 250, y: 170 }, 100, [g]), "grafiğin içine tıklayınca seçilir");
  const bozuk = (grafik: unknown) => ({ ...(g as object), grafik }) as unknown;
  dogrula(!sekilGecerliMi(bozuk({ egriler: "x" })), "egriler dizi olmalı");
  dogrula(!sekilGecerliMi(bozuk({ egriler: [{ tur: "noktalar", noktalar: [{ x: "a", y: 1 }] }], xEtiket: "", yEtiket: "" })), "sayı olmayan nokta");
  dogrula(!sekilGecerliMi(bozuk({ egriler: [{ tur: "bilinmeyen" }], xEtiket: "", yEtiket: "" })), "bilinmeyen eğri türü");
  dogrula(!grafikVerisiGecerliMi({ egriler: [{ tur: "sinus", fonksiyon: "tan", genlik: 1, periyot: 1, faz: 0, ofset: 0, baslangic: 0, bitis: 1 }], xEtiket: "", yEtiket: "" }), "sin/cos dışı fonksiyon");
  dogrula(!grafikVerisiGecerliMi({ egriler: [{ tur: "noktalar", noktalar: [], renk: "mavi" }], xEtiket: "", yEtiket: "" }), "bozuk renk");
});

test("Grafik: v–t noktalarından evre ve x–t (ders kitabı sorusu: 5→15→15→9)", () => {
  const n = noktalariOku("0,5; 5,15; 9,15; 11,9")!;
  const e = noktalardanEvreler(n)!;
  dogrula(e.v0 === 5 && e.evreler.length === 3, "3 evre, v0=5");
  dogrula(e.evreler[0].ivme === 2 && e.evreler[1].ivme === 0 && e.evreler[2].ivme === -3, `ivmeler 2, 0, −3 (${JSON.stringify(e.evreler)})`);
  const o = hareketOzeti(0, e.v0, e.evreler);
  yakin(o.sonKonum, 134, "toplam yer değiştirme 134 m");
  const x = hareketParcalari("konum", 0, e.v0, e.evreler)[0];
  yakin(x.find((p) => p.x === 5)!.y, 50, "t=5'te 50 m"); yakin(x.find((p) => p.x === 9)!.y, 110, "t=9'da 110 m");
  dogrula(noktalardanEvreler(noktalariOku("1,0; 2,5")!) === null && noktalardanEvreler(noktalariOku("0,0; 0,5")!) === null, "t=0'dan başlamayan/artmayan reddedilir");
  const g = noktalardanGrafik(n, "konum");
  dogrula(g.yEtiket === "x (m)" && grafikVerisiGecerliMi(g) && g.sayilar === "kilavuz", "hızlı grafik geçerli");
  // Eksen altı: 2a sorusu (−2, −4, −8 değerleri görünür aralıkta)
  const d = grafikDuzeni(noktalardanGrafik(noktalariOku("0,0; 6,12; 10,12; 14,0; 18,-8; 20,-2")!, "hiz"));
  dogrula(d.yMin <= -8 && d.yMax >= 12 && d.xMax >= 20, `2a aralığı (${JSON.stringify(d)})`);
});

test("matematik: ifade çözücü", () => {
  const f = (m: string, x: number) => { const d = derle(m); dogrula(d.ok, `${m} derlenmeli`); return d.ok ? d.f({ x }) : NaN; };
  yakin(f("2x+1", 3), 7, "2x+1"); yakin(f("x^2-4", 3), 5, "x^2-4"); yakin(f("-x^2", 3), -9, "−x^2 = −(x^2)");
  yakin(f("3(x+1)", 2), 9, "örtük çarpma"); yakin(f("|x-2|", -1), 3, "mutlak değer"); yakin(f("sqrt(x+3)", 6), 3, "kök");
  yakin(f("sin(x)^2", Math.PI / 2), 1, "sin(x)^2"); yakin(f("2^x", 3), 8, "2^x"); yakin(f("2^-x", 1), 0.5, "2^-x");
  yakin(f("ln(x)/ln(2)", 8), 3, "log2", 1e-9); yakin(f("x²", 4), 16, "x²"); yakin(f("2,5x", 2), 5, "virgül ondalık");
  dogrula(!derle("x+").ok && !derle("(x").ok && !derle("foo(x)").ok && !derle("").ok, "hatalı ifadeler reddedilir");
  dogrula(!derle("process.exit()").ok && !derle("constructor").ok, "kod çalıştırılmaz");
  const y = fonksiyonOku("y = x^2 - 4"); dogrula("f" in y && y.tur === "y" && y.f(3) === 5, "y=… okunur");
  const d = fonksiyonOku("x = 3"); dogrula("tur" in d && d.tur === "dikey" && d.x === 3, "dikey doğru");
  const e = esitsizlikOku("y >= 2x+1"); dogrula("f" in e && e.sinir === "dolu" && e.yon === 1 && e.f(0, 2) > 0 && e.f(0, 0) < 0, "y>=2x+1");
  const k = esitsizlikOku("x+y<4"); dogrula("f" in k && k.sinir === "kesik" && k.yon === -1, "x+y<4 kesikli");
  dogrula("hata" in esitsizlikOku("y = 3"), "işaretsiz eşitsizlik hata");
});

test("matematik: grafik şablonları ve hızlı yazım", () => {
  for (const sb of MAT_GRAFIK_SABLONLARI) {
    const v = sb.olustur();
    dogrula(grafikVerisiGecerliMi(v), `${sb.id} geçerli`);
    const { ctx, cagrilar } = sahteCtx();
    fizikCiz(ctx, { id: "g", tur: "fizik", nesne: "grafik", kalinlik: 2, x: 20, y: 20, w: 300, h: 190, grafik: v });
    dogrula(cagrilar.length > 20, `${sb.id} çizildi`);
    const d = grafikDuzeni(v);
    dogrula(Number.isFinite(d.xMin) && Number.isFinite(d.xMax) && Number.isFinite(d.yMin) && Number.isFinite(d.yMax) && d.xMax > d.xMin && d.yMax > d.yMin, `${sb.id} aralığı sonlu`);
  }
  const h = hizliMatematik("y = x^2 - 4; y > x + 1; x = 3");
  dogrula("veri" in h && h.veri.egriler.length === 3 && h.veri.egriler[1].tur === "bolge" && h.veri.egriler[0].tur === "fonksiyon", "hızlı: fonksiyon + bölge");
  dogrula("hata" in hizliMatematik("y = x^") && "hata" in hizliMatematik(""), "hızlı: hata");
  const d = grafikDuzeni((hizliMatematik("1/x") as { veri: ReturnType<typeof varsayilanGrafikYok> }).veri);
  dogrula(Math.abs(d.yMax) < 100 && Math.abs(d.yMin) < 100, `1/x aralığı makul (${d.yMin}, ${d.yMax})`);
  const an = adliNoktalariOku("A(2,3); B(-1,2.5); C:4,5; 1,1");
  dogrula(an?.length === 4 && an[0].ad === "A" && an[1].y === 2.5 && an[2].ad === "C" && an[3].ad === undefined, `adlı noktalar ${JSON.stringify(an)}`);
  dogrula(adliNoktalariOku("A(2,3); xyz") === null, "bozuk nokta reddedilir");
  dogrula(JSON.stringify(adliNoktalariOku(adliNoktalariYaz(an!))) === JSON.stringify(an), "adlı noktalar gidiş-dönüş");
  const r = dogrusalRegresyon([{ x: 1, y: 2 }, { x: 2, y: 4 }, { x: 3, y: 6 }])!;
  yakin(r.a, 2, "regresyon eğimi", 1e-9); yakin(r.b, 0, "regresyon kesişimi", 1e-9); yakin(r.r, 1, "r = 1", 1e-9);
  dogrula(dogrusalRegresyon([{ x: 1, y: 1 }, { x: 1, y: 2 }]) === null, "aynı x → regresyon yok");
});
test("matematik: denklem, alan, kesişim, teğet", () => {
  const c = hizliMatematik("x^2+y^2=25");
  dogrula("veri" in c && c.veri.egriler[0].tur === "denklem", "çember denklem olarak okunur");
  const dc = grafikDuzeni((c as { veri: ReturnType<typeof varsayilanGrafikYok> }).veri);
  dogrula(dc.xMin <= -5 && dc.xMax >= 5 && dc.yMin <= -5 && dc.yMax >= 5, `çember penceresi sığar (${dc.xMin}..${dc.xMax}, ${dc.yMin}..${dc.yMax})`);
  dogrula(dc.xMax < 12 && dc.yMax < 12, "çember penceresi şişmez");
  const dh = grafikDuzeni((hizliMatematik("x^2/9-y^2/4=1") as { veri: ReturnType<typeof varsayilanGrafikYok> }).veri);
  dogrula(Number.isFinite(dh.xMax) && dh.xMax <= 12, "hiperbol (sınırsız) penceresi makul");
  const k = hizliMatematik("y=2x; x=3; y=x^2; x=y^2");
  dogrula("veri" in k && k.veri.egriler.map((e) => e.tur).join() === "fonksiyon,fonksiyon,fonksiyon,denklem", "y=/x=sayı fonksiyon, x=y² denklem");
  dogrula("hata" in hizliMatematik("x^2+y^2=") && "hata" in hizliMatematik("a=b=c"), "bozuk denklem hata verir");
  const al = hizliMatematik("alan(x, x^2, 0, 1); alan(x^2, 0, 2); teget(x^2, 1); kesisim");
  dogrula("veri" in al && al.veri.egriler.length === 3 && al.veri.kesisim === true, "alan/teget/kesisim komutları");
  if ("veri" in al) {
    const [a1, a2, t] = al.veri.egriler;
    dogrula(a1.tur === "arasi" && a1.ifade2 === "x^2" && a1.bitis === 1, "alan(f,g,a,b)");
    dogrula(a2.tur === "arasi" && a2.ifade2 === "" && a2.baslangic === 0 && a2.bitis === 2, "alan(f,a,b) → x ekseni");
    dogrula(t.tur === "teget" && t.x0 === 1, "teget(f,x0)");
  }
  dogrula("hata" in hizliMatematik("alan(sin") && "hata" in hizliMatematik("teget(x^2)"), "bozuk alan/teget hata");
  const te = tegetDogrusu({ tur: "teget", ifade: "x^2", x0: 1 })!;
  yakin(te.m, 2, "teğet eğimi", 1e-4); yakin(te.c, -1, "teğet kesişimi", 1e-4); yakin(te.y0, 1, "değme noktası", 1e-9);
  const t3 = tegetDogrusu({ tur: "teget", ifade: "x^3-3x", x0: 0 })!;
  yakin(t3.m, -3, "x³−3x türevi 0'da", 1e-4);
  const veri = { egriler: [{ tur: "fonksiyon" as const, ifade: "x^2-4" }, { tur: "fonksiyon" as const, ifade: "x" }, { tur: "fonksiyon" as const, ifade: "x=1" }], xEtiket: "x", yEtiket: "y" };
  const nk = kesisimNoktalari(veri, { xMin: -5, xMax: 5 });
  const var_ = (x: number, y: number) => nk.some((p) => Math.abs(p.x - x) < 1e-3 && Math.abs(p.y - y) < 1e-3);
  dogrula(var_(-2, 0) && var_(2, 0), "x²−4 kökleri");
  dogrula(var_(0, 0), "y=x kökü (0,0)");
  const kes = (1 + Math.sqrt(17)) / 2;
  dogrula(var_(kes, kes) && var_((1 - Math.sqrt(17)) / 2, (1 - Math.sqrt(17)) / 2), "x²−4=x kesişimleri");
  dogrula(var_(1, -3) && var_(1, 1), "dikey doğru ile kesişim");
  const asim = kesisimNoktalari({ egriler: [{ tur: "fonksiyon", ifade: "1/x" }, { tur: "fonksiyon", ifade: "0" }], xEtiket: "x", yEtiket: "y" }, { xMin: -5, xMax: 5 });
  dogrula(asim.length === 0, `1/x asimptotu kök sayılmaz (${JSON.stringify(asim)})`);
});
// (varsayılan tip yardımcısı: yalnız tür çıkarımı için)
declare function varsayilanGrafikYok(): import("../src/modules/sinav-olusturucu/cizim/tipler").GrafikVerisi;

test("istatistik: hesaplar", () => {
  const b = besSayiOzeti([12, 15, 17, 18, 20, 22, 25, 26, 30, 41])!;
  yakin(b.min, 12, "min"); yakin(b.q1, 17, "Q1"); yakin(b.med, 21, "ortanca"); yakin(b.q3, 26, "Q3"); yakin(b.max, 41, "maks");
  dogrula(besSayiOzeti([1, 2, 3, 4, 5, 6, 7, 8, 9, 100])!.aykiri.includes(100), "aykırı değer");
  const o = ozetSayilar([2, 4, 4, 4, 5, 5, 7, 9])!;
  // Örneklem standart sapması (n − 1): Σ(x − 5)² = 32 → √(32/7) ≈ 2,138 (anakütle tanımı 2 verirdi).
  yakin(o.ortalama, 5, "ortalama"); yakin(o.sapma, Math.sqrt(32 / 7), "standart sapma (n−1)", 1e-9); yakin(o.medyan, 4.5, "medyan"); dogrula(o.tepe.join() === "4", "tepe değer");
  yakin(ozetSayilar([2, 4, 6])!.sapma, 2, "standart sapma: √((4+0+4)/2) = 2", 1e-9);
  dogrula(ozetSayilar([7])!.sapma === 0, "tek veride standart sapma 0 (n−1 = 0'a bölme yok)");
  dogrula(ozetSayilar([10, 10, 20, 20, 30, 30])!.tepe.length === 0, "tüm değerler eşit sıklıkta → tepe değer yok");
  dogrula(ozetSayilar([1, 2, 3])!.tepe.length === 0, "hiç tekrar yok → tepe değer yok");
  dogrula(ozetSayilar([1, 1, 2, 2, 3])!.tepe.join() === "1,2", "iki tepe değer");
  dogrula(ozetSayilar([5, 5, 5])!.tepe.join() === "5", "tek farklı değer → tepe değer o değerdir");
  dogrula(ozetSayilar([]) === null, "boş veri");
  const s = siniflandir([3, 7, 10, 12, 18, 20, 29, 30], 10, 0);
  dogrula(s.length === 4 && s.map((x) => x.v[0]).join() === "2,3,2,1", `[a,b) sınıfları: 30 → 30-40 `+`sınıflar ${JSON.stringify(s.map((x) => x.v[0]))}`);
  const g = govdeYaprak([12, 15, 21, 23, 23, 38]);
  dogrula(g.satirlar.length === 3 && g.satirlar[0].yapraklar.join() === "2,5" && g.satirlar[1].yapraklar.join() === "1,3,3" && g.satirlar[2].govde === 3, "gövde–yaprak");
  const t = tabloOku("\tKız\tErkek\n9-A\t14\t11\n9-B\t10,5\t15");
  dogrula(t?.seriler.join() === "Kız,Erkek" && t.satirlar[1].v[0] === 10.5 && t.satirlar[0].ad === "9-A", "tablo (Excel yapıştırma)");
  dogrula(tabloOku("tek") === null, "tek sütun tablo reddedilir");
});

test("istatistik: şablonlar geçerli ve çizilir", () => {
  dogrula(ISTATISTIK_SABLONLARI.length >= 8, "şablon sayısı");
  for (const sb of ISTATISTIK_SABLONLARI) {
    const v = sb.olustur();
    dogrula(istatistikVerisiGecerliMi(v), `${sb.id} geçerli`);
    const { ctx, cagrilar } = sahteCtx();
    istatistikCiz(ctx, { id: "i", tur: "fizik", nesne: "istatistik", kalinlik: 2, x: 20, y: 20, w: 320, h: 200, istatistik: v });
    dogrula(cagrilar.length > 15, `${sb.id} çizildi`);
    const sekil: Sekil = { id: "i", tur: "fizik", nesne: "istatistik", kalinlik: 2, x: 20, y: 20, w: 320, h: 200, istatistik: v };
    dogrula(sekilGecerliMi(sekil), `${sb.id} sekilGecerliMi`);
  }
  dogrula(!istatistikVerisiGecerliMi({ tur: "yok", seriler: [], satirlar: [] }) && !istatistikVerisiGecerliMi({ tur: "sutun", seriler: [], satirlar: [{ ad: "a", v: [NaN] }] }), "geçersiz istatistik reddedilir");
  // Uç durumlar: boş satır, negatif değer, hepsi sıfır — çökmemeli.
  for (const satirlar of [[], [{ ad: "a", v: [0] }, { ad: "b", v: [0] }], [{ ad: "a", v: [-5] }, { ad: "b", v: [8] }]]) {
    for (const tur of ["sutun", "cubuk", "daire", "cizgi", "histogram"] as const) {
      const { ctx } = sahteCtx();
      istatistikCiz(ctx, { id: "i", tur: "fizik", nesne: "istatistik", kalinlik: 2, x: 0, y: 0, w: 300, h: 190, istatistik: { tur, seriler: ["s"], satirlar, yazi: "yuzde" } });
    }
  }
  for (const tur of ["kutu", "govde"] as const) {
    const { ctx } = sahteCtx();
    istatistikCiz(ctx, { id: "i", tur: "fizik", nesne: "istatistik", kalinlik: 2, x: 0, y: 0, w: 300, h: 190, istatistik: { tur, seriler: ["v"], satirlar: [{ ad: "a", v: [] }, { ad: "b", v: [5] }] } });
  }
});

test("şema: Venn, ağaç, sayı doğrusu", () => {
  dogrula(vennBolgeAdlari(2, ["A", "B"]).length === 4 && vennBolgeAdlari(3, ["A", "B", "C"]).length === 8, "bölge adları");
  const k = { x: 0, y: 0, w: 300, h: 200 };
  const d2 = vennDaireleri(2, k);
  dogrula(d2.length === 2 && vennBolgesi(2, d2, d2[0].x - d2[0].r * 0.8, d2[0].y) === 0 && vennBolgesi(2, d2, (d2[0].x + d2[1].x) / 2, d2[0].y) === 1 && vennBolgesi(2, d2, d2[1].x + d2[1].r * 0.8, d2[1].y) === 2 && vennBolgesi(2, d2, 1, 1) === 3, "2 küme bölge sınıflama");
  const d3 = vennDaireleri(3, k);
  const merkez = { x: (d3[0].x + d3[1].x + d3[2].x) / 3, y: (d3[0].y + d3[1].y + d3[2].y) / 3 };
  dogrula(d3.length === 3 && vennBolgesi(3, d3, merkez.x, merkez.y) === 6, "3 küme ortak bölge");
  const dallar = agacOku("K: 1/3\n- K: 1/2\n- M: 1/2\nM: 2/3\n- K: 1/2\n- M: 1/2");
  dogrula(dallar?.length === 2 && dallar[0].alt?.length === 2 && agacYaprakSayisi(dallar) === 4, "ağaç yazımı");
  dogrula(JSON.stringify(agacOku(agacYaz(dallar!))) === JSON.stringify(dallar), "ağaç gidiş-dönüş");
  dogrula(agacOku("- K: 1/2") === null && agacOku("") === null && agacOku("bozuk satır") === null, "bozuk ağaç reddedilir");
  const ar = araliklariOku("(-2, 3]; [5, ∞)");
  dogrula(ar?.length === 2 && ar[0].bas === -2 && !ar[0].basDahil && ar[0].sonDahil && ar[1].son === null && !ar[1].sonDahil && ar[1].basDahil, `aralıklar ${JSON.stringify(ar)}`);
  dogrula(araliklariOku("(5, 2)") === null && araliklariOku("abc") === null, "bozuk aralık reddedilir");
  dogrula(JSON.stringify(araliklariOku(araliklariYaz(ar!))) === JSON.stringify(ar), "aralık gidiş-dönüş");
  const nk = sayiNoktalariniOku("1:A; 4:B:bos; -2");
  dogrula(nk?.length === 3 && nk[1].dolu === false && nk[2].x === -2 && sayiNoktalariniOku("x") === null, "sayı doğrusu noktaları");
  for (const sb of SEMA_SABLONLARI) {
    const v = sb.olustur();
    dogrula(semaVerisiGecerliMi(v), `${sb.id} geçerli`);
    const { ctx, cagrilar } = sahteCtx();
    semaCiz(ctx, { id: "s", tur: "fizik", nesne: "sema", kalinlik: 2, x: 20, y: 20, w: 300, h: 200, sema: v });
    dogrula(cagrilar.length > 8, `${sb.id} çizildi`);
  }
  dogrula(!semaVerisiGecerliMi({ tur: "venn", kume: 5, adlar: [], bolgeler: [], evrensel: true }) && !semaVerisiGecerliMi({ tur: "sayiDogrusu", min: 5, max: 1, adim: 1, araliklar: [], noktalar: [] }), "geçersiz şema reddedilir");
});

test("matematik: yeni nesneler içerik sınırına ve vuruşa dahil", () => {
  const ist: Sekil = { id: "i", tur: "fizik", nesne: "istatistik", kalinlik: 2, x: 100, y: 100, w: 320, h: 200, istatistik: ISTATISTIK_SABLONLARI[0].olustur() };
  const sin = cizimIcerikSiniri(sahteCtx().ctx, [ist]);
  dogrula(sin && sin.x < 100 - 20 && sin.y < 100 - 20 && sin.x + sin.w > 100 + 320 + 20, `istatistik sınırı yazıları kapsar (${JSON.stringify(sin)})`);
  dogrula(sekilVuruldu(sahteCtx().ctx, ist, { x: 200, y: 200 }), "istatistik vurulur");
});

test("kimya: elektron dizilimi (kabuklar, iyonlar, istisnalar)", () => {
  const d = (z: number, y = 0) => kabukDizilimi(z, y).join(",");
  dogrula(d(1) === "1" && d(2) === "2" && d(8) === "2,6" && d(11) === "2,8,1" && d(17) === "2,8,7" && d(18) === "2,8,8" && d(19) === "2,8,8,1" && d(20) === "2,8,8,2", "ilk 20 element");
  dogrula(d(11, 1) === "2,8" && d(17, -1) === "2,8,8" && d(8, -2) === "2,8" && d(12, 2) === "2,8" && d(13, 3) === "2,8", "iyonlar (Na⁺, Cl⁻, O²⁻, Mg²⁺, Al³⁺)");
  dogrula(d(26) === "2,8,14,2" && d(26, 3) === "2,8,13" && d(24) === "2,8,13,1" && d(29) === "2,8,18,1" && d(21) === "2,8,9,2" && d(36) === "2,8,18,8", "geçiş elementleri ve istisnalar");
  for (let z = 1; z <= 118; z += 1) dogrula(kabukDizilimi(z).reduce((a, b) => a + b, 0) === z, `Z=${z} elektron toplamı`);
  // Küresel simetri istisnaları: Mo, Ag, Au (ve iyonlarında dış kabuktan eksilme).
  dogrula(d(42) === "2,8,18,13,1" && d(47) === "2,8,18,18,1" && d(79) === "2,8,18,32,18,1", `Mo/Ag/Au istisnaları: ${d(42)} | ${d(47)} | ${d(79)}`);
  dogrula(d(47, 1) === "2,8,18,18" && d(79, 1) === "2,8,18,32,18", `Ag⁺ / Au⁺: ${d(47, 1)} | ${d(79, 1)}`);
});

test("kimya: Bohr çekirdeğinde nötron sayısı en bol kararlı izotoptan", () => {
  const A = enBolKutleNumarasi;
  // Yuvarlanmış ortalama kütlenin YANLIŞ izotop verdiği elementler.
  dogrula(A(29) === 63 && A(35) === 79 && A(47) === 107 && A(51) === 121 && A(77) === 193 && A(28) === 58 && A(30) === 64 && A(82) === 208,
    `Cu-63, Br-79, Ag-107, Sb-121, Ir-193, Ni-58, Zn-64, Pb-208: ${[29, 35, 47, 51, 77, 28, 30, 82].map(A).join(",")}`);
  // Yuvarlamanın doğru olduğu elementler değişmemeli.
  dogrula(A(1) === 1 && A(5) === 11 && A(17) === 35 && A(26) === 56 && A(18) === 40 && A(79) === 197 && A(92) === 238 && A(43) === 98,
    `H-1, B-11, Cl-35, Fe-56, Ar-40, Au-197, U-238, Tc-98: ${[1, 5, 17, 26, 18, 79, 92, 43].map(A).join(",")}`);
  for (let z = 1; z <= 118; z += 1) {
    const fark = A(z) - Math.round(ELEMENT_KUTLELERI[z - 1]);
    dogrula(A(z) >= z && Math.abs(fark) <= 3, `Z=${z}: kütle numarası ${A(z)} ortalama kütleden çok uzak`);
  }
  // Çizimde: Cu çekirdeği "29p 34n" (35n değil), Br "35p 44n".
  const yazilar = (z: number) => {
    const metinler: string[] = [];
    const ozellikler: Record<string, unknown> = { font: "", lineWidth: 1 };
    const ctx = new Proxy(ozellikler, {
      get(h, ad: string) {
        if (ad === "measureText") return (m: string) => ({ width: [...m].length * 10 });
        if (ad === "fillText") return (m: string) => { metinler.push(m); };
        if (ad in h) return h[ad];
        return () => undefined;
      },
      set(h, ad: string, deger) { h[ad] = deger; return true; },
    }) as unknown as CanvasRenderingContext2D;
    const v = { tur: "atom", z, yuk: 0, cekirdek: "pn", kabukAdi: false } as const;
    kimyaCiz(ctx, { id: "a", tur: "fizik", nesne: "kimya", kalinlik: 2, x: 0, y: 0, w: 200, h: 200, kimya: v } as Extract<Sekil, { tur: "fizik" }>);
    return metinler.join(" ");
  };
  dogrula(yazilar(29).includes("34") && !yazilar(29).includes("35"), `Cu çekirdeği: ${yazilar(29)}`);
  dogrula(yazilar(35).includes("44") && !yazilar(35).includes("45"), `Br çekirdeği: ${yazilar(35)}`);
});

test("kimya: periyodik tablo konumları ve element verisi", () => {
  dogrula(ELEMENT_SEMBOLLERI.length === 118 && ELEMENT_KUTLELERI.length === 118, "118 simge ve kütle");
  const k = (z: number) => `${elementKonumu(z).satir},${elementKonumu(z).sutun}`;
  dogrula(k(1) === "0,0" && k(2) === "0,17" && k(5) === "1,12" && k(13) === "2,12" && k(19) === "3,0" && k(30) === "3,11" && k(31) === "3,12" && k(36) === "3,17", "1–4. periyot");
  dogrula(k(57) === "5,2" && k(72) === "5,3" && k(86) === "5,17" && k(89) === "6,2" && k(118) === "6,17" && k(104) === "6,3", "6–7. periyot");
  dogrula(k(58) === "8,3" && k(71) === "8,16" && k(90) === "9,3" && k(103) === "9,16", "lantanit/aktinit satırları");
  const hepsi = new Set(Array.from({ length: 118 }, (_, i) => k(i + 1)));
  dogrula(hepsi.size === 118, "iki element aynı hücrede olamaz");
  dogrula(ELEMENT_SEMBOLLERI[0] === "H" && ELEMENT_SEMBOLLERI[25] === "Fe" && ELEMENT_SEMBOLLERI[78] === "Au" && ELEMENT_SEMBOLLERI[117] === "Og", "simgeler");
  yakin(ELEMENT_KUTLELERI[16], 35.45, "Cl kütlesi", 0.01); yakin(ELEMENT_KUTLELERI[7], 16, "O kütlesi", 0.01); yakin(ELEMENT_KUTLELERI[25], 55.845, "Fe kütlesi", 0.01);
  dogrula(Array.from({ length: 118 }, (_, i) => i + 1).filter((z) => periyodikGoruluyor(z, "ilk20")).length === 20, "ilk 20 element");
  dogrula(Array.from({ length: 118 }, (_, i) => i + 1).filter((z) => periyodikGoruluyor(z, "ilk3")).length === 18, "ilk 3 periyot = 18 element");
  const l = elementListesiOku("H, o, Na, 17, 3-5");
  dogrula(l?.join() === "1,3,4,5,8,11,17", `liste ${l}`);
  dogrula(elementListesiOku("Xx") === null && elementListesiOku("119") === null && elementListesiOku("5-2") === null, "bozuk liste reddedilir");
});

test("kimya: moleküller tutarlı (oktet) ve tüm şekiller çizilir", () => {
  for (const m of MOLEKULLER) {
    dogrula(m.baglar.every((b) => b.a < m.atomlar.length && b.b < m.atomlar.length && b.a !== b.b), `${m.id} bağ indisleri`);
    // İyonik, iskelet (organik) ve genişlemiş oktetli (SO₂, SF₆, PCl₅) yapılar oktet denetiminden muaf
    if (m.id === "nacl" || m.grup === "organik" || ["so2", "sf6", "pcl5"].includes(m.id)) continue;
    m.atomlar.forEach((a, i) => {
      const bag = m.baglar.filter((b) => b.a === i || b.b === i).reduce((t, b) => t + b.kat, 0);
      const e = 2 * (a.lp ?? 0) + 2 * bag;
      const beklenen = a.s === "H" ? 2 : a.s === "B" ? 6 : 8;
      dogrula(e === beklenen, `${m.id}: ${a.s} elektron sayısı ${e} (beklenen ${beklenen})`);
    });
  }
  for (const n of KIMYA_LAB_NESNELERI) {
    for (const dolgu of [undefined, "#bfdbfe"]) {
      const { ctx, cagrilar } = sahteCtx();
      const t = FIZIK_TANIMLARI[n];
      fizikCiz(ctx, { id: "l", tur: "fizik", nesne: n, kalinlik: 2, x: 10, y: 10, w: t.w, h: t.h, ...(dolgu ? { dolgu, seviye: 0.6 } : {}) });
      dogrula(cagrilar.length > 8, `${n} çizildi`);
    }
  }
  const sablonlar = [...KIMYA_ATOM_SABLONLARI, ...KIMYA_MOLEKUL_SABLONLARI, ...KIMYA_PERIYODIK_SABLONLARI];
  for (const sb of sablonlar) {
    const v = sb.olustur();
    dogrula(kimyaVerisiGecerliMi(v), `${sb.id} geçerli`);
    const b = kimyaBoyutu(v);
    const sekil: Sekil = { id: "k", tur: "fizik", nesne: "kimya", kalinlik: 2, x: 20, y: 20, ...b, kimya: v };
    dogrula(sekilGecerliMi(sekil), `${sb.id} sekilGecerliMi`);
    const { ctx, cagrilar } = sahteCtx();
    kimyaCiz(ctx, sekil as Extract<Sekil, { tur: "fizik" }>);
    dogrula(cagrilar.length > 5, `${sb.id} çizildi`);
  }
  for (const sb of KIMYA_GRAFIK_SABLONLARI) {
    const v = sb.olustur();
    dogrula(grafikVerisiGecerliMi(v), `${sb.id} geçerli`);
    const { ctx, cagrilar } = sahteCtx();
    fizikCiz(ctx, { id: "g", tur: "fizik", nesne: "grafik", kalinlik: 2, x: 20, y: 20, w: 300, h: 190, grafik: v });
    dogrula(cagrilar.length > 20, `${sb.id} çizildi`);
  }
  dogrula(!kimyaVerisiGecerliMi({ tur: "atom", z: 0, yuk: 0, cekirdek: "yuk", kabukAdi: false }) && !kimyaVerisiGecerliMi({ tur: "molekul", id: "yok", gosterim: "cizgi", kismiYuk: false, geometri: false }) && !kimyaVerisiGecerliMi({ tur: "periyodik", bolge: "tum", goster: "sembol", boyali: [200], soru: [], grupNo: true }), "geçersiz kimya verisi reddedilir");
  dogrula(!sekilGecerliMi({ id: "x", tur: "fizik", nesne: "beher", kalinlik: 2, x: 0, y: 0, w: 90, h: 110, seviye: 2 } as Sekil), "geçersiz sıvı seviyesi reddedilir");
  // Periyodik tablo hücreleri kutuya sığar: tam tablo 18 sütun x 10,5 satır
  const b = kimyaBoyutu(KIMYA_PERIYODIK_SABLONLARI[0].olustur());
  dogrula(b.w === 540 && b.h === 315, `tam tablo ölçüsü ${JSON.stringify(b)}`);
});

test("uç durumlar: ifade çözücü (bilimsel gösterim, derinlik sınırı)", () => {
  const v = (m: string, x = 2) => { const d = derle(m); return d.ok ? d.f({ x }) : NaN; };
  dogrula(v("1e308") === 1e308 && v("2.5e-3") === 0.0025 && v("1E5") === 1e5 && v("2e3") === 2000 && v("2e+3") === 2000, "bilimsel gösterim sayı");
  yakin(v("2e"), 2 * Math.E, "2e = 2·e", 1e-9); yakin(v("e"), Math.E, "e Euler", 1e-9); yakin(v("2*e"), 2 * Math.E, "2*e", 1e-9); yakin(v("xe"), 2 * Math.E, "xe = x·e", 1e-9);
  dogrula(!derle("1e999").ok, "1e999 okunamaz");
  const cok = derle("(".repeat(800) + "x" + ")".repeat(800));
  dogrula(!cok.ok && cok.hata === "İfade çok iç içe", `iç içe parantez: ${JSON.stringify(cok)}`);
  const eksi = derle("-".repeat(1500) + "x");
  dogrula(!eksi.ok && eksi.hata === "İfade çok iç içe", "ardışık eksi");
  dogrula(derle("(".repeat(50) + "x" + ")".repeat(50)).ok, "makul derinlik çalışır");
  dogrula(!derle("(".repeat(2000) + "x" + ")".repeat(2000)).ok && !derle("-".repeat(20000) + "x").ok, "çok büyük girdi çökmeden reddedilir");
});

test("uç durumlar: gövde–yaprak aralığı, histogram sınıfı, tablo", () => {
  const t0 = Date.now();
  const g = govdeYaprak([1e9, 5, 6]);
  dogrula(g.cokGenis && g.satirlar.length === 0 && Date.now() - t0 < 500, "1000000000;5;6 anında reddedilir (sınırsız döngü yok)");
  dogrula(govdeSatirSayisi([[0.5, 1000000]]) === Infinity || govdeSatirSayisi([[0.5, 1000000]]) > 200, "0,5;1000000 sınırı aşar");
  dogrula(govdeYaprak([0.5, 1000000]).cokGenis, "0,5;1000000 çökmez, aşırı geniş");
  dogrula(!govdeYaprak([12, 15, 21, 300]).cokGenis && govdeSatirSayisi([[12, 300]]) === 30, "makul aralık çalışır");
  for (const satirlar of [[{ ad: "", v: [1e9, 5, 6] }], [{ ad: "A", v: [1e9, 5] }, { ad: "B", v: [0.5, 1e6] }]]) {
    const { ctx } = sahteCtx();
    istatistikCiz(ctx, { id: "i", tur: "fizik", nesne: "istatistik", kalinlik: 2, x: 0, y: 0, w: 300, h: 190, istatistik: { tur: "govde", seriler: ["Veri"], satirlar } });
  }
  dogrula(sinifSayisi([0, 1000], 1) > 40 && sinifSayisi([0, 95], 10) === 10, "sınıf sayısı");
  const buyuk = tabloOku(Array.from({ length: 150000 }, (_, i) => `s${i}\t${i}`).join("\n"))!;
  dogrula(buyuk.satirlar.length === 60 && buyuk.fazlaSatir === 150000 - 60, "çok satırlı yapıştırma çökmez, 60 satırla sınırlı");
  dogrula(tabloOku(`${"a".repeat(500)}\t5`)!.satirlar[0].ad.length === 40, "satır adı 40 karaktere kesilir");
  // 1000 satırlı ve 1e-7 değerli tablolar çizilir; küçük değerler "0" olarak yazılmaz
  const satirlar = Array.from({ length: 70 }, (_, i) => ({ ad: `s${i}`, v: [1e-7 * (i + 1)] }));
  for (const tur of ["sutun", "daire"] as const) {
    const { ctx, cagrilar } = sahteCtx();
    istatistikCiz(ctx, { id: "i", tur: "fizik", nesne: "istatistik", kalinlik: 2, x: 0, y: 0, w: 300, h: 190, istatistik: { tur, seriler: ["s"], satirlar, yazi: "deger" } });
    dogrula(cagrilar.length > 0, `${tur} 70 satır çizilir`);
  }
  dogrula(sayiYazDuyarli(1e-7) === "10^-7" && sayiYazDuyarli(2.5e-5) === "2,5×10^-5" && sayiYazDuyarli(0.25) === "0,25" && sayiYazDuyarli(0) === "0", `küçük sayı yazımı ${sayiYazDuyarli(1e-7)}`);
  const uzun = "x".repeat(3000);
  const { ctx } = sahteCtx();
  istatistikCiz(ctx, { id: "i", tur: "fizik", nesne: "istatistik", kalinlik: 2, x: 0, y: 0, w: 300, h: 190, istatistik: { tur: "sutun", seriler: ["s"], satirlar: [{ ad: uzun, v: [3] }], baslik: uzun, xEtiket: uzun, yEtiket: uzun, yazi: "deger" } });
});

test("uç durumlar: olasılık ağacı sınırları ve sayı doğrusu", () => {
  const r = agacOkuAyrinti(`${"K".repeat(41)}: ${"1".repeat(21)}\n- A: 1/2`);
  dogrula("dallar" in r && r.dallar[0].ad.length === 40 && r.dallar[0].olasilik.length === 20 && r.uyari?.includes("40") && r.uyari.includes("20"), "uzun ad/olasılık kesilir + uyarı");
  const d = agacOku(`${"K".repeat(41)}: ${"1".repeat(21)}`)!;
  dogrula(semaVerisiGecerliMi({ tur: "agac", dallar: d }), "kesilen ağaç geçerli kalır (Venn'e dönmez)");
  dogrula(agacOkuAyrinti("a: 1\nb: 1\nc: 1\nd: 1\ne: 1\nf: 1\ng: 1" ).hasOwnProperty("hata"), "7 ana dal nedenle reddedilir");
  dogrula(araliklariOku("(0, 1000000000000000000000]") === null && araliklariOku("[-1000000000, 5]") !== null, "sayı doğrusu aralığı ±1e9 ile sınırlı");
  dogrula(sayiNoktalariniOku("1e21") === null && sayiNoktalariniOku("5") !== null, "nokta ±1e9");
  for (const v of [
    { tur: "sayiDogrusu" as const, min: -5, max: 6, adim: 1, araliklar: [{ bas: 0, son: 1e21, basDahil: false, sonDahil: true }], noktalar: [{ x: 1e12 }] },
    { tur: "sayiDogrusu" as const, min: -1e9, max: 1e9, adim: 1, araliklar: [], noktalar: [] },
  ]) {
    const { ctx, cagrilar } = sahteCtx();
    semaCiz(ctx, { id: "s", tur: "fizik", nesne: "sema", kalinlik: 2, x: 0, y: 0, w: 300, h: 120, sema: v });
    dogrula(cagrilar.length > 5, "uç sayı doğrusu çizilir");
  }
});

test("uç durumlar: hızlı grafik / hareket evresi sınırları", () => {
  const uzunIfade = "y=1" + "0".repeat(300) + "x";
  const h = hizliMatematik(uzunIfade);
  dogrula("hata" in h && h.hata.includes("200"), `uzun ifade açık hata: ${JSON.stringify(h).slice(0, 80)}`);
  const b = hizliMatematik("y=x^2;x=1e300");
  dogrula("hata" in b && b.hata.includes("çizilemeyecek kadar"), `büyük değer uyarısı: ${JSON.stringify(b).slice(0, 80)}`);
  dogrula("veri" in hizliMatematik("y=x^2") && "veri" in hizliMatematik("y=1e5x"), "makul ifadeler çizilir");
  const hareket = (sure: number, ivme: number) => ({ egriler: [{ tur: "hareket" as const, buyukluk: "hiz" as const, x0: 0, v0: 0, evreler: [{ sure, ivme }] }], xEtiket: "t", yEtiket: "v" });
  dogrula(!grafikVerisiGecerliMi(hareket(1e308, 1)) && !grafikVerisiGecerliMi(hareket(1, 1e308)) && !grafikVerisiGecerliMi(hareket(-1, 1)) && !grafikVerisiGecerliMi(hareket(Infinity, 1)) && grafikVerisiGecerliMi(hareket(1e6, -1e6)), "hareket evresi sınırı");
  const n = noktalariOkuAyrinti("0,0; 1,1; abc; 3,3");
  dogrula("hata" in n && n.hata.includes("3. nokta"), `okunamayan nokta nedeni: ${JSON.stringify(n)}`);
  const cok = noktalariOkuAyrinti(Array.from({ length: 81 }, (_, i) => `${i},${i}`).join(";"));
  dogrula("hata" in cok && cok.hata === "En çok 80 nokta", "81 nokta nedeni");
  dogrula(ayniXUyarisi([{ x: 0, y: 0 }, { x: 0, y: 5 }]) !== null && ayniXUyarisi([{ x: 0, y: 0 }, { x: 1, y: 5 }]) === null, "aynı x uyarısı");
});

test("parabol şablonu: kökler ve tepe fonksiyondan otomatik (sabit A, B, T noktası yok)", () => {
  const sb = MAT_GRAFIK_SABLONLARI.find((x) => x.id === "m-parabol")!;
  const v = sb.olustur();
  dogrula(v.kesisim === true && v.tepe === true && !v.egriler.some((e) => e.tur === "isaret"), "sabit isaret noktası yok, kesisim+tepe açık");
  const noktalar = (veri: typeof v) => {
    const d = grafikDuzeni(veri);
    return { kok: kesisimNoktalari(veri, d), tepe: ekstremumNoktalari(veri, d) };
  };
  let r = noktalar(v);
  dogrula(r.kok.length === 2 && r.tepe.length === 1, `x²−4: ${JSON.stringify(r)}`);
  yakin(r.tepe[0].x, 0, "tepe x", 1e-3); yakin(r.tepe[0].y, -4, "tepe y", 1e-3);
  const v2 = { ...v, egriler: [{ ...v.egriler[0], ifade: "x^2-2x-3" } as typeof v.egriler[0]] };
  r = noktalar(v2);
  const xs = r.kok.map((p) => p.x).sort((a, b) => a - b);
  dogrula(xs.length === 2 && Math.abs(xs[0] + 1) < 1e-3 && Math.abs(xs[1] - 3) < 1e-3, `x²−2x−3 kökleri −1 ve 3: ${JSON.stringify(r.kok)}`);
  dogrula(r.tepe.length === 1 && Math.abs(r.tepe[0].x - 1) < 1e-3 && Math.abs(r.tepe[0].y + 4) < 1e-3, `tepe (1; −4): ${JSON.stringify(r.tepe)}`);
  dogrula(grafikVerisiGecerliMi(v2), "tepe alanı geçerli");
  // asimptot / monoton eğri uç nokta sayılmaz; sinüs tepe verir
  const monoton = ekstremumNoktalari({ egriler: [{ tur: "fonksiyon", ifade: "1/x" }, { tur: "fonksiyon", ifade: "2x+1" }, { tur: "fonksiyon", ifade: "tan(x)" }], xEtiket: "x", yEtiket: "y" }, { xMin: -5, xMax: 5 });
  dogrula(monoton.length === 0, `1/x, 2x+1, tan x uç noktasız: ${JSON.stringify(monoton)}`);
  dogrula(ekstremumNoktalari({ egriler: [{ tur: "fonksiyon", ifade: "|x-2|" }], xEtiket: "x", yEtiket: "y" }, { xMin: -5, xMax: 5 }).length === 1, "|x−2| tek en küçük nokta");
  const { ctx, cagrilar } = sahteCtx();
  fizikCiz(ctx, { id: "g", tur: "fizik", nesne: "grafik", kalinlik: 2, x: 20, y: 20, w: 300, h: 190, grafik: v2 });
  dogrula(cagrilar.length > 20, "parabol çizilir");
});


// ═══════════════════════════════════════════════════════════════════════════
// R: eksik şekil/şablon/araçlar ve grafik görünümü
// ═══════════════════════════════════════════════════════════════════════════

/** fillText / arc / lineTo çağrılarını konumlarıyla kaydeden sahte ctx. */
function izlemeCtx() {
  const yazilar: { t: string; x: number; y: number }[] = [];
  const yaylar: { x: number; y: number; r: number }[] = [];
  const cagrilar: string[] = [];
  const ozellikler: Record<string, unknown> = { font: "", lineWidth: 1 };
  const proxy = new Proxy(ozellikler, {
    get(hedef, ad: string) {
      if (ad === "measureText") return (m: string) => ({ width: [...m].length * 10 });
      if (ad === "fillText" || ad === "strokeText") return (t: string, x: number, y: number) => { if (ad === "fillText") yazilar.push({ t, x, y }); cagrilar.push(ad); };
      if (ad === "arc") return (x: number, y: number, r: number) => { yaylar.push({ x, y, r }); cagrilar.push(ad); };
      if (ad in hedef) return hedef[ad];
      return (...a: unknown[]) => { cagrilar.push(ad); return a; };
    },
    set(hedef, ad: string, deger) { hedef[ad] = deger; return true; },
  });
  return { ctx: proxy as unknown as CanvasRenderingContext2D, yazilar, yaylar, cagrilar };
}

const fizikSekli = (nesne: FizikNesnesi, ek: Partial<Extract<Sekil, { tur: "fizik" }>> = {}): Extract<Sekil, { tur: "fizik" }> => {
  const t = FIZIK_TANIMLARI[nesne];
  return { id: `r-${nesne}`, tur: "fizik", nesne, kalinlik: 2, x: 40, y: 40, w: t.w, h: t.h, ...ek } as Extract<Sekil, { tur: "fizik" }>;
};

test("grafik: çoklu eğri çizgi desenleri, asimptot ince kesikli, tek eğri düz", () => {
  const r = hizliMatematik("x^2/9+y^2/4=1; x^2+y^2=4; y=x/2");
  dogrula("veri" in r, "elips+çember+doğru çizilir");
  if (!("veri" in r)) return;
  const desen = r.veri.egriler.map((e) => egriCizgiDeseni(e as { cizgi?: GrafikCizgiDeseni }));
  dogrula(new Set(desen).size === 3 && desen[0] === "duz", `üç eğri üç ayrı desen: ${desen}`);
  const h = hizliMatematik("x^2/9-y^2/4=1; y=2x/3; y=-2x/3");
  dogrula("veri" in h && h.veri.egriler.map((e) => egriCizgiDeseni(e as { cizgi?: GrafikCizgiDeseni })).join() === "duz,asimptot,asimptot", "hiperbol düz, asimptotlar ince kesikli");
  const tek = hizliMatematik("y=x^2-4");
  dogrula("veri" in tek && tek.veri.egriler.every((e) => egriCizgiDeseni(e as { cizgi?: GrafikCizgiDeseni }) === "duz"), "tek eğri düz");
  dogrula(cizgiDeseniDegerleri("asimptot").kalinlik < 1 && cizgiDeseniDegerleri("nokta").dash[0] < 2 && cizgiDeseniDegerleri("cizgiNokta").dash.length === 4, "desen değerleri");
  dogrula(grafikVerisiGecerliMi({ ...r.veri, egriler: [{ ...r.veri.egriler[0], cizgi: "yok" }] }) === false, "geçersiz desen reddedilir");
  const { ctx, cagrilar } = sahteCtx();
  fizikCiz(ctx, fizikSekli("grafik", { w: 300, h: 190, grafik: r.veri }));
  dogrula(cagrilar.includes("setLineDash") && cagrilar.length > 30, "çizilir");
});

test("grafik: taralı alan eğik çizgi taramasıyla (kırpma + çizgiler) baskıda belirgin", () => {
  for (const ad of ["m-arasi", "m-alt-alan", "m-bolge"]) {
    const sb = MAT_GRAFIK_SABLONLARI.find((x) => x.id === ad)!;
    const { ctx, cagrilar } = sahteCtx();
    fizikCiz(ctx, fizikSekli("grafik", { w: 300, h: 190, grafik: sb.olustur() }));
    dogrula(cagrilar.includes("clip") && cagrilar.filter((c) => c === "lineTo").length > 40, `${ad}: tarama çizgileri var`);
  }
});

test("grafik: eksen aralığı ilgin noktalara göre sıkı; trigonometride π eksenli iki periyot", () => {
  const al = (m: string) => { const r = hizliMatematik(m); if (!("veri" in r)) throw new Error(`${m}: ${r.hata}`); return grafikDuzeni(r.veri); };
  let d = al("y=x^2-4");
  dogrula(d.xMin >= -4 && d.xMax <= 4 && d.yMin >= -6 && d.yMax <= 10, `x²−4 sıkı: ${JSON.stringify(d)}`);
  d = al("y=2x+1");
  dogrula(d.xMax - d.xMin <= 8, `2x+1 sıkı: ${JSON.stringify(d)}`);
  const s2 = hizliMatematik("sin(2x)");
  dogrula("veri" in s2 && s2.veri.piEksen === true, "sin(2x) π eksenli");
  d = al("sin(2x)");
  yakin(d.xMin, -Math.PI, "sin 2x xMin −π", 1e-6); yakin(d.xMax, Math.PI, "sin 2x xMax π", 1e-6);
  d = al("cos(x)");
  yakin(d.xMax - d.xMin, 4 * Math.PI, "cos x: iki periyot", 1e-6);
  dogrula(d.yMax <= 2 && d.yMin >= -2, "cos y aralığı");
  dogrula(piYaz(Math.PI / 4) === "π/4" && piYaz(-Math.PI) === "−π", "π etiketleri");
  const tn = al("tan(x)");
  dogrula(tn.yMax === 4 && tn.yMin === -4, "tan y sınırlı");
  // Çember: eksen çember sınırına göre (xs/ys içine kutu eklenir)
  const c = al("x^2+y^2=4");
  dogrula(c.xMax - c.xMin <= 10, `çember pencere: ${JSON.stringify(c)}`);
});

test("hızlı grafik: parçalı fonksiyon {x<0: -x, x>=0: x^2}, açık/kapalı uç", () => {
  const r = hizliMatematik("{x<0: -x, x>=0: x^2}");
  dogrula("veri" in r, `parçalı okunur: ${JSON.stringify(r)}`);
  if (!("veri" in r)) return;
  const f = r.veri.egriler.filter((e): e is Extract<typeof r.veri.egriler[number], { tur: "fonksiyon" }> => e.tur === "fonksiyon");
  dogrula(f.length === 2 && f[0].bitis === 0 && f[0].ucSon === "bos" && f[1].baslangic === 0 && f[1].ucBas === "dolu", `uçlar: ${JSON.stringify(f)}`);
  const u = hizliMatematik("y={x<=-1: x+3, -1<x<2: 2, x>=2: -x+5}");
  dogrula("veri" in u && u.veri.egriler.length === 3, "üç parça");
  if ("veri" in u) {
    const m = u.veri.egriler[1] as Extract<typeof u.veri.egriler[number], { tur: "fonksiyon" }>;
    dogrula(m.baslangic === -1 && m.bitis === 2 && m.ucBas === "bos" && m.ucSon === "bos", "ara parça iki ucu açık");
  }
  const nk = hizliMatematik("{x<0: -x, x>=0: x^2; }");
  dogrula("hata" in nk || "veri" in nk, "çökmez");
  dogrula("hata" in hizliMatematik("{x<0 -x}") && "hata" in hizliMatematik("{abc: x}"), "bozuk parçalı yazım hata verir");
  dogrula(parcaKosuluOku("2<x")?.alt === 2 && parcaKosuluOku("x>=-1")?.altDahil === true && parcaKosuluOku("-1<=x<3")?.ust === 3 && parcaKosuluOku("x==")=== null, "koşul ayrıştırma");
  const { ctx, cagrilar } = sahteCtx();
  fizikCiz(ctx, fizikSekli("grafik", { w: 300, h: 190, grafik: r.veri }));
  dogrula(cagrilar.includes("arc") && cagrilar.length > 20, "uç daireleri çizilir");
});

test("hızlı grafik: adlı nokta A(2,3), F1(-3,0) nokta + etiket", () => {
  const r = hizliMatematik("x^2/9+y^2/4=1; F1(-3,0); F2(3,0); A(2,1.5)");
  dogrula("veri" in r, "adlı noktalı grafik");
  if (!("veri" in r)) return;
  const n = r.veri.egriler.find((e) => e.tur === "isaret");
  dogrula(n?.tur === "isaret" && n.noktalar.length === 3 && n.noktalar[0].ad === "F_1" && n.noktalar[0].x === -3 && n.noktalar[2].ad === "A", `noktalar: ${JSON.stringify(n)}`);
  dogrula(adliNoktaSatiri("sin(2,3)") === null && adliNoktaSatiri("P(1,−2)")?.y === -2, "sin(2,3) fonksiyon, P(1,−2) nokta");
  const iz = izlemeCtx();
  fizikCiz(iz.ctx, fizikSekli("grafik", { w: 300, h: 190, grafik: r.veri }));
  dogrula(iz.yazilar.some((y) => y.t === "A") && iz.yazilar.some((y) => y.t === "F") , `etiketler yazılır: ${iz.yazilar.map((y) => y.t).join("")}`);
  dogrula(iz.yaylar.length >= 3, "noktalar çizilir");
});

test("geometri: üçgen ölçüleri (kenar, iki kenar + açı), geçersiz ölçü, köşe adı köşeye bağlı", () => {
  const dik = varsayilanUcgen({ olcu: [5, 4, 3] });
  const k = ucgenKoseleri(dik)!;
  const o = ucgenOlculeri(k);
  yakin(o.aci[0], 90, "a=5,b=4,c=3: A dik", 1e-6);
  yakin(o.kenar[0], 5, "a", 1e-9); yakin(o.kenar[2], 3, "c", 1e-9);
  const ia = ucgenOlculeri(ucgenKoseleri(varsayilanUcgen({ mod: "aci", olcu: [4, 5, 120] }))!);
  yakin(ia.aci[0], 120, "iki kenar + açı: A=120°", 1e-6); yakin(ia.kenar[1], 4, "b", 1e-9); yakin(ia.kenar[2], 5, "c", 1e-9);
  dogrula(ucgenKoseleri(varsayilanUcgen({ olcu: [1, 2, 5] })) === null && ucgenKoseleri(varsayilanUcgen({ mod: "aci", olcu: [3, 4, 180] })) === null, "geçersiz ölçü null");
  // Köşe adları: şekli 100 px kaydırınca bütün yazılar 100 px kayar (köşeye bağlı)
  for (const nesne of ["ucgenABC", "dikUcgen", "benzerUcgen", "cemberGeo", "cokgenAd"] as const) {
    const a = izlemeCtx(), b = izlemeCtx();
    fizikCiz(a.ctx, fizikSekli(nesne));
    fizikCiz(b.ctx, fizikSekli(nesne, { x: 140 }));
    dogrula(a.yazilar.length > 0 && a.yazilar.length === b.yazilar.length, `${nesne}: köşe adları yazılır (${a.yazilar.length})`);
    dogrula(a.yazilar.every((y, i) => Math.abs(b.yazilar[i].x - y.x - 100) < 1e-6 && Math.abs(b.yazilar[i].y - y.y) < 1e-6), `${nesne}: adlar şekille birlikte kayar`);
  }
  const t = izlemeCtx();
  fizikCiz(t.ctx, fizikSekli("ucgenABC"));
  const harfler = t.yazilar.map((y) => y.t);
  dogrula(["A", "B", "C", "a", "b", "c"].every((h) => harfler.includes(h)), `A,B,C ve a,b,c yazılır: ${harfler}`);
  // Dik üçgen + yükseklik: dik açı işareti ve ayak noktası H
  const d = izlemeCtx();
  fizikCiz(d.ctx, fizikSekli("dikUcgen"));
  dogrula(d.yazilar.some((y) => y.t === "H") && d.yazilar.some((y) => y.t === "h"), "yükseklik ve ayağı etiketlenir");
});

test("geometri: tüm şablonlar ve işaretler hatasız, boş olmayan çizim; doğrulama", () => {
  const liste: [FizikNesnesi, GeometriVerisi][] = [
    ...UCGEN_SABLONLARI.map((s) => ["ucgenABC", s.olustur()] as [FizikNesnesi, GeometriVerisi]),
    ...CEMBER_SABLONLARI.map((s) => ["cemberGeo", s.olustur()] as [FizikNesnesi, GeometriVerisi]),
    ...BENZER_SABLONLARI.map((s) => ["benzerUcgen", s.olustur()] as [FizikNesnesi, GeometriVerisi]),
    ...COKGEN_SABLONLARI.map((s) => ["cokgenAd", s.olustur()] as [FizikNesnesi, GeometriVerisi]),
  ];
  for (const [nesne, geo] of liste) {
    dogrula(geometriVerisiGecerliMi(geo), `${nesne} verisi geçerli`);
    const s = fizikSekli(nesne, { geo });
    dogrula(sekilGecerliMi(s), `${nesne} sekilGecerliMi`);
    const { ctx, cagrilar } = sahteCtx();
    fizikCiz(ctx, s);
    dogrula(cagrilar.filter((c) => c === "stroke").length >= 1 && cagrilar.length >= 10, `${nesne}/${geo.tur} çizildi`);
  }
  for (const nesne of ["aciYayi", "dikAci", "esIsaret"] as const) {
    for (const ek of [undefined, { sayi: 120 }, { sayi: 200, sayi2: 1 }, { sayi: 3 }]) {
      const { ctx, cagrilar } = sahteCtx();
      fizikCiz(ctx, fizikSekli(nesne, ek ? { ek } : {}));
      dogrula(cagrilar.filter((c) => c === "stroke").length >= 1, `${nesne} ${JSON.stringify(ek)} çizildi`);
    }
  }
  const aci = izlemeCtx();
  fizikCiz(aci.ctx, fizikSekli("aciYayi", { ek: { sayi: 35 } }));
  dogrula(aci.yazilar.some((y) => y.t === "35°"), "açı yayı derece etiketi");
  const aci2 = izlemeCtx();
  fizikCiz(aci2.ctx, fizikSekli("aciYayi", { ek: { sayi: 35 }, etiket: "\\theta" }));
  dogrula(aci2.yazilar.some((y) => y.t === "θ") && !aci2.yazilar.some((y) => y.t === "35°"), "açı yayı özel etiket");
  dogrula(!geometriVerisiGecerliMi({ tur: "ucgen", mod: "kenar" }) && !geometriVerisiGecerliMi({ tur: "cokgen", n: 99, adlar: [], merkez: true, kosegen: true, esKenar: true }) && !geometriVerisiGecerliMi(null), "bozuk geo reddedilir");
  dogrula(!sekilGecerliMi({ ...fizikSekli("ucgenABC"), geo: { tur: "yok" } }) && !sekilGecerliMi({ ...fizikSekli("halkaAkim"), ek: { sayi: "x" } }), "bozuk geo/ek şablonu reddedilir");
  // Açı yayı hem geometri hem mekanik/optik grubunda listelenir
  dogrula(FIZIK_TANIMLARI.aciYayi.ekGruplar?.includes("mekanik") === true && FIZIK_TANIMLARI.aciYayi.ekGruplar.includes("optik"), "açı yayı fizik gruplarında da");
});

test("fizik ek şekilleri: ışın ara ok, halka akım, solenoid, düz tel, ⊗⊙ alanı, girişim, enerji düzeyi, düğüm", () => {
  const nesneler: FizikNesnesi[] = ["isinOk", "halkaAkim", "solenoid", "telAlan", "alanNokta", "dalgaGirisim", "enerjiDuzeyi", "dugum"];
  for (const nesne of nesneler) {
    for (const ek of [undefined, { ters: true }, { ters: true, sayi: 2, sayi2: 2 }]) {
      const s = fizikSekli(nesne, ek ? { ek } : {});
      dogrula(sekilGecerliMi(s), `${nesne} geçerli`);
      const { ctx, cagrilar } = sahteCtx();
      fizikCiz(ctx, s);
      dogrula(cagrilar.length >= 3 && (cagrilar.includes("stroke") || cagrilar.includes("fill")), `${nesne} ${JSON.stringify(ek)} çizildi`);
      const sim = sahteCtx();
      fizikSimgeCiz(sim.ctx, nesne, 44, 30);
      dogrula(sim.cagrilar.length >= 3, `${nesne} paletteki simge`);
    }
  }
  // ⊗ ⊙ alanı: satır × sütun kadar simge; giren/çıkan farkı (çarpı çizgileri ↔ dolu nokta)
  const cikan = izlemeCtx(), giren = sahteCtx();
  fizikCiz(cikan.ctx, fizikSekli("alanNokta", { ek: { sayi: 4, sayi2: 3 } }));
  dogrula(cikan.yaylar.length === 24, `4x3 = 12 simge, her biri çember + nokta (${cikan.yaylar.length})`);
  const a = sahteCtx(), b = sahteCtx();
  fizikCiz(a.ctx, fizikSekli("alanNokta", { ek: { sayi: 2, sayi2: 2, ters: true } }));
  fizikCiz(b.ctx, fizikSekli("alanNokta", { ek: { sayi: 2, sayi2: 2 } }));
  dogrula(a.cagrilar.filter((c) => c === "lineTo").length >= 8 && b.cagrilar.filter((c) => c === "lineTo").length < 2, "⊗ çarpılı, ⊙ noktalı");
  void giren;
  // Işın ara oku: ara ok sayısı kadar dolu üçgen
  const i0 = sahteCtx(), i3 = sahteCtx();
  fizikCiz(i0.ctx, fizikSekli("isinOk", { ek: { sayi: 0 } }));
  fizikCiz(i3.ctx, fizikSekli("isinOk", { ek: { sayi: 3 } }));
  dogrula(i3.cagrilar.filter((c) => c === "fill").length - i0.cagrilar.filter((c) => c === "fill").length === 3, "3 ara ok");
  // Düz tel: çember sayısı kadar yay
  const tel = izlemeCtx();
  fizikCiz(tel.ctx, fizikSekli("telAlan", { ek: { sayi: 4 } }));
  dogrula(tel.yaylar.filter((y) => y.r > 12).length === 4, "4 eş merkezli alan çemberi");
  // Enerji düzeyi: düzey adları ve eV değerleri yazılır; ayrıştırma
  const en = izlemeCtx();
  fizikCiz(en.ctx, fizikSekli("enerjiDuzeyi"));
  dogrula(en.yazilar.some((y) => y.t.includes("13,6")) && en.yazilar.some((y) => y.t === "n=1"), `düzey yazıları: ${en.yazilar.map((y) => y.t)}`);
  const dz = enerjiDuzeyleriOku("n=1:-13,6; n=2:-3,4");
  dogrula("duzeyler" in dz && dz.duzeyler.length === 2 && dz.duzeyler[0].e === -13.6, "düzey ayrıştırma");
  dogrula("hata" in enerjiDuzeyleriOku("n=1:abc; n=2:1") && "hata" in enerjiDuzeyleriOku("n=1:2"), "bozuk düzey");
  const gc = enerjiGecisleriOku("3>1; 2>1:Lα", 3);
  dogrula("gecisler" in gc && gc.gecisler.length === 2 && gc.gecisler[1].etiket === "Lα", "geçiş ayrıştırma");
  dogrula("hata" in enerjiGecisleriOku("5>1", 3) && "hata" in enerjiGecisleriOku("1>1", 3), "bozuk geçiş");
  // Girişim: düğüm çizgileri açılınca daha çok çizgi
  const g0 = sahteCtx(), g1 = sahteCtx();
  fizikCiz(g0.ctx, fizikSekli("dalgaGirisim"));
  fizikCiz(g1.ctx, fizikSekli("dalgaGirisim", { ek: { ters: true } }));
  dogrula(g1.cagrilar.filter((c) => c === "lineTo").length > g0.cagrilar.filter((c) => c === "lineTo").length, "sönüm çizgileri eklenir");
  // Devre düğümü dolu nokta ve bağlayıcı ona tutunur
  const dg = fizikSekli("dugum");
  dogrula(fizikElipsMi("dugum") && dg.w === 11, "düğüm dolu küçük daire");
  const baglayici: Sekil = { id: "b", tur: "baglayici", kalinlik: 2, kaynak: { sekilId: dg.id }, hedef: { x: 300, y: 300 }, stil: "dik" };
  dogrula(baglayiciYolu([dg, baglayici], baglayici as Extract<Sekil, { tur: "baglayici" }>) !== null, "tel düğüme bağlanır");
  // Sınır: halka akım/solenoid içerik sınırında
  const sn = cizimIcerikSiniri(sahteCtx().ctx, [fizikSekli("solenoid")]);
  dogrula(!!sn && sn.w >= FIZIK_TANIMLARI.solenoid.w - 1, "solenoid içerik sınırına dahil");
});

test("kimya: orbital kutu-ok (Aufbau + Hund), iyonlar, istisnalar", () => {
  const ozet = (z: number, y = 0) => orbitalDizilimMetni(z, y);
  dogrula(ozet(1) === "1s^1" && ozet(7) === "1s^2 2s^2 2p^3" && ozet(8) === "1s^2 2s^2 2p^4" && ozet(10) === "1s^2 2s^2 2p^6", "ilk elementler");
  dogrula(ozet(26) === "1s^2 2s^2 2p^6 3s^2 3p^6 3d^6 4s^2".split(" ").sort((x, y) => 0).join(" ") || ozet(26).includes("3d^6") && ozet(26).includes("4s^2"), "Fe: 3d⁶ 4s²");
  dogrula(!ozet(26, 2).includes("4s") && ozet(26, 2).includes("3d^6"), `Fe²⁺: 4s boşalır: ${ozet(26, 2)}`);
  dogrula(ozet(17, -1) === "1s^2 2s^2 2p^6 3s^2 3p^6", "Cl⁻ = Ar dizilimi");
  dogrula(ozet(11, 1) === "1s^2 2s^2 2p^6" && ozet(8, -2) === ozet(10), "Na⁺ ve O²⁻ = Ne dizilimi");
  dogrula(ozet(24).includes("3d^5") && ozet(24).includes("4s^1") && ozet(29).includes("3d^10") && ozet(29).includes("4s^1"), "Cr ve Cu istisnaları");
  dogrula(ozet(42).endsWith("4s^2 3d^10 4p^6 5s^1 4d^5"), `Mo: [Kr] 5s¹ 4d⁵ → ${ozet(42)}`);
  dogrula(ozet(47).endsWith("4s^2 3d^10 4p^6 5s^1 4d^10"), `Ag: [Kr] 5s¹ 4d¹⁰ → ${ozet(47)}`);
  dogrula(ozet(79).endsWith("5p^6 6s^1 4f^14 5d^10"), `Au: [Xe] 6s¹ 4f¹⁴ 5d¹⁰ → ${ozet(79)}`);
  dogrula(ozet(47, 1).endsWith("4p^6 4d^10") && !ozet(47, 1).includes("5s"), `Ag⁺: 5s boşalır → ${ozet(47, 1)}`);
  dogrula(orbitalDizilimi(42).find((a) => a.ad === "4d")!.kutular.every((k) => k === "yukari"), "Mo 4d: beş tek elektron (yarı dolu)");
  const toplam = (z: number, y = 0) => orbitalDizilimi(z, y).reduce((t, a) => t + a.e, 0);
  for (let z = 1; z <= 86; z += 1) dogrula(toplam(z) === z, `Z=${z} elektron toplamı ${toplam(z)}`);
  // Hund: N → 2p üç kutuda birer yukarı ok; O → bir çift + iki tek; Ne → üç çift
  const p = (z: number) => orbitalDizilimi(z).find((a) => a.ad === "2p")!.kutular.join();
  dogrula(p(7) === "yukari,yukari,yukari" && p(8) === "cift,yukari,yukari" && p(10) === "cift,cift,cift" && p(5) === "yukari,yok,yok", `Hund: ${p(7)} | ${p(8)}`);
  dogrula(orbitalDizilimi(26).find((a) => a.ad === "3d")!.kutular.join() === "cift,yukari,yukari,yukari,yukari", "Fe 3d: bir çift + dört tek");
  for (const sb of KIMYA_ORBITAL_SABLONLARI) {
    const v = sb.olustur();
    dogrula(kimyaVerisiGecerliMi(v), `${sb.id} geçerli`);
    const b = kimyaBoyutu(v);
    const s = fizikSekli("kimya", { ...b, kimya: v });
    dogrula(sekilGecerliMi(s), `${sb.id} sekilGecerliMi`);
    const { ctx, cagrilar } = sahteCtx();
    kimyaCiz(ctx, s);
    dogrula(cagrilar.filter((c) => c === "rect").length >= 5, `${sb.id} kutular çizildi`);
  }
  dogrula(!kimyaVerisiGecerliMi({ tur: "orbital", z: 0, yuk: 0, dizilim: true }), "geçersiz orbital reddedilir");
});

test("kimya: tuz köprülü pil, damlalık, gaz kabı, beher ölçekleme", () => {
  for (const sb of KIMYA_PIL_SABLONLARI) {
    const v = sb.olustur();
    dogrula(kimyaVerisiGecerliMi(v), `${sb.id} geçerli`);
    const iz = izlemeCtx();
    const s = fizikSekli("kimya", { ...kimyaBoyutu(v), kimya: v });
    kimyaCiz(iz.ctx, s);
    const t = iz.yazilar.map((y) => y.t).join("|");
    dogrula(["Tuz köprüsü", "Anot (−)", "Katot (+)", "V", "anyon", "katyon"].every((e) => t.includes(e)), `${sb.id}: anot, katot, tuz köprüsü, voltmetre, iyon okları (${t})`);
    dogrula(iz.yazilar.some((y) => y.t === "e") || iz.cagrilar.length > 30, "e⁻ yönü");
  }
  const sade = izlemeCtx();
  kimyaCiz(sade.ctx, fizikSekli("kimya", { w: 460, h: 300, kimya: pilVerisi({ voltmetre: false, iyonlar: false }) }));
  dogrula(!sade.yazilar.some((y) => y.t === "V" || y.t === "anyon"), "voltmetre/iyon okları kapatılabilir");
  for (const nesne of ["damlalik", "gazKabi"] as const) {
    for (const dolgu of [undefined, "#bfdbfe"]) {
      const { ctx, cagrilar } = sahteCtx();
      fizikCiz(ctx, fizikSekli(nesne, { ...(dolgu ? { dolgu, seviye: 0.5 } : {}) }));
      dogrula(cagrilar.filter((c) => c === "stroke").length >= 3, `${nesne} çizildi`);
    }
  }
  // Gaz kabı: piston alçalınca (seviye küçülünce) tanecik yoğunluğu artar → aynı sayıda tanecik daha küçük hacimde (en az 6)
  const g1 = sahteCtx(), g2 = sahteCtx();
  fizikCiz(g1.ctx, fizikSekli("gazKabi", { seviye: 1 }));
  fizikCiz(g2.ctx, fizikSekli("gazKabi", { seviye: 0.3 }));
  dogrula(g1.cagrilar.filter((c) => c === "arc").length > g2.cagrilar.filter((c) => c === "arc").length && g2.cagrilar.filter((c) => c === "arc").length >= 6, "gaz kabı piston konumu");
  // Beher ölçekleme: geniş/uzun beherde derece çizgileri ve ağız mutlak sınırlı (en çok 20 px), seviye çizgisi kutu içinde
  for (const [w, h] of [[300, 110], [60, 400], [240, 270], [20, 20]]) {
    const ik = { lineTo: [] as [number, number][], moveTo: [] as [number, number][] };
    const ozellikler: Record<string, unknown> = { font: "", lineWidth: 1 };
    const proxy = new Proxy(ozellikler, {
      get(hedef, ad: string) {
        if (ad === "measureText") return (m: string) => ({ width: [...m].length * 10 });
        if (ad === "lineTo" || ad === "moveTo") return (x: number, y: number) => { ik[ad].push([x, y]); };
        if (ad in hedef) return hedef[ad];
        return () => undefined;
      },
      set(hedef, ad: string, deger) { hedef[ad] = deger; return true; },
    }) as unknown as CanvasRenderingContext2D;
    fizikCiz(proxy, fizikSekli("beher", { x: 100, y: 100, w, h, dolgu: "#bfdbfe", seviye: 0.6 }));
    const dis = [...ik.lineTo, ...ik.moveTo].filter(([x, y]) => x < 100 - 9 || x > 100 + w + 9 || y < 100 - 6 || y > 100 + h + 1);
    dogrula(dis.length === 0, `beher ${w}x${h}: çizgiler kutunun dışına taşmıyor (${JSON.stringify(dis.slice(0, 3))})`);
  }
});

test("kimya: organik yapılar (benzen halkası içi çift bağ), fonksiyonel gruplar, izomerler, zincir çizici", () => {
  const ad = new Set(KIMYA_ORGANIK_SABLONLARI.map((s) => s.id));
  for (const id of ["org-benzen", "org-fenol", "org-toluen", "org-etanol", "org-asetikAsit", "org-butan", "org-izobutan", "org-fg-alkol", "org-fg-karboksil".replace("karboksil", "asit"), "org-fg-aldehit", "org-fg-keton", "org-fg-amin", "org-fg-eter", "org-fg-ester"]) {
    dogrula(ad.has(id), `${id} şablonu var`);
  }
  for (const sb of KIMYA_ORGANIK_SABLONLARI) {
    const v = sb.olustur();
    dogrula(kimyaVerisiGecerliMi(v), `${sb.id} geçerli`);
    const s = fizikSekli("kimya", { ...kimyaBoyutu(v), kimya: v });
    dogrula(sekilGecerliMi(s), `${sb.id} sekilGecerliMi`);
    const { ctx, cagrilar } = sahteCtx();
    kimyaCiz(ctx, s);
    dogrula(cagrilar.filter((c) => c === "stroke").length >= 1 && cagrilar.length >= 8, `${sb.id} çizildi`);
  }
  // Benzen: altı atom, üç çift bağ (halka içi ikinci çizgi), halka merkezi bağa ayrı kaydedilir
  const benzen = MOLEKULLER.find((m) => m.id === "benzen")!;
  dogrula(benzen.atomlar.length === 6 && benzen.baglar.filter((b) => b.kat === 2).length === 3 && benzen.baglar.filter((b) => b.kat === 2).every((b) => !!b.ic), "benzen: 3 çift bağ, hepsi halka içi");
  dogrula(benzen.baglar.every((b, i) => b.kat === (i % 2 === 0 ? 2 : 1)), "çift bağlar bir atlayarak (Kekulé)");
  // Çizgi sayısı: benzen = 6 kenar + 3 iç çizgi
  const { ctx, cagrilar } = sahteCtx();
  kimyaCiz(ctx, fizikSekli("kimya", { ...kimyaBoyutu(molekulVerisi("benzen", { geometri: false })), kimya: molekulVerisi("benzen", { geometri: false }) }));
  dogrula(cagrilar.filter((c) => c === "stroke").length === 9, `benzen: 9 çizgi (${cagrilar.filter((c) => c === "stroke").length})`);
  // Fenol: OH yazılır; toluen: CH₃
  const f = izlemeCtx();
  kimyaCiz(f.ctx, fizikSekli("kimya", { ...kimyaBoyutu(molekulVerisi("fenol")), kimya: molekulVerisi("fenol", { geometri: false }) }));
  dogrula(f.yazilar.some((y) => y.t === "OH"), "fenol: OH");
  // Zincir çizici
  const zn = (n: number, tur: "alkan" | "alken" | "alkin", k = 1) => zincirMolekulu(n, tur, k);
  dogrula(zn(4, "alkan").atomlar.length === 4 && zn(4, "alkan").baglar.every((b) => b.kat === 1) && zn(4, "alkan").formul === "C_4H_{10}", "bütan: 4 C, tek bağlar, C₄H₁₀");
  dogrula(zn(4, "alken", 2).baglar[1].kat === 2 && zn(4, "alken", 2).formul === "C_4H_{8}" && zn(5, "alkin", 1).baglar[0].kat === 3 && zn(5, "alkin").formul === "C_5H_{8}", "alken/alkin bağ konumu ve formül");
  dogrula(zincirAdi(4, "alkan", 1) === "Bütan" && zincirAdi(4, "alken", 1) === "1-Büten" && zincirAdi(3, "alkin", 1) === "Propin" && zincirAdi(2, "alken", 1) === "Eten", "zincir adları");
  for (const tur of ["alkan", "alken", "alkin"] as const) {
    const v = zincirVerisi(6, tur, 2);
    dogrula(kimyaVerisiGecerliMi(v) && sekilGecerliMi(fizikSekli("kimya", { ...kimyaBoyutu(v), kimya: v })), `zincir ${tur} geçerli`);
    const c = sahteCtx();
    kimyaCiz(c.ctx, fizikSekli("kimya", { ...kimyaBoyutu(v), kimya: v }));
    dogrula(c.cagrilar.filter((x) => x === "stroke").length >= 5, `zincir ${tur} çizildi`);
  }
  dogrula(!kimyaVerisiGecerliMi({ tur: "molekul", id: "zincir", gosterim: "cizgi", kismiYuk: false, geometri: true, zincir: { n: 99, tur: "alkan", konum: 1 } }), "geçersiz zincir reddedilir");
});

test("kimya: Lewis listesi genişledi ve özel molekül yazılabilir (ad + atom + bağ + serbest çift)", () => {
  const ids = new Set(MOLEKULLER.map((m) => m.id));
  for (const id of ["so2", "o3", "sf6", "pcl5", "nh4", "ch4", "c2h4", "c2h2", "hcn", "no3", "so4", "h2s", "ccl4", "pcl3", "co", "h2o2"]) dogrula(ids.has(id), `${id} listede`);
  // Lewis: her molekül Lewis gösteriminde çizilir
  for (const m of MOLEKULLER.filter((x) => x.grup !== "organik")) {
    const v = molekulVerisi(m.id, { gosterim: "lewis", geometri: true });
    dogrula(kimyaVerisiGecerliMi(v), `${m.id} geçerli`);
    const { ctx, cagrilar } = sahteCtx();
    kimyaCiz(ctx, fizikSekli("kimya", { ...kimyaBoyutu(v), kimya: v }));
    dogrula(cagrilar.filter((c) => c === "arc").length >= 2, `${m.id} Lewis noktaları`);
  }
  const iyon = izlemeCtx();
  kimyaCiz(iyon.ctx, fizikSekli("kimya", { w: 240, h: 160, kimya: molekulVerisi("so4", { geometri: false }) }));
  dogrula(iyon.yazilar.some((y) => y.t === "2−" || y.t.includes("2")), "SO₄²⁻ yükü yazılır");
  // Özel molekül
  const o = ozelMolekulOku("Su", "O(0,-0.35,2); H(-0.85,0.45); H(0.85,0.45)", "1-2; 1-3");
  dogrula("molekul" in o && o.molekul.atomlar.length === 3 && o.molekul.baglar.length === 2 && o.molekul.atomlar[0].lp === 2, "özel H₂O okunur");
  const co2 = ozelMolekulOku("CO2", "C(0,0); O(-1.2,0,2); O(1.2,0,2)", "1=2; 1=3");
  dogrula("molekul" in co2 && co2.molekul.baglar.every((b) => b.kat === 2), "çift bağ");
  const n2 = ozelMolekulOku("N2", "N(-0.7,0,1); N(0.7,0,1)", "1#2");
  dogrula("molekul" in n2 && n2.molekul.baglar[0].kat === 3, "üçlü bağ");
  const kama = ozelMolekulOku("x", "C(0,0); H(1,1)", "1-2k");
  dogrula("molekul" in kama && kama.molekul.baglar[0].stil === "kama", "kama bağ");
  for (const [at, bg] of [["", "1-2"], ["O(0,0", "1-2"], ["O(0,0); H(1,1)", "1-3"], ["O(0,0); H(1,1)", "1-1"], ["O(0, 0, 9)", ""], ["O(99,0); H(1,1)", "1-2"], ["O(0,0); H(1,1)", "bozuk"]]) {
    dogrula("hata" in ozelMolekulOku("x", at, bg), `bozuk özel molekül reddedilir: ${at} / ${bg}`);
  }
  dogrula(Array.from({ length: 17 }, (_, i) => `H(${i},0)`).join(";").length > 0 && "hata" in ozelMolekulOku("x", Array.from({ length: 17 }, (_, i) => `H(${i},0)`).join(";"), ""), "17 atom reddedilir");
  const v = ozelMolekulVerisi();
  dogrula(kimyaVerisiGecerliMi(v) && !kimyaVerisiGecerliMi({ ...v, ozel: { ad: "x", atomlar: "bozuk", baglar: "" } }), "özel molekül verisi doğrulanır");
  const s = fizikSekli("kimya", { ...kimyaBoyutu(v), kimya: v });
  const c = izlemeCtx();
  kimyaCiz(c.ctx, s);
  dogrula(c.yazilar.some((y) => y.t === "O") && c.yazilar.filter((y) => y.t === "H").length === 2 && c.yaylar.length >= 4, "özel molekül çizilir (atomlar + serbest çift noktaları)");
});

test("bağlayıcı: şekle yapışma kapatılabilir ayarı (serbest uç) veri modelinde var", () => {
  // Serbest uçlu kuvvet oku cismin merkezinden: kaynak {x,y}, hedef {x,y}; yol çizilir
  const cisim = kutle("c", 100, 100);
  const ok: Sekil = { id: "o", tur: "baglayici", kalinlik: 2, kaynak: { x: 145, y: 130 }, hedef: { x: 145, y: 230 }, stil: "vektor", okUcu: "son" };
  const yol = baglayiciYolu([cisim, ok], ok as Extract<Sekil, { tur: "baglayici" }>);
  dogrula(!!yol && yol.length >= 2 && Math.abs(yol[0].x - 145) < 1e-6 && Math.abs(yol[0].y - 130) < 1e-6, "serbest uç tıklanan noktada başlar (cismin merkezi)");
  const { ctx, cagrilar } = sahteCtx();
  sekilleriCiz(ctx, [cisim, ok]);
  dogrula(cagrilar.length > 10, "çizilir");
});

test("PNG dışa aktarım: enerji düzeyi ve geometri yazıları kırpılmaz (gerçek tuval pikseli)", () => {
  // Gerçek rasterleştirici gerekiyor: sahte ctx yazının NEREYE düştüğünü bilmez.
  // @napi-rs/canvas, pdfjs-dist'in isteğe bağlı bağımlılığı; kurulu değilse atlanır.
  let tuvalUret: ((w: number, h: number) => { getContext(t: "2d"): unknown }) | null = null;
  try { tuvalUret = require("@napi-rs/canvas").createCanvas; } catch { /* yok */ }
  if (!tuvalUret) { console.log("  (atlandı: @napi-rs/canvas yok)"); return; }
  const W = 1400, H = 1000;
  const sekil = (nesne: FizikNesnesi, ek: Partial<Extract<Sekil, { tur: "fizik" }>> = {}): Sekil => ({
    ...fizikSekli(nesne), x: 560, y: 420, ...ek,
  } as Sekil);
  const ucgen = UCGEN_SABLONLARI[0].olustur() as Extract<GeometriVerisi, { tur: "ucgen" }>;
  const durumlar: [string, Sekil][] = [
    ["enerji düzeyi (uzun adlar)", sekil("enerjiDuzeyi", { ek: { metin: "n=1 (temel):-13,6; n=2:-3,4; n=3:-1,51; n=∞ (iyon):0" } })],
    ["enerji düzeyi (dar kutu)", sekil("enerjiDuzeyi", { w: 160, h: 115 })],
    ["enerji düzeyi (90°)", sekil("enerjiDuzeyi", { donus: 90, ek: { metin: "n=1 (temel):-13,6; n=2:-3,4; n=∞ (iyon):0" } })],
    ["üçgen ABC (koordinatlı adlar)", sekil("ucgenABC", { geo: { ...ucgen, adlar: ["A(−12,15)", "B(100,−20)", "C(40,70)"] } })],
    ["üçgen ABC (koordinatlı adlar, 90°)", sekil("ucgenABC", { donus: 90, geo: { ...ucgen, adlar: ["A(−12,15)", "B(100,−20)", "C(40,70)"] } })],
  ];
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
    // Dışa aktarımla aynı çağrı (CizimEditoruModal: pay 14).
    const b = cizimIcerikSiniri(ctx, [s], 14, { w: W, h: H });
    dogrula(x0 >= b.x && y0 >= b.y && x1 + 1 <= b.x + b.w && y1 + 1 <= b.y + b.h,
      `${ad}: mürekkep [${x0},${y0}–${x1},${y1}] içerik sınırının [${b.x},${b.y} ${b.w}×${b.h}] dışında — PNG'de kırpılır`);
  }
});

console.log("TÜM FİZİK SENARYOLARI BAŞARILI");
