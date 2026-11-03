/**
 * Kısayol etiketlerini çalışılan platforma göre yazar.
 *
 * NEDEN: uygulama İKİ platformda da kullanılıyor ve tuş dinleyicileri zaten
 * ikisini birden kabul ediyor (`e.ctrlKey || e.metaKey`). Yanlış olan yalnız
 * ETİKETLERDİ: her yerde "Ctrl+Z" yazıyordu, Windows'ta doğru, macOS'ta değil.
 * Öğretmen macOS'ta ⌘Z'ye basıyor, ekranda Ctrl yazdığı için "kısayol yok"
 * sanıyordu.
 *
 * Bu, §12.1'in dersinin etiket sürümü: iki platform aynı JS'i çalıştırır ama
 * kullanıcı aynı tuşa basmaz.
 *
 * Tespit `navigator.platform` üzerinden: WKWebView'da "MacIntel", WebView2'de
 * "Win32" döner. `userAgentData` önce deneniyor (modern Chromium/WebView2),
 * ama WebKit onu vermiyor — bu yüzden ikisi birden gerekiyor, biri yetmiyor.
 */
let macOnbellek: boolean | undefined;

function macMi(): boolean {
  if (macOnbellek === undefined) {
    const gezgin =
      typeof navigator === "undefined"
        ? undefined
        : (navigator as Navigator & { userAgentData?: { platform?: string } });
    const platform = gezgin?.userAgentData?.platform ?? gezgin?.platform ?? "";
    macOnbellek = /mac/i.test(platform);
  }
  return macOnbellek;
}

/**
 * "Ctrl+Z" → macOS'ta "⌘Z", Windows'ta "Ctrl+Z".
 * "Ctrl+Shift+Z" → "⇧⌘Z" / "Ctrl+Shift+Z".
 * "Ctrl+Z/Y" gibi birleşik yazımlar da çalışır (yalnız önek değişir).
 *
 * Kaynakta HER ZAMAN Windows yazımı tutulur; böylece kısayolun ne olduğu
 * kodu okurken belli olur ve aranabilir kalır.
 */
export function kisayol(windowsYazimi: string): string {
  if (!macMi()) return windowsYazimi;
  return windowsYazimi
    .replace(/Ctrl\+Shift\+/g, "⇧⌘")
    .replace(/Ctrl\+Alt\+/g, "⌥⌘")
    .replace(/Ctrl\+/g, "⌘");
}
