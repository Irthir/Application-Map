import React, { useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";
import * as turf from "@turf/turf";

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_KEY || "";

interface MapProps {
  data: { Nom: string; Latitude: number; Longitude: number; Type: string }[];
  filterRadius: number | null;
  center: [number, number];
  onClickSetCenter: (lat: number, lng: number) => void;
}

const Map: React.FC<MapProps> = ({ data, filterRadius = 5, center, onClickSetCenter }) => {
  const mapContainer = useRef<HTMLDivElement | null>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);

  useEffect(() => {
    if (!mapContainer.current) return;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/streets-v11",
      center,
      zoom: 12,
    });

    map.current.on("click", (e) => {
      if (!map.current) return;

      const features = map.current.queryRenderedFeatures(e.point);
      const clickedOnCircle = features.some(f => f.layer?.id === "search-radius-circle");
      const popupOpen = document.querySelector(".mapboxgl-popup") !== null;

      if (popupOpen || clickedOnCircle) return;

      const { lng, lat } = e.lngLat;
      onClickSetCenter(lat, lng);
    });

    return () => {
      map.current?.remove();
      map.current = null;
    };
  }, []);

  useEffect(() => {
    if (!map.current || !center) return;

    map.current.flyTo({
      center,
      zoom: 14,
      essential: true,
    });
  }, [center]);

  useEffect(() => {
    if (!map.current) return;

    // Supprimer tous les anciens marqueurs
    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current = [];

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
              Type: ${item.Type || "Non marqué"}<br>
              <button onclick="window.dispatchEvent(new CustomEvent('search-similar', { detail: { nom: '${item.Nom}', naf: '${item.Type}' } }))" class="mt-1 text-sm text-blue-600 underline">🔍 Entreprises similaires</button>
            </div>`
          )
        )
        .addTo(map.current!);

      markersRef.current.push(marker);
    });
  }, [data]);

  useEffect(() => {
    if (!map.current || !center) return;

    const addCircleLayer = () => {
      const circleId = "search-radius-circle";

      if (map.current?.getLayer(circleId)) map.current.removeLayer(circleId);
      if (map.current?.getSource(circleId)) map.current.removeSource(circleId);

      const circle = turf.circle(center, filterRadius || 5, {
        steps: 64,
        units: "kilometers",
      });

      map.current?.addSource(circleId, {
        type: "geojson",
        data: circle,
      });

      map.current?.addLayer({
        id: circleId,
        type: "fill",
        source: circleId,
        layout: {},
        paint: {
          "fill-color": "#1D4ED8",
          "fill-opacity": 0.2,
        },
      });
    };

    if (map.current.isStyleLoaded()) {
      addCircleLayer();
    } else {
      map.current.once("style.load", addCircleLayer);
    }
  }, [center, filterRadius]);

  return <div ref={mapContainer} className="mapbox-container" />;
};

export default Map;
