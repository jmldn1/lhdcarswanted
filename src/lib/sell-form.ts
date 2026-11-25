// What both sell page layouts (/sell-your-car and /sell-your-car/b) do with a
// request that's been sent, and the choices their fields offer.
import { emailSellRequest } from "./mail.ts";
import { fullPhone, readSellForm, saveSellRequest, MAX_PHOTOS, MAX_PHOTO_BYTES, type SellRequest, type SellErrors } from "./leads.ts";

export const MAKES = [
  "Alfa Romeo", "Aston Martin", "Audi", "Bentley", "BMW", "Citroën", "Ferrari", "Fiat", "Ford", "Jaguar",
  "Lamborghini", "Land Rover", "Lexus", "Maserati", "McLaren", "Mercedes-Benz", "MINI", "Peugeot", "Porsche",
  "Renault", "Rolls-Royce", "Toyota", "Volkswagen", "Volvo",
];
export const PLACES: [SellRequest["registered"], string][] = [
  ["UK", "UK"], ["Europe", "Europe"], ["Elsewhere", "Outside Europe"], ["Not registered", "Not registered"],
];

export interface SellFormState {
  values: Partial<SellRequest>;
  errors: SellErrors;
  /** Saving went wrong. */
  failed: boolean;
}
export const emptySellForm = (): SellFormState => ({ values: { unit: "miles", registered: "UK", dial: "+44" }, errors: {}, failed: false });

/** Saves what was sent and emails it to the dealer: "saved", or the form's state to show again. */
export async function receiveSellForm(request: Request, source?: string): Promise<"saved" | SellFormState> {
  const size = Number(request.headers.get("content-length") ?? 0);
  if (size > (MAX_PHOTOS + 1) * MAX_PHOTO_BYTES) {
    return { ...emptySellForm(), errors: { photos: "That's too much to send at once. Try fewer photos, or send them on WhatsApp." } };
  }
  const form = await request.formData();
  // Left empty by people; filled by bots. Bots get the thank-you anyway.
  if (String(form.get("website") ?? "")) return "saved";
  const { data, photos, errors } = readSellForm(form);
  const lookup = String(form.get("lookup") ?? "").trim().slice(0, 300) || undefined;
  const values = { ...data, lookup };
  if (Object.keys(errors).length) return { values, errors, failed: false };
  try {
    const request = { ...values, source };
    await saveSellRequest(request, photos);
    // Not waited for: the seller isn't kept while photos are resized and sent.
    void emailSellRequest(request, fullPhone(data.dial, data.phone), photos);
    return "saved";
  } catch {
    return { values, errors, failed: true };
  }
}

/** A field's link to its message, which stays in the page, hidden, until there is one. */
export const fieldState = (errors: SellErrors, key: keyof SellErrors) =>
  ({ "aria-invalid": errors[key] ? "true" : undefined, "aria-describedby": `${key}-err` }) as const;
