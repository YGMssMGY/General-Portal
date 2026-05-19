import { useEffect } from "react";
import { getClientConfig } from "../config/clientConfig";
import { useUIStore } from "../stores/useUIStore";

export function useClientTheme() {
	const portal = useUIStore((s) => s.portal);
	const config = getClientConfig(portal ?? undefined);

	useEffect(() => {
		const link = document.querySelector<HTMLLinkElement>("link[rel~='icon']");
		if (link) {
			link.href = config.favicon;
		} else {
			const newLink = document.createElement("link");
			newLink.rel = "icon";
			newLink.href = config.favicon;
			document.head.appendChild(newLink);
		}
	}, [config.favicon]);

	useEffect(() => {
		document.title = config.displayName;
	}, [config.displayName]);

	useEffect(() => {
		document.documentElement.style.setProperty("--client-primary", config.primaryColor);
		document.documentElement.style.setProperty("--client-secondary", config.secondaryColor);
		return () => {
			document.documentElement.style.removeProperty("--client-primary");
			document.documentElement.style.removeProperty("--client-secondary");
		};
	}, [config.primaryColor, config.secondaryColor]);

	return config;
}
