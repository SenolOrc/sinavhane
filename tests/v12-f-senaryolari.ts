// v1.2 fizik/kimya senaryoları (F ajanı): Hazır Soru Sahneleri (eğik düzlem + kuvvet
// bileşenleri, eğik düzlem + makara, Atwood, palanga, tam devre), optik ışın düzeneği,
// sıvı kapları ve sikloalkan / yan gruplu organik adlandırma. React'siz — `cizim/` saf.

import type { Nokta, Sekil } from "../src/modules/sinav-olusturucu/cizim/tipler";
import { FIZIK_TANIMLARI, fizikCiz, fizikSimgeCiz } from "../src/modules/sinav-olusturucu/cizim/fizik";
import { baglayiciYolu } from "../src/modules/sinav-olusturucu/cizim/geometri";
import { sekilleriCiz } from "../src/modules/sinav-olusturucu/cizim/ciz";
import { cizimIcerikSiniri } from "../src/modules/sinav-olusturucu/cizim/sinirlar";
import { sekilGecerliMi } from "../src/modules/sinav-olusturucu/cizim/sablon";
import { HAZIR_SAHNELER } from "../src/modules/sinav-olusturucu/cizim/sahneler";
import {
  FIZIK_HAZIR_SAHNELER, atwoodSahnesi, devreSahnesi, egikKuvvetSekli, egikMakaraSahnesi, optikSekli, palangaSahnesi, siviSekli,
} from "../src/modules/sinav-olusturucu/cizim/fizikSahneSablonlari";
import { egikKuvvetleri, egikKuvvetVerisiGecerliMi, egikYerlesim, varsayilanEgikKuvvet } from "../src/modules/sinav-olusturucu/cizim/fizikSahneler";
import { optikHesapla, optikNitelik, optikVerisiGecerliMi, optikYerlesimi, varsayilanOptik } from "../src/modules/sinav-olusturucu/cizim/optik";
import { siviVerisiGecerliMi, uBorusuDengede, uBorusuH2, uBorusuYerlesim, varsayilanSivi } from "../src/modules/sinav-olusturucu/cizim/sivi";
import {
  KIMYA_SIKLO_SABLONLARI, kimyaBoyutu, kimyaVerisiGecerliMi, molekulCoz, organikAdVeFormul, zincirVerisi,
} from "../src/modules/sinav-olusturucu/cizim/kimya";
import type { OptikVerisi } from "../src/modules/sinav-olusturucu/cizim/tipler";

type FizikSekli = Extract<Sekil, { tur: "fizik" }>;
type Baglayici = Extract<Sekil, { tur: "baglayici" }>;

function dogrula(kosul: unknown, mesaj: string) {
  if (!kosul) throw new Error(`TEST BAŞARISIZ: ${mesaj}`);
}
function yakin(a: number, b: number, mesaj: string, tol = 1e-6) {
  dogrula(Math.abs(a - b) <= tol, `${mesaj} (beklenen ${b}, gelen ${a})`);
}
function test(ad: string, fn: () => void) {
  fn();
  console.log(`✓ ${ad}`);
}
function sahteCtx() {
  const ozellikler: Record<string, unknown> = { font: "", lineWidth: 1, fillStyle: "#000", strokeStyle: "#000" };
  const proxy = new Proxy(ozellikler, {
    get(hedef, ad: string) {
      if (ad === "measureText") return (m: string) => ({ width: [...m].length * 8 });
      if (ad in hedef) return hedef[ad];
      return () => undefined;
    },
    set(hedef, ad: string, deger) { hedef[ad] = deger; return true; },
  });
  return proxy as unknown as CanvasRenderingContext2D;
}
const uzunluk = (a: Nokta, b: Nokta) => Math.hypot(b.x - a.x, b.y - a.y);
/** p noktasının a–b doğrusuna uzaklığı. */
function dogruyaUzaklik(p: Nokta, a: Nokta, b: Nokta) {
  return Math.abs((b.x - a.x) * (a.y - p.y) - (a.x - p.x) * (b.y - a.y)) / uzunluk(a, b);
}

// ── Optik ──────────────────────────────────────────────────────────────────

