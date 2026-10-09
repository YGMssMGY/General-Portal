import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
    locales: ["en-US", "zh-CN", "de-DE", "fr-FR", "es-ES"],
    defaultLocale: "en-US",
    localePrefix: "as-needed",
});

export type AppLocale = (typeof routing.locales)[number];
