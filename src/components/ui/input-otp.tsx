"use client";

import * as React from "react";
import { Minus } from "lucide-react";
import { cn } from "@/lib/utils";

export interface InputOTPProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "onChange"> {
    value?: string;
    defaultValue?: string;
    onChange?: (value: string) => void;
    maxLength?: number;
    pattern?: RegExp;
    disabled?: boolean;
    containerClassName?: string;
}

const InputOTP = React.forwardRef<HTMLDivElement, InputOTPProps>(
    (
        {
            className,
            containerClassName,
            value: controlledValue,
            defaultValue = "",
            onChange,
            maxLength = 6,
            pattern = /^[0-9]$/,
            disabled = false,
            ...props
        },
        ref,
    ) => {
        const [uncontrolledValue, setUncontrolledValue] = React.useState(defaultValue);
        const value = controlledValue ?? uncontrolledValue;
        const inputsRef = React.useRef<Array<HTMLInputElement | null>>([]);

        const commit = (next: string) => {
            const normalized = next.slice(0, maxLength);
            if (controlledValue === undefined) {
                setUncontrolledValue(normalized);
            }
            onChange?.(normalized);
        };

        const focusInput = (index: number) => {
            inputsRef.current[Math.max(0, Math.min(index, maxLength - 1))]?.focus();
        };

        const handleChange = (index: number, char: string) => {
            if (!pattern.test(char)) return;
            const chars = value.padEnd(maxLength, " ").split("");
            chars[index] = char;
            commit(chars.join("").trimEnd());
            focusInput(index + 1);
        };

        const handleKeyDown = (index: number, event: React.KeyboardEvent<HTMLInputElement>) => {
            if (event.key === "Backspace") {
                event.preventDefault();
                const chars = value.padEnd(maxLength, " ").split("");
                chars[index] = " ";
                commit(chars.join("").trimEnd());
                if (value[index]) {
                    focusInput(index);
                } else {
                    focusInput(index - 1);
                }
            } else if (event.key === "ArrowLeft") {
                event.preventDefault();
                focusInput(index - 1);
            } else if (event.key === "ArrowRight") {
                event.preventDefault();
                focusInput(index + 1);
            }
        };

        const handlePaste = (index: number, event: React.ClipboardEvent<HTMLInputElement>) => {
            event.preventDefault();
            const pasted = event.clipboardData.getData("text").split("");
            const chars = value.padEnd(maxLength, " ").split("");
            pasted.slice(0, maxLength - index).forEach((char, i) => {
                if (pattern.test(char)) chars[index + i] = char;
            });
            commit(chars.join("").trimEnd());
            focusInput(Math.min(index + pasted.length, maxLength - 1));
        };

        return (
            <div
                ref={ref}
                className={cn(
                    "flex items-center gap-2 disabled:cursor-not-allowed",
                    disabled && "opacity-50",
                    className,
                )}
                {...props}
            >
                {Array.from({ length: maxLength }).map((_, index) => (
                    <input
                        key={index}
                        ref={(el) => {
                            inputsRef.current[index] = el;
                        }}
                        type="text"
                        inputMode="numeric"
                        autoComplete="one-time-code"
                        disabled={disabled}
                        maxLength={1}
                        value={value[index] ?? ""}
                        onChange={(event) => handleChange(index, event.target.value)}
                        onKeyDown={(event) => handleKeyDown(index, event)}
                        onPaste={(event) => handlePaste(index, event)}
                        onFocus={(event) => event.target.select()}
                        className={cn(
                            "flex h-10 w-10 rounded-[5px] border border-[var(--color-border)] bg-[var(--color-bg)] text-center text-sm text-[var(--color-text)] outline-none transition-all focus:ring-2 focus:ring-[var(--color-primary)] focus:ring-offset-2 focus:ring-offset-[var(--color-bg)] disabled:cursor-not-allowed disabled:opacity-50",
                            containerClassName,
                        )}
                    />
                ))}
            </div>
        );
    },
);
InputOTP.displayName = "InputOTP";

const InputOTPGroup = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
    ({ className, ...props }, ref) => (
        <div ref={ref} className={cn("flex items-center", className)} {...props} />
    ),
);
InputOTPGroup.displayName = "InputOTPGroup";

const InputOTPSlot = React.forwardRef<
    HTMLDivElement,
    React.HTMLAttributes<HTMLDivElement> & { index?: number }
>(({ className, ...props }, ref) => (
    <div
        ref={ref}
        className={cn(
            "relative flex h-10 w-10 items-center justify-center border-y border-r border-[var(--color-border)] text-sm transition-all first:rounded-l-[5px] first:border-l last:rounded-r-[5px]",
            className,
        )}
        {...props}
    />
));
InputOTPSlot.displayName = "InputOTPSlot";

const InputOTPSeparator = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
    ({ ...props }, ref) => (
        <div ref={ref} role="separator" {...props}>
            <Minus />
        </div>
    ),
);
InputOTPSeparator.displayName = "InputOTPSeparator";

export { InputOTP, InputOTPGroup, InputOTPSlot, InputOTPSeparator };
export default InputOTP;
