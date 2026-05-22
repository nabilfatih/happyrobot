import { Effect } from "effect";
import { RateLimitError } from "@/domain/errors";

const buckets = new Map<string, { count: number; resetAt: number }>();

/** Applies a small in-memory fixed-window limit for public request surfaces. */
export function checkRateLimit(key: string, limit: number, windowMs: number) {
  return Effect.gen(function* () {
    const allowed = yield* Effect.sync(() => {
      const now = Date.now();
      const bucket = buckets.get(key);

      if (!bucket || bucket.resetAt <= now) {
        buckets.set(key, { count: 1, resetAt: now + windowMs });
        return true;
      }

      bucket.count += 1;

      return bucket.count <= limit;
    });

    if (!allowed) {
      return yield* Effect.fail(
        new RateLimitError({
          message: "Too many requests. Please retry shortly.",
        }),
      );
    }
  });
}

/** Builds a stable rate-limit key from the nearest proxy-provided client IP. */
export function requestRateLimitKey(request: Request, surface: string) {
  const forwardedFor = request.headers.get("x-forwarded-for");
  const flyClientIp = request.headers.get("fly-client-ip");
  const clientIp =
    flyClientIp ?? forwardedFor?.split(",")[0]?.trim() ?? "unknown";

  return `${surface}:${clientIp}`;
}
