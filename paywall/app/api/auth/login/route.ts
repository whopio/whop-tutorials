import { NextResponse } from "next/server";
import {
  buildAuthorizeUrl,
  randomString,
  type PkceState,
} from "@/lib/whop-oauth";
import { setPkceCookie } from "@/lib/pkce-cookie";

export async function GET(): Promise<NextResponse> {
  const pkce: PkceState = {
    codeVerifier: randomString(32),
    state: randomString(16),
    nonce: randomString(16),
  };

  await setPkceCookie(pkce);
  const authorizeUrl = await buildAuthorizeUrl(pkce);
  return NextResponse.redirect(authorizeUrl);
}
