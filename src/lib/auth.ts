// The admin's sign-in: one password, kept in .env only as a scrypt hash
// (ADMIN_PASSWORD_HASH, made by `npm run admin:password`), and a signed
// cookie that keeps the browser signed in for 30 days (SESSION_SECRET).
import "./env.ts";
import crypto from "node:crypto";

export const COOKIE = "lcw_admin";
const DAYS = 30;

/** "scrypt$<salt hex>$<hash hex>" */
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16);
  const hash = crypto.scryptSync(password, salt, 64);
  return `scrypt$${salt.toString("hex")}$${hash.toString("hex")}`;
}

function checkPassword(password: string, stored: string): boolean {
  const [kind, saltHex, hashHex] = stored.split("$");
  if (kind !== "scrypt" || !saltHex || !hashHex) return false;
  const want = Buffer.from(hashHex, "hex");
  const got = crypto.scryptSync(password, Buffer.from(saltHex, "hex"), want.length);
  return crypto.timingSafeEqual(got, want);
}

/** Both settings are there, so signing in can work. */
export const authReady = () => Boolean(process.env.ADMIN_PASSWORD_HASH && process.env.SESSION_SECRET);

const sign = (data: string) =>
  crypto.createHmac("sha256", process.env.SESSION_SECRET ?? "").update(data).digest("base64url");

/** A cookie value for a new session, or null if the password is wrong. */
export function signIn(password: string): { value: string; maxAge: number } | null {
  if (!authReady() || !checkPassword(password, process.env.ADMIN_PASSWORD_HASH!)) return null;
  const expires = String(Date.now() + DAYS * 864e5);
  return { value: `${expires}.${sign(expires)}`, maxAge: DAYS * 86400 };
}

export function isSignedIn(cookie: string | undefined): boolean {
  if (!cookie || !authReady()) return false;
  const [expires, mac] = cookie.split(".");
  if (!expires || !mac || Number(expires) < Date.now()) return false;
  const want = Buffer.from(sign(expires));
  const got = Buffer.from(mac);
  return got.length === want.length && crypto.timingSafeEqual(got, want);
}

// Slows down password guessing: 8 tries per address per 15 minutes.
const tries = new Map<string, { n: number; until: number }>();
export function tooManyTries(ip: string): boolean {
  const t = tries.get(ip);
  return Boolean(t && t.until > Date.now() && t.n >= 8);
}
export function noteFailedTry(ip: string) {
  const t = tries.get(ip);
  if (!t || t.until < Date.now()) tries.set(ip, { n: 1, until: Date.now() + 15 * 60e3 });
  else t.n++;
}
