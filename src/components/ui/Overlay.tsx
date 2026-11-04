import { useId, useRef, type ReactNode } from "react";
import { AlertTriangle } from "lucide-react";
import { useModalErisilebilirligi } from "@/lib/modalErisilebilirligi";
import { Button, type ButtonVariant } from "./Button";
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
