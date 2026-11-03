// Canvas'a çizim: tek şekil, tarama deseni ve tuvalin tamamı.
//
// Saf geometri değil (ctx'e yazar), ama React de değil — bu yüzden burada.
// `tuvaleCiz` çizim sırası açısından hassas: ızgara → şekiller → seçim
// tutamaçları → hizalama kılavuzları. Sıra bozulursa tutamaçlar şeklin
// altında kalır ve yakalanamaz hâle gelir.

import type { HizalamaCizgileri, Nokta, Sekil, TaramaTipi } from "./tipler";
import type { DenklemBelgesi } from "../denklem/tipler";
import { denklemOlcusu, denklemiCiz } from "../denklem/ciz";
import {
  AKIS_IC_GENISLIK_ORANI,
  AKIS_IC_PAY,
  AKIS_PUNTO,
  AKIS_SATIR_ARALIGI,
  BAGLAYICI_ETIKET_PUNTO,
  BAGLAYICI_OK_BOYU,
  VARSAYILAN_TUVAL,
  IZGARA_ARALIK,
  MUREKKEP,
  TUTAMAC_BOYUT,
} from "./sabitler";
import type { TuvalOlcusu } from "./sabitler";
import {
  akisKutusuKosaleri,
  baglayiciYolu,
  noktaDondur,
  noktaListesiKutusu,
  sekilGeometriKutusu,
  yolOrtaNoktasi,
} from "./geometri";
import {
  birlesikSinir,
  metinOlculeri,
  sekilHamSinirlari,
  sekilMerkezi,
  sekilTutamaclari,
} from "./sinirlar";
import { noktaBaskaSekleDegiyorMu } from "./vurus";
import { fizikCiz, fizikMetniCiz, fizikMetniOlcu, fizikSatiriTabandanCiz, zigzagNoktalari } from "./fizik";

// Serbest çizgideki gibi "orta noktalardan geçen" yumuşatma dalga için YANLIŞ
// sonuç veriyordu: eğri, kontrol noktasına (tepe/çukur) hiç değmiyor, sadece
// ona doğru çekiliyordu — bu yüzden tepe/çukurun üzerindeki sürükleme
// tutamacı, eğrinin GÖRSEL tepe noktasından belirgin şekilde uzak duruyor ve
// hizalama kılavuzları da (tutamaç konumuna göre çalıştığı için) gerçek
// eğriyle ilgisiz bir yere kilitleniyordu. Catmull-Rom eğrisi, ara noktaları
// üretmeden, verilen HER noktanın tam üzerinden geçen düzgün bir eğri çizer.
export function catmullRomYolu(ctx: CanvasRenderingContext2D, noktalar: Nokta[]) {
  const n = noktalar.length;
  ctx.moveTo(noktalar[0].x, noktalar[0].y);
  if (n < 3) {
    if (n === 2) ctx.lineTo(noktalar[1].x, noktalar[1].y);
    return;
  }
  for (let i = 0; i < n - 1; i += 1) {
    const p0 = noktalar[i === 0 ? 0 : i - 1];
    const p1 = noktalar[i];
    const p2 = noktalar[i + 1];
    const p3 = noktalar[i + 2 < n ? i + 2 : n - 1];
    const k1x = p1.x + (p2.x - p0.x) / 6;
    const k1y = p1.y + (p2.y - p0.y) / 6;
    const k2x = p2.x - (p3.x - p1.x) / 6;
    const k2y = p2.y - (p3.y - p1.y) / 6;
    ctx.bezierCurveTo(k1x, k1y, k2x, k2y, p2.x, p2.y);
  }
}

