export type PdfValue = string | number | null;

const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;
const MARGIN = 40;
const TITLE_SIZE = 16;
const HEADER_SIZE = 10;
const BODY_SIZE = 9;
const TITLE_HEIGHT = 30;
const HEADER_HEIGHT = 18;
const ROW_HEIGHT = 15;
const FOOTER_HEIGHT = 24;

function pdfEscape(value: string): string {
    let out = "";
    for (const ch of value) {
        const code = ch.codePointAt(0) ?? 0;
        if (code < 32 && code !== 9) continue;
        if (ch === "\\" || ch === "(" || ch === ")") {
            out += `\\${ch}`;
            continue;
        }
        out += code > 255 ? "?" : ch;
    }
    return out;
}

function cellString(value: PdfValue): string {
    if (value === null) return "";
    return typeof value === "number" ? String(value) : value;
}

function fixed(n: number): string {
    return (Math.round(n * 100) / 100).toString();
}

export function writePdf(title: string, headers: string[], rows: Array<PdfValue[]>): Buffer {
    const cleanHeaders = headers.map((h) => pdfEscape(h));
    const cleanRows = rows.map((row) =>
        headers.map((_, i) => pdfEscape(cellString(row[i] ?? null))),
    );
    const cleanTitle = pdfEscape(title);
    const usableWidth = PAGE_WIDTH - MARGIN * 2;
    const weights = cleanHeaders.map((header, i) => {
        let longest = Math.min(40, Math.max(8, header.length));
        for (const row of cleanRows) {
            const length = Math.min(40, Math.max(8, (row[i] ?? "").length));
            if (length > longest) longest = length;
        }
        return longest;
    });
    const totalWeight = weights.reduce((sum, w) => sum + w, 0) || 1;
    const colWidths =
        cleanHeaders.length === 0 ? [] : weights.map((w) => (usableWidth * w) / totalWeight);
    const firstCapacity = Math.max(
        1,
        Math.floor(
            (PAGE_HEIGHT - MARGIN * 2 - TITLE_HEIGHT - HEADER_HEIGHT - FOOTER_HEIGHT) / ROW_HEIGHT,
        ),
    );
    const restCapacity = Math.max(
        1,
        Math.floor((PAGE_HEIGHT - MARGIN * 2 - HEADER_HEIGHT - FOOTER_HEIGHT) / ROW_HEIGHT),
    );
    const pages: string[][][] = [];
    let cursor = 0;
    let first = true;
    if (cleanRows.length === 0) pages.push([]);
    while (cursor < cleanRows.length) {
        const capacity = first ? firstCapacity : restCapacity;
        pages.push(cleanRows.slice(cursor, cursor + capacity));
        cursor += capacity;
        first = false;
    }

    const objects: Buffer[] = [];
    const pageIndices: number[] = [];
    const contentIndices: number[] = [];
    for (let p = 0; p < pages.length; p++) {
        const pageRows = pages[p] ?? [];
        const isFirst = p === 0;
        const top = PAGE_HEIGHT - MARGIN - (isFirst ? TITLE_HEIGHT : 0);
        const lines: string[] = [];
        if (isFirst) {
            lines.push(
                `BT /F2 ${TITLE_SIZE} Tf 1 0 0 1 ${fixed(MARGIN)} ${fixed(PAGE_HEIGHT - MARGIN - 18)} Tm (${cleanTitle}) Tj ET`,
            );
        }
        const maxChars = colWidths.map((w) =>
            Math.max(1, Math.floor((w - 8) / (BODY_SIZE * 0.55))),
        );
        const colX: number[] = [];
        let x = MARGIN;
        for (const w of colWidths) {
            colX.push(x);
            x += w;
        }
        let y = top;
        if (cleanHeaders.length > 0) {
            lines.push(
                `0.9 0.9 0.9 rg ${fixed(MARGIN)} ${fixed(y - HEADER_HEIGHT)} ${fixed(usableWidth)} ${fixed(HEADER_HEIGHT)} re f`,
            );
            lines.push(
                `0.6 0.6 0.6 RG 0.5 w ${fixed(MARGIN)} ${fixed(y - HEADER_HEIGHT)} ${fixed(usableWidth)} ${fixed(HEADER_HEIGHT)} re S`,
            );
            for (let i = 0; i < cleanHeaders.length; i++) {
                const limit = maxChars[i] ?? 1;
                const text = (cleanHeaders[i] ?? "").slice(0, limit);
                lines.push(
                    `BT /F2 ${HEADER_SIZE} Tf 1 0 0 1 ${fixed((colX[i] ?? MARGIN) + 4)} ${fixed(y - 13)} Tm (${text}) Tj ET`,
                );
                if (i > 0) {
                    lines.push(
                        `0.6 0.6 0.6 RG 0.5 w ${fixed(colX[i] ?? MARGIN)} ${fixed(y - HEADER_HEIGHT)} m ${fixed(colX[i] ?? MARGIN)} ${fixed(y)} l S`,
                    );
                }
            }
            y -= HEADER_HEIGHT;
        }
        for (const row of pageRows) {
            lines.push(
                `1 1 1 rg ${fixed(MARGIN)} ${fixed(y - ROW_HEIGHT)} ${fixed(usableWidth)} ${fixed(ROW_HEIGHT)} re f`,
            );
            lines.push(
                `0.6 0.6 0.6 RG 0.5 w ${fixed(MARGIN)} ${fixed(y - ROW_HEIGHT)} ${fixed(usableWidth)} ${fixed(ROW_HEIGHT)} re S`,
            );
            for (let i = 0; i < cleanHeaders.length; i++) {
                const limit = maxChars[i] ?? 1;
                const text = (row[i] ?? "").slice(0, limit);
                lines.push(
                    `BT /F1 ${BODY_SIZE} Tf 1 0 0 1 ${fixed((colX[i] ?? MARGIN) + 4)} ${fixed(y - 11)} Tm (${text}) Tj ET`,
                );
                if (i > 0) {
                    lines.push(
                        `0.6 0.6 0.6 RG 0.5 w ${fixed(colX[i] ?? MARGIN)} ${fixed(y - ROW_HEIGHT)} m ${fixed(colX[i] ?? MARGIN)} ${fixed(y)} l S`,
                    );
                }
            }
            y -= ROW_HEIGHT;
        }
        const label = `Page ${p + 1}`;
        const labelX = PAGE_WIDTH / 2 - (label.length * BODY_SIZE * 0.55) / 2;
        lines.push(
            `BT /F1 ${BODY_SIZE} Tf 1 0 0 1 ${fixed(labelX)} ${fixed(MARGIN - 12)} Tm (${label}) Tj ET`,
        );
        const stream = Buffer.from(`${lines.join("\n")}\n`, "latin1");
        const pageNumber = objects.length + 5;
        const contentNumber = objects.length + 6;
        pageIndices.push(pageNumber);
        contentIndices.push(contentNumber);
        objects.push(
            Buffer.from(
                `${pageNumber} 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_WIDTH} ${PAGE_HEIGHT}] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${contentNumber} 0 R >>\nendobj\n`,
                "latin1",
            ),
            Buffer.concat([
                Buffer.from(
                    `${contentNumber} 0 obj\n<< /Length ${stream.length} >>\nstream\n`,
                    "latin1",
                ),
                stream,
                Buffer.from("endstream\nendobj\n", "latin1"),
            ]),
        );
    }

    const header = Buffer.from("%PDF-1.4\n%\xE2\xE3\xCF\xD3\n", "latin1");
    const fixedObjects = [
        Buffer.from("1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n", "latin1"),
        Buffer.from(
            `2 0 obj\n<< /Type /Pages /Kids [${pageIndices.map((n) => `${n} 0 R`).join(" ")}] /Count ${pageIndices.length} >>\nendobj\n`,
            "latin1",
        ),
        Buffer.from(
            "3 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n",
            "latin1",
        ),
        Buffer.from(
            "4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>\nendobj\n",
            "latin1",
        ),
    ];
    const all = [...fixedObjects, ...objects];
    const offsets: number[] = [];
    let position = header.length;
    for (const obj of all) {
        offsets.push(position);
        position += obj.length;
    }
    const count = all.length + 1;
    let xref = `xref\n0 ${count}\n0000000000 65535 f \n`;
    for (const offset of offsets) {
        xref += `${offset.toString().padStart(10, "0")} 00000 n \n`;
    }
    const trailer = Buffer.from(
        `${xref}trailer\n<< /Size ${count} /Root 1 0 R >>\nstartxref\n${position}\n%%EOF`,
        "latin1",
    );
    return Buffer.concat([header, ...all, trailer]);
}
