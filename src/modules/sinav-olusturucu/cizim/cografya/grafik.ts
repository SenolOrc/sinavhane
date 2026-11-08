// İklim ve nüfus grafikleri: sıcaklık–yağış (Walter) diyagramı ve nüfus piramidi.
import { fizikMetniCiz } from "../fizik";
import { AY_KISA, ayarMantik, ayarMetin, ayarSayilar, type CografyaVerisi } from "./sema";

type Kutu = { x: number; y: number; w: number; h: number };

const yukari = (v: number, adim: number) => Math.ceil((v + 1e-9) / adim) * adim;
const asagi = (v: number, adim: number) => Math.floor((v - 1e-9) / adim) * adim;

/** Walter ölçeği: yağış ekseni sıcaklık ekseninin 2 katı (1 °C = 2 mm). Sıcaklık ekseni 10 °C'lik adımlarla. */
export function walterOlcek(sic: number[], yag: number[]): { t0: number; t1: number; adim: number } {
  const tmin = Math.min(0, ...sic), tmax = Math.max(...sic, yag.length ? Math.max(...yag) / 2 : 0);
  const adim = 10;
  return { t0: asagi(tmin, adim), t1: Math.max(10, yukari(tmax, adim)), adim };
}

export function walterCiz(ctx: CanvasRenderingContext2D, v: CografyaVerisi, k: Kutu) {
  const sic = ayarSayilar(v, "sicaklik"), yag = ayarSayilar(v, "yagis");
  const baslik = ayarMetin(v, "baslik");
  const punto = Math.max(9, Math.min(13, k.w / 34));
  const sol = 38, sag = 42, ust = baslik ? 26 : 10, alt = ayarMantik(v, "toplam") ? 40 : 22;
  const gx = k.x + sol, gy = k.y + ust, gw = k.w - sol - sag, gh = k.h - ust - alt;
  if (gw < 40 || gh < 40) return;
  const { t0, t1, adim } = walterOlcek(sic, yag);
  const Yt = (t: number) => gy + gh - ((t - t0) / (t1 - t0)) * gh;
  const Yp = (p: number) => Yt(p / 2); // 2 mm = 1 °C
  const taban = ctx.lineWidth;
  ctx.save(); ctx.lineJoin = "round";
  if (baslik) fizikMetniCiz(ctx, baslik, k.x + k.w / 2, k.y + 10, punto * 1.15);
  // Izgara + eksenler
  ctx.lineWidth = Math.max(0.6, taban * 0.35);
  for (let t = t0; t <= t1 + 1e-9; t += adim) {
    ctx.save(); ctx.setLineDash([2, 3]); ctx.beginPath(); ctx.moveTo(gx, Yt(t)); ctx.lineTo(gx + gw, Yt(t)); ctx.stroke(); ctx.restore();
    fizikMetniCiz(ctx, `${t}`, gx - 5, Yt(t), punto * 0.85, "sag");
    fizikMetniCiz(ctx, `${t * 2}`, gx + gw + 5, Yt(t), punto * 0.85, "sol");
  }
  ctx.lineWidth = Math.max(1, taban * 0.7);
  ctx.beginPath(); ctx.moveTo(gx, gy); ctx.lineTo(gx, gy + gh); ctx.lineTo(gx + gw, gy + gh); ctx.lineTo(gx + gw, gy); ctx.stroke();
  fizikMetniCiz(ctx, "°C", gx - 5, gy - 9, punto * 0.85, "sag"); fizikMetniCiz(ctx, "mm", gx + gw + 5, gy - 9, punto * 0.85, "sol");
  const aw = gw / 12;
  const sifir = Yt(0);
  // Kurak dönem: sıcaklık eğrisi yağış eğrisinin üstündeyse (P < 2T) taranır; nemli dönem noktalanır
  const sx = (i: number) => gx + aw * (i + 0.5);
  if (ayarMantik(v, "kuru")) {
    ctx.save();
    ctx.beginPath(); ctx.rect(gx, gy, gw, gh); ctx.clip();
    for (let i = 0; i < 12; i++) {
      const i2 = Math.min(11, i + 1);
      const a0 = Yt(sic[i]), p0 = Yp(yag[i]), a1 = Yt(sic[i2]), p1 = Yp(yag[i2]);
      // Her ay aralığı için ince şeritlerle: sıcaklık > yağış → çapraz tarama
      const adet = 10;
      for (let s = 0; s < adet; s++) {
        const t = s / adet, tm = (s + 0.5) / adet;
        const ya = a0 + (a1 - a0) * t, yp = p0 + (p1 - p0) * t;
        const ym = a0 + (a1 - a0) * tm, ypm = p0 + (p1 - p0) * tm;
        if (ym < ypm) { // y aşağı doğru artar: sıcaklık çizgisi daha yukarıda = sıcaklık > yağış/2
          const x = sx(i) + (sx(i2) - sx(i)) * t, w = (sx(i2) - sx(i)) / adet;
          if (w > 0) { ctx.save(); ctx.lineWidth = Math.max(0.6, taban * 0.3); for (let yy = ya; yy < yp + 6; yy += 3.5) { ctx.beginPath(); ctx.moveTo(x, yy); ctx.lineTo(x + w, yy - 3.5); ctx.stroke(); } ctx.restore(); }
        }
      }
    }
    ctx.restore();
  }
  // Yağış çubukları
  const bw = aw * 0.52;
  for (let i = 0; i < 12; i++) {
    const x = sx(i) - bw / 2, y = Yp(yag[i]), h = sifir - y;
    ctx.save(); ctx.fillStyle = "#d0d0d0"; ctx.fillRect(x, y, bw, h); ctx.restore();
    ctx.lineWidth = Math.max(0.8, taban * 0.5); ctx.strokeRect(x, y, bw, h);
  }
  // Sıcaklık eğrisi
  ctx.lineWidth = Math.max(1.4, taban * 1.0);
  ctx.beginPath(); sic.forEach((t, i) => { if (i) ctx.lineTo(sx(i), Yt(t)); else ctx.moveTo(sx(i), Yt(t)); }); ctx.stroke();
  sic.forEach((t, i) => { ctx.beginPath(); ctx.arc(sx(i), Yt(t), 2.6, 0, Math.PI * 2); ctx.save(); ctx.fillStyle = "#fff"; ctx.fill(); ctx.restore(); ctx.stroke(); });
  // Sıfır çizgisi ve ay adları
  ctx.lineWidth = Math.max(1, taban * 0.7);
  ctx.beginPath(); ctx.moveTo(gx, sifir); ctx.lineTo(gx + gw, sifir); ctx.stroke();
  AY_KISA.forEach((a, i) => fizikMetniCiz(ctx, a, sx(i), gy + gh + 10, punto));
  if (ayarMantik(v, "toplam")) {
    const ort = sic.reduce((s, x) => s + x, 0) / 12, top = yag.reduce((s, x) => s + x, 0);
    fizikMetniCiz(ctx, `Ort. sıcaklık: ${ort.toFixed(1).replace(".", ",")} °C   Yıllık yağış: ${Math.round(top)} mm`, gx + gw / 2, gy + gh + 28, punto * 0.9);
  }
  ctx.restore();
}

