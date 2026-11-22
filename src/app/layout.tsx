import type { Metadata } from "next";
import { cookies } from "next/headers";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";
import { Providers } from "@/components/QueryClientProvider";
import ChangelogProvider from "@/components/ChangelogProvider";
import ServiceWorker from "@/components/ServiceWorker";
import { normalizeSlug } from "@/db/client";
import { config } from "@/config";
import "@fontsource-variable/noto-sans";
import "@fontsource/noto-sans-sc";
import "@fontsource-variable/jetbrains-mono";
import "./globals.css";

export const metadata: Metadata = {
    metadataBase: new URL(config.baseUrl),
    title: { default: "General Portal", template: "%s | General Portal" },
    description: "Workspaces for clubs, teams, and organizations",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
    const locale = await getLocale();
    const messages = await getMessages();
    const store = await cookies();
    const portal = normalizeSlug(store.get("portal")?.value ?? "");
    return (
        <html lang={locale}>
            <head>
                <link rel="icon" href={portal ? `/${portal}.png` : "/icon.svg"} />
            </head>
            <body>
                <NextIntlClientProvider locale={locale} messages={messages}>
                    <Providers>
                        {children}
                        <ChangelogProvider />
                        <ServiceWorker />
                    </Providers>
                </NextIntlClientProvider>
            </body>
        </html>
    );
}
