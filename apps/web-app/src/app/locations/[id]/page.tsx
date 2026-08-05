"use client";

import { type LocationDTO, apiClient } from "@/lib/api-client";
import { useParams } from "next/navigation";
import React, { useEffect, useState } from "react";

export default function LocationDetailPage() {
  const params = useParams();
  const locationId = params.id as string;

  const [location, setLocation] = useState<LocationDTO | null>(null);
  const [children, setChildren] = useState<LocationDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadLocationData = async () => {
      try {
        setLoading(true);
        setError(null);
        const [lData, cData] = await Promise.all([
          apiClient.getLocationById(locationId),
          apiClient.getChildLocations(locationId),
        ]);
        setLocation(lData);
        setChildren(cData);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        setLoading(false);
      }
    };

    if (locationId) {
      loadLocationData();
    }
  }, [locationId]);

  if (loading) {
    return <div className="p-8 text-center text-slate-500">Loading Location Detail...</div>;
  }

  if (!location) {
    return <div className="p-8 text-center text-rose-400">Location not found.</div>;
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="border-b border-slate-800 pb-6 flex items-center justify-between">
        <div>
          <div className="flex items-center space-x-3">
            <h1 className="text-3xl font-extrabold text-white">{location.name}</h1>
            <span className="text-xs font-mono bg-indigo-950 text-indigo-300 px-2.5 py-1 rounded border border-indigo-800">
              {location.locationType}
            </span>
          </div>
          <p className="text-slate-400 text-sm mt-1">
            ID: {location.locationId} • Status: {location.canonStatus}
          </p>
        </div>
        <a
          href={`/universes/${location.universeId}`}
          className="text-xs text-slate-400 hover:text-white transition"
        >
          ← Back to Universe
        </a>
      </div>

      {error && (
        <div className="p-4 bg-rose-950/80 border border-rose-800 text-rose-300 rounded-lg text-sm">
          <strong>Error:</strong> {error}
        </div>
      )}

      {/* Children Section */}
      <section className="bg-slate-800/40 border border-slate-700/60 rounded-xl p-6 space-y-4">
        <h2 className="text-xl font-bold text-slate-100">
          Sub-Locations / Children ({children.length})
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {children.length === 0 ? (
            <p className="text-xs text-slate-500 py-4 text-center md:col-span-2">
              No child locations attached.
            </p>
          ) : (
            children.map((child) => (
              <a
                key={child.locationId}
                href={`/locations/${child.locationId}`}
                className="p-4 bg-slate-900/60 hover:bg-slate-900 border border-slate-800 rounded-lg block transition"
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-sm text-indigo-300">{child.name}</span>
                  <span className="text-xs bg-slate-800 text-slate-400 px-2 py-0.5 rounded font-mono">
                    {child.locationType}
                  </span>
                </div>
              </a>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
