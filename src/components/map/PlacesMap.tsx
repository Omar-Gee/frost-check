"use client";

import { useEffect, useMemo } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import Link from "next/link";
import { haversineKm } from "@/lib/db/geo";
import { formatDistanceKm, scoreToColor } from "@/lib/utils";
import type { PlaceWithScore } from "@/lib/places/queries";
import "leaflet/dist/leaflet.css";

interface PlacesMapProps {
  places: PlaceWithScore[];
  center: [number, number];
  userLocation: { lat: number; lng: number };
  zoom?: number;
  onBoundsChange?: (bounds: {
    minLat: number;
    maxLat: number;
    minLng: number;
    maxLng: number;
  }) => void;
}

function createColoredIcon(color: string) {
  return L.divIcon({
    className: "custom-marker",
    html: `<div style="background:${color};width:14px;height:14px;border-radius:50%;border:2px solid white;box-shadow:0 1px 4px rgba(0,0,0,0.4)"></div>`,
    iconSize: [14, 14],
    iconAnchor: [7, 7],
  });
}

function MapCenterUpdater({
  center,
  zoom,
}: {
  center: [number, number];
  zoom: number;
}) {
  const map = useMap();
  const [lat, lng] = center;

  useEffect(() => {
    map.flyTo([lat, lng], zoom, { duration: 0.6 });
  }, [map, lat, lng, zoom]);

  return null;
}

function MapResizeFix() {
  const map = useMap();

  useEffect(() => {
    const timer = window.setTimeout(() => {
      map.invalidateSize();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [map]);

  return null;
}

function MapBoundsListener({
  onBoundsChange,
}: {
  onBoundsChange?: PlacesMapProps["onBoundsChange"];
}) {
  const map = useMap();

  useEffect(() => {
    if (!onBoundsChange) return;

    function reportBounds() {
      if (!onBoundsChange) return;
      const b = map.getBounds();
      onBoundsChange({
        minLat: b.getSouth(),
        maxLat: b.getNorth(),
        minLng: b.getWest(),
        maxLng: b.getEast(),
      });
    }

    map.on("moveend", reportBounds);
    reportBounds();

    return () => {
      map.off("moveend", reportBounds);
    };
  }, [map, onBoundsChange]);

  return null;
}

export function PlacesMap({
  places,
  center,
  userLocation,
  zoom = 14,
  onBoundsChange,
}: PlacesMapProps) {
  const markers = useMemo(
    () =>
      places.map((place) => {
        const distanceKm =
          place.distanceKm ??
          haversineKm(userLocation, { lat: place.lat, lng: place.lng });

        return {
          place,
          distanceKm,
          icon: createColoredIcon(scoreToColor(place.score.displayScore)),
        };
      }),
    [places, userLocation]
  );

  return (
    <div className="h-[400px] w-full overflow-hidden rounded-xl border border-frost-200">
      <MapContainer
        center={center}
        zoom={zoom}
        className="h-full w-full"
        scrollWheelZoom
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
          maxZoom={19}
        />
        <MapResizeFix />
        <MapCenterUpdater center={center} zoom={zoom} />
        <MapBoundsListener onBoundsChange={onBoundsChange} />
        {markers.map(({ place, distanceKm, icon }) => (
          <Marker key={place.id} position={[place.lat, place.lng]} icon={icon}>
            <Popup>
              <div className="space-y-1">
                <p className="font-semibold">{place.name}</p>
                <p className="text-sm text-frost-600">
                  {formatDistanceKm(distanceKm)} away
                </p>
                <p className="text-sm">
                  AC-score:{" "}
                  {place.score.displayScore != null
                    ? Math.round(place.score.displayScore)
                    : "—"}{" "}
                  ({place.score.label})
                </p>
                <Link
                  href={`/place/${encodeURIComponent(place.id)}`}
                  className="text-sm text-frost-600 underline"
                >
                  View details
                </Link>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
