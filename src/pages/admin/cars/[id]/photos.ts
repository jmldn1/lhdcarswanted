// A car's photos for the admin's edit page: GET says which are web-ready
// and which are still on the way; POST adds photos (one or more), which are
// made web-ready in the background.
import type { APIRoute } from "astro";
import { adminCar } from "../../../../lib/cars.ts";
import { checkUploads, queuePhotos, startPhotoWork } from "../../../../lib/photo-queue.ts";
import { pick } from "../../../../lib/photos.ts";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

async function state(id: string) {
  const car = await adminCar(id);
  if (!car) return null;
  return {
    photos: car.photos.map((p) => ({ id: p.id, thumb: pick(p.avif, 300).url })),
    pending: (car.pending ?? []).map((p) => ({ id: p.id, name: p.name })),
  };
}

export const GET: APIRoute = async ({ params }) => {
  const s = await state(params.id ?? "");
  if (!s) return json({ error: "No such car" }, 404);
  if (s.pending.length) startPhotoWork();
  return json(s);
};

export const POST: APIRoute = async ({ params, request }) => {
  const id = params.id ?? "";
  if (!(await adminCar(id))) return json({ error: "No such car" }, 404);
  if (Number(request.headers.get("content-length") ?? 0) > 40 * 1024 * 1024) return json({ error: "too big" }, 413);
  const form = await request.formData();
  const { ok, refused } = checkUploads(form.getAll("photos").filter((f): f is File => f instanceof File && f.size > 0));
  if (!ok.length) return json({ error: refused.join("; ") || "no photo" }, 400);
  await queuePhotos(id, ok);
  return json(await state(id));
};
