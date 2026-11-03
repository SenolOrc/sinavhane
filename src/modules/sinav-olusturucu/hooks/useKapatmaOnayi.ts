// "Kaydedilmemiş iş varken kapatma" davranışının TEK kaynağı.
//
// NEDEN: dört modalın dördü de bu soruyu farklı diller konuşarak soruyordu —
//   Çizim      : elle yazılmış bir katman (odak tuzağı YOK, Escape YOK)
//   Denklem    : window.confirm
//   PDF Kaynak : window.confirm
//   Görsel Parça: hiç sormuyordu; kırpma sessizce kayboluyordu
//
// `window.confirm` özellikle kötü tercih: yerel bir işletim sistemi kutusu,
// biçimlendirilemiyor, `useModalErisilebilirligi`'nin modal yığınının DIŞINDA
// kalıyor ve WKWebView ile WebView2'de aynı görünmüyor. §12.1'in dersi tam bu
// sınıftaydı — iki webview aynı JS'i çalıştırır ama aynı şeyi yapmaz.
//
// Bu hook yalnız DURUMU tutar; görünüm `KaydedilmemisUyarisi` bileşeninde ve o
// da `ModalKabuk` üzerine kuruludur, yani odak tuzağını ve Escape'i ücretsiz
// alır. Yığın mantığı iç içe modalı zaten destekliyor (`modalYigini`).

import { useState } from "react";

export type KapatmaOnayi = {
  /** Onay katmanı açık mı — üst modalın `kapanabilir` bayrağına verilmeli. */
  onayAcik: boolean;
  /** Kapatma isteği: iş varsa sorar, yoksa doğrudan kapatır. */
  kapatIstendi: () => void;
  /** "Evet, at" — onayı kapatır ve gerçek kapanışı çağırır. */
  onayla: () => void;
  /** "Vazgeç" — yalnız onayı kapatır, modal açık kalır. */
  vazgec: () => void;
};

/**
 * @param degisiklikVar Fonksiyon olarak alınır çünkü çağıranların bir kısmı bunu
 *   pahalı hesaplıyor (Çizim şekil dizisini stringify ile karşılaştırıyor);
 *   her render'da değil, yalnız kapatma anında hesaplanmalı.
 */
export function useKapatmaOnayi({
  degisiklikVar,
  onKapat,
}: {
  degisiklikVar: () => boolean;
  onKapat: () => void;
}): KapatmaOnayi {
  const [onayAcik, setOnayAcik] = useState(false);
  return {
    onayAcik,
    kapatIstendi: () => {
      if (degisiklikVar()) setOnayAcik(true);
      else onKapat();
    },
    onayla: () => {
      setOnayAcik(false);
      onKapat();
    },
    vazgec: () => setOnayAcik(false),
  };
}
