import { NextRequest } from "next/server";
import { handleRouteError } from "@/lib/api";
import { handleOidcCallbackGet } from "../callback/[provider]/route";

export async function GET(request: NextRequest) {
    try {
        return await handleOidcCallbackGet(request, "basis-auth");
    } catch (e) {
        return handleRouteError("auth/bcallback", e);
    }
}

export async function POST(request: NextRequest) {
    try {
        return await handleOidcCallbackGet(request, "basis-auth");
    } catch (e) {
        return handleRouteError("auth/bcallback", e);
    }
}
