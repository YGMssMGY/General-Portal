"use client";

import { useState, type ChangeEvent } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { useAuthSession } from "@/components/AuthSessionProvider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { usePageTitle } from "@/hooks/usePageTitle";
import { usePortal } from "@/hooks/usePortal";
import { fetchJson } from "@/lib/api-client";

type EntityType = "task" | "member" | "transaction";

interface ImportFailure {
    row: number;
    reason: string;
}

interface ImportResult {
    inserted: number;
    failed: ImportFailure[];
    headers: string[];
}

const MAX_BYTES = 2 * 1024 * 1024;
const ENTITY_TYPES: EntityType[] = ["task", "member", "transaction"];

function previewRows(text: string): string[][] {
    return text
        .split(/\r?\n/)
        .map((line) => line.split(",").map((cell) => cell.trim().replace(/^"|"$/g, "")))
        .filter((row) => row.some((cell) => cell !== ""))
        .slice(0, 5);
}

export default function DataImportPage() {
    const t = useTranslations("dataImport");
    const tc = useTranslations("common");
    const te = useTranslations("errors");
    const portal = usePortal();
    const { user } = useAuthSession();
    usePageTitle(`${t("title")} | ${portal}`);

    const canManage = user?.role === "admin" || user?.role === "officer";
    const [entityType, setEntityType] = useState<EntityType>("task");
    const [file, setFile] = useState<File | null>(null);
    const [fileName, setFileName] = useState("");
    const [preview, setPreview] = useState<string[][]>([]);
    const [result, setResult] = useState<ImportResult | null>(null);
    const [error, setError] = useState("");
    const [uploading, setUploading] = useState(false);

    async function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
        const next = e.target.files?.[0] ?? null;
        setFile(next);
        setFileName(next?.name ?? "");
        setResult(null);
        setError("");
        if (!next) {
            setPreview([]);
            return;
        }
        if (next.size > MAX_BYTES) {
            setPreview([]);
            setError(te("fileTooLarge"));
            return;
        }
        try {
            setPreview(previewRows(await next.text()));
        } catch {
            setPreview([]);
            setError(te("internal"));
        }
    }

    async function handleUpload() {
        if (!file) return;
        const formData = new FormData();
        formData.append("file", file);
        formData.append("entityType", entityType);
        setUploading(true);
        setError("");
        try {
            const uploaded = await fetchJson<ImportResult>("/api/data-import", {
                method: "POST",
                body: formData,
            });
            setResult(uploaded);
            toast.success(t("success"));
        } catch (e) {
            const message = e instanceof Error ? e.message : te("internal");
            setError(message);
            toast.error(message);
        } finally {
            setUploading(false);
        }
    }

    if (!canManage) {
        return (
            <Card>
                <CardContent
                    style={{
                        padding: "32px",
                        textAlign: "center",
                        fontSize: "14px",
                        color: "var(--color-destructive)",
                    }}
                >
                    {te("forbidden")}
                </CardContent>
            </Card>
        );
    }

    const headerRow = preview[0] ?? [];
    const previewBody = preview.slice(1);

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div>
                <h1
                    style={{
                        fontSize: "20px",
                        fontWeight: 700,
                        margin: 0,
                        color: "var(--color-text)",
                    }}
                >
                    {t("title")}
                </h1>
                <p style={{ fontSize: "13px", color: "var(--color-text-secondary)", margin: 0 }}>
                    {t("description")}
                </p>
            </div>
            <Card>
                <CardHeader>
                    <CardTitle>{t("title")}</CardTitle>
                </CardHeader>
                <CardContent style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                    <div>
                        <Label htmlFor="import-entity">{t("entityType")}</Label>
                        <Select
                            value={entityType}
                            onValueChange={(value) => setEntityType(value as EntityType)}
                        >
                            <SelectTrigger id="import-entity">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {ENTITY_TYPES.map((value) => (
                                    <SelectItem key={value} value={value}>
                                        {t(
                                            `entity${value.charAt(0).toUpperCase()}${value.slice(1)}`,
                                        )}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div>
                        <Label htmlFor="import-file">{t("fileLabel")}</Label>
                        <Input
                            id="import-file"
                            type="file"
                            accept=".csv,text/csv"
                            onChange={handleFileChange}
                        />
                        <p
                            style={{
                                fontSize: "12px",
                                color: "var(--color-text-secondary)",
                                margin: "4px 0 0",
                            }}
                        >
                            {t("fileHint")}
                        </p>
                    </div>
                    {error !== "" && (
                        <p
                            style={{
                                fontSize: "13px",
                                color: "var(--color-destructive)",
                                margin: 0,
                            }}
                        >
                            {error}
                        </p>
                    )}
                    <div>
                        <Button
                            onClick={handleUpload}
                            disabled={file === null || uploading || error !== ""}
                        >
                            {uploading ? tc("saving") : t("upload")}
                        </Button>
                        {fileName !== "" && (
                            <span
                                style={{
                                    fontSize: "12px",
                                    color: "var(--color-text-secondary)",
                                    marginLeft: "8px",
                                }}
                            >
                                {fileName}
                            </span>
                        )}
                    </div>
                </CardContent>
            </Card>
            <Card>
                <CardHeader>
                    <CardTitle>{t("preview")}</CardTitle>
                </CardHeader>
                <CardContent>
                    {headerRow.length === 0 ? (
                        <p style={{ fontSize: "13px", color: "var(--color-text-secondary)" }}>
                            {t("noPreview")}
                        </p>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    {headerRow.map((cell, i) => (
                                        <TableHead key={i}>{cell}</TableHead>
                                    ))}
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {previewBody.map((row, i) => (
                                    <TableRow key={i}>
                                        {headerRow.map((_, j) => (
                                            <TableCell key={j}>{row[j] ?? ""}</TableCell>
                                        ))}
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>
            {result && (
                <Card>
                    <CardHeader>
                        <CardTitle>{t("result")}</CardTitle>
                    </CardHeader>
                    <CardContent style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                        <p style={{ fontSize: "14px", margin: 0 }}>
                            {t("inserted")}: {result.inserted}
                        </p>
                        <p style={{ fontSize: "14px", margin: 0 }}>
                            {t("failed")}: {result.failed.length}
                        </p>
                        {result.failed.length > 0 && (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>{t("row")}</TableHead>
                                        <TableHead>{t("reason")}</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {result.failed.map((failure) => (
                                        <TableRow key={failure.row}>
                                            <TableCell>{failure.row}</TableCell>
                                            <TableCell>{failure.reason}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        )}
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
