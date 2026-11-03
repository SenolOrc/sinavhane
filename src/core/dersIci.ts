// core/dersIci.ts — SAF FONKSİYON. Ders içi (katılım) puanı: ↑/↓ SAYIMI → 100'lük puan.
//
// NEDEN (2026-10 öğretmen kararı): Eskiden her kriterin bir puan değeri vardı (+2, −3)
// ve puan "taban + ders başına net × 10" ile çıkıyordu. Öğretmen "+1 mi +2 mi neye
// göre?" sorusunu cevaplayamıyordu; sayıların bir karşılığı yoktu. Artık:
//   • Kriter yalnız OLUMLU (arti) ya da OLUMSUZ (eksi). Puan değeri hesaba GİRMEZ.
//   • Bir ders, öğrenci için en fazla 1 olumlu ve 1 olumsuz sayılır.
//   • Oran = o derslerin öğrencinin İŞLENEN derslerine oranı (haftada 2 ve 5 saatlik
//     sınıflar adil kıyaslansın diye ders sayısı değil yüzde).
//   • İki mod (öğretmen seçer):
//       "bant"  — başlangıç puanı (öğretmen yazar: 0, 50, 75…) + olumlu bant eki −
//                 olumsuz bant kesintisi.
//       "olcek" — olumlu davranışlara toplamı 100 puan dağıtılır (okul performans
//                 ölçeği gibi); öğrenci her davranıştan, onu yaptığı derslerin oranı
//                 "tam puan oranına" ulaştıkça payının tamamını alır (doğrusal).
//                 Olumsuz bant kesintisi burada da uygulanır.
// Sonuç her zaman 0..100. Kitap (durum kriteri) bu hesabın DIŞINDA, kendi grubu var.

export type DersIciMod = "bant" | "olcek";

/** `esik`: bandın alt sınırı (% , 1..100). `puan`: olumluda ek (≥0), olumsuzda kesinti (≥0, düşülür). */
export interface DersIciBant { esik: number; puan: number }

export interface DersIciAyar {
  mod: DersIciMod;
  /** Yalnız "bant" modunda: hiç işaret almayan öğrencinin puanı. */
  baslangic: number;
  olumluBantlar: DersIciBant[];
  olumsuzBantlar: DersIciBant[];
  /** Yalnız "olcek" modunda: olumlu kriter id → puan payı. Toplam 100 olmalı. */
  olcekPaylari: Record<number, number>;
  /** Yalnız "olcek" modunda: bir davranışın tam puanı için derslerin yüzde kaçında görülmeli. */
  tamPuanOrani: number;
}

export const DERS_ICI_HAZIR: Record<"yumusak" | "dengeli" | "siki", Pick<DersIciAyar, "baslangic" | "olumluBantlar" | "olumsuzBantlar">> = {
  yumusak: {
    baslangic: 80,
    olumluBantlar: [{ esik: 1, puan: 5 }, { esik: 10, puan: 10 }, { esik: 25, puan: 20 }],
    olumsuzBantlar: [{ esik: 1, puan: 5 }, { esik: 10, puan: 10 }, { esik: 25, puan: 20 }],
  },
  dengeli: {
    baslangic: 75,
    olumluBantlar: [{ esik: 1, puan: 5 }, { esik: 10, puan: 10 }, { esik: 25, puan: 20 }],
    olumsuzBantlar: [{ esik: 1, puan: 10 }, { esik: 10, puan: 20 }, { esik: 25, puan: 35 }],
  },
  siki: {
    baslangic: 60,
    olumluBantlar: [{ esik: 1, puan: 5 }, { esik: 10, puan: 15 }, { esik: 25, puan: 30 }],
    olumsuzBantlar: [{ esik: 1, puan: 15 }, { esik: 10, puan: 30 }, { esik: 25, puan: 45 }],
  },
};

export const VARSAYILAN_DERS_ICI: DersIciAyar = {
  mod: "bant",
  ...DERS_ICI_HAZIR.dengeli,
  olcekPaylari: {},
  tamPuanOrani: 25,
};

/** Bir öğrencinin sayımı. `kriterDers`: olumlu kriter id → o kriteri aldığı ders sayısı. */
export interface DersIciSayim {
  islenenDers: number;
  olumluDers: number;
  olumsuzDers: number;
  kriterDers: Record<number, number>;
}

export interface DersIciKayit { tarih: string; kriterId: number }

/**
 * Kayıtları sayar. Yalnız `islenenGunler` içindeki günler sayılır ("Yok" günü ve
 * "ders yapılmadı" günü zaten bu kümede değildir). Bir gün aynı öğrencide birden çok
 * olumlu kriter olsa bile `olumluDers` 1 artar; `kriterDers` her kriter için ayrı sayar.
 */