test("Optik: ayna/mercek denklemi (f=10, do=30 → di=15, gerçek, ters, m=−0,5)", () => {
  for (const tur of ["cukurAyna", "inceMercek"] as const) {
    const r = optikHesapla(varsayilanOptik({ tur, f: 10, uzaklik: 30 }));
    yakin(r.di, 15, `${tur} di`);
    yakin(r.m, -0.5, `${tur} büyütme`);
    dogrula(r.gercek && !r.duz && r.buyukluk === "küçük", `${tur}: gerçek, ters, küçük olmalı`);
  }
  const s = optikHesapla(varsayilanOptik({ tur: "cukurAyna", f: 10, uzaklik: 5 }));
  yakin(s.di, -10, "do=5 çukur ayna di");
  yakin(s.m, 2, "do=5 çukur ayna büyütme");
  dogrula(!s.gercek && s.duz && s.buyukluk === "büyük", "do=5: sanal, düz, 2 kat");
  dogrula(optikNitelik(varsayilanOptik({ uzaklik: 5 })) === "Sanal, düz, büyük", "nitelik yazısı");
  const esit = optikHesapla(varsayilanOptik({ tur: "inceMercek", f: 10, uzaklik: 20 }));
  yakin(esit.di, 20, "2F'deki cisim → 2F'de görüntü"); yakin(esit.m, -1, "boyu eşit");
  dogrula(optikHesapla(varsayilanOptik({ f: 10, uzaklik: 10 })).sonsuz, "odaktaki cisim → görüntü sonsuzda");
  // Dağıtıcılarda görüntü her zaman sanal, düz, küçük
  for (const tur of ["tumsekAyna", "kalinMercek"] as const) {
    for (const d of [2, 5, 10, 20, 60]) {
      const r = optikHesapla(varsayilanOptik({ tur, f: 10, uzaklik: d }));
      dogrula(!r.gercek && r.duz && Math.abs(r.m) < 1, `${tur} do=${d}: sanal düz küçük`);
      yakin(1 / r.f, 1 / d + 1 / r.di, `${tur} do=${d}: denklem`, 1e-9);
    }
  }
});

test("Optik: özel ışınlar kurala uyar ve denklemle bulunan görüntüde kesişir", () => {
  const kutu = { x: 0, y: 0, w: 460, h: 220 };
  const turler: OptikVerisi["tur"][] = ["cukurAyna", "tumsekAyna", "inceMercek", "kalinMercek"];
  for (const tur of turler) {
    for (const d of [5, 8, 15, 20, 30, 45]) {
      const v = varsayilanOptik({ tur, f: 10, uzaklik: d, isinlar: { paralel: true, odak: true, merkez: true, egrilik: true } });
      const y = optikYerlesimi(kutu, v);
      if (!y.goruntu) continue;
      dogrula(y.isinlar.length >= 3, `${tur} do=${d}: en az üç ışın`);
      for (const isin of y.isinlar) {
        // Çıkan ışının (ya da geriye uzantısının) doğrusu görüntünün ucundan geçer.
        const ikinci = { x: isin.cikis.x + isin.yon.x * 100, y: isin.cikis.y + isin.yon.y * 100 };
        dogrula(dogruyaUzaklik(y.goruntu, isin.cikis, ikinci) < 0.01, `${tur} do=${d} ${isin.ad} ışını görüntüden geçmiyor`);
        // Gerçek görüntüde ışın görüntüye İLERİ yönde gider; sanalda uzantısı geride.
        const t = (y.goruntu.x - isin.cikis.x) / isin.yon.x;
        dogrula(y.sonuc.gercek ? t > 0 : t < 0, `${tur} do=${d} ${isin.ad}: gerçek/sanal yön`);
        if (!y.sonuc.gercek && isin.ad !== "egrilik") dogrula(isin.kesikli.length > 0, `${tur} do=${d} ${isin.ad}: sanal uzantı kesikli çizilmeli`);
      }
      // Kurallar: paralel gelen ışın gerçekten asal eksene paralel gelir; aynada çıkan ışın geri (sola) gider.
      const p = y.isinlar.find((i) => i.ad === "paralel")!;
      yakin(p.gelen[0].y, p.gelen[1].y, `${tur}: paralel gelen ışın yatay`, 1e-9);
      dogrula((tur.includes("Ayna") ? p.yon.x < 0 : p.yon.x > 0), `${tur}: çıkış yönü`);
      const o = y.isinlar.find((i) => i.ad === "odak");
      if (o) yakin(o.yon.y, 0, `${tur}: odaktan gelen ışın paralel çıkar`, 1e-9);
      // Görüntü konumu/boyu denklemle tutarlı
      const r = optikHesapla(v);
      const ixBirim = tur.includes("Ayna") ? -r.di : r.di;
      yakin(y.goruntu.x, y.X0 + ixBirim * y.olcek, `${tur} do=${d}: görüntü x`, 1e-6);
      yakin(y.Y0 - y.goruntu.y, r.m * v.boy * y.olcek, `${tur} do=${d}: görüntü boyu`, 1e-6);
    }
  }
});

