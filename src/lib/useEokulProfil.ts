// lib/useEokulProfil.ts — auto-fill kaynağı, ÜÇ modül paylaşıyor (sok,
// performans-dagitim, sinav-analizi) + sınav oluşturucunun boş başlığı — bu
// yüzden src/lib/'te (CLAUDE.md: "İki farklı modülü birden ilgilendiren
// orkestrasyon src/lib/'e çıkar").
// 2026-09 kullanıcı denetimi: eskiden hep boş dönüyordu; öğretmen okul adını,
// müdürü, kendi adını her belgede yeniden yazıyordu. Artık Ayarlar → Okul
// profili'nde bir kez girilen değerler okunur (db.ayarlar.okulProfili).
// Otomatik dolan alanlar ekranda serbestçe değiştirilebilir; e-Okul'a yazılmaz.
import { okulProfiliGetir } from "@/db/repo";

export interface EokulProfil {
  okulAdi: string;
  ogretmenAdi: string;
  okulMuduru: string;
  ilce: string;
}

/** Hook olmayan okuma — saf varsayılan üreten fonksiyonlar (boş sınav başlığı) için. */
export function okulProfiliOku(): EokulProfil {
  try {
    return okulProfiliGetir();
  } catch {
    return { okulAdi: "", ogretmenAdi: "", okulMuduru: "", ilce: "" };
  }
}

export function useEokulProfil(): EokulProfil {
  return okulProfiliOku();
}
