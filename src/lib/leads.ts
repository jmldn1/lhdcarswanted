// Sell your car requests and enquiries about cars. Customer data: each is written to its own
// folder under LEADS_DIR (default data/leads, git-ignored; outside the app in
// production) and never logged. Each is also emailed to the dealer (mail.ts).
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
  registered: "UK" | "Europe" | "Elsewhere" | "Not registered";
  drive: "Left hand drive" | "Right hand drive";
  name: string;
  email: string;
  /** Country code, e.g. "+44"; saved with the number. */
  dial: string;
  phone: string;
  message: string;
  /** The landing page ("/sell-your-porsche-911") or sell page layout B it was sent from, if any. */
  source?: string;
  /** What the registration lookup found, in one line, if one was made. */
  lookup?: string;
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
    registered: oneOf(text(form, "registered"), ["UK", "Europe", "Elsewhere", "Not registered"] as const, "UK"),
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

/** A new, empty folder for one request: LEADS_DIR/<kind>/<date>-<random>. */
async function newLeadDir(kind: LeadKind) {
  const id = `${new Date().toISOString().slice(0, 10)}-${crypto.randomBytes(6).toString("hex")}`;
  const dir = path.join(process.env.LEADS_DIR || path.resolve("data/leads"), kind, id);
  await fs.mkdir(dir, { recursive: true });
  return { id, dir };
}

/** The number as one would dial it: the code, then the number without its leading 0. */
export const fullPhone = (dial: string, phone: string) => (phone ? `${dial} ${phone.replace(/^0+/, "")}` : "");

/** Writes one request (and its photos, as sent) to its own folder. Returns its id. */
export async function saveSellRequest(data: SellRequest, photos: File[]): Promise<string> {
  const { id, dir } = await newLeadDir("sell");
  const files: string[] = [];
  for (const [i, f] of photos.entries()) {
    const name = `photo-${String(i + 1).padStart(2, "0")}.${EXT[f.type] ?? "img"}`;
    await fs.writeFile(path.join(dir, name), Buffer.from(await f.arrayBuffer()));
    files.push(name);
  }
  const record = { id, receivedAt: new Date().toISOString(), ...data, phone: fullPhone(data.dial, data.phone), photos: files };
  await fs.writeFile(path.join(dir, "request.json"), JSON.stringify(record, null, 2));
  return id;
}

/** An enquiry about one car, from the car page's form. */
export interface Enquiry {
  name: string;
  email: string;
  dial: string;
  phone: string;
  message: string;
}
export type EnquiryErrors = Partial<Record<keyof Enquiry, string>>;

export function readEnquiryForm(form: FormData): { data: Enquiry; errors: EnquiryErrors } {
  const data: Enquiry = {
    name: text(form, "name", 100),
    email: text(form, "email", 200),
    dial: oneOf(text(form, "dial"), DIALS, "+44"),
    phone: text(form, "phone", 40),
    message: text(form, "message", 4000),
  };
  const errors: EnquiryErrors = {};
  if (!data.name) errors.name = "Enter your name";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) errors.email = "Enter an email address like you@example.com";
  if (data.phone && !/^[\d\s()+-]{6,}$/.test(data.phone)) errors.phone = "Enter a phone number, or leave it blank";
  if (!data.message) errors.message = "Enter a message";
  return { data, errors };
}

/** Writes one enquiry, with the car it's about, to its own folder. Returns its id. */
export async function saveEnquiry(data: Enquiry, car: { id: string; name: string; url: string }): Promise<string> {
  const { id, dir } = await newLeadDir("enquiries");
  const record = { id, receivedAt: new Date().toISOString(), car, ...data, phone: fullPhone(data.dial, data.phone) };
  await fs.writeFile(path.join(dir, "request.json"), JSON.stringify(record, null, 2));
  return id;
}

/** A message from the Contact page. */
export interface Message {
  topic: "Buying a car" | "Selling my car" | "Something else";
  name: string;
  email: string;
  dial: string;
  phone: string;
  message: string;
}
export type MessageErrors = Partial<Record<keyof Message, string>>;
export const TOPICS: Message["topic"][] = ["Buying a car", "Selling my car", "Something else"];

