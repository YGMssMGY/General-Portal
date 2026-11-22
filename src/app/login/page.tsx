import { Suspense } from "react";
import { cookies } from "next/headers";
import { getTranslations } from "next-intl/server";
import { listPortalSlugs } from "@/db/client";
import LoginForm from "./LoginForm";

export const dynamic = "force-dynamic";

export default async function LoginPage({
    searchParams,
}: {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
    const cookieStore = await cookies();
    const portal = cookieStore.get("portal")?.value ?? listPortalSlugs()[0] ?? "";
    const t = await getTranslations("common");

    const params = await searchParams;
    const error = typeof params.error === "string" ? params.error : undefined;
    const callbackUrl = typeof params.callbackUrl === "string" ? params.callbackUrl : undefined;

    return (
        <main>
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
                        {t("loading")}
                    </div>
                }
            >
                <LoginForm portal={portal} error={error} callbackUrl={callbackUrl} />
            </Suspense>
        </main>
    );
}
