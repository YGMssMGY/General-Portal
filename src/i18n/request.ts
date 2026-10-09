import { getRequestConfig } from "next-intl/server";
import { cookies, headers } from "next/headers";
import { routing } from "./routing";
import deDE from "../../messages/de-DE.json";
import enUS from "../../messages/en-US.json";
import esES from "../../messages/es-ES.json";
import frFR from "../../messages/fr-FR.json";
import zhCN from "../../messages/zh-CN.json";

const allMessages = {
    "en-US": enUS,
    "zh-CN": zhCN,
    "de-DE": deDE,
    "fr-FR": frFR,
    "es-ES": esES,
} as const;

function isLocale(value: string | undefined): value is keyof typeof allMessages {
    return !!value && (Object.keys(allMessages) as string[]).includes(value);
}

export default getRequestConfig(async () => {
    const store = await cookies();
    const headerList = await headers();
    const raw = store.get("NEXT_LOCALE")?.value ?? headerList.get("x-locale") ?? undefined;
    const locale = isLocale(raw) ? raw : routing.defaultLocale;
    return { locale, messages: allMessages[locale] };
});