test("Optik: doğrulayıcı ve çizim", () => {
  dogrula(optikVerisiGecerliMi(varsayilanOptik()), "varsayılan geçerli");
  dogrula(!optikVerisiGecerliMi({ ...varsayilanOptik(), tur: "lazer" }), "bilinmeyen tür reddedilir");
  dogrula(!optikVerisiGecerliMi({ ...varsayilanOptik(), uzaklik: -3 }), "negatif uzaklık reddedilir");
  dogrula(!optikVerisiGecerliMi({ ...varsayilanOptik(), isinlar: {} }), "eksik ışın ayarı reddedilir");
  const s = optikSekli(varsayilanOptik({ uzaklik: 10 }));
  fizikCiz(sahteCtx(), s);
  dogrula(sekilGecerliMi(s), "optik şekli şablon doğrulamasından geçer");
  dogrula(!sekilGecerliMi({ ...s, optik: { tur: "cukurAyna" } }), "bozuk optik verisi şablonda reddedilir");
});

// ── Eğik düzlem + kuvvet bileşenleri ───────────────────────────────────────

test("Eğik düzlem: kuvvetler g=10 ile doğru; oklar büyüklükle orantılı, kütle artınca N artar", () => {
  const k = egikKuvvetleri({ aci: 30, kutle: 5, mu: 0 });
  yakin(k.G, 50, "mg"); yakin(k.paralel, 25, "mg·sin30"); yakin(k.dik, 50 * Math.cos(Math.PI / 6), "mg·cos30"); yakin(k.N, k.dik, "N = mg·cosα");
  const s5 = egikKuvvetSekli(varsayilanEgikKuvvet({ kutle: 5 }));
  const s10 = egikKuvvetSekli(varsayilanEgikKuvvet({ kutle: 10 }));
  const y5 = egikYerlesim(s5, s5.kuvvet!);
  const y10 = egikYerlesim(s10, s10.kuvvet!);
  for (const ad of ["mg", "paralel", "dik", "N"] as const) {
    const o5 = y5.oklar.find((o) => o.ad === ad)!, o10 = y10.oklar.find((o) => o.ad === ad)!;
    yakin(uzunluk(o5.bas, o5.uc), o5.buyukluk * s5.kuvvet!.olcek, `${ad} ok boyu = F × ölçek`, 1e-6);
    yakin(uzunluk(o10.bas, o10.uc) / uzunluk(o5.bas, o5.uc), 2, `${ad}: kütle 2 katına çıkınca ok 2 kat`, 1e-9);
  }
  const mg = y5.oklar.find((o) => o.ad === "mg")!, N = y5.oklar.find((o) => o.ad === "N")!, dik = y5.oklar.find((o) => o.ad === "dik")!, par = y5.oklar.find((o) => o.ad === "paralel")!;
  yakin(mg.uc.x, mg.bas.x, "mg düşey", 1e-9);
  // N yüzeye dik: eğim doğrultusuyla iç çarpım 0
  const yuzey = { x: y5.T.x - y5.A.x, y: y5.T.y - y5.A.y };
  yakin((N.uc.x - N.bas.x) * yuzey.x + (N.uc.y - N.bas.y) * yuzey.y, 0, "N yüzeye dik", 1e-6);
  yakin(uzunluk(N.bas, N.uc), uzunluk(dik.bas, dik.uc), "N = mg·cosα (eşit boy, zıt yön)", 1e-9);
  // Bileşenlerin toplamı mg
  yakin(par.uc.x - par.bas.x + dik.uc.x - dik.bas.x, mg.uc.x - mg.bas.x, "bileşen toplamı x", 1e-6);
  yakin(par.uc.y - par.bas.y + dik.uc.y - dik.bas.y, mg.uc.y - mg.bas.y, "bileşen toplamı y", 1e-6);
});

test("Eğik düzlem: kütle eğik yüzeye tam paralel oturur; takoz açısı = α", () => {
  for (const aci of [15, 30, 45, 60]) {
    const s = egikKuvvetSekli(varsayilanEgikKuvvet({ aci }));
    const y = egikYerlesim(s, s.kuvvet!);
    yakin(Math.atan2(y.A.y - y.T.y, y.T.x - y.A.x) * 180 / Math.PI, aci, `takoz açısı ${aci}`, 1e-9);
    // Bloğun alt kenarı (0–1) eğik yüzey doğrusunun üstünde ve ona paralel
    dogrula(dogruyaUzaklik(y.blok[0], y.A, y.T) < 1e-6 && dogruyaUzaklik(y.blok[1], y.A, y.T) < 1e-6, `${aci}°: blok alt köşeleri yüzeyde`);
    yakin(dogruyaUzaklik(y.blok[2], y.A, y.T), y.bh, `${aci}°: blok üst kenarı yüzeye paralel`, 1e-6);
  }
});

