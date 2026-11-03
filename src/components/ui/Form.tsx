import { forwardRef, useId, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";
import { cn } from "./cn";

const KONTROL = "w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400";

function FieldFrame({ id, label, required, hint, error, children, className }: {
  id: string;
  label?: ReactNode;
  required?: boolean;
  hint?: ReactNode;
  error?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label htmlFor={id} className={cn("block min-w-0", className)}>
      {label && (
        <span className="mb-1.5 block text-sm font-semibold text-slate-700">
          {label}{required && <span className="ml-1 text-red-600" aria-hidden="true">*</span>}
        </span>
      )}
      {children}
      {error ? (
        <span id={`${id}-error`} className="mt-1.5 block text-xs font-medium text-red-600">{error}</span>
      ) : hint ? (
        <span id={`${id}-hint`} className="mt-1.5 block text-xs leading-5 text-slate-500">{hint}</span>
      ) : null}
    </label>
  );
}

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  wrapperClassName?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, hint, error, wrapperClassName, className, id: gelenId, required, ...props },
  ref,
) {
  const otomatikId = useId();
  const id = gelenId ?? `oa-input-${otomatikId.replace(/:/g, "")}`;
  const aciklama = error ? `${id}-error` : hint ? `${id}-hint` : undefined;
  return (
    <FieldFrame id={id} label={label} required={required} hint={hint} error={error} className={wrapperClassName}>
      <input ref={ref} id={id} required={required} aria-invalid={!!error || undefined} aria-describedby={aciklama} className={cn(KONTROL, Boolean(error) && "border-red-300 focus:border-red-500 focus:ring-red-100", className)} {...props} />
    </FieldFrame>
  );
});

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  wrapperClassName?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { label, hint, error, wrapperClassName, className, id: gelenId, required, children, ...props },
  ref,
) {
  const otomatikId = useId();
  const id = gelenId ?? `oa-select-${otomatikId.replace(/:/g, "")}`;
  const aciklama = error ? `${id}-error` : hint ? `${id}-hint` : undefined;
  return (
    <FieldFrame id={id} label={label} required={required} hint={hint} error={error} className={wrapperClassName}>
      <select ref={ref} id={id} required={required} aria-invalid={!!error || undefined} aria-describedby={aciklama} className={cn(KONTROL, Boolean(error) && "border-red-300 focus:border-red-500 focus:ring-red-100", className)} {...props}>
        {children}
      </select>
    </FieldFrame>
  );
});

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  wrapperClassName?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { label, hint, error, wrapperClassName, className, id: gelenId, required, ...props },
  ref,
) {
  const otomatikId = useId();
  const id = gelenId ?? `oa-textarea-${otomatikId.replace(/:/g, "")}`;
  const aciklama = error ? `${id}-error` : hint ? `${id}-hint` : undefined;
  return (
    <FieldFrame id={id} label={label} required={required} hint={hint} error={error} className={wrapperClassName}>
      <textarea ref={ref} id={id} required={required} aria-invalid={!!error || undefined} aria-describedby={aciklama} className={cn(KONTROL, "min-h-24 resize-y", Boolean(error) && "border-red-300 focus:border-red-500 focus:ring-red-100", className)} {...props} />
    </FieldFrame>
  );
});
