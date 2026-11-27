// Back from Google's sign-in: check the one-off code, keep the permission,
// pick the profile (or offer a choice), and fetch the reviews.
import type { APIRoute } from "astro";
import { exchangeCode, connect, refreshReviews, redirectUri, explain, STATE_COOKIE } from "../../../lib/google-reviews.ts";

export const GET: APIRoute = async ({ url, request, cookies, redirect }) => {
  const expected = cookies.get(STATE_COOKIE)?.value;
  cookies.delete(STATE_COOKIE, { path: "/admin/google" });
  const done = (what: string) => redirect(`/admin/google?done=${what}`, 303);
  if (url.searchParams.get("error")) return done("denied");
  const code = url.searchParams.get("code");
  if (!expected || url.searchParams.get("state") !== expected || !code) return done("state");
  try {
    const tokens = await exchangeCode(code, redirectUri(request));
    const doc = await connect(tokens);
    if (doc.locationName) {
      await refreshReviews();
      return done("connected");
    }
    return done(doc.locations?.length ? "choose" : "no-location");
  } catch (err) {
    console.error("Google connect failed:", (err as Error).message);
    return redirect(`/admin/google?error=${encodeURIComponent(explain(err))}`, 303);
  }
};