export const YAS_GRUPLARI = ["0-9", "10-19", "20-29", "30-39", "40-49", "50-59", "60-69", "70-79", "80+"];

export function piramitCiz(ctx: CanvasRenderingContext2D, v: CografyaVerisi, k: Kutu) {
  const er = ayarSayilar(v, "erkek"), ka = ayarSayilar(v, "kadin");
  const baslik = ayarMetin(v, "baslik");
  const punto = Math.max(9, Math.min(13, k.w / 36));
  const ust = baslik ? 26 : 10, alt = 30;
  const enCok = Math.max(1, yukari(Math.max(...er, ...ka), 2));
  const orta = k.x + k.w / 2, yarim = k.w / 2 - 14;
  const gy = k.y + ust, gh = k.h - ust - alt;
  const sat = gh / YAS_GRUPLARI.length;
  const X = (d: number) => (d / enCok) * (yarim - 26); // 26 px yaş etiketi payı
  const taban = ctx.lineWidth;
  ctx.save(); ctx.lineJoin = "round";
  if (baslik) fizikMetniCiz(ctx, baslik, orta, k.y + 10, punto * 1.15);
  const bosluk = 18; // ortada yaş etiketi
  fizikMetniCiz(ctx, "Erkek", orta - yarim / 2, gy - 2, punto * 0.95); fizikMetniCiz(ctx, "Kadın", orta + yarim / 2, gy - 2, punto * 0.95);
  for (let i = 0; i < YAS_GRUPLARI.length; i++) {
    const y = gy + gh - sat * (i + 1) + sat * 0.1, h = sat * 0.8;
    const we = X(er[i]), wk = X(ka[i]);
    ctx.save(); ctx.fillStyle = "#bdbdbd"; ctx.fillRect(orta - bosluk - we, y, we, h); ctx.restore();
    ctx.save(); ctx.fillStyle = "#ffffff"; ctx.fillRect(orta + bosluk, y, wk, h); ctx.restore();
    ctx.lineWidth = Math.max(0.9, taban * 0.6);
    ctx.strokeRect(orta - bosluk - we, y, we, h); ctx.strokeRect(orta + bosluk, y, wk, h);
    fizikMetniCiz(ctx, YAS_GRUPLARI[i], orta, y + h / 2, punto * 0.85);
    if (ayarMantik(v, "deger")) {
      fizikMetniCiz(ctx, String(er[i]).replace(".", ","), orta - bosluk - we - 3, y + h / 2, punto * 0.75, "sag");
      fizikMetniCiz(ctx, String(ka[i]).replace(".", ","), orta + bosluk + wk + 3, y + h / 2, punto * 0.75, "sol");
    }
  }
  // Yüzde ekseni (alt)
  ctx.lineWidth = Math.max(1, taban * 0.7);
  const ay = gy + gh + 2;
  ctx.beginPath(); ctx.moveTo(orta - bosluk - X(enCok), ay); ctx.lineTo(orta - bosluk, ay); ctx.moveTo(orta + bosluk, ay); ctx.lineTo(orta + bosluk + X(enCok), ay); ctx.stroke();
  for (let d = 0; d <= enCok + 1e-9; d += enCok > 8 ? 4 : 2) {
    for (const sg of [-1, 1]) {
      const x = sg < 0 ? orta - bosluk - X(d) : orta + bosluk + X(d);
      ctx.beginPath(); ctx.moveTo(x, ay); ctx.lineTo(x, ay + 3); ctx.stroke();
      fizikMetniCiz(ctx, `%${d}`, x, ay + 11, punto * 0.8);
    }
  }
  ctx.restore();
}
