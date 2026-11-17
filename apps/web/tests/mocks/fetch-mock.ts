import { errorEnvelope, type ApiEnvelope, successEnvelope } from "./fixtures.ts";

export interface MockRoute {
  status?: number;
  body: unknown;
  statusText?: string;
}

export type MockRouteValue = MockRoute | unknown;
export type MockRouteMap = Record<string, MockRouteValue>;

function isMockRoute(value: MockRouteValue): value is MockRoute {
  return (
    typeof value === "object" &&
    value !== null &&
    "body" in value &&
    ("status" in value || "statusText" in value)
  );
}

export function createFetchMock(routes: MockRouteMap) {
  const originalFetch = globalThis.fetch;
  const requests: Array<{ url: string; init?: RequestInit }> = [];

  globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const url = String(input);
    requests.push({ url, init });
    const route = Object.entries(routes).find(([path]) => url.includes(path));

    if (!route) {
      return new Response(
        JSON.stringify(errorEnvelope("RESOURCE_NOT_FOUND", `No mock route for ${url}`)),
        { status: 404, statusText: "Not Found", headers: { "Content-Type": "application/json" } },
      );
    }

    const value = route[1];
    const response: MockRoute = isMockRoute(value)
      ? value
      : { status: 200, body: value };
    return new Response(JSON.stringify(response.body), {
      status: response.status ?? 200,
      statusText: response.statusText,
      headers: { "Content-Type": "application/json" },
    });
  };

  return {
    requests,
    restore() {
      globalThis.fetch = originalFetch;
    },
  };
}

export function jsonResponse<T>(body: T, status = 200): MockRoute {
  return { status, body };
}

export function successResponse<T>(data: T, metadata?: Record<string, unknown>): MockRoute {
  return { status: 200, body: successEnvelope(data, metadata) as ApiEnvelope<T> };
}

export function emptyResponse<T>(): MockRoute {
  return successResponse<T[]>([], { total: 0, page: 1, limit: 20, total_pages: 0 }) as MockRoute;
}

export function errorResponse(code: string, message: string, status: number, details?: unknown): MockRoute {
  return { status, body: errorEnvelope(code, message, details) };
}
