import "@testing-library/jest-dom/vitest";

// Carbon Design System components need these browser APIs
Object.defineProperty(window, "matchMedia", {
	writable: true,
	value: (query: string) => ({
		matches: false,
		media: query,
		onchange: null,
		addListener: () => {},
		removeListener: () => {},
		addEventListener: () => {},
		removeEventListener: () => {},
		dispatchEvent: () => false,
	}),
});

class ResizeObserverMock {
	observe() {}
	unobserve() {}
	disconnect() {}
}

window.ResizeObserver = ResizeObserverMock as unknown as typeof ResizeObserver;

class IntersectionObserverMock {
	readonly root: Element | null = null;
	readonly rootMargin: string = "";
	readonly thresholds: ReadonlyArray<number> = [];

	constructor() {}

	observe() {}
	unobserve() {}
	disconnect() {}
	takeRecords(): IntersectionObserverEntry[] {
		return [];
	}
}

Object.defineProperty(window, "IntersectionObserver", {
	writable: true,
	value: IntersectionObserverMock,
});

// Suppress Sentry in test environment
process.env.VITE_SENTRY_DSN = "";
process.env.SENTRY_DSN = "";
Object.defineProperty(import.meta, "env", {
	 
	value: { ...(import.meta as any).env, VITE_SENTRY_DSN: "" },
	configurable: true,
});
