import { cn } from "@/lib/utils";
import { ButtonHTMLAttributes, forwardRef } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "danger" | "success" | "warning" | "ghost";
  size?: "sm" | "md" | "lg" | "xl";
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", children, ...props }, ref) => {
    const variants = {
      primary: "bg-blue-600 hover:bg-blue-700 text-white",
      secondary: "bg-slate-200 hover:bg-slate-300 text-slate-900",
      danger: "bg-red-600 hover:bg-red-700 text-white",
      success: "bg-green-600 hover:bg-green-700 text-white",
      warning: "bg-yellow-500 hover:bg-yellow-600 text-slate-900",
      ghost: "bg-transparent hover:bg-white/10 text-inherit border border-white/20",
    };
    const sizes = {
      sm: "px-3 py-2 text-sm rounded-lg",
      md: "px-4 py-3 text-base rounded-xl",
      lg: "px-6 py-4 text-lg rounded-xl font-semibold",
      xl: "px-8 py-6 text-xl rounded-2xl font-bold min-h-[72px]",
    };

    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center font-medium transition disabled:opacity-50 disabled:cursor-not-allowed",
          variants[variant],
          sizes[size],
          className
        )}
        {...props}
      >
        {children}
      </button>
    );
  }
);
Button.displayName = "Button";

export function StatusBadge({
  status,
  large,
}: {
  status: "GREEN" | "RED" | "YELLOW" | string;
  large?: boolean;
}) {
  const colors = {
    GREEN: "bg-green-500 text-white",
    RED: "bg-red-500 text-white",
    YELLOW: "bg-yellow-400 text-slate-900",
    APPROVED: "bg-green-100 text-green-800",
    PENDING: "bg-yellow-100 text-yellow-800",
    ACTIVE: "bg-blue-100 text-blue-800",
    DENIED: "bg-red-100 text-red-800",
    EXPIRED: "bg-slate-100 text-slate-600",
  };
  const color = colors[status as keyof typeof colors] ?? "bg-slate-100 text-slate-700";

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full font-bold uppercase tracking-wide",
        color,
        large ? "px-8 py-4 text-3xl" : "px-3 py-1 text-xs"
      )}
    >
      {status}
    </span>
  );
}

export function Card({
  children,
  className,
  dark,
}: {
  children: React.ReactNode;
  className?: string;
  dark?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border p-6 shadow-sm",
        dark ? "border-white/10 bg-[var(--guard-surface)]" : "border-slate-200 bg-white",
        className
      )}
    >
      {children}
    </div>
  );
}

export function Input({
  className,
  dark,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { dark?: boolean }) {
  return (
    <input
      className={cn(
        "w-full rounded-xl border px-4 py-3 text-base outline-none transition focus:ring-2",
        dark
          ? "border-white/20 bg-white/5 text-white placeholder:text-white/40 focus:ring-blue-500"
          : "border-slate-300 bg-white text-slate-900 focus:ring-blue-500",
        className
      )}
      {...props}
    />
  );
}

export function Select({
  className,
  dark,
  children,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement> & { dark?: boolean }) {
  return (
    <select
      className={cn(
        "w-full rounded-xl border px-4 py-3 text-base outline-none transition focus:ring-2",
        dark
          ? "border-white/20 bg-[var(--guard-surface)] text-white focus:ring-blue-500"
          : "border-slate-300 bg-white text-slate-900 focus:ring-blue-500",
        className
      )}
      {...props}
    >
      {children}
    </select>
  );
}

export function Textarea({
  className,
  dark,
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { dark?: boolean }) {
  return (
    <textarea
      className={cn(
        "w-full rounded-xl border px-4 py-3 text-base outline-none transition focus:ring-2",
        dark
          ? "border-white/20 bg-white/5 text-white placeholder:text-white/40 focus:ring-blue-500"
          : "border-slate-300 bg-white text-slate-900 focus:ring-blue-500",
        className
      )}
      {...props}
    />
  );
}