export function okUcuCiz(ctx: CanvasRenderingContext2D, bas: Nokta, son: Nokta, kalinlik: number) {
  const aci = Math.atan2(son.y - bas.y, son.x - bas.x);
  const boy = 9 + kalinlik * 2;
  ctx.beginPath();
  ctx.moveTo(son.x, son.y);
  ctx.lineTo(son.x - boy * Math.cos(aci - Math.PI / 7), son.y - boy * Math.sin(aci - Math.PI / 7));
  ctx.moveTo(son.x, son.y);
  ctx.lineTo(son.x - boy * Math.cos(aci + Math.PI / 7), son.y - boy * Math.sin(aci + Math.PI / 7));
  ctx.stroke();
}

export function taramaCiz(
  ctx: CanvasRenderingContext2D,
  tarama: TaramaTipi | undefined,
  sinir: { x: number; y: number; w: number; h: number },
) {
  if (!tarama || tarama === "yok") return;
  ctx.save();
  ctx.clip();
  ctx.strokeStyle = "#64748b";
  ctx.fillStyle = "#64748b";
  ctx.lineWidth = 0.8;
  ctx.setLineDash([]);
  if (tarama === "capraz") {
    for (let bas = sinir.x - sinir.h; bas < sinir.x + sinir.w; bas += 10) {
      ctx.beginPath();
      ctx.moveTo(bas, sinir.y + sinir.h);
      ctx.lineTo(bas + sinir.h, sinir.y);
      ctx.stroke();
    }
  } else {
    for (let y = sinir.y + 5; y < sinir.y + sinir.h; y += 10) {
      for (let x = sinir.x + 5; x < sinir.x + sinir.w; x += 10) {
        ctx.beginPath(); ctx.arc(x, y, 1.1, 0, Math.PI * 2); ctx.fill();
      }
    }
  }
  ctx.restore();
}

