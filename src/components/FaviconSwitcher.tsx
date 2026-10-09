"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

const GENERIC_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" rx="5" fill="#161616"/><text x="16" y="22" text-anchor="middle" font-family="Arial" font-weight="bold" font-size="18" fill="white">G</text></svg>`;
const GENERIC = `data:image/svg+xml,${encodeURIComponent(GENERIC_SVG)}`;

function portalFromCookie(): string {
    if (typeof document === "undefined") return "";
    return document.cookie.match(/(?:^|;\s*)portal=([^;]*)/)?.[1]?.trim() ?? "";
}

export function FaviconSwitcher() {
    const pathname = usePathname();
    const [href, setHref] = useState(GENERIC);

    useEffect(() => {
        if (pathname === "/" || pathname === "/showcase") {
            setHref(GENERIC);
            return;
        }
        const portal = portalFromCookie();
        setHref(portal ? `/${portal}.png` : GENERIC);
    }, [pathname]);

    return (
        <link
            rel="icon"
            href={href}
            onError={() => {
                setHref((current) => (current === GENERIC ? current : GENERIC));
            }}
        />
    );
}
