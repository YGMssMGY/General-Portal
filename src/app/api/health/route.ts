import { ok } from "@/lib/api";

export async function GET() {
    return ok({ status: "ok", version: "2.0.0" });
}
