import type { Metadata } from "next";
import { Providers } from "@/components/QueryClientProvider";
import { FaviconSwitcher } from "@/components/FaviconSwitcher";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "General Portal", template: "%s | General Portal" },
  description: "Developers' Club & Student Council Portal",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Noto+Sans:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
        <FaviconSwitcher />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
