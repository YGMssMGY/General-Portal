"use client";

import * as React from "react";
import {
    AlertDialog,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

export interface ConfirmDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    title: string;
    description?: string;
    confirmLabel: string;
    destructive?: boolean;
    requireTypedText?: boolean;
    typingChallenge?: string;
    onConfirm: () => void;
}

export const ConfirmDialog = ({
    open,
    onOpenChange,
    title,
    description,
    confirmLabel,
    destructive = false,
    requireTypedText = false,
    typingChallenge,
    onConfirm,
}: ConfirmDialogProps) => {
    return (
        <AlertDialog open={open} onOpenChange={onOpenChange}>
            <ConfirmDialogBody
                key={open ? "open" : "closed"}
                title={title}
                description={description}
                confirmLabel={confirmLabel}
                destructive={destructive}
                requireTypedText={requireTypedText}
                typingChallenge={typingChallenge}
                onConfirm={onConfirm}
            />
        </AlertDialog>
    );
};

const ConfirmDialogBody = ({
    title,
    description,
    confirmLabel,
    destructive,
    requireTypedText,
    typingChallenge,
    onConfirm,
}: Omit<ConfirmDialogProps, "open" | "onOpenChange">) => {
    const [typed, setTyped] = React.useState("");

    const challenge = typingChallenge ?? confirmLabel;
    const canConfirm = !requireTypedText || typed.trim() === challenge;

    const handleConfirm = () => {
        if (canConfirm) {
            onConfirm();
        }
    };

    return (
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>{title}</AlertDialogTitle>
                {description && <AlertDialogDescription>{description}</AlertDialogDescription>}
            </AlertDialogHeader>
            {requireTypedText && (
                <div className="space-y-2">
                    <Label htmlFor="confirm-dialog-input">
                        Type <span className="font-semibold">{challenge}</span> to confirm
                    </Label>
                    <Input
                        id="confirm-dialog-input"
                        value={typed}
                        onChange={(e) => setTyped(e.target.value)}
                        autoComplete="off"
                        placeholder={challenge}
                    />
                </div>
            )}
            <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <Button
                    variant={destructive ? "destructive" : "default"}
                    onClick={handleConfirm}
                    disabled={!canConfirm}
                >
                    {confirmLabel}
                </Button>
            </AlertDialogFooter>
        </AlertDialogContent>
    );
};

export default ConfirmDialog;
