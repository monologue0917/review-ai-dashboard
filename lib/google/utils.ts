// lib/google/utils.ts
/**
 * Google OAuth Token 관리 유틸리티
 */

import { SupabaseClient } from "@supabase/supabase-js";

export interface GoogleTokens {
  access_token: string;
  refresh_token: string;
  expires_at: string;
  scope: string;
}

/**
 * Access token이 만료되었는지 확인 (5분 여유)
 */
export function isTokenExpired(expiresAt: string): boolean {
  const expiresAtTime = new Date(expiresAt).getTime();
  const now = Date.now();
  const fiveMinutes = 5 * 60 * 1000;
  
  return expiresAtTime - now < fiveMinutes;
}

/**
 * Access token 갱신
 */
export async function refreshGoogleAccessToken(
  refreshToken: string
): Promise<{
  access_token: string;
  expires_in: number;
}> {
  const clientId = process.env.GOOGLE_CLIENT_ID!;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET!;

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to refresh token: ${errorText}`);
  }

  const data = await response.json();
  return {
    access_token: data.access_token,
    expires_in: data.expires_in,
  };
}

/**
 * Google 토큰 가져오기 (필요시 자동 갱신)
 */
export async function ensureValidGoogleToken(
  supabase: SupabaseClient,
  googleAccountId: string
): Promise<string> {
  // 1. google_accounts에서 tokens 조회
  const { data: account, error } = await supabase
    .from("google_accounts")
    .select("tokens")
    .eq("id", googleAccountId)
    .single();

  if (error || !account) {
    throw new Error("Google account not found");
  }

  const tokens = account.tokens as GoogleTokens;

  if (!tokens?.access_token || !tokens?.refresh_token) {
    throw new Error("Invalid tokens in google_accounts");
  }

  // 2. 만료 체크
  if (!isTokenExpired(tokens.expires_at)) {
    // 아직 유효함
    return tokens.access_token;
  }

  // 3. 토큰 갱신
  console.log("[ensureValidGoogleToken] Token expired, refreshing...");

  const refreshed = await refreshGoogleAccessToken(tokens.refresh_token);

  // 4. DB 업데이트
  const newTokens: GoogleTokens = {
    ...tokens,
    access_token: refreshed.access_token,
    expires_at: new Date(
      Date.now() + refreshed.expires_in * 1000
    ).toISOString(),
  };

  const { error: updateError } = await supabase
    .from("google_accounts")
    .update({
      tokens: newTokens,
      updated_at: new Date().toISOString(),
    })
    .eq("id", googleAccountId);

  if (updateError) {
    console.error("[ensureValidGoogleToken] Failed to update tokens:", updateError);
    throw new Error("Failed to update refreshed token");
  }

  console.log("[ensureValidGoogleToken] Token refreshed successfully");

  return refreshed.access_token;
}