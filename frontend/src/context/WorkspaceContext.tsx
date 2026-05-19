import { createContext, useContext, useMemo, type ReactNode } from "react";
import type { Workspace } from "../types";
import { getClientConfig } from "../config/clientConfig";

interface WorkspaceContextValue {
	workspace: Workspace;
}

function createDefaultWorkspace(): Workspace {
	const config = getClientConfig();
	return {
		id: "ws-main",
		name: config.displayName,
		description: config.description,
	};
}

const WorkspaceContext = createContext<WorkspaceContextValue | undefined>(undefined);

export function WorkspaceProvider({ children }: { children: ReactNode }) {
	const value = useMemo<WorkspaceContextValue>(
		() => ({ workspace: createDefaultWorkspace() }),
		[],
	);

	return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
}

export function useWorkspace() {
	const context = useContext(WorkspaceContext);
	if (!context) {
		throw new Error("useWorkspace must be used inside WorkspaceProvider");
	}
	return context;
}
