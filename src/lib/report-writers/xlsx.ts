import { deflateRawSync } from "node:zlib";

export type XlsxValue = string | number | null;
export type XlsxRow = Record<string, XlsxValue>;

const crcTable: Uint32Array = (() => {
    const table = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
        let c = n;
        for (let k = 0; k < 8; k++) {
            c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
        }
        table[n] = c >>> 0;
    }
    return table;
})();

function crc32(data: Buffer): number {
    let c = 0xffffffff;
    for (let i = 0; i < data.length; i++) {
        c = crcTable[(c ^ data[i]!) & 0xff]! ^ (c >>> 8);
    }
    return (c ^ 0xffffffff) >>> 0;
}

interface ZipEntry {
    name: string;
    data: Buffer;
}

function buildZip(entries: ZipEntry[]): Buffer {
    const locals: Buffer[] = [];
    const centrals: Buffer[] = [];
    let offset = 0;
    for (const entry of entries) {
        const name = Buffer.from(entry.name, "utf8");
        const compressed = deflateRawSync(entry.data, { level: 9 });
        const crc = crc32(entry.data);
        const local = Buffer.alloc(30);
        local.writeUInt32LE(0x04034b50, 0);
        local.writeUInt16LE(20, 4);
        local.writeUInt16LE(0x0800, 6);
        local.writeUInt16LE(8, 8);
        local.writeUInt16LE(0, 10);
        local.writeUInt16LE(22561, 12);
        local.writeUInt32LE(crc, 14);
        local.writeUInt32LE(compressed.length, 18);
        local.writeUInt32LE(entry.data.length, 22);
        local.writeUInt16LE(name.length, 26);
        local.writeUInt16LE(0, 28);
        locals.push(local, name, compressed);
        const central = Buffer.alloc(46);
        central.writeUInt32LE(0x02014b50, 0);
        central.writeUInt16LE(0x031e, 4);
        central.writeUInt16LE(20, 6);
        central.writeUInt16LE(0x0800, 8);
        central.writeUInt16LE(8, 10);
        central.writeUInt16LE(0, 12);
        central.writeUInt16LE(22561, 14);
        central.writeUInt32LE(crc, 16);
        central.writeUInt32LE(compressed.length, 20);
        central.writeUInt32LE(entry.data.length, 24);
        central.writeUInt16LE(name.length, 28);
        central.writeUInt16LE(0, 30);
        central.writeUInt16LE(0, 32);
        central.writeUInt16LE(0, 34);
        central.writeUInt16LE(0, 36);
        central.writeUInt32LE(0, 38);
        central.writeUInt32LE(offset, 42);
        centrals.push(central, name);
        offset += local.length + name.length + compressed.length;
    }
    const directory = Buffer.concat(centrals);
    const end = Buffer.alloc(22);
    end.writeUInt32LE(0x06054b50, 0);
    end.writeUInt16LE(0, 4);
    end.writeUInt16LE(0, 6);
    end.writeUInt16LE(entries.length, 8);
    end.writeUInt16LE(entries.length, 10);
    end.writeUInt32LE(directory.length, 12);
    end.writeUInt32LE(offset, 16);
    end.writeUInt16LE(0, 20);
    return Buffer.concat([...locals, directory, end]);
}

function escapeXml(value: string): string {
    return value
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&apos;");
}

function columnName(index: number): string {
    let name = "";
    let n = index;
    do {
        name = String.fromCharCode(65 + (n % 26)) + name;
        n = Math.floor(n / 26) - 1;
    } while (n >= 0);
    return name;
}

function cleanSheetName(name: string): string {
    const cleaned = name
        .replace(/[/\\?*[\]:]/g, " ")
        .trim()
        .slice(0, 31);
    return cleaned === "" ? "Sheet1" : cleaned;
}

function cellText(value: XlsxValue): string {
    if (value === null) return "";
    return typeof value === "number" ? String(value) : value;
}

export function writeXlsx(rows: XlsxRow[], sheetName: string): Buffer {
    const headers: string[] = [];
    for (const row of rows) {
        for (const key of Object.keys(row)) {
            if (!headers.includes(key)) headers.push(key);
        }
    }
    const widths = headers.map((header) => {
        let longest = header.length;
        for (const row of rows) {
            const length = cellText(row[header] ?? null).length;
            if (length > longest) longest = length;
        }
        return Math.min(50, Math.max(8, longest + 2));
    });
    const title = cleanSheetName(sheetName);
    const cols =
        headers.length === 0
            ? ""
            : `<cols>${headers.map((_, i) => `<col min="${i + 1}" max="${i + 1}" width="${widths[i]}" customWidth="1"/>`).join("")}</cols>`;
    const headerCells = headers
        .map(
            (header, i) =>
                `<c r="${columnName(i)}1" s="1" t="inlineStr"><is><t>${escapeXml(header)}</t></is></c>`,
        )
        .join("");
    const bodyRows = rows
        .map((row, r) => {
            const cells = headers
                .map((header, i) => {
                    const value: XlsxValue = row[header] ?? null;
                    const ref = `${columnName(i)}${r + 2}`;
                    if (value === null) return `<c r="${ref}"/>`;
                    if (typeof value === "number" && Number.isFinite(value)) {
                        return `<c r="${ref}" s="2"><v>${value}</v></c>`;
                    }
                    return `<c r="${ref}" t="inlineStr"><is><t>${escapeXml(String(value))}</t></is></c>`;
                })
                .join("");
            return `<row r="${r + 2}">${cells}</row>`;
        })
        .join("");
    const sheet = Buffer.from(
        `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
            `<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">` +
            `${cols}<sheetData>${headers.length === 0 ? "" : `<row r="1">${headerCells}</row>`}${bodyRows}</sheetData></worksheet>`,
        "utf8",
    );
    const workbook = Buffer.from(
        `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
            `<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">` +
            `<sheets><sheet name="${escapeXml(title)}" sheetId="1" r:id="rId1"/></sheets></workbook>`,
        "utf8",
    );
    const styles = Buffer.from(
        `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
            `<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">` +
            `<numFmts count="2"><numFmt numFmtId="164" formatCode="#,##0.00"/><numFmt numFmtId="165" formatCode="yyyy-mm-dd hh:mm:ss"/></numFmts>` +
            `<fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts>` +
            `<fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills>` +
            `<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>` +
            `<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>` +
            `<cellXfs count="3"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>` +
            `<xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/>` +
            `<xf numFmtId="164" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/></cellXfs>` +
            `</styleSheet>`,
        "utf8",
    );
    const contentTypes = Buffer.from(
        `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
            `<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">` +
            `<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>` +
            `<Default Extension="xml" ContentType="application/xml"/>` +
            `<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>` +
            `<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>` +
            `<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>` +
            `</Types>`,
        "utf8",
    );
    const rels = Buffer.from(
        `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
            `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
            `<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>` +
            `</Relationships>`,
        "utf8",
    );
    const workbookRels = Buffer.from(
        `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
            `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
            `<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>` +
            `<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>` +
            `</Relationships>`,
        "utf8",
    );
    return buildZip([
        { name: "[Content_Types].xml", data: contentTypes },
        { name: "_rels/.rels", data: rels },
        { name: "xl/workbook.xml", data: workbook },
        { name: "xl/_rels/workbook.xml.rels", data: workbookRels },
        { name: "xl/worksheets/sheet1.xml", data: sheet },
        { name: "xl/styles.xml", data: styles },
    ]);
}
