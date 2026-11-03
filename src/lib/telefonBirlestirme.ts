import type { IslemeZarfi } from '@shared/islemeZarfi';
import type { GunlukKayit, GunlukIslendi, OdevPuani, Ogrenci, Sinif, Kriter, OdevKaydi } from '@shared/types';

export interface TelefonVerisi {
  siniflar: Sinif[]; ogrenciler: Ogrenci[]; kriterler: Kriter[]; odevler: OdevKaydi[];
  gunlukKayitlar: GunlukKayit[]; gunlukIslendi: GunlukIslendi[]; odevPuanlari: OdevPuani[]; sonGunlukId: number;
  /** db/repo.ts::DersYapilmadi ile aynı biçim (eski testlerde alan yok). */
  dersYapilmadi?: Array<{ sinifId: number; tarih: string; neden: string }>;
  /** db/repo.ts::GelmediKaydi ("Yok"); eski testlerde alan yok. */
  gelmedi?: Array<{ sinifId: number; ogrenciId: number; tarih: string }>;
}
export interface TelefonGunNotu { sinifAd: string; tarih: string; neden: string }
export interface TelefonDegisikligi {
  tur: 'gunluk' | 'odev'; sinifAd: string; no: string; adSoyad: string; alan: string; tarih: string;
  onceki: number | string | null; yeni: number | string | null; cakisma: boolean;
  /** Yalnız günlük işaretlerde: değeri insan diliyle göstermek için. */
  kriterTip?: Kriter['tip'];
}
export interface TelefonPlan {
  veri: TelefonVerisi; degisiklikler: TelefonDegisikligi[];
  atlanan: number; zatenVar: number; yeniGun: number;
  /** Telefonda işaretsiz ("hepsi tamam") kaydedilen ders sayısı. */
  bosGun: number;
  /** Bilgisayarda "ders yapılmadı" iken telefondan İŞLENEN günler: işaret kalkar. */
  yapilmadiKalkan: TelefonGunNotu[];
  /** Telefondan "ders yapılmadı" diye gelen günler. */
  yeniYapilmadi: TelefonGunNotu[];
  /** O günde öğrenci işareti kaldığı için "yapılmadı" uygulanamayan günler. */
  yapilmadiReddedilen: TelefonGunNotu[];
  /** "Yok" listesi değişen günler (sınıf · tarih · yeni yok sayısı). */
  gelmediDegisen: Array<{ sinifAd: string; tarih: string; sayi: number }>;
}

/**
 * Telefondan gelen günlük değeri masaüstünün yazdığı değere çevirir.
 *
 * NEDEN (2026-09 hatası): telefon her işareti +1/−1 yazıyordu, masaüstü ise
 *  • durum kriterinde (kitap/defter) "getirmedi"yi deger 0 yazıyor ve bu kriterde
 *    HERHANGİ bir kaydı "getirmedi" sayıyor → telefondaki "+ getirdi" öğrencinin
 *    kitap puanını DÜŞÜRÜYORDU;
 *  • artı/eksi kriterlerde Ayarlar'daki puanı (+2/−2) yazıyor → telefondan gelen
 *    işaret masaüstündekinin yarısı kadar etki ediyordu.
 * Kural: durum → "getirmedi" = 0, "getirdi" (>0) = kayıt yok. Artı/eksi → kriterin
 * puanı; ters yönlü değer (artı kritere eksi) kayıt yok sayılır.
 */
export function telefonGunlukDegeri(kriter: Pick<Kriter, 'tip' | 'puanDegeri'>, d: number | null): number | null {
  if (d === null) return null;
  if (kriter.tip === 'durum') return d > 0 ? null : 0;
  if (kriter.tip === 'arti') return d > 0 ? (kriter.puanDegeri > 0 ? kriter.puanDegeri : d) : null;
  return d < 0 ? (kriter.puanDegeri < 0 ? kriter.puanDegeri : d) : null;
}

