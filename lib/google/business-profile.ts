// lib/google/business-profile.ts
/**
 * Google Business Profile API v1 클라이언트
 * 
 * API Docs: https://developers.google.com/my-business/reference/accountmanagement/rest
 */

export interface GoogleAccount {
  name: string;              // "accounts/123456789"
  accountName: string;       // "My Business"
  type: string;              // "PERSONAL" | "ORGANIZATION"
  state: {
    status: string;          // "VERIFIED"
  };
}

export interface GoogleLocation {
  name: string;              // "locations/987654321"
  title: string;             // "Sunny Nails Downtown"
  storefrontAddress?: {
    regionCode: string;
    languageCode: string;
    postalCode: string;
    administrativeArea: string;
    locality: string;
    addressLines: string[];
  };
  primaryCategory?: {
    name: string;            // "gcid:nail_salon"
    displayName: string;     // "Nail salon"
  };
  websiteUri?: string;
  phoneNumbers?: {
    primaryPhone: string;
  };
}

/**
 * Google Business Profile에서 계정 목록 가져오기
 */
export async function fetchGoogleAccounts(
  accessToken: string
): Promise<GoogleAccount[]> {
  const response = await fetch(
    "https://mybusinessaccountmanagement.googleapis.com/v1/accounts",
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to fetch accounts: ${response.status} ${errorText}`);
  }

  const data = await response.json();
  return data.accounts || [];
}

/**
 * 특정 계정의 location 목록 가져오기
 */
export async function fetchGoogleLocations(
  accessToken: string,
  accountName: string
): Promise<GoogleLocation[]> {
  // accountName = "accounts/123456789"
  const response = await fetch(
    `https://mybusinessbusinessinformation.googleapis.com/v1/${accountName}/locations?readMask=name,title,storefrontAddress,primaryCategory`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to fetch locations: ${response.status} ${errorText}`);
  }

  const data = await response.json();
  return data.locations || [];
}

/**
 * Location 주소를 간단한 문자열로 변환
 */
export function formatAddress(location: GoogleLocation): string {
  const addr = location.storefrontAddress;
  if (!addr) return "No address";

  const parts = [
    ...(addr.addressLines || []),
    addr.locality,
    addr.administrativeArea,
    addr.postalCode,
  ].filter(Boolean);

  return parts.join(", ");
}