import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { LoaderCircle } from "lucide-react";
import { cn } from "./cn";

export type ButtonVariant = "primary" | "secondary" | "neutral" | "ghost" | "success" | "danger";
export type ButtonSize = "sm" | "md" | "lg";

const VARYANT: Record<ButtonVariant, string> = {
  primary: "border-transparent bg-brand-600 text-white shadow-sm hover:bg-brand-700",
  secondary: "border-brand-200 bg-brand-50 text-brand-700 hover:bg-brand-100",
  neutral: "border-slate-300 bg-white text-slate-700 hover:bg-slate-50",
  ghost: "border-transparent bg-transparent text-slate-600 hover:bg-slate-100",
  success: "border-transparent bg-emerald-600 text-white shadow-sm hover:bg-emerald-700",
  danger: "border-transparent bg-red-600 text-white shadow-sm hover:bg-red-700",
};

const BOYUT: Record<ButtonSize, string> = {
  // Dokunmatik ekranda (telefon/tablet) her düğme en az 44 px (parmak hedefi).
  sm: "min-h-8 gap-1.5 rounded-lg px-3 py-1.5 text-xs [@media(pointer:coarse)]:min-h-11",
  md: "min-h-10 gap-2 rounded-xl px-4 py-2 text-sm [@media(pointer:coarse)]:min-h-11",
  lg: "min-h-11 gap-2 rounded-xl px-5 py-2.5 text-sm",
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  loadingText?: string;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  fullWidth?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = "neutral",
    size = "md",
    loading = false,
    loadingText,
    leftIcon,
    rightIcon,
    fullWidth = false,
    disabled,
    className,
    children,
    type = "button",
    ...props
  },
  ref,
) {
  const kilitli = disabled || loading;
  return (
    <button
      ref={ref}
      type={type}
      disabled={kilitli}
      aria-busy={loading || undefined}
      className={cn(
        "inline-flex shrink-0 items-center justify-center border font-semibold transition-colors",
        "disabled:cursor-not-allowed disabled:opacity-50",
        VARYANT[variant],
        BOYUT[size],
        fullWidth && "w-full",
        className,
      )}
      {...props}
    >
      {loading ? <LoaderCircle size={size === "sm" ? 14 : 16} className="animate-spin" aria-hidden="true" /> : leftIcon}
      <span>{loading && loadingText ? loadingText : children}</span>
      {!loading && rightIcon}
    </button>
  );
});
