import type { ButtonHTMLAttributes, ReactNode } from "react";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "ghost" | "danger" | "muted";
  icon?: ReactNode;
};

const variants = {
  primary: "bg-leaf text-white shadow-soft active:bg-teal-800",
  ghost: "bg-white text-ink ring-1 ring-slate-200 active:bg-slate-100 dark:bg-slate-900 dark:text-slate-100 dark:ring-slate-700",
  danger: "bg-rose-600 text-white active:bg-rose-700",
  muted: "bg-slate-100 text-slate-700 active:bg-slate-200 dark:bg-slate-800 dark:text-slate-100"
};

export function Button({ variant = "primary", icon, className = "", children, ...props }: Props) {
  return (
    <button
      className={`tap-target inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition ${variants[variant]} ${className}`}
      {...props}
    >
      {icon}
      {children}
    </button>
  );
}
