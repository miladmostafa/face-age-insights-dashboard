import { concernThreshold } from "@/lib/config";
import { getStore } from "@/lib/db";
import { clientIp, handleIngest, readWriteKey } from "@/lib/ingest";
import { createRateLimiter } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const limiter = createRateLimiter(120, 60_000);
const MAX_BODY = 8_000;

function withCors(response: Response, allowOrigin: string | null): Response {
  if (!allowOrigin) return response;
  const headers = new Headers(response.headers);
  headers.set("Access-Control-Allow-Origin", allowOrigin);
  headers.set("Access-Control-Allow-Methods", "POST, OPTIONS");
  headers.set("Access-Control-Allow-Headers", "Content-Type, X-Write-Key, Authorization");
  headers.set("Access-Control-Max-Age", "86400");
  headers.set("Vary", "Origin");
  return new Response(response.body, { status: response.status, headers });
}

export function OPTIONS(request: Request) {
  const origin = request.headers.get("origin");
  return withCors(new Response(null, { status: 204 }), origin ?? "*");
}

export async function POST(request: Request) {
  const text = await request.text();
  if (text.length > MAX_BODY) {
    return Response.json({ error: "Payload is too large." }, { status: 413 });
  }
  let payload: unknown = null;
  if (text.length > 0) {
    try {
      payload = JSON.parse(text) as unknown;
    } catch {
      return Response.json({ error: "Body must be JSON." }, { status: 400 });
    }
  }

  const result = await handleIngest({
    store: getStore(),
    payload,
    writeKey: readWriteKey(request.headers),
    origin: request.headers.get("origin"),
    ip: clientIp(request.headers),
    now: Date.now(),
    limiter,
    concernThreshold: concernThreshold(),
  });

  return withCors(Response.json(result.body, { status: result.status }), result.allowOrigin);
}
