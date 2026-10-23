import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type Tone = "primary" | "success" | "warning" | "danger";
type Variant = "solid" | "soft";
type Size = "sm" | "md" | "lg";

// ⚠️ Tailwind 只识别完整的类名字符串，不能写成 `bg-${tone}` 这种拼接
const toneClass: Record<Variant, Record<Tone, string>> = {
  solid: {
    primary: "bg-primary text-primary-foreground",
    success: "bg-success text-success-foreground",
    warning: "bg-warning text-warning-foreground",
    danger: "bg-destructive text-white",
  },
  soft: {
    primary: "bg-primary/10 text-primary dark:bg-primary/20",
    success: "bg-success/10 text-success dark:bg-success/20",
    warning: "bg-warning/10 text-warning dark:bg-warning/20",
    danger: "bg-destructive/10 text-destructive dark:bg-destructive/20",
  },
};
const sizeClass: Record<Size, string> = {
  sm: "size-8 rounded-lg [&_svg]:size-4",
  md: "size-10 rounded-xl [&_svg]:size-5",
  lg: "size-16 rounded-2xl [&_svg]:size-7",
};
const strokeBySize: Record<Size, number> = { sm: 2.5, md: 2.4, lg: 2 };

export function IconTile({
  icon: Icon, tone = "primary", variant = "solid", size = "md", className,
}: {
  icon: LucideIcon; tone?: Tone; variant?: Variant; size?: Size; className?: string;
}) {
  return (
    <div className={cn("inline-flex shrink-0 items-center justify-center",
      sizeClass[size], toneClass[variant][tone], className)}>
      <Icon strokeWidth={strokeBySize[size]} aria-hidden="true" />
    </div>
  );
}

