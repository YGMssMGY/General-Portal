import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scryptAsync = promisify(scrypt);

export async function hashPassword(password: string): Promise<string> {
    const salt = randomBytes(16);
    const key = (await scryptAsync(password, salt, 32)) as Buffer;
    return `scrypt$v=1$n=32768$r=8$p=1$${salt.toString("base64")}$${key.toString("base64")}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
    const parts = stored.split("$");
    if (
        parts.length !== 7 ||
        parts[0] !== "scrypt" ||
        parts[1] !== "v=1" ||
        parts[2] !== "n=32768" ||
        parts[3] !== "r=8" ||
        parts[4] !== "p=1"
    ) {
        return false;
    }
    const salt = Buffer.from(parts[5], "base64");
    const expected = Buffer.from(parts[6], "base64");
    if (salt.length !== 16 || expected.length !== 32) return false;
    const key = (await scryptAsync(password, salt, 32)) as Buffer;
    return key.length === expected.length && timingSafeEqual(key, expected);
}
