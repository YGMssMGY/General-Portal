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
        const form = await request.formData();
        const url = new URL(request.url);
        for (const [key, value] of form.entries()) {
            if (typeof value === "string") url.searchParams.set(key, value);
        }
        const formPostRequest = new NextRequest(url, {
            method: "GET",
            headers: request.headers,
        });
        return await handleOidcCallbackGet(formPostRequest, "basis-auth");
    } catch (e) {
        return handleRouteError("auth/bcallback", e);
    }
}
