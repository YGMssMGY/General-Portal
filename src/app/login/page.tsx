import { Suspense } from "react";
import { cookies } from "next/headers";
import LoginForm from "./LoginForm";

export const dynamic = "force-dynamic";

export default async function LoginPage({
    searchParams,
}: {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
    const cookieStore = await cookies();
    const portal = cookieStore.get("portal")?.value ?? "developers";

    const params = await searchParams;
    const error = typeof params.error === "string" ? params.error : undefined;
    const callbackUrl = typeof params.callbackUrl === "string" ? params.callbackUrl : undefined;

    return (
        <Suspense
            fallback={
                <div
                    style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        minHeight: "100dvh",
                        color: "var(--color-text-secondary)",
                        fontSize: "14px",
                    }}
                >
                    Loading...
                </div>
            }
        >
            <LoginForm portal={portal} error={error} callbackUrl={callbackUrl} />
        </Suspense>
    );
}
