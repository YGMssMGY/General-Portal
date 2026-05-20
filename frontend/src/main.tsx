import React from "react";
import ReactDOM from "react-dom/client";
import { SessionProvider } from "@hono/auth-js/react";
import { App } from "./App";
import "@carbon/styles/css/styles.css";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
    <React.StrictMode>
        <SessionProvider>
            <App />
        </SessionProvider>
    </React.StrictMode>,
);