test("Eğik düzlem: sürtünme (statik/kinetik) ve doğrulayıcı", () => {
  const durgun = egikKuvvetleri({ aci: 20, kutle: 2, mu: 0.5 });
  dogrula(durgun.durgun, "tanα < μ → durgun"); yakin(durgun.fs, durgun.paralel, "statik fs = mg·sinα");
  const kayar = egikKuvvetleri({ aci: 50, kutle: 4, mu: 0.5 });
  dogrula(!kayar.durgun, "tanα > μ → kayar"); yakin(kayar.fs, 0.5 * kayar.N, "kinetik fs = μN");
  yakin(kayar.ivme, 10 * (Math.sin(50 * Math.PI / 180) - 0.5 * Math.cos(50 * Math.PI / 180)), "a = g(sinα − μcosα)", 1e-9);
  const s = egikKuvvetSekli(varsayilanEgikKuvvet({ aci: 50, kutle: 4, mu: 0.5, goster: { mg: true, bilesen: true, normal: true, surtunme: true } }));
  const fs = egikYerlesim(s, s.kuvvet!).oklar.find((o) => o.ad === "fs")!;
  dogrula(fs.uc.x > fs.bas.x && fs.uc.y < fs.bas.y, "fs eğim yukarı (kayma eğilimine zıt)");
  dogrula(egikKuvvetVerisiGecerliMi(varsayilanEgikKuvvet()), "varsayılan geçerli");
  dogrula(!egikKuvvetVerisiGecerliMi({ ...varsayilanEgikKuvvet(), aci: 95 }), "95° reddedilir");
  dogrula(!sekilGecerliMi({ ...s, kuvvet: { aci: 30 } }), "bozuk kuvvet verisi şablonda reddedilir");
});

// ── Birleşik sahneler: ip teğet, düşey; devre telleri ──────────────────────

function sekilBul(liste: Sekil[], nesne: string) {
  return liste.filter((s): s is FizikSekli => s.tur === "fizik" && s.nesne === nesne);
}
function ipler(liste: Sekil[]) {
  return liste.filter((s): s is Baglayici => s.tur === "baglayici").map((b) => ({ b, yol: baglayiciYolu(liste, b)! }));
}

test("Eğik düzlem + makara: m1 yüzeye paralel; ip eğime paralel ve makaraya teğet; m2 ipi düşey", () => {
  for (const aci of [20, 30, 40]) {
    const sahne = egikMakaraSahnesi(aci);
    const [duzlem] = sekilBul(sahne, "egikDuzlem");
    const [makara] = sekilBul(sahne, "makara");
    const [m1, m2] = sekilBul(sahne, "kutle");
    yakin(Math.atan2(duzlem.h, duzlem.w) * 180 / Math.PI, aci, "takoz açısı", 1e-9);
    yakin(m1.donus!, -aci, "m1 eğim kadar döndürülmüş", 1e-9);
    // m1'in alt kenarının orta noktası eğik yüzeyde
    const a = (aci * Math.PI) / 180;
    const mx = m1.x + m1.w / 2 + Math.sin(a) * m1.h / 2, my = m1.y + m1.h / 2 + Math.cos(a) * m1.h / 2;
    dogrula(dogruyaUzaklik({ x: mx, y: my }, { x: duzlem.x, y: duzlem.y + duzlem.h }, { x: duzlem.x + duzlem.w, y: duzlem.y }) < 0.02, "m1 yüzeye oturuyor");
    const [ip1, ip2] = ipler(sahne);
    dogrula(ip1.yol && ip2.yol, "ipler çizilebilir");
    const [b1, s1] = ip1.yol;
    yakin(Math.atan2(-(s1.y - b1.y), s1.x - b1.x) * 180 / Math.PI, aci, "ip eğime paralel", 1e-6);
    const c = { x: makara.x + makara.w / 2, y: makara.y + makara.h / 2 };
    yakin(dogruyaUzaklik(c, b1, s1), makara.w / 2, "ip makaraya teğet", 1e-6);
    yakin(uzunluk(s1, c), makara.w / 2, "ip ucu makara çemberinde", 1e-6);
    const [b2, s2] = ip2.yol;
    yakin(b2.x, s2.x, "m2 ipi düşey", 1e-6);
    yakin(b2.x, c.x + makara.w / 2, "m2 ipi makaranın sağ teğetinde", 1e-6);
    yakin(s2.x, m2.x + m2.w / 2, "m2 ipi kütlenin ortasına", 1e-6);
  }
});

