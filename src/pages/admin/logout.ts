// Signs out: drops the session cookie.
import type { APIRoute } from "astro";
import { COOKIE } from "../../lib/auth.ts";

export const POST: APIRoute = ({ cookies, redirect }) => {
  cookies.delete(COOKIE, { path: "/" });
  return redirect("/admin/login", 303);
};
