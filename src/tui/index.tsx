import { render } from "ink";
import App from "./App.js";
import { loadDotEnv } from "./lib/tui-db.js";
import { closeAllPools } from "../db/client.js";

async function main(): Promise<void> {
    if (!process.stdin.isTTY) {
        console.error(
            "This console requires an interactive terminal. For remote access use the HTTPS operator API with curl or irm (see /api/ops).",
        );
        process.exit(1);
    }
    loadDotEnv();
    const { waitUntilExit } = render(<App />);
    await waitUntilExit();
    await closeAllPools();
}

void main();
