import { describe, it, expect, beforeEach } from "vitest";
import { useUIStore } from "../../../src/stores/useUIStore";

describe("useUIStore", () => {
	beforeEach(() => {
		useUIStore.setState({
			sidebarExpanded: false,
			theme: "light",
			portal: null,
		});
		localStorage.clear();
	});

	it("defaults to light theme", () => {
		const state = useUIStore.getState();
		expect(state.theme).toBe("light");
	});

	it("toggleSidebar flips sidebarExpanded", () => {
		expect(useUIStore.getState().sidebarExpanded).toBe(false);
		useUIStore.getState().toggleSidebar();
		expect(useUIStore.getState().sidebarExpanded).toBe(true);
		useUIStore.getState().toggleSidebar();
		expect(useUIStore.getState().sidebarExpanded).toBe(false);
	});

	it("setTheme updates theme and persists to localStorage", () => {
		useUIStore.getState().setTheme("dark");
		expect(useUIStore.getState().theme).toBe("dark");
		expect(localStorage.getItem("theme")).toBe("dark");
	});

	it("toggleTheme switches between light and dark", () => {
		useUIStore.getState().toggleTheme();
		expect(useUIStore.getState().theme).toBe("dark");
		useUIStore.getState().toggleTheme();
		expect(useUIStore.getState().theme).toBe("light");
	});

	it("setPortal stores cookie and updates state", () => {
		useUIStore.getState().setPortal("developers");
		expect(useUIStore.getState().portal).toBe("developers");
		expect(document.cookie).toContain("portal=developers");
	});
});
