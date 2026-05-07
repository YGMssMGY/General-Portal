import React from "react";
import ReactDOM from "react-dom/client";
import { App } from "./App";
import "./index.css";

async function bootstrap() {
  if (import.meta.env.DEV) {
    const { startMockService } = await import("./mocks/browser");
    await startMockService();
  }

  ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}

bootstrap();
