// lib/google/locations.ts
/**
 * Google Business Profile Locations 유틸리티
 * 
 * Salon의 Google 연결을 통해 해당 계정의 모든 location(매장) 목록을 가져옵니다.
 */

import { SupabaseClient } from "@supabase/supabase-js";

export interface GoogleLocationSummary {
  locationId: string;      // GBP 리소스 name (예: "accounts/123/locations/456")
  locationName: string;    // 사람용 이름 (title/storefrontName)
  address?: string;        // 포맷된 주소
  primaryCategory?: string; // 카테고리명
  placeId?: string;        // Google Place ID (중요!)
}

export class GoogleLocationsError extends Error {
  code: string;
  
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
    this.name = "GoogleLocationsError";
  }
}

/**
 * Salon의 Google Business Profile locations 가져오기
 */
export async function getGoogleLocationsForSalon(
  supabaseAdmin: SupabaseClient,
  salonId: string
): Promise<GoogleLocationSummary[]> {
  console.log("[getGoogleLocationsForSalon] Starting for salonId:", salonId);

  // 1. salon_google_connections 조회
  const { data: connection, error: connectionError } = await supabaseAdmin
    .from("salon_google_connections")
    .select(
      `
      *,
      google_account:google_accounts(*)
    `
    )
    .eq("salon_id", salonId)
    .maybeSingle();

  if (connectionError) {
    console.error("[getGoogleLocationsForSalon] Connection query error:", connectionError);
    throw new GoogleLocationsError(
      "DB_ERROR",
      "Failed to query Google connection"
    );
  }

  if (!connection || !connection.google_account) {
    throw new GoogleLocationsError(
      "NO_GOOGLE_CONNECTION",
      "Google account not connected for this salon"
    );
  }

  const googleAccount = connection.google_account as any;
  const accountId = googleAccount.id;
  const tokens = googleAccount.tokens;

  if (!tokens || !tokens.access_token || !tokens.refresh_token) {
    throw new GoogleLocationsError(
      "INVALID_TOKENS",
      "Google tokens not found or invalid"
    );
  }

  // 2. Access token 유효성 확인 및 갱신
  const accessToken = await ensureValidAccessToken(
    supabaseAdmin,
    accountId,
    tokens
  );

  // 3. Google Business Profile API로 계정 목록 가져오기
  console.log("[getGoogleLocationsForSalon] Fetching Google accounts...");

  const accountsResponse = await fetch(
    "https://mybusinessaccountmanagement.googleapis.com/v1/accounts",
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    }
  );

  if (!accountsResponse.ok) {
    const errorText = await accountsResponse.text();
    console.error("[getGoogleLocationsForSalon] Accounts API error:", errorText);
    throw new GoogleLocationsError(
      "GOOGLE_API_ERROR",
      `Failed to fetch Google accounts: ${accountsResponse.status}`
    );
  }

  const accountsData = await accountsResponse.json();
  const accounts = accountsData.accounts || [];

  if (accounts.length === 0) {
    throw new GoogleLocationsError(
      "NO_ACCOUNTS",
      "No Google Business accounts found"
    );
  }

  console.log(`[getGoogleLocationsForSalon] Found ${accounts.length} account(s)`);

  // 4. 각 계정의 location 목록 가져오기
  const allLocations: GoogleLocationSummary[] = [];

  for (const account of accounts) {
    const accountName = account.name; // 예: "accounts/123456789"

    console.log(`[getGoogleLocationsForSalon] Fetching locations for ${accountName}...`);

    const locationsResponse = await fetch(
      `https://mybusinessbusinessinformation.googleapis.com/v1/${accountName}/locations?readMask=name,title,storefrontAddress,categories,metadata`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (!locationsResponse.ok) {
      const errorText = await locationsResponse.text();
      console.error(`[getGoogleLocationsForSalon] Locations API error for ${accountName}:`, errorText);
      // 이 계정은 스킵하고 다음으로
      continue;
    }

    const locationsData = await locationsResponse.json();
    const locations = locationsData.locations || [];

    console.log(`[getGoogleLocationsForSalon] Found ${locations.length} location(s) in ${accountName}`);

    // 5. GoogleLocationSummary로 변환
    for (const location of locations) {
      const summary: GoogleLocationSummary = {
        locationId: location.name, // 예: "accounts/123/locations/456"
        locationName: location.title || location.storefrontAddress?.addressLines?.[0] || "Unnamed Location",
        address: formatAddress(location.storefrontAddress),
        primaryCategory: location.categories?.primaryCategory?.displayName || undefined,
        placeId: location.metadata?.placeId || undefined,
      };

      allLocations.push(summary);
    }
  }

  console.log(`[getGoogleLocationsForSalon] Total locations found: ${allLocations.length}`);

  return allLocations;
}

/* ===== Helper Functions ===== */

/**
 * Access token 유효성 확인 및 갱신
 */
async function ensureValidAccessToken(
  supabaseAdmin: SupabaseClient,
  accountId: string,
  tokens: any
): Promise<string> {
  const { access_token, refresh_token, expires_at } = tokens;

  // 만료 체크 (여유있게 5분 전에 갱신)
  const expiresAt = new Date(expires_at).getTime();
  const now = Date.now();
  const fiveMinutes = 5 * 60 * 1000;

  if (expiresAt - now > fiveMinutes) {
    // 아직 유효함
    console.log("[ensureValidAccessToken] Token still valid");
    return access_token;
  }

  console.log("[ensureValidAccessToken] Token expired or expiring soon, refreshing...");

  // Token 갱신
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      refresh_token: refresh_token,
      grant_type: "refresh_token",
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("[ensureValidAccessToken] Token refresh failed:", errorText);
    throw new GoogleLocationsError(
      "TOKEN_REFRESH_FAILED",
      "Failed to refresh Google access token"
    );
  }

  const data = await response.json();

  // 새 토큰 저장
  const newTokens = {
    ...tokens,
    access_token: data.access_token,
    expires_at: new Date(Date.now() + data.expires_in * 1000).toISOString(),
  };

  await supabaseAdmin
    .from("google_accounts")
    .update({ 
      tokens: newTokens, 
      updated_at: new Date().toISOString() 
    })
    .eq("id", accountId);

  console.log("[ensureValidAccessToken] Token refreshed successfully");

  return data.access_token;
}

/**
 * 주소 포맷팅
 */
function formatAddress(address: any): string | undefined {
  if (!address) return undefined;

  const parts: string[] = [];

  // addressLines (거리 주소)
  if (address.addressLines && address.addressLines.length > 0) {
    parts.push(...address.addressLines);
  }

  // locality (도시)
  if (address.locality) {
    parts.push(address.locality);
  }

  // administrativeArea (주/도)
  if (address.administrativeArea) {
    parts.push(address.administrativeArea);
  }

  // postalCode (우편번호)
  if (address.postalCode) {
    parts.push(address.postalCode);
  }

  // regionCode (국가)
  if (address.regionCode) {
    parts.push(address.regionCode);
  }

  return parts.length > 0 ? parts.join(", ") : undefined;
}