// Emails the dealer each sell request, enquiry and message, through Gmail.
// Settings (.env): GMAIL_USER, GMAIL_PASS (an app password) and GMAIL_TO (one
// address or several). Without them nothing is emailed.
//
// As on London LHD Centre v1, each one is always saved first (leads.ts) and an
// email that fails is only logged: it never looks like a failed form, and it's
// still in Admin, Leads. Nothing a customer typed is logged.
import "./env.ts";
import nodemailer from "nodemailer";
import sharp from "sharp";
import { brand } from "../brands/index.ts";
import { fullPhone, type Enquiry, type Message, type SellRequest } from "./leads.ts";

const { GMAIL_USER: user = "", GMAIL_PASS: pass = "", GMAIL_TO = "" } = process.env;
const to = GMAIL_TO.split(/[,;\s]+/).filter(Boolean);
const ready = Boolean(user && pass && to.length);
if (!ready) console.warn("Leads aren't emailed: set GMAIL_USER, GMAIL_PASS and GMAIL_TO.");

const transport = ready
  ? nodemailer.createTransport({
      service: "gmail",
      auth: { user, pass: pass.replace(/\s+/g, "") },
      connectionTimeout: 20_000,
      greetingTimeout: 20_000,
      socketTimeout: 120_000,
    })
  : null;

// Gmail allows a few hundred emails a day. A flood stops at this many an hour,
// of every kind together; they're all still saved.
const MAX_AN_HOUR = 40;
let recent: number[] = [];
function tooMany(): boolean {
  const now = Date.now();
  recent = recent.filter((t) => now - t < 60 * 60e3);
  if (recent.length >= MAX_AN_HOUR) return true;
  recent.push(now);
  return false;
}

interface Email {
  subject: string;
  text: string;
  attachments?: { filename: string; content: Buffer }[];
}
/** Sends one email, made only when it's going to be sent. Never throws; answers to it go to the customer. */
async function send(what: string, from: { name: string; email: string }, make: () => Email | Promise<Email>): Promise<void> {
  if (!transport) return;
  if (tooMany()) return console.warn(`${what} not emailed: more than ${MAX_AN_HOUR} in an hour. It's in Admin, Leads.`);
  try {
    await transport.sendMail({
      from: { name: `${brand.name} website`, address: user },
      to,
      replyTo: { name: oneLine(from.name), address: from.email },
      ...(await make()),
      // Attachments and text come from here only: never from a file or address.
      disableFileAccess: true,
      disableUrlAccess: true,
    });
  } catch (e) {
    // The code only (EAUTH, ETIMEDOUT…): messages can quote addresses.
    const code = e && typeof e === "object" && "code" in e ? String(e.code) : "unknown error";
    console.error(`${what} not emailed (${code}). It's in Admin, Leads.`);
  }
}

/** Visitor-typed text on one line. */
const oneLine = (s: string, max = 120) => s.replace(/\s+/g, " ").trim().slice(0, max);

type Row = [string, string];
const contact = (d: { name: string; email: string; dial: string; phone: string }): Row[] => [
  ["Name", oneLine(d.name)],
  ["Email", oneLine(d.email, 200)],
  ["Phone", fullPhone(d.dial, d.phone) || "Not given"],
];
/** The rows ("" for a gap), then the customer's message. */
const body = (rows: (Row | "")[], message: string) =>
  [
    rows.map((r) => (r ? `${r[0]}: ${r[1]}` : "")).join("\n"),
    message && `Message:\n${message}`,
    "This is also in Admin, Leads.",
  ].filter(Boolean).join("\n\n");

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

// Each of these is called once the lead is saved, and isn't waited for: the
// visitor isn't kept while photos are resized and the email is sent.

export function emailSellRequest(d: SellRequest, photos: File[] = []): void {
  void send("Sell request", d, async () => {
    const attachments = await emailPhotos(photos);
    const car = oneLine([d.year, d.make, d.model].filter(Boolean).join(" "));
    const photoLine =
      photos.length === 0 ? "None sent"
      : attachments.length === photos.length ? `${photos.length} attached`
      : `${photos.length} sent, ${attachments.length} attached; see them all in Admin, Leads`;
    const lookup: Row[] = d.lookup ? [["DVLA and MOT", oneLine(d.lookup, 300)]] : [];
    return {
      subject: `Valuation request: ${oneLine(car, 80)} (${oneLine(d.name, 60)})`,
      text: body(
        [
          ...contact(d),
          "",
          ["Car", car],
          ["Registration or VIN", oneLine(d.reg) || "Not given"],
          ["Registered", d.registered],
          ["Mileage", d.mileage ? `${oneLine(d.mileage)} ${d.unit}` : "Not given"],
          ...lookup,
          ["Photos", photoLine],
          ["Sent from", d.source ?? "/sell-your-car"],
        ],
        d.message,
      ),
      attachments,
    };
  });
}

/** An enquiry about one car, from its page. */
export function emailEnquiry(d: Enquiry, car: { name: string; url: string }): void {
  void send("Enquiry", d, () => ({
    subject: `Enquiry: ${oneLine(car.name, 80)} (${oneLine(d.name, 60)})`,
    text: body([...contact(d), "", ["Car", oneLine(car.name)], ["Page", car.url]], d.message),
  }));
}

/** A message from the Contact page. */
export function emailMessage(d: Message): void {
  void send("Message", d, () => ({
    subject: `Message: ${d.topic} (${oneLine(d.name, 60)})`,
    text: body([...contact(d), "", ["About", d.topic]], d.message),
  }));
}