export function sekilCiz(ctx: CanvasRenderingContext2D, sekil: Sekil) {
  // Fizik nesnesi dönüşü KENDİ yönetir: gövde döner ama etiket düz kalır.
  if (sekil.tur === "fizik") {
    fizikCiz(ctx, sekil);
    return;
  }
  const donus = sekil.donus ?? 0;
  if (Math.abs(donus) >= 0.01) {
    const merkez = sekilMerkezi(ctx, sekil);
    ctx.save();
    ctx.translate(merkez.x, merkez.y);
    ctx.rotate((donus * Math.PI) / 180);
    ctx.translate(-merkez.x, -merkez.y);
    sekilCiz(ctx, { ...sekil, donus: 0 } as Sekil);
    ctx.restore();
    return;
  }
  ctx.strokeStyle = MUREKKEP;
  ctx.fillStyle = MUREKKEP;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.setLineDash(sekil.tur !== "metin" && sekil.cizgiTipi === "kesik" ? [8, 5] : []);
  if (sekil.tur === "dogru") {
    ctx.lineWidth = sekil.kalinlik;
    ctx.beginPath();
    ctx.moveTo(sekil.x1, sekil.y1);
    ctx.lineTo(sekil.x2, sekil.y2);
    ctx.stroke();
    ctx.setLineDash([]);
    if (sekil.okUcu === "son" || sekil.okUcu === "cift")
      okUcuCiz(ctx, { x: sekil.x1, y: sekil.y1 }, { x: sekil.x2, y: sekil.y2 }, sekil.kalinlik);
    if (sekil.okUcu === "cift")
      okUcuCiz(ctx, { x: sekil.x2, y: sekil.y2 }, { x: sekil.x1, y: sekil.y1 }, sekil.kalinlik);
    return;
  }
  if (sekil.tur === "dikdortgen") {
    ctx.lineWidth = sekil.kalinlik;
    const koseler = sekil.serbestKoseler;
    const yolCiz = () => {
      ctx.beginPath();
      if (koseler) {
        ctx.moveTo(koseler[0].x, koseler[0].y);
        koseler.slice(1).forEach((n) => ctx.lineTo(n.x, n.y));
        ctx.closePath();
      } else {
        ctx.rect(sekil.x, sekil.y, sekil.w, sekil.h);
      }
    };
    yolCiz();
    ctx.stroke();
    yolCiz();
    taramaCiz(ctx, sekil.tarama, koseler ? noktaListesiKutusu(koseler) : { x: sekil.x, y: sekil.y, w: sekil.w, h: sekil.h });
    return;
  }
  if (sekil.tur === "elips") {
    ctx.lineWidth = sekil.kalinlik;
    ctx.beginPath();
    ctx.ellipse(
      sekil.x + sekil.w / 2,
      sekil.y + sekil.h / 2,
      Math.max(1, sekil.w / 2),
      Math.max(1, sekil.h / 2),
      0,
      0,
      Math.PI * 2,
    );
    ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(sekil.x + sekil.w / 2, sekil.y + sekil.h / 2, Math.max(1, sekil.w / 2), Math.max(1, sekil.h / 2), 0, 0, Math.PI * 2);
    taramaCiz(ctx, sekil.tarama, { x: sekil.x, y: sekil.y, w: sekil.w, h: sekil.h });
    return;
  }
  if (sekil.tur === "ucgen") {
    ctx.lineWidth = sekil.kalinlik;
    ctx.beginPath();
    ctx.moveTo(sekil.x1, sekil.y1);
    ctx.lineTo(sekil.x2, sekil.y2);
    ctx.lineTo(sekil.x3, sekil.y3);
    ctx.closePath();
    ctx.stroke();
    ctx.beginPath(); ctx.moveTo(sekil.x1, sekil.y1); ctx.lineTo(sekil.x2, sekil.y2); ctx.lineTo(sekil.x3, sekil.y3); ctx.closePath();
    taramaCiz(ctx, sekil.tarama, sekilGeometriKutusu(sekil));
    return;
  }
  if (sekil.tur === "cokgen") {
    ctx.lineWidth = sekil.kalinlik;
    const yolCiz = () => {
      ctx.beginPath();
      ctx.moveTo(sekil.noktalar[0].x, sekil.noktalar[0].y);
      sekil.noktalar.slice(1).forEach((n) => ctx.lineTo(n.x, n.y));
      ctx.closePath();
    };
    yolCiz();
    ctx.stroke();
    yolCiz();
    taramaCiz(ctx, sekil.tarama, noktaListesiKutusu(sekil.noktalar));
    return;
  }
  if (sekil.tur === "serbest") {
    if (sekil.noktalar.length < 2) return;
    ctx.lineWidth = sekil.kalinlik;
    ctx.beginPath();
    ctx.moveTo(sekil.noktalar[0].x, sekil.noktalar[0].y);
    for (let i = 1; i < sekil.noktalar.length - 1; i += 1) {
      const nokta = sekil.noktalar[i];
      const sonraki = sekil.noktalar[i + 1];
      ctx.quadraticCurveTo(nokta.x, nokta.y, (nokta.x + sonraki.x) / 2, (nokta.y + sonraki.y) / 2);
    }
    const son = sekil.noktalar[sekil.noktalar.length - 1];
    ctx.lineTo(son.x, son.y);
    ctx.stroke();
    return;
  }
  if (sekil.tur === "dalga") {
    if (sekil.noktalar.length < 2) return;
    ctx.lineWidth = sekil.kalinlik;
    ctx.beginPath();
    catmullRomYolu(ctx, sekil.noktalar);
    ctx.stroke();
    return;
  }
  if (sekil.tur === "akis") {
    akisKutusuCiz(ctx, sekil);
    return;
  }
  if (sekil.tur === "baglayici") {
    // Yolu şekil listesi olmadan hesaplayamaz — bu yüzden bağlayıcılar
    // `sekilleriCiz` içinde AYRI geçişte çiziliyor.
    //
    // BURAYA DÜŞMEK SESSİZ KAYIPTIR. Eskiden burada "zararsız, tek yol var"
    // yazıyordu; yanlıştı: dışa aktarma (soruya eklenen PNG) şekilleri tek tek
    // `sekilCiz`den geçiriyordu, yani öğretmenin ekranda gördüğü oklar KÂĞIDA
    // HİÇ BASILMIYORDU. Şekil listesi taşıyan tek giriş `sekilleriCiz`;
    // yeni bir çizim yolu açan onu çağırmalı.
    return;
  }
  ctx.setLineDash([]);
  const olcu = metinOlculeri(ctx, sekil);
  ctx.font = `${olcu.punto}px "Times New Roman", Times, serif`;
  ctx.textBaseline = "alphabetic";
  olcu.satirlar.forEach((satir, index) => fizikSatiriTabandanCiz(ctx, satir, sekil.x, sekil.y + index * olcu.punto * olcu.satirAraligi, olcu.punto));
}

