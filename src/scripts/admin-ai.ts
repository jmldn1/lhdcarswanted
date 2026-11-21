// Calls the admin's AI endpoint (src/pages/admin/ai.ts). Throws an Error
// whose message is fit to show the admin.
export async function askAi<T = Record<string, unknown>>(payload: Record<string, unknown>): Promise<T> {
  let res: Response;
  try {
    res = await fetch("/admin/ai", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  } catch {
    throw new Error("No connection. Please try again.");
  }
  if (res.status === 401) throw new Error("You've been signed out. Sign in again in another tab, then try again.");
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Something went wrong. Please try again.");
  return data as T;
}

/** Runs `work` with the button busy ("Writing…") and the outcome in `status`. */
export async function busy(btn: HTMLButtonElement, label: string, status: HTMLElement, work: () => Promise<string | void>) {
  const text = btn.querySelector<HTMLElement>(".ai-label") ?? btn;
  const before = text.textContent;
  btn.disabled = true;
  btn.setAttribute("aria-busy", "true");
  text.textContent = label;
  status.textContent = "";
  status.classList.remove("a-err");
  try {
    status.textContent = (await work()) ?? "";
  } catch (e) {
    status.textContent = e instanceof Error ? e.message : String(e);
    status.classList.add("a-err");
  } finally {
    btn.disabled = false;
    btn.removeAttribute("aria-busy");
    text.textContent = before;
  }
}
