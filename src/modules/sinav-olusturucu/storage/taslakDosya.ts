import type { SinavTaslagi } from "../types";
import { dosyaKaydet } from "@/lib/dosya";
import { parolaliSinavMi, sinaviParolala, sinavParolasiniAc } from "@/lib/parolaliSinav";

function taslakDosyaAdi(taslak: SinavTaslagi) {
  const parcalar = [
    taslak.baslik.sinifSeviyesi,
    taslak.baslik.ders,
    taslak.baslik.yaziliNo,
  ]
    .filter(Boolean)
    .join("-");
  return `${parcalar || "sinav"}-taslak.oa27sinav`.replace(
    /[^a-zA-Z0-9çğıöşüÇĞİÖŞÜ.-]+/g,
    "-",
  );
}

export async function taslakDosyayaIndir(taslak: SinavTaslagi, parola: string) {
  const dogrulanmis = sinavTaslaginiDogrula(taslak);
  const sifreli = await sinaviParolala(JSON.stringify(dogrulanmis), parola);
  const blob = new Blob([sifreli], {
    type: "application/vnd.oa27.encrypted-exam+json",
  });
  await dosyaKaydet(blob, taslakDosyaAdi(taslak));
}

export const SINAV_TASLAK_DOSYA_AZAMI_BAYT = 25 * 1024 * 1024;
const AZAMI_SORU = 500;
const AZAMI_MADDE = 100;
const AZAMI_EK_GORSEL = 50;
const AZAMI_TEK_GORSEL_KARAKTER = 8 * 1024 * 1024;
const AZAMI_TOPLAM_METIN_KARAKTER = 30 * 1024 * 1024;
const AZAMI_DERINLIK = 16;
const AZAMI_DUGUM = 100_000;
const TEHLIKELI_ANAHTARLAR = new Set(["__proto__", "prototype", "constructor"]);

type Nesne = Record<string, unknown>;

export function sinavTaslakOzeti(taslak: SinavTaslagi) {
  const toplamPuan = taslak.sorular.reduce((toplam, soru) => {
    const maddePuani = soru.maddeler.filter((m) => m.puan != null).reduce((t, m) => t + (m.puan ?? 0), 0);
    return toplam + (maddePuani || soru.puan || 0);
  }, 0);
  const gorselSayisi = taslak.sorular.reduce((toplam, soru) =>
    toplam + (soru.gorselDataUrl ? 1 : 0) + (soru.ekGorseller?.length ?? 0), taslak.baslik.logoDataUrl ? 1 : 0);
  return {
    ders: taslak.baslik.ders || "Belirtilmemiş",
    sinif: taslak.baslik.sinifSeviyesi || "Belirtilmemiş",
    sinav: [taslak.baslik.donem, taslak.baslik.yaziliNo].filter(Boolean).join(" · ") || "Belirtilmemiş",
    soruSayisi: taslak.sorular.length,
    toplamPuan,
    gorselSayisi,
    surum: taslak.surum,
  };
}

/** Kimlik yenilenmeden önce çağrılır. Üst kayıt kimliği/zamanı dışarıda
 * bırakıldığı için aynı sınavın yeniden dışa aktarılmış kopyası da tanınır. */
export async function sinavTaslakParmakIzi(taslak: SinavTaslagi): Promise<string> {
  const { id: _id, kayitZamani: _kayitZamani, ...icerik } = taslak;
  const baytlar = new TextEncoder().encode(JSON.stringify(icerik));
  const ozet = await crypto.subtle.digest("SHA-256", baytlar);
  return [...new Uint8Array(ozet)].map((bayt) => bayt.toString(16).padStart(2, "0")).join("");
}