/**
 * Bir çizim belgesinin TAMAMINI çizer. Şekil listesi isteyen tek giriş burası.
 *
 * NEDEN VAR: iki çizim yolu vardı — ekrandaki tuval (`tuvaleCiz`) iki geçişli
 * çiziyordu, soruya eklenen görseli üreten dışa aktarma ise şekilleri tek tek
 * `sekilCiz`den geçiriyordu. `sekilCiz` bağlayıcının yolunu hesaplayamadığı
 * için BASILAN kâğıtta oklar hiç yoktu; ekranda göründükleri için de fark
 * edilmiyordu. Artık iki yol da buradan geçiyor.
 *
 * Bağlayıcılar ÖNCE, kutular sonra: ok kutunun kenarına kadar gidiyor ve altta
 * kalırsa dolgulu kutu okun ucunu örtüyor — dolgusuz kutuda görünmeyen, dolgu
 * seçilince ortaya çıkan bir kusur olurdu.
 */
export function sekilleriCiz(ctx: CanvasRenderingContext2D, sekiller: Sekil[]) {
  // Kareli alan ZEMİNdir: her şeyin altında çizilir (sonradan eklense de).
  const zemin = (s: Sekil) => s.tur === "fizik" && s.nesne === "kareliAlan";
  for (const sekil of sekiller) {
    if (zemin(sekil)) sekilCiz(ctx, sekil);
  }
  for (const sekil of sekiller) {
    if (sekil.tur === "baglayici") baglayiciCiz(ctx, sekiller, sekil);
  }
  for (const sekil of sekiller) {
    if (sekil.tur !== "baglayici" && !zemin(sekil)) sekilCiz(ctx, sekil);
  }
}