test("Atwood ve palanga: tüm ipler düşey, makaralara teğet", () => {
  for (const [ad, sahne] of [["atwood", atwoodSahnesi()], ["palanga", palangaSahnesi()]] as const) {
    const liste = ipler(sahne);
    dogrula(liste.length >= 2, `${ad}: ipler`);
    for (const { yol } of liste) {
      dogrula(!!yol, `${ad}: ip yolu`);
      yakin(yol[0].x, yol[yol.length - 1].x, `${ad}: ip düşey`, 1e-6);
      for (const m of sekilBul(sahne, "makara")) {
        const c = { x: m.x + m.w / 2, y: m.y + m.h / 2 };
        const d = Math.abs(yol[0].x - c.x);
        if (yol.some((p) => Math.abs(uzunluk(p, c) - m.w / 2) < 1e-6)) yakin(d, m.w / 2, `${ad}: ip makaraya teğet`, 1e-6);
      }
    }
  }
  dogrula(sekilBul(palangaSahnesi(), "makara").length === 2, "palanga: sabit + hareketli makara");
});

test("Tam devre (seri/paralel): tüm elemanlar ve teller kurulu", () => {
  for (const tur of ["seri", "paralel"] as const) {
    const sahne = devreSahnesi(tur);
    for (const n of ["pil", "anahtarKapali", "ampermetre", "voltmetre"]) dogrula(sekilBul(sahne, n).length === 1, `${tur}: ${n}`);
    const r = sekilBul(sahne, "direnc");
    dogrula(r.length === 2 && r.map((x) => x.etiket).join() === "R_1,R_2", `${tur}: R1, R2`);
    dogrula(sekilBul(sahne, "pil")[0].etiket === "\\varepsilon, r", `${tur}: pil ε, r`);
    const t = ipler(sahne);
    dogrula(t.every(({ yol }) => yol && yol.length >= 2), `${tur}: her tel çizilebilir`);
    // Dik açılı teller: her parça yatay ya da düşey
    for (const { yol } of t) for (let i = 1; i < yol.length; i += 1) dogrula(Math.abs(yol[i].x - yol[i - 1].x) < 1e-6 || Math.abs(yol[i].y - yol[i - 1].y) < 1e-6, `${tur}: tel parçası eksene paralel`);
    // Her elemanın iki ucuna da tel bağlı (devre kapalı)
    for (const e of sahne.filter((s): s is FizikSekli => s.tur === "fizik" && s.nesne !== "dugum")) {
      const say = t.filter(({ b }) => ("sekilId" in b.kaynak && b.kaynak.sekilId === e.id) || ("sekilId" in b.hedef && b.hedef.sekilId === e.id)).length;
      dogrula(say === 2, `${tur}: ${e.nesne} iki uçtan bağlı (${say})`);
    }
  }
});

test("Hazır Soru Sahneleri kaydı: aranabilir ad, anahtar kelimeler, geçerli şekiller", () => {
  const idler = new Set<string>();
  for (const sahne of FIZIK_HAZIR_SAHNELER) {
    dogrula(!idler.has(sahne.id), `tekrarlanan kimlik ${sahne.id}`); idler.add(sahne.id);
    dogrula(sahne.ad.length > 3 && sahne.ipucu.length > 5 && sahne.aramaKelimeleri.length >= 3, `${sahne.id}: ad/ipucu/anahtar kelimeler`);
    const sekiller = sahne.olustur();
    dogrula(sekiller.length >= 1 && sekiller.every(sekilGecerliMi), `${sahne.id}: tüm şekiller doğrulayıcıdan geçer`);
    const kimlikler = new Set(sekiller.map((s) => s.id));
    dogrula(kimlikler.size === sekiller.length, `${sahne.id}: kimlikler benzersiz`);
    for (const b of sekiller.filter((s): s is Baglayici => s.tur === "baglayici")) {
      for (const u of [b.kaynak, b.hedef]) if ("sekilId" in u) dogrula(kimlikler.has(u.sekilId), `${sahne.id}: bağlayıcı yalnız sahne içindeki şekle tutunur`);
    }
    dogrula(HAZIR_SAHNELER.some((h) => h.id === sahne.id), `${sahne.id} HAZIR_SAHNELER'de`);
  }
  for (const k of ["makara", "atwood", "palanga", "ip"]) dogrula(FIZIK_HAZIR_SAHNELER.some((s) => s.aramaKelimeleri.includes(k)), `"${k}" ile aranabilir`);
  for (const n of ["egikKuvvet", "optikDuzenek", "siviKabi"] as const) dogrula((FIZIK_TANIMLARI[n].aramaKelimeleri ?? []).length > 0, `${n}: aramaKelimeleri`);
});

