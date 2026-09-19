import { z } from "zod";

/**
 * Validated once at process start (see `src/instrumentation.ts`). Failing fast on a
 * missing/weak secret beats discovering it in production when the first request
 * throws — or worse, silently signing sessions with a guessable key.
 */
const envSchema = z.object({
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  AUTH_SECRET: z
    .string()
    .min(32, "AUTH_SECRET must be at least 32 characters — generate one with: openssl rand -base64 32"),
  ALLOW_SIGNUP: z.enum(["true", "false"]).optional(),
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  INSECURE_COOKIES: z.enum(["true", "false"]).optional(),
  NODE_ENV: z.string().optional(),
});

export function validateEnv() {
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    const issues = result.error.issues.map((i) => `  - ${i.path.join(".") || "(env)"}: ${i.message}`).join("\n");
    throw new Error(`Invalid environment configuration:\n${issues}\n\nCheck your .env file against .env.example.`);
  }
  const google = [process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET];
  if (google.some(Boolean) && !google.every(Boolean)) {
    throw new Error("Set both GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET, or neither, in your .env file.");
  }
  if (process.env.NODE_ENV === "production" && process.env.INSECURE_COOKIES === "true") {
    // Not fatal — this is a documented escape hatch for plain-HTTP local testing of a
    // production build — but it must never happen silently.
    console.warn(
      "[ledgerly] INSECURE_COOKIES=true in a production build: session cookies are NOT marked Secure. " +
        "Only use this behind HTTPS-terminating infrastructure you fully trust, never on the public internet.",
    );
  }
}
