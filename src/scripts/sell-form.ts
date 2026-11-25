// The sell form's workings shared by both layouts (/sell-your-car and
// /sell-your-car/b): the registration lookup, the checks before sending, the
// photo count and the send button. Each page adds its own steps.

export interface Vehicle {
  year?: string;
  make?: string;
  model?: string;
  colour?: string;
  fuel?: string;
}
export type Looked = { kind: "found"; vehicle: Vehicle; summary: string } | { kind: "unknown" } | { kind: "down" };

export function sellForm(form: HTMLFormElement) {
  const $ = <T extends Element = HTMLElement>(sel: string) => form.querySelector<T>(sel)!;
  const field = (id: string) => $<HTMLInputElement>(`#${id}`);
  const out = (key: string) => $(`[data-out="${key}"]`);
  const val = (id: string) => field(id).value.trim();
  const place = (v: string) => $<HTMLInputElement>(`input[name="registered"][value="${v}"]`);
  const tidy = (reg: string) => reg.toUpperCase().replace(/\s+/g, " ").trim();
  const lookup = $<HTMLInputElement>('input[name="lookup"]');
  const sendBtn = $<HTMLButtonElement>(".send");

  /** Shows a field's message under it, or clears it. */
  const say = (id: string, text = "") => {
    const p = document.getElementById(`${id}-err`)!;
    p.textContent = text;
    p.hidden = !text;
    if (text) field(id).setAttribute("aria-invalid", "true");
    else field(id).removeAttribute("aria-invalid");
  };
  /** Shows or clears a line of text that isn't an error. */
  const note = (text = "") => {
    out("note").textContent = text;
    out("note").hidden = !text;
  };

  // The lookup. A found car fills make, model and year.
  const lookUp = async (reg: string): Promise<Looked> => {
    try {
      const res = await fetch("/api/lookup", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ reg }) });
      const data = await res.json();
      if (res.ok && data.found && data.vehicle) return { kind: "found", vehicle: data.vehicle, summary: data.summary ?? "" };
      // 400: too long to be a UK registration (a foreign plate or a VIN).
      if (res.ok || res.status === 400) return { kind: "unknown" };
    } catch {
      // No connection: carry on without it.
    }
    return { kind: "down" };
  };
  const CAR = ["make", "model", "year"] as const;
  let filled: Vehicle | null = null;
  const fill = (v: Vehicle, summary: string) => {
    filled = v;
    lookup.value = summary;
    place("UK").checked = true;
    for (const k of CAR) {
      field(k).value = v[k] ?? "";
      say(k);
    }
  };
  /** Takes a looked-up car's details out again (but not words the seller has typed over them). */
  const forget = () => {
    lookup.value = "";
    if (filled) for (const k of CAR) if (field(k).value === (filled[k] ?? "")) field(k).value = "";
    filled = null;
  };
  const facts = (v: Vehicle) => [v.year, v.colour, v.fuel].filter(Boolean).join(" · ");
  /** Why the car has to be asked for after all. */
  const why = (reg: string, r: Looked) => {
    if (r.kind === "unknown") return `${reg} isn't on the UK register. If it should be, please check it. If not, tell us where it's registered.`;
    if (r.kind === "down") return "We couldn't check that registration just now, so please tell us about the car.";
    const car = [r.vehicle.colour, r.vehicle.year, r.vehicle.make].filter(Boolean).join(" ");
    return `We found your car${car ? ` (${car})` : ""}, but not which model it is.`;
  };

  // Photos: how many were picked, and whether they can be sent.
  const photos = field("photos");
  const photoProblem = () => {
    const files = [...(photos.files ?? [])];
    if (files.length > Number(form.dataset.maxPhotos)) return `Up to ${form.dataset.maxPhotos} photos, please`;
    if (files.some((f) => !f.type.startsWith("image/"))) return "Photos only, please";
    if (files.some((f) => f.size > Number(form.dataset.maxBytes))) return "Each photo must be under 15 MB";
    return "";
  };
  photos.addEventListener("change", () => {
    const n = photos.files?.length ?? 0;
    $("[data-photo-count]").textContent = n ? `${n} photo${n === 1 ? "" : "s"} added` : "Choose photos";
    say("photos", photoProblem());
  });

  // The server's checks (src/lib/leads.ts), made first here: sending a form
  // back would lose the photos.
  const problems: Record<string, () => string> = {
    make: () => (val("make") ? "" : "Enter the make"),
    model: () => (val("model") ? "" : "Enter the model"),
    year: () => (!val("year") || /^(19|20)\d\d$/.test(val("year")) ? "" : "Enter a year like 2015"),
    mileage: () => (!val("mileage") || /^[\d,. ]+$/.test(val("mileage")) ? "" : "Numbers only"),
    name: () => (val("name") ? "" : "Enter your name"),
    email: () => (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val("email")) ? "" : "Enter an email address like you@example.com"),
    phone: () => (!val("phone") || /^[\d\s()+-]{6,}$/.test(val("phone")) ? "" : "Enter a phone number, or leave it blank"),
    photos: photoProblem,
  };
  for (const id of Object.keys(problems)) if (id !== "photos") field(id).addEventListener("input", () => say(id));

  /** Goes to the first field with a message, opening its section if it's closed. */
  const toFirstProblem = () => {
    const first = form.querySelector<HTMLElement>('[aria-invalid="true"]');
    first?.closest("details")?.setAttribute("open", "");
    first?.focus();
  };
  /** Marks every field that needs attention; true when there are none. */
  const check = () => {
    const wrong = Object.keys(problems).filter((id) => {
      const text = problems[id]();
      say(id, text);
      return text;
    });
    if (wrong.length) toFirstProblem();
    return !wrong.length;
  };
  /** The form is on its way. */
  const sending = () => {
    if (place("Not registered").checked) field("reg").value = "";
    sendBtn.disabled = true;
    sendBtn.textContent = "Sending…";
  };
  // Back to this page after sending: the button works again.
  window.addEventListener("pageshow", () => {
    sendBtn.disabled = false;
    sendBtn.textContent = "Get my free valuation";
  });

  return { $, field, out, place, tidy, say, note, lookUp, fill, forget, facts, why, check, toFirstProblem, sending, canLookUp: form.dataset.lookup === "on" };
}
