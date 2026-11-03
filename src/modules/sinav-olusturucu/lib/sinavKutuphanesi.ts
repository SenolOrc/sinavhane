// Sınav kütüphanesi: aktif sınav işaretçisi, metadata türetme ve kütüphane
// öncesi tek slottan göç.
//
// Ekranın (SinavOlusturucuScreen) zaten 3.200 satır olması nedeniyle bu mantık
// bilinçli olarak dışarıda tutuldu; buradaki her şey saf ya da dar kapsamlı ve
// ayrı test edilebilir.

import {
  sinavBul,
  sinavEkle,
  sinavGuncelle,
  sinavSil,
  sinavlarGetir,
} from "@/db/repo";
import type { SinavKaydi } from "@shared/types";
import {
  eskiTekSlotuOku,
  eskiTekSlotuTemizle,
  sinavIcerigiKaydet,
  sinavIcerigiOku,
} from "../storage/taslakDepo";
import { SATIR_MM } from "../constants";
import type { SinavTaslagi } from "../types";
import { mantiksalSoruGruplari } from "../utils";
import { okulProfiliOku } from "@/lib/useEokulProfil";

const AKTIF_SINAV_ANAHTARI = "ogretmen-asistani.sinav-olusturucu.aktif-sinav.v1";

export function aktifSinavIdOku(): string | null {
  try {
    return localStorage.getItem(AKTIF_SINAV_ANAHTARI);
  } catch {
    return null;
  }
}

export function aktifSinavIdYaz(id: string | null): void {
  try {
    if (id) localStorage.setItem(AKTIF_SINAV_ANAHTARI, id);
    else localStorage.removeItem(AKTIF_SINAV_ANAHTARI);
  } catch {
    // İkincil tercih; yazılamaması akışı bozmaz.
  }
}

/** Liste başlığı. Öğretmen ad vermediyse başlık alanlarından türetilir. */
export function sinavAdiTuret(taslak: SinavTaslagi): string {
  const parcalar = [
    taslak.baslik.sinifSeviyesi,
    taslak.baslik.ders,
    taslak.baslik.donem,
    taslak.baslik.yaziliNo,
  ]
    .map((parca) => (parca ?? "").trim())
    .filter(Boolean);
  if (taslak.ayarlar.sinavTuru === "test" && taslak.ayarlar.testBaslik?.trim()) {
    return taslak.ayarlar.testBaslik.trim();
  }
  return parcalar.length ? parcalar.join(" · ") : "Adsız sınav";
}

/** Kaba içerik boyutu. JSON.stringify KULLANILMAZ: otomatik kayıt 2 saniyede
 *  bir çalışıyor ve MB'larca gömülü base64'ü her seferinde string'e çevirmek
 *  pahalı olurdu. Uzunluk okumaları O(soru) ve ucuz; bu değer yalnız disk
 *  göstergesi ve sınır uyarısı için kullanılıyor, muhasebe için değil. */
export function kabaBoyutBayt(taslak: SinavTaslagi): number {
  let toplam = 0;
  for (const soru of taslak.sorular) {
    toplam += soru.gorselDataUrl?.length ?? 0;
    toplam += soru.metinHtml?.length ?? 0;
    toplam += soru.altMetinHtml?.length ?? 0;
    for (const parca of soru.ekGorseller ?? []) toplam += parca.dataUrl.length;
    for (const madde of soru.maddeler) toplam += madde.metinHtml.length;
  }
  toplam += taslak.baslik.logoDataUrl?.length ?? 0;
  return toplam;
}

export function metadataTuret(
  taslak: SinavTaslagi,
  sayfaSayisi: number,
  ozelAd?: string,
): Pick<
  SinavKaydi,
  "ad" | "ders" | "sinifSeviyesi" | "donem" | "yaziliNo" | "soruSayisi" | "sayfaSayisi" | "boyutBayt"
