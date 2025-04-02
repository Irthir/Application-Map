import React, { useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_KEY || "";

if (!mapboxgl.accessToken) {
  console.error("La clé Mapbox n'est pas définie. Vérifiez votre fichier .env !");
}

interface MapProps {
  data: { Nom: string; Latitude: number; Longitude: number; Type: string }[];
  filterRadius: number | null;
}

const Map: React.FC<MapProps> = ({ data, filterRadius }) => {
  const mapContainer = useRef<HTMLDivElement | null>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);

  useEffect(() => {
    if (!mapContainer.current) return;

    // Initialisation de la carte
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/streets-v11",
      center: [2.35, 48.85], // Coordonnées par défaut (Paris)
      zoom: 12,
    });

    return () => map.current?.remove();
  }, []);

  useEffect(() => {
    if (!map.current) return;
  
    // Recentrer la carte si un élément est ajouté
    if (data.length > 0) {
      const latestPoint = data[data.length - 1];
      map.current.flyTo({
        center: [latestPoint.Longitude, latestPoint.Latitude],
        zoom: 14, // Zoom plus proche
        essential: true,
      });
    }
  
    // Nettoyage des anciens marqueurs
    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current = [];
  
    data.forEach((item) => {
      if (filterRadius && filterRadius > 0) {
        const distance = Math.sqrt(
          Math.pow(item.Latitude - 48.85, 2) + Math.pow(item.Longitude - 2.35, 2)
        );
        if (distance > filterRadius / 100) return;
      }
  
      // Ajouter le marqueur avec un popup contenant le nom
      const marker = new mapboxgl.Marker({
        color: item.Type === "Client" ? "green" : "blue",
      })
        .setLngLat([item.Longitude, item.Latitude])
        .setPopup(
          new mapboxgl.Popup({ offset: 25 })
            .setHTML(
              `<div class="popup-content">
                 <strong>${item.Nom}</strong><br>
                 Type: ${item.Type}
               </div>`
            )
        )        
        .addTo(map.current!);
  
      markersRef.current.push(marker);
    });
  }, [data, filterRadius]);
  

  return <div ref={mapContainer} style={{ width: "100%", height: "400px" }} />;
};

export default Map;
