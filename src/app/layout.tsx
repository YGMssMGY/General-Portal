import type { Metadata } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";
import { Providers } from "@/components/QueryClientProvider";
import { FaviconSwitcher } from "@/components/FaviconSwitcher";
import "@fontsource-variable/noto-sans";
import "@fontsource/noto-sans-sc";
import "@fontsource-variable/jetbrains-mono";
import "./globals.css";

export const metadata: Metadata = {
    title: { default: "General Portal", template: "%s | General Portal" },
    description: "Workspaces for clubs, teams, and organizations",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
    const locale = await getLocale();
    const messages = await getMessages();
    return (
        <html lang={locale}>
            <head>
                <FaviconSwitcher />
            </head>
            <body>
                <NextIntlClientProvider locale={locale} messages={messages}>
                    <Providers>{children}</Providers>
                </NextIntlClientProvider>
            </body>
        </html>
    );
}
