// A car page's enquiry form, received: every car page layout (A, B and C)
// posts its form to itself, and this checks it, saves it (LEADS_DIR/
// enquiries, Admin, Leads), emails it to the dealer and sends the visitor to
// the thank-you, so a refresh can't send it twice. The form itself:
// src/components/EnquiryForm.astro.
import type { Car } from "./cars.ts";
import { readEnquiryForm, saveEnquiry, type Enquiry, type EnquiryErrors } from "./leads.ts";
import { emailEnquiry } from "./mail.ts";

export interface EnquiryState {
  values: Partial<Enquiry>;
  errors: EnquiryErrors;
  failed: boolean;
  sent: boolean;
}

/** What the form shows (and, after a good send, where to go: a redirect). */
export async function enquiryForm(request: Request, url: URL, car: Car, here: string): Promise<EnquiryState & { redirect?: string; status?: number }> {
  const name = `${car.make} ${car.model}`;
  const state: EnquiryState = { values: { dial: "+44", message: `I'm interested in the ${name}.` }, errors: {}, failed: false, sent: url.searchParams.get("sent") === "1" };
  if (request.method !== "POST") return state;
  const thanks = `${here}?sent=1#enquire`;
  const form = await request.formData();
  // Left empty by people; filled by bots. Bots get the thank-you anyway.
  if (String(form.get("website") ?? "")) return { ...state, redirect: thanks };
  const read = readEnquiryForm(form);
  state.values = read.data;
  state.errors = read.errors;
  if (!Object.keys(read.errors).length) {
    try {
      const about = { id: car.id, name, url: `/cars/${car.slug}` };
      await saveEnquiry(read.data, about);
      emailEnquiry(read.data, about);
      return { ...state, redirect: thanks };
    } catch {
      state.failed = true;
    }
  }
  return { ...state, status: 400 };
}
