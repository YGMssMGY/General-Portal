import React from "react";
import ReactDOM from "react-dom/client";
import { SessionProvider } from "@hono/auth-js/react";
import { QueryClientProvider } from "@tanstack/react-query";
import { createQueryClient } from "./lib/query-client";
import { App } from "./App";
import "@carbon/styles/css/styles.css";
import "./index.css";

const queryClient = createQueryClient();

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
    <React.StrictMode>
        <QueryClientProvider client={queryClient}>
            <SessionProvider>
                <App />
            </SessionProvider>
        </QueryClientProvider>
    </React.StrictMode>,
);