// ── Sıvı kapları ───────────────────────────────────────────────────────────

test("U borusu: denge koşulu d1·h1 = d2·h2 otomatik; çizimde yükseklik oranı korunur", () => {
  const v = { tur: "uBorusu" as const, d1: 3, d2: 1, h1: 2, h2: 1, otomatik: true };
  yakin(uBorusuH2(v), 6, "h2 = d1·h1/d2");
  dogrula(uBorusuDengede(v), "otomatikte dengede");
  dogrula(!uBorusuDengede({ ...v, otomatik: false, h2: 4 }), "elle h2 = 4: dengede değil");
  const y = uBorusuYerlesim({ x: 0, y: 0, w: 260, h: 220 }, v);
  yakin((y.I - y.L2) / (y.I - y.L1), 3, "çizimde h2/h1 = d1/d2", 1e-9);
  dogrula(y.L1 > y.ust && y.L2 >= y.ust, "sıvılar boru içinde");
});

test("Sıvı kapları: doğrulayıcılar ve çizim", () => {
  for (const tur of ["uBorusu", "kaldirma", "bolmeli"] as const) {
    const v = varsayilanSivi(tur);
    dogrula(siviVerisiGecerliMi(v), `${tur}: varsayılan geçerli`);
    const s = siviSekli(v);
    fizikCiz(sahteCtx(), s);
    dogrula(sekilGecerliMi(s), `${tur}: şablon doğrulaması`);
  }
  dogrula(!siviVerisiGecerliMi({ tur: "bolmeli", satir: 3, sutun: 3, dolu: [9], engel: [] }), "bölme indeksi sınır dışı reddedilir");
  dogrula(!siviVerisiGecerliMi({ tur: "kaldirma", seviye: 0.7, xBatma: 1.2, zOran: 2, adlar: ["X", "Y", "Z"], kuvvet: false }), "xBatma > 0,9 reddedilir");
  dogrula(!siviVerisiGecerliMi({ tur: "uBorusu", d1: 0, d2: 1, h1: 1, h2: 1, otomatik: true }), "d1 = 0 reddedilir");
});

// ── Eski veri uyumu ve önizleme ────────────────────────────────────────────

test("Eski kayıtlar: yeni alanları olmayan fizik şekilleri ve zincir aynen geçer", () => {
  const eski: Sekil = { id: "e", tur: "fizik", nesne: "egikDuzlem", kalinlik: 2, x: 0, y: 0, w: 260, h: 150, etiket: "\\theta" };
  dogrula(sekilGecerliMi(eski), "eski eğik düzlem");
  const z = zincirVerisi(4, "alkan");
  dogrula(kimyaVerisiGecerliMi(z), "eski zincir verisi");
  dogrula(z.tur === "molekul" && molekulCoz(z).ad === "Bütan", "eski zincir adı değişmedi");
  // Yeni nesnelerin verisi yoksa varsayılanla çizilir (çökmeden)
  for (const n of ["egikKuvvet", "optikDuzenek", "siviKabi"] as const) {
    fizikCiz(sahteCtx(), { id: n, tur: "fizik", nesne: n, kalinlik: 2, x: 0, y: 0, w: FIZIK_TANIMLARI[n].w, h: FIZIK_TANIMLARI[n].h });
    fizikSimgeCiz(sahteCtx(), n, 44, 30);
  }
});

// ── Kimya: sikloalkanlar ve yan gruplar ────────────────────────────────────

