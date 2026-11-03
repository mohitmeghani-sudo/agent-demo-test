const API_VERSION = process.env.META_API_VERSION ?? "v25.0";
const BASE_URL = `https://graph.facebook.com/${API_VERSION}`;

export function normalizeAccountId(id: string): string {
  const trimmed = id.trim();
  if (!/^(act_)?\d+$/.test(trimmed)) {
    throw new Error(`Invalid ad account ID: ${id}`);
  }
  return trimmed.startsWith("act_") ? trimmed : `act_${trimmed}`;
}

/** Ad accounts the agent may read. Empty means any account the token can see. */
export function allowedAccountIds(): string[] {
  return (process.env.META_AD_ACCOUNT_IDS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .map(normalizeAccountId);
}

export function assertAccountAllowed(accountId: string): string {
  const id = normalizeAccountId(accountId);
  const allowed = allowedAccountIds();
  if (allowed.length > 0 && !allowed.includes(id)) {
    throw new Error(
      `Ad account ${id} is not in META_AD_ACCOUNT_IDS. Allowed: ${allowed.join(", ")}`,
    );
  }
  return id;
}

type GraphResponse<T> = {
  data?: T[];
  paging?: { next?: string; cursors?: { after?: string } };
  error?: { message: string; code?: number; error_subcode?: number };
} & Record<string, unknown>;

/** GET against the Marketing API. The token goes in a header, never the URL. */
export async function metaGet<T = Record<string, unknown>>(
  path: string,
  params: Record<string, string | number | undefined> = {},
): Promise<GraphResponse<T>> {
  const token = process.env.META_ACCESS_TOKEN;
  if (!token) throw new Error("META_ACCESS_TOKEN is not set");

  const url = new URL(`${BASE_URL}/${path.replace(/^\//, "")}`);
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) url.searchParams.set(key, String(value));
  }

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  const json = (await res.json()) as GraphResponse<T>;

  if (!res.ok || json.error) {
    const e = json.error;
    throw new Error(
      `Meta API error${e?.code ? ` ${e.code}` : ""}: ${e?.message ?? res.statusText}`,
    );
  }
  return json;
}

/** Follows cursor pagination until exhausted or maxItems is reached. */
export async function metaGetAll<T = Record<string, unknown>>(
  path: string,
  params: Record<string, string | number | undefined> = {},
  maxItems = 500,
): Promise<{ items: T[]; truncated: boolean }> {
  const items: T[] = [];
  let after: string | undefined;
  for (;;) {
    const res = await metaGet<T>(path, { ...params, after });
    items.push(...(res.data ?? []));
    after = res.paging?.next ? res.paging.cursors?.after : undefined;
    if (!after) return { items, truncated: false };
    if (items.length >= maxItems) return { items, truncated: true };
  }
}