export function readMessageForm(form: FormData): { data: Message; errors: MessageErrors } {
  const data: Message = {
    topic: oneOf(text(form, "topic"), TOPICS, "Something else"),
    name: text(form, "name", 100),
    email: text(form, "email", 200),
    dial: oneOf(text(form, "dial"), DIALS, "+44"),
    phone: text(form, "phone", 40),
    message: text(form, "message", 4000),
  };
  const errors: MessageErrors = {};
  if (!data.name) errors.name = "Enter your name";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) errors.email = "Enter an email address like you@example.com";
  if (data.phone && !/^[\d\s()+-]{6,}$/.test(data.phone)) errors.phone = "Enter a phone number, or leave it blank";
  if (!data.message) errors.message = "Enter a message";
  return { data, errors };
}

export async function saveMessage(data: Message): Promise<string> {
  const { id, dir } = await newLeadDir("messages");
  const record = { id, receivedAt: new Date().toISOString(), ...data, phone: fullPhone(data.dial, data.phone) };
  await fs.writeFile(path.join(dir, "request.json"), JSON.stringify(record, null, 2));
  return id;
}

// The admin's side: reading leads, and each lead's stage and notes, kept in
// admin.json beside request.json (which is never changed).

export type LeadKind = "sell" | "enquiries" | "messages";
export const LEAD_KINDS: LeadKind[] = ["sell", "enquiries", "messages"];
export const STAGES: Record<LeadKind, string[]> = {
  sell: ["New", "Contacted", "Offer made", "Bought", "Not going ahead"],
  enquiries: ["New", "Replied", "Viewing booked", "Sold", "Closed"],
  messages: ["New", "Replied", "Closed"],
};

export interface LeadAdmin {
  stage: string;
  notes: string;
}
export interface Lead {
  kind: LeadKind;
  id: string;
  receivedAt: string;
  // What the form saved (SellRequest or Enquiry fields, plus photos/car).
  request: Record<string, unknown>;
  admin: LeadAdmin;
}

const leadsRoot = () => process.env.LEADS_DIR || path.resolve("data/leads");
// Folder names are made by newLeadDir; anything else is never read.
const LEAD_ID = /^\d{4}-\d\d-\d\d-[0-9a-f]{12}$/;
const PHOTO_FILE = /^photo-\d\d\.(jpg|png|webp|heic|heif|avif|img)$/;

async function readJson(file: string): Promise<Record<string, unknown> | null> {
  try {
    return JSON.parse(await fs.readFile(file, "utf8"));
  } catch {
    return null;
  }
}

export async function getLead(kind: LeadKind, id: string): Promise<Lead | null> {
  if (!LEAD_KINDS.includes(kind) || !LEAD_ID.test(id)) return null;
  const dir = path.join(leadsRoot(), kind, id);
  const request = await readJson(path.join(dir, "request.json"));
  if (!request) return null;
  const saved = (await readJson(path.join(dir, "admin.json"))) ?? {};
  return {
    kind,
    id,
    receivedAt: String(request.receivedAt ?? ""),
    request,
    admin: { stage: String(saved.stage ?? "New"), notes: String(saved.notes ?? "") },
  };
}

/** Newest first. */
export async function listLeads(kind: LeadKind): Promise<Lead[]> {
  const ids = (await fs.readdir(path.join(leadsRoot(), kind)).catch(() => [] as string[])).filter((d) => LEAD_ID.test(d));
  const leads = (await Promise.all(ids.map((id) => getLead(kind, id)))).filter((l): l is Lead => Boolean(l));
  return leads.sort((a, b) => b.receivedAt.localeCompare(a.receivedAt));
}

export async function saveLeadAdmin(kind: LeadKind, id: string, admin: LeadAdmin): Promise<boolean> {
  if (!(await getLead(kind, id))) return false;
  const stage = STAGES[kind].includes(admin.stage) ? admin.stage : "New";
  const record = { stage, notes: admin.notes.slice(0, 8000), updatedAt: new Date().toISOString() };
  await fs.writeFile(path.join(leadsRoot(), kind, id, "admin.json"), JSON.stringify(record, null, 2));
  return true;
}

/** The path of a photo a seller sent, or null if the names aren't ones this site made. */
export function leadPhotoPath(kind: string, id: string, file: string): string | null {
  if (!LEAD_KINDS.includes(kind as LeadKind) || !LEAD_ID.test(id) || !PHOTO_FILE.test(file)) return null;
  return path.join(leadsRoot(), kind, id, file);
}