export function tuvaleCiz(
  ctx: CanvasRenderingContext2D,
  sekiller: Sekil[],
  taslak: Sekil | null,
  seciliIds: string[],
  seciliGoster: boolean,
  izgaraGoster = false,
  secimKutusu: { x: number; y: number; w: number; h: number } | null = null,
  hizalamaCizgileri: HizalamaCizgileri = { dikey: [], yatay: [] },
  olcu: TuvalOlcusu = VARSAYILAN_TUVAL,
) {
  const tuvalW = olcu.w;
  const tuvalH = olcu.h;
  ctx.clearRect(0, 0, tuvalW, tuvalH);
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, tuvalW, tuvalH);
  if (izgaraGoster) {
    ctx.save();
    ctx.strokeStyle = "#e2e8f0";
    ctx.lineWidth = 1;
    for (let x = IZGARA_ARALIK; x < tuvalW; x += IZGARA_ARALIK) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, tuvalH); ctx.stroke();
    }
    for (let y = IZGARA_ARALIK; y < tuvalH; y += IZGARA_ARALIK) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(tuvalW, y); ctx.stroke();
    }
    ctx.restore();
  }
  sekilleriCiz(ctx, sekiller);
  if (taslak) sekilCiz(ctx, taslak);
  if (seciliGoster && seciliIds.length) {
    for (const secilen of sekiller.filter((s) => seciliIds.includes(s.id))) {
      const ham = sekilHamSinirlari(ctx, secilen);
      const merkez = { x: ham.x + ham.w / 2, y: ham.y + ham.h / 2 };
      const donus = secilen.donus ?? 0;
      const koseler = [
        { x: ham.x, y: ham.y }, { x: ham.x + ham.w, y: ham.y },
        { x: ham.x + ham.w, y: ham.y + ham.h }, { x: ham.x, y: ham.y + ham.h },
      ].map((n) => noktaDondur(n, merkez, donus));
      ctx.save();
      ctx.strokeStyle = "#2563eb";
      ctx.lineWidth = 1.5;
      ctx.setLineDash([5, 3]);
      ctx.beginPath();
      ctx.moveTo(koseler[0].x, koseler[0].y);
      koseler.slice(1).forEach((n) => ctx.lineTo(n.x, n.y));
      ctx.closePath();
      ctx.stroke();
      ctx.setLineDash([]);
      const tutamaclar = seciliIds.length === 1 ? sekilTutamaclari(ctx, secilen) : [];
      if (tutamaclar.length) {
        for (const t of tutamaclar) {
          if (t.id === "dondur") {
            ctx.fillStyle = "#ffffff";
            const ustOrta = noktaDondur({ x: merkez.x, y: ham.y }, merkez, donus);
            ctx.beginPath(); ctx.moveTo(ustOrta.x, ustOrta.y); ctx.lineTo(t.x, t.y); ctx.stroke();
            ctx.beginPath(); ctx.arc(t.x, t.y, TUTAMAC_BOYUT / 2, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
            continue;
          }
          const degiyor = typeof t.id === "string" && t.id.startsWith("nokta-")
            && noktaBaskaSekleDegiyorMu(ctx, sekiller, secilen.id, t);
          if (degiyor) {
            ctx.fillStyle = "#16a34a";
            ctx.beginPath();
            ctx.arc(t.x, t.y, TUTAMAC_BOYUT / 2 + 1, 0, Math.PI * 2);
            ctx.fill();
          } else {
            ctx.fillStyle = "#ffffff";
            ctx.fillRect(t.x - TUTAMAC_BOYUT / 2, t.y - TUTAMAC_BOYUT / 2, TUTAMAC_BOYUT, TUTAMAC_BOYUT);
            ctx.strokeRect(t.x - TUTAMAC_BOYUT / 2, t.y - TUTAMAC_BOYUT / 2, TUTAMAC_BOYUT, TUTAMAC_BOYUT);
          }
        }
      }
      ctx.restore();
    }
    if (seciliIds.length > 1) {
      const secilenler = sekiller.filter((s) => seciliIds.includes(s.id));
      const sinir = birlesikSinir(ctx, secilenler);
      const tutamac = { x: sinir.x + sinir.w / 2, y: sinir.y - 26 };
      ctx.save();
      ctx.strokeStyle = "#1d4ed8";
      ctx.fillStyle = "#ffffff";
      ctx.lineWidth = 1.5;
      ctx.setLineDash([7, 4]);
      ctx.strokeRect(sinir.x, sinir.y, sinir.w, sinir.h);
      ctx.setLineDash([]);
      ctx.beginPath(); ctx.moveTo(sinir.x + sinir.w / 2, sinir.y); ctx.lineTo(tutamac.x, tutamac.y); ctx.stroke();
      ctx.beginPath(); ctx.arc(tutamac.x, tutamac.y, TUTAMAC_BOYUT / 2, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.restore();
    }
  }
  if (secimKutusu) {
    ctx.save();
    ctx.fillStyle = "rgba(37, 99, 235, .08)";
    ctx.strokeStyle = "#2563eb";
    ctx.lineWidth = 1;
    ctx.setLineDash([5, 3]);
    ctx.fillRect(secimKutusu.x, secimKutusu.y, secimKutusu.w, secimKutusu.h);
    ctx.strokeRect(secimKutusu.x, secimKutusu.y, secimKutusu.w, secimKutusu.h);
    ctx.restore();
  }
  if (hizalamaCizgileri.dikey.length || hizalamaCizgileri.yatay.length) {
    ctx.save();
    ctx.strokeStyle = "#ec4899";
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 3]);
    for (const c of hizalamaCizgileri.dikey) {
      ctx.beginPath(); ctx.moveTo(c.x, c.y1); ctx.lineTo(c.x, c.y2); ctx.stroke();
    }
    for (const c of hizalamaCizgileri.yatay) {
      ctx.beginPath(); ctx.moveTo(c.x1, c.y); ctx.lineTo(c.x2, c.y); ctx.stroke();
    }
    ctx.restore();
  }
}


