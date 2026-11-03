// core/hatirlatma.ts — "Dersi işlemedin" telefon hatırlatmasının SAF çekirdeği.
//
// NEDEN: öğretmen (2026-10) "çok rahatsız etmeden, aynı sınıfın aynı gün üst üste
// olan dersleri bitince, girmediyse uyarı verilebilir" dedi. Her ders saatinin
// sonunda bildirim atmak blok derslerde (2.–3. ders) iki kez dürtmek demekti; bu
// yüzden ARDIŞIK ders saatleri tek blok sayılır ve yalnız bloğun SONUNDA hatırlatılır.
// Okulların giriş/ders/teneffüs süreleri farklı olduğu için saatler tahmin edilmez,
// öğretmen girer (ayarlar.zilSaatleri). Bir ders saatinin zili yoksa o blok için
// hatırlatma ÜRETİLMEZ — yanlış saatte bildirim, hiç bildirimden daha rahatsız edicidir.
//
// Bu dosya repo/DOM bilmez: plan girdileri fonksiyon olarak verilir (test edilebilir).
// Telefona gönderme lib/hatirlatma.ts'te.
import type { DersProgrami } from "@shared/types";

export interface ZilDersi { bas: string; bit: string }
/** dersler[0] = 1. ders saati (DersProgrami.sira 1 tabanlı). */
export interface ZilSaatleri { dersler: ZilDersi[] }
export interface HatirlatmaAyari { acik: boolean; gecikmeDk?: number }

export const VARSAYILAN_GECIKME_DK = 5;
export const AZAMI_DERS_SAATI = 12;
/** Telefona en çok bu kadar hatırlatma gönderilir (yerel sözleşme: native de 60'ta keser). */
export const AZAMI_HATIRLATMA = 60;
/** Bugün + sonraki 6 gün. Uygulama haftada bir açılsa bile plan boşalmasın diye. */
export const PLAN_GUN_SAYISI = 7;

const SAAT_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;

/** "HH:MM" → gün içindeki dakika; geçersizse null. "8:30" kabul edilmez (tabloda tek biçim). */
export function saatDakika(s: unknown): number | null {
  if (typeof s !== "string") return null;
  const m = SAAT_RE.exec(s.trim());
  return m ? Number(m[1]) * 60 + Number(m[2]) : null;
}

export function dakikaSaat(dk: number): string {
  const d = ((Math.round(dk) % 1440) + 1440) % 1440;
  return `${String(Math.floor(d / 60)).padStart(2, "0")}:${String(d % 60).padStart(2, "0")}`;
}

/** Tek satırın hatası (tabloda o satırı kırmızı yapmak için); yoksa null. */
export function zilSatiriHatasi(dersler: ZilDersi[], i: number): string | null {
  const d = dersler[i];
  const bas = saatDakika(d?.bas), bit = saatDakika(d?.bit);
  if (bas === null || bit === null) return `${i + 1}. ders: saati SS:DD yazın (ör. 08:30).`;
  if (bit <= bas) return `${i + 1}. ders: bitiş başlangıçtan sonra olmalı.`;
  if (i > 0) {
    const oncekiBit = saatDakika(dersler[i - 1]?.bit);
    if (oncekiBit !== null && bas < oncekiBit) return `${i + 1}. ders, ${i}. ders bitmeden başlıyor.`;
  }
  return null;
}

/** Tüm tablonun ilk hatası (Kaydet'in kilit sebebi); geçerliyse null. Boş tablo geçerlidir (= zil yok). */
export function zilSaatleriHatasi(dersler: ZilDersi[]): string | null {
  if (!Array.isArray(dersler)) return "Zil tablosu okunamadı.";
  if (dersler.length > AZAMI_DERS_SAATI) return `En çok ${AZAMI_DERS_SAATI} ders saati girilebilir.`;
  for (let i = 0; i < dersler.length; i++) {
    const h = zilSatiriHatasi(dersler, i);
    if (h) return h;
  }
  return null;
}

export function gecikmeGecerliMi(x: unknown): x is number {
  return typeof x === "number" && Number.isInteger(x) && x >= 0 && x <= 60;
}

export interface ZilUretimi {
  giris: string; dersDk: number; teneffusDk: number; dersSayisi: number;
  /** Öğle arası bu dersten SONRA (ör. 5). Yoksa/0 ise öğle arası yok. */
  ogleSonrasiDers?: number; ogleDk?: number;
}