/** Önizleme ve yazma AYNI planı kullanır. Boş alan silme sayılmaz; silme açık işlemdir. */
export function telefonPlani(veri: TelefonVerisi, zarf: IslemeZarfi, telefonKazanir = false): TelefonPlan {
  const v = { ...veri, gunlukKayitlar: [...veri.gunlukKayitlar], gunlukIslendi: [...veri.gunlukIslendi], odevPuanlari: [...veri.odevPuanlari], dersYapilmadi: [...(veri.dersYapilmadi ?? [])], gelmedi: [...(veri.gelmedi ?? [])] };
  const p: TelefonPlan = { veri: v, degisiklikler: [], atlanan: 0, zatenVar: 0, yeniGun: 0, bosGun: 0, yapilmadiKalkan: [], yeniYapilmadi: [], yapilmadiReddedilen: [], gelmediDegisen: [] };
  const gorulen = new Set<string>();
  function uygula(tur: 'gunluk' | 'odev', sinifId: number, no: string, alanId: number, tarih: string,
    yeni: number | OdevPuani['puan'] | null, temel: number | OdevPuani['puan'] | null | undefined, donem: 1 | 2) {
    const ogrenci = v.ogrenciler.find(o => o.sinifId === sinifId && String(o.no) === no);
    const sinif = v.siniflar.find(s => s.id === sinifId);
    const alan = tur === 'gunluk' ? v.kriterler.find(k => k.id === alanId) : v.odevler.find(o => o.id === alanId && o.sinifId === sinifId && o.kaynak !== 'mebi');
    if (!ogrenci || !sinif || !alan) { p.atlanan++; return; }
    if (tur === 'gunluk') {
      const k = alan as Kriter;
      yeni = telefonGunlukDegeri(k, yeni as number | null);
      if (temel !== undefined) temel = telefonGunlukDegeri(k, temel as number | null);
    }
    if (tur === 'odev' && yeni !== null) {
      const mod = (alan as OdevKaydi).mod ?? 'puan';
      if ((mod === 'puan' && (yeni === '+' || yeni === '-')) || (mod === 'isaret' && typeof yeni === 'number')) { p.atlanan++; return; }
    }
    const id = `${tur}|${sinifId}|${no}|${alanId}|${tarih}`;
    if (gorulen.has(id)) throw new Error('Zarfta aynı alan için birden fazla işlem var.');
    gorulen.add(id);
    const mevcut = tur === 'gunluk'
      ? v.gunlukKayitlar.find(k => k.ogrenciId === ogrenci.id && k.tarih === tarih && k.kriterId === alanId)
      : v.odevPuanlari.find(k => k.ogrenciId === ogrenci.id && k.odevId === alanId);
    const eski = mevcut ? ('deger' in mevcut ? mevcut.deger : mevcut.puan) : null;
    // Karşılaştırma NORMAL değerle: eski telefonların yazdığı −1 durum kaydı
    // masaüstünün 0'ı ile aynı anlamdadır. Ama "yok" sayılan bir kayıt gerçekten
    // duruyorsa (eski "+ getirdi") silme yine yapılır.
    const eskiN = tur === 'gunluk' ? telefonGunlukDegeri(alan as Kriter, eski as number | null) : eski;
    if (eskiN === yeni && !(yeni === null && mevcut)) { p.zatenVar++; return; }
    const cakisma = temel === undefined ? eskiN !== null : eskiN !== temel;
    p.degisiklikler.push({ tur, sinifAd: sinif.ad, no, adSoyad: ogrenci.adSoyad, alan: alan.ad, tarih, onceki: eski, yeni, cakisma, ...(tur === 'gunluk' ? { kriterTip: (alan as Kriter).tip } : {}) });
    if (cakisma && !telefonKazanir) return;
    if (tur === 'gunluk') {
      const k = mevcut as GunlukKayit | undefined;
      if (k) v.gunlukKayitlar = v.gunlukKayitlar.filter(x => x.id !== k.id);
      if (yeni !== null) v.gunlukKayitlar.push({ id: k?.id ?? ++v.sonGunlukId, ogrenciId: ogrenci.id, tarih, kriterId: alanId, deger: yeni as number, donem });
    } else {
      v.odevPuanlari = v.odevPuanlari.filter(x => x.odevId !== alanId || x.ogrenciId !== ogrenci.id);
      if (yeni !== null) v.odevPuanlari.push({ ...(mevcut as OdevPuani | undefined), odevId: alanId, ogrenciId: ogrenci.id, puan: yeni as OdevPuani['puan'] });
    }
  }
  for (const g of zarf.gunler) {
    if (!v.siniflar.some(s => s.id === g.sinifId)) { p.atlanan += Math.max(1, g.istisnalar.length + (g.silinenler?.length ?? 0)); continue; }
    for (const i of g.istisnalar) uygula('gunluk', g.sinifId, i.no, i.kriterId, g.tarih, i.deger, i.onceki, g.donem);
    for (const i of g.silinenler ?? []) uygula('gunluk', g.sinifId, i.no, i.kriterId, g.tarih, null, i.onceki, g.donem);
    const sinifAd = v.siniflar.find(s => s.id === g.sinifId)!.ad;
    const mevcutY = v.dersYapilmadi.find(d => d.sinifId === g.sinifId && d.tarih === g.tarih);
    if (g.yapilmadi) {
      // Masaüstündeki dersYapilmadiIsaretle ile aynı kural: işaret kalan gün yapılmış sayılır.
      const ids = new Set(v.ogrenciler.filter(o => o.sinifId === g.sinifId).map(o => o.id));
      if (v.gunlukKayitlar.some(k => k.tarih === g.tarih && ids.has(k.ogrenciId))) {
        p.yapilmadiReddedilen.push({ sinifAd, tarih: g.tarih, neden: g.yapilmadi });
        continue;
      }
      if (mevcutY?.neden === g.yapilmadi) { p.zatenVar++; continue; }
      v.dersYapilmadi = [...v.dersYapilmadi.filter(d => d !== mevcutY), { sinifId: g.sinifId, tarih: g.tarih, neden: g.yapilmadi }];
      v.gunlukIslendi = v.gunlukIslendi.filter(x => !(x.sinifId === g.sinifId && x.tarih === g.tarih));
      p.yeniYapilmadi.push({ sinifAd, tarih: g.tarih, neden: g.yapilmadi });
      continue;
    }
    if (g.gelmedi !== undefined) {
      // Telefon o günün TAM "Yok" listesini gönderir → sınıf+tarih için ezilir
      // (masaüstü gelmediKaydet ile aynı). Listede olmayan numara atlanır.
      const ogr = v.ogrenciler.filter(o => o.sinifId === g.sinifId);
      const yeniIdler = g.gelmedi.flatMap(no => { const o = ogr.find(x => String(x.no) === no); if (!o) { p.atlanan++; return []; } return [o.id]; });
      const eskiIdler = v.gelmedi!.filter(x => x.sinifId === g.sinifId && x.tarih === g.tarih).map(x => x.ogrenciId);
      const ayni = eskiIdler.length === yeniIdler.length && yeniIdler.every(id => eskiIdler.includes(id));
      if (!ayni) {
        v.gelmedi = [...v.gelmedi!.filter(x => !(x.sinifId === g.sinifId && x.tarih === g.tarih)), ...yeniIdler.map(ogrenciId => ({ sinifId: g.sinifId, ogrenciId, tarih: g.tarih }))];
        // Gelmeyen öğrencinin o günkü eski işaretleri kalkar (Hızlı İşleme ile aynı kural).
        const yokSet = new Set(yeniIdler);
        v.gunlukKayitlar = v.gunlukKayitlar.filter(k => !(k.tarih === g.tarih && yokSet.has(k.ogrenciId)));
        p.gelmediDegisen.push({ sinifAd, tarih: g.tarih, sayi: yeniIdler.length });
      }
    }
    if (g.istisnalar.length === 0 && !(g.silinenler?.length)) p.bosGun++;
    if (mevcutY) {
      // Telefonda bu gün işlendi → ders yapılmıştır. Masaüstünde gunuIsaretle de böyle yapar.
      v.dersYapilmadi = v.dersYapilmadi.filter(d => d !== mevcutY);
      p.yapilmadiKalkan.push({ sinifAd, tarih: g.tarih, neden: mevcutY.neden });
    }
    if (!v.gunlukIslendi.some(x => x.sinifId === g.sinifId && x.tarih === g.tarih)) {
      v.gunlukIslendi.push({ sinifId: g.sinifId, tarih: g.tarih }); p.yeniGun++;
    }
  }
  for (const o of zarf.odevler ?? []) {
    for (const i of o.puanlar) uygula('odev', o.sinifId, i.no, o.odevId, '', i.puan, i.onceki, 1);
    for (const i of o.silinenler ?? []) uygula('odev', o.sinifId, i.no, o.odevId, '', null, i.onceki, 1);
  }
  return p;
}

