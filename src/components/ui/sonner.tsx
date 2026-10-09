"use client";

import { Toaster as Sonner, type ToasterProps } from "sonner";

const Toaster = ({ ...props }: ToasterProps) => {
    return (
        <Sonner
            className="toaster group"
            toastOptions={{
                classNames: {
                    toast: "group toast group-[.toaster]:bg-[var(--color-bg)] group-[.toaster]:text-[var(--color-text)] group-[.toaster]:border-[var(--color-border)] group-[.toaster]:rounded-[5px] group-[.toaster]:shadow-lg",
                    description: "group-[.toast]:text-[var(--color-text-secondary)]",
                    actionButton:
                        "group-[.toast]:bg-[var(--color-primary)] group-[.toast]:text-[var(--color-bg)]",
                    cancelButton:
                        "group-[.toast]:bg-[var(--color-bg-secondary)] group-[.toast]:text-[var(--color-text-secondary)]",
                },
            }}
            {...props}
        />
    );
};

export { Toaster };
export default Toaster;
