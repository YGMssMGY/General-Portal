"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const toggleVariants = cva(
    "inline-flex items-center justify-center gap-2 rounded-[5px] text-sm font-medium transition-colors hover:bg-[var(--color-bg-secondary)] hover:text-[var(--color-text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=on]:bg-[var(--color-primary)] data-[state=on]:text-[var(--color-bg)] [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
    {
        variants: {
            variant: {
                default: "bg-transparent",
                outline:
                    "border border-[var(--color-border)] bg-transparent shadow-none hover:bg-[var(--color-bg-secondary)]",
            },
            size: {
                default: "h-10 px-3",
                sm: "h-9 px-2.5",
                lg: "h-11 px-5",
            },
        },
        defaultVariants: {
            variant: "default",
            size: "default",
        },
    },
);

export interface ToggleProps
    extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof toggleVariants> {
    pressed?: boolean;
    defaultPressed?: boolean;
    onPressedChange?: (pressed: boolean) => void;
}

const Toggle = React.forwardRef<HTMLButtonElement, ToggleProps>(
    (
        {
            className,
            variant,
            size,
            pressed,
            defaultPressed = false,
            onPressedChange,
            onClick,
            ...props
        },
        ref,
    ) => {
        const [internalPressed, setInternalPressed] = React.useState(pressed ?? defaultPressed);

        const isControlled = pressed !== undefined;
        const isPressed = isControlled ? pressed : internalPressed;

        const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
            if (!isControlled) {
                setInternalPressed(!isPressed);
            }
            onPressedChange?.(!isPressed);
            onClick?.(event);
        };

        return (
            <button
                ref={ref}
                type="button"
                aria-pressed={isPressed}
                data-state={isPressed ? "on" : "off"}
                className={cn(toggleVariants({ variant, size, className }))}
                onClick={handleClick}
                {...props}
            />
        );
    },
);
Toggle.displayName = "Toggle";

export { Toggle, toggleVariants };
export default Toggle;