/** Önizleme tablosu ve telefona dönen makbuz için okunur değer. */
export function telefonDegerMetni(d: Pick<TelefonDegisikligi, 'tur' | 'kriterTip'>, v: number | string | null): string {
  if (v === null) return d.tur === 'gunluk' && d.kriterTip === 'durum' ? 'getirdi (kayıt yok)' : 'Boş / sil';
  if (d.tur === 'gunluk' && d.kriterTip === 'durum') return 'getirmedi';
  if (typeof v === 'number' && d.tur === 'gunluk') return v > 0 ? `+${v}` : String(v);
  return String(v);
}

/** Uygulanmayan işlemler için kısa, İSİMSİZ açıklamalar (telefona makbuzla döner;
 *  makbuz diskte düz durduğu için ad soyad yazılmaz — zarf da isim taşımaz). */
export function telefonMakbuzAyrintisi(plan: TelefonPlan, telefonKazanir: boolean): string[] {
  const a: string[] = [];
  if (!telefonKazanir) for (const d of plan.degisiklikler.filter(x => x.cakisma)) {
    a.push(`${d.sinifAd} · No ${d.no} · ${d.alan}${d.tarih ? ' · ' + d.tarih : ''}: bilgisayarda farklı değer vardı (${telefonDegerMetni(d, d.onceki)}), o korundu.`);
  }
  for (const y of plan.yapilmadiReddedilen) a.push(`${y.sinifAd} · ${y.tarih}: öğrenci işareti olduğu için "ders yapılmadı" uygulanmadı.`);
  if (plan.atlanan) a.push(`${plan.atlanan} işlem eşleşmedi (öğrenci, ölçüt ya da ödev bilgisayarda artık yok).`);
  return a.slice(0, 50).map(x => x.slice(0, 200));
}