function jsonGuvenliCoz(metin: string): Promise<unknown> {
  if (metin.length < 256 * 1024 || typeof Worker === "undefined") {
    return Promise.resolve(JSON.parse(metin) as unknown);
  }
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL("./taslakJsonWorker.ts", import.meta.url), { type: "module" });
    worker.onmessage = (olay: MessageEvent<{ sonuc?: unknown; hata?: string }>) => {
      worker.terminate();
      if (olay.data.hata) reject(new Error(olay.data.hata));
      else resolve(olay.data.sonuc);
    };
    worker.onerror = () => {
      worker.terminate();
      reject(new Error("Sınav dosyası çözümlenemedi."));
    };
    worker.postMessage(metin);
  });
}

function belgeIciKimlikleriYenile<T>(deger: T, idUret: () => string): T {
  if (!deger || typeof deger !== "object") return deger;
  const kopya = structuredClone(deger);
  const harita = new Map<string, string>();
  const tara = (oge: unknown) => {
    if (Array.isArray(oge)) { oge.forEach(tara); return; }
    if (!nesneMi(oge)) return;
    if (typeof oge.id === "string") harita.set(oge.id, idUret());
    Object.values(oge).forEach(tara);
  };
  const degistir = (oge: unknown) => {
    if (Array.isArray(oge)) { oge.forEach(degistir); return; }
    if (!nesneMi(oge)) return;
    for (const [anahtar, alt] of Object.entries(oge)) {
      if (typeof alt === "string" && harita.has(alt) && (anahtar === "id" || anahtar.toLocaleLowerCase("tr-TR").endsWith("id"))) oge[anahtar] = harita.get(alt);
      else degistir(alt);
    }
  };
  tara(kopya);
  degistir(kopya);
  return kopya;
}

/** Başka cihazdan gelen taslağın hiçbir yerel kimliği bu cihaza taşınmaz.
 * Gruplama ilişkileri korunur fakat grubun kendisi de yeni kimlik alır. */
export function sinavTaslakKimlikleriniYenile(taslak: SinavTaslagi, idUret: () => string = () => crypto.randomUUID()): SinavTaslagi {
  const soruIdleri = new Map(taslak.sorular.map((soru) => [soru.id, idUret()]));
  const mantiksalIdler = new Map<string, string>();
  const paketIdleri = new Map<string, string>();
  const grupId = (harita: Map<string, string>, eski: string | undefined) => {
    if (!eski) return undefined;
    if (!harita.has(eski)) harita.set(eski, idUret());
    return harita.get(eski);
  };
  const sorular = taslak.sorular.map((soru) => {
    const yeniId = soruIdleri.get(soru.id)!;
    const { kirpmaId: _kirpmaId, kaynakKitapId: _kaynakKitapId, kaynakAktarimId: _kaynakAktarimId, ...tas } = soru;
    return {
      ...tas,
      id: yeniId,
      logicalQuestionId: grupId(mantiksalIdler, soru.logicalQuestionId) ?? grupId(paketIdleri, soru.paketId) ?? yeniId,
      paketId: grupId(paketIdleri, soru.paketId),
      maddeler: soru.maddeler.map((madde) => ({ ...madde, id: idUret() })),
      ekGorseller: soru.ekGorseller?.map((gorsel) => ({
        ...gorsel,
        id: idUret(),
        cizimVerisi: belgeIciKimlikleriYenile(gorsel.cizimVerisi, idUret),
        denklemVerisi: belgeIciKimlikleriYenile(gorsel.denklemVerisi, idUret),
      })),
      cizimVerisi: belgeIciKimlikleriYenile(soru.cizimVerisi, idUret),
      denklemVerisi: belgeIciKimlikleriYenile(soru.denklemVerisi, idUret),
    };
  });
  return {
    ...structuredClone(taslak),
    id: idUret(),
    kayitZamani: new Date().toISOString(),
    sorular,
    ayarlar: {
      ...structuredClone(taslak.ayarlar),
      bepSeciliIds: taslak.ayarlar.bepSeciliIds?.map((id) => soruIdleri.get(id)).filter((id): id is string => !!id),
    },
  };
}

