export async function register() {
    if (process.env.NEXT_RUNTIME === "nodejs") {
        try {
            const { reconcile } = await import("@/lib/deployment/reconcile");
            await reconcile();
        } catch (err) {
            const { logger } = await import("@/lib/logger");
            logger.error({ err }, "deployment reconcile failed");
        }
    }
}
