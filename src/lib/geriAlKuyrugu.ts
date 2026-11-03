// lib/geriAlKuyrugu.ts — ekran değişiminden BAĞIMSIZ "geri al" bildirimi.
//
// NEDEN VAR: Kırpma/soru silme onayı yerine "sil + N sn geri al" tercih
// edilmişti (bkz. modules/ders-kitabi/KitapOkuyucuScreen.tsx, SoruHavuzuScreen.tsx) —
// akışı kesmediği ve hatayı SONRADAN fark eden öğretmeni kurtardığı için. Ama
// bildirim ekranın kendi useState'indeydi: öğretmen silip 10 sn dolmadan başka
// bir ekrana geçince (ör. Notlar/Ayarlar) bileşen unmount olup geri alma hakkı
// süre dolmadan ANINDA kayboluyordu — yani vaat edilen güvence tutmuyordu.
// Bu modül bildirimi React ağacından bağımsız modül seviyesinde tutar; App
// kabuğu (app/Layout.tsx) tek bir kalıcı toast render eder, hangi ekranda
// olunursa olsun geri alma hakkı gerçekten N sn sürer.
export type GeriAlBildirimi = {
  id: string;
  mesaj: string;
  saniye: number;
  geriAl: () => void | Promise<void>;
};

type Durum = { bildirim: GeriAlBildirimi; bitisMs: number } | null;

let durum: Durum = null;
let zamanlayici: number | null = null;
const dinleyiciler = new Set<() => void>();

function duyur() {
  for (const dinleyici of dinleyiciler) dinleyici();
}

export function geriAlAbone(dinleyici: () => void): () => void {
  dinleyiciler.add(dinleyici);
  return () => dinleyiciler.delete(dinleyici);
}

export function geriAlDurumu(): Durum {
  return durum;
}

export function geriAlBildirimiGoster(bildirim: Omit<GeriAlBildirimi, "id">): void {
  if (zamanlayici != null) window.clearTimeout(zamanlayici);
  const id = crypto.randomUUID();
  durum = { bildirim: { ...bildirim, id }, bitisMs: Date.now() + bildirim.saniye * 1000 };
  zamanlayici = window.setTimeout(() => {
    durum = null;
    zamanlayici = null;
    duyur();
  }, bildirim.saniye * 1000);
  duyur();
}

export async function geriAlUygula(): Promise<void> {
  if (!durum) return;
  const { bildirim } = durum;
  if (zamanlayici != null) window.clearTimeout(zamanlayici);
  zamanlayici = null;
  durum = null;
  duyur();
  try {
    await bildirim.geriAl();
  } catch (err) {
    // Sessizce yutulmasın: öğretmen "geri al"a bastı ve olmadıysa bilmeli.
    geriAlHatasi = err instanceof Error ? err.message : String(err);
    duyur();
    window.setTimeout(() => { geriAlHatasi = null; duyur(); }, 8000);
  }
}

let geriAlHatasi: string | null = null;
export function geriAlHatasiGetir(): string | null {
  return geriAlHatasi;
}

export function geriAlKapat(): void {
  if (zamanlayici != null) window.clearTimeout(zamanlayici);
  zamanlayici = null;
  durum = null;
  duyur();
}