test("Organik adlandırma: IUPAC adı ve kapalı formül", () => {
  const ad = (n: number, yan: { k: number; g: "CH3" | "C2H5" | "Cl" | "Br" | "OH" | "NH2" }[] = [], halka = false) => {
    const r = organikAdVeFormul({ n, tur: "alkan", konum: 1, halka, yanGruplar: yan });
    if ("hata" in r) throw new Error(r.hata);
    return `${r.ad} ${r.formul}`;
  };
  const beklenen: [string, string][] = [
    [ad(4, [{ k: 2, g: "CH3" }]), "2-metilbütan C5H12"],
    [ad(4, [{ k: 3, g: "CH3" }]), "2-metilbütan C5H12"],
    [ad(3, [{ k: 2, g: "Cl" }]), "2-kloropropan C3H7Cl"],
    [ad(6, [], true), "siklohekzan C6H12"],
    [ad(3, [], true), "siklopropan C3H6"],
    [ad(4, [], true), "siklobütan C4H8"],
    [ad(5, [], true), "siklopentan C5H10"],
    // Çizilen zincir en uzun değilse ana zincir yeniden seçilir
    [ad(4, [{ k: 2, g: "C2H5" }]), "3-metilpentan C6H14"],
    [ad(4, [{ k: 1, g: "CH3" }]), "pentan C5H12"],
    [ad(3, [{ k: 2, g: "CH3" }, { k: 2, g: "CH3" }]), "2,2-dimetilpropan C5H12"],
    [ad(5, [{ k: 3, g: "C2H5" }]), "3-etilpentan C7H16"],
    [ad(4, [{ k: 2, g: "CH3" }, { k: 3, g: "C2H5" }]), "2,3-dimetilpentan C7H16"],
    // Alfabetik sıra (bromo < metil) ve eşitlikte alfabetik ilk olana küçük numara
    [ad(5, [{ k: 2, g: "Br" }, { k: 4, g: "CH3" }]), "2-bromo-4-metilpentan C6H13Br"],
    [ad(4, [{ k: 2, g: "Cl" }, { k: 3, g: "CH3" }]), "2-kloro-3-metilbütan C5H11Cl"],
    // Alkol / amin: temel gruba en küçük numara
    [ad(4, [{ k: 2, g: "OH" }]), "2-bütanol C4H10O"],
    [ad(4, [{ k: 3, g: "OH" }, { k: 2, g: "CH3" }]), "3-metil-2-bütanol C5H12O"],
    [ad(2, [{ k: 1, g: "OH" }]), "etanol C2H6O"],
    [ad(3, [{ k: 1, g: "OH" }]), "1-propanol C3H8O"],
    [ad(3, [{ k: 1, g: "NH2" }]), "1-propanamin C3H9N"],
    [ad(2, [{ k: 1, g: "Cl" }]), "kloroetan C2H5Cl"],
    [ad(2, [{ k: 1, g: "Cl" }, { k: 2, g: "Cl" }]), "1,2-dikloroetan C2H4Cl2"],
    // Halkada tek sübstitüentin numarası yazılmaz
    [ad(6, [{ k: 1, g: "CH3" }], true), "metilsiklohekzan C7H14"],
    [ad(6, [{ k: 1, g: "CH3" }, { k: 5, g: "CH3" }], true), "1,3-dimetilsiklohekzan C8H16"],
    [ad(6, [{ k: 4, g: "OH" }, { k: 3, g: "CH3" }], true), "2-metilsiklohekzanol C7H14O"],
    [ad(6, [{ k: 2, g: "Cl" }], true), "klorosiklohekzan C6H11Cl"],
    // Halojen taşıyan karbon dala düşerse karmaşık sübstitüent
    [ad(4, [{ k: 1, g: "Cl" }, { k: 2, g: "C2H5" }]), "3-(klorometil)pentan C6H13Cl"],
  ];
  for (const [gelen, bek] of beklenen) dogrula(gelen === bek, `beklenen "${bek}", gelen "${gelen}"`);
});

test("Organik yapı: değerlik, doğrulayıcı ve çizim", () => {
  const r = organikAdVeFormul({ n: 3, tur: "alkan", konum: 1, yanGruplar: [{ k: 2, g: "CH3" }, { k: 2, g: "CH3" }, { k: 2, g: "Cl" }] });
  dogrula("hata" in r, "C2'ye 5. bağ reddedilir");
  for (const sb of KIMYA_SIKLO_SABLONLARI) {
    const v = sb.olustur();
    dogrula(kimyaVerisiGecerliMi(v), `${sb.id} geçerli`);
    dogrula(sb.aramaKelimeleri.length > 0, `${sb.id}: aramaKelimeleri`);
    const m = molekulCoz(v as Extract<typeof v, { tur: "molekul" }>);
    dogrula(m.ad.toLowerCase().replace(/^\d,?\d*-/, "") === sb.ad.toLowerCase().replace(/^\d,?\d*-/, ""), `${sb.id}: şablon adı (${sb.ad}) = hesaplanan (${m.ad})`);
    const b = kimyaBoyutu(v);
    fizikCiz(sahteCtx(), { id: "k", tur: "fizik", nesne: "kimya", kalinlik: 2, x: 0, y: 0, ...b, kimya: v });
  }
  const hekzan = KIMYA_SIKLO_SABLONLARI.find((s) => s.id === "siklo-6")!.olustur();
  const mh = molekulCoz(hekzan as Extract<typeof hekzan, { tur: "molekul" }>);
  dogrula(mh.atomlar.length === 6 && mh.baglar.length === 6 && mh.baglar.every((b) => b.kat === 1), "siklohekzan: 6 köşe, 6 tekli bağ");
  dogrula(mh.formul === "C_{6}H_{12}", `siklohekzan formül yazımı (${mh.formul})`);
  dogrula(!kimyaVerisiGecerliMi({ tur: "molekul", id: "zincir", gosterim: "cizgi", kismiYuk: false, geometri: true, zincir: { n: 4, tur: "alken", konum: 1, yanGruplar: [{ k: 2, g: "CH3" }] } }), "alkene yan grup (desteklenmiyor) reddedilir");
  dogrula(!kimyaVerisiGecerliMi({ tur: "molekul", id: "zincir", gosterim: "cizgi", kismiYuk: false, geometri: true, zincir: { n: 10, tur: "alkan", konum: 1, halka: true } }), "10'lu halka reddedilir");
  dogrula(!kimyaVerisiGecerliMi({ tur: "molekul", id: "zincir", gosterim: "cizgi", kismiYuk: false, geometri: true, zincir: { n: 4, tur: "alkan", konum: 1, yanGruplar: [{ k: 2, g: "I" }] } }), "bilinmeyen grup reddedilir");
});

