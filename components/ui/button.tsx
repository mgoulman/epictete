import { forwardRef, cloneElement, isValidElement, type ReactElement } from "react";

type ButtonVariant = "primary" | "secondary" | "outline" | "ghost";
type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  asChild?: boolean;
}

const variants: Record<ButtonVariant, string> = {
  primary:
    "bg-accent text-accent-foreground hover:bg-accent-hover shadow-sm hover:shadow-glow-sm",
  secondary:
    "bg-secondary text-secondary-foreground hover:bg-border",
  outline:
    "border border-border bg-transparent text-foreground hover:bg-secondary hover:border-accent",
  ghost:
    "bg-transparent text-foreground hover:bg-secondary",
};

const sizes: Record<ButtonSize, string> = {
  sm: "px-3 py-1.5 text-sm",
  md: "px-5 py-2.5 text-base",
  lg: "px-7 py-3.5 text-lg",
};

function mergeClasses(...classes: (string | undefined)[]): string {
  return classes.filter(Boolean).join(' ').trim().replace(/\s+/g, ' ');
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  function Button({ className = "", variant = "primary", size = "md", asChild = false, children, ...props }, ref) {
    const buttonClasses = mergeClasses(
      "inline-flex items-center justify-center gap-2",
      "font-medium rounded-lg",
      "transition-all duration-300 ease-smooth",
      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
      "disabled:pointer-events-none disabled:opacity-50",
      variants[variant],
      sizes[size],
      className
    );

    if (asChild && isValidElement(children)) {
      const child = children as ReactElement<{ className?: string }>;
      const childClassName = child.props.className;
      return cloneElement(child, {
        className: mergeClasses(buttonClasses, childClassName),
      });
    }

    return (
      <button
        ref={ref}
        className={buttonClasses}
        {...props}
      >
        {children}
      </button>
    );
  }
);
