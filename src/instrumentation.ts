/**
 * Runs once when the Next.js server process starts (both `next dev` and `next start`).
 * We use it to fail fast on bad configuration rather than limping along and failing
 * confusingly on the first request. See https://nextjs.org/docs/app/api-reference/file-conventions/instrumentation
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { validateEnv } = await import("./lib/env");
    validateEnv();
  }
}