// ── Akış şeması kutusu ─────────────────────────────────────────────────────

/**
 * Metni kutunun içine SARARAK böler.
 *
 * Öğretmenin girdiği satır sonları KORUNUR (elle kırdığı yer anlamlıdır);
 * her satır ayrıca genişliğe göre kelime kelime sarılır. Tek bir kelime
 * genişliğe sığmıyorsa kırpılmaz — taşar. Bunu tercih ettim çünkü kelimeyi
 * ortadan bölmek ("LoopCondi- tion") akış şemasında okunurluğu daha çok
 * bozuyor; kutuyu büyütmek öğretmenin elinde.
 */
export function akisMetniniSar(
  ctx: CanvasRenderingContext2D,
  metin: string,
  maksGenislik: number,
): string[] {
  const sonuc: string[] = [];
  for (const hamSatir of metin.split("\n")) {
    const kelimeler = hamSatir.split(/\s+/).filter(Boolean);
    if (kelimeler.length === 0) {
      sonuc.push("");
      continue;
    }
    let satir = kelimeler[0];
    for (const kelime of kelimeler.slice(1)) {
      const aday = `${satir} ${kelime}`;
      if (ctx.measureText(aday).width <= maksGenislik) satir = aday;
      else {
        sonuc.push(satir);
        satir = kelime;
      }
    }
    sonuc.push(satir);
  }
  return sonuc;
}

function akisYoluKur(ctx: CanvasRenderingContext2D, sekil: Sekil & { tur: "akis" }) {
  const { x, y, w, h } = sekil;
  ctx.beginPath();
  if (sekil.akisSekli === "baslangic") {
    const r = Math.min(h / 2, w / 2);
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.arcTo(x + w, y, x + w, y + r, r);
    ctx.lineTo(x + w, y + h - r);
    ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
    ctx.lineTo(x + r, y + h);
    ctx.arcTo(x, y + h, x, y + h - r, r);
    ctx.lineTo(x, y + r);
    ctx.arcTo(x, y, x + r, y, r);
    ctx.closePath();
    return;
  }
  if (sekil.akisSekli === "belge") {
    // Alt kenar dalgalı: klasik "çıktı belgesi" simgesi.
    const dalga = Math.min(h * 0.16, 14);
    ctx.moveTo(x, y);
    ctx.lineTo(x + w, y);
    ctx.lineTo(x + w, y + h - dalga);
    ctx.bezierCurveTo(
      x + w * 0.75, y + h - dalga * 2.1,
      x + w * 0.25, y + h + dalga * 0.9,
      x, y + h - dalga,
    );
    ctx.closePath();
    return;
  }
  const koseler = akisKutusuKosaleri(sekil);
  ctx.moveTo(koseler[0].x, koseler[0].y);
  for (const k of koseler.slice(1)) ctx.lineTo(k.x, k.y);
  ctx.closePath();
}

/**
 * Kutunun içine denklem çizer — metnin yerine.
 *
 * ÖLÇEK: denklem kendi puntosunda ölçülüp kutunun iç alanına SIĞDIRILIYOR
 * (`ctx.scale`). Punto'yu düşürerek küçültmek yanlış olurdu: motorda 7 pt'lik
 * bir taban var (`TABAN_PUNTO`) ve iç içe alanlar oraya çarpınca denklem
 * ORANTISIZ bozulur — kesir çizgisi kalınlaşır, üsler tabanla eşitlenir.
 * Dönüşümle küçültmek şeklin oranını korur.
 *
 * Kutudan BÜYÜK çizilmez ama küçükse büyütülmez de (ölçek en fazla 1):
 * öğretmenin seçtiği punto kâğıttaki gerçek boyut.
 */
