"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AuthUser, LocationItem } from "@/lib/types";
import { requestJson } from "@/lib/api-client";
import { csrfHeaders } from "./useAuth";

const getActiveKey = (userId: string) => `gaz-calculator:active-location:${userId}`;

type LocationInput = { name?: string; address?: string; meterSerial?: string };

export function useLocations(user: AuthUser | null) {
  const [locations, setLocations] = useState<LocationItem[]>([]);
  const [activeId, setActiveId] = useState("");
  const [loaded, setLoaded] = useState(false);

  const refresh = useCallback(async () => {
    if (!user?.id) {
      setLocations([]);
      setActiveId("");
      setLoaded(false);
      return;
    }
    try {
      const list = await requestJson<LocationItem[]>("/api/locations", { cache: "no-store" }, "Nu am putut încărca locațiile.");
      setLocations(list);
      setActiveId((current) => {
        if (list.some((item) => item.id === current)) return current;
        let saved = "";
        try { saved = localStorage.getItem(getActiveKey(user.id)) ?? ""; } catch { /* storage blocat */ }
        return list.find((item) => item.id === saved)?.id ?? list.find((item) => item.isDefault)?.id ?? list[0]?.id ?? "";
      });
    } catch {
      setLocations([]);
    } finally {
      setLoaded(true);
    }
  }, [user?.id]);

  useEffect(() => { void refresh(); }, [refresh]);

  const selectLocation = useCallback((id: string) => {
    setActiveId(id);
    if (!user?.id) return;
    try { localStorage.setItem(getActiveKey(user.id), id); } catch { /* storage blocat */ }
  }, [user?.id]);

  const createLocation = useCallback(async (input: LocationInput) => {
    const created = await requestJson<LocationItem>(
      "/api/locations",
      { method: "POST", headers: { "Content-Type": "application/json", ...csrfHeaders() }, body: JSON.stringify(input) },
      "Nu am putut adăuga locația."
    );
    await refresh();
    selectLocation(created.id);
  }, [refresh, selectLocation]);

  const updateLocation = useCallback(async (id: string, input: LocationInput) => {
    await requestJson(
      `/api/locations/${encodeURIComponent(id)}`,
      { method: "PATCH", headers: { "Content-Type": "application/json", ...csrfHeaders() }, body: JSON.stringify(input) },
      "Nu am putut salva locația."
    );
    await refresh();
  }, [refresh]);

  const deleteLocation = useCallback(async (id: string) => {
    await requestJson(
      `/api/locations/${encodeURIComponent(id)}`,
      { method: "DELETE", headers: csrfHeaders() },
      "Nu am putut șterge locația."
    );
    if (id === activeId) setActiveId("");
    await refresh();
  }, [activeId, refresh]);

  const active = useMemo(() => locations.find((item) => item.id === activeId) ?? null, [locations, activeId]);

  return { locations, active, loaded, selectLocation, createLocation, updateLocation, deleteLocation, refresh };
}
