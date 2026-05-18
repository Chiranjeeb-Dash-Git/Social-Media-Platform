import * as React from "react";
import { cn } from "@/lib/utils";

interface AvatarProps extends React.HTMLAttributes<HTMLDivElement> {
  src?: string;
  alt?: string;
  size?: "sm" | "md" | "lg";
}

const Avatar = React.forwardRef<HTMLDivElement, AvatarProps>(
  ({ className, src, alt, size = "md", style, ...props }, ref) => {
    const sizeClasses = {
      sm: "h-8 w-8",
      md: "h-10 w-10",
      lg: "h-12 w-12",
    };

    return (
      <div
        ref={ref}
        role="img"
        aria-label={alt}
        className={cn(
          "rounded-full bg-cover bg-center border-2 border-[hsl(var(--border))]",
          sizeClasses[size],
          className
        )}
        style={{
          backgroundImage: `url(${src || `https://api.dicebear.com/7.x/avataaars/svg?seed=${alt}`})`,
          ...style,
        }}
        {...props}
      />
    );
  }
);

Avatar.displayName = "Avatar";

export { Avatar };
