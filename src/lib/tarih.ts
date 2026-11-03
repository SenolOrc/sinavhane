// lib/tarih.ts — Türkiye/yerel saat güvenli tarih yardımcıları.
// new Date().toISOString() UTC döndürdüğü için 00:00-03:00 arası günü bir önceki gün
// gibi kaydetme riski vardı. Günlük kayıtlar ve belge tarihleri bu dosyayı kullanır.

function yerelParcalar(d = new Date()) {
  const yil = d.getFullYear();
  const ay = String(d.getMonth() + 1).padStart(2, "0");
  const gun = String(d.getDate()).padStart(2, "0");
  const saat = String(d.getHours()).padStart(2, "0");
  const dakika = String(d.getMinutes()).padStart(2, "0");
  const saniye = String(d.getSeconds()).padStart(2, "0");
  return { yil, ay, gun, saat, dakika, saniye };
}

/** Yerel gün: YYYY-MM-DD. Hızlı İşleme ve ödev/sınav tarihleri için. */
export function bugunYerelISO(d = new Date()): string {
  const p = yerelParcalar(d);
  return `${p.yil}-${p.ay}-${p.gun}`;
}

/** Yerel tarih-saat: YYYY-MM-DDTHH:mm:ss. Senkron/etiket/tutanak kayıtları için. */
export function simdiYerelISO(d = new Date()): string {
  const p = yerelParcalar(d);
  return `${p.yil}-${p.ay}-${p.gun}T${p.saat}:${p.dakika}:${p.saniye}`;
}

/** ISO "YYYY-MM-DD" → ders programı gün numarası (Pzt=1 … Paz=7). */
export function programGunu(iso: string): number {
  const [yil, ay, gun] = iso.split("-").map(Number);
  const jsGun = new Date(yil, ay - 1, gun).getDay();
  return jsGun === 0 ? 7 : jsGun;
}

export function trTarih(iso: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("tr-TR");
}

export function trTarihSaat(iso: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("tr-TR", { dateStyle: "short", timeStyle: "short" });
}

/** Senkron zaman damgasını kısa/okunur biçime çevirir ("Bugün 14:32" / "12.08.2026" / "Henüz alınmadı"). */
export function senkronMetni(iso: string | null): string {
  if (!iso) return "Henüz alınmadı";
  const d = new Date(iso);
  const saat = d.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" });
  return iso.slice(0, 10) === bugunYerelISO() ? `Bugün ${saat}` : d.toLocaleDateString("tr-TR");
}
