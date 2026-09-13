import type * as React from "react";
import type { SimpleIcon as SimpleIconType } from "simple-icons";
import { cn } from "@/lib/utils";

type SimpleIconProps = {
  icon: SimpleIconType;
  className?: string;
  useColor?: boolean;
} & React.SVGProps<SVGSVGElement>;

export function SimpleIcon({ icon, className, useColor = false, ...props }: SimpleIconProps) {
  const { title, path, hex } = icon;
  return (
    <svg
      viewBox="0 0 24 24"
      aria-label={title}
      aria-hidden="false"
      focusable="false"
      className={cn("size-[18px] shrink-0", className)}
      style={useColor ? { fill: `#${hex}` } : { fill: "currentColor" }}
      {...props}
    >
      <title>{title}</title>
      <path d={path} />
    </svg>
  );
}
