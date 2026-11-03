// lib/kapanisBosaltma.ts — pencere kapanırken bekleyen SQLite yazımını diske indirir.
//
// NEDEN AYRI DOSYA: iki katmanı birbirine bağlıyor (Tauri pencere olayı ↔ db/persistence)
// ve ikisi de ötekini tanımamalı — CLAUDE.md'nin "iki farklı yeri ilgilendiren
// orkestrasyon lib/'e çıkar" kuralı.
//
// NEDEN GEREKLİ: masaüstünde ASIL depo SQLite ve yazım 250 ms debounce'lu, ateşle-unut.
// `sqliteJsonHemenKaydet` yalnız göç/içe aktarma yollarında çağrılıyordu; kapanışa
// bağlı hiçbir boşaltma YOKTU. Öğretmen son değişikliğinden hemen sonra uygulamayı
// kapatınca o yazım hiç gerçekleşmiyor, üstelik bir sonraki açılışta
// `veritabaniHazirla` SQLite'ı okuyup localStorage'ın (daha yeni olan) kopyasının
// ÜSTÜNE yazıyor — yani elde duran taze kopya da siliniyor.
import { tauriVarMi } from "@/lib/tauri";
import { sqliteBekleyeniBosalt } from "@/db/persistence";
import { androidVarMi, iosMu } from "@/lib/platform";

let kuruldu = false;

/**
 * Kapanış boşaltmasını kurar. Tarayıcı önizlemesinde hiçbir şey yapmaz
 * (orada SQLite yok, localStorage zaten senkron yazılıyor).
 */
export async function kapanisBosaltmasiniKur(): Promise<void> {
  if (kuruldu) return;
  // Android: "kapanış" olayı yok; uygulama arka plana geçince (ana ekran, başka
  // uygulama, ekran kilidi) Android süreci haber vermeden öldürebilir. Görünürlük
  // gizlenince bekleyen yazımı hemen diske indir.
  if (androidVarMi()) {
    kuruldu = true;
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "hidden") void sqliteBekleyeniBosalt();
    });
    window.addEventListener("pagehide", () => { void sqliteBekleyeniBosalt(); });
    return;
  }
  // iPad/iPhone: pencere "kapanmaz", uygulama arka plana alınıp sistem tarafından sonlandırılır.
  // Gizlenirken bekleyen yazımı hemen diske indir (Tauri iOS ve tarayıcı/PWA için de zararsız).
  if (iosMu()) {
    kuruldu = true;
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "hidden") void sqliteBekleyeniBosalt();
    });
    window.addEventListener("pagehide", () => { void sqliteBekleyeniBosalt(); });
    return;
  }
  if (!tauriVarMi()) return;
  kuruldu = true;
  try {
    const { getCurrentWindow } = await import("@tauri-apps/api/window");
    const pencere = getCurrentWindow();
    let kapaniyor = false;
    pencere.onCloseRequested((olay) => {
      // Kapanışı DURDUR, yaz, sonra pencereyi kendimiz kapat. Beklemeden
      // kapatmak boşaltmayı yarıda bırakırdı: invoke asenkron, pencere
      // yıkılınca IPC cevabı hiç dönmez.
      olay.preventDefault();
      if (kapaniyor) return;
      kapaniyor = true;

      // İŞLEYİCİDEN HEMEN DÖN — boşaltma ve destroy ayrı bir görevde.
      // ÖLÇÜLDÜ (gerçek Tauri penceresi, 2026-08-07): `destroy()` bu
      // işleyicinin İÇİNDE beklenirse pencere HİÇ KAPANMIYOR. Rust tarafı
      // CloseRequestApi'yi tutup JS işleyicisinin bitmesini bekliyor, JS ise
      // Rust'tan destroy cevabını bekliyor — karşılıklı kilit. Prob olmadan
      // bu gözden kaçardı: `tsc` ve süitler temiz geçiyordu, uygulama ise
      // yalnız Zorla Çık ile kapanabilir hâle geliyordu.
      void (async () => {
        try {
          await sqliteBekleyeniBosalt();
        } finally {
          // try/finally ŞART: boşaltma patlarsa pencere kapanamaz hâle gelirdi
          // ve öğretmen uygulamayı Zorla Çık'tan başka türlü kapatamazdı —
          // veri kaybını önlemek için konulan şey daha büyük bir kayıp üretirdi.
          await pencere.destroy();
        }
      })();
    });
  } catch (err) {
    // Kurulum başarısızsa uygulama açılmaya devam etmeli; kaybedilen şey
    // kapanış güvencesi, işin kendisi değil.
    console.warn("Kapanış boşaltması kurulamadı", err);
  }
}
