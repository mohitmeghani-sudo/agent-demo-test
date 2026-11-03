import { isAuthorized } from "@/lib/auth";
import { DEFAULT_AD_ACCOUNT_ID, fetchLiveAds } from "@/lib/live-ads";

export const maxDuration = 60;

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return new Response("Unauthorized", { status: 401 });
  }

  const accountId =
    new URL(request.url).searchParams.get("accountId") ?? DEFAULT_AD_ACCOUNT_ID;

  try {
    const data = await fetchLiveAds(accountId);
    return Response.json(data, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return Response.json({ error: message }, { status: 502 });
  }
}
