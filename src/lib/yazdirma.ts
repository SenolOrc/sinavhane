// Yazdırmayı başlatan TEK kapı.
//
// NEDEN ayrı bir dosya: `window.print()` platforma göre farklı davranıyor ve
// bu fark uzun süre sessiz bir hata olarak durdu.
//
// - Tarayıcı ve Windows (WebView2): `window.print()` çalışır.
// - macOS (Tauri → WKWebView): `window.print()` çağrılabilir ama HİÇBİR ŞEY
//   yapmaz. WKWebView'da yazdırmayı barındıran uygulamanın başlatması gerekir;
//   tarayıcılardaki gibi yerleşik bir diyalog yoktur. Hata da fırlatmadığı için
//   "Yazdır" düğmesi sessizce ölü görünüyordu.
//
// Uygulama önce Windows'a paketlendiği için (bundle hedefi `nsis`) bu eksik
// macOS dmg'si alınana kadar fark edilmedi.
//
// Tauri tarafında `Webview::print()` var ve wry bunu macOS'ta
// NSPrintOperation'a bağlıyor — sistemin kendi yazdırma diyaloğu açılır,
// "PDF olarak kaydet" de oradan çıkar. Rust komutu: `yazdir` (src-tauri/src/lib.rs).
import { tauriVarMi } from "./tauri";
import { androidIstek, androidVarMi, iosMu } from "./platform";

//
// Android WebView'da da `window.print()` HİÇBİR ŞEY yapmaz (macOS'takiyle aynı
// sessiz ölüm). Android'de Java tarafı `WebView.createPrintDocumentAdapter` ile
// sistemin yazdırma ekranını açar; oradan yazıcı ya da "PDF olarak kaydet".
/**
 * `baslik`: yazdırma işinin ve "PDF olarak kaydet" önerilen dosyanın adı
 * (ör. "9-A Fizik 1. Yazılı", "Hareket Föyü 1"). Verilmezse hep "Öğretmen
 * Asistanı" çıkıyordu; birkaç sınav yazdıran öğretmen PDF'leri ayırt edemiyordu (T15).
 */
export async function yazdirmayiBaslat(baslik?: string): Promise<void> {
  const temiz = baslik?.replace(/[\\/:*?"<>|]+/g, " ").replace(/\s+/g, " ").trim().slice(0, 80) || "";
  const eskiBaslik = document.title;
  if (temiz) document.title = temiz;
  try {
    if (androidVarMi()) {
      await androidIstek("yazdir", { baslik: temiz || eskiBaslik || "Öğretmen Asistanı" });
      return;
    }
    // iPad/iPhone (Safari, ana ekran uygulaması ya da Tauri iOS): sistemin yazdırma sayfası window.print() ile açılır.
    if (!tauriVarMi() || iosMu()) {
      window.print();
      return;
    }
    const { invoke } = await import("@tauri-apps/api/core");
    await invoke("yazdir");
  } finally {
    // Tauri/WebView yazdırma diyaloğu başlığı eşzamansız okuyabilir; biraz sonra geri al.
    if (temiz) window.setTimeout(() => { document.title = eskiBaslik; }, 1500);
  }
}
