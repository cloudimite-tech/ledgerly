import "server-only";
import type { NextRequest } from "next/server";

/**
 * Defense-in-depth for GET endpoints that return a file download rather than a page:
 * the session cookie (SameSite=Lax) already stops it being triggered from another
 * site's JS, but a plain cross-site link or <img>/<iframe> can still fire a
 * top-level or embedded GET. `Sec-Fetch-Site`, sent by all modern browsers, lets us
 * tell those apart from a real navigation or fetch made by our own pages.
 */
export function isCrossSiteRequest(req: NextRequest) {
  const site = req.headers.get("sec-fetch-site");
  return site === "cross-site";
}
