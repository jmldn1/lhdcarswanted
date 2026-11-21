// Alt text for car photos (what each shows), written by the AI in the
// background: for each photo as it becomes web-ready, and on the admin's
// "Describe the photos" button for photos that have none. One photo at a
// time, in this process; a photo that fails keeps no alt text and is tried
// again next time. Does nothing when AI isn't set up (src/lib/ai.ts).
import { adminCar, setPhotoAlt } from "./cars.ts";
import { aiReady, photoAlt } from "./ai.ts";

const queue = new Set<string>();
let running = false;

/** Queues a car's photos without alt text; returns how many there are now. */
export async function describeLater(carId: string): Promise<number> {
  if (!aiReady()) return 0;
  const car = await adminCar(carId);
  const missing = car?.photos.filter((p) => !p.alt).length ?? 0;
  if (!missing) return 0;
  queue.add(carId);
  if (!running) {
    running = true;
    run()
      .catch((e) => console.error("photo alt text:", e instanceof Error ? e.message : e))
      .finally(() => {
        running = false;
      });
  }
  return missing;
}

async function run() {
  for (const carId of queue) {
    queue.delete(carId);
    const car = await adminCar(carId);
    for (const photo of car?.photos.filter((p) => !p.alt) ?? []) {
      try {
        await setPhotoAlt(carId, photo.id, await photoAlt(car!, photo));
      } catch (e) {
        console.error(`alt text for photo ${photo.id} of ${carId}:`, e instanceof Error ? e.message : e);
        // The day's limit, or no key or a rejected one: stop until asked again.
        if (!aiReady() || /daily limit|isn't accepted|isn't set up|no credit/.test(String(e))) {
          queue.clear();
          return;
        }
      }
    }
  }
}
