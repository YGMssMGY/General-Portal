import { useEffect } from "react";
import { getClientConfig } from "../config/clientConfig";
import { useUIStore } from "../stores/useUIStore";

export function useClientTheme() {
	const portal = useUIStore((s) => s.portal);
	const config = getClientConfig(portal ?? undefined);

	useEffect(() => {
		if (!portal || !config.favicon) {
			document.querySelectorAll('link[rel*="icon"]').forEach((el) => el.remove());
			return;
		}
		document.querySelectorAll('link[rel*="icon"]').forEach((el) => el.remove());
		const link = document.createElement("link");
		link.rel = "icon";
		link.href = config.favicon;
		document.head.appendChild(link);
	}, [config.favicon, portal]);

	useEffect(() => {
		document.title = config.displayName;
	}, [config.displayName]);

	useEffect(() => {
		if (!portal) {
			document.documentElement.style.removeProperty("--client-primary");
			document.documentElement.style.removeProperty("--client-secondary");
			return;
		}
		document.documentElement.style.setProperty("--client-primary", config.primaryColor);
		document.documentElement.style.setProperty("--client-secondary", config.secondaryColor);
		return () => {
			document.documentElement.style.removeProperty("--client-primary");
			document.documentElement.style.removeProperty("--client-secondary");
		};
	}, [config.primaryColor, config.secondaryColor, portal]);

	return config;
}
