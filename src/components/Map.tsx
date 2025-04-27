// Map.tsx
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
      center: center,
      zoom: 12,
    });

    map.current.on("click", (e) => {
      const features = map.current?.queryRenderedFeatures(e.point, { layers: ["search-radius-circle"] });
      if (features && features.length > 0) {
        return; // Ignore clicks on the search circle
      }

      const popupOpen = document.querySelector(".mapboxgl-popup") !== null;
      if (popupOpen) return;

      const { lng, lat } = e.lngLat;
      onClickSetCenter(lat, lng);
    });

    return () => map.current?.remove();
  }, []);

  useEffect(() => {
    if (map.current && center) {
      map.current.flyTo({
        center,
        zoom: map.current.getZoom(), // 👈 garde le zoom actuel
        essential: false,             // 👈 flyTo tout doux
      });
    }
  }, [center]);

  useEffect(() => {
    if (!map.current) return;

    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current = [];

    data.forEach((item) => {
      let color;
      switch (item.Type) {
        case "Client":
          color = "#10B981"; // vert
          break;
        case "Prospect":
          color = "#F59E0B"; // jaune
          break;
        default:
          color = "#9CA3AF"; // gris
      }

      const sanitizedNom = item.Nom.replace(/</g, "&lt;").replace(/>/g, "&gt;");

      const marker = new mapboxgl.Marker({ color })
        .setLngLat([item.Longitude, item.Latitude])
        .setPopup(
          new mapboxgl.Popup({ offset: 25 }).setHTML(
            `<div class="popup-content">
              <strong>${sanitizedNom}</strong><br>
              Type: ${item.Type || "Non marqué"}<br>
              <button onclick="window.dispatchEvent(new CustomEvent('search-similar', { detail: '${sanitizedNom}' }))" class="mt-1 text-sm text-blue-600 underline">🔍 Entreprises similaires</button>
            </div>`
          )
        )
        .on("click", () => {
          onClickSetCenter(item.Latitude, item.Longitude);
          marker.togglePopup();
        })
        .addTo(map.current!);

      markersRef.current.push(marker);
    });
  }, [data]);

  useEffect(() => {
    if (!map.current || !center) return;

    const addCircleLayer = () => {
      const circleId = "search-radius-circle";

      if (map.current!.getLayer(circleId)) map.current!.removeLayer(circleId);
      if (map.current!.getSource(circleId)) map.current!.removeSource(circleId);

      const circle = turf.circle(center, filterRadius || 5, {
        steps: 64,
        units: "kilometers",
      });

      map.current!.addSource(circleId, {
        type: "geojson",
        data: circle,
      });

      map.current!.addLayer({
        id: circleId,
        type: "fill",
        source: circleId,
        layout: {},
        paint: {
          "fill-color": "#1D4ED8",
          "fill-opacity": 0.2,
        },
      });

      // Empêche le curseur "pointer" sur le cercle
      map.current!.on('mouseenter', circleId, () => {
        map.current!.getCanvas().style.cursor = '';
      });
      map.current!.on('mouseleave', circleId, () => {
        map.current!.getCanvas().style.cursor = '';
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
