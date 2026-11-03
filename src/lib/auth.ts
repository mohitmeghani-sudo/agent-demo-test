import { createHash, timingSafeEqual } from "node:crypto";

function sha256(value: string) {
  return createHash("sha256").update(value).digest();
}

/** Checks the x-access-code header against APP_ACCESS_CODE. Fails closed in production. */
export function isAuthorized(request: Request): boolean {
  const expected = process.env.APP_ACCESS_CODE;
  if (!expected) return process.env.NODE_ENV !== "production";
  const provided = request.headers.get("x-access-code") ?? "";
  return timingSafeEqual(sha256(provided), sha256(expected));
}