/** Hızlı üretici hatası; geçerliyse null. */
export function zilUretimiHatasi(g: ZilUretimi): string | null {
  if (saatDakika(g.giris) === null) return "Giriş saatini SS:DD yazın (ör. 08:30).";
  const tam = (x: number, min: number, max: number) => Number.isInteger(x) && x >= min && x <= max;
  if (!tam(g.dersDk, 10, 120)) return "Ders süresi 10–120 dk olmalı.";
  if (!tam(g.teneffusDk, 0, 60)) return "Teneffüs 0–60 dk olmalı.";
  if (!tam(g.dersSayisi, 1, AZAMI_DERS_SAATI)) return `Ders sayısı 1–${AZAMI_DERS_SAATI} olmalı.`;
  if (g.ogleSonrasiDers && !tam(g.ogleSonrasiDers, 0, g.dersSayisi)) return "Öğle arası ders sayısından sonra olamaz.";
  if (g.ogleSonrasiDers && g.ogleDk !== undefined && !tam(g.ogleDk, 0, 180)) return "Öğle arası 0–180 dk olmalı.";
  const sonuc = zilTablosuUret(g);
  if (sonuc.length && (saatDakika(sonuc[sonuc.length - 1].bit) ?? 0) <= (saatDakika(sonuc[0].bas) ?? 0)) return "Dersler gece yarısını geçiyor.";
  return null;
}

/** Giriş saati + süreler → zil tablosu. Öğle arası, belirtilen dersten sonraki teneffüsün YERİNE geçer. */
export function zilTablosuUret(g: ZilUretimi): ZilDersi[] {
  const giris = saatDakika(g.giris);
  if (giris === null || !(g.dersSayisi > 0)) return [];
  let t: number = giris;
  const sonuc: ZilDersi[] = [];
  const n = Math.min(AZAMI_DERS_SAATI, Math.floor(g.dersSayisi));
  for (let i = 1; i <= n; i++) {
    const bit: number = t + g.dersDk;
    if (bit >= 1440) break; // gece yarısını geçen ders üretilmez
    sonuc.push({ bas: dakikaSaat(t), bit: dakikaSaat(bit) });
    const ogleMi = !!g.ogleSonrasiDers && i === g.ogleSonrasiDers;
    t = bit + (ogleMi ? (g.ogleDk ?? 40) : g.teneffusDk);
  }
  return sonuc;
}

export interface Hatirlatma {
  id: string;
  /** Epoch ms (yerel saatle hesaplanmış an). */
  zaman: number;
  baslik: string;
  metin: string;
  yol: string;
  sinifId: number;
  tarih: string;
  /** Bloğun ilk ve son ders saati (önizleme metni için). */
  ilkSira: number;
  sonSira: number;
}

export interface PlanGirdisi {
  program: DersProgrami[];
  zil: ZilSaatleri | null | undefined;
  gunler: string[];
  sinifAdi: (sinifId: number) => string | undefined;
  /** Programda ders adı yoksa ("Ders" yer tutucusu da yok sayılır) sınıfın ilk dersi. */
  sinifDersi?: (sinifId: number) => string | undefined;
  islendiMi: (sinifId: number, tarih: string) => boolean;
  yapilmadiMi: (sinifId: number, tarih: string) => boolean;
  programGecerliMi: (sinifId: number, tarih: string) => boolean;
  gecikmeDk?: number;
  simdi: Date;
}

/** ISO tarih → Pzt=1 … Paz=7 (lib/tarih programGunu ile aynı; core DOM/lib bağımsız kalsın diye kopya). */
function haftaGunu(iso: string): number {
  const [y, a, g] = iso.split("-").map(Number);
  const j = new Date(y, a - 1, g).getDay();
  return j === 0 ? 7 : j;
}

