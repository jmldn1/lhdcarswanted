// Admin, Reviews, "Connect": off to Google's sign-in, with a one-off code
// (kept in a short-lived cookie) that the return must bring back.
import type { APIRoute } from "astro";
import crypto from "node:crypto";
import { googleReady, authUrl, redirectUri, STATE_COOKIE } from "../../../lib/google-reviews.ts";

export const GET: APIRoute = ({ request, cookies, redirect }) => {
  if (!googleReady()) return redirect("/admin/google", 303);
  const state = crypto.randomBytes(16).toString("hex");
  cookies.set(STATE_COOKIE, state, { path: "/admin/google", maxAge: 600, httpOnly: true, sameSite: "lax", secure: import.meta.env.PROD });
  return redirect(authUrl(state, redirectUri(request)), 303);
};