export function dersIciSay(
  kayitlar: DersIciKayit[],
  kriterTipi: (kriterId: number) => "arti" | "eksi" | "durum" | undefined,
  islenenGunler: Set<string>,
): DersIciSayim {
  const olumluGun = new Set<string>(), olumsuzGun = new Set<string>();
  const kriterGun = new Map<number, Set<string>>();
  for (const k of kayitlar) {
    if (!islenenGunler.has(k.tarih)) continue;
    const tip = kriterTipi(k.kriterId);
    if (tip === "arti") {
      olumluGun.add(k.tarih);
      if (!kriterGun.has(k.kriterId)) kriterGun.set(k.kriterId, new Set());
      kriterGun.get(k.kriterId)!.add(k.tarih);
    } else if (tip === "eksi") {
      olumsuzGun.add(k.tarih);
    }
  }
  const kriterDers: Record<number, number> = {};
  for (const [id, g] of kriterGun) kriterDers[id] = g.size;
  return { islenenDers: islenenGunler.size, olumluDers: olumluGun.size, olumsuzDers: olumsuzGun.size, kriterDers };
}

/** Bir oran (%) için geçerli bandın puanı: eşiği oranı geçmeyen en yüksek bant; oran 0 ise 0. */
export function bantPuani(bantlar: DersIciBant[], oranYuzde: number): number {
  if (!(oranYuzde > 0)) return 0;
  let p = 0;
  for (const b of [...bantlar].sort((a, c) => a.esik - c.esik)) if (oranYuzde >= b.esik) p = b.puan;
  return p;
}

export interface DersIciSonuc {
  /** İşlenen ders yoksa null (grup hesaptan çıkar). */
  puan100: number | null;
  olumluEk: number;
  olumsuzKesinti: number;
  /** "36 dersin 6'sında ↑, 1'inde ↓ → 75 + 10 − 10 = 75" */
  aciklama: string;
}

const tamsay = (x: number) => Math.round(x * 10) / 10;
const yaz = (x: number) => String(tamsay(x)).replace(".", ",");

export function dersIciPuani(s: DersIciSayim, ayar: DersIciAyar): DersIciSonuc {
  if (s.islenenDers <= 0) return { puan100: null, olumluEk: 0, olumsuzKesinti: 0, aciklama: "Henüz işlenmiş ders yok." };
  const oranOlumlu = (s.olumluDers / s.islenenDers) * 100;
  const oranOlumsuz = (s.olumsuzDers / s.islenenDers) * 100;
  const kesinti = bantPuani(ayar.olumsuzBantlar, oranOlumsuz);
  const sayim = `${s.islenenDers} dersin ${s.olumluDers}'${ekAl(s.olumluDers)} ↑, ${s.olumsuzDers}'${ekAl(s.olumsuzDers)} ↓`;
  if (ayar.mod === "olcek") {
    const hedef = Math.max(1, ayar.tamPuanOrani);
    let ek = 0;
    for (const [id, pay] of Object.entries(ayar.olcekPaylari)) {
      const oran = ((s.kriterDers[Number(id)] ?? 0) / s.islenenDers) * 100;
      ek += pay * Math.min(1, oran / hedef);
    }
    const puan = clamp(Math.round(ek - kesinti));
    return { puan100: puan, olumluEk: tamsay(ek), olumsuzKesinti: kesinti, aciklama: `${sayim} → ölçek ${yaz(ek)}${kesinti ? ` − ${kesinti}` : ""} = ${puan}` };
  }
  const ek = bantPuani(ayar.olumluBantlar, oranOlumlu);
  const puan = clamp(Math.round(ayar.baslangic + ek - kesinti));
  return { puan100: puan, olumluEk: ek, olumsuzKesinti: kesinti, aciklama: `${sayim} → ${ayar.baslangic}${ek ? ` + ${ek}` : ""}${kesinti ? ` − ${kesinti}` : ""} = ${puan}` };
}

/** "6'sında / 1'inde / 0'ında" — Türkçe sayı eki (bulunma hâli, 3. tekil iyelik). */
/** Sayıya gelen bulunma eki: 6 → "sında", 25 → "inde" (kesme işaretinden sonrası). */
export function ekAl(n: number): string {
  if (n === 0) return "ında";
  const son = n % 10;
  if (son !== 0) return ({ 1: "inde", 2: "sinde", 3: "ünde", 4: "ünde", 5: "inde", 6: "sında", 7: "sinde", 8: "inde", 9: "unda" } as Record<number, string>)[son];
  const onlar = (n % 100) / 10;
  if (onlar === 0) return n % 1000 === 0 ? "inde" : "ünde"; // yüz → yüzünde, bin → bininde
  return ({ 1: "unda", 2: "sinde", 3: "unda", 4: "ında", 5: "sinde", 6: "ında", 7: "inde", 8: "inde", 9: "ında" } as Record<number, string>)[onlar];
}

