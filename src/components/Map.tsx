import React, { useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";
import * as turf from "@turf/turf";

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_KEY || "";

interface MapProps {
  data: { Nom: string; Latitude: number; Longitude: number; Type: string }[];
  filterRadius: number | null;
  center: [number, number];
}

const Map: React.FC<MapProps> = ({ data, filterRadius, center }) => {
  const mapContainer = useRef<HTMLDivElement | null>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);

  useEffect(() => {
    if (!mapContainer.current) return;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/streets-v11",
      center: [2.35, 48.85],
      zoom: 12,
    });

    return () => map.current?.remove();
  }, []);

  useEffect(() => {
    if (map.current && center) {
      map.current.flyTo({
        center,
        zoom: 14,
        essential: true,
      });
    }
  }, [center]);

  useEffect(() => {
    if (!map.current) return;

    // Supprimer les anciens marqueurs
    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current = [];

    // Ajouter les nouveaux marqueurs
    data.forEach((item) => {
      let color;
      switch (item.Type) {
        case "Client":
          color = "#10B981";
          break;
        case "Prospect":
          color = "#F59E0B";
          break;
        default:
          color = "#9CA3AF";
      }

      const marker = new mapboxgl.Marker({ color })
        .setLngLat([item.Longitude, item.Latitude])
        .setPopup(
          new mapboxgl.Popup({ offset: 25 }).setHTML(
            `<div class="popup-content">
              <strong>${item.Nom}</strong><br>
              Type: ${item.Type || "Non marqué"}
            </div>`
          )
        )
        .addTo(map.current!);

      markersRef.current.push(marker);
    });
  }, [data]);

  // Ajouter ou mettre à jour le cercle de rayon
  useEffect(() => {
    if (!map.current || !filterRadius || !center) return;

    const circleId = "search-radius-circle";

    // Supprimer le cercle existant s'il existe
    if (map.current.getLayer(circleId)) {
      map.current.removeLayer(circleId);
    }
    if (map.current.getSource(circleId)) {
      map.current.removeSource(circleId);
    }

    // Créer un cercle GeoJSON avec Turf.js
    const circle = turf.circle(center, filterRadius, {
      steps: 64,
      units: "kilometers",
    });

    // Ajouter la source et la couche pour le cercle
    map.current.addSource(circleId, {
      type: "geojson",
      data: circle,
    });

    map.current.addLayer({
      id: circleId,
      type: "fill",
      source: circleId,
      layout: {},
      paint: {
        "fill-color": "#1D4ED8",
        "fill-opacity": 0.2,
      },
    });
  }, [filterRadius, center]);

  return <div ref={mapContainer} className="mapbox-container" />;
};

export default Map;
