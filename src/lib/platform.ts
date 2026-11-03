// lib/platform.ts — uygulamanın hangi kabukta çalıştığı ve Android köprüsü.
//
// Üç ortam var:
//   • tauri   — Windows/macOS masaüstü (SQLite, Rust komutları)
//   • android — Android "tam uygulama" APK'sı (apps/android, `tam` türü).
//               WebView içinde bu React uygulaması çalışır; kalıcı depo, dosya
//               kaydetme, yazdırma ve otomatik yedek Java tarafındadır
//               (MainActivity → `OAAndroid` mesaj köprüsü).
//   • tarayici — geliştirme önizlemesi (localStorage/IndexedDB).
//
// Köprü protokolü apps/mobil/src/android.ts ile AYNI: {id, op, ...} gönderilir,
// {id, value} ya da {id, error} döner. Yalnız uygulama kökeni + ana çerçeve.
import { tauriVarMi } from "@/lib/tauri";

interface AndroidPort { postMessage(message: string): void; onmessage: ((event: { data: string }) => void) | null }
declare global { interface Window { OAAndroid?: AndroidPort } }

export type Platform = "tauri" | "android" | "tarayici";

export function androidVarMi(): boolean {
  return typeof window !== "undefined" && !!window.OAAndroid && !tauriVarMi();
}

export function platform(): Platform {
  if (tauriVarMi()) return "tauri";
  if (androidVarMi()) return "android";
  return "tarayici";
}

/** Sınav kâğıdı hazırlama (A4 düzen, çizim/denklem editörü) yalnız masaüstünde sunulur.
 *  Telefon kabuğu (Android APK + iOS) bu ekranları ve "Sınava gönder" düğmelerini gizler.
 *  Tek kontrol noktası: yeni telefon kısıtı gerekirse buraya eklenir. */
export function sinavHazirlamaVarMi(): boolean {
  return !androidVarMi();
}

/** Verinin gerçek bir dosyada (tarayıcı depolaması DIŞINDA) tutulduğu kabuk mu? */
export function kaliciDepoVarMi(): boolean {
  return platform() !== "tarayici";
}

let siradaki = 0;
let dinleyiciKuruldu = false;
const bekleyen = new Map<number, { resolve: (v: unknown) => void; reject: (e: Error) => void; timer: ReturnType<typeof setTimeout> }>();

function dinleyiciyiKur(): void {
  if (dinleyiciKuruldu || !window.OAAndroid) return;
  dinleyiciKuruldu = true;
  window.OAAndroid.onmessage = (e) => {
    try {
      const r = JSON.parse(e.data) as { id: number; value?: unknown; error?: string };
      const p = bekleyen.get(r.id);
      if (!p) return;
      clearTimeout(p.timer);
      bekleyen.delete(r.id);
      if (r.error) p.reject(new Error(r.error)); else p.resolve(r.value);
    } catch { /* yabancı mesaj yok sayılır */ }
  };
}

/** Kullanıcı etkileşimi bekleyen işlemler (dosya seçtirme, kamera, izin penceresi) uzun sürebilir. */
const UZUN_ISLEMLER = new Set(["kaydet", "kaydetBitir", "scan", "yazdir", "bildirimIzni", "veliyePaylas"]);

export function androidIstek<T = unknown>(op: string, veri: Record<string, unknown> = {}): Promise<T> {
  if (!androidVarMi()) return Promise.reject(new Error("Android köprüsü bulunamadı."));
  dinleyiciyiKur();
  const id = ++siradaki;
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      bekleyen.delete(id);
      reject(new Error("Telefon işlemi zaman aşımına uğradı. Veriniz telefonda duruyor; tekrar deneyin."));
    }, UZUN_ISLEMLER.has(op) ? 600_000 : 60_000);
    bekleyen.set(id, { resolve: resolve as (v: unknown) => void, reject, timer });
    window.OAAndroid!.postMessage(JSON.stringify({ id, op, ...veri }));
  });
}

/** Uint8Array → base64 (büyük dosyada yığın taşmasın diye parça parça). */
export function base64Kodla(bytes: Uint8Array): string {
  let s = "";
  const PARCA = 0x8000;
  for (let i = 0; i < bytes.length; i += PARCA) s += String.fromCharCode(...bytes.subarray(i, i + PARCA));
  return btoa(s);
}

/** iOS/iPadOS (Safari ve WKWebView). iPad "masaüstü" kimliğiyle Macintosh görünür; dokunmatik olması ayırır. */
export function iosMu(): boolean {
  try {
    const ua = navigator.userAgent || "";
    return /iPad|iPhone|iPod/.test(ua) || (/Macintosh/.test(ua) && (navigator.maxTouchPoints ?? 0) > 1);
  } catch { return false; }
}

/** `<input type=file accept>` için: iOS tanımadığı uzantıları (.oa27yedek, .oapaket …) listede SOLUK gösterip
 *  seçtirmiyor. iOS'ta kısıt koyma (her dosya seçilebilsin; içerik zaten doğrulanıyor), diğerlerinde aynen bırak. */
export function dosyaKabulu(kabul: string): string | undefined {
  return iosMu() ? undefined : kabul;
}

/** OA85: köprüye tek seferde giden parça (çözülmüş). 2 MB → ~2,7 MB base64 mesaj; bellekte hep tek parça. */
export const KOPRU_PARCA_BAYTI = 2 * 1024 * 1024;

/** Büyük ikili veriyi telefonun önbelleğine PARÇA PARÇA yazar, oturum kimliğini döner. Sonra çağıran
 *  "kaydetBitir" (Kaydet penceresi) ya da "veriYazBitir" (uygulama veri dosyası) ile oturumu bitirir.
 *  Eskiden dosyanın tamamı tek mesajda base64 + JSON gidiyordu: 45 MB'lık yedekte ~700 MB tepe bellek,
 *  60 MB üstü "Dosya çok büyük". Hata olursa yarım oturum telefonda silinir. */
export async function parcaliGonder(bytes: Uint8Array, ilerleme?: (oran: number) => void): Promise<string> {
  const oturum = await androidIstek<string>("parcaBasla", { boyut: bytes.byteLength });
  try {
    for (let i = 0; i < bytes.byteLength; i += KOPRU_PARCA_BAYTI) {
      await androidIstek("parcaEkle", { oturum, base64: base64Kodla(bytes.subarray(i, i + KOPRU_PARCA_BAYTI)) });
      ilerleme?.(Math.min(1, (i + KOPRU_PARCA_BAYTI) / Math.max(1, bytes.byteLength)));
    }
    return oturum;
  } catch (err) {
    await androidIstek("parcaIptal", { oturum }).catch(() => undefined);
    throw err;
  }
}
