"use client";

import { useEffect, useState } from "react";

function getPortalFromCookie(): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(/(?:^|;\s*)portal=([^;]*)/);
  return match ? match[1] : null;
}

const DEFAULT_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" rx="5" fill="#161616"/><text x="16" y="22" text-anchor="middle" font-family="Arial" font-weight="bold" font-size="18" fill="white">G</text></svg>`;

export function FaviconSwitcher() {
  const [href, setHref] = useState("");

  useEffect(() => {
    function update() {
      const portal = getPortalFromCookie();
      if (portal === "developers") {
        setHref("/developers.png");
      } else if (portal === "stuco") {
        setHref("/stuco.png");
      } else {
        setHref(`data:image/svg+xml,${encodeURIComponent(DEFAULT_SVG)}`);
      }
    }

    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, []);

  if (!href) return null;

  return <link rel="icon" href={href} />;
}
