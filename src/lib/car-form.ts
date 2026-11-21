// Reads and checks the admin's add/edit car form. Photos are handled apart
// (src/lib/photo-queue.ts); this is the car's details.
import type { Car, CarStatus } from "./cars.ts";
import { videoSource, LENGTH } from "./video.ts";

export type CarErrors = Partial<Record<"make" | "model" | "year" | "price" | "photos" | "video" | "videoLength", string>>;

const STATUSES: CarStatus[] = ["draft", "available", "reserved", "sold"];
const text = (form: FormData, key: string, max = 200) => String(form.get(key) ?? "").trim().slice(0, max);

/** The form's values on top of the car as it was (or a new one). */
export function readCarForm(form: FormData, base: Car): { car: Car; errors: CarErrors; featured: boolean } {
  const priceText = text(form, "price", 20).replace(/[£,\s]/g, "");
  const poa = form.get("poa") === "on";
  const gearbox = text(form, "gearbox");
  const steering = text(form, "steering");
  const status = text(form, "status") as CarStatus;
  const videoUrl = text(form, "videoUrl", 500);
  const videoLength = text(form, "videoLength", 8);
  const poster = text(form, "videoPoster", 40);

  const car: Car = {
    ...base,
    make: text(form, "make", 60),
    model: text(form, "model", 100),
    year: text(form, "year", 4) || undefined,
    mileage: text(form, "mileage", 40) || undefined,
    colour: text(form, "colour", 60) || undefined,
    registered: text(form, "registered", 60) || undefined,
    gearbox: gearbox === "Manual" || gearbox === "Automatic" ? gearbox : undefined,
    engine: text(form, "engine", 60) || undefined,
    steering: steering === "LHD" || steering === "RHD" ? steering : undefined,
    price: poa || !priceText ? null : Number(priceText),
    description: text(form, "description", 10000),
    status: STATUSES.includes(status) ? status : "draft",
    video: videoUrl
      ? { url: videoUrl, length: videoLength || undefined, poster: /^[a-z0-9]+$/i.test(poster) ? poster : undefined }
      : undefined,
  };

  const errors: CarErrors = {};
  if (!car.make) errors.make = "Enter the make";
  if (!car.model) errors.model = "Enter the model";
  if (car.year && !/^(19|20)\d\d$/.test(car.year)) errors.year = "Enter a year like 2015";
  if (!poa && priceText && !/^\d{1,9}$/.test(priceText)) errors.price = "Numbers only, like 65000";
  if (!poa && !priceText && car.status !== "draft") errors.price = "Enter a price, or tick POA";
  if (videoUrl && !videoSource(videoUrl)) {
    errors.video = "Paste a YouTube or Vimeo link, or the web address of an .mp4 file";
  }
  if (videoLength && !LENGTH.test(videoLength)) errors.videoLength = "Minutes and seconds, like 2:14";
  return { car, errors, featured: form.get("featured") === "on" };
}

/** Lists from the photo controls: the order shown, and those ticked to remove. */
export function readPhotoChanges(form: FormData): { order: string[]; removed: string[] } {
  const ids = (v: string) => v.split(",").map((s) => s.trim()).filter((s) => /^[a-z0-9]+$/i.test(s));
  return {
    order: ids(String(form.get("order") ?? "")),
    removed: form.getAll("remove").flatMap((v) => ids(String(v))),
  };
}
