// app/components/auth/GoogleLocationSelector.tsx
"use client";

import React, { useState, useEffect } from "react";
import { useSelectLocation } from "@/lib/google/useSelectLocation";

export interface GoogleLocation {
  locationId: string;
  locationName: string;
  address?: string;
  primaryCategory?: string;
  placeId?: string;
}

interface GoogleLocationSelectorProps {
  salonId: string;
  selectedLocationId?: string;
  onSelect?: (locationId: string, locationName: string) => void;
}

export function GoogleLocationSelector({
  salonId,
  selectedLocationId,
  onSelect,
}: GoogleLocationSelectorProps) {
  const [locations, setLocations] = useState<GoogleLocation[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState(selectedLocationId || "");

  const { selectLocation, isSelecting } = useSelectLocation();

  useEffect(() => {
    loadLocations();
  }, [salonId]);

  useEffect(() => {
    setSelectedId(selectedLocationId || "");
  }, [selectedLocationId]);

  const loadLocations = async () => {
    try {
      setIsLoading(true);
      setError(null);

      console.log("[GoogleLocationSelector] Loading locations...");

      const response = await fetch(`/api/google/locations?salonId=${salonId}`);
      const data = await response.json();

      if (!response.ok || !data.ok) {
        throw new Error(data.error || "Failed to load locations");
      }

      console.log(`[GoogleLocationSelector] Loaded ${data.data.length} locations`);
      setLocations(data.data);
    } catch (err: any) {
      console.error("[GoogleLocationSelector] Error:", err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelect = async (locationId: string) => {
    const location = locations.find((loc) => loc.locationId === locationId);
    if (!location) return;

    try {
      console.log("[GoogleLocationSelector] Selecting location:", location);

      // DB에 저장
      await selectLocation({
        salonId,
        locationId: location.locationId,
        locationName: location.locationName,
      });

      setSelectedId(locationId);

      // 부모 컴포넌트에 알림 (optional)
      if (onSelect) {
        onSelect(location.locationId, location.locationName);
      }

      alert(`✅ Location selected: ${location.locationName}`);
    } catch (err: any) {
      alert(`❌ Failed to select location: ${err.message}`);
    }
  };

  if (isLoading) {
    return (
      <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-slate-600" />
          <p className="text-sm text-slate-600">Loading locations...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3">
        <p className="text-sm text-red-800">
          <strong>Error:</strong> {error}
        </p>
        <button
          type="button"
          onClick={loadLocations}
          className="mt-2 text-xs text-red-700 underline hover:text-red-800"
        >
          Try again
        </button>
      </div>
    );
  }

  if (locations.length === 0) {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
        <p className="text-sm text-amber-800">
          No locations found in your Google Business Profile.
        </p>
        <p className="mt-1 text-xs text-amber-700">
          Make sure you have at least one verified location in Google Business.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div>
        <label className="block text-sm font-medium text-slate-700">
          Select Location
        </label>
        <p className="mt-1 text-xs text-slate-500">
          Choose which location to sync reviews from
        </p>
      </div>

      <select
        value={selectedId}
        onChange={(e) => handleSelect(e.target.value)}
        disabled={isSelecting}
        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <option value="">-- Select a location --</option>
        {locations.map((location) => (
          <option key={location.locationId} value={location.locationId}>
            {location.locationName}
            {location.address && ` - ${location.address}`}
          </option>
        ))}
      </select>

      {isSelecting && (
        <div className="rounded-md bg-blue-50 px-3 py-2">
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 animate-spin rounded-full border-2 border-blue-300 border-t-blue-600" />
            <p className="text-xs text-blue-700">Saving...</p>
          </div>
        </div>
      )}

      {selectedId && !isSelecting && (
        <div className="rounded-md bg-emerald-50 px-3 py-2">
          <p className="text-xs text-emerald-700">
            ✓ Location selected and saved
          </p>
        </div>
      )}
    </div>
  );
}