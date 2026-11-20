// Guards the admin: every /admin page except the sign-in needs the session
// cookie (src/lib/auth.ts). Admin pages are never indexed or cached.
import { defineMiddleware } from "astro:middleware";
import { COOKIE, isSignedIn } from "./lib/auth.ts";

export const onRequest = defineMiddleware(async (ctx, next) => {
  const p = ctx.url.pathname;
  if (p !== "/admin" && !p.startsWith("/admin/")) return next();

  if (p !== "/admin/login" && !isSignedIn(ctx.cookies.get(COOKIE)?.value)) {
    if (ctx.request.method !== "GET") return new Response("Signed out", { status: 401 });
    return ctx.redirect(`/admin/login?next=${encodeURIComponent(p + ctx.url.search)}`, 303);
  }

  const res = await next();
  res.headers.set("X-Robots-Tag", "noindex, nofollow");
  res.headers.set("Cache-Control", "no-store");
  return res;
});
