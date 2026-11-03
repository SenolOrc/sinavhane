// modules/ders-kitabi/lib/onizlemeYenile.ts — Denetim (2026-10, B5): eski küçük
// (uzun kenarı 160 px) kırpma önizlemelerini, havuzda/listede GÖRÜNTÜLENDİKLERİ anda
// PDF'ten 480 px genişlikte yeniden üretir ve aynı anahtarla depoya yazar
// (kirpmaOnizlemeDepo.put üzerine yazar — ek depolama API'si gerekmedi).
//
// Kurallar: tek seferde tek iş (sayfa açıkken 20 kart aynı anda PDF açmasın), aynı
// kitabın sıradaki kırpmaları için PDF bir kez açılır; başarısız olan (PDF yok, kitap
// arşivde, kayıt bir not) bu oturumda bir daha denenmez. Hata ASLA kullanıcıya
// gösterilmez — eski küçük önizleme yerinde kalır (türetilmiş veri, kayıp yok).
import type { KirpmaKaydi } from "@shared/types";
import { sayfaBolgesiniRenderEt, type YapisalPdfSayfa } from "@shared/pdf-kirpma";
import { kirpmaBul, kitapBul } from "../queries";
import { kirpmaOnizlemeKaydet } from "../storage/kirpmaOnizlemeDepo";
import { ONIZLEME_AZAMI_UZUN_KENAR_PX, ONIZLEME_HEDEF_GENISLIK_PX } from "./kirpmaOnizleme";
import { pdfBelgeAc, type DersKitabiPdfBelge } from "./pdfBelge";

type Bekleyen = { id: string; hazirBelge?: DersKitabiPdfBelge; coz: (dataUrl: string | null) => void };

const kuyruk: Bekleyen[] = [];
const denenenler = new Set<string>();
const acilamayanKitaplar = new Set<string>();
let calisiyor = false;

/** Kırpma kimliği için 480 px önizlemeyi PDF'ten üretip saklar; yeni dataUrl ya da null döner.
 *  `hazirBelge`: okuyucunun zaten açık PDF'i (verilirse PDF yeniden açılmaz/kapatılmaz —
 *  Android'de PDF baytları her açılışta belleğe okunduğu için önemli). */
export function onizlemeyiYenile(id: string, hazirBelge?: DersKitabiPdfBelge): Promise<string | null> {
  if (denenenler.has(id)) return Promise.resolve(null);
  denenenler.add(id);
  return new Promise((coz) => {
    kuyruk.push({ id, hazirBelge, coz });
    void isle();
  });
}

async function bolgeyiUret(belge: DersKitabiPdfBelge, kirpma: KirpmaKaydi): Promise<string> {
  const sayfa = await belge.getPage(kirpma.sayfa) as unknown as YapisalPdfSayfa;
  const taban = sayfa.getViewport({ scale: 1 });
  const w1 = Math.max(1, kirpma.w * taban.width);
  const h1 = Math.max(1, kirpma.h * taban.height);
  // Genişlik 480 olacak uzun kenar; uzun-dar kırpmada 960'ta kesilir (kirpmaOnizleme ile aynı kural).
  const uzunKenar = Math.min(ONIZLEME_AZAMI_UZUN_KENAR_PX, ONIZLEME_HEDEF_GENISLIK_PX * Math.max(w1, h1) / w1);
  const canvas = await sayfaBolgesiniRenderEt(sayfa, { x: kirpma.x, y: kirpma.y, w: kirpma.w, h: kirpma.h }, uzunKenar);
  return canvas.toDataURL("image/jpeg", 0.8);
}

async function isle(): Promise<void> {
  if (calisiyor) return;
  calisiyor = true;
  let acikKitapId: string | null = null;
  let belge: DersKitabiPdfBelge | null = null;
  try {
    while (kuyruk.length) {
      const { id, hazirBelge, coz } = kuyruk.shift()!;
      try {
        const kirpma = kirpmaBul(id);
        const kitap = kirpma ? kitapBul(kirpma.kitapId) : undefined;
        if (!kirpma || !kitap || kitap.arsiv || acilamayanKitaplar.has(kitap.id)) { coz(null); continue; }
        if (hazirBelge) {
          const dataUrl = await bolgeyiUret(hazirBelge, kirpma);
          await kirpmaOnizlemeKaydet(id, dataUrl);
          denenenler.delete(id); // başarılı: yalnız BAŞARISIZ olan oturumda tekrar denenmez
          coz(dataUrl);
          continue;
        }
        if (acikKitapId !== kitap.id) {
          await belge?.destroy().catch(() => undefined);
          belge = null;
          acikKitapId = kitap.id;
          try {
            belge = await pdfBelgeAc(kitap.id);
          } catch (err) {
            acilamayanKitaplar.add(kitap.id); // PDF yok: bu kitabın diğer kırpmaları da denenmesin
            throw err;
          }
        }
        if (!belge) { coz(null); continue; }
        const dataUrl = await bolgeyiUret(belge, kirpma);
        await kirpmaOnizlemeKaydet(id, dataUrl);
        denenenler.delete(id);
        coz(dataUrl);
      } catch {
        // Render hatasında belge sıfırlanır; sıradaki iş gerekirse yeniden açar.
        await belge?.destroy().catch(() => undefined);
        belge = null;
        acikKitapId = null;
        coz(null);
      }
    }
  } finally {
    await belge?.destroy().catch(() => undefined);
    calisiyor = false;
  }
}
