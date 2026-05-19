import { useEffect } from "react";
import { onCLS, onFCP, onINP, onLCP, onTTFB } from "web-vitals";

type VitalsCallback = (data: { name: string; value: number; rating: string }) => void;

export function useWebVitals(onReport?: VitalsCallback) {
	useEffect(() => {
		const report =
			onReport ||
			((data) => {
				console.log(`[Web Vitals] ${data.name}: ${data.value.toFixed(2)} (${data.rating})`);
			});

		onCLS((m) => report({ name: "CLS", value: m.value, rating: m.rating }));
		onFCP((m) => report({ name: "FCP", value: m.value, rating: m.rating }));
		onINP((m) => report({ name: "INP", value: m.value, rating: m.rating }));
		onLCP((m) => report({ name: "LCP", value: m.value, rating: m.rating }));
		onTTFB((m) => report({ name: "TTFB", value: m.value, rating: m.rating }));
	}, [onReport]);
}