export const tarihKisa = (t: string) => t ? new Date(t + 'T00:00:00').toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', weekday: 'short' }) : '';
/** Çakışmasız zarfın tek bakışta özeti: sınıf+gün başına kaç işaret, ödev başına kaç puan. */
export function zarfOzeti(plan: TelefonPlan): string[] {
  const say = new Map<string, number>();
  for (const d of plan.degisiklikler) {
    const k = d.tur === 'gunluk' ? `${d.sinifAd} · ${tarihKisa(d.tarih)}` : `${d.sinifAd} · ${d.alan} (ödev)`;
    say.set(k, (say.get(k) ?? 0) + 1);
  }
  const satirlar = [...say].map(([k, n]) => `${k}: ${n} ${k.endsWith('(ödev)') ? 'puan' : 'işaret'}`);
  if (plan.bosGun > 0) satirlar.push(`${plan.bosGun} ders “hepsi tamam” olarak işlendi`);
  for (const y of plan.yeniYapilmadi) satirlar.push(`${y.sinifAd} · ${tarihKisa(y.tarih)}: ders yapılmadı (${y.neden})`);
  for (const y of plan.gelmediDegisen) satirlar.push(`${y.sinifAd} · ${tarihKisa(y.tarih)}: ${y.sayi ? `${y.sayi} öğrenci derse gelmedi (Yok)` : '“Yok” işaretleri kaldırıldı'}`);
  return satirlar;
}
