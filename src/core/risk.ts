// core/risk.ts — SAF FONKSİYON. MASTER §6 risk hesabı (halka rengi).
// Risk = devamsızlık + ödev eksiği + performans. Özürsüz devamsızlık AĞIR sayılır.
// Amaç: kalmadan ÖNCE uyarmak. Performanstan AYRI gösterilir — iyi not riski sıfırlamaz.

import type { Devamsizlik, RiskSeviye, RiskSonuc } from "@shared/types";

export interface RiskGirdi {
  ogrenciId: number;
  devamsizlik: Devamsizlik;
  eksikOdevSayisi: number;
  performans100: number;   // core/performans.ts çıktısı (bilgi amaçlı; riski sıfırlamaz)
}

// Bunlar yalnız başlangıç değerleridir. Otomatik risk politikası öğretmen
// Ayarlar'da açıkça etkinleştirene kadar öğrenciye risk etiketi üretmez.
// Dışa aktarılıyor ki ekranlar (Öğrenci Kartı, Devamsızlık) kendi kopyalarını
// tutup buradan sessizce sapmasın — tek doğru kaynak burası.
//
// Özürsüz devamsızlık eşikleri (OZURSUZ_*) artık yalnız VARSAYILAN: öğretmen
// Ayarlar'dan değiştirebilir (`db/repo.ts::riskEsikleriGetir/Kaydet`), gerçek
// yönetmelik sınırı okula/branşa göre değişebildiği için. Ödev/performans
// eşikleri (ODEV_*/PERF_*) henüz ayarlanabilir değil — bu tur yalnız
// devamsızlık eşiğini kapsıyor (öğretmenin talebi buydu).
export const OZURSUZ_KRITIK_GUN = 8;
export const OZURSUZ_DIKKAT_GUN = 4;
export const ODEV_KRITIK = 5;
export const ODEV_DIKKAT = 2;
export const PERF_KRITIK = 30;
export const PERF_DIKKAT = 45;

export interface RiskEsikleri {
  aktif: boolean;
  ozursuzDikkatGun: number;
  ozursuzKritikGun: number;
  odevDikkatSayisi: number;
  odevKritikSayisi: number;
  performansRiskiAktif: boolean;
  performansKritikPuani: number;
  performansDikkatPuani: number;
}

export const VARSAYILAN_RISK_ESIKLERI: RiskEsikleri = {
  aktif: false,
  ozursuzDikkatGun: OZURSUZ_DIKKAT_GUN,
  ozursuzKritikGun: OZURSUZ_KRITIK_GUN,
  odevDikkatSayisi: ODEV_DIKKAT,
  odevKritikSayisi: ODEV_KRITIK,
  performansRiskiAktif: false,
  performansKritikPuani: PERF_KRITIK,
  performansDikkatPuani: PERF_DIKKAT,
};

export function riskHesapla(g: RiskGirdi, esikler: RiskEsikleri = VARSAYILAN_RISK_ESIKLERI): RiskSonuc {
  const nedenler: string[] = [];
  let seviye: RiskSeviye = "normal";
  if (!esikler.aktif) return { ogrenciId: g.ogrenciId, seviye, nedenler };

  // Özürsüz devamsızlık en ağır sinyal (MASTER §6) — kalma eşiğini o belirler.
  if (g.devamsizlik.ozursuzGun >= esikler.ozursuzKritikGun) {
    seviye = yukselt(seviye, "kritik");
    nedenler.push(`Yüksek özürsüz devamsızlık (${g.devamsizlik.ozursuzGun} gün)`);
  } else if (g.devamsizlik.ozursuzGun >= esikler.ozursuzDikkatGun) {
    seviye = yukselt(seviye, "dikkat");
    nedenler.push(`Artan özürsüz devamsızlık (${g.devamsizlik.ozursuzGun} gün)`);
  }

  // Ödev eksiği
  if (g.eksikOdevSayisi >= esikler.odevKritikSayisi) {
    seviye = yukselt(seviye, "kritik");
    nedenler.push(`${g.eksikOdevSayisi} ödev eksik`);
  } else if (g.eksikOdevSayisi >= esikler.odevDikkatSayisi) {
    seviye = yukselt(seviye, "dikkat");
    nedenler.push(`${g.eksikOdevSayisi} ödev eksik`);
  }

  // Düşük katılım/performans risk faktörüdür (MASTER §6). Çok düşükse tek başına
  // en az "dikkat" yapar; orta düşükse mevcut seviyeye destekleyici neden ekler.
  if (esikler.performansRiskiAktif && g.performans100 < esikler.performansKritikPuani) {
    seviye = yukselt(seviye, "dikkat");
    nedenler.push(`Çok düşük katılım/performans (${g.performans100}/100)`);
  } else if (esikler.performansRiskiAktif && g.performans100 < esikler.performansDikkatPuani && seviye !== "normal") {
    nedenler.push("Düşük dönem performansı");
  }

  return { ogrenciId: g.ogrenciId, seviye, nedenler };
}

const SIRA: Record<RiskSeviye, number> = { normal: 0, dikkat: 1, kritik: 2 };
function yukselt(a: RiskSeviye, b: RiskSeviye): RiskSeviye {
  return SIRA[b] > SIRA[a] ? b : a;
}
