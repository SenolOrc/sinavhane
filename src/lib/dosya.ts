// lib/dosya.ts — ortam-bağımsız dosya kaydetme.
// Tauri'de yerel "Farklı Kaydet" diyaloğu + Rust dosya_yaz komutu (webview indirme yapamaz).
// Tarayıcıda klasik <a download> indirme (geliştirme için).
import { tauriVarMi } from "@/lib/tauri";
import { androidIstek, androidVarMi, parcaliGonder } from "@/lib/platform";

/** Dosyayı kaydeder. Dönüş: gerçekten kaydedildiyse true, öğretmen kaydetme
 *  penceresini İPTAL ettiyse false — "yedek alındı" gibi sonuçlar buna bakmalı. */
export async function dosyaKaydet(veri: Blob | Uint8Array, dosyaAdi: string, mimeTuru?: string): Promise<boolean> {
  const bytes = veri instanceof Uint8Array ? veri : new Uint8Array(await veri.arrayBuffer());

  if (tauriVarMi()) {
    const { save } = await import("@tauri-apps/plugin-dialog");
    const { invoke } = await import("@tauri-apps/api/core");
    const yol = await save({ defaultPath: dosyaAdi });
    if (!yol) return false; // kullanıcı iptal etti
    // OA85: ham gövde (eskiden Array.from → JSON sayı dizisi, 45 MB'lık dosyada ~1,3 GB bellek).
    // Gövde, kendi ArrayBuffer'ının tamamı olmalı; değilse yalnız o dilim kopyalanır.
    const ham = bytes.byteOffset === 0 && bytes.byteLength === bytes.buffer.byteLength ? bytes : bytes.slice();
    await invoke("dosya_yaz", ham, { headers: { "x-oa-yol": encodeURIComponent(yol) } });
    return true;
  }

  // Android tam uygulama: WebView <a download> yapamaz → sistemin "Kaydet"
  // penceresi (Storage Access Framework). Kullanıcı Drive, İndirilenler ya da
  // paylaşım hedefini seçer. İptalde false (yedek sihirbazları buna bakar).
  if (androidVarMi()) {
    const mime = (mimeTuru ?? (veri instanceof Blob && veri.type ? veri.type : mimeTahmin(dosyaAdi))).split(";")[0].trim();
    try {
      // OA85: parça parça (bkz. platform.ts::parcaliGonder) — boyut sınırı 1 GB, bellekte tek parça.
      const oturum = await parcaliGonder(bytes);
      return await androidIstek<boolean>("kaydetBitir", { oturum, ad: dosyaAdi, mime });
    } catch (err) {
      if (err instanceof Error && /iptal/i.test(err.message)) return false;
      throw err;
    }
  }

  // Tarayıcı fallback
  const blob = veri instanceof Blob ? veri : new Blob([bytes as unknown as BlobPart]);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = dosyaAdi;
  // OA78: bağlantı sayfaya eklenmeden ve URL hemen bırakılınca Chrome dosyayı "download" adıyla kaydedebiliyordu.
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 30_000);
  return true;
}

/** Android'in "Kaydet" penceresi dosya türünü bilmek ister. */
export function mimeTahmin(ad: string): string {
  const uzanti = ad.toLowerCase().split(".").pop() ?? "";
  const tablo: Record<string, string> = {
    pdf: "application/pdf",
    docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    csv: "text/csv", json: "application/json", zip: "application/zip",
    png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", txt: "text/plain",
  };
  return tablo[uzanti] ?? "application/octet-stream";
}
