import { useEffect, useRef, type RefObject } from "react";

/**
 * Açılır katmanı dışarı tıklanınca kapatır.
 *
 * Neden ortak: aynı efekt üç yerde ayrı ayrı yazılmıştı (`OneriliInput` ve
 * `SinavZenginMetin`'in iki kutusu) ve Sınav Oluşturucu'nun üst menüsünde
 * HİÇ yazılmamıştı — menü klavyeyle (Escape/oklar) kapanıyor ama fareyle
 * başka bir yere tıklayınca açık kalıyordu. Dördüncü kopyayı yazmak yerine
 * tek kaynağa indirildi (§9.7).
 *
 * `mousedown` kullanılıyor, `click` değil — modüldeki mevcut üç uygulamanın
 * üçü de böyleydi ve katman basışta kapanıyor, bırakışta değil. (Önce buraya
 * "click katman değiştikten sonra yanlış hedefi görür" diye bir gerekçe
 * yazmıştım; ÖLÇMEDİM, o yüzden kaldırdım. Değiştirmek isteyen önce iki
 * davranışı ayırt eden bir senaryo yazsın — mevcut süit ayırt etmiyor.)
 *
 * AÇICI DÜĞMEYİ de "içeri" say. Aksi hâlde açıkken açıcıya tıklamak önce
 * mousedown ile kapatır, sonra click olayı yeniden açar — menü hiç
 * kapanmıyormuş gibi görünür. Çağıran taraf açıcının ref'ini de vermelidir.
 */
export function useDisariTiklama(
  acik: boolean,
  kapat: () => void,
  ...refler: Array<RefObject<HTMLElement | null>>
): void {
  // Geri çağırma ve ref listesi her render'da yeniden üretiliyor; efektin
  // bağımlılığına konsaydı dinleyici her render'da sökülüp takılırdı ve
  // mousedown ile bu sökülme arasına düşen tıklama kaybolabilirdi.
  const kapatRef = useRef(kapat);
  kapatRef.current = kapat;
  const reflerRef = useRef(refler);
  reflerRef.current = refler;

  useEffect(() => {
    if (!acik) return undefined;
    function disariTikla(olay: MouseEvent) {
      const hedef = olay.target as Node | null;
      if (!hedef) return;
      if (reflerRef.current.some((ref) => ref.current?.contains(hedef))) return;
      kapatRef.current();
    }
    document.addEventListener("mousedown", disariTikla);
    return () => document.removeEventListener("mousedown", disariTikla);
  }, [acik]);
}