> {
  return {
    // Öğretmen Sınavlarım ekranından elle ad verdiyse (ozelAd) o kalıcıdır;
    // aksi halde başlık alanlarından türetilmeye devam eder. Bu ayrım
    // olmadan her autosave, kullanıcının verdiği adı bir sonraki tikte ezerdi.
    ad: ozelAd?.trim() || sinavAdiTuret(taslak),
    ders: taslak.baslik.ders || undefined,
    sinifSeviyesi: taslak.baslik.sinifSeviyesi || undefined,
    donem: taslak.baslik.donem || undefined,
    yaziliNo: taslak.baslik.yaziliNo || undefined,
    // Mantıksal soru sayısı: çok sayfalı paket tek soru sayılır (kağıttaki
    // numaralandırmayla aynı kural).
    soruSayisi: mantiksalSoruGruplari(taslak.sorular).length,
    sayfaSayisi: Math.max(1, sayfaSayisi),
    boyutBayt: kabaBoyutBayt(taslak),
  };
}

/** Metadata'yı içerikle eşitler. Otomatik kayıtla birlikte çağrılır. */
export function sinavMetadatasiniEsitle(
  sinavId: string,
  taslak: SinavTaslagi,
  sayfaSayisi: number,
): void {
  sinavGuncelle(sinavId, metadataTuret(taslak, sayfaSayisi, sinavBul(sinavId)?.ozelAd));
}

/** Sınavlarım ekranından elle yeniden adlandırma. İçerik OKUNMAZ — yalnız
 *  metadata satırı güncellenir. `ozelAd` yazıldığı için bundan sonraki
 *  autosave'ler artık başlık alanlarından ad türetmeyi bırakır. */
export function sinavYenidenAdlandir(id: string, yeniAd: string): void {
  const temiz = yeniAd.trim();
  if (!temiz) throw new Error("Sınav adı boş olamaz.");
  sinavGuncelle(id, { ad: temiz, ozelAd: temiz });
}

/** Boş bir sınav taslağı — SinavOlusturucuScreen'in ilk montajda ürettiğiyle
 *  aynı varsayılanlar (bkz. Screen VARSAYILAN_BOLUMLER ve useState başlangıçları). */
export function bosSinavTaslagiOlustur(): SinavTaslagi {
  return {
    surum: "v0.11C",
    kayitZamani: new Date().toISOString(),
    baslik: {
      // Ayarlar → Okul profili'nden (boşsa boş kalır).
      okulAdi: okulProfiliOku().okulAdi,
      sinifSeviyesi: "",
      donem: "",
      yaziliNo: "",
      ders: "",
      tarih: "",
      sureDakika: "",
    },
    sorular: [],
    ayarlar: {
      kenarBosluk: 10,
      varsayilanSoruBosluk: 4 * SATIR_MM,
      ogretmenler: [""],
      sayfaNoGoster: true,
      sayfaDuzeni: "cift",
      sutunAra: 8,
      sutunAyirici: true,
    },
  };
}

/** Sınavlarım ekranındaki "Yeni sınav" eylemi: kütüphaneye boş bir kayıt
 *  ekler, içeriğini yazar ve aktif işaretçiyi ona taşır. Aktif sınır
 *  doluysa `sinavEkle` içindeki hata aynen yükselir — çağıran taraf
 *  (SinavlarimScreen) bunu "bir sınavı arşivleyin" yönlendirmesi için kullanır. */
export async function yeniSinavOlusturVeAktifYap(): Promise<SinavKaydi> {
  const bos = bosSinavTaslagiOlustur();
  const kayit = sinavEkle(metadataTuret(bos, 1));
  try {
    await sinavIcerigiKaydet(kayit.id, { ...bos, id: kayit.id });
  } catch (err) {
    // Metadata yazıldı ama içerik yazılamadı: yarım kayıt bırakma (föy kalıbı).
    sinavSil(kayit.id);
    throw err;
  }
  aktifSinavIdYaz(kayit.id);
  return kayit;
}

/** Sınavlarım → "Çoğalt": aynı sınavın bağımsız bir kopyası (B grubu, başka şube,
 *  gelecek yıl). Eskiden öğretmen dışa aktar → içe aktar yapıyordu; içe aktarım
 *  parmak izi aynı olduğu için bu da reddediliyordu. Aktif işaretçiyi kopyaya
 *  taşır. İçerik yazılamazsa metadata geri alınır (föy kalıbı). */
