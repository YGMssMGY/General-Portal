import nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";
import { config } from "@/config";
import { ApiError } from "@/lib/api";
import { unavailable } from "@/lib/auth/providers";

let cached: Transporter | null = null;

export function getTransporter(): Transporter {
    if (!config.smtp.host.trim() || !config.smtp.from.trim()) throw new ApiError(unavailable, 503);
    if (!cached) {
        cached = nodemailer.createTransport({
            host: config.smtp.host,
            port: config.smtp.port,
            secure: config.smtp.port === 465,
            auth: config.smtp.user ? { user: config.smtp.user, pass: config.smtp.pass } : undefined,
        });
    }
    return cached;
}

export async function sendAuthMail(to: string, subject: string, text: string): Promise<void> {
    try {
        await getTransporter().sendMail({ from: config.smtp.from, to, subject, text });
    } catch {
        throw new ApiError(unavailable, 503);
    }
}
