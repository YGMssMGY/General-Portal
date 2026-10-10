import { render } from "ink";
import App from "./App.js";
import { loadDotEnv } from "./lib/tui-db.js";
import { closeAllPools } from "../db/client.js";

async function main(): Promise<void> {
    if (!process.stdin.isTTY) {
        console.error(
            "This console requires an interactive terminal. Run it over SSH with a TTY allocated.",
        );
        process.exit(1);
    }
    loadDotEnv();
    const { waitUntilExit } = render(<App />);
    await waitUntilExit();
    await closeAllPools();
}

void main();
