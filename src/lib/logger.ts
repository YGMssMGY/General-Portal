import pino from "pino";
import { config } from "@/config";

export const logger = pino({
    level: config.logLevel,
    redact: {
        paths: [
            "tokenHash",
            "codeHash",
            "codeVerifier",
            "*.password",
            "*.passwordHash",
            "*.secret",
            "*.clientSecret",
            "*.token",
            "*.accessToken",
            "*.refreshToken",
            "*.idToken",
            "req.headers.cookie",
            "req.headers.authorization",
        ],
        remove: true,
    },
    base: { service: "general-portal" },
});

export type Logger = typeof logger;