export async function sinavCogalt(id: string): Promise<SinavKaydi> {
  const kaynak = sinavBul(id);
  if (!kaynak) throw new Error("Sınav bulunamadı.");
  const icerik = await sinavIcerigiOku(id);
  if (!icerik) throw new Error("Sınavın içeriği okunamadı; kopya oluşturulmadı.");
  const ad = `${kaynak.ad} (kopya)`;
  const { id: _eskiId, olusturma: _o, guncelleme: _g, iceAktarimParmakIzi: _p, arsiv: _a, ...meta } = kaynak;
  void _eskiId; void _o; void _g; void _p; void _a;
  const kayit = sinavEkle({ ...meta, ad, ozelAd: ad });
  try {
    await sinavIcerigiKaydet(kayit.id, { ...icerik, id: kayit.id, kayitZamani: new Date().toISOString() });
  } catch (err) {
    sinavSil(kayit.id);
    throw err;
  }
  aktifSinavIdYaz(kayit.id);
  return kayit;
}

/** Dış dosyadan doğrulanmış/kimlikleri yenilenmiş sınavı YENİ bir yerel kayıt
 * olarak atomik kurar. Mevcut aktif sınava dokunmaz; hata olursa metadata da
 * geri alınır. */
export async function iceAktarilanSinaviYeniKayitYap(
  taslak: SinavTaslagi,
  iceAktarimParmakIzi?: string,
): Promise<{ kayit: SinavKaydi; taslak: SinavTaslagi }> {
  const ayniKayit = iceAktarimParmakIzi
    ? sinavlarGetir().find((sinav) => sinav.iceAktarimParmakIzi === iceAktarimParmakIzi)
    : undefined;
  if (ayniKayit) {
    throw new Error(`Bu sınav daha önce “${ayniKayit.ad}” adıyla içe aktarılmış. Kopya oluşturulmadı.`);
  }
  const kayit = sinavEkle({ ...metadataTuret(taslak, 1), iceAktarimParmakIzi });
  const yerelTaslak = { ...taslak, id: kayit.id, kayitZamani: new Date().toISOString() };
  try {
    await sinavIcerigiKaydet(kayit.id, yerelTaslak);
  } catch (err) {
    sinavSil(kayit.id);
    throw err;
  }
  aktifSinavIdYaz(kayit.id);
  return { kayit, taslak: yerelTaslak };
}


/** Editördeki mount-fallback ile AYNI kural: kayıtlı işaretçi geçersizse ya da
 *  arşivliyse, en son güncellenen arşivlenmemiş sınav seçilir. Sınavlarım
 *  ekranı, aktif sınavı silme/arşivleme sonrası "Aktif" rozetini editörle
 *  tutarlı tutmak için bunu kullanır (bkz. SinavOlusturucuScreen aktifSinaviHazirla). */
export function otomatikAktifSinaviSec(): SinavKaydi | undefined {
  return sinavlarGetir()
    .filter((sinav) => !sinav.arsiv)
    .sort((a, b) => (a.guncelleme < b.guncelleme ? 1 : -1))[0];
}

/** Kütüphane öncesi TEK SLOT'u kütüphaneye taşır.
 *
 *  İdempotent: eski anahtar yoksa ya da içerik anlamsızsa hiçbir şey yapmaz.
 *  Göç başarılı olursa eski anahtar temizlenir ki ikinci açılışta kopya
 *  üretmesin. Kayıt oluşturulup içerik yazılamazsa metadata geri alınır —
 *  yarım sınav bırakılmaz (föy içe aktarımındaki kalıp). */
export async function eskiTekSlotuGocur(
  anlamliMi: (taslak: SinavTaslagi) => boolean,
  sayfaSayisiTahmini = 1,
): Promise<SinavKaydi | null> {
  const eski = await eskiTekSlotuOku();
  if (!eski) return null;
  if (!anlamliMi(eski)) {
    await eskiTekSlotuTemizle();
    return null;
  }
  // Aynı id zaten kütüphanedeyse (yarım kalmış göç) yeniden ekleme.
  const mevcut = eski.id ? sinavlarGetir().find((s) => s.id === eski.id) : undefined;
  if (mevcut) {
    await eskiTekSlotuTemizle();
    return mevcut;
  }
  const kayit = sinavEkle({ ...metadataTuret(eski, sayfaSayisiTahmini), id: eski.id });
  try {
    await sinavIcerigiKaydet(kayit.id, { ...eski, id: kayit.id });
  } catch (err) {
    // Metadata yazıldı ama içerik yazılamadı: kaydı geri al.
    sinavSil(kayit.id);
    throw err;
  }
  await eskiTekSlotuTemizle();
  return kayit;
}
