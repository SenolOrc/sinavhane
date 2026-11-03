import type { HTMLAttributes, ReactNode } from "react";
import { AlertCircle, AlertTriangle, CheckCircle2, Info, X } from "lucide-react";
import { cn } from "./cn";

export type FeedbackTone = "info" | "success" | "warning" | "danger";

const TON: Record<FeedbackTone, { kutu: string; ikon: string; Icon: typeof Info }> = {
  info: { kutu: "border-sky-200 bg-sky-50 text-sky-900", ikon: "text-sky-600", Icon: Info },
  success: { kutu: "border-emerald-200 bg-emerald-50 text-emerald-900", ikon: "text-emerald-600", Icon: CheckCircle2 },
  warning: { kutu: "border-amber-200 bg-amber-50 text-amber-950", ikon: "text-amber-600", Icon: AlertTriangle },
  danger: { kutu: "border-red-200 bg-red-50 text-red-900", ikon: "text-red-600", Icon: AlertCircle },
};

export function Alert({ tone = "info", title, actions, className, children, ...props }: HTMLAttributes<HTMLDivElement> & {
  tone?: FeedbackTone;
  title?: ReactNode;
  actions?: ReactNode;
}) {
  const stil = TON[tone];
  const Icon = stil.Icon;
  return (
    <div role={tone === "danger" ? "alert" : "status"} className={cn("flex items-start gap-3 rounded-xl border px-4 py-3 text-sm", stil.kutu, className)} {...props}>
      <Icon size={18} className={cn("mt-0.5 shrink-0", stil.ikon)} aria-hidden="true" />
      <div className="min-w-0 flex-1">
        {title && <div className="font-bold">{title}</div>}
        <div className={cn("leading-5", title && "mt-0.5 text-xs opacity-85")}>{children}</div>
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function Toast({ tone = "info", title, onDismiss, action, className, children }: {
  tone?: FeedbackTone;
  title?: ReactNode;
  onDismiss?: () => void;
  action?: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  const stil = TON[tone];
  const Icon = stil.Icon;
  return (
    <div role={tone === "danger" ? "alert" : "status"} aria-live={tone === "danger" ? "assertive" : "polite"} className={cn("flex w-[min(92vw,380px)] items-start gap-3 rounded-xl border bg-white px-4 py-3 text-sm text-slate-800 shadow-xl", className)}>
      <Icon size={18} className={cn("mt-0.5 shrink-0", stil.ikon)} aria-hidden="true" />
      <div className="min-w-0 flex-1">
        {title && <div className="font-bold">{title}</div>}
        <div className={cn("leading-5 text-slate-600", Boolean(title) && "mt-0.5 text-xs")}>{children}</div>
        {action && <div className="mt-2">{action}</div>}
      </div>
      {onDismiss && (
        <button type="button" aria-label="Bildirimi kapat" onClick={onDismiss} className="shrink-0 rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
          <X size={15} />
        </button>
      )}
    </div>
  );
}

export function ToastViewport({ children }: { children: ReactNode }) {
  return <div className="pointer-events-none fixed bottom-5 right-5 z-[80] flex flex-col items-end gap-2 [&>*]:pointer-events-auto">{children}</div>;
}
