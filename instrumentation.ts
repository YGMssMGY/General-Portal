export async function register() {
    if (process.env.NEXT_RUNTIME === "nodejs") {
        try {
            const { reconcile } = await import("@/lib/deployment/reconcile");
            await reconcile();
        } catch (err) {
            const { logger } = await import("@/lib/logger");
            logger.error({ err }, "deployment reconcile failed");
        }
        try {
            const { getBoss } = await import("@/lib/jobs/boss");
            const { registerNudgeJobs } = await import("@/lib/jobs/nudge");
            const { registerDigestJobs } = await import("@/lib/jobs/digest");
            const { registerReportJobs } = await import("@/lib/jobs/reports");
            const { registerWebhookJobs } = await import("@/lib/jobs/webhooks");
            const { registerRetentionJobs } = await import("@/lib/jobs/retention");
            const { registerLinkHealthJobs } = await import("@/lib/jobs/link-health");
            const boss = await getBoss();
            await registerNudgeJobs(boss);
            await registerDigestJobs(boss);
            await registerReportJobs(boss);
            await registerWebhookJobs(boss);
            await registerRetentionJobs(boss);
            await registerLinkHealthJobs(boss);
        } catch (err) {
            const { logger } = await import("@/lib/logger");
            logger.error({ err }, "background jobs failed to start");
        }
    }
}
