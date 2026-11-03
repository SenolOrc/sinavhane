// components/GeriAlToast.tsx — lib/geriAlKuyrugu için TEK, kalıcı toast.
// app/Layout.tsx içinde bir kez render edilir; hangi ekranda olunursa olsun
// aynı bildirim görünür kalır (bkz. geriAlKuyrugu.ts'teki gerekçe).
import { useEffect, useState } from "react";
import { geriAlAbone, geriAlDurumu, geriAlUygula, geriAlKapat, geriAlHatasiGetir } from "@/lib/geriAlKuyrugu";

export function GeriAlToast() {
  const [, tetikle] = useState(0);
  const durum = geriAlDurumu();

  useEffect(() => geriAlAbone(() => tetikle((n) => n + 1)), []);
  // Kalan saniye görünür şekilde azalsın diye saniyede bir yeniden çizilir;
  // bildirim yokken zamanlayıcı kurulmaz.
  useEffect(() => {
    if (!durum) return;
    const id = window.setInterval(() => tetikle((n) => n + 1), 1000);
    return () => window.clearInterval(id);
  }, [durum]);

  const hata = geriAlHatasiGetir();
  if (!durum && hata) {
    return <div role="alert" className="fixed inset-x-4 bottom-5 z-50 mx-auto max-w-md rounded-xl bg-red-700 px-4 py-3 text-sm font-semibold text-white shadow-xl">Geri alınamadı: {hata}</div>;
  }
  if (!durum) return null;
  const kalanSaniye = Math.max(1, Math.ceil((durum.bitisMs - Date.now()) / 1000));

  return (
    // 320 px'te genişliksiz "left-1/2 -translate-x-1/2" kutu ekranın yarısına sıkışıp
    // "Geri al" harf harf alt alta diziliyordu (K5): kenarlardan 16 px, en fazla 28rem.
    <div role="status" className="fixed inset-x-3 bottom-3 z-50 mx-auto flex max-w-md items-center gap-2 rounded-xl bg-slate-900 py-1 pl-3 pr-1 text-[13px] font-semibold leading-snug text-white shadow-xl sm:inset-x-auto sm:bottom-5 sm:gap-3 sm:px-4 sm:py-3 sm:text-sm sm:left-1/2 sm:w-max sm:max-w-[min(36rem,calc(100vw-2rem))] sm:-translate-x-1/2">
      {/* Telefonda en çok iki satır (OA52): üç satırlık bildirim kâğıdın ve
          sekmelerin üstünü ~90 px kapatıyordu. Tam metin ekran okuyucuya gider. */}
      <span className="line-clamp-2 min-w-0 flex-1 sm:line-clamp-none" title={durum.bildirim.mesaj}>{durum.bildirim.mesaj}</span>
      <button type="button" onClick={() => void geriAlUygula()} className="shrink-0 whitespace-nowrap rounded-lg bg-white/15 px-2.5 py-1 text-xs font-bold text-white hover:bg-white/25 [@media(pointer:coarse)]:min-h-11">
        Geri al ({kalanSaniye} sn)
      </button>
      <button type="button" onClick={geriAlKapat} aria-label="Bildirimi kapat" className="shrink-0 rounded-lg px-1.5 py-1 text-xs text-white/60 hover:text-white [@media(pointer:coarse)]:min-h-11 [@media(pointer:coarse)]:min-w-11">
        ✕
      </button>
    </div>
  );
}
