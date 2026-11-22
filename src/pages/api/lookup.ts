// The landing pages' registration lookup (src/lib/vehicle-lookup.ts):
// POST {"reg": "LX59 ABC"} → {"found": true, "vehicle": {…}} | {"found": false}
// | {"error": "…"}. JSON only, from this site's own pages, and at most 20
// lookups per visitor in 10 minutes, so the DVLA and DVSA quotas can't be
// used up by someone else.
import type { APIRoute } from "astro";
import { cleanReg, lookupReady, lookupReg, vehicleSummary } from "../../lib/vehicle-lookup.ts";

export const prerender = false;

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } });

const recent = new Map<string, number[]>();
function tooMany(ip: string): boolean {
  const now = Date.now();
  const times = (recent.get(ip) ?? []).filter((t) => now - t < 10 * 60e3);
  times.push(now);
  recent.set(ip, times);
  if (recent.size > 5000) recent.delete(recent.keys().next().value!);
  return times.length > 20;
}

export const POST: APIRoute = async ({ request, clientAddress, url }) => {
  if (!lookupReady()) return json({ error: "Lookup isn't available" }, 503);
  if (!request.headers.get("content-type")?.startsWith("application/json")) return json({ error: "JSON only" }, 415);
  // A page on another site can't use it: its Origin wouldn't match this site's Host.
  const origin = request.headers.get("origin");
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? url.host;
  if (origin && (() => { try { return new URL(origin).host !== host; } catch { return true; } })()) {
    return json({ error: "Not from this site" }, 403);
  }
  // Behind nginx every request comes from 127.0.0.1; nginx passes the visitor's address.
  const ip = (/^(127\.|::1|::ffff:127\.)/.test(clientAddress) && request.headers.get("x-real-ip")) || clientAddress;
  if (tooMany(ip)) return json({ error: "Too many lookups. Please wait a few minutes, or continue without one." }, 429);

  const body = await request.json().catch(() => ({}));
  const reg = cleanReg(String(body?.reg ?? ""));
  if (!reg) return json({ error: "Enter a registration like AB12 CDE" }, 400);
  try {
    const v = await lookupReg(reg);
    return json(v ? { found: true, vehicle: v, summary: vehicleSummary(v) } : { found: false });
  } catch (e) {
    console.error("lookup:", e instanceof Error ? e.message : e);
    return json({ error: "The lookup isn't answering right now." }, 502);
  }
};
