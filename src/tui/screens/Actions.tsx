import { useState } from "react";
import os from "node:os";
import { Box, Text, useInput } from "ink";
import TextInput from "ink-text-input";
import SelectList from "../components/SelectList.js";
import { executeAction } from "../../ops/engine.js";
import { describeAll, listActions } from "../../ops/registry.js";
import type { OpsContext, OpsResult } from "../../ops/types.js";

type Step = "filter" | "select" | "params" | "confirm" | "running" | "result";

const ctx: OpsContext = {
    operatorId: os.userInfo().username,
    source: "tui",
    scopes: ["ops:read", "ops:deploy", "ops:backup", "ops:danger"],
};

export default function Actions({ onBack }: { onBack: () => void }) {
    const [step, setStep] = useState<Step>("filter");
    const [filter, setFilter] = useState("");
    const [actionId, setActionId] = useState("");
    const [rawParams, setRawParams] = useState("{}");
    const [confirmationToken, setConfirmationToken] = useState("");
    const [typedValue, setTypedValue] = useState("");
    const [result, setResult] = useState<OpsResult | null>(null);

    const all = describeAll();
    const matches = all.filter(
        (a) =>
            a.id.toLowerCase().includes(filter.toLowerCase()) ||
            a.summary.toLowerCase().includes(filter.toLowerCase()),
    );
    const selected = all.find((a) => a.id === actionId);

    useInput(
        (input, key) => {
            if (key.escape) {
                if (step === "filter") onBack();
                else if (step === "result") setStep("filter");
                else setStep("filter");
            }
        },
        { isActive: step !== "running" },
    );

    async function execute(token?: string, typed?: string): Promise<void> {
        setStep("running");
        let params: unknown = {};
        try {
            params = JSON.parse(rawParams) as unknown;
        } catch {
            setResult({
                ok: false,
                status: "error",
                action: actionId,
                code: "VALIDATION",
                message: "Parameters must be valid JSON",
                durationMs: 0,
            });
            setStep("result");
            return;
        }
        const r = await executeAction(actionId, params, {
            ...ctx,
            confirmationToken: token,
            typedValue: typed,
        });
        setResult(r);
        if (!r.ok && r.status === "confirmation-required") {
            setConfirmationToken(r.confirmationToken);
            setTypedValue("");
            setStep("confirm");
            return;
        }
        setStep("result");
    }

    if (step === "filter") {
        return (
            <Box flexDirection="column">
                <Text bold>Operator Actions</Text>
                <Text dimColor>
                    Type to filter all {listActions().length} actions. Enter to continue.
                </Text>
                <Box>
                    <Text>Filter: </Text>
                    <TextInput
                        value={filter}
                        onChange={setFilter}
                        onSubmit={() => setStep("select")}
                    />
                </Box>
            </Box>
        );
    }

    if (step === "select") {
        if (matches.length === 0) {
            return (
                <Box flexDirection="column">
                    <Text color="yellow">No actions match.</Text>
                    <Text dimColor>Esc to filter again.</Text>
                </Box>
            );
        }
        return (
            <Box flexDirection="column">
                <Text bold>Select action</Text>
                <SelectList
                    items={matches.map((a) => `${a.id}${a.destructive ? " [destructive]" : ""}`)}
                    onSelect={(_item, index) => {
                        const chosen = matches[index];
                        if (!chosen) return;
                        setActionId(chosen.id);
                        setRawParams("{}");
                        setStep("params");
                    }}
                />
            </Box>
        );
    }

    if (step === "params") {
        return (
            <Box flexDirection="column">
                <Text bold>{actionId}</Text>
                <Text dimColor>{selected?.summary ?? ""}</Text>
                <Text dimColor>JSON parameters (Esc to go back, Enter to run):</Text>
                <TextInput
                    value={rawParams}
                    onChange={setRawParams}
                    onSubmit={() => void execute()}
                />
            </Box>
        );
    }

    if (step === "confirm") {
        return (
            <Box flexDirection="column">
                <Text color="yellow" bold>
                    Confirmation required
                </Text>
                <Text dimColor>{selected?.confirmField ?? "target"}</Text>
                <TextInput
                    value={typedValue}
                    onChange={setTypedValue}
                    onSubmit={() => void execute(confirmationToken, typedValue)}
                />
            </Box>
        );
    }

    if (step === "running") {
        return <Text color="cyan">Running {actionId}...</Text>;
    }

    return (
        <Box flexDirection="column">
            <Text bold>Result: {actionId}</Text>
            <Text>{JSON.stringify(result, null, 2)}</Text>
            <Text dimColor>Esc to run another action.</Text>
        </Box>
    );
}