function nesneMi(deger: unknown): deger is Nesne {
  return !!deger && typeof deger === "object" && !Array.isArray(deger);
}

function metinMi(deger: unknown, azami: number, bosOlabilir = true): deger is string {
  return typeof deger === "string" && [...deger].length <= azami && (bosOlabilir || deger.trim().length > 0);
}

function sayiMi(deger: unknown, min: number, max: number, tam = false): deger is number {
  return typeof deger === "number" && Number.isFinite(deger) && deger >= min && deger <= max && (!tam || Number.isInteger(deger));
}

function opsiyonelMetin(n: Nesne, alan: string, azami: number): boolean {
  return n[alan] === undefined || metinMi(n[alan], azami);
}

function opsiyonelSayi(n: Nesne, alan: string, min: number, max: number, tam = false): boolean {
  return n[alan] === undefined || sayiMi(n[alan], min, max, tam);
}

function yalnizAlanlar(n: Nesne, alanlar: readonly string[]): boolean {
  const izinli = new Set(alanlar);
  return Object.keys(n).every((alan) => izinli.has(alan));
}

function veriUrlMi(deger: unknown): deger is string {
  return typeof deger === "string" && deger.length <= AZAMI_TEK_GORSEL_KARAKTER && /^data:image\/(?:png|jpe?g|webp|gif);base64,[A-Za-z0-9+/=]+$/.test(deger);
}

function genelYapiSinirlari(deger: unknown): void {
  let dugum = 0;
  let toplamMetin = 0;
  const gez = (oge: unknown, derinlik: number) => {
    if (derinlik > AZAMI_DERINLIK) throw new Error("Sınav taslağı güvenli iç içe veri sınırını aşıyor.");
    if (++dugum > AZAMI_DUGUM) throw new Error("Sınav taslağı çok fazla veri alanı içeriyor.");
    if (typeof oge === "string") {
      toplamMetin += oge.length;
      if (toplamMetin > AZAMI_TOPLAM_METIN_KARAKTER) throw new Error("Sınav taslağının toplam metin/görsel boyutu güvenli sınırı aşıyor.");
      return;
    }
    if (Array.isArray(oge)) {
      if (oge.length > 5_000) throw new Error("Sınav taslağındaki bir liste güvenli eleman sınırını aşıyor.");
      oge.forEach((alt) => gez(alt, derinlik + 1));
      return;
    }
    if (nesneMi(oge)) {
      for (const [anahtar, alt] of Object.entries(oge)) {
        if (TEHLIKELI_ANAHTARLAR.has(anahtar)) throw new Error("Sınav taslağı güvenli olmayan bir alan adı içeriyor.");
        gez(alt, derinlik + 1);
      }
    }
  };
  gez(deger, 0);
}

function maddeDogrula(deger: unknown): boolean {
  if (!nesneMi(deger)) return false;
  return yalnizAlanlar(deger, ["id", "metinHtml", "puan", "cevapSatir"])
    && metinMi(deger.id, 100, false) && metinMi(deger.metinHtml, 200_000)
    && (deger.puan === null || sayiMi(deger.puan, 0, 1_000)) && sayiMi(deger.cevapSatir, 0, 100, true);
}

function ekGorselDogrula(deger: unknown): boolean {
  if (!nesneMi(deger)) return false;
  return yalnizAlanlar(deger, ["id", "dataUrl", "dosyaAdi", "konum", "genislikMm", "oran", "secimNo", "kaynakSayfaNo", "kaynakAd", "cizimVerisi", "denklemVerisi"])
    && metinMi(deger.id, 100, false) && veriUrlMi(deger.dataUrl)
    && (deger.konum === "alt" || deger.konum === "yan")
    && sayiMi(deger.genislikMm, 5, 200) && sayiMi(deger.oran, 0.02, 100)
    && opsiyonelMetin(deger, "dosyaAdi", 500) && opsiyonelMetin(deger, "kaynakAd", 1_000)
    && opsiyonelSayi(deger, "secimNo", 0, 100_000, true) && opsiyonelSayi(deger, "kaynakSayfaNo", 0, 100_000, true)
    && (deger.cizimVerisi === undefined || nesneMi(deger.cizimVerisi))
    && (deger.denklemVerisi === undefined || nesneMi(deger.denklemVerisi));
}

