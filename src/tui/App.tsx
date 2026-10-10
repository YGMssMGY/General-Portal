import { useState } from "react";
import { Box, Text, useApp, useInput } from "ink";
import Sites from "./screens/Sites.js";
import AddSite from "./screens/AddSite.js";
import RemoveSite from "./screens/RemoveSite.js";
import Migrate from "./screens/Migrate.js";
import Backup from "./screens/Backup.js";
import Jobs from "./screens/Jobs.js";
import Health from "./screens/Health.js";
import Logs from "./screens/Logs.js";
import Danger from "./screens/Danger.js";

type Screen =
    | "sites"
    | "add"
    | "remove"
    | "migrate"
    | "backup"
    | "jobs"
    | "health"
    | "logs"
    | "danger";

const ITEMS: Array<{ key: Screen | "quit"; label: string }> = [
    { key: "sites", label: "Sites" },
    { key: "add", label: "Add site" },
    { key: "remove", label: "Remove site" },
    { key: "migrate", label: "Migrate" },
    { key: "backup", label: "Backup" },
    { key: "jobs", label: "Jobs" },
    { key: "health", label: "Health" },
    { key: "logs", label: "Logs" },
    { key: "danger", label: "Danger" },
    { key: "quit", label: "Quit" },
];

export default function App() {
    const { exit } = useApp();
    const [screen, setScreen] = useState<Screen | null>(null);
    const [index, setIndex] = useState(0);
    useInput(
        (input, key) => {
            if (key.upArrow) setIndex((i) => (i - 1 + ITEMS.length) % ITEMS.length);
            else if (key.downArrow) setIndex((i) => (i + 1) % ITEMS.length);
            else if (key.return) {
                const item = ITEMS[index];
                if (!item) return;
                if (item.key === "quit") exit();
                else setScreen(item.key);
            }
        },
        { isActive: screen === null },
    );
    useInput(
        (input, key) => {
            if (key.ctrl && input === "c") exit();
        },
        { isActive: true },
    );
    function back(): void {
        setScreen(null);
    }
    return (
        <Box flexDirection="column">
            <Text bold>General Portal Server Console</Text>
            <Text dimColor>
                Operator interface. English only. Use arrow keys and Enter. Esc returns here.
            </Text>
            {screen === null && (
                <Box flexDirection="column">
                    {ITEMS.map((item, i) => (
                        <Text
                            key={item.key}
                            color={i === index ? "cyan" : undefined}
                            bold={i === index}
                        >
                            {i === index ? "> " : "  "}
                            {item.label}
                        </Text>
                    ))}
                </Box>
            )}
            {screen === "sites" && <Sites onBack={back} />}
            {screen === "add" && <AddSite onBack={back} />}
            {screen === "remove" && <RemoveSite onBack={back} />}
            {screen === "migrate" && <Migrate onBack={back} />}
            {screen === "backup" && <Backup onBack={back} />}
            {screen === "jobs" && <Jobs onBack={back} />}
            {screen === "health" && <Health onBack={back} />}
            {screen === "logs" && <Logs onBack={back} />}
            {screen === "danger" && (
                <Danger onBack={back} onDropDatabase={() => setScreen("remove")} />
            )}
        </Box>
    );
}
