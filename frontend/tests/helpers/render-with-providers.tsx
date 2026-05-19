import { render, type RenderOptions, type RenderResult } from "@testing-library/react";
import { MemoryRouter, type MemoryRouterProps } from "react-router-dom";
import { Theme } from "@carbon/react";
import { type ReactElement, type ReactNode } from "react";

interface ProvidersWrapperProps {
  children: ReactNode;
  initialEntries?: MemoryRouterProps["initialEntries"];
}

function ProvidersWrapper({ children, initialEntries }: ProvidersWrapperProps) {
  return (
    <MemoryRouter initialEntries={initialEntries}>
      <Theme theme="g10">{children}</Theme>
    </MemoryRouter>
  );
}

interface RenderWithProvidersOptions extends Omit<RenderOptions, "wrapper"> {
  initialEntries?: MemoryRouterProps["initialEntries"];
}

/**
 * Render a component wrapped with the providers needed by most tests:
 * - MemoryRouter (with optional initial entries)
 * - Carbon's Theme (light theme by default)
 *
 * Add additional wrappers (SessionProvider, WorkspaceProvider, etc.) as
 * needed by composing inside the test or extending this function.
 */
export function renderWithProviders(
  ui: ReactElement,
  options?: RenderWithProvidersOptions,
): RenderResult {
  const { initialEntries, ...renderOptions } = options ?? {};

  return render(ui, {
    wrapper: ({ children }) => (
      <ProvidersWrapper initialEntries={initialEntries}>{children}</ProvidersWrapper>
    ),
    ...renderOptions,
  });
}
