import { createServerFn } from "@tanstack/react-start";
import {
  getRequestHeader,
  setResponseHeader,
  setResponseStatus,
} from "@tanstack/react-start/server";
import { Effect } from "effect";
import { readRequiredEnv, secretsMatch } from "@/domain/config";
import { readDashboardReport } from "./backend";
import { checkRateLimit, requestRateLimitKey } from "./rate-limit";
import { securityHeaders } from "./security-headers";

/** Guards the dashboard HTTP response with a real Basic auth challenge. */
export function guardDashboardRequest(request: Request) {
  return Effect.runPromise(
    checkRateLimit(requestRateLimitKey(request, "dashboard"), 60, 60_000).pipe(
      Effect.zipRight(
        verifyDashboardAuthorization(request.headers.get("authorization")),
      ),
      Effect.match({
        onFailure: (error) =>
          Response.json(
            { error: error.message },
            {
              headers: securityHeaders,
              status: error._tag === "RateLimitError" ? 429 : 500,
            },
          ),
        onSuccess: (authorized) => {
          if (!authorized) {
            return unauthorizedDashboardResponse();
          }

          return undefined;
        },
      }),
    ),
  );
}

/** Loads dashboard metrics behind HTTP Basic auth. */
export const getDashboardData = createServerFn({ method: "GET" }).handler(
  async () => Effect.runPromise(loadDashboardData()),
);

function loadDashboardData() {
  return Effect.gen(function* () {
    const authorization = getRequestHeader("authorization");
    const authorized = yield* verifyDashboardAuthorization(authorization);

    if (!authorized) {
      setResponseStatus(401);
      setDashboardSecurityHeaders();
      setResponseHeader(
        "WWW-Authenticate",
        'Basic realm="Acme Logistics Dashboard"',
      );
      return {
        authorized: false as const,
        message: "Dashboard credentials are required.",
      };
    }

    setDashboardSecurityHeaders();

    return {
      authorized: true as const,
      convexUrl: yield* readRequiredEnv("CONVEX_URL"),
      dashboardToken: yield* readRequiredEnv("DASHBOARD_REALTIME_TOKEN"),
      report: yield* readDashboardReport(),
    };
  }).pipe(
    Effect.catchAll((error) =>
      Effect.sync(() => {
        setResponseStatus(500);

        return {
          authorized: false as const,
          message: error.message,
        };
      }),
    ),
  );
}

function parseBasicCredentials(header?: string) {
  if (!header?.startsWith("Basic ")) {
    return undefined;
  }

  const decoded = Buffer.from(header.slice("Basic ".length), "base64").toString(
    "utf8",
  );
  const separatorIndex = decoded.indexOf(":");

  if (separatorIndex === -1) {
    return undefined;
  }

  return {
    user: decoded.slice(0, separatorIndex),
    password: decoded.slice(separatorIndex + 1),
  };
}

function unauthorizedDashboardResponse() {
  return new Response("Dashboard credentials are required.", {
    headers: {
      ...securityHeaders,
      "cache-control": "private, no-store",
      "content-type": "text/plain; charset=utf-8",
      "www-authenticate": 'Basic realm="Acme Logistics Dashboard"',
    },
    status: 401,
  });
}

function setDashboardSecurityHeaders() {
  setResponseHeader("Cache-Control", "private, no-store");
  setResponseHeader("Referrer-Policy", securityHeaders["referrer-policy"]);
  setResponseHeader(
    "X-Content-Type-Options",
    securityHeaders["x-content-type-options"],
  );
  setResponseHeader("X-Frame-Options", securityHeaders["x-frame-options"]);
}

function verifyDashboardAuthorization(header?: string | null) {
  return Effect.gen(function* () {
    const expectedUser = yield* readRequiredEnv("DASHBOARD_BASIC_USER");
    const expectedPassword = yield* readRequiredEnv("DASHBOARD_BASIC_PASSWORD");
    const credentials = parseBasicCredentials(header ?? undefined);

    if (!credentials) {
      return false;
    }

    return (
      secretsMatch(credentials.user, expectedUser) &&
      secretsMatch(credentials.password, expectedPassword)
    );
  });
}
