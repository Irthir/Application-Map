import React, { useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";
import * as turf from "@turf/turf";
import "mapbox-gl/dist/mapbox-gl.css";

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_KEY || "";

interface MapProps {
  data: {
    Nom: string;
    Latitude: number;
    Longitude: number;
    Type: string;
    Distance?: number | string;
    CodeNAF?: string;
  }[];
  filterRadius: number;
  center: [number, number];
  onClickSetCenter: (lat: number, lng: number) => void;
}

const Map: React.FC<MapProps> = ({ data, filterRadius, center, onClickSetCenter }) => {
  const mapContainer = useRef<HTMLDivElement | null>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);

  // Initialisation de la carte
  useEffect(() => {
    if (!mapContainer.current) return;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/streets-v11",
      center,
      zoom: 12,
    });

    // Clic sur la carte pour recentrer
    map.current.on("click", (e) => {
      const features = map.current?.queryRenderedFeatures(e.point) || [];
      const clickedCircle = features.some((f) => f.layer?.id === "search-radius-circle");
      if (clickedCircle) return;
      onClickSetCenter(e.lngLat.lat, e.lngLat.lng);
    });

    return () => {
      map.current?.remove();
      map.current = null;
    };
  }, []);

  // Déplacement animé
  useEffect(() => {
    if (!map.current) return;
    map.current.flyTo({
      center,
      zoom: 14,
      essential: true,
    });
  }, [center]);

  // Marqueurs
  useEffect(() => {
    if (!map.current) return;

    // Supprimer anciens
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    data.forEach((item) => {
      let color = "#6B7280";
      if (item.Type === "Client") color = "#10B981";
      else if (item.Type === "Prospect") color = "#F59E0B";

      const popup = new mapboxgl.Popup({ offset: 25 }).setHTML(
        `<div class='p-2'>
           <strong>${item.Nom}</strong><br/>
           Type: ${item.Type}<br/>
           ${item.CodeNAF ? `NAF: ${item.CodeNAF}` : ""}
         </div>`
      );

      const marker = new mapboxgl.Marker({ color })
        .setLngLat([item.Longitude, item.Latitude])
        .setPopup(popup)
        .addTo(map.current!);
      markersRef.current.push(marker);
    });
  }, [data]);

  // Cercle de filtre
  useEffect(() => {
    if (!map.current) return;
    const id = "search-radius-circle";

    const drawCircle = () => {
      const circle = turf.circle(center, filterRadius, { steps: 64, units: "kilometers" });
      if (map.current!.getSource(id)) {
        const source = map.current!.getSource(id) as mapboxgl.GeoJSONSource;
        source.setData(circle);
      } else {
        map.current!
          .addSource(id, { type: "geojson", data: circle })
          .addLayer({
            id,
            type: "fill",
            source: id,
            paint: {
              "fill-color": "#3B82F6",
              "fill-opacity": 0.2,
            },
          });
      }
    };

    if (map.current.isStyleLoaded()) drawCircle();
    else map.current.once("style.load", drawCircle);
  }, [center, filterRadius]);

  return (
    <div className="absolute inset-0">
      <div ref={mapContainer} className="w-full h-full" />
    </div>
  );
};

export default Map;