/** simdi'nin günü + sonraki (n-1) gün, yerel ISO. */
export function planGunleri(simdi: Date, n = PLAN_GUN_SAYISI): string[] {
  const out: string[] = [];
  for (let i = 0; i < n; i++) {
    const d = new Date(simdi.getFullYear(), simdi.getMonth(), simdi.getDate() + i);
    out.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`);
  }
  return out;
}

function anlamliAd(ad: string | undefined): string | undefined {
  const t = ad?.trim();
  // DersProgramı boş etiketle eklenince "Ders" yazılıyor — bu bir ders adı değil.
  return t && t.toLocaleLowerCase("tr-TR") !== "ders" ? t : undefined;
}

export function siraMetni(ilk: number, son: number): string {
  return ilk === son ? `${ilk}.` : `${ilk}.–${son}.`;
}

/** Bir sınıfın bir gündeki dersleri → ardışık sıra blokları (2-3 tek blok; 2 ve 6 iki blok). */
export function dersBloklari(dersler: DersProgrami[]): DersProgrami[][] {
  const sirali = [...dersler].sort((a, b) => a.sira - b.sira);
  const bloklar: DersProgrami[][] = [];
  for (const d of sirali) {
    const son = bloklar[bloklar.length - 1];
    const sonDers = son?.[son.length - 1];
    if (sonDers && d.sira === sonDers.sira) continue; // aynı saat iki kez yazılmışsa bir kez say
    if (sonDers && d.sira === sonDers.sira + 1) son.push(d); else bloklar.push([d]);
  }
  return bloklar;
}

export function hatirlatmaPlani(g: PlanGirdisi): Hatirlatma[] {
  const dersler = g.zil?.dersler ?? [];
  if (!dersler.length) return [];
  const gecikme = gecikmeGecerliMi(g.gecikmeDk) ? g.gecikmeDk : VARSAYILAN_GECIKME_DK;
  const simdiMs = g.simdi.getTime();
  const sonuc: Hatirlatma[] = [];
  for (const tarih of g.gunler) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(tarih)) continue;
    const gun = haftaGunu(tarih);
    // Program yalnız hafta içidir (DersProgrami.gun 1..5); bozuk bir hafta sonu kaydı bildirim üretmesin.
    if (gun > 5) continue;
    const gunun = g.program.filter((d) => d.gun === gun);
    const sinifIdler = [...new Set(gunun.map((d) => d.sinifId))];
    for (const sinifId of sinifIdler) {
      // İşlenme sınıf+gün başınadır: işlenince o günün TÜM blokları düşer (yeniden eşitlemede).
      if (g.islendiMi(sinifId, tarih) || g.yapilmadiMi(sinifId, tarih)) continue;
      if (!g.programGecerliMi(sinifId, tarih)) continue;
      for (const blok of dersBloklari(gunun.filter((d) => d.sinifId === sinifId))) {
        const ilk = blok[0].sira, son = blok[blok.length - 1].sira;
        // Bloktaki her saatin zili olmalı; biri eksikse saat hesaplanamaz → atla.
        if (blok.some((d) => saatDakika(dersler[d.sira - 1]?.bit) === null)) continue;
        const bitDk = saatDakika(dersler[son - 1].bit)!;
        const [y, a, gn] = tarih.split("-").map(Number);
        const zaman = new Date(y, a - 1, gn, 0, bitDk + gecikme).getTime();
        if (zaman <= simdiMs) continue;
        const ders = blok.map((d) => anlamliAd(d.ad)).find(Boolean) ?? anlamliAd(g.sinifDersi?.(sinifId));
        const sinifAd = g.sinifAdi(sinifId) ?? "Sınıf";
        const yol = `/hizli-isleme?sinif=${sinifId}&tarih=${tarih}${ders ? `&ders=${yolaKodla(ders)}` : ""}`;
        sonuc.push({
          id: `oa-${tarih}-${sinifId}-${ilk}`.replace(/[^A-Za-z0-9_-]/g, ""),
          zaman,
          baslik: `${sinifAd} · ${ders ?? "Ders"} işlenmedi`,
          metin: `${siraMetni(ilk, son)} ders bitti. İşaret yoksa “İstisna yok” deyip kaydedin.`,
          yol, sinifId, tarih, ilkSira: ilk, sonSira: son,
        });
      }
    }
  }
  return sonuc.sort((x, y) => x.zaman - y.zaman || x.id.localeCompare(y.id)).slice(0, AZAMI_HATIRLATMA);
}

/** encodeURIComponent "( ) ' ! *" karakterlerini açık bırakır; telefon kabukları yolu
 *  ^/hizli-isleme\?[A-Za-z0-9=&%._~-]*$ ile doğrular → "Din Kültürü (Seçmeli)" hatırlatması
 *  sessizce atlanıyordu. Bu karakterler de %XX'e çevrilir (URLSearchParams aynı biçimde çözer). */
export function yolaKodla(s: string): string {
  return encodeURIComponent(s).replace(/[()'!*]/g, (c) => "%" + c.charCodeAt(0).toString(16).toUpperCase());
}