function soruDogrula(deger: unknown): boolean {
  if (!nesneMi(deger) || !metinMi(deger.id, 100, false) || (deger.tur !== "metin" && deger.tur !== "gorsel")) return false;
  if (!yalnizAlanlar(deger, [
    "id", "tur", "metinHtml", "gorselDataUrl", "dosyaAdi", "altMetinHtml", "metinKonumu", "hizalama",
    "genislikMm", "gorselOran", "gorselYukseklikMm", "ekGorseller", "kaynakSecimNo", "kaynakSayfaNo",
    "kaynakAd", "kirpmaId", "kaynakAktarimId", "kaynakKitapId", "kaynakSayfa", "kaynakSinif", "kaynakDers",
    "kaynakKonu", "logicalQuestionId", "paketId", "paketSira", "paketParcaSayisi", "paketBasligi", "boslukMm", "cevapAlani",
    "punto", "puan", "bepPuan", "maddeler", "maddeKolon", "tamGenislik", "tamSayfa", "kazanim", "dogruSik", "bolumBasligi",
    "cizimVerisi", "denklemVerisi",
  ])) return false;
  if (!metinMi(deger.metinKonumu, 10, false) || !["ust", "alt", "sag", "sol", "yok"].includes(deger.metinKonumu)) return false;
  if (!metinMi(deger.hizalama, 10, false) || !["sol", "orta", "sag"].includes(deger.hizalama)) return false;
  if (!sayiMi(deger.genislikMm, 5, 200) || !sayiMi(deger.boslukMm, 0, 300) || !sayiMi(deger.punto, 6, 72)) return false;
  if (!(deger.cevapAlani === undefined || deger.cevapAlani === "bos" || deger.cevapAlani === "cizgi" || deger.cevapAlani === "kare")) return false;
  // `bepPuan` isteğe bağlı: eski dosyalarda hiç yok (undefined), paket parçalarında null.
  if (!(deger.bepPuan === undefined || deger.bepPuan === null || sayiMi(deger.bepPuan, 0, 1_000))) return false;
  if (!(deger.puan === null || sayiMi(deger.puan, 0, 1_000)) || ![1, 2, 3].includes(deger.maddeKolon as number) || typeof deger.tamGenislik !== "boolean") return false;
  if (!Array.isArray(deger.maddeler) || deger.maddeler.length > AZAMI_MADDE || !deger.maddeler.every(maddeDogrula)) return false;
  if (deger.tur === "metin" && !metinMi(deger.metinHtml, 500_000)) return false;
  if (deger.tur === "gorsel" && !veriUrlMi(deger.gorselDataUrl)) return false;
  if (deger.ekGorseller !== undefined && (!Array.isArray(deger.ekGorseller) || deger.ekGorseller.length > AZAMI_EK_GORSEL || !deger.ekGorseller.every(ekGorselDogrula))) return false;
  if (!opsiyonelMetin(deger, "altMetinHtml", 500_000) || !opsiyonelMetin(deger, "dosyaAdi", 500)
    || !opsiyonelMetin(deger, "kazanim", 2_000) || !opsiyonelMetin(deger, "dogruSik", 20)
    || !opsiyonelMetin(deger, "bolumBasligi", 500) || !opsiyonelMetin(deger, "kaynakAd", 1_000)
    || !["kirpmaId", "kaynakAktarimId", "kaynakKitapId", "kaynakSinif", "kaynakDers", "kaynakKonu", "logicalQuestionId", "paketId", "paketBasligi"].every((alan) => opsiyonelMetin(deger, alan, 1_000))) return false;
  if (!opsiyonelSayi(deger, "gorselOran", 0.02, 100) || !opsiyonelSayi(deger, "gorselYukseklikMm", 2, 500)
    || !opsiyonelSayi(deger, "kaynakSecimNo", 0, 100_000, true) || !opsiyonelSayi(deger, "kaynakSayfaNo", 0, 100_000, true)
    || !opsiyonelSayi(deger, "kaynakSayfa", 0, 100_000, true) || !opsiyonelSayi(deger, "paketSira", 0, 10_000, true)
    || !opsiyonelSayi(deger, "paketParcaSayisi", 1, 10_000, true)) return false;
  if (["tamSayfa"].some((alan) => deger[alan] !== undefined && typeof deger[alan] !== "boolean")) return false;
  return (deger.cizimVerisi === undefined || nesneMi(deger.cizimVerisi))
    && (deger.denklemVerisi === undefined || nesneMi(deger.denklemVerisi));
}

