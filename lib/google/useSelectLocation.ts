// lib/google/useSelectLocation.ts
/**
 * Google Location 선택 Hook
 */

import { useState } from "react";

interface SelectLocationParams {
  salonId: string;
  locationId: string;
  locationName?: string;
}

interface SelectLocationResult {
  salonId: string;
  locationId: string;
  locationName?: string;
}

export function useSelectLocation() {
  const [isSelecting, setIsSelecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectLocation = async (
    params: SelectLocationParams
  ): Promise<SelectLocationResult> => {
    try {
      setIsSelecting(true);
      setError(null);

      console.log("[useSelectLocation] Selecting location:", params);

      const response = await fetch("/api/google/select-location", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(params),
      });

      const data = await response.json();

      if (!response.ok || !data.ok) {
        throw new Error(data.error || "Failed to select location");
      }

      console.log("[useSelectLocation] Location selected:", data.data);

      return data.data;
    } catch (err: any) {
      console.error("[useSelectLocation] Error:", err);
      setError(err.message);
      throw err;
    } finally {
      setIsSelecting(false);
    }
  };

  return {
    selectLocation,
    isSelecting,
    error,
  };
}