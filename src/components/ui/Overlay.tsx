import { useId, useRef, type ReactNode } from "react";
import { AlertTriangle, X } from "lucide-react";
import { useModalErisilebilirligi } from "@/lib/modalErisilebilirligi";
import { Button, IconButton, type ButtonVariant } from "./Button";
import { cn } from "./cn";

type ConfirmDialogProps = Parameters<typeof ConfirmDialogIc>[0];

/** Denetim (2026-10): kapalıyken de erişilebilirlik kancası çalışıp gövdeyi kilitliyor ve pencere
 *  yığınının tepesini tutuyordu → açılan pencere odağı almıyor, Esc kapatmıyordu. Artık kanca
 *  yalnız pencere AÇIKKEN bağlanır. */
export function ConfirmDialog(props: ConfirmDialogProps) {
  if (!props.open) return null;
  return <ConfirmDialogIc {...props} />;
}

function ConfirmDialogIc({
  open,
  title,
  description,
  confirmLabel = "Evet, sil",
  cancelLabel = "Vazgeç",
  tone = "danger",
  loading = false,
  error,
  onConfirm,
  onClose,
  confirmDisabled = false,
  children,
}: {
  open: boolean;
  title: ReactNode;
  description: ReactNode;
  /** Onay düğmesini kilitler (ör. sınıf adı yazılarak onay). */
  confirmDisabled?: boolean;
  /** Açıklamanın altına ek içerik (ör. doğrulama kutusu). */
  children?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: "danger" | "primary";
  loading?: boolean;
  error?: ReactNode;
  onConfirm: () => void;
  onClose: () => void;
}) {
  const containerRef = useRef<HTMLElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const kimlik = useId().replace(/:/g, "");
  useModalErisilebilirligi({ containerRef, ilkOdakRef: cancelRef, onKapat: onClose, kapanabilir: open && !loading });

  const confirmVariant: ButtonVariant = tone === "danger" ? "danger" : "primary";
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/45 p-4" onMouseDown={(e) => { if (e.target === e.currentTarget && !loading) onClose(); }}>
      <section
        ref={containerRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby={`confirm-title-${kimlik}`}
        aria-describedby={`confirm-description-${kimlik}`}
        className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl"
      >
        <div className="flex items-start gap-3">
          <span className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-full", tone === "danger" ? "bg-red-100 text-red-600" : "bg-brand-100 text-brand-700")}>
            <AlertTriangle size={19} aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <h2 id={`confirm-title-${kimlik}`} className="text-base font-bold text-slate-900">{title}</h2>
            <div id={`confirm-description-${kimlik}`} className="mt-1 text-sm leading-6 text-slate-600">{description}</div>
          </div>
        </div>
        {children && <div className="mt-3">{children}</div>}
        {error && <div role="alert" className="mt-4 rounded-xl bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">{error}</div>}
        <div className="mt-5 flex justify-end gap-2">
          <Button ref={cancelRef} variant="neutral" onClick={onClose} disabled={loading}>{cancelLabel}</Button>
          <Button variant={confirmVariant} onClick={onConfirm} loading={loading} loadingText="İşleniyor…" disabled={confirmDisabled}>{confirmLabel}</Button>
        </div>
      </section>
    </div>
  );
}

type DrawerProps = Parameters<typeof DrawerIc>[0];
export function Drawer(props: DrawerProps) {
  if (!props.open) return null;
  return <DrawerIc {...props} />;
}

function DrawerIc({ open, title, description, side = "right", width = "md", footer, onClose, children }: {
  open: boolean;
  title: ReactNode;
  description?: ReactNode;
  side?: "left" | "right";
  width?: "sm" | "md" | "lg";
  footer?: ReactNode;
  onClose: () => void;
  children: ReactNode;
}) {
  const containerRef = useRef<HTMLElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const kimlik = useId().replace(/:/g, "");
  useModalErisilebilirligi({ containerRef, ilkOdakRef: closeRef, onKapat: onClose, kapanabilir: open });
  const genislik = width === "sm" ? "max-w-sm" : width === "lg" ? "max-w-2xl" : "max-w-lg";
  return (
    <div className="fixed inset-0 z-[65] bg-slate-950/40" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <aside
        ref={containerRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby={`drawer-title-${kimlik}`}
        className={cn("absolute inset-y-0 flex w-[min(94vw,100%)] flex-col bg-white shadow-2xl", genislik, side === "right" ? "right-0" : "left-0")}
      >
        <header className="flex shrink-0 items-start gap-3 border-b border-slate-200 px-5 py-4">
          <div className="min-w-0 flex-1">
            <h2 id={`drawer-title-${kimlik}`} className="text-base font-bold text-slate-900">{title}</h2>
            {description && <p className="mt-1 text-xs leading-5 text-slate-500">{description}</p>}
          </div>
          <IconButton ref={closeRef} label="Paneli kapat" icon={<X size={17} />} size="sm" onClick={onClose} />
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto p-5">{children}</div>
        {footer && <footer className="shrink-0 border-t border-slate-200 bg-white px-5 py-4">{footer}</footer>}
      </aside>
    </div>
  );
}
