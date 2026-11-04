const ODAKLANABILIR_SECICI = [
  "button:not([disabled])",
  "a[href]",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
].join(",");

export function odaklanabilirOgeler(kok: ParentNode): HTMLElement[] {
  return Array.from(kok.querySelectorAll<HTMLElement>(ODAKLANABILIR_SECICI)).filter(
    (oge) => !oge.hasAttribute("hidden") && oge.getAttribute("aria-hidden") !== "true",
  );
}

/** Drawer içinde odağı döndürür; Escape'i tek kapatma sözleşmesine bağlar. */
export function cekmeceKlavyesiniYonet(
  e: KeyboardEvent,
  kok: HTMLElement,
  kapat: () => void,
): boolean {
  if (e.key === "Escape") {
    e.preventDefault();
    kapat();
    return true;
  }
  if (e.key !== "Tab") return false;
  const ogeler = odaklanabilirOgeler(kok);
  if (ogeler.length === 0) {
    e.preventDefault();
    kok.focus();
    return true;
  }
  const ilk = ogeler[0];
  const son = ogeler[ogeler.length - 1];
  if (e.shiftKey && document.activeElement === ilk) {
    e.preventDefault();
    son.focus();
    return true;
  }
  if (!e.shiftKey && document.activeElement === son) {
    e.preventDefault();
    ilk.focus();
    return true;
  }
  return false;
}

/** ARIA menu içinde ok/Home/End dolaşımını ve Escape ile açıcıya dönüşü yönetir. */
export function menuKlavyesiniYonet(
  e: KeyboardEvent,
  kok: HTMLElement,
  kapatVeAciciyaDon: () => void,
): boolean {
  const ogeler = Array.from(
    kok.querySelectorAll<HTMLElement>('[role="menuitem"]:not([disabled])'),
  ).filter((oge) => oge.getAttribute("aria-hidden") !== "true");
  if (e.key === "Escape") {
    e.preventDefault();
    e.stopPropagation();
    kapatVeAciciyaDon();
    return true;
  }
  if (!ogeler.length) return false;
  const aktifIndex = ogeler.indexOf(document.activeElement as HTMLElement);
  let hedefIndex: number | null = null;
  if (e.key === "ArrowDown") hedefIndex = aktifIndex < 0 ? 0 : (aktifIndex + 1) % ogeler.length;
  if (e.key === "ArrowUp") hedefIndex = aktifIndex < 0 ? ogeler.length - 1 : (aktifIndex - 1 + ogeler.length) % ogeler.length;
  if (e.key === "Home") hedefIndex = 0;
  if (e.key === "End") hedefIndex = ogeler.length - 1;
  if (hedefIndex === null) return false;
  e.preventDefault();
  ogeler[hedefIndex].focus();
  return true;
}
