import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

interface ShortcutMap {
	[key: string]: () => void;
}

const DEFAULT_SHORTCUTS: Record<string, string> = {
	"ctrl+k": "Search",
	"ctrl+n": "New item",
	"ctrl+e": "Edit item",
	"?": "Show help",
	"g d": "Go to Dashboard",
	"g t": "Go to Tasks",
	"g p": "Go to Proposals",
	"g e": "Go to Events",
};

export function useKeyboardShortcuts(customShortcuts?: ShortcutMap) {
	const navigate = useNavigate();

	useEffect(() => {
		const buffer: string[] = [];
		let bufferTimeout: ReturnType<typeof setTimeout> | null = null;

		function handleKeyDown(e: KeyboardEvent) {
			// Don't trigger in input fields
			const target = e.target as HTMLElement;
			if (
				target.tagName === "INPUT" ||
				target.tagName === "TEXTAREA" ||
				target.tagName === "SELECT" ||
				target.isContentEditable
			) {
				return;
			}

			// Help dialog
			if (e.key === "?" && !e.ctrlKey && !e.metaKey) {
				e.preventDefault();
				const help = Object.entries(DEFAULT_SHORTCUTS)
					.map(([key, desc]) => `${key}: ${desc}`)
					.join("\n");
				alert(`Keyboard Shortcuts:\n\n${help}`);
				return;
			}

			// Navigation shortcuts (g + key)
			if (buffer.length === 0 && e.key === "g") {
				buffer.push("g");
				if (bufferTimeout) clearTimeout(bufferTimeout);
				bufferTimeout = setTimeout(() => {
					buffer.length = 0;
				}, 500);
				e.preventDefault();
				return;
			}

			if (buffer.length === 1 && buffer[0] === "g") {
				buffer.length = 0;
				const navMap: Record<string, string> = {
					d: "/dashboard",
					t: "/tasks",
					p: "/proposals",
					e: "/events",
					f: "/finance",
					m: "/messages",
					s: "/settings",
				};
				const path = navMap[e.key];
				if (path) {
					e.preventDefault();
					const portal =
						document.cookie.match(/(?:^|;\s*)portal=([^;]*)/)?.[1] || "developers";
					navigate(`/${portal}${path}`);
				}
				return;
			}

			// Ctrl+K for search
			if ((e.ctrlKey || e.metaKey) && e.key === "k") {
				e.preventDefault();
				customShortcuts?.["ctrl+k"]?.();
				return;
			}

			// Ctrl+N for new
			if ((e.ctrlKey || e.metaKey) && e.key === "n") {
				e.preventDefault();
				customShortcuts?.["ctrl+n"]?.();
				return;
			}

			// Ctrl+E for edit
			if ((e.ctrlKey || e.metaKey) && e.key === "e") {
				e.preventDefault();
				customShortcuts?.["ctrl+e"]?.();
				return;
			}
		}

		document.addEventListener("keydown", handleKeyDown);
		return () => {
			document.removeEventListener("keydown", handleKeyDown);
			if (bufferTimeout) clearTimeout(bufferTimeout);
		};
	}, [navigate, customShortcuts]);
}
