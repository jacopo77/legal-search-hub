"use client";

import { useState, useCallback } from "react";
import {
  GoogleMap,
  useJsApiLoader,
  Marker,
  InfoWindowF,
} from "@react-google-maps/api";
import { env } from "@/lib/env";

const MAP_CONTAINER_STYLE = {
  width: "100%",
  height: "300px",
};

const DEFAULT_CENTER = { lat: 33.4484, lng: -112.074 }; // Phoenix

export function FirmMap({
  address,
  firmName,
}: {
  address: string;
  firmName: string;
}) {
  const apiKey = env.googleMaps.apiKey();
  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: apiKey,
  });

  const [position, setPosition] =
    useState<google.maps.LatLngLiteral | null>(null);
  const [infoOpen, setInfoOpen] = useState(false);
  const [geocodeError, setGeocodeError] = useState(false);

  const handleMapLoad = useCallback(
    (_map: google.maps.Map) => {
      if (!address || !window.google) return;
      const geocoder = new window.google.maps.Geocoder();
      geocoder.geocode({ address }, (results, status) => {
        if (status === "OK" && results && results[0]) {
          const loc = results[0].geometry.location;
          setPosition({ lat: loc.lat(), lng: loc.lng() });
        } else {
          console.error("Geocoding failed:", status);
          setGeocodeError(true);
        }
      });
    },
    [address],
  );

  if (loadError || geocodeError) {
    return (
      <div className="mt-5 flex h-[300px] w-full items-center justify-center rounded-lg border border-border bg-muted text-sm text-muted-foreground">
        Map unavailable
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div className="mt-5 flex h-[300px] w-full items-center justify-center rounded-lg border border-border bg-muted text-sm text-muted-foreground">
        Loading map…
      </div>
    );
  }

  return (
    <div className="mt-5">
      <GoogleMap
        mapContainerStyle={MAP_CONTAINER_STYLE}
        center={position ?? DEFAULT_CENTER}
        zoom={15}
        onLoad={handleMapLoad}
      >
        {position && (
          <Marker
            position={position}
            onClick={() => setInfoOpen(true)}
          >
            {infoOpen && (
              <InfoWindowF
                position={position}
                onCloseClick={() => setInfoOpen(false)}
              >
                <div className="font-medium text-foreground">{firmName}</div>
              </InfoWindowF>
            )}
          </Marker>
        )}
      </GoogleMap>
    </div>
  );
}
