// The sender's first name for the thank-you message. It travels from the form
// to the thank-you in a cookie, not in the address: addresses end up in logs,
// and a link could then put any words on the page.
import type { AstroCookies } from "astro";

const COOKIE = "thanks_name";
const TITLES = new Set(["mr", "mrs", "ms", "miss", "mx", "dr", "prof", "sir", "lady", "lord", "rev"]);

/** "SAM O'NEILL" → "Sam"; "" when it isn't clearly a first name ("Mr Smith", "J Smith", "info@…"). */
export function firstName(full: string): string {
  const words = full.trim().split(/\s+/);
  const titled = TITLES.has(words[0].toLowerCase().replace(/\.$/, ""));
  if (titled) words.shift();
  // A title and one more word: that's the surname.
  if (titled && words.length < 2) return "";
  const w = words[0] ?? "";
  if (!/^\p{L}[\p{L}\p{M}]*(?:[-'’]\p{L}[\p{L}\p{M}]*)*$/u.test(w) || [...w].length < 2 || [...w].length > 20) return "";
  // All capitals or all small: one capital per part. Otherwise as they typed it.
  if (w !== w.toUpperCase() && w !== w.toLowerCase()) return w;
  return w.toLowerCase().replace(/(^|[-'’])(\p{L})/gu, (_, sep: string, c: string) => sep + c.toUpperCase());
}

/** Keeps the name for the thank-you message: 10 minutes, this part of the site only. */
export function rememberName(cookies: AstroCookies, full: string, path: string): void {
  const name = firstName(full);
  if (name) cookies.set(COOKIE, name, { path, maxAge: 600, httpOnly: true, sameSite: "lax", secure: import.meta.env.PROD });
  // Not the last sender's name, on a shared computer.
  else cookies.delete(COOKIE, { path });
}

export function rememberedName(cookies: AstroCookies): string {
  // Checked again: a cookie can hold anything.
  return firstName(cookies.get(COOKIE)?.value ?? "");
}