/** Bantlar ya da ölçek geçerli mi? Hata metni ya da null. */
export function dersIciAyarHatasi(a: DersIciAyar, olumluKriterIdleri: number[]): string | null {
  const bantKontrol = (b: DersIciBant[], ad: string) => {
    if (b.length === 0 || b.length > 6) return `${ad}: 1 ile 6 basamak olmalı.`;
    for (const x of b) {
      if (!Number.isFinite(x.esik) || x.esik < 1 || x.esik > 100) return `${ad}: oranlar 1 ile 100 arasında olmalı.`;
      if (!Number.isFinite(x.puan) || x.puan < 0 || x.puan > 100) return `${ad}: puanlar 0 ile 100 arasında olmalı.`;
    }
    const s = [...b].sort((p, q) => p.esik - q.esik);
    for (let i = 1; i < s.length; i++) {
      if (s[i].esik === s[i - 1].esik) return `${ad}: aynı oran iki kez yazılmış.`;
      if (s[i].puan < s[i - 1].puan) return `${ad}: oran büyüdükçe puan küçülmemeli.`;
    }
    return null;
  };
  const o = bantKontrol(a.olumsuzBantlar, "Olumsuz basamaklar");
  if (o) return o;
  if (a.mod === "bant") {
    if (!Number.isFinite(a.baslangic) || a.baslangic < 0 || a.baslangic > 100) return "Başlangıç puanı 0 ile 100 arasında olmalı.";
    return bantKontrol(a.olumluBantlar, "Olumlu basamaklar");
  }
  if (!Number.isFinite(a.tamPuanOrani) || a.tamPuanOrani < 1 || a.tamPuanOrani > 100) return "Tam puan oranı 1 ile 100 arasında olmalı.";
  const paylar = olumluKriterIdleri.map((id) => a.olcekPaylari[id] ?? 0);
  if (paylar.some((p) => !Number.isFinite(p) || p < 0)) return "Ölçek puanları 0 veya üstü olmalı.";
  const toplam = paylar.reduce((t, p) => t + p, 0);
  if (Math.round(toplam) !== 100) return `Ölçek puanlarının toplamı 100 olmalı (şu an ${yaz(toplam)}).`;
  return null;
}

/** Ayarlar önizlemesi: N ders için her bandın kaç derse denk geldiği ("1–3", "9 ve üstü"). */
export function bantDersAraligi(bantlar: DersIciBant[], dersSayisi: number): Array<{ bant: DersIciBant; aralik: string }> {
  const s = [...bantlar].sort((a, b) => a.esik - b.esik);
  const enAz = (esik: number) => Math.max(1, Math.ceil((esik / 100) * dersSayisi - 1e-9));
  return s.map((b, i) => {
    const alt = enAz(b.esik);
    const sonraki = s[i + 1];
    const ust = sonraki ? enAz(sonraki.esik) - 1 : null;
    if (ust != null && ust < alt) return { bant: b, aralik: "—" };
    return { bant: b, aralik: ust == null ? `${alt} ve üstü` : alt === ust ? String(alt) : `${alt}–${ust}` };
  });
}

function clamp(x: number): number {
  return Math.min(100, Math.max(0, x));
}

// ─── Performans şablonunda AYRI kalemler (2026-10) ─────────────────────────────
// Kâğıt çizelgedeki gibi "Derse katılım" ve "Davranış" iki ayrı sütun olabilsin:
//   olumlu   → 0'dan başlar, olumlu davranış görülen ders oranıyla yükselir.
//              Ölçek modunda kriter payları; bant modunda derslerin tamPuanOrani'nde
//              olumlu davranış = 100 (orantılı).
//   davranis → 100'den başlar, olumsuz basamağın kesintisi kadar düşer.

/** Yalnız olumlu davranış puanı (0..100). İşlenen ders yoksa null. */
export function olumluPuani(s: DersIciSayim, ayar: DersIciAyar): number | null {
  if (s.islenenDers <= 0) return null;
  const hedef = Math.max(1, ayar.tamPuanOrani);
  const paylar = Object.entries(ayar.olcekPaylari).filter(([, p]) => p > 0);
  if (ayar.mod === "olcek" && paylar.length) {
    let ek = 0;
    for (const [id, pay] of paylar) ek += pay * Math.min(1, (((s.kriterDers[Number(id)] ?? 0) / s.islenenDers) * 100) / hedef);
    return clamp(Math.round(ek));
  }
  return clamp(Math.round(Math.min(1, ((s.olumluDers / s.islenenDers) * 100) / hedef) * 100));
}

/** Yalnız davranış puanı: 100 − olumsuz basamak kesintisi. İşlenen ders yoksa null. */
export function davranisPuani(s: DersIciSayim, ayar: DersIciAyar): number | null {
  if (s.islenenDers <= 0) return null;
  return clamp(100 - bantPuani(ayar.olumsuzBantlar, (s.olumsuzDers / s.islenenDers) * 100));
}
