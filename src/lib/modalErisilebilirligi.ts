import { useEffect, useRef, type RefObject } from "react";

const ODAKLANABILIR = 'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

const modalYigini: symbol[] = [];
let govdeKilidiSayisi = 0;
let oncekiGovdeTasmasi = "";

function govdeyiKilitle() {
  if (govdeKilidiSayisi === 0) {
    oncekiGovdeTasmasi = document.body.style.overflow;
    document.body.style.overflow = "hidden";
  }
  govdeKilidiSayisi += 1;
}

function govdeKilidiniAc() {
  govdeKilidiSayisi = Math.max(0, govdeKilidiSayisi - 1);
  if (govdeKilidiSayisi === 0) document.body.style.overflow = oncekiGovdeTasmasi;
}

export function useModalErisilebilirligi({
  containerRef,
  ilkOdakRef,
  onKapat,
  kapanabilir = true,
}: {
  containerRef: RefObject<HTMLElement>;
  ilkOdakRef?: RefObject<HTMLElement>;
  onKapat: () => void;
  kapanabilir?: boolean;
}) {
  const onKapatRef = useRef(onKapat);
  const kapanabilirRef = useRef(kapanabilir);
  onKapatRef.current = onKapat;
  kapanabilirRef.current = kapanabilir;

  useEffect(() => {
    const modalKimligi = Symbol("modal");
    modalYigini.push(modalKimligi);
    govdeyiKilitle();
    const oncekiOdak = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const container = containerRef.current;
    if (container && (ilkOdakRef?.current || !container.contains(document.activeElement))) {
      const varsayilanOdak = container.querySelector<HTMLElement>(ODAKLANABILIR);
      (ilkOdakRef?.current ?? varsayilanOdak ?? container).focus();
    }
    function klavye(event: KeyboardEvent) {
      if (modalYigini[modalYigini.length - 1] !== modalKimligi) return;
      if (event.key === "Escape") {
        if (kapanabilirRef.current) {
          event.preventDefault();
          event.stopPropagation();
          onKapatRef.current();
        }
        return;
      }
      if (event.key !== "Tab" || !containerRef.current) return;
      const odaklanabilirler = [...containerRef.current.querySelectorAll<HTMLElement>(ODAKLANABILIR)]
        .filter((oge) => !oge.hasAttribute("disabled") && oge.getAttribute("aria-hidden") !== "true");
      if (!odaklanabilirler.length) {
        event.preventDefault();
        containerRef.current.focus();
        return;
      }
      const ilk = odaklanabilirler[0];
      const son = odaklanabilirler[odaklanabilirler.length - 1];
      if (!containerRef.current.contains(document.activeElement)) {
        event.preventDefault();
        (event.shiftKey ? son : ilk).focus();
      } else if (event.shiftKey && document.activeElement === ilk) {
        event.preventDefault();
        son.focus();
      } else if (!event.shiftKey && document.activeElement === son) {
        event.preventDefault();
        ilk.focus();
      }
    }
    window.addEventListener("keydown", klavye);
    return () => {
      window.removeEventListener("keydown", klavye);
      const sira = modalYigini.lastIndexOf(modalKimligi);
      if (sira >= 0) modalYigini.splice(sira, 1);
      govdeKilidiniAc();
      if (oncekiOdak?.isConnected) oncekiOdak?.focus();
    };
  }, [containerRef, ilkOdakRef]);
}