function akisDenklemiCiz(
  ctx: CanvasRenderingContext2D,
  sekil: Sekil & { tur: "akis" },
  belge: DenklemBelgesi,
) {
  const oran = AKIS_IC_GENISLIK_ORANI[sekil.akisSekli] ?? 1;
  const icGenislik = Math.max(10, sekil.w * oran - AKIS_IC_PAY * 2);
  const icYukseklik = Math.max(10, sekil.h * oran - AKIS_IC_PAY * 2);
  const olcu = denklemOlcusu(ctx, belge.punto, belge.parcalar);
  if (olcu.w <= 0 || olcu.h <= 0) return;
  const olcek = Math.min(1, icGenislik / olcu.w, icYukseklik / olcu.h);
  ctx.save();
  ctx.translate(
    sekil.x + sekil.w / 2 - (olcu.w * olcek) / 2,
    sekil.y + sekil.h / 2 - (olcu.h * olcek) / 2,
  );
  ctx.scale(olcek, olcek);
  denklemiCiz(ctx, belge.punto, belge.parcalar, 0, 0);
  ctx.restore();
  // Motor kendi yazı hizasını bırakıyor; sonraki şekil metni ondan etkilenmesin.
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
}

export function akisKutusuCiz(ctx: CanvasRenderingContext2D, sekil: Sekil & { tur: "akis" }) {
  ctx.setLineDash(sekil.cizgiTipi === "kesik" ? [8, 6] : []);
  ctx.lineWidth = sekil.kalinlik;
  akisYoluKur(ctx, sekil);
  if (sekil.dolgu) {
    ctx.fillStyle = sekil.dolgu;
    ctx.fill();
  }
  ctx.strokeStyle = MUREKKEP;
  ctx.stroke();
  ctx.setLineDash([]);

  if (sekil.denklem?.parcalar.length) {
    akisDenklemiCiz(ctx, sekil, sekil.denklem);
    return;
  }
  if (!sekil.metin.trim()) return;
  const punto = sekil.punto ?? AKIS_PUNTO;
  ctx.font = `${punto}px "Times New Roman", Times, serif`;
  ctx.fillStyle = MUREKKEP;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const oran = AKIS_IC_GENISLIK_ORANI[sekil.akisSekli] ?? 1;
  const icGenislik = Math.max(10, sekil.w * oran - AKIS_IC_PAY * 2);
  const satirlar = akisMetniniSar(ctx, sekil.metin, icGenislik);
  const satirYuk = punto * AKIS_SATIR_ARALIGI;
  const merkezX = sekil.x + sekil.w / 2;
  // Blok dikeyde ORTALI: ilk satırın merkezi, blok yüksekliğinin yarısı kadar
  // yukarıdan başlar.
  const baslangicY = sekil.y + sekil.h / 2 - ((satirlar.length - 1) * satirYuk) / 2;
  satirlar.forEach((satir, i) => ctx.fillText(satir, merkezX, baslangicY + i * satirYuk));
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
}


