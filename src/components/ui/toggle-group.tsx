"use client";

import * as React from "react";
import * as TogglePrimitive from "@radix-ui/react-toggle-group";
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

const ToggleGroupContext = React.createContext<VariantProps<typeof toggleVariants>>({
    size: "default",
    variant: "default",
});

const ToggleGroup = React.forwardRef<
    React.ElementRef<typeof TogglePrimitive.Root>,
    React.ComponentPropsWithoutRef<typeof TogglePrimitive.Root> &
        VariantProps<typeof toggleVariants>
>(({ className, variant, size, children, ...props }, ref) => {
    return (
        <ToggleGroupContext.Provider value={{ variant, size }}>
            <TogglePrimitive.Root
                ref={ref}
                className={cn("flex items-center justify-center gap-1", className)}
                {...props}
            >
                {children}
            </TogglePrimitive.Root>
        </ToggleGroupContext.Provider>
    );
});
ToggleGroup.displayName = TogglePrimitive.Root.displayName;

const ToggleGroupItem = React.forwardRef<
    React.ElementRef<typeof TogglePrimitive.Item>,
    React.ComponentPropsWithoutRef<typeof TogglePrimitive.Item> &
        VariantProps<typeof toggleVariants>
>(({ className, variant, size, children, ...props }, ref) => {
    const context = React.useContext(ToggleGroupContext);

    return (
        <TogglePrimitive.Item
            ref={ref}
            className={cn(
                toggleVariants({
                    variant: context.variant || variant,
                    size: context.size || size,
                }),
                className,
            )}
            {...props}
        >
            {children}
        </TogglePrimitive.Item>
    );
});
ToggleGroupItem.displayName = TogglePrimitive.Item.displayName;

export { ToggleGroup, ToggleGroupItem, toggleVariants };
export default ToggleGroup;