// ── PNG kırpma payı: mürekkep içerik sınırının içinde ──────────────────────

test("PNG kırpma payı: sahnelerin mürekkebi içerik sınırında", () => {
  let tuvalUret: ((w: number, h: number) => { getContext: (t: string) => unknown }) | null = null;
  try { tuvalUret = require("@napi-rs/canvas").createCanvas; } catch { /* yok */ }
  if (!tuvalUret) { console.log("  (atlandı: @napi-rs/canvas yok)"); return; }
  const W = 1100, H = 800;
  const denenecek: [string, Sekil[]][] = FIZIK_HAZIR_SAHNELER.map((s) => [s.id, s.olustur()]);
  denenecek.push(["egik-agir", [egikKuvvetSekli(varsayilanEgikKuvvet({ kutle: 12, degerler: true }))]]);
  denenecek.push(["egik-surtunme-60", [egikKuvvetSekli(varsayilanEgikKuvvet({ aci: 60, mu: 0.4, degerler: true, goster: { mg: true, bilesen: true, normal: true, surtunme: true } }))]]);
  denenecek.push(["kaldirma-kuvvet", [siviSekli({ tur: "kaldirma", seviye: 0.6, xBatma: 0.4, zOran: 3, adlar: ["X", "Y", "Z"], kuvvet: true })]]);
  for (const [ad, ham] of denenecek) {
    const sekiller = ham.map((s) => (s.tur === "baglayici" ? s
      : s.tur === "dogru" ? { ...s, x1: s.x1 + 200, x2: s.x2 + 200, y1: s.y1 + 150, y2: s.y2 + 150 }
      : { ...s, x: (s as FizikSekli).x + 200, y: (s as FizikSekli).y + 150 })) as Sekil[];
    const sabitle = sekiller.map((s) => (s.tur === "baglayici" ? { ...s, kaynak: "sekilId" in s.kaynak ? s.kaynak : { x: s.kaynak.x + 200, y: s.kaynak.y + 150 }, hedef: "sekilId" in s.hedef ? s.hedef : { x: s.hedef.x + 200, y: s.hedef.y + 150 } } : s));
    const tuval = tuvalUret(W, H);
    const ctx = tuval.getContext("2d") as CanvasRenderingContext2D;
    ctx.fillStyle = "#ffffff"; ctx.fillRect(0, 0, W, H);
    sekilleriCiz(ctx, sabitle);
    const veri = ctx.getImageData(0, 0, W, H).data;
    let x0 = W, y0 = H, x1 = -1, y1 = -1;
    for (let y = 0; y < H; y += 1) for (let x = 0; x < W; x += 1) {
      const i = (y * W + x) * 4;
      if (veri[i] < 245 || veri[i + 1] < 245 || veri[i + 2] < 245) {
        if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
      }
    }
    dogrula(x1 >= 0, `${ad}: hiç çizilmedi`);
    const b = cizimIcerikSiniri(ctx, sabitle, 14, { w: W, h: H });
    dogrula(x0 >= b.x && y0 >= b.y && x1 + 1 <= b.x + b.w && y1 + 1 <= b.y + b.h,
      `${ad}: mürekkep [${x0},${y0}–${x1},${y1}] içerik sınırının [${b.x},${b.y} ${b.w}×${b.h}] dışında — PNG'de kırpılır`);
  }
});

console.log("TÜM v1.2 F SENARYOLARI BAŞARILI");
