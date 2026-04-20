import type { ClickCounts } from "@click/shared";

const BASE = import.meta.env.VITE_API_URL || "";

async function request(path: string, init?: RequestInit): Promise<ClickCounts> {
  const res = await fetch(`${BASE}${path}`, {
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  if (!res.ok) throw new Error(`Request failed: ${res.status}`);
  return res.json();
}

export function getClicks(): Promise<ClickCounts> {
  return request("/api/clicks");
}

export function postClicks(count: number): Promise<ClickCounts> {
  return request("/api/clicks", {
    method: "POST",
    body: JSON.stringify({ count }),
  });
}
