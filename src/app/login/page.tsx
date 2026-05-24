import { Suspense } from "react";
import { cookies } from "next/headers";
import LoginForm from "./LoginForm";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const cookieStore = await cookies();
  const portal = cookieStore.get("portal")?.value ?? "developers";

  const params = await searchParams;
  const callbackUrl =
    typeof params.callbackUrl === "string"
      ? params.callbackUrl
      : `/${portal}/dashboard`;

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
      <LoginForm
        portal={portal}
        callbackUrl={callbackUrl}
        error={params.error}
      />
    </Suspense>
  );
}
