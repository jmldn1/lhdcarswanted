// Google reviews: this business's own Google Business Profile, as on London
// LHD Centre v1 (utils/googleBusiness.js there). The profile's owner signs in
// with Google once, in Admin, Reviews ("Connect"); the permission (a refresh
// token) is kept encrypted in the "settings" collection, and the rating,
// count and recent reviews are fetched from Google into the same place, at
// most once a day. Pages only read what's stored, so a visitor never waits on
// Google, and Google isn't contacted from their browser.
//
// Needs GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET (an OAuth "web application"
// client whose redirect URIs include <site>/admin/google/callback), and the
// Cloud project approved for the Business Profile APIs (until then Google
// answers with a zero quota). One client can serve several sites: which
// profile's reviews come back depends on the account that connects.
import "./env.ts";
import crypto from "node:crypto";
import { db, hasDb } from "./db.ts";

const SCOPE = "https://www.googleapis.com/auth/business.manage";
const AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_URL = "https://oauth2.googleapis.com/token";
const REVOKE_URL = "https://oauth2.googleapis.com/revoke";
const ACCOUNTS_URL = "https://mybusinessaccountmanagement.googleapis.com/v1/accounts";
const INFO_URL = "https://mybusinessbusinessinformation.googleapis.com/v1";
const REVIEWS_URL = "https://mybusiness.googleapis.com/v4";
const STARS: Record<string, number> = { ONE: 1, TWO: 2, THREE: 3, FOUR: 4, FIVE: 5 };
const HOUR = 3600e3;
const DAY = 24 * HOUR;

export interface GoogleReview {
  id: string;
  author: string;
  rating: number | null;
  comment: string;
  reply: string | null;
  createdAt: Date | null;
}

export interface GoogleLocation {
  account: string;
  location: string;
  title: string;
  address: string;
}

export interface GoogleState {
  _id: "google";
  refreshToken?: string | null;
  connectedAt?: Date;
  /** Offered when the account manages more than one profile. */
  locations?: GoogleLocation[];
  accountName?: string | null;
  locationName?: string | null;
  locationTitle?: string | null;
  rating?: number | null;
  reviewCount?: number;
  reviews?: GoogleReview[];
  lastFetchAt?: Date | null;
  lastError?: string | null;
  lastErrorAt?: Date | null;
  fetchingUntil?: Date | null;
}

/** Holds the one-off sign-in code between "Connect" and Google's return. */
export const STATE_COOKIE = "lcw_gstate";

export const googleReady = () => Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);

const store = async () => (await db()).collection<GoogleState>("settings");

/** Where Google sends the owner back after "Allow": the address the browser
 *  used (from nginx's Host header; Astro's own URL says "localhost"). Google
 *  only accepts addresses listed on the OAuth client, so a wrong one fails
 *  safely; GOOGLE_REDIRECT_URI overrides it. */
export function redirectUri(request: Request): string {
  if (process.env.GOOGLE_REDIRECT_URI) return process.env.GOOGLE_REDIRECT_URI;
  const h = request.headers;
  const host = (h.get("x-forwarded-host") ?? h.get("host") ?? new URL(request.url).host).split(",")[0].trim();
  const local = /^(localhost|127\.0\.0\.1)(:\d+)?$/.test(host);
  // Behind nginx the server sees http; the public address is https.
  const proto = h.get("x-forwarded-proto")?.split(",")[0].trim() || (local ? "http" : "https");
  return `${proto}://${host}/admin/google/callback`;
}

// ---- The stored permission, encrypted (AES-256-GCM) with a key from the
// server's secret, so the database alone doesn't give access to the profile.
const cipherKey = () =>
  crypto.createHash("sha256").update(`${process.env.GOOGLE_TOKEN_KEY || process.env.SESSION_SECRET || ""}|google-business`).digest();

export function encrypt(text: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", cipherKey(), iv);
  const data = Buffer.concat([cipher.update(text, "utf8"), cipher.final()]);
  return [iv, cipher.getAuthTag(), data].map((b) => b.toString("base64")).join(".");
}

export function decrypt(blob: string): string {
  const [iv, tag, data] = String(blob).split(".").map((s) => Buffer.from(s, "base64"));
  const decipher = crypto.createDecipheriv("aes-256-gcm", cipherKey(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data), decipher.final()]).toString("utf8");
}

// ---- Google calls

export class GoogleError extends Error {
  status?: number;
  reason?: string;
  constructor(message: string, status?: number, reason?: string) {
    super(message);
    this.status = status;
    this.reason = reason;
  }
}