export function sinavTaslaginiDogrula(deger: unknown): SinavTaslagi {
  genelYapiSinirlari(deger);
  if (!nesneMi(deger) || deger.surum !== "v0.11C" || !metinMi(deger.kayitZamani, 100, false)) throw new Error("Sınav taslağının sürümü veya kayıt zamanı geçersiz.");
  if (!yalnizAlanlar(deger, ["id", "surum", "kayitZamani", "baslik", "sorular", "ayarlar"]) || !opsiyonelMetin(deger, "id", 100)) throw new Error("Sınav taslağı bilinmeyen veya geçersiz bir üst alan içeriyor.");
  if (!nesneMi(deger.baslik) || !nesneMi(deger.ayarlar) || !Array.isArray(deger.sorular)) throw new Error("Sınav taslağının temel yapısı eksik.");
  if (deger.sorular.length > AZAMI_SORU) throw new Error(`Sınav taslağı en fazla ${AZAMI_SORU} soru içerebilir.`);
  const b = deger.baslik;
  if (!yalnizAlanlar(b, ["okulAdi", "sinifSeviyesi", "donem", "yaziliNo", "ders", "tarih", "sureDakika", "logoDataUrl", "logoBoyut", "duzen", "ortaSatirlar"])) throw new Error("Sınav başlığı bilinmeyen alan içeriyor.");
  if (!["okulAdi", "sinifSeviyesi", "donem", "yaziliNo", "ders"].every((alan) => metinMi(b[alan], 500))) throw new Error("Sınav başlık alanları geçersiz.");
  if (!opsiyonelMetin(b, "tarih", 50) || !opsiyonelMetin(b, "sureDakika", 20)
    || (b.logoDataUrl !== undefined && !veriUrlMi(b.logoDataUrl))
    || (b.logoBoyut !== undefined && !["kucuk", "orta", "buyuk"].includes(String(b.logoBoyut)))
    || (b.duzen !== undefined && !["klasik", "merkez"].includes(String(b.duzen)))
    || !opsiyonelMetin(b, "ortaSatirlar", 1000)) throw new Error("Sınav başlığındaki isteğe bağlı alanlar geçersiz.");
  const a = deger.ayarlar;
  if (!yalnizAlanlar(a, ["kenarBosluk", "varsayilanSoruBosluk", "ogretmenler", "sayfaNoGoster", "sayfaDuzeni", "sutunAra", "sutunAyirici", "bGrubuAktif", "bSeed", "aktifGrup", "sonYazdirilanBSeed", "sinavTuru", "testBaslik", "testSonucKutusu", "sikBicimi", "sikDuzeni", "bepAktif", "bepSeciliIds", "bepPuntoArtis", "kaynakSecimSayaci"])) throw new Error("Sınav ayarları bilinmeyen alan içeriyor.");
  if (!sayiMi(a.kenarBosluk, 0, 50) || !sayiMi(a.varsayilanSoruBosluk, 0, 300)
    || !Array.isArray(a.ogretmenler) || a.ogretmenler.length > 20 || !a.ogretmenler.every((x) => metinMi(x, 300))
    || typeof a.sayfaNoGoster !== "boolean" || !["tek", "cift"].includes(String(a.sayfaDuzeni))
    || !sayiMi(a.sutunAra, 0, 100) || typeof a.sutunAyirici !== "boolean") throw new Error("Sınav sayfa ayarları geçersiz.");
  if ((a.bGrubuAktif !== undefined && typeof a.bGrubuAktif !== "boolean")
    || !opsiyonelSayi(a, "bSeed", 0, Number.MAX_SAFE_INTEGER, true)
    || (a.aktifGrup !== undefined && !["A", "B"].includes(String(a.aktifGrup)))
    || !(a.sonYazdirilanBSeed === undefined || a.sonYazdirilanBSeed === null || sayiMi(a.sonYazdirilanBSeed, 0, Number.MAX_SAFE_INTEGER, true))
    || (a.sinavTuru !== undefined && !["yazili", "test"].includes(String(a.sinavTuru)))
    || !opsiyonelMetin(a, "testBaslik", 500)
    || (a.sikBicimi !== undefined && !["buyuk", "kucuk"].includes(String(a.sikBicimi)))
    || (a.sikDuzeni !== undefined && !["liste", "otomatik"].includes(String(a.sikDuzeni)))
    || ["testSonucKutusu", "bepAktif"].some((alan) => a[alan] !== undefined && typeof a[alan] !== "boolean")
    || (a.bepSeciliIds !== undefined && (!Array.isArray(a.bepSeciliIds) || a.bepSeciliIds.length > AZAMI_SORU || !a.bepSeciliIds.every((id) => metinMi(id, 100, false))))
    || !opsiyonelSayi(a, "bepPuntoArtis", 0, 30) || !opsiyonelSayi(a, "kaynakSecimSayaci", 0, 100_000, true)) throw new Error("Sınavın gelişmiş ayarları geçersiz.");
  if (!deger.sorular.every(soruDogrula)) throw new Error("Sınav taslağındaki bir soru veya iç alanı geçersiz.");
  const idler = new Set<string>();
  for (const soru of deger.sorular as Nesne[]) {
    const id = String(soru.id);
    if (idler.has(id)) throw new Error("Sınav taslağında yinelenen soru kimliği var.");
    idler.add(id);
  }
  return deger as unknown as SinavTaslagi;
}

export function taslakDosyadanOku(file: File, parola?: string): Promise<SinavTaslagi> {
  return new Promise((resolve, reject) => {
    if (file.size > SINAV_TASLAK_DOSYA_AZAMI_BAYT) {
      reject(new Error("Sınav taslağı 25 MB güvenli dosya sınırını aşıyor."));
      return;
    }
    if (
      file.type &&
      file.type !== "application/json" &&
      !file.name.toLowerCase().endsWith(".json")
    ) {
      reject(new Error("Lütfen bir taslak (.json) dosyası seçin."));
      return;
    }
    const okuyucu = new FileReader();
    okuyucu.onload = async () => {
      try {
        const metin = String(okuyucu.result ?? "");
        const acik = parolaliSinavMi(metin) ? await sinavParolasiniAc(metin, parola ?? "") : metin;
        resolve(sinavTaslaginiDogrula(await jsonGuvenliCoz(acik)));
      } catch (err) {
        reject(err instanceof Error ? err : new Error("Dosya okunamadı. Bozuk olabilir veya bir sınav taslağı değil."));
      }
    };
    okuyucu.onerror = () =>
      reject(new Error("Dosya okunamadı. Lütfen tekrar deneyin."));
    okuyucu.readAsText(file);
  });
}