/** Bağlayıcıyı çizer: yol (dik/düz/yay/vektör) + ok başı + etiket. */
export function baglayiciCiz(
  ctx: CanvasRenderingContext2D,
  sekiller: Sekil[],
  sekil: Extract<Sekil, { tur: "baglayici" }>,
) {
  const yol = baglayiciYolu(sekiller, sekil);
  if (!yol) return;
  const stil = sekil.stil ?? "dik";
  const vektor = stil === "vektor";
  const renk = sekil.renk ?? MUREKKEP;
  ctx.strokeStyle = renk;
  ctx.fillStyle = renk;
  // Vektör kalın çizilir: kuvvet oku ipten/çubuktan ilk bakışta ayrılsın.
  ctx.lineWidth = vektor ? sekil.kalinlik * 1.5 : sekil.kalinlik;
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  ctx.setLineDash(sekil.cizgiTipi === "kesik" ? [8, 6] : []);
  // Yay: aynı düz yol, üstüne zikzak. Dişlerin sayısı uzunluğa göre — kısa
  // yay sıkışmasın, uzun yay seyrelmesin.
  const cizilecek =
    stil === "yay"
      ? zigzagNoktalari(yol[0], yol[yol.length - 1], Math.max(4, Math.min(16, Math.round(Math.hypot(yol[yol.length - 1].x - yol[0].x, yol[yol.length - 1].y - yol[0].y) / 14))), 9)
      : yol;
  ctx.beginPath();
  ctx.moveTo(cizilecek[0].x, cizilecek[0].y);
  for (const n of cizilecek.slice(1)) ctx.lineTo(n.x, n.y);
  ctx.stroke();
  ctx.setLineDash([]);

  // Ok ucu: akış okunda eskisi gibi varsayılan "son"; ip/yay'da varsayılan YOK
  // (ipin ucunda ok olmaz), vektörde "son".
  const okUcu = sekil.okUcu ?? (stil === "duz" || stil === "yay" ? "yok" : "son");
  const okBoyu = vektor ? BAGLAYICI_OK_BOYU + sekil.kalinlik * 2 : BAGLAYICI_OK_BOYU;
  if (okUcu === "son" || okUcu === "cift") okBasiCiz(ctx, yol[yol.length - 2], yol[yol.length - 1], okBoyu);
  if (okUcu === "cift") okBasiCiz(ctx, yol[1], yol[0], okBoyu);

  const etiket = sekil.etiket?.trim();
  if (etiket) {
    const orta = yolOrtaNoktasi(yol);
    if (vektor || stil === "yay") {
      // Vektör/yay etiketi çizginin YANINA yazılır (F, mg, k…): üstüne beyaz kutu
      // koymak okun gövdesini / yayın dişlerini keserdi.
      const a = yol[0];
      const b = yol[yol.length - 1];
      const uzunluk = Math.hypot(b.x - a.x, b.y - a.y) || 1;
      const nx = (b.y - a.y) / uzunluk;
      const ny = -(b.x - a.x) / uzunluk;
      const olcu = fizikMetniOlcu(ctx, etiket, BAGLAYICI_ETIKET_PUNTO + 3);
      const ofset = 12 + Math.abs(nx) * olcu.w / 2 + Math.abs(ny) * olcu.h / 2;
      fizikMetniCiz(ctx, etiket, orta.x + nx * ofset, orta.y + ny * ofset, BAGLAYICI_ETIKET_PUNTO + 3, "orta", sekil.renk);
    } else {
      const olcu = fizikMetniOlcu(ctx, etiket, BAGLAYICI_ETIKET_PUNTO);
      // Etiketin ARKASI beyazla siliniyor: çizginin üstünde okunmuyordu.
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(orta.x - olcu.w / 2 - 3, orta.y - olcu.h / 2 - 2, olcu.w + 6, olcu.h + 4);
      fizikMetniCiz(ctx, etiket, orta.x, orta.y, BAGLAYICI_ETIKET_PUNTO, "orta", sekil.renk);
    }
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
  }
}

function okBasiCiz(ctx: CanvasRenderingContext2D, onceki: Nokta, uc: Nokta, boy = BAGLAYICI_OK_BOYU) {
  const aci = Math.atan2(uc.y - onceki.y, uc.x - onceki.x);
  const b = boy;
  ctx.beginPath();
  ctx.moveTo(uc.x, uc.y);
  ctx.lineTo(uc.x - b * Math.cos(aci - Math.PI / 7), uc.y - b * Math.sin(aci - Math.PI / 7));
  ctx.lineTo(uc.x - b * Math.cos(aci + Math.PI / 7), uc.y - b * Math.sin(aci + Math.PI / 7));
  ctx.closePath();
  ctx.fill();
}
