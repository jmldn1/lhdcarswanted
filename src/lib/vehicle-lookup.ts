// Looks up a UK registration, as AutoGalleria's landing pages do: the DVLA's
// Vehicle Enquiry Service (make, year, colour, fuel, engine, MOT status) and
// the DVSA's MOT history (the model, and the mileage at the last test), asked
// at the same time. Results are kept for 5 minutes and two lookups of the same
// registration at once share one request.
//
// Settings (.env): DVLA_API_KEY; MOT_API_KEY, DVSA_TENANT_ID, DVSA_CLIENT_ID,
// DVSA_CLIENT_SECRET. Without the DVLA key the lookup is off and the landing
// pages show the full form instead.
import "./env.ts";
import { nice } from "./cars.ts";

export interface Vehicle {
  reg: string;
  year?: string;
  make?: string;
  model?: string;
  colour?: string;
  fuel?: string;
  /** cc */
  engine?: number;
  motStatus?: string;
  /** At the last MOT test: "16,800 miles". */
  lastMileage?: string;
}

export const lookupReady = () => Boolean(process.env.DVLA_API_KEY);

const DVLA_URL = "https://driver-vehicle-licensing.api.gov.uk/vehicle-enquiry/v1/vehicles";
const MOT_URL = "https://history.mot.api.gov.uk/v1/trade/vehicles/registration/";
const TIMEOUT = 8000;

/** "lx59 abc" → "LX59ABC"; undefined if it can't be a registration. */
export function cleanReg(reg: string): string | undefined {
  const r = reg.toUpperCase().replace(/[\s-]+/g, "");
  return /^[A-Z0-9]{2,8}$/.test(r) ? r : undefined;
}

async function fetchJson(url: string, init: RequestInit): Promise<{ ok: boolean; status: number; data: any }> {
  const res = await fetch(url, { ...init, signal: AbortSignal.timeout(TIMEOUT) });
  const data = await res.json().catch(() => null);
  return { ok: res.ok, status: res.status, data };
}

let motToken: { value: string; expires: number } | undefined;
async function getMotToken(): Promise<string | undefined> {
  if (motToken && Date.now() < motToken.expires) return motToken.value;
  const { DVSA_TENANT_ID: tenant, DVSA_CLIENT_ID: id, DVSA_CLIENT_SECRET: secret } = process.env;
  if (!tenant || !id || !secret) return undefined;
  const body = new URLSearchParams({ grant_type: "client_credentials", client_id: id, client_secret: secret, scope: "https://tapi.dvsa.gov.uk/.default" });
  const r = await fetchJson(`https://login.microsoftonline.com/${tenant}/oauth2/v2.0/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!r.ok || !r.data?.access_token) {
    console.error(`MOT sign-in failed (${r.status})`);
    return undefined;
  }
  motToken = { value: r.data.access_token, expires: Date.now() + ((Number(r.data.expires_in) || 3600) - 60) * 1000 };
  return motToken.value;
}

async function dvla(reg: string) {
  const r = await fetchJson(DVLA_URL, {
    method: "POST",
    headers: { "x-api-key": process.env.DVLA_API_KEY ?? "", "Content-Type": "application/json" },
    body: JSON.stringify({ registrationNumber: reg }),
  });
  // 404: not on the register; 400: not even a UK format (a foreign plate). Both: not found.
  if (r.status === 404 || r.status === 400) return null;
  if (!r.ok) throw new Error(`DVLA lookup failed (${r.status})`);
  return r.data;
}

async function mot(reg: string) {
  try {
    const token = await getMotToken();
    if (!token || !process.env.MOT_API_KEY) return null;
    const r = await fetchJson(MOT_URL + reg, {
      headers: { Authorization: `Bearer ${token}`, "X-API-Key": process.env.MOT_API_KEY, Accept: "application/json" },
    });
    return r.ok ? r.data : null;
  } catch {
    return null; // The model is a nice-to-have: the DVLA's answer is enough.
  }
}

async function lookup(reg: string): Promise<Vehicle | null> {
  const [d, m] = await Promise.all([dvla(reg), mot(reg)]);
  if (!d) return null;
  const tests: any[] = Array.isArray(m?.motTests) ? [...m.motTests] : [];
  tests.sort((a, b) => String(b.completedDate).localeCompare(String(a.completedDate)));
  const last = tests.find((t) => t.odometerValue && t.odometerResultType !== "NO_ODOMETER");
  const miles = last && Number(last.odometerValue);
  return {
    reg,
    year: d.yearOfManufacture ? String(d.yearOfManufacture) : undefined,
    make: d.make ? nice(String(d.make)) : undefined,
    model: m?.model && m.model !== "UNKNOWN" ? nice(String(m.model)) : undefined,
    colour: d.colour ? nice(String(d.colour)) : undefined,
    fuel: d.fuelType ? nice(String(d.fuelType)) : undefined,
    engine: Number(d.engineCapacity) || undefined,
    motStatus: d.motStatus || undefined,
    lastMileage: miles ? `${miles.toLocaleString("en-GB")} ${last.odometerUnit === "KM" ? "km" : "miles"}` : undefined,
  };
}

const cache = new Map<string, { at: number; v: Vehicle | null }>();
const inFlight = new Map<string, Promise<Vehicle | null>>();

/** The car, or null when the DVLA doesn't know the registration. Throws when the lookup itself fails. */
export async function lookupReg(reg: string): Promise<Vehicle | null> {
  const hit = cache.get(reg);
  if (hit && Date.now() - hit.at < 5 * 60 * 1000) return hit.v;
  let p = inFlight.get(reg);
  if (!p) {
    p = lookup(reg).finally(() => inFlight.delete(reg));
    inFlight.set(reg, p);
  }
  const v = await p;
  cache.set(reg, { at: Date.now(), v });
  if (cache.size > 500) cache.delete(cache.keys().next().value!);
  return v;
}

/** One line for the lead: "2010 Porsche 911 GT3 RS · White · Petrol · 3,797 cc · MOT Valid · last MOT 16,800 miles". */
export function vehicleSummary(v: Vehicle): string {
  return [
    [v.year, v.make, v.model].filter(Boolean).join(" "),
    v.colour,
    v.fuel,
    v.engine && `${v.engine.toLocaleString("en-GB")} cc`,
    v.motStatus && `MOT ${v.motStatus}`,
    v.lastMileage && `last MOT ${v.lastMileage}`,
  ]
    .filter(Boolean)
    .join(" · ");
}
