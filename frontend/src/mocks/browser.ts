import { setupWorker } from "msw/browser";
import { handlers } from "./handlers";

export const worker = setupWorker(...handlers);

export async function startMockService(): Promise<void> {
  await worker.start({
    onUnhandledRequest: "warn",
    quiet: false,
  });
  console.log("[MSW] Mock service worker started — intercepting API calls");
}
