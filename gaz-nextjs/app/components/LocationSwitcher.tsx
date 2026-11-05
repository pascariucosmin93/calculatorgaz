"use client";

import Link from "next/link";
import { LocationItem } from "@/lib/types";

export function LocationSwitcher({
  locations,
  activeId,
  onSelect
}: {
  locations: LocationItem[];
  activeId: string;
  onSelect: (id: string) => void;
}) {
  if (locations.length < 2) return null;
  return (
    <div className="location-switcher">
      <label>
        <span className="eyebrow">LOCAȚIE</span>
        <select value={activeId} onChange={(event) => onSelect(event.target.value)} aria-label="Alege locația">
          {locations.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
        </select>
      </label>
      <Link className="text-link" href="/cont">Gestionează locațiile →</Link>
    </div>
  );
}