/** A plain-English reason, for the admin page. */
export function explain(err: unknown): string {
  const e = err as GoogleError;
  const text = `${e.reason ?? ""} ${e.message ?? ""}`;
  if (e.status === 429 || /quota|RATE_LIMIT|RESOURCE_EXHAUSTED/i.test(text)) {
    return "Google hasn't approved this Cloud project for the Business Profile API yet (its quota is zero), or the daily limit was reached. Try again once the approval email arrives.";
  }
  if (/SERVICE_DISABLED|has not been used in project|is disabled/i.test(text)) {
    const names: Record<string, string> = {
      "mybusinessaccountmanagement.googleapis.com": "My Business Account Management API",
      "mybusinessbusinessinformation.googleapis.com": "My Business Business Information API",
      "mybusiness.googleapis.com": "Google My Business API",
    };
    const service = text.match(/[a-z]+\.googleapis\.com/i)?.[0] ?? "";
    if (names[service]) return `The "${names[service]}" is switched off in Google Cloud. Enable it for this project (APIs & Services, Library), wait a couple of minutes, then fetch again.`;
    return 'One of the Business Profile APIs is switched off in Google Cloud. Enable "My Business Account Management API", "My Business Business Information API" and "Google My Business API" for this project.';
  }
  if (/invalid_grant/i.test(text)) {
    return 'Google no longer accepts the saved permission (it was removed, or expired while the app was in "Testing"). Disconnect, then connect again.';
  }
  if (/unable to authenticate|unsupported state/i.test(text)) {
    return "The saved permission can't be read (the server's SESSION_SECRET or GOOGLE_TOKEN_KEY has changed). Disconnect, then connect again.";
  }
  if (e.status === 403) return "The connected Google account can't manage this Business Profile. Connect with an account that's an owner or manager of the profile.";
  return `Google said: ${e.message || "unknown error"}`;
}

async function readJson(res: Response): Promise<any> {
  const body: any = await res.json().catch(() => ({}));
  if (!res.ok) {
    const e = body.error ?? {};
    const message = typeof e === "string" ? `${e}${body.error_description ? `: ${body.error_description}` : ""}` : e.message || res.statusText;
    const reason = typeof e === "string" ? e : e.status || e.details?.[0]?.reason || "";
    throw new GoogleError(message, res.status, reason);
  }
  return body;
}

export function authUrl(state: string, redirect: string): string {
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID ?? "",
    redirect_uri: redirect,
    response_type: "code",
    scope: SCOPE,
    access_type: "offline", // a refresh token, for the daily fetch
    prompt: "consent", // always return one, even when reconnecting
    state,
  });
  return `${AUTH_URL}?${params}`;
}

type Fetch = typeof fetch;

const tokenRequest = (fields: Record<string, string>, f: Fetch) =>
  f(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id: process.env.GOOGLE_CLIENT_ID ?? "", client_secret: process.env.GOOGLE_CLIENT_SECRET ?? "", ...fields }),
  }).then(readJson);

export const exchangeCode = (code: string, redirect: string, f: Fetch = fetch) =>
  tokenRequest({ code, redirect_uri: redirect, grant_type: "authorization_code" }, f);

const accessTokenFrom = async (refreshToken: string, f: Fetch) =>
  (await tokenRequest({ refresh_token: refreshToken, grant_type: "refresh_token" }, f)).access_token as string;

const get = (url: string, token: string, f: Fetch) => f(url, { headers: { Authorization: `Bearer ${token}` } }).then(readJson);

/** Every location the signed-in account can manage, across its accounts. */
export async function listLocations(token: string, f: Fetch = fetch): Promise<GoogleLocation[]> {
  const { accounts = [] } = await get(`${ACCOUNTS_URL}?pageSize=20`, token, f);
  const found: GoogleLocation[] = [];
  for (const account of accounts) {
    const { locations = [] } = await get(`${INFO_URL}/${account.name}/locations?readMask=name,title,storefrontAddress&pageSize=100`, token, f);
    for (const loc of locations) {
      found.push({
        account: account.name,
        location: loc.name,
        title: loc.title || "",
        address: [...(loc.storefrontAddress?.addressLines ?? []), loc.storefrontAddress?.postalCode].filter(Boolean).join(", "),
      });
    }
  }
  return found;
}

/** The rating, count and up to 50 most recent reviews of one location. */
export async function fetchReviews(token: string, accountName: string, locationName: string, f: Fetch = fetch) {
  const data = await get(`${REVIEWS_URL}/${accountName}/${locationName}/reviews?pageSize=50&orderBy=${encodeURIComponent("updateTime desc")}`, token, f);
  return {
    rating: typeof data.averageRating === "number" ? data.averageRating : null,
    reviewCount: data.totalReviewCount || 0,
    reviews: (data.reviews ?? []).map(
      (r: any): GoogleReview => ({
        id: r.reviewId,
        author: r.reviewer?.isAnonymous ? "A Google user" : r.reviewer?.displayName || "A Google user",
        rating: STARS[r.starRating] ?? null,
        comment: (r.comment || "").trim(),
        reply: r.reviewReply?.comment || null,
        createdAt: r.createTime ? new Date(r.createTime) : null,
      }),
    ),
  };
}

// ---- Stored state

export async function googleState(): Promise<GoogleState | null> {
  if (!hasDb()) return null;
  return (await store()).findOne({ _id: "google" });
}

/** Saves the permission from a fresh sign-in and works out the location: used
 *  at once if there's only one, otherwise offered on the admin page. */
