// Sell your car requests. Customer data: each request is written to its own
// folder under LEADS_DIR (default data/leads, git-ignored; outside the app in
// production) and never logged. Emailing them to the dealer comes with this
// site's own email sender.
import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";

export const MAX_PHOTOS = 10;
export const MAX_PHOTO_BYTES = 15 * 1024 * 1024;

/** Country codes offered beside the phone number: the UK first, then where LHD sellers often are. */
export const DIAL_CODES = [
  ["+44", "UK"], ["+353", "IE"], ["+33", "FR"], ["+49", "DE"], ["+34", "ES"], ["+351", "PT"], ["+39", "IT"],
  ["+31", "NL"], ["+32", "BE"], ["+352", "LU"], ["+41", "CH"], ["+43", "AT"], ["+45", "DK"], ["+46", "SE"],
  ["+47", "NO"], ["+48", "PL"], ["+30", "GR"], ["+356", "MT"], ["+357", "CY"], ["+1", "US/CA"], ["+971", "AE"],
] as const;
const DIALS = DIAL_CODES.map(([code]) => code);

export interface SellRequest {
  reg: string;
  make: string;
  model: string;
  year: string;
  mileage: string;
  unit: "miles" | "km";
  registered: "UK" | "Europe" | "Elsewhere";
  drive: "Left hand drive" | "Right hand drive";
  name: string;
  email: string;
  /** Country code, e.g. "+44"; saved with the number. */
  dial: string;
  phone: string;
  message: string;
}

export type SellErrors = Partial<Record<keyof SellRequest | "photos", string>>;

const text = (form: FormData, key: string, max = 200) =>
  String(form.get(key) ?? "").trim().slice(0, max);
const oneOf = <T extends string>(value: string, options: readonly T[], fallback: T): T =>
  (options as readonly string[]).includes(value) ? (value as T) : fallback;

/** Reads and checks the form. Photos are checked here and saved by saveSellRequest. */
export function readSellForm(form: FormData): { data: SellRequest; photos: File[]; errors: SellErrors } {
  const data: SellRequest = {
    reg: text(form, "reg", 40).toUpperCase(),
    make: text(form, "make", 60),
    model: text(form, "model", 80),
    year: text(form, "year", 4),
    mileage: text(form, "mileage", 12),
    unit: oneOf(text(form, "unit"), ["miles", "km"] as const, "miles"),
    registered: oneOf(text(form, "registered"), ["UK", "Europe", "Elsewhere"] as const, "UK"),
    drive: oneOf(text(form, "drive"), ["Left hand drive", "Right hand drive"] as const, "Left hand drive"),
    name: text(form, "name", 100),
    email: text(form, "email", 200),
    dial: oneOf(text(form, "dial"), DIALS, "+44"),
    phone: text(form, "phone", 40),
    message: text(form, "message", 4000),
  };
  const errors: SellErrors = {};
  if (!data.make) errors.make = "Enter the make";
  if (!data.model) errors.model = "Enter the model";
  if (data.year && !/^(19|20)\d\d$/.test(data.year)) errors.year = "Enter a year like 2015";
  if (data.mileage && !/^[\d,. ]+$/.test(data.mileage)) errors.mileage = "Numbers only";
  if (!data.name) errors.name = "Enter your name";
  if (data.phone && !/^[\d\s()+-]{6,}$/.test(data.phone)) errors.phone = "Enter a phone number, or leave it blank";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) errors.email = "Enter an email address like you@example.com";

  const photos = form.getAll("photos").filter((f): f is File => f instanceof File && f.size > 0);
  if (photos.length > MAX_PHOTOS) errors.photos = `Up to ${MAX_PHOTOS} photos, please`;
  else if (photos.some((f) => !f.type.startsWith("image/"))) errors.photos = "Photos only, please";
  else if (photos.some((f) => f.size > MAX_PHOTO_BYTES)) errors.photos = "Each photo must be under 15 MB";

  return { data, photos, errors };
}

const EXT: Record<string, string> = {
  "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/heic": "heic", "image/heif": "heif", "image/avif": "avif",
};

/** Writes one request (and its photos, as sent) to its own folder. Returns its id. */
export async function saveSellRequest(data: SellRequest, photos: File[]): Promise<string> {
  const id = `${new Date().toISOString().slice(0, 10)}-${crypto.randomBytes(6).toString("hex")}`;
  const dir = path.join(process.env.LEADS_DIR || path.resolve("data/leads"), "sell", id);
  await fs.mkdir(dir, { recursive: true });
  const files: string[] = [];
  for (const [i, f] of photos.entries()) {
    const name = `photo-${String(i + 1).padStart(2, "0")}.${EXT[f.type] ?? "img"}`;
    await fs.writeFile(path.join(dir, name), Buffer.from(await f.arrayBuffer()));
    files.push(name);
  }
  // The number as one would dial it: the code, then the number without its leading 0.
  const phone = data.phone ? `${data.dial} ${data.phone.replace(/^0+/, "")}` : "";
  const record = { id, receivedAt: new Date().toISOString(), ...data, phone, photos: files };
  await fs.writeFile(path.join(dir, "request.json"), JSON.stringify(record, null, 2));
  return id;
}
