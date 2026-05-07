import { createContext, useContext, useMemo, type ReactNode } from "react";
import type { Workspace } from "../types";

interface WorkspaceContextValue {
  workspace: Workspace;
}

const defaultWorkspace: Workspace = {
  id: "ws-main",
  name: "Club Portal",
  description: "Developers' Club & Student Council Workspace",
};

const WorkspaceContext = createContext<WorkspaceContextValue | undefined>(undefined);

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const value = useMemo<WorkspaceContextValue>(() => ({ workspace: defaultWorkspace }), []);

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
}

export function useWorkspace() {
  const context = useContext(WorkspaceContext);
  if (!context) {
    throw new Error("useWorkspace must be used inside WorkspaceProvider");
  }
  return context;
}
