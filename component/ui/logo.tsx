import { ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
  size?: "sm" | "md" | "lg";
}

export function Logo({ className, size = "md" }: LogoProps) {
  const sizeClasses = {
    sm: "text-lg",
    md: "text-xl",
    lg: "text-2xl",
  };

  const iconSizes = {
    sm: 20,
    md: 24,
    lg: 32,
  };

  return (
    <div className={cn("flex items-center gap-2 font-bold", sizeClasses[size], className)}>
      <div className="flex items-center justify-center rounded-md bg-primary p-1 text-primary-foreground">
        <ShieldCheck size={iconSizes[size]} aria-hidden="true" />
      </div>
      <span>BoBo</span>
    </div>
  );
}
