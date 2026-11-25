// Emails the dealer when someone sends their car's details, through Gmail.
// Settings (.env): GMAIL_USER, GMAIL_PASS (an app password) and GMAIL_TO (one
// address or several). Without them nothing is emailed.
//
// As on London LHD Centre v1, the request is always saved first (leads.ts) and
// an email that fails is only logged: it never looks like a failed form, and
// the request is still in Admin, Leads. Nothing a customer typed is logged.
import "./env.ts";
import nodemailer from "nodemailer";
import sharp from "sharp";
import { brand } from "../brands/index.ts";
import type { SellRequest } from "./leads.ts";

const { GMAIL_USER: user = "", GMAIL_PASS: pass = "", GMAIL_TO = "" } = process.env;
const to = GMAIL_TO.split(/[,;\s]+/).filter(Boolean);
const ready = Boolean(user && pass && to.length);
if (!ready && brand.features.sellForm) console.warn("Sell requests aren't emailed: set GMAIL_USER, GMAIL_PASS and GMAIL_TO.");

const transport = ready
  ? nodemailer.createTransport({
      service: "gmail",
      auth: { user, pass: pass.replace(/\s+/g, "") },
      connectionTimeout: 20_000,
      greetingTimeout: 20_000,
      socketTimeout: 120_000,
    })
  : null;

// Gmail allows a few hundred emails a day. A flood of requests stops at this
// many an hour; they're all still saved.
const MAX_AN_HOUR = 40;
let recent: number[] = [];
function tooMany(): boolean {
  const now = Date.now();
  recent = recent.filter((t) => now - t < 60 * 60e3);
  if (recent.length >= MAX_AN_HOUR) return true;
  recent.push(now);
  return false;
}

/** Visitor-typed text on one line. */
const oneLine = (s: string, max = 120) => s.replace(/\s+/g, " ").trim().slice(0, max);

export function sellEmail(d: SellRequest, phone: string, photos: { sent: number; attached: number }) {
  const car = oneLine([d.year, d.make, d.model].filter(Boolean).join(" "));
  const photoLine =
    photos.sent === 0 ? "None sent"
    : photos.attached === photos.sent ? `${photos.sent} attached`
    : `${photos.sent} sent, ${photos.attached} attached; see them all in Admin, Leads`;
  const rows: [string, string][] = [
    ["Name", oneLine(d.name)],
    ["Email", oneLine(d.email, 200)],
    ["Phone", phone || "Not given"],
    ["", ""],
    ["Car", car],
    ["Registration or VIN", oneLine(d.reg) || "Not given"],
    ["Registered", d.registered],
    ["Mileage", d.mileage ? `${oneLine(d.mileage)} ${d.unit}` : "Not given"],
    ...(d.lookup ? [["DVLA and MOT", oneLine(d.lookup, 300)] as [string, string]] : []),
    ["Photos", photoLine],
    ["Sent from", d.source ?? "/sell-your-car"],
  ];
  return {
    subject: `Valuation request: ${oneLine(car, 80)} (${oneLine(d.name, 60)})`,
    text: [
      rows.map(([k, v]) => (k ? `${k}: ${v}` : "")).join("\n"),
      d.message && `Message:\n${d.message}`,
      "This request is also in Admin, Leads.",
    ].filter(Boolean).join("\n\n"),
  };
}

/** The photos, small enough to email; one that can't be read is left out. */
async function emailPhotos(photos: File[]) {
  const out: { filename: string; content: Buffer }[] = [];
  for (const [i, f] of photos.entries()) {
    try {
      const content = await sharp(Buffer.from(await f.arrayBuffer()))
        .rotate()
        .resize(1600, 1600, { fit: "inside", withoutEnlargement: true })
        .jpeg({ quality: 78 })
        .toBuffer();
      out.push({ filename: `photo-${String(i + 1).padStart(2, "0")}.jpg`, content });
    } catch {
      // Not readable here (some HEIC files): the original is in Admin, Leads.
    }
  }
  return out;
}

/** Emails a saved request. Never throws; answers to it go to the seller. */
export async function emailSellRequest(d: SellRequest, phone: string, photos: File[]): Promise<void> {
  if (!transport) return;
  if (tooMany()) return console.warn(`Sell request not emailed: more than ${MAX_AN_HOUR} in an hour. It's in Admin, Leads.`);
  try {
    const attachments = await emailPhotos(photos);
    await transport.sendMail({
      from: { name: `${brand.name} website`, address: user },
      to,
      replyTo: { name: oneLine(d.name), address: d.email },
      ...sellEmail(d, phone, { sent: photos.length, attached: attachments.length }),
      attachments,
      // Attachments and text come from here only: never from a file or address.
      disableFileAccess: true,
      disableUrlAccess: true,
    });
  } catch (e) {
    // The code only (EAUTH, ETIMEDOUT…): messages can quote addresses.
    const code = e && typeof e === "object" && "code" in e ? String(e.code) : "unknown error";
    console.error(`Sell request not emailed (${code}). It's in Admin, Leads.`);
  }
}