export async function connect(tokens: { refresh_token?: string; access_token: string }, f: Fetch = fetch): Promise<GoogleState> {
  if (!tokens.refresh_token) throw new GoogleError("Google sent no refresh token", 400, "no_refresh_token");
  const locations = await listLocations(tokens.access_token, f);
  const one = locations.length === 1 ? locations[0] : undefined;
  const doc: GoogleState = {
    _id: "google",
    refreshToken: encrypt(tokens.refresh_token),
    connectedAt: new Date(),
    locations: one ? [] : locations,
    accountName: one?.account ?? null,
    locationName: one?.location ?? null,
    locationTitle: one?.title ?? null,
    lastError: null,
    lastErrorAt: null,
  };
  await (await store()).replaceOne({ _id: "google" }, doc, { upsert: true });
  return doc;
}

export async function chooseLocation(index: number): Promise<boolean> {
  const doc = await googleState();
  const pick = doc?.locations?.[index];
  if (!pick) return false;
  await (await store()).updateOne(
    { _id: "google" },
    { $set: { accountName: pick.account, locationName: pick.location, locationTitle: pick.title, locations: [], rating: null, reviewCount: 0, reviews: [], lastFetchAt: null } },
  );
  return true;
}

/** Fetches and stores the latest reviews. One at a time (a 5-minute claim),
 *  so a double click or two visitors don't fetch twice. With staleBefore,
 *  only if the last good fetch is older (so visitors arriving just after a
 *  fetch don't start another). Errors are stored for the admin page, not
 *  thrown. */
export async function refreshReviews(f: Fetch = fetch, staleBefore?: Date): Promise<GoogleState | null> {
  const now = new Date();
  const col = await store();
  const free = { $or: [{ fetchingUntil: null }, { fetchingUntil: { $lt: now } }] };
  const old = { $or: [{ lastFetchAt: null }, { lastFetchAt: { $lt: staleBefore } }] };
  const doc = await col.findOneAndUpdate(
    { _id: "google", refreshToken: { $ne: null }, locationName: { $ne: null }, $and: staleBefore ? [free, old] : [free] },
    { $set: { fetchingUntil: new Date(now.getTime() + 5 * 60e3) } },
    { returnDocument: "after" },
  );
  if (!doc) return googleState();
  let set: Partial<GoogleState>;
  try {
    const token = await accessTokenFrom(decrypt(doc.refreshToken!), f);
    const latest = await fetchReviews(token, doc.accountName!, doc.locationName!, f);
    set = { ...latest, lastFetchAt: new Date(), lastError: null, lastErrorAt: null };
  } catch (err) {
    console.error("Google reviews fetch failed:", (err as Error).message);
    set = { lastError: explain(err), lastErrorAt: new Date() };
  }
  return col.findOneAndUpdate({ _id: "google" }, { $set: { ...set, fetchingUntil: null } }, { returnDocument: "after" });
}

/** Fetches in the background if the last good fetch is over a day old (and
 *  the last failure over 6 hours ago, so a problem isn't retried on every
 *  visit). Called when the About page or the admin page is opened. */
export function refreshIfStale(doc: GoogleState | null, f: Fetch = fetch): void {
  if (!googleReady() || !doc?.refreshToken || !doc.locationName) return;
  const stale = !doc.lastFetchAt || Date.now() - doc.lastFetchAt.getTime() > DAY;
  const failedLately = doc.lastErrorAt && Date.now() - doc.lastErrorAt.getTime() < 6 * HOUR;
  if (stale && !failedLately) refreshReviews(f, new Date(Date.now() - DAY)).catch((e) => console.error("Google reviews refresh:", e.message));
}

export async function disconnect(f: Fetch = fetch): Promise<void> {
  const doc = await googleState();
  if (!doc) return;
  if (doc.refreshToken) {
    // Best effort: also withdraw the permission at Google.
    try {
      await f(`${REVOKE_URL}?token=${encodeURIComponent(decrypt(doc.refreshToken))}`, { method: "POST" });
    } catch {
      // Still disconnect here.
    }
  }
  await (await store()).deleteOne({ _id: "google" });
}

export interface QuotedReview {
  author: string;
  initials: string;
  rating: number;
  comment: string;
  date: string;
}

/** What pages show: the live rating and count once a fetch has worked, and
 *  the newest reviews with words (a star rating alone has nothing to quote),
 *  whatever their rating, so the choice is never hand-picked. As written. */
export function liveReviews(doc: GoogleState | null, count = 3): { rating: number; reviewCount: number; quotes: QuotedReview[] } | null {
  if (!doc?.lastFetchAt || !doc.rating) return null;
  const quotes = (doc.reviews ?? [])
    .filter((r) => r.comment && r.rating && r.createdAt)
    .sort((a, b) => b.createdAt!.getTime() - a.createdAt!.getTime())
    .slice(0, count)
    .map((r) => ({
      author: r.author || "A Google user",
      initials: (r.author || "G").split(/\s+/).filter(Boolean).map((w) => w[0]).slice(0, 2).join("").toUpperCase(),
      rating: r.rating!,
      comment: r.comment,
      date: r.createdAt!.toLocaleDateString("en-GB", { month: "long", year: "numeric", timeZone: "Europe/London" }),
    }));
  return { rating: doc.rating, reviewCount: doc.reviewCount ?? 0, quotes };
}
